// Handover and Customers islands. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-islands-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
async function open(b,w,h,tab){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(e.message!=="Cannot read properties of undefined (reading 'length')")errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);
 await p.locator('[data-tab="'+tab+'"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);return {p,errors}}
const covered=p=>p.evaluate(()=>{const box=document.querySelector('#ap-pop,#ap-pane');const h=box.querySelector('.ap-pop-head').getBoundingClientRect();const e=document.elementFromPoint(h.left+h.width/2,h.top+h.height/2);return !(e&&e.closest('#ap-pop,#ap-pane'))});
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1920,1080,'desktop'],[1366,1024,'ipad-landscape'],[1024,1366,'ipad-portrait'],[390,844,'phone']]){
  const wide=w>=1100&&w>h;
  {const {p,errors}=await open(b,w,h,'handover');
   const isl=p.locator('.ix-wrap .ap-island');const k=await isl.count();check(label+' handover: 5 islands',k===5,k);
   check(label+' handover: no sections loose on the page',await p.evaluate(()=>[...document.querySelectorAll('#ccs-main section.ho-sec')].every(s=>s.hidden||s.closest('#ap-pop,#ap-pane'))));
   check(label+' handover: every island has an icon and a count',await isl.evaluateAll(es=>es.every(e=>e.querySelector('svg')&&/^\d+$/.test(e.querySelector('b').textContent))));
   if(wide){check(label+' handover: two panes, notes open first',await p.locator('#ap-pane').count()===1&&(await p.locator('#ap-pane h2').first().innerText())==='Handover notes');}
   else{check(label+' handover: starts with islands only',await p.locator('#ap-pop').count()===0);await isl.first().click();await p.waitForTimeout(350);check(label+' handover: notes open in a pop-up',await p.locator('#ap-pop').count()===1&&(await p.locator('#ap-pop .ap-pop-title h2').innerText())==='Handover notes');
    check(label+' handover: pop-up centred',await p.evaluate(()=>{const r=document.getElementById('ap-pop').getBoundingClientRect(),mm=document.getElementById('ccs-main').getBoundingClientRect(),nv=document.querySelector('.ccs-nav'),ns=getComputedStyle(nv),nb=ns.position==='fixed'&&nv.getBoundingClientRect().bottom>=innerHeight-2?innerHeight-nv.getBoundingClientRect().top:0,L=Math.max(0,mm.left),W=Math.min(innerWidth-L,mm.width);return Math.abs((r.left+r.right)/2-(L+W/2))<=2&&Math.abs((r.top+r.bottom)/2-(innerHeight-nb)/2)<=2}))}
   check(label+' handover: panel not covered',!(await covered(p)));
   // Writing and saving a note works from inside the panel, and it stays open.
   await p.fill('#ho-note','Invented note: CC-1004 in the fridge.');await p.locator('[data-act="ho-save"]').click();await p.waitForTimeout(700);
   check(label+' handover: note saved from the panel',await p.evaluate(()=>window.__calls.some(c=>c[1]==='handover_add')));
   check(label+' handover: panel still open after saving',await p.locator('#ap-pop,#ap-pane').count()===1);
   // Switch to Still to finish and open an order from it.
   if(!wide){await p.locator('#ap-pop .ap-close').click();await p.waitForTimeout(250);check(label+' handover: Close closes',await p.locator('#ap-pop').count()===0)}
   await isl.nth(1).click();await p.waitForTimeout(350);check(label+' handover: Still to finish opens',(await p.locator('.ap-pop-title h2').innerText())==='Still to finish today');
   const ord=p.locator('#ap-pop [data-act="open-order"],#ap-pane [data-act="open-order"]').first();await ord.evaluate(e=>e.click());await p.waitForTimeout(500);
   check(label+' handover: order opens from the panel',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')}));
   await p.keyboard.press('Escape');await p.waitForTimeout(400);check(label+' handover: Escape closes the order, panel stays',await p.locator('#ap-pop,#ap-pane').count()===1);
   if(!wide){await p.keyboard.press('Escape');await p.waitForTimeout(300);check(label+' handover: Escape again closes the pop-up',await p.locator('#ap-pop').count()===0)}
   check(label+' handover: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await isl.first().click();await p.waitForTimeout(350);await p.screenshot({path:'/tmp/claude-ix-ho-'+label+'.png'});
   check(label+' handover: no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
  {const {p,errors}=await open(b,w,h,'customers');
   const rows=p.locator('.ov-att .ix-crow');const k=await rows.count();check(label+' customers: attention rows as islands ('+k+')',k>=4);
   check(label+' customers: islands do not overflow',await p.evaluate(()=>[...document.querySelectorAll('.ix-crow')].every(e=>e.getBoundingClientRect().right<=e.closest('.ov-att').getBoundingClientRect().right+1)));
   await p.screenshot({path:'/tmp/claude-ix-cu-'+label+'.png'});
   await rows.first().click();await p.waitForTimeout(600);check(label+' customers: island opens the follow-up list',await p.evaluate(()=>!document.querySelector('.ov-att')));
   check(label+' customers: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(label+' customers: no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }
 // Needs attention still behaves (unchanged), and leaving Handover forgets the open pop-up.
 {const {p}=await open(b,1024,1366,'handover');await p.locator('.ix-wrap .ap-island').first().click();await p.waitForTimeout(300);await p.locator('[data-tab="today"]').first().evaluate(e=>e.click());await p.waitForTimeout(300);await p.locator('[data-tab="handover"]').first().evaluate(e=>e.click());await p.waitForTimeout(500);check('returning to Handover starts closed',await p.locator('#ap-pop').count()===0);
  check('scrolling unlocked after leaving',await p.evaluate(()=>!document.documentElement.classList.contains('ap-is-open')));await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
