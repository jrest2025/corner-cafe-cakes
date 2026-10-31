// Phase 2 (28 Oct 2026): Today "Act now" lines shown as icon chips; Due today tags carry a clock.
const { open, chromium } = require('./harness.cjs');
const files = ['staff.analytics-focus.js', 'staff.polish.js', 'staff.treat-orders.js', 'staff.ipad.js', 'staff.flow.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
const out = process.env.SHOTS;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 900) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t, ipad] of [[1440, 900, 'laptop', false], [1180, 820, 'ipad', true], [390, 844, 'phone', false]]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader, ipad, role: 'admin' });
    await p.waitForTimeout(3500);
    const s = await p.evaluate(() => { const m = document.getElementById('ccs-main'), vis = e => !!(e && e.getClientRects().length);
      const rows = [...m.querySelectorAll('.cc-act-row')].filter(vis);
      return { rows: rows.length, lines: rows.map(r => { const l = r.querySelector('.ccq2-line'); return l ? { src: l.getAttribute('data-ccq2-src'), chips: [...l.querySelectorAll('.ccq2-c')].map(c => c.className.replace('ccq2-c ', '') + ':' + c.textContent), hints: [...l.querySelectorAll('.ccq2-h')].map(x => x.textContent) } : null; }),
        clocks: [...m.querySelectorAll('.tq-left')].filter(vis).map(e => !!e.querySelector('svg')) }; });
    console.log(JSON.stringify(s, null, 1).slice(0, 3000));
    check(t + ' every Act now line is chips', s.rows > 0 && s.lines.every(l => l && l.chips.length), s.lines);
    check(t + ' Due today tags have a clock', s.clocks.every(Boolean), s.clocks);
    if (out) { const el = await p.$('#ccs-main .tq-warn'); if (el) await el.screenshot({ path: out + '/' + t + '-act.png' }); await p.screenshot({ path: out + '/' + t + '-today.png', fullPage: t === 'phone' }); }
    const bad = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !bad.length, bad);
    await p.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
