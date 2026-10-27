// Release D (28 Oct 2026): payment methods and lead-time groups from Settings.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('answers') + add('pickups') + add('admin');
const EXTRA = { payment_methods: [{ code: 'cash', label: 'Cash', active: true }, { code: 'eftpos', label: 'Card', active: true }, { code: 'mpaisa', label: 'M-PAiSA', active: false }, { code: 'bank_transfer', label: 'Bank transfer', active: true }, { code: 'other', label: 'Other', active: false }],
  lead_bands: [{ min: 0, max: 3 }, { min: 4, max: 7 }, { min: 8, max: 14 }, { min: 15, max: 30 }, { min: 31, max: null }] };
const post = `(function(){var o=window.__ccsMock.rpc.bind(window.__ccsMock);window.__saved=[];window.__ccsMock.rpc=function(fn,a){
 if(fn==='settings_history')return Promise.resolve({data:{ok:true,entries:[],more:false,areas:[]}});
 if(fn==='settings_payment_methods_save'){window.__saved.push([fn,a.p]);return Promise.resolve({data:{ok:true,payment_methods:a.p}})}
 if(fn==='settings_lead_bands_save'){window.__saved.push([fn,a.p]);var b=[],lo=0;a.p.forEach(function(h){b.push({min:lo,max:h});lo=h+1});b.push({min:lo,max:null});return Promise.resolve({data:{ok:true,lead_bands:b}})}
 return o(fn,a)};})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, pre: 'window.__setupExtra=' + JSON.stringify(EXTRA) + ';', post });
  await p.waitForTimeout(3000);
  const st = await p.evaluate(() => ({ pay: window.__ccsPay.map(x => x[1]), all: window.__ccsPayAll && window.__ccsPayAll.length, bands: window.__ccsBands.map(x => x[0]) }));
  check('payment buttons follow Settings (Card renamed, M-PAiSA off)', JSON.stringify(st.pay) === '["Cash","Card","Bank transfer"]' && st.all === 5, st);
  check('lead-time groups follow Settings', JSON.stringify(st.bands) === '["0–3 days","4–7 days","8–14 days","15–30 days","31+ days"]', st.bands);
  // Analytics: Cake sales pickups legend
  await tap(p, '#cc-staff .ccs-side [data-tab="dash"]', 4000);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.an-mods button')].find(x => x.dataset.v === 'sl'); b && b.click(); }); await p.waitForTimeout(3000);
  const leg = await p.evaluate(() => [...document.querySelectorAll('.pk-mixleg em')].map(x => x.textContent.trim()));
  check('pickups timeline legend uses the groups (5 + not known)', leg.length === 6 && /31 or more days ahead/.test(leg[0]) && /0 to 3 days ahead/.test(leg[4]), leg);
  await p.screenshot({ path: process.env.S + '/rd-pickups.png', fullPage: false });
  // Settings screens
  await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 3000);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.cca-row')].map(r => r.getAttribute('data-cca-open')));
  check('Payment methods and Lead-time groups listed in Settings', rows.includes('Payment methods') && rows.includes('Lead-time groups'), rows);
  await p.evaluate(() => [...document.querySelectorAll('.cca-row')].find(r => r.getAttribute('data-cca-open') === 'Payment methods').click()); await p.waitForTimeout(800);
  await p.fill('[data-v2pay-label="1"]', 'Card (EFTPOS)'); await p.click('[data-v2pay-on="2"]'); await p.click('[data-v2pay-down="0"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: process.env.S + '/rd-pay.png' });
  await p.click('[data-v2pay-save]'); await p.waitForTimeout(600);
  const sv = await p.evaluate(() => ({ s: window.__saved[0], pay: window.__ccsPay.map(x => x[1]), msg: (document.querySelector('.cca-hmsg') || {}).textContent }));
  check('payment methods save: renamed, switched on, reordered, and the app updates at once', sv.s && sv.s[1][0].code === 'eftpos' && sv.s[1][0].label === 'Card (EFTPOS)' && sv.s[1][2].active === true && JSON.stringify(sv.pay) === '["Card (EFTPOS)","Cash","M-PAiSA","Bank transfer"]' && /Saved/.test(sv.msg || ''), sv);
  await p.evaluate(() => [...document.querySelectorAll('.cca-mi')].find(r => r.getAttribute('data-cca-open') === 'Lead-time groups').click()); await p.waitForTimeout(800);
  const bl = await p.evaluate(() => document.querySelector('.cca-hist').innerText.replace(/\s+/g, ' '));
  check('lead-time editor shows 0 to 3 ... 31 or more days', /0 to 4 to 8 to 15 to 31 or more days/.test(bl.replace(/days/g, '').replace(/\s+/g, ' ')) || /31 or more days/.test(bl), bl.slice(0, 200));
  await p.fill('[data-v2band="0"]', '2'); await p.click('[data-v2band-del="3"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: process.env.S + '/rd-bands.png' });
  await p.click('[data-v2band-save]'); await p.waitForTimeout(600);
  const bs = await p.evaluate(() => ({ s: window.__saved[1], bands: window.__ccsBands.map(x => x[0]) }));
  check('lead-time groups save and the charts update at once', bs.s && JSON.stringify(bs.s[1]) === '[2,7,14]' && JSON.stringify(bs.bands) === '["0–2 days","3–7 days","8–14 days","15+ days"]', bs);
  await p.fill('[data-v2band="0"]', 'x'); await p.click('[data-v2band-save]'); await p.waitForTimeout(300);
  check('a wrong number is refused before saving', await p.evaluate(() => /whole days/.test((document.querySelector('.cca-herr') || {}).textContent || '') && window.__saved.length === 2));
  check('no new page errors', !errors.filter(e => !/reading 'filter'/.test(e)).length, errors);
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
})();
