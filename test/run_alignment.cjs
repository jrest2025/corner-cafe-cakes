// Responsive visual checks. All data is invented and all remote requests blocked.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(root,process.env.STAFF_MANIFEST || 'dist/app/staff-alignment-manifest.json')));
let count=0;function check(name,ok){assert.ok(ok,name);count++;console.log('PASS '+name)}
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const [w,h] of [[1920,1080],[1366,768],[1180,820],[820,1180],[390,844]]){
const c=await b.newContext({viewport:{width:w,height:h},hasTouch:w<1280});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**',r=>r.abort());
await p.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="cc-staff"></div></body></html>');
await p.evaluate(()=>{window.__role='admin';window.print=()=>{}});await p.addScriptTag({path:path.join(root,'test/mock.js')});
await p.evaluate(()=>{const f=window.__ccsMock.rpc;window.__ccsMock.rpc=function(n,a){if(n==='occasion_admin')return Promise.resolve({data:{ok:true,occasions:[],dates:[]}});return f.call(this,n,a)}});
await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(200);
for(const tab of ['today','orders','calendar','customers','settings','kitchen','dash']){
await p.locator('[data-tab="'+tab+'"]').first().evaluate(e=>e.click());await p.waitForTimeout(150);
const s=await p.evaluate(()=>{const main=document.getElementById('ccs-main'),r=main.getBoundingClientRect(),g=getComputedStyle(main),title=main.querySelector('.ccs-title'),tr=title&&title.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth-innerWidth,left:parseFloat(g.paddingLeft),right:parseFloat(g.paddingRight),top:parseFloat(g.paddingTop),titleInset:tr?tr.left-r.left:null}});
const min=w>=1600?32:w>=760?24:16;
check(w+' '+tab+' has balanced outer gutters',s.left>=min&&s.right>=min&&Math.abs(s.left-s.right)<1);
check(w+' '+tab+' has no sideways page overflow',s.overflow<=1);
if(s.titleInset!==null)check(w+' '+tab+' heading aligns inside the gutter',s.titleInset>=min-1);
if(tab==='dash') {
const a=await p.evaluate(()=>{const headings=[...document.querySelectorAll('.dx-ov .dx-card-h h2,.dx-ov .an-ct')];const sizes=headings.map(e=>{let c=getComputedStyle(e);return [c.fontSize,c.fontWeight,c.lineHeight,c.textAlign].join('/')});const notes=[...document.querySelectorAll('.dx-ov .dx-card-h > span')];const noteLeft=notes.every(e=>Math.abs(e.getBoundingClientRect().left-e.parentElement.querySelector('h2').getBoundingClientRect().left)<1);const charts=[...document.querySelectorAll('.dx-ov .an-pie')];const aligned=charts.every(e=>{const d=e.querySelector('.an-donut'),l=e.querySelector('.an-leg');if(!d||!l)return true;const dr=d.getBoundingClientRect(),lr=l.getBoundingClientRect(),pr=e.getBoundingClientRect();return Math.abs(dr.top-pr.top)<1&&(Math.abs(dr.top-lr.top)<1||lr.top>=dr.bottom)});return{count:sizes.length,sizes:[...new Set(sizes)],noteLeft,aligned}});
check(w+' panel headings share one readable hierarchy',a.count>=6&&a.sizes.length===1&&a.sizes[0].startsWith('18px/700/'));
check(w+' panel subtitles align beneath their heading',a.noteLeft);
check(w+' chart bodies share a top alignment',a.aligned);
if(w>=1280){const brand=await p.evaluate(()=>{const e=document.querySelector('.ccs-side .ccs-brand'),r=e.getBoundingClientRect(),s=document.querySelector('.ccs-side').getBoundingClientRect(),t=getComputedStyle(e.querySelector('small'));return{center:Math.abs((r.left+r.right)/2-(s.left+s.right)/2),caption:t.textAlign}});check(w+' logo and caption centre in the sidebar',brand.center<1&&brand.caption==='center');}
if(w===1920||w===390)await p.screenshot({path:'/tmp/cc-alignment-dash-'+w+'.png'});
}
if(tab==='today'&&(w===1366||w===820)) {await p.waitForTimeout(350);await p.screenshot({path:'/tmp/cc-crm-spacing-today-'+w+'.png'});}
}
await p.locator('[data-tab=settings]').first().evaluate(e=>e.click());await p.waitForTimeout(150);await p.locator('[data-setk="Kitchen printing"]').evaluate(e=>e.click());await p.waitForTimeout(500);
if(w<1280){const heights=await p.locator('.ccs-set details.is-cur .ccs-input,.ccs-set details.is-cur .ccs-btn').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().height));check(w+' settings controls remain at least 44px high',heights.length>0&&heights.every(x=>x>=43.5));}
if(w>=760&&w<1280){const inset=await p.evaluate(()=>{const a=document.querySelector('.ccs-side').getBoundingClientRect(),b=document.querySelector('.ccs-brand').getBoundingClientRect();return {left:b.left-a.left,right:a.right-b.right}});check(w+' logo has clear space on both sides',inset.left>=12&&inset.right>=12);}
if(w===1180||w===390)await p.screenshot({path:'/tmp/cc-crm-spacing-settings-'+w+'.png'});
check(w+' navigation has no script errors',errors.length===0);await c.close();}
console.log(count+' spacing checks passed.');}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
