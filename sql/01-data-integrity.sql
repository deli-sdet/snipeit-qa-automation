-- =====================================================================
-- Part 4 — Data integrity queries (design exercise, NOT run against the demo)
-- Hypothetical table per the assessment:
--   assets (id, asset_tag, name, status, location_id, updated_at)
-- Assumptions (see docs/08-data-integrity-sql.md):
--   * MySQL 8 / MariaDB syntax (Snipe-IT's supported DBs); ANSI alternatives noted.
--   * `asset_tag` is VARCHAR; uniqueness is meant to be case-insensitive and trim-insensitive.
--   * `status` is a text label (e.g. 'Ready to Deploy', 'Deployed'); NULL means "not set".
--   * `updated_at` is DATETIME stored in UTC.
--   * No soft-delete column in the hypothetical table; if one exists (deleted_at), add
--     `AND deleted_at IS NULL` to every query.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 4.1  Assets with duplicate asset_tag values
-- ---------------------------------------------------------------------

-- (a) Summary: each duplicated tag and how many times it occurs
SELECT asset_tag,
       COUNT(*)                                   AS occurrences,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS asset_ids   -- ANSI/Postgres: STRING_AGG(id::text, ',')
FROM assets
WHERE asset_tag IS NOT NULL
GROUP BY asset_tag
HAVING COUNT(*) > 1
ORDER BY occurrences DESC, asset_tag;

-- (b) Detail: every row involved in a duplicate (for investigation/cleanup)
SELECT a.id, a.asset_tag, a.name, a.status, a.location_id, a.updated_at
FROM assets a
JOIN (
    SELECT asset_tag
    FROM assets
    WHERE asset_tag IS NOT NULL
    GROUP BY asset_tag
    HAVING COUNT(*) > 1
) d ON d.asset_tag = a.asset_tag
ORDER BY a.asset_tag, a.id;

-- (c) Stricter: "near" duplicates that differ only by case or surrounding spaces
--     ('QA-1', 'qa-1 ') — these defeat a plain unique index on a case-sensitive collation.
SELECT UPPER(TRIM(asset_tag))                     AS normalized_tag,
       COUNT(*)                                   AS occurrences,
       GROUP_CONCAT(CONCAT(id, ':', asset_tag) ORDER BY id SEPARATOR ' | ') AS variants
FROM assets
WHERE asset_tag IS NOT NULL
GROUP BY UPPER(TRIM(asset_tag))
HAVING COUNT(*) > 1;


-- ---------------------------------------------------------------------
-- 4.2  Count assets by status
-- ---------------------------------------------------------------------
SELECT COALESCE(status, '(no status)') AS status,
       COUNT(*)                        AS asset_count
FROM assets
GROUP BY COALESCE(status, '(no status)')
ORDER BY asset_count DESC, status;

-- With a share of total (MySQL 8+/MariaDB 10.2+ window function)
SELECT COALESCE(status, '(no status)')                         AS status,
       COUNT(*)                                                AS asset_count,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)      AS pct_of_total
FROM assets
GROUP BY COALESCE(status, '(no status)')
ORDER BY asset_count DESC;


-- ---------------------------------------------------------------------
-- 4.3  Assets updated within the last seven days
-- ---------------------------------------------------------------------
-- Rolling 7 x 24h window, compared in UTC (updated_at stored in UTC).
SELECT id, asset_tag, name, status, location_id, updated_at
FROM assets
WHERE updated_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY      -- Postgres: NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days'
  AND updated_at <= UTC_TIMESTAMP()                       -- excludes bad future-dated rows (report them separately)
ORDER BY updated_at DESC;

-- Variant: last 7 calendar days including today (from midnight UTC 6 days ago)
SELECT id, asset_tag, name, status, location_id, updated_at
FROM assets
WHERE updated_at >= UTC_DATE() - INTERVAL 6 DAY
ORDER BY updated_at DESC;

-- Data-quality companion: rows with a future updated_at (clock skew / timezone bugs)
SELECT id, asset_tag, updated_at
FROM assets
WHERE updated_at > UTC_TIMESTAMP();
-- Index note: `WHERE updated_at >= ...` (no function on the column) can use an index on updated_at.


-- ---------------------------------------------------------------------
-- 4.4  Trace a single UI edit (used with the procedure in docs/08)
-- ---------------------------------------------------------------------
SELECT id, asset_tag, name, status, location_id, updated_at
FROM assets
WHERE id = :asset_id;               -- expect new value and updated_at >= time of the edit (UTC)
