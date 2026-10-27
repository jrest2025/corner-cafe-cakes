// Website order form: calendar open on the date step, no "Need it sooner?". Run: node test/order-tools/test_guest_inline_cal.cjs
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const repo = path.join(__dirname, '../..'), SHOTS = process.env.SHOTS || '';
const bundle = fs.readFileSync(path.join(repo, process.env.BUNDLE || 'dist/app/guest-app.0567e717fd.js'), 'utf8');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
function page() {
  const draft = { at: Date.now(), started: Date.now(), key: '11111111-2222-3333-4444-555555555555', open: 2, reached: 2, s: {
    req: false, size_note: '', reqFlav: '', flavour: 'cheesecake', variant: null, size: 8, showServes: false, finish: 'standard', design: '', photos: [], msgOpen: false, message: '', occasion: 'birthday', occOther: '', occPre: false,
    method: 'collection', zone: null, address: '', receiver: '', candOpen: false, candles: '', noteOpen: false, notes: '', diet: 'no', diets: [], dietNote: '', reqs: [], reqNote: '', reqAlg: null,
    date: null, time: null, name: '', phone: '', whatsapp: true, emailOpen: false, email: '', updates: false, detailsOk: false, know: true, sending: false, howOpen: false, dateNote: '' } };
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif;padding:24px 16px}</style></head><body><div class="cco-page"><div id="cc-cake-order"></div></div>' +
    '<script>try{localStorage.setItem("cco-draft-v2",' + JSON.stringify(JSON.stringify(draft)) + ')}catch(e){}</script>' +
    '<script>' + mock + '</script><script>window.__ccoMock={rpc:function(fn,a){if(fn==="get_order_setup")return window.__ccsMock.rpc(fn,a);return Promise.resolve({data:null})},storage:{from:function(){return{upload:function(){return Promise.resolve({data:{}})}}}}};</script>' +
    '<script>' + bundle + '</script></body></html>';
}
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await ctx.route('**/*', r => r.request().url().startsWith('https://www.cornercafefiji.com/') ? r.fulfill({ body: page(), contentType: 'text/html' }) : r.abort());
    await p.goto('https://www.cornercafefiji.com/cake-order'); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => { const host = document.querySelector('#cc-cake-order .cco-calhost'), sh = host && host.querySelector('.cco-sheet'), r = sh && sh.getBoundingClientRect();
      return { q: (document.querySelector('.cco-q') || {}).textContent, inline: !!sh, visible: !!r && r.height > 200 && getComputedStyle(host.querySelector('.cco-shade')).position === 'static', days: host ? host.querySelectorAll('.cco-day:not(:disabled):not(.cco-blank)').length : 0,
        btn: !!document.querySelector('[data-act="cal"]'), sooner: /Need it sooner/.test(document.body.innerText), note: (host && host.querySelector('.cco-cal-note') || {}).textContent, modal: sh && sh.getAttribute('aria-modal') }; });
    check(t + ' date step shows the calendar open (no button, no pop-up)', st.q === 'When do you need it?' && st.inline && st.visible && st.days > 0 && !st.btn && !st.modal, st);
    check(t + ' no "Need it sooner?" and a one-line note', !st.sooner && st.note === 'Grey days are not available.', st);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/cal-' + t + '.png', fullPage: true });
    const first = await p.evaluate(() => { const d = document.querySelector('.cco-calhost .cco-day:not(:disabled):not(.cco-blank)'); d.click(); return d.dataset.day; });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ sel: (document.querySelector('.cco-calhost .cco-day[aria-pressed="true"]') || {}).dataset, times: document.querySelectorAll('[data-act="time"]').length, still: !!document.querySelector('.cco-calhost .cco-sheet') }));
    check(t + ' tapping a day selects it, times appear, calendar stays', after.sel && after.sel.day === first && after.times > 0 && after.still, after);
    const nav = await p.evaluate(() => { const b = document.querySelector('.cco-calhost [data-nav="1"]'), m0 = document.querySelector('.cco-calhost .cco-cal-head b').textContent; b.click(); return [m0, document.querySelector('.cco-calhost .cco-cal-head b').textContent]; });
    check(t + ' next month works inline', nav[0] !== nav[1], nav);
    await p.evaluate(() => document.querySelector('[data-act="time"]').click()); await p.waitForTimeout(500);
    check(t + ' choosing a time moves on to Your details', await p.evaluate(() => (document.querySelector('.cco-q') || {}).textContent) === 'Where can we reach you?');
    await p.evaluate(() => document.querySelector('.cco-back').click()); await p.waitForTimeout(500);
    const back = await p.evaluate(() => ({ sel: (document.querySelector('.cco-calhost .cco-day[aria-pressed="true"]') || {}).dataset }));
    check(t + ' going back shows the calendar with the day still chosen', back.sel && back.sel.day === first, back);
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Escape');
    check(t + ' Escape does not hide the calendar', await p.evaluate(() => document.querySelector('.cco-calhost .cco-sheet').getBoundingClientRect().height > 200));
    check(t + ' no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check(t + ' no page errors', !errors.length, errors);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/cal-' + t + '-picked.png', fullPage: true });
    await ctx.close();
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
