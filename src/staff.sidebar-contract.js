/* Corner Café Service Hub: Jack's Restaurants shared sidebar contract, version 1 (21 October 2026). Visual only.
   - Each side menu item ([data-tab]) gets a 2px outline icon (Lucide shapes) placed in front of its own icon. The app's
     own icon stays in the markup; CSS shows the outline icon from 760px up and the original one on phones, so the phone
     bottom bar is unchanged. Labels, aria and title attributes are not touched.
   - The fold button gets panel-left-close / panel-left-open and the tooltip "Collapse sidebar" / "Expand sidebar".
   - Re-applied after every re-render of the menu (MutationObserver). Idempotent: nothing is added twice.
   - Version 2 (universal taxonomy, section 7): on screens 760px and wider the existing item buttons are MOVED (never
     recreated) into six groups, in this order: Overview, Operations, Planning, Customers, Insights, System. Each group is
     <div role="group" aria-labelledby> with a sentence-case heading (uppercase through CSS). Groups with no visible item
     (after permissions) are hidden, heading included. The app's own headings and the page footer's added headings are
     hidden, not removed, so the footer script stays settled. More stays the last direct child (phones only), and on
     phones the original flat order is put back, so the bottom bar is unchanged.
   Nothing here saves, changes or decides anything about orders, routes or permissions. */
(function (global) {
  'use strict';
  if (global.CCSidebarContract) return;
  var doc = document;
  var A = '<svg class="csc-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">', Z = '</svg>';
  var ICONS = {
    today: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    attn: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    orders: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    tablet: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    kitchen: '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
    handover: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    customers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    dash: '<path d="M12 16v5"/><path d="M16 14v7"/><path d="M20 10v11"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.708 0L2 15"/><path d="M4 18v3"/><path d="M8 14v7"/>',
    register: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'
  };
  var PANEL_CLOSE = A + '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>' + Z;
  var PANEL_OPEN = A + '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>' + Z;

  var GROUPS = [
    ['overview', 'Overview', ['today', 'attn']],
    ['operations', 'Operations', ['orders', 'tablet', 'kitchen', 'handover']],
    ['planning', 'Planning', ['calendar']],
    ['customers', 'Customers', ['customers']],
    ['insights', 'Insights', ['dash', 'register']],
    ['system', 'System', ['settings']]
  ];
  var WIDE = '(min-width: 760px)';
  function mq(q) { try { return !!(global.matchMedia && global.matchMedia(q).matches); } catch (e) { return false; } }
  function kids(el, sel) { var out = []; for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (c.matches(sel)) out.push(c); return out; }
  function visible(b) { return getComputedStyle(b).display !== 'none'; }
  // Put the buttons into the six groups. Only DOM moves of existing nodes; each pass changes nothing once settled.
  function group(nav) {
    var i, g, b, wrap, head, want, have, tabs = {};
    var all = nav.querySelectorAll('.ccs-nav-item[data-tab]');
    for (i = 0; i < all.length; i++) { b = all[i]; if (!b.hasAttribute('data-csc-i')) b.setAttribute('data-csc-i', String(i)); tabs[b.getAttribute('data-tab')] = b; }
    var anchor = kids(nav, '.ccs-nav-phone, .cc-t-new')[0] || null, prev = null;
    for (i = 0; i < GROUPS.length; i++) {
      g = GROUPS[i];
      wrap = kids(nav, '.csc-group[data-csc-g="' + g[0] + '"]')[0];
      if (!wrap) {
        wrap = doc.createElement('div');
        wrap.className = 'csc-group'; wrap.setAttribute('data-csc-g', g[0]); wrap.setAttribute('role', 'group');
        wrap.setAttribute('aria-labelledby', 'csc-h-' + g[0]);
        wrap.innerHTML = '<p class="ccs-navh csc-h" id="csc-h-' + g[0] + '">' + g[1] + '</p>';
      }
      // groups in order, before More / the phone New order
      var at = prev ? prev.nextElementSibling : nav.firstElementChild;
      if (at !== wrap) nav.insertBefore(wrap, prev ? prev.nextElementSibling : nav.firstElementChild);
      prev = wrap;
      head = kids(wrap, '.csc-h')[0];
      if (head && head !== wrap.firstElementChild) wrap.insertBefore(head, wrap.firstElementChild);
      want = g[2].map(function (k) { return tabs[k]; }).filter(Boolean);
      have = kids(wrap, '.ccs-nav-item[data-tab]');
      var same = want.length === have.length && want.every(function (x, j) { return x === have[j]; });
      if (!same) for (var j = 0; j < want.length; j++) wrap.appendChild(want[j]);
    }
    if (anchor && anchor.parentNode === nav && prev && prev.nextElementSibling !== anchor && kids(nav, '.csc-group').indexOf(anchor) < 0) nav.insertBefore(anchor, prev.nextElementSibling);
    if (!nav.classList.contains('csc-grouped')) nav.classList.add('csc-grouped');
    // hide a group with no visible item, heading included
    var ws = kids(nav, '.csc-group');
    for (i = 0; i < ws.length; i++) {
      var on = kids(ws[i], '.ccs-nav-item[data-tab]').some(visible);
      if (ws[i].hidden === on) ws[i].hidden = !on;
    }
  }
  // Phones: back to the app's own flat order (wrappers removed), so the bottom bar is exactly as before
  function ungroup(nav) {
    var ws = kids(nav, '.csc-group'); if (!ws.length) { if (nav.classList.contains('csc-grouped')) nav.classList.remove('csc-grouped'); return; }
    var items = [].slice.call(nav.querySelectorAll('.csc-group .ccs-nav-item[data-tab]'));
    var flat = kids(nav, '.ccs-nav-item[data-tab]');
    items = items.concat(flat).sort(function (a, b) { return (+a.getAttribute('data-csc-i') || 0) - (+b.getAttribute('data-csc-i') || 0); });
    var anchor = kids(nav, '.ccs-nav-phone, .cc-t-new')[0] || null;
    items.forEach(function (b) { if (!b.classList.contains('ccs-nav-phone')) nav.insertBefore(b, anchor); });
    ws.forEach(function (w) { [].slice.call(w.children).forEach(function (c) { if (!c.classList.contains('csc-h')) nav.insertBefore(c, anchor); }); nav.removeChild(w); });
    nav.classList.remove('csc-grouped');
  }
  function label(nav) {
    var t = nav.querySelector('.ccs-nav-item[data-tab="tablet"] > span:not(.ccs-count)');
    if (t && t.textContent !== 'Service view') t.textContent = 'Service view';
  }
  function icons(side) {
    var items = side.querySelectorAll('.ccs-nav-item[data-tab]');
    for (var i = 0; i < items.length; i++) {
      var b = items[i], k = b.getAttribute('data-tab');
      if (!ICONS[k]) continue;
      var first = b.firstElementChild;
      if (first && first.classList && first.classList.contains('csc-ic')) {
        if (first.getAttribute('data-k') === k) continue;
        b.removeChild(first);
      }
      var old = b.querySelector(':scope > svg:not(.csc-ic)');
      if (old) old.classList.add('csc-orig');
      b.insertAdjacentHTML('afterbegin', A.replace('class="csc-ic"', 'class="csc-ic" data-k="' + k + '"') + ICONS[k] + Z);
    }
  }
  function fold(side) {
    var btn = side.querySelector('.ccs-collapse'); if (!btn) return;
    var app = side.closest('.ccs-app'), mini = !!(app && app.classList.contains('is-mini'));
    var want = mini ? 'open' : 'close';
    if (btn.getAttribute('data-csc') !== want) {
      btn.innerHTML = mini ? PANEL_OPEN : PANEL_CLOSE;
      btn.setAttribute('data-csc', want);
    }
    var t = mini ? 'Expand sidebar' : 'Collapse sidebar';
    if (btn.title !== t) btn.title = t;
    if (btn.getAttribute('aria-label') !== t) btn.setAttribute('aria-label', t);
    var so = side.querySelector('.ccs-signout');
    if (so && !so.title) so.title = 'Sign out';
  }
  function tick() {
    queued = false;
    var side = doc.querySelector('#cc-staff .ccs-side'); if (!side) return;
    icons(side); fold(side);
    var nav = side.querySelector('.ccs-nav'), app = side.closest('.ccs-app');
    if (nav) {
      if (mq(WIDE) && app && !app.classList.contains('is-single')) { label(nav); group(nav); } else ungroup(nav);
    }
  }
  // Run straight from the observer (before paint), guarded: a pass that changes nothing ends the chain; a runaway is capped.
  var running = false, passes = 0, windowStart = 0;
  function now() { return Date.now ? Date.now() : +new Date(); }
  function observed() {
    if (running) return;
    var t = now(); if (t - windowStart > 1000) { windowStart = t; passes = 0; }
    if (++passes > 40) { schedule(); return; }
    running = true; try { tick(); } finally { running = false; }
  }
  var queued = false;
  function schedule() { if (!queued) { queued = true; (global.requestAnimationFrame || setTimeout)(tick); } }
  function start() {
    tick();
    var root = doc.getElementById('cc-staff');
    if (root && global.MutationObserver) new MutationObserver(observed).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    global.addEventListener('resize', schedule);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  global.CCSidebarContract = { version: '2026-10-21-sidebar-contract-v2', apply: tick };
})(window);
