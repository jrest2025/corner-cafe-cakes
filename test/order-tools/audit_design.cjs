const fs=require('fs');const {open,tap,chromium}=require('/home/claude/corner-cafe-cakes/test/order-tools/harness.cjs');
const C='bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap=f=>f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/,'@'+C+'/dist/app/staff-app.d1c119f6f0.js');
const L=fs.readFileSync('/home/claude/corner-cafe-cakes/docs/loader53.js','utf8');
const OUT='/tmp/claude-0/audit';
const inv=()=>{const m=document.querySelector('#ccs-main');const els=[...(m?m.querySelectorAll('*'):[])].filter(e=>e.getClientRects().length&&e.offsetWidth>0);
 const c=(f)=>{const o={};els.forEach(e=>{const v=f(e);if(v!=null)o[v]=(o[v]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])};
 const txt=els.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
 const ct=(f,arr)=>{const o={};arr.forEach(e=>{const v=f(e);if(v!=null)o[v]=(o[v]||0)+1});return Object.entries(o).sort((a,b)=>b[1]-a[1])};
 return {fs:ct(e=>getComputedStyle(e).fontSize,txt),fw:ct(e=>getComputedStyle(e).fontWeight,txt),
  rad:c(e=>{const s=getComputedStyle(e);return (s.borderTopWidth!=='0px'||s.backgroundColor!=='rgba(0, 0, 0, 0)')&&s.borderTopLeftRadius!=='0px'?s.borderTopLeftRadius:null}).slice(0,10),
  bc:c(e=>{const s=getComputedStyle(e);return s.borderTopWidth!=='0px'&&s.borderTopStyle!=='none'?s.borderTopWidth+' '+s.borderTopColor:null}).slice(0,10),
  sh:c(e=>{const s=getComputedStyle(e).boxShadow;return s!=='none'?s.slice(0,60):null}).slice(0,6),
  ff:ct(e=>getComputedStyle(e).fontFamily.split(',')[0],txt).slice(0,4),
  small:txt.filter(e=>parseFloat(getComputedStyle(e).fontSize)<13).map(e=>e.textContent.trim().slice(0,30)).slice(0,12),
  upper:txt.filter(e=>getComputedStyle(e).textTransform==='uppercase').map(e=>e.textContent.trim().slice(0,25)).slice(0,10),
  side:document.documentElement.scrollWidth-innerWidth}};
(async()=>{const b=await chromium.launch();const report={};
 for(const [w,h,t] of [[1440,900,'desk'],[1180,820,'ipadL'],[820,1180,'ipadP']]){
  const {p,errors}=await open(b,w,h,{footBase:swap,extraFoot:'<script>'+L+'</script>',ipad:t!=='desk',role:'admin'});
  await p.waitForTimeout(4500);
  for(const s of ['today','orders','calendar','customers','kitchen','handover','dash','register','settings','tablet']){
   const ok=await tap(p,'#cc-staff [data-tab="'+s+'"]',2200); if(!ok){report[t+'-'+s]='no tab';continue}
   await p.screenshot({path:OUT+'/'+t+'-'+s+'.png'});
   report[t+'-'+s]=await p.evaluate(inv);
   if(s==='orders'){await p.evaluate(()=>{const c=document.querySelector('#ccs-main .ccs-card');c&&c.click()});await p.waitForTimeout(1500);await p.screenshot({path:OUT+'/'+t+'-order.png'});await p.keyboard.press('Escape');await p.waitForTimeout(400);
     await tap(p,'#cc-staff [data-tab="new"]',1500);await p.screenshot({path:OUT+'/'+t+'-new.png'});await p.keyboard.press('Escape');await p.waitForTimeout(400);}
  }
  report[t+'-errors']=errors.slice(0,5);
  await p.context().close();
 }
 fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,1));await b.close();})();
