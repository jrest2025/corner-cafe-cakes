// iPad shell (preview branch): stable app shell, one scroll region, adaptive menu, pop-ups and forms, rotation.
// Live head/footer, live bundle, mock database, plus the add-ons from src. Run: node test/order-tools/test_ipad.cjs
const { open, chromium } = require('./harness.cjs');
const SHOTS = process.env.SHOTS || '';
const files = ['staff.analytics-focus.js', 'staff.polish.js', 'staff.treat-orders.js', 'staff.ipad.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 600) : '')); } };
const go = (p, tab) => p.evaluate(t => { const b = [...document.querySelectorAll('#cc-staff [data-tab="' + t + '"]')].filter(x => x.getClientRects().length)[0]; if (b) b.click(); }, tab).then(() => p.waitForTimeout(1400));
const shell = p => p.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(','); };
  const se = document.scrollingElement, m = document.getElementById('ccs-main');
  const nested = [...m.querySelectorAll('*')].filter(e => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 2 && e.getClientRects().length && !e.closest('.ccs-board, .ccdd-pop, table, .cc-heartbeat, #cc-heartbeat'); }).map(e => String(e.className).split(' ')[0]);
  return { cls: document.documentElement.className, docH: se.scrollHeight, vh: innerHeight, docW: se.scrollWidth, vw: innerWidth, y: scrollY, side: r('#ccs-side'), main: r('#ccs-main'), staffPos: getComputedStyle(document.getElementById('cc-staff')).position,
    mainOv: getComputedStyle(m).overflowY, mainX: m.scrollWidth - m.clientWidth, mainScroll: m.scrollHeight - m.clientHeight, nested }; });
const swipe = async (p, x, y, dy) => { await p.mouse.move(x, y); await p.mouse.wheel(0, dy); await p.waitForTimeout(350); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[768, 1024], [820, 1180], [1024, 768], [1194, 834]]) {
    const t = w + 'x' + h, port = h > w;
    const { p, errors } = await open(b, w, h, { extraFoot: loader, ipad: true, role: 'admin' });
    await p.waitForTimeout(2500);
    let s0 = await shell(p);
    check(t + ' shell pinned: page never scrolls, app fixed to the window', /\bcc-ipad\b/.test(s0.cls) && s0.staffPos === 'fixed' && s0.docH === s0.vh && s0.y === 0, s0);
    check(t + ' no horizontal overflow (page or work area)', s0.docW === s0.vw && s0.mainX <= 1, s0);
    check(t + (port ? ' portrait: compact rail menu' : ' landscape: proportionate menu'), port ? /^0,0,84,/.test(s0.side) : /^0,0,216,/.test(s0.side), s0);
    for (const tab of ['today', 'orders', 'customers', 'kitchen', 'calendar', 'dash']) {
      await go(p, tab);
      const a = await shell(p);
      check(t + ' ' + tab + ': one scroll region (work area), no nested scroll boxes', a.mainOv === 'auto' && a.nested.length === 0, a.nested);
      if (a.mainScroll > 40) {
        await swipe(p, Math.round(w * 0.6), Math.round(h * 0.6), 5000); await swipe(p, Math.round(w * 0.6), Math.round(h * 0.6), 3000);
        const z = await shell(p);
        check(t + ' ' + tab + ': scrolling to the end moves only the work area', z.side === a.side && z.main === a.main && z.y === 0 && z.docH === z.vh, { a: [a.side, a.main], z: [z.side, z.main, z.y] });
        await p.evaluate(() => { document.getElementById('ccs-main').scrollTop = 0; });
      }
      if (SHOTS) await p.screenshot({ path: SHOTS + '/ipad-' + t + '-' + tab + '.png' });
    }
    // controls not clipped: every visible button in the work area sits inside it
    await go(p, 'orders');
    const clip = await p.evaluate(() => { const m = document.getElementById('ccs-main').getBoundingClientRect(); return [...document.querySelectorAll('#ccs-main button, #ccs-main a.ccs-btn, #ccs-main input')].filter(x => x.getClientRects().length && !x.closest('.ccs-secbar, .ccs-tabs, .an-mods, [class*="tabs"], .cdir-segments')).filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.left < m.left - 1 || r.right > m.right + 1); }).map(x => x.textContent.trim().slice(0, 30)); });
    check(t + ' no clipped controls in the work area', !clip.length, clip);
    // order details: opens over the app, scrolls on its own, closing leaves the app where it was
    await p.evaluate(() => { document.getElementById('ccs-main').scrollTop = 0; });
    const before = await shell(p);
    await p.evaluate(() => { const x = document.createElement('button'); x.setAttribute('data-act', 'open-order'); x.setAttribute('data-id', 'o3'); document.getElementById('ccs-main').appendChild(x); x.click(); x.remove(); }); await p.waitForTimeout(1300);
    const sh = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'), bd = s.querySelector('.ccs-sheet-body'), r = s.getBoundingClientRect(); return { open: s.classList.contains('ccs-open'), top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, body: bd && getComputedStyle(bd).overscrollBehaviorY }; });
    await swipe(p, w - 120, Math.round(h * 0.6), 4000);
    const during = await shell(p);
    check(t + ' order details: full height, scrolls on its own (contained), app underneath does not move', sh.open && sh.top === 0 && sh.bottom === sh.vh && sh.body === 'contain' && during.side === before.side && during.main === before.main && during.y === 0, { sh, before: [before.side, before.main], during: [during.side, during.main, during.y] });
    await p.evaluate(() => { const c = document.querySelector('#ccs-sheet [data-act="close"]'); if (c) c.click(); }); await p.waitForTimeout(600);
    const after = await shell(p);
    check(t + ' closing order details leaves the app exactly where it was', after.side === before.side && after.main === before.main && after.y === 0, { before: [before.side, before.main], after: [after.side, after.main] });
    // customer profile
    await p.evaluate(() => { const x = document.createElement('button'); x.setAttribute('data-act', 'open-customer'); x.setAttribute('data-id', 'c1'); document.getElementById('ccs-main').appendChild(x); x.click(); x.remove(); }); await p.waitForTimeout(1500);
    await swipe(p, w - 120, Math.round(h * 0.6), 4000);
    const cp = await shell(p);
    check(t + ' customer profile scrolls on its own; app does not move', cp.side === before.side && cp.main === before.main && cp.y === 0, cp);
    await p.evaluate(() => { const c = document.querySelector('#ccs-sheet [data-act="close"]'); if (c) c.click(); }); await p.waitForTimeout(600);
    // form + keyboard focus: the page itself never scrolls, the field is visible
    await p.evaluate(() => { const b = [...document.querySelectorAll('#cc-staff .ccs-newtop, #cc-staff .tq-new, #cc-staff [data-tab="new"]')].filter(x => x.getClientRects().length)[0]; if (b) b.click(); }); await p.waitForTimeout(1500);
    const fld = await p.evaluate(async () => { const i = [...document.querySelectorAll('#cc-staff input:not([type=hidden]):not([type=checkbox]):not([type=radio]), #cc-staff textarea')].filter(x => x.getClientRects().length).pop(); if (!i) return null; i.focus(); await new Promise(r => setTimeout(r, 500)); const r = i.getBoundingClientRect(); return { y: scrollY, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, docH: document.scrollingElement.scrollHeight }; });
    check(t + ' form field focus: field in view, page does not jump', !fld || (fld.y === 0 && fld.top >= 0 && fld.bottom <= fld.vh && fld.docH === fld.vh), fld);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    // portrait: menu opens over the page and closes on choice; landscape: no Menu button
    if (port) {
      await go(p, 'today');
      const m0 = await shell(p);
      await p.evaluate(() => document.querySelector('.ccp-ipad-menu').click()); await p.waitForTimeout(350);
      const mo = await p.evaluate(() => ({ open: document.documentElement.classList.contains('cc-ipad-navopen'), w: Math.round(document.getElementById('ccs-side').getBoundingClientRect().width), labels: [...document.querySelectorAll('#ccs-side .csc-h')].filter(x => x.getClientRects().length).length, main: (r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','))(document.getElementById('ccs-main').getBoundingClientRect()) }));
      check(t + ' portrait: Menu opens the full menu over the page (work area does not resize)', mo.open && mo.w === 280 && mo.labels > 0 && mo.main === m0.main, { mo, m0: m0.main });
      await p.evaluate(() => [...document.querySelectorAll('#ccs-side .ccs-nav-item[data-tab="orders"]')][0].click()); await p.waitForTimeout(800);
      check(t + ' portrait: choosing a screen closes the menu', await p.evaluate(() => !document.documentElement.classList.contains('cc-ipad-navopen') && document.getElementById('ccs-main').getAttribute('data-screen') === 'orders'));
    } else {
      check(t + ' landscape: whole menu fits without scrolling, no Menu button', await p.evaluate(() => { const n = document.querySelector('#ccs-side .ccs-nav'); return n.scrollHeight <= n.clientHeight + 1 && !document.querySelector('.ccp-ipad-menu').getClientRects().length; }));
    }
    // rotation
    await p.setViewportSize({ width: h, height: w }); await p.waitForTimeout(700);
    const rot = await shell(p);
    check(t + ' rotate: menu switches, still no page scroll or sideways overflow', (port ? /cc-ipad-land/ : /cc-ipad-port/).test(rot.cls) && rot.docH === rot.vh && rot.docW === rot.vw && rot.y === 0 && (port ? /^0,0,216,/ : /^0,0,84,/).test(rot.side), rot);
    const bad = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !bad.length, bad);
    await p.close();
  }
  // software keyboard: Safari shrinks the visual viewport; the scroll areas make room and the page never moves
  { const fake = 'window.__vvH=null;(function(){var L=[];var o={get height(){return window.__vvH==null?innerHeight:window.__vvH},offsetTop:0,width:innerWidth,addEventListener:function(t,f){L.push(f)},removeEventListener:function(){}};Object.defineProperty(window,"visualViewport",{value:o,configurable:true});window.__vvFire=function(){L.forEach(function(f){f()})}})();';
    const { p } = await open(b, 820, 1180, { extraFoot: loader, ipad: true, pre: fake }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#cc-staff .ccs-newtop, #cc-staff [data-tab="new"]')].filter(x => x.getClientRects().length)[0]; if (b) b.click(); }); await p.waitForTimeout(1500);
    const k = await p.evaluate(async () => { const i = [...document.querySelectorAll('#cc-staff input:not([type=hidden]):not([type=checkbox]):not([type=radio])')].filter(x => x.getClientRects().length)[0]; i && i.focus();
      const m = document.getElementById('ccs-main'), pb0 = parseFloat(getComputedStyle(m).paddingBottom);
      window.__vvH = innerHeight - 400; window.__vvFire(); await new Promise(r => setTimeout(r, 200));
      const on = { cls: document.documentElement.classList.contains('cc-ipad-kb'), kb: getComputedStyle(document.documentElement).getPropertyValue('--ipad-kb').trim(), pb: parseFloat(getComputedStyle(m).paddingBottom), y: scrollY, side: Math.round(document.getElementById('ccs-side').getBoundingClientRect().top) };
      i && i.blur(); window.__vvH = null; window.__vvFire(); await new Promise(r => setTimeout(r, 400));
      return { pb0, on, off: { cls: document.documentElement.classList.contains('cc-ipad-kb'), pb: parseFloat(getComputedStyle(m).paddingBottom), y: scrollY } }; });
    check('keyboard opens: work area gets room for it, shell stays put; closes: back to normal', k.on.cls && k.on.kb === '400px' && k.on.pb >= k.pb0 + 390 && k.on.y === 0 && k.on.side === 0 && !k.off.cls && Math.abs(k.off.pb - k.pb0) < 1 && k.off.y === 0, k);
    await p.close(); }
  // computers and phones: unchanged (the iPad shell never switches on)
  for (const [w, h, ipad, name] of [[1366, 900, false, 'computer'], [1280, 800, false, 'laptop'], [390, 844, false, 'phone']]) {
    const { p } = await open(b, w, h, { extraFoot: loader, ipad }); await p.waitForTimeout(2500);
    const s = await p.evaluate(() => ({ cls: document.documentElement.className, style: !!document.getElementById('cc-ipad-shell'), pos: getComputedStyle(document.getElementById('cc-staff')).position }));
    check(name + ' ' + w + 'x' + h + ': iPad shell stays off', !/cc-ipad/.test(s.cls) && s.pos !== 'fixed', s);
    await p.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
