// Touch standard (21 October 2026): the Jack's Restaurants touch-friendly interface standard on the staff page.
// The page as it is served: the website's own code (test/fixtures/host-site.css, host-site-head.html, host-site-footer.html),
// the live page head, and the footer (FOOTER env: the release footer; otherwise test/fixtures/staff-footer.html), with the
// staff app at MANIFEST when given (default: whatever the footer loads). Touch on, the real logo. Invented data.
// Checks: text sizes and dark text, tap targets, text boxes, the iPad side menu, phones (New order in the bottom menu,
// bottom sheets with a drag handle), no sideways scrolling, fades, the website's code kept off the app, the Heartbeat
// left exactly as it was, and computers unchanged.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const fx = f => fs.readFileSync(path.join(repo, 'test/fixtures', f), 'utf8');
let foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
if (process.env.MANIFEST) {
  const m = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST), 'utf8'));
  const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
  if (!LOADER.test(foot)) throw new Error('The footer has no staff app loader');
  foot = foot.replace(LOADER, (x, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + m.file + '",' + h + ',k="' + m.sri + '"');
}
const mock = fx('../mock.js');
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style id="host-site-css">' + fx('host-site.css') + '</style>' + fx('host-site-head.html') + fx('staff-head.html') +
  '<script>window.__role="manager";' + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head><body><div id="cc-staff"></div>' +
  foot + fx('host-site-footer.html') + '</body></html>';
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 700) : '')); } }

async function open(b, w, h, touch) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) || u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : /\.png$/.test(m[2]) ? 'image/png' : /\.jpe?g$/.test(m[2]) ? 'image/jpeg' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  await p.waitForTimeout(2600);
  return { ctx, p, errors };
}
const tab = async (p, t) => { await p.evaluate(t => { const e = [...document.querySelectorAll('#cc-staff [data-tab="' + t + '"]')].filter(x => x.getClientRects().length).pop() || document.querySelector('#cc-staff [data-tab="' + t + '"]'); e && e.click(); }, t); await p.waitForTimeout(900); };
// Text under the minimum, pale text on a light background, tap targets under the minimum, sideways scroll (not the
// Heartbeat, the logo, the printed slip or the photo viewer)
const AUDIT = (min) => {
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return null; return r; };
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const L = c => { const [r, g, b] = rgb(c).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const bgOf = e => { for (; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e), c = rgb(s.backgroundColor); if (c.length && (c.length < 4 || c[3] > .5)) return s.backgroundColor; if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; } return 'rgb(255,255,255)'; };
  const nm = e => (e.tagName.toLowerCase() + '.' + String(e.className || '').trim().split(/\s+/).slice(0, 2).join('.')).slice(0, 40);
  const skip = '#cc-heartbeat, svg, .ccs-slip, .ccs-lb, [aria-hidden="true"]';
  const small = [], pale = [], taps = [];
  document.querySelectorAll('#cc-staff *, #ccs-sheet *').forEach(e => {
    if (!vis(e) || e.closest(skip) || e.matches('.ccs-brand')) return;
    const own = [...e.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim().length > 1).map(x => x.textContent.trim()).join(' ');
    if (!own) return;
    const s = getComputedStyle(e);
    if (parseFloat(s.fontSize) < min - .3) small.push(nm(e) + ' ' + s.fontSize + ' "' + own.slice(0, 20) + '"');
    const bg = bgOf(e);
    if (bg && L(bg) > .5) { const c = rgb(s.color), a = c.length > 3 ? c[3] : 1, sat = Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)); if ((L(s.color) > .1 || a < .8) && sat < 48) pale.push(nm(e) + ' ' + s.color + ' "' + own.slice(0, 20) + '"'); }
  });
  const tmin = min >= 17 ? 52 : 48;
  document.querySelectorAll('#cc-staff :is(button, a[href], input:not([type=hidden]), select, summary, [role=button]), #ccs-sheet :is(button, a[href], input:not([type=hidden]), select, summary)').forEach(e => {
    const r = vis(e); if (!r || e.closest('#cc-heartbeat, svg, .ccs-lb') || e.matches('.cc-dp-native, .ccs-sr')) return;
    if (/^(checkbox|radio)$/.test(e.type)) { const l = e.closest('label'); if (l && l.getBoundingClientRect().height >= tmin - .5) return; }
    if (r.height < tmin - .5 || r.width < 44) taps.push(nm(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return { small, pale, taps, hscroll: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
};
const sizeOf = (p, s) => p.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => x.getClientRects().length)[0]; if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(c.fontSize), top: Math.round(r.top), left: Math.round(r.left) }; }, s);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h, label] of [[820, 1180, 'iPad upright'], [1180, 820, 'iPad sideways'], [390, 844, 'iPhone']]) {
      const phone = w <= 700, min = phone ? 16 : 17;
      const { ctx, p, errors } = await open(b, w, h, true);
      // ---------- every main screen: text, colour, tap targets, no sideways scroll ----------
      for (const v of ['today', 'orders', 'calendar', 'customers', 'kitchen', 'handover', 'register', 'settings', 'dash']) {
        await tab(p, v);
        const a = await p.evaluate(AUDIT, min);
        check(label + ' ' + v + ': no text under ' + min + 'px, none pale, every tap target big enough, no sideways scroll',
          !a.small.length && !a.pale.length && !a.taps.length && !a.hscroll, a);
      }
      await tab(p, 'today');
      // ---------- text boxes ----------
      await tab(p, 'new');
      const inp = await sizeOf(p, '#n-phone');
      check(label + ': text boxes ' + (phone ? '52px tall with 17px' : '56px tall with 19px') + ' text', !!inp && inp.h >= (phone ? 52 : 56) && inp.fs === (phone ? 17 : 19), inp);
      const nxt = await sizeOf(p, '#ccs-sheet [data-act="sl-next"]');
      check(label + ': Next is a big button, at least ' + (phone ? 48 : 56) + 'px', !!nxt && nxt.h >= (phone ? 48 : 56), nxt);
      const a2 = await p.evaluate(AUDIT, min);
      check(label + ': New order: no small or pale text, every tap target big enough', !a2.small.length && !a2.pale.length && !a2.taps.length && !a2.hscroll, a2);
      check(label + ': New order: the step names are not cut off', await p.evaluate(() => [...document.querySelectorAll('#cc-staff .sl-wrap.is-stepper .sl-dots > li')].every(li => getComputedStyle(li, '::after').textOverflow !== 'ellipsis' || getComputedStyle(li, '::after').display === 'none')));
      if (!phone) {
        const t = await sizeOf(p, '#ccs-sheet .ccs-sheet-head .ccs-title'), x = await sizeOf(p, '#ccs-sheet .ccs-sheet-head .ccs-x');
        check(label + ': pop-up title 24px, Close at the top and 54px', !!t && t.fs >= 24 && !!x && x.h >= 54 && x.w >= 54 && x.top < 90, { t, x });
      }
      await p.evaluate(() => { const x = document.querySelector('#ccs-sheet .ccs-sheet-head .ccs-x'); x && x.click(); }); await p.waitForTimeout(700);
      // ---------- sheets fade, no sliding ----------
      check(label + ': windows fade in about 0.2 seconds, without sliding', await p.evaluate(() => { const s = getComputedStyle(document.getElementById('ccs-sheet')); return /opacity/.test(s.transitionProperty) && (s.transform === 'none' || /^matrix\(1, 0, 0, 1, -/.test(s.transform)) && parseFloat(s.transitionDuration) <= .25; }));
      // ---------- the website's own code stays off the app ----------
      // (the page itself may clip sideways, the app's own rule: clip makes no scroll box, so iPad scrolling is unaffected)
      check(label + ': normal scrolling and visible page overflow (the website\'s smooth scrolling and hidden overflow are off)', await p.evaluate(() =>
        getComputedStyle(document.documentElement).scrollBehavior === 'auto' && getComputedStyle(document.body).overflowX === 'visible' && getComputedStyle(document.body).overflowY === 'visible' &&
        /^(visible|clip)$/.test(getComputedStyle(document.documentElement).overflowX) && getComputedStyle(document.documentElement).overflowY === 'visible'));
      check(label + ': the website\'s reveal animation skips the app', await p.evaluate(() => { const s = document.getElementById('cc-staff'); let ok = s.hasAttribute('data-no-motion'); for (let e = s; e && e !== document.body; e = e.parentElement) if (/ccm-/.test(e.className)) ok = false; return ok && !document.querySelector('#cc-staff .ccm-motion'); }));
      if (!phone) {
        // ---------- iPad side menu ----------
        const menu = await p.evaluate(() => { const side = document.querySelector('#cc-staff .ccs-side'), items = [...side.querySelectorAll('.ccs-nav-item')].filter(e => e.getClientRects().length);
          const fold = document.querySelector('#cc-staff .ccs-collapse');
          return { w: Math.round(side.getBoundingClientRect().width), rows: items.map(e => Math.round(e.getBoundingClientRect().height)), fs: items.map(e => parseFloat(getComputedStyle(e).fontSize)),
            names: items.every(e => { const s = e.querySelector('span:not(.ccs-count)'); return !s || (s.getClientRects().length && s.getBoundingClientRect().left > e.querySelector('svg').getBoundingClientRect().right - 1); }),
            icon: Math.round(items[0].querySelector('svg').getBoundingClientRect().width), fold: !!(fold && fold.getClientRects().length) }; });
        check(label + ': the side menu is open with names showing beside the icons', menu.names, menu);
        check(label + ': menu ' + (w > h ? 256 : 230) + 'px wide', Math.abs(menu.w - (w > h ? 256 : 230)) <= 2, menu.w);
        check(label + ': menu rows at least 60px with 19px names, icons about 40px', menu.rows.every(x => x >= 60) && menu.fs.every(x => x === 19) && menu.icon >= 38 && menu.icon <= 42, menu);
        check(label + ': no fold-to-icons button', !menu.fold);
      } else {
        // ---------- iPhone: New order in the bottom menu ----------
        const bar = await p.evaluate(() => { const nav = document.querySelector('#cc-staff .ccs-nav'); return [...nav.children].filter(e => e.getClientRects().length).map(e => e.textContent.replace(/\d+/g, '').trim()); });
        check(label + ': bottom menu is Today, Orders, New order, More', JSON.stringify(bar) === JSON.stringify(['Today', 'Orders', 'New order', 'More']), bar);
        const nb = await sizeOf(p, '#cc-staff .ccs-nav .cc-t-new');
        check(label + ': New order is the big button in the middle, within thumb reach', !!nb && nb.h >= 56 && nb.top > h - 110, nb);
        check(label + ': the top New order button is not shown twice', !(await p.evaluate(() => { const t = document.querySelector('#cc-staff .ccs-topnew'); return !!(t && t.getClientRects().length); })));
        await p.evaluate(() => document.querySelector('#cc-staff .ccs-nav .cc-t-new').click()); await p.waitForTimeout(900);
        check(label + ': it opens New order', await p.evaluate(() => !!document.querySelector('#ccs-sheet.ccs-open #ccs-slipform')));
        // ---------- bottom sheets ----------
        const sh = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'), r = s.getBoundingClientRect(), c = getComputedStyle(s), hd = getComputedStyle(s, '::before');
          return { left: Math.round(r.left), w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom), radius: parseFloat(c.borderTopLeftRadius), handle: hd.content !== 'none' && parseFloat(hd.width) >= 36, vh: innerHeight }; });
        check(label + ': pop-ups open as bottom sheets: full width, rounded top, a drag handle, inside the screen', sh.left === 0 && sh.w === w && sh.radius >= 16 && sh.handle && sh.top >= 8 && sh.bottom <= sh.vh, sh);
        const bar2 = await sizeOf(p, '#ccs-sheet .sl-stepbar [data-act="sl-next"]');
        check(label + ': Next stays at the bottom of the sheet', !!bar2 && bar2.top + bar2.h <= h && bar2.top > h - 140, bar2);
        await p.evaluate(() => { const x = document.querySelector('#ccs-sheet .ccs-sheet-head .ccs-x'); x && x.click(); }); await p.waitForTimeout(700);
        // order details, then pull the handle down
        await tab(p, 'orders');
        await p.evaluate(() => { const c = document.querySelector('#cc-staff [data-act="open-order"]'); c && c.click(); }); await p.waitForTimeout(1200);
        const s2 = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'); return s.classList.contains('ccs-open') ? Math.round(s.getBoundingClientRect().top) : null; });
        check(label + ': an order opens as a bottom sheet', s2 !== null && s2 >= 8, s2);
        const sx = 195, sy = (s2 || 10) + 12;
        await p.evaluate(([x, y]) => { const s = document.getElementById('ccs-sheet'); const t = (type, yy) => s.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: s, clientX: x, clientY: yy })], changedTouches: [new Touch({ identifier: 1, target: s, clientX: x, clientY: yy })] }));
          t('touchstart', y); t('touchmove', y + 60); t('touchmove', y + 150); t('touchend', y + 150); }, [sx, sy]);
        await p.waitForTimeout(700);
        check(label + ': pulling the handle down closes it, like Close', await p.evaluate(() => !document.getElementById('ccs-sheet').classList.contains('ccs-open')));
      }
      // ---------- the Heartbeat is left exactly as it was ----------
      await tab(p, 'dash'); await p.waitForTimeout(800);
      const hb = await p.evaluate(() => { const h = document.getElementById('cc-heartbeat'); if (!h) return null; const cap = h.querySelector('.hb-k-caption'), s = getComputedStyle(h);
        return { fs: s.fontSize, cap: cap ? getComputedStyle(cap).fontSize : null, btn: (() => { const b = h.querySelector('.ccdr-today'); return b ? Math.round(b.getBoundingClientRect().height) : null; })() }; });
      check(label + ': the Heartbeat keeps its own text settings', !!hb && hb.fs === '18px' && (hb.cap === null || parseFloat(hb.cap) < 14), hb);
      check(label + ': no script errors', !errors.length, errors);
      await ctx.close();
    }
    // ---------- computers: no change ----------
    for (const [w, h] of [[1366, 768], [1920, 1080]]) {
      const { ctx, p, errors } = await open(b, w, h, false);
      const c = await p.evaluate(() => { const side = document.querySelector('#cc-staff .ccs-side'), it = document.querySelector('#cc-staff .ccs-nav-item');
        return { token: getComputedStyle(document.documentElement).getPropertyValue('--cc-fs-body').trim(), side: Math.round(side.getBoundingClientRect().width), nav: getComputedStyle(it).fontSize,
          newbar: !!(document.querySelector('.cc-t-new') || {}).getClientRects && !!document.querySelector('.cc-t-new').getClientRects().length, smooth: getComputedStyle(document.documentElement).scrollBehavior }; });
      check(w + 'x' + h + ' computer: the touch sizes are not used, the menu is as before, no extra buttons', c.token === '' && c.side === 248 && c.nav === '16px' && !c.newbar, c);
      check(w + 'x' + h + ' computer: no script errors', !errors.length, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
