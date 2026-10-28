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
      check(tag + ': every card has Add, enquiry form hidden', s.order === 3 && s.soon === 0 && s.form === 0, s);
      const g = await p.evaluate(() => document.querySelectorAll('#festive-menu .ccfest-card-add').length);
      await p.click('#festive-menu .w-dyn-item:nth-child(2) .ccfest-card-add');
      await p.click('#festive-menu .w-dyn-item:nth-child(2) .ccfest-qty [data-q="1"]');
      const r = await p.evaluate(() => ({ q: window.__ccoSeasonal.treatOrder().q, out: document.querySelector('#festive-menu .w-dyn-item:nth-child(2) .ccfest-qty output').textContent, grid: !!document.querySelector('#cc-treat-order .cct-grid'), lines: document.querySelectorAll('#cc-treat-order .cct-lines li:not(.cct-tot)').length, wf: !!document.querySelector('#cc-treat-order .ccfest-btn.ccfest-btn-primary') && !!document.querySelector('#cc-treat-order .ccfest-h2'), url: location.pathname, bar: document.querySelector('.ccfest-bar') && !document.querySelector('.ccfest-bar').hidden }));
      check(tag + ': Add then + on Mince Pies makes 2, shown on the card and once in the order box (no second photo grid)', r.q.i2 === 2 && r.out === '2' && !r.grid && r.lines === 1 && r.url === '/festive', r);
      await p.evaluate(() => { document.querySelector('main').insertAdjacentHTML('afterbegin', '<div style="height:1400px"></div>'); scrollTo(0, 0); }); await p.waitForTimeout(250);
      const bar = await p.evaluate(() => { const b = document.querySelector('.ccfest-bar'); return b && !b.hidden && b.textContent; });
      await p.evaluate(() => document.getElementById('cc-treat-order').scrollIntoView()); await p.waitForTimeout(250);
      const bar2 = await p.evaluate(() => document.querySelector('.ccfest-bar').hidden);
      check(tag + ': order box uses the page Webflow classes; "2 goodies" bar shows only while the box is off screen', r.wf && /2 goodies/.test(bar || '') && bar2, [r.wf, bar, bar2]);
      await p.click('#cc-treat-order [data-cct="go2"]'); await p.click('#cc-treat-order .cct-days button'); await p.click('#cc-treat-order .cct-times button'); await p.click('#cc-treat-order [data-cct="go3"]');
      await p.fill('#cc-treat-order [data-cct-k="name"]', 'Test Guest'); await p.fill('#cc-treat-order [data-cct-k="phone"]', '9123456'); await p.click('#cc-treat-order [data-cct="send"]'); await p.waitForTimeout(300);
      const d = await p.evaluate(() => ({ sent: window.__tsent, done: !!document.querySelector('.cct-done'), cards: [...document.querySelectorAll('.ccfest-qty')].filter(q => !q.hidden).length }));
      check(tag + ': sends 2 x Mince Pies, thank-you shows, cards back to Add', d.done && d.sent && d.sent[0].treats.length === 1 && d.sent[0].treats[0].quantity === 2 && d.cards === 0, d);
      // corporate: Start a corporate order, add 25 cookies, company + invoice needs email, delivery needs address
      await p.click('#cc-treat-order [data-cct="again"]');
      const corp = await p.evaluate(() => ({ panel: !!document.querySelector('#corporate .ccfest-h2'), btn: getComputedStyle(document.querySelector('.ccfest-corp-go')).display !== 'none' }));
      await p.click('.ccfest-corp-go');
      for (let k = 0; k < 25; k++) await p.evaluate(() => window.__ccoSeasonal.set('Festive Cookies', (window.__ccoSeasonal.info('Festive Cookies').q || 0) + 1));
      const s1 = await p.evaluate(() => ({ line: (document.querySelector('#cc-treat-order .cct-bulkline') || {}).textContent || '', q: window.__ccoSeasonal.info('Festive Cookies').q }));
      await p.click('#cc-treat-order [data-cct="go2"]'); await p.click('#cc-treat-order .cct-days button'); await p.click('#cc-treat-order .cct-times button'); await p.click('#cc-treat-order [data-cct="go3"]');
      await p.fill('#cc-treat-order [data-cct-k="name"]', 'Asha Lal'); await p.fill('#cc-treat-order [data-cct-k="phone"]', '9123456');
      await p.click('#cc-treat-order [data-cct-pay="invoice"]'); await p.click('#cc-treat-order [data-cct-ful="delivery"]');
      await p.click('#cc-treat-order [data-cct="send"]'); await p.waitForTimeout(150);
      const e1 = await p.evaluate(() => (document.querySelector('#cct-e-company') || {}).textContent || '');
      await p.fill('#cc-treat-order [data-cct-k="company"]', 'Pacific Tours Ltd'); await p.click('#cc-treat-order [data-cct="send"]'); await p.waitForTimeout(150);
      const e2 = await p.evaluate(() => (document.querySelector('#cct-e-email') || {}).textContent || '');
      await p.fill('#cc-treat-order [data-cct-k="email"]', 'office@pacifictours.com.fj'); await p.click('#cc-treat-order [data-cct="send"]'); await p.waitForTimeout(150);
      const e3 = await p.evaluate(() => (document.querySelector('#cct-e-addr') || {}).textContent || '');
      await p.fill('#cc-treat-order [data-cct-k="addr"]', 'Lot 4, Queens Road, Nadi'); await p.click('#cc-treat-order [data-cct="send"]'); await p.waitForTimeout(300);
      const d2 = await p.evaluate(() => ({ sent: window.__tsent[window.__tsent.length - 1], done: (document.querySelector('.cct-done') || {}).textContent || '' }));
      check(tag + ': corporate panel and Start button show; 25 goodies flagged as bulk', corp.panel && corp.btn && s1.q === 25 && /bulk/i.test(s1.line), [corp, s1]);
      check(tag + ': bulk asks for company, invoice email, delivery address', /company/i.test(e1) && /email/i.test(e2) && /address/i.test(e3), [e1, e2, e3]);
      const P = d2.sent || {};
      check(tag + ': bulk request sent with business details; thank-you says quote', P.business === true && P.company === 'Pacific Tours Ltd' && P.pay === 'invoice' && P.fulfilment === 'delivery' && /Queens Road/.test(P.address) && P.treats[0].quantity === 25 && /quote/i.test(d2.done) && /Pacific Tours/.test(d2.done), P);
      if (SHOTS) await p.screenshot({ path: SHOTS + '/festive-page-' + t + '.png' });
    } else {
      check(tag + ': no order module, every card says Coming soon', !s.mod && s.soon === 3 && s.order === 0, s);
    }
    check(tag + ': no page errors', !errors.length, errors);
    await ctx.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
