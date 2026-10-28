// Cake Enquiries phase 1 (28 Oct 2026). Live bundle + live add-ons, mock database (an in-page copy of the enquiry
// functions' rules; the real SQL is tested separately on a private Postgres). Invented data only.
const fs = require('fs');
const { open, tap, chromium } = require('./harness.cjs');
const C = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap = f => f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/, '@' + C + '/dist/app/staff-app.d1c119f6f0.js');
const add = n => '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.' + n + '.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const base = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') + add('enquiries');
const S = process.env.S || '/tmp';
const post = `(function(){
 var E=[], V=[], n=1000, O={'birthday':'Birthday','wedding':'Wedding','anniversary':'Anniversary'};
 var key=function(p){var d=String(p||'').replace(/\\D/g,'');return d.length===7?'679'+d:d.length===8&&d[0]==='0'?'679'+d.slice(1):d||null};
 var open=function(s){return ['new','discussion','quoted','follow_up'].indexOf(s)>-1};
 var js=function(e){var o=JSON.parse(JSON.stringify(e));o.occasion_label=O[e.occasion_code]||null;o.order_reference=e.order_id?'CC-1009':null;o.display_name=e.contact_name||(e.contact_phone_key?e.contact_phone_key.slice(3,6)+' '+e.contact_phone_key.slice(6):e.reference);return o};
 var ev=function(e,k,f,t,note,data){V.push({id:V.length+1,eid:e.id,at:new Date().toISOString(),by:'Test Manager',kind:k,from:f,to:t,note:note||null,data:data||null})};
 var err=function(c,m,x){return Object.assign({ok:false,error:c,message:m},x||{})};
 window.__enq=E; window.__enqCalls=[];
 var o=window.__ccsMock.rpc.bind(window.__ccsMock);
 window.__ccsMock.rpc=function(fn,a){ if(fn.indexOf('enquiry_')!==0)return o(fn,a); window.__enqCalls.push([fn,a]); var r=(function(){
  if(fn==='enquiry_list'){var rows=E.filter(function(e){return a.p_view==='all'||(a.p_view==='open'?open(e.status):e.status===a.p_view)}).filter(function(e){var q=(a.p_q||'').toLowerCase();return !q||(e.contact_name||'').toLowerCase().indexOf(q)>-1||(e.reference.toLowerCase().indexOf(q)===0)||(e.contact_phone_key||'').indexOf(q.replace(/\\D/g,''))>-1&&q.replace(/\\D/g,'').length>=4}).slice().reverse();
   return {ok:true,rows:rows.map(js),counts:{open:E.filter(function(e){return open(e.status)}).length,new:E.filter(function(e){return e.status==='new'}).length,converted:E.filter(function(e){return e.status==='converted'}).length,closed:E.filter(function(e){return e.status==='closed'}).length,all:E.length}}}
  var find=function(id){return E.filter(function(e){return e.id===id})[0]};
  if(fn==='enquiry_get'){var e=find(a.p_id);if(!e)return err('not_found','gone');return {ok:true,enquiry:js(e),events:V.filter(function(v){return v.eid===e.id}).slice().reverse(),order:e.order_id?{id:e.order_id,reference:'CC-1009',required_date:null}:null,customer:null,others:[],candidates:window.__cand&&open(e.status)?[{id:'o7',reference:'CC-1007',required_date:null}]:[]}}
  if(fn==='enquiry_save'){var p=a.p;
   if(!p.id){ if(p.idem&&E.some(function(e){return e.idem===p.idem}))return {ok:true,enquiry:js(E.filter(function(e){return e.idem===p.idem})[0]),repeat:true};
    var k=key(p.contact_phone); if(!(p.contact_name||'').trim()&&!k)return err('contact','Add a name or a phone number.');
    if(p.required_date&&p.required_date<new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date()))return Object.assign(err('date','The pickup date has already passed.'),{field:'required_date'});
    if(!p.force&&k){var m=E.filter(function(e){return open(e.status)&&e.contact_phone_key===k});if(m.length)return err('duplicate','dup',{matches:m.map(js)})}
    var q=p.quoted_value!=null&&p.quoted_value!==''?Number(p.quoted_value):null;
    var e={id:'e'+(++n),reference:'EQ-'+n,contact_name:(p.contact_name||'').trim()||null,contact_phone:p.contact_phone||null,contact_phone_key:k,contact_other:p.contact_other||null,source:p.source||'unknown',campaign:p.campaign||null,occasion_code:p.occasion_code||null,required_date:p.required_date||null,cake_note:(p.cake_note||'').trim()||null,notes:p.notes||null,quoted_value:q,status:q!=null?'quoted':'new',order_id:null,created_by_name:'Test Manager',created_at:new Date().toISOString(),version:1,idem:p.idem};
    E.push(e); ev(e,'created',null,e.status); return {ok:true,enquiry:js(e)}; }
   var e2=find(p.id); if(p.version!==e2.version)return err('conflict','changed',{enquiry:js(e2)});
   ['contact_name','contact_phone','cake_note','notes','campaign','occasion_code','required_date','source','contact_other'].forEach(function(f){if(f in p)e2[f]=p[f]||(f==='source'?'unknown':null)});
   if('quoted_value' in p){e2.quoted_value=p.quoted_value!=null?Number(p.quoted_value):null;if(e2.quoted_value!=null&&['new','discussion','follow_up'].indexOf(e2.status)>-1){var f0=e2.status;e2.status='quoted';ev(e2,'quote',f0,'quoted',null,{value:e2.quoted_value})}}
   e2.version++; return {ok:true,enquiry:js(e2)}}
  var e3=find(a.p_id);
  if(fn==='enquiry_set_status'){var f1=e3.status;e3.status=a.p_status;e3.version++;ev(e3,'status',f1,a.p_status);return {ok:true,enquiry:js(e3)}}
  if(fn==='enquiry_note'){if(a.p_contact)e3.last_contact_at=new Date().toISOString();e3.version++;ev(e3,a.p_contact?'contact':'note',null,null,a.p_note);return {ok:true,enquiry:js(e3)}}
  if(fn==='enquiry_close'){var f2=e3.status;e3.status='closed';e3.close_reason=a.p_reason;e3.close_reason_by=a.p_reason_by;e3.close_note=a.p_note;e3.version++;ev(e3,'close',f2,'closed',a.p_note,{reason:a.p_reason});return {ok:true,enquiry:js(e3)}}
  if(fn==='enquiry_reopen'){e3.status='follow_up';e3.close_reason=null;e3.version++;ev(e3,'reopen','closed','follow_up');return {ok:true,enquiry:js(e3)}}
  if(fn==='enquiry_link_order'){if(e3.status==='converted'){return e3.order_id===a.p_order?{ok:true,enquiry:js(e3),repeat:true}:err('already','This enquiry is already linked to order CC-1009.')}
   var f3=e3.status;e3.status='converted';e3.order_id=a.p_order;e3.version++;ev(e3,'convert',f3,'converted',null,{order:'CC-1009'});return {ok:true,enquiry:js(e3)}}
  return err('unknown','?')})(); return Promise.resolve({data:r}); };
})();`;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 500) : '')); } };
const modal = p => p.evaluate(() => { const c = document.querySelector('#cce-m .cce-card'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
const fiji = o => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(Date.now() + o * 864e5));
(async () => {
  const b = await chromium.launch();
  const { p, errors } = await open(b, 1440, 900, { footBase: swap, extraFoot: base, post, role: 'front_of_house' });
  await p.waitForTimeout(3000);
  await tap(p, '#cc-staff .ccs-side [data-tab="orders"]', 1500);
  const s0 = await p.evaluate(() => ({ tab: !!document.querySelector('#ccs-main .ccs-tabs .cce-tab'), btn: !!document.querySelector('#ccs-main .ccs-head-acts .cce-newbtn'), flow: !!(window.CCOrderFlow && window.CCOrderFlow.__cce) }));
  check('Orders: Enquiries tab and New enquiry button beside New order (counter staff)', s0.tab && s0.btn, s0);
  check('hooks into the New order screen', s0.flow, s0);
  // 1. Walk-in, name only
  await tap(p, '#ccs-main .ccs-head-acts .cce-newbtn', 500);
  await p.screenshot({ path: S + '/eq-new.png' });
  await p.fill('#cce-f-name', 'Mere'); await p.click('[data-cce-src="walk_in"]'); await p.click('[data-cce="save"]'); await p.waitForTimeout(600);
  let m = await modal(p);
  check('walk-in saved with only a name: shows Cake not decided, No quote yet, Walk-in, taken by', /EQ-1001/.test(m) && /Not decided/.test(m) && /No quote yet/.test(m) && /Walk-in/.test(m) && /Test Manager/.test(m), m);
  await p.click('[data-cce="x"]'); await p.waitForTimeout(300);
  await tap(p, '#ccs-main .ccs-tabs .cce-tab', 900);
  const l1 = await p.evaluate(() => ({ on: document.querySelector('#ccs-main').classList.contains('cce-on'), rows: document.querySelectorAll('.cce-row').length, orderList: [...document.querySelectorAll('#ccs-main > .ccs-list, #ccs-main > .ccs-day')].filter(x => x.getClientRects().length).length, tabTxt: document.querySelector('.cce-tab').textContent }));
  check('Enquiries tab: list replaces the orders, count on the tab', l1.on && l1.rows === 1 && l1.orderList === 0 && /1/.test(l1.tabTxt), l1);
  // 2. Nothing entered: refused
  await tap(p, '.cce-bar .cce-newbtn', 400); await p.click('[data-cce="save"]'); await p.waitForTimeout(300);
  check('empty enquiry refused with a plain message', /Add a name or a mobile/.test(await modal(p) || ''));
  // 3. Phone enquiry with partial info + quote → Quoted
  await p.fill('#cce-f-phone', '925 1111'); await p.click('[data-cce-src="phone"]'); await p.evaluate(v => { const d = document.getElementById('cce-f-date'); d.value = v; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); }, fiji(9)); await p.selectOption('#cce-f-occ', 'birthday'); await p.fill('#cce-f-cake', 'Chocolate, 8 inch');
  await p.click('.cce-more > summary'); await p.fill('#cce-f-quote', '85'); await p.click('[data-cce="save"]'); await p.waitForTimeout(600);
  m = await modal(p);
  check('phone enquiry with a price: status Quoted, $85, Birthday, date shown', /Quoted/.test(m) && /\$85/.test(m) && /Birthday/.test(m) && /Chocolate, 8 inch/.test(m), m);
  await p.screenshot({ path: S + '/eq-view.png' });
  // 4. same phone again: duplicate prompt
  await p.click('[data-cce="x"]'); await tap(p, '.cce-bar .cce-newbtn', 400); await p.fill('#cce-f-phone', '9251111'); await p.click('[data-cce="save"]'); await p.waitForTimeout(500);
  m = await modal(p);
  check('same customer again: shows the open enquiry instead of counting twice', /already have an open enquiry/.test(m || '') && /EQ-1002/.test(m) && /Save as a new enquiry/.test(m), m);
  await p.click('[data-cce="x"]'); await p.waitForTimeout(300);
  // 5. Past date refused
  await tap(p, '.cce-bar .cce-newbtn', 400); await p.fill('#cce-f-name', 'Old date'); await p.evaluate(() => { const d = document.getElementById('cce-f-date'); d.removeAttribute('min'); d.value = '2020-01-01'; }); await p.click('[data-cce="save"]'); await p.waitForTimeout(400);
  check('past pickup date refused', /already passed/.test(await modal(p) || ''));
  await p.click('[data-cce="x"]'); await p.waitForTimeout(300);
  // 6. Follow up stage + log contact
  await p.evaluate(() => document.querySelector('.cce-row[data-cce-open="e1001"]').click()); await p.waitForTimeout(500);
  await p.selectOption('[data-cce="stage"]', 'follow_up'); await p.waitForTimeout(600);
  await p.click('[data-cce="note"]'); await p.fill('#cce-f-nt', 'Will decide Friday'); await p.click('[data-cce="savenote"]'); await p.waitForTimeout(600);
  m = await modal(p);
  check('stage set to Follow up and the call is logged (Last contact, history)', /Follow up/.test(m) && /Last contact/.test(m) && /History \(3\)/.test(m) && await p.evaluate(() => { const d = document.querySelector('.cce-hist'); d.open = true; return /Contacted the customer/.test(d.innerText) && /Will decide Friday/.test(d.innerText); }), m);
  // 7. Customer changes requirements
  await p.click('[data-cce="edit"]'); await p.fill('#cce-f-cake', 'Vanilla, 10 inch'); await p.click('[data-cce="save"]'); await p.waitForTimeout(600);
  check('details changed', /Vanilla, 10 inch/.test(await modal(p) || ''));
  // 8. Not ordered: price, customer said
  await p.click('[data-cce="close"]'); await p.click('[data-cce-reason="price"]'); await p.click('[data-cce-by="customer"]'); await p.screenshot({ path: S + '/eq-close.png' }); await p.click('[data-cce="saveclose"]'); await p.waitForTimeout(600);
  m = await modal(p);
  check('closed: Price too high, customer said; Reopen offered', /Not ordered/.test(m) && /Price too high/.test(m) && /customer said/.test(m) && /Reopen/.test(m), m);
  // 9. Reopen
  await p.click('[data-cce="reopen"]'); await p.waitForTimeout(600);
  check('reopened as Follow up', /Follow up/.test(await modal(p) || '') && /Convert to order/.test(await modal(p)));
  await p.click('[data-cce="x"]');
  // 10. Convert EQ-1002 to an order: New order screen filled in
  await p.evaluate(() => document.querySelector('.cce-row[data-cce-open="e1002"]').click()); await p.waitForTimeout(500);
  await p.click('[data-cce="convert"]'); await p.waitForTimeout(1800);
  const cv = await p.evaluate(() => ({ form: !!document.getElementById('ccs-slipform'), banner: (document.querySelector('.cce-conv') || {}).innerText, phone: (document.getElementById('n-phone') || {}).value, src: (document.querySelector('[data-act="n-source"][aria-pressed="true"]') || {}).textContent, date: (document.querySelector('#ccs-slipform') || {}).innerText }));
  check('Convert opens New order with phone and how they asked filled, and a banner with the cake and quote', cv.form && /Converting EQ-1002/.test(cv.banner || '') && /Chocolate, 8 inch/.test(cv.banner) && /\$85/.test(cv.banner) && /925/.test((cv.phone || '').replace(/\s/g, ' ')) && /Phone/.test(cv.src || ''), cv);
  await p.screenshot({ path: S + '/eq-convert.png' });
  const dr = await p.evaluate(() => { const k = Object.keys(localStorage).filter(x => /^ccs-draft-/.test(x))[0]; try { const v = JSON.parse(localStorage.getItem(k)); return { date: v.date, occasion: v.occasion, source: v.source, phone: v.phone }; } catch (e) { return null; } });
  check('the order in progress carries the pickup date, occasion and how they asked', dr && dr.date === fiji(9) && dr.occasion === 'Birthday' && dr.source === 'phone', dr);
  // the order is saved by the normal screen; its result reaches the add-on through CCOrderFlow.afterOrder
  await p.evaluate(() => window.CCOrderFlow.afterOrder({ __cce: 'e1002' }, { ok: true, order_id: 'o9', reference: 'CC-1009' })); await p.waitForTimeout(600);
  const lk = await p.evaluate(() => ({ st: window.__enq.filter(e => e.id === 'e1002')[0].status, calls: window.__enqCalls.filter(c => c[0] === 'enquiry_link_order').length }));
  check('after the order is saved, the enquiry is linked once and shows Ordered', lk.st === 'converted' && lk.calls === 1, lk);
  await p.evaluate(() => window.CCOrderFlow.afterOrder({ __cce: 'e1002' }, { ok: true, order_id: 'o10' })); await p.waitForTimeout(500);
  check('a second conversion of the same enquiry is refused (no double link)', await p.evaluate(() => window.__enq.filter(e => e.id === 'e1002')[0].order_id === 'o9'));
  // 11. Direct order without an enquiry: unchanged
  await p.evaluate(() => { sessionStorage.removeItem('cce-convert'); window.CCOrderFlow.afterOrder({}, { ok: true, order_id: 'o11' }); }); await p.waitForTimeout(300);
  check('direct orders are not linked to anything', await p.evaluate(() => window.__enqCalls.filter(c => c[0] === 'enquiry_link_order').length === 2));
  // 12. Already ordered elsewhere: link offered
  await tap(p, '#cc-staff .ccs-side [data-tab="orders"]', 1200); await tap(p, '#ccs-main .ccs-tabs .cce-tab', 900);
  await p.evaluate(() => { window.__cand = true; document.querySelector('.cce-row[data-cce-open="e1001"]').click(); }); await p.waitForTimeout(600);
  m = await modal(p);
  check('open enquiry shows "Already ordered? Link CC-1007" when that customer ordered since', /Already ordered/.test(m || '') && /Link CC-1007/.test(m), m);
  await p.click('[data-cce="x"]');
  // 13. Views and search
  await p.selectOption('[data-cce="view"]', 'converted'); await p.waitForTimeout(500);
  const v1 = await p.evaluate(() => [...document.querySelectorAll('.cce-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
  check('Ordered view lists the converted enquiry with its order number', v1.length === 1 && /CC-1009/.test(v1[0]) && /Ordered/.test(v1[0]), v1);
  await p.selectOption('[data-cce="view"]', 'all'); await p.fill('#cce-q', 'mere'); await p.waitForTimeout(800);
  check('search by name', await p.evaluate(() => document.querySelectorAll('.cce-row').length === 1));
  await p.screenshot({ path: S + '/eq-list.png' });
  // 14. Back to an order tab: orders return
  await p.fill('#cce-q', ''); await tap(p, '#ccs-main .ccs-tabs .ccs-tab:not(.cce-tab)', 900);
  const back = await p.evaluate(() => ({ on: document.querySelector('#ccs-main').classList.contains('cce-on'), panel: !!document.querySelector('.cce-panel') }));
  check('tapping an order tab brings the orders back', !back.on && !back.panel, back);
  check('no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
  // 15. iPad and phone
  for (const [w, h, t] of [[1180, 820, 'ipad'], [390, 844, 'phone']]) {
    const { p: q, errors: e2 } = await open(b, w, h, { footBase: swap, extraFoot: base, post, role: 'front_of_house', ipad: t === 'ipad' });
    await q.waitForTimeout(3000);
    await tap(q, '#cc-staff [data-tab="orders"]', 1500); await tap(q, '#ccs-main .ccs-tabs .cce-tab', 900);
    await tap(q, '.cce-bar .cce-newbtn', 500);
    const g = await q.evaluate(() => { const c = document.querySelector('#cce-m .cce-card').getBoundingClientRect(), b = document.querySelector('[data-cce="save"]').getBoundingClientRect(); return { side: document.documentElement.scrollWidth - innerWidth, bottom: Math.round(innerHeight - c.bottom), saveH: Math.round(b.height), saveIn: b.bottom <= innerHeight, chipH: Math.round(document.querySelector('[data-cce-src]').getBoundingClientRect().height) }; });
    check(t + ': form fits, Save in view, touch-size buttons, no sideways scroll' + (t === 'phone' ? ', bottom sheet' : ''), g.side <= 0 && g.saveIn && g.saveH >= 48 && g.chipH >= 44 && (t !== 'phone' || g.bottom <= 1), g);
    await q.screenshot({ path: S + '/eq-' + t + '.png' });
    check(t + ': no page errors', !e2.filter(e => !/length|filter|Unlisted/.test(e)).length, e2);
  }
  // 16. Practice mode: hidden
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
