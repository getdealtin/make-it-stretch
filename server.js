const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENSTATES_KEY = process.env.OPENSTATES_KEY || '';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── CACHE
// Stores OpenStates results per state for 24 hours.
// 50 states max — tiny memory footprint.
// Means 500 daily requests covers all 50 states 10x over.
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── ROUTES
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));

// ── PROXY: OpenStates state bills
app.get('/api/state-bills', async (req, res) => {
  const { state } = req.query;
  if (!state) return res.status(400).json({ error: 'state parameter required' });
  if (!OPENSTATES_KEY) return res.status(500).json({ error: 'OpenStates API key not configured on server.' });

  const cacheKey = `bills:${state.toLowerCase()}`;

  // Return cached result if fresh
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Cache hit: ${cacheKey}`);
    return res.json({ ...cached, _cached: true });
  }

  try {
    console.log(`Cache miss — fetching OpenStates for: ${state}`);
    const url = `https://v3.openstates.org/bills?jurisdiction=${encodeURIComponent(state.toLowerCase())}&q=food+nutrition+SNAP&sort=updated_desc&per_page=6&apikey=${OPENSTATES_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.detail || 'OpenStates error' });

    // Store in cache before responding
    setCache(cacheKey, data);
    console.log(`Cached: ${cacheKey} — ${cache.size}/50 states cached`);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Make It Stretch running on port ${PORT}`));
