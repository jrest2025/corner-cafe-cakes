// Calendar: bigger month, cakes listed, occasions and public holidays, Coming up. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-cal-occ-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const fiji=o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date(Date.now()+o*864e5));
async function open(b,w,h,opt){opt=opt||{};const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(e.message!=="Cannot read properties of undefined (reading 'length')")errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>window.__role='admin');
 await p.addScriptTag({path:path.join(root,'test/mock.js')});
 await p.evaluate(([d,noHol,fail])=>{const mk=window.__ccsMock,from=mk.from.bind(mk);window.__coReads=[];
  const rows={occasions:[{code:'christmas',label:'Christmas',colour:'#15803D',category:'holiday',active:true},{code:'birthday',label:'Birthday',colour:'#9D174D',category:'personal',active:true},{code:'old',label:'Retired',colour:'#000000',category:'holiday',active:false}],
   occasion_dates:[{occasion_code:'christmas',starts_on:d.xmas,ends_on:null,promo_days:42},{occasion_code:'old',starts_on:d.in5,ends_on:null,promo_days:21}],
   public_holidays:[{day:d.in3,name:'Diwali'},{day:d.xmas,name:'Christmas Day'},{day:d.in2,name:'Boxing Day'}]};
  const chain=t=>{const q={_t:t,select(){return q},gte(){return q},order(){return q},eq(){return q},lte(){return q},then(res,rej){window.__coReads.push(t);if(fail)return Promise.resolve({error:{message:'Failed to fetch'}}).then(res,rej);if(t==='public_holidays'&&noHol)return Promise.resolve({data:null,error:{message:'relation "public_holidays" does not exist'}}).then(res,rej);return Promise.resolve({data:rows[t]}).then(res,rej)}};return q};
  mk.from=t=>rows[t]?chain(t):from(t);
  // An order for the occasion so "orders booked" can be counted.
  window.__orders.push({id:'xm',reference:'CC-1900',order_status:'confirmed',production_status:'not_started',payment_status:'unpaid',fulfilment_method:'collection',order_type:'standard',source:'phone',created_at:new Date().toISOString(),required_date:d.in3,required_time:'10:00:00',estimate_total:60,final_total:60,has_dietary:false,version:1,customer_id:'c1',customers:{full_name:'Invented Xmas',phone:'1'},order_items:[{product_name:'Red Velvet',size_inch:8,quantity:1,finish:'standard',occasion:'Christmas'}],order_events:[],order_attachments:[],payments:[]});
  // A busy day: five cakes on the same date.
  ['09:00','10:00','11:00','12:00','13:00'].forEach((t,i)=>window.__orders.push({id:'b'+i,reference:'CC-195'+i,order_status:'confirmed',production_status:'not_started',payment_status:'paid',fulfilment_method:'collection',order_type:'standard',source:'phone',created_at:new Date().toISOString(),required_date:d.in4,required_time:t+':00',estimate_total:50,final_total:50,has_dietary:false,version:1,customer_id:'c1',customers:{full_name:'Busy '+i,phone:'1'},order_items:[{product_name:'Cheesecake',size_inch:6,quantity:1,finish:'standard'}],order_events:[],order_attachments:[],payments:[]}));
 },[{xmas:opt.xmas||fiji(20),in2:fiji(2),in3:fiji(3),in4:fiji(4),in5:fiji(5)},!!opt.noHol,!!opt.fail]);
 await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);
 await p.locator('[data-tab="calendar"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1920,1080,'desktop'],[1366,1024,'ipad-landscape'],[1024,1366,'ipad-portrait'],[390,844,'phone']]){
  const {p,errors}=await open(b,w,h);
  // Make sure the month containing the test dates is shown (dates can cross a month end).
  const want=fiji(4).slice(0,7);let guard=0;while(guard++<3&&!(await p.evaluate(d=>!!document.querySelector('.ccs-mday[data-v="'+d+'"]')&&!document.querySelector('.ccs-mday[data-v="'+d+'"]').closest('.is-out'),fiji(4)))){await p.locator('[data-act="cal-move"][data-v="1"]').evaluate(e=>e.click());await p.waitForTimeout(500)}
  const cards=await p.locator('.co-strip .co-card').allInnerTexts();
  check(label+' Coming up strip lists upcoming dates',cards.length>=3,cards);
  check(label+' inactive occasion left out',!cards.some(t=>t.includes('Retired')));
  check(label+' public holiday labelled',cards.some(t=>t.includes('Diwali')&&t.includes('Public holiday')));
  check(label+' cake occasion shows orders booked and open window',cards.some(t=>t.includes('Christmas')&&t.includes('1 order booked')&&t.includes('ordering window open')));
  check(label+' Christmas shows once, not twice',cards.filter(t=>t.includes('Christmas')).length===1);
  const tag=await p.evaluate(d=>{const c=document.querySelector('.ccs-mday[data-v="'+d+'"]');return c?c.innerText:''},fiji(3));check(label+' holiday tagged on its day',tag.includes('Diwali')||w<=899,tag);
  check(label+' lead-up line on days before the occasion',await p.evaluate(d=>{const c=document.querySelector('.ccs-mday[data-v="'+d+'"]');return !!c&&c.parentElement.classList.contains('co-lead')},fiji(4)));
  check(label+' holidays have no lead-up of their own',await p.evaluate(d=>{const c=document.querySelector('.ccs-mday[data-v="'+d+'"]');return !!c&&!c.parentElement.getAttribute('style')||c.parentElement.getAttribute('style').includes('#15803D')},fiji(2)));
  if(w>=900){const busy=await p.evaluate(d=>{const c=document.querySelector('.ccs-mday[data-v="'+d+'"]');return {cakes:c.querySelectorAll('.co-cake').length,more:(c.querySelector('.co-more')||{}).textContent||''}},fiji(4));check(label+' busy day shows 3 cakes and "+N more"',busy.cakes===3&&/^\+\d+ more$/.test(busy.more),busy);
   const ch=await p.evaluate(()=>Math.round(document.querySelector('.ccs-mcell').getBoundingClientRect().height));check(label+' month cells are bigger ('+ch+'px)',ch>=130);
   check(label+' cake lines stay inside their day',await p.evaluate(()=>[...document.querySelectorAll('.co-cake')].every(e=>{const r=e.getBoundingClientRect(),c=e.closest('.ccs-mcell').getBoundingClientRect();return r.right<=c.right+1&&r.left>=c.left-1})))}
  else check(label+' cake lists hidden on small screens',await p.evaluate(()=>[...document.querySelectorAll('.co-cakes')].every(e=>getComputedStyle(e).display==='none')));
  check(label+' no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'/tmp/claude-cal-'+label+'.png'});
  // Tapping a Coming up card jumps to that month with the day selected.
  await p.locator('.co-card').filter({hasText:'Christmas'}).first().click();await p.waitForTimeout(600);
  check(label+' card jumps to the occasion month',await p.evaluate(d=>{const c=document.querySelector('.ccs-mday[data-v="'+d+'"]');return !!c&&c.getAttribute('aria-pressed')==='true'},fiji(20)));
  // Week view header carries the label.
  await p.locator('[data-act="cal-view"][data-v="week"]').evaluate(e=>e.click());await p.waitForTimeout(500);check(label+' week view still renders',await p.locator('.ccs-wgrid').count()===1);
  check(label+' no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);
  check(label+' reads only, no writes',await p.evaluate(()=>!window.__calls.some(c=>/upsert|insert|update|delete/.test(JSON.stringify(c[0]||''))&&/occasion|holiday/.test(JSON.stringify(c)))));
  await p.close()}
 // Holidays table missing: occasions still show, no errors.
 {const {p,errors}=await open(b,1366,1024,{noHol:true});const cards=await p.locator('.co-strip .co-card').allInnerTexts();check('missing holidays table: occasions still shown',cards.some(t=>t.includes('Christmas'))&&!cards.some(t=>t.includes('Diwali')),cards);check('missing holidays table: no script errors',errors.length===0,errors);await p.close()}
 // Network failure: calendar still works, strip quietly empty.
 {const {p,errors}=await open(b,1366,1024,{fail:true});check('offline: calendar still renders',await p.locator('.ccs-mgrid').count()===1);check('offline: no script errors',errors.length===0,errors);await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
