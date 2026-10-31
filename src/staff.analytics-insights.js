/* Corner Cafe Analytics: insight engine and Cake Heartbeat layout (20 October 2026).
   Reads the same staff-authorised dashboard_register payload the Heartbeat already loaded; no extra order queries,
   no database writes. Every finding is worked out from recorded orders with fixed, visible rules: no guessing,
   small samples are left out. The protected Daily cake demand module is never edited; it is only placed first. */
(function (global) {
  'use strict';
  var VERSION = '2026-10-20-insights-v1';
  if (global.CCCakeInsights && global.CCCakeInsights.version === VERSION) return;
  var DAY = 864e5, SHOW = 4;
  var SB_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', SB_KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var SEASONAL = ['christmas', 'valentines_day', 'mothers_day', 'fathers_day'];
  var LABEL = { christmas: 'Christmas', valentines_day: "Valentine's Day", mothers_day: "Mother's Day", fathers_day: "Father's Day" };
  var state = { expanded: false, dates: null, datesAt: 0, loading: false, last: null };

  // ---------- dates and numbers ----------
  function iso(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T12:00:00Z')) ? d : ''; }
  function add(d, n) { return new Date(Date.parse(d + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10); }
  function diff(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY); }
  function weekday(d) { return (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7; }
  var WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortDay(d) { return WD[weekday(d)].slice(0, 3) + ' ' + (+d.slice(8)) + ' ' + MON[+d.slice(5, 7) - 1]; }
  function dayWord(d, today) { return d === today ? 'today' : d === add(today, 1) ? 'tomorrow' : shortDay(d); }
  function sum(a) { return a.reduce(function (t, n) { return t + n; }, 0); }
  function pl(n, word) { return n === 1 ? word : word + 's'; }
  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function time12(hhmm) {
    var m = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(hhmm || ''));
    if (!m) return '';
    var h = +m[1];
    return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function stamp12(when) {
    var d = new Date(when || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Fiji', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
    } catch (e) { return ''; }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- order rules (the same rules as the Heartbeat and management cards) ----------
  function alive(o) { return !!(o && !o.off && iso(o.pd) && ['cancelled', 'declined', 'not_confirmed'].indexOf(o.st) < 0); }
  function booked(o, today) { return o.odok === true && iso(o.od) && o.od <= today && o.od <= o.pd ? o.od : ''; }
  function cakes(o) {
    var it = Array.isArray(o.it) ? o.it : [];
    if (!it.length) return 1;
    return it.reduce(function (n, i) { var q = Number(i && i[3]); return n + (isFinite(q) && q > 0 ? q : 1); }, 0);
  }
  function value(o) {
    var v = o.cv != null ? Number(o.cv) : o.lv != null ? Number(o.lv) : null;
    return v != null && isFinite(v) && v >= 0 ? v : null;
  }
  function identity(o) { var k = o && o.c; return typeof k === 'string' && k.trim().length >= 4 ? k.trim() : ''; }
  function byPickup(a, b) { return a.pd < b.pd ? -1 : a.pd > b.pd ? 1 : String(a.pt || '') < String(b.pt || '') ? -1 : 1; }
  function refs(list, today) {
    var shown = list.slice(0, 3).map(function (o) { return (o.r || 'Order') + ' ' + dayWord(o.pd, today) + (o.pt ? ' ' + time12(o.pt) : ''); });
    return shown.join(' · ') + (list.length > 3 ? ' · and ' + (list.length - 3) + ' more' : '');
  }

  // ---------- small visuals ----------
  function bars(values, labels, mark, tone) {
    var max = Math.max.apply(null, values.concat([1]));
    return '<div class="cci-bars" role="img" aria-label="' + esc(labels.map(function (l, i) { return l + ' ' + values[i]; }).join(', ')) + '">' +
      values.map(function (v, i) {
        var on = Array.isArray(mark) ? mark.indexOf(i) >= 0 : i === mark;
        return '<span class="cci-bar' + (on ? ' is-on cci-' + tone : '') + '"><i style="height:' + Math.max(v ? 8 : 2, Math.round(100 * v / max)) + '%"></i>' +
          '<em>' + esc(labels[i]) + '</em></span>';
      }).join('') + '</div>';
  }
  function split(parts) {
    var total = sum(parts.map(function (p) { return p.v; })) || 1;
    return '<div class="cci-split" role="img" aria-label="' + esc(parts.map(function (p) { return p.l + ' ' + pct(p.v, total) + '%'; }).join(', ')) + '">' +
      '<div class="cci-split-bar">' + parts.map(function (p, i) { return '<i class="cci-s' + i + '" style="width:' + (100 * p.v / total) + '%"></i>'; }).join('') + '</div>' +
      '<div class="cci-split-key">' + parts.map(function (p, i) { return '<span><b class="cci-s' + i + '"></b>' + esc(p.l) + ' ' + pct(p.v, total) + '%</span>'; }).join('') + '</div></div>';
  }
  function compare(rows, tone) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    return '<div class="cci-compare">' + rows.map(function (r, i) {
      return '<div class="cci-crow"><span>' + esc(r.l) + '</span><div class="cci-ctrack"><i class="' + (i === 0 ? 'cci-' + tone : '') + '" style="width:' + Math.max(r.v ? 4 : 0, 100 * r.v / max) + '%"></i></div><b>' + r.v + '</b></div>';
    }).join('') + '</div>';
  }

  // ---------- seasonal occasions ----------
  function nthSunday(year, month, n) {
    var d = new Date(Date.UTC(year, month - 1, 1, 12)), first = (7 - d.getUTCDay()) % 7;
    return new Date(Date.UTC(year, month - 1, 1 + first + 7 * (n - 1), 12)).toISOString().slice(0, 10);
  }
  function ruleDate(code, year) {
    if (code === 'christmas') return year + '-12-25';
    if (code === 'valentines_day') return year + '-02-14';
    if (code === 'mothers_day') return nthSunday(year, 5, 2);
    if (code === 'fathers_day') return nthSunday(year, 9, 1);
    return '';
  }
  // Settings dates are used when available; otherwise the fixed rules give the same dates.
  function occasionDate(code, year) {
    var hit = (state.dates || []).filter(function (x) { return x.code === code && x.date.slice(0, 4) === String(year); })[0];
    return hit ? hit.date : ruleDate(code, year);
  }
  function nextOccasion(today, within) {
    var year = +today.slice(0, 4), found = null;
    SEASONAL.forEach(function (code) {
      [year, year + 1].forEach(function (y) {
        var d = occasionDate(code, y);
        if (d && d >= today && diff(today, d) <= within && (!found || d < found.date)) found = { code: code, date: d, label: (state.labels && state.labels[code]) || LABEL[code] };
      });
    });
    return found;
  }

  // ---------- the analysis ----------
  function analyse(orders, today, opts) {
    opts = opts || {};
    var all = (Array.isArray(orders) ? orders : []).filter(alive), out = [];
    var week = add(today, 6), tomorrow = add(today, 1);
    function bookedBetween(from, to) { return all.filter(function (o) { var d = booked(o, today); return d && d >= from && d <= to; }); }
    function cakesOf(list) { return sum(list.map(cakes)); }

    // 1. Orders due soon that are still not confirmed.
    var waiting = all.filter(function (o) { return o.st === 'received' && o.pd >= today && o.pd <= week; }).sort(byPickup);
    if (waiting.length) {
      var urgent = waiting.filter(function (o) { return o.pd <= tomorrow; }), shown = urgent.length ? urgent : waiting;
      out.push({ id: 'unconfirmed', tone: 'act', tag: 'Act now', priority: urgent.length ? 100 : 72, big: String(shown.length),
        title: pl(shown.length, 'order') + ' due ' + (urgent.length ? 'by tomorrow' : 'this week') + (shown.length === 1 ? ' is' : ' are') + ' not confirmed yet',
        why: refs(shown, today) + (urgent.length && waiting.length > urgent.length ? ' · ' + (waiting.length - urgent.length) + ' more later this week' : ''),
        action: 'Confirm or follow up in Orders', go: 'orders' });
    }

    // 2. Money still owed on orders due this week.
    var owing = all.filter(function (o) { return o.st === 'confirmed' && o.pd >= today && o.pd <= week && Number(o.bal) > 0; }).sort(byPickup);
    if (owing.length) {
      var near = owing.some(function (o) { return o.pd <= tomorrow; });
      out.push({ id: 'balance', tone: 'act', tag: 'Act now', priority: near ? 82 : 60, big: money(sum(owing.map(function (o) { return Number(o.bal); }))),
        title: 'still to collect from orders due this week',
        why: owing.length + ' ' + pl(owing.length, 'order') + ' · first ' + dayWord(owing[0].pd, today),
        action: 'Remind customers to pay before pickup', go: 'orders' });
    }

    // 3. Confirmed orders with no price recorded.
    var unpriced = all.filter(function (o) { return o.st === 'confirmed' && o.pd >= today && o.pd <= add(today, 29) && value(o) == null; }).sort(byPickup);
    if (unpriced.length) {
      out.push({ id: 'unpriced', tone: 'act', tag: 'Act now', priority: 58, big: String(unpriced.length),
        title: 'confirmed ' + pl(unpriced.length, 'order') + (unpriced.length === 1 ? ' has' : ' have') + ' no price yet',
        why: refs(unpriced, today), action: 'Add the price so the totals are right', go: 'orders' });
    }

    // 4. Busiest day in the next 7 days (all active orders; confirmed shown separately).
    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = add(today, i), list = all.filter(function (o) { return o.pd === d; });
      days.push({ d: d, n: cakesOf(list), c: cakesOf(list.filter(function (o) { return o.st === 'confirmed' || o.st === 'completed'; })) });
    }
    var due7 = sum(days.map(function (x) { return x.n; }));
    if (due7 > 0) {
      var top = days.reduce(function (a, b) { return b.n > a.n ? b : a; }), at = days.indexOf(top), strong = top.n >= 4 && top.n >= 1.5 * due7 / 7;
      out.push({ id: 'busiest', tone: 'plan', tag: 'Plan ahead', priority: strong ? 74 : 40, big: top.n + ' ' + pl(top.n, 'cake'),
        title: 'due ' + dayWord(top.d, today) + ', the busiest day in the next 7',
        why: due7 + ' ' + pl(due7, 'cake') + ' due this week' + (top.c < top.n ? ' · ' + top.c + ' of ' + top.n + ' on ' + (top.d === today ? 'today' : WD[weekday(top.d)]) + ' confirmed' : ''),
        action: 'Plan baking and staff for ' + (top.d === today ? 'today' : WD[weekday(top.d)]),
        viz: bars(days.map(function (x) { return x.n; }), days.map(function (x) { return x.d === today ? 'Today' : WD[weekday(x.d)].slice(0, 3); }), at, 'plan') });
    }

    // 5. Booking pace: cakes booked in the last 7 days against the 7 days before (verified booking dates only).
    var cur = cakesOf(bookedBetween(add(today, -6), today)), prev = cakesOf(bookedBetween(add(today, -13), add(today, -7)));
    if (prev >= 8) {
      var change = Math.round(100 * (cur - prev) / prev), daily = [];
      for (var k = 13; k >= 0; k--) { var day = add(today, -k); daily.push(cakesOf(bookedBetween(day, day))); }
      var steady = Math.abs(change) < 15;
      out.push({ id: 'pace', tone: change <= -25 ? 'warn' : change >= 25 ? 'good' : 'trend', tag: 'Trend',
        priority: change <= -25 ? 66 : change >= 25 ? 46 : 28,
        big: steady ? cur + ' ' + pl(cur, 'cake') : (change > 0 ? '+' : '') + change + '%',
        title: steady ? 'booked this week, about the same as last week' : 'bookings this week compared with last week',
        why: cur + ' ' + pl(cur, 'cake') + ' booked in the last 7 days, ' + prev + ' in the 7 days before',
        action: change <= -25 ? 'Post a cake reminder on social media or WhatsApp' : change >= 25 ? 'Check kitchen capacity for the next two weeks' : 'No change needed',
        viz: bars(daily, daily.map(function (v, j) { return j === 0 ? '2 wk ago' : j === 7 ? '1 wk ago' : j === 13 ? 'Today' : ''; }), [7, 8, 9, 10, 11, 12, 13], change <= -25 ? 'warn' : 'good') });
    } else if (cur > 0) {
      out.push({ id: 'pace', tone: 'trend', tag: 'Trend', priority: 26, big: cur + ' ' + pl(cur, 'cake'), title: 'booked in the last 7 days',
        why: prev + ' in the 7 days before · too few orders yet to call a trend', action: 'No change needed' });
    }

    // 6. The next seasonal occasion: bookings so far against the same point last year.
    var occ = nextOccasion(today, 75);
    if (occ) {
      var togo = diff(today, occ.date), from = add(occ.date, -3), to = add(occ.date, 2);
      var mine = all.filter(function (o) { return o.pd >= from && o.pd <= to; }), soFar = cakesOf(mine);
      var lastDate = occasionDate(occ.code, +occ.date.slice(0, 4) - 1), lastAll = [], lastFinal = 0, lastAt = 0, verified = [];
      if (lastDate) {
        lastAll = all.filter(function (o) { return o.pd >= add(lastDate, -3) && o.pd <= add(lastDate, 2); });
        lastFinal = cakesOf(lastAll);
        verified = lastAll.filter(function (o) { return booked(o, today); });
        lastAt = cakesOf(verified.filter(function (o) { return o.od <= add(lastDate, -togo); }));
      }
      var windowText = (+from.slice(8)) + '–' + (+to.slice(8)) + ' ' + MON[+to.slice(5, 7) - 1];
      if (lastFinal >= 5 && verified.length >= 3 && verified.length >= lastAll.length / 2) {
        var leads = verified.map(function (o) { return diff(o.od, lastDate); }).sort(function (a, b) { return a - b; });
        var median = leads[Math.floor((leads.length - 1) / 2)], start = add(occ.date, -(Math.max(0, median) + 7));
        out.push({ id: 'occasion', tone: soFar >= lastAt ? 'good' : 'chance', tag: 'Plan ahead', priority: togo <= 45 ? 70 : 52, big: String(soFar),
          title: pl(soFar, 'cake') + ' booked so far for ' + occ.label + ' week',
          why: 'Pickups ' + windowText + ' · ' + togo + ' days to go · last year at this point ' + lastAt + ', final ' + lastFinal,
          action: (start <= today ? 'Start promoting ' + occ.label + ' now' : 'Start promoting by ' + shortDay(start)) +
            (median > 0 ? ': half of last year’s orders came in the final ' + median + ' ' + pl(median, 'day') : ': half of last year’s orders came on the day itself'),
          viz: compare([{ l: 'This year so far', v: soFar }, { l: 'Last year by now', v: lastAt }, { l: 'Last year final', v: lastFinal }], soFar >= lastAt ? 'good' : 'chance') });
      } else if (soFar > 0) {
        out.push({ id: 'occasion', tone: 'plan', tag: 'Plan ahead', priority: togo <= 45 ? 48 : 34, big: String(soFar),
          title: pl(soFar, 'cake') + ' booked so far for ' + occ.label + ' week',
          why: 'Pickups ' + windowText + ' · ' + togo + ' days to go · no reliable earlier year to compare',
          action: 'Watch this week by week as orders come in' });
      } else {
        out.push({ id: 'occasion', tone: 'plan', tag: 'Plan ahead', priority: togo <= 45 ? 46 : 32, big: togo + ' ' + pl(togo, 'day'),
          title: 'until ' + occ.label + ', no cakes booked for that week yet',
          why: 'Pickups ' + windowText + (lastDate ? ' · last year: ' + lastFinal + ' ' + pl(lastFinal, 'cake') + ' that week' : ''),
          action: 'Plan the ' + occ.label + ' cake promotion' });
      }
    }

    // 7. Most popular cake in the last 30 days (by booking date).
    var recent = bookedBetween(add(today, -29), today), tally = {};
    recent.forEach(function (o) {
      (Array.isArray(o.it) ? o.it : []).forEach(function (it) {
        var name = String((it && (it[1] || it[0])) || '').trim(), q = Number(it && it[3]);
        if (name) tally[name] = (tally[name] || 0) + (isFinite(q) && q > 0 ? q : 1);
      });
    });
    var ranked = Object.keys(tally).map(function (n) { return { l: n, v: tally[n] }; }).sort(function (a, b) { return b.v - a.v || a.l.localeCompare(b.l); });
    var cakes30 = sum(ranked.map(function (r) { return r.v; }));
    if (cakes30 >= 10 && ranked.length >= 2) {
      out.push({ id: 'top-cake', tone: 'chance', tag: 'Opportunity', priority: 30, big: pct(ranked[0].v, cakes30) + '%',
        title: 'of cakes booked in the last 30 days were ' + ranked[0].l,
        why: ranked[0].v + ' of ' + cakes30 + ' cakes · next: ' + ranked[1].l + ' (' + ranked[1].v + ')',
        action: 'Keep ' + ranked[0].l + ' stocked and feature it in posts',
        viz: compare(ranked.slice(0, 3), 'chance') });
    }

    // 8. How far ahead customers book.
    function avgLead(list) {
      var leads = list.map(function (o) { return diff(o.od, o.pd); }).filter(function (n) { return n >= 0; });
      return leads.length ? { avg: Math.round(sum(leads) / leads.length), n: leads.length } : null;
    }
    var leadNow = avgLead(recent), leadBefore = avgLead(bookedBetween(add(today, -59), add(today, -30)));
    if (leadNow && leadNow.n >= 8) {
      var shift = leadBefore && leadBefore.n >= 8 ? leadNow.avg - leadBefore.avg : null;
      out.push({ id: 'lead', tone: 'trend', tag: 'Trend', priority: shift != null && Math.abs(shift) >= 2 ? 42 : 22,
        big: leadNow.avg + ' ' + pl(leadNow.avg, 'day'), title: 'on average between booking and pickup',
        why: (shift != null ? 'Previous 30 days: ' + leadBefore.avg + ' ' + pl(leadBefore.avg, 'day') + ' · ' : '') + leadNow.n + ' orders in the last 30 days',
        action: shift != null && shift <= -2 ? 'More last-minute orders: keep room for short-notice cakes' :
          shift != null && shift >= 2 ? 'Customers are planning earlier: promote occasions sooner' : 'No change needed' });
    }

    // 9. Where orders come from.
    function channels(list) {
      var t = {};
      list.forEach(function (o) { var k = String(o.src || o.sys || 'Other'); t[k] = (t[k] || 0) + 1; });
      return t;
    }
    if (recent.length >= 10) {
      var onlineOf = function (t) { return sum(Object.keys(t).filter(function (k) { return /online|website|web form/i.test(k); }).map(function (k) { return t[k]; })); };
      var ch = channels(recent), share = pct(onlineOf(ch), recent.length);
      var before = bookedBetween(add(today, -59), add(today, -30)), was = before.length >= 10 ? pct(onlineOf(channels(before)), before.length) : null;
      var parts = Object.keys(ch).map(function (k) { return { l: k, v: ch[k] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 4);
      out.push({ id: 'channel', tone: 'chance', tag: 'Opportunity', priority: was != null && Math.abs(share - was) >= 10 ? 40 : 24,
        big: share + '%', title: 'of orders in the last 30 days came in online',
        why: recent.length + ' orders' + (was != null ? ' · online was ' + was + '% the 30 days before' : ''),
        action: share < 40 ? 'Share the online order link in posts and WhatsApp' : 'Keep the order link in every post',
        viz: split(parts) });
    }

    // 10. Returning customers.
    var counts = {};
    all.forEach(function (o) { var id = identity(o); if (id) counts[id] = (counts[id] || 0) + 1; });
    var people = {};
    recent.forEach(function (o) { var id = identity(o); if (id) people[id] = true; });
    var ids = Object.keys(people), back = ids.filter(function (id) { return counts[id] >= 2; }).length;
    if (ids.length >= 10) {
      out.push({ id: 'returning', tone: 'good', tag: 'Customers', priority: 24, big: pct(back, ids.length) + '%',
        title: 'of customers in the last 30 days had ordered before',
        why: back + ' of ' + ids.length + ' customers we can identify',
        action: back / ids.length >= 0.7 ? 'Most orders come from regulars: reach new customers with posts' : 'Thank first-time customers and invite a second order',
        viz: split([{ l: 'Returning', v: back }, { l: 'First time', v: ids.length - back }]) });
    }

    // 11. Quietest pickup day (last 8 weeks).
    var byDay = [0, 0, 0, 0, 0, 0, 0];
    all.forEach(function (o) { if (o.pd >= add(today, -55) && o.pd <= today) byDay[weekday(o.pd)] += cakes(o); });
    var open = byDay.map(function (v, j) { return { v: v, j: j }; }).filter(function (x) { return x.v > 0; });
    if (sum(byDay) >= 40 && open.length >= 5) {
      var least = Math.min.apply(null, open.map(function (x) { return x.v; })), high = open.reduce(function (a, b) { return b.v > a.v ? b : a; });
      var lows = open.filter(function (x) { return x.v === least; }).map(function (x) { return x.j; });
      if (lows.length <= 3 && least < high.v) {
        var names = lows.map(function (j) { return WD[j]; }), named = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
        var perWeek = function (v) { var w = Math.round(v / 8); return w < 1 ? 'Under 1 cake' : 'About ' + w + ' ' + pl(w, 'cake'); };
        out.push({ id: 'quiet-day', tone: 'chance', tag: 'Opportunity', priority: 20,
          big: lows.length === 1 ? named : lows.map(function (j) { return WD[j].slice(0, 3); }).join(', '),
          title: lows.length === 1 ? 'is the quietest pickup day' : 'are the quietest pickup days',
          why: perWeek(least) + ' a week on ' + (lows.length === 1 ? names[0] + 's' : 'each') + ', against ' + perWeek(high.v).toLowerCase() + ' on ' + WD[high.j] + 's · last 8 weeks',
          action: 'Try a pickup offer on ' + (lows.length === 1 ? names[0] + 's' : 'quiet weekdays'),
          viz: bars(byDay, WD.map(function (w) { return w.slice(0, 3); }), lows, 'chance') });
      }
    }

    // 12. Data note: records left out of booking figures.
    var undated = all.filter(function (o) { return !booked(o, today); }).length;
    if (undated) {
      out.push({ id: 'undated', tone: 'note', tag: 'Note', priority: 4, big: String(undated),
        title: pl(undated, 'record') + ' without a reliable booking date',
        why: 'They count as pickups but are left out of booking figures, never guessed', action: 'No action needed' });
    }

    // 13. Reassurance when nothing is urgent.
    if (!out.some(function (f) { return f.tone === 'act'; })) {
      var soon = all.filter(function (o) { return o.pd >= today && o.pd <= tomorrow; });
      out.push(soon.length ?
        { id: 'clear', tone: 'good', tag: 'All clear', priority: 50, big: String(soon.length), title: pl(soon.length, 'order') + ' due by tomorrow, all confirmed',
          why: 'Nothing unconfirmed, unpriced or unpaid in the next few days', action: 'Nothing urgent' } :
        { id: 'clear', tone: 'note', tag: 'All clear', priority: 26, big: '0', title: 'pickups due today or tomorrow',
          why: 'Nothing unconfirmed, unpriced or unpaid in the next few days', action: 'Nothing urgent' });
    }
    return out.sort(function (a, b) { return b.priority - a.priority; });
  }

  // ---------- rendering ----------
  function card(f) {
    return '<article class="cci-card cci-' + f.tone + '" data-cci-id="' + esc(f.id) + '">' +
      '<span class="cci-tag">' + esc(f.tag) + '</span>' +
      '<p class="cci-line"><strong class="cci-big">' + esc(f.big) + '</strong> <span class="cci-title">' + esc(f.title) + '</span></p>' +
      '<p class="cci-why">' + esc(f.why) + '</p>' + (f.viz || '') +
      '<div class="cci-foot"><span class="cci-do">' + esc(f.action) + '</span>' +
      (f.go === 'orders' ? '<button type="button" class="cci-go" data-cci="orders">Open Orders</button>' : '') + '</div></article>';
  }
  function sectionHtml(findings) {
    var show = global.matchMedia && global.matchMedia('(max-width: 700px)').matches ? SHOW - 1 : SHOW;
    var first = findings.slice(0, show), rest = findings.slice(show);
    return '<header class="cci-head"><div><h3>Today’s insights</h3><p>Worked out from live orders · updated every minute</p></div>' +
      (rest.length ? '<button type="button" class="cci-more" data-cci="more" aria-expanded="' + state.expanded + '">' +
        (state.expanded ? 'Show fewer' : 'Show all ' + findings.length) + '</button>' : '') + '</header>' +
      '<div class="cci-grid">' + first.map(card).join('') + (state.expanded ? rest.map(card).join('') : '') + '</div>';
  }
  function draw(section) {
    var last = state.last;
    if (!last || !section) return;
    var findings = analyse(last.orders, last.today);
    section.innerHTML = sectionHtml(findings);
    section.setAttribute('data-count', String(findings.length));
  }

  // ---------- Heartbeat header and times (presentation only) ----------
  function polish(main, payload) {
    var head = main.querySelector('.hb-v2-head');
    if (head) {
      var h2 = head.querySelector('h2');
      if (h2 && h2.textContent !== 'Cake Heartbeat') h2.textContent = 'Cake Heartbeat';
      var upd = head.querySelector('.hb-v2-update');
      if (upd) upd.innerHTML = '<span class="hb-v2-live"></span> Live · updated ' + esc(stamp12(payload && payload.generated_at));
    }
    // The daily breakdown lists pickup times; staff read them in 12-hour time.
    Array.prototype.forEach.call(main.querySelectorAll('.hb-m-details .hb-v2-order b'), function (b) {
      var t = b.textContent.trim();
      if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(t)) b.textContent = time12(t);
    });
  }

  // ---------- occasion dates from Settings (read-only, cached; the fixed rules are the fallback) ----------
  function token() {
    try {
      var raw = global.localStorage && global.localStorage.getItem('cc-cakes-staff'), s = raw && JSON.parse(raw);
      return (s && (s.access_token || (s.currentSession && s.currentSession.access_token))) || '';
    } catch (e) { return ''; }
  }
  function loadDates(today) {
    if (state.loading || Date.now() - state.datesAt < 30 * 60000 || typeof global.fetch !== 'function') return;
    var bearer = token();
    if (!bearer) { state.datesAt = Date.now(); return; }
    state.loading = true;
    var h = { apikey: SB_KEY, Authorization: 'Bearer ' + bearer };
    var from = add(today, -400), until = add(today, 400);
    Promise.all([
      global.fetch(SB_URL + '/rest/v1/occasion_dates?select=occasion_code,starts_on&starts_on=gte.' + from + '&starts_on=lte.' + until, { headers: h }),
      global.fetch(SB_URL + '/rest/v1/occasions?select=code,label,active', { headers: h })
    ]).then(function (r) {
      if (!r[0].ok || !r[1].ok) throw Error('Occasion dates unavailable');
      return Promise.all([r[0].json(), r[1].json()]);
    }).then(function (j) {
      state.dates = (Array.isArray(j[0]) ? j[0] : []).filter(function (x) { return x && iso(x.starts_on); })
        .map(function (x) { return { code: x.occasion_code, date: x.starts_on }; });
      var labels = {};
      (Array.isArray(j[1]) ? j[1] : []).forEach(function (o) { if (o && o.active !== false && o.code) labels[o.code] = o.label; });
      state.labels = labels;
    }).catch(function () { /* the fixed date rules stay in use */ })
      .then(function () {
        state.loading = false; state.datesAt = Date.now();
        var s = global.document && global.document.getElementById('cc-insights');
        if (s && s.isConnected) draw(s);
      });
  }

  // ---------- mount (called after each Heartbeat render) ----------
  function mount(host, payload, options) {
    if (!host || typeof host.querySelector !== 'function') return false;
    var main = host.querySelector('.hb-v2');
    if (!main) return false;
    var today = iso(options && options.today) || new Date().toISOString().slice(0, 10);
    var orders = payload && (payload.allOrders || payload.orders);
    state.last = { orders: Array.isArray(orders) ? orders : [], today: today };
    polish(main, payload);
    var old = main.querySelector('#cc-insights');
    if (old) old.remove();
    var section = host.ownerDocument.createElement('section');
    section.id = 'cc-insights';
    section.className = 'cci';
    section.setAttribute('aria-label', 'Today’s insights from live orders');
    var head = main.querySelector('.hb-v2-head');
    if (head && head.nextSibling) main.insertBefore(section, head.nextSibling); else main.appendChild(section);
    try { draw(section); } catch (err) { section.remove(); throw err; }
    loadDates(today);
    return true;
  }

  if (global.document && !global.__ccInsightsClicks) {
    global.__ccInsightsClicks = true;
    global.document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('#cc-insights [data-cci]');
      if (!b) return;
      e.preventDefault();
      if (b.getAttribute('data-cci') === 'more') {
        state.expanded = !state.expanded;
        draw(global.document.getElementById('cc-insights'));
        var again = global.document.querySelector('#cc-insights [data-cci="more"]');
        if (again) again.focus({ preventScroll: true });
      } else if (b.getAttribute('data-cci') === 'orders') {
        var nav = global.document.querySelector('#cc-staff [data-tab="orders"]');
        if (nav) nav.click();
      }
    });
  }

  global.CCCakeInsights = { version: VERSION, analyse: analyse, mount: mount, time12: time12 };
})(typeof window !== 'undefined' ? window : globalThis);
