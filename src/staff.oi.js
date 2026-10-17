  // ---------- Occasion intelligence (17 Oct 2026, Roneel's brief "Cake Occasion, Month and Order Lead Time Intelligence") ----------
  // Three connected dimensions: occasion, month (by pickup date or by order date) and lead time (calendar days from order to
  // pickup, worked out per ORDER, never per cake). Its own filters; clicking a cell, a band or a row filters the other charts.
  // Default is valid orders (confirmed or completed); pending and cancelled can be looked at separately. Orders without the
  // date a chart needs are left out of that chart and counted under Data gaps, never guessed.
  var OI_B = [['0–2 days', 0, 2], ['3–7 days', 3, 7], ['8–14 days', 8, 14], ['15–21 days', 15, 21], ['22+ days', 22, 99999]];
  var OI_ODD = 180;  // ordered more than this many days ahead: treated as unusual and kept out of lead-time figures
  var OI_CURVE = [30, 21, 14, 7, 3, 0];
  var OI_ST = [['valid', 'Confirmed and completed'], ['pending', 'Not yet confirmed'], ['cancelled', 'Cancelled'], ['all', 'All orders']];
  function oiS() { DX.oi = DX.oi || { y: 'all', oc: 'all', m: 'all', cat: 'all', st: 'valid', basis: 'p', meas: 'o', band: -1 }; return DX.oi; }
  function oiStatus(o, st) {
    var valid = !o.off && (o.sale || o.st === 'confirmed' || o.st === 'completed');
    return st === 'all' || (st === 'valid' ? valid : st === 'cancelled' ? !!o.off : !o.off && !valid);
  }
  function oiLead(o) { if (!o.odok || !o.od || !o.pd) return null; return Math.round((Date.parse(o.pd + 'T00:00:00Z') - Date.parse(o.od + 'T00:00:00Z')) / 864e5); }
  function oiOk(n) { return n != null && n >= 0 && n <= OI_ODD; }
  function oiBand(n) { if (!oiOk(n)) return -1; for (var i = 0; i < OI_B.length; i++) if (n >= OI_B[i][1] && n <= OI_B[i][2]) return i; return -1; }
  function oiDate(o, b) { return b === 'p' ? (o.pd || null) : (o.odok && o.od ? o.od : null); }
  function oiItems(o, cat) { return (o.it || []).filter(function (i) { return cat === 'all' || i[0] === cat; }); }
  function oiVal(o, cat) { return cat === 'all' ? dnum(o.net != null ? o.net : o.tot) : oiItems(o, cat).reduce(function (s, i) { return s + dnum(i[4]) * (dnum(i[3]) || 1); }, 0); }
  function oiCakes(o, cat) { return oiItems(o, cat).reduce(function (s, i) { return s + (dnum(i[3]) || 1); }, 0) || (cat === 'all' ? 1 : 0); }
  function oiOcc(o) { return o.oc || 'not_specified'; }
  function oiData() {
    var s = oiS(), gaps = { noPick: [], noOd: [], neg: [], odd: [], rev: [] };
    var base = DX.data.orders.filter(function (o) { return oiStatus(o, s.st) && (s.cat === 'all' || oiItems(o, s.cat).length); });
    base.forEach(function (o) {
      var n = oiLead(o);
      if (!o.pd) gaps.noPick.push(o);
      if (!(o.odok && o.od)) gaps.noOd.push(o);
      if (n != null && n < 0) gaps.neg.push(o);
      if (n != null && n > OI_ODD) gaps.odd.push(o);
      if (o.rev > 0) gaps.rev.push(o);
    });
    var inYear = base.filter(function (o) { var d = oiDate(o, s.basis); return d && (s.y === 'all' || d.slice(0, 4) === s.y); });
    var f = {
      oc: function (o) { return s.oc === 'all' || oiOcc(o) === s.oc; },
      m: function (o) { return s.m === 'all' || +oiDate(o, s.basis).slice(5, 7) === +s.m; },
      b: function (o) { return s.band < 0 || oiBand(oiLead(o)) === s.band; }
    };
    var occ = {}; inYear.forEach(function (o) { var c = oiOcc(o); occ[c] = (occ[c] || 0) + 1; });
    var occs = Object.keys(occ).sort(function (a, b) { return (a === 'not_specified') - (b === 'not_specified') || occ[b] - occ[a]; });
    return { s: s, base: base, gaps: gaps, inYear: inYear, f: f, occs: occs,
      sel: inYear.filter(function (o) { return f.oc(o) && f.m(o) && f.b(o); }) };
  }
  function oiMeasure(list, meas, cat) {
    if (meas === 'v') return list.reduce(function (t, o) { return t + oiVal(o, cat); }, 0);
    if (meas === 'c') return list.reduce(function (t, o) { return t + oiCakes(o, cat); }, 0);
    return list.length;
  }
  function oiFmt(meas) { return meas === 'v' ? m0 : int; }
  function oiShade(v, max) { if (!v || !max) return ''; var a = 0.1 + 0.8 * v / max; return 'background:rgba(75,99,57,' + a.toFixed(2) + ');color:' + (a > 0.5 ? '#fff' : 'var(--ccs-ink)'); }
  // ----- the view -----
  function oiView() {
    var X = oiData(), s = X.s, cats = [], yrs = [];
    DX.data.orders.forEach(function (o) { (o.it || []).forEach(function (i) { if (i[0] && cats.indexOf(i[0]) < 0) cats.push(i[0]); }); var d = oiDate(o, s.basis); if (d && yrs.indexOf(d.slice(0, 4)) < 0) yrs.push(d.slice(0, 4)); });
    cats.sort(); yrs.sort().reverse();
    var sel = function (id, label, opts, cur) { return '<label class="ccs-field oi-f"><span class="ccs-label">' + label + '</span><select class="ccs-input" data-dx="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; };
    var h = '<div class="oi-filters">' +
      sel('oi-y', 'Year', [['all', 'All years']].concat(yrs.map(function (y) { return [y, y]; })), s.y) +
      sel('oi-oc', 'Occasion', [['all', 'All occasions']].concat(X.occs.map(function (c) { return [c, dxOccName(c)]; })), s.oc) +
      sel('oi-m', 'Month', [['all', 'All months']].concat(MON.map(function (m, i) { return [String(i + 1), m]; })), s.m) +
      sel('oi-cat', 'Cake', [['all', 'All cakes']].concat(cats.map(function (c) { return [c, c]; })), s.cat) +
      sel('oi-st', 'Orders', OI_ST, s.st) +
      sel('oi-basis', 'Month by', [['p', 'Pickup date'], ['o', 'Order date']], s.basis) + '</div>';
    var chips = [];
    if (s.oc !== 'all') chips.push(['oc', dxOccName(s.oc)]);
    if (s.m !== 'all') chips.push(['m', MON[+s.m - 1]]);
    if (s.band >= 0) chips.push(['band', OI_B[s.band][0] + ' ahead']);
    if (chips.length) h += '<div class="oi-chips"><span>Showing</span>' + chips.map(function (c) { return '<button type="button" class="oi-chip" data-act="dx-oi-clr" data-v="' + c[0] + '" aria-label="Remove ' + esc(c[1]) + '">' + esc(c[1]) + ' <b aria-hidden="true">×</b></button>'; }).join('') + '<button type="button" class="ccs-link" data-act="dx-oi-clr" data-v="all">Clear all</button></div>';
    if (!X.inYear.length) return h + '<section class="dx-card"><p class="an-none">No orders match these filters.</p></section>' + oiGaps(X);
    h += oiKpis(X);
    h += anCard('Occasion by month', oiHeat(X), 'oi-wide');
    h += '<div class="oi-two">' + anCard('How far ahead cakes are ordered', oiDist(X)) + anCard('Booking curve', oiCurve(X)) + '</div>';
    h += anCard('Occasion by lead time', oiMatrix(X), 'oi-wide');
    h += '<div class="oi-two">' + anCard('Year on year, by event date', oiYoy(X)) + anCard('What the data shows', oiInsights(X)) + '</div>';
    return h + oiGaps(X);
  }
  function oiKpis(X) {
    var s = X.s, l = X.sel, leads = l.map(oiLead).filter(oiOk), bands = OI_B.map(function () { return 0; });
    leads.forEach(function (n) { bands[oiBand(n)]++; });
    var bi = bands.indexOf(Math.max.apply(null, bands)), mo = {}; l.forEach(function (o) { var d = oiDate(o, s.basis); if (d) { var k = d.slice(5, 7); mo[k] = (mo[k] || 0) + 1; } });
    var pk = Object.keys(mo).sort(function (a, b) { return mo[b] - mo[a]; })[0];
    var avg = leads.length ? leads.reduce(function (a, b) { return a + b; }, 0) / leads.length : null, med = ltMed(leads);
    var k = function (lbl, val, sub, list, t) { return dxTap(list, t || lbl, '<span class="ccs-kpi-l">' + lbl + '</span><b class="ccs-kpi-n">' + val + '</b><span class="ccs-kpi-s">' + sub + '</span>', 'ccs-kpi dx-kpi'); };
    var day = function (n) { return n == null ? 'No dates' : (Math.round(n * 10) / 10) + (n === 1 ? ' day' : ' days'); };
    return '<div class="oi-kpis">' +
      k('Orders', int(l.length), int(oiMeasure(l, 'c', s.cat)) + ' cakes', l, 'Orders') +
      k('Revenue', m0(oiMeasure(l, 'v', s.cat)), 'Including VAT', l, 'Orders') +
      k('Average lead time', day(avg), int(leads.length) + ' orders with dates') +
      k('Median lead time', day(med), 'Half order sooner') +
      k('Most common', leads.length ? OI_B[bi][0] : 'No dates', leads.length ? Math.round(bands[bi] / leads.length * 100) + '% of orders' : '&nbsp;') +
      k('Peak month', pk ? MON[+pk - 1] : 'None', pk ? int(mo[pk]) + ' orders' : '&nbsp;') + '</div>';
  }
  // 1. Occasion × month: one row per occasion, darker = more; a cell sets occasion and month
  function oiHeat(X) {
    var s = X.s, src = X.inYear.filter(X.f.b), fmt = oiFmt(s.meas), cells = {}, max = 0, rows = X.occs.slice(0, 12);
    rows.forEach(function (c) { cells[c] = MON.map(function (x, i) { var list = src.filter(function (o) { return oiOcc(o) === c && +oiDate(o, s.basis).slice(5, 7) === i + 1; }); var v = oiMeasure(list, s.meas, s.cat); if (v > max) max = v; return { v: v, list: list }; }); });
    var tg = function (k, l) { return '<button type="button" class="oi-tg" data-act="dx-oi-meas" data-v="' + k + '" aria-pressed="' + (s.meas === k) + '">' + l + '</button>'; };
    var head = '<div class="oi-bar">' + tg('o', 'Orders') + tg('c', 'Cakes') + tg('v', 'Revenue') + '<span>by ' + (s.basis === 'p' ? 'pickup' : 'order') + ' month' + (s.y === 'all' ? ', all years' : ', ' + s.y) + '</span></div>';
    return head + '<div class="oi-scroll"><table class="oi-heat"><thead><tr><th scope="col">Occasion</th>' + MON.map(function (m, i) { return '<th scope="col"' + (s.m === String(i + 1) ? ' class="is-on"' : '') + '>' + m + '</th>'; }).join('') + '<th scope="col">Total</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var tot = cells[c].reduce(function (t, x) { return t + x.v; }, 0);
        return '<tr' + (s.oc === c ? ' class="is-on"' : '') + '><th scope="row"><button type="button" class="oi-rowbtn" data-act="dx-oi-cell" data-v="' + esc(c) + '|all">' + esc(dxOccName(c)) + '</button></th>' +
          cells[c].map(function (x, i) { var on = s.oc === c && s.m === String(i + 1); return '<td>' + (x.v ? '<button type="button" class="oi-cell' + (on ? ' is-on' : '') + '" style="' + oiShade(x.v, max) + '" data-act="dx-oi-cell" data-v="' + esc(c) + '|' + (i + 1) + '" title="' + esc(dxOccName(c) + ', ' + MON[i] + ': ' + fmt(x.v)) + '">' + fmt(x.v) + '</button>' : '<span class="oi-nil">–</span>') + '</td>'; }).join('') +
          '<td class="oi-tot">' + fmt(tot) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (X.occs.length > rows.length ? '<p class="an-none">' + (X.occs.length - rows.length) + ' smaller occasions not shown.</p>' : '');
  }
  // 2. Lead time distribution: a band sets the lead-time filter for the other charts
  function oiDist(X) {
    var s = X.s, list = X.inYear.filter(function (o) { return X.f.oc(o) && X.f.m(o); }), n = 0, rows = OI_B.map(function (b, i) { return { i: i, l: b[0], list: [] }; });
    list.forEach(function (o) { var b = oiBand(oiLead(o)); if (b >= 0) { rows[b].list.push(o); n++; } });
    if (!n) return '<p class="an-none">No orders with both an order date and a pickup date.</p>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.list.length; }));
    return '<div class="oi-dist">' + rows.map(function (r) {
      var v = r.list.length, on = s.band === r.i;
      return '<button type="button" class="oi-drow' + (on ? ' is-on' : '') + (s.band >= 0 && !on ? ' is-dim' : '') + '" data-act="dx-oi-band" data-v="' + r.i + '" aria-pressed="' + on + '"><span class="oi-dl">' + r.l + '</span><span class="oi-dt"><i style="width:' + (max ? Math.round(v / max * 100) : 0) + '%"></i></span><b>' + int(v) + '</b><em>' + Math.round(v / n * 100) + '%</em></button>';
    }).join('') + '</div><p class="an-none">' + int(n) + ' orders. Tap a band to filter.</p>';
  }
  // 3. Booking curve: share of each occasion's orders already placed 30, 21, 14, 7, 3 and 0 days before pickup
  function oiCurve(X) {
    var s = X.s, base = X.inYear.filter(X.f.m), pick = s.oc !== 'all' ? [s.oc] : X.occs.filter(function (c) { return c !== 'not_specified'; }).slice(0, 3);
    var series = pick.map(function (c, k) {
      var leads = base.filter(function (o) { return oiOcc(o) === c; }).map(oiLead).filter(oiOk);
      return { c: c, n: leads.length, col: AN_PAL[k], pts: OI_CURVE.map(function (d) { return leads.length ? leads.filter(function (x) { return x >= d; }).length / leads.length * 100 : 0; }) };
    }).filter(function (x) { return x.n; });
    if (!series.length) return '<p class="an-none">No occasion orders with both dates.</p>';
    var W = 560, H = 230, L = 48, R = 36, T = 16, B = 34, x = function (i) { return L + i * (W - L - R) / (OI_CURVE.length - 1); }, y = function (p) { return T + (100 - p) / 100 * (H - T - B); };
    var grid = [0, 50, 100].map(function (p) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(p) + '" y2="' + y(p) + '" class="oi-grid"/><text x="' + (L - 8) + '" y="' + (y(p) + 5) + '" text-anchor="end" class="oi-ax">' + p + '%</text>'; }).join('');
    var xs = OI_CURVE.map(function (d, i) { return '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="oi-ax">' + (d ? d + 'd' : 'Pickup') + '</text>'; }).join('');
    var lines = series.map(function (sr) {
      return '<polyline fill="none" stroke="' + sr.col + '" stroke-width="2.5" stroke-linejoin="round" points="' + sr.pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p).toFixed(1); }).join(' ') + '"/>' +
        sr.pts.map(function (p, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p).toFixed(1) + '" r="4.5" fill="' + sr.col + '" stroke="#fff" stroke-width="2"><title>' + esc(dxOccName(sr.c)) + ': ' + Math.round(p) + '% ordered ' + (OI_CURVE[i] ? OI_CURVE[i] + ' or more days before pickup' : 'by pickup') + '</title></circle>'; }).join('');
    }).join('');
    var svg = '<svg class="oi-curve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Booking curve">' + grid + xs + lines + '</svg>';
    var tab = '<table class="oi-ctab"><thead><tr><th scope="col">Ordered by</th>' + OI_CURVE.map(function (d) { return '<th scope="col">' + (d ? d + 'd' : 'Pickup') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      series.map(function (sr) { return '<tr><th scope="row"><i style="background:' + sr.col + '"></i>' + esc(dxOccName(sr.c)) + ' <span>(' + int(sr.n) + ')</span></th>' + sr.pts.map(function (p) { return '<td>' + Math.round(p) + '%</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    return svg + '<div class="oi-scroll">' + tab + '</div>';
  }
  // 4. Occasion × lead time: counts, shaded within each row; a cell sets occasion and band
  function oiMatrix(X) {
    var s = X.s, src = X.inYear.filter(X.f.m), rows = X.occs.slice(0, 12);
    return '<div class="oi-scroll"><table class="oi-heat oi-mx"><thead><tr><th scope="col">Occasion</th>' + OI_B.map(function (b, i) { return '<th scope="col"' + (s.band === i ? ' class="is-on"' : '') + '>' + b[0] + '</th>'; }).join('') + '<th scope="col">Median</th><th scope="col">Orders</th></tr></thead><tbody>' +
      rows.map(function (c) {
        var leads = src.filter(function (o) { return oiOcc(o) === c; }).map(oiLead).filter(oiOk), cnt = OI_B.map(function () { return 0; });
        leads.forEach(function (n) { cnt[oiBand(n)]++; });
        var mx = Math.max.apply(null, cnt);
        return '<tr' + (s.oc === c ? ' class="is-on"' : '') + '><th scope="row">' + esc(dxOccName(c)) + '</th>' + cnt.map(function (v, i) {
          return '<td>' + (v ? '<button type="button" class="oi-cell' + (s.oc === c && s.band === i ? ' is-on' : '') + '" style="' + oiShade(v, mx) + '" data-act="dx-oi-mx" data-v="' + esc(c) + '|' + i + '" title="' + esc(dxOccName(c) + ', ' + OI_B[i][0] + ': ' + v + ' orders, ' + Math.round(v / leads.length * 100) + '%') + '">' + int(v) + '</button>' : '<span class="oi-nil">–</span>') + '</td>';
        }).join('') + '<td class="oi-tot">' + (leads.length ? (Math.round(ltMed(leads) * 10) / 10) + ' days' : '–') + '</td><td class="oi-tot">' + int(leads.length) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  // 5. Year on year for occasions with a date each year (Settings, Occasions): orders tagged for the occasion, by the event's year
  function oiYoy(X) {
    var s = X.s, od = DX.odates || [], t = today(), codes = [];
    od.forEach(function (d) { if (codes.indexOf(d.occasion_code) < 0 && X.base.some(function (o) { return oiOcc(o) === d.occasion_code; })) codes.push(d.occasion_code); });
    if (s.oc !== 'all') codes = codes.filter(function (c) { return c === s.oc; });
    if (!od.length) return '<p class="an-none">' + (DX.odLoading ? 'Loading occasion dates…' : 'No occasion dates yet.') + '</p>' + oiSet();
    if (!codes.length) return '<p class="an-none">No dated occasions with orders' + (s.oc !== 'all' ? ' for ' + esc(dxOccName(s.oc)) : '') + '.</p>' + oiSet();
    var rows = codes.slice(0, 5).map(function (c) {
      var ev = od.filter(function (d) { return d.occasion_code === c; }).sort(function (a, b) { return a.year - b.year; }).slice(-3);
      return { c: c, ev: ev.map(function (d) {
        var list = X.base.filter(function (o) { return oiOcc(o) === c && o.pd && o.pd.slice(0, 4) === String(d.year); });
        var before = list.map(function (o) { return o.odok && o.od ? Math.round((Date.parse(d.starts_on + 'T00:00:00Z') - Date.parse(o.od + 'T00:00:00Z')) / 864e5) : null; }).filter(function (n) { return n != null && n >= 0 && n <= OI_ODD; });
        return { y: d.year, on: d.starts_on, n: list.length, list: list, up: d.starts_on > t, med: ltMed(before) };
      }) };
    });
    var max = 1; rows.forEach(function (r) { r.ev.forEach(function (e) { if (e.n > max) max = e.n; }); });
    return '<div class="oi-yoy">' + rows.map(function (r) {
      var done = r.ev.filter(function (e) { return !e.up; }), a = done[done.length - 1], b = done[done.length - 2];
      var ch = a && b && b.n ? Math.round((a.n - b.n) / b.n * 100) : null;
      return '<div class="oi-yg"><div class="oi-yh"><b>' + esc(dxOccName(r.c)) + '</b>' + (ch != null ? '<span class="oi-ch ' + (ch >= 0 ? 'is-up' : 'is-down') + '">' + (ch >= 0 ? '+' : '') + ch + '% on ' + b.y + '</span>' : '') + '</div>' +
        r.ev.map(function (e, k) {
          return dxTap(e.list, dxOccName(r.c) + ' ' + e.y, '<span class="oi-yl">' + e.y + '<small>' + esc(nice(e.on)) + '</small></span><span class="oi-dt"><i style="width:' + Math.round(e.n / max * 100) + '%;background:' + AN_PAL[k] + '"></i></span><b>' + int(e.n) + '</b><em>' + (e.up ? 'Upcoming' : e.med != null ? (Math.round(e.med)) + ' days before' : '') + '</em>', 'oi-yrow');
        }).join('') + '</div>';
    }).join('') + '</div><p class="an-none">Orders for each occasion, by the year of its date. Days before: the middle order, counted back from the event date.</p>' + oiSet();
  }
  function oiSet() { return canSettings() ? '<button type="button" class="ccs-link oi-set" data-tab="settings">Manage occasions and their dates in Settings</button>' : ''; }
  // 6. Insights: only patterns with at least 10 orders behind them; each with its evidence and a possible action
  function oiInsights(X) {
    var s = X.s, out = [], all = X.inYear.filter(X.f.b), conf = function (n) { return n >= 30 ? 'High confidence' : 'Medium confidence'; };
    var best = null; X.occs.forEach(function (c) { if (c === 'not_specified') return; for (var m = 1; m <= 12; m++) { var n = all.filter(function (o) { return oiOcc(o) === c && +oiDate(o, s.basis).slice(5, 7) === m; }).length; if (!best || n > best.n) best = { c: c, m: m, n: n }; } });
    if (best) { var occN = all.filter(function (o) { return oiOcc(o) === best.c; }).length, avgM = occN / 12; if (best.n < 10 || best.n < avgM * 1.5) best = null; }
    if (best) out.push(['Busiest: ' + dxOccName(best.c) + ' in ' + MON[best.m - 1], int(best.n) + ' orders, ' + (Math.round(best.n / avgM * 10) / 10) + ' times its usual month', 'Plan production and staff for ' + MON[best.m - 1], conf(best.n)]);
    var top = X.occs.filter(function (c) { return c !== 'not_specified'; })[0];
    if (top) { var leads = X.inYear.filter(function (o) { return oiOcc(o) === top; }).map(oiLead).filter(oiOk), p75 = ltPct(leads, 0.75);
      if (leads.length >= 10 && p75 != null) out.push(['3 in 4 ' + dxOccName(top) + ' orders arrive within ' + p75 + ' days of pickup', int(leads.length) + ' orders with both dates', 'Start ' + dxOccName(top) + ' promotion ' + (p75 + 7) + ' days before', conf(leads.length)]); }
    var ld = X.inYear.filter(function (o) { return X.f.oc(o) && X.f.m(o); }).map(oiLead).filter(oiOk), short = ld.filter(function (n) { return n <= 2; }).length;
    if (ld.length >= 10 && short / ld.length >= 0.25) out.push([Math.round(short / ld.length * 100) + '% of orders are for pickup within 2 days', int(short) + ' of ' + int(ld.length) + ' orders', 'Keep cakes ready to finish for short-notice orders', conf(ld.length)]);
    if (!out.length) return '<p class="an-none">Not enough orders for a reliable pattern with these filters (needs 10 or more).</p>';
    return '<ul class="oi-ins">' + out.map(function (x) { return '<li><b>' + esc(x[0]) + '</b><span class="an-chips"><span>' + esc(x[1]) + '</span><span>' + esc(x[3]) + '</span></span><span class="oi-act">Possible action: ' + esc(x[2]) + '</span></li>'; }).join('') + '</ul>';
  }
  // Data gaps: every order a chart had to leave out, in one row, each opening the orders
  function oiGaps(X) {
    var g = X.gaps, items = [['No order date', g.noOd, 'Left out of lead times and order-month charts'], ['No pickup date', g.noPick, 'Left out of every chart'], ['Pickup before order', g.neg, 'Dates look wrong'], ['Over ' + OI_ODD + ' days ahead', g.odd, 'Left out of lead times'], ['Date changed after ordering', g.rev, 'Counted at the latest pickup date']].filter(function (x) { return x[1].length; });
    if (!items.length) return '';
    return '<section class="dx-card oi-gaps" aria-label="Data gaps"><h3 class="an-ct">Data gaps</h3><div class="oi-gapg">' + items.map(function (x) { return dxTap(x[1], x[0], '<b>' + int(x[1].length) + '</b><span>' + esc(x[0]) + '</span><em>' + esc(x[2]) + '</em>', 'oi-gap'); }).join('') + '</div></section>';
  }
  function oiChange(k, v) {
    var s = oiS();
    if (k === 'oi-y') s.y = v; else if (k === 'oi-oc') s.oc = v; else if (k === 'oi-m') s.m = v; else if (k === 'oi-cat') s.cat = v; else if (k === 'oi-st') s.st = v; else if (k === 'oi-basis') s.basis = v;
  }
  function oiAct(a, v) {
    var s = oiS(), p = String(v || '').split('|');
    if (a === 'dx-oi-cell') { var same = s.oc === p[0] && s.m === p[1]; s.oc = same ? 'all' : p[0]; s.m = same ? 'all' : p[1]; }
    else if (a === 'dx-oi-mx') { var same2 = s.oc === p[0] && s.band === +p[1]; s.oc = same2 ? 'all' : p[0]; s.band = same2 ? -1 : +p[1]; }
    else if (a === 'dx-oi-band') s.band = s.band === +v ? -1 : +v;
    else if (a === 'dx-oi-meas') s.meas = v;
    else if (a === 'dx-oi-clr') { if (v === 'oc' || v === 'all') s.oc = 'all'; if (v === 'm' || v === 'all') s.m = 'all'; if (v === 'band' || v === 'all') s.band = -1; }
    view();
  }
