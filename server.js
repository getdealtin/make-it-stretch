const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── API KEYS (set in Render environment variables)
const OPENSTATES_KEY  = process.env.OPENSTATES_KEY  || '';
const BLS_KEY         = process.env.BLS_KEY         || '';
const USDA_KEY        = process.env.USDA_KEY        || '';
const CONGRESS_KEY    = process.env.CONGRESS_KEY    || '';

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
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── API: BLS FOOD PRICES BY REGION
// Series IDs for common food items by region
// Northeast=0200, Midwest=0300, South=0400, West=0500, National=0000
app.get('/api/food-prices', async (req, res) => {
  const { region } = req.query;
  const cacheKey = `prices:${region || 'national'}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  if (!BLS_KEY) {
    // Return hardcoded fallback prices if no BLS key yet
    return res.json({ fallback: true, region, prices: getFallbackPrices(region) });
  }

  // BLS series IDs: food item prices by region
  // Format: APU[region][item_code]
  const regionCode = { northeast:'0200', midwest:'0300', south:'0400', west:'0500', national:'0000' }[region] || '0000';

  const seriesIds = [
    `APU${regionCode}703112`,  // Ground beef
    `APU${regionCode}703511`,  // Chicken legs
    `APU${regionCode}708111`,  // Eggs
    `APU${regionCode}710211`,  // Milk whole gallon
    `APU${regionCode}711211`,  // Butter
    `APU${regionCode}712112`,  // White rice
    `APU${regionCode}716114`,  // Dry beans
    `APU${regionCode}702111`,  // White bread
    `APU${regionCode}702421`,  // Oatmeal
    `APU${regionCode}711311`,  // Potatoes
    `APU${regionCode}711412`,  // Bananas
    `APU${regionCode}711111`,  // Apples
    `APU${regionCode}715211`,  // Peanut butter
    `APU${regionCode}717311`,  // Canned tomatoes
    `APU${regionCode}703112`,  // Tuna canned
    `APU${regionCode}704111`,  // Bacon
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

    // Parse BLS response into clean price map
    const prices = {};
    for (const series of (data.Results?.series || [])) {
      const latestValue = series.data?.[0]?.value;
      if (latestValue) prices[series.seriesID] = parseFloat(latestValue);
    }

    const result = { region, prices, raw: data.Results?.series };
    setCache(cacheKey, result);
    res.json(result);

  } catch (err) {
    res.json({ fallback: true, region, prices: getFallbackPrices(region), error: err.message });
  }
});

// ── API: USDA FOOD SEARCH
app.get('/api/food-search', async (req, res) => {
  const { q, pageSize } = req.query;
  const cacheKey = `food:${q}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  if (!USDA_KEY) return res.status(500).json({ error: 'USDA key not configured' });

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize||10}&dataType=SR%20Legacy,Foundation&api_key=${USDA_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: CONGRESS MEMBERS & VOTES BY STATE
app.get('/api/congress-reps', async (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state required' });

  const cacheKey = `congress:${state}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, _cached: true });

  if (!CONGRESS_KEY) return res.json({ fallback: true, state });

  try {
    // Get senators for state
    const url = `https://api.congress.gov/v3/member?stateCode=${state}&chamber=Senate&limit=2&api_key=${CONGRESS_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: OPENSTATES STATE BILLS
app.get('/api/state-bills', async (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state required' });
  if (!OPENSTATES_KEY) return res.status(500).json({ error: 'OpenStates key not configured' });

  const cacheKey = `bills:${state.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) { console.log(`Cache hit: ${cacheKey}`); return res.json({ ...cached, _cached: true }); }

  try {
    const url = `https://v3.openstates.org/bills?jurisdiction=${encodeURIComponent(state.toLowerCase())}&q=food+nutrition+SNAP&sort=updated_desc&per_page=6&apikey=${OPENSTATES_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.detail || 'OpenStates error' });
    setCache(cacheKey, data);
    console.log(`Cached: ${cacheKey} — ${cache.size} states cached`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: FOOD RESOURCES BY ZIP
// Returns SNAP, food bank, WIC links for the user's state
app.get('/api/food-resources', async (req, res) => {
  const { zip, state } = req.query;
  const stateAbbr = (state || '').toUpperCase();

  // Static resource links — curated, always available, no API key needed
  const resources = {
    snap: {
      title: 'SNAP Food Assistance',
      description: 'See if you qualify for monthly food benefits. Apply online in most states.',
      url: `https://www.benefits.gov/benefit/361`,
      screener: 'https://www.snap-screener.com/',
      note: 'Most families qualify faster than they expect. Takes about 10 minutes to apply.'
    },
    foodbank: {
      title: 'Find a Food Bank Near You',
      description: 'Free food, no questions asked. Feeding America has 200+ food banks nationwide.',
      url: `https://www.feedingamerica.org/find-your-local-foodbank`,
      emergency: 'https://www.211.org',
      note: 'Call 211 for same-day emergency food assistance in most areas.'
    },
    wic: {
      title: 'WIC — For Women, Infants & Children',
      description: 'Free food, nutrition support, and healthcare referrals for pregnant women and children under 5.',
      url: `https://www.fns.usda.gov/wic/wic-contact-information/${stateAbbr.toLowerCase() || 'state-contacts'}`,
      note: 'WIC covers specific nutritious foods — eggs, milk, beans, produce, cereal, and more.'
    },
    schoolmeals: {
      title: 'Free & Reduced School Meals',
      description: 'Children may qualify for free or reduced breakfast and lunch at school.',
      url: 'https://www.fns.usda.gov/nslp',
      note: 'Apply through your school district — income limits are higher than most families expect.'
    },
    summer: {
      title: 'Summer Meal Programs',
      description: 'Free meals for kids under 18 during summer when school is out.',
      url: 'https://www.fns.usda.gov/sfsp/summer-food-service-program',
      finder: 'https://www.summerfoods.org',
      note: 'No paperwork, no income verification. Any child under 18 can eat.'
    },
    seniors: {
      title: 'Senior Food Assistance',
      description: 'Adults 60+ may qualify for additional food benefits and home-delivered meals.',
      url: 'https://eldercare.acl.gov',
      note: 'Meals on Wheels and SFMNP serve millions of seniors at no cost.'
    }
  };

  res.json({ zip, state: stateAbbr, resources });
});

// ── FALLBACK PRICES (BLS May 2025 averages — used when BLS key unavailable)
function getFallbackPrices(region) {
  const prices = {
    northeast: { rice:3.19, drybeans:2.09, oats:3.99, eggs:3.89, potatoes:4.59, bread:2.29, cabbage:1.69, onions:2.49, bananas:0.99, milk:4.49, cannedtomatoes:1.39, peanutbutter:3.29, chicken:5.99, pasta:1.49, lentils:2.29, oil:4.99, carrots:1.79, flour:3.49, frozenvegs:2.49, tuna:1.49 },
    midwest:   { rice:2.79, drybeans:1.79, oats:3.69, eggs:3.29, potatoes:4.09, bread:1.89, cabbage:1.39, onions:2.19, bananas:0.85, milk:3.89, cannedtomatoes:1.19, peanutbutter:3.09, chicken:5.29, pasta:1.29, lentils:1.99, oil:4.49, carrots:1.49, flour:2.99, frozenvegs:2.19, tuna:1.29 },
    south:     { rice:2.69, drybeans:1.79, oats:3.59, eggs:3.29, potatoes:4.19, bread:1.89, cabbage:1.39, onions:2.09, bananas:0.85, milk:3.99, cannedtomatoes:1.19, peanutbutter:3.09, chicken:5.19, pasta:1.29, lentils:1.99, oil:4.39, carrots:1.49, flour:2.99, frozenvegs:2.19, tuna:1.29 },
    west:      { rice:3.09, drybeans:2.19, oats:4.09, eggs:3.79, potatoes:4.79, bread:2.19, cabbage:1.59, onions:2.39, bananas:0.95, milk:4.29, cannedtomatoes:1.29, peanutbutter:3.19, chicken:6.29, pasta:1.59, lentils:2.49, oil:5.29, carrots:1.89, flour:3.69, frozenvegs:2.69, tuna:1.59 },
    national:  { rice:2.89, drybeans:1.89, oats:3.79, eggs:3.49, potatoes:4.29, bread:1.99, cabbage:1.49, onions:2.29, bananas:0.89, milk:4.09, cannedtomatoes:1.29, peanutbutter:3.14, chicken:5.59, pasta:1.39, lentils:2.19, oil:4.69, carrots:1.59, flour:3.19, frozenvegs:2.39, tuna:1.39 }
  };
  return prices[region] || prices.national;
}

app.listen(PORT, () => console.log(`Make It Stretch running on port ${PORT}`));
