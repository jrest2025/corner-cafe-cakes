/**
 * Corner Café cake orders: backup Sheet (version 2).
 * A complete, read-only record of every cake order, kept in your Google Drive. Every minute this script fetches a fresh copy
 * from the order system and rewrites the copied tabs. It never changes anything in the order system.
 *
 * Tabs:
 *   Backup Health        When the last copy worked, whether every tab matches the order system, and what to do if the app is down.
 *   Upcoming Production  Every cake still to make, by date and time, with writing, allergies and kitchen instructions.
 *   All Cake Orders      Every order, including the ones imported from the old order sheets.
 *   Payments             Totals, deposits, what has been paid and what is still owed.
 *   Change History       Every change to an order: who, when, why, and old to new.
 *   Downtime orders      The only tab staff type in: orders taken while the app is down. Never overwritten.
 *
 * First time: menu Cake backup, then Set up, and paste the access code from the staff app
 * (Settings, Backup and business continuity, administrators only).
 */
var SERVER_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/sheet-mirror';
var HEALTH = 'Backup Health';
var DOWNTIME = 'Downtime orders';
var TAB_ORDER = [HEALTH, 'Upcoming Production', 'All Cake Orders', 'Payments', 'Change History', DOWNTIME];
var DOWNTIME_HEADER = ['Date and time written', 'Written by', 'New order or change', 'Order number (for a change)', 'Customer', 'Mobile', 'Cake and size',
  'Collect or deliver, date and time', 'Writing, allergies and notes', 'Paid now (FJD)', 'Entered in the app as (order number)', 'Checked by (manager)'];
// Tabs from earlier versions of this script, removed so only the current tabs remain
var OLD_TABS = ['All orders', 'Last updated', 'Today', 'Upcoming', 'Kitchen', 'Contacts', 'Amendments', 'Read me', 'Sync health'];

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

// One copy run. Safe to repeat: each copied tab is rewritten in full, so rows can never be duplicated,
// and a run that fails is simply done again a minute later.
function sync() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, message: 'Another copy is still running.' };
  var ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  try {
    var code = props.getProperty('ACCESS_CODE');
    if (!code) return fail_('No access code yet. Use Cake backup, then Set up.', false, null);
    var res = call_({ op: 'pull' }, code);
    if (!res.ok) return fail_(res.message, res.status !== 403, null);
    var snap = res.body;
    // Never let an older copy overwrite a newer one
    var last = props.getProperty('LAST_SNAPSHOT');
    if (last && new Date(snap.generated_at) < new Date(last)) return { ok: true, message: 'Skipped an older copy.' };
    var names = snap.order || Object.keys(snap.tabs || {}), rows = {}, checks = [], wrong = [];
    names.forEach(function (name) {
      var data = (snap.tabs || {})[name] || [['No data']];
      var sh = writeTab_(ss, name, data);
      // Check: the rows now in the Sheet are the rows the order system holds
      var have = Math.max(sh.getLastRow() - 1, 0), want = snap.counts && snap.counts[name] != null ? Number(snap.counts[name]) : have;
      rows[name] = have;
      checks.push([name, want, have, have === want ? 'Matches' : 'Does not match']);
      if (have !== want) wrong.push(name + ' has ' + have + ' rows, the order system has ' + want);
    });
    ensureDowntime_(ss);
    tidy_(ss, names);
    arrange_(ss);
    if (wrong.length) return fail_('Copied, but the row check failed: ' + wrong.join('; ') + '.', true, { checks: checks, procedure: snap.procedure, label: snap.generated_label });
    props.setProperty('LAST_SNAPSHOT', snap.generated_at);
    props.setProperty('LAST_OK_LABEL', snap.generated_label);
    props.deleteProperty('FAILS');
    writeHealth_(ss, true, snap.generated_label, checks, '', 0, snap.procedure);
    call_({ op: 'ack', snapshot_at: snap.generated_at, rows: rows, url: ss.getUrl(), title: ss.getName() }, code);
    return { ok: true, message: 'Last copy ' + snap.generated_label + '.' };
  } catch (e) {
    return fail_(String(e && e.message || e), true, null);
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

function fail_(message, report, extra) {
  var ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  var fails = Number(props.getProperty('FAILS') || 0) + 1; props.setProperty('FAILS', String(fails));
  var prev = props.getProperty('LAST_PROCEDURE'), procedure = extra && extra.procedure ? extra.procedure : (prev ? JSON.parse(prev) : null);
  writeHealth_(ss, false, props.getProperty('LAST_OK_LABEL') || 'Never', extra ? extra.checks : null, message, fails, procedure);
  var code = props.getProperty('ACCESS_CODE');
  if (report && code) call_({ op: 'ack', error: message, url: ss.getUrl(), title: ss.getName() }, code);
  return { ok: false, message: message };
}

function writeTab_(ss, name, data) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var width = data.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
  var vals = data.map(function (r) { var x = r.slice(); while (x.length < width) x.push(''); return x.map(function (v) { return v == null ? '' : v; }); });
  if (sh.getFilter()) sh.getFilter().remove();
  sh.clearContents();
  sh.getRange(1, 1, vals.length, width).setValues(vals);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#F2F4F7').setWrap(true);
  sh.setFrozenRows(1);
  // Money columns read as money
  vals[0].forEach(function (h, i) { if (/\(FJD\)/.test(String(h)) && vals.length > 1) sh.getRange(2, i + 1, vals.length - 1, 1).setNumberFormat('#,##0.00'); });
  sh.getRange(1, 1, vals.length, width).createFilter(); // sort and search from the header row
  protectOnce_(sh, 'Copied from the order system every minute. Changes here are overwritten.');
  return sh;
}

function protectOnce_(sh, why) {
  if (sh.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0]) return;
  var p = sh.protect().setDescription(why), me = Session.getEffectiveUser();
  p.addEditor(me); p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (p.canDomainEdit()) p.setDomainEdit(false);
}

// The one tab staff type in during an outage. Created once; never cleared or protected.
function ensureDowntime_(ss) {
  var sh = ss.getSheetByName(DOWNTIME);
  if (!sh) sh = ss.insertSheet(DOWNTIME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, DOWNTIME_HEADER.length).setValues([DOWNTIME_HEADER]).setFontWeight('bold').setBackground('#FFF6E5').setWrap(true);
    sh.setFrozenRows(1);
  }
}

// Remove tabs earlier versions wrote (and the empty starting tab). Nothing anyone typed is removed.
function tidy_(ss, keep) {
  OLD_TABS.concat(['Sheet1']).forEach(function (n) {
    if (keep.indexOf(n) > -1) return;
    var sh = ss.getSheetByName(n); if (!sh || ss.getSheets().length < 2) return;
    if (n === 'Sheet1' && sh.getLastRow() > 0) return;
    ss.deleteSheet(sh);
  });
}

// Health first, then the tabs in the order staff need them in an outage
function arrange_(ss) {
  TAB_ORDER.forEach(function (name, i) {
    var sh = ss.getSheetByName(name); if (!sh) return;
    if (sh.getIndex() !== i + 1) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
  });
}

function writeHealth_(ss, ok, label, checks, problem, fails, procedure) {
  var h = ss.getSheetByName(HEALTH) || ss.insertSheet(HEALTH, 0);
  if (procedure) PropertiesService.getScriptProperties().setProperty('LAST_PROCEDURE', JSON.stringify(procedure));
  var lines = [
    ['Backup status', ok ? 'Working' : 'Not copying: see Problem', '', ''],
    ['Last successful copy', label, '', ''],
    ['Problem', problem || 'None', '', ''],
    ['Failed tries in a row', String(fails || 0), '', ''],
    ['', '', '', ''],
    ['Check against the order system', 'Rows in the order system', 'Rows in this Sheet', 'Result']];
  (checks || []).forEach(function (c) { lines.push(c.map(String)); });
  if (!checks) lines.push(['Not checked on this run', '', '', '']);
  lines.push(['', '', '', '']);
  lines.push(['What to do', '', '', '']);
  (procedure || [['If the staff app is down', 'Open this Sheet from Google Drive. Check Last successful copy above.']]).forEach(function (p) { lines.push([p[0], p[1], '', '']); });
  h.clearContents();
  h.getRange(1, 1, lines.length, 4).setValues(lines);
  h.getRange(1, 1, lines.length, 1).setFontWeight('bold');
  h.getRange(6, 1, 1, 4).setFontWeight('bold').setBackground('#F2F4F7');
  h.setColumnWidth(1, 240); h.setColumnWidth(2, 520); h.setColumnWidth(3, 160); h.setColumnWidth(4, 160);
  h.getRange(1, 2, lines.length, 1).setWrap(true);
  h.getRange(1, 2).setFontColor(ok ? '#027A48' : '#B42318').setFontWeight('bold');
  protectOnce_(h, 'Written by the backup script.');
}
