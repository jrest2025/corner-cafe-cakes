/* Run with: node tests/demand-rail-contract.test.cjs
 * This test must pass before pinning the protected module in Webflow. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('src/staff.demand-rail.locked.js','utf8');
const normalize=(source,today)=>source.filter(o=>o.st!=='cancelled').map(o=>({pd:o.pd,od:o.od,
  st:o.st,booked:!!(o.odok&&o.od<=today),qty:o.qty}));
const w={CCCakeSeasonalStage:{normalize},setTimeout:(f)=>f(),requestAnimationFrame:(f)=>f()};
vm.runInNewContext(script,{window:w,Date,Math,Number,Array,Object,String,Intl,console}, {filename:'rail.js'});
const api=w.CCCakeDemandRail;
assert.equal(api.version,'1.0.0');
assert.equal(api.rangeEnd,'2027-12-31');
assert.equal(api.rangeStart,'2024-01-01');
assert.ok(api.maxRenderedDays<=62);
const orders=[
 {od:'2026-10-18',pd:'2027-12-25',odok:true,st:'confirmed',qty:4},
 {od:'2026-10-18',pd:'2027-12-25',odok:true,st:'cancelled',qty:7},
 {od:'2026-10-18',pd:'2026-10-21',odok:false,st:'received',qty:2}
];
const data=api.indexOrders(orders,'2026-10-19',normalize);
assert.equal(api.dayStat(data,'2026-10-18','2026-10-19').booked,4);
assert.equal(api.dayStat(data,'2027-12-25','2026-10-19').due,4);
assert.equal(api.dayStat(data,'2027-12-25','2026-10-19').booked,null);
assert.equal(api.dayStat(data,'2026-10-21','2026-10-19').due,0);
assert.equal(api.dayStat(data,'2024-01-01','2026-10-19').booked,null);
console.log('Protected Daily Cake Demand contract: PASS');
