// Order details and customer profile flow (27 Oct 2026): colour strip by meaning, said once, next step first, risky actions behind More options.
const { open, chromium } = require('./harness.cjs');
const files = ['staff.analytics-focus.js', 'staff.polish.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const openOrder = (p, id) => p.evaluate(id => { const x = document.createElement('button'); x.setAttribute('data-act', 'open-order'); x.setAttribute('data-id', id); document.getElementById('ccs-main').appendChild(x); x.click(); x.remove(); }, id).then(() => p.waitForTimeout(1500));
const state = p => p.evaluate(() => { const sh = document.getElementById('ccs-sheet'), vis = e => !!(e && e.getClientRects().length), b = sh.querySelector('.os-band'), cs = b && getComputedStyle(b);
  const acts = sh.querySelector('.os-main > .ccs-actions'), fb = sh.querySelector('.os-main > .fb-cta'), more = sh.querySelector('.ccp-more');
  const out = [...sh.querySelectorAll('button,a')].filter(x => vis(x) && !x.closest('.ccp-more-l') && /^(Delete order|Cancel order|Correct this order)$/.test(x.textContent.trim())).map(x => x.textContent.trim());
  const good = sh.querySelector('.ccs-actions .ccs-btn.ccs-good:not([disabled])');
  return { band: b && b.className, payChip: vis(sh.querySelector('.ccs-sheet-head .ccs-pay')), fbFirst: !!(fb && acts && fb.nextElementSibling === acts && vis(fb)), fbVis: vis(fb), more: more ? [...more.querySelectorAll('.ccp-mitem')].map(x => x.textContent.trim()) : [], moreClosed: more ? !vis(more.querySelector('.ccp-mitem')) : true, out,
    good: good && getComputedStyle(good).backgroundColor, owe: [...sh.querySelectorAll('.ccs-ostrip > .ccp-money')].filter(vis).map(d => d.textContent.replace(/\s+/g, ' ').trim() + (d.classList.contains('ccp-owe') ? '*' : '')) }; });
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader, ipad: t === 'tablet', role: 'admin' });
    await p.waitForTimeout(2500);
    await openOrder(p, 'o14'); let s = await state(p);
    check(t + ' completed: green strip, no Paid chip, Customer feedback leads', /pf-green/.test(s.band) && !s.payChip && s.fbFirst, s);
    check(t + ' completed: Correct and Delete wait behind More options (closed)', s.more.includes('Correct this order') && s.more.some(x => /Delete/.test(x)) && s.moreClosed && !s.out.length, s);
    await p.evaluate(() => document.querySelector('#ccs-sheet .ccp-more-b').click()); await p.waitForTimeout(400);
    check(t + ' More options opens', await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet .ccp-mitem')].filter(x => x.getClientRects().length).length >= 2));
    const tb = await p.evaluate(() => { const sh = document.getElementById('ccs-sheet'), vis = e => !!(e && e.getClientRects().length); return { tabs: [...sh.querySelectorAll('.os-detail > .ccs-secbar > .ccs-secbtn')].filter(vis).map(x => x.textContent.trim()), cake2: vis(sh.querySelector('.os-phcake')), done: (sh.querySelector('.ccp-done') || {}).textContent, st: (sh.querySelector('.ccs-sheet-head .ccs-pill.st') || {}).textContent }; });
    check(t + ' details: four tabs (rest under More), cake shown once, "Done" and "All done"', tb.tabs.length === 4 && /More/.test(tb.tabs[3]) && !tb.cake2 && /All done/.test(tb.done || '') && /^Done$/.test((tb.st || '').trim()), tb);
    await openOrder(p, 'o1'); s = await state(p);
    check(t + ' check order: amber strip (matches the warning), main button deep green (28 Oct), feedback in More', /pf-amber/.test(s.band) && s.good === 'rgb(61, 82, 48)' && !s.fbVis && s.more.includes('Customer feedback'), s);
    check(t + ' check order: money owed in amber', s.owe.some(x => /^To pay.*\*$/.test(x)), s);
    await openOrder(p, 'o8'); s = await state(p);
    check(t + ' cancelled: grey strip, nothing "to pay"', /pf-none/.test(s.band) && !s.owe.some(x => /^To pay/.test(x)), s);
    await p.evaluate(() => { const x = document.createElement('button'); x.setAttribute('data-act', 'open-customer'); x.setAttribute('data-id', 'c1'); document.getElementById('ccs-main').appendChild(x); x.click(); x.remove(); }); await p.waitForTimeout(1700);
    const c = await p.evaluate(() => { const sh = document.getElementById('ccs-sheet'), vis = e => !!(e && e.getClientRects().length); return { del: vis(sh.querySelector('.cd-ask')), more: vis(sh.querySelector('.ccp-cmore')), fav: !!sh.querySelector('.ccs-sheet-head > .ccp-fav'), cards: [...sh.querySelectorAll('.rm-metric')].filter(vis).map(x => x.querySelector('.rm-metric-label').textContent.trim()), wa: (sh.querySelector('a.ccs-btn[href*="wa.me"]') ? getComputedStyle(sh.querySelector('a.ccs-btn[href*="wa.me"]')).color : null) }; });
    check(t + ' customer: Delete customer behind More options, heart in header, two plain cards, WhatsApp green', !c.del && c.more && c.fav && c.cards.join() === 'Orders,Collected spend' && (!c.wa || c.wa === 'rgb(11, 122, 62)'), c);
    await p.evaluate(() => { const c = document.querySelector('#ccs-sheet .ccs-x'); if (c) c.click(); }); await p.waitForTimeout(600);
    await p.evaluate(() => [...document.querySelectorAll('#cc-staff [data-tab="today"]')].filter(x => x.getClientRects().length)[0].click()); await p.waitForTimeout(1500);
    const td = await p.evaluate(() => { const m = document.getElementById('ccs-main'), vis = e => !!(e && e.getClientRects().length); return { cards: vis(m.querySelector('.ccb-list')), backup: vis(m.querySelector(':scope > .ccs-mirnote')), next: [...m.querySelectorAll('.ccs-next, .tp-nb')].filter(vis).map(x => x.textContent.replace('Next: ', '').trim()) }; });
    check(t + ' Today: no repeated summary cards or backup notice; next steps are 2-4 words', !td.cards && !td.backup && (t === "phone" || td.next.length) && td.next.every(x => x.split(/\s+/).length <= 4), td);
    const bad = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !bad.length, bad);
    await p.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
