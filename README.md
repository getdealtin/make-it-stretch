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
│   ├── index.html          ← Full frontend (HTML + CSS + JS, single file); runs the engine in the browser
│   ├── how-plans-work.html ← "How your plan is made": 5 promises + the engine's 11 rules (EN/ES)
│   ├── about.html, resources.html
│   └── i18n/
│       ├── strings.js      ← new screen text, English + Spanish (see Languages)
│       ├── principles/     ← the 11 rules in plain words (copied from the Austin build)
│       └── data/es.json    ← Spanish for foods, recipes, NHLBI dishes, twists (copied)
├── engine/                 ← the meal-planning engine, COPIED from makeitstretch-civic (don't edit here)
│   └── SOURCE.json         ← which Austin commit it came from + a hash of every copied file
├── lib/
│   ├── prices.js, live-prices.js ← BLS series + outage-proof price cache (copied with the engine)
│   └── dashboard.cjs       ← /dash page
├── data/
│   ├── seed-recipes.json, simple-meals.json, nih-recipes.json ← 208 recipes (copied)
│   └── supabase_dashboard_range.sql ← run once for /dash date ranges
├── scripts/update-engine.mjs ← copy the engine from Austin, or --check if it's behind
├── test/                   ← npm test (node:test, no dependencies)
├── server.js               ← Node.js/Express backend
└── README.md               ← This file
```

## The meal-planning engine (Nov 2026)

Plans come from the same engine as the Austin build (austin.makeitstretch.org, repo
`getdealtin/makeitstretch-civic`). The two sites stay separate: separate repos, deploys and designs.
**This repo keeps its own copy** (owner decision, Nov 11 2026), so an Austin change only reaches
food.getdealtin.com when someone copies it and this site's tests pass.

- **Update:** `node scripts/update-engine.mjs` (needs git; copies Austin's `main`; `--ref <sha>` for a
  given commit, `--from ../makeitstretch-civic` for a local checkout). Then `npm test`, look at a few plans, commit.
- **Behind?** `node scripts/update-engine.mjs --check`. `npm test` checks it too (skipped offline), and
  `.github/workflows/engine-check.yml` runs it weekly and on every push; a failed run means Austin has changes.
  /dash shows it under *Meal-planning engine*.
- **Don't edit the copy.** `test/sync.test.js` fails if a copied file differs from what was copied.
  Change it in makeitstretch-civic, then copy.

What it does (rules in `engine/principles.js`, shown at `/how-plans-work`): meals first, then a list of
only what those meals use; about 2,000 calories per person per day first, then fullness, then federal
guidance when the budget allows; different meals from the same groceries; no ingredient in more than about
1 in 4 meals; **leftover money is shown, never spent on piles of one food** (this replaced the old
"spend the full budget" cart). Each meal has one swap that keeps the plan in budget, and swapping rebuilds
the list. Tight budgets repeat fewer meals before covering fewer days, and the plan says how many days and
calories it covers. Meals that come up 3+ times show "Ways to change it up". Plans longer than a week get one
list per week; "Show a shorter list" repeats fewer meals. Diets: halal, kosher, less sugar, low sodium
(plus no pork), each with a note in the plan. Every plan is checked against the 11 rules in the browser;
a broken rule is logged (`principle_failed`) and shown on /dash.

Recipes: the 161 seed recipes, 22 simple everyday meals and 25 NHLBI main dishes (printed amounts,
steps and credit, word for word).

## Languages

New screen text is added in **English and Spanish** as it's written (`public/i18n/strings.js`; owner
decision Nov 11 2026). The main tool stays English until the rest of the site is translated; then it gets
an EN/ES switch. `/how-plans-work` already switches. `test/i18n.test.js` fails on any missing Spanish.
Static text that's in the table carries `data-t="key"` so the test can check it word for word.

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
| `/api/food-prices` | GET | `?region=northeast\|midwest\|south\|west\|national` | Live BLS package prices by food id (`blsPrices`), from the series in `lib/prices.js`. Fresh 24 h; through a BLS outage the last good prices are kept. The browser merges them over the engine's estimates. |
| `/api/recipes` | GET | — | The 208 recipes the engine uses. |
| `/engine/*` | GET | — | The engine's ES modules, for the browser. |
| `/api/census` | GET | `?zip=72209` | ACS 5-year estimates by ZCTA: households, SNAP %, poverty rate, median income. Used for solidarity strip. |
| `/api/state-bills` | GET | `?state=AR` | OpenStates: recent food/nutrition/SNAP bills for the state. |
| `/api/congress-reps` | GET | `?state=AR` | Congress.gov: US Senators for the state. |
| `/api/food-resources` | GET | `?zip=72209&state=AR` | Static curated SNAP/WIC/food bank links. No API key needed. |
| `/api/food-search` | GET | `?q=chicken&pageSize=10` | USDA FoodData search. Built but not currently surfaced in UI. |

### Caching

API calls use a 24-hour in-memory cache (Node.js `Map`). BLS prices use `lib/live-prices.js`. Cache resets on Render redeploy.

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

### Food, recipes and the plan

All in the engine (see *The meal-planning engine* above): 83 foods with package sizes, USDA nutrition and
regional price estimates (`engine/food-db.js`); 208 recipes; the planner (`engine/meals.js`). No budget
gatekeeping: every food is available at every budget. Tier badges (Essential / Stretch) are display only.

### Price Flow

```
Server fetches BLS live prices (lib/prices.js: checked series, package sizes, sanity bounds)
    → returned as blsPrices { foodId: package price }
Browser: engine resolvePrices(region, blsPrices) = engine estimates ← live BLS
Store adjustments in the engine (corner store costs more, dollar store less)
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
| **No budget gatekeeping** | All 83 foods available regardless of budget. Budget controls quantity, not access. |
| **Leftover money is shown, not spent** | The engine's rule 9 (owner decision, Nov 2026): never piles of one food. |
| **Single-page scroll, no tabs** | Reduces cognitive load for stressed users. |
| **Solidarity framing for Census data** | "You're not alone" not "here are your statistics." |
| **Cheapest brand always shown first** | Always. "CHEAPEST" badge on first item. |
| **Live BLS prices preferred** | Fetched from backend, merged over fallback. Falls back silently. |
| **Dark header matching follow-the-money** | Platform consistency. Exact same CSS. |
| **Warm cream body (#f7f3eb)** | Not white, not dark — warm and less clinical. |
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

- [ ] **Add the `BACKUP_PASSPHRASE` secret** (owner, noted Nov 11 2026). GitHub → make-it-stretch → Settings →
  Secrets and variables → Actions → New repository secret. Use a long passphrase and keep a copy somewhere
  safe: without it no backup can be restored. Until it's added, the weekly backup stops before uploading
  anything, so **there are no database backups yet** (the earlier three were empty and have been deleted).
  After adding it, run "Weekly database backup" once from the Actions tab and check it uploads
  `supabase-backup-encrypted-…`.
- [ ] **Merge the engine upgrade** (`claude/prototype-engine-upgrade-weupza` → `main`) to put it live. The
  Supabase function `dashboard_range` for /dash is already installed.
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

## Dashboard (/dash)

Password: `STATS_KEY`. Laid out like the Austin build's admin: summary tiles, then Activity (7 / 30 / 90 days /
1 year: visits per day, where people stop in the intake, budget pressure at the SNAP and Thrifty Food Plan lines,
shortfall routing, top zips, where people shop, dietary needs and food style, engagement, events), recent
sessions, reported shelf prices, live BLS prices, the engine (copy vs Austin, plans that broke a rule) and
Annual updates. The date ranges need `data/supabase_dashboard_range.sql` run once in Supabase (read-only
function; until then /dash shows the all-time view). "Don't count this browser" keeps your own test visits out.
