/* Corner Cafe Analytics V3
   All KPIs/graphs are derived from the staff-authorized dashboard_register.
   "Recorded" and "confirmed" are never equated with paid or completed sales.
   Installed inside the existing isolated Analytics bridge, not the CRM app bundle.
*/
  HB.metric='pickup_cakes';
  function hbKDay(d){return /^\d{4}-\d{2}-\d{2}$/.test(d||'')?d:'';}
  function hbKQty(o){return hbCountCakes([o]);}
  function hbKLive(o){return hbActive(o);}
  function hbKDue(o,day){return !!(o&&o.pd===day&&hbKLive(o)&& (day<=today()||o.st==='confirmed'));}
  function hbKActiveConfirmed(o){return o&&o.st==='confirmed'&&!o.off;}
  function hbKValue(o){return hbBookedValue(o);}
  function hbKCount(list){return list.reduce(function(n,o){return n+hbKQty(o);},0);}
  function hbKDays(to,n){var days=[];for(var i=n-1;i>=0;i--)days.push(addDays(to,-i));return days;}
  function hbKRows(orders,dates,dayKey,valueFn){var dict={};dates.forEach(function(d){dict[d]=0;});orders.forEach(function(o){var d=dayKey(o);if(Object.prototype.hasOwnProperty.call(dict,d))dict[d]+=valueFn(o);});return dates.map(function(d){return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:dict[d]};});}
  function hbKLabel(kind){
    return kind==='pickup_cakes'?'Cakes due':kind==='cakes'?'Cakes booked':kind==='orders'?'Orders booked':kind==='value'?'Booked value':'Recorded completed value';
  }
  function hbMetricLabel(){return hbKLabel(HB.metric);}
  function hbMetricFormat(v){return HB.metric==='value'||HB.metric==='sales'?hbFjd(v):String(Math.round(v));}
  function hbKTimelineValue(row,kind){
    if(kind==='pickup_cakes')return row.day>today()?hbKCount(row.pickups.filter(hbKActiveConfirmed)):hbKCount(row.pickups.filter(hbKLive));
    if(kind==='sales')return row.pickups.filter(function(o){return o.st==='completed'&&o.cp==='recorded';}).reduce(function(n,o){return n+hbKValue(o);},0);
    if(kind==='value')return row.value;
    if(kind==='cakes')return row.cakes;
    return row.orders;
  }
  function hbKStats(orders,when,period){
    var start=addDays(when,1-period),prevStart=addDays(start,-period),prevEnd=addDays(start,-1);
    var current=orders.filter(function(o){var d=hbOrderDate(o);return hbKLive(o)&&d&&d>=start&&d<=when;});
    var previous=orders.filter(function(o){var d=hbOrderDate(o);return hbKLive(o)&&d&&d>=prevStart&&d<=prevEnd;});
    var next=orders.filter(function(o){return hbKActiveConfirmed(o)&&o.pd>=when&&o.pd<addDays(when,30);});
    var due=orders.filter(function(o){return hbKLive(o)&&o.pd>=when&&o.pd<addDays(when,30);});
    var completed=orders.filter(function(o){return o.st==='completed'&&o.cp==='recorded'&&o.pd>=start&&o.pd<=when;});
    var unresolved=orders.filter(function(o){return hbKLive(o)&&!hbOrderDate(o);}).length;
    return {start:start,period:period,now:when,current:current,previous:previous,next:next,due:due,completed:completed,unresolved:unresolved};
  }
  function hbKDelta(now,prior,units){
    if(!prior)return '<span class="hb-m-delta hb-m-neutral">'+(now>0?'New vs previous '+esc(units):'No prior-period activity')+'</span>';
    var p=Math.round(100*(now-prior)/prior);
    return '<span class="hb-m-delta '+(p>0?'hb-m-positive':p<0?'hb-m-negative':'hb-m-neutral')+'">'+
      (p>0?'+':'')+p+'% vs previous '+units+'</span>';
  }
  function hbKCard(t,v,meta,type,color){
    return '<article class="hb-k-kpi hb-k-'+color+'"><div class="hb-k-top"><span>'+esc(t)+'</span><i class="hb-k-pip"></i></div>'+
      '<strong>'+v+'</strong><div class="hb-k-caption">'+(meta||'')+'</div></article>';
  }
  function hbKPanel(title,body,note,cls){
    return '<section class="hb-k-panel '+(cls||'')+'"><header><h3>'+esc(title)+'</h3>'+
      (note?'<span>'+esc(note)+'</span>':'')+'</header>'+body+'</section>';
  }
  function hbKRankFrom(items,namer){
    var tally={};items.forEach(function(o){var key=namer(o);if(key){key=String(key).replace(/_/g,' ');tally[key]=(tally[key]||0)+1;}});
    return Object.keys(tally).map(function(k){return {l:k,v:tally[k]};}).sort(function(a,b){return b.v-a.v;});
  }
  function hbKTopCakes(list){
    var tally={};
    list.forEach(function(o){(o.it||[]).forEach(function(item){
      var label=String(item[1]||item[0]||'Cake').trim(),qty=Number(item[3])>0?Number(item[3]):1;
      if(label)tally[label]=(tally[label]||0)+qty;
    });});
    return Object.keys(tally).map(function(n){return {l:n,v:tally[n]};}).sort(function(a,b){return b.v-a.v;});
  }
  function hbKDayRank(orders){
    var names=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],values=[0,0,0,0,0,0,0];
    orders.forEach(function(o){var k=(new Date(o.pd+'T12:00:00Z').getUTCDay()+6)%7;values[k]+=hbKQty(o);});
    return names.map(function(x,i){return {l:x,v:values[i]};});
  }
  function hbKPercent(a,b){return b?Math.round(100*a/b)+'%':'—';}
  function hbKLegend(){
    return '<span class="hb-k-legend"><i></i>Measured cakes &amp; orders from CRM</span>';
  }
  function hbMView(data){
    var p=hbMPeriod(),orders=(DX.data&&DX.data.orders)||[],s=hbKStats(orders,data.today,p),
      cur=s.current,prev=s.previous,up=s.next,du=s.due,
      nowVal=cur.reduce(function(n,o){return n+hbKValue(o);},0),
      pastVal=prev.reduce(function(n,o){return n+hbKValue(o);},0),
      confirmedVal=up.reduce(function(n,o){return n+hbKValue(o);},0),
      bookedCakes=hbKCount(cur),priorCakes=hbKCount(prev),
      prevOrders=prev.length,
      dates=hbKDays(data.today,p),
      dueDates=hbKDays(addDays(data.today,29),30),
      bookedDaily=hbKRows(cur,dates,function(o){return hbOrderDate(o);},function(o){return hbKQty(o);}),
      dueDaily=hbKRows(up,dueDates,function(o){return o.pd;},function(o){return hbKQty(o);}),
      avgDays=cur.map(function(o){return daysBetween(hbOrderDate(o),o.pd);}).filter(function(n){return n>=0&&n<10000;}),
      avgLead=avgDays.length?Math.round(avgDays.reduce(function(a,b){return a+b;},0)/avgDays.length):null,
      topCakes=hbKTopCakes(up.length?up:cur),
      sources=hbKRankFrom(up.length?up:cur,function(o){return o.src||o.sys||'Unknown';}),
      buckets=[0,0,0,0,0],
      oldVerified=cur.length, upcomingOcc=hbKRankFrom(up,function(o){
        var code=o.oc||'not_specified',arr=DX.data.occasions||[],hit=arr.find(function(e){return e.c===code;});
        return hit?hit.l:(code==='not_specified'?'Not specified':code);
      });
    cur.forEach(function(o){var days=daysBetween(hbOrderDate(o),o.pd);if(days<0)return;buckets[days<=1?0:days<=3?1:days<=7?2:days<=14?3:4]++;});
    var periods=[7,30,90].map(function(n){return '<button type="button" data-act="dx-hb-period" data-v="'+n+
      '" class="'+(n===p?'is-on':'')+'" aria-pressed="'+(n===p)+'">'+n+' days</button>';}).join('');
    var kpis='<div class="hb-k-kpis">'+
      hbKCard('Cakes booked',bookedCakes.toLocaleString('en-US'),hbKDelta(bookedCakes,priorCakes,p+' days'),'count','green')+
      hbKCard('Orders received',cur.length.toLocaleString('en-US'),hbKDelta(cur.length,prevOrders,p+' days'),'count','purple')+
      hbKCard('Estimated booking value',hbFjd(nowVal),hbKDelta(nowVal,pastVal,p+' days'),'money','pink')+
      hbKCard('Confirmed cakes due',hbKCount(up).toLocaleString('en-US'),up.length+' confirmed orders · next 30 days','count','blue')+
      hbKCard('Confirmed order value',hbFjd(confirmedVal),'Next 30 days · not yet collected','money','teal')+
      hbKCard('Average lead time',avgLead==null?'—':avgLead+' days',avgLead==null?'No verified booking dates':oldVerified+' bookings · booking to pickup','time','amber')+
      '</div>';
    var lead=['0–1 day','2–3 days','4–7 days','8–14 days','15+ days'].map(function(n,i){return {l:n,v:buckets[i]};}).sort(function(a,b){return b.v-a.v;});
    var group=hbKDayRank(up),pipeline=[
      {l:'Confirmed',v:up.length},
      {l:'Other active',v:Math.max(0,du.length-up.length)}
    ];
    var mixScope=up.length?'Confirmed · next 30 days':'Bookings · selected period';
    var panels='<div class="hb-k-panels">'+
      hbKPanel('Cakes booked by day',hbMBarChart(bookedDaily,function(v){return String(Math.round(v));},'#72a26c'),p+' days · booking date','hb-k-wide')+
      hbKPanel('Cakes due for collection',hbMBarChart(dueDaily,function(v){return String(Math.round(v));},'#6091b7'),'Next 30 days · confirmed orders','hb-k-wide')+
      hbKPanel('Popular cake types',hbMRank(topCakes),mixScope,'')+
      hbKPanel('Booking channels',hbMDoughnut(sources),mixScope,'')+
      hbKPanel('Booking lead time',hbMRank(lead),p+' days · booking to pickup','')+
      hbKPanel('Demand by weekday',hbMBarChart(group,function(v){return String(Math.round(v));},'#a678a9'),'Next 30 days · confirmed cakes','hb-k-half')+
      hbKPanel('Confirmed vs other orders',hbMRank(pipeline),'Next 30 days · active orders','hb-k-half')+
      hbKPanel('Upcoming occasions',hbMRank(upcomingOcc),'Next 30 days · confirmed orders','hb-k-half')+
      '</div>';
    var notices=(!s.completed.length?
      '<span class="hb-k-note">No completed orders recorded in this period · bookings are not counted as sales.</span>':
      '<span class="hb-k-note">'+s.completed.length+' completed orders recorded · not the same as payments collected.</span>')+
      (s.unresolved?'<span class="hb-k-note">'+s.unresolved+' records have unverified booking dates; excluded from bookings-by-date.</span>':'');
    return '<div class="hb-k-heading"><div><h3>Performance snapshot</h3><p>Bookings, cake demand and product trends</p></div>'+
      '<div class="hb-v2-switch" role="group" aria-label="Reporting period">'+periods+'</div></div>'+
      kpis+panels+'<div class="hb-k-notices">'+notices+'</div>';
  }
  function hbKMonthOptions(now){
    var yr=Number(now.slice(0,4)),mo=Number(now.slice(5,7)),endYear=Math.max(yr,2027),endMonth=yr>2027?12:12,html='';
    for(var y=Math.max(2024,yr-2);y<=endYear;y++)for(var m=1;m<=12;m++){
      var iso=y+'-'+String(m).padStart(2,'0');
      if(iso>String(endYear)+'-'+String(endMonth).padStart(2,'0'))continue;
      var label=new Date(iso+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'});
      html+='<option value="'+iso+'"'+((HB.focusMonth||now.slice(0,7))===iso?' selected':'')+'>'+esc(label)+'</option>';
    }
    return html;
  }
  function hbChart(data){
    var rows=data.rows,kind=HB.metric,step=98,w=rows.length*step,bottom=160,top=22,now=data.today;
    var due=rows.map(function(r){return hbKTimelineValue(r,'pickup_cakes');});
    var booked=rows.map(function(r){return r.day<=now?r.cakes:null;});
    var vals=rows.map(function(r){return hbKTimelineValue(r,kind);});
    if(kind!=='pickup_cakes'&&kind!=='flow')vals=vals.map(function(v,i){return rows[i].day<=now?v:null;});
    function cumulative(list){var total=0;return list.map(function(v){if(v==null)return null;total+=v;return total;});}
    if(HB.mode==='cumulative'){due=cumulative(due);booked=cumulative(booked);vals=cumulative(vals);}
    var main=kind==='flow'?due:(kind==='pickup_cakes'?due:vals);
    var series=kind==='flow'?[main,booked]:[main];
    var max=Math.max(1,...series.flat().filter(function(v){return v!=null;}));
    function y(v){return bottom-v/max*(bottom-top);}
    function line(list){var d='',on=false;rows.forEach(function(r,i){var v=list[i];if(v==null){on=false;return;}d+=(on?'L':'M')+(i*step+step/2)+' '+y(v).toFixed(1)+' ';on=true;});return d.trim();}
    var grid=[0,.5,1].map(function(f){var z=Math.round(max*f*10)/10,yy=y(max*f);return '<line x1="0" x2="'+w+'" y1="'+yy+'" y2="'+yy+'" class="hb-v2-grid"/><text x="6" y="'+(yy-6)+'" class="hb-k-axis">'+(kind==='value'||kind==='sales'?hbFjd(z):z)+'</text>';}).join('');
    var labels=rows.map(function(r,i){var cx=i*step+step/2,one=main[i],two=kind==='flow'?booked[i]:null;
      var tip=hbDateTitle(r.day)+': '+r.cakes+' cakes booked; '+hbKTimelineValue(r,'pickup_cakes')+' cakes due'+(r.day>now?' (confirmed only)':'');
      function dot(v,cls){return v==null?'':'<circle cx="'+cx+'" cy="'+y(v)+'" r="3.5" class="'+cls+'"><title>'+esc(tip)+'</title></circle>';}
      return dot(one,r.day>now?'hb-k-dot-future':'hb-v2-dot')+(kind==='flow'?dot(two,'hb-k-dot-booked'):'')+
      '<text x="'+cx+'" y="186" text-anchor="middle" class="hb-v2-axis-label">'+(+r.day.slice(8))+' '+esc(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+r.day.slice(5,7)-1])+'</text>';
    }).join('');
    return '<svg class="hb-v2-chart-svg hb-k-curve" viewBox="0 0 '+w+' 192" width="'+w+'" height="192" role="img" aria-label="'+esc(kind==='flow'?'Solid green cakes due by collection date, dashed purple cakes booked by booking date':hbKLabel(kind))+'">'+grid+
      '<path d="'+line(main)+'" class="hb-k-line"/>'+(kind==='flow'?'<path d="'+line(booked)+'" class="hb-k-line-booked"/>':'')+labels+'</svg>';
  }
