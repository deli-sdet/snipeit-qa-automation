import { expect, type Page } from '@playwright/test';
import { HardwareApi, expectApiSuccess } from '../api/HardwareApi';
import type { HardwareAsset, Lookups } from '../api/types';
import { AssetDetailPage, AssetFormPage, HardwareListPage } from '../pages';
import { buildAsset, type AssetInput, type CreatedAsset } from '../utils/testData';
import { logger } from '../utils/logger';

/** Reusable create/delete helpers shared by fixtures and specs (UI and API paths). */

export async function createAssetViaApi(
  hardware: HardwareApi,
  lookups: Lookups,
  overrides: Partial<AssetInput> = {},
): Promise<CreatedAsset> {
  const data = buildAsset({ modelName: lookups.modelName, statusName: lookups.statusName, ...overrides });
  const res = await hardware.create({
    asset_tag: data.assetTag,
    model_id: lookups.modelId,
    status_id: lookups.statusId,
    name: data.name,
    serial: data.serial,
    notes: data.notes,
  });
  const payload = expectApiSuccess<HardwareAsset>(res, 'create asset');
  expect(payload.id).toEqual(expect.any(Number));
  return { ...data, id: payload.id, createdVia: 'api' };
}

export async function createAssetViaUi(page: Page, overrides: Partial<AssetInput> = {}): Promise<CreatedAsset> {
  const data = buildAsset(overrides);
  const form = new AssetFormPage(page);
  await form.create(data);
  await form.expectSuccessAlert();
  const id = await new HardwareListPage(page).findIdByTag(data.assetTag);
  return { ...data, id, createdVia: 'ui' };
}

/** Best-effort delete: check in first (Snipe-IT won't delete checked-out assets), then delete. */
export async function deleteAsset(
  asset: Pick<CreatedAsset, 'id' | 'assetTag'>,
  opts: { hardware?: HardwareApi; page?: Page },
): Promise<void> {
  try {
    if (opts.hardware) {
      const current = await opts.hardware.get(asset.id);
      if (current.status === 200 && current.body?.assigned_to) await opts.hardware.checkin(asset.id, 'cleanup');
      const res = await opts.hardware.remove(asset.id);
      logger.debug(`API delete ${asset.assetTag}: ${res.body?.status}`);
      return;
    }
    if (opts.page && !opts.page.isClosed()) {
      await new AssetDetailPage(opts.page).delete(asset.id);
      return;
    }
    logger.warn(`No way to delete ${asset.assetTag} (id ${asset.id}) — left behind`);
  } catch (e) {
    // Cleanup must never mask the test result; leftovers are reported and swept later.
    logger.warn(`Cleanup failed for ${asset.assetTag} (id ${asset.id}): ${String(e)}`);
  }
}
