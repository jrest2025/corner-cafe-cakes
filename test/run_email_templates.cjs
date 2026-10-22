// Email templates in the staff app (22 October 2026). Live head and footer (test/fixtures) with the staff app loader
// pointed at MANIFEST (default dist/app/staff-email-templates-manifest.json). Invented data only.
// The email_tpl_* functions are played by a small in-page copy of their rules; previews are built by the real
// email code (supabase/functions/send-emails/guest_emails.ts) running in Node, so what is checked is what customers get.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const manifest = JSON.parse(fs.readFileSync(path.join(repo, process.env.MANIFEST || 'dist/app/staff-email-templates-manifest.json'), 'utf8'));
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
let foot = fs.readFileSync(process.env.FOOTER || path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const LOADER = /var f="gh\/jrest2025\/corner-cafe-cakes@[0-9a-f]{40}\/dist\/app\/staff-app\.[0-9a-f]{10}\.js",(h=\[[^\]]*\]),k="sha384-[^"]+"/;
foot = foot.replace(LOADER, (m, h) => 'var f="gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + manifest.file + '",' + h + ',k="' + manifest.sri + '"');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
// ADDON: a standalone add-on script loaded after the live footer (the release route that leaves the app bundle as it is)
const ADDON = process.env.ADDON ? '<script src="https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@' + '0'.repeat(40) + '/' + process.env.ADDON + '" crossorigin="anonymous"></script>' : '';
const KNOWN = ["Cannot read properties of undefined (reading 'length')", "Cannot read properties of undefined (reading 'filter')"];
let n = 0, fails = 0;
function check(s, v, d) { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } }

// In-page copy of the database rules (supabase/sql/email_templates_20261022.sql)
const DB = `(function(){var V=[],SW={guest_thanks:true},seq=0,KINDS=['guest_received','guest_quote','guest_deposit_needed','guest_confirmed','guest_updated','guest_declined','guest_cancelled','guest_thanks'];
var me=function(){return ['admin','manager'].indexOf(window.__role)>-1?{name:'Test Manager'}:null};
var row=function(v){return v?JSON.parse(JSON.stringify(v)):null};var now=function(){return new Date().toISOString()};
window.__etDB={V:V,SW:SW};
window.__etRpc=function(fn,a){var m=me();if(!m)return {ok:false,message:'Only someone with the Settings switch can manage email templates.'};
 if(fn==='email_tpl_home'){var k={};KINDS.forEach(function(x){k[x]={enabled:x==='guest_thanks'?SW.guest_thanks:true,published:row(V.filter(function(v){return v.kind===x&&v.status==='published'})[0]),draft:row(V.filter(function(v){return v.kind===x&&v.status==='draft'})[0]),history:V.filter(function(v){return v.kind===x&&v.status!=='draft'}).sort(function(a,b){return b.version-a.version}).map(row),sent_30d:x==='guest_confirmed'?18:0}});return {ok:true,kinds:k}}
 if(fn==='email_tpl_save'){var d=V.filter(function(v){return v.kind===a.p_kind&&v.status==='draft'})[0];if(!d){d={id:'v'+(++seq),kind:a.p_kind,version:V.filter(function(v){return v.kind===a.p_kind}).length+1,status:'draft',created_at:now(),created_by_name:m.name};V.push(d)}
   ['subject','preheader','label','heading','tagline','intro','closing','note'].forEach(function(f){d[f]=a.p_fields[f]||null});d.updated_at=now();d.updated_by_name=m.name;return {ok:true,draft:row(d)}}
 if(fn==='email_tpl_publish'){var d2=V.filter(function(v){return v.kind===a.p_kind&&v.status==='draft'})[0];if(!d2||d2.id!==a.p_draft)return {ok:false,message:'This draft has changed. Reload and check it before publishing.'};
   V.forEach(function(v){if(v.kind===a.p_kind&&v.status==='published'){v.status='archived';v.archived_at=now()}});d2.status='published';d2.published_at=now();d2.published_by_name=m.name;return {ok:true,published:row(d2)}}
 if(fn==='email_tpl_discard'){for(var i=V.length-1;i>=0;i--)if(V[i].kind===a.p_kind&&V[i].status==='draft')V.splice(i,1);return {ok:true}}
 if(fn==='email_tpl_copy'){var s=V.filter(function(v){return v.id===a.p_version})[0];var f={};['subject','preheader','label','heading','tagline','intro','closing'].forEach(function(x){f[x]=s[x]});f.note='From version '+s.version;return window.__etRpc('email_tpl_save',{p_kind:s.kind,p_fields:f})}
 if(fn==='email_tpl_standard'){V.forEach(function(v){if(v.kind===a.p_kind&&v.status==='published'){v.status='archived';v.archived_at=now()}});return {ok:true}}
 if(fn==='email_tpl_switch'){if(a.p_kind!=='guest_thanks')return {ok:false,message:'Order emails always go to customers and cannot be switched off.'};SW.guest_thanks=!!a.p_on;return {ok:true,enabled:SW.guest_thanks}}
 return null};
var M=window.__ccsMock,r0=M.rpc,i0=M.functions.invoke;window.__etCalls=[];
M.rpc=function(fn,a){if(/^email_tpl_/.test(fn)){window.__etCalls.push([fn,a]);if(window.__etFail===fn)return Promise.resolve({error:{message:'Failed to fetch'}});return Promise.resolve({data:window.__etRpc(fn,a)})}return r0.apply(this,arguments)};
M.functions.invoke=function(name,o){if(name==='email-templates'){window.__etCalls.push(['fn',o.body]);if(['admin','manager'].indexOf(window.__role)<0)return Promise.resolve({error:{message:'403',context:{status:403}}});return window.__etServer(o.body).then(function(d){return {data:d}})}return i0.apply(this,arguments)};
})();`;

async function main() {
  const g = await import(path.join(repo, 'supabase/functions/send-emails/guest_emails.ts'));
  const LOC = { name: 'Corner Café', email: 'cornercafe@jacksfiji.com', phone: '+679 892 2760', address: '401–403 Queens Road, Nadi Town (behind Jacks of Fiji)', order_page_url: 'https://www.cornercafefiji.com/order-cake' };
  const server = (b) => {
    if (b.op === 'meta') return { ok: true, kinds: g.TEMPLATE_KINDS, fields: g.FIELDS, defaults: g.DEFAULTS };
    const d = g.sampleData(b.kind, { location: LOC, config: { review_link: 'https://g.page/r/test/review' }, promo_cards: [] });
    let unknown = [];
    if (b.fields) { const f = {}; for (const k of ['subject', 'preheader', 'label', 'heading', 'tagline']) f[k] = String(b.fields[k] || '').replace(/<[^>]*>/g, '').trim();
      for (const k of ['intro', 'closing']) f[k] = g.cleanRich(b.fields[k] || ''); unknown = [...new Set(Object.values(f).flatMap(g.unknownFields))]; d.template = { id: null, ...f }; }
    const m = g.buildGuest(b.kind, d);
    if (b.op === 'preview') return { ok: true, subject: m.subject, html: m.html, text: m.text, unknown, problems: [] };
    if (b.op === 'test') return unknown.length ? { ok: false, message: 'Fix the highlighted problems before sending a test.' } : { ok: true, to: 'manager@example.com' };
  };
  // Email code, no browser: no photos, and a changed heading leaves the automatic wording alone
  { const all = g.TEMPLATE_KINDS.map(k => g.buildGuest(k.kind, g.sampleData(k.kind, { location: LOC, config: {}, promo_cards: [] })));
    check('all 8 customer emails: the logo is the only image', all.every(m => (m.html.match(/<img /g) || []).length === 1 && /corner-cafe-logo-email/.test(m.html)));
    check('no stock cake photo anywhere', all.every(m => !/cake-hero/.test(m.html)));
    const d = g.sampleData('guest_confirmed', { location: LOC, config: {}, promo_cards: [] }); d.order.fulfilment_method = 'delivery'; d.order.delivery_address = '12 Namaka Lane'; d.order.delivery_zone = 'Namaka';
    const m = g.buildGuest('guest_confirmed', { ...d, template: { id: 'x', heading: 'Great news {{customer_name}}' } });
    check('changed heading only: delivery wording still automatic', /We'll deliver it on/.test(m.text) && /Great news Mere/.test(m.html), m.text.slice(0, 300));
    const w = g.buildGuest('guest_received', { ...g.sampleData('guest_received', { location: LOC }), customer: { full_name: 'Mere T', preferred_contact: 'whatsapp' }, template: { id: 'x', heading: 'Hi {{customer_name}}' } });
    check('changed heading only: WhatsApp wording still automatic', /WhatsApp/.test(w.text)); }
  const window_calls = [];
  const b = await chromium.launch();
  async function open(w, h, role, touch) {
    const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head +
      '<script>window.__role=' + JSON.stringify(role) + ';' + mock + 'window.supabase={createClient:function(){return window.__ccsMock}};' + DB + '</script></head>' +
      '<body style="margin:0"><div id="cc-staff"></div>' + foot + ADDON + '</body></html>';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch === undefined ? w < 1100 : touch, isMobile: w < 760 });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => { if (!KNOWN.includes(e.message)) errors.push(e.message); });
    await p.exposeFunction('__etServerNode', (body) => JSON.stringify(server(JSON.parse(body))));
    await p.addInitScript(() => { window.__etServer = (body) => window.__etServerNode(JSON.stringify(body)).then(JSON.parse); try { localStorage.setItem('cc-cakes-staff', JSON.stringify({ access_token: 'test-token' })); } catch (e) {} });
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
      if (u === 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/email-templates') {
        const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type' };
        if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: hdr, body: 'ok' });
        if (!/Bearer test-token/.test(r.request().headers()['authorization'] || '')) return r.fulfill({ status: 401, headers: hdr, body: '{}' });
        if (!['admin', 'manager'].includes(role)) return r.fulfill({ status: 403, headers: hdr, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Only someone with the Settings switch can manage email templates.' }) });
        window_calls.push(JSON.parse(r.request().postData()));
        return r.fulfill({ status: 200, headers: hdr, contentType: 'application/json', body: JSON.stringify(server(JSON.parse(r.request().postData()))) });
      }
      const m = u.match(/^https:\/\/(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@([0-9a-f]{7,40})\/([^?]+)/);
      if (m) {
        const type = /\.css$/.test(m[2]) ? 'text/css' : /\.png$/.test(m[2]) ? 'image/png' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
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
  const click = async (p, s, wait) => { const ok = await p.evaluate(s => { const e = [...document.querySelectorAll(s)].pop(); if (e) e.click(); return !!e; }, s); await p.waitForTimeout(wait || 350); return ok; };
  const settings = async (p) => { await click(p, '#cc-staff [data-tab="settings"]', 1200); };
  const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  // 1. Counter staff: no Communications entry
  { const { ctx, p, errors } = await open(1440, 900, 'front_of_house');
    await settings(p);
    check('counter login: no Communications entry', !(await p.$('#et-comm')));
    check('counter login: no page errors', !errors.length, errors);
    await ctx.close(); }

  // 2. Manager on a computer: the full journey
  { const { ctx, p, errors } = await open(1440, 900, 'manager');
    await settings(p);
    check('manager: Communications in Settings', !!(await p.$('#et-comm')));
    const before = await p.evaluate(() => [...document.querySelectorAll('#cc-staff .ccs-set > details > summary')].map(s => s.textContent.trim().split(/\s{2,}|\n/)[0]));
    check('Communications sits before Team and access', before.findIndex(t => /^Communications/.test(t)) > -1 && (before.findIndex(t => /^Team and access/.test(t)) < 0 || before.findIndex(t => /^Communications/.test(t)) < before.findIndex(t => /^Team and access/.test(t))), before);
    await click(p, '#et-comm summary', 300);
    await shot(p, '01-settings-entry');
    await click(p, '#cc-staff [data-et="open"]', 900);
    const rows = await p.$$eval('#et-ov .et-row-t', r => r.map(x => x.textContent));
    check('library lists the 8 customer emails', rows.length === 8, rows);
    check('every email shows Standard wording to start', (await p.$$eval('#et-ov .et-row', r => r.filter(x => /Standard wording/.test(x.textContent)).length)) === 8);
    await shot(p, '02-library');
    await click(p, '#et-ov [data-et="edit"][data-k="guest_confirmed"]', 1500);
    const subj = await p.$eval('#et-ov [data-box="subject"]', e => e.innerText);
    check('editor starts from the standard subject, with the order number as a chip', /Your cake order is confirmed/.test(subj) && /Order number/.test(subj), subj);
    check('no {{codes}} on screen', !(await p.$eval('#et-ov .et-form', e => /\{\{/.test(e.innerText))));
    await p.waitForSelector('#et-ov .et-frame', { timeout: 5000 });
    await p.waitForTimeout(600);
    const fr = await p.$eval('#et-ov .et-frame', f => ({ imgs: [...f.contentDocument.images].map(i => i.alt), h: f.offsetHeight, text: f.contentDocument.body.innerText }));
    check('preview: only the Corner Café logo, no cake photo', fr.imgs.length === 1 && fr.imgs[0] === 'Corner Café', fr.imgs);
    check('preview shows the made-up order', /CC-1042/.test(fr.text) && /Mocha/.test(fr.text), fr.text.slice(0, 200));
    check('preview frame fits the email (no inner scroll)', fr.h > 700, fr.h);
    await shot(p, '03-editor-desktop');
    // type a new heading with a field
    await p.click('#et-ov [data-box="heading"]'); await p.keyboard.press('ControlOrMeta+a'); await p.keyboard.type('Great news ');
    await click(p, '#et-ov [data-et="ins"][data-b="heading"]', 300);
    check('Insert field list opens', !!(await p.$('#et-ov .et-pop')));
    await shot(p, '04-insert-field');
    await click(p, '#et-ov .et-pop [data-f="customer_name"]', 300);
    await p.keyboard.type(', your cake is booked in');
    await p.waitForTimeout(1300);
    const heading = await p.$eval('#et-ov .et-frame', f => f.contentDocument.querySelector('h1, div[style*="Georgia"]').textContent);
    check('preview updates with the customer name filled in', /Great news\s+Mere, your cake is booked in/.test(heading), heading);
    check('unsaved edits kept on this device', await p.evaluate(() => !!localStorage.getItem('cc-et-unsaved-guest_confirmed')));
    // bold in the main message
    await p.click('#et-ov [data-box="intro"]'); await p.keyboard.press('End'); await p.keyboard.type(' See you soon.');
    await p.waitForTimeout(1200);
    // save draft
    await click(p, '#et-ov [data-et="save"]', 900);
    let db = await p.evaluate(() => window.__etDB.V);
    check('Save draft stores the wording with {{fields}}', db.length === 1 && db[0].status === 'draft' && /Great news \{\{customer_name\}\}, your cake is booked in/.test(db[0].heading), db);
    check('boxes left as the standard wording are stored empty', db[0].subject === null && db[0].preheader === null && db[0].label === null, db[0]);
    check('saved draft clears the device copy', !(await p.evaluate(() => localStorage.getItem('cc-et-unsaved-guest_confirmed'))));
    // test email
    await click(p, '#et-ov [data-et="test"]', 900);
    check('Send me a test reports the address', /Test sent to manager@example.com/.test(await p.$eval('#et-ov .et-note', e => e.textContent)));
    // publish
    p.once('dialog', d => d.accept());
    await click(p, '#et-ov [data-et="publish"]', 1500);
    db = await p.evaluate(() => window.__etDB.V);
    check('Publish makes version 1 the wording in use', db.length === 1 && db[0].status === 'published' && db[0].version === 1, db);
    check('status shows custom wording version 1', /Custom wording, version 1/.test(await p.$eval('#et-ov .et-state', e => e.textContent)));
    check('who and when shown, 12-hour time', /Published \d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (AM|PM) by Test Manager/.test(await p.$eval('#et-ov .et-form', e => e.innerText)), await p.$eval('#et-ov .et-form', e => e.innerText.slice(0, 300)));
    await shot(p, '05-published');
    // an unknown field blocks publishing
    await p.evaluate(() => { const b = document.querySelector('#et-ov [data-box="closing"]'); b.innerHTML = '<p>Code {{discount_code}}</p>'; b.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.waitForTimeout(1300);
    check('unknown field flagged in the preview', /not known/.test(await p.$eval('#et-ov .et-preview', e => e.innerText)));
    await click(p, '#et-ov [data-et="publish"]', 500);
    check('publish blocked while an unknown field is in', /Remove the unknown fields/.test(await p.$eval('#et-ov .et-note', e => e.textContent)) && (await p.evaluate(() => window.__etDB.V.filter(v => v.status === 'published').length)) === 1);
    // history, standard wording, bring back
    p.once('dialog', d => d.accept());
    await click(p, '#et-ov [data-et="standard"]', 1200);
    check('Go back to the standard wording archives version 1', (await p.evaluate(() => window.__etDB.V.filter(v => v.status === 'published').length)) === 0);
    await click(p, '#et-ov [data-et="hist"]', 600);
    check('version history lists version 1 as archived', /Version 1\s*Archived/.test(await p.$eval('#et-ov .et-hist', e => e.innerText)));
    p.once('dialog', d => d.accept());
    await click(p, '#et-ov [data-et="copy"]', 1200);
    const d2 = await p.evaluate(() => window.__etDB.V.filter(v => v.status === 'draft')[0]);
    check('Use this wording makes a new draft from version 1', d2 && d2.version === 2 && /Great news/.test(d2.heading) && d2.note === 'From version 1', d2);
    check('the editor shows the restored wording', /Great news/.test(await p.$eval('#et-ov [data-box="heading"]', e => e.innerText)));
    // the thank-you switch, and order emails cannot be switched off
    await click(p, '#et-ov [data-et="list"]', 500);
    await click(p, '#et-ov [data-et="edit"][data-k="guest_thanks"]', 1200);
    p.once('dialog', d => d.accept());
    await click(p, '#et-ov [data-et="switch"]', 900);
    check('thank-you email can be switched off', (await p.evaluate(() => window.__etDB.SW.guest_thanks)) === false);
    await click(p, '#et-ov [data-et="list"]', 500);
    check('library shows it switched off', /Switched off/.test(await p.$eval('#et-ov [data-k="guest_thanks"]', e => e.textContent)));
    check('order emails have no switch', !(await p.$('#et-ov [data-k="guest_confirmed"] .et-off')));
    await click(p, '#et-ov [data-et="edit"][data-k="guest_cancelled"]', 1000);
    check('cancelled email: no switch in the editor', !(await p.$('#et-ov [data-et="switch"]')));
    check('no banner line box where the email has no banner', !(await p.$('#et-ov [data-box="tagline"]')));
    // leave midway and come back
    await p.click('#et-ov [data-box="heading"]'); await p.keyboard.type(' (please read)');
    await p.waitForTimeout(200);
    p.once('dialog', d => d.accept());
    await click(p, '#et-ov [data-et="close"]', 400);
    check('closing keeps the window state hidden', await p.$eval('#et-ov', e => e.hidden));
    // (the test harness leaves Settings blank on a second visit, on the live bundle too, so reopen directly)
    await p.evaluate(() => window.CCEmailTemplates.open()); await p.waitForTimeout(1400);
    check('library flags unsaved changes on this device', /Unsaved changes on this device/.test(await p.$eval('#et-ov [data-k="guest_cancelled"]', e => e.textContent)));
    await click(p, '#et-ov [data-et="edit"][data-k="guest_cancelled"]', 1000);
    check('carries on where staff stopped', /\(please read\)/.test(await p.$eval('#et-ov [data-box="heading"]', e => e.innerText)) && /Carrying on/.test(await p.$eval('#et-ov .et-note', e => e.textContent)));
    // database failure: a clear message, nothing lost
    await p.evaluate(() => { window.__etFail = 'email_tpl_save'; });
    await click(p, '#et-ov [data-et="save"]', 800);
    check('a failed save says so and keeps the edits', /not saved|Failed/.test(await p.$eval('#et-ov .et-note', e => e.textContent)) && /\(please read\)/.test(await p.$eval('#et-ov [data-box="heading"]', e => e.innerText)));
    check('manager journey: no page errors', !errors.length, errors);
    await ctx.close(); }

  // 3. iPad landscape and portrait, phone: sizes from the touch standard
  for (const [w, h, label] of [[1180, 820, 'iPad landscape'], [820, 1180, 'iPad portrait'], [390, 844, 'phone']]) {
    const { ctx, p, errors } = await open(w, h, 'manager', true);
    await p.evaluate(() => window.CCEmailTemplates.open('guest_received'));
    await p.waitForTimeout(1600);
    const m = await p.evaluate(() => {
      const q = s => document.querySelector('#et-ov ' + s), r = e => e.getBoundingClientRect();
      const btn = q('[data-et="publish"]'), box = q('[data-box="subject"]'), body = getComputedStyle(q('.et-box')).fontSize, ins = q('[data-et="ins"]');
      return { btnH: r(btn).height, boxH: r(box).height, body, insH: r(ins).height, tabs: getComputedStyle(q('.et-tabs')).display, overflowX: document.documentElement.scrollWidth > innerWidth, barBottom: r(q('.et-bar')).bottom, vh: innerHeight };
    });
    const tablet = w >= 760;
    check(label + ': main buttons ' + (tablet ? '56' : '48') + 'px or more', m.btnH >= (tablet ? 55.5 : 47.5), m);
    check(label + ': text boxes ' + (tablet ? '56' : '52') + 'px or more', m.boxH >= (tablet ? 55.5 : 51.5), m);
    check(label + ': body text ' + (tablet ? '20' : '18') + 'px', m.body === (tablet ? '20px' : '18px'), m.body);
    check(label + ': Insert field ' + (tablet ? '54' : '48') + 'px tall', m.insH >= (tablet ? 53.5 : 47.5), m.insH);
    check(label + ': ' + (w >= 1100 ? 'edit and preview side by side' : 'Edit and Preview tabs'), (m.tabs === 'none') === (w >= 1100), m.tabs);
    check(label + ': actions fixed at the bottom of the screen', Math.abs(m.barBottom - m.vh) < 2, m);
    check(label + ': no sideways scrolling', !m.overflowX);
    await shot(p, '06-' + label.replace(/\s/g, '-') + '-edit');
    if (w < 1100) { await click(p, '#et-ov [data-et="pane"][data-v="preview"]', 1200); await click(p, '#et-ov [data-et="device"][data-v="mobile"]', 500); await shot(p, '07-' + label.replace(/\s/g, '-') + '-preview'); }
    if (w < 760) { await click(p, '#et-ov [data-et="pane"][data-v="edit"]', 300); await click(p, '#et-ov [data-et="ins"][data-b="subject"]', 400);
      const pop = await p.$eval('#et-ov .et-pop', e => { const r = e.getBoundingClientRect(); return { bottom: r.bottom, left: r.left, w: r.width }; });
      check('phone: Insert field is a bottom sheet', Math.abs(pop.bottom - 844) < 2 && pop.left === 0 && pop.w === 390, pop);
      await shot(p, '08-phone-insert-field'); }
    check(label + ': no page errors', !errors.length, errors);
    await ctx.close();
  }
  await b.close();
  console.log('\n' + n + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
