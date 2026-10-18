// Colour icons and tidy layout (18 October 2026). Today and Kitchen: solid colour icon tiles on the figures and
// section headings, and "Booked this week" joins the figure strip. Layout only; no data or actions change.
var CL_I = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  money: '<path d="M12 3v18M16.5 7.5c-.6-1.4-2.2-2.3-4.5-2.3-2.6 0-4.3 1.2-4.3 3.1 0 4.4 9 2.4 9 7 0 1.9-1.9 3.3-4.7 3.3-2.4 0-4.2-1-4.8-2.6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  inbox: '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  cake: '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 16c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0"/><path d="M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z"/>',
  whisk: '<path d="M4 20l7-7"/><path d="M11 13c-2-4-1-8 3-10 4 2 5 6 3 10-1.5 1.5-4.5 1.5-6 0z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
function clTile(icon, colour, size) {
  return '<span class="cl-tile cl-' + colour + '" aria-hidden="true"><svg viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + CL_I[icon] + '</svg></span>';
}
function clHead(el, icon, colour) {
  if (!el || el.querySelector(':scope > .cl-tile')) return;
  el.insertAdjacentHTML('afterbegin', clTile(icon, colour, 16)); el.classList.add('cl-h');
}
function clToday(main) {
  var st = main.querySelector(':scope > .tq-stats'); if (!st) return;
  var map = { today: ['clock', 'blue'], deposit: ['money', 'green'], upcoming: ['cal', 'purple'] };
  [].forEach.call(st.querySelectorAll('.tq-stat'), function (s, i) {
    if (s.querySelector('.cl-tile')) return;
    var m = map[s.getAttribute('data-v')] || [['clock', 'money', 'cal'][i] || 'star', ['blue', 'green', 'purple'][i] || 'teal'];
    var old = s.querySelector('.vr-stat-icon'); if (old) old.remove();
    s.insertAdjacentHTML('afterbegin', clTile(m[0], m[1], 22)); s.classList.add('cl-stat');
  });
  // "Booked this week" becomes the fourth figure instead of a line at the bottom of the page.
  var biz = main.querySelector(':scope > .tq-biz');
  if (biz && !st.querySelector('.cl-biz')) {
    var b = biz.querySelector('b'), lab = biz.querySelector('span'), sub = biz.querySelector('small');
    st.insertAdjacentHTML('beforeend', '<div class="tq-stat cl-stat cl-biz" role="group" aria-label="Booked this week">' + clTile('chart', 'teal', 22) + '<b>' + Tt(b ? b.textContent : '') + '</b><span>' + Tt(lab ? lab.textContent : 'Booked this week') + '</span><small>' + Tt(sub ? sub.textContent : '') + '</small></div>');
    biz.classList.add('cl-moved');
  }
  clHead(main.querySelector('.tq-warn .tq-wh h2'), 'alert', 'pink');
  clHead(main.querySelector('.tq-weekh h2'), 'cal', 'purple');
  [].forEach.call(main.querySelectorAll('.tq-main .ccs-card-head h2'), function (h) {
    if (/^Due today/.test(h.textContent)) clHead(h, 'clock', 'blue'); else clHead(h, 'inbox', 'amber');
  });
}
function clKitchen(main) {
  var c = main.querySelectorAll('.kw-counts .kw-count'), ic = [['whisk', 'amber'], ['check', 'green'], ['cal', 'purple']];
  [].forEach.call(c, function (k, i) { if (!k.querySelector('.cl-tile')) { k.insertAdjacentHTML('afterbegin', clTile((ic[i] || ic[0])[0], (ic[i] || ic[0])[1], 20)); k.classList.add('cl-count'); } });
  clHead(main.querySelector('.kw-next .kw-label'), 'cake', 'pink');
  clHead(main.querySelector('.kw-att > h2'), 'alert', 'amber');
  clHead(main.querySelector('.kw-week > h2'), 'cal', 'purple');
}
function clApply() {
  var main = document.getElementById('ccs-main'); if (!main) return;
  var sc = main.getAttribute('data-screen');
  if (sc === 'today') clToday(main); else if (sc === 'kitchen-today') clKitchen(main);
}
(function () {
  var t = null;
  function soon() { if (t) return; t = requestAnimationFrame(function () { t = null; clApply(); }); }
  function watch() { var root = document.getElementById('cc-staff'); if (!root) return setTimeout(watch, 200); new MutationObserver(soon).observe(root, { childList: true, subtree: true }); soon(); }
  watch();
})();
