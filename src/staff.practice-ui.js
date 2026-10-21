/* Corner Café Service Hub: practice mode, what staff see (21 October 2026). See src/staff.practice.js.
 *  - Not practising: "Practice mode" on the sign-in screen ("New here? Practise on pretend cake orders first"), in the
 *    side menu and in More on phones.
 *  - Practising: a gold frame round the screen, a "Practice mode" card at the top of each page with Start over and Exit
 *    practice, a "Practice" tag on every window, and Exit practice in the side menu and More. Sign out ends practice.
 *    Kitchen slips are never printed, downloaded or sent; passwords are not changed.
 */
(function (global) {
  'use strict';
  var P = global.CCPractice, doc = global.document;
  if (!P || !doc || global.__ccPracticeUi) return;
  global.__ccPracticeUi = true;
  var ON = !!P.on;
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11.5V16c1.4 1.3 3.1 2 5 2s3.6-.7 5-2v-4.5"/><path d="M21 9v5"/></svg>';
  function toast(msg) { var a = global.__ccsOf; try { if (a && a.toast) return a.toast(msg); } catch (e) {} }

  // ---------- taps (before the app sees them) ----------
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b;
    function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
    if ((b = t.closest('[data-ccp-go]'))) { stop(); P.go(true); return; }
    if ((b = t.closest('[data-ccp-restart]'))) { stop(); P.go(true); return; }
    if ((b = t.closest('[data-ccp-exit]'))) { stop(); P.go(false); return; }
    if (!ON) return;
    if ((b = t.closest('#cc-staff [data-act="signout"]'))) { stop(); P.go(false); return; }
    if ((b = t.closest('[data-act="do-brief"], [data-act="brief-email"], [data-act="brief-pdf"], [data-act="brief-print"], [data-act="cal-brief"]'))) {
      stop(); toast('Practice mode: kitchen slips are not printed, downloaded or sent. In the real app this sends the slip to the kitchen.'); return;
    }
    if ((b = t.closest('[data-act="my-password"]'))) { stop(); toast('Practice mode: passwords are not changed here.'); return; }
  }, true);

  // ---------- what is on screen ----------
  function card() {
    var d = doc.createElement('div');
    d.className = 'ccp-card'; d.setAttribute('role', 'status');
    d.innerHTML = '<span class="ccp-ic">' + ICON + '</span><p><b>Practice mode</b><span>Pretend cake orders. Nothing here is real.</span></p>' +
      '<div class="ccp-acts"><button type="button" class="ccp-b" data-ccp-restart>Start over</button><button type="button" class="ccp-b ccp-x" data-ccp-exit>Exit practice</button></div>';
    return d;
  }
  var cardEl = null;
  function paint() {
    var root = doc.getElementById('cc-staff'); if (!root) return;
    // the side menu and More
    var side = root.querySelector('.ccs-side');
    if (side && !side.querySelector('.ccp-nav')) {
      var nb = doc.createElement('button');
      nb.type = 'button'; nb.className = 'ccs-nav-item ccp-nav' + (ON ? ' is-on' : '');
      nb.setAttribute(ON ? 'data-ccp-exit' : 'data-ccp-go', ''); nb.title = ON ? 'Exit practice' : 'Practice mode';
      nb.innerHTML = ICON + '<span>' + (ON ? 'Exit practice' : 'Practice mode') + '</span>';
      var who = side.querySelector('.ccs-who'); if (who) side.insertBefore(nb, who); else side.appendChild(nb);
    }
    var pw = doc.querySelector('#ccs-sheet [data-act="my-password"]');
    if (pw && !pw.parentNode.querySelector('.ccp-more')) {
      var mb = doc.createElement('button');
      mb.type = 'button'; mb.className = 'ccs-btn ccs-ghost ccs-wide ccp-more'; mb.setAttribute(ON ? 'data-ccp-exit' : 'data-ccp-go', '');
      mb.innerHTML = ICON + '<span>' + (ON ? 'Exit practice' : 'Practice mode') + '</span>';
      pw.parentNode.insertBefore(mb, pw);
    }
    if (!ON) {
      // the sign-in screen
      var lg = doc.getElementById('ccs-login');
      if (lg && !lg.querySelector('.ccp-in')) {
        var w = doc.createElement('div');
        w.className = 'ccp-in';
        w.innerHTML = '<p><b>New here?</b> Practise on pretend cake orders first. Nothing you do there is real.</p>' +
          '<button type="button" class="ccs-btn ccs-ghost ccs-wide ccp-go" data-ccp-go>' + ICON + '<span>Practice mode</span></button>';
        lg.appendChild(w);
      }
      return;
    }
    // practising: the card at the top of each page, a tag on each window
    var main = doc.getElementById('ccs-main');
    if (main) { if (!cardEl) cardEl = card(); if (main.firstChild !== cardEl) main.insertBefore(cardEl, main.firstChild); }
    var head = doc.querySelector('#ccs-sheet .ccs-sheet-head');
    if (head && !head.querySelector('.ccp-tag')) {
      var tg = doc.createElement('span'); tg.className = 'ccp-tag'; tg.textContent = 'Practice';
      var h = head.querySelector('.ccs-title'); if (h && h.nextSibling) head.insertBefore(tg, h.nextSibling); else head.appendChild(tg);
    }
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; Promise.resolve().then(function () { queued = false; try { paint(); } catch (e) { console.warn('[Practice] paint', e); } }); }
  function boot() {
    if (!doc.body) return setTimeout(boot, 50);
    if (ON && !doc.querySelector('.ccp-frame')) { var f = doc.createElement('div'); f.className = 'ccp-frame'; f.setAttribute('aria-hidden', 'true'); doc.body.appendChild(f); }
    new MutationObserver(soon).observe(doc.body, { childList: true, subtree: true });
    soon();
  }
  boot();
})(window);
