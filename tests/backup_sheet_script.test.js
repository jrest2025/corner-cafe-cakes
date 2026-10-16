// Runs the real backup Sheet script (google-sheet/CakeBackup.gs) against simulated Google Sheets services.
// Covers: first run on an old-layout Sheet, tab order, row check, the Downtime orders tab never being cleared,
// an older copy never overwriting a newer one, the order system being unreachable, a row mismatch, and a wrong access code.
// Run: node tests/backup_sheet_script.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'google-sheet', 'CakeBackup.gs'), 'utf8');
let R = [];
function check(n, ok, d) { R.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (!ok && d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 300) : '')); }

function makeWorld(initialTabs) {
  const calls = [], props = {};
  const ss = { sheets: [], url: 'https://docs.google.com/spreadsheets/d/x', name: 'Corner Café Cake Orders Backup', active: null };
  function Sheet(name) {
    const s = { name, rows: [], prot: [], filter: null, frozen: 0 };
    const range = (r, c, nr, nc) => ({
      setValues(v) { for (let i = 0; i < v.length; i++) { s.rows[r - 1 + i] = s.rows[r - 1 + i] || []; for (let j = 0; j < v[i].length; j++) s.rows[r - 1 + i][c - 1 + j] = v[i][j]; } return this; },
      setFontWeight() { return this; }, setBackground() { return this; }, setWrap() { return this; }, setNumberFormat() { s.money = (s.money || 0) + 1; return this; },
      setFontColor(c) { s.statusColour = c; return this; }, createFilter() { s.filter = {}; return this; },
    });
    Object.assign(s, {
      getName: () => s.name, getLastRow: () => s.rows.filter(Boolean).length, getRange: range,
      clearContents() { s.rows = []; }, setFrozenRows(n) { s.frozen = n; }, getFilter: () => s.filter && { remove() { s.filter = null; } },
      getProtections: () => s.prot, protect() { const p = { setDescription() { return p; }, addEditor() {}, removeEditors() {}, getEditors: () => [], canDomainEdit: () => false, setDomainEdit() {} }; s.prot.push(p); return p; },
      getIndex: () => ss.sheets.indexOf(s) + 1, setColumnWidth() {},
    });
    return s;
  }
  (initialTabs || []).forEach(t => { const s = Sheet(t.name); s.rows = t.rows || []; ss.sheets.push(s); });
  const api = {
    getSheetByName: n => ss.sheets.find(s => s.name === n) || null,
    insertSheet(n, i) { const s = Sheet(n); if (i == null) ss.sheets.push(s); else ss.sheets.splice(i, 0, s); return s; },
    deleteSheet(s) { ss.sheets.splice(ss.sheets.indexOf(s), 1); },
    getSheets: () => ss.sheets.slice(), setActiveSheet(s) { ss.active = s; }, moveActiveSheet(pos) { const i = ss.sheets.indexOf(ss.active); ss.sheets.splice(i, 1); ss.sheets.splice(pos - 1, 0, ss.active); },
    getUrl: () => ss.url, getName: () => ss.name, toast() {},
  };
  let server = () => ({ code: 500, body: {} });
  const ctx = {
    console, JSON, Date, Math, String, Number, Object, Array, RegExp,
    SpreadsheetApp: { getActive: () => api, ProtectionType: { SHEET: 'SHEET' }, getUi: () => ({}) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.invalid' }) },
    ScriptApp: { getProjectTriggers: () => [] },
    UrlFetchApp: { fetch(url, opt) { const p = JSON.parse(opt.payload); calls.push(p); const r = server(p); if (r.throw) throw new Error('network'); return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) }; } },
  };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { ctx, ss, api, props, calls, setServer(f) { server = f; } };
}
function snapshot(at, extraOrders) {
  const all = [['Order', 'Customer', 'Total (FJD)']].concat([['CC-1001', 'Test A', 68], ['H-0001', 'Imported B', 95]]).concat(extraOrders || []);
  const up = [['Date', 'Time', 'Order'], ['2026-10-17 (Sat)', '2:00 PM', 'CC-1001']];
  const pay = [['Order', 'Paid (FJD)'], ['CC-1001', 0]];
  const hist = [['When', 'Order', 'What happened'], ['2026-10-16 11:58 AM', 'CC-1001', 'Order created']];
  const tabs = { 'All Cake Orders': all, 'Upcoming Production': up, 'Payments': pay, 'Change History': hist };
  const counts = {}; Object.keys(tabs).forEach(k => counts[k] = tabs[k].length - 1);
  return { ok: true, generated_at: at, generated_label: 'Fri 16 Oct 2026, 2:55 PM', order: ['All Cake Orders', 'Upcoming Production', 'Payments', 'Change History'], tabs, counts,
    procedure: [['If the staff app is down', 'Open this Sheet.'], ['When the app is back', 'Enter each line.']] };
}
const names = w => w.ss.sheets.map(s => s.name);
const cell = (w, tab, r, c) => { const s = w.api.getSheetByName(tab); return s && s.rows[r] && s.rows[r][c]; };
const healthText = w => (w.api.getSheetByName('Backup Health').rows || []).map(r => (r || []).join(' | ')).join('\n');

// 1. First run on a Sheet still laid out by version 1
let w = makeWorld([{ name: 'All orders', rows: [['Order'], ['CC-1001']] }, { name: 'Last updated', rows: [['Backup status', 'Working']] }, { name: 'Sheet1' }]);
w.props.ACCESS_CODE = 'ab'.repeat(24);
let snap = snapshot('2026-10-16T02:55:00Z');
w.setServer(p => p.op === 'pull' ? { code: 200, body: snap } : { code: 200, body: { ok: true } });
let r = w.ctx.sync();
check('first run copies', r.ok, r);
check('tabs in outage order, old tabs gone', JSON.stringify(names(w)) === JSON.stringify(['Backup Health', 'Upcoming Production', 'All Cake Orders', 'Payments', 'Change History', 'Downtime orders']), names(w));
check('all orders copied, including imported ones', cell(w, 'All Cake Orders', 2, 0) === 'H-0001' && w.api.getSheetByName('All Cake Orders').getLastRow() === 3);
check('health shows working and the last copy time', /Backup status \| Working/.test(healthText(w)) && /Last successful copy \| Fri 16 Oct 2026, 2:55 PM/.test(healthText(w)), healthText(w));
check('row check passes for every tab', (healthText(w).match(/\| Matches/g) || []).length === 4, healthText(w));
check('outage steps shown', /If the staff app is down \| Open this Sheet/.test(healthText(w)));
const ack = w.calls.filter(c => c.op === 'ack').pop();
check('reports back what it wrote', ack && !ack.error && ack.rows['All Cake Orders'] === 2, ack);
check('copied tabs are protected, downtime tab is not', w.api.getSheetByName('All Cake Orders').prot.length === 1 && w.api.getSheetByName('Downtime orders').prot.length === 0);
check('money columns formatted', w.api.getSheetByName('All Cake Orders').money >= 1);

// 2. Staff type an order in Downtime orders; the next copy leaves it alone
w.api.getSheetByName('Downtime orders').rows.push(['16 Oct 3:10 PM', 'Mere', 'New order', '', 'Walk in guest', '912 0000', 'Cheesecake 8 inch', 'Collect Sat 2 PM', 'Happy 30th', 20, '', '']);
snap = snapshot('2026-10-16T02:56:00Z', [['CC-1002', 'Test C', 52]]);
r = w.ctx.sync();
check('second run copies the new order', r.ok && w.api.getSheetByName('All Cake Orders').getLastRow() === 4);
check('downtime orders typed by staff are kept', w.api.getSheetByName('Downtime orders').getLastRow() === 2 && cell(w, 'Downtime orders', 1, 1) === 'Mere');

// 3. An older copy never overwrites a newer one
snap = snapshot('2026-10-16T02:50:00Z');
r = w.ctx.sync();
check('older copy skipped', r.ok && /older/.test(r.message) && w.api.getSheetByName('All Cake Orders').getLastRow() === 4);

// 4. Order system unreachable: last copy stays, health says so, and the failure is counted
w.setServer(() => ({ throw: true }));
r = w.ctx.sync();
check('unreachable: not copied', !r.ok);
check('unreachable: last copy kept', w.api.getSheetByName('All Cake Orders').getLastRow() === 4);
check('unreachable: health shows the problem and keeps the last good time', /Not copying/.test(healthText(w)) && /2:55 PM/.test(healthText(w)) && /Failed tries in a row \| 1/.test(healthText(w)), healthText(w));
check('unreachable: outage steps still shown', /If the staff app is down/.test(healthText(w)));
r = w.ctx.sync();
check('second failure counted', /Failed tries in a row \| 2/.test(healthText(w)));

// 5. Recovery clears the failure count
snap = snapshot('2026-10-16T03:05:00Z', [['CC-1002', 'Test C', 52]]);
w.setServer(p => p.op === 'pull' ? { code: 200, body: snap } : { code: 200, body: { ok: true } });
r = w.ctx.sync();
check('recovers on the next run', r.ok && /Working/.test(healthText(w)) && /Failed tries in a row \| 0/.test(healthText(w)));

// 6. Row mismatch is reported as a problem
const bad = snapshot('2026-10-16T03:06:00Z'); bad.counts['All Cake Orders'] = 99;
w.setServer(p => p.op === 'pull' ? { code: 200, body: bad } : { code: 200, body: { ok: true } });
const before = w.calls.length;
r = w.ctx.sync();
const errAck = w.calls.slice(before).filter(c => c.op === 'ack').pop();
check('row mismatch fails the run', !r.ok && /row check failed/.test(r.message), r);
check('row mismatch shown in health', /Does not match/.test(healthText(w)));
check('row mismatch reported to the order system', errAck && /row check failed/.test(errAck.error || ''), errAck);

// 7. Wrong access code: says so, does not report (the code is what is wrong)
w.setServer(() => ({ code: 403, body: { ok: false, message: 'The access code is wrong or has been changed.' } }));
const b2 = w.calls.length;
r = w.ctx.sync();
check('wrong code explained', !r.ok && /access code/.test(r.message));
check('wrong code not reported back', w.calls.slice(b2).filter(c => c.op === 'ack').length === 0);

console.log('\n' + R.filter(Boolean).length + '/' + R.length + ' passed');
process.exit(R.every(Boolean) ? 0 : 1);
