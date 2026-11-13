# Snipe-IT QA Automation — Shipcom QA Engineer Assessment

End-to-end test framework for the Snipe-IT **hardware asset workflow** (create → locate → update → checkout/checkin) on <https://demo.snipeitapp.com>, covering UI, API, cross-layer integration and E2E with Playwright + TypeScript and GitLab CI.

## Progress

| Part | Deliverable | Status |
|---|---|---|
| 1 | QA strategy, test cases, open questions, automation plan, data/env catalogue | ✅ Done |
| 2 | Frontend automation (POM, fixtures, cleanup, retries, ESLint, GitLab CI) | ⏳ Next |
| 3 | API suite + API↔UI integration | ⏳ |
| 4 | SQL & data-integrity design | ⏳ (verification queries drafted) |
| 5 | Defect reports / hypotheses + investigation | ⏳ |
| 6 | QA judgment answers | ⏳ |
| — | Final summary | ⏳ |

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-test-strategy.md](docs/01-test-strategy.md) | Scope, risks, manual vs automated, test data, regression priorities, flakiness policy |
| [docs/02-test-cases.md](docs/02-test-cases.md) | TC-01 … TC-10 with preconditions, steps, expected results, priority, traceability |
| [docs/03-open-questions.md](docs/03-open-questions.md) | Questions for Product/Dev before sign-off |
| [docs/04-automation-plan.md](docs/04-automation-plan.md) | What gets automated, framework architecture, sessions/cookies, cleanup, rerun, CI |
| [docs/05-test-data-and-environment.md](docs/05-test-data-and-environment.md) | Env variables, test data patterns, API requests, SQL queries |
| [sql/](sql) | SQL verification queries (controlled env only) |
| [test-data/](test-data) | Static boundary and negative inputs |

## Repository layout

```text
docs/         strategy, test cases, plans
sql/          SQL queries (Part 1 verification, Part 4 integrity)
test-data/    static JSON fixtures
src/          config, pages (POM), api clients, fixtures, utils   (Part 2+)
tests/        ui/ api/ integration/ e2e/                          (Part 2+)
evidence/     execution evidence (reports, screenshots)            (Part 2+)
```

## Prerequisites & setup (filled in Part 2)

- Node.js ≥ 20, npm
- `cp .env.example .env` and fill in values (see docs/05)
- `npm ci && npx playwright install --with-deps chromium`

## Environment

See [`.env.example`](.env.example) and [docs/05](docs/05-test-data-and-environment.md). Demo credentials are `admin` / `password` as published by Snipe-IT; secrets go in GitLab masked variables, never in the repo.

## AI usage disclosure

Claude (Anthropic) was used to help draft documentation and scaffolding. All endpoints were checked against the official Snipe-IT API reference, and test behaviour is validated by running against the demo.
