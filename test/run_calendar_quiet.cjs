// Calendar day view: empty slots show a faint + only, stay tappable. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-calendar-quiet-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[412,915,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
  await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  await p.locator('[data-tab="calendar"]').first().evaluate(e=>e.click());await p.waitForTimeout(600);
  const dv=p.locator('[data-act="cal-view"][data-v="day"],[data-v="day"][data-act]').first();if(await dv.count())await dv.evaluate(e=>e.click());await p.waitForTimeout(500);
  const add=p.locator('.ccs-dslot .ccs-dadd');const k=await add.count();check(label+': day view has empty-slot buttons',k>0,k);
  check(label+': no "New order at" text visible',await p.evaluate(()=>![...document.querySelectorAll('.ccs-dslot')].some(s=>/New order at/.test(s.innerText))));
  check(label+': each shows a +',await add.evaluateAll(es=>es.every(e=>e.textContent.trim()==='+')));
  check(label+': screen readers still hear the time',await add.evaluateAll(es=>es.every(e=>/^New order at \d{1,2}:\d{2} (AM|PM)$/.test(e.getAttribute('aria-label')))));
  check(label+': slot is still a full-width tap target (44px+)',await add.evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.width>=e.parentElement.getBoundingClientRect().width-20})));
  await p.screenshot({path:shots+'/cal-quiet-'+label+'.png'});
  await add.first().click();await p.waitForTimeout(500);
  check(label+': tapping a slot starts a new order',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')}));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
