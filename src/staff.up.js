  // ---------- Uploads (17 Oct 2026, Roneel: "yes" to an upload button for filled-in Excel files) ----------
  // Analytics, Data, Uploads: choose a file, see what it will change in plain words, load it, undo it later if needed.
  // First file type: the cake order cleaning sheet (prices, occasions, order dates, test orders). The server checks every
  // row again and keeps a record of each upload; live orders are never edited, corrections sit beside them.
  function upS() { DX.up = DX.up || { list: null, can: false, step: 'pick' }; return DX.up; }
  function upLoad() {
    var u = upS(); if (u.loading) return; u.loading = true;
    sb.rpc('analytics_imports').then(function (r) {
      u.loading = false; var d = r.data || {};
      if (r.error || !d.ok) { u.listErr = (d && d.message) || 'The upload history could not be loaded.'; } else { u.list = d.list || []; u.can = !!d.can_upload; u.listErr = null; }
      if (S.tab === 'dash') view();
    }).catch(function () { u.loading = false; u.listErr = 'No connection. Try again.'; if (S.tab === 'dash') view(); });
  }
  var UP_COLS = { record: 'Record', row: 'Sheet row', od: 'Order date', oc: 'Occasion', price: 'Price per cake', pd: 'Date needed', dec: 'Decision' };
  function upIso(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return isNaN(v) ? '!' : v.toISOString().slice(0, 10);
    if (typeof v === 'object' && v.result != null) return upIso(v.result);
    var s = String(v).trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '!';
  }
  function upText(v) { if (v == null) return ''; if (typeof v === 'object') { if (v.richText) return v.richText.map(function (x) { return x.text; }).join(''); if (v.result != null) return String(v.result); if (v.text) return String(v.text); } return String(v).trim(); }
  function upFile(file) {
    var u = upS(); u.step = 'reading'; u.file = file.name; u.parsed = null; u.result = null; u.err = null; view();
    var buf;
    file.arrayBuffer().then(function (b) { buf = b; return crypto.subtle.digest('SHA-256', b); }).then(function (h) {
      u.hash = Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      return biLoadExcel();
    }).then(function (X) { var wb = new X.Workbook(); return wb.xlsx.load(buf).then(function () { return wb; }); }).then(function (wb) {
      var ws = wb.getWorksheet('Orders') || wb.worksheets[0];
      if (!ws) throw new Error('nosheet');
      var head = {}; ws.getRow(1).eachCell(function (c, n) { head[upText(c.value)] = n; });
      if (head['Order reference'] && !head['Record']) { u.step = 'pick'; u.err = 'This is the new-orders template. Loading new orders is the next step being built; this screen takes the cleaning sheet for now.'; view(); return; }
      var miss = ['record', 'od', 'oc', 'price'].filter(function (k) { return !head[UP_COLS[k]]; }).map(function (k) { return UP_COLS[k]; });
      if (miss.length) { u.step = 'pick'; u.err = 'This file is missing the column' + (miss.length > 1 ? 's ' : ' ') + miss.join(', ') + '. Use the cleaning sheet as it was sent, without renaming columns.'; view(); return; }
      var occ = ((DX.data && DX.data.occasions) || []).map(function (o) { return o.l.toLowerCase(); });
      var rows = [], warn = [], n = { od: 0, oc: 0, price: 0, del: 0 };
      ws.eachRow(function (row, i) {
        if (i === 1) return;
        var g = function (k) { return head[UP_COLS[k]] ? row.getCell(head[UP_COLS[k]]).value : null; };
        var rec = upText(g('record')); if (!rec) return;
        var x = { row: upText(g('row')) || String(i), record: rec, order_date: upIso(g('od')), pickup_date: upIso(g('pd')), occasion: upText(g('oc')), price: upText(g('price')), decision: upText(g('dec')) };
        var w = [];
        if (x.order_date === '!') { w.push('order date is not a date'); x.order_date = ''; }
        if (x.pickup_date === '!') { w.push('date needed is not a date'); x.pickup_date = ''; }
        if (x.price && !isFinite(Number(x.price))) { w.push('price is not a number'); x.price = ''; }
        if (x.occasion && occ.indexOf(x.occasion.toLowerCase()) < 0) w.push('occasion "' + x.occasion + '" is not on the list');
        if (x.decision && x.decision !== 'Keep' && x.decision !== 'Delete') w.push('decision must be Keep or Delete');
        if (w.length) warn.push('Row ' + x.row + ': ' + w.join(', '));
        if (x.order_date) n.od++; if (x.occasion) n.oc++; if (x.price) n.price++; if (x.decision === 'Delete') n.del++;
        rows.push(x);
      });
      if (!rows.length) { u.step = 'pick'; u.err = 'No rows with a Record were found in this file.'; view(); return; }
      u.parsed = { rows: rows, warn: warn, n: n }; u.step = 'preview'; view();
    }).catch(function (e) { console.error(e); u.step = 'pick'; u.err = 'This file could not be read. Save it as an Excel file (.xlsx) and try again.'; view(); });
  }
  function upSend() {
    var u = upS(); if (!u.parsed || u.step === 'sending') return; u.step = 'sending'; view();
    sb.rpc('analytics_import_cleaning', { p: { file_name: u.file, file_hash: u.hash, rows: u.parsed.rows } }).then(function (r) {
      var d = r.data || {};
      if (r.error || !d.ok) { u.step = 'preview'; u.err = (d && d.message) || 'The file could not be loaded. Nothing was changed.'; view(); return; }
      u.result = d; u.step = 'done'; u.list = null; upLoad(); dashLoad(true);
    }).catch(function () { u.step = 'preview'; u.err = 'No connection. Nothing was changed. Try again.'; view(); });
  }
  function upUndo(id) {
    var u = upS(); u.undoing = id; view();
    sb.rpc('analytics_import_undo', { p_batch: id }).then(function (r) {
      var d = r.data || {}; u.undoing = null;
      if (r.error || !d.ok) toast((d && d.message) || 'That upload could not be undone.', true); else { toast('Upload undone'); dashLoad(true); }
      u.list = null; upLoad();
    }).catch(function () { u.undoing = null; toast('No connection. Try again.', true); view(); });
  }
  function upView() {
    var u = upS(); if (!u.list && !u.loading && !u.listErr) upLoad();
    var h = '';
    if (u.list && !u.can) h += '<section class="dx-card up-card"><p class="an-none">Your login can see uploads but not load files. A manager can load them.</p></section>';
    else if (u.list) {
      if (u.step === 'pick' || u.step === 'reading') {
        h += '<section class="dx-card up-card"><h3 class="an-ct">Upload a file</h3>' +
          '<label class="up-drop' + (u.step === 'reading' ? ' is-busy' : '') + '"><input type="file" accept=".xlsx" class="up-input" data-dx="up-file" ' + (u.step === 'reading' ? 'disabled' : '') + '>' +
          '<b>' + (u.step === 'reading' ? 'Reading ' + esc(u.file) + '…' : 'Choose an Excel file') + '</b><span>Cake order cleaning sheet (.xlsx)</span></label>' +
          (u.err ? '<p class="ccs-err" role="alert">' + esc(u.err) + '</p>' : '') + '</section>';
      } else if (u.step === 'preview' || u.step === 'sending') {
        var p = u.parsed, n = p.n;
        h += '<section class="dx-card up-card"><h3 class="an-ct">' + esc(u.file) + '</h3><div class="up-stats">' +
          [[int(p.rows.length), 'orders in the file'], [int(n.price), 'with a price'], [int(n.oc), 'with an occasion'], [int(n.od), 'with an order date'], [int(n.del), 'marked Delete']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
          (p.warn.length ? '<div class="up-warn"><b>' + int(p.warn.length) + (p.warn.length === 1 ? ' row needs' : ' rows need') + ' fixing. The rest will load; these will be listed as not loaded.</b><ul>' + p.warn.slice(0, 8).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' + (p.warn.length > 8 ? '<p class="an-none">and ' + (p.warn.length - 8) + ' more</p>' : '') + '</div>' : '<p class="up-ok">Every row passed the checks.</p>') +
          '<p class="an-none">Only values that differ from what the system holds are saved. Live orders are not changed, and the whole upload can be undone.</p>' +
          (u.err ? '<p class="ccs-err" role="alert">' + esc(u.err) + '</p>' : '') +
          '<div class="up-acts"><button type="button" class="ccs-btn ccs-new" data-act="dx-up-send"' + (u.step === 'sending' ? ' disabled' : '') + '>' + (u.step === 'sending' ? 'Loading…' : 'Load ' + int(p.rows.length) + ' rows') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="dx-up-reset">Choose another file</button></div></section>';
      } else if (u.step === 'done') {
        var d = u.result;
        h += '<section class="dx-card up-card"><h3 class="an-ct">Loaded</h3><div class="up-stats">' +
          [[int(d.accepted), 'rows accepted'], [int(d.changes), 'values updated'], [int(d.refused), 'rows not loaded']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
          (d.refused ? '<div class="up-warn"><b>Not loaded</b><ul>' + (d.problems || []).slice(0, 10).map(function (x) { return '<li>Row ' + esc(String(x.row)) + ': ' + esc(x.message) + '</li>'; }).join('') + '</ul></div>' : '') +
          '<p class="an-none">The charts now use these corrections.</p><div class="up-acts"><button type="button" class="ccs-btn ccs-ghost" data-act="dx-up-reset">Upload another file</button></div></section>';
      }
    }
    h += '<section class="dx-card up-card"><h3 class="an-ct">Upload history</h3>';
    if (u.listErr) h += '<p class="ccs-err">' + esc(u.listErr) + '</p>';
    else if (!u.list) h += '<p class="an-none">Loading…</p>';
    else if (!u.list.length) h += '<p class="an-none">No files uploaded yet.</p>';
    else h += '<ul class="up-hist">' + u.list.map(function (b) {
      return '<li class="' + (b.status === 'undone' ? 'is-undone' : '') + '"><div><b>' + esc(b.file || 'File') + '</b><span>' + esc(stamp(b.at)) + (b.by ? ' · ' + esc(b.by) : '') + '</span></div>' +
        '<span class="up-n">' + int(b.ok) + ' rows · ' + int(b.changes) + ' values' + (b.refused ? ' · ' + int(b.refused) + ' not loaded' : '') + '</span>' +
        (b.status === 'undone' ? '<span class="bi-st bi-st-na">Undone ' + esc(stamp(b.undone_at)) + '</span>' : u.can ? '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="dx-up-undo" data-v="' + b.id + '"' + (u.undoing === b.id ? ' disabled' : '') + '>' + (u.undoing === b.id ? 'Undoing…' : 'Undo') + '</button>' : '<span class="bi-st bi-st-ready">Loaded</span>') + '</li>';
    }).join('') + '</ul>';
    return h + '</section>';
  }
  function upAct(a, v) {
    var u = upS();
    if (a === 'dx-up-send') upSend();
    else if (a === 'dx-up-reset') { u.step = 'pick'; u.parsed = null; u.result = null; u.err = null; view(); }
    else if (a === 'dx-up-undo') upUndo(v);
  }
