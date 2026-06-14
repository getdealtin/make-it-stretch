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
const CENSUS_KEY     = process.env.CENSUS_KEY     || 'DEMO_KEY';

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

    const url = `https://api.census.gov/data/2022/acs/acs5?get=${variables}&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      // ZIP not found in Census — return graceful null
      return res.json({ zip, found: false });
    }

    const raw = await response.json();
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
  recipes = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log(`Recipe DB loaded: ${recipes.length} recipes`);
} catch(err) {
  console.error('Could not load seed-recipes.json:', err.message);
}

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

      // Filter by cuisine
      if (selectedCuisines.length && !selectedCuisines.includes('any')) {
        if (!selectedCuisines.includes(r.cuisine) && r.cuisine !== 'any' && r.slot !== 'any') {
          return null;
        }
      }

      // Filter avoided ingredients
      if (avoidList.some(a => recipeAvoids.includes(a))) return null;

      // Score by ingredient match
      const matchScore = cartIngredients.filter(cartIng =>
        recipeIngs.some(recipeIng =>
          typeof recipeIng === 'string' && (
            recipeIng.toLowerCase().includes(cartIng) ||
            cartIng.includes(recipeIng.toLowerCase())
          )
        )
      ).length;

      if (matchScore < 2) return null;

      return { ...r, matchScore };
    }).filter(Boolean);

    scored.sort((a, b) => b.matchScore - a.matchScore);

    const bySlot = { breakfast: [], lunch: [], dinner: [], any: [] };
    for (const r of scored) {
      const slot = bySlot[r.slot] ? r.slot : 'any';
      if (bySlot[slot].length < 12) bySlot[slot].push(r);
    }

    res.json({ found: true, bySlot, total: scored.length });

  } catch(err) {
    console.error('Recipe route error:', err.message);
    res.status(500).json({ found: false, error: err.message });
  }
});


app.listen(PORT, () => console.log(`Make It Stretch running on port ${PORT}`));
