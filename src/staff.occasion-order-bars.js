/* Occasion order comparison; reads the existing recorded-orders table only. */
(function(){'use strict';if(window.__ccOccasionOrderBars)return;window.__ccOccasionOrderBars=true;
var root=document.getElementById('cc-staff');if(!root)return;var busy=false,queued=false;
function render(){queued=false;if(busy)return;busy=true;try{
 var main=root.querySelector('#ccs-main[data-screen="dash"]');if(!main)return;
 var mod=main.querySelector('.an-mod[aria-current="page"]');if(!mod||mod.dataset.v!=='sd')return;
 var table=main.querySelector('table.oi-heat');if(!table)return;
 var holder=table.closest('.dx-card');if(!holder)return;
 var old=holder.querySelector('.cc-occasion-bars');
 var toggle=main.querySelector('.oi-tg[data-v="o"]');
 if(toggle&&toggle.getAttribute('aria-pressed')!=='true'){if(old)old.remove();return;}
 var records=[].slice.call(table.querySelectorAll('tbody tr')).map(function(tr){
  var title=tr.querySelector('th .oi-rowbtn'),cells=tr.querySelectorAll('td'),last=cells[cells.length-1];
  if(!title||!last)return null;
  var count=Number((last.textContent||'').replace(/[^0-9.-]/g,''));
  return Number.isFinite(count)&&count>=0?{label:title.textContent.trim(),count:count,source:title}:null;
 }).filter(Boolean).sort(function(a,b){return b.count-a.count});
 if(!records.length||!records.some(function(x){return x.count>0})){if(old)old.remove();return;}
 var stamp=records.map(function(x){return x.label+':'+x.count}).join('|');
 if(old&&old.dataset.stamp===stamp)return;
 var el=document.createElement('section');el.className='cc-occasion-bars';el.dataset.stamp=stamp;el.setAttribute('aria-label','Cake orders by occasion');
 var h=document.createElement('h3');h.textContent='Cake Orders by Occasion';el.appendChild(h);
 var note=document.createElement('p');note.textContent='Recorded orders by occasion, across the displayed months. Uses the same year, order status and cake filters as the occasion report.';el.appendChild(note);
 var max=Math.max.apply(null,records.map(function(x){return x.count;})),visible=records.filter(function(x){return x.count>0});
 visible.forEach(function(x){var b=document.createElement('button');b.type='button';b.className='cc-occasion-row';b.setAttribute('aria-label',x.label+': '+x.count+' orders; filter to this occasion');
 var name=document.createElement('span');name.className='cc-occasion-label';name.textContent=x.label;
 var track=document.createElement('span');track.className='cc-occasion-track';var bar=document.createElement('i');bar.style.width=(100*x.count/max).toFixed(1)+'%';track.appendChild(bar);
 var count=document.createElement('strong');count.textContent=x.count.toLocaleString()+' orders';
 b.append(name,track,count);b.addEventListener('click',function(){var current=[].slice.call(table.querySelectorAll('.oi-rowbtn')).find(function(v){return v.textContent.trim()===x.label});if(current)current.click()});el.appendChild(b);});
 if(records.length>=12){var foot=document.createElement('p');foot.textContent='Showing the occasions included in the existing report (up to 12).';el.appendChild(foot);}
 if(old)old.replaceWith(el);else holder.appendChild(el);
 }finally{busy=false;}}
var obs=new MutationObserver(function(){if(queued)return;queued=true;queueMicrotask(render)});obs.observe(root,{childList:true,subtree:true,characterData:true});render();
})();