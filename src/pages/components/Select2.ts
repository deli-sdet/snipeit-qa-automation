import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Reusable helper for Snipe-IT's Select2 dropdowns (model, status, user, location).
 * The native <select> is hidden; Select2 renders a sibling <span class="select2 ..."> and an
 * options list attached to <body>. AJAX-backed selects load options after typing — we wait
 * for a real option (not the "Searching…"/"Loading" placeholder) instead of sleeping.
 */
export class Select2 {
  constructor(private readonly page: Page) {}

  private container(select: Locator): Locator {
    return select.locator('xpath=following-sibling::span[contains(@class,"select2")][1]');
  }

  private get openDropdown(): Locator {
    return this.page.locator('.select2-container--open');
  }

  private realOptions(): Locator {
    return this.openDropdown.locator(
      '.select2-results__option:not(.loading-results):not(.select2-results__message):not([aria-disabled="true"])',
    );
  }

  private async open(select: Locator): Promise<void> {
    await this.container(select).locator('.select2-selection').click();
    await expect(this.openDropdown.locator('.select2-results')).toBeVisible();
  }

  private async typeSearch(text: string): Promise<void> {
    const search = this.openDropdown.locator('.select2-search__field');
    // Non-AJAX selects with few options may hide the search box; that's fine.
    if ((await search.count()) > 0 && (await search.isVisible())) {
      await search.fill(text);
    }
  }

  /** Selects the first option whose text contains `text`. Returns the chosen option's text. */
  async select(select: Locator, text: string): Promise<string> {
    await this.open(select);
    await this.typeSearch(text);
    const option = this.realOptions().filter({ hasText: text }).first();
    await expect(option, `Select2 option containing "${text}"`).toBeVisible();
    const chosen = (await option.innerText()).trim();
    await option.click();
    await expect(this.container(select)).toContainText(text);
    return chosen;
  }

  /** Selects the first real option (used when no default name is configured). */
  async selectFirst(select: Locator, searchText = ''): Promise<string> {
    await this.open(select);
    if (searchText) await this.typeSearch(searchText);
    const option = this.realOptions().first();
    await expect(option, 'first Select2 option').toBeVisible();
    const chosen = (await option.innerText()).trim();
    await option.click();
    return chosen;
  }

  /** Clears a selection (Select2 "×" button), if present. */
  async clear(select: Locator): Promise<void> {
    const clearBtn = this.container(select).locator('.select2-selection__clear');
    if ((await clearBtn.count()) > 0) await clearBtn.first().click();
  }

  async selectedText(select: Locator): Promise<string> {
    return (await this.container(select).locator('.select2-selection__rendered').innerText()).trim();
  }
}
