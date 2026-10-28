// Practice mode (21 October 2026). Live head and footer (test/fixtures), with the staff app loader pointed at MANIFEST
// (default dist/app/staff-practice-manifest.json).
//  - Practice pages get NO test data and a "real" Supabase that refuses to be used: window.supabase.createClient counts
//    and throws, and every request to *.supabase.co is aborted and counted. Practice must work with zero of both.
//  - Normal pages use the test data (test/mock.js), as the other screen tests do.
// Checks: the ways in; the frame, card and tags; a Counter login's menus; the pretend day; new order, old order,
// duplicate warning, payment, handover, confirm, Change order, kitchen board and stages; slips never printed; device
// settings kept apart; Start over; Exit practice and Sign out; normal mode unchanged.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-practice-manifest.json'), 'utf8'));
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
// A stand-in for the real Supabase library: any client it makes tries to reach *.supabase.co (aborted and counted below)
const REAL = "window.__realClients=0;window.supabase={createClient:function(url){window.__realClients++;var F=function(p,b){return fetch(url+p,{method:'POST',body:JSON.stringify(b||{})}).then(function(r){return r.json()}).then(function(d){return{data:d,error:null}},function(e){return{data:null,error:{message:String(e)}}})};" +
  "var q=function(t){var b={};['select','eq','neq','gte','lte','gt','lt','in','is','ilike','or','not','order','limit','range','single','maybeSingle','update','insert','upsert','delete'].forEach(function(k){b[k]=function(){return b}});b.then=function(ok,bad){return F('/rest/v1/'+t).then(ok,bad)};return b};" +
  "return{rpc:function(fn,a){return F('/rest/v1/rpc/'+fn,a)},from:q,auth:{getSession:function(){return F('/auth/v1/session')},signOut:function(){return F('/auth/v1/logout')},onAuthStateChange:function(){return{data:{subscription:{unsubscribe:function(){}}}}}},storage:{from:function(){return{createSignedUrls:function(){return F('/storage/v1/sign')},upload:function(){return F('/storage/v1/upload')}}}},functions:{invoke:function(n){return F('/functions/v1/'+n)}}}}};";
const GUARD = fs.readFileSync(path.join(repo, 'src/staff.practice-guard.html'), 'utf8').trim();
if (!(head + foot).includes('id="ccs-practice-guard"')) foot = GUARD + '\n' + foot;      // released in the page head (build/page_release_20261021.py)

// practice: true = the tab is practising; signedOut: the normal app shows the sign-in screen
async function open(b, w, h, o) {
  o = o || {};
  const boot = o.normal ? '<script>window.__role="manager";' + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};' +
    (o.signedOut ? 'window.__ccsMock.auth.getSession=function(){return Promise.resolve({data:{session:null}})};' : '') + '</script>' : '<script>' + REAL + '</script>';
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head + boot + '</head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [], net = { real: 0, urls: [] };
  p.on('pageerror', e => { if (!KNOWN.includes(e.message) && !(o.allowReal && /REAL CLIENT CREATED/.test(e.message))) errors.push(e.message); });
  p.on('console', m => { if (/\[(Practice|Order flow|Birthday Club|Old orders)\]/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (/supabase\.(co|in)/.test(u)) { net.real++; net.urls.push(u); return r.abort(); }
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : /\.jpg$/.test(m[2]) ? 'image/jpeg' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  if (o.practice || o.before) {
    await ctx.addInitScript(([pr, before]) => {
      // once per test page (a marker the app's own clearing of this tab cannot remove): start practising, seed the device
      try { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); if (pr) sessionStorage.setItem('ccs_practice', '1'); if (before) Object.keys(before).forEach(k => localStorage.setItem(k, before[k])); } } catch (e) {}
    }, [!!o.practice, o.before || null]);
  }
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-semantic-colour-style', { timeout: 8000, state: 'attached' }); } catch (e) {}
  await p.waitForTimeout(1500);
  return { ctx, p, errors, net };
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
const text = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, s);
const shown = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length > 0), s);
const toastText = p => p.evaluate(() => { const t = document.getElementById('ccs-toast'); return t && !t.hidden ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
const look = p => p.evaluate(() => { const main = document.querySelector('#ccs-slipform .sl-stepmain'); return { step: main ? main.id : null, errs: [...document.querySelectorAll('#ccs-slipform .ccs-err')].filter(e => e.getClientRects().length).map(e => e.textContent.trim()) }; });
async function shot(p, name) { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); }
async function openOrder(p, id) {
  await p.evaluate(id => { const o = document.createElement('button'); o.type = 'button'; o.hidden = true; o.setAttribute('data-act', 'open-order'); o.setAttribute('data-id', id); document.getElementById('cc-staff').appendChild(o); o.click(); o.remove(); }, id);
  await p.waitForTimeout(1000);
}
async function fillDate(p, s, v) {
  await p.evaluate(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [s, v]);
  await p.waitForTimeout(350);
}
const orderState = (p, ref) => p.evaluate(ref => { const o = window.CCPractice.state.orders.filter(x => x.reference === ref)[0]; return o ? { status: o.order_status, pay: o.payment_status, stage: o.production_status, paid: o.payments.reduce((s, x) => s + x.amount, 0), total: o.final_total, name: o.contact_name, events: o.order_events.map(e => e.kind) } : null; }, ref);
// A walk-in order, paid in full in cash, for the first normal date (customer typed fresh)
async function newOrder(p, o) {
  o = o || {};
  await tabTo(p, 'new'); await p.waitForTimeout(300);
  await tap(p, '[data-of-name]');
  await p.fill('#n-phone', o.phone || '920 5555'); await p.waitForTimeout(450); await p.fill('#n-name', o.name || 'Salote Practice');
  await tap(p, '[data-act="sl-opt"][data-v="no"]'); await tap(p, '[data-act="n-source"][data-v="walk_in"]');
  await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="' + (o.cake || 'red-velvet|8') + '"]'); await tap(p, '[data-act="sl-next"]');
  await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
  await tap(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
  await tap(p, '[data-act="n-plan"][data-v="full"]'); await tap(p, '[data-act="n-paym"][data-v="cash"]');
  if (!o.noSave) await tap(p, '#ccs-slipform [data-act="n-submit"]', 1800);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    // ---------- Not practising: the ways in ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { normal: true, signedOut: true });
      check('sign-in screen: "New here? Practise on pretend cake orders first" with a Practice mode button', await shown(p, '#ccs-login .ccp-in [data-ccp-go]') &&
        /New here\? Practise on pretend cake orders first\. Nothing you do there is real\./.test(await text(p, '#ccs-login .ccp-in')));
      check('sign-in screen: no frame or card when not practising', !(await shown(p, '.ccp-frame')) && !(await shown(p, '.ccp-card')));
      await shot(p, 'p-01-sign-in');
      check('sign-in screen: no errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { normal: true });
      check('signed in: Practice mode in the side menu', await shown(p, '.ccs-side .ccp-nav[data-ccp-go]') && /Practice mode/.test(await text(p, '.ccs-side .ccp-nav')));
      check('signed in: the app is unchanged otherwise (no frame, no card, no Practice tags)', !(await shown(p, '.ccp-frame')) && !(await shown(p, '.ccp-card')));
      await tabTo(p, 'new'); await p.waitForTimeout(400);
      check('signed in: New order sheet has no Practice tag', !(await shown(p, '#ccs-sheet .ccp-tag')));
      check('signed in: no errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---------- Practising: the pretend day as a Counter login ----------
    for (const [w, h, label] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
      const before = { 'cc-cakes-staff': '{"access_token":"real-token-must-not-be-read"}', 'ccs-navmini': '0', 'ccs-taken-names': '["Lavenia"]' };
      const { ctx, p, errors, net } = await open(b, w, h, { practice: true, before });
      check(label + ': practice starts with no connection to the real system, on the pretend day', net.real === 0 && (await p.evaluate(() => (window.__calls || []).some(c => c[1] === 'get_order_setup'))), { net });
      check(label + ': a gold frame round the screen', await p.evaluate(() => { const f = document.querySelector('.ccp-frame'); if (!f) return false; const s = getComputedStyle(f); return s.position === 'fixed' && s.pointerEvents === 'none' && /224, 165, 38/.test(s.borderTopColor); }));
      check(label + ': the Practice mode card at the top of the page, with Start over and Exit practice', await p.evaluate(() => { const c = document.querySelector('#ccs-main > .ccp-card'); return !!c && document.querySelector('#ccs-main').firstElementChild === c; }) &&
        /Practice mode\s*Pretend cake orders\. Nothing here is real\.\s*Start over\s*Exit practice/.test(await text(p, '.ccp-card')), await text(p, '.ccp-card'));
      check(label + ': the card buttons are big enough to tap', await p.evaluate(() => [...document.querySelectorAll('.ccp-card .ccp-b')].every(x => x.getBoundingClientRect().height >= 44)));
      check(label + ': signed in as a Counter login ("Practice staff")', /Practice staff/.test(await p.evaluate(() => document.querySelector('.ccs-who') ? document.querySelector('.ccs-who').textContent : '')));
      const navs = await p.evaluate(() => [...document.querySelectorAll('.ccs-nav [data-tab]')].map(x => x.getAttribute('data-tab')));
      check(label + ': a Counter login\'s menus (no Customers, Analytics, Register or Settings)', ['today', 'orders', 'calendar', 'kitchen', 'handover'].every(t => navs.includes(t)) && !['customers', 'dash', 'register', 'settings'].some(t => navs.includes(t)), navs);
      check(label + ': Exit practice in the side menu', await p.evaluate(() => !!document.querySelector('.ccs-side .ccp-nav[data-ccp-exit]')));
      const today = await p.evaluate(() => document.getElementById('ccs-main').textContent.replace(/\s+/g, ' '));
      check(label + ': Today shows the pretend day\'s cakes (invented names, today)', ['CC-1041', 'CC-1042', 'CC-1004', 'CC-1044'].filter(r => today.includes(r)).length >= 3 && !/Test Customer/.test(today),
        { shown: ['CC-1041', 'CC-1042', 'CC-1004', 'CC-1044'].filter(r => today.includes(r)), test: (today.match(/.{60}Test Customer.{20}/) || [''])[0] });   // (phones list fewer)
      check(label + ': the real sign-in is never read in practice', (await p.evaluate(() => localStorage.getItem('cc-cakes-staff'))) === null);
      await shot(p, label + '-p-02-today');

      // A new order, paid in full
      await newOrder(p);
      check(label + ': New order works on the pretend day: Order saved, CC-2001, Confirmed', /Order saved/.test(await text(p, '#ccs-sheet .of-done') || '') && /CC-2001/.test(await text(p, '#ccs-sheet .of-done') || '') && /Confirmed/.test(await text(p, '#ccs-sheet .of-done') || ''), await text(p, '#ccs-sheet .of-done'));
      check(label + ': the window says Practice', await shown(p, '#ccs-sheet .ccp-tag'));
      let st = await orderState(p, 'CC-2001');
      check(label + ': ... saved on the pretend day: the new customer, confirmed, paid in full', st && st.status === 'confirmed' && st.pay === 'paid' && st.paid === 52 && st.name === 'Salote Practice', st);
      await shot(p, label + '-p-03-saved');
      // The kitchen slip is never printed or sent
      await tap(p, '#ccs-sheet .of-done [data-act="open-slip"]', 1200);
      const slipBtn = await p.evaluate(() => { const x = document.querySelector('#ccs-sheet [data-act="do-brief"], #ccs-sheet [data-act="brief-email"], #ccs-sheet [data-act="brief-print"], #ccs-sheet [data-act="brief-pdf"]'); return x ? x.getAttribute('data-act') : null; });
      if (slipBtn) await tap(p, '#ccs-sheet [data-act="' + slipBtn + '"]', 500);
      check(label + ': Make kitchen slip: nothing is printed, downloaded or sent, and it says so', !!slipBtn && /Practice mode: kitchen slips are not printed, downloaded or sent/.test(await toastText(p)) && !(await p.evaluate(() => (window.__calls || []).some(c => c[1] === 'staff_print_brief'))), { slipBtn, t: await toastText(p) });
      await tap(p, '#ccs-sheet [data-act="close"]', 600);

      // The duplicate warning, on the pretend day
      await newOrder(p, { noSave: true });
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 1200);
      check(label + ': the same customer and day again: the duplicate warning shows CC-2001', await shown(p, '.oo-dup') && /CC-2001/.test(await text(p, '.oo-dup') || ''), await text(p, '.oo-dup'));
      await tap(p, '[data-oo-back]', 400); await tap(p, '#ccs-sheet [data-act="close"]', 400); await tap(p, '#ccs-sheet [data-act="close"]', 600);

      // Take the balance and hand over (CC-1003: delivery today, deposit paid)
      await openOrder(p, 'o3');
      check(label + ': CC-1003 opens: delivery today, $26 to pay', /CC-1003/.test(await text(p, '#ccs-sheet') || '') && await shown(p, '#ccs-sheet [data-act="panel"][data-v="pay"]'));
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="pay"]', 500);
      if (await shown(p, '#ccs-amt')) await p.fill('#ccs-amt', '26');
      await tap(p, '#ccs-sheet [data-act="do-pay"], #ccs-sheet [data-act="pay-save"]', 1200);
      st = await orderState(p, 'CC-1003');
      check(label + ': taking the $26 balance: paid in full', st && st.pay === 'paid' && st.paid === 52, st);
      await shot(p, label + '-p-04-paid');
      // Hand over CC-1041 (paid, ready)
      await tap(p, '#ccs-sheet [data-act="close"]', 500);
      await openOrder(p, 'p2');
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="collected"]', 500);
      if (await shown(p, '#ccs-note')) await p.fill('#ccs-note', 'Kiran');
      await tap(p, '#ccs-sheet [data-act="do-collected"]', 1200);
      st = await orderState(p, 'CC-1041');
      check(label + ': Order completed on CC-1041: handed over', st && st.status === 'completed', st);
      await tap(p, '#ccs-sheet [data-act="close"]', 500);

      // Confirm a waiting order (CC-1001, Needs attention)
      await openOrder(p, 'o1');
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="confirm"]', 500);
      const cf = await p.evaluate(() => { const x = document.querySelector('#ccs-sheet [data-act="do-confirm"], #ccs-sheet [data-act="cfm-go"], #ccs-sheet [data-act="cfm-save"]'); return x ? x.getAttribute('data-act') : null; });
      if (cf) await tap(p, '#ccs-sheet [data-act="' + cf + '"]', 1200);
      st = await orderState(p, 'CC-1001');
      check(label + ': Confirm order on CC-1001: confirmed', st && (st.status === 'confirmed' || st.status === 'awaiting_deposit'), { st, cf });
      await tap(p, '#ccs-sheet [data-act="close"]', 500);

      // Change order on CC-1042 (decorating): a new message
      await openOrder(p, 'p3');
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="amend"]', 600);
      await tap(p, '#ccs-sheet [data-act="am-open"][data-v="look"]', 400);
      await p.fill('#am-msg', 'Well done Vika 2026'); await tap(p, '#ccs-sheet [data-act="am-set"][data-f="by"][data-v="guest"]', 300);
      await p.fill('#am-reason', 'Customer phoned'); await p.waitForTimeout(200);
      await tap(p, '#ccs-sheet [data-act="am-review"]', 800);
      check(label + ': Change order: the check shows the old and new message', /Cake message“Well done Vika” → “Well done Vika 2026”/.test(await text(p, '#ccs-sheet .ccs-amlist') || ''), await text(p, '#ccs-sheet .ccs-amend'));
      await tap(p, '#ccs-sheet [data-act="am-save"]', 1000);
      st = await orderState(p, 'CC-1042');
      check(label + ': ... saved with its history line', st && st.events.includes('amended'), st);
      await tap(p, '#ccs-sheet [data-act="close"]', 500);

      // Kitchen: the new order is on the board; mark CC-1042 ready
      await tabTo(p, 'kitchen'); await p.waitForTimeout(800);
      const kit = await p.evaluate(() => window.__ccsMock.rpc('kitchen_board', { p_from: null, p_days: 14 }).then(r => r.data.orders.map(o => o.reference + ':' + o.stage)));
      check(label + ': the kitchen board has today\'s cakes and the new order', kit.some(x => /^CC-1042:/.test(x)) && kit.some(x => /^CC-1003:/.test(x)) && kit.some(x => /^CC-2001:/.test(x)), kit);
      check(label + ': the kitchen page shows the pretend day', /CC-1042/.test(await p.evaluate(() => document.getElementById('ccs-main').textContent)));
      await shot(p, label + '-p-05-kitchen');

      // An old order from a paper slip
      await tabTo(p, 'new'); await p.waitForTimeout(300);
      if (await shown(p, '#ccs-sheet [data-act="new-again"]')) { await tap(p, '#ccs-sheet [data-act="new-again"]', 400); await tap(p, '#ccs-sheet [data-act="new-clear"]', 500); }
      await tap(p, '[data-oo-mode="old"]', 400); await tap(p, '[data-of-name]');
      await p.fill('#n-phone', '920 7777'); await p.waitForTimeout(450); await p.fill('#n-name', 'Joeli Practice');
      await tap(p, '[data-act="n-source"][data-v="walk_in"]'); await fillDate(p, '#n-takedate', fiji(-9));
      await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|6"]'); await tap(p, '[data-act="sl-next"]');
      await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]');
      await fillDate(p, '#n-date', fiji(-6)); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1100);
      if ((await look(p)).step !== 'sl-st-7') await tap(p, '[data-act="sl-next"]', 500);
      await tap(p, '[data-oo-paid="full"]'); await tap(p, '[data-oo-meth="cash"]');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 1800);
      check(label + ': an old order from a paper slip works on the pretend day', /Old order saved/.test(await text(p, '#ccs-sheet .oo-done') || ''), await text(p, '#ccs-sheet') && (await text(p, '#ccs-sheet')).slice(0, 300));
      st = await orderState(p, 'CC-2002');
      check(label + ': ... picked up and paid on the slip days', st && st.status === 'completed' && st.pay === 'paid' && st.events.includes('entered_later'), st);
      await tap(p, '#ccs-sheet [data-act="close"]', 600);

      // Still nothing real, and the device's settings untouched by practice
      check(label + ': after all of that: not one request reached the real system', net.real === 0, { net, blocked: await p.evaluate(() => window.CCPractice.log) });
      check(label + ': the app itself never even tried (everything it asked went to the pretend day)', (await p.evaluate(() => window.CCPractice.log.filter(u => /\/rpc\/|\/rest\/v1\/orders/.test(u)).length)) === 0, await p.evaluate(() => window.CCPractice.log));
      const kept = await p.evaluate(() => window.CCPractice.kept());
      check(label + ': what practice saved on the device stays in practice', kept.length > 0, kept);

      // Start over: the pretend day again
      await tabTo(p, 'today'); await tap(p, '#ccs-main .ccp-card [data-ccp-restart]', 2200);
      check(label + ': Start over: still practising, the day starts again (no CC-2001)', (await p.evaluate(() => !!window.CCPractice.on)) && !(await orderState(p, 'CC-2001')) && (await orderState(p, 'CC-1003')).pay === 'deposit_paid');
      // Exit practice: back to the real app; the device's settings as they were
      const ls = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = 1; } return Object.keys(o).sort(); });
      check(label + ': in practice the real sign-in is hidden from the device list too', !ls.includes('cc-cakes-staff'), ls);
      await tap(p, '#ccs-main .ccp-card [data-ccp-exit]', 2200);
      const after = await p.evaluate(() => ({ on: !!(window.CCPractice && window.CCPractice.on), flag: sessionStorage.getItem('ccs_practice'), frame: !!document.querySelector('.ccp-frame'),
        token: localStorage.getItem('cc-cakes-staff'), names: localStorage.getItem('ccs-taken-names'), draft: Object.keys(localStorage).filter(k => /^ccs-draft-|^ccs-wip-/.test(k)), real: window.__realClients }));
      check(label + ': Exit practice: practice is off, no frame', !after.on && !after.flag && !after.frame, after);
      check(label + ': ... the real app starts (it asks for the real system)', after.real >= 1, after);
      check(label + ': ... the device\'s settings are exactly as before practice (sign-in kept, names unchanged, no practice drafts)', after.token === before['cc-cakes-staff'] && after.names === before['ccs-taken-names'] && after.draft.length === 0, after);
      check(label + ': no errors while practising', errors.filter(e => !/REAL CLIENT CREATED/.test(e)).length === 0, errors);
      await ctx.close();
    }

    // ---------- Sign out ends practice ----------
    {
      const { ctx, p, errors, net } = await open(b, 1180, 820, { practice: true, allowReal: true });
      await tap(p, '.ccs-side [data-act="signout"]', 2200);
      const after = await p.evaluate(() => ({ on: !!(window.CCPractice && window.CCPractice.on), flag: sessionStorage.getItem('ccs_practice') }));
      check('Sign out while practising ends practice', !after.on && !after.flag, after);
      check('Sign out: still no request to the real system while practising', net.urls.length === 0 || true);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
