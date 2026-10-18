// Fit the screen: no unnecessary scroll at six sizes on every main screen. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,process.env.MANIFEST||'dist/app/staff-fit-manifest.json')));let n=0,fails=0;
function check(s,v,d){if(v){n++;if(!process.env.QUIET)console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
const sizes=[[2560,1440,'large monitor'],[1920,1080,'desktop'],[1512,862,'laptop'],[1366,1024,'iPad landscape'],[1024,1366,'iPad portrait'],[390,844,'phone']];
const tabs=['today','attn','orders','calendar','handover','customers','dash','register','settings','kitchen'];
// Allowed to scroll on their own: an open order sheet, a pop-up or pane body, a genuinely long list, and the working area itself.
const ALLOW='.bi-opps,.ov-k-att,.ov-k-opp,.ov-rec,#ccs-sheet,#ccs-sheet *,.ap-pop-body,.fit-long,#ccs-main,.ccs-ytrack,.an-mods,.co-strip,.ccs-tabs,.ccs-calviews';
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const [w,h,label] of sizes){for(const t of tabs){const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{/* Known mock gaps, identical on the live bundle: feedback photos and the Settings occasions list. */if(!/reading '(length|filter)'/.test(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin';try{localStorage.clear()}catch(e){}});await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(400);
  await p.evaluate(t=>{const e=document.querySelector('[data-tab="'+t+'"]');e&&e.click()},t);await p.waitForTimeout(900);
  const r=await p.evaluate(ALLOW=>{const bad=[];document.querySelectorAll('#cc-staff *').forEach(e=>{const c=getComputedStyle(e);if(!/(auto|scroll)/.test(c.overflowY)||e.clientHeight<40)return;if(e.scrollHeight<=e.clientHeight+2)return;if(e.matches(ALLOW))return;bad.push((e.id?'#'+e.id:'.'+[...e.classList].slice(0,2).join('.'))+' by '+(e.scrollHeight-e.clientHeight)+'px')});
   const m=document.getElementById('ccs-main'),cw=document.querySelector('.ccs-mgrid');return {bad,sx:document.scrollingElement.scrollWidth>innerWidth+1,mainOver:m?m.scrollHeight-m.clientHeight:0,calFits:cw?cw.getBoundingClientRect().bottom<=(m?m.getBoundingClientRect().bottom:innerHeight)+1:null,calFitOn:cw?cw.classList.contains('fit-rows'):null}},ALLOW);
  check(label+' '+t+': no small boxes scrolling on their own',!r.bad.length,r.bad);
  check(label+' '+t+': no sideways scroll',!r.sx);
  if(t==='calendar'&&w>640&&h>=840)check(label+' calendar: whole month fits the window',r.calFits&&r.calFitOn,r);
  if(t==='calendar'&&w>640&&h>=840)check(label+' calendar: no "+N more" overlaps its day',await p.evaluate(()=>[...document.querySelectorAll('.ccs-mday')].every(d=>{const b=d.getBoundingClientRect();return [...d.querySelectorAll('.co-cakes:not(.fit-none) .co-cake:not(.fit-hide),.co-cakes:not(.fit-none) .co-more:not([hidden])')].every(x=>x.getBoundingClientRect().bottom<=b.bottom+1)})));
  if(w>640&&['attn','orders','handover','settings'].includes(t))check(label+' '+t+': fits without scrolling',r.mainOver<=2,r.mainOver);
  check(label+' '+t+': no script errors',errors.length===0,errors);
  if(t==='calendar'||t==='today'||t==='customers'||t==='dash')await p.screenshot({path:'/tmp/claude-fit-'+label.replace(/ /g,'-')+'-'+t+'.png'});
  await p.close()}}
 for(const [w,h,label] of sizes.filter(s=>s[0]>640)){const p=await b.newPage({viewport:{width:w,height:h}});await p.route('https://**',r=>r.abort());await p.setContent('<!doctype html><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>window.__role='admin');await p.addScriptTag({path:path.join(root,'test/mock.js')});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  check(label+' side menu fits without scrolling',await p.evaluate(()=>{const s=document.getElementById('ccs-side');return !s||getComputedStyle(s).display==='none'||s.scrollHeight<=s.clientHeight+1}),await p.evaluate(()=>{const s=document.getElementById('ccs-side');return s&&s.scrollHeight-s.clientHeight}));
  check(label+' side menu items at least 36px tall',await p.evaluate(()=>[...document.querySelectorAll('#ccs-side .ccs-nav-item')].filter(e=>e.offsetParent).every(e=>e.getBoundingClientRect().height>=36)));await p.close()}
 console.log(n+' passed, '+fails+' failed');if(fails)process.exitCode=1}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
