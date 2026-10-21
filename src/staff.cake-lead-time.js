/* Corner Cafe Cake CRM — Cakes by pickup day and booking time (PREVIEW, not live).
 * One bar per pickup day. The bar height is the cakes due that day (the same count as
 * the protected Daily Cake Demand green line). The bar is split by how far ahead the
 * cakes were booked. Order counting rules match CCCakeSeasonalStage.normalize:
 * cancelled, declined and not_confirmed orders are left out; an order date is only used
 * when the register marks it reliable (odok) and it is on or before the pickup date.
 * Presentation only: no database, business rule or protected calculation changes.
 */
(function(global){
  'use strict';
  var NAME='CCCakeLeadTime',VERSION='0.1.0-preview',DAY=86400000;
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
    var root=document.createElement('section');root.className='cclt';root.id='cc-cake-lead-time';
    root.setAttribute('aria-label','Cakes by pickup day and how far ahead they were booked');
    host.appendChild(root);

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
        '<div class="cclt-head"><div><h3>Cakes by pickup day</h3>'+
        '<p>Each bar is the cakes picked up that day. The colours show how far ahead they were booked.</p></div>'+
        '<div class="cclt-today"><small>Orders taken today</small><b>'+ix.takenToday+'</b><small>cake'+(ix.takenToday===1?'':'s')+'</small></div></div>'+
        '<div class="cclt-ranges" role="group" aria-label="Period">'+RANGES.map(function(r){
          return '<button type="button" data-r="'+r.k+'" aria-pressed="'+(r===state.range)+'">'+esc(r.label)+'</button>';}).join('')+'</div>'+
        '<div class="cclt-habit"><p>'+headline+'</p><div class="cclt-strip" aria-hidden="true">'+strip+'</div>'+
        '<ul class="cclt-key">'+key+'</ul><p class="cclt-note">'+s.all+' cakes picked up '+esc(state.range.label.toLowerCase())+
        '. “Booking date not known” is paper slips and older records with no order date.</p></div>'+
        '<div class="cclt-chart"><div class="cclt-scroll" tabindex="0" aria-label="Scroll to see more days"></div></div>'+
        '<div class="cclt-detail" aria-live="polite"></div>';
      root.querySelectorAll('[data-r]').forEach(function(btn){btn.onclick=function(){
        state.range=RANGES.filter(function(r){return r.k===btn.dataset.r;})[0];render();};});
      drawChart(w);showDay(state.selected);
    }

    function drawChart(w){
      var sc=root.querySelector('.cclt-scroll'),n=gap(w.start,w.end)+1;
      var bw=root.clientWidth>=900?30:root.clientWidth>=600?36:32,H=230,top=26,bottom=52,plot=H-top-bottom;
      var max=1,busy=null;
      for(var d=w.start;d<=w.end;d=add(d,1)){var x=ix.days[d];if(x){if(x.total>max)max=x.total;if(d<=today&&(!busy||x.total>ix.days[busy].total))busy=d;}}
      max=Math.max(4,Math.ceil(max/2)*2);
      var W=n*bw+40,svg='';
      [0,.5,1].forEach(function(f){var y=top+plot-plot*f;
        svg+='<line x1="34" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="#e6ece8"/>'+
          '<text x="28" y="'+(y+5)+'" text-anchor="end" class="cclt-ax">'+Math.round(max*f)+'</text>';});
      var i=0;
      for(d=w.start;d<=w.end;d=add(d,1),i++){
        var x0=40+i*bw,dd=ix.days[d],future=d>today,y=top+plot;
        if(future)svg+='<rect x="'+x0+'" y="'+(top-4)+'" width="'+bw+'" height="'+(plot+4)+'" fill="#f5f7fb"/>';
        if(d===today)svg+='<rect x="'+(x0-2)+'" y="'+(top-22)+'" width="'+bw+'" height="'+(plot+24)+'" rx="6" fill="#eef3fb"/>';
        if(dd){
          BUCKETS.slice().reverse().forEach(function(b){var v=dd.b[b.k]||0;if(!v)return;var h=plot*v/max;y-=h;
            svg+='<rect x="'+(x0+3)+'" y="'+y+'" width="'+(bw-8)+'" height="'+h+'" fill="'+b.color+'"/>';});
          svg+='<text x="'+(x0+bw/2-1)+'" y="'+(y-6)+'" text-anchor="middle" class="cclt-n'+(d===busy?' cclt-busy-n':'')+'">'+dd.total+'</text>';
          if(d===busy)svg+='<rect x="'+(x0+1)+'" y="'+(y-1)+'" width="'+(bw-4)+'" height="'+(top+plot-y+2)+'" fill="none" stroke="#d98b19" stroke-width="2.5" rx="3"/>';
        }
        var dt=new Date(t(d)),wd='SMTWTFS'[dt.getUTCDay()];
        svg+='<text x="'+(x0+bw/2-1)+'" y="'+(top+plot+19)+'" text-anchor="middle" class="cclt-d'+(d===today?' cclt-on':'')+'">'+dt.getUTCDate()+'</text>'+
          '<text x="'+(x0+bw/2-1)+'" y="'+(top+plot+36)+'" text-anchor="middle" class="cclt-w">'+wd+'</text>';
        if(dt.getUTCDate()===1||i===0)svg+='<text x="'+x0+'" y="12" class="cclt-m">'+pretty(d,{weekday:undefined,day:undefined,month:'long',year:'numeric'})+'</text>';
        svg+='<rect x="'+x0+'" y="0" width="'+bw+'" height="'+H+'" fill="transparent" class="cclt-hit" data-d="'+d+'" tabindex="-1">'+
          '<title>'+esc(pretty(d)+': '+(dd?dd.total:0)+' cakes')+'</title></rect>';
        if(d===state.selected)svg+='<rect x="'+(x0+1)+'" y="'+(top+plot+4)+'" width="'+(bw-4)+'" height="40" rx="6" fill="none" stroke="#2f4a7a" stroke-width="2"/>';
      }
      svg+='<text x="'+(40+(gap(w.start,today)+1)*bw+4)+'" y="'+(top-8)+'" class="cclt-fut">Upcoming: booked so far</text>';
      sc.innerHTML='<svg width="'+W+'" height="'+H+'" role="img" aria-label="Cakes due each day, split by how far ahead they were booked">'+svg+'</svg>';
      sc.querySelectorAll('.cclt-hit').forEach(function(r){r.onclick=function(){state.selected=r.dataset.d;drawChart(w);showDay(state.selected);};});
      var todayX=40+gap(w.start,today)*bw;sc.scrollLeft=Math.max(0,todayX-sc.clientWidth+bw*(sc.clientWidth>=900?15:4));
    }

    function showDay(d){
      var x=ix.days[d],el=root.querySelector('.cclt-detail');
      if(!x){el.innerHTML='<h4>'+esc(pretty(d,{year:'numeric'}))+'</h4><p>No cakes for pickup.</p>';return;}
      var parts=BUCKETS.filter(function(b){return x.b[b.k];}).map(function(b){
        return '<li><i style="background:'+b.color+'"></i>'+x.b[b.k]+' booked '+esc(b.label.toLowerCase())+'</li>';}).join('');
      var cakes=Object.keys(x.cakes).sort(function(a,b){return x.cakes[b]-x.cakes[a]||a.localeCompare(b);}).map(function(n){
        return '<li><span>'+esc(n)+'</span><b>'+x.cakes[n]+'</b></li>';}).join('');
      el.innerHTML='<h4>'+esc(pretty(d,{year:'numeric'}))+(d>today?' <small>upcoming, booked so far</small>':d===today?' <small>today</small>':'')+'</h4>'+
        '<p class="cclt-big"><b>'+x.total+'</b> cake'+(x.total===1?'':'s')+' for pickup · '+x.orders+' order'+(x.orders===1?'':'s')+'</p>'+
        '<div class="cclt-cols"><div><h5>When they were booked</h5><ul class="cclt-parts">'+parts+'</ul></div>'+
        '<div><h5>Cakes</h5><ul class="cclt-cakes">'+cakes+'</ul></div></div>';
    }
    render();
    return {root:root,refresh:render};
  }
  global[NAME]={version:VERSION,mount:mount,_index:index};
})(typeof window!=='undefined'?window:globalThis);
