// DOM behaviour checks; no real records, network calls or browser layout assumptions.
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'linkedom'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const metrics=['Customers','New this month','Returning this month','Repeat purchase rate','Revenue from returning customers','Follow-ups due today','Overdue follow-ups','Contacts this month'];
const actions=['Follow-ups overdue','Follow-ups due today','Quotes waiting for a reply','Occasions coming up','Ordered this time last year','Regulars gone quiet'];
const {document}=parseHTML('<html><body><div id="cc-staff"><main id="ccs-main" data-screen="customers-ov"><div class="ccs-head"><h1 class="ccs-title">Customers</h1></div><div class="crm-kpis">'+metrics.map((s,i)=>'<div class="crm-kpi ov-kpi"><span class="ov-kh"><span class="ov-kl">'+s+'</span></span><b class="ov-kv">'+i+'</b><span class="ov-ks">Real definition '+i+'</span></div>').join('')+'</div><div class="crm-row"><section class="ov-att">'+actions.map(s=>'<div class="ov-arow ix-crow"><span class="ov-an">0</span><span class="ov-at"><b>'+s+'</b><span>Existing explanation</span></span></div>').join('')+'</section><section class="ov-rec"><button class="ov-ev" data-act="open-customer" data-id="sample-id"><span class="ov-et"><b>Sample Customer</b><span>Existing activity</span></span><span class="ov-ew">Today</span></button></section></div></main></div></body></html>');
let tick;const ctx={document,MutationObserver:class{constructor(f){tick=f}observe(){}},requestAnimationFrame:f=>f()};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../src/staff.customer-crm.js','utf8'),ctx);
let n=0;function check(label,f){f();n++;console.log('PASS '+label)}
const main=document.getElementById('ccs-main'),sel=q=>document.querySelector(q);
check('CRM style is scoped to Customers',()=>assert(main.classList.contains('cv-crm')));
check('all eight metric values retained',()=>assert.deepEqual([...document.querySelectorAll('.ov-kv')].map(e=>e.textContent),['0','1','2','3','4','5','6','7']));
check('all metric definitions retained',()=>assert.equal(document.querySelectorAll('.ov-ks').length,8));
check('each metric gets one decorative icon',()=>assert.equal(document.querySelectorAll('.cv-icon[aria-hidden="true"]').length,8));
check('directory card uses existing section action',()=>{const b=sel('.cv-metric-0');assert.equal(b.tagName,'BUTTON');assert.equal(b.dataset.act,'secgo');assert.equal(b.dataset.g,'crm');assert.equal(b.dataset.v,'all')});
check('due and overdue use native filtered lists',()=>{assert.equal(sel('.cv-metric-5').dataset.v,'today');assert.equal(sel('.cv-metric-6').dataset.v,'late');assert.equal(sel('.cv-metric-6').dataset.act,'ws-crm-go')});
check('all six opportunities open their correct filters even at zero',()=>assert.deepEqual([...document.querySelectorAll('.ov-arow')].map(e=>[e.tagName,e.dataset.act,e.dataset.v]),['late','today','quote','occasion','last_year','lapsed'].map(v=>['BUTTON','ws-crm-go',v])));
check('empty counts remain truthful',()=>assert([...document.querySelectorAll('.ov-an')].every(e=>e.textContent==='0')));
check('recent activity still opens the original customer',()=>{assert.equal(sel('.ov-ev').dataset.act,'open-customer');assert.equal(sel('.ov-ev').dataset.id,'sample-id');assert.equal(sel('.ov-ev .ov-et').textContent,'Sample CustomerExisting activity')});
check('customer avatar uses initials',()=>assert.equal(sel('.cv-avatar').textContent,'SC'));
check('rerender enhancement does not duplicate icons',()=>{tick([{target:main}]);assert.equal(document.querySelectorAll('.cv-icon').length,8);assert.equal(document.querySelectorAll('.cv-action-icon').length,6)});
check('other modules do not receive CRM transformations',()=>{main.setAttribute('data-screen','orders');tick([{target:main}]);assert(!main.classList.contains('cv-crm'))});
check('footer fits the Webflow limit',()=>assert(fs.readFileSync(__dirname+'/../dist/staff.customer-crm.footer.html','utf8').length<50000));
console.log(n+' CRM DOM checks passed. Rendered layout is not verified.');
