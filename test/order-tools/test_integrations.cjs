// Phase 3 (28 Oct 2026): read-only Integrations page in Settings, built from the system's own health checks.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('answers') + add('pickups') + add('admin');
const post = deny => `(function(){var o=window.__ccsMock.rpc.bind(window.__ccsMock);window.__seen=[];var now=Date.now(),iso=function(m){return new Date(now-m*60000).toISOString()};
 window.__ccsMock.rpc=function(fn,a){
 if(fn==='settings_history')return Promise.resolve({data:{ok:true,entries:[],more:false,areas:[]}});
 if(fn==='mirror_health')return Promise.resolve({data:${deny ? "{ok:false}" : "{ok:true,state:'current',minutes:1,last_ack_at:iso(1),sheet_title:'Corner Café Cake Orders Backup',sheet_url:'https://docs.google.com/spreadsheets/d/X/edit',emails_failed:0,emails_waiting:0,is_admin:true}"}});
 if(fn==='admin_ops_health')return Promise.resolve({data:{database:true,sheet_read:false,email:true,backup:null,checked_at:iso(0)}});
 if(fn==='admin_print_settings')return Promise.resolve({data:{ok:true,primary:'printer@example.com',verified:false,last_test:null,test_mode:false,sender:'Corner Café Cakes <cakes@example.com>'}});
 if(window.__watch)window.__seen.push(fn);
 return o(fn,a)};})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 600) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t, ipad] of [[1440, 900, 'laptop', false], [1180, 820, 'ipad', true], [390, 844, 'phone', false]]) {
    const { p, errors } = await open(b, w, h, { footBase: swap, extraFoot: base, post: post(false), ipad, role: 'admin' });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { const x = [...document.querySelectorAll('#cc-staff [data-tab="settings"]')].filter(e => e.getClientRects().length)[0] || document.querySelector('#cc-staff [data-tab="settings"]'); x.click(); }); await p.waitForTimeout(2500);
    const row = await p.evaluate(() => { const r = document.querySelector('.cca-row[data-cca-open="Integrations"]'); return r ? r.innerText.replace(/\s+/g, ' ') : null; });
    check(t + ' Integrations listed in Settings with a summary', !!row && /Integrations/.test(row) && /needs checking/.test(row), row);
    await p.evaluate(() => { window.__watch = true; document.querySelector('.cca-row[data-cca-open="Integrations"]').click(); }); await p.waitForTimeout(1200);
    const c = await p.evaluate(() => [...document.querySelectorAll('.cca-icard')].map(x => x.querySelector('b').textContent + '=' + x.querySelector('.cca-ist').textContent + '/' + x.querySelector('.cca-ist').getAttribute('data-tone')));
    check(t + ' six read-only cards with status by colour', c.length === 6 && c.includes('Order database=Working/green') && c.includes('Kitchen printing=Not checked/amber') && c.includes('Google Sheet backup=Up to date/green') && c.some(x => /^Website orders=Taking orders/.test(x)), c);
    const ro = await p.evaluate(() => ({ inputs: document.querySelectorAll('.cca-hist input, .cca-hist select, .cca-hist textarea').length, w: window.__seen.filter(f => !/^(ops_health|mirror_health|admin_print_settings|settings_history|two_step_status|get_order_setup)$/.test(f)) }));
    check(t + ' nothing editable; only the read-only checks are called', ro.inputs === 0 && ro.w.length === 0, ro);
    await p.screenshot({ path: process.env.S + '/int-' + t + '.png', fullPage: t === 'phone' });
    const bad = errors.filter(e => !/length|filter|Unlisted/.test(e)); check(t + ' no page errors', !bad.length, bad);
    await p.close();
  }
  const { p } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, post: post(true), role: 'manager' });
  await p.waitForTimeout(3000); await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 2500);
  check('hidden from logins that cannot see system status', await p.evaluate(() => !document.querySelector('.cca-row[data-cca-open="Integrations"]')));
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
