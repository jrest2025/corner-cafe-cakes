const fs=require('fs');const D=__dirname+'/';
const { open, tap, chromium } = require(D+'harness.cjs');
const C='bd90f95efc328b973f8a6cd34bf944520d0b90d1';
const swap=f=>f.replace(/@d2052bd860201d2e4d780fa03b3d1c153d00293e\/dist\/app\/staff-app\.e0a7470c8a\.js/,'@'+C+'/dist/app/staff-app.d1c119f6f0.js');
const L=fs.readFileSync(D+'../../docs/loader66.js','utf8').replace(/c='[0-9a-f]{40}'/,"c='0000000'");
const S=(process.env.S||'/tmp');
(async()=>{const b=await chromium.launch();
for(const [w,h,tag] of [[1440,900,'desk'],[1180,820,'ipad']]){
const {p,errors}=await open(b,w,h,{footBase:swap,extraFoot:'<script>'+L+'</script>',role:'admin',ipad:tag==='ipad',post:"(function(){var m=window.__ccsMock,o=m.rpc.bind(m);var t=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date());\nm.rpc=function(fn,a){if(fn==='get_seasonal_menu')return Promise.resolve({data:{ok:true,today:t,groups:window.__off?[]:[{id:'g1',name:'Festive treats',items:[{id:'i1',name:'Mince Pies',price:12}]}]}});\nif(fn==='staff_treat_orders')return Promise.resolve({data:{ok:true,today:t,can_edit:true,can_create:true,can_pay:true,new:1,orders:[{id:'t1',reference:'T-1001',status:'new',source:'website',pickup_date:t,pickup_time:'15:00:00',name:'Ana',phone:'9123456',total:59,paid:0,items:[{name:'Gingerbread House',quantity:1,price:35},{name:'Mince Pies',quantity:2,price:12}]},{id:'t2',reference:'T-1002',status:'confirmed',source:'counter',pickup_date:t,pickup_time:'17:00:00',name:'Bo',phone:'9123457',total:24,paid:24,items:[{name:'Mince Pies',quantity:2,price:12}]}]}});\nreturn o(fn,a)}})();"});
await p.waitForTimeout(5000);
const nav=await p.evaluate(()=>[...document.querySelectorAll('#cc-staff .ccs-side .ccs-nav-item')].map(b=>b.textContent.trim()).join(' | '));
console.log(tag,'nav:',nav);
await p.screenshot({path:S+'/so-nav-'+tag+'.png'});
await p.evaluate(()=>{const b=document.querySelector('[data-cc-so="side"]');b&&b.click()});await p.waitForTimeout(2500);
console.log(tag,'board:',await p.evaluate(()=>{const l=document.getElementById('cc-to');return l?l.innerText.replace(/\s+/g,' ').slice(0,300):'NO BOARD'}));
await p.screenshot({path:S+'/so-board-'+tag+'.png'});
await p.keyboard.press('Escape');await p.waitForTimeout(500);await p.evaluate(()=>{const x=document.querySelector('#cc-to [data-cc-to="close"]');x&&x.click()});await p.waitForTimeout(400);
await p.evaluate(()=>{const b=[...document.querySelectorAll('#cc-staff .ccs-side [data-tab]')].find(x=>/Analytics/.test(x.textContent));b&&b.click()});await p.waitForTimeout(3500);
console.log(tag,'analytics card:',await p.evaluate(()=>{const c=document.querySelector('.cc-so-card');return c?c.innerText.replace(/\s+/g,' ').slice(0,300):'NONE'}));
await p.screenshot({path:S+'/so-an-'+tag+'.png'});
console.log(tag,'errors',errors.filter(e=>!/length|Unlisted/.test(e)));}
await b.close()})();
