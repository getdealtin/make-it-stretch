// "How your plan is made" must say what the engine does: the same rules, in the same order, in English
// and Spanish. Linked from the footer and the About page (owner decision, Nov 11 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRINCIPLES } from '../engine/index.js';

const read = f => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

test('the rules page lists every engine rule, in order, in both languages', async () => {
  const ids = PRINCIPLES.map(p => p.id);
  assert.equal(ids.length, 11);
  for (const lang of ['en', 'es']) {
    const P = (await import(`../public/i18n/principles/${lang}.js`)).default;
    assert.deepEqual(P.items.map(i => i.id), ids, lang);
    for (const i of P.items) assert.ok(i.h && i.p, `${lang} ${i.id}`);
    assert.ok(P.title && P.intro);
  }
});

test('the page, the footer and the About page link to it', () => {
  const page = read('how-plans-work.html');
  assert.match(page, /\/i18n\/principles\/\$\{lang\}\.js/);
  assert.match(page, /plan_p' \+ n/);
  for (const f of ['index.html', 'about.html']) assert.match(read(f), /href="\/how-plans-work"/, f);
  assert.match(readFileSync(new URL('../server.js', import.meta.url), 'utf8'), /app\.get\('\/how-plans-work'/);
});
