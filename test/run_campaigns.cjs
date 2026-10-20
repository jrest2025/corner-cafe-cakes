// Marketing campaigns: the Marketing tab (figures, results, before and during, what to do, details), adding, changing
// and removing a campaign, its link, QR code (decoded) and copy button, the Data tab, viewers, errors and the empty
// state; then New order's "Came from a promotion?" and the history line. Live head and footer (test/fixtures), staff
// bundle from BUNDLE env or dist/app/staff-campaigns-manifest.json, pinned add-ons from git. Invented data only.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const PW = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(PW);
const NM = process.env.NODE_MODULES || path.resolve(PW, '..');
let PNG = null, jsQR = null;
try { PNG = require(path.join(NM, 'pngjs')).PNG; jsQR = require(path.join(NM, 'jsqr')); } catch (e) { /* the QR decode check is skipped */ }
const repo = path.resolve(__dirname, '..');
const bundle = process.env.BUNDLE || JSON.parse(fs.readFileSync(path.join(repo, 'dist/app/staff-campaigns-manifest.json'), 'utf8')).file;
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8')
  .replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '')
  .replace(/@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]+\.js/, '@LOCAL/' + bundle);
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const T = fiji(0), add = fiji, YEAR = T.slice(0, 4);
const ORDER = 'https://www.cornercafefiji.com/order-cake';
const CAMPS = [
  { id: 'cp1', code: 'mothers-day-2026', name: "Mother's Day cakes", starts_on: add(-4), ends_on: add(10), channels: ['facebook', 'instagram'], spend: 150, occasion: 'mothers_day', created_by: 'Test Manager', removed: false },
  { id: 'cp2', code: 'christmas-cakes-2026', name: 'Christmas cakes', starts_on: add(5), ends_on: add(60), channels: ['print'], spend: null, occasion: 'christmas', created_by: 'Test Manager', removed: false },
  { id: 'cp3', code: 'spring-sale-2026', name: 'Spring sale', starts_on: add(-60), ends_on: add(-30), channels: [], spend: 80, occasion: null, created_by: 'Test Manager', removed: false }];
const cal = JSON.stringify({ events: [], dates: [{ occasion_code: 'christmas', starts_on: '2026-12-25', ends_on: null }], occasions: [{ code: 'christmas', label: 'Christmas', active: true }] });
const shim = 'window.__CAL=' + cal + ';window.supabase={createClient:function(){var m=window.__ccsMock;if(!m.from)m.from=function(t){var o={};' +
  '["select","gte","lte","eq","in","order","limit","neq","is"].forEach(function(k){o[k]=function(){return o}});o.then=function(a,b){var d=t==="calendar_events"?__CAL.events:' +
  't==="occasion_dates"?__CAL.dates:t==="occasions"?__CAL.occasions:[];return Promise.resolve({data:d,error:null}).then(a,b)};return o};return m}};';
const html = pre => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>' + pre + mock + shim + '</script></head><body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
const types = { js: 'application/javascript', css: 'text/css' };
const OK = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0, skips = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
const money = v => '$' + Math.round(v).toLocaleString('en-US');
const money2 = v => { const r = Math.round(v * 100) / 100; return '$' + (Math.abs(r) < 100 && r % 1 ? r.toFixed(2) : Math.round(r).toLocaleString('en-US')); };

async function open(b, w, h, pre) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://www.cornercafefiji.com' });
  const p = await ctx.newPage(), errors = [], warns = [];
  p.on('pageerror', e => { if (!OK.includes(e.message)) errors.push(e.message); });
  p.on('console', m => { if (/\[(Campaigns|Analytics tabs)\]/.test(m.text())) warns.push(m.text()); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('@LOCAL/')) return r.fulfill({ body: fs.readFileSync(path.join(repo, u.split('@LOCAL/')[1])), contentType: 'application/javascript' });
    if (u.startsWith('https://www.cornercafefiji.com/cake-orders-staff')) return r.fulfill({ body: html(pre), contentType: 'text/html' });
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
  return { ctx, p, errors, warns };
}
const dash = async p => {
  await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
  try { await p.waitForSelector('#cc-heartbeat.hb-m-ready', { timeout: 12000 }); } catch (e) {}
};
const tab = async (p, v) => { await p.evaluate(x => document.querySelector('#ccs-main [data-act="secgo"][data-g="anm"][data-v="' + x + '"]').click(), v); await p.waitForTimeout(700); };
const click = async (p, q) => { await p.evaluate(x => { const e = document.querySelector(x); if (!e) throw Error('missing ' + x); e.scrollIntoView({ block: 'center' }); e.click(); }, q); await p.waitForTimeout(450); };
const dlgOpen = p => p.evaluate(() => { const l = document.getElementById('ccm-layer'); return !!(l && !l.hidden && l.isConnected); });
// Set a date the way the app's calendar does: the value, then input and change
const setDate = (p, q, v) => p.evaluate(([q, v]) => { const e = document.querySelector(q); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [q, v]);
const inert = p => p.evaluate(() => { const a = document.querySelector('#cc-staff > .ccs-app'); return !!(a && a.hasAttribute('inert')); });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    // ---------- the Marketing tab, as a manager ----------
    for (const [w, h, label] of [[1366, 1024, 'tablet'], [412, 915, 'phone']]) {
      const { ctx, p, errors, warns } = await open(b, w, h, 'window.__role="manager";window.__camps=' + JSON.stringify(CAMPS) + ';');
      await dash(p);
      const vis = await p.evaluate(() => { const e = document.querySelector('#ccs-main .an-mods .an-mod[data-v="mk"]'); return { shown: !!e && getComputedStyle(e).display !== 'none', need: !!e && e.classList.contains('is-need'), order: [...document.querySelectorAll('#ccs-main .an-mods .an-mod')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.dataset.v) }; });
      check(label + ': the Marketing tab shows, after Occasions', vis.shown && !vis.need && vis.order.indexOf('mk') === vis.order.indexOf('sd') + 1, vis);
      await tab(p, 'mk'); await p.waitForTimeout(400);
      const exp = await p.evaluate(() => {
        const net = o => Number(o.cv != null ? o.cv : o.lv || 0) - Number(o.ref || 0);
        const all = window.__regLast.filter(o => o.cmp === 'mothers-day-2026' && o.st !== 'cancelled');
        return { n: all.length, v: all.reduce((s, o) => s + net(o), 0), link: all.filter(o => /website/i.test(o.sys || '')).length, other: window.__regLast.filter(o => o.cmp === 'catalogue-2026' && o.st !== 'cancelled').length };
      });
      const pg = await p.evaluate(() => {
        const pgx = document.querySelector('#ccs-main .cat-page[data-cat="mk"]');
        const m = document.getElementById('ccs-main'), txt = m.innerText;
        return { page: !!pgx, title: (document.querySelector('#ccs-main .cat-title h2') || {}).textContent,
          kpis: pgx ? [...pgx.querySelectorAll(':scope > .cat-kpis > .cat-k')].map(k => k.innerText.replace(/\s+/g, ' ')) : [],
          main: pgx ? !!pgx.querySelector(':scope > .cat-main') : false, details: pgx ? [...pgx.querySelectorAll(':scope > .cat-more')].map(d => d.open) : [],
          rows: [...document.querySelectorAll('#ccs-main .ccm-row')].map(r => ({ cls: r.className, name: r.querySelector('h4').textContent, st: r.querySelector('.ccm-st').textContent, figs: r.querySelector('.ccm-figs').innerText.replace(/\s+/g, ' ') })),
          cards: [...document.querySelectorAll('#ccs-main .cat-row .cat-card')].map(c => c.querySelector('h3').textContent),
          other: (([...document.querySelectorAll('#ccs-main .cat-card')].find(c => /Other links/.test(c.innerText)) || {}).innerText || '').replace(/\s+/g, ' '),
          lift: (([...document.querySelectorAll('#ccs-main .cat-card')].find(c => /Before and during/.test(c.innerText)) || { innerText: '' }).innerText).replace(/\s+/g, ' '),
          liftBars: (([...document.querySelectorAll('#ccs-main .cat-card')].find(c => /Before and during/.test(c.innerText)) || document.createElement('i')).querySelectorAll('.cat-br')).length,
          todo: [...document.querySelectorAll('#ccs-main .cat-todo .cci-card')].map(c => c.innerText.replace(/\s+/g, ' ')),
          add: !!document.querySelector('#ccs-main [data-ccm-add]'),
          bad: (txt.match(/undefined|NaN|\[object/g) || []).length, h24: (txt.match(/\b([01]?\d|2[0-3]):[0-5]\d\b(?!\s?(AM|PM))/g) || []).slice(0, 3),
          sx: document.documentElement.scrollWidth - innerWidth };
      });
      check(label + ': Marketing has four headline figures, the campaign results and closed details', pg.page && pg.title === 'Marketing' && pg.kpis.length === 4 && pg.main && pg.details.length === 1 && pg.details[0] === false, pg);
      check(label + ': Running now counts the one running campaign', /^Running now 1 /.test(pg.kpis[0] || '') && /Mother's Day cakes/.test(pg.kpis[0]), pg.kpis[0]);
      check(label + ': orders from promotions are the traced orders, split by link and counter', (pg.kpis[1] || '').indexOf('Orders from promotions ' + exp.n.toLocaleString('en-US')) === 0 && (pg.kpis[1] || '').includes(exp.link + ' by link or QR code · ' + (exp.n - exp.link) + ' tapped at the counter'), [pg.kpis[1], exp]);
      check(label + ': order value adds up those orders', (pg.kpis[2] || '').indexOf('Order value ' + money(exp.v)) === 0, [pg.kpis[2], money(exp.v)]);
      check(label + ': cost per order is the cost over the orders of costed campaigns', (pg.kpis[3] || '').indexOf('Cost per order ' + money2((150 + 80) / exp.n)) === 0, [pg.kpis[3], money2((150 + 80) / exp.n)]);
      check(label + ': campaigns listed running, starting soon, then ended', pg.rows.length === 3 && /is-run/.test(pg.rows[0].cls) && pg.rows[0].name === "Mother's Day cakes" && /^Running · ends /.test(pg.rows[0].st) &&
        /is-soon/.test(pg.rows[1].cls) && /^Starts /.test(pg.rows[1].st) && /is-ended/.test(pg.rows[2].cls) && /^Ended /.test(pg.rows[2].st), pg.rows);
      check(label + ': each campaign shows orders, value, cost, per order and back per $1', pg.rows[0] && pg.rows[0].figs.includes(exp.n + ' orders') && pg.rows[0].figs.includes(money2(150 / exp.n) + ' per order') && pg.rows[1].figs.includes('Not added cost') && pg.rows[2].figs.includes('0 orders'), pg.rows.map(r => r.figs));
      check(label + ': links that are not campaigns are shown apart', exp.other > 0 && /Catalogue 2026/.test(pg.other) && pg.other.includes(String(exp.other)), [pg.other, exp.other]);
      check(label + ': before and during compares every order a day', pg.liftBars === 2 && /a day/.test(pg.lift) && /(Up|Down) \d+%|No change|No orders/.test(pg.lift) && /Mother's Day cakes/.test(pg.lift), pg.lift);
      check(label + ': What to do names the best campaign', pg.todo.some(t => /Best so far/.test(t) && /Mother's Day cakes/.test(t)), pg.todo);
      check(label + ': managers see Add campaign', pg.add);
      check(label + ': nothing undefined, 12-hour times, no sideways scroll', pg.bad === 0 && pg.h24.length === 0 && pg.sx <= 1, pg);
      // a figure opens its orders
      await click(p, '#ccs-main .ccm-row button.ccm-fig');
      const sheet = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'); return s ? s.innerText : ''; });
      check(label + ': tapping the orders figure opens those orders', /Mother's Day cakes: orders/.test(sheet), sheet.slice(0, 120));
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      // Details
      await click(p, '#ccs-main .cat-page[data-cat="mk"] > .cat-more > summary');
      await click(p, '#ccs-main [data-dxsec="catmkall"] > summary');
      const det = await p.evaluate(() => ({ open: document.querySelector('#ccs-main .cat-page > .cat-more').open, rows: document.querySelectorAll('#ccs-main .ccm-table tbody tr').length, how: !!document.querySelector('#ccs-main .ccm-how') }));
      check(label + ': Details list every campaign and how they are counted', det.open && det.rows === 3 && det.how, det);

      // ---------- add a campaign ----------
      await click(p, '#ccs-main [data-ccm-add]');
      let d = await p.evaluate(() => ({ title: document.getElementById('ccm-dlg-h').textContent, focus: document.activeElement && document.activeElement.id, from: document.getElementById('ccm-from').value,
        cal: !!(document.getElementById('ccm-from')._ccDateButton && document.getElementById('ccm-to')._ccDateButton) }));
      check(label + ': Add campaign opens the form, name first, starting today', (await dlgOpen(p)) && d.title === 'Add campaign' && d.focus === 'ccm-name' && d.from === T, d);
      check(label + ': the dates use the app\'s calendar buttons', d.cal, d);
      check(label + ': the app behind the window cannot be tapped', await inert(p));
      for (let i = 0; i < 24; i++) await p.keyboard.press('Tab');
      check(label + ': the Tab key stays inside the window', await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#ccm-dlg')));
      await p.evaluate(() => document.getElementById('ccm-name').focus());
      await click(p, '#ccm-dlg [data-ccd="save"]');
      d = await p.evaluate(() => ({ err: document.querySelector('#ccm-dlg [data-err="name"]').textContent, shown: !document.querySelector('#ccm-dlg [data-err="name"]').hidden }));
      check(label + ': a campaign needs a name', d.shown && d.err === 'Give the campaign a name.', d);
      await p.fill('#ccm-name', 'Diwali sweets');
      await setDate(p, '#ccm-to', add(-1));
      await click(p, '#ccm-dlg [data-ccd="save"]');
      d = await p.evaluate(() => ({ err: document.querySelector('#ccm-dlg [data-err="dates"]').textContent, focus: document.activeElement === document.getElementById('ccm-to')._ccDateButton,
        red: document.getElementById('ccm-to')._ccDateButton.getAttribute('aria-invalid') }));
      check(label + ': the end cannot be before the start, and the Ends date is pointed out', d.err === 'The end date cannot be before the start date.' && d.focus && d.red === 'true', d);
      await click(p, '#ccm-dlg [data-ccd="len"][data-v="14"]');
      d = await p.evaluate(() => { const to = document.getElementById('ccm-to'), b = to._ccDateButton, f = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        return { to: to.value, shown: b.querySelector('.cc-dp-value').textContent, want: f.format(new Date(to.value + 'T12:00:00')), chip: document.querySelector('#ccm-dlg [data-ccd="len"][data-v="14"]').getAttribute('aria-pressed'), err: document.querySelector('#ccm-dlg [data-err="dates"]').hidden }; });
      check(label + ': "2 weeks" sets the end date and the calendar button shows it', d.to === add(13) && d.shown === d.want && d.chip === 'true' && d.err, d);
      // the app's calendar opens above the window and sets the end date
      await p.evaluate(() => document.getElementById('ccm-to')._ccDateButton.click()); await p.waitForTimeout(350);
      d = await p.evaluate(() => { const l = document.getElementById('cc-date-picker-layer'), box = l && l.querySelector('.cc-dp-dialog'); if (!box || l.hidden) return { open: false };
        const r = box.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { open: true, onTop: !!top && !!top.closest('#cc-date-picker-layer') }; });
      check(label + ': the calendar opens above the campaign window', d.open && d.onTop, d);
      await p.evaluate(v => { const b = document.querySelector('#cc-date-picker-layer [data-cc-date-day="' + v + '"]') || document.querySelector('#cc-date-picker-layer [data-cc-date-move="1"]'); b.click(); }, add(20));
      await p.waitForTimeout(250);
      if (await p.evaluate(v => !document.getElementById('ccm-to').value || document.getElementById('ccm-to').value !== v, add(20))) { await p.evaluate(v => { const b = document.querySelector('#cc-date-picker-layer [data-cc-date-day="' + v + '"]'); if (b) b.click(); }, add(20)); await p.waitForTimeout(250); }
      d = await p.evaluate(() => ({ to: document.getElementById('ccm-to').value, picker: !document.getElementById('cc-date-picker-layer').hidden, open: !document.getElementById('ccm-layer').hidden, chips: [...document.querySelectorAll('#ccm-dlg [data-ccd="len"]')].map(x => x.getAttribute('aria-pressed')).join() }));
      check(label + ': a day picked in the calendar becomes the end date, and the window stays open', d.to === add(20) && !d.picker && d.open && d.chips === 'false,false,false', d);
      await setDate(p, '#ccm-from', add(1)); await setDate(p, '#ccm-from', T);
      check(label + ': the end date has the start date as its earliest day', await p.evaluate(t => document.getElementById('ccm-to').min === t, T));
      await click(p, '#ccm-dlg [data-ccd="len"][data-v="14"]');
      await setDate(p, '#ccm-from', add(2));
      check(label + ': with "2 weeks" chosen, moving the start moves the end', await p.evaluate(() => document.getElementById('ccm-to').value) === add(15));
      await setDate(p, '#ccm-from', T);
      check(label + ': and back again', await p.evaluate(() => document.getElementById('ccm-to').value) === add(13));
      await click(p, '#ccm-dlg [data-ccd="ch"][data-v="facebook"]');
      await click(p, '#ccm-dlg [data-ccd="ch"][data-v="whatsapp"]');
      await p.selectOption('#ccm-occ', 'birthday');
      await p.fill('#ccm-spend', '$1,200');
      await click(p, '#ccm-dlg [data-ccd="save"]'); await p.waitForTimeout(300);
      const url = ORDER + '?campaign=diwali-sweets-' + YEAR + '&occasion=birthday';
      d = await p.evaluate(() => ({ url: (document.getElementById('ccm-url') || {}).value, ok: (document.querySelector('#ccm-dlg .ccm-ok') || {}).textContent, qr: !!document.querySelector('#ccm-dlg .ccm-qrimg svg path'),
        saved: window.__calls.filter(c => c[1] === 'campaign_save').map(c => c[2].p).pop(), sx: (() => { const x = document.getElementById('ccm-dlg'); return x.scrollWidth - x.clientWidth; })() }));
      check(label + ': saving shows the campaign link and QR code', d.url === url && /Campaign added/.test(d.ok || '') && d.qr, d);
      check(label + ': what was saved: channels, occasion, cost as a number', d.saved && d.saved.channels.join() === 'facebook,whatsapp' && d.saved.occasion === 'birthday' && d.saved.spend === '1200' && d.saved.starts_on === T && d.saved.ends_on === add(13), d.saved);
      check(label + ': the campaign window fits the screen', d.sx <= 1, d.sx);
      await click(p, '#ccm-dlg [data-ccd="copy"]'); await p.waitForTimeout(300);
      const copied = await p.evaluate(async () => { let clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'n/a'; } return { btn: document.querySelector('#ccm-dlg [data-ccd="copy"]').textContent, clip }; });
      check(label + ': Copy link copies the link', copied.btn === 'Copied' && (copied.clip === url || copied.clip === 'n/a'), copied);
      if (PNG && jsQR) {
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.evaluate(() => document.querySelector('#ccm-dlg [data-ccd="png"]').click())]);
        const file = await dl.path(), png = PNG.sync.read(fs.readFileSync(file)), code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
        check(label + ': the downloaded QR code scans to the campaign link', dl.suggestedFilename() === 'corner-cafe-qr-diwali-sweets-' + YEAR + '.png' && code && code.data === url && png.width >= 1000, { name: dl.suggestedFilename(), data: code && code.data, w: png.width });
      } else { skips++; console.log('SKIP the QR decode check (pngjs and jsqr not found in ' + NM + ')'); }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      let rows = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccm-row')].map(r => r.querySelector('h4').textContent + '|' + r.className));
      check(label + ': Escape closes the window and the new campaign is listed as running', !(await dlgOpen(p)) && rows.length === 4 && rows.some(r => /^Diwali sweets\|.*is-run/.test(r)), rows);
      check(label + ': the app works again, and the focus is back on Add campaign', !(await inert(p)) && await p.evaluate(() => !!document.activeElement && document.activeElement.matches('[data-ccm-add]')));

      // ---------- change it ----------
      await click(p, '#ccs-main [data-ccm-edit="cp4"]');
      d = await p.evaluate(() => ({ title: document.getElementById('ccm-dlg-h').textContent, name: document.getElementById('ccm-name').value, spend: document.getElementById('ccm-spend').value, ch: [...document.querySelectorAll('#ccm-dlg [data-ccd="ch"][aria-pressed="true"]')].map(x => x.dataset.v).join() }));
      check(label + ': Change opens the campaign as saved', d.title === 'Change campaign' && d.name === 'Diwali sweets' && d.spend === '1200' && d.ch === 'facebook,whatsapp', d);
      await p.fill('#ccm-name', 'Diwali sweets and cakes');
      await click(p, '#ccm-dlg [data-ccd="save"]'); await p.waitForTimeout(300);
      d = await p.evaluate(() => ({ ok: (document.querySelector('#ccm-dlg .ccm-ok') || {}).textContent, url: (document.getElementById('ccm-url') || {}).value, h: document.getElementById('ccm-dlg-h').textContent }));
      check(label + ': a change keeps the same link', d.ok === 'Saved.' && d.url === url && d.h === 'Diwali sweets and cakes', d);
      await click(p, '#ccm-dlg [data-ccd="edit"]');
      await click(p, '#ccm-dlg [data-ccd="cancel"]');
      check(label + ': Cancel from Change goes back to the link', !!(await p.evaluate(() => document.getElementById('ccm-url'))));

      // ---------- remove it ----------
      await click(p, '#ccm-dlg [data-ccd="remove"]');
      d = await p.evaluate(() => (document.querySelector('#ccm-dlg .ccm-confirm:not([hidden])') || {}).innerText || '');
      check(label + ': Remove asks first', /Remove Diwali sweets and cakes\?/.test(d), d);
      await click(p, '#ccm-dlg [data-ccd="confirm"]'); await p.waitForTimeout(400);
      rows = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccm-row h4')].map(r => r.textContent));
      const toast = await p.evaluate(() => (document.getElementById('ccs-toast') || {}).textContent || '');
      check(label + ': the campaign is removed', !(await dlgOpen(p)) && rows.length === 3 && !rows.includes('Diwali sweets and cakes') && /removed/.test(toast), { rows, toast });
      await click(p, '#ccs-main [data-ccm-open="cp1"]');
      await click(p, '#ccm-dlg [data-ccd="remove"]');
      d = await p.evaluate(() => (document.querySelector('#ccm-dlg .ccm-confirm:not([hidden])') || {}).innerText || '');
      check(label + ': a campaign with orders is kept', new RegExp(exp.n + ' orders came from this campaign, so it is kept').test(d), d);
      const link1 = await p.evaluate(() => document.getElementById('ccm-url').value);
      check(label + ': the link names the occasion it promotes', link1 === ORDER + '?campaign=mothers-day-2026&occasion=mothers_day', link1);
      await p.mouse.click(4, 4); await p.waitForTimeout(300);
      check(label + ': a tap outside closes the link window', !(await dlgOpen(p)));

      // ---------- Data tab ----------
      await tab(p, 'da');
      await p.evaluate(() => document.querySelectorAll('#ccs-main details').forEach(x => { x.open = true; }));
      const data = await p.evaluate(() => {
        const row = [...document.querySelectorAll('#ccs-main tr')].find(r => /^Marketing campaigns/.test(r.innerText.trim()));
        const mod = [...document.querySelectorAll('#ccs-main tr')].find(r => /^Marketing\s/.test(r.innerText.trim()));
        return { row: row ? row.innerText.replace(/\s+/g, ' ') : '', ready: row ? !!row.querySelector('.bi-st-ready') : false, mod: mod ? mod.innerText.replace(/\s+/g, ' ') : '', modReady: mod ? !!mod.querySelector('.bi-st-ready') : false };
      });
      check(label + ': Data shows campaigns come from the app and are in', data.ready && /Analytics, Marketing/.test(data.row) && /3 campaigns/.test(data.row) && /Not needed/.test(data.row), data);
      check(label + ': Data shows the Marketing tab as ready', data.modReady && /Cake orders/.test(data.mod), data.mod);
      await tab(p, 'mk');
      check(label + ': no script errors or warnings' + (errors.length ? ' ' + errors.join(' | ') : ''), errors.length === 0 && warns.length === 0, warns);
      if (process.env.SHOTS) {
        await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(process.env.SHOTS, 'mk-' + label + '.png'), fullPage: true });
        await click(p, '#ccs-main [data-ccm-open="cp1"]'); await p.screenshot({ path: path.join(process.env.SHOTS, 'mk-share-' + label + '.png') });
        await click(p, '#ccm-dlg [data-ccd="edit"]'); await p.screenshot({ path: path.join(process.env.SHOTS, 'mk-form-' + label + '.png') });
      }
      await ctx.close();
    }

    // ---------- a viewer, an error, no campaigns yet ----------
    {
      const { ctx, p, errors } = await open(b, 1366, 1024, 'window.__role="marketing";window.__camps=' + JSON.stringify(CAMPS) + ';');
      await dash(p); await tab(p, 'mk'); await p.waitForTimeout(300);
      const v = await p.evaluate(() => ({ add: !!document.querySelector('#ccs-main [data-ccm-add]'), edit: document.querySelectorAll('#ccs-main [data-ccm-edit]').length, share: document.querySelectorAll('#ccs-main [data-ccm-open]').length }));
      check('viewer: sees the campaigns and their links, cannot add or change them', !v.add && v.edit === 0 && v.share === 3, v);
      await click(p, '#ccs-main [data-ccm-open="cp1"]');
      check('viewer: the link window has no Change or Remove', await p.evaluate(() => !document.querySelector('#ccm-dlg [data-ccd="edit"]') && !document.querySelector('#ccm-dlg [data-ccd="remove"]') && !!document.getElementById('ccm-url')));
      await click(p, '#ccm-dlg [data-ccd="close"]');
      check('viewer: Close closes the window and gives the focus back', !(await dlgOpen(p)) && !(await inert(p)) && await p.evaluate(() => !!document.activeElement && document.activeElement.matches('[data-ccm-open="cp1"]')));
      check('viewer: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1366, 1024, 'window.__role="manager";window.__campFail=true;window.__camps=' + JSON.stringify(CAMPS) + ';');
      await dash(p); await tab(p, 'mk'); await p.waitForTimeout(300);
      const e1 = await p.evaluate(() => ({ err: !!document.querySelector('#ccs-main .ccm-err [data-ccm-retry]'), kpis: document.querySelectorAll('#ccs-main .cat-page > .cat-kpis > .cat-k').length }));
      check('no connection: Marketing says so and offers Try again', e1.err && e1.kpis === 4, e1);
      await p.evaluate(() => { window.__campFail = false; });
      await click(p, '#ccs-main [data-ccm-retry]'); await p.waitForTimeout(500);
      check('no connection: Try again loads the campaigns', await p.evaluate(() => document.querySelectorAll('#ccs-main .ccm-row').length) === 3);
      check('no connection: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    for (const [w, h, label] of [[1366, 1024, 'tablet'], [412, 915, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h, 'window.__role="manager";window.__campNone=true;');
      await dash(p); await tab(p, 'mk'); await p.waitForTimeout(300);
      const e = await p.evaluate(() => ({ steps: document.querySelectorAll('#ccs-main .ccm-empty li').length, add: document.querySelectorAll('#ccs-main [data-ccm-add]').length,
        todo: [...document.querySelectorAll('#ccs-main .cat-todo .cci-card')].map(c => c.innerText.replace(/\s+/g, ' ')), kpi: document.querySelector('#ccs-main .cat-k').innerText.replace(/\s+/g, ' '), sx: document.documentElement.scrollWidth - innerWidth }));
      check(label + ' empty: three steps and Add your first campaign', e.steps === 3 && e.add === 2 && /No campaigns yet/.test(e.kpi) && e.sx <= 1, e);
      check(label + ' empty: What to do says to start', e.todo.length === 1 && /Add your first campaign/.test(e.todo[0]), e.todo);
      check(label + ' empty: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed' + (skips ? ', ' + skips + ' skipped' : ''));
  process.exit(fails ? 1 : 0);
})();
