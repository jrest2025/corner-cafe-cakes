// Shared staff date picker: DOM, data preservation, rerenders and responsive layout.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),js=fs.readFileSync(path.join(root,'src/staff.date-picker.js'),'utf8'),css=fs.readFileSync(path.join(root,'src/staff.date-picker.css'),'utf8');let pass=0,fail=0;
function check(name,ok,detail){if(ok){pass++;console.log('PASS '+name)}else{fail++;console.log('FAIL '+name+(detail?' -> '+JSON.stringify(detail):''))}}
async function page(browser,width){const p=await browser.newPage({viewport:{width,height:width<600?844:900},hasTouch:width<760});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="cc-staff"><div class="ccs-field"><label for="n-date">Pickup date</label><input id="n-date" type="date" min="2026-10-20" max="2026-11-20"></div></div><aside id="ccs-sheet"><div class="ccs-field"><label for="ws-due">Follow-up due</label><input id="ws-due" required type="date" value="2026-10-25"></div></aside><script>${js.replace(/<\/script/gi,'<\\/script')}</script>`);await p.waitForTimeout(80);return {p,errors}}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 for(const width of [1366,768,390]){const {p,errors}=await page(b,width);const tag=width+'px';
  check(tag+' enhances both main and sheet dates',await p.locator('.cc-dp-trigger').count()===2);
  check(tag+' keeps native values and constraints',await p.locator('#ws-due').inputValue()==='2026-10-25'&&await p.locator('#n-date').getAttribute('min')==='2026-10-20');
  await p.locator('#n-date + .cc-dp-trigger').click();check(tag+' opens one custom dialog',await p.locator('#cc-date-picker-layer [role=dialog]').count()===1);
  check(tag+' disables days before min',await p.locator('[data-cc-date-day="2026-10-19"]').isDisabled());
  check(tag+' offers direct year navigation',await p.locator('[aria-label="Previous year"],[aria-label="Next year"]').count()===2);
  check(tag+' exposes one roving calendar-grid stop',await p.locator('.cc-dp-day[tabindex="0"]').count()===1);
  await p.keyboard.press('ArrowRight');check(tag+' arrow key moves one day',await p.locator('[data-cc-date-day="2026-10-21"]').evaluate(el=>el===document.activeElement));
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('PageDown');check(tag+' Page Down moves one month',await p.locator('[data-cc-date-day="2026-11-20"]').evaluate(el=>el===document.activeElement));
  await p.keyboard.press('PageUp');
  await p.locator('[data-cc-date-day="2026-10-22"]').click();
  check(tag+' selection writes original input',await p.locator('#n-date').inputValue()==='2026-10-22');
  check(tag+' button shows the chosen date',(await p.locator('#n-date + .cc-dp-trigger').innerText()).includes('22 Oct 2026'));
  await p.locator('#n-date + .cc-dp-trigger').click();await p.locator('[data-cc-date-clear]').click();check(tag+' optional date can be cleared',await p.locator('#n-date').inputValue()==='');
  await p.evaluate(()=>{const wrap=document.querySelector('#cc-staff .ccs-field');wrap.innerHTML='<label for="am-date">Collection date</label><input id="am-date" type="date" value="2026-11-02">'});await p.waitForTimeout(80);
  check(tag+' enhances date fields added by app rerenders',await p.locator('#am-date + .cc-dp-trigger').count()===1);
  await p.locator('#ws-due + .cc-dp-trigger').click();check(tag+' required date has no clear action',await p.locator('[data-cc-date-clear]').count()===0);check(tag+' required trigger is announced',await p.locator('#ws-due + .cc-dp-trigger').getAttribute('aria-required')==='true');await p.keyboard.press('Escape');
  check(tag+' Escape closes and restores trigger',await p.locator('#cc-date-picker-layer').isHidden()&&await p.locator('#ws-due + .cc-dp-trigger').getAttribute('aria-expanded')==='false');
  const box=await p.locator('#am-date + .cc-dp-trigger').boundingBox();check(tag+' trigger is at least 44px tall',box&&box.height>=44,box);
  check(tag+' no script errors',errors.length===0,errors);await p.close();
 }
 console.log(`${pass} passed, ${fail} failed`);if(fail)process.exitCode=1;
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
