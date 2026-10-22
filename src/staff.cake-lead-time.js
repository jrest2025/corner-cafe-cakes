/* Corner Cafe Cake CRM — Cakes by pickup day and booking time (live 22 Oct 2026; 0.2.0 calmer text).
 * One bar per pickup day. The bar height is the cakes due that day (the same count as
 * the protected Daily Cake Demand green line). The bar is split by how far ahead the
 * cakes were booked. Order counting rules match CCCakeSeasonalStage.normalize:
 * cancelled, declined and not_confirmed orders are left out; an order date is only used
 * when the register marks it reliable (odok) and it is on or before the pickup date.
 * Presentation only: no database, business rule or protected calculation changes.
 */
(function(global){
  'use strict';
  var NAME='CCCakeLeadTime',VERSION='0.2.0',DAY=86400000;
  var BUCKETS=[
    {k:'weeks',label:'8 or more days ahead',short:'8+ days',color:'#1f5f3f'},
    {k:'week',label:'3 to 7 days ahead',short:'3–7 days',color:'#3f8a5f'},
    {k:'days',label:'1 to 2 days ahead',short:'1–2 days',color:'#7dbb92'},
    {k:'same',label:'Same day',short:'Same day',color:'#c4e3cd'},
    {k:'unknown',label:'Booking date not known',short:'Not known',color:'#cbd2d9'}
  ];
  var RANGES=[{k:'30',label:'Last 30 days',days:30},{k:'90',label:'Last 90 days',days:90},
    {k:'year',label:'This year',days:null},{k:'all',label:'All time',days:0}];
  function iso(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d:'';}
  function t(d){return Date.parse(d+'T12:00:00Z');}
  function add(d,n){return new Date(t(d)+n*DAY).toISOString().slice(0,10);}
  function gap(a,b){return Math.round((t(b)-t(a))/DAY);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
  function pretty(d,opt){return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',Object.assign({weekday:'short',day:'numeric',month:'short',timeZone:'UTC'},opt||{}));}
  function bucket(lead){return lead===null?'unknown':lead===0?'same':lead<=2?'days':lead<=7?'week':'weeks';}
  function qtyOf(o){var it=Array.isArray(o.it)?o.it:[];var q=it.reduce(function(s,x){return s+(Number(x&&x[3])||0);},0);return q>0?q:1;}
  function cakeName(o){var x=Array.isArray(o.it)&&o.it[0]||[];var g=x[0]||'Cake',n=x[1]||'';
    return n&&n.toLowerCase()!==String(g).toLowerCase()?n:g;}

  function index(raw,today){
    var days=Object.create(null),takenToday=0,first=null;
    (Array.isArray(raw)?raw:[]).forEach(function(o){
      if(!o||o.off===true||['cancelled','declined','not_confirmed'].indexOf(o.st)>=0)return;
      var pd=iso(o.pd),od=iso(o.od);if(!pd||pd<'2024-01-01'||pd>'2028-12-31')return;
      var ok=o.odok===true&&od&&od<=pd&&od<=today,q=qtyOf(o),b=bucket(ok?gap(od,pd):null);
      var d=days[pd]||(days[pd]={total:0,orders:0,b:{},cakes:{}});
      d.total+=q;d.orders++;d.b[b]=(d.b[b]||0)+q;
      var n=cakeName(o);d.cakes[n]=(d.cakes[n]||0)+q;
      if(ok&&od===today)takenToday+=q;
      if(!first||pd<first)first=pd;
    });
    return {days:days,takenToday:takenToday,first:first};
  }

  function windowFor(range,today,first){
    var end=add(today,14),start;
    if(range.k==='year')start=today.slice(0,4)+'-01-01';
    else if(range.k==='all')start=first||add(today,-30);
    else start=add(today,-range.days+1);
    return {start:start,end:end};
  }

  function summary(ix,start,today){
    var tot={},all=0,known=0;
    for(var d=start;d<=today;d=add(d,1)){var x=ix.days[d];if(!x)continue;
      BUCKETS.forEach(function(b){var v=x.b[b.k]||0;tot[b.k]=(tot[b.k]||0)+v;all+=v;if(b.k!=='unknown')known+=v;});}
    var top=null;BUCKETS.forEach(function(b){if(b.k!=='unknown'&&(tot[b.k]||0)>(top?tot[top.k]:0))top=b;});
    return {tot:tot,all:all,known:known,top:top};
  }

  function mount(host,raw,opts){
    opts=opts||{};var today=iso(opts.today)||new Date().toISOString().slice(0,10);
    var ix=index(raw,today),state={range:RANGES[0],selected:today};
    var root=opts.root||document.createElement('section');root.className='cclt';root.id='cc-cake-lead-time';
    root.setAttribute('aria-label','Cakes by pickup day and how far ahead they were booked');
    if(!root.parentNode)host.appendChild(root);

    function render(){
      var w=windowFor(state.range,today,ix.first),s=summary(ix,w.start,today);
      var pct=function(v){return s.all?Math.round(100*v/s.all):0;};
      var headline=!s.all?'No cakes picked up in this period yet.':
        'Most cakes are booked <b>'+esc(s.top.label.toLowerCase())+'</b>. '+
        (pct(s.tot.same||0)?pct(s.tot.same||0)+'% are same-day orders.':'No same-day orders.');
      var strip=BUCKETS.map(function(b){var v=s.tot[b.k]||0;if(!v)return '';
        return '<span style="flex:'+v+';background:'+b.color+'" title="'+esc(b.label+': '+v+' cakes')+'"></span>';}).join('');
      var key=BUCKETS.map(function(b){var v=s.tot[b.k]||0;
        return '<li><i style="background:'+b.color+'"></i><span>'+esc(b.label)+'</span><b>'+pct(v)+'%</b><small>'+v+' cakes</small></li>';}).join('');
      root.innerHTML=
        '<div class="cclt-head"><div><h3>Cakes by pickup day</h3></div>'+
        '<div class="cclt-today"><small>Orders taken today</small><b>'+ix.takenToday+'</b><small>cake'+(ix.takenToday===1?'':'s')+'</small></div></div>'+
        '<div class="cclt-ranges" role="group" aria-label="Period">'+RANGES.map(function(r){
          return '<button type="button" data-r="'+r.k+'" aria-pressed="'+(r===state.range)+'">'+esc(r.label)+'</button>';}).join('')+'</div>'+
        '<div class="cclt-habit"><p>'+headline+'</p><div class="cclt-strip" aria-hidden="true">'+strip+'</div>'+
        '<ul class="cclt-key">'+key+'</ul><p class="cclt-note">'+s.all+' cakes picked up '+esc(state.range.label.toLowerCase())+'.</p>'+
        '<details class="cc-why"><summary>About this chart</summary><p class="cclt-note">Grey, booking date not known: paper slips and older records with no order date. Amber outline: busiest day. Light orange days: Fiji public holidays.</p></details></div>'+
        '<div class="cclt-chart"><div class="cclt-scroll" tabindex="0" aria-label="Scroll to see more days"></div></div>'+
        '<div class="cclt-detail" aria-live="polite"></div>';
      root.querySelectorAll('[data-r]').forEach(function(btn){btn.onclick=function(){
        state.range=RANGES.filter(function(r){return r.k===btn.dataset.r;})[0];render();};});
      drawChart(w);showDay(state.selected);
    }

    function hols(d){var R=global.CCCakeDemandRail;try{return R&&typeof R.holidaysOn==='function'?R.holidaysOn(d)||[]:[];}catch(e){return [];}}
    function drawChart(w){
      var sc=root.querySelector('.cclt-scroll'),n=gap(w.start,w.end)+1,avail=Math.max(280,(sc.clientWidth||root.clientWidth)-44);
      var big=root.clientWidth>=600,minBw=big?12:10,maxBw=big?36:32;
      var bw=Math.max(minBw,Math.min(maxBw,Math.floor(avail/n))),showN=bw>=22,showD=bw>=20;
      var H=236,top=28,bottom=54,plot=H-top-bottom;
      var max=1,busy=null;
      for(var d=w.start;d<=w.end;d=add(d,1)){var x=ix.days[d];if(x){if(x.total>max)max=x.total;if(d<=today&&(!busy||x.total>ix.days[busy].total))busy=d;}}
      max=Math.max(4,Math.ceil(max/2)*2);
      var W=n*bw+44,svg='';
      [0,.5,1].forEach(function(f){var y=top+plot-plot*f;
        svg+='<line x1="34" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="#e6ece8"/>'+
          '<text x="28" y="'+(y+5)+'" text-anchor="end" class="cclt-ax">'+Math.round(max*f)+'</text>';});
      var i=0,lastMonth='';
      for(d=w.start;d<=w.end;d=add(d,1),i++){
        var x0=40+i*bw,dd=ix.days[d],future=d>today,y=top+plot,mid=x0+bw/2;
        var fj=hols(d).filter(function(e){return e.g==='fj'&&e.k==='h';});
        if(future)svg+='<rect x="'+x0+'" y="'+(top-4)+'" width="'+bw+'" height="'+(plot+4)+'" fill="#f5f7fb"/>';
        if(fj.length)svg+='<rect x="'+x0+'" y="'+(top-4)+'" width="'+bw+'" height="'+(plot+4)+'" fill="#fdf1dc"><title>'+esc(fj.map(function(e){return e.name;}).join(', '))+'</title></rect>';
        if(d===today)svg+='<rect x="'+x0+'" y="'+(top-22)+'" width="'+bw+'" height="'+(plot+22)+'" rx="5" fill="#eef3fb"/>';
        if(dd){
          var gapPx=bw>=20?4:bw>=14?2:1;
          BUCKETS.slice().reverse().forEach(function(b){var v=dd.b[b.k]||0;if(!v)return;var h=plot*v/max;y-=h;
            svg+='<rect x="'+(x0+gapPx)+'" y="'+y+'" width="'+(bw-gapPx*2)+'" height="'+h+'" fill="'+b.color+'"/>';});
          if(showN||d===busy)svg+='<text x="'+mid+'" y="'+(y-6)+'" text-anchor="middle" class="cclt-n'+(d===busy?' cclt-busy-n':'')+'">'+dd.total+'</text>';
          if(d===busy)svg+='<rect x="'+(x0+1)+'" y="'+(y-1)+'" width="'+(bw-2)+'" height="'+(top+plot-y+2)+'" fill="none" stroke="#d98b19" stroke-width="2.5" rx="3"/>';
        }
        var dt=new Date(t(d)),day=dt.getUTCDate(),wd='SMTWTFS'[dt.getUTCDay()],mon=d.slice(0,7);
        var tick=showD||d===today||(gap(d,today)%7===0&&Math.abs(gap(d,today))>=4);if(tick)svg+='<text x="'+mid+'" y="'+(top+plot+19)+'" text-anchor="middle" class="cclt-d'+(d===today?' cclt-on':'')+'">'+day+'</text>';
        if(showD)svg+='<text x="'+mid+'" y="'+(top+plot+36)+'" text-anchor="middle" class="cclt-w">'+wd+'</text>';
        if(mon!==lastMonth){lastMonth=mon;svg+='<text x="'+x0+'" y="12" class="cclt-m">'+esc(new Date(t(d)).toLocaleDateString('en-GB',{month:bw<20?'short':'long',year:'numeric',timeZone:'UTC'}))+'</text>';
          if(i)svg+='<line x1="'+x0+'" x2="'+x0+'" y1="16" y2="'+(top+plot)+'" stroke="#d6dde3" stroke-dasharray="3 3"/>';}
        if(d===state.selected)svg+='<rect x="'+(x0+1)+'" y="'+(top+plot+3)+'" width="'+(bw-2)+'" height="'+(showD?42:24)+'" rx="5" fill="none" stroke="#2f4a7a" stroke-width="2"/>';
        svg+='<rect x="'+x0+'" y="0" width="'+bw+'" height="'+H+'" fill="transparent" class="cclt-hit" data-d="'+d+'">'+
          '<title>'+esc(pretty(d)+': '+(dd?dd.total:0)+' cake'+((dd&&dd.total===1)?'':'s')+(fj.length?' · '+fj.map(function(e){return e.name;}).join(', '):''))+'</title></rect>';
      }
      sc.innerHTML='<svg width="'+W+'" height="'+H+'" role="img" aria-label="Cakes due each day, split by how far ahead they were booked">'+svg+'</svg>';
      sc.querySelectorAll('.cclt-hit').forEach(function(r){r.onclick=function(){state.selected=r.dataset.d;drawChart(w);showDay(state.selected);};});
      var todayX=40+gap(w.start,today)*bw;sc.scrollLeft=Math.max(0,todayX-sc.clientWidth+bw*(sc.clientWidth>=900?15:4));
    }

    function showDay(d){
      var x=ix.days[d],el=root.querySelector('.cclt-detail');
      if(!x){var h0=hols(d).map(function(e){return e.name;});el.innerHTML='<h4>'+esc(pretty(d,{year:'numeric'}))+(h0.length?' <small class="cclt-hol">'+esc(h0.join(', '))+'</small>':'')+'</h4><p>No cakes for pickup.</p>';return;}
      var parts=BUCKETS.filter(function(b){return x.b[b.k];}).map(function(b){
        return '<li><i style="background:'+b.color+'"></i>'+x.b[b.k]+' booked '+esc(b.label.toLowerCase())+'</li>';}).join('');
      var cakes=Object.keys(x.cakes).sort(function(a,b){return x.cakes[b]-x.cakes[a]||a.localeCompare(b);}).map(function(n){
        return '<li><span>'+esc(n)+'</span><b>'+x.cakes[n]+'</b></li>';}).join('');
      var hn=hols(d).map(function(e){return e.name;});
      el.innerHTML='<h4>'+esc(pretty(d,{year:'numeric'}))+(hn.length?' <small class="cclt-hol">'+esc(hn.join(', '))+'</small>':'')+(d>today?' <small>upcoming, booked so far</small>':d===today?' <small>today</small>':'')+'</h4>'+
        '<p class="cclt-big"><b>'+x.total+'</b> cake'+(x.total===1?'':'s')+' for pickup · '+x.orders+' order'+(x.orders===1?'':'s')+'</p>'+
        '<div class="cclt-cols"><div><h5>When they were booked</h5><ul class="cclt-parts">'+parts+'</ul></div>'+
        '<div><h5>Cakes</h5><ul class="cclt-cakes">'+cakes+'</ul></div></div>';
    }
    render();
    return {root:root,refresh:render};
  }
  /* Alternative view beside the protected Daily Cake Demand chart. The protected chart is not changed:
     this only adds a switch above it and hides it (display only) while "By booking time" is chosen. */
  var VIEWK='cc_demand_view';
  function getView(){try{return global.localStorage.getItem(VIEWK)==='lead'?'lead':'due';}catch(e){return 'due';}}
  function setView(v){try{global.localStorage.setItem(VIEWK,v);}catch(e){}}
  function attach(parent,raw,opts){
    var rail=parent&&parent.querySelector&&parent.querySelector('#cc-demand-scroll-rail');
    if(!rail)return false;
    var doc=rail.ownerDocument,sw=doc.getElementById('cc-demand-views'),box=doc.getElementById('cc-cake-lead-time');
    var head=rail.closest&&rail.closest('.hb-v2');head=head&&head.querySelector('.hb-v2-head');
    if(!sw||!box||box.nextElementSibling!==rail||(head&&sw.parentNode!==head)){
      if(sw)sw.remove();if(box)box.remove();
      sw=doc.createElement('div');sw.id='cc-demand-views';sw.className='ccdv';sw.setAttribute('role','group');
      sw.setAttribute('aria-label','Choose how to show daily cake demand');
      sw.innerHTML='<span class="ccdv-lbl">View</span>'+
        '<button type="button" data-view="due">Booked and due</button>'+
        '<button type="button" data-view="lead">By booking time</button>';
      box=doc.createElement('section');
      /* the View switch sits in the Cake Heartbeat header, so the chart stays straight under it */
      if(head){sw.classList.add('ccdv-inhead');head.appendChild(sw);}else rail.parentNode.insertBefore(sw,rail);
      rail.parentNode.insertBefore(box,rail);
      sw.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-view]');if(!b)return;setView(b.getAttribute('data-view'));apply();});
    }
    var made=null;
    function apply(){
      var v=getView();
      sw.querySelectorAll('[data-view]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-view')===v));});
      rail.classList.toggle('ccdv-off',v==='lead');box.hidden=v!=='lead';
      if(v==='lead'&&!made)made=mount(null,raw,{today:opts&&opts.today,root:box});
    }
    apply();
    return true;
  }
  global[NAME]={version:VERSION,mount:mount,attach:attach,_index:index};
})(typeof window!=='undefined'?window:globalThis);
