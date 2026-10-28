// Touch standard (21 October 2026): harvest every CSS rule of the staff app that sets a font size, a line height or a
// text colour (all style sheets the page has after visiting every screen), with its media conditions, so
// build/touch_text.py can write src/staff.touch-text.css. No host website code is loaded, so every rule found belongs to
// the app. Invented data (test/mock.js). Run again whenever the app's own styles change:
//   FOOTER=<release footer with 40-zero pins> node build/touch_harvest.cjs   -> build/touch-harvest.json
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const repo = path.resolve(__dirname, '..');
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
  '<script>window.__role="manager";' + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head><body><div id="cc-staff"></div>' + foot + '</body></html>';
const COLLECT = (DUMP) => {
  const out = [], skipped = [];
  const probeBox = document.createElement('div'); probeBox.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:16px;line-height:normal';
  (document.getElementById('cc-staff') || document.body).appendChild(probeBox);
  const probe = document.createElement('span'); probeBox.appendChild(probe);
  const px = v => { probe.style.fontSize = ''; probe.style.fontSize = v; if (!probe.style.fontSize) return null; return parseFloat(getComputedStyle(probe).fontSize); };
  let order = 0;
  const walk = (rules, media, sheet) => {
    for (const r of rules) {
      if (r.type === 4) { walk(r.cssRules, media.concat([r.media.mediaText]), sheet); continue; }        // @media
      if (r.type === 12) { walk(r.cssRules, media.concat(['@supports ' + r.conditionText]), sheet); continue; }
      if (r.cssRules && r.cssRules.length && r.type !== 1) { walk(r.cssRules, media, sheet); continue; }
      if (r.type !== 1) continue;
      const st = r.style, fsv = st.getPropertyValue('font-size'), lhv = st.getPropertyValue('line-height');
      order++;
      if (DUMP) { out.push({ o: order, sheet, sel: r.selectorText, media, css: st.cssText }); continue; }
      const cv = st.getPropertyValue('color');
      if (!fsv && !lhv && !cv) continue;
      out.push({ o: order, sheet, sel: r.selectorText, media, fs: fsv || null, fsImp: st.getPropertyPriority('font-size') === 'important', fsPx: fsv ? px(fsv) : null,
        lh: lhv || null, lhImp: st.getPropertyPriority('line-height') === 'important', color: cv || null, colorImp: st.getPropertyPriority('color') === 'important', bg: st.getPropertyValue('background-color') || st.getPropertyValue('background') || null, h: st.getPropertyValue('height') || null, minh: st.getPropertyValue('min-height') || null });
    }
  };
  [...document.styleSheets].forEach((s, i) => {
    const owner = s.ownerNode, id = owner ? (owner.id || owner.getAttribute('data-cc') || (owner.href || '').slice(-60) || owner.tagName + '#' + i) : 'sheet#' + i;
    try { walk(s.cssRules, s.media && s.media.mediaText ? [s.media.mediaText] : [], id); } catch (e) { skipped.push(id + ': ' + e.message); }
  });
  const u = (() => { probe.style.fontSize = 'calc(17 * var(--u, 1px))'; return parseFloat(getComputedStyle(probe).fontSize) / 17; })();
  probeBox.remove();
  return { rules: out, skipped, sheets: document.styleSheets.length, u };
};
async function tab(p, t) { await p.evaluate(t => { const e = [...document.querySelectorAll('#cc-staff [data-tab="' + t + '"]')].filter(x => x.getClientRects().length).pop() || document.querySelector('#cc-staff [data-tab="' + t + '"]'); e && e.click(); }, t); await p.waitForTimeout(900); }
async function act(p, sel) { await p.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => x.getClientRects().length).pop() || document.querySelector(s); e && e.click(); }, sel); await p.waitForTimeout(700); }
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const all = new Map(); let info = {};
  for (const [w, h, practice] of (process.env.DUMP ? [[1180, 820, false]] : [[1180, 820, false], [390, 844, false], [1180, 820, true]])) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 760 });
    const p = await ctx.newPage();
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
      const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) || u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
      if (m) { const type = /\.css$/.test(m[2]) ? 'text/css' : /\.png$/.test(m[2]) ? 'image/png' : /\.jpe?g$/.test(m[2]) ? 'image/jpeg' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
        if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
        try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); } }
      return r.abort();
    });
    if (practice) await ctx.addInitScript(() => { try { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); sessionStorage.setItem('ccs_practice', '1'); } } catch (e) {} });
    await p.goto('https://www.cornercafefiji.com/cake-orders-staff'); await p.waitForTimeout(2600);
    const steps = [];
    for (const t of ['orders', 'calendar', 'kitchen', 'handover', 'customers', 'dash', 'register', 'settings', 'attn', 'notes', 'today']) { await tab(p, t); steps.push(t + ':' + await p.evaluate(() => document.styleSheets.length)); }
    if (!practice) {
      await act(p, '#cc-staff [data-act="open-order"]'); await p.waitForTimeout(800); await act(p, '#ccs-sheet [data-act="close"]');
      await tab(p, 'customers'); await act(p, '#cc-staff [data-act="open-customer"]'); await p.waitForTimeout(800); await act(p, '#ccs-sheet [data-act="close"]');
      await tab(p, 'new'); await act(p, '[data-act="sl-next"]'); await act(p, '[data-cc-date-for], .ccs-datechips [data-act="n-date"]'); await act(p, '#ccs-sheet [data-act="close"]');
      await tab(p, 'orders'); await act(p, '#cc-staff [data-act="open-slip"]'); await act(p, '#ccs-sheet [data-act="close"]');
      await act(p, '[data-tab="more"], [data-act="more"], [data-act="menu"]');
    }
    steps.push('end:' + await p.evaluate(() => document.styleSheets.length));
    const r = await p.evaluate(COLLECT, !!process.env.DUMP);
    info[w + 'x' + h + (practice ? '-practice' : '')] = { steps, sheets: r.sheets, skipped: r.skipped, u: r.u, rules: r.rules.length };
    for (const x of r.rules) { const k = x.sheet + '|' + x.media.join('&&') + '|' + x.sel + '|' + (x.css || (x.fs + '|' + x.lh + '|' + x.color)); if (!all.has(k)) all.set(k, x); }
    await ctx.close();
  }
  await b.close();
  const rules = [...all.values()];
  fs.writeFileSync(path.join(__dirname, process.env.DUMP ? 'touch-cssdump.json' : 'touch-harvest.json'), JSON.stringify({ info, rules }, null, 0));
  console.log(JSON.stringify(info, null, 1));
  console.log('unique rules', rules.length, 'with font-size', rules.filter(r => r.fs).length, 'with line-height', rules.filter(r => r.lh).length);
  const hist = {}; rules.filter(r => r.fsPx).forEach(r => { const k = Math.round(r.fsPx); hist[k] = (hist[k] || 0) + 1; }); console.log('px histogram', JSON.stringify(hist));
  const rel = rules.filter(r => r.fs && /em|%|smaller|larger/.test(r.fs) && !/rem/.test(r.fs)); console.log('relative sizes', rel.length, rel.slice(0, 8).map(r => r.sel.slice(0, 50) + ' ' + r.fs).join(' | '));
})();
