/* Corner Cafe seasonal demand - staging only.
   Pure calculations use the approved, permission-scoped dashboard_register payload.
   No database writes, no automatic production mount, no external network requests.
*/
(function (global) {
  'use strict';
  var VERSION='2026-10-19-refined-v3', DAY=86400000, selections={month:null,event:null};
  if(global.CCCakeSeasonalStage&&global.CCCakeSeasonalStage.version===VERSION)return;
  function iso(d){if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return '';var t=Date.parse(d+'T12:00:00Z');return isNaN(t)||new Date(t).toISOString().slice(0,10)!==d?'':d;}
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
    var first=coverage(rows),bookStart=rows.filter(function(o){return o.booked;}).map(function(o){return o.od;}).sort()[0]||null,booked=[],due=[],dates=[],known=0;
    for(var i=1;i<=days;i++){
      var day=month+'-'+String(i).padStart(2,'0');
      dates.push(day);
      if(bookStart&&day>=bookStart&&day<=now){
        booked.push(sum(rows.filter(function(o){return o.booked&&o.od===day;}).map(function(o){return o.qty;})));
        known++;
      }else booked.push(null);
      if(first&&day>=first){
        due.push(sum(rows.filter(function(o){return o.pd===day&&(day<=now||o.st==='confirmed');}).map(function(o){return o.qty;})));
      }else due.push(null);
    }
    return {month:month,days:dates,booked:booked,due:due,knownBookingDays:known,firstDate:first,firstBookedDate:bookStart,
      bookedCakes:sum(booked.filter(function(x){return x!==null;})),
      dueCakes:sum(due.filter(function(x){return x!==null;})),
      unverifiable:rows.filter(function(o){return !o.booked&&o.pd.slice(0,7)===month;}).length};
  }
  function eventSummary(raw,target,today){
    if(!iso(target))throw Error('Invalid event date');
    var now=iso(today),orders=normalize(raw,now),year=+target.slice(0,4),mmdd=target.slice(5),firstBookedDate=orders.filter(function(o){return o.booked;}).map(function(o){return o.od;}).sort()[0]||null;
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
        return cutoff>now||!firstBookedDate||cutoff<firstBookedDate?null:sum(verified.filter(function(o){return o.od<=cutoff;}).map(function(o){return o.qty;}));
      });
      var lead=verified.map(function(o){return diff(o.od,o.pd);}).sort(function(a,b){return a-b;});
      var median=lead.length?(lead[Math.floor((lead.length-1)/2)]+lead[Math.floor(lead.length/2)])/2:null;
      lines.push({year:y,center:center,counts:counts,pickupCakes:sum(selected.map(function(o){return o.qty;})),
        verifiedOrders:verified.length,unverified:selected.length-verified.length,medianLeadDays:median,partial:thresholds.some(function(t){return !firstBookedDate||add(center,-t)<firstBookedDate;})});
    }
    return {target:target,thresholds:thresholds,lines:lines,
      firstBookedDate:firstBookedDate,definition:'Pickup dates from 3 days before to 2 days after the selected occasion date. This does not establish the customer’s actual occasion.'};
  }
  function escapeHTML(v){return String(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
  function fmtMonth(d){return new Date(d+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});}
  function svgSeries(data,plotWidth,today){
    var n=data.days.length,w=Math.max(670,Math.round(plotWidth||800)),h=208;
    var left=48,top=16,chartWidth=w-70,chartHeight=150;
    var nums=data.booked.concat(data.due).filter(function(v){return v!==null;});
    var highest=Math.max(1,Math.max.apply(null,nums));
    var tickStep=Math.max(1,Math.ceil(highest/4)),axisMax=tickStep*4;
    function px(i){return left+(n<2?0:i*chartWidth/(n-1));}
    function py(v){return top+chartHeight*(1-v/axisMax);}
    function path(values){var out='',drawing=false;values.forEach(function(v,i){
      if(v===null){drawing=false;return;}
      out+=(drawing?' L':' M')+px(i).toFixed(1)+' '+py(v).toFixed(1);
      drawing=true;
    });return out.trim();}
    var grid=[0,1,2,3,4].map(function(i){
      var val=i*tickStep,y=py(val);
      return '<line x1="'+left+'" y1="'+y+'" x2="'+(w-18)+'" y2="'+y+'" stroke="#e5ece8"/>'+
        '<text x="7" y="'+(y+4)+'" font-size="12" fill="#657769">'+val+'</text>';
    }).join('');
    var todayMark='';
    if(data.days.indexOf(today)>=0){var ti=data.days.indexOf(today),x=px(ti);
      todayMark='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(top+chartHeight)+'" stroke="#7798ad" stroke-dasharray="3 5"/>'+
        '<text x="'+x+'" y="10" text-anchor="middle" font-size="11" font-weight="700" fill="#597b96">Today</text>';
    }
    var ticks=data.days.map(function(d,i){
      if(i%5&&i!==n-1)return '';
      return '<text x="'+px(i)+'" y="196" text-anchor="middle" font-size="11" fill="#6d7e72">'+Number(d.slice(8))+'</text>';
    }).join('');
    var step=chartWidth/Math.max(1,n-1);
    var hits=data.days.map(function(d,i){
      var booked=data.booked[i],due=data.due[i],tip=d+': ';
      tip+=booked===null?'Bookings not yet known':booked+' cakes booked on this date';
      tip+='; '+(due===null?'No pickup coverage':due+' cakes due for pickup');
      if(d>today)tip+=' (confirmed future pickups only)';
      var x=px(i)-step/2,width=step;
      return '<rect class="ccsd-hit" x="'+x.toFixed(1)+'" y="'+top+'" width="'+width.toFixed(1)+'" height="'+chartHeight+'" fill="transparent" tabindex="0" aria-label="'+escapeHTML(tip)+'"><title>'+escapeHTML(tip)+'</title></rect>';
    }).join('');
    return '<svg class="ccsd-svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="Daily cakes booked on their booking date (purple dashed), versus cakes due for collection (green solid). The booking line stops today.">'+
      grid+todayMark+
      '<path d="'+path(data.due)+'" fill="none" stroke="#458c68" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+path(data.booked)+'" fill="none" stroke="#955ca1" stroke-width="3.2" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>'+
      ticks+hits+'</svg>';
  }
  function paceTable(summary){
    var h='<table class="ccsd-table"><thead><tr><th scope="col">Season</th>';
    summary.thresholds.forEach(function(v){h+='<th scope="col">'+(v===0?'By occasion':'D−'+v)+'</th>';});
    h+='<th scope="col">Cakes due</th><th scope="col">Median lead</th></tr></thead><tbody>';
    summary.lines.forEach(function(row){
      h+='<tr><th scope="row">'+row.year+(row.partial?' <small title="Earlier verified booking history is incomplete">†</small>':'')+'</th>';
      row.counts.forEach(function(v){h+='<td>'+(v===null?'—':v)+'</td>';});
      h+='<td>'+row.pickupCakes+'</td><td>'+(row.medianLeadDays==null?'—':row.medianLeadDays+'d')+'</td></tr>';
    });
    return h+'</tbody></table>';
  }
  function mount(host,orders,options){
    if(!host||typeof host.querySelector!=='function')return false;
    if(host.querySelector('#cc-seasonal-demand-staging'))return false;
    var now=iso(options&&options.today)||new Date().toISOString().slice(0,10);
    var currentMonth=selections.month||now.slice(0,7),eventDate=selections.event||now.slice(0,4)+'-12-25';
    var container=host.ownerDocument.createElement('section');
    container.id='cc-seasonal-demand-staging';
    container.className='ccsd';
    container.innerHTML=
      '<section class="ccsd-daily" aria-label="Daily cakes booked and due"><div class="ccsd-head"><div><h3>Daily cake demand</h3>'+
      '<p>Compare the date customers booked with the date cakes are needed.</p></div>'+
      '<label class="ccsd-control">Month <input class="ccsd-month" type="month" min="2024-01" max="2027-12" value="'+currentMonth+'"></label></div>'+
      '<div class="ccsd-legend"><span><i class="ccsd-due"></i> Cakes due for collection</span>'+
      '<span><i class="ccsd-booked"></i> Cakes booked on this date</span></div>'+
      '<div class="ccsd-figure" tabindex="0"></div><p class="ccsd-daily-note" aria-live="polite"></p></section>'+
      '<section class="ccsd-season" aria-label="Seasonal booking buildup"><div class="ccsd-head"><div><h3>Seasonal booking buildup</h3>'+
      '<p>Cakes booked by each checkpoint for pickups near an occasion.</p></div>'+
      '<label class="ccsd-control">Occasion date <input class="ccsd-event" type="date" min="2024-01-01" max="2027-12-31" value="'+eventDate+'"></label></div>'+
      '<div class="ccsd-pace"></div><p class="ccsd-season-note">Cumulative cakes booked by each checkpoint. A dash means the checkpoint has not occurred or reliable history is unavailable; it does not mean zero. Pickup window: 3 days before to 2 days after the selected date. This does not establish the customer’s occasion. † Partial historical coverage. Historical bookings are not proof of completed sales.</p></section>';
    var main=host.querySelector('.hb-v2'),oldChart=main&&main.querySelector('.hb-v2-tools');
    if(oldChart)oldChart.parentNode.insertBefore(container,oldChart);
    else host.appendChild(container);
    var month=container.querySelector('.ccsd-month'),event=container.querySelector('.ccsd-event');
    function drawMonth(){
      var data=monthSeries(orders,month.value,now);
      var plot=container.querySelector('.ccsd-figure'),width=Math.max(670,plot.clientWidth-24||850);
      plot.innerHTML=svgSeries(data,width,now);
      var msg=fmtMonth(data.month)+': '+data.bookedCakes+' cakes booked on verified booking dates; '+data.dueCakes+' cakes due for pickup.';
      msg+=' Bookings after today are unknown. Future pickups include confirmed orders only.';
      if(data.unverifiable)msg+=' '+data.unverifiable+' pickup-date records lack a verified booking date.';
      if(!data.firstBookedDate||data.month+'-01'<data.firstBookedDate)msg+=' Earliest verified booking date: '+(data.firstBookedDate||'not available')+'.';
      container.querySelector('.ccsd-daily-note').textContent=msg;
    }
    function drawPace(){
      var data=eventSummary(orders,event.value,now);
      container.querySelector('.ccsd-pace').innerHTML=paceTable(data);
    }
    try{
      month.addEventListener('change',function(){selections.month=month.value;drawMonth();});
      event.addEventListener('change',function(){selections.event=event.value;drawPace();});
      drawMonth();drawPace();
      if(main)main.classList.add('ccsd-consolidated');
    }catch(err){container.remove();throw err;}
    return true;
  }
  global.CCCakeSeasonalStage={version:VERSION,normalize:normalize,monthSeries:monthSeries,eventSummary:eventSummary,mount:mount};
})(typeof window!=='undefined'?window:globalThis);
