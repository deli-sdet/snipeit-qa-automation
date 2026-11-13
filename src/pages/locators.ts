/**
 * Single source of truth for every UI selector used by the page objects.
 *
 * When Snipe-IT markup changes, update the selector HERE only — page objects and specs read
 * these constants and never hard-code selectors. Values are plain CSS selectors (strings),
 * accessible-name patterns (RegExp) for role-based lookups, or small builder functions for
 * selectors that depend on a runtime value.
 *
 * Conventions:
 *  - Prefer stable attributes (`name`, `id`) over classes/text; keep fallbacks in one CSS list
 *    ("a, b") so a single constant still covers both variants.
 *  - `name^=` is used where create and edit differ ("asset_tags[1]" vs "asset_tag").
 */

/** Shared layout pieces present on every authenticated page. */
export const CommonLocators = {
  successAlert: '.alert-success',
  errorAlert: '.alert-danger',
  pageTitle: '.content-header h1, h1.pagetitle',
  mainContent: 'section.content, .content-wrapper',
  mainHeader: 'header.main-header, .main-header',
  submitButton: 'button[type="submit"]',
} as const;

export const LoginLocators = {
  username: '#username, input[name="username"]',
  password: '#password, input[name="password"]',
  submitName: /log ?in/i,
} as const;

/** /hardware — bootstrap-table listing. */
export const HardwareListLocators = {
  table: '#assetsListingTable, table[data-url*="hardware"]',
  tableHeader: 'thead',
  searchInput: '.bootstrap-table .search input, input.search-input',
  rows: 'tbody tr',
  noRecordsCell: 'td.no-records-found',
  noRecords: 'td.no-records-found, tr.no-records-found',
} as const;

/** /hardware/create and /hardware/{id}/edit (same form). */
export const AssetFormLocators = {
  assetTag: 'input[name^="asset_tag"]',
  serial: 'input[name^="serial"]',
  name: 'input[name="name"]',
  notes: 'textarea[name="notes"]',
  modelSelect: 'select[name="model_id"]',
  statusSelect: 'select[name="status_id"]',
  purchaseDate: 'input[name="purchase_date"]',
  saveButtonText: /save/i,

  /** Collapsible fieldsets: toggle link `a#<id>`, caret icon `#<id>_icon`. */
  sections: {
    optionalInfo: 'optional_info',
    orderInfo: 'order_info',
  },
  sectionToggle: (sectionId: string) => `a#${sectionId}`,
  sectionIcon: (sectionId: string) => `#${sectionId}_icon`,
  /** Class the caret icon gets when its section is open. */
  sectionOpenIconClass: /fa-caret-down/,

  formGroup: '.form-group',
  fieldByName: (fieldName: string) => `[name^="${fieldName}"]`,
  fieldError: '.alert-msg, .help-block.error, .invalid-feedback',
} as const;

/** /hardware/{id} — asset detail view. */
export const AssetDetailLocators = {
  /** Icon-only button (trash icon, tooltip "Delete") — it has no accessible text name. */
  deleteButton: 'button.delete-asset',
  confirmModal: '#dataConfirmModal',
  confirmOk: '#dataConfirmOK',
  historyName: /history/i,
  historyTable: '#history table, table[data-url*="history"], table[id*="history"]',
} as const;

/** /hardware/{id}/checkout */
export const CheckoutLocators = {
  userRadio: 'input[name="checkout_to_type"][value="user"]',
  userSelect: 'select[name="assigned_user"]',
  note: 'textarea[name="note"]',
  submitText: /check ?out/i,
} as const;

/** /hardware/{id}/checkin */
export const CheckinLocators = {
  note: 'textarea[name="note"]',
  submitText: /check ?in/i,
} as const;

/** Select2 widget (renders next to the hidden native <select>; dropdown is attached to <body>). */
export const Select2Locators = {
  container: 'xpath=following-sibling::span[contains(@class,"select2")][1]',
  openDropdown: '.select2-container--open',
  selection: '.select2-selection',
  results: '.select2-results',
  searchField: '.select2-search__field',
  /** Real options only — excludes "Searching…"/"Loading" placeholders and disabled rows. */
  realOption:
    '.select2-results__option:not(.loading-results):not(.select2-results__message):not([aria-disabled="true"])',
  clearButton: '.select2-selection__clear',
  rendered: '.select2-selection__rendered',
} as const;
