// 28 Oct 2026: the seasonal order module on the festive page; Order on a card adds that goodie; the switch Off shows Coming soon.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const repo = path.join(__dirname, '..', '..'), SHOTS = process.env.SHOTS || '';
const addon = fs.readFileSync(path.join(repo, 'src/guest.seasonal.js'), 'utf8');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const footer = fs.readFileSync(path.join(repo, 'src/festive/festive-page-footer.html'), 'utf8').replace(/<script src=[^>]*><\/script>\s*/g, '');
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const NAMES = [['Gingerbread House', '$35.00', 'Each'], ['Mince Pies', '$12.00', 'Pack of 3'], ['Festive Cookies', '$12.00', 'Pack of 6']];
function page(on) {
  const menu = { ok: true, today: fiji(0), groups: on ? [{ id: 'g1', name: 'Festive treats', message: 'A little festive joy, made to share.', payment: 'pickup', items: [
    { id: 'i1', name: 'Gingerbread House', detail: '15cm (H) × 13cm (W) × 20cm (L)', price: 35, lead_days: 2, sold_out: [], blocked: [] },
    { id: 'i2', name: 'Mince Pies', detail: 'Pack of 3', price: 12, lead_days: 2, sold_out: [], blocked: [] },
    { id: 'i3', name: 'Festive Cookies', detail: 'Pack of 6', price: 12, lead_days: 2, sold_out: [], blocked: [] }] }] : [] };
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Georgia,serif;background:#faf6ef}.ccfest-shell{width:calc(100% - 64px);max-width:1240px;margin:0 auto}.w-dyn-items{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.ccfest-card{background:#fff;padding:16px;border:1px solid #e8e1d5}@media(max-width:600px){.w-dyn-items{grid-template-columns:1fr}.ccfest-shell{width:calc(100% - 32px)}}</style></head><body>' +
    '<main class="ccfest"><section style="padding:40px"><h1>A Taste of the Festive Season</h1><a class="ccfest-btn" href="/order-cake#cc-treat-order">Order festive treats</a></section>' +
    '<section id="festive-menu"><div class="ccfest-shell"><div id="festive-goodies"><div class="w-dyn-items">' + NAMES.map((n, i) => '<div class="w-dyn-item"><div class="ccfest-card"><h3 class="ccfest-card-title">' + n[0] + '</h3><span class="ccfest-card-price">' + n[1] + '</span> <a class="ccfest-card-add" href="#festive-order">Add to my order</a></div></div>').join('') + '</div></div></div></section>' +
    '<section id="festive-order"><form><p>Old enquiry form</p></form></section><section style="height:1800px">FAQ</section></main>' +
    '<script>' + mock + '</script><script>window.__ccoMock={rpc:function(fn,a){if(fn==="get_order_setup")return window.__ccsMock.rpc(fn,a);if(fn==="get_seasonal_menu")return Promise.resolve({data:' + JSON.stringify(menu) + '});if(fn==="submit_treat_order"){window.__tsent=(window.__tsent||[]).concat([a.p]);return Promise.resolve({data:{ok:true,reference:"T-1001"}})}return Promise.resolve({data:null})}};</script>' +
    footer.replace('</script>\n<script>\n/* Festive menu', () => '</script><script>' + addon + '</script><script>\n/* Festive menu') + '</body></html>';
}
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [390, 844, 'phone']]) for (const on of [true, false]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 760, hasTouch: w < 760 });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await ctx.route('**/*', r => { const u = r.request().url(); if (u.includes('get_seasonal_menu')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, groups: on ? [{ id: 'g1' }] : [] }) }); if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ contentType: 'text/html', body: page(on) }); r.abort(); });
    await p.goto('https://www.cornercafefiji.com/festive'); await p.waitForTimeout(1500);
    const tag = t + (on ? ' switch On' : ' switch Off');
    const s = await p.evaluate(() => { const m = document.getElementById('cc-treat-order'); return { mod: !!m && !m.hidden, afterMenu: !!document.querySelector('#festive-menu + .ccfest-treats #cc-treat-order'), soon: document.querySelectorAll('.ccfest-soon').length, order: [...document.querySelectorAll('.ccfest-card-add')].filter(a => getComputedStyle(a).display !== 'none').length, form: document.getElementById('festive-order').offsetHeight }; });
    if (on) {
      check(tag + ': order module shown right after the goodies', s.mod && s.afterMenu, s);
      check(tag + ': every card says Order, enquiry form hidden', s.order === 3 && s.soon === 0 && s.form === 0, s);
      const y0 = await p.evaluate(() => { const r = [...document.querySelectorAll('.ccfest-card-add')][1].click(); return [scrollY, document.documentElement.scrollHeight, innerHeight, Math.round(document.getElementById('cc-treat-order').getBoundingClientRect().top)]; }); await p.waitForTimeout(600); if (process.env.DBG) console.log('dbg', y0, await p.evaluate(() => { const wide = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > 392 && !e.closest('.cct-grid')).slice(0, 6).map(e => e.tagName + '.' + String(e.className).slice(0, 30) + ':' + Math.round(e.getBoundingClientRect().right)); return [document.documentElement.scrollWidth, innerWidth, wide]; }), await p.evaluate(() => [scrollY, Math.round(document.getElementById('cc-treat-order').getBoundingClientRect().top)]));
      const r = await p.evaluate(() => ({ q: window.__ccoSeasonal.treatOrder().q, top: Math.round(document.getElementById('cc-treat-order').getBoundingClientRect().top), vh: innerHeight, url: location.pathname }));
      check(tag + ': Order on Mince Pies adds one and scrolls to the module, same page', r.q.i2 === 1 && Object.keys(r.q).filter(k => r.q[k] > 0).length === 1 && r.top < r.vh / 2 && r.url === '/festive', r);
      if (SHOTS) await p.screenshot({ path: SHOTS + '/festive-page-' + t + '.png' });
    } else {
      check(tag + ': no order module, every card says Coming soon', !s.mod && s.soon === 3 && s.order === 0, s);
    }
    check(tag + ': no page errors', !errors.length, errors);
    await ctx.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
