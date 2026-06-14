-- Add all new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget      NUMERIC(8,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS people      SMALLINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS days        SMALLINT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS stores      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS avoid       TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS leftover    TEXT;

-- Recreate session_summary with all fields
DROP VIEW IF EXISTS session_summary;
CREATE VIEW session_summary AS
SELECT
  session_id,
  zip,
  budget_tier,
  pppd,
  budget,
  people,
  days,
  people_tier,
  days_tier,
  stores,
  avoid,
  leftover,
  DATE_TRUNC('day', MIN(ts))    AS day,
  COUNT(*)                      AS event_count,
  ARRAY_AGG(event ORDER BY ts)  AS event_sequence,
  MAX(CASE WHEN event = 'foodbank_clicked' THEN 1 ELSE 0 END)         AS clicked_foodbank,
  MAX(CASE WHEN event = 'snap_screener_clicked' THEN 1 ELSE 0 END)    AS clicked_snap,
  MAX(CASE WHEN event = 'online_alt_clicked' THEN 1 ELSE 0 END)       AS clicked_online_alt,
  MAX(CASE WHEN event = 'list_emailed' THEN 1 ELSE 0 END)             AS emailed_list,
  MAX(CASE WHEN event = 'restarted' THEN 1 ELSE 0 END)                AS restarted,
  MAX(CASE WHEN event = 'price_correction_saved' THEN 1 ELSE 0 END)   AS corrected_price,
  COUNT(CASE WHEN event = 'item_checked' THEN 1 END)                  AS items_checked,
  COUNT(CASE WHEN event = 'meal_swapped' THEN 1 END)                  AS meals_swapped,
  COUNT(CASE WHEN event = 'accordion_opened' THEN 1 END)              AS accordions_opened,
  COUNT(CASE WHEN event = 'brand_clicked' THEN 1 END)                 AS brands_clicked
FROM events
GROUP BY session_id, zip, budget_tier, pppd, budget, people, days,
         people_tier, days_tier, stores, avoid, leftover;
