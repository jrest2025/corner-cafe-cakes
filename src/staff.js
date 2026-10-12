/* Corner Café Cakes — staff app (Stage 1). Needs supabase-js v2 loaded first. Mounts into <div id="cc-staff">. */
(function () {
  'use strict';
  var SB_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co';
  var SB_KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var TZ = 'Pacific/Fiji';
  var root = document.getElementById('cc-staff');
  if (!root) return;
  var sb = window.__ccsMock || window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff' } });

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n || 0); return '$' + (n % 1 ? n.toFixed(2) : n.toFixed(0)); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(iso, long) { if (!iso) return ''; return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function dayLabel(iso) { var t = today(); if (iso === t) return 'Today'; if (iso === addDays(t, 1)) return 'Tomorrow'; return nice(iso, true); }
  function t12(t) { if (!t) return ''; var p = String(t).slice(0, 5).split(':').map(Number); return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2, '0') + (p[0] < 12 ? 'am' : 'pm'); }
  function stamp(ts) { var d = new Date(ts); return d.toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function waLink(phone) { var d = digits(phone); if (d.length === 7) d = '679' + d; return 'https://wa.me/' + d; }
  function cakeLine(i) { if (!i) return 'Cake'; return (i.variant || i.product_name) + ', ' + i.size_inch + ' inch' + (i.quantity > 1 ? ' × ' + i.quantity : ''); }
  function firstItem(o) { return (o.order_items && o.order_items[0]) || null; }
  function $(s) { return root.querySelector(s); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  var STATUS = {
    awaiting_review: ['Needs review', 'review'], awaiting_quote: ['Needs a quote', 'review'], awaiting_approval: ['Waiting for customer', 'wait'],
    awaiting_deposit: ['Waiting for deposit', 'wait'], confirmed: ['Confirmed', 'confirmed'], completed: ['Collected', 'done'],
    declined: ['Declined', 'off'], cancelled: ['Cancelled', 'off']
  };
  var PAY = { unpaid: 'Unpaid', deposit_paid: 'Part paid', paid: 'Paid', refunded: 'Refunded' };
  var SOURCES = [['walk_in', 'Walk-in'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['social', 'Social media'], ['corporate', 'Corporate']];
  var SOURCE_LABEL = { online: 'Online', walk_in: 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp', social: 'Social media', corporate: 'Corporate' };
  var ROLES = [['admin', 'Admin'], ['manager', 'Manager'], ['front_of_house', 'Front of house'], ['kitchen', 'Kitchen'], ['finance', 'Finance'], ['marketing', 'Marketing']];
  var OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Baby shower', 'Graduation', 'Office', 'Other'];
  var DIETS = ['Vegetarian (eggless)', 'Gluten-free', 'Nut allergy', 'Other'];
  var NEEDS = ['awaiting_review', 'awaiting_quote', 'awaiting_deposit'];
  var OPEN = ['awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit', 'confirmed'];
  function statusLabel(status, method) { if (status === 'completed' && method === 'delivery') return 'Delivered'; return (STATUS[status] || [status])[0]; }
  function pill(status, method) { var s = STATUS[status] || [status, 'off']; return '<span class="ccs-pill st s-' + s[1] + '">' + esc(statusLabel(status, method)) + '</span>'; }
  // Payment is a separate fact from order status: white, outlined, with a $ sign
  function payPill(ps) { var c = { unpaid: 'p-unpaid', deposit_paid: 'p-part', paid: 'p-paid', refunded: 'p-refunded' }[ps]; return c ? '<span class="ccs-pay ' + c + '">' + esc(PAY[ps]) + '</span>' : ''; }
  var STAGES = [['not_started', 'Not started'], ['scheduled', 'Scheduled'], ['preparing', 'Preparing'], ['baking', 'Baking'], ['assembling', 'Cooling and assembly'], ['decorating', 'Decorating'], ['quality_check', 'Quality check'], ['ready', 'Ready']];
  var STAGE_LABEL = {}; STAGES.forEach(function (s) { STAGE_LABEL[s[0]] = s[1]; }); STAGE_LABEL.in_production = 'In production';
  function stageIndex(s) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i][0] === s) return i; return 0; }
  function stagePill(s) { var tone = s === 'ready' ? 'ready' : (s === 'not_started' || s === 'scheduled') ? 'idle' : 'prep'; return '<span class="ccs-pill st s-' + tone + '">Kitchen: ' + (s === 'not_started' ? 'not started' : esc((STAGE_LABEL[s] || s).toLowerCase())) + '</span>'; }
  function whenLabel(iso) { var t = today(); return iso === t ? 'Today' : iso === addDays(t, 1) ? 'Tomorrow' : nice(iso); }

  // ---------- state ----------
  var S = { me: null, setup: null, tab: 'today', day: null, filter: 'action', q: '', orders: [], loaded: false,
    sheet: null, panel: null, panelErr: null, busy: false,
    cust: { seg: 'all', q: '', rows: [], loaded: false }, settings: null, team: null,
    kit: { days: 2, data: null, loaded: false }, ful: null, dirty: {}, busyBtn: null };
  function can() { if (!S.me) return false; if (S.me.role === 'admin') return true; for (var i = 0; i < arguments.length; i++) if (S.me.role === arguments[i]) return true; return false; }

  var toastTimer;
  function toast(msg, bad) {
    clearBusy();
    var t = document.getElementById('ccs-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ccs-toast'; t.setAttribute('role', 'status'); root.appendChild(t); }
    t.className = 'ccs-toast' + (bad ? ' ccs-bad' : ''); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 7000 : 3200);
  }
  // Plain-language errors (U9). Technical detail goes to the console only.
  function errKind(e) {
    var m = String((e && (e.message || e.error_description || e.msg)) || e || ''), code = e && (e.code || e.status);
    if (!navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i.test(m)) return 'offline';
    if (code === 'PGRST301' || code === 401 || /jwt|token is expired|invalid claim|not authenticated|refresh token/i.test(m)) return 'expired';
    if (code === '42501' || /permission denied|not allowed/i.test(m)) return 'denied';
    return 'other';
  }
  function fail(e) {
    console.error(e); clearBusy();
    var k = errKind(e);
    if (k === 'expired') return sessionExpired();
    toast(k === 'offline' ? 'No internet connection. Nothing was saved. Check the Wi-Fi and try again.' :
      k === 'denied' ? 'Your login is not allowed to do that. Ask a manager.' :
      'Something went wrong and it was not saved. Try again. If it keeps happening, tell a manager.', true);
  }
  function sessionExpired() {
    saveDraft();
    S.me = null; sheetClose();
    loginView('Your sign-in has expired. Sign in again to carry on.' + (draftHasContent() ? ' The order you were taking is kept.' : ''));
  }
  // "Saving" state on the tapped button (U10)
  function markBusy(b, label) {
    clearBusy(); if (!b) return;
    b.dataset.label = b.innerHTML; b.disabled = true; b.classList.add('is-busy'); b.setAttribute('aria-busy', 'true');
    b.textContent = label || 'Saving…'; S.busyBtn = b; setTimeout(function () { if (S.busyBtn === b) clearBusy(); }, 20000);
  }
  function clearBusy() {
    var b = S && S.busyBtn; if (S) S.busyBtn = null;
    if (b && b.isConnected && b.dataset.label != null) { b.innerHTML = b.dataset.label; b.disabled = false; b.classList.remove('is-busy'); b.removeAttribute('aria-busy'); delete b.dataset.label; }
  }
  // Offline banner (U9)
  function netBanner() {
    var n = document.getElementById('ccs-offline');
    if (navigator.onLine) { if (n) n.remove(); return; }
    if (!n) { n = document.createElement('div'); n.id = 'ccs-offline'; n.className = 'ccs-offline'; n.setAttribute('role', 'alert'); n.textContent = 'No internet connection. Changes will not save until it is back.'; root.insertBefore(n, root.firstChild); }
  }
  window.addEventListener('offline', netBanner);
  window.addEventListener('online', function () { netBanner(); if (S.me) { toast('Back online'); tick(); } });

  // ---------- boot ----------
  var NAV_ICON = {
    today: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z"/></svg>',
    new: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    kitchen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2zm2-10h12V9a1 1 0 0 0-1-1h-4V5h-2v3H7a1 1 0 0 0-1 1zm5-7.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/></svg>',
    customers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6zm15 0c0-1.9-.7-3.6-1.9-4.9.6-.1 1.2-.1 1.9-.1 2.8 0 5 1.8 5 5z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M7 2h2v2h6V2h2v2h3v18H4V4h3zM6 10v10h12V10zm0-4v2h12V6zm2 6h3v3H8z"/></svg>',
    register: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zm2 2v14h10V5zm2 2h6v2H9zm0 4h6v2H9zm0 4h4v2H9z"/></svg>',
    dash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10h3v10zm6.5 0V4h3v16zM17 20v-7h3v7z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1c.5.4 1.1.7 1.7 1l.4 2.7h4l.4-2.7c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>'
  };
  function navTabs() {
    if (S.me && S.me.role === 'kitchen') return [['kitchen', 'Kitchen']];
    var tabs = [['today', 'Today'], ['orders', 'Orders'], ['calendar', 'Calendar']];
    if (can('manager', 'front_of_house')) tabs.push(['kitchen', 'Kitchen']);
    if (can('manager', 'front_of_house')) tabs.push(['new', 'New order']);
    if (can('marketing')) tabs.push(['dash', 'Dashboard']);
    if (can('manager')) tabs.push(['register', 'Register']);
    if (can('manager', 'front_of_house', 'finance', 'marketing')) tabs.push(['customers', 'Customers']);
    if (can('manager')) tabs.push(['settings', 'Settings']);
    tabs.push(['more', 'More']);
    return tabs;
  }
  function needsCount() { return S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length; }
  function navHtml() {
    var needs = needsCount();
    // On phones, Customers and Settings move under More so the bottom bar keeps 5 large tabs (U15)
    return navTabs().map(function (t) {
      var where = t[0] === 'more' ? ' ccs-nav-phone' : (t[0] === 'customers' || t[0] === 'settings' || t[0] === 'kitchen' || t[0] === 'dash' || t[0] === 'register') ? ' ccs-nav-wide' : '';
      return '<button type="button" class="ccs-nav-item' + (t[0] === 'new' ? ' ccs-nav-new' : '') + where + '" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + NAV_ICON[t[0]] + '<span>' + t[1] + '</span>' +
        (t[0] === 'orders' && needs ? '<span class="ccs-count">' + needs + '</span>' : '') + '</button>';
    }).join('');
  }
  function shell() {
    root.innerHTML =
      '<div class="ccs-app' + (S.me.role === 'kitchen' ? ' is-single' : '') + '"><aside class="ccs-side"><div class="ccs-brand">Corner Café<small>Cakes</small></div>' +
      '<nav class="ccs-nav" aria-label="Sections">' + navHtml() + '</nav>' +
      '<div class="ccs-who"><span class="ccs-avatar" aria-hidden="true">' + esc((S.me.full_name || '?').trim().charAt(0).toUpperCase()) + '</span><span class="ccs-who-name">' + esc(S.me.full_name) + '<small>' + esc((ROLES.filter(function (r) { return r[0] === S.me.role; })[0] || ['', ''])[1]) + '</small></span><button type="button" class="ccs-signout" data-act="signout">Sign out</button></div></aside>' +
      '<main class="ccs-main" id="ccs-main"></main></div>' +
      '<div class="ccs-shade" id="ccs-shade"></div><aside class="ccs-sheet" id="ccs-sheet" role="dialog" aria-modal="true" aria-label="Details"></aside>';
    view(); netBanner();
    try { if (!history.state || !history.state.ccs) history.replaceState({ ccs: 'tab', tab: S.tab }, ''); } catch (x) {}
  }
  function refreshNav() { var n = root.querySelector('.ccs-nav'); if (n) n.innerHTML = navHtml(); }
  function captureFocus(scope) { var a = document.activeElement; if (!a || !a.id || !scope || !scope.contains(a)) return null; var f = { id: a.id }; try { f.s = a.selectionStart; f.e = a.selectionEnd; } catch (x) {} return f; }
  function restoreFocus(f) { if (!f) return false; var el = document.getElementById(f.id); if (!el) return false; try { el.focus({ preventScroll: true }); if (f.s != null) el.setSelectionRange(f.s, f.e); } catch (x) {} return true; }
  function hasTyping() { for (var k in S.dirty) if (String(S.dirty[k] || '').trim()) return true; return false; }
  // First tap warns, second tap within 5 seconds goes ahead.
  function confirmDiscard(b, msg) {
    if (b.dataset.armed === '1') return true;
    b.dataset.armed = '1'; clearBusy();
    if (b.dataset.act !== 'close') { b.dataset.was = b.textContent; b.textContent = 'Tap again to discard changes'; }
    toast(msg || 'You have unsaved changes. Tap again to discard them.', true);
    setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; if (b.dataset.was) b.textContent = b.dataset.was; } }, 5000);
    return false;
  }
  window.addEventListener('beforeunload', function (e) { if (S.me && S.sheet && hasTyping()) { e.preventDefault(); e.returnValue = ''; } });
  function view() {
    var m = document.getElementById('ccs-main'); if (!m) return;
    var keepFocus = captureFocus(m);
    viewInner(m); restoreFocus(keepFocus); saveDraft();
  }
  function viewInner(m) {
    if (S.tab === 'today') m.innerHTML = todayView();
    else if (S.tab === 'orders') m.innerHTML = ordersView();
    else if (S.tab === 'new') m.innerHTML = newView();
    else if (S.tab === 'customers') m.innerHTML = customersView();
    else if (S.tab === 'settings') m.innerHTML = settingsView();
    else if (S.tab === 'dash') m.innerHTML = dashView();
    else if (S.tab === 'register') m.innerHTML = regView();
    else if (S.tab === 'kitchen') m.innerHTML = kitchenView();
    else if (S.tab === 'calendar') m.innerHTML = calendarView();
  }
  function loginView(err) {
    root.innerHTML = '<form class="ccs-login" id="ccs-login"><div class="ccs-brand" style="color:var(--ccs-esp)">Corner Café Cakes</div>' +
      '<h1 class="ccs-title">Staff sign in</h1>' +
      '<div class="ccs-field"><label class="ccs-label" for="ccs-email">Email</label><input class="ccs-input" id="ccs-email" type="email" autocomplete="username" required></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="ccs-pass">Password</label><input class="ccs-input" id="ccs-pass" type="password" autocomplete="current-password" required></div>' +
      (err ? '<p class="ccs-err">' + esc(err) + '</p>' : '') +
      '<button class="ccs-btn ccs-wide" type="submit">Sign in</button><p class="ccs-hint">Forgotten your password? Ask your manager to reset it.</p></form>';
    netBanner();
  }
  // ---------- own password ----------
  function pwFields(err) {
    return '<div class="ccs-field"><label class="ccs-label" for="ccs-pw1">New password</label><input class="ccs-input" id="ccs-pw1" type="password" autocomplete="new-password" required></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="ccs-pw2">Type it again</label><input class="ccs-input" id="ccs-pw2" type="password" autocomplete="new-password" required></div>' +
      '<p class="ccs-hint">At least 10 characters. Only you will know it.</p>' + (err ? '<p class="ccs-err" role="alert">' + esc(err) + '</p>' : '') +
      '<button class="ccs-btn ccs-wide" type="submit">Save my password</button>';
  }
  function passwordView(first, err) {
    S.pwFirst = !!first;
    root.innerHTML = '<form class="ccs-login" id="ccs-pw"><div class="ccs-brand" style="color:var(--ccs-esp)">Corner Café Cakes</div>' +
      '<h1 class="ccs-title">Choose your password</h1><p class="ccs-hint">Welcome' + (S.me && S.me.full_name ? ', ' + esc(S.me.full_name.split(' ')[0]) : '') + '. You signed in with a temporary password. Choose your own to carry on.</p>' + pwFields(err) + '</form>';
    var f = document.getElementById('ccs-pw1'); if (f) f.focus();
  }
  function savePassword(form) {
    var p1 = val('ccs-pw1'), p2 = val('ccs-pw2');
    var bad = p1.length < 10 ? 'Use at least 10 characters.' : p1 !== p2 ? 'The two passwords do not match.' : null;
    var inSheet = !!(S.sheet && S.sheet.type === 'pw');
    var show = function (m) { if (inSheet) { S.pwErr = m; S.dirty = {}; renderSheet(); } else passwordView(true, m); };
    if (bad) return show(bad);
    var btn = form.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    sb.auth.updateUser({ password: p1, data: { must_change_password: false } }).then(function (r) {
      if (r.error) return show(/different/i.test(r.error.message) ? 'Choose a password different from the temporary one.' : r.error.message);
      if (inSheet) { S.dirty = {}; sheetClose(); toast('Password changed'); } else { toast('Password saved'); boot(); }
    }).catch(function (e) { if (errKind(e) === 'expired') return sessionExpired(); show('Could not connect. Nothing was changed. Try again.'); });
  }

  function boot() {
    root.innerHTML = '<p class="ccs-loading" style="padding:40px">Loading…</p>';
    sb.auth.getSession().then(function (r) {
      var sess = r.data && r.data.session;
      if (!sess) return loginView();
      return sb.from('staff_profiles').select('*').eq('user_id', sess.user.id).maybeSingle().then(function (p) {
        if (p.error) throw p.error;
        if (!p.data || !p.data.active) { sb.auth.signOut(); return loginView('This login has not been given access yet. Ask an admin to add you to the team.'); }
        S.me = p.data;
        if (sess.user.user_metadata && sess.user.user_metadata.must_change_password) return passwordView(true);
        return sb.rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (s) {
          if (s.error) throw s.error; S.setup = s.data;
          loadDraft();
          S.tab = S.me.role === 'kitchen' || location.hash === '#kitchen' ? 'kitchen' : location.hash === '#new' && can('manager', 'front_of_house') ? 'new' : 'today';
          shell();
          if (S.tab === 'kitchen') loadKitchen(); else loadOrders();
        });
      });
    }).catch(function (e) { fail(e); loginView('Could not connect. Check the internet connection and refresh.'); });
  }

  // ---------- orders ----------
  var ORDER_LIST = 'id,reference,revision,order_status,payment_status,production_status,fulfilment_method,delivery_zone,order_type,source,required_date,required_time,estimate_total,final_total,deposit_required,has_dietary,rush_override,created_at,contact_name,contact_phone,contact_email,customers(full_name,phone),order_items(product_name,variant,size_inch,quantity,finish,occasion)';
  // Each order keeps its own contact details. Show those, and keep the profile for the link and comparison.
  function withContact(r) {
    var rows = r && r.data ? (Array.isArray(r.data) ? r.data : [r.data]) : [];
    rows.forEach(function (o) {
      if (!o || !o.contact_name || o.profile !== undefined) return;
      o.profile = o.customers || null;
      o.customers = Object.assign({}, o.customers || {}, { full_name: o.contact_name, phone: o.contact_phone || '', email: o.contact_email || null });
    });
    return r;
  }
  function loadOrders(silent) {
    var from = addDays(today(), -45);
    return sb.from('orders').select(ORDER_LIST).or('required_date.gte.' + from + ',order_status.in.(' + NEEDS.join(',') + ')')
      .order('required_date', { ascending: true }).order('required_time', { ascending: true }).limit(400)
      .then(withContact).then(function (r) {
        if (r.error) throw r.error;
        var before = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length;
        S.orders = r.data || []; S.loaded = true;
        var after = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length;
        if (silent && after > before) toast('New order waiting for review');
        refreshNav();
        if (S.tab === 'orders' || S.tab === 'today') view();
      }).catch(function (e) { if (!silent) fail(e); });
  }
  // Orders search also looks on the server for older orders (U3)
  var olderTimer;
  function searchOlder(q) {
    clearTimeout(olderTimer); q = q.trim();
    if (q.length < 3) { S.older = null; return; }
    S.older = { q: q, loading: true, rows: [] };
    olderTimer = setTimeout(function () {
      var safe = q.replace(/[%_,()*]/g, ' ').trim();
      var byRef = sb.from('orders').select(ORDER_LIST).ilike('reference', '%' + safe + '%').order('required_date', { ascending: false }).limit(20).then(withContact);
      var byCust = sb.rpc('staff_search_customers', { q: q });
      Promise.all([byRef, byCust]).then(function (rs) {
        if (rs[0].error) throw rs[0].error; if (rs[1].error) throw rs[1].error;
        var ids = (rs[1].data || []).map(function (c) { return c.id; });
        var more = ids.length ? sb.from('orders').select(ORDER_LIST).in('customer_id', ids).order('required_date', { ascending: false }).limit(40).then(withContact) : Promise.resolve({ data: [] });
        return more.then(function (r2) {
          if (r2.error) throw r2.error;
          if (!S.older || S.older.q !== q) return;
          var have = {}; S.orders.forEach(function (o) { have[o.id] = 1; });
          var rows = [].concat(rs[0].data || [], r2.data || []).filter(function (o) { if (have[o.id]) return false; have[o.id] = 1; return true; })
            .sort(function (a, b) { return a.required_date < b.required_date ? 1 : -1; });
          S.older = { q: q, loading: false, rows: rows };
          if (S.tab === 'orders') view();
        });
      }).catch(function (e) { if (S.older && S.older.q === q) S.older = { q: q, loading: false, rows: [], failed: true }; if (S.tab === 'orders') view(); console.error(e); });
    }, 400);
  }
  function olderHtml() {
    var O = S.older; if (!S.q.trim() || !O || O.q !== S.q.trim()) return '';
    if (O.loading) return '<p class="ccs-day">Older orders</p><p class="ccs-loading">Searching older orders…</p>';
    if (O.failed) return '<p class="ccs-day">Older orders</p><p class="ccs-hint">Could not search older orders. Check the connection and type again.</p>';
    if (!O.rows.length) return '';
    return '<p class="ccs-day">Older orders</p><div class="ccs-list">' + O.rows.map(orderCard).join('') + '</div>';
  }
  function filtered() {
    var t = today(), q = S.q.trim().toLowerCase(), qd = digits(q);
    return S.orders.filter(function (o) {
      if (q) {
        var c = o.customers || {}, hit = (o.reference || '').toLowerCase().indexOf(q) > -1 || (c.full_name || '').toLowerCase().indexOf(q) > -1 || (qd.length >= 3 && digits(c.phone).indexOf(qd) > -1);
        return hit;
      }
      if (S.filter === 'action') return NEEDS.indexOf(o.order_status) > -1;
      if (S.filter === 'today') return o.required_date === t && OPEN.concat(['completed']).indexOf(o.order_status) > -1;
      if (S.filter === 'upcoming') return o.required_date >= t && OPEN.indexOf(o.order_status) > -1;
      if (S.filter === 'deposit') return o.order_status === 'awaiting_deposit' || (o.order_status === 'confirmed' && o.payment_status !== 'paid' && o.required_date >= t);
      if (S.filter === 'day') return o.required_date === S.day && OPEN.concat(['completed']).indexOf(o.order_status) > -1;
      return true;
    }).sort(function (a, b) {
      if (S.filter === 'recent' && !q) return a.required_date < b.required_date ? 1 : -1;
      return (a.required_date + a.required_time) < (b.required_date + b.required_time) ? -1 : 1;
    });
  }
  function orderCard(o) {
    var i = firstItem(o), c = o.customers, st = STATUS[o.order_status] || ['', 'off'];
    var tags = pill(o.order_status, o.fulfilment_method);
    if (o.has_dietary) tags += '<span class="ccs-pill s-alert">Dietary</span>';
    if (o.order_type === 'custom') tags += '<span class="ccs-tag">Custom</span>';
    if (o.rush_override) tags += '<span class="ccs-pill s-alert">Short notice</span>';
    if (o.revision) tags += '<span class="ccs-pill s-amend">Amended</span>';
    if (o.order_status === 'confirmed' || o.order_status === 'completed') tags += payPill(o.payment_status);
    if (o.order_status === 'confirmed') tags += stagePill(o.production_status);
    if (o.fulfilment_method === 'delivery') tags += '<span class="ccs-tag">Delivery' + (o.delivery_zone ? ', ' + esc(o.delivery_zone) : '') + '</span>';
    return '<button type="button" class="ccs-card k-' + st[1] + '" data-act="open-order" data-id="' + o.id + '">' +
      '<span class="ccs-when"><b>' + esc(nice(o.required_date) + (String(o.required_date).slice(0, 4) !== today().slice(0, 4) ? ' ' + String(o.required_date).slice(0, 4) : '')) + '</b><span>' + esc(t12(o.required_time)) + '</span></span>' +
      '<span class="ccs-what"><b>' + esc(cakeLine(i)) + '</b><span class="ccs-meta">' + esc(c ? c.full_name : 'Customer details hidden') + ' · ' + esc(o.reference) + ' · ' + esc(SOURCE_LABEL[o.source]) + '</span><span class="ccs-tags">' + tags + '</span></span>' +
      '<span class="ccs-price">' + money(o.final_total != null ? o.final_total : o.estimate_total) + '<small>' + (o.final_total != null ? 'agreed' : (o.order_type === 'custom' ? 'from' : 'price')) + '</small></span></button>';
  }
  function ordersView() {
    var t = today(), counts = {
      action: S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length,
      today: S.orders.filter(function (o) { return o.required_date === t && OPEN.concat(['completed']).indexOf(o.order_status) > -1; }).length,
      upcoming: S.orders.filter(function (o) { return o.required_date >= t && OPEN.indexOf(o.order_status) > -1; }).length
    };
    var chips = [['action', 'Needs action', counts.action], ['today', 'Today', counts.today], ['upcoming', 'Upcoming', counts.upcoming], ['deposit', 'Money owing', null], ['recent', 'All recent', null]];
    if (S.filter === 'day' && S.day) chips.push(['day', dayLabel(S.day), null]);
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Cake orders</h1><p class="ccs-sub">' + esc(nice(t, true)) + '</p></div>' +
      '<input class="ccs-input ccs-search" id="ccs-q" type="search" placeholder="Search name, mobile or CC-number" value="' + esc(S.q) + '"></div>' +
      '<div class="ccs-tabs" role="group" aria-label="Filter">' + chips.map(function (c) { return '<button type="button" class="ccs-tab" data-act="filter" data-v="' + c[0] + '" aria-pressed="' + (S.filter === c[0] && !S.q) + '">' + c[1] + (c[2] != null ? '<span class="ccs-n">' + c[2] + '</span>' : '') + '</button>'; }).join('') + '</div>';
    if (!S.loaded) return h + '<p class="ccs-loading">Loading orders…</p>';
    var list = filtered();
    if (S.q && !list.length && S.older && S.older.q === S.q.trim() && (S.older.loading || S.older.rows.length)) return h + '<p class="ccs-day">Recent orders</p><p class="ccs-hint">No recent orders match.</p>' + olderHtml();
    if (!list.length) {
      var msg = S.q ? ['No orders match “' + esc(S.q) + '”.', 'Try a mobile number or an order number like CC-1001.'] :
        S.filter === 'action' ? ['Nothing waiting.', 'New online orders appear here for review. Walk-in orders go in through New order.'] :
        S.filter === 'today' ? ['No cakes due today.', ''] : ['No orders yet.', 'Orders from the website and the counter will show here.'];
      return h + '<div class="ccs-empty" style="margin-top:16px"><b>' + msg[0] + '</b><span>' + msg[1] + '</span>' + (can('manager', 'front_of_house') ? '<button type="button" class="ccs-btn ccs-new" data-tab="new">' + NAV_ICON['new'] + 'New order</button>' : '') + '</div>';
    }
    if (S.filter === 'action' && !S.q) return h + '<div class="ccs-list" style="margin-top:16px">' + list.map(orderCard).join('') + '</div>';
    var out = '', day = null, perDay = {};
    list.forEach(function (o) { perDay[o.required_date] = (perDay[o.required_date] || 0) + 1; });
    list.forEach(function (o) { if (o.required_date !== day) { if (day !== null) out += '</div>'; day = o.required_date; out += '<p class="ccs-day"><span>' + esc(dayLabel(day)) + '</span><em>' + perDay[day] + (perDay[day] === 1 ? ' cake' : ' cakes') + '</em></p><div class="ccs-list">'; } out += orderCard(o); });
    return h + out + '</div>' + olderHtml();
  }


  // ---------- today dashboard ----------
  function greet() { var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function orderTotal(o) { return Number(o.final_total != null ? o.final_total : o.estimate_total) || 0; }
  function tile(act, v, label, num, sub, tone) {
    return '<button type="button" class="ccs-kpi' + (tone ? ' t-' + tone : '') + '" data-act="' + act + '" data-v="' + v + '"><span class="ccs-kpi-l">' + label + '</span><b class="ccs-kpi-n">' + num + '</b><span class="ccs-kpi-s">' + sub + '</span></button>';
  }
  function miniRow(o, showTime) {
    var i = firstItem(o), c = o.customers, st = STATUS[o.order_status] || ['', 'off'];
    return '<button type="button" class="ccs-mini k-' + st[1] + '" data-act="open-order" data-id="' + o.id + '">' +
      '<span class="ccs-mini-t">' + (showTime ? esc(t12(o.required_time)) : esc(nice(o.required_date))) + '</span>' +
      '<span class="ccs-mini-m"><b>' + esc(cakeLine(i)) + '</b><span>' + esc(c ? c.full_name : '') + ' · ' + esc(o.reference) + '</span></span>' +
      '<span class="ccs-mini-r">' + (o.order_status === 'confirmed' ? stagePill(o.production_status) : pill(o.order_status, o.fulfilment_method)) + (o.fulfilment_method === 'delivery' ? '<span class="ccs-pill">Delivery</span>' : '') + (o.has_dietary ? '<span class="ccs-pill s-alert">Dietary</span>' : '') + '</span></button>';
  }
  function todayView() {
    var t = today(), wkEnd = addDays(t, 6), money_ = can('manager', 'finance', 'front_of_house');
    var first = ((S.me && S.me.full_name) || '').trim().split(' ')[0];
    var h = '<div class="ccs-dash-head"><div><p class="ccs-eyebrow">' + esc(nice(t, true)) + '</p><h1 class="ccs-title">' + greet() + (first ? ', ' + esc(first) : '') + '</h1></div>' +
      (can('manager', 'front_of_house') ? '<button type="button" class="ccs-btn ccs-btn-hero ccs-new" data-tab="new">' + NAV_ICON['new'] + 'New order</button>' : '') + '</div>';
    if (draftHasContent() && can('manager', 'front_of_house')) h += '<div class="ccs-note ccs-draftbar"><span>Unfinished order' + (draftWho() ? ' for ' + esc(draftWho()) : '') + '.</span><button type="button" class="ccs-btn ccs-ghost" data-tab="new">Continue it</button></div>';
    if (!S.loaded) return h + '<p class="ccs-loading">Loading today…</p>';
    var live = S.orders.filter(function (o) { return o.order_status !== 'declined' && o.order_status !== 'cancelled'; });
    var needs = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
    var todays = live.filter(function (o) { return o.required_date === t; }).sort(function (a, b) { return a.required_time < b.required_time ? -1 : 1; });
    var collected = todays.filter(function (o) { return o.order_status === 'completed'; }).length;
    var week = live.filter(function (o) { return o.required_date >= t && o.required_date <= wkEnd && OPEN.concat(['completed']).indexOf(o.order_status) > -1; });
    var owing = live.filter(function (o) { return o.order_status === 'awaiting_deposit' || (o.order_status === 'confirmed' && o.payment_status !== 'paid' && o.required_date >= t); });
    var weekValue = week.filter(function (o) { return o.order_status === 'confirmed' || o.order_status === 'completed'; }).reduce(function (s, o) { return s + orderTotal(o); }, 0);
    h += '<div class="ccs-kpis">' +
      tile('goto', 'action', 'Needs action', needs.length, needs.length ? 'Review and confirm' : 'All clear', needs.length ? 'action' : '') +
      tile('goto', 'today', 'Cakes due today', todays.length, todays.length ? collected + ' of ' + todays.length + ' handed over' : 'Nothing due', '') +
      tile('goto', 'upcoming', 'Next 7 days', week.length, week.length ? 'Cakes to make' : 'Nothing booked', '') +
      (money_ ? tile('goto', 'deposit', 'Money owing', owing.length, owing.length ? 'Orders with a balance' : 'All paid', owing.length ? 'deposit' : '') : '') +
      (money_ ? tile('goto', 'upcoming', 'Booked this week', money(weekValue), 'Confirmed orders', 'good') : '') + '</div>';
    // seven day strip
    var strip = '';
    for (var d = 0; d < 7; d++) {
      var iso = addDays(t, d), n = live.filter(function (o) { return o.required_date === iso && OPEN.concat(['completed']).indexOf(o.order_status) > -1; }).length;
      var closed = (S.setup && S.setup.closed_dates || []).indexOf(iso) > -1;
      strip += '<button type="button" class="ccs-daycell' + (d === 0 ? ' is-today' : '') + (closed ? ' is-closed' : '') + '" data-act="day" data-v="' + iso + '"><span>' + (d === 0 ? 'Today' : new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })) + '</span><b>' + new Date(iso + 'T12:00:00Z').getUTCDate() + '</b><em>' + (closed ? 'Closed' : n ? n + (n === 1 ? ' cake' : ' cakes') : '—') + '</em></button>';
    }
    h += '<section class="ccs-panel-card"><div class="ccs-card-head"><h2>This week</h2><button type="button" class="ccs-link" data-act="goto" data-v="upcoming">See all upcoming</button></div><div class="ccs-week">' + strip + '</div></section>';
    h += '<div class="ccs-dash-grid">';
    h += '<section class="ccs-panel-card"><div class="ccs-card-head"><h2>Needs action</h2>' + (needs.length > 5 ? '<button type="button" class="ccs-link" data-act="goto" data-v="action">See all ' + needs.length + '</button>' : '') + '</div>' +
      (needs.length ? '<div class="ccs-minis">' + needs.slice(0, 5).map(function (o) { return miniRow(o, false); }).join('') + '</div>' : '<p class="ccs-quiet">Nothing waiting. New website orders show up here.</p>') + '</section>';
    h += '<section class="ccs-panel-card"><div class="ccs-card-head"><h2>Due today</h2>' + (todays.length ? '<span class="ccs-hint">' + collected + ' of ' + todays.length + ' handed over</span>' : '') + '</div>' +
      (todays.length ? '<div class="ccs-minis">' + todays.map(function (o) { return miniRow(o, true); }).join('') + '</div>' : '<p class="ccs-quiet">No cakes due today.</p>') + '</section>';
    h += '</div>';
    h += fuPanel();
    // where orders come from, last 30 days
    var since = addDays(t, -30), recent = S.orders.filter(function (o) { return (o.created_at || '').slice(0, 10) >= since; });
    if (recent.length && can('manager', 'marketing', 'finance')) {
      var bySrc = {}; recent.forEach(function (o) { bySrc[o.source] = (bySrc[o.source] || 0) + 1; });
      var rows = Object.keys(bySrc).sort(function (a, b) { return bySrc[b] - bySrc[a]; });
      h += '<section class="ccs-panel-card"><div class="ccs-card-head"><h2>Where orders came from</h2><span class="ccs-hint">Last 30 days · ' + recent.length + ' orders</span></div><div class="ccs-bars">' +
        rows.map(function (k) { var pct = Math.round(bySrc[k] / recent.length * 100); return '<div class="ccs-barrow"><span>' + esc(SOURCE_LABEL[k] || k) + '</span><span class="ccs-bartrack"><i style="width:' + pct + '%"></i></span><b>' + bySrc[k] + '</b></div>'; }).join('') + '</div></section>';
    }
    return h;
  }

  // ---------- order detail ----------
  function openOrder(id) {
    S.sheet = { type: 'order', id: id, data: null, photos: [], showHistory: false }; S.panel = null; S.panelErr = null; S.dirty = {};
    sheetOpen(); renderSheet();
    return sb.from('orders').select('*, customers(*), order_items(*), order_events(*), order_attachments(*), payments(*), order_amendments(*)').eq('id', id).single().then(withContact).then(function (r) {
      if (r.error) throw r.error;
      if (!S.sheet || S.sheet.id !== id) return;
      S.sheet.data = r.data;
      if (r.data.customer_id) orderFuLoad(id);
      var att = r.data.order_attachments || [];
      if (att.length) sb.storage.from('cake-references').createSignedUrls(att.map(function (a) { return a.storage_path; }), 900).then(function (u) {
        if (u.data && S.sheet && S.sheet.id === id) { S.sheet.photos = u.data.map(function (x) { return x.signedUrl; }).filter(Boolean); renderSheet(); }
      });
      if (r.data.customers) sb.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', r.data.customer_id).not('order_status', 'in', '(declined,cancelled)').then(function (c) {
        if (S.sheet && S.sheet.id === id) { S.sheet.custOrders = c.count; renderSheet(); }
      });
      renderSheet();
    }).catch(fail);
  }
  function sheetOpen() {
    var s = document.getElementById('ccs-sheet'), sh = document.getElementById('ccs-shade'); if (s) { s.classList.add('ccs-open'); sh.classList.add('ccs-open'); }
    if (!S.sheetHist) { S.sheetHist = true; try { history.pushState({ ccs: 'sheet' }, ''); } catch (x) {} }
  }
  // how: 'pop' = the back gesture already removed the entry; 'replace' = a tab change takes the entry over; default = remove our entry
  function sheetClose(how) {
    var wasSheet = !!S.sheet;
    if (S.sheet && S.sheet.type === 'new' && draftHasContent()) { saveDraft(); toast('Unfinished order kept. Tap New order on the same day to carry on.'); } if (S.cal) S.cal.pre = null;
    if (wasSheet && S.tab === 'calendar' && S.me) setTimeout(function () { calLoad(true); }, 0);
    S.sheet = null; S.panel = null; S.dirty = {}; var s = document.getElementById('ccs-sheet'), sh = document.getElementById('ccs-shade'); if (s) { s.classList.remove('ccs-open'); sh.classList.remove('ccs-open'); }
    if (S.sheetHist) { S.sheetHist = false; if (how !== 'pop' && how !== 'replace') { S.ignorePop = true; try { history.back(); } catch (x) { S.ignorePop = false; } } }
  }
  function goTab(t, fromPop) {
    if (!fromPop && S.sheet && hasTyping()) { toast('Save or cancel your changes first.', true); return; }
    var hadSheet = S.sheetHist;
    S.tab = t; sheetClose(hadSheet && !fromPop ? 'replace' : 'pop');
    try { if (!fromPop) { if (hadSheet) history.replaceState({ ccs: 'tab', tab: t }, ''); else history.pushState({ ccs: 'tab', tab: t }, ''); } } catch (x) {}
    shell();
    if (S.tab === 'customers' && !S.cust.loaded) loadCustomers();
    if (S.tab === 'settings') loadSettings();
    if (S.tab === 'dash') dashLoad();
    if (S.tab === 'register') regLoad();
    if (S.tab === 'kitchen') loadKitchen();
    if (S.tab === 'orders' || S.tab === 'today') loadOrders(true);
    if (S.tab === 'calendar') calLoad();
  }
  window.addEventListener('popstate', function (e) {
    if (S.ignorePop) { S.ignorePop = false; return; }
    if (!S.me) return;
    if (S.sheet) {
      var keep = function () { try { history.pushState({ ccs: 'sheet' }, ''); } catch (x) {} };
      if (hasTyping()) { keep(); toast('Your typing is kept. Save it, or tap the cross twice to discard it.'); return; }
      if (S.panel) { S.panel = null; S.panelErr = null; renderSheet(); keep(); return; }
      if (S.sheet.type === 'more' && S.sheet.confirmOut) { S.sheet.confirmOut = false; renderSheet(); keep(); return; }
      S.sheetHist = false; sheetClose('pop'); return;
    }
    var st = e.state;
    if (st && st.ccs === 'tab' && st.tab && st.tab !== S.tab) goTab(st.tab, true);
  });
  // More: Customers, Settings and Sign out on phones; also the sign-out check everywhere (U15)
  function openMore(confirmOut) { S.sheet = { type: 'more', confirmOut: !!confirmOut }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  function moreSheet() {
    var role = (ROLES.filter(function (r) { return r[0] === S.me.role; })[0] || ['', ''])[1];
    var h = sheetHead('More') + '<div class="ccs-sheet-body">';
    h += '<section class="ccs-box"><h3>Signed in</h3><p class="ccs-big">' + esc(S.me.full_name || '') + '</p><p class="ccs-hint">' + esc(role) + '</p></section>';
    var links = '';
    if (can('manager', 'front_of_house')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="kitchen">Kitchen</button>';
    if (can('manager', 'front_of_house', 'finance', 'marketing')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="customers">Customers</button>';
    if (can('marketing')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="dash">Dashboard</button>';
    if (can('manager')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="register">Cake register</button>';
    if (can('manager')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="settings">Settings</button>';
    if (links) h += '<div class="ccs-more-links">' + links + '</div>';
    if (S.sheet.confirmOut && draftHasContent()) h += '<div class="ccs-panel ccs-confirm" role="alert"><b>You have an unfinished order' + (draftWho() ? ' for ' + esc(draftWho()) : '') + '.</b><p class="ccs-hint">Signing out deletes it from this device.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="signout" data-sure="1">Sign out anyway</button><button type="button" class="ccs-btn ccs-ghost" data-tab="new">Finish the order</button></div></div>';
    else h += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="my-password">Change my password</button><button type="button" class="ccs-btn ccs-danger ccs-wide" data-act="signout">Sign out</button>';
    return h + '</div>';
  }
  function renderSheet() {
    var el = document.getElementById('ccs-sheet'); if (!el || !S.sheet) return;
    var body = S.sheet.type === 'new' ? sheetHead('New order') + '<div class="ccs-sheet-body ccs-newsheet">' + newView() + '</div>' : S.sheet.type === 'cal' ? calSheet() : S.sheet.type === 'order' ? orderSheet() : S.sheet.type === 'customer' ? customerSheet() : S.sheet.type === 'custnew' ? newCustomerSheet() : S.sheet.type === 'kitchen' ? kitchenSheet() : S.sheet.type === 'more' ? moreSheet() : S.sheet.type === 'dash' ? dashSheet() : S.sheet.type === 'reg' ? regSheet() : S.sheet.type === 'pw' ? sheetHead('Change my password') + '<div class="ccs-sheet-body"><form class="ccs-box ccs-pwform" id="ccs-pw">' + pwFields(S.pwErr) + '</form></div>' : '';
    var keep = el.querySelector('.ccs-sheet-body'), top = keep ? keep.scrollTop : 0, focus = captureFocus(el);
    el.innerHTML = body;
    // put back anything staff were typing (the screen refreshes itself every minute) (U2)
    Object.keys(S.dirty).forEach(function (id) { var inp = document.getElementById(id); if (inp && el.contains(inp) && inp.value !== S.dirty[id]) inp.value = S.dirty[id]; });
    var nb = el.querySelector('.ccs-sheet-body'); if (nb) nb.scrollTop = top;
    if (!restoreFocus(focus)) { var f = el.querySelector('[data-autofocus]'); if (f) f.focus(); }
  }
  function sheetHead(title, extra) { return '<div class="ccs-sheet-head"><h2 class="ccs-title">' + title + '</h2>' + (extra || '') + '<button type="button" class="ccs-x" data-act="close" aria-label="Close">×</button></div>'; }
  function paidTotal(o) { return (o.payments || []).reduce(function (s, p) { return s + Number(p.amount); }, 0); }

  function orderSheet() {
    var o = S.sheet.data;
    if (!o) return sheetHead('Loading…') + '<div class="ccs-sheet-body"><p class="ccs-loading">Loading order…</p></div>';
    var i = (o.order_items || [])[0] || {}, c = o.customers, paid = paidTotal(o), total = Number(o.final_total != null ? o.final_total : o.estimate_total), bal = Math.max(total - paid, 0);
    var h = sheetHead(esc(o.reference), pill(o.order_status, o.fulfilment_method) + (o.order_status === 'confirmed' || o.order_status === 'completed' ? payPill(o.payment_status) : '') + (o.revision ? '<span class="ccs-tag">Amended</span>' : '')) + '<div class="ccs-sheet-body">';
    h += actionsBox(o, total, paid, bal);
    if (o.has_dietary) h += '<div class="ccs-alert">Dietary or allergy: ' + esc([].concat(i.dietary || [], i.dietary_note ? [i.dietary_note] : []).join(', ') || 'see notes') + '</div>';
    h += '<section class="ccs-box"><h3>Cake</h3><p class="ccs-big">' + esc(cakeLine(i)) + '</p><dl class="ccs-kv">' +
      kv('Finish', i.finish === 'custom' ? 'Custom design' : 'Standard finish') + kv('Design', i.design_description) +
      kv('Message', i.cake_message ? '“' + i.cake_message + '”' : '') + kv('Occasion', i.occasion) + kv('Serves', i.serves_label) + kv('Notes', o.customer_notes) + '</dl>' +
      (S.sheet.photos.length ? '<div class="ccs-photos">' + S.sheet.photos.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Reference photo"></a>'; }).join('') + '</div>' : ((o.order_attachments || []).length ? '<p class="ccs-hint">Loading reference photos…</p>' : '')) + '</section>';
    var deliv = o.fulfilment_method === 'delivery', closedSt = ['completed', 'declined', 'cancelled'].indexOf(o.order_status) > -1;
    h += '<section class="ccs-box"><h3>' + (deliv ? 'Delivery' : 'Collection') + '</h3><p class="ccs-big">' + esc(nice(o.required_date, true)) + ' at ' + esc(t12(o.required_time)) + '</p>' +
      (deliv ? '<dl class="ccs-kv">' + kv('Area', o.delivery_zone) + kv('Address', o.delivery_address) + kv('Receiving', o.delivery_contact) + kv('Delivery fee', o.delivery_fee != null ? money(o.delivery_fee) : '') + '</dl>' : '<p class="ccs-hint">Collect from the café counter.</p>') +
      (o.handed_over_at ? '<p class="ccs-hint">Handed over ' + esc(stamp(o.handed_over_at)) + (o.handover_to ? ' to ' + esc(o.handover_to) : '') + '</p>' : '') +
      (o.rush_override ? '<p class="ccs-note">Short-notice order: ' + esc(o.rush_reason) + '</p>' : '') +
      (!closedSt && can('manager', 'front_of_house') ? '<button type="button" class="ccs-link" data-act="panel" data-v="fulfil">Change collection or delivery</button>' : '') + '</section>';
    if (o.order_status === 'confirmed' || o.order_status === 'completed') {
      h += '<section class="ccs-box"><h3>Kitchen</h3><div class="ccs-tags">' + stagePill(o.production_status) + (o.brief_version ? '<span class="ccs-pill">Brief version ' + o.brief_version + '</span>' : '<span class="ccs-pill s-action">Brief not printed</span>') + '</div><dl class="ccs-kv">' +
        kv('Made by', o.kitchen_assignee) + kv('Checked by', o.qc_by ? o.qc_by + (o.qc_at ? ', ' + stamp(o.qc_at) : '') : '') + '</dl>' +
        (o.order_status === 'confirmed' && can('manager', 'front_of_house') ? '<button type="button" class="ccs-link" data-act="open-kitchen" data-id="' + o.id + '">Update kitchen progress</button>' : '') + '</section>';
    }
    if (c) {
      h += '<section class="ccs-box"><h3>Customer</h3><p class="ccs-big">' + esc(c.full_name) + '</p><dl class="ccs-kv">' +
        kv('Mobile', c.phone + (c.preferred_contact === 'whatsapp' ? ' (WhatsApp)' : '')) + kv('Email', c.email) + kv('Ordered via', SOURCE_LABEL[o.source]) +
        (o.profile && o.profile.full_name && o.profile.full_name !== c.full_name ? kv('Profile name', o.profile.full_name + ' (the name on this order is kept as it was)') : '') +
        (S.sheet.custOrders != null ? kv('History', S.sheet.custOrders > 1 ? 'Returning customer, ' + S.sheet.custOrders + ' orders' : 'First order') : '') + '</dl>' +
        '<div class="ccs-actions-row"><a class="ccs-btn ccs-ghost" href="' + esc(waLink(c.phone)) + '" target="_blank" rel="noopener">WhatsApp</a><a class="ccs-btn ccs-ghost" href="tel:' + esc(digits(c.phone)) + '">Call</a>' +
        (can('manager', 'front_of_house', 'finance', 'marketing') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="open-customer" data-id="' + c.id + '">Customer profile</button>' : '') + '</div>' + orderFuBox(o) + '</section>';
    }
    if (can('manager', 'finance', 'front_of_house')) {
      h += '<section class="ccs-box"><h3>Payment ' + payPill(o.payment_status) + '</h3><div class="ccs-money"><div><span>Price</span><b>' + money(total) + '</b></div><div><span>Deposit</span><b>' + (o.deposit_required ? money(o.deposit_required) : '—') + '</b></div><div><span>Paid</span><b>' + money(paid) + '</b></div><div><span>To pay</span><b>' + money(bal) + '</b></div></div>' +
        (paid > total ? '<p class="ccs-note">' + money(paid - total) + ' more than the order total has been paid. A manager decides on a refund or credit. Nothing is refunded automatically.</p>' : '') + ((o.payments || []).length ? '<div class="ccs-history">' + o.payments.slice().sort(function (a, b) { return a.recorded_at < b.recorded_at ? -1 : 1; }).map(function (p) { return '<div><span>' + esc(stamp(p.recorded_at)) + '</span><b style="font-weight:500">' + money(p.amount) + ' ' + esc(p.kind) + ' by ' + esc(p.method.replace('_', ' ')) + (p.reference ? ' · ' + esc(p.reference) : '') + '</b></div>'; }).join('') + '</div>' : '<p class="ccs-hint">No payments recorded yet.</p>') + '</section>';
    }
    if (o.internal_notes) h += '<section class="ccs-box"><h3>Team notes</h3><p style="white-space:pre-wrap;font-size:15px">' + esc(o.internal_notes) + '</p></section>';
    h += changeHistory(o);
    h += '<section class="ccs-box"><h3>Activity</h3>' + (S.sheet.showHistory ? '<div class="ccs-history">' + (o.order_events || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).map(function (e) { return '<div><span>' + esc(stamp(e.at)) + '</span><span style="color:var(--ccs-ink)">' + esc(eventText(e)) + '</span></div>'; }).join('') + '</div>' : '<button type="button" class="ccs-link" data-act="history">Show history (' + (o.order_events || []).length + ')</button>') + '</section>';
    return h + '</div>';
  }
  function kv(k, v) { return v ? '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>' : ''; }
  function eventText(e) {
    var d = e.detail || {}, who = e.actor_label || 'System';
    var map = { created: 'Order placed (' + (SOURCE_LABEL[d.source] || d.source) + ')', confirmed: 'Confirmed' + (d.final_total != null ? ' at ' + money(d.final_total) : '') + (d.reason ? ' (' + d.reason + ')' : ''),
      awaiting_deposit: 'Accepted, waiting for ' + money(d.deposit_required) + ' deposit', declined: 'Declined', cancelled: 'Cancelled', collected: 'Collected',
      payment_recorded: money(d.amount) + ' ' + d.kind + ' recorded (' + String(d.method).replace('_', ' ') + ')', note: 'Note added',
      stage: 'Kitchen: ' + (STAGE_LABEL[d.to] || d.to) + (d.qc_by ? ', checked by ' + d.qc_by : ''),
      brief_printed: 'Kitchen brief version ' + d.version + (d.new_version ? ' printed' : ' reprinted') + (d.changes && d.changes.length ? ' (changed: ' + d.changes.join(', ') + ')' : ''),
      fulfilment: d.method === 'delivery' ? 'Set to delivery, ' + (d.zone || '') + ', fee ' + money(d.fee) : 'Set to collection',
      assigned: d.to ? 'Assigned to ' + d.to : 'Assignment cleared', amended: 'Amended, revision ' + d.revision + (d.reason ? ' (' + d.reason + ')' : ''), kitchen_ack: 'Kitchen acknowledged the changes', deleted: 'Deleted', restored: 'Restored after being deleted', imported: 'Brought in from the Google Sheet', sheet_linked: 'Linked to its Google Sheet row' };
    if (e.kind === 'collected') map.collected = (d.method === 'delivery' ? 'Delivered' : 'Collected') + (d.to ? ', received by ' + d.to : '');
    return (map[e.kind] || e.kind) + (d.note ? ': ' + d.note : '') + ' · ' + who;
  }
  function actionsBox(o, total, paid, bal) {
    var orderer = can('manager', 'front_of_house'), payer = can('manager', 'finance', 'front_of_house');
    if (!orderer && !payer) return '';
    var p = S.panel, err = S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '', st = o.order_status;
    if (p === 'amend') return amendPanel(o, total, paid);
    if (p === 'confirm') {
      var custom = o.order_type === 'custom';
      return '<div class="ccs-panel"><b>' + (custom ? 'Quote and confirm this custom cake' : 'Confirm this order') + '</b>' +
        '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ccs-price">' + (custom ? 'Quoted price (FJD)' : 'Price (FJD)') + '</label><input class="ccs-input" id="ccs-price" inputmode="decimal" value="' + (custom ? '' : Number(o.estimate_total)) + '"' + (custom ? ' data-autofocus placeholder="From ' + money(o.estimate_total) + '"' : '') + '></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-dep">Deposit needed (FJD)</label><input class="ccs-input" id="ccs-dep" inputmode="decimal" placeholder="0 for none"></div></div>' +
        '<p class="ccs-hint">With a deposit, the order waits until it is paid. ' + (S.setup && S.setup.guest_emails ? 'The customer is emailed either way.' : 'Guest emails are off, so message or call the customer once you confirm.') + '</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-confirm">Confirm</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'decline' || p === 'cancel' || p === 'note' || p === 'waive') {
      var lbl = { decline: ['Decline this order', 'Reason for the customer (optional)', 'Decline order', 'ccs-danger'], cancel: ['Cancel this order', 'Reason (required)', 'Cancel order', 'ccs-danger'], note: ['Add a team note', 'Note', 'Save note', ''], waive: ['Waive the deposit', 'Reason (required)', 'Confirm without deposit', 'ccs-good'] }[p];
      return '<div class="ccs-panel"><b>' + lbl[0] + '</b><div class="ccs-field"><label class="ccs-label" for="ccs-note">' + lbl[1] + '</label><textarea class="ccs-input" id="ccs-note" data-autofocus></textarea></div>' +
        (p === 'cancel' && paid > 0 ? '<p class="ccs-note">' + money(paid) + ' has been paid. Arrange the refund with a manager after cancelling.</p>' : '') + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ' + lbl[3] + '" data-act="do-' + p + '">' + lbl[2] + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'delete') {
      return '<div class="ccs-panel"><b>Delete this order</b><p class="ccs-hint">Only for test orders and orders entered by mistake. The order disappears from every list, count and figure, and no more emails go out for it. It is kept with your name and reason, and an admin can restore it from Settings.</p>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-note">Why is it being deleted? (required)</label><textarea class="ccs-input" id="ccs-note" data-autofocus placeholder="For example: test order, or entered twice by mistake"></textarea></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-delref">Type the order number ' + esc(o.reference) + ' to confirm</label><input class="ccs-input" id="ccs-delref" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="do-delete">Delete order</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'fulfil') {
      var F = S.ful, zones = (S.setup && S.setup.delivery_zones) || [], zf = zones.filter(function (z) { return z.name === F.zone; })[0];
      return '<div class="ccs-panel"><b>Collection or delivery</b><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="f-method" data-v="collection" aria-pressed="' + (F.method === 'collection') + '">Collect from café</button><button type="button" class="ccs-chip" data-act="f-method" data-v="delivery" aria-pressed="' + (F.method === 'delivery') + '">Delivery</button></div>' +
        (F.method === 'delivery' ? '<div class="ccs-field"><span class="ccs-label">Area</span><div class="ccs-chips">' + zones.map(function (z) { return '<button type="button" class="ccs-chip" data-act="f-zone" data-v="' + esc(z.name) + '" aria-pressed="' + (F.zone === z.name) + '">' + esc(z.name) + (z.fee != null ? ' · ' + money(z.fee) : '') + '</button>'; }).join('') + '</div></div>' +
          '<div class="ccs-field"><label class="ccs-label" for="f-address">Delivery address</label><input class="ccs-input" id="f-address" data-f="address" value="' + esc(F.address) + '"></div>' +
          (zf && zf.fee == null ? '<div class="ccs-field"><label class="ccs-label" for="f-fee">Delivery fee (FJD)</label><input class="ccs-input" id="f-fee" data-f="fee" inputmode="decimal" value="' + esc(F.fee) + '"></div>' : '') +
          '<div class="ccs-field"><label class="ccs-label" for="f-contact">Who receives it (optional)</label><input class="ccs-input" id="f-contact" data-f="contact" value="' + esc(F.contact) + '" placeholder="Name, room or reception"></div>' : '') +
        '<p class="ccs-hint">The delivery fee is added to the order price.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-fulfil">Save</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'collected') {
      var dl = o.fulfilment_method === 'delivery';
      return '<div class="ccs-panel"><b>' + (dl ? 'Mark as delivered' : 'Mark as collected') + '</b><div class="ccs-field"><label class="ccs-label" for="ccs-note">' + (dl ? 'Who received the cake' : 'Who collected the cake') + '</label><input class="ccs-input" id="ccs-note" data-autofocus placeholder="' + (dl ? 'Name, or reception at the resort' : 'Name of the person collecting') + '">' + receiverChips(o, dl) + '</div>' +
        '<p class="ccs-hint">Check the order number and name before handing over.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-collected">' + (dl ? 'Delivered' : 'Collected') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'brief') {
      return '<div class="ccs-panel"><b>Print kitchen brief</b><p class="ccs-hint">' + (o.brief_version ? 'Version ' + o.brief_version + ' was printed before. If anything changed since, this prints a new version and marks what changed.' : 'This is the first brief for this order.') + ' No prices or phone numbers are printed.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="do-brief" data-v="A4">Print A4</button><button type="button" class="ccs-btn ccs-ghost" data-act="do-brief" data-v="A5">Print A5</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'pay') {
      if (!S.payKey) S.payKey = uuid();
      var suggest = st === 'awaiting_deposit' ? Math.max(Number(o.deposit_required || 0) - paid, 0) : bal;
      return '<div class="ccs-panel"><b>Record a payment</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ccs-amt">Amount (FJD)</label><input class="ccs-input" id="ccs-amt" inputmode="decimal" value="' + (suggest ? suggest : '') + '" data-autofocus></div>' +
        '<div class="ccs-field"><span class="ccs-label">Paid by</span><div class="ccs-chips" id="ccs-method">' + [['cash', 'Cash'], ['eftpos', 'EFTPOS'], ['bank_transfer', 'Bank transfer']].map(function (m, k) { return '<button type="button" class="ccs-chip" data-act="method" data-v="' + m[0] + '" aria-pressed="' + ((S.payMethod || 'cash') === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div></div></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-ref">Receipt or transfer reference (optional)</label><input class="ccs-input" id="ccs-ref"></div>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-pay">Record payment</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    var main = '', more = [], hint = '';
    if ((st === 'awaiting_review' || st === 'awaiting_quote') && orderer) {
      main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="confirm">' + (st === 'awaiting_quote' ? 'Quote and confirm' : 'Confirm order') + '</button><button type="button" class="ccs-btn ccs-danger" data-act="panel" data-v="decline">Decline</button>';
    } else if (st === 'awaiting_deposit') {
      if (payer) main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="pay">Record deposit</button>';
      if (can('manager')) more.push(['waive', 'Waive deposit']);
      if (orderer) more.push(['decline', 'Decline']);
    } else if (st === 'confirmed') {
      if (bal > 0 && payer) main = '<button type="button" class="ccs-btn" data-act="panel" data-v="pay">Take ' + money(bal) + '</button>';
      if (orderer) {
        var notReady = o.production_status !== 'ready', label = o.fulfilment_method === 'delivery' ? 'Mark delivered' : 'Mark collected';
        var locked = bal > 0 ? ' after payment' : notReady ? ' when Ready' : '';
        main += '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="collected"' + (locked ? ' disabled aria-disabled="true"' : '') + '>' + label + locked + '</button>';
        main += '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="brief">Print kitchen brief</button>';
        if (bal > 0) hint = 'Record the balance before handing over.';
        else if (notReady) hint = 'Handover opens once the kitchen marks the cake Ready (now: ' + (STAGE_LABEL[o.production_status] || o.production_status) + ').';
      }
    } else if (st === 'completed' && orderer) {
      main = '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="brief">Print kitchen brief</button>';
    }
    if (orderer && OPEN.indexOf(st) > -1 && (o.production_status !== 'ready' || can('manager'))) main += '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="amend">Amend order</button>';
    if (orderer && OPEN.indexOf(st) > -1) { more.push(['note', '+ Add note']); more.push(['cancel', 'Cancel order']); }
    else if (orderer) more.push(['note', '+ Add note']);
    // Admins can delete orders entered by mistake or for testing, but never one with money recorded
    if (S.me.role === 'admin' && !(o.payments || []).length) more.push(['delete', 'Delete order']);
    if (!main && !more.length) return '';
    return '<div class="ccs-actions">' + (main ? '<div class="ccs-actions-row">' + main + '</div>' : '') + (hint ? '<p class="ccs-hint">' + esc(hint) + '</p>' : '') + (S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '') +
      (more.length ? '<div class="ccs-actions-row ccs-more-row">' + more.map(function (m) { return '<button type="button" class="ccs-link' + (m[0] === 'cancel' || m[0] === 'decline' || m[0] === 'delete' ? ' ccs-red' : '') + '" data-act="panel" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function receiverChips(o, dl) {
    var c = o.customers, opts = [];
    if (c && c.full_name) opts.push([c.full_name, c.full_name + ' (the customer)']);
    if (dl && o.delivery_contact && (!c || o.delivery_contact !== c.full_name)) opts.push([o.delivery_contact, o.delivery_contact]);
    if (dl) opts.push(['Resort reception', 'Resort reception']);
    return opts.length ? '<div class="ccs-chips">' + opts.map(function (x) { return '<button type="button" class="ccs-chip" data-act="fill" data-f="ccs-note" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div><span class="ccs-hint">Tap a name, or type someone else.</span>' : '';
  }
  function num(s) { s = String(s || '').replace(/[$,\s]/g, ''); return s === '' ? null : Number(s); }
  function act(action, extra) {
    var o = S.sheet.data; if (S.busy) return; S.busy = true; S.panelErr = null;
    var args = Object.assign({ p_order: o.id, p_action: action, p_version: o.version, p_final_total: null, p_deposit: null, p_note: null }, extra || {});
    return sb.rpc('staff_order_action', args).then(function (r) {
      S.busy = false;
      if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; if (r.data.error === 'changed') { S.panel = null; openOrder(o.id); } else renderSheet(); return; }
      var msg = { confirm: r.data.status === 'awaiting_deposit' ? 'Accepted. Waiting for the deposit.' : 'Order confirmed', decline: 'Order declined', cancel: 'Order cancelled', collected: o.fulfilment_method === 'delivery' ? 'Marked as delivered' : 'Marked as collected', note: 'Note saved', waive_deposit: 'Deposit waived, order confirmed' }[action];
      if (!(S.setup && S.setup.guest_emails) && ['confirm', 'decline', 'cancel', 'waive_deposit'].indexOf(action) > -1) msg += '. Now let the customer know.';
      toast(msg); S.panel = null; openOrder(o.id); loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function deleteOrder() {
    var o = S.sheet.data, reason = val('ccs-note').trim(), ref = val('ccs-delref').trim();
    if (reason.length < 5) { S.panelErr = 'Say why this order is being deleted.'; S.dirty['ccs-note'] = reason; S.dirty['ccs-delref'] = ref; clearBusy(); return renderSheet(); }
    if (ref.toUpperCase() !== String(o.reference).toUpperCase()) { S.panelErr = 'Type the order number exactly as shown: ' + o.reference + '.'; S.dirty['ccs-note'] = reason; S.dirty['ccs-delref'] = ref; clearBusy(); return renderSheet(); }
    if (S.busy) return; S.busy = true; S.panelErr = null;
    sb.rpc('admin_delete_order', { p_order: o.id, p_reference: ref, p_reason: reason }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; S.dirty['ccs-note'] = reason; S.dirty['ccs-delref'] = ref; clearBusy(); return renderSheet(); }
      S.dirty = {}; sheetClose(); toast(o.reference + ' deleted. An admin can restore it from Settings.');
      if (DX) DX.data = null; if (RG) RG.data = null; loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function restoreOrder(id) {
    sb.rpc('admin_restore_order', { p_order: id }).then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) { clearBusy(); return toast(r.data.message, true); }
      toast(r.data.reference + ' restored'); if (DX) DX.data = null; if (RG) RG.data = null; loadSettings(); loadOrders(true);
    }).catch(fail);
  }
  function pay() {
    var o = S.sheet.data, amt = num(val('ccs-amt'));
    if (!amt || amt <= 0) { S.panelErr = 'Enter the amount paid.'; return renderSheet(); }
    if (S.busy) return; S.busy = true;
    sb.rpc('staff_record_payment', { p_order: o.id, p_kind: o.order_status === 'awaiting_deposit' ? 'deposit' : (amt >= Number(o.final_total != null ? o.final_total : o.estimate_total) - paidTotal(o) ? (paidTotal(o) > 0 ? 'balance' : 'full') : 'deposit'), p_method: S.payMethod || 'cash', p_amount: amt, p_reference: val('ccs-ref') || null, p_note: null, p_idem: S.payKey })
      .then(function (r) {
        S.busy = false; if (r.error) throw r.error;
        if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
        toast(money(amt) + ' recorded' + (r.data.balance > 0 ? '. ' + money(r.data.balance) + ' still to pay.' : '. All paid.'));
        S.panel = null; S.payKey = null; S.payMethod = null; openOrder(o.id); loadOrders(true);
      }).catch(function (e) { S.busy = false; fail(e); });
  }

  function saveFulfil() {
    var o = S.sheet.data, F = S.ful; if (S.busy) return;
    if (F.method === 'delivery' && !F.zone) { S.panelErr = 'Choose a delivery area.'; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('staff_set_fulfilment', { p_order: o.id, p_version: o.version, p_method: F.method, p_zone: F.method === 'delivery' ? F.zone : null, p_address: F.method === 'delivery' ? F.address : null, p_fee: F.method === 'delivery' ? num(F.fee) : null, p_contact: F.method === 'delivery' ? F.contact : null })
      .then(function (r) {
        S.busy = false; if (r.error) throw r.error;
        if (!r.data.ok) { S.panelErr = r.data.message; if (r.data.error === 'changed') { S.panel = null; openOrder(o.id); } else renderSheet(); return; }
        toast((F.method === 'delivery' ? 'Delivery saved. New price ' : 'Set to collection. New price ') + money(r.data.total)); S.panel = null; openOrder(o.id); loadOrders(true);
      }).catch(function (e) { S.busy = false; fail(e); });
  }

  // ---------- kitchen brief (print) ----------
  function printBrief(size) {
    var o = S.sheet.data; if (S.busy) return; S.busy = true; S.panelErr = null;
    sb.rpc('staff_print_brief', { p_order: o.id }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      var b = r.data, paths = b.snapshot.photos || [];
      var go = function (urls) { renderBrief(b, urls, size); toast(b.new_version ? 'Kitchen brief version ' + b.version + ' sent to the printer' : 'Reprinting version ' + b.version + ' (nothing changed)'); S.panel = null; openOrder(o.id); };
      if (!paths.length) return go([]);
      sb.storage.from('cake-references').createSignedUrls(paths, 900).then(function (u) { go(((u && u.data) || []).map(function (x) { return x.signedUrl; }).filter(Boolean)); }, function () { go([]); });
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function briefHtml(b, urls, size) {
    var s = b.snapshot, deliv = s.method === 'delivery', due = s.time, lead = deliv ? 60 : 30;
    var dm = Number(due.slice(0, 2)) * 60 + Number(due.slice(3, 5)) - lead, readyBy = String(Math.floor(dm / 60)).padStart(2, '0') + ':' + String(dm % 60).padStart(2, '0');
    var NAMES = { cake: 'cake', variant: 'flavour', size: 'size', quantity: 'quantity', finish: 'finish', design: 'design', message: 'message', occasion: 'occasion', dietary: 'dietary', dietary_note: 'dietary note', has_dietary: 'dietary', date: 'date', time: 'time', method: 'collection or delivery', area: 'delivery area', photos: 'reference photos', kitchen_notes: 'kitchen notes', order_notes: 'order notes', customer: 'name', serves: 'serves', rush: 'short notice' };
    var changed = (b.changes || []).map(function (k) { return NAMES[k] || k; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(', ') || 'See notes' : '';
    var row = function (k, v) { return v ? '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>' : ''; };
    var box = function (t) { return '<span class="ccs-bx"></span>' + esc(t); };
    return '<div class="ccs-brief ccs-brief-' + size + '">' +
      '<div class="ccs-b-top"><div><div class="ccs-b-kicker">Corner Café kitchen brief</div><div class="ccs-b-ref">' + esc(s.reference) + '</div></div>' +
      '<div class="ccs-b-ver"><b>Version ' + b.version + '</b><span>Printed ' + esc(stamp(new Date().toISOString())) + '</span>' + (s.rush ? '<span class="ccs-b-flag">Short notice</span>' : '') + '</div></div>' +
      (b.version > 1 && changed.length ? '<div class="ccs-b-changed">Changed since version ' + (b.version - 1) + ': ' + esc(changed.join(', ')) + '. Throw away the old brief.</div>' : '') +
      '<div class="ccs-b-due"><div><span>' + (deliv ? 'Delivery' : 'Collection') + '</span><b>' + esc(nice(s.date, true)) + ', ' + esc(t12(s.time)) + '</b>' + (deliv ? '<em>' + esc(s.area || 'Delivery') + '</em>' : '<em>From the café counter</em>') + '</div>' +
      '<div><span>Ready by</span><b>' + esc(t12(readyBy)) + '</b><em>' + lead + ' minutes before ' + (deliv ? 'delivery' : 'collection') + '</em></div><div><span>For</span><b>' + esc(s.customer || '') + '</b><em>Order ' + esc(s.reference) + '</em></div></div>' +
      (s.has_dietary ? '<div class="ccs-b-diet">Dietary or allergy: ' + esc(diet) + '</div>' : '<div class="ccs-b-nodiet">No dietary needs or allergies given.</div>') +
      '<table class="ccs-b-spec">' + row('Cake', (s.variant || s.cake) + (s.variant && s.cake && s.variant !== s.cake ? ' (' + s.cake + ')' : '')) + row('Size', s.size + ' inch' + (s.quantity > 1 ? ', ' + s.quantity + ' cakes' : '')) + row('Serves', s.serves) +
      row('Finish', s.finish === 'custom' ? 'Custom design' : 'Standard finish') + row('Design', s.design) + row('Occasion', s.occasion) + row('Order notes', s.order_notes) + row('Kitchen notes', s.kitchen_notes) + '</table>' +
      '<div class="ccs-b-msg"><span>Written on the cake</span><b>' + (s.message ? '“' + esc(s.message) + '”' : 'No message') + '</b>' + (s.message ? '<em>Copy exactly, including spelling and capitals.</em>' : '') + '</div>' +
      (urls.length ? '<div class="ccs-b-photos"><span>Approved reference photos (' + urls.length + ')</span><div>' + urls.map(function (u) { return '<img src="' + esc(u) + '" alt="Reference photo">'; }).join('') + '</div></div>' : '') +
      '<div class="ccs-b-grid"><div class="ccs-b-sec"><h4>Production</h4><p>Made by: ______________________</p><p>Started: ________  Finished: ________</p></div>' +
      '<div class="ccs-b-sec"><h4>Quality check</h4>' + ['Correct flavour and size', 'Message spelled exactly', 'Design matches the brief and photos', 'Dietary needs followed', 'Clean finish, box and board'].map(function (t) { return '<p>' + box(t) + '</p>'; }).join('') + '<p>Checked by: ________________  Time: ______</p></div>' +
      '<div class="ccs-b-sec"><h4>Packing and handover</h4><p>' + box('Boxed, labelled with ' + esc(s.reference)) + '</p>' + (deliv ? '<p>' + box('Kept level, cool and upright in the vehicle') + '</p><p>' + box('Delivered to ' + esc(s.area || 'the address on the order screen')) + '</p>' : '<p>' + box('Name and order number checked at the counter') + '</p>') + '<p>Handed to: ________________  Time: ______</p></div></div>' +
      '<p class="ccs-b-foot">Kitchen copy. Prices and contact details are not printed. Address and phone are on the order screen.</p></div>';
  }
  function renderBrief(b, urls, size) {
    var el = document.getElementById('ccs-print'); if (!el) { el = document.createElement('div'); el.id = 'ccs-print'; document.body.appendChild(el); }
    el.innerHTML = briefHtml(b, urls, size);
    var ps = document.getElementById('ccs-page'); if (!ps) { ps = document.createElement('style'); ps.id = 'ccs-page'; document.head.appendChild(ps); }
    ps.textContent = '@page{size:' + size + ' portrait;margin:' + (size === 'A5' ? '8mm' : '12mm') + '}';
    var imgs = Array.prototype.slice.call(el.querySelectorAll('img')), started = false;
    var fire = function () { if (started) return; started = true; document.body.classList.add('ccs-printing'); setTimeout(function () { window.print(); }, 50); };
    var left = imgs.length; if (!left) return fire();
    imgs.forEach(function (im) { if (im.complete) { if (--left === 0) fire(); } else { im.onload = im.onerror = function () { if (--left === 0) fire(); }; } });
    setTimeout(fire, 4000);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('ccs-printing'); });

  // ---------- kitchen screen ----------
  function loadKitchen(silent) {
    return sb.rpc('kitchen_board', { p_from: null, p_days: S.kit.days }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) throw new Error(r.data.message);
      S.kit.data = r.data; S.kit.loaded = true;
      if (S.tab === 'kitchen') view();
      if (S.sheet && S.sheet.type === 'kitchen') renderSheet();
    }).catch(function (e) { if (!silent) fail(e); });
  }
  function kitRow(id) { return S.kit.data ? (S.kit.data.orders || []).filter(function (r) { return r.id === id; })[0] : null; }
  function kitCake(r) { return (r.variant || r.cake || 'Cake') + ', ' + r.size + ' inch' + (r.quantity > 1 ? ' × ' + r.quantity : ''); }
  var KCOLS = [['start', 'To start', ['not_started', 'scheduled']], ['prog', 'In progress', ['preparing', 'baking', 'assembling', 'decorating', 'in_production']], ['qc', 'Quality check', ['quality_check']], ['ready', 'Ready', ['ready']], ['done', 'Handed over', []]];
  function kitCard(r) {
    var tags = '';
    if (r.late) tags += '<span class="ccs-pill s-alert">Late</span>';
    if (r.has_dietary) tags += '<span class="ccs-pill s-alert">Dietary</span>';
    if (r.finish === 'custom') tags += '<span class="ccs-pill">Custom</span>';
    if (r.method === 'delivery') tags += '<span class="ccs-pill">Delivery' + (r.area ? ', ' + esc(r.area) : '') + '</span>';
    if (r.amend_pending && r.amend_pending.length) tags += '<span class="ccs-pill s-alert">Changed, check now</span>';
    if (r.brief_changed) tags += '<span class="ccs-pill s-action">Changed since brief</span>';
    else if (!r.brief_version && r.status === 'confirmed') tags += '<span class="ccs-pill s-off">No brief yet</span>';
    var inProg = ['preparing', 'baking', 'assembling', 'decorating'].indexOf(r.stage) > -1;
    var idx = stageIndex(r.stage), next = r.status === 'confirmed' && idx < STAGES.length - 2 ? STAGES[idx + 1] : null;
    var action = r.status !== 'confirmed' ? '' : next ? '<button type="button" class="ccs-btn ccs-good ccs-knext" data-act="k-next" data-id="' + r.id + '" data-v="' + next[0] + '">Move to ' + esc(next[1]) + '</button>' :
      r.stage === 'quality_check' ? '<button type="button" class="ccs-btn ccs-knext" data-act="open-kitchen" data-id="' + r.id + '">Check and mark Ready</button>' : '';
    return '<div class="ccs-kitem">' + kitCardBody(r, inProg, tags) + action + '</div>';
  }
  function kitCardBody(r, inProg, tags) {
    return '<button type="button" class="ccs-kcard' + (r.late ? ' is-late' : '') + '" data-act="open-kitchen" data-id="' + r.id + '">' +
      '<span class="ccs-kc-when">' + esc(whenLabel(r.date)) + ' · ' + esc(t12(r.time)) + '</span><b>' + esc(kitCake(r)) + '</b>' +
      '<span class="ccs-kc-sub">' + esc(r.reference) + ' · ' + esc(r.customer || '') + '</span>' +
      (r.message ? '<span class="ccs-kc-msg">“' + esc(r.message) + '”</span>' : '') +
      (inProg ? '<span class="ccs-kc-stage">' + esc(STAGE_LABEL[r.stage]) + '</span>' : '') +
      (tags ? '<span class="ccs-tags">' + tags + '</span>' : '') +
      (r.assignee ? '<span class="ccs-kc-who">Made by ' + esc(r.assignee) + '</span>' : '') + '</button>';
  }
  function kitchenView() {
    var K = S.kit, t = today();
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Kitchen</h1><p class="ccs-sub">' + esc(nice(t, true)) + '. Confirmed cakes only. Tap a cake to update it.</p></div>' +
      '<div class="ccs-chips" role="group" aria-label="Range">' + [[2, 'Today and tomorrow'], [7, 'Next 7 days']].map(function (c) { return '<button type="button" class="ccs-chip" data-act="k-range" data-v="' + c[0] + '" aria-pressed="' + (K.days === c[0]) + '">' + c[1] + '</button>'; }).join('') +
      '<button type="button" class="ccs-chip" data-act="k-refresh">Refresh</button></div></div>';
    if (!K.loaded) return h + '<p class="ccs-loading">Loading the kitchen board…</p>';
    var rows = K.data.orders || [];
    var groups = {}; KCOLS.forEach(function (c) { groups[c[0]] = []; });
    rows.forEach(function (r) {
      if (r.status === 'completed') return groups.done.push(r);
      for (var i = 0; i < 4; i++) if (KCOLS[i][2].indexOf(r.stage) > -1) return groups[KCOLS[i][0]].push(r);
      groups.start.push(r);
    });
    var late = rows.filter(function (r) { return r.late; }).length, todo = rows.filter(function (r) { return r.status === 'confirmed'; }).length;
    h += '<div class="ccs-kpis ccs-kpis-k">' +
      '<div class="ccs-kpi"><span class="ccs-kpi-l">Cakes to finish</span><b class="ccs-kpi-n">' + todo + '</b><span class="ccs-kpi-s">' + (K.days === 2 ? 'Today and tomorrow' : 'Next 7 days') + '</span></div>' +
      '<div class="ccs-kpi' + (late ? ' t-action' : '') + '"><span class="ccs-kpi-l">Running late</span><b class="ccs-kpi-n">' + late + '</b><span class="ccs-kpi-s">' + (late ? 'Past due and not ready' : 'None') + '</span></div>' +
      '<div class="ccs-kpi"><span class="ccs-kpi-l">Waiting for quality check</span><b class="ccs-kpi-n">' + groups.qc.length + '</b><span class="ccs-kpi-s">Needs a name to pass</span></div>' +
      '<div class="ccs-kpi t-good"><span class="ccs-kpi-l">Ready</span><b class="ccs-kpi-n">' + groups.ready.length + '</b><span class="ccs-kpi-s">Waiting for handover</span></div></div>';
    if (!rows.length) return h + '<div class="ccs-empty" style="margin-top:16px"><b>No confirmed cakes in this range.</b><span>Cakes appear here once front of house confirms them.</span></div>';
    h += '<div class="ccs-board">' + KCOLS.map(function (c) {
      var list = groups[c[0]];
      return '<section class="ccs-col ccs-col-' + c[0] + '"><h2>' + c[1] + ' <span>' + list.length + '</span></h2>' + (list.length ? list.map(kitCard).join('') : '<p class="ccs-quiet">Nothing here.</p>') + '</section>';
    }).join('') + '</div>';
    return h;
  }
  function openKitchen(id) {
    S.sheet = { type: 'kitchen', id: id, photos: [] }; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet();
    var go = function () {
      var r = kitRow(id); renderSheet();
      if (r && r.photos && r.photos.length) sb.storage.from('cake-references').createSignedUrls(r.photos, 900).then(function (u) { if (u.data && S.sheet && S.sheet.id === id) { S.sheet.photos = u.data.map(function (x) { return x.signedUrl; }).filter(Boolean); renderSheet(); } });
    };
    if (kitRow(id)) go(); else { var keep = S.kit.days; if (keep < 7) S.kit.days = 7; loadKitchen().then(function () { S.kit.days = keep; go(); }); }
  }
  // ---------- amend an order ----------
  function amendInit(o) {
    var i = (o.order_items || [])[0] || {}, c = o.customers || {}, pr = (S.setup.products || []).filter(function (p) { return p.name === i.product_name; })[0];
    var v = { date: o.required_date, time: String(o.required_time).slice(0, 5), product: pr ? pr.code : '', variant: i.variant || '', size: String(i.size_inch || ''), qty: String(i.quantity || 1),
      finish: i.finish || 'standard', design: i.design_description || '', message: i.cake_message || '', occasion: i.occasion || '', diet: o.has_dietary ? 'yes' : 'no',
      diets: (i.dietary || []).slice(), dietNote: i.dietary_note || '', knotes: i.kitchen_notes || '', cnotes: o.customer_notes || '', cname: c.full_name || '', cemail: c.email || '', cphone: c.phone || '', price: '' };
    return Object.assign({ orig: JSON.parse(JSON.stringify(v)), by: null, reason: '', preview: null, open: { when: true } }, v);
  }
  function amendSet(f, v) {
    var a = S.am; a[f] = v; a.preview = null;
    if (f === 'product') { var p = amProduct(); a.variant = p && p.variants.length ? (p.variants.indexOf(a.variant) > -1 ? a.variant : '') : ''; if (p && !p.sizes.some(function (z) { return String(z.inch) === a.size; })) a.size = ''; if (p && !p.supports_custom) a.finish = 'standard'; }
    renderSheet();
  }
  function amProduct() { return (S.setup.products || []).filter(function (p) { return p.code === S.am.product; })[0] || null; }
  function amendChanges() {
    var a = S.am, o0 = a.orig, ch = {};
    if (a.date !== o0.date) ch.date = a.date;
    if (a.time !== o0.time) ch.time = a.time;
    if (a.product !== o0.product) ch.product_code = a.product;
    if (a.variant !== o0.variant || a.product !== o0.product) ch.variant = a.variant;
    if (a.size !== o0.size) ch.size_inch = Number(a.size);
    if (a.qty !== o0.qty) ch.quantity = Number(a.qty);
    if (a.finish !== o0.finish) ch.finish = a.finish;
    if (a.design !== o0.design) ch.design = a.design;
    if (a.message !== o0.message) ch.message = a.message;
    if (a.occasion !== o0.occasion) ch.occasion = a.occasion;
    if (a.diet !== o0.diet) ch.has_dietary = a.diet === 'yes';
    if (a.diets.slice().sort().join('|') !== o0.diets.slice().sort().join('|')) ch.dietary = a.diets;
    if (a.dietNote !== o0.dietNote) ch.dietary_note = a.dietNote;
    if (a.knotes !== o0.knotes) ch.kitchen_notes = a.knotes;
    if (a.cnotes !== o0.cnotes) ch.customer_notes = a.cnotes;
    if (a.cname !== o0.cname) ch.customer_name = a.cname;
    if (a.cemail !== o0.cemail) ch.customer_email = a.cemail;
    if (a.cphone !== o0.cphone) ch.customer_phone = a.cphone;
    if (String(a.price).trim() !== '') ch.price = num(a.price);
    return ch;
  }
  function amendSend(commit) {
    var o = S.sheet.data, a = S.am, ch = amendChanges();
    if (!Object.keys(ch).length) { S.panelErr = 'Nothing has changed yet.'; return renderSheet(); }
    if (!a.by) { S.panelErr = 'Choose who asked for the change.'; return renderSheet(); }
    if (a.reason.trim().length < 3) { S.panelErr = 'Add a short reason for the change.'; return renderSheet(); }
    if (S.busy) return; S.busy = true; S.panelErr = null;
    sb.rpc('staff_amend_order', { p_order: o.id, p_version: o.version, p_changes: ch, p_requested_by: a.by, p_reason: a.reason.trim(), p_commit: !!commit }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) {
        S.panelErr = r.data.message;
        if (r.data.error === 'changed') { S.panel = null; S.am = null; toast(r.data.message, true); return openOrder(o.id); }
        return renderSheet();
      }
      if (!commit) { a.preview = r.data; renderSheet(); var bd = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (bd) bd.scrollTop = 0; return; }
      var msg = 'Saved as revision ' + r.data.revision + '.';
      if (r.data.kitchen_ack_required) msg += ' The kitchen is asked to confirm the change.';
      if (r.data.needs_reprint) msg += ' Print the new kitchen brief.';
      S.am = null; S.panel = null; S.dirty = {}; toast(msg); openOrder(o.id); loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function amendPanel(o, total, paid) {
    var a = S.am, err = S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '';
    if (a.preview) return amendReview(o, a.preview, err);
    var p = amProduct(), L = S.setup.location, slots = [];
    var t0 = L.collection_open.split(':').map(Number), t1 = L.collection_close.split(':').map(Number);
    for (var m = t0[0] * 60 + t0[1]; m <= t1[0] * 60 + t1[1]; m += L.slot_minutes) slots.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    if (slots.indexOf(a.time) < 0) slots.push(a.time); slots.sort();
    var sec = function (key, title, now, body) { var op = !!a.open[key]; return '<div class="ccs-amsec' + (op ? ' is-open' : '') + '"><button type="button" class="ccs-amhead" data-act="am-open" data-v="' + key + '" aria-expanded="' + op + '"><b>' + title + '</b><span>' + esc(now) + '</span></button>' + (op ? '<div class="ccs-ambody">' + body + '</div>' : '') + '</div>'; };
    var chip = function (f, val, label, on) { return '<button type="button" class="ccs-chip" data-act="am-set" data-f="' + f + '" data-v="' + esc(val) + '" aria-pressed="' + !!on + '">' + esc(label) + '</button>'; };
    var fld = function (id, f, label, value, extra) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><input class="ccs-input" id="' + id + '" data-am="' + f + '" value="' + esc(value) + '"' + (extra || '') + '></div>'; };
    var area = function (id, f, label, value, ph) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><textarea class="ccs-input" id="' + id + '" data-am="' + f + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(value) + '</textarea></div>'; };
    var h = '<div class="ccs-panel ccs-amend"><b>Amend ' + esc(o.reference) + '</b><p class="ccs-hint">Open only what is changing. Nothing is saved until you review and save.</p>';
    h += sec('when', 'Date and time', nice(a.date) + ', ' + t12(a.time),
      '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="am-date">Date</label><input class="ccs-input" type="date" id="am-date" data-am="date" value="' + esc(a.date) + '"></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="am-time">Time</label><select class="ccs-input" id="am-time" data-am="time">' + slots.map(function (x) { return '<option value="' + x + '"' + (x === a.time ? ' selected' : '') + '>' + t12(x) + '</option>'; }).join('') + '</select></div></div>');
    h += sec('cake', 'Cake, size and quantity', (a.variant || (p ? p.name : 'Cake')) + ', ' + (a.size || '?') + ' inch' + (a.qty !== '1' ? ' × ' + a.qty : ''),
      '<div class="ccs-field"><label class="ccs-label" for="am-prod">Cake</label><select class="ccs-input" id="am-prod" data-act-change="product">' + (p ? '' : '<option value="">Choose a cake</option>') + (S.setup.products || []).map(function (x) { return '<option value="' + esc(x.code) + '"' + (x.code === a.product ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
      (p && p.variants.length ? '<div class="ccs-field"><span class="ccs-label">' + esc(p.choice_label || 'Which one?') + '</span><div class="ccs-chips">' + p.variants.map(function (x) { return chip('variant', x, x, a.variant === x); }).join('') + '</div></div>' : '') +
      (p ? '<div class="ccs-field"><span class="ccs-label">Size</span><div class="ccs-chips">' + p.sizes.map(function (z) { return chip('size', String(z.inch), z.inch + ' inch · ' + money(z.price), a.size === String(z.inch)); }).join('') + '</div></div>' : '') +
      fld('am-qty', 'qty', 'Quantity', a.qty, ' type="number" min="1" max="50" inputmode="numeric" style="max-width:140px"'));
    h += sec('look', 'Design and message', (a.finish === 'custom' ? 'Custom design' : 'Standard finish') + (a.message ? ' · “' + a.message + '”' : ''),
      '<div class="ccs-chips">' + chip('finish', 'standard', 'Standard finish', a.finish === 'standard') + (!p || p.supports_custom ? chip('finish', 'custom', 'Custom design', a.finish === 'custom') : '') + '</div>' +
      (a.finish === 'custom' || a.design ? area('am-design', 'design', 'Design', a.design) : '') +
      fld('am-msg', 'message', 'Message on the cake', a.message, ' maxlength="60"') +
      '<div class="ccs-field"><label class="ccs-label" for="am-occ">Occasion</label><select class="ccs-input" id="am-occ" data-am="occasion"><option value="">None</option>' + OCCASIONS.map(function (x) { return '<option' + (x === a.occasion ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>');
    h += sec('diet', 'Dietary and allergies', a.diet === 'yes' ? ([].concat(a.diets, a.dietNote ? [a.dietNote] : []).join(', ') || 'Yes') : 'None',
      '<div class="ccs-chips">' + chip('diet', 'no', 'No', a.diet === 'no') + chip('diet', 'yes', 'Yes', a.diet === 'yes') + '</div>' +
      (a.diet === 'yes' ? '<div class="ccs-chips">' + DIETS.map(function (x) { return '<button type="button" class="ccs-chip" data-act="am-diet" data-v="' + esc(x) + '" aria-pressed="' + (a.diets.indexOf(x) > -1) + '">' + esc(x) + '</button>'; }).join('') + '</div>' + fld('am-dnote', 'dietNote', 'Details for the kitchen', a.dietNote) : ''));
    h += sec('notes', 'Kitchen instructions and notes', a.knotes || a.cnotes ? 'Has notes' : 'None',
      area('am-knotes', 'knotes', 'Kitchen instructions', a.knotes, 'Filling, frosting, extras') + area('am-cnotes', 'cnotes', 'Order notes', a.cnotes));
    h += sec('cust', 'Contact on this order', a.cname + (a.cphone ? ' · ' + a.cphone : '') + (a.cemail ? ' · ' + a.cemail : ''),
      '<div class="ccs-row">' + fld('am-cname', 'cname', 'Name', a.cname) + fld('am-cphone', 'cphone', 'Mobile', a.cphone, ' inputmode="tel"') + '</div>' + fld('am-cemail', 'cemail', 'Email', a.cemail, ' type="email"') +
      '<p class="ccs-hint">Changes this order only. The customer profile stays as it is. To change the profile, open Customer profile.</p>');
    if (can('manager')) h += sec('price', 'Agreed price', a.price ? money(num(a.price)) + ' (set by you)' : money(total) + ' now',
      fld('am-price', 'price', 'New agreed price (FJD)', a.price, ' inputmode="decimal" placeholder="Leave blank to recalculate from the price list"') + '<p class="ccs-hint">Payments already recorded are never changed.</p>');
    h += '<div class="ccs-field"><span class="ccs-label">Who asked for the change?</span><div class="ccs-chips">' + [['guest', 'Guest'], ['staff', 'Our team'], ['other', 'Someone else']].map(function (x) { return chip('by', x[0], x[1], a.by === x[0]); }).join('') + '</div>' +
      (a.by === 'staff' ? '<span class="ccs-hint">A time change by our team is recorded as our delay, not the guest\'s request.</span>' : '') + '</div>';
    h += area('am-reason', 'reason', 'Reason', a.reason, 'For example: guest wants a bigger cake for more people');
    return h + err + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="am-review">Review changes</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Cancel</button></div></div>';
  }
  function amendReview(o, r, err) {
    var h = '<div class="ccs-panel ccs-amend"><b>Check these changes to ' + esc(o.reference) + '</b><ul class="ccs-amlist">' + r.changes.map(function (c) { return '<li><span>' + esc(c.label) + '</span><b><s>' + esc(c.from) + '</s> → ' + esc(c.to) + '</b></li>'; }).join('') + '</ul>';
    h += '<div class="ccs-money"><div><span>Total before</span><b>' + money(r.price_before) + '</b></div><div><span>New total</span><b>' + money(r.price_after) + '</b></div><div><span>Paid</span><b>' + money(r.paid) + '</b></div><div><span>' + (r.excess_paid > 0 ? 'Over-paid' : 'To pay') + '</span><b>' + money(r.excess_paid > 0 ? r.excess_paid : r.balance_after) + '</b></div></div>';
    (r.warnings || []).forEach(function (w) { h += '<p class="ccs-note">' + esc(w) + '</p>'; });
    if (r.kitchen_ack_required) h += '<p class="ccs-note">The kitchen has started this cake. They will be asked to confirm they have seen the change.</p>';
    if (r.needs_reprint) h += '<p class="ccs-note">A kitchen brief was printed. Print the new version after saving and throw the old one away.</p>';
    if (r.contact_only) h += '<p class="ccs-hint">Contact changes apply to this order only. The customer profile is not changed.</p>';
    if (r.time_change_cause === 'business_delay') h += '<p class="ccs-hint">Recorded as our delay. The original time is kept.</p>';
    h += '<p class="ccs-hint">Requested by ' + ({ guest: 'the guest', staff: 'our team', other: 'someone else' })[S.am.by] + '. Reason: ' + esc(S.am.reason.trim()) + '</p>';
    h += '<p class="ccs-hint">' + (S.setup && S.setup.guest_emails ? 'The customer is not emailed about changes yet.' : 'Guest emails are off. Tell the customer by WhatsApp or phone after saving.') + '</p>';
    return h + err + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="am-save">Save amendment</button><button type="button" class="ccs-btn ccs-ghost" data-act="am-edit">Back to edit</button></div></div>';
  }
  function changeHistory(o) {
    var list = (o.order_amendments || []).slice().sort(function (a, b) { return b.revision - a.revision; });
    if (!list.length) return '';
    return '<section class="ccs-box"><h3>Change history</h3><div class="ccs-amhist">' + list.map(function (a) {
      return '<div class="ccs-amrow"><p class="ccs-amwhen"><b>' + esc(stamp(a.amended_at)) + '</b> · Revision ' + a.revision + ' · Updated by ' + esc(a.staff_label || 'staff') + '</p>' +
        '<p class="ccs-hint">Requested by ' + ({ guest: 'the guest', staff: 'our team', other: 'someone else' })[a.requested_by] + (a.time_change_cause === 'business_delay' ? ' (our delay)' : '') + '</p>' +
        '<ul class="ccs-amlist">' + (a.changes || []).map(function (c) { return '<li><span>' + esc(c.label) + '</span><b>' + esc(c.from) + ' → ' + esc(c.to) + '</b></li>'; }).join('') + '</ul>' +
        '<p class="ccs-hint">Reason: ' + esc(a.reason) + '</p>' +
        (a.excess_paid > 0 ? '<p class="ccs-note">' + money(a.excess_paid) + ' over-paid at this change. Refund or credit is a manager decision.</p>' : '') +
        (a.kitchen_ack_required ? '<p class="ccs-hint">' + (a.kitchen_ack_at ? 'Kitchen confirmed: ' + esc(a.kitchen_ack_by) + ', ' + esc(stamp(a.kitchen_ack_at)) : '<b style="color:var(--ccs-red)">Waiting for the kitchen to confirm</b>') + '</p>' : '') +
        (a.notification_status ? '<p class="ccs-hint">Customer: ' + esc(a.notification_status) + '</p>' : '') + '</div>';
    }).join('') + '</div></section>';
  }
  function kitAckBox(r, err) {
    return '<div class="ccs-alert ccs-ackbox"><b>This order was changed after you started.</b>' + r.amend_pending.map(function (a) {
      return '<ul class="ccs-amlist">' + (a.changes || []).map(function (c) { return '<li><span>' + esc(c.label) + '</span><b>' + esc(c.from) + ' → ' + esc(c.to) + '</b></li>'; }).join('') + '</ul>';
    }).join('') + '<div class="ccs-row" style="align-items:end"><div class="ccs-field"><label class="ccs-label" for="k-ack">Your name</label><input class="ccs-input" id="k-ack" autocomplete="off" placeholder="Name"></div><button type="button" class="ccs-btn ccs-good" data-act="k-ack">Got it, I have seen the change</button></div>' + nameChips('k-ack') + err + '</div>';
  }
  function kitAck() {
    var id = S.sheet.id, who = val('k-ack').trim(); if (S.busy) return;
    if (who.length < 2) { S.panelErr = 'Enter your name.'; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('kitchen_ack_amendment', { p_order: id, p_name: who }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      delete S.dirty['k-ack']; rememberName(who); var row = kitRow(id); if (row) row.amend_pending = null; toast('Thanks. The change is confirmed.'); loadKitchen(true); renderSheet();
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function kitchenSheet() {
    var r = kitRow(S.sheet.id);
    if (!r) return sheetHead('Loading…') + '<div class="ccs-sheet-body"><p class="ccs-loading">' + (S.kit.loaded ? 'This cake is not on the kitchen board. Only confirmed cakes due in the next 7 days, or late ones, are shown.' : 'Loading…') + '</p></div>';
    var idx = stageIndex(r.stage), done = r.status === 'completed', err = S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '';
    var h = sheetHead(esc(r.reference), stagePill(r.stage)) + '<div class="ccs-sheet-body">';
    if (r.late) h += '<div class="ccs-alert">Running late: due ' + esc(whenLabel(r.date)) + ' at ' + esc(t12(r.time)) + '.</div>';
    if (r.has_dietary) h += '<div class="ccs-alert">Dietary or allergy: ' + esc([].concat(r.dietary || [], r.dietary_note ? [r.dietary_note] : []).join(', ') || 'see notes') + '</div>';
    if (r.amend_pending && r.amend_pending.length) h += kitAckBox(r, err);
    if (r.brief_changed) h += '<p class="ccs-note">Details changed after brief version ' + r.brief_version + ' was printed. Ask front of house to print the new version.</p>';
    // progress
    h += '<section class="ccs-box"><h3>Progress</h3><ol class="ccs-kstages">' + STAGES.map(function (s, i) { return '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-now' : '') + '">' + esc(s[1]) + '</li>'; }).join('') + '</ol>';
    if (done) h += '<p class="ccs-hint">Handed over' + (r.handed_over_at ? ' ' + esc(stamp(r.handed_over_at)) : '') + '. Checked by ' + esc(r.qc_by || '—') + '.</p>';
    else if (r.stage === 'ready') h += '<p class="ccs-hint">Ready since ' + esc(stamp(r.ready_at)) + ', checked by ' + esc(r.qc_by) + '. Front of house hands it over from the order screen.</p>' + err +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="k-stage" data-v="quality_check">Back to quality check</button></div>';
    else if (r.stage === 'quality_check') h += '<div class="ccs-panel"><b>Quality check</b><p class="ccs-hint">Flavour and size right, message spelled exactly, design matches, dietary needs followed, clean finish and box.</p><div class="ccs-field"><label class="ccs-label" for="k-qc">Checked by</label><input class="ccs-input" id="k-qc" placeholder="Your name" autocomplete="off">' + nameChips('k-qc') + '</div>' + err +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="k-ready">Passed, mark Ready</button><button type="button" class="ccs-btn ccs-ghost" data-act="k-stage" data-v="decorating">Back to decorating</button></div></div>';
    else {
      var nx = STAGES[idx + 1];
      h += err + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good ccs-wide" data-act="k-stage" data-v="' + nx[0] + '">Move to ' + esc(nx[1]) + '</button></div>' +
        '<div class="ccs-field"><span class="ccs-label">Or set the stage</span><div class="ccs-chips">' + STAGES.slice(0, 7).map(function (s) { return '<button type="button" class="ccs-chip" data-act="k-stage" data-v="' + s[0] + '" aria-pressed="' + (r.stage === s[0]) + '">' + esc(s[1]) + '</button>'; }).join('') + '</div></div>';
    }
    if (!done) h += '<div class="ccs-row" style="align-items:end"><div class="ccs-field"><label class="ccs-label" for="k-who">Made by</label><input class="ccs-input" id="k-who" value="' + esc(r.assignee || '') + '" placeholder="Name of the baker" autocomplete="off"></div><button type="button" class="ccs-btn ccs-ghost" data-act="k-assign">Save name</button></div>' + nameChips('k-who');
    h += '</section>';
    // the cake
    h += '<section class="ccs-box"><h3>Cake</h3><p class="ccs-big">' + esc(kitCake(r)) + '</p>' + (r.message ? '<p class="ccs-kmsg">“' + esc(r.message) + '”</p>' : '') + '<dl class="ccs-kv">' +
      kv('Finish', r.finish === 'custom' ? 'Custom design' : 'Standard finish') + kv('Design', r.design) + kv('Occasion', r.occasion) + kv('Serves', r.serves) + kv('Order notes', r.order_notes) + kv('Kitchen notes', r.kitchen_notes) + '</dl>' +
      (S.sheet.photos.length ? '<div class="ccs-photos">' + S.sheet.photos.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Reference photo"></a>'; }).join('') + '</div>' : (r.photos && r.photos.length ? '<p class="ccs-hint">Loading reference photos…</p>' : '')) + '</section>';
    h += '<section class="ccs-box"><h3>' + (r.method === 'delivery' ? 'Delivery' : 'Collection') + '</h3><p class="ccs-big">' + esc(nice(r.date, true)) + ' at ' + esc(t12(r.time)) + '</p><dl class="ccs-kv">' + kv('For', r.customer) + kv('Area', r.method === 'delivery' ? r.area : 'Café counter') + kv('Short notice', r.rush ? 'Yes' : '') + '</dl></section>';
    return h + '</div>';
  }
  function kitStage(stage, qc, cardId) {
    var id = cardId || S.sheet.id; if (S.busy) return clearBusy(); S.busy = true; S.panelErr = null;
    sb.rpc('kitchen_set_stage', { p_order: id, p_stage: stage, p_name: qc || null }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { if (S.sheet && !cardId) { S.panelErr = r.data.message; return renderSheet(); } return toast(r.data.message, true); }
      if (stage === 'ready') { delete S.dirty['k-qc']; rememberName(qc); }
      var row = kitRow(id); if (row) row.stage = stage;
      toast(stage === 'ready' ? 'Marked Ready' : (row ? row.reference + ' moved to ' : 'Moved to ') + STAGE_LABEL[stage]); loadKitchen(true); loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function recentNames() {
    var out = [], seen = {};
    var add = function (n) { n = String(n || '').trim(); var k = n.toLowerCase(); if (n.length > 1 && !seen[k]) { seen[k] = 1; out.push(n); } };
    try { (JSON.parse(localStorage.getItem('ccs-names') || '[]') || []).forEach(function (x) { if (Date.now() - x.t < 14 * 864e5) add(x.n); }); } catch (e) {}
    ((S.kit.data && S.kit.data.orders) || []).forEach(function (r) { add(r.assignee); add(r.qc_by); });
    return out.slice(0, 8);
  }
  function rememberName(n) {
    n = String(n || '').trim(); if (n.length < 2) return;
    try { var l = (JSON.parse(localStorage.getItem('ccs-names') || '[]') || []).filter(function (x) { return x.n.toLowerCase() !== n.toLowerCase() && Date.now() - x.t < 14 * 864e5; }); l.unshift({ n: n, t: Date.now() }); localStorage.setItem('ccs-names', JSON.stringify(l.slice(0, 12))); } catch (e) {}
  }
  function nameChips(field) {
    var names = recentNames(); if (!names.length) return '';
    return '<div class="ccs-chips ccs-namechips" aria-label="Recent names">' + names.map(function (n) { return '<button type="button" class="ccs-chip" data-act="fill" data-f="' + field + '" data-v="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div>';
  }
  function kitAssign() {
    var id = S.sheet.id;
    sb.rpc('kitchen_assign', { p_order: id, p_name: val('k-who') }).then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      delete S.dirty['k-who']; rememberName(val('k-who')); toast('Saved'); loadKitchen(true);
    }).catch(fail);
  }

  // ---------- new order (staff guided flow) ----------
  function freshDraft() { return { key: uuid(), source: 'walk_in', step: 0, reached: 0, phone: '', matches: null, customer: null, isNew: false, name: '', email: '', whatsapp: true, optIn: false,
    product: null, variant: null, size: null, finish: null, design: '', message: '', occasion: null, diet: null, diets: [], dietNote: '', notes: '', qty: 1,
    date: '', time: '', rush: '', rushBy: '', fromCal: false, method: 'collection', zone: null, address: '', fee: '', contact: '', confirmNow: true, askDeposit: false, deposit: '', payNow: false, payAmount: '', payMethod: 'cash', result: null, err: null, errField: null }; }
  var D = freshDraft();
  // Unfinished walk-in orders are kept on this device for 12 hours, per staff login, and cleared at sign out (U6)
  function draftKey() { return S.me ? 'ccs-draft-' + S.me.user_id : null; }
  function draftHasContent() { return !D.result && (digits(D.phone).length >= 3 || D.reached > 0 || !!D.product); }
  function saveDraft() {
    var k = draftKey(); if (!k) return;
    try { if (draftHasContent()) { if (!D.saved) D.saved = Date.now(); localStorage.setItem(k, JSON.stringify(Object.assign({}, D, { matches: null, err: null, errField: null, confirmReset: false, saved: D.saved }))); } else localStorage.removeItem(k); } catch (e) {}
  }
  function loadDraft() {
    var k = draftKey(); if (!k) return;
    try {
      var raw = localStorage.getItem(k); if (!raw) return;
      var d = JSON.parse(raw);
      if (!d || !d.saved || Date.now() - d.saved > 12 * 3600 * 1000) { localStorage.removeItem(k); return; }
      D = Object.assign(freshDraft(), d, { matches: null, result: null, restored: true });
    } catch (e) {}
  }
  function clearDraft() { var k = draftKey(); try { if (k) localStorage.removeItem(k); } catch (e) {} D = freshDraft(); }
  function draftWho() { return D.customer ? D.customer.full_name : (D.name || D.phone || ''); }
  function prod() { if (!S.setup || !D.product) return null; return S.setup.products.filter(function (p) { return p.code === D.product; })[0] || null; }
  function sizeObj() { var p = prod(); return p && D.size ? p.sizes.filter(function (s) { return s.inch === D.size; })[0] : null; }
  function dPrice() { var s = sizeObj(); return s ? Number(s.price) * (D.qty || 1) : null; }
  function zoneObj() { return ((S.setup && S.setup.delivery_zones) || []).filter(function (z) { return z.name === D.zone; })[0] || null; }
  function dFee() { if (D.method !== 'delivery') return 0; var z = zoneObj(); if (!z) return 0; return z.fee != null ? Number(z.fee) : (num(D.fee) || 0); }
  function dTotal() { var p = dPrice(); return p == null ? null : p + dFee(); }
  function delivOk() { if (D.method !== 'delivery') return true; var z = zoneObj(), f = num(D.fee); return !!z && D.address.trim().length >= 5 && (z.fee != null || (f != null && f >= 0)); }
  function leadDays() { var L = S.setup.location, p = prod(); return D.finish === 'custom' ? L.lead_days_custom : (p ? p.lead_days : L.lead_days_standard); }
  function minDate() { return addDays(today(), leadDays()); }
  function tooSoon() { return D.date && D.date < minDate(); }
  function rushOk() { return !tooSoon() || (D.rush.trim().length >= 3 && D.rushBy.trim().length >= 2); }
  var NSTEPS = [
    { k: 'Customer', sum: function () { return D.customer ? D.customer.full_name + ' · ' + D.customer.phone + (D.customer.orders_count ? ' · ' + D.customer.orders_count + ' earlier orders' : '') : (D.isNew && D.name ? D.name + ' · ' + D.phone + ' (new)' : ''); } },
    { k: 'Cake', sum: function () { var p = prod(); return p && D.size && (!p.variants.length || D.variant) ? (D.variant || p.name) + ', ' + D.size + ' inch' + (D.qty > 1 ? ' × ' + D.qty : '') + ' · ' + money(dPrice()) : ''; } },
    { k: 'Finish', sum: function () { if (!D.finish || !D.diet || (D.finish === 'custom' && D.design.trim().length < 3)) return ''; return [D.finish === 'custom' ? 'Custom design' : 'Standard finish', D.message ? '“' + D.message + '”' : '', D.occasion, D.diet === 'yes' ? (D.diets.join(', ') || 'Dietary noted') : 'No dietary needs'].filter(Boolean).join(' · '); } },
    { k: 'When', sum: function () { return D.date && D.time && rushOk() && delivOk() ? nice(D.date) + ' at ' + t12(D.time) + (tooSoon() ? ' (short notice)' : '') + (D.method === 'delivery' ? ' · Delivery to ' + D.zone + ' (' + money(dFee()) + ')' : ' · Collect from café') : ''; } },
    { k: 'Payment', sum: function () { return ''; } }
  ];
  function nextOpen(from) { for (var i = from; i < NSTEPS.length; i++) if (!NSTEPS[i].sum() || i === NSTEPS.length - 1) return i; return NSTEPS.length - 1; }
  // New order can run on its own page or as a panel over the calendar
  function newInSheet() { return !!(S.sheet && S.sheet.type === 'new'); }
  function newOpen() { return S.tab === 'new' || newInSheet(); }
  function newRender() { if (newInSheet()) renderSheet(); else view(); }
  function goStep(i) { D.restored = false; D.step = i; D.reached = Math.max(D.reached, i); D.err = null; D.errField = null; newRender(); var el = document.getElementById('ccs-nstep-' + i); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function ferr(f) { return D.errField === f && D.err ? '<p class="ccs-err">' + esc(D.err) + '</p>' : ''; }

  function newView() {
    if (D.result) {
      var r = D.result;
      return '<div class="ccs-done"><div class="ccs-tick" aria-hidden="true">✓</div><h1 class="ccs-title">' + esc(r.reference) + ' is saved</h1><p>' + esc(statusLabel(r.status)) + '. ' +
        (r.status === 'confirmed' ? 'Hand the customer their order number.' : r.status === 'awaiting_deposit' ? 'It confirms itself as soon as the deposit is recorded.' : 'It is in Needs action for review.') + '</p>' +
        '<div class="ccs-actions-row">' + '<button type="button" class="ccs-btn ccs-ghost" data-act="open-order" data-id="' + r.order_id + '">Open order</button>' + (D.fromCal ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cal-back">Back to calendar</button>' : '') + '<button type="button" class="ccs-btn ccs-new" data-act="new-again">' + NAV_ICON['new'] + 'New order</button></div></div>';
    }
    var inSheet = newInSheet();
    var h = inSheet ? (draftHasContent() && !D.confirmReset ? '<div class="ccs-newtop"><button type="button" class="ccs-link ccs-red" data-act="new-again">Start over</button></div>' : '')
      : '<div class="ccs-head"><div><h1 class="ccs-title">New order</h1><p class="ccs-sub">For walk-in, phone, WhatsApp and social media orders</p></div>' + (draftHasContent() && !D.confirmReset ? '<button type="button" class="ccs-link ccs-red" data-act="new-again">Start over</button>' : '') + '</div>';
    if (D.confirmReset) h += '<div class="ccs-panel ccs-confirm" role="alert"><b>Clear this order?</b><p class="ccs-hint">The customer, cake and date you have entered will be lost.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="new-clear">Clear order</button><button type="button" class="ccs-btn ccs-ghost" data-act="new-keep">Keep going</button></div></div>';
    if (D.fromCal && D.date && !D.confirmReset) h += '<div class="ccs-note ccs-calnote"><span>Pickup date from the calendar: <b>' + esc(nice(D.date, true)) + (D.time ? ' at ' + esc(t12(D.time)) : '') + '</b>. Change it in the When step if needed.</span>' + (inSheet ? '' : '<button type="button" class="ccs-link" data-act="cal-back">Back to calendar</button>') + '</div>';
    if (D.repeat && !D.confirmReset) h += repeatNote();
    else if (D.restored && draftHasContent()) h += '<p class="ccs-note">Carrying on the unfinished order' + (draftWho() ? ' for ' + esc(draftWho()) : '') + ', started ' + esc(stamp(D.saved)) + '.</p>';
    h += '<ol class="ccs-nprog" aria-label="Progress">' + NSTEPS.map(function (st, i) { var c = i === D.step ? 'is-now' : (i <= D.reached && st.sum() ? 'is-done' : ''); return '<li class="' + c + '"><span>' + (c === 'is-done' ? '&#10003;' : (i + 1)) + '</span>' + st.k + '</li>'; }).join('') + '</ol>';
    h += '<p class="ccs-label" style="margin:0 0 8px">How did they order?</p><div class="ccs-chips" role="group" aria-label="How they ordered" style="margin-bottom:14px">' + SOURCES.map(function (s) { return '<button type="button" class="ccs-chip" data-act="n-source" data-v="' + s[0] + '" aria-pressed="' + (D.source === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="ccs-steps">';
    NSTEPS.forEach(function (st, i) {
      var open = i === D.step, done = !open && i <= D.reached && st.sum();
      if (!open && !done) return;
      h += '<section class="ccs-step" id="ccs-nstep-' + i + '">';
      if (done) h += '<button type="button" class="ccs-sum" data-act="n-edit" data-v="' + i + '"><span><small>' + st.k + '</small><b>' + esc(st.sum()) + '</b></span><em>Change</em></button>';
      else h += '<div class="ccs-step-body">' + [stepCustomer, stepCake, stepFinish, stepWhen, stepPay][i]() + '</div>';
      h += '</section>';
    });
    return h + '</div>';
  }
  function stepCustomer() {
    var h = '<h2 class="ccs-step-q">Who is the cake for?</h2><div class="ccs-field"><label class="ccs-label" for="n-phone">Customer mobile</label><input class="ccs-input" id="n-phone" type="tel" inputmode="tel" placeholder="Start typing the number" value="' + esc(D.phone) + '" data-n="phone" autocomplete="off"></div>' + ferr('phone');
    if (D.matches && D.matches.length) {
      h += '<div class="ccs-field"><span class="ccs-label">Existing customers</span>' + D.matches.map(function (m, k) { return '<button type="button" class="ccs-match" data-act="n-pick" data-v="' + k + '"><span><b style="color:var(--ccs-ink)">' + esc(m.full_name) + '</b><br><span class="ccs-hint">' + esc(m.phone) + (m.favourite_cake ? ' · usually ' + esc(m.favourite_cake) : '') + '</span></span><span class="ccs-hint">' + (m.orders_count ? m.orders_count + ' orders' : 'No orders yet') + '</span></button>'; }).join('') + '</div>';
    }
    if (D.isNew || (D.matches && !D.matches.length && digits(D.phone).length >= 7)) {
      D.isNew = true;
      h += '<div class="ccs-panel"><b>New customer</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-name">Full name</label><input class="ccs-input" id="n-name" data-n="name" value="' + esc(D.name) + '" autocomplete="off"></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="n-email">Email (optional)</label><input class="ccs-input" id="n-email" type="email" data-n="email" value="' + esc(D.email) + '"></div></div>' + ferr('name') +
        '<label class="ccs-check"><input type="checkbox" data-nc="whatsapp"' + (D.whatsapp ? ' checked' : '') + '> This number is on WhatsApp</label>' +
        '<label class="ccs-check"><input type="checkbox" data-nc="optIn"' + (D.optIn ? ' checked' : '') + '> Customer agrees to receive cake specials and reminders</label>' +
        '<button type="button" class="ccs-btn" data-act="n-cust-next">Continue</button></div>';
    } else if (digits(D.phone).length >= 3 && D.matches && D.matches.length) {
      h += '<button type="button" class="ccs-link" data-act="n-newcust">Not listed? Add as a new customer</button>';
    }
    return h;
  }
  function stepCake() {
    var ps = S.setup.products, p = prod();
    var h = '<h2 class="ccs-step-q">Which cake?</h2><div class="ccs-grid-cakes">' + ps.map(function (x) { return '<button type="button" class="ccs-cake" data-act="n-prod" data-v="' + esc(x.code) + '" aria-pressed="' + (D.product === x.code) + '"><span class="ccs-dot" style="background:' + esc(x.swatch || '#ddd') + '"></span>' + esc(x.name) + '</button>'; }).join('') + '</div>';
    if (p && p.variants.length) h += '<div class="ccs-field"><span class="ccs-label">' + esc(p.choice_label || 'Which one?') + '</span><div class="ccs-chips">' + p.variants.map(function (v) { return '<button type="button" class="ccs-chip" data-act="n-var" data-v="' + esc(v) + '" aria-pressed="' + (D.variant === v) + '">' + esc(v) + '</button>'; }).join('') + '</div></div>';
    if (p && (!p.variants.length || D.variant)) {
      h += '<div class="ccs-field"><span class="ccs-label">Size</span><div class="ccs-chips">' + p.sizes.map(function (s) { return '<button type="button" class="ccs-chip" data-act="n-size" data-v="' + s.inch + '" aria-pressed="' + (D.size === s.inch) + '">' + s.inch + ' inch · ' + money(s.price) + '</button>'; }).join('') + '</div>' + (sizeObj() ? '<span class="ccs-hint">' + esc(sizeObj().serves || '') + '</span>' : '') + '</div>';
      if (D.size) h += '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-qty">How many cakes</label><input class="ccs-input" id="n-qty" type="number" min="1" max="50" value="' + D.qty + '" data-n="qty"></div></div><button type="button" class="ccs-btn" data-act="n-next" data-v="2">Continue</button>';
    }
    return h;
  }
  function stepFinish() {
    var p = prod();
    var h = '<h2 class="ccs-step-q">How should it look?</h2><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-finish" data-v="standard" aria-pressed="' + (D.finish === 'standard') + '">Standard finish</button>' +
      (p && p.supports_custom ? '<button type="button" class="ccs-chip" data-act="n-finish" data-v="custom" aria-pressed="' + (D.finish === 'custom') + '">Custom design</button>' : '') + '</div>';
    if (!D.finish) return h;
    if (D.finish === 'custom') h += '<div class="ccs-field"><label class="ccs-label" for="n-design">Design details</label><textarea class="ccs-input" id="n-design" data-n="design" placeholder="Colours, theme, toppers, candles">' + esc(D.design) + '</textarea></div>' + ferr('design');
    if (p && p.supports_message) h += '<div class="ccs-field"><label class="ccs-label" for="n-msg">Message on the cake (optional)</label><input class="ccs-input" id="n-msg" maxlength="40" data-n="message" value="' + esc(D.message) + '"></div>' + ferr('message');
    h += '<div class="ccs-field"><span class="ccs-label">Occasion (optional)</span><div class="ccs-chips">' + OCCASIONS.map(function (o) { return '<button type="button" class="ccs-chip" data-act="n-occ" data-v="' + o + '" aria-pressed="' + (D.occasion === o) + '">' + o + '</button>'; }).join('') + '</div></div>';
    h += '<div class="ccs-field"><span class="ccs-label">Any dietary needs or allergies?</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-diet" data-v="no" aria-pressed="' + (D.diet === 'no') + '">No</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="yes" aria-pressed="' + (D.diet === 'yes') + '">Yes</button></div>' + ferr('diet') + '</div>';
    if (D.diet === 'yes') h += '<div class="ccs-panel"><div class="ccs-chips">' + DIETS.map(function (d) { return '<button type="button" class="ccs-chip" data-act="n-diets" data-v="' + esc(d) + '" aria-pressed="' + (D.diets.indexOf(d) > -1) + '">' + esc(d) + '</button>'; }).join('') + '</div><input class="ccs-input" data-n="dietNote" id="n-dnote" placeholder="Details for the kitchen" value="' + esc(D.dietNote) + '"></div>';
    h += '<div class="ccs-field"><label class="ccs-label" for="n-notes">Other notes (optional)</label><input class="ccs-input" id="n-notes" data-n="notes" value="' + esc(D.notes) + '"></div>';
    return h + '<button type="button" class="ccs-btn" data-act="n-finish-next">Continue</button>';
  }
  function stepWhen() {
    var L = S.setup.location, slots = [], o = L.collection_open.split(':').map(Number), c = L.collection_close.split(':').map(Number);
    for (var m = o[0] * 60 + o[1]; m <= c[0] * 60 + c[1]; m += L.slot_minutes) slots.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    var closed = (S.setup.closed_dates || []).indexOf(D.date) > -1;
    var dl = D.method === 'delivery', zones = S.setup.delivery_zones || [], zo = zoneObj();
    var h = '<h2 class="ccs-step-q">Collection or delivery, and when?</h2><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-method" data-v="collection" aria-pressed="' + !dl + '">Collect from café</button><button type="button" class="ccs-chip" data-act="n-method" data-v="delivery" aria-pressed="' + dl + '">Delivery</button></div>';
    if (dl) {
      h += '<div class="ccs-panel"><div class="ccs-field"><span class="ccs-label">Delivery area</span><div class="ccs-chips">' + zones.map(function (z) { return '<button type="button" class="ccs-chip" data-act="n-zone" data-v="' + esc(z.name) + '" aria-pressed="' + (D.zone === z.name) + '">' + esc(z.name) + (z.fee != null ? ' · ' + money(z.fee) : ' · set fee') + '</button>'; }).join('') + '</div>' + ferr('zone') + '</div>' +
        '<div class="ccs-field"><label class="ccs-label" for="n-address">Delivery address</label><input class="ccs-input" id="n-address" data-n="address" value="' + esc(D.address) + '" placeholder="Street, resort or business name" autocomplete="off"></div>' + ferr('address') +
        (zo && zo.fee == null ? '<div class="ccs-field"><label class="ccs-label" for="n-fee">Delivery fee (FJD)</label><input class="ccs-input" id="n-fee" data-n="fee" inputmode="decimal" value="' + esc(D.fee) + '"></div>' + ferr('fee') : '') +
        '<div class="ccs-field"><label class="ccs-label" for="n-contact">Who receives it (optional)</label><input class="ccs-input" id="n-contact" data-n="contact" value="' + esc(D.contact) + '" placeholder="Name, room or reception"></div></div>';
    }
    // Quick date choices from the earliest allowed day; the calendar stays for anything else (U21)
    var quick = [], dd = minDate(), guard = 0, closedL = S.setup.closed_dates || [];
    while (quick.length < 10 && guard++ < 40) { if (closedL.indexOf(dd) < 0) quick.push(dd); dd = addDays(dd, 1); }
    var other = D.dateOther || (D.date && quick.indexOf(D.date) < 0);
    h += '<div class="ccs-field"><span class="ccs-label">' + (dl ? 'Delivery date' : 'Collection date') + '</span><div class="ccs-chips ccs-datechips">' + quick.map(function (q) { return '<button type="button" class="ccs-chip" data-act="n-date" data-v="' + q + '" aria-pressed="' + (D.date === q && !other) + '">' + esc(whenLabel(q) === 'Today' || whenLabel(q) === 'Tomorrow' ? whenLabel(q) + ' ' + new Date(q + 'T12:00:00Z').getUTCDate() : nice(q)) + '</button>'; }).join('') +
      '<button type="button" class="ccs-chip" data-act="n-date-other" aria-pressed="' + !!other + '">Other date</button></div><span class="ccs-hint">Normal notice: ' + leadDays() + ' days (earliest ' + esc(nice(minDate())) + ')</span></div>';
    if (other) h += '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-date">Other date</label><input class="ccs-input" id="n-date" type="date" min="' + today() + '" max="' + addDays(today(), L.max_days_ahead) + '" value="' + esc(D.date) + '" data-n="date"></div></div>';
    h += ferr('date');
    if (closed) h += '<p class="ccs-err">The café is closed for cake collections on that day.</p>';
    if (tooSoon() && !closed) h += '<div class="ccs-panel"><b>This is short notice.</b><p class="ccs-hint">Only take it if the kitchen has agreed. Both are saved with the order.</p><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-rush">Reason</label><input class="ccs-input" id="n-rush" data-n="rush" placeholder="For example: cake from today\'s batch" value="' + esc(D.rush) + '"></div><div class="ccs-field"><label class="ccs-label" for="n-rushby">Who approved it</label><input class="ccs-input" id="n-rushby" data-n="rushBy" placeholder="Manager or chef name" value="' + esc(D.rushBy) + '" autocomplete="off"></div></div></div>';
    if (D.date && !closed) {
      var nowT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      var wl = wlRows(D.date), at = {};
      if (wl) wl.forEach(function (o) { var k = slotOf(o.required_time); at[k] = (at[k] || 0) + 1; });
      h += workloadBox(wl);
      h += '<div class="ccs-field"><span class="ccs-label">' + (dl ? 'Delivery time' : 'Collection time') + '</span><div class="ccs-chips">' + slots.map(function (s) { var past = D.date === today() && s <= nowT, n = at[s] || 0; return '<button type="button" class="ccs-chip' + (n ? ' has-booked' : '') + '" data-act="n-time" data-v="' + s + '" aria-pressed="' + (D.time === s) + '"' + (past ? ' disabled' : '') + (n ? ' aria-label="' + t12(s) + ', ' + n + ' already booked"' : '') + '>' + t12(s) + (n ? '<span class="ccs-n">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>' + (wl ? '<span class="ccs-hint">Numbers show pickups already booked at that time.</span>' : '') + ferr('time') + '</div>';
    }
    return h;
  }
  function stepPay() {
    var price = dTotal(), custom = D.finish === 'custom';
    var h = '<h2 class="ccs-step-q">Price and payment</h2>' + (D.method === 'delivery' ? '<dl class="ccs-kv"><dt>Cake</dt><dd>' + money(dPrice()) + '</dd><dt>Delivery</dt><dd>' + money(dFee()) + ', ' + esc(D.zone || '') + '</dd></dl>' : '') +
      '<div class="ccs-total"><span>' + (custom ? 'Starting price before custom design' : 'Price') + '</span><b>' + money(price) + '</b></div>';
    if (custom) h += '<p class="ccs-note">Custom cakes are saved as Needs a quote. Confirm the final price from the order once the design is priced.</p>';
    else {
      h += '<label class="ccs-check"><input type="checkbox" data-nc="confirmNow"' + (D.confirmNow ? ' checked' : '') + '> Confirm the order now (the customer is here or has agreed the price)</label>';
      if (D.confirmNow) {
        h += D.askDeposit ? '<div class="ccs-field"><label class="ccs-label" for="n-dep">Deposit needed (FJD)</label><input class="ccs-input" id="n-dep" inputmode="decimal" data-n="deposit" value="' + esc(D.deposit) + '"><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-dep" data-v="half">Half (' + money(Math.round(price / 2)) + ')</button><button type="button" class="ccs-chip" data-act="n-dep" data-v="full">Full (' + money(price) + ')</button></div></div>' + ferr('deposit')
          : '<button type="button" class="ccs-link" data-act="n-askdep">+ Ask for a deposit</button>';
      }
    }
    h += D.payNow ? '<div class="ccs-panel"><b>Payment taken now</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-pay">Amount (FJD)</label><input class="ccs-input" id="n-pay" inputmode="decimal" data-n="payAmount" value="' + esc(D.payAmount) + '"></div></div><div class="ccs-chips">' +
      [['cash', 'Cash'], ['eftpos', 'EFTPOS'], ['bank_transfer', 'Bank transfer']].map(function (m) { return '<button type="button" class="ccs-chip" data-act="n-paym" data-v="' + m[0] + '" aria-pressed="' + (D.payMethod === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' + ferr('payment') + '</div>'
      : '<button type="button" class="ccs-link" data-act="n-paynow">+ Customer is paying now</button>';
    if (D.err && !D.errField) h += '<p class="ccs-err">' + esc(D.err) + '</p>';
    return h + '<button type="button" class="ccs-btn ccs-good ccs-wide" data-act="n-submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : 'Save order') + '</button>';
  }
  var searchTimer;
  function searchCustomers() {
    clearTimeout(searchTimer);
    var q = D.phone; if (digits(q).length < 3) { D.matches = null; D.isNew = false; return refreshStep(); }
    searchTimer = setTimeout(function () {
      sb.rpc('staff_search_customers', { q: q }).then(function (r) { if (r.error) throw r.error; if (q !== D.phone) return; D.matches = r.data || []; if (D.matches.length) D.isNew = false; refreshStep(); }).catch(fail);
    }, 280);
  }
  function refreshStep() {
    var el = document.getElementById('ccs-nstep-' + D.step); if (!el) return newRender();
    var focus = document.activeElement && document.activeElement.id, pos = document.activeElement && document.activeElement.selectionStart;
    el.innerHTML = '<div class="ccs-step-body" style="animation:none">' + [stepCustomer, stepCake, stepFinish, stepWhen, stepPay][D.step]() + '</div>';
    if (focus) { var f = document.getElementById(focus); if (f) { f.focus(); try { if (pos != null) f.setSelectionRange(pos, pos); } catch (e) {} } }
    saveDraft();
  }
  function submitOrder() {
    var L = S.setup.location, price = dTotal(), custom = D.finish === 'custom';
    var dep = D.confirmNow && !custom && D.askDeposit ? num(D.deposit) : null;
    var payAmt = D.payNow ? num(D.payAmount) : null;
    if (D.payNow && (!payAmt || payAmt <= 0)) { D.err = 'Enter the amount the customer is paying.'; D.errField = 'payment'; return refreshStep(); }
    var p = { idempotency_key: D.key, location: 'corner-cafe', source: D.source, product_code: D.product, variant: D.variant, size_inch: D.size, quantity: D.qty,
      finish: D.finish, design: D.design, message: D.message, occasion: D.occasion, has_dietary: D.diet, dietary: D.diet === 'yes' ? D.diets : [], dietary_note: D.dietNote, notes: D.notes,
      date: D.date, time: D.time, rush: tooSoon() ? { reason: D.rush, approved_by: D.rushBy } : null, confirm_now: D.confirmNow && !custom, deposit_required: dep,
      payment: payAmt ? { amount: payAmt, method: D.payMethod, kind: dep ? 'deposit' : (payAmt >= price ? 'full' : 'deposit') } : null,
      delivery: D.method === 'delivery' ? { method: 'delivery', zone: D.zone, address: D.address, fee: zoneObj() && zoneObj().fee == null ? num(D.fee) : null, contact: D.contact } : { method: 'collection' } };
    if (D.customer) p.customer_id = D.customer.id; else p.customer = { name: D.name, phone: D.phone, email: D.email, whatsapp: D.whatsapp, opt_in: D.optIn };
    S.busy = true; refreshStep();
    sb.rpc('staff_create_order', { p: p }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) {
        D.err = r.data.message;
        var map = { phone: 0, name: 0, customer: 0, product: 1, variant: 1, size: 1, finish: 2, design: 2, message: 2, diet: 2, date: 3, time: 3, full: 3, zone: 3, address: 3, fee: 3, method: 3, deposit: 4 };
        var f = r.data.field || r.data.error, s = map[f] != null ? map[f] : 4; D.errField = r.data.field || null;
        if (s !== D.step) { var e = D.err, ef = D.errField; goStep(s); D.err = e; D.errField = ef; refreshStep(); } else refreshStep();
        return;
      }
      S.wl = {}; loadOrders(true);
      if (newInSheet()) { calSaved(r.data); return; }
      D.result = r.data; view(); toast(r.data.reference + ' saved');
    }).catch(function (e) { S.busy = false; refreshStep(); fail(e); });
  }

  // ---------- calendar ----------
  // Pickup calendar: Year, Month, Week and Day. Dates are the scheduled collection or delivery date (business time zone).
  var CAL_LIST = 'id,reference,revision,order_status,payment_status,production_status,fulfilment_method,delivery_zone,source,required_date,required_time,estimate_total,final_total,has_dietary,rush_override,customer_notes,contact_name,contact_phone,contact_email,customers(full_name,phone),order_items(product_name,variant,size_inch,quantity,finish,design_description,cake_message,dietary,dietary_note),order_amendments(kitchen_ack_required,kitchen_ack_at)';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var CAL_STATUS = [['active', 'All active orders'], ['needs', 'Needs action'], ['confirmed', 'Confirmed'], ['done', 'Handed over'], ['off', 'Cancelled or declined']];
  S.cal = { view: 'month', anchor: today(), sel: null, pre: null, ask: null, status: 'active', type: 'all', basis: 'orders', rows: [], range: null, loading: false, err: false, seq: 0, counts: {}, cYear: null, cLoading: false, cErr: false, cseq: 0 };
  S.wl = {};
  function dow(iso) { return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; }
  function weekStart(iso) { return addDays(iso, -dow(iso)); }
  function monthStart(iso) { return iso.slice(0, 8) + '01'; }
  function monthLen(iso) { return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7), 0)).getUTCDate(); }
  function addMonths(iso, n) {
    var m = +iso.slice(5, 7) - 1 + n, y = +iso.slice(0, 4) + Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var d = Math.min(+iso.slice(8, 10), new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function shortD(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function hm(t) { var p = String(t || '0:0').slice(0, 5).split(':'); return +p[0] * 60 + +p[1]; }
  function nowHM() { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
  function calSlots() {
    var L = S.setup.location, out = [], o = hm(L.collection_open), c = hm(L.collection_close);
    for (var m = o; m <= c; m += L.slot_minutes) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    return out;
  }
  // Orders at odd times (for example from the Google Sheet) sit in the slot they fall within
  function slotOf(t) {
    var sl = calSlots(), m = hm(t), pick = sl[0];
    for (var i = 0; i < sl.length; i++) if (hm(sl[i]) <= m) pick = sl[i];
    return pick;
  }
  function cakesOf(o) { var n = (o.order_items || []).reduce(function (s, i) { return s + (Number(i.quantity) || 1); }, 0); return n || 1; }
  function dayTotals(list) { return { orders: list.length, cakes: list.reduce(function (s, o) { return s + cakesOf(o); }, 0) }; }
  function countText(t) { return t.orders + (t.orders === 1 ? ' order' : ' orders') + ' · ' + t.cakes + (t.cakes === 1 ? ' cake' : ' cakes'); }
  function amendWaiting(o) { return (o.order_amendments || []).some(function (a) { return a.kitchen_ack_required && !a.kitchen_ack_at; }); }
  function isClosed(d) { return ((S.setup && S.setup.closed_dates) || []).indexOf(d) > -1; }
  function calWide() { return window.matchMedia && window.matchMedia('(min-width: 1100px)').matches; }
  function calShow(o) {
    var c = S.cal, st = o.order_status;
    if (c.type !== 'all' && (o.fulfilment_method === 'delivery' ? 'delivery' : 'collection') !== c.type) return false;
    if (c.status === 'active') return st !== 'cancelled' && st !== 'declined';
    if (c.status === 'needs') return NEEDS.indexOf(st) > -1;
    if (c.status === 'confirmed') return st === 'confirmed';
    if (c.status === 'done') return st === 'completed';
    return st === 'cancelled' || st === 'declined';
  }
  function calDay(d) { return S.cal.rows.filter(function (o) { return o.required_date === d && calShow(o); }).sort(function (a, b) { return a.required_time < b.required_time ? -1 : 1; }); }
  function calRange() {
    var c = S.cal, a = c.anchor;
    if (c.view === 'week') { var w = weekStart(a); return [w, addDays(w, 6)]; }
    if (c.view === 'day') return [a, a];
    if (c.view === 'month') { var ms = monthStart(a), st = weekStart(ms), wk = Math.ceil((dow(ms) + monthLen(a)) / 7); return [st, addDays(st, wk * 7 - 1)]; }
    return c.sel ? [c.sel, c.sel] : null;
  }
  function calHas(d) { var r = S.cal.range; return !!r && d >= r.split('|')[0] && d <= r.split('|')[1]; }
  function calRefresh() { if (S.tab === 'calendar') view(); if (S.sheet && S.sheet.type === 'cal') renderSheet(); }
  function calLoad(silent) {
    var c = S.cal, rg = calRange(), seq = ++c.seq;
    if (c.view === 'year') calCounts(silent);
    if (!rg) { c.rows = []; c.range = null; c.loading = false; c.err = false; calRefresh(); return Promise.resolve(); }
    var key = rg.join('|');
    if (key !== c.range || !silent) { c.loading = key !== c.range; c.err = false; if (key !== c.range) c.rows = []; calRefresh(); }
    return sb.from('orders').select(CAL_LIST).gte('required_date', rg[0]).lte('required_date', rg[1])
      .order('required_date', { ascending: true }).order('required_time', { ascending: true }).limit(1000)
      .then(withContact).then(function (r) {
        if (seq !== c.seq) return; if (r.error) throw r.error;
        c.rows = r.data || []; c.range = key; c.loading = false; c.err = false; calRefresh();
      }).catch(function (e) {
        if (seq !== c.seq) return; console.error(e); c.loading = false;
        if (errKind(e) === 'expired') return sessionExpired();
        if (c.range !== key) { c.err = true; c.rows = []; } calRefresh();
      });
  }
  function calCounts(silent) {
    var c = S.cal, y = c.anchor.slice(0, 4), seq = ++c.cseq;
    if (c.cYear !== y) { c.cLoading = true; c.cErr = false; }
    return sb.rpc('calendar_counts', { p_from: y + '-01-01', p_to: y + '-12-31' }).then(function (r) {
      if (seq !== c.cseq) return; if (r.error) throw r.error;
      var m = {}; (r.data || []).forEach(function (d) { m[d.day] = d; }); c.counts = m; c.cYear = y; c.cLoading = false; c.cErr = false; calRefresh();
    }).catch(function (e) { if (seq !== c.cseq) return; console.error(e); c.cLoading = false; if (c.cYear !== y) c.cErr = true; calRefresh(); });
  }
  function calTitle() {
    var c = S.cal, a = c.anchor;
    if (c.view === 'year') return a.slice(0, 4);
    if (c.view === 'month') return MONTHS[+a.slice(5, 7) - 1] + ' ' + a.slice(0, 4);
    if (c.view === 'week') { var w = weekStart(a), e = addDays(w, 6); return shortD(w) + ' to ' + shortD(e) + ' ' + e.slice(0, 4); }
    return nice(a, true) + ' ' + a.slice(0, 4);
  }
  function calChip(o, full) {
    var i = firstItem(o) || {}, cu = o.customers || {}, dl = o.fulfilment_method === 'delivery', tone = (STATUS[o.order_status] || [0, 'off'])[1];
    var who = cu.full_name || o.reference;
    return '<button type="button" class="ccs-cev k-' + tone + (full ? ' is-full' : '') + (S.cal.pre === o.id ? ' is-sel' : '') + (S.cal.justAdded === o.id ? ' is-new' : '') + '" data-act="cal-pre" data-id="' + o.id + '" aria-label="' + esc(t12(o.required_time) + ', ' + who + ', ' + cakeLine(i) + ', ' + statusLabel(o.order_status, o.fulfilment_method) + (dl ? ', delivery' : '')) + '">' +
      '<span class="ccs-cev-t">' + esc(t12(o.required_time)) + '</span><span class="ccs-cev-n">' + esc(who) + '</span>' +
      (full ? '<span class="ccs-cev-c">' + esc(cakeLine(i)) + '</span><span class="ccs-tags">' + pill(o.order_status, o.fulfilment_method) + (dl ? '<span class="ccs-tag">Delivery</span>' : '') + (o.has_dietary ? '<span class="ccs-pill s-alert">Dietary</span>' : '') + (amendWaiting(o) ? '<span class="ccs-pill s-amend">Change for kitchen</span>' : '') + '</span>' : '') + '</button>';
  }
  function calErrBox(act) { return '<div class="ccs-empty ccs-calerr" role="alert"><b>The calendar could not load.</b><span>This is a connection problem, not an empty day. Nothing has changed.</span><button type="button" class="ccs-btn" data-act="' + act + '">Try again</button></div>'; }

  function calendarView() {
    var c = S.cal;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Calendar</h1><p class="ccs-sub">Orders by collection or delivery date. Counts leave out cancelled and declined orders.</p></div></div>';
    h += '<div class="ccs-calbar"><div class="ccs-calnav"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="cal-today">Today</button>' +
      '<button type="button" class="ccs-calarrow" data-act="cal-move" data-v="-1" aria-label="Previous ' + c.view + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg></button>' +
      '<button type="button" class="ccs-calarrow" data-act="cal-move" data-v="1" aria-label="Next ' + c.view + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z"/></svg></button>' +
      '<h2 class="ccs-caltitle" aria-live="polite">' + esc(calTitle()) + '</h2></div>' +
      '<div class="ccs-tabs ccs-calviews" role="group" aria-label="Calendar view">' + [['year', 'Year'], ['month', 'Month'], ['week', 'Week'], ['day', 'Day']].map(function (v) { return '<button type="button" class="ccs-tab" data-act="cal-view" data-v="' + v[0] + '" aria-pressed="' + (c.view === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
    if (c.view === 'year') h += '<div class="ccs-calfilt"><span class="ccs-label">Shade days by</span><div class="ccs-tabs" role="group" aria-label="Shade days by">' + [['orders', 'Orders'], ['cakes', 'Cakes']].map(function (v) { return '<button type="button" class="ccs-tab" data-act="cal-basis" data-v="' + v[0] + '" aria-pressed="' + (c.basis === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
    else h += '<div class="ccs-calfilt"><label class="ccs-show" for="cal-status"><span>Show</span><select class="ccs-input" id="cal-status">' + CAL_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (c.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="ccs-show" for="cal-type"><span>Type</span><select class="ccs-input" id="cal-type">' + [['all', 'Collections and deliveries'], ['collection', 'Collections only'], ['delivery', 'Deliveries only']].map(function (s) { return '<option value="' + s[0] + '"' + (c.type === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label></div>';
    var body = c.view === 'year' ? calYear() : (c.err ? calErrBox('cal-retry') : (c.loading && !c.rows.length ? '<p class="ccs-loading">Loading the calendar…</p>' : (c.view === 'month' ? calMonth() : c.view === 'week' ? calWeek() : calDayView())));
    return h + '<div class="ccs-calwrap"><div class="ccs-calbody">' + body + '</div><aside class="ccs-calside" aria-label="Selected day">' + (c.view === 'day' && !c.pre ? '<div class="ccs-calhint"><b>Select an order</b><p class="ccs-hint">A short preview appears here, with Open order and Amend order.</p></div>' : dayPanel()) + '</aside></div>';
  }

  function calYear() {
    var c = S.cal, y = c.anchor.slice(0, 4), t = today();
    if (c.cErr) return calErrBox('cal-retry');
    if (c.cYear !== y) return '<p class="ccs-loading">Loading ' + esc(y) + '…</p>';
    var max = 0; Object.keys(c.counts).forEach(function (k) { max = Math.max(max, c.counts[k][c.basis] || 0); });
    var lvl = function (n) { return !n ? 0 : Math.max(1, Math.min(4, Math.ceil(n / max * 4))); };
    var unit = c.basis === 'orders' ? 'orders' : 'cakes';
    var h = '<div class="ccs-ylegend"><span>Fewer</span>' + [0, 1, 2, 3, 4].map(function (l) { return '<i class="l' + l + '"></i>'; }).join('') + '<span>More</span><span class="ccs-hint">Shaded by ' + unit + ' per day' + (max ? '. Busiest day: ' + max + ' ' + unit : '') + '. Outlined: today. Dot: needs action.</span></div><div class="ccs-year">';
    for (var m = 1; m <= 12; m++) {
      var first = y + '-' + String(m).padStart(2, '0') + '-01', len = monthLen(first), tot = 0;
      var cells = '';
      for (var k = 0; k < dow(first); k++) cells += '<span class="ccs-yblank"></span>';
      for (var d = 1; d <= len; d++) {
        var iso = first.slice(0, 8) + String(d).padStart(2, '0'), r = c.counts[iso], n = r ? r[c.basis] : 0; tot += r ? r[c.basis] : 0;
        cells += '<button type="button" class="ccs-yday l' + lvl(n) + (iso === t ? ' is-today' : '') + (iso === c.sel ? ' is-sel' : '') + (r && r.attention ? ' has-need' : '') + (isClosed(iso) ? ' is-closed' : '') + '" data-act="cal-sel" data-v="' + iso + '" aria-label="' + esc(nice(iso) + ': ' + (r ? r.orders + ' orders, ' + r.cakes + ' cakes' + (r.attention ? ', ' + r.attention + ' need action' : '') : 'no orders')) + '"' + (iso === c.sel ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
      }
      h += '<section class="ccs-ymonth"><button type="button" class="ccs-ymhead" data-act="cal-month" data-v="' + first + '"><b>' + MONTHS[m - 1] + '</b><span>' + (tot ? tot + ' ' + unit : '') + '</span></button><div class="ccs-ygrid">' + WD.map(function (w) { return '<span class="ccs-ywd" aria-hidden="true">' + w.charAt(0) + '</span>'; }).join('') + cells + '</div></section>';
    }
    return h + '</div>';
  }

  function calMonth() {
    var c = S.cal, rg = calRange(), mo = c.anchor.slice(0, 7), t = today();
    var h = '<div class="ccs-month"><div class="ccs-mhead" aria-hidden="true">' + WD.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="ccs-mgrid">';
    for (var d = rg[0]; d <= rg[1]; d = addDays(d, 1)) {
      var list = calDay(d), tot = dayTotals(list), need = list.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length, shut = isClosed(d);
      h += '<div class="ccs-mcell' + (d.slice(0, 7) !== mo ? ' is-out' : '') + (d === t ? ' is-today' : '') + (d === c.sel ? ' is-sel' : '') + (shut ? ' is-closed' : '') + (tot.orders ? ' has-orders' : '') + '">' +
        '<button type="button" class="ccs-mday" data-act="cal-sel" data-v="' + d + '" aria-label="' + esc(nice(d, true) + ', ' + (shut ? 'closed' : tot.orders ? countText(tot) : 'no pickups') + (need ? ', ' + need + ' need action' : '')) + '"' + (d === c.sel ? ' aria-pressed="true"' : '') + '>' +
        '<b>' + (+d.slice(8)) + '</b>' + (tot.orders ? '<span class="ccs-mcount"><span class="ccs-mlong">' + countText(tot) + '</span><span class="ccs-mshort">' + tot.orders + '</span></span>' : (shut ? '<span class="ccs-mcount">Closed</span>' : '')) +
        (need ? '<span class="ccs-mneed"><span class="ccs-mlong">' + need + ' need action</span></span>' : '') + '</button>' +
        (list.length ? '<div class="ccs-mlist">' + list.slice(0, 2).map(function (o) { return calChip(o, false); }).join('') + (list.length > 2 ? '<button type="button" class="ccs-mmore" data-act="cal-sel" data-v="' + d + '">+ ' + (list.length - 2) + ' more</button>' : '') + '</div>' : '') + '</div>';
    }
    return h + '</div></div>';
  }

  function calWeek() {
    var c = S.cal, w = weekStart(c.anchor), days = [], t = today(), nt = nowHM(), add = can('manager', 'front_of_house'), slots = calSlots();
    for (var i = 0; i < 7; i++) days.push(addDays(w, i));
    var g = '<div class="ccs-wgrid"><div class="ccs-wcorner"></div>' + days.map(function (d) {
      var tot = dayTotals(calDay(d));
      return '<button type="button" class="ccs-whead' + (d === t ? ' is-today' : '') + (d === c.sel ? ' is-sel' : '') + '" data-act="cal-sel" data-v="' + d + '"><b>' + WD[dow(d)] + ' ' + (+d.slice(8)) + '</b><span>' + (isClosed(d) ? 'Closed' : tot.orders ? tot.orders + ' · ' + tot.cakes + (tot.cakes === 1 ? ' cake' : ' cakes') : 'None') + '</span></button>';
    }).join('');
    slots.forEach(function (s) {
      g += '<div class="ccs-wtime">' + t12(s) + '</div>';
      days.forEach(function (d) {
        var here = calDay(d).filter(function (o) { return slotOf(o.required_time) === s; }), past = d < t || (d === t && s <= nt), shut = isClosed(d);
        g += '<div class="ccs-wcell' + (here.length > 1 ? ' is-busy' : '') + (shut ? ' is-closed' : '') + '">' + here.map(function (o) { return calChip(o, false); }).join('') +
          (add && !past && !shut ? '<button type="button" class="ccs-wadd" data-act="cal-add" data-v="' + d + '" data-t="' + s + '" aria-label="New order for ' + esc(nice(d)) + ' at ' + t12(s) + '"><span aria-hidden="true">+</span></button>' : '') + '</div>';
      });
    });
    g += '</div>';
    // Phones and small tablets: one readable list per day
    var l = '<div class="ccs-wlist">' + days.map(function (d) { return calDayBlock(d); }).join('') + '</div>';
    return g + l;
  }
  function calDayBlock(d) {
    var list = calDay(d), tot = dayTotals(list), add = can('manager', 'front_of_house') && d >= today() && !isClosed(d);
    return '<section class="ccs-wday' + (d === today() ? ' is-today' : '') + '"><div class="ccs-wday-head"><button type="button" class="ccs-wday-date" data-act="cal-sel" data-v="' + d + '"><b>' + esc(nice(d, true)) + '</b><span>' + (isClosed(d) ? 'Closed' : tot.orders ? countText(tot) : 'No pickups scheduled') + '</span></button>' +
      (add ? '<button type="button" class="ccs-btn ccs-new ccs-small" data-act="cal-add" data-v="' + d + '">' + NAV_ICON['new'] + 'New order</button>' : '') + '</div>' +
      (list.length ? '<div class="ccs-daylist">' + list.map(function (o) { return calChip(o, true); }).join('') + '</div>' : '') + '</section>';
  }

  function calDayView() {
    var c = S.cal, d = c.anchor, list = calDay(d), tot = dayTotals(list), t = today(), nt = nowHM(), add = can('manager', 'front_of_house'), shut = isClosed(d);
    var h = '<div class="ccs-dayv"><div class="ccs-daytot"><div><b>' + tot.orders + '</b><span>' + (tot.orders === 1 ? 'order' : 'orders') + '</span></div><div><b>' + tot.cakes + '</b><span>' + (tot.cakes === 1 ? 'cake' : 'cakes') + '</span></div>' +
      '<div><b>' + list.filter(function (o) { return o.fulfilment_method === 'delivery'; }).length + '</b><span>deliveries</span></div></div>';
    if (shut) h += '<p class="ccs-note">The café is closed for cake collections on this day.</p>';
    h += capLine(d);
    if (add && d >= t && !shut) h += '<button type="button" class="ccs-btn ccs-new ccs-wide ccs-dayadd" data-act="cal-add" data-v="' + d + '">' + NAV_ICON['new'] + 'New order for this date</button>';
    h += calAsk();
    if (!list.length) h += '<div class="ccs-empty"><b>No pickups scheduled</b><span>' + (c.status !== 'active' || c.type !== 'all' ? 'Nothing matches the filters for this day.' : 'Tap a time below, or New order, to book one.') + '</span></div>';
    h += '<ol class="ccs-dslots">';
    calSlots().forEach(function (s) {
      var here = list.filter(function (o) { return slotOf(o.required_time) === s; }), past = d < t || (d === t && s <= nt);
      h += '<li class="ccs-dslot' + (here.length ? ' has-orders' : '') + (here.length > 1 ? ' is-busy' : '') + '"><span class="ccs-dslot-t">' + t12(s) + (here.length > 1 ? '<em>' + here.length + ' pickups</em>' : '') + '</span><div class="ccs-dslot-b">' + here.map(function (o) { return calChip(o, true); }).join('') +
        (add && !past && !shut ? '<button type="button" class="ccs-wadd ccs-dadd" data-act="cal-add" data-v="' + d + '" data-t="' + s + '">New order at ' + t12(s) + '</button>' : '') + '</div></li>';
    });
    return h + '</ol></div>';
  }
  function capLine(d) {
    var cap = S.setup.location.daily_capacity; if (!cap) return '';
    var n = S.cal.rows.filter(function (o) { return o.required_date === d && ['declined', 'cancelled', 'completed'].indexOf(o.order_status) < 0; }).length;
    return n >= cap ? '<p class="ccs-err">Day limit reached: ' + n + ' of ' + cap + ' orders. New orders are refused unless approved as short notice.</p>' : '<p class="ccs-hint">Day limit: ' + n + ' of ' + cap + ' orders booked.</p>';
  }
  function calAsk() {
    var a = S.cal.ask; if (!a) return '';
    return '<div class="ccs-panel ccs-confirm" role="alert"><b>You have an unfinished order' + (draftWho() ? ' for ' + esc(draftWho()) : '') + '.</b><p class="ccs-hint">Use ' + esc(nice(a.d)) + (a.t ? ' at ' + t12(a.t) : '') + ' for it, or start a new order. Starting new deletes the unfinished one.</p>' +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="cal-add-keep">Use this date for it</button><button type="button" class="ccs-btn ccs-ghost" data-act="cal-add-new">Start a new order</button></div><button type="button" class="ccs-link" data-act="cal-add-cancel">Cancel</button></div>';
  }
  function dayPanel() {
    var c = S.cal, d = c.sel;
    if (c.pre) return previewPanel();
    if (!d) return '<div class="ccs-calhint"><b>Select a date</b><p class="ccs-hint">Its pickups and a New order button appear here.</p></div>';
    var h = '<div class="ccs-dayp"><p class="ccs-eyebrow">' + (d === today() ? 'Today' : d === addDays(today(), 1) ? 'Tomorrow' : 'Selected day') + '</p><h2 class="ccs-dayp-title">' + esc(nice(d, true) + ' ' + d.slice(0, 4)) + '</h2>';
    if (c.err) return h + calErrBox('cal-retry') + '</div>';
    if (!calHas(d)) return h + '<p class="ccs-loading">Loading pickups…</p></div>';
    var list = calDay(d), tot = dayTotals(list), shut = isClosed(d), add = can('manager', 'front_of_house') && d >= today() && !shut;
    h += '<div class="ccs-daytot"><div><b>' + tot.orders + '</b><span>' + (tot.orders === 1 ? 'order' : 'orders') + '</span></div><div><b>' + tot.cakes + '</b><span>' + (tot.cakes === 1 ? 'cake' : 'cakes') + '</span></div></div>';
    if (shut) h += '<p class="ccs-note">The café is closed for cake collections on this day.</p>';
    h += capLine(d);
    if (add) h += '<button type="button" class="ccs-btn ccs-new ccs-wide" data-act="cal-add" data-v="' + d + '">' + NAV_ICON['new'] + 'New order for this date</button>';
    h += calAsk();
    h += list.length ? '<div class="ccs-daylist">' + list.map(function (o) { return calChip(o, true); }).join('') + '</div>'
      : '<div class="ccs-empty"><b>No pickups scheduled</b>' + (c.status !== 'active' || c.type !== 'all' ? '<span>Nothing matches the filters for this day.</span>' : '') + '</div>';
    if (c.view !== 'day') h += '<button type="button" class="ccs-link" data-act="cal-openday" data-v="' + d + '">Open the day by time</button>';
    return h + '</div>';
  }
  function previewPanel() {
    var c = S.cal, o = c.rows.filter(function (r) { return r.id === c.pre; })[0];
    if (!o) { c.pre = null; return dayPanel(); }
    var i = firstItem(o) || {}, cu = o.customers || {}, dl = o.fulfilment_method === 'delivery', orderer = can('manager', 'front_of_house'), notes = [];
    if (o.has_dietary) notes.push(['alert', 'Dietary or allergy: ' + ([].concat(i.dietary || [], i.dietary_note ? [i.dietary_note] : []).join(', ') || 'see the order')]);
    if (amendWaiting(o)) notes.push(['amend', 'Changed. The kitchen has not confirmed the change yet.']);
    if (o.rush_override) notes.push(['', 'Short-notice order']);
    if (i.cake_message) notes.push(['', 'Message on the cake: “' + i.cake_message + '”']);
    if (i.finish === 'custom' && i.design_description) notes.push(['', 'Design: ' + i.design_description]);
    if (o.customer_notes) notes.push(['', 'Notes: ' + o.customer_notes]);
    var amend = orderer && OPEN.indexOf(o.order_status) > -1 && (o.production_status !== 'ready' || can('manager'));
    var brief = orderer && (o.order_status === 'confirmed' || o.order_status === 'completed');
    return '<div class="ccs-dayp ccs-pre"><button type="button" class="ccs-link" data-act="cal-pre" data-id="">Back to ' + esc(nice(o.required_date)) + '</button>' +
      '<h2 class="ccs-dayp-title">' + esc(o.reference) + '</h2><div class="ccs-tags">' + pill(o.order_status, o.fulfilment_method) + (o.revision ? '<span class="ccs-pill s-amend">Amended</span>' : '') + '</div>' +
      '<dl class="ccs-kv">' + kv('Customer', cu.full_name) + kv(dl ? 'Delivery' : 'Collection', nice(o.required_date, true) + ' at ' + t12(o.required_time)) + kv('Cake', cakeLine(i)) + kv('Cakes', String(cakesOf(o))) +
      (dl ? kv('Area', o.delivery_zone) : '') + kv('Kitchen', o.order_status === 'confirmed' || o.order_status === 'completed' ? (STAGE_LABEL[o.production_status] || '') : '') + kv('Payment', PAY[o.payment_status] || '') + '</dl>' +
      (notes.length ? '<ul class="ccs-prenotes">' + notes.map(function (n) { return '<li' + (n[0] ? ' class="is-' + n[0] + '"' : '') + '>' + esc(n[1]) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="ccs-actions"><button type="button" class="ccs-btn ccs-wide" data-act="open-order" data-id="' + o.id + '">Open order</button>' +
      (amend ? '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="cal-amend" data-id="' + o.id + '">Amend order</button>' : '') +
      (brief ? '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="cal-brief" data-id="' + o.id + '">Print kitchen brief</button>' : '') +
      '<p class="ccs-hint">Payments, status and handover are in Open order. Date changes go through Amend order, so they are checked and kept in the change history.</p></div></div>';
  }
  function calSheet() { var c = S.cal; return sheetHead(c.pre ? 'Order' : 'Pickups') + '<div class="ccs-sheet-body">' + dayPanel() + '</div>'; }
  // Day panel: beside the calendar on wide screens, a sheet on phones and tablets
  function calPanel() {
    if (calWide()) { if (S.sheet && S.sheet.type === 'cal') sheetClose(); view(); return; }
    view();
    if (!S.sheet || S.sheet.type !== 'cal') { S.sheet = { type: 'cal' }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); }
    renderSheet();
  }
  function calSelect(d) {
    var c = S.cal; c.sel = d; c.pre = null; c.ask = null;
    if (c.view === 'year') { c.range = null; calLoad(); }
    calPanel();
  }
  function calMove(n) {
    var c = S.cal;
    c.anchor = c.view === 'year' ? addMonths(c.anchor, 12 * n) : c.view === 'month' ? addMonths(monthStart(c.anchor), n) : addDays(c.anchor, (c.view === 'week' ? 7 : 1) * n);
    c.pre = null; c.ask = null; c.sel = c.view === 'day' ? c.anchor : null;
    if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad();
  }
  function calOrderThen(id, panel) {
    openOrder(id).then(function () {
      var o = S.sheet && S.sheet.id === id && S.sheet.data; if (!o) return;
      S.panel = panel; S.panelErr = null; if (panel === 'amend') S.am = amendInit(o); renderSheet();
    });
  }
  // Add order: opens the normal New order form with the date (and time, from a slot) filled in
  function calStart(d, t, mode) {
    var c = S.cal;
    if (!mode && draftHasContent()) { c.sel = d; c.pre = null; c.ask = { d: d, t: t || '' }; calPanel(); return; }
    c.ask = null; c.sel = d;
    if (mode === 'new') clearDraft(); else if (mode !== 'keep') D = freshDraft();
    D.date = d; D.time = t || ''; D.dateOther = false; D.fromCal = true; D.restored = false; D.err = null; D.errField = null; D.confirmReset = false;
    if (D.reached >= 3 && D.time) D.step = nextOpen(0);
    S.sheet = { type: 'new' }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet();
    var sbody = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (sbody) sbody.scrollTop = 0;
  }
  // Saved from the calendar panel: close it, stay on the day and mark the new order
  function calSaved(r) {
    var d = D.date, t = D.time, c = S.cal;
    D = freshDraft(); clearDraft();
    sheetClose();
    c.sel = d; c.pre = null; c.ask = null; c.justAdded = r.order_id;
    if (c.view === 'day') c.anchor = d;
    else if (c.view === 'week' && (d < weekStart(c.anchor) || d > addDays(weekStart(c.anchor), 6))) c.anchor = d;
    else if (c.view === 'month' && d.slice(0, 7) !== c.anchor.slice(0, 7)) c.anchor = d;
    else if (c.view === 'year' && d.slice(0, 4) !== c.anchor.slice(0, 4)) c.anchor = d;
    if (c.view === 'year') c.range = null;
    calLoad(true);
    toast(r.reference + ' saved for ' + nice(d) + (t ? ' at ' + t12(t) : '') + '. ' + (r.status === 'confirmed' ? 'Confirmed.' : r.status === 'awaiting_deposit' ? 'Waiting for the deposit.' : 'In Needs action for review.'));
  }
  function calBack() {
    var d = D.date, c = S.cal;
    if (D.result) D = freshDraft(); else D.fromCal = false;
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      c.sel = d; c.pre = null;
      if (c.view === 'day') c.anchor = d;
      else if (c.view === 'week' && (d < weekStart(c.anchor) || d > addDays(weekStart(c.anchor), 6))) c.anchor = d;
      else if (c.view === 'month' && d.slice(0, 7) !== c.anchor.slice(0, 7)) c.anchor = d;
      else if (c.view === 'year' && d.slice(0, 4) !== c.anchor.slice(0, 4)) c.anchor = d;
    }
    c.range = null; goTab('calendar'); window.scrollTo(0, 0);
  }
  // Workload for the date chosen in New order (loaded once a minute at most)
  function wlRows(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return null;
    var w = S.wl[d];
    if (!w || (w.at && Date.now() - w.at > 60000 && !w.loading)) {
      S.wl[d] = { loading: true, at: w && w.at, rows: w && w.rows };
      sb.from('orders').select(CAL_LIST).eq('required_date', d).limit(300).then(withContact).then(function (r) {
        if (r.error) throw r.error; S.wl[d] = { at: Date.now(), rows: r.data || [] };
        if (newOpen() && D.step === 3 && D.date === d) refreshStep();
      }).catch(function (e) { console.error(e); S.wl[d] = { at: Date.now(), err: true }; if (newOpen() && D.step === 3 && D.date === d) refreshStep(); });
      w = S.wl[d];
    }
    return w.rows ? w.rows.filter(function (o) { return o.order_status !== 'cancelled' && o.order_status !== 'declined'; }) : (w.err ? false : null);
  }
  function workloadBox(rows) {
    var L = S.setup.location;
    var hours = 'Collection hours ' + t12(L.collection_open) + ' to ' + t12(L.collection_close) + '.';
    if (rows === false) return '<div class="ccs-wl"><b>Could not load the other pickups for this day.</b><span class="ccs-hint">' + hours + ' The rules are still checked when you save.</span></div>';
    if (!rows) return '<div class="ccs-wl"><span class="ccs-hint">Checking pickups on this day…</span></div>';
    var tot = dayTotals(rows), h = '<div class="ccs-wl"><b>' + esc(nice(D.date)) + ': ' + (tot.orders ? countText(tot) + ' already booked' : 'no other pickups yet') + '</b><span class="ccs-hint">' + hours + '</span>';
    if (L.daily_capacity) {
      var n = rows.filter(function (o) { return o.order_status !== 'completed'; }).length;
      h += n >= L.daily_capacity ? '<p class="ccs-err">Day limit reached: ' + n + ' of ' + L.daily_capacity + ' orders. This order will be refused unless approved as short notice.</p>' : '<span class="ccs-hint">Day limit: ' + n + ' of ' + L.daily_capacity + ' orders booked.</span>';
    }
    if (D.time) {
      var near = rows.filter(function (o) { return Math.abs(hm(o.required_time) - hm(D.time)) <= 60; });
      if (near.length) h += '<span class="ccs-hint">Within an hour of ' + t12(D.time) + ': ' + near.map(function (o) { return t12(o.required_time) + ' ' + ((o.customers || {}).full_name || o.reference) + ' (' + cakesOf(o) + (cakesOf(o) === 1 ? ' cake' : ' cakes') + ')'; }).map(esc).join(', ') + '</span>';
    }
    return h + '</div>';
  }

  // ---------- customers ----------
  var SEGS = [['all', 'All'], ['seg_repeat', 'Repeat'], ['seg_first_time', 'First-time'], ['seg_high_value', 'High value'], ['seg_inactive', 'Inactive'], ['seg_birthday_buyer', 'Birthday buyers'], ['seg_upcoming_occasion', 'Occasion due soon'], ['seg_upcoming_order', 'Has an order coming'], ['seg_corporate', 'Corporate'], ['marketing_opt_in', 'Opted in']];
  function loadCustomers() {
    var c = S.cust; c.loaded = false; view();
    var req;
    if (c.q.trim().length < 2) return clLoad();
    req = sb.rpc('staff_search_customers', { q: c.q });
    return req.then(function (r) { if (r.error) throw r.error; c.rows = r.data || []; c.count = c.rows.length; c.loaded = true; if (S.tab === 'customers') view(); }).catch(fail);
  }
  function customersView() {
    var c = clState();
    if (c.mode === 'dups' && can('manager')) return clDupsView();
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Customers</h1><p class="ccs-sub">Built from every online and counter order. Spend counts collected orders only.</p></div>' +
      '<div class="ccs-headacts"><input class="ccs-input ccs-search" id="ccs-cq" type="search" placeholder="Search name, mobile, email, company, C-number or order number" value="' + esc(c.q) + '">' +
      (can('manager', 'front_of_house') ? '<button type="button" class="ccs-btn" data-act="cust-new">Add customer</button>' : '') + '</div></div>';
    if (c.q.trim().length >= 2) h += '<p class="ccs-hint cm-gline">Search results. Clear the search to use filters and groups.</p>';
    else h += clToolbar();
    if (!c.loaded) return h + '<p class="ccs-loading">Loading customers…</p>';
    var rows = c.rows;
    if (!rows.length) return h + '<div class="ccs-empty"><b>' + (Object.keys(c.flt || {}).length || c.seg !== 'all' ? 'No customers match these filters.' : 'No customers in this group yet.') + '</b><span>' + (Object.keys(c.flt || {}).length ? 'Remove a filter to see more.' : 'Customers are added automatically when an order is placed.') + '</span></div>';
    h += '<div class="ccs-table-wrap"><table class="ccs-table"><thead><tr><th>Customer</th><th>Mobile</th><th class="ccs-num">Orders</th><th class="ccs-num">Spend</th><th>Last order</th><th>Usually orders</th><th>Marketing</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="ccs-click" data-act="open-customer" data-id="' + r.id + '"><td data-label="Customer"><b style="color:var(--ccs-ink)">' + esc(r.full_name) + '</b>' + (r.seg_upcoming_occasion ? '<br><span class="ccs-pill s-deposit">Occasion ' + esc(nice(r.next_occasion_date)) + '</span>' : '') + '</td><td data-label="Mobile">' + esc(r.phone) + '</td><td class="ccs-num" data-label="Orders">' + r.orders_count + '</td><td class="ccs-num" data-label="Spend">' + money(r.completed_spend) + '</td><td data-label="Last order">' + (r.last_order_at ? esc(stamp(r.last_order_at).split(',')[0]) : '—') + '</td><td data-label="Usually orders">' + esc(r.favourite_cake || '—') + '</td><td data-label="Marketing">' + (r.marketing_opt_in ? (r.consent_reconfirm ? '<span class="ccs-pill s-deposit">Yes, reconfirm</span>' : '<span class="ccs-pill s-good">Opted in</span>') : '<span class="ccs-quiet-no">No</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h;
  }
  // ---------- customer profile ----------
  // Edits go through staff_update_customer: version-checked, validated, every field kept in the change history.
  // Orders keep the contact they were placed with unless staff choose to update open orders.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var CHANNELS = [['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'], ['call', 'Phone call']];
  var FIELD_LABEL = { full_name: 'Name', phone: 'Mobile', alt_phone: 'Other number', email: 'Email', preferred_contact: 'Best way to reach them', company: 'Company',
    is_corporate: 'Corporate customer', delivery_address: 'Delivery address', birth_day: 'Birthday day', birth_month: 'Birthday month', preferences: 'Preferences',
    notes: 'Service notes', review_flag: 'Review flag', review_note: 'Review note', archived_at: 'Archived', merged_into: 'Merged into' };
  var CUSTOMER_SOURCE = { online_order: 'Website order', staff_order: 'Order taken by staff', sheet_import: 'Old order sheets', staff_added: 'Added by staff' };
  var OPEN_STATUSES = ['awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit', 'confirmed'];
  function custNo(n) { return n != null ? 'C-' + n : ''; }
  function birthday(d, m) { return d && m ? d + ' ' + MONTHS[m - 1] : ''; }
  function openCustomer(id, keepEdit) {
    var keep = keepEdit && S.sheet && S.sheet.type === 'customer' && S.sheet.id === id;
    if (!keep) { S.sheet = { type: 'customer', id: id, data: null, edit: false, tab: 'overview' }; S.panelErr = null; S.dirty = {}; sheetOpen(); }
    renderSheet();
    if (!keep || !S.sheet.ws) wsLoad(id);
    return Promise.all([
      sb.from('customer_summary').select('*').eq('id', id).maybeSingle(),
      sb.from('customers').select('id,customer_no,customer_source,full_name,phone,alt_phone,email,preferred_contact,is_corporate,company,delivery_address,birth_day,birth_month,preferences,notes,version,review_flag,review_note,archived_at,merged_into').eq('id', id).single(),
      sb.from('orders').select('id,reference,order_status,payment_status,fulfilment_method,delivery_zone,delivery_address,delivery_contact,has_dietary,required_date,estimate_total,final_total,source,contact_name,order_items(product_name,variant,size_inch,quantity,finish,design_description,cake_message,occasion,dietary,dietary_note)').eq('customer_id', id).order('required_date', { ascending: false }).limit(100),
      can('manager', 'front_of_house', 'marketing') ? sb.from('consent_now').select('channel,destination,granted,needs_reconfirm,source,wording_code,recorded_at,applies,brand_code').eq('customer_id', id).eq('brand_code', 'corner-cafe') : Promise.resolve({ data: [] }),
      can('manager', 'front_of_house', 'marketing') ? sb.from('marketing_consents').select('channel,destination,granted,needs_reconfirm,source,recorded_at').eq('customer_id', id).order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(12) : Promise.resolve({ data: [] }),
      sb.rpc('customer_sheet_orders', { p_customer: id }),
      sb.from('customers').select('id,customer_no,full_name').eq('merged_into', id)
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      if (!S.sheet || S.sheet.id !== id) return;
      if (rs[1].data && rs[1].data.merged_into) { toast('That profile was merged into another. Opening the main profile.'); return openCustomer(rs[1].data.merged_into); }
      var from = rs[6].data || [];
      S.sheet.data = { sum: rs[0].data || {}, c: rs[1].data, orders: rs[2].data || [], now: rs[3].data || [], log: rs[4].data || [], sheet: (rs[5].data && rs[5].data.ok && rs[5].data.orders) || [], mergedFrom: from }; renderSheet();
      // Marketing permission given on a merged profile is part of this customer's record
      if (from.length && can('manager', 'front_of_house', 'marketing')) {
        sb.from('marketing_consents').select('channel,destination,granted,needs_reconfirm,source,recorded_at').in('customer_id', from.map(function (x) { return x.id; })).order('recorded_at', { ascending: false }).limit(12).then(function (r) {
          if (r.error || !S.sheet || S.sheet.id !== id || !S.sheet.data) return;
          S.sheet.data.log = S.sheet.data.log.concat(r.data || []).sort(function (a, b) { return a.recorded_at < b.recorded_at ? 1 : -1; }).slice(0, 12); renderSheet();
        });
      }
    }).catch(fail);
  }
  function consentLine(d, ch) {
    var c = d.c;
    var rows = d.now.filter(function (k) { return k.channel === ch && k.applies; }), k = rows[0];
    var target = ch === 'email' ? c.email : c.phone;
    if (!target) return { text: ch === 'email' ? 'No email on the profile' : 'No mobile number on the profile', cls: 'ccs-quiet-no', none: true };
    if (!k) {
      var old = d.now.filter(function (x) { return x.channel === ch && !x.applies && x.granted; }).length;
      return { text: old ? 'Not asked for this ' + (ch === 'email' ? 'email' : 'number') + '. An earlier yes was for a different one.' : 'Not asked', cls: 'ccs-quiet-no' };
    }
    if (!k.granted) return { text: 'No', cls: 'ccs-quiet-no', no: true };
    return k.needs_reconfirm ? { text: 'Yes, needs reconfirming', cls: 'ccs-pill s-deposit', yes: true, re: true } : { text: 'Yes', cls: 'ccs-pill s-good', yes: true };
  }
  function customerSheet() {
    var d = S.sheet.data;
    if (!d) return sheetHead('Loading…') + '<div class="ccs-sheet-body"><p class="ccs-loading">Loading customer…</p></div>';
    var s = d.sum, c = d.c, editor = can('manager', 'front_of_house');
    var segs = [['seg_repeat', 'Repeat'], ['seg_first_time', 'First-time'], ['seg_high_value', 'High value'], ['seg_inactive', 'Inactive'], ['seg_birthday_buyer', 'Birthday buyer'], ['seg_corporate', 'Corporate']].filter(function (x) { return s[x[0]]; });
    var h = sheetHead(esc(c.full_name)) + '<div class="ccs-sheet-body">';
    h += '<p class="ccs-hint">Customer ' + esc(custNo(c.customer_no)) + (c.archived_at ? ' · Archived' : '') + '</p>';
    if (c.review_flag === 'possible_duplicate') h += '<p class="ccs-warn"><b>Check for a duplicate.</b> ' + esc(c.review_note || 'Another profile has the same mobile number.') + (can('manager') ? ' <button type="button" class="ccs-link" data-act="ws-cm-dups-open">Review duplicates</button>' : '') + '</p>';
    if ((d.mergedFrom || []).length) h += '<p class="ccs-hint">Merged into this profile: ' + esc(d.mergedFrom.map(function (x) { return custNo(x.customer_no) + ' ' + x.full_name; }).join(', ')) + '.</p>';
    h += '<div class="ccs-stats"><div><span>Orders</span><b>' + s.orders_count + '</b></div><div><span>Spend</span><b>' + money(s.completed_spend) + '</b></div><div><span>Average</span><b>' + (s.average_spend != null ? money(s.average_spend) : '—') + '</b></div><div><span>Cancelled</span><b>' + s.cancelled_count + '</b></div></div>';
    if (editor && !c.archived_at) h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-new" data-act="cust-neworder">' + NAV_ICON['new'] + 'New order for this customer</button></div>';
    if (segs.length || s.seg_upcoming_occasion) h += '<div class="ccs-tags">' + segs.map(function (x) { return '<span class="ccs-tag">' + x[1] + '</span>'; }).join('') + (s.seg_upcoming_occasion ? '<span class="ccs-pill s-deposit">Occasion due ' + esc(nice(s.next_occasion_date)) + '</span>' : '') + '</div>';
    var tab = S.sheet.edit ? 'overview' : (S.sheet.tab || 'overview');
    var tabsList = [['overview', 'Overview'], ['orders', 'Orders (' + d.orders.length + ')']];
    if (wsCanRead()) { var wsOpen = S.sheet.ws ? S.sheet.ws.tasks.filter(function (x) { return x.status === 'open' || x.status === 'in_progress'; }).length : 0; tabsList.push(['notes', 'Notes and follow-ups' + (wsOpen ? ' (' + wsOpen + ')' : '')]); }
    if (can('manager', 'front_of_house', 'marketing')) tabsList.push(['comms', 'Communications']);
    h += '<div class="ccs-tabs ws-tabs" role="group" aria-label="Customer sections">' + tabsList.map(function (x) { return '<button type="button" class="ccs-tab" data-act="ws-tab" data-v="' + x[0] + '" aria-pressed="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'overview') {
      if (S.sheet.edit) h += customerEditor(d);
      else {
        h += '<section class="ccs-box"><h3>Contact</h3><dl class="ccs-kv">' + kv('Mobile', c.phone) + kv('Other number', c.alt_phone) + kv('Email', c.email) +
          kv('Prefers', { whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email' }[c.preferred_contact]) + kv('Company', c.company) + kv('Delivery address', c.delivery_address) +
          kv('Birthday', birthday(c.birth_day, c.birth_month)) + kv('Preferences', c.preferences) + kv('Service notes', c.notes) +
          kv('Came from', CUSTOMER_SOURCE[c.customer_source] || SOURCE_LABEL[s.first_source]) + kv('Usually orders', s.favourite_cake) + kv('Occasions', (s.occasions || []).join(', ')) + '</dl>' +
          '<div class="ccs-actions-row">' + (c.phone ? '<a class="ccs-btn ccs-ghost" href="' + esc(waLink(c.phone)) + '" target="_blank" rel="noopener">WhatsApp</a><a class="ccs-btn ccs-ghost" href="tel:' + esc(digits(c.phone)) + '">Call</a>' : '') +
          (editor ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cust-edit">Edit Customer</button>' : '') +
          (can('manager') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cust-history">' + (S.sheet.hist ? 'Hide change history' : 'Change history') + '</button>' : '') + '</div></section>';
        if (S.sheet.hist) h += customerHistory();
      }
      if (!S.sheet.edit) h += wsOverview(d);
    } else if (tab === 'orders') {
      h += '<section class="ccs-box"><h3>Orders</h3>' + (editor && d.orders.length ? '<p class="ccs-hint">Repeat this order starts a new order with today\'s prices. You choose the date and check the message and dietary needs again.</p>' : '') + (d.orders.length ? '<div class="ccs-list">' + d.orders.map(function (o) { var i = (o.order_items || [])[0]; return '<button type="button" class="ccs-card k-' + (STATUS[o.order_status] || ['', 'off'])[1] + '" data-act="open-order" data-id="' + o.id + '" style="grid-template-columns:110px minmax(0,1fr) auto"><span class="ccs-when"><b>' + esc(nice(o.required_date)) + '</b><span>' + esc(o.reference) + '</span></span><span class="ccs-what"><b>' + esc(cakeLine(i)) + '</b><span class="ccs-tags">' + pill(o.order_status, o.fulfilment_method) + (i && i.occasion ? '<span class="ccs-pill">' + esc(i.occasion) + '</span>' : '') + (o.order_status === 'confirmed' || o.order_status === 'completed' ? payPill(o.payment_status) : '') + (o.contact_name && o.contact_name !== c.full_name ? '<span class="ccs-tag">Ordered as ' + esc(o.contact_name) + '</span>' : '') + '</span></span><span class="ccs-price">' + money(o.final_total != null ? o.final_total : o.estimate_total) + '</span></button>' + (editor && !c.archived_at && i ? '<div class="ws-repeat"><button type="button" class="ccs-link" data-act="ws-repeat" data-id="' + o.id + '">Repeat this order</button></div>' : ''); }).join('') + '</div>' : '<p class="ccs-hint">No orders.</p>') + '</section>';
      if (d.sheet.length) h += '<section class="ccs-box"><h3>Orders from the old sheets</h3><p class="ccs-hint">Recorded in the Google Sheets before this app. Shown as typed; not yet in the totals above.</p><ul class="ccs-plain cm-sheetlist">' + d.sheet.map(function (o) {
        return '<li><b>' + esc(o.fulfil_date ? nice(o.fulfil_date) + ' ' + o.fulfil_date.slice(0, 4) : 'No pickup date') + '</b> · ' + esc([o.cake, o.size_inch ? o.size_inch + ' inch' : ''].filter(Boolean).join(' ') || 'Cake not stated') +
          (o.value != null ? ' · ' + money(o.value) : '') + ' · ' + esc(o.source || '') + (o.reference ? ' ' + esc(o.reference) : '') + (o.name_on_sheet && o.name_on_sheet !== c.full_name ? ' · as ' + esc(o.name_on_sheet) : '') +
          (can('manager') ? ' <button type="button" class="ccs-link" data-act="rg-open" data-v="' + esc(o.rec_key) + '">Full record</button>' : '') + '</li>';
      }).join('') + '</ul></section>';
    } else if (tab === 'notes') {
      h += wsView();
    } else if (tab === 'comms') {
      if (can('manager', 'front_of_house', 'marketing')) {
        h += '<section class="ccs-box"><h3>Marketing permission: Corner Café</h3><p class="ccs-hint">Only message customers by a channel marked Yes. A yes is kept with the number or email it was given for, so a new number starts at Not asked.</p><dl class="ccs-kv">' +
          CHANNELS.map(function (ch) {
            var st = consentLine(d, ch[0]);
            var btns = st.none ? '' : ' <span class="ccs-consent-acts">' + (st.yes && !st.re ? '' : '<button type="button" class="ccs-link" data-act="consent-ch" data-ch="' + ch[0] + '" data-v="true">' + (st.yes ? 'Customer reconfirmed' : 'Customer said yes') + '</button>') +
              (st.no ? '' : ' <button type="button" class="ccs-link ccs-red" data-act="consent-ch" data-ch="' + ch[0] + '" data-v="false">' + (st.yes ? 'Customer said stop' : 'Customer said no') + '</button>') + '</span>';
            return '<dt>' + ch[1] + '</dt><dd><span class="' + st.cls + '">' + esc(st.text) + '</span>' + btns + '</dd>';
          }).join('') + '</dl>' +
          (d.log.length ? '<details class="ccs-more"><summary>Permission record</summary><ul class="ccs-plain">' + d.log.map(function (l) {
            return '<li>' + esc(stamp(l.recorded_at)) + ': ' + esc((CHANNELS.filter(function (x) { return x[0] === l.channel; })[0] || [0, l.channel])[1]) + ' ' + (l.granted ? 'yes' : 'no') + (l.needs_reconfirm ? ' (needs reconfirming)' : '') + ', ' + esc(l.destination) + '. ' + esc(l.source) + '</li>';
          }).join('') + '</ul></details>' : '') + '</section>';
      }
      h += '<p class="ccs-hint ws-service">Messages about an order, such as ready for collection or a change, are service messages and do not need marketing permission.</p>';
    }
    return h + '</div>';
  }
  function customerFields(c) {
    var inp = function (id, label, v, extra) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><input class="ccs-input" id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '></div>'; };
    var ta = function (id, label, v, ph) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><textarea class="ccs-input" id="' + id + '" placeholder="' + esc(ph || '') + '">' + esc(v || '') + '</textarea></div>'; };
    var sel = function (id, label, opts, v) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><select class="ccs-input" id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(v == null ? '' : v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>'; };
    var days = [['', 'Day']].concat(Array.apply(null, Array(31)).map(function (x, i) { return [i + 1, String(i + 1)]; }));
    var months = [['', 'Month']].concat(MONTHS.map(function (m, i) { return [i + 1, m]; }));
    return '<div class="ccs-row">' + inp('ce-name', 'Name', c.full_name, ' autocomplete="off"') + inp('ce-phone', 'Mobile', c.phone, ' inputmode="tel"') + '</div>' +
      '<div class="ccs-row">' + inp('ce-alt', 'Other number (optional)', c.alt_phone, ' inputmode="tel"') + inp('ce-email', 'Email', c.email, ' type="email"') + '</div>' +
      '<div class="ccs-row">' + sel('ce-pref', 'Best way to reach them', [['whatsapp', 'WhatsApp'], ['phone', 'Phone call'], ['email', 'Email']], c.preferred_contact) + inp('ce-company', 'Company (corporate customers)', c.company) + '</div>' +
      '<label class="ccs-check"><input type="checkbox" id="ce-corp"' + (c.is_corporate ? ' checked' : '') + '> Corporate customer</label>' +
      ta('ce-addr', 'Usual delivery address (optional)', c.delivery_address) +
      '<div class="ccs-row">' + sel('ce-bday', 'Birthday day (optional)', days, c.birth_day) + sel('ce-bmonth', 'Birthday month', months, c.birth_month) + '</div><p class="ccs-hint">Day and month only. Never ask for the year.</p>' +
      ta('ce-prefs', 'Preferences', c.preferences, 'For example: less sweet, prefers chocolate, collects after 5pm') +
      ta('ce-notes', 'Service notes', c.notes, 'Things that help the team. No health or personal details.');
  }
  // Cancel or close with unsaved typing needs a second tap, so nothing typed is lost by accident.
  function cancelBtn(act, label) {
    return '<button type="button" class="ccs-btn ccs-ghost" data-act="' + act + '">' + (label || 'Cancel') + '</button>';
  }
  function customerEditor(d) {
    var c = d.c, open = d.orders.filter(function (o) { return OPEN_STATUSES.indexOf(o.order_status) > -1; }).length;
    var h = '<section class="ccs-panel"><b>Edit customer</b>' + customerFields(c);
    if (open) h += '<div class="ccs-field"><span class="ccs-label">If the name, mobile, email or company changes, what about the ' + open + ' open order' + (open > 1 ? 's' : '') + '?</span><div class="ccs-chips">' +
      '<button type="button" class="ccs-chip" data-act="ce-orders" data-v="profile" aria-pressed="' + (S.sheet.ordersChoice === 'profile') + '">Profile only</button>' +
      '<button type="button" class="ccs-chip" data-act="ce-orders" data-v="orders" aria-pressed="' + (S.sheet.ordersChoice === 'orders') + '">Also update open orders</button></div>' +
      '<p class="ccs-hint">Completed and cancelled orders always keep the details they were placed with.</p></div>';
    if (S.sheet.conflict) h += '<p class="ccs-warn">' + esc(S.sheet.conflict) + '</p>';
    if (S.panelErr) h += '<p class="ccs-err">' + esc(S.panelErr) + '</p>';
    return h + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="cust-save">Save changes</button>' + cancelBtn('cust-cancel') + '</div></section>';
  }
  function openNewCustomer() {
    S.sheet = { type: 'custnew', c: { preferred_contact: 'whatsapp' }, consent: [], matches: null }; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet();
    var f = document.getElementById('ce-name'); if (f) f.focus();
  }
  function newCustomerSheet() {
    var sh = S.sheet, h = sheetHead('Add customer') + '<div class="ccs-sheet-body"><section class="ccs-panel">' + customerFields(sh.c);
    h += '<div class="ccs-field"><span class="ccs-label">Marketing: did the customer agree to receive Corner Café cake specials and reminders?</span><div class="ccs-chips">' +
      CHANNELS.map(function (ch) { return '<button type="button" class="ccs-chip" data-act="cn-consent" data-v="' + ch[0] + '" aria-pressed="' + (sh.consent.indexOf(ch[0]) > -1) + '">' + ch[1] + '</button>'; }).join('') +
      '</div><p class="ccs-hint">Only tap a channel if the customer said yes to it. Leave all off if they were not asked.</p></div>';
    if (sh.matches) h += '<div class="ccs-warn"><b>Already on a profile.</b> Check this is not the same person before adding.<ul class="ccs-plain">' + sh.matches.map(function (m) {
      return '<li>' + esc(custNo(m.customer_no)) + ' ' + esc(m.full_name) + ' (' + esc(m.why) + ') <button type="button" class="ccs-link" data-act="open-customer" data-id="' + esc(m.id) + '">Open this customer</button></li>';
    }).join('') + '</ul></div>';
    if (S.panelErr) h += '<p class="ccs-err">' + esc(S.panelErr) + '</p>';
    h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="cn-save"' + (sh.matches ? ' data-v="force"' : '') + '>' + (sh.matches ? 'Not the same person, add customer' : 'Add customer') + '</button>' + cancelBtn('cn-cancel') + '</div></section></div>';
    return h;
  }
  function readCustomerForm() {
    return { full_name: val('ce-name').trim().replace(/\s+/g, ' '), phone: val('ce-phone').trim(), alt_phone: val('ce-alt').trim(), email: val('ce-email').trim().toLowerCase(),
      preferred_contact: val('ce-pref'), company: val('ce-company').trim(), is_corporate: document.getElementById('ce-corp').checked, delivery_address: val('ce-addr').trim(),
      birth_day: val('ce-bday') ? Number(val('ce-bday')) : null, birth_month: val('ce-bmonth') ? Number(val('ce-bmonth')) : null, preferences: val('ce-prefs').trim(), notes: val('ce-notes').trim() };
  }
  function keepCustomerTyping() { ['ce-name', 'ce-phone', 'ce-alt', 'ce-email', 'ce-company', 'ce-addr', 'ce-prefs', 'ce-notes'].forEach(function (f) { var v = val(f); if (v) S.dirty[f] = v; }); }
  function saveNewCustomer(force) {
    var sh = S.sheet, f = readCustomerForm();
    sh.c = Object.assign({}, f);
    var stop = function (m) { S.panelErr = m; keepCustomerTyping(); clearBusy(); renderSheet(); };
    if (f.full_name.length < 2) return stop('Enter the customer name.');
    if (!digits(f.phone) && !f.email) return stop('Enter a mobile number or an email so the customer can be reached.');
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return stop('Check the email address.');
    if ((f.birth_day == null) !== (f.birth_month == null)) return stop('Give both the day and the month, or leave the birthday blank.');
    sb.rpc('staff_create_customer', { p: Object.assign({}, f, { consent_channels: sh.consent }), p_confirm_new: !!force }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) {
        if (r.data.error === 'possible_duplicate') { sh.matches = r.data.matches || []; return stop(null); }
        return stop(r.data.message);
      }
      clearBusy(); S.dirty = {}; toast('Customer ' + custNo(r.data.customer_no) + ' added');
      if (S.cust.loaded) loadCustomers();
      openCustomer(r.data.id);
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function customerHistory() {
    var hs = S.sheet.hist;
    if (hs.loading) return '<section class="ccs-box"><h3>Change history</h3><p class="ccs-loading">Loading…</p></section>';
    var fmt = function (f, v) { if (v == null || v === '') return 'blank'; if (f === 'birth_month') return MONTHS[v - 1] || v; if (typeof v === 'boolean') return v ? 'Yes' : 'No'; return String(v); };
    return '<section class="ccs-box"><h3>Change history</h3>' + (hs.rows.length ? '<ul class="ccs-plain">' + hs.rows.map(function (r) {
      return '<li>' + esc(stamp(r.at)) + ', ' + esc(r.by) + ': ' + esc(FIELD_LABEL[r.field] || r.field) + ' from ' + esc(fmt(r.field, r.from)) + ' to ' + esc(fmt(r.field, r.to)) + '</li>';
    }).join('') + '</ul>' : '<p class="ccs-hint">No changes recorded since the profile was made.</p>') + '</section>';
  }
  function loadCustomerHistory() {
    var id = S.sheet.id; S.sheet.hist = { loading: true, rows: [] }; renderSheet();
    sb.rpc('customer_history', { p_customer: id }).then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) throw new Error(r.data.message);
      if (S.sheet && S.sheet.id === id) { S.sheet.hist = { rows: r.data.changes || [] }; renderSheet(); }
    }).catch(function (e) { if (S.sheet) S.sheet.hist = null; fail(e); });
  }
  function saveCustomer() {
    var d = S.sheet.data, c = d.c, id = S.sheet.id;
    var now = readCustomerForm();
    var ch = {}; Object.keys(now).forEach(function (k) { var a = now[k], b = c[k]; if (a === '') a = null; if (b === '') b = null; if (k === 'is_corporate') { a = !!a; b = !!b; } if (a !== (b == null ? null : b)) ch[k] = now[k]; });
    var keep = function (m) { S.panelErr = m; ['ce-name', 'ce-phone', 'ce-alt', 'ce-email', 'ce-company', 'ce-addr', 'ce-prefs', 'ce-notes'].forEach(function (f) { S.dirty[f] = val(f); }); clearBusy(); renderSheet(); };
    if (!Object.keys(ch).length) return keep('Nothing has changed.');
    if (now.full_name.length < 2) return keep('Enter the customer name.');
    if (now.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(now.email)) return keep('Check the email address.');
    if ((now.birth_day == null) !== (now.birth_month == null)) return keep('Give both the day and the month, or leave the birthday blank.');
    var contactChange = ['full_name', 'phone', 'email', 'company'].some(function (k) { return k in ch; });
    var open = d.orders.filter(function (o) { return OPEN_STATUSES.indexOf(o.order_status) > -1; }).length;
    if (contactChange && open && !S.sheet.ordersChoice) return keep('Choose whether the open orders should change too.');
    sb.rpc('staff_update_customer', { p_customer: id, p_version: c.version, p_changes: ch, p_active_orders: contactChange && S.sheet.ordersChoice === 'orders' }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) {
        if (r.data.error === 'changed') {
          keep(null); S.sheet.conflict = r.data.message;
          var cur = r.data.current || {}; d.c = Object.assign({}, c, { version: cur.version });
          return openCustomer(id, true);
        }
        return keep(r.data.message);
      }
      var msg = 'Customer updated.';
      if (r.data.orders_updated) msg += ' ' + r.data.orders_updated + ' open order' + (r.data.orders_updated > 1 ? 's' : '') + ' updated.';
      if (r.data.shared_phone) msg += ' This number is also on ' + r.data.shared_phone + ' other profile' + (r.data.shared_phone > 1 ? 's' : '') + '.';
      if (r.data.consent_not_moved) msg += ' Marketing permission stays with the old number or email. Ask the customer again.';
      clearBusy(); S.sheet.edit = false; S.sheet.conflict = null; S.sheet.ordersChoice = null; S.sheet.hist = null; S.panelErr = null; S.dirty = {}; toast(msg);
      openCustomer(id, true); if (S.cust.loaded) loadCustomers();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function setChannelConsent(ch, yes) {
    var id = S.sheet.id;
    return sb.rpc('staff_set_channel_consent', { p_customer: id, p_channels: [ch], p_granted: yes, p_note: null }).then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) throw new Error(r.data.message);
      clearBusy(); toast(yes ? 'Recorded: customer said yes' : 'Recorded: customer said no'); openCustomer(id, true); if (S.cust.loaded) loadCustomers();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function copyText(text, msg) {
    var done = function () { toast(msg); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); }); else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); }

/*@DASH@*/
  // ---------- settings ----------
  function loadSettings() {
    S.settings = null; view();
    var reqs = [sb.from('locations').select('*').eq('code', 'corner-cafe').single(), sb.from('closed_dates').select('*').gte('closed_on', today()).order('closed_on'), sb.from('products').select('*, product_sizes(*), product_variants(*)').order('sort'), sb.from('delivery_zones').select('*').order('sort')];
    if (can('admin')) { reqs.push(sb.rpc('admin_list_users')); reqs.push(sb.rpc('admin_deleted_orders')); }
    Promise.all(reqs).then(function (rs) { rs.forEach(function (r) { if (r.error) throw r.error; }); S.settings = { loc: rs[0].data, closed: rs[1].data || [], products: rs[2].data || [], zones: rs[3].data || [], team: rs[4] ? rs[4].data || [] : null, deleted: rs[5] && rs[5].data && rs[5].data.ok ? rs[5].data.orders : null }; if (S.tab === 'settings') view(); if (can('admin')) backupLoad(); }).catch(fail);
  }
  function settingsView() {
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Settings</h1><p class="ccs-sub">Changes apply to the website order form straight away.</p></div></div>';
    var st = S.settings; if (!st) return h + '<p class="ccs-loading">Loading settings…</p>';
    var L = st.loc;
    h += '<div class="ccs-set">';
    if (!L.defaults_confirmed) h += '<p class="ccs-note">The notice periods and collection hours are starting defaults. Check them, then tick “These are correct” and save.</p>';
    h += '<details open><summary>Online orders <span>' + (L.accepts_online ? 'Taking orders' : 'Paused') + '</span></summary><div class="ccs-set-body"><label class="ccs-check"><input type="checkbox" id="st-online"' + (L.accepts_online ? ' checked' : '') + '> Take cake orders on the website</label><p class="ccs-hint">When paused, the website asks guests to call the café.</p></div></details>';
    h += '<details' + (!L.defaults_confirmed ? ' open' : '') + '><summary>Notice and collection hours <span>' + L.lead_days_standard + ' days standard · ' + L.lead_days_custom + ' days custom</span></summary><div class="ccs-set-body"><div class="ccs-row">' +
      sf('st-lead-s', 'Notice for standard cakes (days)', L.lead_days_standard) + sf('st-lead-c', 'Notice for custom cakes (days)', L.lead_days_custom) + sf('st-ahead', 'Furthest ahead (days)', L.max_days_ahead) + '</div><div class="ccs-row">' +
      sf('st-open', 'First collection', L.collection_open.slice(0, 5), 'time') + sf('st-close', 'Last collection', L.collection_close.slice(0, 5), 'time') +
      '<div class="ccs-field"><label class="ccs-label" for="st-slot">Time slots</label><select class="ccs-input" id="st-slot">' + [15, 30, 60].map(function (m) { return '<option value="' + m + '"' + (L.slot_minutes === m ? ' selected' : '') + '>Every ' + m + ' minutes</option>'; }).join('') + '</select></div>' +
      sf('st-cap', 'Most cakes per day (blank for no limit)', L.daily_capacity == null ? '' : L.daily_capacity) + '</div>' +
      '<label class="ccs-check"><input type="checkbox" id="st-confirmed"' + (L.defaults_confirmed ? ' checked' : '') + '> These are correct</label>' +
      '<button type="button" class="ccs-btn" data-act="save-loc">Save</button></div></details>';
    h += '<details><summary>Closed days <span>' + (st.closed.length ? st.closed.length + ' coming up' : 'None') + '</span></summary><div class="ccs-set-body">' +
      (st.closed.length ? '<div class="ccs-history">' + st.closed.map(function (c) { return '<div><span>' + esc(nice(c.closed_on)) + '</span><span>' + esc(c.reason || 'Closed') + ' <button type="button" class="ccs-link ccs-red" data-act="del-closed" data-id="' + c.id + '">Remove</button></span></div>'; }).join('') + '</div>' : '<p class="ccs-hint">No closed days set.</p>') +
      '<div class="ccs-row">' + sf('st-cdate', 'Date', '', 'date') + sf('st-creason', 'Reason (optional)', '') + '</div><button type="button" class="ccs-btn ccs-ghost" data-act="add-closed">Add closed day</button></div></details>';
    h += '<details><summary>Cakes and prices <span>' + st.products.filter(function (p) { return p.status === 'active'; }).length + ' cakes on sale</span></summary><div class="ccs-set-body">' + st.products.map(function (p) {
      var sizes = (p.product_sizes || []).slice().sort(function (a, b) { return a.size_inch - b.size_inch; });
      return '<div class="ccs-box"><div class="ccs-actions-row" style="justify-content:space-between;align-items:center"><b style="color:var(--ccs-ink);font-size:17px">' + esc(p.name) + '</b><label class="ccs-check"><input type="checkbox" data-pstatus="' + p.id + '"' + (p.status === 'active' ? ' checked' : '') + '> On sale</label></div>' +
        '<div class="ccs-prices">' + sizes.map(function (s) { return '<div class="ccs-field"><label class="ccs-label" for="pz-' + s.id + '">' + s.size_inch + ' inch (FJD)</label><input class="ccs-input" id="pz-' + s.id + '" data-size="' + s.id + '" inputmode="decimal" value="' + Number(s.price) + '"><label class="ccs-check" style="font-size:13px"><input type="checkbox" data-sactive="' + s.id + '"' + (s.active ? ' checked' : '') + '> Offered</label></div>'; }).join('') + '</div>' +
        '<button type="button" class="ccs-btn ccs-ghost" data-act="save-prod" data-id="' + p.id + '">Save ' + esc(p.name) + '</button></div>';
    }).join('') + '</div></details>';
    h += '<details><summary>Delivery areas <span>' + st.zones.filter(function (z) { return z.active; }).length + ' areas</span></summary><div class="ccs-set-body"><p class="ccs-hint">Leave the fee blank where staff set the fee for each order. Website guests cannot choose delivery yet.</p>' +
      st.zones.map(function (z) { return '<div class="ccs-row" style="align-items:end">' + sf('dz-n-' + z.id, 'Area', z.name, 'text') + sf('dz-f-' + z.id, 'Fee (FJD)', z.fee == null ? '' : Number(z.fee)) + '<label class="ccs-check" style="padding-bottom:14px"><input type="checkbox" id="dz-a-' + z.id + '"' + (z.active ? ' checked' : '') + '> Offered</label></div>'; }).join('') +
      '<button type="button" class="ccs-btn ccs-ghost" data-act="save-zones">Save delivery areas</button><div class="ccs-row" style="align-items:end">' + sf('dz-new-n', 'New area', '', 'text') + sf('dz-new-f', 'Fee (FJD)', '') + '<button type="button" class="ccs-btn ccs-ghost" data-act="add-zone">Add area</button></div></div></details>';
    if (st.team) {
      var tm = st.tmDraft || {};
      h += '<details' + (st.tmOpen ? ' open' : '') + '><summary>Team and access <span>' + st.team.filter(function (u) { return u.active; }).length + ' with access</span></summary><div class="ccs-set-body">';
      if (st.tmDone) h += '<div class="ccs-note" role="status"><b>' + esc(st.tmDone.name) + ' can now sign in.</b> Give them the staff page link, their email (' + esc(st.tmDone.email) + ') and the temporary password you set. They choose their own password when they first sign in.</div>';
      h += '<div class="ccs-box ccs-tmadd"><b style="color:var(--ccs-ink);font-size:17px">Add a staff member</b><div class="ccs-row">' +
        sf('tm-new-n', 'Name', tm.name || '', 'text') + sf('tm-new-e', 'Email', tm.email || '', 'email') +
        '<div class="ccs-field"><label class="ccs-label" for="tm-new-r">Role</label><select class="ccs-input" id="tm-new-r">' + ROLES.map(function (r) { return '<option value="' + r[0] + '"' + ((tm.role || 'front_of_house') === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="ccs-row" style="align-items:end">' + sf('tm-new-p', 'Temporary password', tm.password || '', 'text') + '<button type="button" class="ccs-btn ccs-ghost" data-act="tm-gen">Make one for me</button></div>' +
        '<p class="ccs-hint">Front of house and managers run orders. Kitchen logins see only the kitchen board, with no prices or customer details. Only admins see this team list.</p>' +
        (st.tmErr ? '<p class="ccs-err" role="alert">' + esc(st.tmErr) + '</p>' : '') +
        '<button type="button" class="ccs-btn" data-act="tm-add">Add staff member</button></div>';
      h += st.team.map(function (u) {
        var mine = S.me && u.user_id === S.me.user_id;
        return '<div class="ccs-box"><b style="color:var(--ccs-ink)">' + esc(u.email) + '</b>' + (u.full_name ? '' : '<p class="ccs-hint">No role yet. Give this login a name and role, then save.</p>') + '<div class="ccs-row">' + sf('tm-n-' + u.user_id, 'Name', u.full_name || '', 'text') +
          '<div class="ccs-field"><label class="ccs-label" for="tm-r-' + u.user_id + '">Role</label><select class="ccs-input" id="tm-r-' + u.user_id + '">' + ROLES.map(function (r) { return '<option value="' + r[0] + '"' + ((u.role || 'front_of_house') === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div></div>' +
          '<label class="ccs-check"><input type="checkbox" id="tm-a-' + u.user_id + '"' + (u.active ? ' checked' : '') + '> Has access</label>' +
          (st.resetFor === u.user_id ? '<div class="ccs-panel"><div class="ccs-row" style="align-items:end">' + sf('tm-rp-' + u.user_id, 'New temporary password', '', 'text') + '<button type="button" class="ccs-btn ccs-ghost" data-act="tm-gen" data-for="tm-rp-' + u.user_id + '">Make one for me</button></div><p class="ccs-hint">They will be asked to choose their own password at their next sign-in.</p>' + (st.resetErr ? '<p class="ccs-err" role="alert">' + esc(st.resetErr) + '</p>' : '') + '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="tm-reset-save" data-id="' + u.user_id + '">Save new password</button><button type="button" class="ccs-btn ccs-ghost" data-act="tm-reset" data-id="">Cancel</button></div></div>' : '') +
          '<div class="ccs-actions-row ccs-more-row"><button type="button" class="ccs-btn ccs-ghost" data-act="save-staff" data-id="' + u.user_id + '">Save</button>' + (mine ? '' : '<button type="button" class="ccs-link" data-act="tm-reset" data-id="' + u.user_id + '">Forgotten password? Set a new one</button>') + '</div></div>';
      }).join('') + '</div></details>';
      h += backupView(st);
      h += deletedView(st);
    }
    return h + '</div>';
  }
  // ---------- deleted orders (admins) ----------
  function deletedView(st) {
    var l = st.deleted; if (!l) return '';
    return '<details><summary>Deleted orders <span>' + (l.length ? l.length + ' deleted' : 'None') + '</span></summary><div class="ccs-set-body">' +
      (l.length ? '<p class="ccs-hint">Deleted orders are hidden from every list and figure. Restore puts an order back exactly as it was.</p><div class="ccs-history">' + l.map(function (d) {
        return '<div><span>' + esc(when(d.deleted_at)) + '</span><span><b style="font-weight:600;color:var(--ccs-ink)">' + esc(d.reference) + '</b> ' + esc(d.customer || '') + ', due ' + esc(nice(d.date)) + ' · deleted by ' + esc(d.deleted_by) + ': ' + esc(d.reason || '') +
          ' <button type="button" class="ccs-link" data-act="del-restore" data-id="' + d.id + '">Restore</button></span></div>';
      }).join('') + '</div>' : '<p class="ccs-hint">No orders have been deleted. Admins can delete a test order or one entered by mistake from the order itself, as long as no payment is recorded.</p>') + '</div></details>';
  }
  // ---------- Google Sheet backup (admins) ----------
  function when(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Pacific/Fiji', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''; }
  function backupView(st) {
    var k = st.bk, open = st.bkOpen ? ' open' : '', h;
    if (!k) return '<details' + open + '><summary>Backup to Google Sheet <span>' + (st.bkErr ? 'Could not check' : 'Checking…') + '</span></summary><div class="ccs-set-body">' + (st.bkErr ? '<p class="ccs-err" role="alert">' + esc(st.bkErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="bk-reload">Try again</button>' : '<p class="ccs-loading">Checking…</p>') + '</div></details>';
    var tag = !k.robot_email ? 'Not set up' : !k.linked ? 'Not linked' : k.last_error ? 'Needs attention' : 'On';
    h = '<details' + open + '><summary>Backup to Google Sheet <span>' + tag + '</span></summary><div class="ccs-set-body">';
    if (!k.robot_email) return h + '<p class="ccs-hint">A one-time setup is needed first: a Google robot account, with its key saved in Supabase as GOOGLE_SERVICE_ACCOUNT_JSON. When that is done, a box to paste your sheet link appears here.</p><button type="button" class="ccs-btn ccs-ghost" data-act="bk-reload">Check again</button></div></details>';
    var err = st.bkErr ? '<p class="ccs-err" role="alert">' + esc(st.bkErr) + '</p>' : '';
    var linkForm = '<ol class="ccs-hint ccs-bksteps"><li>Make a new Google Sheet.</li><li>Press Share and add this address as an Editor:<br><b class="ccs-bkmail">' + esc(k.robot_email).replace('@', '@<wbr>') + '</b><br><button type="button" class="ccs-link" data-act="bk-mail">Copy address</button></li><li>Copy the sheet link from the address bar and paste it here.</li></ol>' +
      '<div class="ccs-row" style="align-items:end">' + sf('bk-url', 'Google Sheet link', st.bkUrl || '', 'url') + '</div>' + err +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="bk-link">Link sheet</button>' + (k.linked ? '<button type="button" class="ccs-btn ccs-ghost" data-act="bk-change" data-v="0">Cancel</button>' : '') + '</div>';
    if (!k.linked) return h + '<p class="ccs-hint">Every order is copied to the sheet, one row per order, and kept up to date every 5 minutes. Old orders from before this system are not included.</p>' + linkForm + '</div></details>';
    if (st.bkChange) return h + '<p class="ccs-hint">Link a different sheet. All orders are copied into the new one. The old sheet keeps what it has but stops updating.</p>' + linkForm + '</div></details>';
    return h + (k.last_error ? '<p class="ccs-err" role="alert">' + esc(k.last_error) + '</p>' : '') + err +
      '<div class="ccs-history"><div><span>Sheet</span><span><a class="ccs-link" href="' + esc(k.linked.url) + '" target="_blank" rel="noopener">' + esc(k.linked.title || 'Open sheet') + '</a></span></div>' +
      '<div><span>Tab</span><span>' + esc(k.linked.tab) + '</span></div>' +
      '<div><span>Last copied</span><span>' + (k.last_ok_at ? esc(when(k.last_ok_at)) : 'Not yet') + '</span></div>' +
      '<div><span>Orders copied</span><span>' + k.orders_copied + '</span></div></div>' +
      '<p class="ccs-hint">New and changed orders are copied every 5 minutes. Editing the sheet does not change orders here.</p>' +
      '<div class="ccs-actions-row ccs-more-row"><button type="button" class="ccs-btn ccs-ghost" data-act="bk-copy">Copy now</button><button type="button" class="ccs-link" data-act="bk-change" data-v="1">Link a different sheet</button><button type="button" class="ccs-link ccs-red" data-act="bk-unlink">Stop backup</button></div></div></details>';
  }
  function sheetBackup(body) {
    return sb.functions.invoke('sheet-backup', { body: body }).then(function (r) {
      if (r.error) { var c = r.error.context && r.error.context.status; if (c === 401) return sessionExpired(); throw r.error; }
      return r.data || {};
    });
  }
  function backupDone(st, r, okMsg) {
    if (!r) return;
    if (S.settings !== st) return;
    if (r.robot_email !== undefined) st.bk = r;
    st.bkOpen = true;
    if (r.ok === false) { st.bkErr = r.message || 'That did not work. Try again.'; clearBusy(); return view(); }
    st.bkErr = null; st.bkChange = false; st.bkUrl = ''; view(); if (okMsg) toast(okMsg(r));
  }
  function backupLoad() {
    var st = S.settings; st.bkErr = null;
    sheetBackup({ op: 'status' }).then(function (r) { if (!r || S.settings !== st) return; if (r.ok === false) { st.bkErr = r.message || 'Could not check the backup.'; } else st.bk = r; if (S.tab === 'settings') view(); })
      .catch(function () { if (S.settings !== st) return; st.bkErr = 'Could not check the backup. Check the internet connection.'; if (S.tab === 'settings') view(); });
  }
  function backupLink() {
    var st = S.settings, url = val('bk-url').trim(); st.bkUrl = url; st.bkOpen = true;
    if (!/docs\.google\.com\/spreadsheets\/d\//.test(url)) { st.bkErr = 'Paste the full Google Sheet link. It starts with https://docs.google.com/spreadsheets/'; clearBusy(); return view(); }
    sheetBackup({ op: 'link', url: url }).then(function (r) { backupDone(st, r, function (x) { return 'Sheet linked. ' + (x.written || 0) + ' orders copied.'; }); }).catch(fail);
  }
  function makePassword() {
    var abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', a = new Uint32Array(12), out = '';
    crypto.getRandomValues(a); for (var i = 0; i < 12; i++) out += abc.charAt(a[i] % abc.length);
    return out.slice(0, 4) + '-' + out.slice(4, 8) + '-' + out.slice(8);
  }
  function staffAdmin(body) {
    return sb.functions.invoke('staff-admin', { body: body }).then(function (r) {
      if (r.error) { var st = r.error.context && r.error.context.status; if (st === 401) return sessionExpired(); throw r.error; }
      return r.data || {};
    });
  }
  function teamAdd() {
    var st = S.settings, d = { name: val('tm-new-n').trim(), email: val('tm-new-e').trim(), role: val('tm-new-r'), password: val('tm-new-p') };
    st.tmDraft = d; st.tmOpen = true; st.tmDone = null;
    st.tmErr = d.name.length < 2 ? 'Enter the staff member\'s name.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) ? 'Check the email address.' : d.password.length < 10 ? 'Use at least 10 characters for the temporary password, or tap Make one for me.' : null;
    if (st.tmErr) { clearBusy(); return view(); }
    staffAdmin({ op: 'create', name: d.name, email: d.email, role: d.role, password: d.password }).then(function (r) {
      if (!r) return;
      if (!r.ok) { st.tmErr = r.message || 'The login could not be created.'; return view(); }
      st.tmErr = null; st.tmDraft = null; st.tmDone = { name: d.name, email: r.email || d.email };
      toast(d.name + ' added'); var keep = st.tmDone; loadSettingsKeep(keep);
    }).catch(fail);
  }
  function teamReset(uid) {
    var st = S.settings, pw = val('tm-rp-' + uid);
    if (pw.length < 10) { st.resetErr = 'Use at least 10 characters, or tap Make one for me.'; clearBusy(); return view(); }
    staffAdmin({ op: 'reset', user_id: uid, password: pw }).then(function (r) {
      if (!r) return;
      if (!r.ok) { st.resetErr = r.message || 'The password could not be changed.'; return view(); }
      st.resetFor = null; st.resetErr = null; view(); toast('New temporary password saved. Give it to them in person.');
    }).catch(fail);
  }
  function loadSettingsKeep(done) {
    var prev = S.settings;
    sb.rpc('admin_list_users').then(function (r) { if (r.error) throw r.error; if (S.settings === prev) { prev.team = r.data || []; prev.tmDone = done; prev.tmOpen = true; if (S.tab === 'settings') view(); } }).catch(fail);
  }
  function sf(id, label, v, type) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><input class="ccs-input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"' + (type ? '' : ' inputmode="numeric"') + '></div>'; }
  function refreshSetup() { return sb.rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (s) { if (!s.error) S.setup = s.data; }); }
  function saveLoc() {
    var ints = { lead_days_standard: num(val('st-lead-s')), lead_days_custom: num(val('st-lead-c')), max_days_ahead: num(val('st-ahead')) };
    for (var k in ints) if (ints[k] == null || ints[k] < 0 || ints[k] % 1) return toast('Notice and days ahead must be whole numbers.', true);
    var cap = val('st-cap').trim(); cap = cap === '' ? null : num(cap);
    if (cap != null && (cap < 1 || cap % 1)) return toast('Most cakes per day must be a whole number, or blank.', true);
    if (val('st-close') <= val('st-open')) return toast('Last collection must be after the first.', true);
    var upd = Object.assign(ints, { collection_open: val('st-open'), collection_close: val('st-close'), slot_minutes: Number(val('st-slot')), daily_capacity: cap, defaults_confirmed: document.getElementById('st-confirmed').checked });
    sb.from('locations').update(upd).eq('id', S.settings.loc.id).then(function (r) { if (r.error) throw r.error; toast('Saved'); refreshSetup(); loadSettings(); }).catch(fail);
  }
  function saveZones() {
    var jobs = [];
    S.settings.zones.forEach(function (z) {
      var n = val('dz-n-' + z.id).trim(), fs = val('dz-f-' + z.id).trim(), f = fs === '' ? null : num(fs), a = document.getElementById('dz-a-' + z.id).checked;
      if (n.length < 2) throw new Error('Each area needs a name');
      if (f != null && (isNaN(f) || f < 0)) throw new Error('Check the fee for ' + n);
      if (n !== z.name || f !== (z.fee == null ? null : Number(z.fee)) || a !== z.active) jobs.push(sb.from('delivery_zones').update({ name: n, fee: f, active: a }).eq('id', z.id));
    });
    if (!jobs.length) return toast('No changes to save');
    Promise.all(jobs).then(function (rs) { rs.forEach(function (r) { if (r.error) throw r.error; }); toast('Delivery areas saved'); refreshSetup(); loadSettings(); }).catch(fail);
  }
  function addZone() {
    var n = val('dz-new-n').trim(), fs = val('dz-new-f').trim(), f = fs === '' ? null : num(fs);
    if (n.length < 2) return toast('Enter the area name.', true);
    if (f != null && (isNaN(f) || f < 0)) return toast('Check the fee.', true);
    var sort = S.settings.zones.reduce(function (m, z) { return Math.max(m, z.sort); }, 0) + 1;
    sb.from('delivery_zones').insert({ location_id: S.settings.loc.id, name: n, fee: f, sort: sort }).then(function (r) { if (r.error) throw r.error.code === '23505' ? new Error('That area already exists') : r.error; toast('Area added'); refreshSetup(); loadSettings(); }).catch(fail);
  }
  function saveProduct(id) {
    var p = S.settings.products.filter(function (x) { return x.id === id; })[0], jobs = [];
    (p.product_sizes || []).forEach(function (s) {
      var price = num(document.getElementById('pz-' + s.id).value), act = root.querySelector('[data-sactive="' + s.id + '"]').checked;
      if (price == null || price < 0) throw new Error('Check the ' + s.size_inch + ' inch price');
      if (price !== Number(s.price) || act !== s.active) jobs.push(sb.from('product_sizes').update({ price: price, active: act }).eq('id', s.id));
    });
    var on = root.querySelector('[data-pstatus="' + id + '"]').checked ? 'active' : 'hidden';
    if (on !== p.status) jobs.push(sb.from('products').update({ status: on }).eq('id', id));
    if (!jobs.length) return toast('No changes to save');
    Promise.all(jobs).then(function (rs) { rs.forEach(function (r) { if (r.error) throw r.error; }); toast(p.name + ' saved'); refreshSetup(); loadSettings(); }).catch(fail);
  }

  // ---------- events ----------
  root.addEventListener('submit', function (e) {
    if (e.target.id === 'ccs-pw') { e.preventDefault(); savePassword(e.target); return; }
    if (e.target.id !== 'ccs-login') return; e.preventDefault();
    var btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Signing in…';
    sb.auth.signInWithPassword({ email: val('ccs-email').trim(), password: val('ccs-pass') }).then(function (r) {
      if (r.error) { loginView(r.error.message === 'Invalid login credentials' ? 'That email and password do not match.' : r.error.message); return; }
      boot();
    }).catch(function () { loginView('Could not connect. Check the internet connection.'); });
  });
  var BUSY_ACTS = { 'do-delete': 'Deleting…', 'do-confirm': 'Saving…', 'do-decline': 'Saving…', 'do-cancel': 'Saving…', 'do-note': 'Saving…', 'do-waive': 'Saving…', 'do-collected': 'Saving…', 'do-fulfil': 'Saving…',
    'do-brief': 'Preparing…', 'do-pay': 'Saving…', 'k-stage': 'Saving…', 'k-next': 'Saving…', 'k-ready': 'Saving…', 'k-assign': 'Saving…', 'save-zones': 'Saving…', 'add-zone': 'Saving…', 'cust-save': 'Saving…', 'cn-save': 'Saving…', 'consent-ch': 'Saving…',
    'consent': 'Saving…', 'save-loc': 'Saving…', 'add-closed': 'Saving…', 'save-prod': 'Saving…', 'save-staff': 'Saving…', 'tm-add': 'Adding…', 'tm-reset-save': 'Saving…', 'bk-link': 'Linking…', 'bk-copy': 'Copying…' };
  root.addEventListener('click', function (e) {
    if (e.target.id === 'ccs-shade') { if (hasTyping()) { toast('Your typing is kept. Save it, or tap the cross twice to discard it.'); return; } sheetClose(); return; }
    var b = e.target.closest('[data-act],[data-tab]'); if (!b || b.disabled) return;
    if (b.dataset.tab && !b.dataset.act) {
      if (b.dataset.tab === 'more') { openMore(false); return; }
      goTab(b.dataset.tab);
      return;
    }
    var a = b.dataset.act, v = b.dataset.v;
    if (a.indexOf('dx-') === 0) { try { dashAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('rg-') === 0) { try { regAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('ws-cm-') === 0) { try { clAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('ws-') === 0) { try { wsAct(a, b, v); } catch (err) { fail(err); } return; }
    if (BUSY_ACTS[a] && !S.busyBtn) markBusy(b, BUSY_ACTS[a]);
    try {
      switch (a) {
        case 'signout':
          if (draftHasContent() && !b.dataset.sure) { openMore(true); break; }
          S.sheetHist = false; sheetClose('pop'); clearDraft(); sb.auth.signOut().then(function () { S.me = null; loginView(); }); break;
        case 'filter': S.filter = v; S.q = ''; S.older = null; view(); break;
        case 'goto': S.filter = v; S.q = ''; goTab('orders'); window.scrollTo(0, 0); break;
        case 'day': S.filter = 'day'; S.day = v; S.q = ''; goTab('orders'); window.scrollTo(0, 0); break;
        case 'open-order': if (b.tagName === 'A') return; openOrder(b.dataset.id); break;
        case 'close': if (hasTyping() && !confirmDiscard(b, 'Tap again to discard your changes')) break; S.dirty = {}; sheetClose(); break;
        case 'fill': var fi = document.getElementById(b.dataset.f); if (fi) { fi.value = v; S.dirty[fi.id] = v; fi.focus(); } break;
        case 'history': S.sheet.showHistory = true; renderSheet(); break;
        case 'panel': S.panel = v || null; S.panelErr = null; S.dirty = {}; if (v === 'pay') { S.payKey = uuid(); S.payMethod = 'cash'; }
          if (v === 'amend') S.am = amendInit(S.sheet.data);
          if (v === 'fulfil') { var od = S.sheet.data; S.ful = { method: od.fulfilment_method || 'collection', zone: od.delivery_zone, address: od.delivery_address || '', fee: od.delivery_fee != null ? String(Number(od.delivery_fee)) : '', contact: od.delivery_contact || '' }; }
          renderSheet(); var sb_ = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (sb_ && v) sb_.scrollTop = 0; break;
        case 'method': S.payMethod = v; root.querySelectorAll('#ccs-method .ccs-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.v === v); }); break;
        case 'do-confirm': {
          var price = num(val('ccs-price')), dep = num(val('ccs-dep'));
          if (price == null || price < 0) { S.panelErr = 'Enter the price.'; renderSheet(); break; }
          act('confirm', { p_final_total: price, p_deposit: dep }); break;
        }
        case 'do-decline': act('decline', { p_note: val('ccs-note').trim() || null }); break;
        case 'do-cancel': act('cancel', { p_note: val('ccs-note').trim() }); break;
        case 'do-delete': deleteOrder(); break;
        case 'del-restore':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to restore'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Restore'; } }, 4000); break; }
          markBusy(b, 'Restoring…'); restoreOrder(b.dataset.id); break;
        case 'do-note': act('note', { p_note: val('ccs-note').trim() }); break;
        case 'do-waive': act('waive_deposit', { p_note: val('ccs-note').trim() }); break;
        case 'do-collected': act('collected', { p_note: val('ccs-note').trim() }); break;
        case 'do-fulfil': saveFulfil(); break;
        case 'f-method': S.ful.method = v; renderSheet(); break;
        case 'f-zone': S.ful.zone = v; renderSheet(); break;
        case 'do-brief': printBrief(v); break;
        case 'open-kitchen': openKitchen(b.dataset.id); break;
        case 'k-stage': kitStage(v); break;
        case 'k-next': kitStage(v, null, b.dataset.id); break;
        case 'k-ready': kitStage('ready', val('k-qc').trim()); break;
        case 'k-assign': kitAssign(); break;
        case 'k-range': S.kit.days = Number(v); S.kit.loaded = false; view(); loadKitchen(); break;
        case 'k-refresh': loadKitchen(); break;
        case 'am-set': amendSet(b.dataset.f, v); break;
        case 'am-diet': var dl_ = S.am.diets.indexOf(v); if (dl_ > -1) S.am.diets.splice(dl_, 1); else S.am.diets.push(v); S.am.preview = null; renderSheet(); break;
        case 'am-open': S.am.open[v] = !S.am.open[v]; renderSheet(); break;
        case 'am-review': amendSend(false); break;
        case 'am-save': amendSend(true); break;
        case 'am-edit': S.am.preview = null; S.panelErr = null; renderSheet(); break;
        case 'k-ack': kitAck(); break;
        case 'save-zones': saveZones(); break;
        case 'add-zone': addZone(); break;
        case 'do-pay': pay(); break;
        case 'open-customer': openCustomer(b.dataset.id); break;
        case 'cust-neworder': (function () {
          // Same New order form, with this customer already chosen
          var cd = S.sheet && S.sheet.data; if (!cd) return;
          if (draftHasContent()) { goTab('new'); toast('You have an unfinished order. Finish or clear it first.', true); return; }
          D = freshDraft(); D.phone = cd.c.phone || '';
          D.customer = { id: cd.c.id, full_name: cd.c.full_name, phone: cd.c.phone || '', orders_count: cd.sum.orders_count, favourite_cake: cd.sum.favourite_cake };
          D.step = 1; D.reached = 1; goTab('new'); window.scrollTo(0, 0);
        })(); break;
        case 'cust-edit': S.sheet.tab = 'overview'; S.sheet.edit = !S.sheet.edit; S.sheet.conflict = null; S.sheet.ordersChoice = null; S.panelErr = null; S.dirty = {}; renderSheet(); break;
        case 'cust-cancel': if (hasTyping() && !confirmDiscard(b)) break; S.sheet.edit = false; S.sheet.conflict = null; S.sheet.ordersChoice = null; S.panelErr = null; S.dirty = {}; renderSheet(); break;
        case 'cust-new': openNewCustomer(); break;
        case 'cn-consent': var ci = S.sheet.consent.indexOf(v); if (ci > -1) S.sheet.consent.splice(ci, 1); else S.sheet.consent.push(v); S.sheet.c = readCustomerForm(); keepCustomerTyping(); renderSheet(); break;
        case 'cn-save': saveNewCustomer(v === 'force'); break;
        case 'cn-cancel': if (hasTyping() && !confirmDiscard(b)) break; S.dirty = {}; sheetClose(); break;
        case 'cust-history': if (S.sheet.hist) { S.sheet.hist = null; renderSheet(); } else loadCustomerHistory(); break;
        case 'ce-orders': S.sheet.ordersChoice = v; S.panelErr = null; renderSheet(); break;
        case 'consent-ch': setChannelConsent(b.dataset.ch, v === 'true'); break;
        case 'cust-save': saveCustomer(); break;
        case 'consent': sb.rpc('staff_set_consent', { p_customer: S.sheet.id, p_granted: v === 'true', p_note: null }).then(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw new Error(r.data.message); toast(v === 'true' ? 'Marked as agreed' : 'Marked as opted out'); var id = S.sheet.id; openCustomer(id); if (S.cust.loaded) loadCustomers(); }).catch(fail); break;
        case 'seg': clSegChange(v); break;
        // calendar
        case 'cal-view': S.cal.view = v; if (S.cal.sel) S.cal.anchor = S.cal.sel; if (v === 'day') S.cal.sel = S.cal.anchor; S.cal.pre = null; S.cal.ask = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); break;
        case 'cal-move': calMove(Number(v)); break;
        case 'cal-today': S.cal.anchor = today(); S.cal.sel = today(); S.cal.pre = null; S.cal.ask = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); break;
        case 'cal-sel': calSelect(v); break;
        case 'cal-month': S.cal.view = 'month'; S.cal.anchor = v; S.cal.sel = null; S.cal.pre = null; calLoad(); break;
        case 'cal-openday': S.cal.view = 'day'; S.cal.anchor = v; S.cal.sel = v; S.cal.pre = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); window.scrollTo(0, 0); break;
        case 'cal-pre': S.cal.pre = b.dataset.id || null; S.cal.ask = null; if (S.cal.pre) { var po = S.cal.rows.filter(function (r) { return r.id === S.cal.pre; })[0]; if (po && S.cal.view !== 'day') S.cal.sel = po.required_date; } calPanel(); break;
        case 'cal-basis': S.cal.basis = v; view(); break;
        case 'cal-retry': S.cal.err = false; S.cal.cErr = false; S.cal.range = null; calLoad(); break;
        case 'cal-add': calStart(v, b.dataset.t || ''); break;
        case 'cal-add-keep': calStart(S.cal.ask.d, S.cal.ask.t, 'keep'); break;
        case 'cal-add-new': calStart(S.cal.ask.d, S.cal.ask.t, 'new'); break;
        case 'cal-add-cancel': S.cal.ask = null; calRefresh(); break;
        case 'cal-amend': calOrderThen(b.dataset.id, 'amend'); break;
        case 'cal-brief': calOrderThen(b.dataset.id, 'brief'); break;
        case 'cal-back': calBack(); break;
        // new order
        case 'new-again': if (D.result || !draftHasContent()) { D = freshDraft(); newRender(); break; } D.confirmReset = true; newRender(); if (!newInSheet()) window.scrollTo(0, 0); break;
        case 'new-keep': D.confirmReset = false; newRender(); break;
        case 'new-clear': var keepDate = newInSheet() ? [D.date, D.time] : null; clearDraft(); if (keepDate) { D.date = keepDate[0]; D.time = keepDate[1]; D.fromCal = true; } newRender(); break;
        case 'n-source': D.source = v; root.querySelectorAll('[data-act="n-source"]').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.v === v); }); break;
        case 'n-edit': goStep(Number(v)); break;
        case 'n-pick': D.customer = D.matches[Number(v)]; D.isNew = false; goStep(nextOpen(1)); break;
        case 'n-newcust': D.isNew = true; D.customer = null; refreshStep(); var nn = document.getElementById('n-name'); if (nn) nn.focus(); break;
        case 'n-cust-next':
          if (digits(D.phone).length < 7) { D.err = 'Enter the full mobile number.'; D.errField = 'phone'; refreshStep(); break; }
          if (D.name.trim().length < 2) { D.err = 'Enter the customer name.'; D.errField = 'name'; refreshStep(); break; }
          D.customer = null; goStep(nextOpen(1)); break;
        case 'n-prod': if (D.product !== v) { D.product = v; D.variant = null; var pp = prod(); if (D.size && !pp.sizes.some(function (s) { return s.inch === D.size; })) D.size = null; } refreshStep(); break;
        case 'n-var': D.variant = v; refreshStep(); break;
        case 'n-size': D.size = Number(v); refreshStep(); break;
        case 'n-next': goStep(nextOpen(Number(v))); break;
        case 'n-finish': D.finish = v; refreshStep(); break;
        case 'n-occ': D.occasion = D.occasion === v ? null : v; refreshStep(); break;
        case 'n-diet': D.diet = v; if (v === 'no') { D.diets = []; D.dietNote = ''; } D.errField = null; refreshStep(); break;
        case 'n-diets': var k = D.diets.indexOf(v); if (k > -1) D.diets.splice(k, 1); else D.diets.push(v); refreshStep(); break;
        case 'n-finish-next':
          if (D.finish === 'custom' && D.design.trim().length < 3) { D.err = 'Describe the design for the kitchen.'; D.errField = 'design'; refreshStep(); break; }
          if (!D.diet) { D.err = 'Ask about dietary needs and allergies.'; D.errField = 'diet'; refreshStep(); break; }
          goStep(nextOpen(3)); break;
        case 'n-time': D.time = v;
          if (D.method === 'delivery' && !zoneObj()) { D.err = 'Choose a delivery area.'; D.errField = 'zone'; refreshStep(); break; }
          if (D.method === 'delivery' && D.address.trim().length < 5) { D.err = 'Enter the delivery address.'; D.errField = 'address'; refreshStep(); break; }
          if (!delivOk()) { D.err = 'Enter the delivery fee for this area.'; D.errField = 'fee'; refreshStep(); break; }
          if (tooSoon() && D.rush.trim().length < 3) { D.err = 'Add a reason for the short notice first.'; D.errField = 'date'; refreshStep(); break; }
          if (tooSoon() && D.rushBy.trim().length < 2) { D.err = 'Enter who approved the short notice.'; D.errField = 'date'; refreshStep(); break; } goStep(nextOpen(4)); break;
        case 'n-date': D.date = v; D.dateOther = false; D.errField = null; refreshStep(); var tc = document.querySelector('#ccs-nstep-3 [data-act="n-time"]'); if (tc && tc.scrollIntoView) tc.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
        case 'n-date-other': D.dateOther = true; refreshStep(); var di = document.getElementById('n-date'); if (di) di.focus(); break;
        case 'n-method': D.method = v; if (v === 'collection') { D.zone = null; } D.errField = null; refreshStep(); break;
        case 'n-zone': D.zone = v; D.errField = null; refreshStep(); break;
        case 'n-askdep': D.askDeposit = true; refreshStep(); break;
        case 'n-dep': D.deposit = String(v === 'full' ? dTotal() : Math.round(dTotal() / 2)); refreshStep(); break;
        case 'n-paynow': D.payNow = true; D.payAmount = D.askDeposit && D.deposit ? D.deposit : String(dTotal()); refreshStep(); break;
        case 'n-paym': D.payMethod = v; refreshStep(); break;
        case 'n-submit': submitOrder(); break;
        // settings
        case 'save-loc': saveLoc(); break;
        case 'add-closed': var cd = val('st-cdate'); if (!cd) { toast('Choose a date.', true); break; } sb.from('closed_dates').insert({ location_id: S.settings.loc.id, closed_on: cd, reason: val('st-creason').trim() || null }).then(function (r) { if (r.error) throw r.error.code === '23505' ? new Error('That day is already closed') : r.error; toast('Closed day added'); refreshSetup(); loadSettings(); }).catch(fail); break;
        case 'del-closed':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to remove'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Remove'; } }, 4000); break; }
          markBusy(b, 'Removing…'); sb.from('closed_dates').delete().eq('id', b.dataset.id).then(function (r) { if (r.error) throw r.error; toast('Removed'); refreshSetup(); loadSettings(); }).catch(fail); break;
        case 'save-prod': saveProduct(b.dataset.id); break;
        case 'my-password': S.sheet = { type: 'pw' }; S.pwErr = null; S.dirty = {}; renderSheet(); var pf = document.getElementById('ccs-pw1'); if (pf) pf.focus(); break;
        case 'tm-gen': var gid = b.dataset.for || 'tm-new-p', gi = document.getElementById(gid); if (gi) { gi.value = makePassword(); gi.focus(); } break;
        case 'tm-reset': S.settings.resetFor = b.dataset.id || null; S.settings.resetErr = null; S.settings.tmOpen = true; view(); break;
        case 'tm-add': teamAdd(); break;
        case 'bk-reload': S.settings.bk = null; S.settings.bkOpen = true; view(); backupLoad(); break;
        case 'bk-mail': (navigator.clipboard ? navigator.clipboard.writeText(S.settings.bk.robot_email) : Promise.reject()).then(function () { toast('Address copied'); }, function () { toast('Select the address and copy it.', true); }); break;
        case 'bk-link': backupLink(); break;
        case 'bk-change': S.settings.bkChange = v === '1'; S.settings.bkErr = null; S.settings.bkOpen = true; view(); break;
        case 'bk-copy': var bst = S.settings; sheetBackup({ op: 'copy' }).then(function (r) { backupDone(bst, r, function (x) { return (x.written || 0) + ' orders copied'; }); }).catch(fail); break;
        case 'bk-unlink':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to stop the backup'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Stop backup'; } }, 4000); break; }
          markBusy(b, 'Stopping…'); var ust = S.settings; sheetBackup({ op: 'unlink' }).then(function (r) { backupDone(ust, r, function () { return 'Backup stopped. The sheet keeps what it has.'; }); }).catch(fail); break;
        case 'tm-reset-save': teamReset(b.dataset.id); break;
        case 'save-staff': var uid = b.dataset.id; sb.rpc('admin_set_staff', { p_user: uid, p_name: val('tm-n-' + uid), p_role: val('tm-r-' + uid), p_active: document.getElementById('tm-a-' + uid).checked }).then(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw new Error(r.data.message); toast('Team updated'); loadSettings(); }).catch(fail); break;
      }
    } catch (err) { fail(err); }
  });
  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id && t.closest && t.closest('#ccs-sheet') && t.type !== 'checkbox' && !newInSheet()) S.dirty[t.id] = t.value;
    if (t.id === 'ccs-q') { S.q = t.value; searchOlder(t.value); var m = document.getElementById('ccs-main'); var pos = t.selectionStart; view(); var n = document.getElementById('ccs-q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} return; }
    if (t.id === 'ccs-cq') { S.cust.q = t.value; clearTimeout(searchTimer); searchTimer = setTimeout(function () { loadCustomers().then(function () { var n = document.getElementById('ccs-cq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); return; }
    if (t.dataset.am && S.am) { S.am[t.dataset.am] = t.value; S.am.preview = null; return; }
    if (t.dataset.f && S.ful) { S.ful[t.dataset.f] = t.value; return; }
    var k = t.dataset.n; if (!k) return;
    D[k] = k === 'qty' ? Math.max(1, Math.min(50, parseInt(t.value, 10) || 1)) : t.value;
    if (D.errField) { D.err = null; D.errField = null; var er = t.closest('.ccs-step-body') && t.closest('.ccs-step-body').querySelector('.ccs-err'); if (er) er.remove(); }
    if (k === 'phone') { D.customer = null; searchCustomers(); }
    if (k === 'date') refreshStep();
    saveDraft();
  });
  root.addEventListener('change', function (e) {
    var k = e.target.dataset.nc; if (!k) return; D[k] = e.target.checked; D.restored = false;
    if (k === 'confirmNow' && !D.confirmNow) { D.askDeposit = false; D.deposit = ''; }
    refreshStep();
  });
  root.addEventListener('change', function (e) {
    if (e.target.dataset.wsc === 'cm-inc' && S.cust.exp) { S.cust.exp.inc = e.target.checked; view(); return; }
    if (e.target.dataset.wsc && S.sheet && S.sheet.type === 'customer') { wsForm()[e.target.dataset.wsc] = e.target.checked; S.sheet.wsAddErr = null; renderSheet(); if (e.target.checked) { var wt = document.getElementById('ws-title'); if (wt) wt.focus(); } return; }
    if (e.target.dataset.dx && DX) { dashChange(e.target); return; }
    if (e.target.id === 'ccs-seg') { clSegChange(e.target.value); return; }
    if (e.target.id === 'cal-status' || e.target.id === 'cal-type') { S.cal[e.target.id === 'cal-status' ? 'status' : 'type'] = e.target.value; S.cal.pre = null; calRefresh(); return; }
    if (e.target.id === 'am-prod' && S.am) { amendSet('product', e.target.value); return; }
    if (e.target.id !== 'st-online') return;
    var on = e.target.checked;
    sb.from('locations').update({ accepts_online: on }).eq('id', S.settings.loc.id).then(function (r) { if (r.error) throw r.error; toast(on ? 'Website orders switched on' : 'Website orders paused'); refreshSetup(); loadSettings(); }).catch(fail);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.sheet && !hasTyping()) sheetClose(); });
  function tick() { if (!S.me || document.visibilityState !== 'visible') return; if (S.tab === 'kitchen') loadKitchen(true); else loadOrders(true); if (S.tab === 'calendar' && !S.sheet) calLoad(true); }
  setInterval(tick, 60000);
  document.addEventListener('visibilitychange', tick);

  boot();
})();
