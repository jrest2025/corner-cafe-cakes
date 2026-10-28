// Release E (28 Oct 2026): two-step sign-in for Admin logins. Mocked authenticator; nothing touches a real account.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('signin') + add('admin');
// mock: required/enrolled/aal kept in localStorage so they survive the reload after a good code
const post = r => `(function(){var L=localStorage,g=function(k,d){var v=L.getItem('t2s.'+k);return v==null?d:JSON.parse(v)},s=function(k,v){L.setItem('t2s.'+k,JSON.stringify(v))};
 if(L.getItem('t2s.init')==null){s('init',1);s('required',${r});s('factors',[]);s('aal','aal1');s('log',[])}
 var lg=function(x){var l=g('log',[]);l.push(x);s('log',l)};
 var o=window.__ccsMock.rpc.bind(window.__ccsMock);
 window.__ccsMock.rpc=function(fn,a){if(fn==='two_step_status'){lg('status');return Promise.resolve({data:{ok:true,required:g('required'),enrolled:g('factors').some(function(f){return f.status==='verified'}),aal:g('aal')}})}
  if(fn==='settings_history')return Promise.resolve({data:{ok:true,entries:[],more:false,areas:[]}});return o(fn,a)};
 window.__ccsMock.auth.mfa={
  listFactors:function(){var f=g('factors');return Promise.resolve({data:{all:f,totp:f.filter(function(x){return x.status==='verified'})}})},
  enroll:function(a){var f=g('factors'),id='f'+(f.length+1);f.push({id:id,status:'unverified',friendly_name:a.friendlyName,created_at:'2026-10-28T02:30:00Z'});s('factors',f);lg('enroll:'+a.issuer);return Promise.resolve({data:{id:id,totp:{qr_code:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',secret:'JBSWY3DPEHPK3PXP'}}})},
  unenroll:function(a){s('factors',g('factors').filter(function(x){return x.id!==a.factorId}));lg('unenroll:'+a.factorId);return Promise.resolve({data:{}})},
  challengeAndVerify:function(a){lg('verify:'+a.code);if(a.code!=='123456')return Promise.resolve({error:{message:'Invalid TOTP code entered'}});var f=g('factors');f.forEach(function(x){if(x.id===a.factorId)x.status='verified'});s('factors',f);s('aal','aal2');return Promise.resolve({data:{}})}};
 window.__ccsMock.auth.signOut=function(){lg('signout');return Promise.resolve({})};
})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
const log = p => p.evaluate(() => JSON.parse(localStorage.getItem('t2s.log') || '[]'));
const view = p => p.evaluate(() => { const c = document.querySelector('#cc2s .cc2s-card'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
(async () => {
  const b = await chromium.launch();
  // 1. Admin, first time: set-up is required
  const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, post: post(true), role: 'admin' });
  await p.waitForTimeout(3500);
  let v = await view(p);
  check('Admin without a phone: set-up screen covers the app (QR, key, code box)', /Turn on two-step sign-in/.test(v || '') && await p.evaluate(() => !!document.querySelector('#cc2s .cc2s-qr') && /JBSW Y3DP/.test(document.querySelector('.cc2s-key').textContent)), v);
  check('the authenticator shows "Corner Café Service Hub"', (await log(p)).includes('enroll:Corner Café Service Hub'));
  await p.screenshot({ path: process.env.S + '/re-setup.png' });
  await p.fill('#cc2s-code', '111111'); await p.waitForTimeout(700);
  v = await view(p);
  check('wrong code: clear message, still on set-up', /didn’t work/.test(v || '') && /Turn on/.test(v), v);
  await p.fill('#cc2s-code', '123456'); await p.waitForTimeout(3500);   // auto-submits at 6 digits, then the page reloads
  check('right code: phone turned on, page reloads into the app with no prompt', !(await view(p)) && (await log(p)).filter(x => x === 'status').length >= 2, await log(p));
  // 2. Settings row and phone list (aal2 now)
  await tap(p, '#cc-staff .ccs-side [data-tab="settings"]', 3000);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.cca-row')].map(r => r.getAttribute('data-cca-open') + ':' + r.innerText.replace(/\s+/g, ' ')));
  check('Settings shows Two-step sign-in (On) under People and access', rows.some(r => /^Two-step sign-in:.*On/.test(r)), rows);
  await p.evaluate(() => [...document.querySelectorAll('.cca-row')].find(r => r.getAttribute('data-cca-open') === 'Two-step sign-in').click()); await p.waitForTimeout(800);
  v = await view(p);
  check('phone list: one phone, no Remove on the last one, Add another phone', /Phone 1/.test(v || '') && !/Remove/.test(v) && /Add another phone/.test(v), v);
  await p.click('[data-2s="add"]'); await p.waitForTimeout(800);
  await p.fill('#cc2s-code', '123456'); await p.waitForTimeout(1200);
  v = await view(p);
  check('second phone added without leaving Settings; both can now be removed', /Phone 2/.test(v || '') && (v.match(/Remove/g) || []).length === 2, v);
  await p.screenshot({ path: process.env.S + '/re-manage.png' });
  await p.click('[data-2s-rm="f1"]'); await p.waitForTimeout(300);
  check('remove asks for a second tap', /Tap again to remove/.test(await view(p) || ''));
  await p.click('[data-2s-rm="f1"]'); await p.waitForTimeout(800);
  v = await view(p);
  check('removed: one phone left, Remove gone again', !/Phone 1 /.test(v || '') && /Phone 2/.test(v) && !/Remove/.test(v), v);
  await p.click('[data-2s="close"]'); await p.waitForTimeout(300);
  // 3. Next sign-in: code prompt (aal1 again)
  await p.evaluate(() => localStorage.setItem('t2s.aal', '"aal1"')); await p.reload(); await p.waitForTimeout(4500);
  v = await view(p);
  check('next sign-in: asks for the code, with Sign out and the lost-phone hint', /Enter your code/.test(v || '') && /Sign out/.test(v) && /Lost your phone/.test(v), v);
  await p.screenshot({ path: process.env.S + '/re-code.png' });
  await p.fill('#cc2s-code', '123456'); await p.waitForTimeout(3500);
  check('code accepted: straight into the app', !(await view(p)));
  check('no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
  // 4. Not an Admin: nothing changes
  const { p: q, errors: e2 } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, post: post(false) });
  await q.waitForTimeout(3500);
  await tap(q, '#cc-staff .ccs-side [data-tab="settings"]', 2500);
  check('other staff: no prompt, no Two-step row', !(await view(q)) && await q.evaluate(() => ![...document.querySelectorAll('.cca-row')].some(r => r.getAttribute('data-cca-open') === 'Two-step sign-in')));
  // 5. Phone size: bottom sheet
  const { p: m } = await open(b, 390, 844, { footBase: swap, extraFoot: base, post: post(true), role: 'admin' });
  await m.waitForTimeout(3500);
  const sh = await m.evaluate(() => { const c = document.querySelector('#cc2s .cc2s-card'); if (!c) return null; const r = c.getBoundingClientRect(); return { bottom: Math.round(innerHeight - r.bottom), w: Math.round(r.width), side: document.documentElement.scrollWidth - innerWidth }; });
  check('phone: set-up opens as a bottom sheet, full width, no sideways scroll', sh && sh.bottom <= 1 && sh.w >= 388 && sh.side <= 0, sh);
  await m.screenshot({ path: process.env.S + '/re-phone.png' });
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
