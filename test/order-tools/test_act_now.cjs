// Today "Act now" (staff.flow.js): every order once, where it is acted on — computers, iPads, phones.
// Run: node test/order-tools/test_act_now.cjs
const { open, chromium } = require('./harness.cjs');
const files = ['staff.analytics-focus.js', 'staff.polish.js', 'staff.treat-orders.js', 'staff.ipad.js', 'staff.flow.js'];
const loader = files.map(f => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/' + f + '").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>').join('');
// a waiting online order (as the live service tools add it): CC-1002 is also in the attention list, CC-1999 is not
const banner = '<script>setInterval(function(){var m=document.querySelector(\'#ccs-main[data-screen="today"]\');if(!m||m.querySelector(".cc-st-alert"))return;var b=document.createElement("section");b.className="cc-st-alert";b.innerHTML="<h3>2 online orders are waiting</h3><p>Customers are waiting.</p><div class=cc-st-row><span><b>CC-1002 · Test Customer B</b><small>Needs a price · waiting 5 days</small></span><button type=button class=ccs-btn data-cc-wait-open=o2>Open</button></div><div class=cc-st-row><span><b>CC-1999 · Web Guest</b><small>Needs checking · waiting 2 days</small></span><button type=button class=ccs-btn data-cc-wait-open=o99>Open</button></div>";var h=m.querySelector(".ccs-dash-head");m.insertBefore(b,h?h.nextSibling:m.firstChild)},300)</script>';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 700) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t, ipad] of [[1440, 900, 'computer', false], [1280, 720, 'laptop', false], [1180, 820, 'ipad-landscape', true], [820, 1180, 'ipad-portrait', true], [390, 844, 'phone', false]]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader + banner, ipad, role: 'admin' });
    await p.waitForTimeout(3200);
    const s = await p.evaluate(() => {
      const m = document.getElementById('ccs-main'), vis = e => !!(e && e.getClientRects().length), R = e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), w: Math.round(r.width) }; };
      const rows = [...m.querySelectorAll('.cc-act-row')].filter(vis);
      const refs = rows.map(r => (r.querySelector('.cc-act-tx b').textContent.match(/CC-\d+/) || [''])[0]);
      const allText = m.innerText;
      const visibleRefCount = ref => [...m.querySelectorAll('*')].filter(e => vis(e) && !e.children.length && e.textContent.includes(ref)).length;
      return {
        on: m.classList.contains('cc-act-on'), refs, red: rows.map(r => r.classList.contains('is-red')),
        firstRed: rows.length && rows[0].classList.contains('is-red'),
        counts: (m.querySelector('.cc-act-n') || {}).textContent,
        wait: rows.filter(r => r.querySelector('.cc-act-wait')).map(r => r.querySelector('.cc-act-wait').textContent),
        hidden: { banner: !vis(m.querySelector('.cc-st-alert')), needs: !vis(m.querySelector('.tp-needs')), islands: !vis(m.querySelector('.tx-islands')), sentence: !vis(m.querySelector('.ccb-sum')) },
        tiles: [...m.querySelectorAll('.tq-stats > .tq-stat')].filter(vis).map(x => x.getAttribute('data-v')),
        wk: (m.querySelector('.tq-weekh .cc-act-wk') || {}).textContent,
        once1002: visibleRefCount('CC-1002'),
        head: R(m.querySelector('.ccs-dash-head')), act: R(m.querySelector('.tq-warn')), stats: R(m.querySelector('.tq-stats')), week: R(m.querySelector('.tq-week')), due: R(m.querySelector('.tq-main > .ccs-panel-card:not(.tp-needs)')),
        overlap: (() => { const els = [m.querySelector('.ccs-dash-head'), m.querySelector('.tq-warn'), m.querySelector('.tq-stats'), m.querySelector('.tq-week'), m.querySelector('.tq-main > .ccs-panel-card:not(.tp-needs)')].map(R); for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], c = els[j]; if (a.l < c.l + c.w && c.l < a.l + a.w && a.t < c.b - 1 && c.t < a.b - 1) return [i, j]; } return null; })(),
        docX: document.scrollingElement.scrollWidth > innerWidth
      };
    });
    check(t + ' Act now is on and lists every attention order once (urgent first)', s.on && s.refs.length >= 4 && new Set(s.refs).size === s.refs.length && s.firstRed, s);
    check(t + ' online orders: CC-1002 gets "waiting 5 days" on its line; CC-1999 (not in the list) gets its own line', s.wait.includes('waiting 5 days') && s.refs.includes('CC-1999'), s);
    check(t + ' replaced blocks are hidden: banner, Needs attention islands, Waiting on you, summary sentence', Object.values(s.hidden).every(Boolean), s.hidden);
    check(t + ' only Payments to collect stays as a number; the week strip says how many this week', s.tiles.join() === 'deposit' && /\d+ this week/.test(s.wk || ''), { tiles: s.tiles, wk: s.wk });
    check(t + ' CC-1002 appears once on the screen', s.once1002 === 1, s.once1002);
    check(t + ' order: header → Act now → Payments/week → Due today; nothing overlaps; no sideways scroll', s.head.b <= s.act.t && s.act.b <= s.stats.t && s.act.b <= s.week.t && Math.max(s.stats.b, s.week.b) <= s.due.t + 1 && !s.overlap && !s.docX, s);
    if (!ipad && w > 1000) check(t + ' Act now is full width; Payments beside the week, same height', s.act.w > s.stats.w + s.week.w && s.stats.t === s.week.t && Math.abs(s.stats.b - s.week.b) <= 1, s);
    // tapping a line opens that order (the app's own action)
    await p.evaluate(() => document.querySelector('.cc-act-row[data-id="o2"]').click()); await p.waitForTimeout(1200);
    const sheet = await p.evaluate(() => { const sh = document.querySelector('#ccs-sheet.ccs-open'); return sh ? sh.innerText.replace(/\s+/g, ' ').slice(0, 80) : null; });
    check(t + ' tapping a line opens that order', !!sheet && /CC-1002/.test(sheet), sheet);
    const bad = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !bad.length, bad);
    await p.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
