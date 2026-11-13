import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CommonLocators, LoginLocators as L } from './locators';

export class LoginPage extends BasePage {
  get username(): Locator {
    return this.page.locator(L.username).first();
  }

  get password(): Locator {
    return this.page.locator(L.password).first();
  }

  get submit(): Locator {
    return this.page.getByRole('button', { name: L.submitName });
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
    await expect(this.page.locator(CommonLocators.mainHeader)).toBeVisible();
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.username).toBeVisible();
  }
}
