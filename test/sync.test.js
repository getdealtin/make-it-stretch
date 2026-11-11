// The engine here is a copy of the Austin build's (owner decision, Nov 11 2026). These tests say when:
//  - a copied file was edited here by hand (change it in makeitstretch-civic, then copy it), or
//  - Austin's engine has moved ahead of this copy (run: node scripts/update-engine.mjs).
// The second needs git and the network; offline it is skipped, and the weekly GitHub check
// (.github/workflows/engine-check.yml) runs it anyway.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readManifest, behind } from '../scripts/update-engine.mjs';

const root = new URL('../', import.meta.url);
const m = readManifest();

test('the engine copy is exactly what was copied from Austin (no edits here)', () => {
  assert.equal(m.repo, 'getdealtin/makeitstretch-civic');
  assert.ok(Object.keys(m.files).some(f => f === 'engine/principles.js'));
  for (const [path, { sha256 }] of Object.entries(m.files)) {
    const now = createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
    assert.equal(now, sha256, `${path} was changed here. Change it in makeitstretch-civic and run node scripts/update-engine.mjs`);
  }
});

test('the engine copy is not behind Austin’s main branch', async t => {
  if (process.env.ENGINE_CHECK === 'off') return t.skip('ENGINE_CHECK=off');
  let b;
  try { b = await behind(); } catch (e) { return t.skip(`can't reach GitHub (${e.message.split('\n')[0]})`); }
  assert.deepEqual(b.changed, [], `Austin's engine (${b.upstream.slice(0, 7)}) has changes not copied here (${b.copied.slice(0, 7)}). Run: node scripts/update-engine.mjs`);
});
