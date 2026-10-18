/* Corner Cafe customer directory insights, built only from the permitted rows
   already delivered by the staff application. No new customer API or record writes. */
(function(){
'use strict';
if(window.__ccCustomerDirectoryV2)return;
window.__ccCustomerDirectoryV2=true;
var root=null;
var pending=false;
var icon={
 people:'<path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 19v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 repeat:'<path d="M20 7H6l3-3M4 17h14l-3 3M20 7v5M4 17v-5"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18"/>'
};
function el(tag,klass,text){
 var e=document.createElement(tag);
 if(klass)e.className=klass;
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function svg(name){
 var e=el('span','cu-symbol');
 e.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icon[name]+'</svg>';
 return e;
}
function stat(label,value,detail,tone,which){
 var c=el('article','cu-stat cu-stat-'+tone);
 c.appendChild(svg(which));
 c.appendChild(el('span','cu-stat-label',label));
 c.appendChild(el('strong','cu-stat-value',value));
 c.appendChild(el('span','cu-stat-detail',detail));
 return c;
}
function barRow(name,num,max){
 var row=el('div','cu-rank');
 row.appendChild(el('span','cu-rank-name',name));
 var track=el('span','cu-rank-track'), fill=el('i','cu-rank-fill');
 fill.style.width=(max?Math.max(0,num/max*100):0).toFixed(1)+'%';
 track.appendChild(fill);row.appendChild(track);
 row.appendChild(el('strong','cu-rank-num',num));return row;
}
function category(parent,title,caption){
 var c=el('section','cu-breakdown');
 c.appendChild(el('h3','cu-breakdown-title',title));
 c.appendChild(el('span','cu-breakdown-caption',caption));
 parent.appendChild(c);return c;
}
function cardOpen(name,id,orders){
 var b=el('button','cu-favourite');
 b.type='button';b.setAttribute('data-act','open-customer');b.setAttribute('data-id',id);
 var initials=name.split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();
 b.appendChild(el('span','cu-avatar',initials));
 var line=el('span','cu-person-name');
 line.appendChild(el('b','',name));
 line.appendChild(el('small','',orders+' '+(orders===1?'order':'orders')));
 b.appendChild(line);b.appendChild(el('span','cu-chevron','›'));return b;
}
function classify(main){
 var table=main.querySelector('.ccs-table-wrap table.ccs-table');
 var tbody=table&&table.querySelector('tbody');
 if(!tbody)return null;
 var rows=Array.prototype.slice.call(tbody.querySelectorAll('tr[data-act="open-customer"]'));
 var data=[];
 rows.forEach(function(row){
  var td=row.querySelectorAll('td');if(td.length<7)return;
  var name=td[0].querySelector('b'),text=name&&name.textContent.trim();
  if(!text)return;
  var o=Number((td[2].textContent||'').replace(/[^0-9]/g,''))||0;
  var cake=(td[5].textContent||'').trim();
  var marketing=!!td[6].querySelector('.s-good');
  data.push({name:text,id:row.getAttribute('data-id'),orders:o,cake:cake,marketing:marketing,occasion:!!td[0].querySelector('.s-deposit')});
  if(!row.classList.contains('cu-row-ready')){
   row.classList.add('cu-row-ready');
   var a=el('span','cu-avatar',text.split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase());
   a.setAttribute('aria-hidden','true');
   td[0].insertBefore(a,td[0].firstChild);
   td[0].classList.add('cu-name-cell');
   if(o>1){
    var pill=el('span','cu-repeat-tag',o+' orders');
    td[0].appendChild(pill);
   }
  }
 });
 return data;
}
function render(){
 pending=false;
 var main=root.querySelector('#ccs-main[data-screen="customers"]');
 if(!main)return;
 var data=classify(main);
 var prior=main.querySelector('.cu-dashboard');
 if(!data||!main.querySelector('.ccs-ctool')){
  if(prior)prior.remove();return;
 }
 var toolbar=main.querySelector('.ccs-ctool');
 var countNode=toolbar.querySelector('.ccs-ccount b');
 var count=countNode?Number((countNode.textContent||'').replace(/[^0-9]/g,'')):data.length;
 if(!Number.isFinite(count)||count<data.length)count=data.length;
 var repeats=data.filter(function(r){return r.orders>=2;}).length;
 var consent=data.filter(function(r){return r.marketing;}).length;
 var occasions=data.filter(function(r){return r.occasion;}).length;
 var cakes={};
 data.forEach(function(r){
  if(r.cake&&r.cake!=='—'&&r.cake!=='-')cakes[r.cake]=(cakes[r.cake]||0)+1;
 });
 var ranked=Object.keys(cakes).map(function(name){return {name:name,count:cakes[name]};}).sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name);}).slice(0,5);
 var frequent=data.filter(function(r){return r.orders>=2;}).sort(function(a,b){return b.orders-a.orders||a.name.localeCompare(b.name);}).slice(0,4);
 if(!prior){prior=el('section','cu-dashboard');prior.setAttribute('aria-label','Customer directory snapshot');}
 var signature=[count,data.length,repeats,consent,occasions,ranked.map(function(r){return r.name+':'+r.count;}).join(','),frequent.map(function(r){return r.id+':'+r.orders;}).join(','),main.querySelector('#ccs-seg')?.value||''].join('|');
 if(prior.dataset.signature===signature&&prior.parentElement)return;
 prior.dataset.signature=signature;
 main.setAttribute('data-customer-enhanced','true');
 prior.replaceChildren();
 var heading=el('div','cu-dashboard-heading');
 var left=el('div','cu-dashboard-title');
 left.appendChild(el('h2','','Customer snapshot'));
 left.appendChild(el('span','',data.length<count?'Showing '+data.length+' of '+count+' customers':'Based on '+data.length+' customer records'));
 heading.appendChild(left);
 var quick=el('div','cu-quick');
 quick.setAttribute('role','group');quick.setAttribute('aria-label','Quick customer segments');
 var selected=main.querySelector('#ccs-seg')?.value||'all';
 [['all','All'],['seg_repeat','Repeat'],['seg_high_value','High value'],['seg_upcoming_occasion','Occasions'],['marketing_opt_in','Opted in']].forEach(function(pair){
  var b=el('button','cu-filter'+(selected===pair[0]?' is-active':''),pair[1]);
  b.type='button';b.setAttribute('data-act','seg');b.setAttribute('data-v',pair[0]);
  b.setAttribute('aria-pressed',String(selected===pair[0]));quick.appendChild(b);
 });
 heading.appendChild(quick);prior.appendChild(heading);
 var kpis=el('div','cu-stats');
 kpis.appendChild(stat('Customers',count.toLocaleString('en-US'),data.length<count?'Showing latest '+data.length:'Current directory','purple','people'));
 kpis.appendChild(stat('Multiple orders',repeats.toLocaleString('en-US'),'Of '+data.length+' shown','lime','repeat'));
 kpis.appendChild(stat('Marketing opted in',consent.toLocaleString('en-US'),'Of '+data.length+' shown','pink','heart'));
 kpis.appendChild(stat('Occasions approaching',occasions.toLocaleString('en-US'),'Of '+data.length+' shown','blue','calendar'));
 prior.appendChild(kpis);
 var trends=el('div','cu-insights');
 var cakeBox=category(trends,'Usually ordered','Based on customer cake preferences in this view');
 if(ranked.length)ranked.forEach(function(r){cakeBox.appendChild(barRow(r.name,r.count,ranked[0].count));});
 else cakeBox.appendChild(el('div','cu-no-data','No cake preferences recorded'));
 var freqBox=category(trends,'Frequent customers','Open a customer profile');
 if(frequent.length)frequent.forEach(function(r){freqBox.appendChild(cardOpen(r.name,r.id,r.orders));});
 else freqBox.appendChild(el('div','cu-no-data','No multiple-order customers in this view'));
 prior.appendChild(trends);
 var bar=main.querySelector('.crm-bar');
 if(bar)bar.insertAdjacentElement('afterend',prior);
 else toolbar.insertAdjacentElement('beforebegin',prior);
}
var observer=new MutationObserver(function(mutations){
 if(pending)return;
 var relevant=mutations.some(function(m){
  var node=m.target.nodeType===1?m.target:m.target.parentElement;
  return node&&!node.closest('.cu-dashboard')&&!node.closest('.cu-avatar')&&!node.closest('.cu-repeat-tag');
 });
 if(!relevant)return;
 pending=true;queueMicrotask(render);
});
var bootCount=0;
function boot(){
  root=document.getElementById('cc-staff');
  if(!root){
    if(++bootCount<120)setTimeout(boot,250);
    else console.warn('Customer directory: staff app mount was not found');
    return;
  }
  observer.observe(root,{childList:true,subtree:true});
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();