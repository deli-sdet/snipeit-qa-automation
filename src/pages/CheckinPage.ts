import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { CheckinLocators as L, CommonLocators } from './locators';

/** /hardware/{id}/checkin */
export class CheckinPage extends BasePage {
  get note(): Locator {
    return this.page.locator(L.note);
  }

  get submit(): Locator {
    return this.page.locator(CommonLocators.submitButton).filter({ hasText: L.submitText }).first();
  }

  async goto(id: number): Promise<void> {
    await this.open(`/hardware/${id}/checkin`);
    await expect(this.submit).toBeVisible();
  }

  async checkin(id: number, note: string): Promise<void> {
    await this.goto(id);
    await this.note.fill(note);
    await this.waitForBackgroundRequests();
    await this.submit.click();
    await this.expectSuccessAlert();
  }
}
