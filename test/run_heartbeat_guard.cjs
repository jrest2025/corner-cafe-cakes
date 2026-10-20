// HEARTBEAT GUARD. Run before every release that touches the staff page or Analytics.
// Fails if the Cake Heartbeat is missing or no longer leads Analytics: the Daily cake demand rail (booking curve),
// the Seasonal booking buildup, the daily breakdown, and the Occasions booking curve must all be present.
// Loads the live page head and footer (test/fixtures, or HEAD/FOOTER env), the staff bundle (BUNDLE env) and every
// pinned add-on from git at its pinned commit (run `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` first);
// a pin of forty zeros is served from the working tree, for testing a release before it is committed. Invented data.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const footRaw = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8');
// The staff bundle the footer loads, served from the working tree (or BUNDLE env for a candidate)
const bundle = process.env.BUNDLE || (footRaw.match(/dist\/app\/staff-app\.[0-9a-f]+\.js/) || ['dist/app/staff-app.3e258cb148.js'])[0];
const foot = footRaw
  .replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '')
  .replace(/@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]+\.js/, '@LOCAL/' + bundle);
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const cal = JSON.stringify({ events: [{ day: '2026-11-09', ends_on: null, name: 'Diwali', kind: 'holiday' }, { day: '2026-12-25', ends_on: null, name: 'Christmas Day', kind: 'holiday' }],
  dates: [{ occasion_code: 'christmas', starts_on: '2026-12-25', ends_on: null }], occasions: [{ code: 'christmas', label: 'Christmas', active: true }] });
// The Heartbeat creates its own database client; this gives it the same invented data as the app.
const shim = 'window.__CAL=' + cal + ';window.supabase={createClient:function(){var m=window.__ccsMock;if(!m.from)m.from=function(t){var o={};' +
  '["select","gte","lte","eq","in","order","limit","neq","is"].forEach(function(k){o[k]=function(){return o}});o.then=function(a,b){var d=t==="calendar_events"?__CAL.events:' +
  't==="occasion_dates"?__CAL.dates:t==="occasions"?__CAL.occasions:[];return Promise.resolve({data:d,error:null}).then(a,b)};return o};return m}};';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>window.__role="manager";' + mock + shim + '</script></head><body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
const types = { js: 'application/javascript', css: 'text/css' };
const OK = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const missing = new Set();
  try {
    for (const [w, h, label] of [[1366, 1024, 'tablet landscape'], [820, 1180, 'tablet upright'], [412, 915, 'phone']]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
      const p = await ctx.newPage(), errors = [];
      p.on('pageerror', e => { if (!OK.includes(e.message)) errors.push(e.message); });
      await ctx.route('**/*', r => {
        const u = r.request().url();
        if (u.includes('@LOCAL/')) return r.fulfill({ body: fs.readFileSync(path.join(repo, u.split('@LOCAL/')[1])), contentType: 'application/javascript' });
        if (u.startsWith('https://www.cornercafefiji.com/cake-orders-staff')) return r.fulfill({ body: html, contentType: 'text/html' });
        const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) ||
          u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
        if (m) {
          const type = types[m[2].split('.').pop()] || 'text/plain', hdr = { 'access-control-allow-origin': '*' };
          if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
          try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); }
          catch (e) { missing.add(m[1].slice(0, 7) + ':' + m[2]); return r.fulfill({ status: 404, body: '', headers: hdr }); }
        }
        return r.abort();
      });
      await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
      let ready = true;
      try { await p.waitForSelector('#cc-heartbeat.hb-m-ready', { timeout: 12000 }); } catch (e) { ready = false; }
      await p.waitForTimeout(800);
      check(label + ': the Cake Heartbeat loads on Analytics', ready);
      const v = await p.evaluate(() => {
        const vis = e => !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none';
        const top = q => { const e = document.querySelector(q); return vis(e) ? e.getBoundingClientRect().top : null; };
        const hb = document.getElementById('cc-heartbeat'), rail = document.getElementById('cc-demand-scroll-rail');
        hb && hb.querySelectorAll('details').forEach(d => { d.open = true; });
        const txt = hb ? hb.innerText : '';
        const paths = rail ? [...rail.querySelectorAll('svg path')].map(x => x.getAttribute('stroke')) : [];
        return {
          title: (hb && hb.querySelector('.hb-v2-head h2') || {}).textContent, live: (hb && hb.querySelector('.hb-v2-update') || {}).textContent,
          rail: vis(rail), days: rail ? rail.querySelectorAll('.ccdr-day').length : 0, lines: paths,
          headBottom: hb && hb.querySelector('.hb-v2-head') ? hb.querySelector('.hb-v2-head').getBoundingClientRect().bottom : null,
          railTop: top('#cc-demand-scroll-rail'), insightsTop: top('#cc-insights'), kpiTop: top('#cc-heartbeat .ccsd-manager-kpis'), seasonTop: top('#cc-heartbeat .ccsd-season'),
          season: vis(document.querySelector('#cc-heartbeat .ccsd-season')) && !!document.querySelector('#cc-heartbeat .ccsd-season table'),
          breakdown: !!document.querySelector('#cc-heartbeat .hb-m-details'),
          cards: document.querySelectorAll('#cc-insights .cci-card').length,
          bad: (txt.match(/undefined|NaN/g) || []).length, h24: (txt.match(/\b([01]?\d|2[0-3]):[0-5]\d\b(?!\s?(AM|PM))/g) || []),
          value: [...document.querySelectorAll('#cc-heartbeat .ccsd-manager-kpis .hb-k-kpi')].map(k => k.innerText.replace(/\s+/g, ' ')),
          followups: /Customer follow-ups/.test(txt),
          filters: vis(document.querySelector('#ccs-main > .dx-filters')) || vis(document.querySelector('#ccs-main > .dx-period')),
          needTabs: [...document.querySelectorAll('#ccs-main .an-mods .an-mod.is-need')].filter(vis).length,
          sx: document.documentElement.scrollWidth - innerWidth
        };
      });
      check(label + ': the section is titled Cake Heartbeat and shows a live 12-hour time', v.title === 'Cake Heartbeat' && /Live · updated \d{1,2}:\d\d (AM|PM)/.test(v.live || ''), [v.title, v.live]);
      check(label + ': the Daily cake demand rail (booking curve) is present with day cards and both lines', v.rail && v.days >= 3 && v.lines.includes('#468b67') && v.lines.includes('#975aa3'), v);
      check(label + ': the Heartbeat rail comes first, straight under its header', v.railTop !== null && v.railTop - v.headBottom < 60 && v.railTop < v.insightsTop && v.insightsTop < v.kpiTop && v.kpiTop < v.seasonTop, v);
      check(label + ': Seasonal booking buildup and the daily breakdown are kept', v.season && v.breakdown, v);
      check(label + ': today’s insights show', v.cards >= 3, v.cards);
      check(label + ': nothing reads undefined or NaN, and times are 12-hour', v.bad === 0 && v.h24.length === 0, [v.bad, v.h24]);
      check(label + ': Confirmed order value shows money and Ordered ahead replaces the data check', v.value.some(t => /Confirmed order value FJD [\d,]+/.test(t)) && v.value.some(t => /^Ordered ahead/.test(t)) && !v.value.some(t => /Booking dates to verify/.test(t)), v.value);
      check(label + ': the empty follow-ups box is gone', !v.followups);
      check(label + ': Overview has no unused filters and no empty-module tabs', !v.filters && v.needTabs === 0, v);
      check(label + ': no sideways scroll', v.sx <= 1, v.sx);
      // Every other tab opens cleanly: no stuck loading box, nothing undefined, 12-hour times, no sideways scroll, and
      // (older layout with sub-tabs) every section name visible on tablets. The tab pages share one shape.
      const tabs = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .an-mods .an-mod')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.v).filter(v => v !== 'ov'));
      check(label + ': Analytics shows its other tabs', tabs.length >= 4, tabs);
      for (const t of tabs) {
        await p.evaluate(v => document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="' + v + '"]').click(), t);
        await p.waitForTimeout(700);
        const o = await p.evaluate(() => {
          const m = document.getElementById('ccs-main'), bar = document.querySelector('#ccs-main .dx-secs .ccs-secbar'), txt = m.innerText, pg = m.querySelector('.cat-page');
          return { before: getComputedStyle(m, '::before').content, fits: bar ? bar.scrollWidth <= bar.clientWidth + 1 : true,
            bad: (txt.match(/undefined|NaN|\[object/g) || []).length, h24: (txt.match(/\b([01]?\d|2[0-3]):[0-5]\d\b(?!\s?(AM|PM))/g) || []).slice(0, 3),
            sx: document.documentElement.scrollWidth - innerWidth, page: !!pg, kpis: pg ? pg.querySelectorAll(':scope > .cat-kpis > .cat-k').length : 0,
            main: pg ? !!pg.querySelector(':scope > .cat-main') : false, details: pg ? [...pg.querySelectorAll(':scope > .cat-more')].map(d => d.open) : [] };
        });
        check(label + ': the ' + t + ' tab opens cleanly', (o.before === 'none' || o.before === 'normal') && o.bad === 0 && o.h24.length === 0 && o.sx <= 1 && (w < 760 || o.fits), o);
        if (['sl', 'pd', 'cu', 'pl'].includes(t)) check(label + ': the ' + t + ' tab has four headline figures, one main chart and closed details', o.page && o.kpis === 4 && o.main && o.details.length === 1 && o.details[0] === false, o);
      }
      await p.evaluate(() => document.querySelector('#ccs-main [data-act="secgo"][data-v="sd"]').click());
      await p.waitForTimeout(900);
      const sd = await p.evaluate(() => {
        const hd = [...document.querySelectorAll('#ccs-main h3')].find(e => e.textContent.trim() === 'Booking curve');
        const card = hd && hd.closest('section,article,div');
        return { found: !!hd, chart: !!(card && card.querySelector('svg')) };
      });
      check(label + ': the Occasions booking curve is kept', sd.found && sd.chart, sd);
      await p.evaluate(() => document.querySelector('#ccs-main [data-act="secgo"][data-v="ov"]').click());
      try { await p.waitForSelector('#cc-heartbeat.hb-m-ready #cc-demand-scroll-rail', { timeout: 8000 }); } catch (e) {}
      check(label + ': back on Overview the Heartbeat is still there', await p.evaluate(() => !!document.querySelector('#cc-heartbeat.hb-m-ready #cc-demand-scroll-rail')));
      const live = await p.evaluate(() => {
        const sc = document.querySelector('#cc-demand-scroll-rail .ccdr-scroll'), t = document.querySelector('#cc-demand-scroll-rail .ccdr-day.is-today');
        if (!sc || !t) return { today: !!t, range: (document.querySelector('#cc-demand-scroll-rail .ccdr-range') || {}).textContent };
        const a = sc.getBoundingClientRect(), r = t.getBoundingClientRect();
        return { today: r.right > a.left && r.left < a.right, range: document.querySelector('#cc-demand-scroll-rail .ccdr-range').textContent };
      });
      check(label + ': after visiting other tabs the Heartbeat still shows this week, not January 2024', live.today, live);
      check(label + ': no script errors' + (errors.length ? ' ' + errors.join(' | ') : ''), errors.length === 0);
      if (w === 1366) {
        // If the tab pages ever fail, the app still shows that tab's earlier sections instead of an empty screen.
        const fallback = await p.evaluate(async () => {
          if (!window.CCAnalyticsTabs) return { skipped: true };
          const keep = window.CCAnalyticsTabs.page; window.CCAnalyticsTabs.page = function () { throw Error('guard: simulated failure'); };
          const first = document.querySelector('#ccs-main .an-mods .an-mod:not([data-v="ov"])'); first.click();
          await new Promise(r => setTimeout(r, 600));
          const r = { secs: !!document.querySelector('#ccs-main .dx-secs .ccs-secbar'), body: !!document.querySelector('#ccs-main .dx-secbody,#ccs-main .dx-card') };
          window.CCAnalyticsTabs.page = keep; return r;
        });
        check(label + ': if the tab pages fail, the earlier sections still show', fallback.skipped || (fallback.secs && fallback.body), fallback);
      }
      if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, 'guard-' + w + '.png') });
      await ctx.close();
    }
  } finally { await b.close(); }
  check('every pinned asset was available' + (missing.size ? ': missing ' + [...missing].join(', ') : ''), missing.size === 0);
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
