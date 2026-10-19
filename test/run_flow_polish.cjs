// Flow polish: folded empty hours, one-line times, compact phone header. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-flow-polish-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[820,1180,'ipad-portrait'],[412,915,'phone'],[360,780,'small-phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
  await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  await p.locator('[data-tab="calendar"]').first().evaluate(e=>e.click());await p.waitForTimeout(600);
  const dv=p.locator('[data-act="cal-view"][data-v="day"],[data-v="day"][data-act]').first();if(await dv.count())await dv.evaluate(e=>e.click());await p.waitForTimeout(500);
  const info=await p.evaluate(()=>({folds:document.querySelectorAll('li.cc-fold').length,booked:document.querySelectorAll('.ccs-dslot.has-orders').length,visibleEmpty:[...document.querySelectorAll('.ccs-dslot:not(.has-orders)')].filter(l=>getComputedStyle(l).display!=='none').length,total:document.querySelectorAll('.ccs-dslot').length}));
  check(label+': empty hours folded into lines',info.folds>=1,info);
  check(label+': booked hours still shown',info.booked>=1&&[...await p.locator('.ccs-dslot.has-orders').evaluateAll(es=>es.map(e=>getComputedStyle(e).display))].every(d=>d!=='none'));
  check(label+': no two empty hours left side by side',await p.evaluate(()=>{const ls=[...document.querySelectorAll('ol.ccs-dslots>li')].filter(l=>getComputedStyle(l).display!=='none');for(let i=1;i<ls.length;i++){if(ls[i].classList.contains('ccs-dslot')&&!ls[i].classList.contains('has-orders')&&ls[i-1].classList.contains('ccs-dslot')&&!ls[i-1].classList.contains('has-orders'))return false}return true}));
  check(label+': fold says the time range in 12-hour format',await p.evaluate(()=>[...document.querySelectorAll('.cc-fold-t')].every(t=>/^\d{1,2}:\d{2} (AM|PM) – \d{1,2}:\d{2} (AM|PM)$/.test(t.textContent))),await p.evaluate(()=>[...document.querySelectorAll('.cc-fold-t')].map(t=>t.textContent)));
  check(label+': times on one line',await p.evaluate(()=>[...document.querySelectorAll('.ccs-dslot-t')].filter(t=>t.offsetParent).every(t=>{const lh=parseFloat(getComputedStyle(t).fontSize)*1.6;const first=t.firstChild;const r=document.createRange();r.selectNodeContents(first);return r.getClientRects().length===1})));
  check(label+': fold is a big enough tap target',await p.evaluate(()=>[...document.querySelectorAll('.cc-fold-btn')].every(b=>b.getBoundingClientRect().height>=44)));
  await p.screenshot({path:shots+'/flow-'+label+'.png'});
  const before=await p.locator('.ccs-dslot:not(.has-orders):not(.cc-folded)').count();
  await p.locator('.cc-fold-btn').first().click();await p.waitForTimeout(250);
  const after=await p.locator('.ccs-dslot:not(.has-orders):not(.cc-folded)').count();
  check(label+': tapping a fold shows those hours',after>before,[before,after]);
  await p.locator('.ccs-dslot:not(.has-orders):not(.cc-folded) .ccs-dadd').first().click();await p.waitForTimeout(400);
  check(label+': an unfolded hour still starts a new order',await p.evaluate(()=>{const s=document.getElementById('ccs-sheet');return !!s&&s.classList.contains('ccs-open')}));
  if(w<760){
   await p.keyboard.press('Escape');await p.waitForTimeout(300);
   const hb=await p.evaluate(()=>document.querySelector('.ccs-side').getBoundingClientRect().height);
   await p.evaluate(()=>{const mm=document.getElementById('ccs-main');window.scrollTo(0,400);if(mm)mm.scrollTop=400;window.dispatchEvent(new Event('scroll'));document.dispatchEvent(new Event('scroll'))});await p.waitForTimeout(400);
   const ha=await p.evaluate(()=>document.querySelector('.ccs-side').getBoundingClientRect().height);
   check(label+': header shrinks when scrolled',ha<hb-8,[hb,ha]);
   check(label+': New order still visible when scrolled',await p.evaluate(()=>{const b=document.querySelector('.ccs-topnew');const r=b&&b.getBoundingClientRect();return !!r&&r.height>=40&&r.top>=0}));
   await p.screenshot({path:shots+'/flow-'+label+'-scrolled.png'});
   await p.evaluate(()=>{const mm=document.getElementById('ccs-main');window.scrollTo(0,0);if(mm)mm.scrollTop=0;window.dispatchEvent(new Event('scroll'));document.dispatchEvent(new Event('scroll'))});await p.waitForTimeout(400);
   check(label+': header returns at the top',Math.abs(await p.evaluate(()=>document.querySelector('.ccs-side').getBoundingClientRect().height)-hb)<2);
  }
  check(label+': no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
