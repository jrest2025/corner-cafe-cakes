/* Corner Café Service Hub: order tools (26 October 2026).
 * Roneel: "staff is not able to enter future dates of pickup on the order form. also there should be an order
 * cancellation option for any orders with reason" — "Entering a paper slip", "Tap a reason".
 *
 *  1. Cancel order is on the order itself, beside its main buttons. Until now it was only inside the History tab,
 *     under Other actions, where staff never saw it. The button opens the app's own Cancel panel (the app and the
 *     server keep every existing rule: paid orders still need a manager or admin).
 *  2. In that panel staff tap a reason. The note is saved as "<Reason>" or "<Reason>: <extra words>", and the server
 *     records the reason for reports (orders.cancel_reason, supabase/sql/order_cancel_reason_20261026.sql).
 *  3. Old order (from a paper slip) is only for cakes already picked up, so its pickup date stops at yesterday.
 *     Beside that date: "Cake not picked up yet?" with one tap to switch to New order, keeping what was typed and
 *     using the slip date as the day they ordered.
 * Presentation only: no order is saved or changed here except through the app's own buttons. If anything fails,
 * the app works exactly as before.
 */
(function (win, doc) {
  'use strict';
  if (win.__ccOrderTools20261026) return;
  win.__ccOrderTools20261026 = true;

  var REASONS = [
    ['customer_cancelled', 'Customer cancelled'],
    ['duplicate', 'Duplicate order'],
    ['date_unavailable', 'Date or time not available'],
    ['deposit_not_paid', 'Deposit not paid'],
    ['kitchen_cannot_make', 'Kitchen cannot make it'],
    ['other', 'Other']
  ];
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var chosen = null, chosenFor = null;   // the reason tapped, and which order's panel it belongs to

  function warn(where, e) { try { console.warn('[Order tools] ' + where, e); } catch (_) {} }
  function today() {
    try { var t = win.__ccsOf && win.__ccsOf.today && win.__ccsOf.today(); if (ISO.test(t || '')) return t; } catch (_) {}
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
  }
  function draft() { try { return win.__ccsOf && win.__ccsOf.V ? win.__ccsOf.V() : null; } catch (_) { return null; } }
  function redraw() {
    var a = win.__ccsOf; if (!a) return;
    try { if (typeof a.sheet === 'function') a.sheet(); else if (typeof a.redraw === 'function') a.redraw(); } catch (e) { warn('redraw', e); }
  }
  function label(code) { for (var i = 0; i < REASONS.length; i++) if (REASONS[i][0] === code) return REASONS[i][1]; return ''; }
  // Remove a reason label written earlier, so a second try does not repeat it
  function stripLabel(s) {
    s = String(s || '').trim();
    for (var i = 0; i < REASONS.length; i++) {
      var l = REASONS[i][1];
      if (s.toLowerCase() === l.toLowerCase()) return '';
      if (s.toLowerCase().indexOf(l.toLowerCase() + ':') === 0) return s.slice(l.length + 1).trim();
    }
    return s;
  }
  // Which order the sheet shows (its heading carries the order reference)
  function sheetId() { var h = doc.querySelector('#ccs-sheet .ccs-sheet-head h2'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : null; }

  function ensureStyle() {
    if (doc.getElementById('cc-order-tools-style')) return;
    var s = doc.createElement('style');
    s.id = 'cc-order-tools-style';
    s.textContent =
      '#ccs-sheet .cc-ot-cancel{color:#B42318!important;border-color:#E4B4AE!important;background:#fff!important}' +
      '#ccs-sheet .cc-ot-cancel:hover{background:#FEF3F2!important}' +
      '#ccs-sheet .cc-ot-reasons{margin:12px 0 4px}' +
      '#ccs-sheet .cc-ot-reasons .sl-k,#ccs-sheet .cc-ot-q{display:block;margin:0 0 8px;font-weight:600;color:#1D2939}' +
      '#ccs-sheet .cc-ot-chips{display:flex;flex-wrap:wrap;gap:8px}' +
      '#ccs-sheet .cc-ot-chips .ccs-chip{min-height:48px;white-space:normal;text-align:left}' +
      '#ccs-sheet .cc-ot-err{color:#B42318;font-weight:600;margin:8px 0 0}' +
      '#cc-staff .cc-ot-notyet,#ccs-sheet .cc-ot-notyet{margin:12px 0;padding:14px 16px;border:1px solid #C9D6E3;border-radius:12px;background:#F5F8FB;color:#1D2939}' +
      '#cc-staff .cc-ot-notyet p,#ccs-sheet .cc-ot-notyet p{margin:0 0 10px;line-height:1.4}' +
      '#cc-staff .cc-ot-notyet .ccs-btn,#ccs-sheet .cc-ot-notyet .ccs-btn{min-height:48px}' +
      '@media (hover:none) and (pointer:coarse){#ccs-sheet .cc-ot-chips .ccs-chip,#cc-staff .cc-ot-notyet .ccs-btn,#ccs-sheet .cc-ot-notyet .ccs-btn{min-height:56px}}';
    doc.head.appendChild(s);
  }

  // ---------- 1. Cancel order beside the main buttons ----------
  // Shown only where the app itself offers order changes (Confirm, Quote, Change order or Order completed), which
  // means an open order and a login with order rights. The app's own panel and the server decide the rest.
  function addCancelButton() {
    var sheet = doc.getElementById('ccs-sheet'); if (!sheet) return;
    if (sheet.querySelector('[data-act="do-cancel"]')) return;            // a panel is open
    if (sheet.querySelector('.cc-ot-cancel')) return;
    var signal = sheet.querySelector('.ccs-actions-row [data-act="panel"][data-v="confirm"],.ccs-actions-row [data-act="panel"][data-v="quote"],.ccs-actions-row [data-act="panel"][data-v="amend"],.ccs-actions-row [data-act="panel"][data-v="collected"]');
    if (!signal) return;
    var row = signal.closest('.ccs-actions-row'); if (!row) return;
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'ccs-btn ccs-ghost cc-ot-cancel';
    b.setAttribute('data-act', 'panel');
    b.setAttribute('data-v', 'cancel');
    b.textContent = 'Cancel order';
    row.appendChild(b);
  }

  // ---------- 2. Tap a reason in the Cancel panel ----------
  function enhancePanel() {
    var go = doc.querySelector('#ccs-sheet [data-act="do-cancel"]'); if (!go) { chosen = null; chosenFor = null; return; }
    var panel = go.closest('.ccs-panel'); if (!panel || panel.querySelector('.cc-ot-reasons')) return;
    var note = panel.querySelector('#ccs-note'); if (!note) return;
    var id = sheetId();
    if (chosenFor !== id) { chosen = null; chosenFor = id; }
    var field = note.closest('.ccs-field') || note.parentElement;
    var box = doc.createElement('div');
    box.className = 'cc-ot-reasons';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Why is it cancelled?');
    var q = doc.createElement('span'); q.className = 'cc-ot-q'; q.textContent = 'Why is it cancelled? (required)';
    var chips = doc.createElement('div'); chips.className = 'cc-ot-chips';
    REASONS.forEach(function (r) {
      var c = doc.createElement('button');
      c.type = 'button'; c.className = 'ccs-chip'; c.setAttribute('data-cc-reason', r[0]);
      c.setAttribute('aria-pressed', String(chosen === r[0])); c.textContent = r[1];
      chips.appendChild(c);
    });
    box.appendChild(q); box.appendChild(chips);
    field.parentNode.insertBefore(box, field);
    note.value = stripLabel(note.value);
    relabel(panel);
  }
  function relabel(panel) {
    var l = panel.querySelector('label[for="ccs-note"]'); if (!l) return;
    l.textContent = chosen === 'other' ? 'What happened? (required)' : 'Anything to add? (optional)';
  }
  function showErr(panel, msg) {
    var e = panel.querySelector('.cc-ot-err');
    if (!e) { e = doc.createElement('p'); e.className = 'cc-ot-err'; e.setAttribute('role', 'alert'); var box = panel.querySelector('.cc-ot-reasons'); (box || panel).appendChild(e); }
    e.textContent = msg;
  }

  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var c = t.closest('#ccs-sheet [data-cc-reason]');
    if (c) {
      e.preventDefault(); e.stopPropagation();
      chosen = c.getAttribute('data-cc-reason'); chosenFor = sheetId();
      var panel = c.closest('.ccs-panel');
      [].forEach.call(panel.querySelectorAll('[data-cc-reason]'), function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      var er = panel.querySelector('.cc-ot-err'); if (er) er.remove();
      relabel(panel);
      if (chosen === 'other') { var n = panel.querySelector('#ccs-note'); if (n) n.focus(); }
      return;
    }
    var go = t.closest('#ccs-sheet [data-act="do-cancel"]');
    if (go) {
      var p = go.closest('.ccs-panel'), note = p && p.querySelector('#ccs-note');
      if (!p || !note || !p.querySelector('.cc-ot-reasons')) return;     // panel not enhanced: the app's own check runs
      var extra = stripLabel(note.value);
      if (!chosen) { e.preventDefault(); e.stopImmediatePropagation(); showErr(p, 'Tap why it is cancelled.'); return; }
      if (chosen === 'other' && extra.length < 3) { e.preventDefault(); e.stopImmediatePropagation(); showErr(p, 'Write what happened.'); note.focus(); return; }
      note.value = label(chosen) + (extra ? ': ' + extra : '');            // the app sends this note; the server reads the reason
    }
  }, true);

  // ---------- 3. Old order: cake not picked up yet ----------
  function addNotYet() {
    var V = draft(); if (!V || !V.old) return;
    var input = doc.querySelector('#ccs-slipform #n-date, #ccs-sheet #n-date'); if (!input) return;
    var row = input.closest('.ccs-row') || input.parentElement;
    if (!row || (row.nextElementSibling && row.nextElementSibling.classList.contains('cc-ot-notyet'))) return;
    var box = doc.createElement('div');
    box.className = 'cc-ot-notyet';
    box.innerHTML = '<p><b>Cake not picked up yet?</b> Then it is a New order. Everything typed so far stays, and the slip date is used as the day they ordered.</p>' +
      '<button type="button" class="ccs-btn" data-cc-notyet="1">Switch to New order</button>';
    row.parentNode.insertBefore(box, row.nextSibling);
  }
  function switchToNew() {
    var V = draft(); if (!V || !V.old) return;
    var slip = V.takenDate, by = V.takenBy, t = today();
    var oo = win.CCOldOrders;
    if (!oo || typeof oo._setMode !== 'function') { var b = doc.querySelector('#cc-staff [data-oo-mode="new"], #ccs-sheet [data-oo-mode="new"]'); if (b) b.click(); }
    else oo._setMode(false);
    V = draft(); if (!V || V.old) return;
    if (ISO.test(slip || '') && slip < t) { V.taken = 'other'; V.takenDate = slip; }
    else { V.taken = 'now'; V.takenDate = ''; }
    if (by) V.takenBy = by;
    redraw();
    setTimeout(function () {
      var d = doc.querySelector('#ccs-slipform [data-act="n-date-other"], #ccs-slipform .ccs-datechips, #ccs-slipform #n-date');
      if (d && d.scrollIntoView) d.scrollIntoView({ block: 'center' });
    }, 60);
  }
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-cc-notyet]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    try { switchToNew(); } catch (x) { warn('switch to new order', x); }
  }, true);

  // ---------- keep up with the app's redraws ----------
  var queued = false;
  function run() {
    queued = false;
    try { ensureStyle(); addCancelButton(); enhancePanel(); addNotYet(); } catch (e) { warn('update', e); }
  }
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(run); }
  function boot() { run(); new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(window, document);
