import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import type { AssetInput } from '../utils/testData';

/** /hardware/create and /hardware/{id}/edit share this form. */
export class AssetFormPage extends BasePage {
  // name^= covers both create ("asset_tags[1]", "serials[1]") and edit ("asset_tag", "serial").
  get assetTag(): Locator {
    return this.page.locator('input[name^="asset_tag"]').first();
  }

  get serial(): Locator {
    return this.page.locator('input[name^="serial"]').first();
  }

  get name(): Locator {
    return this.page.locator('input[name="name"]');
  }

  get notes(): Locator {
    return this.page.locator('textarea[name="notes"]');
  }

  get modelSelect(): Locator {
    return this.page.locator('select[name="model_id"]');
  }

  get statusSelect(): Locator {
    return this.page.locator('select[name="status_id"]');
  }

  get saveButton(): Locator {
    return this.page.locator('button[type="submit"]').filter({ hasText: /save/i }).first();
  }

  /** Inline validation message for a field, located via the field's form-group. */
  fieldError(fieldName: string): Locator {
    return this.page
      .locator('.form-group')
      .filter({ has: this.page.locator(`[name^="${fieldName}"]`) })
      .locator('.alert-msg, .help-block.error, .invalid-feedback')
      .first();
  }

  async gotoCreate(): Promise<void> {
    await this.open('/hardware/create');
    await expect(this.assetTag).toBeVisible();
  }

  async gotoEdit(id: number): Promise<void> {
    await this.open(`/hardware/${id}/edit`);
    await expect(this.name).toBeVisible();
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
  async fill(data: AssetInput, skip: Partial<Record<keyof AssetInput, true>> = {}): Promise<void> {
    if (!skip.assetTag) await this.assetTag.fill(data.assetTag);
    if (!skip.modelName) await this.selectModel(data.modelName);
    if (!skip.statusName) await this.selectStatus(data.statusName);
    if (!skip.name) await this.name.fill(data.name);
    if (!skip.serial) await this.serial.fill(data.serial);
    if (!skip.notes) await this.notes.fill(data.notes);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async create(data: AssetInput): Promise<void> {
    await this.gotoCreate();
    await this.fill(data);
    await this.save();
  }

  async editNameAndNotes(id: number, name: string, notes: string): Promise<void> {
    await this.gotoEdit(id);
    await this.name.fill(name);
    await this.notes.fill(notes);
    await this.save();
  }
}
