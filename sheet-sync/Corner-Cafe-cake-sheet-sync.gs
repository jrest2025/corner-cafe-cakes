/**
 * Corner Café cake orders: Google Sheets to staff app sync
 *
 * Every 5 minutes this sends the rows of both cake order sheets to the staff app.
 * The staff app keeps only orders due from today onwards, and never sends emails for them.
 * It reads the sheets only. It never changes them.
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
  CAKE_SHEETS.forEach(function (s) {
    const tab = SpreadsheetApp.openById(s.id).getSheetByName(s.tab);
    if (!tab || tab.getLastRow() < 2) return;
    // Display values keep dates and times exactly as staff typed them, for example 22.10.2026 and 2:00 PM
    const values = tab.getRange(2, 1, tab.getLastRow() - 1, tab.getLastColumn()).getDisplayValues();
    const rows = values.map(function (v, i) { return { row: i + 2, values: v }; });
    const res = UrlFetchApp.fetch(SYNC_URL, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-sync-key': key },
      payload: JSON.stringify({ sheet: s.name, rows: rows }),
    });
    results.push(s.name + ': ' + res.getResponseCode() + ' ' + res.getContentText());
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
