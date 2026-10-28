// Kitchen slip on DL paper, 110 x 220 mm: the paper choice in Settings, Print on this device (page size, margins, fit)
// and Download (PDF) (the page size inside the file), on DL and still on A5. Staff bundle from BUNDLE env or
// dist/app/staff-slip-dl-manifest.json; pdf-lib and the logo served from local copies of the pinned files. Invented data.
const fs = require('fs'), path = require('path');
const PW = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(PW);
const NM = process.env.NODE_MODULES || path.resolve(PW, '..');
const PDFLibJs = fs.readFileSync(path.join(NM, 'pdf-lib/dist/pdf-lib.min.js'));
const PDFLib = require(path.join(NM, 'pdf-lib'));
const root = path.resolve(__dirname, '..');
const bundle = process.env.BUNDLE || JSON.parse(fs.readFileSync(path.join(root, 'dist/app/staff-slip-dl-manifest.json'), 'utf8')).file;
const LOGO = fs.readFileSync(path.join(root, 'dist/brand/slip-logo-white.png'));
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } }
const PT = 72 / 25.4;
async function page(b, w, h, paper) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760, acceptDownloads: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { if (!/reading 'filter'|reading 'length'/.test(e.message)) errors.push(e.message); });
  await p.route('**/*', r => {
    const u = r.request().url(), cors = { 'access-control-allow-origin': '*' };
    if (u === 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js') return r.fulfill({ body: PDFLibJs, headers: cors, contentType: 'application/javascript' });
    if (/^https:\/\/cdn\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]+\/dist\/brand\/slip-logo-white\.png$/.test(u)) return r.fulfill({ body: LOGO, headers: cors, contentType: 'image/png' });
    if (u.startsWith('https://')) return r.abort();
    return r.continue();
  });
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');
  await p.evaluate(pp => { window.__role = 'admin'; window.__printed = 0; window.print = function () { window.__printed++; };
    window.__pr = { primary: 'kitchen@example.com', backup: '', paper: pp, on_new: true, verified: true, verified_note: 'Test Manager · today', last_test: null, test_mode: true, test_email: 'test@example.com' };
    try { localStorage.clear(); } catch (e) {} }, paper);
  await p.addScriptTag({ path: path.join(root, 'test/mock.js') });
  await p.addScriptTag({ path: path.join(root, bundle) });
  await p.waitForTimeout(700);
  return { ctx, p, errors };
}
const js = async (p, sel, wait) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel); await p.waitForTimeout(wait || 350); return ok; };
async function makeSlip(p) {
  const ref = await p.evaluate(() => { const o = (window.__orders || []).filter(x => x.brief_version > 0 && x.order_status === 'confirmed')[0]; return o ? o.reference : ''; });
  await js(p, '.ccs-nav [data-tab="orders"]', 400);
  if (await p.locator('#ccs-q').count()) { await p.fill('#ccs-q', ref); await p.waitForTimeout(400); }
  await p.evaluate(r => { const b = [...document.querySelectorAll('[data-act=open-order]')].filter(x => x.textContent.indexOf(r) > -1)[0]; if (b) b.click(); }, ref);
  await p.waitForTimeout(900);
  await js(p, '#ccs-sheet [data-act="panel"][data-v="brief"]', 500);
  const btn = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet [data-act=do-brief]'); return b ? b.dataset.v : ''; });
  await js(p, '#ccs-sheet [data-act="do-brief"]', 1000);
  return { ref, btn };
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    // Settings: the paper choice (read from the bundle; the Settings screen loads it from the database)
    const src = fs.readFileSync(path.join(root, bundle), 'utf8');
    check('Settings offers DL as 110 x 220 mm, and A5 as before', src.includes('[["A5","A5 (148 x 210 mm)"],["DL","DL (110 x 220 mm)"]]') && !src.includes('99 x 210'));
    check('the slip layout inside the app uses 110 x 220 mm for DL', src.includes('const r={A5:[148,210],DL:[110,220]};') && !src.includes('DL:[99,210]'));
    for (const [paper, w, h] of [['DL', 1280, 900], ['DL', 390, 844], ['A5', 1280, 900]]) {
      const label = paper + (w < 760 ? ' phone' : ' tablet');
      const { ctx, p, errors } = await page(b, w, h, paper);
      const s = await makeSlip(p);
      check(label + ': the slip follows the paper setting', s.ref && s.btn === paper, s);
      await js(p, '#ccs-sheet [data-act=brief-print]', 900);
      const pr = await p.evaluate(() => { const e = document.getElementById('ccs-print'); return { css: (document.getElementById('ccs-page') || {}).textContent || '', w: e && e.style.width, h: e && e.style.height, sc: e && e.dataset.scale, printed: window.__printed }; });
      const mm = v => Math.round(parseFloat(v) / (96 / 25.4));
      if (paper === 'DL') {
        check(label + ': Print on this device uses a 110 x 220 mm page with 6 mm margins', pr.css === '@page{size:110mm 220mm;margin:6mm}', pr.css);
        check(label + ': the slip is fitted to 98 x 206 mm, never cut off', mm(pr.w) === 98 && mm(pr.h) === 206 && parseFloat(pr.sc) <= 1 && pr.printed === 1, pr);
      } else {
        check(label + ': A5 prints as before', pr.css === '@page{size:A5 portrait;margin:8mm}' && mm(pr.w) === 132 && mm(pr.h) === 191 && pr.printed === 1, pr);
      }
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), js(p, '#ccs-sheet [data-act=brief-pdf]', 300)]);
      const doc = await PDFLib.PDFDocument.load(fs.readFileSync(await dl.path()));
      const sz = doc.getPages().map(pg => pg.getSize()).map(z => [Math.round(z.width / PT), Math.round(z.height / PT)]);
      const want = paper === 'DL' ? [110, 220] : [148, 210];
      check(label + ': Download (PDF) is one ' + want.join(' x ') + ' mm page', sz.length === 1 && sz[0][0] === want[0] && sz[0][1] === want[1] && /\.pdf$/.test(dl.suggestedFilename()), { sz, name: dl.suggestedFilename() });
      if (process.env.SHOTS && paper === 'DL' && w > 760) fs.copyFileSync(await dl.path(), path.join(process.env.SHOTS, 'slip-dl-download.pdf'));
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
