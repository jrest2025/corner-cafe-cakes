/* Calendar dashboard enhancement: read-only, DOM-derived summaries. */
(function(){'use strict';if(window.__ccCalendarV3)return;window.__ccCalendarV3=true;
var root=document.getElementById('cc-staff');if(!root)return;var scheduled=false;
function render(){scheduled=false;var main=root.querySelector('#ccs-main[data-screen="calendar"]');if(!main)return;
 var grid=main.querySelector('.ccs-mgrid'),old=main.querySelector('.ccv-summary');if(!grid){if(old)old.remove();return;}
 var month=main.querySelector('.ccs-caltitle');if(!month)return;
 var cells=Array.prototype.slice.call(grid.querySelectorAll('.ccs-mcell:not(.is-out)'));
 var orders=0,cakes=0,busy=0;
 cells.forEach(function(cell){var count=cell.querySelector('.ccs-mcount .ccs-mlong');if(!count)return;
  var text=count.textContent||'';var a=/([0-9]+)\s+orders?/.exec(text),b=/([0-9]+)\s+cakes?/.exec(text);
  var n=a?+a[1]:0,q=b?+b[1]:0;orders+=n;cakes+=q;if(n>=3)busy++;
  cell.classList.toggle('ccv-load-medium',n===2);cell.classList.toggle('ccv-load-high',n>=3);
 });
 var parent=main.querySelector('.ccs-calwrap');if(!parent)return;
 if(!old){old=document.createElement('div');old.className='ccv-summary';old.setAttribute('aria-label','Calendar month totals');parent.parentNode.insertBefore(old,parent);}
 var values=[[orders,'Orders this month'],[cakes,'Cakes scheduled'],[busy,'Busy days · 3+ orders']];
 values.forEach(function(pair,i){var el=old.children[i];if(!el){el=document.createElement('div');el.className='ccv-stat';old.appendChild(el);}var val=el.querySelector('.ccv-stat-num'),lab=el.querySelector('.ccv-stat-label');if(!val){val=document.createElement('strong');val.className='ccv-stat-num';el.appendChild(val);}if(!lab){lab=document.createElement('span');lab.className='ccv-stat-label';el.appendChild(lab);}var n=String(pair[0]);if(val.textContent!==n)val.textContent=n;if(lab.textContent!==pair[1])lab.textContent=pair[1];});
}
var obs=new MutationObserver(function(records){if(scheduled)return;var relevant=records.some(function(r){var el=r.target.nodeType===1?r.target:r.target.parentElement;return el&&!el.closest('.ccv-summary');});if(!relevant)return;scheduled=true;queueMicrotask(render);});obs.observe(root,{childList:true,subtree:true});render();
})();