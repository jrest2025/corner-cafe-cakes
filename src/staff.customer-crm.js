// Visual CRM refinement over existing customer data and permission-checked actions.
(function(){
 var icons={people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 4v2"/>',plus:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M19 6v6M16 9h6"/>',repeat:'<path d="M20 7H6l3-3M4 17h14l-3 3M20 7v5M4 17v-5"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',money:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',alert:'<path d="M12 3 2 21h20L12 3zM12 9v5M12 17h.01"/>',chat:'<path d="M4 3h16v14H8l-4 4V3zM8 8h8M8 12h5"/>',cake:'<path d="M3 11h18v10H3zM3 15c3 3 3-3 6 0s3-3 6 0 3-3 6 0M7 11V7M12 11V7M17 11V7M7 3v1M12 3v1M17 3v1"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18M8 15h3M14 15h2"/>'};
 function svg(k){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[k]||icons.people)+'</svg>';}
 function button(el,act,v,group){
  var b=el;if(el.tagName!=='BUTTON'){b=document.createElement('button');[].slice.call(el.attributes).forEach(function(a){b.setAttribute(a.name,a.value);});while(el.firstChild)b.appendChild(el.firstChild);el.replaceWith(b);}
  b.type='button';b.setAttribute('data-act',act);b.setAttribute('data-v',v);if(group)b.setAttribute('data-g',group);return b;
 }
 function apply(){
  var main=document.getElementById('ccs-main');if(!main)return;
  var on=(main.getAttribute('data-screen')||'').indexOf('customers')===0;
  main.classList.toggle('cv-crm',on);if(!on)return;
  var title=main.querySelector('.ccs-head .ccs-title');if(title&&title.textContent==='Customers')title.textContent='Customer relationships';
  var ks=['people','plus','repeat','heart','money','clock','alert','chat'];
  [].forEach.call(main.querySelectorAll('.crm-kpi:not(.cv-done)'),function(el,i){
   el.classList.add('cv-done','cv-metric-'+i);
   if(i===0)el=button(el,'secgo','all','crm');
   if(i===5||i===6)el=button(el,'ws-crm-go',i===5?'today':'late');
   var icon=document.createElement('span');icon.className='cv-icon';icon.innerHTML=svg(ks[i]);icon.setAttribute('aria-hidden','true');el.appendChild(icon);
  });
  var values=['late','today','quote','occasion','last_year','lapsed'],is=['alert','clock','chat','cake','calendar','heart'];
  [].forEach.call(main.querySelectorAll('.crm-row .ov-att .ov-arow:not(.cv-done)'),function(el,i){
   el.classList.add('cv-done','cv-action-'+i);el=button(el,'ws-crm-go',values[i]);
   var mark=document.createElement('span');mark.className='cv-action-icon';mark.innerHTML=svg(is[i]);mark.setAttribute('aria-hidden','true');el.insertBefore(mark,el.firstChild);
   var more=document.createElement('span');more.className='cv-open';more.textContent='Open list →';more.setAttribute('aria-hidden','true');el.appendChild(more);
  });
  [].forEach.call(main.querySelectorAll('.crm-row .ov-ev:not(.cv-done)'),function(el){
   el.classList.add('cv-done');var name=el.querySelector('.ov-et b');if(!name)return;
   var avatar=document.createElement('span');avatar.className='cv-avatar';avatar.textContent=name.textContent.trim().split(/\s+/).slice(0,2).map(function(s){return s.charAt(0);}).join('').toUpperCase();avatar.setAttribute('aria-hidden','true');el.insertBefore(avatar,el.firstChild);
  });
 }
 var waiting=false;function soon(){if(waiting)return;waiting=true;requestAnimationFrame(function(){waiting=false;apply();});}
 var root=document.getElementById('cc-staff');if(!root)return;
 new MutationObserver(function(ms){if(ms.some(function(m){return !m.target.closest||!m.target.closest('.cv-done');}))soon();}).observe(root,{childList:true,subtree:true});
 soon();
})();
