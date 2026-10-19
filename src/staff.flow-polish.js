// Flow polish for phones and tablets (20 October 2026). Presentation only: no data, rules or actions change.
// 1. Calendar day view: runs of two or more empty hours fold into one line ("No orders · 2:00 PM to 5:00 PM").
//    Tapping it shows those hours again (each is still one tap to book).
// 2. Phone header shrinks once the page is scrolled, and returns at the top.
(function () {
  'use strict';
  if (window.__ccFlowPolish20261020) return;
  window.__ccFlowPolish20261020 = true;
  var open = {}; // runs a person has unfolded, by date and first hour
  function label(li) {
    var t = li.querySelector('.ccs-dslot-t');
    if (!t) return '';
    var n = t.firstChild;
    return (n && n.nodeType === 3 ? n.textContent : t.textContent).trim();
  }
  function plusHour(s) {
    var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s); if (!m) return s;
    var h = (+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0) + 1;
    return ((h % 12) || 12) + ':' + m[2] + ' ' + (h % 24 < 12 ? 'AM' : 'PM');
  }
  function fold() {
    document.querySelectorAll('#cc-staff ol.ccs-dslots').forEach(function (ol) {
      if (ol.querySelector(':scope > li.cc-fold')) return; // already folded this render
      var lis = Array.prototype.filter.call(ol.children, function (li) { return li.classList.contains('ccs-dslot'); });
      var dv = ol.querySelector('[data-v]'), day = dv ? dv.getAttribute('data-v') : '';
      var run = [];
      function flush(next) {
        if (run.length >= 2) {
          var from = label(run[0]), to = next ? label(next) : plusHour(label(run[run.length - 1]));
          var key = day + '|' + from;
          if (!open[key]) {
            var li = document.createElement('li'); li.className = 'cc-fold';
            var b = document.createElement('button'); b.type = 'button'; b.className = 'cc-fold-btn';
            b.setAttribute('data-cf', key);
            b.setAttribute('aria-label', 'No orders from ' + from + ' to ' + to + '. Show these times');
            b.innerHTML = '<span class="cc-fold-t">' + from + ' – ' + to + '</span><span class="cc-fold-n">No orders</span><span class="cc-fold-go" aria-hidden="true">Show</span>';
            run[0].before(li); li.appendChild(b);
            run.forEach(function (r) { r.classList.add('cc-folded'); });
          }
        }
        run = [];
      }
      lis.forEach(function (li) {
        if (li.classList.contains('has-orders')) flush(li); else run.push(li);
      });
      flush(null);
    });
  }
  // Header: compact once scrolled (phones only; CSS decides the size).
  var compact = false;
  function onScroll(e) {
    var t = e.target, y = (t === document || t === document.documentElement || t === document.body) ? (window.scrollY || 0) : (t.id === 'ccs-main' ? t.scrollTop : null);
    if (y === null) return;
    var app = document.querySelector('#cc-staff .ccs-app'); if (!app) return;
    if (!compact && y > 48) { compact = true; app.classList.add('cc-scrolled'); }
    else if (compact && y < 12) { compact = false; app.classList.remove('cc-scrolled'); }
  }
  function boot() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(boot, 250);
    var t = null;
    new MutationObserver(function () { if (t) return; t = requestAnimationFrame(function () { t = null; fold(); }); }).observe(root, { childList: true, subtree: true });
    // Listen on the whole page, ahead of the app's own handlers, so the tap is never swallowed by a re-render.
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.cc-fold-btn'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      open[b.getAttribute('data-cf')] = true;
      var li = b.parentNode, n = li.nextElementSibling;
      while (n && n.classList.contains('cc-folded')) { n.classList.remove('cc-folded'); n = n.nextElementSibling; }
      var first = li.nextElementSibling; li.remove();
      var add = first && first.querySelector('.ccs-dadd'); if (add && add.focus) add.focus({ preventScroll: true });
    }, true);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    fold();
  }
  boot();
})();
