// Order dates typed on a keyboard: the New order "Other date" must keep the whole typed date (not year 1 or 2),
// past dates stay allowed, and picking from a calendar still updates the form at once. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-date-typing-manifest.json')));
let n=0,fails=0;function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
const fiji=o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date(Date.now()+o*864e5));
// The live shared date picker (another add-on in the page footer), to check the calendar path still works with it.
const picker={js:execFileSync('git',['-C',root,'show','e414d14:src/staff.date-picker.js']).toString(),css:execFileSync('git',['-C',root,'show','e414d14:src/staff.date-picker.css']).toString()};
async function open(b,withPicker){const p=await b.newPage({viewport:{width:1024,height:768}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});
 if(withPicker){await p.addStyleTag({content:picker.css});await p.addScriptTag({content:picker.js})}
 await p.waitForTimeout(500);return {p,errors}}
const js=async(p,s)=>{const ok=await p.evaluate(s=>{const e=document.querySelector(s);if(e)e.click();return !!e},s);await p.waitForTimeout(250);return ok};
// Customer, cake and occasion steps; the order was taken nine days ago (so a past collection date is allowed).
async function toCollection(p){await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(500);
 await p.fill('#n-phone','912 3456');await p.waitForTimeout(450);await p.fill('#n-name','Invented Guest');await js(p,'[data-of-name]');await js(p,'[data-act="sl-opt"][data-v="no"]');
 await js(p,'[data-act="n-source"][data-v="walk_in"]');await js(p,'[data-act="n-taken"][data-v="other"]');await p.evaluate(v=>{const e=document.getElementById('n-takedate');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},fiji(-9));await p.waitForTimeout(150);
 await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-cell"][data-v="cheesecake|8"]');await js(p,'[data-act="sl-next"]');
 await js(p,'[data-act="n-diet"][data-v="no"]');await js(p,'[data-act="n-occ"][data-v="Birthday"]');await js(p,'[data-act="sl-next"]')}
async function finish(p){await js(p,'[data-act="n-time"][data-v="15:00"]');await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-plan"][data-v="later"]');await js(p,'[data-act="n-submit"]');await p.waitForTimeout(900);
 return p.evaluate(()=>({dates:window.__calls.filter(c=>c[1]==='staff_create_order').map(c=>c[2]&&c[2].p&&c[2].p.date),err:(document.querySelector('#ccs-sheet .ccs-err,#ccs-sheet [role=alert]')||{}).textContent||''}))}
// The order the browser shows the date segments in (day first or month first).
async function order(p){const h=await p.evaluateHandle(()=>{const i=document.createElement('input');i.type='date';document.body.appendChild(i);i.focus();return i});
 await p.keyboard.type('01022026');const v=await h.evaluate(e=>e.value);await h.evaluate(e=>e.remove());return v==='2026-01-02'?'mdy':v==='2026-02-01'?'dmy':'unknown:'+v}
const state=p=>p.evaluate(()=>{const e=document.getElementById('n-date');return {v:e&&e.value,focus:document.activeElement===e}});
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const want=fiji(-7),[Y,M,D]=want.split('-');let fmt;
 // 1. Typing a past date on a keyboard, digit by digit, into an empty field.
 {const {p,errors}=await open(b,false);fmt=await order(p);check('browser date order detected ('+fmt+')',fmt==='mdy'||fmt==='dmy',fmt);
  await toCollection(p);check('Other date offered',await js(p,'[data-act="n-date-other"]'));
  await p.focus('#n-date');const el=await p.$('#n-date');const keys=(fmt==='mdy'?M+D:D+M)+Y,trace=[];
  for(const ch of keys){await p.keyboard.type(ch);await p.waitForTimeout(80);trace.push(await state(p))}
  check('the field keeps focus until the last digit of the year',trace.slice(0,-1).every(t=>t.focus),trace);
  check('no redraw while the year is still being typed',trace.slice(0,-1).every(t=>t.v===''||/^0/.test(t.v)),trace);
  check('the whole typed date is kept ('+want+')',trace[trace.length-1].v===want,trace[trace.length-1]);
  check('finishing the year updates the form at once',await el.evaluate(e=>!e.isConnected));
  check('the collection times are offered straight after',await p.locator('[data-act="n-time"]').count()>0);
  const r=await finish(p);check('the order is saved with the typed past date, not year 1 or 2',r.dates.length===1&&r.dates[0]===want,r);
  check('no script errors (typing)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 // 1b. Editing the day of a date that is already filled in (from a quick date button).
 {const {p,errors}=await open(b,false);await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(500);
  await p.fill('#n-phone','912 3456');await p.waitForTimeout(450);await p.fill('#n-name','Invented Guest');await js(p,'[data-of-name]');await js(p,'[data-act="sl-opt"][data-v="no"]');
  await js(p,'[data-act="n-source"][data-v="walk_in"]');await js(p,'[data-act="n-taken"][data-v="now"]');
  await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-cell"][data-v="cheesecake|8"]');await js(p,'[data-act="sl-next"]');
  await js(p,'[data-act="n-diet"][data-v="no"]');await js(p,'[data-act="n-occ"][data-v="Birthday"]');await js(p,'[data-act="sl-next"]');
  const chips=await p.evaluate(()=>[...document.querySelectorAll('.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)')].map(c=>c.dataset.v));
  const d0=chips[2]||chips[chips.length-1];await js(p,'.ccs-datechips [data-act="n-date"][data-v="'+d0+'"]');await js(p,'[data-act="n-date-other"]');
  check('the field starts with the chosen quick date',await p.inputValue('#n-date')===d0,{d0,v:await p.inputValue('#n-date')});
  const day=+d0.slice(8),nd=String(day<=27?day+1:day-1).padStart(2,'0'),edited=d0.slice(0,8)+nd;
  await p.focus('#n-date');if(fmt==='mdy')await p.keyboard.press('ArrowRight');const el=await p.$('#n-date'),trace=[];
  for(const ch of nd){await p.keyboard.type(ch);await p.waitForTimeout(80);trace.push(await state(p))}
  check('editing the day keeps focus for both digits',trace.every(t=>t.focus),trace);
  check('the edited date is kept ('+edited+')',trace[trace.length-1].v===edited,trace);
  check('no redraw while still in the field',await el.evaluate(e=>e.isConnected));
  await p.click('#ccs-sheet .ccs-step-body',{position:{x:5,y:5}}).catch(()=>p.mouse.click(5,5));await p.waitForTimeout(450);
  check('leaving the field updates the form',await el.evaluate(e=>!e.isConnected));
  check('the field shows the edited date after the update',await p.inputValue('#n-date')===edited);
  const r=await finish(p);check('the order is saved with the edited date',r.dates.length===1&&r.dates[0]===edited,r);
  check('no script errors (editing)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 // 2. Picking from a calendar (no typing): the form updates at once, as before.
 {const {p,errors}=await open(b,false);await toCollection(p);await js(p,'[data-act="n-date-other"]');
  await p.focus('#n-date');const el=await p.$('#n-date');
  await p.evaluate(v=>{const e=document.getElementById('n-date');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},want);await p.waitForTimeout(250);
  check('a picked date updates the form straight away',await el.evaluate(e=>!e.isConnected));
  const r=await finish(p);check('the order is saved with the picked date',r.dates.length===1&&r.dates[0]===want,r);
  check('no script errors (picked)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 // 3. With the shared calendar add-on from the live page: choose a day in its calendar.
 {const {p,errors}=await open(b,true);await toCollection(p);await js(p,'[data-act="n-date-other"]');
  check('the shared calendar replaces the typed field',await p.locator('#n-date + .cc-dp-trigger').count()===1);
  await p.locator('#n-date + .cc-dp-trigger').click();await p.waitForTimeout(200);
  if(!(await p.locator('[data-cc-date-day="'+want+'"]').count())){await p.click('[data-cc-date-move="-1"]');await p.waitForTimeout(150)}
  await p.click('[data-cc-date-day="'+want+'"]');await p.waitForTimeout(300);
  check('a day chosen in the shared calendar reaches the form',await p.locator('[data-act="n-time"]').count()>0&&await p.inputValue('#n-date')===want,await p.inputValue('#n-date'));
  const r=await finish(p);check('the order is saved with the calendar date',r.dates.length===1&&r.dates[0]===want,r);
  check('no script errors (shared calendar)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 // 4. The quick date buttons still work.
 {const {p,errors}=await open(b,false);await toCollection(p);const v=await p.evaluate(()=>{const c=document.querySelector('.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');return c&&c.dataset.v});await js(p,'.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');
  const r=await finish(p);check('a quick date button still saves its date',!!v&&r.dates.length===1&&r.dates[0]===v,{v,r});
  check('no script errors (quick date)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
