/**
 * Corner Café cake orders: backup Sheet.
 * A simple record of every cake order, kept in your Google Drive. Every minute this script fetches a read-only copy
 * of the orders from the order system and rewrites the copy. It never changes orders in the order system.
 *
 * First time: menu Cake backup, then Set up, and paste the access code from the staff app
 * (Settings, Backup and business continuity, administrators only).
 */
var SERVER_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/sheet-mirror';
var STATUS = 'Last updated';
// Tabs from the first, longer version of this script; removed so only the order record remains
var OLD_TABS = ['Today', 'Upcoming', 'Kitchen', 'Contacts', 'Amendments', 'Read me', 'Sync health', 'Downtime orders'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cake backup')
    .addItem('Copy now', 'syncNow')
    .addItem('Set up (first time)', 'setup')
    .addItem('Change the access code', 'changeCode')
    .addToUi();
}

function setup() {
  var ui = SpreadsheetApp.getUi();
  if (!askCode_()) return;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sync') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sync').timeBased().everyMinutes(1).create();
  var r = sync();
  ui.alert(r.ok ? 'Backup is set up. Orders are copied here every minute.' : 'Set up, but the first copy failed: ' + r.message);
}

function changeCode() { if (askCode_()) syncNow(); }

function askCode_() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('Cake backup', 'Paste the access code from the staff app (Settings, Backup and business continuity).', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return false;
  var code = String(res.getResponseText() || '').trim();
  if (!/^[a-f0-9]{32,}$/.test(code)) { ui.alert('That does not look like the access code. Copy it again from the staff app.'); return false; }
  PropertiesService.getScriptProperties().setProperty('ACCESS_CODE', code);
  return true;
}

function syncNow() {
  var r = sync();
  SpreadsheetApp.getActive().toast(r.ok ? 'Copied. ' + r.message : 'Not copied: ' + r.message, 'Cake backup', 8);
}

// One copy run. Safe to repeat: each copied tab is rewritten in full, so rows can never be duplicated.
function sync() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, message: 'Another copy is still running.' };
  var ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  try {
    var code = props.getProperty('ACCESS_CODE');
    if (!code) return fail_('No access code yet. Use Cake backup, then Set up.', false);
    var res = call_({ op: 'pull' }, code);
    if (!res.ok) return fail_(res.message, res.status !== 403);
    var snap = res.body;
    // Never let an older copy overwrite a newer one
    var last = props.getProperty('LAST_SNAPSHOT');
    if (last && new Date(snap.generated_at) < new Date(last)) return { ok: true, message: 'Skipped an older copy.' };
    var rows = {}, names = Object.keys(snap.tabs || {});
    names.forEach(function (name) { var data = snap.tabs[name] || [['No data']]; writeTab_(ss, name, data); rows[name] = Math.max(data.length - 1, 0); });
    tidy_(ss, names);
    props.setProperty('LAST_SNAPSHOT', snap.generated_at);
    props.setProperty('LAST_OK_LABEL', snap.generated_label);
    props.deleteProperty('FAILS');
    writeStatus_(ss, true, snap.generated_label, rows, '');
    call_({ op: 'ack', snapshot_at: snap.generated_at, rows: rows, url: ss.getUrl(), title: ss.getName() }, code);
    return { ok: true, message: 'Last copy ' + snap.generated_label + '.' };
  } catch (e) {
    return fail_(String(e && e.message || e), true);
  } finally {
    lock.releaseLock();
  }
}

function call_(payload, code) {
  var r;
  try {
    r = UrlFetchApp.fetch(SERVER_URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), headers: { 'x-mirror-key': code }, muteHttpExceptions: true });
  } catch (e) { return { ok: false, status: 0, message: 'Could not reach the order system. The Sheet keeps the last copy.' }; }
  var status = r.getResponseCode(), body = {};
  try { body = JSON.parse(r.getContentText()); } catch (e) {}
  if (status === 200 && body.ok) return { ok: true, status: status, body: body };
  return { ok: false, status: status, message: body.message || ('The order system answered ' + status + '. The Sheet keeps the last copy.') };
}

function fail_(message, report) {
  var ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  var fails = Number(props.getProperty('FAILS') || 0) + 1; props.setProperty('FAILS', String(fails));
  writeStatus_(ss, false, props.getProperty('LAST_OK_LABEL') || 'Never', null, message + (fails > 1 ? ' (' + fails + ' tries in a row)' : ''));
  var code = props.getProperty('ACCESS_CODE');
  if (report && code) call_({ op: 'ack', error: message, url: ss.getUrl(), title: ss.getName() }, code);
  return { ok: false, message: message };
}

function writeTab_(ss, name, data) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name, 0);
  var width = data.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
  var vals = data.map(function (r) { var x = r.slice(); while (x.length < width) x.push(''); return x.map(function (v) { return v == null ? '' : v; }); });
  if (sh.getFilter()) sh.getFilter().remove();
  sh.clearContents();
  sh.getRange(1, 1, vals.length, width).setValues(vals);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#F2F4F7');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, vals.length, width).createFilter(); // sort and search from the header row
  protectOnce_(sh, 'Copied from the order system every minute. Changes here are overwritten.');
}

function protectOnce_(sh, why) {
  if (sh.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0]) return;
  var p = sh.protect().setDescription(why), me = Session.getEffectiveUser();
  p.addEditor(me); p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (p.canDomainEdit()) p.setDomainEdit(false);
}

// Remove tabs this script used to write (and the empty starting tab). Nothing anyone typed is removed.
function tidy_(ss, keep) {
  OLD_TABS.concat(['Sheet1']).forEach(function (n) {
    if (keep.indexOf(n) > -1) return;
    var sh = ss.getSheetByName(n); if (!sh || ss.getSheets().length < 2) return;
    if (n === 'Downtime orders' && sh.getLastRow() > 2) return; // someone has written in it: keep it
    if (n === 'Sheet1' && sh.getLastRow() > 0) return;
    ss.deleteSheet(sh);
  });
}

function writeStatus_(ss, ok, label, rows, problem) {
  var h = ss.getSheetByName(STATUS) || ss.insertSheet(STATUS);
  var lines = [['Backup status', ok ? 'Working' : 'Not copying: see Problem'], ['Last successful copy', label], ['Problem', problem || 'None']];
  if (rows) Object.keys(rows).forEach(function (n) { lines.push(['Rows in ' + n, rows[n]]); });
  lines.push(['About this Sheet', 'A read-only record of every cake order, copied from the order system every minute. Share with managers only: it holds phone numbers and allergies.']);
  h.clearContents(); h.getRange(1, 1, lines.length, 2).setValues(lines);
  h.getRange(1, 1, lines.length, 1).setFontWeight('bold'); h.setColumnWidth(1, 220); h.setColumnWidth(2, 520);
  h.getRange(1, 2, lines.length, 1).setWrap(true);
  h.getRange(1, 2).setFontColor(ok ? '#027A48' : '#B42318').setFontWeight('bold');
  protectOnce_(h, 'Written by the backup script.');
}
