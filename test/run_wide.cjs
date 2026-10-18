// Wide screens: island previews and two-column cards. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-wide-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
async function open(b,w,h,tab){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!/reading '(length|filter)'/.test(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin';try{localStorage.clear()}catch(e){}});await p.addScriptTag({path:path.join(root,'test/mock.js')});
 await p.evaluate(()=>{const T=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date());['23:00','23:15','23:30','23:45'].forEach((t,i)=>window.__orders.push({id:'x'+i,reference:'CC-19'+i,order_status:'confirmed',production_status:'not_started',payment_status:'unpaid',fulfilment_method:'collection',order_type:'standard',source:'phone',created_at:new Date().toISOString(),required_date:T,required_time:t+':00',estimate_total:50,final_total:50,has_dietary:false,version:1,customer_id:'c1',customers:{full_name:'Invented Guest'+i,phone:'1'},order_items:[{product_name:'Cheesecake',size_inch:6,quantity:1,finish:'standard'}],order_events:[],order_attachments:[],payments:[]}))});
 await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);await p.locator('[data-tab="'+tab+'"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label,twoCol] of [[2560,1440,'large monitor',true],[1920,1080,'desktop',true],[1512,862,'laptop',true],[1366,1024,'iPad landscape',false]]){
  const {p,errors}=await open(b,w,h,'attn');
  const prev=await p.locator('.ap-col .ap-island').evaluateAll(es=>es.map(e=>{const l=e.querySelectorAll('.wd-p').length,n=+e.querySelector('.ap-text b').textContent;return {l,n,more:(e.querySelector('.wd-more')||{}).textContent||''}}));
  check(label+' every island previews up to two orders',prev.every(x=>x.l===Math.min(2,x.n)),prev);
  check(label+' "+N more" when there are more',prev.every(x=>x.n<=2?!x.more:x.more==='+'+(x.n-2)+' more'),prev);
  check(label+' previews stay inside their island',await p.evaluate(()=>[...document.querySelectorAll('.wd-p')].every(e=>e.getBoundingClientRect().right<=e.closest('.ap-island').getBoundingClientRect().right+1)));
  const big=p.locator('.ap-col .ap-island').filter({hasText:'Kitchen not finished'});if(await big.count()){await big.first().click();await p.waitForTimeout(350)}
  const cols=await p.evaluate(()=>{const r=[...document.querySelectorAll('#ap-pane .at-row')].map(e=>Math.round(e.getBoundingClientRect().left));return new Set(r).size});
  check(label+(twoCol?' pane shows two columns of orders':' pane keeps one column'),twoCol?cols===2:cols===1,cols);
  check(label+' status pills sit under the cake details',await p.evaluate(()=>[...document.querySelectorAll('#ap-pane .ccs-mini')].every(c=>{const r=c.querySelector('.ccs-mini-r'),mm=c.querySelector('.ccs-mini-m');if(!r||!mm||!r.offsetParent)return true;return Math.abs(r.getBoundingClientRect().left-mm.getBoundingClientRect().left)<=4&&r.getBoundingClientRect().top>=mm.getBoundingClientRect().top})));
  check(label+' cards stay inside the pane',await p.evaluate(()=>{const pr=document.getElementById('ap-pane').getBoundingClientRect();return [...document.querySelectorAll('#ap-pane .at-row')].every(e=>{const r=e.getBoundingClientRect();return r.left>=pr.left-1&&r.right<=pr.right+1})}));
  check(label+' no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'/tmp/claude-wide-'+label.replace(/ /g,'-')+'.png'});
  check(label+' no script errors',errors.length===0,errors);await p.close();
  const {p:q,errors:e2}=await open(b,w,h,'handover');await q.locator('.ix-wrap .ap-island').nth(1).click();await q.waitForTimeout(350);
  check(label+' handover pane pills under details',await q.evaluate(()=>[...document.querySelectorAll('#ap-pane .ccs-mini')].every(c=>{const r=c.querySelector('.ccs-mini-r'),mm=c.querySelector('.ccs-mini-m');if(!r||!mm||!r.offsetParent)return true;return Math.abs(r.getBoundingClientRect().left-mm.getBoundingClientRect().left)<=4})));
  await q.screenshot({path:'/tmp/claude-wide-ho-'+label.replace(/ /g,'-')+'.png'});check(label+' handover no script errors',e2.length===0,e2);await q.close()}
 for(const [w,h,label] of [[1024,1366,'iPad portrait'],[390,844,'phone']]){const {p}=await open(b,w,h,'attn');check(label+' no previews on islands (unchanged)',await p.locator('.wd-prev').count()===0);await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
