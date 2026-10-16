  // ---------- executive dashboard (view only: admin and marketing) ----------
  // Single source: the Master Cake Register (both Google Sheets, the website and this app, de-duplicated).
  // Completed sales = handed over in the app, or a past sheet order not cancelled (assumed). Value = agreed price, or list price when none.
  // Payments = money recorded in the app, by the day taken. Records waiting for a manager's review are left out until decided.
  var DX = null;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DX_PERIODS = [['d30', 'Last 30 days'], ['m', 'This month to date'], ['lm', 'Last month'], ['3m', 'Last 3 months'], ['y', 'This year to date'], ['12', 'Last 12 months'], ['all', 'All time'], ['c', 'Choose dates']];
  var DX_STATUS = [['all', 'All statuses'], ['completed', 'Completed sales'], ['open', 'Still to come'], ['off', 'Cancelled']];
  var DX_BASIS = [['p', 'Pickup date'], ['o', 'Order date']];
  var REG_ST = { received: 'Received', confirmed: 'Confirmed', not_confirmed: 'Quote or enquiry', cancelled: 'Cancelled', completed: 'Collected' };
  function dxState() { if (!DX) DX = { data: null, loading: false, err: null, f: { p: 'd30', b: 'p', from: '', to: '', prod: 'all', ch: 'all', st: 'all' }, year: null, psort: 'q', drills: {} }; return DX; }
  function dashLoad(force) {
    var d = dxState(); if (d.loading) return; if (d.data && !force) { view(); return; }
    d.loading = true; d.err = null; view();
    sb.rpc('dashboard_register').then(function (r) {
      d.loading = false;
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) d.err = (r.data && r.data.message) || 'We couldn\'t load the dashboard. Try again.';
      else { d.data = r.data; dxPrep(); }
      if (S.tab === 'dash') view();
    }).catch(function (e) { console.error(e); d.loading = false; if (errKind(e) === 'expired') return sessionExpired(); d.err = 'We couldn\'t load the dashboard. Check the connection and try again.'; if (S.tab === 'dash') view(); });
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
    if (f.p === 'd30') r = { from: addDays(t, -29), to: t, pf: addDays(t, -59), pt: addDays(t, -30), cmp: 'previous 30 days' };
    else if (f.p === 'm') r = { from: dxMonthStart(t), to: t, pf: dxMonthStart(dxAddMonths(t, -1)), pt: dxAddMonths(t, -1), cmp: 'same days last month' };
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
  function dxMatch(o) { var f = DX.f; if (f.ch !== 'all' && o.src !== f.ch) return false; if (f.occ && f.occ !== 'all' && (o.oc || 'not_specified') !== f.occ) return false; if (f.prod !== 'all' && !(o.it || []).some(function (i) { return i[0] === f.prod; })) return false; return true; }
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
  // Where the figures are known to be incomplete: a sheet not read lately, or a sheet that stopped getting orders while it was busy.
  // From that date on, figures are marked incomplete and no comparisons are shown, so nothing misleading appears.
  function dxGap() {
    var d = DX.data, t = today(), out = [], fiji = function (ts) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ts)); };
    var sy = d.sync, lim = ((sy && sy.stale_minutes) || 20) * 6e4;
    [['online', 'Online sheet', 'online order sheet'], ['walkin', 'Walk-in sheet', 'walk-in sheet']].forEach(function (k) {
      var list = d.orders.filter(function (o) { return o.sys === k[1]; }); if (!list.length) return;
      var last = list.reduce(function (m, o) { return o.pd > m ? o.pd : m; }, '');
      var busy = list.filter(function (o) { return o.pd > addDays(last, -60) && o.pd <= last; }).length;
      if (busy >= 10 && last < addDays(t, -14)) out.push({ from: addDays(last, 1), why: 'no ' + k[2] + ' orders after ' + nice(last, true).replace(/^\w+ /, '') });
      var x = sy && sy[k[0]], ok = x && x.ok_at ? Date.parse(x.ok_at) : 0, fl = x && x.fail_at ? Date.parse(x.fail_at) : 0;
      if (sy && (!ok || fl > ok || Date.now() - ok > lim)) out.push({ from: ok ? fiji(x.ok_at) : '2000-01-01', why: 'the ' + k[2] + ' has not been read since ' + (ok ? nice(fiji(x.ok_at), true).replace(/^\w+ /, '') : 'setup') });
    });
    if (!out.length) return null;
    out.sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    return { from: out[0].from, why: out.map(function (x) { return x.why; }) };
  }
  function dashView() {
    var d = dxState(); d.drills = {};
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Dashboard</h1><p class="ccs-sub"><span class="ccs-subtxt">' + (d.data ? 'Figures as of ' + esc(stamp(d.data.generated_at)) + '. ' : '') + 'View only.</span> <button type="button" class="ccs-link ccs-refresh" data-act="dx-refresh">Refresh</button>' + (d.data ? ' · <button type="button" class="ccs-link ccs-refresh" data-act="dx-export">Export summary</button>' : '') + '</p>' + '</div></div>';
    if (d.err) return h + '<div class="ccs-empty"><b>' + esc(d.err) + '</b><button type="button" class="ccs-btn" data-act="dx-refresh">Try again</button></div>';
    if (!d.data) return h + '<p class="ccs-loading">Loading the dashboard…</p>';
    var f = d.f, r = dxRange(), data = d.data, byOrder = f.b === 'o';
    var prods = []; data.orders.forEach(function (o) { (o.it || []).forEach(function (i) { if (prods.indexOf(i[0]) < 0) prods.push(i[0]); }); }); prods.sort();
    var chans = []; data.orders.forEach(function (o) { if (chans.indexOf(o.src) < 0) chans.push(o.src); });
    var sel = function (id, label, opts, cur) { return '<label class="ccs-field dx-f"><span class="ccs-label">' + label + '</span><select class="ccs-input" id="' + id + '" data-dx="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; };
    var fsum = [(DX_PERIODS.filter(function (x) { return x[0] === f.p; })[0] || ['', ''])[1], f.prod === 'all' ? 'All cakes' : f.prod, f.ch === 'all' ? 'All channels' : (SOURCE_LABEL[f.ch] || f.ch)].concat(f.occ && f.occ !== 'all' ? [dxOccName(f.occ)] : []).join(' · ');
    h += '<button type="button" class="ccs-btn ccs-ghost dx-ftoggle" data-act="dx-filters" aria-expanded="' + !!d.fopen + '">Filters: ' + esc(fsum) + '</button>';
    h += '<div class="dx-filters' + (d.fopen ? '' : ' is-closed') + '">' + sel('dx-p', 'Period', DX_PERIODS, f.p) +
      (f.p === 'c' ? '<label class="ccs-field dx-f"><span class="ccs-label">From</span><input class="ccs-input" type="date" id="dx-from" data-dx="dx-from" value="' + esc(f.from) + '"></label><label class="ccs-field dx-f"><span class="ccs-label">To</span><input class="ccs-input" type="date" id="dx-to" data-dx="dx-to" value="' + esc(f.to) + '"></label>' : '') +
      sel('dx-b', 'Count by', DX_BASIS, f.b) +
      sel('dx-prod', 'Cake', [['all', 'All cakes']].concat(prods.map(function (p) { return [p, p]; })), f.prod) +
      sel('dx-ch', 'Channel', [['all', 'All channels']].concat(chans.map(function (c) { return [c, SOURCE_LABEL[c] || c]; })), f.ch) +
      sel('dx-occ', 'Occasion', [['all', 'All occasions']].concat((data.occasions || []).map(function (o) { return [o.c, o.l]; })), f.occ || 'all') + '</div>';
    var gap = dxGap(), hit = gap && !r.all && r.to >= gap.from, hitPrev = gap && r.pf && r.pt >= gap.from;
    if (hit || hitPrev) { r.noCmp = true; }
    d.gapHit = hit;
    var cur = dxSales(r.from, r.to), cs = dxSum(cur), ps = r.pf && !r.noCmp ? dxSum(dxSales(r.pf, r.pt)) : null;
    var rec = cur.filter(function (o) { return o.cp === 'recorded'; }), asm = cur.filter(function (o) { return o.cp === 'assumed'; });
    var got = dxIn(r.from, r.to), pgot = r.pf && !r.noCmp ? dxIn(r.pf, r.pt) : null, cx = got.filter(function (o) { return o.off; });
    var t = today(), up = data.orders.filter(function (o) { return o.open && o.pd >= t && dxMatch(o); }), upv = up.reduce(function (s, o) { return s + dxValue(o); }, 0), upc = up.filter(function (o) { return o.st === 'confirmed'; }).length;
    var cash = 0, cashList = [], refunds = 0, refList = [];
    data.orders.forEach(function (o) { if (!dxMatch(o)) return; var g = 0, rf = 0; (o.pay || []).forEach(function (p) { if (!inRange(p[2], r.from, r.to)) return; if (p[0] === 'refund') rf += dnum(p[1]); else if (p[0] !== 'adjustment') g += dnum(p[1]); }); if (g) { cash += g; cashList.push(o); } if (rf) { refunds += rf; refList.push(o); } });
    var owing = data.orders.filter(function (o) { return o.live && dxMatch(o) && (o.st === 'confirmed' || o.st === 'completed') && dnum(o.bal) > 0.005; }), owed = owing.reduce(function (s, o) { return s + dnum(o.bal); }, 0);
    var basisWord = byOrder ? 'order date' : 'pickup date';
    var gapNote = gap ? '<div class="dx-gap" role="note"><p><b>' + (hit ? 'Figures from ' + esc(nice(gap.from, true).replace(/^\w+ /, '')) + ' are incomplete.' : 'Comparisons are hidden.') + '</b> ' + esc(dxAnd(gap.why).replace(/^./, function (c) { return c.toUpperCase(); })) + '. ' + (hit ? 'Changes and comparisons are hidden until this is fixed.' : 'The period before includes dates with missing orders.') +
      ' <button type="button" class="ccs-link" data-act="dx-gapmore" aria-expanded="' + !!d.gapOpen + '">' + (d.gapOpen ? 'Hide details' : 'Details') + '</button></p>' + (d.gapOpen ? dxSync(data.sync, true) : '') + '</div>' : '';
    var period = '<p class="dx-period">' + (r.all ? 'All recorded history' : esc(nice(r.from) + ' to ' + nice(r.to))) + ', by ' + basisWord + (ps ? '. Compared with ' + esc(r.cmp) + '.' : r.noCmp ? '. Not compared, because of missing orders.' : '.') + (f.prod !== 'all' ? ' Showing ' + esc(f.prod) + ' only.' : '') + '</p>';
    // Overview: the summary page (see ovView)
    d.cmpShort = ps ? 'vs ' + r.cmp : '';
    var ov = ovView(r, cur, cs, ps, got, pgot, owing);
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
    dxProducts(cur); dxOccasions(r); dxLead(r); dxUpcoming(up); dxCustomers(cur, r); dxPayments(r); dxOps(r); dxDiscounts(cur); dxDemand(cur); dxYear(); dxOrders(r);
    dxSec('df', 'About the data', flags.length + ' things to know', '<p class="dx-ch">' + flags.length + ' things to know about this data</p>' + flags.map(dxFlag).join('') + dxDefs());
    d.secs = [['ov', 'Overview', '', '']].concat(dxMerge(d.secs));
    var keys = d.secs.map(function (x) { return x[0]; }), cs2 = secCur('dash', keys, 'ov'), sec = d.secs.filter(function (x) { return x[0] === cs2; })[0];
    h += '<div class="dx-secs">' + secBar('dash', d.secs.map(function (x) { return [x[0], x[1]]; }), cs2, 'Dashboard sections') + '</div>' + period;
    if (cs2 === 'ov') return h + gapNote + '<div class="dx-ov">' + ov + '</div>';
    return h + gapNote + '<section class="dx-card dx-secbody" aria-label="' + esc(sec[1]) + '"><div class="dx-card-h"><h2>' + esc(sec[1]) + '</h2>' + (sec[2] ? '<span>' + sec[2] + '</span>' : '') + '</div>' + sec[3] + '</section>';
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
  // ----- Overview (the summary page): four figures, the trend, status, top cakes, customers, pickup times, what needs attention -----
  // Chart colours (checked for colour blindness): status always shown with its name beside the colour
  var OV_C = { done: '#2E9A6E', come: '#3F74C0', wait: '#D19A2A', off: '#C2453F', unmarked: '#98A2B3', prev: '#98A2B3', line: '#3F74C0', newc: '#3F74C0', back: '#A0527A' };
  var OV_HEAT = ['#9DB8E3', '#6F97D3', '#3F74C0', '#2A5698', '#1B3B6B'];
  var OV_ICON = {
    orders: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    money: '<path d="M4 7h16v10H4z"/><circle cx="12" cy="12" r="2.5"/><path d="M7 10v4M17 10v4"/>',
    avg: '<path d="M4 19h16"/><path d="M7 16V11M12 16V7M17 16v-3"/>',
    done: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>'
  };
  function ovIcon(k) { return '<span class="ov-ic" aria-hidden="true"><svg viewBox="0 0 24 24">' + OV_ICON[k] + '</svg></span>'; }
  function ovHour(h) { return (h % 12 || 12) + (h < 12 ? ' AM' : ' PM'); }
  function ovDay(iso) { return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; }
  function ovShort(iso) { return +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1]; }
  // Time buckets across the period (day, week or month), each with the matching bucket of the period before
  function ovSpan(r) {
    var t = today(), from = r.from, to = r.to > t ? t : r.to;
    if (r.all) { from = t; DX.data.orders.forEach(function (o) { var x = dxD(o); if (x && x < from) from = x; }); }
    return { from: from, to: to, days: daysBetween(from, to) + 1 };
  }
  function ovUnit(sp, n) { var u = DX.unit; if (u === 'd' && sp.days > 120) u = null; if (u === 'w' && sp.days > 1200) u = null; return u || (sp.days <= 45 ? (n != null && n < 30 && sp.days > 14 ? 'w' : 'd') : sp.days <= 200 ? 'w' : 'm'); }
  function ovBuckets(r, n) {
    var sp = ovSpan(r), u = ovUnit(sp, n), out = [], a, b;
    if (u === 'd') for (a = sp.from; a <= sp.to; a = addDays(a, 1)) out.push({ a: a, b: a, l: ovShort(a), full: nice(a, true) });
    else if (u === 'w') { a = addDays(sp.from, -ovDay(sp.from)); for (; a <= sp.to; a = addDays(a, 7)) { b = addDays(a, 6); out.push({ a: a < sp.from ? sp.from : a, b: b > sp.to ? sp.to : b, l: ovShort(a), full: 'Week starting ' + nice(a, true) }); } }
    else { a = dxMonthStart(sp.from); for (; a <= sp.to; a = dxAddMonths(a, 1)) { b = dxMonthEnd(a); out.push({ a: a < sp.from ? sp.from : a, b: b > sp.to ? sp.to : b, l: MON[+a.slice(5, 7) - 1] + ' ' + a.slice(2, 4), full: MONF[+a.slice(5, 7) - 1] + ' ' + a.slice(0, 4) }); } }
    var nm = out.length, len = sp.days;
    out.forEach(function (x) {
      x.got = dxIn(x.a, x.b); x.sales = dxSales(x.a, x.b); x.s = dxSum(x.sales);
      x.done = x.got.filter(function (o) { return o.sale; }).length; x.off = x.got.filter(function (o) { return o.off; }).length;
      x.rate = x.done + x.off ? x.done / (x.done + x.off) * 100 : NaN;
      if (r.pf && !r.noCmp) { var pa = u === 'm' ? dxAddMonths(x.a, -nm) : addDays(x.a, -len), pb = u === 'm' ? dxAddMonths(x.b, -nm) : addDays(x.b, -len); x.pn = dxIn(pa, pb).length; x.pv = dxSum(dxSales(pa, pb)).v; }
    });
    out.unit = u; out.span = sp; return out;
  }
  function ovNiceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function ovDelta(cur, prev, points) {
    if (prev == null || !isFinite(prev)) return { t: '', c: '' };
    if (points) { var d = Math.round(cur - prev); return d > 0 ? { t: 'Up ' + d + (d === 1 ? ' point' : ' points'), c: 'up' } : d < 0 ? { t: 'Down ' + (-d) + (d === -1 ? ' point' : ' points'), c: 'down' } : { t: 'No change', c: 'flat' }; }
    return dxDelta(cur, prev);
  }
  function ovKpi(icon, label, value, delta, sub, spark, list, title, prev) {
    var dl = delta.t ? esc(delta.t) + (DX.cmpShort ? '<em> ' + esc(DX.cmpShort) + '</em>' : '') + (prev ? '<em class="ov-prev-v"> (was ' + esc(prev) + ')</em>' : '') : DX.gapHit ? '<span class="ov-inc">Incomplete<em>, not compared</em></span>' : '&nbsp;';
    return dxTap(list, title, '<span class="ov-kh">' + ovIcon(icon) + '<span class="ov-kl">' + label + '</span></span><b class="ov-kv">' + value + '</b>' +
      '<span class="ov-kd is-' + (delta.c || 'none') + '">' + dl + '</span>' +
      dxSpark(spark) + '<span class="ov-ks">' + esc(sub) + '</span>', 'ov-kpi');
  }
  // Orders or revenue over time: one measure at a time (switch between them), the period before as a dashed grey line
  function ovTrend(bk, r) {
    var tm = DX.tm || 'o', isV = tm === 'v', val = function (x) { return isV ? x.s.v : x.got.length; }, pv = function (x) { return isV ? x.pv : x.pn; };
    var hasPrev = !!r.pf && !r.noCmp && bk.length > 1, n = bk.length;
    var max = ovNiceMax(bk.reduce(function (m, x) { return Math.max(m, val(x), hasPrev ? pv(x) || 0 : 0); }, 0));
    var fmt = function (v) { return isV ? m0(v) : int(v); }, ax = function (v) { return isV ? (v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '$' + Math.round(v)) : int(v); };
    var X = function (i) { return n === 1 ? 50 : i / (n - 1) * 100; }, Y = function (v) { return 100 - v / max * 100; };
    var pts = bk.map(function (x, i) { return X(i).toFixed(2) + ',' + Y(val(x)).toFixed(2); });
    var svg = '<svg class="ov-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      [0.25, 0.5, 0.75].map(function (g) { return '<line class="ov-grid" x1="0" x2="100" y1="' + (g * 100) + '" y2="' + (g * 100) + '" vector-effect="non-scaling-stroke"/>'; }).join('') +
      '<line class="ov-base" x1="0" x2="100" y1="100" y2="100" vector-effect="non-scaling-stroke"/>' +
      (n > 1 ? '<polygon class="ov-area" points="0,100 ' + pts.join(' ') + ' 100,100"/>' : '') +
      (hasPrev ? '<polyline class="ov-prev" points="' + bk.map(function (x, i) { return X(i).toFixed(2) + ',' + Y(pv(x) || 0).toFixed(2); }).join(' ') + '" vector-effect="non-scaling-stroke"/>' : '') +
      (n > 1 ? '<polyline class="ov-line" points="' + pts.join(' ') + '" vector-effect="non-scaling-stroke"/>' : '') + '</svg>';
    var dots = bk.map(function (x, i) { return n <= 40 && val(x) ? '<i class="ov-dot" style="left:' + X(i).toFixed(2) + '%;top:' + Y(val(x)).toFixed(2) + '%"></i>' : ''; }).join('');
    var hits = '<div class="ov-hits" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + bk.map(function (x, i) {
      var tip = x.full + ': ' + fmt(val(x)) + (isV ? ' from ' + x.s.n + (x.s.n === 1 ? ' sale' : ' sales') : x.got.length === 1 ? ' order' : ' orders') + (hasPrev ? '. Period before: ' + fmt(pv(x) || 0) : '');
      var cls = 'ov-hit' + (i > n * 0.66 ? ' tip-l' : i < n * 0.34 ? ' tip-r' : '');
      var list = isV ? x.sales : x.got;
      return list.length ? '<button type="button" class="' + cls + '" data-act="dx-drill" data-v="' + dxKey({ t: x.full + (isV ? ' sales' : ' orders'), l: list }) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '"></button>' : '<span class="' + cls + '" data-tip="' + esc(tip) + '" tabindex="0" aria-label="' + esc(tip) + '"></span>';
    }).join('') + '</div>';
    var ticks = [0, 0.5, 1].map(function (g) { return '<span style="top:' + ((1 - g) * 100) + '%">' + ax(max * g) + '</span>'; }).join('');
    var step = Math.max(1, Math.ceil(n / ((window.innerWidth || 1280) < 700 ? 3 : 6))), xl = bk.map(function (x, i) { return i % step === 0 && (n - 1 - i >= step * 0.7 || i === n - 1) || i === n - 1 && (n - 1) % step > 0 ? '<span' + (i === n - 1 && n > 1 ? ' class="is-end"' : '') + ' style="left:' + X(i).toFixed(2) + '%">' + esc(x.l) + '</span>' : ''; }).join('');
    var tg = function (k, l) { return '<button type="button" class="ccs-chip dx-tg" data-act="dx-tm" data-v="' + k + '" aria-pressed="' + (tm === k) + '">' + l + '</button>'; };
    var ug = function (k, l, off) { return '<button type="button" class="ccs-chip dx-tg" data-act="dx-unit" data-v="' + k + '" aria-pressed="' + (bk.unit === k) + '"' + (off ? ' disabled' : '') + '>' + l + '</button>'; };
    var tbl = '';
    if (DX.table) tbl = '<div class="ccs-table-wrap"><table class="ccs-table dx-table"><thead><tr><th>' + (bk.unit === 'd' ? 'Day' : bk.unit === 'w' ? 'Week starting' : 'Month') + '</th><th class="ccs-num">Orders</th><th class="ccs-num">Completed sales</th><th class="ccs-num">Revenue</th>' + (hasPrev ? '<th class="ccs-num">Orders, period before</th><th class="ccs-num">Revenue, period before</th>' : '') + '</tr></thead><tbody>' +
      bk.map(function (x) { return '<tr><td>' + esc(x.full) + '</td><td class="ccs-num">' + int(x.got.length) + '</td><td class="ccs-num">' + int(x.s.n) + '</td><td class="ccs-num">' + m0(x.s.v) + '</td>' + (hasPrev ? '<td class="ccs-num">' + int(x.pn) + '</td><td class="ccs-num">' + m0(x.pv) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
    return '<section class="dx-card ov-trend" aria-label="Orders and revenue over time"><div class="dx-card-h"><h2>Orders and revenue over time</h2><div class="dx-card-acts"><span class="ov-seg" role="group" aria-label="Show">' + tg('o', 'Orders') + tg('v', 'Revenue') + '</span>' +
      '<span class="ov-seg" role="group" aria-label="Group by">' + ug('d', 'Daily', bk.span.days > 120) + ug('w', 'Weekly', bk.span.days > 1200) + ug('m', 'Monthly') + '</span></div></div>' +
      (DX.table ? tbl : '<div class="ov-plot"><div class="ov-yax">' + ticks + '</div><div class="ov-area-w">' + svg + dots + hits + '</div><div class="ov-xax">' + xl + '</div></div>' +
        '<p class="dx-legend ov-legend"><span class="ov-key-line"></span>' + (isV ? 'Revenue' : 'Orders') + ', this period' + (hasPrev ? '<span class="ov-key-prev"></span>Period before' : '') + '</p>') +
      '<p class="ov-foot"><button type="button" class="ccs-link" data-act="dx-table">' + (DX.table ? 'Show chart' : 'Show as a table') + '</button>' + (isV ? ' · Revenue counts completed sales only.' : ' · Orders counts every order, whatever happened to it.') + '</p></section>';
  }
  // Status of the orders in the period, as a ring with names, counts and shares
  function ovStatus(got) {
    var g = [['done', 'Completed', function (o) { return o.sale; }], ['come', 'Confirmed, to come', function (o) { return o.open && o.st === 'confirmed'; }], ['wait', 'Awaiting confirmation', function (o) { return !o.off && !o.sale && o.cp !== 'not_recorded' && !(o.open && o.st === 'confirmed'); }], ['off', 'Cancelled', function (o) { return o.off; }], ['unmarked', 'Past pickup, not marked collected', function (o) { return o.cp === 'not_recorded' && !o.off; }]];
    var rows = g.map(function (x) { return { k: x[0], l: x[1], list: got.filter(x[2]) }; }).filter(function (x) { return x.list.length; }), tot = got.length;
    var segs = rows.filter(function (x) { return x.list.length; }), gap = segs.length > 1 ? 0.8 : 0, acc = 0;
    var ring = '<svg class="ov-ring" viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.915" class="ov-ring-bg"/>' + segs.map(function (x) {
      var p = x.list.length / tot * 100, len = Math.max(p - gap, 0.4), s = '<circle cx="21" cy="21" r="15.915" stroke="' + OV_C[x.k] + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (100 - len).toFixed(2) + '" stroke-dashoffset="' + (25 - acc - gap / 2).toFixed(2) + '"/>';
      acc += p; return s;
    }).join('') + '</svg>';
    var legend = '<div class="ov-sleg">' + rows.map(function (x) {
      var n = x.list.length, p = tot ? Math.round(n / tot * 100) : 0;
      return dxTap(x.list, x.l, '<i style="background:' + OV_C[x.k] + '"></i><span class="ov-sl">' + esc(x.l) + '</span><b>' + int(n) + '</b><span class="ov-sp">' + p + '%</span>', 'ov-srow');
    }).join('') + '</div>';
    return '<section class="dx-card ov-status" aria-label="Order status"><div class="dx-card-h"><h2>Order status</h2><span>Orders in this period</span></div>' +
      (tot ? '<div class="ov-sbody"><div class="ov-ringw">' + ring + '<div class="ov-ringc"><b>' + int(tot) + '</b><span>orders</span></div></div>' + legend + '</div>' : '<p class="ccs-quiet">No orders in this period.</p>') + '</section>';
  }
  function ovTop(cur, prevList) {
    var grp = function (l) { return dxGroup(l, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [i[0], q, dnum(i[4]) * q]; }); }); };
    var g = grp(cur).sort(function (a, b) { return (!b.v - !a.v) || b.v - a.v || b.q - a.q; }), pv = {};
    var priced = g.filter(function (x) { return x.v > 0; }); g = priced.length >= 5 ? priced.slice(0, 5) : g.slice(0, 5);
    if (prevList) grp(prevList).forEach(function (x) { pv[x.l] = x.v; });
    var body = g.length ? '<div class="ov-top"><div class="ov-top-h"><span>Cake</span><span>Revenue</span><span>' + (prevList ? 'Change' : '') + '</span></div>' + g.map(function (x, k) {
      var d = prevList && x.v > 0 ? dxDelta(x.v, pv[x.l] || 0) : { t: '', c: '' };
      return dxTap(x.list, x.l, '<span class="ov-rank">' + (k + 1) + '</span><span class="ov-tn"><b>' + esc(x.l) + '</b><span>' + int(x.q) + (x.q === 1 ? ' cake' : ' cakes') + '</span></span><span class="ov-tv' + (x.v > 0 ? '' : ' is-np') + '">' + (x.v > 0 ? m0(x.v) : 'Not priced yet') + '</span>' + (x.v > 0 ? '<span class="ov-tc is-' + (d.c || 'none') + '">' + esc(d.t || '') + '</span>' : ''), 'ov-trow');
    }).join('') + '</div>' : '<p class="ccs-quiet">No completed sales in this period.</p>';
    return '<section class="dx-card" aria-label="Top selling cakes"><div class="dx-card-h"><h2>Top selling cakes</h2><span>By revenue</span></div>' + body + '</section>';
  }
  function ovCustomers(cur, r) {
    var first = DX.data.first, by = {};
    cur.forEach(function (o) { if (!o.c) return; (by[o.c] = by[o.c] || []).push(o); });
    var ids = Object.keys(by), nw = ids.filter(function (c) { return r.all || first[c] >= r.from; }), ret = ids.filter(function (c) { return !r.all && first[c] < r.from; });
    var upto = {}; DX.data.orders.forEach(function (o) { if (o.sale && o.c && o.pd <= r.to) upto[o.c] = (upto[o.c] || 0) + 1; });
    var listOf = function (cs) { var l = []; cs.forEach(function (c) { l = l.concat(by[c]); }); return l; };
    var n = ids.length, pn = n ? Math.round(nw.length / n * 100) : 0;
    var bands = [['1 order', 1, 1], ['2 to 3 orders', 2, 3], ['4 or more orders', 4, 1e9]].map(function (b) { var cs = ids.filter(function (c) { return upto[c] >= b[1] && upto[c] <= b[2]; }); return { l: b[0], v: cs.length, list: listOf(cs), t: 'Customers with ' + b[0] }; });
    var noId = cur.filter(function (o) { return !o.c; }).length;
    var body = n ? '<div class="ov-cnum">' + dxTap(listOf(nw), 'New customers\' orders', '<i style="background:' + OV_C.newc + '"></i><span>New</span><b>' + int(nw.length) + '</b><em>' + pn + '%</em>', 'ov-cn') + dxTap(listOf(ret), 'Returning customers\' orders', '<i style="background:' + OV_C.back + '"></i><span>Returning</span><b>' + int(ret.length) + '</b><em>' + (100 - pn) + '%</em>', 'ov-cn') + '</div>' +
      '<div class="ov-split" role="img" aria-label="' + pn + '% new, ' + (100 - pn) + '% returning"><i style="width:' + pn + '%;background:' + OV_C.newc + '"></i><i style="width:' + (100 - pn) + '%;background:' + OV_C.back + '"></i></div>' +
      '<p class="ov-sub">Completed orders per customer, all time</p>' + bands.map(function (x) { var p = n ? Math.round(x.v / n * 100) : 0; return dxTap(x.list, x.t, '<span class="ov-dl">' + x.l + '</span><span class="ov-dt"><i style="width:' + p + '%"></i></span><b>' + int(x.v) + '</b><span class="ov-sp">' + p + '%</span>', 'ov-drow'); }).join('') +
      '<p class="ccs-hint">' + int(n) + ' customers bought in this period, matched by mobile number.' + (noId ? ' ' + int(noId) + (noId === 1 ? ' sale has' : ' sales have') + ' no customer record.' : '') + '</p>' : '<p class="ccs-quiet">No completed sales with a customer in this period.</p>';
    return '<section class="dx-card ov-cust" aria-label="Customer insights"><div class="dx-card-h"><h2>Customer insights</h2><span>Completed sales</span></div>' + body + '</section>';
  }
  // Pickup times: day of the week against hour of the day. Falls back to the last 12 months when the period has too few orders to show a pattern.
  function ovPeak(got, r) {
    var use = function (l) { return l.filter(function (o) { return !o.off && o.pt && /^\d{1,2}:/.test(o.pt); }); }, list = use(got), wide = false;
    if (list.length < 15) { var t = today(); list = use(DX.data.orders.filter(function (o) { return inRange(o.pd, addDays(t, -364), t) && dxMatch(o); })); wide = true; }
    var cell = {}, lo = 24, hi = -1;
    list.forEach(function (o) { var h = +o.pt.split(':')[0], k = ovDay(o.pd) + '|' + h; (cell[k] = cell[k] || []).push(o); if (h < lo) lo = h; if (h > hi) hi = h; });
    if (!list.length) return '<section class="dx-card" aria-label="Peak pickup times"><div class="dx-card-h"><h2>Peak pickup times</h2></div><p class="ccs-quiet">No pickup times recorded.</p></section>';
    lo = Math.max(Math.min(lo, 9), 6); hi = Math.min(Math.max(hi, 17), 21);
    var max = 0, best = null; Object.keys(cell).forEach(function (k) { if (cell[k].length > max) { max = cell[k].length; best = k; } });
    var hrs = []; for (var h = lo; h <= hi; h++) hrs.push(h);
    var grid = '<div class="ov-heat" style="grid-template-columns:40px repeat(' + hrs.length + ',minmax(0,1fr))"><span></span>' + hrs.map(function (h) { return '<span class="ov-hx">' + ((h - lo) % 2 ? '' : (h % 12 || 12) + (h < 12 ? ' AM' : ' PM')) + '</span>'; }).join('') +
      WD.map(function (d, di) {
        return '<span class="ov-hy">' + d + '</span>' + hrs.map(function (h) {
          var l = cell[di + '|' + h] || [], c = l.length, step = c ? Math.min(OV_HEAT.length - 1, Math.floor((c / max) * OV_HEAT.length - 0.0001)) : -1;
          var tip = WDF[di] + ', ' + ovHour(h) + ' to ' + ovHour(h + 1) + ': ' + c + (c === 1 ? ' pickup' : ' pickups');
          return c ? '<button type="button" class="ov-hc' + (h - lo > hrs.length / 2 ? ' tip-l' : '') + '" style="background:' + OV_HEAT[step] + '" data-act="dx-drill" data-v="' + dxKey({ t: tip, l: l }) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '"></button>' : '<span class="ov-hc is-0" data-tip="' + esc(tip) + '"></span>';
        }).join('');
      }).join('') + '</div>';
    var bd = best.split('|');
    return '<section class="dx-card ov-peak" aria-label="Peak pickup times"><div class="dx-card-h"><h2>Peak pickup times</h2><span>' + (wide ? 'Last 12 months' : 'This period') + '</span></div>' + grid +
      '<p class="dx-legend ov-hleg">Fewer' + OV_HEAT.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('') + 'More</p>' +
      '<p class="ov-foot">Busiest: <b>' + WDF[+bd[0]] + ', ' + ovHour(+bd[1]) + ' to ' + ovHour(+bd[1] + 1) + '</b> (' + max + (max === 1 ? ' pickup' : ' pickups') + ').' + (wide ? ' This period has too few orders with a pickup time, so the last 12 months are shown.' : '') + '</p></section>';
  }
  function ovAttention(owing) {
    var t = today(), tm = addDays(t, 1), all = DX.data.orders.filter(dxMatch), live = function (o) { return !o.off && !o.sale && o.pd >= t; };
    var rows = [
      ['Awaiting confirmation', all.filter(function (o) { return live(o) && o.st !== 'confirmed'; }), 'Orders from today on, not yet confirmed'],
      ['Needs a price', all.filter(function (o) { return live(o) && !o.tot; }), 'No price agreed yet'],
      ['Due tomorrow', all.filter(function (o) { return live(o) && o.pd === tm; }), nice(tm, true)],
      ['Money still owed', owing, m0(owing.reduce(function (s, o) { return s + dnum(o.bal); }, 0)) + ' to collect'],
      ['Past pickup, not marked collected', all.filter(function (o) { return o.cp === 'not_recorded' && !o.off; }), 'Mark collected or cancelled']
    ];
    return '<section class="dx-card ov-att" aria-label="Needs attention"><div class="dx-card-h"><h2>Needs attention</h2><span>As of today</span></div>' + rows.map(function (x) {
      var n = x[1].length;
      return dxTap(x[1], x[0], '<span class="ov-an' + (n ? ' is-on' : '') + '">' + int(n) + '</span><span class="ov-at"><b>' + esc(x[0]) + '</b><span>' + esc(n ? x[2] : 'None') + '</span></span>' + (n ? '<span class="ov-go" aria-hidden="true">View</span>' : ''), 'ov-arow');
    }).join('') + '</section>';
  }
  function ovRecent() {
    var t = today(), ev = [];
    DX.data.orders.forEach(function (o) {
      if (!dxMatch(o)) return;
      var nm = o.cn ? ', ' + o.cn : '';
      if (o.odok && o.od && o.od <= t) ev.push({ k: o.od + 'T00:00', o: o, w: nice(o.od), t: 'New order ' + o.r + nm, s: 'For ' + nice(o.pd) + (dxValue(o) ? ', ' + m0(dxValue(o)) : '') });
      if (typeof o.ho === 'string' && o.ho) ev.push({ k: o.ho, o: o, w: when(o.ho), t: 'Collected ' + o.r + nm, s: dxValue(o) ? m0(dxValue(o)) : '' });
      if (typeof o.ca === 'string' && o.ca && o.off) ev.push({ k: o.ca, o: o, w: when(o.ca), t: 'Cancelled ' + o.r + nm, s: o.cx || '' });
    });
    ev.sort(function (a, b) { return a.k < b.k ? 1 : a.k > b.k ? -1 : 0; });
    return '<section class="dx-card ov-rec" aria-label="Recent activity"><div class="dx-card-h"><h2>Recent activity</h2><span>Latest first</span></div>' + (ev.length ? ev.slice(0, 6).map(function (e) {
      var o = e.o, act = o.i && o.live ? 'data-act="open-order" data-id="' + o.i + '"' : 'data-act="rg-open" data-v="' + esc(o.k || '') + '"';
      return '<button type="button" class="ov-ev" ' + act + '><span class="ov-et"><b>' + esc(e.t) + '</b>' + (e.s ? '<span>' + esc(e.s) + '</span>' : '') + '</span><span class="ov-ew">' + esc(e.w) + '</span></button>';
    }).join('') : '<p class="ccs-quiet">No activity yet.</p>') + '</section>';
  }
  // Up to three plain observations worked out from the figures above. No guesses about causes.
  function ovInsights(cur, cs, ps, r) {
    var out = [], t = today(), wk = addDays(t, 7);
    var wait = DX.data.orders.filter(function (o) { return dxMatch(o) && !o.off && !o.sale && o.st !== 'confirmed' && o.pd >= t && o.pd <= wk; });
    if (wait.length) out.push(dxTap(wait, 'Awaiting confirmation, next 7 days', '<b>' + int(wait.length) + (wait.length === 1 ? ' order' : ' orders') + '</b> for the next 7 days ' + (wait.length === 1 ? 'is' : 'are') + ' still waiting to be confirmed.', 'ov-in is-act'));
    if (ps && ps.v) { var p = Math.round((cs.v - ps.v) / ps.v * 100); out.push('<p class="ov-in">Revenue is <b>' + (p > 0 ? 'up ' + p + '%' : p < 0 ? 'down ' + (-p) + '%' : 'unchanged') + '</b> on the ' + esc(r.cmp) + ': ' + int(cs.n) + ' completed sales against ' + int(ps.n) + '.</p>'); }
    var g = dxGroup(cur, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [i[0], q, dnum(i[4]) * q]; }); }).sort(function (a, b) { return b.v - a.v; });
    if (g.length > 1 && cs.v && cur.length >= 10) out.push('<p class="ov-in"><b>' + esc(g[0].l) + '</b> brought in ' + Math.round(g[0].v / cs.v * 100) + '% of revenue (' + m0(g[0].v) + ').</p>');
    if (cur.length >= 20) { var wd = [0, 0, 0, 0, 0, 0, 0]; cur.forEach(function (o) { wd[ovDay(o.pd)]++; }); var top = wd.indexOf(Math.max.apply(null, wd)); out.push('<p class="ov-in"><b>' + WDF[top] + '</b> is the busiest pickup day, with ' + wd[top] + ' of ' + cur.length + ' completed sales.</p>'); }
    return '<section class="dx-card ov-ins" aria-label="Insights"><div class="dx-card-h"><h2>Insights</h2><span>Worked out from the figures</span></div>' + (out.length ? out.slice(0, 3).join('') : '<p class="ccs-quiet">Not enough orders in this period to say anything useful.</p>') + '</section>';
  }
  function ovView(r, cur, cs, ps, got, pgot, owing) {
    var bk = ovBuckets(r, got.length), cx = got.filter(function (o) { return o.off; }), dn = got.filter(function (o) { return o.sale; });
    var rate = dn.length + cx.length ? dn.length / (dn.length + cx.length) * 100 : NaN, prate = NaN;
    if (pgot) { var pd = pgot.filter(function (o) { return o.sale; }).length, px = pgot.filter(function (o) { return o.off; }).length; prate = pd + px ? pd / (pd + px) * 100 : NaN; }
    var h = '<div class="ov-kpis">' +
      ovKpi('orders', 'Total orders', int(got.length), ovDelta(got.length, pgot ? pgot.length : null), 'Every order in the period', bk.map(function (x) { return x.got.length; }), got, 'Orders in this period', pgot ? int(pgot.length) : '') +
      ovKpi('money', 'Revenue', m0(cs.v), ovDelta(cs.v, ps ? ps.v : null), 'From ' + int(cs.n) + ' completed ' + (cs.n === 1 ? 'sale' : 'sales'), bk.map(function (x) { return x.s.v; }), cur, 'Completed sales', ps ? m0(ps.v) : '') +
      ovKpi('avg', 'Average order value', m0(cs.aov), ovDelta(cs.aov, ps ? ps.aov : null), 'Revenue per completed sale', bk.map(function (x) { return x.s.n ? x.s.aov : NaN; }), cur, 'Completed sales', ps && ps.n ? m0(ps.aov) : '') +
      ovKpi('done', 'Completion rate', isFinite(rate) ? Math.round(rate) + '%' : 'None yet', isFinite(rate) ? ovDelta(rate, isFinite(prate) ? prate : null, true) : { t: '', c: '' }, int(dn.length) + ' completed, ' + int(cx.length) + ' cancelled', bk.map(function (x) { return x.rate; }), cx, 'Cancelled orders', isFinite(prate) ? Math.round(prate) + '%' : '') + '</div>';
    // Each card is named, so on a large screen they can be arranged to fit the screen with no page scroll
    var T = function (x, k) { return x.replace('class="dx-card', 'class="dx-card ov-k-' + k); };
    // Insights read as one line under the key figures; the cards below form one board
    h += T(ovInsights(cur, cs, ps, r), 'ins') + '<div class="ov-board">';
    h += '<div class="ov-row ov-r1">' + T(ovTrend(bk, r), 'trend') + T(ovStatus(got), 'status') + '</div>';
    h += '<div class="ov-row ov-r3">' + T(ovTop(cur, r.pf && !r.noCmp ? dxSales(r.pf, r.pt) : null), 'top') + T(ovCustomers(cur, r), 'cust') + T(ovPeak(got, r), 'peak') + '</div>';
    h += '<div class="ov-row ov-r3 ov-r3b">' + T(ovAttention(owing), 'att') + T(ovRecent(), 'rec') + '</div></div>';
    return h;
  }
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
    var cakes = srt(by(function (i) { return i[0]; })), fl = srt(by(function (i) { return i[1] || i[0]; })).slice(0, 10), sz = srt(by(function (i) { return i[2] ? i[2] + ' inch' : 'Custom size'; }));
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
    join('pa', 'di', 'Payments and pricing'); join('de', 'yr', 'Patterns'); join('up', 'op', 'Upcoming and operations');
    var order = ['up', 'pr', 'oc', 'cu', 'pa', 'op', 'de', 'ol', 'df'];
    secs.sort(function (a, b) { return order.indexOf(a[0]) - order.indexOf(b[0]); });
    return secs;
  }
  function dashSheet() {
    var dr = S.sheet.drill, list = dr.l.slice().sort(function (a, b) { return a.pd < b.pd ? 1 : -1; }), s = dxSum(list);
    return sheetHead(esc(dr.t)) + '<div class="ccs-sheet-body"><p class="ccs-hint">' + int(list.length) + ' orders · ' + int(s.c) + ' cakes · ' + m0(s.v) + '</p>' + dxRows(list, 200) + '</div>';
  }
  // ----- Occasions: what the cakes were for. Uses the same sales rules and filters as the rest of the dashboard -----
  function dxOccName(c) { var o = ((DX.data && DX.data.occasions) || []).filter(function (x) { return x.c === c; })[0]; return o ? o.l : c === 'not_specified' ? 'Not specified' : 'Other'; }
  function dxLastYear(r) { if (r.all) return null; var b = function (x) { return (+x.slice(0, 4) - 1) + x.slice(4); }; return { from: b(r.from), to: b(r.to) }; }
  function dxOccRows(r) {
    var placed = dxIn(r.from, r.to), ly = dxLastYear(r), lySales = ly ? dxSales(ly.from, ly.to) : [], first = DX.data.first || {};
    var codes = ((DX.data.occasions) || []).map(function (o) { return o.c; });
    return codes.map(function (c) {
      var mine = function (o) { return (o.oc || 'not_specified') === c; };
      var pl = placed.filter(mine), sales = pl.filter(function (o) { return o.sale; }), off = pl.filter(function (o) { return o.off; }), lys = lySales.filter(mine);
      var sum = dxSum(sales), lysum = ly ? dxSum(lys) : null;
      var isOn = function (o) { return String(o.src || '').toLowerCase() === 'online'; }, on = sales.filter(isOn), walk = sales.filter(function (o) { return !isOn(o); });
      var back = sales.filter(function (o) { return o.c && first[o.c] && first[o.c] < o.pd; });
      var cakes = {}; sales.forEach(function (o) { dxItems(o).forEach(function (i) { var k = (i[1] || i[0]) + (i[2] ? ', ' + i[2] + ' inch' : ''); cakes[k] = (cakes[k] || 0) + (dnum(i[3]) || 1); }); });
      var top = Object.keys(cakes).sort(function (a, b) { return cakes[b] - cakes[a]; })[0];
      return { c: c, l: dxOccName(c), pl: pl, sales: sales, off: off, sum: sum, ly: lysum, lys: lys, on: on, walk: walk, back: back, top: top ? top + ' (' + cakes[top] + ')' : '' };
    }).filter(function (x) { return x.pl.length || (x.ly && x.ly.n); });
  }
  function dxOccasions(r) {
    var rows = dxOccRows(r), ly = dxLastYear(r);
    if (!rows.length) return dxSec('oc', 'Occasions', '', '<p class="ccs-quiet">No orders in this period.</p>');
    var tap = function (list, t, v) { return dxTap(list, t, v, 'dx-oct'); };
    var tot = rows.reduce(function (a, x) { a.v += x.sum.v; a.n += x.sum.n; return a; }, { v: 0, n: 0 });
    var h = '<p class="dx-ch">What the cakes were for. Tap any number to see the orders.</p>' +
      '<div class="dx-octwrap"><table class="dx-octab"><thead><tr><th>Occasion</th><th>Orders placed</th><th>Completed sales</th><th>Sales value</th><th>Share</th><th>Average sale</th>' + (ly ? '<th>Same dates last year</th>' : '') + '<th>Online</th><th>Walk-in and phone</th><th>Returning customers</th><th>Cancelled</th><th>Top cake</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var chg = ly ? (x.ly.v ? change(x.sum.v, x.ly.v) : x.sum.v ? 'New' : '') : '';
        return '<tr><th scope="row">' + esc(x.l) + '</th>' +
          '<td>' + tap(x.pl, x.l + ': orders placed', int(x.pl.length)) + '</td>' +
          '<td>' + tap(x.sales, x.l + ': completed sales', int(x.sum.n)) + '</td>' +
          '<td><b>' + m0(x.sum.v) + '</b></td>' +
          '<td>' + (tot.v ? Math.round(x.sum.v / tot.v * 100) + '%' : '') + '</td>' +
          '<td>' + (x.sum.n ? m0(x.sum.v / x.sum.n) : '') + '</td>' +
          (ly ? '<td>' + tap(x.lys, x.l + ': same dates last year', m0(x.ly.v)) + (chg ? ' <span class="dx-occhg">' + esc(chg) + '</span>' : '') + '</td>' : '') +
          '<td>' + tap(x.on, x.l + ': online sales', int(x.on.length)) + '</td><td>' + tap(x.walk, x.l + ': walk-in and phone sales', int(x.walk.length)) + '</td>' +
          '<td>' + tap(x.back, x.l + ': returning customers', int(x.back.length)) + '</td>' +
          '<td>' + tap(x.off, x.l + ': cancelled', int(x.off.length)) + '</td>' +
          '<td>' + esc(x.top) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    h += '<div class="dx-octools"><button type="button" class="ccs-btn ccs-ghost" data-act="dx-occ-csv">Download as a spreadsheet (CSV)</button></div>';
    // Campaigns that brought real orders
    var camp = {}; dxIn(r.from, r.to).forEach(function (o) { if (!o.cmp) return; var e = camp[o.cmp] = camp[o.cmp] || { pl: [], s: [] }; e.pl.push(o); if (o.sale) e.s.push(o); });
    var ck = Object.keys(camp).sort(function (a, b) { return camp[b].pl.length - camp[a].pl.length; });
    h += '<hr class="dx-hr"><div class="dx-card-h"><h2>Campaigns</h2><span>From website links that name a campaign</span></div>' + (ck.length ?
      '<div class="dx-octwrap"><table class="dx-octab"><thead><tr><th>Campaign</th><th>Orders placed</th><th>Completed sales</th><th>Sales value</th></tr></thead><tbody>' + ck.map(function (k) { var e = camp[k], sm = dxSum(e.s); return '<tr><th scope="row">' + esc(k) + '</th><td>' + tap(e.pl, 'Campaign ' + k + ': orders placed', int(e.pl.length)) + '</td><td>' + tap(e.s, 'Campaign ' + k + ': completed sales', int(sm.n)) + '</td><td><b>' + m0(sm.v) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' :
      '<p class="ccs-quiet">No orders from campaign links in this period yet. Links look like /order-cake?occasion=mothers-day&amp;campaign=mothers-day-2026.</p>');
    h += '<hr class="dx-hr"><div class="dx-card-h"><h2>How these figures are counted</h2></div><ul class="dx-rules">' +
      '<li><b>Orders placed</b>: every order in the period, whatever happened to it.</li>' +
      '<li><b>Completed sales</b> and <b>Sales value</b>: orders handed over, or past sheet orders never cancelled, at the agreed price less refunds. The same rule as the rest of the dashboard.</li>' +
      '<li><b>Cancelled</b>: cancelled orders, shown apart and never counted as sales.</li>' +
      '<li><b>Occasion</b>: what the customer or staff chose on the order. It is never worked out from the pickup date, so a Mother\'s Day cake collected the day before still counts as Mother\'s Day.</li>' +
      '<li><b>Not specified</b>: the occasion was not given. Older orders without one stay here; they are not guessed.</li>' +
      '<li><b>Returning customers</b>: completed sales by customers who had bought before. Counts only, no names.</li></ul>';
    return dxSec('oc', 'Occasions', rows.length + ' occasions', h);
  }
  // ----- Lead time and pickup: how far ahead each occasion is ordered, when it is collected, which cakes, and the run-up to dated occasions -----
  var LT_B = [['Same day', 0, 0], ['1–2 days', 1, 2], ['3–6 days', 3, 6], ['1–2 weeks', 7, 13], ['2+ weeks', 14, 9999]];
  var PU_B = [['Morning', 0, 719, 'before 12 PM'], ['Midday', 720, 839, '12 to 2 PM'], ['Afternoon', 840, 1019, '2 to 5 PM'], ['Evening', 1020, 1439, 'after 5 PM']];
  var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var LT_MIN = 5;
  function ltDays(o) { if (!o.odok || !o.od || !o.pd) return null; var a = Date.parse(o.od + 'T00:00:00Z'), b = Date.parse(o.pd + 'T00:00:00Z'); var n = Math.round((b - a) / 86400000); return n >= 0 ? n : null; }
  function ltMins(o) { if (!o.pt) return null; var p = String(o.pt).split(':'); var m = Number(p[0]) * 60 + Number(p[1] || 0); return isFinite(m) ? m : null; }
  function ltMed(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var k = Math.floor(a.length / 2); return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2; }
  function ltPct(a, q) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1) + 0.5))]; }
  function ltDaysTxt(n) { return n == null ? '' : n === 0 ? 'the same day' : (Math.round(n * 10) / 10) + (n === 1 ? ' day' : ' days') + ' ahead'; }
  function ltDatesLoad() {
    if (DX.odates || DX.odLoading) return; DX.odLoading = true;
    sb.from('occasion_dates').select('occasion_code,year,starts_on,ends_on,promo_days').order('starts_on').then(function (r) { DX.odLoading = false; DX.odates = r.error ? [] : (r.data || []); if (S.tab === 'dash') view(); }).catch(function () { DX.odLoading = false; DX.odates = []; });
  }
  function dxLeadData(r) {
    var codes = ((DX.data.occasions) || []).map(function (o) { return o.c; });
    var list = dxIn(r.from, r.to, function (o) { return !o.off; });
    return codes.map(function (c) {
      var mine = list.filter(function (o) { return (o.oc || 'not_specified') === c; });
      var lead = mine.map(ltDays).filter(function (x) { return x != null; });
      var mins = mine.map(ltMins).filter(function (x) { return x != null; });
      var wd = [0, 0, 0, 0, 0, 0, 0]; mine.forEach(function (o) { if (o.pd) wd[new Date(o.pd + 'T12:00:00Z').getUTCDay()]++; });
      return { c: c, l: dxOccName(c), n: mine.length, list: mine, lead: lead, mins: mins, wd: wd,
        lb: LT_B.map(function (b) { return lead.filter(function (x) { return x >= b[1] && x <= b[2]; }).length; }),
        pb: PU_B.map(function (b) { return mins.filter(function (x) { return x >= b[1] && x <= b[2]; }).length; }) };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
  }
  function ltBar(k, tot, strong) { var pct = tot ? Math.round(k / tot * 100) : 0; return '<td class="lt-c' + (strong ? ' is-top' : '') + '"><span class="lt-bar" style="width:' + pct + '%"></span><b>' + (k ? pct + '%' : '–') + '</b><small>' + (k ? k : '') + '</small></td>'; }
  function dxLead(r) {
    ltDatesLoad();
    var rows = dxLeadData(r);
    if (!rows.length) return dxSec('lt', 'Lead time and pickup', '', '<p class="ccs-quiet">No orders in this period.</p>');
    var few = function (x) { return x < LT_MIN; };
    // 1. Findings in plain words
    var fnd = [];
    rows.forEach(function (x) {
      if (x.c === 'not_specified' || x.c === 'other') return;
      if (few(x.lead.length)) { fnd.push('<li class="is-few"><b>' + esc(x.l) + '</b>: too few orders to judge (' + x.lead.length + ').</li>'); return; }
      var bi = x.lb.indexOf(Math.max.apply(null, x.lb)), pi = x.pb.indexOf(Math.max.apply(null, x.pb)), wi = x.wd.indexOf(Math.max.apply(null, x.wd));
      fnd.push('<li><b>' + esc(x.l) + '</b>: usually ordered ' + esc(ltDaysTxt(ltMed(x.lead))) + '. ' + Math.round(x.lb[bi] / x.lead.length * 100) + '% order ' + esc(LT_B[bi][0].toLowerCase()) + (bi ? ' ahead' : '') +
        (x.lb[0] ? '; ' + Math.round(x.lb[0] / x.lead.length * 100) + '% on the day' : '') + '. ' +
        (x.mins.length >= LT_MIN ? 'Most collected in the ' + PU_B[pi][0].toLowerCase() + ' (' + PU_B[pi][3] + ')' + (x.wd[wi] ? ', busiest on ' + WD[wi] + 's' : '') + '. ' : '') +
        '<span class="lt-n">Based on ' + x.lead.length + ' orders.</span></li>');
    });
    var h = '<p class="dx-ch">How far ahead each occasion is ordered and when the cakes are collected. Lead time is the days from the order date to the pickup date. Occasions with fewer than ' + LT_MIN + ' orders are marked too few to judge.</p>';
    h += fnd.length ? '<ul class="lt-find">' + fnd.join('') + '</ul>' : '';
    // 2. Lead time by occasion
    h += '<div class="dx-card-h"><h2>How far ahead people order</h2></div><div class="dx-octwrap"><table class="dx-octab lt-tab"><thead><tr><th>Occasion</th><th>Orders</th><th>Usually</th>' + LT_B.map(function (b) { return '<th>' + b[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (x) { var mx = Math.max.apply(null, x.lb); return '<tr' + (few(x.lead.length) ? ' class="is-few"' : '') + '><th scope="row">' + esc(x.l) + '</th><td>' + x.lead.length + (x.lead.length < x.n ? '<small> of ' + x.n + '</small>' : '') + '</td><td>' + (few(x.lead.length) ? 'Too few' : esc(ltDaysTxt(ltMed(x.lead)).replace(' ahead', ''))) + '</td>' + x.lb.map(function (k) { return ltBar(k, x.lead.length, k && k === mx && !few(x.lead.length)); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    // 3. Pickup time of day
    h += '<div class="dx-card-h"><h2>When cakes are collected</h2></div><div class="dx-octwrap"><table class="dx-octab lt-tab"><thead><tr><th>Occasion</th><th>Orders</th>' + PU_B.map(function (b) { return '<th>' + b[0] + '<small>' + b[3] + '</small></th>'; }).join('') + '<th>Busiest day</th></tr></thead><tbody>' +
      rows.map(function (x) { var mx = Math.max.apply(null, x.pb), wi = x.wd.indexOf(Math.max.apply(null, x.wd)); return '<tr' + (few(x.mins.length) ? ' class="is-few"' : '') + '><th scope="row">' + esc(x.l) + '</th><td>' + x.mins.length + '</td>' + x.pb.map(function (k) { return ltBar(k, x.mins.length, k && k === mx && !few(x.mins.length)); }).join('') + '<td>' + (few(x.n) ? 'Too few' : WD[wi] + ' <small>' + x.wd[wi] + '</small>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    // 4. Run-up to dated occasions, year beside year (all history, so years can be compared)
    var od = DX.odates;
    if (!od) h += '<p class="ccs-loading">Loading occasion dates…</p>';
    else {
      var RB = [['On the day', 0, 0], ['1 day before', 1, 1], ['2 days', 2, 2], ['3 days', 3, 3], ['4–7 days', 4, 7], ['8–14 days', 8, 14], ['15+ days', 15, 9999]];
      var dated = {}; od.forEach(function (d) { (dated[d.occasion_code] = dated[d.occasion_code] || []).push(d); });
      var all = DX.data.orders.filter(function (o) { return !o.off && dxMatch(o); });
      var blocks = Object.keys(dated).map(function (c) {
        var yrs = dated[c].map(function (d) {
          var day = d.starts_on, lo = new Date(Date.parse(day + 'T00:00:00Z') - 4 * 86400000).toISOString().slice(0, 10), hi = d.ends_on || new Date(Date.parse(day + 'T00:00:00Z') + 2 * 86400000).toISOString().slice(0, 10);
          var mine = all.filter(function (o) { return (o.oc || 'not_specified') === c && o.pd >= lo && o.pd <= hi; });
          var before = mine.map(function (o) { return o.odok && o.od ? Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse(o.od + 'T00:00:00Z')) / 86400000) : null; }).filter(function (x) { return x != null && x >= 0; });
          return { y: d.year, day: day, promo: d.promo_days, n: mine.length, b: before, cnt: RB.map(function (b) { return before.filter(function (x) { return x >= b[1] && x <= b[2]; }).length; }) };
        }).filter(function (y) { return y.n; });
        return { c: c, l: dxOccName(c), yrs: yrs };
      }).filter(function (x) { return x.yrs.length; });
      h += '<div class="dx-card-h"><h2>The run-up to dated occasions</h2><span>Orders for that occasion, by how many days before the date they were placed. Pickups from 4 days before to 2 days after the date.</span></div>';
      if (!blocks.length) h += '<p class="ccs-quiet">No orders yet for the dated occasions (Mother\'s Day, Father\'s Day, Valentine\'s Day, Christmas and any you add in Settings).</p>';
      blocks.forEach(function (bk) {
        var allB = []; bk.yrs.forEach(function (y) { allB = allB.concat(y.b); });
        var p80 = ltPct(allB, 0.8), tip = few(allB.length) ? 'Too few orders to suggest a start date yet (' + allB.length + ').' : 'Eight in ten orders came within ' + p80 + ' days of the date, so start promoting about ' + (p80 + 7) + ' days before (a week ahead of the main wave).';
        h += '<h3 class="lt-h3">' + esc(bk.l) + '</h3><p class="lt-tip' + (few(allB.length) ? ' is-few' : '') + '">' + esc(tip) + '</p><div class="dx-octwrap"><table class="dx-octab lt-tab"><thead><tr><th>Year</th><th>Date</th><th>Orders</th>' + RB.map(function (b) { return '<th>' + b[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          bk.yrs.map(function (y) { var mx = Math.max.apply(null, y.cnt); return '<tr' + (few(y.b.length) ? ' class="is-few"' : '') + '><th scope="row">' + y.y + '</th><td>' + esc(nice(y.day)) + '</td><td>' + y.n + '</td>' + y.cnt.map(function (k) { return ltBar(k, y.b.length, k && k === mx && !few(y.b.length)); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      });
    }
    // 5. Cake by occasion
    var cx = {}, occs = []; rows.forEach(function (x) { if (occs.indexOf(x.c) < 0) occs.push(x.c); x.list.forEach(function (o) { dxItems(o).forEach(function (i) { var k = i[1] || i[0] || 'Cake'; var e = cx[k] = cx[k] || {}; e[x.c] = (e[x.c] || 0) + (dnum(i[3]) || 1); }); }); });
    var colTot = {}; occs.forEach(function (c) { colTot[c] = Object.keys(cx).reduce(function (s, k) { return s + (cx[k][c] || 0); }, 0); });
    var cakes = Object.keys(cx).sort(function (a, b) { var sa = 0, sb_ = 0; occs.forEach(function (c) { sa += cx[a][c] || 0; sb_ += cx[b][c] || 0; }); return sb_ - sa; });
    var mode = DX.cxo === 'n' ? 'n' : 'p';
    h += '<div class="dx-card-h"><h2>Cake by occasion</h2><span><button type="button" class="ccs-link" data-act="dx-cxo" data-v="' + (mode === 'p' ? 'n' : 'p') + '">' + (mode === 'p' ? 'Show cake counts' : 'Show share of each occasion') + '</button></span></div>' +
      '<p class="dx-ch">' + (mode === 'p' ? 'Each column adds to 100%: the share of that occasion\'s cakes.' : 'Number of cakes.') + ' The top cake for each occasion is highlighted. Columns under ' + LT_MIN + ' cakes are marked too few.</p>' +
      '<div class="dx-octwrap"><table class="dx-octab lt-tab lt-cx"><thead><tr><th>Cake</th>' + occs.map(function (c) { return '<th' + (few(colTot[c]) ? ' class="is-few"' : '') + '>' + esc(dxOccName(c)) + '<small>' + colTot[c] + (few(colTot[c]) ? ', too few' : '') + '</small></th>'; }).join('') + '</tr></thead><tbody>' +
      cakes.map(function (k) { return '<tr><th scope="row">' + esc(k) + '</th>' + occs.map(function (c) { var v = cx[k][c] || 0, top = v && !few(colTot[c]) && cakes.every(function (k2) { return (cx[k2][c] || 0) <= v; }); return '<td class="lt-c' + (top ? ' is-top' : '') + (few(colTot[c]) ? ' is-few' : '') + '">' + (v ? (mode === 'p' ? Math.round(v / colTot[c] * 100) + '%' : v) : '–') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    h += '<div class="dx-octools"><button type="button" class="ccs-btn ccs-ghost" data-act="dx-lead-csv">Download as a spreadsheet (CSV)</button></div>';
    h += '<ul class="dx-rules"><li><b>Order date</b>: when the order was placed (website form time, or the date staff took it). Records with no reliable order date are left out of lead time, not guessed.</li><li><b>Cancelled orders</b> are left out. Filters at the top (period, channel, cake) apply, except the run-up, which always shows every year so years can be compared.</li></ul>';
    var top = rows.filter(function (x) { return x.c !== 'not_specified' && !few(x.lead.length); })[0];
    return dxSec('lt', 'Lead time and pickup', top ? esc(top.l) + ': usually ' + esc(ltDaysTxt(ltMed(top.lead))) : '', '<div class="lt-wrap">' + h + '</div>');
  }
  function dxLeadExport() {
    var r = dxRange(), rows = dxLeadData(r);
    var lines = [['Corner Café cakes: lead time and pickup'], ['Period', r.all ? 'All time' : r.from + ' to ' + r.to], [], ['Order', 'Occasion', 'Order date', 'Pickup date', 'Pickup time', 'Days ahead', 'Pickup weekday', 'Channel', 'Cakes']];
    rows.forEach(function (x) { x.list.forEach(function (o) { var d = ltDays(o); lines.push([o.r, x.l, o.odok ? o.od : '', o.pd, o.pt ? String(o.pt).slice(0, 5) : '', d == null ? '' : d, o.pd ? WD[new Date(o.pd + 'T12:00:00Z').getUTCDay()] : '', SOURCE_LABEL[o.src] || o.src, dxItems(o).map(function (i) { return (i[1] || i[0]) + (i[2] ? ' ' + i[2] + ' inch' : ''); }).join('; ')]); }); });
    var csv = lines.map(function (l) { return l.map(dxCsv).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'corner-cafe-lead-time-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Lead time downloaded');
  }
  function dxOccExport() {
    var r = dxRange(), rows = dxOccRows(r), ly = dxLastYear(r), f = DX.f;
    var lines = [['Corner Café cakes: occasion analysis'], ['Period', r.all ? 'All time' : r.from + ' to ' + r.to], ['Counted by', f.b === 'o' ? 'Order date' : 'Pickup date'], ['Channel', f.ch === 'all' ? 'All channels' : SOURCE_LABEL[f.ch] || f.ch], ['Cake', f.prod === 'all' ? 'All cakes' : f.prod], [],
      ['Occasion', 'Orders placed', 'Completed sales', 'Sales value', 'Average sale', 'Same dates last year', 'Online sales', 'Walk-in and phone sales', 'Returning customers', 'Cancelled', 'Top cake']];
    rows.forEach(function (x) { lines.push([x.l, x.pl.length, x.sum.n, x.sum.v.toFixed(2), x.sum.n ? (x.sum.v / x.sum.n).toFixed(2) : '', ly ? x.ly.v.toFixed(2) : '', x.on.length, x.walk.length, x.back.length, x.off.length, x.top]); });
    lines.push([], ['Order', 'Occasion', 'Occasion detail', 'Campaign', 'Order date', 'Pickup date', 'Channel', 'Status', 'Cakes', 'Value', 'Refunds', 'Cake details']);
    rows.forEach(function (x) { x.pl.forEach(function (o) { lines.push([o.r, x.l, o.ocd || '', o.cmp || '', o.odok ? o.od : '', o.pd, SOURCE_LABEL[o.src] || o.src, regLabel(o), dxCakes(o), dxValue(o).toFixed(2), o.refund.toFixed(2), dxItems(o).map(function (i) { return (i[1] || i[0]) + (i[2] ? ' ' + i[2] + ' inch' : ''); }).join('; ')]); }); });
    var csv = lines.map(function (l) { return l.map(dxCsv).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'corner-cafe-cake-occasions-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Occasion analysis downloaded');
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
    else if (a === 'dx-occ-csv') dxOccExport();
    else if (a === 'dx-lead-csv') dxLeadExport();
    else if (a === 'dx-cxo') { DX.cxo = v; view(); }
    else if (a === 'dx-psort') { DX.psort = v; dxKeep(); view(); }
    else if (a === 'dx-year') { DX.year = v; dxKeep(); view(); }
    else if (a === 'dx-metric') { DX.metric = v; view(); }
    else if (a === 'dx-tm') { DX.tm = v; view(); }
    else if (a === 'dx-gapmore') { DX.gapOpen = !DX.gapOpen; view(); }
    else if (a === 'dx-unit') { DX.unit = v; view(); }
    else if (a === 'dx-filters') { DX.fopen = !DX.fopen; view(); }
    else if (a === 'dx-table') { DX.table = !DX.table; view(); }
    else if (a === 'dx-drill') { var dr = DX.drills[v]; if (!dr) return; S.sheet = { type: 'dash', drill: dr }; S.panel = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  }
  function dxKeep() { root.querySelectorAll('[data-dxsec]').forEach(function (el) { DX['o' + el.dataset.dxsec] = el.open; }); }
  function dashChange(t) {
    var f = DX.f, k = t.dataset.dx; dxKeep();
    if (k === 'dx-p') { f.p = t.value; DX.unit = null; if (f.p === 'c' && !f.from) { f.to = today(); f.from = dxMonthStart(f.to); } }
    else if (k === 'dx-from') f.from = t.value; else if (k === 'dx-to') f.to = t.value;
    else if (k === 'dx-b') f.b = t.value; else if (k === 'dx-prod') f.prod = t.value; else if (k === 'dx-ch') f.ch = t.value; else if (k === 'dx-occ') f.occ = t.value; else if (k === 'dx-st') { f.st = t.value; }
    view();
  }
