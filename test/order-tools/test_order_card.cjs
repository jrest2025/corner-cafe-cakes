// Order card (28 Oct 2026): only the order number under the name, bolder labels, Collection under the cake, no Collection tab.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const L = fs.readFileSync(__dirname + '/../../docs/loader51.js', 'utf8').replace(/c='[0-9a-f]{40}'/, "c='0000000'");
const S = process.env.S || '/tmp';
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1440, 900, 'desktop'], [1180, 820, 'ipad'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { footBase: swap, extraFoot: '<script>' + L + '</script>', ipad: t === 'ipad' });
    await p.waitForTimeout(4000);
    await tap(p, '#cc-staff [data-tab="orders"]', 1500);
    await p.evaluate(() => document.querySelector('#ccs-main .ccs-card').click()); await p.waitForTimeout(2000);
    const r = await p.evaluate(() => {
      const sh = document.getElementById('ccs-sheet'), dt = sh.querySelector('.ccs-kv dt');
      return { sub: (sh.querySelector('.os-tph small') || {}).textContent, dtW: dt && getComputedStyle(dt).fontWeight, dtC: dt && getComputedStyle(dt).color,
        tabs: [...sh.querySelectorAll('.ccs-secbtn')].filter(x => x.getClientRects().length).map(x => x.innerText.trim()),
        when: (sh.querySelector('.ccs-secbody .ocx-when') || {}).innerText, order: [...sh.querySelectorAll('.ccs-secbody > *')].map(x => x.className).slice(0, 3), side: document.documentElement.scrollWidth - innerWidth };
    });
    check(t + ': only the order number under the name', /^CC-\d+$/.test((r.sub || '').trim()), r.sub);
    check(t + ': cake labels semi-bold and dark', +r.dtW >= 600 && r.dtC === 'rgb(29, 41, 57)', [r.dtW, r.dtC]);
    check(t + ': Collection under the cake (date, 12-hour time, counter, change)', /Collection/.test(r.when || '') && /Friday 30 October at 2:00 PM/.test(r.when) && /café counter/.test(r.when) && /Change collection or delivery/.test(r.when) && /ocx-when/.test(r.order[1] || ''), r);
    check(t + ': Collection tab gone', !r.tabs.some(x => /Collection/.test(x)), r.tabs);
    check(t + ': no sideways scroll', r.side <= 0, r.side);
    if (t === 'desktop') {
      await p.evaluate(() => document.querySelector('.ocx-when [data-act="am-go"]').click()); await p.waitForTimeout(1200);
      const am = await p.evaluate(() => document.getElementById('ccs-sheet').innerText.replace(/\s+/g, ' ').slice(0, 400));
      check('Change collection or delivery opens the app’s own change screen', /collection|delivery|Collection|Delivery/.test(am) && !/^$/.test(am), am.slice(0, 200));
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    }
    await p.screenshot({ path: S + '/oc-' + t + '.png' });
    check(t + ': no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
