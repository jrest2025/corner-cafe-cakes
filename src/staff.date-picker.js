/* Corner Cafe staff date picker.
   Progressive enhancement only: the original date input remains the source of truth. */
(function () {
  'use strict';
  if (window.__ccDatePicker20261019) return;
  window.__ccDatePicker20261019 = true;

  var active = null, month = null, returnFocus = null, serial = 0;
  var layer = document.createElement('div');
  layer.id = 'cc-date-picker-layer';
  layer.className = 'cc-dp-layer';
  layer.hidden = true;
  document.body.appendChild(layer);

  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
  }
  function fijiToday() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return parse(o.year + '-' + o.month + '-' + o.day);
  }
  function pretty(s) {
    var d = parse(s);
    return d ? new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d) : 'Choose date';
  }
  function monthName(d) { return new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(d); }
  function dayName(d) { return new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
  function esc(s) { return String(s || '').replace(/[&<>\"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function within(s, input) { return (!input.min || s >= input.min) && (!input.max || s <= input.max); }
  function labelFor(input) {
    var lab = input.id && document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
    if (!lab) lab = input.closest('.ccs-field,.sl-sub,.ccs-panel') && input.closest('.ccs-field,.sl-sub,.ccs-panel').querySelector('label,.ccs-label,.sl-k');
    return lab ? lab.textContent.replace(/\s+/g, ' ').replace(/Required/g, '').trim() : 'date';
  }
  function sync(input) {
    if (!input || !input._ccDateButton) return;
    var b = input._ccDateButton, value = input.value;
    b.querySelector('.cc-dp-value').textContent = pretty(value);
    b.classList.toggle('is-empty', !value);
    b.disabled = input.disabled;
    b.setAttribute('aria-label', (value ? 'Change ' : 'Choose ') + labelFor(input) + (value ? ', currently ' + pretty(value) : ''));
  }
  function enhance(input) {
    if (!input || input.dataset.ccDatePicker || input.closest('#cc-date-picker-layer')) return;
    var wasFocused = document.activeElement === input;
    input.dataset.ccDatePicker = '1';
    input.classList.add('cc-dp-native');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    input.hidden = true;
    var id = 'cc-dp-' + (++serial), b = document.createElement('button');
    b.type = 'button'; b.id = id; b.className = 'ccs-input cc-dp-trigger is-empty';
    b.dataset.ccDateOpen = '1'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span class="cc-dp-value">Choose date</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18M8 15h3M14 15h2"/></svg>';
    input.after(b); input._ccDateButton = b; b._ccDateInput = input;
    var lab = input.id && document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
    if (lab) { lab.dataset.ccDateFor = input.id; lab.htmlFor = id; }
    sync(input);
    if (wasFocused) b.focus();
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches && node.matches('input[type="date"]')) enhance(node);
    if (node.querySelectorAll) node.querySelectorAll('input[type="date"]').forEach(enhance);
  }
  function monthAllowed(d, dir) {
    if (!active) return false;
    var first = new Date(d.getFullYear(), d.getMonth() + dir, 1, 12);
    var last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12);
    return (!active.min || isoDate(last) >= active.min) && (!active.max || isoDate(first) <= active.max);
  }
  function render() {
    if (!active || !active.isConnected) return close(false);
    var selected = parse(active.value), today = fijiToday();
    var first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(first); start.setDate(first.getDate() - offset);
    var days = '', i;
    for (i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      var s = isoDate(d), outside = d.getMonth() !== first.getMonth(), disabled = !within(s, active);
      days += '<button type="button" class="cc-dp-day' + (outside ? ' is-outside' : '') + (selected && s === isoDate(selected) ? ' is-selected' : '') + (s === isoDate(today) ? ' is-today' : '') + '" data-cc-date-day="' + s + '"' + (disabled ? ' disabled' : '') + ' aria-label="' + esc(dayName(d)) + '"' + (selected && s === isoDate(selected) ? ' aria-pressed="true"' : '') + (s === isoDate(today) ? ' aria-current="date"' : '') + '><span>' + d.getDate() + '</span></button>';
    }
    layer.innerHTML = '<div class="cc-dp-backdrop" data-cc-date-close="1"></div><section class="cc-dp-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-dp-title">' +
      '<header class="cc-dp-head"><div><p>Choose date</p><h2 id="cc-dp-title">' + esc(monthName(first)) + '</h2></div><button type="button" class="cc-dp-close" data-cc-date-close="1" aria-label="Close calendar">&#215;</button></header>' +
      '<div class="cc-dp-nav"><button type="button" data-cc-date-move="-1"' + (monthAllowed(first, -1) ? '' : ' disabled') + ' aria-label="Previous month">&#8592;</button><button type="button" data-cc-date-today="1"' + (within(isoDate(today), active) ? '' : ' disabled') + '>Today</button><button type="button" data-cc-date-move="1"' + (monthAllowed(first, 1) ? '' : ' disabled') + ' aria-label="Next month">&#8594;</button></div>' +
      '<div class="cc-dp-week" aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>' +
      '<div class="cc-dp-grid" role="grid" aria-label="' + esc(monthName(first)) + '">' + days + '</div>' +
      '<footer class="cc-dp-foot">' + (active.required ? '' : '<button type="button" class="cc-dp-clear" data-cc-date-clear="1">Clear date</button>') + '<button type="button" class="cc-dp-cancel" data-cc-date-close="1">Cancel</button></footer></section>';
    requestAnimationFrame(function () {
      var chosen = layer.querySelector('.is-selected:not([disabled])');
      var target = chosen || layer.querySelector('[aria-current="date"]:not([disabled])') || layer.querySelector('.cc-dp-day:not([disabled])');
      if (target) target.focus();
    });
  }
  function open(input, button) {
    active = input; returnFocus = button; button.setAttribute('aria-expanded', 'true');
    var d = parse(input.value) || fijiToday(); month = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    layer.hidden = false; document.documentElement.classList.add('cc-date-picker-open'); render();
  }
  function close(focus) {
    if (returnFocus) returnFocus.setAttribute('aria-expanded', 'false');
    layer.hidden = true; layer.innerHTML = ''; document.documentElement.classList.remove('cc-date-picker-open');
    var b = returnFocus; active = null; month = null; returnFocus = null;
    if (focus !== false && b && b.isConnected) b.focus();
  }
  function choose(s) {
    if (!active || (s ? !within(s, active) : active.required)) return;
    var input = active; input.value = s; sync(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cc-date-open]');
    if (b && b._ccDateInput) { e.preventDefault(); open(b._ccDateInput, b); return; }
    if (e.target.closest && e.target.closest('[data-cc-date-close]')) { e.preventDefault(); close(); return; }
    var day = e.target.closest && e.target.closest('[data-cc-date-day]');
    if (day) { e.preventDefault(); choose(day.dataset.ccDateDay); return; }
    var move = e.target.closest && e.target.closest('[data-cc-date-move]');
    if (move && month) { e.preventDefault(); month = new Date(month.getFullYear(), month.getMonth() + Number(move.dataset.ccDateMove), 1, 12); render(); return; }
    if (e.target.closest && e.target.closest('[data-cc-date-today]')) { e.preventDefault(); choose(isoDate(fijiToday())); return; }
    if (e.target.closest && e.target.closest('[data-cc-date-clear]')) { e.preventDefault(); choose(''); }
  }, true);
  document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('input[type="date"][data-cc-date-picker]')) sync(e.target); });
  document.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('input[type="date"][data-cc-date-picker]')) sync(e.target); });
  document.addEventListener('keydown', function (e) {
    if (layer.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    var focusable = [].slice.call(layer.querySelectorAll('button:not([disabled])'));
    if (!focusable.length) return;
    var n = focusable.indexOf(document.activeElement);
    if (!e.shiftKey && n === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
    else if (e.shiftKey && n === 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
  }, true);

  scan(document.body);
  new MutationObserver(function (records) {
    records.forEach(function (r) { r.addedNodes.forEach(scan); });
    if (active && !active.isConnected) close(false);
  }).observe(document.body, { childList: true, subtree: true });
})();
