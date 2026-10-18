  /* Executive visuals: all figures derive from dashboard_register, no placeholder values. */
  function hbMPeriod() { return [7,30,90].indexOf(HB.period) >= 0 ? HB.period : 30; }
  function hbMDateList(end,n) {
    var r=[]; for(var i=n-1;i>=0;i--)r.push(addDays(end,-i)); return r;
  }
  function hbMSales(o) { return o && o.sale && !o.off && /^\d{4}-\d{2}-\d{2}$/.test(o.pd||''); }
  function hbMNet(o) { return Math.max(0,hbNum(o.net!=null?o.net:hbBookedValue(o))); }
  function hbMEmpty() { return '<div class="hb-m-empty">No data</div>'; }
  function hbMCard(title,body,note) {
    return '<section class="hb-m-card" aria-label="'+esc(title)+'"><header><h3>'+esc(title)+'</h3>'+
      (note?'<span class="hb-m-note">'+esc(note)+'</span>':'')+'</header>'+body+'</section>';
  }
  function hbMDelta(now,prior) {
    if(!prior)return '<span class="hb-m-delta hb-m-neutral">No prior baseline</span>';
    var pct=Math.round((now-prior)/prior*100);
    return '<span class="hb-m-delta '+(pct>=0?'hb-m-positive':'hb-m-negative')+'">'+
      (pct>0?'+':'')+pct+'% vs prior period</span>';
  }
  function hbMSpark(values) {
    var high=Math.max.apply(null,[1].concat(values)), count=values.length;
    var points=values.map(function(v,i){return (i*100/Math.max(1,count-1)).toFixed(1)+','+
      (33-v/high*28).toFixed(1);}).join(' ');
    return '<svg class="hb-m-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">'+
      '<polyline points="'+points+'"/></svg>';
  }
  function hbMKpi(label,value,delta,values) {
    return '<div class="hb-m-kpi"><span>'+esc(label)+'</span><strong>'+value+'</strong>'+
      (values&&values.length?hbMSpark(values):'')+(delta||'')+'</div>';
  }
  function hbMBarChart(rows,fmt,fill) {
    if(!rows.length || !rows.some(function(r){return r.v>0;})) return hbMEmpty();
    var max=Math.max.apply(null,rows.map(function(r){return r.v;})), W=680,H=200,baseline=159,plot=132;
    var step=632/rows.length, bw=Math.max(2,Math.min(26,step*.68));
    var grid=[0,.5,1].map(function(f){
      var y=baseline-f*plot;
      return '<line class="hb-m-grid" x1="38" x2="675" y1="'+y+'" y2="'+y+'"/>'+
        '<text class="hb-m-tick" text-anchor="end" x="31" y="'+(y+3)+'">'+
        esc(fmt(max*f))+'</text>';
    }).join('');
    var bars=rows.map(function(r,i){
      var h=r.v/max*plot,x=40+i*step+(step-bw)/2;
      return '<rect x="'+x.toFixed(1)+'" y="'+(baseline-h).toFixed(1)+'" width="'+bw.toFixed(1)+
        '" height="'+Math.max(0,h).toFixed(1)+'" rx="2" fill="'+(fill||'#4b6339')+'"><title>'+
        esc(r.l+': '+fmt(r.v))+'</title></rect>';
    }).join('');
    var xlabels=rows.map(function(r,i){
      if(i!==0 && i!==rows.length-1 && i%Math.max(1,Math.ceil(rows.length/7))!==0)return '';
      return '<text class="hb-m-tick" text-anchor="middle" x="'+(40+i*step+step/2).toFixed(1)+'" y="179">'+esc(r.short||r.l)+'</text>';
    }).join('');
    return '<svg class="hb-m-bars" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Daily trend bar chart">'+
      grid+bars+xlabels+'</svg>';
  }
  function hbMRank(rows) {
    rows=rows.filter(function(r){return r.v>0;});
    if(!rows.length)return hbMEmpty();
    var max=Math.max(1,rows[0].v);
    return '<div class="hb-m-ranks">'+rows.slice(0,6).map(function(r,i){
      return '<div class="hb-m-rank"><div class="hb-m-rank-label" title="'+esc(r.l)+'">'+esc(r.l)+'</div>'+
        '<div class="hb-m-rank-track"><i style="width:'+(r.v/max*100).toFixed(2)+'%"></i></div>'+
        '<strong>'+r.v.toLocaleString('en-US')+'</strong></div>';
    }).join('')+'</div>';
  }
  function hbMDoughnut(rows) {
    if(!rows.length)return hbMEmpty();
    var total=rows.reduce(function(n,r){return n+r.v;},0);
    if(!total)return hbMEmpty();
    if(rows.length>6)rows=rows.slice(0,5).concat([{l:'Other',v:rows.slice(5).reduce(function(n,r){return n+r.v;},0)}]);
    var colors=['#4b6339','#557fa0','#bf9a5c','#9a7b9f','#809a8d','#c77769'];
    var start=0,circ=2*Math.PI*36;
    var ring=rows.slice(0,6).map(function(r,i){
      var portion=r.v/total,segment=portion*circ;
      var el='<circle r="36" cx="50" cy="50" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="15"'+
        ' stroke-dasharray="'+Math.max(0,segment-.8)+' '+circ+'" stroke-dashoffset="'+(-start*circ)+'">'+
        '<title>'+esc(r.l+': '+r.v+' orders')+'</title></circle>';
      start+=portion;return el;
    }).join('');
    var legend=rows.slice(0,6).map(function(r,i){
      return '<div><i style="background:'+colors[i%colors.length]+'"></i><span>'+esc(r.l)+'</span>'+
        '<b>'+Math.round(r.v/total*100)+'%</b></div>';
    }).join('');
    return '<div class="hb-m-donut-wrap"><svg viewBox="0 0 100 100" class="hb-m-donut" role="img" aria-label="Order source proportions">'+
      '<g transform="rotate(-90 50 50)">'+ring+'</g><text x="50" y="48" text-anchor="middle">'+total+'</text>'+
      '<text x="50" y="60" text-anchor="middle" class="hb-m-center-label">orders</text></svg>'+
      '<div class="hb-m-legend">'+legend+'</div></div>';
  }
  function hbMView(data) {
    var p=hbMPeriod(),now=data.today,from=addDays(now,-(p-1)),before=addDays(from,-p),
      prevTo=addDays(from,-1),all=(DX.data.allOrders||DX.data.orders||[]),
      sold=all.filter(function(o){return hbMSales(o)&&o.pd>=from&&o.pd<=now;}),
      prev=all.filter(function(o){return hbMSales(o)&&o.pd>=before&&o.pd<=prevTo;}),
      revenue=sold.reduce(function(n,o){return n+hbMNet(o);},0),
      oldRevenue=prev.reduce(function(n,o){return n+hbMNet(o);},0),
      qty=hbCountCakes(sold),oldQty=hbCountCakes(prev),
      daily=hbMDateList(now,p),totals={},saleCount=sold.length;
    daily.forEach(function(d){totals[d]=0;});
    sold.forEach(function(o){totals[o.pd]+=hbMNet(o);});
    var coming=all.filter(function(o){
      return o.st==='confirmed'&&!o.off&&o.pd>=now&&o.pd<addDays(now,30);
    });
    var committed=coming.reduce(function(n,o){return n+hbBookedValue(o);},0),
      avg=saleCount?revenue/saleCount:0,oldAvg=prev.length?oldRevenue/prev.length:0;
    var kpis='<div class="hb-m-kpis">'+
      hbMKpi('Completed sales · '+p+'d',hbFjd(revenue),hbMDelta(revenue,oldRevenue),daily.map(function(d){return totals[d];}))+
      hbMKpi('Cakes sold · '+p+'d',qty.toLocaleString('en-US'),hbMDelta(qty,oldQty))+
      hbMKpi('Average completed order',saleCount?hbFjd(avg):'—',hbMDelta(avg,oldAvg))+
      hbMKpi('Confirmed · next 30d',hbFjd(committed),
        '<span class="hb-m-delta hb-m-neutral">'+coming.length+' orders due</span>')+'</div>';
    var periodBtns=[7,30,90].map(function(n){
      return '<button type="button" data-act="dx-hb-period" data-v="'+n+'" class="'+(p===n?'is-on':'')+
        '" aria-pressed="'+(p===n)+'">'+n+'d</button>';
    }).join('');
    var pastRows=daily.map(function(d){
      return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:totals[d]};
    });
    var futureDays=hbMDateList(addDays(now,29),30),fqty={};
    futureDays.forEach(function(d){fqty[d]=0;});
    coming.forEach(function(o){
      if(Object.prototype.hasOwnProperty.call(fqty,o.pd)){fqty[o.pd]+=hbCountCakes([o]);}
    });
    var demand=futureDays.map(function(d){return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:fqty[d]};});
    var mix={},chan={},leads=[0,0,0,0,0],leadNames=['0–1 day','2–3 days','4–7 days','8–14 days','15+ days'];
    sold.forEach(function(o){
      (o.it||[]).forEach(function(it){
        var name=String(it[1]||it[0]||'Unspecified cake'),n=Number(it[3])>0?Number(it[3]):1;
        mix[name]=(mix[name]||0)+n;
      });
      var source=String(o.src||'Unknown').replace(/_/g,' ');
      chan[source]=(chan[source]||0)+1;
    });
    all.filter(function(o){return hbActive(o)&&o.pd>=from&&o.pd<=now;}).forEach(function(o){
      var taken=hbOrderDate(o);if(!taken)return;
      var days=daysBetween(taken,o.pd);
      if(days<0)return;
      var idx=days<=1?0:days<=3?1:days<=7?2:days<=14?3:4;leads[idx]++;
    });
    var products=Object.keys(mix).map(function(k){return {l:k,v:mix[k]};}).sort(function(a,b){return b.v-a.v;});
    var sources=Object.keys(chan).map(function(k){return {l:k,v:chan[k]};}).sort(function(a,b){return b.v-a.v;});
    var leadRows=leadNames.map(function(n,i){return {l:n,v:leads[i]};});
    var periodToolbar='<div class="hb-m-header"><h3>Management overview</h3><div class="hb-v2-switch" role="group" aria-label="Reporting period">'+periodBtns+'</div></div>';
    return periodToolbar+kpis+
      '<div class="hb-m-visuals">'+
      hbMCard('Completed sales',''+hbMBarChart(pastRows,hbFjd,'#4b6339'),p+' days · FJD')+
      hbMCard('Confirmed cakes due',hbMBarChart(demand,function(v){return Math.round(v).toString();},'#668fa2'),'Next 30 days')+
      hbMCard('Top cakes',hbMRank(products),'Cakes sold · '+p+'d')+
      hbMCard('Sales by channel',hbMDoughnut(sources),'Completed orders · '+p+'d')+
      hbMCard('Booking lead time',hbMRank(leadRows.map(function(r){return {l:r.l,v:r.v};}).sort(function(a,b){return b.v-a.v;})),'Pickup dates · '+p+'d')+
      '</div>';
  }
