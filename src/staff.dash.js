  // ---------- executive dashboard (view only: admin and marketing) ----------
  // Sales = collected orders, dated by pickup date. Revenue = agreed price (or list price when none was set), less refunds.
  // Cash = payments, dated by the day they were taken. Upcoming = confirmed orders not yet collected. Test orders never arrive here.
  var DX = null;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DX_PERIODS = [['m', 'This month to date'], ['lm', 'Last month'], ['3m', 'Last 3 months'], ['y', 'This year to date'], ['12', 'Last 12 months'], ['all', 'All time'], ['c', 'Choose dates']];
  var DX_STATUS = [['all', 'All statuses'], ['completed', 'Collected'], ['open', 'Open (not yet collected)'], ['off', 'Cancelled or declined']];
  function dxState() { if (!DX) DX = { data: null, loading: false, err: null, f: { p: 'm', from: '', to: '', prod: 'all', ch: 'all', st: 'all' }, year: null, psort: 'q', drills: {} }; return DX; }
  function dashLoad(force) {
    var d = dxState(); if (d.loading) return; if (d.data && !force) { view(); return; }
    d.loading = true; d.err = null; view();
    sb.rpc('dashboard_data').then(function (r) {
      d.loading = false;
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) d.err = (r.data && r.data.message) || 'The dashboard could not load.';
      else { d.data = r.data; dxPrep(); }
      if (S.tab === 'dash') view();
    }).catch(function (e) { console.error(e); d.loading = false; if (errKind(e) === 'expired') return sessionExpired(); d.err = 'The dashboard could not load. Check the connection and try again.'; if (S.tab === 'dash') view(); });
  }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function dxPrep() {
    var d = DX.data, first = {}, count = {};
    d.orders.forEach(function (o) {
      o.tot = num(o.fin != null ? o.fin : o.est);
      o.paid = 0; o.refund = 0; o.cakes = 0;
      (o.pay || []).forEach(function (p) { if (p[0] === 'refund') o.refund += num(p[1]); else if (p[0] !== 'adjustment') o.paid += num(p[1]); });
      o.net = o.tot - o.refund;
      (o.it || []).forEach(function (i) { o.cakes += num(i[3]) || 1; });
      o.sale = o.st === 'completed';
      if (o.sale && o.c) { if (!first[o.c] || o.pd < first[o.c]) first[o.c] = o.pd; }
    });
    d.first = first;
    d.years = []; d.orders.forEach(function (o) { var y = o.pd.slice(0, 4); if (o.sale && d.years.indexOf(y) < 0) d.years.push(y); }); d.years.sort();
    if (!DX.year) DX.year = today().slice(0, 4);
    d.anyPay = d.orders.some(function (o) { return (o.pay || []).length; });
  }
  // ----- periods -----
  function monthStart(iso) { return iso.slice(0, 8) + '01'; }
  function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  function addMonths(iso, n) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(Math.min(+iso.slice(8, 10), last)).padStart(2, '0'); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
  function dxRange() {
    var f = DX.f, t = today(), r;
    if (f.p === 'm') r = { from: monthStart(t), to: t, pf: monthStart(addMonths(t, -1)), pt: addMonths(t, -1), cmp: 'same days last month' };
    else if (f.p === 'lm') { var s = monthStart(addMonths(t, -1)); r = { from: s, to: monthEnd(s), pf: monthStart(addMonths(s, -1)), pt: monthEnd(addMonths(s, -1)), cmp: 'the month before' }; }
    else if (f.p === '3m') r = { from: addDays(t, -89), to: t };
    else if (f.p === 'y') r = { from: t.slice(0, 4) + '-01-01', to: t, pf: (+t.slice(0, 4) - 1) + '-01-01', pt: (+t.slice(0, 4) - 1) + t.slice(4), cmp: 'the same dates last year' };
    else if (f.p === '12') r = { from: addDays(t, -364), to: t };
    else if (f.p === 'c' && f.from && f.to && f.from <= f.to) r = { from: f.from, to: f.to };
    else r = { from: '2000-01-01', to: '2999-12-31', all: true };
    if (!r.all && !r.pf) { var len = daysBetween(r.from, r.to); r.pt = addDays(r.from, -1); r.pf = addDays(r.pt, -len); r.cmp = 'the ' + (len + 1) + ' days before'; }
    return r;
  }
  function inRange(iso, a, b) { return iso && iso >= a && iso <= b; }
  function dxMatch(o) { var f = DX.f; if (f.ch !== 'all' && o.src !== f.ch) return false; if (f.prod !== 'all' && !(o.it || []).some(function (i) { return i[0] === f.prod; })) return false; return true; }
  function dxItems(o) { var f = DX.f; return (o.it || []).filter(function (i) { return f.prod === 'all' || i[0] === f.prod; }); }
  function dxCakes(o) { return dxItems(o).reduce(function (s, i) { return s + (num(i[3]) || 1); }, 0); }
  function dxValue(o) { return DX.f.prod === 'all' ? o.net : dxItems(o).reduce(function (s, i) { return s + num(i[4]) * (num(i[3]) || 1); }, 0); }
  function dxSales(a, b) { return DX.data.orders.filter(function (o) { return o.sale && inRange(o.pd, a, b) && dxMatch(o); }); }
  function dxSum(list) { var n = list.length, c = 0, v = 0; list.forEach(function (o) { c += dxCakes(o); v += dxValue(o); }); return { n: n, c: c, v: v, aov: n ? v / n : 0 }; }
  // ----- formatting -----
  function m0(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function int(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(n) { return (n > 0 ? '+' : '') + Math.round(n) + '%'; }
  function change(cur, prev) { if (prev == null) return ''; if (!prev) return cur ? 'New' : 'No change'; return pct((cur - prev) / prev * 100); }
  function dxKey(list) { var k = 'k' + Object.keys(DX.drills).length; DX.drills[k] = list; return k; }
  function dxTap(list, title, inner, cls) { return list && list.length ? '<button type="button" class="' + cls + ' dx-tap" data-act="dx-drill" data-v="' + dxKey({ t: title, l: list }) + '">' + inner + '</button>' : '<div class="' + cls + '">' + inner + '</div>'; }
  function dxKpi(label, value, sub, list, title, tone) { return dxTap(list, title, '<span class="ccs-kpi-l">' + label + '</span><b class="ccs-kpi-n">' + value + '</b><span class="ccs-kpi-s">' + sub + '</span>', 'ccs-kpi dx-kpi' + (tone ? ' t-' + tone : '')); }
  function dxCols(rows, money) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
    return '<div class="dx-cols" style="grid-template-columns:repeat(' + rows.length + ',minmax(0,1fr))">' + rows.map(function (r) {
      return dxTap(r.list, r.t, '<span class="dx-colv">' + (money ? m0(r.v) : int(r.v)) + '</span><span class="dx-colbar"><i style="height:' + Math.max(r.v ? 3 : 0, Math.round(r.v / max * 100)) + '%"></i></span><span class="dx-coll">' + esc(r.l) + '</span>', 'dx-col' + (r.dim ? ' is-dim' : ''));
    }).join('') + '</div>';
  }
  function dxBars(rows, fmt) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
    return '<div class="dx-bars">' + rows.map(function (r) {
      return dxTap(r.list, r.t, '<span class="dx-bl">' + esc(r.l) + '</span><span class="dx-bt"><i style="width:' + Math.round(r.v / max * 100) + '%"></i></span><b>' + fmt(r) + '</b>', 'dx-brow');
    }).join('') + '</div>';
  }
  function dxSec(id, title, note, body, open) { var isOpen = DX['o' + id] != null ? DX['o' + id] : open; return '<details class="dx-sec"' + (isOpen ? ' open' : '') + ' data-dxsec="' + id + '"><summary><span>' + title + '</span>' + (note ? '<em>' + note + '</em>' : '') + '</summary><div class="dx-body">' + body + '</div></details>'; }
  function dxGroup(list, keyFn) { var g = {}; list.forEach(function (o) { keyFn(o).forEach(function (k) { var e = g[k[0]] = g[k[0]] || { l: k[0], q: 0, v: 0, list: [] }; e.q += k[1]; e.v += k[2]; if (e.list.indexOf(o) < 0) e.list.push(o); }); }); return Object.keys(g).map(function (k) { return g[k]; }); }
  function dxFlag(t) { return '<p class="dx-flag">' + t + '</p>'; }
  // ----- main view -----
  function dashView() {
    var d = dxState(); d.drills = {};
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Dashboard</h1><p class="ccs-sub">View only. ' + (d.data ? 'Figures as of ' + esc(stamp(d.data.generated_at)) + (d.data.last_change ? '. Last order change ' + esc(stamp(d.data.last_change)) : '') + '.' : '') + '</p></div>' +
      '<div class="dx-acts"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="dx-refresh">Refresh</button>' + (d.data ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="dx-export">Export summary</button>' : '') + '</div></div>';
    if (d.err) return h + '<div class="ccs-empty"><b>' + esc(d.err) + '</b><button type="button" class="ccs-btn" data-act="dx-refresh">Try again</button></div>';
    if (!d.data) return h + '<p class="ccs-loading">Loading the dashboard…</p>';
    var f = d.f, r = dxRange(), data = d.data;
    var prods = []; data.orders.forEach(function (o) { (o.it || []).forEach(function (i) { if (prods.indexOf(i[0]) < 0) prods.push(i[0]); }); }); prods.sort();
    var chans = []; data.orders.forEach(function (o) { if (chans.indexOf(o.src) < 0) chans.push(o.src); });
    var sel = function (id, label, opts, cur) { return '<label class="ccs-field dx-f"><span class="ccs-label">' + label + '</span><select class="ccs-input" id="' + id + '" data-dx="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; };
    h += '<div class="dx-filters">' + sel('dx-p', 'Period', DX_PERIODS, f.p) +
      (f.p === 'c' ? '<label class="ccs-field dx-f"><span class="ccs-label">From</span><input class="ccs-input" type="date" id="dx-from" data-dx="dx-from" value="' + esc(f.from) + '"></label><label class="ccs-field dx-f"><span class="ccs-label">To</span><input class="ccs-input" type="date" id="dx-to" data-dx="dx-to" value="' + esc(f.to) + '"></label>' : '') +
      sel('dx-prod', 'Cake', [['all', 'All cakes']].concat(prods.map(function (p) { return [p, p]; })), f.prod) +
      sel('dx-ch', 'Channel', [['all', 'All channels']].concat(chans.map(function (c) { return [c, SOURCE_LABEL[c] || c]; })), f.ch) + '</div>';
    var cur = dxSales(r.from, r.to), cs = dxSum(cur), ps = r.pf ? dxSum(dxSales(r.pf, r.pt)) : null;
    var t = today(), up = data.orders.filter(function (o) { return o.st === 'confirmed' && o.pd >= t && dxMatch(o); }), upv = up.reduce(function (s, o) { return s + dxValue(o); }, 0);
    var cash = 0, cashList = []; data.orders.forEach(function (o) { var got = 0; (o.pay || []).forEach(function (p) { if (inRange(p[2], r.from, r.to) && dxMatch(o)) got += p[0] === 'refund' ? -num(p[1]) : p[0] === 'adjustment' ? 0 : num(p[1]); }); if (got) { cash += got; cashList.push(o); } });
    var cmp = ps ? ' vs ' + r.cmp : '';
    h += '<p class="dx-period">' + (r.all ? 'All recorded history' : esc(nice(r.from) + ' to ' + nice(r.to))) + (ps ? '. Compared with ' + esc(r.cmp) + '.' : '.') + (f.prod !== 'all' ? ' Showing ' + esc(f.prod) + ' only.' : '') + '</p>';
    h += '<div class="ccs-kpis dx-kpis">' +
      dxKpi('Cakes sold', int(cs.c), ps ? change(cs.c, ps.c) + cmp : 'Collected cakes', cur, 'Cakes sold') +
      dxKpi('Collected orders', int(cs.n), ps ? change(cs.n, ps.n) + cmp : 'Orders handed over', cur, 'Collected orders') +
      dxKpi('Net sales', m0(cs.v), ps ? change(cs.v, ps.v) + cmp : 'After refunds', cur, 'Net sales', 'good') +
      dxKpi('Average order', m0(cs.aov), ps ? change(cs.aov, ps.aov) + cmp : 'Net sales per order', cur, 'Average order value') +
      dxKpi('Booked ahead', m0(upv), up.length + (up.length === 1 ? ' confirmed order' : ' confirmed orders') + ' to collect', up, 'Confirmed orders not yet collected', 'deposit') +
      dxKpi('Cash collected', data.anyPay ? m0(cash) : 'Not recorded', data.anyPay ? 'Payments taken in this period' : 'No payments entered in the app yet', cashList, 'Orders with payments in this period') + '</div>';
    var flags = [];
    if (!data.anyPay) flags.push('No payments have been entered in the app yet, so deposits, balances and cash collected show nothing.');
    var imp = data.orders.filter(function (o) { return o.imp; }).length;
    if (imp) flags.push(int(imp) + ' orders were imported from the old sheets. They count as sales, but have no payment, handover or cancellation records.');
    var cov = {}; data.orders.forEach(function (o) { if (!o.imp) return; var c = cov[o.src] = cov[o.src] || [o.pd, o.pd]; if (o.pd < c[0]) c[0] = o.pd; if (o.pd > c[1]) c[1] = o.pd; });
    var ml = function (x) { return MON[+x.slice(5, 7) - 1] + ' ' + x.slice(0, 4); };
    if (Object.keys(cov).length > 1) flags.push('The old sheets cover different dates by channel: ' + Object.keys(cov).map(function (k) { return (SOURCE_LABEL[k] || k) + ' ' + ml(cov[k][0]) + ' to ' + ml(cov[k][1]); }).join('; ') + '. Months outside those dates look lower because orders were not recorded, not because sales fell.');
    flags.push('Prices are shown as charged. Tax treatment is not confirmed.');
    if (data.tests_excluded) flags.push(data.tests_excluded + ' test ' + (data.tests_excluded === 1 ? 'order is' : 'orders are') + ' left out of every figure.');
    h += '<details class="dx-flags"><summary>' + flags.length + ' things to know about this data</summary>' + flags.map(dxFlag).join('') + '</details>';
    h += dxMonthly(r) + dxProducts(cur) + dxChannels(cur) + dxCustomers(cur, r) + dxPayments(r) + dxUpcoming(up) + dxOps(r) + dxDiscounts(cur) + dxDemand(cur) + dxYear() + dxOrders(r) + dxDefs();
    return h;
  }
  function dxMonthly(r) {
    var t = today(), end = r.all ? t : (r.to > t ? t : r.to), rows = [], tbl = '';
    for (var i = 12; i >= 0; i--) {
      var ms = monthStart(addMonths(end, -i)), me = monthEnd(ms), list = dxSales(ms, me), s = dxSum(list);
      var ly = dxSales(monthStart(addMonths(ms, -12)), monthEnd(addMonths(ms, -12))), lys = ly.length ? dxSum(ly) : null;
      rows.push({ l: MON[+ms.slice(5, 7) - 1] + (ms.slice(5, 7) === '01' || i === 12 ? ' ' + ms.slice(2, 4) : ''), ms: ms, s: s, ly: lys, list: list, t: MON[+ms.slice(5, 7) - 1] + ' ' + ms.slice(0, 4) + ' sales', dim: ms === monthStart(t) });
    }
    rows.forEach(function (x, k) {
      var p = k ? rows[k - 1].s : null;
      tbl += '<tr><td>' + esc(MON[+x.ms.slice(5, 7) - 1] + ' ' + x.ms.slice(0, 4)) + (x.dim ? ' (to date)' : '') + '</td><td class="ccs-num">' + int(x.s.c) + '</td><td class="ccs-num">' + (p ? (x.s.c - p.c >= 0 ? '+' : '') + int(x.s.c - p.c) + ' (' + change(x.s.c, p.c) + ')' : '') + '</td><td class="ccs-num">' + m0(x.s.v) + '</td><td class="ccs-num">' + (p ? (x.s.v - p.v >= 0 ? '+' : '-') + m0(Math.abs(x.s.v - p.v)) + ' (' + change(x.s.v, p.v) + ')' : '') + '</td><td class="ccs-num">' + (x.ly ? change(x.s.v, x.ly.v) : '<span class="ccs-hint">No data</span>') + '</td></tr>';
    });
    var ms0 = monthStart(t), dayN = +t.slice(8), lmS = monthStart(addMonths(t, -1)), lmE = addMonths(t, -1);
    var mtd = dxSum(dxSales(ms0, t)), lmtd = dxSum(dxSales(lmS, lmE)), lyl = dxSales(addMonths(ms0, -12), addMonths(t, -12)), lyt = lyl.length ? dxSum(lyl) : null;
    var body = '<div class="dx-mtd"><b>This month, 1 to ' + dayN + ' ' + MON[+t.slice(5, 7) - 1] + '</b><span>' + int(mtd.c) + ' cakes, ' + m0(mtd.v) + '</span><span>Same days last month: ' + int(lmtd.c) + ' cakes, ' + m0(lmtd.v) + ' (' + change(mtd.v, lmtd.v) + ' sales)</span>' + (lyt ? '<span>Same days last year: ' + int(lyt.c) + ' cakes, ' + m0(lyt.v) + ' (' + change(mtd.v, lyt.v) + ' sales)</span>' : '<span class="ccs-hint">No sales recorded for these dates last year.</span>') + '</div>' +
      '<p class="dx-ch">Net sales by month</p>' + dxCols(rows.map(function (x) { return { l: x.l, v: x.s.v, list: x.list, t: x.t, dim: x.dim }; }), true) +
      '<p class="dx-ch">Cakes sold by month</p>' + dxCols(rows.map(function (x) { return { l: x.l, v: x.s.c, list: x.list, t: x.t, dim: x.dim }; })) +
      '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Month</th><th class="ccs-num">Cakes</th><th class="ccs-num">Change</th><th class="ccs-num">Net sales</th><th class="ccs-num">Change</th><th class="ccs-num">Sales vs last year</th></tr></thead><tbody>' + tbl + '</tbody></table></div>' +
      '<p class="ccs-hint">The current month is incomplete. Use the month-to-date figures above for a fair comparison.</p>';
    return dxSec('mo', 'Month by month', '13 months to ' + esc(MON[+end.slice(5, 7) - 1] + ' ' + end.slice(0, 4)), body, true);
  }
  function dxProducts(cur) {
    var by = function (fn) { return dxGroup(cur, function (o) { return dxItems(o).map(function (i) { var q = num(i[3]) || 1; return [fn(i), q, num(i[4]) * q]; }); }); };
    var sortK = DX.psort, srt = function (a) { return a.sort(function (x, y) { return sortK === 'v' ? y.v - x.v : y.q - x.q; }); };
    var fmt = function (x) { return int(x.q) + ' · ' + m0(x.v); };
    var cakes = srt(by(function (i) { return i[0]; })), fl = srt(by(function (i) { return i[1] || i[0]; })).slice(0, 10), sz = srt(by(function (i) { return i[2] + ' inch'; }));
    var sold = {}; cakes.forEach(function (x) { sold[x.l] = x.q; });
    var slow = DX.data.products.filter(function (p) { return p.on; }).map(function (p) { return { l: p.n, q: sold[p.n] || 0 }; }).sort(function (a, b) { return a.q - b.q; });
    var total = cakes.reduce(function (s, x) { return s + x.q; }, 0) || 1, slowList = slow.filter(function (p) { return p.q / total < 0.08; });
    var tg = function (k, l) { return '<button type="button" class="ccs-tab" data-act="dx-psort" data-v="' + k + '" aria-pressed="' + (DX.psort === k) + '">' + l + '</button>'; };
    var body = cur.length ? '<div class="ccs-tabs" role="group" aria-label="Rank by">' + tg('q', 'Rank by cakes') + tg('v', 'Rank by sales') + '</div>' +
      '<div class="dx-grid3"><div><p class="dx-ch">Cakes</p>' + dxBars(cakes.map(function (x) { return { l: x.l, v: sortK === 'v' ? x.v : x.q, q: x.q, vv: x.v, list: x.list, t: x.l }; }), function (x) { return int(x.q) + ' · ' + m0(x.vv); }) + '</div>' +
      '<div><p class="dx-ch">Flavours (top 10)</p>' + dxBars(fl.map(function (x) { return { l: x.l, v: sortK === 'v' ? x.v : x.q, q: x.q, vv: x.v, list: x.list, t: x.l }; }), function (x) { return int(x.q) + ' · ' + m0(x.vv); }) + '</div>' +
      '<div><p class="dx-ch">Sizes</p>' + dxBars(sz.map(function (x) { return { l: x.l, v: sortK === 'v' ? x.v : x.q, q: x.q, vv: x.v, list: x.list, t: x.l + ' cakes' }; }), function (x) { return int(x.q) + ' · ' + m0(x.vv); }) + '</div></div>' +
      '<p class="dx-ch">Slow sellers</p>' + (slowList.length ? '<ul class="dx-list">' + slowList.map(function (p) { return '<li><b>' + esc(p.l) + '</b> ' + (p.q ? int(p.q) + ' sold, ' + Math.round(p.q / total * 100) + '% of cakes' : 'No sales in this period') + '</li>'; }).join('') + '</ul>' : '<p class="ccs-hint">Every cake on sale took at least 8% of cakes sold.</p>') +
      '<p class="ccs-hint">Sales by cake use the item price, so they can differ slightly from order totals that include delivery or a changed price. Older imported orders used different cake names.</p>' : '<p class="ccs-quiet">No collected orders in this period.</p>';
    return dxSec('pr', 'Products', fmt({ q: cakes.reduce(function (s, x) { return s + x.q; }, 0), v: cakes.reduce(function (s, x) { return s + x.v; }, 0) }).replace(' · ', ' cakes · '), body);
  }
  function dxChannels(cur) {
    var g = dxGroup(cur, function (o) { return [[SOURCE_LABEL[o.src] || o.src, dxCakes(o), dxValue(o)]]; }).sort(function (a, b) { return b.v - a.v; });
    var tv = g.reduce(function (s, x) { return s + x.v; }, 0) || 1;
    var body = g.length ? '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Channel</th><th class="ccs-num">Orders</th><th class="ccs-num">Cakes</th><th class="ccs-num">Net sales</th><th class="ccs-num">Share</th><th class="ccs-num">Average order</th></tr></thead><tbody>' +
      g.map(function (x) { return '<tr class="ccs-click" data-act="dx-drill" data-v="' + dxKey({ t: x.l + ' orders', l: x.list }) + '"><td>' + esc(x.l) + '</td><td class="ccs-num">' + int(x.list.length) + '</td><td class="ccs-num">' + int(x.q) + '</td><td class="ccs-num">' + m0(x.v) + '</td><td class="ccs-num">' + Math.round(x.v / tv * 100) + '%</td><td class="ccs-num">' + m0(x.v / x.list.length) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="ccs-hint">Online means the website order form. Walk-in includes counter orders entered by staff. Phone, WhatsApp and social media only appear once staff record them.</p>' : '<p class="ccs-quiet">No collected orders in this period.</p>';
    return dxSec('ch', 'Order channels', g.length ? esc(g[0].l) + ' leads with ' + Math.round(g[0].v / tv * 100) + '% of sales' : '', body);
  }
  function dxCustomers(cur, r) {
    var first = DX.data.first, by = {}, all = DX.data.orders;
    cur.forEach(function (o) { if (!o.c) return; var e = by[o.c] = by[o.c] || { n: o.cn || 'Customer', v: 0, list: [] }; e.v += dxValue(o); e.list.push(o); });
    var ids = Object.keys(by), nw = ids.filter(function (c) { return first[c] >= r.from; }), ret = ids.filter(function (c) { return first[c] < r.from; });
    var upto = {}; all.forEach(function (o) { if (o.sale && o.c && o.pd <= r.to) upto[o.c] = (upto[o.c] || 0) + 1; });
    var rep = ids.filter(function (c) { return upto[c] >= 2; }).length, spend = ids.reduce(function (s, c) { return s + by[c].v; }, 0);
    var listOf = function (cs) { var l = []; cs.forEach(function (c) { l = l.concat(by[c].list); }); return l; };
    var top = ids.map(function (c) { return by[c]; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
    var noId = cur.filter(function (o) { return !o.c; }).length;
    var body = ids.length ? '<div class="ccs-kpis dx-kpis dx-kpis-s">' +
      dxKpi('Customers', int(ids.length), 'Bought in this period', cur, 'Collected orders') +
      dxKpi('New', int(nw.length), Math.round(nw.length / ids.length * 100) + '% first ever order', listOf(nw), 'New customers\' orders') +
      dxKpi('Returning', int(ret.length), Math.round(ret.length / ids.length * 100) + '% had bought before', listOf(ret), 'Returning customers\' orders') +
      dxKpi('Repeat rate', Math.round(rep / ids.length * 100) + '%', 'Have 2 or more collected orders', null) +
      dxKpi('Average spend', m0(spend / ids.length), 'Per customer in this period', null) + '</div>' +
      '<p class="dx-ch">Top customers by spend</p><ul class="dx-list">' + top.map(function (x) { return '<li>' + dxTap(x.list, esc(x.n), '<b>' + esc(x.n) + '</b> ' + m0(x.v) + ', ' + x.list.length + (x.list.length === 1 ? ' order' : ' orders'), 'dx-li') + '</li>'; }).join('') + '</ul>' +
      '<p class="ccs-hint">Customers are matched by mobile number, so the same person ordering online and at the counter counts once.' + (noId ? ' ' + noId + ' orders have no customer record.' : '') + '</p>' : '<p class="ccs-quiet">No collected orders in this period.</p>';
    return dxSec('cu', 'Customers', ids.length ? int(nw.length) + ' new · ' + int(ret.length) + ' returning' : '', body);
  }
  function dxPayments(r) {
    var k = { deposit: 0, balance: 0, full: 0, refund: 0 }, lists = { deposit: [], balance: [], full: [], refund: [] }, t = today();
    DX.data.orders.forEach(function (o) { if (!dxMatch(o)) return; (o.pay || []).forEach(function (p) { if (k[p[0]] != null && inRange(p[2], r.from, r.to)) { k[p[0]] += num(p[1]); if (lists[p[0]].indexOf(o) < 0) lists[p[0]].push(o); } }); });
    var owing = DX.data.orders.filter(function (o) { return !o.imp && dxMatch(o) && ['awaiting_deposit', 'confirmed', 'completed'].indexOf(o.st) > -1 && o.tot - o.paid + o.refund > 0.005; });
    var bal = function (o) { return o.tot - o.paid + o.refund; }, over = owing.filter(function (o) { return o.pd < t; });
    var sum = function (l) { return l.reduce(function (s, o) { return s + bal(o); }, 0); };
    var body = (DX.data.anyPay ? '' : dxFlag('No payments have been recorded in the app yet. These figures fill in once staff use Record payment.')) +
      '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Deposits received', m0(k.deposit), 'By payment date', lists.deposit, 'Deposits received') + dxKpi('Balances and full payments', m0(k.balance + k.full), 'By payment date', lists.balance.concat(lists.full), 'Balance and full payments') +
      dxKpi('Refunds', m0(k.refund), 'Taken off net sales', lists.refund, 'Refunded orders', k.refund ? 'action' : '') + dxKpi('Cash collected', m0(k.deposit + k.balance + k.full - k.refund), 'Money in, less refunds', null, null, 'good') +
      dxKpi('Still owed', m0(sum(owing)), owing.length + ' orders, as of today', owing, 'Orders with money still owed', owing.length ? 'deposit' : '') + dxKpi('Overdue', m0(sum(over)), over.length + ' past their pickup date', over, 'Overdue balances', over.length ? 'action' : '') + '</div>' +
      '<p class="ccs-hint">Net sales counts collected orders by pickup date. Cash collected counts money by the day it was taken, so the two will rarely match. Imported orders are left out of money owed because they have no payment records.</p>';
    return dxSec('pa', 'Payments', DX.data.anyPay ? m0(k.deposit + k.balance + k.full - k.refund) + ' collected' : 'Not recorded yet', body);
  }
  function dxUpcoming(up) {
    var t = today(), pend = DX.data.orders.filter(function (o) { return ['awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit'].indexOf(o.st) > -1 && o.pd >= t && dxMatch(o); });
    var days = [], weeks = [];
    for (var i = 0; i < 14; i++) { var d = addDays(t, i), l = up.filter(function (o) { return o.pd === d; }); days.push({ l: (i === 0 ? 'Today' : WD[(new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7]) + ' ' + +d.slice(8), v: l.reduce(function (s, o) { return s + dxCakes(o); }, 0), list: l, t: nice(d, true) + ' pickups' }); }
    var ws = addDays(t, -((new Date(t + 'T12:00:00Z').getUTCDay() + 6) % 7));
    for (var w = 0; w < 6; w++) { var a = addDays(ws, w * 7), b = addDays(a, 6), wl = up.filter(function (o) { return o.pd >= a && o.pd <= b; }); weeks.push({ l: (w === 0 ? 'This week' : 'w/c ' + nice(a).replace(/^\w+ /, '')), v: wl.reduce(function (s, o) { return s + dxCakes(o); }, 0), vv: wl.reduce(function (s, o) { return s + dxValue(o); }, 0), list: wl, t: 'Week of ' + nice(a) }); }
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Confirmed to collect', int(up.length), up.reduce(function (s, o) { return s + dxCakes(o); }, 0) + ' cakes, ' + m0(up.reduce(function (s, o) { return s + dxValue(o); }, 0)), up, 'Confirmed orders to collect', 'good') +
      dxKpi('Not yet confirmed', int(pend.length), m0(pend.reduce(function (s, o) { return s + dxValue(o); }, 0)) + ' if all go ahead', pend, 'Orders waiting for review, quote or deposit', pend.length ? 'action' : '') + '</div>' +
      '<p class="dx-ch">Confirmed cakes per day, next 14 days</p>' + dxCols(days) + '<p class="dx-ch">Confirmed cakes per week</p>' + dxBars(weeks, function (x) { return int(x.v) + ' cakes · ' + m0(x.vv); }) +
      '<p class="ccs-hint">Booked business is not counted as sales until the cake is collected.</p>';
    return dxSec('up', 'Upcoming business', int(up.length) + ' confirmed · ' + int(pend.length) + ' waiting', body);
  }
  function dxOps(r) {
    var placed = DX.data.orders.filter(function (o) { return o.odok && inRange(o.od, r.from, r.to) && dxMatch(o); });
    var off = placed.filter(function (o) { return o.st === 'cancelled' || o.st === 'declined'; });
    var reasons = dxGroup(off, function (o) { return [[(o.cx || 'No reason recorded').trim(), 1, 0]]; }).sort(function (a, b) { return b.q - a.q; });
    var done = dxSales(r.from, r.to).filter(function (o) { return !o.imp; });
    var dueAt = function (o) { return Date.parse(o.pd + 'T' + (o.pt || '12:00') + ':00+12:00'); };
    var handed = done.filter(function (o) { return o.ho; }), late = handed.filter(function (o) { return Date.parse(o.ho) > dueAt(o) + 36e5; });
    var ready = done.filter(function (o) { return o.ra; }), onTime = ready.filter(function (o) { return Date.parse(o.ra) <= dueAt(o); });
    var amended = placed.filter(function (o) { return o.rev > 0; });
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Orders placed', int(placed.length), 'By order date', placed, 'Orders placed') +
      dxKpi('Cancelled or declined', int(off.length), placed.length ? Math.round(off.length / placed.length * 100) + '% of orders placed' : '', off, 'Cancelled or declined orders', off.length ? 'action' : '') +
      dxKpi('Ready on time', ready.length ? Math.round(onTime.length / ready.length * 100) + '%' : 'Not recorded', ready.length ? onTime.length + ' of ' + ready.length + ' marked Ready before pickup time' : 'Starts once the kitchen marks cakes Ready', ready.filter(function (o) { return onTime.indexOf(o) < 0; }), 'Cakes ready after pickup time') +
      dxKpi('Collected late', handed.length ? int(late.length) : 'Not recorded', handed.length ? 'More than 1 hour after pickup time, of ' + handed.length : 'Starts once handovers are recorded', late, 'Orders collected late') +
      dxKpi('Amended orders', int(amended.length), 'Every change is kept in the order history', amended, 'Amended orders') + '</div>' +
      (reasons.length ? '<p class="dx-ch">Cancellation reasons</p>' + dxBars(reasons.map(function (x) { return { l: x.l, v: x.q, list: x.list, t: x.l }; }), function (x) { return int(x.v); }) : '') +
      '<p class="ccs-hint">Orders placed uses the order date. ' + (DX.data.orders.filter(function (o) { return !o.odok; }).length) + ' imported walk-in orders have no reliable order date and are left out here.</p>';
    return dxSec('op', 'Operations', off.length + ' cancelled or declined', body);
  }
  function dxDiscounts(cur) {
    var cut = cur.filter(function (o) { return o.fin != null && num(o.fin) < num(o.est) - 0.005; }), less = cut.reduce(function (s, o) { return s + num(o.est) - num(o.fin); }, 0), list = cur.reduce(function (s, o) { return s + num(o.est); }, 0);
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Orders below list price', int(cut.length), cur.length ? Math.round(cut.length / cur.length * 100) + '% of collected orders' : '', cut, 'Orders priced below the list price') +
      dxKpi('Amount below list price', m0(less), list ? Math.round(less / list * 100) + '% of list value' : '', cut, 'Orders priced below the list price') + '</div>' +
      dxFlag('Discounts are not recorded separately. These figures only show where staff agreed a price below the price list.') +
      dxFlag('Gross profit and margin are not shown because cake costs are not recorded.');
    return dxSec('di', 'Discounts and profit', cut.length ? m0(less) + ' below list price' : 'No price reductions', body);
  }
  function dxDemand(cur) {
    var wd = [0, 0, 0, 0, 0, 0, 0], wl = [[], [], [], [], [], [], []];
    cur.forEach(function (o) { var k = (new Date(o.pd + 'T12:00:00Z').getUTCDay() + 6) % 7; wd[k] += dxCakes(o); wl[k].push(o); });
    var mon = [], all = DX.data.orders.filter(function (o) { return o.sale && dxMatch(o); }), yrs = {};
    for (var m = 0; m < 12; m++) mon.push({ l: MON[m], v: 0, list: [], t: MON[m] + ', all years', y: {} });
    all.forEach(function (o) { var k = +o.pd.slice(5, 7) - 1; mon[k].v += dxCakes(o); mon[k].list.push(o); mon[k].y[o.pd.slice(0, 7)] = 1; yrs[o.pd.slice(0, 4)] = 1; });
    var tm = today().slice(0, 7); mon.forEach(function (x) { delete x.y[tm]; var n = Object.keys(x.y).length; x.v = n ? Math.round(x.v / n) : 0; });
    var lead = cur.filter(function (o) { return o.odok && o.od <= o.pd; }).map(function (o) { return daysBetween(o.od, o.pd); }).sort(function (a, b) { return a - b; });
    var bk = [['Same day', 0, 0], ['1 to 2 days', 1, 2], ['3 to 6 days', 3, 6], ['1 to 2 weeks', 7, 13], ['2 weeks or more', 14, 1e6]];
    var body = '<div class="dx-grid2"><div><p class="dx-ch">Cakes by pickup day</p>' + dxCols(WD.map(function (n, k) { return { l: n, v: wd[k], list: wl[k], t: n + ' pickups' }; })) + '</div>' +
      '<div><p class="dx-ch">Ordered how far ahead</p>' + (lead.length ? dxBars(bk.map(function (b) { var n = lead.filter(function (x) { return x >= b[1] && x <= b[2]; }).length; return { l: b[0], v: n }; }), function (x) { return Math.round(x.v / lead.length * 100) + '%'; }) + '<p class="ccs-hint">Typical gap: ' + lead[Math.floor(lead.length / 2)] + ' days between ordering and pickup (' + lead.length + ' orders with a reliable order date).</p>' : '<p class="ccs-hint">No orders with a reliable order date in this period.</p>') + '</div></div>' +
      '<p class="dx-ch">Seasonal pattern: average cakes per month, ' + Object.keys(yrs).sort().join(' to ').replace(/ to .* to /, ' to ') + '</p>' + dxCols(mon) +
      '<p class="ccs-hint">The seasonal chart averages every complete month on record, not just the selected period, so busy and quiet months can be compared fairly.</p>';
    var top = wd.indexOf(Math.max.apply(null, wd));
    return dxSec('de', 'Demand patterns', cur.length ? 'Busiest pickup day: ' + WD[top] : '', body);
  }
  function dxYear() {
    var y = DX.year, years = DX.data.years.slice(); if (years.indexOf(y) < 0) years.push(y); years.sort();
    var tot = { n: 0, c: 0, v: 0 }, rows = '';
    for (var m = 1; m <= 12; m++) {
      var ms = y + '-' + String(m).padStart(2, '0') + '-01', l = dxSales(ms, monthEnd(ms)), s = dxSum(l); tot.n += s.n; tot.c += s.c; tot.v += s.v;
      rows += '<tr' + (l.length ? ' class="ccs-click" data-act="dx-drill" data-v="' + dxKey({ t: MON[m - 1] + ' ' + y + ' sales', l: l }) + '"' : '') + '><td>' + MON[m - 1] + '</td><td class="ccs-num">' + int(s.n) + '</td><td class="ccs-num">' + int(s.c) + '</td><td class="ccs-num">' + m0(s.v) + '</td><td class="ccs-num">' + (s.n ? m0(s.aov) : '') + '</td></tr>';
    }
    var body = '<div class="ccs-tabs" role="group" aria-label="Year">' + years.map(function (x) { return '<button type="button" class="ccs-tab" data-act="dx-year" data-v="' + x + '" aria-pressed="' + (x === y) + '">' + x + '</button>'; }).join('') + '</div>' +
      '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>' + y + '</th><th class="ccs-num">Orders</th><th class="ccs-num">Cakes</th><th class="ccs-num">Net sales</th><th class="ccs-num">Average order</th></tr></thead><tbody>' + rows +
      '<tr class="dx-total"><td>Total</td><td class="ccs-num">' + int(tot.n) + '</td><td class="ccs-num">' + int(tot.c) + '</td><td class="ccs-num">' + m0(tot.v) + '</td><td class="ccs-num">' + (tot.n ? m0(tot.v / tot.n) : '') + '</td></tr></tbody></table></div><p class="ccs-hint">Uses the cake and channel filters, not the period.</p>';
    return dxSec('yr', 'Year overview', y + ': ' + m0(tot.v) + ' from ' + int(tot.c) + ' cakes', body);
  }
  function dxOrderList(r) {
    var st = DX.f.st, t = today();
    return DX.data.orders.filter(function (o) {
      if (!dxMatch(o) || !inRange(o.pd, r.from, r.to)) return false;
      return st === 'all' || (st === 'completed' ? o.sale : st === 'off' ? (o.st === 'cancelled' || o.st === 'declined') : OPEN.indexOf(o.st) > -1);
    }).sort(function (a, b) { return a.pd < b.pd ? 1 : -1; });
  }
  function dxRows(list, max) {
    return '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Order</th><th>Pickup</th><th>Customer</th><th>Channel</th><th>Status</th><th class="ccs-num">Cakes</th><th class="ccs-num">Total</th></tr></thead><tbody>' +
      list.slice(0, max).map(function (o) { return '<tr class="ccs-click" data-act="open-order" data-id="' + o.i + '"><td data-label="Order"><b>' + esc(o.r) + '</b>' + (o.rev ? ' <span class="ccs-pill s-amend">Amended</span>' : '') + '</td><td data-label="Pickup">' + esc(nice(o.pd)) + ' ' + esc(o.pd.slice(0, 4)) + '</td><td data-label="Customer">' + esc(o.cn || '') + '</td><td data-label="Channel">' + esc(SOURCE_LABEL[o.src] || o.src) + '</td><td data-label="Status">' + pill(o.st, o.fm) + '</td><td class="ccs-num" data-label="Cakes">' + int(dxCakes(o)) + '</td><td class="ccs-num" data-label="Total">' + money(dxValue(o)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (list.length > max ? '<p class="ccs-hint">Showing the latest ' + max + ' of ' + int(list.length) + '. Export to see them all.</p>' : '');
  }
  function dxOrders(r) {
    var list = dxOrderList(r);
    var body = '<label class="ccs-field dx-f"><span class="ccs-label">Status</span><select class="ccs-input" id="dx-st" data-dx="dx-st">' + DX_STATUS.map(function (o) { return '<option value="' + o[0] + '"' + (DX.f.st === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      (list.length ? dxRows(list, 60) : '<p class="ccs-quiet">No orders match.</p>') + '<p class="ccs-hint">Filtered by pickup date, cake and channel. Tap an order to open it.</p>';
    return dxSec('ol', 'Order list', int(list.length) + ' orders', body);
  }
  function dxDefs() {
    var d = [['Cakes sold', 'Number of cakes in collected orders, counting quantity. One order can hold several cakes.'], ['Collected orders', 'Orders marked collected or delivered, dated by their pickup date.'], ['Net sales', 'The agreed price of collected orders (or the list price when no price was agreed), including any delivery fee, less refunds. Shown as charged; tax is not separated.'],
      ['Average order', 'Net sales divided by collected orders.'], ['Cash collected', 'Deposits, balances and full payments recorded, by the date they were taken, less refunds.'], ['Booked ahead', 'Confirmed orders with a pickup date from today, not yet collected. Never counted as sales.'],
      ['New and returning', 'Matched by mobile number. New means the customer\'s first ever collected order falls in the period.'], ['Repeat rate', 'Share of this period\'s customers with two or more collected orders up to the end of the period.'],
      ['Comparisons', 'This month is compared with the same days of last month. Other periods are compared with the same length of time just before.'], ['Left out', 'Test orders everywhere. Cancelled and declined orders from all sales figures.'], ['Changes to orders', 'Amended orders use their latest price. Every change stays in the order\'s history.']];
    return dxSec('df', 'How the figures are worked out', '', '<dl class="ccs-kv dx-defs">' + d.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>');
  }
  function dashSheet() {
    var dr = S.sheet.drill, list = dr.l.slice().sort(function (a, b) { return a.pd < b.pd ? 1 : -1; }), s = dxSum(list);
    return sheetHead(esc(dr.t)) + '<div class="ccs-sheet-body"><p class="ccs-hint">' + int(list.length) + ' orders · ' + int(s.c) + ' cakes · ' + m0(s.v) + '</p>' + dxRows(list, 200) + '</div>';
  }
  function dxCsv(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function dxExport() {
    var r = dxRange(), cur = dxSales(r.from, r.to), s = dxSum(cur), list = dxOrderList(r), f = DX.f;
    var lines = [['Corner Café cake dashboard'], ['Period', r.all ? 'All time' : r.from + ' to ' + r.to], ['Cake', f.prod === 'all' ? 'All cakes' : f.prod], ['Channel', f.ch === 'all' ? 'All channels' : SOURCE_LABEL[f.ch] || f.ch], ['Status (order list)', (DX_STATUS.filter(function (x) { return x[0] === f.st; })[0] || ['', ''])[1]], ['Figures as of', DX.data.generated_at], [],
      ['Cakes sold', s.c], ['Collected orders', s.n], ['Net sales', s.v.toFixed(2)], ['Average order', s.aov.toFixed(2)], ['Note', 'Net sales are prices as charged less refunds; tax not separated. Test orders excluded.'], [],
      ['Order', 'Order date', 'Pickup date', 'Channel', 'Status', 'Cakes', 'Total', 'Refunds', 'Paid', 'Cake details', 'Customer']];
    list.forEach(function (o) { lines.push([o.r, o.odok ? o.od : '', o.pd, SOURCE_LABEL[o.src] || o.src, statusLabel(o.st, o.fm), dxCakes(o), dxValue(o).toFixed(2), o.refund.toFixed(2), o.paid.toFixed(2), dxItems(o).map(function (i) { return (i[1] || i[0]) + ' ' + i[2] + ' inch x' + (i[3] || 1); }).join('; '), o.cn || '']); });
    var csv = lines.map(function (l) { return l.map(dxCsv).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'corner-cafe-cake-dashboard-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Summary exported');
  }
  function dashAct(a, b, v) {
    dxKeep();
    if (a === 'dx-refresh') dashLoad(true);
    else if (a === 'dx-export') dxExport();
    else if (a === 'dx-psort') { DX.psort = v; dxKeep(); view(); }
    else if (a === 'dx-year') { DX.year = v; dxKeep(); view(); }
    else if (a === 'dx-drill') { var dr = DX.drills[v]; if (!dr) return; S.sheet = { type: 'dash', drill: dr }; S.panel = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  }
  function dxKeep() { root.querySelectorAll('[data-dxsec]').forEach(function (el) { DX['o' + el.dataset.dxsec] = el.open; }); }
  function dashChange(t) {
    var f = DX.f, k = t.dataset.dx; dxKeep();
    if (k === 'dx-p') { f.p = t.value; if (f.p === 'c' && !f.from) { f.to = today(); f.from = monthStart(f.to); } }
    else if (k === 'dx-from') f.from = t.value; else if (k === 'dx-to') f.to = t.value;
    else if (k === 'dx-prod') f.prod = t.value; else if (k === 'dx-ch') f.ch = t.value; else if (k === 'dx-st') { f.st = t.value; }
    view();
  }
