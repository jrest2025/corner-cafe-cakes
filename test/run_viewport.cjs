// Desktop overview fit: real released code, invented records, remote requests blocked.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.STAFF_MANIFEST || 'dist/app/staff-viewport-manifest.json')));
let count=0;function check(n,v){assert.ok(v,n);count++;console.log('PASS '+n)}
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});try{
for(const [w,h] of [[2560,1440],[1920,1080],[1920,900],[1536,864],[1366,768]]){
const c=await b.newContext({viewport:{width:w,height:h}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**',r=>r.abort());
await p.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="cc-staff"></div></body></html>');await p.evaluate(()=>window.__role='admin');await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.evaluate(()=>{const f=window.__ccsMock.rpc;window.__ccsMock.rpc=function(n,a){if(n==='occasion_admin')return Promise.resolve({data:{ok:true,occasions:[],dates:[]}});return f.call(this,n,a)}});await p.addScriptTag({path:path.join(root,m.file)});
for(const tab of ['today','dash']){
await p.locator('[data-tab="'+tab+'"]').first().evaluate(e=>e.click());await p.waitForTimeout(250);
const s=await p.evaluate(()=>{const e=document.getElementById('ccs-main');const cards=[...e.querySelectorAll('.bi-kpis > *, .bi-ov-trend > *, .bi-ov-row > *, .an-grid > *, .tq-stats > *, .tq-main > *')];return{main:e.scrollHeight-e.clientHeight,body:document.documentElement.scrollHeight-innerHeight,x:document.documentElement.scrollWidth-innerWidth,cards:cards.map(c=>{const r=c.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height}})}});
// 18 Oct 2026 (Roneel): up to 1060px tall, Today and Analytics scroll once as a page instead of cards scrolling inside.
if(h>1060)check(w+'x'+h+' '+tab+' needs no page or main-area scrolling',s.main<=1&&s.body<=1);else check(w+'x'+h+' '+tab+' scrolls only the working area, once',s.body<=1);
check(w+'x'+h+' '+tab+' every overview panel is visible',s.cards.length>0&&s.cards.every(r=>r.top>=0&&(h<=1060||r.bottom<=h+1)&&r.height>=60));
check(w+'x'+h+' '+tab+' does not overflow sideways',s.x<=1);
if(w===1920&&h===1080)await p.screenshot({path:'/tmp/cc-viewport-final-'+tab+'.png'});
}
const long=await p.evaluate(()=>{const box=document.querySelector('.bi-opps');for(let i=0;i<30;i++){const p=document.createElement('p');p.textContent='Additional record '+i+' with readable detail.';box.appendChild(p)}box.scrollTop=box.scrollHeight;const last=box.lastElementChild.getBoundingClientRect(),r=box.getBoundingClientRect(),main=document.getElementById('ccs-main');return{inside:box.scrollHeight>box.clientHeight&&box.scrollTop>0,lastReachable:last.bottom<=r.bottom+1,main:main.scrollHeight-main.clientHeight}});
check(w+' long lists scroll inside their own panel',long.inside&&long.lastReachable&&(h<=1060||long.main<=1));
check(w+' no script errors',errors.length===0);await c.close();}
console.log(count+' viewport-fit checks passed.');}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
