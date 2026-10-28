// Old orders from paper slips, the duplicate warning, corrections after handover and a clear history (21 October 2026).
// Live head and footer (test/fixtures), with the staff app loader pointed at MANIFEST (default
// dist/app/staff-old-orders-manifest.json), as test/run_order_flow.cjs does. Invented data only (test/mock.js).
//  - New order starts with a choice: New order, or Old order (from a paper slip, already picked up).
//  - An old order: the date on the slip, who took it, no marketing question, no Birthday Club box, a pickup date before
//    today (no date buttons, no short notice), whether and when it was paid; saved in one call (staff_enter_old_order),
//    with nothing else sent (no separate order date, who-took-it or Birthday Club calls); the finish screen; the next one.
//  - Wrong years, a pickup date of today, an order date after the pickup date, a missing payment answer are stopped.
//  - A custom design is priced from the slip.
//  - Every order is checked for one already in the system: open it, go back, or save anyway; a failed check never
//    holds an order up; a New order checks a narrower window.
//  - Correct this order (handed-over orders only, needs Change order rights): no "who asked", "What was wrong?",
//    staff_correct_order, Save correction, and the history line with the old and new values.
//  - History lines in plain words, in the order they happened.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-old-orders-manifest.json'), 'utf8'));
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
let foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
if (!LOADER.test(foot)) throw new Error('The footer fixture has no staff app loader');
foot = foot.replace(LOADER, (m, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + manifest.file + '",' + h + ',k="' + manifest.sri + '"');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
const SHOTS = process.env.SHOTS || '';
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 900) : '')); } }
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const long = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/,/g, '');

async function open(b, w, h, o) {
  o = o || {};
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
    '<script>window.__role=' + JSON.stringify(o.role || 'manager') + ';window.__oldOrders=true;' + (o.pre || '') + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
  p.on('console', m => { if (/\[(Order flow|Birthday Club|Old orders)\]/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-semantic-colour-style', { timeout: 8000, state: 'attached' }); } catch (e) {}
  await p.waitForTimeout(1300);
  return { ctx, p, errors };
}
const tap = async (p, s, wait) => {
  const ok = await p.evaluate(s => {
    const all = [...document.querySelectorAll(s)], e = all.filter(x => x.getClientRects().length).pop() || all.pop();
    if (!e) return false;
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    e.click(); return true;
  }, s);
  await p.waitForTimeout(wait || 350); return ok;
};
const tabTo = (p, t) => tap(p, '#cc-staff [data-tab="' + t + '"]', 900);
const look = p => p.evaluate(() => {
  const main = document.querySelector('#ccs-slipform .sl-stepmain');
  return { step: main ? main.id : null, title: main ? main.querySelector('.sl-steptitle').textContent.trim() : null,
    errs: [...document.querySelectorAll('#ccs-slipform .ccs-err')].filter(e => e.getClientRects().length && !e.hidden).map(e => e.textContent.replace(/\s+/g, ' ').trim()) };
});
const text = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, s);
const shown = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length > 0), s);
const slipLine = (p, k) => p.evaluate(k => { const l = [...document.querySelectorAll('#ccs-slipform .sl-live .sl-ll')].filter(x => x.querySelector('.sl-lk').textContent.trim() === k)[0];
  return l ? l.querySelector('.sl-lv').textContent.replace(/\s+/g, ' ').trim() : null; }, k);
const calls = (p, fn) => p.evaluate(fn => window.__calls.filter(c => c[1] === fn).map(c => c[2]), fn);
const toastText = p => p.evaluate(() => { const t = document.getElementById('ccs-toast'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
async function shot(p, name, full) { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }); }
// Scroll the order sheet so that an element is at the top (for pictures)
const toTop = (p, s) => p.evaluate(s => { const e = document.querySelector(s), b = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (e && b) b.scrollTop += e.getBoundingClientRect().top - b.getBoundingClientRect().top - 12; }, s);
// A date as the date picker sets it (the picker hides the date box and sets it from its calendar)
async function fillDate(p, s, v) {
  await p.evaluate(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [s, v]);
  await p.waitForTimeout(350);
}
const dateLabel = (p, id) => text(p, 'label[data-cc-date-for="' + id + '"], label[for="' + id + '"]');

// An old order up to the last step: Mere took it on the slip date, picked up `pick` days ago
async function oldOrder(p, o) {
  o = o || {};
  await tap(p, '[data-oo-mode="old"]', 400);
  await tap(p, '[data-of-name]');
  await p.fill('#n-phone', o.phone || '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
  await tap(p, '[data-act="n-source"][data-v="walk_in"]');
  await fillDate(p, '#n-takedate', fiji(o.taken != null ? o.taken : -9));
  await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]');
  if (o.custom) { await tap(p, '[data-act="n-finish"][data-v="custom"]'); await p.fill('#n-design', 'Pink roses and a gold number 7'); await p.waitForTimeout(250); }
  await tap(p, '[data-act="sl-next"]');
  await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
  await fillDate(p, '#n-date', fiji(o.pick != null ? o.pick : -6));
  await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, label] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h);
      // ---------- The choice at the top ----------
      await tabTo(p, 'new'); await p.waitForTimeout(300);
      check(label + ': New order starts with the choice: New order (chosen) or Old order', await p.evaluate(() => {
        const g = document.querySelector('#sl-st-1 .oo-mode'); if (!g) return false;
        const b = [...g.querySelectorAll('[data-oo-mode]')].map(x => x.textContent.trim() + (x.getAttribute('aria-pressed') === 'true' ? '*' : ''));
        const first = [...document.querySelectorAll('#sl-st-1 .sl-stepbody > *')].filter(e => e.getClientRects().length)[0];
        return JSON.stringify(b) === JSON.stringify(['New orderThe customer is ordering now*', 'Old orderFrom a paper slip, already picked up']) && first && first.contains(g);
      }));
      check(label + ': the two choices are big enough to tap', await p.evaluate(() => [...document.querySelectorAll('.oo-mode-b')].every(x => x.getBoundingClientRect().height >= 56)));
      check(label + ': a New order is unchanged: "When did they order?" buttons and the marketing question', await shown(p, '[data-act="n-taken"]') && await shown(p, '[data-act="sl-opt"]') && !(await shown(p, '.oo-note')));
      await shot(p, label + '-01-choice');

      // ---------- Old order: the Customer step ----------
      await tap(p, '[data-oo-mode="old"]', 400);
      check(label + ': Old order is chosen, with a note saying what happens', await p.evaluate(() => document.querySelector('[data-oo-mode="old"]').getAttribute('aria-pressed') === 'true') &&
        /We save it as already picked up, with the payment on the day it was paid\. No kitchen slip, and nothing is sent to the customer/.test(await text(p, '.oo-note')));
      check(label + ': the sheet title says Old order from a paper slip', /Old order from a paper slip/.test(await text(p, '#ccs-sheet') || ''));
      check(label + ': "Who took this order?" (not "is taking")', /Who took this order\?/.test(await text(p, '[data-of-who]')) && /The name on the slip/.test(await text(p, '[data-of-who]')));
      check(label + ': + Add a name (not "my name")', /\+ Add a name/.test(await text(p, '[data-of-who]')));
      check(label + ': "When did they order?" is the date on the slip, required, with no Today/Yesterday buttons', await p.evaluate(() => {
        const k = document.querySelector('#sl-st-1 .tk-k'), i = document.getElementById('n-takedate');
        return !!k && /When did they order\?/.test(k.textContent) && /Required/.test(k.textContent) && !!i && i.type === 'date' && !document.querySelector('[data-act="n-taken"]') && /Date on the slip/.test(document.querySelector('label[data-cc-date-for="n-takedate"], label[for="n-takedate"]').textContent);
      }));
      check(label + ': the slip date cannot be today or later, nor before 2015', await p.evaluate(() => { const i = document.getElementById('n-takedate'); return i.min === '2015-01-01'; }) &&
        (await p.evaluate(() => document.getElementById('n-takedate').max)) === fiji(-1));
      check(label + ': no marketing question (nothing is recorded)', !(await shown(p, '[data-act="sl-opt"]')) && /Not asked on a paper slip, so nothing is recorded and nothing is sent/.test(await text(p, '.oo-consent')));
      check(label + ': no Birthday Club box', !(await shown(p, '#sl-st-1 .bc-join, #sl-st-1 [data-bc-join]')));
      // Next with nothing filled in
      await tap(p, '[data-act="sl-next"]', 500); let l = await look(p);
      check(label + ': Next without a name or slip date says so', l.step === 'sl-st-1' && l.errs.some(t => /whoever took the order/.test(t)) && l.errs.some(t => /date written on the slip/.test(t)), l);
      await tap(p, '[data-of-name]');
      await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
      await tap(p, '[data-act="n-source"][data-v="walk_in"]');
      await fillDate(p, '#n-takedate', fiji(0));
      await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': a slip date of today is stopped', l.step === 'sl-st-1' && l.errs.some(t => /should be before today/.test(t)), l);
      await fillDate(p, '#n-takedate', '0002-10-12');
      await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': a slip date in year 2 is stopped', l.step === 'sl-st-1' && l.errs.some(t => /date written on the slip/.test(t)), l);
      await fillDate(p, '#n-takedate', fiji(-9));
      check(label + ': once the date is chosen, the message asking for it goes', !(await look(p)).errs.length, await look(p));
      check(label + ': the slip shows the date on the slip, with its year', (await slipLine(p, 'Date')) === long(fiji(-9)) + 'Date on the slip', await slipLine(p, 'Date'));
      if (SHOTS) await p.waitForTimeout(2800);            // (the outline from the earlier Next fades first, for the picture)
      await shot(p, label + '-02-old-customer');
      await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': then the Cake step', l.step === 'sl-st-0', l);
      check(label + ': no "Ask the customer" tips in an old order', !(await shown(p, '.sl-ask')));
      await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]');
      await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
      l = await look(p);
      // ---------- Pickup date ----------
      check(label + ': the When step has no date buttons and no notice line, only the pickup date from the slip', l.step === 'sl-st-3' && !(await shown(p, '#sl-st-3 .ccs-datechips')) &&
        /Pickup date \(on the slip\)/.test(await dateLabel(p, 'n-date')) && (await p.evaluate(() => document.getElementById('n-date').max)) === fiji(-1), l);
      await fillDate(p, '#n-date', fiji(0)); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="20:00"]', 700); await tap(p, '[data-act="sl-next"]', 500);
      l = await look(p);
      check(label + ': a pickup date of today is stopped (that is a New order)', l.step === 'sl-st-3' && l.errs.some(t => /already picked up, so its date is before today/.test(t)), l);
      await fillDate(p, '#n-date', '0002-10-15'); await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': a pickup date in year 2 is stopped', l.step === 'sl-st-3' && l.errs.some(t => /Check the year on the pickup date/.test(t)), l);
      await fillDate(p, '#n-date', fiji(-12)); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 700); await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': a pickup date before the slip date is stopped', l.errs.some(t => /can't be after the pickup day/.test(t)), l);
      if (l.step !== 'sl-st-3') await tap(p, '#ccs-slipform [data-act="sl-goto"][data-v="3"]', 500);
      await fillDate(p, '#n-date', fiji(-6)); await shot(p, label + '-03-old-pickup');
      await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
      check(label + ': never short notice', !(await shown(p, '#n-rush')) && !/short notice/i.test(await slipLine(p, 'Pickup') || ''));
      check(label + ': the slip shows the pickup date with its year', new RegExp(fiji(-6).slice(0, 4)).test(await slipLine(p, 'Pickup') || ''), await slipLine(p, 'Pickup'));
      if ((await look(p)).step !== 'sl-st-7') await tap(p, '[data-act="sl-next"]', 500);
      l = await look(p);
      // ---------- Payment and the last step ----------
      check(label + ': the last step asks whether it was paid, with the price', l.step === 'sl-st-7' && /Was it paid\?/.test(await text(p, '.oo-paid')) && /\$95/.test(await text(p, '.oo-total')), l);
      check(label + ': no "How is the customer paying", no agreement question, no "After saving" box', !(await shown(p, '.sl-payplan')) && !(await shown(p, '.cc-f-agreement')) && !(await shown(p, '#cc-f-outcome')));
      check(label + ': the check card says "Check it against the slip"', /Check it against the slip/.test(await text(p, '#cc-f-review') || ''), await text(p, '#cc-f-review'));
      check(label + ': the Save button says Save old order', /^Save old order$/.test(await text(p, '#ccs-slipform [data-act="n-submit"]')), await text(p, '#ccs-slipform [data-act="n-submit"]'));
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 600); l = await look(p);
      check(label + ': Save without the payment answer says so, and saves nothing', l.errs.some(t => /tap whether it was paid/.test(t)) && !(await calls(p, 'staff_enter_old_order')).length, l);
      await tap(p, '[data-oo-paid="part"]');
      check(label + ': Part paid asks for the amount, how and the day', await shown(p, '#oo-amount') && await shown(p, '[data-oo-meth]') && (await p.evaluate(() => document.getElementById('oo-paidon').value)) === fiji(-6));
      await p.fill('#oo-amount', '95'); await tap(p, '[data-oo-meth="cash"]'); await tap(p, '#ccs-slipform [data-act="n-submit"]', 600); l = await look(p);
      check(label + ': a part payment of the whole price is stopped', l.errs.some(t => /less than the price/.test(t)), l);
      await tap(p, '[data-oo-paid="full"]');
      check(label + ': Paid in full keeps the method and the day (the pickup day)', await p.evaluate(() => document.querySelector('[data-oo-meth="cash"]').getAttribute('aria-pressed') === 'true') && (await p.evaluate(() => document.getElementById('oo-paidon').value)) === fiji(-6));
      check(label + ': the summary says picked up on the pickup day, ordered on the slip date, no kitchen slip or messages', new RegExp('Saved as picked up on ' + long(fiji(-6)) + ', ordered on ' + long(fiji(-9)) + '\\. It counts in sales on the pickup day\\. No kitchen slip, and no messages to the customer\\.').test(await text(p, '.oo-sum')), await text(p, '.oo-sum'));
      await toTop(p, '#sl-st-7'); await shot(p, label + '-04-old-payment');
      // ---------- The duplicate warning ----------
      await p.evaluate(d => { window.__dups = [{ id: 'o14', reference: 'CC-1030', date: d, time: '15:00:00', cake: 'Mudcake', size: 8, total: 68, status: 'completed', name: 'Test Customer B' }]; }, fiji(-6));
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 900);
      let dc = await calls(p, 'order_possible_duplicates');
      check(label + ': Save first checks for the same order already in the system, widely for an old order', dc.length === 1 && dc[0].p.wide === true && dc[0].p.date === fiji(-6) && dc[0].p.customer.phone === '912 3456', dc);
      check(label + ': a look-alike order is shown before anything is saved', await shown(p, '.oo-dup') && /Is this order already in the system\?/.test(await text(p, '.oo-dup')) &&
        /CC-1030 · Mudcake 8"/.test(await text(p, '.oo-dup-list')) && /\$68 · Collected/.test(await text(p, '.oo-dup-list')) && !(await calls(p, 'staff_enter_old_order')).length, await text(p, '.oo-dup'));
      check(label + ': the window offers Open CC-1030, save it, or go back; the buttons are big', /Open CC-1030/.test(await text(p, '.oo-dup')) && /It is a different order: save it/.test(await text(p, '.oo-dup')) && /Go back and check/.test(await text(p, '.oo-dup')) &&
        await p.evaluate(() => [...document.querySelectorAll('.oo-dup .ccs-btn, .oo-dup .ccs-link')].every(x => x.getBoundingClientRect().height >= 44)), await p.evaluate(() => [...document.querySelectorAll('.oo-dup .ccs-btn, .oo-dup .ccs-link')].map(x => x.textContent + ':' + Math.round(x.getBoundingClientRect().height))));
      await shot(p, label + '-05-duplicate');
      await tap(p, '[data-oo-back]', 400);
      check(label + ': Go back and check closes it and saves nothing', !(await shown(p, '.oo-dup')) && !(await calls(p, 'staff_enter_old_order')).length);
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 900);
      check(label + ': Save again asks again', await shown(p, '.oo-dup') && (await calls(p, 'order_possible_duplicates')).length === 2);
      await tap(p, '[data-oo-save]', 1600);
      // ---------- Saved ----------
      const eo = await calls(p, 'staff_enter_old_order');
      check(label + ': "It is a different order: save it" saves it once, through staff_enter_old_order', eo.length === 1, eo.length);
      const q = eo[0] ? eo[0].p : {};
      check(label + ': with the slip date, who took it, paid in full in cash on the pickup day', JSON.stringify(q.old) === JSON.stringify({ taken_on: fiji(-9), taken_by: 'Test Manager', paid: 'full', amount: null, method: 'cash', paid_on: fiji(-6), price: null }), q.old);
      check(label + ': and the cake, pickup date and time as entered', q.date === fiji(-6) && q.time === '15:00' && q.product_code === 'cheesecake' && q.size_inch === 8 && q.occasion === 'Birthday', q);
      check(label + ': no payment, short notice, deposit or marketing answer is sent; not confirmed at the counter', !('payment' in q) && !('rush' in q) && !('deposit_required' in q) && !('consent' in q) && q.confirm_now === false && q.customer && q.customer.opt_in === false, q);
      const after = await p.evaluate(() => { const i = window.__calls.findIndex(c => c[1] === 'staff_enter_old_order'); return window.__calls.slice(i + 1).map(c => c[0] + ':' + c[1]); });
      check(label + ': nothing else is sent after it: no normal save, order date, who-took-it or Birthday Club calls', !(await calls(p, 'staff_create_order')).length && !after.some(c => /^rpc:(staff_create_order|order_set_taken|order_set_taken_by|order_set_requirements|bc_.*|.*birthday.*|_?queue.*|.*email.*)$/i.test(c)), after);
      check(label + ': the finish screen: Old order saved, CC-1031, picked up on its day', /Old order saved/.test(await text(p, '#ccs-sheet .oo-done')) && /CC-1031/.test(await text(p, '#ccs-sheet .oo-done')) && new RegExp('Picked up ' + long(fiji(-6))).test(await text(p, '#ccs-sheet .oo-done')), await text(p, '#ccs-sheet .oo-done'));
      check(label + ': ... ordered on the slip date, paid $95 on the day, taken by the name given', new RegExp('Ordered' + long(fiji(-9))).test(await text(p, '#ccs-sheet .oo-done')) && new RegExp('Paid\\$95 on ' + long(fiji(-6))).test(await text(p, '#ccs-sheet .oo-done')) && /Taken byTest Manager/.test(await text(p, '#ccs-sheet .oo-done')), await text(p, '#ccs-sheet .oo-done'));
      check(label + ': the sheet title says Old order saved', /Old order saved/.test(await text(p, '#ccs-sheet .ccs-sheet-head, #ccs-sheet header') || await text(p, '#ccs-sheet')));
      check(label + ': no kitchen slip button', !(await shown(p, '#ccs-sheet .oo-done [data-act="open-slip"]')));
      await shot(p, label + '-06-saved');
      await tap(p, '#ccs-sheet .oo-done [data-oo-next]', 700);
      check(label + ': "Enter the next old order" starts an empty old order', await p.evaluate(() => document.querySelector('[data-oo-mode="old"]') && document.querySelector('[data-oo-mode="old"]').getAttribute('aria-pressed') === 'true' && document.getElementById('n-takedate') && !document.getElementById('n-takedate').value && !document.getElementById('n-phone').value));
      // Back to a New order: everything as before
      await tap(p, '[data-oo-mode="new"]', 400);
      check(label + ': choosing New order again brings back the normal questions', await shown(p, '[data-act="n-taken"]') && await shown(p, '[data-act="sl-opt"]') && !(await p.evaluate(() => !!document.getElementById('n-takedate'))) && /Who is taking this order\?/.test(await text(p, '[data-of-who]')));
      check(label + ': no errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- A custom design is priced from the slip; a failed duplicate check never holds an order up ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { pre: 'window.__dupFail=true;' });
      await tabTo(p, 'new'); await p.waitForTimeout(300);
      await oldOrder(p, { custom: true });
      if ((await look(p)).step !== 'sl-st-7') await tap(p, '[data-act="sl-next"]', 500);
      check('custom design: the last step asks for the cake price on the slip', await shown(p, '#oo-price') && /Cake price on the slip/.test(await text(p, 'label[for="oo-price"]')) && /Enter the cake price/.test(await text(p, '.oo-total')));
      check('custom design: the price box sits under the price line, above "Was it paid?"', await p.evaluate(() => { const t = document.querySelector('.oo-total').getBoundingClientRect(), i = document.getElementById('oo-price').getBoundingClientRect(), q = document.querySelector('.oo-paid').getBoundingClientRect(); return t.bottom <= i.top + 1 && i.bottom <= q.top + 1; }));
      await tap(p, '[data-oo-paid="full"]'); await tap(p, '[data-oo-meth="eftpos"]');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 600);
      check('custom design: Save without the price says so', (await look(p)).errs.some(t => /Type the cake price from the slip/.test(t)) && !(await calls(p, 'staff_enter_old_order')).length, await look(p));
      await p.click('#oo-price'); await p.keyboard.type('120'); await p.waitForTimeout(200);
      check('custom design: the price shows as it is typed', /\$120/.test(await text(p, '.oo-total')), await text(p, '.oo-total'));
      check('custom design: and the message asking for it goes', !(await look(p)).errs.some(t => /cake price/.test(t)), await look(p));
      await p.waitForTimeout(400);
      check('custom design: the slip shows the price from the slip, not the menu price', (await slipLine(p, 'Price')) === '$120', await slipLine(p, 'Price'));
      await shot(p, 'tablet-07-custom-price');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 1600);
      const eo = await calls(p, 'staff_enter_old_order');
      check('custom design: a failed duplicate check does not hold the order up', (await calls(p, 'order_possible_duplicates')).length === 1 && eo.length === 1);
      check('custom design: the slip price is sent', eo[0] && eo[0].p.old.price === 120 && eo[0].p.old.method === 'eftpos' && eo[0].p.finish === 'custom', eo[0] && eo[0].p.old);
      check('custom design: no errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- New orders are checked too, more narrowly; a refused save shows the message ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { pre: 'window.__oldErr="Old orders are for cakes picked up before today.";' });
      await tabTo(p, 'new'); await p.waitForTimeout(300);
      await tap(p, '[data-of-name]');
      await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
      await tap(p, '[data-act="sl-opt"][data-v="no"]'); await tap(p, '[data-act="n-source"][data-v="walk_in"]');
      await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]');
      await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
      await tap(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
      await tap(p, '[data-act="n-plan"][data-v="full"]'); await tap(p, '[data-act="n-paym"][data-v="cash"]');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 1600);
      const dc = await calls(p, 'order_possible_duplicates'), sc = await calls(p, 'staff_create_order');
      check('new order: checked first, narrowly (wide: false), then saved the normal way', dc.length === 1 && dc[0].p.wide === false && sc.length === 1 && !(await calls(p, 'staff_enter_old_order')).length, { dc, sc: sc.length });
      check('new order: the normal finish screen', /Order saved/.test(await text(p, '#ccs-sheet .of-done') || '') && !(await shown(p, '.oo-done')));
      // An old order the database refuses: the message is shown and the entry is kept
      await tap(p, '#ccs-sheet .of-done [data-act="new-again"]', 600);
      await oldOrder(p);
      if ((await look(p)).step !== 'sl-st-7') await tap(p, '[data-act="sl-next"]', 500);
      await tap(p, '[data-oo-paid="none"]'); await tap(p, '#ccs-slipform [data-act="n-submit"]', 1600);
      const l = await look(p);
      check('refused: the database message is shown and nothing is lost', l.errs.some(t => /Old orders are for cakes picked up before today/.test(t)) && (await p.evaluate(() => document.getElementById('ccs-slipform') !== null)), l);
      const eo = await calls(p, 'staff_enter_old_order');
      check('refused: Not paid sends no method or day', eo[0] && eo[0].p.old.paid === 'none' && eo[0].p.old.method === null && eo[0].p.old.paid_on === null, eo[0] && eo[0].p.old);
      check('new order: no errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- Correct this order, and the history ----------
    for (const [w, h, label] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h);
      await p.evaluate(() => { const o = document.createElement('button'); o.type = 'button'; o.hidden = true; o.setAttribute('data-act', 'open-order'); o.setAttribute('data-id', 'o14'); document.getElementById('cc-staff').appendChild(o); o.click(); o.remove(); });
      await p.waitForTimeout(1200);
      check(label + ': a handed-over order offers Correct this order (not Change order)', await shown(p, '#ccs-sheet [data-act="panel"][data-v="amend"]') && /Correct this order/.test(await text(p, '#ccs-sheet [data-act="panel"][data-v="amend"]')) &&
        !(await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet [data-act="panel"][data-v="amend"]')].some(x => /Change order/.test(x.textContent)))));
      // The history of an old order, in plain words and in order
      await tap(p, '#ccs-sheet [data-act="secgo"][data-v="history"]', 500); await tap(p, '#ccs-sheet [data-act="history"]', 600);
      const hist = await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet .ccs-history > div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()));
      const want = ['Order placed', 'Ordered ' + long(fiji(-9)) + ', entered later', 'Order taken by Mere', 'Confirmed at $68: Old order from a paper slip', 'Full payment of $68 recorded (Cash), paid ' + long(fiji(-6)),
        'Order completed, collected, received by Test Customer B on ' + long(fiji(-6)), 'Old order entered from a paper slip: ordered ' + long(fiji(-9)) + ', taken by Mere, picked up ' + long(fiji(-6)), 'Pickup date corrected: Pickup date set from the birthday date'];
      check(label + ': the history of an old order, in plain words, in the order it happened', hist.length === want.length && want.every((x, i) => hist[i].indexOf(x) > -1), hist);
      check(label + ': each line says who and when (12-hour time)', hist.every(x => /\d{1,2}:\d{2}\s?[AP]M/.test(x) && / · (Counter One|Roneel)$/.test(x)), hist);
      await toTop(p, '#ccs-sheet .ccs-history'); await shot(p, label + '-09-history');
      // Correct it
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="amend"]', 600);
      check(label + ': Correct CC-1030, saying the order was handed over and every correction is kept', /Correct CC-1030/.test(await text(p, '#ccs-sheet .ccs-amend')) && /already handed over\. Open only what was entered wrongly\. Each correction is kept in the order history/.test(await text(p, '#ccs-sheet .ccs-amend')));
      check(label + ': no "Who asked for the change?"; the reason is "What was wrong?"', !(await shown(p, '#ccs-sheet .am-fix-by')) && /What was wrong\? \(kept in the order history\)/.test(await text(p, 'label[for="am-reason"]')) && /the slip says Thursday 15 October/.test(await p.evaluate(() => document.getElementById('am-reason').placeholder)));
      check(label + ': the button says Review correction', /Review correction/.test(await text(p, '#ccs-sheet [data-act="am-review"]')));
      await tap(p, '#ccs-sheet [data-act="am-open"][data-v="look"]', 400);
      await p.fill('#am-msg', 'Happy 7th Birthday Anna'); await p.waitForTimeout(200);
      await tap(p, '#ccs-sheet [data-act="am-review"]', 700);
      check(label + ': Review without a reason asks what was wrong', /Say what was wrong/.test(await text(p, '#ccs-sheet .ccs-amend')) && !(await calls(p, 'staff_correct_order')).length);
      await p.fill('#am-reason', 'Slip says Anna, not Ana'); await p.waitForTimeout(200);
      await toTop(p, '#ccs-sheet .ccs-amend'); await shot(p, label + '-08-correct');
      await tap(p, '#ccs-sheet [data-act="am-review"]', 800);
      let cc = await calls(p, 'staff_correct_order');
      check(label + ': the correction is checked first through staff_correct_order (not Change order)', cc.length === 1 && cc[0].p_commit === false && cc[0].p_requested_by === 'other' && cc[0].p_reason === 'Slip says Anna, not Ana' && cc[0].p_changes.message === 'Happy 7th Birthday Anna' && !(await calls(p, 'staff_amend_order')).length, cc);
      check(label + ': the check shows old and new, what was wrong, and that the customer is not contacted', /Check this correction to CC-1030/.test(await text(p, '#ccs-sheet .ccs-amend')) && /Cake message“Happy 7th Birthday Ana” → “Happy 7th Birthday Anna”/.test(await text(p, '#ccs-sheet .ccs-amlist')) &&
        /What was wrong: Slip says Anna, not Ana/.test(await text(p, '#ccs-sheet .ccs-amend')) && /The customer is not contacted/.test(await text(p, '#ccs-sheet .ccs-amend')) && !/Requested by/.test(await text(p, '#ccs-sheet .ccs-amend')), await text(p, '#ccs-sheet .ccs-amend'));
      check(label + ': the button says Save correction', /^Save correction$/.test(await text(p, '#ccs-sheet [data-act="am-save"]')));
      await toTop(p, '#ccs-sheet .ccs-amend'); await shot(p, label + '-10-correct-check');
      await tap(p, '#ccs-sheet [data-act="am-save"]', 1200);
      cc = await calls(p, 'staff_correct_order');
      check(label + ': Save correction saves it', cc.length === 2 && cc[1].p_commit === true, cc.length);
      check(label + ': and says so', /Correction saved\. It is in the order history/.test(await toastText(p)), await toastText(p));
      await tap(p, '#ccs-sheet [data-act="secgo"][data-v="history"]', 500); if (!(await shown(p, '#ccs-sheet .ccs-history'))) await tap(p, '#ccs-sheet [data-act="history"]', 600);
      const h2 = await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet .ccs-history > div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()));
      check(label + ': the history ends with the correction: what was wrong, old and new value, who and when', /Corrected after it was handed over \(Slip says Anna, not Ana\): Cake message “Happy 7th Birthday Ana” → “Happy 7th Birthday Anna” · Test Manager$/.test(h2[h2.length - 1] || ''), h2[h2.length - 1]);
      check(label + ': no errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- Without Change order rights there is no Correct this order ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { pre: 'window.__permv=2;window.__perms=["ord.view","ord.status","ord.payments","kit.view"];' });
      await p.evaluate(() => { const o = document.createElement('button'); o.type = 'button'; o.hidden = true; o.setAttribute('data-act', 'open-order'); o.setAttribute('data-id', 'o14'); document.getElementById('cc-staff').appendChild(o); o.click(); o.remove(); });
      await p.waitForTimeout(1200);
      check('no edit rights: the order opens without Correct this order', await shown(p, '#ccs-sheet') && !(await shown(p, '#ccs-sheet [data-act="panel"][data-v="amend"]')));
      check('no edit rights: no errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
