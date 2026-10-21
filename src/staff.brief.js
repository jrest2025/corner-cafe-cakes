/* Corner Café Service Hub: a personal greeting and a short daily briefing on Today (21 October 2026).
   Roneel, 6:44 PM (his brief "Personalised conversational UX and context-aware dashboard intelligence"); he chose
   "No name on the counter login": the shared counter (and kitchen) logins are greeted without a name, personal logins
   (managers, admin) by first name.
   Additive and read-only: it only reads what the Today screen has just worked out (window.__ccsOf.brief(), the same
   lists the screen shows: Needs attention, Due today, Waiting on you, the next 7 days) and the signed-in person. It never
   invents numbers, never saves anything, and its buttons use the app's own actions (open an order, go to a list).
   - Greeting by Fiji time: Good morning (before 12 PM), Good afternoon (before 5 PM), Good evening.
   - One sentence under it, from the real orders: what needs doing first, or "You're all caught up", or "We couldn't
     load your latest information".
   - Up to 3 briefing lines, most important first: an urgent order, the next handover, new website orders to check, the
     busiest day ahead (managers and kitchen). Each opens the right place.
   - While the app is open, a website order that arrives (the app checks every 30 seconds) shows as "A new website
     order has come in".
   The Cake Heartbeat, the Daily Cake Demand and everything else on the screen stay as they are. */
(function (global) {
  'use strict';
  if (global.CCBrief) return;
  var doc = document, TZ = 'Pacific/Fiji';
  var ICON = {
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9M12 3C9.4 5.8 8.1 8.8 8.1 12s1.3 6.2 3.9 9"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    cake: '<path d="M4 20h16M5 20v-7h14v7M5 16c2 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 4 0M12 13V9M12 6.5v-.5"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    go: '<path d="M9 6l6 6-6 6"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function api() { return global.__ccsOf || null; }
  function fiji() {
    var h = 0, m = 0;
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (x) {
        if (x.type === 'hour') h = Number(x.value) % 24; if (x.type === 'minute') m = Number(x.value);
      });
    } catch (e) {}
    return { h: h, hm: (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m };
  }
  function custName(o) { return (o.customers && o.customers.full_name) || o.contact_name || 'Customer'; }
  function sharedLogin(me) {
    var r = String(me.role || ''), l = String(me.level_name || '').toLowerCase();
    return r === 'front_of_house' || r === 'kitchen' || /^(counter|kitchen)\b/.test(l);
  }
  function hello(me) {
    var h = fiji().h, part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var first = sharedLogin(me) ? '' : String(me.full_name || '').trim().split(/\s+/)[0];
    return part + (first ? ', ' + first : '') + '!';
  }

  // New website orders while the app is open: the first loaded list is the starting point
  var seen = null, fresh = {};
  function track(st) {
    if (!st || !st.loaded || !Array.isArray(st.orders)) return;
    if (!seen) { seen = {}; st.orders.forEach(function (o) { seen[o.id] = 1; }); return; }
    st.orders.forEach(function (o) { if (!seen[o.id]) { seen[o.id] = 1; if (o.source === 'online') fresh[o.id] = Date.now(); } });
  }

  // What the day looks like, from the lists the Today screen has just worked out
  function read(a) {
    var st = a.state(), b = a.brief && a.brief(), me = (a.me && a.me()) || {};
    var can = function (p) { try { return !!a.can(p); } catch (e) { return false; } };
    var out = { st: st, me: me, ok: !!(st && st.loaded && b), err: !!(st && st.ordErr) };
    if (!out.ok) return out;
    var now = fiji().hm, day = b.day;
    var due = b.due || [], left = due.filter(function (o) { return o.order_status !== 'completed'; });
    out.urgent = (b.att || []).filter(function (x) { return x.tone === 'red' && x.o; });
    out.todo = b.todo || 0;
    out.due = due.length; out.left = left;
    out.next = left.filter(function (o) { return String(o.required_time || '').slice(0, 5) >= now; })[0] || left[0] || null;
    out.owing = b.pay ? left.filter(function (o) { return o.order_status === 'confirmed' && o.payment_status !== 'paid'; }) : null;
    out.web = (b.wait || []).filter(function (o) { return o.source === 'online' && o.order_status === 'awaiting_review'; });
    out.arrived = (st.orders || []).filter(function (o) { return fresh[o.id] && Date.now() - fresh[o.id] < 15 * 60000 && o.order_status === 'awaiting_review'; });
    out.kitchen = can('kit.view') && !can('ord.view');
    out.manager = can('ord.override') || can('staff.users');
    out.hands = can('ord.status');
    // the busiest day ahead in the next 7 days (not today), when it has 2 or more cakes
    var count = {};
    (b.week || []).forEach(function (o) { if (o.required_date > day && o.order_status !== 'completed') count[o.required_date] = (count[o.required_date] || 0) + 1; });
    var best = null;
    Object.keys(count).sort().forEach(function (d) { if (count[d] >= 2 && (!best || count[d] > count[best])) best = d; });
    out.busy = best ? { day: best, n: count[best] } : null;
    // kitchen: cakes still to finish for today, and to start for tomorrow
    var tmr = a.addDays ? a.addDays(day, 1) : null;
    out.finishToday = due.filter(function (o) { return o.order_status === 'confirmed' && o.production_status !== 'ready'; }).length;
    out.startTomorrow = (b.week || []).filter(function (o) { return o.required_date === tmr && o.order_status === 'confirmed' && (!o.production_status || o.production_status === 'not_started'); }).length;
    return out;
  }

  function sentence(d) {
    if (!d.ok) return d.err ? 'We couldn’t load your latest information.' : 'Getting today’s orders…';
    if (d.kitchen) {
      if (!d.finishToday && !d.startTomorrow) return 'Nothing left to finish for today.';
      var k = [];
      if (d.finishToday) k.push(plural(d.finishToday, 'cake', 'cakes') + ' to finish for today');
      if (d.startTomorrow) k.push(plural(d.startTomorrow, 'cake', 'cakes') + ' to start for tomorrow');
      return cap(k.join(', and ')) + '.';
    }
    var p = [];
    if (d.urgent.length) p.push(plural(d.urgent.length, 'order needs', 'orders need') + ' you urgently');
    if (d.left.length) p.push(d.left.length === 1 ? '1 cake is due to be handed over today' : d.left.length + ' cakes are due to be handed over today');
    else if (d.due) p.push(d.due === 1 ? 'today\u2019s cake has been handed over' : 'all ' + d.due + ' of today\u2019s cakes have been handed over');
    if (d.web.length && p.length < 2) p.push(d.web.length === 1 ? '1 new website order is waiting to be checked' : d.web.length + ' new website orders are waiting to be checked');
    if (!d.urgent.length && !d.left.length && !d.web.length && !d.todo) return 'You’re all caught up. Nothing needs your attention right now.';
    if (!p.length) return 'There are a few things to look at below.';
    return cap(p.slice(0, 2).join(', and ')) + '.';
  }

  function item(icon, html, attrs, cls) {
    var plain = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return '<li><button type="button" class="ccb-item' + (cls ? ' ' + cls : '') + '" title="' + esc(plain) + '" ' + attrs + '>' + svg(icon) + '<span>' + html + '</span>' + svg('go') + '</button></li>';
  }
  function lines(a, d) {
    if (!d.ok) return [];
    var t12 = function (x) { return a.t12 ? a.t12(x) : String(x || '').slice(0, 5); };
    var nice = function (x) { return a.nice ? a.nice(x) : x; };
    var L = [];
    d.arrived.forEach(function (o) {
      L.push(item('web', '<b>A new website order has come in.</b> ' + esc(o.reference) + ' · ' + esc(custName(o)) + ' · ' + esc(nice(o.required_date)),
        'data-act="open-order" data-id="' + esc(o.id) + '"', 'is-new'));
    });
    if (d.kitchen) {
      L.push(item('cake', d.finishToday ? '<b>To finish today:</b> ' + plural(d.finishToday, 'cake', 'cakes') : '<b>Today:</b> everything is finished', 'data-tab="kitchen"'));
    } else {
      if (d.urgent.length) {
        var u = d.urgent[0];
        var why = String(u.txt || '').split(/(?<=\.)\s/)[0];
        L.push(item('alert', '<b>Urgent:</b> ' + esc(u.o.reference) + ' \u00b7 ' + esc(custName(u.o)) + (why ? ' \u00b7 ' + esc(why) : ''),
          'data-act="open-order" data-id="' + esc(u.o.id) + '"', 'is-urgent'));
      }
      if (d.next && d.hands) {
        var late = String(d.next.required_time || '').slice(0, 5) < fiji().hm;
        var owe = d.owing && d.owing.indexOf(d.next) > -1 ? ' · money still to collect' : '';
        L.push(item('clock', '<b>' + (late ? 'Still to hand over:' : 'Next handover:') + '</b> ' + esc(t12(d.next.required_time)) + ' · ' + esc(custName(d.next)) + ' · ' + esc(d.next.reference) + owe,
          'data-act="open-order" data-id="' + esc(d.next.id) + '"'));
      }
      var newIds = {}; d.arrived.forEach(function (o) { newIds[o.id] = 1; });
      var web = d.web.filter(function (o) { return !newIds[o.id]; });
      if (web.length === 1) L.push(item('web', '<b>Website order to check:</b> ' + esc(web[0].reference) + ' · ' + esc(custName(web[0])) + ' · ' + esc(nice(web[0].required_date)),
        'data-act="open-order" data-id="' + esc(web[0].id) + '"'));
      else if (web.length > 1) L.push(item('web', '<b>' + web.length + ' website orders to check</b>', 'data-act="goto" data-v="action"'));
    }
    if (d.busy && (d.manager || d.kitchen)) {
      L.push(item('cal', '<b>Busiest day ahead:</b> ' + esc(a.nice ? a.nice(d.busy.day, true) : d.busy.day) + ' · ' + plural(d.busy.n, 'cake', 'cakes'), 'data-tab="calendar"'));
    }
    return L.slice(0, 3);
  }

  function paint() {
    var a = api(); if (!a || !a.state) return;
    var st = a.state(); track(st);
    var main = doc.getElementById('ccs-main');
    if (!main || main.getAttribute('data-screen') !== 'today') return;
    var head = main.querySelector('.tq-head');
    if (!head || head.hasAttribute('data-ccb')) return;
    head.setAttribute('data-ccb', '1');
    var d = read(a), me = (a.me && a.me()) || {};
    var h1 = head.querySelector('h1.ccs-title'); if (!h1) return;
    var date = h1.textContent;
    h1.textContent = hello(me);
    h1.classList.add('ccb-hello');
    var sum = doc.createElement('p'); sum.className = 'ccb-sum'; sum.setAttribute('role', 'status'); sum.textContent = sentence(d);
    h1.insertAdjacentElement('afterend', sum);
    // the date moves into the "Updated" line: "Wednesday 21 October · Updated 7:20 PM"
    // phones: the short date, so the line fits ("Wed 21 Oct · Updated 7:20 PM")
    try { if (global.matchMedia && global.matchMedia('(max-width: 700px)').matches && d.ok && a.nice) date = a.nice(a.brief().day) || date; } catch (e) {}
    var fr = head.querySelector('.ccs-fresh');
    if (fr) { var sp = doc.createElement('span'); sp.className = 'ccb-date'; sp.textContent = date + ' \u00b7 '; fr.insertBefore(sp, fr.firstChild); }
    else { var dp = doc.createElement('p'); dp.className = 'ccb-date'; dp.textContent = date; sum.insertAdjacentElement('afterend', dp); }
    var L = lines(a, d);
    if (L.length) {
      // inside the head, as its last, full-width row (on wide screens Today is a grid with named areas)
      var ul = doc.createElement('ul'); ul.className = 'ccb-list'; ul.setAttribute('aria-label', 'Your briefing');
      ul.innerHTML = L.join('');
      head.appendChild(ul);
    }
  }

  var root = doc.getElementById('cc-staff');
  function start() {
    root = doc.getElementById('cc-staff');
    if (!root || !global.MutationObserver) return;
    new MutationObserver(paint).observe(root, { childList: true, subtree: true });
    paint();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  global.CCBrief = { version: '2026-10-21-brief-v1', paint: paint, hello: hello };
})(window);
