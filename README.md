# Snipe-IT QA Automation — Shipcom QA Engineer Assessment

End-to-end test framework for the Snipe-IT **hardware asset workflow** — create → locate → update → check out / check in — on <https://demo.snipeitapp.com>. It covers UI, REST API, cross-layer integration and E2E with **Playwright + TypeScript**, plus a Postman collection, SQL design and GitLab CI.

## Deliverables map

| Part | Deliverable | Where |
|---|---|---|
| 1 | Test strategy, 10 test cases, open questions | [docs/01](docs/01-test-strategy.md), [docs/02](docs/02-test-cases.md), [docs/03](docs/03-open-questions.md) |
| 1 | Automation plan, data & env catalogue | [docs/04](docs/04-automation-plan.md), [docs/05](docs/05-test-data-and-environment.md) |
| 2 | Frontend automation | [docs/06](docs/06-frontend-automation.md), `src/pages`, `tests/ui`, `tests/e2e` |
| 3 | API suite, Postman, API↔UI integration | [docs/07](docs/07-api-testing.md), `tests/api`, `tests/integration`, `postman/` |
| 4 | SQL & data integrity | [docs/08](docs/08-data-integrity-sql.md), `sql/` |
| 5 | Defect hypotheses + investigation | [docs/09](docs/09-defects-and-investigation.md) |
| 6 | QA judgment | [docs/10](docs/10-qa-judgment.md) |
| — | Summary (done / not done / assumptions / risks / next) | [docs/11](docs/11-summary.md) |
| — | Execution evidence | [evidence/](evidence/README.md) |

## Prerequisites

- Node.js ≥ 20.11 (`.nvmrc` = 22), npm
- Internet access to demo.snipeitapp.com
- Optional: Postman or Newman; Docker (for the controlled environment)

## Setup

```bash
git clone <repo-url> && cd snipeit-qa-automation
npm install                                  # commit the generated package-lock.json
npx playwright install --with-deps chromium
cp .env.example .env                         # defaults work for the public demo
```

Optional — API token for API write/integration tests: log in to the demo → **Account → Manage API Keys → Create New Token**, then put it in `.env` as `SNIPEIT_API_TOKEN=`. If the demo doesn't allow it, those tests skip with a reason (see [docs/07 §2](docs/07-api-testing.md#demo-limitation-to-confirm-on-first-run)).

## Commands

| Command | Runs |
|---|---|
| `npm test` | everything (setup → ui, e2e, api, integration) |
| `npm run test:smoke` | `@smoke` tests only |
| `npm run test:ui` / `test:e2e` / `test:api` / `test:integration` | one project |
| `npm run test:rerun` | only tests that failed in the last run (`--last-failed`) |
| `npm run test:headed` | UI + E2E in a visible browser, 1 worker |
| `npm run test:postman` | Postman collection via Newman |
| `npm run report` | open the HTML report (traces, screenshots, videos) |
| `npm run lint` / `format` / `typecheck` / `verify` | static checks |

Cross-browser: `ALL_BROWSERS=true npx playwright test --project=ui-firefox --project=ui-webkit`.
Controlled env: `docker compose -f docker/docker-compose.yml up -d`, then `TEST_ENV=local BASE_URL=http://localhost:8000 npm test`.

## Environment configuration

All variables are in [`.env.example`](.env.example) and described in [docs/05](docs/05-test-data-and-environment.md). Key ones: `BASE_URL`, `SNIPEIT_USERNAME`/`SNIPEIT_PASSWORD` (demo: `admin`/`password`), `SNIPEIT_API_TOKEN`, `TEST_PREFIX` (`QA-TA`), `RUN_ID`, `DEFAULT_MODEL_NAME`, `DEFAULT_STATUS_NAME`, `CHECKOUT_USER_NAME`, `CLEANUP`, `WORKERS`, `RETRIES`. In GitLab, set secrets as masked CI/CD variables.

## Framework highlights

- **POM** with reusable helpers (Select2 dropdowns, table search that waits on its XHR and returns the JSON, alerts, session-lost detection).
- **Fixtures**: `testAsset` / `apiAsset` create unique data and delete it afterwards; a `cleanup` registry covers assets created inside tests; the global teardown sweeps only this run's prefix.
- **Sessions**: login once (`setup` project → `storageState`); every test gets an isolated context; logged-out tests clear cookies; E2E does a real login.
- **Flakiness**: retries in CI, trace on first retry, `--last-failed` rerun (local + manual GitLab jobs), `@quarantine` non-blocking job, flaky count in the pipeline summary, job retries only for infrastructure failures.
- **Quality gates**: ESLint (typescript-eslint + eslint-plugin-playwright, bans fixed waits and focused tests), Prettier, `tsc --noEmit`.

## Reproducing results

1. Configure `.env` as above. 2. `npm run test:smoke`, then `npm test`. 3. `npm run report`. 4. Copy the report/logs into `evidence/` and fill in `evidence/RUN-NOTES.md`.

## Status and AI disclosure

The framework, docs and queries are complete. Live execution evidence is still to be added, because the authoring environment couldn't reach the demo. Locators follow Snipe-IT's markup conventions and must be confirmed on the first run (see [docs/11](docs/11-summary.md)). Claude (Anthropic) was used to help draft the docs and code. Endpoints were checked against the official Snipe-IT API reference, and all behaviour is to be validated by running the suite.
