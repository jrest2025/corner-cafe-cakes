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
  var client = null;
  function db() {
    if (client) return client;
    if (win.__ccsMock) return (client = win.__ccsMock);
    if (!win.supabase || !win.supabase.createClient) return null;
    client = win.supabase.createClient('https://ilbrfwxblhidtlsjgxlh.supabase.co', 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
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
  // Customers: follow-ups that are due as a short action list at the top (read only; tapping opens the customer)
  var FU = { data: null, at: 0, busy: false };
  function fuLoad() {
    if (FU.busy || (FU.data && Date.now() - FU.at < 60000)) return;
    var c = db(); if (!c) return;
    FU.busy = true;
    c.rpc('my_followups', { p_days: 0, p_all: false }).then(function (r) {
      FU.busy = false; FU.at = Date.now();
      var d = r && r.data; FU.data = d && d.ok && d.allowed !== false ? (d.tasks || []) : [];
      schedule();
    }, function () { FU.busy = false; FU.at = Date.now(); FU.data = []; });
  }
  function fuToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date()); }
  function custActions(main) {
    if (!/^customers-all/.test(main.getAttribute('data-screen') || '')) { return; }
    fuLoad();
    var list = (FU.data || []).filter(function (t) { return t.due_on && t.due_on <= fuToday(); }).sort(function (a, b) { return a.due_on < b.due_on ? -1 : 1; });
    var box = main.querySelector(':scope > .ccp-fu'), anchor = main.querySelector(':scope > section.cw-summary');
    if (!list.length || !anchor) { if (box) box.remove(); main.classList.remove('ccp-has-fu'); return; }
    var t0 = fuToday(), days = function (d) { var n = Math.round((Date.parse(t0) - Date.parse(d)) / 864e5); return n <= 0 ? 'Due today' : n === 1 ? '1 day late' : n + ' days late'; };
    var h = '<div class="ccp-fu-h"><span class="cl-tile ccp-fixed" data-ccp-tone="amber">' + svg('bell') + '</span><h3>Follow-ups due</h3><button type="button" class="ccs-link ccp-fu-all">See all</button></div><div class="ccp-fu-l">' +
      list.slice(0, 3).map(function (t) { return '<button type="button" class="ccp-fu-i" data-act="open-customer" data-id="' + esc(t.customer_id) + '"><b>' + esc(t.title || 'Follow up') + '</b><span>' + esc(t.customer || '') + '</span><em class="' + (t.due_on < t0 ? 'is-late' : '') + '">' + days(t.due_on) + '</em></button>'; }).join('') +
      (list.length > 3 ? '<p class="ccp-fu-more">+' + (list.length - 3) + ' more in Follow-ups</p>' : '') + '</div>';
    if (!box) { box = doc.createElement('section'); box.className = 'ccp-fu'; box.setAttribute('aria-label', 'Follow-ups due'); main.insertBefore(box, anchor); }
    if (box.getAttribute('data-h') !== h) { box.innerHTML = h; box.setAttribute('data-h', h); }
    main.classList.add('ccp-has-fu');
  }
  // Number cards (Customers, Analytics): icon left, number, label under; colour by meaning; a zero goes grey
  var KPI_TONE = [[/owed|owing|to collect|not confirmed|not recorded|follow-ups due/i, 'amber'], [/./, 'navy']];
  var CATK_IC = [[/occasion/i, 'gift'], [/matching/i, 'users'], [/multiple orders/i, 'repeat'], [/lead time/i, 'clock'], [/peak month|month/i, 'cal'], [/sales|revenue|value|owed|collect|spend/i, 'coins'], [/average|share|per order/i, 'chart'], [/cakes? sold|top cake|cakes,|cakes per|size/i, 'cake'], [/customer/i, 'users'], [/new|first/i, 'spark'], [/return|repeat/i, 'repeat'], [/not confirmed/i, 'hourglass'], [/order/i, 'box'], [/slow/i, 'moon'], [/./, 'chart']];
  function kpis(main) {
    [].forEach.call(main.querySelectorAll('.cat-page .cat-kpis > .cat-k, section.cat-card[aria-label="Business intelligence"] .cat-kpis > .cat-k'), function (k) {
      if (k.closest('#cc-heartbeat')) return;
      var lab = txt(k.querySelector('.cat-k-top > span')), num = txt(k.querySelector(':scope > strong'));
      if (!k.querySelector(':scope > .ccp-kic')) { var ic = 'chart'; for (var i = 0; i < CATK_IC.length; i++) if (CATK_IC[i][0].test(lab)) { ic = CATK_IC[i][1]; break; } k.insertAdjacentHTML('afterbegin', '<span class="cl-tile ccp-kic ccp-fixed">' + svg(ic) + '</span>'); }
      var zero = /^\$?0(\.0+)?%?$/.test(num), tn = zero ? 'grey' : (KPI_TONE.filter(function (x) { return x[0].test(lab); })[0] || [0, 'navy'])[1];
      var t = k.querySelector(':scope > .ccp-kic'); if (t.getAttribute('data-ccp-tone') !== tn) t.setAttribute('data-ccp-tone', tn);
      k.classList.toggle('ccp-zero', zero); k.classList.add('ccp-kcard');
    });
    [].forEach.call(main.querySelectorAll('section.cw-summary > .cw-metric'), function (m) {
      var v = txt(m.querySelector('.cw-metric-value')); m.classList.toggle('ccp-zero', v === '0');
      var a = m.querySelector('.cw-metric-arrow'); if (a) a.setAttribute('data-ccp-tone', v === '0' ? 'grey' : /due/.test(m.getAttribute('data-ccdr') || '') ? 'amber' : 'navy');
    });
  }
  // Analytics, charts over text: donut for two-part splits, bars on the largest orders, quiet notes behind an "i"
  var flagOpen = false, DONUT_C = 2 * Math.PI * 42;
  function num(t) { var m = String(t || '').replace(/[$,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : 0; }
  function anCharts(main) {
    if (!main.querySelector('.cat-page')) return;
    // 1. two-part split bar -> donut, legend (and its taps) unchanged
    [].forEach.call(main.querySelectorAll('.cat-page section.cat-card .cat-split'), function (sp) {
      var rows = [].slice.call(sp.querySelectorAll('.cat-leg > .cat-lr')); if (!rows.length || rows.length > 6) return;
      var vals = rows.map(function (r) { var b = r.querySelector('b'); return b ? num(b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.nodeValue : b.textContent) : 0; });
      var tot = vals.reduce(function (a, b) { return a + b; }, 0), sig = vals.join(',');
      if (sp.getAttribute('data-ccp-donut') === sig) return;
      var old = sp.querySelector(':scope > svg.ccp-donut'); if (old) old.remove();
      sp.setAttribute('data-ccp-donut', sig); if (!tot) { sp.classList.remove('cat-donut', 'ccp-dn'); return; }
      var card = sp.closest('section'), lab = /returning|customers/i.test(card ? card.getAttribute('aria-label') || '' : '') ? 'customers' : 'total', off = 0;
      var arcs = rows.map(function (r, i) {
        if (!vals[i]) return '';
        var col = getComputedStyle(r.querySelector('i') || r).backgroundColor, len = DONUT_C * vals[i] / tot, gap = vals[i] === tot ? 0 : 1.4;
        var a = '<circle r="42" cx="60" cy="60" fill="none" stroke="' + col + '" stroke-width="15" stroke-dasharray="' + Math.max(len - gap, 0).toFixed(2) + ' ' + (DONUT_C - len + gap).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"></circle>';
        off += len; return a;
      }).join('');
      var aria = rows.map(function (r, i) { return txt(r.querySelector('span')) + ' ' + Math.round(vals[i] * 100 / tot) + '%'; }).join(', ');
      sp.insertAdjacentHTML('afterbegin', '<svg class="ccp-donut" viewBox="0 0 120 120" role="img" aria-label="' + esc(aria) + '"><circle r="42" cx="60" cy="60" fill="none" stroke="#EEF1F5" stroke-width="15"></circle><g transform="rotate(-90 60 60)">' + arcs + '</g><text x="60" y="58" text-anchor="middle" class="cat-dv">' + tot + '</text><text x="60" y="74" text-anchor="middle" class="cat-dl">' + lab + '</text></svg>');
      sp.classList.add('cat-donut', 'ccp-dn');
    });
    // 2. Largest orders: a bar per order, sized by value
    [].forEach.call(main.querySelectorAll('.cat-page section.cat-card[aria-label="Largest orders"] .cat-list'), function (l) {
      var li = [].slice.call(l.querySelectorAll(':scope > .cat-li')), v = li.map(function (x) { return num(txt(x.querySelector('em'))); }), mx = Math.max.apply(null, v.concat([1]));
      li.forEach(function (x, i) {
        var bar = x.querySelector(':scope > .ccp-lbar'); if (!bar) { x.insertAdjacentHTML('beforeend', '<i class="ccp-lbar" aria-hidden="true"><s></s></i>'); bar = x.lastChild; x.classList.add('ccp-barli'); }
        var w = +(v[i] * 100 / mx).toFixed(1), sx = bar.firstChild; if (parseFloat(sx.style.width) !== w) sx.style.width = w + '%';
        var sp = x.querySelector(':scope > span'); if (sp && /·\s*\d+ cakes?/.test(sp.textContent) && !sp.getAttribute('data-ccp-t')) { sp.setAttribute('data-ccp-t', '1'); sp.textContent = sp.textContent.replace(/\s*·\s*\d+ cakes?/, ''); }
      });
      l.classList.add('ccp-bars');
    });
    // 3. say it once: "Top cake" repeats the first bar of Cakes ranked
    [].forEach.call(main.querySelectorAll('.cat-page .cat-kpis'), function (g) {
      [].forEach.call(g.querySelectorAll(':scope > .cat-k'), function (k) { if (/^Top cake$/.test(txt(k.querySelector('.cat-k-top > span')))) k.classList.add('ccp-gone'); });
      var n = [].filter.call(g.children, function (k) { return !k.classList.contains('ccp-gone') && getComputedStyle(k).display !== 'none'; }).length;
      if (g.getAttribute('data-ccp-n') !== String(n)) g.setAttribute('data-ccp-n', n);
    });
    // 4. setup notes go behind an "i"
    [].forEach.call(main.querySelectorAll('.cat-page p.cat-flag'), function (f) {
      if (!f.querySelector(':scope > .ccp-flag-b')) f.insertAdjacentHTML('afterbegin', '<button type="button" class="ccp-flag-b" aria-expanded="false"><span class="ccp-flag-i" aria-hidden="true">i</span><span>' + (/gross profit/i.test(f.textContent) ? 'Gross profit' : 'Note') + '</span></button>');
      f.classList.add('ccp-flag'); f.classList.toggle('is-open', flagOpen); f.querySelector('.ccp-flag-b').setAttribute('aria-expanded', String(flagOpen));
    });
    // 5. Occasions numbers: the shared card
    [].forEach.call(main.querySelectorAll('.oi-kpis > .ccs-kpi'), function (k) {
      if (k.querySelector(':scope > .ccp-kic')) return;
      var lab = txt(k.querySelector('.ccs-kpi-l')), ic = 'chart'; for (var i = 0; i < CATK_IC.length; i++) if (CATK_IC[i][0].test(lab)) { ic = CATK_IC[i][1]; break; }
      var zero = /^\$?0(\.0+)?%?$/.test(txt(k.querySelector('.ccs-kpi-n')));
      k.insertAdjacentHTML('afterbegin', '<span class="cl-tile ccp-kic ccp-fixed" data-ccp-tone="' + (zero ? 'grey' : 'navy') + '">' + svg(ic) + '</span>'); k.classList.add('ccp-okpi'); k.classList.toggle('ccp-zero', zero);
    });
  }
  // Name only: "Cake Heartbeat" is now "Cake Pulse" (title, screen-reader label, loading and error lines). The chart itself is untouched.
  function pulseName() {
    var hb = doc.getElementById('cc-heartbeat'); if (!hb) return;
    var h2 = hb.querySelector('.hb-v2-head h2'); if (h2 && h2.textContent === 'Cake Heartbeat') h2.textContent = 'Cake Pulse';
    [hb].concat([].slice.call(hb.querySelectorAll('[aria-label*="Heartbeat"]'))).forEach(function (e) { var a = e.getAttribute('aria-label'); if (a && /Cake Heartbeat/.test(a)) e.setAttribute('aria-label', a.replace(/Cake Heartbeat/g, 'Cake Pulse')); });
    var w = doc.createTreeWalker(hb, 4), n; while ((n = w.nextNode())) if (n.nodeValue.indexOf('Cake Heartbeat') > -1) n.nodeValue = n.nodeValue.replace(/Cake Heartbeat/g, 'Cake Pulse');
  }
  // Order details flow: the colour strip says the same thing as the page, the next step leads, risky actions wait behind "More options"
  var moreOpen = {};
  function sheetFlow() {
    var sh = doc.getElementById('ccs-sheet'); if (!sh || !sh.classList.contains('ccs-open')) return;
    var head = sh.querySelector('.ccs-sheet-head'), pill = head && head.querySelector('.ccs-pill.st'), band = head && head.querySelector('.os-band');
    var ref = txt(head && head.querySelector('.os-tph small')).split('·')[0].trim() || 'x';
    var done = !!(pill && pill.classList.contains('s-done')), off = !!(pill && pill.classList.contains('s-off'));
    var review = !!(pill && /^(Check order|Needs a price|Price to set|Waiting|Quote|Approve)/i.test(txt(pill)));
    // 1. one colour rule for the strip: red = urgent, amber = to do, green = done, grey = cancelled
    if (band) {
      var tone = off ? 'pf-none' : done ? 'pf-green' : sh.querySelector('.os-warn .os-w.is-red') ? 'pf-red' : (sh.querySelector('.os-warn .os-w.is-amber') || review) ? 'pf-amber' : null;
      if (tone && !band.classList.contains(tone)) { band.classList.remove('pf-red', 'pf-amber', 'pf-green', 'pf-none'); band.classList.add(tone); }
    }
    // 2. money said once (the payment line), in its meaning colour; a cancelled order owes nothing
    var strip = sh.querySelector('.ccs-ostrip');
    if (strip) [].forEach.call(strip.querySelectorAll(':scope > div'), function (d) {
      var l = txt(d.querySelector(':scope > span')); if (!/^(To pay|Price|Paid)$/.test(l)) return;
      d.classList.add('ccp-money'); d.classList.toggle('ccp-owe', l === 'To pay' && num(txt(d.querySelector('b'))) > 0 && !off); d.classList.toggle('ccp-gone', off && l === 'To pay'); strip.classList.toggle('ccp-off', off);
    });
    // 3. next step first: a finished order leads with Customer feedback; on other orders feedback waits in More unless there is a concern to put right
    var acts = sh.querySelector('.os-main > .ccs-actions'), fb = sh.querySelector('.os-main > .fb-cta');
    var concern = !!(fb && fb.querySelector('.fb-n'));
    if (done && fb && acts && fb.nextElementSibling !== acts) acts.parentNode.insertBefore(fb, acts);
    if (!acts) {
      if (!fb) return;
      acts = doc.createElement('div'); acts.className = 'ccs-actions ccp-made'; fb.parentNode.insertBefore(acts, fb.nextSibling);
    }
    // 4. risky or rare actions go behind one quiet "More options" button
    var risky = [].slice.call(acts.querySelectorAll('[data-act="panel"][data-v="cancel"], [data-act="panel"][data-v="cancel-locked"], [data-act="panel"][data-v="delete"], [data-act="go-other"]'));
    if (done || off) risky = risky.concat([].slice.call(acts.querySelectorAll('[data-act="panel"][data-v="amend"]')));
    if (!done && fb && !concern) risky.unshift(fb.querySelector('button'));
    risky = risky.filter(Boolean);
    [].forEach.call(sh.querySelectorAll('.os-phdanger, .os-dkdanger'), function (d) { d.classList.add('ccp-gone'); });
    var box = acts.querySelector(':scope > .ccp-more');
    if (box && !risky.length && box.querySelector('.ccp-mitem')) risky = [].slice.call(box.querySelectorAll('.ccp-mitem'));
    if (!risky.length) { if (box) box.remove(); if (fb && fb.querySelector('button')) fb.classList.remove('ccp-gone'); return; }
    if (!box) {
      box = doc.createElement('div'); box.className = 'ccp-more';
      box.innerHTML = '<button type="button" class="ccp-more-b" aria-expanded="false">' + svg('chev') + '<span>More options</span></button><div class="ccp-more-l"></div>';
      acts.appendChild(box);
    }
    var list = box.querySelector('.ccp-more-l');
    risky.forEach(function (b) {
      if (b.parentNode === list) return;
      if (b.classList.contains('fb-cta-btn')) { b.closest('.fb-cta').classList.add('ccp-gone'); }
      if (/^Delete order$/.test(txt(b)) || b.getAttribute('data-act') === 'go-other') b.classList.add('ccs-red');
      b.classList.add('ccp-mitem'); list.appendChild(b);
    });
    // most dangerous last
    [].slice.call(list.children).sort(function (a, b) { var w = function (x) { return /Delete/.test(txt(x)) ? 3 : /Cancel/.test(txt(x)) ? 2 : 1; }; return w(a) - w(b); }).forEach(function (x) { list.appendChild(x); });
    var open = !!moreOpen[ref]; box.classList.toggle('is-open', open); box.querySelector('.ccp-more-b').setAttribute('aria-expanded', String(open));
    [].forEach.call(acts.querySelectorAll(':scope > .ccs-actions-row'), function (r) { if (!r.children.length) r.classList.add('ccp-gone'); });
    sh.__ccpRef = ref;
  }
  // Customer profile: same flow. One main action, figures said once, delete waits behind "More options"
  var custMore = false;
  function custFlow() {
    var sh = doc.getElementById('ccs-sheet'); if (!sh || !sh.classList.contains('rm-profile')) return;
    var head = sh.querySelector('.ccs-sheet-head'), fav = sh.querySelector('.ccs-sheet-body > .vr-fav-toggle');
    // favourite: a small heart in the header instead of a big pink bar
    if (fav && head && fav.parentNode !== head) { var lab = txt(fav); fav.setAttribute('aria-label', lab); fav.title = lab; fav.classList.add('ccp-fav'); head.insertBefore(fav, head.querySelector('.ccs-x')); }
    if (fav) [].forEach.call(fav.childNodes, function (n) { if (n.nodeType === 3 && n.nodeValue.trim()) { var sp = doc.createElement('span'); sp.className = 'ccp-sr'; sp.textContent = n.nodeValue.trim(); fav.replaceChild(sp, n); } });
    if (fav) { var on = /Remove|Favourite customer|Unmark/i.test(fav.getAttribute('aria-label') || '') || fav.getAttribute('aria-pressed') === 'true'; fav.classList.toggle('is-on', on); }
    // the four coloured cards: keep Orders and Spend (the rest is listed just below), as plain white cards
    [].forEach.call(sh.querySelectorAll('.rm-metrics > .rm-metric'), function (m) {
      var l = txt(m.querySelector('.rm-metric-label'));
      if (/^(Usually orders|Occasions)$/.test(l)) { m.classList.add('ccp-gone'); return; }
      m.classList.add('ccp-rmk');
      var v = m.querySelector('.rm-metric-value'), d = m.querySelector('.rm-metric-desc');
      if (v && !v.getAttribute('data-ccp') && /,\s*average\s*/i.test(v.textContent)) { var parts = v.textContent.split(/,\s*average\s*/i); v.setAttribute('data-ccp', '1'); v.textContent = parts[0]; if (d) d.textContent = 'Average ' + parts[1] + ' · completed orders'; }
      else if (v && !v.getAttribute('data-ccp')) { v.setAttribute('data-ccp', '1'); if (d && /Customer order history/.test(d.textContent)) d.textContent = ''; }
    });
    var met = sh.querySelector('.rm-metrics'); if (met) met.setAttribute('data-ccp-n', [].filter.call(met.children, function (x) { return !x.classList.contains('ccp-gone'); }).length);
    // delete customer: behind More options, red outline when shown
    var zone = sh.querySelector('.cd-zone');
    if (zone) {
      var ask = zone.querySelector('.cd-ask'), busy = !ask || zone.querySelectorAll('button:not(.ccp-more-b)').length > 1;
      var b = zone.querySelector(':scope > .ccp-more-b');
      if (!b) { zone.insertAdjacentHTML('afterbegin', '<button type="button" class="ccp-more-b ccp-cmore" aria-expanded="false">' + svg('chev') + '<span>More options</span></button>'); b = zone.firstChild; }
      var open = custMore || busy; zone.classList.add('ccp-zone'); zone.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    }
  }
  // ---------- Plain words: one short status word per stage, a 2-4 word next step, same everywhere ----------
  var STATUS = { 'Check order': ['New', 'amber'], 'Needs a price': ['Needs price', 'amber'], 'Waiting for customer': ['Waiting', 'navy'], 'Waiting for deposit': ['Deposit due', 'amber'], 'Confirmed': ['Confirmed', 'navy'], 'Completed': ['Done', 'green'], 'Declined': ['Declined', 'grey'], 'Cancelled': ['Cancelled', 'grey'] };
  var FLAG = { 'Confirm': ['New', 'checkc'], 'Price': ['Add price', 'pen'], 'Deposit': ['Take deposit', 'coins'], 'Waiting': ['Waiting', 'hourglass'], 'Unpaid': ['To pay', 'coins'], 'Paid': ['Paid', 'checkc'], 'Due soon': ['Due soon', 'clock'], 'Overdue': ['Overdue', 'alert'], 'Allergy': ['Allergy', 'alert'] };
  var KSTEP = { scheduled: ['Plan', 'cal'], preparing: ['Prep', 'chef'], baking: ['Bake', 'chef'], assembling: ['Baked', 'checkc'], decorating: ['Decorate', 'pen'], quality_check: ['To check', 'hourglass'] };
  function shortNext(t) {
    t = String(t || '').replace(/^\s*Next:\s*/, '').trim();
    var amt = (t.match(/take (\$[\d,.]+)/i) || [])[1], kitchen = /^Kitchen:/i.test(t), take = /take (the balance|\$)/i.test(t);
    if (/^Check it/i.test(t)) return ['Check & confirm', 'checkc', 'amber'];
    if (/^Add the price/i.test(t)) return ['Add price', 'pen', 'amber'];
    if (/^Waiting for the customer/i.test(t)) return ['Waiting on customer', 'hourglass', 'navy'];
    if (/deposit/i.test(t)) return ['Take deposit', 'coins', 'amber'];
    if (take) return [(amt ? 'Take ' + amt : 'Take balance') + (!kitchen && /hand it over/i.test(t) ? ', hand over' : ''), 'coins', 'amber'];
    if (/deliver it/i.test(t)) return ['Deliver', 'truck', 'green'];
    if (/hand it over/i.test(t)) return ['Hand over', 'bag', 'green'];
    if (/gone out|tap Order completed/i.test(t)) return ['Mark completed', 'checkc', 'green'];
    if (kitchen) return ['Waiting on kitchen', 'chef', 'navy'];
    return null;
  }
  function nextChip(el, r) {
    if (!r) return;
    var sig = r.join('|'); if (el.getAttribute('data-ccp-nx') === sig) return;
    el.setAttribute('data-ccp-nx', sig); el.setAttribute('data-ccp-tone', r[2]); el.classList.add('ccp-nx');
    el.innerHTML = '<span class="ccp-sr">Next: </span>' + svg(r[1]) + '<span>' + esc(r[0]) + '</span>';
  }
  function words(root) {
    // status chips
    [].forEach.call(root.querySelectorAll('.ccs-pill.st'), function (e) {
      if (e.closest('#cc-heartbeat')) return;
      var w = txt(e), m = STATUS[w] || STATUS[e.getAttribute('data-ccp-was')];
      if (/^Kitchen: /.test(w)) { var k = w.replace(/^Kitchen: /, ''); e.setAttribute('aria-label', w); e.title = w; if (!e.querySelector('.ccp-kw')) { e.innerHTML = svg('chef') + '<span class="ccp-kw">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</span>'; } return; }
      if (!m) return;
      if (!e.getAttribute('data-ccp-was')) e.setAttribute('data-ccp-was', w);
      if (w !== m[0]) { var ic = e.querySelector('svg'); e.textContent = m[0]; if (ic) e.insertBefore(ic, e.firstChild); }
      if (e.getAttribute('data-ccp-st') !== m[1]) e.setAttribute('data-ccp-st', m[1]);
    });
    // next steps: lists, Today and order details
    [].forEach.call(root.querySelectorAll('.ccs-next, .ccs-nextline'), function (e) {
      var raw = e.getAttribute('data-ccp-raw') || e.textContent; if (!e.getAttribute('data-ccp-raw')) e.setAttribute('data-ccp-raw', raw);
      nextChip(e, shortNext(raw));
    });
    [].forEach.call(root.querySelectorAll('.tp-nb'), function (e) {
      var w = e.getAttribute('data-ccp-raw') || txt(e), m = { 'Check and confirm': ['Check & confirm', 'checkc', 'amber'], 'Add the price': ['Add price', 'pen', 'amber'], 'Record the deposit': ['Take deposit', 'coins', 'amber'] }[w] || shortNext(w);
      if (!e.getAttribute('data-ccp-raw')) e.setAttribute('data-ccp-raw', w); nextChip(e, m);
    });
    // phone list flag: one short word with an icon
    [].forEach.call(root.querySelectorAll('.ccs-prow-f'), function (e) {
      var was = e.getAttribute('data-ccp-was') || txt(e), m = FLAG[was]; if (!m) return;
      if (!e.getAttribute('data-ccp-was')) e.setAttribute('data-ccp-was', was);
      if (!e.querySelector('svg') || txt(e) !== m[0]) e.innerHTML = svg(m[1]) + '<span>' + esc(m[0]) + '</span>';
    });
    // kitchen: one-word step buttons
    [].forEach.call(root.querySelectorAll('[data-act="k-next"]'), function (b) {
      var m = KSTEP[b.getAttribute('data-v')]; if (!m) return;
      if (!b.getAttribute('data-ccp-was')) { b.setAttribute('data-ccp-was', txt(b)); b.title = txt(b); }
      if (txt(b) !== m[0] || !b.querySelector('svg')) b.innerHTML = svg(m[1]) + '<span>' + esc(m[0]) + '</span>';
    });
    [].forEach.call(root.querySelectorAll('[data-act="open-kitchen"].ccs-btn:not(.ccs-ghost)'), function (b) { if (/^Check and mark Ready$/.test(txt(b))) { b.title = txt(b); b.innerHTML = svg('checkc') + '<span>Ready</span>'; } });
  }
  function sheetNextOnce() {
    var sh = doc.getElementById('ccs-sheet'); if (!sh) return;
    var nl = sh.querySelector('.ccs-actions > .ccs-nextline'); if (!nl) { var sd = sh.querySelector('.ccs-sheet-head .ccs-pill.st[data-ccp-was="Completed"]'), acts = sh.querySelector('.os-main > .ccs-actions'); var dn = sh.querySelector('.os-main > .ccp-done'); if (sd && acts && !dn) { dn = doc.createElement('p'); dn.className = 'ccs-nextline ccp-done'; nextChip(dn, ['All done', 'checkc', 'green']); } if (dn) { var fb0 = sh.querySelector('.os-main > .fb-cta'), before = fb0 && fb0.nextElementSibling === acts ? fb0 : acts; if (before && dn.nextElementSibling !== before) before.parentNode.insertBefore(dn, before); } return; }
    var prim = sh.querySelector('.ccs-actions .ccs-actions-row > .ccs-btn:not(.ccs-ghost):not([disabled])');
    nl.classList.toggle('ccp-gone', !!prim);
  }
  // Today: say it once
  function todayTrim(main) {
    if (main.getAttribute('data-screen') !== 'today') return;
    var head = main.querySelector('.tq-head');
    if (head) {
      // the long sentence under the greeting repeats the cards below
      [].forEach.call(head.querySelectorAll('p, .tp-sub, .tq-sub'), function (p) { if (/needs you|due to be handed|waiting to be checked|cakes? (is|are) due/i.test(p.textContent) && !p.querySelector('button')) p.classList.add('ccp-gone'); });
      var ul = head.querySelector('.ccb-list'); if (ul) ul.classList.add('ccp-gone');
    }
    var mir = main.querySelector(':scope > .ccs-mirnote'); if (mir) mir.classList.add('ccp-gone');
    var fu = main.querySelector(':scope > .tq-fu'); if (fu) fu.classList.add('ccp-gone');
  }
  // Order details: cake shown once, four tabs (rest under More)
  var tabsOpen = false, TAB_MAIN = { cake: 1, when: 1, payment: 1 };
  function sheetTabs() {
    var sh = doc.getElementById('ccs-sheet'); if (!sh || !sh.classList.contains('ccs-open') || sh.classList.contains('rm-profile')) return;
    var ph = sh.querySelector('.os-main > .os-phcake'); if (ph) ph.classList.add('ccp-gone');
    var bar = sh.querySelector('.os-detail > .ccs-secbar'); if (!bar) return;
    var btns = [].slice.call(bar.querySelectorAll(':scope > .ccs-secbtn[data-act="secgo"]')); if (btns.length < 5) return;
    var sel = bar.querySelector('.ccs-secbtn[aria-selected="true"]'), selExtra = sel && !TAB_MAIN[sel.getAttribute('data-v')];
    btns.forEach(function (b) { b.classList.toggle('ccp-xtab', !TAB_MAIN[b.getAttribute('data-v')]); });
    var mb = bar.querySelector(':scope > .ccp-tabmore');
    if (!mb) { bar.insertAdjacentHTML('beforeend', '<button type="button" class="ccs-secbtn ccp-tabmore" aria-expanded="false">' + svg('chev') + '<span>More</span></button>'); mb = bar.lastChild; }
    var open = tabsOpen || selExtra; bar.classList.toggle('ccp-tabs-open', !!open); mb.setAttribute('aria-expanded', String(!!open));
    mb.classList.toggle('is-sel', !!selExtra);
  }
  function kitchenCounts(main) {
    [].forEach.call(main.querySelectorAll('.kw-counts > .kw-count'), function (c) { var em = c.querySelector('em'); c.classList.toggle('ccp-zero', !!em && !/^[1-9]/.test(txt(em))); });
  }
  // Order details: one warning line (the most serious), the rest one tap away
  var warnOpen = {};
  function sheetWarn(sh) {
    var box = sh.querySelector('.os-warn'); if (!box) return;
    var ws = [].slice.call(box.querySelectorAll(':scope > .os-w')), key = (sh.querySelector('.os-tph small') ? txt(sh.querySelector('.os-tph small')).split(' ')[0] : 'x');
    var more = box.querySelector(':scope > .ccp-wmore');
    if (ws.length < 2) { if (more) more.remove(); box.classList.remove('ccp-wfold'); return; }
    ws.sort(function (a, b) { return (b.classList.contains('is-red') ? 1 : 0) - (a.classList.contains('is-red') ? 1 : 0); });
    ws.forEach(function (w, i) { w.style.order = String(i); w.classList.toggle('ccp-wrest', i > 0); });
    box.classList.add('ccp-wfold'); box.classList.toggle('ccp-wopen', !!warnOpen[key]);
    if (!more) { more = doc.createElement('button'); more.type = 'button'; more.className = 'ccs-link ccp-wmore'; box.appendChild(more); }
    more.setAttribute('data-k', key); more.style.order = '99';
    var label = warnOpen[key] ? 'Show less' : '+' + (ws.length - 1) + ' more';
    if (more.textContent !== label) more.textContent = label;
    more.setAttribute('aria-expanded', String(!!warnOpen[key]));
  }
  function kitchen(main) {
    kitchenCounts(main);
    [].forEach.call(main.querySelectorAll('[data-act="k-mode"]'), function (b) {
      var v = b.getAttribute('data-v');
      if (v === 'cal' || v === 'hand') b.classList.toggle('ccdd-src', b.getAttribute('aria-pressed') !== 'true');
      else deco(b, v === 'today' ? 'today' : v === 'board' ? 'board' : null);
    });
  }
  function orders(main) {
    var all = main.querySelector('.ccs-tab[data-act="filter"][data-v="recent"]');
    if (all && !all.querySelector('.ccs-n') && txt(all) !== 'All') { all.title = txt(all); all.textContent = 'All'; }
    // narrow screens (iPad upright, phones): the filter tabs no longer fit; one "Show" dropdown instead (28 Oct 2026)
    var ft = main.querySelector(':scope > .ccs-tabs');
    if (ft && ft.querySelector('.ccs-tab[data-act="filter"]')) dd(ft, { label: 'Show', item: '.ccs-tab[data-act="filter"]', hideClass: 'ccp-narrowsrc', cls: 'ccp-narrow ccdd-wide', icons: { '*': 'filter' } });
    tags(main);
  }
  // At most two tags on an order card: allergy first, then the most useful other one. The rest stay in the order.
  function tags(root) {
    [].forEach.call(root.querySelectorAll('.ccs-card .ccs-tags'), function (box) {
      var card = box.closest('.ccs-card'), next = card && card.querySelector('.ccs-next');
      var t = [].slice.call(box.children).filter(function (e) { return !e.classList.contains('ccp-more'); }), rank = function (e) {
        if (e.classList.contains('s-alert') || e.classList.contains('vr-allergy')) return 0;
        if (e.classList.contains('cc-ch')) return 2;
        if (e.classList.contains('st')) { if (e.getAttribute('data-ccp-was') === 'Confirmed' && box.querySelector('.ccs-pill.st .ccp-kw, .ccs-pill.st[aria-label^="Kitchen"]') && !/^Kitchen/.test(e.getAttribute('aria-label') || '')) return 9; return 1; }
        if (e.classList.contains('s-flag') || e.classList.contains('s-warn')) return 1; if (e.classList.contains('ccs-pay') && next) return 9;
        return 5;
      };
      var keep = t.slice().sort(function (a, b) { return rank(a) - rank(b); }).filter(function (e) { return rank(e) < 9; }).slice(0, 3);
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
    // matching card style: one icon on the status line, coloured by meaning; the summary gets a tile
    var ST = { 'is-new': ['hourglass', 'amber'], 'is-due': ['coins', 'amber'], 'is-late': ['alert', 'red'], 'is-paid': ['checkc', 'green'], 'is-done': ['checkc', 'green'], 'is-off': ['xcircle', 'grey'] };
    [].forEach.call(l.querySelectorAll('.cc-to-state'), function (e) {
      if (e.querySelector('.ccp-sti')) return;
      var k = Object.keys(ST).filter(function (c) { return e.classList.contains(c); })[0]; if (!k) return;
      e.insertAdjacentHTML('afterbegin', '<span class="ccp-sti">' + svg(ST[k][0]) + '</span>'); e.setAttribute('data-ccp-tone', ST[k][1]);
      var card = e.closest('.cc-to-o'); if (card) card.setAttribute('data-ccp-tone', ST[k][1]);
    });
    var sm = l.querySelector('.cc-to-sum');
    if (sm && !sm.querySelector('.cl-tile')) { var done = /^All done/.test(txt(sm)); sm.insertAdjacentHTML('afterbegin', '<span class="cl-tile ccp-fixed" data-ccp-tone="' + (done ? 'green' : 'amber') + '">' + svg(done ? 'checkc' : 'bell') + '</span>'); sm.classList.add('ccp-sum'); }
  }

  // ---------- refined details: icons on tags and number cards, page-title icons, tidy separators ----------
  var TAG_IC = [[/allerg|dietary/i, null], [/^(Needs a price|Needs price|Check order|New$|To check|Waiting|Not confirmed|Quote|Awaiting)/i, 'hourglass'], [/^(Confirmed|Ready|Paid|Completed|Handed over|Collected|Done)/i, 'checkc'], [/^(Late|Overdue|Changed)/i, 'alert'], [/^Delivery/i, 'truck'], [/^Custom$/i, 'pen'], [/^Custom$/i, 'pen'], [/(to pay|owing|deposit|payment|Deposit due)/i, 'coins'], [/^Cancelled|^Declined/i, 'xcircle']];
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
    channels(sh); iconOnly(sh); sheetWarn(sh);
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
  // Icon tiles: one style (light tint, thin-line icon in the same colour) and colour only by meaning:
  // red urgent or late, amber to do or money owed, green done or ready, navy plain information, grey when the number is 0
  var NAVY = /^(\$?[\d,.]+\s*)?(Due today|Next 7 days|Booked this week|This week|Later this week|Coming up|Next priority|Upcoming|Due)/i;
  function tone(t) {
    var host = t.closest('.ap-island, .tq-stat, .kw-count, .cl-stat, .cl-h, .kw-label, h2, h3') || t.parentElement, w = txt(host);
    if (host.classList.contains('ap-island')) { var n0 = w.match(/^\s*(\d+)/); if (n0 && +n0[1] === 0) return 'grey'; return host.classList.contains('ap-red') ? 'red' : host.classList.contains('ap-green') ? 'green' : 'amber'; }
    var stat = host.matches('.tq-stat, .kw-count, .cl-stat'), n = w.match(/^\s*\$?([\d,]+)/) || (stat && w.match(/(\d+)\s*cakes?\b/));
    if (stat && n && +String(n[1]).replace(/,/g, '') === 0) return 'grey';
    if (host.classList.contains('kw-count') && /\b(None|Nothing)\b/.test(w)) return 'grey';
    if (/\burgent\b|\blate\b|overdue/i.test(w)) return 'red';
    if (NAVY.test(w)) return 'navy';
    if (/to do|waiting on you|to collect|to make|needs attention|owed|owing|unpaid/i.test(w)) return 'amber';
    if (/ready|handed over|done|completed|collected/i.test(w)) return 'green';
    return 'navy';
  }
  function tiles(root) {
    [].forEach.call(root.querySelectorAll('.cl-tile, .ap-icon'), function (t) {
      if (t.closest('#cc-heartbeat') || t.classList.contains('ccp-fixed')) return;
      var k = tone(t); if (t.getAttribute('data-ccp-tone') !== k) t.setAttribute('data-ccp-tone', k);
    });
  }
  // Today: what needs action first, weight by importance, say it once
  function today(main) {
    if (main.getAttribute('data-screen') !== 'today') return;
    // the business figure belongs in Analytics, not on the counter screen
    [].forEach.call(main.querySelectorAll('.tq-stats > .cl-biz'), function (e) { e.classList.add('ccp-gone'); });
    // zero goes quiet
    [].forEach.call(main.querySelectorAll('.tq-stats > .tq-stat'), function (e) { var b = e.querySelector(':scope > b'); e.classList.toggle('ccp-zero', !!b && /^\$?0$/.test(txt(b))); });
    var st = main.querySelector('.tq-stats'); if (st) st.setAttribute('data-n', String(main.querySelectorAll('.tq-stats > .tq-stat:not(.ccp-gone)').length));
    // say it once: an empty panel ("No cakes are due…") repeats the 0 above it
    [].forEach.call(main.querySelectorAll('.tq-main > section.tp-card'), function (sec) {
      var empty = !sec.querySelector('.ccs-mini, .ccs-card, button[data-act="open-order"]') && /^No |nothing/i.test(txt(sec.querySelector(':scope > :not(.ccs-card-head)')));
      sec.classList.toggle('ccp-gone', empty);
    });
    // week strip: empty days blank, not a dash
    [].forEach.call(main.querySelectorAll('.tq-days .ccs-daycell em'), function (em) { var w = txt(em), m = w.match(/^(\d+)\s*cakes?$/); em.classList.toggle('ccp-blank', /^[—–-]$/.test(w)); if (m) { if (em.getAttribute('data-n') !== m[1]) em.setAttribute('data-n', m[1]); } else em.removeAttribute('data-n'); });
  }
  function ordersTabs(main) {
    [].forEach.call(main.querySelectorAll('.ccs-tab[data-act="filter"]'), function (t) { var n = t.querySelector('.ccs-n'); t.classList.toggle('ccp-quiet', !!n && txt(n) === '0' && t.getAttribute('aria-pressed') !== 'true'); });
  }
  function refine(main) {
    channels(main); iconOnly(main); analyticsNav(main); tiles(main); today(main); ordersTabs(main); custActions(main); kpis(main); anCharts(main); words(main); todayTrim(main);
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
      // icon tiles: light tint + thin-line icon, colour by meaning (Cake Heartbeat and Daily Cake Demand not touched)
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone]:not(#cc-heartbeat *){border:0!important;background-image:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone] svg:not(#cc-heartbeat *){stroke-width:2.2!important;width:60%!important;height:60%!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone="red"]:not(#cc-heartbeat *){background:#F8CFC9!important;box-shadow:inset 0 0 0 1px #E9988E!important;color:#9E1F14!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone="amber"]:not(#cc-heartbeat *){background:#F7D9A6!important;box-shadow:inset 0 0 0 1px #E2AE5C!important;color:#8A4504!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone="green"]:not(#cc-heartbeat *){background:#BCE6CC!important;box-shadow:inset 0 0 0 1px #7FCBA0!important;color:#05603A!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone="navy"]:not(#cc-heartbeat *){background:#CADAEE!important;box-shadow:inset 0 0 0 1px #8FAED3!important;color:#1A4570!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone="grey"]:not(#cc-heartbeat *){background:#D8DEE6!important;box-shadow:inset 0 0 0 1px #B3BDC9!important;color:#3E4A5C!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main :is(.cl-tile,.ap-icon)[data-ccp-tone] :is(svg,path,circle,rect,line,polyline):not(#cc-heartbeat *){stroke:currentColor!important}',
      // ---------- Today: action first, one card layout, quiet zeros, no repeats ----------
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen] .ccp-gone,:root:not(#cc-t0) #cc-staff #ccs-main[data-screen] .tq-stats > .tq-stat.ccp-gone.ccp-gone{display:none!important}',
      // Needs attention: icon on the left, number and label on one line, the orders listed under it
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:start!important;gap:4px 14px!important;text-align:left!important;padding:14px 16px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island .ap-icon{grid-row:1 / span 2;width:44px!important;height:44px!important;border-radius:12px!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island .ap-text{display:flex!important;flex-wrap:wrap!important;align-items:baseline!important;gap:2px 8px!important;min-width:0}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island .ap-text > b{font-size:28px!important;line-height:1.1!important;font-weight:650!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island .ap-text > span:not(.wd-prev){font-size:18px!important;font-weight:600!important;color:#1D2939!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island .wd-prev{display:flex!important;flex-direction:column!important;flex-basis:100%!important;gap:2px!important;margin-top:4px!important;color:#344054!important;font-weight:500!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-islands{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))!important;gap:10px!important;width:100%!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ap-island{width:auto!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important}',
      // the next step on a Today card: soft navy, not a black pill
      ':root:not(#cc-t0) #cc-staff #ccs-main .tp-nb{background:#EEF3F9!important;color:#1E3A5F!important;border:1px solid #B7CCE3!important}',
      // names in the Today lists in full; references never split
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ccs-prow-m b{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;max-width:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .ccs-prow-m span{white-space:nowrap!important}',
      // summary row: three slim tiles, icon left, number, label under; zero goes grey and quiet
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats[data-n="3"]{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-rows:auto auto!important;align-items:center!important;gap:4px 10px!important;padding:12px!important;min-height:0!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > .cl-tile{grid-column:1!important;grid-row:1!important;width:36px!important;height:36px!important;border-radius:10px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > b{grid-column:2!important;grid-row:1!important;font-size:26px!important;line-height:1!important;font-weight:650!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > span:not(.cl-tile){grid-column:1 / -1!important;grid-row:2!important;font-size:15px!important;line-height:1.3!important;color:#344054!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > :not(.cl-tile):not(b):not(span){display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat.ccp-zero{background:#F9FAFB!important;border-color:#EAECF0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat.ccp-zero > b,:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat.ccp-zero > span:not(.cl-tile){color:#98A2B3!important}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > span:not(.cl-tile){font-size:17px!important}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > b{font-size:30px!important}}',
      // week strip: today in soft navy, blank empty days, all seven days fit
      ':root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell.is-today{background:#EEF3F9!important;border:1px solid #245F99!important;color:#1E3A5F!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell em.ccp-blank{visibility:hidden!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tq-days{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:6px!important;overflow:visible!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell{min-width:0!important;width:auto!important;padding:8px 2px!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .tq-days{gap:3px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell{padding:6px 0!important;border-radius:10px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell span{font-size:13px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell b{font-size:17px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell em[data-n]{font-size:0!important;line-height:0!important;display:block!important;margin-top:4px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell em[data-n]::after{content:attr(data-n);display:inline-block;min-width:20px;padding:2px 6px;border-radius:999px;background:#EEF3F9;color:#1E3A5F;font-size:12px!important;line-height:16px!important;font-weight:600;font-style:normal}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats[data-n="3"]{gap:6px!important}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat{padding:10px 8px!important;gap:6px 8px!important}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > .cl-tile{width:30px!important;height:30px!important}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > b{font-size:22px!important}:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] .tq-stats > .tq-stat > span:not(.cl-tile){font-size:14px!important}}',
      // Kitchen counts: same card as the Today summary (icon left, number, label under); none goes grey
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"ic num" "ic lab"!important;align-items:center!important;gap:2px 12px!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count > .cl-tile{grid-area:ic!important;width:40px!important;height:40px!important;border-radius:11px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count > em{grid-area:num!important;font-style:normal!important;font-size:24px!important;font-weight:650!important;line-height:1.15!important;color:#1D2939!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count > b{grid-area:lab!important;font-size:16px!important;font-weight:500!important;color:#344054!important;line-height:1.3!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count.ccp-zero{background:#F9FAFB!important;border-color:#EAECF0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count.ccp-zero > :is(em,b){color:#98A2B3!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .kw-counts > .kw-count.ccp-zero > em{font-size:18px!important;font-weight:600!important}',
      // order details: one warning line, the rest behind "+n more"
      '#cc-staff #ccs-sheet .os-warn.ccp-wfold{display:flex!important;flex-direction:column!important;gap:8px}',
      '#cc-staff #ccs-sheet .os-warn.ccp-wfold:not(.ccp-wopen) > .ccp-wrest{display:none!important}',
      '#cc-staff #ccs-sheet .ccp-wmore{align-self:flex-start;min-height:44px;padding:0 4px;font-weight:600;color:#1E3A5F}',
      // WhatsApp: its own green wherever it appears (order details button, channel badge, Treat orders)
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow .ccp-call.ccp-ionly{color:#0B7A3E!important;background:#E3F6EA!important;border-color:#9FDDB6!important}',
      ':root:not(#cc-t0) #cc-staff :is(#ccs-main,#ccs-sheet) .cc-ch.ccp-chi.cc-ch-whatsapp{color:#0B7A3E!important;background:#E3F6EA!important;border-color:#9FDDB6!important}',
      ':root:not(#cc-t0) #cc-staff .cc-to a.ccs-btn[href*="wa.me"]{color:#0B7A3E!important;background:#E3F6EA!important;border-color:#9FDDB6!important}',
      // ---------- Phase 3: Customers and Analytics ----------
      // Follow-ups due: the action list on top
      '#cc-staff #ccs-main .ccp-fu{background:#fff;border:1px solid var(--ccp-line);border-left:3px solid #F0BE6A;border-radius:var(--ccp-r);padding:14px 16px;margin:0 0 14px}',
      '#cc-staff #ccs-main .ccp-fu-h{display:flex;align-items:center;gap:10px;margin:0 0 8px}#cc-staff #ccs-main .ccp-fu-h h3{margin:0;font-size:19px;font-weight:600;flex:1 1 auto}',
      '#cc-staff #ccs-main .ccp-fu-h .cl-tile{width:34px!important;height:34px!important;border-radius:10px!important;display:inline-flex!important;align-items:center;justify-content:center}',
      '#cc-staff #ccs-main .ccp-fu-all{min-height:44px;font-weight:600}',
      '#cc-staff #ccs-main .ccp-fu-i{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"t w" "c w";gap:2px 12px;width:100%;text-align:left;background:none;border:0;border-top:1px solid #F2F4F7;padding:10px 0;cursor:pointer;color:#1D2939;font:inherit}',
      '#cc-staff #ccs-main .ccp-fu-i b{grid-area:t;font-weight:600}#cc-staff #ccs-main .ccp-fu-i span{grid-area:c;color:#475467}#cc-staff #ccs-main .ccp-fu-i em{grid-area:w;align-self:center;font-style:normal;font-weight:600;color:#8A4504}#cc-staff #ccs-main .ccp-fu-i em.is-late{color:#9E1F14}',
      '#cc-staff #ccs-main .ccp-fu-more{margin:6px 0 0;color:#475467}',
      // said once: the "Follow-ups due today" number card hides when the list is shown
      ':root:not(#cc-t0) #cc-staff #ccs-main.ccp-has-fu .cw-summary > .cw-metric[data-ccdr="due_today"]{display:none!important}',
      // Customers number cards: one slim row, icon left, number, label under
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:10px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"ic num" "ic lab"!important;align-items:center!important;gap:2px 12px!important;padding:12px 14px!important;min-height:0!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric > .cw-metric-arrow{grid-area:ic!important;position:static!important;width:40px!important;height:40px!important;border-radius:11px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric > .cw-metric-value{grid-area:num!important;font-size:26px!important;line-height:1.1!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric > .cw-metric-label{grid-area:lab!important;font-size:15px!important;color:#344054!important;margin:0!important;line-height:1.3!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric .cw-metric-arrow[data-ccp-tone="amber"]{background:#F7D9A6!important;color:#8A4504!important;box-shadow:inset 0 0 0 1px #E2AE5C!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric .cw-metric-arrow[data-ccp-tone="navy"]{background:#CADAEE!important;color:#1A4570!important;box-shadow:inset 0 0 0 1px #8FAED3!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric .cw-metric-arrow[data-ccp-tone="grey"]{background:#D8DEE6!important;color:#3E4A5C!important;box-shadow:inset 0 0 0 1px #B3BDC9!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric.ccp-zero{background:#F9FAFB!important}:root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric.ccp-zero > :is(.cw-metric-value,.cw-metric-label){color:#98A2B3!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .cw-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric{padding:10px!important;gap:2px 10px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric > .cw-metric-arrow{width:34px!important;height:34px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cw-summary > .cw-metric > .cw-metric-value{font-size:22px!important}}',
      // Analytics number cards: the same card (icon left, number, label under, one line of detail only where it matters)
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard:not(#cc-heartbeat *){display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"ic num" "ic lab" "ic cap"!important;align-items:center!important;align-content:center!important;gap:2px 12px!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard::before{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > .ccp-kic{grid-area:ic!important;align-self:start!important;width:40px!important;height:40px!important;border-radius:11px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > strong{grid-area:num!important;font-size:28px!important;line-height:1.1!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > .cat-k-top{grid-area:lab!important;font-size:15px!important;color:#344054!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > .cat-k-cap{grid-area:cap!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard.ccp-zero{background:#F9FAFB!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard.ccp-zero > :is(strong,.cat-k-top){color:#98A2B3!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > .ccp-kic{width:34px!important;height:34px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-kcard > strong{font-size:23px!important}}',
      // section tabs on a phone: never squeeze an icon into its word; scroll sideways instead
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .ccs-secbar{overflow-x:auto!important;scrollbar-width:none}:root:not(#cc-t0) #cc-staff #ccs-main .ccs-secbar > .ccs-secbtn{flex:0 0 auto!important;min-width:max-content!important;padding:0 12px!important}:root:not(#cc-t0) #cc-staff #ccs-main .ccs-secbtn > .ccp-ic{flex:none!important}}',
      // ---------- Analytics: charts over text ----------
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-split.ccp-dn{display:flex!important;align-items:center!important;gap:20px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-split.ccp-dn > .cat-sb{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-split.ccp-dn > svg.ccp-donut{flex:none;width:120px;height:120px}:root:not(#cc-t0) #cc-staff #ccs-main .cat-split.ccp-dn > .cat-leg{flex:1 1 auto;min-width:0}',
      ':root:not(#cc-t0) #cc-staff #ccs-main svg.ccp-donut .cat-dv{font-size:24px!important;font-weight:600!important;fill:#1D2939!important}:root:not(#cc-t0) #cc-staff #ccs-main svg.ccp-donut .cat-dl{font-size:11px!important;font-weight:400!important;fill:#475467!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-list.ccp-bars > .cat-li.ccp-barli{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"ref amt" "bar bar" "when when"!important;gap:6px 12px!important;align-items:center!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-li.ccp-barli > b{grid-area:ref!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-li.ccp-barli > em{grid-area:amt!important;font-style:normal}:root:not(#cc-t0) #cc-staff #ccs-main .cat-li.ccp-barli > span{grid-area:when!important;color:#475467!important;margin:0!important}',
      '#cc-staff #ccs-main .ccp-lbar{grid-area:bar;display:block;height:10px;border-radius:5px;background:#EEF1F5;overflow:hidden}#cc-staff #ccs-main .ccp-lbar > s{display:block;height:100%;border-radius:5px;background:#168F91;text-decoration:none}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-page[data-cat="pl"] .cat-kpis > .cat-k .cat-k-cap{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis > .cat-k.ccp-gone.ccp-gone:not(#cc-heartbeat *){display:none!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis[data-ccp-n="3"]{grid-template-columns:repeat(3,minmax(0,1fr))!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-kpis[data-ccp-n="2"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
      // Business intelligence: same cards, no long captions
      ':root:not(#cc-t0) #cc-staff #ccs-main section.cat-card[aria-label="Business intelligence"] .cat-k.ccp-kcard{border-left:1px solid var(--ccp-line)!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main section.cat-card[aria-label="Business intelligence"] .cat-k .cat-k-cap{display:none!important}',
      // setup note behind an "i"
      ':root:not(#cc-t0) #cc-staff #ccs-main p.cat-flag.ccp-flag{background:none!important;border:0!important;padding:0!important;margin:0 0 12px!important;color:#475467!important;display:block!important;font-size:inherit}',
      ':root:not(#cc-t0) #cc-staff #ccs-main p.cat-flag.ccp-flag:not(.is-open){font-size:0!important}:root:not(#cc-t0) #cc-staff #ccs-main p.cat-flag.ccp-flag.ccp-flag:not(.is-open):not(#cc-heartbeat *) > button.ccs-link{display:none!important}',
      '#cc-staff #ccs-main .ccp-flag-b{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 4px;background:none;border:0;color:#475467;font:inherit;font-size:16px;cursor:pointer;margin-right:8px}',
      '#cc-staff #ccs-main .ccp-flag-i{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:1.5px solid #98A2B3;font-style:italic;font-weight:600;font-family:Georgia,serif;font-size:13px;color:#475467}',
      // Occasions numbers: shared card
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi:not(.ccf-hide){display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;grid-template-areas:"ic num" "ic lab"!important;align-items:center!important;gap:2px 12px!important;text-align:left!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccp-kic{grid-area:ic!important;width:40px!important;height:40px!important;border-radius:11px!important;display:inline-flex!important;align-items:center;justify-content:center}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccs-kpi-n{grid-area:num!important;order:0!important;font-size:28px!important;line-height:1.1!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccs-kpi-l{grid-area:lab!important;font-size:15px!important;color:#344054!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccs-kpi-s{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-zero{background:#F9FAFB!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccp-kic{width:34px!important;height:34px!important}:root:not(#cc-t0) #cc-staff #ccs-main .oi-kpis > .ccs-kpi.ccp-okpi > .ccs-kpi-n{font-size:23px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-split.ccp-dn > svg.ccp-donut{width:100px;height:100px}}',
      // phones: day charts keep readable columns and scroll sideways instead of squashing the dates
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-main .cat-page .cat-cols{grid-auto-flow:column!important;grid-template-columns:none!important;grid-auto-columns:minmax(56px,1fr)!important;column-gap:6px!important;overflow-x:auto!important;scrollbar-width:thin;padding-bottom:6px!important;-webkit-overflow-scrolling:touch}:root:not(#cc-t0) #cc-staff #ccs-main .cat-page .cat-cols .cat-cl{white-space:nowrap!important;font-size:14px!important}:root:not(#cc-t0) #cc-staff #ccs-main .cat-page .cat-cols .cat-cl em{display:block!important}}',
      // channel badges: icon centred in its circle everywhere
      ':root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *){display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important;position:relative!important;vertical-align:middle!important;box-sizing:border-box!important}',
      // channel badges are plain information: soft navy everywhere (lists, order details, Today pop-ups); WhatsApp keeps its green
      ':root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *):not(#ccs-x){width:36px!important;height:36px!important;min-width:0!important;padding:0!important;gap:0!important;border-radius:50%!important;background:#E8EFF7!important;border:1px solid #9DB8D9!important;color:#1A4570!important}',
      ':root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi.cc-ch-whatsapp:not(#cc-heartbeat *):not(#ccs-x){background:#E3F6EA!important;border-color:#9FDDB6!important;color:#0B7A3E!important}',
      ':root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *):not(#ccs-x) > span{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}',
      ':root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *):not(#ccs-x) svg{width:20px!important;height:20px!important;stroke-width:2!important;margin:0!important}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *):not(#ccs-x){width:32px!important;height:32px!important}:root:not(#cc-t0) #cc-staff .cc-ch.ccp-chi.ccp-chi:not(#cc-heartbeat *):not(#ccs-x) svg{width:18px!important;height:18px!important}}',
      // "Collect balance first" is money owed: amber, not blue
      ':root:not(#cc-t0) #cc-staff .up-tags .up-tag{background:#FDF0D9!important;color:#8A4504!important;border:1px solid #E9C27F!important;font-style:normal!important}',
      // Today pop-up rows (To do, Due today...): channel badge sits on the right of the row, not on its own line
      ':root:not(#cc-t0) #cc-staff .tq-w:has(> .cc-ch.ccp-chi){grid-template-columns:10px minmax(0,1fr) auto!important;column-gap:12px!important;align-items:start!important}',
      ':root:not(#cc-t0) #cc-staff .tq-w > .cc-ch.ccp-chi.ccp-chi{grid-column:3!important;grid-row:1 / span 4!important;align-self:center!important;margin:0!important}',
      ':root:not(#cc-t0) #cc-staff .tq-w:has(> .cc-ch.ccp-chi) > :not(i):not(.cc-ch){grid-column:2!important}',
      // ---------- Order details: one flow for every order ----------
      // the colour strip follows the same colour rule as everything else
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-band.pf-amber{background:#E2AE5C!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-band.pf-red{background:#D9483B!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-band.pf-green{background:#3DA56B!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-band.pf-none{background:#D0D5DD!important}',
      // payment is said once (in the payment line), so the chip in the header goes
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head .ccs-pay{display:none!important}',
      // status dot takes its chip colour (grey only for cancelled)
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head .ccs-pill.st:not(.s-off)::before{background:currentColor!important}',
      // money owed reads amber; a cancelled order shows its figures quietly and nothing "to pay"
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-ostrip > .ccp-money.ccp-owe > b{color:#8A4504!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-ostrip > .ccp-money.ccp-gone{display:none!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-ostrip.ccp-off > .ccp-money > b{color:#667085!important}',
      // main action: solid navy, never near-black
      ':root:not(#cc-t0) #cc-staff :is(#ccs-sheet,#ccs-main) .ccs-btn.ccs-good:not([disabled]):not(.ccs-ghost){background:#245F99!important;border-color:#245F99!important;color:#fff!important}',
      ':root:not(#cc-t0) #cc-staff :is(#ccs-sheet,#ccs-main) .ccs-btn.ccs-good[disabled]{background:#EEF1F5!important;border-color:#D0D5DD!important;color:#667085!important}',
      // call row: the number on one line, WhatsApp a compact green button beside it
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow{display:grid!important;grid-template-columns:minmax(0,1fr) 76px!important;gap:10px!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow{grid-template-columns:max-content 56px!important;gap:8px!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow .ccp-call:not(.ccp-ionly){padding:0 16px!important;overflow:visible!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow .ccp-call:not(.ccp-ionly) > span{overflow:visible!important;text-overflow:clip!important}}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow .ccp-call:not(.ccp-ionly){white-space:nowrap!important;font-variant-numeric:tabular-nums;justify-content:center!important;gap:10px!important;min-width:0!important;overflow:hidden}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-callrow .ccp-call:not(.ccp-ionly) > span{white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis}',
      // when tile: plain information, navy
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-when .ccp-wl{background:#CADAEE!important;color:#1A4570!important;box-shadow:inset 0 0 0 1px #8FAED3!important}',
      // soft lines only; selected tab soft navy
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-phcake{border:1px solid var(--ccp-line)!important}',
      ':root:not(#cc-t0) #cc-staff :is(#ccs-sheet,#ccs-main) .ccs-secbtn[aria-selected="true"]{background:#E8F0F8!important;color:#1A4570!important;box-shadow:inset 0 0 0 1px #8FAED3!important;border-color:#8FAED3!important}',
      // finished order: Customer feedback leads
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-main > .fb-cta{margin:4px 0 12px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .fb-cta.ccp-gone,:root:not(#cc-t0) #cc-staff #ccs-sheet .ccp-gone{display:none!important}',
      // More options: one quiet line; opens a short list, most dangerous last
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-actions > .ccp-more{display:block!important;grid-column:1 / -1!important;width:100%!important;margin:6px 0 0!important;border-top:1px solid var(--ccp-line);padding-top:6px}',
      '#cc-staff #ccs-sheet .ccp-more-b{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 4px;background:none;border:0;color:#344054;font:inherit;font-weight:500;cursor:pointer}',
      '#cc-staff #ccs-sheet .ccp-more-b .ccp-ic{width:18px;height:18px;transition:transform .15s}#cc-staff #ccs-sheet .ccp-more.is-open .ccp-more-b .ccp-ic{transform:rotate(180deg)}',
      '#cc-staff #ccs-sheet .ccp-more-l{display:none;flex-direction:column;gap:8px;padding:4px 0 8px}#cc-staff #ccs-sheet .ccp-more.is-open .ccp-more-l{display:flex}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccp-more-l > .ccp-mitem{width:100%!important;min-height:52px!important;justify-content:center!important;margin:0!important;background:#fff!important;border:1px solid var(--ccp-line-2)!important;border-radius:12px!important;color:#1D2939!important;text-decoration:none!important;display:inline-flex!important;align-items:center!important;gap:8px!important;font-weight:500!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccp-more-l > .ccp-mitem.ccs-red,:root:not(#cc-t0) #cc-staff #ccs-sheet .ccp-more-l > .ccp-mitem[data-v^="cancel"]{color:#B42318!important;border-color:#F3B8B2!important}',
      // ---------- Customer profile ----------
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head > .vr-fav-toggle.ccp-fav{width:48px!important;height:48px!important;min-height:0!important;padding:0!important;border-radius:50%!important;font-size:0!important;gap:0!important;flex:none!important;display:inline-flex!important;align-items:center;justify-content:center;background:#fff!important;border:1px solid var(--ccp-line-2)!important;color:#475467!important;margin-left:auto!important;margin-right:8px!important;width:48px!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head > .vr-fav-toggle.ccp-fav svg{width:22px!important;height:22px!important;margin:0!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-sheet.rm-profile .ccs-sheet-head > .rm-identity{flex:1 1 0!important;min-width:0!important}:root:not(#cc-t0) #cc-staff #ccs-sheet.rm-profile .ccs-sheet-head{flex-wrap:nowrap!important;align-items:flex-start!important}}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head > .vr-fav-toggle.ccp-fav.is-on{color:#A63E6D!important;border-color:#E7A9C4!important;background:#FFF4F8!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-sheet-head > .vr-fav-toggle.ccp-fav.is-on svg{fill:currentColor}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet.rm-profile .rm-eyebrow{color:#475467!important}:root:not(#cc-t0) #cc-staff #ccs-sheet.rm-profile .rm-avatar{background:#E8F0F8!important;color:#1A4570!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet [data-act="cust-neworder"] > .rm-icon{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet a.ccs-btn[href*="wa.me"]{background:#E3F6EA!important;border-color:#9FDDB6!important;color:#0B7A3E!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metrics[data-ccp-n="2"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metric.ccp-rmk{background:#fff!important;border:1px solid var(--ccp-line)!important;box-shadow:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metric.ccp-rmk .rm-icon{color:#1A4570!important;background:#CADAEE!important;box-shadow:inset 0 0 0 1px #8FAED3!important;border-radius:10px!important;width:34px!important;height:34px!important;display:inline-flex!important;align-items:center;justify-content:center}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metric.ccp-rmk .rm-metric-value{font-size:26px!important;line-height:1.15!important;overflow-wrap:normal!important;word-break:normal!important;color:#1D2939!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metric.ccp-rmk .rm-metric-label{color:#344054!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .rm-metric.ccp-rmk .rm-metric-desc:empty{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .cd-zone.ccp-zone{background:none!important;border:0!important;border-top:1px solid var(--ccp-line)!important;border-radius:0!important;box-shadow:none!important;padding:6px 0 0!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .cd-zone.ccp-zone:not(.is-open) > :not(.ccp-more-b){display:none!important}',
      '#cc-staff #ccs-sheet .cd-zone .ccp-more-b{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 4px;background:none;border:0;color:#344054;font:inherit;font-weight:500;cursor:pointer}#cc-staff #ccs-sheet .cd-zone .ccp-more-b .ccp-ic{width:18px;height:18px}#cc-staff #ccs-sheet .cd-zone.is-open .ccp-more-b .ccp-ic{transform:rotate(180deg)}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .cd-zone .cd-ask{width:100%!important;min-height:52px!important;background:#fff!important;color:#B42318!important;border:1px solid #F3B8B2!important;border-radius:12px!important;box-shadow:none!important}',
      // ---------- Plain words ----------
      ':root:not(#cc-t0) #cc-staff .ccp-gone.ccp-gone:not(#cc-heartbeat *){display:none!important}',
      // status chip: one word, one colour (amber to do, navy plain, green done, grey closed)
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st]:not(#cc-heartbeat *){font-weight:600!important;border:1px solid transparent!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st="amber"]:not(#cc-heartbeat *){background:#FDF0D9!important;color:#8A4504!important;border-color:#E9C27F!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st="navy"]:not(#cc-heartbeat *){background:#E8F0F8!important;color:#1A4570!important;border-color:#9DB8D9!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st="green"]:not(#cc-heartbeat *){background:#E3F4EA!important;color:#05603A!important;border-color:#9ED2B3!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st="grey"]:not(#cc-heartbeat *){background:#F2F4F7!important;color:#475467!important;border-color:#D0D5DD!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st]:not(#cc-heartbeat *)::before{background:currentColor!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st:has(.ccp-kw){display:inline-flex!important;align-items:center;gap:6px}#cc-staff .ccs-pill.st .ccp-ic{width:16px;height:16px;flex:none}',
      // next step: icon + 2-4 words, coloured by meaning
      ':root:not(#cc-t0) #cc-staff .ccp-nx:not(#cc-heartbeat *){display:inline-flex!important;align-items:center!important;gap:8px!important;font-weight:600!important;font-style:normal!important;line-height:1.3!important;padding:6px 12px!important;border-radius:999px!important;margin:6px 0 0!important;width:auto!important;max-width:100%!important;border:1px solid transparent}',
      ':root:not(#cc-t0) #cc-staff .ccp-nx > .ccp-ic{width:18px!important;height:18px!important;flex:none;stroke-width:2.2!important}',
      ':root:not(#cc-t0) #cc-staff .ccp-nx[data-ccp-tone="amber"]{background:#FDF0D9!important;color:#8A4504!important;border-color:#E9C27F!important}',
      ':root:not(#cc-t0) #cc-staff .ccp-nx[data-ccp-tone="green"]{background:#E3F4EA!important;color:#05603A!important;border-color:#9ED2B3!important}',
      ':root:not(#cc-t0) #cc-staff .ccp-nx[data-ccp-tone="navy"]{background:#E8F0F8!important;color:#1A4570!important;border-color:#9DB8D9!important}',
      ':root:not(#cc-t0) #cc-staff p.ccs-nextline.ccp-nx{font-size:17px!important}',
      // phone list flag with its icon
      ':root:not(#cc-t0) #cc-staff .ccs-prow-f:has(> svg){display:inline-flex!important;align-items:center!important;gap:6px!important;white-space:nowrap!important}:root:not(#cc-t0) #cc-staff .ccs-prow-f > .ccp-ic{width:16px;height:16px;flex:none;stroke-width:2.2}',
      // kitchen: one-word step buttons with an icon
      ':root:not(#cc-t0) #cc-staff [data-act="k-next"]:has(> svg),:root:not(#cc-t0) #cc-staff [data-act="open-kitchen"].ccs-btn:has(> .ccp-ic){display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;min-width:150px!important}',
      ':root:not(#cc-t0) #cc-staff [data-act="k-next"] > .ccp-ic,:root:not(#cc-t0) #cc-staff [data-act="open-kitchen"].ccs-btn > .ccp-ic{width:20px;height:20px;flex:none;stroke-width:2.2}',
      // kitchen week: an empty day is just a dash
      '#cc-staff #ccs-main .kw-day.is-zero > :last-child{visibility:hidden}',
      // Today week cells on tablet and computer: count as a small pill, cells no taller than needed
      '@media (min-width:1280px) and (min-height:760px){:root:not(#cc-t0) #cc-staff #ccs-main[data-screen="today"] > .tq-week{align-self:start!important}}@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell{min-height:0!important;height:auto!important;padding:10px 4px!important}}',
      ':root:not(#cc-t0) #cc-staff .ccs-pill.st[data-ccp-st]:has(> svg)::before,:root:not(#cc-t0) #cc-staff .ccs-pill.st:has(.ccp-kw)::before{display:none!important}',
      ':root:not(#cc-t0) #cc-staff .ccp-nx{align-self:flex-start!important;justify-self:start!important;flex:0 0 auto!important;width:fit-content!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > span{font-size:13px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > em{font-size:0!important;line-height:0!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > em[data-n]::after{content:attr(data-n);display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 6px;border-radius:999px;background:#E8F0F8;color:#1A4570;font-size:13px;font-weight:600;line-height:22px;margin-top:4px}}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tp-nb.ccp-nx[data-ccp-tone="amber"]:not(#cc-heartbeat *){background:#FDF0D9!important;color:#8A4504!important;border:1px solid #E9C27F!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > em:not(#cc-heartbeat *){font-size:0!important;line-height:0!important;color:transparent!important;display:block!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > em[data-n]:not(#cc-heartbeat *)::after{color:#1A4570!important;line-height:22px!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell > span:not(#cc-heartbeat *){font-size:13px!important;overflow:hidden;text-overflow:clip;white-space:nowrap}}',
      '@media (max-width:759px){:root:not(#cc-t0) #cc-staff #ccs-sheet .os-detail > .ccs-secbar > .ccs-secbtn{flex-direction:column!important;gap:2px!important;padding:6px 2px!important;font-size:13px!important;min-height:56px!important;line-height:1.1!important}:root:not(#cc-t0) #cc-staff #ccs-sheet .os-detail > .ccs-secbar > .ccs-secbtn .ccp-ic{margin:0!important}}',
      ':root:not(#cc-t0) #cc-staff .ccs-prow-f:has(> svg)::before,:root:not(#cc-t0) #cc-staff .ccs-prow-f:has(> svg)::after{content:none!important;display:none!important}',
      ':root:not(#cc-t0) #cc-staff .ccs-prow-f:has(> svg){padding:4px 10px!important}:root:not(#cc-t0) #cc-staff .ccs-prow-m > span{white-space:nowrap!important}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell:not(#cc-heartbeat *){display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:center!important}:root:not(#cc-t0) #cc-staff #ccs-main .tq-days .ccs-daycell:not(:has(> em)):not(#cc-heartbeat *)::after{content:"";display:block;height:26px}}',
      ':root:not(#cc-t0) #cc-staff #ccs-main .tq-left:not(#cc-heartbeat *){display:inline-block!important;width:auto!important;max-width:100%!important;justify-self:start!important;align-self:flex-start!important}',
      // order details: four tabs, the rest under More
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-detail > .ccs-secbar:not(.ccp-tabs-open) > .ccs-secbtn.ccp-xtab{display:none!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .os-detail > .ccs-secbar{grid-template-columns:repeat(4,minmax(0,1fr))!important}',
      ':root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-secbar > .ccp-tabmore{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;order:99}:root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-secbar > .ccp-tabmore .ccp-ic{width:16px;height:16px}:root:not(#cc-t0) #cc-staff #ccs-sheet .ccs-secbar.ccp-tabs-open > .ccp-tabmore .ccp-ic{transform:rotate(180deg)}',
      '@media (min-width:760px){:root:not(#cc-t0) #cc-staff #ccs-sheet .os-detail > .ccs-secbar{display:flex!important}}',
      // Treat orders board: the same card language
      '#cc-staff #cc-to .cc-to-sum.ccp-sum{display:flex;align-items:center;gap:12px}',
      '#cc-staff #cc-to .cc-to-sum .cl-tile{flex:none;width:38px;height:38px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center}',
      '#cc-staff #cc-to .cc-to-sum .cl-tile .ccp-ic{width:60%;height:60%;stroke-width:2.2}',
      ':root:not(#cc-t0) #cc-staff #cc-to .cl-tile[data-ccp-tone="amber"]{background:#F7D9A6!important;box-shadow:inset 0 0 0 1px #E2AE5C!important;color:#8A4504!important;border:0!important}:root:not(#cc-t0) #cc-staff #cc-to .cl-tile[data-ccp-tone="green"]{background:#BCE6CC!important;box-shadow:inset 0 0 0 1px #7FCBA0!important;color:#05603A!important;border:0!important}',
      ':root:not(#cc-t0) #cc-staff #cc-to .cc-to-tabs .ccs-chip[aria-selected="true"]{background:#E8F0F8!important;border-color:#8FAED3!important;color:#1A4570!important;box-shadow:none!important}',
      '#cc-staff #cc-to .cc-to-o{border:1px solid var(--ccp-line);border-left:4px solid #B3BDC9;border-radius:var(--ccp-r);background:#fff}',
      '#cc-staff #cc-to .cc-to-o[data-ccp-tone="amber"]{border-left-color:#E2AE5C}#cc-staff #cc-to .cc-to-o[data-ccp-tone="red"]{border-left-color:#E9988E}#cc-staff #cc-to .cc-to-o[data-ccp-tone="green"]{border-left-color:#7FCBA0}',
      '#cc-staff #cc-to .cc-to-state{display:flex;align-items:center;gap:8px}#cc-staff #cc-to .ccp-sti{flex:none;display:inline-flex;width:22px;height:22px}#cc-staff #cc-to .ccp-sti .ccp-ic{width:100%;height:100%;stroke-width:2.2}',
      '#cc-staff #cc-to .cc-to-state[data-ccp-tone="amber"]{color:#8A4504}#cc-staff #cc-to .cc-to-state[data-ccp-tone="red"]{color:#9E1F14}#cc-staff #cc-to .cc-to-state[data-ccp-tone="green"]{color:#05603A}#cc-staff #cc-to .cc-to-state[data-ccp-tone="grey"]{color:#3E4A5C}',
      // Orders: tabs with nothing in them go quiet
      '#cc-staff #ccs-main .ccs-tab.ccp-quiet{color:#98A2B3!important}#cc-staff #ccs-main .ccs-tab.ccp-quiet .ccs-n{display:none!important}',
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
      if (scr === 'calendar') [['cal-status', 'Show', 'filter'], ['cal-type', 'Type', 'box']].forEach(function (c) { var s = doc.getElementById(c[0]); if (s && s.tagName === 'SELECT') dd(s, { label: c[1], hide: s.closest('label') || s, icons: { '*': c[2] } }); });
      if (main.querySelector('.cat-page, .dx-filters')) analytics(main);
      refine(main); sheet(); sheetFlow(); custFlow(); sheetTabs(); sheetNextOnce(); var shx = doc.getElementById('ccs-sheet'); if (shx) words(shx); var popx = doc.querySelectorAll('#cc-staff .tx-pop, #cc-staff [class*="-pop"]'); [].forEach.call(popx, function (x) { if (!main.contains(x)) words(x); }); pulseName();
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
    var wm = t.closest('.ccp-wmore');
    if (wm) { e.preventDefault(); e.stopPropagation(); var k0 = wm.getAttribute('data-k'); warnOpen[k0] = !warnOpen[k0]; run(); return; }
    var i = t.closest('.ccp-i');
    if (i) { e.preventDefault(); e.stopPropagation(); var f = doc.querySelector('#ccs-main .ccp-fine'); var on = i.getAttribute('aria-expanded') !== 'true'; i.setAttribute('aria-expanded', String(on)); if (f) f.classList.toggle('is-open', on); return; }
    if (t.closest('.ccp-tabmore')) { e.preventDefault(); e.stopPropagation(); tabsOpen = !tabsOpen; run(); return; }
    if (t.closest('.ccp-cmore')) { e.preventDefault(); custMore = !custMore; run(); return; }
    if (t.closest('.ccp-more-b')) { e.preventDefault(); var shp = doc.getElementById('ccs-sheet'), rk = (shp && shp.__ccpRef) || 'x'; moreOpen[rk] = !moreOpen[rk]; run(); return; }
    if (t.closest('.ccp-flag-b')) { e.preventDefault(); flagOpen = !flagOpen; run(); return; }
    if (t.closest('.ccp-fu-all')) { var fb = doc.querySelector('#ccs-main .ccs-secbtn[data-g="crm"][data-v="fu"]'); if (fb) fb.click(); return; }
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

/* Design foundation (28 Oct 2026, Roneel: enterprise design brief, items 1-3; his text and button sizes stay).
 * One pass over the app's own style sheets (never Webflow's), changing presentation values only:
 *  - font weights: 650-900 and "bold" become 600 (one heavy weight across the app; headings stay semi-bold)
 *  - light neutral grey borders (15+ near-identical greys) become one border colour, #E4E7EC
 *  - corner sizes: 7 -> 8, 9 and 11 -> 10, 13 to 18 and 22 -> 12 (pills, circles and small chart radii untouched)
 *  - resting card shadows become one quiet shadow; menus, sheets, pop-ups, tooltips and focus rings keep theirs
 * Plus: page titles all carry their sidebar icon, no uppercase eyebrow over the title, and selections use the soft
 * navy of the Orders tabs (Handover cards, Analytics categories) instead of thick black or solid teal.
 * Sheets added later (add-ons load after the app) are processed as they appear. Undo: remove this block. */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccDesign20261028) return;
  win.__ccDesign20261028 = true;
  var BORDER = '#E4E7EC', SHADOW = '0 1px 2px rgba(16, 24, 40, 0.05)';
  var RAD = { '7px': '8px', '9px': '10px', '11px': '10px', '13px': '12px', '14px': '12px', '15px': '12px', '16px': '12px', '18px': '12px', '22px': '12px' };
  var KEEP_SHADOW = /sheet|modal|dialog|menu|pop|dd-|ccdd|toast|drop|tip|tooltip|focus|hover|active|is-open|pressed|selected|is-on|is-cur|pin|sticky|bar\b|float|overlay|ring|cce-m|cc2s|drag/i;
  function rgb(v) {
    if (!v) return null; v = v.trim();
    var m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) { var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    m = v.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\)$/i);
    if (m && (m[4] == null || parseFloat(m[4]) >= 0.99)) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function neutralLight(v) { var c = rgb(v); if (!c) return false; var mx = Math.max.apply(null, c), mn = Math.min.apply(null, c); return mn >= 205 && mx <= 242 && mx - mn <= 22 && !(c[0] === 228 && c[1] === 231 && c[2] === 236); }
  var SIDES = ['top', 'right', 'bottom', 'left'];
  function fix(rule) {
    var st = rule.style, sel = rule.selectorText || '';
    var fs = st.getPropertyValue('font-size');
    if (/^(9|10|11|12)(\.\d+)?px$/.test(fs.trim()) && !/nav|side|brand|logo/i.test(sel)) st.setProperty('font-size', '13px', st.getPropertyPriority('font-size'));
    var w = st.getPropertyValue('font-weight');
    if (w && (/^(bold|bolder)$/i.test(w) || (+w >= 650 && +w <= 900))) st.setProperty('font-weight', '600', st.getPropertyPriority('font-weight'));
    SIDES.forEach(function (s) {
      var p = 'border-' + s + '-color', v = st.getPropertyValue(p);
      if (v && neutralLight(v)) st.setProperty(p, BORDER, st.getPropertyPriority(p));
    });
    ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'].forEach(function (p) {
      var v = st.getPropertyValue(p); if (v && RAD[v.trim()]) st.setProperty(p, RAD[v.trim()], st.getPropertyPriority(p));
    });
    // colour and radius tokens: only line/border-type variables, so backgrounds are never touched
    for (var i = 0; i < st.length; i++) {
      var n = st[i]; if (n.indexOf('--') !== 0) continue;
      var val = st.getPropertyValue(n).trim();
      if (/line|divider|border|stroke|edge|rule/i.test(n) && neutralLight(val)) st.setProperty(n, BORDER, st.getPropertyPriority(n));
      else if (/radius|rad\b|-r$/i.test(n) && RAD[val]) st.setProperty(n, RAD[val], st.getPropertyPriority(n));
    }
    var sh = st.getPropertyValue('box-shadow');
    if (sh && sh !== 'none' && !/inset/.test(sh) && !/\b0(px)? 0(px)? 0(px)? [1-9]/.test(sh) && !KEEP_SHADOW.test(sel)) st.setProperty('box-shadow', SHADOW, st.getPropertyPriority('box-shadow'));
  }
  function walk(rules) { for (var i = 0; i < rules.length; i++) { var r = rules[i]; if (r.cssRules && !r.style) walk(r.cssRules); else if (r.style && r.selectorText) { try { fix(r); } catch (e) {} } } }
  var done = typeof WeakMap === 'function' ? new WeakMap() : null;
  function pass() {
    [].forEach.call(doc.querySelectorAll('style'), function (el) {
      if (el.id === 'ccd-style' || !el.sheet) return;
      var sig = el.textContent.length;
      if (done && done.get(el) === sig) return;
      try { walk(el.sheet.cssRules); } catch (e) {}
      if (done) done.set(el, sig);
    });
  }
  var NAVY = 'rgb(36, 95, 153)', SOFT = 'rgb(234, 243, 252)';
  var CSS = [
    '#cc-staff b,#cc-staff strong,#cc-staff h1,#cc-staff h2,#cc-staff h3,#cc-staff h4,#cc-staff h5,#cc-staff h6,#cc-staff th{font-weight:600}',
    // page titles: no uppercase line above the title
    '#cc-staff #ccs-main > .ccs-head .ccs-eyebrow{display:none!important}',
    // selections: the soft navy of the Orders tabs
    '#cc-staff #ccs-main .ap-island.is-open{border-color:' + NAVY + '!important;background:' + SOFT + '!important;box-shadow:0 0 0 1px ' + NAVY + '!important}',
    '#cc-staff .cc-nav5 > button[aria-pressed="true"]{background:' + SOFT + '!important;color:' + NAVY + '!important;border-color:' + NAVY + '!important;box-shadow:none!important}',
    '#cc-staff .cc-nav5 > button[aria-pressed="true"] *{color:inherit!important}',
    // ---- items 4-8 (28 Oct 2026) ----
    // no uppercase labels in the content (sidebar group names stay)
    'html:not(#ccd0) body:not(#ccd1) #cc-staff :is(#ccs-main,#ccs-sheet) *{text-transform:none!important;letter-spacing:normal}',
    // Calendar: plain weekday row (colour only where it means something), number cards without coloured edges
    'html:not(#ccd0) body:not(#ccd1) #cc-staff #ccs-main .ccs-mhead span{background:#F9FAFB!important;border-bottom:1px solid ' + BORDER + '!important;color:#475467!important}',
    'html:not(#ccd0) body:not(#ccd1) #cc-staff #ccs-main .ccv-stat{border-left:1px solid ' + BORDER + '!important;box-shadow:' + SHADOW + '!important;background-image:none!important}',
    'html:not(#ccd0) body:not(#ccd1) #cc-staff #ccs-main .ccv-stat::before,html:not(#ccd0) body:not(#ccd1) #cc-staff #ccs-main .ccv-stat::after{display:none!important}',
    'html:not(#ccd0) body:not(#ccd1) #cc-staff #ccs-main .kw-day em{font-size:13px!important}',
    // Settings: group names readable, sentence case
    'html:not(#ccd0) body:not(#ccd1) #cc-staff .cca-menu .cca-mh{font-size:15px!important;font-weight:600!important;color:#475467!important}',
    // actions written as words look tappable: navy, underlined (red ones stay red)
    'html:not(#ccd0) body:not(#ccd1) #cc-staff :is(#ccs-main,#ccs-sheet) .ccs-link:not(.ccs-red){color:' + NAVY + '!important}',
    'html:not(#ccd0) body:not(#ccd1) #cc-staff :is(#ccs-main,#ccs-sheet) .ccs-link{text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:3px!important;text-decoration-color:currentColor!important}',
    'html:not(#ccd0) body:not(#ccd1) #cc-staff :is(#ccs-main,#ccs-sheet) .ccs-link:hover{text-decoration-thickness:2px!important}',
    // Orders filter tabs: tabs on wide screens, one Show dropdown when narrow
    '#cc-staff .ccp-narrow{display:none!important}',
    '@media (max-width:899px){#cc-staff #ccs-main .ccp-narrow{display:inline-flex!important;margin:0}#cc-staff #ccs-main .ccp-narrowsrc{display:none!important}}'
  ].join('');
  function styles() { if (doc.getElementById('ccd-style')) return; var s = doc.createElement('style'); s.id = 'ccd-style'; s.textContent = CSS; doc.head.appendChild(s); }
  function titleIcon() {
    var main = doc.getElementById('ccs-main'); if (!main) return;
    var h1 = main.querySelector(':scope > .ccs-head h1.ccs-title, :scope > .ccs-head .ccs-title'); if (!h1 || h1.querySelector('.ccp-tic')) return;
    var scr = main.getAttribute('data-screen'), src = scr && doc.querySelector('#cc-staff .ccs-nav [data-tab="' + scr + '"] svg');
    if (!src) return;
    var c = src.cloneNode(true); c.setAttribute('class', 'ccp-tic'); c.setAttribute('aria-hidden', 'true'); h1.insertBefore(c, h1.firstChild); h1.classList.add('ccp-hast');
  }
  var q = false;
  function tick() { if (q) return; q = true; setTimeout(function () { q = false; try { styles(); pass(); titleIcon(); } catch (e) { if (win.console) console.warn('[Design]', e); } }, 30); }
  function start() { new MutationObserver(tick).observe(doc.documentElement, { childList: true, subtree: true, characterData: true }); tick(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  win.CCDesign = { pass: pass };
})();
