# Make It Stretch — Design System Reference
**getdealtin · Margin Ventures LLC · 2026**

This document captures every intentional design decision made during the UI build. Read this before adding any new feature so the visual language stays consistent. If building a similar tool, start here.

---

## 1. Design Philosophy

The layout tells two stories simultaneously:

- **Left/main column:** Stability, dignity, immediate utility — a workspace for someone managing a tight budget. Cream tones, warm typography, no judgment.
- **Right sidebar:** Editorial weight, civic data, political accountability. Dark forest green, high contrast, journalistic. "Where You Stand."

Every design choice is in service of this split. The user manages their survival on the left. The right tells them the truth about why they're in that position.

**Tone rule:** The app speaks to a difficult *moment*, not a permanent condition. Use "right now," "this budget," "this plan" — never "you are poor." The civic section assigns systemic blame, not personal failure.

---

## 2. Color Palette — "Grounded Resilience"

### CSS Custom Properties (`:root`)

| Token | Value | Role |
|-------|-------|------|
| `--ink` | `#1B3624` | Deep Forest — primary text, hierarchy |
| `--ink2` | `#3E4A42` | Slate Grey — secondary text, data, borders |
| `--ink3` | `#6b7a70` | Muted Sage — tertiary/hint text |
| `--ink4` | `#9aaa9f` | Faint Sage — disabled/placeholder |
| `--bg` | `#FAF8F5` | Warm Cream — page canvas |
| `--bg2` | `#F3F0EB` | Deeper Cream — card surfaces, week card header |
| `--bg3` | `#EAE6DF` | Hover/pressed state |
| `--border` | `#DDD9D1` | Warm grey border |
| `--border2` | `#C8C4BC` | Stronger border — week card edges, day-row dividers |
| `--gold` | `#D9822B` | **Warm Ochre — THE accent. Use sparingly.** |
| `--green` | `#1B3624` | Forest green — confirmed/positive |
| `--green-bg` | `#EEF3EE` | Soft green tint — chosen chip, leftover chip, have tags |
| `--red` | `#b83c2b` | Terracotta — alerts, warnings |
| `--blue` | `#2a5c8a` | Slate blue — links only |

Full token list also includes: `--green-border: #B8CDB8`, `--red-dim: #fdf0ec`, `--red-border: #f0c4b8`, `--blue-dim: #eaf0f7`, `--blue-border: #b8d0e8`, `--gold-dim: #fdf0e4`, `--amber-border: #f0c898`, `--purple: #6b4e8a`, `--purple-bg: #f4f0f8`, `--purple-border: #d4c8e8`.

### Named Values (hardcoded, context-specific)

| Value | Where used |
|-------|-----------|
| `#25332B` | Midnight Juniper — sidebar background exclusively |
| `#35473D` | Sidebar internal borders/dividers |
| `#E8922F` | Sidebar chapter labels (brighter gold, 5.4:1 contrast on dark) |
| `#5db87a` | VOTED NO label on senator cards (4.7:1 on dark card bg) |
| `#f87171` | VOTED YES label on senator cards (4.8:1 on dark card bg) |
| `#5A6E61` | Form section label, shopping tips |
| `#4A5D50` | Soft juniper — discover chip text |
| `#718276` | Muted grey-green — slot labels (BREAKFAST/LUNCH/DINNER) |
| `#EDE8DF` | Open week card header background, hover tint |
| `#eef3ee` | Chosen chip bg, leftover chip bg, have tags |
| `#3a7a50` | Active forest green — chosen chip border ring |
| `#f7f5f1` | Leftover day-row background tint |

### Application Rules

- **Warm Ochre `#D9822B`** is the system accent. Used for: progress bar, CTA buttons, WEEK labels, gold stat values. Never decorative.
- **Deep Forest `#1B3624`** anchors text hierarchy. Selected food tradition cards go full `#1B3624` bg with white text.
- **Midnight Juniper `#25332B`** is *exclusively* for the sidebar. Nothing on the cream canvas should use it.
- **Pure white `#fff`** appears only on meal chips (lifted card effect) and button text on dark backgrounds.
- **`--border2` (#C8C4BC)** is used for week card outer borders and day-row dividers — stronger than `--border` to give the meal plan section visual structure.

### Sidebar WCAG-Verified Colors

| Element | Color | Contrast | Grade |
|---------|-------|----------|-------|
| Panel background | `#25332B` | — | — |
| Lead text | `rgba(250,248,245,.95)` | 11.6:1 | AAA |
| Body text | `rgba(250,248,245,.65)` | 5.9:1 | AA |
| Chapter labels | `#E8922F` | 5.4:1 | AA |
| VOTED NO (green) | `#5db87a` | 4.7:1 | AA |
| VOTED YES (red) | `#f87171` | 4.8:1 | AA |
| Gold stat values | `#D9822B` | 4.5:1 | AA |
| Senator names | `rgba(250,248,245,.95)` | 10.8:1 | AAA |
| Muted italic footer | `rgba(250,248,245,.30)` | 3.6:1 | AA-Large* |

*Decorative/supplementary text — exempt from 4.5:1 requirement. All meaningful and interactive text meets AA minimum.

---

## 3. Typography — The Three-Brain Rule

Each font plays a specific cognitive role. Don't swap them.

| Font | Role | Never use for |
|------|------|---------------|
| **Playfair Display** | Header title only ("Make It Stretch") | Anything outside the hero h1 |
| **Lora** | Editorial serif — section headings, step questions, summary titles, political content | UI controls, chip labels, data |
| **Plus Jakarta Sans** | UI Anchor — buttons, labels, tags, body copy, chip names, navigation | Section headings, emotional moments |
| **IBM Plex Mono** | Data only — prices, stats, percentages, codes | Any flowing text |

### The Three-Brain Rule

1. **Uppercase tracked Plus Jakarta Sans** → "Where am I in the system" (STEP 3 OF 5, WEEK 1, BREAKFAST, tier badges)
2. **Sentence-case Plus Jakarta Sans** → "My data, my choices" (button labels, **meal chip names**, body copy)
3. **Lora serif** → "The truth about what's happening outside" (section headers, Know Your System, vote impact summaries)

**Note:** Meal chip dish names use Plus Jakarta Sans 700 bold (not Lora) — they are user choices, not editorial content.

### Google Fonts Import

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

DM Sans has been fully removed. Do not re-add it.

### Type Scale

| Element | Font | Size | Weight | Notes |
|---------|------|------|--------|-------|
| Page hero h1 | Playfair Display | ~100px | 900 italic | Header only |
| Section h2 | Lora | 22px | 700 | letter-spacing: -.3px |
| Accordion title | Lora | 16px | 700 | letter-spacing: -.2px |
| Summary/game plan title | Lora | 1.75rem | 600 | letter-spacing: -0.01em |
| Step question | Lora | 22px | 700 | letter-spacing: -.3px |
| WEEK label | Plus Jakarta Sans | 0.8rem | 800 | uppercase, 0.1em tracking |
| Week title (Mon–Sun) | Plus Jakarta Sans | 16px | 700 | **no font-family set — inherits body** |
| DAY name (MON, TUE) | Plus Jakarta Sans | 0.7rem | 800 | uppercase, 0.1em tracking |
| BREAKFAST/LUNCH/DINNER | Plus Jakarta Sans | 0.7rem | 700 | uppercase, 0.08em, color: #718276 |
| Meal chip name | Plus Jakarta Sans | 13px | **700** | `.meal-chip-name` span, bold |
| Cuisine tag on discover chip | IBM Plex Mono | 10px | 400 | opacity .55 |
| NEW badge on discover chip | Plus Jakarta Sans | 9px | 700 | uppercase, `.discover-pill` |
| Stat value | IBM Plex Mono | 22px | 500 | — |
| Stat label | Plus Jakarta Sans | 0.65rem | 700 | uppercase |
| Shop price | IBM Plex Mono | 15px | 700 | — |
| Sidebar chapter label | Plus Jakarta Sans | 10px | 800 | uppercase, color: #E8922F |
| Sidebar lead text | Lora | 14px | 400/600 | color: rgba(250,248,245,.95) |
| Sidebar body text | Plus Jakarta Sans | 12–13px | 400 | color: rgba(250,248,245,.65) |
| Senator role | Plus Jakarta Sans | 9px | 700 | uppercase, muted |
| Senator name | Plus Jakarta Sans | 12px | 700 | color: rgba(250,248,245,.95) |
| Senator vote label | IBM Plex Mono | varies | 700 | green #5db87a or red #f87171 |

---

## 4. Layout Architecture

### Desktop: Dual-Narrative Grid

```
+----------------------------------------------+------------------+
|  LEFT/CENTER: SURVIVAL TOOLS                 | RIGHT: WHERE     |
|  (Warm Cream #FAF8F5)                        | YOU STAND        |
|                                              | (Juniper #25332B)|
|  Summary Dashboard                           |                  |
|  Meal Game Plan (week cards)                 | YOUR COMMUNITY   |
|  ↓ Accordion: Shopping List                  | Census zip data  |
|  ↓ Accordion: Brand Comparisons              |                  |
|  ↓ Accordion: Know Your System               | WHO VOTED ON     |
|  ↓ Accordion: Get Help                       | YOUR GROCERIES   |
|                                              | Senator cards    |
+----------------------------------------------+------------------+
```

CSS: `.dash-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }`

Sidebar: `position: sticky; top: 24px` — scrolls with page until it reaches top.

Breakpoint: `@media(max-width:900px)` — sidebar hides, mobile pulse card appears inline after meal plan.

### Mobile: Trojan Horse Scroll

1. **Act I — Dashboard** (summary card + stats)
2. **Act II — Meals** (week cards, interactive)
3. **Subversive pivot** — Mobile dark card slides in with community + vote data
4. **Act III — Utility accordions** (shopping list open by default, rest collapsed)

### Intake Form

`.intake-wrap { max-width: 780px; margin: 0 auto; }` — narrower than dashboard grid.

---

## 5. Interactive Component Rules

### Buttons

**Primary CTA (`btn-primary`):** Warm Ochre `#D9822B`, white text, Plus Jakarta Sans 700, uppercase, 0.08em tracking.

**Back button (`btn-back`):** No background, `--ink2` text. Never styled as primary.

### Food Tradition Cards (`option-btn`)

Large 2-column grid. Unselected: `--bg2` bg, `--border` border. **Selected: solid `#1B3624` background, white text** — strongest selected state in the app.

### Pill Tags (`tag-btn`)

`border-radius: 20px` pills. Three selected states:
- **Store tags** → Ochre `#D9822B`, white text
- **Avoid tags** → Deep Forest `#1B3624`, white text
- **Have tags** → Sage `#eef3ee`, forest green text/border

### Meal Chips (`meal-chip`)

White `#fff` background. Soft shadow: `0 1px 4px rgba(27,54,36,.1), 0 0 0 1px rgba(27,54,36,.06)`. Hover: `translateY(-1px)`. Chosen: `box-shadow: 0 0 0 2px #3a7a50`, background: `#eef3ee`.

**Chip anatomy:**
```html
<div class="meal-chip-wrap">
  <button class="meal-chip [chosen] [discover]" ...>
    [<span class="discover-pill">NEW</span>]   ← only on i===1
    <span class="meal-chip-name">Dish Name</span>  ← font-weight:700
    [<span class="meal-chip-cuisine">Cuisine</span>]  ← only on discover, IBM Plex Mono 10px
    <span class="meal-chip-recipe-btn" ...>📖</span>  ← hidden until hover
  </button>
</div>
```

**Two chips per slot:** First chip (i===0) = default, gets `.chosen`. Second chip (i===1) = discover option, gets `.discover` class + `NEW` pill + cuisine tag. No third chip.

**Discover chip:** Background `#f0f4f1`, text `#4A5D50`, shadow `0 0 0 1px rgba(74,93,80,.15)`. Chosen discover: background `#e4ece6`, shadow `0 0 0 2px #3a7a50`.

**Recipe button (📖):** `opacity: 0` by default, `0.7` on chip hover, `1` on icon hover. `event.stopPropagation()` prevents chip selection.

**`meal-chip-name`:** Always a `<span>` with `font-weight: 700`. This is what makes chip text bold. Without it chips look thin/light.

### Leftover Row

Leftover days get a distinct visual treatment — not a meal slot, but a chip:

```css
.leftover-row {
  font-size: 13px; font-weight: 600; color: #3a7a50;
  padding: 8px 14px; background: #eef3ee;
  border-radius: 6px; box-shadow: 0 0 0 1px rgba(58,122,80,.2);
  display: inline-flex; align-items: center; gap: 6px;
}
.day-row-leftover { background: #f7f5f1; }  /* subtle tint on the row itself */
```

HTML: `↻ Leftovers from yesterday — reheat and save time`

### Week Cards

```css
.week-card {
  border: 1px solid var(--border2);    /* stronger border */
  border-radius: 10px; overflow: hidden;
  background: var(--bg2);
  box-shadow: 0 1px 4px rgba(27,54,36,.06);
}
.week-header {
  background: var(--bg2);
  border-bottom: 1px solid transparent;  /* becomes visible when open */
}
.week-card.open .week-header {
  background: #EDE8DF;                   /* darker header when open */
  border-bottom: 2px solid var(--border2);  /* strong divider header/body */
}
.week-body {
  background: var(--bg);               /* lighter than header — creates depth */
}
.day-row {
  border-bottom: 1px solid var(--border2);  /* darker row dividers */
}
```

**Critical:** `week-body` must have `background: var(--bg)` (not inherit from card's `--bg2`) to create the visual contrast that makes day rows feel enclosed. Without this the whole card reads as flat.

**Critical:** `week-title` (Mon–Sun) has **no explicit font-family** — it inherits Plus Jakarta Sans from body. Do not add Lora here. The week title is a user-data label, not editorial content.

### Accordions

Collapsed by default. Shopping list opens automatically after results load.

### Senator Cards (`.pulse-senator`)

```css
.pulse-senator {
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(255,255,255,.06);
  border-radius: 6px; padding: 10px 12px;
}
.pulse-senator.vote-protect {   /* voted NO — protect SNAP */
  border-color: rgba(93,184,122,.5);
  background: rgba(58,122,80,.12);
}
.pulse-senator.vote-cut {       /* voted YES — cut SNAP */
  border-color: rgba(248,113,113,.4);
  background: rgba(184,60,43,.12);
}
```

Card anatomy (top to bottom):
1. `.pulse-sen-role` — "SENATOR · REPUBLICAN" — 9px uppercase, muted
2. `.pulse-sen-name` — senator name — 12px bold
3. `.pulse-sen-vote` — vote label — IBM Plex Mono, `#5db87a` or `#f87171`

---

## 6. Sidebar: "Where You Stand"

Replaced the old "Why Your Groceries Cost This Much" section (hardcoded 47M+, $6, 13% stats). Now two sections populated dynamically from real data.

### Structure

```
WHERE YOU STAND                    ← .pulse-hdr (dark header, Lora)

YOUR COMMUNITY                     ← .pulse-chapter-label (#E8922F)
[zip SNAP households count + %]    ← .pulse-chapter-lead (Lora)
[1 in X poverty rate]              ← .pulse-chapter-body
[food % of median income]          ← .pulse-chapter-body
[hardship flag if >30%]
[italic structural note]           ← muted, decorative

WHO VOTED ON YOUR GROCERIES · AR   ← .pulse-chapter-label
[Congress controls SNAP...]        ← .pulse-chapter-lead
[Senator card] [Senator card]      ← .pulse-senate-row
[on H.R.1 context line]            ← .pulse-senate-context
[See full vote breakdown →]        ← .pulse-cta
```

### Community Data Logic (`loadCensusData`)

1. Called with `zip`, `state`, `people`, `pppd` after calculation completes
2. Fetches `/api/census?zip=` → Census ACS 5-year data
3. **Every code path calls `populateSystemPulse()`** — success, not-found, and error. No silent failures.
4. Passes `d.zip = zip` through so sidebar can display the zip
5. Falls back to national framing if Census returns no data — never prompts user to enter zip again (they already did)
6. Errors logged to console: `console.error('Census API error:', e)`

### Senator Vote Attribution

Votes attributed by party-line roll call. `STATE_REPS` object maps all 50 states to `{ s1: {name, party}, s2: {name, party} }`. Party → vote lookup in `KEY_VOTES[0].votes`.

---

## 7. Recipe Engine — Implementation Reference

### Database (`data/seed-recipes.json`)

**161 recipes** across 6 cuisines. Each entry:

```json
{
  "title": "Garlic Cabbage with Rice",
  "slot": "lunch",
  "cuisine": "asian",
  "ingredients": ["cabbage", "garlic", "onions", "oil", "rice", "soy sauce"],
  "instructions": "...",
  "avoid": [],
  "srv": 2
}
```

**Slot values:** `breakfast`, `lunch`, `dinner`. No `any` slot — use `cuisine: "any"` for universal dishes.

**`cuisine: "any"`** is reserved for ~8 genuinely universal dishes only (Simple Oatmeal, Basic Egg Scramble, etc.). Do not add `any` cuisine to dishes with cultural specificity.

**Side dishes are excluded.** No standalone sides (potato salad, cornbread, collard greens, etc.) — every recipe must be a complete meal.

### Recipe Counts by Cuisine/Slot

| Cuisine | Breakfast | Lunch | Dinner | Total |
|---------|-----------|-------|--------|-------|
| American | ~10 | ~9 | ~10 | ~29 |
| Latin | ~7 | ~11 | ~12 | ~30 |
| Asian | ~7 | ~10 | ~17 | ~34 |
| Southern | ~8 | ~8 | ~11 | ~27 |
| Mediterranean | ~8 | ~10 | ~14 | ~32 |
| Any | ~4 | ~1 | ~4 | ~9 |
| **Total** | **~44** | **~49** | **~68** | **161** |

### Server-Side Filtering (`/api/recipes-for-cart`)

```javascript
// 1. Filter by cuisine (case-insensitive)
if (!selectedCuisines.includes(r.cuisine.toLowerCase())) skip;

// 2. Filter by avoid items
if (r.avoid.some(a => avoidItems.includes(a))) skip;

// 3. Strict slot enforcement (raised cap: 30 per slot)
// Slot: breakfast | lunch | dinner
// any-cuisine recipes go to breakfast pool only if they match BREAKFAST_ANY_KEYWORDS

// 4. Side dish blocklist — never serve as standalone meal
const SIDE_DISH_BLOCKLIST = new Set(['potato salad', 'succotash', ...]);

// 5. NOT_BREAKFAST blocklist — dinner-only dishes that slip through
const NOT_BREAKFAST = new Set(['gallo pinto', 'congee', ...]);
```

**Critical bug that was fixed:** The old server used `r.name` but the JSON uses `r.title`. Blocklists must reference `r.title`.

**Critical bug that was fixed:** Cuisine filter was case-sensitive — `r.cuisine` must be lowercased before comparing.

### Client-Side Deduplication (`buildWeekCards`)

```javascript
// Per-week tracking
const weeklyUsed = {};  // Set per week index

// Scoring (lower = preferred)
score = (weekUse * 10000) + (globalUse * 5000) + (position + day * PRIME) % poolSize

// Title-similarity check — first two words
// Prevents "Congee" + "Congee with Toppings" in same week
```

Penalty weights:
- Same dish same week: **10,000 points**
- Same dish across weeks: **5,000 points**

### Leftover Logic

| Setting | Behavior |
|---------|----------|
| `yes` | Leftover day every other day (`d % 2 === 1`) |
| `sometimes` | Leftover day every 3rd day (`d % 3 === 2`) |
| `no` | No leftover days — fresh meal every slot |

### Breakfast Pool Split

`cuisine: "any"` recipes are split before pool assignment:
- If recipe title matches `BREAKFAST_ANY_KEYWORDS` (`['oatmeal','oats','porridge','scramble','egg','banana','potato breakfast']`) → goes into breakfast-any pool
- Otherwise → goes into dinner/lunch pool

This prevents oatmeal showing up at dinner and congee at breakfast.

---

## 8. Cart & Meal Logic — Implementation Reference

### 4-Phase Budget Optimizer

Built once at calculation time. **Do not collapse into a single loop** — phase separation is intentional.

```
Phase 1 → Survival floor      (40% budget cap)   rice, drybeans, oil, oats
Phase 2 → Cuisine boost        (10% budget cap)   culturally coherent flavor base
Phase 3 → USDA weighted fill   (remaining budget) proportional by food category
Phase 4 → Staple scale-up      (every remaining dollar ≥ $0.50)
```

**Phase 1 floor items:** `rice`, `drybeans`, `oil`, `oats`. If budget exhausted here, Phases 2–3 skipped (survival mode).

**Phase 2 cuisine boosts:**
```javascript
const CUISINE_BOOSTS = {
  american:      ['eggs','bread','potatoes','butter','milk'],
  latin:         ['tortillas','onions','garlic','cannedtomatoes','salsa'],
  asian:         ['soy','garlic','onions','cabbage','rice'],
  southern:      ['cornmeal','sweetpotatoes','onions','garlic','cannedtomatoes'],
  mediterranean: ['oliveoil','lentils','onions','garlic','cannedtomatoes'],
  any:           ['onions','garlic','cannedtomatoes'],
};
```

**Phase 3 USDA weights:**
```javascript
const USDA_WEIGHTS = {
  grain: 0.20, protein: 0.23, vegetable: 0.14,
  fruit: 0.10, dairy: 0.16, fat: 0.07, pantry: 0.10,
};
```

### Meal Chip Swap System

Global state:
```javascript
const mealChoices = {};   // "weekIdx-dayIdx-slot" → chip id
const mealPlan    = {};   // "weekIdx-dayIdx-slot" → active meal object
const mealOptions = {};   // "weekIdx-dayIdx-slot" → { 0: meal, 1: discover }
let   activePrices = {};  // regional prices from BLS, used for swap add
```

`swapMealIngredients(oldMeal, newMeal)` runs on every chip click:
1. Builds `mealFoods` cache (all ingredient IDs referenced by any meal)
2. Counts `refCount` across active plan
3. Adds new meal ingredients to cart if not present
4. Audits cart — removes meal-dependent items with zero references

**Known limitation:** Deselecting a meal doesn't reallocate the freed dollar value. Accepted trade-off to avoid cart thrashing.

### Post-Output Actions

| Button | Mechanism |
|--------|-----------|
| ✉ Send List | `emailList()` — hidden `<a>` with `mailto:` href |
| ⎋ Share | `shareList()` — `navigator.share()` with clipboard fallback |
| ⎙ Print | `window.print()` — `@media print` hides sidebar, expands cards |
| 🗂 Resources | Static link to `/resources` |

### Shopping List Checkbox Live Totals

- Nothing checked → full total only
- Some checked → `$X.XX in cart · $Y.YY left`
- All checked → `✓ All items in cart` (forest green)

---

## 9. Data Sources

| Source | What | Endpoint |
|--------|------|---------|
| BLS Average Retail Food Prices | Regional grocery prices | `api.bls.gov/publicAPI/v2/timeseries/data/` |
| Census ACS 5-Year (2022) | SNAP households, poverty rate, median income by zip | `api.census.gov/data/2022/acs/acs5` |
| USDA Thrifty Food Plan | $5.36/person/day poverty threshold | Reference value |
| USDA FNS | $6.22/person/day max SNAP benefit (FY2024) | Reference value |
| Congress.gov API | Senate member roster by state | `api.congress.gov/v3/member` |
| OpenStates v3 | State-level food/SNAP bills | `v3.openstates.org/bills` |
| Internal recipe DB | 161 curated recipes | `data/seed-recipes.json` |

### Tracked Legislation

| Bill | D | R | Effect |
|------|---|---|--------|
| H.R.1 "One Big Beautiful Bill" | NO | YES | ~3M households lose SNAP |
| SNAP Work Requirement Expansion | NO | YES | Requirements to age 64 |
| FY2025 CR — TEFAP Food Assistance | YES | YES | Maintained food bank supply |

---

## 10. Donation Infrastructure

### Placement Philosophy

Two locations only — both earned, neither interruptive:
1. **Header** — quiet pill button, present from load but understated
2. **Shopping list sidebar** — below utility action buttons, after full value delivered

**Never** surface donation between dashboard and meal plan.

### Stripe Integration

- SDK: `https://js.stripe.com/v3/` loaded with `defer`
- Publishable key: `pk_live_51Thuf...` — safe in frontend
- Price ID: `price_1ThuuEPo7HmLEBd46gDEuDma` — one-time $5
- Payment link fallback: `https://buy.stripe.com/28EcN7giU7JS6LM53kfQI00`
- **No PayPal** — removed. Peter Thiel involvement conflicts with project values.
- Apple Pay / Google Pay activate automatically via Stripe.

### Donation CSS

```
.donation-eyebrow  — Plus Jakarta Sans 700 uppercase, #5A6E61
.donation-headline — Lora 600, forest green, italic on <em>
.donation-body     — Plus Jakarta Sans 0.82rem, var(--ink3)
.stripe-btn        — #635BFF Stripe purple (intentionally off-brand — signals payment processor)
```

`#635BFF` is the **only** non-brand color used intentionally. Do not replace with gold or forest green.

---

## 11. API Keys (Render Environment Variables)

| Variable | Service | Notes |
|----------|---------|-------|
| `CENSUS_KEY` | Census Bureau ACS | Must activate via email after signup at api.census.gov/data/key_signup.html |
| `BLS_KEY` | Bureau of Labor Statistics | Falls back to hardcoded prices without it |
| `CONGRESS_KEY` | api.congress.gov | Falls back gracefully |
| `OPENSTATES_KEY` | OpenStates v3 | State bills section |
| `SUPABASE_URL` | Supabase PostgreSQL | Format: `https://[project-id].supabase.co` — no trailing slash, no `/rest/v1/` |
| `SUPABASE_KEY` | Supabase service role key | Use the **legacy service_role JWT** (starts with `eyJ...`), NOT the new `sb_secret_...` key — new format doesn't work with PostgREST |
| `STATS_KEY` | Internal analytics | Any passphrase you choose — protects `/api/stats` endpoint |

No `DEMO_KEY` fallback. If `CENSUS_KEY` is unset, server attempts keyless request (~500/day free).

---

## 12. Phase 6 — Event Logging System

### Architecture

Anonymous behavioral events flow: `frontend (data-event attr)` → `POST /api/event` → `server.js validates` → `Supabase REST API` → `events table`.

The system is **fire-and-forget** — events never block the UI. All failures are silent to the user. All validation is server-side.

### Session Token

```javascript
const SESSION_ID = Math.random().toString(36).slice(2,8) +
                   Math.random().toString(36).slice(2,8);
```

Generated once per page load. 12 lowercase alphanumeric characters. Lives only in JS memory — gone when tab closes. Never stored in a cookie, localStorage, or sent to any third party. Links events from the same session without identifying anyone.

### Auto-Capture Pattern

A single delegated click listener handles most events automatically:

```javascript
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-event]');
  if (!el) return;
  logEvent(el.dataset.event, {
    zip:      answers.zip || null,
    item:     el.dataset.item     || null,
    retailer: el.dataset.retailer || null,
  });
}, { passive: true });
```

**To track any new element:** add `data-event="event_name"` to the HTML. No JavaScript changes needed.

Optional data attributes: `data-item`, `data-retailer`.

### Manual `logEvent()` calls

Only used when computed context is needed (budget tier, cuisine, pppd). Currently only `budget_entered` uses this — all other events use auto-capture.

### Events Table Schema

```sql
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT        NOT NULL,
  zip         CHAR(5),
  item        TEXT,
  retailer    TEXT,
  budget_tier TEXT,
  session_id  CHAR(12),
  pppd        NUMERIC(5,2),
  people_tier TEXT,
  days_tier   TEXT,
  budget      NUMERIC(8,2),
  people      SMALLINT,
  days        SMALLINT,
  stores      TEXT,
  avoid       TEXT,
  leftover    TEXT,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### All Tracked Events

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `budget_entered` | Plan generated | zip, pppd, budget, people, days, stores, avoid, leftover, cuisine (item), tiers |
| `meal_swapped` | User clicks a meal chip | zip, item=`default` or `discover` |
| `item_checked` | Checkbox in shopping list | zip, item (food id) |
| `brand_clicked` | Brand comparison pill tapped | zip, item (food id) |
| `online_alt_clicked` | Online retailer link clicked | zip, item (food id), retailer (domain) |
| `recipe_opened` | 📖 icon on meal chip | zip |
| `accordion_opened` | Any accordion section opened | zip, item (accordion id) |
| `week_opened` | Week card expanded | zip, item (`week_0`, `week_1`, etc.) |
| `preference_selected` | Store/avoid/have tag toggled | item (group: `store`/`avoid`/`have`), retailer (value: `walmart`, `gluten`, etc.) |
| `price_correction_opened` | "Tap to correct" on brand card | zip, item (food id) |
| `price_correction_saved` | User submits corrected price | zip, item (food id) |
| `list_emailed` | Email list button | zip |
| `list_shared` | Share button | zip |
| `list_printed` | Print button | zip |
| `snap_screener_clicked` | SNAP screener link in Get Help | zip, item=`snap` |
| `foodbank_clicked` | Food bank link in Get Help | zip, item=`foodbank` |
| `resource_clicked` | Other resource links (WIC, school meals, etc.) | zip, item (resource key) |
| `restarted` | Start over button | zip |

### Server-Side Validation

Every field is validated against a strict allowlist before reaching the database:

```javascript
VALID_EVENTS    — 19 known event types, anything else → 400
VALID_ITEMS     — food IDs from FOOD_DB + preference group names
VALID_RETAILERS — store names + preference tag values (gluten, corner, etc.)
VALID_BUDGET_TIERS — low / medium / high
SESSION_ID_RE   — /^[a-z0-9]{12}$/ exactly
budget          — number, 0–10000, rounded to 2 decimal places
people          — integer, 1–20
days            — integer, 1–365
pppd            — rounded to nearest $0.25
```

### Rate Limiting

In-memory per-IP: 60 events per 10-minute window. Resets automatically. Cleaned up every hour to prevent memory growth. Returns 429 if exceeded.

### Supabase Setup

Database: PostgreSQL via Supabase (Apache 2.0, open source).

Row Level Security — both SELECT and INSERT blocked for anon/publishable keys. Only the service role key (server-side) can write. No client can ever read raw rows.

SQL files (run in Supabase SQL Editor in order):
1. `supabase_setup.sql` — creates events table + RLS policies
2. `supabase_add_session.sql` — adds session_id column
3. `supabase_add_pppd.sql` — adds pppd, people_tier, days_tier columns + rebuilds views
4. `supabase_add_all_fields.sql` — adds budget, people, days, stores, avoid, leftover columns

### Views

**`event_summary`** — aggregate counts by event/zip/budget_tier/day. Safe to expose via `/api/stats`.

**`session_summary`** — one row per session showing full journey: event sequence array, which resources were clicked, items checked, meals swapped, price corrections. Never exposes individual event rows.

### Analytics Endpoint

```
GET /api/stats?key=YOUR_STATS_KEY
```

Returns `event_summary` rows — aggregates only, never raw events. Protected by `STATS_KEY` env var.

### What Is Never Stored

- IP address
- Device ID or browser fingerprint
- Session ID linkable across page loads (new ID every load)
- Exact budget amount beyond $0.25 rounding on pppd
- Any sequence linkable to a real person across sessions

### Key Debugging Notes

- **`sb_secret_...` key format doesn't work** with Supabase PostgREST (Data API). Must use the legacy `service_role` JWT from Settings → API Keys → Legacy tab.
- **Supabase URL must be `.supabase.co` not `.supabase.com`** — the marketing site is `.com`, the database endpoints are `.co`.
- **`multiSelections` must be assigned to `answers` before `logEvent`** in `runCalculation()` — otherwise `stores` and `avoid` are always null.
- **`mealChoices[key]` must be read before being overwritten** in `chooseMeal()` — otherwise `prevChoice` is always defined and the discover/default detection breaks.
- **`preference_selected` uses `item` for group name and `retailer` for value** — not `item` for the full `group:value` string, because `item` is validated against food IDs only.

---

## 13. About Page (`/about`)

The about page shares the exact same header, footer, and CSS token system as `index.html`. It is a standalone HTML file served at `/about` via Express.

### Matches index.html exactly

- Same `<header>` — Benjamin Franklin image, Playfair Display h1, "Make It Stretch" with italic em, the Franklin quote, eyebrow nav, "Support This Tool" pill (links directly to Stripe payment link since `launchStripe()` is not available outside index.html)
- Same `<footer>` — IBM Plex Mono, `--bg2` background, same link hover → gold
- Same full `:root` CSS variable block
- Same Google Fonts import (Playfair / Lora / Jakarta / Mono)

### Page-specific styles

```css
.page-eyebrow   — IBM Plex Mono 10px uppercase, var(--ink3) — "Make It Stretch · getdealtin.com"
h1.page-title   — Lora 36px 700, var(--ink) — "About & Data Sources"
.page-lead      — Lora 16px, var(--ink2), border-left: 3px solid var(--gold)
h2              — IBM Plex Mono 10px 700 uppercase, var(--gold) — section labels
h3              — Plus Jakarta Sans 16px 700, var(--ink) — source card titles
.source-card    — border: 1px solid var(--border2), border-radius: 10px, background: var(--bg2)
.source-meta    — IBM Plex Mono 10px uppercase, var(--ink3) — source attribution line
.callout-warning — background: var(--gold-dim), border: 1px solid var(--amber-border)
.callout-info   — background: var(--green-bg), border: 1px solid #B8CDB8
.divider        — 1px solid var(--border2)
```

### Content sections

1. **Food Prices** — BLS Average Retail Food Prices, regional breakdown, limitation callout
2. **Meal Plan & Recipes** — Two paragraphs: (1) USDA Thrifty Food Plan food group proportions as the basis for ingredient selection and budget allocation — same proportions used to calculate SNAP; (2) 161-recipe curated database, six cuisines, rule-based matching, no AI
3. **Community Data** — Census ACS 5-year variables listed by code (B22010, B17001, B19013, etc.), limitation callout (2018–2022 vintage, ZCTA vs USPS mismatch)
4. **Federal Poverty Benchmarks** — USDA Thrifty Food Plan $5.36/day, USDA FNS SNAP max $6.22/day
5. **Legislative Votes** — Three bills explained, Congress.gov source, vote attribution note, OpenStates
6. **Food Assistance Resources** — Six official federal/national links
7. **What We Don't Do** — No AI, no data storage, no advertising

### Key content decision — recipes section

The recipe section explains the *why* behind ingredient choices without exposing implementation. The framing is:
> "The ingredients and food categories are grounded in the USDA Thrifty Food Plan — the same food group proportions used to calculate SNAP benefit amounts."

This is accurate and gives institutional credibility without describing the 4-phase optimizer in user-facing copy.

---

## 14. Are.na Resource Page

`/resources` page pulls from Are.na API via `/api/arena-resources`. No key required for public channels. Channel slug set via `ARENA_CHANNEL_SLUG` env var.

Fallback: 10 hardcoded resources if API unavailable.

Domain → category mapping in `DOMAIN_CATEGORIES` lookup — add entries as channel grows.

### Resource Card Anatomy

- `.card-thumb` — 156px tall, `object-fit: cover`
- `.card-domain` — IBM Plex Mono 9px uppercase
- `.card-title` — Lora 700 15px
- `.card-desc` — Plus Jakarta Sans 13px `var(--ink2)`
- `.card-footer` — "Visit →" in Warm Ochre

---

## 15. Shopping List Sticky Sidebar Layout

```
.shopping-list-container  — display:flex, gap:28px, align-items:flex-start
.list-sidebar             — position:sticky, top:20px, width:260px, flex-shrink:0
.list-content             — flex:1, min-width:0
```

**`align-items: flex-start` is non-negotiable** — without it sticky has no room to scroll.

Mobile (≤780px): single column, `list-sidebar` goes `position:static`.

Print: `.list-sidebar` hidden via `@media print`.

---

## 16. CSS Architecture Notes

- All design tokens in `:root` at top of `<style>` block
- Hardcoded hex values used intentionally for context-specific colors (sidebar, hover tints)
- `overflow: hidden` on `.intake-card` and `.system-pulse` intentional (prevents border-radius clipping)
- `--gold-mid` token referenced in `.week-badge` doesn't resolve — safe to ignore (badge rarely renders)

---

## 17. What Not To Do

- Don't use Playfair Display outside the hero h1
- Don't use Lora for meal chip names — they are user choices (Plus Jakarta Sans 700)
- Don't add `font-family: Lora` to `.week-title` (Mon–Sun) — it should inherit Plus Jakarta Sans
- Don't use gold (`#D9822B`) as a background color
- Don't use the raw dark red/green (`--red`/`--green`) for vote labels on dark sidebar cards — use `#f87171`/`#5db87a`
- Don't add `cuisine: "any"` unless the dish genuinely works across all cuisine contexts
- Don't add side dishes as standalone meal slots
- Don't use "you are" language in copy — use "this budget," "this plan," "right now"
- Don't omit the `<span class="meal-chip-name">` wrapper — plain chip text will look thin/light
- Don't set `week-body` without `background: var(--bg)` — the card will look flat
- Don't use `--border` for week card edges or day-row dividers — use `--border2`
- Don't let `catch(e){}` swallow Census API errors silently — always call `populateSystemPulse()` in every code path

---

## 18. Phase Roadmap

### Done
- Full walkthrough UI (5 steps)
- 4-phase budget optimizer
- Regional BLS price fetching
- Meal plan generator (161 recipes, 6 cuisines, slot enforcement, deduplication)
- Recipe drawer with ingredients + instructions
- Shopping list with brand comparisons and price corrections
- "You're Not Alone" solidarity section (Census data)
- Civic accordion: senator vote cards, bill details, OpenStates
- "Where You Stand" sticky sidebar — community data + senator votes
- WCAG AA contrast compliance throughout sidebar
- Leftover day logic (yes/sometimes/no)
- Mobile responsive layout
- About page (`/about`) with full data methodology
- Resources page (`/resources`) via Are.na API

### Up Next
- PostgreSQL/Supabase event logging — `logEvent(type, data)` helper, events table with RLS
- `/why` context page — what SNAP is, what cuts mean, how to read vote records
- Substack — two registers (practical posts for families, policy pieces for funders)
- Community intelligence — surface aggregate zip-level insights back to users

---

*Na · Native · Narrative · getdealtin · 2026*
