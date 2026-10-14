/**
 * Corner Café cake orders: backup Sheet.
 * Lives inside this Google Sheet, in your Google Drive. Every minute it fetches a read-only copy of the cake orders
 * from the order system and rewrites the copy tabs. It never changes orders in the order system.
 *
 * First time: menu Cake backup, then Set up, and paste the access code from the staff app
 * (Settings, Backup and business continuity, administrators only).
 */
var SERVER_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/sheet-mirror';
var COPY_TABS = ['Today', 'Upcoming', 'Kitchen', 'All orders', 'Contacts', 'Amendments'];
var DOWNTIME = 'Downtime orders', HEALTH = 'Sync health', README = 'Read me';
var DOWNTIME_HEAD = ['Temporary number', 'Taken at', 'Taken by', 'Guest', 'Phone', 'Pickup date', 'Pickup time', 'Collect or deliver', 'Cake', 'Size', 'Inscription', 'Allergy or dietary', 'Price', 'Paid', 'Kitchen told (who and when)', 'Entered into the app as order number', 'Notes'];

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
  ensureFixedTabs_();
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

// One copy run. Safe to repeat: every copy tab is rewritten in full, so rows can never be duplicated.
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
    ensureFixedTabs_();
    var rows = {};
    COPY_TABS.forEach(function (name) {
      var data = (snap.tabs && snap.tabs[name]) || [['No data']];
      writeTab_(ss, name, data);
      rows[name] = Math.max(data.length - 1, 0);
    });
    props.setProperty('LAST_SNAPSHOT', snap.generated_at);
    props.setProperty('LAST_OK_LABEL', snap.generated_label);
    props.deleteProperty('FAILS');
    writeHealth_(ss, true, snap.generated_label, rows, '', snap.counts);
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
  } catch (e) { return { ok: false, status: 0, message: 'Could not reach the order system. The tabs keep the last copy.' }; }
  var status = r.getResponseCode(), body = {};
  try { body = JSON.parse(r.getContentText()); } catch (e) {}
  if (status === 200 && body.ok) return { ok: true, status: status, body: body };
  return { ok: false, status: status, message: body.message || ('The order system answered ' + status + '. The tabs keep the last copy.') };
}

function fail_(message, report) {
  var ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  var fails = Number(props.getProperty('FAILS') || 0) + 1; props.setProperty('FAILS', String(fails));
  writeHealth_(ss, false, props.getProperty('LAST_OK_LABEL') || 'Never', null, message + (fails > 1 ? ' (' + fails + ' tries in a row)' : ''), null);
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
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#F2F4F7');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, vals.length, width).createFilter(); // sort and search from the header row
  protectOnce_(sh, 'Copied from the order system every minute. Changes here are overwritten. Use the Downtime orders tab instead.');
}

function protectOnce_(sh, why) {
  var p = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
  if (p) return;
  p = sh.protect().setDescription(why);
  var me = Session.getEffectiveUser();
  p.addEditor(me); p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
  if (p.canDomainEdit()) p.setDomainEdit(false);
}

function ensureFixedTabs_() {
  var ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(README)) {
    var r = ss.insertSheet(README, 0);
    r.getRange(1, 1, README_TEXT.length, 1).setValues(README_TEXT.map(function (l) { return [l]; }));
    r.getRange(1, 1).setFontWeight('bold').setFontSize(14); r.setColumnWidth(1, 900); r.getRange('A:A').setWrap(true);
    protectOnce_(r, 'Instructions. Ask a manager to change them.');
  }
  if (!ss.getSheetByName(HEALTH)) { var h = ss.insertSheet(HEALTH); protectOnce_(h, 'Written by the backup script.'); }
  var d = ss.getSheetByName(DOWNTIME);
  if (!d) {
    d = ss.insertSheet(DOWNTIME);
    d.getRange(1, 1, 1, DOWNTIME_HEAD.length).setValues([DOWNTIME_HEAD]).setFontWeight('bold').setBackground('#FEF0C7');
    d.setFrozenRows(1);
    d.getRange(2, 1).setValue('M-001');
  }
  var first = ss.getSheetByName('Sheet1'); if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
}

function writeHealth_(ss, ok, label, rows, problem, counts) {
  var h = ss.getSheetByName(HEALTH) || ss.insertSheet(HEALTH);
  var lines = [['Backup status', ok ? 'Working' : 'Not copying: see Problem'], ['Last successful copy', label], ['Checked', Utilities.formatDate(new Date(), 'Pacific/Fiji', 'EEE d MMM yyyy, h:mma').replace('AM', 'am').replace('PM', 'pm')], ['Problem', problem || 'None']];
  if (rows) COPY_TABS.forEach(function (n) { lines.push(['Rows in ' + n, rows[n]]); });
  if (counts && counts.emails_failed) lines.push(['Emails that could not be sent (last 7 days)', counts.emails_failed]);
  h.clearContents(); h.getRange(1, 1, lines.length, 2).setValues(lines);
  h.getRange(1, 1, lines.length, 1).setFontWeight('bold'); h.setColumnWidth(1, 320); h.setColumnWidth(2, 420);
  h.getRange(1, 2).setFontColor(ok ? '#027A48' : '#B42318').setFontWeight('bold');
}

var README_TEXT = [
  'Corner Café cake orders: backup Sheet',
  'This Sheet is a read-only copy of the cake order system, refreshed every minute. The order system stays the only master record.',
  'Check the Sync health tab first: it shows when the last copy was made. If it is more than a few minutes old, the copy may be out of date.',
  '',
  'Tabs',
  'Today: every cake due today, in time order, with phone numbers and allergies.',
  'Upcoming: the next 14 days.',
  'Kitchen: confirmed cakes for the kitchen, with ready-by times, inscriptions, candles and allergies.',
  'All orders: every order, newest pickup first. Use the filter arrows in the header row to sort and search.',
  'Contacts: phone and email for current orders only.',
  'Amendments: changes made to orders in the last 90 days.',
  'Downtime orders: the only tab you type in. It is never overwritten.',
  '',
  'If the staff app is down',
  '1. Open this Sheet. Check Sync health for the time of the last copy.',
  '2. For collections, use Today. Check the order number and the guest name before handing over. Write the hand-over on paper with the time.',
  '3. For the kitchen, use the Kitchen tab. Read allergies aloud to the kitchen. Earlier printed slips are still valid unless the Amendments tab shows a change.',
  '4. New or changed orders: write each one in Downtime orders with a temporary number M-001, M-002 and so on. If this Sheet cannot be opened, use the paper form with the same numbers.',
  '5. Tell the kitchen by phone or in person, and write who you told and when in the Kitchen told column.',
  '6. When the staff app is back, a manager enters each downtime order in the app, writes the new order number in the Entered into the app as order number column, and prints the slip from the app.',
  '7. Never enter a downtime order twice: check the Entered into the app column first. Search the app by phone number before creating a new order.',
  '',
  'Privacy',
  'This Sheet holds guest names, phone numbers and allergies. Share it with managers only. Never share it with anyone with the link.'
];
