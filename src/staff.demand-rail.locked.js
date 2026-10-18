/* Corner Cafe Cake CRM — PROTECTED Daily Cake Demand Rail v1.
 * Invariant: never replace the base CRM, management KPIs, or seasonal pace.
 * Horizontally scrollable daily bookings (purple dashed) versus scheduled pickups
 * (solid green), across 2024-01-01..2027-12-31, with a bounded DOM window.
 * Consumer: management Analytics addon, after CCCakeSeasonalStage.mount succeeds.
 * Source: staff-authorized dashboard_register orders already passed to the addon.
 * Changes require contract tests and approval (see docs/ANALYTICS_MODULE_LOCK.md).
 */
(function(global){
  'use strict';
  var NAME='CCCakeDemandRail', VERSION='1.0.0', MIN='2024-01-01', MAX='2027-12-31';
  var DAY=86400000, STEP=100, PAD=12, MAX_VISIBLE=62;
  if(global[NAME]&&global[NAME].version===VERSION)return;
  var saved={center:null,selected:null};
  function stamp(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
    !isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(Date.parse(d+'T12:00:00Z')).toISOString().slice(0,10)===d?d:'';}
  function dateTime(d){return Date.parse(d+'T12:00:00Z');}
  function add(d,n){return new Date(dateTime(d)+n*DAY).toISOString().slice(0,10);}
  function gap(a,b){return Math.round((dateTime(b)-dateTime(a))/DAY);}
  function clamp(n,lo,hi){return Math.max(lo,Math.min(n,hi));}
  function safe(s){return String(s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
  function pretty(d){return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
  function monthLabel(d){return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});}
  function monthOptions(month){
    var html='';
    for(var year=2024;year<=2027;year++)for(var m=1;m<=12;m++){
      var x=year+'-'+String(m).padStart(2,'0'),d=x+'-01';
      html+='<option value="'+x+'"'+(x===month?' selected':'')+'>'+safe(monthLabel(d))+'</option>';
    }
    return html;
  }
  function indexOrders(raw,today,normalizer){
    var normalized=normalizer(raw,today),booked=Object.create(null),due=Object.create(null);
    var bookOrders=Object.create(null),dueOrders=Object.create(null),firstBooked=null,firstDue=null;
    normalized.forEach(function(o){
      if(o.booked&&stamp(o.od)&&o.od>=MIN&&o.od<=today){
        booked[o.od]=(booked[o.od]||0)+o.qty;
        bookOrders[o.od]=(bookOrders[o.od]||0)+1;
        if(!firstBooked||o.od<firstBooked)firstBooked=o.od;
      }
      if(stamp(o.pd)&&o.pd>=MIN&&o.pd<=MAX&&(o.pd<=today||o.st==='confirmed')){
        due[o.pd]=(due[o.pd]||0)+o.qty;
        dueOrders[o.pd]=(dueOrders[o.pd]||0)+1;
      }
      if(stamp(o.pd)&&o.pd>=MIN&&(!firstDue||o.pd<firstDue))firstDue=o.pd;
    });
    return {booked:booked,due:due,bookOrders:bookOrders,dueOrders:dueOrders,
      firstBooked:firstBooked,firstDue:firstDue,orders:normalized.length};
  }
  function dayStat(index,day,today){
    var b=day>today||!index.firstBooked||day<index.firstBooked?null:(index.booked[day]||0);
    var p=!index.firstDue||day<index.firstDue?null:(index.due[day]||0);
    return {day:day,booked:b,due:p,bookOrders:index.bookOrders[day]||0,
      dueOrders:index.dueOrders[day]||0,future:day>today};
  }
  function chart(rows,today,selected){
    var width=rows.length*STEP,height=205,top=26,bottom=160;
    var numbers=[];
    rows.forEach(function(r){if(r.booked!==null)numbers.push(r.booked);if(r.due!==null)numbers.push(r.due);});
    var high=Math.max(1,Math.max.apply(null,numbers)),tick=Math.max(1,Math.ceil(high/4)),max=tick*4;
    function yy(n){return bottom-(n/max)*(bottom-top);}
    function line(key){
      var d='',on=false;rows.forEach(function(r,i){var n=r[key];if(n===null){on=false;return;}
        d+=(on?'L':'M')+(STEP*i+STEP/2)+' '+yy(n).toFixed(1)+' ';on=true;});
      return d.trim();
    }
    var grids=[0,1,2,3,4].map(function(i){
      var y=yy(i*tick);
      return '<line x1="0" x2="'+width+'" y1="'+y+'" y2="'+y+'" stroke="#e9ede9"/>'+
        '<text x="7" y="'+(y-4)+'" font-size="11" fill="#698073">'+(i*tick)+'</text>';
    }).join('');
    var marks=rows.map(function(r,i){
      var cx=STEP*i+STEP/2,parts='';
      if(r.day===today)parts+='<line x1="'+cx+'" x2="'+cx+'" y1="12" y2="167" stroke="#9ab5c7" stroke-width="1.5" stroke-dasharray="3 5"/>'+
        '<text x="'+cx+'" y="10" font-size="10" fill="#547b99" text-anchor="middle">Today</text>';
      if(r.day===selected)parts+='<rect x="'+(STEP*i+8)+'" y="15" width="'+(STEP-16)+'" height="151" rx="7" fill="#688fc1" opacity=".075"/>';
      var tt=pretty(r.day)+': '+(r.booked===null?'booking activity not known':r.booked+' cakes booked')+
        '; '+(r.due===null?'no pickup history':r.due+' cakes due')+(r.future?' (confirmed future pickups only)':'');
      if(r.due!==null)parts+='<circle cx="'+cx+'" cy="'+yy(r.due)+'" r="4" fill="#fff" stroke="#468b67" stroke-width="2"><title>'+safe(tt)+'</title></circle>';
      if(r.booked!==null)parts+='<circle cx="'+cx+'" cy="'+yy(r.booked)+'" r="3" fill="#fff" stroke="#975aa3" stroke-width="2"><title>'+safe(tt)+'</title></circle>';
      if(i%3===0||i===rows.length-1)parts+='<text x="'+cx+'" y="189" fill="#6b7b70" font-size="11" text-anchor="middle">'+(+r.day.slice(8))+' '+safe(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(r.day.slice(5,7))-1])+'</text>';
      return parts;
    }).join('');
    return '<svg class="ccdr-svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+
      '" role="img" aria-label="Daily cakes booked, dashed purple, and daily confirmed collection demand, solid green. Future booking counts are unknown.">'+
      grids+'<path d="'+line('due')+'" fill="none" stroke="#468b67" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+line('booked')+'" fill="none" stroke="#975aa3" stroke-width="3.2" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>'+marks+'</svg>';
  }
  function mount(parent,raw,options){
    if(!parent||!parent.querySelector||!global.CCCakeSeasonalStage||
       typeof global.CCCakeSeasonalStage.normalize!=='function')return false;
    var old=parent.querySelector('#cc-seasonal-demand-staging');
    if(!old||!old.querySelector('.ccsd-daily')||old.querySelector('#cc-demand-scroll-rail'))return false;
    var today=stamp(options&&options.today)||stamp(new Date().toISOString().slice(0,10));
    if(!today)throw Error('Daily rail needs a valid current date');
    var data=indexOrders(raw,today,global.CCCakeSeasonalStage.normalize);
    var range=gap(MIN,MAX)+1,first=old.querySelector('.ccsd-daily');
    var rail=old.ownerDocument.createElement('section');
    rail.id='cc-demand-scroll-rail';
    rail.className='ccdr';
    rail.setAttribute('aria-label','Protected daily cake demand timeline through December 2027');
    rail.setAttribute('data-locked-module',NAME);
    var at=stamp(saved.center)&&saved.center>=MIN&&saved.center<=MAX?saved.center:today;
    at=clamp(dateTime(at),dateTime(MIN),dateTime(MAX));
    var initial=new Date(at).toISOString().slice(0,10);
    rail.innerHTML='<div class="ccdr-head"><div><h3>Daily cake demand</h3>'+
      '<p>Scroll day by day to see when customers booked and when their cakes are due.</p></div>'+
      '<div class="ccdr-actions"><label>Jump to month <select class="ccdr-month" aria-label="Jump to any month through December 2027">'+monthOptions(initial.slice(0,7))+'</select></label>'+
      '<button type="button" class="ccdr-today">Today</button><button type="button" class="ccdr-end">Dec 2027</button></div></div>'+
      '<div class="ccdr-legend"><span class="ccdr-green"><i></i>Solid green — cakes due for pickup</span>'+
      '<span class="ccdr-purple"><i></i>Dashed purple — cakes booked that day</span>'+
      '<span class="ccdr-legend-note">Future bookings unknown; future pickups confirmed only</span></div>'+
      '<div class="ccdr-nav"><button type="button" class="ccdr-back" aria-label="Scroll to earlier days">← Earlier</button>'+
      '<span class="ccdr-range" aria-live="polite"></span><button type="button" class="ccdr-forward" aria-label="Scroll to later days">Later →</button></div>'+
      '<div class="ccdr-scroll" tabindex="0" aria-label="Horizontal day-by-day cake demand timeline; scroll to navigate from 2024 through December 2027">'+
      '<div class="ccdr-spacer" style="width:'+(range*STEP)+'px">'+
      '<div class="ccdr-window"><div class="ccdr-days"></div><div class="ccdr-plot"></div></div></div></div>'+
      '<p class="ccdr-detail" aria-live="polite"></p>'+
      '<p class="ccdr-footnote">The purple line stops on today because future bookings have not happened. Booking dates without verification are excluded from that line. The green line shows confirmed future collection commitments, not projected sales.</p>';
    first.parentNode.insertBefore(rail,first);
    var scroller=rail.querySelector('.ccdr-scroll'),slab=rail.querySelector('.ccdr-window'),
      days=rail.querySelector('.ccdr-days'),plot=rail.querySelector('.ccdr-plot'),
      month=rail.querySelector('.ccdr-month'),period=rail.querySelector('.ccdr-range'),
      detail=rail.querySelector('.ccdr-detail'),back=rail.querySelector('.ccdr-back'),forward=rail.querySelector('.ccdr-forward');
    var renderedStart=-1,renderedCount=-1,lastCenter='',raf=0;
    function selectedStat(day){return dayStat(data,day,today);}
    function showDetail(day){
      var d=selectedStat(day);saved.selected=d.day;
      detail.textContent=pretty(d.day)+' · '+(d.booked===null?'Bookings: not known':d.booked+' cakes booked ('+d.bookOrders+' orders)')+
        ' · '+(d.due===null?'Pickups: no historic coverage':d.due+' cakes due ('+d.dueOrders+' orders)')+
        (d.future?' · confirmed future pickups only':'');
    }
    function draw(force){
      raf=0;
      var client=scroller.clientWidth||1000,position=scroller.scrollLeft||0,
        center=clamp(Math.floor((position+client/2)/STEP),0,range-1),
        visible=Math.max(1,Math.ceil(client/STEP)),
        count=Math.min(MAX_VISIBLE,visible+PAD*2),
        begin=clamp(Math.floor(position/STEP)-PAD,0,Math.max(0,range-count));
      if(begin!==renderedStart||count!==renderedCount||force){
        var rows=[];for(var i=0;i<count;i++)rows.push(selectedStat(add(MIN,begin+i)));
        slab.style.left=(begin*STEP)+'px';slab.style.width=(count*STEP)+'px';
        days.innerHTML=rows.map(function(r){
          var selected=r.day===saved.selected,now=r.day===today,
            label=pretty(r.day)+', '+(r.booked===null?'bookings unknown':r.booked+' cakes booked')+
              ', '+(r.due===null?'no known pickup history':r.due+' cakes due');
          return '<button type="button" class="ccdr-day'+(selected?' is-selected':'')+(now?' is-today':'')+
            '" data-ccdr-day="'+r.day+'" aria-pressed="'+selected+'" aria-label="'+safe(label)+'">'+
            '<span class="ccdr-date">'+safe(pretty(r.day).replace(/ \d{4}$/,''))+'</span>'+
            '<strong class="ccdr-due">'+(r.due===null?'—':r.due)+'</strong><small>due</small>'+
            '<b class="ccdr-booked">'+(r.booked===null?'—':r.booked)+'</b><small>booked</small></button>';
        }).join('');
        plot.innerHTML=chart(rows,today,saved.selected);
        renderedStart=begin;renderedCount=count;
      }
      var day=add(MIN,center);
      if(day!==lastCenter||force){
        lastCenter=day;saved.center=day;
        month.value=day.slice(0,7);
        var endDay=add(MIN,clamp(Math.floor((position+client)/STEP),0,range-1));
        period.textContent=pretty(add(MIN,clamp(Math.floor(position/STEP),0,range-1)))+' — '+pretty(endDay);
        back.disabled=position<=1;
        forward.disabled=position+client>=range*STEP-1;
      }
    }
    function schedule(){if(raf)return;raf=(global.requestAnimationFrame||global.setTimeout)(function(){draw(false);},16);}
    function go(day,behavior){
      var d=stamp(day)||today,idx=clamp(gap(MIN,d),0,range-1);
      var wanted=clamp(idx*STEP-(scroller.clientWidth||1000)/2+STEP/2,0,Math.max(0,range*STEP-(scroller.clientWidth||1000)));
      try{scroller.scrollTo({left:wanted,behavior:behavior||'auto'});}catch(err){scroller.scrollLeft=wanted;}
      draw(true);
    }
    function step(n){var idx=clamp(Math.floor((scroller.scrollLeft+(scroller.clientWidth||1000)/2)/STEP)+n,0,range-1);go(add(MIN,idx));}
    function pick(e){
      var b=e.target&&e.target.closest?e.target.closest('[data-ccdr-day]'):null;
      if(!b)return;
      showDetail(b.getAttribute('data-ccdr-day'));
      draw(true);
    }
    try{
      scroller.addEventListener('scroll',schedule,{passive:true});
      days.addEventListener('click',pick);
      back.addEventListener('click',function(){step(-7);});
      forward.addEventListener('click',function(){step(7);});
      rail.querySelector('.ccdr-today').addEventListener('click',function(){go(today);});
      rail.querySelector('.ccdr-end').addEventListener('click',function(){go(MAX);});
      month.addEventListener('change',function(){var m=month.value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(m))go(m+'-01');});
      if(saved.selected&&stamp(saved.selected))showDetail(saved.selected);else showDetail(today);
      go(initial);
      if(!days.querySelector('.ccdr-day'))throw Error('Daily rail rendered no day controls');
      old.classList.add('ccsd-protected-rail-on');
    }catch(err){
      rail.remove();
      if(typeof global.console!=='undefined')global.console.error('[Daily cake demand] Protected module mount failed; previous chart preserved',err);
      return false;
    }
    return true;
  }
  global[NAME]={version:VERSION,rangeStart:MIN,rangeEnd:MAX,maxRenderedDays:MAX_VISIBLE,
    dayStat:dayStat,indexOrders:indexOrders,mount:mount};
})(typeof window!=='undefined'?window:globalThis);
