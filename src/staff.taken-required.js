/* Corner Cafe: require staff to explicitly select when the customer placed the order.
 * Live compatibility layer for the pinned staff app; first-party validation also
 * lives in src/staff.js for the next staff bundle rebuild.
 * Only New Order controls are observed. Operational kitchen slips are untouched.
 */
(function () {
  'use strict';
  if (window.__ccTakenRequired20261019) return;
  window.__ccTakenRequired20261019 = true;

  var choice = null, dated = '', dateTouched = false, hadForm = false, error = '';
  var root = document.getElementById('cc-staff');
  if (!root) return;

  function form() { return root.querySelector('#ccs-slipform .sl-stepper'); }
  function reset() { choice = null; dated = ''; dateTouched = false; error = ''; }
  function fijiToday() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Pacific/Fiji', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function shiftDay(day, by) {
    var t = new Date(day + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + by);
    return t.toISOString().slice(0, 10);
  }
  function realISODate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var z = Date.parse(s + 'T12:00:00Z');
    return isFinite(z) && new Date(z).toISOString().slice(0, 10) === s;
  }
  function isValid() {
    if (choice === 'now' || choice === 'today' || choice === 'yesterday') return true;
    if (choice !== 'other' || !dateTouched || !realISODate(dated)) return false;
    var today = fijiToday();
    return dated < today;
  }
  function reason() {
    if (!choice) return 'Required: choose when the customer placed the order.';
    if (choice !== 'other' || !dateTouched || !dated) return 'Required: select the date the customer placed the order.';
    return 'Choose a valid past date. Select Today for an order placed today.';
  }
  function render() {
    var wrap = form();
    if (!wrap) {
      if (hadForm) { hadForm = false; reset(); }
      return;
    }
    hadForm = true;
    var group = wrap.querySelector('.tk-chips');
    if (!group) return; // The question is only visible on the Customer step.
    var label = wrap.querySelector('.tk-k');
    if (label && !label.querySelector('.cc-taken-required-label')) {
      var em = document.createElement('em');
      em.className = 'sl-req cc-taken-required-label';
      em.textContent = 'Required';
      label.appendChild(document.createTextNode(' '));
      label.appendChild(em);
    }
    var choices = group.querySelectorAll('[data-act="n-taken"]');
    choices.forEach(function (b) { b.setAttribute('aria-pressed', String(choice === b.getAttribute('data-v'))); });
    group.setAttribute('aria-label', 'When the customer placed the order — required');
    var input = wrap.querySelector('#n-takedate');
    if (input && choice === 'other') {
      var today = fijiToday();
      input.setAttribute('required', '');
      input.setAttribute('aria-required', 'true');
      input.removeAttribute('min');
      input.setAttribute('max', shiftDay(today, -1));
      // The old app automatically fills "two days ago". Suppress that
      // misleading default until the operator actually chooses a date.
      if (!dateTouched && input.value) input.value = '';
    }
    if (error) showError(wrap, error);
  }
  function showError(wrap, msg) {
    var existing = wrap.querySelector('#cc-taken-required-error');
    var anchor = wrap.querySelector('.tk-sub') || wrap.querySelector('.tk-chips') || wrap.querySelector('.sl-stepbar');
    if (!anchor) return;
    if (!existing) {
      existing = document.createElement('p');
      existing.id = 'cc-taken-required-error';
      existing.className = 'ccs-err';
      existing.setAttribute('role', 'alert');
      anchor.insertAdjacentElement('afterend', existing);
    }
    if (existing.textContent !== msg) existing.textContent = msg;
  }
  function clearError() {
    error = '';
    var old = root.querySelector('#cc-taken-required-error');
    if (old) old.remove();
  }
  function deny(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    error = reason();
    var wrap = form();
    if (!wrap) return;
    // A restored draft might reach Review without a deliberate choice.
    // Return to Customer with the app's own Change handler when available.
    if (!wrap.querySelector('#sl-st-1')) {
      var change = wrap.querySelector('.sl-live [data-act="sl-goto"][data-v="1"]');
      if (change) change.click();
    }
    render();
    wrap = form();
    if (wrap) {
      showError(wrap, error);
      var group = wrap.querySelector('.tk-chips');
      if (group) {
        group.scrollIntoView({ block: 'center', behavior: 'auto' });
        var b = group.querySelector('button');
        if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } }
      }
    }
  }

  // Capture runs before the current staff app's delegated click handlers.
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'new-clear' || act === 'tb-fresh') { reset(); return; }
    var wrap = form();
    if (!wrap || !wrap.contains(b)) return;
    if (act === 'n-taken') {
      choice = b.getAttribute('data-v');
      dated = '';
      dateTouched = false;
      clearError();
      return; // Native app keeps its date-in-draft handler.
    }
    if ((act === 'sl-next' || act === 'sl-skip') && wrap.querySelector('#sl-st-1') && !isValid()) {
      deny(e);
      return;
    }
    if (act === 'n-submit' && !isValid()) deny(e);
  }, true);

  function recordDate(e) {
    if (!form() || e.target.id !== 'n-takedate' || choice !== 'other') return;
    dated = e.target.value;
    dateTouched = Boolean(dated);
    if (isValid()) clearError();
  }
  root.addEventListener('input', recordDate, true);
  root.addEventListener('change', recordDate, true);

  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    Promise.resolve().then(function () {
      queued = false;
      render();
    });
  }).observe(root, { childList: true, subtree: true });
  render();
})();
