// Wide screens (18 October 2026): in the two-pane view each island also previews its first two orders,
// so the left column says what is waiting without opening each category. Tablets and phones are unchanged.
var WD_ISLANDS = apIslands;
function wdPreview(g) {
  var rows = (g.rows || []).slice(0, 2).map(function (r) {
    if (r.fb) { var f = r.fb; return '<span class="wd-p"><span class="wd-t">' + Tt(f.order_ref || 'Concern') + '</span> ' + Tt(f.customer_name || 'Customer') + '</span>'; }
    var o = r.o || {}, cu = o.customers || {}, i = Ht(o);
    return '<span class="wd-p"><span class="wd-t">' + Tt(Ft(o.required_time)) + '</span> ' + Tt((cu.full_name || o.contact_name || o.reference || '').split(' ')[0]) + ' · ' + Tt(i ? Ut(i) : o.reference) + '</span>';
  }).join('');
  var more = (g.rows || []).length - 2;
  return rows ? '<span class="wd-prev">' + rows + (more > 0 ? '<span class="wd-more">+' + more + ' more</span>' : '') + '</span>' : '';
}
apIslands = function (gs) {
  var h = WD_ISLANDS(gs);
  if (!apSplit()) return h;
  gs.forEach(function (g) {
    var a = 'data-v="' + g.key + '"', i = h.indexOf(a); if (i < 0) return;
    var end = h.indexOf('</span></span></button>', i); if (end < 0) return;
    end += '</span></span>'.length;
    h = h.slice(0, end) + wdPreview(g) + h.slice(end);
  });
  return h;
};
