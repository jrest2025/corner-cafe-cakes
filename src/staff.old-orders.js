/* Corner Café: old orders from paper slips, a duplicate warning, corrections after handover, and a clear history
 * (21 October 2026).
 * Roneel: "the form shoud allow our staff to renter orders that were taken ealier becasue we are now doing all the cake
 * entries that were done previously manually" and "Yes warn for duplicates.. yes allow correctiong for old orders but
 * all orders showu d have a clear audit traiut showing all changes etc".
 *
 *  1. New order starts with a choice: New order, or Old order (from a paper slip, already picked up). In an old order
 *     the slip's date replaces "When did they order?", the pickup date is before today (no short notice), the
 *     marketing question and the Birthday Club are not offered (nothing is recorded), a custom design takes its price
 *     from the slip (menu cakes keep the price list), and the last step asks whether and when it was paid.
 *     It is saved in one go by staff_enter_old_order: picked up on its day, paid on its day, no kitchen slip, no emails.
 *  2. Before any order is saved, orders already in the system for the same customer that look the same are shown:
 *     open that one, or save anyway.
 *  3. Orders already handed over can be corrected (Correct this order), with what was wrong; see the build script.
 *  4. Every line in an order's history says what happened in plain words, with each change's old and new value.
 * The app lends this add-on its pieces as window.__ccsOf (build/staff_old_orders.py). If anything here fails, the
 * order form carries on as a normal New order.
 */
(function (global) {
  'use strict';
  if (global.CCOldOrders) return;
  var VERSION = '2026-10-21-old-orders-v1';
  var doc = global.document;
  var TICK = '<svg viewBox="0 0 52 52" aria-hidden="true" focusable="false"><circle cx="26" cy="26" r="24"/><path d="M15 27.5l7.5 7.5L38 19"/></svg>';
  var METHODS = [['cash', 'Cash'], ['eftpos', 'Card (EFTPOS)'], ['bank_transfer', 'Bank transfer'], ['mpaisa', 'M-PAiSA'], ['other', 'Other']];
  var PAID = [['full', 'Paid in full'], ['part', 'Part paid'], ['none', 'Not paid']];
  var ISO = /^\d{4}-\d{2}-\d{2}$/;

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api() { var a = global.__ccsOf; return a && typeof a.V === 'function' ? a : null; }
  function act(name) {
    var a = api(), args = [].slice.call(arguments, 1);
    try { if (a && typeof a[name] === 'function') return a[name].apply(a, args); } catch (e) { console.warn('[Old orders] ' + name, e); }
  }
  function draft() { return act('V') || null; }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function today() { var t = act('today'); return ISO.test(t || '') ? t : new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function day(iso, noYear) {
    if (!ISO.test(String(iso || '').slice(0, 10))) return String(iso || '');
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    var o = { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }; if (!noYear) o.year = 'numeric';
    return d.toLocaleDateString('en-GB', o).replace(/,/g, '');
  }
  function money(n) { n = Number(n); return isFinite(n) ? '$' + (n % 1 ? n.toFixed(2) : n.toFixed(0)) : ''; }   // as the app writes money
  function num(s) { var n = parseFloat(String(s == null ? '' : s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : null; }
  function price() { var p = act('price'); p = p == null ? null : Number(p); return p != null && isFinite(p) && p > 0 ? p : null; }
  function fee() { var f = Number(act('fee')); return isFinite(f) && f > 0 ? f : 0; }
  function isOld() { var V = draft(); return !!(V && V.old); }
  // A custom design on a menu cake is priced from the slip (menu cakes keep the price list; a custom cake request has
  // its price on the Cake step)
  function slipPriced(V) { return !!(V && V.old && V.finish === 'custom' && !V.req); }
  function total(V) {
    if (!slipPriced(V)) return price();
    var c = num(V.oldPrice);
    return c != null && c > 0 ? Math.round((c + fee()) * 100) / 100 : null;
  }
  function fijiDay(at) {
    var d = new Date(at); if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(d);
  }

  // ---------- 1. New order or old order ----------
  function modeSwitch(V) {
    var old = !!(V && V.old);
    return '<div class="oo-mode" role="group" aria-label="What are you entering?">' +
      '<button type="button" class="oo-mode-b" data-oo-mode="new" aria-pressed="' + !old + '"><b>New order</b><small>The customer is ordering now</small></button>' +
      '<button type="button" class="oo-mode-b" data-oo-mode="old" aria-pressed="' + old + '"><b>Old order</b><small>From a paper slip, already picked up</small></button></div>' +
      (old ? '<p class="oo-note">Type it in exactly as the slip says. It is saved as already picked up, with the payment on the day it was paid. No kitchen slip and no messages to the customer.</p>' : '');
  }
  function setMode(old) {
    var V = draft(); if (!V) return;
    old = !!old; if (!!V.old === old) return;
    var t = today();
    V.old = old; V.err = null; V.errField = null; V.ooDupOk = null;
    if (old) {
      V.taken = 'other'; V.dateOther = true;
      if (V.date && V.date >= t) { V.date = ''; V.time = ''; }
      V.payPlan = null; V.payNow = false; V.confirmNow = false; V.payAmount = ''; V.rush = ''; V.rushBy = '';
      V.optIn = null;                                               // not asked on a paper slip
    } else {
      V.taken = 'now'; V.takenDate = ''; V.dateOther = false;
      if (V.date && V.date < t) { V.date = ''; V.time = ''; }
      V.oldPaid = null; V.oldMeth = null; V.oldAmount = ''; V.oldPaidOn = ''; V.oldPrice = '';
    }
    var a = api(); act(a && typeof a.sheet === 'function' ? 'sheet' : 'redraw');      // the whole sheet: its title changes too
    var body = doc.querySelector('#ccs-sheet .ccs-sheet-body'); if (body) body.scrollTop = 0;
  }
  // "Who is taking this order?" becomes "Who took this order?" in an old order
  function relabel(html, V) {
    if (!V || !V.old || !html) return html;
    return html.replace('Who is taking this order?', 'Who took this order?')
      .replace('<small>Taking this order</small>', '<small>Order taken by</small>')
      .replace('>+ Add my name<', '>+ Add a name<')
      .replace('>Your name</label>', '>Name on the slip</label>')
      .replace('placeholder="Your first name"', 'placeholder="First name"')
      .replace('Goes on the kitchen slip, so the team knows who took the order.', 'The name on the slip. If the slip has no name, choose who is entering it.')
      .replace('aria-label="Change who is taking this order"', 'aria-label="Change who took this order"');
  }
  function noConsent() {
    return '<div class="sl-sub oo-consent"><span class="sl-k">Cake offers and reminders</span>' +
      '<p class="ccs-hint">Not asked on a paper slip, so nothing is recorded and nothing is sent. Ask the customer next time they order.</p></div>';
  }
  // The date on the slip (in place of "When did they order?")
  function slipDate(V) {
    return '<p class="sl-k tk-k">When did they order? <em class="sl-req">Required</em></p><div class="sl-sub tk-sub">' +
      '<label class="sl-k" for="n-takedate">Date on the slip</label><input class="ccs-input" id="n-takedate" type="date" data-n="takenDate" min="2015-01-01" max="' +
      addDays(today(), -1) + '" value="' + esc(V.takenDate || '') + '"></div><p class="ccs-hint">The day the customer ordered, as written on the slip.</p>';
  }
  // The live slip's Date line: the date on the slip, with the year
  function slipLine(V) {
    return ISO.test((V && V.takenDate) || '') ? esc(day(V.takenDate)) + '<small>Date on the slip</small>' : '';
  }
  // The live slip's Price line for a custom design priced from the slip (null: the app's own line)
  function priceText(V) {
    if (!slipPriced(V)) return null;
    var t = total(V); return t != null ? esc(money(t)) : 'From the slip';
  }

  // What is still to answer in an old order (the app adds its own checks)
  function missing(step, V) {
    var out = [], t = today();
    try {
      if (!V || !V.old) return out;
      if (step === 1) {
        if (!ISO.test(V.takenDate || '') || V.takenDate < '2015-01-01') out.push('Choose the day the customer placed the order (the date on the slip)');
        else if (V.takenDate >= t) out.push('The day the customer placed the order must be before today');
      }
      if (step === 3) {
        if (!ISO.test(V.date || '')) out.push('Choose the pickup date from the slip');
        else if (V.date < '2015-01-01') out.push('Check the year of the pickup date');
        else if (V.date >= t) out.push('An old order was picked up before today. For today or a later date, choose New order at the top');
      }
      if (step === 7) {
        var p = total(V);
        if (slipPriced(V)) { if (p == null) out.push('Enter the cake price from the slip'); }
        else if (p == null) out.push('Enter the price from the slip on the Cake step');
        if (!V.oldPaid) out.push('Choose whether it was paid');
        else if (V.oldPaid !== 'none') {
          if (V.oldPaid === 'part') { var a = num(V.oldAmount); if (!(a > 0) || (p != null && a >= p)) out.push('Enter the amount they paid (less than the price)'); }
          if (!V.oldMeth) out.push('Choose how they paid');
          var on = V.oldPaidOn || V.date;
          if (!ISO.test(on || '') || on > t || (ISO.test(V.takenDate || '') && on < V.takenDate)) out.push('Check the day they paid');
        }
      }
    } catch (e) { console.warn('[Old orders] missing', e); }
    return out;
  }

  // The last step of an old order: was it paid, how and when
  function pay(V, compact) {
    try {
      var p = total(V), dlv = V.method === 'delivery', on = V.oldPaidOn || V.date || '', f = fee();
      var h = (compact ? '' : '<h2 class="ccs-step-q">Payment and pickup</h2>') +
        '<div class="ccs-total oo-total"><span>Price</span><b>' + (p == null ? (slipPriced(V) ? 'Enter the cake price' : 'Enter the price on the Cake step') : money(p)) + '</b></div>';
      // (after the price line: the form lays out the last step from the price line down)
      if (slipPriced(V)) {
        var menu = price();
        h += '<div class="ccs-field oo-price"><label class="ccs-label" for="oo-price">Cake price on the slip (FJD) <em class="sl-req">Required</em></label>' +
          '<input class="ccs-input" id="oo-price" inputmode="decimal" data-n="oldPrice" value="' + esc(V.oldPrice || '') + '" placeholder="' +
          esc(menu != null ? 'Menu price ' + (menu - f).toFixed(2) : 'For example: 85') + '">' +
          '<span class="ccs-hint">Custom design: the price agreed with the customer, as written on the slip' + (f ? '. The delivery fee of ' + esc(money(f)) + ' is added.' : '.') + '</span></div>';
      }
      h +=
        '<div class="sl-sub oo-paid"><span class="sl-k" id="oo-paid-k">Was it paid? <em class="sl-req">Required</em></span><div class="ccs-chips" role="group" aria-labelledby="oo-paid-k">' +
        PAID.map(function (x) { return '<button type="button" class="ccs-chip" data-oo-paid="' + x[0] + '" aria-pressed="' + (V.oldPaid === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
      if (V.oldPaid === 'part') {
        h += '<div class="ccs-field oo-amount"><label class="ccs-label" for="oo-amount">Amount paid (FJD)</label><input class="ccs-input" id="oo-amount" inputmode="decimal" data-n="oldAmount" value="' +
          esc(V.oldAmount || '') + '" style="max-width:220px"></div>';
      }
      if (V.oldPaid === 'full' || V.oldPaid === 'part') {
        h += '<div class="sl-sub oo-meth"><span class="sl-k" id="oo-meth-k">How did they pay?</span><div class="ccs-chips" role="group" aria-labelledby="oo-meth-k">' +
          METHODS.map(function (x) { return '<button type="button" class="ccs-chip" data-oo-meth="' + x[0] + '" aria-pressed="' + (V.oldMeth === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="ccs-field oo-paidon"><label class="ccs-label" for="oo-paidon">Day they paid</label><input class="ccs-input" id="oo-paidon" type="date" data-n="oldPaidOn" min="' +
          esc(ISO.test(V.takenDate || '') ? V.takenDate : '2015-01-01') + '" max="' + today() + '" value="' + esc(on) + '" style="max-width:240px">' +
          '<span class="ccs-hint">Usually the pickup day. The money counts on this day.</span></div>';
      }
      h += '<div class="oo-sum">Saved as <b>' + (dlv ? 'delivered' : 'picked up') + (V.date ? ' on ' + esc(day(V.date)) : '') + '</b>' +
        (ISO.test(V.takenDate || '') ? ', ordered on <b>' + esc(day(V.takenDate)) + '</b>' : '') +
        '. It counts in sales on the pickup day. No kitchen slip, and no messages to the customer.</div>';
      return h;
    } catch (e) { console.warn('[Old orders] pay', e); return ''; }
  }

  // Saving an old order: the normal order details plus what the slip says
  function rpc(c, V) {
    var a = api(); if (!a) return Promise.reject(new Error('The app is not ready'));
    var p = Object.assign({}, c);
    delete p.payment; delete p.rush; delete p.deposit_required; p.confirm_now = false;
    delete p.consent;                                               // not asked on a paper slip: nothing is recorded
    if (p.customer) p.customer = Object.assign({}, p.customer, { opt_in: false });
    p.old = {
      taken_on: V.takenDate, taken_by: clean(V.takenBy), paid: V.oldPaid,
      amount: V.oldPaid === 'part' ? num(V.oldAmount) : null,
      method: V.oldPaid === 'none' ? null : V.oldMeth,
      paid_on: V.oldPaid === 'none' ? null : (V.oldPaidOn || V.date),
      price: slipPriced(V) ? num(V.oldPrice) : null
    };
    return a.rpc('staff_enter_old_order', { p: p });
  }

  // ---------- 2. Is this order already in the system? ----------
  var checking = false;
  function sig(c) { return JSON.stringify([c.customer_id || '', (c.customer && c.customer.phone) || '', c.date || '', c.product_code || '', c.size_inch || '', c.price || '', c.quantity || 1]); }
  function hold(c, V) {
    try {
      var a = api(); if (!a || !c || !V) return false;
      var s = sig(c);
      if (V.ooDupOk === s) return false;
      if (checking) return true;
      if (!c.date || !(c.customer_id || (c.customer && c.customer.phone))) return false;
      checking = true;
      var go = function () { var W = draft(); if (W) W.ooDupOk = s; act('submit'); };
      a.rpc('order_possible_duplicates', { p: Object.assign({}, c, { wide: !!V.old }) }).then(function (r) {
        checking = false;
        var list = r && !r.error && Array.isArray(r.data) ? r.data : [];
        if (!list.length) return go();
        warn(list, s);
      }, function () { checking = false; go(); });    // no answer: do not hold the order up
      return true;
    } catch (e) { checking = false; console.warn('[Old orders] duplicate check', e); return false; }
  }
  var STATE = { completed: 'Collected', confirmed: 'Confirmed', awaiting_review: 'Waiting for a check', awaiting_quote: 'Needs a price', awaiting_approval: 'Waiting for the customer', awaiting_deposit: 'Waiting for the deposit' };
  function warn(list, s) {
    close();
    var box = doc.createElement('div');
    box.className = 'oo-dup'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'oo-dup-h');
    box.setAttribute('data-oo-sig', s);
    box.innerHTML = '<div class="oo-dup-box"><h3 id="oo-dup-h">Is this order already in the system?</h3>' +
      '<p>This customer already has ' + (list.length === 1 ? 'an order' : 'orders') + ' that look' + (list.length === 1 ? 's' : '') + ' the same:</p><ul class="oo-dup-list">' +
      list.map(function (o) {
        var cake = clean(o.cake) + (o.size ? ' ' + o.size + '"' : '');
        return '<li><div><b>' + esc(o.reference) + '</b> · ' + esc(cake || 'Cake') + '</div><div class="oo-dup-meta">' + esc(day(o.date)) +
          (o.total != null ? ' · ' + esc(money(o.total)) : '') + ' · ' + esc(STATE[o.status] || o.status || '') + '</div>' +
          '<button type="button" class="ccs-btn ccs-ghost oo-dup-open" data-oo-open="' + esc(o.id) + '">Open ' + esc(o.reference) + '</button></li>';
      }).join('') + '</ul><div class="oo-dup-acts"><button type="button" class="ccs-btn ccs-good" data-oo-save>It is a different order: save it</button>' +
      '<button type="button" class="ccs-link" data-oo-back>Go back and check</button></div></div>';
    (doc.getElementById('ccs-sheet') || doc.body).appendChild(box);
    var f = box.querySelector('[data-oo-back]'); try { (box.querySelector('[data-oo-save]') || f).focus(); } catch (e) {}
  }
  function close() { var b = doc.querySelector('.oo-dup'); if (b) b.remove(); }

  // ---------- after saving an old order ----------
  function done(r) {
    var o = r.of || {}, dlv = o.method === 'delivery', paid = Number(r.paid) || 0, total = Number(r.total) || 0;
    function fact(k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>' : ''; }
    var money_ = paid <= 0 ? 'Not paid · ' + money(total) + ' still owed' :
      money(paid) + (paid < total ? ' of ' + money(total) : '') + (r.paid_on ? ' on ' + day(r.paid_on) : '');
    return '<div class="of-done oo-done" role="status">' +
      '<div class="of-tick">' + TICK + '</div>' +
      '<p class="of-done-k">Old order saved</p>' +
      '<p class="of-ref">' + esc(r.reference || '') + '</p>' +
      '<p class="of-state"><span class="of-pill is-ok">' + (dlv ? 'Delivered ' : 'Picked up ') + esc(day(r.pickup)) + '</span></p>' +
      '<dl class="of-facts">' + fact('Customer', o.customer) + fact('Ordered', day(r.taken_on)) + fact('Paid', money_) + fact('Taken by', o.takenBy) + '</dl>' +
      '<p class="of-next">It counts in sales on the day it was picked up. No kitchen slip and no messages were sent.</p>' +
      '<div class="of-acts"><button type="button" class="ccs-btn ccs-good of-big" data-act="new-again" data-oo-next>Enter the next old order</button></div>' +
      '<button type="button" class="ccs-link of-open" data-act="open-order" data-id="' + esc(r.order_id) + '">Open the order</button></div>';
  }

  // ---------- 4. A history line in plain words ----------
  function changes(t) {
    var c = t && Array.isArray(t.changes) ? t.changes : [];
    return c.length ? ': ' + c.map(function (x) { return clean(x.label || x.field) + ' ' + clean(x.from) + ' → ' + clean(x.to); }).join('; ') : '';
  }
  function words(code) { var s = String(code || '').replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  var PAYKIND = { deposit: 'Deposit', balance: 'Balance', full: 'Full payment', refund: 'Refund', adjustment: 'Adjustment' };
  var PAYHOW = {}; METHODS.forEach(function (m) { PAYHOW[m[0]] = m[1]; });
  function line(e, base) {
    try {
      var t = (e && e.detail) || {}, k = e && e.kind;
      switch (k) {
        case 'amended': return (base || 'Amended') + changes(t);
        case 'corrected': return 'Corrected after it was handed over' + (t.reason ? ' (' + t.reason + ')' : '') + changes(t);
        case 'entered_later': return 'Old order entered from a paper slip: ordered ' + day(t.taken_on) + ', ' + (t.paid === 'none' ? 'not paid, ' : '') +
          (t.taken_by ? 'taken by ' + t.taken_by + ', ' : '') + 'picked up ' + day(t.pickup);
        case 'date_corrected': return 'Pickup date corrected';
        case 'marked_test': return 'Marked as a test order, so it is left out of all figures' + (t.reason ? ' (' + t.reason + ')' : '');
        case 'rush_approved': return 'Short notice approved' + (t.approved_by ? ' by ' + t.approved_by : '') + (t.reason ? ' (' + t.reason + ')' : '');
        case 'slip_confirmed': return 'Kitchen slip' + (t.version ? ' v' + t.version : '') + ' confirmed as printed';
        case 'customer_deleted': return 'Customer record deleted' + (t.customer_no ? ' (C-' + t.customer_no + ')' : '');
        case 'deleted': return 'Deleted' + (t.reason ? ' (' + t.reason + ')' : '');
        case 'requirements': {
          var to = (t.to || []).map(words), from = (t.from || []).map(words);
          return to.length ? 'Cake requirements: ' + to.join(', ') + (from.length ? ' (was ' + from.join(', ') + ')' : '') : 'Cake requirements removed' + (from.length ? ' (was ' + from.join(', ') + ')' : '');
        }
        case 'contact_updated': {
          var a = t.from || {}, b = t.to || {}, d = [];
          ['name', 'phone', 'email'].forEach(function (f) { if (clean(a[f]) !== clean(b[f])) d.push(f + ' ' + (clean(a[f]) || 'none') + ' → ' + (clean(b[f]) || 'none')); });
          return 'Contact on the order changed' + (d.length ? ': ' + d.join('; ') : '') + (t.reason ? ' (' + t.reason + ')' : '');
        }
        case 'payment_recorded': {
          if (t.amount == null) return null;
          return (PAYKIND[t.kind] || words(t.kind) || 'Payment') + ' of ' + money(t.amount) + ' recorded' + (t.method ? ' (' + (PAYHOW[t.method] || words(t.method)) + ')' : '') +
            (t.paid_on ? ', paid ' + day(t.paid_on) : '');
        }
        case 'collected': return base && t.on ? base + ' on ' + day(t.on) : null;
        case 'taken_earlier': { var td = t.at ? fijiDay(t.at) : ''; return 'Ordered ' + (td ? day(td) : (t.text || '')) + ', entered later'; }
      }
    } catch (x) { console.warn('[Old orders] history', x); }
    return null;
  }

  // ---------- taps ----------
  if (doc && !global.__ccOldOrdersClicks) {
    global.__ccOldOrdersClicks = true;
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var b, V;
      if ((b = t.closest('#cc-staff [data-oo-mode]'))) { e.preventDefault(); setMode(b.getAttribute('data-oo-mode') === 'old'); return; }
      if ((b = t.closest('#cc-staff [data-oo-paid]'))) {
        e.preventDefault(); V = draft(); if (!V) return;
        V.oldPaid = b.getAttribute('data-oo-paid'); if (V.oldPaid === 'none') V.oldMeth = null;
        if (V.oldPaid !== 'none' && !V.oldPaidOn && V.date) V.oldPaidOn = V.date;
        V.err = null; act('redraw'); return;
      }
      if ((b = t.closest('#cc-staff [data-oo-meth]'))) { e.preventDefault(); V = draft(); if (!V) return; V.oldMeth = b.getAttribute('data-oo-meth'); V.err = null; act('redraw'); return; }
      if ((b = t.closest('[data-oo-save]'))) {
        e.preventDefault(); var box = b.closest('.oo-dup'), s = box && box.getAttribute('data-oo-sig'); close();
        V = draft(); if (V && s) { V.ooDupOk = s; act('submit'); } return;
      }
      if ((b = t.closest('[data-oo-back]'))) { e.preventDefault(); close(); return; }
      if ((b = t.closest('[data-oo-open]'))) {
        e.preventDefault(); var id = b.getAttribute('data-oo-open'); close();
        var sheet = doc.getElementById('ccs-sheet') || doc.getElementById('cc-staff');
        if (sheet && id) { var o = doc.createElement('button'); o.type = 'button'; o.hidden = true; o.setAttribute('data-act', 'open-order'); o.setAttribute('data-id', id); sheet.appendChild(o); o.click(); o.remove(); }
        return;
      }
    }, true);
    // After the app has started the next order: keep entering old orders
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t || !t.closest('[data-oo-next]')) return;
      setTimeout(function () { setMode(true); }, 0);
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.querySelector('.oo-dup')) { e.stopPropagation(); close(); } }, true);
    // The price on the slip: the total above it follows as it is typed (the form does not redraw while typing)
    doc.addEventListener('input', function (e) {
      var t = e.target; if (!t || t.id !== 'oo-price') return;
      setTimeout(function () {
        var V = draft(), b = doc.querySelector('#cc-staff .oo-total b'); if (!V || !b) return;
        var p = total(V); b.textContent = p == null ? 'Enter the cake price' : money(p);
      }, 0);
    });
    // An answer given: the part of the message asking for it goes, the rest stays (without redrawing the form, so a
    // date being typed is kept)
    var ABOUT = { 'n-takedate': /date on the slip|day the customer placed the order/i, 'oo-amount': /amount they paid/i, 'oo-paidon': /day they paid/i, 'oo-price': /cake price/i };
    var rest = function (msg, re) {
      var left = clean(msg).split(/\.\s+|\.$/).map(clean).filter(function (x) { return x && !re.test(x); });
      return left.length ? left.join('. ') + '.' : null;
    };
    var answered = function (e) {
      var t = e.target, re = t && ABOUT[t.id]; if (!re) return;
      setTimeout(function () {
        var V = draft(); if (!V || !V.old) return;
        // (the app forgets the message as soon as anything is typed, but leaves it on screen until the next redraw)
        if (V.err && re.test(V.err)) { V.err = rest(V.err, re); if (!V.err) V.errField = null; }
        [].forEach.call(doc.querySelectorAll('#ccs-slipform .ccs-err'), function (n) {
          if (n.children.length || !re.test(n.textContent)) return;      // plain messages only, never a list of buttons
          var now = rest(n.textContent, re); if (now) n.textContent = now; else n.remove();
        });
      }, 0);
    };
    doc.addEventListener('input', answered);
    doc.addEventListener('change', answered);
    // The form shows which kind of order it is
    var queued = false;
    var paint = function () {
      queued = false;
      var f = doc.getElementById('ccs-slipform'), V = draft(), on = !!(f && V && V.old);
      if (f && f.classList.contains('is-old') !== on) f.classList.toggle('is-old', on);
      if (on) {
        var rv = f.querySelector('#cc-f-review');
        if (rv) {
          var h = rv.querySelector('h3'), p = rv.querySelector('p');
          if (h && h.textContent !== 'Check it against the slip') h.textContent = 'Check it against the slip';
          if (p && p.textContent !== 'Choose Change only if something is different from the slip.') p.textContent = 'Choose Change only if something is different from the slip.';
        }
      }
      if (!f || !doc.getElementById('ccs-sheet')) close();
    };
    var soon = function () { if (!queued) { queued = true; (global.requestAnimationFrame || setTimeout)(paint); } };
    var boot = function () {
      var root = doc.getElementById('cc-staff'); if (!root) return setTimeout(boot, 250);
      new MutationObserver(soon).observe(root, { childList: true, subtree: true });
      soon();
    };
    boot();
  }

  // The order flow add-on draws "Who is taking this order?" and the finish screen; old orders adjust both
  var OF = global.CCOrderFlow;
  if (OF && !OF.__old) {
    var who0 = OF.who, done0 = OF.done;
    OF.who = function (V) { var h = ''; try { h = modeSwitch(V); } catch (e) {} return h + relabel(who0(V), V); };
    OF.done = function (r) { try { if (r && r.old && !r.duplicate) return done(r); } catch (e) { console.warn('[Old orders] done', e); } return done0(r); };
    OF.__old = true;
  }

  global.CCOldOrders = { version: VERSION, noConsent: noConsent, slipDate: slipDate, slipLine: slipLine, priceText: priceText, missing: missing,
    pay: pay, rpc: rpc, hold: hold, line: line, isOld: isOld, _setMode: setMode, _day: day };
})(window);
