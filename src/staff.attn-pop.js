// Needs attention islands with a pop-up detail panel (18 October 2026).
// Inserted into the released bundle's main scope: y = app state, Ma = re-render, Tt = HTML escape.
// Islands stay compact; tapping one opens a floating panel over the dashboard so the page never fills with lists.
var AP_ICON = {
  overdue: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  soon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  todaykit: '<path d="M6 13.9A4 4 0 1 1 8.4 6.3a4 4 0 0 1 7.2 0A4 4 0 1 1 18 13.9V21H6z"/><path d="M6 17h12"/>',
  unconf: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 15.5l2 2 4-4"/>',
  waiting: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
  pay: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  allergy: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>',
  data: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11v3M12 18h.01"/>',
  complaint: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4M12 14h.01"/>'
};
var AP_TONE = { overdue: 'ap-red', soon: 'ap-red', todaykit: 'ap-amber', unconf: 'ap-amber', waiting: 'ap-slate', pay: 'ap-blue', allergy: 'ap-orange', data: 'ap-amber', complaint: 'ap-purple' };
var AP_SHORT = { overdue: 'Overdue', soon: 'Due soon, not ready', todaykit: 'Kitchen not finished', unconf: 'Not confirmed', waiting: 'Waiting on you', pay: 'Balance to pay', allergy: 'Allergies to check', data: 'Missing details', complaint: 'Customer concerns' };
function apSvg(k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (AP_ICON[k] || AP_ICON.overdue) + '</svg>'; }
// Wide landscape screens (desktop, iPad landscape) use two panes like an inbox: islands on the left, the chosen
// category's orders on the right. Portrait tablets and phones keep the pop-up.
var AP_WIDE = '(min-width: 1100px) and (orientation: landscape)';
function apSplit() { return !!(window.matchMedia && matchMedia(AP_WIDE).matches); }
// The open category, or null. A category that has emptied out closes its panel.
// In two panes something is always open: the chosen category, or the most urgent one (the first island).
function apOpen(gs) {
  var k = y.attnIsland, ok = k && gs.some(function (g) { return g.key === k; });
  if (ok) return k;
  return apSplit() && gs.length ? gs[0].key : null;
}
function apIslands(gs) {
  var open = apOpen(gs), split = apSplit();
  return (split ? '<div class="ap-split">' : '') + '<div class="ap-islands' + (split ? ' ap-col' : '') + '" role="group" aria-label="What needs attention">' + gs.map(function (g) {
    var on = open === g.key;
    return '<button type="button" class="ap-island ' + (AP_TONE[g.key] || 'ap-slate') + (on ? ' is-open' : '') + '" data-act="ap-open" data-v="' + g.key + '" ' + (split ? 'aria-pressed="' + on + '" aria-controls="ap-pane"' : 'aria-haspopup="dialog" aria-expanded="' + on + '"') + ' title="' + Tt(g.title) + '">' +
      '<span class="ap-icon">' + apSvg(g.key) + '</span><span class="ap-text"><b>' + g.rows.length + '</b><span>' + Tt(AP_SHORT[g.key] || g.title) + '</span></span></button>';
  }).join('') + '</div>';
}
// body is the existing group section (same rows, reasons and order buttons as before), rendered for the open category only.
function apPanel(gs, body) {
  var open = apOpen(gs);
  if (apSplit()) {
    if (!open || !body) return '</div>';
    var p = gs.filter(function (x) { return x.key === open; })[0], n = p.rows.length + (p.rows.length === 1 ? ' order' : ' orders');
    return '<section class="ap-pane ' + (AP_TONE[open] || 'ap-slate') + '" id="ap-pane" aria-label="' + Tt(p.title) + ', ' + n + '" aria-live="polite">' +
      '<div class="ap-pop-head"><span class="ap-icon">' + apSvg(open) + '</span><div class="ap-pop-title"><h2>' + Tt(p.title) + '</h2><span>' + n + ' · tap an order to open it</span></div></div>' +
      '<div class="ap-pop-body ap-pane-body">' + body + '</div></section></div>';
  }
  if (!open || !body) return '';
  var g = gs.filter(function (x) { return x.key === open; })[0];
  return '<div class="ap-scrim" data-act="ap-close" aria-hidden="true"></div><div class="ap-pop ' + (AP_TONE[open] || 'ap-slate') + '" id="ap-pop" role="dialog" aria-modal="false" aria-label="' + Tt(g.title) + ', ' + g.rows.length + (g.rows.length === 1 ? ' order' : ' orders') + '">' +
    '<div class="ap-pop-head"><span class="ap-icon">' + apSvg(open) + '</span><div class="ap-pop-title"><h2>' + Tt(g.title) + '</h2><span>' + g.rows.length + (g.rows.length === 1 ? ' order' : ' orders') + ' · tap an order to open it</span></div>' +
    '<button type="button" class="ap-close" data-act="ap-close" aria-label="Close">' + '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg><span>Close</span></button></div>' +
    '<div class="ap-pop-body">' + body + '</div></div>';
}
function apSet(k) {
  var was = y.attnIsland;
  // Two panes: choosing a category just shows it; there is nothing to close, so focus stays on the island.
  if (apSplit()) {
    if (!k) return;
    y.attnIsland = k; apScroll = 0; Ma();
    setTimeout(function () { var el = document.querySelector('.ap-island[data-v="' + k + '"]'); if (el && el.focus) el.focus({ preventScroll: true }); }, 20);
    return;
  }
  y.attnIsland = k; apScroll = 0; Ma();
  // Focus moves into the panel when it opens, and back to its island when it closes.
  setTimeout(function () {
    var el = k ? document.querySelector('#ap-pop .ap-close') : was && document.querySelector('.ap-island[data-v="' + was + '"]');
    if (el && el.focus) el.focus({ preventScroll: true });
  }, 20);
}
var apScroll = 0;
// Keep the panel inside the working area (never over the side menu or the phone tab bar), and keep its scroll on live refresh.
function apPlace() {
  var scr = document.getElementById('ccs-main');
  // Leaving Needs attention closes the panel, so it is not waiting open on return.
  if (scr && scr.getAttribute('data-screen') !== 'attn' && y.attnIsland) y.attnIsland = null;
  var pop = document.getElementById('ap-pop'), scrim = document.querySelector('.ap-scrim');
  document.documentElement.classList.toggle('ap-is-open', !!pop);
  var pane = document.querySelector('#ap-pane .ap-pane-body');
  if (pane) {
    // The reading pane sits beside the islands and fills down to the bottom of the screen.
    var pr = document.getElementById('ap-pane');
    pr.style.setProperty('--ap-pane-top', Math.max(16, Math.min(pr.getBoundingClientRect().top, 120)) + 'px');
    if (!pane.dataset.apBound) { pane.dataset.apBound = '1'; pane.scrollTop = apScroll; pane.addEventListener('scroll', function () { apScroll = pane.scrollTop; }, { passive: true }); }
  }
  if (!pop) return;
  var main = document.getElementById('ccs-main'), nav = document.querySelector('.ccs-nav');
  var r = main ? main.getBoundingClientRect() : { left: 0, width: innerWidth };
  // Only a phone tab bar fixed to the bottom counts; on larger screens .ccs-nav is the side menu list.
  var nr = nav && nav.getBoundingClientRect(), ncs = nav && getComputedStyle(nav);
  var navH = nr && ncs.display !== 'none' && ncs.position === 'fixed' && nr.bottom >= innerHeight - 2 && nr.height < 160 ? Math.max(0, innerHeight - nr.top) : 0;
  var left = Math.max(0, r.left), width = Math.min(innerWidth - left, r.width || innerWidth);
  // The panel drops in just below the islands, so staff can still see and switch categories while it is open.
  // If there is too little room below (many islands on a short screen), it floats from the top instead.
  var isl = document.querySelector('#cc-staff .ap-islands'), top = 32;
  if (isl && innerWidth > 640) { var below = isl.getBoundingClientRect().bottom + 14; if (innerHeight - navH - below - 24 >= 300) top = Math.max(16, below); }
  [pop, scrim].forEach(function (el) { if (el) { el.style.setProperty('--ap-left', left + 'px'); el.style.setProperty('--ap-width', width + 'px'); el.style.setProperty('--ap-bottom', navH + 'px'); el.style.setProperty('--ap-top', top + 'px'); } });
  var body = pop.querySelector('.ap-pop-body');
  if (body && !body.dataset.apBound) { body.dataset.apBound = '1'; body.scrollTop = apScroll; body.addEventListener('scroll', function () { apScroll = body.scrollTop; }, { passive: true }); }
}
(function () {
  var t = null;
  function soon() { if (t) return; t = requestAnimationFrame(function () { t = null; apPlace(); }); }
  function watch() {
    var root = document.getElementById('cc-staff');
    if (!root) return setTimeout(watch, 200);
    new MutationObserver(soon).observe(root, { childList: true, subtree: true });
    addEventListener('resize', soon, { passive: true });
    // Rotating the iPad, or resizing a desktop window across the breakpoint, swaps pop-up and two panes.
    if (window.matchMedia) { var mq = matchMedia(AP_WIDE), flip = function () { var m = document.getElementById('ccs-main'); if (m && m.getAttribute('data-screen') === 'attn') Ma(); }; if (mq.addEventListener) mq.addEventListener('change', flip); else if (mq.addListener) mq.addListener(flip); }
    soon();
  }
  watch();
  // Escape closes the panel, but an open order on top of it closes first.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !document.getElementById('ap-pop')) return;
    var sheet = document.getElementById('ccs-sheet');
    if (y.sheet || (sheet && sheet.classList.contains('ccs-open'))) return;
    e.preventDefault(); apSet(null);
  }, true);
})();
