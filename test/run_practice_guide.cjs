// Guided practice (21 October 2026): the gentle guide in practice mode walks new staff through three jobs on the
// pretend day: a new cake order, an old order from a paper slip, and handing over a cake with the balance.
// Same page as test/run_practice.cjs (live head and footer with the practice guard, the app at MANIFEST, default
// dist/app/staff-practice-manifest.json, a "real" Supabase that refuses to be used). Checks: the guide in the card and in
// each window, its next step following what is filled in, Show me, the well-done messages, all three jobs done, Skip,
// Do it again, and no connection to the real system at any point.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-practice-manifest.json'), 'utf8'));
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
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
if (!foot.includes('id="ccs-practice-guard"')) foot = GUARD + '\n' + foot;      // as the practice release footer has it (build/footer_practice.py)

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

const guideCard = p => text(p, '#ccs-main .ccp-card .ccg-card');
const strip = p => text(p, '#ccs-sheet .ccg-strip');
const say = p => p.evaluate(() => { const s = document.querySelector('#ccs-sheet .ccg-strip .ccg-say') || document.querySelector('#ccs-main .ccg-card .ccg-say'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
const pointed = p => p.evaluate(() => { const e = document.querySelector('.ccg-here'); return e ? (e.getAttribute('data-tab') || e.getAttribute('data-act') || e.id || e.className.split(' ')[0]) : null; });
async function waitSay(p, re, ms) { const end = Date.now() + (ms || 2600); let s = ''; while (Date.now() < end) { s = await say(p); if (re.test(s)) return s; await p.waitForTimeout(150); } return s; }
const long = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(/,/g, '');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, label] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
      const { ctx, p, errors, net } = await open(b, w, h, { practice: true });
      // ---------- the guide starts in the practice card ----------
      let g = await guideCard(p);
      check(label + ': the practice card holds the guide: 1 of 3, a new cake order, what the customer wants', /Guided practice 1 of 3: Take a new cake order/.test(g || '') &&
        /Mele Vunisa is at the counter/.test(g) && /Mobile\s*912 7001/.test(g) && new RegExp('Collecting\\s*' + long(fiji(3)) + ', 3:00 PM').test(g), g);
      check(label + ': its first step, with Show me and Skip this one', /Next: Tap New order to start\./.test(g) && await shown(p, '.ccg-card [data-ccg-show]') && await shown(p, '.ccg-card [data-ccg-skip]'), g);
      check(label + ': the guide buttons are big enough to tap', await p.evaluate(() => [...document.querySelectorAll('.ccg-card button')].every(x => x.getBoundingClientRect().height >= 44)));
      await tap(p, '.ccg-card [data-ccg-show]', 500);
      check(label + ': Show me outlines New order', await pointed(p) === 'new', await pointed(p));
      await shot(p, label + '-g01-card');
      // ---------- 1. a new cake order ----------
      await tabTo(p, 'new'); await p.waitForTimeout(400);
      check(label + ': in the New order window, the guide strip sits under the title', await p.evaluate(() => { const s = document.querySelector('#ccs-sheet .ccg-strip'); return !!s && s.previousElementSibling && s.previousElementSibling.matches('.ccs-sheet-head'); }) &&
        /Practice 1 of 3\. Tap your name, so the kitchen knows who took the order\./.test(await strip(p) || ''), await strip(p));
      check(label + ': with Show me and What they want (closed, so the form has room)', /What they want/.test(await strip(p)) && !(await shown(p, '#ccs-sheet .ccg-strip .ccg-facts')) && await shown(p, '#ccs-sheet .ccg-strip [data-ccg-show]'));
      await tap(p, '#ccs-sheet .ccg-strip [data-ccg-more]', 400);
      check(label + ': What they want opens what she wants', /Words on the cake\s*Happy 7th Birthday Josh/.test(await strip(p)) && await p.evaluate(() => document.querySelector('#ccs-sheet [data-ccg-more]').getAttribute('aria-expanded') === 'true'));
      await shot(p, label + '-g02-strip');
      await tap(p, '#ccs-sheet .ccg-strip [data-ccg-more]', 400);
      check(label + ': and closes it again', !(await shown(p, '#ccs-sheet .ccg-strip .ccg-facts')));
      await tap(p, '#ccs-sheet .ccg-strip [data-ccg-show]', 500);
      check(label + ': Show me outlines who is taking the order', /of-who/.test(await pointed(p) || ''), await pointed(p));
      await shot(p, label + '-g02b-show');
      await tap(p, '[data-of-name]');
      check(label + ': then her mobile number', /Ask for her mobile number and type it first: 912 7001/.test(await waitSay(p, /mobile number/)), await say(p));
      await p.fill('#n-phone', '912 7001'); await p.waitForTimeout(500);
      check(label + ': then her name', /Now her name: Mele Vunisa/.test(await waitSay(p, /her name/)), await say(p));
      await p.fill('#n-name', 'Mele Vunisa'); await p.waitForTimeout(400);
      check(label + ': then cake offers', /Ask if she would like cake offers and reminders\. She says yes, so tap Yes\./.test(await waitSay(p, /cake offers/)), await say(p));
      await tap(p, '[data-act="sl-opt"][data-v="yes"]');
      check(label + ': then Walk-in and Next', /tap Walk-in\. Then tap Next\./.test(await waitSay(p, /Walk-in/)), await say(p));
      await tap(p, '[data-act="n-source"][data-v="walk_in"]'); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the cake', /Tap the 8-inch price for Chocolate, Mudcake or Mocha, then tap Chocolate\. Then tap Next\./.test(await waitSay(p, /8-inch price/)), await say(p));
      await tap(p, '[data-act="n-cell"][data-v="chocolate-mudcake-mocha|8"]'); await tap(p, '[data-act="n-var"][data-v="Chocolate"]'); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the words on the cake', /Ask what to write on the cake, and type it: Happy 7th Birthday Josh\./.test(await waitSay(p, /write on the cake/)), await say(p));
      await p.fill('#n-msg', 'Happy 7th Birthday Josh'); await p.waitForTimeout(400);
      check(label + ': then allergies', /Ask about allergies\. She says none, so tap No allergies\./.test(await waitSay(p, /allergies/)), await say(p));
      await tap(p, '[data-act="n-diet"][data-v="no"]');
      check(label + ': then Birthday and Next', /Tap Birthday\. Then tap Next\./.test(await waitSay(p, /Birthday/)), await say(p));
      await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the day and time', new RegExp('Tap ' + long(fiji(3)) + ', then 3:00 PM\\.').test(await waitSay(p, /3:00 PM/)), await say(p));
      await tap(p, '#sl-st-3 [data-act="n-date"][data-v="' + fiji(3) + '"]'); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]', 1300);
      check(label + ': then the payment', /She is paying the full price now, by card\. Tap Paid in full, then EFTPOS\./.test(await waitSay(p, /Paid in full/)), await say(p));
      await tap(p, '[data-act="n-plan"][data-v="full"]'); await tap(p, '[data-act="n-paym"][data-v="eftpos"]');
      check(label + ': then read it back and save', /Read the order back to her, to be sure\. Then tap Save\./.test(await waitSay(p, /Read the order back/)), await say(p));
      await shot(p, label + '-g03-save');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 1800);
      check(label + ': saved: a well-done message, and the guide moves on to 2 of 3', /Well done\. That is a whole cake order, start to finish\. Next: an old order from a paper slip\./.test(await toastText(p)) &&
        /Practice 2 of 3\./.test(await strip(p) || ''), { toast: await toastText(p), strip: await strip(p) });
      // ---------- 2. an old order from a paper slip ----------
      await tap(p, '#ccs-sheet .ccg-strip [data-ccg-more]', 400);
      check(label + ': The slip opens the paper slip', /Cake order slip/.test(await strip(p)) && /Taken by\s*Mere/.test(await strip(p)) && await shown(p, '#ccs-sheet .ccg-facts.is-slip'), await strip(p));
      await tap(p, '#ccs-sheet .ccg-strip [data-ccg-show]', 500);
      check(label + ': Show me points at Take another order', await pointed(p) === 'new-again', await pointed(p));
      await tap(p, '#ccs-sheet [data-act="new-again"]', 700);
      check(label + ': then Old order', /then tap Old order at the top/.test(await waitSay(p, /Old order/)), await say(p));
      await tap(p, '[data-oo-mode="old"]', 500);
      check(label + ': then the name on the slip', /The slip says Mere took it\. Tap \+ Add a name, type Mere, then tap OK\./.test(await waitSay(p, /Mere/)), await say(p));
      await tap(p, '[data-of-other]', 400); await p.fill('#of-who-in', 'Mere'); await tap(p, '[data-of-use]', 400);
      check(label + ': then the mobile number and name', /Copy the mobile number and the name from the slip: 912 7002, Asha Kumar\./.test(await waitSay(p, /Copy the mobile/)), await say(p));
      await p.fill('#n-phone', '912 7002'); await p.waitForTimeout(450); await p.fill('#n-name', 'Asha Kumar'); await p.waitForTimeout(400);
      check(label + ': then by phone', /She ordered by phone, so tap Phone\./.test(await waitSay(p, /by phone/)), await say(p));
      await tap(p, '[data-act="n-source"][data-v="phone"]');
      check(label + ': then the date on the slip', /Add the date written on the slip: .* Then tap Next\./.test(await waitSay(p, /date written/)), await say(p));
      await fillDate(p, '#n-takedate', fiji(-10)); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the cake', /Tap the 8-inch price for Red Velvet\. Then tap Next\./.test(await waitSay(p, /Red Velvet/)), await say(p));
      await tap(p, '[data-act="n-cell"][data-v="red-velvet|8"]'); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the words, allergies and occasion', /Copy the words \(Happy Anniversary\) and the occasion \(Anniversary\) from the slip/.test(await waitSay(p, /Copy the words/)), await say(p));
      await p.fill('#n-msg', 'Happy Anniversary'); await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Anniversary"]'); await tap(p, '[data-act="sl-next"]', 500);
      check(label + ': then the pickup date and time', /Add the pickup date from the slip, .*, then tap 2:00 PM\./.test(await waitSay(p, /pickup date/)), await say(p));
      await fillDate(p, '#n-date', fiji(-6)); await tap(p, '#sl-st-3 [data-act="n-time"][data-v="14:00"]', 1300);
      check(label + ': then paid in full, cash', /The slip says paid in full, in cash\. Tap Paid in full, then Cash\./.test(await waitSay(p, /in cash/)), await say(p));
      await tap(p, '[data-oo-paid="full"]'); await tap(p, '[data-oo-meth="cash"]');
      check(label + ': then check it and save', /Check it against the slip once more\. Then tap Save old order\./.test(await waitSay(p, /Save old order/)), await say(p));
      await shot(p, label + '-g04-slip');
      await tap(p, '#ccs-slipform [data-act="n-submit"]', 2000);
      check(label + ': saved: well done, and on to 3 of 3', /Nicely done\. Old slips go in just like that\. Last one: handing over a cake\./.test(await toastText(p)) && /Practice 3 of 3\./.test(await strip(p) || ''),
        { toast: await toastText(p), strip: await strip(p) });
      // ---------- 3. hand over a cake and take the balance ----------
      await tap(p, '#ccs-sheet [data-act="close"]', 600);
      g = await guideCard(p);
      check(label + ': the card: 3 of 3, Jone and CC-1044', /Guided practice 3 of 3: Hand over a cake and take the balance/.test(g || '') && /Next: Find his order: tap CC-1044 under Due today/.test(g), g);
      await tap(p, '.ccg-card [data-ccg-show]', 500);
      // (on a phone Due today lists 2 orders: later in the day his order is behind See all, and Show me points there)
      check(label + ': Show me points at his order on Today, or at See all when the list is cut short', await p.evaluate(() => { const e = document.querySelector('.ccg-here'); return !!e && (e.getAttribute('data-id') === 'p5' || (e.getAttribute('data-act') === 'goto' && e.getAttribute('data-v') === 'today' && !document.querySelector('[data-id="p5"]:not(.tx-hide)'))); }), await pointed(p));
      await tap(p, '[data-id="p5"]', 1200);
      check(label + ': in his order: take $38', /He still owes \$38\. Tap Take \$38\./.test(await waitSay(p, /owes/)), await say(p));
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="pay"]', 600);
      check(label + ': then card and Record payment', /He is paying by card: tap EFTPOS, then Record payment\./.test(await waitSay(p, /Record payment/)), await say(p));
      await tap(p, '#ccs-sheet [data-act="method"][data-v="eftpos"]'); await tap(p, '#ccs-sheet [data-act="do-pay"]', 1200);
      check(label + ': then Order completed', /All paid\. Now tap Order completed\./.test(await waitSay(p, /Order completed/)), await say(p));
      await tap(p, '#ccs-sheet [data-act="panel"][data-v="collected"]', 600);
      check(label + ': then check his name and complete it', /Check the order number and his name with him\. Tap his name, then Order completed\./.test(await waitSay(p, /his name/)), await say(p));
      await tap(p, '#ccs-sheet [data-act="fill"][data-f="ccs-note"]'); await tap(p, '#ccs-sheet [data-act="do-collected"]', 1400);
      check(label + ': all three done: a well-done message', /All three done\. Well done\./.test(await toastText(p)), await toastText(p));
      const st = await p.evaluate(() => { const o = window.CCPractice.state.orders.filter(x => x.reference === 'CC-1044')[0]; return o && { status: o.order_status, pay: o.payment_status }; });
      check(label + ': CC-1044 is paid and handed over on the pretend day', st && st.status === 'completed' && st.pay === 'paid', st);
      await tap(p, '#ccs-sheet [data-act="close"]', 600);
      g = await guideCard(p);
      check(label + ': the card says the guided practice is done, and offers it again', /Guided practice done/.test(g || '') && await shown(p, '.ccg-card [data-ccg-again]'), g);
      check(label + ': no window strip once the guide is done', !(await shown(p, '#ccs-sheet .ccg-strip')));
      await shot(p, label + '-g05-done');
      check(label + ': never a connection to the real system', net.real === 0 && (await p.evaluate(() => window.CCPractice.blocked)) === 0, { net, blocked: await p.evaluate(() => window.CCPractice.blocked) });
      // Do it again: a fresh day and the guide from the start
      await tap(p, '.ccg-card [data-ccg-again]', 2500);
      check(label + ': Do the guided practice again starts a fresh day at 1 of 3', /Guided practice 1 of 3/.test(await guideCard(p) || '') && await p.evaluate(() => window.CCPractice.on === true), await guideCard(p));
      check(label + ': no errors', errors.length === 0, errors);
      await ctx.close();
    }
    // ---------- Skip this one ----------
    {
      const { ctx, p, errors, net } = await open(b, 1180, 820, { practice: true });
      await tap(p, '.ccg-card [data-ccg-skip]', 500);
      check('skip: Skip this one moves on to 2 of 3', /Guided practice 2 of 3: Enter an old order from a paper slip/.test(await guideCard(p) || ''), await guideCard(p));
      await p.reload(); await p.waitForTimeout(2200);
      check('skip: the guide remembers where it is in this tab', /Guided practice 2 of 3/.test(await guideCard(p) || ''), await guideCard(p));
      await tap(p, '.ccp-card [data-ccp-restart]', 2500);
      check('skip: Start over begins the day and the guide again', /Guided practice 1 of 3/.test(await guideCard(p) || ''), await guideCard(p));
      check('skip: no connection to the real system, no errors', net.real === 0 && errors.length === 0, { net, errors });
      await ctx.close();
    }
    // ---------- not practising: no guide ----------
    {
      const { ctx, p, errors } = await open(b, 1180, 820, { normal: true });
      await tabTo(p, 'new'); await p.waitForTimeout(400);
      check('not practising: no guide anywhere', !(await shown(p, '.ccg-card')) && !(await shown(p, '.ccg-strip')) && !(await p.evaluate(() => !!window.CCPracticeGuide)));
      check('not practising: no errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
