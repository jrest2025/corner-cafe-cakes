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
  // Overview: which modules are working, above the cake figures
  function anStrip() {
    var mods = AN_MODS.filter(function (m) { return m.id !== 'ov' && m.id !== 'da'; });
    return '<section class="dx-card an-strip" aria-label="Modules"><div class="dx-card-h"><h2>Modules</h2><span>Each one switches on when its data arrives</span></div><div class="an-strip-g">' +
      mods.map(function (m) { var s = anState(m); return '<button type="button" class="an-tile is-' + s + '" data-act="secgo" data-g="anm" data-v="' + m.id + '"><b>' + esc(m.name) + '</b>' + anSt(s) + '<span>' + esc(m.purpose) + '</span></button>'; }).join('') + '</div></section>';
  }
  // A module whose data has not arrived: what it is for, what it will show, and the data that unlocks it
  function anEmpty(m) {
    var ds = m.need.concat(m.opt).map(anDs).filter(Boolean);
    return '<section class="dx-card an-empty" aria-label="' + esc(m.name) + '"><div class="an-empty-h"><span class="bi-st bi-st-missing">Missing data</span><h2>' + esc(m.name) + '</h2><p>' + esc(m.purpose) + '</p></div>' +
      '<div class="an-empty-b"><div><h3>What it will show</h3><ul class="an-list">' + (m.shows || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '<p class="an-note">Insights appear here once the data has arrived and passed its checks. Nothing is estimated in the meantime.</p></div>' +
      '<div><h3>Data that unlocks it</h3>' + ds.map(function (d) { return anDsCard(d, m.need.indexOf(d.id) > -1); }).join('') + '</div></div></section>';
  }
  function anDsCard(d, req) {
    var has = anHas(d.id);
    return '<div class="an-ds"><div class="an-ds-h"><b>' + esc(d.name) + '</b>' + (has ? anSt('ready') : '<span class="bi-st bi-st-' + (req ? 'missing' : 'na') + '">' + (req ? 'Needed' : 'Optional') + '</span>') + '</div>' +
      '<p>' + esc(d.why || '') + ' Supplied by ' + esc(d.owner) + '. ' + esc(d.grain) + '.</p>' +
      (d.src === 'excel' ? '<p class="an-fields"><span>Columns:</span> ' + d.fields.map(function (f) { return esc(f[0]) + (f[1] ? '' : ' (optional)'); }).join(', ') + '</p>' +
        '<div class="an-ds-a"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="dx-an-tpl" data-v="' + d.id + '">Download template</button><span>Uploading opens once the reporting storage is approved.</span></div>' : '') + '</div>';
  }
  // Connected insights: each pair of datasets, whether it can be read yet, and the finding when it can
  function anCross() {
    return '<section class="dx-card" aria-label="Connected insights"><div class="dx-card-h"><h2>Connected insights</h2><span>Findings that need two datasets together</span></div>' +
      '<p class="an-q">Each finding shows what the data says, the evidence, how sure it is and what is still unknown. A link in time is not proof that one thing caused the other.</p>' +
      AN_LINKS.map(function (l) {
        var a = anDs(l.a), b = anDs(l.b), ok = anHas(l.a) && anHas(l.b), body = ok ? anFind(l) : '';
        return '<div class="an-link"><div class="an-link-h"><b>' + esc(a.name) + ' and ' + esc(b.name) + '</b>' + anSt(ok ? 'ready' : 'missing') + '</div><p class="an-q">' + esc(l.q) + '</p>' +
          (ok ? body : '<p class="an-note">Waiting for ' + esc([a, b].filter(function (x) { return !anHas(x.id); }).map(function (x) { return x.name.toLowerCase(); }).join(' and ')) + '. Linked by ' + esc(l.key.toLowerCase()) + '.</p>') + '</div>';
      }).join('') + '</section>';
  }
  function anFind(l) {
    if (l.a === 'cake_orders' && l.b === 'occasions') {
      var t = today(), rows = dxLeadData({ from: addDays(t, -365), to: t }).filter(function (x) { return x.c !== 'not_specified' && x.lead.length; });
      if (!rows.length) return '<p class="an-note">No orders with an occasion and a reliable order date in the last 12 months yet.</p>';
      var x = rows[0], s = x.lead.slice().sort(function (p, q) { return p - q; }), med = s[Math.floor(s.length / 2)], early = s.filter(function (d) { return d >= 14; }).length;
      var conf = s.length >= 30 ? 'High' : s.length >= 10 ? 'Medium' : 'Low';
      return '<dl class="an-find"><dt>Observation</dt><dd>' + esc(x.l) + ' cakes are usually ordered ' + esc(ltDaysTxt(med)) + ' (middle order). ' + int(early) + ' of ' + int(s.length) + ' were ordered 14 days or more before pickup.</dd>' +
        '<dt>Evidence</dt><dd>' + int(s.length) + ' ' + esc(x.l.toLowerCase()) + ' orders in the last 12 months with a reliable order date, from the cake app and the old sheets.</dd>' +
        '<dt>Why it matters</dt><dd>Promotion for this occasion has to start before most orders are placed, not in the week of pickup.</dd>' +
        '<dt>How sure</dt><dd>' + conf + (conf === 'Low' ? ': too few orders to rely on' : '') + '.</dd>' +
        '<dt>Unknown</dt><dd>Orders with no order date are left out. What prompted each order is not recorded.</dd></dl>' + biGo('cv', 'See lead times');
    }
    return '<p class="an-note">Ready to analyse.</p>';
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
