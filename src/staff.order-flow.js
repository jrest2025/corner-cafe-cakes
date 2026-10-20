/* Corner Café: a New order that leads the way (20 October 2026).
 * Roneel: "refine refine refine.. the order form ... should feel fun and easy to fill .. and very very intuitive ..
 * if they are taking the order with a customer they should not be looking for buttons and what to press .. the flow
 * has to be there". And: "the person filling the cake order form must enter their name. its a requirement. because
 * the counter tablet has no specific login."
 * Approved: who is taking the order, asked on every New order and every device (names used before on the device are
 * one-tap buttons, none picked in advance); no hidden menus; the screen leads the way; date and time together; a clear
 * finish screen; the order date starts on Today.
 *
 *  1. Customer step, first question: "Who is taking this order?" It is required. Straight after the order is saved it
 *     is saved on the order (order_set_taken_by), so the kitchen slip, the order and its history name that person.
 *  2. After each answer the next unanswered question comes into view, outlined. When a step is complete, its Next (or
 *     Save) button lights up. Next with something missing brings that question into view, outlined in red.
 *  3. When is it needed: the times sit under the dates on every screen, and picking a time moves on to the last step
 *     once everything on the step is done.
 *  4. After saving: a finish screen with the order number, what happens next, Make kitchen slip and Take another order.
 * The app lends this add-on a few of its own pieces as window.__ccsOf (build/staff_order_flow.py). If anything here
 * fails, the order form carries on as before.
 */
(function (global) {
  'use strict';
  if (global.CCOrderFlow) return;
  var VERSION = '2026-10-20-order-flow-v1';
  var doc = global.document;
  var KEY = 'ccs-taken-names', SHOW = 6, KEEP = 12;
  var LETTER = (function () { try { return new RegExp('\\p{L}', 'u'); } catch (e) { return /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/; } })();
  var REF = /^[A-Z]{1,4}-[0-9]{3,}$/;
  var PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
  var TICK = '<svg viewBox="0 0 52 52" aria-hidden="true" focusable="false"><circle cx="26" cy="26" r="24"/><path d="M15 27.5l7.5 7.5L38 19"/></svg>';
  var pending = {};      // order id -> promise: who took it is being saved
  var reduce = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api() { var a = global.__ccsOf; return a && typeof a.V === 'function' ? a : null; }
  function act(name) {
    var a = api(), args = [].slice.call(arguments, 1);
    try { if (a && typeof a[name] === 'function') return a[name].apply(a, args); } catch (e) { console.warn('[Order flow] ' + name, e); }
  }
  function draft() { return act('V') || null; }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function okName(s) { s = clean(s); return s.length >= 2 && s.length <= 60 && LETTER.test(s); }
  // "mere" becomes "Mere"; names typed with capitals are kept as typed
  function tidy(s) {
    s = clean(s).slice(0, 60);
    if (s && s === s.toLowerCase()) s = s.replace(/(^|[\s'-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
    return s;
  }
  function focusIn(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }
  function toast(msg, bad, action) { act('toast', msg, !!bad, action); }
  function motion() { return !(reduce && reduce.matches); }
  function bday(d, m) { d = +d; m = +m; return m >= 1 && m <= 12 && d >= 1 && d <= (m === 2 ? 29 : [4, 6, 9, 11].indexOf(m) > -1 ? 30 : 31); }

  // ---------- 1. Who is taking this order ----------
  function stored() {
    var list = [];
    try { list = JSON.parse(global.localStorage.getItem(KEY) || '[]'); } catch (e) { list = []; }
    return Array.isArray(list) ? list.filter(function (n) { return typeof n === 'string' && okName(n); }) : [];
  }
  // Names used before on this device, newest first, then the login's own name unless it is already there
  function names() {
    var me = clean((act('me') || {}).full_name), out = [], seen = {};
    function add(n) { n = tidy(n); var k = n.toLowerCase(); if (!n || seen[k]) return; seen[k] = 1; out.push(n); }
    var mine = okName(me) && !stored().some(function (n) { var k = n.toLowerCase(); return k === me.toLowerCase() || k === me.split(' ')[0].toLowerCase(); });
    stored().slice(0, mine ? SHOW - 1 : SHOW).forEach(add);
    if (mine) add(me);
    return out;
  }
  function remember(n) {
    n = tidy(n); if (!okName(n)) return;
    var list = [n].concat(stored().filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); })).slice(0, KEEP);
    try { global.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function who(V) {
    try {
      if (!V) return '';
      var cur = okName(V.takenBy) ? tidy(V.takenBy) : '';
      if (cur && !V.takenByOpen && !V.takenByOther) {
        return '<div class="of-who is-set" data-of-who><span class="of-who-ic">' + PERSON + '</span><span class="of-who-t"><small>Taking this order</small><b>' +
          esc(cur) + '</b></span><button type="button" class="ccs-link of-who-chg" data-of-change aria-label="Change who is taking this order">Change</button></div>';
      }
      var list = names();
      if (cur && !V.takenByOther && !list.some(function (n) { return n.toLowerCase() === cur.toLowerCase(); })) list.unshift(cur);   // a name typed on this order
      var typing = !!V.takenByOther || !list.length, html = '<div class="of-who" data-of-who><p class="sl-k of-who-k" id="of-who-k">Who is taking this order? <em class="sl-req">Required</em></p>';
      if (list.length) {
        html += '<div class="ccs-chips of-who-chips" role="group" aria-labelledby="of-who-k">' + list.map(function (n) {
          return '<button type="button" class="ccs-chip" data-of-name="' + esc(n) + '" aria-pressed="' + (!V.takenByOther && cur.toLowerCase() === n.toLowerCase()) + '">' + esc(n) + '</button>';
        }).join('') + '<button type="button" class="ccs-chip of-who-add" data-of-other aria-pressed="' + !!V.takenByOther + '">+ Add my name</button></div>';
      }
      if (typing) {
        html += '<div class="of-who-new"><label class="sl-k" for="of-who-in">Your name</label><div class="of-who-row">' +
          '<input class="ccs-input" id="of-who-in" data-n="takenBy" maxlength="60" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="Your first name" value="' + esc(V.takenBy || '') + '">' +
          '<button type="button" class="ccs-btn" data-of-use>OK</button></div><p class="ccs-err" role="alert" data-of-err hidden></p></div>';
      }
      return html + '<span class="ccs-hint of-who-hint">Goes on the kitchen slip, so the team knows who took the order.</span></div>';
    } catch (e) { console.warn('[Order flow] who', e); return ''; }
  }
  function pickName(n) {
    var V = draft(); if (!V) return;
    V.takenBy = tidy(n); V.takenByOther = false; V.takenByOpen = false;
    if (V.errField === 'stage') { V.err = null; V.errField = null; }
    act('redraw');
    leadSoon({ who: true });
  }
  function typeName() {
    var V = draft(); if (!V) return;
    V.takenByOther = true; V.takenByOpen = false; V.takenBy = '';
    act('redraw');
    setTimeout(function () { focusIn(doc.getElementById('of-who-in')); }, 30);
  }
  function useTyped() {
    var V = draft(); if (!V) return;
    var i = doc.getElementById('of-who-in'), v = i ? i.value : V.takenBy;
    if (!okName(v)) {
      var er = doc.querySelector('#cc-staff [data-of-err]');
      if (er) { er.textContent = 'Type your name: 2 letters or more.'; er.hidden = false; }
      focusIn(i); return;
    }
    V.takenBy = tidy(v); V.takenByOther = false; V.takenByOpen = false;
    if (V.errField === 'stage') { V.err = null; V.errField = null; }
    act('redraw');
    leadSoon({ who: true });
  }
  function reopen() {
    var V = draft(); if (!V) return;
    V.takenByOpen = true; V.takenByOther = false;
    act('redraw');
    setTimeout(function () { focusIn(doc.querySelector('#cc-staff [data-of-name][aria-pressed="true"]') || doc.querySelector('#cc-staff [data-of-name]')); }, 30);
  }

  // ---------- once the order is saved: who took it ----------
  function save(id, ref, n) {
    var a = api(); if (!a) return;
    var p = new Promise(function (ok) {
      function end(good, msg) {
        if (!good) toast((ref ? ref + ' is saved' : 'The order is saved') + ', but who took it was not recorded' + (msg ? ': ' + msg : '. Check the connection.'), true,
          { label: 'Try again', fn: function () { save(id, ref, n); } });
        ok();
      }
      try {
        a.rpc('order_set_taken_by', { p_order: id, p_name: n }).then(function (r) {
          var d = r && r.data;
          if (r && r.error) return end(false);
          end(!!(d && d.ok), d && d.message);
        }, function () { end(false); });
      } catch (e) { end(false); }
    });
    pending[id] = p;
    p.then(function () { if (pending[id] === p) delete pending[id]; });
  }
  function afterOrder(V, d) {
    try {
      if (!V || !d || !d.order_id || !okName(V.takenBy)) return;
      var n = tidy(V.takenBy);
      remember(n);
      save(d.order_id, d.reference, n);
    } catch (e) { console.warn('[Order flow] after order', e); }
  }
  // The kitchen slip waits for the name (at most 4 seconds), so a slip made straight away names the right person
  function wait(id) {
    var p = pending[id];
    return p ? Promise.race([p, new Promise(function (ok) { setTimeout(ok, 4000); })]) : Promise.resolve();
  }

  // ---------- 4. Finish screen ----------
  var STATUS = {
    confirmed: ['Confirmed', 'Give the customer their order number, then make the kitchen slip.'],
    awaiting_deposit: ['Waiting for the deposit', 'It is confirmed as soon as the deposit is recorded.'],
    awaiting_quote: ['Needs a price', 'Add the price on the order when it is ready. The kitchen gets it once it is confirmed.'],
    awaiting_approval: ['Waiting for the customer', 'Press Confirm order on the order once the customer agrees the price.'],
    awaiting_review: ['Waiting for a check', 'It waits in Needs attention until a manager checks it.']
  };
  function finish(d, emailed, when) {
    try {
      var a = api(); if (!a || !d || !d.order_id || typeof a.done !== 'function') return false;
      var V = a.V();
      a.done(Object.assign({}, d, { of: {
        when: when || '', emailed: !!emailed, method: V.method,
        customer: V.customer ? V.customer.full_name : clean(V.name),
        takenBy: okName(V.takenBy) ? tidy(V.takenBy) : ''
      } }));
      return true;
    } catch (e) { console.warn('[Order flow] finish', e); return false; }
  }
  function done(r) {
    var o = r.of || {}, s = STATUS[r.status] || ['Saved', 'Find it under Orders.'], ok = r.status === 'confirmed';
    var slip = ok && REF.test(String(r.reference || '').trim());
    function fact(k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>' : ''; }
    return '<div class="of-done" role="status">' +
      '<div class="of-tick">' + TICK + '</div>' +
      '<p class="of-done-k">Order saved</p>' +
      '<p class="of-ref">' + esc(r.reference || '') + '</p>' +
      '<p class="of-state"><span class="of-pill' + (ok ? ' is-ok' : ' is-wait') + '">' + esc(s[0]) + '</span></p>' +
      '<dl class="of-facts">' + fact('Customer', o.customer) + fact(o.method === 'delivery' ? 'Delivery' : 'Pickup', o.when) + fact('Taken by', o.takenBy) + '</dl>' +
      '<p class="of-next">' + esc(s[1]) + '</p>' +
      '<div class="of-acts">' +
      (slip ? '<button type="button" class="ccs-btn ccs-good of-big" data-act="open-slip" data-id="' + esc(r.order_id) + '">Make kitchen slip</button>' : '') +
      '<button type="button" class="ccs-btn of-big' + (slip ? ' ccs-ghost' : '') + '" data-act="new-again">Take another order</button>' +
      '</div><button type="button" class="ccs-link of-open" data-act="open-order" data-id="' + esc(r.order_id) + '">Open the order</button>' +
      (o.emailed ? '' : '<p class="ccs-hint of-mail">No email address was given, so no email was sent.</p>') +
      '</div>';
  }

  // ---------- 2. The screen leads the way ----------
  function chips(actn) {
    return function (b) { var x = b.querySelector('[data-act="' + actn + '"]'); return x ? x.closest('.ccs-chips') || x : null; };
  }
  var TARGETS = [
    [/who is taking this order/i, function (b) { return b.querySelector('[data-of-who] .of-who-chips') || b.querySelector('#of-who-in') || b.querySelector('[data-of-who]'); }],
    [/full mobile number/i, function (b) { return b.querySelector('#n-phone'); }],
    [/guest name/i, function (b) { return b.querySelector('#n-name'); }],
    [/cake offers and reminders/i, chips('sl-opt')],
    [/how the customer placed/i, chips('n-source')],
    [/customer placed the order/i, function (b) { var x = b.querySelector('#n-takedate'); return x ? x.closest('.tk-sub') || x : chips('n-taken')(b); }],
    [/tap a price/i, function (b) { return b.querySelector('.sl-tablewrap') || b.querySelector('.sl-ptable'); }],
    [/flavour/i, chips('n-var')],
    [/describe (the custom design|how the cake should look)/i, function (b) { return b.querySelector('#n-design'); }],
    [/size or how many people/i, function (b) { return b.querySelector('#n-sizenote'); }],
    [/check the price/i, function (b) { return b.querySelector('#n-reqprice'); }],
    [/dietary needs and allergies/i, chips('n-diet')],
    [/dietary need or allergy|dietary details/i, function (b) { return chips('n-diets')(b) || b.querySelector('#n-dnote'); }],
    [/occasion/i, chips('n-occ')],
    [/choose the date|day the café is open/i, function (b) { return b.querySelector('.ccs-datechips'); }],
    [/choose the time/i, function (b) { return b.querySelector('.ccs-timegrid'); }],
    [/short-notice reason/i, function (b) { var r = b.querySelector('#n-rush'); return r && clean(r.value).length < 3 ? r : b.querySelector('#n-rushby') || r; }],
    [/delivery details/i, function (b) {
      var V = draft() || {};
      if (!V.zone) return chips('n-zone')(b);
      var ad = b.querySelector('#n-address'); if (ad && clean(ad.value).length < 5) return ad;
      return b.querySelector('#n-fee') || ad;
    }],
    [/how the customer is paying/i, chips('n-plan')],
    [/deposit paid|deposit is the full price|amount paid/i, function (b) { return b.querySelector('#n-pay'); }]
  ];
  function target(msg, body) {
    for (var i = 0; i < TARGETS.length; i++) if (TARGETS[i][0].test(msg)) { try { return TARGETS[i][1](body); } catch (e) { return null; } }
    return null;
  }
  // the element itself if it is on screen, otherwise the nearest box around it that is
  function shown(el) { while (el && el.nodeType === 1 && !el.getClientRects().length) el = el.parentElement; return el && el.nodeType === 1 ? el : null; }
  function form() { return doc.querySelector('#cc-staff #ccs-slipform .sl-stepmain'); }
  // What is still to answer on this step, top to bottom as it shows on screen
  function todo() {
    var a = api(), main = form(); if (!a || !main) return null;
    var body = main.querySelector('.sl-stepbody'); if (!body) return null;
    var V = a.V(), s = a.step(), items = [];
    if (s !== 7) (a.missing(s) || []).forEach(function (m) { items.push({ m: m, el: target(m, body) }); });
    if (s === 1 && V.bcJoin === true && !bday(V.bcDay, V.bcMonth)) items.push({ m: 'birthday', el: body.querySelector('[data-bcn-slot] .bcn-b') });
    if (s === 3) {
      // The short-notice and delivery boxes sit above the times, so they are asked first (the app only lists them
      // once a time is picked)
      var rush = body.querySelector('#n-rush'), by = body.querySelector('#n-rushby');
      if (rush && clean(rush.value).length < 3) items.push({ m: 'rush', el: rush });
      else if (by && clean(by.value).length < 2) items.push({ m: 'rushby', el: by });
      if (V.method === 'delivery') {
        var ad = body.querySelector('#n-address'), fee = body.querySelector('#n-fee');
        if (!V.zone) items.push({ m: 'zone', el: chips('n-zone')(body) });
        else if (ad && clean(ad.value).length < 5) items.push({ m: 'address', el: ad });
        else if (fee && !clean(fee.value)) items.push({ m: 'fee', el: fee });
      }
    }
    if (s === 7) {
      if ((a.all() || []).length) items.push({ m: 'fix', el: body.querySelector('.sl-missing-list') || body.querySelector('.ccs-err') });
      (a.missing(7) || []).forEach(function (m) { items.push({ m: m, el: target(m, body) }); });
      var out = body.querySelector('#cc-f-outcome');
      if (!items.length && out && out.classList.contains('cc-f-incomplete')) {
        var st = clean((out.querySelector('.cc-f-status') || {}).textContent);
        items.push({ m: st, el: /payment method/i.test(st) ? body.querySelector('[aria-label="Paid by"]') :
          /agreement/i.test(st) ? body.querySelector('.cc-f-agreement .cc-f-options') || body.querySelector('.cc-f-agreement') :
          /amount/i.test(st) ? body.querySelector('#n-pay') : chips('n-plan')(body) });
      }
    }
    var seen = [];
    items = items.filter(function (x) {
      x.el = shown(x.el); x.top = x.el ? x.el.getBoundingClientRect().top : Infinity;
      if (x.el && seen.indexOf(x.el) > -1) return false;
      if (x.el) seen.push(x.el);
      return true;
    });
    items.sort(function (p, q) { return p.top - q.top; });
    return items;
  }
  // Bring an element into view inside the order sheet, about a third of the way down, clear of the Next bar
  function reveal(el) {
    var box = el.closest('.ccs-sheet-body'), r = el.getBoundingClientRect(), top = 0, bottom = global.innerHeight;
    if (box) { var br = box.getBoundingClientRect(); top = br.top; bottom = br.bottom; }
    var bar = doc.querySelector('#ccs-slipform .sl-stepbar');
    if (bar) { var b = bar.getBoundingClientRect(); if (b.height && b.top > top && b.top < bottom) bottom = b.top; }
    var vv = global.visualViewport; if (vv && vv.height) bottom = Math.min(bottom, vv.offsetTop + vv.height);
    var pad = 14, room = bottom - top;
    if (r.top >= top + pad && r.bottom <= bottom - pad) return;
    var by = r.height > room - 2 * pad ? r.top - top - pad : r.top - top - Math.max(pad, (room - r.height) * 0.3);
    var how = { top: by, behavior: motion() ? 'smooth' : 'auto' };
    try { if (box) box.scrollBy(how); else global.scrollBy(how); } catch (e) { if (box) box.scrollTop += by; else global.scrollBy(0, by); }
  }
  var lit = null, litT = 0;
  function mark(el, tone, scroll) {
    if (!el) return;
    if (scroll !== false) reveal(el);
    if (lit && lit !== el) lit.classList.remove('of-ask', 'of-miss');
    el.classList.remove('of-ask', 'of-miss');
    void el.offsetWidth;                                   // start the outline's animation again
    el.classList.add(tone === 'miss' ? 'of-miss' : 'of-ask');
    lit = el; clearTimeout(litT);
    litT = setTimeout(function () { if (lit) lit.classList.remove('of-ask', 'of-miss'); lit = null; }, 2600);
  }
  // The answered question, found again after the app has redrawn the step
  function anchorOf(tap, body) {
    if (!tap) return null;
    if (tap.who) return body.querySelector('[data-of-who]');
    if (tap.bc) { var j = body.querySelector('[data-bcn-join]'); return j ? j.closest('.ccs-chips') || j : body.querySelector('[data-bcn-slot]'); }
    if (tap.agree) return body.querySelector('.cc-f-agreement');
    if (tap.act) { var x = body.querySelector('[data-act="' + tap.act + '"]'); return x ? x.closest('.ccs-chips') || x : null; }
    return null;
  }
  var leadT = 0;
  function leadSoon(tap) { clearTimeout(leadT); leadT = setTimeout(function () { lead(tap); }, 60); }
  function lead(tap) {
    var main = form(); if (!main) return;
    var body = main.querySelector('.sl-stepbody'), items = todo(); if (!body || !items) return;
    if (lit) { lit.classList.remove('of-ask', 'of-miss'); lit = null; }   // that question is answered
    paint();
    if (!items.length) {
      if (tap && tap.act === 'n-time' && api().step() === 3) advanceSoon();
      return;
    }
    var from = anchorOf(tap, body), fromTop = from && from.getClientRects().length ? from.getBoundingClientRect().top : -Infinity;
    var next = null, tone = 'ask';
    for (var i = 0; i < items.length; i++) if (items[i].el && items[i].top > fromTop + 2 && items[i].el !== from && !(from && from.contains(items[i].el))) { next = items[i]; break; }
    // A time picked with the delivery details or the short-notice reason still to do: the app says so up there
    if (!next && tap && tap.act === 'n-time' && items[0].el) { next = items[0]; tone = 'miss'; }
    if (!next) return;                                     // what is left is above: Next will show it
    mark(next.el, tone);
    if (tap && tap.who && next.el.id === 'n-phone') focusIn(next.el);
  }
  // Next (or Save) pressed with something missing: show the first thing to fix
  function missedSoon(step) {
    setTimeout(function () {
      var a = api(); if (!a || !form() || a.step() !== step) return;
      var items = todo(); if (items && items.length && items[0].el) mark(items[0].el, 'miss');
    }, 70);
  }
  // 3. A time picked and the step complete: move on to the last step
  var advT = 0;
  function advanceSoon() {
    clearTimeout(advT);
    advT = setTimeout(function () {
      var a = api(); if (!a || !form() || a.step() !== 3 || (a.busy && a.busy())) return;
      var items = todo(); if (!items || items.length) return;
      a.next();
    }, 450);
  }

  // Next lights up once the step is complete; it pulses when it has just become complete
  var lastStep = null, wasReady = null, entT = 0;
  function paint() {
    var a = api(), main = form();
    if (!a || !main) { lastStep = null; wasReady = null; return; }
    var s = a.step(), items = todo(), ready = !!items && !items.length;
    var btn = main.querySelector('.sl-stepbar [data-act="' + (s === 7 ? 'n-submit' : 'sl-next') + '"]');
    if (btn) {
      if (btn.classList.contains('of-ready') !== ready) btn.classList.toggle('of-ready', ready);
      if (ready && wasReady === false && s === lastStep && motion()) { btn.classList.remove('of-pop'); void btn.offsetWidth; btn.classList.add('of-pop'); }
    }
    if (s !== lastStep) {
      lastStep = s; wasReady = ready;
      var V = a.V();
      if (s !== 1 && V && okName(V.takenBy)) { V.takenByOther = false; V.takenByOpen = false; }
      clearTimeout(entT);
      entT = setTimeout(function () {                      // a new step: outline its first question
        var it = todo(); if (it && it.length && it[0].el && a.step() === s) mark(it[0].el, 'ask', false);
      }, 180);
      return;
    }
    wasReady = ready;
  }
  var painting = false;
  function paintSoon() {
    if (painting) return; painting = true;
    (global.requestAnimationFrame || setTimeout)(function () { painting = false; try { paint(); } catch (e) { console.warn('[Order flow] paint', e); } });
  }

  // ---------- taps and typing ----------
  var ANSWER = /^(sl-opt|n-source|n-taken|n-pick|n-cell|n-var|n-finish|n-req|n-unreq|n-diet|n-diets|n-occ|n-rq|n-rqallergy|n-method|n-zone|n-date|n-time|n-rushby|n-plan|n-paym|n-payhalf|sl-heard)$/;
  var tapStep = null;
  if (doc && !global.__ccOrderFlowClicks) {
    global.__ccOrderFlowClicks = true;
    // before the app: where the tap was
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t || !t.closest('#ccs-slipform')) return;
      var a = api(); tapStep = a && form() ? a.step() : null;
      if (!t.closest('[data-act="n-time"]')) clearTimeout(advT);
    }, true);
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var b;
      if ((b = t.closest('#cc-staff [data-of-name]'))) { e.preventDefault(); pickName(b.getAttribute('data-of-name')); return; }
      if ((b = t.closest('#cc-staff [data-of-other]'))) { e.preventDefault(); typeName(); return; }
      if ((b = t.closest('#cc-staff [data-of-use]'))) { e.preventDefault(); useTyped(); return; }
      if ((b = t.closest('#cc-staff [data-of-change]'))) { e.preventDefault(); reopen(); return; }
      if (!(b = t.closest('[data-act],[data-bcn-join],[data-bcn-offer],[data-cc-agree]'))) return;
      var actn = b.getAttribute('data-act') || '', step = tapStep;
      if (step == null) return;                             // not in the New order form
      if (actn === 'sl-next' || actn === 'n-submit') { missedSoon(step); return; }
      if (b.hasAttribute('data-bcn-join') || b.hasAttribute('data-bcn-offer')) { leadSoon({ bc: true }); return; }
      if (b.hasAttribute('data-cc-agree')) { leadSoon({ agree: true }); return; }
      if (ANSWER.test(actn)) leadSoon({ act: actn });
      else paintSoon();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target || e.target.id !== 'of-who-in') return;
      e.preventDefault(); e.stopPropagation(); useTyped();
    }, true);
    doc.addEventListener('input', function (e) {
      var t = e.target; if (!t || !t.closest || !t.closest('#ccs-slipform')) return;
      if (t.id === 'of-who-in') { var er = doc.querySelector('#cc-staff [data-of-err]'); if (er && !er.hidden) er.hidden = true; }
      paintSoon();
    });
    doc.addEventListener('change', function (e) { var t = e.target; if (t && t.closest && t.closest('#ccs-slipform')) paintSoon(); });
    var boot = function () {
      var root = doc.getElementById('cc-staff'); if (!root) return setTimeout(boot, 250);
      new MutationObserver(paintSoon).observe(root, { childList: true, subtree: true });
      paintSoon();
    };
    boot();
  }

  // The slip preview's "Order Taken by" line
  function label(V) { return V && okName(V.takenBy) ? tidy(V.takenBy) : ''; }

  global.CCOrderFlow = { version: VERSION, who: who, okName: okName, label: label, afterOrder: afterOrder, wait: wait, finish: finish, done: done,
    _names: names, _todo: todo };
})(window);
