/* Corner Café Birthday Club (20 October 2026).
 * Roneel: "can we build a birthday club into the dashboard for the customers.. we can always call them up and wish them
 * and offer something". His choices: customers join at the counter and on the website; one offer for everyone, a free
 * cupcake with a cake ordered within 2 weeks of the birthday, once a year; members show on the call list a week before
 * their birthday, with birthdays today at the top. Nothing is sent automatically.
 *
 *  1. Customers, Birthday Club: birthdays to call (the next 7 days, today first, then up to 3 days late), with Call and
 *     WhatsApp and one tap to record what happened; how the club is doing; members; recent activity; Add a member.
 *     The cards look like the Follow-ups cards.
 *  2. Today: the This week box says how many birthdays there are to call, and opens the Birthday Club.
 *  3. New order, Customer step: Join (birthday day and month) or, for a member near their birthday, the free cupcake.
 *     Both are saved once the order is (birthday_club_join_order, then birthday_club_redeem).
 *  4. An open order can get the free cupcake (for website and phone orders); an open customer profile shows the club,
 *     with Add and Remove.
 * Database: supabase/sql/birthday_club_20261020.sql. The app lends its database client and a few of its own actions as
 * window.__ccsBc (build/staff_birthday_club.py). If anything here fails, the rest of the app carries on.
 */
(function (global) {
  'use strict';
  if (global.CCBirthdayClub) return;
  var VERSION = '2026-10-20-birthday-club-v1';
  var doc = global.document;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var GIFT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9zM3 7h18v4H3zM12 7v14M12 7c-1.6-3.2-5.5-3.6-5.5-1.2C6.5 7 9.5 7 12 7zm0 0c1.6-3.2 5.5-3.6 5.5-1.2C17.5 7 14.5 7 12 7z"/></svg>';
  var OUT = [['wished', 'Wished them'], ['messaged', 'WhatsApp sent'], ['no_answer', 'No answer'], ['not_interested', 'Not interested']];
  var H = { st: 'idle', d: null, at: 0, busy: false, err: null };   // birthday_club_home
  var ST = {};                                                       // birthday_club_status, by customer
  var OO = {};                                                       // birthday_club_order_offer, by order
  var OPEN = {}, CONF = null, BUSY = {}, lastV = null, D = null, opener = null, sheetKey = null;

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pl(n, one, many) { return n === 1 ? one : many; }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function money(v) { return '$' + Math.round(num(v)).toLocaleString('en-US'); }
  function first(name) { return String(name || '').trim().split(/\s+/)[0] || 'there'; }
  function d12(iso) { return new Date(iso + 'T12:00:00Z'); }
  function shortDay(iso) { var x = d12(iso); return WD[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + MON[x.getUTCMonth()]; }
  function longDay(iso) { var x = d12(iso); return WDL[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + MONTHS[x.getUTCMonth()]; }
  function dayMonth(day, month) { return day && month ? day + ' ' + MONTHS[month - 1] : ''; }
  function fijiDay(ts) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date(ts)); } catch (e) { return String(ts).slice(0, 10); } }
  function today() { return H.d && H.d.today ? H.d.today : fijiDay(Date.now()); }
  function addDays(iso, n) { var x = d12(iso); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function time12(ts) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Fiji', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ts)); }
    catch (e) { return ''; }
  }
  function when(ts) {
    var d = fijiDay(ts), t = today();
    return d === t ? time12(ts) : d === addDays(t, -1) ? 'yesterday ' + time12(ts) : shortDay(d) + ', ' + time12(ts);
  }
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function intl(p) { var d = digits(p); if (d.length === 7) return '679' + d; return d.length >= 8 ? d : ''; }
  function telHref(p) { var d = intl(p); return d ? 'tel:+' + d : ''; }
  function waHref(p) {
    var d = intl(p.phone); if (!d) return '';
    var n = first(p.name), offer = 'As a Birthday Club member, you get a free cupcake with a cake ordered within 2 weeks of your birthday. Reply here or call us to order.';
    var msg = p.in_days > 0 ? 'Bula ' + n + ', it is Corner Café. Your birthday is coming up on ' + longDay(p.birthday) + '. ' + offer
      : p.in_days === 0 ? 'Bula ' + n + ', happy birthday from all of us at Corner Café! ' + offer
      : 'Bula ' + n + ', a belated happy birthday from all of us at Corner Café! ' + offer;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg);
  }
  function uuid() {
    try { if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function api() { var a = global.__ccsBc; return a && typeof a.rpc === 'function' ? a : null; }
  function act(name) { var a = api(), args = [].slice.call(arguments, 1); try { if (a && typeof a[name] === 'function') return a[name].apply(a, args); } catch (e) { console.warn('[Birthday Club] ' + name, e); } }
  function call(name, args) {
    var a = api();
    if (!a) return Promise.reject(new Error('The app is not ready.'));
    return new Promise(function (ok, no) { try { a.rpc(name, args).then(ok, no); } catch (e) { no(e); } });
  }
  function data(r) { if (r && r.error) throw r.error; return r && r.data; }
  function toast(msg, bad) { act('toast', msg, !!bad); }
  function done(p) { var o = p.last && p.last.outcome; return o === 'wished' || o === 'messaged' || o === 'not_interested'; }
  function toCall() { return H.d && H.d.due ? H.d.due.filter(function (p) { return !done(p); }) : []; }
  function validBirthday(day, month) { day = +day; month = +month; return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 ? 29 : [4, 6, 9, 11].indexOf(month) > -1 ? 30 : 31); }
  function focusSoon(id) { if (id) setTimeout(function () { focusIn(doc.getElementById(id)); }, 80); }
  function focusIn(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }

  // ---------- loading ----------
  function refresh() {
    var t = act('tab');
    if (t === 'today' || t === 'customers') act('render');
  }
  function load(force) {
    if (H.busy || !api()) return;
    if (!force && H.st !== 'idle' && Date.now() - H.at < 60000) return;
    H.busy = true;
    if (H.st === 'idle') H.st = 'loading';
    call('birthday_club_home', { p_days: 7 }).then(function (r) {
      var d = data(r); H.busy = false; H.at = Date.now();
      if (!d || !d.ok) { H.st = 'error'; H.err = (d && d.message) || 'The Birthday Club could not be loaded.'; if (!H.d || (d && d.error === 'forbidden')) H.d = null; }
      else { H.st = 'ready'; H.err = null; H.d = d; }
      refresh(); sheetSoon();
    }).catch(function (e) {
      H.busy = false; H.at = Date.now();
      if (H.st !== 'ready') { H.st = 'error'; H.err = 'No connection, so the Birthday Club could not be loaded.'; }
      console.warn('[Birthday Club] home', e); refresh();
    });
  }
  function allowed() { load(false); return !!(H.d && H.d.ok && H.d.enabled); }
  function badge() { var n = H.d && H.d.enabled ? toCall().length : 0; return n || null; }

  // ---------- the Birthday Club page ----------
  function whenText(p) {
    if (p.in_days === 0) return 'Birthday today, ' + longDay(p.birthday);
    if (p.in_days === 1) return 'Birthday tomorrow, ' + longDay(p.birthday);
    if (p.in_days > 1) return 'Birthday ' + longDay(p.birthday) + ', in ' + p.in_days + ' days';
    return 'Birthday was ' + longDay(p.birthday) + ', ' + (p.in_days === -1 ? 'yesterday' : -p.in_days + ' days ago');
  }
  function kind(p) { return p.in_days === 0 ? 'Birthday today' : p.in_days < 0 ? 'Late' : p.in_days === 1 ? 'Tomorrow' : 'In ' + p.in_days + ' days'; }
  function statusText(p) {
    var l = p.last, by = l && l.by ? ' by ' + esc(l.by) : '', s;
    if (l && l.outcome === 'wished') s = '<b class="is-good">Wished them</b> ' + esc(when(l.at)) + by + '.';
    else if (l && l.outcome === 'messaged') s = '<b class="is-good">WhatsApp sent</b> ' + esc(when(l.at)) + by + '.';
    else if (l && l.outcome === 'not_interested') s = '<b>Not interested</b>, ' + esc(when(l.at)) + by + '.';
    else if (l && l.outcome === 'no_answer') s = '<b class="is-warn">No answer</b> ' + esc(when(l.at)) + by + '. Try again.';
    else s = '<b>Not called yet</b>.';
    if (p.used) s += ' <b class="is-good">Free cupcake used</b> on ' + esc(p.used.ref || 'an order') + '.';
    return s;
  }
  function card(p) {
    var d = H.d, tel = telHref(p.phone), wa = waHref(p), busy = BUSY[p.id], meta = [p.no ? 'C-' + p.no : '', p.orders ? p.orders + pl(p.orders, ' cake order', ' cake orders') : 'No cake orders yet'];
    return '<article class="crm-card bc-card' + (p.in_days === 0 ? ' is-today' : p.in_days < 0 ? ' is-late' : '') + (done(p) ? ' is-done' : '') + '" data-bc-card="' + esc(p.id) + '">' +
      '<div class="crm-ctop"><div class="crm-who"><button type="button" class="crm-name" data-act="open-customer" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button>' +
      '<span class="crm-meta">' + esc(meta.filter(Boolean).join(' · ')) + '</span></div><span class="crm-kind bc-kind">' + esc(kind(p)) + '</span></div>' +
      '<p class="crm-reason">' + esc(whenText(p)) + '</p><p class="crm-pri bc-st">' + statusText(p) + '</p>' +
      (p.phone ? '' : '<p class="crm-last">No mobile number saved. Add it on their profile.</p>') +
      (d.can_call ? (tel || wa ? '<div class="crm-acts">' + (tel ? '<a class="ccs-btn ccs-ghost crm-btn" href="' + esc(tel) + '">Call</a>' : '') +
          (wa ? '<a class="ccs-btn ccs-ghost crm-btn" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div>' : '') +
        '<div class="bc-out"><span class="bc-q" id="bcq-' + esc(p.id) + '">What happened?</span><div class="ccs-chips" role="group" aria-labelledby="bcq-' + esc(p.id) + '">' + OUT.map(function (o) {
          return '<button type="button" class="ccs-chip" id="bc-o-' + esc(p.id) + '-' + o[0] + '" data-bc-out="' + o[0] + '" data-bc-id="' + esc(p.id) + '" aria-pressed="' + (!!p.last && p.last.outcome === o[0]) + '"' + (busy ? ' disabled' : '') + '>' + o[1] + '</button>';
        }).join('') + '</div></div>' : '') +
      '</article>';
  }
  function kpi(tone, label, value, hint) {
    return '<div class="bc-k is-' + tone + '"><span class="bc-kl">' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(hint) + '</small></div>';
  }
  function memberRows(d) {
    var ms = d.members || [];
    if (!ms.length) return '<p class="bc-none">No members yet.' + (d.can_join && d.joining ? ' Tap Add a member, or tap Join on New order.' : '') + '</p>';
    return '<ul class="bc-mlist">' + ms.map(function (m) {
      var next = m.in_days == null ? 'Birthday not saved' : m.in_days === 0 ? 'Birthday today' : m.in_days < 0 ? 'Birthday ' + (m.in_days === -1 ? 'yesterday' : -m.in_days + ' days ago')
        : m.in_days === 1 ? 'Birthday tomorrow' : 'Birthday in ' + m.in_days + ' days';
      var joined = m.joined_at ? 'Joined ' + shortDay(fijiDay(m.joined_at)) + (m.via === 'customer' ? ' on the website' : ' at the counter') : '';
      var rm = !d.can_join ? '' : CONF === m.id
        ? '<span class="bc-conf">Remove ' + esc(first(m.name)) + ' from the club? <button type="button" class="ccs-btn bc-danger" id="bc-rmy-' + esc(m.id) + '" data-bc-leave="' + esc(m.id) + '">Remove</button><button type="button" class="ccs-btn ccs-ghost" id="bc-rmn-' + esc(m.id) + '" data-bc-keep="bc-rm-' + esc(m.id) + '">Keep</button></span>'
        : '<button type="button" class="ccs-link bc-rm" id="bc-rm-' + esc(m.id) + '" data-bc-ask="' + esc(m.id) + '" data-bc-then="bc-rmn-' + esc(m.id) + '">Remove</button>';
      return '<li' + (m.stopped ? ' class="is-stopped"' : '') + '><div class="bc-mw"><button type="button" class="crm-name" data-act="open-customer" data-id="' + esc(m.id) + '">' + esc(m.name) + '</button>' +
        '<span>' + esc([dayMonth(m.day, m.month) || 'No birthday saved', next].join(' · ')) + '</span>' +
        (m.stopped ? '<em>Asked for no offers, so they are not on the call list</em>' : '<em>' + esc(joined) + '</em>') + '</div>' + rm + '</li>';
    }).join('') + '</ul>';
  }
  function recentList(list) {
    var label = function (r) {
      if (r.kind === 'joined') return 'Joined the club';
      if (r.kind === 'left') return 'Left the club';
      if (r.kind === 'offer_redeemed') return 'Free cupcake added to an order';
      return ({ wished: 'Wished them a happy birthday', messaged: 'Birthday WhatsApp sent', not_interested: 'Not interested in the offer', no_answer: 'Called, no answer' })[r.outcome] || 'Note';
    };
    return '<ul class="bc-recent">' + list.map(function (r) {
      return '<li><b>' + esc(r.name) + '</b><span>' + esc(label(r)) + '</span><em>' + esc(when(r.at) + (r.by ? ' · ' + r.by : '')) + '</em></li>';
    }).join('') + '</ul>';
  }
  function fold(key, title, count, body) {
    return '<details class="bc-fold" data-bc-sec="' + key + '"' + (OPEN[key] ? ' open' : '') + '><summary id="bc-f-' + key + '"><span>' + esc(title) + '</span>' + (count != null ? '<em>' + esc(count) + '</em>' : '') + '</summary><div class="bc-fold-b">' + body + '</div></details>';
  }
  function page() {
    load(false);
    var d = H.d;
    if (!d) return H.st === 'error' ? '<div class="ccs-empty bc-err"><b>' + esc(H.err) + '</b><button type="button" class="ccs-btn ccs-ghost" data-bc-retry>Try again</button></div>' : '<p class="ccs-loading">Loading the Birthday Club…</p>';
    if (!d.enabled) return '<div class="ccs-empty"><b>The Birthday Club is switched off.</b></div>';
    var due = d.due || [], todo = due.filter(function (p) { return !done(p); }), fin = due.filter(done), c = d.counts || {};
    var html = '<section class="bc-page" data-bc-page>';
    html += '<div class="bc-top"><div class="bc-offer"><span class="bc-ic">' + GIFT + '</span><p><b>' + esc(d.offer ? 'The club offer: ' + d.offer.title.charAt(0).toLowerCase() + d.offer.title.slice(1) : 'Birthday Club') + '</b><span>' +
      esc(d.offer ? 'For a cake ordered within 2 weeks of their birthday, before or after. Once a year.' : 'The offer is switched off for now, so only the calls are kept.') + '</span></p></div>' +
      (d.can_join && d.joining ? '<button type="button" class="ccs-btn bc-add" id="bc-add" data-bc-add>+ Add a member</button>' : '') + '</div>';
    html += '<div class="bc-kpis">' +
      kpi('rose', 'To call this week', todo.length, todo.length ? todo.filter(function (p) { return p.in_days === 0; }).length + ' with a birthday today' : 'Nobody this week') +
      kpi('green', 'Members', num(c.members), num(c.joined_month) + ' joined this month') +
      kpi('blue', 'Wished this month', num(c.wished_month), num(c.calls_month) + pl(num(c.calls_month), ' call or message', ' calls and messages')) +
      kpi('amber', 'Free cupcakes this year', num(c.offers_year), money(c.offer_value_year) + ' of cake orders came with them') + '</div>';
    html += '<div class="bc-sh"><h2 class="crm-big">' + (todo.length ? 'You have ' + todo.length + pl(todo.length, ' birthday', ' birthdays') + ' to call this week' : 'No birthdays to call this week') + '</h2>' +
      '<p class="ccs-hint">' + (todo.length ? 'Call and WhatsApp only open your phone; nothing is sent by the system. After each call, tap what happened so it is recorded.'
        : num(c.members) ? 'Members show here a week before their birthday, with birthdays today first.' : 'No members yet. Tap Join on New order, or Add a member.') + '</p></div>';
    if (todo.length) html += '<div class="crm-cards bc-cards">' + todo.map(card).join('') + '</div>';
    if (fin.length) html += fold('done', 'Done this week', fin.length, '<div class="crm-cards bc-cards">' + fin.map(card).join('') + '</div>');
    html += fold('members', 'Members', (d.members || []).length, memberRows(d));
    if ((d.recent || []).length) html += fold('recent', 'Recent', null, recentList(d.recent));
    return html + '</section>';
  }

  // ---------- Today: inside the This week box ----------
  function weekLine() {
    try {
      load(false);
      var d = H.d; if (!d || !d.enabled || !d.can_call) return '';
      var todo = toCall(); if (!todo.length) return '';
      var names = todo.slice(0, 3).map(function (p) { return first(p.name) + (p.in_days === 0 ? ' today' : p.in_days < 0 ? ' (late)' : ' ' + WD[d12(p.birthday).getUTCDay()]); }).join(', ');
      return '<button type="button" class="bc-week" data-bc-go><span class="bc-ic">' + GIFT + '</span><span class="bc-wt"><b>' + todo.length + pl(todo.length, ' birthday', ' birthdays') +
        ' to call</b><span>' + esc(names + (todo.length > 3 ? ' and ' + (todo.length - 3) + ' more' : '')) + '</span></span><span class="bc-wgo">Birthday Club →</span></button>';
    } catch (e) { console.warn('[Birthday Club] today', e); return ''; }
  }

  // ---------- calls ----------
  function record(id, outcome) {
    var p = (H.d && H.d.due || []).filter(function (x) { return x.id === id; })[0];
    if (!p || BUSY[id]) return;
    BUSY[id] = true; refresh();
    var channel = outcome === 'messaged' ? 'whatsapp' : 'phone';
    call('birthday_club_contact', { p_customer: id, p_outcome: outcome, p_channel: channel, p_note: null, p_idem: uuid() }).then(function (r) {
      var res = data(r); BUSY[id] = false;
      if (!res || !res.ok) { toast((res && res.message) || 'Not saved. Try again.', true); refresh(); return; }
      p.last = { outcome: outcome, channel: channel, at: new Date().toISOString(), by: null };
      toast(({ wished: 'Saved: you wished ' + first(p.name) + ' a happy birthday', messaged: 'Saved: birthday WhatsApp sent to ' + first(p.name),
        no_answer: 'Saved: no answer. ' + first(p.name) + ' stays on the list', not_interested: 'Saved: ' + first(p.name) + ' is not interested' })[outcome]);
      refresh(); load(true);
    }).catch(function (e) { BUSY[id] = false; console.warn('[Birthday Club] contact', e); toast('No connection, so it was not saved. Try again.', true); refresh(); });
  }
  function leave(id, name) {
    if (BUSY['leave' + id]) return;
    BUSY['leave' + id] = true;
    call('birthday_club_leave', { p_customer: id, p_reason: null }).then(function (r) {
      var res = data(r); BUSY['leave' + id] = false; CONF = null;
      if (!res || !res.ok) { toast((res && res.message) || 'Not removed. Try again.', true); refresh(); sheetSoon(); return; }
      if (H.d) {
        H.d.members = (H.d.members || []).filter(function (x) { return x.id !== id; }); H.d.due = (H.d.due || []).filter(function (x) { return x.id !== id; });
        if (H.d.counts) H.d.counts.members = Math.max(0, num(H.d.counts.members) - 1);
      }
      delete ST[id];
      toast((name || 'They') + ' left the Birthday Club'); refresh(); load(true); sheetSoon(); act('reloadCustomer', id); focusSoon(doc.getElementById('bc-f-members') ? 'bc-f-members' : null);
    }).catch(function (e) { BUSY['leave' + id] = false; console.warn('[Birthday Club] leave', e); toast('No connection, so nothing changed. Try again.', true); });
  }

  // ---------- the Add a member window ----------
  function layer() {
    var root = doc.getElementById('cc-staff'); if (!root) return null;
    var L = doc.getElementById('bcm-layer');
    if (L && L.parentNode !== root) { L.remove(); L = null; }
    if (!L) {
      L = doc.createElement('div'); L.id = 'bcm-layer'; L.className = 'bcm-layer'; L.hidden = true;
      L.innerHTML = '<div class="bcm-shade" data-bcm-shade></div><div class="bcm-dlg" id="bcm-dlg" role="dialog" aria-modal="true" aria-labelledby="bcm-h" tabindex="-1"></div>';
      root.appendChild(L);
      L.addEventListener('click', onWinClick);
      L.addEventListener('input', onWinInput);
      L.addEventListener('change', onWinChange);
      L.addEventListener('submit', function (e) { e.preventDefault(); if (D && D.step === 'bday') saveJoin(); });
    }
    return L;
  }
  function win() { var L = doc.getElementById('bcm-layer'); return L && L.isConnected && !L.hidden ? L.querySelector('#bcm-dlg') : null; }
  function appInert(on) { var app = doc.querySelector('#cc-staff > .ccs-app'); if (app) { if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert'); } }
  function showWin(html, keepFocus) {
    var L = layer(); if (!L) return;
    var d = L.querySelector('#bcm-dlg');
    if (L.hidden) {
      if (!opener) { var a = doc.activeElement; opener = a && a !== doc.body ? a : null; }
      L.hidden = false; appInert(true);
    }
    d.innerHTML = html;
    if (!keepFocus) { d.scrollTop = 0; focusIn(d.querySelector('[data-focus]') || d); }
  }
  function hideWin() {
    var L = doc.getElementById('bcm-layer'), was = !!(L && !L.hidden), back = opener;
    D = null; opener = null;
    if (L) { L.hidden = true; var d = L.querySelector('#bcm-dlg'); if (d) d.innerHTML = ''; }
    if (!doc.querySelector('#ccm-layer:not([hidden])')) appInert(false);
    if (was && back && back.isConnected) focusIn(back);
  }
  function head(title, sub) {
    return '<header class="bcm-head"><div><h2 id="bcm-h">' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div><button type="button" class="bcm-x" data-bcm="close" aria-label="Close">&times;</button></header>';
  }
  function pickers(day, month) {
    var days = '<option value="">Day</option>', months = '<option value="">Month</option>';
    for (var i = 1; i <= 31; i++) days += '<option value="' + i + '"' + (+day === i ? ' selected' : '') + '>' + i + '</option>';
    MONTHS.forEach(function (m, i) { months += '<option value="' + (i + 1) + '"' + (+month === i + 1 ? ' selected' : '') + '>' + m + '</option>'; });
    return { days: days, months: months };
  }
  function openAdd(cust) {
    if (!H.d || !H.d.enabled || !H.d.can_join || !H.d.joining) return;
    D = { step: cust ? 'bday' : 'find', q: '', res: [], cust: cust || null, day: cust && cust.day || '', month: cust && cust.month || '', busy: false, err: null, seq: 0 };
    paint();
  }
  function paint(keepFocus) {
    if (!D) return;
    if (D.step === 'find') {
      showWin('<div class="bcm-in">' + head('Add a member', 'Find the customer, then choose their birthday.') +
        '<div class="bcm-f"><label class="sl-k" for="bcm-q">Customer</label><input class="ccs-input" id="bcm-q" type="search" autocomplete="off" placeholder="Name, mobile or C-number" value="' + esc(D.q) + '" data-focus></div>' +
        '<div class="bcm-res" aria-live="polite">' + results() + '</div>' +
        '<p class="ccs-hint">Someone new? Tap Join when you take their order on New order, or use Add customer first.</p></div>', keepFocus);
      return;
    }
    var c = D.cust, pk = pickers(D.day, D.month);
    showWin('<form class="bcm-in" novalidate>' + head('Add ' + c.name + ' to the Birthday Club', c.phone || '') +
      '<p class="ccs-err" role="alert" data-bcm-err' + (D.err ? '' : ' hidden') + '>' + esc(D.err || '') + '</p>' +
      '<div class="bcm-f"><span class="sl-k" id="bcm-bl">Their birthday <em class="sl-req">Required</em></span><div class="bc-pick" role="group" aria-labelledby="bcm-bl">' +
      '<select class="ccs-input" id="bcm-day" aria-label="Day" data-focus>' + pk.days + '</select><select class="ccs-input" id="bcm-month" aria-label="Month">' + pk.months + '</select></div>' +
      '<span class="ccs-hint">Only the day and month. We never ask for the year.</span></div>' +
      '<div class="bcm-ask"><b>Check with them first</b><p>“Is it OK if we call or WhatsApp you in the week before your birthday, with a free cupcake offer?”</p></div>' +
      '<div class="bcm-acts"><button type="submit" class="ccs-btn" data-bcm="save"' + (D.busy ? ' disabled' : '') + '>' + (D.busy ? 'Adding…' : 'They said yes: add them') + '</button>' +
      (D.fromFind ? '<button type="button" class="ccs-btn ccs-ghost" data-bcm="back">Back</button>' : '<button type="button" class="ccs-btn ccs-ghost" data-bcm="close">Cancel</button>') + '</div></form>', keepFocus);
  }
  function results() {
    if (D.q.trim().length < 2) return '';
    if (D.loading) return '<p class="ccs-hint">Searching…</p>';
    if (D.searchErr) return '<p class="ccs-err">' + esc(D.searchErr) + '</p>';
    if (!D.res.length) return '<p class="ccs-hint">No customer found. Check the spelling or try their mobile number.</p>';
    var member = {}; (H.d && H.d.members || []).forEach(function (m) { member[m.id] = 1; });
    return D.res.map(function (r) {
      var isM = member[r.id];
      return '<button type="button" class="bcm-r" data-bcm-pick="' + esc(r.id) + '"' + (isM ? ' disabled' : '') + '><b>' + esc(r.full_name) + '</b><span>' +
        esc([r.phone, r.customer_no ? 'C-' + r.customer_no : '', isM ? 'Already a member' : ''].filter(Boolean).join(' · ')) + '</span></button>';
    }).join('');
  }
  var searchT = null;
  function onWinInput(e) {
    if (!D || e.target.id !== 'bcm-q') return;
    D.q = e.target.value;
    clearTimeout(searchT);
    var q = D.q.trim(), seq = ++D.seq;
    if (q.length < 2) { D.res = []; D.loading = false; paintResults(); return; }
    D.loading = true; paintResults();
    searchT = setTimeout(function () {
      call('staff_search_customers', { q: q }).then(function (r) {
        if (!D || seq !== D.seq) return;
        D.loading = false; D.searchErr = null;
        D.res = (data(r) || []).filter(function (x) { return !x.archived_at && !x.merged_into; }).slice(0, 8); paintResults();
      }).catch(function (err) { if (!D || seq !== D.seq) return; D.loading = false; D.searchErr = 'No connection, so the search did not work.'; console.warn('[Birthday Club] search', err); paintResults(); });
    }, 300);
  }
  function paintResults() { var w = win(), box = w && w.querySelector('.bcm-res'); if (box) box.innerHTML = results(); }
  function onWinChange(e) {
    if (!D) return;
    if (e.target.id === 'bcm-day') D.day = e.target.value;
    if (e.target.id === 'bcm-month') D.month = e.target.value;
  }
  function onWinClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('[data-bcm-shade]')) { hideWin(); return; }
    var p = t.closest('[data-bcm-pick]');
    if (p && D) {
      var r = D.res.filter(function (x) { return x.id === p.getAttribute('data-bcm-pick'); })[0]; if (!r) return;
      D.cust = { id: r.id, name: r.full_name, phone: r.phone }; D.day = r.birth_day || ''; D.month = r.birth_month || ''; D.step = 'bday'; D.fromFind = true; D.err = null; paint(); return;
    }
    var b = t.closest('[data-bcm]'); if (!b) return;
    var k = b.getAttribute('data-bcm');
    if (k === 'close') { e.preventDefault(); hideWin(); }
    else if (k === 'back') { e.preventDefault(); D.step = 'find'; D.err = null; paint(); }
  }
  function saveJoin() {
    if (!D || D.busy) return;
    var w = win(); if (!w) return;
    D.day = w.querySelector('#bcm-day').value; D.month = w.querySelector('#bcm-month').value;
    if (!validBirthday(D.day, D.month)) { D.err = 'Choose their birthday: the day and the month.'; paint(); focusIn(doc.getElementById(D.day ? 'bcm-month' : 'bcm-day')); return; }
    D.busy = true; D.err = null; paint(true);
    var c = D.cust;
    call('birthday_club_join', { p_customer: c.id, p_day: +D.day, p_month: +D.month }).then(function (r) {
      var res = data(r);
      if (!D) return;
      D.busy = false;
      if (!res || !res.ok) { D.err = (res && res.message) || 'Not added. Try again.'; paint(); return; }
      hideWin(); delete ST[c.id];
      toast(c.name + (res.already ? ' is in the Birthday Club. Birthday ' : ' joined the Birthday Club. Birthday ') + dayMonth(+res.day, +res.month) + '.');
      load(true); sheetSoon(); act('reloadCustomer', c.id);
    }).catch(function (err) { console.warn('[Birthday Club] join', err); if (!D) return; D.busy = false; D.err = 'No connection, so they were not added. Try again.'; paint(); });
  }

  // ---------- New order, Customer step ----------
  function fetchStatus(id) {
    if (!id || ST[id]) return;
    ST[id] = { loading: true };
    call('birthday_club_status', { p_customer: id }).then(function (r) {
      var d = data(r); ST[id] = d && d.ok ? d : { ok: false }; fillSlots(); sheetSoon();
    }).catch(function (e) { ST[id] = { ok: false }; console.warn('[Birthday Club] status', e); });
  }
  function inWindow(day, month, t, before, after) {
    if (!validBirthday(day, month)) return null;
    var y = +t.slice(0, 4), best = null;
    [y - 1, y, y + 1].forEach(function (yy) {
      var leap = (yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0, dd = +month === 2 && +day === 29 && !leap ? 28 : +day;
      var b = yy + '-' + String(month).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
      var diff = Math.round((Date.parse(t + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5);
      if (diff >= -before && diff <= after && (best === null || Math.abs(diff) < Math.abs(best.diff))) best = { b: b, diff: diff };
    });
    return best && best.b;
  }
  function offerChips(V, b, why) {
    if (V.bcOffer === undefined) V.bcOffer = true;
    V.bcOfferAvail = true;
    return '<div class="bcn-offer"><p><span class="bc-ic">' + GIFT + '</span><span><b>Free cupcake with this cake</b> ' + esc(why) + '</span></p>' +
      '<div class="ccs-chips" role="group" aria-label="Free birthday cupcake"><button type="button" class="ccs-chip" data-bcn-offer="yes" aria-pressed="' + (V.bcOffer === true) + '">Add the free cupcake</button>' +
      '<button type="button" class="ccs-chip" data-bcn-offer="no" aria-pressed="' + (V.bcOffer === false) + '">Not this time</button></div>' +
      (V.bcOffer === true ? '<span class="ccs-hint">The kitchen slip will say “Birthday Club: add 1 free cupcake”.</span>' : '') + '</div>';
  }
  function slotInner(V) {
    var d = H.d; if (V) V.bcOfferAvail = false;
    if (!V || !d || !d.enabled) return '';
    var cid = V.customer && V.customer.id || null, s = cid ? ST[cid] : null, t = today();
    if (V.bcFor !== (cid || 'new')) { V.bcFor = cid || 'new'; V.bcJoin = undefined; V.bcDay = ''; V.bcMonth = ''; V.bcOffer = undefined; }
    if (cid && !s) { fetchStatus(cid); return ''; }
    if (s && (s.loading || s.ok === false || s.enabled === false)) return '';
    var o = d.offer, html = '<div class="sl-sub bcn"><span class="sl-k">Birthday Club' + (s && s.member ? '' : ' <em class="sl-opt">Optional</em>') + '</span>';
    if (s && s.member) {
      html += '<p class="bcn-m"><span class="bc-ic">' + GIFT + '</span><span><b>Member</b> · birthday ' + esc(dayMonth(s.day, s.month) || 'not saved') + '</span></p>';
      if (s.offer && s.offer.eligible && d.offer_on) html += offerChips(V, s.offer.birthday, 'Their birthday is ' + longDay(s.offer.birthday) + '.');
      else if (s.offer && s.offer.used) html += '<p class="ccs-hint">They already had the free cupcake for this birthday, on ' + esc(s.offer.used) + '.</p>';
      return html + '</div>';
    }
    if (!d.joining) return '';
    if (V.bcJoin === true && !V.bcDay && !V.bcMonth && s && s.day) { V.bcDay = s.day; V.bcMonth = s.month; }
    html += '<span class="ccs-hint">Members get a free cupcake with a cake ordered within 2 weeks of their birthday. We call or WhatsApp them the week before.</span>' +
      '<div class="ccs-chips" role="group" aria-label="Join the Birthday Club"><button type="button" class="ccs-chip" data-bcn-join="yes" aria-pressed="' + (V.bcJoin === true) + '">Join</button>' +
      '<button type="button" class="ccs-chip" data-bcn-join="no" aria-pressed="' + (V.bcJoin === false) + '">Not now</button></div>';
    if (V.bcJoin === true) {
      var pk = pickers(V.bcDay, V.bcMonth);
      html += '<div class="bcn-b"><span class="sl-k" id="bcn-bl">Their birthday <em class="sl-req">Required</em></span><div class="bc-pick" role="group" aria-labelledby="bcn-bl">' +
        '<select class="ccs-input" id="bcn-day" aria-label="Birthday day" data-bcn="day">' + pk.days + '</select><select class="ccs-input" id="bcn-month" aria-label="Birthday month" data-bcn="month">' + pk.months + '</select></div>' +
        '<p class="ccs-err" role="alert" data-bcn-err hidden></p><span class="ccs-hint">Ask first: “Is it OK if we call or WhatsApp you in the week before your birthday?”</span></div>';
      var b = o && d.offer_on && V.bcDay && V.bcMonth ? inWindow(V.bcDay, V.bcMonth, t, o.before, o.after) : null;
      if (b) html += offerChips(V, b, 'Their birthday is ' + longDay(b) + ', so this cake can have it.');
    }
    return html + '</div>';
  }
  function joinBlock(V) {
    try {
      lastV = V || null;
      load(false);
      return '<div class="bcn-slot" data-bcn-slot>' + (V ? slotInner(V) : '') + '</div>';
    } catch (e) { console.warn('[Birthday Club] New order', e); return ''; }
  }
  function fillSlots() {
    doc.querySelectorAll('#cc-staff [data-bcn-slot]').forEach(function (s) {
      var f = doc.activeElement && doc.activeElement.id;
      try { s.innerHTML = lastV ? slotInner(lastV) : ''; } catch (e) { console.warn('[Birthday Club] New order', e); s.innerHTML = ''; }
      if (f === 'bcn-day' || f === 'bcn-month') focusIn(doc.getElementById(f));
    });
  }
  // After New order saves: join, then the free cupcake. The order is already safe, so problems only show a message.
  function afterOrder(V, res) {
    try {
      if (!V || !res || !res.order_id || !H.d || !H.d.enabled) return;
      var cid = V.customer && V.customer.id, s = cid ? ST[cid] : null, member = !!(s && s.member);
      var wantJoin = !member && V.bcJoin === true, join = wantJoin && validBirthday(V.bcDay, V.bcMonth) ? { d: +V.bcDay, m: +V.bcMonth } : null;
      var offer = !!V.bcOfferAvail && V.bcOffer !== false && (member || !!join), order = res.order_id;
      if (wantJoin && !join) toast('Order saved. They were not added to the Birthday Club: their birthday was not chosen.', true);
      if (!join && !offer) return;
      var chain = Promise.resolve(true);
      if (join) chain = chain.then(function () {
        return call('birthday_club_join_order', { p_order: order, p_day: join.d, p_month: join.m }).then(function (r) {
          var d = data(r); if (!d || !d.ok) { toast('Order saved, but they were not added to the Birthday Club' + (d && d.message ? ': ' + d.message : '.'), true); return false; }
          return true;
        });
      });
      if (offer) chain = chain.then(function (ok) {
        if (!ok) return false;
        return call('birthday_club_redeem', { p_order: order }).then(function (r) {
          var d = data(r); if (!d || !d.ok) { toast('Order saved, but the free cupcake was not added' + (d && d.message ? ': ' + d.message : '.'), true); return false; }
          act('reloadOrder', order); return true;
        });
      });
      chain.then(function () { if (cid) delete ST[cid]; load(true); }, function (e) {
        console.warn('[Birthday Club] after order', e);
        toast('Order saved, but the Birthday Club part was not. Check the connection, then open the order or the customer’s profile.', true);
      });
    } catch (e) { console.warn('[Birthday Club] after order', e); }
  }

  // ---------- open orders and customer profiles: a small box at the top ----------
  var sheetT = null;
  function sheetSoon() { clearTimeout(sheetT); sheetT = setTimeout(sheetTick, 30); }
  function sheetTick() {
    var sh = act('sheet'), el = doc.getElementById('ccs-sheet');
    if (!sh || !sh.id || !el || !el.classList.contains('ccs-open')) { sheetKey = null; return; }
    var key = sh.type + ':' + sh.id;
    if (key !== sheetKey) { sheetKey = key; if (sh.type === 'customer') delete ST[sh.id]; else delete OO[sh.id]; }
    if (!sh.ready || !H.d || !H.d.enabled) return;
    var body = el.querySelector('.ccs-sheet-body'); if (!body) return;
    if (sh.type === 'order') orderBox(body, sh.id);
    else if (sh.type === 'customer') profileBox(body, sh);
  }
  function place(body, key, html) {
    var old = body.querySelector(':scope > [data-bc-box]');
    if (old && old.getAttribute('data-bc-box') === key && old.getAttribute('data-bc-len') === String(html.length)) return;
    if (old) old.remove();
    if (!html) return;
    var w = doc.createElement('div'), flush = false;
    try { flush = parseFloat(global.getComputedStyle(body).paddingLeft) < 4; } catch (e) {}
    w.className = 'bc-box' + (flush ? ' is-flush' : ''); w.setAttribute('data-bc-box', key); w.setAttribute('data-bc-len', String(html.length)); w.innerHTML = html;
    body.insertBefore(w, body.firstChild);
  }
  function orderBox(body, id) {
    var o = OO[id];
    if (!o) {
      OO[id] = { loading: true };
      call('birthday_club_order_offer', { p_order: id }).then(function (r) { var d = data(r); OO[id] = d && d.ok ? d : { ok: false }; sheetSoon(); })
        .catch(function (e) { OO[id] = { ok: false }; console.warn('[Birthday Club] order offer', e); });
      return;
    }
    if (o.loading || o.ok === false) return;
    var html = '';
    if (o.added) html = '<div class="bc-ob is-added"><span class="bc-ic">' + GIFT + '</span><p><b>Birthday Club: free cupcake added</b><span>The kitchen slip says “Birthday Club: add 1 free cupcake”.</span></p></div>';
    else if (o.eligible) html = '<div class="bc-ob"><span class="bc-ic">' + GIFT + '</span><p><b>Birthday Club member</b><span>Birthday ' + esc(longDay(o.birthday)) + ', so this order can have a free cupcake.</span></p>' +
      (o.can_add ? '<button type="button" class="ccs-btn" data-bc-redeem="' + esc(id) + '"' + (BUSY['r' + id] ? ' disabled' : '') + '>' + (BUSY['r' + id] ? 'Adding…' : 'Add the free cupcake') + '</button>' : '') + '</div>';
    place(body, 'o:' + id + (BUSY['r' + id] ? ':busy' : ''), html);
  }
  function redeem(id) {
    if (BUSY['r' + id]) return;
    BUSY['r' + id] = true; sheetSoon();
    call('birthday_club_redeem', { p_order: id }).then(function (r) {
      var d = data(r); BUSY['r' + id] = false;
      if (!d || !d.ok) { toast((d && d.message) || 'The free cupcake was not added. Try again.', true); delete OO[id]; sheetSoon(); return; }
      OO[id] = { ok: true, added: true }; toast('Free cupcake added. The kitchen slip says so.');
      act('reloadOrder', id); load(true); sheetSoon();
    }).catch(function (e) { BUSY['r' + id] = false; console.warn('[Birthday Club] redeem', e); toast('No connection, so the free cupcake was not added.', true); sheetSoon(); });
  }
  function profileBox(body, sh) {
    var id = sh.id, s = ST[id], d = H.d, html = '';
    if (!s) { fetchStatus(id); return; }
    if (s.loading || s.ok === false || s.enabled === false) return;
    if (s.member) html = '<div class="bc-pb"><span class="bc-ic">' + GIFT + '</span><p><b>Birthday Club member</b><span>Birthday ' + esc(dayMonth(s.day, s.month) || 'not saved') +
      (s.offer && s.offer.used ? ' · free cupcake used for this birthday (' + esc(s.offer.used) + ')' : s.offer && s.offer.eligible ? ' · can have the free cupcake now' : '') + '</span></p>' +
      (d.can_join ? (CONF === 'p' + id ? '<span class="bc-conf">Remove from the club? <button type="button" class="ccs-btn bc-danger" data-bc-leave="' + esc(id) + '" data-bc-name="' + esc(sh.name || '') + '">Remove</button><button type="button" class="ccs-btn ccs-ghost" id="bc-prmn-' + esc(id) + '" data-bc-keep="bc-prm-' + esc(id) + '">Keep</button></span>'
        : '<button type="button" class="ccs-link bc-rm" id="bc-prm-' + esc(id) + '" data-bc-ask="p' + esc(id) + '" data-bc-then="bc-prmn-' + esc(id) + '">Remove</button>') : '') + '</div>';
    else if (d.joining && d.can_join) html = '<div class="bc-pb is-not"><span class="bc-ic">' + GIFT + '</span><p><b>Not in the Birthday Club</b><span>Members get a free cupcake with a cake in their birthday weeks.</span></p>' +
      '<button type="button" class="ccs-btn ccs-ghost" data-bc-addc="' + esc(id) + '">Add to the club</button></div>';
    place(body, 'c:' + id + ':' + (s.member ? 1 : 0) + (CONF === 'p' + id ? ':x' : ''), html);
  }

  // ---------- taps ----------
  if (doc && !global.__ccBirthdayClubClicks) {
    global.__ccBirthdayClubClicks = true;
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t || t.closest('#bcm-layer')) return;
      var b;
      if ((b = t.closest('#cc-staff [data-bcn-join]'))) { e.preventDefault(); if (!lastV) return; lastV.bcJoin = b.getAttribute('data-bcn-join') === 'yes'; if (!lastV.bcJoin) lastV.bcOffer = undefined; lastV.restored = false; fillSlots(); return; }
      if ((b = t.closest('#cc-staff [data-bcn-offer]'))) { e.preventDefault(); if (!lastV) return; lastV.bcOffer = b.getAttribute('data-bcn-offer') === 'yes'; fillSlots(); return; }
      if ((b = t.closest('#cc-staff [data-bc-go]'))) {
        e.preventDefault(); act('go', 'customers', 'crm', 'bc');
        // The Customers header looks as it does once the customer list has been shown (staff.customer-directory-v3.js)
        var main = doc.getElementById('ccs-main'); if (main && !main.classList.contains('cdir-v3-ready')) main.classList.add('cdir-v3-ready');
        return;
      }
      if ((b = t.closest('#cc-staff [data-bc-out]'))) { e.preventDefault(); record(b.getAttribute('data-bc-id'), b.getAttribute('data-bc-out')); return; }
      if ((b = t.closest('#cc-staff [data-bc-add]'))) { e.preventDefault(); opener = b; openAdd(null); return; }
      if ((b = t.closest('#cc-staff [data-bc-addc]'))) {
        e.preventDefault();
        var sh = act('sheet') || {};
        opener = b; openAdd({ id: b.getAttribute('data-bc-addc'), name: sh.name || 'this customer', phone: sh.phone || '', day: sh.day || '', month: sh.month || '' });
        return;
      }
      if ((b = t.closest('#cc-staff [data-bc-ask]'))) { e.preventDefault(); CONF = b.getAttribute('data-bc-ask'); refresh(); sheetSoon(); focusSoon(b.getAttribute('data-bc-then')); return; }
      if ((b = t.closest('#cc-staff [data-bc-keep]'))) { e.preventDefault(); CONF = null; refresh(); sheetSoon(); focusSoon(b.getAttribute('data-bc-keep')); return; }
      if ((b = t.closest('#cc-staff [data-bc-leave]'))) {
        e.preventDefault();
        var id = b.getAttribute('data-bc-leave'), m = (H.d && H.d.members || []).filter(function (x) { return x.id === id; })[0];
        leave(id, m ? m.name : b.getAttribute('data-bc-name')); return;
      }
      if ((b = t.closest('#cc-staff [data-bc-redeem]'))) { e.preventDefault(); redeem(b.getAttribute('data-bc-redeem')); return; }
      if ((b = t.closest('#cc-staff [data-bc-retry]'))) { e.preventDefault(); H.st = 'idle'; H.at = 0; load(true); refresh(); }
    });
    // New order: once Join is chosen, the birthday is required, so Next waits for it
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('#cc-staff [data-act="sl-next"]') : null;
      if (!t || !lastV || lastV.bcJoin !== true || validBirthday(lastV.bcDay, lastV.bcMonth)) return;
      var box = doc.querySelector('#cc-staff [data-bcn-slot] .bcn-b'); if (!box) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var err = box.querySelector('[data-bcn-err]'); if (err) { err.textContent = 'Choose their birthday, or tap Not now.'; err.hidden = false; }
      var el = doc.getElementById(lastV.bcDay ? 'bcn-month' : 'bcn-day'); if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (x) {} focusIn(el); }
    }, true);
    doc.addEventListener('change', function (e) {
      var t = e.target; if (!t || !t.getAttribute || !lastV) return;
      var k = t.getAttribute('data-bcn'); if (!k) return;
      if (k === 'day') lastV.bcDay = t.value ? +t.value : '';
      if (k === 'month') lastV.bcMonth = t.value ? +t.value : '';
      fillSlots();
    });
    doc.addEventListener('toggle', function (e) {
      var t = e.target; if (!t || !t.getAttribute) return;
      var k = t.getAttribute('data-bc-sec'); if (k) OPEN[k] = t.open;
    }, true);
    doc.addEventListener('keydown', function (e) {
      var w = win(); if (!w) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideWin(); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(w.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (x) { return x.getClientRects().length > 0; });
      if (!f.length) return;
      var i = f.indexOf(doc.activeElement);
      if (i < 0) { e.preventDefault(); focusIn(f[0]); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); focusIn(f[0]); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); focusIn(f[f.length - 1]); }
    }, true);
    global.addEventListener('popstate', function () { if (win()) hideWin(); });
    // the order or profile sheet changes: check the box at its top
    var obs = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var n = records[i].target;
        if (n && n.nodeType === 1 && (n.id === 'ccs-sheet' || (n.closest && n.closest('#ccs-sheet') && !n.closest('[data-bc-box]')))) { sheetSoon(); return; }
      }
    });
    var watch = function () { var el = doc.getElementById('ccs-sheet'); if (el && !el.__bcWatched) { el.__bcWatched = true; obs.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); } };
    var root = doc.getElementById('cc-staff');                 // the sheet is made again when the app is (after signing in)
    if (root) new MutationObserver(watch).observe(root, { childList: true });
    watch();
  }

  global.CCBirthdayClub = { version: VERSION, allowed: allowed, badge: badge, page: page, weekLine: weekLine, join: joinBlock, afterOrder: afterOrder,
    _state: function () { return { H: H, ST: ST, OO: OO }; } };
})(typeof window !== 'undefined' ? window : globalThis);
