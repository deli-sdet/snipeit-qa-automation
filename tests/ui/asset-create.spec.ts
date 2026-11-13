import { test, expect } from '../../src/fixtures/test';
import { buildAsset } from '../../src/utils/testData';

test.describe('Create & locate hardware asset', () => {
  test('TC-02/TC-03 create asset via UI, find it in the list, verify attributes', { tag: ['@smoke'] }, async ({
    formPage,
    listPage,
    detailPage,
    cleanup,
    page,
  }) => {
    const data = buildAsset();

    await test.step('create via form', async () => {
      await formPage.gotoCreate();
      await formPage.fill(data);
      await formPage.save();
      await formPage.expectSuccessAlert();
    });

    const id = await test.step('locate by tag in list (exactly one row)', async () => {
      const result = await listPage.goto().then(() => listPage.search(data.assetTag));
      const matches = result.rows.filter((r) => r.asset_tag === data.assetTag);
      expect(matches, 'exactly one asset with this tag').toHaveLength(1);
      cleanup.track({ id: matches[0].id, assetTag: data.assetTag });

      const row = listPage.rowByText(data.assetTag);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(data.name);
      await expect(row).toContainText(data.statusName);
      expect(matches[0].model?.name).toContain(data.modelName);
      return matches[0].id;
    });

    await test.step('locate by name returns same asset', async () => {
      const byName = await listPage.search(data.name);
      expect(byName.rows.map((r) => r.id)).toContain(id);
    });

    await test.step('detail page shows created attributes', async () => {
      await listPage.search(data.assetTag);
      await listPage.openByTag(data.assetTag);
      await expect(page).toHaveURL(new RegExp(`/hardware/${id}$`));
      await detailPage.expectShows(data.assetTag, data.name, data.serial, data.statusName, data.notes);
    });
  });
});
