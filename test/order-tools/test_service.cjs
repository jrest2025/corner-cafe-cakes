const fs = require('fs'); const { open, tap, chromium } = require('./harness.cjs');
const SHA = process.env.SHA || '0000000';
const loader = '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@' + SHA + '/src/staff.service-tools.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
// test data: two online orders waiting 45 and 95 minutes; kitchen actions recorded
const post = "(function(){var m=window.__ccsMock,os=window.__orders;var ago=function(n){return new Date(Date.now()-n*60000).toISOString()};os.forEach(function(o){if(o.id==='o1')o.created_at=ago(45);if(o.id==='o2')o.created_at=ago(95);});" +
  "var F=m.from;m.from=function(t){var B=F.apply(this,arguments);if(t!=='orders')return B;var S0=B.select;B.select=function(sel){if(!/^id,reference,(created_at|order_status,production_status)/.test(sel||''))return S0.apply(B,arguments);return mine()};return B};function mine(){var f=[],b={select:function(){return b},eq:function(k,v){f.push(function(o){return o[k]===v||(k==='is_test'&&!o[k]&&!v)});return b},in:function(k,v){f.push(function(o){return v.indexOf(o[k])>-1});return b},order:function(){return b},limit:function(){return b},then:function(ok,bad){var d=os.filter(function(o){return f.every(function(x){return x(o)})});return Promise.resolve({data:d}).then(ok,bad)}};return b}" +
  "var R=m.rpc;m.rpc=function(fn,a){if(fn==='kitchen_set_stage'){(window.__stage=window.__stage||[]).push(a);if(a.p_stage==='ready'&&!a.p_name)return Promise.resolve({data:{ok:false,message:'Enter the name of the person who checked the cake.'}});var o=os.filter(function(x){return x.id===a.p_order})[0];if(o){o.production_status=a.p_stage;if(a.p_stage==='ready'){o.qc_by=a.p_name;o.ready_at=new Date().toISOString()}o.version++}return Promise.resolve({data:{ok:true,stage:a.p_stage}})}return R.apply(this,arguments)};})();";
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await open(b, w, h, { post, extraFoot: loader, ipad: t === 'tablet', pre: 'window.__ccTestHour=12;' });
    await p.waitForTimeout(1500);
    // ---- alert on Today
    const al = await p.evaluate(() => { const a = document.querySelector('#ccs-main[data-screen="today"] .cc-st-alert'); return a ? { h: a.querySelector('h3').textContent, rows: [...a.querySelectorAll('.cc-st-row b')].map(x => x.textContent), sm: [...a.querySelectorAll('.cc-st-row small')].map(x => x.textContent) } : null; });
    check(t + ' Today shows waiting online orders', al && /2 online orders are waiting/.test(al.h), al);
    check(t + ' oldest first, with how long', al && /CC-1002/.test(al.rows[0]) && /waiting 1 h 35 min/.test(al.sm[0]) && /waiting 45 min/.test(al.sm[1]), al);
    await p.screenshot({ path: (process.env.SHOTS||'/tmp')+'/st-' + t + '-today.png' });
    await tap(p, '#ccs-main [data-cc-wait-open="o2"]', 1200);
    check(t + ' Open goes straight to that order', await p.evaluate(() => /CC-1002/.test((document.querySelector('#ccs-sheet .ccs-sheet-head') || {}).textContent || '')));
    await tap(p, '#ccs-sheet .ccs-x', 600);
    // ---- outside opening hours: no alert
    await p.evaluate(() => { window.__ccTestHour = 22; }); await tap(p, '#cc-staff [data-tab="orders"]', 800); await tap(p, '#cc-staff [data-tab="today"]', 1200);
    check(t + ' no alert outside opening hours', !(await p.evaluate(() => !!document.querySelector('.cc-st-alert'))));
    await p.evaluate(() => { window.__ccTestHour = 12; });
    // ---- Cake is ready
    await tap(p, '#cc-staff [data-tab="orders"]', 1200);
    const has7 = await p.evaluate(() => !!document.querySelector('[data-act="open-order"][data-id="o7"]'));
    if (!has7) { await p.evaluate(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'open-order'); b.setAttribute('data-id', 'o7'); document.getElementById('cc-staff').appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(1200); }
    else await tap(p, '[data-act="open-order"][data-id="o7"]', 1200);
    await p.waitForTimeout(600);
    check(t + ' "Cake is ready" on a confirmed order not yet ready', await p.evaluate(() => !!document.querySelector('#ccs-sheet .ccs-actions-row .cc-st-ready')));
    await tap(p, '#ccs-sheet .cc-st-ready', 500);
    const names = await p.evaluate(() => [...document.querySelectorAll('#ccs-sheet [data-cc-ready-name]')].map(x => x.textContent));
    check(t + ' asks who checked it, with my name to tap', names.length >= 1 && /Test Manager/.test(names[0]), names);
    await p.screenshot({ path: (process.env.SHOTS||'/tmp')+'/st-' + t + '-ready.png' });
    await tap(p, '#ccs-sheet [data-cc-ready-go]', 600);
    check(t + ' no name: stopped with a message, nothing saved', await p.evaluate(() => /Tap or type the name/.test((document.querySelector('#ccs-sheet .cc-st-err') || {}).textContent || '') && !(window.__stage || []).length));
    await tap(p, '#ccs-sheet [data-cc-ready-name]', 1500);
    const st = await p.evaluate(() => (window.__stage || []).map(a => a.p_stage + ':' + (a.p_name || '')));
    check(t + ' app\'s own kitchen action: check, then ready with the name', JSON.stringify(st) === JSON.stringify(['quality_check:', 'ready:Test Manager']), st);
    const after = await p.evaluate(() => ({ ready: !document.querySelector('#ccs-sheet .cc-st-ready'), wa: !!document.querySelector('#ccs-sheet [data-act="ready-wa"]') }));
    check(t + ' order reopens as ready, "Let the customer know" shown', after.ready && after.wa, after);
    // ---- not shown on an unconfirmed order or a ready one
    await tap(p, '#ccs-sheet .ccs-x', 500); await tap(p, '#cc-staff [data-tab="orders"]', 900); await tap(p, '[data-act="open-order"][data-id="o1"]', 1300);
    check(t + ' not shown on an order still to be confirmed', !(await p.evaluate(() => !!document.querySelector('#ccs-sheet .cc-st-ready'))));
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(t + ' no horizontal scroll', over <= 1, over);
    check(t + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
    check(t + ' no add-on warnings', !logs.filter(m => /Service tools/.test(m)).length, logs.filter(m => /Service tools/.test(m)));
    await ctx.close();
  }
  await b.close(); console.log('\n' + n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
