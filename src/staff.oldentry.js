/* Corner Café: "Old orders" as its own way in (Roneel, 27 Oct 2026 11:26 PM).
 * A sidebar item (and a button in More on phones) that opens the existing Old order form straight away, without the
 * New order / Old order choice first. Same form, same checks, same server function (staff_enter_old_order); nothing
 * new is saved anywhere. After saving, the form's own "Enter the next old order" keeps the person entering slips.
 * Shown only where the app shows New order (logins that can take orders). If anything here fails, nothing changes. */
(function (win) {
  'use strict';
  if (win.__ccOldEntry20261027) return;
  win.__ccOldEntry20261027 = true;
  var doc = win.document;
  var IC = '<svg class="csc-ic" data-k="oldorders" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3h14v18l-2.3-1.6L14.3 21 12 19.4 9.7 21l-2.4-1.6L5 21z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/></svg>';
  function warn(w, e) { try { console.warn('[Old orders entry] ' + w, e); } catch (_) {} }
  function canTake() { return !!doc.querySelector('#cc-staff [data-tab="new"]') && !!win.CCOldOrders; }

  function openOld() {
    var nb = doc.querySelector('#cc-staff .ccs-side [data-tab="new"]') || doc.querySelector('#cc-staff [data-tab="new"]');
    if (!nb) return;
    nb.click();
    var n = 0;
    (function wait() {
      var b = doc.querySelector('#ccs-sheet [data-oo-mode="old"]');
      if (b) { if (b.getAttribute('aria-pressed') !== 'true') { try { win.CCOldOrders._setMode(true); } catch (e) { b.click(); } } return; }
      if (++n < 40) setTimeout(wait, 50);
    })();
  }

  function place() {
    if (!canTake()) return;
    var side = doc.querySelector('#cc-staff .ccs-side [data-tab="orders"]');
    if (side && !doc.querySelector('#cc-staff .ccs-side [data-ccoe]')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccs-nav-item'; b.setAttribute('data-ccoe', 'side');
      b.title = 'Old orders'; b.setAttribute('aria-label', 'Old orders - enter cakes from paper slips');
      b.innerHTML = IC + '<span>Old orders</span>';
      side.after(b);
    }
    var links = doc.querySelector('#cc-staff .ccs-more-links');
    if (links && !links.querySelector('[data-ccoe]')) {
      var m = doc.createElement('button'); m.type = 'button'; m.className = 'ccs-btn ccs-ghost ccs-wide'; m.setAttribute('data-ccoe', 'more');
      m.textContent = 'Old orders'; links.insertBefore(m, links.firstChild);
    }
  }

  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#cc-staff [data-ccoe]') : null; if (!t) return;
    e.preventDefault();
    try { openOld(); } catch (err) { warn('not opened', err); }
  });
  var q = false;
  function schedule() { if (q) return; q = true; setTimeout(function () { q = false; try { place(); } catch (e) { warn('not placed', e); } }, 40); }
  // (28 Oct 2026) the side-menu button goes in straight from the page-change callback, before the browser paints:
  // added 40ms later it pushed the lower menu down by one row on every screen switch
  function now() { try { var o = doc.querySelector('#cc-staff .ccs-side [data-tab="orders"]'); if (o && o.closest('.csc-group') && !doc.querySelector('#cc-staff .ccs-side [data-ccoe]'))  place(); /* only once the menu is grouped, so it lands under Orders */ } catch (e) { warn('not placed', e); } schedule(); }
  function start() { new MutationObserver(now).observe(doc.body, { childList: true, subtree: true }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})(window);
