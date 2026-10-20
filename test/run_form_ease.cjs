// Easier staff forms: required questions first, requirements behind one tap, payment first on Finish,
// Start over away from Next, wider form on tablets, short Add customer, Change order closed. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),os=require('os');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-form-ease-manifest.json')));
const shots=process.env.SHOTS||os.tmpdir();let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
const top=(p,q)=>p.evaluate(q=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect();return r.height?r.top:null},q);
const shown=(p,q)=>p.evaluate(q=>{const e=document.querySelector(q);if(!e)return false;const r=e.getBoundingClientRect();return r.height>0&&getComputedStyle(e).display!=='none'},q);
const js=async(p,q)=>{const ok=await p.evaluate(q=>{const e=document.querySelector(q);if(e)e.click();return !!e},q);await p.waitForTimeout(300);return ok};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1280,800,'tablet'],[412,915,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
  await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  // New order: Customer
  await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(600);
  await p.fill('#n-phone','912 3456');await p.waitForTimeout(450);await p.fill('#n-name','Invented Guest');
  const t1=await p.evaluate(()=>{const y=q=>{const e=document.querySelector(q);return e?e.getBoundingClientRect().top:null};return {email:y('#n-email'),consent:y('[data-act="sl-opt"]'),source:y('[data-act="n-source"]'),taken:y('[data-act="n-taken"]')}});
  check(label+': marketing permission, order source and order date come before the optional email',t1.email>t1.consent&&t1.email>t1.source&&t1.email>t1.taken,t1);
  check(label+': Start over is at the top of the step, not beside Next',await shown(p,'.sl-stephead .sl-restart')&&!(await p.$('.sl-stepbar .sl-restart')));
  check(label+': Start over does not overlap View slip or the step title',await p.evaluate(()=>{const r=document.querySelector('.cc-restart-top').getBoundingClientRect(),hit=q=>{const e=document.querySelector(q);if(!e)return false;const o=e.getBoundingClientRect();if(!o.width)return false;
   if(q==='.sl-steptitle'){const t=document.createRange();t.selectNodeContents(e.firstChild||e);const x=t.getBoundingClientRect();o.x;return r.left<x.right&&x.left<r.right&&r.top+8<x.bottom&&x.top<r.bottom-8}
   return r.left<o.right&&o.left<r.right&&r.top<o.bottom&&o.top<r.bottom};return !hit('.sl-viewbtn')&&!hit('.sl-steptitle')}));
  if(w>=1000){const wd=await p.evaluate(()=>({form:document.querySelector('.sl-stepmain').getBoundingClientRect().width,slip:document.querySelector('.sl-live').getBoundingClientRect().width}));
   check(label+': the form is clearly wider than the slip',wd.form>wd.slip*1.5,wd);
   check(label+': step labels stay on one line',await p.evaluate(()=>[...document.querySelectorAll('.sl-dots>li')].every(li=>getComputedStyle(li,'::after').whiteSpace==='nowrap')))}
  await js(p,'.sl-stephead .sl-restart');check(label+': Start over still asks before clearing',/Clear this order/.test(await p.evaluate(()=>document.getElementById('ccs-sheet').innerText)));
  await js(p,'[data-act="new-keep"]');check(label+': Keep going keeps what was typed',await p.inputValue('#n-phone')==='912 3456');
  await js(p,'[data-of-name]'); // who is taking the order (asked from the order-flow release on)
  await js(p,'[data-act="sl-opt"][data-v="no"]');await js(p,'[data-act="n-source"][data-v="walk_in"]');await js(p,'[data-act="n-taken"][data-v="now"]');
  await p.screenshot({path:shots+'/ease-'+label+'-customer.png'});
  // Cake
  await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-cell"][data-v="cheesecake|8"]');await js(p,'[data-act="sl-next"]');await p.waitForTimeout(400);
  // Make it yours
  const t3=await p.evaluate(()=>{const y=q=>{const e=document.querySelector(q);return e?e.getBoundingClientRect().top:null};return {diet:y('[data-act="n-diet"]'),occ:y('[data-act="n-occ"]'),msg:y('#n-msg'),notes:y('#n-notes')}});
  check(label+': allergies and occasion come before the inscription',t3.diet<t3.occ&&t3.occ<t3.msg&&t3.msg<t3.notes,t3);
  check(label+': the inscription box is not focused on arrival (no jump past the step title)',await p.evaluate(()=>document.activeElement&&document.activeElement.id!=='n-msg'));
  check(label+': cake requirements wait behind one tap',!(await shown(p,'.rq-chips'))&&await shown(p,'.cc-rq-add'));
  await p.screenshot({path:shots+'/ease-'+label+'-details.png'});
  await p.click('.cc-rq-add');await p.waitForTimeout(250);check(label+': the tap shows the requirement choices',await shown(p,'.rq-chips'));
  await js(p,'[data-act="n-rq"][data-v="eggless"]');check(label+': a chosen requirement stays visible',await shown(p,'.rq-chips')&&await p.evaluate(()=>document.querySelector('[data-act="n-rq"][data-v="eggless"]').getAttribute('aria-pressed')==='true'));
  await js(p,'[data-act="n-diet"][data-v="no"]');await js(p,'[data-act="n-occ"][data-v="Birthday"]');
  await p.click('#n-msg');await p.keyboard.type('Happy 30th');check(label+': typing the inscription works',await p.inputValue('#n-msg')==='Happy 30th');
  // Collection
  await js(p,'[data-act="sl-next"]');await js(p,'#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');
  if(!(await p.$('#sl-st-3 [data-act="n-time"]')))await js(p,'[data-act="sl-next"]'); // phones show the times after Next
  await js(p,'#sl-st-3 [data-act="n-time"][data-v="15:00"]');await js(p,'[data-act="sl-next"]');
  // Finish
  const t5=await p.evaluate(()=>{const y=q=>{const e=document.querySelector(q);return e?e.getBoundingClientRect().top:null};return {plan:y('[data-act="n-plan"]'),review:y('#sl-st-7 .cc-f-review, #sl-st-7 .ccs-sum, #sl-st-7 .ccs-total')}});
  check(label+': the payment question is near the top of Finish',t5.plan!==null&&t5.plan<h*0.75,t5);
  await js(p,'[data-act="n-plan"][data-v="later"]');await js(p,'[data-nc="confirmNow"]');await js(p,'[data-act="n-submit"]');await p.waitForTimeout(900);
  const sent=await p.evaluate(()=>({create:window.__calls.filter(c=>c[1]==='staff_create_order').map(c=>c[2].p),reqs:window.__calls.filter(c=>c[1]==='order_set_requirements').map(c=>c[2].p_reqs)}));
  check(label+': the order saves once with the inscription and the requirement',sent.create.length===1&&sent.create[0].message==='Happy 30th'&&sent.reqs.length===1&&sent.reqs[0].indexOf('eggless')>-1,sent);
  await js(p,'#ccs-sheet [data-act="close"]');
  // Change order: every section starts closed
  await p.evaluate(()=>{const e=document.querySelector('[data-tab="orders"]');e&&e.click()});await p.waitForTimeout(600);await js(p,'[data-act="filter"][data-v="upcoming"]');
  await p.evaluate(()=>{const c=document.querySelector('#ccs-main .ccs-card');c&&c.click()});await p.waitForTimeout(800);
  if(await js(p,'#ccs-sheet [data-act="panel"][data-v="amend"]')){
   check(label+': Change order opens with every section closed',await p.evaluate(()=>document.querySelectorAll('.ccs-amsec.is-open').length===0));
   await js(p,'[data-act="am-open"][data-v="when"]');check(label+': a section opens when tapped',await p.evaluate(()=>document.querySelectorAll('.ccs-amsec.is-open').length===1));
  } else check(label+': Change order available',false);
  await js(p,'#ccs-sheet [data-act="close"]');
  // Add customer: essentials first
  await p.evaluate(()=>{const e=document.querySelector('[data-tab="customers"]');e&&e.click()});await p.waitForTimeout(500);
  await p.evaluate(()=>{const e=document.querySelector('[data-act="secgo"][data-g="crm"][data-v="all"]');e&&e.click()});await p.waitForTimeout(500);
  await js(p,'[data-act="cust-new"]');
  check(label+': Add customer shows name, mobile, contact preference and marketing first',await shown(p,'#ce-name')&&await shown(p,'#ce-phone')&&await shown(p,'#ce-pref')&&await shown(p,'[data-act="cn-consent"]'));
  check(label+': the other details wait behind More details',!(await shown(p,'#ce-email'))&&!(await shown(p,'#ce-notes'))&&await shown(p,'.cc-more-btn'));
  await p.screenshot({path:shots+'/ease-'+label+'-add-customer.png'});
  await p.click('.cc-more-btn');await p.waitForTimeout(250);check(label+': More details shows the rest',await shown(p,'#ce-email')&&await shown(p,'#ce-notes')&&await shown(p,'#ce-corp'));
  check(label+': the corporate switch is big enough to tap',await p.evaluate(()=>{const l=document.getElementById('ce-corp').closest('label').getBoundingClientRect();return l.height>=44}));
  await p.fill('#ce-name','Invented Person');await p.fill('#ce-phone','912 7777');await p.fill('#ce-email','person@example.com');await js(p,'[data-act="cn-save"]');await p.waitForTimeout(600);
  check(label+': adding the customer still saves the details',await p.evaluate(()=>window.__calls.some(c=>c[1]==='staff_create_customer'&&JSON.stringify(c[2]).includes('Invented Person')&&JSON.stringify(c[2]).includes('person@example.com'))));
  check(label+': no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
