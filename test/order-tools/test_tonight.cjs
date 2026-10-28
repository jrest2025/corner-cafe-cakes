// 28 Oct 2026 evening: customer emails need two taps, "Mark cake ready", typo pencils, side menu stays still.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const L = fs.readFileSync(__dirname + '/../../docs/' + (process.env.LOADER || 'loader64.js'), 'utf8').replace(/c='[0-9a-f]{40}'/, "c='0000000'");
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: '<script>' + L + '</script>', role: 'admin' });
  await p.waitForTimeout(4500);
  await p.evaluate(() => { window.__rpc = []; const o = window.__ccsMock.rpc; window.__ccsMock.rpc = function (fn, a) { window.__rpc.push(fn); return o.call(window.__ccsMock, fn, a); }; });
  // side menu stays still on screen switches
  await p.evaluate(() => { window.__ls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ls += e.value; }).observe({ type: 'layout-shift' }); });
  for (const t of ['orders', 'today', 'customers', 'orders']) await tap(p, '#cc-staff .ccs-side [data-tab="' + t + '"]', 1500);
  const ls = await p.evaluate(() => window.__ls);
  check('switching screens: nothing moves (layout shift ' + ls.toFixed(3) + ')', ls < 0.01, ls);
  check('Old orders stays under Orders in the side menu', await p.evaluate(() => { const i = [...document.querySelectorAll('#cc-staff .ccs-side .ccs-nav-item')].map(b => b.textContent.trim()); return /^Orders/.test(i[i.findIndex(x => /^Old orders/.test(x)) - 1] || ''); }));
  const openRef = async ref => { const q = await p.$('#ccs-main input'); await q.fill(ref); await p.waitForTimeout(1200); await p.evaluate(r => { const c = [...document.querySelectorAll('#ccs-main .ccs-card')].find(c => c.innerText.includes(r)); c && c.click(); }, ref); await p.waitForTimeout(1500); };
  await openRef('CC-1007');
  const rb = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet .cc-st-ready'); return b && { t: b.textContent, bg: getComputedStyle(b).backgroundColor }; });
  check('"Mark cake ready" is a plain white button', rb && rb.t === 'Mark cake ready' && rb.bg === 'rgb(255, 255, 255)', rb);
  check('pencil beside the customer name', await p.evaluate(() => !!document.querySelector('#ccs-sheet .os-tph > b .ccp-pen')));
  await p.evaluate(() => { const m = document.querySelector('.ccs-actions > .ccp-more .ccp-more-b'); m && m.click(); }); await p.waitForTimeout(400);
  await p.click('.ccp-more-l [data-v="cancel"]'); await p.waitForTimeout(800);
  await p.evaluate(() => { const c = document.querySelector('.cc-ot-chips .ccs-chip'); c && c.click(); }); await p.waitForTimeout(300);
  await p.click('[data-act="do-cancel"]'); await p.waitForTimeout(400);
  const a1 = await p.evaluate(() => ({ t: (document.querySelector('[data-act="do-cancel"]') || {}).textContent, sent: window.__rpc.includes('staff_order_action') }));
  check('first tap on Cancel only arms it ("Tap again to send"), nothing sent', a1.t === 'Tap again to send' && !a1.sent, a1);
  await p.click('[data-act="do-cancel"]'); await p.waitForTimeout(1200);
  check('second tap sends the cancel', await p.evaluate(() => window.__rpc.includes('staff_order_action')));
  await openRef('CC-1004');
  await p.click('#ccs-sheet .os-tph .ccp-pen'); await p.waitForTimeout(1200);
  check('pencil opens Change order', await p.evaluate(() => /Amend CC-1004/.test(document.getElementById('ccs-sheet').innerText)));
  check('no page errors', !errors.filter(e => !/length|Unlisted/.test(e)).length, errors);
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
