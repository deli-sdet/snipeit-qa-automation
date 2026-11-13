import { test, expect } from '../../src/fixtures/test';

test.describe('Update hardware asset', () => {
  test('TC-04 edit name and notes; values persist after reload and revisit', { tag: ['@smoke'] }, async ({
    testAsset,
    formPage,
    detailPage,
    listPage,
    hardwareApi,
  }) => {
    const newName = `${testAsset.name}-EDITED`;
    const newNotes = `Updated ${new Date().toISOString()}`;

    await formPage.editNameAndNotes(testAsset.id, newName, newNotes);
    await formPage.expectSuccessAlert();

    await test.step('persists after reload', async () => {
      await detailPage.goto(testAsset.id);
      await detailPage.reload();
      await detailPage.expectShows(newName, newNotes);
      // Unchanged fields stay unchanged
      await detailPage.expectShows(testAsset.assetTag, testAsset.serial);
    });

    await test.step('list shows new name on revisit', async () => {
      await listPage.goto();
      const result = await listPage.search(testAsset.assetTag);
      const row = result.rows.find((r) => r.id === testAsset.id);
      expect(row?.name).toBe(newName);
      await expect(listPage.rowByText(testAsset.assetTag)).toContainText(newName);
    });

    // Cross-layer oracle when a token is available (TC-10 is the full version).
    if (hardwareApi) {
      await test.step('API returns the UI-edited values', async () => {
        const res = await hardwareApi.get(testAsset.id);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe(newName);
        expect(res.body.notes).toBe(newNotes);
      });
    }
  });
});
