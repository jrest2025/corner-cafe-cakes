// Inserted inside the released application scope. Existing permission and data flows stay in use.
function lyOrderList(list) {
  if (!list || !list.length) return '';
  return '<span class="co-cakes">' + list.slice(0, 3).map(function (o) {
    var item = Ht(o), delivery = o.fulfilment_method === 'delivery';
    var method = delivery ? 'Delivery' : 'Collection', cake = item ? Ut(item) : o.reference;
    var attention = ['awaiting_review', 'awaiting_quote', 'awaiting_deposit'].indexOf(o.order_status) >= 0;
    var icon = delivery ? '<path d="M2 5h12v12H2zM14 9h4l4 4v4h-8M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>' : '<path d="M4 8h16l-1 13H5L4 8zM8 8V6a4 4 0 0 1 8 0v2"/>';
    return '<span class="co-cake' + (delivery ? ' ly-delivery' : '') + (attention ? ' ly-attention' : '') + '" title="' + Tt(method + ' · ' + Ft(o.required_time) + ' · ' + cake) + '"><span class="ly-method" aria-label="' + method + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + icon + '</svg></span><span class="ly-summary"><span class="co-t">' + Tt(Ft(o.required_time)) + '</span> ' + Tt(cake) + '</span></span>';
  }).join('') + (list.length > 3 ? '<span class="co-more" data-n="' + (list.length - 3) + '">View all ' + list.length + ' orders</span>' : '') + '</span>';
}
coList = lyOrderList;
// Keep enough room to read each day. The working area scrolls for longer months.
fitCalendar = function () {
  var g = document.querySelector('#cc-staff .ccs-mgrid'); if (!g) return;
  g.classList.remove('fit-rows'); g.style.removeProperty('--fit-row');
  [].forEach.call(g.querySelectorAll('.co-cake'), function (e) { e.classList.remove('fit-hide'); });
  [].forEach.call(g.querySelectorAll('.co-cakes'), function (e) { e.classList.remove('fit-none'); });
};
