// Analytics, decision-first: live head/footer, live bundle, mock database, plus the focus add-on from src.
// Run: node test/order-tools/test_analytics_focus.cjs
const { open, tap, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const OFF = !!process.env.OFF;
const loader = OFF ? '' : '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.analytics-focus.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
const words = p => p.evaluate(() => { const m = document.querySelector('#ccs-main'), pg = m.querySelector('.cat-page[data-cat]') || m; const vis = [...pg.querySelectorAll('*')].filter(e => !e.children.length && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('details:not([open]) > :not(summary)')); return vis.map(e => e.textContent).join(' ').split(/\s+/).filter(Boolean).length; });
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { extraFoot: loader, ipad: t === 'tablet' });
    await tap(p, '#cc-staff [data-tab="dash"]', 2500);
    const hb = await p.evaluate(() => { const r = document.getElementById('cc-demand-scroll-rail'); return r ? r.outerHTML.length : 0; });
    check(t + ' Daily Cake Demand present', hb > 1000, hb);
    if (!OFF) {
      const tabsShown = await p.evaluate(() => [...document.querySelectorAll('#ccs-main nav.an-mods .an-mod')].filter(x => x.getClientRects().length).map(x => x.textContent.trim()));
      check(t + ' empty tabs hidden', !tabsShown.some(x => /No data|Café sales|Marketing|Website/.test(x)) && tabsShown.includes('Data'), tabsShown);
      const ins = await p.evaluate(() => { const c = document.querySelector('#cc-insights .cci-card'); return c ? { why: !!(c.querySelector('.cci-why') || {}).getClientRects().length, i: !!c.querySelector('.ccf-i') } : null; });
      check(t + ' Overview insight cards: reason behind i', ins && !ins.why && ins.i, ins);
    }
    if (SHOTS) await p.screenshot({ path: SHOTS + '/af-' + t + '-ov' + (OFF ? '-before' : '') + '.png' });
    const out = {};
    for (const v of ['sl', 'pd', 'cu', 'sd', 'pl']) {
      await p.evaluate(v => { const b = document.querySelector('#ccs-main [data-g="anm"][data-v="' + v + '"]'); if (b) b.click(); }, v); await p.waitForTimeout(1500);
      out[v] = await words(p);
      if (SHOTS) await p.screenshot({ path: SHOTS + '/af-' + t + '-' + v + (OFF ? '-before' : '') + '.png' });
      if (OFF) continue;
      const st = await p.evaluate(v => { const pg = document.querySelector('#ccs-main .cat-page[data-cat="' + v + '"]'); if (!pg) return null; const todo = pg.querySelector(':scope > .cat-todo'), first = pg.querySelector(':scope > .cat-kpis, :scope > .cat-oi');
        const moved = [...pg.querySelectorAll('.ccf-more-b > section')].map(s => s.getAttribute('data-ccf-title'));
        const visCards = [...pg.querySelectorAll('section.cat-card, section.dx-card')].filter(c => c.getClientRects().length && !c.closest('.cat-more')).map(c => (c.querySelector('h3') || {}).textContent);
        return { todoFirst: !todo || !first || !!(todo.compareDocumentPosition(first) & 4), moved, visCards, caps: [...pg.querySelectorAll('.cat-k-cap')].filter(x => x.getClientRects().length).map(x => x.textContent) }; }, v);
      check(t + ' ' + v + ': What to do comes first', st && st.todoFirst, st);
      check(t + ' ' + v + ': secondary charts moved to Details', st && st.moved.length >= 1, st);
      check(t + ' ' + v + ': at most 4 charts on the page', st && st.visCards.length <= 4, st);
      if (v === 'sl') check(t + ' sl: second lines only on Net cake sales (VAT) and Still owed', st.caps.length === 2 && st.caps.some(c => /VAT/.test(c)) && st.caps.some(c => /owe/.test(c)), st.caps);
      if (v === 'sd') {
        const sd = await p.evaluate(() => ({ tog: (document.querySelector('.ccf-ftog') || {}).textContent, fOpen: !!(document.querySelector('.oi-filters') || {}).getClientRects().length, bars: document.querySelectorAll('.ccf-month .cat-col').length, peak: (document.querySelector('.ccf-month .cat-peak') || {}).textContent, kpis: [...document.querySelectorAll('.oi-kpis .ccs-kpi')].filter(x => x.getClientRects().length).length }));
        check(t + ' Occasions: filters behind one button, 12 month bars, 4 numbers', /^Filter/.test(sd.tog || '') && !sd.fOpen && sd.bars === 12 && /Busiest: Oct/.test(sd.peak || '') && sd.kpis === 4, sd);
        await tap(p, '.ccf-ftog', 300);
        check(t + ' Occasions: Filter opens the choices', await p.evaluate(() => !!document.querySelector('.oi-filters').getClientRects().length));
      }
      if (v === 'pl') {
        const i0 = await p.evaluate(() => { const c = [...document.querySelectorAll('#ccs-main .cat-page[data-cat="pl"] .ccf-card')].find(c => c.getClientRects().length && c.querySelector(':scope > header > span')); return c ? { shown: !!c.querySelector(':scope > header > span').getClientRects().length, key: c.getAttribute('data-ccf-key') } : null; });
        await p.evaluate(k => document.querySelector('.ccf-i[data-ccf-key="' + k + '"]').click(), i0.key); await p.waitForTimeout(200);
        const i1 = await p.evaluate(k => !!document.querySelector('.ccf-card[data-ccf-key="' + k + '"] > header > span').getClientRects().length, i0.key);
        check(t + ' i shows the explanation', i0 && !i0.shown && i1, [i0, i1]);
        const ih = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#ccs-main .ccf-i')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect().height)));
        check(t + ' i buttons touch size (' + ih + ')', ih >= (t === 'tablet' ? 54 : t === 'phone' ? 48 : 44), ih);
      }
    }
    console.log(t + ' visible words per tab' + (OFF ? ' BEFORE' : ' AFTER'), JSON.stringify(out));
    check(t + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check(t + ' no add-on warnings', !logs.filter(x => /Analytics focus/.test(x)).length, logs.filter(x => /Analytics focus/.test(x)));
    await ctx.close();
  }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
