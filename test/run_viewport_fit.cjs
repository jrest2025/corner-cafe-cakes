// Geometry checks with a simulated DOM. Browser rendering is a separate outstanding check.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../src/staff.viewport-fit.js','utf8');let passed=0;
function test(w,h,weeks,gridTop,total){
 let value='',resize,scroll=70;const classes=new Set(),wrapAttrs={};
 const cl={add:x=>classes.add(x),remove:x=>classes.delete(x)};
 const wrap={hasAttribute:k=>k in wrapAttrs,setAttribute:(k,v)=>wrapAttrs[k]=String(v),getAttribute:k=>wrapAttrs[k],classList:{remove(){}},appendChild:e=>{more=e}};
 const cakes=Array.from({length:Math.min(3,total)},()=>({hidden:false,classList:{remove(){}},parentNode:wrap,getBoundingClientRect(){return{bottom:gridTop+50+cakes.slice(0,cakes.indexOf(this)+1).filter(x=>!x.hidden).length*28}}}));
 function link(){return{hidden:false,textContent:'',className:'co-more',getAttribute:k=>k==='data-n'?String(Math.max(0,total-3)):null,getBoundingClientRect:()=>({bottom:gridTop+50+cakes.filter(c=>!c.hidden).length*28+20})}}
 let more=total>3?link():null;
 const day={querySelectorAll:()=>cakes,querySelector:()=>more,getBoundingClientRect:()=>({bottom:gridTop+(parseInt(value)||180)})};
 const grid={classList:cl,style:{setProperty:(k,v)=>value=v,removeProperty:()=>value=''},querySelectorAll:q=>q==='.ccs-mcell'?Array(weeks*7).fill({}):[day],getBoundingClientRect:()=>({top:gridTop-scroll})};
 const main={get scrollTop(){return scroll},set scrollTop(n){scroll=n},clientHeight:h,getBoundingClientRect:()=>({top:0})};
 const ctx={innerWidth:w,innerHeight:h,document:{getElementById:()=>main,querySelector:()=>grid,createElement:()=>link()},getComputedStyle:()=>({paddingBottom:'24px'}),requestAnimationFrame:f=>f(),MutationObserver:class{observe(){}},addEventListener:(n,f)=>resize=f};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 assert.equal(scroll,0,'calendar entry starts at the top');passed++;
 if(w>=760&&Math.floor((h-gridTop-26)/weeks)>=96){
  assert(classes.has('vf-fit'),'fitted calendar is enabled');passed++;
  assert(gridTop+parseInt(value)*weeks<=h-24,'last week stays above bottom padding');passed++;
  assert(cakes.filter(c=>!c.hidden).every(c=>c.getBoundingClientRect().bottom<=day.getBoundingClientRect().bottom-6),'visible cakes stay inside date');passed++;
  if(cakes.some(c=>c.hidden)||total>3){assert.equal(more.textContent,'View all '+total+' orders');assert(!more.hidden);passed++;}
  ctx.innerHeight=1600;main.clientHeight=1600;resize();assert(cakes.every(c=>!c.hidden),'more room restores all three summaries');passed++;
  if(total>3)assert.equal(more.textContent,'View all '+total+' orders');
 }else{assert(!classes.has('vf-fit'),'short/phone screens retain readable scrolling');passed++;}
}
for(const [w,h,weeks,top,n] of [[2048,1034,5,300,5],[1920,990,6,280,8],[1366,900,5,280,4],[1024,1200,6,300,2],[1280,600,6,290,6],[390,760,5,280,5]])test(w,h,weeks,top,n);
console.log(passed+' geometry checks passed; browser rendering not verified.');
