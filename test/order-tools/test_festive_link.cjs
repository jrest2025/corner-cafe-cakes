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
async function go(b, w, h, url, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/*', r => r.request().url().startsWith('https://www.cornercafefiji.com/') ? r.fulfill({ body: page(o), contentType: 'text/html' }) : r.abort());
  await p.goto(url); await p.waitForTimeout(1800);
  return { p, ctx, errors };
}
// 28 Oct 2026: links from the festive page add that treat and open the festive treats section.
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [390, 844, 'phone']]) {
    let { p, ctx, errors } = await go(b, w, h, 'https://www.cornercafefiji.com/order-cake?treat=Mince%20Pies#cc-treat-order', { nodraft: true });
    const r = await p.evaluate(() => { const s = document.getElementById('cc-treat-order'); const q = window.__ccoSeasonal && window.__ccoSeasonal.treatOrder(); return { shown: !!s && !s.hidden, top: s ? Math.round(s.getBoundingClientRect().top) : null, q: q && q.q, text: s ? s.innerText.replace(/\s+/g, ' ').slice(0, 200) : '' }; });
    check(t + ' festive link: section shown and scrolled into view', r.shown && r.top !== null && r.top < 200 && r.top > -50, r);
    check(t + ' festive link: Mince Pies already added once', r.q && r.q.i2 === 1 && Object.keys(r.q).filter(k => r.q[k] > 0).length === 1, r.q);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/festive-link-' + t + '.png' });
    await p.reload(); await p.waitForTimeout(1800);
    const r2 = await p.evaluate(() => window.__ccoSeasonal.treatOrder().q);
    check(t + ' reload does not add a second one', r2.i2 === 1, r2);
    check(t + ' no page errors', !errors.length, errors);
    await ctx.close();
    ({ p, ctx, errors } = await go(b, w, h, 'https://www.cornercafefiji.com/order-cake', {}));
    const cf = await p.evaluate(() => ({ review: document.getElementById('cc-cake-order').classList.contains('cco-at-review'), addon: !!document.querySelector('#cc-cake-order .cco-tr'), sub: (document.querySelector('#cc-treat-order .cct-sub') || {}).textContent }));
    check(t + ' cake form last step: no treats on the cake order (specials stay separate)', cf.review && !cf.addon, cf);
    check(t + ' Festive treats section says it is a separate order', /separate order/.test(cf.sub || ''), cf.sub);
    await ctx.close();
    ({ p, ctx, errors } = await go(b, w, h, 'https://www.cornercafefiji.com/order-cake', { nodraft: true }));
    const r3 = await p.evaluate(() => ({ q: window.__ccoSeasonal.treatOrder().q, y: scrollY }));
    check(t + ' plain visit: nothing added, page not scrolled', Object.keys(r3.q).length === 0 && r3.y === 0, r3);
    await ctx.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
