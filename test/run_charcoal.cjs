// Theme regression with invented data; blocks all remote requests.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-charcoal-manifest.json')));let n=0;
function check(s,v){assert.ok(v,s);console.log('PASS '+s);n++}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{for(const [w,h] of [[1920,1080],[1366,768],[820,1180],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});await p.route('https://**',r=>r.abort());await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>window.__role='admin');await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(250);
const tap=async s=>{await p.locator(s).first().evaluate(e=>e.click());await p.waitForTimeout(100)};
check(w+' charcoal sidebar token',await p.locator('#cc-staff').evaluate(e=>getComputedStyle(e).getPropertyValue('--hs-side').trim()==='#292d33'));
if(w>=760)check(w+' sidebar rendered charcoal',await p.locator('.ccs-side').evaluate(e=>getComputedStyle(e).backgroundColor==='rgb(41, 45, 51)'));
check(w+' navigation keeps icons and labels',await p.locator('[data-tab="orders"]').first().evaluate(e=>!!e.querySelector('svg')&&e.textContent.trim().length>0));
await tap('[data-tab="orders"]');await tap('[data-act="filter"][data-v="recent"]');
check(w+' selected filter neutral',await p.locator('.ccs-tabs .ccs-tab[aria-pressed=true]').first().evaluate(e=>getComputedStyle(e).backgroundColor==='rgb(236, 238, 241)'));
check(w+' paid remains green and labelled',await p.locator('.p-paid').first().evaluate(e=>getComputedStyle(e).color==='rgb(27, 107, 72)'&&e.innerText.trim()==='Paid'&&!!e.querySelector('.vr-pay-icon svg')));
check(w+' unpaid remains amber and labelled',await p.locator('.p-part,.p-unpaid').first().evaluate(e=>getComputedStyle(e).color==='rgb(168, 91, 0)'&&e.textContent.trim().length>0));
check(w+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.close();}console.log(n+' charcoal checks passed.')}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
