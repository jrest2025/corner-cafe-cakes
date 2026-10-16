<script>
/* Festive menu from the Webflow CMS (Festive Hampers, Festive Goodies), 16 October 2026.
   Edit names, prices, wording, photos and order in the Webflow CMS. This script only:
   sorts cards by "Order on page", hides an empty note or photo, builds the order form's
   product list from the cards, and makes "Add to my order" tick the matching product. */
document.addEventListener('DOMContentLoaded',function(){
  var menu=document.getElementById('festive-menu'); if(!menu)return;
  [].slice.call(menu.querySelectorAll('.w-dyn-items')).forEach(function(list){
    var items=[].slice.call(list.children), n=function(el){var s=el.querySelector('[data-festive-sort]');var v=parseFloat(s&&s.textContent);return isNaN(v)?9999:v;};
    items.sort(function(a,b){return n(a)-n(b);}).forEach(function(i){list.appendChild(i);});
  });
  [].slice.call(menu.querySelectorAll('.ccfest-card')).forEach(function(c){
    var img=c.querySelector('img'), src=img&&img.getAttribute('src')||'';
    if(!src||/placeholder/i.test(src))c.classList.add('is-nophoto');
    var note=c.querySelector('.ccfest-card-note'); if(note&&!note.textContent.trim())note.style.display='none';
  });
  var cards=[].slice.call(menu.querySelectorAll('[data-festive-item]'));
  var picker=document.getElementById('festive-product-picker'), list=picker&&picker.querySelector('.ccfest-product-list');
  if(list&&cards.length){
    var tpl=list.querySelector('.ccfest-product-row');
    if(tpl){
      tpl=tpl.cloneNode(true); list.innerHTML='';
      cards.forEach(function(c,ix){
        var name=(c.getAttribute('data-festive-item')||'').trim(); if(!name)return;
        var price=(c.getAttribute('data-festive-price')||'').trim(), pack=(c.getAttribute('data-festive-pack')||'').trim();
        var label=name+(pack?', '+pack:'')+(price?' ('+price+')':'');
        var r=tpl.cloneNode(true), box=r.querySelector('input[type="checkbox"]'), qty=r.querySelector('input[type="number"]');
        var id='festive-item-'+(ix+1);
        if(box){box.id=id;box.name=label;box.setAttribute('data-name',label);box.checked=false;}
        if(qty){qty.id=id+'-quantity';qty.name=label+' - Quantity';qty.value='';}
        var nm=r.querySelector('.ccfest-product-check > span:last-child'); if(nm)nm.textContent=label;
        [].slice.call(r.querySelectorAll('.w--redirected-checked')).forEach(function(e){e.classList.remove('w--redirected-checked');});
        c.setAttribute('data-festive-row',label);
        list.appendChild(r);
      });
    }
  }
  [].slice.call(menu.querySelectorAll('.ccfest-card-add')).forEach(function(a){
    a.addEventListener('click',function(){
      var c=a.closest('[data-festive-item]'), label=c&&c.getAttribute('data-festive-row'); if(!label)return;
      [].slice.call(document.querySelectorAll('#festive-product-picker input[type="checkbox"]')).forEach(function(b){
        if(b.name===label&&!b.checked){b.checked=true;b.dispatchEvent(new Event('change',{bubbles:true}));}
      });
    });
  });
});
</script>
