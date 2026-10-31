// Release F (28 Oct 2026): the order screen's Feedback section must not crash when the feedback reply has no notes list.
// Runs the Release F bundle (built by build/release_f_fixes.py) against the mock database.
// Usage: LOCAL_DIR=<folder holding src files and the new bundle> node test/order-tools/test_release_f.cjs <bundle file name>
const { open, tap, chromium } = require('./harness.cjs');
const BUNDLE = process.argv[2] || 'staff-app.83d76f9aa9.js';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@0000000/dist/app/' + BUNDLE);
const post = `(function(){var o=window.__ccsMock.rpc.bind(window.__ccsMock);window.__ccsMock.rpc=function(fn,a){
  if(fn==='feedback_list')return Promise.resolve({data:{ok:true,can_resolve:true,staff:[]}});
  return o(fn,a)};})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
    const { p, errors, logs } = await open(b, w, h, { footBase: swap, post });
    await p.waitForTimeout(3000);
    await tap(p, '#cc-staff [data-tab="orders"]', 1500);
    await p.evaluate(() => document.querySelector('#ccs-main .ccs-card').click()); await p.waitForTimeout(2000);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#ccs-sheet .ccs-secbtn')].find(x => /Feedback/.test(x.innerText)); if (b) b.click(); }); await p.waitForTimeout(1200);
    const fb = await p.evaluate(() => (document.querySelector('#ccs-sheet #fb-sec') || {}).innerText || '');
    check(t + ': Feedback section shows the empty state', /No feedback recorded for this order yet/.test(fb), fb.slice(0, 200));
    check(t + ': no "reading length" crash', !logs.concat(errors).some(x => /reading 'length'/.test(x)), logs.concat(errors).slice(0, 5));
    check(t + ': no page errors', errors.length === 0, errors);
  }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
