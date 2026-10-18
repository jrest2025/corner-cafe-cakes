/* Corner Cafe CRM — All Customers directory V3, 19 Oct 2026.
 * Visual and client-side navigation enhancement ONLY.
 * Uses the native, permission-checked customer list and customer profiles.
 * Explicitly excluded: Overview, Follow-ups, Analytics and Daily Cake Demand.
 * Previous visual module: src/staff.customer-directory.js @ 4c617e823ac7ea573053f5367f97c40364faf02a.
 */
(function () {
  'use strict';
  if (window.__ccCustomerDirectoryV3) return;
  window.__ccCustomerDirectoryV3 = true;

  var root=null, scheduled=false, bootTries=0;
  var state={sort:'default',page:0,size:25,segment:null,search:null};
  var icons={
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    userPlus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    gem:'<path d="M6 3h12l4 6-10 13L2 9l4-6ZM2 9h20M12 22 8 9l4-6 4 6-4 13"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    filter:'<path d="M4 7h16M7 12h10M10 17h4"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/>',
    sort:'<path d="m8 3-3 3-3-3M5 6V19M16 21l3-3 3 3M19 18V5"/>',
    dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    left:'<path d="m15 18-6-6 6-6"/>',
    right:'<path d="m9 18 6-6-6-6"/>',
    bookmark:'<path d="M5 3h14v18l-7-4-7 4V3"/>'
  };
  function svg(name){
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.users)+'</svg>';
  }
  function node(tag,cls,txt){
    var e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=String(txt);
    return e;
  }
  function iconElement(name,klass){
    var e=node('span',klass||'cdir-icon');
    e.innerHTML=svg(name);
    e.setAttribute('aria-hidden','true');
    return e;
  }
  function countText(v){
    var n=Number((v||'').replace(/[^0-9]/g,''));
    return Number.isFinite(n)&&n>=0?n:null;
  }
  function cellText(row,index){
    var cells=row.querySelectorAll('td');
    return cells[index]?(cells[index].textContent||'').trim():'';
  }
  function displayName(row){
    var label=row.querySelector('td:first-child b');
    return label?label.textContent.trim():'Customer';
  }
  function initials(name){
    var parts=(name||'').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0,2).map(function(w){return w.charAt(0);}).join('').toUpperCase()||'C';
  }
  function isDirectory(main){
    if(!main)return false;
    var screen=main.getAttribute('data-screen')||'';
    return screen==='customers-all'||screen==='customers-search';
  }
  function enhanceButton(button,name){
    if(button&&!button.querySelector('.cdir-action-icon')){
      button.insertBefore(iconElement(name,'cdir-action-icon'),button.firstChild);
    }
  }
  function decorateNativeControls(main){
    var search=main.querySelector('#ccs-cq');
    if(search&&!search.closest('.cdir-search-field')&&search.parentNode){
      var holder=node('span','cdir-search-field');
      search.parentNode.insertBefore(holder,search);
      holder.appendChild(iconElement('search','cdir-search-icon'));
      holder.appendChild(search);
    }
    enhanceButton(main.querySelector('[data-act="cust-new"]'),'userPlus');
    enhanceButton(main.querySelector('[data-act="ws-cm-panel"][data-v="filter"]'),'filter');
    enhanceButton(main.querySelector('[data-act="ws-cm-tools"]'),'dots');
    enhanceButton(main.querySelector('[data-act="ws-cm-panel"][data-v="save"]'),'bookmark');
  }
  var segments=[
    ['all','All customers','users'],
    ['seg_repeat','Repeat buyers','repeat'],
    ['seg_high_value','High value','gem'],
    ['seg_inactive','Inactive','clock'],
    ['seg_upcoming_occasion','Occasions','calendar'],
    ['marketing_opt_in','Opted in','shield']
  ];
  function addSegments(main){
    var native=main.querySelector('#ccs-seg'),toolbar=main.querySelector('.ccs-ctool');
    if(!native||!toolbar)return;
    var bar=main.querySelector('.cdir-segments');
    if(!bar){
      bar=node('nav','cdir-segments');
      bar.setAttribute('aria-label','Common customer groups');
      segments.forEach(function(s){
        var found=Array.prototype.some.call(native.options,function(opt){return opt.value===s[0];});
        if(!found)return;
        var b=node('button','cdir-segment');
        b.type='button';b.setAttribute('data-cdir-segment',s[0]);
        b.appendChild(iconElement(s[2],'cdir-segment-icon'));
        b.appendChild(node('span','',s[1]));
        bar.appendChild(b);
      });
      toolbar.insertAdjacentElement('afterend',bar);
    }
    Array.prototype.forEach.call(bar.querySelectorAll('[data-cdir-segment]'),function(b){
      var active=b.getAttribute('data-cdir-segment')===native.value;
      if(b.classList.contains('is-active')!==active)b.classList.toggle('is-active',active);
      if(b.getAttribute('aria-pressed')!==String(active))b.setAttribute('aria-pressed',String(active));
    });
  }
  function directoryHeading(main,wrap,shown,total,searching){
    var header=main.querySelector('.cdir-heading');
    if(!header){
      header=node('section','cdir-heading');
      var heading=node('div','cdir-heading-copy');
      var title=node('h2','cdir-heading-title');
      title.appendChild(iconElement('users','cdir-heading-icon'));
      title.appendChild(node('span','','Customer directory'));
      heading.appendChild(title);
      heading.appendChild(node('p','cdir-heading-summary'));
      header.appendChild(heading);
      var sortArea=node('label','cdir-sort-label');
      sortArea.appendChild(iconElement('sort','cdir-sort-icon'));
      sortArea.appendChild(node('span','','Sort'));
      var sort=node('select','cdir-sort');
      sort.setAttribute('aria-label','Sort customers currently shown');
      [['default','Default order'],['name','Name A–Z'],['orders','Most orders'],['spend','Highest collected spend']].forEach(function(p){
        var opt=node('option','',p[1]);opt.value=p[0];sort.appendChild(opt);
      });
      sort.value=state.sort;
      sortArea.appendChild(sort);
      header.appendChild(sortArea);
      wrap.insertAdjacentElement('beforebegin',header);
    }
    var summary=header.querySelector('.cdir-heading-summary');
    var description=searching?'Search results · '+shown.toLocaleString('en-US')+' matching customer profiles':
      total>shown?'Showing '+shown.toLocaleString('en-US')+' of '+total.toLocaleString('en-US')+' customers. Refine filters to find the rest.':
      'Browse '+shown.toLocaleString('en-US')+' customer profiles, order history and preferences';
    if(summary&&summary.textContent!==description)summary.textContent=description;
    return header;
  }
  function decorateRow(row,index){
    var tds=row.querySelectorAll('td');
    if(tds.length<7)return;
    if(!row.hasAttribute('data-cdir-original'))row.setAttribute('data-cdir-original',String(index));
    if(row.classList.contains('cdir-row'))return;
    var name=displayName(row),count=countText(tds[2].textContent)||0;
    var cell=tds[0];
    var copy=node('span','cdir-person-copy'),avatar=node('span','cdir-avatar',initials(name));
    avatar.setAttribute('aria-hidden','true');
    while(cell.firstChild)copy.appendChild(cell.firstChild);
    var person=node('span','cdir-person');
    person.appendChild(avatar);person.appendChild(copy);
    cell.appendChild(person);
    if(count>=2){
      var relation=node('span','cdir-repeat-tag','Repeat');
      relation.setAttribute('title',count+' recorded orders');
      copy.appendChild(relation);
    }
    cell.classList.add('cdir-name-cell');
    tds[1].classList.add('cdir-phone-cell');
    tds[2].classList.add('cdir-order-cell');
    tds[3].classList.add('cdir-spend-cell');
    tds[4].classList.add('cdir-last-cell');
    tds[5].classList.add('cdir-cake-cell');
    tds[6].classList.add('cdir-consent-cell');
    var btn=node('button','cdir-open-profile');
    btn.type='button';btn.setAttribute('data-act','open-customer');
    btn.setAttribute('data-id',row.getAttribute('data-id')||'');
    btn.setAttribute('aria-label','Open customer profile for '+name);
    btn.setAttribute('title','Open profile');
    btn.appendChild(iconElement('chevron','cdir-open-icon'));
    tds[6].appendChild(btn);
    row.classList.add('cdir-row');
  }
  function rowSortValue(row,kind){
    if(kind==='name')return displayName(row).toLocaleLowerCase();
    if(kind==='orders')return countText(cellText(row,2))||0;
    if(kind==='spend'){
      var amount=Number(cellText(row,3).replace(/[^0-9.-]/g,''));
      return Number.isFinite(amount)?amount:0;
    }
    return Number(row.getAttribute('data-cdir-original'))||0;
  }
  function sortedRows(table){
    var body=table.querySelector('tbody');
    if(!body)return [];
    var rows=Array.prototype.slice.call(body.querySelectorAll('tr[data-act="open-customer"]'));
    rows.forEach(decorateRow);
    var desired=rows.slice().sort(function(a,b){
      if(state.sort==='name')return rowSortValue(a,'name').localeCompare(rowSortValue(b,'name'));
      if(state.sort==='orders'||state.sort==='spend')return rowSortValue(b,state.sort)-rowSortValue(a,state.sort)||rowSortValue(a,'name').localeCompare(rowSortValue(b,'name'));
      return rowSortValue(a,'default')-rowSortValue(b,'default');
    });
    var reorder=desired.some(function(row,i){return rows[i]!==row;});
    if(reorder){
      var frag=document.createDocumentFragment();
      desired.forEach(function(row){frag.appendChild(row);});
      body.appendChild(frag);
    }
    return desired;
  }
  function pager(main,wrap){
    var nav=main.querySelector('.cdir-pager');
    if(nav)return nav;
    nav=node('nav','cdir-pager');nav.setAttribute('aria-label','Customer directory pages');
    var left=node('div','cdir-pager-left');
    left.appendChild(node('span','cdir-range'));
    nav.appendChild(left);
    var right=node('div','cdir-pager-right');
    var label=node('label','cdir-size-label','Per page');
    var sel=node('select','cdir-page-size');
    sel.setAttribute('aria-label','Customers per page');
    [25,50,100].forEach(function(n){var opt=node('option','',n);opt.value=n;sel.appendChild(opt);});
    sel.value=String(state.size);label.appendChild(sel);right.appendChild(label);
    var prev=node('button','cdir-page-btn cdir-page-prev');
    prev.type='button';prev.setAttribute('data-cdir-page','prev');prev.setAttribute('aria-label','Previous page');
    prev.appendChild(iconElement('left','cdir-nav-icon'));prev.appendChild(node('span','','Previous'));
    right.appendChild(prev);
    var current=node('span','cdir-page-index');
    right.appendChild(current);
    var next=node('button','cdir-page-btn cdir-page-next');
    next.type='button';next.setAttribute('data-cdir-page','next');next.setAttribute('aria-label','Next page');
    next.appendChild(node('span','','Next'));next.appendChild(iconElement('right','cdir-nav-icon'));
    right.appendChild(next);nav.appendChild(right);
    wrap.insertAdjacentElement('afterend',nav);
    return nav;
  }
  function applyPagination(nav,rows,total){
    var n=rows.length,pages=Math.max(1,Math.ceil(n/state.size));
    state.page=Math.max(0,Math.min(state.page,pages-1));
    var first=state.page*state.size,last=Math.min(first+state.size,n);
    rows.forEach(function(row,i){
      var off=i<first||i>=last;
      if(row.classList.contains('cdir-off-page')!==off)row.classList.toggle('cdir-off-page',off);
    });
    var count=nav.querySelector('.cdir-range');
    var value=n?('Showing '+(first+1)+'–'+last+' of '+n+' loaded customers'):'No customer profiles in this view';
    if(total>n)value+=' ('+total+' match this filter)';
    if(count.textContent!==value)count.textContent=value;
    var idx=nav.querySelector('.cdir-page-index'),number='Page '+(state.page+1)+' of '+pages;
    if(idx.textContent!==number)idx.textContent=number;
    var prev=nav.querySelector('.cdir-page-prev'),next=nav.querySelector('.cdir-page-next');
    if(prev.disabled!==(state.page===0))prev.disabled=state.page===0;
    if(next.disabled!==(state.page>=pages-1))next.disabled=state.page>=pages-1;
  }
  function refresh(){
    scheduled=false;
    if(!root)return;
    var main=root.querySelector('#ccs-main');
    if(!isDirectory(main))return;
    var wrap=main.querySelector('.ccs-table-wrap'),table=wrap&&wrap.querySelector('table.ccs-table'),
        body=table&&table.querySelector('tbody');
    if(!wrap||!body)return;
    var segmentSelect=main.querySelector('#ccs-seg'),segment=segmentSelect?segmentSelect.value:'search',
        searchInput=main.querySelector('#ccs-cq'),query=searchInput?searchInput.value.trim():'';
    if(segment!==state.segment||query!==state.search){state.page=0;state.segment=segment;state.search=query;}
    var original=Array.prototype.slice.call(body.querySelectorAll('tr[data-act="open-customer"]'));
    var countSource=main.querySelector('.ccs-ccount b');
    var total=countSource?countText(countSource.textContent):null;
    if(total==null||total<original.length)total=original.length;
    decorateNativeControls(main);
    addSegments(main);
    directoryHeading(main,wrap,original.length,total,main.getAttribute('data-screen')==='customers-search');
    var rows=sortedRows(table);
    table.setAttribute('aria-label','Customer directory');
    var nav=pager(main,wrap);
    applyPagination(nav,rows,total);
    if(!main.classList.contains('cdir-v3-ready'))main.classList.add('cdir-v3-ready');
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    Promise.resolve().then(function(){try{refresh();}catch(err){scheduled=false;console.error('[Corner Cafe Customers] Directory visual enhancement failed. Native directory retained.',err);}});
  }
  function onClick(e){
    var t=e.target;
    if(!t||!t.closest)return;
    var seg=t.closest('[data-cdir-segment]');
    if(seg){
      var main=root.querySelector('#ccs-main'),native=main&&main.querySelector('#ccs-seg');
      if(!isDirectory(main)||!native)return;
      var value=seg.getAttribute('data-cdir-segment');
      if(!Array.prototype.some.call(native.options,function(o){return o.value===value;}))return;
      if(native.value!==value){
        state.page=0;native.value=value;
        native.dispatchEvent(new Event('change',{bubbles:true}));
      }
      return;
    }
    var page=t.closest('[data-cdir-page]');
    if(page){
      if(!isDirectory(root.querySelector('#ccs-main')))return;
      var dir=page.getAttribute('data-cdir-page');
      state.page=Math.max(0,state.page+(dir==='next'?1:-1));
      schedule();
      var scroll=root.querySelector('#ccs-main .ccs-table-wrap');
      if(scroll&&scroll.scrollTo)scroll.scrollTo({top:0,behavior:'instant'});
    }
  }
  function onChange(e){
    var t=e.target;if(!t)return;
    if(t.classList&&t.classList.contains('cdir-sort')){state.sort=t.value;state.page=0;schedule();}
    else if(t.classList&&t.classList.contains('cdir-page-size')){
      var n=Number(t.value);if([25,50,100].indexOf(n)>-1){state.size=n;state.page=0;schedule();}
    }
  }
  function boot(){
    root=document.getElementById('cc-staff');
    if(!root){if(++bootTries<120)setTimeout(boot,250);return;}
    root.addEventListener('click',onClick,false);
    root.addEventListener('change',onChange,false);
    var ob=new MutationObserver(function(){schedule();});
    ob.observe(root,{childList:true,subtree:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
