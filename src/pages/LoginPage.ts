import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  get username(): Locator {
    return this.page.locator('#username, input[name="username"]').first();
  }

  get password(): Locator {
    return this.page.locator('#password, input[name="password"]').first();
  }

  get submit(): Locator {
    return this.page.getByRole('button', { name: /log ?in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.username).toBeVisible();
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectLoggedIn(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/);
    await expect(this.page.locator('header.main-header, .main-header')).toBeVisible();
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.username).toBeVisible();
  }
}
