-- /dash, laid out like the Austin build's admin (Nov 2026): one read-only function that summarizes the
-- events of the last N days (7, 30, 90 or 365). It reads the existing events table and changes nothing.
-- Run once in Supabase → SQL Editor. Until it exists, /dash shows the all-time `dashboard` view as before.
--
-- Only the server's service-role key can call it (no anonymous access). Raw rows never leave the
-- database: every figure is a count or a sum, except recent sessions and reported prices, which /dash
-- already showed.

CREATE OR REPLACE FUNCTION public.dashboard_range(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH ev AS (
  SELECT * FROM events WHERE ts > now() - make_interval(days => LEAST(GREATEST(p_days, 1), 366))
),
plans AS (
  -- One row per plan built; per-person-per-day from the exact answers (pppd is rounded to $0.25).
  SELECT session_id, zip, item AS cuisine, stores, avoid,
         CASE WHEN people > 0 AND days > 0 THEN budget / (people * days) ELSE pppd END AS ppd
  FROM ev WHERE event = 'budget_entered'
),
taps AS (
  SELECT session_id,
         bool_or(event IN ('snap_screener_clicked', 'wic_clicked')) AS benefits,
         bool_or(event = 'foodbank_clicked') AS food
  FROM ev WHERE session_id IS NOT NULL GROUP BY session_id
),
split AS (
  SELECT 'store' AS kind, trim(x) AS v FROM plans, unnest(string_to_array(stores, ',')) x
  UNION ALL SELECT 'avoid', trim(x) FROM plans, unnest(string_to_array(avoid, ',')) x
  UNION ALL SELECT 'cuisine', trim(x) FROM plans, unnest(string_to_array(coalesce(cuisine, 'any'), ',')) x
)
SELECT jsonb_build_object(
  'days', p_days,
  'all_time', (SELECT jsonb_build_object('first_event', min(ts), 'last_event', max(ts), 'total_events', count(*)) FROM events),
  'totals', (SELECT jsonb_build_object(
      'visits', count(*) FILTER (WHERE event = 'page_view'),
      'sessions', count(DISTINCT session_id),
      'plans', count(*) FILTER (WHERE event = 'budget_entered'),
      'events', count(*),
      'budget_total', coalesce(sum(budget) FILTER (WHERE event = 'budget_entered'), 0)) FROM ev),
  'per_day', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', d, 'visits', v, 'plans', p) ORDER BY d DESC), '[]')
      FROM (SELECT ts::date AS d, count(*) FILTER (WHERE event = 'page_view') AS v, count(*) FILTER (WHERE event = 'budget_entered') AS p
            FROM ev GROUP BY 1) t),
  'steps', (SELECT coalesce(jsonb_object_agg(item, n), '{}')
      FROM (SELECT item, count(DISTINCT session_id) AS n FROM ev WHERE event = 'step_completed' AND item IS NOT NULL GROUP BY item) t),
  'pressure', (SELECT jsonb_build_object(
      'under_snap', count(*) FILTER (WHERE ppd < 6.22),
      'snap_to_tfp', count(*) FILTER (WHERE ppd >= 6.22 AND ppd < 8.44),
      'over_tfp', count(*) FILTER (WHERE ppd >= 8.44)) FROM plans),
  'shortfall', (SELECT jsonb_build_object(
      'sessions', count(DISTINCT p.session_id),
      'routed_benefits', count(DISTINCT p.session_id) FILTER (WHERE t.benefits),
      'routed_food', count(DISTINCT p.session_id) FILTER (WHERE t.food))
      FROM plans p LEFT JOIN taps t USING (session_id) WHERE p.ppd < 6.22),
  'store', (SELECT coalesce(jsonb_object_agg(v, n), '{}') FROM (SELECT v, count(*) AS n FROM split WHERE kind = 'store' AND v <> '' GROUP BY v) t),
  'avoid', (SELECT coalesce(jsonb_agg(jsonb_build_array(v, n) ORDER BY n DESC), '[]') FROM (SELECT v, count(*) AS n FROM split WHERE kind = 'avoid' AND v <> '' GROUP BY v) t),
  'cuisine', (SELECT coalesce(jsonb_agg(jsonb_build_array(v, n) ORDER BY n DESC), '[]') FROM (SELECT v, count(*) AS n FROM split WHERE kind = 'cuisine' AND v <> '' GROUP BY v) t),
  'store_by_zip', (SELECT coalesce(jsonb_agg(jsonb_build_array(zip || ' · ' || v, n) ORDER BY n DESC), '[]')
      FROM (SELECT p.zip, trim(x) AS v, count(*) AS n FROM plans p, unnest(string_to_array(p.stores, ',')) x
            WHERE p.zip IS NOT NULL GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 30) t),
  'zips', (SELECT coalesce(jsonb_agg(jsonb_build_array(zip, n) ORDER BY n DESC), '[]')
      FROM (SELECT zip, count(DISTINCT session_id) AS n FROM ev WHERE zip IS NOT NULL GROUP BY zip ORDER BY 2 DESC LIMIT 200) t),
  'principles', (SELECT coalesce(jsonb_agg(jsonb_build_array(item, n) ORDER BY n DESC), '[]')
      FROM (SELECT item, count(*) AS n FROM ev WHERE event = 'principle_failed' GROUP BY item) t),
  'events_by_type', (SELECT coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) ORDER BY n DESC), '[]')
      FROM (SELECT event, count(*) AS n FROM ev GROUP BY event) t),
  'engagement', (SELECT jsonb_build_object(
      'meals_swapped', count(*) FILTER (WHERE event = 'meal_swapped'),
      'items_checked', count(*) FILTER (WHERE event = 'item_checked'),
      'lists_printed', count(*) FILTER (WHERE event = 'list_printed'),
      'lists_emailed', count(*) FILTER (WHERE event = 'list_emailed'),
      'lists_shared', count(*) FILTER (WHERE event = 'list_shared'),
      'list_switched', count(*) FILTER (WHERE event = 'list_switched'),
      'recipes_opened', count(*) FILTER (WHERE event = 'recipe_opened'),
      'twists_opened', count(*) FILTER (WHERE event = 'twists_opened'),
      'rules_opened', count(*) FILTER (WHERE event = 'rules_opened'),
      'brand_clicks', count(*) FILTER (WHERE event = 'brand_clicked'),
      'snap_clicks', count(*) FILTER (WHERE event = 'snap_screener_clicked'),
      'foodbank_clicks', count(*) FILTER (WHERE event = 'foodbank_clicked')) FROM ev),
  'recent_sessions', (SELECT coalesce(jsonb_agg(jsonb_build_object('ts', first_ts, 'zip', zip, 'events', n, 'built_plan', built) ORDER BY first_ts DESC), '[]')
      FROM (SELECT session_id, min(ts) AS first_ts, max(zip) AS zip, count(*) AS n, bool_or(event = 'budget_entered') AS built
            FROM ev WHERE session_id IS NOT NULL GROUP BY session_id ORDER BY min(ts) DESC LIMIT 40) t),
  'price_reports', (SELECT coalesce(jsonb_agg(jsonb_build_object('item', item, 'zip', zip, 'price', price, 'ts', ts) ORDER BY ts DESC), '[]')
      FROM (SELECT item, zip, price, ts FROM ev WHERE event = 'price_correction_saved' AND price IS NOT NULL ORDER BY ts DESC LIMIT 60) t)
);
$$;

REVOKE ALL ON FUNCTION public.dashboard_range(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_range(integer) TO service_role;
