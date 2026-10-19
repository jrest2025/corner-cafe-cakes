/* Editable analysis islands. Overview is deliberately excluded from every transformation. */
(function () {
 'use strict';
 if (window.__ccAnalyticsWorkspace) return;
 window.__ccAnalyticsWorkspace = true;
 var root, observer, queued = false, drag = null;
 var STORAGE = 'ccs.analytics.layout.v1', layouts = read(), editing = {}, drafts = {};
 var specs = {
  cs: {name:'Café sales',dataset:'cafe_sales',owner:'Finance / POS',cards:[
   ['sales-trend','Sales against target','wide','Business date; net sales including VAT; sales target','Daily sales and target · FJD'],
   ['transactions','Transactions and average spend','compact','Business date; transactions; net sales including VAT','Transactions and sales per transaction'],
   ['mix','Category and product mix','half','Business date; item code; item name; category; quantity sold; net revenue including VAT','Requires the product sales dataset', 'product_sales'],
   ['adjustments','Discounts and refunds','half','Business date; gross sales; discounts; refunds; VAT','Revenue adjustments · FJD']
  ]},
  mk: {name:'Marketing',dataset:'campaigns',owner:'Marketing',cards:[
   ['campaign-results','Campaign performance','wide','Date; campaign ID; campaign name; platform; spend; enquiries; orders','Compare spend and recorded outcomes'],
   ['spend','Spend by platform','compact','Date; platform; spend','Campaign spend · FJD'],
   ['efficiency','Cost per result','half','Spend; clicks; enquiries; orders','Only calculate when the relevant result count is available'],
   ['attribution','Attributed revenue','half','Campaign ID; attributed revenue; attribution method','Return on spend requires traceable revenue']
  ]},
  wb: {name:'Website',dataset:'website',owner:'Marketing / website analytics',cards:[
   ['conversion','Order form journey','wide','Date; sessions; cake order form starts; cake orders submitted','Visits → form starts → submissions'],
   ['traffic','Traffic sources','compact','Date; traffic source; sessions','Compare visits and form submissions by source'],
   ['landing','Landing pages','half','Date; landing page; sessions; cake orders submitted','Page performance'],
   ['campaign','Campaign traffic','half','Date; campaign ID; sessions; cake orders submitted','Tracked campaign visits and submissions']
  ]}
 };
 function el(tag, cls, text) { var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e; }
 function button(label, action, id) { var e=el('button','aw-button',label);e.type='button';e.dataset.awAction=action;if(id)e.dataset.awId=id;return e; }
 function read() { try {var p=JSON.parse(localStorage.getItem(STORAGE)||'{}');return p&&p.version===1&&p.layouts&&typeof p.layouts==='object'?p.layouts:{};}catch(e){return {};} }
 function copy(x) {return JSON.parse(JSON.stringify(x));}
 function moduleOf(main) {var b=main.querySelector('.an-mod[aria-current="page"]');return b&&b.dataset.v;}
 function sectionOf(main,mod) {var b=main.querySelector('[data-g="dash"][aria-selected="true"],[data-g="dash"][aria-pressed="true"],[data-g="dash"][aria-current="page"],.dx-secs .is-on,.dx-secs .is-active');return mod+':'+(b&&b.dataset.v||main.querySelector('.dx-secbody')&&main.querySelector('.dx-secbody').getAttribute('aria-label')||'main');}
 function slug(s) {return String(s||'island').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64);}
 function label(card) {return card.dataset.awTitle||'Analysis';}
 function announce(main,msg) {var live=main.querySelector('.aw-live');if(live)live.textContent=msg;}
 function defaultSize(card) {return card.dataset.awDefaultSize||'half';}
 function controls(card) {
  var bar=el('div','aw-card-tools');
  var handle=button('Move','handle',card.dataset.awId);handle.classList.add('aw-handle');handle.title='Drag to move '+label(card);handle.setAttribute('aria-label','Drag to move '+label(card));
  bar.append(handle,button('↑','up',card.dataset.awId),button('↓','down',card.dataset.awId));
  bar.children[1].setAttribute('aria-label','Move '+label(card)+' earlier');bar.children[2].setAttribute('aria-label','Move '+label(card)+' later');
  var size=el('select','aw-size');size.dataset.awSize=card.dataset.awId;size.setAttribute('aria-label','Width of '+label(card));
  [['compact','Compact'],['half','Half width'],['wide','Wide'],['full','Full width']].forEach(function(a){var o=el('option','',a[1]);o.value=a[0];size.append(o);});
  bar.append(size,button('Hide','hide',card.dataset.awId));return bar;
 }
 function card(title,body,id,size) {
  var c=el('section','dx-card aw-island');c.dataset.awId=id||slug(title);c.dataset.awTitle=title;c.dataset.awDefaultSize=size||'half';c.dataset.awSize=size||'half';c.setAttribute('aria-label',title);
  var head=el('div','aw-island-head');head.append(el('h2','',title));c.append(controls(c),head);
  var content=el('div','aw-island-body');if(body)content.append(body);c.append(content);return c;
 }
 function settings(board) {return Array.prototype.map.call(board.querySelectorAll(':scope > .aw-island'),function(c){return {id:c.dataset.awId,size:c.dataset.awSize,hidden:c.hidden};});}
 function apply(board, config, edit) {
  var cards=Array.prototype.slice.call(board.querySelectorAll(':scope > .aw-island')),by={};cards.forEach(function(c){by[c.dataset.awId]=c;});
  var ordered=[],seen={};(Array.isArray(config)?config:[]).forEach(function(r){if(!r||!by[r.id]||seen[r.id])return;var c=by[r.id];seen[r.id]=true;ordered.push(c);c.dataset.awSize=['compact','half','wide','full'].indexOf(r.size)>=0?r.size:defaultSize(c);c.hidden=!!r.hidden;c.dataset.awHidden=String(!!r.hidden);});
  cards.forEach(function(c){if(!seen[c.dataset.awId]){c.dataset.awSize=defaultSize(c);c.hidden=false;c.dataset.awHidden='false';ordered.push(c);}});
  ordered.forEach(function(c){board.append(c);var select=c.querySelector('.aw-size');if(select)Array.prototype.forEach.call(select.options,function(o){o.selected=o.value===c.dataset.awSize;});});
  board.classList.toggle('aw-editing',!!edit);
 }
 function toolbar(key,title) {
  var t=el('div','aw-toolbar');t.dataset.awKey=key;var info=el('div','aw-toolbar-title');info.append(el('h2','',title),el('span','aw-layout-note','Arrange this workspace to suit you'));
  var acts=el('div','aw-toolbar-actions');acts.append(button('Edit layout','edit'),button('Save layout','save'),button('Cancel','cancel'),button('Reset layout','reset'));
  t.append(info,acts);var live=el('span','aw-live');live.setAttribute('role','status');live.setAttribute('aria-live','polite');t.append(live);return t;
 }
 function restoreTray(main,board) {
  var old=main.querySelector('.aw-hidden');if(old)old.remove();
  var hidden=Array.prototype.filter.call(board.children,function(c){return c.classList.contains('aw-island')&&c.hidden;});
  if(!hidden.length||!board.classList.contains('aw-editing'))return;
  var tray=el('div','aw-hidden');tray.append(el('span','','Hidden islands:'));
  hidden.forEach(function(c){tray.append(button('Restore '+label(c),'restore',c.dataset.awId));});board.before(tray);
 }
 function wrap(main,mod,title,cards,anchor) {
  var key=sectionOf(main,mod),board=el('div','aw-board');board.dataset.awKey=key;board.setAttribute('aria-label',title+' islands');
  cards.forEach(function(c,i){c.dataset.awOrder=i;board.append(c);});
  var tools=toolbar(key,title);if(anchor){anchor.before(tools,board);anchor.remove();}else main.append(tools,board);
  apply(board,(editing[key]?drafts[key]:layouts[key])||[],!!editing[key]);tools.classList.toggle('aw-editing',!!editing[key]);restoreTray(main,board);
 }
 function dataRequirement(title,fields,owner,dataset,caption,available) {
  var body=el('div','aw-template');body.append(el('p','aw-chart-caption',caption));
  var empty=el('div','aw-chart-empty');empty.append(el('span','aw-empty-mark','—'),el('strong','',available?'Report setup required':'Data required'),el('span','',available?'Dataset detected. Validate its field mapping before displaying figures.':'Connect '+owner+' data to populate this island.'));body.append(empty);
  var req=el('details','aw-requirements');req.append(el('summary','','Required data'));var list=el('ul');fields.split(';').forEach(function(f){list.append(el('li','',f.trim()));});req.append(list);body.append(req);
  var download=button('Download data template','template');download.dataset.awDataset=dataset;body.append(download);return body;
 }
 function missingModules(main,mod) {
  var spec=specs[mod];if(!spec)return false;
  var original=main.querySelector('.an-wait,.an-grid,.dx-card');if(!original)return false;
  var anchor=el('div');original.before(anchor);
  // Clear only the current module's existing placeholder content after the module tab row.
  var nav=main.querySelector('.an-mods'),cursor=nav&&nav.nextElementSibling;
  while(cursor){var next=cursor.nextElementSibling;if(cursor!==anchor)cursor.remove();cursor=next;}
  var active=main.querySelector('.an-mod[aria-current="page"]'),available=active&&!active.classList.contains('is-need');
  var cards=spec.cards.map(function(s){return card(s[1],dataRequirement(s[1],s[3],spec.owner,s[5]||spec.dataset,s[4],s[5]?false:available),s[0],s[2]);});
  wrap(main,mod,spec.name,cards,anchor);return true;
 }
 function yearChart(table) {
  var rows=Array.prototype.slice.call(table.querySelectorAll('tbody tr')).filter(function(r){return !r.classList.contains('dx-total')&&r.querySelectorAll('td,th').length>=4;}),values=rows.map(function(r){return Number(r.querySelectorAll('td,th')[3].textContent.replace(/[^0-9.-]/g,''))||0;}),max=Math.max.apply(null,values)||1;
  if(!rows.length)return null;
  var figure=el('figure','aw-month-chart');figure.append(el('figcaption','','Recorded sales by month · selected year'));
  var plot=el('div','aw-month-bars');plot.setAttribute('role','group');plot.setAttribute('aria-label','Recorded sales by month');
  rows.forEach(function(r,i){var c=el(r.dataset.act?'button':'div','aw-month-bar');if(r.dataset.act){c.type='button';c.dataset.act=r.dataset.act;c.dataset.v=r.dataset.v;}var name=r.querySelectorAll('td,th')[0].textContent.trim(),amount=r.querySelectorAll('td,th')[3].textContent.trim();c.setAttribute('aria-label',name+': '+amount+' in completed sales');c.title=name+': '+amount;var track=el('span','aw-month-track'),bar=el('i');bar.style.height=(values[i]/max*100)+'%';track.append(bar);c.append(el('span','aw-month-value',values[i]?amount:''),track,el('span','aw-month-label',name));plot.append(c);});
  figure.append(plot);return figure;
 }
 function splitContent(main,mod) {
  var section=main.querySelector('.dx-secbody');
  if(!section)return false;
  // Specialized occasion intelligence and upload forms keep their operational form structure.
  var title=section.getAttribute('aria-label')||mod,cards=[],group=null,n=0;
  Array.prototype.slice.call(section.children).forEach(function(child){
   if(child.classList.contains('dx-hr')){group=null;return;}
   if(child.classList.contains('dx-card-h')){
    var h=child.querySelector('h2,h3');if(!h)return;
    group=card(h.textContent,null,slug(h.textContent)+'-'+n++);cards.push(group);
    var note=child.querySelector('span');if(note)group.querySelector('.aw-island-body').append(note);return;
   }
   if(!group){group=card(title,null,slug(title)+'-'+n++);cards.push(group);}
   group.querySelector('.aw-island-body').append(child);
  });
  cards=cards.filter(function(c){return c.querySelector('.aw-island-body').children.length;});
  // The figures remain real existing values and retain their original drill-down attributes.
  var contextCards=[];
  cards.forEach(function(c){
   var kpis=c.querySelector('.ccs-kpis');if(kpis){c.classList.add('aw-summary');c.dataset.awDefaultSize='full';
    var extra=el('div','ccs-kpis'),body=c.querySelector('.aw-island-body');
    Array.prototype.slice.call(kpis.children).forEach(function(k){var lbl=k.querySelector('.ccs-kpi-l');if(lbl&&/excluding VAT|same period last year/i.test(lbl.textContent))extra.append(k);});
    if(extra.children.length){var context=card('Tax and comparisons',extra,'sales-context','half');context.classList.add('aw-context');contextCards.push(context);}
    var how=body.querySelector('.an-how');if(how)body.append(how);
   }
   var table=c.querySelector('.ccs-table,.dx-octab');if(table){if(/year overview/i.test(label(c))){var chart=yearChart(table);if(chart)c.querySelector('.aw-island-body').prepend(chart);}c.dataset.awDefaultSize='full';var d=el('details','aw-records');d.append(el('summary','','View data'));var holder=table.closest('.ccs-table-wrap,.dx-octwrap')||table;holder.before(d);d.append(holder);}
   if(c.querySelector('.lt-wrap,.or-body'))c.dataset.awDefaultSize='full';
  });
  if(!cards.length)return false;cards=cards.concat(contextCards);wrap(main,mod,title,cards,section);return true;
 }
 function looseCards(main,mod) {
  var cards=Array.prototype.slice.call(main.querySelectorAll('.an-grid > .dx-card,.dx-card')).filter(function(c){return !c.parentElement.closest('.dx-card')&&!c.closest('.aw-board')&&!c.closest('form');});
  if(!cards.length)return false;var anchor=el('div');cards[0].before(anchor);
  var islands=cards.map(function(c,i){var h=c.querySelector('h2,h3'),title=h?h.textContent:'Analysis '+(i+1),body=el('div');while(c.firstChild)body.append(c.firstChild);c.remove();return card(title,body,slug(title)+'-'+i,'half');});
  wrap(main,mod,mod==='ci'?'Insights':mod==='sd'?'Occasions':'Data',islands,anchor);return true;
 }
 function compactFilters(main) {
  var filters=main.querySelector('.dx-filters');if(!filters||filters.closest('.aw-filterbar'))return;
  var bar=el('div','aw-filterbar'),period=filters.querySelector('#dx-p'),field=period&&period.closest('label');filters.before(bar);if(field)bar.append(field);
  var details=el('details','aw-filters');details.append(el('summary','','Filters'));bar.append(details);details.append(filters);
 }
 function sectionPicker(main) {
  var nav=main.querySelector('.dx-secs');if(!nav||nav.querySelector('.aw-section-picker'))return;
  var label=el('label','aw-section-picker');label.append(el('span','','Analysis'));var select=el('select','ccs-input');select.dataset.awSection='true';
  Array.prototype.forEach.call(nav.querySelectorAll('[data-g="dash"]'),function(b){var o=el('option','',b.textContent.trim());o.value=b.dataset.v;o.selected=b.getAttribute('aria-selected')==='true';select.append(o);});label.append(select);nav.prepend(label);
 }
 function update() {
  queued=false;if(!root)return;var main=root.querySelector('#ccs-main');if(!main)return;
  var mod=moduleOf(main),allowed=['ck','cs','mk','wb','sd','ci','da'].indexOf(mod)>=0;
  if(!allowed){main.classList.remove('aw-workspace');return;}
  if(main.querySelector('.aw-board'))return;
  if(!main.querySelector('.an-mods')||main.querySelector('.ccs-loading'))return;
  observer.disconnect();try{
   main.classList.add('aw-workspace');
   if(!missingModules(main,mod)&&!splitContent(main,mod))looseCards(main,mod);compactFilters(main);sectionPicker(main);
  }finally{observer.observe(root,{childList:true,subtree:true});}
 }
 function schedule(){if(queued)return;queued=true;queueMicrotask(update);}
 function findCard(board,id){return Array.prototype.find.call(board.children,function(c){return c.dataset.awId===id;});}
 function save(main,board,key){
  var config=settings(board),next=copy(layouts);next[key]=config;
  try{localStorage.setItem(STORAGE,JSON.stringify({version:1,layouts:next}));layouts=next;editing[key]=false;delete drafts[key];board.classList.remove('aw-editing');main.querySelector('.aw-toolbar').classList.remove('aw-editing');restoreTray(main,board);announce(main,'Layout saved on this browser.');}
  catch(e){announce(main,'Layout could not be saved. Your changes remain open.');}
 }
 function click(e){
  var b=e.target.closest('[data-aw-action]');if(!b||!root.contains(b))return;
  e.preventDefault();var main=b.closest('#ccs-main'),board=main&&main.querySelector('.aw-board');if(!board)return;
  var key=board.dataset.awKey,action=b.dataset.awAction,c=findCard(board,b.dataset.awId);
  if(action==='template'){var original=el('button');original.type='button';original.dataset.act='dx-an-tpl';original.dataset.v=b.dataset.awDataset;original.hidden=true;main.append(original);original.click();original.remove();return;}
  if(action==='edit'){drafts[key]=settings(board);editing[key]=true;board.classList.add('aw-editing');main.querySelector('.aw-toolbar').classList.add('aw-editing');restoreTray(main,board);announce(main,'Edit layout. Drag a Move handle or use the arrow buttons.');return;}
  if(action==='save'){save(main,board,key);return;}
  if(action==='cancel'){editing[key]=false;delete drafts[key];apply(board,layouts[key]||[],false);main.querySelector('.aw-toolbar').classList.remove('aw-editing');restoreTray(main,board);announce(main,'Layout changes discarded.');return;}
  if(!editing[key])return;
  if(action==='reset'){var ordered=Array.prototype.slice.call(board.children).sort(function(a,b){return +a.dataset.awOrder- +b.dataset.awOrder;});ordered.forEach(function(c){board.append(c);});apply(board,[],true);announce(main,'Default layout restored. Save to keep it.');}
  if(c&&action==='hide'){c.hidden=true;c.dataset.awHidden='true';}
  if(c&&action==='restore'){c.hidden=false;c.dataset.awHidden='false';}
  if(c&&(action==='up'||action==='down')){var list=Array.prototype.filter.call(board.children,function(x){return !x.hidden;}),i=list.indexOf(c),target=list[i+(action==='up'?-1:1)];if(target){if(action==='up')target.before(c);else target.after(c);announce(main,label(c)+' moved '+(action==='up'?'earlier.':'later.'));var focus=c.querySelector('[data-aw-action="'+action+'"]');if(focus)focus.focus();}}
  drafts[key]=settings(board);restoreTray(main,board);
 }
 function pointerDown(e){
  var h=e.target.closest('.aw-handle'),board=h&&h.closest('.aw-editing');if(!board||e.button>0)return;
  var c=h.closest('.aw-island');drag={id:e.pointerId,board:board,card:c,x:e.clientX,y:e.clientY,moved:false};
 }
 function pointerMove(e){
  if(!drag||e.pointerId!==drag.id)return;
  if(!drag.moved&&Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)<8)return;
  e.preventDefault();drag.moved=true;drag.card.classList.add('aw-moving');
  var target=document.elementFromPoint(e.clientX,e.clientY),c=target&&target.closest('.aw-island');
  if(c&&c!==drag.card&&c.parentNode===drag.board){var r=c.getBoundingClientRect();if(e.clientY<r.top+Math.min(r.height/2,64))c.before(drag.card);else c.after(drag.card);}
 }
 function pointerUp(e){if(!drag||e.pointerId!==drag.id)return;drag.card.classList.remove('aw-moving');drafts[drag.board.dataset.awKey]=settings(drag.board);if(drag.moved)announce(drag.board.closest('#ccs-main'),label(drag.card)+' moved.');drag=null;}
 function boot(){root=document.getElementById('cc-staff');if(!root)return;observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});root.addEventListener('click',click);root.addEventListener('change',function(e){if(e.target.matches('[data-aw-section]')){var selected=root.querySelector('[data-g="dash"][data-v="'+e.target.value+'"]');if(selected)selected.click();return;}var s=e.target.closest('[data-aw-size]'),board=s&&s.closest('.aw-editing');if(!board)return;var c=findCard(board,s.dataset.awSize);if(c)c.dataset.awSize=s.value;drafts[board.dataset.awKey]=settings(board);});root.addEventListener('pointerdown',pointerDown);document.addEventListener('pointermove',pointerMove,{passive:false});document.addEventListener('pointerup',pointerUp);document.addEventListener('pointercancel',pointerUp);update();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
