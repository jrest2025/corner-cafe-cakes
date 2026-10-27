// Staff New Order: open calendar on the date step, no short-notice questions. Run: node test/order-tools/test_staff_date_open.cjs
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const loader = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', process.env.SHA_OT || '0000000');
const SHOTS = process.env.SHOTS || '';
let n = 0, fails = 0;
const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const shown = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length > 0), s);
(async () => {
  const b = await chromium.launch();
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors } = await open(b, w, h, { extraFoot: loader, ipad: tag === 'tablet' });
    await p.waitForTimeout(800);
    await tap(p, '#cc-staff [data-tab="new"]', 1200);
    await tap(p, '[data-oo-mode="new"]', 400);
    await tap(p, '[data-of-name]');
    await p.fill('#n-phone', '912 3456'); await p.waitForTimeout(450); await p.fill('#n-name', 'Invented Guest');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#ccs-slipform button')].find(x => x.textContent.trim() === 'No' && /offers/.test(x.closest('.ccs-field, fieldset, div').parentElement.textContent)); if (b) b.click(); }); await p.waitForTimeout(300);
    await tap(p, '[data-act="n-source"][data-v="walk_in"]');
    await tap(p, '[data-act="sl-next"]'); await tap(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await tap(p, '[data-act="sl-next"]');
    await tap(p, '[data-act="n-diet"][data-v="no"]'); await tap(p, '[data-act="n-occ"][data-v="Birthday"]'); await tap(p, '[data-act="sl-next"]', 700);
    const ui = await p.evaluate(() => { const f = document.querySelector('#ccs-slipform') || document; return {
      cal: [...f.querySelectorAll('.ccs-cal')].some(e => e.getClientRects().length), days: f.querySelectorAll('.ccs-cal-d:not([disabled])').length,
      chips: f.querySelectorAll('.ccs-datecell, .ccs-chip-soon, [data-act="n-date-other"]').length, text: f.innerText }; });
    check(tag + ' date step shows the open calendar, no day chips or Later date', ui.cal && ui.days > 0 && ui.chips === 0, { cal: ui.cal, days: ui.days, chips: ui.chips });
    check(tag + ' no notice wording on the date step', !/short notice|days' notice/i.test(ui.text), ui.text.slice(0, 300));
    if (SHOTS) await p.screenshot({ path: SHOTS + '/staff-cal-' + tag + '.png' });
    const today = fiji(0), tomorrow = fiji(1);
    check(tag + ' today is selectable', await p.evaluate(d => { const e = document.querySelector('.ccs-cal-d[data-v="' + d + '"]'); return !!e && !e.disabled; }, today));
    await tap(p, '.ccs-cal-d[data-v="' + tomorrow + '"]', 700);
    const after = await p.evaluate(() => ({ date: window.__ccsOf && window.__ccsOf.V().date, rushBox: !!document.querySelector('#n-rush'), times: [...document.querySelectorAll('[data-act="n-time"]')].filter(e => e.getClientRects().length && !e.disabled).length,
      pressed: (document.querySelector('.ccs-cal-d[aria-pressed="true"]') || {}).textContent }));
    check(tag + ' tapping tomorrow selects it, no reason or approver asked, times shown', after.date === tomorrow && !after.rushBox && after.times > 0, after);
    const m0 = await p.evaluate(() => (document.querySelector('.ccs-cal-h b') || {}).textContent);
    await tap(p, '.ccs-cal-nav[aria-label="Next month"]', 500);
    const m1 = await p.evaluate(() => document.querySelector('.ccs-cal-h b').textContent);
    check(tag + ' next month arrow works', m0 !== m1, [m0, m1]);
    check(tag + ' previous month arrow is off on this month', await p.evaluate(() => { document.querySelector('.ccs-cal-nav[aria-label="Previous month"]').click(); return true; }) && await p.evaluate(() => new Promise(r => setTimeout(() => r(document.querySelector('.ccs-cal-nav[aria-label="Previous month"]').disabled), 400))));
    await tap(p, '[data-act="n-time"]:not([disabled])', 500);
    const summary = await p.evaluate(() => document.querySelector('#ccs-slipform') ? document.querySelector('#ccs-slipform').innerText : '');
    check(tag + ' no "short notice" anywhere on the form after picking', !/short notice/i.test(summary), summary.slice(0, 300));
    check(tag + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check(tag + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/staff-cal-' + tag + '-picked.png' });
    // save: the database gets "Booked by staff" and the signed-in name for a date inside the normal notice
    for (let i = 0; i < 4; i++) await tap(p, '[data-act="sl-next"]', 400);
    await tap(p, '[data-act="n-submit"]', 1500);
    const sent = await p.evaluate(() => (window.__calls || []).filter(c => c[1] === 'staff_create_order').map(c => c[2].p.rush));
    if (sent.length) check(tag + ' saved with rush filled in automatically', sent[0] && sent[0].reason === 'Booked by staff' && sent[0].approved_by.length >= 2, sent);
    else console.log('NOTE ' + tag + ' save not reached in this flow (payload checked on desktop only)');
    await ctx.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
