  // ---------- executive dashboard (view only: admin and marketing) ----------
  // Single source: the Master Cake Register (both Google Sheets, the website and this app, de-duplicated).
  // Completed sales = handed over in the app, or a past sheet order not cancelled (assumed). Value = agreed price, or list price when none.
  // Payments = money recorded in the app, by the day taken. Records waiting for a manager's review are left out until decided.
  var DX = null;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DX_PERIODS = [['m', 'This month to date'], ['lm', 'Last month'], ['3m', 'Last 3 months'], ['y', 'This year to date'], ['12', 'Last 12 months'], ['all', 'All time'], ['c', 'Choose dates']];
  var DX_STATUS = [['all', 'All statuses'], ['completed', 'Completed sales'], ['open', 'Still to come'], ['off', 'Cancelled']];
  var DX_BASIS = [['p', 'Pickup date'], ['o', 'Order date']];
  var REG_ST = { received: 'Received', confirmed: 'Confirmed', not_confirmed: 'Quote or enquiry', cancelled: 'Cancelled', completed: 'Collected' };
  function dxState() { if (!DX) DX = { data: null, loading: false, err: null, f: { p: 'm', b: 'p', from: '', to: '', prod: 'all', ch: 'all', st: 'all' }, year: null, psort: 'q', drills: {} }; return DX; }
  function dashLoad(force) {
    var d = dxState(); if (d.loading) return; if (d.data && !force) { view(); return; }
    d.loading = true; d.err = null; view();
    sb.rpc('dashboard_register').then(function (r) {
      d.loading = false;
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) d.err = (r.data && r.data.message) || 'The dashboard could not load.';
      else { d.data = r.data; dxPrep(); }
      if (S.tab === 'dash') view();
    }).catch(function (e) { console.error(e); d.loading = false; if (errKind(e) === 'expired') return sessionExpired(); d.err = 'The dashboard could not load. Check the connection and try again.'; if (S.tab === 'dash') view(); });
  }
  function dnum(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function dxPrep() {
    var d = DX.data, first = {};
    d.orders.forEach(function (o) {
      o.live = o.paid != null;
      o.fin = o.cv; o.est = o.lv; o.tot = dnum(o.cv != null ? o.cv : o.lv);
      o.paid = dnum(o.paid); o.refund = dnum(o.ref); o.net = o.tot - o.refund; o.cakes = 0;
      (o.it || []).forEach(function (i) { o.cakes += dnum(i[3]) || 1; });
      o.sale = o.cp === 'recorded' || o.cp === 'assumed';
      o.imp = !o.live;
      o.off = o.st === 'cancelled';
      o.open = o.cp === 'pending' && !o.off && o.st !== 'not_confirmed';
      if (o.sale && o.c) { if (!first[o.c] || o.pd < first[o.c]) first[o.c] = o.pd; }
    });
    d.first = first;
    d.years = []; d.orders.forEach(function (o) { var x = dxD(o); if (!x) return; var y = x.slice(0, 4); if (o.sale && d.years.indexOf(y) < 0) d.years.push(y); }); d.years.sort();
    if (!DX.year) DX.year = today().slice(0, 4);
    d.anyPay = d.orders.some(function (o) { return (o.pay || []).length; });
  }
  // The date each record is counted on: its pickup date, or its order date when that was chosen (records with no reliable order date drop out)
  function dxD(o) { return DX.f.b === 'o' ? (o.odok ? o.od : null) : o.pd; }
  function regLabel(o) { return o.cp === 'assumed' ? 'Past, assumed collected' : o.cp === 'not_recorded' ? 'Past, not marked collected' : REG_ST[o.st] || o.st; }
  function regPill(o) { var t = o.st === 'cancelled' ? ' s-off' : o.cp === 'recorded' ? ' s-done' : o.cp === 'assumed' ? '' : o.cp === 'not_recorded' ? ' s-action' : o.st === 'confirmed' ? ' s-good' : ' s-action'; return '<span class="ccs-pill' + t + '">' + esc(regLabel(o)) + '</span>'; }
  // ----- periods -----
  function dxMonthStart(iso) { return iso.slice(0, 8) + '01'; }
  function dxMonthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  function dxAddMonths(iso, n) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(Math.min(+iso.slice(8, 10), last)).padStart(2, '0'); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
  function dxRange() {
    var f = DX.f, t = today(), r;
    if (f.p === 'm') r = { from: dxMonthStart(t), to: t, pf: dxMonthStart(dxAddMonths(t, -1)), pt: dxAddMonths(t, -1), cmp: 'same days last month' };
    else if (f.p === 'lm') { var s = dxMonthStart(dxAddMonths(t, -1)); r = { from: s, to: dxMonthEnd(s), pf: dxMonthStart(dxAddMonths(s, -1)), pt: dxMonthEnd(dxAddMonths(s, -1)), cmp: 'the month before' }; }
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
  function dxCakes(o) { return dxItems(o).reduce(function (s, i) { return s + (dnum(i[3]) || 1); }, 0); }
  function dxValue(o) { return DX.f.prod === 'all' ? o.net : dxItems(o).reduce(function (s, i) { return s + dnum(i[4]) * (dnum(i[3]) || 1); }, 0); }
  function dxSales(a, b) { return DX.data.orders.filter(function (o) { return o.sale && inRange(dxD(o), a, b) && dxMatch(o); }); }
  function dxIn(a, b, fn) { return DX.data.orders.filter(function (o) { return inRange(dxD(o), a, b) && dxMatch(o) && (!fn || fn(o)); }); }
  function dxSum(list) { var n = list.length, c = 0, v = 0; list.forEach(function (o) { c += dxCakes(o); v += dxValue(o); }); return { n: n, c: c, v: v, aov: n ? v / n : 0 }; }
  // ----- formatting -----
  function m0(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function int(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(n) { return (n > 0 ? '+' : '') + Math.round(n) + '%'; }
  function change(cur, prev) { if (prev == null) return ''; if (!prev) return cur ? 'New' : 'No change'; return pct((cur - prev) / prev * 100); }
  function dxKey(list) { var k = 'k' + Object.keys(DX.drills).length; DX.drills[k] = list; return k; }
  function dxTap(list, title, inner, cls) { return list && list.length ? '<button type="button" class="' + cls + ' dx-tap" data-act="dx-drill" data-v="' + dxKey({ t: title, l: list }) + '">' + inner + '</button>' : '<div class="' + cls + '">' + inner + '</div>'; }
  function dxKpi(label, value, sub, list, title, tone) { return dxTap(list, title, '<span class="ccs-kpi-l">' + label + '</span><b class="ccs-kpi-n">' + value + '</b><span class="ccs-kpi-s">' + sub + '</span>', 'ccs-kpi dx-kpi' + (tone ? ' t-' + tone : '')); }
  // Charts: the highest bar is drawn in strong green and named in words underneath; the rest are a lighter green
  // Every bar equal to the highest is marked (ties are all shown)
  function dxTops(rows) { var m = 0; rows.forEach(function (r) { if (!r.dim && r.v > m) m = r.v; }); return rows.map(function (r) { return m > 0 && !r.dim && r.v === m; }); }
  function dxAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function dxCols(rows, money, word) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1, tops = dxTops(rows), f = function (v) { return money ? m0(v) : int(v); };
    var names = rows.filter(function (r, i) { return tops[i]; }).map(function (r) { return '<b>' + esc(r.full || r.l) + '</b>'; });
    return '<div class="dx-plot"><div class="dx-cols" style="grid-template-columns:repeat(' + rows.length + ',minmax(0,1fr))">' + rows.map(function (r, i) {
      return dxTap(r.list, r.t, '<span class="dx-colv">' + f(r.v) + '</span><span class="dx-colbar"><i style="height:' + Math.max(r.v ? 3 : 0, Math.round(r.v / max * 100)) + '%"></i></span><span class="dx-coll">' + esc(r.l) + '</span>', 'dx-col' + (tops[i] ? ' is-top' : '') + (r.dim ? ' is-dim' : ''));
    }).join('') + '</div>' + (names.length && names.length < rows.length ? '<p class="dx-peak"><i></i><span>' + (word || 'Highest') + ': ' + dxAnd(names) + ', ' + f(rows[tops.indexOf(true)].v) + (names.length > 1 ? ' each' : '') + '</span></p>' : '') + '</div>';
  }
  function dxBars(rows, fmt) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1, tops = dxTops(rows), n = tops.filter(Boolean).length;
    return '<div class="dx-plot"><div class="dx-bars">' + rows.map(function (r, i) {
      return dxTap(r.list, r.t, '<span class="dx-bl">' + esc(r.l) + '</span><span class="dx-bt"><i style="width:' + Math.round(r.v / max * 100) + '%"></i></span><b>' + fmt(r) + '</b>', 'dx-brow' + (tops[i] && n < rows.length ? ' is-top' : ''));
    }).join('') + '</div></div>';
  }
  function dxSec(id, title, note, body) { DX.secs.push([id, title, note, body]); return ''; }
  function dxGroup(list, keyFn) { var g = {}; list.forEach(function (o) { keyFn(o).forEach(function (k) { var e = g[k[0]] = g[k[0]] || { l: k[0], q: 0, v: 0, list: [] }; e.q += k[1]; e.v += k[2]; if (e.list.indexOf(o) < 0) e.list.push(o); }); }); return Object.keys(g).map(function (k) { return g[k]; }); }
  function dxFlag(t) { return '<p class="dx-flag">' + t + '</p>'; }
  // ----- main view -----
  // How current the register is: when each sheet was last read, and any failed read
  function dxSync(sy, long) {
    if (!sy) return '';
    var lim = (sy.stale_minutes || 20) * 6e4, now = Date.now(), bad = [], parts = [];
    [['online', 'Online sheet'], ['walkin', 'Walk-in sheet']].forEach(function (k) {
      var x = sy[k[0]] || {}, ok = x.ok_at ? Date.parse(x.ok_at) : 0, fl = x.fail_at ? Date.parse(x.fail_at) : 0;
      parts.push(k[1] + ' ' + (ok ? when(x.ok_at) : 'never read'));
      if (fl > ok) bad.push(k[1] + ' could not be read at ' + when(x.fail_at) + (x.fail_msg ? ': ' + x.fail_msg : '') + '.');
      else if (!ok || now - ok > lim) bad.push(k[1] + ' has not been read since ' + (ok ? when(x.ok_at) : 'setup') + '. New entries and changes in it are not shown yet.');
    });
    return '<p class="ccs-sub dx-read">Last read: ' + esc(parts.join(' · ')) + '.</p>' + (bad.length ? '<p class="ccs-note" role="alert"><b>Not up to date.</b> ' + esc(bad.join(' ')) + (long ? ' The sheets are read every 5 minutes by the Google script. If this stays, check the script is still switched on.' : '') + '</p>' : '');
  }
  function dashView() {
    var d = dxState(); d.drills = {};
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Dashboard</h1><p class="ccs-sub"><span class="ccs-subtxt">' + (d.data ? 'Figures as of ' + esc(stamp(d.data.generated_at)) + '. ' : '') + 'View only.</span> <button type="button" class="ccs-link ccs-refresh" data-act="dx-refresh">Refresh</button>' + (d.data ? ' · <button type="button" class="ccs-link ccs-refresh" data-act="dx-export">Export summary</button>' : '') + '</p>' + (d.data ? dxSync(d.data.sync) : '') + '</div></div>';
    if (d.err) return h + '<div class="ccs-empty"><b>' + esc(d.err) + '</b><button type="button" class="ccs-btn" data-act="dx-refresh">Try again</button></div>';
    if (!d.data) return h + '<p class="ccs-loading">Loading the dashboard…</p>';
    var f = d.f, r = dxRange(), data = d.data, byOrder = f.b === 'o';
    var prods = []; data.orders.forEach(function (o) { (o.it || []).forEach(function (i) { if (prods.indexOf(i[0]) < 0) prods.push(i[0]); }); }); prods.sort();
    var chans = []; data.orders.forEach(function (o) { if (chans.indexOf(o.src) < 0) chans.push(o.src); });
    var sel = function (id, label, opts, cur) { return '<label class="ccs-field dx-f"><span class="ccs-label">' + label + '</span><select class="ccs-input" id="' + id + '" data-dx="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; };
    var fsum = [(DX_PERIODS.filter(function (x) { return x[0] === f.p; })[0] || ['', ''])[1], f.prod === 'all' ? 'All cakes' : f.prod, f.ch === 'all' ? 'All channels' : (SOURCE_LABEL[f.ch] || f.ch)].join(' · ');
    h += '<button type="button" class="ccs-btn ccs-ghost dx-ftoggle" data-act="dx-filters" aria-expanded="' + !!d.fopen + '">Filters: ' + esc(fsum) + '</button>';
    h += '<div class="dx-filters' + (d.fopen ? '' : ' is-closed') + '">' + sel('dx-p', 'Period', DX_PERIODS, f.p) +
      (f.p === 'c' ? '<label class="ccs-field dx-f"><span class="ccs-label">From</span><input class="ccs-input" type="date" id="dx-from" data-dx="dx-from" value="' + esc(f.from) + '"></label><label class="ccs-field dx-f"><span class="ccs-label">To</span><input class="ccs-input" type="date" id="dx-to" data-dx="dx-to" value="' + esc(f.to) + '"></label>' : '') +
      sel('dx-b', 'Count by', DX_BASIS, f.b) +
      sel('dx-prod', 'Cake', [['all', 'All cakes']].concat(prods.map(function (p) { return [p, p]; })), f.prod) +
      sel('dx-ch', 'Channel', [['all', 'All channels']].concat(chans.map(function (c) { return [c, SOURCE_LABEL[c] || c]; })), f.ch) + '</div>';
    var cur = dxSales(r.from, r.to), cs = dxSum(cur), ps = r.pf ? dxSum(dxSales(r.pf, r.pt)) : null;
    var rec = cur.filter(function (o) { return o.cp === 'recorded'; }), asm = cur.filter(function (o) { return o.cp === 'assumed'; });
    var got = dxIn(r.from, r.to), pgot = r.pf ? dxIn(r.pf, r.pt) : null, cx = got.filter(function (o) { return o.off; });
    var t = today(), up = data.orders.filter(function (o) { return o.open && o.pd >= t && dxMatch(o); }), upv = up.reduce(function (s, o) { return s + dxValue(o); }, 0), upc = up.filter(function (o) { return o.st === 'confirmed'; }).length;
    var cash = 0, cashList = [], refunds = 0, refList = [];
    data.orders.forEach(function (o) { if (!dxMatch(o)) return; var g = 0, rf = 0; (o.pay || []).forEach(function (p) { if (!inRange(p[2], r.from, r.to)) return; if (p[0] === 'refund') rf += dnum(p[1]); else if (p[0] !== 'adjustment') g += dnum(p[1]); }); if (g) { cash += g; cashList.push(o); } if (rf) { refunds += rf; refList.push(o); } });
    var owing = data.orders.filter(function (o) { return o.live && dxMatch(o) && (o.st === 'confirmed' || o.st === 'completed') && dnum(o.bal) > 0.005; }), owed = owing.reduce(function (s, o) { return s + dnum(o.bal); }, 0);
    var basisWord = byOrder ? 'order date' : 'pickup date';
    var period = '<p class="dx-period">' + (r.all ? 'All recorded history' : esc(nice(r.from) + ' to ' + nice(r.to))) + ', by ' + basisWord + (ps ? '. Compared with ' + esc(r.cmp) + '.' : '.') + (f.prod !== 'all' ? ' Showing ' + esc(f.prod) + ' only.' : '') + '</p>';
    // Overview: four figures, each with its change and a small trend line, then the month chart with channels and top cakes
    var months = dxMonths(r), wk = dxWeeks(up); d.cmpShort = ps ? 'vs ' + r.cmp : '';
    var ov = '<div class="dx-top">' +
      dxHead('Sales value', m0(cs.v), dxDelta(cs.v, ps && ps.v), int(cs.n) + ' completed sales (' + int(rec.length) + ' recorded in the app, ' + int(asm.length) + ' assumed from the sheets)', months.map(function (x) { return x.s.v; }), cur, 'Completed sales') +
      dxHead('Cakes sold', int(cs.c), dxDelta(cs.c, ps && ps.c), 'In completed sales', months.map(function (x) { return x.s.c; }), cur, 'Completed sales') +
      dxHead('Average order', m0(cs.aov), dxDelta(cs.aov, ps && ps.aov), 'Sales value per completed sale', months.map(function (x) { return x.s.aov; }), cur, 'Completed sales') +
      dxHead('Booked ahead', m0(upv), null, up.length + ' to come: ' + upc + ' confirmed, ' + (up.length - upc) + ' not yet', wk.map(function (x) { return x.vv; }), up, 'Orders still to come') + '</div>';
    ov += '<div class="dx-minis">' +
      dxMini('Orders received', int(got.length) + (pgot ? ' <i>' + esc(dxDelta(got.length, pgot.length).t) + '</i>' : ''), got, 'Orders received') +
      dxMini('Payments collected', data.anyPay ? m0(cash) : 'Not recorded', cashList, 'Orders with payments in this period') +
      dxMini('Outstanding', m0(owed) + ' <i>' + owing.length + (owing.length === 1 ? ' order' : ' orders') + '</i>', owing, 'Orders with money still owed') +
      dxMini('Cancellations', int(cx.length) + (got.length ? ' <i>' + Math.round(cx.length / got.length * 100) + '%</i>' : ''), cx, 'Cancelled orders') +
      dxMini('Refunds', m0(refunds), refList, 'Refunded orders') + '</div>';
    // Main row: the month chart, with channels and top cakes beside it
    ov += '<div class="dx-main">' + dxMonthly(r, months) + '<div class="dx-side">' + dxChannelsCard(cur) + dxTopCard(cur) + '</div></div>';
    // Details: one section at a time
    var flags = [], lo = data.left_out || {};
    if (lo.needs_review) flags.push(int(lo.needs_review) + ' records are waiting for a manager to review them (possible duplicates, missing or conflicting dates, possible tests). They are not counted until a decision is made.');
    var nAsm = data.orders.filter(function (o) { return o.cp === 'assumed'; }).length;
    if (nAsm) flags.push(int(nAsm) + ' past sheet orders were never marked collected, because the sheets have no column for it. They count as completed sales because nothing says they were cancelled. Only orders handed over in the app are recorded sales.');
    var nNot = data.orders.filter(function (o) { return o.cp === 'not_recorded'; }).length;
    if (nNot) flags.push(int(nNot) + ' app orders are past their pickup date but were never marked collected or cancelled. They are not counted as sales.');
    if (!data.anyPay) flags.push('No payments have been entered in the app yet, so payments, refunds and outstanding show nothing.');
    else flags.push('Payments exist only for orders handled in the app. The sheets hold no payment records.');
    var noVal = data.orders.filter(function (o) { return o.sale && !o.tot; }).length;
    if (noVal) flags.push(int(noVal) + ' completed sales have no price in the sheet (mostly custom cakes), so they add nothing to sales value.');
    if (byOrder) { var noOd = data.orders.filter(function (o) { return !o.odok; }).length; if (noOd) flags.push(int(noOd) + ' records have no reliable order date (the walk-in sheet only has the time the row was typed, or the date is after pickup). They are left out when counting by order date.'); }
    var cov = {}; data.orders.forEach(function (o) { if (!o.imp) return; var c = cov[o.src] = cov[o.src] || [o.pd, o.pd]; if (o.pd < c[0]) c[0] = o.pd; if (o.pd > c[1]) c[1] = o.pd; });
    var ml = function (x) { return MON[+x.slice(5, 7) - 1] + ' ' + x.slice(0, 4); };
    if (Object.keys(cov).length > 1) flags.push('The sheets cover different dates by channel: ' + Object.keys(cov).map(function (k) { return (SOURCE_LABEL[k] || k) + ' ' + ml(cov[k][0]) + ' to ' + ml(cov[k][1]); }).join('; ') + '. Months outside those dates look lower because orders were not recorded, not because sales fell.');
    flags.push('Prices are shown as charged. Tax treatment is not confirmed.');
    if (data.tests_excluded) flags.push(data.tests_excluded + ' test ' + (data.tests_excluded === 1 ? 'order is' : 'orders are') + ' left out of every figure.');
    d.secs = [];
    dxProducts(cur); dxUpcoming(up); dxCustomers(cur, r); dxPayments(r); dxOps(r); dxDiscounts(cur); dxDemand(cur); dxYear(); dxOrders(r);
    dxSec('df', 'About the data', flags.length + ' things to know', '<p class="dx-ch">' + flags.length + ' things to know about this data</p>' + flags.map(dxFlag).join('') + dxDefs());
    d.secs = [['ov', 'Overview', '', ''], ['cc', 'Channels and cakes', '', '<div class="dx-side dx-side-ph">' + dxChannelsCard(cur) + dxTopCard(cur) + '</div>']].concat(dxMerge(d.secs));
    var keys = d.secs.map(function (x) { return x[0]; }), cs2 = secCur('dash', keys, 'ov'), sec = d.secs.filter(function (x) { return x[0] === cs2; })[0];
    h += '<div class="dx-secs">' + secBar('dash', d.secs.map(function (x) { return [x[0], x[1]]; }), cs2, 'Dashboard sections') + '</div>' + period;
    if (cs2 === 'ov') return h + '<div class="dx-ov">' + ov + '</div>';
    return h + '<section class="dx-card dx-secbody" aria-label="' + esc(sec[1]) + '"><div class="dx-card-h"><h2>' + esc(sec[1]) + '</h2>' + (sec[2] ? '<span>' + sec[2] + '</span>' : '') + '</div>' + sec[3] + '</section>';
  }
  // ----- headline pieces -----
  function dxDelta(cur, prev) {
    if (prev == null) return { t: '', c: '' };
    if (!prev) return cur ? { t: 'New', c: 'up' } : { t: 'No change', c: 'flat' };
    var p = Math.round((cur - prev) / prev * 100);
    return p > 0 ? { t: 'Up ' + p + '%', c: 'up' } : p < 0 ? { t: 'Down ' + (-p) + '%', c: 'down' } : { t: 'No change', c: 'flat' };
  }
  function dxSpark(vals) {
    vals = vals.filter(function (v) { return isFinite(v); }); if (vals.length < 2) return '';
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals), rg = (max - min) || 1;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * 100).toFixed(1) + ',' + (28 - (v - min) / rg * 24).toFixed(1); }).join(' ');
    return '<svg class="dx-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" vector-effect="non-scaling-stroke"/></svg>';
  }
  function dxHead(label, value, delta, sub, spark, list, title) {
    var cmp = DX.cmpShort ? ' ' + DX.cmpShort : '';
    return dxTap(list, title, '<span class="dx-hl">' + label + '</span><b class="dx-hv">' + value + '</b>' +
      (delta && delta.t ? '<span class="dx-hd is-' + delta.c + '">' + esc(delta.t) + '<em>' + esc(cmp) + '</em></span>' : '<span class="dx-hd is-none">&nbsp;</span>') +
      dxSpark(spark) + '<span class="dx-hs">' + esc(sub) + '</span>', 'dx-head');
  }
  function dxMini(label, value, list, title) { return dxTap(list, title, '<span>' + label + '</span><b>' + value + '</b>', 'dx-mini'); }
  // 13 months ending with the selected period, with the same month last year
  function dxMonths(r) {
    var t = today(), end = r.all ? t : (r.to > t ? t : r.to), rows = [];
    for (var i = 12; i >= 0; i--) {
      var ms = dxMonthStart(dxAddMonths(end, -i)), me = dxMonthEnd(ms), list = dxSales(ms, me), s = dxSum(list);
      var ly = dxSales(dxMonthStart(dxAddMonths(ms, -12)), dxMonthEnd(dxAddMonths(ms, -12))), lys = ly.length ? dxSum(ly) : null;
      rows.push({ l: MON[+ms.slice(5, 7) - 1] + (ms.slice(5, 7) === '01' || i === 12 ? ' ' + ms.slice(2, 4) : ''), ms: ms, s: s, ly: lys, list: list, t: MON[+ms.slice(5, 7) - 1] + ' ' + ms.slice(0, 4) + ' sales', dim: ms === dxMonthStart(t) });
    }
    rows.end = end; return rows;
  }
  function dxWeeks(up) {
    var t = today(), ws = addDays(t, -((new Date(t + 'T12:00:00Z').getUTCDay() + 6) % 7)), out = [];
    for (var w = 0; w < 6; w++) { var a = addDays(ws, w * 7), b = addDays(a, 6), wl = up.filter(function (o) { return o.pd >= a && o.pd <= b; }); out.push({ vv: wl.reduce(function (s, o) { return s + dxValue(o); }, 0) }); }
    return out;
  }
  // Bars for this period, a grey line for the same month last year
  function dxChart(rows, metric) {
    var val = function (x) { return metric === 'c' ? x.s.c : x.s.v; }, lyv = function (x) { return x.ly ? (metric === 'c' ? x.ly.c : x.ly.v) : null; };
    var max = rows.reduce(function (m, x) { return Math.max(m, val(x), lyv(x) || 0); }, 0) || 1, n = rows.length;
    var fmt = function (v) { return metric === 'c' ? int(v) : v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : m0(v); };
    var segs = [], seg = [];
    rows.forEach(function (x, i) { var v = lyv(x); if (v == null) { if (seg.length) segs.push(seg); seg = []; return; } seg.push(((i + 0.5) / n * 100).toFixed(2) + ',' + (100 - v / max * 100).toFixed(2)); });
    if (seg.length) segs.push(seg);
    var line = segs.map(function (sg) { return sg.length > 1 ? '<polyline points="' + sg.join(' ') + '" vector-effect="non-scaling-stroke"/>' : '<circle cx="' + sg[0].split(',')[0] + '" cy="' + sg[0].split(',')[1] + '" r="0.9"/>'; }).join('');
    return '<div class="dx-chart"><div class="dx-cc-cols" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + rows.map(function (x) {
      var v = val(x);
      return dxTap(x.list, x.t, '<span class="dx-cv">' + (v ? fmt(v) : '') + '</span><span class="dx-cb"><i style="height:' + Math.max(v ? 2 : 0, v / max * 100).toFixed(1) + '%"></i></span><span class="dx-cl"><span class="dx-cl-l">' + esc(x.l) + '</span><span class="dx-cl-s">' + esc(x.l.charAt(0)) + '</span></span>', 'dx-cc' + (x.dim ? ' is-dim' : ''));
    }).join('') + '</div>' + (segs.length ? '<svg class="dx-ly" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + line + '</svg>' : '') + '</div>';
  }
  function dxMonthly(r, rows) {
    var t = today(), end = rows.end, tbl = '', metric = DX.metric || 'v';
    if (DX.table) rows.forEach(function (x, k) {
      var p = k ? rows[k - 1].s : null;
      tbl += '<tr><td>' + esc(MON[+x.ms.slice(5, 7) - 1] + ' ' + x.ms.slice(0, 4)) + (x.dim ? ' (to date)' : '') + '</td><td class="ccs-num">' + int(x.s.c) + '</td><td class="ccs-num">' + (p ? (x.s.c - p.c >= 0 ? '+' : '') + int(x.s.c - p.c) + ' (' + change(x.s.c, p.c) + ')' : '') + '</td><td class="ccs-num">' + m0(x.s.v) + '</td><td class="ccs-num">' + (p ? (x.s.v - p.v >= 0 ? '+' : '-') + m0(Math.abs(x.s.v - p.v)) + ' (' + change(x.s.v, p.v) + ')' : '') + '</td><td class="ccs-num">' + (x.ly ? change(x.s.v, x.ly.v) : '<span class="ccs-hint">No data</span>') + '</td></tr>';
    });
    var ms0 = dxMonthStart(t), dayN = +t.slice(8), lmS = dxMonthStart(dxAddMonths(t, -1)), lmE = dxAddMonths(t, -1);
    var mtd = dxSum(dxSales(ms0, t)), lmtd = dxSum(dxSales(lmS, lmE)), anyLy = rows.some(function (x) { return x.ly; });
    var tg = function (k, l) { return '<button type="button" class="ccs-chip dx-tg" data-act="dx-metric" data-v="' + k + '" aria-pressed="' + (metric === k) + '">' + l + '</button>'; };
    return '<section class="dx-card dx-month" aria-label="Sales by month"><div class="dx-card-h"><h2>Sales by month</h2><div class="dx-card-acts">' + tg('v', 'Sales value') + tg('c', 'Cakes') +
      '<button type="button" class="ccs-link" data-act="dx-table">' + (DX.table ? 'Show chart' : 'Show table') + '</button></div></div>' +
      (DX.table ? '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Month</th><th class="ccs-num">Cakes</th><th class="ccs-num">Change</th><th class="ccs-num">Sales value</th><th class="ccs-num">Change</th><th class="ccs-num">Value vs last year</th></tr></thead><tbody>' + tbl + '</tbody></table></div>'
        : dxChart(rows, metric) + '<p class="dx-legend"><span class="dx-key-bar"></span>This period' + (anyLy ? '<span class="dx-key-line"></span>Same month last year' : '') + '<span class="dx-key-dim"></span><span class="dx-key-dimt">' + esc(MON[+t.slice(5, 7) - 1]) + ' so far</span></p>') +
      '</section>';
  }
  function dxChannelsCard(cur) {
    var g = dxGroup(cur, function (o) { return [[SOURCE_LABEL[o.src] || o.src, dxCakes(o), dxValue(o)]]; }).sort(function (a, b) { return b.v - a.v; });
    var tv = g.reduce(function (s, x) { return s + x.v; }, 0) || 1;
    return '<section class="dx-card" aria-label="Sales by channel"><div class="dx-card-h"><h2>By channel</h2><span>Share of sales value</span></div>' +
      (g.length ? dxBars(g.map(function (x) { return { l: x.l, v: x.v, list: x.list, t: x.l + ' orders', p: Math.round(x.v / tv * 100) }; }), function (x) { return x.p + '% · ' + m0(x.v); }) : '<p class="ccs-quiet">No completed sales in this period.</p>') + '</section>';
  }
  function dxTopCard(cur) {
    var g = dxGroup(cur, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [i[0], q, dnum(i[4]) * q]; }); }).sort(function (a, b) { return b.v - a.v; }).slice(0, 4);
    return '<section class="dx-card" aria-label="Top cakes"><div class="dx-card-h"><h2>Top cakes</h2><span>By sales value</span></div>' +
      (g.length ? dxBars(g.map(function (x) { return { l: x.l, v: x.v, q: x.q, list: x.list, t: x.l }; }), function (x) { return int(x.q) + ' · ' + m0(x.v); }) : '<p class="ccs-quiet">No completed sales in this period.</p>') + '</section>';
  }
  function dxProducts(cur) {
    var by = function (fn) { return dxGroup(cur, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [fn(i), q, dnum(i[4]) * q]; }); }); };
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
      '<p class="ccs-hint">Sales by cake use the item price, so they can differ slightly from order totals that include delivery or a changed price. Sheet orders use the cake names typed in the sheet. Custom cakes have no list price.</p>' : '<p class="ccs-quiet">No completed sales in this period.</p>';
    return dxSec('pr', 'Products', fmt({ q: cakes.reduce(function (s, x) { return s + x.q; }, 0), v: cakes.reduce(function (s, x) { return s + x.v; }, 0) }).replace(' · ', ' cakes · '), body);
  }
  function dxChannels(cur) {
    var g = dxGroup(cur, function (o) { return [[SOURCE_LABEL[o.src] || o.src, dxCakes(o), dxValue(o)]]; }).sort(function (a, b) { return b.v - a.v; });
    var tv = g.reduce(function (s, x) { return s + x.v; }, 0) || 1;
    var body = g.length ? '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Channel</th><th class="ccs-num">Orders</th><th class="ccs-num">Cakes</th><th class="ccs-num">Sales value</th><th class="ccs-num">Share</th><th class="ccs-num">Average order</th></tr></thead><tbody>' +
      g.map(function (x) { return '<tr class="ccs-click" data-act="dx-drill" data-v="' + dxKey({ t: x.l + ' orders', l: x.list }) + '"><td>' + esc(x.l) + '</td><td class="ccs-num">' + int(x.list.length) + '</td><td class="ccs-num">' + int(x.q) + '</td><td class="ccs-num">' + m0(x.v) + '</td><td class="ccs-num">' + Math.round(x.v / tv * 100) + '%</td><td class="ccs-num">' + m0(x.v / x.list.length) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="ccs-hint">Online is the online order sheet and the website. Walk-in is the walk-in sheet and orders entered in this app.</p>' : '<p class="ccs-quiet">No completed sales in this period.</p>';
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
      dxKpi('Customers', int(ids.length), 'Bought in this period', cur, 'Completed sales') +
      dxKpi('New', int(nw.length), Math.round(nw.length / ids.length * 100) + '% first ever order', listOf(nw), 'New customers\' orders') +
      dxKpi('Returning', int(ret.length), Math.round(ret.length / ids.length * 100) + '% had bought before', listOf(ret), 'Returning customers\' orders') +
      dxKpi('Repeat rate', Math.round(rep / ids.length * 100) + '%', 'Have 2 or more completed sales', null) +
      dxKpi('Average spend', m0(spend / ids.length), 'Per customer in this period', null) + '</div>' +
      '<p class="dx-ch">Top customers by spend</p><ul class="dx-list">' + top.map(function (x) { return '<li>' + dxTap(x.list, esc(x.n), '<b>' + esc(x.n) + '</b> ' + m0(x.v) + ', ' + x.list.length + (x.list.length === 1 ? ' order' : ' orders'), 'dx-li') + '</li>'; }).join('') + '</ul>' +
      '<p class="ccs-hint">Customers are matched by mobile number, so the same person ordering online and at the counter counts once.' + (noId ? ' ' + noId + ' orders have no customer record.' : '') + '</p>' : '<p class="ccs-quiet">No completed sales in this period.</p>';
    return dxSec('cu', 'Customers', ids.length ? int(nw.length) + ' new · ' + int(ret.length) + ' returning' : '', body);
  }
  function dxPayments(r) {
    var k = { deposit: 0, balance: 0, full: 0, refund: 0 }, lists = { deposit: [], balance: [], full: [], refund: [] }, t = today();
    DX.data.orders.forEach(function (o) { if (!dxMatch(o)) return; (o.pay || []).forEach(function (p) { if (k[p[0]] != null && inRange(p[2], r.from, r.to)) { k[p[0]] += dnum(p[1]); if (lists[p[0]].indexOf(o) < 0) lists[p[0]].push(o); } }); });
    var owing = DX.data.orders.filter(function (o) { return o.live && dxMatch(o) && (o.st === 'confirmed' || o.st === 'completed') && dnum(o.bal) > 0.005; });
    var bal = function (o) { return dnum(o.bal); }, over = owing.filter(function (o) { return o.pd < t; });
    var sum = function (l) { return l.reduce(function (s, o) { return s + bal(o); }, 0); };
    var body = (DX.data.anyPay ? '' : dxFlag('No payments have been recorded in the app yet. These figures fill in once staff use Record payment.')) +
      '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Deposits received', m0(k.deposit), 'By payment date', lists.deposit, 'Deposits received') + dxKpi('Balances and full payments', m0(k.balance + k.full), 'By payment date', lists.balance.concat(lists.full), 'Balance and full payments') +
      dxKpi('Refunds', m0(k.refund), 'Taken off sales value', lists.refund, 'Refunded orders', k.refund ? 'action' : '') + dxKpi('Cash collected', m0(k.deposit + k.balance + k.full - k.refund), 'Money in, less refunds', null, null, 'good') +
      dxKpi('Still owed', m0(sum(owing)), owing.length + ' orders, as of today', owing, 'Orders with money still owed', owing.length ? 'deposit' : '') + dxKpi('Overdue', m0(sum(over)), over.length + ' past their pickup date', over, 'Overdue balances', over.length ? 'action' : '') + '</div>' +
      '<p class="ccs-hint">Sales value counts completed sales by the date chosen in Count by. Payments count money by the day it was taken, so the two will rarely match. Sheet orders are left out of money owed because the sheets have no payment records.</p>';
    return dxSec('pa', 'Payments', DX.data.anyPay ? m0(k.deposit + k.balance + k.full - k.refund) + ' collected' : 'Not recorded yet', body);
  }
  function dxUpcoming(up) {
    var t = today(), pend = up.filter(function (o) { return o.st !== 'confirmed'; }); up = up.filter(function (o) { return o.st === 'confirmed'; });
    var days = [], weeks = [];
    for (var i = 0; i < 14; i++) { var d = addDays(t, i), l = up.filter(function (o) { return o.pd === d; }); days.push({ l: (i === 0 ? 'Today' : WD[(new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7]) + ' ' + +d.slice(8), full: (i === 0 ? 'Today' : WDF[(new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7]) + ' ' + +d.slice(8), v: l.reduce(function (s, o) { return s + dxCakes(o); }, 0), list: l, t: nice(d, true) + ' pickups' }); }
    var ws = addDays(t, -((new Date(t + 'T12:00:00Z').getUTCDay() + 6) % 7));
    for (var w = 0; w < 6; w++) { var a = addDays(ws, w * 7), b = addDays(a, 6), wl = up.filter(function (o) { return o.pd >= a && o.pd <= b; }); weeks.push({ l: (w === 0 ? 'This week' : 'w/c ' + nice(a).replace(/^\w+ /, '')), v: wl.reduce(function (s, o) { return s + dxCakes(o); }, 0), vv: wl.reduce(function (s, o) { return s + dxValue(o); }, 0), list: wl, t: 'Week of ' + nice(a) }); }
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Confirmed to collect', int(up.length), up.reduce(function (s, o) { return s + dxCakes(o); }, 0) + ' cakes, ' + m0(up.reduce(function (s, o) { return s + dxValue(o); }, 0)), up, 'Confirmed orders to collect', 'good') +
      dxKpi('Not yet confirmed', int(pend.length), m0(pend.reduce(function (s, o) { return s + dxValue(o); }, 0)) + ' if all go ahead', pend, 'Orders not yet confirmed', pend.length ? 'action' : '') + '</div>' +
      '<p class="dx-ch">Confirmed cakes per day, next 14 days</p>' + dxCols(days, false, 'Busiest day') + '<p class="dx-ch">Confirmed cakes per week</p>' + dxBars(weeks, function (x) { return int(x.v) + ' cakes · ' + m0(x.vv); }) +
      '<p class="ccs-hint">Booked business is not counted as sales until the pickup date has passed (sheet orders) or the cake is handed over (app orders). Sheet orders show as not yet confirmed until staff confirm them in the app.</p>';
    return dxSec('up', 'Upcoming business', int(up.length) + ' confirmed · ' + int(pend.length) + ' waiting', body);
  }
  function dxOps(r) {
    var placed = DX.data.orders.filter(function (o) { return o.odok && inRange(o.od, r.from, r.to) && dxMatch(o); });
    var off = placed.filter(function (o) { return o.off; });
    var reasons = dxGroup(off, function (o) { return [[(o.cx || 'No reason recorded').trim(), 1, 0]]; }).sort(function (a, b) { return b.q - a.q; });
    var done = dxSales(r.from, r.to).filter(function (o) { return !o.imp; });
    var dueAt = function (o) { return Date.parse(o.pd + 'T' + (o.pt || '12:00') + ':00+12:00'); };
    var handed = done.filter(function (o) { return o.ho; }), late = handed.filter(function (o) { return Date.parse(o.ho) > dueAt(o) + 36e5; });
    var ready = done.filter(function (o) { return o.ra; }), onTime = ready.filter(function (o) { return Date.parse(o.ra) <= dueAt(o); });
    var amended = placed.filter(function (o) { return o.rev > 0; });
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Orders placed', int(placed.length), 'By order date', placed, 'Orders placed') +
      dxKpi('Cancelled', int(off.length), placed.length ? Math.round(off.length / placed.length * 100) + '% of orders placed' : '', off, 'Cancelled orders', off.length ? 'action' : '') +
      dxKpi('Ready on time', ready.length ? Math.round(onTime.length / ready.length * 100) + '%' : 'Not recorded', ready.length ? onTime.length + ' of ' + ready.length + ' marked Ready before pickup time' : 'Starts once the kitchen marks cakes Ready', ready.filter(function (o) { return onTime.indexOf(o) < 0; }), 'Cakes ready after pickup time') +
      dxKpi('Collected late', handed.length ? int(late.length) : 'Not recorded', handed.length ? 'More than 1 hour after pickup time, of ' + handed.length : 'Starts once handovers are recorded', late, 'Orders collected late') +
      dxKpi('Amended orders', int(amended.length), 'Every change is kept in the order history', amended, 'Amended orders') + '</div>' +
      (reasons.length ? '<p class="dx-ch">Cancellation reasons</p>' + dxBars(reasons.map(function (x) { return { l: x.l, v: x.q, list: x.list, t: x.l }; }), function (x) { return int(x.v); }) : '') +
      '<p class="ccs-hint">Orders placed uses the order date. ' + (DX.data.orders.filter(function (o) { return !o.odok; }).length) + ' records have no reliable order date and are left out here.</p>';
    return dxSec('op', 'Operations', off.length + ' cancelled', body);
  }
  function dxDiscounts(cur) {
    var cut = cur.filter(function (o) { return o.fin != null && dnum(o.fin) < dnum(o.est) - 0.005; }), less = cut.reduce(function (s, o) { return s + dnum(o.est) - dnum(o.fin); }, 0), list = cur.reduce(function (s, o) { return s + dnum(o.est); }, 0);
    var body = '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Orders below list price', int(cut.length), cur.length ? Math.round(cut.length / cur.length * 100) + '% of completed sales' : '', cut, 'Orders priced below the list price') +
      dxKpi('Amount below list price', m0(less), list ? Math.round(less / list * 100) + '% of list value' : '', cut, 'Orders priced below the list price') + '</div>' +
      dxFlag('Discounts are not recorded separately. These figures only show where staff agreed a price below the price list.') +
      dxFlag('Gross profit and margin are not shown because cake costs are not recorded.');
    return dxSec('di', 'Discounts and profit', cut.length ? m0(less) + ' below list price' : 'No price reductions', body);
  }
  function dxDemand(cur) {
    var wd = [0, 0, 0, 0, 0, 0, 0], wl = [[], [], [], [], [], [], []];
    cur.forEach(function (o) { var k = (new Date(o.pd + 'T12:00:00Z').getUTCDay() + 6) % 7; wd[k] += dxCakes(o); wl[k].push(o); });
    var mon = [], all = DX.data.orders.filter(function (o) { return o.sale && dxMatch(o); }), yrs = {};
    for (var m = 0; m < 12; m++) mon.push({ l: MON[m], full: MONF[m], v: 0, list: [], t: MON[m] + ', all years', y: {} });
    all.forEach(function (o) { var k = +o.pd.slice(5, 7) - 1; mon[k].v += dxCakes(o); mon[k].list.push(o); mon[k].y[o.pd.slice(0, 7)] = 1; yrs[o.pd.slice(0, 4)] = 1; });
    var tm = today().slice(0, 7); mon.forEach(function (x) { delete x.y[tm]; var n = Object.keys(x.y).length; x.v = n ? Math.round(x.v / n) : 0; });
    var lead = cur.filter(function (o) { return o.odok && o.od <= o.pd; }).map(function (o) { return daysBetween(o.od, o.pd); }).sort(function (a, b) { return a - b; });
    var bk = [['Same day', 0, 0], ['1 to 2 days', 1, 2], ['3 to 6 days', 3, 6], ['1 to 2 weeks', 7, 13], ['2 weeks or more', 14, 1e6]];
    var body = '<div class="dx-grid2"><div><p class="dx-ch">Cakes by pickup day</p>' + dxCols(WD.map(function (n, k) { return { l: n, full: WDF[k], v: wd[k], list: wl[k], t: n + ' pickups' }; }), false, 'Busiest day') + '</div>' +
      '<div><p class="dx-ch">Ordered how far ahead</p>' + (lead.length ? dxBars(bk.map(function (b) { var n = lead.filter(function (x) { return x >= b[1] && x <= b[2]; }).length; return { l: b[0], v: n }; }), function (x) { return Math.round(x.v / lead.length * 100) + '%'; }) + '<p class="ccs-hint">Typical gap: ' + lead[Math.floor(lead.length / 2)] + ' days between ordering and pickup (' + lead.length + ' orders with a reliable order date).</p>' : '<p class="ccs-hint">No orders with a reliable order date in this period.</p>') + '</div></div>' +
      '<p class="dx-ch">Seasonal pattern: average cakes per month, ' + Object.keys(yrs).sort().join(' to ').replace(/ to .* to /, ' to ') + '</p>' + dxCols(mon, false, 'Busiest month') +
      '<p class="ccs-hint">The seasonal chart averages every complete month on record, not just the selected period, so busy and quiet months can be compared fairly.</p>';
    var top = wd.indexOf(Math.max.apply(null, wd));
    return dxSec('de', 'Demand patterns', cur.length ? 'Busiest pickup day: ' + WDF[top] : '', body);
  }
  function dxYear() {
    var y = DX.year, years = DX.data.years.slice(); if (years.indexOf(y) < 0) years.push(y); years.sort();
    var tot = { n: 0, c: 0, v: 0 }, rows = '';
    for (var m = 1; m <= 12; m++) {
      var ms = y + '-' + String(m).padStart(2, '0') + '-01', l = dxSales(ms, dxMonthEnd(ms)), s = dxSum(l); tot.n += s.n; tot.c += s.c; tot.v += s.v;
      rows += '<tr' + (l.length ? ' class="ccs-click" data-act="dx-drill" data-v="' + dxKey({ t: MON[m - 1] + ' ' + y + ' sales', l: l }) + '"' : '') + '><td>' + MON[m - 1] + '</td><td class="ccs-num">' + int(s.n) + '</td><td class="ccs-num">' + int(s.c) + '</td><td class="ccs-num">' + m0(s.v) + '</td><td class="ccs-num">' + (s.n ? m0(s.aov) : '') + '</td></tr>';
    }
    var body = '<div class="ccs-tabs" role="group" aria-label="Year">' + years.map(function (x) { return '<button type="button" class="ccs-tab" data-act="dx-year" data-v="' + x + '" aria-pressed="' + (x === y) + '">' + x + '</button>'; }).join('') + '</div>' +
      '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>' + y + '</th><th class="ccs-num">Orders</th><th class="ccs-num">Cakes</th><th class="ccs-num">Sales value</th><th class="ccs-num">Average order</th></tr></thead><tbody>' + rows +
      '<tr class="dx-total"><td>Total</td><td class="ccs-num">' + int(tot.n) + '</td><td class="ccs-num">' + int(tot.c) + '</td><td class="ccs-num">' + m0(tot.v) + '</td><td class="ccs-num">' + (tot.n ? m0(tot.v / tot.n) : '') + '</td></tr></tbody></table></div><p class="ccs-hint">Uses the cake and channel filters, not the period.</p>';
    return dxSec('yr', 'Year overview', y + ': ' + m0(tot.v) + ' from ' + int(tot.c) + ' cakes', body);
  }
  function dxOrderList(r) {
    var st = DX.f.st, t = today();
    return DX.data.orders.filter(function (o) {
      if (!dxMatch(o) || !inRange(dxD(o), r.from, r.to)) return false;
      return st === 'all' || (st === 'completed' ? o.sale : st === 'off' ? o.off : o.cp === 'pending');
    }).sort(function (a, b) { return a.pd < b.pd ? 1 : -1; });
  }
  function dxRows(list, max) {
    return '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>Order</th><th>Pickup</th><th>Customer</th><th>Channel</th><th>Status</th><th class="ccs-num">Cakes</th><th class="ccs-num">Total</th></tr></thead><tbody>' +
      list.slice(0, max).map(function (o) { return '<tr class="ccs-click" ' + (o.i && o.live ? 'data-act="open-order" data-id="' + o.i + '"' : 'data-act="rg-open" data-v="' + esc(o.k) + '"') + '><td data-label="Order"><b>' + esc(o.r) + '</b>' + (o.rev ? ' <span class="ccs-pill s-amend">Amended</span>' : '') + '</td><td data-label="Pickup">' + esc(nice(o.pd)) + ' ' + esc(o.pd.slice(0, 4)) + '</td><td data-label="Customer">' + esc(o.cn || '') + '</td><td data-label="Channel">' + esc(SOURCE_LABEL[o.src] || o.src) + '</td><td data-label="Status">' + regPill(o) + '</td><td class="ccs-num" data-label="Cakes">' + int(dxCakes(o)) + '</td><td class="ccs-num" data-label="Total">' + money(dxValue(o)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (list.length > max ? '<p class="ccs-hint">Showing the latest ' + max + ' of ' + int(list.length) + '. Export to see them all.</p>' : '');
  }
  function dxOrders(r) {
    var list = dxOrderList(r);
    var body = '<label class="ccs-field dx-f"><span class="ccs-label">Status</span><select class="ccs-input" id="dx-st" data-dx="dx-st">' + DX_STATUS.map(function (o) { return '<option value="' + o[0] + '"' + (DX.f.st === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      (list.length ? dxRows(list, 60) : '<p class="ccs-quiet">No orders match.</p>') + '<p class="ccs-hint">Filtered by the period, cake and channel. Tap an order to open it.</p>';
    return dxSec('ol', 'Order list', int(list.length) + ' orders', body);
  }
  function dxDefs() {
    var d = [['Where the figures come from', 'The cake register: every row of the online and walk-in order sheets, every website order and every order entered in this app, matched so each order counts once. Test orders, duplicates and records waiting for a manager\'s review are left out.'],
      ['Count by', 'Pickup date (default) counts each order on the day the cake was due. Order date counts it on the day the order was taken; records without a reliable order date drop out.'],
      ['Orders received', 'Every order in the period, whatever happened to it.'], ['Completed sales', 'Recorded: handed over in the app. Assumed: a sheet order whose pickup date has passed and that was not cancelled. The sheets cannot say whether a cake was actually collected.'],
      ['Sales value', 'The agreed price, or the list price when no price was agreed, including any delivery fee, less refunds. Shown as charged; tax is not separated.'], ['Payments collected', 'Deposits, balances and full payments recorded in the app, by the date they were taken.'],
      ['Outstanding', 'Confirmed or completed app orders where less has been paid than the agreed price, as of today.'], ['Cancellations', 'Orders marked cancelled or declined, in the period.'], ['Refunds', 'Refunds recorded in the app, by the date given.'],
      ['Booked ahead', 'Orders with a pickup date from today that are not cancelled. Never counted as sales.'],
      ['New and returning', 'Matched by mobile number. New means the customer\'s first ever completed sale falls in the period.'], ['Comparisons', 'This month is compared with the same days of last month. Other periods are compared with the same length of time just before.'], ['Changes to orders', 'Amended orders use their latest price. Every change stays in the order\'s history and in the register.']];
    return '<p class="dx-ch">How the figures are worked out</p>' + ('<dl class="ccs-kv dx-defs">' + d.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>');
  }
  // Fewer, broader sections so the buttons fit on one row: pricing joins payments, the year table joins patterns
  function dxMerge(secs) {
    var by = {}; secs.forEach(function (x) { by[x[0]] = x; });
    var join = function (into, from, title) { if (!by[into] || !by[from]) return; by[into][3] += '<hr class="dx-hr">' + '<div class="dx-card-h"><h2>' + esc(by[from][1]) + '</h2>' + (by[from][2] ? '<span>' + by[from][2] + '</span>' : '') + '</div>' + by[from][3]; if (title) by[into][1] = title; secs.splice(secs.indexOf(by[from]), 1); };
    join('pa', 'di', 'Payments and pricing'); join('de', 'yr', 'Patterns');
    var order = ['up', 'pr', 'cu', 'pa', 'op', 'de', 'ol', 'df'];
    secs.sort(function (a, b) { return order.indexOf(a[0]) - order.indexOf(b[0]); });
    return secs;
  }
  function dashSheet() {
    var dr = S.sheet.drill, list = dr.l.slice().sort(function (a, b) { return a.pd < b.pd ? 1 : -1; }), s = dxSum(list);
    return sheetHead(esc(dr.t)) + '<div class="ccs-sheet-body"><p class="ccs-hint">' + int(list.length) + ' orders · ' + int(s.c) + ' cakes · ' + m0(s.v) + '</p>' + dxRows(list, 200) + '</div>';
  }
  function dxCsv(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function dxExport() {
    var r = dxRange(), cur = dxSales(r.from, r.to), s = dxSum(cur), list = dxOrderList(r), f = DX.f;
    var lines = [['Corner Café cake dashboard'], ['Period', r.all ? 'All time' : r.from + ' to ' + r.to], ['Cake', f.prod === 'all' ? 'All cakes' : f.prod], ['Channel', f.ch === 'all' ? 'All channels' : SOURCE_LABEL[f.ch] || f.ch], ['Status (order list)', (DX_STATUS.filter(function (x) { return x[0] === f.st; })[0] || ['', ''])[1]], ['Figures as of', DX.data.generated_at], [],
      ['Counted by', f.b === 'o' ? 'Order date' : 'Pickup date'], ['Cakes in completed sales', s.c], ['Completed sales', s.n], ['Sales value', s.v.toFixed(2)], ['Average order', s.aov.toFixed(2)], ['Note', 'From the cake register. Sales value is the agreed price, or the list price when none was agreed, less refunds; tax not separated. Past sheet orders not cancelled are assumed collected. Test orders and records waiting for review are excluded.'], [],
      ['Order', 'Order date', 'Pickup date', 'Channel', 'Recorded in', 'Status', 'Cakes', 'Total', 'Refunds', 'Paid', 'Cake details', 'Customer']];
    list.forEach(function (o) { lines.push([o.r, o.odok ? o.od : '', o.pd, SOURCE_LABEL[o.src] || o.src, o.sys || '', regLabel(o), dxCakes(o), dxValue(o).toFixed(2), o.refund.toFixed(2), o.paid.toFixed(2), dxItems(o).map(function (i) { return (i[1] || i[0]) + (i[2] ? ' ' + i[2] + ' inch' : '') + ' x' + (i[3] || 1); }).join('; '), o.cn || '']); });
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
    else if (a === 'dx-metric') { DX.metric = v; view(); }
    else if (a === 'dx-filters') { DX.fopen = !DX.fopen; view(); }
    else if (a === 'dx-table') { DX.table = !DX.table; view(); }
    else if (a === 'dx-drill') { var dr = DX.drills[v]; if (!dr) return; S.sheet = { type: 'dash', drill: dr }; S.panel = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  }
  function dxKeep() { root.querySelectorAll('[data-dxsec]').forEach(function (el) { DX['o' + el.dataset.dxsec] = el.open; }); }
  function dashChange(t) {
    var f = DX.f, k = t.dataset.dx; dxKeep();
    if (k === 'dx-p') { f.p = t.value; if (f.p === 'c' && !f.from) { f.to = today(); f.from = dxMonthStart(f.to); } }
    else if (k === 'dx-from') f.from = t.value; else if (k === 'dx-to') f.to = t.value;
    else if (k === 'dx-b') f.b = t.value; else if (k === 'dx-prod') f.prod = t.value; else if (k === 'dx-ch') f.ch = t.value; else if (k === 'dx-st') { f.st = t.value; }
    view();
  }
