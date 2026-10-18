// Settings > Events and public holidays, with an invented events list. All remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-events-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const fiji=o=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date(Date.now()+o*864e5));
async function open(b,w,h,opt){opt=opt||{};const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!/reading '(length|filter)'/.test(e.message))errors.push(e.message)});p.on('dialog',d=>d.accept());await p.route('https://**',r=>r.abort());
 await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(r=>{window.__role=r;try{localStorage.clear()}catch(e){}},opt.role||'admin');await p.addScriptTag({path:path.join(root,'test/mock.js')});
 await p.evaluate(([d,missing])=>{const mk=window.__ccsMock,from=mk.from.bind(mk),rpc=mk.rpc.bind(mk);window.__ev=[{id:'e1',day:d.in3,ends_on:null,name:'Diwali',kind:'holiday',note:null},{id:'e2',day:d.in5,ends_on:d.in7,name:'Beer Fest',kind:'event',note:'At Cantina'}];window.__evCalls=[];
  mk.from=t=>{if(t!=='calendar_events')return from(t);const q={select(){return q},gte(){return q},order(){return q},then(res,rej){return Promise.resolve(missing?{error:{message:'relation "public.calendar_events" does not exist'}}:{data:window.__ev.slice().sort((a,b)=>a.day<b.day?-1:1)}).then(res,rej)}};return q};
  mk.rpc=(nm,a)=>{if(nm==='calendar_event_save'){window.__evCalls.push([nm,a]);if(window.__ev.some(e=>e.day===a.p_day&&e.name.toLowerCase()===a.p_name.toLowerCase()&&e.id!==a.p_id))return Promise.resolve({data:{ok:false,message:'That event is already on the calendar for that date.'}});if(a.p_id){const e=window.__ev.find(x=>x.id===a.p_id);Object.assign(e,{day:a.p_day,ends_on:a.p_ends_on,name:a.p_name,kind:a.p_kind,note:a.p_note})}else window.__ev.push({id:'n'+window.__ev.length,day:a.p_day,ends_on:a.p_ends_on,name:a.p_name,kind:a.p_kind,note:a.p_note});return Promise.resolve({data:{ok:true}})}
   if(nm==='calendar_event_delete'){window.__evCalls.push([nm,a]);window.__ev=window.__ev.filter(x=>x.id!==a.p_id);return Promise.resolve({data:{ok:true}})}return rpc(nm,a)}},[{in3:fiji(3),in5:fiji(5),in7:fiji(7)},!!opt.missing]);
 await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);if(!await p.locator('[data-tab="settings"]').count())return {p,errors};await p.locator('[data-tab="settings"]').first().evaluate(e=>e.click());await p.waitForTimeout(600);
 const nav=p.locator('[data-setk="Events and public holidays"]');if(await nav.count())await nav.first().evaluate(e=>e.click());else await p.evaluate(()=>{const d=document.querySelector('.ev-settings');if(d)d.open=true});await p.waitForTimeout(500);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of [[1512,862,'laptop'],[1024,1366,'iPad portrait'],[390,844,'phone']]){
  const {p,errors}=await open(b,w,h);
  check(label+' Settings lists the new section',await p.locator('[data-setk="Events and public holidays"]').count()>0||await p.locator('.ev-settings').count()===1);
  check(label+' section is visible',await p.locator('.ev-settings .ev-form').isVisible());
  const items=await p.locator('.ev-item').allInnerTexts();check(label+' upcoming entries listed with type',items.length===2&&items[0].includes('Diwali')&&items[0].includes('Public holiday')&&items[1].includes('Beer Fest')&&items[1].includes('Café event')&&items[1].includes(' to '),items);
  // Add: missing name is refused without a call.
  await p.locator('[data-ev="save"]').click();await p.waitForTimeout(200);check(label+' missing name explained, nothing saved',(await p.locator('#ev-msg').innerText()).includes('name')&&await p.evaluate(()=>window.__evCalls.length===0));
  await p.fill('#ev-name','Corner Café anniversary');await p.fill('#ev-day',fiji(10));await p.fill('#ev-end',fiji(9));await p.locator('[data-ev="save"]').click();await p.waitForTimeout(200);
  check(label+' last day before date refused',(await p.locator('#ev-msg').innerText()).includes('before')&&await p.evaluate(()=>window.__evCalls.length===0));
  check(label+' typing kept after the error',await p.inputValue('#ev-name')==='Corner Café anniversary');
  await p.fill('#ev-end','');await p.locator('[data-ev="kind"][data-v="holiday"]').click();await p.waitForTimeout(150);check(label+' choosing a type keeps what was typed',await p.inputValue('#ev-name')==='Corner Café anniversary'&&await p.inputValue('#ev-day')===fiji(10));
  await p.locator('[data-ev="kind"][data-v="event"]').click();await p.waitForTimeout(150);
  await p.locator('[data-ev="save"]').click();await p.waitForTimeout(500);
  const call=await p.evaluate(()=>window.__evCalls.at(-1));check(label+' added with the right details',call&&call[1].p_id===null&&call[1].p_name==='Corner Café anniversary'&&call[1].p_kind==='event'&&call[1].p_day,call);
  check(label+' list refreshes with the new entry',(await p.locator('.ev-item').allInnerTexts()).some(t=>t.includes('Corner Café anniversary')));
  check(label+' form cleared after adding',await p.inputValue('#ev-name')==='');
  // Duplicate refused by the server message.
  await p.fill('#ev-name','Diwali');await p.fill('#ev-day',fiji(3));await p.locator('[data-ev="kind"][data-v="holiday"]').click();await p.locator('[data-ev="save"]').click();await p.waitForTimeout(400);check(label+' duplicate explained',(await p.locator('#ev-msg').innerText()).includes('already'));
  // Change Beer Fest.
  await p.locator('.ev-item').filter({hasText:'Beer Fest'}).locator('[data-ev="edit"]').click();await p.waitForTimeout(250);check(label+' change fills the form',await p.inputValue('#ev-name')==='Beer Fest'&&await p.inputValue('#ev-note')==='At Cantina');
  await p.fill('#ev-name','The Big Beer Fest');await p.locator('[data-ev="save"]').click();await p.waitForTimeout(500);
  check(label+' change saved to the same entry',await p.evaluate(()=>{const c=window.__evCalls.at(-1);return c[1].p_id==='e2'&&c[1].p_name==='The Big Beer Fest'&&c[1].p_ends_on}));
  // Remove (confirm accepted).
  await p.locator('.ev-item').filter({hasText:'Corner Café anniversary'}).locator('[data-ev="del"]').click();await p.waitForTimeout(500);
  check(label+' removed after confirming',await p.evaluate(()=>window.__evCalls.at(-1)[0]==='calendar_event_delete')&&!(await p.locator('.ev-item').allInnerTexts()).some(t=>t.includes('anniversary')));
  check(label+' no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'/tmp/claude-ev-'+label.replace(/ /g,'-')+'.png'});
  check(label+' no script errors',errors.length===0,errors);await p.close()}
 {const {p,errors}=await open(b,1512,862,{missing:true});check('list not set up yet: explained, no form',(await p.locator('.ev-settings').innerText()).includes('not been set up')&&await p.locator('#ev-form').count()===0);check('list not set up yet: no script errors',errors.length===0,errors);await p.close()}
 {const {p}=await open(b,1512,862,{role:'front_of_house'});check('staff without Settings permission do not see the section',await p.locator('.ev-settings').count()===0);await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
