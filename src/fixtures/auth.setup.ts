import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { LoginPage } from '../pages/LoginPage';

const AUTH_FILE = '.auth/admin.json';

/**
 * Logs in once per run and stores the session (cookies + localStorage) for the ui/integration
 * projects. Each test still gets its own isolated browser context created from this state.
 */
setup('authenticate as admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  const login = new LoginPage(page);
  await login.goto();
  await login.login(env.username, env.password);
  await login.expectLoggedIn();
  await page.context().storageState({ path: AUTH_FILE });
});
