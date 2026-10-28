const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}),fail=[],errors=[];
for(const [w,h] of [[1440,1000],[1024,900],[768,1024],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h},hasTouch:w<1200});p.on('pageerror',e=>errors.push({w,error:e.message}));await p.route(/^https?:/,r=>r.abort());
 await p.goto(require('node:url').pathToFileURL(__dirname+'/analytics-workspace-fixture.html').href);await p.waitForSelector('[data-tab="dash"]',{state:'attached'});await p.locator('[data-tab="dash"]').first().evaluate(e=>e.click());await p.waitForSelector('.an-mod');
 if(await p.locator('.aw-board').count())fail.push({w,reason:'Overview changed'});
 for(const mod of ['ck','cs','mk','wb','sd','ci','da']){
  await p.locator('.an-mod[data-v="'+mod+'"]').click();await p.waitForTimeout(150);
  const result=await p.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth+1,boards:document.querySelectorAll('.aw-board').length,cards:document.querySelectorAll('.aw-island').length,overflow:[...document.querySelectorAll('.aw-island')].filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1;}).map(e=>e.dataset.awTitle)}));
  if(result.wide||result.overflow.length)fail.push({w,mod,...result});
  console.log(w,mod,JSON.stringify(result));
  if(w===1440||w===390)await p.screenshot({path:(process.env.ANALYTICS_SHOTS||'/tmp')+'/analytics-'+mod+'-'+w+'.png'});
 }
 await p.locator('.an-mod[data-v="ck"]').click();await p.waitForSelector('.aw-board');
 await p.locator('[data-aw-action="edit"]').click();const id=await p.locator('.aw-island').first().getAttribute('data-aw-id');
 await p.locator('.aw-island').first().locator('[data-aw-action="down"]').click();await p.locator('[data-aw-action="save"]').click();
 const second=await p.locator('.aw-island').nth(1).getAttribute('data-aw-id');if(second!==id)fail.push({w,reason:'order did not save'});
 await p.close();
}
await b.close();console.log(JSON.stringify({fail,errors}));if(fail.length||errors.length)process.exitCode=1;
})();
