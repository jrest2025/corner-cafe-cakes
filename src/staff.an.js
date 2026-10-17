  // ---------- Analytics (17 Oct 2026, Roneel's brief "Unified business intelligence and analytics platform") ----------
  // Corner Café only for now. The Dashboard becomes Analytics: modules on top, each switched on by its data.
  // Everything below is driven by two registers (datasets and modules) and one list of connections. A new Excel file in an
  // approved template feeds the modules that list it: no screen has to be redesigned to take new data.
  // Uploading needs the reporting storage (a database change awaiting approval); until then Excel datasets show as
  // "Missing data" with their template ready to download. Nothing is invented: a module without its data says so.
  var AN_DS = [
    { id: 'cake_orders', name: 'Cake orders', src: 'app', owner: 'Cake app', grain: 'One row per cake order',
      fields: [['Order reference', 1], ['Order date', 1], ['Pickup date', 1], ['Cake and size', 1], ['Quantity', 1], ['Order value', 1], ['Occasion', 0], ['Channel', 1], ['Order status', 1], ['Payment status', 1]] },
    { id: 'occasions', name: 'Occasions calendar', src: 'app', owner: 'Settings, Occasions', grain: 'One row per occasion per year',
      fields: [['Occasion', 1], ['Year', 1], ['Starts on', 1], ['Ends on', 1], ['Promotion days', 0]] },
    { id: 'cake_costs', name: 'Cake costs', src: 'excel', tpl: 'CC-CAKE-COST', ver: 1, owner: 'F&B Costing', grain: 'One row per cake and size, from a date',
      why: 'Turns cake sales into gross profit.',
      fields: [['Cake', 1, 'text', 'Chocolate Mudcake'], ['Size (inches)', 1, 'number', 8], ['Ingredient cost', 1, 'money', 38.5], ['Packaging cost', 1, 'money', 6], ['Direct labour cost', 0, 'money', 12], ['Cost applies from', 1, 'date', '2026-10-01'], ['Costed by', 0, 'text', 'Head Pastry Chef']] },
    { id: 'cafe_sales', name: 'Café daily sales', src: 'excel', tpl: 'CC-CAFE-SALES', ver: 1, owner: 'Finance', grain: 'One row per trading day',
      why: 'The café\'s own takings, so cakes can be seen against the whole business.',
      fields: [['Business date', 1, 'date', '2026-10-16'], ['Gross sales including VAT', 1, 'money', 4820], ['Discounts', 1, 'money', 120], ['Refunds', 1, 'money', 0], ['Net sales including VAT', 1, 'money', 4700], ['VAT', 1, 'money', 522.22], ['Transactions', 1, 'number', 214], ['Guests', 0, 'number', 260], ['Sales target', 0, 'money', 5000]] },
    { id: 'product_sales', name: 'Café product sales', src: 'excel', tpl: 'CC-PRODUCT-SALES', ver: 1, owner: 'Finance', grain: 'One row per item per trading day',
      why: 'Best sellers, product mix and category trends across the café.',
      fields: [['Business date', 1, 'date', '2026-10-16'], ['Item code', 1, 'text', 'BEV-014'], ['Item name', 1, 'text', 'Flat white'], ['Category', 1, 'text', 'Coffee'], ['Quantity sold', 1, 'number', 86], ['Net revenue including VAT', 1, 'money', 559], ['Discounts', 0, 'money', 0], ['Food cost', 0, 'money', 129]] },
    { id: 'campaigns', name: 'Marketing campaigns', src: 'excel', tpl: 'CC-MKT-CAMPAIGN', ver: 1, owner: 'Marketing', grain: 'One row per campaign per platform per day',
      why: 'What marketing cost and what it brought in.',
      fields: [['Date', 1, 'date', '2026-10-16'], ['Campaign ID', 1, 'text', 'CC-2026-XMAS-01'], ['Campaign name', 1, 'text', 'Christmas cakes'], ['Platform', 1, 'list', 'Meta', ['Meta', 'Google Ads', 'TikTok', 'Email', 'Print', 'Radio', 'In store', 'Other']], ['Objective', 1, 'list', 'Orders', ['Awareness', 'Enquiries', 'Orders', 'Visits']], ['Spend', 1, 'money', 45], ['Impressions', 0, 'number', 12000], ['Reach', 0, 'number', 8400], ['Clicks', 0, 'number', 310], ['Enquiries', 0, 'number', 12], ['Orders', 0, 'number', 4], ['Attributed revenue', 0, 'money', 0], ['Attribution method', 0, 'list', 'None', ['None', 'Promo code', 'Tracked link', 'Platform reported']]] },
    { id: 'website', name: 'Website visits', src: 'excel', tpl: 'CC-WEB-DAILY', ver: 1, owner: 'Marketing', grain: 'One row per day per traffic source',
      why: 'How people find the cake page and how many go on to order.',
      fields: [['Date', 1, 'date', '2026-10-16'], ['Traffic source', 1, 'text', 'google / organic'], ['Campaign ID', 0, 'text', ''], ['Landing page', 0, 'text', '/cakes'], ['Sessions', 1, 'number', 140], ['Cake order form starts', 0, 'number', 18], ['Cake orders submitted', 0, 'number', 6]] }
  ];
  var AN_MODS = [
    { id: 'ov', name: 'Overview', need: ['cake_orders'], opt: ['cafe_sales', 'cake_costs'], purpose: 'How the business is doing, in four figures.' },
    { id: 'ck', name: 'Cake orders', need: ['cake_orders'], opt: ['cake_costs'], purpose: 'Sales, profit, products, customers, payments and operations for cakes.' },
    { id: 'cs', name: 'Café sales', need: ['cafe_sales'], opt: ['product_sales'], purpose: 'The café\'s takings, transactions, average spend and best sellers.',
      shows: ['Net sales by day, week and month, against target', 'Transactions and average spend', 'Cakes as a share of all café sales', 'Best sellers and category mix', 'Same period last year'] },
    { id: 'mk', name: 'Marketing', need: ['campaigns'], opt: ['website'], purpose: 'What each campaign cost and what it brought in.',
      shows: ['Spend by campaign and platform', 'Cost per click, enquiry and order', 'Cake orders during each campaign against a normal period', 'Return on spend, only where revenue can be traced to the campaign'] },
    { id: 'wb', name: 'Website', need: ['website'], opt: ['campaigns'], purpose: 'How people reach the cake page and how many order.',
      shows: ['Visits by source', 'Order form starts and orders sent', 'Which landing pages and campaigns lead to orders'] },
    { id: 'sd', name: 'Seasonal demand', need: ['cake_orders', 'occasions'], opt: ['cafe_sales'], purpose: 'When each occasion\'s orders arrive and when cakes are collected.' },
    { id: 'ci', name: 'Insights', need: ['cake_orders'], opt: ['occasions', 'campaigns', 'cafe_sales', 'website'], purpose: 'What the datasets show together, with the evidence behind each finding.' },
    { id: 'da', name: 'Data', need: [], opt: [], purpose: 'What each module needs, what has arrived and the templates.' }
  ];
  // Which cake sections sit in which module (the sections themselves are built in the dashboard code above)
  var AN_SUB = { ck: ['sa', 'pf', 'pr', 'cu', 'cv', 'fi', 'op', 'fc'], sd: ['oc', 'or'], da: ['dm', 'dr'] };
  var AN_LINKS = [
    { a: 'cake_orders', b: 'occasions', key: 'Occasion and pickup date', q: 'When are cakes for each occasion ordered, and when collected?' },
    { a: 'cake_orders', b: 'campaigns', key: 'Date (campaign days) and promo code where used', q: 'Do cake orders rise while a campaign runs, against a normal period?' },
    { a: 'cake_orders', b: 'cafe_sales', key: 'Business date', q: 'What share of the café\'s sales are cakes, and does it change by season?' },
    { a: 'website', b: 'cake_orders', key: 'Date and campaign ID', q: 'How many website visits turn into cake orders?' },
    { a: 'campaigns', b: 'website', key: 'Campaign ID and date', q: 'Which campaigns bring visitors who go on to order?' },
    { a: 'cafe_sales', b: 'occasions', key: 'Business date', q: 'How do café takings move before, during and after each occasion?' }
  ];
  function anDs(id) { return AN_DS.filter(function (d) { return d.id === id; })[0]; }
  // A dataset is there when the app holds it, or (once uploads exist) when a validated import has arrived
  function anHas(id) {
    var d = DX.data || {};
    if (id === 'cake_orders') return !!(d.orders && d.orders.length);
    if (id === 'occasions') return !!((d.occasions && d.occasions.length) || (DX.odates && DX.odates.length));
    if (id === 'cake_costs') return !!(d.costs && d.costs.length);
    return !!(d.imports && d.imports[id] && d.imports[id].rows);
  }
  function anLatest(id) {
    var d = DX.data || {};
    if (id === 'cake_orders') { var m = ''; (d.orders || []).forEach(function (o) { if (o.sale && o.pd > m) m = o.pd; }); return m ? 'Sales to ' + nice(m) : ''; }
    if (id === 'occasions') return DX.odates && DX.odates.length ? int(DX.odates.length) + ' occasion dates' : int((d.occasions || []).length) + ' occasions';
    if (d.imports && d.imports[id] && d.imports[id].to) return 'Data to ' + nice(d.imports[id].to);
    return '';
  }
  function anState(m) {
    if (!m.need.length) return 'na';
    var miss = m.need.filter(function (x) { return !anHas(x); });
    if (miss.length === m.need.length) return 'missing';
    if (miss.length) return 'partial';
    return m.opt.some(function (x) { return !anHas(x); }) ? 'partial' : 'ready';
  }
  var AN_L = { ready: 'Ready', partial: 'Partially ready', missing: 'Missing data', na: '' };
  function anSt(s) { return s === 'na' ? '' : '<span class="bi-st bi-st-' + s + '">' + AN_L[s] + '</span>'; }
  function anModOf(sec) { var m = 'ov'; Object.keys(AN_SUB).forEach(function (k) { if (AN_SUB[k].indexOf(sec) > -1) m = k; }); return m; }
  function anMod() { return secCur('anm', AN_MODS.map(function (m) { return m.id; }), 'ov'); }
  function anModBar(cur) {
    return '<nav class="an-mods" aria-label="Analytics modules">' + AN_MODS.map(function (m) {
      var s = anState(m), need = s === 'missing';
      return '<button type="button" class="an-mod' + (need ? ' is-need' : '') + '" data-act="secgo" data-g="anm" data-v="' + m.id + '" aria-current="' + (m.id === cur ? 'page' : 'false') + '">' + esc(m.name) + (need ? '<span class="an-need">No data</span>' : '') + '</button>';
    }).join('') + '</nav>';
  }
  // ----- Charts (17 Oct 2026, Roneel: "analytics are pie charts, bar graphs and line graphs, not sentences") -----
  // Categorical colours in fixed order (validated for colour-blind separation); the 6th slot and beyond fold into Other.
  // Every slice is labelled with its name, value and share beside the chart, so colour is never the only key.
  var AN_PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'], AN_OTHER = '#b5bac1';
  function anFold(rows, n) {
    rows = rows.filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    if (rows.length <= n) return rows;
    var rest = rows.slice(n - 1), o = { l: 'Other', v: 0, list: [], other: true };
    rest.forEach(function (r) { o.v += r.v; o.list = o.list.concat(r.list || []); });
    return rows.slice(0, n - 1).concat([o]);
  }
  function anDonut(title, rows, fmt, lbl) {
    rows = anFold(rows, 6);
    var tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    if (!tot) return anCard(title, '<p class="an-none">Nothing in this period</p>');
    var R = 42, C = 2 * Math.PI * R, at = 0, gap = rows.length > 1 ? 1.6 : 0, col = function (r, i) { return r.other ? AN_OTHER : AN_PAL[i % AN_PAL.length]; };
    var arcs = rows.map(function (r, i) {
      var len = r.v / tot * C, d = Math.max(len - gap, 0.5), seg = '<circle r="' + R + '" cx="60" cy="60" fill="none" stroke="' + col(r, i) + '" stroke-width="16" stroke-dasharray="' + d.toFixed(2) + ' ' + (C - d).toFixed(2) + '" stroke-dashoffset="' + (-at).toFixed(2) + '"><title>' + esc(r.l) + ': ' + fmt(r.v) + ' (' + Math.round(r.v / tot * 100) + '%)</title></circle>';
      at += len; return seg;
    }).join('');
    var svg = '<svg class="an-donut" viewBox="0 0 120 120" role="img" aria-label="' + esc(title) + '"><g transform="rotate(-90 60 60)">' + arcs + '</g><text x="60" y="58" text-anchor="middle" class="an-dv">' + esc(fmt(tot)) + '</text><text x="60" y="74" text-anchor="middle" class="an-dl">' + esc(lbl || 'total') + '</text></svg>';
    var leg = '<ul class="an-leg">' + rows.map(function (r, i) {
      return '<li>' + dxTap(r.list, title + ': ' + r.l, '<i style="background:' + col(r, i) + '"></i><span>' + esc(r.l) + '</span><b>' + fmt(r.v) + '</b><em>' + Math.round(r.v / tot * 100) + '%</em>', 'an-lrow') + '</li>';
    }).join('') + '</ul>';
    return anCard(title, '<div class="an-pie">' + svg + leg + '</div>');
  }
  function anCard(title, body, cls) { return '<section class="dx-card an-chart' + (cls ? ' ' + cls : '') + '" aria-label="' + esc(title) + '"><h3 class="an-ct">' + esc(title) + '</h3>' + body + '</section>'; }
  var AN_WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Overview charts: what sold, what for, where from, and which days are busiest
  function anCharts(cur, got) {
    var live = got.filter(function (o) { return !o.off; });
    var cakes = dxGroup(cur, function (o) { return dxItems(o).map(function (i) { var q = dnum(i[3]) || 1; return [i[0], q, dnum(i[4]) * q]; }); }).map(function (x) { return { l: x.l, v: x.v, list: x.list }; });
    var occ = dxGroup(live, function (o) { return [[dxOccName(o.oc || 'not_specified'), 1, 0]]; }).map(function (x) { return { l: x.l, v: x.q, list: x.list }; });
    var ch = dxGroup(live, function (o) { return [[SOURCE_LABEL[o.src] || o.src || 'Not recorded', 1, 0]]; }).map(function (x) { return { l: x.l, v: x.q, list: x.list }; });
    var wd = AN_WD.map(function (l, i) { var list = live.filter(function (o) { return o.pd && (new Date(o.pd + 'T12:00:00Z').getUTCDay() + 6) % 7 === i; }); return { l: l, full: l, v: list.length, list: list, t: l + ' pickups' }; });
    return '<div class="an-grid">' + anDonut('Sales by cake', cakes, m0, 'before refunds') + anDonut('Orders by occasion', occ, int) + anDonut('Orders by channel', ch, int) +
      anCard('Pickups by day', dxCols(wd, false, 'Busiest')) + '</div>';
  }
  // A module still waiting for data: the charts it will show, drawn as grey outlines, and the one file that unlocks them
  var AN_GHOST = {
    cs: [['line', 'Net sales by week'], ['donut', 'Cakes share of sales'], ['bar', 'Best sellers'], ['bar', 'Average spend by day']],
    mk: [['bar', 'Spend by campaign'], ['line', 'Cake orders during campaigns'], ['donut', 'Spend by platform']],
    wb: [['line', 'Visits by day'], ['donut', 'Visits by source'], ['bar', 'Order form to order']]
  };
  function anGhost(kind) {
    if (kind === 'line') return '<svg viewBox="0 0 200 90" class="an-gh" aria-hidden="true"><path d="M8 82H192M8 8V82" /><polyline points="10,66 40,58 70,62 100,40 130,46 160,28 190,34" /></svg>';
    if (kind === 'donut') return '<svg viewBox="0 0 200 90" class="an-gh" aria-hidden="true"><circle cx="100" cy="45" r="34" /></svg>';
    return '<svg viewBox="0 0 200 90" class="an-gh" aria-hidden="true"><path d="M8 82H192" />' + [52, 34, 60, 22, 44, 30].map(function (h, i) { return '<rect x="' + (18 + i * 30) + '" y="' + (82 - h) + '" width="16" height="' + h + '" rx="3" />'; }).join('') + '</svg>';
  }
  function anEmpty(m) {
    var d = anDs(m.need[0]);
    return '<div class="an-wait"><span class="bi-st bi-st-missing">No data yet</span><b>' + esc(d.name) + '</b><span class="an-wait-o">from ' + esc(d.owner) + '</span>' +
      '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="dx-an-tpl" data-v="' + d.id + '">Download template</button></div>' +
      '<div class="an-grid">' + (AN_GHOST[m.id] || []).map(function (g) { return anCard(g[1], anGhost(g[0]), 'is-ghost'); }).join('') + '</div>';
  }
  // Insights: each ready pair of datasets as a chart with a one-line headline; pairs still waiting as one short line each
  function anCross() {
    var ready = AN_LINKS.filter(function (l) { return anHas(l.a) && anHas(l.b); }), wait = AN_LINKS.filter(function (l) { return !(anHas(l.a) && anHas(l.b)); });
    return ready.map(anFind).join('') +
      '<section class="dx-card" aria-label="Waiting for data"><h3 class="an-ct">Waiting for data</h3><ul class="an-waitlist">' + wait.map(function (l) {
        var miss = [anDs(l.a), anDs(l.b)].filter(function (x) { return !anHas(x.id); });
        return '<li><b>' + esc(anDs(l.a).name) + ' + ' + esc(anDs(l.b).name) + '</b><span>needs ' + esc(miss.map(function (x) { return x.name.toLowerCase(); }).join(' and ')) + '</span></li>';
      }).join('') + '</ul></section>';
  }
  function anFind(l) {
    if (l.a === 'cake_orders' && l.b === 'occasions') {
      var t = today(), rows = dxLeadData({ from: addDays(t, -365), to: t }).filter(function (x) { return x.c !== 'not_specified' && x.lead.length; }).slice(0, 3);
      if (!rows.length) return anCard('How far ahead cakes are ordered', '<p class="an-none">No occasion orders with an order date yet</p>');
      var conf = function (n) { return n >= 30 ? 'High' : n >= 10 ? 'Medium' : 'Low'; };
      return '<div class="an-grid">' + rows.map(function (x) {
        var s = x.lead.slice().sort(function (p, q) { return p - q; }), med = s[Math.floor(s.length / 2)];
        var bars = LT_B.map(function (b, i) { var list = x.list.filter(function (o) { var d = ltDays(o); return d != null && d >= b[1] && d <= b[2]; }); return { l: b[0], v: x.lb[i], list: list, t: x.l + ', ordered ' + b[0].toLowerCase() + ' ahead' }; });
        return anCard(x.l + ': days ordered ahead', '<p class="an-head">Usually <b>' + esc(ltDaysTxt(med)) + '</b></p>' + dxBars(bars, function (r) { return int(r.v); }) +
          '<p class="an-chips"><span>' + int(s.length) + ' orders, last 12 months</span><span>' + conf(s.length) + ' confidence</span></p>');
      }).join('') + '</div>';
    }
    return '';
  }
  // Long explanations under a section heading fold away behind "How this is counted", so the charts come first
  function anTidy(html) {
    return html.replace(/<p class="dx-ch">((?:(?!<\/p>)[\s\S]){90,}?)<\/p>/g, function (m, t) { return '<details class="an-how"><summary>How this is counted</summary><p>' + t + '</p></details>'; });
  }
  // Data: the registers themselves
  function anRegisters() {
    var mods = AN_MODS.filter(function (m) { return m.id !== 'da'; });
    return '<p class="dx-ch">Modules</p><div class="dx-octwrap"><table class="dx-octab bi-ready"><thead><tr><th>Module</th><th>Status</th><th>Needs</th><th>Adds to it</th></tr></thead><tbody>' +
      mods.map(function (m) { var nm = function (l) { return l.map(function (x) { return anDs(x).name; }).join(', ') || 'Nothing'; }; return '<tr><th scope="row">' + esc(m.name) + '</th><td>' + anSt(anState(m)) + '</td><td>' + esc(nm(m.need)) + '</td><td>' + esc(nm(m.opt)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<hr class="dx-hr"><p class="dx-ch">Datasets</p><div class="dx-octwrap"><table class="dx-octab bi-ready"><thead><tr><th>Dataset</th><th>Status</th><th>Comes from</th><th>One row is</th><th>Latest</th><th>Template</th></tr></thead><tbody>' +
      AN_DS.map(function (d) { var h = anHas(d.id); return '<tr><th scope="row">' + esc(d.name) + '</th><td>' + anSt(h ? 'ready' : 'missing') + '</td><td>' + esc(d.src === 'app' ? d.owner : 'Excel upload, ' + d.owner) + '</td><td>' + esc(d.grain) + '</td><td>' + esc(anLatest(d.id) || 'Nothing yet') + '</td><td>' + (d.src === 'excel' ? '<button type="button" class="bi-cell" data-act="dx-an-tpl" data-v="' + d.id + '">' + esc(d.tpl + '-' + d.ver) + '</button>' : 'Not needed') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<hr class="dx-hr"><p class="dx-ch">How datasets connect</p><div class="dx-octwrap"><table class="dx-octab bi-ready"><thead><tr><th>Datasets</th><th>Linked by</th><th>Status</th></tr></thead><tbody>' +
      AN_LINKS.map(function (l) { return '<tr><th scope="row">' + esc(anDs(l.a).name + ' and ' + anDs(l.b).name) + '</th><td>' + esc(l.key) + '</td><td>' + anSt(anHas(l.a) && anHas(l.b) ? 'ready' : 'missing') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="an-note">Rules for every upload: dates as YYYY-MM-DD, amounts as plain numbers in Fiji dollars, VAT shown separately, no customer names, phone numbers or emails. A file sent twice is recognised and not counted twice.</p>';
  }
  // Templates: one workbook per dataset, built from the register above
  function anTpl(id) {
    var d = anDs(id); if (!d || d.src !== 'excel') return;
    toast('Preparing the template…');
    biLoadExcel().then(function (X) {
      var wb = new X.Workbook(), ink = { argb: 'FF15171C' }, code = d.tpl + '-' + d.ver;
      wb.creator = 'Corner Café analytics'; wb.created = new Date();
      var rm = wb.addWorksheet('Read me');
      [[d.name + ' template', true, 14], ['Template ' + code + '. Supplied by ' + d.owner + '. ' + d.grain + '.', false], ['', false],
        [d.why || '', false], ['Fill in the Data sheet from row 3. Row 2 is an example: delete it before sending.', false],
        ['Dates as YYYY-MM-DD. Amounts as plain numbers in Fiji dollars, without the $ sign. Show VAT separately where asked.', false],
        ['Required columns are marked Required. Leave an optional column empty rather than writing 0 when the figure is not known.', false],
        ['No customer names, phone numbers or emails.', false], ['Keep the column headings and their order exactly as they are. Do not rename or add sheets.', false]]
        .forEach(function (l, i) { var c = rm.getCell('A' + (i + 1)); c.value = l[0]; c.font = { bold: l[1], size: l[2] || 11, color: ink }; });
      rm.getColumn(1).width = 110;
      var ws = wb.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] }), hd = ws.getRow(1), ex = ws.getRow(2);
      d.fields.forEach(function (f, i) {
        var col = ws.getColumn(i + 1), c = hd.getCell(i + 1); col.width = Math.max(14, f[0].length + 4);
        c.value = f[0]; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B6339' } }; c.alignment = { wrapText: true, vertical: 'middle' };
        c.note = (f[1] ? 'Required' : 'Optional') + (f[2] === 'date' ? '. Date, YYYY-MM-DD' : f[2] === 'money' ? '. Fiji dollars, number only' : f[2] === 'number' ? '. Whole number' : f[2] === 'list' ? '. Choose from the list' : '');
        var e = ex.getCell(i + 1); e.value = f[2] === 'date' && f[3] ? new Date(f[3] + 'T00:00:00Z') : f[3] === '' ? null : f[3]; e.font = { italic: true, color: { argb: 'FF596069' } };
        var v = f[2] === 'date' ? { type: 'date', operator: 'greaterThan', formulae: [new Date(Date.UTC(2015, 0, 1))], error: 'Enter a date as YYYY-MM-DD.' }
          : f[2] === 'money' ? { type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], error: 'Enter an amount in Fiji dollars, 0 or more, without the $ sign.' }
          : f[2] === 'number' ? { type: 'whole', operator: 'greaterThanOrEqual', formulae: [0], error: 'Enter a whole number, 0 or more.' }
          : f[2] === 'list' ? { type: 'list', formulae: ['"' + f[4].join(',') + '"'], error: 'Choose one of the listed values.' } : null;
        for (var r = 2; r <= 1000; r++) { var cell = ws.getRow(r).getCell(i + 1); if (f[2] === 'date') cell.numFmt = 'yyyy-mm-dd'; if (f[2] === 'money') cell.numFmt = '0.00'; if (v) cell.dataValidation = Object.assign({ allowBlank: !f[1], showErrorMessage: true, errorTitle: f[0] }, v); }
      });
      hd.height = 34; ex.getCell(d.fields.length + 1).value = 'Example: delete this row'; ex.getCell(d.fields.length + 1).font = { bold: true, color: { argb: 'FFC52F25' } };
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = 'corner-cafe-' + d.tpl.toLowerCase() + '-' + d.ver + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Template downloaded');
    }).catch(function (e) { console.error(e); toast('The template could not be made. Check the connection and try again.', true); });
  }
