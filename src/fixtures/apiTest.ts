import { test as base, expect } from '@playwright/test';
import { env, hasApiToken, NO_TOKEN_REASON } from '../config/env';
import { ApiClient } from '../api/ApiClient';
import { HardwareApi } from '../api/HardwareApi';
import { LookupApi } from '../api/LookupApi';
import type { Lookups } from '../api/types';
import type { CreatedAsset } from '../utils/testData';
import { createAssetViaApi, deleteAsset } from './assetService';

/**
 * Browser-free fixtures for the `api` project (no page => no browser launched).
 * Tests that need a token call `requireToken()`; auth-negative tests use `anonApi`.
 */
interface ApiFixtures {
  hardware: HardwareApi;
  /** Client with NO Authorization header. */
  anonApi: ApiClient;
  /** Client with a deliberately invalid token. */
  badTokenApi: ApiClient;
  apiCleanup: { track(asset: Pick<CreatedAsset, 'id' | 'assetTag'>): void };
  apiAsset: CreatedAsset;
}

interface ApiWorkerFixtures {
  apiLookups: Lookups;
}

export const apiTest = base.extend<ApiFixtures, ApiWorkerFixtures>({
  apiLookups: [
    async ({}, use) => {
      if (!hasApiToken()) {
        // Never resolved by token-less tests; guard anyway.
        await use(undefined as unknown as Lookups);
        return;
      }
      const api = await ApiClient.create();
      await use(await new LookupApi(api).resolveDefaults());
      await api.dispose();
    },
    { scope: 'worker' },
  ],

  hardware: async ({}, use) => {
    const api = await ApiClient.create();
    await use(new HardwareApi(api));
    await api.dispose();
  },

  anonApi: async ({}, use) => {
    const api = await ApiClient.create(null);
    await use(api);
    await api.dispose();
  },

  badTokenApi: async ({}, use) => {
    const api = await ApiClient.create('invalid.token.value');
    await use(api);
    await api.dispose();
  },

  apiCleanup: async ({ hardware }, use) => {
    const tracked: Pick<CreatedAsset, 'id' | 'assetTag'>[] = [];
    await use({ track: (a) => tracked.push(a) });
    if (!env.cleanup) return;
    for (const a of tracked.reverse()) await deleteAsset(a, { hardware });
  },

  apiAsset: async ({ hardware, apiLookups, apiCleanup }, use) => {
    const asset = await createAssetViaApi(hardware, apiLookups);
    apiCleanup.track(asset);
    await use(asset);
  },
});

/** Call at the top of a test/describe that needs an authenticated API. */
export function requireToken(): void {
  apiTest.skip(!hasApiToken(), NO_TOKEN_REASON);
}

export { expect };
