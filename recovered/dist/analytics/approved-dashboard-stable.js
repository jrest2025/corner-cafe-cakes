/* Corner Cafe Analytics: single-file approved dashboard bootstrap, 19 Oct 2026.
   Uses the APPROVED V3 layout; no two-line beta code, no database writes.
   One external JS asset replaces seven runtime network fetches. */
(function(){
'use strict';
if(window.__ccAnalyticsBootstrapStable)return;
window.__ccAnalyticsBootstrapStable=true;
window.__ccAnalyticsBundleVersion='approved-v3-stable-boot-20261019';
var retries=0,started=false;
function boot(){
 if(started||window.__ccCakeHeartbeatBridge)return;
 var ready=document.getElementById('cc-staff')&&window.supabase&&typeof window.supabase.createClient==='function';
 if(!ready){if(++retries<1200)setTimeout(boot,500);else console.error('[Corner Cafe Analytics] CRM prerequisites unavailable');return;}
 started=true;
 try {
/* Corner Cafe Cake Heartbeat: isolated bridge for the CURRENT hosted staff bundle.
 * It reads staff-authorized dashboard_register data and mounts only when the
 * existing Analytics Overview is visible. The older native-source integration
 * can be used when a full source rebuild becomes the release path again.
 */
(function () {
  'use strict';
  if (window.__ccCakeHeartbeatBridge) return;
  var root = document.getElementById('cc-staff');
  if (!root || !window.supabase || typeof window.supabase.createClient !== 'function') return;
  window.__ccCakeHeartbeatBridge = true;
  var sb = window.supabase.createClient(
    'https://ilbrfwxblhidtlsjgxlh.supabase.co',
    'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E',
    { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } }
  );
  var TZ = 'Pacific/Fiji', WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var DX = { data: null, loading: false, error: '', drills: {} };
  var S = { tab: 'other' };
  var mounting = false, scheduled = false, tick = 0;
  function hbScrollToDay(day, instant) {
    var pane=root.querySelector('[data-hb-scroll]'); if(!pane)return;
    var base=addDays(today(),-HB.daysBehind),delta=daysBetween(base,day);
    pane.scrollTo({left:Math.max(0,delta*98-pane.clientWidth/2+49),behavior:instant?'instant':'smooth'});
  }
  function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function addDays(iso, n) {
    var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10);
  }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  }
  function nice(d, long) {
    if (!d) return '';
    return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB',
      long ? {weekday:'long',day:'numeric',month:'long',timeZone:'UTC'} :
             {day:'numeric',month:'short',timeZone:'UTC'});
  }
  function stamp(d) { try {return new Date(d).toLocaleString('en-GB',{timeZone:TZ,day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});}catch(e){return '';} }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function dxKey(payload) {
    var k = 'hb' + Object.keys(DX.drills).length;
    DX.drills[k] = payload;
    return k;
  }
  function isOverview() {
    // Avoid any injection in orders, customer CRM, calendar or other Analytics modules.
    var card = root.querySelector('.dx-ov');
    if (!card || !root.contains(card)) return false;
    var main = root.querySelector('#ccs-main');
    var screen = main && main.getAttribute('data-screen');
    if (screen && screen !== 'dash') return false;
    if (screen === 'dash') return true;
    var heading = root.querySelector('.ccs-main .ccs-title');
    return !!(heading && heading.textContent.trim() === 'Analytics');
  }
  function message(txt) {
    return '<div class="hb-error" role="status">' + esc(txt) +
      '<button type="button" data-act="dx-hb-retry">Retry</button></div>';
  }
  function view() {
    if (mounting || !isOverview()) return;
    var target = root.querySelector('.dx-ov');
    if (!target || !target.parentNode) return;
    mounting = true;
    try {
      var mount = root.querySelector('#cc-heartbeat');
      if (!mount) {
        mount = document.createElement('div');
        mount.id = 'cc-heartbeat';
        target.parentNode.insertBefore(mount, target);
      }
      DX.drills = {};
      var existingScroll=root.querySelector('[data-hb-scroll]');
      if(existingScroll)HB.railScroll=existingScroll.scrollLeft;
      mount.innerHTML = DX.error ? message(DX.error) : DX.data ? hbView() :
        '<div class="hb-loading" role="status">Loading Cake Heartbeat…</div>';
      mount.classList.toggle('hb-m-ready',!!DX.data&&!DX.error);
      var pane=root.querySelector('[data-hb-scroll]');
      if(pane){if(HB.railScroll!=null)pane.scrollLeft=HB.railScroll;else hbScrollToDay(HB.selected||today(),true);}
    } catch (error) {
      console.error('[Corner Cafe Analytics] Render failed',error);
      var host=root.querySelector('#cc-heartbeat');
      if (host) {
        host.classList.remove('hb-m-ready');
        host.innerHTML=message('The enhanced analytics could not render. Use Retry.');
      }
    } finally { mounting = false; }
  }
  function dashLoad(force) {
    if (DX.loading || (!force && DX.data)) return;
    DX.loading = true; DX.error = '';
    sb.rpc('dashboard_register').then(function (r) {
      if (r.error || !r.data || !r.data.ok || !Array.isArray(r.data.orders)) {
        throw new Error('Could not load the cake register.');
      }
      DX.data = r.data; DX.error = '';
    }).catch(function (error) {
      console.error('[Corner Cafe Analytics] Data request failed',error);
      DX.error = 'Cake Heartbeat is temporarily unavailable. The rest of the CRM is unaffected.';
    }).then(function () {
      DX.loading = false; if (isOverview()) view();
    });
  }

  // Inserted at build time: the shared heartbeat module functions use the
  // bridge variables and the existing Supabase register format.
    // Cake Heartbeat: read-only operational pulse for the Analytics Overview.
  // Source: dashboard_register (deduplicated master register), plus staff-visible calendar tables.
  // These widgets deliberately ignore historical Analytics period filters: they always track pickup dates.
  var HB = { events: [], eventsReady: false, eventError: false, loadingEvents: false, eventsAt: 0, timer: null, selected: null, metric: 'pickup_cakes', mode: 'daily', period: 30, railScroll: null, chartScroll: null, daysBehind: 30, daysAhead: 59 };
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
                  pickupCount: 0, pickupCakes: 0, sales: 0, cumSales: 0, cumOrders: 0, cumCakes: 0, cumValue: 0 };
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
        if (o.sale) days[o.pd].sales += Math.max(0, hbNum(o.net != null ? o.net : value));
      }
    });
    var running = { orders: carry.orders, cakes: carry.cakes, value: carry.value, sales: live.reduce(function(sum,o){return sum+(o.sale&&o.pd&&o.pd<start?Math.max(0,hbNum(o.net!=null?o.net:hbBookedValue(o))):0);},0) };
    rows.forEach(function (r) {
      running.orders += r.orders; running.cakes += r.cakes; running.value += r.value; running.sales += r.sales;
      // Never show an invented future booking progression.
      if (r.day <= t) {
        r.cumOrders = running.orders; r.cumCakes = running.cakes; r.cumValue = running.value; r.cumSales = running.sales;
      } else {
        r.cumOrders = null; r.cumCakes = null; r.cumValue = null; r.cumSales = null;
      }
    });
    return { rows: rows, byDay: days, missing: missing, live: live,
      start: start, end: end, today: t, carry: carry };
  }
  function hbMetric(row) {
    var m = HB.metric;
    return HB.mode === 'cumulative' ?
      (m === 'sales' ? row.cumSales : m === 'value' ? row.cumValue : m === 'cakes' ? row.cumCakes : row.cumOrders) :
      (m === 'sales' ? row.sales : m === 'value' ? row.value : m === 'cakes' ? row.cakes : row.orders);
  }
  function hbMetricLabel() { return HB.metric === 'sales' ? 'Completed sales' : HB.metric === 'value' ? 'Booked value' : HB.metric === 'cakes' ? 'Cakes booked' : 'Orders placed'; }
  function hbMetricFormat(v) { return (HB.metric === 'value' || HB.metric === 'sales') ? hbFjd(v) : String(v == null ? '—' : v); }
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
      '<div class="hb-v2-daystats"><div><span>Completed sales</span><strong>' + hbFjd(r.sales) + '</strong></div>' +
      '<div><span>Orders placed</span><strong>' + r.orders +
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
      lastRead = DX.data.generated_at ? stamp(DX.data.generated_at) : 'the latest refresh',
      salesNow = pastWeek.reduce(function(n,r){return n+r.sales;},0),
      confirmed30 = data.live.filter(function(o){return o.st==='confirmed'&&o.pd>=data.today&&o.pd<addDays(data.today,30);}),
      futureValue = confirmed30.reduce(function(n,o){return n+hbBookedValue(o);},0),
      completed7 = data.live.filter(function(o){return o.sale&&o.pd>addDays(data.today,-7)&&o.pd<=data.today;});
    var cells = data.rows.map(function (r) {
      var dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.day+'T12:00:00Z').getUTCDay()],
        selected = r.day === (HB.selected || data.today), now = r.day === data.today,
        label = hbDateTitle(r.day) + ', ' + r.orders + ' orders booked, ' + r.pickupCount + ' pickups';
      return '<button type="button" class="hb-v2-day' + (selected ? ' is-selected' : '') + (now ? ' is-today' : '') +
       (r.day > data.today ? ' is-future' : '') + '" data-act="dx-hb-day" data-v="' + r.day + '"' +
       (now ? ' data-hb-today="true"' : '') + ' aria-pressed="' + selected + '" aria-label="' + esc(label) + '">' +
       '<span class="hb-v2-date">' + dow + ' <b>' + +r.day.slice(8) + '</b></span>' +
       '<span class="hb-v2-booked"><b>' + hbKTimelineValue(r,'pickup_cakes') +
       '</b><small>cakes due</small></span>' +
       '<span class="hb-v2-value">' + (r.day > data.today ? 'Confirmed' : r.orders + ' booked orders') + '</span>' +
       '<span class="hb-v2-pickup">' + r.pickupCount + ' pickup orders</span>' +
       (hbEventMini(r.day) || '<span class="hb-v2-event-space"></span>') + '</button>';
    }).join('');
    var metricOpts = [['pickup_cakes','Cakes due'],['cakes','Cakes booked'],['orders','Orders'],['value','Booked value'],['sales','Completed value']],
      metricBtns = metricOpts.map(function (x) { return '<button type="button" data-act="dx-hb-metric" data-v="' + x[0] +
        '" aria-pressed="' + (HB.metric === x[0]) + '" class="' + (HB.metric === x[0] ? 'is-on' : '') + '">' + x[1] + '</button>'; }).join('');
    var modeBtns = [['daily','Daily'],['cumulative','Cumulative']].map(function (x) {
      return '<button type="button" data-act="dx-hb-mode" data-v="' + x[0] +
        '" aria-pressed="' + (HB.mode === x[0]) + '" class="' + (HB.mode === x[0] ? 'is-on' : '') + '">' + x[1] + '</button>';
    }).join('');
    return '<section class="hb-v2" aria-label="Cake Heartbeat daily performance">' +
      '<div class="hb-v2-head"><div><h2>Cake performance</h2></div>' +
      '<div class="hb-v2-update"><span class="hb-v2-live"></span> Refreshed ' + esc(lastRead) + ' · refreshes every 60 sec</div></div>' +
      hbMView(data) +
      '<div class="hb-v2-tools"><div class="hb-v2-chart-title"><h3>Daily cake demand</h3></div>' +
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
      '</span><span><i class="hb-v2-key-dot"></i>Future dates show confirmed demand only</span>' +
      (data.missing ? '<span>'+data.missing+' unverified booking dates</span>' : '') +
      (HB.eventError ? '<span>Calendar events temporarily unavailable</span>' : '') + '</div>' +
      '<details class="hb-m-details"><summary>'+esc(hbDateTitle((HB.selected||data.today)))+' · View daily breakdown</summary>'+hbDayDetail(data)+'</details></section>';
  }

  /* Executive visuals: all figures derive from dashboard_register, no placeholder values. */
  function hbMPeriod() { return [7,30,90].indexOf(HB.period) >= 0 ? HB.period : 30; }
  function hbMDateList(end,n) {
    var r=[]; for(var i=n-1;i>=0;i--)r.push(addDays(end,-i)); return r;
  }
  function hbMSales(o) { return o && o.sale && !o.off && /^\d{4}-\d{2}-\d{2}$/.test(o.pd||''); }
  function hbMNet(o) { return Math.max(0,hbNum(o.net!=null?o.net:hbBookedValue(o))); }
  function hbMEmpty() { return '<div class="hb-m-empty">No data</div>'; }
  function hbMCard(title,body,note) {
    return '<section class="hb-m-card" aria-label="'+esc(title)+'"><header><h3>'+esc(title)+'</h3>'+
      (note?'<span class="hb-m-note">'+esc(note)+'</span>':'')+'</header>'+body+'</section>';
  }
  function hbMDelta(now,prior) {
    if(!prior)return '<span class="hb-m-delta hb-m-neutral">No prior baseline</span>';
    var pct=Math.round((now-prior)/prior*100);
    return '<span class="hb-m-delta '+(pct>=0?'hb-m-positive':'hb-m-negative')+'">'+
      (pct>0?'+':'')+pct+'% vs prior period</span>';
  }
  function hbMSpark(values) {
    var high=Math.max.apply(null,[1].concat(values)), count=values.length;
    var points=values.map(function(v,i){return (i*100/Math.max(1,count-1)).toFixed(1)+','+
      (33-v/high*28).toFixed(1);}).join(' ');
    return '<svg class="hb-m-spark" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">'+
      '<polyline points="'+points+'"/></svg>';
  }
  function hbMKpi(label,value,delta,values) {
    return '<div class="hb-m-kpi"><span>'+esc(label)+'</span><strong>'+value+'</strong>'+
      (values&&values.length?hbMSpark(values):'')+(delta||'')+'</div>';
  }
  function hbMBarChart(rows,fmt,fill) {
    if(!rows.length || !rows.some(function(r){return r.v>0;})) return hbMEmpty();
    var max=Math.max.apply(null,rows.map(function(r){return r.v;})), W=680,H=200,baseline=159,plot=132;
    var step=632/rows.length, bw=Math.max(2,Math.min(26,step*.68));
    var grid=[0,.5,1].map(function(f){
      var y=baseline-f*plot;
      return '<line class="hb-m-grid" x1="38" x2="675" y1="'+y+'" y2="'+y+'"/>'+
        '<text class="hb-m-tick" text-anchor="end" x="31" y="'+(y+3)+'">'+
        esc(fmt(max*f))+'</text>';
    }).join('');
    var bars=rows.map(function(r,i){
      var h=r.v/max*plot,x=40+i*step+(step-bw)/2;
      return '<rect x="'+x.toFixed(1)+'" y="'+(baseline-h).toFixed(1)+'" width="'+bw.toFixed(1)+
        '" height="'+Math.max(0,h).toFixed(1)+'" rx="2" fill="'+(fill||'#4b6339')+'"><title>'+
        esc(r.l+': '+fmt(r.v))+'</title></rect>';
    }).join('');
    var xlabels=rows.map(function(r,i){
      if(i!==0 && i!==rows.length-1 && i%Math.max(1,Math.ceil(rows.length/7))!==0)return '';
      return '<text class="hb-m-tick" text-anchor="middle" x="'+(40+i*step+step/2).toFixed(1)+'" y="179">'+esc(r.short||r.l)+'</text>';
    }).join('');
    return '<svg class="hb-m-bars" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Daily trend bar chart">'+
      grid+bars+xlabels+'</svg>';
  }
  function hbMRank(rows) {
    rows=rows.filter(function(r){return r.v>0;});
    if(!rows.length)return hbMEmpty();
    var max=Math.max(1,rows[0].v);
    return '<div class="hb-m-ranks">'+rows.slice(0,6).map(function(r,i){
      return '<div class="hb-m-rank"><div class="hb-m-rank-label" title="'+esc(r.l)+'">'+esc(r.l)+'</div>'+
        '<div class="hb-m-rank-track"><i style="width:'+(r.v/max*100).toFixed(2)+'%"></i></div>'+
        '<strong>'+r.v.toLocaleString('en-US')+'</strong></div>';
    }).join('')+'</div>';
  }
  function hbMDoughnut(rows) {
    if(!rows.length)return hbMEmpty();
    var total=rows.reduce(function(n,r){return n+r.v;},0);
    if(!total)return hbMEmpty();
    if(rows.length>6)rows=rows.slice(0,5).concat([{l:'Other',v:rows.slice(5).reduce(function(n,r){return n+r.v;},0)}]);
    var colors=['#4b6339','#557fa0','#bf9a5c','#9a7b9f','#809a8d','#c77769'];
    var start=0,circ=2*Math.PI*36;
    var ring=rows.slice(0,6).map(function(r,i){
      var portion=r.v/total,segment=portion*circ;
      var el='<circle r="36" cx="50" cy="50" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="15"'+
        ' stroke-dasharray="'+Math.max(0,segment-.8)+' '+circ+'" stroke-dashoffset="'+(-start*circ)+'">'+
        '<title>'+esc(r.l+': '+r.v+' orders')+'</title></circle>';
      start+=portion;return el;
    }).join('');
    var legend=rows.slice(0,6).map(function(r,i){
      return '<div><i style="background:'+colors[i%colors.length]+'"></i><span>'+esc(r.l)+'</span>'+
        '<b>'+Math.round(r.v/total*100)+'%</b></div>';
    }).join('');
    return '<div class="hb-m-donut-wrap"><svg viewBox="0 0 100 100" class="hb-m-donut" role="img" aria-label="Order source proportions">'+
      '<g transform="rotate(-90 50 50)">'+ring+'</g><text x="50" y="48" text-anchor="middle">'+total+'</text>'+
      '<text x="50" y="60" text-anchor="middle" class="hb-m-center-label">orders</text></svg>'+
      '<div class="hb-m-legend">'+legend+'</div></div>';
  }
  function hbMView(data) {
    var p=hbMPeriod(),now=data.today,from=addDays(now,-(p-1)),before=addDays(from,-p),
      prevTo=addDays(from,-1),all=(DX.data.allOrders||DX.data.orders||[]),
      sold=all.filter(function(o){return hbMSales(o)&&o.pd>=from&&o.pd<=now;}),
      prev=all.filter(function(o){return hbMSales(o)&&o.pd>=before&&o.pd<=prevTo;}),
      revenue=sold.reduce(function(n,o){return n+hbMNet(o);},0),
      oldRevenue=prev.reduce(function(n,o){return n+hbMNet(o);},0),
      qty=hbCountCakes(sold),oldQty=hbCountCakes(prev),
      daily=hbMDateList(now,p),totals={},saleCount=sold.length;
    daily.forEach(function(d){totals[d]=0;});
    sold.forEach(function(o){totals[o.pd]+=hbMNet(o);});
    var coming=all.filter(function(o){
      return o.st==='confirmed'&&!o.off&&o.pd>=now&&o.pd<addDays(now,30);
    });
    var committed=coming.reduce(function(n,o){return n+hbBookedValue(o);},0),
      avg=saleCount?revenue/saleCount:0,oldAvg=prev.length?oldRevenue/prev.length:0;
    var kpis='<div class="hb-m-kpis">'+
      hbMKpi('Completed sales · '+p+'d',hbFjd(revenue),hbMDelta(revenue,oldRevenue),daily.map(function(d){return totals[d];}))+
      hbMKpi('Cakes sold · '+p+'d',qty.toLocaleString('en-US'),hbMDelta(qty,oldQty))+
      hbMKpi('Average completed order',saleCount?hbFjd(avg):'—',hbMDelta(avg,oldAvg))+
      hbMKpi('Confirmed · next 30d',hbFjd(committed),
        '<span class="hb-m-delta hb-m-neutral">'+coming.length+' orders due</span>')+'</div>';
    var periodBtns=[7,30,90].map(function(n){
      return '<button type="button" data-act="dx-hb-period" data-v="'+n+'" class="'+(p===n?'is-on':'')+
        '" aria-pressed="'+(p===n)+'">'+n+'d</button>';
    }).join('');
    var pastRows=daily.map(function(d){
      return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:totals[d]};
    });
    var futureDays=hbMDateList(addDays(now,29),30),fqty={};
    futureDays.forEach(function(d){fqty[d]=0;});
    coming.forEach(function(o){
      if(Object.prototype.hasOwnProperty.call(fqty,o.pd)){fqty[o.pd]+=hbCountCakes([o]);}
    });
    var demand=futureDays.map(function(d){return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:fqty[d]};});
    var mix={},chan={},leads=[0,0,0,0,0],leadNames=['0–1 day','2–3 days','4–7 days','8–14 days','15+ days'];
    sold.forEach(function(o){
      (o.it||[]).forEach(function(it){
        var name=String(it[1]||it[0]||'Unspecified cake'),n=Number(it[3])>0?Number(it[3]):1;
        mix[name]=(mix[name]||0)+n;
      });
      var source=String(o.src||'Unknown').replace(/_/g,' ');
      chan[source]=(chan[source]||0)+1;
    });
    all.filter(function(o){return hbActive(o)&&o.pd>=from&&o.pd<=now;}).forEach(function(o){
      var taken=hbOrderDate(o);if(!taken)return;
      var days=daysBetween(taken,o.pd);
      if(days<0)return;
      var idx=days<=1?0:days<=3?1:days<=7?2:days<=14?3:4;leads[idx]++;
    });
    var products=Object.keys(mix).map(function(k){return {l:k,v:mix[k]};}).sort(function(a,b){return b.v-a.v;});
    var sources=Object.keys(chan).map(function(k){return {l:k,v:chan[k]};}).sort(function(a,b){return b.v-a.v;});
    var leadRows=leadNames.map(function(n,i){return {l:n,v:leads[i]};});
    var periodToolbar='<div class="hb-m-header"><h3>Management overview</h3><div class="hb-v2-switch" role="group" aria-label="Reporting period">'+periodBtns+'</div></div>';
    return periodToolbar+kpis+
      '<div class="hb-m-visuals">'+
      hbMCard('Completed sales',''+hbMBarChart(pastRows,hbFjd,'#4b6339'),p+' days · FJD')+
      hbMCard('Confirmed cakes due',hbMBarChart(demand,function(v){return Math.round(v).toString();},'#668fa2'),'Next 30 days')+
      hbMCard('Top cakes',hbMRank(products),'Cakes sold · '+p+'d')+
      hbMCard('Sales by channel',hbMDoughnut(sources),'Completed orders · '+p+'d')+
      hbMCard('Booking lead time',hbMRank(leadRows.map(function(r){return {l:r.l,v:r.v};}).sort(function(a,b){return b.v-a.v;})),'Pickup dates · '+p+'d')+
      '</div>';
  }

/* Corner Cafe Analytics V3
   All KPIs/graphs are derived from the staff-authorized dashboard_register.
   "Recorded" and "confirmed" are never equated with paid or completed sales.
   Installed inside the existing isolated Analytics bridge, not the CRM app bundle.
*/
  HB.metric='pickup_cakes';
  function hbKDay(d){return /^\d{4}-\d{2}-\d{2}$/.test(d||'')?d:'';}
  function hbKQty(o){return hbCountCakes([o]);}
  function hbKLive(o){return hbActive(o);}
  function hbKDue(o,day){return !!(o&&o.pd===day&&hbKLive(o)&& (day<=today()||o.st==='confirmed'));}
  function hbKActiveConfirmed(o){return o&&o.st==='confirmed'&&!o.off;}
  function hbKValue(o){return hbBookedValue(o);}
  function hbKCount(list){return list.reduce(function(n,o){return n+hbKQty(o);},0);}
  function hbKDays(to,n){var days=[];for(var i=n-1;i>=0;i--)days.push(addDays(to,-i));return days;}
  function hbKRows(orders,dates,dayKey,valueFn){var dict={};dates.forEach(function(d){dict[d]=0;});orders.forEach(function(o){var d=dayKey(o);if(Object.prototype.hasOwnProperty.call(dict,d))dict[d]+=valueFn(o);});return dates.map(function(d){return {l:d,short:d.slice(8)+'/'+d.slice(5,7),v:dict[d]};});}
  function hbKLabel(kind){
    return kind==='pickup_cakes'?'Cakes due':kind==='cakes'?'Cakes booked':kind==='orders'?'Orders booked':kind==='value'?'Booked value':'Recorded completed value';
  }
  function hbMetricLabel(){return hbKLabel(HB.metric);}
  function hbMetricFormat(v){return HB.metric==='value'||HB.metric==='sales'?hbFjd(v):String(Math.round(v));}
  function hbKTimelineValue(row,kind){
    if(kind==='pickup_cakes')return row.day>today()?hbKCount(row.pickups.filter(hbKActiveConfirmed)):hbKCount(row.pickups.filter(hbKLive));
    if(kind==='sales')return row.pickups.filter(function(o){return o.st==='completed'&&o.cp==='recorded';}).reduce(function(n,o){return n+hbKValue(o);},0);
    if(kind==='value')return row.value;
    if(kind==='cakes')return row.cakes;
    return row.orders;
  }
  function hbKStats(orders,when,period){
    var start=addDays(when,1-period),prevStart=addDays(start,-period),prevEnd=addDays(start,-1);
    var current=orders.filter(function(o){var d=hbOrderDate(o);return hbKLive(o)&&d&&d>=start&&d<=when;});
    var previous=orders.filter(function(o){var d=hbOrderDate(o);return hbKLive(o)&&d&&d>=prevStart&&d<=prevEnd;});
    var next=orders.filter(function(o){return hbKActiveConfirmed(o)&&o.pd>=when&&o.pd<addDays(when,30);});
    var due=orders.filter(function(o){return hbKLive(o)&&o.pd>=when&&o.pd<addDays(when,30);});
    var completed=orders.filter(function(o){return o.st==='completed'&&o.cp==='recorded'&&o.pd>=start&&o.pd<=when;});
    var unresolved=orders.filter(function(o){return hbKLive(o)&&!hbOrderDate(o);}).length;
    return {start:start,period:period,now:when,current:current,previous:previous,next:next,due:due,completed:completed,unresolved:unresolved};
  }
  function hbKDelta(now,prior,units){
    if(!prior)return '<span class="hb-m-delta hb-m-neutral">'+(now>0?'New vs previous '+esc(units):'No prior-period activity')+'</span>';
    var p=Math.round(100*(now-prior)/prior);
    return '<span class="hb-m-delta '+(p>0?'hb-m-positive':p<0?'hb-m-negative':'hb-m-neutral')+'">'+
      (p>0?'+':'')+p+'% vs previous '+units+'</span>';
  }
  function hbKCard(t,v,meta,type,color){
    return '<article class="hb-k-kpi hb-k-'+color+'"><div class="hb-k-top"><span>'+esc(t)+'</span><i class="hb-k-pip"></i></div>'+
      '<strong>'+v+'</strong><div class="hb-k-caption">'+(meta||'')+'</div></article>';
  }
  function hbKPanel(title,body,note,cls){
    return '<section class="hb-k-panel '+(cls||'')+'"><header><h3>'+esc(title)+'</h3>'+
      (note?'<span>'+esc(note)+'</span>':'')+'</header>'+body+'</section>';
  }
  function hbKRankFrom(items,namer){
    var tally={};items.forEach(function(o){var key=namer(o);if(key){key=String(key).replace(/_/g,' ');tally[key]=(tally[key]||0)+1;}});
    return Object.keys(tally).map(function(k){return {l:k,v:tally[k]};}).sort(function(a,b){return b.v-a.v;});
  }
  function hbKTopCakes(list){
    var tally={};
    list.forEach(function(o){(o.it||[]).forEach(function(item){
      var label=String(item[1]||item[0]||'Cake').trim(),qty=Number(item[3])>0?Number(item[3]):1;
      if(label)tally[label]=(tally[label]||0)+qty;
    });});
    return Object.keys(tally).map(function(n){return {l:n,v:tally[n]};}).sort(function(a,b){return b.v-a.v;});
  }
  function hbKDayRank(orders){
    var names=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],values=[0,0,0,0,0,0,0];
    orders.forEach(function(o){var k=(new Date(o.pd+'T12:00:00Z').getUTCDay()+6)%7;values[k]+=hbKQty(o);});
    return names.map(function(x,i){return {l:x,v:values[i]};});
  }
  function hbKPercent(a,b){return b?Math.round(100*a/b)+'%':'—';}
  function hbKLegend(){
    return '<span class="hb-k-legend"><i></i>Measured cakes &amp; orders from CRM</span>';
  }
  function hbMView(data){
    var p=hbMPeriod(),orders=(DX.data&&DX.data.orders)||[],s=hbKStats(orders,data.today,p),
      cur=s.current,prev=s.previous,up=s.next,du=s.due,
      nowVal=cur.reduce(function(n,o){return n+hbKValue(o);},0),
      pastVal=prev.reduce(function(n,o){return n+hbKValue(o);},0),
      confirmedVal=up.reduce(function(n,o){return n+hbKValue(o);},0),
      bookedCakes=hbKCount(cur),priorCakes=hbKCount(prev),
      prevOrders=prev.length,
      dates=hbKDays(data.today,p),
      dueDates=hbKDays(addDays(data.today,29),30),
      bookedDaily=hbKRows(cur,dates,function(o){return hbOrderDate(o);},function(o){return hbKQty(o);}),
      dueDaily=hbKRows(up,dueDates,function(o){return o.pd;},function(o){return hbKQty(o);}),
      avgDays=cur.map(function(o){return daysBetween(hbOrderDate(o),o.pd);}).filter(function(n){return n>=0&&n<10000;}),
      avgLead=avgDays.length?Math.round(avgDays.reduce(function(a,b){return a+b;},0)/avgDays.length):null,
      topCakes=hbKTopCakes(up.length?up:cur),
      sources=hbKRankFrom(up.length?up:cur,function(o){return o.src||o.sys||'Unknown';}),
      buckets=[0,0,0,0,0],
      oldVerified=cur.length, upcomingOcc=hbKRankFrom(up,function(o){
        var code=o.oc||'not_specified',arr=DX.data.occasions||[],hit=arr.find(function(e){return e.c===code;});
        return hit?hit.l:(code==='not_specified'?'Not specified':code);
      });
    cur.forEach(function(o){var days=daysBetween(hbOrderDate(o),o.pd);if(days<0)return;buckets[days<=1?0:days<=3?1:days<=7?2:days<=14?3:4]++;});
    var periods=[7,30,90].map(function(n){return '<button type="button" data-act="dx-hb-period" data-v="'+n+
      '" class="'+(n===p?'is-on':'')+'" aria-pressed="'+(n===p)+'">'+n+' days</button>';}).join('');
    var kpis='<div class="hb-k-kpis">'+
      hbKCard('Cakes booked',bookedCakes.toLocaleString('en-US'),hbKDelta(bookedCakes,priorCakes,p+' days'),'count','green')+
      hbKCard('Orders received',cur.length.toLocaleString('en-US'),hbKDelta(cur.length,prevOrders,p+' days'),'count','purple')+
      hbKCard('Estimated booking value',hbFjd(nowVal),hbKDelta(nowVal,pastVal,p+' days'),'money','pink')+
      hbKCard('Confirmed cakes due',hbKCount(up).toLocaleString('en-US'),up.length+' confirmed orders · next 30 days','count','blue')+
      hbKCard('Confirmed order value',hbFjd(confirmedVal),'Next 30 days · not yet collected','money','teal')+
      hbKCard('Average lead time',avgLead==null?'—':avgLead+' days',avgLead==null?'No verified booking dates':oldVerified+' bookings · booking to pickup','time','amber')+
      '</div>';
    var lead=['0–1 day','2–3 days','4–7 days','8–14 days','15+ days'].map(function(n,i){return {l:n,v:buckets[i]};}).sort(function(a,b){return b.v-a.v;});
    var group=hbKDayRank(up),pipeline=[
      {l:'Confirmed',v:up.length},
      {l:'Other active',v:Math.max(0,du.length-up.length)}
    ];
    var mixScope=up.length?'Confirmed · next 30 days':'Bookings · selected period';
    var panels='<div class="hb-k-panels">'+
      hbKPanel('Cakes booked by day',hbMBarChart(bookedDaily,function(v){return String(Math.round(v));},'#72a26c'),p+' days · booking date','hb-k-wide')+
      hbKPanel('Cakes due for collection',hbMBarChart(dueDaily,function(v){return String(Math.round(v));},'#6091b7'),'Next 30 days · confirmed orders','hb-k-wide')+
      hbKPanel('Popular cake types',hbMRank(topCakes),mixScope,'')+
      hbKPanel('Booking channels',hbMDoughnut(sources),mixScope,'')+
      hbKPanel('Booking lead time',hbMRank(lead),p+' days · booking to pickup','')+
      hbKPanel('Demand by weekday',hbMBarChart(group,function(v){return String(Math.round(v));},'#a678a9'),'Next 30 days · confirmed cakes','hb-k-half')+
      hbKPanel('Confirmed vs other orders',hbMRank(pipeline),'Next 30 days · active orders','hb-k-half')+
      hbKPanel('Upcoming occasions',hbMRank(upcomingOcc),'Next 30 days · confirmed orders','hb-k-half')+
      '</div>';
    var notices=(!s.completed.length?
      '<span class="hb-k-note">No completed orders recorded in this period · bookings are not counted as sales.</span>':
      '<span class="hb-k-note">'+s.completed.length+' completed orders recorded · not the same as payments collected.</span>')+
      (s.unresolved?'<span class="hb-k-note">'+s.unresolved+' records have unverified booking dates; excluded from bookings-by-date.</span>':'');
    return '<div class="hb-k-heading"><div><h3>Performance snapshot</h3><p>Bookings, cake demand and product trends</p></div>'+
      '<div class="hb-v2-switch" role="group" aria-label="Reporting period">'+periods+'</div></div>'+
      kpis+panels+'<div class="hb-k-notices">'+notices+'</div>';
  }
  function hbChart(data){
    // Cakes due has past recorded schedules and future confirmed schedules.
    // A different line style prevents a future schedule being mistaken for an achieved sale.
    var rows=data.rows,kind=HB.metric,step=98,w=rows.length*step,bottom=160,top=22,now=data.today;
    var vals=rows.map(function(r){return hbKTimelineValue(r,kind);});
    if(HB.mode==='cumulative'){
      var total=0;vals=vals.map(function(v,i){if(kind!=='pickup_cakes'&&rows[i].day>now)return null;total+=v;return total;});
    }else if(kind!=='pickup_cakes')vals=vals.map(function(v,i){return rows[i].day>now?null:v;});
    var observed=vals.filter(function(v){return v!=null;}),maximum=Math.max(1,Math.max.apply(null,observed));
    var y=function(v){return bottom-(v/maximum)*(bottom-top);};
    var line=function(test){var dataSet=[],started=false;rows.forEach(function(r,i){var v=vals[i];if(v==null||!test(r,i)){started=false;return;}dataSet.push((started?'L':'M')+(i*step+step/2)+' '+y(v).toFixed(1));started=true;});return dataSet.join(' ');};
    var past=line(function(r){return r.day<=now;}),future=line(function(r,i){return kind==='pickup_cakes'&&r.day>=now;});
    var grid=[0,.5,1].map(function(f){
      var v=Math.round(maximum*f*10)/10,yy=y(maximum*f);
      return '<line x1="0" x2="'+w+'" y1="'+yy+'" y2="'+yy+'" class="hb-v2-grid"/>'+
        '<text x="6" y="'+(yy-6)+'" class="hb-k-axis">'+(kind==='value'||kind==='sales'?hbFjd(v):v)+'</text>';
    }).join('');
    var marks=rows.map(function(r,i){var v=vals[i],cx=i*step+step/2,selected=(HB.selected||now)===r.day;
      var tooltip=hbDateTitle(r.day)+': '+(v==null?'Not yet recorded':hbMetricFormat(v))+
        ' · '+r.cakes+' cakes booked · '+hbKTimelineValue(r,'pickup_cakes')+' cakes due';
      var dot=v==null?'':'<circle cx="'+cx+'" cy="'+y(v).toFixed(1)+'" r="'+(selected?5:3.5)+'" class="'+
        (r.day>now?'hb-k-dot-future':'hb-v2-dot')+'"><title>'+esc(tooltip)+'</title></circle>';
      return (selected?'<rect x="'+(i*step+2)+'" y="3" width="'+(step-4)+'" height="'+(bottom+6)+'" rx="8" class="hb-v2-focus"/>':'')+
        (r.day===now?'<line x1="'+cx+'" x2="'+cx+'" y1="10" y2="'+bottom+'" class="hb-v2-now"/>':'')+
        dot+'<text x="'+cx+'" y="186" text-anchor="middle" class="hb-v2-axis-label">'+
        (+r.day.slice(8))+' '+esc(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+r.day.slice(5,7)-1])+'</text>';
    }).join('');
    return '<svg class="hb-v2-chart-svg hb-k-curve" viewBox="0 0 '+w+' 192" width="'+w+'" height="192" role="img" aria-label="'+
      esc(hbKLabel(kind)+' per day. Solid: recorded dates. Dashed: upcoming confirmed demand.')+'">'+grid+
      (past?'<path d="'+past+'" class="hb-k-line"/>':'')+
      (future?'<path d="'+future+'" class="hb-k-line-future"/>':'')+marks+'</svg>';
  }


  function tickObserver() {
    if (scheduled || mounting) return;
    scheduled = true;
    Promise.resolve().then(function () {
      scheduled = false;
      var visible = isOverview();
      S.tab = visible ? 'dash' : 'other';
      if (!visible) return;
      if (!DX.data && !DX.loading && !DX.error) dashLoad(false);
      if (!root.querySelector('#cc-heartbeat')) view();
      if (!tick) { tick = 1; hbStart(); }
    });
  }
  var observer = new MutationObserver(tickObserver);
  observer.observe(root,{childList:true,subtree:true});
  root.addEventListener('click',function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#cc-heartbeat [data-act]') : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var a = b.getAttribute('data-act'), v = b.getAttribute('data-v');
    if (a === 'dx-hb-prev' || a === 'dx-hb-next') {
      var p=root.querySelector('[data-hb-scroll]');
      if(p)p.scrollBy({left:a === 'dx-hb-prev'?-686:686,behavior:'smooth'});
    }
    else if (a === 'dx-hb-today') { HB.selected=today(); HB.railScroll=null; view(); hbScrollToDay(today(),false); }
    else if (a === 'dx-hb-day') { HB.selected=v; view(); }
    else if (a === 'dx-hb-metric' && ['pickup_cakes','orders','cakes','value','sales'].indexOf(v)>-1) { HB.metric=v; view(); }
    else if (a === 'dx-hb-period' && ['7','30','90'].indexOf(v)>-1) { HB.period=Number(v); view(); }
    else if (a === 'dx-hb-mode' && ['daily','cumulative'].indexOf(v)>-1) { HB.mode=v; view(); }
    else if (a === 'dx-hb-retry') dashLoad(true);
    else if (a === 'dx-drill') {
      var d = DX.drills[v];
      if (!d || !Array.isArray(d.l)) return;
      var host = root.querySelector('#cc-heartbeat'), old = host && host.querySelector('.hb-detail');
      if (old) old.remove();
      if (!host) return;
      var panel = document.createElement('section'); panel.className = 'hb-detail';
      panel.setAttribute('aria-label','Pickup orders');
      panel.innerHTML = '<div class="hb-detail-head"><h3>' + esc(d.t) + '</h3><button type="button" data-act="dx-hb-close" aria-label="Close pickup details">×</button></div>' +
        '<ul>' + d.l.slice(0,80).map(function (o) {
          return '<li><b>' + esc(o.r || 'Cake order') + '</b><span>' +
            esc(o.pt ? String(o.pt).slice(0,5) : 'Time not recorded') + '</span></li>';
        }).join('') + '</ul>';
      host.appendChild(panel);
    } else if (a === 'dx-hb-close') {
      var panel = root.querySelector('#cc-heartbeat .hb-detail');
      if (panel) panel.remove();
    }
  }, true);
  tickObserver();
})();

 }catch(err){
  started=false;window.__ccCakeHeartbeatBridge=false;
  console.error('[Corner Cafe Analytics] Startup failed',err);
  if(++retries<5)setTimeout(boot,1200);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();