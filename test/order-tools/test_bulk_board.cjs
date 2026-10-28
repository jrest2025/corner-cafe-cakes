// 28 Oct 2026: corporate and bulk requests on the Seasonal orders board (company, delivery, invoice, agreed price).
const { open, tap, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const loader = '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.treat-orders.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const post = '(' + function (T0, T5) {
  var m = window.__ccsMock, seq = window.__toSeq = [];
  window.__to = { ok: true, today: T0, can_edit: true, can_create: true, can_pay: true, orders: [
    { id: 'b1', reference: 'T-1010', status: 'new', source: 'online', kind: 'bulk', company: 'Pacific Tours Ltd', email: 'office@pacifictours.com.fj', fulfilment: 'delivery', delivery_address: 'Lot 4, Queens Road, Nadi', pay_pref: 'invoice', list_total: 300, pickup_date: T5, pickup_time: '10:00:00', name: 'Asha Lal', phone: '912 3456', total: 300, paid: 0, items: [{ name: 'Festive Cookies', quantity: 25, price: 12 }] }] };
  var R = m.rpc;
  m.rpc = function (fn, a) {
    if (fn === 'staff_treat_orders') return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__to)) });
    if (fn === 'staff_treat_order_action') { seq.push(a.p_action + ':' + a.p_amount); var o = window.__to.orders[0]; if (a.p_action === 'quote') o.total = a.p_amount; if (a.p_action === 'confirm') o.status = 'confirmed'; return Promise.resolve({ data: { ok: true, status: o.status, paid: o.paid, total: o.total } }); }
    if (fn === 'get_seasonal_menu') return Promise.resolve({ data: { ok: true, groups: [] } });
    return R.apply(this, arguments);
  };
}.toString() + ')(' + [0, 5].map(d => JSON.stringify(fiji(d))).join(',') + ');';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { post, extraFoot: loader, ipad: t === 'tablet' });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const x = document.querySelector('[data-cc-to="open"],[data-cc-so]'); if (x) x.click(); }); await p.waitForTimeout(700);
    const c = await p.evaluate(() => { const a = document.querySelector('#cc-to [data-id="b1"]'); return a && { bulk: (a.querySelector('.cc-to-bulk') || {}).textContent, state: (a.querySelector('.cc-to-state') || {}).textContent, btns: [...a.querySelectorAll('.cc-to-acts .ccs-btn')].map(x => x.textContent) }; });
    check(t + ': corporate card shows company, delivery, invoice, list price', c && /Pacific Tours Ltd/.test(c.bulk) && /Deliver: Lot 4/.test(c.bulk) && /Invoice/.test(c.bulk) && /List price \$300/.test(c.bulk) && /agree the price/.test(c.state), c);
    check(t + ': Agree price button next to Confirm', c && c.btns.indexOf('Agree price') > -1 && c.btns.indexOf('Confirm') > -1, c);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/bulk-board-' + t + '.png' });
    await tap(p, '#cc-to [data-cc-to="quote"][data-id="b1"]', 300);
    await p.fill('#cc-to-amt', '270'); await tap(p, '#cc-to [data-cc-to="quote-save"]', 700);
    const q = await p.evaluate(() => ({ seq: window.__toSeq, txt: (document.querySelector('#cc-to [data-id="b1"] .cc-to-bprice') || {}).textContent }));
    check(t + ': agreed price $270 saved, shown with the list price struck', q.seq.indexOf('quote:270') > -1 && /Agreed \$270/.test(q.txt) && /\$300/.test(q.txt), q);
    check(t + ': no page errors', !errors.length, errors);
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
