/* Cake CRM analytics expansion, additive calculation layer.
 * No DOM writes, no mutations of existing records, no change to protected
 * Heartbeat, Daily Cake Demand, seasonal rail, or occasion booking curve.
 * Existing register shape: {c, pd, oc, cp, st, it, cv, lv, ref, ...}.
 * Dates are Fiji calendar dates (YYYY-MM-DD), never local JS parsing.
 */
(function(root) {
  'use strict';
  function date(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }
  function days(a,b) { if (!date(a)||!date(b)) return null; return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000); }
  function amount(v) { var n=Number(v); return Number.isFinite(n)?n:0; }
  function sold(o) { return (o.cp==='recorded'||o.cp==='assumed') && o.st!=='cancelled'; }
  function cakes(o) { return (o.it||[]).reduce(function(n,i){return n+(Number(i[3])>0?Number(i[3]):1);},0); }
  function median(a) { if(!a.length)return null; var s=a.slice().sort(function(x,y){return x-y;});var m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2; }
  function summarize(orders, options) {
    options=options||{};
    var from=date(options.from),to=date(options.to), created=options.createdDate;
    var eligible=(orders||[]).filter(function(o){return o&&sold(o)&&date(o.pd)&&(!from||o.pd>=from)&&(!to||o.pd<=to);});
    var net=eligible.reduce(function(n,o){return n+amount(o.cv!=null?o.cv:o.lv)-amount(o.ref);},0);
    var units=eligible.reduce(function(n,o){return n+cakes(o);},0);
    var byOcc={},byCustomer={}, leads=[], bins=[0,0,0,0,0,0], missingOcc=0, missingLead=0;
    eligible.forEach(function(o){
      var occ=o.oc&&o.oc!=='not_specified'?o.oc:null;
      if(!occ)missingOcc++;else byOcc[occ]=(byOcc[occ]||0)+1;
      if(o.c)byCustomer[o.c]=(byCustomer[o.c]||0)+1;
      // Caller must provide a VERIFIED mapping to the actual order-created date.
      // No inferred date from pickup or import timestamp.
      var placed=typeof created==='function'?created(o):null;
      var lead=days(placed,o.pd);
      if(lead===null||lead<0){missingLead++;return;}
      leads.push(lead);
      bins[lead===0?0:lead<=2?1:lead<=5?2:lead<=10?3:lead<=20?4:5]++;
    });
    var customers=Object.keys(byCustomer), returning=customers.filter(function(id){return byCustomer[id]>=2;}).length;
    return {
      status:'actual', period:{from:from,to:to}, completedOrders:eligible.length,
      cakesSold:units, netSales:net, averageOrderValue:eligible.length?net/eligible.length:null,
      distinctCustomers:customers.length, multipleOrdersInPeriod:returning,
      repeatWithinPeriodRate:customers.length?returning/customers.length:null,
      // This is NOT true historical retention; orders outside the period are excluded.
      occasions:byOcc, occasionMissing:missingOcc,
      leadTime:{medianDays:median(leads), meanDays:leads.length?leads.reduce(function(a,b){return a+b;},0)/leads.length:null,
        buckets:[{label:'Same day',count:bins[0]},{label:'1–2 days',count:bins[1]},
          {label:'3–5 days',count:bins[2]},{label:'6–10 days',count:bins[3]},
          {label:'11–20 days',count:bins[4]},{label:'21+ days',count:bins[5]}],
        validOrders:leads.length, missingOrders:missingLead},
      quality:{ordersWithoutCustomer:eligible.filter(function(o){return !o.c;}).length,
        ordersWithoutOccasion:missingOcc, ordersWithoutVerifiedCreatedDate:missingLead}
    };
  }
  var api=Object.freeze({summarize:summarize,days:days});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CCCakeAnalyticsExpansion=api;
})(typeof window!=='undefined'?window:null);
