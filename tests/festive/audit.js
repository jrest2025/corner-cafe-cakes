(async function(){
  const vw=innerWidth, vh=innerHeight, out={vw,vh};
  out.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  out.wideEls = [...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1)}).slice(0,6).map(e=>e.tagName+'.'+String(e.className).split(' ')[0]+' '+Math.round(e.getBoundingClientRect().right));
  const taps=[...document.querySelectorAll('main a, main button, main input, main select, main textarea, main summary, main label.ccfest-product-row')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
  out.smallTaps = taps.filter(e=>{const r=e.getBoundingClientRect(); return r.height<44 && !(e.type==='checkbox')}).map(e=>(e.textContent||e.value||e.name||e.type||'').trim().slice(0,30)+' '+Math.round(e.getBoundingClientRect().height)+'px').slice(0,12);
  const hero=document.querySelector('.ccfest-hero'); const btn=document.querySelector('.ccfest-actions a');
  out.heroCtaAboveFold = btn ? Math.round(btn.getBoundingClientRect().bottom) <= vh : null;
  out.heroHeight = hero ? Math.round(hero.getBoundingClientRect().height) : null;
  out.h1Size = parseFloat(getComputedStyle(document.querySelector('h1')).fontSize);
  out.bodyText = [...document.querySelectorAll('main p')].map(p=>parseFloat(getComputedStyle(p).fontSize)).filter(Boolean).sort((a,b)=>a-b)[0];
  out.links = [...document.querySelectorAll('main a[href^="#"]')].map(a=>a.textContent.trim().slice(0,30)+' -> '+a.getAttribute('href')+(document.querySelector(a.getAttribute('href'))?'':' (MISSING TARGET)'));
  out.sectionsTop = [...document.querySelectorAll('main > section')].map(s=>(s.className.split(' ')[0])+':'+Math.round(s.getBoundingClientRect().top+scrollY)+'/'+Math.round(s.getBoundingClientRect().height));
  out.bgs = [...document.querySelectorAll('main > section')].map(s=>s.className.split(' ')[0]+':'+getComputedStyle(s).backgroundColor);
  out.catCols = (()=>{const g=document.querySelector('.ccc-grid'); return g? getComputedStyle(g).gridTemplateColumns.split(' ').length : null})();
  out.formCols = (()=>{const g=document.querySelector('.ccfest-order-grid'); return g? getComputedStyle(g).gridTemplateColumns : null})();
  out.dateInputs = [...document.querySelectorAll('input[type=date],input[type=time]')].map(i=>i.type+':'+Math.round(i.getBoundingClientRect().width)+'x'+Math.round(i.getBoundingClientRect().height));
  return out;
})()
