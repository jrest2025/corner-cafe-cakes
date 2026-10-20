// Render real tab functions using invented records; no database calls.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),cp=require('child_process');
const ctx={setTimeout:()=>{}};
vm.runInNewContext(fs.readFileSync('src/staff.analytics-tabs.js','utf8'),ctx);
const api=ctx.CCAnalyticsTabs;
const x={head:'',mods:[],state:()=>'',st:{},f:{p:'all',prod:'all',ch:'all',occ:'all'},r:{all:true,from:'2026-10-13',to:'2026-10-20'},launch:'2026-10-13',
 today:()=> '2026-10-20',addDays:(s,n)=>new Date(Date.parse(s+'T12:00Z')+n*86400000).toISOString().slice(0,10),days:(a,b)=>(Date.parse(b)-Date.parse(a))/86400000,
 data:{orders:[],products:[{on:true,n:'Chocolate'}]},cur:[],cs:{n:0,c:0,v:0,aov:0},owing:[],secs:[],items:o=>o.it||[],match:()=>true,occName:s=>s,src:{},
 money:n=>'$'+n.toFixed(2),num:String,owed:l=>l.reduce((s,o)=>s+o.bal,0),exVat:()=>0,value:o=>o.cv,key:()=> 'drill',dateOf:o=>o.pd};
let html=api.page('pd',x);
assert.match(html,/Low sales share/);assert.match(html,/No completed sales in this period to assess/);assert.doesNotMatch(html,/Slow sellers/);
assert.ok(html.indexOf('data-cat-todo')<html.indexOf('aria-label="Cakes ranked"'));
assert.match(html,/Use this to/);
const orders=Array.from({length:5},(_,i)=>({c:'c'+i,oc:'birthday',cp:'recorded',pd:'2026-10-18',cv:100,it:[['Chocolate','Chocolate','6',2,50]]}));
x.data.orders=orders;x.cur=orders;x.cs={n:5,c:10,v:500,aov:100};
html=api.page('pd',x);assert.match(html,/100%<\/b><em>of cakes · 5 orders/);
x.data.orders=[{pay:[['payment',40,'2026-10-18']],bal:30,pd:'2026-10-19'},{pay:[['payment',60,'2026-10-18']],bal:70,pd:'2026-10-22'}];x.owing=x.data.orders;
html=api.page('sl',x);
assert.match(html,/Payments collected/);assert.match(html,/Included in total still owed/);
const money=html.slice(html.indexOf('<div class="cat-money">'));
assert.match(money,/\$100.00/);assert.match(money,/\$30.00/);
assert.equal(api.page('ov',x),null,'Overview remains handled by original app');
// Verify the entire published bundle outside these two presentation replacements is unchanged.
const m=JSON.parse(fs.readFileSync('dist/app/staff-analytics-purpose-manifest.json'));
let candidate=fs.readFileSync(m.file,'utf8');
for(const name of ['js','css']){
 const path='src/staff.analytics-tabs.'+name;
 const old=cp.execFileSync('git',['show','e7a032ecd58c6ebe50148d008a418acfe78ec5fd:'+path],{encoding:'utf8'});
 const now=fs.readFileSync(path,'utf8');
 // Python json.dumps has spaces after separators and ASCII-escapes non-ASCII characters.
 const pyjson=s=>JSON.stringify(s).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 candidate=candidate.replace(name==='css'?pyjson(now):now,name==='css'?pyjson(old):old);
}
assert.equal(candidate,fs.readFileSync(m.base,'utf8'));
console.log('PASS: empty sales, occasion units, action order, money values, Overview exclusion and unchanged core bundle');
