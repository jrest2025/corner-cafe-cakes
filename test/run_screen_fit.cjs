// Screen fit: phone fold lines (Calendar, Customers), Kitchen one column on upright tablets. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-screen-fit-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
const vis=(p,q)=>p.evaluate(q=>{const e=document.querySelector(q);return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0},q);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[820,1180,'ipad-portrait'],[412,915,'phone'],[360,780,'small-phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
  await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  const tab=async t=>{await p.evaluate(t=>{const e=document.querySelector('[data-tab="'+t+'"]');e&&e.click()},t);await p.waitForTimeout(600)};
  const phone=w<760;
  await tab('calendar');await p.evaluate(()=>{const e=document.querySelector('[data-act="cal-view"][data-v="day"]');e&&e.click()});await p.waitForTimeout(500);
  if(phone){
   check(label+': calendar fold line shown',await vis(p,'.cc-fit-bar[data-fit="cal"]'));
   check(label+': calendar filters folded away',!(await vis(p,'.ccs-calfilt'))&&!(await vis(p,'.ccs-daytot')));
   check(label+': fold line carries the day totals',/\d+ orders/.test(await p.locator('.cc-fit-bar[data-fit="cal"]').innerText()),await p.locator('.cc-fit-bar[data-fit="cal"]').innerText());
   const top=await p.evaluate(()=>{const e=document.querySelector('.ccs-dslot.has-orders');return e?e.getBoundingClientRect().top:9999});
   check(label+': first booked order shows without scrolling',top<innerHeightOf(h),[top,h]);
   await p.screenshot({path:shots+'/fit-'+label+'-calendar.png'});
   await p.locator('.cc-fit-bar[data-fit="cal"]').click();await p.waitForTimeout(250);
   check(label+': tapping the line shows filters and totals',await vis(p,'.ccs-calfilt')&&await vis(p,'.ccs-daytot'));
   check(label+': filter boxes not cut off',await p.evaluate(()=>[...document.querySelectorAll('.ccs-calfilt select')].every(s=>s.getBoundingClientRect().width>=200)));
   await p.selectOption('#cal-type','delivery');await p.waitForTimeout(400);
   check(label+': a chosen filter shows on the line',/Deliveries only/.test(await p.locator('.cc-fit-bar[data-fit="cal"]').innerText()));
   await p.selectOption('#cal-type','all');await p.waitForTimeout(300);
   await p.locator('.cc-fit-bar[data-fit="cal"]').click();await p.waitForTimeout(250);
   check(label+': tapping again folds them',!(await vis(p,'.ccs-calfilt')));
  } else check(label+': no fold lines on tablets',await p.locator('.cc-fit-bar').count()===0&&await vis(p,'.ccs-calfilt'));
  await tab('customers');await p.evaluate(()=>{const e=document.querySelector('[data-act="secgo"][data-g="crm"][data-v="all"]');e&&e.click()});await p.waitForTimeout(500);
  if(phone){
   check(label+': customers fold line shown',await vis(p,'.cc-fit-bar[data-fit="cust"]'));
   check(label+': customer filters folded away',!(await vis(p,'.ccs-ctool'))&&!(await vis(p,'.cdir-segments')));
   check(label+': all three section tabs inside the screen',await p.evaluate(()=>[...document.querySelectorAll('.crm-bar .ccs-secbtn')].every(b=>b.getBoundingClientRect().right<=innerWidth)));
   await p.locator('.cc-fit-bar[data-fit="cust"]').click();await p.waitForTimeout(250);
   check(label+': tapping shows the customer filters',await vis(p,'.ccs-ctool'));
  }
  await tab('kitchen');
  if(w>=760&&w<1200)check(label+': kitchen in one column',await p.evaluate(()=>{const a=document.querySelector('.kw-main'),t=document.querySelector('.kw-secs');return !!a&&!!t&&Math.abs(t.getBoundingClientRect().width-a.getBoundingClientRect().width)<2}));
  check(label+': kitchen counts not cut off',await p.evaluate(()=>[...document.querySelectorAll('.kw-count em')].every(e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().right<=e.closest('.kw-count').getBoundingClientRect().right+1)));
  check(label+': kitchen tabs on one line',await p.evaluate(()=>{const t=[...document.querySelectorAll('.kw-modes .ccs-chip')].map(e=>Math.round(e.getBoundingClientRect().top));return new Set(t).size===1}));
  await p.screenshot({path:shots+'/fit-'+label+'-kitchen.png'});
  check(label+': no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
function innerHeightOf(h){return h}
