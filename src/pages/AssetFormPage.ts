import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { AssetFormLocators as L, CommonLocators } from './locators';
import type { AssetInput } from '../utils/testData';

/** /hardware/create and /hardware/{id}/edit share this form. */
export class AssetFormPage extends BasePage {
  get assetTag(): Locator {
    return this.page.locator(L.assetTag).first();
  }

  get serial(): Locator {
    return this.page.locator(L.serial).first();
  }

  get name(): Locator {
    return this.page.locator(L.name);
  }

  get notes(): Locator {
    return this.page.locator(L.notes);
  }

  get modelSelect(): Locator {
    return this.page.locator(L.modelSelect);
  }

  get statusSelect(): Locator {
    return this.page.locator(L.statusSelect);
  }

  get saveButton(): Locator {
    return this.page.locator(CommonLocators.submitButton).filter({ hasText: L.saveButtonText }).first();
  }

  /**
   * Snipe-IT collapses "Optional Information" by default and remembers the toggle in a cookie
   * (re-opened on page load), so Asset Name can be in the DOM but hidden. Decide by the caret
   * state (fa-caret-right -> fa-caret-down, swapped synchronously on click) rather than visibility
   * to avoid racing the slide animation and closing it again.
   */
  async expandOptionalInfo(): Promise<void> {
    await this.expandSection(L.sections.optionalInfo, this.name);
  }

  /** Purchase Date (in the collapsed "Order Related Information" section). */
  get purchaseDate(): Locator {
    return this.page.locator(L.purchaseDate);
  }

  async expandOrderInfo(): Promise<void> {
    await this.expandSection(L.sections.orderInfo, this.purchaseDate);
  }

  /** Opens a collapsible fieldset unless it is already open (see AssetFormLocators.sections). */
  private async expandSection(id: string, revealed: Locator): Promise<void> {
    await this.page.waitForLoadState('load');
    const icon = this.page.locator(L.sectionIcon(id));
    const isOpen = L.sectionOpenIconClass.test((await icon.getAttribute('class')) ?? '');
    if (!isOpen) await this.page.locator(L.sectionToggle(id)).click();
    await expect(revealed).toBeVisible();
  }

  /** Inline validation message for a field, located via the field's form-group. */
  fieldError(fieldName: string): Locator {
    return this.page
      .locator(L.formGroup)
      .filter({ has: this.page.locator(L.fieldByName(fieldName)) })
      .locator(L.fieldError)
      .first();
  }

  async gotoCreate(): Promise<void> {
    await this.open('/hardware/create');
    await expect(this.assetTag).toBeVisible();
  }

  async gotoEdit(id: number): Promise<void> {
    await this.open(`/hardware/${id}/edit`);
    await expect(this.assetTag).toBeVisible();
    await this.expandOptionalInfo();
  }

  async selectModel(modelName: string): Promise<string> {
    return modelName
      ? this.select2.select(this.modelSelect, modelName)
      : this.select2.selectFirst(this.modelSelect);
  }

  async selectStatus(statusName: string): Promise<string> {
    return this.select2.select(this.statusSelect, statusName);
  }

  /** Fills the form. Fields set to undefined in `skip` are left untouched (for validation tests). */
  async fillForm(data: AssetInput, skip: Partial<Record<keyof AssetInput, true>> = {}): Promise<void> {
    if (!skip.assetTag) await this.assetTag.fill(data.assetTag);
    if (!skip.modelName) await this.selectModel(data.modelName);
    if (!skip.statusName) await this.selectStatus(data.statusName);
    if (!skip.name) {
      await this.expandOptionalInfo();
      await this.name.fill(data.name);
    }
    if (!skip.serial) await this.serial.fill(data.serial);
    if (!skip.notes) await this.notes.fill(data.notes);
  }

  async save(): Promise<void> {
    await this.waitForBackgroundRequests();
    await this.saveButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async create(data: AssetInput): Promise<void> {
    await this.gotoCreate();
    await this.fillForm(data);
    await this.save();
  }

  async editNameAndNotes(id: number, name: string, notes: string): Promise<void> {
    await this.gotoEdit(id);
    await this.name.fill(name);
    await this.notes.fill(notes);
    await this.save();
  }
}
