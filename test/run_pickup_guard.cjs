// Pickup date guard on New order (22 October 2026): a past pickup day can only be saved with an order day on or before
// it, and the pickup year must be sensible. Old order is not affected. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-pickup-guard-manifest.json')));
let n=0,fails=0;function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const OK=["Cannot read properties of undefined (reading 'length')","Cannot read properties of undefined (reading 'filter')"];
const fiji=o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date(Date.now()+o*864e5));
async function open(b){const p=await b.newPage({viewport:{width:1024,height:768}}),errors=[];p.on('pageerror',e=>{if(!OK.includes(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='manager';try{localStorage.clear()}catch(e){}});
 await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);return {p,errors}}
const js=async(p,s)=>{const ok=await p.evaluate(s=>{const e=document.querySelector(s);if(e)e.click();return !!e},s);await p.waitForTimeout(250);return ok};
async function toCollection(p,taken,takenDate){await p.evaluate(()=>{const e=[...document.querySelectorAll('[data-tab=new]')].pop();e&&e.click()});await p.waitForTimeout(500);
 await p.fill('#n-phone','912 3456');await p.waitForTimeout(450);await p.fill('#n-name','Invented Guest');await js(p,'[data-of-name]');await js(p,'[data-act="sl-opt"][data-v="no"]');
 await js(p,'[data-act="n-source"][data-v="walk_in"]');await js(p,'[data-act="n-taken"][data-v="'+taken+'"]');
 if(takenDate)await p.evaluate(v=>{const e=document.getElementById('n-takedate');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},takenDate);
 await p.waitForTimeout(150);await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-cell"][data-v="cheesecake|8"]');await js(p,'[data-act="sl-next"]');
 await js(p,'[data-act="n-diet"][data-v="no"]');await js(p,'[data-act="n-occ"][data-v="Birthday"]');await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-date-other"]')}
async function pick(p,v){await p.evaluate(v=>{const e=document.getElementById('n-date');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},v);await p.waitForTimeout(300)}
async function tryNext(p){await js(p,'[data-act="n-time"][data-v="15:00"]');await js(p,'[data-act="sl-next"]');await js(p,'[data-act="n-plan"][data-v="later"]');await js(p,'[data-act="n-submit"]');await p.waitForTimeout(900);
 return p.evaluate(()=>({saved:window.__calls.filter(c=>c[1]==='staff_create_order').length,text:(document.querySelector('#ccs-sheet')||document.body).innerText}))}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 {const {p,errors}=await open(b);await toCollection(p,'now');await pick(p,fiji(-5));const r=await tryNext(p);if(process.env.SHOTS){const el=await p.evaluateHandle(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode())if(/before the day they ordered/.test(t.textContent))return t.parentElement;return null});const info=await el.evaluate(e=>e?{tag:e.tagName,cls:e.className,role:e.getAttribute('role')}:null);console.log('MSG',JSON.stringify(info));if(info)await el.evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(200);await p.screenshot({path:process.env.SHOTS+'/guard-past.png'})}
  check('ordered "Today", pickup 5 days ago: not saved',r.saved===0,r.saved);
  check('it says to use Old order',/before the day they ordered.*Old order/s.test(r.text),r.text.slice(0,400));
  check('no script errors (1)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 {const {p,errors}=await open(b);await toCollection(p,'other',fiji(-9));await pick(p,fiji(-7));const r=await tryNext(p);
  check('ordered 9 days ago, pickup 7 days ago: saved',r.saved===1,r.saved);
  check('no script errors (2)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 {const {p,errors}=await open(b);await toCollection(p,'now');await pick(p,'0002-01-15');const r=await tryNext(p);if(process.env.SHOTS)await p.screenshot({path:process.env.SHOTS+'/guard-year.png'});
  check('pickup year 2: not saved',r.saved===0,r.saved);
  check('it asks to check the year',/Check the year of the pickup date/.test(r.text),r.text.slice(0,400));
  check('no script errors (3)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 {const {p,errors}=await open(b);await toCollection(p,'now');const v=await p.evaluate(()=>{const c=document.querySelector('.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');return c&&c.dataset.v});
  await js(p,'.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)');const r=await tryNext(p);
  check('a normal future order still saves',!!v&&r.saved===1,{v,saved:r.saved});
  check('no script errors (4)'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
 }finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
