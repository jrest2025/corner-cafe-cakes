/* Corner Café: shared frame (31 Oct 2026, cleanup stage 3). One queue for the add-ons' screen passes: they all run in the
 * same frame, before the screen is drawn, and a pass that changes the page lets the others react in that same frame
 * (at most 8 rounds), instead of each waiting its own frame or 30 to 60 ms (a visible flash of the unfinished screen). */
(function (w) {
  if (w.__ccFrame) return;
  var q = [], pending = false, inFrame = false, rounds = 0, raf = w.requestAnimationFrame ? w.requestAnimationFrame.bind(w) : function (f) { return setTimeout(f, 16); };
  function drain() {
    if (!q.length) return;
    if (++rounds > 8) { var later = q; q = []; later.forEach(function (f) { f.__ccq = 0; }); raf(function () { later.forEach(function (f) { w.__ccFrame(f); }); }); return; }
    var list = q; q = [];
    for (var i = 0; i < list.length; i++) { list[i].__ccq = 0; try { list[i](); } catch (e) { if (w.console) console.warn('[Corner Café frame]', e); } }
  }
  w.__ccFrame = function (f) {
    if (f.__ccq) return; f.__ccq = 1; q.push(f);
    if (inFrame) { Promise.resolve().then(drain); return; }
    if (pending) return; pending = true;
    raf(function () { pending = false; inFrame = true; rounds = 0; setTimeout(function () { inFrame = false; }, 0); drain(); });
  };
})(window);
/* Corner Café Service Hub: Analytics that answer (27 October 2026). Marker __ccAnswers20261027.
 * Roneel: "let's work on the meaningful analytics" - answers and next actions first (approved plan, 27 Oct, 9:31 PM).
 *  1. Each tab opens with one plain answer in place of its question ("$720 in completed sales, up 18% on the 15 days before").
 *  2. "What to do" sits straight under the period chips, before the numbers; cards that only say "No change needed" go.
 *  3. Number cards without a comparison get one against the same number of days before. Until the app has that much
 *     history, the days before come from the older order sheets and the line says so ("sheet records"). No % from zero.
 *  4. The "Business intelligence" data-check cards move into Details; Marketing's empty "Data required" boxes become
 *     one line until campaign data exists.
 *  5. The Cake Heartbeat and Daily cake demand are never touched.
 * Reads only what the Analytics screen was already given (no queries, no writes). If anything fails, the screen stays as it was. */
(function (win, doc) {
  'use strict';
  if (win.__ccAnswers20261027) return;
  win.__ccAnswers20261027 = true;

  var last = null; // { mod, x } from the most recent tab page
  var WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var OCC = { birthday: 'Birthdays', anniversary: 'Anniversaries', wedding: 'Weddings', mothers_day: "Mother's Day", fathers_day: "Father's Day",
    christmas: 'Christmas', valentines_day: "Valentine's Day", baby_shower: 'Baby showers', graduation: 'Graduations', other: 'Other occasions' };

  function warn(w, e) { try { console.warn('[Analytics answers] ' + w, e); } catch (_) {} }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function pl(n, one, many) { return n === 1 ? one : many || one + 's'; }
  function isoOk(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function dayName(iso) { var d = new Date(iso + 'T12:00:00Z'); return WD[(d.getUTCDay() + 6) % 7].slice(0, 3) + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }

  // ---------- facts, the same rules as the tab pages ----------
  function sale(o) { return !!o && o.st !== 'cancelled' && o.st !== 'declined' && (o.cp === 'recorded' || o.cp === 'assumed'); }
  function cakesOf(x, o) { return (x.items(o) || []).reduce(function (s, i) { return s + (num(i[3]) || 1); }, 0); }
  function who(o) { var k = o && o.c; return typeof k === 'string' && k.trim().length >= 4 ? k.trim() : ''; }
  function all(x) { return ((x.data && (x.data.allOrders || x.data.orders)) || []).filter(function (o) { return o && x.match(o); }); }

  // The period on screen and the same number of days just before it
  function periods(x) {
    var t = x.today(), r = x.r || {}, from = r.all ? x.launch : r.from, to = r.to && r.to < t ? r.to : t;
    if (!isoOk(from) || !isoOk(to) || from > to) return null;
    var len = x.days(from, to) + 1, pf = x.addDays(from, -len), pt = x.addDays(from, -1);
    var src = pt < x.launch ? ' (sheet records)' : pf < x.launch ? ' (app and sheet records)' : '';
    return { from: from, to: to, len: len, pf: pf, pt: pt, label: (len === 7 ? 'the week before' : 'the ' + len + ' days before') + src };
  }
  // Fair comparison checks: the days before must be about as well recorded as the period on screen (the walk-in sheet
  // stops on 14 Sep 2026, so some windows are half empty), and money is compared only when most earlier sales had a price.
  function covered(x, from, to) {
    var seen = {}, n = 0;
    all(x).forEach(function (o) { var d = x.dateOf(o); if (d && d >= from && d <= to && o.st !== 'cancelled' && !seen[d]) { seen[d] = 1; n++; } });
    return n;
  }
  function fair(x, p) {
    if (p.fair != null) return p.fair;
    var now = covered(x, p.from, p.to), before = covered(x, p.pf, p.pt);
    return (p.fair = !now || before >= 0.6 * now);
  }
  function prevSales(x, p) {
    return all(x).filter(function (o) { var d = x.dateOf(o); return sale(o) && d && d >= p.pf && d <= p.pt; });
  }
  function change(cur, prev, label) {
    if (prev == null) return null;
    if (!prev && !cur) return null;
    if (!prev) return { t: 'New: none in ' + label, c: 'up' };
    var pc = Math.round((cur - prev) / prev * 100);
    return { t: (pc > 0 ? 'Up ' + pc + '%' : pc < 0 ? 'Down ' + (-pc) + '%' : 'No change') + ' on ' + label, c: pc > 0 ? 'up' : pc < 0 ? 'down' : 'flat' };
  }
  function phrase(d) { return d ? d.t.replace(/^Up/, 'up').replace(/^Down/, 'down').replace(/^No change/, 'no change').replace(/^New: none in/, 'none in') : ''; }

  // ---------- one plain answer per tab ----------
  function answerFor(mod, x) {
    var p = periods(x), cur = x.cur || [], cs = x.cs || {}, out = { kpi: {} };
    var since = x.r && x.r.all ? ' since the launch' : p ? ' in the last ' + p.len + ' days' : '';
    if (mod === 'sl') {
      var ok = p && fair(x, p), prev = ok ? prevSales(x, p) : null;
      var unpriced = prev ? prev.filter(function (o) { return !(x.value(o) > 0); }).length : 0;
      var pv = prev && unpriced <= 0.2 * prev.length ? prev.reduce(function (s, o) { return s + x.value(o); }, 0) : null;
      var dv = ok ? change(num(cs.v), pv, p.label) : null, dn = ok ? change(num(cs.n), prev ? prev.length : null, p.label) : null;
      if (p && !ok) out.kpi['Net cake sales'] = out.kpi['Completed orders'] = { t: 'No fair comparison: older records incomplete', c: 'flat' };
      if (ok) { out.kpi['Net cake sales'] = dv || (prev && pv == null ? { t: 'Earlier sheet orders missing prices', c: 'flat' } : null); out.kpi['Completed orders'] = dn; }
      if (!cs.n) { out.html = 'No completed sales' + since + ' yet.'; return out; }
      var ch = {}; cur.forEach(function (o) { var k = (x.src && x.src[o.src]) || o.src || 'Not recorded'; ch[k] = (ch[k] || 0) + x.value(o); });
      var top = Object.keys(ch).sort(function (a, b) { return ch[b] - ch[a]; })[0], share = top && cs.v ? Math.round(ch[top] / cs.v * 100) : 0;
      out.html = '<b>' + esc(x.money(cs.v)) + '</b> in completed sales' + since + (dv ? ', ' + esc(phrase(dv)) : '') + '.' +
        (top && share >= 50 && Object.keys(ch).length > 1 ? ' ' + esc(top) + ' brought ' + share + '%.' : '');
      return out;
    }
    if (mod === 'pd') {
      var g = {}, total = 0;
      cur.forEach(function (o) { (x.items(o) || []).forEach(function (i) { var q = num(i[3]) || 1, k = i[0] || 'Not recorded'; g[k] = (g[k] || 0) + q; total += q; }); });
      if (p && fair(x, p)) { var pc = prevSales(x, p).reduce(function (s, o) { return s + cakesOf(x, o); }, 0); out.kpi['Cakes sold'] = change(total, pc, p.label); }
      if (!total) { out.html = 'No cakes sold' + since + ' yet.'; return out; }
      var rank = Object.keys(g).sort(function (a, b) { return g[b] - g[a]; });
      out.html = '<b>' + esc(rank[0]) + '</b> is the top seller' + since + ': ' + Math.round(g[rank[0]] / total * 100) + '% of ' + total + pl(total, ' cake', ' cakes') + '.' +
        (rank[1] ? ' Next: ' + esc(rank[1]) + '.' : '');
      return out;
    }
    if (mod === 'cu') {
      var ids = {}, newOnes = 0, n = 0;
      cur.forEach(function (o) { var k = who(o); if (k && !ids[k]) { ids[k] = 1; n++; } });
      if (p) {
        var before = {}; all(x).forEach(function (o) { var d = x.dateOf(o), k = who(o); if (k && sale(o) && d && d < p.from) before[k] = 1; });
        Object.keys(ids).forEach(function (k) { if (!before[k]) newOnes++; });
        var pids = {}, pn = 0; prevSales(x, p).forEach(function (o) { var k = who(o); if (k && !pids[k]) { pids[k] = 1; pn++; } });
        if (fair(x, p)) out.kpi.Customers = change(n, pn, p.label);
      }
      if (!n) { out.html = 'No customers' + since + ' yet.'; return out; }
      out.html = '<b>' + n + pl(n, ' customer', ' customers') + '</b>' + since + '. ' +
        (!newOnes ? 'All had bought before: <b>no new customers</b> yet.' : newOnes === n ? 'All of them are new.' : '<b>' + newOnes + ' new</b>, ' + (n - newOnes) + ' returning.');
      return out;
    }
    if (mod === 'sd') {
      var occ = {}, on = 0;
      cur.forEach(function (o) { if (o.oc && o.oc !== 'not_specified') { occ[o.oc] = (occ[o.oc] || 0) + 1; on++; } });
      if (!on) { out.html = 'No occasions recorded' + since + ' yet.'; return out; }
      var k = Object.keys(occ).sort(function (a, b) { return occ[b] - occ[a]; })[0], nm = OCC[k] || (x.occName ? x.occName(k) : k);
      out.html = '<b>' + esc(nm) + '</b> ' + (/s$/.test(nm) ? 'are' : 'is') + ' ' + Math.round(occ[k] / on * 100) + '% of occasion orders' + since + '.';
      return out;
    }
    if (mod === 'pl') {
      var t = x.today(), end = x.addDays(t, 6), by = {}, cakes = 0, orders = 0, notOk = 0;
      all(x).forEach(function (o) {
        if (!isoOk(o.pd) || o.pd < t || o.pd > end || o.st === 'cancelled' || o.st === 'declined' || sale(o)) return;
        var c = cakesOf(x, o); cakes += c; orders++; by[o.pd] = (by[o.pd] || 0) + c;
        if (x.confirmed && !(x.confirmed([o]) || []).length) notOk++;
      });
      if (!cakes) { out.html = 'No cakes due in the next 7 days.'; return out; }
      var busy = Object.keys(by).sort(function (a, b) { return by[b] - by[a] || (a < b ? -1 : 1); })[0];
      out.html = '<b>' + cakes + pl(cakes, ' cake', ' cakes') + '</b> due in the next 7 days, busiest <b>' + esc(dayName(busy)) + '</b> (' + by[busy] + ').' +
        (notOk ? ' <b>' + notOk + '</b> not confirmed yet.' : ' All confirmed.');
      return out;
    }
    return null;
  }

  // ---------- capture what each tab page was given ----------
  function hook() {
    var T = win.CCAnalyticsTabs;
    if (!T || typeof T.page !== 'function' || T.page.__ccAns) return !!(T && T.page && T.page.__ccAns);
    var orig = T.page;
    var wrapped = function (mod, x) { try { last = { mod: mod, x: x, at: Date.now() }; } catch (e) {} return orig.apply(this, arguments); };
    wrapped.__ccAns = true;
    try { T.page = wrapped; } catch (e) { warn('could not attach', e); return false; }
    return T.page === wrapped;
  }

  // ---------- the screen ----------
  function apply() {
    var main = doc.querySelector('#cc-staff #ccs-main');
    if (!main) return;
    styles();
    tidyInsights(main);
    var pg = main.querySelector('.cat-page[data-cat]');
    if (pg && last && pg.getAttribute('data-cat') === last.mod && !pg.__ccAns) {
      pg.__ccAns = true;
      try { answer(pg, last.mod, last.x); } catch (e) { warn('answer not shown', e); }
    }
    if (pg) { try { todoFirst(pg); biToDetails(pg, main); } catch (e) { warn('layout not changed', e); } }
    try { marketing(main); } catch (e) { warn('marketing not changed', e); }
  }
  function answer(pg, mod, x) {
    var a = answerFor(mod, x);
    if (!a) return;
    if (a.html) {
      var q = pg.querySelector('.cat-title > p');
      if (q) { q.className = 'ans-line'; q.innerHTML = a.html; q.setAttribute('data-ans', mod); }
    }
    [].forEach.call(pg.querySelectorAll('.cat-kpis > .cat-k'), function (k) {
      var lab = txt(k.querySelector('.cat-k-top span')), d = a.kpi[lab];
      if (!d || k.querySelector('.cat-k-d')) return;
      var s = doc.createElement('span'); s.className = 'cat-k-d ans-d is-' + d.c; s.textContent = d.t;
      var cap = k.querySelector('.cat-k-cap'); if (cap) cap.before(s); else k.appendChild(s);
    });
  }
  // What to do: straight under the period chips; only cards with a real action
  function todoFirst(pg) {
    var todo = pg.querySelector(':scope > .cat-todo');
    if (!todo || todo.hidden) return;
    [].forEach.call(todo.querySelectorAll('.cci-card'), function (c) { if (/^No change needed$/i.test(txt(c.querySelector('.cci-do')))) c.remove(); });
    var cards = todo.querySelectorAll('.cci-card');
    if (!cards.length) { todo.hidden = true; return; }
    [].slice.call(cards, 3).forEach(function (c) { c.remove(); });
    var g = todo.querySelector('.cat-todo-g'); if (g) g.setAttribute('data-n', Math.min(cards.length, 3));
    var anchor = pg.querySelector(':scope > .cat-kpis');
    if (anchor && anchor.previousElementSibling !== todo) anchor.before(todo);
  }
  function tidyInsights(main) {
    [].forEach.call(main.querySelectorAll('#cc-insights .cci-card'), function (c) {
      if (/^No change needed$/i.test(txt(c.querySelector('.cci-do')))) c.hidden = true;
    });
  }
  // Business intelligence data checks: into Details
  function biToDetails(pg, main) {
    var bi = main.querySelector('section.cat-card[aria-label="Business intelligence"]');
    if (!bi || bi.closest('.ans-bi')) return;
    var more = pg.querySelector('.cat-more');
    if (!more) {
      more = doc.createElement('details'); more.className = 'cat-more';
      more.innerHTML = '<summary><b>Details</b><span>Tables, how the figures are counted, and downloads</span></summary><div class="cat-more-b"></div>';
      pg.appendChild(more);
    }
    var body = more.querySelector('.cat-more-b') || more;
    var d = doc.createElement('details'); d.className = 'cat-sub ans-bi';
    d.innerHTML = '<summary><span>Data checks</span></summary><div class="cat-sub-b"></div>';
    d.querySelector('.cat-sub-b').appendChild(bi);
    body.appendChild(d);
  }
  // Marketing: four empty boxes become one line
  function marketing(main) {
    var board = main.querySelector('.aw-board');
    if (!board || board.hidden) return;
    var isles = board.querySelectorAll('.aw-island');
    if (!isles.length) return;
    var empty = [].every.call(isles, function (i) { return /Data required/.test(txt(i.querySelector('.aw-chart-empty strong'))); });
    if (!empty) return;
    var tools = main.querySelector('.aw-toolbar[data-aw-key="' + board.getAttribute('data-aw-key') + '"]') || main.querySelector('.aw-toolbar');
    var tpl = board.querySelector('[data-aw-dataset]');
    var box = doc.createElement('section'); box.className = 'ans-empty';
    box.innerHTML = '<p class="ans-line"><b>No campaign spend recorded yet</b>, so return on spend can’t be worked out.</p><p class="ans-hint">Results show here once campaign spend and results are added.</p>';
    if (tpl) { var b = tpl.cloneNode(true); b.removeAttribute('id'); b.addEventListener('click', function (e) { e.preventDefault(); tpl.click(); }); box.appendChild(b); }
    board.hidden = true; if (tools) tools.hidden = true;
    board.before(box);
  }

  function styles() {
    if (doc.getElementById('ccans-style')) return;
    var P = ':root:not(#cc-a0) #cc-staff #ccs-main';
    var s = doc.createElement('style'); s.id = 'ccans-style';
    s.textContent = [
      P + ' .cat-title > p.ans-line{font-size:17px!important;line-height:1.45!important;color:#1D2939!important;font-style:normal!important;margin:4px 0 0!important;max-width:760px}',
      P + ' .ans-line b{font-weight:600;color:#101828}',
      P + ' .cat-k .ans-d{display:block;margin:2px 0 0;font-size:13px;font-weight:500}',
      P + ' .cat-k .ans-d.is-up{color:#067647}' + P + ' .cat-k .ans-d.is-down{color:#B42318}' + P + ' .cat-k .ans-d.is-flat{color:#475467}',
      P + ' .cat-page > .cat-todo{margin-top:4px}',
      P + ' .ans-empty{background:#fff;border:1px solid #E4E7EC;border-radius:14px;padding:20px 22px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}',
      P + ' .ans-empty .ans-line{margin:0;font-size:17px;color:#1D2939}' + P + ' .ans-empty .ans-hint{margin:0 0 8px;font-size:14px;font-style:italic;color:#475467}',
      P + ' #cc-insights .cci-card[hidden]{display:none!important}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  var queued = false;
  function schedule() { win.__ccFrame(schedRun); }
  function schedRun() { try { hook(); apply(); } catch (e) { warn('skipped', e); } }
  function start() {
    var tries = 0, t = setInterval(function () { if (hook() || ++tries > 80) clearInterval(t); }, 250);
    new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true });
    schedule();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  win.CCAnalyticsAnswers = { answerFor: answerFor, periods: periods, last: function () { return last; } };
})(window, document);
