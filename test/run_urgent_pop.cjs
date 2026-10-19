// Urgent pop-up (19 October 2026): every urgent order listed, no Needs attention link, rows never overlap.
// Invented data; remote requests blocked. Adds four overdue unpaid orders to the standard mock.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-urgent-pop-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
const extra=['Mere','Naz','Bhavin Khatri','Shania Kumar'].map((nm,i)=>`{ id:'ov${i}', reference:'CC-10${45+i}', order_status:'confirmed', production_status:'ready', payment_status:'${i%2?'deposit_paid':'unpaid'}', fulfilment_method:'collection', order_type:'standard', source:'phone', created_at:new Date().toISOString(), required_date:add(-${1+(i%2)}), required_time:'15:00:00', estimate_total:80, final_total:80, has_dietary:false, version:1, customer_id:'c1', customers:{ id:'c1', full_name:'${nm}', phone:'+679 700 000${i}' }, order_items:[{ product_name:'Red Velvet', size_inch:8, quantity:1, finish:'standard', occasion:'Birthday' }], order_events:[], order_attachments:[], payments:[] }`).join(',\n');
const mockSrc=fs.readFileSync(path.join(root,'test/mock.js'),'utf8');const anchor='  orders.forEach(function (o) { if (o.contact_email';
if(mockSrc.split(anchor).length!==2)throw Error('mock anchor');const mock=mockSrc.replace(anchor,'  orders.push('+extra+');\n'+anchor);
async function open(b,w,h){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({content:mock});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
 await p.locator('[data-tab="today"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1920,1080,'desktop'],[1366,1024,'ipad-landscape'],[1024,1366,'ipad-portrait'],[412,915,'phone'],[360,780,'small-phone']]){
  const {p,errors}=await open(b,w,h);const isl=p.locator('.tq-warn .tx-islands .ap-island');
  const total=+(await isl.first().locator('.ap-text>b').innerText());check(label+': Urgent island shows 5 (4 overdue + mock)',total===5,total);
  check(label+': no See all link on the Today card',await p.locator('.tq-warn .tq-more').count()===0);
  await isl.first().click();await p.waitForTimeout(400);
  const rows=p.locator('#ap-pop .tq-w');check(label+': pop-up lists every urgent order',await rows.count()===total,await rows.count());
  check(label+': header says no "first 3 shown"',!/shown/.test(await p.locator('#ap-pop .ap-pop-title span').innerText()));
  check(label+': no Needs attention link',await p.locator('#ap-pop .tx-all').count()===0&&!/Needs attention for everything/.test(await p.locator('#ap-pop').innerText()));
  const geo=await p.evaluate(()=>[...document.querySelectorAll('#ap-pop .tq-w')].map(r=>{const rb=r.getBoundingClientRect();const kids=[...r.children].filter(k=>k.tagName!=='I').map(k=>k.getBoundingClientRect());return {top:rb.top,bottom:rb.bottom,inside:kids.every(k=>k.top>=rb.top-0.5&&k.bottom<=rb.bottom+0.5)}}));
  check(label+': every row contains its own text',geo.every(g=>g.inside),geo);
  check(label+': rows do not overlap',geo.every((g,i)=>i===0||g.top>=geo[i-1].bottom-0.5));
  check(label+': overdue rows show when and what to do',await p.evaluate(()=>{const r=[...document.querySelectorAll('#ap-pop .tq-w')].find(x=>/CC-1045/.test(x.textContent));return !!r&&/^Overdue since/.test(r.querySelector('.up-when').textContent)&&/Hand over, cancel or change the date/.test(r.querySelector('.up-do').textContent)}));
  check(label+': unpaid overdue shows Collect balance first tag',await p.evaluate(()=>{const r=[...document.querySelectorAll('#ap-pop .tq-w')].find(x=>/CC-1045/.test(x.textContent));return !!r&&/Collect balance first/.test(r.textContent)&&!/Take the balance first/.test(r.textContent)}));
  check(label+': nothing truncated with ellipsis',await p.evaluate(()=>[...document.querySelectorAll('#ap-pop .tq-w span')].every(s=>s.scrollHeight<=s.clientHeight+1&&s.scrollWidth<=s.clientWidth+1)));
  check(label+': pop-up fits the screen (scrolls inside)',await p.evaluate(()=>{const r=document.getElementById('ap-pop').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}));
  const last=rows.last();await last.scrollIntoViewIfNeeded();check(label+': last order reachable',await last.isVisible());
  await p.screenshot({path:shots+'/urgent-pop-'+label+'.png'});
  await rows.first().evaluate(e=>e.click());await p.waitForTimeout(500);check(label+': tapping a row opens the order',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')}));
  await p.keyboard.press('Escape');await p.waitForTimeout(300);await p.keyboard.press('Escape');await p.waitForTimeout(300);check(label+': Escape closes order then pop-up',await p.locator('#ap-pop').count()===0);
  await isl.nth(1).click();await p.waitForTimeout(300);check(label+': To do opens with all its rows',await p.locator('#ap-pop .tq-w').count()===+(await isl.nth(1).locator('.ap-text>b').innerText()));
  check(label+': no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
