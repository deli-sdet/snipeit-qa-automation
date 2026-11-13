# Part 4 — Data Integrity and SQL

> Design exercise only. The public demo provides no database access and none was attempted.

Hypothetical table: `assets (id, asset_tag, name, status, location_id, updated_at)`.
All queries: [`sql/01-data-integrity.sql`](../sql/01-data-integrity.sql). Workflow verification against the real Snipe-IT schema (`status_labels`, `action_logs`): [`sql/00-workflow-verification.sql`](../sql/00-workflow-verification.sql).

## Queries (summary)

### Duplicate asset tags

```sql
SELECT asset_tag, COUNT(*) AS occurrences, GROUP_CONCAT(id ORDER BY id) AS asset_ids
FROM assets
WHERE asset_tag IS NOT NULL
GROUP BY asset_tag
HAVING COUNT(*) > 1
ORDER BY occurrences DESC, asset_tag;
```

Plus a detail query returning every duplicated row, and a stricter `UPPER(TRIM(asset_tag))` version that catches tags differing only by case or spaces.

### Count by status

```sql
SELECT COALESCE(status, '(no status)') AS status, COUNT(*) AS asset_count
FROM assets
GROUP BY COALESCE(status, '(no status)')
ORDER BY asset_count DESC;
```

### Updated within the last seven days

```sql
SELECT id, asset_tag, name, status, location_id, updated_at
FROM assets
WHERE updated_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY
  AND updated_at <= UTC_TIMESTAMP()
ORDER BY updated_at DESC;
```

## Assumptions

| Area          | Assumption                                   | Effect if wrong                                                                                         |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Engine        | MySQL 8 / MariaDB (Snipe-IT's supported DBs) | Swap `GROUP_CONCAT`→`STRING_AGG`, `UTC_TIMESTAMP()`→`NOW() AT TIME ZONE 'UTC'`                          |
| Time zone     | `updated_at` stored in UTC (Laravel default) | If stored in app-local time, compare with `NOW()` and convert, or results are shifted by the UTC offset |
| "Last 7 days" | Rolling 168 h                                | Calendar-day variant provided; confirm with Product (open question Q7)                                  |
| Precision     | `updated_at` has 1-second precision          | An edit and a check in the same second compare as `>=`, not `>`                                         |
| Status        | Text label; NULL possible                    | Real Snipe-IT uses `status_id` → join `status_labels`                                                   |
| Deletes       | No soft-delete column                        | In real Snipe-IT add `deleted_at IS NULL`, or duplicates may include deleted rows (open question Q3)    |
| Uniqueness    | Should be case/space-insensitive             | Stricter query shows violations a plain index misses                                                    |

## Tracing a successful UI edit: UI → network → API → DB

Goal: prove an edit in the form really reached storage and that what the UI shows comes from it (relevant to risk R1 and the Part 5 investigation).

1. **Before**: record asset `id`, current `name`/`notes`, `updated_at` (via `GET /api/v1/hardware/{id}` and `SELECT … WHERE id = :id`), and the UTC time `T0`.
2. **UI action**: edit the name in `/hardware/{id}/edit`, save. Playwright records a HAR / trace (`page.routeFromHAR`/trace viewer) or DevTools Network tab.
3. **Network**: confirm the form submission (`POST /hardware/{id}` with `_method=PUT` in Snipe-IT's web form) contains the new value, gets a `302` redirect to the detail page, and the next page load shows the success flash. Note request id/timestamp. If edited via API, check `PATCH /api/v1/hardware/{id}` → `200` with `status:"success"`.
4. **API read-back**: `GET /api/v1/hardware/{id}` returns the new value and `updated_at ≥ T0`. Compare with the value the UI shows after a **hard reload**.
5. **Database**: `SELECT id, name, updated_at FROM assets WHERE id = :id` (read-only test-DB user) shows the new value, `updated_at ≥ T0`; `action_logs` has an `update` row for the item with the changed fields in `log_meta`.
6. **Compare** the three layers. Any mismatch shows where it broke: request had the old value → UI/form bug; DB new but API old → API/cache/serialization; API new but UI old → front-end caching/rendering; nothing changed but "success" shown → swallowed error.
7. **Evidence**: trace/HAR, API responses, SQL output with timestamps, app log lines for the request id.

Timing assumptions: writes are synchronous in Snipe-IT (no queue for asset updates), so the DB should reflect the change before the redirect completes; checks use `expect.poll` with a short timeout instead of a fixed sleep in case a replica or cache adds delay.
