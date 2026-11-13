import { test, expect } from '../../src/fixtures/test';
import { buildAsset } from '../../src/utils/testData';

test.describe('Asset form validation', () => {
  test(
    'TC-05 missing Model shows a field error and creates nothing',
    { tag: ['@regression'] },
    async ({ formPage, listPage, page, cleanup }) => {
      const data = buildAsset();

      await formPage.gotoCreate();
      await formPage.fill(data, { modelName: true });
      await formPage.save();

      await expect(page).toHaveURL(/\/hardware\/create/);
      await expect(formPage.fieldError('model_id')).toBeVisible();
      // Error is scoped to the Model form-group; current Snipe-IT shows a generic "This field is required".
      await expect(formPage.fieldError('model_id')).toContainText(/required|model/i);
      // Entered values are retained
      await expect(formPage.name).toHaveValue(data.name);

      await listPage.goto();
      const result = await listPage.search(data.assetTag);
      const created = result.rows.filter((r) => r.asset_tag === data.assetTag);
      // If the product wrongly created it, still clean up — then fail.
      created.forEach((r) => cleanup.track({ id: r.id, assetTag: r.asset_tag }));
      expect(created, 'no asset must be created on validation failure').toHaveLength(0);
    },
  );

  test(
    'TC-06 duplicate asset tag is rejected in the UI',
    { tag: ['@regression'] },
    async ({ testAsset, formPage, listPage, cleanup }) => {
      const duplicate = buildAsset({ assetTag: testAsset.assetTag });

      await formPage.gotoCreate();
      await formPage.fill(duplicate);
      await formPage.save();

      await expect(formPage.fieldError('asset_tag')).toBeVisible();
      await expect(formPage.fieldError('asset_tag')).toContainText(/unique|taken|already/i);

      await listPage.goto();
      const result = await listPage.search(testAsset.assetTag);
      const sameTag = result.rows.filter((r) => r.asset_tag === testAsset.assetTag);
      sameTag
        .filter((r) => r.id !== testAsset.id)
        .forEach((r) => cleanup.track({ id: r.id, assetTag: r.asset_tag }));
      expect(sameTag, 'original asset only').toHaveLength(1);
      expect(sameTag[0].id).toBe(testAsset.id);
      expect(sameTag[0].name).toBe(testAsset.name);
    },
  );
});
