const fs = require('fs'); const { open, tap, chromium } = require('./harness.cjs');
const SHA = process.env.SHA || '0000000';
const loader = '<script>(function(){[["' + SHA + '","src/staff.analytics-birthday.js","__ccBirthdayComeback20261026"]].forEach(function(f){fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@"+f[0]+"/"+f[1]).then(function(r){return r.text()}).then(function(t){if(t.indexOf(f[2])<0)throw Error("bad");var s=document.createElement("script");s.text=t;document.body.appendChild(s)}).catch(function(e){console.error("[Birthday comeback] not loaded",e)})})})();</script>';
const T = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
const add = n => { const d = new Date(T + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const sample = { ok: true, today: T, days: 60, summary: { people: 3, can_message: 1, check_first: 1, ask_first: 1, value: 216 },
  months: Array.from({ length: 12 }, (_, i) => { const d = new Date(T.slice(0, 7) + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + i); return { month: d.toISOString().slice(0, 7), people: [0, 2, 4, 3, 2, 6, 5, 19, 60, 58, 68, 21][i], value: [0, 106, 179, 120, 90, 300, 260, 1100, 3500, 3300, 4000, 1200][i] }; }),
  people: [
    { id: 'c1', no: 6, name: 'Test Customer A', phone: '912 0001', next: add(9), in_days: 9, last: add(-356), ref: 'H-0006', cake: 'Mud Cake', size: 8, amount: 68, orders: 1, spent: 68, message: 'yes' },
    { id: 'c2', no: 7, name: 'Test Customer B', phone: '912 0002', next: add(20), in_days: 20, last: add(-345), ref: 'H-0010', cake: 'Red Velvet', size: 6, amount: 38, orders: 3, spent: 150, message: 'check' },
    { id: 'c3', no: 8, name: 'Test Customer C', phone: null, next: add(41), in_days: 41, last: add(-324), ref: 'H-0020', cake: 'Custom cake', size: null, amount: 110, orders: 2, spent: 190, message: 'ask' }] };
const post = "(function(){var m=window.__ccsMock,r=m.rpc;m.rpc=function(fn,a){if(fn==='crm_birthday_comeback'){(window.__bc=window.__bc||[]).push(a);var d=JSON.parse(JSON.stringify(" + JSON.stringify(sample) + "));d.days=a.p_days;if(a.p_days===30){d.people=d.people.slice(0,2);d.summary.people=2}return Promise.resolve({data:d})}return r.apply(this,arguments)}})();";
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { post, extraFoot: loader, ipad: t === 'tablet' });
    await p.waitForTimeout(900);
    await tap(p, '#cc-staff [data-tab="dash"]', 4000);
    const hbBefore = await p.evaluate(() => { const h = document.getElementById('cc-heartbeat'); return h ? h.innerHTML.length : 0; });
    await p.evaluate(() => document.querySelector('#ccs-main [data-g="anm"][data-v="cu"]').click()); await p.waitForTimeout(1500);
    check(t + ' card shows in Analytics > Customers', await p.evaluate(() => !!document.querySelector('#ccs-main .cat-page[data-cat="cu"] .cc-bc')));
    check(t + ' card sits before "What to do"', await p.evaluate(() => { const c = document.querySelector('.cc-bc'), td = document.querySelector('.cat-todo'); return !td || (c.compareDocumentPosition(td) & 4) > 0; }));
    const k = await p.evaluate(() => [...document.querySelectorAll('.cc-bc .cc-bc-kpi b')].map(e => e.textContent));
    check(t + ' three numbers: 3 people, 1 can message, $216', JSON.stringify(k) === JSON.stringify(['3', '1', '$216']), k);
    check(t + ' 12-month chart with 12 bars', await p.evaluate(() => document.querySelectorAll('.cc-bc .cc-bc-col').length === 12));
    const rows = await p.evaluate(() => [...document.querySelectorAll('.cc-bc .cc-bc-row')].map(r => ({ tag: r.querySelector('.cc-bc-tag').textContent, wa: !!r.querySelector('.cc-bc-wa'), href: (r.querySelector('.cc-bc-wa') || {}).href || '' })));
    check(t + ' WhatsApp button only for "Can message"', rows.length === 3 && rows[0].tag === 'Can message' && rows[0].wa && !rows[1].wa && !rows[2].wa, rows);
    check(t + ' WhatsApp link uses the Fiji number and a friendly message', /wa\.me\/6799120001\?text=Bula%20Test/.test(rows[0].href), rows[0].href);
    await tap(p, '.cc-bc [data-cc-bc-days="30"]', 900);
    check(t + ' range switch asks for 30 days and redraws', await p.evaluate(() => (window.__bc || []).some(a => a.p_days === 30) && document.querySelectorAll('.cc-bc .cc-bc-row').length === 2));
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(t + ' no horizontal scroll', over <= 1, over);
    await p.evaluate(() => document.querySelector('.cc-bc').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
    await p.screenshot({ path: 'shots/bc-' + t + '.png' });
    await p.evaluate(() => document.querySelector('#ccs-main [data-g="anm"][data-v="ov"]').click()); await p.waitForTimeout(1200);
    const hbAfter = await p.evaluate(() => { const h = document.getElementById('cc-heartbeat'); return h ? h.innerHTML.length : 0; });
    check(t + ' card not on the Overview tab', !(await p.evaluate(() => !!document.querySelector('#ccs-main .cc-bc'))));
    check(t + ' Daily cake demand still there', hbAfter > 0 && await p.evaluate(() => /Daily cake demand/.test(document.querySelector('#ccs-main').textContent)), { hbBefore, hbAfter });
    await p.evaluate(() => document.querySelector('#ccs-main [data-g="anm"][data-v="cu"]').click()); await p.waitForTimeout(1200);
    await tap(p, '.cc-bc .cc-bc-name', 1500);
    check(t + ' tapping a name opens the customer', await p.evaluate(() => !!document.querySelector('#ccs-sheet')));
    check(t + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
    check(t + ' no add-on warnings', !logs.filter(m => /Birthday comeback/.test(m)).length, logs.filter(m => /Birthday comeback/.test(m)));
    await ctx.close();
  }
  await b.close(); console.log('\n' + n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
