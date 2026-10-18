// Behavioural checks for the layout overlay; no server requests or customer data.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=require('path').resolve(__dirname,'..');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ctx={Ht:o=>o.order_items?.[0],Ut:i=>i.product_name,Tt:esc,Ft:t=>t,coList:()=>'',fitCalendar:()=>{},document:{querySelector:()=>null}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/src/staff.layout.js','utf8'),ctx);
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name)}
const order=(i,method='collection')=>({reference:'CC-'+i,required_time:'10:00 AM',fulfilment_method:method,order_status:'confirmed',order_items:[{product_name:'Cheesecake '+i}]});
check('empty days have no fabricated orders',()=>assert.equal(ctx.coList([]),''));
check('collection label accompanies its icon',()=>assert.match(ctx.coList([order(1)]),/aria-label="Collection"/));
check('delivery uses distinct icon and colour class',()=>assert.match(ctx.coList([order(1,'delivery')]),/ly-delivery.*aria-label="Delivery"/));
check('busy day shows three summaries and the full order count',()=>{const h=ctx.coList([1,2,3,4,5].map(i=>order(i)));assert.equal((h.match(/class="co-cake /g)||[]).length+(h.match(/class="co-cake"/g)||[]).length,3);assert.match(h,/View all 5 orders/)});
check('attention colour follows the existing order statuses',()=>{for(const status of ['awaiting_review','awaiting_quote','awaiting_deposit']){const o=order(1);o.order_status=status;assert.match(ctx.coList([o]),/ly-attention/)}});
check('no nested interactive controls inside date buttons',()=>assert.doesNotMatch(ctx.coList([1,2,3,4].map(i=>order(i))),/<button|<a\b/));
check('full cake description available in title',()=>assert.match(ctx.coList([order(1)]),/title="Collection · 10:00 AM · Cheesecake 1"/));
check('untrusted cake names are escaped',()=>{const o=order(1);o.order_items[0].product_name='<img src=x onerror="alert(1)">';const h=ctx.coList([o]);assert.doesNotMatch(h,/<img/);assert.match(h,/&lt;img/)});
check('missing cake uses order reference',()=>{const o=order(1);o.order_items=[];assert.match(ctx.coList([o]),/CC-1/)});
check('fitting does not hide the order summaries',()=>{const removed=[];let prop;ctx.document.querySelector=()=>({classList:{remove:x=>removed.push(x)},style:{removeProperty:x=>prop=x},querySelectorAll:()=>[{classList:{remove:x=>removed.push(x)}}]});ctx.fitCalendar();assert(removed.includes('fit-rows'));assert(removed.includes('fit-hide'));assert(removed.includes('fit-none'));assert.equal(prop,'--fit-row')});
const m=JSON.parse(fs.readFileSync(root+'/dist/app/staff-layout-manifest.json')),s=fs.readFileSync(root+'/'+m.file,'utf8');
check('bundle parses',()=>new vm.Script(s));
check('bundle hash matches deployment integrity',()=>assert.equal(m.sri,'sha384-'+require('crypto').createHash('sha384').update(s).digest('base64')));
check('empty panel is conditional on selection',()=>assert(s.includes("((e.sel||e.pre)?' ly-has-detail':'')")));
check('close action clears calendar selection and preview',()=>assert(s.includes('case"ly-cal-close":y.cal.sel=null,y.cal.pre=null,y.cal.ask=null,Ma()')));
check('latest CSS follows all earlier overlays',()=>assert(s.lastIndexOf('s.id="ccs-layout"')>s.lastIndexOf('s.id="ccs-wide"')));
console.log(checks+' checks passed. Browser layout checks require an available browser.');
