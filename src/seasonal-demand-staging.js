/* Corner Cafe seasonal demand - staging only.
   Pure calculations use the approved, permission-scoped dashboard_register payload.
   No database writes, no automatic production mount, no external network requests.
*/
(function (global) {
  'use strict';
  var VERSION='2026-10-19-stage-v2', DAY=86400000;
  if(global.CCCakeSeasonalStage&&global.CCCakeSeasonalStage.version===VERSION)return;
  function iso(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d+'T12:00:00Z'))?d:'';}
  function utc(d){return new Date(d+'T12:00:00Z').getTime();}
  function add(d,n){return new Date(utc(d)+n*DAY).toISOString().slice(0,10);}
  function diff(a,b){return Math.round((utc(b)-utc(a))/DAY);}
  function sum(a){return a.reduce(function(t,n){return t+n;},0);}
  function cakes(o){
    var it=Array.isArray(o.it)?o.it:[];
    if(!it.length)return 1;
    return it.reduce(function(n,i){var q=Number(i&&i[3]);return n+(Number.isFinite(q)&&q>0?q:1);},0);
  }
  function normalize(input,today){
    var validToday=iso(today);
    return (Array.isArray(input)?input:[]).filter(function(o){
      return o&&o.off!==true&&['cancelled','declined','not_confirmed'].indexOf(o.st)<0;
    }).map(function(o){
      var pd=iso(o.pd),od=iso(o.od);
      return {pd:pd,od:od,booked:!!(o.odok===true&&od&&pd&&od<=pd&&od<=validToday),
        qty:cakes(o),st:o.st||'unknown',source:o.sys||o.src||''};
    }).filter(function(o){return !!o.pd;});
  }
  function coverage(orders){
    var dates=[];
    orders.forEach(function(o){dates.push(o.pd);if(o.booked)dates.push(o.od);});
    return dates.length?dates.sort()[0]:null;
  }
  function monthSeries(raw,month,today){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month');
    var now=iso(today),rows=normalize(raw,now),days=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).getUTCDate();
    var first=coverage(rows),booked=[],due=[],dates=[],known=0;
    for(var i=1;i<=days;i++){
      var day=month+'-'+String(i).padStart(2,'0');
      dates.push(day);
      if(first&&day>=first&&day<=now){
        booked.push(sum(rows.filter(function(o){return o.booked&&o.od===day;}).map(function(o){return o.qty;})));
        known++;
      }else booked.push(null);
      if(first&&day>=first){
        due.push(sum(rows.filter(function(o){return o.pd===day&&(day<=now||o.st==='confirmed');}).map(function(o){return o.qty;})));
      }else due.push(null);
    }
    return {month:month,days:dates,booked:booked,due:due,knownBookingDays:known,firstDate:first,
      bookedCakes:sum(booked.filter(function(x){return x!==null;})),
      dueCakes:sum(due.filter(function(x){return x!==null;})),
      unverifiable:rows.filter(function(o){return !o.booked&&o.pd.slice(0,7)===month;}).length};
  }
  function eventSummary(raw,target,today){
    if(!iso(target))throw Error('Invalid event date');
    var now=iso(today),orders=normalize(raw,now),year=+target.slice(0,4),mmdd=target.slice(5);
    var thresholds=[90,60,30,14,7,0],lines=[];
    // The pickup window is a proxy, not proof of an occasion label.
    for(var y=Math.max(2024,year-3);y<=year;y++){
      var center=String(y)+'-'+mmdd;
      if(!iso(center))continue;
      var selected=orders.filter(function(o){
        return o.pd>=add(center,-3)&&o.pd<=add(center,2)&&
          (o.pd<=now||o.st==='confirmed');
      });
      var verified=selected.filter(function(o){return o.booked;});
      var counts=thresholds.map(function(t){
        var cutoff=add(center,-t);
        return cutoff>now?null:sum(verified.filter(function(o){return o.od<=cutoff;}).map(function(o){return o.qty;}));
      });
      var lead=verified.map(function(o){return diff(o.od,o.pd);}).sort(function(a,b){return a-b;});
      var median=lead.length?(lead[Math.floor((lead.length-1)/2)]+lead[Math.floor(lead.length/2)])/2:null;
      lines.push({year:y,center:center,counts:counts,pickupCakes:sum(selected.map(function(o){return o.qty;})),
        verifiedOrders:verified.length,unverified:selected.length-verified.length,medianLeadDays:median});
    }
    return {target:target,thresholds:thresholds,lines:lines,
      definition:'Pickup dates from 3 days before to 2 days after the selected occasion date. This does not establish the customer’s actual occasion.'};
  }
  function escapeHTML(v){return String(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
  function fmtMonth(d){return new Date(d+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});}
  function svgSeries(data){
    var xs=data.days.length,w=800,h=205,ox=42,oy=17,cw=w-62,ch=h-53;
    var max=Math.max(1,...data.booked.filter(function(x){return x!==null;}),...data.due.filter(function(x){return x!==null;}));
    function px(i){return ox+(xs<2?0:i*cw/(xs-1));}
    function py(v){return oy+ch-(v/max)*ch;}
    function paths(values){
      var seg=[],p='',on=false;
      values.forEach(function(v,i){
        if(v===null){on=false;return;}
        p+=(on?' L':' M')+px(i).toFixed(1)+' '+py(v).toFixed(1);on=true;
      });
      return p.trim();
    }
    var grid=[0,0.5,1].map(function(f){
      var y=py(max*f),v=Math.round(max*f*10)/10;
      return '<line x1="'+ox+'" y1="'+y+'" x2="'+(w-20)+'" y2="'+y+'" stroke="#e7ecea"/>'+
        '<text x="4" y="'+(y+4)+'" font-size="11" fill="#64748b">'+v+'</text>';
    }).join('');
    var ticks=data.days.map(function(d,i){
      if(i%5&&i!==data.days.length-1)return '';
      return '<text x="'+px(i)+'" y="197" text-anchor="middle" font-size="10" fill="#6b7482">'+Number(d.slice(8))+'</text>';
    }).join('');
    return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Solid green shows cakes due on the collection date. Dashed purple shows cakes booked on the booking date. No future bookings are predicted." style="display:block;width:100%;min-width:480px;height:auto">'+grid+
      '<path d="'+paths(data.due)+'" fill="none" stroke="#458c68" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+paths(data.booked)+'" fill="none" stroke="#955ca1" stroke-width="3.2" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>'+ticks+'</svg>';
  }
  function paceTable(summary){
    var h='<table class="ccsd-table"><thead><tr><th scope="col">Season</th>';
    summary.thresholds.forEach(function(v){h+='<th scope="col">'+(v===0?'By event day':'By D−'+v)+'</th>';});
    h+='</tr></thead><tbody>';
    summary.lines.forEach(function(row){
      h+='<tr><th scope="row">'+row.year+'</th>';
      row.counts.forEach(function(v){h+='<td>'+(v===null?'Not yet':v)+'</td>';});
      h+='</tr>';
    });
    return h+'</tbody></table>';
  }
  function mount(host,orders,options){
    if(!host||typeof host.querySelector!=='function')return false;
    var existing=host.querySelector('#cc-seasonal-demand-staging');
    if(existing)return false;
    var now=iso(options&&options.today)||new Date().toISOString().slice(0,10);
    var currentMonth=now.slice(0,7),container=host.ownerDocument.createElement('section');
    container.id='cc-seasonal-demand-staging';
    container.className='ccsd';
    container.innerHTML='<div class="ccsd-head"><div><h3>Cake demand & seasonal booking pace</h3><p>When customers book versus when cakes are due for pickup.</p></div>'+
      '<label class="ccsd-control">Month <input class="ccsd-month" type="month" min="2024-01" max="2027-12" value="'+currentMonth+'"></label></div>'+
      '<div class="ccsd-legend"><span><i class="ccsd-due"></i> Solid green — cakes due</span><span><i class="ccsd-booked"></i> Dashed purple — cakes booked</span></div>'+
      '<div class="ccsd-figure" tabindex="0"></div><p class="ccsd-footnote"></p>'+
      '<div class="ccsd-head ccsd-season-head"><div><h4>Seasonal booking buildup</h4><p>How far ahead cakes are booked for pickup dates near an occasion.</p></div>'+
      '<label class="ccsd-control">Occasion date <input class="ccsd-event" type="date" min="2024-01-01" max="2027-12-31" value="'+now.slice(0,4)+'-12-25"></label></div>'+
      '<div class="ccsd-pace"></div><p class="ccsd-footnote">Occasion windows use pickup dates (−3 to +2 days), not verified customer occasion tags. Historical submissions are not proof of completed sales.</p>';
    host.appendChild(container);
    var month=container.querySelector('.ccsd-month'),event=container.querySelector('.ccsd-event');
    function drawMonth(){var data=monthSeries(orders,month.value,now);
      container.querySelector('.ccsd-figure').innerHTML=svgSeries(data);
      var msg='Selected month: '+fmtMonth(data.month)+'. '+data.bookedCakes+' cakes booked on verified booking dates; '+data.dueCakes+' cakes due for pickup.';
      msg+=' Future bookings are unknown; future pickups show confirmed orders only.';
      if(data.unverifiable)msg+=' '+data.unverifiable+' pickup-date records do not have a verified booking date.';
      if(!data.firstDate||data.month+'-01'<data.firstDate)msg+=' Historical data coverage begins '+(data.firstDate||'on an unknown date')+'.';
      container.querySelector('.ccsd-footnote').textContent=msg;
    }
    function drawPace(){var data=eventSummary(orders,event.value,now);
      container.querySelector('.ccsd-pace').innerHTML=paceTable(data);
    }
    month.addEventListener('change',drawMonth);
    event.addEventListener('change',drawPace);
    drawMonth();drawPace();return true;
  }
  global.CCCakeSeasonalStage={version:VERSION,normalize:normalize,monthSeries:monthSeries,eventSummary:eventSummary,mount:mount};
})(typeof window!=='undefined'?window:globalThis);
