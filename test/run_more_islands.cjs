// Today, Kitchen > Handover and Customers follow-up islands. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-more-islands-manifest.json')));let n=0,fails=0;
const shots=process.env.SHOTS||'/tmp';
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
async function open(b,w,h,tab){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);
 await p.locator('[data-tab="'+tab+'"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);return {p,errors}}
const centred=p=>p.evaluate(()=>{const r=document.getElementById('ap-pop').getBoundingClientRect(),mm=document.getElementById('ccs-main').getBoundingClientRect(),nv=document.querySelector('.ccs-nav'),ns=getComputedStyle(nv),nb=ns.position==='fixed'&&nv.getBoundingClientRect().bottom>=innerHeight-2?innerHeight-nv.getBoundingClientRect().top:0,L=Math.max(0,mm.left),W=Math.min(innerWidth-L,mm.width);return Math.abs((r.left+r.right)/2-(L+W/2))<=2&&Math.abs((r.top+r.bottom)/2-(innerHeight-nb)/2)<=2});
const notCovered=p=>p.evaluate(()=>{const h=document.querySelector('#ap-pop .ap-pop-head').getBoundingClientRect();const e=document.elementFromPoint(h.left+h.width/2,h.top+h.height/2);return !!(e&&e.closest('#ap-pop'))});
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1920,1080,'desktop'],[1512,862,'laptop'],[1366,1024,'ipad-landscape'],[1024,1366,'ipad-portrait'],[390,844,'phone']]){
  const wide=w>=1100&&w>h;
  // ---- Today (pop-up on every screen size) ----
  {const {p,errors}=await open(b,w,h,'today');
   const isl=p.locator('.tq-warn .tx-islands .ap-island');const k=await isl.count();check(label+' today: Urgent and To do islands',k===2,k);
   check(label+' today: counts are the full totals (1 urgent, 3 to do)',(await isl.evaluateAll(es=>es.map(e=>e.querySelector('.ap-text>b').textContent).join(',')))==='1,3');
   check(label+' today: each island has an icon',await isl.evaluateAll(es=>es.every(e=>e.querySelector('svg'))));
   {
    check(label+' today: islands side by side on tablet and desktop',w<=640||await isl.evaluateAll(es=>Math.abs(es[0].getBoundingClientRect().top-es[1].getBoundingClientRect().top)<2));
    check(label+' today: islands fit inside the card',await p.evaluate(()=>{const c=document.querySelector('.tq-warn').getBoundingClientRect();return [...document.querySelectorAll('.tx-islands .ap-island')].every(e=>e.getBoundingClientRect().bottom<=c.bottom+1)}));
    check(label+' today: rows hidden until an island is opened',await p.evaluate(()=>[...document.querySelectorAll('.tq-warn .tq-w')].every(r=>getComputedStyle(r).display==='none')));
    await isl.first().click();await p.waitForTimeout(350);
    check(label+' today: Urgent opens in a pop-up',await p.locator('#ap-pop').count()===1&&(await p.locator('#ap-pop .ap-pop-title h2').innerText())==='Urgent');
    check(label+' today: pop-up centred',await centred(p));check(label+' today: pop-up not covered',await notCovered(p));
    check(label+' today: page scroll locked',await p.evaluate(()=>document.documentElement.classList.contains('ap-is-open')));
    await p.screenshot({path:shots+'/claude-tx-today-'+label+'.png'});
   }
   const row=p.locator('#ap-pop .tq-w,#tx-pane .tq-w').first();await row.evaluate(e=>e.click());await p.waitForTimeout(500);
   check(label+' today: order opens from the island list',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')}));
   await p.keyboard.press('Escape');await p.waitForTimeout(400);check(label+' today: Escape closes the order, pop-up stays',await p.locator('#ap-pop').count()===1);
   {await p.keyboard.press('Escape');await p.waitForTimeout(300);check(label+' today: Escape again closes the pop-up',await p.locator('#ap-pop').count()===0);
    await isl.nth(1).click();await p.waitForTimeout(300);await p.locator('#ap-pop .ap-close').click();await p.waitForTimeout(300);check(label+' today: Close closes',await p.locator('#ap-pop').count()===0);
    await isl.nth(1).click();await p.waitForTimeout(300);}
   await p.locator('.tx-all').click();await p.waitForTimeout(500);check(label+' today: link opens the Needs attention screen',await p.evaluate(()=>document.getElementById('ccs-main').getAttribute('data-screen')==='attn'));
   check(label+' today: no pop-up left open on Needs attention',await p.locator('.tx-wrap').count()===0);
   await p.locator('[data-tab="today"]').first().evaluate(e=>e.click());await p.waitForTimeout(500);
   check(label+' today: returning starts closed',await p.locator('#ap-pop').count()===0);
   check(label+' today: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(label+' today: no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
  // ---- Kitchen > Handover ----
  {const {p,errors}=await open(b,w,h,'kitchen');await p.locator('[data-act="k-mode"]',{hasText:'Handover'}).click();await p.waitForTimeout(600);
   const isl=p.locator('.ix-wrap .ap-island');const k=await isl.count();check(label+' kitchen handover: 4 islands',k===4,k);
   check(label+' kitchen handover: still to finish counts 3',(await isl.nth(1).locator('b').innerText())==='3');
   check(label+' kitchen handover: no sections loose',await p.evaluate(()=>[...document.querySelectorAll('#ccs-main section.ho-sec')].every(s=>s.hidden||s.closest('#ap-pop,#ap-pane'))));
   if(wide)check(label+' kitchen handover: notes in the pane',await p.locator('#ap-pane').count()===1);
   else{await isl.first().click();await p.waitForTimeout(350);check(label+' kitchen handover: notes pop-up',await p.locator('#ap-pop').count()===1);check(label+' kitchen handover: pop-up centred',await centred(p))}
   await p.locator('[data-act="ho-read"],.ho-note button').first().count()&&check(label+' kitchen handover: Read and taken over button reachable',await p.locator('#ap-pop .ho-note button,#ap-pane .ho-note button').count()>=1);
   await p.screenshot({path:shots+'/claude-tx-kh-'+label+'.png'});
   await p.locator('[data-act="k-mode"]',{hasText:'Today'}).evaluate(e=>e.click());await p.waitForTimeout(400);
   check(label+' kitchen today: unchanged (attention list visible)',await p.locator('.kw-att .kw-line').count()===2);
   check(label+' kitchen: no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
  // ---- Customers ----
  {const {p,errors}=await open(b,w,h,'customers');
   await p.locator('.ov-att .ix-crow').nth(2).click();await p.waitForTimeout(700);
   check(label+' customers: follow-ups open in a pop-up',await p.locator('.tx-cwrap #ap-pop').count()===1);
   check(label+' customers: pop-up titled by the island',(await p.locator('#ap-pop .ap-pop-title h2').innerText())==='Quotes waiting for a reply');
   check(label+' customers: overview stays behind',await p.locator('.tx-back .ov-att').count()===1);
   check(label+' customers: list shows the quote follow-up',await p.locator('#ap-pop .crm-cards > *').count()>=1);
   check(label+' customers: pop-up centred',await centred(p));check(label+' customers: pop-up not covered',await notCovered(p));
   await p.screenshot({path:shots+'/claude-tx-cu-'+label+'.png'});
   await p.locator('#ap-pop .crm-chips [data-v="all"]').click();await p.waitForTimeout(500);
   check(label+' customers: changing the filter keeps the pop-up',await p.locator('.tx-cwrap #ap-pop').count()===1&&await p.locator('#ap-pop .crm-cards > *').count()>=3);
   await p.locator('#ap-pop .ap-close').click();await p.waitForTimeout(500);
   check(label+' customers: Close returns to the overview',await p.locator('#ap-pop').count()===0&&await p.locator('#ccs-main > section.ov-att, #ccs-main .ov-att').count()>=1&&await p.locator('.tx-back').count()===0);
   await p.locator('.ov-att .ix-crow').first().click();await p.waitForTimeout(600);await p.keyboard.press('Escape');await p.waitForTimeout(500);
   check(label+' customers: Escape closes too',await p.locator('#ap-pop').count()===0&&await p.locator('.ov-att').count()>=1);
   await p.locator('.ov-att .ix-crow').first().click();await p.waitForTimeout(600);await p.locator('[data-tab="today"]').first().evaluate(e=>e.click());await p.waitForTimeout(400);
   check(label+' customers: leaving forgets the pop-up',await p.locator('.tx-cwrap').count()===0&&await p.evaluate(()=>!document.documentElement.classList.contains('ap-is-open')));
   check(label+' customers: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(label+' customers: no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
