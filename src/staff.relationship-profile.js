/* Corner Cafe customer relationship profile.
   Progressive presentation enhancement only: reuses the signed-in app's rendered
   values and native permission-checked actions. No extra customer requests. */
(function(){
  'use strict';
  if(window.__ccRelationshipProfileV1)return;
  window.__ccRelationshipProfileV1=true;
  var sheet=null,queued=false,attempts=0;

  var paths={
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.48 2.81a2 2 0 0 1-.57 1.8L7.1 10.2a16 16 0 0 0 6 6l1.87-1.92a2 2 0 0 1 1.8-.57l2.81.48A2 2 0 0 1 22 16.92z"/>',
    message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9 8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
    cake:'<path d="M3 11h18v10H3V11zM3 15c3 3 3-3 6 0s3-3 6 0 3-3 6 0M7 11V7m5 4V7m5 4V7M7 3v1m5-1v1m5-1v1"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    note:'<path d="M8 3h10a3 3 0 0 1 3 3v15H8a5 5 0 0 1 0-10h13M8 3a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5M10 8h7M10 12h5"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18"/>',
    trend:'<path d="M3 17l6-6 4 4 8-8M16 7h5v5"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>',
    edit:'<path d="M12 20h9M16 3a2.1 2.1 0 0 1 3 3L8 17l-4 1 1-4L16 3z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    document:'<path d="M6 2h9l5 5v15H6zM15 2v6h5M9 13h8M9 17h8"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  };
  function icon(name){
    var el=document.createElement('span');el.className='rm-icon';el.setAttribute('aria-hidden','true');
    el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.user)+'</svg>';
    return el;
  }
  function node(tag,klass,text){var e=document.createElement(tag);if(klass)e.className=klass;if(text!==undefined)e.textContent=String(text);return e;}
  function getRowValues(table){
    var data={};
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'),function(tr){
      var th=tr.querySelector('th'),td=tr.querySelector('td');
      if(th&&td){var key=(th.textContent||'').trim().replace(/\s+/g,' ');if(key)data[key]=(td.textContent||'').trim().replace(/\s+/g,' ');}
    });
    return data;
  }
  function present(v){return v!==undefined&&v!==null&&String(v).trim()&&v!=='—'&&v!=='-'?String(v):'Not recorded';}
  function metric(label,value,detail,tone,ico){
    var card=node('article','rm-metric rm-'+tone);
    card.appendChild(icon(ico));
    card.appendChild(node('span','rm-metric-label',label));
    card.appendChild(node('strong','rm-metric-value',present(value)));
    if(detail)card.appendChild(node('span','rm-metric-desc',detail));
    return card;
  }
  function group(title,ico,keys,values){
    var card=node('section','rm-group'),hdr=node('h4','rm-group-title');
    hdr.appendChild(icon(ico));hdr.appendChild(document.createTextNode(title));card.appendChild(hdr);
    var dl=node('dl','rm-fields');
    var found=0;
    keys.forEach(function(key){
      if(!values[key])return;
      found++;
      var entry=node('div','rm-field');
      entry.appendChild(node('dt','',key));
      entry.appendChild(node('dd','',values[key]));
      dl.appendChild(entry);
    });
    if(!found)dl.appendChild(node('p','rm-unavailable','No details recorded'));
    card.appendChild(dl);return card;
  }
  function decorateBtn(btn,ico){
    if(!btn||btn.querySelector(':scope > .rm-icon'))return;
    btn.prepend(icon(ico));
  }
  function buildOverview(section,table){
    if(section.querySelector('.rm-overview'))return;
    var values=getRowValues(table);
    var overview=node('div','rm-overview');
    var tops=node('div','rm-metrics');
    tops.appendChild(metric('Orders',values.Orders,'Customer order history','purple','cake'));
    tops.appendChild(metric('Collected spend',values.Spend,'Completed orders only','lime','trend'));
    tops.appendChild(metric('Usually orders',values['Usually orders'],'Cake preference','pink','heart'));
    tops.appendChild(metric('Occasions',values.Occasions,'Known celebrations','blue','calendar'));
    overview.appendChild(tops);
    var groups=node('div','rm-groups');
    groups.appendChild(group('Contact','phone',['Mobile','Other number','Email','Prefers','Delivery address'],values));
    groups.appendChild(group('Preferences & occasions','heart',['Usually orders','Birthday','Occasions','Next occasion','Preferences','Service notes'],values));
    groups.appendChild(group('Relationship','user',['Came from','Company','Groups','Marketing'],values));
    overview.appendChild(groups);
    table.classList.add('rm-source-hidden');
    table.setAttribute('aria-hidden','true');
    table.insertAdjacentElement('beforebegin',overview);
    section.classList.add('rm-overview-ready');
  }
  function decorate(){
    queued=false;
    sheet=document.getElementById('ccs-sheet');
    if(!sheet)return;
    var bar=sheet.querySelector('.ccs-secbar [data-act="secgo"][data-g="cust"]');
    if(!sheet.classList.contains('ccs-open')||!bar){
      sheet.classList.remove('rm-profile');
      return;
    }
    sheet.classList.add('rm-profile');
    var head=sheet.querySelector('.ccs-sheet-head');
    var title=head&&head.querySelector('.ccs-title');
    if(head&&title&&!head.querySelector('.rm-identity')){
      var name=(title.textContent||'Customer').trim();
      var identity=node('div','rm-identity');
      var initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();
      identity.appendChild(node('span','rm-avatar',initials||'C'));
      var names=node('div','rm-names');
      names.appendChild(node('span','rm-eyebrow','Customer relationship'));
      title.parentNode.insertBefore(identity,title);
      names.appendChild(title);
      identity.appendChild(names);
      head.classList.add('rm-profile-header');
    }
    var id=sheet.querySelector('.ccs-sheet-body > .ccs-hint');
    if(id&&(id.textContent||'').trim().indexOf('Customer C-')===0)id.classList.add('rm-reference');
    var actions=sheet.querySelector('.ccs-cust-acts');
    if(actions){
      actions.classList.add('rm-actions');
      decorateBtn(actions.querySelector('[data-act="cust-neworder"]'),'plus');
      decorateBtn(actions.querySelector('a[href^="https://wa.me/"],a[href*="whatsapp"]'),'message');
      decorateBtn(actions.querySelector('a[href^="tel:"]'),'phone');
    }
    [['overview','user'],['orders','cake'],['notes','note'],['comms','shield']].forEach(function(pair){
      decorateBtn(sheet.querySelector('.ccs-secbar [data-g="cust"][data-v="'+pair[0]+'"]'),pair[1]);
    });
    var section=sheet.querySelector('#cp-overview');
    if(section){
      var table=section.querySelector(':scope > table.cp-table');
      if(table)buildOverview(section,table);
      var controls=section.querySelector('.ccs-more-row');
      if(controls){
        controls.classList.add('rm-tools');
        decorateBtn(controls.querySelector('[data-act="cust-edit"]'),'edit');
        decorateBtn(controls.querySelector('[data-act="cust-history"]'),'clock');
        decorateBtn(controls.querySelector('[data-act="ws-cm-s5-rep"]'),'document');
      }
    }
    var warnings=sheet.querySelectorAll('.ccs-sheet-body > .ccs-warn');
    Array.prototype.forEach.call(warnings,function(el){el.classList.add('rm-review-alert');});
  }
  function schedule(){
    if(queued)return;
    queued=true;
    Promise.resolve().then(decorate);
  }
  function boot(){
    sheet=document.getElementById('ccs-sheet');
    if(!sheet){
      if(++attempts<120)setTimeout(boot,250);
      return;
    }
    var observer=new MutationObserver(function(records){
      if(records.some(function(rec){
        var t=rec.target.nodeType===1?rec.target:rec.target.parentElement;
        return t&&!t.closest('.rm-overview,.rm-identity,.rm-icon');
      }))schedule();
    });
    observer.observe(sheet,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();