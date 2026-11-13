# Test Data, Environment Variables & Queries

## 1. Environment variables

Copy `.env.example` → `.env`. In GitLab, set the same names as CI/CD variables (mask secrets).

| Variable | Required | Default | Description |
|---|---|---|---|
| `TEST_ENV` | no | `demo` | `demo` \| `local` \| `staging` — selects defaults |
| `BASE_URL` | yes | `https://demo.snipeitapp.com` | UI base URL |
| `API_BASE_URL` | no | `${BASE_URL}/api/v1` | REST API base |
| `SNIPEIT_USERNAME` | yes | `admin` | UI login user |
| `SNIPEIT_PASSWORD` | yes (secret) | — | UI login password (`password` on the demo) |
| `SNIPEIT_API_TOKEN` | no (secret) | — | Personal access token for API/integration tests; if empty, those tests skip with reason |
| `LIMITED_USERNAME` / `LIMITED_PASSWORD` | no (secret) | — | Non-admin user for permission tests (controlled env only) |
| `TEST_PREFIX` | no | `QA-TA` | Prefix for all generated data |
| `RUN_ID` | no | `CI_PIPELINE_ID` or local timestamp | Makes data unique per run; used by cleanup sweeper |
| `DEFAULT_MODEL_NAME` | no | `Macbook Pro 13"` | Asset model looked up by name (verify on demo) |
| `DEFAULT_STATUS_NAME` | no | `Ready to Deploy` | Deployable status label |
| `CHECKOUT_USER_NAME` | no | first active non-admin user | User to check out to |
| `DEFAULT_LOCATION_NAME` | no | — | Optional default location |
| `CLEANUP` | no | `true` | Delete created data after tests |
| `WORKERS` | no | `2` | Parallel workers (keep low on public demo) |
| `RETRIES` | no | `0` local / `2` CI | Override retry count |
| `HEADLESS` | no | `true` | Show browser when `false` |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | no | — | Only for a controlled env with DB access (Part 4). Not used on demo. |

## 2. Test data

### Generated (dynamic) — `src/utils/testData.ts`

| Field | Pattern | Example |
|---|---|---|
| Asset tag | `${TEST_PREFIX}-${yyyyMMddHHmmss}-${rand4}` | `QA-TA-20261112210700-4821` |
| Name | `${TEST_PREFIX} Laptop ${ts}` | `QA-TA Laptop 20261112210700` |
| Serial | `SN-${ts}-${rand4}` | `SN-20261112210700-4821` |
| Notes | `Created by automation run ${RUN_ID}` | |
| Edited name | `${name}-EDITED` | |

### Looked up at runtime (never hard-coded IDs)

| Data | How |
|---|---|
| `model_id` | `GET /api/v1/models?search=${DEFAULT_MODEL_NAME}` (or Select2 search in UI) |
| `status_id` | `GET /api/v1/statuslabels` → name = `${DEFAULT_STATUS_NAME}`, type deployable |
| `assigned_user` | `GET /api/v1/users?search=${CHECKOUT_USER_NAME}` |
| `rtd_location_id` | `GET /api/v1/locations?search=${DEFAULT_LOCATION_NAME}` |

### Static — `test-data/`

- `boundary-values.json` — 255/256-char names, Unicode, HTML/script strings, whitespace.
- `invalid-assets.json` — payloads missing required fields, wrong types, non-existent IDs.

## 3. API requests used by the workflow

All with headers `Authorization: Bearer <token>`, `Accept: application/json`, `Content-Type: application/json`.

| Purpose | Method & path | Notes |
|---|---|---|
| List / search | `GET /hardware?search=<TAG>&limit=50&offset=0` | Body: `{ total, rows[] }` |
| Get by id | `GET /hardware/{id}` | |
| Get by tag | `GET /hardware/bytag/{asset_tag}` | |
| Create | `POST /hardware` | `{ asset_tag, model_id, status_id, name, serial, notes }` → `{ status, messages, payload: { id, … } }` |
| Update | `PATCH /hardware/{id}` | `{ name, notes }` |
| Checkout | `POST /hardware/{id}/checkout` | `{ checkout_to_type: "user", assigned_user, note }` |
| Checkin | `POST /hardware/{id}/checkin` | `{ note }` |
| Delete | `DELETE /hardware/{id}` | Soft delete |
| Lookups | `GET /models`, `/statuslabels`, `/users`, `/locations` | with `search=` |

Assertion rule: check **body `status`** as well as HTTP status (validation errors can come back as HTTP 200).

Details and full collection follow in Part 3.

## 4. SQL verification queries (controlled env only)

The demo gives no DB access. In a local/staging env these queries back the cross-layer checks. Files live in [`/sql`](../sql). Part 4 adds the assessment-specific queries (duplicates, counts by status, last 7 days) on the hypothetical `assets` table.

See [`sql/00-workflow-verification.sql`](../sql/00-workflow-verification.sql).
