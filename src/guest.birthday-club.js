/* Corner Café Birthday Club on the website cake order form (20 October 2026).
 * One optional tick box at the end of "Your details", unticked. The day and month only appear once it is ticked
 * (customer forms ask as little as possible; we never ask for the year). The box's words are the consent wording
 * birthday-club-online-v1. Once the order has been sent, birthday_club_join_online adds them to the club (it only accepts
 * the id of an online order sent in the last hour, which only this browser knows). The order itself never depends on it:
 * if joining fails, the thank-you page says so gently.
 */
(function (global) {
  'use strict';
  if (global.CCGuestBirthday) return;
  var doc = global.document;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var TEXT = 'Join our Birthday Club. We’ll call or WhatsApp you in the week before your birthday with a free cupcake offer.';
  var S = { on: false, day: '', month: '', err: '' };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function valid(d, m) { d = +d; m = +m; return m >= 1 && m <= 12 && d >= 1 && d <= (m === 2 ? 29 : [4, 6, 9, 11].indexOf(m) > -1 ? 30 : 31); }
  function inner() {
    var h = '<label class="cco-check cco-bc-check"><input type="checkbox" data-bcg="on"' + (S.on ? ' checked' : '') + '> <span>' + esc(TEXT) + '</span></label>';
    if (!S.on) return h;
    var days = '<option value="">Day</option>', months = '<option value="">Month</option>';
    for (var i = 1; i <= 31; i++) days += '<option value="' + i + '"' + (+S.day === i ? ' selected' : '') + '>' + i + '</option>';
    MONTHS.forEach(function (m, i) { months += '<option value="' + (i + 1) + '"' + (+S.month === i + 1 ? ' selected' : '') + '>' + m + '</option>'; });
    var bad = S.err ? ' aria-invalid="true" aria-describedby="cco-err-bc"' : '';
    return h + '<div class="cco-field cco-bc-when"><span class="cco-lbl" id="cco-bc-l"><span>Your birthday</span></span>' +
      '<div class="cco-bc-pick" role="group" aria-labelledby="cco-bc-l"><select class="cco-input' + (S.err && !S.day ? ' cco-bad' : '') + '" id="cco-bc-day" data-bcg="day" aria-label="Day"' + bad + '>' + days + '</select>' +
      '<select class="cco-input' + (S.err && !S.month ? ' cco-bad' : '') + '" id="cco-bc-month" data-bcg="month" aria-label="Month"' + bad + '>' + months + '</select></div>' +
      (S.err ? '<span class="cco-err" id="cco-err-bc" role="alert">' + esc(S.err) + '</span>' : '<span class="cco-hint">The day and month are all we need.</span>') + '</div>';
  }
  function box() { try { return '<div class="cco-bc" data-bcg-box>' + inner() + '</div>'; } catch (e) { return ''; } }
  function paint(focusId) {
    var b = doc.querySelector('#cc-cake-order [data-bcg-box]'); if (!b) return;
    b.innerHTML = inner();
    var el = focusId && doc.getElementById(focusId);
    if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  }
  function rpc(name, args) {
    var a = global.__ccgBc;
    if (!a || typeof a.rpc !== 'function') return Promise.reject(new Error('not ready'));
    return new Promise(function (ok, no) { try { a.rpc(name, args).then(ok, no); } catch (e) { no(e); } });
  }
  function note(html, good) {
    var tries = 0;
    (function put() {
      var done = doc.querySelector('#cc-cake-order .cco-done'), after = done && (done.querySelector('.cco-status') || done.querySelector('.cco-done-head'));
      if (!after) { if (++tries < 20) setTimeout(put, 100); return; }
      var old = done.querySelector('.cco-bc-note'); if (old) old.remove();
      var p = doc.createElement('p'); p.className = 'cco-bc-note' + (good ? ' is-in' : ''); p.setAttribute('role', 'status'); p.innerHTML = html;
      after.parentNode.insertBefore(p, after.nextSibling);
    })();
  }
  // After the order is sent (the order is safe whatever happens here)
  function after(res) {
    try {
      if (!S.on || !valid(S.day, S.month) || !res || !res.ok || !res.order_id) return;
      var day = +S.day, month = +S.month;
      S = { on: false, day: '', month: '', err: '' };
      rpc('birthday_club_join_online', { p_order: res.order_id, p_day: day, p_month: month }).then(function (r) {
        var d = r && !r.error ? r.data : null;
        if (d && d.ok && d.already) note('<b>You’re already in our Birthday Club.</b> We’ll be in touch in the week before your birthday.', true);
        else if (d && d.ok) note('<b>Welcome to our Birthday Club.</b> We’ll call or WhatsApp you in the week before your birthday, ' + esc(day + ' ' + MONTHS[month - 1]) + '.', true);
        else note('We couldn’t add you to the Birthday Club just now. Mention it when we contact you and we’ll add you.', false);
      }, function () { note('We couldn’t add you to the Birthday Club just now. Mention it when we contact you and we’ll add you.', false); });
    } catch (e) { console.warn('[Birthday Club] website', e); }
  }

  if (doc && !global.__ccGuestBirthdayEvents) {
    global.__ccGuestBirthdayEvents = true;
    doc.addEventListener('change', function (e) {
      var t = e.target, k = t && t.getAttribute && t.getAttribute('data-bcg'); if (!k) return;
      if (k === 'on') { S.on = !!t.checked; S.err = ''; paint(); var c = doc.querySelector('#cc-cake-order [data-bcg="on"]'); if (c) { try { c.focus({ preventScroll: true }); } catch (x) { c.focus(); } } return; }
      if (k === 'day') S.day = t.value;
      if (k === 'month') S.month = t.value;
      if (S.err && valid(S.day, S.month)) { S.err = ''; paint(t.id); }
    });
    // Continue to review waits for the birthday once the box is ticked
    doc.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('#cc-cake-order [data-act="toReview"]') : null;
      if (!b || !S.on || valid(S.day, S.month)) return;
      if (!doc.querySelector('#cc-cake-order [data-bcg-box]')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      S.err = 'Choose your birthday, or untick the Birthday Club.';
      paint(S.day ? 'cco-bc-month' : 'cco-bc-day');
      var w = doc.querySelector('#cc-cake-order .cco-bc-when'); if (w) { try { w.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {} }
    }, true);
  }

  global.CCGuestBirthday = { version: '2026-10-20-birthday-club-v1', box: box, after: after, _state: function () { return S; } };
})(typeof window !== 'undefined' ? window : globalThis);
