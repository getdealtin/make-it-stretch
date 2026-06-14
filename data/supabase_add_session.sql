-- Run this in Supabase SQL Editor to add session tracking
-- Safe to run even if column already exists

ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id CHAR(12);

-- Index for session-level queries
CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id);

-- Update the aggregate view to include session counts
CREATE OR REPLACE VIEW event_summary AS
SELECT
  event,
  zip,
  budget_tier,
  DATE_TRUNC('day', ts)    AS day,
  COUNT(*)                 AS event_count,
  COUNT(DISTINCT session_id) AS session_count
FROM events
GROUP BY event, zip, budget_tier, DATE_TRUNC('day', ts);

-- Session-level view — useful for understanding full user journeys
-- Shows what a single session did, aggregated (never raw rows)
CREATE OR REPLACE VIEW session_summary AS
SELECT
  session_id,
  zip,
  budget_tier,
  DATE_TRUNC('day', MIN(ts)) AS day,
  COUNT(*)                   AS event_count,
  ARRAY_AGG(event ORDER BY ts) AS event_sequence,
  MAX(CASE WHEN event = 'foodbank_clicked' THEN 1 ELSE 0 END)       AS clicked_foodbank,
  MAX(CASE WHEN event = 'snap_screener_clicked' THEN 1 ELSE 0 END)  AS clicked_snap,
  MAX(CASE WHEN event = 'online_alt_clicked' THEN 1 ELSE 0 END)     AS clicked_online_alt,
  MAX(CASE WHEN event = 'list_emailed' THEN 1 ELSE 0 END)           AS emailed_list,
  COUNT(CASE WHEN event = 'item_checked' THEN 1 END)                AS items_checked,
  COUNT(CASE WHEN event = 'meal_swapped' THEN 1 END)                AS meals_swapped
FROM events
GROUP BY session_id, zip, budget_tier;
