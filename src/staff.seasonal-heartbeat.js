/* Corner Cafe / seasonal demand heartbeat: separate from cake demand.
 * Read-only; uses the Seasonal Orders staff dataset and existing staff permissions.
 * Leads = new requests, confirmed demand = booked product units.
 */
(function(win,doc){
'use strict';
if(win.__ccSeasonalHeartbeatV1)return;win.__ccSeasonalHeartbeatV1=true;
var range=14,last='',attempts=0,styleId='cc-seasonal-heartbeat-style';
var CSS="\n#cc-staff #cc-to .cc-hb{margin:0 0 18px;padding:18px;border:1px solid #cbded1;border-radius:13px;background:linear-gradient(145deg,#f5faf6,#fff);color:#243b2e;box-shadow:0 3px 16px rgba(22,62,40,.06)}\n#cc-staff #cc-to .cc-hb-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}\n#cc-staff #cc-to .cc-hb-icon{display:grid;place-items:center;background:#e5f2e8;color:#235e3d;border:1px solid #a5ceae;border-radius:11px;width:43px;height:43px;flex:none}\n#cc-staff #cc-to .cc-hb-headcopy{flex:1;min-width:150px}\n#cc-staff #cc-to .cc-hb h3{font-size:20px;line-height:1.25;font-weight:700;color:#183e2b;margin:0}\n#cc-staff #cc-to .cc-hb .cc-hb-desc{margin:4px 0 0;color:#526456;font-size:13px;line-height:1.4}\n#cc-staff #cc-to .cc-hb-toggle{display:flex;gap:4px;background:#e9f1eb;padding:4px;border-radius:9px;align-self:flex-start}\n#cc-staff #cc-to .cc-hb-toggle button{border:0;border-radius:7px;padding:8px 12px;background:transparent;color:#3e5748;font:700 13px/1.2 inherit;cursor:pointer;min-height:36px}\n#cc-staff #cc-to .cc-hb-toggle button[aria-pressed=true]{background:#fff;color:#20573d;box-shadow:0 1px 4px #c7d4c9}\n#cc-staff #cc-to .cc-hb button:focus-visible{outline:3px solid #286c49;outline-offset:2px}\n#cc-staff #cc-to .cc-hb-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 16px}\n#cc-staff #cc-to .cc-hb-kpi{border:1px solid #dce8de;border-radius:10px;padding:12px;background:#fff;min-width:0}\n#cc-staff #cc-to .cc-hb-kpi b{display:block;font-size:26px;line-height:1.1;color:#173d2e;font-weight:700}\n#cc-staff #cc-to .cc-hb-kpi span{display:block;font-size:12px;line-height:1.3;color:#55665c;margin-top:6px}\n#cc-staff #cc-to .cc-hb-kpi.is-leads{background:#fffaf2;border-color:#eddcc5}\n#cc-staff #cc-to .cc-hb-kpi.is-leads b{color:#90541b}\n#cc-staff #cc-to .cc-hb-body{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(205px,.8fr);gap:16px}\n#cc-staff #cc-to .cc-hb-panel{background:#fff;border:1px solid #dce8de;border-radius:10px;padding:12px;min-width:0}\n#cc-staff #cc-to .cc-hb-panel-head{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px}\n#cc-staff #cc-to .cc-hb-panel h4{font-size:15px;line-height:1.3;font-weight:700;color:#234632;margin:0}\n#cc-staff #cc-to .cc-hb-legend{display:flex;gap:11px;flex-wrap:wrap;font-size:11px;color:#4e5d53}\n#cc-staff #cc-to .cc-hb-dot{display:inline-block;width:10px;height:10px;margin-right:4px;border-radius:3px;background:#328660;vertical-align:middle}\n#cc-staff #cc-to .cc-hb-dot.is-request{background:#dda763}\n#cc-staff #cc-to .cc-hb-scroll{overflow-x:auto;max-width:100%;padding-bottom:5px;scrollbar-width:thin}\n#cc-staff #cc-to .cc-hb-bars{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(36px,1fr);column-gap:7px;min-width:510px;padding-top:8px}\n#cc-staff #cc-to .cc-hb-day{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}\n#cc-staff #cc-to .cc-hb-value{display:block;font-size:11px;font-weight:700;color:#31523b;min-height:16px}\n#cc-staff #cc-to .cc-hb-column{height:108px;width:100%;max-width:25px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:5px 5px 0 0;overflow:hidden;background:#eff4ef}\n#cc-staff #cc-to .cc-hb-col-r{background:#dda763;min-height:0}\n#cc-staff #cc-to .cc-hb-col-c{background:#328660;min-height:0}\n#cc-staff #cc-to .cc-hb-axis{display:block;font-size:10px;color:#66766b;white-space:nowrap;margin-top:5px}\n#cc-staff #cc-to .cc-hb-trend{height:112px;display:flex;align-items:center}\n#cc-staff #cc-to .cc-hb-trend svg{height:100%;width:100%;overflow:visible}\n#cc-staff #cc-to .cc-hb-trend-label{margin:2px 0 0;font-size:12px;color:#526456;line-height:1.4}\n#cc-staff #cc-to .cc-hb-foot{font-size:12px;line-height:1.5;color:#55695e;margin:11px 0 0}\n#cc-staff #cc-to .cc-so-strip{display:none}\n@media(max-width:900px){#cc-staff #cc-to .cc-hb-body{grid-template-columns:1fr}#cc-staff #cc-to .cc-hb-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:560px){#cc-staff #cc-to .cc-hb{padding:12px;margin-bottom:12px}#cc-staff #cc-to .cc-hb h3{font-size:17px}#cc-staff #cc-to .cc-hb-head{gap:8px}#cc-staff #cc-to .cc-hb-kpi{padding:9px}#cc-staff #cc-to .cc-hb-kpi b{font-size:23px}#cc-staff #cc-to .cc-hb-bars{min-width:440px}#cc-staff #cc-to .cc-hb-panel{padding:10px}}\n@media(prefers-reduced-motion:reduce){#cc-staff #cc-to .cc-hb *{transition:none!important;animation:none!important}}\n";
;
function addStyle(){if(doc.getElementById(styleId))return;var x=doc.createElement('style');x.id=styleId;x.textContent=CSS;doc.head.appendChild(x)}
function iso(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date())}
function plus(date,n){var d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dayName(x){var d=new Date(x+'T12:00:00Z');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}
function safeNum(v){var n=Number(v);return Number.isFinite(n)&&n>0?n:0}
function units(o){return (o.items||[]).reduce(function(n,i){return n+safeNum(i.quantity)},0)}
function creationDay(o){if(!o.created_at)return '';var d=new Date(o.created_at);return isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(d)}
function dataset(){var api=win.__ccTreatOrders,d=api&&api.data&&api.data();if(!d||!Array.isArray(d.orders))return null;return d.orders.filter(function(o){return o&&o.status!=='cancelled'})}
function node(tag,cls,txt){var n=doc.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=String(txt);return n}
function makeKpi(parent,value,title,extra){var n=node('div','cc-hb-kpi'+(extra?' is-leads':''));n.appendChild(node('b','',value));n.appendChild(node('span','',title));parent.appendChild(n)}
function parseOrders(orders){
 var t=iso(),end=plus(t,13),from=plus(t,-6);
 var upcoming=orders.filter(function(o){return o.status==='confirmed'&&o.pickup_date>=t&&o.pickup_date<=end});
 var leads=orders.filter(function(o){return o.status==='new'});
 var arrivals=orders.filter(function(o){var c=creationDay(o);return !!c&&c>=from&&c<=t});
 return {today:t,confirmed:upcoming,newLeads:leads,arrivals:arrivals,corpLeads:leads.filter(function(o){return o.kind==='bulk'}).length,qty:upcoming.reduce(function(v,o){return v+units(o)},0)};
}
function chartDays(all,t,n){var days=[];for(var i=0;i<n;i++){var date=plus(t,i),items=all.filter(function(o){return o.pickup_date===date}),confirmed=items.filter(function(o){return o.status==='confirmed'}).reduce(function(v,o){return v+units(o)},0),requested=items.filter(function(o){return o.status==='new'}).reduce(function(v,o){return v+units(o)},0);days.push({date:date,confirmed:confirmed,requested:requested})}return days}
function plotDays(host,rows){var max=Math.max.apply(null,[1].concat(rows.map(function(x){return x.confirmed+x.requested}))),bar=node('div','cc-hb-bars');bar.setAttribute('role','img');bar.setAttribute('aria-label','Upcoming daily confirmed and requested seasonal item quantities');
rows.forEach(function(x){
 var col=node('div','cc-hb-day'),tot=x.confirmed+x.requested;
 col.title=dayName(x.date)+': '+x.confirmed+' booked units, '+x.requested+' requested units';
 col.appendChild(node('span','cc-hb-value',tot||'·'));
 var b=node('div','cc-hb-column');
 var hc=tot?Math.round(x.confirmed/max*108):0,hr=tot?Math.round(x.requested/max*108):0;
 if(x.requested&&hr<3)hr=3;if(x.confirmed&&hc<3)hc=3;
 b.appendChild(node('div','cc-hb-col-r'));b.lastChild.style.height=hr+'px';
 b.appendChild(node('div','cc-hb-col-c'));b.lastChild.style.height=hc+'px';
 col.appendChild(b);col.appendChild(node('span','cc-hb-axis',dayName(x.date)));bar.appendChild(col);
});host.appendChild(bar)}
function makeTrend(host,orders,t){var dates=[];for(var i=6;i>=0;i--)dates.push(plus(t,-i));
var counts=dates.map(function(day){return orders.filter(function(o){return creationDay(o)===day}).length});
var max=Math.max.apply(null,[1].concat(counts)),coords=counts.map(function(v,i){return (10+i*30)+','+(92-v/max*72)});
var svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 200 104');svg.setAttribute('role','img');svg.setAttribute('aria-label','New seasonal enquiries over the last seven days: '+counts.join(', ')+' by day');
var baseline=doc.createElementNS('http://www.w3.org/2000/svg','line');baseline.setAttribute('x1','10');baseline.setAttribute('x2','190');baseline.setAttribute('y1','92');baseline.setAttribute('y2','92');baseline.setAttribute('stroke','#d9e7dd');svg.appendChild(baseline);
var area=doc.createElementNS('http://www.w3.org/2000/svg','polyline');area.setAttribute('points',coords.join(' '));area.setAttribute('fill','none');area.setAttribute('stroke','#b77532');area.setAttribute('stroke-width','3');area.setAttribute('stroke-linecap','round');area.setAttribute('stroke-linejoin','round');svg.appendChild(area);
counts.forEach(function(v,i){var circ=doc.createElementNS('http://www.w3.org/2000/svg','circle');circ.setAttribute('cx',String(10+i*30));circ.setAttribute('cy',String(92-v/max*72));circ.setAttribute('r',v>0?'4':'2.5');circ.setAttribute('fill','#b77532');svg.appendChild(circ)});
host.appendChild(svg);
return counts}
function build(host,orders,info){
addStyle();var parent=node('section','cc-hb');parent.setAttribute('aria-label','Seasonal demand heartbeat');
var hd=node('div','cc-hb-head'),icon=node('span','cc-hb-icon','♥');icon.setAttribute('aria-hidden','true'),copy=node('div','cc-hb-headcopy');
copy.appendChild(node('h3','','Seasonal Orders Heartbeat'));copy.appendChild(node('p','cc-hb-desc','Festive enquiries and production demand · separate from cake orders'));
hd.appendChild(icon);hd.appendChild(copy);
var sw=node('div','cc-hb-toggle');sw.setAttribute('role','group');sw.setAttribute('aria-label','Forecast horizon');
[7,14].forEach(function(n){var b=node('button','',n+' days');b.type='button';b.setAttribute('aria-pressed',String(range===n));b.dataset.ccHbRange=String(n);sw.appendChild(b)});
hd.appendChild(sw);parent.appendChild(hd);
var k=node('div','cc-hb-kpis');makeKpi(k,info.newLeads.length,'Awaiting confirmation',true);makeKpi(k,info.arrivals.length,'New order enquiries · last 7 days',true);
makeKpi(k,info.confirmed.length,'Confirmed orders · next 14 days');makeKpi(k,info.qty,'Confirmed goodies · next 14 days');parent.appendChild(k);
var body=node('div','cc-hb-body'),left=node('div','cc-hb-panel'),right=node('div','cc-hb-panel');
var lh=node('div','cc-hb-panel-head');lh.appendChild(node('h4','','Upcoming item demand'));var legend=node('div','cc-hb-legend');[['cc-hb-dot','Booked'],['cc-hb-dot is-request','Unconfirmed request']].forEach(function(z){var l=node('span',''),dot=node('i',z[0]);dot.setAttribute('aria-hidden','true');l.appendChild(dot);l.appendChild(doc.createTextNode(z[1]));legend.appendChild(l)});lh.appendChild(legend);left.appendChild(lh);
var scroll=node('div','cc-hb-scroll');plotDays(scroll,chartDays(orders,info.today,range));left.appendChild(scroll);
right.appendChild(node('h4','','Enquiry heartbeat · last 7 days'));
var trend=node('div','cc-hb-trend');var counts=makeTrend(trend,orders,info.today);right.appendChild(trend);
right.appendChild(node('p','cc-hb-trend-label',counts.reduce(function(n,c){return n+c},0)+' incoming enquiries this week · '+info.corpLeads+' corporate enquiries awaiting confirmation'));
body.appendChild(left);body.appendChild(right);parent.appendChild(body);
parent.appendChild(node('p','cc-hb-foot','Green = confirmed product quantities scheduled by collection date. Gold = requested quantities not yet confirmed. Enquiries are counted when a request is submitted. No dates or payments are changed by this dashboard.'));
host.insertBefore(parent,host.firstChild);
parent.addEventListener('click',function(e){var b=e.target.closest('[data-cc-hb-range]');if(!b)return;var val=Number(b.dataset.ccHbRange);if(val!==7&&val!==14)return;range=val;last='';sync()});
}
function permanentHost(){
var body=doc.querySelector('#cc-staff #cc-to .cc-to-body');if(!body)return null;
var host=body.querySelector(':scope > .cc-hb-slot');
if(!host){host=node('div','cc-hb-slot');var list=body.querySelector(':scope > .cc-to-in');if(list)body.insertBefore(host,list);else body.insertBefore(host,body.firstChild)}
return host;
}
function sync(){
var host=permanentHost();if(!host)return;var all=dataset();
if(!all){if(!host.querySelector(':scope > .cc-hb-loading'))host.appendChild(node('p','cc-hb-loading','Loading seasonal demand from the CRM…'));return}
var loading=host.querySelector(':scope > .cc-hb-loading');if(loading)loading.remove();
var info=parseOrders(all),key=range+'|'+all.map(function(o){return [o.id,o.status,o.pickup_date,o.kind,o.created_at,units(o)].join(':')}).join('|');
var old=host.querySelector(':scope > .cc-hb');if(old&&key===last)return;
if(old)old.remove();build(host,all,info);last=key;
}
function start(){addStyle();setInterval(sync,2300);sync()}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);
