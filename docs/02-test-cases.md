# Part 1 — Test Cases: Hardware Asset Workflow

Conventions

- `<TAG>` = generated asset tag `QA-TA-<RUN_ID>-<suffix>`; `<NAME>` = `QA-TA Laptop <RUN_ID>-<suffix>`.
- Lookups (model, status, user, location) are resolved by name at runtime — see [05](05-test-data-and-environment.md).
- **Common precondition (CP)**: demo reachable; admin session (`admin` / `password`); asset model e.g. _"Macbook Pro 13"_ exists; status label **Ready to Deploy** exists; a user to check out to exists.
- **Layer**: UI, API, X (cross-layer), E2E. **Auto**: planned automation (Part 2/3) or Manual.

## Summary

| ID    | Title                                                               | Type               | Layer           | Priority | Auto                         |
| ----- | ------------------------------------------------------------------- | ------------------ | --------------- | -------- | ---------------------------- |
| TC-01 | Admin signs in and opens the Hardware list                          | Happy path / smoke | UI              | P1       | Yes (Part 2)                 |
| TC-02 | Create a hardware asset with required + safe optional fields        | Happy path         | UI              | P1       | Yes (Part 2)                 |
| TC-03 | Locate the created asset in the list by search                      | Happy path         | UI              | P1       | Yes (Part 2)                 |
| TC-04 | Update asset name and notes; value persists after reload            | Happy path         | UI              | P1       | Yes (Part 2)                 |
| TC-05 | Create asset without required Model shows error and creates nothing | Validation         | UI              | P1       | Yes (Part 2)                 |
| TC-06 | Duplicate asset tag is rejected (UI and API)                        | Validation         | UI + API        | P1       | Yes (Part 2/3)               |
| TC-07 | Name length boundary (255 / 256) and special characters             | Boundary           | API (UI manual) | P2       | Yes (Part 3)                 |
| TC-08 | Check out asset to a user, then check it in                         | Happy path / state | UI + API        | P2       | Yes (Part 2/3, if permitted) |
| TC-09 | Unauthenticated / unauthorized access is blocked                    | Permissions        | UI + API        | P1       | Yes (Part 2/3)               |
| TC-10 | API change is reflected in UI and UI change in API                  | Cross-layer        | X               | P1       | Yes (Part 3)                 |
| TC-11 | Purchase date typed with the keyboard is kept and saved             | Input / data       | UI              | P2       | Yes — fails, DEF-01          |

---

### TC-01 — Admin signs in and opens the Hardware list

|                   |                                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@smoke`                                                                                                                                                                                                                      |
| **Preconditions** | Demo reachable; new browser context with **no cookies** (logged out).                                                                                                                                                              |
| **Steps**         | 1. Go to `/login`. 2. Enter username `admin`, password `password`. 3. Click **Login**. 4. Open **Assets → List All** (`/hardware`).                                                                                                |
| **Expected**      | Redirect to dashboard after login; user menu shows the admin user. `/hardware` shows the assets table with columns incl. Asset Tag, Name, Model, Status; table finishes loading (rows or "No matching records"). No error banners. |
| **Cleanup**       | None (read-only).                                                                                                                                                                                                                  |

### TC-02 — Create a hardware asset

|                   |                                                                                                                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@smoke`                                                                                                                                                                                                                                                                                               |
| **Preconditions** | CP; logged in. `<TAG>` not present in system.                                                                                                                                                                                                                                                               |
| **Steps**         | 1. Go to `/hardware/create`. 2. Set **Asset Tag** = `<TAG>` (overwrite auto-generated value). 3. Select **Model** = default model. 4. Select **Status** = Ready to Deploy. 5. Enter **Asset Name** = `<NAME>`, **Serial** = `SN-<ts>`, **Notes** = `Created by automation run <RUN_ID>`. 6. Click **Save**. |
| **Expected**      | Success alert ("Asset created successfully" or equivalent). Asset detail page shows tag `<TAG>`, name `<NAME>`, model, status _Ready to Deploy_, serial, notes. History tab has a _create_ entry by admin. API `GET /hardware/bytag/<TAG>` returns the same values.                                         |
| **Cleanup**       | Delete asset (UI Delete or `DELETE /api/v1/hardware/{id}`).                                                                                                                                                                                                                                                 |

### TC-03 — Locate the created asset in the list

|                   |                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@smoke`                                                                                                                                                                                        |
| **Preconditions** | Asset from TC-02 exists (created by fixture).                                                                                                                                                        |
| **Steps**         | 1. Go to `/hardware`. 2. Type `<TAG>` in the table search box. 3. Wait for the table to refresh. 4. Click the asset row/tag.                                                                         |
| **Expected**      | Exactly **one** row; its Asset Tag = `<TAG>`, Name = `<NAME>`, Model and Status match creation data. Clicking opens `/hardware/{id}` for the same asset. Searching by `<NAME>` returns the same row. |
| **Cleanup**       | Fixture deletes asset.                                                                                                                                                                               |

### TC-04 — Update asset name and notes; persists after reload

|                   |                                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@smoke`                                                                                                                                                                                                                                |
| **Preconditions** | Asset exists (fixture), we know its `id`.                                                                                                                                                                                                    |
| **Steps**         | 1. Open `/hardware/{id}/edit`. 2. Change **Name** to `<NAME>-EDITED`, **Notes** to `Updated <ts>`. 3. Save. 4. **Reload** the detail page (and revisit via list search).                                                                     |
| **Expected**      | Success alert. After reload the detail page shows new name and notes; list search shows the new name. Unchanged fields (tag, model, status, serial) unchanged. History shows an _update_ entry. API `GET /hardware/{id}` returns new values. |
| **Cleanup**       | Fixture deletes asset.                                                                                                                                                                                                                       |

### TC-05 — Create without required Model: error, nothing created

|                   |                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Priority**      | P1 · `@regression`                                                                                                                                                                                                                                                                   |
| **Preconditions** | CP; logged in; `<TAG>` unique.                                                                                                                                                                                                                                                       |
| **Steps**         | 1. Go to `/hardware/create`. 2. Set Asset Tag = `<TAG>`, Status = Ready to Deploy, leave **Model empty**. 3. Save.                                                                                                                                                                   |
| **Expected**      | Stays on the form; field-level error on Model ("The model id field is required" or equivalent) and a general error alert. Other entered values are retained. Searching `<TAG>` in `/hardware` (or `GET /hardware/bytag/<TAG>`) returns **no** asset. No unrelated record is changed. |
| **Cleanup**       | None expected; if an asset was wrongly created → log defect and delete it.                                                                                                                                                                                                           |

### TC-06 — Duplicate asset tag is rejected

|                   |                                                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@regression`                                                                                                                                                                                                                                               |
| **Preconditions** | Asset A with `<TAG>` created by fixture.                                                                                                                                                                                                                         |
| **Steps**         | **UI**: 1. Open `/hardware/create`. 2. Enter Asset Tag = `<TAG>` (same as A), valid model and status. 3. Save. **API**: `POST /api/v1/hardware` with `{asset_tag: <TAG>, model_id, status_id}`.                                                                  |
| **Expected**      | UI: form error on Asset Tag ("must be unique" or equivalent); no second asset. API: body `status: "error"`, `messages.asset_tag` present (HTTP status may be **200** — assert the body, see risk R2). `GET /hardware?search=<TAG>` total = 1. Asset A unchanged. |
| **Cleanup**       | Delete asset A; delete any duplicate if wrongly created (and raise defect).                                                                                                                                                                                      |

### TC-07 — Name length boundary and special characters

|                   |                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P2 · `@regression`                                                                                                                                                                                               |
| **Preconditions** | CP; logged in / token available.                                                                                                                                                                                 |
| **Data**          | `name` of 255 chars (`max-1`/`max` as per rule `max:255`), 256 chars, Unicode `Ünïcødé 测试 ✓`, HTML `<script>alert(1)</script>` (from `test-data/boundary-values.json`).                                        |
| **Steps**         | Create (or update) an asset with each value via UI form and/or API. Open detail page and list.                                                                                                                   |
| **Expected**      | 255 chars: saved and displayed in full. 256 chars: rejected with a length error, nothing saved. Unicode: stored and rendered exactly. HTML: rendered as **text** (escaped), no script executes, no layout break. |
| **Cleanup**       | Delete every asset created.                                                                                                                                                                                      |

### TC-08 — Check out to a user, then check in

|                   |                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P2 · `@regression` (skipped with reason if demo blocks checkout)                                                                                                                                                                                                                                                                       |
| **Preconditions** | Asset exists with deployable status (Ready to Deploy), not assigned; target user exists.                                                                                                                                                                                                                                               |
| **Steps**         | 1. Asset detail → **Checkout**. 2. Checkout to **User** = target user, add note. 3. Submit. 4. Verify. 5. **Checkin**, add note, submit. 6. Verify.                                                                                                                                                                                    |
| **Expected**      | After checkout: status shows _Deployed_, "Checked out to" = target user; asset appears in user's assets; history has _checkout_; API `assigned_to.id` = user id. After checkin: no assignee, status back to deployable; history has _checkin from_; API `assigned_to` = null. Checkout button not offered for a non-deployable status. |
| **Cleanup**       | Ensure checked in, then delete asset.                                                                                                                                                                                                                                                                                                  |

### TC-09 — Unauthenticated / unauthorized access blocked

|                   |                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Priority**      | P1 · `@smoke` (UI + API no-token) / P3 `@extended` (non-admin)                                                                                                                                                                                                           |
| **Preconditions** | Fresh browser context with cleared cookies/storage. For non-admin: a user without _Assets: Create_ permission (controlled env only).                                                                                                                                     |
| **Steps**         | 1. Open `/hardware/create` directly while logged out. 2. `GET /api/v1/hardware` with **no** `Authorization` header and with an invalid token. 3. (Controlled env) Log in as limited user and open `/hardware/create`, or `POST /api/v1/hardware` with that user's token. |
| **Expected**      | 1: redirected to `/login`, no form shown. 2: HTTP **401** with unauthenticated message, no asset data in body. 3: UI shows permission denied / redirect; API returns 403 (or `status: error` unauthorized); no asset created.                                            |
| **Cleanup**       | None (or delete limited user in controlled env).                                                                                                                                                                                                                         |

### TC-10 — Cross-layer consistency (API ↔ UI)

|                   |                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**      | P1 · `@regression`                                                                                                                                                                                                                              |
| **Preconditions** | Valid API token (`SNIPEIT_API_TOKEN`); logged-in UI session for same instance. If no token on demo → executed in `local` env, limitation documented.                                                                                            |
| **Steps**         | A. `POST /api/v1/hardware` with `<TAG>`, `<NAME>`, model, status → capture `payload.id`. Open `/hardware/{id}` in UI. B. Edit notes in the UI and save. `GET /api/v1/hardware/{id}`. C. `PATCH /api/v1/hardware/{id}` name → reload UI detail.  |
| **Expected**      | A: UI shows exactly the API values. B: API returns the UI-entered notes and a newer `updated_at`. C: UI shows the patched name after reload (no stale cache). (Hypothetical DB: `assets.updated_at` advanced, `action_logs` has _update_ rows.) |
| **Cleanup**       | `DELETE /api/v1/hardware/{id}`.                                                                                                                                                                                                                 |

### TC-11 — Purchase date typed with the keyboard is kept and saved

|                         |                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Priority**            | P2 · `@regression` `@bug` — automated in `tests/ui/asset-date-entry.spec.ts`; **currently fails (DEF-01)**                                                                                                                              |
| **Preconditions**       | Logged in as admin; default model and status exist.                                                                                                                                                                                     |
| **Data**                | Purchase Date `2024-06-15` (valid ISO date, deliberately not today).                                                                                                                                                                    |
| **Steps**               | 1. Open `/hardware/create`, fill Asset Tag, Model, Status, Name. 2. Expand **Order Related Information**. 3. Tab (focus) into the empty **Purchase Date** field and type `2024-06-15`; press Esc. 4. Save. 5. Open the asset edit form. |
| **Expected**            | Step 3: field shows `2024-06-15`. Step 5: saved Purchase Date is `2024-06-15` (EOL date derived from it).                                                                                                                               |
| **Actual (v8.8.4-pre)** | Focusing the field fills in today's date; typed characters are dropped (`maxlength=10` already reached). Asset is saved with today's date.                                                                                              |
| **Cleanup**             | Delete the created asset (fixture).                                                                                                                                                                                                     |

## Traceability

| Requirement (assessment)  | Test cases         |
| ------------------------- | ------------------ |
| Create asset              | TC-02, TC-10       |
| Locate in list            | TC-03              |
| Update editable attribute | TC-04, TC-10       |
| Checkout / checkin        | TC-08              |
| Validation                | TC-05, TC-06       |
| Boundary                  | TC-07              |
| Data entry (dates)        | TC-11              |
| Permissions               | TC-09              |
| Cross-layer               | TC-06 (API), TC-10 |
