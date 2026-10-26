// Website cake order form with seasonal treats: live form bundle (from git), the add-on from src, mock database.
// Run: node test/order-tools/test_guest_seasonal.cjs
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const repo = '/home/claude/corner-cafe-cakes', SHOTS = process.env.SHOTS || '';
const bundle = execFileSync('git', ['-C', repo, 'show', '72fcd30e8cab5297f6ba29c0258301fadf9d6d1a:dist/app/guest-app.cae549ce29.js'], { maxBuffer: 1e8 }).toString();
const addon = fs.readFileSync(path.join(repo, 'src/guest.seasonal.js'), 'utf8');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const D10 = fiji(10), D1 = fiji(1);
function page(o) {
  const menu = { ok: true, today: fiji(0), groups: o.empty ? [] : [{ id: 'g1', name: 'Festive treats', message: 'A little festive joy, made to share.', payment: 'pickup', items: [
    { id: 'i1', name: 'Gingerbread House', detail: '15cm (H) × 13cm (W) × 20cm (L)', price: 35, lead_days: 2, sold_out: [], blocked: [] },
    { id: 'i2', name: 'Mince Pies', detail: 'Pack of 3', price: 12, lead_days: 2, max: 5, sold_out: [], blocked: [] },
    { id: 'i3', name: 'White Chocolate House', detail: '11cm (H) × 7cm (W) × 9cm (L)', price: 35, lead_days: 2, sold_out: [D10], blocked: [] },
    { id: 'i4', name: 'Rich Festive Fruit Cake', detail: '6 inch', price: 46, lead_days: 14, sold_out: [], blocked: [] }] }] };
  const draft = { at: Date.now(), started: Date.now(), key: '11111111-2222-3333-4444-555555555555', open: 4, reached: 4, s: {
    req: false, size_note: '', reqFlav: '', flavour: 'cheesecake', variant: null, size: 8, showServes: false, finish: 'standard', design: '', photos: [], msgOpen: false, message: '', occasion: 'birthday', occOther: '', occPre: false,
    method: 'collection', zone: null, address: '', receiver: '', candOpen: false, candles: '', noteOpen: false, notes: '', diet: 'no', diets: [], dietNote: '', reqs: [], reqNote: '', reqAlg: null,
    date: o.date || D10, time: '12:00', name: 'Ana Guest', phone: '912 3456', whatsapp: true, emailOpen: false, email: '', updates: false, detailsOk: true, know: true, sending: false, howOpen: false, dateNote: '' } };
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif;padding:24px 16px}</style></head><body><div class="cco-page"><div id="cc-cake-order"></div></div>' +
    (o.nodraft ? '' : '<script>try{localStorage.setItem("cco-draft-v2",' + JSON.stringify(JSON.stringify(draft)) + ')}catch(e){}</script>') +
    '<script>' + mock + '</script><script>window.__sent=[];window.__ccoMock={rpc:function(fn,a){if(fn==="get_order_setup")return window.__ccsMock.rpc(fn,a);if(fn==="get_seasonal_menu"){window.__menuAsked=a;return Promise.resolve({data:' + JSON.stringify(menu) + '})}' +
    'if(fn==="submit_online_order"){window.__sent.push(a.p);' + (o.reject ? 'if(window.__sent.length===1)return Promise.resolve({data:{ok:false,error:"treats",field:"treats",message:"Gingerbread House is sold out for ' + 'that day."}});' : '') + 'return Promise.resolve({data:{ok:true,reference:"CC-1201",status:"awaiting_review",estimate:154}})}return Promise.resolve({data:null})},storage:{from:function(){return{upload:function(){return Promise.resolve({data:{}})}}}}};</script>' +
    '<script>' + addon + '</script><script>' + bundle + '</script></body></html>';
}
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
async function go(b, w, h, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [], logs = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') logs.push(m.text()); });
  await ctx.route('**/*', r => r.request().url().startsWith('https://www.cornercafefiji.com/') ? r.fulfill({ body: page(o), contentType: 'text/html' }) : r.abort());
  await p.goto('https://www.cornercafefiji.com/cake-order'); await p.waitForTimeout(1500);
  return { p, ctx, errors, logs };
}
const tap = async (p, s, wait) => { await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, s); await p.waitForTimeout(wait || 300); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors, logs } = await go(b, w, h);
    check(t + ' form opened at the last step', await p.evaluate(() => document.getElementById('cc-cake-order').classList.contains('cco-at-review')), await p.evaluate(() => document.getElementById('cc-cake-order').innerText.slice(0, 200)));
    check(t + ' asks the website menu (never the counter one)', await p.evaluate(() => window.__menuAsked && window.__menuAsked.p_channel === 'website'));
    const sec = await p.evaluate(() => { const s = document.querySelector('#cc-cake-order .cco-tr'); if (!s) return null; const send = document.querySelector('[data-act="send"]'); return { h: s.querySelector('h3').textContent, names: [...s.querySelectorAll('.cco-tr-tx b')].map(x => x.textContent), why: [...s.querySelectorAll('.cco-tr-tx em')].map(x => x.textContent), beforeSend: !!(s.compareDocumentPosition(send) & 4) }; });
    check(t + ' treats shown on the last step, above Send', sec && sec.h === 'Add festive treats' && sec.names.length === 4 && sec.beforeSend, sec);
    check(t + ' sold out and too-soon items say why', sec && sec.why.indexOf('Sold out for your pickup day') > -1 && sec.why.some(x => /14 days' notice/.test(x)), sec);
    const bh = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.cco-tr-st button')].map(x => x.getBoundingClientRect().height)));
    check(t + ' plus and minus are 48px (' + Math.round(bh) + ')', bh >= 48, bh);
    await tap(p, '[data-cco-tr-plus="i1"]'); await tap(p, '[data-cco-tr-plus="i2"]'); await tap(p, '[data-cco-tr-plus="i2"]'); await tap(p, '[data-cco-tr-plus="i3"]');
    const sum = await p.evaluate(() => [...document.querySelectorAll('.cco-tr-sum')].map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    check(t + ' treats total and total with the cake', sum.some(x => /Treats added ?\$59/.test(x)) && sum.some(x => /Total with treats ?\$154/.test(x)), sum);
    for (let i = 0; i < 6; i++) await tap(p, '[data-cco-tr-plus="i2"]', 80);
    check(t + ' most per order respected (5)', await p.evaluate(() => document.querySelector('[data-cco-tr-plus="i2"]').parentNode.querySelector('output').textContent === '5'));
    for (let i = 0; i < 3; i++) await tap(p, '[data-cco-tr-minus="i2"]', 80);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '.png', fullPage: true });
    await tap(p, '[data-act="send"]', 1500);
    const sent = await p.evaluate(() => window.__sent);
    check(t + ' treats sent with the cake request', sent.length === 1 && JSON.stringify(sent[0].treats) === '[{"id":"i1","quantity":1},{"id":"i2","quantity":2}]' && sent[0].product_code === 'cheesecake', sent.map(s => s.treats));
    const dn = await p.evaluate(() => (document.querySelector('.cco-done .cco-tr-done') || {}).textContent || '');
    check(t + ' thank-you screen lists the treats', /Also on your request: 1 × Gingerbread House, 2 × Mince Pies \(\$59\)/.test(dn), dn);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '-done.png', fullPage: true });
    check(t + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check(t + ' no page errors or add-on warnings', !errors.length && !logs.filter(x => /Seasonal treats/.test(x)).length, errors.concat(logs));
    await ctx.close();
  }
  // first screen: treats up front, carried to the last step
  for (const [w, h, t] of [[1366, 900, 'desktop'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    const o = { nodraft: true };
    const { p, ctx, errors } = await go(b, w, h, o);
    const hero = await p.evaluate(() => { const s = document.querySelector('#cco-step-0.cco-open .cco-trh'); if (!s) return null; const cakes = document.querySelector('#cco-step-0 .cco-cakes'); return { h: s.querySelector('h3').textContent, cards: s.querySelectorAll('.cco-trh-card').length, imgs: s.querySelectorAll('img.cco-trh-ph').length, alone: s.querySelector('.cco-trh-alone').textContent, wa: s.querySelector('.cco-trh-alone a').href, before: cakes ? !!(s.compareDocumentPosition(cakes) & 4) : null }; });
    check(t + ' first screen shows Festive treats above the cakes', hero && hero.h === 'Festive treats' && hero.cards === 4 && hero.before === true, hero);
    check(t + ' treats-without-a-cake line with WhatsApp and phone', hero && /Want treats without a cake\?/.test(hero.alone) && /wa\.me\/679/.test(hero.wa), hero);
    const addH = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.cco-trh-add')].map(x => x.getBoundingClientRect().height)));
    check(t + ' Add buttons are 48px (' + Math.round(addH) + ')', addH >= 48, addH);
    await tap(p, '.cco-trh [data-cco-tr-plus="i1"]', 400); await tap(p, '.cco-trh [data-cco-tr-plus="i2"]', 300); await tap(p, '.cco-trh [data-cco-tr-plus="i2"]', 300);
    const sum = await p.evaluate(() => (document.querySelector('.cco-trh-sum') || {}).textContent || '');
    check(t + ' first screen confirms what was added', /3 treats added · \$59/.test(sum), sum);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '-first.png' });
    check(t + ' no horizontal scroll on the first screen', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    // the customer finishes the cake steps (simulated by the saved form), then reaches the last step
    o.nodraft = false; await p.reload(); await p.waitForTimeout(1500);
    const rv = await p.evaluate(() => [...document.querySelectorAll('.cco-tr .cco-tr-st output')].map(x => x.textContent));
    check(t + ' picks carried to the last step', JSON.stringify(rv) === JSON.stringify(['1', '2', '0', '0']), rv);
    check(t + ' first-screen panel not repeated on the last step', await p.evaluate(() => !document.querySelector('.cco-trh')));
    check(t + ' no page errors', !errors.length, errors);
    await ctx.close();
  }
  // nothing on sale: the form is exactly as before
  { const { p, ctx } = await go(b, 1366, 900, { empty: true });
    check('nothing on sale: no treats section', await p.evaluate(() => !document.querySelector('.cco-tr')));
    await tap(p, '[data-act="send"]', 1200);
    check('nothing on sale: request sent without treats', await p.evaluate(() => window.__sent.length === 1 && !('treats' in window.__sent[0])));
    await ctx.close(); }
  // database refuses (sold out in the meantime): message shown, customer can change and send again
  { const { p, ctx } = await go(b, 1366, 900, { reject: true });
    await tap(p, '[data-cco-tr-plus="i1"]'); await tap(p, '[data-act="send"]', 1200);
    const msg = await p.evaluate(() => (document.querySelector('#cc-cake-order .cco-formerr') || {}).textContent || '');
    check('sold out meanwhile: the database message is shown, nothing saved', /sold out/.test(msg), msg);
    check('treats section still there to change', await p.evaluate(() => !!document.querySelector('.cco-tr') && document.querySelector('[data-cco-tr-plus="i1"]').parentNode.querySelector('output').textContent === '1'));
    await tap(p, '[data-cco-tr-minus="i1"]'); await tap(p, '[data-act="send"]', 1200);
    check('sent again without the treat', await p.evaluate(() => window.__sent.length === 2 && !('treats' in window.__sent[1])));
    await ctx.close(); }
  // pickup day too soon for the treats: they cannot be added
  { const { p, ctx } = await go(b, 1366, 900, { date: D1 });
    check('pickup tomorrow: every treat needs more notice', await p.evaluate(() => [...document.querySelectorAll('[data-cco-tr-plus]')].every(x => x.disabled)));
    await ctx.close(); }
  await b.close();
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
