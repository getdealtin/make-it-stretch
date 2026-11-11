// /dash: the operator's private dashboard, laid out like the Austin build's admin (owner decision,
// Nov 2026): summary tiles on top, then one section per panel, in this site's colors and type.
//
// Data: the read-only dashboard_range(days) function (data/supabase_dashboard_range.sql). Until that has
// been run in Supabase, the all-time `dashboard` view is used and the panels that need it say so.
// Every zip and number is shown: this is a private operator view, not a report for outside parties.

const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const money = n => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (n, d) => (d ? Math.round((n / d) * 100) + '%' : '—');
const day = iso => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—');
const stamp = dt => (dt ? new Date(dt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const addMonths = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

const PRETTY = {
  step: { step_budget: 'Budget', step_days: 'How long', step_people: 'People', step_zip: 'Zip', step_prefs: 'Preferences (built a plan)' },
  store: { full: 'Full grocery', walmart: 'Walmart', aldi: 'Aldi / Lidl', dollar: 'Dollar store', corner: 'Corner / bodega', none: 'Not sure' },
  rule: { cookable: 'Cookable', within_budget: 'Within budget', calories_first: 'Calories first', fullness_next: 'Fullness next', guidance: 'Government guidance',
    variety: 'Variety', spread: 'Spread', household: 'Household', no_piles: 'No piles', honest: 'Honest', same_plan: 'Same plan' },
};

const table = (rows, head = ['', 'Count'], fmt = v => v) => rows && rows.length
  ? `<table class="act-table"><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(([k, ...v]) => `<tr><td>${esc(fmt(k))}</td>${v.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  : '<p class="empty">None yet.</p>';

/** The dated facts this site depends on, when each was last updated or checked, and when it's next due. */
function maintenance(ctx, now = new Date()) {
  const today = now.toISOString().slice(0, 10), soon = addMonths(today, 1);
  const { BENCHMARKS, BLS_CHECKED, BLS_ITEMS, EXTRA_PRICES_AS_OF, CHECKS } = ctx;
  const items = [
    { title: 'Thrifty Food Plan benchmark', last: BENCHMARKS.tfpDate, due: addMonths(BENCHMARKS.tfpDate, 12),
      what: `Used in Budget pressure (now $${BENCHMARKS.tfpPerPersonDay} per person per day, ${BENCHMARKS.tfpAsOf}).`,
      how: 'Comes with the engine: update the Austin build (engine/index.js), then node scripts/update-engine.mjs.' },
    { title: 'SNAP average benefit', last: BENCHMARKS.snapDate, due: addMonths(BENCHMARKS.snapDate, 15),
      what: `Used in Budget pressure and the engine's guidance rule (about $${BENCHMARKS.snapPerPersonDay} per person per day, ${BENCHMARKS.snapAsOf}).`,
      how: 'Comes with the engine: update the Austin build, then node scripts/update-engine.mjs.' },
    { title: 'BLS price series check', last: BLS_CHECKED, due: addMonths(BLS_CHECKED, 12),
      what: `Live grocery prices come from ${Object.keys(BLS_ITEMS).length} BLS series. BLS sometimes stops or renumbers a series.`,
      how: 'Comes with the engine copy (lib/prices.js). A bad series is ignored automatically meanwhile.' },
    { title: 'Recipe food prices (NHLBI main dishes)', last: EXTRA_PRICES_AS_OF, due: addMonths(EXTRA_PRICES_AS_OF, 12),
      what: 'USDA estimates for the foods the 25 NHLBI recipes added, brought up to date with the BLS food-at-home index.',
      how: 'Comes with the engine: update the Austin build (scripts/build-nih-recipes.py), then node scripts/update-engine.mjs.' },
    { title: 'Census data year ("You’re not alone")', last: CHECKS.census.checked, due: CHECKS.census.checked ? addMonths(CHECKS.census.checked, 12) : today,
      what: `The solidarity strip uses the ${CHECKS.census.vintage} ACS 5-year estimates. Census releases a new year each December.`,
      how: 'Change the year in /api/census (server.js) and check a few zips still answer, then change CHECKS.census here.' },
    { title: 'Senator votes', last: CHECKS.votes, due: CHECKS.votes ? addMonths(CHECKS.votes, 6) : today,
      what: 'The key food votes on each senator card (KEY_VOTES in public/index.html).',
      how: 'Check Congress.gov for new food or SNAP votes and each senator’s record, then set CHECKS.votes here.' },
    { title: 'Help links (Programs That Can Help)', last: CHECKS.links, due: CHECKS.links ? addMonths(CHECKS.links, 12) : today,
      what: 'SNAP, WIC and food bank links in /api/food-resources and /resources.',
      how: 'Open every link, check the descriptions still hold, then set CHECKS.links here.' },
  ];
  return items.map(i => ({ ...i, status: !i.last || i.due <= today ? 'due' : i.due <= soon ? 'soon' : 'ok' }))
    .sort((a, b) => a.due.localeCompare(b.due));
}

function renderDashboard({ d, ranged, days, cityMap = {}, ctx, prices, engine }) {
  const cityOf = z => cityMap[z] || '—';
  const t = d.totals || {}, all = d.all_time || { last_event: t.last_event, first_event: t.first_event, total_events: t.total_events };
  const last = all.last_event ? new Date(all.last_event) : null;
  const ageH = last ? Math.round((Date.now() - last.getTime()) / 3600000) : null;
  const fresh = ageH != null && ageH <= 48;
  const upd = maintenance(ctx);
  const due = upd.filter(m => m.status !== 'ok').length;
  const stale = prices.filter(p => p.stale).length;
  const ruleFails = (d.principles || []).reduce((a, [, n]) => a + n, 0);
  const needsFn = msg => (ranged ? '' : `<p class="a-hint warn">${esc(msg || 'Needs the dashboard_range function: run data/supabase_dashboard_range.sql once in Supabase → SQL Editor.')}</p>`);

  const visits = ranged ? t.visits : t.visits, plans = ranged ? t.plans : t.plans_built;
  const steps = Object.keys(PRETTY.step).map(k => [k, `${(d.steps || {})[k] || 0} (${pct((d.steps || {})[k] || 0, visits)} of visits)`]);
  const pr = d.pressure || {}, sf = d.shortfall || {}, en = d.engagement || {};
  const unknown = Math.max(0, (plans || 0) - (pr.under_snap || 0) - (pr.snap_to_tfp || 0) - (pr.over_tfp || 0));
  const { BENCHMARKS: B } = ctx;

  const range = `<div class="actions" role="group" aria-label="Date range">${[7, 30, 90, 365].map(n =>
    `<a class="btn-xs ${n === days ? 'go' : ''}" href="/dash?days=${n}" aria-current="${n === days}">${n === 365 ? '1 year' : n + ' days'}</a>`).join('')}</div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard · Make It Stretch</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#1B3624;--ink2:#3E4A42;--ink3:#6b7a70;--bg:#FAF8F5;--bg2:#fff;--bg3:#F3F0EB;--border:#DDD9D1;--gold:#D9822B;--gold-dim:#fdf0e4;--amber:#f0c898;--green:#2e7d50;--green-bg:#EEF3EE;--red:#c0492f;--red-dim:#fdf0ec}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:'Plus Jakarta Sans',sans-serif;line-height:1.5;padding:0 0 80px}
a{color:#2a5c8a}
.wrap{max-width:1040px;margin:0 auto;padding:0 18px}
.admin-bar{position:sticky;top:0;z-index:5;background:#25332B;color:#FAF8F5;padding:10px 0;margin-bottom:24px}
.admin-bar .wrap{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.admin-bar b{font-family:'Lora',serif;font-size:18px}
.admin-bar .muted{font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(250,248,245,.7)}
.admin-bar .btn-xs{background:transparent;color:#FAF8F5;border-color:rgba(250,248,245,.35)}
.actions{display:flex;flex-wrap:wrap;gap:6px}
.btn-xs{display:inline-block;font:600 12px 'Plus Jakarta Sans',sans-serif;padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--ink);text-decoration:none;cursor:pointer}
.btn-xs.go{background:var(--ink);color:#fff;border-color:var(--ink)}
.status{font-family:'IBM Plex Mono',monospace;font-size:12px;margin:0 0 16px;color:var(--ink2)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:8px}
.count{display:block;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 14px 12px;text-decoration:none;color:inherit}
.count b{display:block;font-family:'Lora',serif;font-size:28px;line-height:1.1}
.count span{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-top:4px}
.count.alert{border-color:var(--gold);background:var(--gold-dim)}
.count.alert b{color:#9a5512}
.a-section{margin-top:36px;padding-top:20px;border-top:1px solid var(--border)}
.a-section h2{font-family:'Lora',serif;font-size:24px;margin-bottom:4px}
.a-section h2 small{font:500 13px 'IBM Plex Mono',monospace;color:var(--ink3);margin-left:6px}
.a-hint{font-size:13px;color:var(--ink3);margin:4px 0 12px;max-width:720px}
.a-hint.warn{color:#7a4a1a;background:var(--gold-dim);border:1px solid var(--amber);border-radius:8px;padding:8px 12px}
.act-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;margin-top:16px}
.act-grid>div{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
h3{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
h4{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin:12px 0 6px}
.act-table{width:100%;border-collapse:collapse;font-size:13px}
.act-table th{text-align:left;font:600 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);padding:4px 6px;border-bottom:1px solid var(--border)}
.act-table td{padding:6px;border-bottom:1px solid #eeebe5}
.act-table td+td,.act-table th+th{text-align:right;font-family:'IBM Plex Mono',monospace}
.act-table tr:last-child td{border-bottom:none}
.empty{font-size:13px;color:var(--ink3);font-style:italic}
.row-list{list-style:none;display:grid;gap:8px}
.row-list li{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.row-list .sub{display:block;font-size:12px;color:var(--ink3);margin-top:2px}
.status-pill{flex-shrink:0;font:700 10px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:20px;background:var(--gold-dim);color:#9a5512;border:1px solid var(--amber)}
.status-pill.ok{background:var(--green-bg);color:var(--green);border-color:#B8CDB8}
.status-pill.bad{background:var(--red-dim);color:var(--red);border-color:#f0c4b8}
@media(max-width:640px){.act-grid{grid-template-columns:1fr}}
</style></head><body>
<div class="admin-bar"><div class="wrap">
  <span><b>Make It Stretch</b> <span class="muted">· dashboard · food.getdealtin.com</span></span>
  <span class="actions">
    <button class="btn-xs" id="testing" type="button">Don’t count this browser</button>
    <a class="btn-xs" href="/dash/logout">Sign out</a>
  </span>
</div></div>
<div class="wrap">
<h1 class="sr-only" style="position:absolute;left:-9999px">Make It Stretch dashboard</h1>
<p class="status"><span class="dot" style="background:${fresh ? 'var(--green)' : 'var(--red)'}"></span>Last activity: ${stamp(all.last_event)}${ageH != null ? ` (${ageH < 1 ? 'under 1h' : ageH + 'h'} ago)` : ''} — ${fresh ? 'logging looks live' : 'no recent events'} · generated ${stamp(Date.now())}</p>

<nav class="counts" aria-label="Summary">
  <a class="count" href="#activity"><b>${esc(visits ?? '—')}</b><span>Visits${ranged ? ` · ${days} days` : ' · all time'}</span></a>
  <a class="count" href="#activity"><b>${esc(plans ?? '—')}</b><span>Plans built</span></a>
  <a class="count" href="#activity"><b>${ranged ? money(t.budget_total) : '—'}</b><span>Grocery dollars planned</span></a>
  <a class="count ${ruleFails ? 'alert' : ''}" href="#engine"><b>${ranged ? ruleFails : '—'}</b><span>Plans that broke a rule</span></a>
  <a class="count ${engine.behind ? 'alert' : ''}" href="#engine"><b>${engine.behind == null ? '?' : engine.behind ? 'Behind' : 'Current'}</b><span>Engine vs Austin</span></a>
  <a class="count ${stale ? 'alert' : ''}" href="#prices"><b>${prices.length ? prices.length - stale + '/' + prices.length : '—'}</b><span>Live price regions fresh</span></a>
  <a class="count ${due ? 'alert' : ''}" href="#updates"><b>${due}</b><span>Annual updates due</span></a>
</nav>

<section class="a-section" id="activity" aria-labelledby="h-act">
  <h2 id="h-act">Activity <small>${ranged ? `last ${days} days` : 'all time'}</small></h2>
  ${range}
  ${needsFn()}
  <div class="counts" style="margin-top:14px">
    <div class="count"><b>${esc(visits ?? 0)}</b><span>Visits</span></div>
    <div class="count"><b>${esc(t.sessions ?? t.distinct_sessions ?? 0)}</b><span>Sessions</span></div>
    <div class="count"><b>${esc(plans ?? 0)}</b><span>Grocery plans built</span></div>
    <div class="count"><b>${esc(t.events ?? t.total_events ?? 0)}</b><span>Events</span></div>
  </div>
  <p class="a-hint">A visit is a page load; a session is a visit that did something; a plan built means the person finished the intake.</p>
  <div class="act-grid">
    <div><h3>Visits per day</h3>${ranged ? table((d.per_day || []).map(x => [day(x.day), x.visits, x.plans]), ['Day', 'Visits', 'Plans']) : needsFn('Needs dashboard_range.')}</div>
    <div><h3>Where people stop</h3>${ranged ? table(steps, ['Question finished', 'Visits'], k => PRETTY.step[k] || k) : needsFn('Needs dashboard_range.')}
      <p class="a-hint">Counted from Nov 2026, when step events were added.</p></div>
    <div><h3>Budget pressure</h3>${ranged ? table([
        [`Under $${B.snapPerPersonDay}/person/day (below the average SNAP benefit)`, pr.under_snap || 0],
        [`$${B.snapPerPersonDay}–$${B.tfpPerPersonDay} (between SNAP and the Thrifty Food Plan)`, pr.snap_to_tfp || 0],
        [`$${B.tfpPerPersonDay} or more (at or above the Thrifty Food Plan, ${B.tfpAsOf})`, pr.over_tfp || 0],
        ...(unknown ? [['Not recorded (older plans)', unknown]] : [])], ['Per person per day', 'Plans']) : needsFn('Needs dashboard_range (the SNAP and Thrifty Food Plan lines replace the old $5.36 line).')}</div>
    <div><h3>Shortfall routing</h3>${ranged ? table([
        ['Plans below the SNAP benchmark', sf.sessions || 0],
        ['…then tapped SNAP or WIC', sf.routed_benefits || 0],
        ['…then tapped a food bank', sf.routed_food || 0]], ['', 'Visits']) : needsFn('Needs dashboard_range.')}
      <p class="a-hint">Taps on a link, not applications: the tool can't see who applies.</p></div>
    <div><h3>Top zips</h3>${table((ranged ? d.zips : (d.top_zips || []).map(o => [o.zip, o.sessions])).map(([z, n]) => [z, cityOf(z), n]), ['Zip', 'City', 'Sessions'])}</div>
    <div><h3>Where people shop</h3>${ranged ? table(Object.entries(d.store || {}).sort((a, b) => b[1] - a[1]), ['Store type', 'Plans'], k => PRETTY.store[k] || k)
        + `<h4>By zip</h4>${table(d.store_by_zip || [], ['Zip · store', 'Plans'], k => k.replace(/ · (\w+)$/, (m, x) => ' · ' + (PRETTY.store[x] || x)))}` : needsFn('Needs dashboard_range.')}</div>
    <div><h3>Dietary needs</h3>${ranged ? table(d.avoid || [], ['Can’t eat / diet', 'Plans']) + `<h4>Food style</h4>${table(d.cuisine || [], ['Cuisine', 'Plans'])}
      <p class="a-hint">Food style is recorded from Nov 2026 (before, every plan logged “any”).</p>` : needsFn('Needs dashboard_range.')}</div>
    <div><h3>Engagement</h3>${table([
        ['Meals swapped', en.meals_swapped], ['Recipes opened', en.recipes_opened], ['“Ways to change it up” opened', en.twists_opened],
        ['Switched to a shorter/full list', en.list_switched], ['“How your plan is made” opened', en.rules_opened],
        ['Items checked', en.items_checked], ['Lists printed', en.lists_printed], ['Lists emailed', en.lists_emailed], ['Lists shared', en.lists_shared],
        ['Brand prices viewed', en.brand_clicks], ['SNAP screener clicks', en.snap_clicks], ['Food-bank clicks', en.foodbank_clicks],
      ].map(([k, v]) => [k, v == null ? '—' : v]), ['', 'Count'])}</div>
    <div><h3>Events by type</h3>${table((d.events_by_type || []).map(o => [o.event, o.n]), ['Event', 'Count'])}</div>
  </div>
</section>

<section class="a-section" id="sessions" aria-labelledby="h-rs">
  <h2 id="h-rs">Recent sessions <small>is anyone using it?</small></h2>
  <p class="a-hint">Each row is one visit. Blank city/zip = they landed but didn't enter a zip. Plan ✓ = finished the intake.</p>
  ${table((d.recent_sessions || []).map(o => [stamp(o.ts).replace(' UTC', ''), o.zip ? cityOf(o.zip) : '—', o.zip || '—', o.events, o.built_plan ? '✓' : '']), ['When (UTC)', 'City', 'Zip', 'Events', 'Plan'])}
</section>

<section class="a-section" id="reports" aria-labelledby="h-pr">
  <h2 id="h-pr">Real prices people reported <small>${(d.price_reports || []).length}</small></h2>
  <p class="a-hint">What people typed when correcting a shelf price: real-world ground truth to compare against the BLS estimates. Free-form entries, so units vary.</p>
  ${table((d.price_reports || []).map(o => [o.item, o.zip, o.price, o.ts ? new Date(o.ts).toISOString().slice(5, 16).replace('T', ' ') : '']), ['Item', 'Zip', 'Reported price', 'When'])}
</section>

<section class="a-section" id="prices" aria-labelledby="h-lp">
  <h2 id="h-lp">Live BLS prices</h2>
  <p class="a-hint">Each region's prices are kept fresh for 24 hours. If BLS doesn't answer, the last good prices are kept and BLS isn't asked again for 15 minutes. Flagged after 3 days without BLS. Kept in memory, so a restart starts fresh (the built-in estimates are used until BLS answers).</p>
  ${ctx.blsKey ? (prices.length ? `<ul class="row-list">${prices.map(p => `<li><span><b>${esc(p.region)}</b><span class="sub">Last good prices: ${stamp(p.fetched_at)}${p.last_failure ? ` · last failed ask ${stamp(p.last_failure)}` : ''}</span></span>
    <span class="status-pill ${p.stale ? 'bad' : 'ok'}">${p.stale ? 'Stale' : 'Fresh'}</span></li>`).join('')}</ul>` : '<p class="empty">No region has been asked for yet since the last restart.</p>')
    : '<p class="a-hint warn">BLS_KEY isn’t set, so plans use the built-in price estimates.</p>'}
</section>

<section class="a-section" id="engine" aria-labelledby="h-en">
  <h2 id="h-en">Meal-planning engine</h2>
  <p class="a-hint">This site keeps its own copy of the Austin build's engine. Update it with <code>node scripts/update-engine.mjs</code>, run <code>npm test</code>, look at a few plans, then commit. A weekly GitHub check fails when Austin's engine has changed.</p>
  <ul class="row-list">
    <li><span><b>Copied from Austin</b><span class="sub">${esc(engine.repo)} @ ${esc(engine.commit.slice(0, 7))} · copied ${esc(engine.copied_at)} · ${esc(engine.recipes)} recipes</span></span>
      <span class="status-pill ${engine.behind ? '' : engine.behind == null ? '' : 'ok'}">${engine.behind == null ? 'Not checked' : engine.behind ? 'Behind' : 'Up to date'}</span></li>
    ${engine.behind ? `<li><span><b>Changed in Austin since</b><span class="sub">${esc(engine.changed.join(', '))}</span></span></li>` : ''}
  </ul>
  <h4>Plans that broke one of the 11 rules${ranged ? ` (last ${days} days)` : ''}</h4>
  ${ranged ? table((d.principles || []).map(([k, n]) => [k, n]), ['Rule', 'Plans'], k => PRETTY.rule[k] || k) : needsFn('Needs dashboard_range.')}
  <p class="a-hint">Every plan is checked against the rules in the browser. A broken rule is a bug in the engine: tell Claude which rule and fix it in the Austin build.</p>
</section>

<section class="a-section" id="updates" aria-labelledby="h-up">
  <h2 id="h-up">Annual updates</h2>
  <p class="a-hint">Facts the site depends on that go out of date, with when each was last updated or checked and when it's next due.</p>
  <ul class="row-list">${upd.map(m => `
    <li><span><b>${esc(m.title)}</b>
      <span class="sub">${esc(m.what)}</span>
      <span class="sub">Last updated or checked ${m.last ? day(m.last + 'T12:00:00Z') : 'never recorded'} · next due ${day(m.due + 'T12:00:00Z')}</span>
      <span class="sub">How: ${esc(m.how)}</span></span>
      <span class="status-pill ${m.status === 'ok' ? 'ok' : ''}">${m.status === 'due' ? 'Due now' : m.status === 'soon' ? 'Due soon' : 'OK'}</span></li>`).join('')}</ul>
</section>
</div>
<script>
(function(){
  var b=document.getElementById('testing');
  function on(){try{return localStorage.getItem('mis:test')==='1'}catch(e){return false}}
  function show(){b.textContent=on()?'✓ Not counting this browser':'Don’t count this browser';b.setAttribute('aria-pressed',on())}
  b.addEventListener('click',function(){try{on()?localStorage.removeItem('mis:test'):localStorage.setItem('mis:test','1')}catch(e){}show()});
  show();
})();
</script>
</body></html>`;
}

module.exports = { renderDashboard, maintenance };
