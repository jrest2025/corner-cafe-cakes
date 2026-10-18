// Calendar: occasions and Fiji public holidays (18 October 2026).
// Inserted into the released bundle's main scope: y = state, Ma = re-render, Tt = escape, a = signed-in client,
// Dt = today, jt = addDays, Ft = 12-hour time, Ht = first cake, Ut = cake line, wo = orders shown on a day.
// Cake occasions (Settings > Occasions and special dates) are in colour with their ordering lead-up;
// public holidays are grey. Nothing here writes to the database.
var CO = { loaded: false, loading: false, events: [], err: false };
function coLoad() {
  if (CO.loaded || CO.loading) return; CO.loading = true;
  var from = jt(Dt(), -45), done = function () { CO.loading = false; CO.loaded = true; if (y.tab === 'calendar') Ma(); };
  Promise.all([
    a.from('occasions').select('code,label,colour,category,active'),
    a.from('occasion_dates').select('occasion_code,starts_on,ends_on,promo_days').gte('starts_on', from).order('starts_on'),
    a.from('public_holidays').select('day,name').gte('day', from).order('day')
  ]).then(function (r) {
    var occ = {}; ((r[0] && r[0].data) || []).forEach(function (o) { occ[o.code] = o; });
    var ev = [];
    ((r[1] && r[1].data) || []).forEach(function (d) {
      var o = occ[d.occasion_code]; if (!o || o.active === false) return;
      ev.push({ kind: 'occ', day: d.starts_on, end: d.ends_on || d.starts_on, name: o.label, colour: /^#[0-9a-f]{6}$/i.test(o.colour || '') ? o.colour : '#5b6370', lead: Math.max(0, Math.min(120, d.promo_days || 0)) });
    });
    // A public holiday that is also a cake occasion on the same day shows once, as the occasion.
    ((r[2] && !r[2].error && r[2].data) || []).forEach(function (h) {
      if (!ev.some(function (e) { return e.day === h.day; })) ev.push({ kind: 'hol', day: h.day, end: h.day, name: h.name, colour: '#6b7280', lead: 0 });
    });
    ev.sort(function (p, q) { return p.day < q.day ? -1 : 1; });
    CO.events = ev; CO.err = !!(r[0] && r[0].error) || !!(r[1] && r[1].error); done();
  }).catch(function () { CO.err = true; done(); });
}
function coOn(d) { return CO.events.filter(function (e) { return d >= e.day && d <= e.end; }); }
// The cake occasion whose ordering lead-up this day falls in (closest one wins).
function coLeadOf(d) { var m = null; CO.events.forEach(function (e) { if (e.kind === 'occ' && e.lead && d < e.day && d >= jt(e.day, -e.lead) && (!m || e.day < m.day)) m = e; }); return m; }
function coDays(d) { return Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(Dt() + 'T00:00:00Z')) / 864e5); }
function coWhen(n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 14 ? 'In ' + n + ' days' : 'In ' + Math.round(n / 7) + ' weeks'; }
function coCls(d) { var l = coLeadOf(d), on = coOn(d); return (on.length ? ' co-has' : '') + (l ? ' co-lead" style="--co:' + l.colour : ''); }
function coTag(d, short) {
  return coOn(d).map(function (e) {
    return '<span class="co-tag co-' + e.kind + '" style="--co:' + e.colour + '" title="' + Tt(e.kind === 'hol' ? e.name + ' (public holiday)' : e.name) + '"><i aria-hidden="true"></i><span>' + Tt(e.name) + '</span></span>';
  }).join('');
}
// Cakes due that day, up to three, so the month shows the work, not just a count.
function coList(list) {
  if (!list || !list.length) return '';
  var max = 3, h = list.slice(0, max).map(function (o) {
    var i = Ht(o); return '<span class="co-cake"><span class="co-t">' + Tt(Ft(o.required_time)) + '</span> ' + Tt(i ? Ut(i) : o.reference) + '</span>';
  }).join('');
  return '<span class="co-cakes">' + h + (list.length > max ? '<span class="co-more">+' + (list.length - max) + ' more</span>' : '') + '</span>';
}
// Orders already booked for an occasion: confirmed or waiting cakes with that occasion, due before it ends.
function coBooked(e) {
  return (y.orders || []).filter(function (o) {
    if (['cancelled', 'declined'].indexOf(o.order_status) > -1 || o.required_date < Dt() || o.required_date > e.end) return false;
    return (o.order_items || []).some(function (i) { return (i.occasion || '').toLowerCase() === e.name.toLowerCase(); });
  }).length;
}
function coStrip() {
  coLoad();
  var t = Dt(), soon = CO.events.filter(function (e) { return e.end >= t && coDays(e.day) <= 75; }).slice(0, 4);
  if (!CO.loaded) return '';
  if (!soon.length) return '<div class="co-strip is-empty"><span class="co-strip-k">Coming up</span><span class="co-none">No occasions or public holidays in the next 10 weeks.</span></div>';
  return '<div class="co-strip" role="list" aria-label="Coming up"><span class="co-strip-k">Coming up</span>' + soon.map(function (e) {
    var n = coDays(e.day), inLead = e.kind === 'occ' && e.lead && n <= e.lead && n > 0, bk = e.kind === 'occ' ? coBooked(e) : -1;
    return '<button type="button" role="listitem" class="co-card co-' + e.kind + (inLead ? ' is-lead' : '') + '" style="--co:' + e.colour + '" data-act="co-go" data-v="' + e.day + '">' +
      '<span class="co-dot" aria-hidden="true"></span><span class="co-card-m"><b>' + Tt(e.name) + '</b><span>' + Tt(coWhen(Math.max(0, n))) + ' · ' + Tt(Mt(e.day)) + '</span>' +
      '<em>' + (e.kind === 'hol' ? 'Public holiday' : (bk ? bk + (bk === 1 ? ' order booked' : ' orders booked') : 'No orders yet') + (inLead ? ' · ordering window open' : '')) + '</em></span></button>';
  }).join('') + '</div>';
}
