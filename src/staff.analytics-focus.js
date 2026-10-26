/* Corner Café Service Hub: Analytics, calmer and decision-first (26 October 2026).
 * Roneel: "humanise the analytics section, the texts are too much. It has to be sleek yet powerful, so decisions can be
 * made from it." Every tab answers its question with the decision first, at most four numbers and two or three charts.
 * Explanations sit behind a small "i" on each card; secondary charts move into Details at the bottom (nothing deleted).
 * Tabs with no data yet are hidden. Figures, calculations and downloads are unchanged. The Overview's Cake Heartbeat,
 * Daily Cake Demand and the seasonal buildup are not touched. If this file fails, Analytics shows as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccAnalyticsFocus20261026) return;
  win.__ccAnalyticsFocus20261026 = true;

  // Charts that move into Details, per tab (by their title). Everything stays one tap away.
  var MOVE = {
    sl: ['Busiest pickup days', 'Money'],
    pd: ['Flavours', 'Favourite cake by occasion'],
    cu: ['How they ordered'],
    pl: ['Order stages', 'When cakes are collected'],
    sd: ['Occasion by month', 'Booking curve', 'Occasion by lead time', 'Year on year, by event date', 'What the data shows', 'Data gaps']
  };
  // Second lines on the number cards are kept only where they change the decision
  var KEEP_CAP = /owed|not confirmed|to collect/i;
  // Occasions: the numbers kept (the other two move behind "i")
  var OI_KEEP = /^(Orders|Revenue|Median lead time|Peak month)$/;
  var open = {}, filtOpen = false;

  function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function warn(w, e) { try { console.warn('[Analytics focus] ' + w, e); } catch (_) {} }

  // A small "i" that shows the explanation lines of a card
  function infoBtn(host, key, label) {
    if (host.querySelector(':scope > .ccf-i')) return;
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccf-i'; b.setAttribute('data-ccf-key', key);
    b.setAttribute('aria-label', 'About ' + (label || 'this chart')); b.setAttribute('aria-expanded', String(!!open[key]));
    b.innerHTML = '<span aria-hidden="true">i</span>';
    host.appendChild(b);
  }
  function mark(card, key) { card.classList.add('ccf-card'); card.setAttribute('data-ccf-key', key); card.classList.toggle('ccf-open', !!open[key]); }

  function cards(page) {
    return [].filter.call(page.querySelectorAll('section.cat-card, section.dx-card'), function (c) { return !c.closest('.cat-more') && !c.closest('.ccf-more'); });
  }
  function title(c) { return txt(c.querySelector(':scope > header > h3, :scope > h3')); }

  function moreBox(page) {
    var more = page.querySelector(':scope > details.cat-more .cat-more-b'); if (!more) return null;
    var box = more.querySelector(':scope > details.ccf-more');
    if (!box) {
      box = doc.createElement('details'); box.className = 'cat-sub ccf-more';
      box.innerHTML = '<summary><span>More charts</span><em></em></summary><div class="ccf-more-b"></div>';
      more.insertBefore(box, more.firstChild);
    }
    return box;
  }

  function tidyPage(page) {
    var cat = page.getAttribute('data-cat');
    // 1. The decision first: "What to do" right under the filters
    var todo = page.querySelector(':scope > section.cat-todo'), first = page.querySelector(':scope > .cat-kpis, :scope > .cat-oi');
    if (todo && first && todo.nextElementSibling !== first) page.insertBefore(todo, first);
    if (todo) { var th = todo.querySelector('.cat-todo-h h3'); if (th && th.textContent !== 'What to do now') th.textContent = 'What to do now'; }
    // 2. Short period line ("Since the launch, by pickup date." instead of two sentences)
    var per = page.querySelector(':scope > p.dx-period');
    if (per && !per.hasAttribute('data-ccf')) {
      per.setAttribute('data-ccf', '1');
      [].forEach.call(per.childNodes, function (n) { if (n.nodeType === 3 && n.nodeValue.length > 40) { var m = n.nodeValue.match(/^\s*[^.]*\./); if (m) { per.title = n.nodeValue.trim(); n.nodeValue = m[0] + ' '; } } });
    }
    // 3. Number cards: second lines only where they change the decision
    [].forEach.call(page.querySelectorAll(':scope > .cat-kpis .cat-k'), function (k) { k.classList.toggle('ccf-keepcap', KEEP_CAP.test(txt(k.querySelector('.cat-k-top span')))); });
    [].forEach.call(page.querySelectorAll('.oi-kpis .ccs-kpi'), function (k) { k.classList.toggle('ccf-hide', !OI_KEEP.test(txt(k.querySelector('.ccs-kpi-l')))); });
    // 4. Occasions: the filters behind one "Filter" button, a simple orders-by-month chart
    if (cat === 'sd') occasions(page);
    // 5. Secondary charts into Details
    var want = MOVE[cat] || [], box = null;
    cards(page).forEach(function (c) {
      var t = title(c); if (want.indexOf(t) < 0) return;
      box = box || moreBox(page); if (!box) return;
      var body = box.querySelector('.ccf-more-b'), old = body.querySelector('[data-ccf-title="' + t.replace(/"/g, '') + '"]');
      if (old) old.remove();
      c.setAttribute('data-ccf-title', t); body.appendChild(c);
    });
    if (box) { var n = box.querySelectorAll('.ccf-more-b > section').length, em = box.querySelector('summary em'); if (em) em.textContent = n + ' chart' + (n === 1 ? '' : 's'); }
    // rows that lost a card: let the rest fill the width
    [].forEach.call(page.querySelectorAll(':scope > .cat-row, .cat-oi > .oi-two'), function (r) {
      var k = r.querySelectorAll(':scope > section').length;
      if (!k) { r.classList.add('ccf-hide'); return; }
      r.classList.remove('ccf-hide');
      if (r.classList.contains('cat-row')) { var nc = r.className.replace(/\bcat-n\d\b/, 'cat-n' + k); if (nc !== r.className) r.className = nc; }
      r.classList.toggle('ccf-one', k === 1);
    });
    // 6. Explanations behind "i": card subtitles and footnotes
    cards(page).forEach(function (c) {
      var t = title(c), key = cat + ':' + t, head = c.querySelector(':scope > header') || c.querySelector(':scope > h3');
      var fine = c.querySelectorAll(':scope > header > span:not(.cat-all), :scope > p.cat-foot, :scope > p.an-none, :scope > .oi-bar > span');
      if (!fine.length || !head) return;
      mark(c, key);
      if (head.tagName === 'HEADER') infoBtn(head, key, t);
      else if (!c.querySelector(':scope > .ccf-i')) { var b = doc.createElement('div'); infoBtn(b, key, t); c.insertBefore(b.firstChild, head.nextSibling); }
    });
    // 7. The "What to do" cards: the reason behind "i"
    insights(page);
    // 8. Seasonal sales card (festive treats): no long subtitle
    var ss = page.querySelector('.cc-ss'); if (ss) ss.classList.add('ccf-ss');
  }

  function insights(root) {
    [].forEach.call(root.querySelectorAll('.cci-card'), function (c) {
      var why = c.querySelector('.cci-why, .cci-compare'); if (!why) return;
      var key = 'cci:' + txt(c.querySelector('.cci-title')).slice(0, 60);
      mark(c, key);
      if (!c.querySelector(':scope > .ccf-i')) { var b = doc.createElement('div'); infoBtn(b, key, txt(c.querySelector('.cci-title'))); c.appendChild(b.firstChild); }
    });
  }

  function occasions(page) {
    var cap = page.querySelector(':scope > p.cat-cap'); if (cap) cap.classList.add('ccf-hide');
    var f = page.querySelector('.cat-oi > .oi-filters');
    if (f) {
      var sel = [].map.call(f.querySelectorAll('select'), function (s) { return s.selectedIndex > 0 ? s.options[s.selectedIndex].text : null; }).filter(Boolean);
      var label = 'Filter' + (sel.length ? ': ' + sel.join(', ') : ': all occasions, every year');
      var b = f.previousElementSibling && f.previousElementSibling.classList.contains('ccf-ftog') ? f.previousElementSibling : null;
      if (!b) { b = doc.createElement('button'); b.type = 'button'; b.className = 'ccs-btn ccs-ghost ccf-ftog'; f.parentNode.insertBefore(b, f); }
      if (b.textContent !== label) b.textContent = label;
      b.setAttribute('aria-expanded', String(filtOpen));
      f.classList.toggle('ccf-closed', !filtOpen);
    }
    // Orders by month: one simple bar chart from the month table (the full table moves into Details)
    var heat = page.querySelector('table.oi-heat:not(.oi-mx)'), oi = page.querySelector('.cat-oi');
    if (!heat || !oi) return;
    var head = [].map.call(heat.querySelectorAll('thead th, tr:first-child th'), txt), months = head.slice(1, 13);
    if (months.length !== 12) return;
    var sums = months.map(function () { return 0; });
    [].forEach.call(heat.querySelectorAll('tbody tr'), function (tr) {
      var td = tr.querySelectorAll('td');
      for (var i = 0; i < 12; i++) { var v = Number(txt(td[i]).replace(/[^\d.]/g, '')); if (v) sums[i] += v; }
    });
    var metric = txt(page.querySelector('.oi-bar .oi-tg[aria-pressed="true"], .oi-bar .oi-tg.is-on')) || 'Orders';
    var money = /revenue/i.test(metric), top = Math.max.apply(null, sums.concat([1])), best = sums.indexOf(Math.max.apply(null, sums));
    var sig = metric + '|' + sums.join(','), card = oi.querySelector(':scope > .ccf-month');
    if (card && card.getAttribute('data-sig') === sig) return;
    if (!card) {
      card = doc.createElement('section'); card.className = 'dx-card an-chart oi-wide ccf-month';
      var after = oi.querySelector(':scope > .oi-kpis'); oi.insertBefore(card, after ? after.nextSibling : oi.firstChild);
    }
    card.setAttribute('data-sig', sig);
    var fmt = function (v) { return money ? '$' + Math.round(v).toLocaleString('en-GB') : String(Math.round(v)); };
    card.innerHTML = '<h3 class="an-ct">' + esc(metric) + ' by month</h3><div class="cat-cols" style="grid-template-columns:repeat(12,minmax(0,1fr))">' + sums.map(function (v, i) {
      return '<div class="cat-col' + (v && i === best ? ' is-top' : '') + '"><span class="cat-cv">' + (v ? fmt(v) : '') + '</span><span class="cat-ct"><span class="cat-cb" style="height:' + (v ? Math.max(4, Math.round(100 * v / top)) : 0) + '%"></span></span><span class="cat-cl"><em>' + esc(months[i]) + '</em></span></div>';
    }).join('') + '</div>' + (sums.some(Boolean) ? '<p class="cat-peak"><span>Busiest: <b>' + esc(months[best]) + '</b>, ' + fmt(sums[best]) + '</span></p>' : '<p class="cat-peak"><span>No orders with these choices.</span></p>');
  }

  function tabs() {
    // Tabs with no data yet are hidden until the data arrives
    [].forEach.call(doc.querySelectorAll('#ccs-main nav.an-mods .an-mod.is-need, #ccs-main [data-g="anm"]'), function (b) {
      var empty = b.classList.contains('is-need') || /No data$/.test(txt(b));
      var cur = b.getAttribute('aria-selected') === 'true' || b.classList.contains('is-on') || b.getAttribute('aria-pressed') === 'true';
      b.classList.toggle('ccf-hide', empty && !cur);
    });
  }

  function css() {
    if (doc.getElementById('ccf-style')) return;
    var s = doc.createElement('style'); s.id = 'ccf-style';
    s.textContent = [
      '#ccs-main .ccf-hide{display:none!important}',
      // explanations hidden until "i"
      '#ccs-main .ccf-card:not(.ccf-open) > header > span:not(.cat-all),#ccs-main .ccf-card:not(.ccf-open) > p.cat-foot,#ccs-main .ccf-card:not(.ccf-open) > p.an-none,#ccs-main .ccf-card:not(.ccf-open) > .oi-bar > span{display:none}',
      '#ccs-main .ccf-card:not(.ccf-open) .cci-why,#ccs-main .ccf-card:not(.ccf-open) .cci-compare{display:none}',
      '#ccs-main .ccf-card.ccf-open > header > span,#ccs-main .ccf-card.ccf-open > p.cat-foot{display:block;margin-top:4px;color:#475467}',
      '#ccs-main .ccf-card{position:relative}#ccs-main .ccf-card > header{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;padding-right:44px}',
      '#ccs-main .ccf-card > header > h3{flex:1 1 auto}#ccs-main .ccf-card.ccf-open > header > span{flex:1 1 100%;order:3}',
      '#ccs-main .ccf-i{position:absolute;top:6px;right:6px;width:44px;height:44px;border:0;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;z-index:1}',
      '#ccs-main .ccf-i span{width:26px;height:26px;border-radius:50%;border:1.5px solid #98A2B3;color:#475467;font:italic 600 15px/23px Georgia,serif;text-align:center}',
      '#ccs-main .ccf-i[aria-expanded="true"] span{background:#E8EEF7;border-color:#31597A;color:#1E3A5F}',
      '#ccs-main .ccf-i:focus-visible{outline:3px solid #31597A;outline-offset:-4px;border-radius:12px}',
      '#ccs-main .cci-card.ccf-card{padding-right:48px}',
      // number cards: one line under the number only where it matters
      '#ccs-main .cat-kpis .cat-k:not(.ccf-keepcap) .cat-k-cap{display:none}',
      '#ccs-main .oi-kpis .ccs-kpi-s{display:none}',
      // What to do: first, calm header
      '#ccs-main .cat-page > .cat-todo{margin:4px 0 18px}#ccs-main .cat-todo-h span{display:none}',
      '#ccs-main .cat-row.ccf-one,#ccs-main .oi-two.ccf-one{grid-template-columns:1fr!important}',
      '#ccs-main .ccf-more-b{display:grid;gap:14px;padding:8px 0}',
      '#ccs-main .ccf-ftog{margin:0 0 12px}#ccs-main .oi-filters.ccf-closed{display:none!important}',
      '#ccs-main .ccf-month .cat-cols{min-height:180px}',
      // festive treats card: no long subtitle, one line under the first number only
      '#ccs-main .ccf-ss .cc-ss-head p{display:none}#ccs-main .ccf-ss .cc-ss-kpi:not(:first-child) small{display:none}',
      // type weight by device (computers unchanged): phones lighter and smoothed, tablets a step heavier
      '@media (max-width:759px){#ccs-main .cat-page,#ccs-main #cc-insights{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}#ccs-main .cat-page h2,#ccs-main .cat-page h3,#ccs-main .cat-k strong,#ccs-main .cci-big{font-weight:600}#ccs-main .cat-page .cat-cl,#ccs-main .cat-page .cat-cv,#ccs-main .cci-title{font-weight:400}#ccs-main .ccf-i{width:48px;height:48px;top:2px;right:2px}}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){#ccs-main .cat-page p,#ccs-main .cat-k-cap,#ccs-main .cat-cl,#ccs-main .cci-title,#ccs-main .cci-why,#ccs-main .cci-do{font-weight:500}#ccs-main .ccf-i{width:54px;height:54px;top:2px;right:2px}#ccs-main .ccf-i span{width:30px;height:30px;line-height:27px;font-size:17px}}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  function run() {
    queued = false;
    try {
      css(); tabs();
      [].forEach.call(doc.querySelectorAll('#ccs-main .cat-page[data-cat]'), function (p) { if (p.getClientRects().length) tidyPage(p); });
      var ins = doc.getElementById('cc-insights'); if (ins) insights(ins);
    } catch (e) { warn('update', e); }
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(run); }
  function onClick(e) {
    var b = e.target && e.target.closest && e.target.closest('.ccf-i, .ccf-ftog'); if (!b || !doc.getElementById('ccs-main').contains(b)) return;
    e.preventDefault(); e.stopPropagation();
    if (b.classList.contains('ccf-ftog')) { filtOpen = !filtOpen; run(); return; }
    var k = b.getAttribute('data-ccf-key'); open[k] = !open[k];
    var c = b.closest('.ccf-card'); if (c) c.classList.toggle('ccf-open', open[k]);
    b.setAttribute('aria-expanded', String(open[k]));
  }
  function start() {
    var r = doc.getElementById('cc-staff'); if (!r) return setTimeout(start, 300);
    new MutationObserver(schedule).observe(r, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-pressed'] });
    doc.addEventListener('click', onClick, true);
    schedule();
  }
  win.__ccAnalyticsFocus = { run: run };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
