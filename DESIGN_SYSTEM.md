# Make It Stretch — Design System Reference
**getdealtin · Margin Ventures LLC · 2026**

This document captures every intentional design decision made during the UI build. Read this before adding any new feature so the visual language stays consistent.

---

## 1. The Design Philosophy

The tool serves two emotional states simultaneously:

- **Left/main column:** Stability, dignity, immediate utility — a workspace for someone stressed about money
- **Right/sidebar column:** Intellectual weight, data-driven authority — editorial journalism about why the crisis exists

Every design choice is in service of this split. The user manages their survival on the left. The right tells them the truth about why they're in that position.

---

## 2. Color Palette — "Grounded Resilience"

### CSS Custom Properties (defined in `:root`)

| Token | Value | Role |
|-------|-------|------|
| `--ink` | `#1B3624` | Deep Forest — primary text, hierarchy |
| `--ink2` | `#3E4A42` | Slate Grey — secondary text, data |
| `--ink3` | `#6b7a70` | Muted Sage — tertiary/hint text |
| `--ink4` | `#9aaa9f` | Faint Sage — disabled/placeholder |
| `--bg` | `#FAF8F5` | Warm Cream — page canvas |
| `--bg2` | `#F3F0EB` | Deeper Cream — card surfaces |
| `--bg3` | `#EAE6DF` | Hover/pressed state |
| `--border` | `#DDD9D1` | Warm grey border |
| `--border2` | `#C8C4BC` | Stronger border |
| `--gold` | `#D9822B` | **Warm Ochre — THE accent. Use sparingly.** |
| `--green` | `#1B3624` | Forest green — confirmed/positive |
| `--green-bg` | `#EEF3EE` | Soft green tint |
| `--red` | `#b83c2b` | Terracotta — alerts, warnings |
| `--blue` | `#2a5c8a` | Slate blue — links only |

### Named Values (used directly in CSS, not via tokens)

| Value | Where used |
|-------|-----------|
| `#25332B` | Midnight Juniper — sidebar/pulse card background |
| `#35473D` | Sidebar internal borders/dividers |
| `#5A6E61` | Form section label color (step-label) |
| `#4A5D50` | Soft juniper — form section anchors |
| `#718276` | Muted grey-green — stat labels, meal slot labels |
| `#EDE8DF` | Hover tint for interactive elements on cream |
| `#eef3ee` | Selected "have" tag, chosen meal chip |
| `#3a7a50` | Active forest green border |

### Application Rules

- **Warm Ochre `#D9822B`** is the system alert color. Used for: progress bar, CTA buttons, WEEK tags, selected store tags, live data highlights in sidebar. Never use it decoratively.
- **Deep Forest `#1B3624`** anchors text hierarchy. Selected food tradition cards go full `#1B3624` background with white text — a declaration, not a highlight.
- **Midnight Juniper `#25332B`** is *exclusively* for the political/systemic context column (desktop sidebar + mobile pulse card). Nothing else on the light canvas should use it.
- **Pure white (`#fff`)** appears only on meal chips (lifted card effect) and button text on dark backgrounds.

---

## 3. Typography System

### Font Stack

| Font | Role | Never use for |
|------|------|---------------|
| **Playfair Display** | Header title only ("Make It Stretch") | Anything outside the hero header |
| **Lora** | Editorial serif — section headings, question text, impact summaries, political content | UI controls, data, labels |
| **Plus Jakarta Sans** | UI Anchor — buttons, labels, tags, body copy, navigation signposts | Section headings, emotional moments |
| **IBM Plex Mono** | Data only — budget numbers, prices, stat values, monospace codes | Any flowing text |

### The Three-Brain Rule

The user's brain reads each font differently:

1. **Uppercase tracked Plus Jakarta Sans** → "Where am I in the system" (step trackers, WEEK 1, BREAKFAST, tier badges)
2. **Sentence-case Plus Jakarta Sans** → "My data, my choices" (button labels, item names, body copy)
3. **Lora serif** → "The truth about what's happening outside" (section headers, Know Your System, vote impact summaries)

### Type Scale Reference

| Element | Font | Size | Weight | Transform | Tracking |
|---------|------|------|--------|-----------|---------|
| Step eyebrow ("STEP 3 OF 5") | Plus Jakarta Sans | 0.75rem | 700 | uppercase | 0.14em |
| Step question | Lora | 22px | 700 | none | -0.3px |
| Section heading (h2) | Lora | 22px | 700 | none | -0.3px |
| Accordion title | Lora | 16px | 700 | none | -0.2px |
| Summary/game plan title | Lora | 1.75rem | 600 | Title Case | -0.01em |
| Sidebar headline ("Why Your Groceries...") | Lora | 1.05rem | 600 | none | normal |
| WEEK label | Plus Jakarta Sans | 0.8rem | 800 | uppercase | 0.1em |
| DAY name (MON, TUE) | Plus Jakarta Sans | 0.7rem | 800 | uppercase | 0.1em |
| BREAKFAST/LUNCH/DINNER | Plus Jakarta Sans | 0.7rem | 700 | uppercase | 0.08em |
| Form section label | Plus Jakarta Sans | 0.75rem | 700 | uppercase | 0.12em |
| Stat value ($0.72) | IBM Plex Mono | 22px | 500 | none | — |
| Stat label (PER MEAL) | Plus Jakarta Sans | 0.65rem | 700 | uppercase | 0.05em |
| Tier badges (ESSENTIAL) | Plus Jakarta Sans | 0.65rem | 700 | uppercase | 0.06em |
| Shop price | IBM Plex Mono | 15px | 700 | none | — |
| Rep name | Lora | 18px | 700 | none | -0.3px |
| Vote pill (VOTED YES) | Plus Jakarta Sans | 0.65rem | 800 | uppercase | 0.08em |
| Vote impact line | Lora | 13px | 400 | italic | — |
| Sidebar body text | Lora | 15px | 400 | italic | — |
| Eyebrow tag ("◆ CIVIC BUDGET TOOL") | Plus Jakarta Sans | 0.85rem | 700 | uppercase | 0.12em |

---

## 4. Layout Architecture

### Desktop: Dual-Narrative Grid

```
+----------------------------------------------+------------------+
|  LEFT/CENTER: SURVIVAL TOOLS                 | RIGHT: SYSTEM    |
|  (Warm Cream #FAF8F5)                        | (Juniper #25332B)|
|                                              |                  |
|  Summary Dashboard                           | Why Your         |
|  Meal Game Plan                              | Groceries Cost   |
|  ↓ Accordion: Shopping List                  | This Much        |
|  ↓ Accordion: Brand Comparisons              |                  |
|  ↓ Accordion: Know Your System               | Pulse stats      |
|  ↓ Accordion: Get Help                       | Policy alert     |
|                                              | Local realities  |
|                                              | → CTA button     |
+----------------------------------------------+------------------+
```

CSS: `.dash-grid { display: grid; grid-template-columns: 1fr 340px; }`

Breakpoint: `@media(max-width:900px)` — sidebar hides, mobile System Pulse card appears inline after meal plan.

### Mobile: Trojan Horse Scroll (3-Act)

1. **Act I — Dashboard** (summary card + stats)
2. **Act II — Meals** (week cards, interactive)
3. **Subversive pivot** — Mobile System Pulse dark card slides in
4. **Act IV — Utility accordions** (shopping list open by default, rest collapsed)

### Intake Form: Max-Width 780px (centered)

The intake lives in `.intake-wrap { max-width: 780px; margin: 0 auto; }` — narrower than the dashboard grid.

---

## 5. Interactive Component Rules

### Buttons

**Primary CTA (`btn-primary`):** Warm Ochre `#D9822B`, white text, Plus Jakarta Sans 700, UPPERCASE, `0.08em` tracking. Used for: Continue →, Build My Game Plan, Save, Full voting record.

**Back button (`btn-back`):** No background, `--ink2` text. Never styled as a primary action.

### Food Tradition Cards (`option-btn`)

Large 2-column grid. Unselected: `--bg2` background, `--border` border. **Selected: solid `#1B3624` background, white text.** This is the strongest selected state in the app — identity-level choices get a full commitment visual.

### Pill Tags (`tag-btn`) — Store / Avoid / Have

Flex-wrap, `border-radius: 20px` pills. Three distinct selected states by semantic type:
- **Store tags** → Ochre `#D9822B`, white text ("active tool choice")
- **Avoid tags** → Deep Forest `#1B3624`, white text ("hard filter/constraint")
- **Have tags** → Sage `#eef3ee`, forest green text/border ("adding to pantry")

Have tags use `+` prefix in label text (e.g., `+ Rice`) to signal additive action.

### Meal Chips (`meal-chip`)

No border. White background with soft shadow (`0 1px 4px` + `1px ring`). Lifts off the cream canvas. On hover: slight translateY(-1px). Chosen: solid green ring (`0 0 0 2px #3a7a50`).

**Discover chips** (new cuisine option): Muted sage `#f0f4f1` / `#4A5D50` — reads as "interesting" not "clickable link." NOT blue.

**Leftover chip:** Sage `#eef3ee` background, solid (no dashes), `↻` icon via CSS `::before`, 700 weight. Celebrates leftovers as smart, not placeholder.

### Accordions

`.accordion-section` — collapsed by default (`.accordion-body { display: none }`). Shopping list opens automatically after results load. Civic accordion is visible on all screen sizes — `acc-civic` on desktop gives the full rep/vote detail that the sidebar CTA links to.

### Policy Micro-Cards (`means-item`)

Left border only (4px), zero right border. Three states:
- `item-against`: `#b83c2b` border, `#fdf0ec` background
- `item-for`: `#3a7a50` border, `#f0f5f1` background
- `item-neutral`: `--border2` border, `--bg2` background

Tag badge: Plus Jakarta Sans 800, UPPERCASE. Bill name: Plus Jakarta Sans 700. Impact text: Lora italic. This is the typography split between official action and human consequence.

### Vote Pills (`vote-pill`)

**Solid filled, not outline:** `VOTED YES` = `#b83c2b` background, white text. `VOTED NO` = `#3a7a50` background, white text. No ambiguity.

### Shopping List Tips

Tips live **inline** under relevant items (`.shop-tip`), not in a standalone block. The `ALL_TIPS` array maps via `needs[]` arrays to `item.id` values. Each tip's emoji is split into `.shop-tip-icon` span. Color: `#5A6E61`.

### Stat Cards

Five metrics in `.stats-row`. Desktop: flex-wrap. Tablet (≤900px): 3-column CSS grid. Mobile (≤480px): 2-column grid. Labels use Plus Jakarta Sans 700 uppercase `#718276` so numbers dominate.

---

## 6. The System Pulse Sidebar

The dark column is a self-contained visual universe. Everything inside uses this palette:

| Element | Value |
|---------|-------|
| Background | `#25332B` Midnight Juniper |
| Internal borders | `#35473D` |
| Section headers | `#FFFFFF` pure white (Lora serif) |
| Body text | `rgba(250,248,245,.9)` |
| Data highlights | `#D9822B` Warm Ochre |
| Policy alert bg | `rgba(184,60,43,.12)` |

The `pulse-hook` (italic Lora quote) sets the editorial tone before the data. The CTA button uses `rgba(217,130,43,.18)` background with ochre border — glows on the dark surface.

On mobile, the same exact color story applies to `.mobile-system-pulse` — same `#25332B`, same `#35473D` borders, same typography.

---

## 7. CSS Architecture Notes

- All design tokens live in `:root` at the top of the `<style>` block
- Hardcoded hex values are used *intentionally* when they're context-specific (sidebar colors, hover tints) and shouldn't inherit from the global token system
- The `--gold-mid` token referenced in `.week-badge` doesn't resolve — safe to ignore (badge rarely renders)
- Hover tint for interactive elements on cream canvas: `#EDE8DF`
- `overflow: hidden` on `.intake-card` and `.system-pulse` is intentional (prevents border-radius clipping)

---

## 8. What to Build Next

### Phase 1c — Context Page *(remaining from Phase 1c)*

A dedicated `/context` or `/why` page linked from the sidebar CTA. Explains:
- What SNAP is and what the current cuts mean
- Why the USDA survey was discontinued
- Where getdealtin's data comes from
- How to read the voting records

Design: same cream canvas, Lora headings, editorial tone.

### Are.na Resource Page (Phase 4)

A `/resources` page pulling from the Are.na API. Each link renders as a card — same `.resource-card` pattern already in the Get Help section. Add to the post-output "Meal Prep Resources" CTA (already linked to `are.na/erin-relford/make-it-stretch-recipes`).

### Zip Code Behavioral Logging (Phase 6)

When the PostgreSQL/Supabase event database is stood up, the frontend needs to fire anonymous events. The event shape is already defined in the build plan:

```json
{ "zip": "78745", "event": "online_alt_click", "item": "rice", "retailer": "amazon" }
```

Events to track: budget tier entered, food items in cart, brand comparisons clicked, online vs. local selections, post-output actions taken (email/share/print/recipe).

Design impact: none visible to user. Add a `logEvent(type, data)` helper function in the script block.

### Live Context Sidebar (Phase 7)

The sidebar pulse stats are currently hardcoded (`47M+`, `$6`, `13%`). When the PostgreSQL database has real data, replace with a `/api/pulse-stats` endpoint that returns live values. The `populateSystemPulse()` function already accepts these as parameters — just swap the hardcoded array.

---

## 9. Fonts Reference (Google Fonts Import)

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

DM Sans has been fully removed. Do not re-add it.

---

## 10. Cart & Meal Logic — Implementation Reference

This section documents the full interactive logic layer. Read before modifying anything in the shopping list, meal plan, or cart.

---

### 10.1 The 4-Phase Budget Optimizer

The cart is built once at calculation time using four sequential phases. **Do not collapse these into a single loop** — the phase separation is what gives the tool its philosophical coherence.

```
Phase 1 → Survival floor      (40% budget cap)
Phase 2 → Cuisine boost        (10% budget cap)
Phase 3 → USDA weighted fill   (remaining budget)
Phase 4 → Staple scale-up      (every remaining dollar)
```

#### Phase 1 — Nutritional Floor (40% of budget max)

Buys `rice`, `drybeans`, `oil`, `oats` first, unconditionally. Guarantees a calorie-safe baseline regardless of cuisine or budget size. These four together cover the minimum survival requirement the tool is built around.

**Edge case:** If Phase 1 exhausts the full budget (tiny budget, e.g. $10), Phases 2 and 3 are skipped entirely. The tool defaults to pure survival mode. Gate: `if(remaining > 0.50)`.

**Dietary restrictions:** `getFood(id)` calls `foods.find()` on a pre-filtered array. If a floor item is excluded by `avoidItems` (e.g. oats for gluten-free), it returns `undefined` and is silently skipped. No additional filter needed.

#### Phase 2 — Cuisine Boost Package (10% of budget max)

Locks in a culturally coherent flavor base before general filling. Maps to the user's intake form selection:

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

Items already in cart from Phase 1 are skipped (`!cart.find(c=>c.id===id)` check). Dietary restrictions respected automatically — `getFood()` returns `undefined` for restricted items.

#### Phase 3 — USDA Thrifty Food Plan Weighted Fill

Allocates remaining budget proportionally across food categories using actual USDA market-basket breakdown:

```javascript
const USDA_WEIGHTS = {
  grain:     0.20,
  protein:   0.23,
  vegetable: 0.14,
  fruit:     0.10,
  dairy:     0.16,
  fat:       0.07,
  pantry:    0.10,
};
```

This mirrors the proportions used to calculate SNAP benefits — gives the tool institutional credibility. Items already in cart are skipped. All `avoidItems` restrictions respected via the pre-filtered `foods` array.

#### Phase 4 — Staple Scale-Up

Spends every remaining dollar (≥ $0.50) on tier-1 items, scaled to timeline. `daysMultiplier = Math.max(1, Math.floor(days/7))`. Max quantities: `tier-1: max(8, multiplier*4)`, `tier-2: max(4, multiplier*2)`. Loops up to 200 iterations.

---

### 10.2 Meal Chip Swap System

Meal chips are fully interactive — selecting a different chip updates the shopping list in real time.

#### Global State Variables

```javascript
const mealChoices = {};  // key: "dayIdx-slot" → currently chosen chip DOM id
const mealPlan    = {};  // key: "dayIdx-slot" → full meal object currently active
const mealOptions = {};  // key: "dayIdx-slot" → { 0: mealObj, 1: mealObj, 'd': discoverObj }
let   activePrices = {}; // resolved regional prices — populated in runCalculation, used by swap
```

#### On Initial Render (`buildWeekCards`)

For every day/slot, the first chip is pre-selected as default:
- `mealOptions[key]` stores all available meal objects indexed by chip position
- `mealPlan[key]` is set to `slotData.opts[0]` (first option)
- `mealChoices[key]` is set to the first chip's DOM id
- First chip gets `.chosen` class in HTML

#### On Chip Click (`chooseMeal`)

**Deselect (clicking already-chosen chip):**
```javascript
oldMeal = mealPlan[key];
mealPlan[key] = null;
swapMealIngredients(oldMeal, null);  // runs full audit with slot now empty
```

**Select new chip:**
```javascript
newMeal = mealOptions[key][optIdx];  // integer or 'd' for discover
oldMeal = mealPlan[key];
mealPlan[key] = newMeal;
swapMealIngredients(oldMeal, newMeal);
```

#### The Swap Audit (`swapMealIngredients`)

Runs on every chip interaction. Three operations in order:

**1. Build `mealFoods` cache (once)**
Set of every food ID referenced by any meal in `MEAL_LIBRARY` or `DISCOVER_MEALS`. Determines which cart items are "meal-dependent" vs pure budget staples.

**2. Count `refCount` across entire active plan**
Iterates all `Object.values(mealPlan)`, counting how many active meals reference each food ID. `mealPlan[key]` is already updated before this runs, so counts are always current.

**3. Add new meal's ingredients (if selecting)**
For each ID in `newMeal.needs`: if not in cart, look up in `FOOD_DB` and add using `activePrices[id] || food.price || 1.00` as price fallback chain.

**4. Full cart audit (always)**
```javascript
cart = cart.filter(item => {
  if (!mealFoods.has(item.id)) return true;   // pure budget staple — always keep
  if (haveIds.has(item.id))    return true;   // user said they have it — keep
  return (refCount[item.id] || 0) > 0;        // meal-dependent — keep only if referenced
});
```

`haveIds` is built from `answers.have` mapped through `FOOD_DB.hasProp` — prevents removing items the user declared they already own.

#### Known Limitation

When a meal is deselected and an ingredient drops to zero references, that dollar value is **not reallocated**. The cart total becomes cheaper. The optimizer does not re-run on swaps — forcing a re-run would reset all quantities and create cart thrashing. This is an accepted trade-off.

---

### 10.3 Post-Output Actions

Four action buttons sit above the shopping list items inside the `acc-shopping` accordion body (`.post-output-actions`).

| Button | Function | Mechanism |
|--------|----------|-----------|
| ✉ Send List | `emailList()` | Creates hidden `<a>`, sets `href=mailto:?subject=...&body=...`, clicks it, removes it |
| ⎋ Share | `shareList()` | `navigator.share()` on mobile; clipboard fallback on desktop with `✓ Copied!` flash |
| ⎙ Print / PDF | `window.print()` | `@media print` stylesheet hides sidebar, intake, accordions; expands week cards |
| 🗂 Meal Prep Resources | Static `<a>` | Links to `are.na/erin-relford/make-it-stretch-recipes` |

`buildListText()` generates the plain-text list from `cart` — categorized, with quantities and prices. Always call this function to get current list state; do not read from the DOM.

---

### 10.4 Shopping List Checkbox Live Totals

Checkboxes update the total row in real time via `toggleCheck(id)`.

```javascript
// DOM ids
shop-total-val  → always shows full plan total
shop-total-sub  → hidden by default; shows "X in cart · Y left" when items are checked
```

States:
- Nothing checked → sub-line hidden, total shows full amount
- Some checked → `$X.XX in cart` (forest green, bold) `· $Y.YY left` (muted)
- All checked → `✓ All items in cart` (forest green)

---

*Na · Native · Narrative · getdealtin · 2026*
