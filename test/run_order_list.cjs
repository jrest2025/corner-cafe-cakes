// Order list: no repeated date on cards under a day heading; the year shows on headings far from today. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-order-list-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
// An overdue order from early this year (or late last year in January), like the live CC-1080.
const y0=new Date().getUTCFullYear(),old=(new Date().getUTCMonth()<3?(y0-1)+'-11-13':y0+'-01-13');
const mock=fs.readFileSync(path.join(root,'test/mock.js'),'utf8').replace("    { id: 'o4',","    { id: 'o99', reference: 'CC-1080', order_status: 'confirmed', production_status: 'not_started', payment_status: 'paid', fulfilment_method: 'collection', order_type: 'standard', source: 'phone', created_at: new Date().toISOString(), required_date: '"+old+"', required_time: '10:00:00', estimate_total: 50, final_total: 50, has_dietary: false, version: 1, customer_id: 'c2', customers: cust[1], order_items: [{ product_name: 'Cheesecake', size_inch: 6, quantity: 1, finish: 'standard' }], order_events: [], order_attachments: [], payments: [] },\n    { id: 'o4',");
if(!mock.includes('o99'))throw Error('mock anchor changed');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[820,1180,'ipad-portrait'],[412,915,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
  await p.addScriptTag({content:mock});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  await p.evaluate(()=>{const e=document.querySelector('[data-tab="orders"]');e&&e.click()});await p.waitForTimeout(500);
  await p.evaluate(()=>{const e=document.querySelector('[data-act="filter"][data-v="upcoming"]');e&&e.click()});await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const lists=[...document.querySelectorAll('.ccs-list.cc-grouped')];const cards=lists.flatMap(l=>[...l.querySelectorAll('.ccs-card')]);
   const shown=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
   return {lists:lists.length,heads:document.querySelectorAll('.ccs-day').length,cards:cards.length,
    dateShown:cards.filter(c=>shown(c.querySelector('.ccs-prow-t>b'))||shown(c.querySelector('.ccs-when>b'))).length,
    timeShown:cards.filter(c=>shown(c.querySelector('.ccs-prow-t>span'))||shown(c.querySelector('.ccs-when>span'))).length,
    years:[...document.querySelectorAll('.ccs-day .cc-yr')].length}});
  check(label+': upcoming list grouped under day headings',r.lists>=1&&r.heads===r.lists,r);
  check(label+': cards under a heading show no repeated date',r.cards>0&&r.dateShown===0,r);
  check(label+': every card still shows its time',r.timeShown===r.cards,r);
  check(label+': no year on headings close to today',r.years===0,r);
  await p.screenshot({path:shots+'/orders-'+label+'.png'});
  await p.evaluate(()=>{const e=document.querySelector('[data-act="filter"][data-v="recent"]');e&&e.click()});await p.waitForTimeout(400);
  // Find the old order wherever the app lists it (search by its order number).
  await p.fill('input[type="search"]','CC-1080');await p.waitForTimeout(700);
  const t=await p.evaluate(()=>[...document.querySelectorAll('.ccs-day')].map(e=>e.textContent));
  const card=await p.evaluate(()=>{const c=[...document.querySelectorAll('.ccs-card')].find(c=>/CC-1080/.test(c.textContent));if(!c)return null;const g=!!c.closest('.cc-grouped');const b=c.querySelector('.ccs-prow-t>b,.ccs-when>b');return {grouped:g,date:b&&getComputedStyle(b).display!=='none'?b.textContent:''}});
  check(label+': the old order is found',!!card,t);
  if(card&&card.grouped)check(label+': its heading shows the year',t.some(x=>x.includes(old.slice(0,4))),t);
  else if(card)check(label+': outside a day group the card keeps its date',!!card.date,card);
  check(label+': no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
