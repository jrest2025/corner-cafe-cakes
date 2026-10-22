'use strict';
const assert=require('node:assert/strict');
const A=require('../src/staff.analytics-expansion.js');
const orders=[
 {c:'a',pd:'2026-10-20',oc:'birthday',cp:'recorded',st:'completed',cv:100,ref:0,it:[['cake','vanilla',8,2,50]],placed:'2026-10-15'},
 {c:'a',pd:'2026-10-21',oc:'birthday',cp:'recorded',st:'completed',cv:80,it:[['cake','chocolate',6,1,80]],placed:'2026-10-21'},
 {c:'b',pd:'2026-10-22',oc:'not_specified',cp:'assumed',st:'completed',lv:60,it:[['cake','vanilla',6,1,60]],placed:'2026-10-19'},
 {c:'c',pd:'2026-10-22',oc:'wedding',cp:'recorded',st:'cancelled',cv:500,it:[],placed:'2026-10-10'},
 {c:'d',pd:'2026-10-22',oc:'other',cp:'pending',st:'confirmed',cv:250,it:[],placed:'2026-10-19'}
];
const input=JSON.stringify(orders);
const s=A.summarize(orders,{from:'2026-10-20',to:'2026-10-22',createdDate:o=>o.placed});
assert.equal(s.completedOrders,3);
assert.equal(s.cakesSold,4);
assert.equal(s.netSales,240);
assert.equal(s.averageOrderValue,80);
assert.equal(s.distinctCustomers,2);
assert.equal(s.multipleOrdersInPeriod,1);
assert.equal(s.repeatWithinPeriodRate,0.5);
assert.equal(s.leadTime.medianDays,3);
assert.deepEqual(s.leadTime.buckets.map(b=>b.count),[1,0,1,1,0,0]);
assert.equal(s.occasionMissing,1);
assert.equal(JSON.stringify(orders),input,'must not mutate production registers');
const withoutDate=A.summarize(orders);
assert.equal(withoutDate.leadTime.validOrders,0,'never guess the order-created date');
assert.equal(withoutDate.leadTime.missingOrders,3);
assert.equal(A.days('2026-10-21','2026-10-22'),1);
console.log('Cake analytics expansion: 13 assertions passed');
