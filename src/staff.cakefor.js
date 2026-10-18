// Cake for (18 October 2026). On the order's Cake section, under Occasion, for Birthday, Anniversary and Wedding
// orders: who the cake is for. Online orders get it from the cake message; staff can change it in one step.
// Inserted into the released bundle's main scope: y = state, Tt = escape, ha = permission check, a = signed-in client.
var CF = { saved: {}, edit: null, busy: false, err: '' };
function cfRecur(item) {
  var c = String((item && (item.occasion_code || item.occasion)) || '').toLowerCase();
  return c === 'birthday' || c === 'anniversary' || c === 'wedding';
}
function cfRow(o, item) {
  if (!o || !cfRecur(item)) return '';
  var has = Object.prototype.hasOwnProperty.call(CF.saved, o.id), name = has ? CF.saved[o.id] : o.occasion_for;
  var auto = !has && o.occasion_for_from_message && name, can = ha('ord.edit');
  if (CF.edit === o.id) {
    return '<dt>Cake for</dt><dd class="cf-edit"><form data-cf-form="' + Tt(o.id) + '"><label class="ccs-label" for="cf-name">Who is the cake for?</label>' +
      '<input class="ccs-input" id="cf-name" maxlength="60" autocomplete="off" value="' + Tt(name || '') + '" placeholder="For example Mere, or Mum">' +
      (CF.err ? '<p class="ccs-err" role="alert">' + Tt(CF.err) + '</p>' : '') +
      '<div class="cf-acts"><button type="submit" class="ccs-btn"' + (CF.busy ? ' disabled' : '') + '>' + (CF.busy ? 'Saving…' : 'Save') + '</button>' +
      '<button type="button" class="ccs-btn ccs-ghost" data-cf="cancel">Cancel</button></div></form></dd>';
  }
  return '<dt>Cake for</dt><dd class="cf-dd">' + (name ? '<b>' + Tt(name) + '</b>' : '<span class="cf-none">Not known</span>') +
    (auto ? '<small class="cf-src">from the cake message</small>' : '') +
    (can ? '<button type="button" class="ccs-link cf-chg" data-cf="edit" data-id="' + Tt(o.id) + '">' + (name ? 'Change' : 'Add') + '</button>' : '') + '</dd>';
}
(function () {
  function rerender() { try { _n(); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cf]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.getAttribute('data-cf') === 'edit') { CF.edit = b.getAttribute('data-id'); CF.err = ''; rerender(); setTimeout(function () { var i = document.getElementById('cf-name'); if (i) { i.focus(); i.select(); } }, 30); }
    else { CF.edit = null; CF.err = ''; rerender(); }
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-cf-form]'); if (!f) return;
    e.preventDefault(); e.stopPropagation(); if (CF.busy) return;
    var id = f.getAttribute('data-cf-form'), v = (document.getElementById('cf-name') || {}).value || '';
    v = v.replace(/\s+/g, ' ').trim();
    if (v.length > 60) { CF.err = 'Keep the name under 60 characters.'; return rerender(); }
    CF.busy = true; CF.err = ''; rerender();
    a.rpc('staff_set_cake_for', { p_order: id, p_name: v || null }).then(function (r) {
      CF.busy = false;
      var d = r && r.data;
      if (r.error || !d || d.ok === false) { CF.err = (d && d.message) || 'That did not save. Check the connection and try again.'; return rerender(); }
      CF.saved[id] = v || null; CF.edit = null; rerender();
    }, function () { CF.busy = false; CF.err = 'That did not save. Check the connection and try again.'; rerender(); });
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && CF.edit && document.getElementById('cf-name')) { e.stopPropagation(); CF.edit = null; CF.err = ''; rerender(); }
  }, true);
})();
