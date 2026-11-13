import { expect, type Frame, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';
import { HardwareListLocators as L } from './locators';
import type { HardwareListResponse } from '../api/types';

/**
 * /hardware — bootstrap-table listing. Rows are loaded by AJAX from /api/v1/hardware using the
 * browser session, so we wait on that response (and can read its JSON) instead of sleeping.
 */
export class HardwareListPage extends BasePage {
  get table(): Locator {
    return this.page.locator(L.table).first();
  }

  get searchInput(): Locator {
    return this.page.locator(L.searchInput).first();
  }

  get rows(): Locator {
    return this.table.locator(L.rows).filter({ hasNot: this.page.locator(L.noRecordsCell) });
  }

  get tableHeader(): Locator {
    return this.table.locator(L.tableHeader);
  }

  rowByText(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  private isHardwareListResponse(r: Response, search?: string): boolean {
    const url = new URL(r.url());
    if (!/\/api\/v1\/hardware\/?$/.test(url.pathname) || r.request().method() !== 'GET') return false;
    // The asset detail page also calls /api/v1/hardware?assigned_to=..., so only accept responses
    // fetched by the /hardware list page itself — otherwise goto() from a detail page can grab the
    // previous page's response, whose body is discarded on navigation.
    if (url.searchParams.has('assigned_to')) return false;
    if (!/\/hardware\/?$/.test(new URL(r.frame().url()).pathname)) return false;
    return search === undefined ? true : url.searchParams.get('search') === search;
  }

  /** Opens the list and waits for the first AJAX page to load. */
  async goto(): Promise<HardwareListResponse> {
    // We may already be on /hardware (e.g. after create/delete redirects), so only accept a response
    // that arrives after this navigation commits — the old document's body is gone by then.
    let committed = false;
    const onNav = (frame: Frame): void => {
      if (frame === this.page.mainFrame()) committed = true;
    };
    this.page.on('framenavigated', onNav);
    let json: HardwareListResponse;
    try {
      const resp = this.page.waitForResponse((r) => committed && this.isHardwareListResponse(r) && r.ok());
      await this.open('/hardware');
      json = (await (await resp).json()) as HardwareListResponse;
    } finally {
      this.page.off('framenavigated', onNav);
    }
    await expect(this.table).toBeVisible();
    return json;
  }

  /**
   * Types into the table search and waits for the filtered response.
   * Returns the JSON the UI itself received (used to get the asset id and as a data oracle).
   */
  async search(term: string): Promise<HardwareListResponse> {
    // bootstrap-table remembers the last search per browser context, so /hardware can open already
    // filtered by `term`; re-entering the same value then fires no request. Clear it first.
    if ((await this.searchInput.inputValue()) !== '') {
      const cleared = this.page.waitForResponse((r) => this.isHardwareListResponse(r, '') && r.ok());
      await this.searchInput.fill('');
      await this.searchInput.press('Enter');
      await cleared;
    }
    const resp = this.page.waitForResponse((r) => this.isHardwareListResponse(r, term) && r.ok());
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    const json = (await (await resp).json()) as HardwareListResponse;
    if (json.total === 0) {
      await expect(this.table.locator(L.noRecords)).toBeVisible();
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
