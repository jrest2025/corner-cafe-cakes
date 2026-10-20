// Corner Café Birthday Club on the website cake order form (20 October 2026). The live /order-cake head and body
// (test/fixtures/order-head.html, order-body.html, order-footer.html: copied from the live page on 20 October), with the
// order form loader pointed at the local build from MANIFEST (default dist/app/guest-birthday-club-manifest.json).
// Invented data only. Checks: one optional tick box, unticked; the birthday only once ticked; Continue waits for it;
// the order is sent exactly as before; then joining; the thank-you page; failures; phones.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const m = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/guest-birthday-club-manifest.json'), 'utf8'));
const WORDING = 'Join our Birthday Club. We’ll call or WhatsApp you in the week before your birthday with a free cupcake offer.';   // birthday-club-online-v1
let foot = fs.readFileSync(path.join(repo, 'test/fixtures/order-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>\n?/, '');
const LOADER = /@78db316465cfdf7426309afda27bb862f7cce9e1\/dist\/app\/guest-app\.51ed2b5408\.js",(h=\[[^\]]*\]),k="[^"]+"/;
if (!LOADER.test(foot)) throw new Error('The order page footer fixture is not the live footer');
foot = foot.replace(LOADER, (x, h) => '@' + '0'.repeat(40) + '/' + m.file + '",' + h + ',k="' + m.sri + '"');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 600) : '')); } }

async function open(b, w, h, pre) {
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + fs.readFileSync(path.join(repo, 'test/fixtures/order-head.html'), 'utf8') +
    '<script>' + mock + ';window.__gcalls=[];window.__ccoMock={rpc:function(fn,args){window.__gcalls.push([fn,args]);' +
    'if(fn==="get_order_setup")return window.__ccsMock.rpc(fn,args);' +
    'if(fn==="submit_online_order")return Promise.resolve({data:{ok:true,order_id:"o-web-1",reference:"CC-1100",status:"awaiting_review"}});' +
    'if(fn==="birthday_club_join_online"){if(window.__joinFail)return Promise.resolve({error:{message:"Failed to fetch"}});return Promise.resolve({data:window.__joinAlready?{ok:true,already:true}:{ok:true}})}' +
    'return Promise.resolve({data:null})},storage:{from:function(){return{upload:function(){return Promise.resolve({data:{}})}}}}};' + (pre || '') + '</script></head><body style="margin:0">' +
    fs.readFileSync(path.join(repo, 'test/fixtures/order-body.html'), 'utf8') + foot + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const mm = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/);
    if (mm) {
      const hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(mm[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, mm[2])), contentType: 'application/javascript', headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', mm[1] + ':' + mm[2]], { maxBuffer: 1e8 }), contentType: 'application/javascript', headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/order-cake');
  await p.waitForTimeout(1200);
  return { ctx, p, errors };
}
const click = async (p, s, w) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, s); await p.waitForTimeout(w || 350); return ok; };
async function toDetails(p) {
  await click(p, '#cc-cake-order [data-act="flavour"][data-v="cheesecake"]'); await click(p, '#cc-cake-order [data-act="size"][data-v="8"]', 600);
  await click(p, '#cc-cake-order [data-act="finish"][data-v="standard"]', 450); await click(p, '#cc-cake-order [data-act="diet"][data-v="no"]'); await click(p, '#cc-cake-order [data-act="next2"]', 600);
  await click(p, '#cc-cake-order [data-act="method"][data-v="collection"]', 400); await click(p, '[data-act="cal"]', 500);
  await p.evaluate(() => { const d = [...document.querySelectorAll('[data-day]')].filter(e => !e.disabled); d[2].click(); }); await p.waitForTimeout(600);
  await click(p, '#cc-cake-order [data-act="time"][data-v="15:00"]', 600);
  await p.fill('#cco-name', 'Invented Guest'); await p.fill('#cco-phone', '912 3456'); await click(p, '#cc-cake-order [data-act="occasion"][data-v="birthday"]');
}
const state = p => p.evaluate(() => {
  const b = document.querySelector('#cc-cake-order [data-bcg-box]'); if (!b) return null;
  const c = b.querySelector('[data-bcg="on"]'), sel = [...b.querySelectorAll('select')];
  return { text: (b.querySelector('.cco-bc-check span') || {}).textContent, on: c.checked, selects: sel.map(s => s.id), err: (b.querySelector('.cco-err') || {}).textContent || '',
    q: (document.querySelector('#cc-cake-order .cco-step.cco-open .cco-q') || {}).textContent, tall: sel.every(s => s.getBoundingClientRect().height >= 44), focus: document.activeElement && document.activeElement.id,
    after: b.previousElementSibling && b.previousElementSibling.textContent.indexOf('Send me Corner Café cake specials') > -1, wide: document.documentElement.scrollWidth <= window.innerWidth + 1 };
});
const calls = (p, fn) => p.evaluate(fn => window.__gcalls.filter(c => c[0] === fn).map(c => c[1]), fn);
const done = p => p.evaluate(() => { const d = document.querySelector('#cc-cake-order .cco-done'); return d ? { ref: (d.querySelector('.cco-refbox-v') || {}).textContent, note: (d.querySelector('.cco-bc-note') || {}).textContent || '' } : null; });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const SHOTS = process.env.SHOTS;
  try {
    for (const [w, h, label] of [[1280, 900, 'computer'], [390, 844, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h);
      await toDetails(p);
      let s = await state(p);
      check(label + ': Your details ends with the Birthday Club tick box, unticked, with the agreed words', s && s.q === 'Where can we reach you?' && s.text === WORDING && !s.on && s.selects.length === 0 && s.after, s);
      await p.click('#cc-cake-order [data-bcg="on"]'); await p.waitForTimeout(300);
      s = await state(p);
      check(label + ': ticking it asks for the day and month only', s.on && s.selects.join() === 'cco-bc-day,cco-bc-month' && s.tall && s.focus !== 'cco-bc-day' && s.wide, s);
      if (SHOTS) { await p.evaluate(() => document.querySelector('.cco-bc').scrollIntoView({ block: 'center' })); await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, 'website-' + label + '.png') }); }
      await click(p, '#cc-cake-order [data-act="toReview"]', 500);
      s = await state(p);
      check(label + ': Continue waits for the birthday and says why', s && s.q === 'Where can we reach you?' && s.err === 'Choose your birthday, or untick the Birthday Club.' && s.focus === 'cco-bc-day', s);
      await p.selectOption('#cco-bc-day', '23'); await p.waitForTimeout(150);
      s = await state(p);
      check(label + ': the message stays until the month is chosen too', s.err !== '', s);
      await p.selectOption('#cco-bc-month', '10'); await p.waitForTimeout(250);
      s = await state(p);
      check(label + ': choosing both clears it', s.err === '' && s.on, s);
      await click(p, '#cc-cake-order [data-act="toReview"]', 700);
      check(label + ': then on to the review', (await p.evaluate(() => (document.querySelector('#cc-cake-order .cco-step.cco-open .cco-q') || {}).textContent)) === 'Check your order');
      await click(p, '#cc-cake-order [data-act="send"]', 1200);
      const sent = await calls(p, 'submit_online_order'), joined = await calls(p, 'birthday_club_join_online');
      check(label + ': the order is sent once, exactly as before (nothing about the club in it)', sent.length === 1 && Object.keys(sent[0].p).join() === 'idempotency_key,location,product_code,variant,size_inch,size_note,finish,design,message,occasion,candles,notes,has_dietary,dietary,dietary_note,requirements,requirements_note,date,time,attachments,customer,campaign,referral,delivery' &&
        Object.keys(sent[0].p.customer).join() === 'name,phone,email,whatsapp,opt_in', sent[0] && [Object.keys(sent[0].p), Object.keys(sent[0].p.customer)]);
      check(label + ': then they join, with the order and their birthday', joined.length === 1 && joined[0].p_order === 'o-web-1' && joined[0].p_day === 23 && joined[0].p_month === 10, joined);
      const d = await done(p);
      check(label + ': the thank-you page says so', d && d.ref === 'CC-1100' && d.note === 'Welcome to our Birthday Club. We’ll call or WhatsApp you in the week before your birthday, 23 October.', d);
      if (SHOTS) { await p.evaluate(() => document.querySelector('.cco-bc-note').scrollIntoView({ block: 'center' })); await p.waitForTimeout(250); await p.screenshot({ path: path.join(SHOTS, 'website-thanks-' + label + '.png') }); }
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1280, 900);
      await toDetails(p); await p.click('#cc-cake-order [data-bcg="on"]'); await p.waitForTimeout(250); await p.click('#cc-cake-order [data-bcg="on"]'); await p.waitForTimeout(250);
      const s = await state(p);
      check('untick: the birthday question goes away', !s.on && s.selects.length === 0 && s.focus === null || (!s.on && s.selects.length === 0), s);
      await click(p, '#cc-cake-order [data-act="toReview"]', 700); await click(p, '#cc-cake-order [data-act="send"]', 1200);
      check('not ticked: the order is sent and nobody joins', (await calls(p, 'submit_online_order')).length === 1 && (await calls(p, 'birthday_club_join_online')).length === 0 && (await done(p)).note === '');
      check('not ticked: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    for (const [pre, label, want] of [['window.__joinFail=true;', 'joining fails', 'We couldn’t add you to the Birthday Club just now. Mention it when we contact you and we’ll add you.'], ['window.__joinAlready=true;', 'already a member', 'You’re already in our Birthday Club. We’ll be in touch in the week before your birthday.']]) {
      const { ctx, p, errors } = await open(b, 1280, 900, pre);
      await toDetails(p); await p.click('#cc-cake-order [data-bcg="on"]'); await p.waitForTimeout(250);
      await p.selectOption('#cco-bc-day', '5'); await p.selectOption('#cco-bc-month', '3'); await p.waitForTimeout(200);
      await click(p, '#cc-cake-order [data-act="toReview"]', 700); await click(p, '#cc-cake-order [data-act="send"]', 1300);
      const d = await done(p);
      check(label + ': the order is still received, and the page says it plainly', d && d.ref === 'CC-1100' && d.note === want, d);
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
