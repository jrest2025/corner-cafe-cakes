/* Presentation only: seasonal orders share the cake-order card hierarchy.
 * Existing action buttons, handlers, permissions and order records are preserved. */
(function () {
  'use strict';
  if (window.__ccSeasonalConsistency) return;
  window.__ccSeasonalConsistency = true;
  function el(tag, cls, text) { var n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; }
  function money(v) { return '$' + Number(v || 0).toLocaleString('en-FJ', {minimumFractionDigits: 0, maximumFractionDigits: 2}); }
  function itemList(items) {
    var ul = el('ul', 'cc-sc-items');
    items.forEach(function (i) { var li = el('li', ''); li.append(el('span', 'cc-sc-qty', i.quantity + ' ×'), el('span', '', i.name)); ul.append(li); });
    return ul;
  }
  function update() {
    var board = document.getElementById('cc-to');
    if (!board) return;
    var api = window.__ccTreatOrders, data = api && api.data && api.data();
    if (!data || !Array.isArray(data.orders)) return;
    var byId = {}; data.orders.forEach(function (o) { byId[o.id] = o; });
    board.querySelectorAll('.cc-to-o').forEach(function (card) {
      var icon = card.querySelector('.cc-festive-tag span[aria-hidden]');
      if (icon && !icon.querySelector('svg')) icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></svg>';
      if (card.dataset.ccConsistent) return;
      var o = byId[card.dataset.id], top = card.querySelector('.cc-to-ot'), what = card.querySelector('.cc-to-what');
      if (!o || !top || !what) return;
      card.dataset.ccConsistent = 'true';
      var time = top.querySelector('.cc-to-time');
      if (time) { var when = el('div', 'cc-sc-when'); when.append(el('span', 'cc-sc-label', 'Pickup'), time); card.prepend(when); }
      var name = top.querySelector('.cc-to-name');
      if (name) { var copy = el('div', 'cc-sc-customer'); name.before(copy); copy.append(name, el('span', 'cc-sc-reference', [o.reference, o.source === 'online' ? 'Website' : 'Counter'].filter(Boolean).join(' · '))); }
      var price = el('div', 'cc-sc-price', money(o.total)); price.append(el('span', '', 'Order total')); card.append(price);
      var items = o.items || [], total = items.reduce(function (n, i) { return n + Number(i.quantity || 0); }, 0);
      var details = el('details', 'cc-sc-detail'), summary = el('summary', '');
      summary.append(el('span', '', total + (total === 1 ? ' item' : ' items')), el('span', 'cc-sc-view', 'View items'));
      details.append(summary, itemList(items)); what.replaceWith(details);
      var more = card.querySelector('[data-cc-to="more"]');
      if (more) { more.setAttribute('aria-label', (more.getAttribute('aria-expanded') === 'true' ? 'Hide' : 'View') + ' order details for ' + o.name); }
    });
    board.querySelectorAll('.cc-to-dh').forEach(function (head) {
      if (head.dataset.ccConsistent) return;
      head.dataset.ccConsistent = 'true';
      var section = head.closest('.cc-to-day'), cards = section.querySelectorAll('.cc-to-o'), count = el('span', 'cc-sc-count', cards.length + (cards.length === 1 ? ' order' : ' orders'));
      head.querySelector('h3').append(count);
      var p = head.querySelector(':scope > p');
      if (p) { var details = el('details', 'cc-sc-totals'); details.append(el('summary', '', 'Daily item totals')); p.before(details); details.append(p); }
    });
  }
  function boot() {
    var root = document.getElementById('cc-staff'); if (!root) return;
    var queued = false;
    new MutationObserver(function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; update(); }); }).observe(root, {childList:true, subtree:true});
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
