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
    (o.trej ? '<script>window.__trej=1</script>' : '') + (o.nodraft ? '' : '<script>try{localStorage.setItem("cco-draft-v2",' + JSON.stringify(JSON.stringify(draft)) + ')}catch(e){}</script>') +
    '<script>' + mock + '</script><script>window.__sent=[];window.__ccoMock={rpc:function(fn,a){if(fn==="get_order_setup")return window.__ccsMock.rpc(fn,a);if(fn==="get_seasonal_menu"){window.__menuAsked=a;return Promise.resolve({data:' + JSON.stringify(menu) + '})}' +
    'if(fn==="submit_treat_order"){window.__tsent=(window.__tsent||[]).concat([a.p]);return Promise.resolve({data:window.__trej&&window.__tsent.length===1?{ok:false,error:"phone",field:"phone",message:"Enter a mobile number, for example 912 3456."}:{ok:true,reference:"T-1001",total:82,id:"x"}})}if(fn==="submit_online_order"){window.__sent.push(a.p);' + (o.reject ? 'if(window.__sent.length===1)return Promise.resolve({data:{ok:false,error:"treats",field:"treats",message:"Gingerbread House is sold out for ' + 'that day."}});' : '') + 'return Promise.resolve({data:{ok:true,reference:"CC-1201",status:"awaiting_review",estimate:154}})}return Promise.resolve({data:null})},storage:{from:function(){return{upload:function(){return Promise.resolve({data:{}})}}}}};</script>' +
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
  // treats on their own: the separate module above the cake form
  for (const [w, h, t] of [[1366, 900, 'desktop'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx, errors } = await go(b, w, h, { nodraft: true });
    const m = await p.evaluate(() => { const s = document.getElementById('cc-treat-order'), f = document.getElementById('cc-cake-order'); if (!s) return null; return { shown: !s.hidden, h: s.querySelector('h2').textContent, cards: s.querySelectorAll('.cct-card').length, above: !!(s.compareDocumentPosition(f) & 4), outside: !f.contains(s), oldPanel: !!document.querySelector('.cco-trh') }; });
    check(t + ' module above the cake form, outside it', m && m.shown && m.h === 'Festive treats' && m.cards === 4 && m.above && m.outside, m);
    check(t + ' old first-screen panel gone', m && !m.oldPanel, m);
    const addH = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.cct-add')].map(x => x.getBoundingClientRect().height)));
    check(t + ' Add buttons at least 48px (' + Math.round(addH) + ')', addH >= 48, addH);
    await tap(p, '.cct-add[data-cct-plus="i1"]'); await tap(p, '.cct-add[data-cct-plus="i2"]'); await tap(p, '[data-cct-plus="i2"]');
    const bar = await p.evaluate(() => (document.querySelector('.cct-bar') || {}).textContent || '');
    check(t + ' bar shows 3 treats and $59', /3 treats · \$59/.test(bar), bar);
    await tap(p, '[data-cct="go2"]', 500);
    const dd = await p.evaluate(() => [...document.querySelectorAll('.cct-days .cct-chip')].map(x => x.getAttribute('data-cct-day')));
    check(t + ' step 2: pickup days start after 2 days notice', dd.length >= 5 && dd[0] === new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + 2 * 864e5)), dd);
    check(t + ' step 2: treats hidden, recap shown', await p.evaluate(() => !document.querySelector('.cct-grid') && /3 treats · \$59/.test(document.querySelector('.cct-recap').textContent)));
    check(t + ' step 2: calendar behind More days', await p.evaluate(() => !document.querySelector('[data-cct-k="dayin"]') && !!document.querySelector('[data-cct="moredays"]')));
    await tap(p, '[data-cct="go3"]', 300);
    check(t + ' asks for the day first', await p.evaluate(() => /Choose a pickup day/.test(document.getElementById('cc-treat-order').textContent)));
    await tap(p, '.cct-days .cct-chip:nth-child(2)', 300);
    const tm = await p.evaluate(() => [...document.querySelectorAll('.cct-times .cct-chip')].map(x => x.textContent));
    check(t + ' times in 12-hour format from collection hours', tm[0] === '9:00 AM' && tm.includes('12:00 PM') && tm[tm.length - 1] === '8:00 PM', tm);
    await tap(p, '.cct-times [data-cct-time="660"]', 300);
    const ch = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.cct-chip')].map(x => x.getBoundingClientRect().height)));
    check(t + ' day and time chips at least 48px', ch >= 48, ch);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '-treats2.png', fullPage: true });
    await tap(p, '[data-cct="go3"]', 400);
    check(t + ' step 3: note behind Add a note', await p.evaluate(() => !document.querySelector('[data-cct-k="note"]') && !!document.querySelector('[data-cct="note"]')));
    await p.fill('[data-cct-k="name"]', 'Mere Tui'); await p.fill('[data-cct-k="phone"]', '912 3456');
    await tap(p, '[data-cct="note"]', 300); await p.fill('[data-cct-k="note"]', 'Gift wrap');
    const s3 = await p.evaluate(() => ({ recap: document.querySelector('.cct-recap').textContent, sum: document.querySelector('.cct-sum').textContent }));
    check(t + ' step 3: summary with day, time and total', /11:00 AM/.test(s3.recap) && /Total\$59/.test(s3.sum), s3);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '-treats.png', fullPage: true });
    check(t + ' no horizontal scroll with the module', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    await tap(p, '[data-cct="send"]', 800);
    const ts = await p.evaluate(() => window.__tsent || []);
    check(t + ' treat request sent with day, time, name, mobile, note and a resend key', ts.length === 1 && ts[0].time === '11:00' && ts[0].name === 'Mere Tui' && ts[0].phone === '912 3456' && ts[0].note === 'Gift wrap' && /^[0-9a-f-]{36}$/.test(ts[0].idempotency_key) && JSON.stringify(ts[0].treats) === '[{"id":"i1","quantity":1},{"id":"i2","quantity":2}]', ts);
    const dn = await p.evaluate(() => (document.querySelector('.cct-done') || {}).textContent || '');
    check(t + ' warm thank-you with the reference and 11:00 AM', /T-1001/.test(dn) && /Vinaka, Mere!/.test(dn) && /11:00 AM/.test(dn), dn);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/web-' + t + '-treats-done.png' });
    check(t + ' cake form untouched (no cake request sent)', await p.evaluate(() => window.__sent.length === 0));
    check(t + ' no page errors', !errors.length, errors);
    await ctx.close();
  }
  // database refusal is shown on the right field; resend uses the same key
  { const { p, ctx } = await go(b, 1366, 900, { nodraft: true, trej: true });
    await tap(p, '.cct-add[data-cct-plus="i1"]'); await tap(p, '[data-cct="go2"]', 400); await tap(p, '.cct-days .cct-chip', 300); await tap(p, '.cct-times .cct-chip', 300); await tap(p, '[data-cct="go3"]', 300);
    await p.fill('[data-cct-k="name"]', 'Mere Tui'); await p.fill('[data-cct-k="phone"]', '9123456'); await tap(p, '[data-cct="send"]', 800);
    const e1 = await p.evaluate(() => ({ err: (document.querySelector('#cct-e-phone') || {}).textContent, focus: document.activeElement.getAttribute('data-cct-k') }));
    check('refusal shown under the mobile number, focused', /mobile number/.test(e1.err || '') && e1.focus === 'phone', e1);
    await tap(p, '[data-cct="send"]', 800);
    const ks = await p.evaluate(() => window.__tsent.map(x => x.idempotency_key));
    check('second try uses the same key (no double order)', ks.length === 2 && ks[0] === ks[1], ks);
    await ctx.close(); }
  // form left midway: picks, day and details come back after a reload
  { const { p, ctx } = await go(b, 820, 1180, { nodraft: true });
    await tap(p, '.cct-add[data-cct-plus="i2"]'); await tap(p, '[data-cct="go2"]', 400); await tap(p, '.cct-days .cct-chip', 300); await tap(p, '.cct-times .cct-chip', 300); await tap(p, '[data-cct="go3"]', 300); await p.fill('[data-cct-k="name"]', 'Ana');
    await p.reload(); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ step3: !!document.querySelector('[data-cct-k="name"]'), recap: (document.querySelector('.cct-recap') || {}).textContent, name: (document.querySelector('[data-cct-k="name"]') || {}).value }));
    check('resume after reload at the same step', r.step3 && /1 treat · \$12/.test(r.recap) && r.name === 'Ana', r);
    await ctx.close(); }
  // nothing on sale: the form is exactly as before
  { const { p, ctx } = await go(b, 1366, 900, { empty: true });
    check('nothing on sale: no treats section', await p.evaluate(() => !document.querySelector('.cco-tr')));
    check('nothing on sale: treats module hidden', await p.evaluate(() => { const s = document.getElementById('cc-treat-order'); return !s || s.hidden; }));
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
