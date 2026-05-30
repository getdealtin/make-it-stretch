# Make It Stretch — Master Context Document

> **For future Claude sessions:** Upload this file at the start of any session to restore full project context. It covers everything: architecture, APIs, design decisions, deployment, and what's been built.

---

## What This Is

**Make It Stretch** is a food budget planning tool at `make-it-stretch.onrender.com`, part of the [Get Dealt In](https://getdealtin.com) civic platform. It takes a user's grocery budget, household size, days needed, and zip code, then generates:

- A real week-by-week meal plan (rule-based, no AI API)
- A full shopping list sorted cheapest-first
- Brand comparisons with price correction
- A solidarity strip using Census data ("You're not alone")
- Political context: senator vote records on SNAP legislation
- State food bills via OpenStates
- Links to SNAP, WIC, food banks, and emergency help

**Primary audience:** Single parents and low-income households under financial stress. Design principle: reduce cognitive load, no gatekeeping (all foods available at all budgets), warm and non-judgmental tone.

---

## Platform Architecture

| Service | URL | Host | Notes |
|---|---|---|---|
| Main hub | getdealtin.com | Netlify (or similar static host) | Ben Franklin mascot lives here |
| Follow the Money | follow-the-money.onrender.com | Render | Campaign finance tool — design reference |
| **Make It Stretch** | make-it-stretch.onrender.com | Render | This repo |
| Home Buying tool | getdealtin.com/homebuying.html | Same as main hub | Static HTML |
| Future: Card Table | TBD | TBD | Civic board game concept |

**GitHub repo:** `getdealtin/make-it-stretch`
**Render service:** `make-it-stretch` → auto-deploys on push to `main`
**Start command:** `node server.js`
**Node version required:** ≥18.0.0

---

## File Structure

```
make-it-stretch/
├── public/
│   └── index.html        ← Full frontend (HTML + CSS + JS, single file, ~140KB)
├── server.js             ← Node.js/Express backend
├── package.json          ← v2.0.0, deps: express + node-fetch
├── .gitignore
└── README.md             ← This file
```

---

## Backend: server.js

### Environment Variables (set in Render dashboard)

| Variable | Source | Status | Notes |
|---|---|---|---|
| `BLS_KEY` | bls.gov/developers | Active | Bureau of Labor Statistics — food price data |
| `OPENSTATES_KEY` | openstates.org | Active | State food/SNAP bill search |
| `CONGRESS_KEY` | api.congress.gov | Active | US Senator data |
| `USDA_KEY` | api.nal.usda.gov | Active | USDA FoodData (nutrition lookup, not currently used in UI) |
| `CENSUS_KEY` | api.census.gov | **Pending activation** | Census ACS zip code solidarity data — awaiting email from api.census.gov/data/key_signup.html |

> **Once Census key email arrives:** Add `CENSUS_KEY` in Render → make-it-stretch → Environment. The backend already has the endpoint built; it will start working automatically.

### API Endpoints

| Endpoint | Method | Params | What it does |
|---|---|---|---|
| `/api/food-prices` | GET | `?region=northeast\|midwest\|south\|west\|national` | Fetches live BLS food prices. Falls back to hardcoded May 2025 averages if key missing or call fails. 24-hour cache. |
| `/api/census` | GET | `?zip=72209` | ACS 5-year estimates by ZCTA: households, SNAP %, poverty rate, median income. Used for solidarity strip. |
| `/api/state-bills` | GET | `?state=AR` | OpenStates: recent food/nutrition/SNAP bills for the state. |
| `/api/congress-reps` | GET | `?state=AR` | Congress.gov: US Senators for the state. |
| `/api/food-resources` | GET | `?zip=72209&state=AR` | Static curated SNAP/WIC/food bank links. No API key needed. |
| `/api/food-search` | GET | `?q=chicken&pageSize=10` | USDA FoodData search. Built but not currently surfaced in UI. |

### Caching

All API calls use 24-hour in-memory cache (Node.js `Map`). Cache resets on Render redeploy. No persistent storage.

### Fallback Prices

`getFallbackPrices(region)` returns May 2025 BLS averages for 30+ food items across 5 regions (northeast, midwest, south, west, national). Used whenever BLS call fails or key is missing.

---

## Frontend: public/index.html

Single-file HTML/CSS/JS. ~140KB. No frameworks, no build step, no external dependencies except Google Fonts.

### Design System

Matches `follow-the-money.onrender.com` exactly:

| Token | Value | Used for |
|---|---|---|
| `--gold` | `#e8a000` | Accents, primary CTAs, labels |
| `--bg` | `#060608` | Dark header background |
| `--page-bg` | `#f7f3eb` | Warm cream body background |
| `--green` | `#3ab87a` | Positive indicators, solidarity strip |
| `--red` | `#e04a3a` | Against indicators, warnings |
| `--blue` | `#4a9eff` | Links, discover meals |
| Font display | Space Grotesk | All UI text |
| Font mono | Space Mono | Labels, numbers, eyebrows |

### Page Flow (scroll order, no tabs)

1. **Header** — dark gradient, gold, matches follow-the-money
2. **Intake form** — 5-step wizard: budget → days → people → zip → preferences
3. **Summary card** — dark, stats row (budget / days / people / $/person/day / $/meal)
4. **Solidarity strip** — Census data, "You're not alone" framing
5. **Week cards** — expandable, day-by-day meal options with cuisine rotation
6. **Tips** — 8 context-aware tips based on what's in the cart
7. **Shopping list** — grouped by category, checkable, sorted cheapest first
8. **Brand comparisons** — sorted cheapest first, "CHEAPEST" badge, user price correction
9. **Online retailers** — Aldi first, then Walmart, Amazon, Dollar General, Thrive, Costco
10. **Know Your System** — civic section (means analysis + senator votes + state bills)
11. **Get Help** — SNAP, WIC, food banks, school meals, summer meals, seniors

### Intake Wizard

| Step | Collects | Validation |
|---|---|---|
| 1 | Budget ($) | Must be ≥ $1 |
| 2 | Days (4/7/14/30) | Must select one |
| 2b | People (1/2/3–4/5+, or exact) | Must be ≥ 1 |
| 3 | Zip code | Must be 5 digits. Resolves to state + region via ZIP_MAP. |
| 4 | Cuisine preference, stores, avoidances, have-on-hand, leftover preference | All optional |

### Food Database

80+ items. **No budget gatekeeping** — all foods available regardless of budget. Budget only determines quantity.

Categories: grains, protein, vegetables, fruit, dairy, fats, pantry staples.

Tier system (display only, not gatekeeping):
- **Tier 1** — Essential staples (rice, beans, eggs, oats, bread...)
- **Tier 2** — Stretch items (frozen veg, cheese, butter, pork chops...)

### Meal Library

Meals organized by cuisine: `american`, `latin`, `asian`, `southern`, `mediterranean`, `any`.

Each cuisine has 8–10 meals across `breakfast` / `lunch` / `dinner` slots.

**DISCOVER_MEALS** (8 cross-cultural options): Shakshuka, Gallo Pinto, Khichdi, Mujaddara, Aloo Sabzi, Congee, Sweet Potato Stew, Polenta & Sauce. Shown with a "new" badge — one per meal slot per day.

Meals are filtered by:
1. User's avoid list (gluten-free, no dairy, no meat, etc.)
2. Ingredients actually in the generated cart

### Cart Logic

**First pass:** Buy one of every affordable item.

**Second pass:** Scale up quantities proportionally.
- `daysMultiplier = floor(days / 7)` (minimum 1)
- Tier 1 items scale up to `max(8, daysMultiplier × 4)`
- Tier 2 items scale up to `max(4, daysMultiplier × 2)`
- Prioritizes highest calorie-per-dollar items
- Keeps scaling until budget is exhausted

**Goal:** Spend the full budget. Remainder < $1 shows as "for tax or extras."

### Price Flow

```
Server fetches BLS live prices
    → mapped to food item IDs via mapBLSToFoodIds()
    → returned as blsPrices object
Frontend merges: { ...FALLBACK_PRICES[region], ...blsPrices }
    → only ~15 BLS items override fallback; rest use fallback
Store adjustments applied (corner store = +15–30% on perishables)
```

### Solidarity Strip (Census)

Calls `/api/census?zip=` → displays:
- Households receiving SNAP in their zip (count + %)
- Poverty rate
- Total households
- Median income

Framing: "You're one of X,XXX households in zip XXXXX navigating food costs right now."

Visible only when Census returns data. Fails silently otherwise.

### Civic Section

**Means-for-you box:** Calculates `pppd` ($ per person per day). If `pppd < $5`, user likely qualifies for SNAP. Tags each bill FOR / AGAINST / NEUTRAL based on this.

**Three key votes tracked:**

| Bill | What it did | R vote | D vote |
|---|---|---|---|
| H.R.1 "One Big Beautiful Bill" (2025) | Cut SNAP benefits, shifted costs to states | Y | N |
| SNAP work requirement expansion | Extended work requirements to ages 55–64 | Y | N |
| FY2025 CR — TEFAP funding | Kept food bank supply funding active | Y | Y |

Senators shown with party badge, years in office, vote pills (VOTED YES / VOTED NO / NOT RECORDED), expandable detail per vote, link to Congress.gov record and contact info.

State bills loaded async from OpenStates API.

---

## Key Design Decisions (Do Not Reverse)

| Decision | Reason |
|---|---|
| **No Claude API key anywhere** | Security. All meal logic is rule-based only. |
| **No budget gatekeeping** | All 80+ foods available regardless of budget. Budget controls quantity, not access. |
| **Single-page scroll, no tabs** | Reduces cognitive load for stressed users. |
| **Solidarity framing for Census data** | "You're not alone" not "here are your statistics." |
| **Cheapest brand always shown first** | Always. "CHEAPEST" badge on first item. |
| **Live BLS prices preferred** | Fetched from backend, merged over fallback. Falls back silently. |
| **Dark header matching follow-the-money** | Platform consistency. Exact same CSS. |
| **Warm cream body (#f7f3eb)** | Not white, not dark — warm and less clinical. |
| **Protein rotation across weeks** | Week 1: chicken/eggs → Week 2: tuna/lentils → Week 3: beans/chickpeas → Week 4: beef/pork |
| **No ads, no tracking** | Platform promise. Never violate. |

---

## Deployment Instructions (Non-Technical)

### Uploading Files to GitHub

1. Go to github.com/getdealtin/make-it-stretch
2. For each file (`server.js`, `public/index.html`, `package.json`, `README.md`):
   - Click the file name
   - Click the pencil icon (Edit)
   - Select all text, delete, paste the new content
   - Scroll down → "Commit changes" → click green button
3. Render detects the push and auto-redeploys (~2 minutes)
4. Check make-it-stretch.onrender.com to confirm

### Adding Environment Variables in Render

1. Go to dashboard.render.com
2. Click the `make-it-stretch` service
3. Click **Environment** in the left nav
4. Click **Add Environment Variable**
5. Enter key name and value → Save
6. Service will redeploy automatically

---

## What's Pending

- [ ] **Census API key activation** — Email expected from api.census.gov. Add as `CENSUS_KEY` in Render. The backend endpoint is already built and will activate automatically.
- [ ] **Validate with zip 72209** (Little Rock, AR — south region) once Census key is live
- [ ] **Test full flow** after deploy: budget → cart → solidarity strip → civic section
- [ ] **README itself** — this file — push to GitHub repo

---

## Test Scenario

Use this to validate a full run after deploy:

```
Budget: $80
Days: 14 (2 weeks)
People: 3
Zip: 72209 (Little Rock, AR — south region)
Cuisine: southern
Stores: Walmart
Avoid: (none)
Have: rice, oats
Leftover: yes
```

Expected behavior:
- Region resolves to `south`
- State resolves to `AR`
- BLS south prices loaded (or fallback)
- 3 senators shown: John Boozman (R), Tom Cotton (R)
- SNAP cut bill: both VOTED YES
- Solidarity strip shows (once Census key is active)
- Cart contains ~25–35 items, spends close to $80
- Week cards show 2 weeks of southern meals

---

*Last updated: May 2026 · Get Dealt In · getdealtin.com*
