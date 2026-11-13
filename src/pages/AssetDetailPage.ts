import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** /hardware/{id} — asset detail view. */
export class AssetDetailPage extends BasePage {
  get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /^\s*delete\s*$/i }).or(
      this.page.getByRole('link', { name: /^\s*delete\s*$/i }),
    );
  }

  get confirmModal(): Locator {
    return this.page.locator('#dataConfirmModal');
  }

  get historyTab(): Locator {
    return this.page.getByRole('link', { name: /history/i }).or(this.page.getByRole('tab', { name: /history/i }));
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
    const table = this.page.locator('#history table, table[data-url*="history"], table[id*="history"]').first();
    await expect(table).toBeVisible();
    return table;
  }

  /** Deletes through the confirm modal (a Bootstrap modal, not a browser dialog). */
  async delete(id: number): Promise<void> {
    await this.goto(id);
    await this.deleteButton.first().click();
    await expect(this.confirmModal).toBeVisible();
    await this.confirmModal.getByRole('button', { name: /yes|delete/i }).first().click();
    await this.expectSuccessAlert();
  }
}
