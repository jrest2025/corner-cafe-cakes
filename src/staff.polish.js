/* Corner Café Service Hub: polish (26 October 2026).
 * Roneel: "refine corner cake crm even further, use icons where appropriate" and "options should be in drop downs, not
 * separate pills; the drop down should look expert level and neat, not generic system dropdowns."
 *  - Filters become one custom dropdown (label, current choice, icons, tick); a bottom sheet on phones. The original
 *    control stays underneath and is still what the app reads, so filtering works exactly as before. Screen switches
 *    with counts (Orders, Treat orders) stay as tabs.
 *  - One thin-line icon set (the sidebar's style) on Settings, Kitchen, Customers, order tags and the Next step.
 *  - Kitchen: "Needs attention" rows readable on tablets; Calendar and Handover tabs removed (they are in the sidebar).
 *  - Main buttons navy, not black. Order cards show at most two tags (allergy first). Customers: no repeated heading,
 *    reminders as one small button, the spend note behind "i".
 *  - Type weight by device: lighter on phones, a step heavier on tablets; computers unchanged.
 * Data, rules and workflows are unchanged; Daily Cake Demand is not touched. If this file fails, the app works as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccPolish20261026) return;
  win.__ccPolish20261026 = true;

  // ---------- icons (Lucide-style outlines, like the sidebar) ----------
  var P = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calx: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>',
    shieldok: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M12 3a13 13 0 0 0 0 18 13 13 0 0 0 0-18M3 12h18"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    bell: '<path d="M10.3 21a2 2 0 0 0 3.4 0M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    today: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    filter: '<path d="M3 6h18M7 12h10M10 18h4"/>',
    sort: '<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>',
    spark: '<path d="M12 3l1.9 5.8L20 10.7l-6.1 1.9L12 18.5l-1.9-5.9L4 10.7l6.1-1.9z"/>',
    gem: '<path d="M6 3h12l4 6-10 13L2 9zM11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    case: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7zM3.3 7 12 12l8.7-5M12 22V12"/>',
    store: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
    pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3M12 9v4M12 17h.01"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    chef: '<path d="M17 21a1 1 0 0 0 1-1v-5.4a1 1 0 0 1 .6-.9 4 4 0 0 0-2.1-7.5 5 5 0 0 0-9 0 4 4 0 0 0-2.1 7.5 1 1 0 0 1 .6.9V20a1 1 0 0 0 1 1zM6 17h12"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1"/>'
  };
  function svg(k, cls) { return P[k] ? '<svg class="ccp-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + P[k] + '</svg>' : ''; }
  function txt(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function warn(w, e) { try { console.warn('[Polish] ' + w, e); } catch (_) {} }
  function phone() { try { return win.matchMedia('(max-width: 759px)').matches; } catch (_) { return false; } }
  // Add an icon to the start of a button or label, once
  function deco(el, k) { if (!el || !P[k] || el.querySelector(':scope > .ccp-ic, :scope > svg, :scope > span > svg')) return; el.insertAdjacentHTML('afterbegin', svg(k)); el.classList.add('ccp-hasic'); }

  // ---------- the dropdown ----------
  // A source is either a <select> or a group of pill buttons. The source stays in the page (hidden) and is what the app
  // reads; the dropdown only shows it and passes the choice back (sets the select and fires change, or taps the pill).
  var DD = [], openDD = null;
  function ddOptions(d) {
    if (d.sel) return [].map.call(d.sel.options, function (o) { return { v: o.value, t: o.text, on: o.selected, off: o.disabled }; });
    return [].map.call(d.group.querySelectorAll(d.item || 'button'), function (b, i) {
      var on = b.getAttribute('aria-current') === 'page' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('is-on') || b.classList.contains('is-active') || b.classList.contains('is-cur');
      var n = b.querySelector('.ccs-n, .ccs-count, .cc-szx-n'); return { v: b.getAttribute('data-v') || String(i), t: txt(b).replace(n ? txt(n) : '\u0000', '').trim(), n: n ? txt(n) : null, on: on, el: b };
    });
  }
  function ddMake(src, o) {
    var d = { sel: src.tagName === 'SELECT' ? src : null, group: src.tagName === 'SELECT' ? null : src, label: o.label, icons: o.icons || {}, item: o.item, key: o.key };
    var btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'ccdd-btn' + (o.cls ? ' ' + o.cls : '');
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    d.btn = btn; btn.__dd = d; src.__dd = d;
    var hideEl = o.hide || src;
    hideEl.classList.add(o.hideClass || 'ccdd-src');
    (o.place ? o.place(btn) : hideEl.parentNode.insertBefore(btn, hideEl));
    DD.push(d); ddSync(d);
    return d;
  }
  function ddSync(d) {
    var opts = ddOptions(d), cur = opts.filter(function (x) { return x.on; })[0] || opts[0] || { t: '' };
    var ic = d.icons[cur.v] || d.icons[cur.t] || d.icons['*'];
    var h = '<span class="ccdd-l">' + esc(d.label) + '</span><span class="ccdd-v">' + (ic ? svg(ic) : '') + '<span>' + esc(cur.t) + '</span>' + (cur.n ? '<em class="ccdd-n">' + esc(cur.n) + '</em>' : '') + '</span>' + svg('chev', 'ccdd-chev');
    if (d.btn.getAttribute('data-h') !== h) { d.btn.innerHTML = h; d.btn.setAttribute('data-h', h); d.btn.setAttribute('aria-label', d.label + ': ' + cur.t); }
  }
  function ddOpen(d) {
    ddClose();
    var opts = ddOptions(d), root = doc.getElementById('cc-staff') || doc.body, sheet = phone();
    var list = '<ul class="ccdd-list" role="listbox" aria-label="' + esc(d.label) + '">' + opts.map(function (x, i) {
      var ic = d.icons[x.v] || d.icons[x.t];
      return '<li role="option" tabindex="-1" class="ccdd-opt' + (x.on ? ' is-on' : '') + (x.off ? ' is-off' : '') + '" data-i="' + i + '" aria-selected="' + x.on + '"' + (x.off ? ' aria-disabled="true"' : '') + '>' + (ic ? svg(ic) : '<span class="ccdd-noic"></span>') + '<span class="ccdd-t">' + esc(x.t) + '</span>' + (x.n ? '<em class="ccdd-n">' + esc(x.n) + '</em>' : '') + svg('check', 'ccdd-tick') + '</li>';
    }).join('') + '</ul>';
    var pop = doc.createElement('div'); pop.className = 'ccdd-pop' + (sheet ? ' is-sheet' : '');
    pop.innerHTML = sheet ? '<div class="ccdd-back" data-ccdd="close"></div><div class="ccdd-panel" role="dialog" aria-modal="true" aria-label="' + esc(d.label) + '"><div class="ccdd-sh"><b>' + esc(d.label) + '</b></div>' + list + '<div class="ccdd-sf"><button type="button" class="ccs-btn ccs-ghost" data-ccdd="close">Cancel</button></div></div>' : '<div class="ccdd-panel">' + list + '</div>';
    root.appendChild(pop);
    if (!sheet) {
      var r = d.btn.getBoundingClientRect(), pn = pop.querySelector('.ccdd-panel'), w = Math.max(r.width, 240), left = Math.min(r.left, win.innerWidth - w - 12);
      pn.style.minWidth = w + 'px'; pn.style.left = Math.max(12, left) + 'px';
      var below = win.innerHeight - r.bottom - 12, above = r.top - 12, hgt = Math.min(pn.scrollHeight, 420);
      if (below >= Math.min(hgt, 260) || below >= above) { pn.style.top = (r.bottom + 6) + 'px'; pn.style.maxHeight = Math.max(160, below - 6) + 'px'; }
      else { pn.style.bottom = (win.innerHeight - r.top + 6) + 'px'; pn.style.maxHeight = Math.max(160, above - 6) + 'px'; }
    }
    openDD = { d: d, pop: pop, opts: opts };
    d.btn.setAttribute('aria-expanded', 'true'); d.btn.classList.add('is-open');
    var f = pop.querySelector('.ccdd-opt.is-on') || pop.querySelector('.ccdd-opt:not(.is-off)'); if (f) { f.focus({ preventScroll: true }); try { f.scrollIntoView({ block: 'nearest' }); } catch (_) {} }
  }
  function ddClose(focusBtn) {
    if (!openDD) return;
    var d = openDD.d; openDD.pop.remove(); openDD = null;
    if (d.btn.isConnected) { d.btn.setAttribute('aria-expanded', 'false'); d.btn.classList.remove('is-open'); if (focusBtn) d.btn.focus({ preventScroll: true }); }
  }
  function ddPick(i) {
    if (!openDD) return;
    var d = openDD.d, x = openDD.opts[i]; if (!x || x.off) return;
    ddClose(true);
    if (x.on) return;
    if (d.sel) { d.sel.value = x.v; d.sel.dispatchEvent(new Event('input', { bubbles: true })); d.sel.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (x.el) x.el.click();
    setTimeout(function () { if (d.btn.isConnected) ddSync(d); schedule(); }, 0);
  }
  // Set up (or re-sync) a dropdown for a source; the app may re-draw the source at any time
  function dd(src, o) {
    if (!src) return null;
    if (src.__dd && src.__dd.btn.isConnected) { ddSync(src.__dd); return src.__dd; }
    return ddMake(src, o);
  }
  function ddPrune() { DD = DD.filter(function (d) { var src = d.sel || d.group; if (!src.isConnected || !d.btn.isConnected) { if (d.btn.isConnected) d.btn.remove(); return false; } return true; }); }

  // ---------- screens ----------
  var SEG_IC = { all: 'users', seg_repeat: 'repeat', seg_first_time: 'spark', seg_high_value: 'gem', seg_inactive: 'moon', seg_birthday_buyer: 'cake', seg_upcoming_occasion: 'star', seg_upcoming_order: 'box', seg_corporate: 'case', marketing_opt_in: 'shieldok' };
  function customers(main) {
    // the spend note behind "i"
    var head = main.querySelector(':scope > .ccs-head'), sub = head && head.querySelector('.ccs-sub'), h1 = head && head.querySelector('h1');
    if (sub && h1 && !h1.querySelector('.ccp-i')) {
      sub.classList.add('ccp-fine');
      var ib = doc.createElement('button'); ib.type = 'button'; ib.className = 'ccp-i'; ib.setAttribute('aria-label', 'About these figures'); ib.setAttribute('aria-expanded', 'false'); ib.innerHTML = '<span aria-hidden="true">i</span>';
      h1.appendChild(ib);
    }
    // one "Show" dropdown instead of the seven pills (the dropdown has every group the pills had, and more)
    var seg = main.querySelector('#ccs-seg'), pills = main.querySelector('nav.cdir-segments');
    if (seg) { var lab = seg.closest('label'); dd(seg, { label: 'Show', icons: SEG_IC, hide: lab || seg, cls: 'ccdd-wide' }); }
    [].forEach.call(main.querySelectorAll('nav.cdir-segments'), function (x) { if (seg) x.classList.add('ccdd-src'); });
    // the second "Customers" heading and its sentence go; Sort sits with the other controls
    var hd = main.querySelector('section.cdir-heading'), sort = main.querySelector('select.cdir-sort');
    if (hd) hd.classList.add('ccp-quiet');
    var tool = main.querySelector('.ccs-ctool');
    if (sort && tool) dd(sort, { label: 'Sort', icons: { '*': 'sort' }, hide: sort.closest('label') || sort, place: function (b) { var act = tool.querySelector('.ccs-ctool-actions'); tool.insertBefore(b, act || null); } });
    var size = main.querySelector('select.cdir-page-size'); if (size) dd(size, { label: 'Per page', hide: size.closest('label') || size });
    // reminders: one small button in the toolbar instead of a panel
    var rem = main.querySelector(':scope > section.ccs-rem.ccs-rem-fold'), bar = main.querySelector(':scope > .ccs-toolbar');
    var rb = bar && bar.querySelector('.ccp-rem');
    if (rem && bar) {
      var n = txt(rem.querySelector('.ccs-count')) || '';
      rem.classList.add('ccdd-src');
      if (!rb) { rb = doc.createElement('button'); rb.type = 'button'; rb.className = 'ccs-btn ccs-ghost ccp-rem'; bar.appendChild(rb); }
      var t = svg('bell') + '<span>' + (n ? n + ' reminder' + (n === '1' ? '' : 's') : 'Reminders') + '</span>';
      if (rb.getAttribute('data-h') !== t) { rb.innerHTML = t; rb.setAttribute('data-h', t); }
    } else if (rb) rb.remove();
    deco(main.querySelector('[data-act="cust-new"]'), 'userplus');
    [].forEach.call(main.querySelectorAll('.ccs-secbtn[data-g="crm"]'), function (b) { deco(b, { all: 'users', fu: 'bell', ov: 'chart' }[b.getAttribute('data-v')]); });
  }
  function kitchen(main) {
    [].forEach.call(main.querySelectorAll('[data-act="k-mode"]'), function (b) {
      var v = b.getAttribute('data-v');
      if (v === 'cal' || v === 'hand') b.classList.toggle('ccdd-src', b.getAttribute('aria-pressed') !== 'true');
      else deco(b, v === 'today' ? 'today' : v === 'board' ? 'board' : null);
    });
  }
  function orders(main) {
    var all = main.querySelector('.ccs-tab[data-act="filter"][data-v="recent"]');
    if (all && !all.querySelector('.ccs-n') && txt(all) !== 'All') { all.title = txt(all); all.textContent = 'All'; }
    tags(main);
  }
  // At most two tags on an order card: allergy first, then the most useful other one. The rest stay in the order.
  function tags(root) {
    [].forEach.call(root.querySelectorAll('.ccs-card .ccs-tags'), function (box) {
      var card = box.closest('.ccs-card'), next = card && card.querySelector('.ccs-next');
      var t = [].slice.call(box.children).filter(function (e) { return !e.classList.contains('ccp-more'); }), rank = function (e) {
        if (e.classList.contains('s-alert') || e.classList.contains('vr-allergy')) return 0;
        if (e.classList.contains('cc-ch')) return 2;
        if (e.classList.contains('st')) return next ? 9 : 1;
        if (e.classList.contains('s-flag') || e.classList.contains('s-warn')) return 1;
        return 5;
      };
      var keep = t.slice().sort(function (a, b) { return rank(a) - rank(b); }).filter(function (e) { return rank(e) < 9; }).slice(0, 2);
      t.forEach(function (e) { e.classList.toggle('ccp-moretag', keep.indexOf(e) < 0); });
      t = t.filter(function (e) { return !e.classList.contains('ccp-more'); });
      var extra = t.filter(function (e) { return keep.indexOf(e) < 0 && rank(e) < 9; }), more = extra.length, m = box.querySelector(':scope > .ccp-more');
      if (more > 0 && !m) { m = doc.createElement('span'); m.className = 'ccp-more'; box.appendChild(m); }
      if (m) { m.classList.remove('ccp-moretag'); var s = '+' + more; if (more <= 0) m.remove(); else if (m.textContent !== s) { m.textContent = s; m.title = extra.map(txt).join(', '); } }
      // icons on the common tags
      t.forEach(function (e) { var w = txt(e); if (/^Custom$/.test(w)) deco(e, 'pen'); else if (/^Delivery$/.test(w)) deco(e, 'truck'); else if (/^Walk-in|Counter/.test(w)) deco(e, 'store'); });
      if (next) { var em = next.querySelector(':scope > em'); if (em && txt(em) === 'Next:') { em.innerHTML = svg('arrow'); em.setAttribute('aria-label', 'Next'); em.classList.add('ccp-next'); } }
    });
  }
  var SET_IC = [[/^Online orders/, 'globe'], [/^Notice and collection/, 'clock'], [/^Closed days/, 'calx'], [/^Cakes and prices/, 'cake'], [/^Seasonal items/, 'gift'], [/^Delivery/, 'truck'], [/^Occasions/, 'star'], [/^What each level/, 'shield'], [/^Backup/, 'db'], [/^Kitchen printing/, 'printer'], [/^Events and public/, 'flag'], [/^Email/, 'mail'], [/^Staff|^People|^Logins/, 'users']];
  function settings(main) {
    [].forEach.call(main.querySelectorAll('.ccs-setnav [data-setk]'), function (b) {
      var w = b.getAttribute('data-setk') || txt(b); for (var i = 0; i < SET_IC.length; i++) if (SET_IC[i][0].test(w)) { deco(b, SET_IC[i][1]); break; }
    });
  }
  function analytics(main) {
    // period pills -> one dropdown (on every tab that has them)
    [].forEach.call(main.querySelectorAll('.cat-page .cat-chips'), function (g) { if (g.getClientRects().length || g.__dd) dd(g, { label: 'Period', icons: { '*': 'cal' }, item: '.cat-chip' }); });
    // filter boxes -> the same dropdown
    [].forEach.call(main.querySelectorAll('.dx-filters select, .oi-filters select'), function (s) {
      var lab = s.closest('label'), name = lab ? txt(lab.querySelector('.ccs-label')) : (s.getAttribute('aria-label') || 'Filter');
      dd(s, { label: name || 'Filter', hide: lab || s });
    });
  }
  // Seasonal items manager filter pills (Settings) and its tabs stay; only the filter pills become a dropdown
  function seasonal() {
    var f = doc.querySelector('#cc-staff .cc-szx .cc-szx-tools > .ccs-chips');
    if (f && f.querySelector('[data-cc-szm="filter"]')) dd(f, { label: 'Show', item: '[data-cc-szm="filter"]', icons: { '*': 'filter' } });
  }
  function treatBoard() {
    var l = doc.getElementById('cc-to'); if (!l) return;
    var e0 = l.querySelector('.cc-to-empty'); if (e0 && !e0.querySelector('.ccp-empty-ic')) { e0.insertAdjacentHTML('afterbegin', '<span class="ccp-empty-ic">' + svg('inbox') + '</span>'); e0.classList.add('ccp-empty'); }
    [].forEach.call(l.querySelectorAll('.cc-to-moreb .ccs-btn, .cc-to-acts .ccs-btn'), function (b) {
      var w = txt(b); deco(b, /^Call/.test(w) ? 'phone' : /^WhatsApp/.test(w) ? 'chat' : /^Print/.test(w) ? 'printer' : /^Cancel order/.test(w) ? 'xcircle' : /^Take payment/.test(w) ? null : null);
    });
    deco(l.querySelector('[data-cc-to="new"]'), 'gift');
  }

  // ---------- refined details: icons on tags and number cards, page-title icons, tidy separators ----------
  var TAG_IC = [[/allerg|dietary/i, null], [/^(Needs a price|Check order|To check|Waiting|Not confirmed|Quote|Awaiting)/i, 'hourglass'], [/^(Confirmed|Ready|Paid|Completed|Handed over|Collected|Done)/i, 'checkc'], [/^(Late|Overdue|Changed)/i, 'alert'], [/^Delivery/i, 'truck'], [/^Custom$/i, 'pen'], [/^Custom$/i, 'pen'], [/(to pay|owing|deposit|payment)/i, 'coins'], [/^Cancelled|^Declined/i, 'xcircle']];
  var KPI_IC = { customers: 'users', 'new': 'spark', returning: 'repeat', due_today: 'bell' };
  var TITLE_TAB = { 'Analytics': 'dash', 'Cake orders': 'orders', 'Customers': 'customers', 'Settings': 'settings', 'Calendar': 'calendar', 'Shift handover': 'handover', "What's on today?": 'kitchen', 'Register': 'register' };
  var WALK = '<circle cx="13.5" cy="4.5" r="2"/><path d="M10 21.5l2.3-6.3 3.2 2.6v3.7M8 12.8l2.2-3.6 4.1.9 2.4 3.1M12.4 10l-1 5.4"/>';
  function channels(root) {
    [].forEach.call(root.querySelectorAll('.cc-ch'), function (c) {
      if (c.classList.contains('ccp-chi')) return;
      var name = txt(c.querySelector(':scope > span')) || txt(c);
      c.classList.add('ccp-chi'); c.setAttribute('role', 'img'); c.setAttribute('aria-label', name); c.title = name;
      if (c.classList.contains('cc-ch-walk_in')) { var g = c.querySelector('svg'); if (g) g.innerHTML = WALK; }
    });
  }
  // A tag that is clearer as an icon: the word becomes the label (hover, long-press, screen readers)
  var ICON_ONLY = { 'Delivery': 'truck', 'Collection': 'bag', 'Pickup': 'bag', 'Custom': 'pen' };
  function iconOnly(root) {
    [].forEach.call(root.querySelectorAll('.ccs-pill, .ccs-tag'), function (e) {
      if (e.classList.contains('ccp-badge') || e.closest('#cc-heartbeat')) return;
      var w = txt(e), k = ICON_ONLY[w]; if (!k) return;
      e.innerHTML = svg(k) + '<span class="ccp-sr">' + esc(w) + '</span>'; e.classList.add('ccp-badge', 'ccp-b-' + k); e.setAttribute('role', 'img'); e.setAttribute('aria-label', w); e.title = w;
    });
  }
  var SEC_IC = { cake: 'cake', when: null, kitchen: 'chef', customer: 'users', feedback: 'msg', payment: 'coins', history: 'history' };
  function sheet() {
    var sh = doc.getElementById('ccs-sheet'); if (!sh || !sh.classList.contains('ccs-open')) return;
    channels(sh); iconOnly(sh);
    // Delivery or collection: the vehicle (or bag) next to the date
    [].forEach.call(sh.querySelectorAll('.os-when > span:first-child'), function (l) {
      var w = txt(l), k = /deliver/i.test(w) ? 'truck' : /collect|pick/i.test(w) ? 'bag' : null; if (!k || l.classList.contains('ccp-wl')) return;
      l.classList.add('ccp-wl'); l.innerHTML = svg(k) + '<span class="ccp-sr">' + esc(w) + '</span>'; l.title = w;
    });
    // Call and WhatsApp: the icons do the talking
    [].forEach.call(sh.querySelectorAll('.os-callrow a'), function (a) {
      if (a.classList.contains('ccp-call')) return;
      var w = txt(a);
      if (/^Call\s/.test(w)) { a.innerHTML = svg('phone') + '<span>' + esc(w.replace(/^Call\s+/, '')) + '</span>'; a.setAttribute('aria-label', w); }
      else if (/WhatsApp/i.test(w)) { a.innerHTML = svg('chat') + '<span class="ccp-sr">' + esc(w) + '</span>'; a.setAttribute('aria-label', w); a.title = w; a.classList.add('ccp-ionly'); }
      else return;
      a.classList.add('ccp-call');
    });
    var pr = sh.querySelector('[data-act="panel"][data-v="brief"]');
    if (pr && !pr.classList.contains('ccp-hasic')) { if (/kitchen slip/i.test(txt(pr))) { pr.setAttribute('aria-label', txt(pr)); pr.textContent = 'Print slip'; } deco(pr, 'printer'); }
    [].forEach.call(sh.querySelectorAll('.ccs-secbtn[data-g="order"]'), function (b) { var v = b.getAttribute('data-v'), k = v === 'when' ? (/deliver/i.test(txt(b)) ? 'truck' : 'bag') : SEC_IC[v]; deco(b, k); });
  }
  // Analytics on phones and tablets: one "Section" dropdown instead of two rows of buttons (computers keep the rows)
  var AN_IC = { ov: 'chart', sl: 'coins', pd: 'cake', cu: 'users', sd: 'star', pl: 'cal', mk: 'megaphone', da: 'db', cs: 'store', wb: 'globe' };
  function analyticsNav(main) {
    var mods = main.querySelector('nav.an-mods'); if (!mods) return;
    dd(mods, { label: 'Section', item: 'button[data-v]:not(.is-need)', icons: AN_IC, hideClass: 'ccp-navsrc', cls: 'ccp-mobonly ccdd-wide',
      place: function (b) { var n5 = mods.previousElementSibling; (n5 && n5.classList.contains('cc-nav5') ? n5 : mods).insertAdjacentElement('beforebegin', b); } });
  }
  function refine(main) {
    channels(main); iconOnly(main); analyticsNav(main);
    // status tags: a small icon that says what kind of status it is
    [].forEach.call(main.querySelectorAll('.ccs-pill, .ccs-tag'), function (e) {
      if (e.closest('#cc-heartbeat') || e.querySelector('svg')) return;
      var w = txt(e); for (var i = 0; i < TAG_IC.length; i++) if (TAG_IC[i][0].test(w)) { if (TAG_IC[i][1]) deco(e, TAG_IC[i][1]); break; }
    });
    // Customers number cards: a proper icon instead of the text arrow
    [].forEach.call(main.querySelectorAll('.cw-metric'), function (m) {
      var a = m.querySelector('.cw-metric-arrow'), k = KPI_IC[m.getAttribute('data-ccdr')];
      if (a && k && !a.querySelector('svg')) { a.innerHTML = svg(k); a.classList.add('ccp-kpi-ic'); }
    });
    // page titles carry the same icon as their sidebar item
    var h1 = main.querySelector(':scope > .ccs-head h1.ccs-title, :scope > .ccs-head .ccs-title');
    if (h1 && !h1.querySelector('.ccp-tic')) {
      var tab = TITLE_TAB[txt(h1).replace(/\s*i$/, '')], src = tab && doc.querySelector('#cc-staff .ccs-nav [data-tab="' + tab + '"] svg');
      if (src) { var c = src.cloneNode(true); c.setAttribute('class', 'ccp-tic'); c.setAttribute('aria-hidden', 'true'); h1.insertBefore(c, h1.firstChild); h1.classList.add('ccp-hast'); }
    }
    // stray separators ("Updated 7:22 AM ·" before the refresh icon, "·Export summary")
    [].forEach.call(main.querySelectorAll(':scope > .ccs-head .ccs-fresh, :scope > .ccs-head .ccs-sub'), function (p) {
      [].forEach.call(p.childNodes, function (n) {
        if (n.nodeType !== 3) return;
        var nx = n.nextSibling;
        if (/^\s*·\s*$/.test(n.nodeValue)) n.nodeValue = ' ';
        else if (/·\s*$/.test(n.nodeValue) && nx && nx.nodeType === 1 && /ccs-refresh/.test(nx.className || '')) n.nodeValue = n.nodeValue.replace(/\s*·\s*$/, ' ');
      });
    });
    // empty states: a soft icon over the line
    [].forEach.call(main.querySelectorAll('.ccs-empty, .cc-to-empty, .cat-none'), function (e) { if (!e.querySelector('.ccp-empty-ic') && e.getClientRects().length) { e.insertAdjacentHTML('afterbegin', '<span class="ccp-empty-ic">' + svg('inbox') + '</span>'); e.classList.add('ccp-empty'); } });
    // order date block: a small calendar mark
    [].forEach.call(main.querySelectorAll('.ccs-card > .ccs-when'), function (w) { if (!w.querySelector('.ccp-ic')) w.insertAdjacentHTML('afterbegin', svg('cal', 'ccp-when-ic')); });
  }

  // ---------- style ----------
  function css() {
    if (doc.getElementById('ccp-style')) return;
    var s = doc.createElement('style'); s.id = 'ccp-style';
    s.textContent = [
      '#cc-staff .ccdd-src,#cc-staff #ccs-main .ccdd-src,#cc-staff #ccs-main.cdir-v3-ready[data-screen] .ccs-ctool > nav.cdir-segments.ccdd-src,#cc-staff #ccs-main.cdir-v3-ready[data-screen] nav.cdir-segments.ccdd-src{display:none!important}',
      '#cc-staff .ccp-ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;vertical-align:-4px}',
      '#cc-staff .ccp-hasic{display:inline-flex;align-items:center;gap:8px}',
      ':root:not(#cc-t0) #cc-staff .ccs-setnav [data-setk].ccp-hasic{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;gap:10px;justify-content:flex-start;text-align:left}#cc-staff .ccs-setnav [data-setk] .ccp-ic{margin:0}#cc-staff .ccs-setnav [data-setk] .ccp-ic{color:#475467}#cc-staff .ccs-setnav [data-setk].is-cur .ccp-ic,#cc-staff .ccs-setnav [data-setk][aria-selected="true"] .ccp-ic{color:#245F99}',
      // dropdown button: label + current choice + chevron
      '#cc-staff .ccdd-btn{display:inline-flex;align-items:center;gap:10px;height:auto!important;min-height:48px!important;max-width:100%;padding:6px 12px 6px 14px;border:1px solid #C9D2DE;border-radius:12px;background:#fff;color:#1D2939;font:inherit;font-size:16px;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.05);transition:border-color .15s,box-shadow .15s}',
      '#cc-staff .ccdd-btn:hover{border-color:#8FA6BF}#cc-staff .ccdd-btn.is-open,#cc-staff .ccdd-btn:focus-visible{outline:none;border-color:#245F99;box-shadow:0 0 0 3px rgba(36,95,153,.18)}',
      '#cc-staff .ccdd-l{color:#667085;font-size:.85em;white-space:nowrap}',
      '#cc-staff .ccdd-v{display:inline-flex;align-items:center;gap:8px;font-weight:600;min-width:0}#cc-staff .ccdd-v > span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#cc-staff .ccdd-v .ccp-ic{color:#245F99}',
      '#cc-staff .ccdd-n{font-style:normal;font-size:.8em;font-weight:700;color:#1E3A5F;background:#E8EEF7;border-radius:999px;padding:1px 8px}',
      '#cc-staff .ccdd-chev{margin-left:auto;color:#667085;transition:transform .15s}#cc-staff .ccdd-btn.is-open .ccdd-chev{transform:rotate(180deg)}',
      '#cc-staff .ccdd-wide{min-width:260px}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccdd-btn:not(#cc-heartbeat *){min-height:48px!important;height:auto!important;padding:6px 12px 6px 14px!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .ccdd-btn:not(#cc-heartbeat *){min-height:52px!important}}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){:root:not(#cc-t0) #cc-staff #ccs-main .ccdd-btn:not(#cc-heartbeat *){min-height:56px!important}}',
      // the list: a light card, a tick on the chosen line
      '#cc-staff .ccdd-pop{position:fixed;inset:0;z-index:2147483000;pointer-events:none}',
      '#cc-staff .ccdd-pop:not(.is-sheet) .ccdd-panel{position:fixed;pointer-events:auto;background:#fff;border:1px solid #DCE3EB;border-radius:14px;box-shadow:0 12px 32px rgba(16,24,40,.14),0 2px 6px rgba(16,24,40,.06);overflow:auto;padding:6px;max-width:min(420px,calc(100vw - 24px));animation:ccddIn .14s ease-out}',
      '@keyframes ccddIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '#cc-staff .ccdd-list{list-style:none;margin:0;padding:0}',
      '#cc-staff .ccdd-opt{display:flex;align-items:center;gap:12px;min-height:48px;padding:8px 12px;border-radius:10px;color:#1D2939;font-size:16px;cursor:pointer;outline:none}',
      '#cc-staff .ccdd-opt .ccp-ic{color:#667085}#cc-staff .ccdd-noic{width:20px;flex:none}',
      '#cc-staff .ccdd-opt:hover,#cc-staff .ccdd-opt:focus{background:#F2F6FA}#cc-staff .ccdd-opt:focus-visible{box-shadow:inset 0 0 0 2px #245F99}',
      '#cc-staff .ccdd-opt.is-on{background:#EEF3F9;color:#1E3A5F;font-weight:600}#cc-staff .ccdd-opt.is-on .ccp-ic{color:#245F99}',
      '#cc-staff .ccdd-t{flex:1 1 auto}#cc-staff .ccdd-tick{visibility:hidden;color:#245F99}#cc-staff .ccdd-opt.is-on .ccdd-tick{visibility:visible}',
      '#cc-staff .ccdd-opt.is-off{opacity:.45;cursor:not-allowed}',
      // phones: a bottom sheet with a fixed Cancel
      '#cc-staff .ccdd-pop.is-sheet{pointer-events:auto}#cc-staff .ccdd-back{position:absolute;inset:0;background:rgba(16,24,40,.35)}',
      '#cc-staff .ccdd-pop.is-sheet .ccdd-panel{position:absolute;left:0;right:0;bottom:0;max-height:78vh;display:flex;flex-direction:column;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(16,24,40,.2);animation:ccddUp .18s ease-out}',
      '@keyframes ccddUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}',
      '#cc-staff .ccdd-sh{padding:16px 20px 8px;font-size:19px}#cc-staff .ccdd-sh b{font-weight:600}',
      '#cc-staff .ccdd-pop.is-sheet .ccdd-list{overflow:auto;padding:4px 12px;flex:1 1 auto}#cc-staff .ccdd-pop.is-sheet .ccdd-opt{min-height:52px;font-size:17px}',
      '#cc-staff .ccdd-sf{padding:10px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #EAECF0}#cc-staff .ccdd-sf .ccs-btn{width:100%;min-height:52px}',
      '@media (prefers-reduced-motion:reduce){#cc-staff .ccdd-panel{animation:none!important}#cc-staff .ccdd-chev{transition:none}}',
      // navy main buttons instead of black
      '#cc-staff #ccs-main .ccs-btn.ccs-good,#cc-staff #ccs-main [data-act="cust-new"]{background:#245F99!important;border-color:#245F99!important;color:#fff!important}',
      '#cc-staff #ccs-main .ccs-btn.ccs-good:hover,#cc-staff #ccs-main [data-act="cust-new"]:hover{background:#1E4F80!important}',
      // Kitchen: readable "Needs attention" rows on tablets
      '#ccs-main .kw-att .kw-line{display:grid!important;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"when what" "when meta";gap:4px 14px;align-items:start;text-align:left}',
      '#ccs-main .kw-att .kw-when{grid-area:when;min-width:84px}#ccs-main .kw-att .kw-what{grid-area:what;min-width:0}#ccs-main .kw-att .kw-meta{grid-area:meta;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start}',
      '#ccs-main .kw-att .kw-what b,#ccs-main .kw-att .kw-what span,#ccs-main .kw-att .kw-what em{display:block;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;max-width:none!important}',
      // order cards: two tags at most, "+n" for the rest; the next step reads as an action
      '#ccs-main .ccp-moretag{display:none!important}#ccs-main .ccp-more{display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;background:#F2F4F7;color:#475467;font-size:.85em;font-weight:600}',
      '#ccs-main .ccs-next .ccp-next{display:inline-flex;color:#245F99;margin-right:6px;font-style:normal}#ccs-main .ccs-next .ccp-next .ccp-ic{width:18px;height:18px;stroke-width:2.2}',
      // Customers: quiet second heading, note behind i, reminders button
      '#cc-staff #ccs-main .cdir-heading.ccp-quiet .cdir-heading-copy,#cc-staff #ccs-main .cdir-heading.ccp-quiet .cdir-sort-label{display:none!important}#cc-staff #ccs-main .cdir-heading.ccp-quiet{min-height:0!important;margin:0!important;padding:0!important;border:0!important}',
      '#ccs-main .ccp-fine{display:none}#ccs-main .ccp-fine.is-open{display:block}',
      '#ccs-main .ccp-i{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;margin-left:4px;vertical-align:middle;border:0;background:none;cursor:pointer}#ccs-main .ccp-i span{width:24px;height:24px;border-radius:50%;border:1.5px solid #98A2B3;color:#475467;font:italic 600 14px/21px Georgia,serif;text-align:center}',
      '#ccs-main .ccp-i[aria-expanded="true"] span{background:#E8EEF7;border-color:#245F99;color:#1E3A5F}',
      '#ccs-main .ccs-ctool{display:flex;flex-wrap:wrap;align-items:center;gap:10px}#ccs-main .ccp-rem{display:inline-flex;align-items:center;gap:8px}',
      // ---------- refined lines: one hairline, one radius set, status as a slim edge, quiet shadows ----------
      ':root{--ccp-line:#E4E7EC;--ccp-line-2:#D0D5DD;--ccp-navy:#245F99;--ccp-r:14px}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.ccs-card,.cat-card,.cat-k,.cw-metric,.kw-line,.kw-count,.kw-sec,.kw-next,.tq-stat,.ccs-box,.dx-card,.cc-ss):not(#cc-heartbeat *){border:1px solid var(--ccp-line)!important;border-radius:var(--ccp-r)!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.kw-line,.cw-metric){border-radius:12px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccs-card:not(#cc-heartbeat *)::before{width:3px!important;border-radius:3px 0 0 3px}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-next:not(#cc-heartbeat *){box-shadow:inset 3px 0 0 var(--ccp-navy)!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-sec.kw-att:not(#cc-heartbeat *){box-shadow:inset 3px 0 0 #F2B544!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-todo .cci-card:not(#cc-heartbeat *){border-top-color:var(--ccp-line)!important;border-right-color:var(--ccp-line)!important;border-bottom-color:var(--ccp-line)!important;border-left-width:3px!important;border-radius:var(--ccp-r)!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tp-urgent .tp-urg{border-left-width:3px!important;border-radius:0 10px 10px 0!important}',
      // gentle lift only on things you can tap
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.ccs-card,.kw-line,.kw-count,.cw-metric,.cat-k.cat-tap):not(#cc-heartbeat *){transition:border-color .15s,box-shadow .15s,transform .12s}',
      '@media (hover:hover){:root:not(#cc-t0) #cc-staff #ccs-main :is(.ccs-card,.kw-line,.kw-count,.cw-metric,.cat-k.cat-tap):not(#cc-heartbeat *):hover{border-color:var(--ccp-line-2)!important;box-shadow:0 4px 14px rgba(16,24,40,.06)!important}}',
      '#cc-staff :is(button,.ccs-btn,.ccs-card,.kw-line):active{transform:scale(.985)}',
      '#cc-staff :is(button,a,input,select,textarea):focus-visible{outline:3px solid rgba(36,95,153,.35)!important;outline-offset:2px!important}',
      // Analytics number cards: one quiet navy mark instead of four colours
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-k:not(#cc-heartbeat *)::before{background:var(--ccp-navy)!important;opacity:.85;width:3px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-k .cat-k-top > i{display:none!important}',
      // Treat orders board lines
      '#cc-staff .cc-to-dh{border-bottom:1px solid var(--ccp-line)!important}#cc-staff .cc-to-o{border-left-width:3px!important;border-color:var(--ccp-line)}#cc-staff .cc-to-o.is-new{border-left-color:#079455}#cc-staff .cc-to-o.is-due{border-left-color:#F79009}#cc-staff .cc-to-o.is-late{border-left-color:#B42318}#cc-staff .cc-to-o.is-paid{border-left-color:var(--ccp-navy)}',
      // numbers: even figures that line up, a lighter weight on big numbers
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.ccs-price,.cat-k strong,.cw-metric-value,.ccs-n,.kw-when b,.ccs-when,.ccs-table td,.cc-ss-kpi b,.hb-k-value,.cc-to-time,.cci-big,.tq-stat b,.tq-stat strong):not(#cc-heartbeat *){font-variant-numeric:tabular-nums lining-nums}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cat-k strong,.cw-metric-value):not(#cc-heartbeat *){font-weight:650!important;letter-spacing:-.02em!important}',
      // tables: quiet header, hairline rows
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccs-table th:not(#cc-heartbeat *){background:#F9FAFB!important;color:#475467!important;text-transform:none!important;letter-spacing:0!important;font-weight:600!important;border-bottom:1px solid var(--ccp-line)!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccs-table-wrap:not(#cc-heartbeat *){border:1px solid var(--ccp-line)!important;border-radius:var(--ccp-r)!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccs-table-wrap:not(#cc-heartbeat *){border:1px solid var(--ccp-line)!important;border-radius:var(--ccp-r)!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .ccs-table td:not(#cc-heartbeat *){border-bottom:1px solid #F2F4F7!important}',
      '@media (hover:hover){:root:not(#cc-t0) #cc-staff #ccs-main .ccs-table tbody tr:hover td:not(#cc-heartbeat *){background:#F9FAFB}}',
      // tags: slimmer, with an icon
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.ccs-pill,.ccs-tag).ccp-hasic:not(#cc-heartbeat *){gap:6px}#cc-staff #ccs-main :is(.ccs-pill,.ccs-tag) .ccp-ic{width:16px;height:16px;stroke-width:2}',
      // how the order came in: an icon badge in lists (the name shows on hover and to screen readers; the order details keep the words)
      ':root:not(#cc-t0) #cc-staff #ccs-main .cc-ch.ccp-chi:not(#cc-heartbeat *){width:34px!important;height:34px!important;min-width:0!important;padding:0!important;border-radius:50%!important;justify-content:center!important;gap:0!important;border:1px solid var(--ccp-line-2)!important;background:#fff!important;color:#344054!important;flex:none}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cc-ch.ccp-chi > span:not(#cc-heartbeat *){position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
      '#cc-staff #ccs-main .cc-ch.ccp-chi svg{width:18px!important;height:18px!important;stroke-width:1.75!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cc-ch.ccp-chi.cc-ch-online:not(#cc-heartbeat *){background:#EEF3F9!important;border-color:#B7CCE3!important;color:var(--ccp-navy)!important}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){:root:not(#cc-t0) #cc-staff #ccs-main .cc-ch.ccp-chi:not(#cc-heartbeat *){width:38px!important;height:38px!important}#cc-staff #ccs-main .cc-ch.ccp-chi svg{width:20px!important;height:20px!important}}',
      // icon-only tags (Delivery, Collection, Custom) and the hidden-label helper
      '#cc-staff .ccp-sr{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}',
      ':root:not(#cc-t0) #cc-staff :is(#ccs-main,#ccs-sheet) .ccp-badge:not(#cc-heartbeat *){display:inline-flex!important;align-items:center!important;justify-content:center!important;width:34px!important;height:34px!important;min-width:0!important;padding:0!important;border-radius:50%!important;gap:0!important;border:1px solid var(--ccp-line-2)!important;background:#fff!important;color:#344054!important;flex:none}',
      '#cc-staff .ccp-badge .ccp-ic{width:18px!important;height:18px!important;stroke-width:1.75!important}#cc-staff .ccp-badge.ccp-b-pen{background:#EEF3F9!important;border-color:#B7CCE3!important;color:var(--ccp-navy)!important}',
      // order details: the channel badge, the delivery vehicle, call and WhatsApp
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .cc-ch.ccp-chi{width:38px!important;height:38px!important;min-width:0!important;padding:0!important;border-radius:50%!important;justify-content:center!important;gap:0!important;border:1px solid var(--ccp-line-2)!important;background:#fff!important;color:#344054!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .cc-ch.ccp-chi > span{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}#cc-staff #ccs-sheet .cc-ch.ccp-chi svg{width:20px!important;height:20px!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-when:has(.ccp-wl){display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:center!important;justify-content:flex-start!important;text-align:left!important;gap:12px!important}#cc-staff #ccs-sheet .os-when .ccp-wl{flex:none;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:#EEF3F9;color:var(--ccp-navy)}#cc-staff #ccs-sheet .os-when .ccp-wl .ccp-ic{width:22px;height:22px}',
      '#cc-staff #ccs-sheet .os-callrow .ccp-call{display:inline-flex;align-items:center;justify-content:center;gap:10px}#cc-staff #ccs-sheet .os-callrow .ccp-call .ccp-ic{width:22px;height:22px}',
      '#cc-staff #ccs-sheet .ccp-ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}#cc-staff #ccs-sheet .ccp-hasic{display:inline-flex;align-items:center;gap:8px}',
      // Analytics section dropdown: phones and tablets only
      '#cc-staff .ccp-mobonly{display:none!important}',
      '@media (max-width:1099px),(hover:none) and (pointer:coarse){#cc-staff #ccs-main .ccp-mobonly{display:inline-flex!important;margin:8px 0 12px}#cc-staff #ccs-main .ccp-navsrc,#cc-staff #ccs-main .cc-nav5{display:none!important}}',
      // Customers number-card icons
      '#cc-staff #ccs-main .cw-metric-arrow.ccp-kpi-ic{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:#EEF3F9;color:var(--ccp-navy)}#cc-staff #ccs-main .cw-metric-arrow .ccp-ic{width:20px;height:20px}',
      // page titles with their sidebar icon
      '#cc-staff #ccs-main .ccs-title.ccp-hast{display:flex;align-items:center;gap:12px}#cc-staff #ccs-main .ccp-tic{width:24px;height:24px;padding:8px;box-sizing:content-box;border-radius:10px;background:#EEF3F9;color:var(--ccp-navy);fill:none;stroke:currentColor;stroke-width:1.75;flex:none}',
      // order date block mark
      '#cc-staff #ccs-main .ccs-when{position:relative}#cc-staff #ccs-main .ccp-when-ic{width:16px;height:16px;color:var(--ccp-navy);opacity:.7;display:block;margin-bottom:4px}',
      // empty states
      '#cc-staff .ccp-empty{text-align:center;padding:28px 12px!important;color:#475467}#cc-staff .ccp-empty-ic{display:flex;justify-content:center;margin-bottom:8px}#cc-staff .ccp-empty-ic .ccp-ic{width:36px;height:36px;padding:8px;border-radius:12px;background:#F2F4F7;color:#667085;stroke-width:1.5;box-sizing:content-box}',
      '@media (prefers-reduced-motion:reduce){#cc-staff *{transition:none!important}#cc-staff :is(button,.ccs-btn,.ccs-card,.kw-line):active{transform:none}}',
      // type weight by device (computers unchanged)
      '@media (max-width:759px){#cc-staff #ccs-main{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}#cc-staff #ccs-main h1,#cc-staff #ccs-main h2{font-weight:600}#cc-staff .ccdd-btn,#cc-staff #ccs-main .cdir-pager .ccdd-btn{width:100%;min-height:52px!important;height:auto!important}#ccs-main .ccp-i{display:none!important}#cc-staff .ccdd-wide{min-width:0}#ccs-main .ccp-i{width:48px;height:48px}}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){#cc-staff #ccs-main .ccs-sub,#cc-staff #ccs-main .ccs-meta,#cc-staff #ccs-main .kw-what span,#cc-staff #ccs-main .vr-order-meta{font-weight:500}#cc-staff .ccdd-btn,#cc-staff #ccs-main .cdir-pager .ccdd-btn{min-height:56px!important;height:auto!important;font-size:18px}#cc-staff .ccdd-opt{min-height:56px;font-size:18px}#ccs-main .ccp-i{width:54px;height:54px}#cc-staff .ccp-ic{width:22px;height:22px}}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  // ---------- wiring ----------
  var queued = false;
  function run() {
    queued = false;
    try {
      css(); ddPrune();
      var main = doc.getElementById('ccs-main'); if (!main) return;
      var scr = main.getAttribute('data-screen') || '';
      if (/^customers/.test(scr) || main.classList.contains('cw-directory')) customers(main);
      if (main.querySelector('section.cdir-heading')) customers(main);
      if (/^kitchen/.test(scr)) kitchen(main);
      if (/^orders/.test(scr) || main.querySelector('.ccs-list .ccs-card')) orders(main);
      if (main.querySelector('.ccs-setnav')) settings(main);
      if (main.querySelector('.cat-page, .dx-filters')) analytics(main);
      refine(main); sheet();
      seasonal(); treatBoard();
    } catch (e) { warn('update', e); }
  }
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(run); }
  function onClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    var b = t.closest('.ccdd-btn');
    if (b && b.__dd) { e.preventDefault(); e.stopPropagation(); if (openDD && openDD.d === b.__dd) ddClose(true); else ddOpen(b.__dd); return; }
    if (openDD) {
      var o = t.closest('.ccdd-opt');
      if (o && openDD.pop.contains(o)) { e.preventDefault(); e.stopPropagation(); ddPick(+o.getAttribute('data-i')); return; }
      if (t.closest('[data-ccdd="close"]')) { e.preventDefault(); e.stopPropagation(); ddClose(true); return; }
      if (openDD.pop.contains(t)) return;
      ddClose(false);
    }
    var i = t.closest('.ccp-i');
    if (i) { e.preventDefault(); e.stopPropagation(); var f = doc.querySelector('#ccs-main .ccp-fine'); var on = i.getAttribute('aria-expanded') !== 'true'; i.setAttribute('aria-expanded', String(on)); if (f) f.classList.toggle('is-open', on); return; }
    var r = t.closest('.ccp-rem');
    if (r) { var show = doc.querySelector('#ccs-main section.ccs-rem [data-act="rem-show"]'); if (show) { var sec = show.closest('section'); sec.classList.remove('ccdd-src'); show.click(); } }
  }
  function onKey(e) {
    if (!openDD) return;
    var items = [].slice.call(openDD.pop.querySelectorAll('.ccdd-opt:not(.is-off)')), cur = doc.activeElement, i = items.indexOf(cur);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ddClose(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]; if (n) { n.focus(); n.scrollIntoView({ block: 'nearest' }); } }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); var m = items[e.key === 'Home' ? 0 : items.length - 1]; if (m) m.focus(); }
    else if ((e.key === 'Enter' || e.key === ' ') && cur && cur.classList.contains('ccdd-opt')) { e.preventDefault(); ddPick(+cur.getAttribute('data-i')); }
    else if (e.key === 'Tab') ddClose(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) { var k = e.key.toLowerCase(), hit = items.slice(i + 1).concat(items.slice(0, i + 1)).filter(function (x) { return txt(x).toLowerCase().indexOf(k) === 0; })[0]; if (hit) hit.focus(); }
  }
  function start() {
    var r = doc.getElementById('cc-staff'); if (!r) return setTimeout(start, 300);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) { var n = list[i].target; if (n && n.closest && n.closest('.ccdd-pop,.ccdd-btn')) continue; return schedule(); }
    }).observe(r, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-selected', 'data-screen'] });
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('keydown', onKey, true);
    win.addEventListener('resize', function () { ddClose(false); });
    doc.addEventListener('scroll', function (e) { if (openDD && !openDD.pop.contains(e.target) && !openDD.pop.classList.contains('is-sheet')) ddClose(false); }, true);
    schedule();
  }
  win.__ccPolish = { run: run, dropdowns: function () { return DD.length; } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
