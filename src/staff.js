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
  function t12(t) { if (!t) return ''; var p = String(t).slice(0, 5).split(':').map(Number); return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2, '0') + (p[0] < 12 ? ' AM' : ' PM'); }
  // Times always read like 7:30 PM
  function apFix(s) { return String(s).replace(/\s?([ap])\.?m\.?$/i, function (m, x) { return ' ' + x.toUpperCase() + 'M'; }); }
  function stamp(ts) { var d = new Date(ts); return d.toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?$/i, function (m, x) { return ' ' + x.toUpperCase() + 'M'; }); }
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  var NO_CONTACT = 'No contact (walk-in orders)';
  function waLink(phone) { var d = digits(phone); if (d.length === 7) d = '679' + d; return 'https://wa.me/' + d; }
  // A custom cake that is not on the menu has no product and no tin size: it shows its flavour and the size or servings
  function isReq(i) { return !!i && !i.product_id && !i.size_inch && i.product_name === 'Custom cake'; }
  function cakeLine(i) { if (!i) return 'Cake'; if (isReq(i)) return ['Custom cake', i.variant, i.serves_label].filter(Boolean).join(', ') + (i.quantity > 1 ? ' × ' + i.quantity : ''); return (i.variant || i.product_name) + ', ' + i.size_inch + ' inch' + (i.quantity > 1 ? ' × ' + i.quantity : ''); }
  function firstItem(o) { return (o.order_items && o.order_items[0]) || null; }
  function $(s) { return root.querySelector(s); }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  var STATUS = {
    awaiting_review: ['Check order', 'review'], awaiting_quote: ['Needs a price', 'review'], awaiting_approval: ['Waiting for customer', 'wait'],
    awaiting_deposit: ['Waiting for deposit', 'wait'], confirmed: ['Confirmed', 'confirmed'], completed: ['Completed', 'done'],
    declined: ['Declined', 'off'], cancelled: ['Cancelled', 'off']
  };
  // How customers pay at the counter. M-PAiSA is the Vodafone Fiji mobile wallet.
  var PAY_METHODS = [['cash', 'Cash'], ['eftpos', 'EFTPOS'], ['mpaisa', 'M-PAiSA'], ['bank_transfer', 'Bank transfer']];
  function payMethodLabel(m) { var x = PAY_METHODS.filter(function (y) { return y[0] === m; })[0]; return x ? x[1] : String(m || '').replace('_', ' '); }
  var PAY = { unpaid: 'Unpaid', deposit_paid: 'Part paid', paid: 'Paid', refunded: 'Refunded' };
  var SOURCES = [['walk_in', 'Walk-in'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['social', 'Social media'], ['corporate', 'Corporate']];
  var SOURCE_LABEL = { online: 'Online', walk_in: 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp', social: 'Social media', corporate: 'Corporate' };
  // Three access levels (owner decision 14 Oct): Admin sees everything; Counter takes and runs orders; Kitchen sees the kitchen board.
  // Older level names stay only so an old login still shows a name; they can no longer be given out.
  var ROLES = [['admin', 'Admin'], ['front_of_house', 'Counter'], ['kitchen', 'Kitchen'], ['manager', 'Manager (old level)'], ['finance', 'Finance (old level)'], ['marketing', 'Marketing (old level)']];
  var ROLE_PICK = ROLES.slice(0, 3);
  // Occasions: the same list as the website and the database (each name maps to a fixed occasion code)
  var OCCASIONS = ['Birthday', 'Anniversary', 'Mother\'s Day', 'Father\'s Day', 'Christmas', 'Valentine\'s Day', 'Wedding', 'Corporate event', 'Baby shower', 'Graduation', 'Just because', 'Other'];
  // Compulsory: every order records an occasion. Customer didn't say is an honest answer, saved as Not specified, never a guess.
  function occChips() { return OCCASIONS.concat(['Not specified']).map(function (o) { return '<button type="button" class="ccs-chip' + (o === 'Not specified' ? ' ccs-occ-none' : '') + '" data-act="n-occ" data-v="' + esc(o) + '" aria-pressed="' + (D.occasion === o) + '">' + esc(o === 'Not specified' ? 'Customer didn\'t say' : o) + '</button>'; }).join(''); }
  function occSend() { return D.occasion === 'Other' ? ((D.occOther || '').trim() || 'Other') : D.occasion; }
  function occOther() { return D.occasion === 'Other' ? '<div class="sl-sub"><label class="sl-k" for="n-occother">What are they celebrating? <em class="sl-req">Optional</em></label><input class="ccs-input" id="n-occother" data-n="occOther" maxlength="60" value="' + esc(D.occOther || '') + '" placeholder="For example, farewell"></div>' : ''; }
  var DIETS = ['Nuts', 'Gluten (coeliac)', 'Dairy', 'Egg', 'Other'];
  // Cake requirements: what the cake must be (a must for the kitchen, not an allergy). Allergies stay separate and red.
  var REQS = [['eggless', 'Eggless (vegetarian)'], ['gluten_free', 'Gluten-free'], ['dairy_free', 'Dairy-free'], ['vegan', 'Vegan (no egg, no dairy)'], ['other', 'Other']];
  var REQ_SHORT = { eggless: 'Eggless', gluten_free: 'Gluten-free', dairy_free: 'Dairy-free', vegan: 'Vegan' };
  function reqList(i) { i = i || {}; return (i.requirements || []).map(function (k) { return k === 'other' ? (i.requirements_note || 'Other requirement') : ((REQS.filter(function (r) { return r[0] === k; })[0]) || [k, k])[1]; }); }
  function reqShort(i) { i = i || {}; return (i.requirements || []).map(function (k) { return k === 'other' ? (i.requirements_note || 'Other') : REQ_SHORT[k] || k; }); }
  function reqTags(i) { return reqShort(i).map(function (t) { return '<span class="ccs-tag t-req">' + esc(t) + '</span>'; }).join(''); }
  // Requirement chips for the order forms (st is the draft or the amendment; pre is the action prefix)
  function reqHtml(st, pre, noTail) {
    var r = st.reqs || [];
    return '<span class="sl-k rq-k">Cake requirements <em class="sl-req">Optional</em></span><div class="ccs-chips rq-chips" role="group" aria-label="Cake requirements">' +
      REQS.map(function (x) { return '<button type="button" class="ccs-chip rq-chip" data-act="' + pre + '-rq" data-v="' + x[0] + '" aria-pressed="' + (r.indexOf(x[0]) > -1) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (r.indexOf('other') > -1 ? '<input class="ccs-input rq-note" data-' + (pre === 'n' ? 'n' : 'am') + '="reqNote" id="' + pre + '-reqnote" maxlength="120" placeholder="What else must the cake be?" value="' + esc(st.reqNote || '') + '">' : '') +
      (st.reqAsk ? '<div class="rq-ask"><span>Is ' + esc(REQ_SHORT[st.reqAsk].toLowerCase()) + ' for an allergy?</span><button type="button" class="ccs-chip" data-act="' + pre + '-rqallergy" data-v="yes">Yes, an allergy</button><button type="button" class="ccs-chip" data-act="' + pre + '-rqallergy" data-v="no">No, a preference</button></div>' : '') +
      (noTail ? '' : '<span class="sl-k rq-k2">Any allergies? <em class="sl-req">Required</em></span>');
  }
  function reqToggle(st, v) {
    st.reqs = st.reqs || []; var k = st.reqs.indexOf(v);
    if (k > -1) { st.reqs.splice(k, 1); if (st.reqAsk === v) st.reqAsk = null; }
    else { st.reqs.push(v); if (v === 'vegan') { ['eggless', 'dairy_free'].forEach(function (x) { var j = st.reqs.indexOf(x); if (j > -1) st.reqs.splice(j, 1); }); } st.reqAsk = (v === 'gluten_free' || v === 'dairy_free') ? v : null; }
  }
  function reqAllergy(st, yes) {
    if (yes && st.reqAsk) { st.diet = 'yes'; st.diets = st.diets || []; var a = st.reqAsk === 'gluten_free' ? 'Gluten (coeliac)' : 'Dairy'; if (st.diets.indexOf(a) < 0) st.diets.push(a); }
    st.reqAsk = null;
  }
  var NEEDS = ['awaiting_review', 'awaiting_quote', 'awaiting_deposit'];
  var OPEN = ['awaiting_review', 'awaiting_quote', 'awaiting_approval', 'awaiting_deposit', 'confirmed'];
  function statusLabel(status, method) { return (STATUS[status] || [status])[0]; }
  function pill(status, method) { var s = STATUS[status] || [status, 'off']; return '<span class="ccs-pill st s-' + s[1] + '">' + esc(statusLabel(status, method)) + '</span>'; }
  // Payment is a separate fact from order status: white, outlined, with a $ sign
  function payPill(ps) { var c = { unpaid: 'p-unpaid', deposit_paid: 'p-part', paid: 'p-paid', refunded: 'p-refunded' }[ps]; return c ? '<span class="ccs-pay ' + c + '">' + esc(PAY[ps]) + '</span>' : ''; }
  var STAGES = [['not_started', 'Not started'], ['scheduled', 'Scheduled'], ['preparing', 'Preparing'], ['baking', 'Baking'], ['assembling', 'Cooling and assembly'], ['decorating', 'Decorating'], ['quality_check', 'Quality check'], ['ready', 'Ready']];
  var STAGE_LABEL = {}; STAGES.forEach(function (s) { STAGE_LABEL[s[0]] = s[1]; }); STAGE_LABEL.in_production = 'In production';
  var STAGE_JOB = { scheduled: 'Add to the baking plan', preparing: 'Start preparing', baking: 'Start baking', assembling: 'Baked, now cooling', decorating: 'Start decorating', quality_check: 'Ready for check' };
  function stageJob(s) { return STAGE_JOB[s[0]] || 'Move to ' + s[1]; }
  function stageIndex(s) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i][0] === s) return i; return 0; }
  function stagePill(s) { var tone = s === 'ready' ? 'ready' : (s === 'not_started' || s === 'scheduled') ? 'idle' : 'prep'; return '<span class="ccs-pill st s-' + tone + '">Kitchen: ' + (s === 'not_started' ? 'not started' : esc((STAGE_LABEL[s] || s).toLowerCase())) + '</span>'; }
  function whenLabel(iso) { var t = today(); return iso === t ? 'Today' : iso === addDays(t, 1) ? 'Tomorrow' : nice(iso); }

  // ---------- state ----------
  var S = { me: null, setup: null, tab: 'today', day: null, filter: 'action', q: '', orders: [], loaded: false,
    sheet: null, panel: null, panelErr: null, busy: false,
    cust: { seg: 'all', q: '', rows: [], loaded: false }, settings: null, team: null,
    kit: { days: 2, data: null, loaded: false }, ful: null, dirty: {}, busyBtn: null };
  // What the signed-in person can do: the abilities of their access level (falls back to their single role)
  function grants() { return (S.me && S.me.grants && S.me.grants.length) ? S.me.grants : (S.me ? [S.me.role] : []); }
  function can() { if (!S.me) return false; var g = grants(); if (g.indexOf('admin') > -1) return true; for (var i = 0; i < arguments.length; i++) if (g.indexOf(arguments[i]) > -1) return true; return false; }
  function accessSet(r) { var A = r && r.data; S.me.grants = A && A.ok && A.grants && A.grants.length ? A.grants : [S.me.role]; S.me.level_name = A && A.ok ? A.level_name || '' : ''; S.me.perms = A && A.ok && Array.isArray(A.perms) ? A.perms : null; S.me.perm_v = A && A.ok ? A.perm_v || 1 : 1; }
  // Switches (Settings, Permissions). Until the database has them, each switch follows the old level ticks.
  var PERM_LEGACY = { 'cust.view': ['manager', 'front_of_house', 'finance', 'marketing'], 'cust.create': ['manager', 'front_of_house'], 'cust.edit': ['manager', 'front_of_house'], 'cust.consent': ['manager', 'front_of_house', 'marketing'],
    'cust.history': ['manager', 'front_of_house', 'finance', 'marketing'], 'cust.comms': ['manager'], 'cust.followup': ['manager', 'front_of_house', 'marketing'], 'cust.oversee': ['manager'], 'cust.merge': ['manager'], 'cust.export': ['manager', 'marketing'],
    'nav.customers': ['manager', 'finance', 'marketing'], 'ord.view': ['manager', 'front_of_house', 'finance', 'marketing'], 'ord.history': ['manager', 'front_of_house', 'finance'],
    'ord.create': ['manager', 'front_of_house'], 'ord.edit': ['manager', 'front_of_house'], 'ord.status': ['manager', 'front_of_house'], 'ord.comms': ['manager', 'front_of_house'], 'ord.override': ['manager'],
    'ord.restore': ['admin'], 'ord.delete': ['admin'], 'ord.payments': ['manager', 'finance', 'front_of_house'], 'ord.refunds': ['manager', 'finance'],
    'kit.view': ['kitchen', 'manager', 'front_of_house'], 'kit.status': ['kitchen', 'manager', 'front_of_house'], 'kit.print': ['kitchen', 'manager', 'front_of_house'],
    'mgmt.analytics': ['manager', 'marketing'], 'mgmt.reports': ['manager'], 'mgmt.register': ['manager'], 'mgmt.settings': ['manager'], 'mgmt.system': ['admin'], 'mgmt.audit': ['admin'],
    'staff.users': ['admin'], 'staff.permissions': ['admin'] };
  // Kitchen-only workspace: the kitchen board without orders
  function kitchenOnly() { return !!S.me && (S.me.perms ? canP('kit.view') && !canP('ord.view') : S.me.role === 'kitchen'); }
  function canSettings() { return canP('mgmt.settings') || canP('mgmt.system') || canP('staff.users') || canP('staff.permissions') || canP('ord.restore'); }
  // Switches from the database. Until every switch is live (perm_v 2), only Customers and this screen use them; the rest follow the level's ticks.
  function canP(k) { if (!S.me) return false; if (S.me.perms && (S.me.perm_v >= 2 || k.indexOf('cust.') === 0 || k === 'staff.permissions')) return S.me.perms.indexOf(k) > -1; var r = PERM_LEGACY[k]; return r ? can.apply(null, r) : false; }
  // Abilities an admin can tick for an access level (each one is an existing set of permissions in the database)
  var ABIL = [
    ['front_of_house', 'Counter work', 'Today, orders, calendar, the kitchen board, taking new orders and payments, handing over cakes. Cannot cancel an order that has money paid on it.'],
    ['kitchen', 'Kitchen board', 'Confirmed cakes, baking progress and quality checks. On its own: the kitchen board only, with no prices or customer details.'],
    ['marketing', 'Customers and marketing', 'Customer records, reminders, marketing permissions and the Dashboard.'],
    ['finance', 'Money and customer spend', 'The customer list with spend, and payments due.'],
    ['manager', 'Run the caf\u00e9', 'Settings, cakes and prices, closed days, the cake register, the Dashboard, and cancelling orders with money paid. Includes counter work.']];
  function abilText(g) { if ((g || []).indexOf('admin') > -1) return 'Everything, including the team, access levels and deleting orders.'; return ABIL.filter(function (a) { return (g || []).indexOf(a[0]) > -1; }).map(function (a) { return a[1]; }).join(', '); }

  var toastTimer;
  function toast(msg, bad, action) {
    clearBusy();
    var t = document.getElementById('ccs-toast');
    // A plain notice never pushes an Undo off the screen before its 10 seconds are up
    if (t && !bad && !action && !t.hidden && S.undoUntil && Date.now() < S.undoUntil) return;
    if (!t) { t = document.createElement('div'); t.id = 'ccs-toast'; t.setAttribute('role', 'status'); root.appendChild(t); }
    if (bad) S.setSaved = null; else if (S.setSaved != null) setSavedOk();
    t.className = 'ccs-toast' + (bad ? ' ccs-bad' : '') + (action ? ' has-action' : ''); t.textContent = msg; t.hidden = false;
    // A saved order offers Open order, so staff can check it straight away
    // An Undo (or other) action runs its own function; Open order uses the normal button
    if (action) { var ab = document.createElement('button'); ab.type = 'button'; ab.className = 'ccs-toast-act'; if (action.fn) { ab.addEventListener('click', function (ev) { ev.stopPropagation(); t.hidden = true; action.fn(); }); } else { ab.dataset.act = action.act || 'open-order'; ab.dataset.id = action.id; ab.addEventListener('click', function () { t.hidden = true; }); } ab.textContent = action.label; t.appendChild(ab); }
    S.undoUntil = action && action.fn ? Date.now() + 10000 : 0;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, bad ? 7000 : action && action.fn ? 10000 : action ? 9000 : 3200);
  }
  // Plain-language errors (U9). Technical detail goes to the console only.
  function errKind(e) {
    var m = String((e && (e.message || e.error_description || e.msg)) || e || ''), code = e && (e.code || e.status);
    if (!navigator.onLine || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i.test(m)) return 'offline';
    if (code === 'PGRST301' || code === 401 || /jwt|token is expired|invalid claim|not authenticated|refresh token/i.test(m)) return 'expired';
    if (code === '42501' || /permission denied|not allowed/i.test(m)) return 'denied';
    return 'other';
  }
  // A message written for staff (from the server or a form check) is shown as it is (B18)
  function userErr(m) { var e = new Error(m || 'This was not saved. Try again.'); e.userMsg = true; return e; }
  function fail(e) {
    console.error(e); clearBusy();
    if (e && e.userMsg) return toast(e.message, true);
    var k = errKind(e);
    if (k === 'expired') return sessionExpired();
    toast(k === 'offline' ? 'No internet connection. Nothing was saved. Check the Wi-Fi and try again.' :
      k === 'denied' ? 'Your login is not allowed to do that. Ask a manager.' :
      'Something went wrong and it was not saved. Try again. If it keeps happening, tell a manager.', true);
  }
  // A read failed: the message to show in place of the content. Null when the session expired (already handled).
  function readErr(e, what) {
    console.error(e); clearBusy(); var k = errKind(e);
    if (k === 'expired') { sessionExpired(); return null; }
    return k === 'offline' ? 'No internet connection, so we couldn\'t load ' + what + '. Try again when you\'re back online.' : k === 'denied' ? 'Your login cannot see ' + what + '. Ask a manager.' : 'We couldn\'t load ' + what + '. Try again.';
  }
  // Reads get their own wording: nothing was being saved (A6)
  function loadFail(e) {
    console.error(e); clearBusy();
    var k = errKind(e);
    if (k === 'expired') return sessionExpired();
    toast(k === 'offline' ? 'No internet connection, so we couldn\'t refresh this. Nothing has changed.' :
      k === 'denied' ? 'Your login cannot see this. Ask a manager.' :
      'We couldn\'t refresh this. Try again. If it keeps happening, tell a manager.', true);
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
    if (navigator.onLine) { if (n) n.remove(); document.body.classList.remove('ccs-is-off'); return; }
    document.body.classList.add('ccs-is-off');
    if (!n) { n = document.createElement('div'); n.id = 'ccs-offline'; n.className = 'ccs-offline'; n.setAttribute('role', 'alert'); n.textContent = 'No internet connection. Changes will not save until it is back.'; root.insertBefore(n, root.firstChild); }
    document.body.style.setProperty('--ccs-offh', n.offsetHeight + 'px');
  }
  // Phone: the bottom bar hides while typing, so it never covers the field (A14)
  function isTextField(t) { return t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range|color|file)$/i.test(t.type)) || (t.tagName === 'SELECT')); }
  document.addEventListener('focusin', function (e) { if (isTextField(e.target)) document.body.classList.add('ccs-kb'); });
  document.addEventListener('focusout', function () { setTimeout(function () { if (!isTextField(document.activeElement)) document.body.classList.remove('ccs-kb'); }, 60); });
  // iPad and phone: when the on-screen keyboard opens, side panels shrink to the visible area so Save and Cancel stay above it
  if (window.visualViewport) { var vvSet = function () { document.documentElement.style.setProperty('--ccs-vvh', Math.round(window.visualViewport.height) + 'px'); }; window.visualViewport.addEventListener('resize', vvSet); vvSet(); }
  window.addEventListener('offline', netBanner);
  window.addEventListener('online', function () { netBanner(); if (S.me) { toast('Back online'); tick(); } });

  // ---------- boot ----------
  var NAV_ICON = {
    tablet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v14h10V4zm5 15.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z"/></svg>',
    handover: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11l-3-3 1.4-1.4L19.8 9l-6.4 6.4L12 14l3-3H4zm16 10H9l3 3-1.4 1.4L4.2 15l6.4-6.4L12 10l-3 3h11z"/></svg>',
    attn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z"/></svg>',
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
  function navMini() { try { return localStorage.getItem('ccs-navmini') === '1'; } catch (e) { return false; } }
  function navTabs() {
    if (kitchenOnly()) return [['kitchen', 'Kitchen']];
    var tabs = [['today', 'Today'], ['attn', 'Needs attention'], ['orders', 'Orders'], ['calendar', 'Calendar']];
    if (canP('kit.view')) tabs.push(['kitchen', 'Kitchen']);
    if (canP('ord.view') || canP('kit.view')) tabs.push(['handover', 'Handover']);
    if (canP('nav.customers') && canP('cust.view')) tabs.push(['customers', 'Customers']);
    if (canP('mgmt.analytics') || canP('mgmt.reports')) tabs.push(['dash', 'Analytics']);
    if (canP('mgmt.reports')) tabs.push(['register', 'Register']);
    if (canP('ord.create')) tabs.push(['tablet', 'Service view']);
    if (canSettings()) tabs.push(['settings', 'Settings']);
    tabs.push(['more', 'More']);
    return tabs;
  }
  function needsCount() { return S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length; }
  function navHtml() {
    var needs = needsCount();
    // On phones the bottom bar is Today, Needs attention (with its count), Orders and More; Calendar and the rest live under More
    var GROUP = { today: 'Service', calendar: 'Planning', customers: 'Customers', dash: 'Business', tablet: 'Quick service', settings: 'Set-up' }, firstBiz = true;
    return navTabs().map(function (t) {
      var gh = GROUP[t[0]] || (t[0] === 'register' && firstBiz && !navTabs().some(function (x) { return x[0] === 'dash'; }) ? 'Business' : '');
      var where = t[0] === 'more' ? ' ccs-nav-phone' : (t[0] === 'calendar' || t[0] === 'tablet' || t[0] === 'handover' || t[0] === 'customers' || t[0] === 'settings' || t[0] === 'kitchen' || t[0] === 'dash' || t[0] === 'register') ? ' ccs-nav-wide' : '';
      return (gh ? '<p class="ccs-navh" aria-hidden="true">' + gh + '</p>' : '') + '<button type="button" class="ccs-nav-item' + (t[0] === 'new' ? ' ccs-nav-new' : '') + where + '" data-tab="' + t[0] + '" title="' + esc(t[1]) + '" aria-label="' + esc(t[1] === 'Service view' ? 'Service view — full-screen counter workflow' : t[1]) + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + NAV_ICON[t[0]] + '<span>' + t[1] + '</span>' +
        (t[0] === 'orders' && needs ? '<span class="ccs-count">' + needs + '</span>' : '') + (t[0] === 'attn' && S.loaded && attnCount() ? '<span class="ccs-count at-count">' + attnCount() + '</span>' : '') + '</button>';
    }).join('');
  }
  function shell() {
    root.innerHTML =
      '<div class="ccs-app' + (kitchenOnly() ? ' is-single' : '') + (navMini() ? ' is-mini' : '') + '">' + (kitchenOnly() ? '' : '<div class="ccs-topbar"><button type="button" class="ccs-btn ccs-ghost ccs-menubtn" data-menu="open" aria-controls="ccs-side" aria-expanded="false">Menu</button><span class="ccs-topbrand">Corner Café <small>Cakes</small></span></div><div class="ccs-menushade" data-menu="close"></div>') + '<aside class="ccs-side" id="ccs-side"><div class="ccs-brandrow"><div class="ccs-brand">Corner Café<small>Cakes</small></div><button type="button" class="ccs-collapse" data-act="nav-mini" aria-label="Shrink or widen the menu" title="Shrink or widen the menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button></div>' + (canP('ord.create') ? '<button type="button" class="ccs-btn ccs-new ccs-topnew" data-tab="new">' + NAV_ICON['new'] + 'New order</button>' : '') +
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
  // Unsaved work: typed text, or an amendment that differs from the order (chip taps included) (A4)
  function hasTyping() { for (var k in S.dirty) if (String(S.dirty[k] || '').trim()) return true; return !!(S.sheet && S.panel === 'amend' && S.am && S.am.orig && Object.keys(amendChanges()).length); }
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
    m.setAttribute('data-screen', S.tab || '');
    var keepFocus = captureFocus(m);
    viewInner(m); restoreFocus(keepFocus); saveDraft(); markMore(m); scrKeep(); scrApply();
  }
  // Tab rows that scroll sideways get a soft fade at the edge that still has more to show
  function moreState(el) { var r = el.scrollWidth - el.clientWidth - el.scrollLeft > 4; el.classList.toggle('has-more', r); }
  function markMore(m) {
    [].slice.call(m.querySelectorAll('.ccs-tabs, .ccs-secbar, .ccs-segs, .ccs-setnav')).forEach(moreState);
    if (!markMore.on) { markMore.on = 1; document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.classList && (t.classList.contains('ccs-tabs') || t.classList.contains('ccs-secbar') || t.classList.contains('ccs-segs') || t.classList.contains('ccs-setnav'))) moreState(t); }, true); window.addEventListener('resize', function () { var mm = document.getElementById('ccs-main'); if (mm) markMore(mm); }); }
  }
  // One page header on every screen (UI refinement Batch 1): title on the left, New order alone at the top right,
  // and any search, filters or tools in one toolbar row underneath. Phones use the New order button in the bottom bar.
  function newTop(m) {
    var hd = m.querySelector('.ccs-head'); if (!hd || hd.dataset.laid) return;
    hd.dataset.laid = '1';
    var old = hd.querySelector(':scope > .ccs-head-acts, :scope > .ccs-headacts'), extras = [].slice.call(hd.children).slice(1);
    if (old) extras = [].slice.call(old.children).concat(extras.filter(function (c) { return c !== old; }));
    extras = extras.filter(function (c) { return !c.classList.contains('ccs-newtop') && !c.classList.contains('ccs-new'); });
    if (extras.length) { var tb = document.createElement('div'); tb.className = 'ccs-toolbar'; extras.forEach(function (c) { tb.appendChild(c); }); hd.insertAdjacentElement('afterend', tb); }
    if (old && old.parentNode === hd) hd.removeChild(old);
    [].slice.call(hd.querySelectorAll(':scope > .ccs-new')).forEach(function (c) { hd.removeChild(c); });
    if (canP('ord.create') && ['orders', 'calendar', 'kitchen', 'customers', 'dash'].indexOf(S.tab) > -1)
      hd.insertAdjacentHTML('beforeend', '<div class="ccs-head-acts"><button type="button" class="ccs-btn ccs-new ccs-newtop" data-tab="new">' + NAV_ICON['new'] + 'New order</button></div>');
  }
  // Large screens: the working screens fit the window, with long lists scrolling inside their own panel
  function fitWide() { var w = window.innerWidth, h = window.innerHeight; return (w >= 900 && h >= 560) || (w >= 760 && h >= 900); }
  function viewInner(m) {
    m.dataset.screen = S.tab === 'kitchen' ? 'kitchen-' + kitMode() : S.tab === 'customers' ? 'customers-' + (clState().q.trim().length >= 2 ? 'search' : crmSec()) : S.tab;
    if (S.tab === 'today') m.innerHTML = todayView();
    else if (S.tab === 'attn') m.innerHTML = attnView();
    else if (S.tab === 'handover') m.innerHTML = handoverView(false);
    else if (S.tab === 'orders') m.innerHTML = ordersView();
    else if (S.tab === 'new') m.innerHTML = newView();
    else if (S.tab === 'customers') m.innerHTML = customersView();
    else if (S.tab === 'settings') { m.innerHTML = settingsView(); setKeep(m); }
    else if (S.tab === 'dash') m.innerHTML = dashView();
    else if (S.tab === 'register') m.innerHTML = regView();
    else if (S.tab === 'kitchen') m.innerHTML = kitchenView();
    else if (S.tab === 'calendar') m.innerHTML = calendarView();
    newTop(m);
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
      '<h1 class="ccs-title">Choose your password</h1><p class="ccs-hint">Welcome' + (S.me && S.me.full_name ? ', ' + esc(S.me.full_name.split(' ')[0]) : '') + '. ' + (S.viaLink ? 'Choose a password to finish setting up your login. You sign in with your email and this password from now on.' : 'You signed in with a temporary password. Choose your own to carry on.') + '</p>' + pwFields(err) + '</form>';
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

  // Sign out after 12 hours without use, so a shared tablet is not left signed in for good. An unfinished order is kept.
  var IDLE_MS = 12 * 3600e3, idleAt = 0;
  function idleTouch() { var n = Date.now(); if (n - idleAt < 60000) return; idleAt = n; try { localStorage.setItem('ccs-active', String(n)); } catch (e) {} }
  function idleLast() { try { return Number(localStorage.getItem('ccs-active')) || 0; } catch (e) { return 0; } }
  function idleCheck() {
    if (!S.me) return false; var last = idleLast();
    if (!last || Date.now() - last < IDLE_MS) return false;
    if (S.sheet && S.sheet.type === 'new' && draftHasContent()) saveDraft();
    S.sheetHist = false; sheetClose('pop'); sb.auth.signOut().then(function () { S.me = null; loginView('You were signed out after 12 hours without use. Sign in again to carry on.'); });
    return true;
  }
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, idleTouch, { passive: true, capture: true }); });
  setInterval(idleCheck, 60000);
  function boot() {
    root.innerHTML = '<p class="ccs-loading">Loading…</p>';
    // A set-up or new-password link from the team email: sign in with the one-time code, then ask for a password
    var setupTok = null; try { setupTok = new URLSearchParams(location.search).get('setup'); } catch (e) {}
    if (setupTok) {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      S.viaLink = true;
      return sb.auth.signOut().then(null, function () {}).then(function () { return sb.auth.verifyOtp({ token_hash: setupTok, type: 'recovery' }); }).then(function (r) {
        if (r.error) return loginView('This link has expired or was already used. Ask your manager to send a new one.');
        boot();
      }).catch(function () { loginView('Could not connect. Check the internet connection and open the link again.'); });
    }
    sb.auth.getSession().then(function (r) {
      var sess = r.data && r.data.session;
      if (!sess) return loginView();
      return sb.from('staff_profiles').select('*').eq('user_id', sess.user.id).maybeSingle().then(function (p) {
        if (p.error) throw p.error;
        if (!p.data || !p.data.active) { sb.auth.signOut(); return loginView('This login has not been given access yet. Ask an admin to add you to the team.'); }
        S.me = p.data;
        if (idleCheck()) return;
        idleAt = 0; idleTouch();
        if (sess.user.user_metadata && sess.user.user_metadata.must_change_password) return passwordView(true);
        return Promise.all([sb.rpc('get_order_setup', { p_location: 'corner-cafe' }), sb.rpc('my_access').then(null, function () { return {}; })]).then(function (rr) {
          var s = rr[0]; accessSet(rr[1]);
          if (s.error) throw s.error; S.setup = s.data;
          loadDraft(); var back = scrLoad();
          S.tab = kitchenOnly() || location.hash === '#kitchen' ? 'kitchen' : back && back !== 'kitchen' && navTabs().some(function (x) { return x[0] === back; }) ? back : 'today';
          try { history.replaceState({ ccs: 'tab', tab: S.tab }, ''); } catch (x) {}
          shell(); if (S.tab !== 'today' && S.tab !== 'kitchen') goTab(S.tab, true);
          if (location.hash === '#new' && canP('ord.create')) newStart();
          if (S.tab === 'kitchen') loadKitchen(); else loadOrders();
          mirLoad(); setInterval(mirLoad, 5 * 60000);
        });
      });
    }).catch(function (e) { fail(e); loginView('Could not connect. Check the internet connection and refresh.'); });
  }

  // ---------- orders ----------
  var ORDER_LIST = 'id,reference,revision,order_status,payment_status,production_status,fulfilment_method,delivery_zone,order_type,source,required_date,required_time,estimate_total,final_total,deposit_required,has_dietary,rush_override,created_at,contact_name,contact_phone,contact_email,customers(full_name,phone),order_items(product_name,variant,size_inch,quantity,finish,occasion,dietary_note,requirements,requirements_note)';
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
    return sb.from('orders').select(ORDER_LIST).eq('is_test', false).or('required_date.gte.' + from + ',order_status.in.(' + OPEN.join(',') + ')')
      .order('required_date', { ascending: true }).order('required_time', { ascending: true }).limit(400)
      .then(withContact).then(function (r) {
        if (r.error) throw r.error;
        var before = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length;
        S.orders = r.data || []; S.loaded = true; S.ordErr = null; S.ordFails = 0; S.ordAt = Date.now();
        var after = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length;
        if (silent && after > before) toast('New order waiting for review');
        refreshNav();
        if (S.tab === 'orders' || S.tab === 'today' || S.tab === 'attn' || S.tab === 'handover') view();
        fbLoad();
      }).catch(function (e) {
        console.error(e);
        if (errKind(e) === 'expired') return sessionExpired();
        S.ordFails = (S.ordFails || 0) + 1;
        if (!S.loaded) S.ordErr = errKind(e) === 'offline' ? 'No internet connection, so we couldn\'t load the orders.' : 'We couldn\'t load the orders. Try again.';
        if (!silent && S.loaded) loadFail(e);
        if ((!S.loaded || S.ordFails >= 2) && (S.tab === 'orders' || S.tab === 'today' || S.tab === 'attn')) view();
      });
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
  function clockAt(ts) { return apFix(new Date(ts).toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })); }
  // Freshness: when the list was last updated, and a warning once refreshes keep failing (A7)
  function freshLine(at, fails, act) {
    if (!at) return '';
    if (fails >= 2) return '<p class="ccs-note ccs-stale" role="status"><span><b>Not up to date.</b> Last updated ' + clockAt(at) + '. Trying again every minute; changes by others since then are not shown.</span><button type="button" class="ccs-link" data-act="' + act + '">Try now</button></p>';
    return '<p class="ccs-fresh">Updated ' + clockAt(at) + (act ? ' · <button type="button" class="ccs-link ccs-refresh" data-act="' + act + '">Refresh</button>' : '') + '</p>';
  }
  function loadErr(msg, act) { return '<div class="ccs-empty ccs-loaderr" role="alert"><b>' + esc(msg) + '</b><span>Nothing has changed. Check the connection and try again.</span><button type="button" class="ccs-btn" data-act="' + act + '">Try again</button></div>'; }
  function isOverdue(o) { return o.required_date < today() && OPEN.indexOf(o.order_status) > -1; }
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
      if (S.filter === 'overdue') return isOverdue(o);
      if (S.filter === 'deposit') return o.order_status === 'awaiting_deposit' || (o.order_status === 'confirmed' && o.payment_status !== 'paid');
      if (S.filter === 'day') return o.required_date === S.day && OPEN.concat(['completed']).indexOf(o.order_status) > -1;
      return true;
    }).sort(function (a, b) {
      if (S.filter === 'recent' && !q) return a.required_date < b.required_date ? 1 : -1;
      return (a.required_date + a.required_time) < (b.required_date + b.required_time) ? -1 : 1;
    });
  }
  // The one next action for an order, and who owns it. Mirrors the main button on the order screen.
  function nextStep(o) {
    var st = o.order_status, owing = o.payment_status !== 'paid', dl = o.fulfilment_method === 'delivery';
    if (st === 'awaiting_review') return ['Check it, then confirm', 'you'];
    if (st === 'awaiting_quote') return ['Add the price', 'you'];
    if (st === 'awaiting_approval') return ['Waiting for the customer to say yes to the price', 'wait'];
    if (st === 'awaiting_deposit') return ['Record the deposit', 'you'];
    if (st !== 'confirmed') return null;
    var pay = owing && canP('ord.payments');
    if (o.production_status !== 'ready') return ['Kitchen: ' + (!o.production_status || o.production_status === 'not_started' ? 'start the cake' : 'finish the cake (now: ' + (STAGE_LABEL[o.production_status] || o.production_status).toLowerCase() + ')') + (pay ? '. Counter: take the balance before handover' : ''), 'wait'];
    if (pay) return ['Counter: take the balance, then hand it over', 'you'];
    return [dl ? 'Counter: deliver it, then tap Order completed' : 'Counter: hand it over, then tap Order completed', 'you'];
  }
  function nextHtml(o) { var n = nextStep(o); return n ? '<span class="ccs-next' + (n[1] === 'wait' ? ' is-wait' : '') + '"><em>Next:</em> ' + esc(n[0]) + '</span>' : ''; }
  // Phones: each order is one compact row (when, customer and order number, one marker for anything critical); a tap opens the full order
  function phoneFlag(o) {
    if (o.has_dietary) return ['Allergy', 'is-red'];
    if (isOverdue(o)) return ['Overdue', 'is-red'];
    if (o.order_status === 'confirmed' && o.production_status !== 'ready' && o.required_date === today() && minsLeft(o) <= 180) return ['Due soon', 'is-red'];
    var st = o.order_status;
    if (st === 'awaiting_review') return ['Confirm', 'is-amber'];
    if (st === 'awaiting_quote') return ['Price', 'is-amber'];
    if (st === 'awaiting_deposit') return ['Deposit', 'is-amber'];
    if (st === 'awaiting_approval') return ['Waiting', 'is-amber'];
    if (st === 'confirmed' && o.payment_status !== 'paid' && canP('ord.payments')) return ['Unpaid', 'is-amber'];
    return null;
  }
  function phoneEdge(o) { var f = phoneFlag(o); return f ? (f[1] === 'is-red' ? ' pf-red' : ' pf-amber') : ' pf-none'; }
  function phoneRow(o, timeOnly) {
    var c = o.customers, f = phoneFlag(o);
    return '<span class="ccs-prow"><span class="ccs-prow-t"><b>' + esc(timeOnly ? t12(o.required_time) : nice(o.required_date)) + '</b>' + (timeOnly ? '' : '<span>' + esc(t12(o.required_time)) + '</span>') + '</span>' +
      '<span class="ccs-prow-m"><b>' + esc(c && c.full_name ? c.full_name : 'Customer') + '</b><span>' + esc(o.reference || '') + '</span></span>' +
      (f ? '<span class="ccs-prow-f ' + f[1] + '">' + esc(f[0]) + '</span>' : '<span class="ccs-prow-f is-none"></span>') + '</span>';
  }
  function orderCard(o) {
    var i = firstItem(o), c = o.customers, st = STATUS[o.order_status] || ['', 'off'];
    var late = isOverdue(o), tags = (validRef(o.reference) ? '' : '<span class="ccs-pill s-alert">No order number</span>') + (late ? '<span class="ccs-pill s-alert">Overdue</span>' : '') + pill(o.order_status, o.fulfilment_method);
    if (o.has_dietary) tags += dietUnsure(o) ? '<span class="ccs-pill s-alert">Allergies to check</span>' : '<span class="ccs-pill s-alert">Dietary or allergy</span>';
    if (o.order_type === 'custom') tags += '<span class="ccs-tag t-info">Custom</span>';
    tags += reqTags(i);
    if (NEEDS.indexOf(o.order_status) > -1 && !o.contact_email) tags += '<span class="ccs-tag t-info">No email</span>';
    if (o.rush_override) tags += '<span class="ccs-pill s-flag">Short notice</span>';
    if (o.revision) tags += '<span class="ccs-pill s-amend">Amended</span>';
    if (o.order_status === 'confirmed' || o.order_status === 'completed') tags += payPill(o.payment_status);
    if (o.order_status === 'confirmed') tags += stagePill(o.production_status);
    if (o.fulfilment_method === 'delivery') tags += '<span class="ccs-tag t-info">Delivery' + (o.delivery_zone ? ', ' + esc(o.delivery_zone) : '') + '</span>';
    return '<button type="button" class="ccs-card k-' + st[1] + (late || o.has_dietary ? ' is-red' : '') + phoneEdge(o) + '" data-act="open-order" data-id="' + o.id + '">' + phoneRow(o, false) +
      '<span class="ccs-when"><b>' + esc(nice(o.required_date) + (String(o.required_date).slice(0, 4) !== today().slice(0, 4) ? ' ' + String(o.required_date).slice(0, 4) : '')) + '</b><span>' + esc(t12(o.required_time)) + '</span></span>' +
      '<span class="ccs-what"><b>' + esc(cakeLine(i)) + '</b><span class="ccs-meta">' + esc(c ? c.full_name : 'Customer details hidden') + ' · ' + esc(o.reference) + ' · ' + esc(SOURCE_LABEL[o.source]) + (receivedAgo(o) ? ' · ' + esc(receivedAgo(o)) : '') + '</span><span class="ccs-tags">' + tags + '</span>' + nextHtml(o) + '</span>' +
      (o.order_type === 'custom' && o.final_total == null && !Number(o.estimate_total) ? '<span class="ccs-price">To price<small>custom cake</small></span></button>' :
      '<span class="ccs-price">' + money(o.final_total != null ? o.final_total : o.estimate_total) + '<small>' + (o.final_total != null ? 'agreed' : (o.order_type === 'custom' ? 'from' : 'price')) + '</small></span></button>');
  }
  function ordersView() {
    var t = today(), counts = {
      action: S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length,
      today: S.orders.filter(function (o) { return o.required_date === t && OPEN.concat(['completed']).indexOf(o.order_status) > -1; }).length,
      upcoming: S.orders.filter(function (o) { return o.required_date >= t && OPEN.indexOf(o.order_status) > -1; }).length,
      overdue: S.orders.filter(isOverdue).length
    };
    var chips = [['action', 'Waiting on you', counts.action], ['today', 'Today', counts.today], ['upcoming', 'Upcoming', counts.upcoming]];
    if (counts.overdue || S.filter === 'overdue') chips.push(['overdue', 'Overdue', counts.overdue]);
    chips.push(['deposit', 'Payments due', null], ['recent', 'All, 45 days back and ahead', null]);
    if (S.filter === 'day' && S.day) chips.push(['day', dayLabel(S.day), null]);
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Cake orders</h1><p class="ccs-sub">' + esc(nice(t, true)) + '</p>' + (S.loaded ? freshLine(S.ordAt, S.ordFails, 'reload-orders') : '') + '</div>' +
      '<input class="ccs-input ccs-search" id="ccs-q" aria-label="Search orders" type="search" placeholder="Name, mobile or order number" value="' + esc(S.q) + '"></div>' +
      '<div class="ccs-tabs" role="group" aria-label="Filter">' + chips.map(function (c) { return '<button type="button" class="ccs-tab" data-act="filter" data-v="' + c[0] + '" aria-pressed="' + (S.filter === c[0] && !S.q) + '">' + c[1] + (c[2] != null ? '<span class="ccs-n">' + c[2] + '</span>' : '') + '</button>'; }).join('') + '</div>';
    if (!S.loaded) return h + (S.ordErr ? loadErr(S.ordErr, 'reload-orders') : '<p class="ccs-loading">Loading orders…</p>');
    var list = filtered();
    if (S.q && !list.length && S.older && S.older.q === S.q.trim() && (S.older.loading || S.older.rows.length)) return h + '<p class="ccs-day">Recent orders</p><p class="ccs-hint">No recent orders match.</p>' + olderHtml();
    if (!list.length) {
      var msg = S.q ? ['No orders match “' + esc(S.q) + '”.', 'Try a mobile number or an order number like CC-1001.'] :
        S.filter === 'action' ? ['Nothing waiting.', 'New online orders appear here for review. Walk-in orders go in through New order.'] :
        S.filter === 'today' ? ['No cakes due today.', ''] : S.filter === 'overdue' ? ['Nothing overdue.', 'Every order past its date has been handed over, cancelled or declined.'] : ['No orders yet.', 'Orders from the website and the counter will show here.'];
      return h + '<div class="ccs-empty"><b>' + msg[0] + '</b><span>' + msg[1] + '</span>' + (canP('ord.create') ? '<button type="button" class="ccs-btn ccs-new" data-tab="new">' + NAV_ICON['new'] + 'New order</button>' : '') + '</div>';
    }
    if (S.filter === 'action' && !S.q) return h + '<div class="ccs-list" style="margin-top:16px">' + list.map(orderCard).join('') + '</div>';
    var out = '', day = null, perDay = {};
    list.forEach(function (o) { var p = perDay[o.required_date] = perDay[o.required_date] || { n: 0, c: 0 }; p.n++; p.c += cakesOf(o); });
    list.forEach(function (o) { if (o.required_date !== day) { if (day !== null) out += '</div>'; day = o.required_date; var p = perDay[day]; out += '<p class="ccs-day"><span>' + esc(dayLabel(day)) + '</span><em>' + p.n + (p.n === 1 ? ' order' : ' orders') + ' · ' + p.c + (p.c === 1 ? ' cake' : ' cakes') + '</em></p><div class="ccs-list">'; } out += orderCard(o); });
    return h + out + '</div>' + olderHtml();
  }


  // ---------- attention centre: one list of everything that needs someone, filtered to what this login can act on ----------
  // Each order shows once, in its most urgent group, with every reason it needs attention.
  function attnGroups() {
    if (!S.loaded) return [];
    var t = today(), t2 = addDays(t, 2);
    var nowM = (function () { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).format(new Date()).split(':'); return Number(p[0]) * 60 + Number(p[1]); })();
    var mins = function (o) { var p = String(o.required_time || '23:59').split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); };
    var live = S.orders.filter(function (o) { return OPEN.indexOf(o.order_status) > -1; });
    var paid = function (o) { return o.payment_status === 'paid'; };
    var dueWord = function (d) { return d === t ? 'today' : d === addDays(t, 1) ? 'tomorrow' : nice(d); };
    var G = [
      ['overdue', 'Overdue', 'is-red', canP('ord.status') || canP('ord.payments'), function (o) { return isOverdue(o) ? 'Overdue since ' + nice(o.required_date) + ', ' + t12(o.required_time) + '. Hand over, cancel or change the date.' : ''; }],
      ['soon', 'Due within 3 hours, not ready', 'is-red', canP('ord.status') || canP('kit.view'), function (o) { return o.order_status === 'confirmed' && o.production_status !== 'ready' && o.required_date === t && mins(o) - nowM <= 180 ? (mins(o) < nowM ? 'Late: was due ' : 'Due ') + t12(o.required_time) + '. Kitchen: ' + (STAGE_LABEL[o.production_status] || 'Not started').toLowerCase() + '.' : ''; }],
      ['todaykit', 'Due today, kitchen not finished', 'is-amber', canP('ord.status') || canP('kit.view'), function (o) { if (o.order_status !== 'confirmed' || o.production_status === 'ready' || o.required_date !== t || mins(o) - nowM <= 180) return ''; var ns = !o.production_status || o.production_status === 'not_started'; return 'Due ' + t12(o.required_time) + ', ' + leftTxt(minsLeft(o)) + '. ' + (ns ? 'Kitchen hasn\'t started.' : 'Kitchen: ' + (STAGE_LABEL[o.production_status] || o.production_status).toLowerCase() + '.'); }],
      ['unconf', 'Not confirmed, due in the next 2 days', 'is-amber', canP('ord.status'), function (o) { return o.order_status !== 'confirmed' && o.required_date >= t && o.required_date <= t2 ? 'Due ' + dueWord(o.required_date) + ', ' + t12(o.required_time) + ', and not confirmed yet.' : ''; }],
      ['waiting', 'Waiting on you', '', canP('ord.status') || canP('ord.payments'), function (o) { var n = NEEDS.indexOf(o.order_status) > -1 ? nextStep(o) : null; return n ? n[0] + '.' : ''; }],
      ['pay', 'Balance still to pay', '', canP('ord.payments'), function (o) { return o.order_status === 'confirmed' && !paid(o) && (o.production_status === 'ready' || o.required_date <= t2) ? (isOverdue(o) ? 'Take the balance first.' : o.production_status === 'ready' ? 'Cake is ready. Take the balance before handing over.' : o.required_date === t ? 'Take the balance before handing over.' : 'Due ' + dueWord(o.required_date) + '. Take the balance before handing over.') : ''; }],
      ['allergy', 'Allergies to check', '', canP('ord.edit') || canP('ord.status'), function (o) { return dietUnsure(o) && o.required_date >= t ? 'The customer has not confirmed the allergies yet.' : ''; }],
      ['data', 'Missing details', '', canP('ord.edit'), function (o) { return !validRef(o.reference) ? 'No valid order number.' : NEEDS.indexOf(o.order_status) > -1 && !o.contact_email ? 'No email address, so the customer gets no updates.' : ''; }]
    ].filter(function (g) { return g[3]; });
    var out = G.map(function (g) { return { key: g[0], title: g[1], tone: g[2], rows: [] }; }), seen = {};
    live.forEach(function (o) {
      var why = [], first = -1;
      G.forEach(function (g, k) { var r = g[4](o); if (r && (first < 0 || g[0] !== 'waiting')) { why.push(r); if (first < 0) first = k; } });
      if (first > -1 && !seen[o.id]) { seen[o.id] = 1; out[first].rows.push({ o: o, why: why }); }
    });
    out.forEach(function (g) { g.rows.sort(function (a, b) { return (a.o.required_date + a.o.required_time) < (b.o.required_date + b.o.required_time) ? -1 : 1; }); });
    // Customer concerns still to put right: one row each, oldest first. Calm amber, after the real alarms (allergies and the like).
    if (fbCanSee() && fbS().list.length) { var at = 0; out.forEach(function (g, k) { if (g.tone === 'is-red') at = k + 1; }); out.splice(at, 0, { key: 'complaint', title: 'Customer concerns: let\'s put them right', tone: 'is-amber', intro: 'Every concern is a chance to get better.', rows: fbAttnRows() }); }
    return out.filter(function (g) { return g.rows.length; });
  }
  function attnCount() { return attnGroups().reduce(function (n, g) { return n + g.rows.length; }, 0); }
  function attnView() {
    var t = today(), gs = attnGroups(), n = gs.reduce(function (x, g) { return x + g.rows.length; }, 0);
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Needs attention</h1><p class="ccs-sub">' + esc(nice(t, true)) + '. Only what your login can act on.</p>' + (S.loaded ? freshLine(S.ordAt, S.ordFails, 'reload-orders') : '') + '</div></div>';
    if (!S.loaded) return h + (S.ordErr ? loadErr(S.ordErr, 'reload-orders') : '<p class="ccs-loading">Loading…</p>');
    if (!n) return h + '<div class="ccs-empty"><b>Nothing needs attention right now.</b><span>Late cakes, unconfirmed orders, payments and allergies to check will show here as they come up.</span></div>';
    // Compact, accessible alert islands. Only the selected group expands into full order details.
    var selected = S.attnIsland === 'closed' ? null : (S.attnIsland || gs[0].key);
    if (selected && !gs.some(function (g) { return g.key === selected; })) selected = gs[0].key;
    h += '<div class="at-islands" role="group" aria-label="Attention categories">' + gs.map(function (g) {
      var icons = { overdue:'⚠', soon:'⏱', todaykit:'♨', unconf:'?', waiting:'↻', pay:'$', allergy:'✚', data:'✎', complaint:'!' };
      var icon = icons[g.key] || '!';
      return '<button type="button" class="at-island ' + g.tone + (selected === g.key ? ' is-selected' : '') + '" data-act="at-island" data-v="' + g.key + '" aria-expanded="' + (selected === g.key) + '" aria-controls="at-details" title="Show ' + esc(g.title) + ' details"><span class="at-island-icon" aria-hidden="true">' + icon + '</span><span class="at-island-body"><strong>' + g.rows.length + '</strong><span>' + esc(g.title) + '</span></span><span class="at-island-chevron" aria-hidden="true">' + (selected === g.key ? '−' : '+') + '</span></button>';
    }).join('') + '</div>';
    h += gs.filter(function (g) { return g.key === selected; }).map(function (g) {
      return '<section class="at-group at-island-panel ' + g.tone + '" id="at-details" aria-label="' + esc(g.title) + ' details"><div class="at-panel-heading"><h2>' + esc(g.title) + ' <span>' + g.rows.length + '</span></h2><button type="button" class="at-island-close" data-act="at-island-close" aria-label="Close details">✕</button></div>' + (g.intro ? '<p class="at-intro">' + esc(g.intro) + '</p>' : '') + '<div class="at-rows">' + g.rows.map(function (r, k) {
        if (r.fb) return '<div class="at-row">' + fbAttnRow(r) + '</div>';
        var w = r.why.map(esc).join(' <span aria-hidden="true">·</span> '), rep = k > 0 && r.why.join('|') === g.rows[k - 1].why.join('|');
        return '<div class="at-row' + (rep ? ' is-rep' : '') + '"><p class="at-why">' + w + '</p>' + miniRow(r.o, false, true) + '</div>';
      }).join('') + '</div></section>';
    }).join('');
    return h;
  }

  // ---------- shift handover: built from live orders, plus a short note the next person marks as read ----------
  var SHIFTS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']];
  function shiftNow() { var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 11 ? 'morning' : h < 16 ? 'afternoon' : 'evening'; }
  function shiftName(k) { return ((SHIFTS.filter(function (x) { return x[0] === k; })[0]) || ['', ''])[1]; }
  function hoLoad() {
    S.ho = S.ho || {}; if (S.ho.loading) return; S.ho.loading = true;
    if (!S.ho.draft) { var kept = wipGet('ho'); if (kept) { S.ho.draft = kept.note; if (kept.shift) S.ho.shift = kept.shift; } }
    sb.rpc('handover_list').then(function (r) {
      S.ho.loading = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.ho.err = r.data.message; } else { S.ho.notes = r.data.notes || []; S.ho.loaded = true; S.ho.err = null; }
      if (S.tab === 'handover' || (S.tab === 'kitchen' && kitMode() === 'hand')) view();
    }).catch(function (e) { S.ho.loading = false; console.error(e); if (errKind(e) === 'expired') return sessionExpired(); S.ho.err = errKind(e) === 'offline' ? 'No internet connection, so the handover notes could not load.' : 'The handover notes could not load. Try again.'; if (S.tab === 'handover' || S.tab === 'kitchen') view(); });
  }
  function hoSave() {
    var el = document.getElementById('ho-note'), note = el ? el.value.trim() : '';
    if (note.length < 2) { S.ho.formErr = 'Write the handover note first.'; view(); var n = document.getElementById('ho-note'); if (n) n.focus(); return; }
    S.ho.draft = note; S.ho.formErr = null;
    sb.rpc('handover_add', { p_shift: S.ho.shift || shiftNow(), p_note: note }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { S.ho.formErr = r.data.message; return view(); }
      S.ho.draft = ''; wipPut('ho', null); toast('Handover note saved'); S.ho.loaded = false; hoLoad();
    }).catch(function (e) { clearBusy(); S.ho.formErr = errKind(e) === 'offline' ? 'No internet connection. The note is not saved yet. Try again.' : 'The note could not be saved. Try again.'; view(); });
  }
  function hoTake(id) {
    sb.rpc('handover_take', { p_id: id }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { toast(r.data.message, true); return; }
      toast(r.data.already ? 'Already taken over by ' + r.data.taken_by : 'Marked as read and taken over'); S.ho.loaded = false; hoLoad();
    }).catch(fail);
  }
  function hoTime(iso) { return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?$/i, function (_m, x) { return ' ' + x.toUpperCase() + 'M'; }); }
  function hoDay(iso) { var d = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso)); return d === today() ? 'Today' : d === addDays(today(), -1) ? 'Yesterday' : nice(d); }
  function handoverView(inKitchen) {
    var t = today(), H = S.ho || {}, cur = H.shift || shiftNow();
    var h = inKitchen ? '' : '<div class="ccs-head"><div><h1 class="ccs-title">Shift handover</h1><p class="ccs-sub">' + esc(shiftName(shiftNow())) + ' shift · ' + esc(nice(t, true)) + '</p>' + (S.loaded ? freshLine(S.ordAt, S.ordFails, 'reload-orders') : '') + '</div></div>';
    // 1. Notes: the newest one not yet taken over comes first, with the one button that matters
    var notes = H.notes || [], open = notes.filter(function (n) { return !n.taken_at && !n.mine; });
    h += '<section class="ho-sec ho-notes"><h2>Handover notes</h2>';
    if (H.err) h += '<p class="ccs-err" role="alert">' + esc(H.err) + '</p>';
    else if (!H.loaded) h += '<p class="ccs-loading">Loading notes…</p>';
    else if (!notes.length) h += '<p class="ccs-quiet">No handover notes in the last 3 days.</p>';
    else h += (H.all ? notes : notes.slice(0, 3)).map(function (n) {
      var waiting = !n.taken_at && !n.mine;
      return '<article class="ho-note' + (waiting ? ' is-open' : '') + '"><p class="ho-meta"><b>' + esc(n.by) + '</b> · ' + esc(shiftName(n.shift)) + ' shift · ' + esc(hoDay(n.at)) + ', ' + esc(hoTime(n.at)) + '</p>' +
        '<p class="ho-text">' + esc(n.note) + '</p>' +
        (n.taken_at ? '<p class="ho-taken">Read and taken over by ' + esc(n.taken_by) + ', ' + esc(hoDay(n.taken_at)) + ' ' + esc(hoTime(n.taken_at)) + '</p>' :
          n.mine ? '<p class="ho-taken">Waiting for the next shift to read it.</p>' : '<button type="button" class="ccs-btn" data-act="ho-take" data-id="' + n.id + '">Read and taken over</button>') + '</article>';
    }).join('') + (notes.length > 3 ? '<button type="button" class="ccs-link" data-act="ho-more">' + (H.all ? 'Show fewer' : 'Show all ' + notes.length + ' notes') + '</button>' : '');
    h += '<div class="ho-write"><label class="ccs-label" for="ho-note">Write a handover note for the next shift</label>' +
      '<div class="ccs-chips ccs-segs" role="group" aria-label="Your shift">' + SHIFTS.map(function (x) { return '<button type="button" class="ccs-chip" data-act="ho-shift" data-v="' + x[0] + '" aria-pressed="' + (cur === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<textarea class="ccs-input" id="ho-note" maxlength="1000" rows="3" placeholder="For example: CC-1012 is boxed in the fridge, customer collects 5:00 PM. Out of cream cheese.">' + esc(H.draft || '') + '</textarea>' +
      (H.formErr ? '<p class="ccs-err" role="alert">' + esc(H.formErr) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="ho-save">Save handover note</button></div></div></section>';
    if (open.length) h = '<p class="ho-banner" role="status"><b>' + open.length + (open.length === 1 ? ' handover note is' : ' handover notes are') + ' waiting for you to read.</b></p>' + h;
    // 2. Still to finish this shift
    var kd = S.kit && S.kit.data ? (S.kit.data.orders || []) : null, rows = '';
    if (canP('ord.view') && S.loaded && !inKitchen) {
      var due = S.orders.filter(function (o) { return o.required_date === t && OPEN.indexOf(o.order_status) > -1; }).sort(function (a, b) { return a.required_time < b.required_time ? -1 : 1; });
      rows = due.map(function (o) { return miniRow(o, true); }).join('');
      h += '<section class="ho-sec"><h2>Still to finish today <span>' + due.length + '</span></h2>' + (due.length ? '<div class="ccs-minis">' + rows + '</div>' : '<p class="ccs-quiet">Every cake due today is handed over.</p>') + '</section>';
      var gs = attnGroups();
      if (gs.length) h += '<section class="ho-sec"><h2>Exceptions to pass on</h2><div class="ho-chips">' + gs.map(function (g) { return '<button type="button" class="at-jump ' + g.tone + '" data-tab="attn"><b>' + g.rows.length + '</b><span>' + esc(g.title) + '</span></button>'; }).join('') + '</div></section>';
    } else if (kd) {
      var kdue = kd.filter(function (r) { return r.status === 'confirmed' && r.date <= t; }).sort(kitSort);
      h += '<section class="ho-sec"><h2>Still to finish today <span>' + kdue.length + '</span></h2>' + (kdue.length ? '<div class="kw-lines">' + kdue.map(function (r) { return kitLine(r, kitWhy(r)); }).join('') + '</div>' : '<p class="ccs-quiet">Nothing left to finish today.</p>') + '</section>';
    }
    // 3. Special requests in the next 24 hours, and who is making what (from the kitchen board)
    if (kd) {
      var t1 = addDays(t, 1), soon = kd.filter(function (r) { return r.status === 'confirmed' && r.stage !== 'ready' && r.date <= t1; }).sort(kitSort);
      var special = soon.filter(function (r) { return r.finish === 'custom' || r.message || r.method === 'delivery' || r.has_dietary || r.candles; });
      h += '<section class="ho-sec"><h2>Special requests, today and tomorrow <span>' + special.length + '</span></h2>' + (special.length ? '<div class="kw-lines">' + special.map(function (r) {
        var why = []; if (r.has_dietary) why.push('Allergy'); if (r.finish === 'custom') why.push('Custom design'); if (r.message) why.push('Writing: “' + r.message + '”'); if (r.method === 'delivery') why.push('Delivery' + (r.area ? ' to ' + r.area : ''));
        return kitLine(r, why);
      }).join('') + '</div>' : '<p class="ccs-quiet">No custom designs, writing, deliveries or allergies in the next two days.</p>') + '</section>';
      var who = {}; soon.forEach(function (r) { var k = r.assignee || ''; (who[k] = who[k] || []).push(r); });
      var names = Object.keys(who).sort(function (a, b) { return a === '' ? 1 : b === '' ? -1 : a.localeCompare(b); });
      if (soon.length) h += '<section class="ho-sec"><h2>Who is making what</h2><div class="ho-who">' + names.map(function (k) {
        return '<div class="ho-person' + (k ? '' : ' is-none') + '"><b>' + esc(k || 'Nobody yet') + '</b><span>' + who[k].map(function (r) { return esc(r.reference + ' ' + kitCake(r)); }).join('<br>') + '</span></div>';
      }).join('') + '</div></section>';
    }
    return h;
  }

  // ---------- today dashboard ----------
  function minsLeft(o) { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).format(new Date()).split(':'), q = String(o.required_time || '23:59').split(':'); return Number(q[0]) * 60 + Number(q[1] || 0) - (Number(p[0]) * 60 + Number(p[1])); }
  function leftTxt(m) { return m >= 120 ? 'in ' + Math.floor(m / 60) + ' hours' : m >= 60 ? 'in 1 hour' + (m % 60 ? ' ' + (m % 60) + ' minutes' : '') : m > 0 ? 'in ' + m + ' minutes' : 'now'; }
  function greet() { var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function orderTotal(o) { return Number(o.final_total != null ? o.final_total : o.estimate_total) || 0; }
  function tile(act, v, label, num, sub, tone) {
    return '<button type="button" class="ccs-kpi' + (tone ? ' t-' + tone : '') + '" data-act="' + act + '" data-v="' + v + '"><span class="ccs-kpi-l">' + label + '</span><b class="ccs-kpi-n">' + num + '</b><span class="ccs-kpi-s">' + sub + '</span></button>';
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  var NEXT_BTN = { awaiting_review: 'Check and confirm', awaiting_quote: 'Add the price', awaiting_approval: 'Record their yes', awaiting_deposit: 'Record the deposit' };
  function miniRow(o, showTime, withAct) {
    var i = firstItem(o), c = o.customers, st = STATUS[o.order_status] || ['', 'off'];
    return '<button type="button" class="ccs-mini k-' + st[1] + (isOverdue(o) || o.has_dietary ? ' is-red' : '') + phoneEdge(o) + (o.id === S.justAdded ? ' is-new' : '') + '" data-act="open-order" data-id="' + o.id + '">' + phoneRow(o, showTime) +
      '<span class="ccs-mini-t">' + (showTime ? esc(t12(o.required_time)) : esc(nice(o.required_date)) + '<small>' + esc(t12(o.required_time)) + '</small>') + '</span>' +
      '<span class="ccs-mini-m">' + (o.required_date === today() && o.order_status === 'confirmed' && o.production_status !== 'ready' ? (function () { var m = minsLeft(o); return '<span class="tq-left is-' + (m <= 180 ? 'red' : 'amber') + '">' + (m > 0 ? 'Due ' + leftTxt(m) : 'Due now') + '</span>'; })() : '') + '<b>' + esc(cakeLine(i)) + '</b><span>' + esc(c ? c.full_name : '') + ' · ' + esc(o.reference) + (receivedShort(o) ? ' · ' + esc(receivedShort(o)) : '') + '</span>' + (withAct && NEXT_BTN[o.order_status] && canP('ord.status') ? '' : nextHtml(o)) + (withAct && NEXT_BTN[o.order_status] && (o.order_status === 'awaiting_deposit' ? canP('ord.payments') : canP('ord.status')) ? '<span class="tp-nb">' + NEXT_BTN[o.order_status] + '</span>' : '') + '</span>' +
      '<span class="ccs-mini-r">' + (o.order_status === 'confirmed' ? stagePill(o.production_status) : pill(o.order_status, o.fulfilment_method)) + ((o.order_status === 'confirmed' || o.order_status === 'awaiting_deposit') && o.payment_status !== 'paid' && canP('ord.payments') ? payPill(o.payment_status) : '') + (o.fulfilment_method === 'delivery' ? '<span class="ccs-pill s-info">Delivery</span>' : '') + reqTags(firstItem(o)) + (o.has_dietary && !dietUnsure(o) ? '<span class="ccs-pill s-alert">Allergy</span>' : '') + reviewFlags(o) + '</span></button>';
  }
  function todayView() {
    var t = today(), wkEnd = addDays(t, 6), money_ = canP('ord.payments');
    var first = ((S.me && S.me.full_name) || '').trim().split(' ')[0];
    var who = (S.me && S.me.level_name) || (canP('staff.users') ? 'Admin' : canP('ord.override') ? 'Manager' : 'Counter');
    var h = '<div class="ccs-dash-head tp-head tq-head"><div><h1 class="ccs-title">' + esc(nice(t, true)) + '</h1>' + (S.loaded ? freshLine(S.ordAt, S.ordFails, 'reload-orders') : '') + '</div>' +
      '<div class="tq-tools">' + (canP('ord.status') ? '<button type="button" class="ccs-btn tq-new" data-tab="new">' + NAV_ICON['new'] + 'New order</button>' : '') + '<button type="button" class="ccs-btn ccs-ghost tq-find" data-act="tp-find"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>Find an order</button></div></div>';
    h += resumeCard();
    if (!S.loaded) return h + (S.ordErr ? loadErr(S.ordErr, 'reload-orders') : '<p class="ccs-loading">Loading today…</p>');
    if (S.mir && canP('mgmt.settings') && (S.mir.state === 'attention' || S.mir.state === 'not_set_up')) h += '<p class="ccs-note ccs-mirnote">' + (S.mir.state === 'not_set_up' ? 'The backup Google Sheet is not set up yet.' : 'The backup Google Sheet has not updated since ' + esc(when(S.mir.last_ack_at) || 'it was set up') + '.') + ' <button type="button" class="ccs-link" data-tab="settings">Check backup</button></p>';
    var live = S.orders.filter(function (o) { return o.order_status !== 'declined' && o.order_status !== 'cancelled'; });
    var todays0 = live.filter(function (o) { return o.required_date === t; }), done0 = todays0.filter(function (o) { return o.order_status === 'completed'; }).length;
    // Warning panel: only what needs someone, each line names the order and opens it. Red first, then amber, soonest first.
    var warn = [], seen = {}, nm = function (o) { return (o.customers && o.customers.full_name) || o.contact_name || 'Customer'; };
    attnGroups().forEach(function (g) { g.rows.forEach(function (r) { seen[r.o.id] = 1; warn.push({ o: r.o, fb: r.fb, tone: g.tone === 'is-red' ? 'red' : 'amber', txt: r.why.join(' ') }); }); });
    warn.sort(function (a, b) { if (a.tone !== b.tone) return a.tone === 'red' ? -1 : 1; if (!!a.fb !== !!b.fb) return a.fb ? -1 : 1; if (a.fb) return a.fb.at < b.fb.at ? -1 : 1; return (a.o.required_date + a.o.required_time) < (b.o.required_date + b.o.required_time) ? -1 : 1; });
    var WMAX = 3, nRed = warn.filter(function (x) { return x.tone === 'red'; }).length, nAmb = warn.length - nRed;
    h += '<section class="tq-warn' + (warn.length ? '' : ' is-clear') + '" aria-label="Needs attention">' + (warn.length ?
      '<div class="tq-wh"><h2>Needs attention</h2><span>' + [nRed ? '<em class="is-red">' + nRed + ' urgent</em>' : '', nAmb ? '<em class="is-amber">' + nAmb + ' to do</em>' : ''].filter(Boolean).join(' · ') + '</span>' +
      (warn.length > WMAX ? '<button type="button" class="ccs-link tq-more" data-tab="attn">See all ' + warn.length + ' →</button>' : '') + '</div>' +
      warn.slice(0, WMAX).map(function (x) {
        if (x.fb) return '<button type="button" class="tq-w is-amber fb-tqw" data-act="fb-open" data-id="' + x.fb.id + '" title="' + esc(x.txt) + '"><i aria-hidden="true"></i><b>' + esc((x.fb.order_ref ? x.fb.order_ref + ' ' : '') + (x.fb.customer_name || 'Customer')) + '</b><span>' + esc(x.txt) + '</span></button>';
        return '<button type="button" class="tq-w is-' + x.tone + '" data-act="open-order" data-id="' + x.o.id + '" title="' + esc(x.txt) + '"><i aria-hidden="true"></i><b>' + esc(x.o.reference) + ' ' + esc(nm(x.o)) + '</b><span>' + esc(x.txt) + '</span></button>'; }).join('') :
      '<p class="tq-clear">All clear. Nothing needs attention right now.</p>') + '</section>';
    // One row of numbers; each matches the list it opens and the badge in the menu
    var owing0 = live.filter(function (o) { return o.order_status === 'awaiting_deposit' || (o.order_status === 'confirmed' && o.payment_status !== 'paid'); });
    var wk0 = live.filter(function (o) { return o.required_date >= t && o.required_date <= wkEnd && OPEN.concat(['completed']).indexOf(o.order_status) > -1; });
    var stat = function (attrs, num, label, sub, tone) { return '<button type="button" class="tq-stat' + (tone ? ' is-' + tone : '') + '" ' + attrs + '><b>' + num + '</b><span>' + label + '</span><small>' + sub + '</small></button>'; };
    var atN0 = attnCount();
    h += '<div class="tq-stats" role="group" aria-label="Today in numbers">' +
      stat('data-act="goto" data-v="today"', todays0.length, 'Due today', done0 + ' of ' + todays0.length + ' handed over', '') +
      (money_ ? stat('data-act="goto" data-v="deposit"', owing0.length, 'Payments to collect', owing0.length === 1 ? 'order with money owing' : 'orders with money owing', '') : '') +
      stat('data-act="goto" data-v="upcoming"', wk0.length, 'Next 7 days', wk0.length === 1 ? 'cake to make' : 'cakes to make', '') + '</div>';
    var needs = S.orders.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).sort(function (a, b) { if (a.id === S.justAdded) return -1; if (b.id === S.justAdded) return 1; return (a.required_date + a.required_time) < (b.required_date + b.required_time) ? -1 : 1; });
    var todays = live.filter(function (o) { return o.required_date === t; }).sort(function (a, b) { return a.required_time < b.required_time ? -1 : 1; });
    var collected = todays.filter(function (o) { return o.order_status === 'completed'; }).length;
    var week = live.filter(function (o) { return o.required_date >= t && o.required_date <= wkEnd && OPEN.concat(['completed']).indexOf(o.order_status) > -1; });
    var owing = live.filter(function (o) { return o.order_status === 'awaiting_deposit' || (o.order_status === 'confirmed' && o.payment_status !== 'paid'); });
    var weekValue = week.filter(function (o) { return o.order_status === 'confirmed' || o.order_status === 'completed'; }).reduce(function (s, o) { return s + orderTotal(o); }, 0);
    // Fits the screen: Needs action and Due today side by side, the rest one at a time (phones: all one at a time)
    // On a large screen the lists scroll inside their own card, so more rows are shown; small screens keep two and See all
    var CAP = fitWide() ? 12 : 2, P = [], needsP;
    needsP = (['needs', 'Waiting on you', needs.length, '<section class="ccs-panel-card tp-card tp-needs"><div class="ccs-card-head"><h2>Waiting on you' + (needs.length ? ' (' + needs.length + ')' : '') + '</h2>' + (needs.length > CAP ? '<button type="button" class="ccs-link" data-act="goto" data-v="action">See all ' + needs.length + '</button>' : '') + '</div>' +
      (needs.length ? '<div class="ccs-minis">' + needs.slice(0, CAP).map(function (o) { return miniRow(o, false, true); }).join('') + '</div>' : '<p class="ccs-quiet">You\'re all caught up. Nothing needs your attention.</p>') + '</section>']);
    var dueP;
    dueP = (['due', 'Due today', todays.length, '<section class="ccs-panel-card tp-card"><div class="ccs-card-head"><h2>Due today' + (todays.length ? ' (' + todays.length + ')' : '') + '</h2>' + (todays.length > CAP ? '<button type="button" class="ccs-link" data-act="goto" data-v="today">See all ' + todays.length + '</button>' : '') + (todays.length ? '<span class="ccs-hint">' + collected + ' of ' + todays.length + ' handed over</span>' : '') + '</div>' +
      (todays.length ? '<div class="ccs-minis">' + todays.slice(0, CAP).map(function (o) { return miniRow(o, true); }).join('') + '</div>' : '<p class="ccs-quiet">No cakes are due for collection today.</p>') + '</section>']);
    // This week across the page, then Due today, then Waiting on you (one quiet line when nothing is waiting)
    var strip = '';
    for (var d = 0; d < 7; d++) {
      var iso = addDays(t, d), n = live.filter(function (o) { return o.required_date === iso && OPEN.concat(['completed']).indexOf(o.order_status) > -1; }).length;
      var closed = (S.setup && S.setup.closed_dates || []).indexOf(iso) > -1;
      strip += '<button type="button" class="ccs-daycell' + (d === 0 ? ' is-today' : '') + (closed ? ' is-closed' : '') + '" data-act="day" data-v="' + iso + '"><span>' + (d === 0 ? 'Today' : new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })) + '</span><b>' + new Date(iso + 'T12:00:00Z').getUTCDate() + '</b><em>' + (closed ? 'Closed' : n ? n + (n === 1 ? ' cake' : ' cakes') : '—') + '</em></button>';
    }
    h += '<section class="tq-week" aria-label="This week"><div class="tq-weekh"><h2>This week</h2><button type="button" class="ccs-link" data-act="goto" data-v="upcoming">All upcoming →</button></div><div class="tq-days">' + strip + '</div></section>';
    h += '<div class="ccs-today tq-main' + (needs.length ? '' : ' is-calm') + '">' + dueP[3] +
      (needs.length ? needsP[3] : '<p class="tq-caught"><span aria-hidden="true">✓</span> Waiting on you: all caught up.</p>') + '</div>';
    if (fuPanel()) h += '<p class="tq-fu">Customer follow-ups are in <button type="button" class="ccs-link" data-tab="customers">Customers</button>.</p>';
    if (money_ && canP('mgmt.analytics')) h += '<p class="tq-biz"><span>Booked this week</span><b>' + money(weekValue) + '</b><small>confirmed orders due in the next 7 days</small></p>';
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
      if (canP('ord.comms')) mailLoad(id);
      fbOrderLoad(id);
      if (r.data.customer_id) orderFuLoad(id);
      if (r.data.brief_version) slipLoad([id]);
      var att = r.data.order_attachments || [];
      att = att.filter(function (a) { return !a.removed_at; }).sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
      if (att.length) sb.storage.from('cake-references').createSignedUrls(att.map(function (a) { return a.storage_path; }), 3600).then(function (u) {
        if (u.data && S.sheet && S.sheet.id === id) { S.sheet.photoIds = []; S.sheet.photos = []; u.data.forEach(function (x, k) { if (x.signedUrl) { S.sheet.photos.push(x.signedUrl); S.sheet.photoIds.push(att[k].id); } }); renderSheet(); }
      });
      if (r.data.customers) sb.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', r.data.customer_id).not('order_status', 'in', '(declined,cancelled)').then(function (c) {
        if (S.sheet && S.sheet.id === id) { S.sheet.custOrders = c.count; renderSheet(); }
      });
      renderSheet();
    }).catch(function (e) { if (errKind(e) === 'expired') return sessionExpired(); console.error(e); if (S.sheet && S.sheet.id === id) { S.sheet.err = errKind(e) === 'offline' ? 'No internet connection, so we couldn\'t open this order.' : 'We couldn\'t open this order. Try again.'; renderSheet(); } });
  }
  // Someone else changed the order: fetch the latest version but keep the open panel and the typing (A3)
  var CONFLICT = 'Someone else updated this order a moment ago. The details are now up to date: check them, then tap again. Your typing is kept.';
  function reloadOrderKeep(id) {
    return sb.from('orders').select('*, customers(*), order_items(*), order_events(*), order_attachments(*), payments(*), order_amendments(*)').eq('id', id).single().then(withContact).then(function (r) {
      if (r.error) throw r.error;
      if (!S.sheet || S.sheet.id !== id) return;
      S.sheet.data = r.data; renderSheet();
    }).catch(loadFail);
  }
  // Remember what was tapped, so closing the review puts staff back exactly where they were
  function sheetFrom() { var a = document.activeElement, s = document.getElementById('ccs-sheet'); if (!a || !a.dataset || (s && s.contains(a))) return; var id = a.dataset.id, act = a.dataset.act; S.sheetFrom = { el: a, sel: id && act ? '[data-act="' + act + '"][data-id="' + id + '"]' : null }; }
  function sheetReturn() { var f = S.sheetFrom; S.sheetFrom = null; if (!f) return; var t = f.el && document.body.contains(f.el) ? f.el : f.sel ? document.querySelector('#ccs-main ' + f.sel) : null; if (t && t.focus) try { t.focus({ preventScroll: true }); } catch (x) {} }
  function sheetOpen() {
    if (!(S.sheetHist)) sheetFrom();
    var s = document.getElementById('ccs-sheet'), sh = document.getElementById('ccs-shade'); if (s) { s.classList.add('ccs-open'); sh.classList.add('ccs-open'); }
    if (!S.sheetHist) { S.sheetHist = true; try { history.pushState({ ccs: 'sheet' }, ''); } catch (x) {} }
  }
  // how: 'pop' = the back gesture already removed the entry; 'replace' = a tab change takes the entry over; default = remove our entry
  function sheetClose(how) {
    var wasSheet = !!S.sheet;
    if (S.sheet && S.sheet.type === 'new' && draftHasContent()) { saveDraft(); toast('Unfinished order kept. Tap New order on the same day to carry on.'); } if (S.cal) S.cal.pre = null;
    var tbBack_ = wasSheet && S.tablet && (S.sheet.type === 'new' || S.sheet.type === 'tbhome') && how !== 'replace';
    var calBack_ = wasSheet && S.sheet.type === 'order' && S.cal && S.cal.reopen && S.tab === 'calendar' && !calWide() && how !== 'replace';
    if (S.cal) S.cal.reopen = false;
    if (wasSheet && S.tab === 'calendar' && S.me) setTimeout(function () { calLoad(true); if (calBack_ && S.cal.sel && !S.sheet) calPanel(); }, 0);
    if (tbBack_) setTimeout(function () { if (S.tablet && !S.sheet) tabletHomeOpen(); }, 0);
    S.sheet = null; S.panel = null; S.dirty = {}; var s = document.getElementById('ccs-sheet'), sh = document.getElementById('ccs-shade'); if (s) { s.classList.remove('ccs-open'); sh.classList.remove('ccs-open'); }
    if (wasSheet && how !== 'replace') setTimeout(sheetReturn, 0); else S.sheetFrom = null;
    if (S.sheetHist) { S.sheetHist = false; if (how !== 'pop' && how !== 'replace') { S.ignorePop = true; try { history.back(); } catch (x) { S.ignorePop = false; } } }
  }
  function goTab(t, fromPop) {
    if (t === 'new') { newStart(); return; }
    if (t === 'tablet') { tabletOn(); return; }
    var paused = null;
    if (!fromPop && S.sheet && hasTyping()) { if (!pauseable()) { toast('Save or cancel your changes first.', true); return; } paused = pauseWork(); }
    var hadSheet = S.sheetHist; scrMark();
    S.scrWant = fromPop && S.scr && S.scr[t] ? { tab: t, pos: S.scr[t], until: Date.now() + 4000 } : null;
    S.tab = t; sheetClose(hadSheet && !fromPop ? 'replace' : 'pop'); if (paused) toast(paused);
    try { if (!fromPop) { if (hadSheet) history.replaceState({ ccs: 'tab', tab: t }, ''); else history.pushState({ ccs: 'tab', tab: t }, ''); } } catch (x) {}
    shell();
    if (S.tab === 'customers' && !S.cust.loaded) loadCustomers();
    if (S.tab === 'settings') loadSettings();
    if (S.tab === 'dash') dashLoad();
    if (S.tab === 'register') regLoad();
    if (S.tab === 'kitchen') loadKitchen();
    if (S.tab === 'orders' || S.tab === 'today' || S.tab === 'attn' || S.tab === 'handover') loadOrders(true);
    if (S.tab === 'handover') { hoLoad(); if (canP('kit.view')) loadKitchen(true); }
    if (S.tab === 'calendar') calLoad();
  }
  window.addEventListener('popstate', function (e) {
    if (S.ignorePop) { S.ignorePop = false; return; }
    if (!S.me) return;
    if (S.sheet) {
      var keep = function () { try { history.pushState({ ccs: 'sheet' }, ''); } catch (x) {} };
      // Back goes one step back inside a form before it leaves it
      if (S.sheet.type === 'new' && slCanBack()) { slBack(); keep(); return; }
      if (S.sheet.type === 'order' && S.panel === 'amend' && S.am && S.am.preview) { S.am.preview = null; S.panelErr = null; renderSheet(); keep(); return; }
      if (hasTyping()) {
        if (pauseable()) { var pm = pauseWork(); S.sheetHist = false; sheetClose('pop'); if (pm) toast(pm); return; }
        keep(); toast('Your typing is kept. Save it, or tap the cross twice to discard it.'); return;
      }
      if (S.panel) { S.panel = null; S.panelErr = null; renderSheet(); keep(); return; }
      if (S.sheet.type === 'more' && S.sheet.confirmOut) { S.sheet.confirmOut = false; renderSheet(); keep(); return; }
      S.sheetHist = false; sheetClose('pop'); return;
    }
    if (S.tab === 'new' && slCanBack()) { try { history.pushState({ ccs: 'tab', tab: 'new' }, ''); } catch (x) {} slBack(); return; }
    var st = e.state;
    if (st && st.ccs === 'tab' && st.tab && st.tab !== S.tab) goTab(st.tab, true);
  });
  // More: Customers, Settings and Sign out on phones; also the sign-out check everywhere (U15)
  function openMore(confirmOut) { S.sheet = { type: 'more', confirmOut: !!confirmOut }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  function moreSheet() {
    var role = S.me.level_name || (ROLES.filter(function (r) { return r[0] === S.me.role; })[0] || ['', ''])[1];
    var h = sheetHead('More') + '<div class="ccs-sheet-body">';
    h += '<section class="ccs-box"><h3>Signed in</h3><p class="ccs-big">' + esc(S.me.full_name || '') + '</p><p class="ccs-hint">' + esc(role) + '</p></section>';
    var links = '';
    if (!kitchenOnly() && (canP('ord.view') || canP('kit.view'))) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="handover">Shift handover</button>';
    if (!kitchenOnly()) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="calendar">Calendar</button>';
    if (canP('kit.view')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="kitchen">Kitchen</button>';
    if (canP('nav.customers') && canP('cust.view')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="customers">Customers</button>';
    if (canP('mgmt.analytics') || canP('mgmt.reports')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="dash">Analytics</button>';
    if (canP('mgmt.reports')) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="register">Cake register</button>';
    if (canSettings()) links += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-tab="settings">Settings</button>';
    if (links) h += '<div class="ccs-more-links">' + links + '</div>';
    var wi = S.sheet.confirmOut ? wipItems() : [];
    if (wi.length) h += '<div class="ccs-panel ccs-confirm" role="alert"><b>' + (wi.length === 1 ? 'You have unfinished work: ' + esc(wi[0].title) + '.' : 'You have ' + wi.length + ' pieces of unfinished work.') + '</b><p class="ccs-hint">Signing out deletes ' + (wi.length === 1 ? 'it' : 'them') + ' from this device.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="signout" data-sure="1">Sign out anyway</button><button type="button" class="ccs-btn ccs-ghost" data-act="wip-go" data-v="' + esc(wi[0].k) + '">' + (wi[0].k === 'new' ? 'Finish the order' : 'Finish it first') + '</button></div></div>';
    else h += '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="my-password">Change my password</button><button type="button" class="ccs-btn ccs-danger ccs-wide" data-act="signout">Sign out</button>';
    return h + '</div>';
  }
  function renderSheet() {
    var el = document.getElementById('ccs-sheet'); if (!el || !S.sheet) return;
    var body = S.sheet.type === 'new' ? sheetHead('New order', S.tablet ? tabletTools() : '') + '<div class="ccs-sheet-body ccs-newsheet">' + newView() + '</div>' : S.sheet.type === 'tbhome' ? tabletHome() : S.sheet.type === 'cal' ? calSheet() : S.sheet.type === 'order' ? orderSheet() : S.sheet.type === 'customer' ? customerSheet() : S.sheet.type === 'custnew' ? newCustomerSheet() : S.sheet.type === 'kitchen' ? kitchenSheet() : S.sheet.type === 'more' ? moreSheet() : S.sheet.type === 'dash' ? dashSheet() : S.sheet.type === 'reg' ? regSheet() : S.sheet.type === 'menu' ? menuSheet() : S.sheet.type === 'staff' ? staffSheet() : S.sheet.type === 'pw' ? sheetHead('Change my password') + '<div class="ccs-sheet-body"><form class="ccs-box ccs-pwform" id="ccs-pw">' + pwFields(S.pwErr) + '</form></div>' : '';
    var keep = el.querySelector('.ccs-sheet-body'), top = keep ? keep.scrollTop : 0, focus = captureFocus(el);
    var cols = [].slice.call(el.querySelectorAll('.os-main, .os-detail')).map(function (c) { return c.scrollTop; });
    // Order, kitchen and customer reviews: a centred pop-up on large screens, a wide panel on tablets, full screen on phones
    el.classList.toggle('is-review', ['order', 'kitchen', 'customer'].indexOf(S.sheet.type) > -1);
    el.innerHTML = body;
    // put back anything staff were typing (the screen refreshes itself every minute) (U2)
    Object.keys(S.dirty).forEach(function (id) { var inp = document.getElementById(id); if (inp && el.contains(inp) && inp.value !== S.dirty[id]) inp.value = S.dirty[id]; });
    var nb = el.querySelector('.ccs-sheet-body'); if (nb) nb.scrollTop = top;
    [].slice.call(el.querySelectorAll('.os-main, .os-detail')).forEach(function (c, k) { if (cols[k] != null) c.scrollTop = cols[k]; });
    pinMainAction(el); wipSync();
    if (!restoreFocus(focus)) { var f = el.querySelector('[data-autofocus]'); if (f) f.focus(); }
  }
  // Phones and tablets: when the main button scrolls out of view, the same button stays pinned at the bottom.
  // It presses the real button, so permissions, saving and double-tap protection are unchanged.
  function pinMainAction(el) {
    if (pinMainAction.io) { pinMainAction.io.disconnect(); pinMainAction.io = null; }
    var main = S.sheet && S.sheet.type === 'order' && !S.panel ? el.querySelector('.os-main .ccs-actions .ccs-btn.ccs-good, .os-main .ccs-actions .ccs-actions-row > .ccs-btn:not(.ccs-ghost):not([disabled])') : null;
    var body = el.querySelector('.ccs-sheet-body');
    if (!main || !body || main.disabled || !('IntersectionObserver' in window)) return;
    var pin = document.createElement('div'); pin.className = 'os-pin'; pin.hidden = true;
    pin.innerHTML = '<button type="button" class="ccs-btn ' + (main.classList.contains('ccs-good') ? 'ccs-good' : '') + '">' + esc(main.textContent) + '</button>';
    pin.firstChild.addEventListener('click', function () { main.click(); });
    el.appendChild(pin);
    pinMainAction.io = new IntersectionObserver(function (en) { pin.hidden = window.innerWidth >= 1280 || en[0].isIntersecting; }, { root: body, threshold: 0 });
    pinMainAction.io.observe(main);
  }
  function sheetHead(title, extra) { return '<div class="ccs-sheet-head"><h2 class="ccs-title">' + title + '</h2>' + (extra || '') + '<button type="button" class="ccs-x" data-act="close" aria-label="Close">×</button></div>'; }
  function paidTotal(o) { return (o.payments || []).reduce(function (s, p) { return s + Number(p.amount); }, 0); }

  // Warnings shown only when something needs attention: red for urgent, amber for caution
  function warnStrip(o) {
    var w = [], t = today(), st = o.order_status, open = OPEN.indexOf(st) > -1;
    var fbw = fbOpenFor(o.id).map(function (c) { return '<p class="os-w is-amber fb-w">' + esc('Customer concern: let\'s put it right. “' + fbShort(c.body, 90) + '” ' + fbWho(c)) + ' <button type="button" class="ccs-link fb-wlink" data-act="fb-goto">See the concern</button></p>'; }).join('');
    if (!open) return fbw ? '<div class="os-warn" role="status">' + fbw + '</div>' : '';
    var nowM = (function () { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).format(new Date()).split(':'); return Number(p[0]) * 60 + Number(p[1]); })();
    var dueM = (function () { var p = String(o.required_time || '23:59').split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); })();
    var kitWord = !o.production_status || o.production_status === 'not_started' ? 'Kitchen hasn\'t started.' : 'Kitchen: ' + (STAGE_LABEL[o.production_status] || o.production_status).toLowerCase() + '.';
    if (isOverdue(o)) w.push(['red', 'Overdue: was due ' + nice(o.required_date) + ', ' + t12(o.required_time) + '. Hand over, cancel or change the date.']);
    else if (st === 'confirmed' && o.production_status !== 'ready' && o.required_date === t) {
      var left = dueM - nowM, inTxt = left >= 120 ? 'in ' + Math.floor(left / 60) + ' hours' : left >= 60 ? 'in 1 hour' + (left % 60 ? ' ' + (left % 60) + ' minutes' : '') : left > 0 ? 'in ' + left + ' minutes' : 'now';
      w.push([left <= 180 ? 'red' : 'amber', 'Due today ' + t12(o.required_time) + ', ' + inTxt + '. ' + kitWord]);
    } else if (st === 'confirmed' && (!o.production_status || o.production_status === 'not_started') && o.required_date === addDays(t, 1)) w.push(['amber', 'Due tomorrow ' + t12(o.required_time) + '. ' + kitWord]);
    if (NEEDS.indexOf(st) > -1 && o.required_date >= t && o.required_date <= addDays(t, 2)) w.push(['amber', 'Due ' + (o.required_date === t ? 'today' : o.required_date === addDays(t, 1) ? 'tomorrow' : nice(o.required_date)) + ' ' + t12(o.required_time) + ' and not confirmed yet.']);
    var it = (o.order_items || [])[0] || {}, att = (o.order_attachments || []).filter(function (a) { return !a.removed_at; }).length;
    if (it.finish === 'custom' && !att && o.production_status !== 'ready') w.push(['amber', 'Custom design with no photo. Confirm the design with the customer.']);
    return w.length || fbw ? '<div class="os-warn" role="status">' + fbw + w.map(function (x) { return '<p class="os-w is-' + x[0] + '">' + esc(x[1]) + '</p>'; }).join('') + '</div>' : '';
  }
  function orderSheet() {
    var o = S.sheet.data;
    if (!o) return sheetHead(S.sheet.err ? 'Order' : 'Loading…') + '<div class="ccs-sheet-body">' + (S.sheet.err ? loadErr(S.sheet.err, 'reopen-order') : '<p class="ccs-loading">Loading order…</p>') + '</div>';
    var i = (o.order_items || [])[0] || {}, c = o.customers, paid = paidTotal(o), total = Number(o.final_total != null ? o.final_total : o.estimate_total), bal = Math.max(total - paid, 0);
    var phName = (c && c.full_name) || o.contact_name || 'Customer', phF = phoneFlag(o);
    var phBand = phF ? (phF[1] === 'is-red' ? 'pf-red' : 'pf-amber') : (o.order_status === 'confirmed' && o.payment_status === 'paid' && o.production_status === 'ready') || o.order_status === 'completed' ? 'pf-green' : 'pf-none';
    var h = sheetHead('<span class="os-tref">' + esc(o.reference) + '</span><span class="os-tph"><b>' + esc(phName) + '</b><small>' + esc(o.reference) + ((o.order_items || []).length ? ' · ' + esc(cakeLine(i)) : '') + '</small></span>', '<i class="os-band ' + phBand + '" aria-hidden="true"></i>' + pill(o.order_status, o.fulfilment_method) + (o.order_status === 'confirmed' || o.order_status === 'completed' ? payPill(o.payment_status) : '') + (o.revision ? '<span class="ccs-tag t-warn">Amended</span>' : '')) + '<div class="ccs-sheet-body">';
    var dlv = o.fulfilment_method === 'delivery', gName = (c && c.full_name) || o.contact_name || '', gPhone = (c && c.phone) || o.contact_phone || '';
    h += warnStrip(o);
    h += '<div class="ccs-ostrip"><div class="os-when"><span>' + (dlv ? 'Delivery' : 'Collection') + '</span><b>' + esc(nice(o.required_date)) + ', ' + esc(t12(o.required_time)) + '</b></div>' +
      '<div class="os-cust"><span>Customer</span><b>' + esc(gName) + '</b>' + (gPhone ? '<a href="tel:' + esc(digits(gPhone)) + '">' + esc(gPhone) + '</a>' : '<em class="os-nophone">' + (o.contact_email ? 'No phone. Email ' + esc(o.contact_email) : 'No phone. They quote ' + esc(o.reference)) + '</em>') +
      (gPhone ? '<div class="os-callrow"><a class="ccs-btn ccs-ghost" href="tel:' + esc(digits(gPhone)) + '">Call ' + esc(gPhone) + '</a><a class="ccs-btn ccs-ghost" href="' + esc(waLink(gPhone)) + '" target="_blank" rel="noopener">WhatsApp</a></div>' : '') + '</div>' +
      (canP('ord.payments') && bal === 0 && paid > 0 && total > 0 ? '<div class="os-paidfull"><span>Payment</span><b>Paid in full · ' + money(total) + '</b></div>' :
       canP('ord.payments') ? '<div><span>Price</span><b>' + (o.order_type === 'custom' && o.final_total == null && !total ? 'To price' : money(total)) + '</b></div><div><span>Paid</span><b>' + money(paid) + '</b></div><div><span>To pay</span><b>' + money(bal) + '</b></div>' : '') + '</div>';
    if ((o.order_items || []).length) h += '<div class="os-phcake"><b>' + esc(cakeLine(i)) + '</b>' + (i.finish === 'custom' ? '<p><span>Finish</span>Custom design</p>' : '') + (i.design_description ? '<p class="os-clamp"><span>Design</span>' + esc(i.design_description) + '</p>' : '') +
      (reqList(i).length ? '<p class="os-req"><span>Must be</span>' + esc(reqList(i).join(', ')) + '</p>' : '') + (i.cake_message ? '<p><span>Message</span>“' + esc(i.cake_message) + '”</p>' : '') + (i.candles ? '<p><span>Candles</span>' + esc(i.candles) + '</p>' : '') + ((o.order_items || []).length > 1 ? '<p><span>Also</span>' + esc(o.order_items.slice(1).map(cakeLine).join(', ')) + '</p>' : '') + '</div>';
    if (o.has_dietary) h += '<div class="ccs-alert">Dietary or allergy: ' + esc([].concat(i.dietary || [], i.dietary_note ? [i.dietary_note] : []).join(', ') || 'see notes') + '</div>';
    var sst = o.order_status === 'confirmed' ? slipState(o.id) : null;
    if (sst && sst.failed) h += '<div class="ccs-alert" role="alert">' + esc(SLIP_FAIL) + ' Press Print kitchen slip to print slip v' + sst.v + ' here.</div>';
    if (S.panel !== 'amend' && amendAllowed(o)) h += wipBanner('am:' + o.id, 'changes to this order');
    h += actionsBox(o, total, paid, bal);
    h += askUpdateBox(o);
    h += fbHeadBtn(o);
    if (!S.panel && (S.sheet.danger || []).some(function (d) { return d[0] === 'delete'; }) && secStore('order').order !== 'history') h += '<div class="os-dkdanger"><button type="button" class="ccs-link ccs-red" data-act="go-other">Delete order</button></div>';
    var cut = [['cake', h.length]];
    h += '<section class="ccs-box"><h3>Cake</h3><p class="ccs-big">' + esc(cakeLine(i)) + '</p><dl class="ccs-kv">' +
      kv('Finish', i.finish === 'custom' ? 'Custom design' : 'Standard finish') + kv('Design', i.design_description) +
      kv('Must be', reqList(i).join(', ')) + kv('Message', i.cake_message ? '“' + i.cake_message + '”' : '') + kv('Candles', i.candles) + kv('Occasion', i.occasion) + kv('Serves', i.serves_label) + kv('Notes', o.customer_notes) + '</dl>' +
      (canP('ord.edit') && OPEN.indexOf(o.order_status) > -1 ? '<button type="button" class="ccs-link" data-act="am-go" data-v="look">' + (i.candles ? 'Change candles' : 'Add candles') + '</button>' : '') +
      '</section>';
    var curAtt = (o.order_attachments || []).filter(function (a) { return !a.removed_at; }).length, phEdit = canP('ord.edit') && OPEN.indexOf(o.order_status) > -1;
    var phAdd = phEdit ? phThumbs(S.sheet.addPh || [], 'o-phx') + (S.sheet.phErr ? '<p class="ccs-err" role="alert">' + esc(S.sheet.phErr) + '</p>' : '') +
        ((i.finish === 'custom' || curAtt) && curAtt + phLive(S.sheet.addPh || []).length < 10 ? phPicker('o-photos', curAtt ? 'Add more photos' : 'Add inspiration photos', true) : '') +
        (o.brief_version && (phLive(S.sheet.addPh || []).length || (S.phAdded || {})[o.id]) ? '<p class="ccs-hint">Slip v' + o.brief_version + ' was printed. After changing photos, print a new slip so the kitchen sees them.</p>' : '') : '';
    h += refGallery(S.sheet.photos, { loading: curAtt > 0, remove: phEdit, extra: phAdd, note: phEdit ? 'Remove a photo the customer has replaced, so the kitchen only sees current ones.' : '',
      empty: phAdd ? '<section class="ccs-box ccs-refs"><h3>Cake design references</h3><p class="ccs-hint">No photos on this order.</p>' + phAdd + '</section>' : '' });
    var deliv = o.fulfilment_method === 'delivery', closedSt = ['completed', 'declined', 'cancelled'].indexOf(o.order_status) > -1;
    cut.push(['when', h.length]);
    h += '<section class="ccs-box"><h3>' + (deliv ? 'Delivery' : 'Collection') + '</h3><p class="ccs-big">' + esc(nice(o.required_date, true)) + ' at ' + esc(t12(o.required_time)) + '</p>' +
      (deliv ? '<dl class="ccs-kv">' + kv('Area', o.delivery_zone) + kv('Address', o.delivery_address) + kv('Receiving', o.delivery_contact) + kv('Delivery fee', o.delivery_fee != null ? money(o.delivery_fee) : '') + '</dl>' : '<p class="ccs-hint">Collect from the café counter.</p>') +
      (o.handed_over_at ? '<p class="ccs-hint">Handed over ' + esc(stamp(o.handed_over_at)) + (o.handover_to ? ' to ' + esc(o.handover_to) : '') + '</p>' : '') +
      (o.rush_override ? '<p class="ccs-note">Short-notice order: ' + esc(o.rush_reason) + '</p>' : '') +
      (!closedSt && canP('ord.edit') ? '<button type="button" class="ccs-link" data-act="am-go" data-v="deliv">Change collection or delivery</button>' : '') + '</section>';
    cut.push(['kitchen', h.length]);
    if (o.order_status === 'confirmed' || o.order_status === 'completed') {
      h += '<section class="ccs-box"><h3>Kitchen</h3><div class="ccs-tags">' + stagePill(o.production_status) + (o.brief_version ? '<span class="ccs-pill">Kitchen slip v' + o.brief_version + '</span>' : '<span class="ccs-pill s-action">Slip not printed</span>') + '</div>' + (o.brief_version ? slipBox(o.id, false) : '') + '<dl class="ccs-kv">' +
        kv('Made by', o.kitchen_assignee) + kv('Checked by', o.qc_by ? o.qc_by + (o.qc_at ? ', ' + stamp(o.qc_at) : '') : '') + '</dl>' +
        (o.order_status === 'confirmed' && canP('kit.status') ? '<button type="button" class="ccs-link" data-act="open-kitchen" data-id="' + o.id + '">Update kitchen progress</button>' : '') + '</section>';
    }
    cut.push(['customer', h.length]);
    if (c) {
      h += '<section class="ccs-box"><h3>Customer</h3><p class="ccs-big">' + esc(c.full_name) + '</p><dl class="ccs-kv">' +
        kv('Mobile', c.phone ? c.phone + ((o.contact_pref || c.preferred_contact) === 'whatsapp' ? ' (WhatsApp)' : '') : 'No phone') + (o.contact_pref ? kv('Asked to be contacted by', { whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email' }[o.contact_pref]) : '') + kv('Email', c.email) + kv('Ordered via', SOURCE_LABEL[o.source]) +
        (o.campaign || o.referral ? kv('Came from', [o.campaign ? 'Campaign: ' + o.campaign.replace(/[-_]+/g, ' ') : '', o.referral ? 'Link on ' + o.referral : ''].filter(Boolean).join(' · ')) : '') +
        (o.profile && o.profile.full_name && o.profile.full_name !== c.full_name ? kv('Profile name', o.profile.full_name + ' (the name on this order is kept as it was)') : '') +
        (S.sheet.custOrders != null ? kv('History', S.sheet.custOrders > 1 ? 'Returning customer, ' + S.sheet.custOrders + ' orders' : 'First order') : '') + '</dl>' +
        '<div class="ccs-actions-row">' + (c.phone ? '<a class="ccs-btn ccs-ghost" href="' + esc(waLink(c.phone)) + '" target="_blank" rel="noopener">WhatsApp</a><a class="ccs-btn ccs-ghost" href="tel:' + esc(digits(c.phone)) + '">Call</a>' : '') +
        (canP('nav.customers') && canP('cust.view') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="open-customer" data-id="' + c.id + '">Customer profile</button>' : '') + '</div>' + orderFuBox(o) + '</section>';
    }
    h += mailBox(o);
    cut.push(['feedback', h.length]);
    h += fbOrderSection(o);
    cut.push(['payment', h.length]);
    if (canP('ord.payments')) {
      h += '<section class="ccs-box"><h3>Payment ' + payPill(o.payment_status) + '</h3><div class="ccs-money"><div><span>Price</span><b>' + money(total) + '</b></div><div><span>Deposit</span><b>' + (o.deposit_required ? money(o.deposit_required) : '—') + '</b></div><div><span>Paid</span><b>' + money(paid) + '</b></div><div><span>To pay</span><b>' + money(bal) + '</b></div></div>' +
        (paid > total ? '<p class="ccs-note">' + money(paid - total) + ' more than the order total has been paid. A manager decides on a refund or credit. Nothing is refunded automatically.</p>' : '') + ((o.payments || []).length ? '<div class="ccs-history">' + o.payments.slice().sort(function (a, b) { return a.recorded_at < b.recorded_at ? -1 : 1; }).map(function (p) { return '<div><span>' + esc(stamp(p.recorded_at)) + '</span><b style="font-weight:500">' + money(p.amount) + ' ' + esc(p.kind) + ' by ' + esc(payMethodLabel(p.method)) + (p.reference ? ' · ' + esc(p.reference) : '') + '</b></div>'; }).join('') + '</div>' : '<p class="ccs-hint">No payments recorded yet.</p>') + '</section>';
    }
    cut.push(['history', h.length]);
    if (o.internal_notes) h += '<section class="ccs-box"><h3>Team notes</h3><p style="white-space:pre-wrap;font-size:15px">' + esc(o.internal_notes) + '</p></section>';
    h += changeHistory(o);
    var dz = !S.panel && S.sheet.danger && S.sheet.danger.length ? '<section class="ccs-box ccs-other"><h3>Other actions</h3><p class="ccs-hint">These change or remove the order. Each one asks before anything happens.</p><div class="ccs-actions-row ccs-more-row">' + S.sheet.danger.map(function (m) { return '<button type="button" class="ccs-link ccs-red" data-act="panel" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></section>' : '';
    h += '<section class="ccs-box"><h3>Activity</h3>' + (S.sheet.showHistory ? '<div class="ccs-history">' + (o.order_events || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).map(function (e) { return '<div><span>' + esc(stamp(e.at)) + '</span><span style="color:var(--ccs-ink)">' + esc(eventText(e)) + '</span></div>'; }).join('') + '</div>' : '<button type="button" class="ccs-link" data-act="history">Show history (' + (o.order_events || []).length + ')</button>') + '</section>' + dz;
    // One section at a time below the key facts and actions, so the panel fits the screen
    var phDel = !S.panel && (S.sheet.danger || []).some(function (d) { return d[0] === 'delete'; }) && secStore('order').order !== 'history' ? '<div class="os-phdanger"><button type="button" class="ccs-link ccs-red" data-act="go-other">Delete order</button></div>' : '';
    return secSplit(h, cut, 'order', { cake: 'Cake', when: deliv ? 'Delivery' : 'Collection', kitchen: 'Kitchen', customer: 'Customer', feedback: 'Feedback', payment: 'Payment', history: 'History' }, !!S.panel) + phDel + '</div>';
  }
  // Section buttons: one section on screen at a time (fits the screen height without scrolling)
  function secStore(group) { if (S.sheet && /^(order|cust)/.test(group)) { S.sheet.sec = S.sheet.sec || {}; return S.sheet.sec; } S.secs = S.secs || {}; return S.secs; }
  function secCur(group, keys, def) { var st = secStore(group), v = st[group]; return keys.indexOf(v) > -1 ? v : (def && keys.indexOf(def) > -1 ? def : keys[0]); }
  function secBar(group, list, cur, label) {
    return '<div class="ccs-secbar" role="tablist" aria-label="' + esc(label || 'Sections') + '">' + list.map(function (x) {
      return '<button type="button" class="ccs-secbtn" role="tab" data-act="secgo" data-g="' + group + '" data-v="' + x[0] + '" aria-selected="' + (x[0] === cur) + '">' + esc(x[1]) + (x[2] != null ? ' <span class="ccs-n">' + x[2] + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function secSplit(h, cut, group, labels, headOnly) {
    var head = h.slice(0, cut[0][1]), parts = [];
    cut.forEach(function (c, k) { var html = h.slice(c[1], k + 1 < cut.length ? cut[k + 1][1] : h.length); if (html.trim()) parts.push([c[0], html]); });
    if (headOnly || !parts.length) return head;
    var cur = secCur(group, parts.map(function (p) { return p[0]; }));
    var body = parts.filter(function (p) { return p[0] === cur; })[0][1], lab = labels[cur] || cur;
    body = body.replace('<h3>' + lab + '</h3>', '');
    var bar = secBar(group, parts.map(function (p) { return [p[0], labels[p[0]] || p[0]]; }), cur);
    // The order review: key facts and actions on the left, details on the right (side by side only on large screens)
    if (group === 'order') { var cutAt = head.indexOf('<div class="ccs-sheet-body">') + '<div class="ccs-sheet-body">'.length; return head.slice(0, cutAt).replace('<div class="ccs-sheet-body">', '<div class="ccs-sheet-body os-grid">') + '<div class="os-main">' + head.slice(cutAt) + '</div><div class="os-detail">' + bar + '<div class="ccs-secbody" role="tabpanel">' + body + '</div></div>'; }
    return head + bar + '<div class="ccs-secbody" role="tabpanel">' + body + '</div>';
  }
  function kv(k, v) { return v ? '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>' : ''; }
  // ---------- customer emails on an order (status only) ----------
  var MAIL_KIND = { guest_received: 'Order received', guest_quote: 'Price for the cake', guest_confirmed: 'Order confirmed', guest_updated: 'Updated confirmation', guest_deposit_needed: 'Deposit needed', guest_declined: 'Order declined', guest_cancelled: 'Order cancelled', guest_thanks: 'Thank you and review' };
  function mailLoad(id) {
    var sh = S.sheet; sh.mail = { loading: true };
    sb.rpc('staff_order_emails', { p_order: id }).then(function (r) {
      if (S.sheet !== sh) return;
      sh.mail = r.error || !r.data || !r.data.ok ? { err: true } : r.data; renderSheet();
    }, function () { if (S.sheet === sh) { sh.mail = { err: true }; renderSheet(); } });
  }
  function mailStatus(m) {
    if (m.status === 'sent') return 'Sent ' + stamp(m.sent_at || m.created_at);
    if (m.status === 'failed') return m.attempts >= 5 ? 'Not sent: it failed and will not retry' : 'Not sent yet: it failed and will retry';
    if (m.status === 'sending') return 'Sending now';
    return 'Waiting to send';
  }
  // Customer communication: what went out, the last contact, what comes next, and the few actions staff need
  function mailNext(o, M) {
    var sentThanks = M.emails.some(function (m) { return m.kind === 'guest_thanks'; });
    if (['declined', 'cancelled'].indexOf(o.order_status) > -1 || sentThanks) return '';
    if (o.hold_thanks) return 'Thank-you email held';
    return o.order_status === 'completed' ? 'Thank-you and review, 10:00 AM the morning after collection' : 'Thank-you and review, the morning after collection';
  }
  function mailBox(o) {
    if (!canP('ord.comms')) return '';
    var M = S.sheet.mail, h = '<section class="ccs-box ccs-mailbox"><h3>Customer communication</h3>';
    if (!o.contact_email) return h + '<p class="ccs-hint">No email address on this order, so no emails are sent. That is fine for a walk-in. Add one with Change order if the customer wants emails.</p></section>';
    if (!M || M.loading) return h + '<p class="ccs-loading">Checking emails…</p></section>';
    if (M.err) return h + '<p class="ccs-hint">Could not check the emails for this order. <button type="button" class="ccs-link" data-act="mail-reload">Try again</button></p></section>';
    if (!M.guest_emails) h += '<p class="ccs-hint">Customer emails are switched off, so none are sent automatically.</p>';
    var conf = ['confirmed', 'awaiting_deposit'].indexOf(o.order_status) > -1;
    var last = M.emails.filter(function (m) { return m.status === 'sent'; })[0];
    var next = M.guest_emails ? mailNext(o, M) : '';
    h += '<dl class="ccs-kv ccs-mailsum">' + kv('Last contact', last ? (MAIL_KIND[last.kind] || last.kind) + ', ' + stamp(last.sent_at || last.created_at) : 'No email sent yet') + kv('Next', next) + kv('Email', o.contact_email) + '</dl>';
    if (M.emails.length) h += '<ul class="ccs-maillist">' + M.emails.map(function (m) {
      return '<li class="' + (m.status === 'failed' ? 'is-failed' : m.status === 'sent' ? 'is-sent' : '') + '"><b>' + esc(MAIL_KIND[m.kind] || m.kind) + '</b><span>' + esc(mailStatus(m)) + '</span></li>';
    }).join('') + '</ul>';
    if (M.guest_emails) {
      h += (S.sheet.mailErr ? '<p class="ccs-err" role="alert">' + esc(S.sheet.mailErr) + '</p>' : '') + '<div class="ccs-actions-row ccs-mailacts">';
      if (M.emails.length) h += '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="mail-resend">Send the latest email again</button>';
      if (conf && S.askUpdate !== o.id) h += '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="mail-update">Send updated confirmation</button>';
      if (['declined', 'cancelled'].indexOf(o.order_status) < 0 && !M.emails.some(function (m) { return m.kind === 'guest_thanks'; }))
        h += '<button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="mail-hold" data-v="' + (o.hold_thanks ? '0' : '1') + '">' + (o.hold_thanks ? 'Send the thank-you after all' : 'Hold the thank-you (customer concern or problem)') + '</button>';
      h += '</div>';
    }
    return h + '</section>';
  }
  // Asked once, right after a confirmed order with an email is amended. Never sent without staff choosing it.
  function askUpdateBox(o) {
    var M = S.sheet && S.sheet.mail;
    if (S.askUpdate !== o.id || !o.contact_email || ['confirmed', 'awaiting_deposit'].indexOf(o.order_status) < 0 || !M || !M.guest_emails) return '';
    return '<div class="ccs-alert ccs-askupdate" role="status"><b>The order has changed. Send the updated confirmation?</b><p>' + esc(o.contact_email) + ' gets the new details by email.</p>' +
      (S.sheet.mailErr ? '<p class="ccs-err" role="alert">' + esc(S.sheet.mailErr) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="mail-update">Send updated confirmation</button><button type="button" class="ccs-btn ccs-ghost" data-act="mail-noupdate">Not now</button></div></div>';
  }
  function mailUpdate() {
    var sh = S.sheet, o = sh && sh.data; if (!o || S.busy) return;
    sh.mailErr = null; S.busy = true;
    sb.rpc('staff_send_update', { p_order: o.id }).then(function (r) {
      S.busy = false; if (S.sheet !== sh) return;
      if (r.error) throw r.error;
      if (!r.data.ok) { sh.mailErr = r.data.message; return renderSheet(); }
      S.askUpdate = null; toast('Updated confirmation on its way to ' + r.data.to); mailLoad(o.id);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function mailHold(hold) {
    var sh = S.sheet, o = sh && sh.data; if (!o || S.busy) return;
    sh.mailErr = null; S.busy = true;
    sb.rpc('staff_set_hold_thanks', { p_order: o.id, p_hold: hold }).then(function (r) {
      S.busy = false; if (S.sheet !== sh) return;
      if (r.error) throw r.error;
      if (!r.data.ok) { sh.mailErr = r.data.message; return renderSheet(); }
      o.hold_thanks = !!r.data.hold; toast(hold ? 'Thank-you email held. It will not be sent.' : 'Thank-you email will be sent after collection.'); renderSheet();
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function mailResend() {
    var sh = S.sheet, o = sh && sh.data; if (!o) return;
    sh.mailErr = null;
    sb.rpc('staff_resend_email', { p_order: o.id }).then(function (r) {
      if (S.sheet !== sh) return;
      if (r.error) throw r.error;
      if (!r.data.ok) { sh.mailErr = r.data.message; clearBusy(); return renderSheet(); }
      toast((MAIL_KIND[r.data.kind] || 'Email') + ' email on its way to ' + r.data.to); mailLoad(o.id);
    }).catch(fail);
  }
  // How long ago an order came in, for orders still waiting for review
  function receivedShort(o) {
    if (NEEDS.indexOf(o.order_status) < 0 || !o.created_at) return '';
    var m = Math.max(0, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : nice((o.created_at || '').slice(0, 10));
  }
  function receivedAgo(o) {
    if (NEEDS.indexOf(o.order_status) < 0 || !o.created_at) return '';
    var m = Math.max(0, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));
    return 'Received ' + (m < 1 ? 'just now' : m < 60 ? m + (m === 1 ? ' minute' : ' minutes') + ' ago' : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour' : ' hours') + ' ago' : nice((o.created_at || '').slice(0, 10)));
  }
  // Review flags for an order still waiting: what needs checking before it can be confirmed
  function dietUnsure(o) { var i = firstItem(o) || {}; return !!(o.has_dietary && /^Allergies not confirmed yet/.test(i.dietary_note || '')); }
  function reviewFlags(o) {
    if (NEEDS.indexOf(o.order_status) < 0) return '';
    var f = '';
    if (dietUnsure(o)) f += '<span class="ccs-pill s-alert">Allergies to check</span>';
    if (!o.contact_email) f += '<span class="ccs-tag t-info">No email</span>';
    return f;
  }
  function eventText(e) {
    var d = e.detail || {}, who = e.actor_label || 'System';
    var map = { created: 'Order placed (' + (SOURCE_LABEL[d.source] || d.source) + ')', confirmed: 'Confirmed' + (d.final_total != null ? ' at ' + money(d.final_total) : '') + (d.reason ? ' (' + d.reason + ')' : ''),
      awaiting_deposit: 'Accepted, waiting for ' + money(d.deposit_required) + ' deposit', declined: 'Declined', cancelled: 'Cancelled', collected: 'Order completed',
      payment_recorded: money(d.amount) + ' ' + d.kind + ' recorded (' + payMethodLabel(d.method) + ')', note: 'Note added', taken_earlier: 'Order taken ' + (d.text || '') + ', entered later',
      stage: 'Kitchen: ' + (STAGE_LABEL[d.to] || d.to) + (d.qc_by ? ', checked by ' + d.qc_by : ''),
      brief_printed: 'Kitchen slip v' + d.version + (d.new_version ? ' printed' : ' reprinted') + (d.changes && d.changes.length ? ' (changed: ' + d.changes.join(', ') + ')' : ''),
      fulfilment: d.method === 'delivery' ? 'Set to delivery, ' + (d.zone || '') + ', fee ' + money(d.fee) : 'Set to collection',
      assigned: d.to ? 'Assigned to ' + d.to : 'Assignment cleared', amended: 'Amended, revision ' + d.revision + (d.reason ? ' (' + d.reason + ')' : ''), kitchen_ack: 'Kitchen acknowledged the changes', candles_changed: 'Candles ' + (d.to ? (d.from ? 'changed to “' + d.to + '”' : 'added: “' + d.to + '”') : 'removed'), deleted: 'Deleted', restored: 'Restored after being deleted', imported: 'Brought in from the Google Sheet', sheet_linked: 'Linked to its Google Sheet row' };
    map.quoted = 'Price set to ' + money(d.price) + (d.total != null && Number(d.total) !== Number(d.price) ? ' (total ' + money(d.total) + ' with delivery)' : '') + (d.size ? ', size: ' + d.size : '') + (d.flavour ? ', flavour: ' + d.flavour : '');
    map.photo_removed = 'Photo removed from the order' + (d.file ? ' (' + d.file + ')' : '');
    map.quote_sent = 'Price emailed to ' + (d.to || 'the customer');
    map.complaint_logged = 'Customer concern recorded';
    map.complaint_resolved = 'We put the customer concern right' + (d.actions && d.actions.length ? ': ' + d.actions.map(function (x) { return fbLabel(FB_ACT, x).toLowerCase(); }).join(', ') : '') + (d.amount != null ? ', ' + money(d.amount) : '');
    map.complaint_reopened = 'Customer concern opened again' + (d.reason ? ': ' + d.reason : '');
    map.email_resent = 'Customer email sent again (' + (MAIL_KIND[d.kind] || d.kind || 'latest') + ') to ' + (d.to || '');
    if (e.kind === 'collected') map.collected = 'Order completed' + (d.method === 'delivery' ? ', delivered' : ', collected') + (d.to ? ', received by ' + d.to : '');
    return (map[e.kind] || e.kind) + (d.note ? ': ' + d.note : '') + ' · ' + who;
  }
  function actionsBox(o, total, paid, bal) {
    var orderer = canP('ord.status'), payer = canP('ord.payments');
    if (!orderer && !payer) return '';
    var p = S.panel, err = S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '', st = o.order_status;
    S.sheet.danger = [];
    if (p === 'amend') return amendPanel(o, total, paid);
    if (p === 'quote') {
      var qi = (o.order_items || [])[0] || {}, qreq = isReq(qi), cakeOnly = o.final_total != null ? Number(o.final_total) - Number(o.delivery_fee || 0) : null;
      return '<div class="ccs-panel ccs-quote"><b>' + (o.final_total != null ? 'Change the price' : 'Add the price') + '</b>' +
        (qreq ? '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="q-flav">Flavour</label><input class="ccs-input" id="q-flav" maxlength="80" value="' + esc(qi.variant || '') + '"></div>' +
          '<div class="ccs-field"><label class="ccs-label" for="q-size">Size or servings</label><input class="ccs-input" id="q-size" maxlength="80" value="' + esc(qi.serves_label || '') + '"></div></div>' : '') +
        '<div class="ccs-field"><label class="ccs-label" for="q-price">Cake price agreed with the kitchen (FJD)</label><input class="ccs-input" id="q-price" inputmode="decimal" data-autofocus style="max-width:240px" value="' + (cakeOnly != null ? cakeOnly : '') + '"></div>' +
        (Number(o.delivery_fee) > 0 ? '<p class="ccs-hint">The delivery fee of ' + money(o.delivery_fee) + ' is added on top.</p>' : '') +
        '<p class="ccs-hint">Saving moves the order to Waiting for customer. Then email the price or tell the customer, and press Confirm order once they agree.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-quote">Save price</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'confirm' && o.order_type === 'custom' && o.final_total != null) {
      var how = S.cfmHow;
      return '<div class="ccs-panel"><b>Confirm this custom cake</b><dl class="ccs-kv">' + kv('Cake', cakeLine((o.order_items || [])[0])) + kv('Price', money(o.final_total)) + '</dl>' +
        '<div class="ccs-field"><span class="ccs-label">How did the customer agree? <em class="sl-req">Required</em></span><div class="ccs-chips">' +
          [['email', 'Accepted by email'], ['verbal', 'Confirmed verbally']].map(function (x) { return '<button type="button" class="ccs-chip" data-act="cfm-how" data-v="' + x[0] + '" aria-pressed="' + (how === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          '<span class="ccs-hint">Emailing the price is not agreement. Only confirm once the customer has said yes to these details and this price.</span></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-dep">Deposit needed (FJD)</label><input class="ccs-input" id="ccs-dep" inputmode="decimal" placeholder="0 for none" style="max-width:240px"></div>' +
        '<p class="ccs-hint">Without a deposit, Confirm sends the cake to the kitchen straight away: the kitchen slip is emailed to the admin and counter inboxes. With a deposit, it goes once the deposit is paid.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-confirm">Confirm order</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="quote">Change the price</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'confirm') {
      var custom = o.order_type === 'custom';
      return '<div class="ccs-panel"><b>' + (custom ? 'Quote and confirm this custom cake' : 'Confirm this order') + '</b>' +
        '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ccs-price">' + (custom ? 'Quoted price (FJD)' : 'Price (FJD)') + '</label><input class="ccs-input" id="ccs-price" inputmode="decimal" value="' + (custom ? '' : Number(o.estimate_total)) + '"' + (custom ? ' data-autofocus placeholder="From ' + money(o.estimate_total) + '"' : '') + '></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-dep">Deposit needed (FJD)</label><input class="ccs-input" id="ccs-dep" inputmode="decimal" placeholder="0 for none"></div></div>' +
        '<p class="ccs-hint">With a deposit, the order waits until it is paid. ' + (S.setup && S.setup.guest_emails ? 'The customer is emailed either way.' : 'Guest emails are off, so message or call the customer once you confirm.') + '</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-confirm">Confirm</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'candles') {
      var ci = (o.order_items || [])[0] || {};
      return '<div class="ccs-panel"><b>Candles</b><div class="ccs-field"><label class="ccs-label" for="ccs-candles">Candles for this cake (leave blank for none)</label><input class="ccs-input" id="ccs-candles" maxlength="60" data-autofocus placeholder="For example: number 30 candle, or 5 small candles" value="' + esc(ci.candles || '') + '"></div>' +
        (o.brief_version ? '<p class="ccs-hint">A kitchen slip was printed. After saving, print the new version and throw the old one away.</p>' : '') + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="do-candles">Save candles</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'decline' || p === 'cancel' || p === 'note' || p === 'waive') {
      var lbl = { decline: ['Decline this order', 'Reason for the customer (optional)', 'Decline order', 'ccs-danger'], cancel: ['Cancel this order', 'Reason (required)', 'Cancel order', 'ccs-danger'], note: ['Add a team note', 'Note', 'Save note', ''], waive: ['Waive the deposit', 'Reason (required)', 'Confirm without deposit', 'ccs-good'] }[p];
      return '<div class="ccs-panel"><b>' + lbl[0] + '</b><div class="ccs-field"><label class="ccs-label" for="ccs-note">' + lbl[1] + '</label><textarea class="ccs-input" id="ccs-note" data-autofocus></textarea></div>' +
        (p === 'cancel' && paid > 0 ? '<p class="ccs-note">' + money(paid) + ' has been paid. Arrange the refund with a manager after cancelling.</p>' : '') + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ' + lbl[3] + '" data-act="do-' + p + '">' + lbl[2] + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'cancel-locked') {
      return '<div class="ccs-panel"><b>Cancel this order</b><p class="ccs-hint">' + money(paid) + ' has been paid on this order, so only an Admin can cancel it. Ask an Admin, who will also arrange the refund.</p>' +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'delete') {
      return '<div class="ccs-panel"><b>Delete this order</b><p class="ccs-hint">Only for test orders and orders entered by mistake. The order disappears from every list, count and figure, and no more emails go out for it. It is kept with your name and reason, and an admin can restore it from Settings.</p>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-note">Why is it being deleted? (required)</label><textarea class="ccs-input" id="ccs-note" data-autofocus placeholder="For example: test order, or entered twice by mistake"></textarea></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-delref">Type the order number ' + esc(o.reference) + ' to confirm</label><input class="ccs-input" id="ccs-delref" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>' +
        (paid > 0 ? '<p class="ccs-note">' + money(paid) + ' has been paid on this order. Deleting it takes that payment out of the Dashboard and reports. The payment itself is not changed, and restoring the order brings it back.</p>' : '') + err +
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
      return '<div class="ccs-panel"><b>Order completed</b>' + (o.production_status !== 'ready' ? '<p class="ccs-hint">The kitchen has not marked this cake Ready (now: ' + esc(STAGE_LABEL[o.production_status] || 'Not started') + '). Check the cake before handing over. Completing marks it Ready.</p>' : '') + '<div class="ccs-field"><label class="ccs-label" for="ccs-note">' + (dl ? 'Who received the cake' : 'Who collected the cake') + '</label><input class="ccs-input" id="ccs-note" data-autofocus placeholder="' + (dl ? 'Name, or reception at the resort' : 'Name of the person collecting') + '">' + receiverChips(o, dl) + '</div>' +
        '<p class="ccs-hint">Check the order number and name before handing over.</p>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-collected">Order completed</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'brief') {
      var ppr = S.slip.paper, pk = slipPick(), any = pk.email || pk.dl || pk.print;
      var opt = function (k, t, sub) { return '<label class="ccs-slipopt"><input type="checkbox" data-slipopt="' + k + '"' + (pk[k] ? ' checked' : '') + '><span><b>' + t + '</b><small>' + sub + '</small></span></label>'; };
      return '<div class="ccs-panel"><b>Kitchen slip</b><p class="ccs-hint">' + (o.brief_version ? 'Version ' + o.brief_version + ' was made before. If anything changed since, this makes a new version and marks what changed.' : 'This is the first slip for this order.') + ' One ' + ppr + ' page, with the guest name, phone number and price. Choose one or more:</p>' +
        '<div class="ccs-slipopts" role="group" aria-label="What to do with the slip">' +
        opt('email', 'Email to the kitchen printer', 'Sent as a PDF to the admin and counter inboxes') +
        opt('dl', 'Download PDF', 'Saved on this device') +
        opt('print', 'Print on this device', 'Opens the print window here') + '</div>' + err +
        (any ? '' : '<p class="ccs-note" role="status">Tick at least one.</p>') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="do-brief" data-v="' + ppr + '"' + (any ? '' : ' disabled aria-disabled="true"') + '>Make slip</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    if (p === 'brief-done' && S.briefDone && S.briefDone.id === o.id) {
      var bd = S.briefDone.b, em = bd.email || {}, who = [em.to, em.cc].filter(Boolean).join(' and '), sst2 = slipState(o.id);
      var emTxt = em.state === 'queued' ? 'Emailed to ' + who + ' for printing.' : em.state === 'recent' ? 'This slip was emailed to ' + who + ' less than a minute ago, so it was not sent again.' :
        em.state === 'skipped' ? 'Not emailed. You chose not to send it to the kitchen printer.' : em.state === 'off' ? 'Emailing slips is switched off in Settings, Kitchen printing. Download it or print it here.' : em.state === 'no_address' ? 'No email address is set for kitchen slips, so it was not emailed. Download it or print it here, and ask an admin to add the address in Settings, Kitchen printing.' : 'The slip was not emailed. Download it or print it here.';
      var emOk = em.state === 'queued' || em.state === 'recent';
      return '<div class="ccs-panel ccs-briefdone"><b>Kitchen slip ' + esc(bd.snapshot.reference) + ' v' + bd.version + '</b>' +
        '<p class="' + (emOk ? 'ccs-hint' : 'ccs-note') + '" role="status">' + esc(emTxt) + '</p>' +
        (emOk && sst2 && sst2.v === bd.version ? (sst2.failed ? '<div class="ccs-alert" role="alert">' + esc(SLIP_FAIL) + ' Download it or print it here.</div>' : '<p class="ccs-slipst' + (sst2.printed ? ' is-ok' : '') + '">' + esc(sst2.text) + '</p>') : '') + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="brief-pdf">Download slip (PDF)</button><button type="button" class="ccs-btn ccs-ghost" data-act="brief-print">Print on this device</button>' + (em.state === 'skipped' && canP('ord.edit') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="brief-email">Email slip to print</button>' : '') + '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Done</button></div></div>';
    }
    if (p === 'pay') {
      if (!S.payKey) S.payKey = uuid();
      var suggest = st === 'awaiting_deposit' ? Math.max(Number(o.deposit_required || 0) - paid, 0) : bal;
      return '<div class="ccs-panel"><b>Record a payment</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="ccs-amt">Amount (FJD)</label><input class="ccs-input" id="ccs-amt" inputmode="decimal" value="' + (suggest ? suggest : '') + '" data-autofocus></div>' +
        '<div class="ccs-field"><span class="ccs-label">Paid by</span><div class="ccs-chips" id="ccs-method">' + PAY_METHODS.map(function (m, k) { return '<button type="button" class="ccs-chip" data-act="method" data-v="' + m[0] + '" aria-pressed="' + ((S.payMethod || 'cash') === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div></div></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="ccs-ref">Receipt or transfer reference (optional)</label><input class="ccs-input" id="ccs-ref"></div>' + err +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="do-pay">Record payment</button><button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="">Back</button></div></div>';
    }
    var main = '', more = [], hint = '', danger = [];
    var isCustom = o.order_type === 'custom';
    if (isCustom && (st === 'awaiting_review' || st === 'awaiting_quote') && orderer) {
      main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="quote">Add the price</button>';
      hint = 'Add the price once the kitchen has priced the design. Nothing goes to the kitchen until you press Confirm order.';
      danger.push(['decline', 'Decline order']);
    } else if (st === 'awaiting_approval' && orderer) {
      var canMail = !!(S.setup && S.setup.guest_emails) && !!o.contact_email;
      main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="confirm">Confirm order</button>' +
        '<button type="button" class="ccs-btn ccs-ghost" data-act="send-quote"' + (canMail ? '' : ' disabled aria-disabled="true"') + '>Email the price to the customer</button>';
      if (isCustom) more.push(['quote', 'Change the price']);
      hint = canMail ? 'Waiting for the customer to agree the price. Press Confirm order once they say yes.' : (!o.contact_email ? 'No email address on this order: tell the customer the price by phone or WhatsApp, then press Confirm order once they agree.' : 'Customer emails are off: tell the customer the price yourself, then press Confirm order once they agree.');
      danger.push(['decline', 'Decline order']);
    } else if ((st === 'awaiting_review' || st === 'awaiting_quote') && orderer) {
      main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="confirm">' + (st === 'awaiting_quote' ? 'Quote and confirm' : 'Confirm order') + '</button>';
      danger.push(['decline', 'Decline order']);
    } else if (st === 'awaiting_deposit') {
      if (payer) main = '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="pay">Record deposit</button>';
      if (canP('ord.override')) more.push(['waive', 'Waive deposit']);
      if (orderer) danger.push(['decline', 'Decline order']);
    } else if (st === 'confirmed') {
      if (bal > 0 && payer) main = '<button type="button" class="ccs-btn" data-act="panel" data-v="pay">Take ' + money(bal) + '</button>';
      if (orderer) {
        var notReady = o.production_status !== 'ready', label = 'Order completed';
        var locked = bal > 0 ? ' after payment' : '';
        main += '<button type="button" class="ccs-btn ccs-good" data-act="panel" data-v="collected"' + (locked ? ' disabled aria-disabled="true"' : '') + '>' + label + locked + '</button>';
        main += '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="brief">Print kitchen slip</button>';
        if (bal > 0) hint = 'Record the balance before handing over.';
        else if (notReady) hint = 'Kitchen has not marked it Ready (now: ' + (STAGE_LABEL[o.production_status] || 'Not started') + '). Tap Order completed once the cake has gone out.';
      }
    } else if (st === 'completed' && orderer) {
      main = '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="brief">Print kitchen slip</button>';
    }
    if (orderer && OPEN.indexOf(st) > -1 && (o.production_status !== 'ready' || canP('ord.override'))) main += '<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="amend">Change order</button>';
    // The kitchen slip only exists once an order is confirmed: say so instead of hiding the button
    if (orderer && (st === 'awaiting_review' || st === 'awaiting_quote' || st === 'awaiting_approval' || st === 'awaiting_deposit')) {
      main += '<button type="button" class="ccs-btn ccs-ghost" disabled aria-disabled="true" aria-describedby="ccs-brief-why">Print kitchen slip</button>';
      if (!isCustom || st === 'awaiting_deposit') hint = (hint ? hint + ' ' : '') + 'The kitchen slip prints once the order is confirmed.';
    }
    // A cake that is ready: help staff tell the customer (WhatsApp opens with the message typed; staff send it themselves)
    var rPhone = (o.customers && o.customers.phone) || o.contact_phone || '';
    if (orderer && st === 'confirmed' && o.production_status === 'ready' && rPhone) {
      var rFirst = String((o.customers && o.customers.full_name) || o.contact_name || '').trim().split(/\s+/)[0];
      var rMsg = 'Bula' + (rFirst ? ' ' + rFirst : '') + ', your Corner Café cake (' + o.reference + ') is ready' + (o.fulfilment_method === 'delivery' ? ' and will be with you soon.' : ' for collection.') + (bal > 0 ? ' Balance to pay: ' + money(bal) + '.' : '') + ' Vinaka!';
      main += '<a class="ccs-btn ccs-ghost" data-act="ready-wa" href="' + esc(waLink(rPhone) + '?text=' + encodeURIComponent(rMsg)) + '" target="_blank" rel="noopener">Let the customer know</a>';
    }
    if (orderer) more.push(['note', '+ Add note']);
    // Counter can cancel only unpaid orders; with money paid, an Admin cancels (the server enforces this too)
    if (orderer && OPEN.indexOf(st) > -1) danger.push([paid > 0 && !canP('ord.override') ? 'cancel-locked' : 'cancel', 'Cancel order']);
    // Admins can delete any order (owner decision 14 Oct); paid orders get a plain warning first
    if (canP('ord.delete')) danger.push(['delete', 'Delete order']);
    S.sheet.danger = danger;
    // A visible way to the Other actions box (at the end of History), so Cancel and Delete are easy to find
    // Administrators: a visible way to Delete (it sits in Other actions at the end of History and still asks for the order number and a reason)
    if (danger.some(function (d) { return d[0] === 'delete'; }) && secStore('order').order !== 'history') more.push(['go-other', 'Delete order']);
    if (!main && !more.length) return '';
    var nx = nextStep(o), phNext = '';
    // Who acts next, in plain words: the kitchen, the counter, or both
    if (st === 'confirmed') {
      var rdy = o.production_status === 'ready', owe = bal > 0 && payer, how = o.fulfilment_method === 'delivery' ? 'delivered' : 'collected';
      var kit = rdy ? '' : 'Kitchen: ' + (o.production_status === 'not_started' || !o.production_status ? 'start the cake.' : 'finish the cake (now: ' + (STAGE_LABEL[o.production_status] || o.production_status).toLowerCase() + ').');
      var ctr = rdy ? (owe ? 'Counter: take ' + money(bal) + ', then hand it over.' : 'Counter: hand it over, then tap Order completed.') : (owe ? 'Counter: take ' + money(bal) + ' any time before handover.' : 'Counter: tap Order completed once the cake has gone out.');
      phNext = [kit, ctr].filter(Boolean).join(' ');
      if (hint === 'Record the balance before handing over.' || /^Kitchen has not marked/.test(hint)) hint = '';
    }
    var nxl = phNext ? '<p class="ccs-nextline os-who"><em>Next:</em> ' + esc(phNext) + '</p>' : nx ? '<p class="ccs-nextline' + (nx[1] === 'wait' ? ' is-wait' : '') + '"><em>Next:</em> ' + esc(nx[0]) + '</p>' : '';
    var told = S.sheet.readyAsk ? '<p class="ccs-note ccs-readyask">Sent the WhatsApp? <button type="button" class="ccs-link" data-act="ready-told">Yes, note it in the history</button></p>' : '';
    return '<div class="ccs-actions">' + nxl + (main ? '<div class="ccs-actions-row">' + main + '</div>' : '') + (hint ? '<p class="ccs-hint" id="ccs-brief-why">' + esc(hint) + '</p>' : '') + told + (S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '') +
      (more.length ? '<div class="ccs-actions-row ccs-more-row">' + more.map(function (m) { return m[0] === 'go-other' ? '<button type="button" class="ccs-link ccs-red" data-act="go-other">' + m[1] + '</button>' : '<button type="button" class="ccs-link" data-act="panel" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';
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
      if (!r.data.ok) { if (r.data.error === 'changed') { S.panelErr = CONFLICT; reloadOrderKeep(o.id); } else { S.panelErr = r.data.message; renderSheet(); } return; }
      var msg = { confirm: r.data.status === 'awaiting_deposit' ? 'Accepted. Waiting for the deposit.' : 'Order confirmed', decline: 'Order declined', cancel: 'Order cancelled', collected: o.fulfilment_method === 'delivery' ? 'Marked as delivered' : 'Marked as collected', note: 'Note saved', waive_deposit: 'Deposit waived, order confirmed' }[action];
      var tellGuest = !(S.setup && S.setup.guest_emails) && ['confirm', 'decline', 'cancel', 'waive_deposit'].indexOf(action) > -1;
      // Every order that reaches the kitchen opens the kitchen slip choice (Email, Download, Print), so no confirmed order is left without a slip.
      // Nothing is emailed until staff choose it.
      var toKitchen = (action === 'confirm' || action === 'waive_deposit') && r.data.status === 'confirmed';
      msg += toKitchen && tellGuest ? '. Now make the kitchen slip and let the customer know.' : toKitchen ? '. Now make the kitchen slip.' : tellGuest ? '. Now let the customer know.' : '';
      toast(msg); S.panel = null; loadOrders(true);
      openOrder(o.id).then(function () { if (toKitchen && S.sheet && S.sheet.id === o.id && S.sheet.data && validRef(S.sheet.data.reference) && !S.panel) { S.panel = 'brief'; S.panelErr = null; S.dirty = {}; renderSheet(); } });
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  // Custom cakes: add or change the price (and, for a cake not on the menu, its flavour and size)
  function saveQuote() {
    var o = S.sheet.data; if (S.busy) return;
    var price = num(val('q-price')), req = isReq((o.order_items || [])[0]);
    if (!(price > 0)) { S.panelErr = 'Enter the cake price.'; S.dirty['q-price'] = val('q-price'); return renderSheet(); }
    if (req && val('q-size').trim().length < 2) { S.panelErr = 'Enter the size or how many people it should serve.'; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('staff_set_quote', { p_order: o.id, p_version: o.version, p_price: price, p_flavour: req ? val('q-flav') : null, p_size_note: req ? val('q-size') : null }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { if (r.data.error === 'changed') { S.panelErr = CONFLICT; reloadOrderKeep(o.id); } else { S.panelErr = r.data.message; renderSheet(); } return; }
      toast('Price saved: ' + money(r.data.total) + '. Now ' + (r.data.can_email ? 'email it to the customer' : 'tell the customer') + '.');
      S.panel = null; S.dirty = {}; openOrder(o.id); loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  function sendQuote(b) {
    var o = S.sheet.data; if (S.busy) return; S.busy = true; S.panelErr = null; if (b) markBusy(b, 'Sending…');
    sb.rpc('staff_send_quote', { p_order: o.id }).then(function (r) {
      S.busy = false; clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      toast('Price emailed to ' + r.data.to + '. Press Confirm order once they agree.'); mailLoad(o.id);
    }).catch(function (e) { S.busy = false; clearBusy(); fail(e); });
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

  // A required answer is missing in a panel: say so next to the button and keep the panel open (B3)
  function panelNeed(msg) { clearBusy(); S.panelErr = msg; renderSheet(); var f = document.getElementById('ccs-note'); if (f) f.focus(); }
  function saveFulfil() {
    var o = S.sheet.data, F = S.ful; if (S.busy) return;
    if (F.method === 'delivery' && !F.zone) { S.panelErr = 'Choose a delivery area.'; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('staff_set_fulfilment', { p_order: o.id, p_version: o.version, p_method: F.method, p_zone: F.method === 'delivery' ? F.zone : null, p_address: F.method === 'delivery' ? F.address : null, p_fee: F.method === 'delivery' ? num(F.fee) : null, p_contact: F.method === 'delivery' ? F.contact : null })
      .then(function (r) {
        S.busy = false; if (r.error) throw r.error;
        if (!r.data.ok) { if (r.data.error === 'changed') { S.panelErr = CONFLICT; reloadOrderKeep(o.id); } else { S.panelErr = r.data.message; renderSheet(); } return; }
        toast((F.method === 'delivery' ? 'Delivery saved. New price ' : 'Set to collection. New price ') + money(r.data.total)); S.panel = null; openOrder(o.id); loadOrders(true);
      }).catch(function (e) { S.busy = false; fail(e); });
  }

  // Take an out-of-date photo off the order. It is hidden, not deleted, and the order history records it.
  function removePhoto(k, b) {
    var o = S.sheet.data, aid = (S.sheet.photoIds || [])[k]; if (!aid || S.busy) return;
    S.busy = true; markBusy(b, 'Removing…');
    sb.rpc('staff_remove_photo', { p_attachment: aid }).then(function (r) {
      S.busy = false; clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      toast(r.data.brief_needs_reprint ? 'Photo removed. Print a new kitchen slip so the kitchen has the current photos.' : 'Photo removed from ' + r.data.reference);
      openOrder(o.id);
    }).catch(function (e) { S.busy = false; clearBusy(); fail(e); });
  }
  function saveCandles() {
    var o = S.sheet.data, v = val('ccs-candles').trim(); if (S.busy) return;
    if (v.length > 60) { S.panelErr = 'Keep the candles to 60 characters.'; S.dirty['ccs-candles'] = v; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('staff_set_candles', { p_order: o.id, p_candles: v }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; S.dirty['ccs-candles'] = v; return renderSheet(); }
      S.dirty = {}; S.panel = null;
      toast(!r.data.changed ? 'No change to save' : r.data.brief_needs_reprint ? 'Candles saved. Print the new kitchen slip.' : 'Candles saved');
      openOrder(o.id); loadOrders(true);
    }).catch(function (e) { S.busy = false; fail(e); });
  }

  // ---------- kitchen slip (print) ----------
  // Every slip, file and record carries the order's own number; without one, nothing prints
  function validRef(r) { return typeof r === 'string' && /^[A-Z]{1,4}-[0-9]{3,}$/.test(r.trim()); }
  var NO_REF = 'This order has no order number, so its slip cannot print. Ask a manager to fix the order.';
  // What to do with a new slip: email, download, print here. Remembered on this device.
  function slipPick() {
    if (!S.slipPick) { var d = { email: true, dl: false, print: false }; try { var j = JSON.parse(localStorage.getItem('ccs-slip-pick') || 'null'); if (j && typeof j === 'object') d = { email: !!j.email, dl: !!j.dl, print: !!j.print }; } catch (e) {} S.slipPick = d; }
    return S.slipPick;
  }
  function slipPickSet(k, on) { var pk = slipPick(); pk[k] = !!on; try { localStorage.setItem('ccs-slip-pick', JSON.stringify(pk)); } catch (e) {} }
  function printBrief(size, opts) {
    var o = S.sheet.data; if (S.busy) return;
    opts = opts || { email: true };
    if (!validRef(o.reference)) { S.panelErr = NO_REF; return renderSheet(); }
    S.busy = true; S.panelErr = null;
    sb.rpc('staff_print_brief', { p_order: o.id, p_email: opts.email !== false }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
      if (!r.data.snapshot || !validRef(r.data.snapshot.reference) || r.data.snapshot.reference !== o.reference) { S.panelErr = NO_REF; return renderSheet(); }
      var b = r.data, em = b.email || {};
      S.briefDone = { id: o.id, b: b, size: size };
      toast(em.state === 'queued' ? b.snapshot.reference + ' slip v' + b.version + ' emailed for printing' : b.snapshot.reference + ' slip v' + b.version + ' ready');
      openOrder(o.id).then(function () {
        if (!S.sheet || S.sheet.id !== o.id) return;
        S.panel = 'brief-done'; S.panelErr = null; renderSheet();
        (opts.dl ? briefPdf() : Promise.resolve()).then(function () { if (opts.print && S.briefDone && S.briefDone.id === o.id) briefPrintHere(); });
        [3000, 8000, 20000].forEach(function (ms) { setTimeout(function () { if (S.sheet && S.sheet.id === o.id && S.panel === 'brief-done') slipLoad([o.id]); }, ms); });
      });
    }).catch(function (e) { S.busy = false; fail(e); });
  }
  // Print on this device: the same slip as before, through the browser's print window
  function briefPrintHere() {
    var d = S.briefDone; if (!d) return;
    var b = d.b, paths = b.snapshot.photos || [];
    var go = function (urls) { renderBrief(b, urls, d.size || S.slip.paper); };
    if (!paths.length) return go([]);
    sb.storage.from('cake-references').createSignedUrls(paths, 900).then(function (u) { go(((u && u.data) || []).map(function (x) { return x.signedUrl; }).filter(Boolean)); }, function () { go([]); });
  }
  // Download: the same PDF the kitchen email carries, made in the browser from the same layout file
  var PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', PDFLIB_SRI = 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI';
  var SLIP_LOGO_PNG = 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@6879294bbce62e730bdf5b1af8c2b3e931a06fb5/dist/brand/slip-logo-white.png';
  var pdfLibP = null;
  function pdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (pdfLibP) return pdfLibP;
    pdfLibP = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = PDFLIB_URL; s.integrity = PDFLIB_SRI; s.crossOrigin = 'anonymous';
      s.onload = function () { window.PDFLib ? ok(window.PDFLib) : no(new Error('pdf')); }; s.onerror = function () { pdfLibP = null; no(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return pdfLibP;
  }
  function briefPdf() {
    var d = S.briefDone; if (!d || S.busy) return Promise.resolve();
    var b = d.b; S.busy = true; S.panelErr = null;
    var logo = fetch(SLIP_LOGO_PNG).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (x) { return x ? new Uint8Array(x) : null; }, function () { return null; });
    return Promise.all([pdfLib(), logo]).then(function (z) {
      return SlipPdf.buildSlipPdf(z[0], { snapshot: b.snapshot, slip: b.slip || {}, version: b.version, changes: b.changes || [], printedAt: b.first_printed_at, logoPng: z[1], location: {}, paper: b.paper || d.size || 'A5' });
    }).then(function (bytes) {
      S.busy = false; clearBusy();
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), a = document.createElement('a');
      a.href = url; a.download = SlipPdf.slipFileName(b.snapshot, b.slip || {}, b.version) + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      toast('Slip downloaded');
    }).catch(function () { S.busy = false; clearBusy(); S.panelErr = 'The download did not work. Press Print on this device and choose Save as PDF instead.'; renderSheet(); });
  }
  // Kitchen slip in the Cake Order Slip layout (one A5 page)
  var SLIP_LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="364.8 277 120.3 43.8" fill="currentColor" role="img" aria-label="Corner Cafe"><path fill-rule="evenodd" d="M 477.05 282.33L477.02 288.33L477.09 294.55L468.64 294.55L468.66 293.69L468.67 290.50L468.73 284.76L468.66 278.39L468.64 277.48L477.07 277.48L477.07 280.70C478.33 279.43 479.21 278.63 479.71 278.29C480.85 277.53 481.92 277.15 482.93 277.15C483.55 277.15 484.06 277.28 484.46 277.53C484.85 277.78 485.06 278.10 485.06 278.48C485.06 278.78 484.94 279.03 484.69 279.23C484.45 279.43 484.16 279.53 483.79 279.53C483.56 279.53 483.30 279.46 483.01 279.34C482.53 279.12 482.13 279.01 481.82 279.01C481.02 279.01 480.26 279.27 479.52 279.78C478.79 280.29 477.96 281.14 477.05 282.33M459.23 285.49L459.23 280.92C459.20 279.94 459.18 279.35 459.16 279.16C459.14 278.97 459.07 278.79 458.93 278.62C458.62 278.21 458 278.01 457.05 278.01C456.08 278.01 455.48 278.25 455.24 278.71C455.08 279 455.01 279.73 455.01 280.92L455.01 285.49L457.02 285.55 ZM455.01 286.52L455.01 291.36C455.01 292.30 455.07 292.89 455.19 293.14C455.42 293.62 455.97 293.87 456.82 293.87C458.10 293.87 459.35 293.53 460.60 292.87C461.85 292.21 462.92 291.30 463.83 290.13C464.13 289.75 464.35 289.50 464.48 289.39C464.61 289.29 464.75 289.24 464.91 289.24C465.09 289.24 465.25 289.30 465.37 289.44C465.49 289.57 465.55 289.73 465.55 289.93C465.55 290.37 465.18 290.95 464.45 291.69C463.48 292.64 462.28 293.41 460.85 294.00C459.41 294.60 458.02 294.90 456.66 294.90C454.32 294.90 452.26 294.16 450.46 292.66C449.42 291.78 448.62 290.71 448.06 289.42C447.57 288.30 447.32 287.17 447.32 286.05C447.32 284.96 447.54 283.88 447.98 282.78C448.42 281.70 449.02 280.76 449.79 279.97C450.68 279.04 451.73 278.32 452.95 277.81C454.15 277.31 455.40 277.06 456.71 277.06C458.74 277.06 460.58 277.62 462.22 278.76C464.79 280.53 466.07 283.10 466.04 286.47L462.21 286.47L457.26 286.48 ZM431.44 277.48L431.44 279.65C432.73 278.79 433.98 278.14 435.21 277.71C436.45 277.27 437.64 277.06 438.80 277.06C440.36 277.06 441.68 277.39 442.76 278.07C443.57 278.58 444.11 279.21 444.39 279.97C444.67 280.73 444.82 281.96 444.82 283.67L444.78 290.91L444.83 294.55L436.45 294.55L436.51 290.21L436.57 287.02L436.55 282.20C436.54 281.09 436.53 280.42 436.51 280.21C436.49 280 436.44 279.80 436.35 279.64C436.17 279.31 435.80 279.14 435.21 279.14C434.67 279.14 434.10 279.28 433.47 279.57C432.84 279.87 432.17 280.30 431.44 280.89L431.43 281.53L431.39 285.92L431.36 289.29L431.41 293.88L431.43 294.55L423.01 294.55L423.07 288.43L423.11 284.37L423.07 280.87L423.01 277.48 ZM413.59 282.33L413.55 288.33L413.62 294.55L405.17 294.55L405.19 293.69L405.21 290.50L405.26 284.76L405.19 278.39L405.17 277.48L413.60 277.48L413.60 280.70C414.86 279.43 415.75 278.63 416.24 278.29C417.38 277.53 418.46 277.15 419.47 277.15C420.08 277.15 420.59 277.28 420.99 277.53C421.39 277.78 421.59 278.10 421.59 278.48C421.59 278.78 421.47 279.03 421.23 279.23C420.98 279.43 420.69 279.53 420.32 279.53C420.09 279.53 419.83 279.46 419.55 279.34C419.07 279.12 418.66 279.01 418.35 279.01C417.56 279.01 416.79 279.27 416.06 279.78C415.32 280.29 414.50 281.14 413.59 282.33M392.73 278.07L392.68 293.83C393.02 293.85 393.25 293.87 393.39 293.87C394.91 293.87 396.37 293.46 397.76 292.65C399.11 291.85 400.11 290.80 400.78 289.49C401.31 288.44 401.57 287.30 401.57 286.05C401.57 283.54 400.59 281.50 398.64 279.94C397.06 278.67 395.34 278.04 393.49 278.04C393.33 278.04 393.08 278.05 392.73 278.07M393.21 277.06C394.97 277.06 396.65 277.52 398.23 278.45C399.69 279.31 400.80 280.47 401.57 281.95C402.25 283.26 402.59 284.64 402.59 286.10C402.59 287.10 402.39 288.10 401.99 289.11C401.59 290.12 401.04 291.02 400.35 291.80C399.39 292.88 398.21 293.68 396.81 294.22C395.67 294.67 394.48 294.90 393.24 294.90C391.16 294.90 389.30 294.32 387.64 293.14C386.35 292.25 385.36 291.10 384.69 289.69C384.13 288.50 383.85 287.25 383.85 285.92C383.85 283.33 384.84 281.19 386.82 279.48C388.67 277.90 390.80 277.09 393.21 277.06M373.73 280.87L373.73 291.32L373.71 292.32C373.71 292.96 373.80 293.40 373.96 293.61C374.14 293.82 374.48 293.93 374.99 293.93C376.29 293.93 377.56 293.55 378.82 292.79C380.07 292.04 381.08 291.03 381.88 289.76C382.12 289.37 382.35 289.17 382.58 289.17C382.75 289.17 382.90 289.25 383.04 289.39C383.17 289.53 383.24 289.67 383.24 289.83C383.24 290.21 382.93 290.74 382.29 291.42C381.65 292.10 380.91 292.71 380.07 293.26C378.34 294.35 376.50 294.90 374.53 294.90C371.84 294.90 369.62 294.10 367.87 292.52C365.86 290.74 364.87 288.55 364.87 285.97C364.87 283.30 365.92 281.08 368.03 279.31C369.80 277.81 371.98 277.06 374.57 277.06C376.63 277.06 378.44 277.52 379.98 278.45C380.64 278.85 381.18 279.27 381.60 279.72C382.01 280.17 382.23 280.56 382.23 280.87C382.23 281.03 382.16 281.16 382.04 281.27C381.92 281.38 381.77 281.44 381.60 281.44C381.37 281.44 381.07 281.19 380.73 280.68C380.22 279.99 379.42 279.38 378.33 278.86C377.25 278.35 376.22 278.09 375.26 278.09C374.61 278.09 374.19 278.26 374.01 278.61C373.82 278.95 373.73 279.71 373.73 280.87"/><path fill-rule="evenodd" d="M 454.97 311.08L454.97 306.37C454.94 305.36 454.92 304.76 454.90 304.56C454.88 304.36 454.81 304.17 454.67 304.00C454.37 303.58 453.76 303.37 452.83 303.37C451.88 303.37 451.29 303.61 451.05 304.09C450.90 304.39 450.83 305.15 450.83 306.37L450.83 311.08L452.80 311.14 ZM450.83 312.14L450.83 317.14C450.83 318.11 450.89 318.72 451.00 318.98C451.23 319.47 451.76 319.72 452.60 319.72C453.86 319.72 455.09 319.38 456.32 318.69C457.54 318.01 458.60 317.07 459.5 315.87C459.79 315.47 460.00 315.22 460.12 315.11C460.26 315.00 460.40 314.95 460.55 314.95C460.73 314.95 460.88 315.01 461.00 315.15C461.12 315.28 461.18 315.45 461.18 315.66C461.18 316.11 460.82 316.71 460.10 317.48C459.15 318.46 457.97 319.25 456.56 319.86C455.15 320.48 453.78 320.78 452.44 320.78C450.15 320.78 448.12 320.01 446.36 318.48C445.33 317.57 444.55 316.46 444 315.14C443.51 313.98 443.27 312.82 443.27 311.66C443.27 310.54 443.49 309.42 443.92 308.29C444.35 307.17 444.94 306.20 445.69 305.39C446.57 304.43 447.61 303.69 448.80 303.16C449.98 302.65 451.21 302.39 452.5 302.39C454.49 302.39 456.29 302.97 457.91 304.14C460.44 305.97 461.69 308.62 461.67 312.09L457.89 312.09L453.04 312.11 ZM440.42 303.78L440.39 308.61L440.35 314.60L440.42 319.78L440.42 320.43L432.16 320.43L432.16 319.88L432.19 317.27L432.22 311.61L432.16 304.25L432.16 303.78L431.86 303.78L430.62 303.82C430.13 303.82 429.89 303.63 429.89 303.26C429.89 302.89 430.11 302.69 430.55 302.69L431.33 302.74L432.26 302.74C432.42 301.84 432.61 301.13 432.84 300.62C433.07 300.11 433.43 299.62 433.92 299.15C435.26 297.82 437.19 297.15 439.69 297.15C440.92 297.15 442.01 297.33 442.94 297.69C443.89 298.07 444.35 298.48 444.35 298.96C444.35 299.14 444.28 299.30 444.13 299.43C443.99 299.56 443.82 299.63 443.62 299.63C443.41 299.63 443.20 299.51 443 299.28C442.74 298.96 442.54 298.75 442.39 298.65C442.26 298.55 442.08 298.50 441.89 298.50C441.34 298.50 440.95 298.82 440.73 299.44C440.50 300.07 440.38 301.17 440.37 302.74L441.87 302.74C441.94 302.74 442.08 302.73 442.30 302.71C442.48 302.70 442.66 302.69 442.82 302.69C443.26 302.69 443.48 302.89 443.48 303.28C443.48 303.64 443.22 303.82 442.69 303.82L441.50 303.79 ZM420.03 310.85C418.67 310.17 417.62 309.83 416.88 309.83C416.25 309.83 415.84 310.08 415.65 310.58C415.54 310.85 415.49 311.62 415.49 312.92L415.49 316.77C415.50 317.62 415.53 318.13 415.57 318.32C415.67 318.81 416.04 319.06 416.67 319.06C417.16 319.06 417.71 318.91 418.33 318.61C418.94 318.32 419.49 317.93 420.00 317.44 ZM420.02 309.69L420.02 307.72C420.01 306.36 419.98 305.52 419.95 305.21C419.92 304.90 419.82 304.62 419.66 304.37C419.27 303.77 418.37 303.47 416.94 303.47C414.75 303.47 413.04 304.16 411.85 305.53C411.36 306.09 410.95 306.37 410.62 306.37C410.37 306.37 410.16 306.28 409.97 306.11C409.78 305.94 409.69 305.74 409.69 305.51C409.69 304.84 410.5 304.14 412.10 303.42C413.64 302.73 415.62 302.39 418.05 302.39C422.03 302.39 424.85 302.99 426.49 304.19C427.20 304.72 427.67 305.31 427.88 305.97C428.10 306.62 428.20 307.78 428.20 309.43L428.20 315.83C428.16 317.01 428.19 317.90 428.31 318.50C428.42 319.10 428.67 319.74 429.08 320.43L420.02 320.43L420.02 318.73C419.02 319.41 418.04 319.92 417.06 320.27C416.09 320.61 415.12 320.78 414.17 320.78C412.57 320.78 411.14 320.32 409.89 319.38C408.26 318.16 407.45 316.57 407.45 314.60C407.45 312.88 408.10 311.48 409.42 310.42C410.95 309.16 412.85 308.53 415.11 308.53C416.04 308.53 416.86 308.61 417.58 308.78C418.29 308.95 419.10 309.25 420.02 309.69M397.48 306.32L397.48 317.09L397.46 318.12C397.46 318.79 397.55 319.23 397.71 319.46C397.88 319.67 398.22 319.78 398.72 319.78C400.00 319.78 401.25 319.39 402.48 318.61C403.71 317.83 404.71 316.79 405.49 315.48C405.73 315.08 405.96 314.88 406.18 314.88C406.34 314.88 406.49 314.95 406.63 315.10C406.76 315.25 406.83 315.40 406.83 315.56C406.83 315.95 406.52 316.5 405.89 317.20C405.27 317.90 404.54 318.53 403.71 319.09C402.01 320.22 400.20 320.78 398.27 320.78C395.63 320.78 393.44 319.97 391.72 318.33C389.75 316.5 388.78 314.24 388.78 311.58C388.78 308.83 389.81 306.54 391.88 304.71C393.62 303.16 395.76 302.39 398.30 302.39C400.33 302.39 402.11 302.87 403.63 303.82C404.27 304.23 404.80 304.67 405.21 305.14C405.62 305.60 405.83 306.00 405.83 306.32C405.83 306.48 405.77 306.62 405.65 306.73C405.53 306.85 405.38 306.90 405.21 306.90C404.99 306.90 404.70 306.64 404.35 306.12C403.86 305.41 403.07 304.78 402.01 304.25C400.94 303.71 399.93 303.45 398.98 303.45C398.35 303.45 397.94 303.63 397.76 303.98C397.57 304.33 397.48 305.12 397.48 306.32"/></svg>';
  function briefHtml(b, urls, size) {
    var s = b.snapshot, x = b.slip || {}, deliv = s.method === 'delivery', due = s.time, lead = deliv ? 60 : 30;
    var dm = Number(due.slice(0, 2)) * 60 + Number(due.slice(3, 5)) - lead, readyBy = String(Math.floor(dm / 60)).padStart(2, '0') + ':' + String(dm % 60).padStart(2, '0');
    var NAMES = { cake: 'cake', variant: 'flavour', size: 'size', quantity: 'quantity', finish: 'finish', design: 'design', message: 'inscription', occasion: 'occasion', dietary: 'dietary', dietary_note: 'dietary note', has_dietary: 'dietary', date: 'date', time: 'time', method: 'collection or delivery', area: 'delivery area', photos: 'reference photos', kitchen_notes: 'kitchen notes', order_notes: 'order notes', customer: 'name', serves: 'serves', rush: 'short notice', candles: 'candles' };
    var changed = (b.changes || []).map(function (k) { return NAMES[k] || k; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var diet = s.has_dietary ? [].concat(s.dietary || [], s.dietary_note ? [s.dietary_note] : []).join(', ') || 'See order notes' : '';
    var cents = function (v) { return v == null || v === '' ? '' : '$' + Number(v).toFixed(2); };
    var line = function (k, v, cls) { return '<div class="sl-line' + (cls ? ' ' + cls : '') + '"><span>' + k + ':</span><b>' + (v ? esc(v) : '&nbsp;') + '</b></div>'; };
    var pair = function (k1, v1, k2, v2) { return '<div class="sl-pair">' + line(k1, v1) + line(k2, v2) + '</div>'; };
    var cake = (s.variant || s.cake || '') + (s.variant && s.cake && s.variant !== s.cake && s.cake.indexOf(s.variant) < 0 ? ' (' + s.cake + ')' : '') + (s.finish === 'custom' ? ' · Custom design' : '');
    var sizeTxt = s.size ? s.size + ' inch' + (s.quantity > 1 ? ' × ' + s.quantity + ' cakes' : '') + (s.serves ? ' · ' + s.serves : '') : (s.serves || '') + (s.quantity > 1 ? ' × ' + s.quantity + ' cakes' : '');
    if (!s.size && s.cake === 'Custom cake') cake = s.variant ? s.variant + ' (custom)' : 'Custom cake';
    var remarks = [s.finish === 'custom' && s.design ? 'Design: ' + s.design : '', s.order_notes ? 'Order notes: ' + s.order_notes : '', s.kitchen_notes ? 'Kitchen notes: ' + s.kitchen_notes : ''].filter(Boolean).join(' · ');
    var paidAmt = Number(x.paid || 0), due2 = x.price != null ? Math.max(Number(x.price) - paidAmt, 0) : null;
    // One plain payment line: paid in full, deposit paid with the balance, or nothing paid yet
    var priceTxt = x.price == null || x.price === '' ? 'To be priced' : paidAmt >= Number(x.price) - 0.005 ? 'Paid in full (' + cents(x.price) + ')' : paidAmt > 0.005 ? 'Deposit paid ' + cents(paidAmt) + '  ·  Balance ' + cents(due2) + ' to pay' : 'Full payment pending  ·  ' + cents(x.price) + ' to pay';
    // What the kitchen needs at a glance: when, which cake, what size, any dietary need. Large type.
    var key = function (k, v, cls, sub) { return '<div class="sl-k' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><b>' + esc(v) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>'; };
    // When: the weekday largest, so the kitchen reads the day at a glance; the date and time below; ready by beside
    var dd = new Date(s.date + 'T12:00:00Z'), wday = dd.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }), dmon = dd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    var when = '<div class="sl-when"><div class="sl-when-main"><span>' + (deliv ? 'Delivery' : 'Pickup') + '</span><b>' + esc(wday) + '</b><em>' + esc(dmon + ' · ' + t12(s.time)) + '</em></div><div class="sl-when-ready"><span>Ready by</span><b>' + esc(t12(readyBy)) + '</b></div></div>';
    var keys = when + '<div class="sl-key">' +
      key('Cake', cake || 'Not given', 'sl-k-cake') + key('Size', sizeTxt || 'Not given') +
      ((s.requirements || []).length ? key('Must be', reqList(s).join(' · '), 'sl-must') : '') +
      key('Allergy', s.has_dietary ? diet : 'None given', s.has_dietary ? 'sl-diet' : 'sl-k-none') +
    '</div>';
    var SRC = { online: 'Website', walk_in: 'Walk-in', phone: 'Phone', whatsapp: 'WhatsApp', social: 'Social media', corporate: 'Corporate' };
    var at = x.ordered_at ? new Date(x.ordered_at) : null;
    var odate = at ? at.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '';
    var otime = at ? apFix(at.toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })) : '';
    return '<div class="ccs-slip ccs-slip-' + size + '">' +
      '<div class="sl-ordno"><span>Order</span><b>' + esc(s.reference) + '</b><i>v' + b.version + '</i></div>' +
      '<div class="sl-head"><div class="sl-logo">' + SLIP_LOGO + '</div></div>' +
      '<div class="sl-meta"><span>Kitchen slip v' + b.version + ' · Printed ' + esc(stamp(new Date().toISOString())) + '</span>' + (s.rush ? '<em>Short notice</em>' : '') + '</div>' +
      (b.version > 1 && changed.length ? '<div class="sl-changed">Changed since v' + (b.version - 1) + ': ' + esc(changed.join(', ')) + '. Throw away the old slip.</div>' : '') +
      keys +
      '<div class="sl-lines">' +
        line('Guest Name', x.name || s.customer) + line('Contact', x.phone || ('No phone. They quote ' + s.reference)) +
        (deliv ? line('Deliver to', [s.area, x.address].filter(Boolean).join(', ') + (x.receiver ? ' (for ' + x.receiver + ')' : ''), 'sl-wrap') : '') +
        line('Payment', priceTxt) + line('Occasion', s.occasion) + line('Candles', s.candles) +
        line('Inscription', s.message ? '“' + s.message + '”' : '', 'sl-big') + line('Remarks', remarks + (!s.has_dietary ? (remarks ? ' · ' : '') + 'No dietary needs or allergies given.' : ''), 'sl-wrap') +
        line('Order Taken by', (x.taken_by || '') + (x.source && x.source !== 'online' ? ' (' + (SRC[x.source] || x.source) + ')' : '')) + pair('Date', odate, 'Time', otime) +
      '</div>' +
      (urls.length ? '<div class="sl-photos">' + urls.map(function (u) { return '<img src="' + esc(u) + '" alt="Reference photo">'; }).join('') + '</div>' : '') +
      '<div class="sl-foot"><b>Phone: + 679 8922760 | Email: cornercafe@jacksfiji.com</b><small>All prices include 12.5% VAT. 2% surcharge applies to all credit card payments.</small></div>' +
    '</div>';
  }
  // Printing or saving as PDF uses the page title as the file name, so the slip is named for the order
  function briefFileName(b) {
    var s = b.snapshot || {}, x = b.slip || {}, deliv = s.method === 'delivery', d = s.date ? new Date(s.date + 'T12:00:00Z') : null;
    var tm = s.time ? (function (t) { var hh = Number(t.slice(0, 2)), mm = t.slice(3, 5); return ((hh % 12) || 12) + '.' + mm + (hh < 12 ? ' AM' : ' PM'); })(String(s.time)) : '';
    var parts = [s.reference, deliv ? 'Delivery' : 'Pickup', d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '') : '', tm,
      s.variant || s.cake || '', s.size ? s.size + ' inch' : '', x.name || s.customer || '', 'v' + (b.version || 1)];
    return parts.filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var titleBeforePrint = null;
  function printNamed(name) { if (titleBeforePrint == null) titleBeforePrint = document.title; document.title = name; }
  function renderBrief(b, urls, size) {
    var el = document.getElementById('ccs-print'); if (!el) { el = document.createElement('div'); el.id = 'ccs-print'; document.body.appendChild(el); }
    el.innerHTML = '<div class="ccs-fit">' + briefHtml(b, urls, size) + '</div>';
    var ps = document.getElementById('ccs-page'); if (!ps) { ps = document.createElement('style'); ps.id = 'ccs-page'; document.head.appendChild(ps); }
    ps.textContent = '@page{size:' + (size === 'DL' ? '99mm 210mm' : size + ' portrait') + ';margin:' + (size === 'A5' ? '8mm' : size === 'DL' ? '6mm' : '12mm') + '}';
    var imgs = Array.prototype.slice.call(el.querySelectorAll('img')), started = false;
    var fire = function () { if (started) return; started = true; fitBrief(el, size); printNamed(briefFileName(b)); document.body.classList.add('ccs-printing'); setTimeout(function () { window.print(); }, 50); };
    var left = imgs.length; if (!left) return fire();
    imgs.forEach(function (im) { if (im.complete) { if (--left === 0) fire(); } else { im.onload = im.onerror = function () { if (--left === 0) fire(); }; } });
    setTimeout(fire, 4000);
  }
  // The brief always prints on one page: if it is too long, it is scaled down to fit. Nothing is cut off.
  function fitBrief(el, size) {
    var mm = 96 / 25.4, W = (size === 'A5' ? 132 : size === 'DL' ? 87 : 186) * mm, H = (size === 'A5' ? 191 : size === 'DL' ? 196 : 270) * mm, f = el.firstChild, sc = 1;
    el.style.cssText = 'display:block;position:absolute;left:-10000px;top:0;visibility:hidden;width:' + W + 'px';
    f.style.transform = ''; f.style.width = W + 'px';
    for (var i = 0; i < 8; i++) {
      var h = f.scrollHeight;
      if (h * sc <= H) break;
      sc = Math.max(0.3, sc * H / (h * sc) * 0.99);
      f.style.width = (W / sc) + 'px';
    }
    f.style.transformOrigin = '0 0'; f.style.transform = sc < 1 ? 'scale(' + sc + ')' : '';
    el.style.cssText = 'height:' + H + 'px;width:' + W + 'px;overflow:hidden';
    el.dataset.scale = sc.toFixed(3);
    return sc;
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('ccs-printing'); if (titleBeforePrint != null) { document.title = titleBeforePrint; titleBeforePrint = null; } });

  // ---------- kitchen slip delivery: emailed is not the same as printed ----------
  // The email only proves the slip left us. The kitchen taps Printed once it is in their hands.
  S.slip = { rows: {}, paper: 'A5' };
  function slipLoad(ids) {
    ids = (ids || []).filter(Boolean); if (!ids.length) return Promise.resolve();
    return sb.rpc('slip_status', { p_orders: ids }).then(function (r) {
      if (r.error || !r.data || !r.data.ok) return;
      S.slip.paper = r.data.paper === 'DL' ? 'DL' : 'A5';
      ids.forEach(function (id) { S.slip.rows[id] = (r.data.rows || {})[id] || null; });
      if (S.tab === 'kitchen' && !S.sheet) view();
      if (S.sheet && ids.indexOf(S.sheet.id) > -1) renderSheet();
    }, function () {});
  }
  var SLIP_FAIL = 'The kitchen email could not be delivered. The order is safely saved.';
  // One plain line: is the newest slip emailed, and has the kitchen confirmed it printed?
  function slipState(id) {
    var x = S.slip.rows[id]; if (!x) return null;
    var em = x.email === 'sent' ? 'Emailed to the kitchen' : x.email === 'pending' || x.email === 'sending' ? 'Sending to the kitchen' : x.email === 'retrying' ? 'Kitchen email delayed, trying again' : x.email === 'failed' ? 'Kitchen email failed' : 'Not emailed';
    return { v: x.version, failed: x.email === 'failed', printed: !!x.confirmed_at, text: 'Slip v' + x.version + ' · ' + em + ' · ' + (x.confirmed_at ? 'Printed, confirmed by ' + (x.confirmed_by || 'staff') : 'Not yet confirmed as printed') };
  }
  function slipBox(id, kitchen) {
    var st = slipState(id); if (!st) return '';
    if (st.failed) return '<div class="ccs-alert" role="alert">' + (kitchen ? 'Slip v' + st.v + ' email failed. Ask the counter to print it for you.' : esc(SLIP_FAIL) + ' Press Print kitchen slip to print it here, or ask a manager to send it again from Settings.') + '</div>';
    var h = '<p class="ccs-slipst' + (st.printed ? ' is-ok' : '') + '">' + esc(st.text) + '</p>';
    if (kitchen && !st.printed && !st.failed) h += '<button type="button" class="ccs-btn ccs-ghost ccs-kprinted" data-act="k-printed" data-id="' + id + '" data-v="' + st.v + '">Slip v' + st.v + ' printed</button>';
    return h;
  }
  function slipPrinted(b) {
    var id = b.dataset.id, v = Number(b.dataset.v);
    sb.rpc('kitchen_confirm_printed', { p_order: id, p_version: v }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { toast(r.data.message, true); return slipLoad([id]); }
      toast('Slip v' + r.data.version + ' marked as printed'); return slipLoad([id]);
    }).catch(fail);
  }

  // ---------- kitchen screen ----------
  function loadKitchen(silent) {
    return sb.rpc('kitchen_board', { p_from: null, p_days: 7 }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) throw userErr(r.data.message);
      S.kit.data = r.data; S.kit.loaded = true; S.kit.err = null; S.kit.fails = 0; S.kit.at = Date.now();
      slipLoad((r.data.orders || []).filter(function (x) { return x.brief_version > 0 && x.status === 'confirmed'; }).map(function (x) { return x.id; }));
      if (S.kit.cal && S.kit.cal.orders && S.tab === 'kitchen' && kitMode() === 'cal') kitCalLoad(true);
      if (S.tab === 'kitchen' || S.tab === 'handover') view();
      if (S.sheet && S.sheet.type === 'kitchen') renderSheet();
    }).catch(function (e) {
      console.error(e);
      if (errKind(e) === 'expired') return sessionExpired();
      var K = S.kit; K.fails = (K.fails || 0) + 1;
      if (!K.loaded) K.err = errKind(e) === 'offline' ? 'No internet connection, so we couldn\'t load the kitchen board.' : 'We couldn\'t load the kitchen board. Try again.';
      if (!silent && K.loaded) loadFail(e);
      if ((!K.loaded || K.fails >= 2) && S.tab === 'kitchen') view();
      if (!K.loaded && S.sheet && S.sheet.type === 'kitchen') renderSheet();
    });
  }
  function kitRow(id) { var f = function (l) { return (l || []).filter(function (r) { return r.id === id; })[0]; }; return (S.kit.data && f(S.kit.data.orders)) || (S.kit.cal && f(S.kit.cal.orders)) || null; }
  function kitCake(r) { if (!r.size && r.cake === 'Custom cake') return ['Custom cake', r.variant, r.serves].filter(Boolean).join(', ') + (r.quantity > 1 ? ' × ' + r.quantity : ''); return (r.variant || r.cake || 'Cake') + ', ' + r.size + ' inch' + (r.quantity > 1 ? ' × ' + r.quantity : ''); }
  var KCOLS = [['start', 'To start', ['not_started', 'scheduled']], ['prog', 'In progress', ['preparing', 'baking', 'assembling', 'decorating', 'in_production']], ['qc', 'Quality check', ['quality_check']], ['ready', 'Ready', ['ready']], ['done', 'Handed over', []]];
  function kitCard(r) {
    var tags = '';
    if (r.late) tags += '<span class="ccs-pill s-alert">Late</span>';
    if (r.has_dietary) tags += '<span class="ccs-pill s-alert">Dietary or allergy</span>';
    if (r.finish === 'custom') tags += '<span class="ccs-pill s-info">Custom</span>';
    if (r.method === 'delivery') tags += '<span class="ccs-pill s-info">Delivery' + (r.area ? ', ' + esc(r.area) : '') + '</span>';
    if (r.amend_pending && r.amend_pending.length) tags += '<span class="ccs-pill s-flag">Changed: kitchen to confirm</span>';
    if (r.brief_changed) tags += '<span class="ccs-pill s-flag">Changed after printing: print new slip</span>';
    else if (!r.brief_version && r.status === 'confirmed') tags += '<span class="ccs-pill s-off">No slip yet</span>';
    var inProg = ['preparing', 'baking', 'assembling', 'decorating'].indexOf(r.stage) > -1;
    var idx = stageIndex(r.stage), next = r.status === 'confirmed' && idx < STAGES.length - 2 ? STAGES[idx + 1] : null;
    var action = r.status !== 'confirmed' ? '' : next ? '<button type="button" class="ccs-btn ccs-good ccs-knext" data-act="k-next" data-id="' + r.id + '" data-v="' + next[0] + '">' + esc(stageJob(next)) + '</button>' :
      r.stage === 'quality_check' ? '<button type="button" class="ccs-btn ccs-knext" data-act="open-kitchen" data-id="' + r.id + '">Check and mark Ready</button>' : '';
    return '<div class="ccs-kitem">' + kitCardBody(r, inProg, tags) + (r.status === 'confirmed' && r.stage !== 'ready' ? slipBox(r.id, true) : '') + action + '</div>';
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
  // ---------- kitchen workspace: Today, Board and Calendar from the same kitchen_board rows ----------
  var KMODES = [['today', 'Today'], ['board', 'Board'], ['cal', 'Calendar'], ['hand', 'Handover']];
  function kitMode() { return secCur('kitM', KMODES.map(function (m) { return m[0]; }), 'today'); }
  function kitNextAction(r, cls) {
    if (r.status !== 'confirmed') return '';
    var idx = stageIndex(r.stage), next = idx < STAGES.length - 2 ? STAGES[idx + 1] : null;
    if (next) return '<button type="button" class="ccs-btn ccs-good ' + (cls || 'ccs-knext') + '" data-act="k-next" data-id="' + r.id + '" data-v="' + next[0] + '">' + esc(stageJob(next)) + '</button>';
    if (r.stage === 'quality_check') return '<button type="button" class="ccs-btn ' + (cls || 'ccs-knext') + '" data-act="open-kitchen" data-id="' + r.id + '">Check and mark Ready</button>';
    return '';
  }
  // Why a cake needs a look, in the order the kitchen should deal with it
  function kitWhy(r) {
    var w = [];
    if (r.late) w.push('Late');
    if (r.amend_pending && r.amend_pending.length) w.push('Changed: confirm the change');
    if (r.brief_changed) w.push('Changed after printing: print new slip');
    else if (!r.brief_version && r.status === 'confirmed' && r.stage !== 'ready') w.push('No slip yet');
    if (r.stage === 'quality_check') w.push('Waiting for quality check');
    return w;
  }
  function kitFlags(r) {
    var f = '';
    if (r.has_dietary) f += '<span class="ccs-pill s-alert">Allergy</span>';
    if (r.finish === 'custom') f += '<span class="ccs-pill s-info">Custom</span>';
    if (r.method === 'delivery') f += '<span class="ccs-pill s-info">Delivery</span>';
    return f;
  }
  function kitStageText(r) { return r.status === 'completed' ? 'Handed over' : r.stage === 'ready' ? 'Ready' : STAGE_LABEL[r.stage] || 'To start'; }
  // One compact line per cake; the whole line opens the kitchen panel
  function kitLine(r, why) {
    return '<button type="button" class="kw-line' + (r.late ? ' is-late' : '') + '" data-act="open-kitchen" data-id="' + r.id + '">' +
      '<span class="kw-when"><b>' + esc(t12(r.time)) + '</b><span>' + esc(whenLabel(r.date)) + '</span></span>' +
      '<span class="kw-what"><b>' + esc(kitCake(r)) + '</b><span>' + esc(r.reference) + ' · ' + esc(r.customer || '') + '</span>' +
      (why && why.length ? '<em>' + esc(why.join(' · ')) + '</em>' : '') + '</span>' +
      '<span class="kw-meta"><span class="kw-stage">' + esc(kitStageText(r)) + '</span>' + kitFlags(r) + '</span></button>';
  }
  function kitSort(a, b) { return (a.late === b.late ? 0 : a.late ? -1 : 1) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || String(a.time || '').localeCompare(String(b.time || '')); }
  function kitchenView() {
    var K = S.kit, t = today(), mode = kitMode();
    var h = '<div class="ccs-head tp-head kw-head"><div><p class="ccs-eyebrow">Corner Café · Kitchen</p><h1 class="ccs-title">' + (mode === 'cal' ? 'Production calendar' : mode === 'board' ? 'Production board' : mode === 'hand' ? 'Shift handover' : 'What\'s on today?') + '</h1><p class="tp-sub">' + esc(nice(t, true)) + '. Confirmed cakes only.</p>' + (K.loaded ? freshLine(K.at, K.fails, 'k-reload') : '') + '</div>' +
      '<div class="ccs-chips ccs-segs kw-modes" role="group" aria-label="Kitchen view">' + KMODES.map(function (m) { return '<button type="button" class="ccs-chip" data-act="k-mode" data-v="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div></div>';
    if (mode === 'cal') return h + kitCalView();
    if (mode === 'hand') { if (!S.ho || (!S.ho.loaded && !S.ho.loading && !S.ho.err)) setTimeout(hoLoad, 0); return h + handoverView(true); }
    if (!K.loaded) return h + (K.err ? loadErr(K.err, 'k-reload') : '<p class="ccs-loading">Loading the kitchen board…</p>');
    return h + (mode === 'board' ? kitBoardView() : kitTodayView());
  }
  function kitTodayView() {
    var K = S.kit, t = today(), all = K.data.orders || [], wk = addDays(t, 6);
    var nowH = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: 'numeric', hour12: false }).format(new Date()).replace(':', '.'));
    var open = all.filter(function (r) { return r.status === 'confirmed'; });
    var mk = open.filter(function (r) { return r.date <= t && r.stage !== 'ready'; }), rdy = open.filter(function (r) { return r.stage === 'ready'; }), soon = open.filter(function (r) { return r.date > t; });
    var hr = function (r) { var p = String(r.time || '23:59').split(':'); return Number(p[0]) + Number(p[1] || 0) / 100; };
    var near = mk.filter(function (r) { return r.date < t || hr(r) - nowH <= 3; });
    var h = resumeCard(['ho']);
    if (near.length) h += '<div class="tp-urgent" role="status"><button type="button" class="tp-urg" data-act="k-card" data-v="today"><b>!</b><span>' + near.length + (near.length === 1 ? ' cake is late or due in the next 3 hours and is' : ' cakes are late or due in the next 3 hours and are') + ' not ready yet.</span><em>View</em></button></div>';
    // Next priority: the most urgent cake that still needs work, with the one button that moves it on
    var todo = open.filter(function (r) { return r.stage !== 'ready' && r.date <= wk; }).sort(kitSort), np = todo[0];
    var kc = function (v, title, count) { return '<button type="button" class="kw-count kp-act" data-act="k-card" data-v="' + v + '"><b>' + title + '</b><em>' + count + '</em></button>'; };
    h += '<div class="kw-main"><div class="kw-top">';
    if (np) {
      var why = kitWhy(np);
      h += '<section class="kw-next" aria-label="Next priority"><p class="kw-label">Next priority</p>' +
        '<button type="button" class="kw-nextbody" data-act="open-kitchen" data-id="' + np.id + '"><span class="kw-nstage">' + esc(kitStageText(np)) + (np.late ? ' · Late' : '') + '</span>' +
        '<b class="kw-ncake">' + esc(kitCake(np)) + '</b>' +
        '<span class="kw-nwhen">' + esc(whenLabel(np.date)) + ', ' + esc(t12(np.time)) + ' · ' + (np.method === 'delivery' ? 'Delivery' + (np.area ? ', ' + esc(np.area) : '') : 'Collection') + '</span>' +
        (np.message ? '<span class="kw-nmsg">Writing on the cake: “' + esc(np.message) + '”</span>' : '') +
        '<span class="kw-nsub">' + esc(np.reference) + ' · ' + esc(np.customer || '') + '</span>' +
        (kitFlags(np) || why.length ? '<span class="ccs-tags">' + kitFlags(np) + why.filter(function (x) { return x !== 'Late' && x !== 'Waiting for quality check'; }).map(function (x) { return '<span class="ccs-pill s-flag">' + esc(x) + '</span>'; }).join('') + '</span>' : '') + '</button>' +
        (np.status === 'confirmed' ? slipBox(np.id, true) : '') + '<div class="kw-nacts">' + kitNextAction(np, 'kw-nbtn') + '<button type="button" class="ccs-btn ccs-ghost" data-act="open-kitchen" data-id="' + np.id + '">Open details</button></div></section>';
    } else h += '<section class="kw-next is-clear" aria-label="Next priority"><p class="kw-label">Next priority</p><b class="kw-ncake">Nothing to make right now.</b><span class="kw-nsub">Every confirmed cake for the next 7 days is ready or handed over.</span></section>';
    h += '<div class="kw-counts" role="group" aria-label="Counts">' +
      kc('today', 'To make today', mk.length ? mk.length + (mk.length === 1 ? ' cake' : ' cakes') : 'None left') +
      kc('ready', 'Ready to hand over', rdy.length ? rdy.length + (rdy.length === 1 ? ' cake' : ' cakes') : 'None waiting') +
      kc('soon', 'Coming up, next 7 days', soon.length ? soon.length + (soon.length === 1 ? ' cake' : ' cakes') : 'Nothing booked') + '</div></div>';
    // Sections answer: needs attention, in progress, due next. Empty sections are left out.
    var used = {}; if (np) used[np.id] = 1;
    var att = open.filter(function (r) { return !used[r.id] && r.date <= wk && kitWhy(r).length; }).sort(kitSort);
    att.forEach(function (r) { used[r.id] = 1; });
    var prog = open.filter(function (r) { return !used[r.id] && ['preparing', 'baking', 'assembling', 'decorating', 'in_production'].indexOf(r.stage) > -1; }).sort(kitSort);
    prog.forEach(function (r) { used[r.id] = 1; });
    var next = open.filter(function (r) { return !used[r.id] && r.stage !== 'ready' && r.date <= wk; }).sort(kitSort);
    var sec = function (cls, title, list, withWhy, more) { return list.length ? '<section class="kw-sec ' + cls + '"><h2>' + title + ' <span>' + list.length + '</span></h2><div class="kw-lines">' + list.slice(0, more || 50).map(function (r) { return kitLine(r, withWhy ? kitWhy(r) : null); }).join('') + '</div>' + (more && list.length > more ? '<button type="button" class="ccs-link kw-more" data-act="k-mode" data-v="board">See all ' + list.length + ' on the board</button>' : '') + '</section>' : ''; };
    h += '<div class="kw-secs">' + sec('kw-att', 'Needs attention', att, true) + sec('kw-prog', 'In progress', prog) + sec('kw-due', 'Due next', next, false, 6) + '</div></div>';
    // Later this week: a day strip that opens the calendar on that day
    var days = []; for (var i = 1; i < 7; i++) days.push(addDays(t, i));
    var per = {}; open.forEach(function (r) { if (r.date > t && r.date <= wk) per[r.date] = (per[r.date] || 0) + 1; });
    if (soon.length) h += '<section class="kw-sec kw-week"><h2>Later this week</h2><div class="kw-days">' + days.map(function (d) {
      var n = per[d] || 0; return '<button type="button" class="kw-day' + (n ? '' : ' is-zero') + '" data-act="k-cal-day" data-v="' + d + '"><span>' + esc(nice(d).split(' ')[0]) + ' ' + Number(d.slice(8)) + '</span><b>' + (n || '–') + '</b><em>' + (n ? (n === 1 ? 'cake' : 'cakes') : 'none') + '</em></button>';
    }).join('') + '</div></section>';
    if (!all.length) h += '<div class="ccs-empty"><b>No confirmed cakes in the next 7 days.</b><span>Cakes appear here once the counter confirms them.</span></div>';
    return h;
  }
  function kitBoardView() {
    var K = S.kit, t = today();
    var h = '<div class="kw-tools"><div class="ccs-chips ccs-segs" role="group" aria-label="Range">' + [[2, 'Today and tomorrow'], [7, 'Next 7 days']].map(function (c) { return '<button type="button" class="ccs-chip" data-act="k-range" data-v="' + c[0] + '" aria-pressed="' + (K.days === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="ccs-chip ccs-kdone-chip" data-act="k-done" aria-pressed="' + !!K.showDone + '">Show handed over</button></div>';
    var all = K.data.orders || [], lastDay = addDays(t, K.days - 1);
    var rows = all.filter(function (r) { return r.date <= lastDay && (!K.focus || (r.date <= t && r.status === 'confirmed' && r.stage !== 'ready')); });
    if (K.focus) h += '<p class="kp-focus">Showing cakes to make today, including late ones. <button type="button" class="ccs-link" data-act="k-focus-off">Show all</button></p>';
    var groups = {}; KCOLS.forEach(function (c) { groups[c[0]] = []; });
    rows.forEach(function (r) {
      if (r.status === 'completed') return groups.done.push(r);
      for (var i = 0; i < 4; i++) if (KCOLS[i][2].indexOf(r.stage) > -1) return groups[KCOLS[i][0]].push(r);
      groups.start.push(r);
    });
    if (!rows.length) return h + '<div class="ccs-empty"><b>No confirmed cakes in this range.</b><span>Cakes appear here once the counter confirms them.</span></div>';
    // Phones: one column at a time. Larger screens: columns side by side; an empty column shrinks to a narrow strip
    var curK = secCur('kitP', KCOLS.map(function (c) { return c[0]; }), groups.qc.length ? 'qc' : groups.prog.length ? 'prog' : 'start');
    h += '<div class="kp-bar">' + secBar('kitP', KCOLS.map(function (c) { return [c[0], c[1], groups[c[0]].length]; }), curK, 'Kitchen columns') + '</div>';
    h += '<div class="ccs-board kw-grow' + (K.showDone ? ' show-done' : '') + '">' + KCOLS.map(function (c) {
      var list = groups[c[0]];
      return '<section class="ccs-col ccs-col-' + c[0] + (c[0] === curK ? ' kp-cur' : '') + (list.length ? '' : ' is-empty') + '"><h2>' + c[1] + ' <span>' + list.length + '</span></h2><div class="ccs-colbody">' + (list.length ? list.map(kitCard).join('') : '<p class="ccs-quiet">Nothing here.</p>') + '</div></section>';
    }).join('') + '</div>';
    return h;
  }
  // ---------- kitchen calendar ----------
  var KCV = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']];
  var KCF = [['all', 'All cakes'], ['att', 'Needs attention'], ['allergy', 'Allergy'], ['custom', 'Custom'], ['delivery', 'Delivery']];
  function kitCalState() { var K = S.kit; if (!K.cal) K.cal = { v: 'week', a: today(), f: 'all', orders: null, key: '' }; return K.cal; }
  function kitCalRange(c) {
    if (c.v === 'day') return [c.a, 1];
    if (c.v === 'week') return [weekStart(c.a), 7];
    if (c.v === 'list') return [c.a, 14];
    var first = c.a.slice(0, 8) + '01'; return [weekStart(first), 42];
  }
  function kitCalLoad(force) {
    var c = kitCalState(), rg = kitCalRange(c), key = rg[0] + '|' + rg[1];
    if (!force && c.key === key && c.orders) return Promise.resolve();
    c.key = key; if (!force) { c.orders = null; c.err = null; }
    var calls = []; for (var o = 0; o < rg[1]; o += 14) calls.push(sb.rpc('kitchen_board', { p_from: addDays(rg[0], o), p_days: Math.min(14, rg[1] - o) }));
    var to = addDays(rg[0], rg[1] - 1);
    return Promise.all(calls).then(function (rs) {
      if (c.key !== key) return;
      var seen = {}, out = [];
      rs.forEach(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message); (r.data.orders || []).forEach(function (x) { if (!seen[x.id] && x.date >= rg[0] && x.date <= to) { seen[x.id] = 1; out.push(x); } }); });
      c.orders = out; c.err = null; c.at = Date.now();
      if (S.tab === 'kitchen' && kitMode() === 'cal') view();
      if (S.sheet && S.sheet.type === 'kitchen') renderSheet();
    }).catch(function (e) {
      console.error(e); if (c.key !== key) return;
      if (errKind(e) === 'expired') return sessionExpired();
      if (!c.orders) c.err = errKind(e) === 'offline' ? 'No internet connection, so we couldn\'t load the calendar.' : 'We couldn\'t load the calendar. Try again.';
      if (S.tab === 'kitchen' && kitMode() === 'cal') view();
    });
  }
  function kitCalMatch(r, f) {
    if (f === 'att') return kitWhy(r).length > 0;
    if (f === 'allergy') return !!r.has_dietary;
    if (f === 'custom') return r.finish === 'custom';
    if (f === 'delivery') return r.method === 'delivery';
    return true;
  }
  // Only as many week rows as the month needs (5 or 6), so the grid fits the screen
  function kitMonthCells(c) { var first = c.a.slice(0, 8) + '01', nx = new Date(first + 'T12:00:00Z'); nx.setUTCMonth(nx.getUTCMonth() + 1); var last = addDays(nx.toISOString().slice(0, 10), -1); return Math.round(((new Date(last + 'T12:00:00Z') - new Date(weekStart(first) + 'T12:00:00Z')) / 864e5 + 1 + 6 - dow(last)) / 7) * 7; }
  function kitCalTitle(c) {
    if (c.v === 'day') return nice(c.a, true);
    if (c.v === 'month') return MONTHS[+c.a.slice(5, 7) - 1] + ' ' + c.a.slice(0, 4);
    var rg = kitCalRange(c), a = rg[0], b = addDays(a, rg[1] - 1);
    var d = function (x, y) { return Number(x.slice(8)) + ' ' + MONTHS[+x.slice(5, 7) - 1] + (y ? ' ' + x.slice(0, 4) : ''); };
    return d(a, a.slice(0, 4) !== b.slice(0, 4)) + ' to ' + d(b, true);
  }
  // A short chip inside a calendar day: time, cake, and what needs care
  function kitChip(r) {
    var marks = [];
    if (r.late) marks.push('Late'); if (r.has_dietary) marks.push('Allergy'); if (r.finish === 'custom' && !/^Custom cake/.test(kitCake(r))) marks.push('Custom'); if (r.stage === 'quality_check') marks.push('QC');
    var tone = r.status === 'completed' ? ' is-done' : r.stage === 'ready' ? ' is-ready' : r.late ? ' is-late' : '';
    return '<button type="button" class="kc-chip' + tone + '" data-act="open-kitchen" data-id="' + r.id + '"><span class="kc-t">' + esc(t12(r.time)) + '</span><b>' + esc(kitCake(r)) + '</b><span class="kc-s">' + esc(kitStageText(r)) + (marks.length ? ' · ' + esc(marks.join(', ')) : '') + '</span></button>';
  }
  function kitCalView() {
    var c = kitCalState(), t = today();
    var h = '<div class="kc-bar"><div class="kc-nav"><button type="button" class="ccs-btn ccs-ghost kc-arrow" data-act="k-cal-move" data-v="-1" aria-label="Earlier">‹</button><button type="button" class="ccs-btn ccs-ghost" data-act="k-cal-today">Today</button><button type="button" class="ccs-btn ccs-ghost kc-arrow" data-act="k-cal-move" data-v="1" aria-label="Later">›</button><h2 class="kc-title">' + esc(kitCalTitle(c)) + '</h2></div>' +
      '<div class="ccs-chips ccs-segs" role="group" aria-label="Calendar view">' + KCV.map(function (x) { return '<button type="button" class="ccs-chip" data-act="k-cal-view" data-v="' + x[0] + '" aria-pressed="' + (c.v === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="ccs-chips kc-filters" role="group" aria-label="Show">' + KCF.map(function (x) { return '<button type="button" class="ccs-chip" data-act="k-cal-f" data-v="' + x[0] + '" aria-pressed="' + (c.f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var rg = kitCalRange(c);
    if (c.key !== rg[0] + '|' + rg[1] || (!c.orders && !c.err)) { if (c.key !== rg[0] + '|' + rg[1]) setTimeout(function () { kitCalLoad(); }, 0); return h + '<p class="ccs-loading">Loading the calendar…</p>'; }
    if (c.err) return h + loadErr(c.err, 'k-cal-reload');
    var by = {}; c.orders.filter(function (r) { return kitCalMatch(r, c.f); }).sort(function (a, b) { return String(a.time || '').localeCompare(String(b.time || '')); }).forEach(function (r) { (by[r.date] = by[r.date] || []).push(r); });
    var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var cnt = function (n) { return n ? n + (n === 1 ? ' cake' : ' cakes') : ''; };
    if (c.v === 'day') {
      var list = by[c.a] || [];
      return h + (list.length ? '<div class="kw-lines kc-daylist">' + list.map(function (r) { return kitLine(r, kitWhy(r)); }).join('') + '</div>' : '<div class="ccs-empty"><b>No cakes on this day' + (c.f !== 'all' ? ' for this filter' : '') + '.</b></div>');
    }
    if (c.v === 'list') {
      var ds = Object.keys(by).sort();
      return h + (ds.length ? ds.map(function (d) { return '<section class="kw-sec kc-agenda"><h2>' + esc(d === t ? 'Today, ' + nice(d) : whenLabel(d) === 'Tomorrow' ? 'Tomorrow, ' + nice(d) : nice(d, true)) + ' <span>' + by[d].length + '</span></h2><div class="kw-lines">' + by[d].map(function (r) { return kitLine(r, kitWhy(r)); }).join('') + '</div></section>'; }).join('') : '<div class="ccs-empty"><b>No cakes in the next 14 days' + (c.f !== 'all' ? ' for this filter' : '') + '.</b></div>');
    }
    if (c.v === 'week') {
      return h + '<div class="kc-week">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
        var d = addDays(rg[0], i), list = by[d] || [];
        return '<section class="kc-wday' + (d === t ? ' is-today' : '') + (d < t ? ' is-past' : '') + (list.length ? '' : ' is-empty') + '"><button type="button" class="kc-whead" data-act="k-cal-day" data-v="' + d + '"><span>' + WD[i] + '</span><b>' + Number(d.slice(8)) + '</b><em>' + cnt(list.length) + '</em></button><div class="kc-wbody">' + list.map(kitChip).join('') + '</div></section>';
      }).join('') + '</div>';
    }
    var mon = c.a.slice(0, 7);
    return h + '<div class="kc-month"><div class="kc-mhead">' + WD.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div><div class="kc-mgrid">' + Array.apply(null, Array(kitMonthCells(c))).map(function (_, i) {
      var d = addDays(rg[0], i), list = by[d] || [], al = list.filter(function (r) { return r.has_dietary; }).length, cu = list.filter(function (r) { return r.finish === 'custom'; }).length, lt = list.filter(function (r) { return r.late; }).length;
      var marks = [lt ? lt + ' late' : '', al ? al + ' allergy' : '', cu ? cu + ' custom' : ''].filter(Boolean).join(' · ');
      var show = list.length > 4 ? list.slice(0, 3) : list;
      var bars = show.map(function (r) {
        var tone = r.status === 'completed' || r.stage === 'ready' ? ' is-done' : r.late ? ' is-late' : ['not_started', 'scheduled'].indexOf(r.stage) > -1 ? ' is-todo' : '';
        var m = (reqShort(r).length ? ' · ' + reqShort(r).join(', ') : '') + (r.has_dietary ? ' · Allergy' : '') + (r.finish === 'custom' && !/^Custom cake/.test(kitCake(r)) ? ' · Custom' : '');
        return '<button type="button" class="kc-mbar' + tone + '" data-act="open-kitchen" data-id="' + r.id + '" title="' + esc(t12(r.time) + ' ' + kitCake(r) + ' · ' + kitStageText(r) + m) + '"><span class="kc-mt">' + esc(t12(r.time).replace(':00', '')) + '</span> ' + esc(kitCake(r)) + (m ? '<i>' + esc(m) + '</i>' : '') + '</button>';
      }).join('');
      return '<div class="kc-mday' + (d.slice(0, 7) !== mon ? ' is-out' : '') + (d === t ? ' is-today' : '') + (d < t ? ' is-past' : '') + (list.length ? ' has' : '') + (lt ? ' is-late' : '') + '">' +
        '<button type="button" class="kc-mdate" data-act="k-cal-day" data-v="' + d + '" aria-label="' + esc(nice(d, true) + (list.length ? ', ' + cnt(list.length) : '')) + '"><span class="kc-dn">' + Number(d.slice(8)) + '</span>' + (list.length ? '<b>' + cnt(list.length) + '</b>' + (marks ? '<em>' + esc(marks) + '</em>' : '') : '') + '</button>' +
        (list.length ? '<div class="kc-mbars">' + bars + (list.length > show.length ? '<button type="button" class="kc-mmore" data-act="k-cal-day" data-v="' + d + '">+' + (list.length - show.length) + ' more</button>' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  function openKitchen(id, again) {
    if (again) { S.sheet.kerr = false; renderSheet(); } else { S.sheet = { type: 'kitchen', id: id, photos: [] }; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet(); }
    var go = function () {
      var r = kitRow(id); renderSheet();
      if (r && r.photos && r.photos.length) sb.storage.from('cake-references').createSignedUrls(r.photos, 3600).then(function (u) { if (u.data && S.sheet && S.sheet.id === id) { S.sheet.photos = u.data.map(function (x) { return x.signedUrl; }).filter(Boolean); renderSheet(); } });
    };
    if (kitRow(id)) go(); else { var keep = S.kit.days, f0 = S.kit.fails || 0; if (keep < 7) S.kit.days = 7; loadKitchen(true).then(function () { S.kit.days = keep; if (S.sheet && S.sheet.id === id) S.sheet.kerr = (S.kit.fails || 0) > f0; go(); }); }
  }
  // ---------- amend an order ----------
  function amendInit(o) {
    var i = (o.order_items || [])[0] || {}, c = o.customers || {}, pr = (S.setup.products || []).filter(function (p) { return p.name === i.product_name; })[0];
    var v = { date: o.required_date, time: String(o.required_time).slice(0, 5), product: pr ? pr.code : '', variant: i.variant || '', size: String(i.size_inch || ''), qty: String(i.quantity || 1),
      finish: i.finish || 'standard', design: i.design_description || '', message: i.cake_message || '', occasion: i.occasion || '', diet: o.has_dietary ? 'yes' : 'no',
      diets: (i.dietary || []).slice(), dietNote: i.dietary_note || '', reqs: (i.requirements || []).slice(), reqNote: i.requirements_note || '', reqs0: (i.requirements || []).join('|') + '#' + (i.requirements_note || ''), knotes: i.kitchen_notes || '', cnotes: o.customer_notes || '', cname: c.full_name || '', cemail: c.email || '', cphone: c.phone || '', price: '',
      method: o.fulfilment_method === 'delivery' ? 'delivery' : 'collection', zone: o.delivery_zone || '', address: o.delivery_address || '', dcontact: o.delivery_contact || '',
      fee: String(Number(o.delivery_fee || 0)), candles: i.candles || '', deposit: o.deposit_required != null ? String(Number(o.deposit_required)) : '' };
    return Object.assign({ orig: JSON.parse(JSON.stringify(v)), by: null, reason: '', preview: null, open: { when: true } }, v);
  }
  function amendSet(f, v) {
    var a = S.am; a[f] = v; a.preview = null;
    // a delivery area with a set fee fills the fee in; staff can still type a different amount
    if (f === 'zone') { var zz = ((S.setup && S.setup.delivery_zones) || []).filter(function (x) { return x.name === v; })[0]; if (zz && zz.fee != null) a.fee = String(Number(zz.fee)); }
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
    // Collection or delivery: a switch to delivery sends the whole address so the server can check it
    if (a.method !== o0.method) { ch.method = a.method; if (a.method === 'delivery') { ch.zone = a.zone; ch.address = a.address; ch.delivery_contact = a.dcontact; ch.fee = a.fee; } }
    else if (a.method === 'delivery') {
      if (a.zone !== o0.zone) ch.zone = a.zone;
      if (a.address !== o0.address) ch.address = a.address;
      if (a.dcontact !== o0.dcontact) ch.delivery_contact = a.dcontact;
      if (String(a.fee).trim() !== String(o0.fee).trim()) ch.fee = String(a.fee).trim() === '' ? null : num(a.fee);
    }
    if (a.candles !== o0.candles) ch.candles = a.candles;
    if (String(a.deposit).trim() !== String(o0.deposit).trim()) ch.deposit_required = String(a.deposit).trim() === '' ? 0 : num(a.deposit);
    return ch;
  }
  function dietMissing(diet, diets, note) {
    if (diet !== 'yes') return null;
    var n = (note || '').trim().length;
    if (!diets.length && n < 3) return 'Choose the dietary need or allergy, or write the details for the kitchen.';
    if (diets.indexOf('Other') > -1 && n < 3) return 'You chose Other: write the dietary details for the kitchen.';
    return null;
  }
  function amendSend(commit) {
    var o = S.sheet.data, a = S.am, ch = amendChanges();
    var reqChanged = (a.reqs || []).join('|') + '#' + (a.reqNote || '') !== a.reqs0;
    if ((a.reqs || []).indexOf('other') > -1 && !(a.reqNote || '').trim()) { S.panelErr = 'Say what the other cake requirement is.'; return renderSheet(); }
    // Only the cake requirements changed: saved straight away and kept in the history
    if (!Object.keys(ch).length && reqChanged) {
      if (S.busy) return; S.busy = true; S.panelErr = null;
      sb.rpc('order_set_requirements', { p_order: o.id, p_reqs: a.reqs || [], p_note: a.reqNote || '' }).then(function (r) {
        S.busy = false; if (r.error) throw r.error;
        if (!r.data.ok) { S.panelErr = r.data.message; return renderSheet(); }
        S.panel = null; S.am = null; toast('Cake requirements saved' + (o.brief_version ? '. Print a new kitchen slip.' : '')); reloadOrderKeep(o.id); loadOrders(true);
      }).catch(function (e) { S.busy = false; fail(e); });
      return;
    }
    if (!Object.keys(ch).length) { S.panelErr = 'Nothing has changed yet.'; return renderSheet(); }
    if (!a.by) { S.panelErr = 'Choose who asked for the change.'; return renderSheet(); }
    if (a.reason.trim().length < 3) { S.panelErr = 'Add a short reason for the change.'; return renderSheet(); }
    var dm_ = dietMissing(a.diet, a.diets, a.dietNote); if (dm_) { S.panelErr = dm_; return renderSheet(); }
    if (S.busy) return; S.busy = true; S.panelErr = null;
    sb.rpc('staff_amend_order', { p_order: o.id, p_version: o.version, p_changes: ch, p_requested_by: a.by, p_reason: a.reason.trim(), p_commit: !!commit }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) {
        S.panelErr = r.data.message;
        if (r.data.error === 'changed') { a.preview = null; S.panelErr = CONFLICT; return reloadOrderKeep(o.id); }
        return renderSheet();
      }
      if (!commit) { a.preview = r.data; renderSheet(); var bd = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (bd) bd.scrollTop = 0; return; }
      if ((a.reqs || []).join('|') + '#' + (a.reqNote || '') !== a.reqs0) sb.rpc('order_set_requirements', { p_order: o.id, p_reqs: a.reqs || [], p_note: a.reqNote || '' }).then(function (x) { if (x.error || (x.data && !x.data.ok)) toast('Cake requirements were not saved' + (x.data && x.data.message ? ': ' + x.data.message : '.'), true); });
      var msg = 'Saved as revision ' + r.data.revision + '.';
      if (r.data.kitchen_ack_required) msg += ' The kitchen is asked to confirm the change.';
      if (r.data.needs_reprint) msg += ' Print the new kitchen slip.';
      if (['confirmed', 'awaiting_deposit'].indexOf(o.order_status) > -1 && (o.contact_email || (ch.contact_email))) S.askUpdate = o.id;
      wipPut('am:' + o.id, null); S.am = null; S.panel = null; S.dirty = {}; toast(msg); openOrder(o.id); loadOrders(true);
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
    var zones = (S.setup && S.setup.delivery_zones) || [], zNow = zones.filter(function (x) { return x.name === a.zone; })[0];
    h += sec('deliv', 'Collection or delivery', a.method === 'delivery' ? 'Delivery' + (a.zone ? ' to ' + a.zone : '') + ' · ' + money(num(a.fee) || 0) : 'Collect from the café',
      '<div class="ccs-chips">' + chip('method', 'collection', 'Collect from the café', a.method === 'collection') + chip('method', 'delivery', 'Delivery', a.method === 'delivery') + '</div>' +
      (a.method === 'delivery' ? '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="am-zone">Delivery area</label><select class="ccs-input" id="am-zone" data-am="zone"><option value="">Choose an area</option>' +
        zones.map(function (x) { return '<option value="' + esc(x.name) + '"' + (x.name === a.zone ? ' selected' : '') + '>' + esc(x.name) + (x.fee != null ? ' (' + money(Number(x.fee)) + ')' : '') + '</option>'; }).join('') + '</select></div>' +
        fld('am-fee', 'fee', 'Delivery fee (FJD)', a.fee, ' inputmode="decimal" style="max-width:180px"') + '</div>' +
        (zNow && zNow.fee != null && num(a.fee) !== Number(zNow.fee) ? '<p class="ccs-hint">The usual fee for ' + esc(zNow.name) + ' is ' + money(Number(zNow.fee)) + '. The change history records both.</p>' : '') +
        area('am-addr', 'address', 'Delivery address', a.address) + fld('am-dcontact', 'dcontact', 'Who receives it (optional)', a.dcontact) : ''));
    if (isReq((o.order_items || [])[0])) h += '<p class="ccs-hint">Custom cake: change its flavour, size or price with Change the price on the order' + (OPEN.indexOf(o.order_status) > -1 && ['awaiting_review','awaiting_quote','awaiting_approval'].indexOf(o.order_status) > -1 ? '' : ' (before it is confirmed)') + '.</p>';
    else {
    h += sec('cake', 'Cake, size and quantity', (a.variant || (p ? p.name : 'Cake')) + ', ' + (a.size || '?') + ' inch' + (a.qty !== '1' ? ' × ' + a.qty : ''),
      '<div class="ccs-field"><label class="ccs-label" for="am-prod">Cake</label><select class="ccs-input" id="am-prod" data-act-change="product">' + (p ? '' : '<option value="">Choose a cake</option>') + (S.setup.products || []).map(function (x) { return '<option value="' + esc(x.code) + '"' + (x.code === a.product ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
      (p && p.variants.length ? '<div class="ccs-field"><span class="ccs-label">' + esc(p.choice_label || 'Which one?') + '</span><div class="ccs-chips">' + p.variants.map(function (x) { return chip('variant', x, x, a.variant === x); }).join('') + '</div></div>' : '') +
      (p ? '<div class="ccs-field"><span class="ccs-label">Size</span><div class="ccs-chips">' + p.sizes.map(function (z) { return chip('size', String(z.inch), z.inch + ' inch · ' + money(z.price), a.size === String(z.inch)); }).join('') + '</div></div>' : '') +
      fld('am-qty', 'qty', 'Quantity', a.qty, ' type="number" min="1" max="50" inputmode="numeric" style="max-width:140px"'));
    }
    h += sec('look', 'Design and message', (a.finish === 'custom' ? 'Custom design' : 'Standard finish') + (a.message ? ' · “' + a.message + '”' : ''),
      '<div class="ccs-chips">' + chip('finish', 'standard', 'Standard finish', a.finish === 'standard') + (!p || p.supports_custom ? chip('finish', 'custom', 'Custom design', a.finish === 'custom') : '') + '</div>' +
      (a.finish === 'custom' || a.design ? area('am-design', 'design', 'Design', a.design) : '') +
      fld('am-msg', 'message', 'Message on the cake', a.message, ' maxlength="60"') +
      fld('am-cand', 'candles', 'Candles', a.candles, ' maxlength="60" placeholder="For example: number 30 candle"') +
      '<div class="ccs-field"><label class="ccs-label" for="am-occ">Occasion</label><select class="ccs-input" id="am-occ" data-am="occasion"><option value="">Customer didn\'t say</option>' + (a.occasion && OCCASIONS.indexOf(a.occasion) < 0 ? '<option value="' + esc(a.occasion) + '" selected>' + esc(a.occasion) + (['Baby shower', 'Graduation'].indexOf(a.occasion) < 0 ? ' (Other)' : '') + '</option>' : '') + OCCASIONS.map(function (x) { return '<option value="' + esc(x) + '"' + (x === a.occasion ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>');
    h += sec('diet', 'Requirements and allergies', [reqShort({ requirements: a.reqs || [], requirements_note: a.reqNote }).join(', '), a.diet === 'yes' ? 'Allergy: ' + ([].concat(a.diets, a.dietNote ? [a.dietNote] : []).join(', ') || 'yes') : 'No allergies'].filter(Boolean).join(' · '),
      reqHtml(a, 'am') + '<div class="ccs-chips">' + chip('diet', 'no', 'No', a.diet === 'no') + chip('diet', 'yes', 'Yes', a.diet === 'yes') + '</div>' +
      (a.diet === 'yes' ? '<div class="ccs-chips">' + DIETS.map(function (x) { return '<button type="button" class="ccs-chip" data-act="am-diet" data-v="' + esc(x) + '" aria-pressed="' + (a.diets.indexOf(x) > -1) + '">' + esc(x) + '</button>'; }).join('') + '</div>' + fld('am-dnote', 'dietNote', 'Details for the kitchen', a.dietNote) : ''));
    h += sec('notes', 'Kitchen instructions and notes', a.knotes || a.cnotes ? 'Has notes' : 'None',
      area('am-knotes', 'knotes', 'Kitchen instructions', a.knotes, 'Filling, frosting, extras') + area('am-cnotes', 'cnotes', 'Order notes', a.cnotes));
    h += sec('cust', 'Contact on this order', a.cname + (a.cphone ? ' · ' + a.cphone : '') + (a.cemail ? ' · ' + a.cemail : ''),
      '<div class="ccs-row">' + fld('am-cname', 'cname', 'Name', a.cname) + fld('am-cphone', 'cphone', 'Mobile', a.cphone, ' inputmode="tel"') + '</div>' + fld('am-cemail', 'cemail', 'Email', a.cemail, ' type="email"') +
      '<p class="ccs-hint">Changes this order only. The customer profile stays as it is. To change the profile, open Customer profile.</p>');
    var depOk = o.order_status === 'awaiting_deposit' || o.order_status === 'confirmed';
    // Menu cakes keep the price list (a manager can still change it); custom cake prices are agreed, so staff can change them
    var priceOk = a.finish === 'custom' || isReq((o.order_items || [])[0]) || canP('ord.override');
    if (priceOk || depOk) h += sec('price', depOk ? 'Price and deposit' : 'Agreed price', (a.price ? money(num(a.price)) + ' (set by you)' : money(total) + ' now') + (depOk && a.deposit && num(a.deposit) ? ' · deposit ' + money(num(a.deposit)) : ''),
      (priceOk ? fld('am-price', 'price', 'New agreed price (FJD)', a.price, ' inputmode="decimal" placeholder="Leave blank to recalculate from the price list"') : '<p class="ccs-hint">Menu cakes use the price list.</p>') +
      (depOk ? fld('am-dep', 'deposit', 'Deposit required (FJD)', a.deposit, ' inputmode="decimal" placeholder="Blank or 0 for no deposit" style="max-width:220px"') : '') +
      '<p class="ccs-hint">Payments already recorded are never changed.</p>');
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
    if (r.needs_reprint) h += '<p class="ccs-note">A kitchen slip was printed. Print the new version after saving and throw the old one away.</p>';
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
    if (!r && S.sheet.kerr) return sheetHead('Cake') + '<div class="ccs-sheet-body">' + loadErr(S.kit.err || 'We couldn\'t load the kitchen board. Try again.', 'k-reopen') + '</div>';
    if (!r) return sheetHead('Loading…') + '<div class="ccs-sheet-body"><p class="ccs-loading">' + (S.kit.loaded ? 'This cake is not on the kitchen board. Only confirmed cakes due in the next 7 days, or late ones, are shown.' : 'Loading…') + '</p></div>';
    var idx = stageIndex(r.stage), done = r.status === 'completed', err = S.panelErr ? '<p class="ccs-err">' + esc(S.panelErr) + '</p>' : '';
    var h = sheetHead(esc(r.reference), stagePill(r.stage)) + '<div class="ccs-sheet-body">';
    if (r.late) h += '<div class="ccs-alert">Running late: due ' + esc(whenLabel(r.date)) + ' at ' + esc(t12(r.time)) + '.</div>';
    if ((r.requirements || []).length) h += '<div class="ccs-must"><span>Must be</span><b>' + esc(reqList(r).join(' · ')) + '</b></div>';
    if (r.has_dietary) h += '<div class="ccs-alert">Allergy: ' + esc([].concat(r.dietary || [], r.dietary_note ? [r.dietary_note] : []).join(', ') || 'see notes') + '</div>';
    if (r.amend_pending && r.amend_pending.length) h += kitAckBox(r, err);
    if (r.brief_changed) h += '<p class="ccs-note">Details changed after slip v' + r.brief_version + ' was printed. Ask the counter to print v' + (r.brief_version + 1) + '.</p>';
    if (!done && r.stage !== 'ready') h += slipBox(r.id, true);
    // progress
    h += '<section class="ccs-box"><h3>Progress</h3><ol class="ccs-kstages">' + STAGES.map(function (s, i) { return '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-now' : '') + '">' + esc(s[1]) + '</li>'; }).join('') + '</ol>';
    if (done) h += '<p class="ccs-hint">Handed over' + (r.handed_over_at ? ' ' + esc(stamp(r.handed_over_at)) : '') + '. Checked by ' + esc(r.qc_by || '—') + '.</p>';
    else if (r.stage === 'ready') h += '<p class="ccs-hint">Ready since ' + esc(stamp(r.ready_at)) + ', checked by ' + esc(r.qc_by) + '. The counter hands it over from the order screen.</p>' + err +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="k-stage" data-v="quality_check">Back to quality check</button></div>';
    else if (r.stage === 'quality_check') h += '<div class="ccs-panel"><b>Quality check</b><p class="ccs-hint">Flavour and size right, message spelled exactly, design matches, dietary needs followed, clean finish and box.</p><div class="ccs-field"><label class="ccs-label" for="k-qc">Checked by</label><input class="ccs-input" id="k-qc" placeholder="Your name" autocomplete="off">' + nameChips('k-qc') + '</div>' + err +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="k-ready">Passed, mark Ready</button><button type="button" class="ccs-btn ccs-ghost" data-act="k-stage" data-v="decorating">Back to decorating</button></div></div>';
    else {
      var nx = STAGES[idx + 1];
      h += err + '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good ccs-wide" data-act="k-stage" data-v="' + nx[0] + '">' + esc(stageJob(nx)) + '</button></div>' +
        '<div class="ccs-field"><span class="ccs-label">Or set the stage</span><div class="ccs-chips">' + STAGES.slice(0, 7).map(function (s) { return '<button type="button" class="ccs-chip" data-act="k-stage" data-v="' + s[0] + '" aria-pressed="' + (r.stage === s[0]) + '">' + esc(s[1]) + '</button>'; }).join('') + '</div></div>';
    }
    if (!done) h += '<div class="ccs-row" style="align-items:end"><div class="ccs-field"><label class="ccs-label" for="k-who">Made by</label><input class="ccs-input" id="k-who" value="' + esc(r.assignee || '') + '" placeholder="Name of the baker" autocomplete="off"></div><button type="button" class="ccs-btn ccs-ghost" data-act="k-assign">Save name</button></div>' + nameChips('k-who');
    h += '</section>';
    // the cake
    h += '<section class="ccs-box"><h3>Cake</h3><p class="ccs-big">' + esc(kitCake(r)) + '</p>' + (r.message ? '<p class="ccs-kmsg">“' + esc(r.message) + '”</p>' : '') + '<dl class="ccs-kv">' +
      kv('Finish', r.finish === 'custom' ? 'Custom design' : 'Standard finish') + kv('Design', r.design) + kv('Occasion', r.occasion) + kv('Serves', r.serves) + kv('Order notes', r.order_notes) + kv('Kitchen notes', r.kitchen_notes) + '</dl>' +
      '</section>' + refGallery(S.sheet.photos, { loading: !!(r.photos && r.photos.length) });
    h += '<section class="ccs-box"><h3>' + (r.method === 'delivery' ? 'Delivery' : 'Collection') + '</h3><p class="ccs-big">' + esc(nice(r.date, true)) + ' at ' + esc(t12(r.time)) + '</p><dl class="ccs-kv">' + kv('For', r.customer) + kv('Area', r.method === 'delivery' ? r.area : 'Café counter') + kv('Short notice', r.rush ? 'Yes' : '') + '</dl></section>';
    return h + '</div>';
  }
  function kitStage(stage, qc, cardId, undo) {
    var id = cardId || S.sheet.id; if (S.busy) return clearBusy(); S.busy = true; S.panelErr = null;
    var row0 = kitRow(id), prev = row0 ? row0.stage : null;
    sb.rpc('kitchen_set_stage', { p_order: id, p_stage: stage, p_name: qc || null }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { if (S.sheet && !cardId) { S.panelErr = r.data.message; return renderSheet(); } return toast(r.data.message, true); }
      if (stage === 'ready') { delete S.dirty['k-qc']; rememberName(qc); }
      var row = kitRow(id); if (row) row.stage = stage;
      // Undo puts it back where it was (not to Ready, which needs the quality check name)
      var un = !undo && prev && prev !== stage && prev !== 'ready' && STAGE_LABEL[prev] ? { label: 'Undo', fn: function () { kitStage(prev, null, id, true); } } : null;
      toast(undo ? (row ? row.reference + ' moved back to ' : 'Moved back to ') + STAGE_LABEL[stage] : stage === 'ready' ? 'Marked Ready' : (row ? row.reference + ' moved to ' : 'Moved to ') + STAGE_LABEL[stage], false, un); loadKitchen(true); loadOrders(true);
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
  // Photos added to an order that already exists (for example, sent later on WhatsApp). Saved once every upload has finished.
  function orderPhotos(files) {
    var sh = S.sheet; if (!sh || sh.type !== 'order' || !sh.data) return;
    sh.addPh = sh.addPh || []; var id = sh.id, have = (sh.data.order_attachments || []).length;
    sh.phErr = phUpload(sh.addPh, files, 10 - have, function () {
      if (S.sheet !== sh) return;
      if (phBusy(sh.addPh)) return renderSheet();
      var ready = sh.addPh.filter(function (x) { return x.status === 'done' && !x.sent; });
      if (!ready.length) return renderSheet();
      ready.forEach(function (x) { x.sent = true; });
      sb.rpc('staff_add_photos', { p_order: id, p_paths: ready.map(function (x) { return x.path; }) }).then(function (r) {
        if (r.error) throw r.error;
        if (!r.data.ok) { ready.forEach(function (x) { x.sent = false; }); if (S.sheet === sh) { sh.phErr = r.data.message; renderSheet(); } return; }
        toast(r.data.added === 1 ? '1 photo added to ' + r.data.reference : r.data.added + ' photos added to ' + r.data.reference);
        S.phAdded = S.phAdded || {}; S.phAdded[id] = true;
        if (S.sheet === sh) openOrder(id);
      }).catch(function (e) { ready.forEach(function (x) { x.sent = false; }); fail(e); });
    });
    renderSheet();
  }

  // ---------- cake photo viewer: a large viewer over the order, so nothing typed on the order is lost ----------
  // Zoom (buttons, mouse wheel, pinch, double tap), drag to pan when zoomed, swipe or arrow keys between photos, Escape closes.
  // Photos keep their own proportions (never stretched or cropped). It sits outside the app's screens, so they are not redrawn.
  var LB = null;
  function lbEl() { return document.getElementById('ccs-lb'); }
  function lbBuild() {
    var el = document.createElement('div'); el.id = 'ccs-lb'; el.className = 'ccs-lb'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Cake design references');
    var fs = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    el.innerHTML = '<div class="lb-top"><span class="lb-count" aria-live="polite"></span><div class="lb-tools">' +
      '<button type="button" class="lb-btn" data-lb="out" aria-label="Zoom out">Zoom out</button><button type="button" class="lb-btn" data-lb="in" aria-label="Zoom in">Zoom in</button>' +
      '<button type="button" class="lb-btn" data-lb="fit">Fit to screen</button>' + (fs ? '<button type="button" class="lb-btn lb-fsbtn" data-lb="fs">Full screen</button>' : '') +
      '<button type="button" class="lb-btn lb-close" data-lb="close">Close</button></div></div>' +
      '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"><p class="lb-load" role="status">Loading photo…</p>' +
      '<div class="lb-err" hidden><p>We couldn\'t load this photo. Check the connection.</p><button type="button" class="lb-btn" data-lb="retry">Try again</button></div>' +
      '<button type="button" class="lb-nav lb-prev" data-lb="prev" aria-label="Previous photo">‹</button><button type="button" class="lb-nav lb-next" data-lb="next" aria-label="Next photo">›</button>' +
      '<span class="lb-zoom" aria-hidden="true"></span></div><div class="lb-strip" role="group" aria-label="All photos"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]'); if (!b || !LB) return;
      var a = b.dataset.lb;
      if (a === 'close') lbClose(); else if (a === 'prev') lbGo(LB.i - 1); else if (a === 'next') lbGo(LB.i + 1);
      else if (a === 'in') lbZoomBy(1.5); else if (a === 'out') lbZoomBy(1 / 1.5); else if (a === 'fit') lbSet(1, 0, 0, true);
      else if (a === 'fs') lbFull(); else if (a === 'retry') lbShow(true); else if (a === 'thumb') lbGo(Number(b.dataset.i));
    });
    var st = el.querySelector('.lb-stage');
    st.addEventListener('wheel', function (e) { if (!LB) return; e.preventDefault(); var q = lbPoint(e); lbZoomAt(LB.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), q); }, { passive: false });
    st.addEventListener('pointerdown', lbDown); st.addEventListener('pointermove', lbMove); st.addEventListener('pointerup', lbUp); st.addEventListener('pointercancel', lbUp);
    st.addEventListener('dblclick', function (e) { if (!LB || e.target.closest('button')) return; if (LB.s > 1.05) lbSet(1, 0, 0, true); else lbZoomAt(2.5, lbPoint(e)); });
    el.querySelector('.lb-img').addEventListener('load', function () { if (!LB) return; LB.loaded = true; el.classList.remove('is-loading'); lbApply(); });
    el.querySelector('.lb-img').addEventListener('error', function () { if (!LB) return; el.classList.remove('is-loading'); el.querySelector('.lb-err').hidden = false; });
    return el;
  }
  function lbOpen(urls, i, opener) {
    urls = (urls || []).filter(Boolean); if (!urls.length) return;
    var el = lbEl() || lbBuild();
    LB = { urls: urls, i: Math.max(0, Math.min(urls.length - 1, i || 0)), s: 1, x: 0, y: 0, ptrs: {}, opener: opener || document.activeElement, htmlOv: document.documentElement.style.overflow };
    document.documentElement.style.overflow = 'hidden';
    el.querySelector('.lb-strip').innerHTML = urls.length > 1 ? urls.map(function (u, k) { return '<button type="button" class="lb-thumb" data-lb="thumb" data-i="' + k + '" aria-label="Photo ' + (k + 1) + ' of ' + urls.length + '"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async"></button>'; }).join('') : '';
    el.classList.toggle('is-single', urls.length < 2);
    el.classList.add('is-open'); lbShow(false);
    setTimeout(function () { var c = el.querySelector('.lb-close'); if (c) c.focus(); }, 30);
  }
  function lbClose() {
    var el = lbEl(); if (!el || !LB) return;
    if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) {} }
    el.classList.remove('is-open', 'is-loading'); document.documentElement.style.overflow = LB.htmlOv || '';
    var back = LB.opener; LB = null;
    if (back && back.isConnected && back.focus) back.focus();
  }
  function lbGo(i) { if (!LB) return; var n = LB.urls.length; LB.i = (i + n) % n; lbShow(false); }
  function lbShow(retry) {
    var el = lbEl(), img = el.querySelector('.lb-img'), u = LB.urls[LB.i];
    LB.s = 1; LB.x = 0; LB.y = 0; LB.loaded = false;
    el.querySelector('.lb-err').hidden = true; el.classList.add('is-loading');
    img.style.transform = '';
    img.alt = 'Cake design reference ' + (LB.i + 1) + ' of ' + LB.urls.length;
    if (retry) { img.removeAttribute('src'); setTimeout(function () { img.src = u; }, 30); } else img.src = u;
    if (img.complete && img.naturalWidth) { LB.loaded = true; el.classList.remove('is-loading'); }
    el.querySelector('.lb-count').textContent = LB.urls.length > 1 ? (LB.i + 1) + ' of ' + LB.urls.length : '1 photo';
    [].slice.call(el.querySelectorAll('.lb-thumb')).forEach(function (b, k) { if (k === LB.i) { b.setAttribute('aria-current', 'true'); if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); } else b.removeAttribute('aria-current'); });
    // load the neighbours early so Next and Previous feel instant
    [LB.i + 1, LB.i - 1].forEach(function (k) { var v = LB.urls[(k + LB.urls.length) % LB.urls.length]; if (v && v !== u) { var pre = new Image(); pre.decoding = 'async'; pre.src = v; } });
    lbApply();
  }
  // Largest useful zoom: at least 4 times, and enough to see the photo at twice its real pixel size
  function lbMax() { var img = lbEl().querySelector('.lb-img'); var fitW = img.offsetWidth || 1; return Math.max(4, Math.min(12, (img.naturalWidth || fitW) / fitW * 2)); }
  function lbPoint(e) { var r = lbEl().querySelector('.lb-stage').getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }; }
  function lbZoomAt(s2, q) { if (!LB) return; s2 = Math.max(1, Math.min(lbMax(), s2)); var k = s2 / LB.s; lbSet(s2, q.x - (q.x - LB.x) * k, q.y - (q.y - LB.y) * k); }
  function lbZoomBy(f) { lbZoomAt(LB.s * f, { x: 0, y: 0 }); }
  function lbSet(s, x, y, anim) {
    var el = lbEl(), img = el.querySelector('.lb-img'), st = el.querySelector('.lb-stage');
    var mx = Math.max(0, (img.offsetWidth * s - st.clientWidth) / 2), my = Math.max(0, (img.offsetHeight * s - st.clientHeight) / 2);
    LB.s = s; LB.x = s <= 1 ? 0 : Math.max(-mx, Math.min(mx, x)); LB.y = s <= 1 ? 0 : Math.max(-my, Math.min(my, y));
    img.classList.toggle('lb-anim', !!anim); lbApply();
  }
  function lbApply() {
    var el = lbEl(); if (!el || !LB) return;
    el.querySelector('.lb-img').style.transform = 'translate(' + LB.x + 'px,' + LB.y + 'px) scale(' + LB.s + ')';
    el.classList.toggle('is-zoomed', LB.s > 1.01);
    el.querySelector('.lb-zoom').textContent = Math.round(LB.s * 100) + '%';
    var zi = el.querySelector('[data-lb="in"]'), zo = el.querySelector('[data-lb="out"]'), ft = el.querySelector('[data-lb="fit"]');
    if (zi) zi.disabled = LB.s >= lbMax() - 0.01; if (zo) zo.disabled = LB.s <= 1.01; if (ft) ft.disabled = LB.s <= 1.01;
  }
  function lbDown(e) {
    if (!LB || e.target.closest('button')) return;
    try { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
    LB.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(LB.ptrs);
    if (ids.length === 1) LB.drag = { sx: e.clientX, sy: e.clientY, ox: LB.x, oy: LB.y, t: Date.now() };
    if (ids.length === 2) { var a = LB.ptrs[ids[0]], b = LB.ptrs[ids[1]]; LB.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: LB.s }; LB.drag = null; }
  }
  function lbMove(e) {
    if (!LB || !LB.ptrs[e.pointerId]) return;
    LB.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(LB.ptrs);
    if (ids.length === 2 && LB.pinch) {
      var a = LB.ptrs[ids[0]], b = LB.ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      lbZoomAt(LB.pinch.s * d / LB.pinch.d, lbPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
    } else if (LB.drag && LB.s > 1.01) lbSet(LB.s, LB.drag.ox + e.clientX - LB.drag.sx, LB.drag.oy + e.clientY - LB.drag.sy);
  }
  function lbUp(e) {
    if (!LB || !LB.ptrs[e.pointerId]) return;
    var d = LB.drag; delete LB.ptrs[e.pointerId];
    if (Object.keys(LB.ptrs).length < 2) LB.pinch = null;
    if (d && LB.s <= 1.01 && !Object.keys(LB.ptrs).length && LB.urls.length > 1) {
      var dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) lbGo(LB.i + (dx < 0 ? 1 : -1));
    }
    if (!Object.keys(LB.ptrs).length) LB.drag = null;
  }
  function lbFull() {
    var el = lbEl(), on = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) {}
  }
  document.addEventListener('fullscreenchange', function () { var el = lbEl(); if (!el) return; var b = el.querySelector('.lb-fsbtn'); if (b) b.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; if (LB) setTimeout(function () { lbSet(LB.s, LB.x, LB.y); }, 60); });
  window.addEventListener('resize', function () { if (LB) lbSet(LB.s, LB.x, LB.y); });
  // Keys work only while the viewer is open, and never reach the order behind it
  document.addEventListener('keydown', function (e) {
    if (!LB) return;
    var k = e.key, used = true;
    if (k === 'Escape') lbClose(); else if (k === 'ArrowRight') lbGo(LB.i + 1); else if (k === 'ArrowLeft') lbGo(LB.i - 1);
    else if (k === '+' || k === '=') lbZoomBy(1.5); else if (k === '-' || k === '_') lbZoomBy(1 / 1.5); else if (k === '0') lbSet(1, 0, 0, true);
    else if (k === 'Tab') { var f = [].slice.call(lbEl().querySelectorAll('button:not([disabled])')).filter(function (b) { return b.offsetParent; }); if (f.length) { var at = f.indexOf(document.activeElement); var nx = e.shiftKey ? (at <= 0 ? f.length - 1 : at - 1) : (at === f.length - 1 ? 0 : at + 1); f[nx].focus(); } }
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // The "Cake design references" gallery: tidy thumbnails; tap one to open the viewer
  function refGallery(urls, opts) {
    opts = opts || {};
    var n = urls.length;
    if (!n) return opts.loading ? '<section class="ccs-box ccs-refs"><h3>Cake design references</h3><p class="ccs-hint">Loading photos…</p></section>' : (opts.empty || '');
    return '<section class="ccs-box ccs-refs"><h3>Cake design references <span class="ccs-refs-n">' + n + (n === 1 ? ' photo' : ' photos') + '</span></h3><div class="ccs-refgrid">' + urls.map(function (u, k) {
      return '<div class="ccs-ref"><button type="button" class="ccs-refbtn" data-act="lb-open" data-src="' + (opts.src || 'sheet') + '" data-v="' + k + '" aria-label="Open photo ' + (k + 1) + ' of ' + n + ' full size"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.add(\'is-broken\')"><span class="ccs-ref-bad">Photo not available</span></button>' +
        (opts.remove ? '<button type="button" class="ccs-link ccs-ref-rm" data-act="ph-rm" data-v="' + k + '">Remove</button>' : '') + '</div>';
    }).join('') + '</div><p class="ccs-hint">Tap a photo to see it full size and zoom in.' + (opts.note ? ' ' + opts.note : '') + '</p>' + (opts.extra || '') + '</section>';
  }

  // ---------- inspiration photos: same rules as the website form (photos only, 5 MB each) ----------
  var PH_TYPES = /^image\/(jpeg|png|webp)$/;
  function phLive(list) { return list.filter(function (x) { return x.status !== 'failed'; }); }
  function phBusy(list) { return list.filter(function (x) { return x.status === 'busy'; }).length; }
  function phUpload(list, files, max, done) {
    var errs = [];
    [].slice.call(files || []).forEach(function (file) {
      if (phLive(list).length >= max) { if (errs.indexOf('max') < 0) errs.push('max'); return; }
      if (file.type && !PH_TYPES.test(file.type)) { errs.push(/hei[cf]/i.test(file.type) ? file.name + ' is an iPhone HEIC photo, which some screens cannot show. Choose it from Photos on the phone, or save it as JPG first.' : file.name + ' is not a photo. Choose a JPG, PNG or WebP image.'); return; }
      if (file.size > 5 * 1024 * 1024) { errs.push(file.name + ' is over 5 MB. Choose a smaller photo.'); return; }
      var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60) || 'photo.jpg', ph = { name: file.name, path: 'incoming/' + uuid() + '/' + safe, url: null, status: 'busy' };
      try { ph.url = URL.createObjectURL(file); } catch (e) {}
      list.push(ph);
      sb.storage.from('cake-references').upload(ph.path, file, { contentType: file.type || 'image/jpeg', upsert: false })
        .then(function (r) { ph.status = r.error ? 'failed' : 'done'; done(); }, function () { ph.status = 'failed'; done(); });
    });
    return errs.map(function (x) { return x === 'max' ? 'You can add up to ' + max + ' photos.' : x; }).join(' ') || null;
  }
  function phThumbs(list, act) {
    if (!list.length) return '';
    return '<div class="ccs-phlist">' + list.map(function (x, i) {
      return '<div class="ccs-ph' + (x.status === 'failed' ? ' is-failed' : '') + '">' + (x.url ? '<button type="button" class="ccs-ph-view" data-act="lb-open" data-src="' + (act === 'o-phx' ? 'addph' : 'draft') + '" data-v="' + i + '" aria-label="See ' + esc(x.name) + ' full size"><img src="' + esc(x.url) + '" alt=""></button>' : '<span class="ccs-ph-name">' + esc(x.name) + '</span>') +
        '<span class="ccs-ph-st">' + (x.status === 'busy' ? 'Uploading…' : x.status === 'failed' ? 'Upload failed' : 'Added') + '</span>' +
        '<button type="button" class="ccs-ph-x" data-act="' + act + '" data-v="' + i + '" aria-label="Remove ' + esc(x.name) + '">×</button></div>';
    }).join('') + '</div>';
  }
  function phPicker(id, label, link) { return '<label class="' + (link ? 'ccs-link ccs-phlink' : 'ccs-btn ccs-ghost ccs-phadd') + '"><input type="file" id="' + id + '" accept="image/jpeg,image/png,image/webp" multiple class="ccs-sr">' + label + '</label>'; }
  function freshDraft() { return { key: uuid(), source: 'walk_in', step: 0, reached: 0, phone: '', noMob: null, matches: null, customer: null, isNew: false, name: '', email: '', whatsapp: true, optIn: null,
    product: null, req: false, sizeNote: '', reqPrice: '', variant: null, size: null, finish: 'standard', design: '', photos: [], phErr: null, message: '', candles: '', occasion: null, occOther: '', diet: null, diets: [], dietNote: '', notes: '', qty: 1,
    date: '', time: '', rush: '', rushBy: '', fromCal: false, method: 'collection', zone: null, address: '', fee: '', contact: '', confirmNow: false, askDeposit: false, deposit: '', payNow: false, payAmount: '', payMethod: 'cash', result: null, err: null, errField: null }; }
  var D = freshDraft();
  // Unfinished walk-in orders are kept on this device for 12 hours, per staff login, and cleared at sign out (U6)
  function draftKey() { return S.me ? 'ccs-draft-' + S.me.user_id : null; }
  function draftHasContent() { return !D.result && (digits(D.phone).length >= 3 || D.reached > 0 || !!D.product || !!D.req || D.name.trim().length > 1); }
  function saveDraft() {
    slipBarUpdate();
    var k = draftKey(); if (!k) return;
    try { if (draftHasContent()) { if (!D.saved) D.saved = Date.now(); var sg = draftSig(); if (sg !== draftSig.last) { draftSig.last = sg; D.touched = Date.now(); } localStorage.setItem(k, JSON.stringify(Object.assign({}, D, { matches: null, err: null, errField: null, confirmReset: false, saved: D.saved }))); } else localStorage.removeItem(k); } catch (e) {}
  }
  // What the draft holds, without its bookkeeping: the time shown is when staff last changed it, not when the screen redrew
  function draftSig() { var c = Object.assign({}, D); ['saved', 'touched', 'restored', 'err', 'errField', 'matches', 'confirmReset', 'showSlip', 'whenOpen'].forEach(function (k) { delete c[k]; }); try { return JSON.stringify(c); } catch (e) { return ''; } }
  function loadDraft() {
    var k = draftKey(); if (!k) return;
    try {
      var raw = localStorage.getItem(k); if (!raw) return;
      var d = JSON.parse(raw);
      if (!d || !d.saved || Date.now() - d.saved > 12 * 3600 * 1000) { localStorage.removeItem(k); return; }
      D = Object.assign(freshDraft(), d, { matches: null, result: null, restored: true }); draftSig.last = draftSig();
      D.photos = (D.photos || []).filter(function (x) { return x.status === 'done'; }).map(function (x) { return { name: x.name, path: x.path, url: null, status: 'done' }; });
      if (D.customer && D.custConsent === undefined) setTimeout(function () { if (D.customer) slConsent(D.customer.id); }, 0);
    } catch (e) {}
  }
  function clearDraft() { var k = draftKey(); try { if (k) localStorage.removeItem(k); } catch (e) {} D = freshDraft(); }
  function draftWho() { return D.customer ? D.customer.full_name : (D.name || D.phone || ''); }

  // ---------- task continuity: half-done work is kept on this device, per login, for 12 hours ----------
  // New orders already keep their own draft (above). This adds order changes, customer edits and the handover note.
  var WIP_MS = 12 * 3600e3, wipTimer;
  function wipKey() { return S.me ? 'ccs-wip-' + S.me.user_id : null; }
  function wipAll() { var k = wipKey(); if (!k) return {}; try { var w = JSON.parse(localStorage.getItem(k) || '{}') || {}, n = Date.now(), out = {}; Object.keys(w).forEach(function (x) { if (w[x] && n - w[x].at < WIP_MS) out[x] = w[x]; }); return out; } catch (e) { return {}; } }
  function wipGet(id) { return wipAll()[id] || null; }
  function wipPut(id, item) {
    var k = wipKey(); if (!k) return; var w = wipAll();
    if (item) { item.at = Date.now(); w[id] = item; } else { if (!w[id]) return; delete w[id]; }
    try { if (Object.keys(w).length) localStorage.setItem(k, JSON.stringify(w)); else localStorage.removeItem(k); } catch (e) {}
  }
  function wipClearAll() { var k = wipKey(); try { if (k) localStorage.removeItem(k); } catch (e) {} }
  function amSnap(a) { var c = JSON.parse(JSON.stringify(a)); delete c.preview; return c; }
  // Copy what is on screen into the store. A fresh change form with nothing changed never removes earlier kept work.
  function wipSync() {
    var sh = S.sheet; if (!S.me || !sh) return;
    if (sh.type === 'order' && sh.data && S.panel === 'amend' && S.am && S.am.orig) {
      var k = 'am:' + sh.id, n = Object.keys(amendChanges()).length;
      if (n || (S.am.reason || '').trim()) wipPut(k, { kind: 'am', id: sh.id, ref: sh.data.reference, who: (sh.data.customers && sh.data.customers.full_name) || sh.data.contact_name || '', ver: sh.data.version, step: S.am.preview ? 'Reviewed, not saved' : 'Not saved yet', am: amSnap(S.am) });
      else if (S.am.resumed) wipPut(k, null);
    } else if (sh.type === 'customer' && sh.edit && sh.data) {
      var dk = {}, m = 0; Object.keys(S.dirty).forEach(function (f) { if (/^ce-/.test(f)) { dk[f] = S.dirty[f]; m++; } });
      if (m) wipPut('cu:' + sh.id, { kind: 'cu', id: sh.id, who: (sh.data.c && sh.data.c.full_name) || '', step: 'Not saved yet', dirty: dk });
    }
  }
  function wipHo() { var n = S.ho && S.ho.draft ? S.ho.draft : ''; if (n.trim()) wipPut('ho', { kind: 'ho', note: n, shift: S.ho.shift || null, step: 'Not saved yet' }); else wipPut('ho', null); }
  function wipSoon() { clearTimeout(wipTimer); wipTimer = setTimeout(function () { wipSync(); }, 300); }
  // Leaving is not cancelling: work that is fully kept can be left and picked up later
  function pauseable() {
    var sh = S.sheet; if (!sh) return false;
    if (sh.type === 'new') return true;
    var other = Object.keys(S.dirty).filter(function (k) { return String(S.dirty[k] || '').trim() && !/^(am-|ce-)/.test(k); });
    if (other.length) return false;
    if (sh.type === 'order' && sh.data && S.panel === 'amend' && S.am) return true;
    if (sh.type === 'customer' && sh.edit && sh.data) return true;
    return false;
  }
  function pauseWork() {
    var sh = S.sheet; if (!sh) return null; wipSync(); clearTimeout(wipTimer);
    var msg = sh.type === 'order' && sh.data ? 'Changes to ' + sh.data.reference + ' kept. Pick them up from Today.' : sh.type === 'customer' ? 'Customer changes kept. Pick them up from Today.' : null;
    if (sh.type !== 'new') { S.dirty = {}; S.am = null; S.panel = null; }
    return msg;
  }
  function wipWhen(at) { var iso = new Date(at).toISOString(); return hoDay(iso) + ', ' + hoTime(iso); }
  function wipItems() {
    var out = [];
    if (draftHasContent() && canP('ord.create')) out.push({ k: 'new', title: 'New order' + (draftWho() ? ' for ' + draftWho() : ''), step: 'Not saved yet', at: D.touched || D.saved || Date.now() });
    var w = wipAll();
    Object.keys(w).forEach(function (k) {
      var x = w[k];
      if (x.kind === 'am' && canP('ord.status')) out.push({ k: k, title: 'Changes to ' + x.ref + (x.who ? ' for ' + x.who : ''), step: x.step, at: x.at });
      else if (x.kind === 'cu' && canP('cust.edit')) out.push({ k: k, title: 'Customer details' + (x.who ? ' for ' + x.who : ''), step: x.step, at: x.at });
      else if (x.kind === 'ho' && (canP('ord.view') || canP('kit.view'))) out.push({ k: k, title: 'Handover note', step: x.step, at: x.at });
    });
    return out.sort(function (a, b) { return b.at - a.at; });
  }
  function resumeCard(only) {
    var it = wipItems().filter(function (x) { return !only || only.indexOf(x.k.split(':')[0]) > -1; }); if (!it.length) return '';
    return '<section class="cw-resume" aria-label="Pick up where you left off"><h2>Pick up where you left off</h2>' + it.map(function (x) {
      return '<div class="cw-row"><span class="cw-t"><b>' + esc(x.title) + '</b><small>' + esc(x.step) + ' · ' + esc(wipWhen(x.at)) + '</small></span><span class="cw-acts"><button type="button" class="ccs-btn" data-act="wip-go" data-v="' + esc(x.k) + '">Continue</button><button type="button" class="ccs-btn ccs-ghost" data-act="wip-drop" data-v="' + esc(x.k) + '">Discard</button></span></div>';
    }).join('') + '</section>';
  }
  // The same offer inside the order or customer it belongs to
  function wipBanner(k, what) {
    var x = wipGet(k); if (!x) return '';
    return '<div class="cw-banner" role="status"><span class="cw-t"><b>You have unsaved ' + what + '</b><small>Last changed ' + esc(wipWhen(x.at)) + '</small></span><span class="cw-acts"><button type="button" class="ccs-btn" data-act="wip-go" data-v="' + esc(k) + '">Continue</button><button type="button" class="ccs-btn ccs-ghost" data-act="wip-drop" data-v="' + esc(k) + '">Discard</button></span></div>';
  }
  function amendAllowed(o) { return canP('ord.status') && OPEN.indexOf(o.order_status) > -1 && (o.production_status !== 'ready' || canP('ord.override')); }
  // Kept changes go on top of the latest version of the order, so nothing someone else saved is lost
  function amendResume(o, x) {
    var a = amendInit(o), sv = x.am || {}, o0 = sv.orig || {};
    Object.keys(a.orig).forEach(function (f) { if (sv[f] !== undefined && JSON.stringify(sv[f]) !== JSON.stringify(o0[f])) a[f] = sv[f]; });
    a.by = sv.by || null; a.reason = sv.reason || ''; a.open = sv.open || a.open; a.resumed = true;
    return a;
  }
  function wipGo(k) {
    if (k === 'new') { goTab('new'); return; }
    var x = wipGet(k); if (!x) { toast('That unfinished work is no longer on this device.', true); view(); return; }
    if (x.kind === 'ho') { if (kitchenOnly()) { secStore('kitM').kitM = 'hand'; goTab('kitchen'); } else goTab('handover'); setTimeout(function () { var n = document.getElementById('ho-note'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } }, 50); return; }
    if (x.kind === 'am') {
      openOrder(x.id).then(function () {
        var o = S.sheet && S.sheet.id === x.id && S.sheet.data; if (!o) return;
        if (!amendAllowed(o)) { wipPut(k, null); toast('This order can no longer be changed, so the kept changes were removed.', true); return renderSheet(); }
        S.panel = 'amend'; S.am = amendResume(o, x); S.panelErr = o.version !== x.ver ? 'This order was updated since you left it. Your changes are on top of the latest version: check them before saving.' : null;
        renderSheet(); var bd = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (bd) bd.scrollTop = 0;
      });
      return;
    }
    if (x.kind === 'cu') {
      openCustomer(x.id).then(function () {
        if (!S.sheet || S.sheet.id !== x.id || !S.sheet.data || !canP('cust.edit')) return;
        S.sheet.tab = 'overview'; S.sheet.edit = true; S.sheet.sec = Object.assign(S.sheet.sec || {}, { cust: 'overview' }); S.dirty = Object.assign({}, x.dirty || {}); renderSheet();
      });
    }
  }
  // Discard is immediate, with Undo for 10 seconds
  function wipDrop(k) {
    var put = function () { if (S.sheet) renderSheet(); view(); };
    if (k === 'new') { var bk = JSON.parse(JSON.stringify(D)); clearDraft(); put(); toast('Unfinished order discarded', false, { label: 'Undo', fn: function () { D = Object.assign(freshDraft(), bk); saveDraft(); put(); toast('Unfinished order back'); } }); return; }
    var x = wipGet(k); if (!x) return put();
    wipPut(k, null); if (x.kind === 'ho' && S.ho) S.ho.draft = '';
    put(); toast('Discarded', false, { label: 'Undo', fn: function () { var w = wipAll(); w[k] = x; x.at = Date.now(); try { localStorage.setItem(wipKey(), JSON.stringify(w)); } catch (e) {} if (x.kind === 'ho' && S.ho) S.ho.draft = x.note; put(); toast('Back where it was'); } });
  }

  // ---------- where staff were: screen, sections and filters survive Back and a refresh ----------
  function scrMain() { return document.getElementById('ccs-main'); }
  function scrMark() { var m = scrMain(); S.scr = S.scr || {}; if (S.tab) S.scr[S.tab] = { w: window.pageYOffset || 0, m: m ? m.scrollTop : 0 }; }
  function scrApply() {
    var w = S.scrWant; if (!w) return;
    if (w.tab !== S.tab || Date.now() > w.until) { S.scrWant = null; return; }
    var m = scrMain(); if (m) m.scrollTop = w.pos.m; window.scrollTo(0, w.pos.w);
    if (S.loaded && (!m || Math.abs(m.scrollTop - w.pos.m) < 4) && Math.abs((window.pageYOffset || 0) - w.pos.w) < 4) S.scrWant = null;
  }
  ['wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { if (S) S.scrWant = null; }, { passive: true }); });
  function scrKeep() { if (!S.me) return; try { sessionStorage.setItem('ccs-where-' + S.me.user_id, JSON.stringify({ tab: S.tab, secs: S.secs || {}, filter: S.filter, day: S.day, at: Date.now() })); } catch (e) {} }
  function scrLoad() {
    if (!S.me) return null;
    try {
      var w = JSON.parse(sessionStorage.getItem('ccs-where-' + S.me.user_id) || 'null'); if (!w || Date.now() - w.at > WIP_MS) return null;
      if (w.secs && typeof w.secs === 'object') S.secs = w.secs; if (typeof w.filter === 'string') S.filter = w.filter; if (typeof w.day === 'string') S.day = w.day;
      return typeof w.tab === 'string' && w.tab !== 'new' && w.tab !== 'more' ? w.tab : null;
    } catch (e) { return null; }
  }
  function prod() { if (!S.setup || !D.product) return null; return S.setup.products.filter(function (p) { return p.code === D.product; })[0] || null; }
  function sizeObj() { var p = prod(); return p && D.size ? p.sizes.filter(function (s) { return s.inch === D.size; })[0] : null; }
  function dPrice() { if (D.req) { var rp = num(D.reqPrice); return rp != null && rp > 0 ? rp : null; } var s = sizeObj(); return s ? Number(s.price) * (D.qty || 1) : null; }
  function zoneObj() { return ((S.setup && S.setup.delivery_zones) || []).filter(function (z) { return z.name === D.zone; })[0] || null; }
  function dFee() { if (D.method !== 'delivery') return 0; var z = zoneObj(); if (!z) return 0; return z.fee != null ? Number(z.fee) : (num(D.fee) || 0); }
  function dTotal() { var p = dPrice(); return p == null ? null : p + dFee(); }
  function delivOk() { if (D.method !== 'delivery') return true; var z = zoneObj(), f = num(D.fee); return !!z && D.address.trim().length >= 5 && (z.fee != null || (f != null && f >= 0)); }
  function leadDays() { var L = S.setup.location, p = prod(); return D.finish === 'custom' ? L.lead_days_custom : (p ? p.lead_days : L.lead_days_standard); }
  function minDate() { return addDays(today(), leadDays()); }
  // Quick picks for who approved a short-notice order: the signed-in manager, then names used recently on this device
  function rushChips() {
    var me = S.me && S.me.full_name && canP('ord.override') ? S.me.full_name : null, names = (me ? [me] : []).concat(recentNames().filter(function (n) { return !me || n.toLowerCase() !== me.toLowerCase(); })).slice(0, 4);
    if (!names.length) return '';
    return '<div class="ccs-chips ccs-namechips" aria-label="Who approved it">' + names.map(function (n) { return '<button type="button" class="ccs-chip" data-act="n-rushby" data-v="' + esc(n) + '" aria-pressed="' + (D.rushBy === n) + '">' + (n === me ? 'Me (' + esc(n) + ')' : esc(n)) + '</button>'; }).join('') + '</div>';
  }
  function tooSoon() { return D.date && D.date < minDate(); }
  function rushOk() { return !tooSoon() || (D.rush.trim().length >= 3 && D.rushBy.trim().length >= 2); }
  var NSTEPS = [
    { k: 'Customer', sum: function () { return D.customer ? D.customer.full_name + ' · ' + D.customer.phone + (D.customer.orders_count ? ' · ' + D.customer.orders_count + ' earlier orders' : '') : (D.isNew && D.name ? D.name + ' · ' + D.phone + ' (new)' : ''); } },
    { k: 'Cake', sum: function () { var p = prod(); return p && D.size && (!p.variants.length || D.variant) ? (D.variant || p.name) + ', ' + D.size + ' inch' + (D.qty > 1 ? ' × ' + D.qty : '') + ' · ' + money(dPrice()) : ''; } },
    { k: 'Finish', sum: function () { if (!D.finish || !D.diet || (D.finish === 'custom' && D.design.trim().length < 3)) return ''; return [D.finish === 'custom' ? 'Custom design' : 'Standard finish', D.message ? '“' + D.message + '”' : '', D.candles ? 'Candles: ' + D.candles : '', D.occasion, D.diet === 'yes' ? (D.diets.join(', ') || 'Dietary noted') : 'No dietary needs'].filter(Boolean).join(' · '); } },
    { k: 'When', sum: function () { return D.date && D.time && rushOk() && delivOk() ? nice(D.date) + ' at ' + t12(D.time) + (tooSoon() ? ' (short notice)' : '') + (D.method === 'delivery' ? ' · Delivery to ' + D.zone + ' (' + money(dFee()) + ')' : ' · Collect from café') : ''; } },
    { k: 'Payment', sum: function () { return ''; } }
  ];
  function nextOpen(from) { for (var i = from; i < NSTEPS.length; i++) if (!NSTEPS[i].sum() || i === NSTEPS.length - 1) return i; return NSTEPS.length - 1; }
  // New order can run on its own page or as a panel over the calendar
  function newInSheet() { return !!(S.sheet && S.sheet.type === 'new'); }
  function newOpen() { return S.tab === 'new' || newInSheet(); }
  function newRender() { if (newInSheet()) renderSheet(); else view(); }
  function goStep(i) { if (SLIP) D.whenOpen = false; D.restored = false; D.step = i; D.reached = Math.max(D.reached, i); D.err = null; D.errField = null; newRender(); var el = document.getElementById('ccs-nstep-' + i); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function ferr(f) { return D.errField === f && D.err ? '<p class="ccs-err">' + esc(D.err) + '</p>' : ''; }

  function newView() {
    if (D.result) {
      var r = D.result;
      return '<div class="ccs-done"><div class="ccs-tick" aria-hidden="true">✓</div><h1 class="ccs-title">' + esc(r.reference) + ' is saved</h1><p>' + esc(statusLabel(r.status)) + '. ' +
        (r.status === 'confirmed' ? 'Hand the customer their order number, then make the kitchen slip.' : r.status === 'awaiting_deposit' ? 'It confirms itself as soon as the deposit is recorded.' : 'It is waiting in Needs attention.') + '</p>' +
        '<div class="ccs-actions-row">' + (r.status === 'confirmed' && validRef(r.reference) ? '<button type="button" class="ccs-btn ccs-good" data-act="open-slip" data-id="' + r.order_id + '">Make kitchen slip</button>' : '') + '<button type="button" class="ccs-btn ccs-ghost" data-act="open-order" data-id="' + r.order_id + '">Open order</button>' + (D.fromCal ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cal-back">Back to calendar</button>' : '') + '<button type="button" class="ccs-btn ccs-new" data-act="new-again">' + NAV_ICON['new'] + 'New order</button>' + (newInSheet() ? '' : '<button type="button" class="ccs-btn ccs-ghost" data-tab="orders">Go to orders</button>') + '</div></div>';
    }
    var inSheet = newInSheet();
    var h = inSheet ? (!STEPPER && draftHasContent() && !D.confirmReset ? '<div class="ccs-newtop"><button type="button" class="ccs-link ccs-red" data-act="new-again">Start over</button></div>' : '')
      : '<div class="ccs-head' + (SLIP && STEPPER ? ' sl-pagehead' : '') + '"><div><h1 class="ccs-title">New order</h1>' + (SLIP && STEPPER ? '' : '<p class="ccs-sub">For walk-in, phone, WhatsApp and social media orders</p>') + '</div>' + (!STEPPER && draftHasContent() && !D.confirmReset ? '<button type="button" class="ccs-link ccs-red" data-act="new-again">Start over</button>' : '') + '</div>';
    if (D.confirmReset) h += '<div class="ccs-panel ccs-confirm" role="alert"><b>Clear this order?</b><p class="ccs-hint">The customer, cake and date you have entered will be lost.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="new-clear">Clear order</button><button type="button" class="ccs-btn ccs-ghost" data-act="new-keep">Keep going</button></div></div>';
    if (D.fromCal && D.date && !D.confirmReset) h += '<div class="ccs-note ccs-calnote"><span>Pickup date from the calendar: <b>' + esc(nice(D.date, true)) + (D.time ? ' at ' + esc(t12(D.time)) : '') + '</b>. Change it on the Pickup line if needed.</span>' + (inSheet ? '' : '<button type="button" class="ccs-link" data-act="cal-back">Back to calendar</button>') + '</div>';
    if (D.repeat && !D.confirmReset) h += repeatNote();
    else if (D.restored && draftHasContent()) h += '<p class="ccs-note">Carrying on the unfinished order' + (draftWho() ? ' for ' + esc(draftWho()) : '') + ', started ' + esc(stamp(D.saved)) + '.</p>';
    if (SLIP && STEPPER) return h + '<div class="sl-wrap is-stepper"><div id="ccs-slipform">' + slipBody() + '</div></div>';
    if (SLIP) return h + '<div class="sl-wrap"><p class="sl-k" style="margin:0 0 8px">How did they order?</p><div class="ccs-chips" role="group" aria-label="How they ordered" style="margin-bottom:16px">' + SOURCES.map(function (s) { return '<button type="button" class="ccs-chip" data-act="n-source" data-v="' + s[0] + '" aria-pressed="' + (D.source === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' + takenHtml() +
      '<div id="ccs-slipform">' + slipBody() + '</div></div>';
    h += '<ol class="ccs-nprog" aria-label="Progress">' + NSTEPS.map(function (st, i) { var c = i === D.step ? 'is-now' : (i <= D.reached && st.sum() ? 'is-done' : ''); return '<li class="' + c + '"><span>' + (c === 'is-done' ? '&#10003;' : (i + 1)) + '</span>' + st.k + '</li>'; }).join('') + '</ol>';
    h += '<p class="ccs-label" style="margin:0 0 8px">How did they order?</p><div class="ccs-chips" role="group" aria-label="How they ordered" style="margin-bottom:14px">' + SOURCES.map(function (s) { return '<button type="button" class="ccs-chip" data-act="n-source" data-v="' + s[0] + '" aria-pressed="' + (D.source === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' + takenHtml();
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
      h += '<div class="ccs-field"><span class="ccs-label">Existing customers</span>' + D.matches.map(function (m, k) { return '<button type="button" class="ccs-match" data-act="n-pick" data-v="' + k + '"><span><b style="color:var(--ccs-ink)">' + esc(m.full_name) + '</b><br><span class="ccs-hint">' + esc(m.phone) + (m.favourite_cake ? ' · usually ' + esc(m.favourite_cake) : '') + '</span></span><span class="ccs-hint">' + (m.orders_count ? m.orders_count + (m.orders_count === 1 ? ' order' : ' orders') : 'No orders yet') + '</span></button>'; }).join('') + '</div>';
    }
    if (D.isNew || (D.matches && !D.matches.length && digits(D.phone).length >= 7)) {
      D.isNew = true;
      h += '<div class="ccs-panel"><b>New customer</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-name">Full name</label><input class="ccs-input" id="n-name" data-n="name" value="' + esc(D.name) + '" autocomplete="off"></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="n-email">Email (optional)</label><input class="ccs-input" id="n-email" type="email" data-n="email" value="' + esc(D.email) + '"></div></div>' + ferr('name') +
        '<label class="ccs-check"><input type="checkbox" data-nc="whatsapp"' + (D.whatsapp ? ' checked' : '') + '> This number is on WhatsApp</label>' +
        '<label class="ccs-check"><input type="checkbox" data-nc="optIn"' + (D.optIn ? ' checked' : '') + '> Customer agrees to receive cake specials and reminders, and offers from Jack&#39;s Restaurants</label>' +
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
    h += '<div class="ccs-field"><label class="ccs-label" for="n-candles">Candles (optional)</label><input class="ccs-input" id="n-candles" maxlength="60" data-n="candles" placeholder="For example: number 30 candle, or 5 small candles" value="' + esc(D.candles) + '"></div>' + ferr('candles');
    h += '<div class="ccs-field"><span class="ccs-label">Occasion (required)</span><div class="ccs-chips">' + occChips() + '</div>' + occOther() + '</div>';
    h += '<div class="ccs-field rq-simple">' + reqHtml(D, 'n', true) + '</div>';
    h += '<div class="ccs-field"><span class="ccs-label">Any allergies?</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-diet" data-v="no" aria-pressed="' + (D.diet === 'no') + '">No</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="yes" aria-pressed="' + (D.diet === 'yes') + '">Yes</button></div>' + ferr('diet') + '</div>';
    if (D.diet === 'yes') h += '<div class="ccs-panel"><div class="ccs-chips">' + DIETS.map(function (d) { return '<button type="button" class="ccs-chip" data-act="n-diets" data-v="' + esc(d) + '" aria-pressed="' + (D.diets.indexOf(d) > -1) + '">' + esc(d) + '</button>'; }).join('') + '</div><input class="ccs-input" data-n="dietNote" id="n-dnote" placeholder="Details for the kitchen" value="' + esc(D.dietNote) + '"></div>';
    h += '<div class="ccs-field"><label class="ccs-label" for="n-notes">Other notes (optional)</label><input class="ccs-input" id="n-notes" data-n="notes" value="' + esc(D.notes) + '"></div>';
    return h + '<button type="button" class="ccs-btn" data-act="n-finish-next">Continue</button>';
  }
  function stepWhen(noHead, part) {
    var L = S.setup.location, slots = [], o = L.collection_open.split(':').map(Number), c = L.collection_close.split(':').map(Number);
    for (var m = o[0] * 60 + o[1]; m <= c[0] * 60 + c[1]; m += L.slot_minutes) slots.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    var closed = (S.setup.closed_dates || []).indexOf(D.date) > -1;
    var dl = D.method === 'delivery', zones = S.setup.delivery_zones || [], zo = zoneObj();
    var h = (noHead ? '' : '<h2 class="ccs-step-q">Collection or delivery, and when?</h2>') + '<div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-method" data-v="collection" aria-pressed="' + !dl + '">Collect from café</button><button type="button" class="ccs-chip" data-act="n-method" data-v="delivery" aria-pressed="' + dl + '">Delivery</button></div>';
    if (dl) {
      h += '<div class="ccs-panel"><div class="ccs-field"><span class="ccs-label">Delivery area</span><div class="ccs-chips">' + zones.map(function (z) { return '<button type="button" class="ccs-chip" data-act="n-zone" data-v="' + esc(z.name) + '" aria-pressed="' + (D.zone === z.name) + '">' + esc(z.name) + (z.fee != null ? ' · ' + money(z.fee) : ' · set fee') + '</button>'; }).join('') + '</div>' + ferr('zone') + '</div>' +
        '<div class="ccs-field"><label class="ccs-label" for="n-address">Delivery address</label><input class="ccs-input" id="n-address" data-n="address" value="' + esc(D.address) + '" placeholder="Street, resort or business name" autocomplete="off"></div>' + ferr('address') +
        (zo && zo.fee == null ? '<div class="ccs-field"><label class="ccs-label" for="n-fee">Delivery fee (FJD)</label><input class="ccs-input" id="n-fee" data-n="fee" inputmode="decimal" value="' + esc(D.fee) + '"></div>' + ferr('fee') : '') +
        '<div class="ccs-field"><label class="ccs-label" for="n-contact">Who receives it (optional)</label><input class="ccs-input" id="n-contact" data-n="contact" value="' + esc(D.contact) + '" placeholder="Name, room or reception"></div></div>';
    }
    // Quick date choices from the earliest allowed day; the calendar stays for anything else (U21)
    var quick = [], dd = minDate(), guard = 0, closedL = S.setup.closed_dates || [];
    while (quick.length < (noHead ? 7 : 10) && guard++ < 40) { if (closedL.indexOf(dd) < 0) quick.push(dd); dd = addDays(dd, 1); }
    // Short-notice days (today up to the normal notice) get their own marked chips (A16)
    var soon = []; for (var sd = today(); sd < minDate() && soon.length < 3; sd = addDays(sd, 1)) if (closedL.indexOf(sd) < 0) soon.push(sd);
    var other = D.dateOther || (D.date && quick.indexOf(D.date) < 0 && soon.indexOf(D.date) < 0);
    h += '<div class="ccs-field"><span class="ccs-label">' + (dl ? 'Delivery date' : 'Collection date') + '</span><div class="ccs-chips ccs-datechips' + (noHead ? ' is-grid' : '') + '">' + quick.map(function (q) { if (noHead) { var dq = new Date(q + 'T12:00:00Z'); return '<button type="button" class="ccs-chip ccs-datecell" data-act="n-date" data-v="' + q + '" aria-pressed="' + (D.date === q && !other) + '" aria-label="' + esc(nice(q, true)) + '"><span>' + esc(whenLabel(q) === 'Today' || whenLabel(q) === 'Tomorrow' ? whenLabel(q) : dq.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })) + '</span><b>' + dq.getUTCDate() + '</b><em>' + esc(dq.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })) + '</em></button>'; } return '<button type="button" class="ccs-chip" data-act="n-date" data-v="' + q + '" aria-pressed="' + (D.date === q && !other) + '">' + esc(whenLabel(q) === 'Today' || whenLabel(q) === 'Tomorrow' ? whenLabel(q) + ' ' + new Date(q + 'T12:00:00Z').getUTCDate() : nice(q)) + '</button>'; }).join('') + (noHead ? '</div><div class="ccs-chips ccs-datechips ccs-datemore">' : '') +
      soon.map(function (q) { return '<button type="button" class="ccs-chip ccs-chip-soon" data-act="n-date" data-v="' + q + '" aria-pressed="' + (D.date === q && !other) + '">' + esc((whenLabel(q) === 'Today' || whenLabel(q) === 'Tomorrow' ? whenLabel(q) : nice(q)) + ', short notice') + '</button>'; }).join('') +
      '<button type="button" class="ccs-chip" data-act="n-date-other" aria-pressed="' + !!other + '">Other date</button></div><span class="ccs-hint">Normal notice: ' + leadDays() + ' days (earliest ' + esc(nice(minDate())) + ')</span></div>';
    if (other) h += '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-date">Other date</label><input class="ccs-input" id="n-date" type="date" min="' + today() + '" max="' + addDays(today(), L.max_days_ahead) + '" value="' + esc(D.date) + '" data-n="date"></div></div>';
    h += ferr('date');
    if (closed) h += '<p class="ccs-err">The café is closed for cake collections on that day.</p>';
    if (tooSoon() && !closed) h += '<div class="ccs-panel"><b>This is short notice.</b><p class="ccs-hint">Only take it if the kitchen has agreed. Both are saved with the order.</p><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-rush">Reason</label><input class="ccs-input" id="n-rush" data-n="rush" placeholder="For example: cake from today\'s batch" value="' + esc(D.rush) + '">' + ferr('rush') + '</div><div class="ccs-field"><label class="ccs-label" for="n-rushby">Who approved it</label><input class="ccs-input" id="n-rushby" data-n="rushBy" placeholder="Manager or chef name" value="' + esc(D.rushBy) + '" autocomplete="off">' +
      rushChips() + ferr('rushBy') + '</div></div></div>';
    var mid = h.length;
    if (D.date && !closed) {
      var nowT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      var wl = wlRows(D.date), at = {};
      if (wl) wl.forEach(function (o) { var k = slotOf(o.required_time); at[k] = (at[k] || 0) + 1; });
      // Times first, then how busy the day is, so the slots are on screen without scrolling at the counter
      h += '<div class="ccs-field"><span class="ccs-label">' + (dl ? 'Delivery time' : 'Collection time') + '</span><div class="ccs-chips ccs-timegrid">' + slots.map(function (s) { var past = D.date === today() && s <= nowT, n = at[s] || 0; return '<button type="button" class="ccs-chip' + (n ? ' has-booked' : '') + '" data-act="n-time" data-v="' + s + '" aria-pressed="' + (D.time === s) + '"' + (past ? ' disabled' : '') + (n ? ' aria-label="' + t12(s) + ', ' + n + ' already booked"' : '') + '>' + t12(s) + (n ? '<span class="ccs-n">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>' + (wl ? '<span class="ccs-hint">Numbers show pickups already booked at that time.</span>' : '') + ferr('time') + '</div>';
      h += workloadBox(wl);
    }
    return part === 'date' ? h.slice(0, mid) : part === 'time' ? (D.date ? '<p class="sl-whenis">' + esc(nice(D.date, true)) + (D.method === 'delivery' ? ', delivery to ' + esc(D.zone || '') : ', collect from café') + ' <button type="button" class="ccs-link" data-act="sl-whenpart" data-v="date">Change</button></p>' : '') + h.slice(mid) : h;
  }
  function stepPay(inSlip) {
    var price = dTotal(), custom = D.finish === 'custom';
    var h = (inSlip ? '' : '<h2 class="ccs-step-q">Price and payment</h2>') + (D.method === 'delivery' && !(D.req && price == null) ? '<dl class="ccs-kv"><dt>Cake</dt><dd>' + money(dPrice()) + '</dd><dt>Delivery</dt><dd>' + money(dFee()) + ', ' + esc(D.zone || '') + '</dd></dl>' : '') +
      (D.req ? '<div class="ccs-total"><span>' + (price == null ? 'Price' : 'Agreed price') + '</span><b>' + (price == null ? 'To be priced' : money(price)) + '</b></div>' : '<div class="ccs-total"><span>' + (custom ? 'Starting price before custom design' : 'Price') + '</span><b>' + money(price) + '</b></div>');
    if (D.req) h += '<p class="ccs-note">' + (price == null ? 'Saved as Needs a price. Add the price from the order when it is ready.' : 'Saved as Waiting for customer. Press Confirm order on the order once the customer agrees.') + ' The kitchen gets it only after Confirm order.</p>';
    else if (custom) h += '<p class="ccs-note">Custom cakes are saved as Needs a quote. Confirm the final price from the order once the design is priced.</p>';
    else if (inSlip) {
      // Menu cake at the counter: one clear choice about money, so payments are never forgotten
      var PLANS = [['full', 'Paid in full'], ['deposit', 'Paid a deposit'], ['later', 'Not paid yet']];
      h += '<div class="sl-sub sl-payplan"><span class="sl-k">Payment <em class="sl-req">Required</em></span><div class="ccs-chips" role="group" aria-label="Payment">' +
        PLANS.map(function (x) { return '<button type="button" class="ccs-chip" data-act="n-plan" data-v="' + x[0] + '" aria-pressed="' + (D.payPlan === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' + ferr('payplan') + '</div>';
      if (D.payPlan === 'full' || D.payPlan === 'deposit') {
        h += (D.payPlan === 'deposit' ? '<div class="ccs-field"><label class="ccs-label" for="n-pay">Deposit paid (FJD)</label><input class="ccs-input" id="n-pay" inputmode="decimal" data-n="payAmount" value="' + esc(D.payAmount) + '" style="max-width:220px"><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-payhalf">Half (' + money(Math.round(price / 2)) + ')</button></div></div>' : '') +
          '<div class="sl-sub"><span class="sl-k">Paid by</span><div class="ccs-chips" role="group" aria-label="Paid by">' + PAY_METHODS.map(function (m) { return '<button type="button" class="ccs-chip" data-act="n-paym" data-v="' + m[0] + '" aria-pressed="' + (D.payMethod === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' + ferr('payment') + '</div>' +
          '<p class="ccs-hint">The order is confirmed and goes to the kitchen board.' + (D.payPlan === 'deposit' ? ' The rest is paid on collection.' : '') + '</p>';
      } else if (D.payPlan === 'later') {
        h += '<label class="ccs-check"><input type="checkbox" data-nc="confirmNow"' + (D.confirmNow ? ' checked' : '') + '> The customer has agreed the price: confirm it now</label>' + (D.confirmNow ? '<p class="ccs-hint">Confirmed, to be paid on collection.</p>' : '<p class="ccs-hint">Otherwise it is saved as received and waits in Needs attention for review.</p>');
      }
      return h;
    }
    else {
      h += '<label class="ccs-check"><input type="checkbox" data-nc="confirmNow"' + (D.confirmNow ? ' checked' : '') + '> The customer is here and has agreed the price: confirm it now</label>' + (D.confirmNow ? '' : '<p class="ccs-hint">Otherwise it is saved as received and waits in Needs attention for review.</p>');
      if (D.confirmNow) {
        h += D.askDeposit ? '<div class="ccs-field"><label class="ccs-label" for="n-dep">Deposit needed (FJD)</label><input class="ccs-input" id="n-dep" inputmode="decimal" data-n="deposit" value="' + esc(D.deposit) + '"><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-dep" data-v="half">Half (' + money(Math.round(price / 2)) + ')</button><button type="button" class="ccs-chip" data-act="n-dep" data-v="full">Full (' + money(price) + ')</button></div></div>' + ferr('deposit')
          : '<button type="button" class="ccs-link" data-act="n-askdep">+ Ask for a deposit</button>';
      }
    }
    h += D.payNow ? '<div class="ccs-panel"><b>Payment taken now</b><div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-pay">Amount (FJD)</label><input class="ccs-input" id="n-pay" inputmode="decimal" data-n="payAmount" value="' + esc(D.payAmount) + '"></div></div><div class="ccs-chips">' +
      PAY_METHODS.map(function (m) { return '<button type="button" class="ccs-chip" data-act="n-paym" data-v="' + m[0] + '" aria-pressed="' + (D.payMethod === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' + ferr('payment') + '</div>'
      : '<button type="button" class="ccs-link" data-act="n-paynow">+ Customer is paying now</button>';
    if (inSlip) return h;
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
    if (SLIP) {
      var sf = document.getElementById('ccs-slipform'); if (!sf) return newRender();
      var fid = document.activeElement && document.activeElement.id, fpos = document.activeElement && document.activeElement.selectionStart;
      sf.innerHTML = slipBody();
      slipBarUpdate();
      if (fid) { var ff = document.getElementById(fid); if (ff) { ff.focus(); try { if (fpos != null) ff.setSelectionRange(fpos, fpos); } catch (e) {} } }
      saveDraft(); return;
    }
    var el = document.getElementById('ccs-nstep-' + D.step); if (!el) return newRender();
    var focus = document.activeElement && document.activeElement.id, pos = document.activeElement && document.activeElement.selectionStart;
    el.innerHTML = '<div class="ccs-step-body" style="animation:none">' + [stepCustomer, stepCake, stepFinish, stepWhen, stepPay][D.step]() + '</div>';
    if (focus) { var f = document.getElementById(focus); if (f) { f.focus(); try { if (pos != null) f.setSelectionRange(pos, pos); } catch (e) {} } }
    saveDraft();
  }
  // ---------- interactive Order Slip: the paper slip, filled in one stage at a time ----------
  var SLIP = true;
  // One step on screen at a time, live slip beside it (tablet), Back and Next always in view
  var STEPPER = true;
  var HEARD = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['google', 'Google'], ['friend', 'Friend or family'], ['walked_past', 'Walked past'], ['other', 'Other']];
  var RECUR = ['Birthday', 'Anniversary', 'Wedding'];
  // Stage ids stay as they were (saved drafts and server error fields use them); the screens shown are 1, 0, 4, 3, 7.
  // 2 (contact) is part of 1 (Customer); 5 (allergies) and 6 are part of 4 (Make it yours).
  var SL_STAGES = ['Cake', 'Customer', 'Customer', 'When is it needed?', 'Make it yours', 'Make it yours', 'Make it yours', 'Check and save'];
  // The order staff go through: the customer first (the mobile number finds a returning customer), then the cake, what makes it theirs, when, and the check
  var SL_ORDER = [1, 0, 4, 3, 7];
  var SL_MAP = { 2: 1, 5: 4, 6: 4 };
  function slMap(s) { return SL_MAP[s] != null ? SL_MAP[s] : s; }
  function slPos(s) { var k = SL_ORDER.indexOf(s); return k < 0 ? SL_ORDER.length - 1 : k; }
  function slPrev(s) { var k = slPos(s); return SL_ORDER[Math.max(0, k - 1)]; }
  function cents(v) { return v == null ? '' : '$' + Number(v).toFixed(2); }
  function slStage() { return D.sl == null ? SL_ORDER[0] : slMap(D.sl); }
  // One step back in the new order form: the Back button and the phone or browser Back do the same thing
  function slCanBack() { return newOpen() && !D.result && STEPPER && (slPos(slStage()) > 0 || (slStage() === 3 && slPhone() && D.whenPart === 'time')); }
  function slBack() { if (slStage() === 3 && slPhone() && D.whenPart === 'time') { D.whenPart = 'date'; D.err = null; D.errField = null; refreshStep(); return; } if (slPrev(slStage()) === 3) D.whenPart = 'time'; slGo(slPrev(slStage())); }
  function slSeen() { if (!D.slSeen) D.slSeen = []; if (D.fromCal && D.date && D.time && D.slSeen[3] == null) D.slSeen[3] = true; return D.slSeen; }
  // What each stage still needs, in words (empty = stage complete)
  function slNeeds(s) {
    var p = prod(), closedL = (S.setup && S.setup.closed_dates) || [];
    if (s === 0 && D.req) return D.design.trim().length < 3 ? ['Describe how the cake should look'] : (D.sizeNote || '').trim().length < 2 ? ['Write the size or how many people it serves'] : D.reqPrice && !(num(D.reqPrice) > 0) ? ['Check the price, or leave it empty'] : [];
    if (s === 0) return !p || !D.size ? ['Tap a price to choose the cake and size'] : p.variants.length && !D.variant ? ['Choose the flavour'] : D.finish === 'custom' && D.design.trim().length < 3 ? ['Describe the custom design'] : [];
    if (s === 1) { var n1 = slNeeds(2); if (!D.customer && D.name.trim().length < 2) n1.splice(D.noMob !== 'none' && digits(D.phone).length < 7 ? 1 : 0, 0, 'Write the guest name'); return n1; }
    if (s === 2) { if (D.customer) { if (D.custConsent === undefined) return ['Checking their permission']; return D.custConsent && D.custConsent.ok ? [] : (D.optIn === true || D.optIn === false) ? [] : ['Ask if they want cake offers and reminders']; } if (D.noMob === 'none') return []; var n = []; if (digits(D.phone).length < 7) n.push(D.noMob === 'other' ? 'Write the full phone number' : 'Write the full mobile number'); if (D.optIn !== true && D.optIn !== false) n.push('Ask if they want cake offers and reminders'); return n; }
    if (s === 3) { if (!D.date) return ['Choose the date']; if (closedL.indexOf(D.date) > -1) return ['Choose a day the café is open']; if (!D.time) return ['Choose the time']; var w = []; if (tooSoon() && !rushOk()) w.push('Give the short-notice reason and who approved it'); if (D.method === 'delivery' && !delivOk()) w.push('Finish the delivery details'); return w; }
    if (s === 4) { var n4 = slNeeds(5); if (!D.occasion) n4.push('Choose the occasion, or Customer didn\'t say'); return n4; }
    if (s === 6 && !D.occasion) return ['Choose the occasion, or Customer didn\'t say'];
    if (s === 5) { if (!D.diet) return ['Ask about dietary needs and allergies']; var dm = dietMissing(D.diet, D.diets, D.dietNote); return dm ? [dm] : []; }
    if (s === 7) {
      if (STEPPER && !D.req && D.finish !== 'custom') {
        if (!D.payPlan) return ['Choose how the customer is paying'];
        if (D.payPlan === 'full' || D.payPlan === 'deposit') { var pa = D.payPlan === 'full' ? dTotal() : num(D.payAmount); if (!(pa > 0)) return ['Enter the deposit paid']; if (D.payPlan === 'deposit' && pa >= dTotal()) return ['The deposit is the full price: choose Paid in full']; }
        return [];
      }
      return D.payNow && !(num(D.payAmount) > 0) ? ['Enter the amount paid'] : [];
    }
    return [];
  }
  function slipMissing() { var m = []; SL_ORDER.forEach(function (s) { if (s !== 7 && slNeeds(s).length) m.push([SL_STAGES[s], s]); }); return m; }
  function slNextStage(from) { var seen = slSeen(), at = slPos(from); for (var k = 0; k < SL_ORDER.length; k++) { var s = SL_ORDER[k]; if (s !== from && (!seen[s] || slNeeds(s).length) && (k > at || slNeeds(s).length)) return s; } return 7; }
  function slGo(s) { s = slMap(s); D.sl = s; D.err = null; D.errField = null; D.restored = false; D.showSlip = false; refreshStep(); if (STEPPER) { setTimeout(function () { var bd = document.querySelector('#ccs-sheet .ccs-sheet-body') || document.scrollingElement; if (bd) bd.scrollTop = 0; var m = document.querySelector('.sl-stepbody'); var f = m && m.querySelector('input:not([type=checkbox]):not([type=number]),textarea'); if (f && s > 0) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }, 40); return; } setTimeout(function () { var el = document.getElementById('sl-st-' + s); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); var f = el && el.querySelector('input:not([type=checkbox]):not([type=number]),textarea'); if (f && s > 0) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }, 60); }
  function slPhone() { return !!(window.matchMedia && window.matchMedia('(max-width: 759px)').matches) || !!(D && D.date && (tooSoon() || D.method === 'delivery')); }
  // Phones: pickup is two screens, the date and then the time
  function slWhenDateNeeds() { var closedL = (S.setup && S.setup.closed_dates) || [], w = []; if (!D.date) return ['Choose the date']; if (closedL.indexOf(D.date) > -1) return ['Choose a day the café is open']; if (tooSoon() && !rushOk()) w.push('Give the short-notice reason and who approved it'); if (D.method === 'delivery' && !delivOk()) w.push('Finish the delivery details'); return w; }
  // Join step messages into sentences with exactly one full stop each
  function sentences(list) { return list.map(function (x) { return String(x).replace(/[.\s]+$/, ''); }).join('. ') + '.'; }
  function slNext(skip) {
    if (STEPPER && slStage() === 3 && slPhone() && !(D.whenPart === 'time' && D.date)) {
      var nd = slWhenDateNeeds(); if (nd.length) { D.err = sentences(nd); D.errField = 'stage'; refreshStep(); return; }
      D.whenPart = 'time'; D.err = null; D.errField = null; refreshStep(); return;
    }
    var s = slStage(), need = slNeeds(s);
    if (need.length && !skip) { D.err = sentences(need); D.errField = 'stage'; refreshStep(); return; }
    slSeen()[s] = true; slGo(slNextStage(s));
  }
  // Custom cake not on the menu: one button under the price table, then its own short set of fields
  function reqButton(cls) {
    return '<button type="button" class="ccs-chip ccs-reqbtn ' + (cls || '') + '" data-act="n-req" aria-pressed="' + !!D.req + '" title="For a cake not on the menu: any size, shape, flavour or design. The price can be added later.">Custom cake (not on the list)</button>';
  }
  function reqFields() {
    return '<div class="sl-sub"><label class="sl-k" for="n-design">What should it look like? <em class="sl-req">Required</em></label><textarea class="ccs-input sl-design" id="n-design" data-n="design" rows="3" placeholder="Shape, colours, theme, toppers, writing style">' + esc(D.design) + '</textarea>' + ferr('design') + '</div>' +
      '<div class="sl-sub"><label class="sl-k" for="n-sizenote">Size or servings <em class="sl-req">Required</em></label><input class="ccs-input" id="n-sizenote" data-n="sizeNote" maxlength="80" value="' + esc(D.sizeNote || '') + '" placeholder="For example: 10 inch, or about 30 people, two tiers">' + ferr('size_note') + '</div>' +
      '<div class="sl-sub"><label class="sl-k" for="n-flav">Flavour <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-flav" data-n="variant" maxlength="80" value="' + esc(D.variant || '') + '" placeholder="For example: chocolate, or vanilla with passionfruit">' + ferr('variant') + '</div>' +
      '<div class="sl-sub"><span class="sl-k">Inspiration photos <em class="sl-opt">Optional</em></span>' + phThumbs(D.photos, 'sl-phx') +
        (phLive(D.photos).length < 5 ? phPicker('n-photos', D.photos.length ? 'Add more photos' : 'Add photos') : '') +
        (D.phErr ? '<p class="ccs-err" role="alert">' + esc(D.phErr) + '</p>' : '') + '<span class="ccs-hint">Up to 5 photos, 5 MB each. They go on the order and the kitchen slip.</span></div>' +
      '<div class="sl-sub sl-qty"><label class="sl-k" for="n-qty">How many cakes</label><input class="ccs-input" id="n-qty" type="number" min="1" max="50" value="' + D.qty + '" data-n="qty"></div>' +
      '<div class="sl-sub"><label class="sl-k" for="n-reqprice">Price (FJD) <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-reqprice" data-n="reqPrice" inputmode="decimal" value="' + esc(D.reqPrice || '') + '" placeholder="Leave empty if it still needs pricing" style="max-width:260px">' + ferr('price') +
        '<span class="ccs-hint">Without a price it is saved as Needs a price. With a price it waits for the customer to agree. It goes to the kitchen only when you press Confirm order.</span></div>';
  }
  function slTable() {
    var ps = S.setup.products || [], inches = [];
    ps.forEach(function (p) { p.sizes.forEach(function (z) { if (inches.indexOf(z.inch) < 0) inches.push(z.inch); }); });
    inches.sort(function (a, b) { return a - b; });
    return '<div class="sl-tablewrap"><table class="sl-ptable"><thead><tr><th scope="col">Type</th>' + inches.map(function (n) { return '<th scope="col">' + n + '”</th>'; }).join('') + '</tr></thead><tbody>' +
      ps.map(function (p) {
        return '<tr' + (D.product === p.code ? ' class="is-mine"' : '') + '><th scope="row">' + esc(p.name) + '</th>' + inches.map(function (n) {
          var z = p.sizes.filter(function (q) { return q.inch === n; })[0]; if (!z) return '<td></td>';
          var on = D.product === p.code && D.size === n;
          return '<td><button type="button" class="sl-cell" data-act="n-cell" data-v="' + esc(p.code) + '|' + n + '" aria-pressed="' + on + '" aria-label="' + esc(p.name) + ', ' + n + ' inch, ' + cents(z.price) + '">' + cents(z.price).replace(/\.00$/, '') + '</button></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function slActions(s, optional) {
    if (STEPPER) { D.slOpt = D.slOpt || {}; D.slOpt[s] = !!optional; return D.errField === 'stage' && D.err ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : ''; }
    var err = D.errField === 'stage' && D.err ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : (D.err && D.errField && s === slStage() ? '' : '');
    return err + '<div class="sl-acts"><button type="button" class="ccs-btn" data-act="sl-next">Next</button>' + (optional ? '<button type="button" class="ccs-btn ccs-ghost" data-act="sl-skip">Skip</button>' : '') + '</div>';
  }
  // One line of the slip: written (done), open (current) or still blank (to come)
  function slLine(label, s, value, editor, opts) {
    opts = opts || {}; var cur = slStage(), seen = slSeen();
    var state = s === cur && editor != null ? 'open' : (s !== cur && seen[s]) || (opts.filled && value) ? 'done' : 'blank';
    var h = '<div class="sl-line2 is-' + state + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>';
    h += '<div class="sl-l"><span class="sl-k">' + label + '</span>' + (opts.req && state !== 'done' ? '<em>Required</em>' : '') + '</div>';
    if (state === 'open' && editor != null) h += '<div class="sl-ed">' + editor + '</div>';
    else h += '<div class="sl-v">' + (value ? '<b>' + value + '</b>' : state === 'done' ? '<b class="sl-none">None</b>' : '<span class="sl-blank">&nbsp;</span>') + (state === 'done' && opts.change !== false ? '<button type="button" class="ccs-link sl-chg" data-act="sl-goto" data-v="' + s + '">Change</button>' : '') + '</div>';
    return h + '</div>';
  }
  function slipBody() {
    if (STEPPER) return slipStepper();
    var p = prod(), dl = D.method === 'delivery', me = S.me || {}, now = new Date(), so = sizeObj(), cur = slStage();
    var h = '<p class="sl-progress">Step ' + (cur + 1) + ' of 8 · <b>' + SL_STAGES[cur] + '</b></p>';
    h += '<div class="sl-card"><div class="sl-band"><div class="sl-logo">' + SLIP_LOGO + '</div></div>';
    // Stage 1: the price table, as on the paper slip
    h += '<div id="sl-st-0" class="sl-cakepick' + (cur === 0 ? ' is-open' : '') + '">' + slTable();
    if (cur === 0) {
      if (p && p.variants.length) h += '<div class="sl-sub"><span class="sl-k">' + esc(p.choice_label || 'Which flavour?') + '</span><div class="ccs-chips">' + p.variants.map(function (v) { return '<button type="button" class="ccs-chip" data-act="n-var" data-v="' + esc(v) + '" aria-pressed="' + (D.variant === v) + '">' + esc(v) + '</button>'; }).join('') + '</div></div>';
      if (p) h += '<div class="sl-sub"><span class="sl-k">Finish</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-finish" data-v="standard" aria-pressed="' + (D.finish !== 'custom') + '">Standard finish</button>' + (p.supports_custom ? '<button type="button" class="ccs-chip" data-act="n-finish" data-v="custom" aria-pressed="' + (D.finish === 'custom') + '">Custom design</button>' : '') + '</div></div>';
      if (p) h += '<p class="sl-ask"><b>Ask the customer:</b> who is the cake for, any colours or theme, and do they have a photo? ' + (D.finish === 'custom' ? 'Write the answers in Design details.' : 'Colours, a theme or a photo make it a custom design.') + '</p>';
      if (D.size) h += '<div class="sl-sub sl-qty"><label class="sl-k" for="n-qty">How many cakes</label><input class="ccs-input" id="n-qty" type="number" min="1" max="50" value="' + D.qty + '" data-n="qty"></div>';
      h += ferr('product') + ferr('size') + ferr('variant') + slActions(0);
    }
    h += '</div><div class="sl-lines2">';
    // Stage 2: guest name (typing also finds existing guests)
    var nm = D.customer ? esc(D.customer.full_name) : esc(D.name.trim());
    var nmEd = '<input class="ccs-input" id="n-name" data-n="name" value="' + esc(D.name) + '" autocomplete="off" placeholder="Full name">' + ferr('name') + slMatches(D.nameMatches) + slActions(1);
    if (D.customer) nmEd = '<p class="sl-fixed">' + nm + '</p><button type="button" class="ccs-link" data-act="n-unpick">A different guest</button>' + slActions(1);
    h += slLine('Guest Name', 1, nm, nmEd, { req: true, id: 'sl-st-1' });
    // Stage 3: contact and permission
    var ct = D.customer ? esc(D.customer.phone || '') + (D.optIn === true || D.optIn === false ? '<small>' + (D.optIn ? 'Agreed to offers and reminders' : 'No offers or reminders') + '</small>' : D.custConsent && D.custConsent.ok ? '<small>Agreed to cake offers and reminders</small>' : '') : D.noMob === 'none' ? 'No phone<small>' + (D.email.trim() ? 'Email ' + esc(D.email.trim()) : 'They quote the order number at collection') + '</small>' : esc(D.phone.trim()) + (D.noMob === 'other' && D.phone.trim() ? '<small>Not a mobile</small>' : '');
    if (ct && !D.customer && D.noMob !== 'none' && (D.optIn === true || D.optIn === false)) ct += '<small>' + (D.optIn ? 'Agreed to offers and reminders' : 'No offers or reminders') + '</small>';
    var ctEd;
    if (D.customer) ctEd = '<p class="sl-fixed">' + esc(D.customer.phone || '') + '</p><span class="ccs-hint">' + (D.customer.orders_count ? D.customer.orders_count + ' earlier orders' + (D.customer.favourite_cake ? ', usually ' + esc(D.customer.favourite_cake) : '') : 'Existing customer') + '.</span>' +
      (D.custConsent === undefined ? '<p class="ccs-hint">Checking their permission…</p>' : D.custConsent && D.custConsent.ok ? '<p class="ccs-hint">Already agreed to cake offers and reminders.</p>' :
        '<div class="sl-sub"><span class="sl-k">' + (D.custConsent && D.custConsent.reconfirm ? 'Their permission needs confirming. Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?' : 'Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?') + '</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-opt" data-v="yes" aria-pressed="' + (D.optIn === true) + '">Yes</button><button type="button" class="ccs-chip" data-act="sl-opt" data-v="no" aria-pressed="' + (D.optIn === false) + '">No</button></div><span class="ccs-hint">Only a clear yes is recorded as permission. It is saved with the order.</span></div>') + slActions(2);
    else ctEd = '<input class="ccs-input" id="n-phone" type="tel" inputmode="tel" placeholder="Mobile number" value="' + esc(D.phone) + '" data-n="phone" autocomplete="off">' + ferr('phone') + slMatches(D.matches) +
      '<label class="ccs-check"><input type="checkbox" data-nc="whatsapp"' + (D.whatsapp ? ' checked' : '') + '> This number is on WhatsApp</label>' +
      '<input class="ccs-input" id="n-email" type="email" data-n="email" value="' + esc(D.email) + '" placeholder="Email (optional)">' +
      '<div class="sl-sub"><span class="sl-k">Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-opt" data-v="yes" aria-pressed="' + (D.optIn === true) + '">Yes</button><button type="button" class="ccs-chip" data-act="sl-opt" data-v="no" aria-pressed="' + (D.optIn === false) + '">No</button></div><span class="ccs-hint">Ask every new guest. Only a clear yes is recorded as permission.</span></div>' +
      '<div class="sl-sub"><span class="sl-k">How did they hear about us? <em class="sl-req">Optional</em></span><div class="ccs-chips">' + HEARD.map(function (x) { return '<button type="button" class="ccs-chip" data-act="sl-heard" data-v="' + x[0] + '" aria-pressed="' + (D.heard === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' + slActions(2);
    h += slLine('Contact', 2, ct, ctEd, { req: true, id: 'sl-st-2' });
    // Stage 4: pickup
    var wv = D.date && D.time ? esc(nice(D.date, true)) + ', ' + esc(t12(D.time)) + '<small>' + (dl ? 'Delivery to ' + esc(D.zone || '') + (D.address ? ', ' + esc(D.address) : '') : 'Collect from café') + (tooSoon() ? ' · Short notice, approved by ' + esc(D.rushBy) : '') + '</small>' : '';
    h += slLine(dl ? 'Delivery Date' : 'Pickup Date', 3, wv, stepWhen(true) + slActions(3), { req: true, id: 'sl-st-3', filled: !!(D.fromCal && D.date && D.time) });
    // Cake lines, filled from stage 1
    h += slLine('Type of cake', 0, p ? esc(D.variant || p.name) + (D.finish === 'custom' ? '<small>Custom design</small>' : '') : '', null, { filled: true });
    h += slLine('Size', 0, D.size ? D.size + ' inch' + (D.qty > 1 ? ' × ' + D.qty : '') + (so && so.serves ? '<small>' + esc(so.serves) + '</small>' : '') : '', null, { filled: true, change: false });
    h += slLine('Price', 0, dTotal() != null ? money(dTotal()) + (dFee() ? '<small>Includes delivery ' + money(dFee()) + '</small>' : '') : '', null, { filled: true, change: false });
    // Stage 5: candles and inscription
    var ciEd = '<label class="sl-k" for="n-candles">Candles</label><input class="ccs-input" id="n-candles" maxlength="60" data-n="candles" placeholder="For example: number 30 candle" value="' + esc(D.candles) + '">' + ferr('candles') +
      (p && !p.supports_message ? '<span class="ccs-hint">' + esc(p.name) + ' does not take a written message.</span>' : '<label class="sl-k" for="n-msg">Inscription</label><input class="ccs-input" id="n-msg" maxlength="40" data-n="message" value="' + esc(D.message) + '" placeholder="Words written on the cake"><span class="ccs-hint">Up to 40 characters, copied exactly by the kitchen.</span>' + ferr('message')) + slActions(4, false);
    h += slLine('Candles', 4, esc(D.candles), ciEd, { id: 'sl-st-4' });
    if (slStage() !== 4) h += slLine('Inscription', 4, D.message ? '“' + esc(D.message) + '”' : '', null, { change: false });
    // Stage 6: dietary
    var dv = D.diet ? [reqShort({ requirements: D.reqs || [], requirements_note: D.reqNote }).join(', '), D.diet === 'no' ? 'No allergies' : D.diet === 'unsure' ? 'Allergies not sure yet: check with the customer' : esc('Allergy: ' + ([].concat(D.diets, D.dietNote ? [D.dietNote] : []).join(', ') || 'yes'))].filter(Boolean).join(' · ') : '';
    var dEd = reqHtml(D, 'n') + '<div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-diet" data-v="no" aria-pressed="' + (D.diet === 'no') + '">No allergies</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="yes" aria-pressed="' + (D.diet === 'yes') + '">Yes, an allergy</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="unsure" aria-pressed="' + (D.diet === 'unsure') + '">Not sure, check later</button></div>' + (D.diet === 'unsure' ? '<p class="ccs-note ccs-unsure" role="status">The order is saved as an allergy order and flagged. The kitchen slip says: Allergies not confirmed yet. Check with the customer before baking.</p>' : '') +
      (D.diet === 'yes' ? '<div class="ccs-chips">' + DIETS.map(function (d) { return '<button type="button" class="ccs-chip" data-act="n-diets" data-v="' + esc(d) + '" aria-pressed="' + (D.diets.indexOf(d) > -1) + '">' + esc(d) + '</button>'; }).join('') + '</div><input class="ccs-input" data-n="dietNote" id="n-dnote" placeholder="Details for the kitchen" value="' + esc(D.dietNote) + '">' : '') + ferr('diet') + slActions(5);
    h += slLine('Requirements and allergies', 5, dv, dEd, { req: true, id: 'sl-st-5' });
    // Stage 7: remarks
    var rv = [D.finish === 'custom' && D.design ? esc(D.design) : '', D.occasion ? esc(occSend()) + (D.occFor ? ' for ' + esc(D.occFor) : '') : '', esc(D.notes)].filter(Boolean).join(' · ');
    var rEd = (D.finish === 'custom' ? '<label class="sl-k" for="n-design">Design details <em class="sl-req">Required</em></label><textarea class="ccs-input" id="n-design" data-n="design" placeholder="Colours, theme, toppers">' + esc(D.design) + '</textarea>' + ferr('design') : '') +
      '<span class="sl-k">Occasion <em class="sl-req">Required</em></span><div class="ccs-chips">' + occChips() + '</div>' + occOther() +
      (RECUR.indexOf(D.occasion) > -1 ? '<div class="sl-sub sl-occ2"><label class="sl-k" for="n-occfor">Whose ' + esc(D.occasion.toLowerCase()) + '? <em class="sl-req">Optional</em></label><input class="ccs-input" id="n-occfor" data-n="occFor" maxlength="60" value="' + esc(D.occFor || '') + '" placeholder="For example: Mia, their daughter">' +
        '<label class="sl-k" for="n-occdate">Date of the ' + esc(D.occasion.toLowerCase()) + '</label><input class="ccs-input" id="n-occdate" type="date" data-n="occDate" value="' + esc(D.occDate || D.date || '') + '"><span class="ccs-hint">Used to remind them next year, if they agreed to messages.</span></div>' : '') +
      '<label class="sl-k" for="n-notes">Other notes</label><input class="ccs-input" id="n-notes" data-n="notes" value="' + esc(D.notes) + '" placeholder="Anything else for the order">' + slActions(6, false);
    h += slLine('Remarks', 6, rv, rEd, { id: 'sl-st-6' });
    h += slLine('Order Taken by', 99, esc(me.full_name || 'You'), null, { filled: true, change: false });
    h += slLine('Date', 99, esc(now.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?$/i, function (m, x) { return ' ' + x.toUpperCase() + 'M'; })), null, { filled: true, change: false });
    h += '</div></div>';
    // Stage 8: read over, payment, save
    if (cur === 7) {
      var miss = slipMissing();
      h += '<section class="sl-pay" id="sl-st-7"><h2 class="sl-h">Read over the slip, then save</h2>' + (miss.length ? '<p class="ccs-err" role="alert">Still to finish: ' + esc(miss.map(function (x) { return x[0]; }).join(', ')) + '. Tap Change on that line.</p>' : '') +
        stepPay(true) + (D.err && !D.errField ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : '') + (D.err && D.errField === 'stage' ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : '') +
        '<button type="button" class="ccs-btn ccs-good ccs-wide" data-act="n-submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : saveText()) + '</button></section>';
    }
    return h;
  }

  // Step-by-step order slip: the current step on the left, the paper slip filling in on the right.
  function slipStepper() {
    var p = prod(), dl = D.method === 'delivery', me = S.me || {}, now = new Date(), so = sizeObj(), cur = slStage(), seen = slSeen();
    var ed = '';
    if (cur === 0) {
      ed = (D.req ? '<div class="sl-reqhead"><p class="sl-k">Custom cake order</p><button type="button" class="ccs-link" data-act="n-unreq">Choose a menu cake instead</button></div>'
          : '<div class="sl-pickhead"><p class="sl-k">Tap the price for the cake and size</p>' + reqButton('sl-bodyreq') + '</div>' + slTable());
      if (D.req) ed += '<p class="sl-ask"><b>Ask the customer:</b> who is the cake for, any colours or theme, and do they have a photo? Write the answers in What should it look like.</p>' + reqFields();
      if (p && p.variants.length) ed += '<div class="sl-sub"><span class="sl-k">' + esc(p.choice_label || 'Which flavour?') + '</span><div class="ccs-chips">' + p.variants.map(function (v) { return '<button type="button" class="ccs-chip" data-act="n-var" data-v="' + esc(v) + '" aria-pressed="' + (D.variant === v) + '">' + esc(v) + '</button>'; }).join('') + '</div></div>';
      if (p) ed += '<div class="sl-sub"><span class="sl-k">Finish</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-finish" data-v="standard" aria-pressed="' + (D.finish !== 'custom') + '">Standard finish</button>' + (p.supports_custom ? '<button type="button" class="ccs-chip" data-act="n-finish" data-v="custom" aria-pressed="' + (D.finish === 'custom') + '">Custom design</button>' : '') + '</div></div>';
      if (p) ed += '<p class="sl-ask"><b>Ask the customer:</b> who is the cake for, any colours or theme, and do they have a photo? ' + (D.finish === 'custom' ? 'Write the answers in Design details.' : 'Colours, a theme or a photo make it a custom design.') + '</p>';
      if (p && D.finish === 'custom') ed += '<div class="sl-sub"><label class="sl-k" for="n-design">Design details <em class="sl-req">Required</em></label><textarea class="ccs-input sl-design" id="n-design" data-n="design" rows="3" placeholder="Who it is for, colours, theme, toppers, writing style">' + esc(D.design) + '</textarea>' + ferr('design') + '<span class="ccs-hint">A custom cake is priced by the team after the order is placed.</span></div>' +
        '<div class="sl-sub"><span class="sl-k">Inspiration photos <em class="sl-opt">Optional</em></span>' + phThumbs(D.photos, 'sl-phx') +
        (phLive(D.photos).length < 5 ? phPicker('n-photos', D.photos.length ? 'Add more photos' : 'Add photos') : '') +
        (D.phErr ? '<p class="ccs-err" role="alert">' + esc(D.phErr) + '</p>' : '') + '<span class="ccs-hint">Up to 5 photos, 5 MB each. They go on the order and the kitchen slip.</span></div>';
      if (D.size) ed += '<div class="sl-sub sl-qty"><label class="sl-k" for="n-qty">How many cakes</label><input class="ccs-input" id="n-qty" type="number" min="1" max="50" value="' + D.qty + '" data-n="qty"></div>';
      ed += ferr('product') + ferr('size') + ferr('variant') + slActions(0);
    } else if (cur === 1) {
      var consentQ = function (lead) { return '<div class="sl-sub"><span class="sl-k">' + lead + ' <em class="sl-req">Required</em></span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-opt" data-v="yes" aria-pressed="' + (D.optIn === true) + '">Yes</button><button type="button" class="ccs-chip" data-act="sl-opt" data-v="no" aria-pressed="' + (D.optIn === false) + '">No</button></div><span class="ccs-hint">Only a clear yes is recorded as permission. It is saved with the order.</span></div>'; };
      var q = 'Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?';
      if (D.customer) ed = '<div class="sl-found"><p class="sl-fixed">' + esc(D.customer.full_name) + '</p><p class="sl-fixed sl-fixed2">' + esc(D.customer.phone || '') + '</p><span class="ccs-hint">' + (D.customer.orders_count ? 'Returning customer, ' + D.customer.orders_count + ' earlier order' + (D.customer.orders_count === 1 ? '' : 's') + (D.customer.favourite_cake ? ', usually ' + esc(D.customer.favourite_cake) : '') : 'Existing customer') + '.</span><button type="button" class="ccs-link" data-act="n-unpick">A different guest</button></div>' +
        (D.custConsent === undefined ? '<p class="ccs-hint">Checking their permission…</p>' : D.custConsent && D.custConsent.ok ? '<p class="ccs-hint">Already agreed to cake offers and reminders.</p>' : consentQ(D.custConsent && D.custConsent.reconfirm ? 'Their permission needs confirming. ' + q : q));
      else {
        // No mobile? Another number (landline or family) is an ordinary phone order; No phone saves the order with no number at all
        var noPh = D.noMob === 'none', other = D.noMob === 'other';
        var backBtn = '<button type="button" class="ccs-link sl-nomob-link" data-act="sl-nomob" data-v="">They have a mobile after all</button>';
        ed = noPh ? '<div class="sl-nomob-none"><p class="sl-k">No phone</p><p class="ccs-note" role="status">We can&#39;t reach them if anything changes. Give them the order number to quote when they collect.</p>' + backBtn + '</div>'
          : '<label class="sl-k" for="n-phone">' + (other ? 'Phone number' : 'Mobile number') + ' <em class="sl-req">Required</em></label><input class="ccs-input" id="n-phone" type="tel" inputmode="tel" placeholder="' + (other ? 'Phone number' : 'Mobile number') + '" value="' + esc(D.phone) + '" data-n="phone" autocomplete="off">' + ferr('phone') + slMatches(D.matches) +
            '<span class="ccs-hint">' + (other ? 'A landline, or a family member&#39;s number.' : 'Type the number first: a returning customer comes up with their details.') + '</span>' +
            (other ? backBtn : D.noMob === 'menu' ? '<div class="sl-sub sl-nomob-pick"><span class="sl-k">No mobile?</span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-nomob" data-v="other">Use another number</button><button type="button" class="ccs-chip" data-act="sl-nomob" data-v="none">No phone</button><button type="button" class="ccs-chip" data-act="sl-nomob" data-v="">Cancel</button></div></div>'
              : '<button type="button" class="ccs-link sl-nomob-link" data-act="sl-nomob" data-v="menu">No mobile?</button>');
        ed += '<label class="sl-k" for="n-name">Guest name <em class="sl-req">Required</em></label><input class="ccs-input" id="n-name" data-n="name" value="' + esc(D.name) + '" autocomplete="off" placeholder="Full name">' + ferr('name') + (noPh ? '' : slMatches(D.nameMatches)) +
          (noPh ? '' : '<label class="ccs-check"><input type="checkbox" data-nc="whatsapp"' + (D.whatsapp ? ' checked' : '') + '> This number is on WhatsApp</label>') +
          '<label class="sl-k" for="n-email">Email <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-email" type="email" data-n="email" value="' + esc(D.email) + '" placeholder="For order emails">' + ferr('email') +
          (noPh ? '' : consentQ(q));
      }
      ed += '<p class="sl-k" style="margin:14px 0 8px">How did they order? <em class="sl-req">Required</em></p><div class="ccs-chips" role="group" aria-label="How they ordered">' + SOURCES.map(function (s) { return '<button type="button" class="ccs-chip" data-act="n-source" data-v="' + s[0] + '" aria-pressed="' + (D.source === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' + takenHtml() +
        (D.customer ? '' : (!D.heard && !D.heardOpen ? '<button type="button" class="ccs-link sl-heardopen" data-act="sl-heardopen">How did they hear about us? (optional)</button>' : '<div class="sl-sub"><span class="sl-k">How did they hear about us? <em class="sl-opt">Optional</em></span><div class="ccs-chips">' + HEARD.map(function (x) { return '<button type="button" class="ccs-chip" data-act="sl-heard" data-v="' + x[0] + '" aria-pressed="' + (D.heard === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>')) + slActions(1);
    } else if (cur === 3) {
      var part = slPhone() ? (D.whenPart === 'time' && D.date ? 'time' : 'date') : null;
      ed = stepWhen(true, part) + slActions(3);
    } else if (cur === 4) {
      var occHtml = '<span class="sl-k">Occasion <em class="sl-req">Required</em></span><div class="ccs-chips">' + occChips() + '</div>' + occOther() +
        (RECUR.indexOf(D.occasion) > -1 ? '<div class="sl-sub sl-occ2"><label class="sl-k" for="n-occfor">Whose ' + esc(D.occasion.toLowerCase()) + '? <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-occfor" data-n="occFor" maxlength="60" value="' + esc(D.occFor || '') + '" placeholder="For example: Mia, their daughter">' +
          '<label class="sl-k" for="n-occdate">Date of the ' + esc(D.occasion.toLowerCase()) + '</label><input class="ccs-input" id="n-occdate" type="date" data-n="occDate" value="' + esc(D.occDate || D.date || '') + '"><span class="ccs-hint">Used to remind them next year, if they agreed to messages.</span></div>' : '');
      ed = (p && !p.supports_message ? '<span class="ccs-hint">' + esc(p.name) + ' does not take a written message.</span>' : '<label class="sl-k" for="n-msg">Inscription <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-msg" maxlength="40" data-n="message" value="' + esc(D.message) + '" placeholder="Words written on the cake"><span class="ccs-hint">Up to 40 characters, copied exactly by the kitchen.</span>' + ferr('message')) +
        '<label class="sl-k" for="n-candles">Candles <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-candles" maxlength="60" data-n="candles" placeholder="For example: number 30 candle" value="' + esc(D.candles) + '">' + ferr('candles') +
        reqHtml(D, 'n') +
        '<div class="ccs-chips"><button type="button" class="ccs-chip" data-act="n-diet" data-v="no" aria-pressed="' + (D.diet === 'no') + '">No allergies</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="yes" aria-pressed="' + (D.diet === 'yes') + '">Yes, an allergy</button><button type="button" class="ccs-chip" data-act="n-diet" data-v="unsure" aria-pressed="' + (D.diet === 'unsure') + '">Not sure, check later</button></div>' + (D.diet === 'unsure' ? '<p class="ccs-note ccs-unsure" role="status">The order is saved as an allergy order and flagged. The kitchen slip says: Allergies not confirmed yet. Check with the customer before baking.</p>' : '') +
        (D.diet === 'yes' ? '<div class="ccs-chips">' + DIETS.map(function (d) { return '<button type="button" class="ccs-chip" data-act="n-diets" data-v="' + esc(d) + '" aria-pressed="' + (D.diets.indexOf(d) > -1) + '">' + esc(d) + '</button>'; }).join('') + '</div><input class="ccs-input" data-n="dietNote" id="n-dnote" placeholder="Details for the kitchen" value="' + esc(D.dietNote) + '">' : '') + ferr('diet') +
        occHtml +
        '<label class="sl-k" for="n-notes">Other notes <em class="sl-opt">Optional</em></label><input class="ccs-input" id="n-notes" data-n="notes" value="' + esc(D.notes) + '" placeholder="Anything else for the order">' + slActions(4, false);
    } else {
      var miss = slipMissing();
      ed = (miss.length ? '<p class="ccs-err" role="alert">Still to finish: ' + esc(miss.map(function (x) { return x[0]; }).join(', ')) + '. Tap Change on that line of the slip.</p>' : '<p class="ccs-hint">Read the slip back to the guest, then take any payment and save.</p>') +
        stepPay(true) + (D.err && D.errField !== 'stage' && !D.errField ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : '') + (D.err && D.errField === 'stage' ? '<p class="ccs-err" role="alert">' + esc(D.err) + '</p>' : '');
    }
    // The live slip, in the paper order
    var line = function (label, s, value, extra) {
      var done = value && (seen[s] || s === 99 || s === 0 && D.size), now2 = s === cur || (extra && extra.also === cur);
      return '<div class="sl-ll' + (now2 ? ' is-now' : '') + (value ? '' : ' is-blank') + '" data-st="' + s + '"><span class="sl-lk">' + label + '</span><span class="sl-lv">' + (value || '&nbsp;') + '</span>' +
        (s !== 99 && s !== cur && (seen[s] || (s === 0 && D.size)) ? '<button type="button" class="ccs-link sl-chg" data-act="sl-goto" data-v="' + s + '" aria-label="Change ' + label + '">Change</button>' : '') + '</div>';
    };
    var nm = D.customer ? esc(D.customer.full_name) : esc(D.name.trim());
    var ct = D.customer ? esc(D.customer.phone || '') + (D.optIn === true || D.optIn === false ? '<small>' + (D.optIn ? 'Agreed to offers and reminders' : 'No offers or reminders') + '</small>' : D.custConsent && D.custConsent.ok ? '<small>Agreed to cake offers and reminders</small>' : '') : D.noMob === 'none' ? 'No phone<small>' + (D.email.trim() ? 'Email ' + esc(D.email.trim()) : 'They quote the order number at collection') + '</small>' : esc(D.phone.trim()) + (D.noMob === 'other' && D.phone.trim() ? '<small>Not a mobile</small>' : '');
    if (ct && !D.customer && D.noMob !== 'none' && (D.optIn === true || D.optIn === false)) ct += '<small>' + (D.optIn ? 'Agreed to offers and reminders' : 'No offers or reminders') + '</small>';
    var wv = D.date && D.time ? esc(nice(D.date, true)) + ', ' + esc(t12(D.time)) + '<small>' + (dl ? 'Delivery to ' + esc(D.zone || '') + (D.address ? ', ' + esc(D.address) : '') : 'Collect from café') + (tooSoon() ? ' · Short notice, approved by ' + esc(D.rushBy) : '') + '</small>' : '';
    var dv = D.diet === 'no' ? 'No dietary needs' : D.diet === 'unsure' ? 'Not sure yet: check with the customer' : D.diet === 'yes' ? esc([].concat(D.diets, D.dietNote ? [D.dietNote] : []).join(', ') || 'Yes') : '';
    var rv = [D.occasion ? esc(occSend()) + (D.occFor ? ' for ' + esc(D.occFor) : '') : '', esc(D.notes)].filter(Boolean).join(' · ');
    var live = '<aside class="sl-live" aria-label="The order slip so far"><div class="sl-band"><div class="sl-logo">' + SLIP_LOGO + '</div></div>' +
      (D.diet === 'yes' ? '<div class="sl-ldiet">Dietary or allergy: ' + dv + '</div>' : D.diet === 'unsure' ? '<div class="sl-ldiet">Allergies not confirmed yet. Check with the customer before baking.</div>' : '') +
      '<div class="sl-llines">' +
      line('Guest Name', 1, nm) + line('Contact', 1, ct) + line(dl ? 'Delivery' : 'Pickup', 3, wv) +
      line('Type of cake', 0, D.req ? 'Custom cake' + (D.variant ? ', ' + esc(D.variant) : '') + (D.design.trim() ? '<small>' + esc(D.design.trim()) + '</small>' : '') : p ? esc(D.variant || p.name) + (D.finish === 'custom' ? ' · Custom design' + (D.design.trim() ? '<small>' + esc(D.design.trim()) + '</small>' : '') : '') : '') +
      line('Size', 0, D.req ? esc((D.sizeNote || '').trim()) + (D.qty > 1 ? ' × ' + D.qty : '') : D.size ? D.size + ' inch' + (D.qty > 1 ? ' × ' + D.qty : '') + (so && so.serves ? ' · ' + esc(so.serves) : '') : '') +
      line('Price', 0, dTotal() != null ? money(dTotal()) : D.req ? 'To be priced' : '') +
      line('Candles', 4, esc(D.candles)) + line('Inscription', 4, D.message ? '“' + esc(D.message) + '”' : '') +
      line('Dietary', 4, dv) + line('Remarks', 4, rv) +
      line('Order Taken by', 99, esc(me.full_name || 'You')) +
      line('Date', 99, esc(now.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?$/i, function (m, x) { return ' ' + x.toUpperCase() + 'M'; }))) +
      '</div></aside>';
    var nx = cur < 7 ? slNextStage(cur) : 7, opt = D.slOpt && D.slOpt[cur];
    var restart = draftHasContent() && !D.confirmReset ? '<button type="button" class="ccs-link sl-restart" data-act="new-again">Start over</button>' : '';
    var bar = '<div class="sl-stepbar"><div class="sl-stepbar-l">' + (slPos(cur) > 0 ? '<button type="button" class="ccs-btn ccs-ghost" data-act="sl-back">Back</button>' : '') + restart + '</div>' +
      '<div class="sl-stepbar-r">' + (opt && cur < 7 ? '<button type="button" class="ccs-btn ccs-ghost" data-act="sl-skip">Skip</button>' : '') +
      (cur < 7 ? '<button type="button" class="ccs-btn" data-act="sl-next"><span class="sl-nxlong">Next: ' + esc(cur === 3 && slPhone() && !(D.whenPart === 'time' && D.date) ? (D.method === 'delivery' ? 'Delivery time' : 'Pickup time') : SL_STAGES[nx]) + '</span><span class="sl-nxshort">Next</span></button>'
        : '<button type="button" class="ccs-btn ccs-good" data-act="n-submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : saveText()) + '</button>') + '</div></div>';
    var head = '<div class="sl-stephead"><p class="sl-progress">Step ' + (slPos(cur) + 1) + ' of ' + SL_ORDER.length + '</p><h2 class="sl-steptitle">' + (cur === 3 && slPhone() ? (D.whenPart === 'time' && D.date ? (D.method === 'delivery' ? 'Delivery time' : 'Pickup time') : (D.method === 'delivery' ? 'Delivery date' : 'Pickup date')) : cur === 0 && D.req ? 'Custom cake details' : SL_STAGES[cur]) + '</h2>' +
      '<ol class="sl-dots" aria-hidden="true">' + SL_ORDER.map(function (i) { return '<li class="' + (i === cur ? 'is-now' : seen[i] && !slNeeds(i).length ? 'is-done' : '') + '"></li>'; }).join('') + '</ol>' +
      '<button type="button" class="ccs-link sl-viewbtn" data-act="sl-view">' + (D.showSlip ? 'Back to this step' : 'View slip') + '</button>' + (cur === 0 && !D.req ? reqButton('sl-headreq') : '') + '</div>';
    return '<div class="sl-stepper' + (D.showSlip ? ' show-slip' : '') + '"><section class="sl-stepmain" id="sl-st-' + cur + '">' + head + '<div class="sl-stepbody">' + ed + '</div>' + bar + '</section>' + live + '</div>';
  }
  // The slip beside the step follows the typing, without redrawing the field being typed in
  var slLiveT;
  function slLiveSoon() {
    clearTimeout(slLiveT);
    slLiveT = setTimeout(function () {
      var cur = document.querySelector('#ccs-slipform .sl-live'); if (!cur) return;
      var tmp = document.createElement('div'); tmp.innerHTML = slipStepper();
      var nx = tmp.querySelector('.sl-live'); if (nx) cur.innerHTML = nx.innerHTML;
    }, 200);
  }
  function slMatches(list) {
    if (!list || !list.length) return '';
    return '<div class="sl-matches"><span class="ccs-hint">Already a customer? Tap to use their details.</span>' + list.map(function (m, k) { return '<button type="button" class="ccs-match" data-act="n-pick" data-v="' + k + '" data-from="' + (list === D.nameMatches ? 'name' : 'phone') + '"><span><b style="color:var(--ccs-ink)">' + esc(m.full_name) + '</b><br><span class="ccs-hint">' + esc(m.phone) + (m.favourite_cake ? ' · usually ' + esc(m.favourite_cake) : '') + '</span></span><span class="ccs-hint">' + (m.orders_count ? m.orders_count + (m.orders_count === 1 ? ' order' : ' orders') : 'No orders yet') + '</span></button>'; }).join('') + '</div>';
  }
  var nameTimer;
  function nameSearch() {
    clearTimeout(nameTimer); var q = D.name.trim();
    if (q.length < 3) { if (D.nameMatches) { D.nameMatches = null; refreshStep(); } return; }
    nameTimer = setTimeout(function () { sb.rpc('staff_search_customers', { q: q }).then(function (r) { if (r.error) throw r.error; if (q !== D.name.trim()) return; D.nameMatches = (r.data || []).slice(0, 4); refreshStep(); }).catch(function (e) { console.error(e); }); }, 350);
  }
  // Existing guest: is their permission on record? If yes, contact is done; if not, the question is asked
  function slConsent(id) {
    sb.from('customer_summary').select('marketing_opt_in, consent_reconfirm').eq('id', id).single().then(function (r) {
      if (!D.customer || D.customer.id !== id) return;
      var x = r && !r.error && r.data ? r.data : null;
      D.custConsent = x ? { ok: !!x.marketing_opt_in && !x.consent_reconfirm, reconfirm: !!x.consent_reconfirm } : { ok: false };
      refreshStep();
    }, function () { D.custConsent = { ok: false }; refreshStep(); });
  }
  function slipBar() { return ''; }
  function slipBarUpdate() {}
  function slipJump() { var m = slipMissing(); if (m.length) slGo(m[0][1]); }
  function saveLabel() {
    if (D.req) return 'Save custom cake';
    if (D.finish === 'custom') return 'Save cake order';
    if (D.payPlan === 'full') return 'Save, paid and confirmed';
    if (D.payPlan === 'deposit') return 'Save and confirm';
    return D.confirmNow && D.payPlan === 'later' ? 'Save and confirm' : 'Save cake order';
  }
  // The save button names the money being recorded, so a wrong amount or method is caught before saving
  function saveText() {
    var t = dTotal();
    if (STEPPER && !D.req && D.finish !== 'custom' && (D.payPlan === 'full' || D.payPlan === 'deposit')) {
      var amt = D.payPlan === 'full' ? t : num(D.payAmount);
      if (amt > 0) return 'Save: ' + money(amt) + (D.payPlan === 'deposit' ? ' deposit' : ' paid') + ' by ' + payMethodLabel(D.payMethod);
    }
    return saveLabel() + (t != null ? ' · ' + money(t) : '');
  }
  // When the order was taken, for orders keyed in later (phone or walk-in written down first). Lead-time reports rely on it.
  function takenHtml() {
    var o = D.taken || 'now', opts = [['now', 'Today'], ['yesterday', 'Yesterday'], ['other', 'Another date']];
    return '<p class="sl-k tk-k">When did the customer place this order?</p><p class="ccs-hint">Choose the day the customer first ordered, even if you are entering it later.</p><div class="ccs-chips tk-chips" role="group" aria-label="Date the customer placed the order">' + opts.map(function (x) { return '<button type="button" class="ccs-chip" data-act="n-taken" data-v="' + x[0] + '" aria-pressed="' + (o === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (o === 'other' ? '<div class="sl-sub tk-sub"><label class="sl-k" for="n-takedate">Date order was taken</label><input class="ccs-input" id="n-takedate" type="date" data-n="takenDate" max="' + today() + '" value="' + esc(D.takenDate || '') + '"></div>' : '') +
      '<p class="ccs-hint">The CRM automatically records when this entry is saved.</p>';
  }
  function takenAt() {
    var o = D.taken || 'now';
    if (o === 'now' || o === 'today') return null;
    var d = o === 'yesterday' ? addDays(today(), -1) : D.takenDate;
    if (!d) return null;
    // Date-only input: noon Fiji time avoids inventing a customer-provided time.
    // Reports use the Fiji calendar date, not this placeholder clock time.
    return d + 'T12:00:00+12:00';
  }
  function submitOrder() {
    var L = S.setup.location, price = dTotal(), custom = D.finish === 'custom';
    if (STEPPER && !D.req && !custom) {
      var pn = slNeeds(7); if (pn.length) { D.err = pn.join('. ') + '.'; D.errField = 'stage'; return refreshStep(); }
      if (D.payPlan === 'full' || D.payPlan === 'deposit') { D.confirmNow = true; D.askDeposit = false; D.deposit = ''; D.payNow = true; if (D.payPlan === 'full') D.payAmount = String(price); }
      else { D.payNow = false; D.payAmount = ''; }
    }
    if (custom && phBusy(D.photos)) { D.err = 'Photos are still uploading. Wait a moment, then save again.'; D.errField = null; return refreshStep(); }
    var dep = D.confirmNow && !custom && D.askDeposit ? num(D.deposit) : null;
    var payAmt = D.payNow ? num(D.payAmount) : null;
    if (D.payNow && (!payAmt || payAmt <= 0)) { D.err = 'Enter the amount the customer is paying.'; D.errField = 'payment'; return refreshStep(); }
    var p = { idempotency_key: D.key, location: 'corner-cafe', source: D.source, product_code: D.req ? 'custom-cake' : D.product, variant: D.variant, size_inch: D.req ? null : D.size, quantity: D.qty,
      finish: D.finish, design: D.design, attachments: custom ? D.photos.filter(function (x) { return x.status === 'done'; }).map(function (x) { return x.path; }) : [], message: D.message, candles: D.candles, occasion: occSend(), has_dietary: D.diet, dietary: D.diet === 'yes' ? D.diets : [], dietary_note: D.dietNote, notes: D.notes,
      date: D.date, time: D.time, rush: tooSoon() ? { reason: D.rush, approved_by: D.rushBy } : null, confirm_now: D.confirmNow && !custom, deposit_required: dep,
      payment: payAmt ? { amount: payAmt, method: D.payMethod, kind: dep ? 'deposit' : (payAmt >= price ? 'full' : 'deposit') } : null,
      delivery: D.method === 'delivery' ? { method: 'delivery', zone: D.zone, address: D.address, fee: zoneObj() && zoneObj().fee == null ? num(D.fee) : null, contact: D.contact } : { method: 'collection' } };
    if (D.req) { p.size_note = (D.sizeNote || '').trim(); p.price = num(D.reqPrice) > 0 ? num(D.reqPrice) : null; }
    if (D.customer) { p.customer_id = D.customer.id; if (D.optIn === true || D.optIn === false) p.consent = D.optIn ? 'yes' : 'no'; } else if (D.noMob === 'none') p.customer = { name: D.name, phone: '', email: D.email, whatsapp: false, opt_in: false, no_contact: true };
    else p.customer = { name: D.name, phone: D.phone, email: D.email, whatsapp: D.whatsapp, opt_in: D.optIn === true };
    if (D.heard && !D.customer) p.heard_from = D.heard;
    if (RECUR.indexOf(D.occasion) > -1) { if ((D.occFor || '').trim()) p.occasion_for = D.occFor.trim(); p.occasion_date = D.occDate || D.date; }
    var tkAt = takenAt();
    if ((D.reqs || []).indexOf('other') > -1 && !(D.reqNote || '').trim()) { D.err = 'Say what the other cake requirement is.'; D.errField = null; return refreshStep(); }
    if ((D.taken === 'other') && !D.takenDate) { D.err = 'Choose the date the order was taken, or pick Today.'; D.errField = null; return refreshStep(); }
    if (tkAt && Date.parse(tkAt) > Date.now() + 60000) { D.err = 'The order date cannot be in the future. Check the date, or pick Today.'; D.errField = null; return refreshStep(); }
    S.busy = true; refreshStep();
    sb.rpc('staff_create_order', { p: p }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) {
        D.err = r.data.message;
        var map = { phone: 0, name: 0, customer: 0, product: 1, variant: 1, size: 1, finish: 2, design: 2, message: 2, candles: 2, diet: 2, date: 3, rush: 3, rushBy: 3, time: 3, full: 3, zone: 3, address: 3, fee: 3, method: 3, deposit: 4 };
        var f = r.data.field || r.data.error, s = map[f] != null ? map[f] : 4; D.errField = r.data.field || null;
        if (SLIP) { var sm = { phone: 1, name: 1, customer: 1, source: 1, product: 0, variant: 0, size: 0, size_note: 0, price: 0, finish: 0, design: 0, message: 4, candles: 4, diet: 4, occasion: 4, date: 3, rush: 3, rushBy: 3, time: 3, full: 3, zone: 3, address: 3, fee: 3, method: 3, deposit: 7, payment: 7 }; D.sl = sm[f] != null ? sm[f] : 7; if (D.sl === 7) D.errField = null; refreshStep(); return; }
        if (s !== D.step) { var e = D.err, ef = D.errField; goStep(s); D.err = e; D.errField = ef; refreshStep(); } else refreshStep();
        return;
      }
      if ((D.reqs || []).length && r.data.order_id) sb.rpc('order_set_requirements', { p_order: r.data.order_id, p_reqs: D.reqs, p_note: D.reqNote || '' }).then(function (x) { if (x.error || (x.data && !x.data.ok)) toast('Order saved, but the cake requirements were not: ' + ((x.data && x.data.message) || 'add them with Change order.'), true); });
      if (tkAt && r.data.order_id) sb.rpc('order_set_taken', { p_order: r.data.order_id, p_at: tkAt }).then(function (x) { if (x.error || (x.data && !x.data.ok)) toast('Order saved, but the original order date was not recorded' + (x.data && x.data.message ? ': ' + x.data.message : '.'), true); });
      S.wl = {}; loadOrders(true); if (p.rush && p.rush.approved_by) rememberName(p.rush.approved_by);
      if (newInSheet()) { if (D.fromCal) calSaved(r.data); else homeSaved(r.data, !!((D.email || '').trim() || (D.customer && D.customer.email))); return; }
      D.result = r.data; view(); toast(r.data.reference + ' saved');
    }).catch(function (e) {
      S.busy = false; console.error(e); var k = errKind(e);
      if (k === 'expired') { refreshStep(); return sessionExpired(); }
      D.errField = null;
      D.err = k === 'offline' ? 'Not saved: no internet connection. Everything you entered is kept. Try again when connected.' : k === 'denied' ? 'Not saved: your login cannot create orders. Ask a manager.' : 'Not saved. Everything you entered is kept. Try again.';
      refreshStep();
    });
  }

  // ---------- calendar ----------
  // Pickup calendar: Year, Month, Week and Day. Dates are the scheduled collection or delivery date (business time zone).
  var CAL_LIST = 'id,reference,revision,order_status,payment_status,production_status,fulfilment_method,delivery_zone,source,required_date,required_time,estimate_total,final_total,has_dietary,rush_override,customer_notes,contact_name,contact_phone,contact_email,customers(full_name,phone),order_items(product_name,variant,size_inch,quantity,finish,design_description,cake_message,dietary,dietary_note),order_amendments(kitchen_ack_required,kitchen_ack_at)';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var CAL_STATUS = [['active', 'All active orders'], ['needs', 'Needs attention'], ['confirmed', 'Confirmed'], ['done', 'Handed over'], ['off', 'Cancelled or declined']];
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
    return sb.from('orders').select(CAL_LIST).eq('is_test', false).gte('required_date', rg[0]).lte('required_date', rg[1])
      .order('required_date', { ascending: true }).order('required_time', { ascending: true }).limit(1000)
      .then(withContact).then(function (r) {
        if (seq !== c.seq) return; if (r.error) throw r.error;
        c.rows = r.data || []; c.range = key; c.loading = false; c.err = false; c.fails = 0; c.at = Date.now(); calRefresh();
      }).catch(function (e) {
        if (seq !== c.seq) return; console.error(e); c.loading = false;
        if (errKind(e) === 'expired') return sessionExpired();
        c.fails = (c.fails || 0) + 1;
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
      (full ? '<span class="ccs-cev-c">' + esc(cakeLine(i)) + '</span><span class="ccs-tags">' + pill(o.order_status, o.fulfilment_method) + (dl ? '<span class="ccs-tag t-info">Delivery</span>' : '') + (o.has_dietary ? '<span class="ccs-pill s-alert">Dietary or allergy</span>' : '') + (amendWaiting(o) ? '<span class="ccs-pill s-amend">Change for kitchen</span>' : '') + '</span>' : '') + '</button>';
  }
  // One order per slim row: time, customer and order number with the cake, one marker. A tap opens the order pop-up.
  function calRow(o) {
    var i = firstItem(o) || {}, cu = o.customers || {}, f = phoneFlag(o), edge = f ? (f[1] === 'is-red' ? 'pf-red' : 'pf-amber') : 'pf-none';
    return '<button type="button" class="cq-row ' + edge + (S.cal.justAdded === o.id ? ' is-new' : '') + '" data-act="cal-pre" data-id="' + o.id + '">' +
      '<span class="cq-t">' + esc(t12(o.required_time)) + (o.fulfilment_method === 'delivery' ? '<small>Delivery</small>' : '') + '</span>' +
      '<span class="cq-m"><b>' + esc(cu.full_name || o.contact_name || 'Customer') + '</b><span>' + esc(o.reference) + ' · ' + esc(cakeLine(i)) + '</span>' +
      (f ? '<em class="ccs-prow-f cq-f ' + f[1] + '">' + esc(f[0]) + '</em>' : (o.order_status === 'completed' ? '<em class="cq-done">Handed over</em>' : '')) + '</span></button>';
  }
  function calErrBox(act) { return '<div class="ccs-empty ccs-calerr" role="alert"><b>We couldn\'t load the calendar.</b><span>This is a connection problem, not an empty day. Nothing has changed.</span><button type="button" class="ccs-btn" data-act="' + act + '">Try again</button></div>'; }

  function calendarView() {
    var c = S.cal;
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Calendar</h1><p class="ccs-sub">By pickup or delivery date. Cancelled orders are left out.</p>' + (c.view !== 'year' && !c.err ? freshLine(c.at, c.fails, 'cal-retry') : '') + '</div></div>';
    h += '<div class="ccs-calbar"><div class="ccs-calnav"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="cal-today">Today</button>' +
      '<button type="button" class="ccs-calarrow" data-act="cal-move" data-v="-1" aria-label="Previous ' + c.view + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg></button>' +
      '<button type="button" class="ccs-calarrow" data-act="cal-move" data-v="1" aria-label="Next ' + c.view + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 18.6 10 20l8-8-8-8-1.4 1.4 6.6 6.6z"/></svg></button>' +
      '<h2 class="ccs-caltitle" aria-live="polite">' + esc(calTitle()) + '</h2></div>' +
      '<div class="ccs-tabs ccs-calviews" role="group" aria-label="Calendar view">' + [['year', 'Year'], ['month', 'Month'], ['week', 'Week'], ['day', 'Day']].map(function (v) { return '<button type="button" class="ccs-tab" data-act="cal-view" data-v="' + v[0] + '" aria-pressed="' + (c.view === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
    if (c.view === 'year') h += '<div class="ccs-calfilt"><span class="ccs-label">Shade days by</span><div class="ccs-tabs" role="group" aria-label="Shade days by">' + [['orders', 'Orders'], ['cakes', 'Cakes']].map(function (v) { return '<button type="button" class="ccs-tab" data-act="cal-basis" data-v="' + v[0] + '" aria-pressed="' + (c.basis === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
    else h += '<div class="ccs-calfilt"><label class="ccs-show" for="cal-status"><span>Show</span><select class="ccs-input" id="cal-status">' + CAL_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (c.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="ccs-show" for="cal-type"><span>Type</span><select class="ccs-input" id="cal-type">' + [['all', 'Collections and deliveries'], ['collection', 'Collections only'], ['delivery', 'Deliveries only']].map(function (s) { return '<option value="' + s[0] + '"' + (c.type === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label></div>';
    var body = c.view === 'year' ? calYear() : (c.err ? calErrBox('cal-retry') : (c.loading && !c.rows.length ? '<p class="ccs-loading">Loading the calendar…</p>' : (c.view === 'month' ? calMonth() : c.view === 'week' ? calWeek() : calDayView())));
    return h + '<div class="ccs-calwrap"><div class="ccs-calbody">' + body + '</div><aside class="ccs-calside" aria-label="Selected day">' + (c.view === 'day' && !c.pre ? '<div class="ccs-calhint"><b>Select an order</b><p class="ccs-hint">A short preview appears here, with Open order and Change order.</p></div>' : dayPanel()) + '</aside></div>';
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
        cells += '<button type="button" class="ccs-yday l' + lvl(n) + (iso === t ? ' is-today' : '') + (iso === c.sel ? ' is-sel' : '') + (r && r.attention ? ' has-need' : '') + (isClosed(iso) ? ' is-closed' : '') + '" data-act="cal-sel" data-v="' + iso + '" aria-label="' + esc(nice(iso) + ': ' + (r ? countText(r).replace(' · ', ', ') + (r.attention ? ', ' + r.attention + (r.attention === 1 ? ' needs action' : ' need action') : '') : 'no orders')) + '"' + (iso === c.sel ? ' aria-pressed="true"' : '') + '>' + d + '</button>';
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
        '<button type="button" class="ccs-mday" data-act="cal-sel" data-v="' + d + '" aria-label="' + esc(nice(d, true) + ', ' + (shut ? 'closed' : tot.orders ? countText(tot) : 'no pickups') + (need ? ', ' + need + (need === 1 ? ' needs action' : ' need action') : '')) + '"' + (d === c.sel ? ' aria-pressed="true"' : '') + '>' +
        '<b>' + (+d.slice(8)) + '</b>' + (tot.orders ? '<span class="ccs-mcount"><span class="ccs-mlong">' + countText(tot) + '</span><span class="ccs-mshort">' + tot.orders + '</span></span>' : (shut ? '<span class="ccs-mcount">Closed</span>' : '')) +
        (need ? '<span class="ccs-mneed"><span class="ccs-mlong">' + need + (need === 1 ? ' needs action' : ' need action') + '</span></span>' : '') + '</button>' +
        '</div>';
    }
    return h + '</div></div>';
  }

  function calWeek() {
    var c = S.cal, w = weekStart(c.anchor), days = [], t = today(), nt = nowHM(), add = canP('ord.create'), slots = calSlots();
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
    var list = calDay(d), tot = dayTotals(list), add = canP('ord.create') && d >= today() && !isClosed(d);
    return '<section class="ccs-wday' + (d === today() ? ' is-today' : '') + '"><div class="ccs-wday-head"><button type="button" class="ccs-wday-date" data-act="cal-sel" data-v="' + d + '"><b>' + esc(nice(d, true)) + '</b><span>' + (isClosed(d) ? 'Closed' : tot.orders ? countText(tot) : 'No pickups scheduled') + '</span></button>' +
      (add ? '<button type="button" class="ccs-btn ccs-new ccs-small" data-act="cal-add" data-v="' + d + '">' + NAV_ICON['new'] + 'New order</button>' : '') + '</div>' +
      (list.length ? '<div class="ccs-daylist">' + list.map(function (o) { return calChip(o, true); }).join('') + '</div>' : '') + '</section>';
  }

  function calDayView() {
    var c = S.cal, d = c.anchor, list = calDay(d), tot = dayTotals(list), t = today(), nt = nowHM(), add = canP('ord.create'), shut = isClosed(d);
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
    var list = calDay(d), tot = dayTotals(list), shut = isClosed(d), add = canP('ord.create') && d >= today() && !shut;
    h += '<div class="ccs-daytot"><div><b>' + tot.orders + '</b><span>' + (tot.orders === 1 ? 'order' : 'orders') + '</span></div><div><b>' + tot.cakes + '</b><span>' + (tot.cakes === 1 ? 'cake' : 'cakes') + '</span></div></div>';
    if (shut) h += '<p class="ccs-note">The café is closed for cake collections on this day.</p>';
    h += capLine(d);
    if (add) h += '<button type="button" class="ccs-btn ccs-new ccs-wide" data-act="cal-add" data-v="' + d + '">' + NAV_ICON['new'] + 'New order for this date</button>';
    h += calAsk();
    // Same count and words as the calendar square, so the two never disagree
    var flagged = list.filter(function (o) { return NEEDS.indexOf(o.order_status) > -1; }).length;
    if (flagged) h += '<p class="cq-dayneed"><i aria-hidden="true"></i>' + flagged + (flagged === 1 ? ' needs action' : ' need action') + '</p>';
    h += list.length ? '<div class="ccs-daylist cq-list">' + list.map(calRow).join('') + '</div>'
      : '<div class="ccs-empty"><b>No pickups scheduled</b>' + (c.status !== 'active' || c.type !== 'all' ? '<span>Nothing matches the filters for this day.</span>' : '') + '</div>';
    if (c.view !== 'day') h += '<button type="button" class="ccs-link" data-act="cal-openday" data-v="' + d + '">Open the day by time</button>';
    return h + '</div>';
  }
  function previewPanel() {
    var c = S.cal, o = c.rows.filter(function (r) { return r.id === c.pre; })[0];
    if (!o) { c.pre = null; return dayPanel(); }
    var i = firstItem(o) || {}, cu = o.customers || {}, dl = o.fulfilment_method === 'delivery', orderer = canP('ord.edit'), notes = [];
    if (o.has_dietary) notes.push(['alert', 'Dietary or allergy: ' + ([].concat(i.dietary || [], i.dietary_note ? [i.dietary_note] : []).join(', ') || 'see the order')]);
    if (amendWaiting(o)) notes.push(['amend', 'Changed. The kitchen has not confirmed the change yet.']);
    if (o.rush_override) notes.push(['', 'Short-notice order']);
    if (i.cake_message) notes.push(['', 'Message on the cake: “' + i.cake_message + '”']);
    if (i.finish === 'custom' && i.design_description) notes.push(['', 'Design: ' + i.design_description]);
    if (o.customer_notes) notes.push(['', 'Notes: ' + o.customer_notes]);
    var amend = orderer && OPEN.indexOf(o.order_status) > -1 && (o.production_status !== 'ready' || canP('ord.override'));
    var brief = orderer && (o.order_status === 'confirmed' || o.order_status === 'completed');
    return '<div class="ccs-dayp ccs-pre"><button type="button" class="ccs-link" data-act="cal-pre" data-id="">Back to ' + esc(nice(o.required_date)) + '</button>' +
      '<h2 class="ccs-dayp-title">' + esc(o.reference) + '</h2><div class="ccs-tags">' + pill(o.order_status, o.fulfilment_method) + (o.revision ? '<span class="ccs-pill s-amend">Amended</span>' : '') + '</div>' +
      '<dl class="ccs-kv">' + kv('Customer', cu.full_name) + kv(dl ? 'Delivery' : 'Collection', nice(o.required_date, true) + ' at ' + t12(o.required_time)) + kv('Cake', cakeLine(i)) + kv('Cakes', String(cakesOf(o))) +
      (dl ? kv('Area', o.delivery_zone) : '') + kv('Kitchen', o.order_status === 'confirmed' || o.order_status === 'completed' ? (STAGE_LABEL[o.production_status] || '') : '') + kv('Payment', PAY[o.payment_status] || '') + '</dl>' +
      (notes.length ? '<ul class="ccs-prenotes">' + notes.map(function (n) { return '<li' + (n[0] ? ' class="is-' + n[0] + '"' : '') + '>' + esc(n[1]) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="ccs-actions"><button type="button" class="ccs-btn ccs-wide" data-act="open-order" data-id="' + o.id + '">Open order</button>' +
      (amend ? '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="cal-amend" data-id="' + o.id + '">Change order</button>' : '') +
      (brief ? '<button type="button" class="ccs-btn ccs-ghost ccs-wide" data-act="cal-brief" data-id="' + o.id + '">Print kitchen slip</button>' : '') +
      '<p class="ccs-hint">Payments, status and handover are in Open order. Date changes go through Change order, so they are checked and kept in the change history.</p></div></div>';
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
  // New order opens in a panel over the current screen (side workspace on wide screens, full screen on phones)
  // ---------- Counter tablet: the same New order flow, full screen, large touch sizes. Same rules, same database. ----------
  function fsOn() { var d = document.documentElement; try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(function () {}); } catch (e) {} }
  function fsOff() { try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) {} }
  function tabletOn() {
    if (!canP('ord.create')) return;
    S.tablet = true; document.documentElement.classList.add('ccs-tablet-mode'); fsOn();
    if (S.sheet && S.sheet.type !== 'new' && S.sheet.type !== 'tbhome') sheetClose('replace');
    tabletHomeOpen();
  }
  function tabletOff() {
    S.tablet = false; document.documentElement.classList.remove('ccs-tablet-mode'); fsOff();
    if (S.sheet && (S.sheet.type === 'tbhome' || S.sheet.type === 'new')) sheetClose();
    if (S.tab !== 'today') goTab('today'); else view();
  }
  function tabletHomeOpen(saved) { S.tbSaved = saved || null; S.sheet = { type: 'tbhome' }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet(); }
  function tabletTools() { return '<span class="tb-tools"><button type="button" class="ccs-btn ccs-ghost tb-fs" data-act="tb-fs">' + (document.fullscreenElement ? 'Leave full screen' : 'Full screen') + '</button></span>'; }
  function tabletHome() {
    var r = S.tbSaved, draft = draftHasContent();
    var h = '<div class="ccs-sheet-head tb-head"><h2 class="ccs-title">Corner Café · Counter tablet</h2>' + tabletTools() + '<button type="button" class="ccs-btn ccs-ghost tb-exit" data-act="tb-exit">Exit tablet mode</button></div><div class="ccs-sheet-body tb-home">';
    if (r) h += '<div class="tb-saved' + (r.noPhone ? ' tb-nophone' : '') + '" role="status">' + (r.noPhone ? '<span class="tb-ref">' + esc(r.reference) + '</span><b>Write this number on their receipt</b>' : '<b>' + esc(r.reference) + ' saved</b>') + '<span>' + esc(r.msg || '') + '</span>' + (r.slip ? '<button type="button" class="ccs-btn ccs-ghost" data-act="open-slip" data-id="' + r.order_id + '">Make the kitchen slip</button>' : '') + '</div>';
    h += '<button type="button" class="tb-start" data-act="tb-new">' + NAV_ICON['new'] + '<b>' + (draft ? 'Carry on with the unfinished order' : 'Start a new cake order') + '</b><span>' + (draft ? 'Everything entered so far is kept.' : 'One step at a time. Tap Next when each step is done.') + '</span></button>';
    if (draft) h += '<button type="button" class="ccs-btn ccs-ghost tb-fresh" data-act="tb-fresh">Start again with a blank order</button>';
    return h + '</div>';
  }
  function newStart() {
    if (!canP('ord.create')) return;
    if (newInSheet()) return;
    if (S.sheet && hasTyping()) { toast('Save or cancel your changes first.', true); return; }
    if (D.result) D = freshDraft();
    D.fromCal = false; D.err = null; D.errField = null; D.confirmReset = false;
    S.sheet = { type: 'new' }; S.panel = null; S.panelErr = null; S.dirty = {}; sheetOpen(); renderSheet();
    var sbody = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (sbody) sbody.scrollTop = 0;
  }
  // Saved from the New order panel: back to Today, with the new order at the top of Needs attention
  function homeSaved(r, hadEmail) {
    var savedWhen = D.date && D.time ? nice(D.date) + ', ' + t12(D.time) : '', noPh = D.noMob === 'none';
    var noPhTxt = noPh ? 'No phone: write ' + r.reference + ' on their receipt. They quote it when they collect. ' : '';
    if (S.tablet) {
      D = freshDraft(); clearDraft(); S.justAdded = r.order_id;
      var st = r.status === 'confirmed' ? 'Confirmed' : r.status === 'awaiting_deposit' ? 'Waiting for the deposit' : r.status === 'awaiting_quote' ? 'Needs a price' : r.status === 'awaiting_review' ? 'Waiting for a check' : 'Saved';
      sheetClose('replace'); tabletHomeOpen({ reference: r.reference, order_id: r.order_id, slip: r.status === 'confirmed' && validRef(r.reference), msg: (noPh ? 'They quote it when they collect. ' : '') + st + (savedWhen ? ' for ' + savedWhen : '') + '.' + (hadEmail || noPh ? '' : ' No email address was given, so no email was sent.'), noPhone: noPh });
      return;
    }
    D = freshDraft(); clearDraft();
    sheetClose();
    S.justAdded = r.order_id; clearTimeout(homeSaved.t); homeSaved.t = setTimeout(function () { S.justAdded = null; if (S.tab === 'today' || S.tab === 'orders') view(); }, 12000);
    if (S.tab !== 'today') goTab('today'); else view();
    var when = savedWhen ? ' for ' + savedWhen : '';
    var where = r.status === 'confirmed' ? 'Confirmed' + when + '.' : r.status === 'awaiting_deposit' ? 'Waiting for the deposit' + when + '.' : r.status === 'awaiting_quote' ? 'Needs a price' + when + '.' : r.status === 'awaiting_approval' ? 'Waiting for the customer to agree the price' + when + '.' : 'Saved' + when + ', waiting in Needs attention.';
    // A confirmed order goes to the kitchen: the message offers Make kitchen slip (the board also shows No slip yet until one is made)
    var slipNow = r.status === 'confirmed' && validRef(r.reference);
    if (noPh) { toast(noPhTxt + where, false, { label: 'Open order', id: r.order_id }); openOrder(r.order_id); return; }
    toast(r.reference + ' saved. ' + where + (slipNow ? ' Make the kitchen slip now.' : '') + (hadEmail ? '' : ' No email address was given, so no email was sent.'), false, slipNow ? { label: 'Make kitchen slip', id: r.order_id, act: 'open-slip' } : { label: 'Open order', id: r.order_id });
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
    toast(r.reference + ' saved for ' + nice(d) + (t ? ' at ' + t12(t) : '') + '. ' + (r.status === 'confirmed' ? 'Confirmed.' : r.status === 'awaiting_deposit' ? 'Waiting for the deposit.' : 'Waiting in Needs attention.'));
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
      sb.from('orders').select(CAL_LIST).eq('is_test', false).eq('required_date', d).limit(300).then(withContact).then(function (r) {
        if (r.error) throw r.error; S.wl[d] = { at: Date.now(), rows: r.data || [] };
        if (newOpen() && (SLIP ? slStage() === 3 : D.step === 3) && D.date === d) refreshStep();
      }).catch(function (e) { console.error(e); S.wl[d] = { at: Date.now(), err: true }; if (newOpen() && (SLIP ? slStage() === 3 : D.step === 3) && D.date === d) refreshStep(); });
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
    var c = S.cust; c.loaded = false; c.loadErr = null; view();
    var req;
    if (c.q.trim().length < 2) return clLoad();
    req = sb.rpc('staff_search_customers', { q: c.q });
    return req.then(function (r) { if (r.error) throw r.error; c.rows = r.data || []; c.count = c.rows.length; c.loaded = true; if (S.tab === 'customers') view(); })
      .catch(function (e) { var m = readErr(e, 'customers'); if (m == null) return; c.loadErr = m; if (S.tab === 'customers') view(); });
  }
  // ---------- reminders due: guests who agreed to messages, occasion coming up ----------
  S.rem = { rows: null, at: 0, err: null, open: false };
  function loadReminders(force) {
    if (!canP('cust.followup')) return;
    if (!force && (S.rem.err || S.rem.busy || (S.rem.rows && Date.now() - S.rem.at < 300000))) return;
    S.rem.busy = true;
    sb.rpc('staff_reminders_due').then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message);
      S.rem.busy = false; S.rem.rows = r.data.rows || []; S.rem.at = Date.now(); S.rem.err = null; if (S.tab === 'customers') view();
    }).catch(function (e) { console.error(e); S.rem.busy = false; S.rem.err = 'We couldn\'t load the reminders. Try again.'; if (S.tab === 'customers') view(); });
  }
  function remText(r) {
    var first = String(r.name || '').trim().split(/\s+/)[0] || 'there', occ = String(r.reason || 'your celebration').replace(/ \(".*$/, '');
    return 'Hi ' + first + ', it is Corner Café. Your ' + occ.charAt(0).toLowerCase() + occ.slice(1) + ' is coming up on ' + nice(r.date, true) + '. Would you like us to make the cake again? Reply here and we will help you order.';
  }
  function remindersBox() {
    if (!canP('cust.followup')) return '';
    loadReminders(false);
    var R2 = S.rem, all = R2.rows, rows = all && all.filter(function (r) { return !r.reconfirm; }), held = all ? all.length - rows.length : 0;
    var heldNote = held ? '<p class="ccs-hint ccs-rem-held">' + held + ' more guest' + (held > 1 ? 's have' : ' has') + ' an occasion coming but ' + (held > 1 ? 'their' : 'their') + ' permission needs confirming, so ' + (held > 1 ? 'they are' : 'they are') + ' left out. Confirm permission on the guest\'s profile first.</p>' : '';
    if (R2.err) return '<section class="ccs-box ccs-rem"><h3>Reminders due</h3><p class="ccs-err">' + esc(R2.err) + ' <button type="button" class="ccs-link" data-act="rem-reload">Try again</button></p></section>';
    if (!rows) return '<section class="ccs-box ccs-rem"><h3>Reminders due</h3><p class="ccs-loading">Loading…</p></section>';
    if (!rows.length) return '<section class="ccs-box ccs-rem"><h3>Reminders due</h3><p class="ccs-hint">No reminders due. Guests appear here about two weeks before an occasion, if they agreed to messages.</p>' + heldNote + '</section>';
    if (!R2.show) return '<section class="ccs-box ccs-rem ccs-rem-fold"><h3>Reminders due <span class="ccs-count">' + rows.length + '</span></h3><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="rem-show" aria-expanded="false">Show</button></section>';
    var show = R2.open ? rows : rows.slice(0, 3);
    return '<section class="ccs-box ccs-rem"><div class="ccs-rem-head"><h3>Reminders due <span class="ccs-count">' + rows.length + '</span></h3><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="rem-show" aria-expanded="true">Hide</button></div><p class="ccs-hint">Guests who agreed to messages, with an occasion coming up. The message opens in WhatsApp for you to check and send yourself. Nothing is sent automatically.</p>' +
      show.map(function (r) {
        return '<div class="ccs-rem-row"><div><b>' + esc(r.name) + '</b><span>' + esc(r.reason || 'Occasion') + ' · ' + esc(nice(r.date, true)) + (r.cake ? ' · usually ' + esc(r.cake) : '') + '</span></div>' +
          '<div class="ccs-actions-row"><a class="ccs-btn ccs-ghost" href="' + esc(waLink(r.phone) + '?text=' + encodeURIComponent(remText(r))) + '" target="_blank" rel="noopener">WhatsApp message</a><button type="button" class="ccs-btn ccs-ghost" data-act="rem-sent" data-id="' + r.id + '" data-v="' + esc(r.date) + '">Mark as sent</button></div></div>';
      }).join('') + (rows.length > 3 ? '<button type="button" class="ccs-link" data-act="rem-more">' + (R2.open ? 'Show fewer' : 'Show all ' + rows.length) + '</button>' : '') + heldNote + '</section>';
  }
  function customersView() {
    var c = clState();
    if (c.mode === 'dups' && canP('cust.merge')) return clDupsView();
    if (c.mode === 'log') return s5LogView();
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Customers</h1><p class="ccs-sub">Spend counts collected orders only.</p></div>' +
      '<div class="ccs-headacts"><input class="ccs-input ccs-search" id="ccs-cq" aria-label="Search customers" type="search" placeholder="Name, mobile, email or C-number" value="' + esc(c.q) + '">' +
      (canP('cust.create') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cust-new">Add customer</button>' : '') + '</div></div>';
    if (c.q.trim().length >= 2) h += '<p class="ccs-hint cm-gline">Search results. Clear the search to use filters and groups.</p>';
    else { var cs = crmSec(); h += crmBar(cs); if (cs !== 'all') return h + crmView(cs); h += remindersBox() + clToolbar(); }
    if (!c.loaded) return h + (c.loadErr ? loadErr(c.loadErr, 'cust-reload') : '<p class="ccs-loading">Loading customers…</p>');
    var rows = c.rows;
    if (!rows.length) return h + '<div class="ccs-empty"><b>' + (Object.keys(c.flt || {}).length || c.seg !== 'all' ? 'No customers match these filters.' : 'No customers in this group yet.') + '</b><span>' + (Object.keys(c.flt || {}).length ? 'Remove a filter to see more.' : 'Customers are added automatically when an order is placed.') + '</span></div>';
    h += '<div class="ccs-table-wrap"><table class="ccs-table"><thead><tr><th>Customer</th><th>Mobile</th><th class="ccs-num">Orders</th><th class="ccs-num">Spend</th><th class="ccs-col-wide">Last order</th><th class="ccs-col-wide">Usually orders</th><th>Marketing</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="ccs-click" data-act="open-customer" data-id="' + r.id + '"><td data-label="Customer"><b style="color:var(--ccs-ink)">' + esc(r.full_name) + '</b>' + (r.seg_upcoming_occasion ? '<br><span class="ccs-pill s-deposit">Occasion ' + esc(nice(r.next_occasion_date)) + '</span>' : '') + '</td><td data-label="Mobile" class="ccs-nowrap">' + esc(r.phone) + '</td><td class="ccs-num" data-label="Orders">' + r.orders_count + '</td><td class="ccs-num" data-label="Spend">' + money(r.completed_spend) + '</td><td class="ccs-col-wide" data-label="Last order">' + (r.last_order_at ? esc(stamp(r.last_order_at).split(',')[0]) : '—') + '</td><td class="ccs-col-wide" data-label="Usually orders">' + esc(r.favourite_cake || '—') + '</td><td data-label="Marketing">' + (r.marketing_opt_in ? (r.consent_reconfirm ? '<span class="ccs-pill s-deposit">To confirm</span>' : '<span class="ccs-pill s-good">Yes</span>') : '<span class="ccs-quiet-no">No</span>') + '</td></tr>';
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
      canP('cust.consent') ? sb.from('consent_now').select('channel,destination,granted,needs_reconfirm,source,wording_code,recorded_at,applies,brand_code').eq('customer_id', id).eq('brand_code', 'corner-cafe') : Promise.resolve({ data: [] }),
      canP('cust.consent') ? sb.from('marketing_consents').select('channel,destination,granted,needs_reconfirm,source,recorded_at').eq('customer_id', id).order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(12) : Promise.resolve({ data: [] }),
      sb.rpc('customer_sheet_orders', { p_customer: id }),
      sb.from('customers').select('id,customer_no,full_name').eq('merged_into', id)
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      if (!S.sheet || S.sheet.id !== id) return;
      if (rs[1].data && rs[1].data.merged_into) { toast('That profile was merged into another. Opening the main profile.'); return openCustomer(rs[1].data.merged_into); }
      var from = rs[6].data || [];
      S.sheet.data = { sum: rs[0].data || {}, c: rs[1].data, orders: rs[2].data || [], now: rs[3].data || [], log: rs[4].data || [], sheet: (rs[5].data && rs[5].data.ok && rs[5].data.orders) || [], mergedFrom: from }; renderSheet();
      // Marketing permission given on a merged profile is part of this customer's record
      if (from.length && canP('cust.consent')) {
        sb.from('marketing_consents').select('channel,destination,granted,needs_reconfirm,source,recorded_at').in('customer_id', from.map(function (x) { return x.id; })).order('recorded_at', { ascending: false }).limit(12).then(function (r) {
          if (r.error || !S.sheet || S.sheet.id !== id || !S.sheet.data) return;
          S.sheet.data.log = S.sheet.data.log.concat(r.data || []).sort(function (a, b) { return a.recorded_at < b.recorded_at ? 1 : -1; }).slice(0, 12); renderSheet();
        });
      }
    }).catch(function (e) {
      var m = readErr(e, 'this customer'); if (m == null || !S.sheet || S.sheet.id !== id) return;
      if (S.sheet.data) { toast('Not up to date: ' + m.charAt(0).toLowerCase() + m.slice(1) + ' Close and open the profile again.', true); return; }
      S.sheet.err = m; renderSheet();
    });
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
    if (!d) return sheetHead(S.sheet.err ? 'Customer' : 'Loading…') + '<div class="ccs-sheet-body">' + (S.sheet.err ? loadErr(S.sheet.err, 'cust-reopen') : '<p class="ccs-loading">Loading customer…</p>') + '</div>';
    var s = d.sum, c = d.c, editor = canP('cust.edit');
    var segs = [['seg_repeat', 'Repeat'], ['seg_first_time', 'First-time'], ['seg_high_value', 'High value'], ['seg_inactive', 'Inactive'], ['seg_birthday_buyer', 'Birthday buyer'], ['seg_corporate', 'Corporate']].filter(function (x) { return s[x[0]]; });
    var h = sheetHead(esc(c.full_name)) + '<div class="ccs-sheet-body">';
    h += '<p class="ccs-hint">Customer ' + esc(custNo(c.customer_no)) + (c.archived_at ? ' · Archived' : '') + '</p>';
    if (c.full_name === NO_CONTACT) h += '<p class="ccs-note" role="note"><b>Shared record for orders with no contact. Never message.</b> The number here is the café&#39;s own. Each order keeps the customer&#39;s real name.</p>';
    if (c.review_flag === 'possible_duplicate') h += '<p class="ccs-warn"><b>Check for a duplicate.</b> ' + esc(c.review_note || 'Another profile has the same mobile number.') + (canP('cust.merge') ? ' <button type="button" class="ccs-link" data-act="ws-cm-dups-open">Review duplicates</button>' : '') + '</p>';
    if ((d.mergedFrom || []).length) h += '<p class="ccs-hint">Merged into this profile: ' + esc(d.mergedFrom.map(function (x) { return custNo(x.customer_no) + ' ' + x.full_name; }).join(', ')) + '.</p>';
    var ctc = c.phone && c.full_name !== NO_CONTACT ? '<a class="ccs-btn ccs-ghost" href="' + esc(waLink(c.phone)) + '" target="_blank" rel="noopener">WhatsApp</a><a class="ccs-btn ccs-ghost" href="tel:' + esc(digits(c.phone)) + '">Call</a>' : '';
    if ((editor && !c.archived_at && c.full_name !== NO_CONTACT) || ctc) h += '<div class="ccs-actions-row ccs-cust-acts">' + (editor && !c.archived_at && c.full_name !== NO_CONTACT ? '<button type="button" class="ccs-btn ccs-new" data-act="cust-neworder">' + NAV_ICON['new'] + 'New order for this customer</button>' : '') + ctc + '</div>';
    // One page, plain tables: details, orders, notes, permission
    var cpDate = function (iso) { return iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''; };
    var row = function (k, v, raw) { return v || v === 0 ? '<tr><th scope="row">' + esc(k) + '</th><td>' + (raw ? v : esc(v)) + '</td></tr>' : ''; };
    var mk = '';
    if (canP('cust.consent')) mk = CHANNELS.map(function (ch) { var st = consentLine(d, ch[0]); return ch[1] + ': ' + st.text; }).join(' · ');
    var cut = [['overview', h.length]];
    h += '<section class="ccs-box cp-sec" id="cp-overview"><h3>Guest details</h3>';
    if (S.sheet.edit) h += customerEditor(d);
    else {
      if (editor) h += wipBanner('cu:' + S.sheet.id, 'changes to this customer');
      h += '<table class="cp-table"><tbody>' +
        row('Mobile', c.phone) + row('Other number', c.alt_phone) + row('Email', c.email) +
        row('Prefers', { whatsapp: 'WhatsApp', phone: 'Phone call', email: 'Email' }[c.preferred_contact]) + row('Company', c.company) + row('Delivery address', c.delivery_address) +
        row('Birthday', birthday(c.birth_day, c.birth_month)) + row('Preferences', c.preferences) + row('Service notes', c.notes) +
        row('Came from', CUSTOMER_SOURCE[c.customer_source] || SOURCE_LABEL[s.first_source]) + row('Usually orders', s.favourite_cake) + row('Occasions', (s.occasions || []).join(', ')) +
        row('Next occasion', s.seg_upcoming_occasion ? nice(s.next_occasion_date, true) : '') +
        row('Orders', s.orders_count + (s.cancelled_count ? ' (' + s.cancelled_count + ' cancelled)' : '')) + row('Spend', money(s.completed_spend) + (s.average_spend != null ? ', average ' + money(s.average_spend) : '')) +
        row('Groups', segs.map(function (x) { return x[1]; }).join(', ')) + row('Marketing', mk) + '</tbody></table>' +
        '<div class="ccs-actions-row ccs-more-row">' +
        (editor ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cust-edit">Edit details</button>' : '') +
        (canP('cust.comms') ? '<button type="button" class="ccs-btn ccs-ghost" data-act="cust-history">' + (S.sheet.hist ? 'Hide change history' : 'Change history') + '</button>' : '') +
        '<button type="button" class="ccs-btn ccs-ghost" data-act="ws-cm-s5-rep" aria-expanded="' + !!S.sheet.rep + '">Customer report</button></div>';
      h += s5ReportPanel();
      if (S.sheet.hist) h += customerHistory();
    }
    h += '</section>';
    // Orders, newest first
    var ords = d.orders.slice().sort(function (a, b) { return a.required_date < b.required_date ? 1 : -1; });
    cut.push(['orders', h.length]);
    h += '<section class="ccs-box cp-sec" id="cp-orders"><h3>Orders (' + ords.length + ')</h3>' + (ords.length ? '<div class="cp-scroll"><table class="cp-table cp-list"><thead><tr><th scope="col">Date</th><th scope="col">Order</th><th scope="col">Cake</th><th scope="col">Status</th><th scope="col" class="ccs-num">Price</th>' + (editor && !c.archived_at ? '<th scope="col"><span class="ccs-sr">Repeat</span></th>' : '') + '</tr></thead><tbody>' +
      ords.map(function (o) { var i = (o.order_items || [])[0];
        return '<tr class="ccs-click" data-act="open-order" data-id="' + o.id + '"><td data-label="Date" class="cp-nw">' + esc(cpDate(o.required_date)) + '</td><td data-label="Order" class="cp-nw">' + esc(o.reference) + '</td><td data-label="Cake">' + esc(cakeLine(i)) + (i && i.occasion ? '<br><span class="ccs-hint">' + esc(i.occasion) + '</span>' : '') + (o.contact_name && o.contact_name !== c.full_name ? '<br><span class="ccs-hint">Ordered as ' + esc(o.contact_name) + '</span>' : '') + '</td><td data-label="Status">' + esc(statusLabel(o.order_status, o.fulfilment_method)) + (o.order_status === 'confirmed' || o.order_status === 'completed' ? '<br><span class="ccs-hint">' + esc(PAY[o.payment_status] || '') + '</span>' : '') + '</td><td class="ccs-num" data-label="Price">' + money(o.final_total != null ? o.final_total : o.estimate_total) + '</td>' +
          (editor && !c.archived_at ? '<td>' + (i ? '<button type="button" class="ccs-link" data-act="ws-repeat" data-id="' + o.id + '" aria-label="Repeat order ' + esc(o.reference) + '">Repeat</button>' : '') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' + (editor ? '<p class="ccs-hint">Repeat starts a new order with today\'s prices. You choose the date and check the message and dietary needs again.</p>' : '') : '<p class="ccs-hint">No orders.</p>');
    if (d.sheet.length) h += '<h4 class="cp-sub">From the old sheets</h4><p class="ccs-hint">Recorded in the Google Sheets before this app. Shown as typed; not yet in the totals.</p><div class="cp-scroll"><table class="cp-table cp-list"><thead><tr><th scope="col">Date</th><th scope="col">Cake</th><th scope="col">Recorded in</th><th scope="col" class="ccs-num">Value</th></tr></thead><tbody>' + d.sheet.map(function (o) {
        return '<tr><td data-label="Date">' + esc(o.fulfil_date ? nice(o.fulfil_date) + ' ' + o.fulfil_date.slice(0, 4) : 'No pickup date') + '</td><td data-label="Cake">' + esc([o.cake, o.size_inch ? o.size_inch + ' inch' : ''].filter(Boolean).join(' ') || 'Cake not stated') + (o.name_on_sheet && o.name_on_sheet !== c.full_name ? '<br><span class="ccs-hint">as ' + esc(o.name_on_sheet) + '</span>' : '') + '</td><td data-label="Recorded in">' + esc(o.source || '') + (o.reference ? ' ' + esc(o.reference) : '') + (canP('mgmt.register') ? ' <button type="button" class="ccs-link" data-act="rg-open" data-v="' + esc(o.rec_key) + '">Full record</button>' : '') + '</td><td class="ccs-num" data-label="Value">' + (o.value != null ? money(o.value) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    h += '</section>';
    // Notes and follow-ups
    cut.push(['notes', h.length]);
    if (wsCanRead()) h += '<section class="cp-sec" id="cp-notes"><h3 class="cp-h">Notes and follow-ups</h3>' + wsView() + '</section>';
    // Marketing permission
    cut.push(['comms', h.length]);
    if (canP('cust.consent')) {
      h += '<section class="ccs-box cp-sec" id="cp-comms"><h3>Marketing permission: Corner Café</h3><p class="ccs-hint">Only message customers by a channel marked Yes. A yes is kept with the number or email it was given for, so a new number starts at Not asked.</p><table class="cp-table"><tbody>' +
        CHANNELS.map(function (ch) {
          var st = consentLine(d, ch[0]);
          var btns = st.none ? '' : ' <span class="ccs-consent-acts">' + (st.yes && !st.re ? '' : '<button type="button" class="ccs-link" data-act="consent-ch" data-ch="' + ch[0] + '" data-v="true">' + (st.yes ? 'Customer reconfirmed' : 'Customer said yes') + '</button>') +
            (st.no ? '' : ' <button type="button" class="ccs-link ccs-red" data-act="consent-ch" data-ch="' + ch[0] + '" data-v="false">' + (st.yes ? 'Customer said stop' : 'Customer said no') + '</button>') + '</span>';
          return '<tr><th scope="row">' + ch[1] + '</th><td><span class="' + st.cls + '">' + esc(st.text) + '</span>' + btns + '</td></tr>';
        }).join('') + '</tbody></table>' +
        (d.log.length ? '<h4 class="cp-sub">Permission history</h4><div class="cp-scroll"><table class="cp-table cp-list"><thead><tr><th scope="col">Date</th><th scope="col">Channel</th><th scope="col">Answer</th><th scope="col">Number or email</th><th scope="col">Source</th></tr></thead><tbody>' + d.log.map(function (l) {
          return '<tr><td data-label="Date">' + esc(stamp(l.recorded_at)) + '</td><td data-label="Channel">' + esc((CHANNELS.filter(function (x) { return x[0] === l.channel; })[0] || [0, l.channel])[1]) + '</td><td data-label="Answer">' + (l.granted ? 'Yes' : 'No') + (l.needs_reconfirm ? ', needs reconfirming' : '') + '</td><td data-label="Number or email">' + esc(l.destination) + '</td><td data-label="Source">' + esc(l.source) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '') +
        '<p class="ccs-hint ws-service">Messages about an order, such as ready for collection or a change, are service messages and do not need marketing permission.</p></section>';
    }
    // One section at a time under the name and contact buttons, so the profile fits the screen
    if (S.sheet.edit) S.sheet.sec = Object.assign(S.sheet.sec || {}, { cust: 'overview' });
    return secSplit(h, cut, 'cust', { overview: 'Details', orders: 'Orders (' + ords.length + ')', notes: 'Notes and follow-ups', comms: 'Permission' }) + '</div>';
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
      ta('ce-prefs', 'Preferences', c.preferences, 'For example: less sweet, prefers chocolate, collects after 5 PM') +
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
    h += '<div class="ccs-field"><span class="ccs-label">Marketing: did the customer agree to receive Corner Café cake specials and reminders, and offers from Jack&#39;s Restaurants?</span><div class="ccs-chips">' +
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
      if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message);
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
      wipPut('cu:' + id, null); clearBusy(); S.sheet.edit = false; S.sheet.conflict = null; S.sheet.ordersChoice = null; S.sheet.hist = null; S.panelErr = null; S.dirty = {}; toast(msg);
      openCustomer(id, true); if (S.cust.loaded) loadCustomers();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function setChannelConsent(ch, yes) {
    var id = S.sheet.id;
    return sb.rpc('staff_set_channel_consent', { p_customer: id, p_channels: [ch], p_granted: yes, p_note: null }).then(function (r) {
      if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message);
      clearBusy(); toast(yes ? 'Recorded: customer said yes' : 'Recorded: customer said no'); openCustomer(id, true); if (S.cust.loaded) loadCustomers();
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  // Says "copied" only when the copy actually worked (B19)
  function copyText(text, msg) {
    var no = function () { toast('Could not copy. Select the text and copy it by hand.', true); };
    var fb = function () { if (fallbackCopy(text)) toast(msg); else no(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fb); else fb();
  }
  function fallbackCopy(text) { var t = document.createElement('textarea'), ok = false; t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.remove(); return !!ok; }

/*@DASH@*/
  // ---------- settings ----------
  function loadSettings() {
    S.settings = null; S.setErr = null; view();
    var reqs = [sb.from('locations').select('*').eq('code', 'corner-cafe').single(), sb.from('closed_dates').select('*').gte('closed_on', today()).order('closed_on'), sb.from('products').select('*, product_sizes(*), product_variants(*)').order('sort'), sb.from('delivery_zones').select('*').order('sort')];
    var nil = Promise.resolve(null); reqs.push(canP('staff.users') ? sb.rpc('admin_list_team') : nil); reqs.push(canP('ord.restore') ? sb.rpc('admin_deleted_orders') : nil); reqs.push(canP('staff.permissions') ? sb.rpc('admin_levels') : nil);
    Promise.all(reqs).then(function (rs) { rs.forEach(function (r) { if (r && r.error) throw r.error; }); S.settings = { loc: rs[0].data, closed: rs[1].data || [], products: rs[2].data || [], zones: rs[3].data || [], team: rs[4] ? (rs[4].data && rs[4].data.team) || [] : null, deleted: rs[5] && rs[5].data && rs[5].data.ok ? rs[5].data.orders : null, levels: rs[6] && rs[6].data && rs[6].data.ok ? rs[6].data.levels : null }; if (S.tab === 'settings') view(); s5SettingsLoad(); prLoad(); mirLoad(); alLoad(); occLoad(); }).catch(function (e) {
      console.error(e); if (errKind(e) === 'expired') return sessionExpired();
      S.setErr = errKind(e) === 'offline' ? 'No internet connection, so we couldn\'t load the settings.' : errKind(e) === 'denied' ? 'Your login cannot see these settings. Ask a manager.' : 'We couldn\'t load the settings. Try again.';
      if (S.tab === 'settings') view();
    });
  }
  function reloadLoc() {
    return sb.from('locations').select('*').eq('code', 'corner-cafe').single().then(function (r) {
      if (r.error) throw r.error; if (S.settings) { S.settings.loc = r.data; if (S.tab === 'settings') view(); }
    }).catch(function (e) { console.error(e); });
  }
  function onlineBox(L, st) {
    var ask = st.onlineAsk;
    var h = '<details open><summary>Online orders <span>' + (L.accepts_online ? 'Taking orders' : 'Paused') + '</span></summary><div class="ccs-set-body">' +
      '<p><b>' + (L.accepts_online ? 'The website is taking cake orders.' : 'Website cake orders are paused.') + '</b></p>';
    if (ask) {
      h += '<div class="ccs-panel" role="group" aria-label="Confirm">' + (ask === 'off' ?
        '<p><b>Pause website cake orders?</b></p><p class="ccs-hint">Guests will see a message asking them to call the café. Orders already placed are not changed.</p>' :
        '<p><b>Start taking cake orders on the website again?</b></p><p class="ccs-hint">Guests can place orders straight away, within the notice and collection hours you set.</p>') +
        (st.onlineErr ? '<p class="ccs-err" role="alert">' + esc(st.onlineErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn' + (ask === 'off' ? ' ccs-danger' : ' ccs-good') + '" data-act="online-yes">' + (ask === 'off' ? 'Pause website orders' : 'Take website orders') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="online-no">Cancel</button></div></div>';
    } else {
      h += '<button type="button" class="ccs-btn ccs-ghost" data-act="online-ask" data-v="' + (L.accepts_online ? 'off' : 'on') + '">' + (L.accepts_online ? 'Pause website orders' : 'Take website orders again') + '</button>' +
        '<p class="ccs-hint">When paused, the website asks guests to call the café.</p>';
    }
    return h + '</div></details>';
  }
  // ---------- cake menu editor (Settings): add and change cakes, flavours, sizes and prices ----------
  function menuList(st) {
    var ps = st.products.slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    return '<p class="ccs-hint">Changes show on the staff order slip, the printed slip and the website order form as soon as they are saved. Nothing is deleted: take a cake, flavour or size off sale instead.</p>' +
      '<div class="ccs-menu-list">' + ps.map(function (p) {
        var sizes = (p.product_sizes || []).filter(function (s) { return s.active; }).sort(function (a, b) { return a.size_inch - b.size_inch; });
        var fl = (p.product_variants || []).filter(function (v) { return v.active; });
        var lo = sizes.length ? Math.min.apply(null, sizes.map(function (s) { return Number(s.price); })) : null, hi = sizes.length ? Math.max.apply(null, sizes.map(function (s) { return Number(s.price); })) : null;
        return '<div class="ccs-menu-row"><div><b>' + esc(p.name) + '</b><span>' + (p.status === 'active' ? 'On sale' : 'Off sale') + ' · ' + (sizes.length ? sizes.map(function (s) { return s.size_inch; }).join(', ') + ' inch' + (lo != null ? ', ' + money(lo) + (hi !== lo ? ' to ' + money(hi) : '') : '') : 'No sizes offered') + (fl.length ? ' · ' + fl.length + ' flavour' + (fl.length > 1 ? 's' : '') : '') + '</span></div>' +
          '<button type="button" class="ccs-btn ccs-ghost" data-act="mf-open" data-id="' + p.id + '" aria-label="Edit ' + esc(p.name) + '">Edit</button></div>';
      }).join('') + '</div><button type="button" class="ccs-btn" data-act="mf-open" data-id="">Add a cake</button>';
  }
  function mfFrom(p) {
    if (!p) return { id: null, name: '', description: '', image_url: '', choice_label: 'Which flavour?', flavours: [], sizes: [{ id: null, inch: '6', price: '', serves: '', active: true }, { id: null, inch: '8', price: '', serves: '', active: true }], lead_days: '', supports_custom: true, supports_message: true, dietary_info: '', allergen_info: '', status: 'active' };
    return { id: p.id, name: p.name, description: p.description || '', image_url: p.image_url || '', choice_label: p.choice_label || 'Which flavour?', lead_days: p.lead_days == null ? '' : String(p.lead_days), supports_custom: !!p.supports_custom, supports_message: !!p.supports_message,
      dietary_info: p.dietary_info || '', allergen_info: p.allergen_info || '', status: p.status,
      flavours: (p.product_variants || []).slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }).map(function (v) { return { id: v.id, name: v.name, active: v.active }; }),
      sizes: (p.product_sizes || []).slice().sort(function (a, b) { return a.size_inch - b.size_inch; }).map(function (s) { return { id: s.id, inch: String(s.size_inch), price: String(Number(s.price)), serves: s.serves_label || '', active: s.active }; }) };
  }
  function mfOpen(id) {
    var p = id ? S.settings.products.filter(function (x) { return x.id === id; })[0] : null;
    var f = mfFrom(p);
    S.mf = { f: f, orig: JSON.parse(JSON.stringify(f)), review: null, err: null, log: null };
    S.sheet = { type: 'menu' }; S.dirty = {}; sheetOpen(); renderSheet();
    if (id) sb.from('product_changes').select('changed_at, changed_by_label, summary').eq('product_id', id).order('changed_at', { ascending: false }).limit(8).then(function (r) { if (!r.error && S.mf && S.mf.f.id === id) { S.mf.log = r.data || []; if (S.sheet && S.sheet.type === 'menu') renderSheet(); } }, function () {});
  }
  function mfChanges() {
    var f = S.mf.f, o = S.mf.orig, out = [], big = false, isNew = !f.id;
    if (isNew) { out.push('New cake: ' + f.name.trim()); }
    else if (f.name.trim() !== o.name) out.push('Name: ' + o.name + ' to ' + f.name.trim());
    if (!isNew && f.status !== o.status) out.push(f.status === 'active' ? 'Back on sale' : 'Taken off sale');
    f.flavours.forEach(function (x) {
      var nm = x.name.trim(); if (!nm) return;
      var was = x.id ? o.flavours.filter(function (y) { return y.id === x.id; })[0] : null;
      if (!was) out.push('Flavour added: ' + nm + (x.active ? '' : ' (not offered)'));
      else { if (was.name !== nm) out.push('Flavour renamed: ' + was.name + ' to ' + nm); if (was.active !== x.active) out.push('Flavour ' + nm + ': ' + (x.active ? 'offered again' : 'no longer offered')); }
    });
    f.sizes.forEach(function (x) {
      var inch = parseInt(x.inch, 10), pr = num(x.price);
      var was = x.id ? o.sizes.filter(function (y) { return y.id === x.id; })[0] : null;
      if (!was) { out.push('Size added: ' + inch + ' inch at ' + (pr != null ? money(pr) : '?') + (x.active ? '' : ' (not offered)')); return; }
      var op = Number(was.price);
      if (pr != null && Math.round(pr * 100) !== Math.round(op * 100)) { var pc = op > 0 ? Math.round((pr - op) / op * 100) : null; if (pc === null || Math.abs(pc) > 30) big = true; out.push(inch + ' inch price: ' + money(op) + ' to ' + money(pr) + (pc === null ? '' : ' (' + (pc > 0 ? pc + '% higher' : -pc + '% lower') + ')')); }
      if (String(was.inch) !== String(inch)) out.push('Size changed: ' + was.inch + ' inch to ' + inch + ' inch');
      if ((was.serves || '') !== x.serves.trim()) out.push(inch + ' inch serves: ' + (x.serves.trim() || 'not shown'));
      if (was.active !== x.active) out.push(inch + ' inch: ' + (x.active ? 'offered again' : 'no longer offered'));
    });
    if (!isNew && (f.image_url || '') !== (o.image_url || '')) out.push(f.image_url ? (o.image_url ? 'Photo replaced' : 'Photo added') : 'Photo removed');
    [['description', 'Description'], ['choice_label', 'Flavour question'], ['lead_days', 'Notice days'], ['dietary_info', 'Dietary notes'], ['allergen_info', 'Allergen notes']].forEach(function (k) { if (!isNew && String(f[k[0]]).trim() !== String(o[k[0]]).trim()) out.push(k[1] + ': ' + (String(f[k[0]]).trim() || 'none')); });
    if (!isNew && f.supports_custom !== o.supports_custom) out.push(f.supports_custom ? 'Custom designs allowed' : 'Custom designs not allowed');
    if (!isNew && f.supports_message !== o.supports_message) out.push(f.supports_message ? 'Written message allowed' : 'Written message not allowed');
    return { list: out, big: big };
  }
  function mfCheck() {
    var f = S.mf.f, seen = {}, fseen = {};
    if (f.name.trim().length < 2) return 'Give the cake a name.';
    if ((f.description || '').trim().length > 160) return 'Keep the description to 160 characters.';
    if (S.mf.phBusy) return 'The photo is still uploading. Wait a moment.';
    var live = f.sizes.filter(function (s) { return s.active; });
    if (f.status === 'active' && !live.length) return 'A cake on sale needs at least one size offered.';
    for (var i = 0; i < f.sizes.length; i++) {
      var s = f.sizes[i], inch = parseInt(s.inch, 10), pr = num(s.price);
      if (!inch || inch < 3 || inch > 24 || String(inch) !== String(s.inch).trim()) return 'Each size must be a whole number of inches between 3 and 24.';
      if (seen[inch]) return 'The ' + inch + ' inch size is listed twice.'; seen[inch] = 1;
      if (pr == null || pr < 0) return 'Enter the price for the ' + inch + ' inch size.';
    }
    for (var j = 0; j < f.flavours.length; j++) { var n = f.flavours[j].name.trim().toLowerCase(); if (!n) continue; if (fseen[n]) return 'The flavour ' + f.flavours[j].name.trim() + ' is listed twice.'; fseen[n] = 1; }
    if (f.lead_days !== '' && (!/^\d+$/.test(String(f.lead_days).trim()) || Number(f.lead_days) > 60)) return 'Notice days must be a whole number up to 60, or blank for the usual notice.';
    return null;
  }
  function menuSheet() {
    var m = S.mf, f = m.f, isNew = !f.id;
    var h = sheetHead(isNew ? 'Add a cake' : esc(f.name || 'Cake')) + '<div class="ccs-sheet-body ccs-menued">';
    if (m.review) {
      var c = m.review;
      h += '<section class="ccs-box"><h3>Check before saving</h3>' + (c.list.length ? '<ul class="ccs-mf-changes">' + c.list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="ccs-hint">Nothing has changed.</p>') +
        (c.big ? '<p class="ccs-note"><b>This is a big price change.</b> Check the amount: new orders use it straight away. Orders already taken keep their price.</p>' : '<p class="ccs-hint">New orders on the slip and the website use this straight away. Orders already taken keep their name and price.</p>') +
        (m.err ? '<p class="ccs-err" role="alert">' + esc(m.err) + '</p>' : '') +
        '<div class="ccs-actions-row">' + (c.list.length ? '<button type="button" class="ccs-btn ccs-good" data-act="mf-save"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Saving…' : 'Save changes') + '</button>' : '') + '<button type="button" class="ccs-btn ccs-ghost" data-act="mf-edit">Back to editing</button></div></section>';
      return h + '</div>';
    }
    h += '<section class="ccs-box"><h3>Cake</h3><div class="ccs-field"><label class="ccs-label" for="mf-name">Name, as staff and guests see it</label><input class="ccs-input" id="mf-name" data-mf="name" maxlength="60" value="' + esc(f.name) + '" placeholder="For example: Tiramisu"></div>' +
      '<div class="ccs-chips" role="group" aria-label="On sale"><button type="button" class="ccs-chip" data-act="mf-status" data-v="active" aria-pressed="' + (f.status === 'active') + '">On sale</button><button type="button" class="ccs-chip" data-act="mf-status" data-v="hidden" aria-pressed="' + (f.status !== 'active') + '">Off sale</button></div></section>';
    // How the cake shows on the website: one photo and one line
    h += '<section class="ccs-box"><h3>On the website</h3><div class="ccs-mf-photo">' +
      (f.image_url ? '<img src="' + esc(f.image_url) + '" alt="' + esc(f.name) + '">' : '<span class="ccs-mf-nophoto">No photo yet</span>') +
      '<div><label class="ccs-btn ccs-ghost ccs-phadd"><input type="file" id="mf-photo" accept="image/jpeg,image/png,image/webp" class="ccs-sr">' + (S.mf.phBusy ? 'Uploading…' : f.image_url ? 'Replace photo' : 'Add a photo') + '</label>' +
      (f.image_url ? '<button type="button" class="ccs-link ccs-red" data-act="mf-photo-rm">Remove photo</button>' : '') +
      '<p class="ccs-hint">A square photo of the whole cake works best. JPG or PNG, up to 5 MB.</p>' + (S.mf.phErr ? '<p class="ccs-err" role="alert">' + esc(S.mf.phErr) + '</p>' : '') + '</div></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="mf-desc">Short description (optional)</label><input class="ccs-input" id="mf-desc" data-mf="description" maxlength="160" value="' + esc(f.description) + '" placeholder="For example: Baked New York style, rich and creamy"></div></section>';
    h += '<section class="ccs-box"><h3>Sizes and prices</h3><div class="ccs-mf-rows">' + f.sizes.map(function (s, i) {
      return '<div class="ccs-mf-row"><div class="ccs-field"><label class="ccs-label" for="mf-si-' + i + '">Size (inch)</label><input class="ccs-input" id="mf-si-' + i + '" data-mfs="' + i + '|inch" inputmode="numeric" value="' + esc(s.inch) + '"' + (s.id ? ' readonly' : '') + '></div>' +
        '<div class="ccs-field"><label class="ccs-label" for="mf-sp-' + i + '">Price (FJD)</label><input class="ccs-input" id="mf-sp-' + i + '" data-mfs="' + i + '|price" inputmode="decimal" value="' + esc(s.price) + '"></div>' +
        '<div class="ccs-field ccs-mf-wide"><label class="ccs-label" for="mf-sv-' + i + '">Serves (optional)</label><input class="ccs-input" id="mf-sv-' + i + '" data-mfs="' + i + '|serves" value="' + esc(s.serves) + '" placeholder="About 12–16 slices"></div>' +
        '<label class="ccs-check"><input type="checkbox" data-mfsa="' + i + '"' + (s.active ? ' checked' : '') + '> Offered</label>' + (!s.id ? '<button type="button" class="ccs-link ccs-red" data-act="mf-drop-size" data-v="' + i + '">Remove</button>' : '') + '</div>';
    }).join('') + '</div><button type="button" class="ccs-btn ccs-ghost" data-act="mf-add-size">Add a size</button><p class="ccs-hint">A size already used by orders cannot be renamed. Untick Offered to stop selling it.</p></section>';
    h += '<section class="ccs-box"><h3>Flavours</h3><p class="ccs-hint">Leave empty if this cake has no flavour choice.</p>' + (f.flavours.length ? '<div class="ccs-field"><label class="ccs-label" for="mf-q">Question staff and guests see</label><input class="ccs-input" id="mf-q" data-mf="choice_label" value="' + esc(f.choice_label) + '"></div>' : '') +
      '<div class="ccs-mf-rows">' + f.flavours.map(function (v, i) {
        return '<div class="ccs-mf-row"><div class="ccs-field ccs-mf-wide"><label class="ccs-label" for="mf-fl-' + i + '">Flavour</label><input class="ccs-input" id="mf-fl-' + i + '" data-mfv="' + i + '" maxlength="40" value="' + esc(v.name) + '"></div>' +
          '<label class="ccs-check"><input type="checkbox" data-mfva="' + i + '"' + (v.active ? ' checked' : '') + '> Offered</label>' + (!v.id ? '<button type="button" class="ccs-link ccs-red" data-act="mf-drop-flavour" data-v="' + i + '">Remove</button>' : '') + '</div>';
      }).join('') + '</div><button type="button" class="ccs-btn ccs-ghost" data-act="mf-add-flavour">Add a flavour</button></section>';
    h += '<details class="ccs-box ccs-mf-more"><summary>More settings</summary>' +
      '<div class="ccs-field"><label class="ccs-label" for="mf-lead">Notice needed (days, blank for the usual ' + S.settings.loc.lead_days_standard + ')</label><input class="ccs-input" id="mf-lead" data-mf="lead_days" inputmode="numeric" value="' + esc(f.lead_days) + '"></div>' +
      '<label class="ccs-check"><input type="checkbox" data-mfc="supports_custom"' + (f.supports_custom ? ' checked' : '') + '> Custom designs allowed</label>' +
      '<label class="ccs-check"><input type="checkbox" data-mfc="supports_message"' + (f.supports_message ? ' checked' : '') + '> Written message allowed</label>' +
      '<div class="ccs-field"><label class="ccs-label" for="mf-diet">Dietary notes for guests (optional)</label><input class="ccs-input" id="mf-diet" data-mf="dietary_info" value="' + esc(f.dietary_info) + '" placeholder="For example: Contains gelatine"></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="mf-allergen">Allergen notes (optional)</label><input class="ccs-input" id="mf-allergen" data-mf="allergen_info" value="' + esc(f.allergen_info) + '" placeholder="For example: Contains nuts, dairy, eggs"></div></details>';
    if (m.err) h += '<p class="ccs-err" role="alert">' + esc(m.err) + '</p>';
    h += '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="mf-review">Review changes</button><button type="button" class="ccs-btn ccs-ghost" data-act="close">Cancel</button></div>';
    if (m.log && m.log.length) h += '<section class="ccs-box"><h3>Recent changes</h3><div class="ccs-history">' + m.log.map(function (l) { return '<div><span>' + esc(stamp(l.changed_at)) + '</span><span>' + esc((l.summary || []).join('; ') || 'Changed') + ' · ' + esc(l.changed_by_label || 'Staff') + '</span></div>'; }).join('') + '</div></section>';
    return h + '</div>';
  }
  function mfInput(t) {
    var f = S.mf.f; S.mf.err = null;
    if (t.dataset.mf) f[t.dataset.mf] = t.value;
    else if (t.dataset.mfs) { var a = t.dataset.mfs.split('|'); f.sizes[Number(a[0])][a[1]] = t.value; }
    else if (t.dataset.mfv != null) f.flavours[Number(t.dataset.mfv)].name = t.value;
  }
  // Menu photo: goes to the public cake-menu folder; the cake keeps the link once the changes are saved
  function mfPhoto(file) {
    var m = S.mf; if (!file || !m) return;
    m.phErr = null;
    if (file.type && !/^image\/(jpeg|png|webp)$/.test(file.type)) { m.phErr = 'Choose a JPG, PNG or WebP photo.'; return renderSheet(); }
    if (file.size > 5 * 1024 * 1024) { m.phErr = 'That photo is over 5 MB. Choose a smaller one.'; return renderSheet(); }
    var ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), slug = (m.f.name || 'cake').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cake';
    var path = slug + '-' + Date.now().toString(36) + '.' + ext;
    m.phBusy = true; renderSheet();
    sb.storage.from('cake-menu').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false, cacheControl: '31536000' }).then(function (r) {
      m.phBusy = false;
      if (r.error) { m.phErr = /row-level|not allowed|unauthor/i.test(r.error.message || '') ? 'Only managers can change cake photos.' : 'The photo did not upload. Try again.'; return renderSheet(); }
      m.f.image_url = sb.storage.from('cake-menu').getPublicUrl(path).data.publicUrl; S.dirty['mf-ph'] = 1; renderSheet();
    }, function () { m.phBusy = false; m.phErr = 'The photo did not upload. Check the connection and try again.'; renderSheet(); });
  }
  function mfSave() {
    var m = S.mf, f = m.f; if (S.busy) return;
    var body = { id: f.id, name: f.name.trim(), description: (f.description || '').trim(), image_url: f.image_url || '', choice_label: f.flavours.length ? f.choice_label.trim() : null, lead_days: String(f.lead_days).trim(), supports_custom: f.supports_custom, supports_message: f.supports_message,
      dietary_info: f.dietary_info, allergen_info: f.allergen_info, status: f.status, summary: m.review.list,
      flavours: f.flavours.filter(function (v) { return v.name.trim(); }).map(function (v) { return { id: v.id, name: v.name.trim(), active: v.active }; }),
      sizes: f.sizes.map(function (s) { return { id: s.id, inch: parseInt(s.inch, 10), price: num(s.price), serves: s.serves.trim(), active: s.active }; }) };
    S.busy = true; renderSheet();
    sb.rpc('staff_save_product', { p: body }).then(function (r) {
      S.busy = false; if (r.error) throw r.error;
      if (!r.data.ok) { m.err = r.data.message; m.review = null; return renderSheet(); }
      S.dirty = {}; S.mf = null; sheetClose();
      toast(body.name + (r.data.created ? ' added to the menu' : ' saved') + '. New orders use it straight away.');
      refreshSetup(); loadSettings();
    }).catch(function (e) {
      S.busy = false; console.error(e); if (errKind(e) === 'expired') return sessionExpired();
      m.err = errKind(e) === 'offline' ? 'Not saved: no internet connection. Your changes are still here. Try again.' : errKind(e) === 'denied' ? 'Not saved: only managers can change the cake menu.' : 'Not saved. Your changes are still here. Try again.';
      renderSheet();
    });
  }
  // Settings: typing in a section is kept until that section is saved, and open sections stay open
  var SET_SAVES = { 'save-loc': 1, 'confirm-loc': 1, 'save-zones': 1, 'add-zone': 1, 'add-closed': 1, 'save-staff': 1, 'tm-add': 1, 'tm-reset-save': 1, 'bk-link': 1, 'pr-save': 1 };
  S.setTyped = {}; S.setOpen = {}; S.setSaved = null;
  function setSec(el) { var d = el.closest('details'), sm = d && d.querySelector('summary'); return sm ? (sm.firstChild && sm.firstChild.nodeType === 3 ? sm.firstChild.nodeValue : sm.textContent).trim() : ''; }
  function setKeep(m) {
    m.querySelectorAll('.ccs-set details').forEach(function (d) {
      var k = setSec(d.querySelector('summary') || d); if (S.setOpen[k] != null) d.open = S.setOpen[k];
      d.addEventListener('toggle', function () { S.setOpen[k] = d.open; });
    });
    var marked = {};
    Object.keys(S.setTyped).forEach(function (id) {
      var t = S.setTyped[id], el = document.getElementById(id); if (!el || !el.closest('.ccs-set')) return;
      if ('c' in t) el.checked = t.c; else el.value = t.v;
      marked[t.sec] = 1;
    });
    m.querySelectorAll('.ccs-set details').forEach(function (d) { if (marked[setSec(d.querySelector('summary') || d)]) setMark(d); });
    setFit(m);
  }
  // Settings fit the screen: a list of sections, and only the chosen one shown beside it
  function setFit(m) {
    var set = m.querySelector('.ccs-set'); if (!set) return;
    var ds = [].slice.call(set.children).filter(function (e) { return e.tagName === 'DETAILS'; }); if (ds.length < 2) return;
    var keys = ds.map(function (d) { return setSec(d.querySelector('summary')); });
    var cur = S.setCur; if (keys.indexOf(cur) < 0) { var o = ds.filter(function (d) { return d.open; })[0]; cur = o ? setSec(o.querySelector('summary')) : keys[0]; }
    var nav = document.createElement('div'); nav.className = 'ccs-setnav'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Settings sections');
    nav.innerHTML = keys.map(function (k, i) { var un = ds[i].querySelector('.ccs-unsaved'); return '<button type="button" class="ccs-secbtn" role="tab" data-setk="' + esc(k) + '">' + esc(k) + (un ? ' <em class="ccs-unsaved">Not saved yet</em>' : '') + '</button>'; }).join('');
    set.classList.add('is-fit'); set.insertBefore(nav, set.firstChild);
    var pick = function (k) {
      S.setCur = k;
      ds.forEach(function (d, i) { var on = keys[i] === k; d.classList.toggle('is-cur', on); if (on && !d.open) d.open = true; });
      [].forEach.call(nav.children, function (b) { b.setAttribute('aria-selected', String(b.dataset.setk === k)); });
    };
    nav.addEventListener('click', function (e) { var b = e.target.closest('[data-setk]'); if (b) { pick(b.dataset.setk); var mm = document.getElementById('ccs-main'); if (mm) mm.scrollTop = 0; } });
    ds.forEach(function (d, i) { var sm = d.querySelector('summary'); if (sm) sm.addEventListener('click', function (e) { e.preventDefault(); pick(keys[i]); }); });
    pick(cur);
  }
  function setMark(d) {
    var sm = d && d.querySelector('summary'); if (sm && !sm.querySelector('.ccs-unsaved')) sm.insertAdjacentHTML('beforeend', ' <em class="ccs-unsaved">Not saved yet</em>');
    var k = sm ? setSec(sm) : '', nb = k && [].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'), function (x) { return x.dataset.setk === k; })[0];
    if (nb && !nb.querySelector('.ccs-unsaved')) nb.insertAdjacentHTML('beforeend', ' <em class="ccs-unsaved">Not saved yet</em>');
  }
  function setTypedIn(t) {
    if (!t.id || !t.closest || !t.closest('.ccs-set details') || t.id === 'tm-new-p' || t.id.indexOf('tm-rp-') === 0) return;
    S.setTyped[t.id] = t.type === 'checkbox' ? { c: t.checked, sec: setSec(t) } : { v: t.value, sec: setSec(t) };
    setMark(t.closest('details'));
  }
  function setSavedOk() { var k = S.setSaved; if (k == null) return; Object.keys(S.setTyped).forEach(function (id) { if (S.setTyped[id].sec === k) delete S.setTyped[id]; }); S.setSaved = null; }
  function settingsView() {
    var h = '<div class="ccs-head"><div><h1 class="ccs-title">Settings</h1><p class="ccs-sub">Changes apply to the website order form straight away.</p></div></div>';
    var st = S.settings; if (!st) return h + (S.setErr ? loadErr(S.setErr, 'reload-settings') : '<p class="ccs-loading">Loading settings…</p>');
    var L = st.loc;
    h += '<div class="ccs-set">';
    h += onlineBox(L, st);
    h += '<details' + (!L.defaults_confirmed ? ' open' : '') + '><summary>Notice and collection hours <span>' + L.lead_days_standard + ' days standard · ' + L.lead_days_custom + ' days custom</span></summary><div class="ccs-set-body">' + (!L.defaults_confirmed ? '<p class="ccs-note">These are starting values. Check them, change any that are wrong, then press Confirm these are correct. This note goes once confirmed.</p>' : '') + '<div class="ccs-row">' +
      sf('st-lead-s', 'Notice for standard cakes (days)', L.lead_days_standard) + sf('st-lead-c', 'Notice for custom cakes (days)', L.lead_days_custom) + sf('st-ahead', 'Furthest ahead (days)', L.max_days_ahead) + '</div><div class="ccs-row">' +
      sf('st-open', 'First collection', L.collection_open.slice(0, 5), 'time') + sf('st-close', 'Last collection', L.collection_close.slice(0, 5), 'time') +
      '<div class="ccs-field"><label class="ccs-label" for="st-slot">Time slots</label><select class="ccs-input" id="st-slot">' + [15, 30, 60].map(function (m) { return '<option value="' + m + '"' + (L.slot_minutes === m ? ' selected' : '') + '>Every ' + m + ' minutes</option>'; }).join('') + '</select></div>' +
      sf('st-cap', 'Most cakes per day (blank for no limit)', L.daily_capacity == null ? '' : L.daily_capacity) + '</div>' +
      '<div class="ccs-actions-row">' + (L.defaults_confirmed ? '<button type="button" class="ccs-btn" data-act="save-loc">Save notice and hours</button>' : '<button type="button" class="ccs-btn" data-act="confirm-loc">Confirm these are correct</button>') + '</div></div></details>';
    h += '<details><summary>Closed days <span>' + (st.closed.length ? st.closed.length + ' coming up' : 'None') + '</span></summary><div class="ccs-set-body">' +
      (st.closed.length ? '<div class="ccs-history">' + st.closed.map(function (c) { return '<div><span>' + esc(nice(c.closed_on)) + '</span><span>' + esc(c.reason || 'Closed') + ' <button type="button" class="ccs-link ccs-red" data-act="del-closed" data-id="' + c.id + '">Remove</button></span></div>'; }).join('') + '</div>' : '<p class="ccs-hint">No closed days set.</p>') +
      '<div class="ccs-row">' + sf('st-cdate', 'Date', '', 'date') + sf('st-creason', 'Reason (optional)', '') + '</div><button type="button" class="ccs-btn ccs-ghost" data-act="add-closed">Add closed day</button></div></details>';
    h += '<details' + (S.menuOpen ? ' open' : '') + '><summary>Cakes and prices <span>' + st.products.filter(function (p) { return p.status === 'active'; }).length + ' cakes on sale</span></summary><div class="ccs-set-body">' + menuList(st) + '</div></details>';
    h += '<details><summary>Delivery areas <span>' + st.zones.filter(function (z) { return z.active; }).length + ' areas</span></summary><div class="ccs-set-body"><p class="ccs-hint">Leave the fee blank where staff set the fee for each order. Website guests cannot choose delivery yet.</p>' +
      st.zones.map(function (z) { return '<div class="ccs-row" style="align-items:end">' + sf('dz-n-' + z.id, 'Area', z.name, 'text') + sf('dz-f-' + z.id, 'Fee (FJD)', z.fee == null ? '' : Number(z.fee)) + '<label class="ccs-check" style="padding-bottom:14px"><input type="checkbox" id="dz-a-' + z.id + '"' + (z.active ? ' checked' : '') + '> Offered</label></div>'; }).join('') +
      '<button type="button" class="ccs-btn ccs-ghost" data-act="save-zones">Save delivery areas</button><div class="ccs-row" style="align-items:end">' + sf('dz-new-n', 'New area', '', 'text') + sf('dz-new-f', 'Fee (FJD)', '') + '<button type="button" class="ccs-btn ccs-ghost" data-act="add-zone">Add area</button></div></div></details>';
    h += occView(st);
    h += (st.team ? '' : s5PermView(st)) + s5BackupCheckView(st) + alertsView(st) + printView(st);
    if (st.team) {
      var tm = st.tmDraft || {};
      // One place for staff access: the team, the access levels, and the switches for each level and person
      var unwrap = function (x) { return String(x || '').replace(/^<details[^>]*>\s*<summary>[\s\S]*?<\/summary>\s*<div class="ccs-set-body">/, '').replace(/<\/div>\s*<\/details>\s*$/, ''); };
      var tt = ['team', 'levels', 'perms'].indexOf(st.tmTab) > -1 ? st.tmTab : 'team';
      h += '<details' + (st.tmOpen ? ' open' : '') + '><summary>Team and access <span>' + st.team.filter(function (u) { return u.active; }).length + ' with access</span></summary><div class="ccs-set-body">';
      h += '<div class="ccs-chips pm-tabs" role="group" aria-label="Team and access">' + [['team', 'Team'], ['levels', 'Access levels'], ['perms', 'Permissions']].map(function (x) { return '<button type="button" class="ccs-chip" data-act="tm-tab" data-v="' + x[0] + '" aria-pressed="' + (tt === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
      if (tt === 'levels') h += unwrap(levelsView(st)) + '</div></details>';
      else if (tt === 'perms') h += (canP('staff.permissions') ? unwrap(permView()) : '<p class="ccs-quiet">Your login cannot change permissions.</p>') + '</div></details>';
      if (tt === 'team') h += teamView(st) + '</div></details>';
      h += deletedView(st);
    }
    return h + '</div>';
  }
  // ---------- occasions and special dates: one master list; each year's date kept separately ----------
  // Mother's Day is created once; its 2026, 2027 and 2028 dates are separate rows, so years compare without duplicate occasions.
  var OCC_CAT = [['personal', 'Personal celebration'], ['holiday', 'Calendar holiday'], ['business', 'Business'], ['other', 'Other']];
  var OCC_COL = [['#C2410C', 'Orange'], ['#BE185D', 'Pink'], ['#9D174D', 'Plum'], ['#DC2626', 'Red'], ['#1D4ED8', 'Blue'], ['#0E7490', 'Teal'], ['#15803D', 'Green'], ['#7C3AED', 'Purple'], ['#4338CA', 'Indigo'], ['#A16207', 'Gold'], ['#B45309', 'Amber'], ['#334155', 'Slate'], ['#6B7280', 'Grey']];
  function occLoad() {
    var st = S.settings; if (!st || !(canP('mgmt.settings') || canP('mgmt.analytics'))) return;
    sb.rpc('occasion_admin').then(function (r) {
      if (S.settings !== st) return; if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message);
      st.occ = r.data; st.occErr = null; if (S.tab === 'settings') view();
    }).catch(function (e) { if (S.settings !== st) return; st.occErr = errKind(e) === 'offline' ? 'No internet connection.' : 'We couldn\'t load the occasions. Try again.'; if (S.tab === 'settings') view(); });
  }
  function occName(code) { var o = ((S.settings && S.settings.occ && S.settings.occ.occasions) || []).filter(function (x) { return x.code === code; })[0]; return o ? o.label : code; }
  function occView(st) {
    if (!(canP('mgmt.settings') || canP('mgmt.analytics'))) return '';
    var oc = st.occ, U = st.occUi = st.occUi || { tab: 'list', year: Number(today().slice(0, 4)) };
    var live = oc ? oc.occasions.filter(function (o) { return !o.merged_into; }) : [], yrs = oc ? oc.dates.map(function (d) { return d.year; }) : [];
    var tag = !oc ? (st.occErr ? 'Could not load' : 'Checking…') : live.filter(function (o) { return o.active; }).length + ' occasions' + (yrs.length ? ' · dates to ' + Math.max.apply(null, yrs) : '');
    var h = '<details' + (st.occOpen ? ' open' : '') + '><summary>Occasions and special dates <span>' + esc(tag) + '</span></summary><div class="ccs-set-body oc-set">';
    if (!oc) return h + (st.occErr ? '<p class="ccs-err" role="alert">' + esc(st.occErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="oc-reload">Try again</button>' : '<p class="ccs-loading">Checking…</p>') + '</div></details>';
    var ed = oc.can_edit;
    h += '<p class="ccs-hint">Each occasion is created once. Its date for each year is kept separately under Dates by year, so years can be compared without duplicate occasions.' + (ed ? '' : ' Your login can view these but not change them.') + '</p>';
    h += '<div class="ccs-chips pm-tabs" role="group" aria-label="Occasions">' + [['list', 'Occasions'], ['dates', 'Dates by year']].map(function (x) { return '<button type="button" class="ccs-chip" data-act="oc-tab" data-v="' + x[0] + '" aria-pressed="' + (U.tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (U.err && !U.edit && !U.dedit) h += '<p class="ccs-err" role="alert">' + esc(U.err) + '</p>';
    if (U.tab === 'dates') return h + occDatesView(oc, U, ed) + '</div></details>';
    var cat = function (k) { return ((OCC_CAT.filter(function (c) { return c[0] === k; })[0]) || ['', ''])[1]; };
    h += '<div class="oc-list">' + oc.occasions.map(function (o, k) {
      var st_ = o.merged_into ? 'Merged into ' + occName(o.merged_into) : !o.active ? 'Archived' : '';
      var row = '<div class="oc-row' + (o.active && !o.merged_into ? '' : ' is-off') + '"><i class="oc-dot" style="background:' + esc(o.colour) + '" aria-hidden="true"></i>' +
        '<span class="oc-n"><b>' + esc(o.label) + '</b><small>' + esc(cat(o.category)) + ' · ' + o.orders + (o.orders === 1 ? ' order' : ' orders') + (o.has_dates ? ' · has dates' : '') + (o.featured ? '' : ' · not on website list') + (st_ ? ' · ' + esc(st_) : '') + '</small></span>' +
        (ed && !o.merged_into ? '<span class="oc-acts">' + (!o.system ? '<button type="button" class="ccs-link" data-act="oc-up" data-v="' + o.code + '" aria-label="Move ' + esc(o.label) + ' up">↑</button><button type="button" class="ccs-link" data-act="oc-down" data-v="' + o.code + '" aria-label="Move ' + esc(o.label) + ' down">↓</button>' : '') +
          '<button type="button" class="ccs-link" data-act="oc-edit" data-v="' + o.code + '">' + (U.edit === o.code ? 'Close' : 'Edit') + '</button></span>' : '') + '</div>';
      if (U.edit === o.code) row += occForm(o, oc);
      return row;
    }).join('') + '</div>';
    if (ed) h += U.edit === '__new' ? occForm(null, oc) : '<button type="button" class="ccs-btn ccs-ghost" data-act="oc-edit" data-v="__new">+ Add an occasion</button>';
    return h + '</div></details>';
  }
  function occForm(o, oc) {
    var n = !o, f = 'oc-f-', U = S.settings.occUi;
    var h = '<div class="oc-form"><div class="ccs-row">' + sf(f + 'label', 'Name', n ? '' : o.label, 'text') +
      '<div class="ccs-field"><label class="ccs-label" for="' + f + 'cat">Category</label><select class="ccs-input" id="' + f + 'cat">' + OCC_CAT.map(function (c) { return '<option value="' + c[0] + '"' + ((n ? 'personal' : o.category) === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="' + f + 'col">Colour</label><select class="ccs-input" id="' + f + 'col">' + OCC_COL.map(function (c) { return '<option value="' + c[0] + '"' + ((n ? '#C2410C' : o.colour).toUpperCase() === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="ccs-check"><input type="checkbox" id="' + f + 'feat"' + (n || o.featured ? ' checked' : '') + '> Show in the occasion list on the order forms</label>' +
      '<label class="ccs-check"><input type="checkbox" id="' + f + 'dates"' + (!n && o.has_dates ? ' checked' : '') + '> Falls on a calendar date each year (for example Mother\'s Day)</label>' +
      (U.err ? '<p class="ccs-err" role="alert">' + esc(U.err) + '</p>' : '') + '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="oc-save" data-v="' + (n ? '' : o.code) + '">' + (n ? 'Add occasion' : 'Save changes') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="oc-edit" data-v="">Cancel</button></div>';
    if (!n && !o.system) {
      h += '<div class="oc-more"><button type="button" class="ccs-link" data-act="oc-archive" data-v="' + o.code + '">' + (o.active ? 'Archive (hide from the order forms, keep its history)' : 'Restore') + '</button>';
      var targets = oc.occasions.filter(function (x) { return x.code !== o.code && !x.merged_into && x.code !== 'not_specified'; });
      h += '<div class="oc-merge"><label class="ccs-label" for="oc-f-into">Merge into another occasion</label><div class="ccs-row" style="align-items:end"><select class="ccs-input" id="oc-f-into"><option value="">Choose…</option>' + targets.map(function (x) { return '<option value="' + x.code + '"' + (U.into === x.code ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select>' +
        (U.mergeAsk === o.code && U.into ? '<button type="button" class="ccs-btn ccs-danger" data-act="oc-merge-yes" data-v="' + o.code + '">Yes, merge</button>' : '<button type="button" class="ccs-btn ccs-ghost" data-act="oc-merge" data-v="' + o.code + '">Merge</button>') + '</div>' +
        (U.mergeAsk === o.code && U.into ? '<p class="ccs-note">' + o.orders + (o.orders === 1 ? ' order moves' : ' orders move') + ' to ' + esc(occName(U.into)) + '. The words written on past orders stay as they are. This cannot be undone.</p>' : '<p class="ccs-hint">Use this for duplicates, such as two spellings of the same occasion.</p>') + '</div>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function occDatesView(oc, U, ed) {
    var yrs = {}; oc.dates.forEach(function (d) { yrs[d.year] = 1; }); var ty = Number(today().slice(0, 4)); for (var y = ty - 2; y <= ty + 2; y++) yrs[y] = 1;
    var list = Object.keys(yrs).map(Number).sort();
    var h = '<div class="ccs-chips oc-years" role="group" aria-label="Year">' + list.map(function (y) { return '<button type="button" class="ccs-chip" data-act="oc-year" data-v="' + y + '" aria-pressed="' + (U.year === y) + '">' + y + '</button>'; }).join('') + '</div>';
    var rows = oc.dates.filter(function (d) { return d.year === U.year; });
    h += rows.length ? '<div class="oc-list">' + rows.map(function (d) {
      var o = oc.occasions.filter(function (x) { return x.code === d.code; })[0] || { label: d.code, colour: '#6B7280' };
      var promo = addDays(d.starts_on, -d.promo_days);
      var r = '<div class="oc-row"><i class="oc-dot" style="background:' + esc(o.colour) + '" aria-hidden="true"></i><span class="oc-n"><b>' + esc(o.label) + ' · ' + esc(nice(d.starts_on, true)) + (d.ends_on ? ' to ' + esc(nice(d.ends_on, true)) : '') + '</b>' +
        '<small>Start promoting ' + esc(nice(promo, true)) + ' (' + d.promo_days + ' days before)' + (d.source === 'rule' ? ' · set by the usual rule' : ' · edited') + (d.note ? ' · ' + esc(d.note) : '') + '</small></span>' +
        (ed ? '<span class="oc-acts"><button type="button" class="ccs-link" data-act="oc-dedit" data-v="' + d.id + '">' + (U.dedit === d.id ? 'Close' : 'Edit') + '</button></span>' : '') + '</div>';
      if (U.dedit === d.id) r += occDateForm(d, oc);
      return r;
    }).join('') + '</div>' : '<p class="ccs-hint">No dates set for ' + U.year + ' yet.</p>';
    if (ed) h += U.dedit === '__new' ? occDateForm(null, oc) : '<button type="button" class="ccs-btn ccs-ghost" data-act="oc-dedit" data-v="__new">+ Add a date for ' + U.year + '</button>';
    return h;
  }
  function occDateForm(d, oc) {
    var n = !d, U = S.settings.occUi, opts = oc.occasions.filter(function (x) { return !x.merged_into && !x.system; });
    return '<div class="oc-form"><div class="ccs-row">' +
      '<div class="ccs-field"><label class="ccs-label" for="oc-d-code">Occasion</label><select class="ccs-input" id="oc-d-code">' + opts.map(function (x) { return '<option value="' + x.code + '"' + ((n ? '' : d.code) === x.code ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></div>' +
      sf('oc-d-start', 'Date', n ? U.year + '-01-01' : d.starts_on, 'date') + sf('oc-d-end', 'Last day (optional)', n || !d.ends_on ? '' : d.ends_on, 'date') + '</div><div class="ccs-row">' +
      sf('oc-d-promo', 'Promote, days before', n ? 21 : d.promo_days) + sf('oc-d-note', 'Note (optional)', n ? '' : d.note || '', 'text') + '</div>' +
      (U.err ? '<p class="ccs-err" role="alert">' + esc(U.err) + '</p>' : '') + '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="oc-dsave" data-v="' + (n ? '' : d.id) + '">' + (n ? 'Add date' : 'Save date') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="oc-dedit" data-v="">Cancel</button></div></div>';
  }
  function occAct(a, b, v) {
    var st = S.settings; if (!st) return; var U = st.occUi = st.occUi || { tab: 'list', year: Number(today().slice(0, 4)) }; st.occOpen = true;
    var val = function (id) { var e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : null; };
    var done = function (msg) { return function (r) { clearBusy(); if (r.error) throw r.error; if (!r.data.ok) { U.err = r.data.message; view(); return; } U.err = null; U.edit = null; U.dedit = null; U.mergeAsk = null; U.into = null; Object.keys(S.setTyped || {}).forEach(function (id) { if (id.indexOf('oc-') === 0) delete S.setTyped[id]; }); if (msg) toast(typeof msg === 'function' ? msg(r.data) : msg); occLoad(); }; };
    var go = function (pr, msg, label) { markBusy(b, label || 'Saving…'); pr.then(done(msg)).catch(function (e) { clearBusy(); fail(e); }); };
    switch (a) {
      case 'oc-reload': st.occErr = null; occLoad(); view(); break;
      case 'oc-tab': U.tab = v; U.err = null; view(); break;
      case 'oc-year': U.year = Number(v); U.dedit = null; view(); break;
      case 'oc-edit': U.edit = U.edit === v ? null : v || null; U.mergeAsk = null; U.into = null; U.err = null; view(); break;
      case 'oc-dedit': U.dedit = U.dedit === v ? null : v || null; U.err = null; view(); break;
      case 'oc-up': case 'oc-down': go(sb.rpc('occasion_move', { p_code: v, p_dir: a === 'oc-up' ? -1 : 1 }), '', 'Moving…'); break;
      case 'oc-archive': { var o = st.occ.occasions.filter(function (x) { return x.code === v; })[0]; go(sb.rpc('occasion_archive', { p_code: v, p_archive: !!(o && o.active) }), o && o.active ? 'Archived. Its past orders keep it.' : 'Restored'); break; }
      case 'oc-save': go(sb.rpc('occasion_save', { p: { code: v || null, label: val('oc-f-label'), category: val('oc-f-cat'), colour: val('oc-f-col'), featured: val('oc-f-feat'), has_dates: val('oc-f-dates') } }), v ? 'Occasion saved' : 'Occasion added'); break;
      case 'oc-merge': U.into = val('oc-f-into'); U.mergeAsk = U.into ? v : null; U.err = U.into ? null : 'Choose the occasion to merge into.'; view(); break;
      case 'oc-merge-yes': go(sb.rpc('occasion_merge', { p_from: v, p_into: U.into }), function (d) { return 'Merged. ' + d.moved + (d.moved === 1 ? ' order moved.' : ' orders moved.'); }, 'Merging…'); break;
      case 'oc-dsave': go(sb.rpc('occasion_date_save', { p: { id: v || null, code: val('oc-d-code'), starts_on: val('oc-d-start'), ends_on: val('oc-d-end'), promo_days: val('oc-d-promo'), note: val('oc-d-note') } }), 'Date saved'); break;
    }
  }
  // ---------- order alerts (administrators choose who is emailed about new website orders) ----------
  function alLoad() {
    var st = S.settings; if (!st || !canP('mgmt.system')) return;
    sb.rpc('admin_alert_settings').then(function (r) {
      if (S.settings !== st) return; if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message);
      st.al = r.data; st.alList = (r.data.new_order || []).slice(); if (!st.alList.length) st.alList.push(''); st.alErr = null;
      if (S.tab === 'settings') view();
    }).catch(function (e) { if (S.settings !== st) return; st.alErr = errKind(e) === 'offline' ? 'No internet connection.' : 'We couldn\'t load the order alerts. Try again.'; if (S.tab === 'settings') view(); });
  }
  function alGrab() { var st = S.settings; if (!st || !st.alList) return; st.alList = st.alList.map(function (v, i) { var el = document.getElementById('al-e' + i); return el ? el.value : v; }); }
  function alertsView(st) {
    if (!canP('mgmt.system')) return '';
    var al = st.al, open = st.alOpen ? ' open' : '';
    var tag = !al ? (st.alErr ? 'Could not load' : 'Checking…') : (al.new_order || []).length + ((al.new_order || []).length === 1 ? ' person' : ' people');
    var h = '<details' + open + ' data-alopen="1"><summary>Order alerts <span>' + esc(tag) + '</span></summary><div class="ccs-set-body">';
    if (!al) return h + (st.alErr ? '<p class="ccs-err" role="alert">' + esc(st.alErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="al-reload">Try again</button>' : '<p class="ccs-loading">Checking…</p>') + '</div></details>';
    if (al.test_mode) h += '<p class="ccs-note">Test mode is on. Every alert currently goes only to ' + esc(al.test_email) + '. The addresses below take over when the site goes live.</p>';
    h += '<h3 class="ccs-seth">New website order</h3><p class="ccs-hint">Emailed as soon as a guest sends a cake request. Up to 5 people.</p>';
    h += st.alList.map(function (v, i) {
      return '<div class="ccs-row ccs-alrow"><div class="ccs-field"><label class="ccs-label" for="al-e' + i + '">Email ' + (i + 1) + '</label><input class="ccs-input" id="al-e' + i + '" type="email" autocomplete="off" value="' + esc(v) + '"></div>' +
        (st.alList.length > 1 ? '<button type="button" class="ccs-link ccs-red" data-act="al-del" data-v="' + i + '">Remove</button>' : '') + '</div>';
    }).join('');
    h += (st.alList.length < 5 ? '<button type="button" class="ccs-link" data-act="al-add">+ Add another email</button>' : '') +
      (st.alFormErr ? '<p class="ccs-err" role="alert">' + esc(st.alFormErr) + '</p>' : '') +
      '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="al-save">Save order alerts</button></div>';
    h += '<h3 class="ccs-seth">Kitchen slip</h3><p class="ccs-hint">Sent to ' + esc(al.kitchen || 'nobody yet') + (al.kitchen_copy ? ', with a copy to ' + esc(al.kitchen_copy) : '') + '. Change it under Kitchen printing.</p>';
    return h + '</div></details>';
  }
  function alSave() {
    var st = S.settings; alGrab(); st.alOpen = true;
    sb.rpc('admin_alert_settings_save', { p_emails: st.alList }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { st.alFormErr = r.data.message; view(); return; }
      st.alFormErr = null; st.al = r.data; st.alList = (r.data.new_order || []).slice(); S.dirty = {}; setSavedOk(); toast('Order alerts saved'); view();
    }).catch(fail);
  }
  // ---------- kitchen printing (administrators change it; managers see the delivery log) ----------
  function prLoad() {
    var st = S.settings; if (!st || !canSettings()) return;
    var reqs = [sb.rpc('admin_slip_log', { p_limit: 30 })]; if (canP('mgmt.system')) reqs.push(sb.rpc('admin_print_settings'));
    Promise.all(reqs).then(function (rs) {
      if (S.settings !== st) return;
      rs.forEach(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message); });
      st.prLog = rs[0].data.rows || []; if (rs[1]) st.pr = rs[1].data; st.prErr = null;
      if (S.tab === 'settings') view();
    }).catch(function (e) { if (S.settings !== st) return; st.prErr = errKind(e) === 'offline' ? 'No internet connection.' : 'We couldn\'t load kitchen printing. Try again.'; if (S.tab === 'settings') view(); });
  }
  var PR_STATUS = { sent: 'Emailed', pending: 'Waiting to send', sending: 'Sending', failed: 'Could not be delivered' };
  function prRowStatus(x) { return x.status === 'failed' && x.attempts < 5 ? 'Delayed, trying again' : PR_STATUS[x.status] || x.status; }
  function printView(st) {
    if (!canP('mgmt.settings')) return '';
    var pr = st.pr, log = st.prLog, open = st.prOpen ? ' open' : '';
    // Only the newest email for each order counts: once it is sent again, the old failure no longer needs attention
    var seen = {}, failed = (log || []).filter(function (x) { if (x.kind !== 'kitchen_slip' || seen[x.order_id]) return false; seen[x.order_id] = 1; return x.status === 'failed' && x.attempts >= 5 && x.version === x.latest_version; });
    var tag = !log ? (st.prErr ? 'Could not load' : 'Checking…') : failed.length ? failed.length + ' not delivered' : pr && !pr.verified ? 'Check the printer' : 'Working';
    var h = '<details' + open + '><summary>Kitchen printing <span>' + esc(tag) + '</span></summary><div class="ccs-set-body">';
    if (!log) return h + (st.prErr ? '<p class="ccs-err" role="alert">' + esc(st.prErr) + '</p><button type="button" class="ccs-btn ccs-ghost" data-act="pr-reload">Try again</button>' : '<p class="ccs-loading">Checking…</p>') + '</div></details>';
    if (failed.length) h += '<div class="ccs-alert" role="alert">' + failed.length + (failed.length > 1 ? ' kitchen slips' : ' kitchen slip') + ' could not be delivered: ' + esc(failed.map(function (x) { return x.reference + ' v' + x.version; }).join(', ')) + '. Check the printer email below, then press Send again, or print the slip from the order.</div>';
    if (pr) {
      if (pr.test_mode) h += '<p class="ccs-note">Test mode is on. Every slip goes only to ' + esc(pr.test_email) + ', not to the addresses below.</p>';
      if (!pr.verified) h += '<p class="ccs-note">The printer email or paper size changed. Send a test slip, check it printed correctly, then press It printed correctly.</p>';
      else if (pr.verified_note) h += '<p class="ccs-hint">Printer last checked: ' + esc(pr.verified_note) + '.</p>';
      h += '<div class="ccs-row">' + sf('pr-pri', 'Admin inbox (every slip is emailed here to print)', pr.primary, 'email') + sf('pr-bak', 'Counter inbox (gets the same email)', pr.backup, 'email') + '</div>' +
        '<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="pr-paper">Paper size</label><select class="ccs-input" id="pr-paper">' +
        [['A5', 'A5 (148 x 210 mm)'], ['DL', 'DL (99 x 210 mm)']].map(function (o) { return '<option value="' + o[0] + '"' + (pr.paper === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
        '<label class="ccs-check"><input type="checkbox" id="pr-on"' + (pr.on_new ? ' checked' : '') + '> Email the slip each time Print kitchen slip is pressed</label>' +
        (st.prFormErr ? '<p class="ccs-err" role="alert">' + esc(st.prFormErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="pr-save">Save printing settings</button><button type="button" class="ccs-btn ccs-ghost" data-act="pr-test">Send test slip</button>' +
        (!pr.verified && pr.last_test && pr.last_test.status === 'sent' ? '<button type="button" class="ccs-btn ccs-good" data-act="pr-ok">It printed correctly</button>' : '') + '</div>';
      if (pr.last_test) h += '<p class="ccs-hint">Last test slip: ' + esc(when(pr.last_test.at)) + ', ' + esc(prRowStatus({ status: pr.last_test.status, attempts: 5 }).toLowerCase()) + '.' + (pr.last_test.status === 'pending' || pr.last_test.status === 'sending' ? ' <button type="button" class="ccs-link" data-act="pr-reload">Check again</button>' : '') + '</p>';
    } else h += '<p class="ccs-hint">Only an administrator can change the printer email and paper size.</p>';
    h += '<h3 class="ccs-seth">Delivery log</h3><p class="ccs-hint">Emailed means the slip left us. Printed means the kitchen confirmed it is in their hands.</p>';
    var rows = log.slice(0, 15), again1 = {};
    h += rows.length ? '<div class="ccs-history">' + rows.map(function (x) {
      var test = x.kind === 'kitchen_slip_test', latest = x.version === x.latest_version;
      var printed = test ? '' : (x.printed_confirmed_at ? ' · printed, confirmed by ' + esc(x.printed_confirmed_label || 'staff') : latest ? ' · not yet confirmed as printed' : '') + (latest ? '' : ' · replaced by v' + x.latest_version);
      var newest = !test && !again1[x.order_id]; if (!test) again1[x.order_id] = 1;
      var again = newest && latest && x.status !== 'pending' && x.status !== 'sending' ? ' <button type="button" class="ccs-link" data-act="pr-resend" data-id="' + x.order_id + '" data-v="' + x.version + '">Send again</button>' : '';
      return '<div><span>' + esc(when(x.created_at)) + '</span><span><b style="font-weight:600;color:var(--ccs-ink)">' + esc(test ? 'Test slip' : x.reference + ' v' + x.version) + '</b> · ' + esc(prRowStatus(x)) + printed + again + '</span></div>';
    }).join('') + '</div>' : '<p class="ccs-hint">No slips emailed yet.</p>';
    return h + '<div class="ccs-actions-row ccs-more-row"><button type="button" class="ccs-link" data-act="pr-reload">Refresh</button></div></div></details>';
  }
  function prSave() {
    var st = S.settings, on = document.getElementById('pr-on');
    sb.rpc('admin_print_settings_save', { p: { primary: val('pr-pri'), backup: val('pr-bak'), paper: val('pr-paper'), on_new: !!(on && on.checked) } }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      st.prOpen = true;
      if (!r.data.ok) { st.prFormErr = r.data.message; view(); return; }
      st.prFormErr = null; st.pr = r.data; setSavedOk(); toast(r.data.verified ? 'Printing settings saved' : 'Saved. Now send a test slip to check the printer.'); view();
    }).catch(fail);
  }
  function prCall(fn, args, ok) {
    var st = S.settings;
    sb.rpc(fn, args || {}).then(function (r) {
      clearBusy(); if (r.error) throw r.error; st.prOpen = true;
      if (!r.data.ok) { toast(r.data.message, true); return; }
      toast(ok(r.data)); prLoad();
    }).catch(fail);
  }

  // ---------- deleted orders (admins) ----------
  function deletedView(st) {
    var l = st.deleted; if (!l) return '';
    return '<details><summary>Deleted orders <span>' + (l.length ? l.length + ' deleted' : 'None') + '</span></summary><div class="ccs-set-body">' +
      (l.length ? '<p class="ccs-hint">Deleted orders are hidden from every list and figure. Restore puts an order back exactly as it was.</p><div class="ccs-history">' + l.map(function (d) {
        return '<div><span>' + esc(when(d.deleted_at)) + '</span><span><b style="font-weight:600;color:var(--ccs-ink)">' + esc(d.reference) + '</b> ' + esc(d.customer || '') + ', due ' + esc(nice(d.date)) + ' · deleted by ' + esc(d.deleted_by) + ': ' + esc(d.reason || '') + (d.paid > 0 ? ' · ' + money(d.paid) + ' paid' : '') +
          ' <button type="button" class="ccs-link" data-act="del-restore" data-id="' + d.id + '">Restore</button></span></div>';
      }).join('') + '</div>' : '<p class="ccs-hint">No orders have been deleted. Admins can delete any order from the order itself.</p>') + '</div></details>';
  }
  // ---------- backup Google Sheet (in the owner's Drive; a script inside it copies orders every minute) ----------
  var MIR_STATE = { current: 'Connected and current', delayed: 'Copy delayed', attention: 'Attention', not_set_up: 'Not set up' };
  function mirLabel(M) { return M ? MIR_STATE[M.state] || M.state : 'Checking…'; }
  function mirLoad() {
    if (!canP('mgmt.settings')) return Promise.resolve();
    return sb.rpc('mirror_health').then(function (r) {
      if (r.error || !r.data || !r.data.ok) return;
      S.mir = r.data; if (S.settings) S.settings.mir = r.data;
      if (S.tab === 'settings' || S.tab === 'today') view();
    }, function () {});
  }
  function mirAgo(m) { return m == null ? '' : m < 1 ? 'less than a minute ago' : m === 1 ? '1 minute ago' : m < 120 ? m + ' minutes ago' : Math.round(m / 60) + ' hours ago'; }
  function mirBlock(st) {
    var M = st.mir; if (!M) return '<p class="ccs-loading">Checking the backup Sheet…</p>';
    var h = '<h4 class="s5-h">Backup Google Sheet</h4><p class="ccs-mirstate is-' + esc(M.state) + '"><b>' + esc(mirLabel(M)) + '</b>' +
      (M.last_ack_at ? ' · last copy ' + esc(when(M.last_ack_at)) + ' (' + esc(mirAgo(M.minutes)) + ')' : '') + '</p>';
    if (M.state === 'not_set_up') h += '<p class="ccs-hint">The Sheet lives in the owner\'s Google Drive. A script inside it copies every order there each minute. It cannot change orders.</p>';
    h += '<dl class="ccs-kv">' + (M.sheet_url ? '<dt>Sheet</dt><dd><a class="ccs-link" href="' + esc(M.sheet_url) + '" target="_blank" rel="noopener">' + esc(M.sheet_title || 'Open the backup Sheet') + '</a></dd>' : '') +
      (M.rows ? '<dt>Copied</dt><dd>' + esc(Object.keys(M.rows).map(function (k) { return k + ' ' + M.rows[k]; }).join(', ')) + '</dd>' : '') +
      (M.last_error && (!M.last_ack_at || M.last_error_at > M.last_ack_at) ? '<dt>Problem</dt><dd>' + esc(M.last_error) + '</dd>' : '') +
      '<dt>Emails</dt><dd>' + (M.emails_failed ? M.emails_failed + ' could not be sent in the last 7 days' : 'None failed in the last 7 days') + (M.emails_waiting ? ', ' + M.emails_waiting + ' waiting over 10 minutes' : '') + '</dd></dl>';
    if (M.is_admin) {
      h += '<div class="ccs-box ccs-mircode"><b>Sheet access code (administrators only)</b><p class="ccs-hint">Paste it into the Sheet once: Cake backup, then Set up. It only lets the Sheet read orders. Never put it anywhere else.</p>' +
        (st.mirCode ? '<p class="ccs-mircode-v"><code>' + esc(st.mirCode) + '</code></p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost" data-act="mir-copy">Copy code</button><button type="button" class="ccs-link" data-act="mir-hide">Hide</button></div>' :
          '<button type="button" class="ccs-btn ccs-ghost" data-act="mir-show">Show access code</button>') +
        '<p class="ccs-hint">If the code may have been seen by the wrong person, <button type="button" class="ccs-link ccs-red" data-act="mir-new">make a new code</button>. The Sheet stops copying until the new code is pasted in it.</p></div>';
    }
    h += '<p class="ccs-hint">If the staff app is down, open the backup Sheet to see every order that has come through. It is read only; manage anything new by hand until the app is back.</p>';
    return h;
  }

  // ---------- Google Sheet backup (old robot-account route, kept for reference; not shown) ----------
  function when(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Pacific/Fiji', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])\.?m\.?$/i, function (m, x) { return ' ' + x.toUpperCase() + 'M'; }) : ''; }
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
    var st = S.settings, d = { name: val('tm-new-n').trim(), email: val('tm-new-e').trim(), level: val('tm-new-r'), password: val('tm-new-p') };
    st.tmDraft = d; st.tmOpen = true; st.tmDone = null;
    st.tmErr = d.name.length < 2 ? 'Enter the staff member\'s name.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) ? 'Check the email address.' : d.password.length < 10 ? 'Use at least 10 characters for the temporary password, or tap Make one for me.' : null;
    if (st.tmErr) { clearBusy(); return view(); }
    staffAdmin({ op: 'create', name: d.name, email: d.email, level_id: d.level, password: d.password }).then(function (r) {
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
  function levelOptions(st, sel) { return (st.levels || []).map(function (l) { return '<option value="' + l.id + '"' + (l.id === sel ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join(''); }
  function levelIdFor(st, role) { var l = (st.levels || []).filter(function (x) { return x.built_in && x.grants.length === 1 && x.grants[0] === role; })[0]; return l ? l.id : ''; }
  function teamRemove(uid) {
    var st = S.settings;
    staffAdmin({ op: 'remove', user_id: uid }).then(function (r) {
      if (!r) return;
      if (!r.ok) { st.rmErr = r.message || 'This person could not be removed.'; return view(); }
      st.rmFor = null; st.rmErr = null; toast('Removed from the team'); loadSettingsKeep(null);
    }).catch(fail);
  }
  // ---------- Team: one compact row per person; add and edit in a side panel; set-up links by email ----------
  function seenText(at) {
    if (!at) return 'Not signed in yet';
    var d = String(at).slice(0, 10), n = Math.round((Date.parse(today() + 'T12:00:00Z') - Date.parse(new Date(at).toLocaleDateString('en-CA', { timeZone: 'Pacific/Fiji' }) + 'T12:00:00Z')) / 864e5);
    return n <= 0 ? 'Today, ' + clockAt(at) : n === 1 ? 'Yesterday' : n < 14 ? n + ' days ago' : nice(new Date(at).toLocaleDateString('en-CA', { timeZone: 'Pacific/Fiji' }));
  }
  function teamRows(st) {
    var q = (st.tmQ || '').trim().toLowerCase(), fl = st.tmLv || '', fs = st.tmSt || 'all', sort = st.tmSort || 'name', dir = st.tmAsc === false ? -1 : 1;
    return (st.team || []).filter(function (u) {
      if (q && ((u.full_name || '') + ' ' + (u.email || '')).toLowerCase().indexOf(q) < 0) return false;
      if (fl && u.level_id !== fl) return false;
      if (fs === 'active' && !u.active) return false;
      if (fs === 'off' && u.active) return false;
      return true;
    }).sort(function (a, b) {
      var x, y;
      if (sort === 'level') { x = (a.level_name || '').toLowerCase(); y = (b.level_name || '').toLowerCase(); }
      else if (sort === 'seen') { x = a.last_sign_in_at || ''; y = b.last_sign_in_at || ''; return (x < y ? 1 : x > y ? -1 : 0) * dir; }
      else { x = (a.full_name || a.email || '').toLowerCase(); y = (b.full_name || b.email || '').toLowerCase(); }
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }
  function tmSortBtn(st, k, label) {
    var on = (st.tmSort || 'name') === k, asc = st.tmAsc !== false;
    return '<button type="button" class="tm-sort' + (on ? ' is-on' : '') + '" data-act="tm-sort" data-v="' + k + '" aria-label="Sort by ' + label.toLowerCase() + '">' + label + (on ? '<span aria-hidden="true">' + (asc ? ' ↑' : ' ↓') + '</span>' : '') + '</button>';
  }
  function tmSwitch(u, mine) {
    return '<button type="button" class="pm-sw' + (u.active ? ' is-on' : '') + '" role="switch" aria-checked="' + !!u.active + '" aria-label="Access for ' + esc(u.full_name || u.email) + '" data-act="tm-acc" data-id="' + u.user_id + '"' + (mine ? ' disabled title="You cannot switch off your own access"' : '') + '><i></i><span>' + (u.active ? 'On' : 'Off') + '</span></button>';
  }
  function teamView(st) {
    var all = st.team || [], rows = teamRows(st), on = all.filter(function (u) { return u.active; }).length;
    var h = '<div class="tm-head"><p class="ccs-hint">' + all.length + (all.length === 1 ? ' person' : ' people') + ' · ' + on + ' with access</p><button type="button" class="ccs-btn" data-act="tm-new">Add staff</button></div>';
    if (st.tmNote) h += '<div class="ccs-note" role="status">' + st.tmNote + '</div>';
    h += '<div class="tm-tools"><div class="ccs-field tm-q"><label class="ccs-sr" for="tm-q">Search staff</label><input class="ccs-input" id="tm-q" type="search" placeholder="Search by name or email" value="' + esc(st.tmQ || '') + '" autocomplete="off"></div>' +
      '<div class="ccs-field"><label class="ccs-sr" for="tm-flv">Level</label><select class="ccs-input" id="tm-flv"><option value="">All levels</option>' + levelOptions(st, st.tmLv || '') + '</select></div>' +
      '<div class="ccs-field"><label class="ccs-sr" for="tm-fst">Access</label><select class="ccs-input" id="tm-fst">' + [['all', 'Everyone'], ['active', 'Access on'], ['off', 'Access off']].map(function (x) { return '<option value="' + x[0] + '"' + ((st.tmSt || 'all') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div></div>';
    if (!rows.length) return h + '<p class="ccs-quiet">' + (all.length ? 'No one matches. Clear the search or filters.' : 'No staff yet. Add the first person.') + '</p>';
    h += '<div class="tm-table" role="table" aria-label="Team"><div class="tm-tr tm-th" role="row"><span role="columnheader">' + tmSortBtn(st, 'name', 'Staff member') + '</span><span role="columnheader">' + tmSortBtn(st, 'level', 'Level') + '</span><span role="columnheader">Access</span><span role="columnheader">' + tmSortBtn(st, 'seen', 'Last active') + '</span><span role="columnheader"><span class="ccs-sr">Actions</span></span></div>';
    h += rows.map(function (u) {
      var mine = S.me && u.user_id === S.me.user_id, ask = st.tmAsk && st.tmAsk.id === u.user_id ? st.tmAsk : null, menu = st.tmMenu === u.user_id;
      var r = '<div class="tm-tr' + (u.active ? '' : ' is-off') + '" role="row"><span class="tm-who" role="cell"><b>' + esc(u.full_name || 'No name yet') + (mine ? ' <em>(you)</em>' : '') + '</b><small>' + esc(u.email || '') + '</small></span>' +
        '<span class="tm-lv" role="cell"><span class="tm-k">Level</span>' + esc(u.level_name || 'No level') + '</span>' +
        '<span class="tm-acc" role="cell"><span class="tm-k">Access</span>' + tmSwitch(u, mine) + '</span>' +
        '<span class="tm-seen" role="cell"><span class="tm-k">Last active</span>' + esc(seenText(u.last_sign_in_at)) + '</span>' +
        '<span class="tm-acts" role="cell"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="tm-edit" data-id="' + u.user_id + '">Edit</button>' +
        (mine ? '' : '<button type="button" class="ccs-btn ccs-ghost ccs-small tm-more" data-act="tm-menu" data-id="' + u.user_id + '" aria-expanded="' + menu + '" aria-label="More for ' + esc(u.full_name || u.email) + '">More</button>') +
        (menu ? '<span class="tm-menu" role="menu"><button type="button" role="menuitem" data-act="tm-link" data-id="' + u.user_id + '">' + (u.last_sign_in_at ? 'Email a new password link' : 'Email the set-up link again') + '</button><button type="button" role="menuitem" class="ccs-red" data-act="tm-rm" data-id="' + u.user_id + '">Remove from team</button></span>' : '') + '</span></div>';
      if (ask) r += '<div class="ccs-panel tm-ask" role="alert"><p><b>' + (ask.kind === 'off' ? 'Switch off access for ' + esc(u.full_name || u.email) + '?' : ask.kind === 'rm' ? 'Remove ' + esc(u.full_name || u.email) + ' from the team?' : 'Email ' + esc(u.full_name || u.email) + ' a link to choose a password?') + '</b> ' +
        (ask.kind === 'off' ? 'They cannot sign in until it is switched on again. Their orders and notes keep their name.' : ask.kind === 'rm' ? 'Their login stops working for good and they leave this list. Orders and notes they made keep their name.' : 'It goes to ' + esc(u.email) + ' and works once.') + '</p>' +
        (ask.err ? '<p class="ccs-err" role="alert">' + esc(ask.err) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn' + (ask.kind === 'link' ? '' : ' ccs-danger') + '" data-act="tm-ask-yes" data-id="' + u.user_id + '">' + (ask.kind === 'off' ? 'Switch off' : ask.kind === 'rm' ? 'Remove from team' : 'Send the link') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="tm-ask-no">Cancel</button></div></div>';
      return r;
    }).join('') + '</div>';
    return h;
  }
  function teamFind(uid) { return ((S.settings && S.settings.team) || []).filter(function (u) { return u.user_id === uid; })[0]; }
  function teamSetAccess(u, on) {
    var st = S.settings;
    return sb.rpc('admin_set_staff_level', { p_user: u.user_id, p_name: u.full_name || '', p_level: u.level_id, p_active: on }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { if (st.tmAsk) { st.tmAsk.err = r.data.message; view(); } else toast(r.data.message, true); return; }
      st.tmAsk = null; toast(on ? 'Access switched on for ' + (u.full_name || u.email) : 'Access switched off for ' + (u.full_name || u.email)); loadSettingsKeep(null);
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function teamSendLink(uid) {
    var st = S.settings, u = teamFind(uid); if (!u) return;
    staffAdmin({ op: 'send_link', user_id: uid }).then(function (r) {
      clearBusy(); if (!r) return;
      if (!r.ok) { if (st.tmAsk) st.tmAsk.err = r.message || 'The link could not be sent.'; view(); return; }
      st.tmAsk = null; st.tmMenu = null; view(); toast('Link sent to ' + (r.email || u.email));
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  function staffSheetOpen(uid) {
    var st = S.settings, u = uid ? teamFind(uid) : null;
    S.sheet = { type: 'staff', id: uid || null, f: u ? { name: u.full_name || '', email: u.email, level: u.level_id || '', active: !!u.active } : { name: '', email: '', level: levelIdFor(st, 'front_of_house'), active: true }, err: null, ask: null };
    S.panelErr = null; S.dirty = {}; st.tmMenu = null; sheetOpen(); renderSheet();
  }
  function staffSheet() {
    var sh = S.sheet, st = S.settings, f = sh.f, u = sh.id ? teamFind(sh.id) : null, mine = u && S.me && u.user_id === S.me.user_id;
    if (!st) return sheetHead('Staff') + '<div class="ccs-sheet-body"><p class="ccs-loading">Loading…</p></div>';
    var lv = (st.levels || []).filter(function (l) { return l.id === f.level; })[0];
    var h = sheetHead(sh.id ? esc(f.name || f.email) : 'Add staff') + '<div class="ccs-sheet-body"><form class="ccs-box tm-form" id="tm-form" novalidate>';
    h += '<div class="ccs-field"><label class="ccs-label" for="tmf-n">Name</label><input class="ccs-input" id="tmf-n" value="' + esc(f.name) + '" autocomplete="off"' + (sh.id ? '' : ' data-autofocus') + '></div>';
    h += sh.id ? '<div class="ccs-field"><span class="ccs-label">Email</span><p class="tm-ro">' + esc(f.email) + '</p></div>' : '<div class="ccs-field"><label class="ccs-label" for="tmf-e">Email</label><input class="ccs-input" id="tmf-e" type="email" value="' + esc(f.email) + '" autocomplete="off" inputmode="email"></div>';
    h += '<div class="ccs-field"><label class="ccs-label" for="tmf-l">Access level</label><select class="ccs-input" id="tmf-l"' + (mine ? ' disabled' : '') + '>' + levelOptions(st, f.level) + '</select>' +
      (lv ? '<span class="ccs-hint">' + esc(lvSummary(lv)) + ' <button type="button" class="ccs-link" data-act="tm-see-perms">See what each level can do</button></span>' : '') + '</div>';
    if (sh.id && !mine) h += '<div class="ccs-field tm-accrow"><span class="ccs-label">Access</span><label class="ccs-check"><input type="checkbox" id="tmf-a"' + (f.active ? ' checked' : '') + '> Can sign in</label></div>';
    if (!sh.id) h += '<p class="ccs-hint">We email them a link to choose their own password. No temporary password to pass on.</p>';
    if (sh.err) h += '<p class="ccs-err" role="alert">' + esc(sh.err) + '</p>';
    h += '<div class="ccs-actions-row"><button type="submit" class="ccs-btn">' + (sh.id ? 'Save changes' : 'Add and send invite') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="close">Cancel</button></div></form>';
    if (sh.id && !mine) {
      h += '<section class="ccs-box"><h3>Password</h3><p class="ccs-hint">' + (u && u.last_sign_in_at ? 'Forgotten their password? Email them a link to choose a new one.' : 'Not signed in yet. You can send the set-up link again.') + '</p>' +
        (sh.ask === 'link' ? '<div class="ccs-panel" role="alert"><p><b>Email a link to ' + esc(f.email) + '?</b> It works once.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="tmf-link-yes">Send the link</button><button type="button" class="ccs-btn ccs-ghost" data-act="tmf-ask-no">Cancel</button></div></div>'
          : '<button type="button" class="ccs-btn ccs-ghost" data-act="tmf-link">' + (u && u.last_sign_in_at ? 'Email a new password link' : 'Email the set-up link again') + '</button>') + '</section>';
      h += '<section class="ccs-box"><h3>Remove from team</h3>' + (sh.ask === 'rm' ? '<div class="ccs-panel ccs-rmbox" role="alert"><p><b>Remove ' + esc(f.name || f.email) + '?</b> Their login stops working for good. Orders and notes they made keep their name.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="tmf-rm-yes">Remove from team</button><button type="button" class="ccs-btn ccs-ghost" data-act="tmf-ask-no">Cancel</button></div></div>'
        : '<p class="ccs-hint">To pause someone for a while, switch their access off instead.</p><button type="button" class="ccs-link ccs-red" data-act="tmf-rm">Remove from team</button>') + '</section>';
    }
    return h + '</div>';
  }
  function lvSummary(lv) {
    var p = S.perm && S.perm.data, l2 = p && (p.levels || []).filter(function (x) { return x.id === lv.id; })[0], all = p && (p.catalogue || []).length;
    if ((lv.grants || []).indexOf('admin') > -1) return 'Admin can do everything.';
    return l2 && all ? l2.perms.length + ' of ' + all + ' switches on.' : abilText(lv.grants);
  }
  function staffSheetSave() {
    var sh = S.sheet, st = S.settings; if (!sh || sh.type !== 'staff') return;
    var f = sh.f; f.name = val('tmf-n').trim(); if (!sh.id) f.email = val('tmf-e').trim(); var le = document.getElementById('tmf-l'); if (le && !le.disabled) f.level = le.value;
    var ae = document.getElementById('tmf-a'); if (ae) f.active = ae.checked;
    sh.err = f.name.length < 2 ? 'Enter their name.' : !sh.id && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) ? 'Check the email address.' : !f.level ? 'Choose an access level.' : null;
    if (sh.err) { clearBusy(); return renderSheet(); }
    if (!sh.id) {
      return staffAdmin({ op: 'invite', name: f.name, email: f.email, level_id: f.level }).then(function (r) {
        clearBusy(); if (!r) return;
        if (!r.ok) { sh.err = r.message || 'The login could not be created.'; return renderSheet(); }
        st.tmNote = r.sent ? '<b>' + esc(f.name) + ' is on the team.</b> We emailed ' + esc(r.email || f.email) + ' a link to choose their password.' : '<b>' + esc(f.name) + ' is on the team, but the email did not go.</b> ' + esc(r.message || '') + ' Use More, then Email the set-up link again.';
        S.dirty = {}; sheetClose(); toast(f.name + ' added'); loadSettingsKeep(null);
      }).catch(function (e) { clearBusy(); fail(e); });
    }
    sb.rpc('admin_set_staff_level', { p_user: sh.id, p_name: f.name, p_level: f.level, p_active: f.active }).then(function (r) {
      clearBusy(); if (r.error) throw r.error;
      if (!r.data.ok) { sh.err = r.data.message; return renderSheet(); }
      S.dirty = {}; sheetClose(); toast('Saved'); loadSettingsKeep(null);
    }).catch(function (e) { clearBusy(); fail(e); });
  }
  // The level form starts from the level's own ticks, not from what was typed in an earlier form
  function lvClear() { Object.keys(S.setTyped || {}).forEach(function (k) { if (k.indexOf('lv-') === 0) delete S.setTyped[k]; }); }
  function levelsReload() { var st = S.settings; return sb.rpc('admin_levels').then(function (r) { if (r.error) throw r.error; if (S.settings === st && r.data.ok) { st.levels = r.data.levels; if (S.tab === 'settings') view(); } }); }
  function levelSave() {
    var st = S.settings, ed = st.lvEdit; if (!ed) return;
    ed.name = val('lv-name').trim(); if (document.getElementById('lv-g-' + ABIL[0][0])) ed.grants = ABIL.filter(function (a) { var c = document.getElementById('lv-g-' + a[0]); return c && c.checked; }).map(function (a) { return a[0]; });
    st.lvErr = ed.name.length < 2 ? 'Give the level a name.' : !ed.grants.length ? 'Tick at least one thing this level can do.' : null;
    if (st.lvErr) { clearBusy(); return view(); }
    sb.rpc('admin_level_save', { p_id: ed.id, p_name: ed.name, p_grants: ed.grants }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) { st.lvErr = r.data.message; return view(); }
      toast(ed.id ? 'Level saved' : 'Level added'); lvClear(); st.lvEdit = null; st.lvErr = null; return levelsReload().then(function () { loadSettingsKeep(null); });
    }).catch(fail);
  }
  function levelDelete(id) {
    var st = S.settings;
    sb.rpc('admin_level_delete', { p_id: id }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.ok) { st.lvErr = r.data.message; st.lvDel = null; return view(); }
      st.lvDel = null; st.lvErr = null; toast('Level deleted'); return levelsReload();
    }).catch(fail);
  }
  // Settings: access levels (admins). Built-in levels stay fixed; levels an admin added can be changed or deleted.
  function levelsView(st) {
    if (!canP('staff.permissions') || !st.levels) return '';
    var L = st.levels, ed = st.lvEdit, v2 = !!(S.me && S.me.perm_v >= 2);
    var h = '<details' + (st.lvOpen ? ' open' : '') + '><summary>Access levels <span>' + L.length + (L.length === 1 ? ' level' : ' levels') + '</span></summary><div class="ccs-set-body">' +
      '<p class="ccs-hint">' + (v2 ? 'Everyone on the team has one access level. Admin, Counter and Kitchen are built in. What each level can do is set with the switches under Permissions.' : 'Everyone on the team has one access level. Admin, Counter and Kitchen are built in. Add your own level, name it and tick what it can do. Only Admin can manage the team, access levels and deleting orders.') + '</p>';
    if (st.lvErr && !ed) h += '<p class="ccs-err" role="alert">' + esc(st.lvErr) + '</p>';
    h += '<div class="ccs-lvlist">' + L.map(function (l) {
      var who = l.people + (l.people === 1 ? ' person' : ' people');
      var acts = l.built_in ? '' : st.lvDel === l.id
        ? '<div class="ccs-panel ccs-rmbox" role="alert"><p><b>Delete the level ' + esc(l.name) + '?</b> This cannot be undone.</p><div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-danger" data-act="lv-del-yes" data-id="' + l.id + '">Delete level</button><button type="button" class="ccs-btn ccs-ghost" data-act="lv-del" data-id="">Keep it</button></div></div>'
        : '<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-ghost ccs-small" data-act="lv-edit" data-id="' + l.id + '">' + (v2 ? 'Rename' : 'Change') + '</button>' +
          (l.people ? '<span class="ccs-hint">To delete it, first move the ' + who + ' on it to another level.</span>' : '<button type="button" class="ccs-link ccs-red" data-act="lv-del" data-id="' + l.id + '">Delete level</button>') + '</div>';
      return '<div class="ccs-box ccs-lv"><div class="ccs-lv-head"><b>' + esc(l.name) + '</b><span class="ccs-hint">' + (l.built_in ? 'Built in · ' : '') + who + '</span></div><p class="ccs-lv-can">' + esc(v2 ? lvSummary(l) : abilText(l.grants)) + '</p>' + acts + '</div>';
    }).join('') + '</div>';
    if (ed) {
      h += '<div class="ccs-box ccs-lvform"><b style="color:var(--ccs-ink);font-size:18px">' + (ed.id ? (v2 ? 'Rename level' : 'Change level') : 'Add a level') + '</b>' + sf('lv-name', 'Name', ed.name, 'text') +
        (ed.id && v2 ? '<p class="ccs-hint">What this level can do is set with the switches under Permissions.</p>' :
        '<fieldset class="ccs-lvticks"><legend class="ccs-label">' + (v2 ? 'Starting point' : 'What this level can do') + '</legend>' + (v2 ? '<p class="ccs-hint">Tick what the level is mostly for. You can switch single things on or off under Permissions afterwards.</p>' : '') + ABIL.map(function (a) {
          return '<label class="ccs-check ccs-lvtick"><input type="checkbox" id="lv-g-' + a[0] + '"' + (ed.grants.indexOf(a[0]) > -1 ? ' checked' : '') + '><span><b>' + esc(a[1]) + '</b><small>' + esc(a[2]) + '</small></span></label>';
        }).join('') + '</fieldset>') +
        (ed.id && !v2 ? '<p class="ccs-hint">Changes apply straight away. People on this level see the new screens after they refresh or sign in again.</p>' : '') +
        (st.lvErr ? '<p class="ccs-err" role="alert">' + esc(st.lvErr) + '</p>' : '') +
        '<div class="ccs-actions-row"><button type="button" class="ccs-btn" data-act="lv-save">' + (ed.id ? 'Save level' : 'Add level') + '</button><button type="button" class="ccs-btn ccs-ghost" data-act="lv-cancel">Cancel</button></div></div>';
    } else h += '<button type="button" class="ccs-btn ccs-ghost" data-act="lv-add">Add a level</button>';
    return h + '</div></details>';
  }
  function loadSettingsKeep(done) {
    var prev = S.settings;
    Promise.all([sb.rpc('admin_list_team'), sb.rpc('admin_levels')]).then(function (rr) { rr.forEach(function (r) { if (r.error) throw r.error; }); if (S.settings === prev) { prev.team = (rr[0].data && rr[0].data.team) || []; if (rr[1].data && rr[1].data.ok) prev.levels = rr[1].data.levels; prev.tmDone = done; prev.tmOpen = true; if (S.tab === 'settings') view(); } }).catch(fail);
  }
  function sf(id, label, v, type) { return '<div class="ccs-field"><label class="ccs-label" for="' + id + '">' + label + '</label><input class="ccs-input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"' + (type ? '' : ' inputmode="numeric"') + '></div>'; }
  function refreshSetup() { return sb.rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (s) { if (!s.error) S.setup = s.data; }); }
  function saveLoc(confirmIt) {
    var ints = { lead_days_standard: num(val('st-lead-s')), lead_days_custom: num(val('st-lead-c')), max_days_ahead: num(val('st-ahead')) };
    for (var k in ints) if (ints[k] == null || ints[k] < 0 || ints[k] % 1) return toast('Notice and days ahead must be whole numbers.', true);
    var cap = val('st-cap').trim(); cap = cap === '' ? null : num(cap);
    if (cap != null && (cap < 1 || cap % 1)) return toast('Most cakes per day must be a whole number, or blank.', true);
    if (val('st-close') <= val('st-open')) return toast('Last collection must be after the first.', true);
    var upd = Object.assign(ints, { collection_open: val('st-open'), collection_close: val('st-close'), slot_minutes: Number(val('st-slot')), daily_capacity: cap, defaults_confirmed: !!(S.settings.loc.defaults_confirmed || confirmIt) });
    sb.from('locations').update(upd).eq('id', S.settings.loc.id).then(function (r) { if (r.error) throw r.error; toast(confirmIt ? 'Confirmed and saved' : 'Notice and hours saved'); refreshSetup(); loadSettings(); }).catch(fail);
  }
  function saveZones() {
    var jobs = [];
    S.settings.zones.forEach(function (z) {
      var n = val('dz-n-' + z.id).trim(), fs = val('dz-f-' + z.id).trim(), f = fs === '' ? null : num(fs), a = document.getElementById('dz-a-' + z.id).checked;
      if (n.length < 2) throw userErr('Each delivery area needs a name. Nothing was saved.');
      if (f != null && (isNaN(f) || f < 0)) throw userErr('Check the fee for ' + n + '. Nothing was saved.');
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
    sb.from('delivery_zones').insert({ location_id: S.settings.loc.id, name: n, fee: f, sort: sort }).then(function (r) { if (r.error) throw r.error.code === '23505' ? userErr('That area already exists.') : r.error; toast('Area added'); refreshSetup(); loadSettings(); }).catch(fail);
  }
  // Prices: show old and new before saving, and warn on big changes (A11)
  function fj(n) { return 'FJD ' + Number(n).toFixed(2); }
  function saveProduct(id, b) {
    var p = S.settings.products.filter(function (x) { return x.id === id; })[0], box = b.closest('.ccs-box'), lines = [], big = false, ups = [], bad = null;
    var msg = box.querySelector('.ccs-pricechk');
    function show(html) { if (!msg) { msg = document.createElement('div'); msg.className = 'ccs-pricechk'; b.parentNode.insertBefore(msg, b); } msg.innerHTML = html; }
    (p.product_sizes || []).forEach(function (s) {
      var raw = document.getElementById('pz-' + s.id).value.trim(), price = raw === '' ? null : num(raw), act = root.querySelector('[data-sactive="' + s.id + '"]').checked, old = Number(s.price);
      if (price == null || isNaN(price) || price < 0) { bad = bad || 'Check the ' + s.size_inch + ' inch price. Nothing was saved.'; return; }
      price = Math.round(price * 100) / 100;
      if (price !== old) {
        var pct = old > 0 ? Math.round((price - old) / old * 100) : null;
        if (pct === null || Math.abs(pct) > 30) big = true;
        lines.push(s.size_inch + ' inch: ' + fj(old) + ' to ' + fj(price) + (pct === null ? '' : ' (' + (pct > 0 ? pct + '% higher' : -pct + '% lower') + ')'));
      }
      if (act !== s.active) lines.push(s.size_inch + ' inch: ' + (act ? 'now offered' : 'no longer offered'));
      if (price !== old || act !== s.active) ups.push({ id: s.id, price: price, active: act });
    });
    if (bad) { b.dataset.sig = ''; b.textContent = 'Save ' + p.name; return show('<p class="ccs-err" role="alert">' + esc(bad) + '</p>'); }
    var on = root.querySelector('[data-pstatus="' + id + '"]').checked ? 'active' : 'hidden';
    if (on !== p.status) lines.push(on === 'active' ? 'Back on sale on the website' : 'Taken off sale on the website');
    if (!lines.length) { if (msg) msg.innerHTML = ''; return toast('No changes to save'); }
    var sig = JSON.stringify([ups, on]);
    if (b.dataset.sig !== sig) {
      b.dataset.sig = sig; b.textContent = 'Confirm and save';
      return show('<div class="ccs-note" role="status"><b>Check before saving ' + esc(p.name) + ':</b><ul>' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
        (big ? '<p><b>This is a big change.</b> Check the amount: new website orders use it straight away.</p>' : '<p>New website orders use these prices straight away. Existing orders keep their price.</p>') + '</div>');
    }
    if (S.busy) return; S.busy = true; markBusy(b, 'Saving…');
    var jobs = ups.map(function (u) { return sb.from('product_sizes').update({ price: u.price, active: u.active }).eq('id', u.id); });
    if (on !== p.status) jobs.push(sb.from('products').update({ status: on }).eq('id', id));
    Promise.all(jobs).then(function (rs) { S.busy = false; rs.forEach(function (r) { if (r.error) throw r.error; }); toast(p.name + ' saved'); refreshSetup(); loadSettings(); })
      .catch(function (e) { S.busy = false; b.dataset.sig = ''; console.error(e); clearBusy(); b.textContent = 'Save ' + p.name; if (errKind(e) === 'expired') return sessionExpired();
        show('<p class="ccs-err" role="alert">' + (errKind(e) === 'offline' ? 'No internet connection.' : 'Not saved.') + ' Some prices may not have changed. Tap Save again to check and retry.</p>'); });
  }

  // ---------- events ----------
  root.addEventListener('submit', function (e) {
    if (e.target.id === 'ccs-pw') { e.preventDefault(); savePassword(e.target); return; }
    if (e.target.id === 'tm-form') { e.preventDefault(); var sb0 = e.target.querySelector('button[type=submit]'); if (sb0) markBusy(sb0, 'Saving…'); staffSheetSave(); return; }
    if (e.target.id !== 'ccs-login') return; e.preventDefault();
    var btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Signing in…';
    sb.auth.signInWithPassword({ email: val('ccs-email').trim(), password: val('ccs-pass') }).then(function (r) {
      if (r.error) { loginView(r.error.message === 'Invalid login credentials' ? 'That email and password do not match.' : r.error.message); return; }
      boot();
    }).catch(function () { loginView('Could not connect. Check the internet connection.'); });
  });
  var BUSY_ACTS = { 'ho-save': 'Saving…', 'ho-take': 'Saving…', 'do-delete': 'Deleting…', 'do-confirm': 'Saving…', 'do-decline': 'Saving…', 'do-cancel': 'Saving…', 'do-note': 'Saving…', 'do-waive': 'Saving…', 'do-collected': 'Saving…', 'do-fulfil': 'Saving…',
    'do-brief': 'Sending…', 'do-pay': 'Saving…', 'k-stage': 'Saving…', 'k-next': 'Saving…', 'k-ready': 'Saving…', 'k-assign': 'Saving…', 'save-zones': 'Saving…', 'add-zone': 'Saving…', 'cust-save': 'Saving…', 'cn-save': 'Saving…', 'consent-ch': 'Saving…',
    'consent': 'Saving…', 'save-loc': 'Saving…', 'confirm-loc': 'Saving…', 'add-closed': 'Saving…', 'save-staff': 'Saving…', 'tm-add': 'Adding…', 'tm-reset-save': 'Saving…', 'bk-link': 'Linking…', 'bk-copy': 'Copying…', 'pr-save': 'Saving…', 'pr-test': 'Sending…', 'pr-ok': 'Saving…', 'k-printed': 'Saving…' };
  // Tablets and laptops: the menu is hidden and slides in from the Menu button, so the page has the full width
  function menuOpen() { var a = root.querySelector('.ccs-app'); return !!(a && a.classList.contains('menu-open')); }
  function menuSet(open, quiet) {
    var a = root.querySelector('.ccs-app'), btn = root.querySelector('.ccs-menubtn'); if (!a) return;
    a.classList.toggle('menu-open', open); if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) { var f = root.querySelector('.ccs-side .ccs-nav-item[aria-current="page"]') || root.querySelector('.ccs-side .ccs-nav-item'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 30); }
    else if (!quiet && btn && btn.offsetParent) btn.focus({ preventScroll: true });
  }
  root.addEventListener('click', function (e) {
    var mb = e.target.closest('[data-menu]'); if (mb) { menuSet(mb.dataset.menu === 'open' && !menuOpen()); return; }
    if (menuOpen() && e.target.closest('.ccs-side [data-tab], .ccs-side [data-act]')) menuSet(false, true);
    if (e.target.id === 'ccs-shade') { if (hasTyping()) { toast('Your typing is kept. Save it, or tap the cross twice to discard it.'); return; } sheetClose(); return; }
    if (S.cust && S.cust.tools && !e.target.closest('.ccs-tools')) { S.cust.tools = false; if (S.tab === 'customers') view(); }
    var b = e.target.closest('[data-act],[data-tab]'); if (!b || b.disabled) return;
    if (b.dataset.tab && !b.dataset.act) {
      if (b.dataset.tab === 'more') { openMore(false); return; }
      goTab(b.dataset.tab);
      return;
    }
    var a = b.dataset.act, v = b.dataset.v;
    if (a.indexOf('dx-') === 0) { try { dashAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('fb-') === 0) { try { fbAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('rg-') === 0) { try { regAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a.indexOf('pm-') === 0) { try { permAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a === 'tb-new') { S.tbSaved = null; sheetClose('replace'); newStart(); return; }
    if (a === 'tb-fresh') { D = freshDraft(); clearDraft(); S.tbSaved = null; sheetClose('replace'); newStart(); return; }
    if (a === 'tb-exit') { tabletOff(); return; }
    if (a === 'tb-fs') { if (document.fullscreenElement) fsOff(); else fsOn(); setTimeout(function () { var bt = document.querySelector('.tb-fs'); if (bt) bt.textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; }, 300); return; }
    if (a === 'nav-mini') { var ap = document.querySelector('#cc-staff .ccs-app'), on = ap && !ap.classList.contains('is-mini'); if (ap) ap.classList.toggle('is-mini', on); try { localStorage.setItem('ccs-navmini', on ? '1' : '0'); } catch (x) {} return; }
    if (a.indexOf('oc-') === 0) { try { occAct(a, b, v); } catch (err) { fail(err); } return; }
    if (a === 'ws-cm-tools') { S.cust.tools = !S.cust.tools; view(); return; }
    if (a.indexOf('ws-cm-') === 0) { if (S.cust) S.cust.tools = false; try { clAct(a, b, v); } catch (err) { fail(err); } return; }
    if (SET_SAVES[a] && b.closest('.ccs-set details')) S.setSaved = setSec(b);
    if (a.indexOf('ws-') === 0) { try { wsAct(a, b, v); } catch (err) { fail(err); } return; }
    if (BUSY_ACTS[a] && !S.busyBtn) markBusy(b, BUSY_ACTS[a]);
    try {
      switch (a) {
        case 'signout':
          if (wipItems().length && !b.dataset.sure) { openMore(true); break; }
          S.sheetHist = false; sheetClose('pop'); clearDraft(); wipClearAll(); sb.auth.signOut().then(function () { S.me = null; loginView(); }); break;
        case 'filter': S.filter = v; S.q = ''; S.older = null; view(); break;
        case 'reopen-order': openOrder(S.sheet.id); break;
        case 'k-reopen': openKitchen(S.sheet.id, true); break;
        case 'k-reload': S.kit.err = null; if (!S.kit.loaded) view(); loadKitchen(false); break;
        case 'reload-settings': loadSettings(); break;
        case 'cust-reload': loadCustomers(); break;
        case 'cust-reopen': S.sheet.err = null; renderSheet(); openCustomer(S.sheet.id); break;
        case 'reg-reopen': regFetch(S.sheet.k); break;
        case 'log-reload': s5LogLoad(); break;
        case 'dups-reload': clDupsLoad(); break;
        case 'online-ask': S.settings.onlineAsk = v; S.settings.onlineErr = null; view(); break;
        case 'online-no': S.settings.onlineAsk = null; S.settings.onlineErr = null; view(); break;
        case 'online-yes':
          if (S.busy) break; S.busy = true;
          var onl_ = S.settings.onlineAsk === 'on';
          sb.from('locations').update({ accepts_online: onl_ }).eq('id', S.settings.loc.id).select('accepts_online').single().then(function (r) {
            S.busy = false; if (r.error) throw r.error;
            if (!r.data || r.data.accepts_online !== onl_) throw new Error('not saved');
            S.settings.onlineAsk = null; S.settings.onlineErr = null;
            toast(onl_ ? 'The website is taking cake orders again.' : 'Website cake orders are paused. Guests are asked to call the café.');
            refreshSetup(); reloadLoc();
          }).catch(function (e) {
            S.busy = false; console.error(e); if (errKind(e) === 'expired') return sessionExpired();
            S.settings.onlineErr = errKind(e) === 'offline' ? 'No internet connection. Nothing was changed.' : errKind(e) === 'denied' ? 'Your login cannot change this. Ask a manager.' : 'Not saved. The setting shown is the current one. Try again.';
            reloadLoc(); view();
          }); break;
        case 'reload-orders': S.ordErr = null; if (!S.loaded) view(); loadOrders(false); break;
        case 'goto': S.filter = v; S.q = ''; goTab('orders'); window.scrollTo(0, 0); break;
        case 'tp-find': S.q = ''; goTab('orders'); window.scrollTo(0, 0); setTimeout(function () { var q = document.getElementById('ccs-q'); if (q) q.focus(); }, 30); break;
        case 'day': S.filter = 'day'; S.day = v; S.q = ''; goTab('orders'); window.scrollTo(0, 0); break;
        case 'open-order': if (b.tagName === 'A') return; openOrder(b.dataset.id); break;
        // A confirmed order straight from New order: open it with the kitchen slip choice (Email, Download, Print)
        case 'open-slip': { var sid = b.dataset.id; openOrder(sid).then(function () { if (S.sheet && S.sheet.id === sid && S.sheet.data && !S.panel) { S.panel = 'brief'; renderSheet(); } }); break; }
        case 'close': { var pz = null; if (hasTyping()) { if (pauseable()) pz = pauseWork(); else if (!confirmDiscard(b, 'Tap again to discard your changes')) break; } S.dirty = {}; sheetClose(); if (pz) toast(pz); break; }
        case 'fill': var fi = document.getElementById(b.dataset.f); if (fi) { fi.value = v; S.dirty[fi.id] = v; fi.focus(); } break;
        case 'history': S.sheet.showHistory = true; renderSheet(); break;
        case 'panel': if (S.panel && S.panel !== v && hasTyping() && !confirmDiscard(b)) break; if (S.panel === 'amend' && S.panel !== v && S.sheet && S.sheet.id) wipPut('am:' + S.sheet.id, null); S.panel = v || null; S.panelErr = null; S.dirty = {}; S.cfmHow = null; if (v === 'pay') { S.payKey = uuid(); S.payMethod = 'cash'; }
          if (v === 'amend') S.am = amendInit(S.sheet.data);
          if (v === 'fulfil') { var od = S.sheet.data; S.ful = { method: od.fulfilment_method || 'collection', zone: od.delivery_zone, address: od.delivery_address || '', fee: od.delivery_fee != null ? String(Number(od.delivery_fee)) : '', contact: od.delivery_contact || '' }; }
          renderSheet(); var sb_ = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (sb_ && v) sb_.scrollTop = 0; break;
        case 'method': S.payMethod = v; root.querySelectorAll('#ccs-method .ccs-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.v === v); }); break;
        case 'do-confirm': {
          var od0 = S.sheet.data;
          if (od0.order_type === 'custom' && od0.final_total != null) {
            if (!S.cfmHow) { S.panelErr = 'Choose how the customer agreed.'; renderSheet(); break; }
            var dep0 = num(val('ccs-dep'));
            if (dep0 != null && (dep0 < 0 || dep0 > Number(od0.final_total))) { S.panelErr = 'The deposit must be between zero and the price.'; renderSheet(); break; }
            act('confirm', { p_final_total: Number(od0.final_total), p_deposit: dep0, p_note: S.cfmHow === 'email' ? 'Customer accepted by email' : 'Customer confirmed verbally' }); break;
          }
          var price = num(val('ccs-price')), dep = num(val('ccs-dep'));
          if (price == null || price < 0) { S.panelErr = 'Enter the price.'; renderSheet(); break; }
          act('confirm', { p_final_total: price, p_deposit: dep }); break;
        }
        case 'do-decline': act('decline', { p_note: val('ccs-note').trim() || null }); break;
        case 'do-cancel': if (val('ccs-note').trim().length < 3) { panelNeed('Add the reason for cancelling.'); break; } act('cancel', { p_note: val('ccs-note').trim() }); break;
        case 'do-delete': deleteOrder(); break;
        case 'del-restore':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to restore'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Restore'; } }, 4000); break; }
          markBusy(b, 'Restoring…'); restoreOrder(b.dataset.id); break;
        case 'do-note': act('note', { p_note: val('ccs-note').trim() }); break;
        case 'ready-wa': setTimeout(function () { if (S.sheet && S.sheet.type === 'order') { S.sheet.readyAsk = true; renderSheet(); } }, 300); break;
        case 'ready-told': S.sheet.readyAsk = false; act('note', { p_note: 'Told the customer by WhatsApp that the cake is ready.' }); break;
        case 'do-candles': saveCandles(); break;
        case 'lb-open': (function () {
          var src = b.dataset.src, list = src === 'draft' ? D.photos : src === 'addph' ? (S.sheet && S.sheet.addPh) || [] : (S.sheet && S.sheet.photos) || [];
          var urls = src === 'sheet' ? list : list.filter(function (x) { return x.url && x.status !== 'failed'; }).map(function (x) { return x.url; });
          var at = src === 'sheet' ? Number(v) : urls.indexOf((list[Number(v)] || {}).url);
          lbOpen(urls, Math.max(0, at), b);
        })(); break;
        case 'ph-rm':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to remove'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Remove'; } }, 4000); break; }
          removePhoto(Number(v), b); break;
        case 'do-quote': saveQuote(); break;
        case 'send-quote': sendQuote(b); break;
        case 'cfm-how': S.cfmHow = v; renderSheet(); break;
        case 'do-waive': if (val('ccs-note').trim().length < 3) { panelNeed('Add the reason for confirming without a deposit.'); break; } act('waive_deposit', { p_note: val('ccs-note').trim() }); break;
        case 'do-collected': if (val('ccs-note').trim().length < 2) { panelNeed(S.sheet.data.fulfilment_method === 'delivery' ? 'Enter who received the cake.' : 'Enter who collected the cake.'); break; } act('collected', { p_note: val('ccs-note').trim() }); break;
        case 'do-fulfil': saveFulfil(); break;
        case 'f-method': S.ful.method = v; renderSheet(); break;
        case 'f-zone': S.ful.zone = v; renderSheet(); break;
        case 'do-brief': { var pk0 = slipPick(); if (!(pk0.email || pk0.dl || pk0.print)) break; printBrief(v, { email: pk0.email, dl: pk0.dl, print: pk0.print }); break; }
        case 'brief-email': printBrief(S.slip.paper, { email: true }); break;
        case 'brief-pdf': markBusy(b, 'Preparing…'); briefPdf(); break;
        case 'brief-print': briefPrintHere(); break;
        case 'open-kitchen': openKitchen(b.dataset.id); break;
        case 'k-stage': kitStage(v); break;
        case 'k-next': kitStage(v, null, b.dataset.id); break;
        case 'k-ready': kitStage('ready', val('k-qc').trim()); break;
        case 'k-assign': kitAssign(); break;
        case 'k-done': S.kit.showDone = !S.kit.showDone; view(); break;
        case 'k-range': S.kit.days = Number(v); S.kit.focus = null; view(); break;
        case 'k-card': var KK = S.kit; if (v === 'soon') { var kc5 = kitCalState(); kc5.v = 'list'; kc5.a = addDays(today(), 1); secStore('kitM').kitM = 'cal'; view(); break; } secStore('kitM').kitM = 'board'; KK.focus = v === 'today' ? 'today' : null; if (v === 'ready') { secStore('kitP').kitP = 'ready'; KK.days = 7; } if (v === 'soon') { KK.days = 7; } if (v === 'today') { KK.days = 2; } view(); setTimeout(function () { var bd = document.querySelector('.kp-bar') || document.querySelector('.ccs-board'); if (bd && bd.scrollIntoView) bd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); break;
        case 'k-focus-off': S.kit.focus = null; view(); break;
        case 'at-island': S.attnIsland = S.attnIsland === v ? 'closed' : v; view(); break;
        case 'at-island-close': S.attnIsland = 'closed'; view(); break;
        case 'at-jump': { var aj = document.getElementById('at-' + v); if (aj && aj.scrollIntoView) aj.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
        case 'ho-shift': S.ho = S.ho || {}; S.ho.shift = v; var hn = document.getElementById('ho-note'); if (hn) S.ho.draft = hn.value; view(); break;
        case 'ho-save': hoSave(); break;
        case 'ho-take': hoTake(b.dataset.id); break;
        case 'ho-more': S.ho.all = !S.ho.all; view(); break;
        case 'k-mode': secStore('kitM').kitM = v; if (v !== 'board') S.kit.focus = null; view(); break;
        case 'k-cal-view': { var kc1 = kitCalState(); kc1.v = v; view(); break; }
        case 'k-cal-f': kitCalState().f = v; view(); break;
        case 'k-cal-today': kitCalState().a = today(); view(); break;
        case 'k-cal-day': { var kc2 = kitCalState(); kc2.a = v; kc2.v = 'day'; secStore('kitM').kitM = 'cal'; view(); break; }
        case 'k-cal-reload': { var kc3 = kitCalState(); kc3.key = ''; kc3.err = null; view(); break; }
        case 'k-cal-move': { var kc4 = kitCalState(), kn = Number(v); if (kc4.v === 'day') kc4.a = addDays(kc4.a, kn); else if (kc4.v === 'week') kc4.a = addDays(kc4.a, 7 * kn); else if (kc4.v === 'list') kc4.a = addDays(kc4.a, 14 * kn); else { var mm = new Date(kc4.a.slice(0, 8) + '01T12:00:00Z'); mm.setUTCMonth(mm.getUTCMonth() + kn); kc4.a = mm.toISOString().slice(0, 10); } view(); break; }
        case 'tm-tab': S.settings.tmTab = v; S.settings.tmOpen = true; view(); break;
        case 'k-refresh': loadKitchen(); break;
        case 'am-set': amendSet(b.dataset.f, v); break;
        case 'am-diet': var dl_ = S.am.diets.indexOf(v); if (dl_ > -1) S.am.diets.splice(dl_, 1); else S.am.diets.push(v); S.am.preview = null; renderSheet(); break;
        case 'am-open': S.am.open[v] = !S.am.open[v]; renderSheet(); break;
        // Delivery and candles are changed through Change order, so every change goes into the same change history
        case 'am-go': if (S.panel && S.panel !== 'amend' && hasTyping() && !confirmDiscard(b)) break; if (S.panel !== 'amend' || !S.am) { S.panel = 'amend'; S.panelErr = null; S.dirty = {}; S.am = amendInit(S.sheet.data); } S.am.open = {}; S.am.open[v] = true; renderSheet(); (function () { var bd = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (bd) bd.scrollTop = 0; })(); break;
        case 'am-review': amendSend(false); break;
        case 'am-save': amendSend(true); break;
        case 'am-edit': S.am.preview = null; S.panelErr = null; renderSheet(); break;
        case 'k-ack': kitAck(); break;
        case 'save-zones': try { saveZones(); } catch (e_) { fail(e_); } break;
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
        case 'cust-cancel': if (hasTyping() && !confirmDiscard(b)) break; wipPut('cu:' + S.sheet.id, null); S.sheet.edit = false; S.sheet.conflict = null; S.sheet.ordersChoice = null; S.panelErr = null; S.dirty = {}; renderSheet(); break;
        case 'cust-new': openNewCustomer(); break;
        case 'cn-consent': var ci = S.sheet.consent.indexOf(v); if (ci > -1) S.sheet.consent.splice(ci, 1); else S.sheet.consent.push(v); S.sheet.c = readCustomerForm(); keepCustomerTyping(); renderSheet(); break;
        case 'cn-save': saveNewCustomer(v === 'force'); break;
        case 'cn-cancel': if (hasTyping() && !confirmDiscard(b)) break; S.dirty = {}; sheetClose(); break;
        case 'cust-history': if (S.sheet.hist) { S.sheet.hist = null; renderSheet(); } else loadCustomerHistory(); break;
        case 'ce-orders': S.sheet.ordersChoice = v; S.panelErr = null; renderSheet(); break;
        case 'consent-ch': setChannelConsent(b.dataset.ch, v === 'true'); break;
        case 'cust-save': saveCustomer(); break;
        case 'consent': sb.rpc('staff_set_consent', { p_customer: S.sheet.id, p_granted: v === 'true', p_note: null }).then(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message); toast(v === 'true' ? 'Marked as agreed' : 'Marked as opted out'); var id = S.sheet.id; openCustomer(id); if (S.cust.loaded) loadCustomers(); }).catch(fail); break;
        case 'seg': clSegChange(v); break;
        // calendar
        case 'cal-view': S.cal.view = v; if (S.cal.sel) S.cal.anchor = S.cal.sel; if (v === 'day') S.cal.sel = S.cal.anchor; S.cal.pre = null; S.cal.ask = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); break;
        case 'cal-move': calMove(Number(v)); break;
        case 'cal-today': S.cal.anchor = today(); S.cal.sel = today(); S.cal.pre = null; S.cal.ask = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); break;
        case 'cal-sel': calSelect(v); break;
        case 'cal-month': S.cal.view = 'month'; S.cal.anchor = v; S.cal.sel = null; S.cal.pre = null; calLoad(); break;
        case 'cal-openday': S.cal.view = 'day'; S.cal.anchor = v; S.cal.sel = v; S.cal.pre = null; if (S.sheet && S.sheet.type === 'cal') sheetClose(); calLoad(); window.scrollTo(0, 0); break;
        case 'cal-pre': { var pid = b.dataset.id || null; S.cal.pre = null; S.cal.ask = null; if (pid) { var po = S.cal.rows.filter(function (r) { return r.id === pid; })[0]; if (po && S.cal.view !== 'day') S.cal.sel = po.required_date; if (calWide()) view(); else { if (S.sheet && S.sheet.type === 'cal') sheetClose('replace'); S.cal.reopen = true; } openOrder(pid); } else calPanel(); break; }
        case 'cal-basis': S.cal.basis = v; view(); break;
        case 'cal-retry': var hadErr_ = S.cal.err || S.cal.cErr; S.cal.err = false; S.cal.cErr = false; if (hadErr_) S.cal.range = null; calLoad(); break;
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
        case 'n-taken': D.taken = v; if (v === 'other' && !D.takenDate) D.takenDate = addDays(today(), -2); if (STEPPER || SLIP) refreshStep(); else view(); if (v === 'other') setTimeout(function () { var el = document.getElementById('n-takedate'); if (el) el.focus(); }, 30); break;
        case 'n-edit': goStep(Number(v)); break;
        case 'n-pick': if (SLIP) { var pl = b.dataset.from === 'name' ? D.nameMatches : D.matches; D.customer = pl[Number(v)]; D.isNew = false; D.nameMatches = null; D.matches = null; D.optIn = null; D.custConsent = undefined; slGo(1); slConsent(D.customer.id); break; }
        case 'sl-heard': D.heard = D.heard === v ? null : v; refreshStep(); break; D.customer = D.matches[Number(v)]; D.isNew = false; goStep(nextOpen(1)); break;
        case 'sl-next': slNext(false); break;
        case 'pgo': S.secs = S.secs || {}; S.secs[b.dataset.g + '#'] = v; S.secs[b.dataset.g + '#i'] = 0; view(); break;
        case 'go-other': { secStore('order').order = 'history'; renderSheet(); var ot = document.querySelector('#ccs-sheet .ccs-other'); if (ot) { ot.scrollIntoView({ block: 'center' }); var f = ot.querySelector('button'); if (f) f.focus({ preventScroll: true }); } break; }
        case 'secgo': { var st = secStore(b.dataset.g); st[b.dataset.g] = v; if (S.sheet && /^(order|cust)/.test(b.dataset.g)) { renderSheet(); var sb2 = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (sb2) sb2.scrollTop = 0; } else view(); var nb = root.querySelector('[data-act="secgo"][data-g="' + b.dataset.g + '"][data-v="' + v + '"]'); if (nb) nb.focus({ preventScroll: true }); break; }
        case 'sl-back': slBack(); break;
        case 'wip-go': wipGo(v); break;
        case 'wip-drop': wipDrop(v); break;
        case 'sl-heardopen': D.heardOpen = true; refreshStep(); break;
        case 'sl-whenpart': D.whenPart = v; refreshStep(); break;
        case 'sl-view': D.showSlip = !D.showSlip; refreshStep(); break;
        case 'rem-reload': S.rem.err = null; S.rem.rows = null; view(); break;
        case 'rem-more': S.rem.open = !S.rem.open; view(); break;
        case 'rem-show': S.rem.show = !S.rem.show; view(); break;
        case 'rem-sent': (function () { var cid = b.dataset.id, dt = v; markBusy(b, 'Saving…'); sb.rpc('staff_mark_reminded', { p_customer: cid, p_date: dt }).then(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message); S.rem.rows = (S.rem.rows || []).filter(function (x) { return !(x.id === cid && x.date === dt); }); toast('Marked as sent'); view(); }).catch(fail); })(); break;
        case 'mf-open': if (S.settings) { S.menuOpen = true; mfOpen(b.dataset.id || null); } break;
        case 'mf-status': S.mf.f.status = v; S.dirty['mf-st'] = 1; renderSheet(); break;
        case 'mf-photo-rm': S.mf.f.image_url = ''; S.mf.phErr = null; S.dirty['mf-ph'] = 1; renderSheet(); break;
        case 'mf-add-size': (function () { var last = S.mf.f.sizes.map(function (s) { return parseInt(s.inch, 10) || 0; }); var nx = (last.length ? Math.max.apply(null, last) : 4) + 2; S.mf.f.sizes.push({ id: null, inch: String(nx), price: '', serves: '', active: true }); S.dirty['mf-sz'] = 1; renderSheet(); var f = document.getElementById('mf-sp-' + (S.mf.f.sizes.length - 1)); if (f) f.focus(); })(); break;
        case 'mf-drop-size': S.mf.f.sizes.splice(Number(v), 1); renderSheet(); break;
        case 'mf-add-flavour': S.mf.f.flavours.push({ id: null, name: '', active: true }); S.dirty['mf-fl'] = 1; renderSheet(); (function () { var f = document.getElementById('mf-fl-' + (S.mf.f.flavours.length - 1)); if (f) f.focus(); })(); break;
        case 'mf-drop-flavour': S.mf.f.flavours.splice(Number(v), 1); renderSheet(); break;
        case 'mf-review': (function () { var e = mfCheck(); if (e) { S.mf.err = e; return renderSheet(); } S.mf.err = null; S.mf.review = mfChanges(); renderSheet(); var d = document.querySelector('#ccs-sheet .ccs-sheet-body'); if (d) d.scrollTop = 0; })(); break;
        case 'mf-edit': S.mf.review = null; S.mf.err = null; renderSheet(); break;
        case 'mf-save': mfSave(); break;
        case 'sl-skip': slNext(true); break;
        case 'sl-goto': slGo(Number(v)); break;
        case 'sl-nomob':
          if (v === 'none') { D.noMob = 'none'; D.phone = ''; D.matches = null; D.nameMatches = null; D.whatsapp = false; D.optIn = false; D.isNew = true; }
          else if (v === 'other') { D.noMob = 'other'; D.whatsapp = false; }
          else if (v === 'menu') D.noMob = 'menu';
          else { if (D.noMob === 'none') { D.optIn = null; D.whatsapp = true; } else if (D.noMob === 'other') D.whatsapp = true; D.noMob = null; }
          if (D.errField === 'phone' || D.errField === 'stage') { D.err = null; D.errField = null; }
          refreshStep(); if (v !== 'none' && v !== 'menu') setTimeout(function () { var f = document.getElementById('n-phone'); if (f) f.focus(); }, 30); break;
        case 'sl-opt': D.optIn = v === 'yes'; if (D.errField === 'stage') { D.err = null; D.errField = null; } refreshStep(); break;
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
        case 'n-occ': D.occasion = v; D.occOpen = false; if (D.err && D.errField === 'stage') { D.err = null; D.errField = null; } refreshStep(); break;
        case 'n-diet': D.diet = v; if (v !== 'yes') { D.diets = []; if (v === 'no') D.dietNote = ''; } D.errField = null; refreshStep();
          // No dietary needs is a complete answer: go straight on to the next step
          break;
        case 'n-rq': reqToggle(D, v); refreshStep(); break;
        case 'n-rqallergy': reqAllergy(D, v === 'yes'); refreshStep(); break;
        case 'am-rq': reqToggle(S.am, v); S.am.preview = null; renderSheet(); break;
        case 'am-rqallergy': reqAllergy(S.am, v === 'yes'); S.am.preview = null; renderSheet(); break;
        case 'n-diets': var k = D.diets.indexOf(v); if (k > -1) D.diets.splice(k, 1); else D.diets.push(v); refreshStep(); break;
        case 'n-finish-next':
          if (D.finish === 'custom' && D.design.trim().length < 3) { D.err = 'Describe the design for the kitchen.'; D.errField = 'design'; refreshStep(); break; }
          if (!D.diet) { D.err = 'Ask about dietary needs and allergies.'; D.errField = 'diet'; refreshStep(); break; }
          var dmsg = dietMissing(D.diet, D.diets, D.dietNote); if (dmsg) { D.err = dmsg; D.errField = 'diet'; refreshStep(); break; }
          goStep(nextOpen(3)); break;
        case 'n-rushby': D.rushBy = v; if (D.errField === 'rushBy') D.errField = null; refreshStep(); break;
        case 'n-time': D.time = v;
          if (D.method === 'delivery' && !zoneObj()) { D.err = 'Choose a delivery area.'; D.errField = 'zone'; refreshStep(); break; }
          if (D.method === 'delivery' && D.address.trim().length < 5) { D.err = 'Enter the delivery address.'; D.errField = 'address'; refreshStep(); break; }
          if (!delivOk()) { D.err = 'Enter the delivery fee for this area.'; D.errField = 'fee'; refreshStep(); break; }
          if (tooSoon() && D.rush.trim().length < 3) { D.err = 'Add a reason for the short notice first.'; D.errField = 'rush'; refreshStep(); break; }
          if (tooSoon() && D.rushBy.trim().length < 2) { D.err = 'Enter who approved the short notice.'; D.errField = 'rushBy'; refreshStep(); break; } goStep(nextOpen(4)); break;
        case 'n-date': D.date = v; D.dateOther = false; D.errField = null; refreshStep(); var tc = document.querySelector('#ccs-nstep-3 [data-act="n-time"]'); if (tc && tc.scrollIntoView) tc.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
        case 'n-date-other': D.dateOther = true; refreshStep(); var di = document.getElementById('n-date'); if (di) di.focus(); break;
        case 'n-method': D.method = v; if (v === 'collection') { D.zone = null; } D.errField = null; refreshStep(); break;
        case 'n-zone': D.zone = v; D.errField = null; refreshStep(); break;
        case 'n-askdep': D.askDeposit = true; refreshStep(); break;
        case 'n-dep': D.deposit = String(v === 'full' ? dTotal() : Math.round(dTotal() / 2)); refreshStep(); break;
        case 'n-paynow': D.payNow = true; D.payAmount = D.askDeposit && D.deposit ? D.deposit : String(dTotal()); refreshStep(); break;
        case 'n-paym': D.payMethod = v; D.payMethodSet = true; refreshStep(); break;
        case 'n-plan': D.payPlan = v; D.err = null; D.errField = null; if (v === 'deposit' && !num(D.payAmount)) D.payAmount = ''; refreshStep(); break;
        case 'n-payhalf': D.payAmount = String(Math.round(dTotal() / 2)); refreshStep(); break;
        case 'n-submit': if (SLIP && slipMissing().length) { toast('Still to finish: ' + slipMissing().map(function (x) { return x[0]; }).join(', '), true); slipJump(); break; } submitOrder(); break;
        case 'n-req': D.req = true; D.product = null; D.size = null; D.variant = null; D.finish = 'custom'; D.confirmNow = false; if (D.errField === 'product' || D.errField === 'size') { D.err = null; D.errField = null; } refreshStep(); break;
        case 'n-unreq': D.req = false; D.finish = 'standard'; D.variant = null; D.sizeNote = ''; D.reqPrice = ''; refreshStep(); break;
        case 'n-cell': (function () { var pr = v.split('|'), code = pr[0], inch = Number(pr[1]); if (D.req) { D.req = false; D.finish = 'standard'; D.variant = null; } if (D.product !== code) { D.product = code; D.variant = null; } D.size = inch; D.restored = false; if (D.errField === 'product' || D.errField === 'size') { D.err = null; D.errField = null; } refreshStep(); })(); break;
        case 'n-unpick': D.customer = null; D.phone = ''; D.matches = null; D.nameMatches = null; D.name = ''; D.optIn = null; D.custConsent = undefined; D.sl = 1; refreshStep(); setTimeout(function () { var f = document.getElementById('n-phone'); if (f) f.focus(); }, 30); break;
        case 'sl-jump': slipJump(); break;
        case 'sl-when-open': D.whenOpen = true; refreshStep(); (function () { var w = document.getElementById('sl-when'); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: 'smooth', block: 'start' }); })(); break;
        case 'sl-when-close': D.whenOpen = false; refreshStep(); break;
        case 'sl-more-contact': D.moreContact = true; refreshStep(); setTimeout(function () { var f = document.getElementById('n-email'); if (f) f.focus(); }, 30); break;
        case 'sl-occ-open': D.occOpen = true; refreshStep(); break;
        // settings
        case 'save-loc': saveLoc(); break;
        case 'confirm-loc': saveLoc(true); break;
        case 'add-closed': var cd = val('st-cdate'); if (!cd) { toast('Choose a date.', true); break; } sb.from('closed_dates').insert({ location_id: S.settings.loc.id, closed_on: cd, reason: val('st-creason').trim() || null }).then(function (r) { if (r.error) throw r.error.code === '23505' ? new Error('That day is already closed') : r.error; toast('Closed day added'); refreshSetup(); loadSettings(); }).catch(fail); break;
        case 'del-closed':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to remove'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Remove'; } }, 4000); break; }
          markBusy(b, 'Removing…'); sb.from('closed_dates').delete().eq('id', b.dataset.id).then(function (r) { if (r.error) throw r.error; toast('Removed'); refreshSetup(); loadSettings(); }).catch(fail); break;
        case 'save-prod': saveProduct(b.dataset.id, b); break;
        case 'my-password': S.sheet = { type: 'pw' }; S.pwErr = null; S.dirty = {}; renderSheet(); var pf = document.getElementById('ccs-pw1'); if (pf) pf.focus(); break;
        case 'tm-gen': var gid = b.dataset.for || 'tm-new-p', gi = document.getElementById(gid); if (gi) { gi.value = makePassword(); gi.focus(); } break;
        case 'tm-reset': S.settings.resetFor = b.dataset.id || null; S.settings.resetErr = null; S.settings.tmOpen = true; view(); break;
        case 'tm-add': teamAdd(); break;
        case 'mail-resend': mailResend(); break;
        case 'mail-update': mailUpdate(); break;
        case 'mail-noupdate': S.askUpdate = null; renderSheet(); break;
        case 'mail-hold': mailHold(v === '1'); break;
        case 'mail-reload': if (S.sheet && S.sheet.data) { mailLoad(S.sheet.data.id); renderSheet(); } break;
        case 'tm-rm': S.settings.tmAsk = { id: b.dataset.id, kind: 'rm' }; S.settings.tmMenu = null; view(); break;
        case 'tm-new': staffSheetOpen(null); break;
        case 'tm-edit': staffSheetOpen(b.dataset.id); break;
        case 'tm-menu': S.settings.tmMenu = S.settings.tmMenu === b.dataset.id ? null : b.dataset.id; S.settings.tmAsk = null; view(); break;
        case 'tm-sort': var so = S.settings; if ((so.tmSort || 'name') === b.dataset.v) so.tmAsc = so.tmAsc === false; else { so.tmSort = b.dataset.v; so.tmAsc = true; } view(); break;
        case 'tm-acc': var ua = teamFind(b.dataset.id); if (!ua) break; S.settings.tmMenu = null; if (ua.active) { S.settings.tmAsk = { id: ua.user_id, kind: 'off' }; view(); } else { markBusy(b, 'Saving…'); teamSetAccess(ua, true); } break;
        case 'tm-link': S.settings.tmAsk = { id: b.dataset.id, kind: 'link' }; S.settings.tmMenu = null; view(); break;
        case 'tm-ask-no': S.settings.tmAsk = null; view(); break;
        case 'tm-ask-yes': var ak = S.settings.tmAsk, uk = ak && teamFind(ak.id); if (!uk) break; markBusy(b, 'Working…');
          if (ak.kind === 'off') teamSetAccess(uk, false); else if (ak.kind === 'link') teamSendLink(uk.user_id);
          else staffAdmin({ op: 'remove', user_id: uk.user_id }).then(function (r) { clearBusy(); if (!r) return; if (!r.ok) { S.settings.tmAsk.err = r.message || 'This person could not be removed.'; return view(); } S.settings.tmAsk = null; toast('Removed from the team'); loadSettingsKeep(null); }).catch(function (e) { clearBusy(); fail(e); });
          break;
        case 'tm-see-perms': sheetClose(); S.settings.tmTab = 'perms'; S.settings.tmOpen = true; view(); break;
        case 'tmf-link': S.sheet.ask = 'link'; renderSheet(); break;
        case 'tmf-rm': S.sheet.ask = 'rm'; renderSheet(); break;
        case 'tmf-ask-no': S.sheet.ask = null; renderSheet(); break;
        case 'tmf-link-yes': var sl = S.sheet; markBusy(b, 'Sending…'); staffAdmin({ op: 'send_link', user_id: sl.id }).then(function (r) { clearBusy(); if (!r) return; sl.ask = null; if (!r.ok) { sl.err = r.message || 'The link could not be sent.'; return renderSheet(); } renderSheet(); toast('Link sent to ' + (r.email || sl.f.email)); }).catch(function (e) { clearBusy(); fail(e); }); break;
        case 'tmf-rm-yes': var sr = S.sheet; markBusy(b, 'Removing…'); staffAdmin({ op: 'remove', user_id: sr.id }).then(function (r) { clearBusy(); if (!r) return; if (!r.ok) { sr.ask = null; sr.err = r.message || 'This person could not be removed.'; return renderSheet(); } S.dirty = {}; sheetClose(); toast('Removed from the team'); loadSettingsKeep(null); }).catch(function (e) { clearBusy(); fail(e); }); break;
        case 'tm-rm-yes': teamRemove(b.dataset.id); break;
        case 'lv-add': lvClear(); S.settings.lvEdit = { id: null, name: '', grants: [] }; S.settings.lvErr = null; S.settings.lvOpen = true; view(); break;
        case 'lv-edit': var lv0 = (S.settings.levels || []).filter(function (x) { return x.id === b.dataset.id; })[0]; if (lv0) { lvClear(); S.settings.lvEdit = { id: lv0.id, name: lv0.name, grants: lv0.grants.slice() }; S.settings.lvErr = null; S.settings.lvDel = null; S.settings.lvOpen = true; view(); } break;
        case 'lv-cancel': lvClear(); S.settings.lvEdit = null; S.settings.lvErr = null; view(); break;
        case 'lv-save': levelSave(); break;
        case 'lv-del': S.settings.lvDel = b.dataset.id || null; S.settings.lvErr = null; S.settings.lvOpen = true; view(); break;
        case 'lv-del-yes': levelDelete(b.dataset.id); break;
        case 'bk-reload': S.settings.bk = null; S.settings.bkOpen = true; view(); backupLoad(); break;
        case 'bk-mail': (navigator.clipboard ? navigator.clipboard.writeText(S.settings.bk.robot_email) : Promise.reject()).then(function () { toast('Address copied'); }, function () { toast('Select the address and copy it.', true); }); break;
        case 'bk-link': backupLink(); break;
        case 'bk-change': S.settings.bkChange = v === '1'; S.settings.bkErr = null; S.settings.bkOpen = true; view(); break;
        case 'bk-copy': var bst = S.settings; sheetBackup({ op: 'copy' }).then(function (r) { backupDone(bst, r, function (x) { return (x.written || 0) + ' orders copied'; }); }).catch(fail); break;
        case 'bk-unlink':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to stop the backup'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Stop backup'; } }, 4000); break; }
          markBusy(b, 'Stopping…'); var ust = S.settings; sheetBackup({ op: 'unlink' }).then(function (r) { backupDone(ust, r, function () { return 'Backup stopped. The sheet keeps what it has.'; }); }).catch(fail); break;
        case 'tm-reset-save': teamReset(b.dataset.id); break;
        case 'pr-reload': S.settings.prOpen = true; prLoad(); break;
        case 'pr-save': prSave(); break;
        case 'al-save': alSave(); break;
        case 'al-add': alGrab(); S.settings.alOpen = true; if (S.settings.alList.length < 5) S.settings.alList.push(''); view(); setTimeout(function () { var el = document.getElementById('al-e' + (S.settings.alList.length - 1)); if (el) el.focus(); }, 30); break;
        case 'al-del': alGrab(); S.settings.alOpen = true; S.settings.alList.splice(+v, 1); view(); break;
        case 'al-reload': S.settings.alErr = null; alLoad(); view(); break;
        case 'pr-test': prCall('admin_print_test', {}, function (d) { return 'Test slip sent' + (d.test_mode ? ' to ' + d.test_email + ' (test mode)' : ' to ' + d.to) + '. Check it printed, then confirm here.'; }); setTimeout(prLoad, 8000); break;
        case 'pr-ok': prCall('admin_print_test_confirm', {}, function () { return 'Printer confirmed'; }); break;
        case 'pr-resend':
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to send v' + v + ' again'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Send again'; } }, 4000); break; }
          markBusy(b, 'Sending…'); prCall('admin_slip_resend', { p_order: b.dataset.id }, function (d) { return d.reference + ' slip v' + d.version + ' sent again'; }); break;
        case 'k-printed': slipPrinted(b); break;
        case 'sl-phx': var px = D.photos.splice(Number(v), 1)[0]; if (px && px.url) { try { URL.revokeObjectURL(px.url); } catch (x2) {} } if (!phLive(D.photos).filter(function (x) { return x.status === 'failed'; }).length) D.phErr = null; saveDraft(); refreshStep(); break;
        case 'o-phx': if (S.sheet && S.sheet.addPh) { S.sheet.addPh.splice(Number(v), 1); S.sheet.phErr = null; renderSheet(); } break;
        case 'mir-show': case 'mir-new':
          if (a === 'mir-new' && b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'tap again to make a new code'; setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'make a new code'; } }, 4000); break; }
          var mst = S.settings; sb.rpc(a === 'mir-new' ? 'mirror_new_code' : 'mirror_setup_code').then(function (r) { clearBusy(); if (r.error) throw r.error; if (!r.data.ok) { toast(r.data.message, true); return; } mst.mirCode = r.data.code; mst.s5BcOpen = true; if (a === 'mir-new') toast('New code made. Paste it into the Sheet: Cake backup, then Change the access code.'); view(); }).catch(fail); break;
        case 'mir-hide': S.settings.mirCode = null; view(); break;
        case 'mir-copy': (navigator.clipboard ? navigator.clipboard.writeText(S.settings.mirCode) : Promise.reject()).then(function () { toast('Code copied'); }, function () { toast('Select the code and copy it.', true); }); break;
        case 'save-staff': var uid = b.dataset.id; sb.rpc('admin_set_staff_level', { p_user: uid, p_name: val('tm-n-' + uid), p_level: val('tm-r-' + uid), p_active: document.getElementById('tm-a-' + uid).checked }).then(function (r) { if (r.error) throw r.error; if (!r.data.ok) throw userErr(r.data.message); toast('Team updated'); loadSettings(); }).catch(fail); break;
      }
    } catch (err) { fail(err); }
  });
  root.addEventListener('input', function (e) {
    var t = e.target; setTypedIn(t);
    if (t.id && t.closest && t.closest('#ccs-sheet') && t.type !== 'checkbox' && t.type !== 'file' && !newInSheet()) { S.dirty[t.id] = t.value; wipSoon(); }
    // The handover note is kept as it is typed, so a refresh or the minute update never loses it
    if (t.id === 'ho-note') { S.ho = S.ho || {}; S.ho.draft = t.value; wipHo(); return; }
    if (t.id === 'tp-q') { if (t.value.trim().length >= 2) { S.q = t.value; searchOlder(t.value); goTab('orders'); var nq = document.getElementById('ccs-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(nq.value.length, nq.value.length); } catch (x) {} } } return; }
    if (t.id === 'tm-q' && S.settings) { S.settings.tmQ = t.value; var tpos = t.selectionStart; view(); var tq = document.getElementById('tm-q'); if (tq) { tq.focus(); try { tq.setSelectionRange(tpos, tpos); } catch (x) {} } return; }
    if (t.id === 'ccs-q') { S.q = t.value; searchOlder(t.value); var m = document.getElementById('ccs-main'); var pos = t.selectionStart; view(); var n = document.getElementById('ccs-q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} return; }
    if (t.id === 'ccs-cq') { S.cust.q = t.value; clearTimeout(searchTimer); searchTimer = setTimeout(function () { loadCustomers().then(function () { var n = document.getElementById('ccs-cq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 350); return; }
    if ((t.dataset.mf || t.dataset.mfs || t.dataset.mfv != null) && S.mf) { mfInput(t); return; }
    if (t.dataset.am && S.am) { S.am[t.dataset.am] = t.value; S.am.preview = null; wipSoon(); return; }
    if (t.dataset.f && S.ful) { S.ful[t.dataset.f] = t.value; return; }
    var k = t.dataset.n; if (!k) return;
    D[k] = k === 'qty' ? Math.max(1, Math.min(50, parseInt(t.value, 10) || 1)) : t.value;
    if (D.errField) { D.err = null; D.errField = null; var er = t.closest('.ccs-step-body') && t.closest('.ccs-step-body').querySelector('.ccs-err'); if (er) er.remove(); }
    if (k === 'phone') { D.customer = null; searchCustomers(); }
    if (k === 'name' && SLIP) nameSearch();
    if (SLIP && D.errField === null && D.err == null) { var se = document.querySelector('#ccs-slipform .sl-ed .ccs-err'); if (se && t.closest('.sl-ed')) se.remove(); }
    if (k === 'date') refreshStep();
    if (k === 'payAmount' && !S.busy) root.querySelectorAll('[data-act="n-submit"]').forEach(function (b) { b.textContent = saveText(); });
    if (SLIP && STEPPER && k !== 'date') slLiveSoon();
    saveDraft();
  });
  root.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.slipopt) { slipPickSet(e.target.dataset.slipopt, e.target.checked); renderSheet(); var f = document.querySelector('#ccs-sheet [data-slipopt="' + e.target.dataset.slipopt + '"]'); if (f) f.focus(); return; }
    if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') setTypedIn(e.target);
    var d = e.target.dataset;
    if ((e.target.id === 'tm-flv' || e.target.id === 'tm-fst') && S.settings) { if (e.target.id === 'tm-flv') S.settings.tmLv = e.target.value; else S.settings.tmSt = e.target.value; view(); return; }
    if (e.target.id === 'tmf-l' && S.sheet && S.sheet.type === 'staff') { S.sheet.f.name = val('tmf-n'); var em = document.getElementById('tmf-e'); if (em) S.sheet.f.email = em.value; S.sheet.f.level = e.target.value; renderSheet(); return; }
    if (S.mf && (d.mfsa != null || d.mfva != null || d.mfc)) { if (d.mfsa != null) S.mf.f.sizes[Number(d.mfsa)].active = e.target.checked; else if (d.mfva != null) S.mf.f.flavours[Number(d.mfva)].active = e.target.checked; else S.mf.f[d.mfc] = e.target.checked; S.dirty['mf-ck'] = 1; return; }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'n-photos') { D.phErr = phUpload(D.photos, e.target.files, 5, function () { saveDraft(); refreshStep(); }); e.target.value = ''; refreshStep(); return; }
    if (e.target.id === 'o-photos') { orderPhotos(e.target.files); e.target.value = ''; return; }
    if (e.target.id === 'mf-photo' && S.mf) { mfPhoto(e.target.files[0]); e.target.value = ''; return; }
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
    if (e.target.id === 'am-zone' && S.am) { amendSet('zone', e.target.value); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen()) { menuSet(false); return; }
    if (e.key === 'Escape' && S.cust && S.cust.tools) { S.cust.tools = false; view(); var tb = document.querySelector('[data-act="ws-cm-tools"]'); if (tb) tb.focus(); return; }
    if (e.key !== 'Escape' || !S.sheet) return;
    if (hasTyping()) { if (!pauseable()) { toast('Save or cancel your changes first.', true); return; } var pz = pauseWork(); S.dirty = {}; sheetClose(); if (pz) toast(pz); return; }
    if (S.panel) { S.panel = null; S.panelErr = null; S.am = null; renderSheet(); } else sheetClose();
  });
  // Tab stays inside the open review
  // The pop-up window itself never scrolls: only its columns do. A jump to a section (scrollIntoView) would otherwise
  // scroll the whole window, hiding the header and leaving a blank band at the bottom.
  document.addEventListener('scroll', function (e) { var t = e.target; if (t && t.nodeType === 1 && (t.id === 'ccs-sheet' || (t.classList.contains('os-grid') && getComputedStyle(t).overflowY !== 'auto')) && (t.scrollTop || t.scrollLeft)) { t.scrollTop = 0; t.scrollLeft = 0; } }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !S.sheet || LB) return;
    var sh = document.getElementById('ccs-sheet'); if (!sh || !sh.classList.contains('ccs-open')) return;
    var f = [].slice.call(sh.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (x) { return x.offsetParent; });
    if (!f.length) return;
    var at = f.indexOf(document.activeElement);
    if (at < 0) { e.preventDefault(); f[0].focus(); return; }
    if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); } else if (e.shiftKey && at === 0) { e.preventDefault(); f[f.length - 1].focus(); }
  });
  // Phones: the review fits above the on-screen keyboard, and the field being typed in stays in view
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { var sh = document.getElementById('ccs-sheet'); if (sh) sh.style.setProperty('--vvh', window.visualViewport.height + 'px'); });
  document.addEventListener('focusin', function (e) {
    var sh = document.getElementById('ccs-sheet'), t = e.target; if (!sh || !sh.contains(t) || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || window.innerWidth >= 760) return;
    setTimeout(function () { if (document.activeElement === t && t.scrollIntoView) t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 320);
  });
  function tick() { if (!S.me || document.visibilityState !== 'visible') return; if (S.tab === 'kitchen') loadKitchen(true); else loadOrders(true); if (S.tab === 'calendar' && !S.sheet) calLoad(true); }
  setInterval(tick, 30000); // new orders show within 30 seconds while the app is open
  document.addEventListener('visibilitychange', tick);

  boot();
})();
