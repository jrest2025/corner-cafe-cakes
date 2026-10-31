// Release C (28 Oct 2026): Settings history screen (list, filter, before/after, put back with a second tap).
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('admin');
const post = `(function(){var o=window.__ccsMock.rpc.bind(window.__ccsMock);window.__hcalls=[];var E=[
 {id:12,at:'2026-10-28T00:55:00+12:00',area:'Ordering and hours',who:'Roneel',action:'update',item:'Corner Café',changes:[{field:'collection_open',before:'09:00:00',after:'08:00:00'}],can_restore:true},
 {id:11,at:'2026-10-27T22:10:00+12:00',area:'Delivery areas',who:'Roneel',action:'update',item:'Nadi Town',changes:[{field:'fee',before:10,after:12}],can_restore:true},
 {id:10,at:'2026-10-27T21:00:00+12:00',area:'Team',who:'System',action:'staff_removed',item:'Old login',changes:[],can_restore:false},
 {id:9,at:'2026-10-27T20:00:00+12:00',area:'System settings',who:'Roneel',action:'update',item:'cron_key',changes:[{field:'value',before:'(hidden)',after:'(hidden)'}],can_restore:false}];
 window.__ccsMock.rpc=function(fn,a){ if(fn==='settings_history'){window.__hcalls.push(a);var e=E.filter(function(x){return !a.p_area||x.area===a.p_area}).filter(function(x){return !a.p_before||x.id<a.p_before});var lim=a.p_limit||50;return Promise.resolve({data:{ok:!window.__hDeny,entries:e.slice(0,lim),more:e.length>lim,areas:['Ordering and hours','Delivery areas','Team','System settings']}})}
 if(fn==='settings_restore'){window.__restored=a.p_id;return Promise.resolve({data:{ok:true,restored:['fee']}})} return o(fn,a)};})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const t = w > 1000 ? 'desktop' : 'phone';
    const { p, errors } = await open(b, w, h, { extraFoot: base, post });
    await p.waitForTimeout(3000);
    if (w < 1000) { await tap(p, '#cc-staff .ccs-nav [data-tab="more"]', 900); await tap(p, '.ccs-more-links [data-tab="settings"]', 3000); } else await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 3000);
    const row = await p.evaluate(() => [...document.querySelectorAll('.cca-card[data-cca-g="data"] .cca-row')].map(r => r.getAttribute('data-cca-open')));
    check(t + ' Settings history listed under Data and safety', row.includes('Settings history'), row);
    await p.evaluate(() => [...document.querySelectorAll('.cca-row')].find(r => r.getAttribute('data-cca-open') === 'Settings history').click()); await p.waitForTimeout(900);
    const v = await p.evaluate(() => { const box = document.querySelector('.cca-hist'); return { shown: !!box && box.getClientRects().length > 0, set: !!document.querySelector('#ccs-main > .ccs-set') && document.querySelector('#ccs-main > .ccs-set').getClientRects().length > 0, rows: [...document.querySelectorAll('.cca-he')].map(x => x.innerText.replace(/\s+/g, ' ')), btns: document.querySelectorAll('[data-cca-restore]').length, wide: document.documentElement.scrollWidth > innerWidth + 1 }; });
    check(t + ' history shows, settings list hidden, no sideways scroll', v.shown && !v.set && !v.wide, v);
    check(t + ' before and after in plain words, 12-hour times, $ for fees', v.rows[0] && /First collection 9:00 AM → 8:00 AM/.test(v.rows[0]) && /Fee \$10 → \$12/.test(v.rows[1]), v.rows.slice(0, 2));
    check(t + ' who and when shown; system keys hidden; only settings that can be put back have the button', /Roneel/.test(v.rows[0]) && /AM|PM/.test(v.rows[0]) && /\(hidden\)/.test(v.rows[3]) && v.btns === 2, v);
    await p.evaluate(() => document.querySelector('[data-cca-restore="11"]').click()); await p.waitForTimeout(300);
    const armed = await p.evaluate(() => ({ txt: document.querySelector('[data-cca-restore="11"]').textContent, r: window.__restored }));
    check(t + ' first tap asks to tap again, nothing changed yet', /Tap again/.test(armed.txt) && armed.r == null, armed);
    await p.evaluate(() => document.querySelector('[data-cca-restore="11"]').click()); await p.waitForTimeout(700);
    const done = await p.evaluate(() => ({ r: window.__restored, msg: (document.querySelector('.cca-hmsg') || {}).textContent }));
    check(t + ' second tap puts it back and says so', done.r === 11 && /Put back/.test(done.msg || ''), done);
    await p.selectOption('[data-cca-harea]', 'Delivery areas'); await p.waitForTimeout(700);
    const f = await p.evaluate(() => ({ last: window.__hcalls[window.__hcalls.length - 1], rows: document.querySelectorAll('.cca-he').length }));
    check(t + ' filter by area asks the server for that area only', f.last.p_area === 'Delivery areas' && f.rows === 1, f);
    if (w > 1000) { const cur = await p.evaluate(() => (document.querySelector('.cca-menu .cca-mi[aria-current="page"] span') || {}).textContent); check(t + ' menu marks Settings history as current', cur === 'Settings history', cur); }
    await p.evaluate(() => [...document.querySelectorAll('#ccs-main [data-cca-home]')].filter(x => x.getClientRects().length)[0].click()); await p.waitForTimeout(500);
    check(t + ' back to the overview removes the history view', await p.evaluate(() => !document.querySelector('.cca-hist') && !!document.querySelector('.cca-home')));
    if (w > 1000) await p.screenshot({ path: process.env.SHOT || '/tmp/rc.png' });
    check(t + ' no new page errors', !errors.filter(e => !/reading 'filter'/.test(e)).length, errors);
    await p.context().close();
  }
  // a login without permission does not see it
  const { p } = await open(b, 1440, 900, { extraFoot: base, post: post + 'window.__hDeny=true;' });
  await p.waitForTimeout(3000); await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 3000);
  check('without permission: no Settings history row', await p.evaluate(() => ![...document.querySelectorAll('.cca-row')].some(r => r.getAttribute('data-cca-open') === 'Settings history')));
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
})();
