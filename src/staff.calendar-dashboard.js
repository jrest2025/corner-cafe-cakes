/* Corner Cafe calendar visuals: progressive enhancement over the existing calendar.
   Counts are read from the already-filtered CRM month grid; no extra API or permissions. */
(function(){
  'use strict';
  if(window.__ccCalendarV3)return;
  window.__ccCalendarV3=true;
  var root=document.getElementById('cc-staff');
  if(!root)return;
  var scheduled=false;

  function ensure(parent,selector,tag,className){
    var el=parent.querySelector(selector);
    if(!el){el=document.createElement(tag);el.className=className;parent.appendChild(el);}
    return el;
  }
  function render(){
    scheduled=false;
    var main=root.querySelector('#ccs-main[data-screen="calendar"]');
    if(!main)return;
    var grid=main.querySelector('.ccs-mgrid');
    var summary=main.querySelector('.ccv-summary');
    if(!grid){if(summary)summary.remove();return;}
    if(!main.querySelector('.ccs-caltitle'))return;

    var cells=Array.prototype.slice.call(grid.querySelectorAll('.ccs-mcell'));
    var current=cells.filter(function(cell){return !cell.classList.contains('is-out');});
    var orders=0,cakes=0,busy=0;
    var selectedIndex=cells.findIndex(function(cell){return cell.classList.contains('is-sel');});
    var selectedWeek=selectedIndex>=0?Math.floor(selectedIndex/7):-1;

    cells.forEach(function(cell,index){
      var button=cell.querySelector('.ccs-mday');
      if(!button)return;
      var count=cell.querySelector('.ccs-mcount .ccs-mlong');
      var line=count?(count.textContent||''):'';
      var a=/([0-9]+)\s+orders?/.exec(line);
      var b=/([0-9]+)\s+cakes?/.exec(line);
      var n=a?+a[1]:0, q=b?+b[1]:0;

      if(!cell.classList.contains('is-out')){
        orders+=n;
        cakes+=q;
        if(n>=3)busy++;
      }
      cell.classList.toggle('ccv-load-medium',n===2);
      cell.classList.toggle('ccv-load-high',n>=3);
      cell.classList.toggle('ccv-week-focused',selectedWeek>=0&&Math.floor(index/7)===selectedWeek);
      cell.classList.toggle('ccv-has-volume',n>0);

      var bar=button.querySelector('.ccv-activity');
      if(n>0&&!cell.classList.contains('is-out')){
        if(!bar){
          bar=document.createElement('span');
          bar.className='ccv-activity';
          bar.setAttribute('aria-hidden','true');
          for(var i=0;i<4;i++)bar.appendChild(document.createElement('i'));
          button.appendChild(bar);
        }
        var active=Math.min(n,4);
        Array.prototype.forEach.call(bar.children,function(segment,i){
          segment.classList.toggle('is-active',i<active);
        });
      } else if(bar)bar.remove();
    });

    var wrap=main.querySelector('.ccs-calwrap');
    if(!wrap)return;
    if(!summary){
      summary=document.createElement('div');
      summary.className='ccv-summary';
      summary.setAttribute('aria-label','Calendar month totals');
      wrap.parentNode.insertBefore(summary,wrap);
    }
    var values=[[orders,'Orders this month'],[cakes,'Cakes scheduled'],[busy,'Busy days · 3+ orders']];
    values.forEach(function(pair,i){
      var card=summary.children[i];
      if(!card){
        card=document.createElement('div');
        card.className='ccv-stat';
        summary.appendChild(card);
      }
      var val=ensure(card,'.ccv-stat-num','strong','ccv-stat-num');
      var lab=ensure(card,'.ccv-stat-label','span','ccv-stat-label');
      var number=String(pair[0]);
      if(val.textContent!==number)val.textContent=number;
      if(lab.textContent!==pair[1])lab.textContent=pair[1];
    });
  }

  var observer=new MutationObserver(function(records){
    if(scheduled)return;
    var changed=records.some(function(record){
      var el=record.target.nodeType===1?record.target:record.target.parentElement;
      return el&&!el.closest('.ccv-summary')&&!el.closest('.ccv-activity');
    });
    if(!changed)return;
    scheduled=true;
    queueMicrotask(render);
  });
  observer.observe(root,{childList:true,subtree:true});
  render();
})();