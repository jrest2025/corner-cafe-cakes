// Cake for line on the order's Cake section. Invented data; remote requests blocked.
const fs=require('fs'),path=require('path');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),m=JSON.parse(fs.readFileSync(path.join(root,'dist/app/staff-cakefor-manifest.json')));let n=0,fails=0;const shots=process.env.SHOTS||'/tmp';
function check(s,v,d){if(v){n++;console.log('PASS '+s)}else{fails++;console.log('FAIL '+s+(d!==undefined?' -> '+JSON.stringify(d):''))}}
let mock=fs.readFileSync(path.join(root,'test/mock.js'),'utf8');
mock=mock.replace("id: 'o1', reference: 'CC-1001',","id: 'o1', reference: 'CC-1001', occasion_for: 'Mere', occasion_for_from_message: true,");
mock=mock.replace("if (fn === 'get_order_setup')","if (fn === 'staff_set_cake_for') { window.__cf = args; if (args.p_name === 'FAIL') return Promise.resolve({ data: { ok: false, message: 'Your login cannot change orders.' } }); return Promise.resolve({ data: { ok: true, name: args.p_name } }); }\n      if (fn === 'get_order_setup')");
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
 for(const [w,h,label] of [[1366,1024,'ipad-landscape'],[390,844,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:h}}),errors=[];p.on('pageerror',e=>{if(!/^Cannot read properties of undefined \(reading '(length|filter)'\)$/.test(e.message))errors.push(e.message)});await p.route('https://**',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><div id="cc-staff"></div>');await p.evaluate(()=>{window.__role='admin'});
  await p.addScriptTag({content:mock});await p.addScriptTag({path:path.join(root,m.file)});await p.waitForTimeout(500);
  await p.evaluate(()=>{document.querySelector('[data-tab="orders"]').click()});await p.waitForTimeout(600);
  await p.locator('[data-act="open-order"][data-id="o1"]').first().evaluate(e=>e.click());await p.waitForTimeout(700);
  const row=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('#ccs-sheet dt')].find(x=>x.textContent==='Cake for');return d?d.nextElementSibling.innerText.replace(/\s+/g,' ').trim():null});
  check(label+': Cake for shows under Occasion',await p.evaluate(()=>{const d=[...document.querySelectorAll('#ccs-sheet dt')].find(x=>x.textContent==='Cake for');return !!d&&d.previousElementSibling.previousElementSibling.textContent==='Occasion'}));
  check(label+': name and source shown',/Mere/.test(await row())&&/from the cake message/.test(await row()),await row());
  await p.locator('#ccs-sheet .cf-chg').scrollIntoViewIfNeeded();await p.screenshot({path:shots+'/claude-cakefor-'+label+'.png'});
  await p.locator('#ccs-sheet .cf-chg').click();await p.waitForTimeout(200);
  check(label+': Change opens one field, focused',await p.evaluate(()=>document.activeElement&&document.activeElement.id==='cf-name'));
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  check(label+': Escape cancels the change, order stays open',await p.locator('#cf-name').count()===0&&await p.evaluate(()=>document.getElementById('ccs-sheet').classList.contains('ccs-open')));
  await p.locator('#ccs-sheet .cf-chg').click();await p.waitForTimeout(150);await p.fill('#cf-name','FAIL');await p.locator('.cf-edit button[type=submit]').click();await p.waitForTimeout(300);
  check(label+': a refused save shows the reason and keeps the typing',/cannot change orders/.test(await p.locator('.cf-edit').innerText())&&await p.inputValue('#cf-name')==='FAIL');
  await p.fill('#cf-name','  Mere   Tora ');await p.locator('.cf-edit button[type=submit]').click();await p.waitForTimeout(300);
  check(label+': saved name is tidied and shown',/Mere Tora/.test(await row())&&!/from the cake message/.test(await row()),await row());
  check(label+': server asked with the order id',await p.evaluate(()=>window.__cf&&window.__cf.p_order==='o1'&&window.__cf.p_name==='Mere Tora'));
  await p.screenshot({path:shots+'/claude-cakefor-saved-'+label+'.png'});
  // An order without a recurring occasion shows no line
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await p.locator('[data-act="open-order"][data-id="o2"]').first().evaluate(e=>e.click());await p.waitForTimeout(600);
  check(label+': no Cake for line when the occasion is not Birthday, Anniversary or Wedding',(await row())===null);
  check(label+': no script errors'+(errors.length?' '+errors.join('|'):''),errors.length===0);await p.close()}
}finally{await b.close()}console.log(n+' passed, '+fails+' failed');process.exit(fails?1:0)})();
