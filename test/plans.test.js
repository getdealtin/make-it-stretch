// Plans as this site asks for them: its intake's choices (a few days to a month, 1 to 5+ people, every
// region, dollar and corner stores, foods left out, diets, foods on hand), all checked against the
// engine's 11 rules (engine/principles.js). The old "spend the full budget" behavior is gone: money left
// over is shown, never spent on piles of one food.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planMeals, rebuildList, resolvePrices, indexRecipes } from '../engine/index.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const recipes = [...indexRecipes(read('seed-recipes.json')), ...read('nih-recipes.json').recipes.map(({ es, key, ...r }) => r), ...read('simple-meals.json').recipes];

const CASES = [];
for (const region of ['northeast', 'midwest', 'south', 'west', 'national'])
  for (const [budget, people, days] of [[15, 1, 4], [40, 2, 7], [75, 3, 7], [120, 5, 7], [180, 2, 14], [450, 4, 30]])
    CASES.push({ region, budget, people, days });
const EXTRA = [
  { stores: ['dollar'] }, { stores: ['corner'] }, { avoid: ['pork'] }, { avoid: ['halal'] }, { avoid: ['kosher'] },
  { avoid: ['diabetic'] }, { avoid: ['low_sodium'] }, { avoid: ['gluten', 'dairy'] }, { avoid: ['meat', 'fish', 'eggs'] },
  { have: ['rice', 'beans', 'oil'] }, { cuisine: ['latin'] }, { cuisine: ['southern', 'asian'] }, { leftover: 'no' }, { leftover: 'yes' },
].map(x => ({ region: 'south', budget: 60, people: 2, days: 7, ...x }));

const run = c => planMeals({ cuisine: [], avoid: [], have: [], stores: [], leftover: 'sometimes', ...c }, resolvePrices(c.region, {}), recipes);

test('208 recipes: the 161 seed recipes, 25 NHLBI dishes and 22 simple meals', () => {
  assert.equal(recipes.length, 208);
  assert.equal(recipes.filter(r => Array.isArray(r.lines)).length, 25);
  assert.equal(recipes.filter(r => r.id >= 2001).length, 22);
});

test('every plan this site can ask for keeps all 11 rules', () => {
  for (const c of [...CASES, ...EXTRA]) assert.deepEqual(run(c).principles.failed, [], JSON.stringify(c));
});

test('leftover money is left over, not spent on piles of one food', () => {
  const r = run({ region: 'south', budget: 300, people: 2, days: 7 });
  assert.ok(r.remaining > 20, `$${r.remaining} left`);
  assert.ok(r.spent + r.remaining <= 300.01);
  for (const i of r.cart) assert.ok(i.qty <= 8, `${i.id} ×${i.qty}`);
});

test('a swap rebuilds the list and still keeps the rules that apply to one list', () => {
  const r = run({ region: 'west', budget: 70, people: 3, days: 7 });
  const keys = r.state.assigned.map(x => x.key).filter(k => r.state.altFor[`${k.split('-')[2]}:${r.state.assigned.find(x => x.key === k).rec.id}`]).slice(0, 3);
  const s = rebuildList(r.state, keys);
  assert.ok(s.cart.length > 0);
  assert.ok(s.spent <= 70 || s.overBudget > 0);
});

test('NHLBI dishes carry their printed amounts and credit', () => {
  for (const r of recipes.filter(r => Array.isArray(r.lines))) {
    assert.ok(r.source?.book && r.source.page, r.title);
    assert.ok(r.steps?.length, r.title);
  }
});
