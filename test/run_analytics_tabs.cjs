// Analytics tab pages: period chips, More filters, Details, taps that open orders, the Occasions views, links, the
// older-orders switch and the fallback. Live head and footer (test/fixtures, or HEAD/FOOTER env), staff bundle from
// BUNDLE env, pinned add-ons from git. Invented data.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const bundle = process.env.BUNDLE || JSON.parse(fs.readFileSync(path.join(repo, 'dist/app/staff-analytics-tabs-manifest.json'), 'utf8')).file;
const foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8')
  .replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '')
  .replace(/@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]+\.js/, '@LOCAL/' + bundle);
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const cal = JSON.stringify({ events: [], dates: [{ occasion_code: 'christmas', starts_on: '2026-12-25', ends_on: null }], occasions: [{ code: 'christmas', label: 'Christmas', active: true }] });
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
  try {
    for (const [w, h, label] of [[1366, 1024, 'tablet'], [412, 915, 'phone']]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
      const p = await ctx.newPage(), errors = [], warns = [];
      p.on('pageerror', e => { if (!OK.includes(e.message)) errors.push(e.message); });
      p.on('console', m => { if (/Analytics tabs/.test(m.text())) warns.push(m.text()); });
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
          catch (e) { return r.fulfill({ status: 404, body: '', headers: hdr }); }
        }
        return r.abort();
      });
      await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
      try { await p.waitForSelector('#cc-heartbeat.hb-m-ready', { timeout: 12000 }); } catch (e) {}
      const tab = async v => { await p.evaluate(x => document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="' + x + '"]').click(), v); await p.waitForTimeout(600); };
      const click = async q => { await p.evaluate(x => { const e = document.querySelector(x); if (!e) throw Error('missing ' + x); e.scrollIntoView({ block: 'center' }); e.click(); }, q); await p.waitForTimeout(600); };
      const state = () => p.evaluate(() => ({
        sel: (document.getElementById('dx-p') || {}).value, on: [...document.querySelectorAll('#ccs-main .cat-chip[aria-pressed="true"]')].map(e => e.textContent),
        period: (document.querySelector('#ccs-main .cat-page > .dx-period') || {}).textContent || '', more: (document.querySelector('#ccs-main .cat-tools > .dx-ftoggle') || {}).textContent,
        panel: !!document.querySelector('#ccs-main .cat-tools > .dx-filters:not(.is-closed)'), details: (document.querySelector('#ccs-main .cat-more') || {}).open,
        title: (document.querySelector('#ccs-main .cat-title h2') || {}).textContent, sheet: !!document.querySelector('#ccs-sheet') && document.querySelector('#ccs-sheet').innerText.length > 20,
        screen: (document.getElementById('ccs-main') || {}).getAttribute && document.getElementById('ccs-main').getAttribute('data-screen')
      }));

      await tab('sl');
      let s = await state();
      check(label + ': Cake sales opens on Since launch', s.title === 'Cake sales' && s.sel === 'all' && s.on.join() === 'Since launch', s);
      await click('#ccs-main [data-cat-p="d30"]'); s = await state();
      check(label + ': 30 days chip sets the period', s.sel === 'd30' && s.on.join() === '30 days' && /Compared with|to/.test(s.period), s);
      await click('#ccs-main [data-cat-p="7"]'); s = await state();
      check(label + ': 7 days chip sets a 7-day period', s.sel === 'c' && s.on.join() === '7 days', s);
      await click('#ccs-main [data-cat-p="3m"]'); s = await state();
      check(label + ': 90 days chip sets the period', s.sel === '3m' && s.on.join() === '90 days', s);
      await click('#ccs-main .cat-tools > .dx-ftoggle'); s = await state();
      check(label + ': More filters opens the filters', s.panel, s);
      await p.evaluate(() => { const e = document.getElementById('dx-ch'); e.value = e.options[1].value; e.dispatchEvent(new Event('change', { bubbles: true })); });
      await p.waitForTimeout(600); s = await state();
      check(label + ': a chosen filter is counted on the More filters button', /More filters · 1 on/.test(s.more || ''), s);
      await p.evaluate(() => { const e = document.getElementById('dx-ch'); e.value = 'all'; e.dispatchEvent(new Event('change', { bubbles: true })); });
      await p.waitForTimeout(600);
      await click('#ccs-main [data-cat-p="all"]');
      await click('#ccs-main .cat-more > summary'); s = await state();
      check(label + ': Details opens', s.details === true, s);
      await click('#ccs-main [data-cat-p="d30"]'); s = await state();
      check(label + ': Details stays open when the period changes', s.details === true, s);
      await click('#ccs-main [data-cat-p="all"]');
      await click('#ccs-main .cat-kpis > button.cat-k'); s = await state();
      check(label + ': tapping a figure opens its orders', s.sheet, s);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.evaluate(() => { const c = document.querySelector('#ccs-sheet [data-act="close"],#ccs-sheet .ccs-x,#ccs-sheet button[aria-label="Close"]'); c && c.click(); });
      await p.waitForTimeout(400);
      await click('#ccs-main .cat-flag [data-act="dx-bi-go"]');
      s = await state();
      check(label + ': "See what is needed" opens Data', s.title === 'Data', s);

      for (const t of ['pd', 'cu', 'pl']) {
        await tab(t); s = await state();
        const k = await p.evaluate(() => ({ tiles: document.querySelectorAll('#ccs-main .cat-kpis > .cat-k').length, todo: !!document.querySelector('#ccs-main .cat-todo:not([hidden]) .cci-card') }));
        check(label + ': the ' + s.title + ' tab shows its figures and what to do', k.tiles === 4 && k.todo, k);
      }
      await tab('sd');
      let o = await p.evaluate(() => ({ curve: [...document.querySelectorAll('#ccs-main h3')].some(e => e.textContent.trim() === 'Booking curve'), seg: [...document.querySelectorAll('#ccs-main .cat-seg .cat-chip')].map(e => e.textContent + ':' + e.getAttribute('aria-pressed')) }));
      check(label + ': Occasions opens on all occasions with the Booking curve', o.curve && o.seg[0] === 'All occasions:true', o);
      await click('#ccs-main .cat-seg [data-v="or"]');
      o = await p.evaluate(() => ({ report: !!document.querySelector('#ccs-main .or-wrap .or-body'), text: (document.querySelector('#ccs-main .or-body') || {}).innerText || '' }));
      check(label + ': the one-occasion report opens', o.report && /orders for/.test(o.text), o.report);
      await click('#ccs-main .cat-seg [data-v="oi"]');
      o = await p.evaluate(() => [...document.querySelectorAll('#ccs-main h3')].some(e => e.textContent.trim() === 'Booking curve'));
      check(label + ': back to all occasions, the Booking curve is there', o);

      await tab('sl');
      await click('#ccs-main .cat-page > .dx-period [data-act="dx-old"]'); s = await state();
      check(label + ': with older orders shown, the first chip reads All time', s.on.join() === 'All time' && /Including orders from before the launch/.test(s.period), s);
      for (const t of ['pd', 'cu', 'pl', 'sd', 'da']) { await tab(t); }
      const bad = await p.evaluate(() => (document.getElementById('ccs-main').innerText.match(/undefined|NaN/g) || []).length);
      check(label + ': every tab still renders with older orders included', bad === 0 && warns.length === 0, { bad, warns });
      await tab('sl');
      await click('#ccs-main .cat-page > .dx-period [data-act="dx-old"]'); s = await state();
      check(label + ': back to counting from the launch', s.on.join() === 'Since launch', s);

      await tab('pl');
      const todo = await p.evaluate(() => !!document.querySelector('#ccs-main .cat-todo [data-cat-go="orders"]'));
      if (todo) { await click('#ccs-main .cat-todo [data-cat-go="orders"]'); s = await state(); check(label + ': Open Orders from What to do goes to Orders', s.screen !== 'dash', s); }
      check(label + ': no script errors or fallbacks' + (errors.length ? ' ' + errors.join(' | ') : ''), errors.length === 0 && warns.length === 0, warns);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
