/* Corner Cafe: clear final step, without changing kitchen slip or native save logic. */
(function(){
'use strict';
if(window.__ccFinish20261019)return;window.__ccFinish20261019=true;
var root=document.getElementById('cc-staff');if(!root)return;
var agree=null,methodChosen=false,sourceChosen=false,wasOpen=false,queued=false;
function form(){return root.querySelector('#ccs-slipform .sl-stepper')}
function step(){return root.querySelector('#ccs-slipform #sl-st-7')}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function make(tag,cls,txt){var n=document.createElement(tag);n.className=cls||'';if(txt!=null)n.textContent=txt;return n}
function change(n,s){if(n&&n.textContent!==s)n.textContent=s}
function slip(label){var w=form();if(!w)return '';var l=w.querySelectorAll('.sl-live .sl-ll');for(var i=0;i<l.length;i++)if(clean(l[i].querySelector('.sl-lk')?.textContent)===label)return clean(l[i].querySelector('.sl-lv')?.textContent);return ''}
function item(label,s){var n=make('div','cc-f-item'),a=make('div','cc-f-copy'),b=make('button','ccs-link','Change');a.append(make('small','',label),make('strong','cc-f-val',''));b.type='button';b.dataset.act='sl-goto';b.dataset.v=s;b.setAttribute('aria-label','Change '+label);n.append(a,b);return n}
function attach(e){
if(e.querySelector('#cc-f-review'))return;
var body=e.querySelector('.sl-stepbody');if(!body)return;
change(e.querySelector('.sl-steptitle'),'Finish order');
var old=body.querySelector(':scope > .ccs-hint');if(old&&/Read the slip back|Check the guest/.test(old.textContent))old.classList.add('cc-f-hide');
var r=make('section','cc-f-review');r.id='cc-f-review';r.append(make('h3','','Quick check with the customer'),make('p','','Check these details. Choose Change only if something is wrong.'));
var grid=make('div','cc-f-grid');[['Guest',1],['Cake',0],['Pickup or delivery',3],['Allergies',4]].forEach(function(p){grid.appendChild(item(p[0],p[1]))});r.appendChild(grid);body.prepend(r);
var pay=body.querySelector('.sl-payplan .sl-k');if(pay)pay.innerHTML='What payment did we receive? <em class="sl-req">Required</em>';
body.querySelectorAll('.sl-payplan [data-act="n-plan"]').forEach(function(b){var m={full:'Paid in full',deposit:'Deposit received',later:'No payment yet'};if(m[b.dataset.v])change(b,m[b.dataset.v])});
var native=body.querySelector('label.ccs-check:has(input[data-nc="confirmNow"])');
if(native&&body.querySelector('.sl-payplan')){
native.classList.add('cc-f-hide');
var section=make('section','cc-f-agreement');section.append(make('h3','','Has the customer agreed to the cake and price?'));
var choices=make('div','cc-f-options');[['yes','Yes, customer agreed'],['no','Not yet — follow-up needed']].forEach(function(p){var b=make('button','cc-f-option',p[1]);b.type='button';b.dataset.ccAgree=p[0];b.setAttribute('aria-pressed','false');choices.append(b)});section.append(choices);native.before(section);
var help=native.nextElementSibling;if(help&&help.matches('.ccs-hint')&&/Confirmed, to be paid|Otherwise it is saved/.test(help.textContent))help.classList.add('cc-f-hide');
}
var out=make('section','cc-f-outcome');out.id='cc-f-outcome';out.setAttribute('role','status');out.append(make('small','','After saving'),make('strong','cc-f-status',''),make('p','cc-f-next',''),make('p','cc-f-money',''));body.append(out);
}
function calc(e){
var keys=['Guest Name','Type of cake','Pickup','Dietary'],vals=[slip('Guest Name'),slip('Type of cake'),slip('Pickup')||slip('Delivery'),slip('Dietary')];
if(slip('Size'))vals[1]+=' · '+slip('Size');
e.querySelectorAll('.cc-f-val').forEach(function(n,i){change(n,vals[i]||'Not entered')});
var p=e.querySelector('.sl-payplan [data-act="n-plan"][aria-pressed="true"]')?.dataset.v;
var totalText=e.querySelector('.ccs-total b')?.textContent||'',amount=/\$\s*([\d,]+(?:\.\d+)?)/.exec(totalText),total=amount?Number(amount[1].replace(/,/g,'')):null;
var paid=null,status='',next='',invalid=false,quote=!e.querySelector('.sl-payplan');
if(quote){var text=[...e.querySelectorAll('.ccs-note')].map(n=>n.textContent).join(' ');status=/Needs a price/i.test(text)?'Needs a price':/Waiting for customer/i.test(text)?'Waiting for customer':'Needs a quote';next='Do not send to kitchen. '+(status==='Needs a price'?'Add the price next.':status==='Waiting for customer'?'Obtain customer approval next.':'Prepare and approve the quote next.')}
else if(!p){status='Choose the payment option';next='Select what happened with payment.';invalid=true}
else if(p==='full'||p==='deposit'){
paid=p==='full'?total:Number(e.querySelector('#n-pay')?.value);
if(total===null||!Number.isFinite(paid)||paid<=0||paid>total||(p==='deposit'&&paid>=total)){status='Check payment amount';next='Correct the amount before saving.';invalid=true}
else if(!methodChosen){status='Choose the actual payment method';next='Tap Cash, Card or the method used.';invalid=true}
else{status='Confirmed';next=(p==='full'?'Paid in full. ':'Deposit recorded. ')+'Next: make the kitchen slip after saving.'}
}
else{paid=0;if(agree==='yes'){status='Confirmed';next='Customer agreed; payment can be collected later. Next: make kitchen slip.'}else if(agree==='no'){status='Received — awaiting review';next='Not agreed yet. Follow up; do not send to kitchen.'}else{status='Choose customer agreement';next='Select Yes or Not yet.';invalid=true}}
e.querySelectorAll('[data-cc-agree]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.ccAgree===agree))});
var out=e.querySelector('#cc-f-outcome');if(!out)return;out.classList.toggle('cc-f-incomplete',invalid);
change(out.querySelector('.cc-f-status'),status);change(out.querySelector('.cc-f-next'),next);
change(out.querySelector('.cc-f-money'),total===null||paid===null?'':'Paid now: $'+paid.toFixed(2)+'  ·  Balance: $'+Math.max(0,total-paid).toFixed(2));
}
function paint(){queued=false;var f=form();if(!f){if(wasOpen){agree=null;methodChosen=false;sourceChosen=false}wasOpen=false;return}wasOpen=true;var e=step();if(!e){var src=f.querySelector('#sl-st-1 [data-act="n-source"]');if(src&&!sourceChosen)f.querySelectorAll('#sl-st-1 [data-act="n-source"]').forEach(function(b){b.setAttribute('aria-pressed','false')});return}attach(e);calc(e)}
function schedule(){if(!queued){queued=true;Promise.resolve().then(paint)}}
function err(e,msg,selector){e.preventDefault();e.stopImmediatePropagation();var s=step(),place=s?.querySelector(selector)||s?.querySelector('.sl-stepbody');if(!place)return;var n=s.querySelector('#cc-f-error');if(!n){n=make('p','ccs-err cc-f-error');n.id='cc-f-error';n.setAttribute('role','alert');place.after(n)}change(n,msg);place.scrollIntoView({block:'center',behavior:'auto'})}
root.addEventListener('click',function(e){var b=e.target.closest?.('button,[data-act]');if(!b||!form()?.contains(b))return;
if(b.dataset.ccAgree&&step()){e.preventDefault();e.stopImmediatePropagation();agree=b.dataset.ccAgree;var box=step().querySelector('input[data-nc="confirmNow"]');if(box&&box.checked!==(agree==='yes'))box.click();schedule();return}
if(b.dataset.act==='n-source'){sourceChosen=true;return}
if((b.dataset.act==='sl-next'||b.dataset.act==='sl-skip')&&f.querySelector('#sl-st-1')&&!sourceChosen)return err(e,'Choose how the customer placed the order. This is required.','#sl-st-1 [aria-label="How they ordered"]');
if(b.dataset.act==='n-plan'){agree=null;methodChosen=false;return}
if(b.dataset.act==='n-paym'&&step()){methodChosen=true;return}
if(b.dataset.act==='n-submit'&&step()){if(!sourceChosen)return err(e,'Choose how the customer placed the order. Return to Customer to select the source.','.cc-f-review');var p=step().querySelector('.sl-payplan [data-act="n-plan"][aria-pressed="true"]')?.dataset.v;if(p==='later'&&agree===null)return err(e,'Choose whether the customer agreed to the price.','.cc-f-agreement');if((p==='full'||p==='deposit')&&!methodChosen)return err(e,'Choose the payment method used.','[aria-label="Paid by"]')}
},true);
root.addEventListener('input',function(e){if(e.target?.id==='n-pay'&&step())schedule()},true);
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});schedule();
})();