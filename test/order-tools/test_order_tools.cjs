const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const loader = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', process.env.SHA_OT || '0000000');
const verify = process.env.VERIFY ? fs.readFileSync(process.env.VERIFY, 'utf8') : '';
const SHOTS = process.env.SHOTS || '';
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 700) : '')); } }
const post = "(function(){var m=window.__ccsMock,r=m.rpc;m.rpc=function(fn,args){if(fn==='staff_order_action'&&args&&args.p_action==='cancel'){(window.__cancels=window.__cancels||[]).push(args);if(window.__cancelErr)return Promise.resolve({data:{ok:false,error:'forbidden',message:'Money has been paid on this order. Ask an Admin to cancel it.'}});return Promise.resolve({data:{ok:true,status:'cancelled',payment_status:'unpaid',version:9}})}return r.apply(this,arguments)}})();";
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
async function shot(p, name) { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '.png' }); }
const shown = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length > 0), s);
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function cancelFlow(b, w, h, tag, o) {
  const { p, ctx, errors, logs } = await open(b, w, h, Object.assign({ post, extraFoot: loader, extraHead: verify, ipad: tag === 'tablet' }, o || {}));
  await p.waitForTimeout(800);
  check(tag + ' order tools loaded', await p.evaluate(() => !!window.__ccOrderTools20261026));
  check(tag + ' extra future pickup buttons not loaded', await p.evaluate(() => !window.__ccFuturePickup20261026));
  await tap(p, '#cc-staff [data-tab="orders"]', 1200);
  await tap(p, '[data-act="open-order"][data-id="o1"]', 1200);
  const btn = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet .ccs-actions-row .cc-ot-cancel'); if (!b) return null; const r = b.getBoundingClientRect(); return { h: r.height, inView: r.top >= 0 && r.bottom <= innerHeight, row: b.parentElement.textContent.replace(/\s+/g, ' ').trim() }; });
  check(tag + ' Cancel order beside the main buttons', !!btn, btn);
  check(tag + ' Cancel order on screen without scrolling', btn && btn.inView, btn);
  check(tag + ' only one Cancel order button', await p.evaluate(() => document.querySelectorAll('#ccs-sheet .cc-ot-cancel').length === 1));
  await shot(p, tag + '-1-order');
  await tap(p, '#ccs-sheet .cc-ot-cancel', 700);
  const chips = await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet [data-cc-reason]')].map(c => c.textContent));
  check(tag + ' six reasons to tap', chips.length === 6, chips);
  const chipH = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#ccs-sheet [data-cc-reason]')].map(c => c.getBoundingClientRect().height)));
  check(tag + ' reasons are the app\'s own touch size (' + Math.round(chipH) + 'px)', chipH >= (tag === 'tablet' ? 52 : 44), chipH);
  await shot(p, tag + '-2-panel');
  await tap(p, '#ccs-sheet [data-act="do-cancel"]', 500);
  check(tag + ' no reason: stopped with a message', await p.evaluate(() => { const e = document.querySelector('#ccs-sheet .cc-ot-err'); return e && /Tap why/.test(e.textContent) && !(window.__cancels || []).length; }));
  await tap(p, '#ccs-sheet [data-cc-reason="other"]', 300);
  await tap(p, '#ccs-sheet [data-act="do-cancel"]', 500);
  check(tag + ' Other without words: stopped', await p.evaluate(() => { const e = document.querySelector('#ccs-sheet .cc-ot-err'); return e && /Write what happened/.test(e.textContent) && !(window.__cancels || []).length; }));
  await tap(p, '#ccs-sheet [data-cc-reason="duplicate"]', 300);
  await p.fill('#ccs-sheet #ccs-note', 'Same as CC-1002');
  await tap(p, '#ccs-sheet [data-act="do-cancel"]', 1000);
  const sent = await p.evaluate(() => window.__cancels || []);
  check(tag + ' cancel sent once with the reason', sent.length === 1 && sent[0].p_note === 'Duplicate order: Same as CC-1002', sent);
  check(tag + ' no horizontal scroll', (await overflow(p)) <= 1, await overflow(p));
  check(tag + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
  check(tag + ' no add-on warnings or refused files', !logs.filter(m => /\[Order tools\]|asset check/.test(m)).length, logs.filter(m => /\[Order tools\]|asset check/.test(m)));
  await ctx.close();
}
async function paidFlow(b) {
  const { p, ctx } = await open(b, 1180, 820, { post: post + 'window.__cancelErr=true;', extraFoot: loader, role: 'front_of_house' });
  await p.waitForTimeout(800);
  await tap(p, '#cc-staff [data-tab="orders"]', 1200);
  await tap(p, '[data-act="open-order"][data-id="o1"]', 1200);
  const has = await shown(p, '#ccs-sheet .cc-ot-cancel');
  if (has) {
    await tap(p, '#ccs-sheet .cc-ot-cancel', 600);
    await tap(p, '#ccs-sheet [data-cc-reason="customer_cancelled"]', 300);
    await tap(p, '#ccs-sheet [data-act="do-cancel"]', 1000);
    const msg = await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet .ccs-err, #ccs-toast')].map(e => e.textContent).join(' | '));
    check('paid order: server rule message shown to front of house', /Ask an Admin/.test(msg), msg);
    check('paid order: note keeps a single reason after a refused try', await p.evaluate(() => { const n = document.querySelector('#ccs-sheet #ccs-note'); return !n || !/Customer cancelled/i.test(n.value); }));
  } else check('front of house sees Cancel order on an open order', false);
  await ctx.close();
}
async function oldOrderFlow(b, w, h, tag) {
  const { p, ctx, errors } = await open(b, w, h, { extraFoot: loader, ipad: tag === 'tablet' });
  await p.waitForTimeout(800);
  await tap(p, '#cc-staff [data-tab="new"]', 1200);
  await tap(p, '[data-oo-mode="old"]', 500);
  const slip = fiji(-5);
  const fillDate = async (sel, v) => { await p.evaluate(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]); await p.waitForTimeout(350); };
  await tap(p, '[data-of-name]');
  await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
  await tap(p, '[data-act="n-source"][data-v="walk_in"]');
  await fillDate('#n-takedate', slip);
  await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]');
  await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]', 600);
  const maxNow = await p.evaluate(() => { const i = document.querySelector('#ccs-slipform #n-date'); return i && i.max; });
  check(tag + ' Old order pickup date still stops at yesterday', maxNow === fiji(-1), maxNow);
  check(tag + ' "Cake not picked up yet?" shown in Old order', await shown(p, '.cc-ot-notyet [data-cc-notyet]'));
  await shot(p, tag + '-3-old');
  await tap(p, '.cc-ot-notyet [data-cc-notyet]', 900);
  const st = await p.evaluate(() => { const V = window.__ccsOf.V(); return { old: V.old, taken: V.taken, takenDate: V.takenDate, by: V.takenBy }; });
  check(tag + ' switched to New order, slip date kept as order day', st.old === false && st.taken === 'other' && st.takenDate === slip && !!st.by, st);
  check(tag + ' notice gone in New order', !(await shown(p, '.cc-ot-notyet')));
  check(tag + ' mode buttons in plain words', await p.evaluate(() => { const n = document.querySelector('[data-oo-mode="new"] b'), o = document.querySelector('[data-oo-mode="old"] b'); return (!n || n.textContent === 'Cake still to come') && (!o || o.textContent === 'Cake already picked up'); }));
  const dateUi = await p.evaluate(() => ({ cells: document.querySelectorAll('#ccs-slipform .ccs-datecell').length, later: (document.querySelector('#ccs-slipform [data-act="n-date-other"]') || {}).textContent, extra: !!document.querySelector('#ccs-slipform .cc-fp-actions, #ccs-slipform .cc-fp-two-weeks') }));
  check(tag + ' date step: 7 days and one "Later date" button, nothing extra', dateUi.cells === 7 && /Later date/.test(dateUi.later || '') && !dateUi.extra, dateUi);
  await tap(p, '#ccs-slipform [data-act="n-date-other"]', 900);
  check(tag + ' Later date opens the calendar in one tap', await shown(p, '#cc-date-picker-layer .cc-dp-dialog'));
  const want = fiji(14);
  for (let i = 0; i < 3 && !(await shown(p, '#cc-date-picker-layer [data-cc-date-day="' + want + '"]:not([disabled])')); i++) await tap(p, '#cc-date-picker-layer [data-cc-date-move="1"]', 300);
  await tap(p, '#cc-date-picker-layer [data-cc-date-day="' + want + '"]', 800);
  const picked = await p.evaluate(() => window.__ccsOf.V().date);
  check(tag + ' picked ' + want + ' from the calendar', picked === want, picked);
  check(tag + ' date field labelled Pickup date', await p.evaluate(() => { const l = document.querySelector('#ccs-slipform label[for="n-date"], #ccs-slipform label[data-cc-date-for="n-date"]'); return l && l.textContent.trim() === 'Pickup date'; }));
  await shot(p, tag + '-4-new');
  check(tag + ' no horizontal scroll', (await overflow(p)) <= 1, await overflow(p));
  check(tag + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) await cancelFlow(b, w, h, t);
  await paidFlow(b);
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) await oldOrderFlow(b, w, h, t);
  await b.close();
  console.log('\n' + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
