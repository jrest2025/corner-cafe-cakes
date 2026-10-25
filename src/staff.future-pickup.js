/* Corner Cafe Service Hub — Future Pickup chooser (2026-10-26).
   Presentation-only enhancement. Uses the existing new-order buttons, native date
   field, shared calendar and order validation. Does not write or submit orders. */
(function (win, doc) {
  'use strict';
  if (win.__ccFuturePickup20261026) return;
  win.__ccFuturePickup20261026 = true;

  var ROOT = '#cc-staff #ccs-slipform';
  var scheduled = false;
  var opening = false;

  function todayFiji() {
    var bits = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Pacific/Fiji', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var p = {};
    bits.forEach(function (part) { if (part.type !== 'literal') p[part.type] = part.value; });
    return p.year + '-' + p.month + '-' + p.day;
  }
  function daysAhead(n) {
    var d = new Date(todayFiji() + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function isOld(form) {
    try {
      var data = win.__ccsOf && win.__ccsOf.V && win.__ccsOf.V();
      if (data) return !!data.old;
    } catch (_) {}
    return form.classList.contains('is-old') ||
      !!form.querySelector('[data-oo-mode="old"][aria-pressed="true"]');
  }
  function ensureStyle() {
    if (doc.getElementById('cc-future-pickup-style')) return;
    var s = doc.createElement('style');
    s.id = 'cc-future-pickup-style';
    s.textContent =
      '#cc-staff .cc-fp-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin:10px 0 14px}' +
      '#cc-staff .cc-fp-actions button{min-height:52px;min-width:0;box-sizing:border-box;padding:12px 16px;' +
      'border-radius:11px;font-family:inherit;font-weight:600;font-size:15px;line-height:1.35;cursor:pointer;touch-action:manipulation}' +
      '#cc-staff .cc-fp-calendar{flex:1 1 210px;background:#234e78;border:1px solid #234e78;color:#fff}' +
      '#cc-staff .cc-fp-two-weeks{flex:1 1 135px;background:#f5f8fb;border:1px solid #bdcbd9;color:#244665}' +
      '#cc-staff .cc-fp-calendar:focus-visible,#cc-staff .cc-fp-two-weeks:focus-visible{outline:3px solid #79a8dc;outline-offset:3px}' +
      '#cc-staff .cc-fp-caption{margin:0 0 8px;color:#536578;font-size:14px;line-height:1.4}' +
      '@media(max-width:480px){#cc-staff .cc-fp-actions{display:grid;grid-template-columns:1fr}' +
      '#cc-staff .cc-fp-actions button{width:100%;min-height:52px}}';
    doc.head.appendChild(s);
  }
  function ensureControls() {
    var form = doc.querySelector(ROOT);
    if (!form || isOld(form)) return;
    var other = form.querySelector('[data-act="n-date-other"]');
    if (!other) return;
    var parent = other.closest('.ccs-field');
    if (!parent || parent.querySelector('.cc-fp-actions')) return;
    ensureStyle();
    var caption = doc.createElement('p');
    caption.className = 'cc-fp-caption';
    caption.textContent = 'Taking an order for another day? Choose any available future pickup date.';
    var row = doc.createElement('div');
    row.className = 'cc-fp-actions';
    var calendar = doc.createElement('button');
    calendar.type = 'button';
    calendar.className = 'cc-fp-calendar';
    calendar.setAttribute('data-cc-future-calendar', '1');
    calendar.textContent = 'Choose pickup date (calendar)';
    var inTwoWeeks = doc.createElement('button');
    inTwoWeeks.type = 'button';
    inTwoWeeks.className = 'cc-fp-two-weeks';
    inTwoWeeks.setAttribute('data-act', 'n-date');
    inTwoWeeks.setAttribute('data-v', daysAhead(14));
    inTwoWeeks.textContent = 'Pickup in 2 weeks';
    row.appendChild(calendar);
    row.appendChild(inTwoWeeks);
    var chips = parent.querySelector('.ccs-datechips');
    parent.insertBefore(caption, chips || parent.firstChild);
    parent.insertBefore(row, chips || null);
  }
  function openFutureCalendar() {
    var form = doc.querySelector(ROOT);
    if (!form || isOld(form) || opening) return;
    var other = form.querySelector('[data-act="n-date-other"]');
    if (!other) return;
    opening = true;
    if (!form.querySelector('#n-date')) other.click(); // existing app shows the real date input
    var frames = 0;
    function show() {
      var current = doc.querySelector(ROOT);
      var nativeDate = current && current.querySelector('#n-date');
      if (!nativeDate || isOld(current)) { opening = false; return; }
      var trigger = current.querySelector('#n-date + .cc-dp-trigger');
      if (trigger && !trigger.disabled) {
        opening = false;
        trigger.click(); // open the site's existing shared date picker
        return;
      }
      // If the shared date picker has not loaded, leave the original date field
      // usable instead of blocking order taking.
      if (++frames < 12) { win.requestAnimationFrame(show); return; }
      opening = false;
      if (!nativeDate.hidden) {
        nativeDate.focus();
        try { if (nativeDate.showPicker) nativeDate.showPicker(); } catch (_) {}
      }
    }
    win.requestAnimationFrame(show);
  }
  doc.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('[data-cc-future-calendar]');
    if (!btn || !btn.closest(ROOT)) return;
    e.preventDefault();
    e.stopPropagation();
    openFutureCalendar();
  }, true);
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    win.requestAnimationFrame(function () { scheduled = false; ensureControls(); });
  }
  function boot() {
    ensureControls();
    new MutationObserver(schedule).observe(doc.getElementById('cc-staff') || doc.body,
      { childList: true, subtree: true });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window, document);
