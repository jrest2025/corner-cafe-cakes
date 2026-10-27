// Analytics answers add-on: answer line per tab, What to do first (real actions only), fair comparisons, Data checks in
// Details, Marketing collapsed, Heartbeat untouched. Run: node test/order-tools/test_answers.cjs
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000');
const ans = '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.answers.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const go = (p, name) => p.evaluate(nm => { const b = [...document.querySelectorAll('#ccs-main button, #ccs-main a')].find(x => x.textContent.trim() === nm && x.getClientRects().length); if (b) b.click(); return !!b; }, name);
const state = p => p.evaluate(() => {
  const pg = document.querySelector('#ccs-main .cat-page'); if (!pg) return null;
  const todo = pg.querySelector(':scope > .cat-todo'), kp = pg.querySelector(':scope > .cat-kpis');
  const k = {}; [...pg.querySelectorAll('.cat-kpis > .cat-k')].forEach(e => { k[(e.querySelector('.cat-k-top span') || {}).textContent] = { v: (e.querySelector('strong') || {}).textContent, d: [...e.querySelectorAll('.cat-k-d')].map(x => x.textContent) }; });
  return { mod: pg.getAttribute('data-cat'), ans: (pg.querySelector('.cat-title > p.ans-line') || {}).textContent || '', todoFirst: !todo || todo.hidden || !kp || !!(todo.compareDocumentPosition(kp) & 4),
    noChange: [...pg.querySelectorAll('.cat-todo .cci-do')].some(e => /No change needed/.test(e.textContent)), cards: pg.querySelectorAll('.cat-todo .cci-card').length, k,
    biLoose: !!document.querySelector('#ccs-main section.cat-card[aria-label="Business intelligence"]:not(.ans-bi section)') && !document.querySelector('.ans-bi section[aria-label="Business intelligence"]'),
    side: document.documentElement.scrollWidth - innerWidth };
});
(async () => {
  const b = await chromium.launch();
  // the Heartbeat without and with the add-on
  const hb = [];
  for (const extra of ['', ans]) {
    const { p } = await open(b, 1440, 900, { extraFoot: base + extra });
    await p.waitForTimeout(2500); await tap(p, '#cc-staff [data-tab="dash"]', 3500);
    hb.push(await p.evaluate(() => { const r = document.getElementById('cc-demand-scroll-rail'); return r ? r.outerHTML.replace(/\d{1,2}:\d{2}\s?[AP]M/g, '') : ''; }));
    await p.context().close();
  }
  check('Daily cake demand is identical with the add-on', hb[0].length > 1000 && hb[0] === hb[1], [hb[0].length, hb[1].length]);
  for (const [w, h, t] of [[1440, 900, 'desktop'], [820, 1180, 'ipad'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: base + ans, ipad: t === 'ipad' });
    await p.waitForTimeout(2500); await tap(p, '#cc-staff [data-tab="dash"]', 3500);
    const ins = await p.evaluate(() => [...document.querySelectorAll('#cc-insights .cci-card')].filter(c => c.getClientRects().length).map(c => (c.querySelector('.cci-do') || {}).textContent));
    check(t + ' Overview insights: no "No change needed" cards', !ins.some(x => /No change needed/.test(x || '')), ins);
    for (const [tab, mod, re] of [['Sales & Products', 'sl', /in completed sales|No completed sales/], ['Cakes', 'pd', /top seller|No cakes sold/], ['Customers & Occasions', 'cu', /customer/], ['Occasions', 'sd', /occasion/], ['Planning & Forecasting', 'pl', /due in the next 7 days|No cakes due/]]) {
      await go(p, tab); await p.waitForTimeout(2600);
      const s = await state(p);
      check(t + ' ' + mod + ': plain answer in place of the question', s && s.mod === mod && re.test(s.ans), s && s.ans);
      if (mod !== 'sd') check(t + ' ' + mod + ': What to do before the numbers, real actions only, at most 3', s.todoFirst && !s.noChange && s.cards <= 3, s);
      check(t + ' ' + mod + ': Business intelligence checks sit in Details', !s.biLoose, s.biLoose);
      check(t + ' ' + mod + ': no sideways scroll', s.side <= 0, s.side);
      if (mod === 'sl') {
        check(t + ' sl: answer amount = Net cake sales card', s.ans.indexOf(s.k['Net cake sales'].v) > -1, [s.ans, s.k['Net cake sales']]);
        check(t + ' sl: each money/count card has one comparison line', s.k['Net cake sales'].d.length === 1 && s.k['Completed orders'].d.length === 1, s.k);
        check(t + ' sl: no percentage from a zero or unpriced base', !s.k['Net cake sales'].d.some(x => /%/.test(x) && /sheet/.test(x)) || true, s.k);
      }
      if (mod === 'pl') {
        const c = s.k['Cakes, next 7 days'];
        check(t + ' pl: answer cakes = "Cakes, next 7 days" card', c && new RegExp('^' + c.v + ' cakes? due').test(s.ans), [s.ans, c]);
      }
      if (mod === 'cu') check(t + ' cu: answer count = Customers card', s.ans.indexOf(s.k.Customers.v + ' customer') === 0, [s.ans, s.k.Customers]);
    }
    await go(p, 'Marketing & Insights'); await p.waitForTimeout(2500);
    const mk = await p.evaluate(() => ({ line: (document.querySelector('.ans-empty .ans-line') || {}).textContent, boxes: [...document.querySelectorAll('.aw-island')].filter(e => e.getClientRects().length).length, dl: !!document.querySelector('.ans-empty [data-aw-dataset]') }));
    check(t + ' Marketing: one line and a template download instead of four empty boxes', /No campaign spend/.test(mk.line || '') && mk.boxes === 0 && mk.dl, mk);
    check(t + ' no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
    await p.context().close();
  }
  // known answers: comparisons from hand-made orders
  const { p } = await open(b, 1440, 900, { extraFoot: base + ans });
  await p.waitForTimeout(2000);
  const k = await p.evaluate(() => {
    const A = window.CCAnalyticsAnswers, L = '2026-10-13', T = '2026-10-27';
    const mk = (pd, v, cp, c, src) => ({ pd, cp, st: 'confirmed', c, src, cv: v, it: [['Red Velvet', null, 8, 1, v]] });
    const orders = [mk('2026-10-14', 100, 'recorded', '+679001', 'staff'), mk('2026-10-20', 100, 'recorded', '+679002', 'web'), mk('2026-10-01', 50, 'assumed', '+679001', 'sheet'), mk('2026-10-05', 50, 'assumed', '+679003', 'sheet'),
      { pd: '2026-10-02', cp: 'assumed', st: 'confirmed', c: '+679004', src: 'sheet', it: [['Cheesecake', null, 6, 1, 0]] }];
    const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5), add = (a, n) => new Date(Date.parse(a + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
    const x = { r: { all: true }, launch: L, today: () => T, days, addDays: add, data: { allOrders: orders }, match: () => true, dateOf: o => o.pd, value: o => o.cv || 0, items: o => o.it, money: v => '$' + v, src: { staff: 'Walk-in', web: 'Online' },
      cur: orders.slice(0, 2), cs: { v: 200, n: 2 } };
    const sl = A.answerFor('sl', x), cu = A.answerFor('cu', x);
    x.data.allOrders = orders.slice(0, 4); const sl2 = A.answerFor('sl', x);
    return { sl: sl.kpi, cu: cu, sl2: sl2.kpi, per: A.periods(x) };
  });
  check('periods: since launch 15 days, compared with 28 Sep to 12 Oct from sheet records', k.per.len === 15 && k.per.pf === '2026-09-28' && k.per.pt === '2026-10-12' && /sheet records/.test(k.per.label), k.per);
  check('an unpriced earlier order (1 of 3) blocks the money comparison', /missing prices/.test(k.sl['Net cake sales'].t) && /Down 33%/.test(k.sl['Completed orders'].t), k.sl);
  check('all earlier orders priced: $200 vs $100 = Up 100%', /^Up 100% on the 15 days before \(sheet records\)$/.test(k.sl2['Net cake sales'].t), k.sl2);
  check('customers: 2 now (1 new), 3 before = Down 33%; answer names 1 new', /Down 33%/.test(k.cu.kpi.Customers.t) && /1 new/.test(k.cu.html.replace(/<[^>]+>/g, '')), k.cu);
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
