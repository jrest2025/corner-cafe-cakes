// Calendar viewport sizing. Operates on the rendered UI without touching records.
(function(){
 var scheduled=false,wasCalendar=false;
 function fit(){
  scheduled=false;
  var main=document.getElementById('ccs-main'),g=document.querySelector('#cc-staff .ccs-mgrid');
  if(!main||!g){wasCalendar=false;return;}
  if(!wasCalendar){main.scrollTop=0;wasCalendar=true;}
  var days=[].slice.call(g.querySelectorAll('.ccs-mcell')),weeks=Math.ceil(days.length/7)||5;
  var mr=main.getBoundingClientRect(),gr=g.getBoundingClientRect();
  var bottom=parseFloat(getComputedStyle(main).paddingBottom)||24;
  var top=gr.top-mr.top+main.scrollTop;
  var available=Math.min(main.clientHeight,innerHeight-Math.max(0,mr.top))-top-bottom-2;
  var row=Math.floor(available/weeks);
  // Very short windows retain a readable minimum and one page scroll.
  if(innerWidth<760||row<96){g.classList.remove('vf-fit');g.style.removeProperty('--vf-row');return;}
  g.style.setProperty('--vf-row',row+'px');g.classList.add('vf-fit');
  [].forEach.call(g.querySelectorAll('.ccs-mday'),function(day){
   var cakes=[].slice.call(day.querySelectorAll('.co-cake'));if(!cakes.length)return;
   var wrap=cakes[0].parentNode,more=day.querySelector('.co-more');
   if(!wrap.hasAttribute('data-vf-total'))wrap.setAttribute('data-vf-total',cakes.length+(more?+(more.getAttribute('data-n')||0):0));
   var total=+wrap.getAttribute('data-vf-total'),shown=cakes.length;
   wrap.classList.remove('fit-none');cakes.forEach(function(c){c.classList.remove('fit-hide');c.hidden=false;});
   function label(){
    if(!more&&total>shown){more=document.createElement('span');more.className='co-more';wrap.appendChild(more);}
    if(more){more.hidden=shown===total;more.textContent='View all '+total+' orders';}
   }
   function fits(){
    var end=day.getBoundingClientRect().bottom-6;
    var last=shown?cakes[shown-1].getBoundingClientRect().bottom:0;
    var link=more&&!more.hidden?more.getBoundingClientRect().bottom:0;
    return Math.max(last,link)<=end;
   }
   label();while(shown>0&&!fits()){shown--;cakes[shown].hidden=true;label();}
  });
 }
 function soon(){if(scheduled)return;scheduled=true;requestAnimationFrame(fit);}
 var root=document.getElementById('cc-staff');if(!root)return;
 new MutationObserver(function(ms){if(ms.some(function(m){return !m.target.closest||!m.target.closest('.ccs-mday');}))soon();}).observe(root,{childList:true,subtree:true});
 addEventListener('resize',soon,{passive:true});soon();
})();
