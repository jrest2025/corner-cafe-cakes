// Islands for other screens (18 October 2026): the same pattern as Needs attention, applied after each render.
// Handover: each section becomes an island; tapping opens it in the centred pop-up, or in the right-hand pane on wide screens.
// Customers: "Customers needing attention" rows become islands that open the existing filtered list.
// Works on the rendered page only: the sections, buttons and their actions are the app's own, moved, not copied.
var IX = { open: {}, scroll: 0 };
var IX_ICON = {
  notes: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  finish: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  except: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  special: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  who: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8"/>'
};
function ixSvg(k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IX_ICON[k] || IX_ICON.notes) + '</svg>'; }
// Handover sections, in the order the app renders them. Count is what needs doing, not every line.
var IX_HO = [
  { m: function (s) { return s.classList.contains('ho-notes'); }, k: 'notes', name: 'Handover notes', tone: 'ap-amber', n: function (s) { return s.querySelectorAll('.ho-note.is-open').length; }, unit: ['note to read', 'notes to read'] },
  { m: function (s) { return /^Still to finish/.test(s.querySelector('h2').textContent); }, k: 'finish', name: 'Still to finish today', tone: 'ap-red', n: function (s) { return s.querySelectorAll('[data-act="open-order"]').length; } },
  { m: function (s) { return /^Exceptions/.test(s.querySelector('h2').textContent); }, k: 'except', name: 'Exceptions to pass on', tone: 'ap-amber', n: function (s) { return [].reduce.call(s.querySelectorAll('.at-jump b'), function (t, b) { return t + (+b.textContent || 0); }, 0); } },
  { m: function (s) { return /^Special requests/.test(s.querySelector('h2').textContent); }, k: 'special', name: 'Special requests', tone: 'ap-orange', n: function (s) { return s.querySelectorAll('.kw-line').length; } },
  { m: function (s) { return /^Who is making/.test(s.querySelector('h2').textContent); }, k: 'who', name: 'Who is making what', tone: 'ap-slate', n: function (s) { return s.querySelectorAll('.ho-person').length; }, unit: ['person', 'people'] }
];
function ixWide() { return typeof apSplit === 'function' && apSplit(); }
function ixHandover(main) {
  var secs = [].slice.call(main.querySelectorAll(':scope > section.ho-sec'));
  if (!secs.length || main.querySelector('.ix-wrap')) return;
  var found = secs.map(function (s) { var d = IX_HO.filter(function (x) { return s.querySelector('h2') && x.m(s); })[0]; return d ? { s: s, d: d } : null; }).filter(Boolean);
  if (found.length < 2) return;
  var wide = ixWide(), open = IX.open.handover;
  // Wide screens always show one section in the pane; the note to read comes first.
  if (wide && !found.some(function (f) { return f.d.k === open; })) open = found[0].d.k;
  var wrap = document.createElement('div'); wrap.className = 'ix-wrap' + (wide ? ' ap-split' : '');
  var isl = document.createElement('div'); isl.className = 'ap-islands' + (wide ? ' ap-col' : ''); isl.setAttribute('role', 'group'); isl.setAttribute('aria-label', 'Shift handover');
  found.forEach(function (f) {
    var n = f.d.n(f.s), on = open === f.d.k, b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-island ' + (n ? f.d.tone : 'ap-slate') + (on ? ' is-open' : '') + (n ? '' : ' ix-zero');
    b.setAttribute('data-ix', 'handover'); b.setAttribute('data-v', f.d.k);
    if (wide) { b.setAttribute('aria-pressed', on); b.setAttribute('aria-controls', 'ap-pane'); } else { b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', on); }
    b.innerHTML = '<span class="ap-icon">' + ixSvg(f.d.k) + '</span><span class="ap-text"><b>' + n + '</b><span>' + Tt(f.d.name) + '</span></span>';
    isl.appendChild(b);
  });
  secs[0].parentNode.insertBefore(wrap, secs[0]); wrap.appendChild(isl);
  var cur = found.filter(function (f) { return f.d.k === open; })[0];
  found.forEach(function (f) { if (f !== cur) { f.s.hidden = true; wrap.appendChild(f.s); } });
  if (!cur) return;
  var n = cur.d.n(cur.s), sub = cur.d.unit ? n + ' ' + cur.d.unit[n === 1 ? 0 : 1] : n + (n === 1 ? ' item' : ' items');
  var head = '<div class="ap-pop-head"><span class="ap-icon">' + ixSvg(cur.d.k) + '</span><div class="ap-pop-title"><h2>' + Tt(cur.d.name) + '</h2><span>' + Tt(sub) + '</span></div>' +
    (wide ? '' : '<button type="button" class="ap-close" data-ix-close="handover" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg><span>Close</span></button>') + '</div>';
  var box = document.createElement(wide ? 'section' : 'div');
  if (wide) { box.className = 'ap-pane ' + cur.d.tone; box.id = 'ap-pane'; box.setAttribute('aria-label', cur.d.name); }
  else {
    var scrim = document.createElement('div'); scrim.className = 'ap-scrim'; scrim.setAttribute('data-ix-close', 'handover'); scrim.setAttribute('aria-hidden', 'true'); wrap.appendChild(scrim);
    box.className = 'ap-pop ' + cur.d.tone; box.id = 'ap-pop'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', cur.d.name);
  }
  box.innerHTML = head + '<div class="ap-pop-body' + (wide ? ' ap-pane-body' : '') + ' ix-body"></div>';
  box.querySelector('.ix-body').appendChild(cur.s); cur.s.classList.add('ix-in');
  wrap.appendChild(box);
}
// Customers: the needing-attention rows as islands. Each keeps its own button and action (opens the filtered list).
function ixCustomers(main) {
  var card = main.querySelector('section.ov-att'); if (!card || card.classList.contains('ix-done')) return;
  card.classList.add('ix-done');
  var rows = [].slice.call(card.querySelectorAll('.ov-arow')); if (!rows.length) return;
  var grid = document.createElement('div'); grid.className = 'ix-cgrid';
  rows.forEach(function (r) {
    var n = +((r.querySelector('.ov-an') || {}).textContent || 0);
    r.classList.add('ap-island', n ? 'ap-amber' : 'ap-slate', 'ix-crow'); if (!n) r.classList.add('ix-zero');
    grid.appendChild(r);
  });
  card.appendChild(grid);
}
function ixApply() {
  var main = document.getElementById('ccs-main'); if (!main) return;
  var sc = main.getAttribute('data-screen');
  if (sc === 'handover') ixHandover(main);
  else if (sc && sc.indexOf('customers') === 0) ixCustomers(main);
  else if (IX.open.handover && sc) IX.open.handover = null;
}
function ixSet(screen, k) {
  var was = IX.open[screen];
  IX.open[screen] = k; Ma();
  setTimeout(function () {
    var el = k && !ixWide() ? document.querySelector('#ap-pop .ap-close') : document.querySelector('.ap-island[data-ix="' + screen + '"][data-v="' + (k || was) + '"]');
    if (el && el.focus) el.focus({ preventScroll: true });
  }, 30);
}
(function () {
  var t = null;
  function soon() { if (t) return; t = requestAnimationFrame(function () { t = null; ixApply(); }); }
  function watch() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(watch, 200);
    new MutationObserver(soon).observe(root, { childList: true, subtree: true });
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ix],[data-ix-close]'); if (!b || !root.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      if (b.hasAttribute('data-ix-close')) return ixSet(b.getAttribute('data-ix-close'), null);
      var sc = b.getAttribute('data-ix'), k = b.getAttribute('data-v');
      ixSet(sc, ixWide() ? k : (IX.open[sc] === k ? null : k));
    }, true);
    soon();
  }
  watch();
  // Escape closes a screen's pop-up (an order open on top closes first).
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !document.querySelector('.ix-wrap #ap-pop')) return;
    var sheet = document.getElementById('ccs-sheet'); if (y.sheet || (sheet && sheet.classList.contains('ccs-open'))) return;
    e.preventDefault(); e.stopImmediatePropagation(); ixSet('handover', null);
  }, true);
})();
