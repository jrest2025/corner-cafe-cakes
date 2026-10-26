// Treat orders board in the Service Hub (treats ordered without a cake). Live head/footer, live bundle, mock database.
// Run: node test/order-tools/test_treat_orders.cjs
const { open, tap, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const loader = '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.treat-orders.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const post = '(' + function (T0, T1, T3, TM1) {
  var m = window.__ccsMock, seq = window.__toSeq = [];
  var it = function (n, q, p) { return { name: n, detail: n === 'Mince Pies' ? 'Pack of 3' : null, quantity: q, price: p }; };
  window.__to = { ok: true, today: T0, can_edit: true, can_create: true, can_pay: true, orders: [
    { id: 't1', reference: 'T-1001', status: 'new', source: 'online', pickup_date: T1, pickup_time: '11:00:00', name: 'Mere Tui', phone: '912 3456', note: 'Gift wrap please', total: 82, paid: 0, items: [it('Gingerbread House', 2, 35), it('Mince Pies', 1, 12)] },
    { id: 't2', reference: 'T-1002', status: 'confirmed', source: 'counter', pickup_date: T0, pickup_time: '15:00:00', name: 'Ravi Kumar', phone: '7001234', total: 30, paid: 0, confirmed_by_label: 'Test Manager', items: [it('Bottle of wine', 1, 30)] },
    { id: 't3', reference: 'T-1003', status: 'confirmed', source: 'online', pickup_date: T3, pickup_time: '10:00:00', name: 'Ana Guest', phone: '9988776', total: 24, paid: 24, items: [it('Mince Pies', 2, 12)] },
    { id: 't4', reference: 'T-1004', status: 'collected', source: 'online', pickup_date: TM1, pickup_time: '12:00:00', name: 'Old Order', phone: '9111111', total: 35, paid: 35, collected_by_label: 'Test Staff', items: [it('Gingerbread House', 1, 35)] }] };
  var R = m.rpc;
  m.rpc = function (fn, a) {
    if (fn === 'staff_treat_orders') { seq.push(fn); return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__to)) }); }
    if (fn === 'staff_treat_order_action') {
      seq.push(fn + ':' + a.p_action + ':' + a.p_id + (a.p_amount != null ? ':' + a.p_amount + ':' + a.p_method : '') + (a.p_note ? ':' + a.p_note : ''));
      var o = window.__to.orders.filter(function (x) { return x.id === a.p_id; })[0];
      if (a.p_action === 'pay') { if (o.paid + a.p_amount > o.total) return Promise.resolve({ data: { ok: false, message: 'Only $' + (o.total - o.paid) + ' is still to pay.' } }); o.paid += a.p_amount; }
      if (a.p_action === 'confirm') o.status = 'confirmed'; if (a.p_action === 'collected') o.status = 'collected'; if (a.p_action === 'cancel') { o.status = 'cancelled'; o.cancel_reason = a.p_note; }
      return Promise.resolve({ data: { ok: true, status: o.status, paid: o.paid, total: o.total } });
    }
    if (fn === 'get_seasonal_menu') { seq.push(fn + ':' + a.p_channel); return Promise.resolve({ data: { ok: true, today: T0, groups: [{ id: 'g1', name: 'Festive treats', items: [
      { id: 'i1', name: 'Gingerbread House', price: 35, lead_days: 2, limit: 10, left: {}, blocked: [], sold_out: [] }, { id: 'i8', name: 'Bottle of wine', price: 30, counter_only: true, lead_days: 0, blocked: [], sold_out: [] }] }] } }); }
    if (fn === 'staff_create_treat_order') { seq.push(fn + ':' + JSON.stringify(a.p)); window.__to.orders.push({ id: 't9', reference: 'T-1009', status: 'confirmed', source: 'counter', pickup_date: a.p.date, pickup_time: a.p.time + ':00', name: a.p.name, phone: a.p.phone, total: 65, paid: a.p.paid, items: [] }); return Promise.resolve({ data: { ok: true, reference: 'T-1009', id: 't9', total: 65 } }); }
    return R.apply(this, arguments);
  };
}.toString() + ')(' + [0, 1, 3, -1].map(d => JSON.stringify(fiji(d))).join(',') + ');';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '.png' }); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { post, extraFoot: loader, ipad: t === 'tablet' });
    await p.waitForTimeout(1500);
    const bn = await p.evaluate(() => { const x = document.querySelector('#ccs-main[data-screen="today"] .cc-to-banner'); return x ? x.textContent.replace(/\s+/g, ' ').trim() : null; });
    check(t + ' Today banner: 1 new request, 1 to collect today', bn && /1 new request to confirm/.test(bn) && /1 to collect today/.test(bn), bn);
    if (process.env.DEBUG) console.log(await p.evaluate(() => { const x = document.querySelector('.cc-to-banner'), m = document.querySelector('#ccs-main'); const cs = getComputedStyle(m); return JSON.stringify([cs.display, cs.gridTemplateAreas, [...m.children].map(c => [c.className.split(' ')[0], getComputedStyle(c).order, getComputedStyle(c).gridArea, Math.round(c.getBoundingClientRect().top)])]); }));
    await shot(p, 'to-' + t + '-today');
    await tap(p, '.cc-to-banner [data-cc-to="open"]', 700);
    const bd = await p.evaluate(() => { const l = document.getElementById('cc-to'); if (!l) return null; return { days: [...l.querySelectorAll('.cc-to-dh h3')].map(x => x.childNodes[0].textContent.trim()), refs: [...l.querySelectorAll('.cc-to-ref')].map(x => x.textContent), kp: [...l.querySelectorAll('.cc-to-kpis b')].map(x => x.textContent), times: [...l.querySelectorAll('.cc-to-time')].map(x => x.textContent), tot: [...l.querySelectorAll('.cc-to-dh p')].map(x => x.textContent) }; });
    check(t + ' board opens on To do, grouped by day (Today first)', bd && bd.days[0] === 'Today' && bd.days[1] === 'Tomorrow' && bd.refs.length === 3 && !bd.refs.some(r => /T-1004/.test(r)), bd);
    check(t + ' times in 12-hour format', bd && bd.times.indexOf('3:00 PM') > -1 && bd.times.indexOf('11:00 AM') > -1, bd);
    check(t + ' day totals list the items', bd && bd.tot.some(x => /2 × Gingerbread House, 1 × Mince Pies/.test(x)), bd);
    const bh = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#cc-to .cc-to-acts .ccs-btn')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect().height)));
    check(t + ' action buttons touch size (' + Math.round(bh) + ')', bh >= (t === 'tablet' ? 56 : t === 'phone' ? 48 : 40), bh);
    await shot(p, 'to-' + t + '-board');
    // confirm the new request
    await tap(p, '#cc-to [data-cc-to="confirm"][data-id="t1"]', 600);
    check(t + ' confirm sent', await p.evaluate(() => window.__toSeq.indexOf('staff_treat_order_action:confirm:t1') > -1));
    // collect with money owing asks first, then record payment
    await tap(p, '#cc-to [data-cc-to="collect"][data-id="t2"]', 400);
    const ask = await p.evaluate(() => (document.querySelector('#cc-to .cc-to-panel h4') || {}).textContent);
    check(t + ' collecting with $30 owing asks first', /still has \$30 to pay/.test(ask || ''), ask);
    await tap(p, '#cc-to .cc-to-panel [data-cc-to="pay"]', 400);
    await tap(p, '#cc-to [data-cc-to="pay-save"]', 300);
    check(t + ' payment needs a method', await p.evaluate(() => /Tap how they paid/.test(document.querySelector('#cc-to .cc-to-panel').textContent)));
    await tap(p, '#cc-to [data-cc-to="method"][data-v="eftpos"]', 200); await tap(p, '#cc-to [data-cc-to="pay-save"]', 600);
    check(t + ' payment of the balance saved', await p.evaluate(() => window.__toSeq.indexOf('staff_treat_order_action:pay:t2:30:eftpos') > -1), await p.evaluate(() => window.__toSeq));
    await tap(p, '#cc-to [data-cc-to="collect"][data-id="t2"]', 600);
    check(t + ' then collected straight away', await p.evaluate(() => window.__toSeq.indexOf('staff_treat_order_action:collected:t2') > -1));
    // cancel needs a reason
    await tap(p, '#cc-to [data-cc-to="cancel"][data-id="t3"]', 400); await tap(p, '#cc-to [data-cc-to="cancel-yes"]', 300);
    check(t + ' cancel needs a reason', await p.evaluate(() => /why it is cancelled/.test(document.querySelector('#cc-to .cc-to-panel').textContent)));
    check(t + ' cancel warns about the refund', await p.evaluate(() => /\$24 was paid/.test(document.querySelector('#cc-to .cc-to-panel').textContent)));
    await tap(p, '#cc-to [data-cc-to="reason"][data-v="Customer cancelled"]', 200); await tap(p, '#cc-to [data-cc-to="cancel-yes"]', 600);
    check(t + ' cancelled with the reason', await p.evaluate(() => window.__toSeq.indexOf('staff_treat_order_action:cancel:t3:Customer cancelled') > -1));
    // new treat order at the counter
    await tap(p, '#cc-to [data-cc-to="new"]', 700);
    const f = await p.evaluate(() => ({ names: [...document.querySelectorAll('#cc-to .cc-to-pt b')].map(x => x.textContent), times: [...document.querySelectorAll('#cc-to [data-cc-to="f-time"]')].map(x => x.textContent) }));
    check(t + ' new order: counter items including wine, 12-hour times', f.names.indexOf('Bottle of wine') > -1 && f.times[0] === '9:00 AM' && f.times.indexOf('8:00 PM') > -1, f);
    await tap(p, '#cc-to [data-cc-to="f-save"]', 300);
    check(t + ' new order asks for a treat first', await p.evaluate(() => /Add at least one treat/.test(document.getElementById('cc-to').textContent)));
    await tap(p, '#cc-to [data-cc-to="f-plus"][data-id="i1"]', 200); await tap(p, '#cc-to [data-cc-to="f-plus"][data-id="i8"]', 200);
    await tap(p, '#cc-to [data-cc-to="f-time"][data-v="16:00"]', 200);
    await p.fill('#cc-to-fname', 'Walk In'); await p.fill('#cc-to-fphone', '9123000');
    await tap(p, '#cc-to [data-cc-to="f-paid"][data-v="full"]', 200);
    await shot(p, 'to-' + t + '-new');
    await tap(p, '#cc-to [data-cc-to="f-save"]', 800);
    const made = await p.evaluate(() => window.__toSeq.filter(x => /^staff_create_treat_order/.test(x)).map(x => JSON.parse(x.split(/:(.+)/)[1]))[0]);
    check(t + ' new order saved: today 4 PM, paid $65 cash, confirmed', made && made.time === '16:00' && made.paid === 65 && made.method === 'cash' && made.confirm_now === true && made.treats.length === 2 && /^[0-9a-f-]{36}$/.test(made.idempotency_key), made);
    check(t + ' message with the new reference', await p.evaluate(() => /T-1009 saved/.test((document.querySelector('#cc-to .cc-to-ok') || {}).textContent || '')));
    check(t + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    await tap(p, '#cc-to [data-cc-to="close"]', 400);
    check(t + ' board closes', await p.evaluate(() => !document.getElementById('cc-to')));
    check(t + ' no page errors or add-on warnings', !errors.length && !logs.filter(x => /Treat orders/.test(x)).length, errors.concat(logs.filter(x => /Treat orders/.test(x))));
    await ctx.close();
  }
  // a login without order access sees nothing
  { const { p, ctx } = await open(b, 1366, 900, { post: post.replace("seq.push(fn); return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__to)) });", "return Promise.resolve({ data: { ok: false, error: 'forbidden' } });"), extraFoot: loader });
    await p.waitForTimeout(1500);
    check('no order access: no banner', await p.evaluate(() => !document.querySelector('.cc-to-banner')));
    await ctx.close(); }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
