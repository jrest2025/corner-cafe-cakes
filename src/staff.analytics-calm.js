/* Corner Cafe Cake CRM — calmer Analytics (22 October 2026, Roneel: "reduce the text so the dashboards feel more clean").
 * Presentation only, applied to what is on screen: shorter labels, one-line descriptions removed where the heading says it,
 * and the long explanations under a chart folded into "About this chart" (one tap away, not deleted).
 * No figure, chart, calculation, workflow or data change. The protected Daily Cake Demand module is not edited: this only
 * shortens its on-screen labels after it has drawn, and if anything is missing it simply does nothing.
 */
(function(global){
  'use strict';
  if(global.__ccCalm)return;global.__ccCalm='1.0.0';
  var doc=global.document;if(!doc)return;
  var TEXT=[ /* [selector, exact old text, new text] */
    ['#cc-demand-scroll-rail .ccdr-green','Solid green — cakes due for pickup','Cakes due for pickup'],
    ['#cc-demand-scroll-rail .ccdr-purple','Dashed purple — cakes booked that day','Cakes booked that day'],
    ['#cc-demand-scroll-rail .ccdr-hk-lbl','Holidays and events, tap to show or hide:','Holidays:'],
    ['#cc-demand-scroll-rail .ccdr-hk-x','Hollow: date expected','Hollow: expected']
  ];
  var HIDE=[ /* one-line descriptions the heading already says */
    '#cc-demand-scroll-rail .ccdr-head p',
    '#cc-demand-scroll-rail .ccdr-legend-note'
  ];
  var HIDE_TEXT=[ /* [selector, exact text] */
    ['#ccs-main p','Worked out from live orders · updated every minute'],
    ['#ccs-main p','Bookings, cake demand and product trends'],
    ['#ccs-main p','Cakes booked by each checkpoint for pickups near an occasion.']
  ];
  var FOLD=['#cc-demand-scroll-rail .ccdr-footnote','#ccs-main .ccsd-season-note'];
  function css(){if(doc.getElementById('cc-calm-style'))return;var st=doc.createElement('style');st.id='cc-calm-style';st.textContent=
    '#cc-staff .cc-calm-hide{display:none!important}'+
    '#cc-staff details.cc-why{margin:10px 0 0}#cc-staff details.cc-why>summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:#475467;font-size:13px;font-weight:600;list-style:none}'+
    '#cc-staff details.cc-why>summary::-webkit-details-marker{display:none}#cc-staff details.cc-why>summary:before{content:"i";display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1.5px solid currentColor;font:700 11px/1 Georgia,serif;font-style:italic}'+
    '#cc-staff details.cc-why[open]>summary{color:#1d2939}#cc-staff details.cc-why>*:not(summary){margin-top:8px}'+
    '@media (min-width:600px) and (max-width:1199px),(pointer:coarse) and (min-width:600px){#cc-staff details.cc-why>summary{min-height:56px;font-size:17px}}'+
    '@media (max-width:599px){#cc-staff details.cc-why>summary{min-height:48px;font-size:16px}}';
    doc.head.appendChild(st);}
  function label(el,from,to){ /* change only the text node that holds the label, leave icons and controls */
    for(var i=0;i<el.childNodes.length;i++){var n=el.childNodes[i];if(n.nodeType===3&&n.textContent.trim()===from){n.textContent=n.textContent.replace(from,to);return;}}
    if(el.childNodes.length===1&&el.textContent.trim()===from)el.textContent=to;}
  function run(){
    var main=doc.querySelector('#cc-staff #ccs-main');if(!main||main.getAttribute('data-screen')!=='dash')return;
    css();
    TEXT.forEach(function(t){main.querySelectorAll(t[0]).forEach(function(el){label(el,t[1],t[2]);});});
    HIDE.forEach(function(s){main.querySelectorAll(s).forEach(function(el){if(!el.classList.contains('cc-calm-hide'))el.classList.add('cc-calm-hide');});});
    HIDE_TEXT.forEach(function(t){main.querySelectorAll(t[0]).forEach(function(el){if(el.textContent.trim()===t[1]&&!el.classList.contains('cc-calm-hide'))el.classList.add('cc-calm-hide');});});
    main.querySelectorAll('#cc-demand-scroll-rail .ccdr-actions label').forEach(function(l){label(l,'Jump to month','');});
    FOLD.forEach(function(s){main.querySelectorAll(s).forEach(function(n){if(n.closest('details.cc-why')||!n.parentNode)return;
      var d=doc.createElement('details');d.className='cc-why';d.innerHTML='<summary>About this chart</summary>';n.parentNode.insertBefore(d,n);d.appendChild(n);});});
  }
  var q=0;function later(){if(!q)q=global.requestAnimationFrame(function(){q=0;try{run();}catch(e){if(global.console)console.warn('[Calmer Analytics] skipped',e);}});}
  new MutationObserver(later).observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-screen']});
  later();
})(typeof window!=='undefined'?window:globalThis);
