// Translate as we go (owner decision, Nov 11 2026): every new piece of screen text is added in English
// and Spanish. These tests fail the build when one is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { STRINGS, t, tHtml } = require('../public/i18n/strings.js');
const read = f => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

test('every English phrase has Spanish, and nothing extra', () => {
  for (const k of Object.keys(STRINGS.en)) assert.ok(STRINGS.es[k]?.trim(), `Spanish missing: ${k}`);
  for (const k of Object.keys(STRINGS.es)) assert.ok(k in STRINGS.en, `Spanish has a key English doesn't: ${k}`);
});

test('Spanish keeps every {value} the English has', () => {
  for (const [k, en] of Object.entries(STRINGS.en)) {
    const want = (en.match(/\{\w+\}/g) || []).sort().join();
    assert.equal((STRINGS.es[k].match(/\{\w+\}/g) || []).sort().join(), want, k);
  }
});

test('every data-t text on the pages is in the table, word for word in English', () => {
  for (const page of ['index.html', 'about.html']) {
    for (const [, key, text] of read(page).matchAll(/data-t="(\w+)"[^>]*>([^<]*)</g)) {
      assert.ok(STRINGS.en[key], `${page}: ${key} is not in public/i18n/strings.js`);
      assert.equal(text.replace(/&amp;/g, '&').trim(), STRINGS.en[key], `${page}: ${key} differs from the table`);
    }
  }
});

test('every T() key the main page uses exists', () => {
  const html = read('index.html');
  for (const [, key] of html.matchAll(/\bTH?\('(\w+)'/g)) assert.ok(STRINGS.en[key], key);
  for (const d of ['halal', 'kosher', 'diabetic', 'low_sodium']) assert.ok(STRINGS.en['diet_note_' + d]);
});

test('values are filled in and escaped', () => {
  assert.equal(t('serves', { n: 4 }), 'Serves 4');
  assert.equal(t('serves', { n: 4 }, 'es'), 'Para 4 personas');
  assert.equal(tHtml('have_note', { items: '<b>' }), 'From your kitchen: <strong>&lt;b&gt;</strong>.');
});

test('Spanish data for the new foods, recipes and twists came with the engine', async () => {
  const es = JSON.parse(read('i18n/data/es.json'));
  const { FOOD_DB, TWIST_IDS } = await import('../engine/index.js');
  for (const f of FOOD_DB) assert.ok(es.foods[f.id]?.name, `food ${f.id}`);
  for (const id of TWIST_IDS) assert.ok(es.twists[id], `twist ${id}`);
  const n = id => es.recipes[String(id)]?.title;
  const simple = JSON.parse(readFileSync(new URL('../data/simple-meals.json', import.meta.url), 'utf8')).recipes;
  const nih = JSON.parse(readFileSync(new URL('../data/nih-recipes.json', import.meta.url), 'utf8')).recipes;
  for (const r of [...simple, ...nih]) assert.ok(n(r.id), `recipe ${r.id}`);
});
