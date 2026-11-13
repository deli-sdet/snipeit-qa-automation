# Summary

## Completed

- **Part 1**: test strategy (scope, ranked risks, manual vs. automated, data, regression tiers, flakiness policy), 10 test cases with traceability, 7 open questions.
- **Part 2**: Playwright + TypeScript framework with page objects, Select2/table helpers, typed env config, session reuse via `storageState`, logged-out contexts, auto-cleaning data fixtures, run-scoped sweeper, retries/trace/rerun-failed, quarantine tag, ESLint (incl. no fixed waits) + Prettier, GitLab CI. UI specs for login, create + locate, update after reload, two negative validations, checkout/checkin, unauthenticated access, plus an E2E lifecycle test.
- **Part 3**: endpoints taken from the API reference; code-based API suite (read, schema, auth negatives, create, update, duplicate/missing-field validation, boundary, checkout/checkin); Postman collection + environment; API↔UI integration tests; data-isolation approach; local Docker environment for blocked cases.
- **Part 4**: SQL for duplicates (exact and case/space-insensitive), counts by status, last-7-days updates; UI→network→API→DB trace procedure with assumptions.
- **Part 5**: one **confirmed defect, DEF-01**: typed dates are replaced by today's date when the field gets focus. It was found on the live demo, and TC-11 (`tests/ui/asset-date-entry.spec.ts`) catches it. Also two clearly labelled **unverified hypotheses** with verifying tests, an investigation plan for "API success, UI stale", and a defect template.
- **Part 6**: release, time-pressure and flaky-automation answers.

## Not completed / limitations

- **Live run done (UI/E2E):** the suite was run against demo.snipeitapp.com (v8.8.4-pre). Locators were confirmed and fixed there, and smoke and regression pass, except TC-11, which fails by design on DEF-01. HTML report, JUnit and traces are produced by `npm test`. Copy them into `evidence/` when submitting.
- **API token on demo** not yet confirmed. Without it, API write/read and integration tests skip with a reason. Auth-negative API tests and all UI tests still run.
- **No confirmed defects** — hypotheses only, by design of the assessment rules.
- Non-admin permission test (TC-09 part 3) needs a controlled environment.

## Assumptions

Demo login `admin`/`password`; model "Macbook Pro 13" and status "Ready to Deploy" exist (configurable); asset `name` max 255; demo resets periodically; `updated_at` in UTC.

## Top risks

1. Edits/assignments reported as saved but not persisted or shown stale (R1, Part 6 scenario).
2. Validation errors returned with HTTP 200 and misread by integrations (R2/H-1).
3. Checkout state inconsistency (status/assignee/history) (R3).
4. Shared public demo makes results noisy (other users, resets) — mitigated by isolation, but a private environment is needed for reliable CI.

## Next steps

1. Run `npm run test:smoke` against the demo, fix any locator drift, and save the report under `evidence/`.
2. Confirm the token situation; if blocked, run the API/integration suites on the Docker environment and attach those results.
3. Turn confirmed findings into defect reports; get answers to the open questions (especially Q1 and Q3).
4. Add a non-admin role fixture, visual checks for the asset list, and a nightly schedule in GitLab.
