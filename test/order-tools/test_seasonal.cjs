// Seasonal items in the Service Hub: counter treats picker, treats on an open order, Settings > Seasonal items.
// Live head and footer fixtures, live app bundle, mock database. Run: node test/order-tools/test_seasonal.cjs
const { open, tap, chromium } = require('./harness.cjs');
const SHA = process.env.SHA || '0000000';
const SHOTS = process.env.SHOTS || '';
const loader = '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@' + SHA + '/src/staff.seasonal.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const D10 = fiji(10);
const post = '(' + function (D10, T0) {
  var m = window.__ccsMock, seq = window.__seq = [];
  window.__menu = { ok: true, today: T0, groups: [{ id: 'g1', name: 'Festive treats', message: 'A little festive joy', payment: 'pickup', items: [
    { id: 'i1', name: 'Gingerbread House', detail: '15cm (H) × 13cm (W) × 20cm (L)', price: 35, lead_days: 2, limit: 10, left: { [D10]: 3 }, sold_out: [], blocked: [] },
    { id: 'i2', name: 'Mince Pies', detail: 'Pack of 3', price: 12, lead_days: 2, sold_out: [], blocked: [] },
    { id: 'i3', name: 'White Chocolate House', detail: '11cm', price: 35, lead_days: 2, sold_out: [D10], blocked: [] },
    { id: 'i4', name: 'Chocolate Pralines', detail: 'Pack of 6', price: 12, lead_days: 2, pickup_from: '2099-12-01', sold_out: [], blocked: [] },
    { id: 'i8', name: 'Bottle of wine', detail: 'Red or white', price: 30, lead_days: 0, counter_only: true, sold_out: [], blocked: [] }] }] };
  window.__szList = { ok: true, today: T0, can_edit: true, groups: [{ id: 'g1', name: 'Festive treats', web_message: 'A little festive joy', payment: 'pickup', sort: 1 }],
    items: [{ id: 'i1', group_id: 'g1', name: 'Gingerbread House', detail: '15cm', price: 35, channel: 'website', active: true, sale_from: T0, sale_to: '2099-12-20', pickup_from: null, pickup_to: '2099-12-24', lead_days: 2, daily_limit: 10, max_per_order: null, blocked_days: [], sold: 7 },
      { id: 'i8', group_id: 'g1', name: 'Bottle of wine', detail: 'Red or white', price: 30, channel: 'counter', active: false, lead_days: 0, blocked_days: [], sold: 0 }],
    booked: [{ day: D10, item: 'i1', name: 'Gingerbread House', quantity: 7 }, { day: D10, item: 'i2', name: 'Mince Pies', quantity: 4 }] };
  var R = m.rpc;
  m.rpc = function (fn, a) {
    if (fn === 'get_seasonal_menu') { seq.push(fn + ':' + a.p_channel); return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__menu)) }); }
    if (fn === 'staff_stage_treats') { seq.push(fn); window.__staged = a; return Promise.resolve({ data: { ok: true, lines: a.p_lines.length } }); }
    if (fn === 'staff_create_order') { seq.push(fn + ':' + (window.__staged && window.__staged.p_key === a.p.idempotency_key ? JSON.stringify(window.__staged.p_lines) + '|' + window.__staged.p_paid_full : 'none')); }
    if (fn === 'staff_set_order_treats') { seq.push(fn + ':' + JSON.stringify(a.p_lines)); return Promise.resolve({ data: { ok: true, treats_total: 36, total: 131, paid: 150, printed: true } }); }
    if (fn === 'staff_seasonal_list') { seq.push(fn); return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__szList)) }); }
    if (fn === 'staff_seasonal_save_item') { seq.push(fn + ':' + JSON.stringify(a.p)); if (a.p.price === '') return Promise.resolve({ data: { ok: false, message: 'Enter the price, for example 35.', field: 'price' } });
      if (a.p.active !== undefined && Object.keys(a.p).length === 2) window.__szList.items.forEach(function (i) { if (i.id === a.p.id) i.active = a.p.active; });
      return Promise.resolve({ data: { ok: true } }); }
    if (fn === 'staff_seasonal_copy_year') { seq.push(fn); return Promise.resolve({ data: { ok: true, copied: 2 } }); }
    if (fn === 'staff_seasonal_save_group') { seq.push(fn + ':' + JSON.stringify(a.p)); return Promise.resolve({ data: { ok: true } }); }
    if (fn === 'staff_seasonal_move') { seq.push(fn + ':' + a.p_dir); return Promise.resolve({ data: { ok: true } }); }
    return R.apply(this, arguments);
  };
  var F = m.from;
  m.from = function (t) {
    if (t === 'order_extras') { var b = { select: function () { return b; }, eq: function () { return b; }, then: function (ok, bad) { return Promise.resolve({ data: [{ order_id: 'o7', item_id: 'i2', name: 'Mince Pies', detail: 'Pack of 3', quantity: 2, unit_price: 12 }] }).then(ok, bad); } }; return b; }
    return F.apply(this, arguments);
  };
}.toString() + ')(' + JSON.stringify(D10) + ',' + JSON.stringify(fiji(0)) + ');';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '.png' }); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { post, extraFoot: loader, ipad: t === 'tablet' });
    if (process.env.DEBUG) p.on('pageerror', e => console.log('ERR', e.stack.split('\n').slice(0, 5).join(' | ')));
    await p.waitForTimeout(1200);
    check(t + ' add-on loaded', await p.evaluate(() => !!window.__ccSeasonal20261026));
    // ---------- counter: Finish order ----------
    await tap(p, '#cc-staff [data-tab="new"]', 1200);
    await p.evaluate((d) => { const a = window.__ccsOf, D = a.V(); Object.assign(D, { name: 'Invented Guest', phone: '912 3456', source: 'walk_in', taken: 'now', takenBy: 'Test Manager', optIn: false, product: 'cheesecake', size: 8, diet: 'no', occasion: 'Birthday', date: d, time: '12:00', method: 'collection' }); D.sl = 7; a.redraw(); }, D10);
    await p.waitForTimeout(1200);
    const row = await p.evaluate(() => { const r = document.querySelector('#ccs-slipform #sl-st-7 .cc-sz-row'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
    check(t + ' Finish order shows the treats row', row && /Festive treats/.test(row) && /None added/.test(row) && /Add treats/.test(row), row);
    await tap(p, '#ccs-slipform [data-cc-sz="counter"]', 700);
    const pk = await p.evaluate(() => { const l = document.getElementById('cc-sz-layer'); if (!l) return null; return { title: l.querySelector('h2').textContent, sub: l.querySelector('.cc-sz-hd p').textContent, names: [...l.querySelectorAll('.cc-sz-txt b')].map(x => x.textContent), why: [...l.querySelectorAll('.cc-sz-txt em')].map(x => x.textContent), plusOff: [...l.querySelectorAll('[data-cc-sz-plus]')].filter(x => x.disabled).map(x => x.getAttribute('data-cc-sz-plus')) }; });
    check(t + ' picker opens for the pickup day', pk && pk.title === 'Add treats' && /For pickup/.test(pk.sub), pk);
    check(t + ' counter sees the wine (counter only)', pk && pk.names.indexOf('Bottle of wine') > -1, pk);
    check(t + ' sold out and not-yet items cannot be added, with the reason', pk && pk.why.indexOf('Sold out for this day') > -1 && pk.why.some(x => /^Pickup from/.test(x)) && pk.plusOff.indexOf('i3') > -1 && pk.plusOff.indexOf('i4') > -1, pk);
    const stepH = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#cc-sz-layer .cc-sz-step button')].map(x => x.getBoundingClientRect().height)));
    check(t + ' plus and minus are touch size (' + Math.round(stepH) + 'px)', stepH >= (t === 'tablet' ? 56 : t === 'phone' ? 48 : 44), stepH);
    for (let i = 0; i < 5; i++) await tap(p, '#cc-sz-layer [data-cc-sz-plus="i1"]', 120);
    check(t + ' daily limit: only 3 Gingerbread Houses left, so it stops at 3', await p.evaluate(() => document.querySelector('#cc-sz-layer [data-cc-sz-plus="i1"]').closest('.cc-sz-item').querySelector('output').textContent === '3'));
    await tap(p, '#cc-sz-layer [data-cc-sz-minus="i1"]', 120); await tap(p, '#cc-sz-layer [data-cc-sz-minus="i1"]', 120);
    await tap(p, '#cc-sz-layer [data-cc-sz-plus="i2"]', 120); await tap(p, '#cc-sz-layer [data-cc-sz-plus="i2"]', 120);
    check(t + ' picker total', await p.evaluate(() => /\$59/.test(document.querySelector('#cc-sz-layer .cc-sz-ft').textContent)));
    await shot(p, 'sz-' + t + '-picker');
    check(t + ' picker fits the screen', await p.evaluate(() => { const r = document.querySelector('#cc-sz-layer .cc-sz-box').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }));
    await tap(p, '#cc-sz-layer [data-cc-sz="done"]', 700);
    const row2 = await p.evaluate(() => { const r = document.querySelector('#ccs-slipform .cc-sz-row'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
    check(t + ' row lists the treats and the total with the cake', row2 && /1 × Gingerbread House, 2 × Mince Pies · \$59/.test(row2) && /Cake \$95 \+ treats \$59 = \$154 total/.test(row2) && /Change treats/.test(row2), row2);
    await tap(p, '#ccs-slipform [data-act="n-plan"][data-v="full"]', 600);
    await tap(p, '#ccs-slipform [data-act="n-paym"][data-v="eftpos"]', 800);
    const save = await p.evaluate(() => [...document.querySelectorAll('#ccs-slipform [data-act="n-submit"]')].map(b => b.textContent).join(' | '));
    check(t + ' save button shows the total with treats', /\$154/.test(save) && !/\$95/.test(save), save);
    const row3 = await p.evaluate(() => document.querySelector('#ccs-slipform .cc-sz-row').textContent);
    check(t + ' says Paid in full covers the treats', /Paid in full covers the treats too/.test(row3), row3);
    await shot(p, 'sz-' + t + '-finish');
    await tap(p, '#ccs-slipform [data-act="n-submit"]', 1800);
    const sq = await p.evaluate(() => window.__seq.filter(x => /^staff_(stage|create)/.test(x)));
    check(t + ' treats are held first, then the order saves with them (paid in full)', sq[0] === 'staff_stage_treats' && sq[1] === 'staff_create_order:[{"id":"i1","quantity":1},{"id":"i2","quantity":2}]|true', sq);
    check(t + ' order saved', await p.evaluate(() => /saved/i.test((document.getElementById('ccs-toast') || {}).textContent || '') || !document.querySelector('#ccs-slipform')), await p.evaluate(() => (document.getElementById('ccs-toast') || {}).textContent));
    // no treats: the form saves exactly as before (no extra call)
    await tap(p, '#cc-staff [data-tab="new"]', 1200);
    await p.evaluate((d) => { const a = window.__ccsOf, D = a.V(); Object.assign(D, { name: 'Second Guest', phone: '912 3457', source: 'walk_in', taken: 'now', takenBy: 'Test Manager', optIn: false, product: 'cheesecake', size: 8, diet: 'no', occasion: 'Birthday', date: d, time: '13:00', method: 'collection' }); D.sl = 7; a.redraw(); }, D10);
    await p.waitForTimeout(900);
    await tap(p, '#ccs-slipform [data-act="n-plan"][data-v="full"]', 500); await tap(p, '#ccs-slipform [data-act="n-paym"][data-v="cash"]', 600);
    const before = await p.evaluate(() => window.__seq.length);
    await tap(p, '#ccs-slipform [data-act="n-submit"]', 1500);
    const sq2 = await p.evaluate(b => window.__seq.slice(b), before);
    if (process.env.DEBUG) console.log('DEBUG', await p.evaluate(() => ({ err: window.__ccsOf.V().err, key: window.__ccsOf.V().key, cart: window.__ccSeasonal.cart(), row: (document.querySelector('#ccs-slipform .cc-sz-row') || {}).textContent, main: (document.querySelector('#ccs-slipform .ccs-err') || {}).textContent })));
    check(t + ' no treats: no extra call, the app saves as before', sq2.filter(x => /stage/.test(x)).length === 0 && sq2.some(x => /^staff_create_order:none/.test(x)), sq2);
    // ---------- open order ----------
    await tap(p, '#cc-staff [data-tab="orders"]', 1200);
    await p.evaluate(() => { const x = document.createElement('button'); x.setAttribute('data-act', 'open-order'); x.setAttribute('data-id', 'o7'); document.getElementById('cc-staff').appendChild(x); x.click(); x.remove(); });
    await p.waitForTimeout(1600);
    const ob = await p.evaluate(() => { const x = document.querySelector('#ccs-sheet .cc-sz-order'); return x ? x.textContent.replace(/\s+/g, ' ').trim() : null; });
    check(t + ' open order shows its treats', ob && /2 × Mince Pies · \$24/.test(ob) && /Change treats/.test(ob), ob);
    await tap(p, '#ccs-sheet [data-cc-sz="order"]', 700);
    check(t + ' change treats starts from what is on the order', await p.evaluate(() => document.querySelector('#cc-sz-layer [data-cc-sz-plus="i2"]').closest('.cc-sz-item').querySelector('output').textContent === '2'));
    await tap(p, '#cc-sz-layer [data-cc-sz-plus="i2"]', 150);
    await tap(p, '#cc-sz-layer [data-cc-sz="done"]', 2000);
    const ch = await p.evaluate(() => window.__seq.filter(x => /^staff_set_order_treats/.test(x)));
    check(t + ' saves the new treats on the order', ch.length === 1 && ch[0] === 'staff_set_order_treats:[{"id":"i2","quantity":3}]', ch);
    const note = await p.evaluate(() => (document.querySelector('#ccs-sheet .cc-sz-note') || {}).textContent || '');
    check(t + ' warns about the refund and the reprint', /paid \$19 more/.test(note) && /Print the kitchen slip again/.test(note), note);
    await shot(p, 'sz-' + t + '-order');
    await p.evaluate(() => { const x = document.querySelector('#ccs-sheet .ccs-x'); if (x) x.click(); }); await p.waitForTimeout(500);
    // ---------- Settings > Seasonal items ----------
    if (t === 'phone') await p.evaluate(() => { const x = document.querySelector('#cc-staff [data-tab="settings"]'); if (x) x.click(); }); else await tap(p, '#cc-staff [data-tab="settings"]', 1500);
    await p.waitForTimeout(1500);
    const entry = await p.evaluate(() => { const d = document.querySelector('#ccs-main .ccs-set details.cc-szm-entry'); if (!d) return null; const prev = d.previousElementSibling; return { prev: prev && prev.querySelector('summary') ? prev.querySelector('summary').textContent : '', sum: d.querySelector('summary').textContent }; });
    check(t + ' Settings has Seasonal items after Cakes and prices', entry && /^Cakes and prices/.test(entry.prev), entry);
    if (t !== 'phone') {
      const nav = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-setnav [data-setk]')].map(x => x.dataset.setk));
      check(t + ' side list has Seasonal items after Cakes and prices', nav.indexOf('Seasonal items') === nav.indexOf('Cakes and prices') + 1, nav);
      await tap(p, '#ccs-main .ccs-setnav [data-setk="Seasonal items"]', 500);
      const vis = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-set > details')].filter(d => d.getClientRects().length && getComputedStyle(d).display !== 'none').map(d => d.querySelector('summary').textContent.trim().slice(0, 20)));
      check(t + ' choosing it shows only Seasonal items', vis.length === 1 && /^Seasonal items/.test(vis[0]) && await p.evaluate(() => document.querySelector('[data-setk="Seasonal items"]').getAttribute('aria-selected') === 'true'), vis);
      check(t + ' its Open button is on screen', await p.evaluate(() => { const b = document.querySelector('[data-cc-szm="open"]'); const r = b && b.getBoundingClientRect(); return !!r && r.height > 0 && r.bottom <= innerHeight; }));
      await tap(p, '#ccs-main .ccs-setnav [data-setk="Closed days"]', 500);
      const vis2 = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-set > details')].filter(d => d.getClientRects().length && getComputedStyle(d).display !== 'none').map(d => d.querySelector('summary').textContent.trim().slice(0, 20)));
      check(t + ' choosing another section hides it again', vis2.length === 1 && /^Closed days/.test(vis2[0]), vis2);
      await tap(p, '#ccs-main .ccs-setnav [data-setk="Seasonal items"]', 500);
    }
    await p.evaluate(() => { const d = document.querySelector('details.cc-szm-entry'); d.open = true; d.querySelector('[data-cc-szm="open"]').click(); });
    await p.waitForTimeout(900);
    const ml = await p.evaluate(() => { const l = document.getElementById('cc-szm'); return l ? { items: [...l.querySelectorAll('.cc-szm-it .cc-sz-txt b')].map(x => x.textContent), pills: [...l.querySelectorAll('.cc-szm-pill')].map(x => x.textContent), sw: [...l.querySelectorAll('.cc-szm-sw')].map(x => x.textContent) } : null; });
    check(t + ' manager list with status and switches', ml && ml.items[0] === 'Gingerbread House · $35' && ml.pills.indexOf('On sale now') > -1 && ml.pills.indexOf('Counter only') > -1 && ml.pills.indexOf('Switched off') > -1 && ml.sw.join() === 'On,Off', ml);
    await shot(p, 'sz-' + t + '-manager');
    await tap(p, '#cc-szm [data-cc-szm="toggle"][data-id="i8"]', 900);
    check(t + ' switch On saves just the switch', await p.evaluate(() => window.__seq.some(x => x === 'staff_seasonal_save_item:{"id":"i8","active":true}')));
    check(t + ' message after switching On', await p.evaluate(() => /Bottle of wine is switched On/.test((document.querySelector('#cc-szm .cc-szm-ok') || {}).textContent || '')));
    await tap(p, '#cc-szm [data-cc-szm="edit-item"][data-id="i1"]', 600);
    check(t + ' change form has every setting', await p.evaluate(() => ['cc-szf-name', 'cc-szf-detail', 'cc-szf-price', 'cc-szf-sale-from', 'cc-szf-sale-to', 'cc-szf-pick-from', 'cc-szf-pick-to', 'cc-szf-lead', 'cc-szf-limit', 'cc-szf-max', 'cc-szf-block', 'cc-szf-file'].every(id => document.getElementById(id)) && document.querySelectorAll('#cc-szm [data-cc-szm="channel"]').length === 2));
    await shot(p, 'sz-' + t + '-edit');
    await p.fill('#cc-szf-price', ''); await tap(p, '#cc-szm [data-cc-szm="save-item"]', 700);
    check(t + ' database message shown when the price is missing', await p.evaluate(() => /Enter the price/.test((document.querySelector('#cc-szm .cc-szm-err') || {}).textContent || '')));
    await p.fill('#cc-szf-price', '36'); await p.fill('#cc-szf-limit', '12');
    await p.evaluate(() => { const i = document.getElementById('cc-szf-block'); i.value = '2099-12-25'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
    await tap(p, '#cc-szm [data-cc-szm="block-add"]', 300);
    check(t + ' typed values kept after adding a blocked day', await p.evaluate(() => document.getElementById('cc-szf-price').value === '36' && document.getElementById('cc-szf-limit').value === '12' && document.querySelectorAll('#cc-szm .cc-szm-chip').length === 1));
    await tap(p, '#cc-szm [data-cc-szm="save-item"]', 900);
    const sv = await p.evaluate(() => window.__seq.filter(x => /^staff_seasonal_save_item:\{"id":"i1"/.test(x)).pop());
    check(t + ' saved with the new price, limit and blocked day', sv && /"price":"36"/.test(sv) && /"daily_limit":"12"/.test(sv) && /"blocked_days":\["2099-12-25"\]/.test(sv), sv);
    check(t + ' back to the list with a message', await p.evaluate(() => /Gingerbread House saved/.test((document.querySelector('#cc-szm .cc-szm-ok') || {}).textContent || '')));
    await tap(p, '#cc-szm [data-cc-szm="tab"][data-v="booked"]', 500);
    const bk = await p.evaluate(() => [...document.querySelectorAll('#cc-szm .cc-szm-day')].map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    check(t + " What's booked by pickup day, and sold so far", bk.length === 2 && /Gingerbread House ?7/.test(bk[0]) && /Mince Pies ?4/.test(bk[0]) && /\$245/.test(bk[1]), bk);
    await tap(p, '#cc-szm [data-cc-szm="tab"][data-v="items"]', 400);
    await tap(p, '#cc-szm [data-cc-szm="copy-year"]', 300);
    await tap(p, '#cc-szm [data-cc-szm="copy-yes"]', 800);
    check(t + ' copy for next year (after a confirm)', await p.evaluate(() => /2 items copied for next year/.test((document.querySelector('#cc-szm .cc-szm-ok') || {}).textContent || '')));
    check(t + ' no horizontal scroll', (await overflow(p)) <= 1, await overflow(p));
    await tap(p, '#cc-szm [data-cc-szm="close"]', 400);
    check(t + ' close', await p.evaluate(() => !document.getElementById('cc-szm')));
    check(t + ' no page errors (the mock\'s known two aside)', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
    check(t + ' no add-on warnings', !logs.filter(m => /\[Seasonal items\]|asset check/.test(m)).length, logs.filter(m => /Seasonal|asset/.test(m)));
    await ctx.close();
  }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
