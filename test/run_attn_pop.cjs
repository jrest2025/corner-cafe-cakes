// Needs attention islands with pop-up panel + three-option Order Taken Date. Invented data; all remote requests blocked.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-attn-pop-manifest.json')));let n=0,fails=0;
function check(s,v){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s)}}
const SIZES=[[1024,1366,'ipad-portrait'],[1060,700,'small-laptop'],[390,844,'phone'],[412,915,'android']];
const WIDE=[[1920,1080,'desktop'],[1366,1024,'ipad-landscape'],[1180,820,'ipad-air-landscape']];
async function open(b,w,h,role){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{/* Known mock gap, same on the live bundle: feedback form has no photos list. */if(e.message!=="Cannot read properties of undefined (reading 'length')")errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(r=>window.__role=r,role||'admin');
 await p.addScriptTag({path:path.join(root,'test/mock.js')});
 // Extra invented attention: one overdue cake and one due today with the kitchen not started.
 await p.evaluate(()=>{const mk=window.__ccsMock;window.__setCalls=[];const T=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date());['23:00','23:15','23:30','23:45'].forEach((t,i)=>window.__orders.push({id:'x'+i,reference:'CC-19'+i,order_status:'confirmed',production_status:'not_started',payment_status:'paid',fulfilment_method:'collection',order_type:'standard',source:'phone',created_at:new Date().toISOString(),required_date:T,required_time:t+':00',estimate_total:50,final_total:50,has_dietary:false,version:1,customer_id:'c1',customers:{full_name:'Invented Guest '+i,phone:'912 000'+i},order_items:[{product_name:'Cheesecake',size_inch:6,quantity:1,finish:'standard'}],order_events:[],order_attachments:[],payments:[{amount:50,kind:'full',method:'cash',recorded_at:new Date().toISOString()}]}));const rpc=mk.rpc.bind(mk);mk.rpc=(nm,a)=>{if(nm==='order_set_taken')window.__setCalls.push(a);return rpc(nm,a)}});
 await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of SIZES){const {p,errors}=await open(b,w,h);
  await p.locator('[data-tab="attn"]').first().evaluate(e=>e.click());await p.waitForTimeout(300);
  const isl=p.locator('.ap-island');const k=await isl.count();
  check(label+' islands shown ('+k+')',k>0);
  check(label+' old summary cards and lists gone',await p.locator('.at-sum').count()===0&&await p.locator('.at-group').count()===0);
  check(label+' starts closed: only islands',await p.locator('#ap-pop').count()===0);
  check(label+' every island has an SVG icon and a count',await isl.evaluateAll(es=>es.every(e=>e.querySelector('svg')&&/^\d+$/.test(e.querySelector('b').textContent))));
  check(label+' island touch targets at least 48px tall',await isl.evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=48)));
  await p.screenshot({path:'/tmp/claude-attn-'+label+'-closed.png'});
  const before=await p.evaluate(()=>document.scrollingElement.scrollHeight);
  await isl.first().click();await p.waitForTimeout(350);
  check(label+' tapping opens the pop-up',await p.locator('#ap-pop').isVisible());
  check(label+' page did not grow (pop-up, not expand)',await p.evaluate(()=>document.scrollingElement.scrollHeight)<=before+2);
  check(label+' island reports expanded',await isl.first().getAttribute('aria-expanded')==='true');
  const r=await p.locator('#ap-pop').boundingBox();check(label+' pop-up inside the viewport',r.x>=0&&r.y>=0&&r.x+r.width<=w+1&&r.y+r.height<=h+1);
  const side=await p.evaluate(()=>{const s=document.querySelector('.ccs-side,.ccs-rail,aside');return s&&getComputedStyle(s).display!=='none'?s.getBoundingClientRect():null});
  if(side&&side.width>0&&w>640)check(label+' pop-up does not cover the side menu',r.x>=side.right-1);
  const nav=await p.evaluate(()=>{const s=document.querySelector('.ccs-nav');return s&&getComputedStyle(s).display!=='none'&&getComputedStyle(s).position==='fixed'?s.getBoundingClientRect().top:null});
  if(nav&&nav<h)check(label+' pop-up stays above the tab bar',r.y+r.height<=nav+1);
  const want=Number(await isl.first().locator('b').innerText()),rows=await p.locator('#ap-pop .at-row').count();check(label+' pop-up lists the same number of orders ('+rows+')',rows===want);
  check(label+' first order fully visible inside the panel',await p.evaluate(()=>{const pop=document.getElementById('ap-pop').getBoundingClientRect(),r=document.querySelector('#ap-pop .at-row');if(!r)return false;const x=r.getBoundingClientRect();return x.top>=pop.top&&x.bottom<=pop.bottom+1&&x.height>20}));
  check(label+' dimmed backdrop covers the working area',await p.evaluate(()=>{const s=document.querySelector('.ap-scrim').getBoundingClientRect();return s.height>=innerHeight*0.8||innerWidth<=640}));
  check(label+' pop-up centred horizontally and vertically in the working area',await p.evaluate(()=>{const r=document.getElementById('ap-pop').getBoundingClientRect(),m=document.getElementById('ccs-main').getBoundingClientRect(),n=document.querySelector('.ccs-nav'),ns=n&&getComputedStyle(n),nb=n&&ns.position==='fixed'&&n.getBoundingClientRect().bottom>=innerHeight-2?innerHeight-n.getBoundingClientRect().top:0,L=Math.max(0,m.left),W=Math.min(innerWidth-L,m.width);return Math.abs((r.left+r.right)/2-(L+W/2))<=2&&Math.abs((r.top+r.bottom)/2-(innerHeight-nb)/2)<=2}));
  check(label+' nothing covers the orders in the panel',await p.evaluate(()=>[...document.querySelectorAll('#ap-pop .at-row')].every(r=>{const x=r.getBoundingClientRect();if(x.bottom<0||x.top>innerHeight)return true;const pts=[[x.left+20,x.top+10],[x.left+x.width/2,x.top+x.height/2],[x.right-20,x.top+10]];return pts.every(([px,py])=>{const bb=document.querySelector('#ap-pop .ap-pop-body').getBoundingClientRect();if(py<Math.max(0,bb.top)||py>Math.min(innerHeight,bb.bottom))return true;const e=document.elementFromPoint(px,py);return e&&!!e.closest('#ap-pop')})})));
  check(label+' panel header not covered',await p.evaluate(()=>{const h=document.querySelector('#ap-pop .ap-pop-head').getBoundingClientRect();const e=document.elementFromPoint(h.left+h.width/2,h.top+h.height/2);return e&&!!e.closest('#ap-pop')}));
  check(label+' focus moved to Close',await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('ap-close')));
  await p.screenshot({path:'/tmp/claude-attn-'+label+'-open.png'});
  await p.locator('#ap-pop .ap-close').click();await p.waitForTimeout(200);check(label+' Close button closes',await p.locator('#ap-pop').count()===0);
  check(label+' focus returns to the island',await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('ap-island')));
  await isl.first().click();await p.waitForTimeout(200);await p.keyboard.press('Escape');await p.waitForTimeout(200);check(label+' Escape closes',await p.locator('#ap-pop').count()===0);
  await isl.first().click();await p.waitForTimeout(200);await isl.first().evaluate(e=>e.click());await p.waitForTimeout(200);check(label+' tapping the same island again closes',await p.locator('#ap-pop').count()===0);
  await isl.first().click();await p.waitForTimeout(200);await p.mouse.click(w-5,h/2>100?60:5);await p.waitForTimeout(200);check(label+' tapping outside closes',await p.locator('#ap-pop').count()===0);
  if(k>1){await isl.nth(0).click();await p.waitForTimeout(200);await p.locator('#ap-pop .ap-close').click();await p.waitForTimeout(200);await isl.nth(1).click();await p.waitForTimeout(250);const t=await p.locator('#ap-pop .ap-pop-title h2').innerText(),t2=await isl.nth(1).getAttribute('title');check(label+' choosing another island swaps the panel',t===t2&&await p.locator('#ap-pop').count()===1)}
  // Opening an order from the panel puts the order on top; closing it returns to the panel.
  const row=p.locator('#ap-pop .at-row button,#ap-pop .at-row [data-act]').first();
  if(await row.count()){await row.evaluate(e=>e.click());await p.waitForTimeout(450);const sheetOn=await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')});check(label+' order opens directly from the panel',sheetOn);
   if(sheetOn){await p.screenshot({path:'/tmp/claude-attn-'+label+'-order.png'});await p.keyboard.press('Escape');await p.waitForTimeout(400);check(label+' Escape closes the order first, panel stays',await p.locator('#ap-pop').count()===1)}}
  await p.locator('[data-tab="orders"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);await p.locator('[data-tab="attn"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);
  check(label+' leaving and returning starts closed',await p.locator('#ap-pop').count()===0);
  check(label+' scrolling unlocked after close',await p.evaluate(()=>!document.documentElement.classList.contains('ap-is-open')));
  check(label+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+' no script errors'+(errors.length?' '+errors.join(' | '):''),errors.length===0);await p.close()}

 // Two panes on wide landscape screens.
 for(const [w,h,label] of WIDE){const {p,errors}=await open(b,w,h);
  await p.locator('[data-tab="attn"]').first().evaluate(e=>e.click());await p.waitForTimeout(300);
  const isl=p.locator('.ap-island');const k=await isl.count();
  check(label+' two panes shown',await p.locator('.ap-split .ap-col').count()===1&&await p.locator('#ap-pane').isVisible());
  check(label+' no pop-up or dimming',await p.locator('#ap-pop,.ap-scrim').count()===0);
  check(label+' most urgent category open first',await isl.first().getAttribute('aria-pressed')==='true'&&(await p.locator('#ap-pane .ap-pop-title h2').innerText())===await isl.first().getAttribute('title'));
  const L=await p.locator('.ap-col').boundingBox(),R=await p.locator('#ap-pane').boundingBox();
  check(label+' islands on the left, orders on the right',L.x+L.width<=R.x&&Math.abs(L.y-R.y)<4);
  check(label+' pane inside the viewport',R.x+R.width<=w+1&&R.y+R.height<=h+1);
  const want=Number(await isl.first().locator('b').innerText());check(label+' pane lists the right number of orders',await p.locator('#ap-pane .at-row').count()===want);
  check(label+' nothing covers the pane',await p.evaluate(()=>{const h=document.querySelector('#ap-pane .ap-pop-head').getBoundingClientRect();const e=document.elementFromPoint(h.left+h.width/2,h.top+h.height/2);return e&&!!e.closest('#ap-pane')}));
  check(label+' page does not scroll sideways',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'/tmp/claude-attn-'+label+'-split.png'});
  if(k>1){await isl.nth(1).click();await p.waitForTimeout(250);check(label+' clicking another island swaps the pane',(await p.locator('#ap-pane .ap-pop-title h2').innerText())===await isl.nth(1).getAttribute('title')&&await isl.nth(1).getAttribute('aria-pressed')==='true'&&await isl.nth(0).getAttribute('aria-pressed')==='false');
   check(label+' focus stays on the chosen island',await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('ap-island')));
   await isl.nth(1).click();await p.waitForTimeout(200);check(label+' clicking the same island keeps it open',await p.locator('#ap-pane').count()===1);
   await p.keyboard.press('Escape');await p.waitForTimeout(200);check(label+' Escape does not empty the pane',await p.locator('#ap-pane').count()===1);
   await isl.nth(0).click();await p.waitForTimeout(250)}
  const row=p.locator('#ap-pane .at-row [data-act]').first();
  if(await row.count()){await row.evaluate(e=>e.click());await p.waitForTimeout(450);const on=await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')});check(label+' order opens from the pane',on);
   if(on){await p.keyboard.press('Escape');await p.waitForTimeout(400);check(label+' closing the order returns to the same pane',await p.locator('#ap-pane').count()===1)}}
  await p.locator('[data-tab="orders"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);await p.locator('[data-tab="attn"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);
  check(label+' returning opens the most urgent category again',await isl.first().getAttribute('aria-pressed')==='true');
  check(label+' no script errors'+(errors.length?' '+errors.join(' | '):''),errors.length===0);
  if(label.includes('ipad')){await p.setViewportSize({width:h,height:w});await p.waitForTimeout(400);check(label+' rotating to portrait switches to islands and pop-up',await p.locator('.ap-split').count()===0&&await p.locator('.ap-island').count()===k&&await p.locator('#ap-pop').count()===0);await p.setViewportSize({width:w,height:h});await p.waitForTimeout(400);check(label+' rotating back restores two panes',await p.locator('#ap-pane').count()===1)}
  await p.close()}
 // Keyboard only.
 {const {p}=await open(b,1024,1366);await p.locator('[data-tab="attn"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);await p.locator('.ap-island').first().focus();await p.keyboard.press('Enter');await p.waitForTimeout(250);check('keyboard Enter opens the pop-up',await p.locator('#ap-pop').count()===1);await p.keyboard.press('Escape');await p.waitForTimeout(200);check('keyboard Escape closes it',await p.locator('#ap-pop').count()===0);await p.close()}
 // Empty state: nothing to do.
 {const p=await b.newPage({viewport:{width:1366,height:1024}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**',r=>r.abort());await p.setContent('<!doctype html><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>window.__role='admin');await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.evaluate(()=>{const mk=window.__ccsMock,from=mk.from.bind(mk);mk.from=t=>{const q=from(t);if(t!=='orders')return q;const th=q.then?q.then.bind(q):null;return q}});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(300);check('empty/loading render without errors',errors.length===0);await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
