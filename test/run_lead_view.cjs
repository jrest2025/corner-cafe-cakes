// LEAD VIEW CHECK. The "By booking time" alternative view on Analytics, beside the protected Daily cake demand chart.
// Same page set-up as run_heartbeat_guard.cjs (HEAD/FOOTER env, pinned add-ons from git, forty-zero pin = working tree).
// REAL=<file> swaps in real register orders for screenshots; SHOTS=<dir> saves screenshots.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const footRaw = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8');
const bundle = process.env.BUNDLE || (footRaw.match(/dist\/app\/staff-app\.[0-9a-f]+\.js/) || [''])[0];
const foot = footRaw.replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '')
  .replace(/@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]+\.js/, '@LOCAL/' + bundle);
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const shim = 'window.supabase={createClient:function(){var m=window.__ccsMock;if(!m.from)m.from=function(t){var o={};' +
  '["select","gte","lte","eq","in","order","limit","neq","is"].forEach(function(k){o[k]=function(){return o}});o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o};return m}};';
const real = process.env.REAL ? 'window.__REAL=' + fs.readFileSync(process.env.REAL, 'utf8') + ';(function(){var m=window.__ccsMock,r=m.rpc;m.rpc=function(fn){var p=r.apply(this,arguments);' +
  'return fn==="dashboard_register"?p.then(function(x){if(x&&x.data&&x.data.ok)x.data.orders=window.__REAL;return x}):p}})();' : '';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>window.__role="manager";' + mock + shim + real + '</script></head><body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
const types = { js: 'application/javascript', css: 'text/css' };
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const [w, h, label] of [[1440, 1000, 'computer'], [1024, 1366, 'tablet'], [390, 900, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (/Cake booking view/.test(m.text())) errors.push(m.text()); });
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (u.includes('@LOCAL/')) return r.fulfill({ body: fs.readFileSync(path.join(repo, u.split('@LOCAL/')[1])), contentType: 'application/javascript' });
      if (u.startsWith('https://www.cornercafefiji.com/cake-orders-staff')) return r.fulfill({ body: html, contentType: 'text/html' });
      const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) ||
        u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
      if (m) {
        const type = types[m[2].split('.').pop()] || 'text/plain', hdr = { 'access-control-allow-origin': '*' };
        if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
        try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); }
        catch (e) { return r.fulfill({ status: 404, body: '', headers: hdr }); }
      }
      return r.abort();
    });
    await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
    await p.waitForTimeout(1500);
    await p.evaluate(() => { try { localStorage.removeItem('cc_demand_view'); } catch (e) {} const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
    try { await p.waitForSelector('#cc-demand-views', { timeout: 15000 }); } catch (e) {}
    await p.waitForTimeout(600);
    const vis = q => p.evaluate(q => { const e = document.querySelector(q); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'; }, q);
    check(label + ': view switch shown above the chart', await vis('#cc-demand-views'));
    check(label + ': current chart shown by default', await vis('#cc-demand-scroll-rail') && !(await vis('#cc-cake-lead-time')));
    const sw = '#cc-demand-views';
    if (process.env.SHOTS) { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start' }), sw); await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(process.env.SHOTS, label + '-current.png') }); }
    await p.click('#cc-demand-views [data-view="lead"]').catch(() => {});
    await p.waitForTimeout(400);
    check(label + ': "By booking time" shows the new view and hides the current chart', await vis('#cc-cake-lead-time') && !(await vis('#cc-demand-scroll-rail')));
    const v = await p.evaluate(() => {
      const box = document.getElementById('cc-cake-lead-time'); if (!box) return {};
      const fs = q => { const e = box.querySelector(q); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; };
      const btn = document.querySelector('#cc-demand-views [data-view="lead"]');
      return { bars: box.querySelectorAll('svg rect[fill^="#"]').length, hits: box.querySelectorAll('.cclt-hit').length,
        txt: box.innerText, body: fs('.cclt-habit>p'), small: fs('.cclt-note'), btnH: btn ? btn.getBoundingClientRect().height : 0,
        sx: document.documentElement.scrollWidth - innerWidth, pressed: btn && btn.getAttribute('aria-pressed') };
    });
    check(label + ': bars drawn', v.bars > 5, v.bars);
    check(label + ': no undefined or NaN', !/undefined|NaN/.test(v.txt || ''));
    check(label + ': switch remembers choice state', v.pressed === 'true');
    check(label + ': no sideways page scroll', v.sx <= 1, v.sx);
    if (label === 'tablet') check('tablet: text and buttons meet the touch standard', v.body >= 20 && v.small >= 17 && v.btnH >= 56, v);
    if (label === 'phone') check('phone: text and buttons meet the touch standard', v.body >= 18 && v.small >= 16 && v.btnH >= 48, v);
    const day = await p.$('#cc-cake-lead-time .cclt-hit');
    if (day) { await day.click(); await p.waitForTimeout(200); }
    check(label + ': tapping a day shows its cakes', /cake/.test(await p.evaluate(() => (document.querySelector('#cc-cake-lead-time .cclt-detail') || {}).innerText || '')));
    if (process.env.SHOTS) { await p.evaluate(() => { const e = document.querySelector('#cc-cake-lead-time .cclt-hit[data-d="' + (document.querySelector('.cclt-on') ? '' : '') + '"]'); });
      await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start' }), sw); await p.waitForTimeout(200);
      await p.screenshot({ path: path.join(process.env.SHOTS, label + '-booking-time.png'), fullPage: false }); }
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { const e = [...document.querySelectorAll('[data-tab="dash"]')].pop(); e && e.click(); });
    try { await p.waitForSelector('#cc-demand-views', { timeout: 15000 }); } catch (e) {}
    await p.waitForTimeout(500);
    check(label + ': choice remembered after reload', await vis('#cc-cake-lead-time'));
    await p.click('#cc-demand-views [data-view="due"]').catch(() => {}); await p.waitForTimeout(300);
    check(label + ': switching back restores the current chart', await vis('#cc-demand-scroll-rail') && !(await vis('#cc-cake-lead-time')));
    check(label + ': no script errors', errors.length === 0, errors);
    await ctx.close();
  }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
