// New order: "Came from a promotion?" (Marketing campaigns, 20 October 2026). Only campaigns running today are offered;
// one tap picks, a second tap clears; the order is saved first, then the promotion is recorded once with
// order_set_campaign; no tap, no call; a failure says the order is saved but the promotion was not; the order's history
// names the promotion. Staff bundle from BUNDLE env or dist/app/staff-campaigns-manifest.json, mock data only.
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const bundle = process.env.BUNDLE || JSON.parse(fs.readFileSync(path.join(root, 'dist/app/staff-campaigns-manifest.json'), 'utf8')).file;
let n = 0, fails = 0;
const OK = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];   // known in this harness, as in run_form_ease
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const CAMPS = [
  { id: 'cp1', code: 'mothers-day-2026', name: "Mother's Day cakes", starts_on: fiji(-4), ends_on: fiji(10), channels: ['facebook'], spend: 150, occasion: 'mothers_day', created_by: 'Test Manager', removed: false },
  { id: 'cp2', code: 'christmas-cakes-2026', name: 'Christmas cakes', starts_on: fiji(5), ends_on: fiji(60), channels: ['print'], spend: null, occasion: 'christmas', created_by: 'Test Manager', removed: false },
  { id: 'cp3', code: 'spring-sale-2026', name: 'Spring sale', starts_on: fiji(-60), ends_on: fiji(-30), channels: [], spend: 80, occasion: null, created_by: 'Test Manager', removed: false },
  { id: 'cp4', code: 'school-holidays-2026', name: 'School holidays', starts_on: fiji(0), ends_on: fiji(0), channels: [], spend: null, occasion: null, created_by: 'Test Manager', removed: false }];
async function page(b, w, h, pre) {
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }), errors = [];
  p.on('pageerror', e => { if (!OK.includes(e.message)) errors.push(e.message); });
  await p.route('https://**', r => r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');
  await p.evaluate(pre => { window.__role = 'manager'; try { localStorage.clear(); } catch (e) {} new Function(pre)(); }, pre || '');
  await p.addScriptTag({ path: path.join(root, 'test/mock.js') });
  await p.addScriptTag({ path: path.join(root, bundle) });
  await p.waitForTimeout(500);
  return { p, errors };
}
const js = async (p, s) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s); await p.waitForTimeout(250); return ok; };
const calls = (p, fn) => p.evaluate(fn => window.__calls.filter(c => c[1] === fn).map(c => c[2]), fn);
async function newOrder(p) {
  await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab=new]')].pop(); e && e.click(); }); await p.waitForTimeout(700);
  await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
  await js(p, '[data-act="sl-opt"][data-v="no"]'); await js(p, '[data-act="n-source"][data-v="phone"]'); await js(p, '[data-act="n-taken"][data-v="now"]');
}
async function finish(p) {
  await js(p, '[data-act="sl-next"]'); await js(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '[data-act="n-diet"][data-v="no"]'); await js(p, '[data-act="n-occ"][data-v="Birthday"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');
  if (!(await p.$('#sl-st-3 [data-act="n-time"]'))) await js(p, '[data-act="sl-next"]');   // phones show the times after Next
  await js(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '[data-act="n-plan"][data-v="later"]'); await js(p, '[data-nc="confirmNow"]'); await js(p, '[data-act="n-submit"]'); await p.waitForTimeout(1100);
  if (process.env.DEBUG) console.log((await p.evaluate(() => (document.getElementById('ccs-sheet') || {}).innerText || '')).slice(0, 1500));
}
const chipState = p => p.evaluate(() => { const box = document.querySelector('#cc-staff [data-ccp-slot]');
  return { slot: !!box, q: box ? (box.querySelector('.sl-k') || {}).textContent || '' : '', chips: box ? [...box.querySelectorAll('[data-ccp]')].map(b => b.textContent + '=' + b.getAttribute('aria-pressed')) : [],
    tall: box ? [...box.querySelectorAll('[data-ccp]')].every(b => b.getBoundingClientRect().height >= 40) : false }; });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, label] of [[1024, 768, 'tablet'], [390, 844, 'phone']]) {
      const { p, errors } = await page(b, w, h, 'window.__camps=' + JSON.stringify(CAMPS) + ';');
      await newOrder(p);
      let s = await chipState(p);
      check(label + ': the Customer step asks "Came from a promotion?" with only the campaigns running today', /Came from a promotion\?/.test(s.q) && /Optional/.test(s.q) && s.chips.join('|') === "Mother's Day cakes=false|School holidays=false", s);
      check(label + ': the promotion buttons are easy to tap', s.tall, s);
      await js(p, '#cc-staff [data-ccp="mothers-day-2026"]');
      s = await chipState(p);
      check(label + ': one tap picks the promotion', s.chips.join('|') === "Mother's Day cakes=true|School holidays=false", s);
      await js(p, '#cc-staff [data-ccp="school-holidays-2026"]');
      s = await chipState(p);
      check(label + ': another tap moves the pick', s.chips.join('|') === "Mother's Day cakes=false|School holidays=true", s);
      await js(p, '#cc-staff [data-ccp="school-holidays-2026"]');
      s = await chipState(p);
      check(label + ': tapping it again clears it', s.chips.join('|') === "Mother's Day cakes=false|School holidays=false", s);
      await js(p, '#cc-staff [data-ccp="mothers-day-2026"]');
      if (process.env.SHOTS) { await p.evaluate(() => { const e = document.querySelector('#cc-staff [data-ccp-slot]'); e && e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(process.env.SHOTS, 'chips-' + label + '.png') }); }
      // the pick survives moving through the steps and back
      await js(p, '[data-act="sl-next"]'); await js(p, '[data-act="sl-back"]');
      s = await chipState(p);
      check(label + ': going forward and back keeps the pick', s.chips.join('|') === "Mother's Day cakes=true|School holidays=false", s);
      await finish(p);
      const made = await calls(p, 'staff_create_order'), tagged = await calls(p, 'order_set_campaign');
      check(label + ': the order is saved once, then the promotion is recorded once', made.length === 1 && tagged.length === 1 && tagged[0].p_order === 'o9' && tagged[0].p_code === 'mothers-day-2026', { made: made.length, tagged });
      check(label + ': the promotion is not part of the order itself', made.length === 1 && !('campaign' in made[0].p), made[0] && Object.keys(made[0].p));
      check(label + ': no script errors', errors.length === 0, errors);
      await p.close();
    }
    {
      const { p, errors } = await page(b, 1024, 768, 'window.__camps=' + JSON.stringify(CAMPS) + ';');
      await newOrder(p); await finish(p);
      check('no tap: the order is saved and no promotion is recorded', (await calls(p, 'staff_create_order')).length === 1 && (await calls(p, 'order_set_campaign')).length === 0);
      check('no tap: no script errors', errors.length === 0, errors);
      await p.close();
    }
    {
      const { p, errors } = await page(b, 1024, 768, 'window.__campNone=true;');
      await newOrder(p);
      const s = await chipState(p);
      check('no campaigns running: no promotion question', s.chips.length === 0 && !s.q, s);
      await finish(p);
      check('no campaigns running: the order is saved as before', (await calls(p, 'staff_create_order')).length === 1 && (await calls(p, 'order_set_campaign')).length === 0);
      check('no campaigns running: no script errors', errors.length === 0, errors);
      await p.close();
    }
    {
      const { p, errors } = await page(b, 1024, 768, 'window.__camps=' + JSON.stringify(CAMPS) + ';');
      await newOrder(p); await js(p, '#cc-staff [data-ccp="mothers-day-2026"]');
      await p.evaluate(() => { window.__camps[0].removed = true; });          // removed by a manager meanwhile
      await finish(p);
      const t = await p.evaluate(() => (document.getElementById('ccs-toast') || {}).textContent || '');
      check('promotion not recorded: the order is saved and staff are told', (await calls(p, 'staff_create_order')).length === 1 && /Order saved, but the promotion was not recorded: That campaign no longer exists/.test(t), t);
      check('promotion not recorded: no script errors', errors.length === 0, errors);
      await p.close();
    }
    {
      const { p, errors } = await page(b, 1366, 1024, 'window.__camps=' + JSON.stringify(CAMPS) + ';');
      await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab=orders]')].pop(); e && e.click(); }); await p.waitForTimeout(700);
      await js(p, '[data-act="filter"][data-v="upcoming"]');
      const id = await p.evaluate(() => { const c = document.querySelector('#ccs-main [data-act="open-order"][data-id]'); return c ? c.dataset.id : null; });
      await p.evaluate(id => { const o = window.__orders.filter(x => x.id === id)[0]; o.order_events = (o.order_events || []).concat([{ at: new Date().toISOString(), kind: 'campaign', actor_label: 'Test Manager', detail: { code: 'mothers-day-2026', name: "Mother's Day cakes" } }]); }, id);
      await p.evaluate(id => { document.querySelector('#ccs-main [data-act="open-order"][data-id="' + id + '"]').click(); }, id); await p.waitForTimeout(800);
      await js(p, '#ccs-sheet [data-act="secgo"][data-v="history"]'); await p.waitForTimeout(300);
      await js(p, '#ccs-sheet [data-act="history"]'); await p.waitForTimeout(300);
      const hist = await p.evaluate(() => (document.querySelector('#ccs-sheet .ccs-history') || {}).innerText || '');
      check("history: the order's history names the promotion", /Came from the promotion Mother's Day cakes · Test Manager/.test(hist), hist.slice(0, 300));
      check('history: no script errors', errors.length === 0, errors);
      await p.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
