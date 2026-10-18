// More islands (18 October 2026), on the rendered page after each render, like the Handover islands.
// Today: the Needs attention card becomes Urgent / To do islands with a preview; each opens the centred pop-up.
// Kitchen > Handover: the same Handover islands as the Handover screen.
// Customers: a "needing attention" island opens its follow-up list in a pop-up over the overview.
// The rows, buttons and forms are the app's own, moved, not copied, so every action works as before.
var TX = { open: null, cu: null };
var TX_ICON = {
  red: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  amber: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
  cust: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 11h5M18.5 8.5v5"/>'
};
function txSvg(k, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + TX_ICON[k] + '</svg>'; }
var TX_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg><span>Close</span>';
function txHead(icon, title, sub, closeKey) {
  return '<div class="ap-pop-head"><span class="ap-icon">' + txSvg(icon) + '</span><div class="ap-pop-title"><h2>' + Tt(title) + '</h2><span>' + Tt(sub) + '</span></div>' +
    (closeKey ? '<button type="button" class="ap-close" data-tx-close="' + closeKey + '" aria-label="Close">' + TX_CLOSE + '</button>' : '') + '</div>';
}
function txPop(wrap, tone, label, headHtml, closeKey) {
  var scrim = document.createElement('div'); scrim.className = 'ap-scrim'; scrim.setAttribute('data-tx-close', closeKey); scrim.setAttribute('aria-hidden', 'true');
  var box = document.createElement('div'); box.className = 'ap-pop ' + tone; box.id = 'ap-pop'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', label);
  box.innerHTML = headHtml + '<div class="ap-pop-body tx-body"></div>';
  wrap.appendChild(scrim); wrap.appendChild(box); return box.querySelector('.tx-body');
}

// ---- Today ----
var TX_TODAY = [
  { k: 'red', name: 'Urgent', tone: 'ap-red', unit: ['order', 'orders'] },
  { k: 'amber', name: 'To do', tone: 'ap-amber', unit: ['order', 'orders'] }
];
function txToday(main) {
  var sec = main.querySelector(':scope > section.tq-warn'); if (!sec || sec.classList.contains('tx-done')) return;
  var rows = [].slice.call(sec.querySelectorAll(':scope > .tq-w')); if (!rows.length) return;
  sec.classList.add('tx-done');
  var head = sec.querySelector('.tq-wh'), more = sec.querySelector('.tq-more');
  // The header counts are the full totals; the card itself only lists the first few.
  var total = function (k) { var em = head && head.querySelector('em.is-' + k); return em ? +(em.textContent.match(/\d+/) || [0])[0] : rows.filter(function (r) { return r.classList.contains('is-' + k); }).length; };
  var gs = TX_TODAY.map(function (g) { return { d: g, n: total(g.k), rows: rows.filter(function (r) { return r.classList.contains('is-' + g.k); }) }; }).filter(function (g) { return g.n || g.rows.length; });
  if (!gs.length) return;
  // Today's card shares the screen with the week and the order lists, so there is no room for a reading pane:
  // the islands sit side by side and open the centred pop-up on every screen size.
  var open = TX.open;
  if (open && !gs.some(function (g) { return g.d.k === open; })) open = TX.open = null;
  var wrap = document.createElement('div'); wrap.className = 'tx-wrap';
  var isl = document.createElement('div'); isl.className = 'ap-islands tx-islands'; isl.setAttribute('role', 'group'); isl.setAttribute('aria-label', 'Needs attention');
  gs.forEach(function (g) {
    var on = open === g.d.k, b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-island ' + g.d.tone + (on ? ' is-open' : ''); b.setAttribute('data-tx', 'today'); b.setAttribute('data-v', g.d.k);
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', on);
    // A preview of the first two, so the island says what is waiting without opening it.
    var prev = g.rows.slice(0, 2).map(function (r) { var t = r.querySelector('b'); return '<span class="wd-p">' + Tt(t ? t.textContent : '') + '</span>'; }).join('');
    b.innerHTML = '<span class="ap-icon">' + txSvg(g.d.k) + '</span><span class="ap-text"><b>' + g.n + '</b><span>' + Tt(g.d.name) + '</span>' + (prev ? '<span class="wd-prev">' + prev + '</span>' : '') + '</span>';
    isl.appendChild(b);
  });
  rows.forEach(function (r) { r.classList.add('tx-hide'); });
  sec.appendChild(wrap); wrap.appendChild(isl);
  var cur = gs.filter(function (g) { return g.d.k === open; })[0]; if (!cur) return;
  var sub = cur.n + ' ' + cur.d.unit[cur.n === 1 ? 0 : 1] + (cur.rows.length < cur.n ? ', first ' + cur.rows.length + ' shown' : '');
  var body = txPop(wrap, cur.d.tone, cur.d.name, txHead(cur.d.k, cur.d.name, sub, 'today'), 'today');
  cur.rows.forEach(function (r) { r.classList.remove('tx-hide'); body.appendChild(r); });
  if (more) { var all = document.createElement('button'); all.type = 'button'; all.className = 'ccs-link tx-all'; all.setAttribute('data-tab', 'attn'); all.textContent = 'Open Needs attention for everything →'; body.appendChild(all); }
}

// ---- Kitchen > Handover: same islands as the Handover screen ----
// Kitchen rows open with open-kitchen rather than open-order, so count either.
IX_HO[1].n = function (s) { return s.querySelectorAll('[data-act="open-order"],[data-act="open-kitchen"]').length; };
ixApply = function () {
  var main = document.getElementById('ccs-main'); if (!main) return;
  var sc = main.getAttribute('data-screen');
  if (sc === 'handover' || sc === 'kitchen-hand') ixHandover(main);
  else if (sc && sc.indexOf('customers') === 0) ixCustomers(main);
  else if (IX.open.handover && sc) IX.open.handover = null;
};

// ---- Customers: follow-up list in a pop-up over the overview ----
function txCustomers(main) {
  var c = TX.cu; if (!c || main.querySelector('.tx-cwrap')) return;
  var bar = main.querySelector(':scope > .crm-bar'); if (!bar) return;
  // Everything after the section bar is the follow-up list: heading, note, filter chips, cards.
  var kids = [].slice.call(main.children), at = kids.indexOf(bar), list = kids.slice(at + 1), keep = kids.slice(0, at + 1);
  if (!list.length) return;
  var wrap = document.createElement('div'); wrap.className = 'tx-cwrap';
  // Behind the pop-up: the overview as it was, dimmed and not clickable.
  var back = document.createElement('div'); back.className = 'tx-back'; back.setAttribute('aria-hidden', 'true'); back.inert = true; back.innerHTML = c.snap;
  keep.forEach(function (k) { k.classList.add('tx-hid'); });
  wrap.appendChild(back); main.appendChild(wrap);
  var chip = main.querySelector('.crm-chips [aria-pressed="true"]'), fh = main.querySelector('.crm-fhead h2');
  var sub = (chip ? chip.textContent.replace(/\s+\d+\s*$/, '').trim() + ' · ' : '') + (fh ? fh.textContent : '');
  var body = txPop(wrap, 'ap-amber', 'Customer follow-ups', txHead('cust', c.title || 'Customer follow-ups', sub, 'customers'), 'customers');
  list.forEach(function (n) { body.appendChild(n); });
  body.scrollTop = c.sc || 0; body.addEventListener('scroll', function () { c.sc = body.scrollTop; }, { passive: true });
  main.scrollTop = c.mainTop || 0;
}
function txCuClose() {
  var c = TX.cu; if (!c) return; TX.cu = null;
  // Back to the overview through the app's own section bar, then restore where the page was.
  var main = document.getElementById('ccs-main'), ov = main && [].filter.call(main.querySelectorAll('.crm-bar button'), function (b) { return /^\s*Overview/.test(b.textContent); })[0];
  if (ov) ov.click(); else Ma();
  setTimeout(function () {
    var m = document.getElementById('ccs-main'); if (m) m.scrollTop = c.mainTop || 0;
    var el = c.v && document.querySelector('.ov-att .ix-crow[data-v="' + c.v + '"]'); if (el && el.focus) el.focus({ preventScroll: true });
  }, 40);
}

function txApply() {
  var main = document.getElementById('ccs-main'); if (!main) return;
  var sc = main.getAttribute('data-screen');
  if (sc === 'today') txToday(main); else if (TX.open && sc) TX.open = null;
  // Leaving the list any other way (side menu, opening a customer) forgets the pop-up.
  if (sc === 'customers-fu') txCustomers(main); else if (TX.cu && sc) TX.cu = null;
}
function txSet(k) {
  var was = TX.open; TX.open = k; Ma();
  setTimeout(function () {
    var el = k ? document.querySelector('#ap-pop .ap-close') : document.querySelector('.ap-island[data-tx="today"][data-v="' + (k || was) + '"]');
    if (el && el.focus) el.focus({ preventScroll: true });
  }, 30);
}
(function () {
  var t = null;
  function soon() { if (t) return; t = requestAnimationFrame(function () { t = null; txApply(); }); }
  function watch() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(watch, 200);
    new MutationObserver(soon).observe(root, { childList: true, subtree: true });
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tx],[data-tx-close],.ov-att .ix-crow[data-act="ws-crm-go"]'); if (!b || !root.contains(b)) return;
      if (b.classList.contains('ix-crow')) {
        // Let the app switch to the filtered list; remember the overview to show behind the pop-up.
        var main = document.getElementById('ccs-main'), snap = main.cloneNode(true);
        [].forEach.call(snap.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
        var title = b.querySelector('.ov-at b');
        TX.cu = { v: b.getAttribute('data-v'), title: title ? title.textContent : '', snap: snap.innerHTML, mainTop: main.scrollTop, sc: 0 };
        return;
      }
      e.preventDefault(); e.stopPropagation();
      var close = b.getAttribute('data-tx-close');
      if (close === 'customers') return txCuClose();
      if (close === 'today') return txSet(null);
      var k = b.getAttribute('data-v');
      txSet(TX.open === k ? null : k);
    }, true);
    soon();
  }
  watch();
  // Escape closes these pop-ups; an order open on top closes first.
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var sheet = document.getElementById('ccs-sheet'); if (y.sheet || (sheet && sheet.classList.contains('ccs-open'))) return;
    if (document.querySelector('.tx-cwrap #ap-pop')) { e.preventDefault(); e.stopImmediatePropagation(); txCuClose(); }
    else if (document.querySelector('.tx-wrap #ap-pop')) { e.preventDefault(); e.stopImmediatePropagation(); txSet(null); }
  }, true);
})();
