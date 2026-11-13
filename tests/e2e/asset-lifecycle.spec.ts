import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';
import { buildAsset } from '../../src/utils/testData';

/**
 * Full workflow in one test with a REAL login (e2e project has no stored session):
 * sign in -> list -> create -> locate -> update -> reload -> checkout -> checkin -> delete -> verify gone.
 */
test(
  'E2E hardware asset lifecycle',
  { tag: ['@smoke', '@e2e'] },
  async ({ loginPage, listPage, formPage, detailPage, checkoutPage, checkinPage, cleanup }) => {
    const data = buildAsset();
    let id = 0;

    await test.step('sign in', async () => {
      await loginPage.goto();
      await loginPage.login(env.username, env.password);
      await loginPage.expectLoggedIn();
    });

    await test.step('create asset', async () => {
      await formPage.create(data);
      await formPage.expectSuccessAlert();
    });

    await test.step('locate in list', async () => {
      await listPage.goto();
      id = await listPage.findIdByTag(data.assetTag);
      cleanup.track({ id, assetTag: data.assetTag }); // safety net if a later step fails
      await expect(listPage.rowByText(data.assetTag)).toContainText(data.name);
    });

    const editedNotes = `E2E edit ${env.runId}`;
    await test.step('update notes and verify after reload', async () => {
      await formPage.editNameAndNotes(id, data.name, editedNotes);
      await formPage.expectSuccessAlert();
      await detailPage.goto(id);
      await detailPage.reload();
      await detailPage.expectShows(editedNotes);
    });

    await test.step('checkout and checkin', async () => {
      await checkoutPage.checkoutToUser(id, env.checkoutUserName, 'E2E checkout');
      await checkinPage.checkin(id, 'E2E checkin');
    });

    await test.step('delete and verify it is gone from the list', async () => {
      await detailPage.delete(id);
      cleanup.untrack(id);
      await listPage.goto();
      const after = await listPage.search(data.assetTag);
      expect(after.rows.filter((r) => r.asset_tag === data.assetTag)).toHaveLength(0);
    });
  },
);
