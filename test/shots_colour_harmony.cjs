// Screenshots of every Analytics tab, for before and after pictures of the colour and chart-weight refinement.
// BUNDLE env = staff bundle to load (default: live). OUT env = folder for the pictures. Invented data from test/mock.js.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const out = process.env.OUT || path.join(repo, 'test/out-shots');
fs.mkdirSync(out, { recursive: true });
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const bundle = process.env.BUNDLE || JSON.parse(fs.readFileSync(path.join(repo, 'dist/app/staff-brief-manifest.json'), 'utf8')).file;
const foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8')
  .replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '')
  .replace(/@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]+\.js/, '@LOCAL/' + bundle);
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const cal = JSON.stringify({ events: [], dates: [{ occasion_code: 'christmas', starts_on: '2026-12-25', ends_on: null }, { occasion_code: 'christmas', starts_on: '2025-12-25', ends_on: null }, { occasion_code: 'christmas', starts_on: '2024-12-25', ends_on: null }], occasions: [{ code: 'christmas', label: 'Christmas', active: true }] });
const shim = 'window.__CAL=' + cal + ';window.supabase={createClient:function(){var m=window.__ccsMock;if(!m.from)m.from=function(t){var o={};' +
  '["select","gte","lte","eq","in","order","limit","neq","is"].forEach(function(k){o[k]=function(){return o}});o.then=function(a,b){var d=t==="calendar_events"?__CAL.events:' +
  't==="occasion_dates"?__CAL.dates:t==="occasions"?__CAL.occasions:[];return Promise.resolve({data:d,error:null}).then(a,b)};return o};return m}};';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>window.__role="manager";' + mock + shim + '</script></head><body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
const types = { js: 'application/javascript', css: 'text/css' };
const VIEWS = (process.env.VIEWS || 'ov,sl,pd,cu,pl,sd,or,da').split(',');
const SIZES = { desktop: [1440, 1000], tablet: [1180, 820], phone: [412, 915] };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const errs = [];
  try {
    for (const size of (process.env.SIZES || 'desktop,tablet,phone').split(',')) {
      const [w, h] = SIZES[size];
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: size !== 'desktop', isMobile: size === 'phone', deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      p.on('pageerror', e => errs.push(size + ': ' + e.message));
      await ctx.route('**/*', r => {
        const u = r.request().url();
        if (u.includes('@LOCAL/')) return r.fulfill({ body: fs.readFileSync(path.join(repo, u.split('@LOCAL/')[1])), contentType: 'application/javascript' });
        if (u.startsWith('https://www.cornercafefiji.com/cake-orders-staff')) return r.fulfill({ body: html, contentType: 'text/html' });
        const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) ||
          u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
        if (m) {
          const type = types[m[2].split('.').pop()] || 'text/plain', hdr = { 'access-control-allow-origin': '*' };
          try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); }
          catch (e) { return r.fulfill({ status: 404, body: '', headers: hdr }); }
        }
        return r.abort();
      });
      await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
      try { await p.waitForSelector('#cc-heartbeat.hb-m-ready', { timeout: 12000 }); } catch (e) {}
      await p.waitForTimeout(1200);
      for (const v of VIEWS) {
        if (v === 'or') {
          await p.evaluate(() => document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="sd"]').click()); await p.waitForTimeout(700);
          await p.evaluate(() => { const e = document.querySelector('#ccs-main .cat-seg [data-v="or"]'); e && e.click(); }); await p.waitForTimeout(800);
        } else if (v !== 'ov') {
          await p.evaluate(x => document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="' + x + '"]').click(), v); await p.waitForTimeout(800);
        } else {
          await p.evaluate(() => { const e = document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="ov"]'); e && e.click(); }); await p.waitForTimeout(900);
        }
        if (process.env.DUMP) console.log(v, JSON.stringify(await p.evaluate(() => ['.cat-card', '.an-chart', '.oi-curve', '.or-chart', '.cat-k', '.cci-card', '.dx-cols', '.oi-heat', '.oi-yoy', '.aw-month-chart'].map(q => {
          const all = [...document.querySelectorAll('#ccs-main ' + q)]; return q + ':' + all.length + '/inHB=' + all.filter(e => e.closest('#cc-heartbeat')).length;
        }))));
        await p.evaluate(() => { document.querySelectorAll('#ccs-main details').forEach(d => { d.open = true; }); window.scrollTo(0, 0); });
        await p.waitForTimeout(300);
        // Each headline row and chart card on its own, so the whole tab is captured however the page scrolls
        const parts = await p.$$('#ccs-main .cat-page > .cat-kpis, #ccs-main .cat-card, #ccs-main .an-chart, #ccs-main .cat-todo, #ccs-main #cc-heartbeat .hb-k-kpis, #ccs-main .or-wrap');
        let i = 0;
        for (const el of parts) {
          if (!(await el.isVisible())) continue;
          const bb = await el.boundingBox(); if (!bb || bb.height < 20) continue;
          await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(80);
          await el.screenshot({ path: path.join(out, size + '-' + v + '-' + String(i++).padStart(2, '0') + '.png') });
        }
      }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log('errors: ' + (errs.length ? errs.join(' | ') : 'none'));
})();
