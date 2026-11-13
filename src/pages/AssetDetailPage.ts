import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AssetDetailLocators as L } from './locators';

/** /hardware/{id} — asset detail view. */
export class AssetDetailPage extends BasePage {
  get deleteButton(): Locator {
    return this.page.locator(L.deleteButton);
  }

  get confirmModal(): Locator {
    return this.page.locator(L.confirmModal);
  }

  get historyTab(): Locator {
    return this.page
      .getByRole('link', { name: L.historyName })
      .or(this.page.getByRole('tab', { name: L.historyName }));
  }

  async goto(id: number): Promise<void> {
    await this.open(`/hardware/${id}`);
    await expect(this.mainContent).toBeVisible();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.assertSessionValid();
  }

  /** Asserts each value is visible somewhere in the detail panel. */
  async expectShows(...values: string[]): Promise<void> {
    for (const v of values) {
      await expect(this.mainContent, `detail page should show "${v}"`).toContainText(v);
    }
  }

  async expectNotShows(value: string): Promise<void> {
    await expect(this.mainContent).not.toContainText(value);
  }

  async openHistory(): Promise<Locator> {
    await this.historyTab.first().click();
    const table = this.page.locator(L.historyTable).first();
    await expect(table).toBeVisible();
    return table;
  }

  /** Deletes through the confirm modal (a Bootstrap modal, not a browser dialog). */
  async delete(id: number): Promise<void> {
    await this.goto(id);
    await this.waitForBackgroundRequests();
    await this.deleteButton.first().click();
    await expect(this.confirmModal).toBeVisible();
    await this.confirmModal.locator(L.confirmOk).click();
    await this.expectSuccessAlert();
  }
}
