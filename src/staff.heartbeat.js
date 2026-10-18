  // Cake Heartbeat: read-only operational pulse for the Analytics Overview.
  // Source: dashboard_register (deduplicated master register), plus staff-visible calendar tables.
  // These widgets deliberately ignore historical Analytics period filters: they always track pickup dates.
  var HB = { events: [], eventsReady: false, eventError: false, loadingEvents: false, eventsAt: 0, timer: null, selected: null, metric: 'value', mode: 'daily', railScroll: null, chartScroll: null, daysBehind: 30, daysAhead: 59 };
  function hbMonday(d) {
    return addDays(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
  }
  function hbWeekStart(offset) { return addDays(hbMonday(today()), offset * 7); }
  function hbWeekOrders(start, source) {
    var end = addDays(start, 6);
    return (source || ((DX && DX.data) ? (DX.data.allOrders || DX.data.orders) : [])).filter(function (o) {
      // No test/duplicate/review records reach dashboard_register. Quotes are not booked pickups.
      return o.pd && o.pd >= start && o.pd <= end && o.st !== 'cancelled' &&
        o.st !== 'declined' && o.st !== 'not_confirmed' && !o.off;
    });
  }
  function hbCountCakes(list) {
    return list.reduce(function (n, o) {
      var items = o.it || [];
      return n + (items.length ? items.reduce(function (sum, i) { return sum + (Number(i[3]) > 0 ? Number(i[3]) : 1); }, 0) : 1);
    }, 0);
  }
  function hbEventsFor(day) {
    return HB.events.filter(function (e) { return e.day <= day && e.end >= day; });
  }
  function hbLoadEvents(force) {
    if (HB.loadingEvents || (!force && HB.eventsAt && Date.now() - HB.eventsAt < 600000)) return;
    HB.loadingEvents = true;
    var from = addDays(today(), -45), until = addDays(today(), 210);
    Promise.all([
      sb.from('calendar_events').select('day,ends_on,name,kind').gte('day', from).lte('day', until),
      sb.from('occasion_dates').select('occasion_code,starts_on,ends_on').gte('starts_on', from).lte('starts_on', until),
      sb.from('occasions').select('code,label,active')
    ]).then(function (parts) {
      var ev = [], names = {};
      if (parts.some(function (p) { return !p || p.error; })) throw new Error('Calendar unavailable');
      (parts[2].data || []).forEach(function (o) { if (o.active !== false) names[o.code] = o.label; });
      (parts[0].data || []).forEach(function (e) {
        if (!e.day || !e.name) return;
        ev.push({ day: e.day, end: e.ends_on && e.ends_on >= e.day ? e.ends_on : e.day,
          name: e.name, kind: e.kind === 'holiday' ? 'holiday' : 'event' });
      });
      (parts[1].data || []).forEach(function (e) {
        if (!e.starts_on || !names[e.occasion_code]) return;
        if (ev.some(function (x) { return x.day === e.starts_on && x.name.toLowerCase() === String(names[e.occasion_code]).toLowerCase(); })) return;
        ev.push({ day: e.starts_on, end: e.ends_on && e.ends_on >= e.starts_on ? e.ends_on : e.starts_on,
          name: names[e.occasion_code], kind: 'occasion' });
      });
      HB.events = ev; HB.eventError = false; HB.eventsReady = true;
    }).catch(function () { HB.eventError = true; HB.eventsReady = true; })
      .then(function () {
        HB.loadingEvents = false; HB.eventsAt = Date.now();
        if (S.tab === 'dash' && DX && DX.data && !DX.loading) view();
      });
  }
  function hbStart() {
    hbLoadEvents(false);
    if (HB.timer) return;
    // A visible Analytics screen refreshes from the authoritative register once a minute.
    // No extra backend, realtime publication or paid third-party calendar feed is needed.
    HB.timer = window.setInterval(function () {
      if (S.tab !== 'dash' || document.hidden || !DX || DX.loading) return;
      hbLoadEvents(false);
      dashLoad(true);
    }, 60000);
  }
  function hbWeekNav(delta) {
    HB.week = Math.max(-12, Math.min(26, HB.week + delta));
    view();
  }
  function hbWindowLabel(start) { return nice(start) + ' – ' + nice(addDays(start, 6)) + ' ' + start.slice(0, 4); }
  function hbWhenLabel(start) {
    var end = addDays(start, 6), t = today();
    if (t >= start && t <= end) return 'This week';
    return start > t ? 'Upcoming week' : 'Past week';
  }
  function hbEventTags(day) {
    var tags = hbEventsFor(day);
    return tags.slice(0, 2).map(function (e) {
      return '<span class="hb-event hb-' + e.kind + '" title="' + esc(e.name + (e.kind === 'holiday' ? ' · Public holiday' : '')) + '">' +
        '<span aria-hidden="true" class="hb-event-dot"></span>' + esc(e.name) + '</span>';
    }).join('') + (tags.length > 2 ? '<span class="hb-event-more">+' + (tags.length - 2) + ' more</span>' : '');
  }
  function hbTimeBucket(o) {
    var m = /^([0-2][0-9]):([0-5][0-9])/.exec(o.pt || '');
    if (!m) return -1;
    var h = +m[1], minute = +m[2];
    if (h > 23 || minute > 59) return -1;
    if (h < 11) return 0;
    if (h < 14) return 1;
    if (h < 17) return 2;
    return 3;
  }
  function hbPeak(list) {
    var bins = [0, 0, 0, 0], known = 0;
    list.forEach(function (o) { var i = hbTimeBucket(o); if (i >= 0) { bins[i]++; known++; } });
    var max = Math.max.apply(null, bins), at = bins.indexOf(max);
    return { bins: bins, missing: list.length - known, at: at, count: max,
      label: ['Before 11 AM', '11 AM–2 PM', '2 PM–5 PM', 'After 5 PM'][at] };
  }

  // Daily bookings are attributed to the real date taken, not the later date they were entered.
  // dashboard_register's odok indicates whether that date is reliable.
  function hbNum(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function hbFjd(v) { return '$' + Math.round(hbNum(v)).toLocaleString('en-US'); }
  function hbActive(o) {
    return o && ['cancelled', 'declined', 'not_confirmed'].indexOf(o.st) < 0 && !o.off;
  }
  function hbOrderDate(o) {
    var d = o && o.od;
    return o && o.odok && /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d <= today() &&
      (!o.pd || d <= o.pd) ? d : null;
  }
  function hbBookedValue(o) {
    // This is booked/estimated order value, not collected or recognised sales.
    return Math.max(0, hbNum(o.cv != null ? o.cv : o.lv != null ? o.lv : o.tot));
  }
  function hbData() {
    var t = today(), start = addDays(t, -HB.daysBehind), end = addDays(t, HB.daysAhead);
    var all = DX && DX.data ? (DX.data.allOrders || DX.data.orders || []) : [];
    var rows = [], days = {}, missing = 0, live = all.filter(hbActive);
    for (var i = 0; i <= HB.daysBehind + HB.daysAhead; i++) {
      var d = addDays(start, i);
      var row = { day: d, placed: [], pickups: [], orders: 0, cakes: 0, value: 0,
                  pickupCount: 0, pickupCakes: 0, cumOrders: 0, cumCakes: 0, cumValue: 0 };
      rows.push(row); days[d] = row;
    }
    // Cumulative totals include history before the visible timeline.
    var carry = { orders: 0, cakes: 0, value: 0 };
    live.forEach(function (o) {
      var od = hbOrderDate(o), qty = hbCountCakes([o]), value = hbBookedValue(o);
      if (!od) missing++;
      else if (od < start) { carry.orders++; carry.cakes += qty; carry.value += value; }
      else if (days[od]) {
        days[od].placed.push(o);
        days[od].orders++; days[od].cakes += qty; days[od].value += value;
      }
      if (o.pd && days[o.pd]) {
        days[o.pd].pickups.push(o);
        days[o.pd].pickupCount++; days[o.pd].pickupCakes += qty;
      }
    });
    var running = { orders: carry.orders, cakes: carry.cakes, value: carry.value };
    rows.forEach(function (r) {
      running.orders += r.orders; running.cakes += r.cakes; running.value += r.value;
      // Never show an invented future booking progression.
      if (r.day <= t) {
        r.cumOrders = running.orders; r.cumCakes = running.cakes; r.cumValue = running.value;
      } else {
        r.cumOrders = null; r.cumCakes = null; r.cumValue = null;
      }
    });
    return { rows: rows, byDay: days, missing: missing, live: live,
      start: start, end: end, today: t, carry: carry };
  }
  function hbMetric(row) {
    var m = HB.metric;
    return HB.mode === 'cumulative' ?
      (m === 'value' ? row.cumValue : m === 'cakes' ? row.cumCakes : row.cumOrders) :
      (m === 'value' ? row.value : m === 'cakes' ? row.cakes : row.orders);
  }
  function hbMetricLabel() { return HB.metric === 'value' ? 'Booked value' : HB.metric === 'cakes' ? 'Cakes booked' : 'Orders placed'; }
  function hbMetricFormat(v) { return HB.metric === 'value' ? hbFjd(v) : String(v == null ? '—' : v); }
  function hbSelectedDay(data) {
    var selected = HB.selected || data.today;
    return data.byDay[selected] || data.byDay[data.today];
  }
  function hbDateTitle(day) { return nice(day, true) + ' ' + day.slice(0,4); }
  function hbEventMini(day) {
    var ev = hbEventsFor(day);
    if (!ev.length) return '';
    return '<span class="hb-v2-event" title="' + esc(ev.map(function (e) { return e.name; }).join(' · ')) + '">' +
      '<i aria-hidden="true"></i>' + esc(ev[0].name) + (ev.length > 1 ? ' +' + (ev.length - 1) : '') + '</span>';
  }
  function hbChart(data) {
    var rows = data.rows, t = data.today, vals = rows.map(hbMetric);
    var max = Math.max(1, Math.max.apply(null, vals.filter(function (v) { return v != null; })));
    var h = 155, top = 28, bottom = 118, step = 98, width = rows.length * step;
    var y = function (v) { return bottom - Math.max(0, v) / max * (bottom - top); };
    var plotted = rows.filter(function (r) { return r.day <= t; });
    var line = plotted.map(function (r, i) {
      return (i ? 'L' : 'M') + (i * step + step / 2) + ' ' + y(hbMetric(r)).toFixed(1);
    }).join(' ');
    var fill = plotted.length ? line + ' L' + ((plotted.length - 1) * step + step / 2) + ' ' + bottom + ' L' + step / 2 + ' ' + bottom + ' Z' : '';
    var grid = [0, .5, 1].map(function (i) {
      var v = Math.round(max * i);
      return '<line x1="0" x2="' + width + '" y1="' + y(v) + '" y2="' + y(v) + '" class="hb-v2-grid"/>';
    }).join('');
    var marks = rows.map(function (r, i) {
      var cx = i * step + step / 2, v = hbMetric(r), past = r.day <= t,
          chosen = (HB.selected || t) === r.day, now = r.day === t;
      return '<g class="hb-v2-mark' + (chosen ? ' is-selected' : '') + '">' +
        (chosen ? '<rect x="' + (i * step + 2) + '" y="5" width="' + (step - 4) + '" height="131" rx="8" class="hb-v2-focus"/>' : '') +
        (now ? '<line x1="' + cx + '" x2="' + cx + '" y1="7" y2="' + bottom + '" class="hb-v2-now"/>' : '') +
        (past ? '<circle cx="' + cx + '" cy="' + y(v).toFixed(1) + '" r="' + (chosen ? 5 : 3.5) + '" class="hb-v2-dot"><title>' +
         esc(hbDateTitle(r.day) + ': ' + hbMetricFormat(v) + ', ' + r.orders + ' orders placed, ' + hbFjd(r.value) + ' booked, ' +
          r.pickupCount + ' pickups') + '</title></circle>' : '') +
        '<text x="' + cx + '" y="146" text-anchor="middle" class="hb-v2-axis-label">' + (+r.day.slice(8)) + ' ' +
        esc(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+r.day.slice(5,7)-1]) + '</text></g>';
    }).join('');
    return '<svg class="hb-v2-chart-svg" viewBox="0 0 ' + width + ' ' + h + '" width="' + width + '" height="' + h +
      '" role="img" aria-label="Daily ' + esc(HB.mode === 'cumulative' ? 'cumulative ' : '') + hbMetricLabel().toLowerCase() +
      ' across dates, future dates are not projected">' + grid +
      (fill ? '<path d="' + fill + '" class="hb-v2-area"/><path d="' + line + '" class="hb-v2-line"/>' : '') +
      marks + '</svg>';
  }
  function hbDayDetail(data) {
    var r = hbSelectedDay(data), date = r.day, p = hbPeak(r.pickups);
    var list = function (name, array, pickup) {
      return '<div class="hb-v2-list"><div class="hb-v2-list-head"><strong>' + esc(name) +
        '</strong><span>' + array.length + ' orders</span></div>' +
        (array.length ? '<div class="hb-v2-list-scroll">' + array.slice(0,30).map(function (o) {
          return '<div class="hb-v2-order"><span>' + esc(o.r || 'Cake order') + '</span><b>' +
            (pickup ? esc(o.pt ? String(o.pt).slice(0,5) : 'Time TBC') : hbFjd(hbBookedValue(o))) +
            '</b></div>';
        }).join('') + '</div>' : '<p>No ' + (pickup ? 'pickups scheduled' : 'orders recorded') + ' on this day.</p>') + '</div>';
    };
    return '<div class="hb-v2-detail"><div class="hb-v2-detail-title"><div><h3>' +
      esc(hbDateTitle(date)) + '</h3><span>Actual recorded bookings and scheduled pickups</span></div>' +
      '<div class="hb-v2-detail-tags">' + hbEventTags(date) + '</div></div>' +
      '<div class="hb-v2-daystats"><div><span>Orders placed</span><strong>' + r.orders +
      '</strong></div><div><span>Booked value</span><strong>' + hbFjd(r.value) +
      '</strong></div><div><span>Cakes booked</span><strong>' + r.cakes +
      '</strong></div><div><span>Pickups due</span><strong>' + r.pickupCount +
      '</strong></div></div>' +
      '<div class="hb-v2-detail-bottom">' + list('Booked on this date',r.placed,false) +
      list('Pickups for this date',r.pickups,true) + '</div>' +
      (p.count ? '<p class="hb-v2-footnote">Busiest pickup window: ' + esc(p.label) + ' · ' +
        p.count + (p.count === 1 ? ' order' : ' orders') + '</p>' : '') + '</div>';
  }
  function hbView() {
    if (!DX || !DX.data) return '';
    var data = hbData(), current = data.byDay[data.today], selected = hbSelectedDay(data),
      pastWeek = data.rows.filter(function (r) { return r.day > addDays(data.today, -7) && r.day <= data.today; }),
      nextWeek = data.rows.filter(function (r) { return r.day >= data.today && r.day < addDays(data.today, 7); }),
      ord7 = pastWeek.reduce(function (n, r) { return n + r.orders; },0),
      sales7 = pastWeek.reduce(function (n, r) { return n + r.value; },0),
      pickups7 = nextWeek.reduce(function (n, r) { return n + r.pickupCount; },0),
      upcomingCake = nextWeek.reduce(function (n, r) { return n + r.pickupCakes; },0),
      lastRead = DX.data.generated_at ? stamp(DX.data.generated_at) : 'the latest refresh';
    var cells = data.rows.map(function (r) {
      var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.day+'T12:00:00Z').getUTCDay()],
        selected = r.day === (HB.selected || data.today), now = r.day === data.today,
        label = hbDateTitle(r.day) + ', ' + r.orders + ' orders booked, ' + r.pickupCount + ' pickups';
      return '<button type="button" class="hb-v2-day' + (selected ? ' is-selected' : '') + (now ? ' is-today' : '') +
       (r.day > data.today ? ' is-future' : '') + '" data-act="dx-hb-day" data-v="' + r.day + '"' +
       (now ? ' data-hb-today="true"' : '') + ' aria-pressed="' + selected + '" aria-label="' + esc(label) + '">' +
       '<span class="hb-v2-date">' + dow + ' <b>' + +r.day.slice(8) + '</b></span>' +
       '<span class="hb-v2-booked"><b>' + (r.day > data.today ? '—' : r.orders) +
       '</b><small>booked</small></span>' +
       '<span class="hb-v2-value">' + (r.day > data.today ? 'Not yet' : hbFjd(r.value)) + '</span>' +
       '<span class="hb-v2-pickup">' + r.pickupCount + ' pickups</span>' +
       (hbEventMini(r.day) || '<span class="hb-v2-event-space"></span>') + '</button>';
    }).join('');
    var metricOpts = [['value','Booked value'],['orders','Orders'],['cakes','Cakes']],
      metricBtns = metricOpts.map(function (x) { return '<button type="button" data-act="dx-hb-metric" data-v="' + x[0] +
        '" aria-pressed="' + (HB.metric === x[0]) + '" class="' + (HB.metric === x[0] ? 'is-on' : '') + '">' + x[1] + '</button>'; }).join('');
    var modeBtns = [['daily','Daily'],['cumulative','Cumulative']].map(function (x) {
      return '<button type="button" data-act="dx-hb-mode" data-v="' + x[0] +
        '" aria-pressed="' + (HB.mode === x[0]) + '" class="' + (HB.mode === x[0] ? 'is-on' : '') + '">' + x[1] + '</button>';
    }).join('');
    return '<section class="hb-v2" aria-label="Cake Heartbeat daily performance">' +
      '<div class="hb-v2-head"><div><h2>Cake Heartbeat</h2><p>Day-by-day cake bookings, value and pickup demand</p></div>' +
      '<div class="hb-v2-update"><span class="hb-v2-live"></span> Updated ' + esc(lastRead) + ' · refreshes every 60 sec</div></div>' +
      '<div class="hb-v2-kpis">' +
      '<div><span>Last 7 days · orders placed</span><strong>' + ord7 + '</strong></div>' +
      '<div><span>Last 7 days · booked value</span><strong>' + hbFjd(sales7) + '</strong></div>' +
      '<div><span>Next 7 days · pickups</span><strong>' + pickups7 + '</strong></div>' +
      '<div><span>Next 7 days · cakes due</span><strong>' + upcomingCake + '</strong></div></div>' +
      '<div class="hb-v2-tools"><div class="hb-v2-chart-title"><h3>Daily booking performance</h3>' +
      '<p>Orders are counted on the original booking date, even when entered later. Scroll the timeline left or right.</p></div>' +
      '<div class="hb-v2-options"><div class="hb-v2-switch" role="group" aria-label="Measure">' + metricBtns + '</div>' +
      '<div class="hb-v2-switch" role="group" aria-label="Display mode">' + modeBtns + '</div></div></div>' +
      '<div class="hb-v2-scrollbar"><div class="hb-v2-scrollhint">← Earlier days</div><div class="hb-v2-railbuttons">' +
      '<button type="button" data-act="dx-hb-prev" aria-label="Scroll seven days earlier">←</button>' +
      '<button type="button" data-act="dx-hb-today">Today</button>' +
      '<button type="button" data-act="dx-hb-next" aria-label="Scroll seven days later">→</button>' +
      '</div><div class="hb-v2-scrollhint">Later days →</div></div>' +
      '<div class="hb-v2-scroller" data-hb-scroll tabindex="0" aria-label="Horizontal day by day booking timeline">' +
      '<div class="hb-v2-track" style="width:' + (data.rows.length * 98) + 'px">' +
      '<div class="hb-v2-dayrail">' + cells + '</div>' +
      '<div class="hb-v2-graph">' + hbChart(data) + '</div>' +
      '</div></div>' +
      '<div class="hb-v2-key"><span><i class="hb-v2-key-line"></i>' +
        esc((HB.mode === 'cumulative' ? 'Running ' : 'Daily ') + hbMetricLabel().toLowerCase()) +
      '</span><span><i class="hb-v2-key-dot"></i>Today · future booking activity is not projected</span>' +
      '<span>Bookings with unverified original date: ' + data.missing + ' (excluded from booking trend)</span>' +
      (HB.eventError ? '<span>Calendar events temporarily unavailable</span>' : '') + '</div>' +
      hbDayDetail(data) + '</section>';
  }
