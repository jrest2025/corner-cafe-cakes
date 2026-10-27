// Cake pickups by day (Analytics > Cake sales): timeline, day summary popover, lead times, events, orders.
// Run: node test/order-tools/test_pickups.cjs
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('answers') + add('pickups');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const sales = async p => { await tap(p, '#cc-staff [data-tab="dash"]', 3000); await p.evaluate(() => { const b = [...document.querySelectorAll('#ccs-main button')].find(x => x.textContent.trim() === 'Sales & Products'); b && b.click(); }); await p.waitForTimeout(3000); };
(async () => {
  const b = await chromium.launch();
  // Daily cake demand unchanged
  const hb = [], snap = [];
  for (const extra of ['', add('answers') + add('pickups')]) {
    const { p } = await open(b, 1440, 900, { extraFoot: fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + extra });
    await p.waitForTimeout(2500); await tap(p, '#cc-staff [data-tab="dash"]', 3500);
    hb.push(await p.evaluate(() => { const r = document.getElementById('cc-demand-scroll-rail'); return r ? r.outerHTML.replace(/\d{1,2}:\d{2}\s?[AP]M/g, '') : ''; }));
    snap.push(await p.evaluate(() => { const v = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).length; return { head: v('.hb-v2 .hb-k-heading'), kpis: v('.hb-v2 .hb-k-kpis'), panels: v('.hb-v2 .hb-k-panels'), view: !!document.getElementById('cc-demand-views') }; }));
    await p.context().close();
  }
  check('Daily cake demand is identical with the timeline add-on', hb[0].length > 1000 && hb[0] === hb[1], [hb[0].length, hb[1].length]);
  check('Overview: Performance snapshot and its three cards hidden (moved to Cake sales); the By booking time view stays', snap[0].head && snap[0].kpis && snap[0].panels && !snap[1].head && !snap[1].kpis && !snap[1].panels && snap[1].view === snap[0].view, snap);
  for (const [w, h, t] of [[1440, 900, 'desktop'], [1180, 820, 'ipad'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: base, ipad: t === 'ipad' });
    await p.waitForTimeout(2500); await sales(p);
    const s = await p.evaluate(() => { const pk = document.querySelector('#ccs-main .cat-page[data-cat="sl"] .pk'), rail = pk && pk.querySelector('.pk-rail'), today = pk && pk.querySelector('.pk-col.is-today');
      const rr = rail && rail.getBoundingClientRect(), tr = today && today.getBoundingClientRect();
      return pk && { cols: pk.querySelectorAll('.pk-col').length, past: pk.querySelectorAll('.pk-col.is-past').length, next: pk.querySelectorAll('.pk-col.is-next').length, todayVisible: tr.left >= rr.left && tr.right <= rr.right,
        busiest: [...document.querySelectorAll('section.cat-card[aria-label="Busiest pickup days"]')].filter(e => e.getClientRects().length).length, scrolls: rail.scrollWidth > rail.clientWidth, side: document.documentElement.scrollWidth - innerWidth }; });
    check(t + ' timeline on Cake sales, past and upcoming days, today in view, scrolls sideways inside itself', s && s.cols > 100 && s.past && s.next && s.todayVisible && s.scrolls && s.side <= 0, s);
    check(t + ' replaces Busiest pickup days', s && s.busiest === 0, s);
    const trio = await p.evaluate(() => { const r = document.querySelector('#ccs-main .cat-page[data-cat="sl"] .pk-trio'); return r && { titles: [...r.querySelectorAll('h3')].map(h => h.textContent), rows: r.querySelectorAll('.cat-br, .cat-bars > *').length, afterPk: r.previousElementSibling && r.previousElementSibling.classList.contains('pk') }; });
    check(t + ' Popular cake types, Booking channels, Customer mix sit on Cake sales under the timeline', trio && trio.titles.join('|') === 'Popular cake types|Booking channels|Customer mix' && trio.rows > 0 && trio.afterPk, trio);
    const d = await p.evaluate(() => { const c = [...document.querySelectorAll('.pk-col.is-past:not(.is-zero)')].pop(); c.scrollIntoView({ inline: 'center', block: 'center' }); return c.getAttribute('data-pk'); });
    await p.waitForTimeout(300);
    await p.evaluate(d => document.querySelector('.pk-col[data-pk="' + d + '"]').click(), d); await p.waitForTimeout(400);
    const pop = await p.evaluate(d => { const e = document.querySelector('.pk-pop'), r = e && e.getBoundingClientRect(), c = document.querySelector('.pk-col[data-pk="' + d + '"]').getBoundingClientRect();
      const cover = r && !(r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom);
      return e && { inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, cover, active: document.querySelector('.pk-col.is-on') && document.querySelector('.pk-col.is-on').getAttribute('data-pk') === d,
        text: e.innerText, stats: e.querySelectorAll('.pk-st').length, seg: e.querySelectorAll('.pk-seg i').length }; }, d);
    check(t + ' tapping a day opens its summary inside the screen, the day marked', pop && pop.inView && pop.active && pop.stats === 4 && pop.seg >= 1, pop);
    if (t !== 'phone') check(t + ' the summary does not cover the tapped day', pop && !pop.cover, pop);
    check(t + ' summary first: cakes, collected, occasions, booked ahead, one insight, then View all orders', /Cakes/.test(pop.text) && /Collected/.test(pop.text) && /Occasions/.test(pop.text) && /Booked ahead|Booking date/.test(pop.text) && /View all orders \(\d+\)/.test(pop.text), pop.text);
    await p.evaluate(() => document.querySelector('.pk-pop [data-pkall]').click()); await p.waitForTimeout(300);
    const L = await p.evaluate(() => [...document.querySelectorAll('.pk-pop .pk-o')].map(o => ({ open: o.getAttribute('data-act') === 'open-order' && !!o.getAttribute('data-id'), t: o.innerText })));
    check(t + ' View all orders lists each order with placed date, lead time, occasion and status', L.length && L.every(o => /Placed/.test(o.t) && /(days? ahead|lead time not known)/.test(o.t) && /Qty \d/.test(o.t)), L.slice(0, 2));
    check(t + ' app orders open their existing record', L.some(o => o.open), L.map(o => o.open));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check(t + ' Escape closes the summary', await p.evaluate(() => !document.querySelector('.pk-pop') && !document.querySelector('.pk-col.is-on')));
    await p.evaluate(() => { const c = document.querySelector('.pk-col.is-today'); c.click(); }); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('#ccs-main h2, #ccs-main .cat-title').click()); await p.waitForTimeout(200);
    check(t + ' tapping elsewhere closes it', await p.evaluate(() => !document.querySelector('.pk-pop')));
    check(t + ' no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
    await p.context().close();
  }
  // Known answers from hand-made orders on Valentine's Day
  const { p } = await open(b, 1440, 900, { extraFoot: base });
  await p.waitForTimeout(2000);
  const k = await p.evaluate(() => {
    const P = window.CCCakePickups; P._hol.list = [{ a: '2027-02-14', b: '2027-02-14', k: 'e', name: "Valentine's Day" }]; P._hol.loaded = true;
    const o = (i, oc, q, od, odok, cp, st) => ({ i, r: 'CC-' + i, pd: '2027-02-14', pt: '15:00', od, odok, oc, cp, st: st || 'confirmed', it: [['Red Velvet', null, 8, q, 52]] });
    const x = { today: () => '2027-02-20', data: { allOrders: [o('a', 'valentines_day', 1, '2027-02-06', true, 'recorded'), o('b', 'birthday', 2, '2027-02-12', true, 'recorded'), o('c', 'not_specified', 1, '2027-02-14', false, null), o('d', 'birthday', 3, '2027-02-01', true, null, 'cancelled')] },
      match: () => true, occName: c => ({ valentines_day: "Valentine's Day", birthday: 'Birthday' })[c] || c };
    const D = P.build(x), el = document.createElement('div'); el.innerHTML = P.summary(D, '2027-02-14');
    const J = e => [...e.children].map(c => c.textContent.trim()).join(' '); const st = [...el.querySelectorAll('.pk-st')].map(J);
    const fut = Object.assign({}, x, { today: () => '2027-02-10' }), F = P.build(fut), f = document.createElement('div'); f.innerHTML = P.summary(F, '2027-02-14');
    return { st, lead: [...el.querySelectorAll('.pk-lead > span')].map(J).join(' '), note: [...el.querySelectorAll('.pk-note')].map(e => e.textContent), ins: el.querySelector('.pk-ins').textContent,
      leg: [...el.querySelectorAll('.pk-leg > span')].map(e => e.textContent.trim()).join(' | '), fut: [...f.querySelectorAll('.pk-st')].map(J), bk: D.bk['2027-02-14'], seg: [...el.querySelectorAll('.pk-sec')][1].querySelectorAll('.pk-seg i').length };
  });
  check('4 cakes from 3 live orders; the cancelled order is left out', k.st[0] === 'Cakes 4 3 orders' && k.note.some(x => /1 cancelled order is not counted/.test(x)), k);
  check('collected = recorded only (3 of 4); occasion 3, regular 1', /^Collected 3 1 not marked collected/.test(k.st[1]) && /^Occasion 3/.test(k.st[2]) && /^Regular 1/.test(k.st[3]), k.st);
  check('lead times from verified order dates only: 8 and 2 days', /5 days average 2 days shortest 8 days longest/.test(k.lead) && k.note.some(x => /known for 3 of 4 cakes/.test(x)), k);
  check("a cake collected on Valentine's Day is not called a Valentine's cake unless recorded", /1 of 4 cakes was ordered for Valentine's Day/.test(k.ins) && /Valentine's Day 1/.test(k.leg) && /Birthday 2/.test(k.leg) && /Regular or not recorded 1/.test(k.leg), k);
  check('bars split by booking time: 1 cake 8+ days, 2 cakes 1 to 2 days, 1 not known (cancelled left out)', k.bk.weeks === 1 && k.bk.days === 2 && k.bk.unknown === 1 && !k.bk.week && !k.bk.same && k.seg === 3, k.bk);
  check('future day: scheduled, not counted as collected', /^Collected — upcoming/.test(k.fut[1]), k.fut);
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
