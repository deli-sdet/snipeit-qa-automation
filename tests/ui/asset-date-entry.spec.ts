import { test, expect } from '../../src/fixtures/test';
import { buildAsset } from '../../src/utils/testData';

/**
 * TC-11 — DEF-01: focusing an empty date field auto-fills today's date, and the input's
 * maxlength=10 then silently drops every character the user types. The asset is saved with
 * today's purchase date (and an EOL date derived from it) instead of the date that was entered.
 * Expected to FAIL until DEF-01 is fixed — see docs/09-defects-and-investigation.md.
 */
test.describe('Asset form date entry', () => {
  test(
    'TC-11 purchase date typed with the keyboard is kept and saved',
    {
      tag: ['@regression', '@bug'],
      annotation: { type: 'defect', description: 'DEF-01 typed dates replaced by today on focus' },
    },
    async ({ page, formPage, listPage, cleanup }) => {
      const data = buildAsset();
      const purchaseDate = '2024-06-15'; // valid ISO date, clearly not "today"

      await formPage.gotoCreate();
      await formPage.fillForm(data);
      await formPage.expandOrderInfo();

      await test.step('type the purchase date like a keyboard user', async () => {
        await expect(formPage.purchaseDate, 'field starts empty').toHaveValue('');
        await formPage.purchaseDate.focus(); // = tabbing into the field
        await page.keyboard.type(purchaseDate);
        await page.keyboard.press('Escape'); // close the datepicker without picking a day
        // Soft: keep going so the report also shows the wrong value being persisted.
        await expect.soft(formPage.purchaseDate, 'field shows what was typed').toHaveValue(purchaseDate);
      });

      await test.step('save and verify the persisted purchase date', async () => {
        await formPage.save();
        await formPage.expectSuccessAlert();
        const id = await listPage.findIdByTag(data.assetTag);
        cleanup.track({ id, assetTag: data.assetTag });

        await formPage.gotoEdit(id);
        await formPage.expandOrderInfo();
        await expect(formPage.purchaseDate, 'saved purchase date').toHaveValue(purchaseDate);
      });
    },
  );
});
