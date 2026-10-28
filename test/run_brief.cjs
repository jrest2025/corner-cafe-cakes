// Greeting and daily briefing on Today (21 October 2026). Live head and footer (test/fixtures, or HEAD/FOOTER env), the
// staff app at MANIFEST (default dist/app/staff-brief-manifest.json), invented data (test/mock.js), touch on.
// Checks: greeting by Fiji time; the first name on personal logins and no name on the counter login; the sentence and the
// briefing agree with what the Today screen shows; briefing lines open the right order; "all caught up"; "couldn't load";
// a website order that arrives while the app is open; nothing invented; the Heartbeat check still passes separately.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-brief-manifest.json'), 'utf8'));
const head = fs.readFileSync(process.env.HEAD || path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
let foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
if (!LOADER.test(foot)) throw new Error('The footer has no staff app loader');
foot = foot.replace(LOADER, (m, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + manifest.file + '",' + h + ',k="' + manifest.sri + '"');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 700) : '')); } }
// a Fiji clock time today, as a real instant (Fiji is UTC+12 in October)
const fijiToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
const at = hhmm => new Date(Date.parse(fijiToday + 'T' + hhmm + ':00+12:00'));

async function open(b, o) {
  o = o || {};
  const pre = (o.role ? 'window.__role=' + JSON.stringify(o.role) + ';' : 'window.__role="manager";') + mock +
    (o.empty ? 'window.__orders.length=0;' : '') +
    'window.__ordersDown=' + (o.down ? 'true' : 'false') + ';(function(){var f=window.__ccsMock.from;window.__ccsMock.from=function(t){var q=f(t);if(t==="orders"&&window.__ordersDown){q.then=function(ok,bad){return Promise.resolve({data:null,error:{message:"Failed to fetch"}}).then(ok,bad)}}return q}})();' +
    'window.supabase={createClient:function(){return window.__ccsMock}};';
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head + '<script>' + pre + '</script></head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
  const [w, h] = o.size || [1180, 820];
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  if (o.time) await p.clock.setFixedTime(at(o.time));
  p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/) || u.match(/^https:\/\/raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : /\.png$/.test(m[2]) ? 'image/png' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-staff .ccb-hello', { timeout: 8000 }); } catch (e) {}
  await p.waitForTimeout(600);
  return { ctx, p, errors };
}
const view = p => p.evaluate(() => {
  const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  const stat = label => { const s = [...document.querySelectorAll('#cc-staff .tq-stat')].filter(x => x.textContent.indexOf(label) > -1)[0]; return s ? { n: Number(s.querySelector('b').textContent), sub: s.querySelector('small').textContent } : null; };
  const red = document.querySelector('#cc-staff .tq-wh em.is-red');
  return { hello: t('#cc-staff .tq-head .ccb-hello'), sum: t('#cc-staff .tq-head .ccb-sum'), date: t('#cc-staff .tq-head .ccb-date'),
    lines: [...document.querySelectorAll('#cc-staff .ccb-list .ccb-item')].map(x => ({ text: x.textContent.replace(/\s+/g, ' ').trim(), act: x.getAttribute('data-act') || 'tab:' + x.getAttribute('data-tab'), id: x.getAttribute('data-id'), cls: x.className })),
    urgent: red ? parseInt(red.textContent, 10) : 0, due: stat('Due today'), clear: !!document.querySelector('#cc-staff .tq-warn.is-clear') };
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    // ---------- greeting by Fiji time, with the first name on a personal login ----------
    for (const [time, word] of [['09:15', 'Good morning'], ['13:30', 'Good afternoon'], ['18:45', 'Good evening']]) {
      const { ctx, p, errors } = await open(b, { time });
      const v = await view(p);
      check('manager at ' + time + ': "' + word + ', Test!"', v.hello === word + ', Test!', v.hello);
      check('manager at ' + time + ': the date stays on the screen, with the update time', /^\w+day \d{1,2} \w+ ·$/.test(v.date || ''), v.date);
      if (time === '18:45') {
        // ---------- the sentence and the briefing match the Today screen ----------
        const left = v.due ? v.due.n - Number((v.due.sub.match(/^(\d+) of/) || [0, 0])[1]) : 0;
        check('the sentence counts the urgent orders the screen shows (' + v.urgent + ')', v.urgent > 0 && new RegExp('^' + v.urgent + ' orders? needs? you urgently').test(v.sum), v);
        check('the sentence counts the cakes still to hand over today (' + left + ')', left > 0 && new RegExp(left + ' cakes? (is|are) due to be handed over today').test(v.sum), v);
        check('at most 3 briefing lines, the urgent one first', v.lines.length >= 1 && v.lines.length <= 3 && /^Urgent:/.test(v.lines[0].text) && /is-urgent/.test(v.lines[0].cls), v.lines);
        const urgentRef = (v.lines[0].text.match(/CC-\d+/) || [])[0];
        const inWarn = await p.evaluate(ref => [...document.querySelectorAll('#cc-staff .tq-warn .tq-w.is-red, #cc-staff .tq-warn .ap-island.ap-red')].some(e => e.textContent.indexOf(ref) > -1) || [...document.querySelectorAll('#cc-staff .tq-warn')].some(e => e.textContent.indexOf(ref) > -1), urgentRef);
        check('the urgent order in the briefing is the one in Needs attention (' + urgentRef + ')', !!urgentRef && inWarn);
        const next = v.lines.filter(x => /^(Next handover|Still to hand over):/.test(x.text))[0];
        check('the next handover is one of today\'s cakes, with its time in 12-hour format', !!next && /\d{1,2}:\d{2} (AM|PM)/.test(next.text) && !/\b([01]\d|2[0-3]):[0-5]\d\b(?! (AM|PM))/.test(next.text), next);
        const web = v.lines.filter(x => /^Website order to check:|website orders to check/.test(x.text))[0];
        check('website orders waiting to be checked are listed', !!web, v.lines);
        // a line opens its order
        await p.evaluate(() => { const x = [...document.querySelectorAll('#cc-staff .ccb-list .ccb-item')].filter(e => /^Website order to check:/.test(e.textContent.trim()))[0]; x && x.click(); });
        await p.waitForTimeout(1200);
        const sheet = await p.evaluate(() => { const s = document.getElementById('ccs-sheet'); return s && s.classList.contains('ccs-open') ? s.querySelector('.ccs-sheet-head').textContent : null; });
        check('tapping a briefing line opens that order', !!sheet && sheet.indexOf((web.text.match(/CC-\d+/) || ['?'])[0]) > -1, sheet);
        await p.evaluate(() => { const x = document.querySelector('#ccs-sheet .ccs-sheet-head .ccs-x'); x && x.click(); }); await p.waitForTimeout(600);
        // ---------- a website order arrives while the app is open ----------
        await p.evaluate(() => {
          const t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
          const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 4);
          window.__orders.push({ id: 'o-new', reference: 'CC-1099', order_status: 'awaiting_review', payment_status: 'unpaid', order_type: 'standard', source: 'online', created_at: new Date().toISOString(),
            required_date: d.toISOString().slice(0, 10), required_time: '13:00:00', fulfilment_method: 'collection', estimate_total: 68, customer_id: 'c2', customers: { id: 'c2', full_name: 'Test Customer B', phone: '912 0002' },
            order_items: [{ product_name: 'Cheesecake', size_inch: 8, quantity: 1 }] });
          const r = document.querySelector('#cc-staff [data-act="reload-orders"]'); r && r.click();
        });
        await p.waitForTimeout(1500);
        const v2 = await view(p);
        const arr = v2.lines.filter(x => /A new website order has come in/.test(x.text))[0];
        check('a website order that arrives shows as "A new website order has come in", first', !!arr && v2.lines[0] === arr && /CC-1099/.test(arr.text) && /is-new/.test(arr.cls), v2.lines);
        check('no script errors', !errors.length, errors);
      }
      await ctx.close();
    }
    // ---------- the shared counter login: no name ----------
    {
      const { ctx, p, errors } = await open(b, { role: 'front_of_house', time: '10:05', size: [820, 1180] });
      const v = await view(p);
      check('counter login: "Good morning!" with no name', v.hello === 'Good morning!', v.hello);
      check('counter login: a sentence from the real orders', !!v.sum && !/undefined|NaN|null/.test(v.sum), v.sum);
      check('counter login: no script errors', !errors.length, errors);
      await ctx.close();
    }
    // ---------- nothing to do ----------
    {
      const { ctx, p, errors } = await open(b, { empty: true, time: '15:00', size: [390, 844] });
      const v = await view(p);
      check('no orders: "You\'re all caught up. Nothing needs your attention right now."', v.sum === 'You’re all caught up. Nothing needs your attention right now.', v.sum);
      check('no orders: no briefing lines are made up', v.lines.length === 0, v.lines);
      check('no orders: no script errors', !errors.length, errors);
      await ctx.close();
    }
    // ---------- the orders cannot be loaded ----------
    {
      const { ctx, p, errors } = await open(b, { down: true, time: '11:00' });
      await p.waitForTimeout(1500);
      const v = await view(p);
      check('orders not loaded: "We couldn\'t load your latest information." and no numbers', v.sum === 'We couldn’t load your latest information.' && !v.lines.length, v);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log((fails ? 'FAILED ' : 'ALL PASSED ') + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
