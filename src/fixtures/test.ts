import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { env, hasApiToken } from '../config/env';
import { ApiClient } from '../api/ApiClient';
import { HardwareApi } from '../api/HardwareApi';
import { LookupApi } from '../api/LookupApi';
import type { Lookups } from '../api/types';
import {
  AssetDetailPage,
  AssetFormPage,
  CheckinPage,
  CheckoutPage,
  HardwareListPage,
  LoginPage,
} from '../pages';
import type { CreatedAsset } from '../utils/testData';
import { createAssetViaApi, createAssetViaUi, deleteAsset } from './assetService';

interface CleanupRegistry {
  /** Register an asset created inside a test so it is deleted in teardown. */
  track(asset: Pick<CreatedAsset, 'id' | 'assetTag'>): void;
  /** Stop tracking (e.g. the test itself deleted the asset). */
  untrack(id: number): void;
}

interface TestFixtures {
  loginPage: LoginPage;
  listPage: HardwareListPage;
  formPage: AssetFormPage;
  detailPage: AssetDetailPage;
  checkoutPage: CheckoutPage;
  checkinPage: CheckinPage;
  /** Authenticated hardware API (undefined when no token). */
  hardwareApi: HardwareApi | undefined;
  cleanup: CleanupRegistry;
  /** A fresh asset for this test: created via API when a token exists, otherwise via UI. Auto-deleted. */
  testAsset: CreatedAsset;
}

interface WorkerFixtures {
  /** Reference IDs resolved by name once per worker (requires API token). */
  lookups: Lookups | undefined;
  /** Lazily logs in once per worker and returns that worker's own storageState file. */
  workerSession: { storageStatePath(): Promise<string> };
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  listPage: async ({ page }, use) => use(new HardwareListPage(page)),
  formPage: async ({ page }, use) => use(new AssetFormPage(page)),
  detailPage: async ({ page }, use) => use(new AssetDetailPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  checkinPage: async ({ page }, use) => use(new CheckinPage(page)),

  /*
   * One Laravel session per worker. Sharing the setup project's single session across parallel
   * workers makes them consume each other's one-shot flash messages ("Asset created/updated/deleted"),
   * so success alerts intermittently never render. Only projects that configure a storageState get
   * a per-worker session; e2e (real login) and test.use({ storageState: LOGGED_OUT }) are untouched.
   */
  storageState: async ({ storageState, workerSession }, use) => {
    await use(storageState ? await workerSession.storageStatePath() : storageState);
  },

  workerSession: [
    async ({ browser }, use, workerInfo) => {
      let pending: Promise<string> | undefined;
      const login = async (): Promise<string> => {
        const file = path.join('.auth', `admin-worker-${workerInfo.parallelIndex}.json`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const context = await browser.newContext({ baseURL: env.baseUrl });
        try {
          const loginPage = new LoginPage(await context.newPage());
          await loginPage.goto();
          await loginPage.login(env.username, env.password);
          await loginPage.expectLoggedIn();
          await context.storageState({ path: file });
        } finally {
          await context.close();
        }
        return file;
      };
      await use({ storageStatePath: () => (pending ??= login()) });
    },
    { scope: 'worker' },
  ],

  lookups: [
    async ({}, use) => {
      if (!hasApiToken()) return use(undefined);
      const api = await ApiClient.create();
      const lookups = await new LookupApi(api).resolveDefaults();
      await use(lookups);
      await api.dispose();
    },
    { scope: 'worker' },
  ],

  hardwareApi: async ({}, use) => {
    if (!hasApiToken()) return use(undefined);
    const api = await ApiClient.create();
    await use(new HardwareApi(api));
    await api.dispose();
  },

  cleanup: async ({ page, hardwareApi }, use) => {
    let tracked: Pick<CreatedAsset, 'id' | 'assetTag'>[] = [];
    await use({
      track: (a) => tracked.push(a),
      untrack: (id) => {
        tracked = tracked.filter((a) => a.id !== id);
      },
    });
    if (!env.cleanup) return;
    for (const asset of tracked.reverse()) {
      await deleteAsset(asset, { hardware: hardwareApi, page });
    }
  },

  testAsset: async ({ page, hardwareApi, lookups, cleanup }, use) => {
    const asset =
      hardwareApi && lookups ? await createAssetViaApi(hardwareApi, lookups) : await createAssetViaUi(page);
    cleanup.track(asset);
    await use(asset);
  },
});

export { expect };

/** Use in describe blocks that must run logged out (cleared cookies/storage). */
export const LOGGED_OUT = { cookies: [], origins: [] };
