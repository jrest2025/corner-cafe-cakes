  // ---------- cake register (managers review; managers, finance and marketing can open records) ----------
  // The register holds every cake order from both Google Sheets, the website and this app. Nothing here edits an order or a sheet:
  // a manager only decides how a flagged record counts (same order, different orders, details right, or leave out). Every decision is logged.
  var RG = null;
  var RG_FLAG = {
    identical_row: 'Typed into the sheet twice: every cell matches another row',
    possible_duplicate: 'Same phone, pickup date, cake and size as another order',
    imported_twice: 'An older imported order that no longer matches its sheet row (phone or date differ)',
    no_fulfilment_date: 'No pickup date in the sheet',
    conflicting_dates: 'Two different dates in the date columns',
    order_after_fulfilment: 'Order date is after the pickup date',
    possible_test: 'Looks like a test entry',
    removed_from_sheet: 'This row has been removed from the sheet',
    not_found_in_sheet: 'An older imported order whose sheet row cannot be found',
    test_order: 'Marked as a test order', deleted_in_app: 'Deleted in the app', no_longer_in_source: 'The original record no longer exists'
  };
  var RG_DUP = ['identical_row', 'possible_duplicate', 'imported_twice'];
  var RG_DEC = { not_duplicate: 'Different orders', duplicate: 'Same order, left out', exclude: 'Left out', accept: 'Details accepted', undo: 'Decision undone' };
  function rgState() { if (!RG) RG = { data: null, loading: false, err: null, open: null, note: '', noteFor: null, err2: null, raw: {} }; return RG; }
  function regLoad(force) {
    var g = rgState(); if (g.loading) return; if (g.data && !force) { view(); return; }
    g.loading = true; g.err = null; view();
    sb.rpc('register_review_list').then(function (r) {
      g.loading = false; if (r.error) throw r.error;
      if (!r.data || !r.data.ok) g.err = (r.data && r.data.message) || 'The register could not load.'; else g.data = r.data;
      if (S.tab === 'register') view();
    }).catch(function (e) { console.error(e); g.loading = false; if (errKind(e) === 'expired') return sessionExpired(); g.err = 'The register could not load. Check the connection and try again.'; if (S.tab === 'register') view(); });
    cmLoad();
  }
  // ---------- which customer each old sheet order belongs to ----------
  // Clear cases (a full Fiji mobile already on exactly one profile with the same name, or on no profile) are done automatically.
  // Everything else waits here. Nothing on the sheet is changed; a link only puts the sheet order on the customer's profile.
  var CM_HOW = { auto_match: 'Linked automatically', auto_new: 'New profile made automatically', staff_link: 'Linked to', staff_new: 'New profile made', left_unlinked: 'Left without a profile' };
  function cmLoad() {
    var g = rgState(); if (!can('manager')) return; g.cm = g.cm || { data: null, err: null, open: null, msg: null, matches: null, phone: '', note: '' };
    sb.rpc('register_customer_review').then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.ok) g.cm.err = (r.data && r.data.message) || 'Customer matching could not load.'; else { g.cm.data = r.data; g.cm.err = null; }
      if (S.tab === 'register') view();
    }).catch(function (e) { console.error(e); g.cm.err = 'Customer matching could not load. Check the connection and try again.'; if (S.tab === 'register') view(); });
  }
  function cmCard(c) {
    var m = RG.cm, k = c.rec_key, opening = m.open === k;
    var h = '<article class="ccs-box rg-card cm-card"><div class="rg-top"><div><b class="ccs-big">' + esc(c.customer || 'No name') + (c.reference ? ' · ' + esc(c.reference) : '') + '</b><p class="ccs-hint">' + esc(rgWhere(c)) + ' · ' + esc(rgLine(c)) + '</p></div>' +
      '<button type="button" class="ccs-link" data-act="rg-open" data-v="' + esc(k) + '">Full record</button></div>';
    h += '<dl class="ccs-kv">' + kv('Mobile on the sheet', (c.phone || '') + (c.phone_ok ? '' : ' (not a full mobile number)')) + kv('Email on the sheet', c.email) + '</dl>';
    if (c.staff_email) h += '<p class="ccs-hint">The sheet has a staff email for this order. It will not be copied to the customer.</p>';
    if (c.candidates.length) h += '<div class="rg-pair"><p class="ccs-label">Possible profile' + (c.candidates.length > 1 ? 's' : '') + '</p><ul class="ccs-plain">' + c.candidates.map(function (p) {
      return '<li><b>' + esc(custNo(p.customer_no)) + ' ' + esc(p.full_name) + '</b> · ' + esc([p.phone, p.email].filter(Boolean).join(' · ')) + ' (' + esc(p.why) + ')' +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="rg-cm-link" data-k="' + esc(k) + '" data-v="' + esc(p.id) + '">Same person, link</button><button type="button" class="ccs-link" data-act="open-customer" data-id="' + esc(p.id) + '">Open profile</button></div></li>';
    }).join('') + '</ul></div>';
    else h += '<p class="ccs-hint">No profile has this mobile or email.</p>';
    if (opening) {
      h += '<div class="ccs-panel"><b>New customer profile for ' + esc(c.customer || '') + '</b><div class="ccs-field"><label class="ccs-label" for="cm-phone">Mobile number</label><input class="ccs-input" id="cm-phone" inputmode="tel" value="' + esc(m.phone) + '" placeholder="' + (c.phone_ok ? '' : 'Check the number with the customer or the order') + '"></div>' +
        '<p class="ccs-hint">' + (c.phone_ok ? 'Taken from the sheet. Change it only if it is wrong.' : 'The number on the sheet is incomplete, so it is not filled in. Leave blank to use only the email.') + '</p>' +
        (m.matches ? '<div class="ccs-warn"><b>That number or email is already on a profile.</b> Link to it instead.<ul class="ccs-plain">' + m.matches.map(function (p) { return '<li>' + esc(custNo(p.customer_no)) + ' ' + esc(p.full_name) + ' <button type="button" class="ccs-link" data-act="rg-cm-link" data-k="' + esc(k) + '" data-v="' + esc(p.id) + '">Link to this profile</button></li>'; }).join('') + '</ul></div>' : '') +
        (m.msg ? '<p class="ccs-err">' + esc(m.msg) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="rg-cm-new" data-k="' + esc(k) + '">Make the profile</button><button type="button" class="ccs-btn ccs-ghost" data-act="rg-cm-back">Back</button></div></div>';
    } else {
      h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="rg-cm-open" data-k="' + esc(k) + '">' + (c.candidates.length ? 'Different person, new profile' : 'Make a new profile') + '</button>' +
        '<button type="button" class="ccs-link" data-act="rg-cm-none" data-k="' + esc(k) + '">Leave without a profile</button></div>';
    }
    return h + '</article>';
  }
  function cmView() {
    var m = RG && RG.cm; if (!m || !can('manager')) return '';
    var h = '<h2 class="rg-h">Customers to match</h2>';
    if (m.err) return h + '<p class="ccs-err">' + esc(m.err) + '</p>';
    if (!m.data) return h + '<p class="ccs-loading">Loading…</p>';
    var d = m.data;
    h += d.pending.length ? '<p class="ccs-hint">Old sheet orders that could not be matched to a customer automatically. Linking puts the order on the customer\'s profile. A name alone is never enough: check the number, email or the order itself. Nothing on the sheet changes.</p>' + d.pending.map(cmCard).join('')
      : '<p class="ccs-quiet">Every sheet order with a mobile number is on a customer profile or was left without one.</p>';
    if (d.no_phone) h += '<p class="ccs-hint">' + int(d.no_phone) + ' sheet order' + (d.no_phone === 1 ? ' has' : 's have') + ' no mobile number. They still count in the figures, without a customer profile.</p>';
    if (d.recent.length) h += '<details class="ccs-more"><summary>Customer matches made (' + d.recent.length + ')</summary><div class="ccs-history">' + d.recent.map(function (x) {
      return '<div><span>' + esc(when(x.at)) + '</span><span><b style="font-weight:600;color:var(--ccs-ink)">' + esc(x.reference || '') + '</b> ' + esc(x.name_on_sheet || '') + ': ' + esc(CM_HOW[x.how] || x.how) +
        (x.customer_no ? ' ' + esc(custNo(x.customer_no)) + ' ' + esc(x.customer || '') : '') + ' · ' + esc(x.by || 'Unknown') +
        ' <button type="button" class="ccs-link" data-act="rg-cm-undo" data-k="' + esc(x.rec_key) + '">Undo</button></span></div>';
    }).join('') + '</div></details>';
    return h;
  }
  function cmDecide(k, action, cust, phone, note) {
    var m = RG.cm; if (S.busy) return; S.busy = true; m.msg = null;
    return sb.rpc('register_customer_decide', { p_rec_key: k, p_action: action, p_customer: cust || null, p_note: note || null, p_phone: phone || null }).then(function (r) {
      S.busy = false; clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) {
        if (r.data.error === 'possible_duplicate') { m.matches = r.data.matches || []; m.msg = null; } else { m.msg = r.data.message; if (m.open !== k) toast(r.data.message, true); }
        view(); return;
      }
      toast({ link: 'Linked to the profile', new: 'New profile made', none: 'Left without a profile', undo: 'Undone. The record is back in the list. Any profile made for it stays' }[action]);
      m.open = null; m.matches = null; m.phone = ''; cmLoad();
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function rgRaw(raw) {
    var cells = (raw || []).map(function (v, i) { return [i, String(v == null ? '' : v).trim()]; }).filter(function (x) { return x[1]; });
    return cells.length ? '<dl class="ccs-kv rg-raw">' + cells.map(function (x) { return '<dt>Column ' + colName(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' : '<p class="ccs-hint">No sheet row.</p>';
  }
  function rgWhere(c) { return c.source + (c.sheet_row ? ', row ' + c.sheet_row : ''); }
  function rgLine(c) {
    return [c.cake ? c.cake + (c.size_inch ? ' ' + c.size_inch + ' inch' : '') : 'Cake not stated', c.fulfil_date ? 'pickup ' + nice(c.fulfil_date) + ' ' + c.fulfil_date.slice(0, 4) : 'no pickup date',
      c.order_date ? 'ordered ' + nice(c.order_date) + ' ' + c.order_date.slice(0, 4) : ''].filter(Boolean).join(' · ');
  }
  function rgMoney(c) { return c.confirmed_value != null ? money(c.confirmed_value) + ' agreed' : c.list_value != null ? money(c.list_value) + ' list price' : 'No price'; }
  function rgCard(c) {
    var g = RG, isDup = c.flags.some(function (f) { return RG_DUP.indexOf(f) > -1; }) && c.other, k = c.rec_key, asking = g.noteFor && g.noteFor[0] === k;
    var h = '<article class="ccs-box rg-card"><div class="rg-top"><div><b class="ccs-big">' + esc(c.reference || 'No reference') + ' · ' + esc(c.customer || 'No name') + '</b><p class="ccs-hint">' + esc(rgWhere(c)) + ' · ' + esc(rgLine(c)) + ' · ' + esc(rgMoney(c)) + '</p></div>' +
      '<button type="button" class="ccs-link" data-act="rg-open" data-v="' + esc(k) + '">Full record</button></div>' +
      '<ul class="rg-flags">' + c.flags.map(function (f) { return '<li>' + esc(RG_FLAG[f] || f) + '</li>'; }).join('') + '</ul>';
    if (c.other) h += '<div class="rg-pair"><p class="ccs-label">Possible match</p><p><b>' + esc(c.other.reference || '') + ' · ' + esc(c.other.customer || '') + '</b></p><p class="ccs-hint">' + esc(rgWhere(c.other)) + ' · ' + esc(rgLine(c.other)) + '</p>' +
      '<button type="button" class="ccs-link" data-act="rg-open" data-v="' + esc(c.other.rec_key) + '">Open the match</button></div>';
    if (c.raw) h += g.raw[k] ? '<div class="rg-rawbox"><p class="ccs-label">The sheet row as typed</p>' + rgRaw(c.raw) + '<button type="button" class="ccs-link" data-act="rg-raw" data-v="' + esc(k) + '">Hide sheet row</button></div>' : '<button type="button" class="ccs-link" data-act="rg-raw" data-v="' + esc(k) + '">Show the sheet row as typed</button>';
    if (asking) {
      var what = g.noteFor[1] === 'duplicate' ? 'Leave this one out as a copy of ' + (c.other ? c.other.reference : 'the match') : 'Leave this record out of every figure';
      h += '<div class="ccs-panel"><b>' + esc(what) + '</b><div class="ccs-field"><label class="ccs-label" for="rg-note">Reason (required)</label><textarea class="ccs-input" id="rg-note" data-autofocus placeholder="' + (g.noteFor[1] === 'duplicate' ? 'For example: same customer and cake, entered online and at the counter' : 'For example: test entry, or order never went ahead') + '">' + esc(g.note || '') + '</textarea></div>' +
        (g.err2 ? '<p class="ccs-err">' + esc(g.err2) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="rg-do" data-v="' + g.noteFor[1] + '" data-k="' + esc(k) + '">Leave out</button><button type="button" class="ccs-btn ccs-ghost" data-act="rg-cancel">Back</button></div></div>';
    } else {
      h += '<div class="ccs-actions-row">' + (isDup ? '<button type="button" class="ccs-btn ccs-ghost" data-act="rg-ask" data-v="duplicate" data-k="' + esc(k) + '">Same order, leave this one out</button><button type="button" class="ccs-btn ccs-ghost" data-act="rg-do" data-v="not_duplicate" data-k="' + esc(k) + '">Different orders, count both</button>'
        : '<button type="button" class="ccs-btn ccs-ghost" data-act="rg-do" data-v="accept" data-k="' + esc(k) + '">Details are right, count it</button>') +
        '<button type="button" class="ccs-link ccs-red" data-act="rg-ask" data-v="exclude" data-k="' + esc(k) + '">Leave out</button></div>';
    }
    return h + '</article>';
  }
  function regView() {
    var g = rgState(), d = g.data;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Cake register</h1><p class="ccs-sub">Every cake order from both sheets, the website and this app, in one list. The dashboard counts only what is here.</p>' + (d ? dxSync(d.sync, true) : '') + '</div>' +
      '<div class="dx-acts"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="rg-refresh">Refresh</button></div></div>';
    if (g.err) return h + '<div class="ccs-empty"><b>' + esc(g.err) + '</b><button type="button" class="ccs-btn" data-act="rg-refresh">Try again</button></div>';
    if (!d) return h + '<p class="ccs-loading">Loading the register…</p>';
    var sy = d.sync || {};
    h += '<div class="ccs-kpis dx-kpis dx-kpis-s">' + dxKpi('Orders counted', int(sy.records - sy.needs_review), 'In the dashboard figures', null) + dxKpi('Waiting for review', int(sy.needs_review), sy.needs_review ? 'Not counted until decided' : 'Nothing to check', null, null, sy.needs_review ? 'action' : 'good') +
      dxKpi('Left out', int(sy.excluded), 'Tests, copies and records left out', null) + '</div>';
    h += '<h2 class="rg-h">Waiting for review</h2>';
    h += d.records.length ? '<p class="ccs-hint">Check each one against the sheet or the order. Your decision is kept with your name and survives every later sheet update. Nothing in the sheets or orders is changed.</p>' + d.records.map(rgCard).join('') : '<p class="ccs-quiet">Nothing waiting. Every record is counted or left out with a reason.</p>';
    h += cmView();
    if (d.recent.length) h += '<h2 class="rg-h">Recent decisions</h2><div class="ccs-history">' + d.recent.map(function (x) {
      return '<div><span>' + esc(when(x.at)) + '</span><span><b style="font-weight:600;color:var(--ccs-ink)">' + esc(x.reference || '') + '</b> ' + esc(RG_DEC[x.decision] || x.decision) + (x.note ? ': ' + esc(x.note) : '') + ' · ' + esc(x.by || 'Unknown') +
        ' <button type="button" class="ccs-link" data-act="rg-undo" data-k="' + esc(x.rec_key) + '">Undo</button></span></div>';
    }).join('') + '</div>';
    return h;
  }
  function regDecide(k, dec, note) {
    var g = rgState(); if (S.busy) return; S.busy = true; g.err2 = null;
    return sb.rpc('register_decide', { p_rec_key: k, p_decision: dec, p_note: note || null }).then(function (r) {
      S.busy = false; clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { g.err2 = r.data.message; if (!g.noteFor) toast(r.data.message, true); view(); return; }
      toast((r.data.reference || 'Record') + ': ' + (RG_DEC[dec] || 'saved').toLowerCase());
      g.noteFor = null; if (DX) DX.data = null; regLoad(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  // One register record with its full history, opened from the review list or the dashboard
  function regOpen(k) {
    S.sheet = { type: 'reg', k: k, data: null }; S.panel = null; S.dirty = {}; sheetOpen(); renderSheet();
    sb.rpc('register_record', { p_rec_key: k }).then(function (r) {
      if (r.error) throw r.error; if (!S.sheet || S.sheet.k !== k) return;
      if (!r.data.ok || !r.data.record) { S.sheet.err = (r.data && r.data.message) || 'That record was not found.'; } else S.sheet.data = r.data;
      renderSheet();
    }).catch(fail);
  }
  function rgChange(ch) {
    return Object.keys(ch || {}).map(function (f) {
      var v = ch[f];
      if (f === 'added') return 'Added to the register';
      if (f === 'removed') return String(v);
      if (f === 'replaced_by') return 'Merged into its sheet row';
      if (f === 'decision') return 'Review: ' + (RG_DEC[v] || v) + (ch.note ? ' (' + ch.note + ')' : '');
      if (f === 'note') return '';
      var lbl = f.replace(/_/g, ' '), show = function (x) { return x == null || x === '' ? 'blank' : Array.isArray(x) ? (x.length ? x.join(', ') : 'none') : String(x); };
      return v && typeof v === 'object' && 'from' in v ? lbl + ': ' + show(v.from) + ' to ' + show(v.to) : lbl;
    }).filter(Boolean).join('; ');
  }
  function regSheet() {
    var x = S.sheet;
    if (x.err) return sheetHead('Register record') + '<div class="ccs-sheet-body"><p class="ccs-err">' + esc(x.err) + '</p></div>';
    if (!x.data) return sheetHead('Loading…') + '<div class="ccs-sheet-body"><p class="ccs-loading">Loading the record…</p></div>';
    var c = x.data.record, st = { ok: 'Counted', needs_review: 'Waiting for review', duplicate: 'Left out as a copy', excluded: 'Left out' }[c.review] || c.review;
    var h = sheetHead(esc(c.reference || 'Register record'), '<span class="ccs-pill' + (c.review === 'ok' ? ' s-good' : c.review === 'needs_review' ? ' s-action' : ' s-off') + '">' + esc(st) + '</span>') + '<div class="ccs-sheet-body">';
    if (c.order_id && can('manager', 'front_of_house', 'finance', 'marketing')) h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="open-order" data-id="' + esc(c.order_id) + '">Open the order</button></div>';
    if (c.flags.length) h += '<section class="ccs-box"><h3>Flags</h3><ul class="rg-flags">' + c.flags.map(function (f) { return '<li>' + esc(RG_FLAG[f] || f) + '</li>'; }).join('') + '</ul>' + (c.other ? '<p class="ccs-hint">Matches ' + esc(c.other.reference || '') + ', ' + esc(rgWhere(c.other)) + '.</p>' : '') + '</section>';
    h += '<section class="ccs-box"><h3>Order</h3><dl class="ccs-kv">' + kv('Customer', c.customer) + kv('Mobile', c.phone_key) + kv('Recorded in', rgWhere(c)) + kv('Channel', c.channel) +
      kv('Order date', c.order_date ? nice(c.order_date) + ' ' + c.order_date.slice(0, 4) + ' (' + c.order_date_basis + ')' : 'Not known') +
      kv('Pickup', c.fulfil_date ? nice(c.fulfil_date) + ' ' + c.fulfil_date.slice(0, 4) + (c.fulfil_time ? ' at ' + t12(c.fulfil_time) : '') + (c.method === 'delivery' ? ', delivery' : '') : 'Not given') +
      kv('Cake', [c.cake, c.size_inch ? c.size_inch + ' inch' : ''].filter(Boolean).join(', ')) + kv('Value', rgMoney(c)) + kv('Status', (REG_ST[c.status] || c.status) + (c.status_note ? ' (sheet: ' + c.status_note + ')' : '')) +
      kv('Taken by', c.staff_member) + '</dl>' + (c.warnings.length ? '<p class="ccs-hint">Counted, but note: ' + esc(c.warnings.join('. ')) + '.</p>' : '') + '</section>';
    if (c.raw) h += '<section class="ccs-box"><h3>The sheet row as typed</h3>' + rgRaw(c.raw) + (x.data.versions.length > 1 ? '<p class="ccs-hint">This row has been changed in the sheet ' + (x.data.versions.length - 1) + (x.data.versions.length === 2 ? ' time' : ' times') + '. Earlier versions are kept.</p>' : '') + '</section>';
    h += '<section class="ccs-box"><h3>History</h3>' + (x.data.history.length ? '<div class="ccs-history">' + x.data.history.map(function (e) {
      return '<div><span>' + esc(when(e.at)) + '</span><span style="color:var(--ccs-ink)">' + esc(rgChange(e.changes) || 'Updated') + ' · ' + esc(e.by || (e.source === 'sheet' || /sheet|load/.test(e.source) ? 'Sheet update' : 'System')) + '</span></div>';
    }).join('') + '</div>' : '<p class="ccs-hint">No changes since it was added.</p>') + '</section>';
    return h + '</div>';
  }
  function regAct(a, b, v) {
    var g = rgState(), k = b.dataset.k;
    if (a === 'rg-refresh') regLoad(true);
    else if (a === 'rg-open') regOpen(v);
    else if (a === 'rg-raw') { g.raw[v] = !g.raw[v]; view(); }
    else if (a === 'rg-ask') { g.noteFor = [k, v]; g.err2 = null; g.note = ''; view(); var n = document.getElementById('rg-note'); if (n) n.focus(); }
    else if (a === 'rg-cancel') { g.noteFor = null; g.err2 = null; view(); }
    else if (a === 'rg-do') { var note = g.noteFor && g.noteFor[0] === k ? val('rg-note').trim() : null; g.note = note || ''; if ((v === 'duplicate' || v === 'exclude') && (!note || note.length < 3)) { g.err2 = 'Add a short reason.'; view(); return; } markBusy(b, 'Saving…'); regDecide(k, v, note); }
    else if (a === 'rg-cm-link') { markBusy(b, 'Linking…'); cmDecide(k, 'link', v); }
    else if (a === 'rg-cm-open') { var pc = (g.cm.data.pending.filter(function (x) { return x.rec_key === k; })[0]) || {}; g.cm.open = k; g.cm.matches = null; g.cm.msg = null; g.cm.phone = pc.phone_ok ? pc.phone : ''; view(); var pf = document.getElementById('cm-phone'); if (pf) pf.focus(); }
    else if (a === 'rg-cm-back') { g.cm.open = null; g.cm.matches = null; g.cm.msg = null; view(); }
    else if (a === 'rg-cm-new') { g.cm.phone = val('cm-phone').trim(); markBusy(b, 'Saving…'); cmDecide(k, 'new', null, g.cm.phone); }
    else if (a === 'rg-cm-none' || a === 'rg-cm-undo') {
      var lbl = a === 'rg-cm-none' ? 'Leave without a profile' : 'Undo';
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = a === 'rg-cm-none' ? 'Tap again to confirm' : 'Tap again to undo'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = lbl; } }, 4000); return; }
      markBusy(b, 'Saving…'); cmDecide(k, a === 'rg-cm-none' ? 'none' : 'undo');
    }
    else if (a === 'rg-undo') {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to undo'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Undo'; } }, 4000); return; }
      markBusy(b, 'Undoing…'); regDecide(k, 'undo');
    }
  }
