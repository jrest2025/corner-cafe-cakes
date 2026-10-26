const fs = require('fs'); const crypto = require('crypto'); const { open, tap, chromium } = require('./harness.cjs');
const S = '/tmp/claude-0/-home-claude/89a0271a-5b9f-50dd-abef-d330e3d77ee6/scratchpad';
const foot7 = fs.readFileSync(S + '/loader7.html', 'utf8'), verify = fs.readFileSync(S + '/verify-head2.html', 'utf8');
const post = "(function(){var m=window.__ccsMock,r=m.rpc;m.rpc=function(fn,a){var p=r.apply(this,arguments);if(fn!=='dashboard_data'&&fn!=='dashboard_register')return p;return p.then(function(res){try{var T=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date());var os=(res.data&&res.data.orders)||[];var n=0;os.forEach(function(o){if(n<3&&o.pd&&o.pd<=T&&o.pd>=T.slice(0,8)+'01'&&o.st!=='cancelled'){o.rush=true;n++;}});window.__rushSet=n;}catch(e){}return res;});}})();";
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
async function railHash(p) { return p.evaluate(() => { const r = document.getElementById('cc-demand-scroll-rail'); return r ? r.innerHTML.length + ':' + r.querySelectorAll('*').length : 'none'; }); }
async function toDash(p) { await tap(p, '#cc-staff [data-tab="dash"]', 5000); }
async function setView(p, v) { await p.evaluate(v => { const b = document.querySelector('#cc-demand-views [data-view="' + v + '"]'); if (b) b.click(); }, v); await p.waitForTimeout(900); }
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    // baseline: the live page as it is
    let s = await open(b, w, h, { post, ipad: t === 'tablet' }); await s.p.waitForTimeout(600); await toDash(s.p); await setView(s.p, 'due');
    const base = await railHash(s.p); await s.ctx.close();
    // with the change
    s = await open(b, w, h, { post, ipad: t === 'tablet', extraHead: verify, extraFoot: foot7 }); const { p, errors, logs } = s; await p.waitForTimeout(600); await toDash(p);
    await setView(p, 'due');
    check(t + ' Daily cake demand ("Booked and due") unchanged', (await railHash(p)) === base, { base, now: await railHash(p) });
    await setView(p, 'lead');
    check(t + ' new version of the booking view is running', await p.evaluate(() => window.CCCakeLeadTime && window.CCCakeLeadTime.version === '0.3.0'));
    const months = await p.evaluate(() => [...document.querySelectorAll('#cc-cake-lead-time .cclt-m')].map(e => { const r = e.getBBox(); return { t: e.textContent, x: r.x, r: r.x + r.width }; }));
    const overlap = months.some((m, i) => i && months[i - 1].r > m.x - 2);
    check(t + ' month names do not overlap', months.length >= 1 && !overlap, months);
    const ticks = await p.evaluate(() => document.querySelectorAll('#cc-cake-lead-time .cclt-usual').length);
    check(t + ' "usual for this weekday" ticks shown (' + ticks + ')', ticks > 5, ticks);
    const rush = await p.evaluate(() => ({ dots: document.querySelectorAll('#cc-cake-lead-time .cclt-rush').length, set: window.__rushSet }));
    check(t + ' amber marks on days with a manager OK (' + rush.dots + ')', rush.set > 0 && rush.dots > 0, rush);
    // tap a day with an amber mark
    await p.evaluate(() => { const c = document.querySelector('#cc-cake-lead-time .cclt-rush'); const cx = +c.getAttribute('cx'); const hit = [...document.querySelectorAll('#cc-cake-lead-time .cclt-hit')].find(r => cx >= +r.getAttribute('x') && cx <= +r.getAttribute('x') + +r.getAttribute('width')); hit.dispatchEvent(new MouseEvent('click', { bubbles: true })); if (hit.onclick) hit.onclick(); });
    await p.waitForTimeout(500);
    const det = await p.evaluate(() => document.querySelector('#cc-cake-lead-time .cclt-detail').textContent.replace(/\s+/g, ' '));
    check(t + ' day details say usual and short-notice', /Usual for a \w+day/.test(det) && /short-notice order/.test(det), det.slice(0, 300));
    check(t + ' About this chart explains the tick and dot', await p.evaluate(() => /Dark tick/.test(document.querySelector('#cc-cake-lead-time .cc-why').textContent)));
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(t + ' no horizontal page scroll', over <= 1, over);
    check(t + ' no refused or unlisted files', !logs.filter(m => /asset check|Order tools|booking view/i.test(m)).length, logs.filter(m => /asset check|Order tools|booking view/i.test(m)));
    check(t + ' no page errors', !errors.filter(m => !/reading 'length'|reading 'filter'/.test(m)).length, errors);
    await p.evaluate(() => document.getElementById('cc-cake-lead-time').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
    await p.screenshot({ path: 'shots/lt-' + t + '.png' });
    await s.ctx.close();
  }
  await b.close(); console.log('\n' + n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
