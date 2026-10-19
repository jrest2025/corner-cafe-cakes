// Delete customer (20 October 2026). Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-customer-delete-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
let mock=fs.readFileSync(path.join(root,'test/mock.js'),'utf8');
const rep=(a,b)=>{if(mock.split(a).length!==2)throw Error('anchor '+a.slice(0,40));mock=mock.replace(a,b)};
// c3: a customer with only past orders.
rep("  var prof = {\n","  var prof = {\n    c3: { id: 'c3', customer_no: 103, full_name: 'Test Customer C', phone: '912 0003', alt_phone: null, email: null, preferred_contact: 'whatsapp', is_corporate: false, company: null, delivery_address: null, birth_day: null, birth_month: null, preferences: null, notes: null, version: 4, review_flag: null, review_note: null, archived_at: null, merged_into: null, customer_source: 'staff_order' },\n");
rep("  orders.forEach(function (o) { if (o.contact_email","  orders.push({ id: 'o90', reference: 'CC-0990', order_status: 'completed', production_status: 'ready', payment_status: 'paid', fulfilment_method: 'collection', order_type: 'standard', source: 'phone', created_at: new Date().toISOString(), required_date: add(-30), required_time: '12:00:00', estimate_total: 60, final_total: 60, has_dietary: false, version: 2, customer_id: 'c3', customers: { id: 'c3', full_name: 'Test Customer C', phone: '912 0003' }, order_items: [{ product_name: 'Red Velvet', size_inch: 8, quantity: 1, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] });\n  orders.forEach(function (o) { if (o.contact_email");
rep("      calls.push(['rpc', fn, args]);\n      if (fn === 'get_order_setup')","      calls.push(['rpc', fn, args]);\n      if (fn === 'customer_delete') { window.__cdCalls = (window.__cdCalls || []).concat([args]); if (window.__cdErr) return Promise.resolve({ error: { message: window.__cdErr } }); return Promise.resolve({ data: window.__cdResp || { ok: true, customer_no: 103, orders_kept: 1 } }); }\n      if (fn === 'get_order_setup')");
async function open(b,w,h,role,cid){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(r=>{window.__role=r;try{localStorage.clear()}catch(e){}},role);
 await p.addScriptTag({content:mock});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
 await p.locator('[data-tab="customers"]').first().evaluate(e=>e.click());await p.waitForTimeout(500);
 await p.evaluate(id=>{const b=document.createElement('button');b.setAttribute('data-act','open-customer');b.setAttribute('data-id',id);document.getElementById('ccs-main').appendChild(b);b.click();b.remove()},cid);await p.waitForTimeout(800);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[412,915,'phone']]){
  {const {p,errors}=await open(b,w,h,'manager','c3');
   check(label+': profile open',await p.locator('#ccs-sheet .ccs-sheet-body').count()===1);
   const ask=p.locator('#ccs-sheet [data-cd="ask"]');check(label+': manager sees Delete customer',await ask.count()===1);
   check(label+': button is at the end of the profile',await p.evaluate(()=>{const z=document.querySelector('#ccs-sheet .cd-zone');return !!z&&z===z.parentNode.lastElementChild}));
   await ask.click();await p.waitForTimeout(200);
   check(label+': confirm names the customer',/Delete C-103 Test Customer C\?/.test(await p.locator('.cd-zone h3').innerText()));
   check(label+': confirm says past orders are kept',/1 past order stays in sales figures/.test(await p.locator('.cd-zone').innerText()));
   check(label+': confirm says it cannot be undone',/cannot be undone/.test(await p.locator('.cd-zone').innerText()));
   await p.screenshot({path:shots+'/cd-confirm-'+label+'.png'});
   await p.locator('[data-cd="cancel"]').click();await p.waitForTimeout(150);check(label+': Cancel goes back, nothing sent',await p.locator('[data-cd="ask"]').count()===1&&!(await p.evaluate(()=>window.__cdCalls)));
   await p.locator('[data-cd="ask"]').click();await p.locator('[data-cd="reason"][data-r="Left the country"]').click();await p.waitForTimeout(100);
   check(label+': reason chip selected',(await p.locator('[data-cd="reason"][data-r="Left the country"]').getAttribute('aria-pressed'))==='true');
   await p.evaluate(()=>{window.__cdResp={ok:false,error:'changed',message:'Someone changed this customer while you had it open. Close it, open it again, then delete.'}});
   await p.locator('[data-cd="go"]').click();await p.waitForTimeout(300);
   check(label+': server refusal shown, profile stays open',/Someone changed this customer/.test(await p.locator('.cd-zone').innerText())&&await p.locator('#ccs-sheet .ccs-sheet-body').count()===1);
   await p.evaluate(()=>{window.__cdResp=null;window.__cdErr='DELETE requires a WHERE clause'});
   await p.locator('[data-cd="go"]').click();await p.waitForTimeout(300);
   check(label+': database refusal shows its real reason, not the internet',/not deleted\. DELETE requires a WHERE clause/.test(await p.locator('.cd-zone').innerText())&&!/internet/.test(await p.locator('.cd-zone').innerText()));
   await p.evaluate(()=>{window.__cdErr=null});
   await p.locator('[data-cd="go"]').click();await p.waitForTimeout(600);
   const call=(await p.evaluate(()=>window.__cdCalls))||[];const last=call[call.length-1]||{};
   check(label+': sends id, version and reason',last.p_customer==='c3'&&last.p_version===4&&last.p_reason==='Left the country',last);
   check(label+': profile closes after delete',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !s||!s.classList.contains('ccs-open')}));
   {const tt=await p.evaluate(()=>[...document.querySelectorAll('[role=status],#ccs-toast')].map(e=>e.id+':'+e.textContent).join(' | '));check(label+': confirmation message',/Customer deleted\. 1 past order kept/.test(tt),tt)}
   check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
  {const {p,errors}=await open(b,w,h,'manager','c1');
   await p.locator('[data-cd="ask"]').click();await p.waitForTimeout(200);
   check(label+': open orders block delete',/open orders?\. Complete or cancel/.test(await p.locator('.cd-zone').innerText())&&await p.locator('[data-cd="go"]').count()===0);
   await p.screenshot({path:shots+'/cd-blocked-'+label+'.png'});
   check(label+': no script errors (blocked)',errors.length===0);await p.close()}
  {const {p}=await open(b,w,h,'front_of_house','c3');
   check(label+': front of house does not see Delete',await p.locator('#ccs-sheet .ccs-sheet-body').count()===1&&await p.locator('[data-cd="ask"]').count()===0);await p.close()}
 }}finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
