document.addEventListener('DOMContentLoaded',function(){
  var picker=document.getElementById('festive-product-picker');
  var form=picker&&picker.closest('form');
  if(!picker||!form)return;
  // Read the product rows from the page itself, so the list never goes out of step with the form.
  var rows=[].slice.call(picker.querySelectorAll('.ccfest-product-row')).map(function(row){
    var box=row.querySelector('input[type="checkbox"]'), qty=row.querySelector('input[type="number"]');
    var name=(row.querySelector('.ccfest-product-check > span:last-child')||{}).textContent||(box&&box.getAttribute('data-name'))||'';
    return {row:row,box:box,qty:qty,name:name.trim()};
  }).filter(function(r){return r.box;});
  var business=document.getElementById('festive-business-order');
  var companyWrap=document.getElementById('festive-company-field');
  var company=document.getElementById('festive-company');
  var custom=document.getElementById('festive-custom-request');
  var summary=document.getElementById('festive-order-summary');
  var error=document.getElementById('festive-selection-error');
  function sync(){
    var lines=[];
    rows.forEach(function(r){
      var wrap=r.qty&&r.qty.closest('.ccfest-qty-wrap');
      if(r.qty){r.qty.disabled=!r.box.checked;}
      if(wrap)wrap.classList.toggle('is-active',r.box.checked);
      if(r.box.checked){
        if(r.qty&&(!r.qty.value||Number(r.qty.value)<1))r.qty.value='1';
        lines.push(r.name+': quantity '+(r.qty?r.qty.value:'1'));
      }else if(r.qty){r.qty.value='';}
    });
    if(business&&business.checked){
      if(companyWrap)companyWrap.classList.add('is-visible');
      var org=((company&&company.value)||'').trim();
      lines.push('Corporate or bulk order'+(org?': '+org:''));
    }else{
      if(companyWrap)companyWrap.classList.remove('is-visible');
      if(company)company.value='';
    }
    if(custom&&custom.checked)lines.push('Other or custom festive request');
    if(summary)summary.value=lines.join('\n');
    if(error&&lines.length)error.classList.remove('is-visible');
    return lines.length;
  }
  rows.forEach(function(r){
    r.box.addEventListener('change',sync);
    if(r.qty)r.qty.addEventListener('input',sync);
  });
  [business,custom].forEach(function(b){if(b)b.addEventListener('change',sync);});
  if(company)company.addEventListener('input',sync);
  // Product links elsewhere on the page tick the matching product.
  document.querySelectorAll('.ccfest-product-link').forEach(function(link){
    link.addEventListener('click',function(){
      var card=link.closest('article'), name=card&&card.querySelector('h3')&&card.querySelector('h3').textContent.trim();
      rows.forEach(function(r){if(r.name===name){r.box.checked=true;}}); sync();
    });
  });
  form.addEventListener('submit',function(e){
    if(!sync()){
      e.preventDefault(); e.stopImmediatePropagation();
      if(error){error.textContent='Choose at least one product, or tick corporate or custom request.';error.classList.add('is-visible');}
      picker.scrollIntoView({behavior:'smooth',block:'center'});
    }
  },true);
  sync();
  window.__festiveForm={rows:rows.length,sync:sync};
});
