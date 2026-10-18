  // Cake Heartbeat: read-only operational pulse for the Analytics Overview.
  // Source: dashboard_register (deduplicated master register), plus staff-visible calendar tables.
  // These widgets deliberately ignore historical Analytics period filters: they always track pickup dates.
  var HB = { week: 0, events: [], eventsReady: false, eventError: false, loadingEvents: false, eventsAt: 0, timer: null };
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
    var from = addDays(today(), -21), until = addDays(today(), 210);
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
  function hbCurve(orders, start) {
    var withDate = orders.filter(function (o) { return o.odok && /^\\d{4}-\\d{2}-\\d{2}$/.test(o.od || '') && o.od <= o.pd; });
    var invalid = orders.length - withDate.length, t = today();
    var labels = ['6w', '5w', '4w', '3w', '2w', '1w', 'Pickup'];
    var cutoffs = [42, 35, 28, 21, 14, 7, 0].map(function (d) { return addDays(start, -d); });
    var points = cutoffs.map(function (d) {
      return d > t ? null : withDate.filter(function (o) { return o.od <= d; }).length;
    });
    var n = points.filter(function (v) { return v !== null; }).length;
    if (!n) return '<div class="hb-chart-empty">The six-week booking window has not started yet.</div>';
    if (!withDate.length) return '<div class="hb-chart-empty">No reliable order dates available for this week.</div>';
    var max = Math.max(1, withDate.length), x = function (i) { return 30 + i * 76; }, y = function (v) { return 118 - v / max * 90; };
    var dots = [], seg = [];
    points.forEach(function (v, i) {
      if (v === null) return;
      seg.push(x(i) + ',' + y(v).toFixed(1));
      dots.push('<circle cx="' + x(i) + '" cy="' + y(v).toFixed(1) + '" r="4.5" class="hb-curve-dot"><title>' +
        esc(labels[i] + ' before pickup: ' + v + ' dated booking' + (v === 1 ? '' : 's')) + '</title></circle>');
    });
    var line = '<polyline class="hb-curve-line" points="' + seg.join(' ') + '"/>';
    var bars = points.map(function (v, i) {
      return '<text x="' + x(i) + '" y="146" class="hb-curve-label" text-anchor="middle">' + labels[i] + '</text>' +
        (v === null ? '' : '<text x="' + x(i) + '" y="' + Math.max(15, y(v) - 11).toFixed(1) + '" class="hb-curve-number" text-anchor="middle">' + v + '</text>');
    }).join('');
    return '<svg class="hb-curve" viewBox="0 0 520 154" role="img" aria-label="Cumulative dated bookings by weeks before pickup">' +
      '<line x1="30" x2="486" y1="118" y2="118" class="hb-axis"/>' + line + dots.join('') + bars + '</svg>' +
      '<div class="hb-curve-foot">' + withDate.length + ' of ' + orders.length + ' orders have reliable booking dates' +
      (invalid ? ' · ' + invalid + ' excluded from curve only' : '') + ' · Future bookings are not projected.</div>';
  }
  function hbView() {
    if (!DX || !DX.data) return '';
    var start = hbWeekStart(HB.week), end = addDays(start, 6), t = today();
    var orders = hbWeekOrders(start), maxCount = 0, days = [];
    for (var i = 0; i < 7; i++) {
      var day = addDays(start, i), list = orders.filter(function (o) { return o.pd === day; });
      maxCount = Math.max(maxCount, list.length);
      days.push({ d: day, list: list, count: list.length });
    }
    var busiest = days.reduce(function (a, b) { return b.count > a.count ? b : a; }, days[0]);
    var peak = hbPeak(orders), cakeN = hbCountCakes(orders);
    var generated = DX.data.generated_at ? stamp(DX.data.generated_at) : 'the last refresh';
    var weekCards = [-1, 0, 1, 2, 3].map(function (i) {
      var offset = HB.week + i, week = hbWeekStart(offset), count = hbWeekOrders(week).length;
      if (offset < -12 || offset > 26) return '';
      return '<button type="button" class="hb-week' + (i === 0 ? ' is-selected' : '') +
        '" data-act="hb-week" data-v="' + offset + '" aria-pressed="' + (i === 0) + '">' +
        '<span class="hb-week-date">' + esc(nice(week)) + '</span><b>' + count + '</b><small>orders</small></button>';
    }).join('');
    var daysHtml = days.map(function (d, i) {
      var proportion = d.count && maxCount ? Math.max(7, d.count / maxCount * 100) : 0;
      var isToday = d.d === t, events = hbEventTags(d.d);
      var content = '<div class="hb-day-head"><span>' + WD[i] + '</span><strong>' + +d.d.slice(8) + '</strong></div>' +
        '<div class="hb-day-track"><i style="height:' + proportion.toFixed(0) + '%"></i></div>' +
        '<b class="hb-day-count">' + d.count + '</b><small>' + (d.count === 1 ? 'order' : 'orders') + '</small>' +
        (events ? '<div class="hb-events">' + events + '</div>' : '');
      return d.list.length ? '<button type="button" class="hb-day' + (isToday ? ' is-today' : '') +
        '" data-act="dx-drill" data-v="' + dxKey({ t: 'Cake pickups · ' + nice(d.d, true), l: d.list }) + '" aria-label="' +
        esc(nice(d.d, true) + ': ' + d.count + ' orders, show details') + '">' + content + '</button>' :
        '<div class="hb-day' + (isToday ? ' is-today' : '') + '">' + content + '</div>';
    }).join('');
    var peakRows = ['Before 11 AM', '11 AM–2 PM', '2 PM–5 PM', 'After 5 PM'].map(function (label, i) {
      var v = peak.bins[i], p = peak.count ? v / peak.count * 100 : 0;
      return '<div class="hb-hour"><span>' + label + '</span><div class="hb-hour-track"><i style="width:' + p.toFixed(0) + '%"></i></div><b>' + v + '</b></div>';
    }).join('');
    var upcomingWeek = HB.week === 0 && start <= t && end >= t;
    return '<section class="hb-card" aria-label="Cake Heartbeat live weekly pickup and booking dashboard">' +
      '<div class="hb-header"><div class="hb-heading"><span class="hb-pulse" aria-hidden="true"><i></i></span>' +
      '<div><div class="hb-eyebrow">CAKE OPERATIONS</div><h2>Cake Heartbeat</h2><p>Weekly booking momentum and pickup pressure</p></div></div>' +
      '<div class="hb-fresh"><span class="hb-live-dot"></span><b>Auto-refresh · 60 sec</b><small>Orders as of ' + esc(generated) + '</small></div></div>' +
      '<div class="hb-top"><div class="hb-period"><span>' + hbWhenLabel(start) + '</span><b>' + esc(hbWindowLabel(start)) +
      '</b></div><div class="hb-controls">' +
      '<button type="button" class="hb-nav" data-act="hb-prev" ' + (HB.week <= -12 ? 'disabled ' : '') + 'aria-label="Previous week">←</button>' +
      '<button type="button" class="hb-today" data-act="hb-today"' + (HB.week === 0 ? ' disabled' : '') + '>This week</button>' +
      '<button type="button" class="hb-nav" data-act="hb-next" ' + (HB.week >= 26 ? 'disabled ' : '') + 'aria-label="Next week">→</button>' +
      '</div></div>' +
      '<div class="hb-weekstrip" aria-label="Navigate weeks">' + weekCards + '</div>' +
      '<div class="hb-kpis"><div><span>Orders on calendar</span><strong>' + orders.length + '</strong><small>Excludes cancelled orders and quotes</small></div>' +
      '<div><span>Cakes planned</span><strong>' + cakeN + '</strong><small>Item quantities in this week</small></div>' +
      '<div><span>Busiest pickup day</span><strong>' + (busiest.count ? WD[days.indexOf(busiest)] + ' · ' + busiest.count : '—') + '</strong><small>Most scheduled orders</small></div>' +
      '<div><span>Busiest time band</span><strong>' + (peak.count ? esc(peak.label) : '—') + '</strong><small>' + (peak.count ? peak.count + ' orders' : 'No pickup times yet') + '</small></div></div>' +
      '<div class="hb-layout"><div class="hb-main"><div class="hb-section-head"><h3>Pickup load by day</h3><small>Tap a day to inspect orders</small></div>' +
      '<div class="hb-days">' + daysHtml + '</div>' +
      '<div class="hb-legend"><span><i></i>Daily orders relative to the busiest day</span>' +
      (HB.eventsReady ? '<span><i class="hb-key-holiday"></i>Holidays &amp; events shown on dates</span>' : '<span>Loading events…</span>') + '</div>' +
      (HB.eventError ? '<p class="hb-warning">Calendar events could not be loaded; order counts are still current.</p>' : '') +
      '</div><div class="hb-side"><div class="hb-section-head"><h3>Pickup time pressure</h3><small>Number of orders</small></div>' + peakRows +
      (peak.missing ? '<p class="hb-muted">' + peak.missing + ' ' + (peak.missing === 1 ? 'order has' : 'orders have') + ' no pickup time recorded.</p>' : '') +
      '<div class="hb-smallnote">Volume shows concentration, not a capacity warning. Capacity thresholds are not configured.</div></div></div>' +
      '<div class="hb-curve-wrap"><div class="hb-section-head"><div><h3>Booking build-up</h3><small>Cumulative bookings for this pickup week, recorded ahead of pickup</small></div>' +
      '<span class="hb-now">' + (upcomingWeek ? 'Current week' : 'Week view') + '</span></div>' + hbCurve(orders, start) + '</div>' +
      '</section>';
  }
