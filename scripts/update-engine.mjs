#!/usr/bin/env node
// Bring this site's copy of the meal-planning engine up to date with the Austin build
// (getdealtin/makeitstretch-civic), or check whether it is behind.
//
// The engine is copied, not shared (owner decision, Nov 11 2026): an Austin change reaches
// food.getdealtin.com only when someone runs this script and the tests here pass.
//
//   node scripts/update-engine.mjs                 copy from GitHub, main branch (needs git)
//   node scripts/update-engine.mjs --ref <sha>     copy a given commit, branch or tag
//   node scripts/update-engine.mjs --from <dir>    copy from a local checkout instead of GitHub
//   node scripts/update-engine.mjs --check         exit 1 if Austin's main has engine changes not copied here
//
// What is copied, and where it goes, is FILES below. engine/SOURCE.json records the Austin commit and a
// hash of every copied file, so test/sync.test.js can tell if a copy was edited here by hand (don't: change
// it in Austin's repo, then copy it).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'getdealtin/makeitstretch-civic';
const MANIFEST = join(ROOT, 'engine', 'SOURCE.json');

/** Austin path → path here. `engine/*.js` means every .js file in Austin's engine/ folder. */
const FILES = {
  'engine/*.js': 'engine/',
  'data/seed-recipes.json': 'data/seed-recipes.json',
  'data/nih-recipes.json': 'data/nih-recipes.json',
  'data/simple-meals.json': 'data/simple-meals.json',
  // Spanish for foods, tips, recipes (incl. NHLBI's own) and twists; and the rules page text.
  'public/i18n/data/es.json': 'public/i18n/data/es.json',
  'public/i18n/principles/en.js': 'public/i18n/principles/en.js',
  'public/i18n/principles/es.js': 'public/i18n/principles/es.js',
  // Live BLS prices: the checked series codes and package sizes, and the cache that survives a BLS outage.
  'server/prices.js': 'lib/prices.js',
  'server/live-prices.js': 'lib/live-prices.js',
  // The engine's own tests come with it, unchanged.
  'test/engine.test.js': 'test/engine.test.js',
  'test/meals.test.js': 'test/meals.test.js',
  'test/box.test.js': 'test/box.test.js',
};

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A source: Austin's files at one commit, from a local checkout (--from) or a fresh shallow clone of GitHub. */
async function source() {
  let dir = opt('--from') ? join(process.cwd(), opt('--from')) : null;
  if (!dir) {
    dir = mkdtempSync(join(tmpdir(), 'mis-engine-'));
    const ref = opt('--ref') || 'main';
    git('init', '-q', dir);
    git('-C', dir, 'fetch', '-q', '--depth', '1', `https://github.com/${REPO}.git`, ref);
    git('-C', dir, 'checkout', '-q', 'FETCH_HEAD');
  }
  let commit = 'local';
  try { commit = git('-C', dir, 'rev-parse', 'HEAD'); } catch { /* not a git folder */ }
  return {
    commit,
    list: async folder => readdirSync(join(dir, folder)).map(n => `${folder}/${n}`),
    read: async p => readFileSync(join(dir, p)),
  };
}

/** Every file to copy: [Austin path, path here]. */
async function plan(src) {
  const out = [];
  for (const [from, to] of Object.entries(FILES)) {
    if (from.endsWith('/*.js')) {
      const folder = from.slice(0, -5);
      for (const p of (await src.list(folder)).filter(p => p.endsWith('.js')).sort()) out.push([p, to + p.slice(folder.length + 1)]);
    } else out.push([from, to]);
  }
  return out;
}

export function readManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

async function update() {
  const src = await source();
  const files = await plan(src);
  const old = existsSync(MANIFEST) ? readManifest() : { files: {} };
  const record = {};
  for (const [from, to] of files) {
    const buf = await src.read(from);
    mkdirSync(dirname(join(ROOT, to)), { recursive: true });
    writeFileSync(join(ROOT, to), buf);
    record[to] = { from, sha256: sha256(buf) };
  }
  // An engine file Austin removed goes here too.
  for (const to of Object.keys(old.files)) if (!record[to] && existsSync(join(ROOT, to))) { unlinkSync(join(ROOT, to)); console.log('removed', to); }
  const manifest = { repo: REPO, commit: src.commit, copied_at: new Date().toISOString().slice(0, 10), files: record };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  const changed = Object.keys(record).filter(k => old.files[k]?.sha256 !== record[k].sha256);
  console.log(`Copied ${files.length} files from ${REPO} @ ${src.commit.slice(0, 7)}. Changed: ${changed.length ? changed.join(', ') : 'none'}.`);
  console.log('Next: npm test, look at a few plans, then commit.');
}

/** Files that differ between the copy here and Austin's main branch (by hash), and the commits. */
export async function behind() {
  const m = readManifest();
  const src = await source();
  if (src.commit === m.commit) return { upstream: src.commit, copied: m.commit, changed: [] };
  const files = await plan(src);
  const changed = [];
  const seen = new Set();
  for (const [from, to] of files) {
    seen.add(to);
    if (m.files[to]?.sha256 !== sha256(await src.read(from))) changed.push(to);
  }
  for (const to of Object.keys(m.files)) if (!seen.has(to)) changed.push(to + ' (removed in Austin)');
  return { upstream: src.commit, copied: m.commit, changed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (args.includes('--check')) {
    const b = await behind();
    if (b.changed.length) {
      console.error(`The engine here is behind Austin's (copied ${b.copied.slice(0, 7)}, Austin main is ${b.upstream.slice(0, 7)}).\nChanged in Austin: ${b.changed.join(', ')}\nRun: node scripts/update-engine.mjs`);
      process.exit(1);
    }
    console.log(`Engine is up to date with Austin (${b.upstream.slice(0, 7)}).`);
  } else await update();
}
