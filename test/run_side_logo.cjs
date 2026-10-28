// Corner Café Service Hub, white logo (20 October 2026). Wherever the side menu is charcoal (the tablet side menu, the
// top bar on phones, the kitchen screen), the logo is the white one and SERVICE HUB under it is light grey and never
// cut off; the sign-in screen says Corner Café Service Hub. Live head and footer (test/fixtures) or FOOTER; the staff
// bundle and add-ons come from the commits the footer pins (a commit of 40 zeros serves the working copy).
// Invented data only.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8')
  .replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const shim = 'window.supabase={createClient:function(){var m=window.__ccsMock;if(!m.from)m.from=function(t){var o={};["select","gte","lte","eq","in","order","limit","neq","is"].forEach(function(k){o[k]=function(){return o}});o.then=function(a,b){return Promise.resolve({data:[],error:null}).then(a,b)};return o};return m}};' +
  'if(window.__signedOut)window.__ccsMock.auth.getSession=function(){return Promise.resolve({data:{session:null}})};';
const html = (role, out) => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>window.__role="' + role + '";window.__signedOut=' + !!out + ';' + mock + shim + '</script></head><body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
async function open(b, w, h, role, out) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/cake-orders-staff')) return r.fulfill({ body: html(role, out), contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) || u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : /\.js$/.test(m[2]) ? 'application/javascript' : 'text/plain', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '', headers: hdr }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-semantic-colour-style', { timeout: 8000, state: 'attached' }); } catch (e) {}
  await p.waitForTimeout(1200);
  return { ctx, p, errors };
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, role, label] of [[412, 893, 'manager', 'phone'], [1366, 1024, 'manager', 'tablet'], [820, 1180, 'manager', 'upright tablet'], [412, 893, 'kitchen', 'kitchen phone'], [1366, 1024, 'kitchen', 'kitchen tablet']]) {
      const { ctx, p, errors } = await open(b, w, h, role);
      const st = await p.evaluate(() => {
        const side = document.querySelector('#cc-staff .ccs-side'), brand = side && side.querySelector('.ccs-brand'), small = brand && brand.querySelector('small');
        const cs = brand && getComputedStyle(brand), r = brand && brand.getBoundingClientRect(), sr = side && side.getBoundingClientRect(), mr = small && small.getBoundingClientRect();
        return { colour: !!document.getElementById('cc-semantic-colour-style'), side: side && getComputedStyle(side).backgroundColor, img: cs ? cs.backgroundImage : '',
          text: small ? small.textContent : null, small: small ? getComputedStyle(small).color : null, smallShown: !!small && getComputedStyle(small).display !== 'none',
          fits: !!small && small.scrollWidth <= small.clientWidth + 1 && mr.left >= sr.left - 0.5 && mr.right <= sr.right + 0.5, lines: small ? Math.round(mr.height / parseFloat(getComputedStyle(small).lineHeight || 14)) : 0,
          name: brand ? brand.textContent.replace(/\s+/g, ' ').trim() : '', box: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null };
      });
      check(label + ': the colour layer loaded and the side is charcoal', st.colour && st.side === 'rgb(41, 45, 51)', st.side);
      const white = await p.evaluate(src => new Promise(ok => { const m = /^url\("?(data:image\/png;base64,[^")]+)"?\)$/.exec(src); if (!m) return ok(null); const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let sum = 0, k = 0; for (let j = 0; j < d.length; j += 4) if (d[j + 3] > 200) { sum += (d[j] + d[j + 1] + d[j + 2]) / 3; k++; } ok({ mean: k ? sum / k : 0, solid: k }); }; i.onerror = () => ok(null); i.src = m[1]; }), st.img);
      check(label + ': the logo is the white one', white && white.solid > 5000 && white.mean > 250, white);
      // 21 October 2026: the brand line under the logo reads Marketing Central (Roneel); the sign-in screen keeps Service Hub
      check(label + ': the brand line reads Corner Café Marketing Central', st.name === 'Corner CaféMarketing Central' || st.name === 'Corner Café Marketing Central', st.name);
      if (st.smallShown) {
        // Light grey on the charcoal bar: 72% (colour layer), 80% (sidebar contract) or 86% (touch standard)
        check(label + ': MARKETING CENTRAL under the logo is light grey', st.text === 'Marketing Central' && ['rgba(255, 255, 255, 0.72)', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.86)'].includes(st.small), [st.text, st.small]);
        check(label + ': MARKETING CENTRAL is not cut off', st.fits, st);
      }
      const shot = await p.screenshot({ clip: { x: Math.max(0, st.box.x), y: Math.max(0, st.box.y), width: Math.max(1, st.box.w), height: Math.max(1, st.box.h) } });
      const lum = await p.evaluate(async b64 => { const i = new Image(); await new Promise(r => { i.onload = r; i.src = 'data:image/png;base64,' + b64; }); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let bright = 0; for (let j = 0; j < d.length; j += 4) if ((d[j] + d[j + 1] + d[j + 2]) / 3 > 200) bright++; return { bright, px: d.length / 4 }; }, shot.toString('base64'));
      check(label + ': the logo stands out on the bar', lum.bright / lum.px > 0.08, lum);
      check(label + ': no script errors', errors.length === 0, errors);
      if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, 'logo-' + label.replace(/\s+/g, '-') + '.png'), clip: { x: 0, y: 0, width: w, height: Math.min(h, 240) } });
      await ctx.close();
    }
    for (const [w, h, label] of [[412, 893, 'phone'], [1366, 1024, 'tablet']]) {
      const { ctx, p, errors } = await open(b, w, h, 'manager', true);
      const s = await p.evaluate(() => ({ login: !!document.querySelector('#ccs-login'), brand: (document.querySelector('#ccs-login .ccs-brand') || {}).textContent, title: (document.querySelector('#ccs-login .ccs-title') || {}).textContent }));
      check(label + ' sign in: says Corner Café Service Hub', s.login && s.brand === 'Corner Café Service Hub' && s.title === 'Staff sign in', s);
      check(label + ' sign in: no script errors', errors.length === 0, errors);
      if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, 'signin-' + label + '.png') });
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
