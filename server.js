const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

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
app.get('/resources', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resources.html')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ────────────────────────────────────────────────
// API: BLS FOOD PRICES BY REGION
// Series IDs: APU[regionCode][itemCode]
// Northeast=0200, Midwest=0300, South=0400, West=0500, National=0000
// ────────────────────────────────────────────────
app.get('/api/food-prices', async (req, res) => {
  const { region } = req.query;
  const cacheKey = `prices:${region || 'national'}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  if (!BLS_KEY) {
    return res.json({ fallback: true, region, prices: getFallbackPrices(region) });
  }

  const regionCode = { northeast:'0200', midwest:'0300', south:'0400', west:'0500', national:'0000' }[region] || '0000';

  const seriesIds = [
    `APU${regionCode}703511`,  // Chicken leg quarters
    `APU${regionCode}708111`,  // Eggs grade A large dozen
    `APU${regionCode}710211`,  // Milk whole gallon
    `APU${regionCode}712112`,  // White rice 1lb
    `APU${regionCode}716114`,  // Dry beans 1lb
    `APU${regionCode}702111`,  // White bread 1lb
    `APU${regionCode}702421`,  // Oatmeal 16oz
    `APU${regionCode}711311`,  // Potatoes 5lb
    `APU${regionCode}711412`,  // Bananas 1lb
    `APU${regionCode}715211`,  // Peanut butter 16oz
    `APU${regionCode}717311`,  // Canned tomatoes 14.5oz
    `APU${regionCode}703612`,  // Tuna canned 6oz
    `APU${regionCode}714212`,  // Pasta 1lb
    `APU${regionCode}711111`,  // Apples 1lb
    `APU${regionCode}714232`,  // Flour 5lb
    `APU${regionCode}711311`,  // Onions 1lb (reuses potato code as proxy)
  ];

  try {
    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: seriesIds,
        startyear: '2025',
        endyear: '2025',
        registrationkey: BLS_KEY
      })
    });

    const data = await response.json();
    if (data.status !== 'REQUEST_SUCCEEDED') {
      return res.json({ fallback: true, region, prices: getFallbackPrices(region) });
    }

    const prices = {};
    for (const series of (data.Results?.series || [])) {
      const latestValue = series.data?.[0]?.value;
      if (latestValue) prices[series.seriesID] = parseFloat(latestValue);
    }

    const result = { region, prices, blsPrices: mapBLSToFoodIds(prices, regionCode) };
    setCache(cacheKey, result);
    res.json(result);

  } catch (err) {
    res.json({ fallback: true, region, prices: getFallbackPrices(region), error: err.message });
  }
});

// Map BLS series IDs back to food item IDs used by the frontend
function mapBLSToFoodIds(prices, regionCode) {
  return {
    chicken:       prices[`APU${regionCode}703511`],
    eggs:          prices[`APU${regionCode}708111`],
    milk:          prices[`APU${regionCode}710211`],
    rice:          prices[`APU${regionCode}712112`],
    drybeans:      prices[`APU${regionCode}716114`],
    bread:         prices[`APU${regionCode}702111`],
    oats:          prices[`APU${regionCode}702421`],
    potatoes:      prices[`APU${regionCode}711311`],
    bananas:       prices[`APU${regionCode}711412`],
    peanutbutter:  prices[`APU${regionCode}715211`],
    cannedtomatoes:prices[`APU${regionCode}717311`],
    tuna:          prices[`APU${regionCode}703612`],
    pasta:         prices[`APU${regionCode}714212`],
    flour:         prices[`APU${regionCode}714232`],
  };
}

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
// RECIPE ENGINE — JSON in memory, zero dependencies
// Loads seed-recipes.json once at startup
// ────────────────────────────────────────────────
let recipes = [];
try {
  const seedPath = path.join(__dirname, 'data', 'seed-recipes.json');
  recipes = JSON.parse(fs.readFileSync(seedPath, 'utf8')).map((r, i) => ({ ...r, id: i + 1 }));
  console.log(`Recipe DB loaded: ${recipes.length} recipes`);
} catch(err) {
  console.error('Could not load seed-recipes.json:', err.message);
}

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
  'rice','beans','oats','potatoes',
  'yes','sometimes',
  'american','latin','asian','southern','mediterranean','any',
]);

// Preference groups (sent as item field for preference_selected events)
const VALID_PREF_GROUPS = new Set(['store','avoid','have','cuisine','leftover']);

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
          budget, people, days, stores, avoid, leftover } = req.body;

  // Strict allowlist validation — reject anything not in our known set
  if (!VALID_EVENTS.has(event)) {
    return res.status(400).json({ error: 'invalid_event' });
  }

  // Sanitize optional fields — must match allowlists or be set to null
  const safeZip      = /^[0-9]{5}$/.test(zip) ? zip : null;
  const safeItem     = VALID_ITEMS.has(item) ? item : null;
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    recipes: recipes.length,
    node: process.version,
    census_key:   CENSUS_KEY   ? 'set (' + CENSUS_KEY.slice(0,6)   + '...)' : 'NOT SET',
    supabase_url: SUPABASE_URL ? SUPABASE_URL.slice(0, 40) : 'NOT SET',
    supabase_key: SUPABASE_KEY ? 'set (' + SUPABASE_KEY.slice(0,8) + '...)' : 'NOT SET',
  });
});

// Dishes that should never appear as standalone meals in a slot
const SIDE_DISH_BLOCKLIST = new Set([
  'potato salad', 'potato salad bowl', 'succotash', 'collard-style cabbage',
  'collard style cabbage', 'coleslaw', 'corn on the cob', 'cornbread',
  'skillet cornbread', 'biscuits', 'dinner rolls', 'rice paper rolls',
]);

// Dishes that are NOT breakfast foods
const NOT_BREAKFAST = new Set([
  'rice and beans', 'gallo pinto', 'bean stew', 'vegetable soup',
  'lentil dal', 'hoppin john', "hoppin' john", 'succotash',
  'potato salad', 'potato salad bowl', 'collard-style cabbage',
  'pork and bean stew', 'bean and cornmeal stew',
]);

app.get('/api/recipes-for-cart', (req, res) => {
  try {
    const { ingredients, cuisine, avoid } = req.query;
    const cartIngredients = (ingredients || '').split(',').filter(Boolean).map(s => s.toLowerCase());
    const selectedCuisines = (cuisine || '').split(',').filter(Boolean);
    const avoidList = (avoid || '').split(',').filter(Boolean);

    if (!cartIngredients.length) {
      return res.status(400).json({ error: 'ingredients required' });
    }

    const scored = recipes.map(r => {
      const recipeIngs = Array.isArray(r.ingredients) ? r.ingredients : [];
      const recipeAvoids = Array.isArray(r.avoid) ? r.avoid : [];

      // Filter by cuisine — lowercase both sides to prevent case mismatch
      const rc = (r.cuisine || '').toLowerCase();
      if (selectedCuisines.length && !selectedCuisines.includes('any')) {
        const cuisineLower = selectedCuisines.map(c => c.toLowerCase());
        if (!cuisineLower.includes(rc) && rc !== 'any') {
          return null;
        }
      }

      // Filter avoided ingredients
      if (avoidList.some(a => recipeAvoids.includes(a))) return null;

      // Filter side dishes that shouldn't be standalone meals
      const nameLower = (r.title || '').toLowerCase();
      if (SIDE_DISH_BLOCKLIST.has(nameLower)) return null;

      // Filter breakfast slot: block known non-breakfast dishes
      if (r.slot === 'breakfast' && NOT_BREAKFAST.has(nameLower)) return null;

      // Score by ingredient match — 1 match minimum (2 was too strict, caused wrong-cuisine bleed)
      const matchScore = cartIngredients.filter(cartIng =>
        recipeIngs.some(recipeIng =>
          typeof recipeIng === 'string' && (
            recipeIng.toLowerCase().includes(cartIng) ||
            cartIng.includes(recipeIng.toLowerCase())
          )
        )
      ).length;

      if (matchScore < 1) return null;

      return { ...r, matchScore };
    }).filter(Boolean);

    scored.sort((a, b) => b.matchScore - a.matchScore);

    // Cap at 30 per slot for 30-day plans (3 meals/day needs good variety)
    // STRICT: a breakfast recipe only goes in breakfast, dinner only in dinner, etc.
    const bySlot = { breakfast: [], lunch: [], dinner: [], any: [] };
    for (const r of scored) {
      const rSlot = r.slot || 'any';
      // Only put in 'any' if truly slot=any; otherwise respect the recipe's slot exactly
      const targetSlot = (bySlot[rSlot] !== undefined) ? rSlot : 'any';
      if (bySlot[targetSlot].length < 30) bySlot[targetSlot].push(r);
    }

    // If any slot is critically empty (<4 recipes), do a relaxed pass with cuisine only (no match score floor)
    const allCuisineMatch = recipes.filter(r => {
      const rc = (r.cuisine || '').toLowerCase();
      const nameLower = (r.title || '').toLowerCase();
      if (SIDE_DISH_BLOCKLIST.has(nameLower)) return false;
      if (selectedCuisines.length && !selectedCuisines.includes('any')) {
        const cl = selectedCuisines.map(c => c.toLowerCase());
        if (!cl.includes(rc) && rc !== 'any') return false;
      }
      if (avoidList.some(a => (Array.isArray(r.avoid) ? r.avoid : []).includes(a))) return false;
      return true;
    });
    for (const slot of ['breakfast','lunch','dinner']) {
      if (bySlot[slot].length < 4) {
        const existingIds = new Set(bySlot[slot].map(r => r.id));
        const extras = allCuisineMatch.filter(r => {
          const rSlot = r.slot || 'any';
          // STRICT slot enforcement: breakfast dishes ONLY go to breakfast,
          // dinner dishes ONLY go to dinner. Only slot='any' can fill any slot.
          if (rSlot === 'breakfast' && slot !== 'breakfast') return false;
          if (rSlot === 'dinner' && slot !== 'dinner') return false;
          if (rSlot === 'lunch' && slot !== 'lunch') return false;
          if (NOT_BREAKFAST.has((r.title||'').toLowerCase()) && slot === 'breakfast') return false;
          return !existingIds.has(r.id);
        });
        bySlot[slot].push(...extras.slice(0, 30 - bySlot[slot].length));
      }
    }

    res.json({ found: true, bySlot, total: scored.length });

  } catch(err) {
    console.error('Recipe route error:', err.message);
    res.status(500).json({ found: false, error: err.message });
  }
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
app.get('/dash', async (req, res) => {
  const { key } = req.query;
  if (!process.env.STATS_KEY || key !== process.env.STATS_KEY) {
    return res.status(404).send('<!doctype html><title>Not found</title><h1>404 — Not found</h1>');
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).send('Database not configured.');
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/dashboard?select=summary`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    const rows = await r.json();
    const d = (Array.isArray(rows) && rows[0] && rows[0].summary) ? rows[0].summary : null;
    if (!d) return res.status(500).send('No dashboard data returned.');
    res.set('Content-Type', 'text/html; charset=utf-8').send(renderDashboard(d));
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).send('Error loading dashboard.');
  }
});

function renderDashboard(d) {
  const t = d.totals || {}, en = d.engagement || {}, bt = d.budget_tiers || {};
  const esc = s => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const last = t.last_event ? new Date(t.last_event) : null;
  const ageH = last ? Math.round((Date.now() - last.getTime()) / 3600000) : null;
  const fresh = ageH != null && ageH <= 48;
  const stamp = dt => dt ? new Date(dt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—';
  const card = (label, val) => `<div class="card"><div class="cv">${val == null ? '—' : esc(val)}</div><div class="cl">${label}</div></div>`;
  const evRows = (d.events_by_type || []).map(o => `<tr><td>${esc(o.event)}</td><td class="num">${esc(o.n)}</td></tr>`).join('') || '<tr><td colspan="2" class="dim">none yet</td></tr>';
  const zipRows = (d.top_zips || []).map(o => `<tr><td>${esc(o.zip)}</td><td class="num">${esc(o.sessions)}</td></tr>`).join('') || '<tr><td colspan="2" class="dim">no area has enough sessions to show yet</td></tr>';
  const enRows = [
    ['Meals swapped', en.meals_swapped], ['Items checked', en.items_checked],
    ['Lists printed', en.lists_printed], ['Lists emailed', en.lists_emailed],
    ['Lists shared', en.lists_shared], ['Brand prices viewed', en.brand_clicks],
    ['SNAP screener clicks', en.snap_clicks], ['Food-bank clicks', en.foodbank_clicks],
  ].map(([l, v]) => `<tr><td>${l}</td><td class="num">${v == null ? '—' : esc(v)}</td></tr>`).join('');
  const tierTotal = (bt.low || 0) + (bt.medium || 0) + (bt.high || 0);
  const bar = (label, v, color) => { const pct = tierTotal ? Math.round((v || 0) / tierTotal * 100) : 0; return `<div class="barrow"><span class="bl">${label}</span><span class="bt"><span class="bf" style="width:${pct}%;background:${color}"></span></span><span class="bn">${v || 0} · ${pct}%</span></div>`; };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard · Make It Stretch</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#1B3624;--ink2:#3E4A42;--ink3:#6b7a70;--bg:#FAF8F5;--bg2:#fff;--border:#DDD9D1;--gold:#D9822B;--green:#2e7d50;--red:#c0492f}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:'Plus Jakarta Sans',sans-serif;line-height:1.5;padding:28px 18px 80px}
.wrap{max-width:860px;margin:0 auto}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}
h1{font-family:'Lora',serif;font-size:30px;margin:6px 0 2px}
.status{font-family:'IBM Plex Mono',monospace;font-size:12px;margin:10px 0 24px;color:var(--ink2)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 16px}
.cv{font-family:'Lora',serif;font-size:30px;font-weight:700;color:var(--ink)}
.cl{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin-top:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
h2{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:28px 0 10px}
table{width:100%;border-collapse:collapse;background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
td{padding:8px 12px;border-bottom:1px solid var(--border);font-size:14px}
tr:last-child td{border-bottom:none}
.num{text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:600}
.dim{color:var(--ink3);font-style:italic}
.barrow{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px}
.bl{width:72px;font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:var(--ink2)}
.bt{flex:1;height:14px;background:#eceae4;border-radius:7px;overflow:hidden}
.bf{display:block;height:100%}
.bn{width:92px;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2)}
.note{font-size:12px;color:var(--ink3);margin-top:10px;line-height:1.6}
@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr)}.cols{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<p class="eyebrow">Make It Stretch · Internal</p>
<h1>Dashboard</h1>
<p class="status"><span class="dot" style="background:${fresh ? 'var(--green)' : 'var(--red)'}"></span>Last activity: ${stamp(t.last_event)}${ageH != null ? ` (${ageH < 1 ? 'under 1h' : ageH + 'h'} ago)` : ''} — ${fresh ? 'logging looks live' : 'no recent events'} &nbsp;·&nbsp; generated ${stamp(Date.now())}</p>
<div class="grid">
${card('Visits', t.visits)}
${card('Sessions', t.distinct_sessions)}
${card('Plans built', t.plans_built)}
${card('Total events', t.total_events)}
</div>
<p class="note">A "visit" is any page load; a "session" is a visit that did something; a "plan built" means the person completed the intake.</p>
<div class="cols">
<div><h2>Events by type</h2><table>${evRows}</table></div>
<div><h2>Engagement</h2><table>${enRows}</table></div>
</div>
<h2>Budget pressure (per-person-per-day)</h2>
${bar('Low', bt.low, 'var(--red)')}
${bar('Medium', bt.medium, 'var(--gold)')}
${bar('High', bt.high, 'var(--green)')}
<p class="note">"Low" = below the USDA Thrifty Food Plan line (about $5.36/person/day). Based on ${tierTotal} completed plan${tierTotal === 1 ? '' : 's'}.</p>
<h2>Where — top areas</h2>
<table><tr><td><strong>Zip</strong></td><td class="num"><strong>Sessions</strong></td></tr>${zipRows}</table>
<p class="note">Areas with fewer than 5 sessions are hidden so no row can point at a household${d.zips_suppressed ? ` (${d.zips_suppressed} area${d.zips_suppressed == 1 ? '' : 's'} hidden)` : ''}. The Visits count begins filling once this update is deployed.</p>
</div></body></html>`;
}

app.listen(PORT, () => console.log(`Make It Stretch running on port ${PORT}`));
