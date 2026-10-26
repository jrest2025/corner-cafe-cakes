// Polish: custom dropdowns, icons, Kitchen rows, navy buttons, order tags, Customers tidy-up.
// Live head/footer, live bundle, mock database, plus the add-ons from src. Run: node test/order-tools/test_polish.cjs
const { open, tap, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const files = ['staff.analytics-focus.js', 'staff.polish.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const go = (p, tab) => p.evaluate(tab => { const b = [...document.querySelectorAll('#cc-staff [data-tab="' + tab + '"]')].filter(x => x.getClientRects().length)[0] || document.querySelector('#cc-staff [data-tab="' + tab + '"]'); if (b) b.click(); }, tab).then(() => p.waitForTimeout(1800));
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + '/pl-' + name + '.png' }); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { extraFoot: loader, ipad: t === 'tablet' });
    await p.waitForTimeout(800);
    // ---------- Today: action first, quiet zeros, no repeats ----------
    await go(p, 'today');
    const td = await p.evaluate(() => { const m = document.getElementById('ccs-main'); const vis = e => e && e.getClientRects().length;
      return { biz: vis(m.querySelector('.tq-stats > .cl-biz')), stats: [...m.querySelectorAll('.tq-stats > .tq-stat')].filter(vis).length, todayCell: getComputedStyle(m.querySelector('.ccs-daycell.is-today')).backgroundColor, dash: [...m.querySelectorAll('.tq-days em')].filter(e => /^—$/.test(e.textContent.trim()) && getComputedStyle(e).visibility !== 'hidden').length, fit: [...m.querySelectorAll('.tq-days .ccs-daycell')].every(c => c.getBoundingClientRect().right <= innerWidth), nb: m.querySelector('.tp-nb') ? getComputedStyle(m.querySelector('.tp-nb')).backgroundColor : null }; });
    check(t + ' Today: three summary tiles, no business figure', !td.biz && td.stats === 3, td);
    check(t + ' Today: today in soft navy, empty days blank, all 7 days fit, next step not black', td.todayCell === 'rgb(238, 243, 249)' && td.dash === 0 && td.fit && (td.nb === null || td.nb === 'rgb(238, 243, 249)'), td);
    await shot(p, t + '-today');
    // ---------- Customers ----------
    await go(p, 'customers');
    if (t === 'phone') { await tap(p, '#ccs-main .cc-fit-bar[data-fit="cust"]', 700); }
    const c0 = await p.evaluate(() => { const m = document.getElementById('ccs-main'), btn = [...m.querySelectorAll('.ccdd-btn')].filter(x => x.getClientRects().length);
      return { btns: btn.map(x => x.getAttribute('aria-label')), pills: !!(m.querySelector('nav.cdir-segments') || {}).getClientRects().length, nativeSel: !!(m.querySelector('#ccs-seg') || {}).getClientRects().length, head2: !!(m.querySelector('.cdir-heading-copy') || {}).getClientRects().length, sub: !!(m.querySelector('.ccs-head .ccs-sub') || {}).getClientRects().length, rem: !!(m.querySelector('section.ccs-rem') || {}).getClientRects().length, remBtn: (m.querySelector('.ccp-rem') || {}).textContent, addBg: getComputedStyle(m.querySelector('[data-act="cust-new"]')).backgroundColor, tabIcons: m.querySelectorAll('.ccs-secbtn .ccp-ic').length }; });
    check(t + ' Customers: Show and Sort dropdowns, no pills, no system select', c0.btns.some(x => /^Show: All customers/.test(x)) && c0.btns.some(x => /^Sort: /.test(x)) && !c0.pills && !c0.nativeSel, c0);
    check(t + ' Customers: no repeated heading, spend note behind i', !c0.head2 && !c0.sub, c0);
    if (process.env.DEBUG) console.log(await p.evaluate(() => [...document.querySelectorAll('nav.cdir-segments')].map(x => x.className + ' ' + getComputedStyle(x).display)));
    check(t + ' Customers: reminders as one button', !c0.rem && /1 reminder/.test(c0.remBtn || ''), c0);
    check(t + ' Customers: Add customer navy, tab icons', c0.addBg === 'rgb(36, 95, 153)' && c0.tabIcons === 3, c0);
    const bh = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#ccs-main .ccdd-btn')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect().height)));
    check(t + ' dropdown buttons touch size (' + bh + ')', bh >= (t === 'tablet' ? 56 : t === 'phone' ? 52 : 48), bh);
    await shot(p, t + '-customers');
    await tap(p, '#ccs-main .ccdd-btn[aria-label^="Show"]', 400);
    const o1 = await p.evaluate(() => { const pop = document.querySelector('.ccdd-pop'); return pop ? { sheet: pop.classList.contains('is-sheet'), n: pop.querySelectorAll('.ccdd-opt').length, icons: pop.querySelectorAll('.ccdd-opt .ccp-ic:not(.ccdd-tick)').length, on: (pop.querySelector('.ccdd-opt.is-on .ccdd-t') || {}).textContent, focus: document.activeElement.classList.contains('ccdd-opt'), cancel: !!pop.querySelector('[data-ccdd="close"].ccs-btn') } : null; });
    check(t + ' Show list: 10 groups with icons, current ticked, focus inside', o1 && o1.n === 10 && o1.icons === 10 && o1.on === 'All customers' && o1.focus, o1);
    check(t + ' Show list: ' + (t === 'phone' ? 'bottom sheet with Cancel' : 'pop-over'), o1 && (t === 'phone' ? o1.sheet && o1.cancel : !o1.sheet), o1);
    await shot(p, t + '-customers-open');
    await p.evaluate(() => [...document.querySelectorAll('.ccdd-opt')].find(x => x.textContent.trim() === 'Repeat').click()); await p.waitForTimeout(600);
    const c1 = await p.evaluate(() => ({ v: document.querySelector('#ccs-seg').value, lbl: (document.querySelector('#ccs-main .ccdd-btn[aria-label^="Show"]') || {}).getAttribute('aria-label'), open: !!document.querySelector('.ccdd-pop') }));
    check(t + ' choosing Repeat sets the real filter', c1.v === 'seg_repeat' && c1.lbl === 'Show: Repeat' && !c1.open, c1);
    // keyboard
    await p.focus('#ccs-main .ccdd-btn[aria-label^="Sort"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    const k = await p.evaluate(() => ({ v: document.querySelector('select.cdir-sort').value, f: document.activeElement.getAttribute('aria-label') }));
    check(t + ' keyboard: Enter opens, arrow and Enter choose, focus returns', k.v === 'name' && /^Sort: Name/.test(k.f || ''), k);
    await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    check(t + ' Escape closes', await p.evaluate(() => !document.querySelector('.ccdd-pop')));
    if (t !== 'phone') { await tap(p, '#ccs-main .ccp-i', 200); }
    if (t !== 'phone') check(t + ' i shows the spend note', await p.evaluate(() => !!document.querySelector('#ccs-main .ccs-head .ccs-sub').getClientRects().length));
    // ---------- Orders ----------
    await go(p, 'orders');
    const or = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-card')].map(c => ({ tags: [...c.querySelectorAll('.ccs-tags > *')].filter(x => x.getClientRects().length).map(x => x.textContent.trim()), next: !!c.querySelector('.ccs-next .ccp-next svg') })));
    if (t !== 'phone') check(t + ' order cards: at most two tags plus +n, allergy kept', or.length && or.every(c => c.tags.filter(x => !/^\+\d$/.test(x)).length <= 2) && or[0].tags.some(x => /allergy/i.test(x)), or);
    check(t + ' order cards: Next has an arrow', or.every(c => c.next), or);
    check(t + ' All tab short', await p.evaluate(() => (document.querySelector('.ccs-tab[data-v="recent"]') || {}).textContent === 'All'));
    await shot(p, t + '-orders');
    // ---------- Kitchen ----------
    await go(p, 'kitchen');
    const kt = await p.evaluate(() => { const m = document.getElementById('ccs-main'); const modes = [...m.querySelectorAll('[data-act="k-mode"]')].filter(x => x.getClientRects().length).map(x => x.textContent.trim());
      const lines = [...m.querySelectorAll('.kw-att .kw-line')].map(l => { const b = l.querySelector('.kw-what b'), em = l.querySelector('.kw-what em'); return { name: b.textContent, cut: b.scrollWidth > b.clientWidth + 1, lines: em ? Math.round(em.getBoundingClientRect().height / parseFloat(getComputedStyle(em).lineHeight || 24)) : 0 }; });
      return { modes, icons: m.querySelectorAll('[data-act="k-mode"] .ccp-ic').length, lines, bg: getComputedStyle(m.querySelector('.ccs-btn.ccs-good')).backgroundColor }; });
    check(t + ' Kitchen: Today and Board only, with icons', kt.modes.join('|') === 'Today|Board' && kt.icons === 2, kt);
    check(t + ' Kitchen: attention rows not cut, reason on few lines', kt.lines.length && kt.lines.every(l => !l.cut && l.lines <= 3), kt.lines);
    check(t + ' Kitchen: main button navy', kt.bg === 'rgb(36, 95, 153)', kt.bg);
    const tn = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#ccs-main [data-ccp-tone]')].filter(x => x.getClientRects().length).map(x => [(x.closest('.kw-count,.cl-h,.kw-label') || x.parentElement).textContent.replace(/\s+/g, ' ').trim().slice(0, 20), x.getAttribute('data-ccp-tone') + ' ' + getComputedStyle(x).backgroundColor])));
    const tv = Object.entries(tn);
    check(t + ' icon tiles: tinted, coloured by meaning', tv.length >= 4 && tv.every(([k, v]) => !/rgb\((214|74|142|63|138), /.test(v)) && /^green/.test((tv.find(([k]) => /^Ready/.test(k)) || [])[1] || '') && /^amber/.test((tv.find(([k]) => /^To make/.test(k)) || [])[1] || '') && /^navy/.test((tv.find(([k]) => /^Coming up/.test(k)) || [])[1] || ''), tn);
    await shot(p, t + '-kitchen');
    // ---------- Settings ----------
    if (t !== 'phone') {
      await go(p, 'settings');
      const st = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-setnav [data-setk]')].map(b => !!b.querySelector('.ccp-ic')));
      check(t + ' Settings: icon on every section', st.length >= 8 && st.every(Boolean), st);
      await shot(p, t + '-settings');
    }
    // ---------- Analytics ----------
    await go(p, 'dash');
    await p.evaluate(() => { const b = document.querySelector('#ccs-main [data-g="anm"][data-v="sl"]'); if (b) b.click(); }); await p.waitForTimeout(1500);
    const an = await p.evaluate(() => ({ btn: (document.querySelector('.cat-page[data-cat="sl"] .ccdd-btn') || {}).getAttribute && document.querySelector('.cat-page[data-cat="sl"] .ccdd-btn').getAttribute('aria-label'), chips: !!(document.querySelector('.cat-page[data-cat="sl"] .cat-chips') || {}).getClientRects().length }));
    check(t + ' Analytics: Period dropdown instead of pills', /^Period: Since launch/.test(an.btn || '') && !an.chips, an);
    await tap(p, '.cat-page[data-cat="sl"] .ccdd-btn', 400);
    await p.evaluate(() => [...document.querySelectorAll('.ccdd-opt')].find(x => x.textContent.trim() === '30 days').click()); await p.waitForTimeout(1500);
    const an2 = await p.evaluate(() => ({ pressed: [...document.querySelectorAll('.cat-page[data-cat="sl"] .cat-chip')].filter(x => x.getAttribute('aria-pressed') === 'true' || x.classList.contains('is-on')).map(x => x.textContent.trim()), btn: (document.querySelector('.cat-page[data-cat="sl"] .ccdd-btn') || {}).getAttribute('aria-label') }));
    check(t + ' Analytics: choosing 30 days switches the period', an2.pressed.join() === '30 days' && an2.btn === 'Period: 30 days', an2);
    await shot(p, t + '-analytics');
    // ---------- refined details ----------
    await go(p, 'orders');
    const rf = await p.evaluate(() => { const c = document.querySelector('#ccs-main .ccs-card'), cs = getComputedStyle(c), bf = getComputedStyle(c, '::before');
      return { border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderTopLeftRadius, edge: bf.width, dateIc: !!c.querySelector('.ccs-when .ccp-when-ic'), tagIc: [...document.querySelectorAll('#ccs-main .ccs-pill, #ccs-main .ccs-tag')].filter(x => x.getClientRects().length).every(x => !!x.querySelector('svg') || !/Custom|Delivery|price|Confirmed|Ready|Late/i.test(x.textContent)), title: !!document.querySelector('#ccs-main .ccs-title .ccp-tic'), dots: /·\s*$/.test(document.querySelector('#ccs-main .ccs-head .ccs-fresh').firstChild.nodeValue || ''), num: getComputedStyle(document.querySelector('.ccs-price')).fontVariantNumeric }; });
    check(t + ' refined: hairline border, 14px corners, 3px status edge', rf.border === '1px rgb(228, 231, 236)' && rf.radius === '14px' && rf.edge === '3px', rf);
    check(t + ' refined: icons on date, tags and page title', rf.dateIc && rf.tagIc && rf.title, rf);
    check(t + ' refined: no stray dot, even figures', !rf.dots && /tabular-nums/.test(rf.num), rf);
    const ch = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-card .cc-ch')].filter(x => x.getClientRects().length).map(x => ({ label: x.getAttribute('aria-label'), w: Math.round(x.getBoundingClientRect().width), textShown: x.querySelector(':scope > span').getBoundingClientRect().width > 2 })));
    if (t !== 'phone') check(t + ' channel shown as an icon with its name as the label', ch.length && ch.every(c => c.label === 'Website order' && c.w <= 40 && !c.textShown), ch);
    await shot(p, t + '-orders-refined');
    await go(p, 'customers');
    if (t === 'phone') { await tap(p, '#ccs-main .cc-fit-bar[data-fit="cust"]', 700); }
    const rc = await p.evaluate(() => ({ kpi: document.querySelectorAll('#ccs-main .cw-metric-arrow svg').length, th: (() => { const th = document.querySelector('#ccs-main .ccs-table th'); if (!th) return null; const c = getComputedStyle(th); return c.textTransform + ' ' + c.backgroundColor; })() }));
    check(t + ' refined: Customers number-card icons, quiet table header', rc.kpi === 4 && (rc.th === null || rc.th === 'none rgb(249, 250, 251)'), rc);
    await shot(p, t + '-customers-refined');
    const hb = await p.evaluate(() => { const r = document.getElementById('cc-demand-scroll-rail'); return r ? 'ok' : 'none'; });
    // ---------- icons instead of words: order details ----------
    await go(p, 'orders'); await tap(p, '.ccs-tab[data-v="upcoming"]', 1200);
    await p.evaluate(() => { const c = [...document.querySelectorAll('#ccs-main .ccs-card')].find(c => /Test Customer A/.test(c.textContent) && /5:00 PM/.test(c.textContent)) || document.querySelector('#ccs-main .ccs-card'); c.click(); }); await p.waitForTimeout(1500);
    const sh = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'); if (!s) return null; const when = s.querySelector('.os-when > span:first-child'), calls = [...s.querySelectorAll('.os-callrow a')];
      return { inStaff: !!s.closest('#cc-staff'), whenIcon: !!(when && when.querySelector('svg')), whenWord: when ? when.getBoundingClientRect().width < 60 && /Delivery|Collection/.test(when.title) : false, ch: (s.querySelector('.cc-ch') || {}).getAttribute && s.querySelector('.cc-ch').getAttribute('aria-label'), chW: s.querySelector('.cc-ch') ? Math.round(s.querySelector('.cc-ch').getBoundingClientRect().width) : 0,
        call: calls.map(a => [a.textContent.trim(), a.getAttribute('aria-label'), !!a.querySelector('svg')]), print: (s.querySelector('[data-v="brief"]') || {}).textContent, secIcons: s.querySelectorAll('.ccs-secbtn .ccp-ic').length }; });
    check(t + ' details: delivery shown as a vehicle icon, word as its label', sh && sh.inStaff && sh.whenIcon && sh.whenWord, sh);
    check(t + ' details: channel as an icon badge', sh && sh.ch === 'Walk-in' && sh.chW <= 40, sh);
    check(t + ' details: call shows phone icon and number, WhatsApp icon only', sh && sh.call.length === 2 && /^912 0001$/.test(sh.call[0][0]) && sh.call[0][2] && sh.call[1][0] === 'WhatsApp' && sh.call[1][1] === 'WhatsApp' && sh.call[1][2], sh);
    check(t + ' details: Print slip with printer, tab icons', sh && /Print slip/.test(sh.print) && sh.secIcons >= 6, sh);
    await shot(p, t + '-sheet');
    await p.evaluate(() => { const x = document.querySelector('#ccs-sheet [data-act="close"]'); if (x) x.click(); }); await p.waitForTimeout(500);
    // ---------- Analytics: one Section dropdown on phones and tablets ----------
    await go(p, 'dash');
    const nv = await p.evaluate(() => ({ dd: [...document.querySelectorAll('#ccs-main .ccdd-btn')].filter(x => x.getClientRects().length).map(x => x.getAttribute('aria-label')), nav5: !!(document.querySelector('.cc-nav5') || {}).getClientRects().length, mods: !!(document.querySelector('nav.an-mods') || {}).getClientRects().length }));
    if (t === 'desktop') check(t + ' Analytics: computers keep the section rows', nv.nav5 && nv.mods && !nv.dd.some(x => /^Section/.test(x)), nv);
    else {
      check(t + ' Analytics: one Section dropdown, rows hidden', nv.dd.some(x => /^Section: (Overview|Cake sales)$/.test(x)) && !nv.nav5 && !nv.mods, nv);
      await tap(p, '#ccs-main .ccdd-btn[aria-label^="Section"]', 400);
      const so = await p.evaluate(() => [...document.querySelectorAll('.ccdd-opt .ccdd-t')].map(x => x.textContent));
      check(t + ' Section list: every section with data, none empty', so.includes('Overview') && so.includes('Cake sales') && so.includes('Occasions') && !so.some(x => /No data|Café sales|Marketing|Website/.test(x)), so);
      await p.evaluate(() => [...document.querySelectorAll('.ccdd-opt')].find(x => x.textContent.trim() === 'Occasions').click()); await p.waitForTimeout(1500);
      const sd = await p.evaluate(() => ({ page: !!document.querySelector('#ccs-main .cat-page[data-cat="sd"]'), lbl: (document.querySelector('#ccs-main .ccdd-btn[aria-label^="Section"]') || {}).getAttribute('aria-label') }));
      check(t + ' Section: choosing Occasions opens it', sd.page && sd.lbl === 'Section: Occasions', sd);
      await shot(p, t + '-analytics-section');
    }
    check(t + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check(t + ' no page errors or polish warnings', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length && !logs.filter(x => /Polish|Analytics focus/.test(x)).length, errors.concat(logs.filter(x => /Polish/.test(x))));
    await ctx.close();
  }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
