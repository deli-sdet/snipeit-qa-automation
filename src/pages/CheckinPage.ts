import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** /hardware/{id}/checkin */
export class CheckinPage extends BasePage {
  get note(): Locator {
    return this.page.locator('textarea[name="note"]');
  }

  get submit(): Locator {
    return this.page.locator('button[type="submit"]').filter({ hasText: /check ?in/i }).first();
  }

  async goto(id: number): Promise<void> {
    await this.open(`/hardware/${id}/checkin`);
    await expect(this.submit).toBeVisible();
  }

  async checkin(id: number, note: string): Promise<void> {
    await this.goto(id);
    await this.note.fill(note);
    await this.submit.click();
    await this.expectSuccessAlert();
  }
}
