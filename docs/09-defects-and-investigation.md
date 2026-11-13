# Part 5 — Defect Reporting and Investigation

## Status of observed defects

**One defect confirmed on the live demo (DEF-01, below).** H-1 and H-2 remain **test hypotheses, clearly labelled UNVERIFIED**, each tied to an automated test that will confirm or reject it (they need an API token).

---

### DEF-01 (CONFIRMED) — Typed dates are replaced by today's date when the field gets focus

| Field                   | Value                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment             | https://demo.snipeitapp.com, Snipe-IT **v8.8.4-pre build 26409 (master)**, Chromium (Playwright 1.63.0, Chrome for Testing 153), macOS; 2026-11-13 UTC                                                                                                                                                      |
| Preconditions           | Logged in as admin; `/hardware/create`                                                                                                                                                                                                                                                                      |
| Steps to reproduce      | 1. Fill the required fields. 2. Expand **Order Related Information**. 3. Tab into the empty **Purchase Date** field. 4. Type `2024-06-15`. 5. Save. 6. Open the asset edit page.                                                                                                                            |
| Expected result         | The field shows `2024-06-15` and the asset is saved with Purchase Date `2024-06-15`.                                                                                                                                                                                                                        |
| Actual result           | On focus the datepicker writes today's date (`2026-11-12`) into the field. The input has `maxlength="10"`, so every typed character is dropped; there is no error or warning. The asset is saved with today's purchase date and an EOL date computed from it (`2029-11-12`).                                |
| Scope                   | Same on create for **Purchase Date**, **EOL Date** and **Next Audit Date**. **Expected Checkin** (no `maxlength`) becomes `2026-11-12 22:58:542024-06-15`, with the typed text appended to an auto-filled timestamp.                                                                                        |
| Severity / Priority     | Medium / P2. Silent wrong data: purchase date drives depreciation, warranty and EOL; keyboard-only and bulk data-entry users cannot enter a date without first clearing the field. Workaround: select all and retype, or pick the day in the calendar.                                                      |
| Evidence                | `tests/ui/asset-date-entry.spec.ts` (TC-11) — the field assertion and the persisted-value assertion both fail with `Received: "2026-11-12"`; screenshot, video, error-context in `test-results/`. Captured form POST showed `purchase_date=2026-11-12`, so the value is wrong before it reaches the server. |
| Reproducibility         | 5/5 (every date field, every run)                                                                                                                                                                                                                                                                           |
| Notes / suspected cause | Datepicker initialised to set today's date on `show`/focus when the input is empty (e.g. bootstrap-datepicker `defaultViewDate`/`todayHighlight` + a `show` handler writing the value), combined with `maxlength=10`. Server-side the value is accepted as sent (no bug in validation).                     |

---

### H-1 (UNVERIFIED hypothesis) — API reports validation failures with HTTP 200

| Field                      | Value                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                       | Test hypothesis (API contract) — **not an observed defect**                                                                                 |
| Basis                      | The published API reference for `POST /hardware` lists a "200" validation-error response example                                            |
| Environment                | demo.snipeitapp.com, API v1, Chromium-independent                                                                                           |
| Preconditions              | Valid API token; an existing asset with tag `T`                                                                                             |
| Steps                      | 1. `POST /api/v1/hardware` with `{"asset_tag":"T","model_id":<valid>,"status_id":<valid>}` (duplicate tag). 2. Record HTTP status and body. |
| Expected (REST convention) | `422 Unprocessable Entity` with field errors                                                                                                |
| Hypothesised actual        | `200 OK` with `{"status":"error","messages":{"asset_tag":[...]}}`                                                                           |
| Severity if confirmed      | Medium — integrations that check only HTTP codes record failed creates/updates as success (silent data loss)                                |
| Verification               | `tests/api/hardware-write.spec.ts` › TC-06 records the observed status as a `contract` annotation; Postman "Create duplicate tag" request   |
| Note                       | May be **by design** — raised as open question Q1 rather than logged as a bug until Product confirms the intended contract                  |

### H-2 (UNVERIFIED hypothesis) — Asset name length limit is not enforced consistently between UI and API

| Field                  | Value                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Type                   | Test hypothesis (boundary) — **not an observed defect**                                                                               |
| Basis                  | Model rule assumed `max:255`; UI input may have no `maxlength`, API may truncate or return a DB error instead of a validation message |
| Preconditions          | Admin session / token                                                                                                                 |
| Steps                  | 1. Create asset with a 256-character name via API. 2. Same via UI form. 3. Repeat with 255 characters.                                |
| Expected               | 255 accepted and displayed in full; 256 rejected with a clear `name` validation error in both layers, nothing saved                   |
| Possible failure modes | Saved but silently truncated; 500 error page; UI and API behave differently                                                           |
| Severity if confirmed  | Low–Medium (data truncation) / High if a 500 exposes SQL details                                                                      |
| Verification           | `tests/api/hardware-write.spec.ts` › TC-07 (255/256, Unicode, HTML)                                                                   |

---

## Investigation: "API update returns success, but the UI still shows the old value"

### 1. Reproduce and pin down the symptom

- Capture the exact request (method, URL, body, headers, token user), response status **and body**, and time (UTC).
- Is it `status:"success"` in the body, or only HTTP 200 (see H-1 — a 200 can carry `status:"error"`)?
- Which UI view is stale: detail page, list, both? After a **hard reload**? In a private window / another browser / another user?
- Reproducibility: every time, intermittently (rate?), only for some fields/assets/users?

### 2. Narrow down the layer (outside → in)

| Check                     | How                                                                                                                      | What it tells you                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Response payload          | Does the success payload contain the new value?                                                                          | Server accepted the field vs. silently ignored it (e.g. not fillable, wrong field name, custom field needs `_snipeit_*` db column) |
| Read-back via API         | `GET /api/v1/hardware/{id}` immediately and after a few seconds                                                          | New value → API/DB fine, issue is UI. Old value → write never persisted or was overwritten                                         |
| Same instance?            | Compare `API_BASE_URL` and UI host, token's user/company                                                                 | Writing to staging and reading prod is a common "bug"                                                                              |
| Database                  | `SELECT name, updated_at FROM assets WHERE id=:id`; `action_logs` for the item                                           | Persisted or not; a later update by someone else/automation overwriting it                                                         |
| Caching                   | Response headers (`Cache-Control`, `ETag`, `Age`), CDN/proxy, browser cache, server-side cache                           | Stale HTML or stale `/api/v1/hardware` XHR (UI list loads from the API)                                                            |
| Front-end                 | DevTools Network on the UI page: which request feeds the view, its response, and whether the UI re-requests after reload | API returns new but UI renders old → client-side cache/state bug                                                                   |
| Concurrency               | Other writers (other testers on the shared demo, imports, scheduled jobs, demo reset)                                    | Change made, then reverted/overwritten                                                                                             |
| Multi-tenancy/permissions | Full company support, field-level permissions                                                                            | User sees a scoped/filtered record                                                                                                 |
| Replication               | Read replica lag between write and read DB                                                                               | Old value briefly, then correct                                                                                                    |

### 3. Evidence to collect

- HAR / Playwright trace of the UI view; curl/Postman request + response (headers and body) of the update and read-back.
- Server/app logs for the request (Laravel log, web server access log with timestamps), queue/job logs if any.
- DB rows before/after with `updated_at`, `action_logs` entries (who/when/what).
- Cache headers and any CDN/proxy logs; app version and config (cache driver, replica setup).
- Screenshots/video of the stale UI with timestamps; reproduction rate and environment matrix.

### 4. Conclude and report

State the failing layer with evidence, the impact (data integrity vs. display only), severity, a minimal reproduction, and add a regression check — e.g. `tests/integration/api-ui-sync.spec.ts` case C already reloads the UI after an API PATCH.

---

## Defect report template (for confirmed findings)

| Field                   |                                                                   |
| ----------------------- | ----------------------------------------------------------------- |
| ID / Title              |                                                                   |
| Environment             | URL, app version (footer), browser + version, OS, date/time (UTC) |
| Preconditions           |                                                                   |
| Steps to reproduce      | 1. …                                                              |
| Expected result         |                                                                   |
| Actual result           |                                                                   |
| Severity / Priority     |                                                                   |
| Evidence                | trace.zip, screenshot, video, HAR, API response body              |
| Reproducibility         | e.g. 5/5, or 2/10 with conditions                                 |
| Notes / suspected cause |                                                                   |
