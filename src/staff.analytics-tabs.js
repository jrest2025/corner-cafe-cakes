/* Corner Cafe Analytics: one page per tab, every tab the same shape (20 October 2026, approved by Roneel).
 *
 * Tabs: Overview (the Cake Heartbeat, untouched) · Cake sales · Cakes · Customers · Occasions · Marketing · Planning · Data.
 * Marketing is drawn by src/staff.campaigns.js through register() (20 October 2026). Café sales and Website stay hidden
 * until their data arrives (unchanged).
 *
 * Each page: four headline figures, one main chart, small charts, "What to do" cards from the insight engine, and a
 * closed Details section that holds every table and explanation the old sub-tabs showed, so nothing is lost.
 *
 * Called from inside the staff app's Analytics view (see build/staff_analytics_tabs.py), which hands over the figures it
 * has already worked out with its own rules (completed sales, values, VAT, filters) plus its section HTML. Period figures
 * count from the launch on 13 October 2026 (Roneel's rule). Pattern charts, marked "All years", also use the older
 * sheet orders (Roneel, 20 October 2026). If anything here fails, the app shows its previous layout instead.
 */
(function (global) {
  'use strict';
  if (global.CCAnalyticsTabs) return;
  var VERSION = '2026-10-20-purpose-v1';
  var INFO = {
    sl: ['Cake sales', 'What did we sell, and what is it worth?'],
    pd: ['Cakes', 'What are people buying?'],
    cu: ['Customers', 'Who orders, and who comes back?'],
    sd: ['Occasions', 'When do occasion orders come in?'],
    mk: ['Marketing', 'Which promotions bring in cake orders?'],
    pl: ['Planning', 'What is coming up, and are we ready?'],
    da: ['Data', 'Is the data complete?']
  };
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var PAL = ['#5d9164', '#955ca1', '#548fc0', '#cd9c33', '#d34d8b'], OTHER = '#b5bac1';
  var last = null;

  // ---------- small helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function pl(n, one, many) { return n === 1 ? one : many || one + 's'; }
  function dayOf(iso) { return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7; }
  function short(iso) { var d = new Date(iso + 'T12:00:00Z'); return WD[dayOf(iso)] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function dm(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function time12(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return ''; var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM'); }
  function iso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
  function find(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i][0] === id) return list[i]; return null; }
  // Facts about any register record, worked out the way the app does it, without changing the record
  function facts(o) {
    var c = 0; (o.it || []).forEach(function (i) { c += num(i[3]) || 1; });
    return { sale: o.cp === 'recorded' || o.cp === 'assumed', off: o.st === 'cancelled', net: num(o.cv != null ? o.cv : o.lv) - num(o.ref), cakes: c };
  }
  function allOf(x) { return (x.data.allOrders || x.data.orders || []).filter(function (o) { return o && x.match(o); }); }
  function valueAll(x, o) { return x.f.prod === 'all' ? facts(o).net : x.items(o).reduce(function (s, i) { return s + num(i[4]) * (num(i[3]) || 1); }, 0); }
  function cakesAll(x, o) { return x.items(o).reduce(function (s, i) { return s + (num(i[3]) || 1); }, 0); }
  function group(list, keys) {
    var g = {};
    list.forEach(function (o) { keys(o).forEach(function (k) { var e = g[k[0]] = g[k[0]] || { l: k[0], q: 0, v: 0, list: [] }; e.q += k[1]; e.v += k[2]; if (e.list.indexOf(o) < 0) e.list.push(o); }); });
    return Object.keys(g).map(function (k) { return g[k]; });
  }
  function delta(x, cur, prev) {
    if (prev == null || !x.ps) return null;
    if (!prev) return cur ? { t: 'New', c: 'up' } : { t: 'No change', c: 'flat' };
    var p = Math.round((cur - prev) / prev * 100);
    return { t: (p > 0 ? 'Up ' + p + '%' : p < 0 ? 'Down ' + (-p) + '%' : 'No change') + ' on the ' + x.r.cmp, c: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' };
  }

  // ---------- building blocks ----------
  function tap(x, list, title, inner, cls) {
    return list && list.length ? '<button type="button" class="' + cls + ' cat-tap dx-tap" data-act="dx-drill" data-v="' + x.key({ t: title, l: list }) + '">' + inner + '</button>' : '<div class="' + cls + '">' + inner + '</div>';
  }
  function kpi(x, tone, label, value, cap, list, title, d) {
    var words = /[A-Za-z]{3,}/.test(String(value)) && String(value).length > 9;
    return tap(x, list, title, '<span class="cat-k-top"><span>' + esc(label) + '</span><i></i></span><strong' + (words ? ' class="is-words" title="' + esc(value) + '"' : '') + '>' + esc(value) + '</strong>' +
      (d ? '<span class="cat-k-d is-' + d.c + '">' + esc(d.t) + '</span>' : '') + '<span class="cat-k-cap">' + esc(cap) + '</span>', 'cat-k cat-' + tone);
  }
  // Each instrument states the decision it supports; definitions stay beside the figures.
  var PURPOSE = {
    'Sales by channel': 'See which ordering channels contribute sales before choosing where to focus promotion.',
    'Busiest pickup days': 'Use the historical pattern to plan staffing; check upcoming bookings before committing.',
    'Money': 'Follow up unpaid orders, starting with balances past the pickup date.',
    'Cakes ranked': 'Use demand to guide cake range and production planning.',
    'Sizes': 'Plan cake sizes and packaging around recorded demand.',
    'Flavours': 'See which flavours customers choose when planning the range.',
    'Favourite cake by occasion': 'Use past occasion preferences to shape the next offer.',
    'How often customers come back': 'Understand repeat buying before planning customer follow-ups.',
    'New and returning': 'Check whether sales are bringing in new buyers or previous customers.',
    'How they ordered': 'Choose where to make ordering easier for customers.',
    'Top customers': 'Identify customer relationships worth reviewing for personal follow-up.',
    'Cakes per week': 'Plan ingredients and staffing around booked demand, not a forecast.',
    'Largest orders': 'Review larger orders early for preparation and coordination.',
    'Order stages': 'See which orders need confirmation or progress checks.',
    'When cakes are collected': 'Use pickup patterns to plan counter cover.'
  };
  function card(title, note, body, cls, allYears) {
    return '<section class="cat-card' + (cls ? ' ' + cls : '') + '" aria-label="' + esc(title) + '"><header><h3>' + esc(title) + '</h3>' +
      (allYears ? '<span class="cat-all">All years</span>' : note ? '<span>' + esc(note) + '</span>' : '') + '</header>' + body +
      (allYears && note ? '<p class="cat-foot">' + esc(note) + '</p>' : '') +
      (PURPOSE[title] || /^Sales by (day|week|month)$/.test(title) ? '<p class="cat-purpose"><b>Use this to</b> ' + esc(PURPOSE[title] || 'Track completed sales over time; compare equivalent periods before judging performance.') + '</p>' : '') + '</section>';
  }
  function none(t) { return '<p class="cat-none">' + esc(t) + '</p>'; }
  // Columns: rows {l, sub, v, v2, list, t}; v2 is a lighter second part stacked on top (for example "not confirmed")
  function cols(x, rows, fmt, peakWord, legend) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v + (r.v2 || 0)); }, 0);
    if (!max) return null;
    var top = rows.reduce(function (m, r) { return Math.max(m, r.v + (r.v2 || 0)); }, 0), tops = rows.filter(function (r) { return r.v + (r.v2 || 0) === top; });
    return '<div class="cat-cols" style="grid-template-columns:repeat(' + rows.length + ',minmax(0,1fr))">' + rows.map(function (r) {
      var all = r.v + (r.v2 || 0), h = Math.round(all / max * 100), h2 = all ? Math.round((r.v2 || 0) / all * 100) : 0;
      return tap(x, r.list, r.t || r.l, '<span class="cat-cv">' + esc(all ? fmt(all) : '0') + '</span><span class="cat-ct"><span class="cat-cb" style="height:' + Math.max(all ? 4 : 0, h) + '%">' +
        (r.v2 ? '<i class="cat-c2" style="height:' + h2 + '%"></i>' : '') + '</span></span><span class="cat-cl">' + esc(r.l) + (r.sub ? '<em>' + esc(r.sub) + '</em>' : '') + '</span>',
      'cat-col' + (all === top && tops.length < rows.length ? ' is-top' : '') + (r.now ? ' is-now' : ''));
    }).join('') + '</div>' + (peakWord && tops.length < rows.length ? '<p class="cat-peak"><i></i><span>' + esc(peakWord) + ': <b>' + esc(tops.map(function (r) { return r.full || r.l; }).join(', ')) + '</b>, ' + esc(fmt(top)) + (tops.length > 1 ? ' each' : '') + '</span></p>' : '') +
      (legend || '');
  }
  // Ranked bars: rows {l, v, list, t, txt}
  function bars(x, rows, fmt, tone) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
    return '<div class="cat-bars' + (tone ? ' cat-t-' + tone : '') + '">' + rows.map(function (r) {
      return tap(x, r.list, r.t || r.l, '<span class="cat-bl" title="' + esc(r.l) + '">' + esc(r.l) + '</span><span class="cat-bt"><i style="width:' + Math.max(r.v ? 3 : 0, Math.round(r.v / max * 100)) + '%"></i></span><b>' + esc(r.txt || fmt(r.v)) + '</b>', 'cat-br');
    }).join('') + '</div>';
  }
  function fold(rows, n) {
    rows = rows.filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    if (rows.length <= n) return rows;
    var rest = rows.slice(n - 1), o = { l: 'Other', v: 0, list: [], other: true };
    rest.forEach(function (r) { o.v += r.v; o.list = o.list.concat(r.list || []); });
    return rows.slice(0, n - 1).concat([o]);
  }
  function donut(x, title, rows, fmt, mid) {
    rows = fold(rows, 5);
    var tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    if (!tot) return null;
    var R = 42, C = 2 * Math.PI * R, at = 0, gap = rows.length > 1 ? 1.4 : 0, col = function (r, i) { return r.other ? OTHER : PAL[i % PAL.length]; };
    var arcs = rows.map(function (r, i) {
      var len = r.v / tot * C, d = Math.max(len - gap, 0.6), s = '<circle r="' + R + '" cx="60" cy="60" fill="none" stroke="' + col(r, i) + '" stroke-width="15" stroke-dasharray="' + d.toFixed(2) + ' ' + (C - d).toFixed(2) + '" stroke-dashoffset="' + (-at).toFixed(2) + '"></circle>';
      at += len; return s;
    }).join('');
    return '<div class="cat-donut"><svg viewBox="0 0 120 120" role="img" aria-label="' + esc(title + ': ' + rows.map(function (r) { return r.l + ' ' + Math.round(r.v / tot * 100) + '%'; }).join(', ')) + '"><g transform="rotate(-90 60 60)">' + arcs + '</g>' +
      '<text x="60" y="58" text-anchor="middle" class="cat-dv">' + esc(fmt(tot)) + '</text><text x="60" y="74" text-anchor="middle" class="cat-dl">' + esc(mid || 'total') + '</text></svg><div class="cat-leg">' +
      rows.map(function (r, i) { return tap(x, r.list, title + ': ' + r.l, '<i style="background:' + col(r, i) + '"></i><span>' + esc(r.l) + '</span><b>' + esc(fmt(r.v)) + '<em>' + Math.round(r.v / tot * 100) + '%</em></b>', 'cat-lr'); }).join('') + '</div></div>';
  }
  function split(x, title, parts) {
    var tot = parts.reduce(function (s, p) { return s + p.v; }, 0);
    if (!tot) return null;
    return '<div class="cat-split"><div class="cat-sb" role="img" aria-label="' + esc(parts.map(function (p) { return p.l + ' ' + Math.round(p.v / tot * 100) + '%'; }).join(', ')) + '">' +
      parts.map(function (p, i) { return '<i style="width:' + (p.v / tot * 100).toFixed(2) + '%;background:' + PAL[i === 0 ? 2 : 1] + '"></i>'; }).join('') + '</div><div class="cat-leg">' +
      parts.map(function (p, i) { return tap(x, p.list, title + ': ' + p.l, '<i style="background:' + PAL[i === 0 ? 2 : 1] + '"></i><span>' + esc(p.l) + '</span><b>' + esc(String(p.v)) + '<em>' + Math.round(p.v / tot * 100) + '%</em></b>', 'cat-lr'); }).join('') + '</div></div>';
  }
  function tidy(html) {
    return String(html || '').replace(/<p class="dx-ch">((?:(?!<\/p>)[\s\S]){90,}?)<\/p>/g, function (m, t) { return '<details class="an-how"><summary>How this is counted</summary><p>' + t + '</p></details>'; });
  }

  // ---------- page frame ----------
  function modBar(cur, x) {
    return '<nav class="an-mods" aria-label="Analytics modules">' + x.mods.map(function (m) {
      var need = x.state(m) === 'missing';
      return '<button type="button" class="an-mod' + (need ? ' is-need' : '') + '" data-act="secgo" data-g="anm" data-v="' + esc(m.id) + '" aria-current="' + (m.id === cur ? 'page' : 'false') + '">' + esc(m.name) + (need ? '<span class="an-need">No data</span>' : '') + '</button>';
    }).join('') + '</nav>';
  }
  function tools(x) {
    var f = x.f, t = x.today(), seven = f.p === 'c' && f.to === t && f.from === x.addDays(t, -6);
    var chips = [['all', x.st.showOld ? 'All time' : 'Since launch'], ['7', '7 days'], ['d30', '30 days'], ['3m', '90 days']];
    var more = (f.prod !== 'all' ? 1 : 0) + (f.ch !== 'all' ? 1 : 0) + (f.occ && f.occ !== 'all' ? 1 : 0) + (f.b === 'o' ? 1 : 0);
    var filt = String(x.filt || '').replace(/(<button[^>]*dx-ftoggle[^>]*>)[\s\S]*?(<\/button>)/, '$1More filters' + (more ? ' · ' + more + ' on' : '') + '$2');
    return '<div class="cat-tools"><div class="cat-chips" role="group" aria-label="Period">' + chips.map(function (c) {
      var on = c[0] === '7' ? seven : f.p === c[0];
      return '<button type="button" class="cat-chip" data-cat-p="' + c[0] + '" aria-pressed="' + on + '">' + c[1] + '</button>';
    }).join('') + '</div>' + filt + '</div>' + (x.period || '') + (x.gap || '');
  }
  function details(mod, x, ids) {
    var items = ids.map(function (id) {
      var s = find(x.secs, id);
      if (!s || !s[3] || s[3] === 'x') return '';
      var key = 'cat' + mod + id;
      return '<details class="cat-sub" data-dxsec="' + key + '"' + (x.st['o' + key] ? ' open' : '') + '><summary><span>' + esc(s[1]) + '</span>' + (s[2] ? '<em>' + s[2] + '</em>' : '') + '</summary>' +
        '<div class="cat-sub-b dx-secbody">' + tidy(s[3]) + '</div></details>';
    }).join('');
    if (!items) return '';
    var key = 'cat' + mod;
    return '<details class="cat-more" data-dxsec="' + key + '"' + (x.st['o' + key] ? ' open' : '') + '><summary><b>Details</b><span>Tables, how the figures are counted, and downloads</span></summary><div class="cat-more-b">' + items + '</div></details>';
  }
  function frame(mod, x, p) {
    return '<section class="cat-page" data-cat="' + mod + '"><header class="cat-title"><h2>' + esc(INFO[mod][0]) + '</h2><p>' + esc(INFO[mod][1]) + '</p></header>' +
      (p.tools || '') + (p.note || '') +
      (p.kpis ? '<div class="cat-kpis">' + p.kpis.join('') + '</div>' : '') + (p.after || '') +
      (p.todo ? '<section class="cat-todo" data-cat-todo="' + p.todo.join(',') + '" aria-label="What to do" hidden></section>' : '') + (p.todoHtml || '') +
      (p.main || '') +
      (p.side && p.side.filter(Boolean).length ? '<div class="cat-row cat-n' + p.side.filter(Boolean).length + '">' + p.side.filter(Boolean).join('') + '</div>' : '') +
      (p.body || '') +
      (p.moreHtml != null ? p.moreHtml : details(mod, x, p.details || [])) + '</section>';
  }

  // ---------- period buckets for the main trend ----------
  function buckets(x) {
    var r = x.r, t = x.today(), from = r.from, to = r.to > t ? t : r.to;
    if (r.all) {
      from = x.launch;
      if (x.st.showOld) x.cur.forEach(function (o) { var d = x.dateOf(o); if (d && d < from) from = d; });
    }
    if (from > to) from = to;
    var days = x.days(from, to) + 1, out = [], a, b;
    var unit = days <= 31 ? 'd' : days <= 200 ? 'w' : 'm';
    if (unit === 'd') for (a = from; a <= to; a = x.addDays(a, 1)) out.push({ a: a, b: a, l: WD[dayOf(a)], sub: dm(a), full: short(a), now: a === t });
    else if (unit === 'w') for (a = x.addDays(from, -dayOf(from)); a <= to; a = x.addDays(a, 7)) { b = x.addDays(a, 6); out.push({ a: a < from ? from : a, b: b > to ? to : b, l: dm(a), full: 'Week of ' + dm(a), now: t >= a && t <= b }); }
    else {
      a = from.slice(0, 7) + '-01';
      while (a <= to) {
        var y = +a.slice(0, 4), m = +a.slice(5, 7);
        b = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        out.push({ a: a < from ? from : a, b: b > to ? to : b, l: MON[m - 1], sub: String(y), full: MON[m - 1] + ' ' + y, now: t >= a && t <= b });
        a = (m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0')) + '-01';
      }
    }
    out.unit = unit; return out;
  }

  // ---------- Cake sales ----------
  function salesPage(x) {
    var cs = x.cs, ps = x.ps, cur = x.cur, owing = x.owing, owed = x.owed(owing), t = x.today();
    var kpis = [
      kpi(x, 'green', 'Net cake sales', x.money(cs.v), 'Including VAT · ' + x.money(x.exVat(cur)) + ' without VAT', cur, 'Completed sales', ps && delta(x, cs.v, ps.v)),
      kpi(x, 'purple', 'Completed orders', x.num(cs.n), x.num(cs.c) + pl(cs.c, ' cake', ' cakes'), cur, 'Completed sales', ps && delta(x, cs.n, ps.n)),
      kpi(x, 'blue', 'Average order', cs.n ? x.money(cs.aov) : 'None yet', ps && ps.n ? 'Was ' + x.money(ps.aov) + ' in the ' + x.r.cmp : 'Per completed order', cur, 'Completed sales'),
      kpi(x, 'amber', 'Still owed', x.money(owed), owing.length ? x.num(owing.length) + pl(owing.length, ' order owes', ' orders owe') + ' money · as of today' : 'Nothing owed · as of today', owing, 'Orders with money still owed')
    ];
    var bk = buckets(x), rows = bk.map(function (b) {
      var list = cur.filter(function (o) { var d = x.dateOf(o); return d && d >= b.a && d <= b.b; });
      return { l: b.l, sub: b.sub, full: b.full, now: b.now, v: list.reduce(function (s, o) { return s + x.value(o); }, 0), list: list, t: b.full + ' sales' };
    });
    var unitWord = bk.unit === 'd' ? 'day' : bk.unit === 'w' ? 'week' : 'month';
    var trend = cols(x, rows, x.money, 'Best ' + unitWord);
    var main = card('Sales by ' + unitWord, 'Completed sales only. Bookings count once collected.', trend || none('No completed sales in this period yet.'), 'cat-main');
    var ch = donut(x, 'Sales by channel', group(cur, function (o) { return [[x.src[o.src] || o.src || 'Not recorded', 1, x.value(o)]]; }).map(function (g) { return { l: g.l, v: g.v, list: g.list }; }), x.money, 'sales');
    var hist = allOf(x).filter(function (o) { var f = facts(o); return f.sale && iso(o.pd); });
    var wk = WD.map(function (d, i) { var list = hist.filter(function (o) { return dayOf(o.pd) === i; }); return { l: d, full: WDF[i], v: list.reduce(function (s, o) { return s + cakesAll(x, o); }, 0), list: list, t: WDF[i] + ' pickups, all years' }; });
    var paid = 0, refunded = 0, paidList = [];
    x.data.orders.forEach(function (o) {
      if (!x.match(o)) return; var g = 0;
      (o.pay || []).forEach(function (p) { if (!(p[2] >= x.r.from && p[2] <= x.r.to)) return; if (p[0] === 'refund') refunded += num(p[1]); else if (p[0] !== 'adjustment') g += num(p[1]); });
      if (g) { paid += g; paidList.push(o); }
    });
    var late = owing.filter(function (o) { return o.pd && o.pd < t; });
    var money = '<div class="cat-money">' + [
      { l: 'Payments collected', v: paid, list: paidList, t: 'Payments taken in this period', note: 'Selected period · before refunds' },
      { l: 'Total still owed', v: owed, list: owing, t: 'Orders with money still owed', note: 'Outstanding as of today' },
      { l: 'Of that, past pickup', v: x.owed(late), list: late, t: 'Still owed after the pickup date', note: 'Included in total still owed' }
    ].map(function (r) { return tap(x, r.list, r.t, '<span><b>' + esc(r.l) + '</b><small>' + esc(r.note) + '</small></span><strong>' + esc(x.money(r.v)) + '</strong>', 'cat-money-row'); }).join('') + '</div>';
    var side = [
      card('Sales by channel', 'Completed sales', ch || none('No completed sales in this period yet.')),
      card('Busiest pickup days', 'Cakes collected by day of the week, including sheet orders.', cols(x, wk, x.num, 'Busiest') || none('No pickups on record yet.'), '', true),
      card('Money', 'Payments taken in this period; owed as of today', money + (refunded ? '<p class="cat-foot">Refunds in this period: ' + esc(x.money(refunded)) + '.</p>' : ''))
    ];
    var note = '<p class="cat-flag">Gross profit appears once cake costs are added. <button type="button" class="ccs-link" data-act="dx-bi-go" data-v="dr">See what is needed</button></p>';
    return frame('sl', x, { tools: tools(x), kpis: kpis, after: note, main: main, side: side, todo: ['balance', 'unpriced', 'pace'], details: ['sa', 'pf', 'fi'] });
  }

  // ---------- Cakes ----------
  function cakesPage(x) {
    var cur = x.cur, item = function (fn) { return group(cur, function (o) { return x.items(o).map(function (i) { var q = num(i[3]) || 1; return [fn(i), q, num(i[4]) * q]; }); }); };
    var ck = item(function (i) { return i[0] || 'Not recorded'; }).sort(function (a, b) { return b.q - a.q || b.v - a.v; });
    var sz = item(function (i) { return i[2] ? i[2] + ' inch' : 'Custom size'; }).sort(function (a, b) { return b.q - a.q; });
    var fl = item(function (i) { return i[1] || i[0] || 'Not recorded'; }).sort(function (a, b) { return b.q - a.q || b.v - a.v; });
    var total = ck.reduce(function (s, g) { return s + g.q; }, 0);
    // Slow sellers: cakes on sale that took under 8% of cakes sold (the same rule as the Products table)
    var sold = {}; ck.forEach(function (g) { sold[g.l] = g.q; });
    var menu = (x.data.products || []).filter(function (p) { return p && p.on && p.n; });
    var slow = menu.map(function (p) { return { l: p.n, q: sold[p.n] || 0 }; }).filter(function (p) { return p.q / (total || 1) < 0.08; }).sort(function (a, b) { return a.q - b.q; });
    var top = ck[0], tz = sz.filter(function (g) { return g.l !== 'Custom size'; })[0];
    var kpis = [
      kpi(x, 'green', 'Cakes sold', x.num(total), x.num(x.cs.n) + pl(x.cs.n, ' completed order', ' completed orders'), cur, 'Completed sales'),
      kpi(x, 'purple', 'Top cake', top ? top.l : 'None yet', top ? Math.round(top.q / total * 100) + '% of cakes · ' + x.num(top.q) + pl(top.q, ' cake', ' cakes') : 'No completed sales yet', top ? top.list : null, top ? top.l + ' sales' : ''),
      kpi(x, 'blue', 'Most popular size', tz ? tz.l : 'None yet', tz ? x.num(tz.q) + ' of ' + x.num(total) + ' cakes' : 'No sizes recorded yet', tz ? tz.list : null, tz ? tz.l + ' cakes' : ''),
      kpi(x, 'amber', 'Low sales share', menu.length && total ? x.num(slow.length) : '—', !menu.length ? 'Menu list not available' : !total ? 'No completed sales in this period to assess' : slow.length ? 'Under 8% of cakes: ' + slow.slice(0, 2).map(function (p) { return p.l; }).join(', ') + (slow.length > 2 ? ' and ' + (slow.length - 2) + ' more' : '') : 'Every cake on sale took 8% or more', null, '')
    ];
    var rank = ck.slice(0, 10).map(function (g) { return { l: g.l, v: g.q, list: g.list, t: g.l + ' sales', txt: x.num(g.q) + ' · ' + x.money(g.v) }; });
    var main = card('Cakes ranked', 'Cakes sold, with their sales value', rank.length ? bars(x, rank, x.num, 'green') : none('No completed sales in this period yet.'), 'cat-main');
    // Favourite cake for each occasion, from every year on record
    var hist = allOf(x).filter(function (o) { return !facts(o).off && o.oc && o.oc !== 'not_specified'; }), byOcc = {};
    hist.forEach(function (o) { (byOcc[o.oc] = byOcc[o.oc] || []).push(o); });
    var fav = Object.keys(byOcc).map(function (k) {
      var list = byOcc[k], g = group(list, function (o) { return x.items(o).map(function (i) { return [i[0] || 'Not recorded', num(i[3]) || 1, 0]; }); }).sort(function (a, b) { return b.q - a.q; });
      var n = g.reduce(function (s, e) { return s + e.q; }, 0);
      return g[0] && list.length >= 5 ? { o: x.occName(k), c: g[0].l, p: Math.round(g[0].q / n * 100), list: g[0].list, n: list.length } : null;
    }).filter(Boolean).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    var favList = '<div class="cat-fav">' + fav.map(function (f) {
      return tap(x, f.list, f.o + ' orders with ' + f.c, '<span class="cat-fo"><b>' + esc(f.o) + '</b><span>' + esc(f.c) + '</span></span><span class="cat-fp"><b>' + f.p + '%</b><em>of cakes · ' + x.num(f.n) + ' orders</em></span>', 'cat-fr');
    }).join('') + '</div>';
    var side = [
      card('Sizes', 'Cakes sold', donut(x, 'Sizes', sz.map(function (g) { return { l: g.l, v: g.q, list: g.list }; }), x.num, 'cakes') || none('No completed sales in this period yet.')),
      card('Flavours', 'Top 8 by cakes sold', fl.length ? bars(x, fl.slice(0, 8).map(function (g) { return { l: g.l, v: g.q, list: g.list, t: g.l + ' sales' }; }), x.num, 'purple') : none('No completed sales in this period yet.')),
      card('Favourite cake by occasion', 'The most chosen cake for each occasion, as a share of that occasion’s cakes. Every year on record, including sheet orders; occasions with 5 orders or more.', fav.length ? favList : none('Not enough occasion orders yet.'), '', true)
    ];
    return frame('pd', x, { tools: tools(x), kpis: kpis, main: main, side: side, todo: ['top-cake'], details: ['pr'] });
  }

  // ---------- Customers ----------
  function customersPage(x) {
    var cur = x.cur.filter(function (o) { return o.c; }), r = x.r, from = r.all ? (x.st.showOld ? '0000-01-01' : x.launch) : r.from;
    var hist = (x.data.allOrders || x.data.orders || []).filter(function (o) { return o.c && facts(o).sale && iso(o.pd); });
    var first = {}, count = {};
    hist.forEach(function (o) { if (!first[o.c] || o.pd < first[o.c]) first[o.c] = o.pd; count[o.c] = (count[o.c] || 0) + 1; });
    var by = {}; cur.forEach(function (o) { (by[o.c] = by[o.c] || []).push(o); });
    var ids = Object.keys(by), nw = ids.filter(function (c) { return !(first[c] < from); }), ret = ids.filter(function (c) { return first[c] < from; });
    var ordersOf = function (cs) { var l = []; cs.forEach(function (c) { l = l.concat(by[c] || []); }); return l; };
    var spend = cur.reduce(function (s, o) { return s + x.value(o); }, 0), n = ids.length;
    var kpis = [
      kpi(x, 'green', 'Customers', x.num(n), 'Bought in this period, matched by mobile number', cur, 'Customers’ orders'),
      kpi(x, 'blue', 'New', x.num(nw.length), 'First cake from us in this period', ordersOf(nw), 'New customers’ orders'),
      kpi(x, 'purple', 'Returning', n ? Math.round(ret.length / n * 100) + '%' : '—', x.num(ret.length) + pl(ret.length, ' customer has', ' customers have') + ' bought before', ordersOf(ret), 'Returning customers’ orders'),
      kpi(x, 'amber', 'Average spend', n ? x.money(spend / n) : 'None yet', 'Per customer in this period', cur, 'Customers’ orders')
    ];
    // How often customers come back, from every year on record
    var cust = Object.keys(count), listFor = function (lo, hi) { var cs = cust.filter(function (c) { return count[c] >= lo && count[c] <= hi; }); return { cs: cs, list: hist.filter(function (o) { return count[o.c] >= lo && count[o.c] <= hi; }) }; };
    var bands = [['1 order', 1, 1], ['2 orders', 2, 2], ['3 to 4 orders', 3, 4], ['5 or more', 5, 1e9]].map(function (b) { var g = listFor(b[1], b[2]); return { l: b[0], v: g.cs.length, list: g.list, t: 'Customers with ' + b[0].toLowerCase(), txt: x.num(g.cs.length) + ' · ' + (cust.length ? Math.round(g.cs.length / cust.length * 100) : 0) + '%' }; });
    var main = card('How often customers come back', 'Customers by number of completed orders, every year on record, including sheet orders. Matched by mobile number.', cust.length ? bars(x, bands, x.num, 'purple') : none('No customers on record yet.'), 'cat-main', true);
    var top = ids.map(function (c) { var l = by[c]; return { l: (l[0].cn || 'Customer') + (l.length > 1 ? ' (' + l.length + ')' : ''), v: l.reduce(function (s, o) { return s + x.value(o); }, 0), list: l, t: (l[0].cn || 'Customer') + '’s orders' }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
    var side = [
      card('New and returning', 'Customers in this period', split(x, 'Customers in this period', [{ l: 'New', v: nw.length, list: ordersOf(nw) }, { l: 'Returning', v: ret.length, list: ordersOf(ret) }]) || none('No customers in this period yet.')),
      card('How they ordered', 'Completed orders by channel', donut(x, 'How they ordered', group(cur, function (o) { return [[x.src[o.src] || o.src || 'Not recorded', 1, 0]]; }).map(function (g) { return { l: g.l, v: g.q, list: g.list }; }), x.num, 'orders') || none('No orders in this period yet.')),
      card('Top customers', 'By spend in this period', top.length ? bars(x, top, x.money, 'green') : none('No customers in this period yet.'))
    ];
    return frame('cu', x, { tools: tools(x), kpis: kpis, main: main, side: side, todo: ['returning', 'channel'], details: ['cu'] });
  }

  // ---------- Occasions (the Booking curve lives in the occasion view and is kept exactly as it is) ----------
  function occasionsPage(x) {
    var sub = x.sub(['oi', 'or'], 'oi');
    var seg = '<div class="cat-seg" role="tablist" aria-label="Occasion views">' + [['oi', 'All occasions'], ['or', 'One occasion, full report']].map(function (s) {
      return '<button type="button" class="cat-chip" role="tab" data-act="secgo" data-g="dash" data-v="' + s[0] + '" aria-selected="' + (sub === s[0]) + '" aria-pressed="' + (sub === s[0]) + '">' + s[1] + '</button>';
    }).join('') + '</div>';
    var note = '<p class="cat-cap">Every year on record, including sheet orders. Use the choices below to narrow it down.</p>';
    if (sub === 'or') return frame('sd', x, { tools: seg, body: '<section class="dx-card dx-secbody or-wrap" aria-label="Occasion report"><div class="dx-card-h"><h2>Occasion report</h2><span>One occasion, the full story</span></div><div class="or-body">' + x.report() + '</div></section>' });
    return frame('sd', x, { tools: seg, note: note, body: '<div class="cat-oi">' + x.oi() + '</div>', todo: ['occasion'], details: ['oc'] });
  }

  // ---------- Planning ----------
  function planningPage(x) {
    var t = x.today(), up = x.up, d6 = x.addDays(t, 6), d29 = x.addDays(t, 29);
    var in7 = up.filter(function (o) { return o.pd <= d6; }), in30 = up.filter(function (o) { return o.pd <= d29; });
    var nc7 = in7.filter(function (o) { return o.st !== 'confirmed'; }), nc30 = in30.filter(function (o) { return o.st !== 'confirmed'; });
    var owe = in30.filter(function (o) { return o.live && num(o.bal) > 0.005; });
    var cakes = function (l) { return l.reduce(function (s, o) { return s + x.cakes(o); }, 0); }, value = function (l) { return l.reduce(function (s, o) { return s + x.value(o); }, 0); };
    var kpis = [
      kpi(x, 'green', 'Cakes, next 7 days', x.num(cakes(in7)), x.num(in7.length) + pl(in7.length, ' order', ' orders') + (nc7.length ? ' · ' + x.num(nc7.length) + ' not confirmed' : ' · all confirmed'), in7, 'Orders for the next 7 days'),
      kpi(x, 'blue', 'Booked, next 30 days', x.money(value(in30)), x.num(in30.length) + pl(in30.length, ' order', ' orders') + ' · ' + x.num(cakes(in30)) + ' cakes', in30, 'Orders for the next 30 days'),
      kpi(x, 'amber', 'Not confirmed yet', x.num(nc30.length), nc30.length ? 'Next 30 days · confirm or follow up' : 'Every order is confirmed', nc30, 'Not confirmed yet, next 30 days'),
      kpi(x, 'pink', 'To collect before pickup', x.money(x.owed(owe)), owe.length ? x.num(owe.length) + pl(owe.length, ' order', ' orders') + ' in the next 30 days' : 'Nothing owed on upcoming orders', owe, 'Upcoming orders with money still owed')
    ];
    var days = []; for (var i = 0; i < 14; i++) { var day = x.addDays(t, i); var list = up.filter(function (o) { return o.pd === day; }); var conf = list.filter(function (o) { return o.st === 'confirmed'; }); days.push({ l: i === 0 ? 'Today' : WD[dayOf(day)], sub: dm(day), full: short(day), now: i === 0, v: cakes(conf), v2: cakes(list) - cakes(conf), list: list, t: short(day) + ' pickups' }); }
    var legend = '<p class="cat-key"><span><i class="cat-k1"></i>Confirmed</span><span><i class="cat-k2"></i>Not confirmed yet</span></p>';
    var main = card('Cakes due, next 14 days', 'Booked orders, not predictions', cols(x, days, x.num, 'Busiest', legend) || none('No orders booked for the next 14 days yet.'), 'cat-main');
    var weeks = []; var w0 = x.addDays(t, -dayOf(t));
    for (var k = 0; k < 6; k++) { var a = x.addDays(w0, k * 7), b = x.addDays(a, 6); var wl = up.filter(function (o) { return o.pd >= a && o.pd <= b; }); weeks.push({ l: k === 0 ? 'This week' : dm(a), v: cakes(wl), list: wl, t: (k === 0 ? 'This week' : 'Week of ' + dm(a)) + ' pickups', txt: x.num(cakes(wl)) + ' · ' + x.money(value(wl)) }); }
    var got = x.got, stages = [
      ['Enquiries and quotes', got.filter(function (o) { return o.st === 'not_confirmed'; })],
      ['Received, to be checked', got.filter(function (o) { return o.st === 'received'; })],
      ['Confirmed', x.confirmed(got)],
      ['Completed sales', got.filter(function (o) { return o.sale; })],
      ['Cancelled', got.filter(function (o) { return o.off; })]
    ].map(function (s) { return { l: s[0], v: s[1].length, list: s[1], t: s[0], txt: x.num(s[1].length) + (got.length ? ' · ' + Math.round(s[1].length / got.length * 100) + '%' : '') }; });
    var hist = allOf(x).filter(function (o) { return !facts(o).off && /^\d{1,2}:\d{2}/.test(o.pt || ''); });
    var slots = [['Before 12 PM', 0, 11], ['12 to 2 PM', 12, 13], ['2 to 5 PM', 14, 16], ['From 5 PM', 17, 23]].map(function (s) {
      var l = hist.filter(function (o) { var h = +o.pt.split(':')[0]; return h >= s[1] && h <= s[2]; }); return { l: s[0], v: l.length, list: l, t: s[0] + ' pickups, all years', txt: x.num(l.length) + (hist.length ? ' · ' + Math.round(l.length / hist.length * 100) + '%' : '') };
    });
    var big = in30.filter(function (o) { return x.value(o) > 0; }).sort(function (p, q) { return x.value(q) - x.value(p); }).slice(0, 5);
    var bigList = big.length ? '<div class="cat-list">' + big.map(function (o) {
      var act = o.i && o.live ? 'data-act="open-order" data-id="' + esc(o.i) + '"' : 'data-act="rg-open" data-v="' + esc(o.k || '') + '"';
      return '<button type="button" class="cat-li" ' + act + '><b>' + esc(o.r || 'Order') + '</b><span>' + esc(short(o.pd) + (o.pt ? ', ' + time12(o.pt) : '')) + ' · ' + x.num(x.cakes(o)) + pl(x.cakes(o), ' cake', ' cakes') + (o.st !== 'confirmed' ? ' · not confirmed' : '') + '</span><em>' + esc(x.money(x.value(o))) + '</em></button>';
    }).join('') + '</div>' : none('No priced orders in the next 30 days.');
    var side = [
      card('Cakes per week', 'Next 6 weeks, by week starting Monday, with booked value', bars(x, weeks, x.num, 'green')),
      card('Largest orders', 'Next 30 days, for kitchen planning', bigList),
      card('Order stages', 'Every order in this period', got.length ? bars(x, stages, x.num, 'blue') : none('No orders in this period yet.')),
      card('When cakes are collected', 'Pickup times, every year on record, including sheet orders.', hist.length ? bars(x, slots, x.num, 'purple') : none('No pickup times recorded yet.'), '', true)
    ];
    return frame('pl', x, { tools: tools(x), kpis: kpis, main: main, side: side, todo: ['unconfirmed', 'busiest', 'quiet-day', 'lead'], details: ['fc', 'op', 'cv'] });
  }

  // ---------- Data ----------
  function dataPage(x) {
    var dr = find(x.secs, 'dr'), dm2 = find(x.secs, 'dm'), parts = dr ? String(dr[3]).split('<hr class="dx-hr">') : [];
    var ready = parts[0] || '', about = parts.slice(1).join('<hr class="dx-hr">');
    var key = function (k) { return x.st['o' + k] ? ' open' : ''; };
    var body = '<section class="cat-card dx-secbody" aria-label="Data readiness"><header><h3>Data readiness</h3><span>What each figure needs</span></header>' + ready + '</section>' +
      '<div class="cat-up">' + x.uploads() + '</div>' +
      '<details class="cat-more" data-dxsec="catdaab"' + key('catdaab') + '><summary><b>About the data</b><span>Things to know, and how every figure is worked out</span></summary><div class="cat-more-b"><div class="cat-sub-b dx-secbody">' + about + '</div></div></details>' +
      (dm2 ? '<details class="cat-more" data-dxsec="catdadm"' + key('catdadm') + '><summary><b>Modules and datasets</b><span>What each tab needs, what has arrived, and how datasets connect</span></summary><div class="cat-more-b"><div class="cat-sub-b dx-secbody">' + dm2[3] + '</div></div></details>' : '');
    return frame('da', x, { body: body });
  }

  var PAGES = { sl: salesPage, pd: cakesPage, cu: customersPage, sd: occasionsPage, pl: planningPage, da: dataPage };

  // ---------- "What to do": insight cards for this tab, from the same engine as the Overview ----------
  function todoCard(f) {
    return '<article class="cci-card cci-' + esc(f.tone) + '"><span class="cci-tag">' + esc(f.tag) + '</span>' +
      '<p class="cci-line"><strong class="cci-big">' + esc(f.big) + '</strong> <span class="cci-title">' + esc(f.title) + '</span></p>' +
      '<p class="cci-why">' + esc(f.why) + '</p>' + (f.viz || '') + '<div class="cci-foot"><span class="cci-do">' + esc(f.action) + '</span>' +
      (f.go === 'orders' ? '<button type="button" class="cci-go" data-cat-go="orders">Open Orders</button>' : '') + '</div></article>';
  }
  function fillTodo(tries) {
    var host = global.document.querySelector('#cc-staff [data-cat-todo]');
    if (!host || !last) return;
    var E = global.CCCakeInsights;
    if (!E || typeof E.analyse !== 'function') { if ((tries || 0) < 40) setTimeout(function () { fillTodo((tries || 0) + 1); }, 750); return; }
    try {
      var ids = host.getAttribute('data-cat-todo').split(','), x = last.x;
      var found = E.analyse(x.data.allOrders || x.data.orders || [], x.today()).filter(function (f) { return ids.indexOf(f.id) > -1; }).slice(0, 2);
      if (!found.length) { host.remove(); return; }
      host.innerHTML = '<header class="cat-todo-h"><h3>What to do</h3><span>Current business signals · uses its own dates, not the filters above</span></header><div class="cat-todo-g">' + found.map(todoCard).join('') + '</div>';
      host.hidden = false;
    } catch (e) { host.remove(); console.warn('[Analytics tabs] What to do not shown', e); }
  }

  // ---------- clicks: period chips and Open Orders ----------
  if (global.document && !global.__ccAnalyticsTabsClicks) {
    global.__ccAnalyticsTabsClicks = true;
    global.document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var go = t.closest('#cc-staff [data-cat-go="orders"]');
      if (go) { e.preventDefault(); var nav = global.document.querySelector('#cc-staff [data-tab="orders"]'); if (nav) nav.click(); return; }
      var b = t.closest('#cc-staff [data-cat-p]');
      if (!b || !last) return;
      e.preventDefault();
      var v = b.getAttribute('data-cat-p'), x = last.x, sel = global.document.getElementById('dx-p');
      if (!sel) return;
      if (v === '7') { x.f.to = x.today(); x.f.from = x.addDays(x.f.to, -6); v = 'c'; }
      sel.value = v;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // ---------- entry point, called by the app for every Analytics tab except Overview ----------
  function page(mod, x) {
    var fn = PAGES[mod];
    if (!fn) return null;
    last = { mod: mod, x: x };
    var html = x.head + modBar(mod, x) + fn(x);
    setTimeout(fillTodo, 0);
    return html;
  }
  // Other add-ons (Marketing campaigns) add their own tab page with the same building blocks, so every tab looks alike
  function register(mod, fn) { if (INFO[mod] && typeof fn === 'function') PAGES[mod] = fn; }
  var kit = { esc: esc, num: num, pl: pl, short: short, dm: dm, dayOf: dayOf, facts: facts, allOf: allOf, tap: tap, kpi: kpi, card: card,
    none: none, cols: cols, bars: bars, donut: donut, split: split, frame: frame, WD: WD, MON: MON };
  global.CCAnalyticsTabs = { version: VERSION, page: page, time12: time12, register: register, kit: kit };
})(typeof window !== 'undefined' ? window : globalThis);
