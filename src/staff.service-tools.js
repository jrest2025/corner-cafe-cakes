/* Corner Café Service Hub: service tools (26 October 2026).
 * Roneel: "go ahead" with
 *  1. Cake is ready, in two taps: on a confirmed order that is not ready yet, "Cake is ready" asks who checked the
 *     cake, then uses the app's own kitchen action (kitchen_set_stage: quality check, then ready with that name).
 *     The kitchen rule stays: a cake is only marked ready with the name of the person who checked it. The order
 *     then reopens, so the app's own "Let the customer know" WhatsApp button appears.
 *  2. Online orders waiting: during opening hours, online orders not confirmed after 30 minutes show at the top of
 *     Today, oldest first, with an Open button. (Online orders were taking about 5 hours to be confirmed.)
 * No new database functions or rules. If anything here fails, the app works exactly as before.
 */
(function (win, doc) {
  'use strict';
  if (win.__ccServiceTools20261026) return;
  win.__ccServiceTools20261026 = true;

  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var WAIT_MIN = 30, OPEN_FROM = 8, OPEN_TO = 21;          // alert window, Fiji time (collection hours are 9 AM to 8 PM)
  var client = null;
  function db() {
    if (client) return client;
    if (!win.supabase || !win.supabase.createClient) return null;
    client = win.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function warn(w, e) { try { console.warn('[Service tools] ' + w, e); } catch (_) {} }
  function fijiHour() { if (typeof win.__ccTestHour === 'number') return win.__ccTestHour; return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Fiji', hour: '2-digit', hour12: false }).format(new Date())) % 24; }
  function mins(at) { return Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60000)); }
  function waited(m) { return m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + ' h ' + (m % 60 ? m % 60 + ' min' : '') : Math.floor(m / 1440) + ' day' + (m >= 2880 ? 's' : ''); }
  function openOrder(id) {
    var host = doc.getElementById('ccs-sheet') || doc.getElementById('cc-staff'); if (!host || !id) return;
    var b = doc.createElement('button'); b.type = 'button'; b.hidden = true; b.setAttribute('data-act', 'open-order'); b.setAttribute('data-id', id);
    host.appendChild(b); b.click(); b.remove();
  }

  function ensureStyle() {
    if (doc.getElementById('cc-service-tools-style')) return;
    var s = doc.createElement('style'); s.id = 'cc-service-tools-style';
    s.textContent =
      '#ccs-sheet .cc-st-ready{color:#1D2939!important;border-color:#D0D5DD!important;background:#fff!important;display:inline-flex;align-items:center;justify-content:center;gap:8px}#ccs-sheet .cc-st-ready svg{width:18px;height:18px;flex:none}' +   // 28 Oct 2026: an action, not a status (green read as "the cake is ready")
      '#ccs-sheet .cc-st-panel{border:1px solid #ABEFC6;border-radius:12px;background:#fff;padding:14px 16px;margin:10px 0}' +
      '#ccs-sheet .cc-st-panel b.cc-st-q{display:block;color:#1D2939;margin-bottom:4px}' +
      '#ccs-sheet .cc-st-panel p{margin:0 0 10px;color:#475467;line-height:1.4}' +
      '#ccs-sheet .cc-st-names{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}' +
      '#ccs-sheet .cc-st-other{display:flex;gap:8px;flex-wrap:wrap}#ccs-sheet .cc-st-other input{flex:1 1 180px;min-width:0}' +
      '#ccs-sheet .cc-st-err{color:#B42318;font-weight:600;margin:8px 0 0}' +
      '#ccs-main .cc-st-alert{border:1px solid #FEC84B;border-left:6px solid #F79009;border-radius:12px;background:#FFFCF5;padding:14px 16px;margin:0 0 14px}' +
      '#ccs-main .cc-st-alert h3{margin:0 0 8px;font-size:18px;color:#1D2939}' +
      '#ccs-main .cc-st-alert p{margin:0 0 8px;color:#475467}' +
      '#ccs-main .cc-st-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 0;border-top:1px solid #FEF0C7}' +
      '#ccs-main .cc-st-row:first-of-type{border-top:0}' +
      '#ccs-main .cc-st-row b{color:#1D2939}#ccs-main .cc-st-row small{display:block;color:#475467}' +
      '#ccs-main .cc-st-row .ccs-btn{min-height:44px}' +
      '@media (hover:none) and (pointer:coarse){#ccs-main .cc-st-row .ccs-btn,#ccs-sheet .cc-st-panel .ccs-btn{min-height:52px}}';
    doc.head.appendChild(s);
  }

  // ---------- 1. Cake is ready ----------
  var sheetRef = null, sheetInfo = null, loadingRef = null, panelOpen = false, readyErr = null;
  function currentRef() {
    var h = doc.querySelector('#ccs-sheet .ccs-sheet-head'); if (!h) return null;
    var m = /(?:^|[^A-Z])((?:CC|H|W)-\d{3,6})(?!\d)/.exec(h.textContent || ''); return m ? m[1] : null;
  }
  function staffName() { var e = doc.querySelector('#cc-staff .ccs-who b, #cc-staff .ccs-who strong, #cc-staff .ccs-who-name'); var t = ''; if (e) { for (var i = 0; i < e.childNodes.length; i++) { if (e.childNodes[i].nodeType === 3) t += e.childNodes[i].nodeValue; } t = t.trim() || e.textContent.trim(); } return t && t.length >= 2 ? t : ''; }
  function recentNames() { try { return JSON.parse(win.localStorage.getItem('cc-ready-names') || '[]').slice(0, 4); } catch (_) { return []; } }
  function rememberName(n) { try { var l = [n].concat(recentNames().filter(function (x) { return x !== n; })).slice(0, 4); win.localStorage.setItem('cc-ready-names', JSON.stringify(l)); } catch (_) {} }
  function lookup(ref) {
    var c = db(); if (!c || loadingRef === ref) return;
    loadingRef = ref;
    c.from('orders').select('id,reference,order_status,production_status').eq('reference', ref).then(function (r) {
      loadingRef = null;
      var row = r && !r.error && (Array.isArray(r.data) ? r.data.filter(function (x) { return x.reference === ref; })[0] : r.data);
      if (ref === sheetRef) { sheetInfo = row || { none: true }; schedule(); }
    }, function () { loadingRef = null; });
  }
  function readyUi() {
    var sheet = doc.getElementById('ccs-sheet'), ref = currentRef();
    if (!sheet || !ref) { sheetRef = null; sheetInfo = null; panelOpen = false; return; }
    if (ref !== sheetRef) { sheetRef = ref; sheetInfo = null; panelOpen = false; readyErr = null; lookup(ref); return; }
    if (!sheetInfo || sheetInfo.none) return;
    var can = sheetInfo.order_status === 'confirmed' && sheetInfo.production_status !== 'ready';
    if (!can) return;
    if (sheet.querySelector('[data-act^="do-"]')) return;                       // one of the app's own panels is open
    var row = sheet.querySelector('.ccs-actions-row [data-act="panel"][data-v="collected"], .ccs-actions-row [data-act="panel"][data-v="brief"]');
    row = row && row.closest('.ccs-actions-row'); if (!row) return;
    if (!row.querySelector('.cc-st-ready')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccs-btn ccs-ghost cc-st-ready'; b.setAttribute('data-cc-ready', '1'); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>Mark cake ready';
      row.insertBefore(b, row.firstChild);
    }
    var panel = sheet.querySelector('.cc-st-panel');
    if (panelOpen && !panel) {
      var me = staffName(), names = [];
      if (me) names.push(me);
      recentNames().forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
      panel = doc.createElement('div'); panel.className = 'cc-st-panel';
      panel.innerHTML = '<b class="cc-st-q">Who checked the cake?</b><p>Tap the name of the person who checked it. The order history shows who checked it and when.</p>' +
        '<div class="cc-st-names">' + names.map(function (n) { return '<button type="button" class="ccs-chip" data-cc-ready-name="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div>' +
        '<div class="cc-st-other"><input class="ccs-input" id="cc-st-name" placeholder="Another name" autocomplete="off"><button type="button" class="ccs-btn" data-cc-ready-go="1">Mark ready</button>' +
        '<button type="button" class="ccs-btn ccs-ghost" data-cc-ready-cancel="1">Back</button></div>' + (readyErr ? '<p class="cc-st-err" role="alert">' + esc(readyErr) + '</p>' : '');
      row.parentNode.insertBefore(panel, row.nextSibling);
    } else if (!panelOpen && panel) panel.remove();
  }
  function markReady(name) {
    name = String(name || '').replace(/\s+/g, ' ').trim();
    if (name.length < 2) { readyErr = 'Tap or type the name of the person who checked the cake.'; var p = doc.querySelector('#ccs-sheet .cc-st-panel'); if (p) p.remove(); schedule(); return; }
    var c = db(), info = sheetInfo; if (!c || !info || !info.id) return;
    var p0 = doc.querySelector('#ccs-sheet .cc-st-panel'); if (p0) [].forEach.call(p0.querySelectorAll('button,input'), function (x) { x.disabled = true; });
    var step = info.production_status === 'quality_check' ? Promise.resolve({ data: { ok: true } }) : c.rpc('kitchen_set_stage', { p_order: info.id, p_stage: 'quality_check', p_name: null });
    step.then(function (r) {
      if (r.error || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || 'Could not save. Try again.');
      return c.rpc('kitchen_set_stage', { p_order: info.id, p_stage: 'ready', p_name: name });
    }).then(function (r) {
      if (r.error || !r.data || !r.data.ok) throw new Error((r.data && r.data.message) || 'Could not save. Try again.');
      rememberName(name); panelOpen = false; readyErr = null; sheetInfo = null; sheetRef = null;
      openOrder(info.id);                                                   // reopen: the app shows Ready and "Let the customer know"
    }).catch(function (e) {
      readyErr = e && e.message ? e.message : 'Could not save. Try again.';
      var p = doc.querySelector('#ccs-sheet .cc-st-panel'); if (p) p.remove(); schedule();
    });
  }
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest('#ccs-sheet [data-cc-ready]'))) { e.preventDefault(); e.stopPropagation(); panelOpen = !panelOpen; readyErr = null; schedule(); return; }
    if ((b = t.closest('#ccs-sheet [data-cc-ready-cancel]'))) { e.preventDefault(); e.stopPropagation(); panelOpen = false; readyErr = null; schedule(); return; }
    if ((b = t.closest('#ccs-sheet [data-cc-ready-name]'))) { e.preventDefault(); e.stopPropagation(); markReady(b.getAttribute('data-cc-ready-name')); return; }
    if ((b = t.closest('#ccs-sheet [data-cc-ready-go]'))) { e.preventDefault(); e.stopPropagation(); var i = doc.getElementById('cc-st-name'); markReady(i && i.value); return; }
  }, true);

  // ---------- 2. Online orders waiting ----------
  var waiting = null, lastFetch = 0, fetching = false;
  function fetchWaiting() {
    var c = db(); if (!c || fetching || Date.now() - lastFetch < 120000) return;
    fetching = true;
    c.from('orders').select('id,reference,created_at,order_status,source,is_test,deleted_at,contact_name,customers(full_name)')
      .eq('source', 'online').eq('is_test', false).in('order_status', ['awaiting_review', 'awaiting_quote'])
      .then(function (r) {
        fetching = false; lastFetch = Date.now();
        if (r.error || !Array.isArray(r.data)) { waiting = null; schedule(); return; }
        waiting = r.data.filter(function (o) { return o.source === 'online' && !o.is_test && !o.deleted_at && (o.order_status === 'awaiting_review' || o.order_status === 'awaiting_quote') && mins(o.created_at) >= WAIT_MIN; })
          .sort(function (a, b) { return a.created_at < b.created_at ? -1 : 1; });
        schedule();
      }, function () { fetching = false; lastFetch = Date.now(); });
  }
  function alertUi() {
    var main = doc.querySelector('#ccs-main[data-screen="today"]'), box = doc.querySelector('#ccs-main .cc-st-alert');
    var h = fijiHour(), open = h >= OPEN_FROM && h < OPEN_TO;
    if (!main || !open) { if (box) box.remove(); return; }
    fetchWaiting();
    if (!waiting || !waiting.length) { if (box) box.remove(); return; }
    var list = waiting.slice(0, 3), more = waiting.length - list.length, sig = waiting.map(function (o) { return o.id + ':' + Math.floor(mins(o.created_at) / 5); }).join('|');
    if (box && box.getAttribute('data-sig') === sig) return;
    var html = '<h3>' + (waiting.length === 1 ? 'An online order is waiting' : waiting.length + ' online orders are waiting') + '</h3>' +
      '<p>Customers are waiting to hear back. Check ' + (waiting.length === 1 ? 'it' : 'them') + ' and confirm, or call the customer.</p>' +
      list.map(function (o) {
        var who = (o.customers && o.customers.full_name) || o.contact_name || 'Customer';
        return '<div class="cc-st-row"><span><b>' + esc(o.reference) + ' · ' + esc(who) + '</b><small>' + (o.order_status === 'awaiting_quote' ? 'Needs a price · ' : 'Needs checking · ') + 'waiting ' + esc(waited(mins(o.created_at))) + '</small></span>' +
          '<button type="button" class="ccs-btn" data-cc-wait-open="' + esc(o.id) + '">Open</button></div>';
      }).join('') + (more > 0 ? '<p>And ' + more + ' more in Orders.</p>' : '');
    if (!box) { box = doc.createElement('section'); box.className = 'cc-st-alert'; box.setAttribute('role', 'status'); var head = main.querySelector('.ccs-head'); if (head && head.nextSibling) main.insertBefore(box, head.nextSibling); else main.insertBefore(box, main.firstChild); }
    box.innerHTML = html; box.setAttribute('data-sig', sig);
  }
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#ccs-main [data-cc-wait-open]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); openOrder(b.getAttribute('data-cc-wait-open')); lastFetch = 0;
  }, true);
  setInterval(function () { lastFetch = 0; schedule(); }, 120000);

  // ---------- keep up with the app's redraws ----------
  var queued = false;
  function run() { queued = false; try { ensureStyle(); readyUi(); alertUi(); } catch (e) { warn('update', e); } }
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(run); }
  function boot() { schedule(); new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(window, document);
