# Part 2 — Frontend Automation

Playwright + TypeScript, Chromium (Firefox/WebKit opt-in with `ALL_BROWSERS=true`).

## What is automated

| Requirement                                                                                     | Spec                                                     | Test                                         |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| **Positive**: sign in, go to hardware, create asset, assert it appears with expected attributes | `tests/ui/auth.spec.ts`, `tests/ui/asset-create.spec.ts` | TC-01, TC-02/TC-03                           |
| **Update**: edit safe attribute, assert after reload/revisit                                    | `tests/ui/asset-update.spec.ts`                          | TC-04                                        |
| **Negative**: form error without altering unrelated records                                     | `tests/ui/asset-validation.spec.ts`                      | TC-05 (missing model), TC-06 (duplicate tag) |
| Checkout / checkin                                                                              | `tests/ui/asset-checkout.spec.ts`                        | TC-08                                        |
| Unauthenticated access                                                                          | `tests/ui/auth.spec.ts`                                  | TC-09a, invalid password                     |
| Full workflow with real login                                                                   | `tests/e2e/asset-lifecycle.spec.ts`                      | E2E                                          |

## How the requirements are met

- **Unique identifiers**: `QA-TA-<RUN_ID>-<suffix>` (`src/utils/testData.ts`); `RUN_ID` = pipeline id in CI.
- **Stable locators**: `name`/`id` attributes the app's forms depend on (`input[name="name"]`, `select[name="model_id"]`), ARIA roles for buttons/links, scoping by form-group for field errors. No positional XPath. All locators live in page objects (`src/pages/`), so a UI change is fixed in one place.
- **Meaningful assertions**: exact tag match with `toHaveLength(1)`, values checked on the detail page **after reload**, list row content, and the JSON the list page itself loaded (`assigned_to`, `status_meta`). Negative tests assert both the error **and** that no record was created / the original is unchanged.
- **Waits**: web-first `expect` and `page.waitForResponse` on the table's `/api/v1/hardware` XHR; Select2 waits for a real option to appear. **No fixed sleeps** — enforced by ESLint `playwright/no-wait-for-timeout`.
- **Setup/cleanup**: `testAsset` fixture creates via API (token) or UI (no token) and deletes in teardown, checking in first. Assets created inside a test are registered with `cleanup.track()`. A global sweeper removes leftovers for this `RUN_ID` only. Cleanup failures are logged, never mask the test result.
- **Sessions/cookies**: `setup` project logs in once and saves `storageState`; each test gets a fresh context from it. Logged-out tests use an empty `storageState` and `clearCookies()`. The e2e project performs a real login. A redirect to `/login` raises a clear "session expired / demo reset" error.
- **Flakiness**: retries 2 in CI with trace on first retry; `npm run test:rerun` (`--last-failed`); `@quarantine` tag; GitLab manual `rerun:*` jobs with `RETRIES=0`.

## Substitutions / limitations

- If the demo blocks **create** for the admin user, TC-02/04/05/06/08 cannot run there. The substitute is read-only coverage (TC-01, list search/filter and detail of an existing asset), documented in the run summary; the full suite then runs against `TEST_ENV=local`.
- If **delete** is blocked, assets cannot be cleaned up; their tags are logged by the fixture and listed in the summary (they are uniquely prefixed and harmless; the demo resets periodically).
- Locators were written from Snipe-IT's markup conventions and must be confirmed on the first live run; any adjustments are recorded in `evidence/RUN-NOTES.md`.

## Running

```bash
cp .env.example .env
npm install && npx playwright install --with-deps chromium
npm run test:ui          # UI project (runs setup first)
npm run test:e2e         # full workflow
npm run test:smoke       # @smoke across all projects
npm run test:headed      # watch it run
npm run report           # open HTML report (traces, screenshots, videos)
```
