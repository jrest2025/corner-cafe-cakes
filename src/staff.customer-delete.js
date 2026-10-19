// Delete customer (20 October 2026). Managers and admins (permission cust.merge) can delete a customer record
// from the customer profile. Past orders stay, shown as "Deleted customer"; open orders must be finished first.
// Runs inside the staff app bundle: uses the app's state (y), permission check (ha), Supabase client (a),
// escaping (Tt), toast (ma) and error handler (ga).
var CD = { id: null, step: 'idle', reason: '', err: '' };
var CD_OPEN = ['awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit', 'confirmed'];
var CD_REASONS = ['Left the country', 'Duplicate', 'Asked to be removed', 'Other'];
function cdSheet() {
  var s = y.sheet;
  if (!s || s.type !== 'customer' || s.edit || !s.data || !s.data.c) return null;
  var c = s.data.c;
  if (c.merged_into || (c.customer_no === 0 && c.full_name === 'Deleted customer')) return null;
  return s;
}
function cdHtml(s) {
  var c = s.data.c, orders = s.data.orders || [];
  var open = orders.filter(function (o) { return CD_OPEN.indexOf(o.order_status) > -1; }).length;
  var past = orders.length - open;
  var no = 'C-' + c.customer_no;
  if (CD.step === 'idle') {
    return '<button type="button" class="ccs-btn cd-ask" data-cd="ask">Delete customer</button>';
  }
  var h = '<h3>Delete ' + Tt(no + ' ' + c.full_name) + '?</h3>';
  if (open) {
    return h + '<p class="cd-block">This customer has ' + open + (open === 1 ? ' open order' : ' open orders') +
      '. Complete or cancel ' + (open === 1 ? 'it' : 'them') + ' first, then delete the customer.</p>' +
      '<div class="cd-acts"><button type="button" class="ccs-btn ccs-ghost" data-cd="cancel">Close</button></div>';
  }
  h += '<ul class="cd-list"><li>Their details, notes, follow-ups and marketing permissions are deleted.</li>' +
    (past ? '<li>Their ' + past + (past === 1 ? ' past order stays' : ' past orders stay') + ' in sales figures, shown as "Deleted customer".</li>' : '') +
    '<li><b>This cannot be undone.</b></li></ul>';
  h += '<p class="cd-q">Reason (optional)</p><div class="cd-chips" role="group" aria-label="Reason">' + CD_REASONS.map(function (r) {
    return '<button type="button" class="cd-chip" data-cd="reason" data-r="' + Tt(r) + '" aria-pressed="' + (CD.reason === r) + '">' + Tt(r) + '</button>';
  }).join('') + '</div>';
  if (CD.err) h += '<p class="ccs-err cd-err" role="alert">' + Tt(CD.err) + '</p>';
  var busy = CD.step === 'busy';
  h += '<div class="cd-acts"><button type="button" class="ccs-btn ccs-ghost" data-cd="cancel"' + (busy ? ' disabled' : '') + '>Cancel</button>' +
    '<button type="button" class="ccs-btn cd-go" data-cd="go"' + (busy ? ' disabled aria-busy="true"' : '') + '>' + (busy ? 'Deleting…' : 'Delete permanently') + '</button></div>';
  return h;
}
function cdApply() {
  var s = cdSheet(), sheet = document.getElementById('ccs-sheet');
  if (!sheet) return;
  var zone = sheet.querySelector('.cd-zone');
  if (!s || !ha('cust.merge')) { if (zone) zone.remove(); if (!s) CD.id = null; return; }
  if (CD.id !== s.id) { CD.id = s.id; CD.step = 'idle'; CD.reason = ''; CD.err = ''; }
  var body = sheet.querySelector('.ccs-sheet-body'); if (!body) return;
  var html = cdHtml(s);
  if (!zone) { zone = document.createElement('section'); zone.className = 'ccs-box cd-zone'; zone.setAttribute('aria-label', 'Delete customer'); body.appendChild(zone); }
  else if (zone.parentNode !== body || zone !== body.lastElementChild) body.appendChild(zone);
  if (zone.getAttribute('data-h') !== html) { zone.innerHTML = html; zone.setAttribute('data-h', html); zone.classList.toggle('is-confirm', CD.step !== 'idle'); }
}
function cdGo() {
  var s = cdSheet(); if (!s || CD.step === 'busy') return;
  var c = s.data.c; CD.step = 'busy'; CD.err = ''; cdApply();
  a.rpc('customer_delete', { p_customer: c.id, p_version: c.version, p_reason: CD.reason || null }).then(function (r) {
    if (r.error) throw r.error;
    var d = r.data || {};
    if (!d.ok) { CD.step = 'confirm'; CD.err = d.message || 'The customer was not deleted. Please try again.'; cdApply(); return; }
    CD.id = null; CD.step = 'idle'; CD.reason = '';
    var x = document.querySelector('#ccs-sheet [data-act="close"]'); if (x) x.click();
    var kept = d.orders_kept || 0;
    try { if (y.cust) y.cust.loaded = false; if (y.crm) y.crm.at = 0; } catch (e) {}
    if (y.tab === 'customers') { var st = document.querySelector('[data-tab="customers"]'); if (st) st.click(); }
    // After the list refresh, which clears any earlier message.
    setTimeout(function () { ma('Customer deleted.' + (kept ? ' ' + kept + (kept === 1 ? ' past order kept' : ' past orders kept') + ' as "Deleted customer".' : '')); }, 120);
  }).catch(function (e) { CD.step = 'confirm'; CD.err = 'The customer was not deleted. Check the internet connection and try again.'; cdApply(); ga(e); });
}
(function () {
  var t = null;
  function soon() { if (t) return; t = requestAnimationFrame(function () { t = null; cdApply(); }); }
  function watch() {
    // The sheet element can be created or replaced after load, so watch the whole page.
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', function (e) {
      var sheet = document.getElementById('ccs-sheet');
      var b = e.target.closest && e.target.closest('#ccs-sheet [data-cd]'); if (!b || !sheet) return;
      e.preventDefault(); e.stopPropagation();
      var k = b.getAttribute('data-cd');
      if (k === 'ask') { CD.step = 'confirm'; CD.err = ''; cdApply(); var g = sheet.querySelector('.cd-zone [data-cd="cancel"]'); if (g) g.focus(); var z = sheet.querySelector('.cd-zone'); if (z && z.scrollIntoView) z.scrollIntoView({ block: 'nearest' }); }
      else if (k === 'cancel') { CD.step = 'idle'; CD.reason = ''; CD.err = ''; cdApply(); }
      else if (k === 'reason') { var r = b.getAttribute('data-r'); CD.reason = CD.reason === r ? '' : r; cdApply(); }
      else if (k === 'go') cdGo();
    }, true);
    soon();
  }
  watch();
})();
