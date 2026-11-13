import { expect, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';
import type { HardwareListResponse } from '../api/types';

/**
 * /hardware — bootstrap-table listing. Rows are loaded by AJAX from /api/v1/hardware using the
 * browser session, so we wait on that response (and can read its JSON) instead of sleeping.
 */
export class HardwareListPage extends BasePage {
  get table(): Locator {
    return this.page.locator('#assetsListingTable, table[data-url*="hardware"]').first();
  }

  get searchInput(): Locator {
    return this.page.locator('.bootstrap-table .search input, input.search-input').first();
  }

  get rows(): Locator {
    return this.table.locator('tbody tr').filter({ hasNot: this.page.locator('td.no-records-found') });
  }

  rowByText(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  private isHardwareListResponse(r: Response, search?: string): boolean {
    const url = new URL(r.url());
    if (!/\/api\/v1\/hardware\/?$/.test(url.pathname) || r.request().method() !== 'GET') return false;
    return search === undefined ? true : url.searchParams.get('search') === search;
  }

  /** Opens the list and waits for the first AJAX page to load. */
  async goto(): Promise<HardwareListResponse> {
    const resp = this.page.waitForResponse((r) => this.isHardwareListResponse(r));
    await this.open('/hardware');
    const json = (await (await resp).json()) as HardwareListResponse;
    await expect(this.table).toBeVisible();
    return json;
  }

  /**
   * Types into the table search and waits for the filtered response.
   * Returns the JSON the UI itself received (used to get the asset id and as a data oracle).
   */
  async search(term: string): Promise<HardwareListResponse> {
    const resp = this.page.waitForResponse((r) => this.isHardwareListResponse(r, term) && r.ok());
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    const json = (await (await resp).json()) as HardwareListResponse;
    if (json.total === 0) {
      await expect(this.table.locator('td.no-records-found, tr.no-records-found')).toBeVisible();
    } else {
      await expect(this.rows.first()).toBeVisible();
    }
    return json;
  }

  /** Finds an asset by tag and returns its id (from the list API response). */
  async findIdByTag(tag: string): Promise<number> {
    const json = await this.search(tag);
    const row = json.rows.find((r) => r.asset_tag === tag);
    if (!row) throw new Error(`Asset with tag ${tag} not found in list (total=${json.total})`);
    return row.id;
  }

  async openByTag(tag: string): Promise<void> {
    await this.rowByText(tag).getByRole('link', { name: tag, exact: true }).first().click();
    await expect(this.page).toHaveURL(/\/hardware\/\d+/);
  }
}
