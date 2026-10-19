// Screen fit for phones and tablets (20 October 2026). Presentation only: no data, rules or actions change.
// Phones: the Calendar filters, totals and the Customers filter controls fold behind one line,
// so the orders and customers show without scrolling. Tap the line to open or close it.
(function () {
  'use strict';
  if (window.__ccScreenFit20261020) return;
  window.__ccScreenFit20261020 = true;
  var phone = window.matchMedia('(max-width:759px)');
  var open = { cal: false, cust: false };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chosen(sel) { var o = sel && sel.options[sel.selectedIndex]; return o ? o.textContent.trim() : ''; }
  function toggle(main, key, after, label, sum, filtered) {
    var b = main.querySelector('.cc-fit-bar[data-fit="' + key + '"]');
    var html = '<span class="cc-fit-k">' + esc(label) + (filtered ? '<i class="cc-fit-dot" aria-hidden="true"></i>' : '') + '</span>' +
      '<span class="cc-fit-s">' + esc(sum) + '</span><span class="cc-fit-go" aria-hidden="true">' + (open[key] ? 'Hide' : 'Show') + '</span>';
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'cc-fit-bar'; b.setAttribute('data-fit', key);
      after.after(b);
    } else if (b.previousElementSibling !== after) after.after(b);
    if (b.getAttribute('data-h') !== html) { b.innerHTML = html; b.setAttribute('data-h', html); }
    b.setAttribute('aria-expanded', String(open[key]));
    b.setAttribute('aria-label', label + (filtered ? ', filtered' : '') + '. ' + sum + '. ' + (open[key] ? 'Hide' : 'Show'));
    main.classList.toggle('cc-fit-' + key + '-open', open[key]);
  }
  function calendar(main) {
    var bar = main.querySelector('.ccs-calbar'); if (!bar) return;
    var st = main.querySelector('#cal-status'), ty = main.querySelector('#cal-type');
    var filtered = !!((st && st.value !== 'active') || (ty && ty.value !== 'all'));
    var parts = [];
    if (filtered) parts.push([st && st.value !== 'active' ? chosen(st) : '', ty && ty.value !== 'all' ? chosen(ty) : ''].filter(Boolean).join(' · '));
    var tot = main.querySelector('.ccs-daytot');
    if (tot) {
      parts.push(Array.prototype.map.call(tot.children, function (d) { var b = d.querySelector('b'), s = d.querySelector('span'); return b && s ? b.textContent.trim() + ' ' + s.textContent.trim() : ''; }).filter(Boolean).join(' · '));
    } else {
      var sum = main.querySelector('.ccv-summary');
      if (sum) parts.push(Array.prototype.map.call(sum.querySelectorAll('.ccv-stat'), function (d) { var n = d.querySelector('.ccv-stat-num'), l = d.querySelector('.ccv-stat-label'); return n && l ? n.textContent.trim() + ' ' + l.textContent.trim().toLowerCase() : ''; }).slice(0, 2).join(' · '));
    }
    toggle(main, 'cal', bar, 'Filters and totals', parts.filter(Boolean).join(' · ') || 'All active orders', filtered);
  }
  function customers(main) {
    var tools = main.querySelector('.ccs-ctool'); if (!tools) return;
    var anchor = main.querySelector('.ccs-rem') || main.querySelector('.crm-bar') || main.querySelector('.ccs-toolbar'); if (!anchor) return;
    var seg = main.querySelector('#ccs-seg'), act = main.querySelector('.cdir-segment.is-active,.cdir-segment[aria-pressed="true"]');
    var group = seg && seg.value !== 'all' ? chosen(seg) : (act && act.getAttribute('data-cdir-segment') !== 'all' ? act.textContent.trim() : '');
    var count = main.querySelector('.ccs-ccount'), sort = main.querySelector('.cdir-sort');
    var parts = [group || 'All customers'];
    if (count) parts.push(count.textContent.trim().replace(/\s+/g, ' '));
    if (sort && sort.value !== 'default') parts.push(chosen(sort));
    toggle(main, 'cust', anchor, 'Filters and sort', parts.join(' · '), !!group || !!(sort && sort.value !== 'default'));
  }
  function apply() {
    var main = document.querySelector('#cc-staff #ccs-main'); if (!main) return;
    var screen = main.getAttribute('data-screen') || '';
    if (!phone.matches) { main.querySelectorAll('.cc-fit-bar').forEach(function (b) { b.remove(); }); main.classList.remove('cc-fit-cal-open', 'cc-fit-cust-open'); return; }
    if (screen === 'calendar') calendar(main);
    else if (screen === 'customers-all' || screen === 'customers-search') customers(main);
  }
  function boot() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(boot, 250);
    var t = null;
    new MutationObserver(function () { if (t) return; t = requestAnimationFrame(function () { t = null; apply(); }); })
      .observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-screen', 'aria-pressed'] });
    root.addEventListener('change', function () { requestAnimationFrame(apply); });
    // Page-level, ahead of the app's own handlers, so a re-render never swallows the tap.
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cc-fit-bar'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var k = b.getAttribute('data-fit'); open[k] = !open[k]; apply();
    }, true);
    if (phone.addEventListener) phone.addEventListener('change', apply);
    apply();
  }
  boot();
})();
