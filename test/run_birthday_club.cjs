// Corner Café Birthday Club in the staff app (20 October 2026). Live head and footer (test/fixtures), with the staff app
// loader pointed at the local build from MANIFEST (default dist/app/staff-birthday-club-manifest.json); every other
// add-on comes from the commit the footer pins. Invented data only (test/mock.js, window.__bc).
//  - switched off: nothing new shows anywhere;
//  - Today's This week box; the Birthday Club page; one tap to record a call; members; Add a member;
//  - New order: Join with a birthday, the free cupcake, Not now, members, failures;
//  - an open order and a customer profile; access levels; phones and tablets.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-birthday-club-manifest.json'), 'utf8'));
const live = JSON.parse(fs.readFileSync(path.join(repo, 'dist/app/staff-service-hub-manifest.json'), 'utf8'));
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
let foot = fs.readFileSync(path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
if (!LOADER.test(foot) || foot.indexOf(live.file) < 0) throw new Error('The footer fixture is not the live footer');
foot = foot.replace(LOADER, (m, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + manifest.file + '",' + h + ',k="' + manifest.sri + '"');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
// Known in these harnesses with the invented orders, with or without the Birthday Club (as in run_campaign_chips.cjs)
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 700) : '')); } }
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
const dm = o => { const d = fiji(o); return { d: +d.slice(8, 10), m: +d.slice(5, 7), long: new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(',', '') }; };

async function open(b, w, h, o) {
  o = o || {};
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
    '<script>window.__role=' + JSON.stringify(o.role || 'manager') + ';' + (o.pre || '') + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + foot + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100, isMobile: w < 760 });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
  p.on('console', m => { if (/\[Birthday Club\]/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (/^0{40}$/.test(m[1])) return r.fulfill({ body: fs.readFileSync(path.join(repo, m[2])), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-semantic-colour-style', { timeout: 8000, state: 'attached' }); } catch (e) {}
  await p.waitForTimeout(1300);
  return { ctx, p, errors };
}
const js = async (p, s, wait) => { const ok = await p.evaluate(s => { const e = [...document.querySelectorAll(s)].pop(); if (e) e.click(); return !!e; }, s); await p.waitForTimeout(wait || 300); return ok; };
const calls = (p, fn) => p.evaluate(fn => window.__calls.filter(c => c[1] === fn).map(c => c[2]), fn);
const toast = p => p.evaluate(() => { const t = document.getElementById('ccs-toast'); return t && !t.hidden ? t.textContent : ''; });
const tab = (p, t) => js(p, '#cc-staff [data-tab="' + t + '"]', 900);
async function club(p) { await tab(p, 'customers'); await js(p, '#ccs-main [data-act="secgo"][data-g="crm"][data-v="bc"]', 700); }
const page = p => p.evaluate(() => {
  const m = document.querySelector('#ccs-main [data-bc-page]'); if (!m) return null;
  const cards = sel => [...m.querySelectorAll(sel)].map(c => ({ id: c.dataset.bcCard, name: c.querySelector('.crm-name').textContent, kind: c.querySelector('.crm-kind').textContent,
    when: c.querySelector('.crm-reason').textContent, st: c.querySelector('.bc-st').textContent, tel: (c.querySelector('a[href^="tel:"]') || {}).href || null,
    wa: (c.querySelector('a[href*="wa.me"]') || {}).href || null, chips: [...c.querySelectorAll('[data-bc-out]')].map(b => b.textContent + '=' + b.getAttribute('aria-pressed')),
    tall: [...c.querySelectorAll('[data-bc-out], .crm-acts .ccs-btn')].every(b => b.getBoundingClientRect().height >= 43.5), today: c.classList.contains('is-today'), late: c.classList.contains('is-late') }));
  const folds = [...m.querySelectorAll('.bc-fold')].map(f => f.querySelector('summary').textContent);
  return { offer: (m.querySelector('.bc-offer') || {}).textContent, add: !!m.querySelector('[data-bc-add]'), kpis: [...m.querySelectorAll('.bc-k')].map(k => k.querySelector('.bc-kl').textContent + '=' + k.querySelector('b').textContent + '|' + k.querySelector('small').textContent),
    h: m.querySelector('.bc-sh h2').textContent, todo: cards(':scope > .bc-cards > .bc-card'), done: cards('.bc-fold[data-bc-sec="done"] .bc-card'), folds,
    bar: [...document.querySelectorAll('#ccs-main .crm-bar .ccs-secbtn')].map(b => b.textContent.replace(/\s+/g, ' ').trim() + (b.getAttribute('aria-selected') === 'true' ? '*' : '')),
    wide: document.documentElement.scrollWidth <= window.innerWidth + 1 };
});
// New order, as in run_campaign_chips.cjs
async function newOrder(p, phone, name) {
  await tab(p, 'new');
  await p.fill('#n-phone', phone); await p.waitForTimeout(500);
  if (name) await p.fill('#n-name', name); else await js(p, '[data-act="n-pick"][data-v="0"]', 600);
  await js(p, '[data-act="sl-opt"][data-v="no"]'); await js(p, '[data-act="n-source"][data-v="phone"]'); await js(p, '[data-act="n-taken"][data-v="now"]', 500);
}
async function finish(p) {
  await js(p, '[data-act="sl-next"]'); await js(p, '[data-act="n-cell"][data-v="cheesecake|8"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '[data-act="n-diet"][data-v="no"]'); await js(p, '[data-act="n-occ"][data-v="Birthday"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');
  if (!(await p.$('#sl-st-3 [data-act="n-time"]'))) await js(p, '[data-act="sl-next"]');
  await js(p, '#sl-st-3 [data-act="n-time"][data-v="15:00"]'); await js(p, '[data-act="sl-next"]');
  await js(p, '[data-act="n-plan"][data-v="later"]');
  if (!(await js(p, '[data-cc-agree="yes"]'))) await p.evaluate(() => { const c = document.querySelector('[data-nc="confirmNow"]'); if (c && !c.checked) c.click(); });   // finish-flow add-on, or the app's own box
  await js(p, '[data-act="n-submit"]', 1600);
}
const slot = p => p.evaluate(() => { const s = document.querySelector('#cc-staff [data-bcn-slot]'); if (!s) return null;
  return { text: s.innerText.replace(/\s+/g, ' ').trim(), join: [...s.querySelectorAll('[data-bcn-join]')].map(b => b.textContent + '=' + b.getAttribute('aria-pressed')),
    offer: [...s.querySelectorAll('[data-bcn-offer]')].map(b => b.textContent + '=' + b.getAttribute('aria-pressed')), selects: s.querySelectorAll('select').length,
    err: (s.querySelector('[data-bcn-err]:not([hidden])') || {}).textContent || '', tall: [...s.querySelectorAll('button')].every(b => b.getBoundingClientRect().height >= 40) }; });
async function pick(p, d, m) { await p.selectOption('#bcn-day', String(d)); await p.waitForTimeout(150); await p.selectOption('#bcn-month', String(m)); await p.waitForTimeout(250); }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const SHOTS = process.env.SHOTS;
  try {
    // ---- switched off (as it is until approved): nothing new anywhere
    {
      const { ctx, p, errors } = await open(b, 1366, 1024);
      check('off: Today has no birthday line', !(await p.$('.bc-week')));
      await tab(p, 'customers');
      const bar = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .crm-bar .ccs-secbtn')].map(b => b.textContent.trim()));
      check('off: Customers has its three sections only', bar.join('|') === 'Customers|Follow-ups 6|Insights', bar);
      await newOrder(p, '912 3456', 'Invented Guest');
      check('off: New order asks nothing about the Birthday Club', !(await slot(p)) || !(await slot(p)).text, await slot(p));
      await finish(p);
      check('off: the order is saved as before, with no Birthday Club calls', (await calls(p, 'staff_create_order')).length === 1 && (await calls(p, 'birthday_club_join_order')).length === 0 && (await calls(p, 'birthday_club_redeem')).length === 0);
      check('off: no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---- the Birthday Club page, tablet and phone
    for (const [w, h, label] of [[1366, 1024, 'tablet'], [412, 893, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h, { pre: 'window.__bc={};' });
      const wk = await p.evaluate(() => { const e = document.querySelector('#ccs-main .tq-week .bc-week'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
      const D3 = dm(3), D6 = dm(6);
      check(label + ': Today, This week ends with the birthdays to call', wk && wk.indexOf('4 birthdays to call') === 0 && wk.indexOf('Mere today, Ana ' + D3.long.slice(0, 3) + ', Ravi ' + D6.long.slice(0, 3) + ' and 1 more') > 0, wk);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'today-' + label + '.png') });
      await js(p, '#ccs-main [data-bc-go]', 1000);
      let s = await page(p);
      check(label + ': tapping it opens Customers, Birthday Club', s && (await p.evaluate(() => document.getElementById('ccs-main').dataset.screen)) === 'customers-bc' && s.bar.join('|') === 'Customers|Follow-ups 6|Insights|Birthday Club 4*', s && s.bar);
      check(label + ': the club offer is explained', s.offer.indexOf('The club offer: a free cupcake with a cake') > -1 && s.offer.indexOf('within 2 weeks of their birthday') > -1 && s.add, s.offer);
      check(label + ': how the club is doing', s.kpis.join(' / ') === 'To call this week=4|1 with a birthday today / Members=7|2 joined this month / Wished this month=1|2 calls and messages / Free cupcakes this year=1|$95 of cake orders came with them', s.kpis);
      check(label + ': today first, then the coming days, then late ones', s.h === 'You have 4 birthdays to call this week' && s.todo.map(c => c.name).join('|') === 'Mere Test|Ana Test|Ravi Test|Sera Test' && s.todo[0].today && s.todo[3].late, s.todo.map(c => [c.name, c.kind]));
      check(label + ': each card says when', s.todo[0].when === 'Birthday today, ' + dm(0).long && s.todo[1].when === 'Birthday ' + D3.long + ', in 3 days' && s.todo[3].when === 'Birthday was ' + dm(-2).long + ', 2 days ago', s.todo.map(c => c.when));
      check(label + ': what happened last is shown, with 12-hour times', /^No answer yesterday \d{1,2}:\d\d (AM|PM) by Counter One\. Try again\.$/.test(s.todo[2].st) && s.todo[0].st === 'Not called yet.' && /Free cupcake used on CC-1040/.test(s.todo[3].st), s.todo.map(c => c.st));
      check(label + ': Call and WhatsApp open the phone, with a birthday message', s.todo[0].tel === 'tel:+6799120003' && /^https:\/\/wa\.me\/6799120003\?text=/.test(s.todo[0].wa) &&
        /happy birthday from all of us at Corner Café/.test(decodeURIComponent(s.todo[0].wa)) && decodeURIComponent(s.todo[1].wa).indexOf('Your birthday is coming up on ' + D3.long) > -1 && /belated/.test(decodeURIComponent(s.todo[3].wa)), [s.todo[0].tel, s.todo[1].wa]);
      check(label + ': already wished and asked-for-no-offers members are not on the list', s.done.map(c => c.name).join() === 'Litia Test' && !s.todo.some(c => c.name === 'Priya Test' || c.name === 'Josh Test'), s.done);
      check(label + ': buttons are easy to tap and the page fits the screen', s.todo.every(c => c.tall) && s.wide, s.todo.map(c => c.tall));
      if (SHOTS) { await p.screenshot({ path: path.join(SHOTS, 'club-' + label + '.png'), fullPage: label === 'tablet' }); }
      // one tap records what happened
      await js(p, '#ccs-main [data-bc-card="c3"] [data-bc-out="wished"]', 700);
      const c1 = await calls(p, 'birthday_club_contact');
      check(label + ': Wished them is saved once, as a phone call', c1.length === 1 && c1[0].p_customer === 'c3' && c1[0].p_outcome === 'wished' && c1[0].p_channel === 'phone' && /^[0-9a-f-]{36}$/.test(c1[0].p_idem), c1);
      check(label + ': and says so', (await toast(p)) === 'Saved: you wished Mere a happy birthday', await toast(p));
      s = await page(p);
      check(label + ': Mere moves to Done this week; three left to call', s.todo.map(c => c.name).join('|') === 'Ana Test|Ravi Test|Sera Test' && s.done.map(c => c.name).sort().join() === 'Litia Test,Mere Test' && s.bar[3] === 'Birthday Club 3*' && s.h === 'You have 3 birthdays to call this week', [s.todo.map(c => c.name), s.done.map(c => c.name), s.bar]);
      await js(p, '#ccs-main [data-bc-card="c4"] [data-bc-out="no_answer"]', 700);
      s = await page(p);
      check(label + ': No answer keeps them on the list', s.todo.some(c => c.name === 'Ravi Test' && /^No answer \d{1,2}:\d\d (AM|PM) by Test Manager\. Try again\.$/.test(c.st)) && (await toast(p)) === 'Saved: no answer. Ravi stays on the list', s.todo.map(c => c.st));
      await js(p, '#ccs-main [data-bc-card="c10"] [data-bc-out="messaged"]', 700);
      check(label + ': WhatsApp sent is saved as a WhatsApp', (await calls(p, 'birthday_club_contact')).pop().p_channel === 'whatsapp');
      // members
      await p.evaluate(() => { const d = document.querySelector('#ccs-main .bc-fold[data-bc-sec="members"]'); d.open = true; }); await p.waitForTimeout(200);
      const mem = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .bc-mlist li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
      check(label + ': members, with birthdays and how they joined', mem.length === 7 && mem.some(t => /^Priya Test .*Asked for no offers/.test(t)) && mem.some(t => /^Mere Test .*Joined .* at the counter/.test(t)) && mem.some(t => /^Josh Test .*Birthday in 40 days/.test(t)), mem);
      await js(p, '#ccs-main .bc-mlist [data-bc-ask="c6"]', 300);
      const conf = await p.evaluate(() => (document.querySelector('#ccs-main .bc-mlist .bc-conf') || {}).textContent || '');
      check(label + ': Remove asks first', /^Remove Josh from the club\?/.test(conf) && (await calls(p, 'birthday_club_leave')).length === 0, conf);
      await js(p, '#ccs-main .bc-mlist [data-bc-keep]', 300);
      check(label + ': Keep leaves them in', !(await p.$('#ccs-main .bc-mlist .bc-conf')) && (await calls(p, 'birthday_club_leave')).length === 0);
      await js(p, '#ccs-main .bc-mlist [data-bc-ask="c6"]', 300); await js(p, '#ccs-main .bc-mlist [data-bc-leave="c6"]', 700);
      const lv = await calls(p, 'birthday_club_leave');
      check(label + ': Remove takes them out of the club', lv.length === 1 && lv[0].p_customer === 'c6' && (await toast(p)) === 'Josh Test left the Birthday Club' &&
        (await p.evaluate(() => document.querySelectorAll('#ccs-main .bc-mlist li').length)) === 6, [lv, await toast(p)]);
      // Add a member
      await js(p, '#ccs-main [data-bc-add]', 400);
      let win = await p.evaluate(() => { const l = document.getElementById('bcm-layer'); return { open: !!l && !l.hidden, focus: document.activeElement && document.activeElement.id, inert: document.querySelector('#cc-staff > .ccs-app').hasAttribute('inert'), h: (document.getElementById('bcm-h') || {}).textContent }; });
      check(label + ': Add a member opens a window, ready to search', win.open && win.focus === 'bcm-q' && win.inert && win.h === 'Add a member', win);
      await p.fill('#bcm-q', 'Test Customer'); await p.waitForTimeout(700);
      const res = await p.evaluate(() => [...document.querySelectorAll('#bcm-dlg [data-bcm-pick]')].map(b => b.innerText.replace(/\s+/g, ' ') + (b.disabled ? ' (off)' : '')));
      check(label + ': the search finds customers', res.length === 2 && res.some(t => /^Test Customer B 912 0002 · C-102/.test(t)), res);
      await js(p, '#bcm-dlg [data-bcm-pick="c2"]', 400);
      await js(p, '#bcm-dlg [data-bcm="save"]', 400);
      const err = await p.evaluate(() => { const e = document.querySelector('#bcm-dlg [data-bcm-err]'); return e && !e.hidden ? e.textContent : ''; });
      check(label + ': the birthday is needed', err === 'Choose their birthday: the day and the month.' && (await calls(p, 'birthday_club_join')).length === 0, err);
      await p.selectOption('#bcm-day', '25'); await p.selectOption('#bcm-month', '12'); await js(p, '#bcm-dlg [data-bcm="save"]', 900);
      const jn = await calls(p, 'birthday_club_join');
      win = await p.evaluate(() => { const l = document.getElementById('bcm-layer'); return { open: !!l && !l.hidden, focus: document.activeElement && document.activeElement.hasAttribute('data-bc-add'), inert: document.querySelector('#cc-staff > .ccs-app').hasAttribute('inert') }; });
      check(label + ': they join with their birthday, and the window closes', jn.length === 1 && jn[0].p_customer === 'c2' && jn[0].p_day === 25 && jn[0].p_month === 12 && !win.open && !win.inert &&
        (await toast(p)) === 'Test Customer B joined the Birthday Club. Birthday 25 December.', [jn, win, await toast(p)]);
      check(label + ': focus goes back to Add a member', win.focus, win);
      await js(p, '#ccs-main [data-bc-add]', 400); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      check(label + ': Escape closes the window', await p.evaluate(() => document.getElementById('bcm-layer').hidden));
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---- New order
    for (const [w, h, label] of [[1024, 768, 'tablet'], [390, 844, 'phone']]) {
      const { ctx, p, errors } = await open(b, w, h, { pre: 'window.__bc={};' });
      const D5 = dm(5), F = dm(60);
      await newOrder(p, '912 3456', 'Invented Guest');
      let s = await slot(p);
      check(label + ': a new customer is asked to join, optional, nothing else yet', s && /^Birthday Club Optional Members get a free cupcake/.test(s.text) && s.join.join() === 'Join=false,Not now=false' && s.selects === 0 && s.tall, s);
      await js(p, '#cc-staff [data-bcn-join="yes"]');
      s = await slot(p);
      check(label + ': Join asks for the birthday (day and month)', s.join.join() === 'Join=true,Not now=false' && s.selects === 2 && /Their birthday Required/.test(s.text) && !s.offer.length, s);
      await js(p, '[data-act="sl-next"]', 400);
      s = await slot(p);
      check(label + ': Next waits for the birthday', s && s.err === 'Choose their birthday, or tap Not now.' && (await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'bcn-day', s);
      await pick(p, D5.d, D5.m);
      s = await slot(p);
      check(label + ': a birthday within 2 weeks offers the free cupcake, already ticked', s.offer.join() === 'Add the free cupcake=true,Not this time=false' && s.text.indexOf('Their birthday is ' + D5.long + ', so this cake can have it.') > -1 && /kitchen slip will say/.test(s.text), s);
      if (SHOTS) { await p.evaluate(() => document.querySelector('[data-bcn-slot]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.screenshot({ path: path.join(SHOTS, 'neworder-' + label + '.png') }); }
      await finish(p);
      const mk = await calls(p, 'staff_create_order'), jo = await calls(p, 'birthday_club_join_order'), rd = await calls(p, 'birthday_club_redeem');
      check(label + ': the order is saved, then they join, then the cupcake is added', mk.length === 1 && jo.length === 1 && jo[0].p_order === 'o9' && jo[0].p_day === D5.d && jo[0].p_month === D5.m && rd.length === 1 && rd[0].p_order === 'o9', { mk: mk.length, jo, rd });
      check(label + ': the club is not part of the order itself', !Object.keys(mk[0].p).some(k => /^bc|birthday/i.test(k)), Object.keys(mk[0].p));
      const o9 = await p.evaluate(() => { const o = window.__orders.filter(x => x.id === 'o9')[0]; return o && o.order_items[0].kitchen_notes; });
      check(label + ': the kitchen notes say so', o9 === 'Birthday Club: add 1 free cupcake', o9);
      check(label + ': no error message after saving', !/Birthday Club|cupcake/.test(await toast(p)), await toast(p));
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1024, 768, { pre: 'window.__bc={};' });
      await newOrder(p, '912 3456', 'Invented Guest'); await js(p, '#cc-staff [data-bcn-join="no"]');
      check('Not now: nothing more is asked', (await slot(p)).selects === 0 && (await slot(p)).join.join() === 'Join=false,Not now=true');
      await finish(p);
      check('Not now: the order is saved and nobody joins', (await calls(p, 'staff_create_order')).length === 1 && (await calls(p, 'birthday_club_join_order')).length === 0 && (await calls(p, 'birthday_club_redeem')).length === 0);
      check('Not now: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1024, 768, { pre: 'window.__bc={};' });
      const F = dm(60);
      await newOrder(p, '912 3456', 'Invented Guest'); await js(p, '#cc-staff [data-bcn-join="yes"]'); await pick(p, F.d, F.m);
      check('a birthday further away: they can join, no cupcake offered', !(await slot(p)).offer.length, await slot(p));
      await finish(p);
      check('a birthday further away: join only', (await calls(p, 'birthday_club_join_order')).length === 1 && (await calls(p, 'birthday_club_redeem')).length === 0);
      check('a birthday further away: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1024, 768, { pre: 'window.__bc={};' });
      await newOrder(p, '912 0010'); await p.waitForTimeout(400);
      let s = await slot(p);
      check('a member near their birthday: shown as a member, with the free cupcake ticked', s && s.text.indexOf('Birthday Club Member · birthday ' + dm(3).d + ' ' + dm(3).long.split(' ')[2]) === 0 && s.offer.join() === 'Add the free cupcake=true,Not this time=false' && !s.join.length, s);
      await js(p, '#cc-staff [data-bcn-offer="no"]');
      check('a member: Not this time can be chosen', (await slot(p)).offer.join() === 'Add the free cupcake=false,Not this time=true');
      await finish(p);
      check('a member, Not this time: no cupcake and no joining', (await calls(p, 'staff_create_order')).length === 1 && (await calls(p, 'birthday_club_redeem')).length === 0 && (await calls(p, 'birthday_club_join_order')).length === 0);
      check('a member: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1024, 768, { pre: 'window.__bc={};' });
      await newOrder(p, '912 0010'); await p.waitForTimeout(400); await finish(p);
      check('a member, left ticked: the cupcake is added to the order', (await calls(p, 'birthday_club_redeem')).length === 1 && (await calls(p, 'birthday_club_join_order')).length === 0);
      await newOrder(p, '912 0005'); await p.waitForTimeout(400);
      const s = await slot(p);
      check('a member who already had this birthday\'s cupcake: says so, nothing to tick', s && /already had the free cupcake for this birthday, on CC-1040/.test(s.text) && !s.offer.length, s);
      check('a member: no script errors (2)', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1024, 768, { pre: 'window.__bc={};window.__bcFail={birthday_club_join_order:true};' });
      await newOrder(p, '912 3456', 'Invented Guest'); await js(p, '#cc-staff [data-bcn-join="yes"]'); await pick(p, dm(5).d, dm(5).m); await finish(p);
      const t = await toast(p);
      check('joining fails: the order is still saved, and staff are told', (await calls(p, 'staff_create_order')).length === 1 && /^Order saved, but the Birthday Club part was not/.test(t) && (await calls(p, 'birthday_club_redeem')).length === 0, t);
      check('joining fails: no script errors', errors.filter(e => !/after order/.test(e)).length === 0, errors);
      await ctx.close();
    }

    // ---- a customer profile and an open order
    {
      const { ctx, p, errors } = await open(b, 1366, 1024, { pre: 'window.__bc={};' });
      await club(p);
      await js(p, '#ccs-main [data-bc-card="c3"] .crm-name', 1200);
      let box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
      check('profile: a member\'s profile shows the club', box && box.indexOf('Birthday Club member Birthday ' + dm(0).d + ' ' + dm(0).long.split(' ')[2]) === 0 && /Remove/.test(box), box);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'profile-member.png') });
      await tab(p, 'customers'); await js(p, '#ccs-main [data-act="secgo"][data-g="crm"][data-v="all"]', 800);
      await js(p, '#ccs-main tr[data-act="open-customer"][data-id="c1"]', 1200);
      box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
      check('profile: someone not in the club can be added from their profile', box && /^Not in the Birthday Club/.test(box) && /Add to the club/.test(box), box);
      await js(p, '#ccs-sheet [data-bc-addc="c1"]', 400);
      const h2 = await p.evaluate(() => (document.getElementById('bcm-h') || {}).textContent);
      check('profile: the window goes straight to their birthday', h2 === 'Add Test Customer A to the Birthday Club', h2);
      await p.selectOption('#bcm-day', String(dm(3).d)); await p.selectOption('#bcm-month', String(dm(3).m)); await js(p, '#bcm-dlg [data-bcm="save"]', 1400);
      box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
      check('profile: after joining, the profile shows them as a member', (await calls(p, 'birthday_club_join')).length === 1 && box && /^Birthday Club member/.test(box) && /can have the free cupcake now/.test(box), box);
      // their open order can now have the free cupcake
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await tab(p, 'orders'); await js(p, '[data-act="filter"][data-v="upcoming"]', 700);
      await js(p, '#ccs-main [data-act="open-order"][data-id="o1"]', 1400);
      box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
      check('order: a member\'s order can have the free cupcake', box && box.indexOf('Birthday Club member Birthday ' + dm(3).long + ', so this order can have a free cupcake.') === 0 && /Add the free cupcake/.test(box), box);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'order-offer.png') });
      await js(p, '#ccs-sheet [data-bc-redeem="o1"]', 1600);
      const rd = await calls(p, 'birthday_club_redeem');
      box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
      check('order: one tap adds it, and the box says so', rd.length === 1 && rd[0].p_order === 'o1' && box && /^Birthday Club: free cupcake added/.test(box), [rd, box]);
      const v = await p.evaluate(() => window.__calls.filter(c => c[0] === 'rpc' && c[1] === 'birthday_club_redeem').length);
      await js(p, '#ccs-sheet [data-act="secgo"][data-v="history"]', 400); await js(p, '#ccs-sheet [data-act="history"]', 400);
      const hist = await p.evaluate(() => (document.querySelector('#ccs-sheet .ccs-history') || {}).innerText || '');
      check('order: the history names it', /Birthday Club: free cupcake added · Test Manager/.test(hist), hist.slice(0, 400));
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await js(p, '#ccs-main [data-act="open-order"][data-id="o3"]', 1400);
      box = await p.evaluate(() => { const b = document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body > [data-bc-box]'); return b ? b.innerText : null; });
      check('order: once a year, so their other order has nothing to add', box === null, box);
      check('profile and order: no script errors', errors.length === 0, errors);
      await ctx.close();
    }

    // ---- access
    for (const [role, label, see, call, join] of [['front_of_house', 'Counter', true, true, true], ['finance', 'Finance', false, false, false], ['kitchen', 'Kitchen', false, false, false]]) {
      const { ctx, p, errors } = await open(b, 1366, 1024, { role, pre: 'window.__bc={};' });
      const wk = !!(await p.$('.bc-week'));
      await tab(p, 'customers');
      const bar = await p.evaluate(() => [...document.querySelectorAll('#ccs-main .crm-bar .ccs-secbtn')].map(b => b.textContent.trim()));
      check(label + ': ' + (see ? 'sees' : 'does not see') + ' the Birthday Club', wk === call && bar.some(t => /^Birthday Club/.test(t)) === see, { wk, bar });
      if (see) {
        await js(p, '#ccs-main [data-act="secgo"][data-g="crm"][data-v="bc"]', 700);
        const s = await page(p);
        check(label + ': can call and add members', s.add === join && s.todo[0].chips.length === 4, s);
      }
      check(label + ': no script errors', errors.length === 0, errors);
      await ctx.close();
    }
    {
      const { ctx, p, errors } = await open(b, 1366, 1024, { pre: 'window.__bc={noJoin:true};' });
      await club(p);
      const s = await page(p);
      check('not taking new members: no Add a member', s && !s.add && s.todo.length === 4, s && s.add);
      await newOrder(p, '912 3456', 'Invented Guest');
      check('not taking new members: New order does not ask', !(await slot(p)).text);
      check('not taking new members: no script errors', errors.length === 0, errors);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
