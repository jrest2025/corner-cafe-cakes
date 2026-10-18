  // ---------- business dashboard (17 Oct 2026, Roneel's brief "Intelligent cake business dashboard") ----------
  // Progressive disclosure on top of the register dashboard above (same data, same filters, same drill-downs):
  // Level 1 the Overview (four figures, one chart, what needs attention, up to three opportunities);
  // Level 2 the sections (Sales, Profitability, Occasions, Products, Customers, Orders, Finance, Operations, Forecast,
  // Data readiness); Level 3 the order lists every figure opens. No figure is invented: where the data cannot support a
  // number (cake costs, tax), the dashboard says what is missing and who can supply it.
  var BI_TEMPLATE = 'CC-DATA-REQ-1';
  // Cake prices include VAT (Roneel, 17 Oct 2026). Fiji's standard rate by date: 12.5% from 1 Aug 2025, 15% from 1 Aug 2023,
  // 9% before. Each sale uses the rate on its own date, so past sales are not restated at today's rate.
  var BI_VAT = [['2025-08-01', 0.125], ['2023-08-01', 0.15], ['0000-01-01', 0.09]];
  function biVat(iso) { for (var i = 0; i < BI_VAT.length; i++) if ((iso || '') >= BI_VAT[i][0]) return BI_VAT[i][1]; return BI_VAT[BI_VAT.length - 1][1]; }
  function biExVat(list) { return list.reduce(function (s, o) { return s + dxValue(o) / (1 + biVat(o.pd)); }, 0); }
  function biOwed(list) { return list.reduce(function (s, o) { return s + dnum(o.bal); }, 0); }
  function biConfirmed(list) { return list.filter(function (o) { return !o.off && (o.sale || o.st === 'confirmed' || o.st === 'completed'); }); }
  function biGo(sec, label) { return '<button type="button" class="ccs-link bi-go" data-act="dx-bi-go" data-v="' + sec + '">' + esc(label) + '</button>'; }
  function biCard(id, title, note, body, cls) { return '<section class="dx-card ' + (cls || '') + '" aria-label="' + esc(title) + '"><div class="dx-card-h"><h2>' + esc(title) + '</h2>' + (note ? '<span>' + note + '</span>' : '') + '</div>' + body + '</section>'; }
  function biNoCost() { return !(DX.data.costs && DX.data.costs.length); }
  // ----- Level 1: the Overview -----
  function biOverview(r, cur, cs, ps, got, pgot, owing, up) {
    var bk = ovBuckets(r, got.length), cg = biConfirmed(got), pcg = pgot ? biConfirmed(pgot) : null, owed = biOwed(owing);
    ltDatesLoad();
    var gp = '<button type="button" class="ov-kpi dx-tap bi-kpi-gp" data-act="dx-bi-go" data-v="pf"><span class="ov-kh">' + ovIcon('money') + '<span class="ov-kl">Gross profit</span></span>' +
      '<b class="ov-kv bi-needs">Cost data required</b><span class="ov-kd is-none">&nbsp;</span><span class="ov-ks">No cake costs recorded yet</span></button>';
    var h = '<div class="ov-kpis bi-kpis">' +
      ovKpi('money', 'Net cake sales', m0(cs.v), ovDelta(cs.v, ps ? ps.v : null), 'Including VAT · ' + m0(biExVat(cur)) + ' without VAT', bk.map(function (x) { return x.s.v; }), cur, 'Completed sales', ps ? m0(ps.v) : '') +
      gp +
      ovKpi('done', 'Confirmed orders', int(cg.length), ovDelta(cg.length, pcg ? pcg.length : null), 'Enquiries left out', bk.map(function (x) { return biConfirmed(x.got).length; }), cg, 'Confirmed orders', pcg ? int(pcg.length) : '') +
      ovKpi('avg', 'Outstanding payments', m0(owed), { t: '', c: '' }, owing.length ? int(owing.length) + (owing.length === 1 ? ' order still owes money' : ' orders still owe money') : 'Nothing owed', [], owing, 'Orders with money still owed', '') +
      '</div>';
    var T = function (x, k) { return x.replace('class="dx-card', 'class="dx-card ov-k-' + k); };
    h += '<div class="bi-ov-trend">' + T(ovTrend(bk, r), 'trend') + '</div>';
    h += anCharts(cur, got);
    // Operational attention and action prompts belong in Today, not Analytics Overview.
    // Keep overview exclusively for measurement, trends, comparisons and analysis.
    return h;
  }
  // Up to three opportunities, each worked out from records and opening them
  function biOpps(r, cur, up) {
    var out = [], t = today();
    // 1. the next dated occasion in the next 60 days, with last year's orders for it
    var od = DX.odates || [], nx = od.filter(function (d) { return d.starts_on >= t && d.starts_on <= addDays(t, 60); }).sort(function (a, b) { return a.starts_on < b.starts_on ? -1 : 1; })[0];
    if (nx) {
      var prev = od.filter(function (d) { return d.occasion_code === nx.occasion_code && d.year === nx.year - 1; })[0], ly = [];
      if (prev) { var lo = addDays(prev.starts_on, -4), hi = prev.ends_on || addDays(prev.starts_on, 2); ly = DX.data.orders.filter(function (o) { return !o.off && (o.oc || 'not_specified') === nx.occasion_code && o.pd >= lo && o.pd <= hi; }); }
      var days = daysBetween(t, nx.starts_on), lead = ly.map(function (o) { return o.odok && o.od ? daysBetween(o.od, prev.starts_on) : null; }).filter(function (x) { return x != null && x >= 0; });
      var p80 = lead.length >= 5 ? ltPct(lead, 0.8) : null, start = p80 != null ? addDays(nx.starts_on, -(p80 + 7)) : null;
      out.push(dxTap(ly, dxOccName(nx.occasion_code) + ' last year', '<span class="bi-op-k">' + esc(dxOccName(nx.occasion_code)) + ' in ' + days + (days === 1 ? ' day' : ' days') + '</span><span class="bi-op-t">' +
        esc(nice(nx.starts_on, true)) + '. ' + (prev ? (ly.length ? int(ly.length) + (ly.length === 1 ? ' order' : ' orders') + ' for it last year.' : 'No orders for it last year.') : 'No dates on record for last year.') +
        (start ? ' Most orders came within ' + p80 + ' days of the date, so start promoting by ' + esc(nice(start <= t ? t : start, true)) + '.' : '') + '</span>', 'bi-op'));
    }
    // 2. forward orders for the kitchen: the next 7 days
    var wk = up.filter(function (o) { return o.pd <= addDays(t, 6); });
    if (wk.length) {
      var c7 = wk.reduce(function (s, o) { return s + dxCakes(o); }, 0), v7 = wk.reduce(function (s, o) { return s + dxValue(o); }, 0), nc = wk.filter(function (o) { return o.st !== 'confirmed'; }).length;
      out.push(dxTap(wk, 'Orders for the next 7 days', '<span class="bi-op-k">' + int(c7) + (c7 === 1 ? ' cake' : ' cakes') + ' in the next 7 days</span><span class="bi-op-t">' + int(wk.length) + (wk.length === 1 ? ' order, ' : ' orders, ') + m0(v7) + ' booked' + (nc ? '. ' + int(nc) + ' not confirmed yet.' : ', all confirmed.') + '</span>', 'bi-op'));
    }
    // 3. the cake whose sales grew most on the period before (only with a fair comparison)
    if (r.pf && !r.noCmp) {
      var q = function (list) { var g = {}; list.forEach(function (o) { dxItems(o).forEach(function (i) { g[i[0]] = (g[i[0]] || 0) + (dnum(i[3]) || 1); }); }); return g; };
      var a = q(cur), b = q(dxSales(r.pf, r.pt)), best = null;
      Object.keys(a).forEach(function (k) { var d = a[k] - (b[k] || 0); if ((b[k] || 0) >= 2 && d >= 3 && (!best || d > best.d)) best = { k: k, d: d, a: a[k], b: b[k] }; });
      if (best) out.push(dxTap(cur.filter(function (o) { return dxItems(o).some(function (i) { return i[0] === best.k; }); }), best.k + ' sales', '<span class="bi-op-k">' + esc(best.k) + ' is selling more</span><span class="bi-op-t">' + int(best.a) + ' cakes, up from ' + int(best.b) + ' in the ' + esc(r.cmp) + '. Worth keeping in front of customers.</span>', 'bi-op'));
    }
    return '<section class="dx-card ov-k-opp bi-opps" aria-label="Opportunities"><div class="dx-card-h"><h2>Opportunities</h2><span>From the records, at most three</span></div>' +
      (out.length ? out.slice(0, 3).join('') : '<p class="ccs-quiet">' + (DX.odates ? 'No clear opportunities right now.' : 'Loading occasion dates…') + '</p>') + '</section>';
  }
  // ----- Level 2: the sections -----
  function biSections(secs, x) {
    var by = {}; secs.forEach(function (s) { by[s[0]] = s; });
    var part = function (id) { var s = by[id]; return s ? '<div class="dx-card-h"><h2>' + esc(s[1]) + '</h2>' + (s[2] ? '<span>' + s[2] + '</span>' : '') + '</div>' + s[3] : ''; };
    var join = function (list) { return list.filter(Boolean).join('<hr class="dx-hr">'); };
    var out = [['ov', 'Overview', '', '']];
    out.push(['sa', 'Sales and revenue', 'Completed sales only', join([biSales(x), part('yr'), part('ch'), part('de')])]);
    out.push(['pf', 'Profitability', 'Gross profit needs cake costs', join([biProfit(x), part('di')])]);
    out.push(['oc', 'Occasions and seasons', '', join([by.oc ? by.oc[3] : ''])]);
    out.push(['or', 'Occasion report', '', '']);
    out.push(['pr', 'Products', '', by.pr ? by.pr[3] : '']);
    out.push(['cu', 'Customers', '', by.cu ? by.cu[3] : '']);
    out.push(['cv', 'Orders and conversion', 'Enquiries are never counted as sales', join([biFunnel(x), part('lt'), part('ol')])]);
    out.push(['fi', 'Finance', 'Money owed and money taken', join([biAgeing(x), part('pa')])]);
    out.push(['op', 'Operations', '', by.op ? by.op[3] : '']);
    out.push(['fc', 'Forecast and opportunities', 'Booked orders, not predictions', join([biForward(x), part('up')])]);
    out.push(['dr', 'Data readiness', 'What each figure needs', join([biReady(x), part('df')])]);
    return out.filter(function (s) { return s[0] === 'ov' || s[0] === 'or' || s[3]; });
  }
  function biSales(x) {
    var r = x.r, cs = x.cs, ps = x.ps, days = {}; x.cur.forEach(function (o) { days[o.pd] = 1; });
    var nd = Object.keys(days).length, ly = null;
    if (!r.all && !r.noCmp) { var lf = (+r.from.slice(0, 4) - 1) + r.from.slice(4), lt = (+r.to.slice(0, 4) - 1) + r.to.slice(4), l = dxSales(lf, lt); if (l.length) ly = dxSum(l); }
    var k = function (lbl, val, sub) { return '<div class="ccs-kpi dx-kpi"><span class="ccs-kpi-l">' + lbl + '</span><b class="ccs-kpi-n">' + val + '</b><span class="ccs-kpi-s">' + sub + '</span></div>'; };
    var vx = biExVat(x.cur);
    return '<p class="dx-ch">Sales are completed sales: collected or delivered, after refunds. Future bookings are not sales until they are collected. Prices include VAT; the figure excluding VAT uses the rate on each sale\'s date (12.5% from 1 August 2025, 15% before).</p><div class="ccs-kpis dx-kpis">' +
      k('Net cake sales', m0(cs.v), (ps ? change(cs.v, ps.v) + ' on the ' + esc(r.cmp) + '. ' : '') + 'Including VAT') +
      k('Excluding VAT', m0(vx), 'VAT ' + m0(cs.v - vx)) +
      k('Completed sales', int(cs.n), int(cs.c) + ' cakes') +
      k('Average order value', cs.n ? m0(cs.aov) : 'None yet', ps && ps.n ? 'Was ' + m0(ps.aov) : '&nbsp;') +
      k('Average per trading day', nd ? m0(cs.v / nd) : 'None yet', nd ? 'Over ' + int(nd) + (nd === 1 ? ' day' : ' days') + ' with pickups' : '&nbsp;') +
      k('Same period last year', ly ? m0(ly.v) : 'Not on record', ly ? change(cs.v, ly.v) + ' this year' : 'No sales recorded for those dates') + '</div>';
  }
  function biProfit(x) {
    var g = dxGroup(x.cur, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [i[0] + (i[2] ? ', ' + i[2] + ' inch' : ''), q, dnum(i[4]) * q]; }); }).sort(function (a, b) { return b.v - a.v; });
    return '<div class="bi-need" role="note"><b>Cost data required.</b><p>Gross profit is sales excluding VAT, less the cost of making each cake. No cake costs are recorded yet, so gross profit and margin are not shown, rather than guessed. Past profit will use the costs that applied at the time, not today\'s.</p>' +
      '<p>F&amp;B Costing can supply ingredient, packaging and direct labour costs per cake and size, with the date each cost starts. ' + biGo('dr', 'Get the data requirements file') + '</p></div>' +
      '<div class="dx-card-h"><h2>Sales by cake and size</h2><span>Gross profit appears here once costs are in</span></div><div class="dx-octwrap"><table class="dx-octab"><thead><tr><th>Cake and size</th><th>Cakes</th><th>Sales</th><th>Gross profit</th></tr></thead><tbody>' +
      (g.length ? g.slice(0, 15).map(function (e) { return '<tr><th scope="row">' + esc(e.l) + '</th><td>' + int(e.q) + '</td><td>' + m0(e.v) + '</td><td class="bi-muted">Needs cost</td></tr>'; }).join('') : '<tr><td colspan="4">No completed sales in this period.</td></tr>') + '</tbody></table></div>';
  }
  function biFunnel(x) {
    var got = x.got, n = got.length || 1;
    var rows = [
      ['Enquiries and quotes', got.filter(function (o) { return o.st === 'not_confirmed'; })],
      ['Received, waiting for a check', got.filter(function (o) { return o.st === 'received'; })],
      ['Confirmed', biConfirmed(got)],
      ['Completed sales', got.filter(function (o) { return o.sale; })],
      ['Cancelled', got.filter(function (o) { return o.off; })]
    ];
    return '<p class="dx-ch">Every order in the period by where it got to. Enquiries and quotes are counted here only, never as sales.</p>' +
      dxBars(rows.map(function (rw) { return { l: rw[0], v: rw[1].length, list: rw[1], t: rw[0] }; }), function (rw) { return int(rw.v) + ' (' + Math.round(rw.v / n * 100) + '%)'; });
  }
  function biAgeing(x) {
    var t = today(), B = [['Not yet due', -99999, 0], ['1 to 7 days overdue', 1, 7], ['8 to 14 days overdue', 8, 14], ['15 to 30 days overdue', 15, 30], ['More than 30 days overdue', 31, 99999]];
    var rows = B.map(function (b) { var l = x.owing.filter(function (o) { var d = daysBetween(o.pd, t); return d >= b[1] && d <= b[2]; }); return { l: b[0], list: l, n: l.length, v: biOwed(l) }; });
    return '<p class="dx-ch">Money still owed on confirmed and completed orders, by how long past the pickup date. Orders from the old sheets count as paid in full: Finance confirmed a balance marked paid in a sheet is money received. Only app orders can show money still owed.</p>' +
      '<div class="dx-octwrap"><table class="dx-octab"><thead><tr><th>Age</th><th>Orders</th><th>Owed</th></tr></thead><tbody>' + rows.map(function (rw) {
        return '<tr' + (rw.l !== 'Not yet due' && rw.n ? ' class="bi-late"' : '') + '><th scope="row">' + esc(rw.l) + '</th><td>' + (rw.n ? dxTap(rw.list, rw.l, int(rw.n), 'bi-cell') : '0') + '</td><td>' + m0(rw.v) + '</td></tr>';
      }).join('') + '<tr class="bi-tot"><th scope="row">Total</th><td>' + int(x.owing.length) + '</td><td>' + m0(biOwed(x.owing)) + '</td></tr></tbody></table></div>';
  }
  function biForward(x) {
    var t = today(), win = [['Next 7 days', 6], ['Next 14 days', 13], ['Next 30 days', 29]];
    var big = x.up.filter(function (o) { return o.pd <= addDays(t, 29); }).sort(function (a, b) { return dxValue(b) - dxValue(a); }).slice(0, 5).filter(function (o) { return dxValue(o) > 0; });
    return '<p class="dx-ch">Orders already booked, from today. These are bookings, not predictions: anything not yet confirmed can still change.</p><div class="dx-octwrap"><table class="dx-octab"><thead><tr><th>When</th><th>Orders</th><th>Cakes</th><th>Booked value</th><th>Not confirmed yet</th></tr></thead><tbody>' +
      win.map(function (w) {
        var l = x.up.filter(function (o) { return o.pd <= addDays(t, w[1]); }), nc = l.filter(function (o) { return o.st !== 'confirmed'; });
        return '<tr><th scope="row">' + w[0] + '</th><td>' + (l.length ? dxTap(l, w[0], int(l.length), 'bi-cell') : '0') + '</td><td>' + int(l.reduce(function (s, o) { return s + dxCakes(o); }, 0)) + '</td><td>' + m0(l.reduce(function (s, o) { return s + dxValue(o); }, 0)) + '</td><td>' + (nc.length ? dxTap(nc, w[0] + ', not confirmed', int(nc.length), 'bi-cell') : '0') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (big.length ? '<div class="dx-card-h"><h2>Largest orders in the next 30 days</h2><span>For kitchen planning</span></div>' + dxRows(big, 5) : '');
  }
  // ----- Data readiness: what each figure needs, and a workbook to collect only what is missing -----
  function biGaps() {
    var d = DX.data, o = d.orders, t = today(), y1 = addDays(t, -365);
    var live = o.filter(function (x) { return !x.off; });
    return {
      noPrice: o.filter(function (x) { return x.sale && !x.tot; }),
      noOcc: live.filter(function (x) { return x.st !== 'not_confirmed' && x.pd >= y1 && (!x.oc || x.oc === 'not_specified'); }),
      noOd: live.filter(function (x) { return !x.odok; }),
      noCust: live.filter(function (x) { return !x.c; }),
      notMarked: o.filter(function (x) { return x.cp === 'not_recorded' && !x.off; }),
      sheetSales: o.filter(function (x) { return x.sale && x.imp; }),
      noCmp: live.filter(function (x) { return !x.cmp; }),
      costRows: biCostRows()
    };
  }
  function biCostRows() {
    var seen = {}, out = [];
    DX.data.orders.forEach(function (o) { if (!o.sale) return; (o.it || []).forEach(function (i) { var k = i[0] + '|' + (i[2] || ''); if (!seen[k]) { seen[k] = { cake: i[0], size: i[2] || '', n: 0, v: 0 }; out.push(seen[k]); } var q = dnum(i[3]) || 1; seen[k].n += q; seen[k].v += dnum(i[4]) * q; }); });
    return out.sort(function (a, b) { return b.n - a.n; });
  }
  function biReady(x) {
    var g = biGaps(), all = DX.data.orders.filter(function (o) { return !o.off; }).length || 1, sales = DX.data.orders.filter(function (o) { return o.sale; }).length || 1;
    var st = function (n, base) { return !n ? 'ready' : n / base < 0.5 ? 'partial' : 'missing'; };
    var R = [
      ['Net cake sales', st(g.noPrice.length, sales), g.noPrice.length ? 'Completed sales with no price (mostly custom cakes from the sheets)' : '', g.noPrice.length, 'Finance', 'Sheets and app'],
      ['Gross profit and margin', biNoCost() ? 'missing' : 'ready', biNoCost() ? 'Cake costs per cake and size, with the date each cost starts' : '', g.costRows.length, 'F&B Costing', 'Not recorded anywhere yet'],
      ['Confirmed orders', 'ready', '', 0, 'Operations', 'App and sheets'],
      ['Outstanding payments', DX.data.anyPay ? 'ready' : 'missing', DX.data.anyPay ? '' : 'No payments recorded in the app yet', 0, 'Finance', 'App payments; sheet orders count as paid'],
      ['VAT', 'ready', '', 0, 'Finance', 'Prices include VAT; the rate on each sale\'s date is used'],
      ['Occasions and seasons', st(g.noOcc.length, all), g.noOcc.length ? 'Orders in the last 12 months with no occasion' : '', g.noOcc.length, 'Marketing', 'Order form and sheets'],
      ['Campaigns', g.noCmp.length / all > 0.9 ? 'missing' : 'partial', 'Which campaign brought each order in', g.noCmp.length, 'Marketing', 'Not asked on most orders'],
      ['Order lead time', st(g.noOd.length, all), g.noOd.length ? 'Orders with no reliable order date (the walk-in sheet only has typing time)' : '', g.noOd.length, 'Operations', 'Sheets and app'],
      ['Repeat customers', st(g.noCust.length, all), g.noCust.length ? 'Orders with no phone number to recognise the customer' : '', g.noCust.length, 'Marketing', 'Customer records'],
      ['Collection outcomes', st(g.notMarked.length, all), g.notMarked.length ? 'App orders past pickup, never marked collected or cancelled' : '', g.notMarked.length, 'Operations', 'App'],
      ['Production on time', 'review', 'Kitchen ready times are not in the reporting data yet', 0, 'Operations', 'Kitchen board']
    ];
    var L = { ready: 'Ready', partial: 'Partially ready', missing: 'Missing data', review: 'Needs review', na: 'Not applicable' };
    var lists = { 'Net cake sales': g.noPrice, 'Occasions and seasons': g.noOcc, 'Order lead time': g.noOd, 'Repeat customers': g.noCust, 'Collection outcomes': g.notMarked, 'Outstanding payments': g.sheetSales };
    return '<p class="dx-ch">Each figure, whether the data behind it is complete, and what would complete it. Nothing is asked for that the app already holds.</p>' +
      '<div class="bi-dl"><button type="button" class="ccs-btn ccs-new" data-act="dx-bi-xlsx">Download data requirements (Excel)</button><span>One workbook with a sheet per department: only the records and fields that are missing. Order references only, no customer names or numbers.</span></div>' +
      '<div class="dx-octwrap"><table class="dx-octab bi-ready"><thead><tr><th>Figure</th><th>Status</th><th>What is missing</th><th>Records</th><th>Who can supply it</th></tr></thead><tbody>' +
      R.map(function (rw) { var l = lists[rw[0]]; return '<tr><th scope="row">' + esc(rw[0]) + '</th><td><span class="bi-st bi-st-' + rw[1] + '">' + L[rw[1]] + '</span></td><td>' + esc(rw[2] || 'Nothing') + '</td><td>' + (rw[3] ? (l && l.length ? dxTap(l, rw[0] + ': records to complete', int(rw[3]), 'bi-cell') : int(rw[3])) : '–') + '</td><td>' + esc(rw[4]) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  // The workbook: ExcelJS, loaded only when asked for (pinned version), so the app itself stays small
  function biLoadExcel() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'; s.onload = function () { window.ExcelJS ? ok(window.ExcelJS) : no(new Error('ExcelJS missing')); }; s.onerror = function () { no(new Error('ExcelJS did not load')); }; document.head.appendChild(s); });
  }
  function biXlsx() {
    toast('Preparing the workbook…');
    biLoadExcel().then(function (X) {
      var g = biGaps(), wb = new X.Workbook(), occ = (DX.data.occasions || []).map(function (o) { return o.l; }).filter(Boolean), gen = today();
      wb.creator = 'Corner Café cake dashboard'; wb.created = new Date();
      var ink = { argb: 'FF15171C' }, fillIn = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } }, fillHead = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B6339' } }, fillSys = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5F7' } };
      var sheet = function (name, dept, intro, cols, rows) {
        var ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 4 }] });
        ws.getCell('A1').value = name; ws.getCell('A1').font = { bold: true, size: 14, color: ink };
        ws.getCell('A2').value = 'Responsible: ' + dept + '. ' + intro; ws.getCell('A2').font = { size: 11, color: ink };
        ws.getCell('A3').value = 'Template ' + BI_TEMPLATE + ', made ' + gen + '. Fill in the yellow columns only. Grey columns come from the app: do not change them.';
        ws.getCell('A3').font = { italic: true, size: 10, color: { argb: 'FF596069' } };
        var hr = ws.getRow(4); cols.forEach(function (c, i) { var cell = hr.getCell(i + 1); cell.value = c.h; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = fillHead; cell.alignment = { wrapText: true, vertical: 'middle' }; cell.note = c.d; ws.getColumn(i + 1).width = c.w || 18; });
        hr.height = 32;
        rows.forEach(function (rw, ri) {
          var row = ws.getRow(5 + ri);
          cols.forEach(function (c, i) {
            var cell = row.getCell(i + 1); cell.value = rw[i] == null ? null : rw[i]; cell.fill = c.in ? fillIn : fillSys;
            if (c.list) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + c.list.join(',').replace(/"/g, '') + '"'], showErrorMessage: true, errorTitle: 'Choose from the list', error: 'Pick one of the listed values.' };
            if (c.money) { cell.numFmt = '#,##0.00'; if (c.in) cell.dataValidation = { type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: 'Amount', error: 'Enter an amount in Fiji dollars, 0 or more.' }; }
            if (c.date) { cell.numFmt = 'd mmm yyyy'; if (c.in) cell.dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(Date.UTC(2015, 0, 1))], showErrorMessage: true, errorTitle: 'Date', error: 'Enter a date, for example 1 Nov 2026.' }; }
          });
        });
        if (!rows.length) ws.getCell('A5').value = 'Nothing to fill in.';
        return ws;
      };
      var dt = function (iso) { return iso ? new Date(iso + 'T00:00:00Z') : null; }, cake = function (o) { return (o.it || []).map(function (i) { return i[0] + (i[2] ? ' ' + i[2] + ' inch' : ''); }).join('; '); }, ref = function (o) { return o.r || o.k; };
      var rm = wb.addWorksheet('Read me');
      [['Corner Café cakes: data requirements', true], ['Made ' + gen + ', template ' + BI_TEMPLATE + '.', false], ['', false],
        ['This workbook asks only for information the cake app does not hold yet. Each sheet belongs to one department.', false],
        ['Fill in the yellow columns. Grey columns are from the app and identify each record: please leave them as they are.', false],
        ['Drop-down lists and date and amount checks are built in. Hover over a column heading for what it means.', false],
        ['Order references only: no customer names, phone numbers or emails are included or needed.', false], ['', false],
        ['Sheets in this workbook', true]].forEach(function (l, i) { var c = rm.getCell('A' + (i + 1)); c.value = l[0]; c.font = { bold: l[1], size: i ? 11 : 14, color: ink }; });
      rm.getColumn(1).width = 110;
      var list = [];
      list.push(['Costing', 'F&B Costing', 'One row per cake and size sold. Costs per cake, in Fiji dollars, from the date given.']);
      sheet('Costing', 'F&B Costing', 'Costs per cake in Fiji dollars, and the date each cost applies from. A later change of cost goes on a new row with its own start date.', [
        { h: 'Cake', d: 'From the app', w: 30 }, { h: 'Size (inches)', d: 'From the app', w: 12 }, { h: 'Cakes sold', d: 'From the app, all history', w: 12 }, { h: 'Average price charged', d: 'From the app', money: true, w: 14 },
        { h: 'Ingredient cost', d: 'Ingredients for one cake of this size', in: true, money: true, w: 14 }, { h: 'Packaging cost', d: 'Box, board, candles and other packaging for one cake', in: true, money: true, w: 14 },
        { h: 'Direct labour cost', d: 'Kitchen time for one cake, if known', in: true, money: true, w: 14 }, { h: 'Cost applies from', d: 'The first day these costs are correct', in: true, date: true, w: 16 }, { h: 'Costed by', d: 'Who worked out these costs', in: true, w: 18 }
      ], g.costRows.map(function (c) { return [c.cake, c.size || 'Custom', c.n, c.n ? Math.round(c.v / c.n * 100) / 100 : null, null, null, null, null, null]; }));
      if (g.noPrice.length) { list.push(['Finance - prices', 'Finance', g.noPrice.length + ' completed sales with no price.']);
        sheet('Finance - prices', 'Finance', 'Completed sales with no price on record, mostly custom cakes from the sheets.', [
          { h: 'Order reference', d: 'From the app', w: 18 }, { h: 'Pickup date', d: 'From the app', date: true, w: 14 }, { h: 'Channel', d: 'From the app', w: 14 }, { h: 'Cake', d: 'From the app', w: 34 },
          { h: 'Price charged', d: 'What the customer paid for the cake, in Fiji dollars', in: true, money: true, w: 14 }, { h: 'Discount given', d: 'Any discount, in Fiji dollars', in: true, money: true, w: 14 }, { h: 'Where this comes from', d: 'Receipt, till report or similar', in: true, w: 24 }
        ], g.noPrice.map(function (o) { return [ref(o), dt(o.pd), SOURCE_LABEL[o.src] || o.src, cake(o), null, null, null]; })); }
      if (g.noOcc.length) { list.push(['Marketing - occasions', 'Marketing', g.noOcc.length + ' orders in the last 12 months with no occasion.']);
        sheet('Marketing - occasions', 'Marketing', 'Orders in the last 12 months with no occasion recorded. Choose the occasion the cake was for, not the promotion that brought the order in.', [
          { h: 'Order reference', d: 'From the app', w: 18 }, { h: 'Pickup date', d: 'From the app', date: true, w: 14 }, { h: 'Cake', d: 'From the app', w: 34 },
          { h: 'Occasion', d: 'What the cake was for', in: true, list: occ.length ? occ : ['Birthday', 'Anniversary', 'Wedding', 'Other'], w: 22 }, { h: 'Campaign', d: 'The promotion that brought the order in, if known', in: true, w: 22 }
        ], g.noOcc.map(function (o) { return [ref(o), dt(o.pd), cake(o), null, null]; })); }
      if (g.notMarked.length) { list.push(['Operations - outcomes', 'Operations', g.notMarked.length + ' app orders past pickup, not marked.']);
        sheet('Operations - outcomes', 'Operations', 'App orders past their pickup date that were never marked collected or cancelled.', [
          { h: 'Order reference', d: 'From the app', w: 18 }, { h: 'Pickup date', d: 'From the app', date: true, w: 14 }, { h: 'Cake', d: 'From the app', w: 34 },
          { h: 'What happened', d: 'Collected, delivered, cancelled or not collected', in: true, list: ['Collected', 'Delivered', 'Cancelled', 'Not collected'], w: 18 }, { h: 'Date', d: 'When it happened', in: true, date: true, w: 14 }
        ], g.notMarked.map(function (o) { return [ref(o), dt(o.pd), cake(o), null, null]; })); }
      list.forEach(function (l, i) { var c = rm.getCell('A' + (10 + i)); c.value = l[0] + ' (' + l[1] + '): ' + l[2]; c.font = { size: 11, color: ink }; });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = 'corner-cafe-data-requirements-' + today() + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Workbook downloaded');
    }).catch(function (e) { console.error(e); toast('The workbook could not be made. Check the connection and try again.', true); });
  }
  function biAct(a, v) {
    if (a === 'dx-bi-go') { S.secs = S.secs || {}; S.secs.dash = v; S.secs.anm = anModOf(v); view(); window.scrollTo(0, 0); }
    else if (a === 'dx-bi-xlsx') biXlsx();
  }
