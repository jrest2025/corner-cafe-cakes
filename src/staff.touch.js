/* Corner Café Service Hub: touch standard helpers (21 October 2026). Visual only: nothing here saves, changes or
   decides anything about orders.
   - Phones: New order as the big middle button of the bottom menu (Today, Orders, New order, More). It is the app's own
     New order button (data-tab="new"), so the steps are exactly as before.
   - Phones: pulling the drag handle of a bottom sheet down closes it, like the Close button (typed details are kept,
     as now).
   - Tablets and phones: the website's reveal animation is kept off the app (data-no-motion), and the touch styles stay
     last on the page so later styles cannot undo them. */
(function (global) {
  'use strict';
  if (global.CCTouch) return;
  var doc = document;
  var PHONE = '(max-width: 700px)', TOUCH = '(hover: none) and (pointer: coarse), (max-width: 700px)';
  function mq(q) { try { return !!(global.matchMedia && global.matchMedia(q).matches); } catch (e) { return false; } }

  // The website's reveal animation skips the app
  function noMotion() {
    if (!mq(TOUCH)) return;
    var e = doc.getElementById('cc-staff');
    for (; e && e !== doc.body && e !== doc.documentElement; e = e.parentElement) {
      if (!e.hasAttribute('data-no-motion')) e.setAttribute('data-no-motion', '');
      e.classList.remove('ccm-motion', 'ccm-image', 'ccm-group', 'ccm-decision', 'ccm-hero-title', 'ccm-hero-copy', 'ccm-hero-action');
    }
    var m = doc.getElementById('ccs-main');
    if (m && !m.hasAttribute('data-no-motion')) m.setAttribute('data-no-motion', '');
  }

  // Phones: New order in the bottom menu, between Orders and More
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>';
  function newBar() {
    var nav = doc.querySelector('#cc-staff .ccs-side .ccs-nav'), top = doc.querySelector('#cc-staff .ccs-topnew');
    var root = doc.documentElement;
    if (!nav || !top) { root.classList.remove('cc-t-newbar'); return; }
    if (!nav.querySelector(':scope > .cc-t-new')) {
      // data-tab="new", like the app's own New order button, so the app opens it exactly as before
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'cc-t-new'; b.setAttribute('data-tab', 'new');
      b.innerHTML = ICON + '<span>New order</span>';
      var more = nav.querySelector(':scope > .ccs-nav-phone');
      nav.insertBefore(b, more || null);
    }
    root.classList.add('cc-t-newbar');
  }

  // Phones: pull the handle down to close a bottom sheet
  var drag = null;
  function sheetOpen() { var s = doc.getElementById('ccs-sheet'); return s && s.classList.contains('ccs-open') ? s : null; }
  doc.addEventListener('touchstart', function (e) {
    if (!mq(PHONE) || !e.touches || e.touches.length !== 1) return;
    var s = sheetOpen(); if (!s || !s.contains(e.target)) return;
    if (e.target.closest && e.target.closest('button, a, input, select, textarea, label, [contenteditable]')) return;
    var t = e.touches[0], r = s.getBoundingClientRect();
    if (t.clientY - r.top > 40) return;
    drag = { s: s, y: t.clientY, dy: 0 };
  }, { passive: true });
  doc.addEventListener('touchmove', function (e) {
    if (!drag || !e.touches || !e.touches.length) return;
    drag.dy = Math.max(0, e.touches[0].clientY - drag.y);
    drag.s.style.translate = drag.dy ? '0 ' + Math.round(drag.dy) + 'px' : '';
  }, { passive: true });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    d.s.style.translate = '';
    if (d.dy > 90) {
      var x = d.s.querySelector('.ccs-sheet-head .ccs-x') || d.s.querySelector('[data-act="close"]');
      if (x) x.click();
    }
  }
  doc.addEventListener('touchend', endDrag, { passive: true });
  doc.addEventListener('touchcancel', function () { if (drag) { drag.s.style.translate = ''; drag = null; } }, { passive: true });

  // Keep the touch styles last on the page
  function last() {
    var h = doc.head; if (!h) return;
    ['ccs-touch-text', 'ccs-touch'].forEach(function (id) {
      var s = doc.getElementById(id);
      if (s && s.parentNode === h) {
        var after = s.nextElementSibling, later = false;
        for (; after; after = after.nextElementSibling) if (/^(STYLE|LINK)$/.test(after.tagName) && !/^ccs-touch/.test(after.id)) { later = true; break; }
        if (later) h.appendChild(s);
      }
    });
  }

  var queued = false;
  function tick() {
    queued = false;
    noMotion(); newBar();
  }
  function schedule() { if (!queued) { queued = true; (global.requestAnimationFrame || setTimeout)(tick); } }
  function start() {
    tick();
    var root = doc.getElementById('cc-staff');
    if (root && global.MutationObserver) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    [0, 1500, 5000].forEach(function (ms) { setTimeout(last, ms); });
    global.addEventListener('load', last);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  global.CCTouch = { version: '2026-10-21-touch-v1', newBar: newBar, last: last };
})(window);
