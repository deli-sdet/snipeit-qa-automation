import { test, expect } from '../../src/fixtures/test';
import { hasApiToken, NO_TOKEN_REASON } from '../../src/config/env';
import { expectApiSuccess } from '../../src/api/HardwareApi';
import { createAssetViaApi } from '../../src/fixtures/assetService';

/**
 * TC-10 Cross-layer consistency. Requires an API token AND a UI session on the same instance.
 * Without a token (e.g. demo blocks token creation) this is skipped with a reason and executed
 * in the `local` Docker environment instead — see docs/07-api-testing.md §5.
 */
test.describe('TC-10 API <-> UI consistency', () => {
  test.skip(!hasApiToken(), NO_TOKEN_REASON);

  test(
    'A: asset created via API is shown in the UI with the same values',
    { tag: ['@regression'] },
    async ({ hardwareApi, lookups, cleanup, listPage, detailPage }) => {
      const asset = await createAssetViaApi(hardwareApi!, lookups!);
      cleanup.track(asset);

      await listPage.goto();
      const ui = await listPage.search(asset.assetTag);
      expect(ui.rows.map((r) => r.id)).toContain(asset.id);
      await expect(listPage.rowByText(asset.assetTag)).toContainText(asset.name);

      await detailPage.goto(asset.id);
      await detailPage.expectShows(asset.assetTag, asset.name, asset.serial, lookups!.statusName);
    },
  );

  test(
    'B: edit in the UI is returned by the API',
    { tag: ['@regression'] },
    async ({ hardwareApi, testAsset, formPage }) => {
      const before = await hardwareApi!.get(testAsset.id);
      const notes = `UI edit ${Date.now()}`;

      await formPage.editNameAndNotes(testAsset.id, testAsset.name, notes);
      await formPage.expectSuccessAlert();

      await expect
        .poll(async () => (await hardwareApi!.get(testAsset.id)).body.notes, { message: 'API sees UI edit' })
        .toBe(notes);
      const after = await hardwareApi!.get(testAsset.id);
      expect(after.body.updated_at!.datetime >= before.body.updated_at!.datetime).toBe(true);
    },
  );

  test(
    'C: PATCH via API is shown in the UI after reload (no stale cache)',
    { tag: ['@regression'] },
    async ({ hardwareApi, testAsset, detailPage }) => {
      await detailPage.goto(testAsset.id);
      await detailPage.expectShows(testAsset.name);

      const patchedName = `${testAsset.name}-API`;
      expectApiSuccess(await hardwareApi!.update(testAsset.id, { name: patchedName }), 'patch name');

      await detailPage.reload();
      await detailPage.expectShows(patchedName);
      expect((await hardwareApi!.get(testAsset.id)).body.name).toBe(patchedName);
    },
  );
});
