// Easier staff forms (20 October 2026). Layout and order only: the same fields, rules, checks and saving.
// - New order: required questions come first on each step (shown in a new order; nothing is moved in the page
//   structure, so typing and focus are never disturbed). Cake requirements (used on about 5% of orders) sit behind
//   one tap until one is chosen. On Finish, payment comes first, then the summary. "Start over" moves to the top
//   of the step, away from Next.
// - Add customer: name, mobile, best way to reach them and marketing permission first; the rest behind
//   "More details" until opened or filled.
(function () {
  'use strict';
  if (window.__ccFormEase20261020) return;
  window.__ccFormEase20261020 = true;
  var rqOpen = false, moreOpen = false, pending = false;
  var curStep = '', stepAt = 0, lastDown = null;

  function has(el, sel) { return el.matches(sel) || !!el.querySelector(sel); }
  // A question label directly before a marked block belongs with that block.
  function starts(el, sel) {
    if (has(el, sel)) return true;
    var n = el.nextElementSibling;
    return !!n && el.matches('.sl-k, .tk-k, .ccs-label') && has(n, sel);
  }
  // Each child takes the order of the latest section start before it (sections keep their own sub-blocks together).
  function arrange(body, rules) {
    var cur = 0;
    Array.prototype.forEach.call(body.children, function (el) {
      for (var i = 0; i < rules.length; i++) {
        if (rules[i][0](el)) { cur = rules[i][1]; break; }
      }
      var want = String(cur);
      if (el.style.order !== want) el.style.order = want;
    });
  }

  function customerStep() {
    var body = document.querySelector('#sl-st-1 .sl-stepbody'); if (!body) return;
    arrange(body, [
      [function (e) { return e.matches('label[for="n-phone"]'); }, 1],
      [function (e) { return e.matches('label[for="n-email"]'); }, 3],
      [function (e) { return starts(e, '[data-act="sl-opt"], .cc-entry[data-kind="consent"]'); }, 2],
      [function (e) { return starts(e, '[data-act="n-source"], .cc-entry[data-kind="source"]'); }, 2],
      [function (e) { return e.matches('.tk-k') || starts(e, '[data-act="n-taken"], .cc-entry[data-kind="date"]'); }, 2],
      [function (e) { return has(e, '.sl-heardopen, [data-act="sl-heard"]'); }, 4]
    ]);
  }

  function detailsStep() {
    var body = document.querySelector('#sl-st-4 .sl-stepbody'); if (!body) return;
    arrange(body, [
      [function (e) { return e.matches('.rq-k2') || starts(e, '[data-act="n-diet"]'); }, 1],
      [function (e) { return starts(e, '[data-act="n-occ"]'); }, 2],
      [function (e) { return e.matches('label[for="n-msg"]'); }, 3],
      [function (e) { return e.matches('label[for="n-candles"]'); }, 4],
      [function (e) { return e.matches('.rq-k, .cc-rq-add') || starts(e, '.rq-chips'); }, 5],
      [function (e) { return e.matches('label[for="n-notes"]'); }, 6]
    ]);
    var chips = body.querySelector('.rq-chips');
    if (!chips) return;
    var chosen = !!chips.querySelector('[aria-pressed="true"]');
    var fold = !chosen && !rqOpen;
    if (body.classList.contains('cc-rq-folded') !== fold) body.classList.toggle('cc-rq-folded', fold);
    if (!body.querySelector('.cc-rq-add')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ccs-link cc-rq-add'; b.setAttribute('data-cc-ease', 'rq');
      b.textContent = '+ Add a cake requirement (eggless, gluten-free, dairy-free, vegan)';
      b.style.order = '5';
      var k = body.querySelector('.rq-k') || chips;
      k.before(b);
    }
  }

  function finishStep() {
    var body = document.querySelector('#sl-st-7 .sl-stepbody'); if (!body) return;
    arrange(body, [
      [function (e) { return e.matches('.cc-f-review'); }, 4],
      [function (e) { return e.matches('.ccs-total'); }, 1],
      [function (e) { return has(e, '[data-act="n-plan"]'); }, 2],
      [function (e) { return e.matches('.cc-f-agreement'); }, 3],
      [function (e) { return e.matches('.cc-f-outcome'); }, 5]
    ]);
  }

  function restartButton() {
    document.querySelectorAll('.sl-stepbar .sl-restart').forEach(function (b) {
      var main = b.closest('.sl-stepmain'), head = main && main.querySelector('.sl-stephead');
      if (!head) return;
      b.classList.add('cc-restart-top');
      head.appendChild(b);
    });
  }

  function addCustomer() {
    var save = document.querySelector('#ccs-sheet [data-act="cn-save"]');
    if (!save) { moreOpen = false; return; }
    var panel = save.closest('.ccs-panel'); if (!panel) return;
    var ids = ['ce-alt', 'ce-email', 'ce-company', 'ce-addr', 'ce-bday', 'ce-bmonth', 'ce-prefs', 'ce-notes'];
    var filled = false;
    ids.forEach(function (id) {
      var e = document.getElementById(id); if (!e) return;
      if ((e.value || '').trim()) filled = true;
      var f = e.closest('.ccs-field'); if (f && !f.classList.contains('cc-more')) f.classList.add('cc-more');
    });
    var corp = document.getElementById('ce-corp'), lab = corp && corp.closest('label');
    if (corp && corp.checked) filled = true;
    if (lab && !lab.classList.contains('cc-more')) lab.classList.add('cc-more', 'cc-corp');
    panel.querySelectorAll('.ccs-row').forEach(function (r) {
      var fs = r.querySelectorAll('.ccs-field');
      if (fs.length && Array.prototype.every.call(fs, function (f) { return f.classList.contains('cc-more'); }) && !r.classList.contains('cc-more')) r.classList.add('cc-more');
    });
    var bm = document.getElementById('ce-bmonth'), row = bm && bm.closest('.ccs-row'), hint = row && row.nextElementSibling;
    if (hint && hint.matches('.ccs-hint') && !hint.classList.contains('cc-more')) hint.classList.add('cc-more');
    var fold = !filled && !moreOpen;
    if (panel.classList.contains('cc-more-folded') !== fold) panel.classList.toggle('cc-more-folded', fold);
    if (!panel.querySelector('.cc-more-btn')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ccs-link cc-more-btn'; b.setAttribute('data-cc-ease', 'more');
      b.textContent = '+ More details (other number, email, company, birthday, notes)';
      var acts = panel.querySelector('.ccs-actions-row');
      if (acts) acts.before(b); else panel.appendChild(b);
    }
  }

  // When "Make it yours" opens, the app puts the cursor in the inscription box. With the required taps now first,
  // that would scroll the step past its title on smaller screens, so the box is left for staff to tap themselves.
  function trackStep() {
    var m = document.querySelector('#ccs-slipform .sl-stepmain'), id = m ? m.id : '';
    if (id !== curStep) { curStep = id; stepAt = Date.now(); }
  }
  document.addEventListener('pointerdown', function (e) { lastDown = e.target; }, true);
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (!t || t.id !== 'n-msg') return;
    trackStep(); // the app focuses straight after drawing the step, before this add-on's own update runs
    if (curStep !== 'sl-st-4' || Date.now() - stepAt > 1500) return;
    if (lastDown && lastDown.closest && lastDown.closest('#n-msg, label[for="n-msg"]')) return;
    t.blur();
  }, true);

  function apply() {
    pending = false;
    trackStep();
    if (!document.getElementById('ccs-slipform')) rqOpen = false;
    customerStep(); detailsStep(); finishStep(); restartButton(); addCustomer();
  }
  function soon() { if (pending) return; pending = true; queueMicrotask(apply); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cc-ease]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var k = b.getAttribute('data-cc-ease');
    if (k === 'rq') {
      rqOpen = true; apply();
      var c = document.querySelector('#sl-st-4 .rq-chips .ccs-chip'); if (c) c.focus({ preventScroll: true });
    } else if (k === 'more') {
      moreOpen = true; apply();
      var f = document.getElementById('ce-alt') || document.getElementById('ce-email'); if (f) f.focus({ preventScroll: true });
    }
  }, true);

  function boot() {
    if (!document.body) return setTimeout(boot, 50);
    // Microtask timing: the order is set before the browser paints, so nothing visibly jumps.
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
    apply();
  }
  boot();
})();
