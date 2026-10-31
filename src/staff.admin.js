/* Corner Café: shared frame (31 Oct 2026, cleanup stage 3). One queue for the add-ons' screen passes: they all run in the
 * same frame, before the screen is drawn, and a pass that changes the page lets the others react in that same frame
 * (at most 8 rounds), instead of each waiting its own frame or 30 to 60 ms (a visible flash of the unfinished screen). */
(function (w) {
  if (w.__ccFrame) return;
  var q = [], pending = false, inFrame = false, rounds = 0, raf = w.requestAnimationFrame ? w.requestAnimationFrame.bind(w) : function (f) { return setTimeout(f, 16); };
  function drain() {
    if (!q.length) return;
    if (++rounds > 8) { var later = q; q = []; later.forEach(function (f) { f.__ccq = 0; }); raf(function () { later.forEach(function (f) { w.__ccFrame(f); }); }); return; }
    var list = q; q = [];
    for (var i = 0; i < list.length; i++) { list[i].__ccq = 0; try { list[i](); } catch (e) { if (w.console) console.warn('[Corner Café frame]', e); } }
  }
  var quiet = false;
  w.__ccFrame = function (f) {
    if (quiet || f.__ccq) return; f.__ccq = 1; q.push(f);
    if (inFrame) { Promise.resolve().then(drain); return; }
    if (pending) return; pending = true;
    raf(function () { pending = false; inFrame = true; rounds = 0; setTimeout(function () { inFrame = false; }, 0); drain(); });
  };
  // (31 Oct) a dropdown or small popup opening or closing changes nothing the add-ons care about: their passes skip it
  w.__ccFrame.quiet = function (fn) { quiet = true; try { return fn(); } finally { setTimeout(function () { quiet = false; }, 0); } };
})(window);
/* Corner Café Service Hub: Admin console (27 October 2026) — Step A, preview branch.
 * Settings opens on an overview: six groups, each listing its settings with the live status the app already shows
 * (read from each section's own header, so it can never disagree with the section). A search finds any setting.
 * Opening a setting shows only its group's settings as tabs, a path back to the overview, one consistent header,
 * and long explanations behind an "i". Warnings stay visible. Sections, saving, permissions and data are unchanged:
 * every row simply presses the app's own section button.
 */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccAdmin20261027) return;
  win.__ccAdmin20261027 = true;

  var I = {"globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 3a13 13 0 0 0 0 18 13 13 0 0 0 0-18M3 12h18\"/>", "cake": "<path d=\"M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8\"/><path d=\"M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1\"/><path d=\"M2 21h20M7 8v3M12 8v3M17 8v3\"/>", "cal": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "bell": "<path d=\"M10.3 21a2 2 0 0 0 3.4 0M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8\"/>", "shield": "<path d=\"M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z\"/>", "db": "<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0\"/>", "chev": "<path d=\"m6 9 6 6 6-6\"/>", "arrow": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>", "alert": "<path d=\"m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3M12 9v4M12 17h.01\"/>", "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>", "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7\"/>", "star": "<path d=\"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z\"/>", "truck": "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>", "calx": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4\"/>", "gift": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5\"/>", "layers": "<path d=\"m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>", "back": "<path d=\"m15 18-6-6 6-6\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8h.01\"/>", "trash": "<path d=\"M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14\"/>", "mail": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-9 5.7a2 2 0 0 1-2 0L2 7\"/>"};
  I.card = '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>'; I.bars = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
  I.refresh = '<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L21 15"/><path d="M21 20v-5h-5"/>';
  I.plug = '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>';
  I.chat = '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5 5 16.1A8.4 8.4 0 1 1 20.5 11.6z"/><path d="M9 9.5c.3 2.3 2.2 4.2 4.5 4.5l1-1.2 2 .8-.3 1.6c-3.9.3-8-3.8-7.7-7.7l1.6-.3.8 2z"/>';
  I.dbx = '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>';
  I.sheet = '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>';
  I.print2 = '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>';
  I.envl = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>';
  I.web = '<circle cx="12" cy="12" r="9"/><path d="M12 3a13 13 0 0 0 0 18 13 13 0 0 0 0-18M3 12h18"/>';
  I.history = '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>';
  function svg(k, c) { return I[k] ? '<svg class="cca-ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + I[k] + '</svg>' : ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  // Groups, built only from sections the app actually shows this user (permissions decide what appears)
  var GROUPS = [
    // Kazumi Service Hub format (Roneel, 28 Oct 2026): full words, grouped by job
    { k: 'ordering', t: 'Ordering and availability', ic: 'globe', s: ['Online orders', 'Notice and collection hours', 'Closed days'] },
    { k: 'menu', t: 'Menu and pricing', ic: 'cake', s: ['Cakes and prices', 'Seasonal items', 'Delivery areas', 'Payment methods'] },
    { k: 'calendar', t: 'Calendar', ic: 'cal', s: ['Occasions and special dates', 'Events and public holidays'] },
    { k: 'alerts', t: 'Alerts and communications', ic: 'bell', s: ['Order alerts', 'Kitchen printing', 'Communications'] },
    { k: 'reports', t: 'Reports', ic: 'bars', s: ['Lead-time groups'] },
    { k: 'team', t: 'People and access', ic: 'users', s: ['Team and access', 'What each level can do', 'Two-step sign-in'] },
    { k: 'data', t: 'Data and safety', ic: 'shield', s: ['Integrations', 'Settings history', 'Backup and business continuity', 'Deleted orders', 'Remove Settings entries'] }
  ];
  var KEYWORDS = {
    'Online orders': 'website pause stop accept online form', 'Notice and collection hours': 'lead time days notice pickup collection hours slots limit per day',
    'Closed days': 'closed holiday shut day off', 'Cakes and prices': 'cake price size flavour menu product', 'Seasonal items': 'festive christmas treats seasonal limited',
    'Delivery areas': 'delivery fee area zone', 'Occasions and special dates': 'occasion birthday christmas mothers day special', 'Events and public holidays': 'event public holiday calendar',
    'Order alerts': 'email alert notify new order kitchen', 'Kitchen printing': 'printer print slip kitchen paper', 'Communications': 'customer email message template',
    'Team and access': 'staff user people level role permission access login', 'Two-step sign-in': 'two step code authenticator phone security mfa 2fa', 'Backup and business continuity': 'backup google sheet restore continuity',
    'Deleted orders': 'deleted restore order', 'Integrations': 'connections connected email website printer sheet backup whatsapp database status working', 'Remove Settings entries': 'remove delete entry'
  };
  var SEC_IC = { 'Online orders': 'globe', 'Notice and collection hours': 'clock', 'Closed days': 'calx', 'Cakes and prices': 'cake', 'Seasonal items': 'gift',
    'Delivery areas': 'truck', 'Occasions and special dates': 'star', 'Events and public holidays': 'flag', 'Order alerts': 'bell', 'Kitchen printing': 'printer',
    'Communications': 'mail', 'Team and access': 'users', 'What each level can do': 'shield', 'Two-step sign-in': 'shield', 'Backup and business continuity': 'db', 'Deleted orders': 'trash', 'Remove Settings entries': 'trash' };
  // the short name used for a setting's key fact on the overview cards
  var FACT = { 'Online orders': 'Website orders', 'Notice and collection hours': 'Notice', 'Cakes and prices': 'On sale', 'Seasonal items': 'Seasonal', 'Delivery areas': 'Delivery',
    'Order alerts': 'Alerts go to', 'Team and access': 'Staff', 'Backup and business continuity': 'Backup', 'Deleted orders': 'Deleted orders' };
  var DEF_IC = { 'Order alerts': 'mail', 'Team and access': 'users', 'Deleted orders': 'trash', 'Remove Settings entries': 'trash', 'Communications': 'mail', 'Kitchen printing': 'printer' };
  // status colour by meaning
  function tone(s) {
    if (!s || /^Checking/i.test(s)) return '';
    if (/paused|failed|stopped|not taking|error/i.test(s)) return 'red';
    if (/not set up|test mode|not verified|not checked|needs|waiting|overdue|confirm/i.test(s)) return 'amber';
    if (/^(none|0\b|no )/i.test(s)) return 'grey';
    if (/taking orders|working|verified|up to date|healthy|\bon\b/i.test(s)) return 'green';
    return 'navy';
  }

  var view = 'home', q = '';
  try { var sv = sessionStorage.getItem('cca-view'); if (sv) view = sv; } catch (e) {}
  function setView(v) { view = v; try { sessionStorage.setItem('cca-view', v); } catch (e) {} }

  // the header's status is its last span; the "i" button added later must not shift it
  function lastSpan(sm) { var k = [].filter.call(sm.children, function (c) { return !c.classList.contains('cca-i'); }), l = k[k.length - 1]; return l && l.tagName === 'SPAN' ? l : null; }
  function sections(set) {
    var nav = set.querySelector(':scope > .ccs-setnav');
    var btns = nav ? [].slice.call(nav.querySelectorAll('[data-setk]')) : [];
    var dets = [].slice.call(set.querySelectorAll(':scope > details'));
    var byTitle = {};
    dets.forEach(function (d) { var sm = d.querySelector(':scope > summary'); if (!sm) return; var t = txt(sm.firstElementChild || sm), st = txt(lastSpan(sm)); var full = txt(sm); var title = (t && full.indexOf(t) === 0 && t !== st) ? t : full.replace(st, '').trim(); byTitle[title] = { d: d, status: st !== title ? st : '' }; });
    return btns.map(function (b) {
      var k = b.getAttribute('data-setk'), info = byTitle[k] || {};
      var body = info.d && info.d.querySelector('.ccs-set-body'), extra = '';
      if (body && /test mode is on/i.test(body.textContent)) extra = 'Test mode';
      var st = info.status || ''; if (/^administrators?$/i.test(st) || (st.split(' ').length > 4 && !/\d/.test(st))) st = '';
      var bic = b.querySelector('svg'); return { k: k, b: b, d: info.d, status: st, flag: extra, ic: SEC_IC[k] ? svg(SEC_IC[k]) : bic ? bic.outerHTML : svg(DEF_IC[k] || 'layers') };
    }).filter(function (s) { return s.k !== 'Remove Settings entries'; })   // retired 28 Oct 2026: off sale or archive instead
      .concat(commsRow(set, btns)).concat(virtRows()).concat(twoStepRow());
  }
  // Email templates (22 Oct) sit in the old Settings list, which this home hides: shown here as Communications,
  // opening the email templates window directly (Roneel, 27 Oct 2026 11:52 PM: "its not there")
  function commsRow(set, btns) {
    if (!set.querySelector(':scope > #et-comm') || !win.CCEmailTemplates || typeof win.CCEmailTemplates.open !== 'function') return [];
    if (btns.some(function (b) { return b.getAttribute('data-setk') === 'Communications'; })) return [];
    return [{ k: 'Communications', b: null, d: null, status: 'Email templates', flag: '', ic: svg('mail'), et: true }];
  }
  // Two-step sign-in (Release E, 28 Oct 2026): Admins only; opens the phone list from the sign-in add-on
  function twoStepRow() {
    var st = win.CCTwoStep && typeof win.CCTwoStep.state === 'function' ? win.CCTwoStep.state() : null;
    return st && st.required ? [{ k: 'Two-step sign-in', b: null, d: null, status: st.enrolled ? 'On' : 'Off', flag: '', ic: svg('shield'), ts: true }] : [];
  }
  // ---------- Settings history (Release C, 28 Oct 2026): who changed which setting, when, before and after, put back ----------
  var H = { allowed: null, entries: [], more: false, area: '', busy: false, err: null, arm: null, msg: null, areas: [] };
  function histRow() { return H.allowed ? [{ k: 'Settings history', b: null, d: null, status: '', flag: '', ic: svg('history'), hist: true }] : []; }
  function bc() { return win.__ccsBc && typeof win.__ccsBc.rpc === 'function' ? win.__ccsBc : null; }
  // ---------- Integrations (Phase 3, 28 Oct 2026): read-only, what the hub is connected to and whether each link works ----------
  // Uses the checks the system already runs (admin_ops_health, mirror_health, admin_print_settings); nothing here can change a setting.
  var INT = { allowed: null, busy: false, at: 0, oh: null, mh: null, pr: null, web: '', err: null };
  function intRow() {
    if (!INT.allowed) return [];
    var c = intCards(), bad = c.filter(function (x) { return x.tone === 'red'; }).length, warn = c.filter(function (x) { return x.tone === 'amber'; }).length;
    return [{ k: 'Integrations', b: null, d: null, status: !INT.oh ? '' : bad ? bad + ' failed' : warn ? warn + ' needs checking' : 'All working', flag: '', ic: svg('plug'), integ: true }];
  }
  function intCheck() {
    if (INT.allowed !== null || !bc()) return; INT.allowed = false;
    bc().rpc('mirror_health').then(function (r) { var d = r && r.data; if (d && d.ok) { INT.allowed = true; INT.mh = d; intLoad(); } }, function () {});
  }
  function intLoad() {
    if (!bc() || INT.busy) return; INT.busy = true; INT.err = null;
    var b = bc(), done = 0, fin = function () { if (++done === 3) { INT.busy = false; INT.at = Date.now(); schedule(); } };
    b.rpc('admin_ops_health').then(function (r) { INT.oh = r && r.data || null; if (!INT.oh) INT.err = 'Could not check. Check the internet connection.'; fin(); }, function () { INT.err = 'Could not check. Check the internet connection.'; fin(); });
    b.rpc('mirror_health').then(function (r) { var d = r && r.data; if (d && d.ok) INT.mh = d; fin(); }, fin);
    b.rpc('admin_print_settings').then(function (r) { var d = r && r.data; INT.pr = d && d.ok ? d : null; fin(); }, fin);
  }
  function ago(at) {
    var m = Math.round((Date.now() - new Date(at).getTime()) / 60000); if (!(m >= 0)) return '';
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; if (m < 24 * 60) { var h = Math.floor(m / 60), r = m % 60; return h + ' hr' + (r && h < 3 ? ' ' + r + ' min' : '') + ' ago'; } return when(at);
  }
  function webStatus() { return INT.web || ''; }   // set in render() from the Online orders section header
  function intCards() {
    var oh = INT.oh || {}, mh = INT.mh || {}, pr = INT.pr, out = [];
    out.push({ ic: 'dbx', t: 'Order database', tone: oh.database ? 'green' : INT.oh ? 'red' : '', st: oh.database ? 'Working' : INT.oh ? 'Not reachable' : 'Checking', hint: oh.checked_at ? 'Checked ' + ago(oh.checked_at) : '' });
    var ws = webStatus(), paused = /paused|stopped|not taking/i.test(ws);
    out.push({ ic: 'web', t: 'Website orders', sub: 'cornercafefiji.com', tone: paused ? 'amber' : 'green', st: paused ? 'Paused' : 'Taking orders', hint: paused ? 'Customers cannot order online' : '' });
    var failed = +mh.emails_failed || 0, waiting = +mh.emails_waiting || 0, test = pr && pr.test_mode;
    out.push({ ic: 'envl', t: 'Customer emails', sub: pr && pr.sender ? pr.sender.replace(/^.*<|>$/g, '') : '', tone: oh.email === false || failed ? 'red' : test || waiting ? 'amber' : oh.email ? 'green' : '',
      st: failed ? failed + ' not sent' : oh.email === false ? 'Not sending' : test ? 'Test mode' : waiting ? waiting + ' waiting' : oh.email ? 'Working' : 'Checking', hint: INT.mh ? (failed ? 'Failed in the last 7 days' : 'None failed in the last 7 days') : '' });
    if (pr) {
      var lt = pr.last_test, ok = pr.primary && pr.verified && !(lt && lt.status === 'failed');
      out.push({ ic: 'print2', t: 'Kitchen printing', sub: pr.primary ? 'Email to printer' : '', tone: !pr.primary ? 'grey' : lt && lt.status === 'failed' ? 'red' : ok ? 'green' : 'amber',
        st: !pr.primary ? 'Not set up' : lt && lt.status === 'failed' ? 'Test failed' : ok ? 'Working' : 'Not checked', hint: lt && lt.at ? 'Last test ' + ago(lt.at) : '' });
    }
    var ms = mh.state;
    out.push({ ic: 'sheet', t: 'Google Sheet backup', sub: mh.sheet_title || '', tone: ms === 'current' ? 'green' : ms === 'delayed' ? 'amber' : ms === 'attention' ? 'red' : ms === 'not_set_up' ? 'grey' : '',
      st: ms === 'current' ? 'Up to date' : ms === 'delayed' ? 'Delayed' : ms === 'attention' ? 'Needs attention' : ms === 'not_set_up' ? 'Not set up' : 'Checking', hint: mh.last_ack_at ? 'Copied ' + ago(mh.last_ack_at) : '', link: mh.sheet_url || '' });
    out.push({ ic: 'chat', t: 'WhatsApp', sub: '', tone: 'wa', st: 'Chat links', hint: 'Opens WhatsApp on this device' });
    return out;
  }
  function intHtml() {
    var h = '<div class="cca-hh"><h2>Integrations</h2><button type="button" class="cca-ibtn" data-cca-irefresh aria-label="Check again" title="Check again">' + svg('refresh') + '</button></div>';
    if (INT.err) h += '<p class="cca-herr" role="alert">' + esc(INT.err) + '</p>';
    h += '<div class="cca-igrid">' + intCards().map(function (c) {
      return '<div class="cca-icard"><span class="cca-iic' + (c.tone === 'wa' ? ' is-wa' : '') + '">' + svg(c.ic) + '</span><div class="cca-ix"><b>' + esc(c.t) + '</b>' + (c.sub ? '<span>' + esc(c.sub) + '</span>' : '') +
        (c.hint ? '<em>' + esc(c.hint) + '</em>' : '') + '</div><span class="cca-ist" data-tone="' + c.tone + '"><i aria-hidden="true"></i>' + esc(c.st) + '</span>' +
        (c.link ? '<a class="cca-ilink" href="' + esc(c.link) + '" target="_blank" rel="noopener" aria-label="Open the sheet" title="Open the sheet"><svg class="cca-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>' : '') + '</div>';
    }).join('') + '</div><p class="cca-vhint">Read only. ' + (INT.at ? 'Checked ' + ago(new Date(INT.at).toISOString()) + '.' : 'Checking…') + '</p>';
    return h;
  }
  function intView(main) {
    var box = main.querySelector(':scope > .cca-hist');
    if (!box) { box = doc.createElement('section'); box.className = 'cca-hist'; main.appendChild(box); }
    box.setAttribute('aria-label', 'Integrations');
    var h = '<button type="button" class="cca-back cca-hback" data-cca-home>' + svg('back') + '<span>All settings</span></button>' + intHtml();
    if (box.getAttribute('data-h') !== h) { box.innerHTML = h; box.setAttribute('data-h', h); }
  }
  // ---------- Payment methods and Lead-time groups (Release D, 28 Oct 2026) ----------
  var V2 = { setup: null, busy: false, msg: null, err: null, pay: null, bands: null, dirty: false };
  function virtRows() {
    var r = intRow().concat(histRow()); if (!H.allowed) return r;
    return r.concat([{ k: 'Payment methods', b: null, d: null, status: V2.setup ? (V2.setup.payment_methods || []).filter(function (m) { return m.active; }).length + ' on' : '', flag: '', ic: svg('card'), virt: true },
      { k: 'Lead-time groups', b: null, d: null, status: V2.setup ? (V2.setup.lead_bands || []).length + ' groups' : '', flag: '', ic: svg('bars'), virt: true }]);
  }
  function v2Load() {
    if (V2.busy || !bc()) return; V2.busy = true;
    bc().rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (r) { V2.busy = false; var d = r && r.data; if (d && d.ok) { V2.setup = d; V2.pay = null; V2.bands = null; } else V2.err = 'Could not load. Check the internet connection.'; schedule(); }, function () { V2.busy = false; V2.err = 'Could not load. Check the internet connection.'; schedule(); });
  }
  function bandLabel(lo, hi) { return hi == null ? lo + ' or more days' : lo === hi ? (lo ? lo + (lo === 1 ? ' day' : ' days') : 'Same day') : lo + ' to ' + hi + ' days'; }
  function applyLive(d) {
    try {
      var p = (d.payment_methods || []); if (p.length) { win.__ccsPayAll = p.map(function (m) { return [m.code, m.label]; }); var on = p.filter(function (m) { return m.active; }); if (on.length && win.__ccsPay) { win.__ccsPay.length = 0; on.forEach(function (m) { win.__ccsPay.push([m.code, m.label]); }); } }
      var b = (d.lead_bands || []); if (b.length && win.__ccsBands) { win.__ccsBands.length = 0; b.forEach(function (x) { var lo = +x.min, hi = x.max == null ? 9999 : +x.max; win.__ccsBands.push([hi === 9999 ? lo + '+ days' : lo === hi ? (lo ? lo + (lo === 1 ? ' day' : ' days') : 'Same day') : lo + '–' + hi + ' days', lo, hi]); }); }
    } catch (e) {}
  }
  function payHtml() {
    if (!V2.setup) return '<p class="cca-hnone">Loading…</p>';
    var list = V2.pay || (V2.setup.payment_methods || []).map(function (m) { return { code: m.code, label: m.label, active: !!m.active }; }); V2.pay = list;
    return '<div class="cca-hh"><h2>Payment methods</h2></div><p class="cca-vhint">Shown on the order and payment screens, in this order. Past payments keep their method.</p>' +
      '<ol class="cca-vlist">' + list.map(function (m, i) {
        return '<li class="cca-vrow"><span class="cca-vmove"><button type="button" data-v2pay-up="' + i + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-v2pay-down="' + i + '" aria-label="Move down"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button></span>' +
          '<input class="cca-vin" data-v2pay-label="' + i + '" maxlength="30" value="' + esc(m.label) + '" aria-label="Name">' +
          '<label class="cca-vsw"><input type="checkbox" data-v2pay-on="' + i + '"' + (m.active ? ' checked' : '') + '><span>' + (m.active ? 'On' : 'Off') + '</span></label></li>';
      }).join('') + '</ol>' + v2Foot('v2pay-save');
  }
  function bandsHtml() {
    if (!V2.setup) return '<p class="cca-hnone">Loading…</p>';
    var b = V2.bands || (V2.setup.lead_bands || []).slice(0, -1).map(function (x) { return x.max; }); V2.bands = b;
    var rows = [], lo = 0;
    b.forEach(function (hi, i) { rows.push('<li class="cca-vrow"><span class="cca-vgl">' + lo + ' to</span><input class="cca-vin cca-vnum" inputmode="numeric" maxlength="3" data-v2band="' + i + '" value="' + esc(hi) + '" aria-label="Last day of group ' + (i + 1) + '"><span class="cca-vgl">days</span>' + (b.length > 1 ? '<button type="button" class="cca-vx" data-v2band-del="' + i + '" aria-label="Remove this group">×</button>' : '') + '</li>'); lo = (+hi || 0) + 1; });
    rows.push('<li class="cca-vrow"><span class="cca-vgl">' + lo + ' or more days</span></li>');
    return '<div class="cca-hh"><h2>Lead-time groups</h2></div><p class="cca-vhint">How far ahead cakes were ordered, as grouped on every Analytics chart. Order dates never change.</p>' +
      '<ol class="cca-vlist">' + rows.join('') + '</ol>' + (b.length < 6 ? '<button type="button" class="cca-hmore" data-v2band-add>Add a group</button>' : '') + v2Foot('v2band-save');
  }
  function v2Foot(act) {
    return (V2.err ? '<p class="cca-herr" role="alert">' + esc(V2.err) + '</p>' : '') + (V2.msg ? '<p class="cca-hmsg" role="status">' + esc(V2.msg) + '</p>' : '') +
      '<div class="cca-vfoot"><button type="button" class="cca-vsave" data-' + act + '>Save</button></div>';
  }
  function v2View(main, key) {
    var box = main.querySelector(':scope > .cca-hist');
    if (!box) { box = doc.createElement('section'); box.className = 'cca-hist'; main.appendChild(box); }
    box.setAttribute('aria-label', key);
    var h = '<button type="button" class="cca-back cca-hback" data-cca-home>' + svg('back') + '<span>All settings</span></button>' + (key === 'Payment methods' ? payHtml() : bandsHtml());
    if (box.getAttribute('data-h') === h) return;
    var f = doc.activeElement, sel = null, pos = 0;
    if (f && box.contains(f)) { ['data-v2pay-label', 'data-v2band'].forEach(function (k) { if (f.hasAttribute(k)) sel = '[' + k + '="' + f.getAttribute(k) + '"]'; }); try { pos = f.selectionStart; } catch (e) {} }
    box.innerHTML = h; box.setAttribute('data-h', h);
    if (sel) { var g = box.querySelector(sel); if (g) { g.focus(); try { g.setSelectionRange(pos, pos); } catch (e) {} } }
  }
  function v2Save(kind) {
    if (!bc()) return; V2.err = null; V2.msg = null;
    var fn = kind === 'pay' ? 'settings_payment_methods_save' : 'settings_lead_bands_save', arg = kind === 'pay' ? V2.pay : V2.bands.map(function (x) { return String(x).trim(); });
    if (kind === 'bands' && arg.some(function (x) { return !/^\d{1,3}$/.test(x); })) { V2.err = 'Use whole days.'; schedule(); return; }
    bc().rpc(fn, { p: kind === 'pay' ? arg : arg.map(Number) }).then(function (r) {
      var d = r && r.data;
      if (!d || !d.ok) { V2.err = (d && d.message) || 'Nothing was saved.'; schedule(); return; }
      if (kind === 'pay') { V2.setup.payment_methods = d.payment_methods; V2.pay = null; } else { V2.setup.lead_bands = d.lead_bands; V2.bands = null; }
      applyLive(V2.setup); V2.msg = 'Saved. Shown everywhere from now on.'; schedule();
    }, function () { V2.err = 'Nothing was saved. Check the internet connection.'; schedule(); });
  }
  doc.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var i = t.getAttribute('data-v2pay-label'); if (i != null && V2.pay) { V2.pay[+i].label = t.value; V2.msg = null; return; }
    var j = t.getAttribute('data-v2band'); if (j != null && V2.bands) { V2.bands[+j] = t.value; V2.msg = null; }
  }, true);
  doc.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var i = t.getAttribute('data-v2pay-on'); if (i != null && V2.pay) { V2.pay[+i].active = t.checked; V2.msg = null; schedule(); }
    if (t.getAttribute('data-v2band') != null) schedule();
  }, true);
  function histCheck() {
    if (H.allowed !== null || !bc()) return; H.allowed = false;
    bc().rpc('settings_history', { p_limit: 1 }).then(function (r) { var d = r && r.data; H.allowed = !!(d && d.ok); if (H.allowed) schedule(); }, function () {});
  }
  function histLoad(more) {
    if (H.busy || !bc()) return; H.busy = true; H.err = null;
    var before = more && H.entries.length ? H.entries[H.entries.length - 1].id : null;
    bc().rpc('settings_history', { p_area: H.area || null, p_before: before, p_limit: 40 }).then(function (r) {
      H.busy = false; var d = r && r.data;
      if (!d || !d.ok) { H.err = (d && d.message) || 'Could not load the history. Check the internet connection.'; schedule(); return; }
      H.entries = more ? H.entries.concat(d.entries || []) : (d.entries || []); H.more = !!d.more; H.areas = d.areas || H.areas; H.loaded = true; schedule();
    }, function () { H.busy = false; H.err = 'Could not load the history. Check the internet connection.'; schedule(); });
  }
  var FIELD = { fee: 'Fee', collection_open: 'First collection', collection_close: 'Last collection', lead_days_standard: 'Notice, standard cakes (days)',
    lead_days_custom: 'Notice, custom cakes (days)', max_days_ahead: 'Furthest ahead (days)', slot_minutes: 'Time slots (minutes)', daily_capacity: 'Most cakes per day',
    accepts_online: 'Taking website orders', price: 'Price', active: 'On', is_active: 'On', featured: 'Shown on order forms', sort: 'Position', status: 'Status',
    label: 'Name', name: 'Name', title: 'Title', blurb: 'Text', link_url: 'Link', link_label: 'Link text', image_url: 'Photo', lead_days: 'Notice (days)',
    alert_email: 'Order alerts', full_name: 'Name', level_id: 'Access level', role: 'Role', value: 'Value', reason: 'Reason', day: 'Date', ends_on: 'Last day', note: 'Note',
    defaults_confirmed: 'Confirmed', occasions: 'Occasions', description: 'Description', serves_label: 'Serves', size_inch: 'Size (inch)' };
  function fieldName(k) { return FIELD[k] || (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' '); }
  function t12s(v) { var m = /^(\d{2}):(\d{2})(:\d{2})?$/.exec(v); if (!m) return null; var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function val(k, v) {
    if (v === null || v === undefined || v === '') return 'blank';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'none';
    if (typeof v === 'object') return 'changed';
    if (typeof v === 'number' && /fee|price/.test(k)) return '$' + (Math.round(v * 100) / 100);
    var s = String(v), tt = t12s(s); if (tt) return tt;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { try { return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Fiji', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s)); } catch (e) {} }
    return s.length > 80 ? s.slice(0, 78) + '…' : s;
  }
  function when(at) {
    try { var d = new Date(at), p = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Fiji', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d), o = {};
      p.forEach(function (x) { o[x.type] = x.value; }); return o.weekday + ' ' + o.day + ' ' + o.month + ', ' + o.hour + ':' + o.minute + ' ' + String(o.dayPeriod || '').toUpperCase(); } catch (e) { return ''; }
  }
  var ACT = { insert: 'Added', delete: 'Removed', staff_removed: 'Removed from the team', order_alerts_changed: 'Order alerts changed', rotated: 'New code made' };
  function histHtml() {
    var h = '<div class="cca-hh"><h2>Settings history</h2><label class="cca-hf"><span class="ccp-sr">Show</span><select data-cca-harea><option value="">All settings</option>' +
      (H.areas || []).slice().sort().map(function (a) { return '<option' + (a === H.area ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label></div>';
    if (H.msg) h += '<p class="cca-hmsg" role="status">' + esc(H.msg) + '</p>';
    if (H.err) h += '<p class="cca-herr" role="alert">' + esc(H.err) + '</p>';
    if (!H.loaded && !H.err) return h + '<p class="cca-hnone">Loading…</p>';
    if (!H.entries.length) return h + '<p class="cca-hnone">No changes recorded yet.</p>';
    h += '<ol class="cca-hlist">' + H.entries.map(function (e) {
      var ch = (e.changes || []).filter(function (c) { return !/^(updated_by|created_by|set_by|set_at|grants)$/.test(c.field); });
      var what = e.action === 'update' ? (ch.length ? ch.map(function (c) { return '<li><span>' + esc(fieldName(c.field)) + '</span> ' + esc(val(c.field, c.before)) + ' <i aria-hidden="true">→</i> <b>' + esc(val(c.field, c.after)) + '</b></li>'; }).join('') : '<li>Saved, no visible change</li>')
        : '<li>' + esc(ACT[e.action] || e.action.replace(/_/g, ' ')) + '</li>';
      var armed = H.arm === e.id;
      return '<li class="cca-he"><div class="cca-hm"><b>' + esc(e.item || e.area) + '</b><span>' + esc(e.area) + '</span></div><ul class="cca-hc">' + what + '</ul>' +
        '<div class="cca-hw"><span>' + esc(when(e.at)) + '</span><em>' + esc(e.who) + '</em>' +
        (e.can_restore && ch.length ? '<button type="button" class="cca-hb' + (armed ? ' is-armed' : '') + '" data-cca-restore="' + e.id + '">' + (armed ? 'Tap again to put back' : 'Put back') + '</button>' : '') + '</div></li>';
    }).join('') + '</ol>';
    if (H.more) h += '<button type="button" class="cca-hmore" data-cca-hmore>' + (H.busy ? 'Loading…' : 'Show earlier changes') + '</button>';
    return h;
  }
  function histView(main) {
    var box = main.querySelector(':scope > .cca-hist');
    if (!box) { box = doc.createElement('section'); box.className = 'cca-hist'; box.setAttribute('aria-label', 'Settings history'); main.appendChild(box); }
    var h = '<button type="button" class="cca-back cca-hback" data-cca-home>' + svg('back') + '<span>All settings</span></button>' + histHtml();
    if (box.getAttribute('data-h') !== h) { box.innerHTML = h; box.setAttribute('data-h', h); }
  }
  function histRestore(id) {
    if (H.arm !== id) { H.arm = id; H.msg = null; schedule(); setTimeout(function () { if (H.arm === id) { H.arm = null; schedule(); } }, 5000); return; }
    H.arm = null; if (!bc()) return;
    bc().rpc('settings_restore', { p_id: id }).then(function (r) {
      var d = r && r.data; H.msg = d && d.ok ? 'Put back. The change is in the history too.' : ((d && d.message) || 'Nothing was changed.'); histLoad(false);
    }, function () { H.msg = 'Nothing was changed. Check the internet connection.'; schedule(); });
  }
  function groupOf(k) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].s.indexOf(k) > -1) return GROUPS[i]; return { k: 'other', t: 'Other', ic: 'layers', s: [] }; }

  function rowHtml(s) {
    var st = s.flag || s.status, tn = tone(st), name = s.k === 'Remove Settings entries' ? 'Remove entries' : s.k;
    var fact = FACT[s.k] && !q;   // shown in the card's key facts instead
    return '<button type="button" class="cca-row" data-cca-open="' + esc(s.k) + '"><span class="cca-ric">' + s.ic + '</span><span class="cca-rx"><span class="cca-rt">' + esc(name) + '</span>' +
      (st && !fact && s.k !== 'Communications' && !/^Checking/i.test(st) ? '<span class="cca-st" data-tone="' + tn + '">' + esc(st) + '</span>' : '') + '</span>' + svg('chev', 'cca-go') + '</button>';
  }
  function factHtml(s) {
    var v = s.flag || s.status, tn = tone(v);
    return '<div class="cca-fact"><dt>' + esc(FACT[s.k]) + '</dt><dd>' + (/red|amber|green/.test(tn) ? '<span class="cca-st" data-tone="' + tn + '">' + esc(v) + '</span>' : esc(v)) + '</dd></div>';
  }
  function linkName(k) { return k === 'Remove Settings entries' ? 'Remove entries' : k; }
  // Kazumi's settings menu: Overview, then each group's settings, always beside the page on computers
  function menu(main, list, curKey) {
    var m = main.querySelector(':scope > .cca-menu');
    var groups = [], others = [];
    GROUPS.forEach(function (g) { var items = list.filter(function (s) { return g.s.indexOf(s.k) > -1; }); if (items.length) groups.push({ g: g, items: items }); });
    list.forEach(function (s) { if (groupOf(s.k).k === 'other') others.push(s); });
    if (others.length) groups.push({ g: { k: 'other', t: 'Other' }, items: others });
    var h = '<label class="cca-search cca-msearch">' + svg('search') + '<input type="search" placeholder="Find a setting" value="' + esc(q) + '" aria-label="Find a setting" data-cca-q></label>' +
      '<button type="button" class="cca-mi cca-mov" data-cca-home aria-current="' + (curKey === 'home' ? 'page' : 'false') + '">' + svg('layers') + '<span>Overview</span></button>' +
      groups.map(function (x) {
        return '<p class="cca-mh">' + esc(x.g.t) + '</p>' + x.items.map(function (s) {
          return '<button type="button" class="cca-mi" data-cca-open="' + esc(s.k) + '" aria-current="' + (curKey === s.k ? 'page' : 'false') + '">' + s.ic + '<span>' + esc(linkName(s.k)) + '</span></button>';
        }).join('');
      }).join('');
    if (!m) { m = doc.createElement('nav'); m.className = 'cca-menu'; m.setAttribute('aria-label', 'Settings'); var head = main.querySelector(':scope > .ccs-head'); if (head) head.after(m); else main.insertBefore(m, main.firstChild); }
    if (m.getAttribute('data-h') !== h) {
      var hadFocus = doc.activeElement && m.contains(doc.activeElement) && doc.activeElement.hasAttribute('data-cca-q'), pos = hadFocus ? doc.activeElement.selectionStart : 0;
      m.innerHTML = h; m.setAttribute('data-h', h);
      if (hadFocus) { var inp = m.querySelector('[data-cca-q]'); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
  function home(main, set, list) {
    var box = main.querySelector(':scope > .cca-home');
    var groups = [], others = [];
    GROUPS.forEach(function (g) { var items = list.filter(function (s) { return g.s.indexOf(s.k) > -1; }); if (items.length) groups.push({ g: g, items: items }); });
    list.forEach(function (s) { if (groupOf(s.k).k === 'other') others.push(s); });
    if (others.length) groups.push({ g: { k: 'other', t: 'Other', ic: 'layers' }, items: others });
    var needs = list.filter(function (s) { var t = tone(s.flag || s.status); return t === 'red' || t === 'amber'; });
    var ql = q.toLowerCase();
    var match = function (s) { return !ql || (s.k + ' ' + (KEYWORDS[s.k] || '') + ' ' + s.status).toLowerCase().indexOf(ql) > -1; };
    var h = '<div class="cca-top"><label class="cca-search">' + svg('search') + '<input type="search" placeholder="Find a setting" value="' + esc(q) + '" aria-label="Find a setting" data-cca-q></label></div>';
    if (needs.length && !ql) h += '<div class="cca-needs" role="status">' + svg('alert') + '<span>Needs attention</span>' + needs.map(function (s) { return '<button type="button" class="cca-chip" data-tone="' + tone(s.flag || s.status) + '" data-cca-open="' + esc(s.k) + '">' + esc(s.k === 'Backup and business continuity' ? 'Backup' : s.k) + ' · ' + esc(s.flag || s.status) + '</button>'; }).join('') + '</div>';
    var shown = 0;
    h += '<div class="cca-grid">' + groups.map(function (x) {
      var items = x.items.filter(match); shown += items.length; if (!items.length) return '';
      var facts = ql ? [] : items.filter(function (s) { return FACT[s.k] && (s.flag || s.status); });
      return '<section class="cca-card" data-cca-g="' + x.g.k + '"><button type="button" class="cca-ch" data-cca-open="' + esc(items[0].k) + '"><span class="cca-gic">' + svg(x.g.ic) + '</span><h2>' + esc(x.g.t) + '</h2>' + svg('chev', 'cca-go') + '</button>' +
        (facts.length ? '<dl class="cca-facts">' + facts.map(factHtml).join('') + '</dl>' : '') +
        '<div class="cca-rows">' + items.map(rowHtml).join('') + '</div></section>';
    }).join('') + '</div>';
    if (!shown) h += '<p class="cca-empty">No setting matches “' + esc(q) + '”.</p>';
    if (!box) { box = doc.createElement('div'); box.className = 'cca-home'; main.insertBefore(box, set); }
    if (box.getAttribute('data-h') !== h) {
      var hadFocus = doc.activeElement && doc.activeElement.hasAttribute && doc.activeElement.hasAttribute('data-cca-q'), pos = hadFocus ? doc.activeElement.selectionStart : 0;
      box.innerHTML = h; box.setAttribute('data-h', h);
      if (hadFocus) { var inp = box.querySelector('[data-cca-q]'); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
  function sectionBar(main, set, list, cur) {
    var g = groupOf(cur.k), mates = list.filter(function (s) { return groupOf(s.k).k === g.k; });
    var bar = main.querySelector(':scope > .cca-bar');
    var h = '<button type="button" class="cca-back" data-cca-home>' + svg('back') + '<span>All settings</span></button><nav class="cca-crumb" aria-label="Where you are"><span>' + esc(g.t) + '</span>' + svg('chev', 'cca-sep') + '<b>' + esc(cur.k === 'Remove Settings entries' ? 'Remove entries' : cur.k) + '</b></nav>' +
      (mates.length > 1 ? '<div class="cca-tabs" role="tablist">' + mates.map(function (s) { return '<button type="button" role="tab" class="cca-tab" aria-selected="' + (s.k === cur.k) + '" data-cca-open="' + esc(s.k) + '">' + s.ic + '<span>' + esc(s.k === 'Remove Settings entries' ? 'Remove entries' : s.k) + '</span></button>'; }).join('') + '</div>' : '');
    if (!bar) { bar = doc.createElement('div'); bar.className = 'cca-bar'; main.insertBefore(bar, set); }
    if (bar.getAttribute('data-h') !== h) { bar.innerHTML = h; bar.setAttribute('data-h', h); }
  }
  // long explanations behind an "i"; warnings, errors and notes that need action stay visible
  var infoOpen = {};
  function quiet(cur) {
    var d = cur.d; if (!d) return;
    var body = d.querySelector('.ccs-set-body'); if (!body) return;
    var long = [].slice.call(body.querySelectorAll('p')).filter(function (p) {
      if (p.closest('.cca-keep, [class*="warn"], [class*="alert"], [class*="err"], [class*="needs"], [role="alert"], .ccs-note') || p.querySelector('input, select, button, textarea, a')) return false;
      var w = txt(p).split(' ').length; return w >= 14 || (p.classList.contains('ccs-hint') && w >= 9);
    });
    var tg = d.querySelector(':scope > summary .cca-i');
    if (!long.length) { if (tg) tg.remove(); return; }
    var open = !!infoOpen[cur.k];
    long.forEach(function (p) { p.classList.add('cca-hidetext'); p.classList.toggle('cca-show', open); });
    if (!tg) { var sm = d.querySelector(':scope > summary'); if (sm) { sm.insertAdjacentHTML('beforeend', '<button type="button" class="cca-i" aria-expanded="false" aria-label="More about this setting">' + svg('info') + '</button>'); tg = sm.querySelector('.cca-i'); tg.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); infoOpen[view] = !infoOpen[view]; schedule(); }); } }
    if (tg) { tg.setAttribute('aria-expanded', String(open)); tg.classList.toggle('is-on', open); }
  }
  function headerTone(list) { list.forEach(function (s) { if (!s.d) return; var sm0 = s.d.querySelector(':scope > summary'), sp = sm0 && lastSpan(sm0); if (sp) { var t = tone(s.flag || s.status); if (sp.getAttribute('data-tone') !== t) sp.setAttribute('data-tone', t); sp.classList.add('cca-hst'); } }); }

  function render() {
    var main = doc.getElementById('ccs-main'); if (!main) return;
    var set = main.getAttribute('data-screen') === 'settings' && main.querySelector(':scope > .ccs-set');
    if (!set) { main.classList.remove('cca-on', 'cca-home-on', 'cca-sec-on'); var om = main.querySelector(':scope > .cca-menu'); if (om) om.remove(); return; }
    var list = sections(set); if (!list.length) return;
    main.classList.add('cca-on');
    headerTone(list);
    var wo = list.filter(function (x) { return x.k === 'Online orders'; })[0]; if (wo) INT.web = wo.flag || wo.status;
    histCheck(); intCheck();
    var integ = view === 'Integrations' && INT.allowed;
    if (integ) { main.classList.add('cca-hist-on'); main.classList.remove('cca-home-on'); main.classList.add('cca-sec-on'); if (!INT.busy && Date.now() - INT.at > 120000) intLoad(); menu(main, list, view); intView(main); return; }
    var hist = view === 'Settings history' && H.allowed;
    main.classList.toggle('cca-hist-on', !!hist);
    if (H.allowed && !V2.setup && !V2.busy) v2Load();
    var v2 = (view === 'Payment methods' || view === 'Lead-time groups') && H.allowed;
    if (v2) { main.classList.add('cca-hist-on'); main.classList.remove('cca-home-on'); main.classList.add('cca-sec-on'); if (!V2.setup && !V2.busy) v2Load(); menu(main, list, view); v2View(main, view); return; }
    if (hist) { main.classList.remove('cca-home-on'); main.classList.add('cca-sec-on'); menu(main, list, view); if (!H.loaded && !H.busy && !H.err) histLoad(false); histView(main); return; }
    var oh = main.querySelector(':scope > .cca-hist'); if (oh) oh.remove();
    var cur = list.filter(function (s) { return s.d && s.d.classList.contains('is-cur'); })[0] || list[0];
    if (view !== 'home' && cur.k !== view) { var want = list.filter(function (s) { return s.k === view; })[0]; if (want) { want.b.click(); return; } setView('home'); }
    var isHome = view === 'home';
    main.classList.toggle('cca-home-on', isHome); main.classList.toggle('cca-sec-on', !isHome);
    menu(main, list, isHome ? 'home' : cur.k);
    if (isHome) home(main, set, list); else { sectionBar(main, set, list, cur); quiet(cur); }
  }
  var queued = false;
  function schedule() { win.__ccFrame(schedRun); }
  function schedRun() { try { render(); } catch (e) { if (win.console) console.warn('[Admin console]', e); } }

  doc.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var o = t.closest('[data-cca-open]');
    if (o && o.getAttribute('data-cca-open') === 'Communications' && doc.querySelector('#cc-staff .ccs-set > #et-comm') && win.CCEmailTemplates) { e.preventDefault(); try { win.CCEmailTemplates.open(); } catch (er) {} return; }
    if (o && o.getAttribute('data-cca-open') === 'Two-step sign-in' && win.CCTwoStep) { e.preventDefault(); try { win.CCTwoStep.open(); } catch (er) {} return; }
    var rs = t.closest('[data-cca-restore]'); if (rs) { e.preventDefault(); histRestore(+rs.getAttribute('data-cca-restore')); return; }
    if (t.closest('[data-cca-hmore]')) { e.preventDefault(); histLoad(true); return; }
    if (o && (o.getAttribute('data-cca-open') === 'Payment methods' || o.getAttribute('data-cca-open') === 'Lead-time groups')) { e.preventDefault(); setView(o.getAttribute('data-cca-open')); V2.msg = null; V2.err = null; V2.pay = null; V2.bands = null; schedule(); var mv = doc.getElementById('ccs-main'); if (mv) mv.scrollTop = 0; return; }
    var pu = t.closest('[data-v2pay-up],[data-v2pay-down]'); if (pu && V2.pay) { e.preventDefault(); var ix = +(pu.getAttribute('data-v2pay-up') || pu.getAttribute('data-v2pay-down')), dn = pu.hasAttribute('data-v2pay-down'), jx = dn ? ix + 1 : ix - 1; if (jx >= 0 && jx < V2.pay.length) { var tmp = V2.pay[ix]; V2.pay[ix] = V2.pay[jx]; V2.pay[jx] = tmp; V2.msg = null; schedule(); } return; }
    if (t.closest('[data-v2pay-save]')) { e.preventDefault(); v2Save('pay'); return; }
    if (t.closest('[data-v2band-save]')) { e.preventDefault(); v2Save('bands'); return; }
    var bd = t.closest('[data-v2band-del]'); if (bd && V2.bands) { e.preventDefault(); V2.bands.splice(+bd.getAttribute('data-v2band-del'), 1); V2.msg = null; schedule(); return; }
    if (t.closest('[data-v2band-add]') && V2.bands) { e.preventDefault(); var last = +V2.bands[V2.bands.length - 1] || 0; V2.bands.push(String(last + 7)); V2.msg = null; schedule(); return; }
    if (o && o.getAttribute('data-cca-open') === 'Integrations') { e.preventDefault(); setView('Integrations'); intLoad(); schedule(); var mi = doc.getElementById('ccs-main'); if (mi) mi.scrollTop = 0; return; }
    if (t.closest('[data-cca-irefresh]')) { e.preventDefault(); intLoad(); return; }
    if (o && o.getAttribute('data-cca-open') === 'Settings history') { e.preventDefault(); setView('Settings history'); H.loaded = false; H.entries = []; H.msg = null; schedule(); var mh = doc.getElementById('ccs-main'); if (mh) mh.scrollTop = 0; return; }
    if (o) { e.preventDefault(); var k = o.getAttribute('data-cca-open'); setView(k); var b = doc.querySelector('#ccs-main .ccs-setnav [data-setk="' + (win.CSS && CSS.escape ? CSS.escape(k) : k) + '"]'); if (b) b.click(); schedule(); var m = doc.getElementById('ccs-main'); if (m) m.scrollTop = 0; return; }
    if (t.closest('[data-cca-home]')) { e.preventDefault(); setView('home'); schedule(); var m2 = doc.getElementById('ccs-main'); if (m2) m2.scrollTop = 0; return; }
    var i = t.closest('.cca-i');
    if (i) { e.preventDefault(); return; }   // handled on the button itself (other add-ons stop clicks inside the section header)
    // the sidebar Settings item always starts at the overview
    if (t.closest('#cc-staff [data-tab="settings"]')) { setView('home'); q = ''; schedule(); }
  }, true);
  doc.addEventListener('change', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-cca-harea')) { H.area = t.value; H.loaded = false; H.entries = []; histLoad(false); } });
  doc.addEventListener('input', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-cca-q')) { q = t.value; if (view !== 'home') setView('home'); schedule(); } });
  doc.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute('data-cca-q') && e.key === 'Enter') { var first = doc.querySelector('#ccs-main .cca-home .cca-row'); if (first) first.click(); }
    if (e.key === 'Escape' && view !== 'home' && doc.getElementById('ccs-main') && doc.getElementById('ccs-main').classList.contains('cca-sec-on') && !doc.querySelector('#ccs-sheet.ccs-open, .ccdd-pop')) { setView('home'); schedule(); }
  });

  // ---------- Look (scoped to the Settings screen; 4 ids beat the app's touch standard) ----------
  var S = ':root:not(#cca0) #cc-staff #ccs-main.cca-on';
  var css = [
    S + '.cca-home-on > .ccs-set{display:none!important}',
    S + '.cca-sec-on > .ccs-set > .ccs-setnav{display:none!important}',
    S + '.cca-sec-on > .ccs-set{display:block!important;grid-template-columns:none!important}',
    S + '.cca-sec-on > .ccs-set > details.is-cur{max-width:1100px;margin:0!important}',
    S + ' > .ccs-head .ccs-sub{display:none!important}',
    // overview
    S + ' .cca-top{display:flex;gap:12px;align-items:center;margin:0 0 14px}',
    S + ' .cca-search{flex:1 1 auto;max-width:520px;display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;border:1px solid #D0D5DD;border-radius:12px;background:#fff}',
    S + ' .cca-search:focus-within{border-color:#245F99;box-shadow:0 0 0 3px rgba(36,95,153,.15)}',
    S + ' .cca-search .cca-ic{width:20px;height:20px;color:#667085;flex:none}',
    S + ' .cca-search input{flex:1 1 auto;min-width:0;border:0!important;outline:0!important;background:none!important;font:inherit;font-size:17px;height:100%;padding:0!important;box-shadow:none!important;min-height:0!important}',
    S + ' .cca-needs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px;padding:10px 14px;border:1px solid #F1D29A;background:#FFFAEB;border-radius:12px;color:#8A4504;font-weight:600}',
    S + ' .cca-needs > .cca-ic{width:20px;height:20px;flex:none}',
    S + ' .cca-chip{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #E9C27F;background:#fff;color:#8A4504;font:inherit;font-size:15px;font-weight:600;cursor:pointer}',
    S + ' .cca-chip[data-tone="red"]{border-color:#F3B8B2;color:#9E1F14}',
    S + ' .cca-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:14px;align-items:start}',
    S + ' .cca-card{background:#fff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden}',
    S + ' .cca-card > header{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}',
    S + ' .cca-card h2{margin:0;font-size:17px;font-weight:600;color:#1D2939;letter-spacing:0}',
    S + ' .cca-gic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:#E8F0F8;color:#1A4570;box-shadow:inset 0 0 0 1px #B8CDE4;flex:none}',
    S + ' .cca-gic .cca-ic{width:19px;height:19px}',
    S + ' .cca-rows{display:flex;flex-direction:column;padding:0 6px 6px}',
    S + ' .cca-row{display:grid;grid-template-columns:28px minmax(0,1fr) 18px;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px;border:0;border-top:1px solid #F2F4F7;background:none;text-align:left;font:inherit;color:#1D2939;cursor:pointer;border-radius:10px}',
    S + ' .cca-rows > .cca-row:first-child{border-top-color:transparent}',
    S + ' .cca-row:hover,' + S + ' .cca-row:focus-visible{background:#F5F8FC;outline:none}',
    S + ' .cca-row:focus-visible{box-shadow:inset 0 0 0 2px #245F99}',
    S + ' .cca-ric{display:inline-flex;color:#475467}' + S + ' .cca-ric svg{width:20px;height:20px}',
    S + ' .cca-rx{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}',
    S + ' .cca-rt{font-size:16px;line-height:1.3;min-width:0}',
    S + ' .cca-go{width:18px;height:18px;color:#98A2B3;transform:rotate(-90deg)}',
    // status chips (colour by meaning)
    S + ' :is(.cca-st,.cca-hst){display:inline-flex;align-items:center;max-width:220px;min-height:26px;padding:2px 10px;border-radius:999px;font-size:14px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#F2F4F7;color:#344054;border:1px solid #E4E7EC}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="green"]{background:#E3F4EA;color:#05603A;border-color:#9ED2B3}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="amber"]{background:#FDF0D9;color:#8A4504;border-color:#E9C27F}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="red"]{background:#FDECEA;color:#9E1F14;border-color:#F3B8B2}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="navy"]{background:#E8F0F8;color:#1A4570;border-color:#B8CDE4}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="grey"]{background:#F2F4F7;color:#475467;border-color:#E4E7EC}',
    S + ' .cca-rx > .cca-st{min-height:22px;font-size:13px;padding:1px 8px;max-width:100%}',
    S + '.cca-sec-on > .cca-home,' + S + '.cca-home-on > .cca-bar{display:none!important}',
    S + ' .cca-empty{color:#475467;margin:18px 4px}',
    // section view: path back, group tabs, one consistent header
    S + ' .cca-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:0 0 14px}',
    S + ' .cca-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 8px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#1D2939;font:inherit;font-size:15px;font-weight:600;cursor:pointer}',
    S + ' .cca-back .cca-ic{width:18px;height:18px}',
    S + ' .cca-crumb{display:flex;align-items:center;gap:6px;color:#475467;font-size:15px;min-width:0}' + S + ' .cca-crumb b{color:#1D2939;font-weight:600}' + S + ' .cca-sep{width:16px;height:16px;transform:rotate(-90deg);color:#98A2B3}',
    S + ' .cca-tabs{flex:1 1 100%;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}',
    S + ' .cca-tab{display:inline-flex;align-items:center;gap:8px;flex:none;min-height:44px;padding:0 14px;border:1px solid #E4E7EC;border-radius:10px;background:#fff;color:#344054;font:inherit;font-size:15px;font-weight:500;cursor:pointer;white-space:nowrap}',
    S + ' .cca-tab svg{width:18px;height:18px}',
    S + ' .cca-tab[aria-selected="true"]{background:#E8F0F8;border-color:#8FAED3;color:#1A4570;font-weight:600}',
    S + '.cca-sec-on > .ccs-set > details.is-cur > summary{display:flex!important;align-items:center!important;gap:10px!important;font-size:20px!important;font-weight:600!important;color:#1D2939!important;padding:14px 16px!important;list-style:none!important}',
    S + '.cca-sec-on > .ccs-set > details.is-cur > summary > span.cca-hst{margin-left:auto!important}',
    S + ' .cca-i{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex:none;border:1px solid #D0D5DD;border-radius:50%;background:#fff;color:#475467;cursor:pointer;padding:0}',
    S + ' .cca-i.is-on{background:#E8F0F8;border-color:#8FAED3;color:#1A4570}' + S + ' .cca-i .cca-ic{width:18px;height:18px}',
    S + ' .cca-hidetext:not(.cca-show){display:none!important}',
    S + ' .cca-hidetext.cca-show{color:#475467!important}',
    // shown on "i" even where other add-ons hide help text (they use id-weighted selectors)
    'html:not(#cca0):not(#cca1):not(#cca2):not(#cca3) body:not(#cca4) #cc-staff #ccs-main .cca-hidetext.cca-show{display:block!important;visibility:visible!important}',
    S + ' .cca-ic{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}',
    // phones: one column, bigger rows
    '@media (max-width:759px){' + S + ' .cca-grid{grid-template-columns:1fr}' + S + ' .cca-row{min-height:56px}' + S + ' .cca-st{max-width:140px}' + S + ' .cca-crumb span{display:none}}',
    // Kazumi format: overview card header, key facts (label left, value right)
    S + ' .cca-ch{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #EAECF0;background:none;font:inherit;text-align:left;cursor:pointer;color:#1D2939}',
    S + ' .cca-ch h2{flex:1 1 auto;font-size:18px}' + S + ' .cca-ch:hover{background:#F9FAFB}' + S + ' .cca-ch:focus-visible{outline:2px solid #245F99;outline-offset:-2px}',
    S + ' .cca-card > header{display:none}',
    S + ' .cca-facts{margin:0;padding:6px 16px;border-bottom:1px solid #EAECF0}',
    S + ' .cca-fact{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:40px;border-top:1px dashed #EAECF0}' + S + ' .cca-fact:first-child{border-top:0}',
    S + ' .cca-fact dt{color:#475467;font-size:15px}' + S + ' .cca-fact dd{margin:0;color:#1D2939;font-size:15px;font-weight:500;text-align:right;min-width:0}',
    S + ' .cca-rows{padding:4px 6px 6px}' + S + ' .cca-row{min-height:48px}',
    S + ' .cca-menu{display:none}',
    // computers: the settings menu beside the page, as in Kazumi
    '@media (min-width:1100px){' +
      S + ' > *:not(.ccs-head):not(.cca-menu){margin-left:268px!important;min-width:0}' +
      S + ' > .ccs-head{padding-bottom:12px!important;margin-bottom:18px!important;border-bottom:1px solid #E4E7EC}' +
      S + ' > .cca-menu{display:flex;flex-direction:column;gap:2px;float:left;width:240px;position:sticky;top:0}' +
      S + ' .cca-msearch{height:44px;margin:0 0 10px;max-width:none}' + S + ' .cca-msearch input{font-size:15px}' +
      S + ' .cca-mh{margin:14px 12px 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#667085}' +
      S + ' .cca-mi{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:0 12px;border:1px solid transparent;border-radius:10px;background:none;color:#1D2939;font:inherit;font-size:16px;text-align:left;cursor:pointer}' +
      S + ' .cca-mi .cca-ic,' + S + ' .cca-mi svg{width:18px;height:18px;flex:none;color:#475467}' +
      S + ' .cca-mi:hover{background:#F2F4F7}' + S + ' .cca-mi:focus-visible{outline:2px solid #245F99;outline-offset:1px}' +
      S + ' .cca-mi[aria-current="page"]{background:#E8F0F8;border-color:#8FAED3;color:#1A4570;font-weight:600}' + S + ' .cca-mi[aria-current="page"] svg{color:#1A4570}' +
      S + ' .cca-mov{margin:0 0 4px}' +
      S + ' > .cca-home > .cca-top{display:none}' +
      S + '.cca-sec-on > .cca-bar{display:none!important}' +
      S + ' .cca-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))}' +
    '}',
    '@media (prefers-reduced-motion:no-preference){' + S + ' .cca-home,' + S + ' .cca-bar{animation:cca-in .16s ease-out}}@keyframes cca-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
    S + '.cca-hist-on > .ccs-set,' + S + '.cca-hist-on > .cca-home,' + S + '.cca-hist-on > .cca-bar{display:none!important}',
    S + ' .cca-igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}',
    S + ' .cca-icard{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:16px 18px;background:#fff;border:1px solid #E4E7EC;border-radius:14px;min-height:84px}',
    S + ' .cca-iic{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#EEF3F9;color:#1A4570}' + S + ' .cca-iic .cca-ic{width:22px;height:22px}' + S + ' .cca-iic.is-wa{background:#E7F8EE;color:#128C4A}',
    S + ' .cca-ix{display:flex;flex-direction:column;gap:2px;min-width:0}' + S + ' .cca-ix b{font-size:17px;font-weight:600;color:#1D2939}' + S + ' .cca-ix span{font-size:14px;color:#475467;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' + S + ' .cca-ix em{font-size:13px;font-style:italic;color:#667085}',
    S + ' .cca-ist{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:14px;font-weight:500;white-space:nowrap;background:#F2F4F7;color:#344054;border:1px solid #E4E7EC}' + S + ' .cca-ist i{width:8px;height:8px;border-radius:50%;background:currentColor}',
    S + ' .cca-ist[data-tone="green"]{background:#ECFDF3;color:#067647;border-color:#ABEFC6}' + S + ' .cca-ist[data-tone="amber"]{background:#FFFAEB;color:#B54708;border-color:#FEDF89}' + S + ' .cca-ist[data-tone="red"]{background:#FEF3F2;color:#B42318;border-color:#FECDCA}' + S + ' .cca-ist[data-tone="wa"]{background:#E7F8EE;color:#128C4A;border-color:#B5E8C9}',
    S + ' .cca-ilink{position:absolute;top:8px;right:8px;display:none}' + S + ' .cca-icard:hover .cca-ilink{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;color:#1A4570;background:#EEF3F9}' + S + ' .cca-ilink .cca-ic{width:16px;height:16px}',
    S + ' .cca-ibtn{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;border:1px solid #D0D5DD;background:#fff;color:#1A4570;cursor:pointer}' + S + ' .cca-ibtn .cca-ic{width:18px;height:18px}',
    '@media (max-width:700px){' + S + ' .cca-igrid{grid-template-columns:1fr}' + S + ' .cca-icard{grid-template-columns:auto 1fr;padding:14px}' + S + ' .cca-ist{grid-column:2;justify-self:start}}',
    S + ' .cca-hist{max-width:1100px}' + S + ' .cca-hh{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}' + S + ' .cca-hh h2{margin:0;font-size:20px;font-weight:600;color:#1D2939}',
    S + ' .cca-hf select{min-height:44px;padding:0 36px 0 12px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;font:inherit;font-size:15px;color:#1D2939}',
    S + ' .cca-hlist{list-style:none;margin:0;padding:0;background:#fff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden}',
    S + ' .cca-he{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.6fr) minmax(170px,.8fr);gap:8px 16px;align-items:start;padding:12px 16px;border-top:1px solid #F2F4F7}' + S + ' .cca-he:first-child{border-top:0}',
    S + ' .cca-hm{display:flex;flex-direction:column;gap:2px;min-width:0}' + S + ' .cca-hm b{font-weight:600;color:#1D2939;overflow-wrap:anywhere}' + S + ' .cca-hm span{font-size:13px;color:#667085}',
    S + ' .cca-hc{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:15px;color:#344054;min-width:0}' + S + ' .cca-hc span{color:#667085}' + S + ' .cca-hc b{font-weight:600;color:#1D2939}' + S + ' .cca-hc i{font-style:normal;color:#98A2B3}',
    S + ' .cca-hw{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:13px;color:#475467;text-align:right}' + S + ' .cca-hw em{font-style:italic;color:#667085}',
    S + ' .cca-hb{margin-top:6px;min-height:40px;padding:0 14px;border:1px solid #8FAED3;border-radius:10px;background:#fff;color:#1A4570;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' + S + ' .cca-hb.is-armed{background:#FDF0D9;border-color:#E9C27F;color:#8A4504}',
    S + ' .cca-hmore{margin:12px 0 0;min-height:44px;padding:0 16px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;font:inherit;font-weight:600;color:#1D2939;cursor:pointer}',
    S + ' .cca-hmsg{margin:0 0 10px;padding:10px 12px;border-radius:10px;background:#E3F4EA;color:#05603A}' + S + ' .cca-herr{margin:0 0 10px;color:#B42318}' + S + ' .cca-hnone{color:#475467;font-style:italic}',
    S + ' .cca-hback{margin:0 0 12px}',
    S + ' .cca-vhint{margin:0 0 12px;font-size:14px;font-style:italic;color:#667085}',
    S + ' .cca-vlist{list-style:none;margin:0;padding:0;background:#fff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden;max-width:640px}',
    S + ' .cca-vrow{display:flex;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid #F2F4F7;min-height:60px}' + S + ' .cca-vrow:first-child{border-top:0}',
    S + ' .cca-vin{flex:1 1 auto;min-width:0;min-height:44px;padding:0 12px;border:1px solid #D0D5DD;border-radius:10px;font:inherit;font-size:16px;color:#1D2939;background:#fff}' + S + ' .cca-vnum{flex:0 0 5.5em;text-align:center}',
    S + ' .cca-vgl{font-size:16px;color:#344054;white-space:nowrap}',
    S + ' .cca-vmove{display:inline-flex;gap:4px}' + S + ' .cca-vmove button,' + S + ' .cca-vx{width:40px;height:40px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#344054;font:inherit;font-size:16px;cursor:pointer}' + S + ' .cca-vmove button:disabled{opacity:.35;cursor:default}' + S + ' .cca-vx{margin-left:auto}',
    S + ' .cca-vsw{display:inline-flex;align-items:center;gap:8px;font-size:15px;color:#344054;cursor:pointer}' + S + ' .cca-vsw input{width:22px;height:22px;accent-color:#245F99}',
    S + ' .cca-vfoot{margin:14px 0 0}' + S + ' .cca-vsave{min-height:48px;padding:0 22px;border:0;border-radius:10px;background:#245F99;color:#fff;font:inherit;font-size:16px;font-weight:600;cursor:pointer}',
    '@media (min-width:1100px){' + S + ' .cca-hback{display:none}}',
    '@media (max-width:759px){' + S + ' .cca-he{grid-template-columns:1fr}' + S + ' .cca-hw{align-items:flex-start;text-align:left}}',
    ':root:not(#cct0) #cc-staff .cct12-src{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}',
    ':root:not(#cct0) #cc-staff .cct12{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    ':root:not(#cct0) #cc-staff .cct12-t{width:6.5em;min-height:48px;padding:0 12px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;font:inherit;font-size:17px;color:#1D2939}',
    ':root:not(#cct0) #cc-staff .cct12-t:focus{outline:none;border-color:#245F99;box-shadow:0 0 0 3px rgba(36,95,153,.15)}',
    ':root:not(#cct0) #cc-staff .cct12.is-bad .cct12-t{border-color:#D92D20}',
    ':root:not(#cct0) #cc-staff .cct12-ap{display:inline-flex;border:1px solid #D0D5DD;border-radius:10px;overflow:hidden}',
    ':root:not(#cct0) #cc-staff .cct12-ap button{min-width:54px;min-height:46px;border:0;background:#fff;color:#344054;font:inherit;font-size:16px;cursor:pointer}',
    ':root:not(#cct0) #cc-staff .cct12-ap button[aria-pressed=true]{background:#E8F0F8;color:#1A4570;font-weight:600;box-shadow:inset 0 0 0 1px #8FAED3}',
    ':root:not(#cct0) #cc-staff .cct12-err{flex-basis:100%;font-size:14px;font-style:italic;color:#B42318}'
  ].join('\n');
  function styles() { if (doc.getElementById('cca-style')) return; var s = doc.createElement('style'); s.id = 'cca-style'; s.textContent = css; doc.head.appendChild(s); }
  // ---------- 12-hour time fields (Settings audit, Release B, 28 Oct 2026) ----------
  // The device time box (which can show 24-hour time) in Settings > Notice and collection hours, and the long list of
  // every slot in Change order, become one field: type the time (8, 8:30 or 830), tap AM or PM. The app's own field
  // stays in the page, hidden, and is what is saved, so nothing about saving changes.
  var T12 = '#st-open, #st-close, #am-time';
  function to12(v) { var m = /^(\d{1,2}):(\d{2})/.exec(v || ''); if (!m) return { t: '', pm: false }; var h = +m[1]; return { t: ((h % 12) || 12) + ':' + m[2], pm: h >= 12 }; }
  function parse12(txt, pm) {
    var s = String(txt || '').replace(/\s+/g, '').replace(/[.]/g, ':'), m = /^(\d{1,2})(?::?(\d{2}))?$/.exec(s); if (!m) return null;
    var h = +m[1], mi = m[2] == null ? 0 : +m[2]; if (h < 1 || h > 12 || mi > 59) return null;
    h = h % 12 + (pm ? 12 : 0); return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }
  function fire(el) { ['input', 'change'].forEach(function (k) { el.dispatchEvent(new Event(k, { bubbles: true })); }); }
  function time12() {
    [].forEach.call(doc.querySelectorAll('#cc-staff ' + T12.split(', ').join(', #cc-staff ')), function (src) {
      if (src.__t12 && src.__t12.isConnected) return;
      var isSel = src.tagName === 'SELECT', cur = to12(src.value);
      var w = doc.createElement('span'); w.className = 'cct12'; w.setAttribute('role', 'group');
      var lab = src.id && doc.querySelector('label[for="' + src.id + '"]'); w.setAttribute('aria-label', lab ? txt(lab) : 'Time');
      w.innerHTML = '<input type="text" inputmode="numeric" autocomplete="off" class="cct12-t" maxlength="5" placeholder="8:00" aria-label="' + esc(lab ? txt(lab) : 'Time') + '">' +
        '<span class="cct12-ap"><button type="button" data-ap="am">AM</button><button type="button" data-ap="pm">PM</button></span>' +
        '<em class="cct12-err" hidden></em>';
      var inp = w.querySelector('.cct12-t'), pm = cur.pm; inp.value = cur.t;
      function paint() { [].forEach.call(w.querySelectorAll('[data-ap]'), function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-ap') === 'pm') === pm)); }); }
      function commit() {
        var v = parse12(inp.value, pm), err = w.querySelector('.cct12-err'), msg = '';
        if (!v) msg = inp.value.trim() ? 'Type a time like 8:30' : '';
        else if (isSel && ![].some.call(src.options, function (o) { return o.value === v; })) {
          var opts = [].map.call(src.options, function (o) { return o.value; }).filter(Boolean);
          msg = opts.length ? 'Collection times run ' + t12txt(opts[0]) + ' to ' + t12txt(opts[opts.length - 1]) + ', on the hour or slot' : 'Not a collection time';
        }
        err.textContent = msg; err.hidden = !msg; w.classList.toggle('is-bad', !!msg);
        if (v && !msg && src.value !== v) { src.value = v; fire(src); }
      }
      function t12txt(v) { var x = to12(v); return x.t + ' ' + (x.pm ? 'PM' : 'AM'); }
      paint();
      inp.addEventListener('input', commit); inp.addEventListener('blur', function () { var v = parse12(inp.value, pm); if (v) inp.value = to12(v).t; });
      w.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ap]'); if (!b) return; e.preventDefault(); pm = b.getAttribute('data-ap') === 'pm'; paint(); commit(); });
      src.classList.add('cct12-src'); src.setAttribute('tabindex', '-1'); src.setAttribute('aria-hidden', 'true');
      src.after(w); src.__t12 = w;
    });
  }
  function start() { styles(); var t12run = function () { try { time12(); } catch (e) {} }, mo12 = new MutationObserver(function () { win.__ccFrame(t12run); }); mo12.observe(doc.body, { childList: true, subtree: true }); var mo = new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var r = m[i], n = r.target; if (n && n.closest && n.closest('.cca-home, .cca-bar, .cca-i, .cca-menu, .cca-hist')) continue; if (r.type === 'attributes' && (n.id === 'ccs-main' && r.attributeName === 'class' || n.classList && (n.classList.contains('cca-hst') || n.classList.contains('cca-hidetext')))) continue; schedule(); return; } }); mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'data-screen'] }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
