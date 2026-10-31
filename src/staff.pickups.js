/* Corner Café Service Hub: Cake pickups by day (27 October 2026). Marker __ccPickups20261027.
 * Roneel's brief "Interactive Daily Pickup Timeline & Booking Lead-Time Analytics"; decisions 27 Oct, 9:52 PM:
 * the new timeline replaces "Busiest pickup days" on Analytics > Cake sales (the protected Daily cake demand on the
 * Overview is not touched), and lead times use verified order-placement dates only.
 *
 * A horizontally scrolling day-by-day bar for every pickup date (past collected, today, upcoming scheduled), holidays and
 * events under their dates. Tapping a day (or its event) opens a small summary: cakes scheduled and collected, occasion
 * mix from the recorded occasion only (a cake collected on Valentine's Day is not called a Valentine's cake), booking lead
 * times (pickup date minus verified order date, Fiji calendar dates), one insight when the records support it, and
 * "View all orders" with each order opening its existing record. Reads only what Analytics already loaded plus the same
 * holiday lists the Daily cake demand reads; nothing is written. If anything fails, the old chart stays. */
(function (win, doc) {
  'use strict';
  if (win.__ccPickups20261027) return;
  win.__ccPickups20261027 = true;

  var DAY = 864e5, WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var OCC_COL = ['#548fc0', '#955ca1', '#cd9c33', '#d34d8b', '#5d9164', '#7a8a99'], REG_COL = '#c5ccd3';
  var EVENT_OCC = [[/valentine/i, 'valentines_day'], [/mother/i, 'mothers_day'], [/father/i, 'fathers_day'], [/christmas/i, 'christmas']];
  var HOL = { list: [], loaded: false, loading: false };
  var data = null, scrollAt = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function iso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
  function t0(d) { return Date.parse(d + 'T12:00:00Z'); }
  function add(d, n) { return new Date(t0(d) + n * DAY).toISOString().slice(0, 10); }
  function diff(a, b) { return Math.round((t0(b) - t0(a)) / DAY); }
  function wd(d) { return (new Date(t0(d)).getUTCDay() + 6) % 7; }
  function longDay(d) { var x = new Date(t0(d)); return WDF[wd(d)] + ', ' + x.getUTCDate() + ' ' + MONF[x.getUTCMonth()] + ' ' + x.getUTCFullYear(); }
  function shortDate(d) { var x = new Date(t0(d)); return x.getUTCDate() + ' ' + MON[x.getUTCMonth()]; }
  function pl(n, one, many) { return n === 1 ? one : many || one + 's'; }
  function fiji() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date(Date.now() + 432e5).toISOString().slice(0, 10); } }
  function time12(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return ''; var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function warn(w, e) { try { console.warn('[Cake pickups] ' + w, e); } catch (_) {} }

  // How far ahead cakes were booked: the same groups and colours as the "By booking time" chart (CCCakeLeadTime)
  // Booking-time groups come from Settings > Lead-time groups (28 Oct 2026; default 0-3, 4-7, 8-14, 15-30, 31+ days),
  // the same groups as the other "how far ahead" charts. Longest ahead is darkest; the booking date unknown stays grey.
  var SHADES = ['#c4e3cd', '#9fd0ae', '#74b48a', '#4f9a6c', '#2f7a50', '#1f5f3f', '#123d28'];
  var BUCKETS = [], BANDS = [];
  function setBands() {
    var src = win.__ccsBands && win.__ccsBands.length ? win.__ccsBands : [['0–3 days', 0, 3], ['4–7 days', 4, 7], ['8–14 days', 8, 14], ['15–30 days', 15, 30], ['31+ days', 31, 9999]];
    BANDS = src.map(function (b) { return [b[1], b[2]]; });
    var n = src.length, out = [];
    for (var k = n - 1; k >= 0; k--) {
      var lo = src[k][1], hi = src[k][2], lab = hi >= 9999 ? lo + ' or more days ahead' : lo === hi ? (lo ? lo + (lo === 1 ? ' day ahead' : ' days ahead') : 'Same day') : lo + ' to ' + hi + ' days ahead';
      out.push(['b' + k, lab, SHADES[Math.round(k * (SHADES.length - 1) / Math.max(1, n - 1))]]);
    }
    out.push(['unknown', 'Booking date not known', '#cbd2d9']);
    BUCKETS.length = 0; Array.prototype.push.apply(BUCKETS, out);
  }
  setBands();
  function bucket(v) { if (v == null) return 'unknown'; for (var k = 0; k < BANDS.length; k++) if (v >= BANDS[k][0] && v <= BANDS[k][1]) return 'b' + k; return 'b' + (BANDS.length - 1); }
  var RANGES = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['year', 'This year'], ['all', 'All time']], range = '30';

  // ---------- the orders, counted the same way as the Daily cake demand ----------
  function cakesOf(o) { var it = Array.isArray(o.it) ? o.it : []; if (!it.length) return 1; return it.reduce(function (s, i) { return s + (num(i[3]) || 1); }, 0); }
  function live(o) { return o && iso(o.pd) && ['cancelled', 'declined', 'not_confirmed'].indexOf(o.st) < 0; }
  function lead(o) { return o.odok === true && iso(o.od) && o.od <= o.pd ? diff(o.od, o.pd) : null; }
  function occ(o) { return o.oc && o.oc !== 'not_specified' ? o.oc : ''; }
  function build(x) {
    var today = x.today ? x.today() : fiji(), list = ((x.data && (x.data.allOrders || x.data.orders)) || []).filter(function (o) { return o && (!x.match || x.match(o)); });
    var by = {}, off = {}, min = today, max = add(today, 60), top = 0;
    list.forEach(function (o) {
      if (!iso(o.pd) || o.pd < '2024-01-01') return;
      if (!live(o)) { if (o.st === 'cancelled' || o.st === 'declined') (off[o.pd] = off[o.pd] || []).push(o); return; }
      (by[o.pd] = by[o.pd] || []).push(o);
      if (o.pd < min) min = o.pd; if (o.pd > max) max = o.pd;
    });
    // bar height: scaled to a normal busy day (95th percentile), so one very large day does not flatten the rest
    var tot = Object.keys(by).map(function (d) { return by[d].reduce(function (s, o) { return s + cakesOf(o); }, 0); }).sort(function (a, b) { return a - b; });
    top = tot.length ? Math.max(4, tot[Math.floor((tot.length - 1) * 0.95)]) : 1;
    if (diff(min, today) > 730) min = add(today, -730);
    min = add(min, -wd(min));
    var bk = {}, total = {}, first = null;
    Object.keys(by).forEach(function (d) {
      var b = bk[d] = {}; total[d] = 0;
      by[d].forEach(function (o) { var k = bucket(lead(o)), q = cakesOf(o); b[k] = (b[k] || 0) + q; total[d] += q; });
      if (!first || d < first) first = d;
    });
    return { x: x, today: today, by: by, bk: bk, total: total, first: first, off: off, min: min, max: add(max, 6 - wd(max)), top: Math.max(top, 1), name: function (c) { return (x.occName && x.occName(c)) || c; } };
  }
  // Usual cakes for that weekday: average of the same weekday over the 8 weeks before (before today for upcoming days),
  // the same rule as the "By booking time" chart
  function usual(D, d) {
    var ref = d > D.today ? D.today : add(d, -1), sum = 0, n = 0, w = wd(d);
    for (var x = ref; n < 8 && D.first && x >= D.first; x = add(x, -1)) { if (wd(x) !== w) continue; sum += D.total[x] || 0; n++; }
    return n >= 4 ? sum / n : null;
  }
  // The booking-time summary for a period of past pickups
  function mix(D) {
    var to = D.today, from = range === '30' ? add(to, -29) : range === '90' ? add(to, -89) : range === 'year' ? to.slice(0, 4) + '-01-01' : '0000';
    var t = {}, all = 0, known = 0, top = null;
    Object.keys(D.bk).forEach(function (d) { if (d < from || d > to) return; BUCKETS.forEach(function (b) { var v = D.bk[d][b[0]] || 0; t[b[0]] = (t[b[0]] || 0) + v; all += v; if (b[0] !== 'unknown') known += v; }); });
    BUCKETS.forEach(function (b) { if (b[0] !== 'unknown' && (t[b[0]] || 0) > (top ? t[top[0]] : 0)) top = b; });
    return { t: t, all: all, known: known, top: top };
  }

  // ---------- holidays and events: the same lists the Daily cake demand shows (read only) ----------
  function client() {
    if (win.__ccsMock) return win.__ccsMock;
    if (!win.supabase || typeof win.supabase.createClient !== 'function') return null;
    return (client.c = client.c || win.supabase.createClient('https://ilbrfwxblhidtlsjgxlh.supabase.co', 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', { auth: { persistSession: true, storageKey: 'cc-cakes-staff' } }));
  }
  function loadHolidays(done) {
    if (HOL.loaded || HOL.loading) return;
    var c = client(); if (!c || !c.from) { HOL.loaded = true; return; }
    HOL.loading = true;
    Promise.all([c.from('calendar_events').select('id,day,ends_on,name,kind,note').order('day'), c.rpc ? c.rpc('timeline_events_list') : Promise.resolve(null)]).then(function (r) {
      var out = [], cal = r[0] && !r[0].error && r[0].data, tl = r[1] && !r[1].error && r[1].data && r[1].data.ok && r[1].data.items;
      (cal || []).forEach(function (h) { if (iso(h.day)) out.push({ a: h.day, b: iso(h.ends_on) || h.day, k: h.kind === 'holiday' ? 'h' : 'e', name: h.name }); });
      (tl || []).forEach(function (h) { if (iso(h.date) && (h.grp === 'intl' || h.grp === 'fj')) out.push({ a: h.date, b: iso(h.end) || h.date, k: String(h.kind || 'h')[0] === 'h' ? 'h' : 'e', name: h.name }); });
      HOL.list = out.filter(function (e) { return e.name && diff(e.a, e.b) <= 3; });
    }).catch(function (e) { warn('holidays not loaded', e); }).then(function () { HOL.loading = false; HOL.loaded = true; if (done) done(); });
  }
  function eventsOn(d) { return HOL.list.filter(function (e) { return d >= e.a && d <= e.b; }); }

  // ---------- the timeline card ----------
  function card(D) {
    var cols = [], d, n = diff(D.min, D.max) + 1, evDays = [];
    for (var j = 0; j < n; j++) if (eventsOn(add(D.min, j)).length) evDays.push(j);
    for (var i = 0; i < n; i++) {
      d = add(D.min, i);
      var os = D.by[d] || [], c = os.reduce(function (s, o) { return s + cakesOf(o); }, 0), past = d < D.today, ev = eventsOn(d);
      var h = c ? Math.max(6, Math.round(Math.min(c, D.top) / D.top * 100)) : 0, first = d.slice(8) === '01' || i === 0;
      cols.push('<button type="button" class="pk-col' + (d === D.today ? ' is-today' : '') + (past ? ' is-past' : ' is-next') + (c ? '' : ' is-zero') + (c > D.top ? ' is-over' : '') + (ev.some(function (e) { return e.k === 'h'; }) ? ' is-hol' : '') +
        '" data-pk="' + d + '" aria-label="' + esc(longDay(d) + ': ' + c + pl(c, ' cake', ' cakes') + (ev.length ? ', ' + ev.map(function (e) { return e.name; }).join(', ') : '')) + '">' +
        (first ? '<span class="pk-mo">' + MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) + '</span>' : '') +
        '<span class="pk-n">' + (c || '') + '</span><span class="pk-track">' + stack(D, d, c) + tick(D, d) + '</span>' +
        '<span class="pk-w">' + WD[wd(d)].slice(0, 2) + '</span><span class="pk-d">' + (+d.slice(8)) + '</span>' +
        '<span class="pk-ev">' + (ev.length ? '<em class="is-' + ev[0].k + '" style="max-width:' + room(evDays, i) + 'px" data-pk="' + d + '" title="' + esc(ev.map(function (e) { return e.name; }).join(', ')) + '">' + esc(ev[0].name) + '</em>' : '') + '</span></button>');
    }
    return '<section class="cat-card pk" aria-label="Cake pickups by day"><header><h3>Cake pickups by day</h3><span>Tap a day for its cakes, occasions and booking times</span></header>' + summaryStrip(D) +
      '<div class="pk-bar"><div class="pk-key"><span><i class="k-next"></i>Upcoming</span><span><i class="k-tick"></i>Usual for the weekday</span><span><i class="k-hol"></i>Holiday or event</span></div>' +
      '<div class="pk-nav"><button type="button" class="pk-btn" data-pkgo="-7" aria-label="Earlier">‹</button><button type="button" class="pk-btn pk-today" data-pkgo="0">Today</button><button type="button" class="pk-btn" data-pkgo="7" aria-label="Later">›</button></div></div>' +
      '<div class="pk-rail" tabindex="0" aria-label="Pickups by day, scroll sideways">' + cols.join('') + '</div></section>';
  }

  function stack(D, d, c) {
    if (!c) return '';
    var b = D.bk[d] || {}, scale = Math.min(c, D.top) / c, out = '';
    for (var i = BUCKETS.length - 1; i >= 0; i--) { var v = b[BUCKETS[i][0]]; if (v) out += '<i style="height:' + (v * scale / D.top * 100).toFixed(2) + '%;background:' + BUCKETS[i][2] + '"></i>'; }
    return '<span class="pk-stack">' + out + '</span>';
  }
  function tick(D, d) { var u = usual(D, d); return u == null ? '' : '<b class="pk-tick" style="bottom:' + Math.min(100, u / D.top * 100).toFixed(2) + '%" title="Usual for a ' + WDF[wd(d)] + ': ' + (Math.round(u * 10) / 10) + ' cakes"></b>'; }
  function summaryStrip(D) {
    var m = mix(D), pct = function (v) { return m.all ? Math.round(v / m.all * 100) : 0; };
    var same = 0, lab = RANGES.filter(function (r) { return r[0] === range; })[0][1].toLowerCase();
    return '<div class="pk-sum"><div class="pk-chips" role="group" aria-label="Period for the booking summary">' + RANGES.map(function (r) { return '<button type="button" class="pk-chip" data-pkr="' + r[0] + '" aria-pressed="' + (r[0] === range) + '">' + r[1] + '</button>'; }).join('') + '</div>' +
      (m.all ? '<p class="pk-lead-line">' + (m.top ? 'Most cakes are booked <b>' + esc(m.top[1].replace(/ ahead$/, '') + (/^Same day/.test(m.top[1]) ? '' : ' ahead')) + '</b>.' : 'No booking dates known yet.') + '' + '</p>' +
      '<div class="pk-mix" role="img" aria-label="' + esc(BUCKETS.map(function (b) { return b[1] + ' ' + pct(m.t[b[0]] || 0) + '%'; }).join(', ')) + '">' + BUCKETS.map(function (b) { var v = m.t[b[0]] || 0; return v ? '<i style="flex:' + v + ';background:' + b[2] + '"></i>' : ''; }).join('') + '</div>' +
      '<div class="pk-mixleg" style="grid-template-columns:repeat(' + BUCKETS.length + ',minmax(0,1fr))">' + BUCKETS.map(function (b) { var v = m.t[b[0]] || 0; return '<span><em><i style="background:' + b[2] + '"></i>' + esc(b[1]) + '</em><b>' + pct(v) + '%</b><small>' + v + pl(v, ' cake', ' cakes') + '</small></span>'; }).join('') + '</div>' +
      '<p class="pk-note">' + m.all + pl(m.all, ' cake', ' cakes') + ' picked up, ' + esc(lab) + '.</p>' : '<p class="pk-lead-line">No cakes picked up, ' + esc(lab) + '.</p>') + '</div>';
  }
  // an event name may run under the next days, up to the next event
  function room(evDays, i) { var k = evDays.indexOf(i), nx = evDays[k + 1]; return Math.max(36, Math.min(160, (nx == null ? 4 : nx - i) * 44 - 8)); }
  // ---------- the day summary ----------
  function stats(list) {
    var L = list.map(lead).filter(function (v) { return v != null; });
    L.sort(function (a, b) { return a - b; });
    return { n: L.length, avg: L.length ? Math.round(L.reduce(function (s, v) { return s + v; }, 0) / L.length * 10) / 10 : null, min: L[0], max: L[L.length - 1], vals: L };
  }
  function days(v) { if (v == null) return '—'; if (v === 0) return 'Same day'; if (v < 1) return 'Under 1 day'; v = Math.round(v); return v + (v === 1 ? ' day' : ' days'); }
  function insight(D, d, os, ev) {
    var cakes = os.reduce(function (s, o) { return s + cakesOf(o); }, 0), oc = os.filter(occ), rg = os.filter(function (o) { return !occ(o); });
    var so = stats(oc), sr = stats(rg), sa = stats(os);
    for (var i = 0; i < ev.length; i++) for (var j = 0; j < EVENT_OCC.length; j++) if (EVENT_OCC[j][0].test(ev[i].name)) {
      var code = EVENT_OCC[j][1], mine = os.filter(function (o) { return o.oc === code; }), mc = mine.reduce(function (s, o) { return s + cakesOf(o); }, 0);
      if (os.length >= 3) return mc ? mc + ' of ' + cakes + ' cakes ' + (mc === 1 ? 'was' : 'were') + ' ordered for ' + D.name(code) + ' (recorded occasion).' : 'None of the ' + cakes + ' cakes were ordered for ' + D.name(code) + ': no order recorded that occasion.';
    }
    if (so.n >= 3 && sr.n >= 3 && Math.abs(so.avg - sr.avg) >= 2) return 'Occasion cakes were ordered ' + days(so.avg) + ' ahead on average, regular cakes ' + days(sr.avg) + '.';
    if (sa.n >= 3) { var q1 = sa.vals[Math.floor((sa.n - 1) / 4)], q3 = sa.vals[Math.ceil((sa.n - 1) * 3 / 4)]; return 'Most cakes for this day were ordered ' + (q1 === q3 ? q1 + (q1 === 1 ? ' day' : ' days') : q1 + '–' + q3 + ' days') + ' ahead.'; }
    return cakes + pl(cakes, ' cake', ' cakes') + ' from ' + os.length + pl(os.length, ' order', ' orders') + '; not enough booking dates for a pattern.';
  }
  function summary(D, d) {
    var os = D.by[d] || [], ev = eventsOn(d), past = d < D.today, cakes = os.reduce(function (s, o) { return s + cakesOf(o); }, 0);
    var rec = os.filter(function (o) { return o.cp === 'recorded'; }), asm = os.filter(function (o) { return o.cp === 'assumed'; });
    var got = rec.reduce(function (s, o) { return s + cakesOf(o); }, 0), gotA = asm.reduce(function (s, o) { return s + cakesOf(o); }, 0);
    var g = {}, regular = 0;
    os.forEach(function (o) { var c = occ(o), q = cakesOf(o); if (c) g[c] = (g[c] || 0) + q; else regular += q; });
    var parts = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; }).map(function (k, i) { return { l: D.name(k), v: g[k], c: OCC_COL[i % OCC_COL.length] }; });
    if (regular) parts.push({ l: 'Regular or not recorded', v: regular, c: REG_COL });
    var occN = cakes - regular, sa = stats(os), so = stats(os.filter(occ)), sr = stats(os.filter(function (o) { return !occ(o); }));
    var known = os.filter(function (o) { return lead(o) != null; }).reduce(function (s, o) { return s + cakesOf(o); }, 0);
    var off = (D.off[d] || []).length;
    var h = '<div class="pk-pop-h"><div><b>' + esc(longDay(d)) + '</b>' + (d === D.today ? '<span class="pk-tag">Today</span>' : '') +
      (ev.length ? '<p class="pk-evs">' + ev.map(function (e) { return '<span class="is-' + e.k + '">' + esc(e.name) + '</span>'; }).join('') + '</p>' : '') + '</div>' +
      '<button type="button" class="pk-x" data-pkx aria-label="Close">×</button></div>';
    if (!os.length) return h + '<p class="pk-none">No cakes ' + (past ? 'were collected' : 'are scheduled') + ' on this day.' + (off ? ' ' + off + pl(off, ' order was', ' orders were') + ' cancelled.' : '') + '</p>';
    h += '<div class="pk-stats">' +
      stat('Cakes', cakes, os.length + pl(os.length, ' order', ' orders')) +
      (past ? stat('Collected', got + gotA, gotA && !got ? 'from sheet records' : gotA ? gotA + ' from sheet records' : cakes - got ? (cakes - got) + ' not marked collected' : 'all collected') : stat('Collected', '—', 'upcoming')) +
      stat('Occasion', occN, 'cakes') + stat('Regular', regular, 'or not recorded') + '</div>';
    h += '<div class="pk-sec"><h4>Occasions</h4><div class="pk-seg" role="img" aria-label="' + esc(parts.map(function (p) { return p.l + ' ' + p.v; }).join(', ')) + '">' +
      parts.map(function (p) { return '<i style="flex:' + p.v + ';background:' + p.c + '"></i>'; }).join('') + '</div><div class="pk-leg">' +
      parts.map(function (p) { return '<span><i style="background:' + p.c + '"></i>' + esc(p.l) + ' <b>' + p.v + '</b></span>'; }).join('') + '</div></div>';
    var bk = D.bk[d] || {};
    h += '<div class="pk-sec"><h4>Booked ahead</h4><div class="pk-seg">' + BUCKETS.map(function (b) { return bk[b[0]] ? '<i style="flex:' + bk[b[0]] + ';background:' + b[2] + '"></i>' : ''; }).join('') + '</div><div class="pk-leg">' +
      BUCKETS.map(function (b) { return bk[b[0]] ? '<span><i style="background:' + b[2] + '"></i>' + esc(b[1]) + ' <b>' + bk[b[0]] + '</b></span>' : ''; }).join('') + '</div>' + (sa.n ? '<div class="pk-lead" style="margin-top:10px"><span><b>' + days(sa.avg) + '</b><em>average</em></span><span><b>' + days(sa.min) + '</b><em>shortest</em></span><span><b>' + days(sa.max) + '</b><em>longest</em></span></div>' +
      (so.n >= 2 && sr.n >= 2 ? '<p class="pk-cmp">Occasion <b>' + days(so.avg) + '</b> · Regular <b>' + days(sr.avg) + '</b></p>' : '') : '') +
      '<p class="pk-note">' + (known === cakes ? 'Booking date known for every cake.' : 'Booking date known for ' + known + ' of ' + cakes + pl(cakes, ' cake', ' cakes') + '.') + '</p></div>';
    h += '<p class="pk-ins">' + esc(insight(D, d, os, ev)) + '</p>' + (off ? '<p class="pk-note">' + off + pl(off, ' cancelled order is', ' cancelled orders are') + ' not counted.</p>' : '');
    h += '<button type="button" class="pk-all" data-pkall="' + d + '">View all orders (' + os.length + ')</button><div class="pk-list" hidden></div>';
    return h;
  }
  function stat(l, v, s) { return '<span class="pk-st"><em>' + esc(l) + '</em><b>' + esc(String(v)) + '</b><small>' + esc(s) + '</small></span>'; }
  function orders(D, d) {
    var os = (D.by[d] || []).slice().sort(function (a, b) { return String(a.pt || '') < String(b.pt || '') ? -1 : 1; });
    return '<ul class="pk-ord">' + os.map(function (o) {
      var it = (o.it || [])[0] || [], ld = lead(o), q = cakesOf(o), done = o.cp === 'recorded' ? 'Collected' : o.cp === 'assumed' ? 'Collected (sheet)' : d < D.today ? 'Not marked collected' : 'Scheduled';
      var nm = it[1] && / or /.test(it[0] || '') ? it[1] : (it[0] || 'Cake') + (it[1] && it[1] !== it[0] && (it[0] || '').indexOf(it[1]) < 0 ? ' · ' + it[1] : '');
      var body = '<span class="pk-o1"><b>' + esc(nm) + (it[2] ? ' · ' + esc(it[2]) + '"' : '') + '</b><span>Qty ' + q + '</span></span>' +
        '<span class="pk-o2">' + esc(o.r || '') + (o.pt ? ' · ' + esc(time12(o.pt)) : '') + ' · Placed ' + (o.odok === true && iso(o.od) ? esc(shortDate(o.od)) : 'date not known') + ' · ' + (ld != null ? ld + (ld === 1 ? ' day' : ' days') + ' ahead' : 'lead time not known') + '</span>' +
        '<span class="pk-o3">' + (occ(o) ? '<i>' + esc(D.name(o.oc)) + '</i>' : '<i class="is-reg">No occasion recorded</i>') + '<i>' + esc(done) + '</i>' + (o.st ? '<i>' + esc(String(o.st).replace(/_/g, ' ')) + '</i>' : '') + '</span>';
      return '<li>' + (o.i ? '<button type="button" class="pk-o" data-act="open-order" data-id="' + esc(o.i) + '">' + body + '</button>' : '<div class="pk-o is-sheet" title="Sheet record: no app order to open">' + body + '</div>') + '</li>';
    }).join('') + '</ul>';
  }

  // ---------- popover ----------
  var pop = null, anchorEl = null;
  function close() { if (pop) { pop.remove(); pop = null; } if (anchorEl) anchorEl.classList.remove('is-on'); anchorEl = null; }
  function open(d, el) {
    close(); if (!data) return;
    anchorEl = el && el.closest ? el.closest('.pk-col') : null; if (anchorEl) anchorEl.classList.add('is-on');
    pop = doc.createElement('div'); pop.className = 'pk-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Pickups on ' + longDay(d));
    pop.innerHTML = summary(data, d);
    (doc.getElementById('cc-staff') || doc.body).appendChild(pop);
    place();
    var x = pop.querySelector('[data-pkx]'); if (x) try { x.focus({ preventScroll: true }); } catch (e) {}
  }
  function place() {
    if (!pop) return;
    var phone = win.innerWidth < 640;
    pop.classList.toggle('is-sheet', phone);
    if (phone || !anchorEl) { pop.style.left = pop.style.top = ''; return; }
    var r = anchorEl.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = win.innerWidth, vh = win.innerHeight;
    var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12), top = r.top - h - 10;
    if (top < 12 && r.bottom + 10 + h <= vh - 12) top = r.bottom + 10;
    else if (top < 12) {
      // not enough room above or below: beside the day, never covering it
      top = Math.min(Math.max(12, r.top + r.height / 2 - h / 2), vh - h - 12);
      left = r.right + 12 + w <= vw - 12 ? r.right + 12 : Math.max(12, r.left - 12 - w);
    }
    pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(Math.max(12, top)) + 'px';
  }

  // ---------- Popular cake types, Booking channels, Customer mix (moved from the Overview, Roneel 27 Oct 10:33 PM) ----------
  // The same rules as the Overview cards (CCCakeSeasonalStage management cards): orders with a verified booking date in
  // the period, pickups from the launch, cancelled/declined/not confirmed left out; returning = first completed sale
  // before the period. The period follows this page's buttons (Since launch / 7 / 30 / 90 days).
  function trio(x) {
    // the same card and bar markup as the tab pages (kit copied here: the live tabs module does not expose it)
    var K = {
      tap: function (x, list, title, inner, cls) { return list && list.length && x.key ? '<button type="button" class="' + cls + ' cat-tap dx-tap" data-act="dx-drill" data-v="' + x.key({ t: title, l: list }) + '">' + inner + '</button>' : '<div class="' + cls + '">' + inner + '</div>'; },
      card: function (title, note, body) { return '<section class="cat-card" aria-label="' + esc(title) + '"><header><h3>' + esc(title) + '</h3><span>' + esc(note) + '</span></header>' + body + '</section>'; },
      none: function (t) { return '<p class="cat-none">' + esc(t) + '</p>'; },
      bars: function (x, rows, fmt, tone) {
        var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
        return '<div class="cat-bars' + (tone ? ' cat-t-' + tone : '') + '">' + rows.map(function (r) {
          return K.tap(x, r.list, r.t || r.l, '<span class="cat-bl" title="' + esc(r.l) + '">' + esc(r.l) + '</span><span class="cat-bt"><i style="width:' + Math.max(r.v ? 3 : 0, Math.round(r.v / max * 100)) + '%"></i></span><b>' + esc(fmt(r.v)) + '</b>', 'cat-br');
        }).join('') + '</div>';
      }
    };
    var today = x.today(), r = x.r || {}, from = r.all ? x.launch : r.from, to = r.to && r.to < today ? r.to : today, launch = x.launch;
    var all = ((x.data && (x.data.allOrders || x.data.orders)) || []).filter(function (o) { return o && (!x.match || x.match(o)); });
    var alive = all.filter(function (o) { return live(o) && !o.off; });
    var recent = alive.filter(function (o) { var d = o.odok === true && iso(o.od) && o.od <= today && o.od <= o.pd ? o.od : ''; return o.pd >= launch && d && d >= from && d <= to; });
    var cakes = {}, ch = {}, ids = {}, first = {};
    recent.forEach(function (o) {
      var it = (o.it || [])[0] || [], k = it[1] || it[0] || 'Cake'; (cakes[k] = cakes[k] || { l: k, v: 0, list: [] }).v += cakesOf(o); cakes[k].list.push(o);
      var c = (x.src && x.src[o.src]) || String(o.src || o.sys || 'Not recorded').replace(/_/g, ' '); (ch[c] = ch[c] || { l: c, v: 0, list: [] }).v++; ch[c].list.push(o);
      var id = typeof o.c === 'string' && o.c.trim().length >= 4 ? o.c.trim() : ''; if (id) (ids[id] = ids[id] || []).push(o);
    });
    all.forEach(function (o) { var id = typeof o.c === 'string' && o.c.trim().length >= 4 ? o.c.trim() : ''; if (!id || !(o.cp === 'recorded' || o.cp === 'assumed') || o.st === 'cancelled' || o.st === 'declined' || !iso(o.pd)) return; if (!first[id] || o.pd < first[id]) first[id] = o.pd; });
    var ret = [], fst = [];
    Object.keys(ids).forEach(function (id) { (first[id] && first[id] < from ? ret : fst).push.apply(first[id] && first[id] < from ? ret : fst, ids[id]); });
    var nRet = Object.keys(ids).filter(function (id) { return first[id] && first[id] < from; }).length, nAll = Object.keys(ids).length;
    var sort = function (g) { return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.v - a.v || (a.l < b.l ? -1 : 1); }).slice(0, 6); };
    var span = r.all ? 'since the launch' : 'this period';
    var rows = [
      K.card('Popular cake types', 'Cakes booked · ' + span, recent.length ? K.bars(x, sort(cakes).map(function (g) { g.t = g.l + ', booked'; return g; }), String, 'green') : K.none('No bookings with a known booking date in this period.')),
      K.card('Booking channels', 'Orders booked · ' + span, recent.length ? K.bars(x, sort(ch).map(function (g) { g.t = g.l + ' bookings'; return g; }), String, 'blue') : K.none('No bookings with a known booking date in this period.')),
      K.card('Customer mix', 'Customers · ' + span, nAll ? K.bars(x, [{ l: 'Returning', v: nRet, list: ret, t: 'Returning customers' }, { l: 'First time', v: nAll - nRet, list: fst, t: 'First-time customers' }], String, 'purple') : K.none('No identifiable customers in this period.'))
    ];
    return '<div class="cat-row cat-n3 pk-trio">' + rows.join('') + '</div>';
  }

  // ---------- Daily cake demand on Cake sales (moved from the Overview, Roneel 27 Oct 10:45 PM) ----------
  // The protected module is mounted exactly as the Overview mounts it (CCCakeSeasonalStage.mount, then
  // CCCakeDemandRail.mount, the same orders and date); nothing inside it is changed. Only its place on screen moves.
  function demand(pg, x) {
    if (pg.querySelector('.pk-demand')) return;
    var S = win.CCCakeSeasonalStage, R = win.CCCakeDemandRail, orders = x.data && (x.data.allOrders || x.data.orders);
    if (!S || !R || typeof S.mount !== 'function' || typeof R.mount !== 'function' || !orders) return;
    var w = doc.createElement('div'); w.className = 'pk-demand';
    var anchor = pg.querySelector(':scope > .cat-main'); if (anchor) anchor.before(w); else pg.appendChild(w);
    var opts = { today: x.today() };
    try { S.mount(w, orders, opts); R.mount(w, orders, opts); } catch (e) { warn('Daily cake demand not shown here', e); }
    tidyDemand(w);
    if (!w.querySelector('#cc-demand-scroll-rail')) w.remove();
  }
  function tidyDemand(w) {
    [].forEach.call(w.querySelectorAll('.ccsd-season, .ccsd-daily, #cc-demand-views, #cc-cake-lead-time, .ccsd-manager-kpis, .ccsd-manager-panels'), function (e) { e.remove(); });
    var r = w.querySelector('#cc-demand-scroll-rail'); if (r) r.classList.remove('ccdv-off');
  }
  // The Overview keeps its "By booking time" chart, now shown on its own (the switch had nothing left to switch to)
  function overviewLead() {
    var sw = doc.querySelector('#ccs-main .hb-v2 #cc-demand-views'), b = sw && sw.querySelector('[data-view="lead"]');
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  }

  // ---------- No Overview tab (Roneel, 27 Oct 2026 11:05 PM) ----------
  // Analytics opens on Sales & Products. Seasonal booking buildup moves to Planning & Forecasting, mounted by the
  // same CCCakeSeasonalStage.mount the Overview used (same orders, same date); only its place on screen changes.
  function noOverview() {
    var on = doc.querySelector('#cc-staff #ccs-main .an-mods [data-v="ov"][aria-current="page"]'),
      sl = on && doc.querySelector('#cc-staff #ccs-main .an-mods [data-v="sl"]');
    if (sl) sl.click();
  }
  function season(pg, x) {
    if (pg.querySelector('.pk-season')) return;
    var S = win.CCCakeSeasonalStage, orders = x.data && (x.data.allOrders || x.data.orders);
    if (!S || typeof S.mount !== 'function' || !orders) return;
    var w = doc.createElement('div'); w.className = 'pk-season';
    var anchor = pg.querySelector(':scope > details.cat-more'); if (anchor) anchor.before(w); else pg.appendChild(w);
    try { S.mount(w, orders, { today: x.today() }); } catch (e) { warn('Seasonal booking buildup not shown here', e); }
    [].forEach.call(w.querySelectorAll('.ccsd-daily, .ccsd-manager-kpis, .ccsd-manager-panels'), function (e) { e.remove(); });
    if (!w.querySelector('.ccsd-season')) w.remove();
  }

  // ---------- the Cake sales page ----------
  function last() { var A = win.CCAnalyticsAnswers; return A && typeof A.last === 'function' ? A.last() : null; }
  function mount() {
    var pg = doc.querySelector('#cc-staff #ccs-main .cat-page[data-cat="sl"]'), L = last();
    var pl = doc.querySelector('#cc-staff #ccs-main .cat-page[data-cat="pl"]');
    if (pl && L && L.mod === 'pl') { try { season(pl, L.x); } catch (e) { warn('Seasonal booking buildup not moved', e); } }
    if (pg && L && L.mod === 'sl') { try { demand(pg, L.x); } catch (e) { warn('Daily cake demand not moved', e); } var dw = pg.querySelector('.pk-demand'); if (dw && dw.querySelector('#cc-demand-views, #cc-cake-lead-time')) tidyDemand(dw); }
    if (!pg || !L || L.mod !== 'sl' || pg.querySelector('.pk')) return;
    styles();
    setBands(); data = build(L.x);
    var host = doc.createElement('div'); host.innerHTML = card(data);
    var mainCard = pg.querySelector(':scope > .cat-main');
    if (mainCard) mainCard.after(host.firstChild); else pg.appendChild(host.firstChild);
    try { var t3 = doc.createElement('div'); t3.innerHTML = trio(L.x); if (t3.firstChild) pg.querySelector('.pk').after(t3.firstChild); } catch (e) { warn('moved cards not shown', e); }
    [].forEach.call(doc.querySelectorAll('#ccs-main section.cat-card[aria-label="Busiest pickup days"], #ccs-main [data-ccf-title="Busiest pickup days"]'), function (c) { c.hidden = true; c.setAttribute('data-pk-replaced', '1'); });
    var rail = pg.querySelector('.pk-rail');
    go(rail, scrollAt != null ? null : 0, scrollAt);
    rail.addEventListener('scroll', function () { scrollAt = rail.scrollLeft; }, { passive: true });
    loadHolidays(function () { var r = doc.querySelector('#ccs-main .pk'); if (r && data) { var keep = r.querySelector('.pk-rail').scrollLeft, t = doc.createElement('div'); t.innerHTML = card(data); r.replaceWith(t.firstChild); var nr = doc.querySelector('#ccs-main .pk-rail'); nr.scrollLeft = keep; nr.addEventListener('scroll', function () { scrollAt = nr.scrollLeft; }, { passive: true }); } });
  }
  function go(rail, step, at) {
    if (!rail) return;
    if (at != null) { rail.scrollLeft = at; return; }
    var t = rail.querySelector('.pk-col.is-today'), w = t ? t.offsetWidth : 44;
    if (step === 0) { if (t) rail.scrollLeft = t.offsetLeft - rail.clientWidth / 2 + w / 2; }
    else rail.scrollBy({ left: step * w, behavior: 'smooth' });
  }

  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var chip = t.closest('#ccs-main .pk [data-pkr]');
    if (chip) { e.preventDefault(); range = chip.getAttribute('data-pkr'); var old = doc.querySelector('#ccs-main .pk-sum'), tmp = doc.createElement('div'); tmp.innerHTML = summaryStrip(data); if (old) old.replaceWith(tmp.firstChild); return; }
    var nav = t.closest('#ccs-main .pk [data-pkgo]');
    if (nav) { e.preventDefault(); go(doc.querySelector('#ccs-main .pk-rail'), +nav.getAttribute('data-pkgo')); return; }
    var col = t.closest('#ccs-main .pk [data-pk]');
    if (col) { e.preventDefault(); var d = col.getAttribute('data-pk'); if (anchorEl && anchorEl.getAttribute('data-pk') === d && pop) close(); else open(d, col); return; }
    if (t.closest('.pk-pop [data-pkx]')) { e.preventDefault(); close(); return; }
    var all = t.closest('.pk-pop [data-pkall]');
    if (all) { e.preventDefault(); var box = pop.querySelector('.pk-list'); if (box.hidden) { box.innerHTML = orders(data, all.getAttribute('data-pkall')); box.hidden = false; all.textContent = 'Hide orders'; } else { box.hidden = true; all.textContent = 'View all orders (' + (data.by[all.getAttribute('data-pkall')] || []).length + ')'; } place(); return; }
    if (t.closest('.pk-pop .pk-o[data-act="open-order"]')) { setTimeout(close, 0); return; }
    if (pop && !t.closest('.pk-pop')) close();
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop) close(); });
  win.addEventListener('resize', function () { place(); });

  function styles() {
    if (doc.getElementById('ccpk-style')) return;
    var P = ':root:not(#cc-p0) #cc-staff';
    var s = doc.createElement('style'); s.id = 'ccpk-style';
    s.textContent = [
      P + ' .pk{overflow:hidden}',
      P + ' .pk-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 8px}',
      P + ' .pk-key{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#475467}' + P + ' .pk-key span{display:inline-flex;align-items:center;gap:6px}',
      P + ' .pk-key i{width:12px;height:12px;border-radius:3px;display:inline-block}' + P + ' .pk-key .k-next{background:#E9EEF5;border:1px solid #C9D3E0}' + P + ' .pk-key .k-hol{background:#955ca1;border-radius:50%}',
      P + ' .pk-nav{display:flex;gap:6px}' + P + ' .pk-btn{min-width:44px;height:40px;padding:0 12px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#1D2939;font:inherit;font-size:15px;font-weight:500;cursor:pointer}',
      P + ' .pk-rail{display:flex;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding:22px 2px 4px;scrollbar-width:thin;outline:none}',
      P + ' .pk-col{position:relative;flex:0 0 44px;display:grid;grid-template-rows:18px 132px 18px 22px 22px;justify-items:center;align-items:end;padding:0 3px;border:0;background:none;cursor:pointer;scroll-snap-align:start;font:inherit;color:#1D2939;border-radius:10px}',
      P + ' .pk-col:hover,' + P + ' .pk-col:focus-visible{background:#F2F4F7;outline:none}' + P + ' .pk-col.is-on{background:#E8F1F8;box-shadow:inset 0 0 0 2px #548fc0}',
      P + ' .pk-col.is-hol .pk-track{background:repeating-linear-gradient(135deg,#F7F0F9 0 6px,#fff 6px 12px)}',
      P + ' .pk-mo{position:absolute;top:-20px;left:4px;font-size:12px;font-weight:600;color:#475467;white-space:nowrap}',
      P + ' .pk-n{font-size:13px;font-weight:600;color:#344054;align-self:end}',
      P + ' .pk-track{width:26px;height:132px;display:flex;align-items:flex-end;border-radius:6px;background:#F2F4F7}',
      P + ' .pk-track{position:relative}' + P + ' .pk-stack{display:flex;flex-direction:column;width:100%;height:100%;justify-content:flex-end;border-radius:5px;overflow:hidden}' + P + ' .pk-stack i{display:block;width:100%;flex:none}',
      P + ' .pk-col.is-next .pk-track{background:#E9EEF5}' + P + ' .pk-col.is-next .pk-stack{opacity:.9}',
      P + ' .pk-tick{position:absolute;left:-5px;right:-5px;height:2px;background:#1D2939;border-radius:2px;pointer-events:none}',
      P + ' .pk-key .k-tick{width:16px;height:2px;border-radius:2px;background:#1D2939}',
      P + ' .pk-sum{margin:2px 0 14px}' + P + ' .pk-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}',
      P + ' .pk-chip{min-height:40px;padding:0 14px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#1D2939;font:inherit;font-size:15px;font-weight:500;cursor:pointer}' + P + ' .pk-chip[aria-pressed=true]{background:#EEF2F8;border-color:#2E4A70;color:#1F3556}',
      P + ' .pk-lead-line{margin:0 0 8px;font-size:17px;color:#1D2939}' + P + ' .pk-lead-line b{font-weight:600}',
      P + ' .pk-mix{display:flex;height:14px;border-radius:999px;overflow:hidden;gap:2px}' + P + ' .pk-mix i{display:block;min-width:4px}',
      P + ' .pk-mixleg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:8px 0 0}' + P + ' .pk-mixleg span{display:flex;flex-direction:column}' + P + ' .pk-mixleg em{font-style:normal;font-size:13px;color:#475467;display:flex;align-items:center;gap:6px}' + P + ' .pk-mixleg em i{width:12px;height:12px;border-radius:3px;display:inline-block;flex:none}' + P + ' .pk-mixleg b{font-size:20px;font-weight:600}' + P + ' .pk-mixleg small{font-size:12.5px;color:#667085}',
      '@media (max-width:760px){' + P + ' .pk-mixleg{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
      P + ' .pk-col.is-over .pk-stack{border-top:4px solid #0b3d29}' + P + ' .pk-col.is-over .pk-n{color:#0b3d29}',
      P + ' .pk-col.is-today .pk-track{box-shadow:0 0 0 2px #1D2939}' + P + ' .pk-col.is-today .pk-d{background:#1D2939;color:#fff;border-radius:999px;padding:0 6px}',
      P + ' .pk-d{font-size:16px;font-weight:600;line-height:22px;color:#1D2939}' + P + ' .pk-w{font-size:13px;line-height:18px;color:#475467}' + P + ' .pk-col:nth-child(7n) {}',
      P + ' .pk-ev{width:44px;height:22px;position:relative;overflow:visible}',
      P + ' .pk-ev em{position:absolute;left:4px;top:3px;max-width:128px;font-style:normal;font-size:12px;line-height:16px;padding:0 6px;border-radius:999px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#F4EBF6;color:#5B2F66;z-index:1}',
      P + ' .pk-ev em.is-h{background:#EDE3F0;color:#4A2453;font-weight:600}',
      P + ' .pk-pop{position:fixed;z-index:120;width:min(380px,calc(100vw - 24px));max-height:min(78vh,640px);overflow:auto;background:#fff;color:#1D2939;border:1px solid #E4E7EC;border-radius:16px;box-shadow:0 18px 50px rgba(16,24,40,.22);padding:16px 18px 18px;font-size:15px;line-height:1.4}',
      P + ' .pk-pop.is-sheet{left:0!important;right:0;bottom:0;top:auto!important;width:100%;max-height:82vh;border-radius:18px 18px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}',
      P + ' .pk-pop-h{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin:0 0 12px}' + P + ' .pk-pop-h b{font-size:17px;font-weight:600}',
      P + ' .pk-tag{margin-left:8px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:#1D2939;color:#fff;vertical-align:2px}',
      P + ' .pk-evs{margin:6px 0 0;display:flex;gap:6px;flex-wrap:wrap}' + P + ' .pk-evs span{font-size:13px;padding:2px 8px;border-radius:999px;background:#F4EBF6;color:#5B2F66}',
      P + ' .pk-x{width:40px;height:40px;flex:none;border:0;border-radius:10px;background:#F2F4F7;color:#344054;font-size:22px;line-height:1;cursor:pointer}',
      P + ' .pk-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 14px}',
      P + ' .pk-st{display:flex;flex-direction:column;gap:1px;padding:8px 8px;border:1px solid #EAECF0;border-radius:10px}' + P + ' .pk-st em{font-style:normal;font-size:12px;color:#475467}' + P + ' .pk-st b{font-size:20px;font-weight:600}' + P + ' .pk-st small{font-size:11.5px;font-style:italic;color:#667085;line-height:1.25}',
      P + ' .pk-sec{margin:0 0 12px}' + P + ' .pk-sec h4{margin:0 0 6px;font-size:13px;font-weight:600;color:#475467;text-transform:none}',
      P + ' .pk-seg{display:flex;height:12px;border-radius:999px;overflow:hidden;gap:2px;background:#fff}' + P + ' .pk-seg i{display:block;min-width:4px}',
      P + ' .pk-leg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:13px;color:#344054}' + P + ' .pk-leg span{display:inline-flex;align-items:center;gap:5px}' + P + ' .pk-leg i{width:10px;height:10px;border-radius:3px;display:inline-block}' + P + ' .pk-leg b{font-weight:600}',
      P + ' .pk-lead{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' + P + ' .pk-lead span{display:flex;flex-direction:column}' + P + ' .pk-lead b{font-size:17px;font-weight:600}' + P + ' .pk-lead em{font-style:normal;font-size:12px;color:#667085}',
      P + ' .pk-cmp{margin:6px 0 0;font-size:14px}' + P + ' .pk-note{margin:6px 0 0;font-size:12.5px;font-style:italic;color:#667085}',
      P + ' .pk-ins{margin:4px 0 12px;padding:10px 12px;border-radius:10px;background:#F0F7F6;color:#134E4A;font-size:14.5px}',
      P + ' .pk-none{margin:4px 0 0;color:#475467}',
      P + ' .pk-all{width:100%;min-height:44px;border:1px solid #1D2939;border-radius:10px;background:#1D2939;color:#fff;font:inherit;font-weight:600;cursor:pointer}',
      P + ' .pk-ord{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}',
      P + ' .pk-o{display:flex;flex-direction:column;gap:3px;width:100%;text-align:left;padding:10px 12px;border:1px solid #EAECF0;border-radius:10px;background:#fff;font:inherit;color:#1D2939;cursor:pointer}',
      P + ' button.pk-o:hover{border-color:#98A2B3}' + P + ' .pk-o.is-sheet{cursor:default;background:#FCFCFD}',
      P + ' .pk-o1{display:flex;justify-content:space-between;gap:8px}' + P + ' .pk-o1 b{font-weight:600}' + P + ' .pk-o2{font-size:13px;color:#475467}',
      P + ' .pk-o3{display:flex;flex-wrap:wrap;gap:4px}' + P + ' .pk-o3 i{font-style:normal;font-size:12px;padding:1px 8px;border-radius:999px;background:#F2F4F7;color:#344054;text-transform:capitalize}' + P + ' .pk-o3 i.is-reg{background:#fff;border:1px dashed #D0D5DD;text-transform:none}',
      '@media (max-width:640px){' + P + ' .pk-col{flex-basis:40px}' + P + ' .pk-track{width:22px}' + P + ' .pk-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { noOverview(); overviewLead(); mount(); } catch (e) { warn('not shown', e); } }, 30); }
  // Roneel, 27 Oct 2026 10:27 PM ("remove this, only this section"): the Overview's Performance snapshot (its heading,
  // 7/30/90 day buttons and the six number cards) is hidden. Popular cake types, Booking channels, Customer mix, the
  // Heartbeat and every other part of the Overview stay as they are.
  function hideSnapshot() {
    if (doc.getElementById('ccpk-snap')) return;
    var s = doc.createElement('style'); s.id = 'ccpk-snap';
    // Roneel, 27 Oct 10:41 PM: on Cake sales, What to do and the four number cards (with the Gross profit note) go too
    var SL = ':root:not(#cc-p1) #cc-staff #ccs-main .cat-page[data-cat="sl"] > ';
    s.textContent = ':root:not(#cc-p1) #cc-staff #ccs-main .hb-v2 #cc-demand-scroll-rail,:root:not(#cc-p1) #cc-staff #ccs-main .hb-v2 #cc-demand-views,' +
      ':root:not(#cc-p1) #cc-staff .hb-v2 .hb-k-heading,:root:not(#cc-p1) #cc-staff .hb-v2 .hb-k-kpis,:root:not(#cc-p1) #cc-staff .hb-v2 .hb-k-panels,' +
      SL + '.cat-todo,' + SL + '.cat-kpis,' + SL + 'p.cat-flag{display:none!important}' +
      ':root:not(#cc-p1) #cc-staff #ccs-main .an-mods [data-v="ov"],:root:not(#cc-p1) #cc-staff #ccs-main .cc-nav5 > button:first-child,:root:not(#cc-p1) .ccdd-list[aria-label="Section"] > li[data-i="0"]{display:none!important}' +
      ':root:not(#cc-p1) #cc-staff #ccs-main .pk-season{margin:0 0 16px}' +
      ':root:not(#cc-p1):not(#cc-p2) #cc-staff #ccs-main .pk-demand #cc-demand-scroll-rail.ccdr{display:block!important}:root:not(#cc-p1) #cc-staff #ccs-main .pk-demand{margin:0 0 16px}';
    doc.head.appendChild(s);
  }
  function start() { hideSnapshot(); new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  win.CCCakePickups = { build: build, summary: summary, lead: lead, insight: insight, eventsOn: eventsOn, _hol: HOL };
})(window, document);
