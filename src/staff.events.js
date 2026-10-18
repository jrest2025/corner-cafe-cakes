// Settings > Events and public holidays (18 October 2026). Inserted in the app's main scope:
// a = signed-in client, ha = permission check, ma = toast, _a/xa = busy state, Tt = escape, Dt = today, jt = addDays,
// Mt = nice date, Ma = re-render. Saves go through calendar_event_save / calendar_event_delete, which check
// the Settings permission on the server and keep a change log.
var EV = { rows: [], loaded: false, loading: false, err: null, edit: null, msg: null, bad: false };
function evLoad(force) {
  if (EV.loading || (EV.loaded && !force)) return; EV.loading = true;
  a.from('calendar_events').select('id,day,ends_on,name,kind,note,updated_by').gte('day', jt(Dt(), -30)).order('day').then(function (r) {
    EV.loading = false; EV.loaded = true;
    if (r.error) { EV.err = /does not exist|relation/i.test(r.error.message || '') ? 'missing' : 'load'; EV.rows = []; }
    else { EV.err = null; EV.rows = r.data || []; }
    evPaint();
  }).catch(function () { EV.loading = false; EV.loaded = true; EV.err = 'load'; evPaint(); });
}
// Repaint just this section in place: the rest of Settings (and anything typed there) is left alone.
function evPaint() {
  var d = document.querySelector('#cc-staff .ev-settings'); if (!d) return;
  var w = document.createElement('div'); w.innerHTML = evSettingsView(); var n = w.firstElementChild;
  // Keep whatever the Settings layout set on the section (which one is showing, its place in the side list).
  if (n) { [].forEach.call(d.attributes, function (at) { if (at.name !== 'open') n.setAttribute(at.name, at.value); }); n.open = d.open || EV.open; d.replaceWith(n); }
}
function evWhen(e) { return Mt(e.day) + (e.ends_on && e.ends_on !== e.day ? ' to ' + Mt(e.ends_on) : ''); }
function evForm() {
  var e = EV.edit || { kind: 'event' }, isNew = !e.id;
  var kinds = [['event', 'Café event'], ['holiday', 'Public holiday']];
  return '<div class="ev-form" id="ev-form"><h4>' + (isNew ? 'Add an event or holiday' : 'Change ' + Tt(e.name)) + '</h4>' +
    '<div class="ev-grid"><div class="ccs-field ev-name"><label class="ccs-label" for="ev-name">Name</label><input class="ccs-input" id="ev-name" maxlength="60" placeholder="For example: Beer Fest at Cantina" value="' + Tt(e.name || '') + '"></div>' +
    '<div class="ccs-field"><span class="ccs-label">Type</span><div class="ccs-chips" role="group" aria-label="Type">' + kinds.map(function (k) { return '<button type="button" class="ccs-chip" data-ev="kind" data-v="' + k[0] + '" aria-pressed="' + (e.kind === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="ccs-field"><label class="ccs-label" for="ev-day">Date</label><input class="ccs-input" id="ev-day" type="date" value="' + Tt(e.day || '') + '"></div>' +
    '<div class="ccs-field"><label class="ccs-label" for="ev-end">Last day <em class="sl-req">Optional, for events over several days</em></label><input class="ccs-input" id="ev-end" type="date" value="' + Tt(e.ends_on || '') + '"></div>' +
    '<div class="ccs-field ev-note"><label class="ccs-label" for="ev-note">Note <em class="sl-req">Optional</em></label><input class="ccs-input" id="ev-note" maxlength="200" value="' + Tt(e.note || '') + '"></div></div>' +
    (EV.msg ? '<p class="' + (EV.bad ? 'ccs-err' : 'ccs-note') + '" id="ev-msg" role="status">' + Tt(EV.msg) + '</p>' : '') +
    '<div class="ev-acts"><button type="button" class="ccs-btn" data-ev="save">' + (isNew ? 'Add to calendar' : 'Save changes') + '</button>' +
    (isNew ? '' : '<button type="button" class="ccs-btn ccs-ghost" data-ev="cancel">Cancel</button>') + '</div></div>';
}
function evSettingsView() {
  if (!ha('mgmt.settings')) return '';
  evLoad();
  var body;
  if (!EV.loaded) body = '<p class="ccs-loading">Loading events…</p>';
  else if (EV.err === 'missing') body = '<p class="ccs-hint">The events list has not been set up in the database yet. Once it is, public holidays and café events can be managed here.</p>';
  else {
    var t = Dt(), up = EV.rows.filter(function (e) { return (e.ends_on || e.day) >= t; });
    body = (EV.err ? '<p class="ccs-err">The events could not load. <button type="button" class="ccs-link" data-ev="retry">Try again</button></p>' : '') +
      (up.length ? '<ul class="ev-list">' + up.map(function (e) {
        return '<li class="ev-item ev-' + e.kind + (EV.edit && EV.edit.id === e.id ? ' is-edit' : '') + '"><span class="ev-dot" aria-hidden="true"></span><span class="ev-main"><b>' + Tt(e.name) + '</b><span>' + Tt(evWhen(e)) + ' · ' + (e.kind === 'holiday' ? 'Public holiday' : 'Café event') + (e.note ? ' · ' + Tt(e.note) : '') + '</span></span>' +
          '<span class="ev-btns"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-ev="edit" data-id="' + e.id + '">Change</button><button type="button" class="ccs-btn ccs-ghost ccs-small ev-del" data-ev="del" data-id="' + e.id + '">Remove</button></span></li>';
      }).join('') + '</ul>' : '<p class="ccs-hint">No upcoming events or public holidays yet.</p>') + evForm();
  }
  return '<details class="ev-settings"' + (EV.open ? ' open' : '') + '><summary>Events and public holidays</summary><div class="ccs-set-body"><p class="ccs-hint">These show on the calendar and in Coming up. Public holidays are grey; café events are blue. Cake occasions such as Christmas stay in Occasions and special dates.</p>' + body + '</div></details>';
}
function evVal(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function evSave(btn) {
  if (!ha('mgmt.settings')) return ma('Your login cannot change Settings.', true);
  var e = EV.edit || { kind: 'event' }, name = evVal('ev-name'), day = evVal('ev-day'), end = evVal('ev-end'), note = evVal('ev-note');
  EV.edit = Object.assign({}, e, { name: name, day: day, ends_on: end || null, note: note });
  var fail = function (m) { EV.msg = m; EV.bad = true; evPaint(); var f = document.getElementById(/name/i.test(m) ? 'ev-name' : /date|day/i.test(m) ? 'ev-day' : 'ev-name'); if (f) f.focus(); };
  if (name.length < 2) return fail('Give the event a name.');
  if (!day) return fail('Choose the date.');
  if (end && end < day) return fail('The last day cannot be before the date.');
  _a(btn, 'Saving…');
  a.rpc('calendar_event_save', { p_id: e.id || null, p_day: day, p_ends_on: end || null, p_name: name, p_kind: e.kind || 'event', p_note: note || null }).then(function (r) {
    xa(); if (r.error) throw r.error;
    if (!r.data || !r.data.ok) return fail((r.data && r.data.message) || 'The event was not saved. Try again.');
    EV.edit = null; EV.msg = e.id ? 'Changes saved.' : name + ' added to the calendar.'; EV.bad = false;
    ma(e.id ? 'Event updated' : 'Event added'); if (typeof CO !== 'undefined') CO.loaded = false; evLoad(true);
  }).catch(function () { xa(); fail('The event could not be saved. Check the connection and try again.'); });
}
function evDel(id, btn) {
  var e = EV.rows.filter(function (x) { return x.id === id; })[0]; if (!e) return;
  if (!window.confirm('Remove ' + e.name + ' (' + evWhen(e) + ') from the calendar?')) return;
  _a(btn, 'Removing…');
  a.rpc('calendar_event_delete', { p_id: id }).then(function (r) {
    xa(); if (r.error) throw r.error;
    if (!r.data || !r.data.ok) { EV.msg = (r.data && r.data.message) || 'The entry was not removed.'; EV.bad = true; return evPaint(); }
    if (EV.edit && EV.edit.id === id) EV.edit = null;
    EV.msg = e.name + ' removed.'; EV.bad = false; ma('Event removed'); if (typeof CO !== 'undefined') CO.loaded = false; evLoad(true);
  }).catch(function () { xa(); EV.msg = 'The entry could not be removed. Check the connection and try again.'; EV.bad = true; evPaint(); });
}
var EV_PREV = srSettingsView;
srSettingsView = function (st) { return evSettingsView() + EV_PREV(st); };
(function () {
  function watch() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(watch, 200);
    // Typing in the form must not trigger the app's own input handling (which re-renders Settings).
    ['input', 'change'].forEach(function (t) { root.addEventListener(t, function (e) { if (e.target.id && e.target.id.indexOf('ev-') === 0) e.stopPropagation(); }, true); });
    root.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('ev-settings')) EV.open = e.target.open; }, true);
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-ev]'); if (!b || !root.contains(b)) return;
      e.preventDefault(); e.stopPropagation(); EV.open = true;
      var act = b.getAttribute('data-ev'), keep = function () { if (EV.edit && document.getElementById('ev-form')) { EV.edit.name = evVal('ev-name'); EV.edit.day = evVal('ev-day'); EV.edit.ends_on = evVal('ev-end') || null; EV.edit.note = evVal('ev-note'); } };
      if (act === 'kind') { EV.edit = EV.edit || { kind: 'event' }; keep(); EV.edit.kind = b.getAttribute('data-v'); EV.msg = null; evPaint(); }
      else if (act === 'save') evSave(b);
      else if (act === 'cancel') { EV.edit = null; EV.msg = null; evPaint(); }
      else if (act === 'edit') { var r = EV.rows.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (r) { EV.edit = Object.assign({}, r); EV.msg = null; evPaint(); setTimeout(function () { var f = document.getElementById('ev-name'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } }, 40); } }
      else if (act === 'del') evDel(b.getAttribute('data-id'), b);
      else if (act === 'retry') { EV.loaded = false; evLoad(true); }
    }, true);
  }
  watch();
})();
