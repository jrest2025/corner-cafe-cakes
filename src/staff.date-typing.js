// Order dates typed on a keyboard (20 October 2026). Presentation and timing only: no data, rules or checks change.
// The New order form redraws itself when the collection date changes. While someone was still typing a date
// (month, day, then the year digit by digit), that redraw cut the year off after its first digit, so dates were
// saved as year 1 or 2. Keyboard typing in that field now marks it: the form redraws as soon as the four-digit year
// is complete, and an edit to a date that is already complete waits until the field is left. Picking a date from a
// calendar (no typing) still updates the form straight away. Past dates stay allowed.
(function () {
  'use strict';
  if (window.__ccDateTyping20261020) return;
  window.__ccDateTyping20261020 = true;
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[type="date"][data-n="date"]')) t.__ccTyped = true;
  }, true);
})();
