// Exercise the exact shipped onload callback, including all earlier style/CRM enhancements.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'linkedom');
const {document}=parseHTML('<html><head></head><body><div id="cc-staff"><main id="ccs-main" data-screen="today"></main></div></body></html>');
let q=[];const ctx={document,window:{},MutationObserver:class{observe(){}},addEventListener:()=>{},requestAnimationFrame:f=>q.push(f)};
vm.createContext(ctx);const html=fs.readFileSync(__dirname+'/../dist/staff.readability.footer.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(js);vm.runInContext(js,ctx);
const loader=document.body.querySelector('script');assert(loader.integrity.includes('sha384-'));loader.onload();while(q.length)q.shift()();
assert.deepEqual([...document.head.querySelectorAll('style')].map(s=>s.id),['ccs-padding','ccs-viewport-fit','ccs-customer-crm','ccs-executive','ccs-readability']);
const css=document.getElementById('ccs-readability').textContent;assert(css.includes('--read-detail:18px'));assert(css.includes('.ap-col .wd-p'));assert(css.includes('white-space:normal!important'));assert(css.includes('.ccs-next,.at-why'));assert(html.length<50000);
console.log('Exact production-loader execution and readability style integration passed. Rendered browser verification remains outstanding.');
