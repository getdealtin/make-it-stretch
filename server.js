const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { renderDashboard } = require('./lib/dashboard.cjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── API KEYS (set in Render environment variables)
const OPENSTATES_KEY = process.env.OPENSTATES_KEY || '';
const BLS_KEY        = process.env.BLS_KEY        || '';
const USDA_KEY       = process.env.USDA_KEY       || '';
const CONGRESS_KEY   = process.env.CONGRESS_KEY   || '';
const CENSUS_KEY     = process.env.CENSUS_KEY     || '';
const SUPABASE_URL   = process.env.SUPABASE_URL   || '';
const SUPABASE_KEY   = process.env.SUPABASE_KEY   || ''; // service role key — never expose to client

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── IN-MEMORY CACHE (24 hours)
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── EVENT LOG RATE LIMITING (in-memory, per IP) ──────────────
// Max 60 events per IP per 10-minute window — prevents log flooding
const eventRateMap = new Map();
const EVENT_WINDOW = 10 * 60 * 1000;  // 10 minutes
const EVENT_LIMIT  = 60;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = eventRateMap.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > EVENT_WINDOW) {
    // Reset window
    eventRateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  eventRateMap.set(ip, entry);
  return entry.count > EVENT_LIMIT;
}

// Clean up rate map every hour to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - EVENT_WINDOW;
  for (const [ip, entry] of eventRateMap.entries()) {
    if (entry.windowStart < cutoff) eventRateMap.delete(ip);
  }
}, 60 * 60 * 1000);

// ── ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/how-plans-work', (req, res) => res.sendFile(path.join(__dirname, 'public', 'how-plans-work.html')));
app.get('/resources', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resources.html')));
// The engine's ES modules, for the browser (before the page fallback below).
app.use('/engine', express.static(path.join(__dirname, 'engine'), { maxAge: '1h' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/dash')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ────────────────────────────────────────────────
// API: BLS FOOD PRICES BY REGION
// Series ids, regions and package sizes: lib/prices.js (from the Austin build, checked Nov 2026).
// ────────────────────────────────────────────────
// ── The meal-planning engine (a copy of the Austin build's; see engine/SOURCE.json and
// scripts/update-engine.mjs). It is plain ES modules, loaded once at startup, and the same files run
// in the browser (served at /engine/). Plans are built in the browser; the server serves the data.
const engineReady = (async () => {
  const E = await import('./engine/index.js');
  const { BLS_ITEMS, BLS_CHECKED, seriesFor, toPackagePrices } = await import('./lib/prices.js');
  const { makeLivePrices } = await import('./lib/live-prices.js');
  const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8'));
  // The 161 seed recipes (ids 1–161), the 25 NHLBI main dishes (ids 1001+, printed amounts and credits)
  // and the 22 simple everyday meals (ids 2001+): the same 208 recipes the Austin build uses.
  const NIH = read('nih-recipes.json');
  const RECIPES = [...E.indexRecipes(read('seed-recipes.json')), ...NIH.recipes.map(({ es, key, ...r }) => r), ...read('simple-meals.json').recipes];
  const RECIPES_JSON = JSON.stringify(RECIPES.map(r => ({
    id: r.id, title: r.title, slot: r.slot, cuisine: r.cuisine, ingredients: r.ingredients,
    instructions: r.instructions, tags: r.tags, avoid: r.avoid, srv: r.srv,
    ...(r.uses ? { uses: r.uses, lines: r.lines, note: r.note, steps: r.steps, extra: r.extra, source: r.source } : {}),
  })));

  // Live BLS average prices (series codes and package sizes checked in the Austin build, lib/prices.js).
  async function fetchBlsPrices(region) {
    if (!BLS_KEY) return null;
    const year = String(new Date().getFullYear());
    try {
      const r = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesid: [...new Set([...seriesFor(region), ...seriesFor('national')])],
          startyear: String(+year - 1), endyear: year, registrationkey: BLS_KEY,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      if (d.status !== 'REQUEST_SUCCEEDED') return null;
      const bySeries = {};
      for (const sr of d.Results?.series || []) {
        const v = parseFloat(sr.data?.[0]?.value);
        if (v > 0) bySeries[sr.seriesID] = v;
      }
      const estimates = E.FALLBACK_PRICES[region] || E.FALLBACK_PRICES.national;
      return { ...toPackagePrices(bySeries, 'national', estimates), ...toPackagePrices(bySeries, region, estimates) };
    } catch { return null; }
  }
  // Fresh for 24 hours; through a BLS outage the last good prices are kept (in memory) and BLS
  // isn't asked again for 15 minutes.
  const livePrices = makeLivePrices({ fetchPrices: fetchBlsPrices });
  console.log(`Engine loaded (Austin ${require('./engine/SOURCE.json').commit.slice(0, 7)}): ${RECIPES.length} recipes`);
  return { E, RECIPES, RECIPES_JSON, livePrices, BLS_ITEMS, BLS_CHECKED };
})();
engineReady.catch(err => console.error('Engine failed to load:', err));

const REGIONS = ['northeast', 'midwest', 'south', 'west', 'national'];
app.get('/api/food-prices', async (req, res) => {
  const region = REGIONS.includes(req.query.region) ? req.query.region : 'national';
  const { livePrices } = await engineReady;
  const live = BLS_KEY ? await livePrices.get(region) : null;
  const st = livePrices.status().find(x => x.region === region);
  // blsPrices: live package prices by food id. The browser merges them over the engine's
  // built-in estimates (engine resolvePrices), so a food BLS doesn't cover keeps its estimate.
  res.set('Cache-Control', 'public, max-age=3600')
    .json({ region, fallback: !live, blsPrices: live || {}, fetched_at: st?.fetched_at || null });
});

app.get('/api/recipes', async (req, res) => {
  const { RECIPES_JSON } = await engineReady;
  res.type('json').set('Cache-Control', 'public, max-age=3600').send(RECIPES_JSON);
});

// ────────────────────────────────────────────────
// API: CENSUS ACS — ZIP CODE SOLIDARITY DATA
// Returns household count, median income, SNAP %, poverty rate
// Used for the "You're not alone" solidarity section
// ────────────────────────────────────────────────
app.get('/api/census', async (req, res) => {
  const { zip } = req.query;
  if (!zip) return res.status(400).json({ error: 'zip required' });

  const cacheKey = `census:${zip}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  try {
    // ACS 5-Year estimates by ZIP Code Tabulation Area (ZCTA)
    // Variables:
    //   B19013_001E = Median household income
    //   B22010_002E = Households receiving SNAP
    //   B22010_001E = Total households (for SNAP %)
    //   B17001_002E = People below poverty level
    //   B17001_001E = Total people (for poverty %)
    //   B11001_001E = Total households
    //   B09001_001E = Population under 18
    const variables = [
      'B19013_001E',  // Median household income
      'B22010_002E',  // Households receiving SNAP
      'B22010_001E',  // Total households (SNAP universe)
      'B17001_002E',  // People below poverty
      'B17001_001E',  // Total people (poverty universe)
      'B11001_001E',  // Total households
      'B09001_001E',  // Population under 18
      'B01003_001E',  // Total population
    ].join(',');

    // Build URL — use real key if available, otherwise keyless (Census allows ~500 req/day)
    const baseUrl = `https://api.census.gov/data/2022/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zip}`;
    const useKey = !!CENSUS_KEY;
    const url = useKey ? baseUrl + `&key=${CENSUS_KEY}` : baseUrl;

    // Fetch — if keyed request fails, retry without key
    let raw = null;
    const tryFetch = async (fetchUrl) => {
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`Census ${fetchUrl.includes('key=') ? 'keyed' : 'keyless'} request failed for ${zip}: HTTP ${res.status} — ${errText.slice(0,150)}`);
        return null;
      }
      return res.json();
    };

    raw = await tryFetch(url);
    if (!raw && useKey) {
      console.log(`Retrying Census without key for zip ${zip}`);
      raw = await tryFetch(baseUrl);
    }

    if (!raw || raw.length < 2) return res.json({ zip, found: false });

    const headers = raw[0];
    const values  = raw[1];
    const get = (name) => {
      const idx = headers.indexOf(name);
      return idx > -1 ? parseInt(values[idx]) || 0 : 0;
    };

    const totalHouseholds   = get('B11001_001E');
    const snapHouseholds    = get('B22010_002E');
    const snapUniverse      = get('B22010_001E') || totalHouseholds;
    const belowPoverty      = get('B17001_002E');
    const povertyUniverse   = get('B17001_001E') || 1;
    const medianIncome      = get('B19013_001E');
    const totalPopulation   = get('B01003_001E');
    const under18           = get('B09001_001E');

    const snapPct     = snapUniverse > 0 ? Math.round((snapHouseholds / snapUniverse) * 100) : 0;
    const povertyPct  = povertyUniverse > 0 ? Math.round((belowPoverty / povertyUniverse) * 100) : 0;

    const result = {
      zip,
      found: true,
      totalHouseholds,
      snapHouseholds,
      snapPct,
      belowPoverty,
      povertyPct,
      medianIncome,
      totalPopulation,
      under18,
    };

    setCache(cacheKey, result);
    res.json(result);

  } catch (err) {
    console.error('Census API error:', err.message);
    res.json({ zip, found: false, error: err.message });
  }
});

// ────────────────────────────────────────────────
// API: OPENSTATES STATE BILLS
// ────────────────────────────────────────────────
app.get('/api/state-bills', async (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state required' });
  if (!OPENSTATES_KEY) return res.json({ results: [] });

  const cacheKey = `bills:${state.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  try {
    const url = `https://v3.openstates.org/bills?jurisdiction=${encodeURIComponent(state.toLowerCase())}&q=food+nutrition+SNAP&sort=updated_desc&per_page=5&apikey=${OPENSTATES_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.json({ results: [] });
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.json({ results: [] });
  }
});

// ────────────────────────────────────────────────
// API: CONGRESS MEMBERS & VOTES BY STATE
// ────────────────────────────────────────────────
app.get('/api/congress-reps', async (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state required' });

  const cacheKey = `congress:${state}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  if (!CONGRESS_KEY) return res.json({ fallback: true, state });

  try {
    const url = `https://api.congress.gov/v3/member?stateCode=${state}&chamber=Senate&limit=2&api_key=${CONGRESS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────
// API: FOOD RESOURCES BY STATE
// ────────────────────────────────────────────────
app.get('/api/food-resources', async (req, res) => {
  const { zip, state } = req.query;
  const stateAbbr = (state || '').toUpperCase();

  const resources = {
    snap: {
      title: 'SNAP Food Assistance',
      description: 'Monthly food benefits loaded onto a card that works at most grocery stores.',
      url: 'https://www.benefits.gov/benefit/361',
      screener: 'https://www.snap-screener.com/',
      note: 'Most families qualify faster than they expect. Takes about 10 minutes to apply.'
    },
    foodbank: {
      title: 'Find a Food Bank Near You',
      description: 'Free food — no questions asked. Feeding America has 200+ food banks nationwide.',
      url: 'https://www.feedingamerica.org/find-your-local-foodbank',
      emergency: 'https://www.211.org',
      note: 'Call or text 211 for same-day emergency food help in most areas.'
    },
    wic: {
      title: 'WIC — For Women, Infants & Children',
      description: 'Free food, nutrition support, and healthcare referrals for pregnant women and children under 5.',
      url: 'https://www.fns.usda.gov/wic/wic-contacts',
      note: 'WIC is separate from SNAP — you can use both at the same time.'
    },
    schoolmeals: {
      title: 'Free & Reduced School Meals',
      description: 'Children may qualify for free or reduced breakfast and lunch every school day.',
      url: 'https://www.fns.usda.gov/nslp',
      note: 'Apply through your school district. Income limits are higher than most families expect.'
    },
    summer: {
      title: 'Summer Meals for Kids',
      description: 'Free meals for kids under 18 during summer at parks, libraries, and community centers.',
      url: 'https://www.fns.usda.gov/sfsp/summer-food-service-program',
      note: 'No paperwork, no income check. Any child under 18 can participate.'
    },
    seniors: {
      title: 'Senior Food Assistance (60+)',
      description: 'Adults 60+ may qualify for home-delivered meals and food benefits.',
      url: 'https://eldercare.acl.gov',
      note: 'Contact your local Area Agency on Aging — free, no cost to you.'
    }
  };

  res.json({ zip, state: stateAbbr, resources });
});

// ────────────────────────────────────────────────
// API: EVENT LOGGING
// Receives anonymous behavioral events from the frontend.
// Validates strictly — no raw user input reaches the DB.
// All writes use parameterized queries via Supabase REST API.
// ────────────────────────────────────────────────

const VALID_EVENTS = new Set([
  'budget_entered',
  'meal_swapped',
  'brand_clicked',
  'online_alt_clicked',
  'item_checked',
  'recipe_opened',
  'list_emailed',
  'list_printed',
  'list_shared',
  'snap_screener_clicked',
  'foodbank_clicked',
  'resource_clicked',
  'wic_clicked',
  'accordion_opened',
  'week_opened',
  'price_correction_opened',
  'price_correction_saved',
  'restarted',
  'preference_selected',
  'page_view',
  // Added with the Austin engine (Nov 2026), for /dash:
  'step_completed',     // item = the intake step finished (where people stop)
  'principle_failed',   // item = the engine rule a plan broke (a bug to fix; no answers sent)
  'list_switched',      // retailer = 'short' or 'full'
  'rules_opened',       // opened "How your plan is made"
  'twists_opened',
]);

const VALID_ITEMS = new Set([
  'rice','drybeans','oats','bread','pasta','cornmeal','flour','tortillas','barley',
  'lentils','splitpeas','chickpeas','eggs','chicken','tuna','sardines','peanutbutter',
  'groundbeef','porkchops','potatoes','onions','cabbage','carrots','cannedtomatoes',
  'garlic','sweetpotatoes','frozenvegs','frozencorn','corn','greenbeans','cannedpeas',
  'spinach','bellpepper','celery','cucumber','bananas','applesauce','apples','oranges',
  'driedmango','cannedpeaches','milk','butter','cheese','yogurt','coconutmilk',
  'evaporatedmilk','oil','oliveoil','soy','hotsauce','cannedbroth','vegbroth',
  'blackbeans','kidneybean','cannedchili','cannedsoups','salsa',
  // Foods the NHLBI recipes added (engine/extra-foods.js)
  'chickenbreast','drumsticks','sirloin','roundroast','tomatoes','avocado','zucchini','cornears',
  'frozenpeas','tomatosauce','plantains','mozzarella','raisins','sourcream','salmon','fish',
  'cornflakes','breadcrumbs','kielbasa','buttermilk','hominy','masaharina','quinoa','brownrice','groundturkey',
  // Intake steps (step_completed)
  'step_budget','step_days','step_people','step_zip','step_prefs',
  'diet',
  // Engine rules (principle_failed; engine/principles.js ids)
  'cookable','within_budget','calories_first','fullness_next','guidance','variety','spread',
  'household','no_piles','honest','same_plan',
  // Preference group names (for preference_selected events)
  'store','avoid','have','cuisine','leftover',
]);

const VALID_RETAILERS = new Set([
  // Stores
  'walmart','aldi','costco','amazon','target','kroger','dollargeneral',
  'thrivemarket','wholefoods','traderjoes','publix','heb','safeway','local',
  // Preference values (store tags, avoid tags, have tags, leftover, cuisine)
  'full','dollar','corner','none',
  'gluten','dairy','meat','eggs','peanuts','fish','nothing',
  'pork','halal','kosher','diabetic','low_sodium','short',
  'rice','beans','oats','potatoes',
  'yes','sometimes',
  'american','latin','asian','southern','mediterranean','any',
]);

// Preference groups (sent as item field for preference_selected events)
const VALID_PREF_GROUPS = new Set(['store','avoid','diet','have','cuisine','leftover']);

const VALID_BUDGET_TIERS = new Set(['low','medium','high']);
const SESSION_ID_RE = /^[a-z0-9]{12}$/;  // 12 lowercase alphanumeric chars

app.post('/api/event', async (req, res) => {
  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  // Supabase not configured — silently succeed (don't break the UI)
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.json({ ok: true, stored: false });
  }

  const { event, zip, item, retailer, budget_tier, session_id,
          pppd, people_tier, days_tier,
          budget, people, days, stores, avoid, leftover, price } = req.body;

  // Strict allowlist validation — reject anything not in our known set
  if (!VALID_EVENTS.has(event)) {
    return res.status(400).json({ error: 'invalid_event' });
  }

  // Sanitize optional fields — must match allowlists or be set to null
  const safeZip      = /^[0-9]{5}$/.test(zip) ? zip : null;
  // budget_entered carries the cuisines chosen ("latin,asian" or "any"); every other event one known item.
  const CUISINE_LIST = /^(american|latin|asian|southern|mediterranean|any)(,(american|latin|asian|southern|mediterranean))*$/;
  const safeItem     = VALID_ITEMS.has(item) || (event === 'budget_entered' && CUISINE_LIST.test(item || '')) ? item : null;
  const safeRetailer = VALID_RETAILERS.has(retailer) ? retailer : null;
  const safeTier     = VALID_BUDGET_TIERS.has(budget_tier) ? budget_tier : null;
  const safeSession    = SESSION_ID_RE.test(session_id) ? session_id : null;
  const safePppd       = (typeof pppd === 'number' && pppd >= 0 && pppd < 100) ? Math.round(pppd * 4) / 4 : null;
  const safePeopleTier = ['single','small','family'].includes(people_tier) ? people_tier : null;
  const safeDaysTier   = ['short','medium','long'].includes(days_tier) ? days_tier : null;
  const safeBudget     = (typeof budget === 'number' && budget > 0 && budget < 10000) ? +budget.toFixed(2) : null;
  const safePeople     = (Number.isInteger(people) && people > 0 && people <= 20) ? people : null;
  const safeDays       = (Number.isInteger(days) && days > 0 && days <= 365) ? days : null;
  const safeStores     = typeof stores === 'string' && stores.length < 100 ? stores : null;
  const safeAvoid      = typeof avoid === 'string' && avoid.length < 100 ? avoid : null;
  const safeLeftover   = ['yes','sometimes','no'].includes(leftover) ? leftover : null;
  const safePrice      = (typeof price === 'string' && price.trim().length > 0 && price.trim().length <= 40) ? price.trim() : null;

  try {
    // Parameterized insert via Supabase REST API
    // Server timestamp (ts) set by DB default — client cannot spoof it
    const response = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        event,
        zip:         safeZip,
        item:        safeItem,
        retailer:    safeRetailer,
        budget_tier: safeTier,
        session_id:  safeSession,
        pppd:        safePppd,
        people_tier: safePeopleTier,
        days_tier:   safeDaysTier,
        budget:      safeBudget,
        people:      safePeople,
        days:        safeDays,
        stores:      safeStores,
        avoid:       safeAvoid,
        leftover:    safeLeftover,
        price:       safePrice,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase insert error:', response.status, err.slice(0, 500));
      console.error('Key type:', SUPABASE_KEY.startsWith('sb_') ? 'new-format (needs legacy service_role JWT)' : 'JWT');
      return res.status(500).json({ error: 'db_error', status: response.status });
    }

    res.json({ ok: true, stored: true });
  } catch (err) {
    console.error('Event log error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// ────────────────────────────────────────────────
// API: AGGREGATE STATS (internal analytics dashboard use only)
// Returns counts by event type and zip — never raw rows.
// ────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  // Simple key check — not a full auth system, just prevents public browsing
  const { key } = req.query;
  if (key !== process.env.STATS_KEY || !process.env.STATS_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: 'db_not_configured' });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/event_summary?select=event,zip,day,count&order=day.desc&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const data = await response.json();
    res.json({ rows: data, generated: new Date().toISOString() });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/health', async (req, res) => {
  const { RECIPES } = await engineReady;
  res.json({
    status: 'ok',
    recipes: RECIPES.length,
    engine: require('./engine/SOURCE.json').commit.slice(0, 7),
    node: process.version,
    census_key:   CENSUS_KEY   ? 'set (' + CENSUS_KEY.slice(0,6)   + '...)' : 'NOT SET',
    supabase_url: SUPABASE_URL ? SUPABASE_URL.slice(0, 40) : 'NOT SET',
    supabase_key: SUPABASE_KEY ? 'set (' + SUPABASE_KEY.slice(0,8) + '...)' : 'NOT SET',
  });
});

// ────────────────────────────────────────────────
// API: PING — public keep-alive. Touches Supabase so the free-tier
// project's inactivity timer resets. Returns no data. The scheduled
// keep-alive workflow calls this (it needs no key, unlike /api/stats).
// ────────────────────────────────────────────────
app.get('/api/ping', async (req, res) => {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      });
    } catch (e) { /* best-effort */ }
  }
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ────────────────────────────────────────────────
// DASHBOARD — hidden internal analytics page at /dash.
// Protected by STATS_KEY: without the correct ?key= it returns a plain
// 404, so the page is invisible to anyone without the link. Reads only
// the aggregated, k-anonymized `dashboard` view — never raw rows.
// ────────────────────────────────────────────────
// ── Dashboard auth helpers ──
function dashToken() {
  return crypto.createHash('sha256').update((process.env.STATS_KEY || '') + '::dash::v1').digest('hex');
}
function getCookie(req, name) {
  const h = req.headers.cookie || '';
  const c = h.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return c ? decodeURIComponent(c.slice(name.length + 1)) : null;
}
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function dashAuthed(req) {
  const k = process.env.STATS_KEY;
  if (!k) return false;
  if (getCookie(req, 'dash_auth') === dashToken()) return true;          // signed-in cookie
  if (req.query.key && safeEqual(req.query.key, k)) return true;         // direct ?key= still works
  return false;
}

// Resolve a US zip -> {city, state} via a free, no-key lookup. Cached 24h.
async function cityForZip(zip) {
  if (!/^[0-9]{5}$/.test(zip || '')) return null;
  const ck = 'city:' + zip;
  const c = getCached(ck);
  if (c !== null) return c;
  try {
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!r.ok) { setCache(ck, {}); return {}; }
    const j = await r.json();
    const p = (j.places && j.places[0]) || {};
    const out = { city: p['place name'] || '', state: p['state abbreviation'] || '' };
    setCache(ck, out);
    return out;
  } catch (e) { return {}; }
}

// Login — checks the password, sets a 30-day auth cookie (the cookie holds a
// hash of STATS_KEY, never the key itself; changing STATS_KEY logs everyone out).
app.post('/dash/login', (req, res) => {
  const k = process.env.STATS_KEY;
  if (!k) return res.status(503).json({ ok: false, error: 'not_configured' });
  const pw = (req.body && req.body.password) || '';
  if (!safeEqual(pw, k)) return res.status(401).json({ ok: false });
  res.setHeader('Set-Cookie', `dash_auth=${dashToken()}; Path=/dash; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  res.json({ ok: true });
});

app.get('/dash/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'dash_auth=; Path=/dash; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.redirect('/dash');
});

// Dated facts shown under Annual updates on /dash. When you update or check one, change its date here.
const CHECKS = {
  census: { vintage: 2022, checked: '2026-05-30' }, // /api/census uses the 2022 ACS 5-year (set up May 30, 2026)
  votes: '2026-06-13',                              // senator vote records (KEY_VOTES in public/index.html), last changed June 13, 2026
  links: null,                                // help links (/api/food-resources, /resources)
};

// Is the engine copy behind Austin's? Checked in the background (needs git), at most twice a day.
let engineBehind = { behind: null, changed: [] };
async function checkEngine() {
  try {
    const { behind } = await import('./scripts/update-engine.mjs');
    const b = await behind();
    engineBehind = { behind: b.changed.length > 0, changed: b.changed, checked_at: new Date().toISOString() };
  } catch (e) { console.warn('[engine] could not check Austin’s engine:', e.message.split('\n')[0]); }
}
setTimeout(checkEngine, 30e3).unref();
setInterval(checkEngine, 12 * 3600e3).unref();

app.get('/dash', async (req, res) => {
  if (!process.env.STATS_KEY) {
    return res.status(503).send('Dashboard not configured yet — set the STATS_KEY environment variable in Render.');
  }
  if (!dashAuthed(req)) {
    return res.set('Content-Type', 'text/html; charset=utf-8').send(renderLogin());
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).send('Database not configured.');
  }
  const days = [7, 30, 90, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
  try {
    // The date-range summary (data/supabase_dashboard_range.sql); until it's set up, the all-time view.
    let d = null, ranged = false;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dashboard_range`, { method: 'POST', headers, body: JSON.stringify({ p_days: days }) });
    if (r.ok) { d = await r.json(); ranged = !!d; }
    if (!d) {
      const v = await fetch(`${SUPABASE_URL}/rest/v1/dashboard?select=summary`, { headers });
      const rows = await v.json();
      d = (Array.isArray(rows) && rows[0] && rows[0].summary) ? rows[0].summary : null;
    }
    if (!d) return res.status(500).send('No dashboard data returned.');
    // Resolve city names for the zips shown (cached, best-effort)
    const zips = new Set();
    (d.zips || []).forEach(([z]) => z && zips.add(z));
    (d.top_zips || []).forEach(o => o.zip && zips.add(o.zip));
    (d.recent_sessions || []).forEach(o => o.zip && zips.add(o.zip));
    const cityMap = {};
    await Promise.all([...zips].map(async z => {
      const c = await cityForZip(z);
      if (c && c.city) cityMap[z] = c.city + (c.state ? ', ' + c.state : '');
    }));
    const { E, RECIPES, livePrices, BLS_ITEMS, BLS_CHECKED } = await engineReady;
    const { EXTRA_PRICES_AS_OF } = await import('./engine/extra-foods.js');
    const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'engine', 'SOURCE.json'), 'utf8'));
    res.set('Content-Type', 'text/html; charset=utf-8').send(renderDashboard({
      d, ranged, days, cityMap,
      ctx: { BENCHMARKS: E.BENCHMARKS, BLS_CHECKED, BLS_ITEMS, EXTRA_PRICES_AS_OF, CHECKS, blsKey: !!BLS_KEY },
      prices: livePrices.status(),
      engine: { repo: src.repo, commit: src.commit, copied_at: src.copied_at, recipes: RECIPES.length, ...engineBehind },
    }));
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).send('Error loading dashboard.');
  }
});

function renderLogin() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#1B3624;--bg:#FAF8F5;--bg2:#fff;--border:#DDD9D1;--gold:#D9822B;--red:#c0492f;--ink3:#6b7a70}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.box{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:32px 28px;max-width:360px;width:100%}
h1{font-family:'Lora',serif;font-size:24px;margin-bottom:6px}
p.sub{font-size:13px;color:var(--ink3);margin-bottom:20px}
input{width:100%;padding:11px 13px;font-size:15px;border:1.5px solid var(--border);border-radius:9px;outline:none;font-family:inherit}
input:focus{border-color:var(--gold)}
button{width:100%;margin-top:12px;padding:11px;font-size:15px;font-weight:700;color:#fff;background:var(--ink);border:none;border-radius:9px;cursor:pointer}
button:hover{background:#244a30}
button:disabled{opacity:.6;cursor:default}
.err{color:var(--red);font-size:13px;margin-top:10px;min-height:16px}
</style></head><body><div class="box">
<h1>Dashboard</h1>
<p class="sub">Enter the password to continue.</p>
<input id="pw" type="password" placeholder="Password" autofocus autocomplete="current-password">
<button id="go">Sign in</button>
<div class="err" id="err"></div>
<script>
var go=document.getElementById('go'),pw=document.getElementById('pw'),err=document.getElementById('err');
async function submit(){err.textContent='';go.disabled=true;go.textContent='Checking…';
  try{var r=await fetch('/dash/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
    if(r.ok){location.href='/dash';return;}
    err.textContent='Wrong password.';}catch(e){err.textContent='Something went wrong. Try again.';}
  go.disabled=false;go.textContent='Sign in';pw.focus();pw.select();}
go.addEventListener('click',submit);
pw.addEventListener('keydown',function(e){if(e.key==='Enter')submit();});
</script>
</div></body></html>`;
}

app.listen(PORT, () => console.log(`Make It Stretch running on port ${PORT}`));
