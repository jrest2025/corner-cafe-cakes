// Order Taken Date: Today / Yesterday / Another date, full counter order on mocked data. All remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-attn-pop-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const fiji=o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date(Date.now()+o*864e5));
async function page(b,w,h){const p=await b.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);return {p,errors}}
const js=async(p,s)=>{const ok=await p.evaluate(s=>{const e=document.querySelector(s);if(e)e.click();return !!e},s);await p.waitForTimeout(250);return ok};
async function fill(p,choice,date){await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(500);
 await p.fill('#n-phone','912 3456');await p.waitForTimeout(450);await p.fill('#n-name','Invented Guest');await js(p,'[data-act="sl-opt"][data-v="no"]');await js(p,'[data-act="n-source"][data-v="phone"]');
 if(choice!=='now'){await js(p,'[data-act="n-taken"][data-v="'+choice+'"]')}if(date){await p.fill('#n-takedate',date);await p.waitForTimeout(150)}
 await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-cell"][data-v="cheesecake|8"]');await js(p,'[data-act="sl-next"]');
 await js(p,'[data-act="n-diet"][data-v="no"]');await js(p,'[data-act="n-occ"][data-v="Birthday"]');await js(p,'[data-act="sl-next"]');
 await js(p,'#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');await js(p,'#sl-st-3 [data-act="n-time"][data-v="15:00"]');await js(p,'[data-act="sl-next"]');
 await js(p,'[data-act="n-plan"][data-v="later"]'); await js(p,'[data-act="n-submit"]');await p.waitForTimeout(900);
 return p.evaluate(()=>({create:window.__calls.filter(c=>c[1]==='staff_create_order').length,taken:window.__calls.filter(c=>c[1]==='order_set_taken').map(c=>c[2]),err:(document.querySelector('.ccs-err,.sl-err,[role=alert]')||{}).textContent||''}))}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[1024,1366,'ipad-portrait'],[390,844,'phone']]){const {p,errors}=await page(b,w,h);
  await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(500);
  const t=await p.locator('.tk-chips [data-act="n-taken"]').allInnerTexts();check(label+' three options: Today, Yesterday, Another date',t.join('|')==='Today|Yesterday|Another date',t);
  check(label+' question wording',(await p.locator('.tk-k').innerText()).includes('When did the customer place this order?'));
  check(label+' Today selected by default',await p.locator('[data-act="n-taken"][data-v="now"]').getAttribute('aria-pressed')==='true');
  check(label+' no time-of-day input',await p.locator('#n-taketime').count()===0);
  check(label+' chips at least 44px tall',await p.locator('.tk-chips [data-act="n-taken"]').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)),await p.locator('.tk-chips [data-act="n-taken"]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height)));
  await js(p,'[data-act="n-taken"][data-v="other"]');check(label+' Another date opens a date picker capped at today',await p.locator('#n-takedate').getAttribute('max')===fiji(0));
  check(label+' date picker gets focus',await p.evaluate(()=>document.activeElement&&document.activeElement.id==='n-takedate'));
  await p.locator('.tk-chips').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/claude-taken-'+label+'.png'});
  await js(p,'[data-act="n-taken"][data-v="yesterday"]');check(label+' Yesterday hides the date picker',await p.locator('#n-takedate').count()===0);
  check(label+' no script errors',errors.length===0,errors);await p.close()}
 // Submissions (tablet).
 let r,P;
 ({p:P}=await page(b,1024,768));r=await fill(P,'now');check('Today: order saved once, no back-dating call',r.create===1&&r.taken.length===0,r);await P.close();
 ({p:P}=await page(b,1024,768));r=await fill(P,'yesterday');check('Yesterday: saved with yesterday (Fiji date, date only)',r.create===1&&r.taken.length===1&&r.taken[0].p_at===fiji(-1)+'T12:00:00+12:00',r);await P.close();
 ({p:P}=await page(b,1024,768));r=await fill(P,'other',fiji(-9));check('Another date: saved with the chosen day',r.create===1&&r.taken.length===1&&r.taken[0].p_at===fiji(-9)+'T12:00:00+12:00',r);await P.close();
 ({p:P}=await page(b,1024,768));r=await fill(P,'other',fiji(1));check('Future date refused, nothing saved',r.create===0&&r.taken.length===0,r);
 check('Future date explains why',(await P.locator('#ccs-sheet').innerText()).includes('cannot be in the future'));await P.close();
 ({p:P}=await page(b,1024,768));r=await fill(P,'other',fiji(0));check('Another date set to today: saved as Today, no back-dating',r.create===1&&r.taken.length===0,r);await P.close();
 ({p:P}=await page(b,1024,768));r=await fill(P,'other',fiji(-31));check('Older than 30 days refused before saving',r.create===0&&r.taken.length===0&&(await P.locator('#ccs-sheet').innerText()).includes('last 30 days'),r);await P.close();
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
