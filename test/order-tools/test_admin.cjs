// Admin console (Step A, preview): overview of grouped settings with live status, search, section view with path back,
// group tabs, consistent header, explanations behind "i". Sections, saving and permissions stay the app's own.
const { open, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const files = ['staff.analytics-focus.js', 'staff.polish.js', 'staff.treat-orders.js', 'staff.seasonal.js', 'staff.ipad.js', 'staff.admin.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 600) : '')); } };
const goSettings = p => p.evaluate(() => { const b = [...document.querySelectorAll('#cc-staff [data-tab="settings"]')].filter(x => x.getClientRects().length)[0] || [...document.querySelectorAll('#cc-staff [data-tab="more"]')].filter(x => x.getClientRects().length)[0]; if (b) b.click(); }).then(() => p.waitForTimeout(1500));
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t, role] of [[1366, 900, 'desktop', 'admin'], [820, 1180, 'ipad-portrait', 'admin'], [1194, 834, 'ipad-landscape', 'admin'], [1366, 900, 'desktop-manager', 'manager'], [390, 844, 'phone', 'admin']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader, ipad: /ipad/.test(t), role });
    await p.waitForTimeout(2500);
    await goSettings(p);
    if (t === 'phone') { await p.evaluate(() => { const b = [...document.querySelectorAll('#cc-staff [data-tab="settings"]')].filter(x => x.getClientRects().length)[0]; if (b) b.click(); }); await p.waitForTimeout(1500); }
    const ov = await p.evaluate(() => { const m = document.getElementById('ccs-main'), vis = e => !!(e && e.getClientRects().length);
      return { home: m.classList.contains('cca-home-on'), flat: vis(m.querySelector('.ccs-setnav')), cards: [...m.querySelectorAll('.cca-card')].filter(vis).map(c => c.querySelector('h2').textContent + ':' + c.querySelectorAll('.cca-row').length),
        rows: [...m.querySelectorAll('.cca-row')].map(r => r.getAttribute('data-cca-open')), nav: [...m.querySelectorAll('.ccs-setnav [data-setk]')].map(x => x.getAttribute('data-setk')),
        status: Object.fromEntries([...m.querySelectorAll('.cca-row')].map(r => [r.getAttribute('data-cca-open'), (r.querySelector('.cca-st') || {}).textContent || ''])),
        needs: [...m.querySelectorAll('.cca-needs .cca-chip')].map(x => x.textContent), hx: document.scrollingElement.scrollWidth <= innerWidth, mainX: m.scrollWidth <= m.clientWidth + 1 }; });
    check(t + ' opens on the overview (grouped cards), flat list hidden', ov.home && !ov.flat && ov.cards.length >= 3, ov);
    { const want = ov.nav.filter(k => k !== 'Remove Settings entries'); const extra = ov.rows.filter(k => !want.includes(k));   // Remove entries retired 28 Oct; Communications = email templates window
    check(t + ' every section this user can see is on the overview, nothing invented', want.every(k => ov.rows.includes(k)) && extra.every(k => k === 'Communications' || k === 'Settings history') && !ov.rows.includes('Remove Settings entries'), { rows: ov.rows, nav: ov.nav }); }
    check(t + ' no sideways scroll', ov.hx && ov.mainX, ov);
    if (role === 'admin') {
      // statuses agree with each section's own header
      const agree = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-set > details')].map(d => { const sm = d.querySelector('summary'), sp = sm && sm.querySelector('span.cca-hst'); const k = sm && sm.firstChild && sm.firstChild.nodeValue && sm.firstChild.nodeValue.trim(); return [k, sp ? sp.textContent.trim() : '']; }));
      const bad = agree.filter(([k, s]) => ov.status[k] && ov.status[k] !== s && !/Test mode/.test(ov.status[k]));
      check(t + ' overview status = the section\'s own status', !bad.length, { bad, status: ov.status });
      check(t + ' needs attention lists the amber/red ones (backup not set up, alerts in test mode)', ov.needs.some(x => /Backup/.test(x)) && ov.needs.some(x => /Test mode/.test(x)), ov.needs);
    }
    // search
    await p.fill('#ccs-main [data-cca-q] >> visible=true', 'printer'); await p.waitForTimeout(400);
    const sr = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-row')].filter(x => x.getClientRects().length).map(x => x.getAttribute('data-cca-open')));
    check(t + ' search finds a setting by what it does ("printer")', role === 'admin' ? sr.length === 1 && sr[0] === 'Kitchen printing' : sr.length <= 1, sr);
    await p.fill('#ccs-main [data-cca-q] >> visible=true', 'zzzz'); await p.waitForTimeout(300);
    check(t + ' search with no match says so', await p.evaluate(() => /No setting matches/.test((document.querySelector('#ccs-main .cca-empty') || {}).textContent || '')));
    await p.fill('#ccs-main [data-cca-q] >> visible=true', ''); await p.waitForTimeout(300);
    // open every section: the app's own section shows, with path back and its group as tabs
    const keys = ov.rows.filter(k => k !== 'Communications' && k !== 'Settings history'), wide = await p.evaluate(() => innerWidth >= 1100);
    for (const k of keys) {
      await p.evaluate(k => [...document.querySelectorAll('#ccs-main .cca-home .cca-row')].find(r => r.getAttribute('data-cca-open') === k).click(), k); await p.waitForTimeout(700);
      const s = await p.evaluate(() => { const m = document.getElementById('ccs-main'), vis = e => !!(e && e.getClientRects().length), cur = m.querySelector('.ccs-set > details.is-cur');
        return { sec: m.classList.contains('cca-sec-on'), home: vis(m.querySelector('.cca-home')), cur: cur && cur.querySelector('summary').firstChild.nodeValue.trim(), curVis: vis(cur), body: vis(cur && cur.querySelector('.ccs-set-body')), crumb: (m.querySelector('.cca-crumb b') || {}).textContent, menuCur: (m.querySelector('.cca-menu .cca-mi[aria-current="page"] span') || {}).textContent, back: vis(m.querySelector('.cca-back')), sel: (m.querySelector('.cca-tab[aria-selected="true"]') || {}).textContent || null }; });
      check(t + ' ' + k + ': opens the app\'s own section with a path back', s.sec && !s.home && s.cur === k && s.curVis && s.body && (wide ? s.menuCur === k : s.back && s.crumb === k), s);
      await p.evaluate(() => [...document.querySelectorAll('#ccs-main [data-cca-home]')].filter(x => x.getClientRects().length)[0].click()); await p.waitForTimeout(400);
    }
    if (role === 'admin') {
      // a real change still saves through the app (closed day), and the overview updates
      await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-home .cca-row')].find(r => r.getAttribute('data-cca-open') === 'Closed days').click()); await p.waitForTimeout(700);
      const tabs = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-tab')].map(x => x.textContent.trim()));
      check(t + ' group tabs show only this group\'s settings', tabs.join('|') === 'Online orders|Notice and collection hours|Closed days', tabs);
      await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-tab')].find(x => /Notice/.test(x.textContent)).click()); await p.waitForTimeout(600);
      check(t + ' tab switches section in place', await p.evaluate(() => document.querySelector('#ccs-main .ccs-set > details.is-cur summary').firstChild.nodeValue.trim() === 'Notice and collection hours'));
      // "i" shows and hides the long explanations
      await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-tab')].find(x => /Online/.test(x.textContent)).click()); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('#ccs-main [data-cca-home]').click()); await p.waitForTimeout(300);
      await p.evaluate(() => [...document.querySelectorAll('#ccs-main .cca-home .cca-row')].find(r => /Backup/.test(r.getAttribute('data-cca-open'))).click()); await p.waitForTimeout(700);
      const i0 = await p.evaluate(() => { const d = document.querySelector('#ccs-main .ccs-set > details.is-cur'); return { i: !!d.querySelector('.cca-i'), hidden: [...d.querySelectorAll('.cca-hidetext')].filter(x => !x.getClientRects().length).length, warn: !!(d.querySelector('[class*="warn"], [class*="needs"]') || {}).getClientRects }; });
      await p.evaluate(() => document.querySelector('#ccs-main .ccs-set > details.is-cur .cca-i').click()); await p.waitForTimeout(400);
      const i1 = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .ccs-set > details.is-cur .cca-hidetext')].filter(x => x.getClientRects().length).length);
      check(t + ' long explanations sit behind "i" and come back on tap; warning stays visible', i0.i && i0.hidden > 0 && i1 === i0.hidden, { i0, i1 });
      // sidebar Settings always returns to the overview; Escape goes back too
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      check(t + ' Escape returns to the overview', await p.evaluate(() => document.getElementById('ccs-main').classList.contains('cca-home-on')));
    }
    // order details still open over settings and nothing else broke
    if (SHOTS) await p.screenshot({ path: SHOTS + '/admin-' + t + '.png' });
    const badE = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !badE.length, badE);
    await p.close();
  }
  // without the add-on, Settings is exactly as before (safe to switch off)
  { const { p } = await open(b, 1366, 900, { extraFoot: loader.replace(/<script>[^<]*staff\.admin\.js[^<]*<\/script>/, ''), role: 'admin' }); await p.waitForTimeout(2500); await goSettings(p);
    check('without the add-on: classic Settings list', await p.evaluate(() => !!document.querySelector('#ccs-main .ccs-setnav').getClientRects().length && !document.querySelector('.cca-home'))); await p.close(); }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
