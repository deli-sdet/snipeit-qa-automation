import { expect, type Locator, type Page } from '@playwright/test';
import { Select2 } from './components/Select2';

/**
 * Shared behaviour for every Snipe-IT page: alerts, navigation, session checks.
 * Assertions about business outcomes stay in specs; helpers here only wait/read.
 */
export abstract class BasePage {
  protected readonly select2: Select2;

  constructor(protected readonly page: Page) {
    this.select2 = new Select2(page);
  }

  get successAlert(): Locator {
    return this.page.locator('.alert-success').first();
  }

  get errorAlert(): Locator {
    return this.page.locator('.alert-danger').first();
  }

  get pageTitle(): Locator {
    return this.page.locator('.content-header h1, h1.pagetitle').first();
  }

  get mainContent(): Locator {
    return this.page.locator('section.content, .content-wrapper').first();
  }

  async open(path: string): Promise<void> {
    await this.page.goto(path);
    await this.assertSessionValid();
  }

  /** Fail with a clear message (not a 15s locator timeout) when the session was lost, e.g. demo reset. */
  async assertSessionValid(): Promise<void> {
    if (/\/login(\?|$)/.test(new URL(this.page.url()).pathname + new URL(this.page.url()).search)) {
      throw new Error(
        `Redirected to login when opening ${this.page.url()} — session expired or demo was reset. Re-run the "setup" project.`,
      );
    }
  }

  async expectSuccessAlert(text?: string | RegExp): Promise<void> {
    await expect(this.successAlert).toBeVisible();
    if (text) await expect(this.successAlert).toContainText(text);
  }

  async expectErrorAlert(text?: string | RegExp): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    if (text) await expect(this.errorAlert).toContainText(text);
  }
}
