-- =====================================================================
-- Workflow verification queries (controlled environment only)
-- Target: Snipe-IT MySQL/MariaDB schema (tables: assets, status_labels,
-- models, users, action_logs). Column names follow the Snipe-IT schema
-- and must be confirmed against the deployed version before use.
-- The public demo provides NO database access; these are not run there.
-- Parameters use :named placeholders (bind from the test runner).
-- =====================================================================

-- Q1. Asset created by the UI/API exists exactly once with expected values (TC-02, TC-10)
SELECT a.id, a.asset_tag, a.name, a.serial, a.notes,
       m.name  AS model_name,
       sl.name AS status_name,
       a.created_at, a.updated_at, a.deleted_at
FROM assets a
JOIN models m         ON m.id  = a.model_id
JOIN status_labels sl ON sl.id = a.status_id
WHERE a.asset_tag = :asset_tag;

-- Q2. No asset was created by a failed validation attempt (TC-05, TC-06)
SELECT COUNT(*) AS cnt
FROM assets
WHERE asset_tag = :asset_tag
  AND deleted_at IS NULL;            -- expect 0 (TC-05) or 1 (TC-06)

-- Q3. Update persisted and timestamp advanced (TC-04, TC-10)
SELECT id, name, notes, updated_at
FROM assets
WHERE id = :asset_id
  AND name = :expected_name
  AND updated_at > :before_update_utc;  -- expect 1 row

-- Q4. Checkout state is consistent (TC-08)
SELECT a.id, a.assigned_to, a.assigned_type, sl.name AS status_name,
       sl.deployable
FROM assets a
JOIN status_labels sl ON sl.id = a.status_id
WHERE a.id = :asset_id;
-- after checkout: assigned_to = :user_id, assigned_type = 'App\\Models\\User'
-- after checkin : assigned_to IS NULL

-- Q5. Audit trail for the asset in chronological order (TC-02/04/08)
SELECT action_type, target_type, target_id, note, created_at
FROM action_logs
WHERE item_type = 'App\\Models\\Asset'
  AND item_id   = :asset_id
ORDER BY created_at;
-- expect: create -> update -> checkout -> checkin from

-- Q6. Leftover test data from a run (cleanup sweeper check)
SELECT id, asset_tag, created_at
FROM assets
WHERE asset_tag LIKE CONCAT(:test_prefix, '-%')
  AND deleted_at IS NULL
ORDER BY created_at DESC;
