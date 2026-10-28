/* Corner Cafe Cake CRM — PROTECTED Daily Cake Demand Rail v1.1.
 * Invariant: never replace the base CRM, management KPIs, or seasonal pace.
 * Horizontally scrollable daily bookings (purple dashed) versus scheduled pickups
 * (solid green), across 2024-01-01..2028-12-31, with a bounded DOM window.
 * Consumer: management Analytics addon, after CCCakeSeasonalStage.mount succeeds.
 * Source: staff-authorized dashboard_register orders already passed to the addon.
 * Changes require contract tests and approval (see docs/ANALYTICS_MODULE_LOCK.md).
 *
 * v1.1.0 (21 October 2026, approved by Roneel: "open the cakes heartbeat, keep the data, holidays all the way to 2030", then "keep it till end of 2028"):
 * the order counting (indexOrders, dayStat) is unchanged; the timeline now runs to 31 December 2028 and shows holidays
 * and events under the chart in the same format as the other Jack's Restaurants Heartbeats (Kazumi Service Hub):
 *   - two rows: Fiji (public holidays, café events, international days) and Tourist markets (Australia and New Zealand,
 *     with school holidays); names written on the marks; at most two lines per row
 *   - Fiji public holidays shaded across the whole day in the chart; hollow marks = date expected, not yet announced
 *   - buttons in the key show or hide a row (remembered on this device); tapping a day lists its holidays
 *   - "Holidays and events" opens a list where managers change, add or remove entries. Fiji public holidays and café
 *     events are the same entries as Settings > Events and public holidays (calendar_events, calendar_event_save);
 *     international, Australian and New Zealand entries are in timeline_events (timeline_event_save). Both check the
 *     Settings permission on the server. If either list cannot load, the built-in list below is used for that part.
 */
(function(global){
  'use strict';
  var NAME='CCCakeDemandRail', VERSION='1.1.0', MIN='2024-01-01', MAX='2028-12-31';
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
    for(var year=2024;year<=+MAX.slice(0,4);year++)for(var m=1;m<=12;m++){
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

  /* ---------- holidays and events (v1.1.0) ---------- */
  /* Built-in list, checked against official sources on 21 October 2026 (Jack's Restaurants shared list, no Japanese
     entries): [first day, last day or 0, group fj/intl/au/nz, kind h/s/e (holiday, school, event), expected 1/0, name] */
  var BUILTIN=[["2026-08-24",0,"fj","h",0,"Prophet Mohammed's Birthday"],["2026-09-06",0,"intl","e",0,"Father's Day (Fiji)"],["2026-09-19","2026-10-04","au","s",0,"School holidays: Victoria"],["2026-09-19","2026-10-05","au","s",0,"School holidays: Queensland"],["2026-09-26","2026-10-11","nz","s",0,"School holidays: New Zealand"],["2026-09-28","2026-10-09","au","s",0,"School holidays: New South Wales"],["2026-10-05",0,"au","h",0,"King's Birthday (Queensland only)"],["2026-10-10",0,"fj","h",0,"Fiji Day"],["2026-10-26",0,"nz","h",0,"Labour Day"],["2026-10-31",0,"intl","e",0,"Halloween"],["2026-11-09",0,"fj","h",0,"Diwali"],["2026-12-09",0,"fj","e",1,"National Referendum (public holiday expected)"],["2026-12-12","2027-01-26","au","s",0,"School holidays: Queensland"],["2026-12-18","2027-01-27","au","s",0,"School holidays: New South Wales"],["2026-12-19","2027-01-26","au","s",0,"School holidays: Victoria"],["2026-12-19","2027-01-27","nz","s",0,"School holidays: New Zealand"],["2026-12-24",0,"intl","e",0,"Christmas Eve"],["2026-12-25",0,"au","h",0,"Christmas Day"],["2026-12-25",0,"fj","h",0,"Christmas Day"],["2026-12-25",0,"nz","h",0,"Christmas Day"],["2026-12-28",0,"au","h",0,"Boxing Day"],["2026-12-28",0,"fj","h",0,"Boxing Day"],["2026-12-28",0,"nz","h",0,"Boxing Day (observed)"],["2026-12-31",0,"intl","e",0,"New Year's Eve"],["2027-01-01",0,"au","h",0,"New Year's Day"],["2027-01-01",0,"fj","h",1,"New Year's Day"],["2027-01-01",0,"nz","h",0,"New Year's Day"],["2027-01-04",0,"nz","h",0,"Day after New Year's Day (observed)"],["2027-01-26",0,"au","h",0,"Australia Day"],["2027-02-06",0,"intl","e",0,"Chinese New Year (Lunar New Year)"],["2027-02-08",0,"intl","e",1,"Ramadan begins"],["2027-02-08",0,"nz","h",0,"Waitangi Day (observed)"],["2027-02-14",0,"intl","e",0,"Valentine's Day"],["2027-03-08",0,"intl","e",0,"International Women's Day"],["2027-03-10",0,"intl","e",1,"Eid al-Fitr"],["2027-03-22",0,"intl","e",1,"Holi"],["2027-03-26",0,"au","h",0,"Good Friday"],["2027-03-26","2027-04-11","au","s",0,"School holidays: Victoria"],["2027-03-26","2027-04-11","au","s",0,"School holidays: Queensland"],["2027-03-26",0,"fj","h",1,"Good Friday"],["2027-03-26",0,"nz","h",0,"Good Friday"],["2027-03-27","2027-03-29","au","h",0,"Easter Saturday to Easter Monday"],["2027-03-27",0,"fj","h",1,"Easter Saturday"],["2027-03-28",0,"intl","e",0,"Easter Sunday"],["2027-03-29",0,"fj","h",1,"Easter Monday"],["2027-03-29",0,"nz","h",0,"Easter Monday"],["2027-04-10","2027-04-26","nz","s",0,"School holidays: New Zealand"],["2027-04-12","2027-04-23","au","s",0,"School holidays: New South Wales"],["2027-04-25","2027-04-26","au","h",0,"Anzac Day"],["2027-04-26",0,"nz","h",0,"Anzac Day (observed)"],["2027-05-09",0,"intl","e",0,"Mother's Day (Fiji)"],["2027-05-14",0,"fj","h",1,"Girmit Day"],["2027-05-28",0,"fj","h",1,"Ratu Sir Lala Sukuna Day"],["2027-06-07",0,"nz","h",0,"King's Birthday"],["2027-06-14",0,"au","h",0,"King's Birthday"],["2027-06-25",0,"nz","h",0,"Matariki"],["2027-06-26","2027-07-11","au","s",0,"School holidays: Victoria"],["2027-06-26","2027-07-11","au","s",0,"School holidays: Queensland"],["2027-07-03","2027-07-18","nz","s",0,"School holidays: New Zealand"],["2027-07-05","2027-07-16","au","s",0,"School holidays: New South Wales"],["2027-08-16",0,"fj","h",1,"Prophet Mohammed's Birthday"],["2027-09-05",0,"intl","e",0,"Father's Day (Fiji)"],["2027-09-18","2027-10-03","au","s",0,"School holidays: Victoria"],["2027-09-18","2027-10-04","au","s",0,"School holidays: Queensland"],["2027-09-25","2027-10-10","nz","s",0,"School holidays: New Zealand"],["2027-09-27","2027-10-08","au","s",0,"School holidays: New South Wales"],["2027-10-04",0,"au","h",0,"King's Birthday (Queensland only)"],["2027-10-10",0,"fj","h",1,"Fiji Day"],["2027-10-25",0,"nz","h",0,"Labour Day"],["2027-10-29",0,"fj","h",1,"Diwali"],["2027-10-31",0,"intl","e",0,"Halloween"],["2027-12-11","2028-01-23","au","s",0,"School holidays: Queensland"],["2027-12-18","2028-01-26","au","s",0,"School holidays: Victoria"],["2027-12-18","2028-01-30","nz","s",0,"School holidays: New Zealand"],["2027-12-21","2028-01-28","au","s",0,"School holidays: New South Wales"],["2027-12-24",0,"intl","e",0,"Christmas Eve"],["2027-12-27",0,"au","h",0,"Christmas Day"],["2027-12-27",0,"fj","h",1,"Christmas Day (observed)"],["2027-12-27",0,"nz","h",0,"Christmas Day (observed)"],["2027-12-28",0,"au","h",0,"Boxing Day"],["2027-12-28",0,"fj","h",1,"Boxing Day (observed)"],["2027-12-28",0,"nz","h",0,"Boxing Day (observed)"],["2027-12-31",0,"intl","e",0,"New Year's Eve"],["2028-01-01",0,"fj","h",1,"New Year's Day"],["2028-01-03",0,"au","h",0,"New Year's Day"],["2028-01-03",0,"nz","h",0,"New Year's Day (observed)"],["2028-01-04",0,"nz","h",0,"Day after New Year's Day (observed)"],["2028-01-26",0,"au","h",0,"Australia Day"],["2028-01-26",0,"intl","e",0,"Chinese New Year (Lunar New Year)"],["2028-01-28",0,"intl","e",1,"Ramadan begins"],["2028-02-07",0,"nz","h",0,"Waitangi Day (observed)"],["2028-02-14",0,"intl","e",0,"Valentine's Day"],["2028-02-26",0,"intl","e",1,"Eid al-Fitr"],["2028-03-08",0,"intl","e",0,"International Women's Day"],["2028-03-11",0,"intl","e",1,"Holi"],["2028-04-01","2028-04-17","au","s",0,"School holidays: Victoria"],["2028-04-01","2028-04-17","au","s",0,"School holidays: Queensland"],["2028-04-10","2028-04-21","au","s",0,"School holidays: New South Wales"],["2028-04-14",0,"au","h",0,"Good Friday"],["2028-04-14",0,"fj","h",1,"Good Friday"],["2028-04-14",0,"nz","h",0,"Good Friday"],["2028-04-14","2028-04-30","nz","s",0,"School holidays: New Zealand"],["2028-04-15","2028-04-17","au","h",0,"Easter Saturday to Easter Monday"],["2028-04-15",0,"fj","h",1,"Easter Saturday"],["2028-04-16",0,"intl","e",0,"Easter Sunday"],["2028-04-17",0,"fj","h",1,"Easter Monday"],["2028-04-17",0,"nz","h",0,"Easter Monday"],["2028-04-25",0,"au","h",0,"Anzac Day"],["2028-04-25",0,"nz","h",0,"Anzac Day"],["2028-05-14",0,"intl","e",0,"Mother's Day (Fiji)"],["2028-05-15",0,"fj","h",1,"Girmit Day"],["2028-05-29",0,"fj","h",1,"Ratu Sir Lala Sukuna Day"],["2028-06-05",0,"nz","h",0,"King's Birthday"],["2028-06-12",0,"au","h",1,"King's Birthday"],["2028-06-24","2028-07-09","au","s",0,"School holidays: Queensland"],["2028-07-01","2028-07-16","au","s",0,"School holidays: Victoria"],["2028-07-08","2028-07-23","nz","s",0,"School holidays: New Zealand"],["2028-07-10","2028-07-21","au","s",0,"School holidays: New South Wales"],["2028-07-14",0,"nz","h",0,"Matariki"],["2028-08-07",0,"fj","h",1,"Prophet Mohammed's Birthday"],["2028-09-03",0,"intl","e",0,"Father's Day (Fiji)"],["2028-09-16","2028-10-02","au","s",0,"School holidays: Queensland"],["2028-09-23","2028-10-08","au","s",0,"School holidays: Victoria"],["2028-09-30","2028-10-15","nz","s",0,"School holidays: New Zealand"],["2028-10-02",0,"au","h",0,"King's Birthday (Queensland only)"],["2028-10-03","2028-10-13","au","s",0,"School holidays: New South Wales"],["2028-10-10",0,"fj","h",1,"Fiji Day"],["2028-10-17",0,"fj","h",1,"Diwali"],["2028-10-23",0,"nz","h",0,"Labour Day"],["2028-10-31",0,"intl","e",0,"Halloween"],["2028-12-09","2029-01-21","au","s",0,"School holidays: Queensland"],["2028-12-16","2029-01-28","nz","s",1,"School holidays: New Zealand"],["2028-12-22","2029-01-25","au","s",0,"School holidays: New South Wales"],["2028-12-22","2029-01-28","au","s",0,"School holidays: Victoria"],["2028-12-24",0,"intl","e",0,"Christmas Eve"],["2028-12-25",0,"au","h",0,"Christmas Day"],["2028-12-25",0,"fj","h",1,"Christmas Day"],["2028-12-25",0,"nz","h",0,"Christmas Day"],["2028-12-26",0,"au","h",0,"Boxing Day"],["2028-12-26",0,"fj","h",1,"Boxing Day"],["2028-12-26",0,"nz","h",0,"Boxing Day"],["2028-12-31",0,"intl","e",0,"New Year's Eve"]];
  var GROUPS={fj:'Fiji',cafe:'Café event',intl:'International',au:'Australia',nz:'New Zealand'};
  var ROWS=[['fj','Fiji',['fj','cafe','intl']],['tour','Tourist markets',['au','nz']]],HIDEK='ccdr_hide',LN=24,FS=13;
  var HOL={list:BUILTIN.map(function(e){return {a:e[0],b:e[1]||e[0],g:e[2],k:e[3],x:!!e[4],name:e[5],src:'builtin'};}),loaded:false,loading:false,client:null,perm:null};
  function hidden(){try{return JSON.parse(global.localStorage.getItem(HIDEK)||'[]')||[];}catch(e){return [];}}
  function rowsOn(){var h=hidden();return ROWS.filter(function(r){return h.indexOf(r[0])<0;});}
  function full(e){return e.name+(e.g==='au'||e.g==='nz'?', '+GROUPS[e.g]:e.g==='cafe'?' (café event)':'')+(e.x?' (date expected)':'');}
  function holOn(d){return HOL.list.filter(function(e){return d>=e.a&&d<=e.b;});}
  function client(){
    if(HOL.client)return HOL.client;
    if(!global.supabase||typeof global.supabase.createClient!=='function')return null;
    HOL.client=global.supabase.createClient('https://ilbrfwxblhidtlsjgxlh.supabase.co','sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E',
      {auth:{persistSession:true,storageKey:'cc-cakes-staff'}});
    return HOL.client;
  }
  /* Fiji entries come from calendar_events (the café's Settings list); international, Australian and New Zealand entries
     from timeline_events. A part that cannot load keeps the built-in entries for that part. */
  function holLoad(done){
    var c=client();if(!c||HOL.loading){if(done)done();return;}HOL.loading=true;
    Promise.all([
      c.from('calendar_events').select('id,day,ends_on,name,kind,note').order('day'),
      c.rpc('timeline_events_list')
    ]).then(function(r){
      var keep=HOL.list.filter(function(e){return e.src==='builtin';}),out=[];
      var cal=r[0]&&!r[0].error&&r[0].data,tl=r[1]&&!r[1].error&&r[1].data&&r[1].data.ok&&r[1].data.items;
      if(cal)cal.forEach(function(h){out.push({id:h.id,a:h.day,b:h.ends_on||h.day,g:h.kind==='holiday'?'fj':'cafe',k:h.kind==='holiday'?'h':'e',
        x:/expected/i.test(h.note||''),name:h.name,note:h.note||'',src:'cal'});});
      else keep.forEach(function(e){if(e.g==='fj')out.push(e);});
      if(tl)tl.forEach(function(h){out.push({id:h.id,a:h.date,b:h.end||h.date,g:h.grp,k:String(h.kind||'h')[0],x:!!h.expected,name:h.name,note:h.note||'',src:'tl'});});
      else keep.forEach(function(e){if(e.g!=='fj')out.push(e);});
      out.sort(function(p,q){return p.a<q.a?-1:p.a>q.a?1:0;});
      HOL.list=out;HOL.loaded=true;HOL.loading=false;if(done)done();
    }).catch(function(){HOL.loading=false;if(done)done();});
  }
  function base(e){return e.name.replace(/\s*\(observed\)\s*$/i,'').trim();}
  /* marks for one row, in day positions from MIN: Australian state school holidays become one bar per break, Good Friday
     to Easter Monday becomes one "Easter holidays" bar, Australia and New Zealand holidays with the same name and day
     become one mark */
  function rowItems(R){
    var it=[],sch=[];
    HOL.list.forEach(function(e){
      if(R[2].indexOf(e.g)<0)return;
      if(e.g==='au'&&e.k==='s'){sch.push(e);return;}
      var lab=e.k==='s'?'New Zealand school holidays':base(e)+(R[0]==='tour'?', '+GROUPS[e.g]:'');
      var same=R[0]==='tour'&&e.k!=='s'&&it.filter(function(x){return x.a===e.a&&x.b===e.b&&x.base===base(e)&&!x.s;})[0];
      if(same){same.lab=base(e)+', Australia and New Zealand';same.tt.push(full(e));return;}
      it.push({a:e.a,b:e.b,lab:lab,base:base(e),g:e.g,s:e.k==='s',x:e.x,tt:[full(e)],span:e.b!==e.a});
    });
    sch.sort(function(p,q){return p.a<q.a?-1:1;});var cur=null;
    sch.forEach(function(e){if(cur&&e.a<=add(cur.b,1)){if(e.b>cur.b)cur.b=e.b;cur.tt.push(full(e));cur.x=cur.x&&e.x;}
      else{cur={a:e.a,b:e.b,lab:'Australian school holidays',g:'au',s:true,x:e.x,tt:[full(e)],span:true};it.push(cur);}});
    var eg={};
    it=it.filter(function(m){if(m.s||!/Easter|Good Friday/.test(m.base))return true;var y=m.a.slice(0,4),g=eg[y];
      if(!g)g=eg[y]={a:m.a,b:m.b,g:R[0]==='fj'?'fj':m.g,s:false,x:m.x,tt:[],span:true,cs:{}};
      if(m.a<g.a)g.a=m.a;if(m.b>g.b)g.b=m.b;g.x=g.x&&m.x;g.tt=g.tt.concat(m.tt);g.cs[m.g]=1;if(/Australia and New Zealand/.test(m.lab)){g.cs.au=1;g.cs.nz=1;}return false;});
    Object.keys(eg).forEach(function(y){var g=eg[y];g.span=g.a!==g.b;
      g.lab='Easter holidays'+(R[0]==='tour'?(g.cs.au&&g.cs.nz?', Australia and New Zealand':g.cs.au?', Australia':', New Zealand'):'');it.push(g);});
    return it;
  }
  function lanesHeight(){return rowsOn().length*(2*LN+4);}
  function lanes(begin,count,top){
    var g='',y0=top,lab=[];
    rowsOn().forEach(function(R){
      var it=rowItems(R).map(function(m){var i0=gap(MIN,m.a)-begin,i1=gap(MIN,m.b)-begin;if(i1<0||i0>=count)return null;
        var c0=Math.max(0,i0),c1=Math.min(count-1,i1),x0=c0*STEP+3,x1=(c1+1)*STEP-3,tw=m.lab.length*FS*0.56+(m.span?16:22);
        return {m:m,i0:c0,x0:x0,x1:x1,end:Math.max(x1,x0+tw)+8};}).filter(Boolean);
      it.sort(function(p,q){return p.x0-q.x0||(q.x1-q.x0)-(p.x1-p.x0);});
      var tr=[];
      it.forEach(function(o){for(var k=0;k<tr.length;k++){if(tr[k]<=o.x0){o.t=k;tr[k]=o.end;return;}}
        if(tr.length<2){o.t=tr.length;tr.push(o.end);return;}var lo=tr[0]<=tr[1]?0:1;o.t=lo;o.nolab=true;tr[lo]=Math.max(tr[lo],o.x1+4);});
      g+='<rect x="0" y="'+y0+'" width="'+(count*STEP)+'" height="'+(2*LN)+'" fill="#fafbfa"/>';
      lab.push([R,y0]);
      it.forEach(function(o){var m=o.m,y=y0+o.t*LN,cy=y+LN/2,t='<title>'+safe(m.tt.join('; '))+'</title>',cls='ccdr-hl ccdr-hl-'+m.g+(m.s?' is-school':'')+(m.x?' is-expected':'');
        if(m.span)g+='<g class="'+cls+'">'+t+'<rect x="'+o.x0+'" y="'+(y+3)+'" width="'+Math.max(6,o.x1-o.x0)+'" height="'+(LN-6)+'" rx="'+((LN-6)/2)+'"/>'+
          (o.nolab?'':'<text x="'+(o.x0+10)+'" y="'+(cy+FS*0.35)+'">'+safe(m.lab)+'</text>')+'</g>';
        else g+='<g class="'+cls+'">'+t+'<circle cx="'+(o.i0*STEP+STEP/2)+'" cy="'+cy+'" r="'+(LN/2-5)+'"/>'+
          (o.nolab?'':'<text x="'+(o.i0*STEP+STEP/2+LN/2-1)+'" y="'+(cy+FS*0.35)+'">'+safe(m.lab)+'</text>')+'</g>';});
      y0+=2*LN+4;
    });
    return {svg:g,labels:lab};
  }
  function fijiShade(begin,count,top,bottom){
    if(hidden().indexOf('fj')>=0)return '';
    return HOL.list.filter(function(e){return e.g==='fj'&&e.k==='h';}).map(function(e){var i=gap(MIN,e.a)-begin;if(i<0||i>=count)return '';
      return '<rect class="ccdr-fjday'+(e.x?' is-expected':'')+'" x="'+(i*STEP)+'" y="'+top+'" width="'+STEP+'" height="'+(bottom-top)+'"><title>'+safe(full(e))+'</title></rect>';}).join('');
  }
  function chart(rows,today,selected,begin){
    var lh=lanesHeight(),width=rows.length*STEP,height=205+(lh?lh+6:0),top=26,bottom=160;
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
    var L=lh?lanes(begin,rows.length,211):{svg:'',labels:[]};
    return {labels:L.labels,svg:'<svg class="ccdr-svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+
      '" style="height:'+height+'px" role="img" aria-label="Daily cakes booked, dashed purple, and daily confirmed collection demand, solid green. Future booking counts are unknown. Holidays and events are shown under the dates.">'+
      fijiShade(begin,rows.length,14,167)+grids+'<path d="'+line('due')+'" fill="none" stroke="#468b67" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+line('booked')+'" fill="none" stroke="#975aa3" stroke-width="3.2" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>'+marks+L.svg+'</svg>'};
  }

  /* ---------- the "Holidays and events" list: managers change, add or remove entries ---------- */
  var ED={open:false,g:'',y:'',edit:null,msg:''};
  var KINDS={fj:[['h','Public holiday']],cafe:[['e','Café event']],intl:[['e','Event or occasion']],au:[['h','Public holiday'],['s','School holidays']],nz:[['h','Public holiday'],['s','School holidays']]};
  function edView(today){
    var ys={};HOL.list.forEach(function(e){ys[e.a.slice(0,4)]=1;});
    var rows=HOL.list.filter(function(e){return (!ED.g||e.g===ED.g)&&(ED.y?e.a.slice(0,4)===ED.y:e.b>=today);});
    var h='<div class="ccdr-ed"><div class="ccdr-ed-head"><h4>Holidays and events</h4><p>Change a date here and the timeline shows it. Fiji public holidays and café events are the same list as Settings, Events and public holidays.</p>'+
      '<button type="button" class="ccdr-ed-add">Add a holiday or event</button><button type="button" class="ccdr-ed-close">Close</button></div>'+
      '<div class="ccdr-ed-fil"><div class="ccdr-chips" role="group" aria-label="Group">'+[['','All']].concat(Object.keys(GROUPS).map(function(k){return [k,GROUPS[k]];})).map(function(g){
        return '<button type="button" data-edg="'+g[0]+'" aria-pressed="'+(ED.g===g[0])+'">'+safe(g[1])+'</button>';}).join('')+'</div>'+
      '<label>Year <select class="ccdr-ed-year"><option value="">From today</option>'+Object.keys(ys).sort().map(function(y){return '<option'+(ED.y===y?' selected':'')+'>'+y+'</option>';}).join('')+'</select></label></div>'+
      '<div class="ccdr-ed-form"></div><p class="ccdr-ed-msg" aria-live="polite">'+safe(ED.msg)+'</p>';
    if(!HOL.loaded)h+='<p class="ccdr-ed-note">Showing the built-in list; changes can be saved once the database list has loaded.</p>';
    h+='<div class="ccdr-ed-list">'+(rows.length?rows.slice(0,400).map(function(e,i){
      return '<div class="ccdr-ed-row"><i class="ccdr-dot ccdr-dot-'+e.g+'"></i><div><b>'+safe(e.name)+'</b><span>'+safe(pretty(e.a)+(e.b!==e.a?' to '+pretty(e.b):'')+' · '+GROUPS[e.g]+(e.k==='s'?', school holidays':''))+'</span></div>'+
        (e.x?'<em>Date not yet confirmed</em>':'')+(e.src!=='builtin'?'<button type="button" data-edi="'+safe(e.id)+'">Change</button>':'')+'</div>';}).join(''):'<p class="ccdr-ed-note">Nothing matches.</p>')+'</div></div>';
    return h;
  }
  function edForm(e){
    var n=!e;e=e||{a:'',b:'',g:'fj',k:'h',x:false,name:'',note:''};
    var kinds=KINDS[e.g]||KINDS.fj;
    return '<div class="ccdr-ed-f"><h5>'+(n?'Add a holiday or event':'Change '+safe(e.name))+'</h5>'+
      '<label>Name<input class="ccdr-f-name" maxlength="60" value="'+safe(e.name)+'"></label>'+
      '<label>Group<select class="ccdr-f-g"'+(n?'':' disabled')+'>'+Object.keys(GROUPS).map(function(k){return '<option value="'+k+'"'+(e.g===k?' selected':'')+'>'+GROUPS[k]+'</option>';}).join('')+'</select></label>'+
      '<label>Type<select class="ccdr-f-k">'+kinds.map(function(k){return '<option value="'+k[0]+'"'+(e.k===k[0]?' selected':'')+'>'+k[1]+'</option>';}).join('')+'</select></label>'+
      '<label>Date (or first day)<input type="date" class="ccdr-f-a" value="'+safe(e.a)+'"></label>'+
      '<label>Last day, if it runs over several days<input type="date" class="ccdr-f-b" value="'+safe(e.b&&e.b!==e.a?e.b:'')+'"></label>'+
      '<label class="ccdr-f-check"><input type="checkbox" class="ccdr-f-x"'+(e.x?'':' checked')+'> Date confirmed (untick if it is only expected; it shows hollow)</label>'+
      '<div class="ccdr-f-acts"><button type="button" class="ccdr-f-save">'+(n?'Add':'Save changes')+'</button><button type="button" class="ccdr-f-cancel">Cancel</button>'+
      (n?'':'<button type="button" class="ccdr-f-remove">Remove</button>')+'</div></div>';
  }
  function noteFor(e,expected){var n=(e&&e.note||'').replace(/\s*Date expected;[^.]*\.?/i,'').trim();return expected?('Date expected; not yet announced.'+(n?' '+n:'')):n;}
  function edSave(e,v,done){
    var c=client();if(!c){done('The database connection is not available.');return;}
    var fj=v.g==='fj'||v.g==='cafe',call;
    if(v.remove)call=fj?c.rpc('calendar_event_delete',{p_id:e.id}):c.rpc('timeline_event_save',{p:{id:e.id,remove:true}});
    else if(fj)call=c.rpc('calendar_event_save',{p_id:e?e.id:null,p_day:v.a,p_ends_on:v.b||null,p_name:v.name,p_kind:v.g==='fj'?'holiday':'event',p_note:noteFor(e,v.x)||null});
    else call=c.rpc('timeline_event_save',{p:{id:e?e.id:null,date:v.a,end:v.b||null,name:v.name,grp:v.g,kind:v.k==='s'?'school':v.k==='e'?'event':'holiday',expected:v.x,note:e&&e.note||null}});
    call.then(function(r){var d=r&&r.data;if(r&&r.error){done(/permission|not allowed|cannot/i.test(r.error.message||'')?'Your login cannot change holidays and events.':'That did not save. Try again.');return;}
      if(d&&d.ok===false){done(d.message||d.error||'That did not save.');return;}done(null);}).catch(function(){done('That did not save. Check the connection and try again.');});
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
    rail.setAttribute('aria-label','Protected daily cake demand timeline through December 2028');
    rail.setAttribute('data-locked-module',NAME);
    var at=stamp(saved.center)&&saved.center>=MIN&&saved.center<=MAX?saved.center:today;
    at=clamp(dateTime(at),dateTime(MIN),dateTime(MAX));
    var initial=new Date(at).toISOString().slice(0,10);
    function keyHtml(){var h=hidden();return '<span class="ccdr-hk-lbl">Holidays and events, tap to show or hide:</span>'+ROWS.map(function(r){
        return '<button type="button" class="ccdr-hk ccdr-hk-'+r[0]+'" data-ccdr-row="'+r[0]+'" aria-pressed="'+(h.indexOf(r[0])<0)+'"><i></i>'+r[1]+'</button>';}).join('')+
      '<span class="ccdr-hk-x"><i></i>Hollow: date expected</span>';}
    rail.innerHTML='<div class="ccdr-head"><div><h3>Daily cake demand</h3>'+
      '<p>Scroll day by day to see when customers booked and when their cakes are due.</p></div>'+
      '<div class="ccdr-actions"><label>Jump to month <select class="ccdr-month" aria-label="Jump to any month through December 2028">'+monthOptions(initial.slice(0,7))+'</select></label>'+
      '<button type="button" class="ccdr-today">Today</button><button type="button" class="ccdr-end">Dec 2028</button><button type="button" class="ccdr-edit">Holidays and events</button></div></div>'+
      '<div class="ccdr-edit-panel" hidden></div>'+
      '<div class="ccdr-legend"><span class="ccdr-green"><i></i>Solid green — cakes due for pickup</span>'+
      '<span class="ccdr-purple"><i></i>Dashed purple — cakes booked that day</span>'+
      '<span class="ccdr-legend-note">Future bookings unknown; future pickups confirmed only</span></div>'+
      '<div class="ccdr-legend ccdr-hkey">'+keyHtml()+'</div>'+
      '<div class="ccdr-nav"><button type="button" class="ccdr-back" aria-label="Scroll to earlier days">← Earlier</button>'+
      '<span class="ccdr-range" aria-live="polite"></span><button type="button" class="ccdr-forward" aria-label="Scroll to later days">Later →</button></div>'+
      '<div class="ccdr-wrap"><div class="ccdr-scroll" tabindex="0" aria-label="Horizontal day-by-day cake demand timeline; scroll to navigate from 2024 through December 2028">'+
      '<div class="ccdr-spacer" style="width:'+(range*STEP)+'px">'+
      '<div class="ccdr-window"><div class="ccdr-days"></div><div class="ccdr-plot"></div></div></div></div><div class="ccdr-rowlabels" aria-hidden="true"></div></div>'+
      '<p class="ccdr-detail" aria-live="polite"></p>'+
      '<p class="ccdr-footnote">The purple line stops on today because future bookings have not happened. Booking dates without verification are excluded from that line. The green line shows confirmed future collection commitments, not projected sales.</p>';
    first.parentNode.insertBefore(rail,first);
    var scroller=rail.querySelector('.ccdr-scroll'),slab=rail.querySelector('.ccdr-window'),
      days=rail.querySelector('.ccdr-days'),plot=rail.querySelector('.ccdr-plot'),
      month=rail.querySelector('.ccdr-month'),period=rail.querySelector('.ccdr-range'),
      detail=rail.querySelector('.ccdr-detail'),back=rail.querySelector('.ccdr-back'),forward=rail.querySelector('.ccdr-forward'),
      spacer=rail.querySelector('.ccdr-spacer'),rowlabels=rail.querySelector('.ccdr-rowlabels'),panel=rail.querySelector('.ccdr-edit-panel');
    var renderedStart=-1,renderedCount=-1,lastCenter='',raf=0;
    function selectedStat(day){return dayStat(data,day,today);}
    function showDetail(day){
      var d=selectedStat(day);saved.selected=d.day;
      detail.textContent=pretty(d.day)+' · '+(d.booked===null?'Bookings: not known':d.booked+' cakes booked ('+d.bookOrders+' orders)')+
        ' · '+(d.due===null?'Pickups: no historic coverage':d.due+' cakes due ('+d.dueOrders+' orders)')+
        (d.future?' · confirmed future pickups only':'');
      holOn(d.day).forEach(function(e){var s=detail.ownerDocument.createElement('span');s.className='ccdr-hd ccdr-hd-'+e.g;s.textContent=full(e);detail.appendChild(s);});
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
        var c=chart(rows,today,saved.selected,begin),h=205+(lanesHeight()?lanesHeight()+6:0);
        plot.innerHTML=c.svg;plot.style.height=h+'px';spacer.style.height=(88+h+10)+'px';spacer.style.maxHeight='none';
        rowlabels.innerHTML=c.labels.map(function(l){return '<span style="top:'+(88+l[1])+'px;height:'+(2*LN)+'px">'+safe(l[0][1])+'</span>';}).join('');
        renderedStart=begin;renderedCount=count;
      }
      var day=add(MIN,center);
      if(day!==lastCenter||force){
        lastCenter=day;if(scroller.isConnected&&scroller.clientWidth)saved.center=day; /* v1.0.1: a hidden or removed rail reads as scrolled to 2024; never remember that */
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
    function refresh(){draw(true);showDetail(saved.selected||today);if(!panel.hidden)paintPanel();}
    function paintPanel(){
      panel.innerHTML=edView(today);
      panel.querySelectorAll('[data-edg]').forEach(function(b){b.addEventListener('click',function(){ED.g=b.getAttribute('data-edg');paintPanel();});});
      panel.querySelector('.ccdr-ed-year').addEventListener('change',function(){ED.y=this.value;paintPanel();});
      panel.querySelector('.ccdr-ed-close').addEventListener('click',function(){panel.hidden=true;ED.msg='';});
      panel.querySelector('.ccdr-ed-add').addEventListener('click',function(){openForm(null);});
      panel.querySelectorAll('[data-edi]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-edi');openForm(HOL.list.filter(function(e){return String(e.id)===id;})[0]);});});
    }
    function openForm(e){
      var f=panel.querySelector('.ccdr-ed-form');f.innerHTML=edForm(e);var gsel=f.querySelector('.ccdr-f-g');
      gsel.addEventListener('change',function(){var k=f.querySelector('.ccdr-f-k');k.innerHTML=(KINDS[gsel.value]||KINDS.fj).map(function(x){return '<option value="'+x[0]+'">'+x[1]+'</option>';}).join('');});
      f.querySelector('.ccdr-f-name').focus();
      f.querySelector('.ccdr-f-cancel').addEventListener('click',function(){f.innerHTML='';});
      function val(){return {name:f.querySelector('.ccdr-f-name').value.trim(),g:gsel.value,k:f.querySelector('.ccdr-f-k').value,a:f.querySelector('.ccdr-f-a').value,
        b:f.querySelector('.ccdr-f-b').value,x:!f.querySelector('.ccdr-f-x').checked};}
      function after(err,msg){if(err){ED.msg=err;panel.querySelector('.ccdr-ed-msg').textContent=err;return;}ED.msg=msg;holLoad(refresh);}
      f.querySelector('.ccdr-f-save').addEventListener('click',function(){var v=val();
        if(!v.name||!stamp(v.a)){panel.querySelector('.ccdr-ed-msg').textContent='Give it a name and a date.';return;}
        if(v.b&&v.b<v.a){panel.querySelector('.ccdr-ed-msg').textContent='The last day is before the first day.';return;}
        this.disabled=true;edSave(e,v,function(err){after(err,e?'Saved. The timeline shows the new date.':'Added. It shows on the timeline.');});});
      var rm=f.querySelector('.ccdr-f-remove');if(rm)rm.addEventListener('click',function(){this.disabled=true;var v=val();v.remove=true;edSave(e,v,function(err){after(err,'Removed '+e.name+'.');});});
    }
    try{
      scroller.addEventListener('scroll',schedule,{passive:true});
      days.addEventListener('click',pick);
      plot.addEventListener('click',function(e){var r=plot.getBoundingClientRect(),i=Math.floor((e.clientX-r.left)/STEP);if(i>=0){showDetail(add(MIN,renderedStart+i));draw(true);}});
      back.addEventListener('click',function(){step(-7);});
      forward.addEventListener('click',function(){step(7);});
      rail.querySelector('.ccdr-today').addEventListener('click',function(){go(today);});
      rail.querySelector('.ccdr-end').addEventListener('click',function(){go(MAX);});
      rail.querySelector('.ccdr-edit').addEventListener('click',function(){panel.hidden=!panel.hidden;if(!panel.hidden)paintPanel();});
      rail.querySelector('.ccdr-hkey').addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-ccdr-row]');if(!b)return;
        var h=hidden(),k=b.getAttribute('data-ccdr-row'),i=h.indexOf(k);if(i<0)h.push(k);else h.splice(i,1);
        try{global.localStorage.setItem(HIDEK,JSON.stringify(h));}catch(err){}
        rail.querySelector('.ccdr-hkey').innerHTML=keyHtml();var nb=rail.querySelector('[data-ccdr-row="'+k+'"]');if(nb)nb.focus();draw(true);});
      month.addEventListener('change',function(){var m=month.value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(m))go(m+'-01');});
      if(saved.selected&&stamp(saved.selected))showDetail(saved.selected);else showDetail(today);
      go(initial);
      if(!days.querySelector('.ccdr-day'))throw Error('Daily rail rendered no day controls');
      old.classList.add('ccsd-protected-rail-on');
      holLoad(function(){if(rail.isConnected)refresh();});
    }catch(err){
      rail.remove();
      if(typeof global.console!=='undefined')global.console.error('[Daily cake demand] Protected module mount failed; previous chart preserved',err);
      return false;
    }
    return true;
  }
  global[NAME]={version:VERSION,rangeStart:MIN,rangeEnd:MAX,maxRenderedDays:MAX_VISIBLE,
    dayStat:dayStat,indexOrders:indexOrders,mount:mount,holidaysOn:holOn,holidays:function(){return HOL.list.slice();}};
})(typeof window!=='undefined'?window:globalThis);
