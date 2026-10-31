/* Corner Café: shared frame (31 Oct 2026, cleanup stage 3). One queue for the add-ons' screen passes: they all run in the
 * same frame, before the screen is drawn, and a pass that changes the page lets the others react in that same frame
 * (at most 8 rounds), instead of each waiting its own frame or 30 to 60 ms (a visible flash of the unfinished screen). */
(function (w) {
  if (w.__ccFrame) return;
  var q = [], pending = false, inFrame = false, rounds = 0, raf = w.requestAnimationFrame ? w.requestAnimationFrame.bind(w) : function (f) { return setTimeout(f, 16); };
  function drain() {
    if (!q.length) return;
    if (++rounds > 8) { var later = q; q = []; later.forEach(function (f) { f.__ccq = 0; }); raf(function () { later.forEach(function (f) { w.__ccFrame(f); }); }); return; }
    var list = q; q = [];
    for (var i = 0; i < list.length; i++) { list[i].__ccq = 0; try { list[i](); } catch (e) { if (w.console) console.warn('[Corner Café frame]', e); } }
  }
  w.__ccFrame = function (f) {
    if (f.__ccq) return; f.__ccq = 1; q.push(f);
    if (inFrame) { Promise.resolve().then(drain); return; }
    if (pending) return; pending = true;
    raf(function () { pending = false; inFrame = true; rounds = 0; setTimeout(function () { inFrame = false; }, 0); drain(); });
  };
})(window);
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
 *  4. (Later the same day, "make it as user friendly as possible without destroying the underlying logic")
 *     Plain words: "Cake still to come" / "Cake already picked up" instead of New order / Old order.
 *  5. One way to choose a later date: "Other date" becomes "Later date" and opens the calendar in one tap.
 *  6. Help text at 17px on tablets and 16px on phones (computers unchanged).
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
      '#ccs-sheet .cc-ot-chips .ccs-chip{white-space:normal;text-align:left}' +
      '#ccs-sheet .cc-ot-err{color:#B42318;font-weight:600;margin:8px 0 0}' +
      '#cc-staff .cc-ot-notyet,#ccs-sheet .cc-ot-notyet{margin:12px 0;padding:14px 16px;border:1px solid #C9D6E3;border-radius:12px;background:#F5F8FB;color:#1D2939}' +
      '#cc-staff .cc-ot-notyet p,#ccs-sheet .cc-ot-notyet p{margin:0 0 10px;line-height:1.4}' +
      '';   // tap sizes on touch screens come from the app's own touch standard, like every other button
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
    box.innerHTML = '<p><b>Cake not picked up yet?</b> Switch to Cake still to come. Everything typed so far stays, and the slip date is kept as the day they ordered.</p>' +
      '<button type="button" class="ccs-btn" data-cc-notyet="1">Switch to Cake still to come</button>';
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

  // ---------- 4. Plain words (26 October 2026, "make it as user friendly as possible") ----------
  // Only the words on screen change. The buttons, their data and every rule behind them stay the app's own.
  var WORDS = {
    modeNew: ['Cake still to come', 'Ordering now, or a paper slip for a later pickup'],
    modeOld: ['Cake already picked up', 'Typing in an old paper slip'],
    titleOld: 'Paper slip: cake already picked up'
  };
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function plainWords() {
    // "Mobile number" reads "Customer mobile number" (Roneel, 26 Oct 2026). Text only: the field, its checks and
    // the "Required" tag stay the app's own.
    [].forEach.call(doc.querySelectorAll('#ccs-slipform label[for="n-phone"], #ccs-sheet label[for="n-phone"]'), function (l) {
      var n = l.firstChild; if (n && n.nodeType === 3 && /^\s*Mobile number\s*$/.test(n.nodeValue)) n.nodeValue = 'Customer mobile number ';
    });
    [].forEach.call(doc.querySelectorAll('#ccs-slipform #n-phone, #ccs-sheet #n-phone'), function (i) {
      if (i.getAttribute('placeholder') === 'Mobile number') i.setAttribute('placeholder', 'Customer mobile number');
    });
    [['new', WORDS.modeNew], ['old', WORDS.modeOld]].forEach(function (m) {
      [].forEach.call(doc.querySelectorAll('[data-oo-mode="' + m[0] + '"]'), function (b) {
        setText(b.querySelector('b'), m[1][0]); setText(b.querySelector('small'), m[1][1]);
      });
    });
    [].forEach.call(doc.querySelectorAll('#ccs-sheet .ccs-sheet-head h2, #cc-staff .ccs-title, #ccs-sheet .ccs-title'), function (h) {
      var t = h.textContent.trim();
      if (t === 'Old order from a paper slip') h.textContent = WORDS.titleOld;
      else if (t === 'Old order saved') h.textContent = 'Paper slip saved';
    });
    [].forEach.call(doc.querySelectorAll('[data-oo-next]'), function (b) { if (/next old order/i.test(b.textContent)) setText(b, 'Enter the next paper slip'); });
    // Reword one message in place (text only, so anything else in the message box stays)
    var OLD_MSG = 'An old order was picked up before today. For today or a later date, choose New order at the top';
    var NEW_MSG = 'This paper slip is for a cake already picked up, so the pickup date must be before today. Cake not picked up yet? Choose Cake still to come at the top';
    [].forEach.call(doc.querySelectorAll('#ccs-slipform .ccs-err, #ccs-sheet .ccs-err'), function (e) {
      if (e.textContent.indexOf(OLD_MSG) < 0) return;
      var w = doc.createTreeWalker(e, 4), n;
      while ((n = w.nextNode())) if (n.nodeValue.indexOf(OLD_MSG) > -1) n.nodeValue = n.nodeValue.replace(OLD_MSG, NEW_MSG);
    });
  }

  // ---------- 5. One way to choose a later date ----------
  // The next 7 days and the short-notice buttons stay. "Other date" becomes "Later date" and opens the calendar
  // straight away; the date field under it is labelled "Pickup date". The app's own date limits stay in force.
  var openAfterTap = false;
  function laterDate() {
    var form = doc.querySelector('#ccs-slipform'); if (!form) return;
    var V = draft(); if (V && V.old) return;
    var other = form.querySelector('[data-act="n-date-other"]');
    if (other && !other.querySelector('.cc-ot-later')) {
      other.innerHTML = '<span class="cc-ot-later"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>Later date</span>';
      other.setAttribute('aria-label', 'Later date: open the calendar');
    }
    var lab = form.querySelector('label[for="n-date"], label[data-cc-date-for="n-date"]');
    if (lab && lab.textContent.trim() === 'Other date') lab.textContent = 'Pickup date';
    if (openAfterTap) {
      var trig = form.querySelector('#n-date ~ .cc-dp-trigger, #n-date + .cc-dp-trigger');
      if (trig && !trig.disabled) { openAfterTap = false; trig.click(); }
      else if (form.querySelector('#n-date') && !win.__ccDatePicker20261019) {   // shared calendar not loaded: use the phone's own
        openAfterTap = false; var i = form.querySelector('#n-date'); try { i.focus(); if (i.showPicker) i.showPicker(); } catch (_) {}
      }
    }
  }
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#ccs-slipform [data-act="n-date-other"]'); if (!b) return;
    openAfterTap = true; setTimeout(function () { openAfterTap = false; }, 1500);   // the app draws the date field, then it opens
  }, true);

  // ---------- 6. Readable help text on tablets and phones (computers unchanged) ----------
  function ensureTouchStyle() {
    if (doc.getElementById('cc-order-tools-touch')) return;
    var s = doc.createElement('style');
    s.id = 'cc-order-tools-touch';
    var T = 'html.ccs-tablet-mode body ', H = ['#ccs-slipform .ccs-hint', '#ccs-slipform .oo-mode-b small', '#ccs-slipform .of-who-t small', '#ccs-slipform .oo-note', '#ccs-sheet .ccs-hint', '#ccs-sheet .ccs-note', '#ccs-sheet .cc-ot-notyet p'];
    // Size only: the colour stays the app's own touch-screen text colour. Repeated ids so the size wins.
    H = H.map(function (x) { return x.replace(/^#(ccs-slipform|ccs-sheet)/, '#$1#$1#$1'); });
    var B = H.map(function (x) { return 'html body ' + x; });
    var tablet = B.join(',') + '{font-size:17px!important;line-height:1.4!important}';
    s.textContent =
      '#ccs-slipform .cc-ot-later{display:inline-flex;align-items:center;gap:8px;font-weight:600}' +
      '#ccs-slipform .cc-ot-later svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}' +
      '@media (hover:none) and (pointer:coarse){' + tablet + '}' +
      H.map(function (x) { return T + x; }).join(',') + '{font-size:17px!important;line-height:1.4!important}' +
      '@media (max-width:759px){' + B.join(',') + '{font-size:16px!important}}';
    doc.head.appendChild(s);
  }

  // ---------- 7. Friendly wording (26 October 2026, "humanise as much as possible") ----------
  // Text only, on the order form. Buttons keep their own data, so every rule and saved value is unchanged.
  // Not changed on purpose: the customer permission question (its exact words are the consent), and the slip
  // preview (it mirrors the printed kitchen slip).
  var EXACT = {           // whole lines
    'Guest name': 'Customer name',
    'Guest': 'Customer',
    'Who is taking this order?': "Who's taking this order?",
    'This number is on WhatsApp': 'They use WhatsApp on this number',
    'Another date': 'An earlier day',
    'Date the order was taken': 'Day they ordered',
    'Custom cake (not on the list)': "A cake that's not on the list",
    'Tap the price for the cake and size': 'Tap the price under the cake and size they want',
    'How many cakes': 'How many cakes?',
    'Inspiration photos': 'Photos from the customer',
    'Inscription': 'Writing on the cake',
    '+ Add a cake requirement (eggless, gluten-free, dairy-free, vegan)': '+ Eggless, gluten-free, dairy-free or vegan?',
    'Any allergies?': 'Does anyone eating it have an allergy?',
    'Occasion': 'What are they celebrating?',
    'Other notes': 'Anything else?',
    'Collection date': 'Pickup day',
    'Delivery date': 'Delivery day',
    'Delivery area': 'Where are we delivering?',
    'Who receives it (optional)': 'Who will receive it? (optional)',
    'Reason': 'Why is it short notice?',
    'Who approved it': 'Who said yes?',
    'Collection time': 'Pickup time',
    'No dietary needs': 'No allergies or dietary needs',
    'What payment did we receive?': 'Did they pay anything today?',
    'Deposit received': 'Paid a deposit',
    'No payment yet': 'Nothing paid yet',
    'Clear this order?': 'Start again?',
    'Clear order': 'Yes, start again',
    'Save old order': 'Save this paper slip',
    'Amount paid (FJD)': 'How much did they pay? (FJD)'
  };
  var PHRASES = [         // parts of longer lines
    ['It goes on the kitchen slip, so the team knows who to ask.', 'Your name goes on the kitchen slip, so the team knows who to ask.'],
    ['Type the number first. If they have ordered before, their details come up.', "Start with their number. If they've ordered before, their details fill in for you."],
    ['Ask them just like this. Only a clear yes counts, and it is saved with the order.', "Read the question out just as it's written. Only a clear yes counts, and we save their answer with the order."],
    ['If they are ordering right now, leave it on Today.', 'Ordering right now? Leave it on Today.'],
    ['Colours, a theme or a photo make it a custom design.', "If they want colours, a theme or a photo copied, it's a custom design."],
    ['The kitchen prices a custom design after you save. You will add the price on the order.', "The kitchen will price the design after you save. You'll add the price to the order then."],
    ['Up to 5 photos, 5 MB each. They go on the order and the kitchen slip.', "Add up to 5 photos. They'll show on the order and the kitchen slip."],
    ['Up to 40 letters. The kitchen copies it exactly, so check the spelling with them.', 'Up to 40 letters. The kitchen writes it exactly as typed, so check the spelling with the customer.'],
    ['Check with the kitchen first. Then write the reason and who said yes. Both are saved with the order.', 'Check with the kitchen first. Then note why, and who said yes.'],
    ['Numbers show pickups already booked at that time.', 'The small numbers show how many cakes are already being picked up at that time.'],
    ['Collection hours ', 'Pickups run from '],
    ['The customer, cake and date you have entered will be lost.', "Everything you've typed for this order will be cleared."],
    ['Copy the slip exactly as it is written. We save it as already picked up, with the payment on the day it was paid. No kitchen slip, and nothing is sent to the customer.', "Copy the slip exactly as written. We'll save it as already picked up, with the payment on the day it was paid. No kitchen slip is made and the customer isn't messaged."],
    ['The name on the slip. If the slip has no name, choose who is entering it.', 'Use the name on the slip. No name on it? Choose yourself.'],
    ['Not asked on a paper slip, so nothing is recorded and nothing is sent. Ask the customer next time they order.', "We don't ask this for paper slips, so nothing is saved or sent. Ask them next time they order."],
    ['Usually the pickup day. The money counts on this day.', 'Usually the pickup day. Sales count the money on this day.']
  ];
  var HOLDERS = {
    'Full name': "Customer's full name",
    'For order emails': 'So we can email them about the order',
    'Who it is for, colours, theme, toppers, writing style': "Who it's for, colours, theme, toppers, writing style",
    'Words written on the cake': 'For example: Happy Birthday Mere',
    'Anything else for the order': 'Anything else the team should know',
    'Details for the kitchen': 'Tell the kitchen exactly what to avoid'
  };
  function friendly() {
    var roots = doc.querySelectorAll('#ccs-slipform, #ccs-sheet .ccs-sheet-head, .oo-dup, [role="alertdialog"], .ccs-confirm');
    [].forEach.call(roots, function (root) {
      var w = doc.createTreeWalker(root, 4), n, list = [];
      while ((n = w.nextNode())) list.push(n);
      list.forEach(function (t) {
        var el = t.parentElement; if (!el || el.closest('.sl-live, textarea, script, style, .cc-ot-reasons')) return;
        var v = t.nodeValue, k = v.trim();
        if (Object.prototype.hasOwnProperty.call(EXACT, k)) { t.nodeValue = v.replace(k, EXACT[k]); return; }
        for (var i = 0; i < PHRASES.length; i++) if (v.indexOf(PHRASES[i][0]) > -1) v = v.split(PHRASES[i][0]).join(PHRASES[i][1]);
        if (v !== t.nodeValue) t.nodeValue = v;
      });
      [].forEach.call(root.querySelectorAll('input[placeholder], textarea[placeholder]'), function (i) {
        var p = i.getAttribute('placeholder'); if (Object.prototype.hasOwnProperty.call(HOLDERS, p)) i.setAttribute('placeholder', HOLDERS[p]);
      });
    });
  }

  // ---------- keep up with the app's redraws ----------
  var queued = false;
  function run() {
    queued = false;
    try { ensureStyle(); ensureTouchStyle(); addCancelButton(); enhancePanel(); addNotYet(); plainWords(); laterDate(); friendly(); } catch (e) { warn('update', e); }
  }
  function schedule() { win.__ccFrame(run); }
  function boot() { run(); new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(window, document);
