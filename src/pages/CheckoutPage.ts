import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** /hardware/{id}/checkout */
export class CheckoutPage extends BasePage {
  get userRadio(): Locator {
    return this.page.locator('input[name="checkout_to_type"][value="user"]');
  }

  get userSelect(): Locator {
    return this.page.locator('select[name="assigned_user"]');
  }

  get note(): Locator {
    return this.page.locator('textarea[name="note"]');
  }

  get submit(): Locator {
    return this.page.locator('button[type="submit"]').filter({ hasText: /check ?out/i }).first();
  }

  async goto(id: number): Promise<void> {
    await this.open(`/hardware/${id}/checkout`);
    await expect(this.submit).toBeVisible();
  }

  /**
   * Checks out to a user. If userName is empty, the first user in the list is used.
   * Returns the selected option text, e.g. "Doe, Jane (jdoe)".
   */
  async checkoutToUser(id: number, userName: string, note: string): Promise<string> {
    await this.goto(id);
    if ((await this.userRadio.count()) > 0 && !(await this.userRadio.isChecked())) {
      await this.userRadio.check();
    }
    const chosen = userName
      ? await this.select2.select(this.userSelect, userName)
      : await this.select2.selectFirst(this.userSelect);
    await this.note.fill(note);
    await this.submit.click();
    await this.expectSuccessAlert();
    return chosen;
  }
}

/** Extracts the username from a Select2 user label like "Doe, Jane (jdoe)". */
export function usernameFromOption(text: string): string | undefined {
  return /\(([^()]+)\)\s*$/.exec(text)?.[1];
}
