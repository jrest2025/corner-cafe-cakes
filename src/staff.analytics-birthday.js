/* Corner Café Analytics: Birthday comeback list (26 October 2026).
 * Roneel: "what meaningful data can be extracted and presented" -> "yes please" to the Birthday comeback list.
 * A card in Analytics > Customers: customers whose last birthday cake was about a year ago and whose day is coming
 * round again, who have not ordered since. Shows how many, how many can be messaged now, the value of their last
 * cakes, a 12-month outlook, and the people themselves. Messaging follows permission:
 *   Can message  - WhatsApp permission on record (a WhatsApp button with a friendly message ready to send)
 *   Check first  - permission carried over from the old order sheets, marked for reconfirming
 *   Ask first    - no permission on record; ask next time they are in touch
 * Data: crm_birthday_comeback (supabase/sql/crm_birthday_comeback_20261026.sql), read only.
 * Nothing else in Analytics changes. Daily cake demand is not touched.
 */
(function (win, doc) {
  'use strict';
  if (win.__ccBirthdayComeback20261026) return;
  win.__ccBirthdayComeback20261026 = true;

  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var client = null, days = 60, cache = {}, busy = {}, err = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return '$' + (n % 1 ? n.toFixed(2) : n.toFixed(0)); }
  function day(iso) { var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/,/g, ''); }
  function monthLabel(ym) { var d = new Date(ym + '-01T12:00:00Z'); return d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).slice(0, 3); }
  function soon(n) { return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  function first(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }
  function waLink(phone, text) {
    var d = String(phone || '').replace(/\D/g, ''); if (!d) return '';
    if (d.length === 7) d = '679' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text);
  }
  function getClient() {
    if (client) return client;
    if (!win.supabase || !win.supabase.createClient) return null;
    client = win.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
  function load(n) {
    if (busy[n] || (cache[n] && Date.now() - cache[n].at < 300000)) return;
    var c = getClient(); if (!c) { err = 'Not connected yet.'; schedule(); return; }
    busy[n] = true;
    c.rpc('crm_birthday_comeback', { p_days: n }).then(function (r) {
      busy[n] = false;
      if (r.error || !r.data || !r.data.ok) { err = (r.data && r.data.message) || 'Could not load the list. Try again.'; }
      else { err = null; cache[n] = { at: Date.now(), data: r.data }; }
      schedule();
    }, function () { busy[n] = false; err = 'Could not load the list. Check the connection and try again.'; schedule(); });
  }

  function ensureStyle() {
    if (doc.getElementById('cc-bc-style')) return;
    var s = doc.createElement('style'); s.id = 'cc-bc-style';
    s.textContent =
      '#ccs-main .cc-bc .cc-bc-tools{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}' +
      '#ccs-main .cc-bc .cc-bc-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px}' +
      '#ccs-main .cc-bc .cc-bc-kpi{border:1px solid #E4E7EC;border-radius:12px;padding:12px 14px;background:#fff}' +
      '#ccs-main .cc-bc .cc-bc-kpi span{display:block;font-size:13px;color:#475467}' +
      '#ccs-main .cc-bc .cc-bc-kpi b{display:block;font-size:26px;line-height:1.2;color:#1D2939;font-variant-numeric:tabular-nums}' +
      '#ccs-main .cc-bc .cc-bc-kpi small{display:block;font-size:12px;color:#475467;margin-top:2px}' +
      '#ccs-main .cc-bc .cc-bc-h4{font-size:15px;font-weight:700;color:#1D2939;margin:6px 0 8px}' +
      '#ccs-main .cc-bc .cc-bc-cols{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:150px;padding:0 2px;border-bottom:1px solid #E4E7EC}' +
      '#ccs-main .cc-bc .cc-bc-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}' +
      '#ccs-main .cc-bc .cc-bc-col i{display:block;width:100%;max-width:34px;border-radius:5px 5px 0 0;background:#7F56D9;min-height:2px}' +
      '#ccs-main .cc-bc .cc-bc-col.is-now i{background:#B692F6}' +
      '#ccs-main .cc-bc .cc-bc-col em{font-style:normal;font-size:12px;font-weight:700;color:#1D2939;margin-bottom:3px}' +
      '#ccs-main .cc-bc .cc-bc-mon{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;margin:6px 0 4px}' +
      '#ccs-main .cc-bc .cc-bc-mon span{text-align:center;font-size:12px;color:#475467;min-width:0;overflow:hidden}' +
      '#ccs-main .cc-bc .cc-bc-note{font-size:13px;color:#475467;margin:6px 0 14px;line-height:1.45}' +
      '#ccs-main .cc-bc .cc-bc-list{display:grid;gap:8px}' +
      '#ccs-main .cc-bc .cc-bc-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.3fr) auto;gap:12px;align-items:center;border:1px solid #E4E7EC;border-radius:12px;padding:10px 12px;background:#fff}' +
      '#ccs-main .cc-bc .cc-bc-row b{color:#1D2939}' +
      '#ccs-main .cc-bc .cc-bc-row small{display:block;color:#475467;font-size:13px}' +
      '#ccs-main .cc-bc .cc-bc-name{background:none;border:0;padding:0;text-align:left;font:inherit;font-weight:700;color:#1D4ED8;cursor:pointer}' +
      '#ccs-main .cc-bc .cc-bc-act{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}' +
      '#ccs-main .cc-bc .cc-bc-tag{font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;white-space:nowrap}' +
      '#ccs-main .cc-bc .cc-bc-yes{background:#ECFDF3;color:#067647}' +
      '#ccs-main .cc-bc .cc-bc-check{background:#FFFAEB;color:#B54708}' +
      '#ccs-main .cc-bc .cc-bc-ask{background:#F2F4F7;color:#344054}' +
      '#ccs-main .cc-bc .cc-bc-wa{min-height:40px;white-space:nowrap}' +
      '#ccs-main .cc-bc .cc-bc-empty{padding:18px;border:1px dashed #D0D5DD;border-radius:12px;color:#475467;text-align:center}' +
      '@media (max-width:759px){#ccs-main .cc-bc .cc-bc-kpis{gap:6px}#ccs-main .cc-bc .cc-bc-kpi{padding:10px}#ccs-main .cc-bc .cc-bc-kpi b{font-size:21px}#ccs-main .cc-bc .cc-bc-kpi small{display:none}' +
      '#ccs-main .cc-bc .cc-bc-row{grid-template-columns:1fr}#ccs-main .cc-bc .cc-bc-act{justify-content:flex-start}' +
      '#ccs-main .cc-bc .cc-bc-cols,#ccs-main .cc-bc .cc-bc-mon{gap:3px}#ccs-main .cc-bc .cc-bc-col em{font-size:11px}}' +
      '@media (hover:none) and (pointer:coarse){#ccs-main .cc-bc .cc-bc-wa{min-height:48px}#ccs-main .cc-bc .cc-bc-name{min-height:44px}}';
    doc.head.appendChild(s);
  }

  function html(d) {
    var head = '<header><h3>Birthday comeback list</h3><span>Last year\'s birthday cakes, coming round again</span></header>' +
      '<div class="cc-bc-tools cat-chips" role="group" aria-label="How far ahead">' +
      [30, 60, 90].map(function (n) { return '<button type="button" class="cat-chip" data-cc-bc-days="' + n + '" aria-pressed="' + (n === days) + '">Next ' + n + ' days</button>'; }).join('') + '</div>';
    if (err && !d) return head + '<p class="cc-bc-empty">' + esc(err) + ' <button type="button" class="ccs-link" data-cc-bc-retry="1">Try again</button></p>';
    if (!d) return head + '<p class="cc-bc-empty">Loading the list…</p>';
    var s = d.summary || {}, months = d.months || [], people = d.people || [];
    var max = Math.max.apply(null, months.map(function (m) { return m.people; }).concat([1]));
    var kpis = '<div class="cc-bc-kpis">' +
      '<div class="cc-bc-kpi"><span>Birthdays coming round</span><b>' + (s.people || 0) + '</b><small>in the next ' + d.days + ' days</small></div>' +
      '<div class="cc-bc-kpi"><span>Can message now</span><b>' + (s.can_message || 0) + '</b><small>' + (s.check_first || 0) + ' to check first · ' + (s.ask_first || 0) + ' to ask first</small></div>' +
      '<div class="cc-bc-kpi"><span>Value of their last cakes</span><b>' + money(s.value) + '</b><small>if they all order again</small></div></div>';
    var chart = '<p class="cc-bc-h4">Birthdays coming round, next 12 months</p>' +
      '<div class="cc-bc-cols" role="img" aria-label="' + esc(months.map(function (m) { return monthLabel(m.month) + ' ' + m.people; }).join(', ')) + '">' +
      months.map(function (m, i) { return '<div class="cc-bc-col' + (i === 0 ? ' is-now' : '') + '" title="' + esc(monthLabel(m.month) + ': ' + m.people + ' people, ' + money(m.value) + ' last time') + '"><em>' + (m.people || '') + '</em><i style="height:' + Math.round(100 * m.people / max) + '%"></i></div>'; }).join('') + '</div>' +
      '<div class="cc-bc-mon">' + months.map(function (m) { return '<span>' + esc(monthLabel(m.month)) + '</span>'; }).join('') + '</div>' +
      '<p class="cc-bc-note">Each bar is customers whose last birthday cake with us falls in that month. The big months are when to plan reminders and kitchen time.</p>';
    var list = !people.length ? '<p class="cc-bc-empty">No birthdays coming round in the next ' + d.days + ' days. Try a longer range.</p>' :
      '<div class="cc-bc-list">' + people.map(function (p) {
        var cake = esc(p.cake || 'Cake') + (p.size ? ' ' + esc(p.size) + '"' : '');
        var tag = p.message === 'yes' ? '<span class="cc-bc-tag cc-bc-yes">Can message</span>' : p.message === 'check' ? '<span class="cc-bc-tag cc-bc-check" title="Agreed on the old order sheets. Confirm before sending.">Check first</span>' : '<span class="cc-bc-tag cc-bc-ask" title="No permission on record. Ask when they are next in touch.">Ask first</span>';
        var msg = 'Bula ' + first(p.name) + '! It\'s almost a year since we made a ' + String(p.cake || 'cake').toLowerCase() + ' for a birthday at Corner Café. Celebrating again soon? Reply here and we\'ll bake it for you. Vinaka!';
        var wa = p.message === 'yes' && p.phone ? '<a class="ccs-btn ccs-ghost cc-bc-wa" href="' + esc(waLink(p.phone, msg)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '';
        return '<div class="cc-bc-row"><div><button type="button" class="cc-bc-name" data-act="open-customer" data-id="' + esc(p.id) + '">' + esc(p.name || 'Customer') + '</button><small>' + esc(p.phone || 'No mobile') + '</small></div>' +
          '<div><b>' + esc(day(p.next)) + '</b><small>' + soon(p.in_days) + '</small></div>' +
          '<div><b>' + cake + ' · ' + money(p.amount) + '</b><small>' + p.orders + (p.orders === 1 ? ' order' : ' orders') + ', ' + money(p.spent) + ' in total</small></div>' +
          '<div class="cc-bc-act">' + tag + wa + '</div></div>';
      }).join('') + '</div>';
    return head + kpis + chart + '<p class="cc-bc-h4">Who to remind</p>' + list +
      '<p class="cc-bc-note">Only send messages to customers marked Can message. Check first means they agreed on the old order sheets, so confirm with them before sending anything else.</p>';
  }

  function render() {
    var page = doc.querySelector('#ccs-main .cat-page[data-cat="cu"]'); if (!page) return;
    ensureStyle();
    var card = page.querySelector('.cc-bc');
    var d = cache[days] && cache[days].data, out = html(d), sig = (d ? days + ':' + cache[days].at : 'x' + days) + ':' + (err || '');
    if (!card) {
      card = doc.createElement('section'); card.className = 'cat-card cat-main cc-bc'; card.setAttribute('aria-label', 'Birthday comeback list');
      var before = page.querySelector('.cat-todo'); if (before) page.insertBefore(card, before); else page.appendChild(card);
    }
    if (card.getAttribute('data-sig') !== sig) { card.innerHTML = out; card.setAttribute('data-sig', sig); }
    if (!d) load(days);
  }

  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#ccs-main .cc-bc [data-cc-bc-days], #ccs-main .cc-bc [data-cc-bc-retry]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.hasAttribute('data-cc-bc-days')) days = Number(b.getAttribute('data-cc-bc-days')) || 60;
    else { err = null; cache[days] = null; }
    render();
  }, true);

  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { render(); } catch (x) { try { console.warn('[Birthday comeback] Not shown; Analytics unchanged', x); } catch (_) {} } }); }
  function boot() { schedule(); new MutationObserver(schedule).observe(doc.getElementById('cc-staff') || doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(window, document);
