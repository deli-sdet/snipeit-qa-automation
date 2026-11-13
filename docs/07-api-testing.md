# Part 3 — Backend API Testing

Source of truth: the published Snipe-IT API reference (<https://snipe-it.readme.io/reference>). Only endpoints listed there are used — none are assumed from UI buttons.

## 1. Endpoints for the asset workflow

| Step     | Method | URL                                     | Purpose                        |
| -------- | ------ | --------------------------------------- | ------------------------------ |
| Lookup   | GET    | `{API}/models?search={name}`            | Resolve `model_id` by name     |
| Lookup   | GET    | `{API}/statuslabels`                    | Resolve deployable `status_id` |
| Lookup   | GET    | `{API}/users?search={name}`             | Resolve checkout user          |
| Read     | GET    | `{API}/hardware?search=&limit=&offset=` | List / search                  |
| Read     | GET    | `{API}/hardware/{id}`                   | Detail                         |
| Read     | GET    | `{API}/hardware/bytag/{asset_tag}`      | Find by tag                    |
| Create   | POST   | `{API}/hardware`                        | Create asset                   |
| Update   | PATCH  | `{API}/hardware/{id}`                   | Partial update                 |
| Checkout | POST   | `{API}/hardware/{id}/checkout`          | Assign to user/asset/location  |
| Checkin  | POST   | `{API}/hardware/{id}/checkin`           | Return asset                   |
| Cleanup  | DELETE | `{API}/hardware/{id}`                   | Soft delete                    |

`{API}` = `API_BASE_URL` (default `https://demo.snipeitapp.com/api/v1`).

## 2. Authentication approach

```http
Authorization: Bearer <SNIPEIT_API_TOKEN>
Accept: application/json
Content-Type: application/json
```

- Token = Personal Access Token from **Account (top-right) → Manage API Keys → Create New Token**.
- Stored only in `.env` (git-ignored) / GitLab masked variable; never in code or the Postman collection (placeholder `<PASTE_PERSONAL_ACCESS_TOKEN>`).
- `Accept: application/json` matters: without it, an unauthenticated request can get an HTML redirect to `/login` instead of a JSON 401.

### Demo limitation (to confirm on first run)

If the public demo does not allow creating or using a token, the controls are **not bypassed**. Then:

- `tests/api/hardware-auth.spec.ts` (no token needed) still runs on the demo.
- Read/write/integration tests **skip with a reason** (`SNIPEIT_API_TOKEN not set …`) — they don't fail falsely.
- The same suites run unchanged against the controlled environment: `TEST_ENV=local BASE_URL=http://localhost:8000` with the Docker stack in [`docker/`](../docker/docker-compose.yml).

## 3. Test suite (code) — `tests/api/`

| #   | Test                          | Request                                                 | Sample data                                        | Expected status  | Key assertions                                                                                                                                                             |
| --- | ----------------------------- | ------------------------------------------------------- | -------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Successful read               | `GET hardware?limit=5`                                  | —                                                  | 200              | JSON content-type; `total` number; `rows.length ≤ 5`; `total ≥ rows.length`                                                                                                |
| 2   | Schema/field assertions       | `GET hardware/{id}`                                     | asset from fixture                                 | 200              | `id, asset_tag, model{id,name}, status_label{id,name}, created_at/updated_at{datetime}`; `name`/`serial` string\|null; values equal what was created; `assigned_to = null` |
| 3   | Find by tag + search          | `GET hardware/bytag/{tag}`, `GET hardware?search={tag}` | fixture tag                                        | 200              | same `id`; exactly one exact-tag match                                                                                                                                     |
| 4   | Not found                     | `GET hardware/2147000000`                               | —                                                  | 404 or 200+error | no asset fields returned                                                                                                                                                   |
| 5   | **Auth negative** — no token  | `GET hardware` (no Authorization)                       | —                                                  | **401**          | no `rows` in body; "Unauthenticated"                                                                                                                                       |
| 6   | **Auth negative** — bad token | `GET hardware` (`Bearer invalid.token.value`)           | —                                                  | **401**          | no data                                                                                                                                                                    |
| 7   | Auth negative — write         | `POST hardware` without token                           | tag `QA-TA-ANON-<ts>`                              | **401**          | nothing created                                                                                                                                                            |
| 8   | **Create**                    | `POST hardware`                                         | see sample below                                   | 200              | `status:"success"`, `payload.id`; GET returns same values                                                                                                                  |
| 9   | **Update**                    | `PATCH hardware/{id}`                                   | `{"notes":"API patch <ts>"}`                       | 200              | `status:"success"`; GET shows notes; name unchanged; `updated_at` not earlier                                                                                              |
| 10  | Duplicate tag (TC-06)         | `POST hardware` same tag                                | existing tag                                       | 200/422          | `status:"error"`, `messages.asset_tag`; exact-tag count stays 1; HTTP code recorded as annotation                                                                          |
| 11  | Missing model (TC-05)         | `POST hardware` without `model_id`                      | —                                                  | 200/422          | `status:"error"`, `messages.model_id`; count 0                                                                                                                             |
| 12  | Boundary (TC-07)              | `POST hardware` name 255 / 256 / Unicode / HTML         | `test-data/boundary-values.json`                   | 200              | 255 saved in full; 256 → `messages.name`; Unicode & HTML stored exactly                                                                                                    |
| 13  | Checkout/checkin (TC-08)      | `POST …/checkout` then `…/checkin`                      | `{"checkout_to_type":"user","assigned_user":<id>}` | 200              | `assigned_to.id = user`, then `null`                                                                                                                                       |

Sample create body:

```json
{
  "asset_tag": "QA-TA-20261112210700-1A2B3C",
  "model_id": 1,
  "status_id": 2,
  "name": "QA-TA Laptop 20261112210700-1A2B3C",
  "serial": "SN-20261112210700-1A2B3C",
  "notes": "Created by automation run 20261112210700"
}
```

(`model_id` / `status_id` are looked up by name at runtime — the values above are illustrative only.)

Sample success / validation-error bodies (shape per API reference):

```json
{ "status": "success", "messages": "Asset created successfully. :)", "payload": { "id": 1234, "asset_tag": "QA-TA-…" } }
{ "status": "error",   "messages": { "asset_tag": ["The asset tag must be unique."] }, "payload": null }
```

**Important assertion rule:** the API reference lists a _200_ response for validation errors, so every write test asserts `body.status` and `messages`, not just the HTTP code (`expectApiSuccess` / `expectApiValidationError` in `src/api/HardwareApi.ts`).

## 4. Postman collection

- `postman/SnipeIT-Hardware.postman_collection.json` + `postman/SnipeIT-demo.postman_environment.json`
- Order: lookups → list + JSON-schema check → **no-token 401** → create → get & compare → duplicate-tag negative → PATCH → verify → checkout → verify → checkin → delete.
- Bearer auth at collection level using `{{apiToken}}`; the 401 request overrides with _No Auth_.
- Run: import both files in Postman, paste the token into the environment, **Run collection**; or CLI: `npm run test:postman` (Newman, JUnit to `results/postman-junit.xml`).

## 5. API ↔ UI integration

Automated in `tests/integration/api-ui-sync.spec.ts` (TC-10), needs token + UI session on the **same** instance:

| Case | Action                     | Verification                                                                                                    |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| A    | `POST hardware`            | UI list search (and its own `/api/v1/hardware` XHR) returns the id; detail page shows tag, name, serial, status |
| B    | Edit notes in the UI form  | `GET hardware/{id}` (polled with `expect.poll`, no sleep) returns the UI value; `updated_at` not earlier        |
| C    | `PATCH hardware/{id}` name | Reload UI detail → new name shown (no stale cache)                                                              |

There is also a cheaper oracle that needs **no token**: the hardware list page loads its rows from `/api/v1/hardware` with the browser session. `HardwareListPage.search()` returns that JSON, so UI tests check UI text **and** the API data behind it (e.g. `assigned_to` after checkout).

**If blocked by demo permissions**, run in a controlled environment:

1. Start `docker/docker-compose.yml`, finish setup, create an admin and a token.
2. `TEST_ENV=local BASE_URL=http://localhost:8000 SNIPEIT_API_TOKEN=… npx playwright test --project=integration`.
3. Optionally add the DB layer: after each step run `sql/00-workflow-verification.sql` Q1/Q3/Q4/Q5 (row values, `updated_at`, assignment, `action_logs`) — see Part 4.

## 6. Test data isolation (no cross-candidate interference)

- Every record is created by the test that uses it; nothing pre-existing is modified.
- Unique tag/name: `QA-TA-<RUN_ID>-<pid><counter><rand>` — unique per run, worker and test.
- Assertions match on **exact tag / id**, never "first row" or totals of the shared table.
- Reference data (models, statuses, users) is only **read**, never changed.
- Each fixture deletes its own asset in teardown (checks in first). The global teardown sweeps only tags starting with `QA-TA-<RUN_ID>-`.
- Low parallelism on the public demo (`WORKERS=2`); full parallel runs belong in the private Docker environment.
- Demo resets are expected: setup re-authenticates every run and lookups are resolved by name.
