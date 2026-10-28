/* Corner Café: marketing campaigns plugged into Analytics (20 October 2026).
 * Roneel: "its like we just plug it in marketing campaing to the analytics dashboard". Approved plan: Add campaign, then
 * link and QR code, then results on the Marketing tab ("Yes, build it").
 *
 *  1. Analytics, Marketing: a manager taps Add campaign and gives its name and dates; where it runs, what it promotes and
 *     what it cost are optional. The database gives it a code that never changes (campaign_save).
 *  2. The campaign gets a link to the cake order form (?campaign=<code>, plus &occasion=<code> when it promotes one) and
 *     a QR code of the same link. The order form already saves that code on the order (orders.campaign).
 *  3. Counter, phone and WhatsApp orders: while a campaign runs, New order asks "Came from a promotion?" on the Customer
 *     step. One tap records it once the order is saved (order_set_campaign), with a line in the order's history.
 *  4. The Marketing tab shows what each campaign brought in: traced orders and their value, cost, cost per order and
 *     what each dollar brought back. "Traced" orders (through the link, the QR code or the tap) are kept apart from
 *     "before and during" (every cake order while a campaign ran against the days before it), because other things
 *     move orders too.
 *
 * Database: supabase/sql/marketing_campaigns_20261020.sql. The staff app hands over its own database client as
 * window.__ccsApi (build/staff_campaigns.py). QR codes: qrcode-generator 1.4.4 (MIT), bundled as window.CCQRCode.
 * If anything here fails, the rest of the app carries on: the tab falls back, and New order shows no promotion question.
 */
(function (global) {
  'use strict';
  if (global.CCCampaigns) return;
  var VERSION = '2026-10-20-campaigns-v2';
  var ORDER_PAGE = 'https://www.cornercafefiji.com/order-cake';
  var CHANNELS = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['google', 'Google'], ['whatsapp', 'WhatsApp'],
    ['email', 'Email'], ['print', 'Flyers and posters'], ['radio', 'Radio'], ['in_cafe', 'In the café'], ['other', 'Other']];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var LAUNCH = '2026-10-13';
  var S = { st: 'idle', list: [], removed: [], canEdit: false, err: null, at: 0, busy: false };  // every campaign, for Analytics
  var A = { st: 'idle', list: [], at: 0, busy: false };                                           // running today, for New order
  var lastX = null, lastV = null, D = null;                                                     // D: what the dialog shows
  var doc = global.document;

  // ---------- small helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function pl(n, one, many) { return n === 1 ? one : many || one + 's'; }
  function iso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : ''; }
  function fijiToday() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function today() { try { return lastX ? lastX.today() : fijiToday(); } catch (e) { return fijiToday(); } }
  function addDays(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function days(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
  function dm(d) { var x = new Date(d + 'T12:00:00Z'); return x.getUTCDate() + ' ' + MON[x.getUTCMonth()]; }
  function dmy(d, t) { return dm(d) + (d.slice(0, 4) !== String(t || today()).slice(0, 4) ? ' ' + d.slice(0, 4) : ''); }
  function money(v) { v = num(v); var r = Math.round(v * 100) / 100; return '$' + (Math.abs(r) < 100 && r % 1 ? r.toFixed(2) : Math.round(r).toLocaleString('en-US')); }
  function count0(n) { return Math.round(n).toLocaleString('en-US'); }
  function pretty(code) { var s = String(code || '').replace(/[-_]+/g, ' ').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unnamed link'; }
  function chName(k) { var c = CHANNELS.filter(function (x) { return x[0] === k; })[0]; return c ? c[1] : pretty(k); }
  function occName(code) {
    if (!code) return '';
    var l = (lastX && lastX.data && lastX.data.occasions) || [], o = l.filter(function (x) { return x.c === code; })[0];
    return o ? o.l : pretty(code);
  }
  function net(o) { return num(o.cv != null ? o.cv : o.lv) - num(o.ref); }
  function isLink(o) { var s = String(o.sys || ''); return /website/i.test(s) || (!s && /online/i.test(String(o.src || ''))); }
  function byId(id) { return S.list.filter(function (c) { return c.id === id; })[0] || null; }
  function link(c) { return ORDER_PAGE + '?campaign=' + encodeURIComponent(c.code) + (c.occasion ? '&occasion=' + encodeURIComponent(c.occasion) : ''); }
  function api() { var a = global.__ccsApi; return a && typeof a.rpc === 'function' ? a : null; }
  function call(name, args) {
    var a = api();
    if (!a) return Promise.reject(new Error('The app is not ready.'));
    return new Promise(function (ok, no) { try { a.rpc(name, args).then(ok, no); } catch (e) { no(e); } });
  }
  function stateOf(c, t) { return t < c.starts_on ? 'soon' : t > c.ends_on ? 'ended' : 'run'; }
  function stateText(c, t) {
    var s = stateOf(c, t);
    if (s === 'run') return c.ends_on === t ? 'Running · last day today' : 'Running · ends ' + dmy(c.ends_on, t);
    if (s === 'soon') return 'Starts ' + dmy(c.starts_on, t);
    return 'Ended ' + dmy(c.ends_on, t);
  }
  function runs(c, t) { return dmy(c.starts_on, t) + ' to ' + dmy(c.ends_on, t); }

  // ---------- loading ----------
  function onAnalytics() {
    var cur = doc.querySelector('#ccs-main .an-mods .an-mod[aria-current="page"]');
    return cur ? cur.getAttribute('data-v') : null;
  }
  function refresh() {
    var a = api(), mod = onAnalytics();
    if (!a || !(mod === 'mk' || mod === 'da')) return;
    try { if (!a.tab || a.tab() === 'dash') a.render(); } catch (e) { console.warn('[Campaigns] refresh', e); }
  }
  function load(force) {
    if (S.busy || !api()) return;
    if (!force && S.st !== 'idle' && Date.now() - S.at < 120000) return;
    S.busy = true;
    if (S.st === 'idle') S.st = 'loading';
    call('campaign_list').then(function (r) {
      S.busy = false; S.at = Date.now();
      if (r && r.error) throw r.error;
      var d = r && r.data;
      if (!d || !d.ok) { S.st = 'error'; S.err = (d && d.message) || 'The campaigns could not be loaded.'; }
      else { S.st = 'ready'; S.err = null; S.list = d.campaigns || []; S.removed = d.removed || []; S.canEdit = !!d.can_edit; }
      refresh();
    }).catch(function (e) {
      S.busy = false; S.at = Date.now();
      if (S.st !== 'ready') { S.st = 'error'; S.err = 'No connection, so the campaigns could not be loaded.'; }
      console.warn('[Campaigns] list', e); refresh();
    });
  }
  // For the Data tab and the module list: campaigns count as data once one exists
  function countAll() { if (S.st === 'idle') load(false); return S.list.length; }
  function latest() { var n = S.list.length; return n ? n + pl(n, ' campaign', ' campaigns') : ''; }

  // ---------- results ----------
  function results(x, t) {
    var by = {}, known = {}, gone = {};
    (x.data.allOrders || x.data.orders || []).forEach(function (o) { if (o && o.cmp && o.st !== 'cancelled') (by[o.cmp] = by[o.cmp] || []).push(o); });
    S.list.forEach(function (c) { known[c.code] = 1; });
    S.removed.forEach(function (c) { gone[c.code] = c.name; });
    var rows = S.list.map(function (c) {
      var list = by[c.code] || [], val = list.reduce(function (s, o) { return s + net(o); }, 0), spend = c.spend == null ? null : num(c.spend);
      return { c: c, list: list, n: list.length, val: val, link: list.filter(isLink), counter: list.filter(function (o) { return !isLink(o); }),
        spend: spend, cpo: spend != null && list.length ? spend / list.length : null, ret: spend ? val / spend : null, st: stateOf(c, t) };
    });
    var rank = { run: 0, soon: 1, ended: 2 };
    rows.sort(function (a, b) {
      if (a.st !== b.st) return rank[a.st] - rank[b.st];
      if (a.st === 'run') return a.c.ends_on < b.c.ends_on ? -1 : a.c.ends_on > b.c.ends_on ? 1 : 0;
      if (a.st === 'soon') return a.c.starts_on < b.c.starts_on ? -1 : 1;
      return a.c.ends_on > b.c.ends_on ? -1 : 1;
    });
    var other = Object.keys(by).filter(function (k) { return !known[k]; }).map(function (k) {
      return { code: k, name: gone[k] ? gone[k] + ' (removed)' : pretty(k), list: by[k] };
    }).sort(function (a, b) { return b.list.length - a.list.length; });
    return { rows: rows, other: other };
  }
  // Every cake order per day while a campaign ran, against the same number of days just before it (from the launch on)
  function lift(x, c, t) {
    if (t < c.starts_on) return null;
    var end = c.ends_on < t ? c.ends_on : t, d = days(c.starts_on, end) + 1;
    var bTo = addDays(c.starts_on, -1), bFrom = addDays(c.starts_on, -d), launch = x.launch || LAUNCH;
    if (bFrom < launch) bFrom = launch;
    var bd = bTo >= bFrom ? days(bFrom, bTo) + 1 : 0;
    var all = (x.data.allOrders || x.data.orders || []).filter(function (o) { return o && o.st !== 'cancelled' && iso(o.od) && o.odok !== false; });
    var during = all.filter(function (o) { var d0 = iso(o.od); return d0 >= c.starts_on && d0 <= end; });
    var before = bd ? all.filter(function (o) { var d0 = iso(o.od); return d0 >= bFrom && d0 <= bTo; }) : [];
    return { d: d, bd: bd, during: during, before: before, a: during.length / d, b: bd ? before.length / bd : null, ended: c.ends_on < t };
  }
  function perDay(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') + ' a day'; }

  // ---------- the Marketing tab ----------
  function topBar() {
    if (S.canEdit) return '<div class="ccm-top"><button type="button" class="ccs-btn ccs-new ccm-add" data-ccm-add>+ Add campaign</button><span>Each campaign gets its own link and QR code. Orders that come through them show here.</span></div>';
    return S.st === 'ready' ? '<p class="cat-cap">Managers add campaigns here. Tap a campaign’s Link and QR code to share it.</p>' : '';
  }
  function emptyState() {
    var steps = [['Add the campaign', 'Its name and the days it runs. Where it runs, what it promotes and what it cost help the figures below.'],
      ['Share its link or QR code', 'Put the link in posts, ads, WhatsApp messages and emails. Print the QR code on flyers and posters.'],
      ['Watch the orders come in', 'Website orders through the link or QR code count by themselves. At the counter, staff tap the promotion on New order.']];
    return '<div class="ccm-empty"><ol>' + steps.map(function (s, i) { return '<li><b><i>' + (i + 1) + '</i>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('') + '</ol>' +
      (S.canEdit ? '<button type="button" class="ccs-btn ccs-new ccm-add" data-ccm-add>+ Add your first campaign</button>' : '<p class="cat-cap">A manager can add the first campaign.</p>') + '</div>';
  }
  function row(x, K, r, max, t) {
    var c = r.c, meta = [runs(c, t)];
    if (c.channels && c.channels.length) meta.push(c.channels.map(chName).join(', '));
    if (c.occasion) meta.push('promotes ' + occName(c.occasion));
    var fig = function (v, l, list, title) { return K.tap(x, list, title, '<b>' + esc(v) + '</b><span>' + esc(l) + '</span>', 'ccm-fig'); };
    var figs = fig(count0(r.n), pl(r.n, 'order', 'orders'), r.list, c.name + ': orders') + fig(money(r.val), 'order value', r.list, c.name + ': orders') +
      fig(r.spend == null ? 'Not added' : money(r.spend), 'cost', null, '') +
      fig(r.cpo == null ? '—' : money(r.cpo), 'per order', null, '') +
      fig(r.ret == null ? '—' : money(r.ret), 'back per $1', null, '');
    return '<article class="ccm-row is-' + r.st + '" aria-label="' + esc(c.name) + '"><header class="ccm-rh"><div class="ccm-rn"><h4>' + esc(c.name) + '</h4><span class="ccm-st is-' + r.st + '">' + esc(stateText(c, t)) + '</span></div>' +
      '<div class="ccm-ra"><button type="button" class="ccs-btn ccs-new ccm-share" data-ccm-open="' + esc(c.id) + '">Link and QR code</button>' +
      (S.canEdit ? '<button type="button" class="ccs-btn ccs-ghost ccm-edit" data-ccm-edit="' + esc(c.id) + '">Change</button>' : '') + '</div></header>' +
      '<p class="ccm-meta">' + esc(meta.join(' · ')) + '</p><div class="ccm-figs">' + figs + '</div>' +
      '<div class="ccm-bar" aria-hidden="true"><i style="width:' + (max ? Math.max(r.n ? 3 : 0, Math.round(r.n / max * 100)) : 0) + '%"></i></div></article>';
  }
  function featured(rows, t) {
    var started = rows.filter(function (r) { return r.st !== 'soon'; });
    var run = started.filter(function (r) { return r.st === 'run'; }).sort(function (a, b) { return b.n - a.n || (a.c.starts_on < b.c.starts_on ? -1 : 1); });
    if (run.length) return run[0];
    var ended = started.filter(function (r) { return days(r.c.ends_on, t) <= 90; }).sort(function (a, b) { return a.c.ends_on > b.c.ends_on ? -1 : 1; });
    return ended[0] || null;
  }
  function liftCard(x, K, rows, t) {
    var f = featured(rows, t);
    if (!f) return K.card('Before and during', 'Every cake order, not only traced ones', K.none(S.list.length ? 'Shows once a campaign has started.' : 'Shows once you have a campaign.'));
    var L = lift(x, f.c, t), body;
    if (!L || L.d < 3) body = K.none('Compares once ' + f.c.name + ' has run 3 days.');
    else if (L.bd < 3) body = K.none('Not enough days before ' + f.c.name + ' to compare. Figures count from the launch on 13 October 2026.');
    else {
      var p = L.b ? Math.round((L.a - L.b) / L.b * 100) : null;
      body = K.bars(x, [
        { l: 'The ' + L.bd + ' days before', v: L.b, list: L.before, t: 'Cake orders in the ' + L.bd + ' days before ' + f.c.name, txt: perDay(L.b) },
        { l: (L.ended ? 'While it ran' : 'So far') + ' (' + L.d + ' days)', v: L.a, list: L.during, t: 'Cake orders while ' + f.c.name + ' ran', txt: perDay(L.a) }
      ], perDay, 'blue') +
        '<p class="ccm-lift">' + (p == null ? 'No orders in the days before, so no change to show.' : p === 0 ? 'No change while ' + esc(f.c.name) + (L.ended ? ' ran.' : ' runs.') :
          '<b class="' + (p > 0 ? 'is-up' : 'is-down') + '">' + (p > 0 ? 'Up ' : 'Down ') + Math.abs(p) + '%</b> while ' + esc(f.c.name) + (L.ended ? ' ran.' : ' runs.')) + '</p>';
    }
    return K.card('Before and during', f.c.name, body + '<p class="cat-foot">Every cake order, traced or not. Weather, paydays and the season move orders too, so use it as a guide.</p>');
  }
  function todoCards(rows, t) {
    var out = [], add = function (tone, tag, big, title, why, action) { out.push({ tone: tone, tag: tag, big: big, title: title, why: why, action: action }); };
    if (S.st === 'ready' && !S.list.length) add('plan', 'Start here', '', 'Add your first campaign', 'It gets its own link and QR code, so the orders it brings in can be counted.', S.canEdit ? 'Tap Add campaign at the top' : 'Ask a manager to add one');
    rows.forEach(function (r) {
      var c = r.c, ran = r.st === 'run' ? days(c.starts_on, t) + 1 : 0, left = r.st === 'run' ? days(t, c.ends_on) : 99;
      if (r.st === 'run' && ran >= 3 && !r.n) add('warn', 'Check', '0', 'orders traced to ' + c.name + ' after ' + ran + ' days', 'The link may be missing from the posts, or the counter is not tapping the promotion on New order.', 'Check the posts use its link');
      if (r.st === 'run' && left <= 3) add('plan', 'Ends soon', dm(c.ends_on), c.name + ' ends', r.n ? 'It has brought in ' + r.n + pl(r.n, ' order', ' orders') + ' worth ' + money(r.val) + ' so far.' : 'No orders traced to it yet.', 'To keep it going, change its end date');
      if (r.cpo != null && r.n >= 2 && r.cpo > r.val / r.n) add('act', 'Costs more than it brings', money(r.cpo), 'per order from ' + c.name, 'Its orders average ' + money(r.val / r.n) + ', so each one cost more to win than it was worth.', 'Try another channel or a stronger offer');
      if (r.st === 'run' && r.spend == null) add('note', 'Add the cost', '', 'What did ' + c.name + ' cost?', 'With the cost added, this tab shows the cost of each order and what each dollar brought back.', 'Tap Change on the campaign');
    });
    var best = rows.filter(function (r) { return r.n >= 3; }).sort(function (a, b) { return b.n - a.n || b.val - a.val; })[0];
    if (best) add('good', 'Best so far', String(best.n), 'orders from ' + best.c.name, 'Worth ' + money(best.val) + (best.ret != null ? ', ' + money(best.ret) + ' back for every $1 it cost.' : '.'), 'Do more like it');
    return out.slice(0, 2);
  }
  function todoHtml(rows, t) {
    var cards = todoCards(rows, t);
    if (!cards.length) return '';
    return '<section class="cat-todo" aria-label="What to do"><header class="cat-todo-h"><h3>What to do</h3><span>From campaign results</span></header><div class="cat-todo-g">' + cards.map(function (f) {
      return '<article class="cci-card cci-' + esc(f.tone) + '"><span class="cci-tag">' + esc(f.tag) + '</span><p class="cci-line">' + (f.big ? '<strong class="cci-big">' + esc(f.big) + '</strong> ' : '') +
        '<span class="cci-title">' + esc(f.title) + '</span></p><p class="cci-why">' + esc(f.why) + '</p><div class="cci-foot"><span class="cci-do">' + esc(f.action) + '</span></div></article>';
    }).join('') + '</div></section>';
  }
  function moreHtml(x, rows, t) {
    var key = function (k) { return x.st && x.st['o' + k] ? ' open' : ''; };
    var how = '<ul class="ccm-how">' + [
      ['Orders from promotions', 'Website orders placed through a campaign’s link or QR code, and counter, phone or WhatsApp orders where staff tapped the promotion on New order. Cancelled orders are left out.'],
      ['Order value', 'What those orders are worth, VAT included, refunds taken off. It includes orders not collected yet, so it can differ from Cake sales, which counts collected cakes.'],
      ['Cost per order', 'What the campaigns cost, divided by their orders. Only campaigns with a cost added count.'],
      ['Back per $1', 'Order value divided by cost: what each dollar spent brought back in orders.'],
      ['Before and during', 'Every cake order per day while the campaign ran, against the same number of days just before it started, counting from the launch on 13 October 2026.'],
      ['Links keep working', 'A link or QR code still counts after its campaign ends. Removing a campaign hides it; one that brought in orders is kept, so change its end date instead.']
    ].map(function (h) { return '<li><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></li>'; }).join('') + '</ul>';
    var table = rows.length ? '<div class="dx-octwrap"><table class="dx-octab ccm-table"><thead><tr><th>Campaign</th><th>Runs</th><th>Where</th><th>Promotes</th><th>Cost</th><th>Link code</th><th>Added by</th></tr></thead><tbody>' + rows.map(function (r) {
      var c = r.c;
      return '<tr><th scope="row">' + esc(c.name) + '</th><td>' + esc(runs(c, t)) + '</td><td>' + esc((c.channels || []).map(chName).join(', ') || '—') + '</td><td>' + esc(occName(c.occasion) || 'Cakes in general') +
        '</td><td>' + esc(c.spend == null ? 'Not added' : money(c.spend)) + '</td><td><code>' + esc(c.code) + '</code></td><td>' + esc(c.created_by || '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (S.removed.length ? '<p class="cat-foot">Removed: ' + esc(S.removed.map(function (c) { return c.name; }).join(', ')) + '.</p>' : '') : K().none('No campaigns yet.');
    return '<details class="cat-more" data-dxsec="catmk"' + key('catmk') + '><summary><b>Details</b><span>How campaigns are counted, and every campaign</span></summary><div class="cat-more-b">' +
      '<details class="cat-sub" data-dxsec="catmkhow"' + key('catmkhow') + '><summary><span>How campaigns are counted</span></summary><div class="cat-sub-b">' + how + '</div></details>' +
      '<details class="cat-sub" data-dxsec="catmkall"' + key('catmkall') + '><summary><span>Every campaign</span><em>' + esc(String(rows.length)) + '</em></summary><div class="cat-sub-b">' + table + '</div></details>' +
      '</div></details>';
  }
  function K() { return global.CCAnalyticsTabs.kit; }
  function page(x) {
    lastX = x;
    var Kt = K(), t = x.today();
    load(false);
    var R = results(x, t), rows = R.rows, traced = [], run = [], soon = [];
    rows.forEach(function (r) { traced = traced.concat(r.list); if (r.st === 'run') run.push(r); if (r.st === 'soon') soon.push(r); });
    var linkN = traced.filter(isLink).length, val = traced.reduce(function (s, o) { return s + net(o); }, 0);
    var costed = rows.filter(function (r) { return r.spend != null; }), spend = 0, costedN = 0, costedV = 0;
    costed.forEach(function (r) { spend += r.spend; costedN += r.n; costedV += r.val; });
    var cpo = spend > 0 && costedN ? spend / costedN : null, back = spend > 0 ? costedV / spend : null;
    var runOrders = []; run.forEach(function (r) { runOrders = runOrders.concat(r.list); });
    var loading = S.st === 'idle' || S.st === 'loading';
    var first = run.slice().sort(function (a, b) { return a.c.ends_on < b.c.ends_on ? -1 : 1; })[0], next = soon[0];
    var kpis = [
      Kt.kpi(x, 'green', 'Running now', loading ? '…' : String(run.length), loading ? 'Loading campaigns' : first ? 'First to end: ' + first.c.name + ', ' + dm(first.c.ends_on) : next ? 'Next: ' + next.c.name + ', from ' + dm(next.c.starts_on) : S.list.length ? 'None running today' : 'No campaigns yet', runOrders, 'Orders from campaigns running now'),
      Kt.kpi(x, 'purple', 'Orders from promotions', loading ? '…' : x.num(traced.length), traced.length ? x.num(linkN) + ' by link or QR code · ' + x.num(traced.length - linkN) + ' tapped at the counter' : 'Through a campaign’s link, QR code or counter tap', traced, 'Orders from promotions'),
      Kt.kpi(x, 'blue', 'Order value', loading ? '…' : x.money(val), traced.length ? 'Average ' + money(val / traced.length) + ' an order · cancelled ones left out' : 'What those orders are worth', traced, 'Orders from promotions'),
      Kt.kpi(x, 'amber', 'Cost per order', loading ? '…' : cpo != null ? money(cpo) : spend > 0 ? 'No orders yet' : '—', cpo != null ? money(spend) + ' cost · ' + money(back) + ' back per $1' : spend > 0 ? money(spend) + ' spent so far' : 'Add what a campaign cost to see this', null, '')
    ];
    var body;
    if (loading && !S.list.length) body = '<p class="cat-none">Loading campaigns…</p>';
    else if (S.st === 'error' && !S.list.length) body = '<div class="cat-none ccm-err"><p>' + esc(S.err || 'The campaigns could not be loaded.') + '</p><button type="button" class="ccs-btn ccs-ghost" data-ccm-retry>Try again</button></div>';
    else if (!rows.length) body = emptyState();
    else {
      var max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0);
      body = '<div class="ccm-list">' + rows.map(function (r) { return row(x, Kt, r, max, t); }).join('') + '</div>';
    }
    var main = Kt.card('Campaign results', 'Orders traced to each campaign', body, 'cat-main ccm-main');
    var side = [
      Kt.card('How orders were traced', 'Orders from promotions', Kt.donut(x, 'How orders were traced', [{ l: 'Link or QR code', v: linkN, list: traced.filter(isLink) }, { l: 'Tapped at the counter', v: traced.length - linkN, list: traced.filter(function (o) { return !isLink(o); }) }], x.num, 'orders') || Kt.none('No orders from promotions yet.')),
      liftCard(x, Kt, rows, t),
      R.other.length ? Kt.card('Other links on orders', 'Not set up as campaigns here', Kt.bars(x, R.other.slice(0, 6).map(function (o) { return { l: o.name, v: o.list.length, list: o.list, t: 'Orders through ' + o.name }; }), x.num, 'purple') + '<p class="cat-foot">For example a PDF catalogue link, or a campaign that was removed.</p>') : null
    ];
    return Kt.frame('mk', x, { tools: topBar(), kpis: kpis, main: main, side: side, todoHtml: todoHtml(rows, t), moreHtml: moreHtml(x, rows, t) });
  }

  // ---------- QR code ----------
  function qr(text) { var q = global.CCQRCode(0, 'M'); q.addData(text); q.make(); return q; }
  function qrSvg(q) {
    var n = q.getModuleCount(), m = 4, size = n + m * 2, d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!q.isDark(r, c)) continue;
        var s = c; while (c + 1 < n && q.isDark(r, c + 1)) c++;
        d += 'M' + (s + m) + ' ' + (r + m) + 'h' + (c - s + 1) + 'v1h-' + (c - s + 1) + 'z';
      }
    }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="QR code for the campaign link" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="#fff"></rect><path d="' + d + '" fill="#000"></path></svg>';
  }
  function qrCanvas(q) {
    var n = q.getModuleCount(), m = 4, cell = Math.max(8, Math.floor(1200 / (n + m * 2))), size = (n + m * 2) * cell;
    var cv = doc.createElement('canvas'); cv.width = size; cv.height = size;
    var g = cv.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
    return cv;
  }
  function savePng(c, btn) {
    try {
      var cv = qrCanvas(qr(link(c))), name = 'corner-cafe-qr-' + c.code + '.png';
      var go = function (href, revoke) {
        var a = doc.createElement('a'); a.href = href; a.download = name; a.rel = 'noopener'; doc.body.appendChild(a); a.click();
        setTimeout(function () { a.remove(); if (revoke) URL.revokeObjectURL(href); }, 1500);
        flash(btn, 'Downloaded');
      };
      if (cv.toBlob) cv.toBlob(function (b) { if (b) go(URL.createObjectURL(b), true); else go(cv.toDataURL('image/png'), false); }, 'image/png');
      else go(cv.toDataURL('image/png'), false);
    } catch (e) { console.warn('[Campaigns] QR download', e); flash(btn, 'Could not download'); }
  }
  function flash(btn, text) {
    if (!btn) return;
    if (!btn.dataset.was) btn.dataset.was = btn.textContent;
    btn.textContent = text;
    clearTimeout(btn.__t); btn.__t = setTimeout(function () { btn.textContent = btn.dataset.was; }, 2200);
  }
  function copyLink(text, input, btn) {
    var done = function () { flash(btn, 'Copied'); };
    var fallback = function () { try { input.focus(); input.select(); input.setSelectionRange(0, text.length); if (doc.execCommand('copy')) done(); else flash(btn, 'Select and copy'); } catch (e) { flash(btn, 'Select and copy'); } };
    try { if (global.navigator.clipboard && global.navigator.clipboard.writeText) global.navigator.clipboard.writeText(text).then(done, fallback); else fallback(); } catch (e) { fallback(); }
  }

  // ---------- the campaign window (add, change, share) ----------
  // A window of its own, not a native modal <dialog>: a modal dialog sits in the browser's top layer and makes the rest
  // of the page inert, so the app's calendar (the shared date picker, a layer at z-index 2147483000 in the page body)
  // would open behind it and not respond. This window sits just below the calendar, and the app behind it is made
  // inert while it is open. Escape and the Tab key stay inside it; closing it puts the focus back where it was.
  var opener = null, openerSel = null, pend = null, serial = 0;
  function layer() {
    var root = doc.getElementById('cc-staff');
    if (!root) return null;
    var L = doc.getElementById('ccm-layer');
    if (L && L.parentNode !== root) { L.remove(); L = null; }
    if (!L) {
      L = doc.createElement('div'); L.id = 'ccm-layer'; L.className = 'ccm-layer'; L.hidden = true;
      L.innerHTML = '<div class="ccm-shade" data-ccm-shade></div><div class="ccm-dlg" id="ccm-dlg" role="dialog" aria-modal="true" aria-labelledby="ccm-dlg-h" tabindex="-1"></div>';
      root.appendChild(L);
      var d = L.querySelector('#ccm-dlg');
      L.addEventListener('click', onDlgClick);
      d.addEventListener('submit', onSubmit);
      d.addEventListener('change', onDlgChange);
    }
    return L;
  }
  function dlgEl() { var L = doc.getElementById('ccm-layer'); return L && L.isConnected && !L.hidden ? L.querySelector('#ccm-dlg') : null; }
  function isOpen() { return !!dlgEl(); }
  function appInert(on) {
    var app = doc.querySelector('#cc-staff > .ccs-app');
    if (app) { if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert'); }
  }
  function focusIn(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} } }
  function cssq(v) { return global.CSS && global.CSS.escape ? global.CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'); }
  function show(html, state) {
    var L = layer(); if (!L) return;
    var d = L.querySelector('#ccm-dlg');
    if (L.hidden) {
      var a = doc.activeElement;
      opener = pend && pend.el ? pend.el : a && a !== doc.body ? a : null;
      openerSel = pend && pend.sel ? pend.sel : null;
      L.hidden = false; appInert(true);
    }
    pend = null;
    state.token = ++serial; D = state; d.innerHTML = html; d.scrollTop = 0;
    focusIn(d.querySelector('[data-focus]') || d);
  }
  function hide() {
    var L = doc.getElementById('ccm-layer'), was = !!(L && !L.hidden);
    D = null; pend = null;
    if (L) { L.hidden = true; var d = L.querySelector('#ccm-dlg'); if (d) d.innerHTML = ''; }
    appInert(false);
    if (was) focusIn(opener && opener.isConnected ? opener : openerSel ? doc.querySelector(openerSel) : null);
    opener = null; openerSel = null;
  }
  // Cancel and Escape: from Change opened on a campaign's link window, back to that window; otherwise close
  function back() { if (D && D.mode === 'form' && D.id && D.from === 'share') openShare(D.id); else hide(); }
  function focusables(box) {
    return [].slice.call(box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.tabIndex >= 0 && !el.hidden && el.getClientRects().length > 0; });
  }
  // A date set here also updates the app's calendar button, which follows input and change events
  function setDate(el, v) {
    if (!el) return;
    el.value = v;
    if (D) D.syncing = true;
    try { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    finally { if (D) D.syncing = false; }
  }
  function markLen(d) { d.querySelectorAll('[data-ccd="len"]').forEach(function (x) { x.setAttribute('aria-pressed', String(!!D && D.len === +x.getAttribute('data-v'))); }); }
  function clearErr(d, field) {
    var p = d.querySelector('[data-err="' + field + '"]'); if (p && !p.hidden) { p.hidden = true; p.textContent = ''; }
    if (field === 'dates') d.querySelectorAll('#ccm-from,#ccm-to').forEach(function (x) { x.removeAttribute('aria-invalid'); if (x._ccDateButton) x._ccDateButton.removeAttribute('aria-invalid'); });
  }
  // Dates chosen in the calendar: a length chosen with 1 week, 2 weeks or 30 days keeps its length when the start moves;
  // choosing the end yourself drops it
  function onDlgChange(e) {
    var t = e.target, d = dlgEl();
    if (!d || !D || D.mode !== 'form' || D.syncing || !t || (t.id !== 'ccm-from' && t.id !== 'ccm-to')) return;
    var fromEl = d.querySelector('#ccm-from'), toEl = d.querySelector('#ccm-to');
    if (t.id === 'ccm-from') {
      toEl.min = fromEl.value || '';
      if (D.len && fromEl.value) setDate(toEl, addDays(fromEl.value, D.len - 1));
    } else { D.len = null; markLen(d); }
    clearErr(d, 'dates');
  }
  function head(title, sub) {
    return '<header class="ccm-dh"><div><h2 id="ccm-dlg-h">' + esc(title) + '</h2>' + (sub || '') + '</div><button type="button" class="ccm-x" data-ccd="close" aria-label="Close">&times;</button></header>';
  }
  function openForm(id, from) {
    var c = id ? byId(id) : null, t = today(), occ = (lastX && lastX.data && lastX.data.occasions) || [];
    if (id && !c) return;
    if (c && !S.canEdit) return;
    var v = c || { name: '', starts_on: t, ends_on: '', channels: [], occasion: '', spend: null };
    var opts = '<option value="">Cakes in general</option>' + occ.filter(function (o) { return o.c && o.c !== 'not_specified' && o.c !== 'other'; }).map(function (o) {
      return '<option value="' + esc(o.c) + '"' + (v.occasion === o.c ? ' selected' : '') + '>' + esc(o.l) + '</option>';
    }).join('') + (v.occasion && !occ.some(function (o) { return o.c === v.occasion; }) ? '<option value="' + esc(v.occasion) + '" selected>' + esc(pretty(v.occasion)) + '</option>' : '');
    var html = '<form class="ccm-in ccm-form" novalidate>' + head(c ? 'Change campaign' : 'Add campaign') +
      (c ? '<p class="ccm-intro">Its link and QR code stay the same, so anything already shared keeps working.</p>' : '<p class="ccm-intro">It gets its own link and QR code. Orders that come through them, or that staff tap on New order, show on the Marketing tab.</p>') +
      '<p class="ccs-err ccm-gerr" data-err="all" role="alert" hidden></p>' +
      '<div class="ccm-f"><label class="sl-k" for="ccm-name">Campaign name <em class="sl-req">Required</em></label><input class="ccs-input" id="ccm-name" maxlength="80" autocomplete="off" placeholder="For example: Christmas cakes" value="' + esc(v.name) + '" data-focus><p class="ccs-err" data-err="name" hidden></p></div>' +
      '<div class="ccm-f"><span class="sl-k" id="ccm-when">When it runs <em class="sl-req">Required</em></span><div class="ccm-dates" role="group" aria-labelledby="ccm-when">' +
      '<div class="ccm-d"><label for="ccm-from">Starts</label><input class="ccs-input" type="date" id="ccm-from" value="' + esc(v.starts_on || '') + '"></div>' +
      '<div class="ccm-d"><label for="ccm-to">Ends</label><input class="ccs-input" type="date" id="ccm-to" value="' + esc(v.ends_on || '') + '"' + (v.starts_on ? ' min="' + esc(v.starts_on) + '"' : '') + '></div></div>' +
      '<div class="ccs-chips ccm-quick" role="group" aria-label="How long it runs">' + [['7', '1 week'], ['14', '2 weeks'], ['30', '30 days']].map(function (q) { return '<button type="button" class="ccs-chip" data-ccd="len" data-v="' + q[0] + '" aria-pressed="false">' + q[1] + '</button>'; }).join('') + '</div><p class="ccs-err" data-err="dates" hidden></p></div>' +
      '<div class="ccm-f"><span class="sl-k" id="ccm-where">Where it runs <em class="sl-opt">Optional · pick any</em></span><div class="ccs-chips" role="group" aria-labelledby="ccm-where">' +
      CHANNELS.map(function (ch) { return '<button type="button" class="ccs-chip" data-ccd="ch" data-v="' + ch[0] + '" aria-pressed="' + ((v.channels || []).indexOf(ch[0]) > -1) + '">' + esc(ch[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="ccm-f"><label class="sl-k" for="ccm-occ">What it promotes <em class="sl-opt">Optional</em></label><select class="ccs-input" id="ccm-occ">' + opts + '</select><p class="ccs-hint">The link opens the order form with this occasion already chosen.</p></div>' +
      '<div class="ccm-f"><label class="sl-k" for="ccm-spend">What it cost <em class="sl-opt">Optional</em></label><div class="ccm-money"><span aria-hidden="true">$</span><input class="ccs-input" id="ccm-spend" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(v.spend == null ? '' : String(v.spend)) + '"></div>' +
      '<p class="ccs-hint">Fiji dollars, for ads, boosting and printing. You can add it later.</p><p class="ccs-err" data-err="spend" hidden></p></div>' +
      '<div class="ccm-acts"><button type="submit" class="ccs-btn ccs-new" data-ccd="save">Save campaign</button><button type="button" class="ccs-btn ccs-ghost" data-ccd="cancel">Cancel</button></div></form>';
    show(html, { mode: 'form', id: c ? c.id : null, from: from || null });
  }
  function fieldErr(d, field, msg) {
    d.querySelectorAll('[data-err]').forEach(function (p) { p.hidden = true; p.textContent = ''; });
    var p = d.querySelector('[data-err="' + (field || 'all') + '"]') || d.querySelector('[data-err="all"]');
    if (p) { p.textContent = msg; p.hidden = false; }
    var input = field === 'name' ? '#ccm-name' : field === 'dates' ? (d.querySelector('#ccm-from').value ? '#ccm-to' : '#ccm-from') : field === 'spend' ? '#ccm-spend' : null;
    var el = input && d.querySelector(input), target = el && (el._ccDateButton || el);   // dates: the calendar button
    if (el) {
      el.setAttribute('aria-invalid', 'true'); if (el._ccDateButton) el._ccDateButton.setAttribute('aria-invalid', 'true');
      focusIn(target); try { target.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    } else if (p) p.scrollIntoView({ block: 'nearest' });
  }
  function onSubmit(e) {
    var f = e.target, d = dlgEl();
    if (!d || !f || !f.classList || !f.classList.contains('ccm-form')) return;
    e.preventDefault();
    if (!D || D.mode !== 'form' || D.busy) return;
    d.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var name = d.querySelector('#ccm-name').value.trim(), from = d.querySelector('#ccm-from').value, to = d.querySelector('#ccm-to').value;
    var spend = d.querySelector('#ccm-spend').value.trim(), occ = d.querySelector('#ccm-occ').value;
    var ch = [].slice.call(d.querySelectorAll('[data-ccd="ch"][aria-pressed="true"]')).map(function (b) { return b.getAttribute('data-v'); });
    if (name.length < 2) return fieldErr(d, 'name', 'Give the campaign a name.');
    if (!from || !to) return fieldErr(d, 'dates', 'Choose the day it starts and the day it ends.');
    if (to < from) return fieldErr(d, 'dates', 'The end date cannot be before the start date.');
    if (days(from, to) > 366) return fieldErr(d, 'dates', 'A campaign can run for a year at most.');
    if (spend && !/^\$?\s*[\d,]*\.?\d+\s*$/.test(spend)) return fieldErr(d, 'spend', 'Enter the cost as a number, for example 150, or leave it empty.');
    var btn = d.querySelector('[data-ccd="save"]'), id = D.id, token = D.token;
    var here = function () { return !!D && D.mode === 'form' && D.token === token; };   // still on this form
    D.busy = true; btn.disabled = true; btn.textContent = 'Saving…';
    call('campaign_save', { p: { id: id, name: name, starts_on: from, ends_on: to, channels: ch, occasion: occ || null, spend: spend ? spend.replace(/[$,\s]/g, '') : null } }).then(function (r) {
      if (r && r.error) throw r.error;
      var res = r && r.data;
      if (here()) { D.busy = false; btn.disabled = false; btn.textContent = 'Save campaign'; }
      if (!res || !res.ok) {
        if (here()) fieldErr(d, res && res.field, (res && res.message) || 'The campaign was not saved. Try again.');
        else toast('The campaign was not saved. ' + ((res && res.message) || 'Try again.'), true);
        return;
      }
      var c = res.campaign, i = S.list.map(function (x) { return x.id; }).indexOf(c.id);
      if (i > -1) S.list[i] = c; else S.list.unshift(c);
      if (S.st !== 'ready') S.st = 'ready';
      A.st = 'idle';                                        // New order picks up the change
      if (here()) openShare(c.id, id ? 'Saved.' : 'Campaign added. Share its link or QR code to start counting.');
      else toast(c.name + (id ? ' saved' : ' added'));
      refresh(); load(true);
    }).catch(function (err) {
      console.warn('[Campaigns] save', err);
      if (!here()) { toast('No connection, so the campaign was not saved.', true); return; }
      D.busy = false; btn.disabled = false; btn.textContent = 'Save campaign';
      fieldErr(d, null, 'No connection, so the campaign was not saved. Check the connection and try again.');
    });
  }
  function openShare(id, note) {
    var c = byId(id); if (!c) return;
    var t = today(), url = link(c), x = lastX, r = null;
    if (x) { try { r = results(x, t).rows.filter(function (y) { return y.c.id === c.id; })[0]; } catch (e) { r = null; } }
    var q = null; try { q = qr(url); } catch (e) { console.warn('[Campaigns] QR', e); }
    var figs = r ? '<div class="ccm-mini">' + [[count0(r.n), pl(r.n, 'order', 'orders')], [money(r.val), 'order value'], [r.cpo == null ? '—' : money(r.cpo), 'per order']].map(function (f) {
      return '<div><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>';
    }).join('') + '</div>' + (r.n ? '<button type="button" class="ccs-btn ccs-ghost ccm-seeorders" data-ccd="orders">See the ' + r.n + pl(r.n, ' order', ' orders') + '</button>' : '') : '';
    var meta = [runs(c, t)]; if (c.channels && c.channels.length) meta.push(c.channels.map(chName).join(', ')); if (c.occasion) meta.push('promotes ' + occName(c.occasion));
    var html = '<div class="ccm-in ccm-share-w">' + head(c.name, '<p class="ccm-sub"><span class="ccm-st is-' + stateOf(c, t) + '">' + esc(stateText(c, t)) + '</span> ' + esc(meta.join(' · ')) + '</p>') +
      (note ? '<p class="ccm-ok" role="status">' + esc(note) + '</p>' : '') +
      '<section class="ccm-sec"><label class="sl-k" for="ccm-url">Campaign link</label><div class="ccm-linkrow"><input class="ccs-input" id="ccm-url" readonly value="' + esc(url) + '">' +
      '<button type="button" class="ccs-btn ccs-new" data-ccd="copy" data-focus>Copy link</button>' + (global.navigator && global.navigator.share ? '<button type="button" class="ccs-btn ccs-ghost" data-ccd="sharenow">Share</button>' : '') + '</div>' +
      '<p class="ccs-hint">Put it in posts, ads, WhatsApp messages and emails. It opens the cake order form' + (c.occasion ? ' with ' + esc(occName(c.occasion)) + ' already chosen' : '') + '.</p></section>' +
      '<section class="ccm-sec ccm-qr"><div class="ccm-qrimg">' + (q ? qrSvg(q) : '<p class="cat-none">The QR code could not be made.</p>') + '</div><div class="ccm-qrtxt"><b>QR code</b><p>Print it on flyers, posters and the counter card. Scanning it opens the same link.</p>' +
      (q ? '<button type="button" class="ccs-btn ccs-ghost" data-ccd="png">Download QR code</button>' : '') + '</div></section>' +
      '<section class="ccm-sec ccm-counter"><b>At the counter</b><p>' + (stateOf(c, t) === 'ended' ? 'It has ended, so New order no longer offers it. Its link still counts.' : 'While it runs, staff tap “' + esc(c.name) + '” under “Came from a promotion?” on New order.') + '</p></section>' +
      (r ? '<section class="ccm-sec ccm-res"><b>So far</b>' + figs + '</section>' : '') +
      '<footer class="ccm-foot">' + (S.canEdit ? '<button type="button" class="ccs-btn ccs-ghost" data-ccd="edit">Change details</button><button type="button" class="ccs-link ccm-rm" data-ccd="remove">Remove campaign</button>' : '') +
      '<button type="button" class="ccs-btn ccs-ghost ccm-close" data-ccd="close">Close</button></footer><div class="ccm-confirm" hidden></div></div>';
    show(html, { mode: 'share', id: c.id, n: r ? r.n : 0 });
  }
  function askRemove(d) {
    var c = byId(D.id), box = d.querySelector('.ccm-confirm'); if (!c || !box) return;
    if (D.n > 0) box.innerHTML = '<p>' + D.n + pl(D.n, ' order came', ' orders came') + ' from this campaign, so it is kept. To stop it, change its end date.</p><div class="ccm-acts"><button type="button" class="ccs-btn ccs-ghost" data-ccd="keep">OK</button></div>';
    else box.innerHTML = '<p><b>Remove ' + esc(c.name) + '?</b> It disappears from this tab and from New order. Its link stops being counted as a campaign.</p><div class="ccm-acts"><button type="button" class="ccs-btn ccm-danger" data-ccd="confirm">Remove</button><button type="button" class="ccs-btn ccs-ghost" data-ccd="keep">Keep it</button></div>';
    box.hidden = false; box.scrollIntoView({ block: 'nearest' });
    var b = box.querySelector('button'); if (b) b.focus();
  }
  function doRemove(d, btn) {
    var c = byId(D.id); if (!c || D.busy) return;
    D.busy = true; btn.disabled = true; btn.textContent = 'Removing…';
    call('campaign_remove', { p_id: c.id }).then(function (r) {
      if (r && r.error) throw r.error;
      var res = r && r.data;
      if (D) D.busy = false;
      if (!res || !res.ok) { btn.disabled = false; btn.textContent = 'Remove'; var box = d.querySelector('.ccm-confirm'); if (box) box.innerHTML = '<p class="ccs-err">' + esc((res && res.message) || 'The campaign was not removed. Try again.') + '</p>'; return; }
      S.list = S.list.filter(function (x) { return x.id !== c.id; }); S.removed.push({ code: c.code, name: c.name }); A.st = 'idle';
      hide(); toast(c.name + ' removed'); refresh(); load(true);
    }).catch(function (err) {
      console.warn('[Campaigns] remove', err);
      if (D) D.busy = false; btn.disabled = false; btn.textContent = 'Remove';
      var box = d.querySelector('.ccm-confirm'); if (box) box.innerHTML = '<p class="ccs-err">No connection, so nothing changed. Try again.</p>';
    });
  }
  function toast(msg, bad) { var a = api(); try { if (a && a.toast) a.toast(msg, !!bad); } catch (e) {} }
  // A figure in the window opens the same order list as the tab: the window closes and the app's list opens
  function openOrders(id) {
    var c = byId(id), x = lastX; if (!c || !x) return;
    var r = results(x, today()).rows.filter(function (y) { return y.c.id === id; })[0];
    if (!r || !r.list.length) return;
    var k = x.key({ t: c.name + ': orders', l: r.list }), main = doc.getElementById('ccs-main');
    hide();
    if (!main) return;
    var b = doc.createElement('button'); b.type = 'button'; b.hidden = true; b.setAttribute('data-act', 'dx-drill'); b.setAttribute('data-v', k);
    main.appendChild(b); b.click(); b.remove();
  }
  function onDlgClick(e) {
    var d = dlgEl(); if (!d || !e.target.closest) return;
    if (e.target.closest('[data-ccm-shade]')) { if (D && D.mode === 'share') hide(); return; }   // a tap outside the window
    var b = e.target.closest('[data-ccd]'); if (!b || !D) return;
    var k = b.getAttribute('data-ccd');
    if (k === 'close') { e.preventDefault(); hide(); }
    else if (k === 'cancel') { e.preventDefault(); back(); }
    else if (k === 'ch') { e.preventDefault(); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }
    else if (k === 'len') {
      e.preventDefault();
      var fromEl = d.querySelector('#ccm-from'), toEl = d.querySelector('#ccm-to'), n = +b.getAttribute('data-v');
      D.len = n;
      if (!fromEl.value) setDate(fromEl, today());
      toEl.min = fromEl.value;
      setDate(toEl, addDays(fromEl.value, n - 1));
      markLen(d); clearErr(d, 'dates');
    }
    else if (k === 'copy') { e.preventDefault(); var c1 = byId(D.id); if (c1) copyLink(link(c1), d.querySelector('#ccm-url'), b); }
    else if (k === 'sharenow') { e.preventDefault(); var c2 = byId(D.id); if (c2 && global.navigator.share) global.navigator.share({ title: c2.name, url: link(c2) }).catch(function () {}); }
    else if (k === 'png') { e.preventDefault(); var c3 = byId(D.id); if (c3) savePng(c3, b); }
    else if (k === 'edit') { e.preventDefault(); openForm(D.id, 'share'); }
    else if (k === 'remove') { e.preventDefault(); askRemove(d); }
    else if (k === 'keep') { e.preventDefault(); var bx = d.querySelector('.ccm-confirm'); if (bx) { bx.hidden = true; bx.innerHTML = ''; } }
    else if (k === 'confirm') { e.preventDefault(); doRemove(d, b); }
    else if (k === 'orders') { e.preventDefault(); openOrders(D.id); }
  }

  // ---------- New order: "Came from a promotion?" ----------
  function loadActive() {
    if (A.busy || !api()) return;
    A.busy = true; if (A.st === 'idle') A.st = 'loading';
    call('campaigns_active').then(function (r) {
      A.busy = false; A.at = Date.now();
      var d = r && r.data;
      A.list = d && d.ok ? (d.campaigns || []) : []; A.st = 'ready';
      fillSlots();
    }).catch(function (e) { A.busy = false; A.st = 'ready'; A.at = Date.now() - 540000; console.warn('[Campaigns] running', e); fillSlots(); });
  }
  function chipsInner(V) {
    var list = A.list || [];
    if (V && V.campaign && !list.some(function (c) { return c.code === V.campaign; })) V.campaign = null;
    if (!list.length) return '';
    return '<div class="sl-sub ccp"><span class="sl-k">Came from a promotion? <em class="sl-opt">Optional</em></span><div class="ccs-chips" role="group" aria-label="Came from a promotion">' +
      list.map(function (c) { return '<button type="button" class="ccs-chip" data-ccp="' + esc(c.code) + '" aria-pressed="' + (!!V && V.campaign === c.code) + '">' + esc(c.name) + '</button>'; }).join('') + '</div></div>';
  }
  function fillSlots() { doc.querySelectorAll('#cc-staff [data-ccp-slot]').forEach(function (s) { s.innerHTML = chipsInner(lastV); }); }
  function chips(V) {
    try {
      lastV = V || null;
      if (A.st === 'idle' || (A.st === 'ready' && Date.now() - A.at > 600000)) loadActive();
      return '<div class="ccp-slot" data-ccp-slot>' + (A.st === 'ready' ? chipsInner(V) : '') + '</div>';
    } catch (e) { console.warn('[Campaigns] chips', e); return ''; }
  }

  // ---------- taps on the page ----------
  if (doc && !global.__ccCampaignClicks) {
    global.__ccCampaignClicks = true;
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null; if (!t) return;
      var b = t.closest('#cc-staff [data-ccp]');
      if (b) {
        e.preventDefault();
        if (!lastV) return;
        var code = b.getAttribute('data-ccp');
        lastV.campaign = lastV.campaign === code ? null : code;
        lastV.restored = false;
        var box = b.closest('[data-ccp-slot]') || doc;
        box.querySelectorAll('[data-ccp]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-ccp') === lastV.campaign)); });
        return;
      }
      if (t.closest('#ccm-layer')) return;
      var v;
      if ((b = t.closest('#cc-staff [data-ccm-add]'))) { e.preventDefault(); pend = { el: b, sel: '#cc-staff [data-ccm-add]' }; openForm(null); return; }
      if ((b = t.closest('#cc-staff [data-ccm-open]'))) { e.preventDefault(); v = b.getAttribute('data-ccm-open'); pend = { el: b, sel: '#cc-staff [data-ccm-open="' + cssq(v) + '"]' }; openShare(v); return; }
      if ((b = t.closest('#cc-staff [data-ccm-edit]'))) { e.preventDefault(); v = b.getAttribute('data-ccm-edit'); pend = { el: b, sel: '#cc-staff [data-ccm-edit="' + cssq(v) + '"]' }; openForm(v, 'row'); return; }
      if ((b = t.closest('#cc-staff [data-ccm-retry]'))) { e.preventDefault(); S.st = 'loading'; load(true); refresh(); }
    });
    // Escape and Tab while the window is open (the calendar, when open on top, handles its own keys)
    doc.addEventListener('keydown', function (e) {
      var d = dlgEl(); if (!d) return;
      var pick = doc.getElementById('cc-date-picker-layer');
      if (pick && !pick.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); back(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(d), i = f.indexOf(doc.activeElement);
      if (!f.length) { e.preventDefault(); focusIn(d); return; }
      if (i < 0) { e.preventDefault(); focusIn(f[e.shiftKey ? f.length - 1 : 0]); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); focusIn(f[0]); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); focusIn(f[f.length - 1]); }
    }, true);
    // The phone's back button moves the app on; the window closes with it
    global.addEventListener('popstate', function () { if (isOpen()) hide(); });
  }

  if (global.CCAnalyticsTabs && typeof global.CCAnalyticsTabs.register === 'function') global.CCAnalyticsTabs.register('mk', page);
  else console.warn('[Campaigns] Analytics tabs not found; the Marketing tab keeps its previous layout');
  global.CCCampaigns = { version: VERSION, count: countAll, latest: latest, chips: chips, link: link, page: page, _state: function () { return { S: S, A: A }; } };
})(typeof window !== 'undefined' ? window : globalThis);
