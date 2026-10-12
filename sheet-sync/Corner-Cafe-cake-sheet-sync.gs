/**
 * Corner Café cake orders: Google Sheets to staff app sync
 *
 * Every 5 minutes this sends every row of both cake order sheets to the staff app.
 *  - Every row, past and future, goes into the cake register, which the dashboard counts from. Changed rows are logged.
 *  - Orders due from today onwards also appear in the staff app's order list. No emails are sent for them.
 * It reads the sheets only. It never changes them. Keep entering orders in the sheets as usual.
 *
 * One-time setup (about 5 minutes):
 *   1. In Supabase: Edge Functions > Secrets. Add a secret named SHEET_SYNC_SECRET.
 *      Use a long random value of at least 24 characters, for example from a password generator.
 *   2. Here in Apps Script: Project Settings (gear icon) > Script properties > Add script property.
 *      Property: SYNC_KEY. Value: exactly the same value as step 1.
 *   3. Choose the function "setUpEveryFiveMinutes" at the top and press Run. Approve the permissions Google asks for.
 *      This runs one sync straight away and then every 5 minutes.
 *
 * To stop it: choose "stopSync" and press Run.
 */

const SYNC_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/sheet-sync';
const CAKE_SHEETS = [
  { name: 'online', id: '1hyRohR0kFCLMoJ1grjS13P6c5TseaRKDsJsy-NiE1sE', tab: 'Sheet1' }, // Corner Café – Online Cake Orders
  { name: 'walkin', id: '1n-tQntl6Oe9ecztKJ5EHe5j182uZIlBtARU9P-NS7Iw', tab: 'Sheet1' }, // Corner Café – Walk-In Cake Orders – Staff Use
];

function syncCakeOrders() {
  const key = PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
  if (!key) throw new Error('Add the SYNC_KEY script property first (see the setup notes at the top).');
  const results = [];
  const send = function (body) {
    return UrlFetchApp.fetch(SYNC_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-sync-key': key }, payload: JSON.stringify(body) });
  };
  CAKE_SHEETS.forEach(function (s) {
    try {
      const tab = SpreadsheetApp.openById(s.id).getSheetByName(s.tab);
      if (!tab) throw new Error('The tab "' + s.tab + '" was not found. Was it renamed?');
      if (tab.getLastRow() < 2) throw new Error('The sheet has no rows below the heading.');
      // Display values keep dates and times exactly as staff typed them, for example 22.10.2026 and 2:00 PM
      const values = tab.getRange(2, 1, tab.getLastRow() - 1, tab.getLastColumn()).getDisplayValues();
      const rows = values.map(function (v, i) { return { row: i + 2, values: v }; });
      const res = send({ sheet: s.name, rows: rows });
      results.push(s.name + ': ' + res.getResponseCode() + ' ' + res.getContentText());
    } catch (e) {
      // Tell the staff app, so the dashboard and register show the sheet is not up to date
      try { send({ op: 'failed', sheet: s.name, message: String(e && e.message || e) }); } catch (x) {}
      results.push(s.name + ': could not be read. ' + e);
    }
  });
  console.log(results.join('\n'));
  return results;
}

function setUpEveryFiveMinutes() {
  stopSync();
  ScriptApp.newTrigger('syncCakeOrders').timeBased().everyMinutes(5).create();
  syncCakeOrders();
}

function stopSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncCakeOrders') ScriptApp.deleteTrigger(t);
  });
}
