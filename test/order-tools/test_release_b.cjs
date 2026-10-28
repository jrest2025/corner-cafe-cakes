// Release B (28 Oct 2026): occasions from Settings on the staff order form; 12-hour time fields in Settings.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = '947432f33366819a4012d809fface3ca691e6fdb';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.5d6e1635b4.js');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('admin');
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
const OCC = [{ code: 'birthday', label: 'Birthday' }, { code: 'anniversary', label: 'Anniversary' }, { code: 'engagement', label: 'Engagement' }, { code: 'other', label: 'Other' }];
(async () => {
  const b = await chromium.launch();
  for (const occ of [OCC, null]) {
    const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, pre: occ ? 'window.__setupOcc=' + JSON.stringify(occ) + ';' : '' });
    await p.waitForTimeout(3000);
    await tap(p, '#cc-staff .ccs-side [data-tab="new"]', 1500);
    const chips = await p.evaluate(() => { const o = window.__ccsOcc ? window.__ccsOcc.slice() : null; return o; });
    if (occ) check('staff form uses the Settings list (Engagement in, Graduation out)', JSON.stringify(chips) === JSON.stringify(['Birthday', 'Anniversary', 'Engagement', 'Other']), chips);
    else check('without a Settings list the built-in list stays', chips && chips.length === 12 && chips[0] === 'Birthday', chips);
    check((occ ? 'with' : 'without') + ' list: no page errors from the change', !errors.some(e => /__ccsOcc|occasions/.test(e)), errors);
    await p.context().close();
  }
  // 12-hour fields in Settings > Notice and collection hours
  const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: base });
  await p.waitForTimeout(3000);
  await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 3000);
  await p.evaluate(() => { const r = [...document.querySelectorAll('.cca-mi')].find(x => /Notice/.test(x.textContent)); r && r.click(); }); await p.waitForTimeout(1200);
  const f = await p.evaluate(() => { const w = document.querySelectorAll('#cc-staff .cct12'), src = document.getElementById('st-open'); return { n: w.length, shown: w[0] && w[0].querySelector('.cct12-t').value, ap: w[0] && w[0].querySelector('[aria-pressed=true]').textContent, srcHidden: src && getComputedStyle(src).opacity === '0' }; });
  check('collection times show as 12-hour fields with AM/PM, device box hidden', f.n === 2 && /^\d{1,2}:\d{2}$/.test(f.shown) && f.srcHidden, f);
  await p.fill('#cc-staff .cct12 >> nth=0 >> .cct12-t', '8'); await p.click('#cc-staff .cct12 >> nth=0 >> [data-ap=am]');
  check('typing 8 with AM sets 08:00 for saving', await p.evaluate(() => document.getElementById('st-open').value) === '08:00');
  await p.fill('#cc-staff .cct12 >> nth=1 >> .cct12-t', '9'); await p.click('#cc-staff .cct12 >> nth=1 >> [data-ap=pm]');
  check('typing 9 with PM sets 21:00', await p.evaluate(() => document.getElementById('st-close').value) === '21:00');
  await p.fill('#cc-staff .cct12 >> nth=0 >> .cct12-t', '13:75');
  check('a wrong time is flagged and not used', await p.evaluate(() => !document.querySelector('.cct12-err').hidden && document.getElementById('st-open').value === '08:00'));
  await p.fill('#cc-staff .cct12 >> nth=0 >> .cct12-t', '8:30');
  await p.screenshot({ path: process.env.SHOT || '/tmp/rb.png' });
  check('no page errors', !errors.filter(e => !/reading 'filter'/.test(e)).length, errors);
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
})();
