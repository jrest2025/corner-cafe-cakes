// Kitchen slip with the design photo (Option A, 27 Oct 2026). Adapted from the DL test.
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
const bundle = process.env.BUNDLE;
const PHOTO1 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'dist/brand/cakes/red-velvet.jpg')).toString('base64');
const PHOTO2 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'dist/brand/cakes/strawberry.jpg')).toString('base64');
let NPHOTO = 2;
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
  await p.evaluate(([a, b2, np]) => { window.__photoUrls = { 'o/a.jpg': a, 'o/b.jpg': b2, 'o/c.jpg': a }; const m = window.__ccsMock, r = m.rpc; m.rpc = function (fn, args) { const res = r.apply(this, arguments);
    if (fn !== 'staff_print_brief') return res; return res.then(x => { if (x && x.data && x.data.snapshot) Object.assign(x.data.snapshot, { photos: ['o/a.jpg', 'o/b.jpg', 'o/c.jpg'].slice(0, np), finish: 'custom', design: 'Pink and white ombre buttercream, gold drip, fresh strawberries on top', message: 'Happy 30th Priya', candles: 'Number 3 and 0', occasion: 'Birthday', rush: true }); return x; }); }; }, [PHOTO1, PHOTO2, NPHOTO]);
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
  const SH = process.env.SHOTS || '';
  try {
    for (const [paper, w, h, np] of [['A5', 1280, 900, 2], ['DL', 1280, 900, 1], ['DL', 1280, 900, 0], ['A5', 390, 844, 0]]) {
      NPHOTO = np; const label = paper + ' ' + np + ' photo' + (np === 1 ? '' : 's') + (w < 760 ? ' phone' : '');
      const { ctx, p, errors } = await page(b, w, h, paper);
      const s = await makeSlip(p);
      check(label + ': slip made', !!s.ref, s);
      await js(p, '#ccs-sheet [data-act=brief-print]', 1500);
      const pr = await p.evaluate(() => { const e = document.getElementById('ccs-print'); if (!e) return null; const top = e.querySelector('.slp-top'), logo = top && top.querySelector('.slp-logo');
        return { photoSlip: !!e.querySelector('.slp'), oldSlip: !!e.querySelector('.sl-ordno'), logoLeft: top && logo ? logo.getBoundingClientRect().left - top.getBoundingClientRect().left < 20 : null,
          ph: !!e.querySelector('.slp-ph img'), more: e.querySelectorAll('.slp-more img').length, labels: [...e.querySelectorAll('.slp-c > span')].map(x => x.textContent), text: e.innerText }; });
      if (np) {
        check(label + ': photo slip with the logo top left', pr && pr.photoSlip && pr.logoLeft && !pr.oldSlip, pr && { photoSlip: pr.photoSlip, logoLeft: pr.logoLeft });
        check(label + ': cake, photo and details in order', pr && pr.ph && pr.more === np - 1 && JSON.stringify(pr.labels) === JSON.stringify(['Cake', 'Size', 'Design', 'Inscription', 'Candles', 'Occasion', 'Allergy']), pr && pr.labels);
      } else check(label + ': no photo: new slip, Cake and Size side by side, larger type', pr && pr.photoSlip && pr.logoLeft && !pr.oldSlip && !pr.ph && JSON.stringify(pr.labels) === JSON.stringify(['Cake', 'Size', 'Design', 'Inscription', 'Candles', 'Occasion', 'Allergy']), pr && { labels: pr.labels });
      check(label + ': no Short notice tag', pr && !/short notice/i.test(pr.text));
      if (SH) { await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: path.join(SH, 'print-' + paper + '-' + np + '.png'), fullPage: true }); await p.emulateMedia({ media: 'screen' }); }
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), js(p, '#ccs-sheet [data-act=brief-pdf]', 300)]);
      const bytes = fs.readFileSync(await dl.path()), doc = await PDFLib.PDFDocument.load(bytes);
      const pages = doc.getPages().length, want = np > 1 ? 2 : 1;
      const imgs = (bytes.toString('latin1').match(/\/Subtype\s*\/Image/g) || []).length;
      check(label + ': PDF has ' + want + ' page(s) and ' + np + ' photo(s)', pages === want && imgs === np + 2, { pages, imgs });
      if (SH) fs.copyFileSync(await dl.path(), path.join(SH, 'download-' + paper + '-' + np + '.pdf'));
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
