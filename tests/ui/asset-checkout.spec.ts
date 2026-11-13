import { test, expect } from '../../src/fixtures/test';
import { env } from '../../src/config/env';
import { usernameFromOption } from '../../src/pages';

test.describe('Checkout / checkin', () => {
  test(
    'TC-08 check out asset to a user, then check it in',
    { tag: ['@regression'] },
    async ({ testAsset, checkoutPage, checkinPage, listPage, detailPage }) => {
      const chosenUser = await test.step('checkout to user', async () => {
        return checkoutPage.checkoutToUser(testAsset.id, env.checkoutUserName, `QA checkout ${env.runId}`);
      });
      const username = usernameFromOption(chosenUser);

      await test.step('asset shows as assigned', async () => {
        await listPage.goto();
        const row = (await listPage.search(testAsset.assetTag)).rows.find((r) => r.id === testAsset.id);
        expect(row?.assigned_to, 'assigned_to after checkout').not.toBeNull();
        if (username) expect(row?.assigned_to?.username).toBe(username);
        expect(row?.status_label?.status_meta).toBe('deployed');

        await detailPage.goto(testAsset.id);
        await detailPage.expectShows(row?.assigned_to?.name ?? '');
      });

      await test.step('checkin', async () => {
        await checkinPage.checkin(testAsset.id, `QA checkin ${env.runId}`);
      });

      await test.step('asset is no longer assigned', async () => {
        await listPage.goto();
        const row = (await listPage.search(testAsset.assetTag)).rows.find((r) => r.id === testAsset.id);
        expect(row?.assigned_to, 'assigned_to after checkin').toBeNull();
        expect(row?.status_label?.status_meta).not.toBe('deployed');
      });
    },
  );
});
