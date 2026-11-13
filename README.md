# Snipe-IT QA Automation

End-to-end test framework for the Snipe-IT **hardware asset workflow** — create → locate → update → check out / check in — on <https://demo.snipeitapp.com>. It covers UI, REST API, cross-layer integration and E2E with **Playwright + TypeScript**, plus a Postman collection, SQL design and GitLab CI.

## Quick start

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env
npm run test:smoke
npm run report
```

The `.env` defaults work against the public demo, and no API token is needed for the smoke run. Expected result: **8 passed, 4 skipped**. The 4 skipped tests are API tests that need `SNIPEIT_API_TOKEN` (see [Setup](#setup)).

**Key finding:** **DEF-01** is a confirmed bug on the demo. When an empty date field on the asset form gets focus, it fills in today's date, and the date the user types is silently dropped. It's caught by **TC-11** ([tests/ui/asset-date-entry.spec.ts](tests/ui/asset-date-entry.spec.ts)) and written up in [docs/09](docs/09-defects-and-investigation.md).

## Deliverables map

| Part | Deliverable                                            | Where                                                                                                       |
| ---- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1    | Test strategy, 10 test cases, open questions           | [docs/01](docs/01-test-strategy.md), [docs/02](docs/02-test-cases.md), [docs/03](docs/03-open-questions.md) |
| 1    | Automation plan, data & env catalogue                  | [docs/04](docs/04-automation-plan.md), [docs/05](docs/05-test-data-and-environment.md)                      |
| 2    | Frontend automation                                    | [docs/06](docs/06-frontend-automation.md), `src/pages`, `tests/ui`, `tests/e2e`                             |
| 3    | API suite, Postman, API↔UI integration                 | [docs/07](docs/07-api-testing.md), `tests/api`, `tests/integration`, `postman/`                             |
| 4    | SQL & data integrity                                   | [docs/08](docs/08-data-integrity-sql.md), `sql/`                                                            |
| 5    | Confirmed defect DEF-01, hypotheses, investigation     | [docs/09](docs/09-defects-and-investigation.md), `tests/ui/asset-date-entry.spec.ts`                        |
| 6    | QA judgment                                            | [docs/10](docs/10-qa-judgment.md)                                                                           |
| —    | Summary (done / not done / assumptions / risks / next) | [docs/11](docs/11-summary.md)                                                                               |
| —    | Execution evidence                                     | [evidence/](evidence/README.md)                                                                             |

## Prerequisites

- Node.js ≥ 20.11 (`.nvmrc` = 22), npm
- Internet access to demo.snipeitapp.com
- Optional: Postman or Newman; Docker (for the controlled environment)

## Setup

```bash
git clone <repo-url>
cd snipeit-qa-automation
npm install
npx playwright install --with-deps chromium
cp .env.example .env
```

The `.env` defaults (`admin` / `password` on demo.snipeitapp.com) work as-is.

Optional — API token for API write/integration tests: log in to the demo → **Account → Manage API Keys → Create New Token**, then put it in `.env` as `SNIPEIT_API_TOKEN=`. If the demo doesn't allow it, those tests skip with a reason (see [docs/07 §2](docs/07-api-testing.md#demo-limitation-to-confirm-on-first-run)).

## Commands

| Command                                                          | Runs                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `npm test`                                                       | everything (setup → ui, e2e, api, integration)           |
| `npm run test:smoke`                                             | `@smoke` tests only (fast, blocking)                     |
| `npm run test:regression`                                        | everything except `@quarantine`                          |
| `npm run test:quarantine`                                        | `@quarantine` tests only (non-blocking)                  |
| `npm run test:ui` / `test:e2e` / `test:api` / `test:integration` | one project                                              |
| `npm run test:rerun`                                             | only tests that failed in the last run (`--last-failed`) |
| `npm run test:headed`                                            | UI + E2E in a visible browser, 1 worker                  |
| `npm run test:postman`                                           | Postman collection via Newman                            |
| `npm run report`                                                 | open the HTML report (traces, screenshots, videos)       |
| `npm run lint` / `format` / `typecheck` / `verify`               | static checks                                            |

### Expected results

| Run                       | Without API token                                                | With `SNIPEIT_API_TOKEN`                        |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `npm run test:smoke`      | 8 passed, 4 skipped (API tests)                                  | all pass                                        |
| `npm run test:regression` | all UI/E2E pass except **TC-11**, which fails by design (DEF-01) | API + integration tests run instead of skipping |

TC-11 is tagged `@bug`. It stays red until DEF-01 is fixed, which shows the suite catches the defect. The demo database resets periodically; a run during a reset fails with "Redirected to login" or HTTP 503. Re-run when the demo is back.

Cross-browser: `ALL_BROWSERS=true npx playwright test --project=ui-firefox --project=ui-webkit`.
Controlled env: `docker compose -f docker/docker-compose.yml up -d`, then `TEST_ENV=local BASE_URL=http://localhost:8000 npm test`.

## Environment configuration

All variables are in [`.env.example`](.env.example) and described in [docs/05](docs/05-test-data-and-environment.md). Key ones: `BASE_URL`, `SNIPEIT_USERNAME`/`SNIPEIT_PASSWORD` (demo: `admin`/`password`), `SNIPEIT_API_TOKEN`, `TEST_PREFIX` (`QA-TA`), `RUN_ID`, `DEFAULT_MODEL_NAME`, `DEFAULT_STATUS_NAME`, `CHECKOUT_USER_NAME`, `CLEANUP`, `WORKERS`, `RETRIES`. In GitLab, set secrets as masked CI/CD variables.

## Framework highlights

- **Locators in one place**: every selector lives in [`src/pages/locators.ts`](src/pages/locators.ts), one exported constant per page (`AssetFormLocators`, `HardwareListLocators`, …). When the markup changes, update the selector there only.
- **POM** with reusable helpers (Select2 dropdowns, table search that waits on its XHR and returns the JSON, alerts, session-lost detection).
- **Fixtures**: `testAsset` / `apiAsset` create unique data and delete it afterwards; a `cleanup` registry covers assets created inside tests; the global teardown sweeps only this run's prefix.
- **Sessions**: one login per parallel worker, so each worker has its own Laravel session. A shared session lets workers consume each other's one-time success messages. Every test gets an isolated context; logged-out tests clear cookies; E2E does a real login.
- **Flakiness**: retries in CI, trace on first retry, `--last-failed` rerun (local + manual GitLab jobs), `@quarantine` non-blocking job, flaky count in the pipeline summary, job retries only for infrastructure failures.
- **Quality gates**: ESLint (typescript-eslint + eslint-plugin-playwright, bans fixed waits and focused tests), Prettier, `tsc --noEmit`.

## Reproducing results

1. Configure `.env` as above. 2. `npm run test:smoke`, then `npm test`. 3. `npm run report`. 4. Copy the report/logs into `evidence/` and fill in `evidence/RUN-NOTES.md`.

## Status and AI disclosure

The suite has been run against the live demo (Snipe-IT v8.8.4-pre, build 26409). Locators were confirmed and fixed there, the smoke and regression suites pass, and DEF-01 was found and reproduced. API and integration tests haven't been run yet because they need an API token. H-1 and H-2 in [docs/09](docs/09-defects-and-investigation.md) remain unverified until they are. See [docs/11](docs/11-summary.md) for what is done and not done. Endpoints were checked against the official Snipe-IT API reference.
