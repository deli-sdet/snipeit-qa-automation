import { test, expect, LOGGED_OUT } from '../../src/fixtures/test';
import { env } from '../../src/config/env';
import { AssetFormLocators } from '../../src/pages';

// These tests must start with NO session: clear the shared storageState for this file.
test.use({ storageState: LOGGED_OUT });

test.describe('Authentication & access', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test(
    'TC-01 admin signs in and opens the Hardware list',
    { tag: ['@smoke'] },
    async ({ loginPage, listPage, page }) => {
      await loginPage.goto();
      await loginPage.login(env.username, env.password);
      await loginPage.expectLoggedIn();

      const firstPage = await listPage.goto();
      await expect(page).toHaveURL(/\/hardware/);
      await expect(listPage.table).toBeVisible();
      for (const column of ['Asset Tag', 'Model', 'Status']) {
        await expect(listPage.tableHeader).toContainText(column);
      }
      expect(firstPage.total).toBeGreaterThanOrEqual(0);
      await expect(listPage.errorAlert).toBeHidden();
    },
  );

  test(
    'TC-09a unauthenticated user is redirected to login from /hardware/create',
    { tag: ['@smoke'] },
    async ({ page, loginPage }) => {
      await page.goto('/hardware/create');
      await loginPage.expectOnLoginPage();
      await expect(page.locator(AssetFormLocators.modelSelect)).toHaveCount(0);
    },
  );

  test(
    'invalid password is rejected and user stays on login',
    { tag: ['@regression'] },
    async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login(env.username, `wrong-${Date.now()}`);
      await loginPage.expectOnLoginPage();
      await loginPage.expectErrorAlert();
    },
  );
});
