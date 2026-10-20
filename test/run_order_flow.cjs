// A New order that leads the way (20 October 2026). Live head and footer (test/fixtures), with the staff app loader
// pointed at MANIFEST (default dist/app/staff-order-flow-manifest.json) and the footer's compact-entry list emptied, as
// the release footer has it (build/footer_order_flow.py). Invented data only (test/mock.js).
//  - Who is taking this order: first on the Customer step, required, names remembered on the device, + Add my name.
//  - No hidden menus; "When did they order?" starts on Today.
//  - The screen leads the way: the next question outlined and in view, Next lights up, Next with something missing.
//  - Date and time together on phones too; picking a time moves on once the step is complete.
//  - Finish screen; who took it saved on the order (order_set_taken_by); the kitchen slip waits for it; the order and
//    its history name the person; a failed save can be tried again; unfinished orders keep the name; tablet mode.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-order-flow-manifest.json'), 'utf8'));
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
let foot = fs.readFileSync(path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
if (!LOADER.test(foot)) throw new Error('The footer fixture has no staff app loader');
foot = foot.replace(LOADER, (m, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + manifest.file + '",' + h + ',k="' + manifest.sri + '"');
const COMPACT = "      [['n-source', 'Order source', 'source'], ['n-taken', 'Order date', 'date'], ['sl-opt', 'Marketing permission', 'consent']].forEach(function (entry) {";
if (foot.includes(COMPACT)) foot = foot.replace(COMPACT, '      [].forEach(function (entry) {');
else if (!foot.includes('      [].forEach(function (entry) {')) throw new Error('The footer fixture has no compact-entry list');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
const SHOTS = process.env.SHOTS || '';
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 900) : '')); } }
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));

async function open(b, w, h, o) {
  o = o || {};
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
    '<script>window.__role=' + JSON.stringify(o.role || 'manager') + ';' + (o.pre || '') + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
  p.on('console', m => { if (/\[(Order flow|Birthday Club)\]/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
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
// A tap: whatever had the cursor loses it (as on a phone or tablet), then the last visible match is pressed
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
// What the form shows: the step, what is outlined, whether Next is lit, and where things sit on screen
const look = p => p.evaluate(() => {
  const main = document.querySelector('#ccs-slipform .sl-stepmain'), lit = document.querySelector('#cc-staff .of-ask, #cc-staff .of-miss');
  const btn = main && main.querySelector('.sl-stepbar [data-act="sl-next"], .sl-stepbar [data-act="n-submit"]');
  return { step: main ? main.id : null, title: main ? main.querySelector('.sl-steptitle').textContent.trim() : null,
    lit: lit ? { cls: lit.className, id: lit.id, text: lit.textContent.replace(/\s+/g, ' ').trim().slice(0, 80), miss: lit.classList.contains('of-miss') } : null,
    ready: btn ? btn.classList.contains('of-ready') : null, pop: btn ? btn.classList.contains('of-pop') : null,
    focus: document.activeElement ? document.activeElement.id : null,
    errs: [...document.querySelectorAll('#ccs-slipform .ccs-err')].filter(e => e.getClientRects().length && !e.hidden).map(e => e.textContent.trim()) };
});
// Is the element wholly on screen inside the order sheet, above the Next bar?
const inView = (p, s) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return { found: false };
  const r = e.getBoundingClientRect(), box = document.querySelector('#ccs-sheet .ccs-sheet-body').getBoundingClientRect();
  const bar = document.querySelector('#ccs-slipform .sl-stepbar'), bt = bar ? bar.getBoundingClientRect().top : box.bottom;
  return { found: true, ok: r.top >= box.top - 1 && r.bottom <= Math.min(box.bottom, bt) + 1, top: Math.round(r.top), bottom: Math.round(r.bottom), boxTop: Math.round(box.top), barTop: Math.round(bt) };
}, s);
const slipLine = (p, k) => p.evaluate(k => { const l = [...document.querySelectorAll('#ccs-slipform .sl-live .sl-ll')].filter(x => x.querySelector('.sl-lk').textContent.trim() === k)[0];
  return l ? { v: l.querySelector('.sl-lv').textContent.replace(/\s+/g, ' ').trim(), now: l.classList.contains('is-now'), chg: !!l.querySelector('.sl-chg') } : null; }, k);
const whoChips = p => p.evaluate(() => [...document.querySelectorAll('#cc-staff [data-of-who] .of-who-chips .ccs-chip')].map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')));
const whoSet = p => p.evaluate(() => { const w = document.querySelector('#cc-staff [data-of-who].is-set'); return w ? w.querySelector('b').textContent.trim() : null; });
const calls = (p, fn) => p.evaluate(fn => window.__calls.filter(c => c[1] === fn).map(c => c[2]), fn);
const toastText = p => p.evaluate(() => { const t = document.getElementById('ccs-toast'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
async function shot(p, name) { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); }
// The rest of an order, quickly (a name already picked on the Customer step)
async function quick(p, o) {
  o = o || {};
  if (!(await whoSet(p))) await tap(p, '[data-of-name]');
  await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
  await tap(p, '[data-act="sl-opt"][data-v="no"]'); await tap(p, '[data-act="n-source"][data-v="walk_in"]');
  await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]');
  await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
  await tap(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
  await tap(p, '[data-act="n-plan"][data-v="full"]'); await tap(p, '[data-act="n-paym"][data-v="cash"]');
  if (!o.noSave) await tap(p, '[data-act="n-submit"]', 1500);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, label] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h);
      // ---------- Customer: who is taking this order ----------
      await tabTo(p, 'new'); await p.waitForTimeout(300);
      let l = await look(p);
      check(label + ': New order opens on the Customer step', l.step === 'sl-st-1', l);
      check(label + ': "Who is taking this order?" is the first question, required', await p.evaluate(() => {
        const w = document.querySelector('#sl-st-1 .sl-stepbody [data-of-who]'); if (!w) return false;
        const k = w.querySelector('.of-who-k').textContent, others = [...document.querySelectorAll('#sl-st-1 .sl-stepbody > *')].filter(e => e !== w && e.getClientRects().length);
        return /Who is taking this order\?/.test(k) && /Required/.test(k) && others.every(e => e.getBoundingClientRect().top >= w.getBoundingClientRect().bottom - 1);
      }));
      check(label + ': the login is offered as a name, with + Add my name, and nobody is picked', JSON.stringify(await whoChips(p)) === JSON.stringify(['Test Manager', '+ Add my name']), await whoChips(p));
      check(label + ': the name buttons are big enough to tap', await p.evaluate(() => [...document.querySelectorAll('[data-of-who] .ccs-chip')].every(x => x.getBoundingClientRect().height >= 48)));
      check(label + ': the screen points at it first', !!(l.lit && /of-who-chips/.test(l.lit.cls)), l.lit);
      check(label + ': Next is not lit yet', l.ready === false, l);
      check(label + ': the slip line "Order Taken by" is empty and belongs to this step', JSON.stringify(await slipLine(p, 'Order Taken by')) === JSON.stringify({ v: '', now: true, chg: false }), await slipLine(p, 'Order Taken by'));
      check(label + ': no hidden menus: marketing permission, how and when they ordered are plain buttons', await p.evaluate(() => !document.querySelector('#cc-staff .cc-entry') &&
        ['sl-opt', 'n-source', 'n-taken'].every(a => [...document.querySelectorAll('#sl-st-1 [data-act="' + a + '"]')].every(x => x.getClientRects().length && x.getBoundingClientRect().height >= 44))));
      check(label + ': "When did they order?" starts on Today', await p.evaluate(() => /^When did they order\?$/.test(document.querySelector('#sl-st-1 .tk-k').textContent.trim()) &&
        document.querySelector('[data-act="n-taken"][data-v="now"]').getAttribute('aria-pressed') === 'true' && !/first ordered/.test(document.getElementById('sl-st-1').textContent)));
      await shot(p, label + '-01-open');
      // Next with nobody picked
      await tap(p, '[data-act="sl-next"]', 500); l = await look(p);
      check(label + ': Next without a name says so', l.step === 'sl-st-1' && l.errs.some(t => /Choose who is taking this order/.test(t)), l);
      check(label + ': ... and outlines the names in red', !!(l.lit && l.lit.miss && /of-who-chips/.test(l.lit.cls)), l.lit);
      // + Add my name
      await tap(p, '[data-of-other]', 400);
      check(label + ': + Add my name opens a name box with the cursor in it', await p.evaluate(() => { const i = document.getElementById('of-who-in'); return !!i && i.getClientRects().length > 0 && document.activeElement === i; }));
      await p.fill('#of-who-in', 'm'); await tap(p, '[data-of-use]', 300);
      check(label + ': one letter is not a name', /Type your name: 2 letters or more/.test(await p.evaluate(() => { const e = document.querySelector('[data-of-err]'); return e && !e.hidden ? e.textContent : ''; })));
      await p.fill('#of-who-in', 'mere'); await p.waitForTimeout(250);
      check(label + ': the slip shows the name as it is typed', (await slipLine(p, 'Order Taken by')).v === 'Mere', await slipLine(p, 'Order Taken by'));
      await p.press('#of-who-in', 'Enter'); await p.waitForTimeout(400); l = await look(p);
      check(label + ': Enter keeps the name, written properly ("mere" becomes Mere)', await whoSet(p) === 'Mere', await whoSet(p));
      check(label + ': then the mobile number is next: the cursor is in it and it is outlined', l.focus === 'n-phone' && !!(l.lit && l.lit.id === 'n-phone'), l);
      await tap(p, '[data-of-change]', 400);
      check(label + ': Change shows the names again, Mere picked', JSON.stringify(await whoChips(p)) === JSON.stringify(['Mere*', 'Test Manager', '+ Add my name']), await whoChips(p));
      await tap(p, '[data-of-name="Mere"]', 400);
      check(label + ': one tap puts it back', await whoSet(p) === 'Mere');
      // The rest of the Customer step
      await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest'); await p.waitForTimeout(500);
      await tap(p, '[data-act="sl-opt"][data-v="no"]', 500); l = await look(p);
      check(label + ': after the marketing question, "How did they order?" is outlined', !!(l.lit && /Walk-in/.test(l.lit.text) && !l.lit.miss), l.lit);
      const v1 = await inView(p, '#sl-st-1 .of-ask'); check(label + ': ... and in full view above the Next bar', !!v1.ok, v1);
      await tap(p, '[data-act="n-source"][data-v="phone"]', 500); l = await look(p);
      check(label + ': the step is done: Next lights up', l.ready === true && l.pop === true && !l.lit, l);
      await shot(p, label + '-02-customer-done');
      // ---------- Cake ----------
      await tap(p, '[data-act="sl-next"]', 600); l = await look(p);
      check(label + ': Cake: the price table is outlined', l.step === 'sl-st-0' && !!(l.lit && /sl-tablewrap|sl-ptable/.test(l.lit.cls)), l);
      await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]', 500); l = await look(p);
      check(label + ': a price tapped: Next lights up', l.ready === true, l);
      // ---------- Details ----------
      await tap(p, '[data-act="sl-next"]', 600); l = await look(p);
      check(label + ': Details: "Any allergies?" is outlined', l.step === 'sl-st-4' && !!(l.lit && /No allergies/.test(l.lit.text)), l);
      await tap(p, '[data-act="n-diet"][data-v="no"]', 500); l = await look(p);
      check(label + ': then the occasion', !!(l.lit && /Birthday/.test(l.lit.text)), l.lit);
      const v2 = await inView(p, '#sl-st-4 .of-ask'); check(label + ': ... in view', !!v2.ok, v2);
      await tap(p, '[data-act="n-occ"][data-v="Birthday"]', 500); l = await look(p);
      check(label + ': occasion chosen: Next lights up', l.ready === true, l);
      // ---------- When ----------
      await tap(p, '[data-act="sl-next"]', 600); l = await look(p);
      check(label + ': When: one page for the date and the time', l.step === 'sl-st-3' && l.title === 'When is it needed?' && !!(l.lit && /ccs-datechips/.test(l.lit.cls)), l);
      await tap(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)', 600); l = await look(p);
      check(label + ': a date tapped: the times are right there (no separate Pickup time page)', l.step === 'sl-st-3' && l.title === 'When is it needed?' && await p.locator('#sl-st-3 [data-act="n-time"]').count() > 0, l);
      check(label + ': ... outlined', !!(l.lit && /ccs-timegrid/.test(l.lit.cls)), l.lit);
      const v3 = await inView(p, '#sl-st-3 .ccs-timegrid'); check(label + ': ... and in full view', !!v3.ok, v3);
      await shot(p, label + '-03-when');
      await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 150);
      check(label + ': the time shows as picked before moving on', (await look(p)).step === 'sl-st-3');
      await p.waitForTimeout(900); l = await look(p);
      check(label + ': picking the time moves on to Finish', l.step === 'sl-st-7', l);
      // ---------- Finish ----------
      check(label + ': Finish: the payment question is outlined', !!(l.lit && /Paid in full/.test(l.lit.text)), l.lit);
      await tap(p, '[data-act="n-plan"][data-v="full"]', 500); l = await look(p);
      check(label + ': then how they paid', !!(l.lit && /Cash/.test(l.lit.text)) && l.ready === false, l);
      await tap(p, '[data-act="n-paym"][data-v="cash"]', 500); l = await look(p);
      check(label + ': all done: Save lights up', l.ready === true, l);
      await tap(p, '[data-act="n-submit"]', 1600);
      const done = await p.evaluate(() => { const d = document.querySelector('#ccs-sheet .of-done'); if (!d) return null;
        return { title: document.querySelector('#ccs-sheet .ccs-sheet-head .ccs-title').textContent.trim(), ref: d.querySelector('.of-ref').textContent, pill: d.querySelector('.of-pill').textContent,
          facts: [...d.querySelectorAll('.of-facts div')].map(x => x.querySelector('dt').textContent + ': ' + x.querySelector('dd').textContent),
          btns: [...d.querySelectorAll('button')].map(x => x.textContent.trim()), mail: !!d.querySelector('.of-mail'), next: d.querySelector('.of-next').textContent,
          tall: [...d.querySelectorAll('.of-big')].every(x => x.getBoundingClientRect().height >= 56), wide: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
      check(label + ': saved: the finish screen shows the order number and that it is confirmed', !!done && done.title === 'Order saved' && done.ref === 'CC-1009' && done.pill === 'Confirmed', done);
      check(label + ': ... the customer, the pickup and who took it', !!done && done.facts[0] === 'Customer: Invented Guest' && /^Pickup: \w{3} \d{1,2} \w{3}, 3:00 PM$/.test(done.facts[1].replace(',', '')) && done.facts[2] === 'Taken by: Mere', done && done.facts);
      check(label + ': ... what to do next, with Make kitchen slip and Take another order', !!done && /make the kitchen slip/.test(done.next) && JSON.stringify(done.btns) === JSON.stringify(['Make kitchen slip', 'Take another order', 'Open the order']) && done.tall && done.mail, done);
      check(label + ': ... fits the screen', !!done && done.wide);
      await shot(p, label + '-04-done');
      check(label + ': who took it is saved on the order', JSON.stringify(await calls(p, 'order_set_taken_by')) === JSON.stringify([{ p_order: 'o9', p_name: 'Mere' }]), await calls(p, 'order_set_taken_by'));
      check(label + ': ... and remembered on this device', await p.evaluate(() => localStorage.getItem('ccs-taken-names')) === '["Mere"]');
      // The order names the person; so does its history
      await tap(p, '#ccs-sheet .of-done [data-act="open-order"]', 1200);
      await tap(p, '#ccs-sheet [data-act="secgo"][data-v="customer"]', 500);
      const ord = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'), kv = [...s.querySelectorAll('.ccs-kv dt')].filter(x => x.textContent === 'Taken by')[0];
        return { taken: kv ? kv.nextElementSibling.textContent : null, via: [...s.querySelectorAll('.ccs-kv dt')].map(x => x.textContent) }; });
      check(label + ': the order says "Taken by Mere", after how it was ordered', ord.taken === 'Mere' && ord.via.indexOf('Taken by') === ord.via.indexOf('Ordered via') + 1, ord);
      await tap(p, '#ccs-sheet [data-act="secgo"][data-v="history"]', 500); await tap(p, '#ccs-sheet [data-act="history"]', 600);
      check(label + ': its history says "Order taken by Mere"', /Order taken by Mere · Test Manager/.test(await p.evaluate(() => (document.querySelector('#ccs-sheet .ccs-history') || {}).textContent || '')));
      // The next order: names remembered, nobody picked
      await tap(p, '#ccs-sheet [data-act="close"]', 500); await tabTo(p, 'new'); await p.waitForTimeout(300);
      check(label + ': the next order offers Mere first, and nobody is picked', JSON.stringify(await whoChips(p)) === JSON.stringify(['Mere', 'Test Manager', '+ Add my name']) && !(await whoSet(p)), await whoChips(p));
      check(label + ': ... and starts afresh on Today', await p.evaluate(() => document.querySelector('[data-act="n-taken"][data-v="now"]').getAttribute('aria-pressed') === 'true' && document.getElementById('n-phone').value === ''));
      // An unfinished order keeps its name
      await tap(p, '[data-of-name="Test Manager"]', 400); await p.fill('#n-phone', '912 7777'); await p.waitForTimeout(500);
      await tap(p, '#ccs-sheet [data-act="close"]', 500); await tabTo(p, 'new'); await p.waitForTimeout(400);
      check(label + ': an unfinished order comes back with its name', await whoSet(p) === 'Test Manager' && await p.inputValue('#n-phone') === '912 7777', await whoSet(p));
      await tap(p, '.sl-restart', 300); await tap(p, '[data-act="new-clear"]', 400);
      check(label + ': Start over clears it (nobody picked)', !(await whoSet(p)) && JSON.stringify(await whoChips(p)) === JSON.stringify(['Mere', 'Test Manager', '+ Add my name']), await whoChips(p));
      // Take another order, from the finish screen
      await tap(p, '[data-of-name="Mere"]', 400); await quick(p);
      await tap(p, '#ccs-sheet .of-done [data-act="new-again"]', 600);
      check(label + ': Take another order opens a fresh order on the Customer step', (await look(p)).step === 'sl-st-1' && !(await whoSet(p)) && await p.inputValue('#n-phone') === '');
      // New order from the menu while the finish screen is open
      await quick(p); await tabTo(p, 'new'); await p.waitForTimeout(300);
      check(label + ': New order from the menu on the finish screen starts the next order', (await look(p)).step === 'sl-st-1' && !(await p.$('#ccs-sheet .of-done')) && await p.inputValue('#n-phone') === '');
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- A returning customer, delivery, short notice, no payment yet (tablet) ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820);
      await tabTo(p, 'new'); await tap(p, '[data-of-name]', 400);
      await p.fill('#n-phone', '0001'); await p.waitForTimeout(700);
      await tap(p, '[data-act="n-pick"][data-v="0"]', 900);
      check('returning: the customer is found', /Test Customer A/.test(await p.evaluate(() => (document.querySelector('#sl-st-1 .sl-found') || {}).textContent || '')));
      await tap(p, '[data-act="sl-opt"][data-v="yes"]', 300); await tap(p, '[data-act="n-source"][data-v="whatsapp"]', 500);
      check('returning: Next lights up', (await look(p)).ready === true, await look(p));
      await tap(p, '[data-act="sl-next"]', 500); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]', 500);
      await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]', 500);
      await tap(p, '[data-act="n-method"][data-v="delivery"]', 500);
      await tap(p, '#sl-st-3 [data-act="n-date"][data-v="' + fiji(1) + '"]', 600); let l = await look(p);
      check('short notice: the reason is outlined next', !!(l.lit && l.lit.id === 'n-rush'), l.lit);
      await p.fill('#n-rush', 'From today\'s batch'); await p.fill('#n-rushby', 'Chef Sam'); await p.waitForTimeout(300);
      await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1200); l = await look(p);
      check('delivery: a time without the delivery area stays on the page', l.step === 'sl-st-3', l);
      check('delivery: ... and the delivery areas are outlined in red, in view', !!(l.lit && l.lit.miss && /zone|Nadi|Denarau|Lautoka|area/i.test(l.lit.text + l.lit.cls + JSON.stringify(l.errs))), l);
      const zv = await inView(p, '#sl-st-3 .of-miss'); check('delivery: ... in view', !!zv.ok, zv);
      await tap(p, '#sl-st-3 [data-act="n-zone"][data-v="Denarau"]', 500); l = await look(p);
      check('delivery: an area tapped: the address is next', !!(l.lit && l.lit.id === 'n-address'), l.lit);
      await p.fill('#n-address', 'Room 214, Sheraton Denarau'); await p.waitForTimeout(300);
      await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1300); l = await look(p);
      check('delivery: with the address in, picking the time moves on', l.step === 'sl-st-7', l);
      await tap(p, '[data-act="n-plan"][data-v="later"]', 500); l = await look(p);
      check('no payment yet: "Has the customer agreed?" is next', !!(l.lit && /customer agreed/i.test(l.lit.text)), l.lit);
      await tap(p, '[data-cc-agree="yes"]', 500); l = await look(p);
      check('no payment yet: agreed: Save lights up', l.ready === true, l);
      await tap(p, '[data-act="n-submit"]', 1600);
      check('delivery: the finish screen says Delivery', await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet .of-facts dt')].map(x => x.textContent).join('|')) === 'Customer|Delivery|Taken by');
      check('returning: no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- The name could not be saved; the kitchen slip waits for it ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { pre: 'window.__takenFail=true;' });
      await tabTo(p, 'new'); await quick(p);
      const t = await toastText(p);
      check('failure: the order is saved and staff are told the name was not', /CC-1009 is saved, but who took it was not recorded: Test failure/.test(t) && !!(await p.$('#ccs-sheet .of-done')), t);
      await p.evaluate(() => { const b = [...document.querySelectorAll('#ccs-toast button')].filter(x => /Try again/.test(x.textContent))[0]; b && b.click(); }); await p.waitForTimeout(600);
      const tc = await calls(p, 'order_set_taken_by');
      check('failure: Try again saves it', tc.length === 2 && tc[1].p_name === 'Test Manager' && await p.evaluate(() => !!window.__takenDone), tc);
      // the kitchen slip, made straight away while the name is still being saved
      await p.evaluate(() => { window.__takenDelay = 1200; window.__takenDone = 0; });
      await tap(p, '#ccs-sheet .of-done [data-act="new-again"]', 500); await quick(p);
      await tap(p, '#ccs-sheet .of-done [data-act="open-slip"]', 900);
      await tap(p, '#ccs-sheet [data-act="do-brief"]', 2200);
      const at = await p.evaluate(() => ({ brief: window.__briefAt || 0, taken: window.__takenDone || 0 }));
      check('slip: a slip made straight away waits until the name is saved', at.brief > 0 && at.taken > 0 && at.brief >= at.taken, at);
      check('failure: no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- Counter login on the counter tablet, in tablet mode ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { role: 'front_of_house' });
      const tb = await tap(p, '#cc-staff [data-tab="tablet"]', 900);
      check('tablet mode: opens', tb && !!(await p.$('#ccs-sheet [data-act="tb-new"]')));
      await tap(p, '#ccs-sheet [data-act="tb-new"]', 700);
      check('tablet mode: New order asks who is taking it', !!(await p.$('#sl-st-1 [data-of-who]')) && !(await whoSet(p)));
      await quick(p);
      check('tablet mode: the finish screen shows', await p.evaluate(() => !!document.querySelector('#ccs-sheet .of-done') && document.documentElement.classList.contains('ccs-tablet-mode')));
      await tap(p, '#ccs-sheet [data-act="close"]', 700);
      check('tablet mode: closing it goes back to the tablet start page', !!(await p.$('#ccs-sheet [data-act="tb-new"]')));
      check('tablet mode: Counter login, no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'OK ') + n + '/' + (n + fails));
  process.exit(fails ? 1 : 0);
})();
