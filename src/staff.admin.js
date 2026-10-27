/* Corner Café Service Hub: Admin console (27 October 2026) — Step A, preview branch.
 * Settings opens on an overview: six groups, each listing its settings with the live status the app already shows
 * (read from each section's own header, so it can never disagree with the section). A search finds any setting.
 * Opening a setting shows only its group's settings as tabs, a path back to the overview, one consistent header,
 * and long explanations behind an "i". Warnings stay visible. Sections, saving, permissions and data are unchanged:
 * every row simply presses the app's own section button.
 */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccAdmin20261027) return;
  win.__ccAdmin20261027 = true;

  var I = {"globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 3a13 13 0 0 0 0 18 13 13 0 0 0 0-18M3 12h18\"/>", "cake": "<path d=\"M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8\"/><path d=\"M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1\"/><path d=\"M2 21h20M7 8v3M12 8v3M17 8v3\"/>", "cal": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "bell": "<path d=\"M10.3 21a2 2 0 0 0 3.4 0M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8\"/>", "shield": "<path d=\"M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z\"/>", "db": "<ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v14a8 3 0 0 0 16 0V5M4 12a8 3 0 0 0 16 0\"/>", "chev": "<path d=\"m6 9 6 6 6-6\"/>", "arrow": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>", "alert": "<path d=\"m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3M12 9v4M12 17h.01\"/>", "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>", "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7\"/>", "star": "<path d=\"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z\"/>", "truck": "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>", "calx": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4\"/>", "gift": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5\"/>", "layers": "<path d=\"m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>", "back": "<path d=\"m15 18-6-6 6-6\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8h.01\"/>", "trash": "<path d=\"M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14\"/>", "mail": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m22 7-9 5.7a2 2 0 0 1-2 0L2 7\"/>"};
  function svg(k, c) { return I[k] ? '<svg class="cca-ic' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + I[k] + '</svg>' : ''; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  // Groups, built only from sections the app actually shows this user (permissions decide what appears)
  var GROUPS = [
    // Kazumi Service Hub format (Roneel, 28 Oct 2026): full words, grouped by job
    { k: 'ordering', t: 'Ordering and availability', ic: 'globe', s: ['Online orders', 'Notice and collection hours', 'Closed days'] },
    { k: 'menu', t: 'Menu and pricing', ic: 'cake', s: ['Cakes and prices', 'Seasonal items', 'Delivery areas'] },
    { k: 'calendar', t: 'Calendar', ic: 'cal', s: ['Occasions and special dates', 'Events and public holidays'] },
    { k: 'alerts', t: 'Alerts and communications', ic: 'bell', s: ['Order alerts', 'Kitchen printing', 'Communications'] },
    { k: 'team', t: 'People and access', ic: 'users', s: ['Team and access', 'What each level can do'] },
    { k: 'data', t: 'Data and safety', ic: 'shield', s: ['Backup and business continuity', 'Deleted orders', 'Remove Settings entries'] }
  ];
  var KEYWORDS = {
    'Online orders': 'website pause stop accept online form', 'Notice and collection hours': 'lead time days notice pickup collection hours slots limit per day',
    'Closed days': 'closed holiday shut day off', 'Cakes and prices': 'cake price size flavour menu product', 'Seasonal items': 'festive christmas treats seasonal limited',
    'Delivery areas': 'delivery fee area zone', 'Occasions and special dates': 'occasion birthday christmas mothers day special', 'Events and public holidays': 'event public holiday calendar',
    'Order alerts': 'email alert notify new order kitchen', 'Kitchen printing': 'printer print slip kitchen paper', 'Communications': 'customer email message template',
    'Team and access': 'staff user people level role permission access login', 'Backup and business continuity': 'backup google sheet restore continuity',
    'Deleted orders': 'deleted restore order', 'Remove Settings entries': 'remove delete entry'
  };
  var SEC_IC = { 'Online orders': 'globe', 'Notice and collection hours': 'clock', 'Closed days': 'calx', 'Cakes and prices': 'cake', 'Seasonal items': 'gift',
    'Delivery areas': 'truck', 'Occasions and special dates': 'star', 'Events and public holidays': 'flag', 'Order alerts': 'bell', 'Kitchen printing': 'printer',
    'Communications': 'mail', 'Team and access': 'users', 'What each level can do': 'shield', 'Backup and business continuity': 'db', 'Deleted orders': 'trash', 'Remove Settings entries': 'trash' };
  // the short name used for a setting's key fact on the overview cards
  var FACT = { 'Online orders': 'Website orders', 'Notice and collection hours': 'Notice', 'Cakes and prices': 'On sale', 'Seasonal items': 'Seasonal', 'Delivery areas': 'Delivery',
    'Order alerts': 'Alerts go to', 'Team and access': 'Staff', 'Backup and business continuity': 'Backup', 'Deleted orders': 'Deleted orders' };
  var DEF_IC = { 'Order alerts': 'mail', 'Team and access': 'users', 'Deleted orders': 'trash', 'Remove Settings entries': 'trash', 'Communications': 'mail', 'Kitchen printing': 'printer' };
  // status colour by meaning
  function tone(s) {
    if (!s || /^Checking/i.test(s)) return '';
    if (/paused|failed|stopped|not taking|error/i.test(s)) return 'red';
    if (/not set up|test mode|not verified|not checked|needs|waiting|overdue|confirm/i.test(s)) return 'amber';
    if (/^(none|0\b|no )/i.test(s)) return 'grey';
    if (/taking orders|working|verified|up to date|healthy|\bon\b/i.test(s)) return 'green';
    return 'navy';
  }

  var view = 'home', q = '';
  try { var sv = sessionStorage.getItem('cca-view'); if (sv) view = sv; } catch (e) {}
  function setView(v) { view = v; try { sessionStorage.setItem('cca-view', v); } catch (e) {} }

  // the header's status is its last span; the "i" button added later must not shift it
  function lastSpan(sm) { var k = [].filter.call(sm.children, function (c) { return !c.classList.contains('cca-i'); }), l = k[k.length - 1]; return l && l.tagName === 'SPAN' ? l : null; }
  function sections(set) {
    var nav = set.querySelector(':scope > .ccs-setnav');
    var btns = nav ? [].slice.call(nav.querySelectorAll('[data-setk]')) : [];
    var dets = [].slice.call(set.querySelectorAll(':scope > details'));
    var byTitle = {};
    dets.forEach(function (d) { var sm = d.querySelector(':scope > summary'); if (!sm) return; var t = txt(sm.firstElementChild || sm), st = txt(lastSpan(sm)); var full = txt(sm); var title = (t && full.indexOf(t) === 0 && t !== st) ? t : full.replace(st, '').trim(); byTitle[title] = { d: d, status: st !== title ? st : '' }; });
    return btns.map(function (b) {
      var k = b.getAttribute('data-setk'), info = byTitle[k] || {};
      var body = info.d && info.d.querySelector('.ccs-set-body'), extra = '';
      if (body && /test mode is on/i.test(body.textContent)) extra = 'Test mode';
      var st = info.status || ''; if (/^administrators?$/i.test(st) || (st.split(' ').length > 4 && !/\d/.test(st))) st = '';
      var bic = b.querySelector('svg'); return { k: k, b: b, d: info.d, status: st, flag: extra, ic: SEC_IC[k] ? svg(SEC_IC[k]) : bic ? bic.outerHTML : svg(DEF_IC[k] || 'layers') };
    }).filter(function (s) { return s.k !== 'Remove Settings entries'; })   // retired 28 Oct 2026: off sale or archive instead
      .concat(commsRow(set, btns));
  }
  // Email templates (22 Oct) sit in the old Settings list, which this home hides: shown here as Communications,
  // opening the email templates window directly (Roneel, 27 Oct 2026 11:52 PM: "its not there")
  function commsRow(set, btns) {
    if (!set.querySelector(':scope > #et-comm') || !win.CCEmailTemplates || typeof win.CCEmailTemplates.open !== 'function') return [];
    if (btns.some(function (b) { return b.getAttribute('data-setk') === 'Communications'; })) return [];
    return [{ k: 'Communications', b: null, d: null, status: 'Email templates', flag: '', ic: svg('mail'), et: true }];
  }
  function groupOf(k) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].s.indexOf(k) > -1) return GROUPS[i]; return { k: 'other', t: 'Other', ic: 'layers', s: [] }; }

  function rowHtml(s) {
    var st = s.flag || s.status, tn = tone(st), name = s.k === 'Remove Settings entries' ? 'Remove entries' : s.k;
    var fact = FACT[s.k] && !q;   // shown in the card's key facts instead
    return '<button type="button" class="cca-row" data-cca-open="' + esc(s.k) + '"><span class="cca-ric">' + s.ic + '</span><span class="cca-rx"><span class="cca-rt">' + esc(name) + '</span>' +
      (st && !fact && s.k !== 'Communications' && !/^Checking/i.test(st) ? '<span class="cca-st" data-tone="' + tn + '">' + esc(st) + '</span>' : '') + '</span>' + svg('chev', 'cca-go') + '</button>';
  }
  function factHtml(s) {
    var v = s.flag || s.status, tn = tone(v);
    return '<div class="cca-fact"><dt>' + esc(FACT[s.k]) + '</dt><dd>' + (/red|amber|green/.test(tn) ? '<span class="cca-st" data-tone="' + tn + '">' + esc(v) + '</span>' : esc(v)) + '</dd></div>';
  }
  function linkName(k) { return k === 'Remove Settings entries' ? 'Remove entries' : k; }
  // Kazumi's settings menu: Overview, then each group's settings, always beside the page on computers
  function menu(main, list, curKey) {
    var m = main.querySelector(':scope > .cca-menu');
    var groups = [], others = [];
    GROUPS.forEach(function (g) { var items = list.filter(function (s) { return g.s.indexOf(s.k) > -1; }); if (items.length) groups.push({ g: g, items: items }); });
    list.forEach(function (s) { if (groupOf(s.k).k === 'other') others.push(s); });
    if (others.length) groups.push({ g: { k: 'other', t: 'Other' }, items: others });
    var h = '<label class="cca-search cca-msearch">' + svg('search') + '<input type="search" placeholder="Find a setting" value="' + esc(q) + '" aria-label="Find a setting" data-cca-q></label>' +
      '<button type="button" class="cca-mi cca-mov" data-cca-home aria-current="' + (curKey === 'home' ? 'page' : 'false') + '">' + svg('layers') + '<span>Overview</span></button>' +
      groups.map(function (x) {
        return '<p class="cca-mh">' + esc(x.g.t) + '</p>' + x.items.map(function (s) {
          return '<button type="button" class="cca-mi" data-cca-open="' + esc(s.k) + '" aria-current="' + (curKey === s.k ? 'page' : 'false') + '">' + s.ic + '<span>' + esc(linkName(s.k)) + '</span></button>';
        }).join('');
      }).join('');
    if (!m) { m = doc.createElement('nav'); m.className = 'cca-menu'; m.setAttribute('aria-label', 'Settings'); var head = main.querySelector(':scope > .ccs-head'); if (head) head.after(m); else main.insertBefore(m, main.firstChild); }
    if (m.getAttribute('data-h') !== h) {
      var hadFocus = doc.activeElement && m.contains(doc.activeElement) && doc.activeElement.hasAttribute('data-cca-q'), pos = hadFocus ? doc.activeElement.selectionStart : 0;
      m.innerHTML = h; m.setAttribute('data-h', h);
      if (hadFocus) { var inp = m.querySelector('[data-cca-q]'); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
  function home(main, set, list) {
    var box = main.querySelector(':scope > .cca-home');
    var groups = [], others = [];
    GROUPS.forEach(function (g) { var items = list.filter(function (s) { return g.s.indexOf(s.k) > -1; }); if (items.length) groups.push({ g: g, items: items }); });
    list.forEach(function (s) { if (groupOf(s.k).k === 'other') others.push(s); });
    if (others.length) groups.push({ g: { k: 'other', t: 'Other', ic: 'layers' }, items: others });
    var needs = list.filter(function (s) { var t = tone(s.flag || s.status); return t === 'red' || t === 'amber'; });
    var ql = q.toLowerCase();
    var match = function (s) { return !ql || (s.k + ' ' + (KEYWORDS[s.k] || '') + ' ' + s.status).toLowerCase().indexOf(ql) > -1; };
    var h = '<div class="cca-top"><label class="cca-search">' + svg('search') + '<input type="search" placeholder="Find a setting" value="' + esc(q) + '" aria-label="Find a setting" data-cca-q></label></div>';
    if (needs.length && !ql) h += '<div class="cca-needs" role="status">' + svg('alert') + '<span>Needs attention</span>' + needs.map(function (s) { return '<button type="button" class="cca-chip" data-tone="' + tone(s.flag || s.status) + '" data-cca-open="' + esc(s.k) + '">' + esc(s.k === 'Backup and business continuity' ? 'Backup' : s.k) + ' · ' + esc(s.flag || s.status) + '</button>'; }).join('') + '</div>';
    var shown = 0;
    h += '<div class="cca-grid">' + groups.map(function (x) {
      var items = x.items.filter(match); shown += items.length; if (!items.length) return '';
      var facts = ql ? [] : items.filter(function (s) { return FACT[s.k] && (s.flag || s.status); });
      return '<section class="cca-card" data-cca-g="' + x.g.k + '"><button type="button" class="cca-ch" data-cca-open="' + esc(items[0].k) + '"><span class="cca-gic">' + svg(x.g.ic) + '</span><h2>' + esc(x.g.t) + '</h2>' + svg('chev', 'cca-go') + '</button>' +
        (facts.length ? '<dl class="cca-facts">' + facts.map(factHtml).join('') + '</dl>' : '') +
        '<div class="cca-rows">' + items.map(rowHtml).join('') + '</div></section>';
    }).join('') + '</div>';
    if (!shown) h += '<p class="cca-empty">No setting matches “' + esc(q) + '”.</p>';
    if (!box) { box = doc.createElement('div'); box.className = 'cca-home'; main.insertBefore(box, set); }
    if (box.getAttribute('data-h') !== h) {
      var hadFocus = doc.activeElement && doc.activeElement.hasAttribute && doc.activeElement.hasAttribute('data-cca-q'), pos = hadFocus ? doc.activeElement.selectionStart : 0;
      box.innerHTML = h; box.setAttribute('data-h', h);
      if (hadFocus) { var inp = box.querySelector('[data-cca-q]'); inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} }
    }
  }
  function sectionBar(main, set, list, cur) {
    var g = groupOf(cur.k), mates = list.filter(function (s) { return groupOf(s.k).k === g.k; });
    var bar = main.querySelector(':scope > .cca-bar');
    var h = '<button type="button" class="cca-back" data-cca-home>' + svg('back') + '<span>All settings</span></button><nav class="cca-crumb" aria-label="Where you are"><span>' + esc(g.t) + '</span>' + svg('chev', 'cca-sep') + '<b>' + esc(cur.k === 'Remove Settings entries' ? 'Remove entries' : cur.k) + '</b></nav>' +
      (mates.length > 1 ? '<div class="cca-tabs" role="tablist">' + mates.map(function (s) { return '<button type="button" role="tab" class="cca-tab" aria-selected="' + (s.k === cur.k) + '" data-cca-open="' + esc(s.k) + '">' + s.ic + '<span>' + esc(s.k === 'Remove Settings entries' ? 'Remove entries' : s.k) + '</span></button>'; }).join('') + '</div>' : '');
    if (!bar) { bar = doc.createElement('div'); bar.className = 'cca-bar'; main.insertBefore(bar, set); }
    if (bar.getAttribute('data-h') !== h) { bar.innerHTML = h; bar.setAttribute('data-h', h); }
  }
  // long explanations behind an "i"; warnings, errors and notes that need action stay visible
  var infoOpen = {};
  function quiet(cur) {
    var d = cur.d; if (!d) return;
    var body = d.querySelector('.ccs-set-body'); if (!body) return;
    var long = [].slice.call(body.querySelectorAll('p')).filter(function (p) {
      if (p.closest('.cca-keep, [class*="warn"], [class*="alert"], [class*="err"], [class*="needs"], [role="alert"], .ccs-note') || p.querySelector('input, select, button, textarea, a')) return false;
      var w = txt(p).split(' ').length; return w >= 14 || (p.classList.contains('ccs-hint') && w >= 9);
    });
    var tg = d.querySelector(':scope > summary .cca-i');
    if (!long.length) { if (tg) tg.remove(); return; }
    var open = !!infoOpen[cur.k];
    long.forEach(function (p) { p.classList.add('cca-hidetext'); p.classList.toggle('cca-show', open); });
    if (!tg) { var sm = d.querySelector(':scope > summary'); if (sm) { sm.insertAdjacentHTML('beforeend', '<button type="button" class="cca-i" aria-expanded="false" aria-label="More about this setting">' + svg('info') + '</button>'); tg = sm.querySelector('.cca-i'); tg.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); infoOpen[view] = !infoOpen[view]; schedule(); }); } }
    if (tg) { tg.setAttribute('aria-expanded', String(open)); tg.classList.toggle('is-on', open); }
  }
  function headerTone(list) { list.forEach(function (s) { if (!s.d) return; var sm0 = s.d.querySelector(':scope > summary'), sp = sm0 && lastSpan(sm0); if (sp) { var t = tone(s.flag || s.status); if (sp.getAttribute('data-tone') !== t) sp.setAttribute('data-tone', t); sp.classList.add('cca-hst'); } }); }

  function render() {
    var main = doc.getElementById('ccs-main'); if (!main) return;
    var set = main.getAttribute('data-screen') === 'settings' && main.querySelector(':scope > .ccs-set');
    if (!set) { main.classList.remove('cca-on', 'cca-home-on', 'cca-sec-on'); var om = main.querySelector(':scope > .cca-menu'); if (om) om.remove(); return; }
    var list = sections(set); if (!list.length) return;
    main.classList.add('cca-on');
    headerTone(list);
    var cur = list.filter(function (s) { return s.d && s.d.classList.contains('is-cur'); })[0] || list[0];
    if (view !== 'home' && cur.k !== view) { var want = list.filter(function (s) { return s.k === view; })[0]; if (want) { want.b.click(); return; } setView('home'); }
    var isHome = view === 'home';
    main.classList.toggle('cca-home-on', isHome); main.classList.toggle('cca-sec-on', !isHome);
    menu(main, list, isHome ? 'home' : cur.k);
    if (isHome) home(main, set, list); else { sectionBar(main, set, list, cur); quiet(cur); }
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { render(); } catch (e) { if (win.console) console.warn('[Admin console]', e); } }); }

  doc.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var o = t.closest('[data-cca-open]');
    if (o && o.getAttribute('data-cca-open') === 'Communications' && doc.querySelector('#cc-staff .ccs-set > #et-comm') && win.CCEmailTemplates) { e.preventDefault(); try { win.CCEmailTemplates.open(); } catch (er) {} return; }
    if (o) { e.preventDefault(); var k = o.getAttribute('data-cca-open'); setView(k); var b = doc.querySelector('#ccs-main .ccs-setnav [data-setk="' + (win.CSS && CSS.escape ? CSS.escape(k) : k) + '"]'); if (b) b.click(); schedule(); var m = doc.getElementById('ccs-main'); if (m) m.scrollTop = 0; return; }
    if (t.closest('[data-cca-home]')) { e.preventDefault(); setView('home'); schedule(); var m2 = doc.getElementById('ccs-main'); if (m2) m2.scrollTop = 0; return; }
    var i = t.closest('.cca-i');
    if (i) { e.preventDefault(); return; }   // handled on the button itself (other add-ons stop clicks inside the section header)
    // the sidebar Settings item always starts at the overview
    if (t.closest('#cc-staff [data-tab="settings"]')) { setView('home'); q = ''; schedule(); }
  }, true);
  doc.addEventListener('input', function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute('data-cca-q')) { q = t.value; if (view !== 'home') setView('home'); schedule(); } });
  doc.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute('data-cca-q') && e.key === 'Enter') { var first = doc.querySelector('#ccs-main .cca-home .cca-row'); if (first) first.click(); }
    if (e.key === 'Escape' && view !== 'home' && doc.getElementById('ccs-main') && doc.getElementById('ccs-main').classList.contains('cca-sec-on') && !doc.querySelector('#ccs-sheet.ccs-open, .ccdd-pop')) { setView('home'); schedule(); }
  });

  // ---------- Look (scoped to the Settings screen; 4 ids beat the app's touch standard) ----------
  var S = ':root:not(#cca0) #cc-staff #ccs-main.cca-on';
  var css = [
    S + '.cca-home-on > .ccs-set{display:none!important}',
    S + '.cca-sec-on > .ccs-set > .ccs-setnav{display:none!important}',
    S + '.cca-sec-on > .ccs-set{display:block!important;grid-template-columns:none!important}',
    S + '.cca-sec-on > .ccs-set > details.is-cur{max-width:1100px;margin:0!important}',
    S + ' > .ccs-head .ccs-sub{display:none!important}',
    // overview
    S + ' .cca-top{display:flex;gap:12px;align-items:center;margin:0 0 14px}',
    S + ' .cca-search{flex:1 1 auto;max-width:520px;display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;border:1px solid #D0D5DD;border-radius:12px;background:#fff}',
    S + ' .cca-search:focus-within{border-color:#245F99;box-shadow:0 0 0 3px rgba(36,95,153,.15)}',
    S + ' .cca-search .cca-ic{width:20px;height:20px;color:#667085;flex:none}',
    S + ' .cca-search input{flex:1 1 auto;min-width:0;border:0!important;outline:0!important;background:none!important;font:inherit;font-size:17px;height:100%;padding:0!important;box-shadow:none!important;min-height:0!important}',
    S + ' .cca-needs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px;padding:10px 14px;border:1px solid #F1D29A;background:#FFFAEB;border-radius:12px;color:#8A4504;font-weight:600}',
    S + ' .cca-needs > .cca-ic{width:20px;height:20px;flex:none}',
    S + ' .cca-chip{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #E9C27F;background:#fff;color:#8A4504;font:inherit;font-size:15px;font-weight:600;cursor:pointer}',
    S + ' .cca-chip[data-tone="red"]{border-color:#F3B8B2;color:#9E1F14}',
    S + ' .cca-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:14px;align-items:start}',
    S + ' .cca-card{background:#fff;border:1px solid #E4E7EC;border-radius:14px;overflow:hidden}',
    S + ' .cca-card > header{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}',
    S + ' .cca-card h2{margin:0;font-size:17px;font-weight:600;color:#1D2939;letter-spacing:0}',
    S + ' .cca-gic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:#E8F0F8;color:#1A4570;box-shadow:inset 0 0 0 1px #B8CDE4;flex:none}',
    S + ' .cca-gic .cca-ic{width:19px;height:19px}',
    S + ' .cca-rows{display:flex;flex-direction:column;padding:0 6px 6px}',
    S + ' .cca-row{display:grid;grid-template-columns:28px minmax(0,1fr) 18px;align-items:center;gap:10px;width:100%;min-height:56px;padding:8px;border:0;border-top:1px solid #F2F4F7;background:none;text-align:left;font:inherit;color:#1D2939;cursor:pointer;border-radius:10px}',
    S + ' .cca-rows > .cca-row:first-child{border-top-color:transparent}',
    S + ' .cca-row:hover,' + S + ' .cca-row:focus-visible{background:#F5F8FC;outline:none}',
    S + ' .cca-row:focus-visible{box-shadow:inset 0 0 0 2px #245F99}',
    S + ' .cca-ric{display:inline-flex;color:#475467}' + S + ' .cca-ric svg{width:20px;height:20px}',
    S + ' .cca-rx{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}',
    S + ' .cca-rt{font-size:16px;line-height:1.3;min-width:0}',
    S + ' .cca-go{width:18px;height:18px;color:#98A2B3;transform:rotate(-90deg)}',
    // status chips (colour by meaning)
    S + ' :is(.cca-st,.cca-hst){display:inline-flex;align-items:center;max-width:220px;min-height:26px;padding:2px 10px;border-radius:999px;font-size:14px;font-weight:600;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#F2F4F7;color:#344054;border:1px solid #E4E7EC}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="green"]{background:#E3F4EA;color:#05603A;border-color:#9ED2B3}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="amber"]{background:#FDF0D9;color:#8A4504;border-color:#E9C27F}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="red"]{background:#FDECEA;color:#9E1F14;border-color:#F3B8B2}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="navy"]{background:#E8F0F8;color:#1A4570;border-color:#B8CDE4}',
    S + ' :is(.cca-st,.cca-hst)[data-tone="grey"]{background:#F2F4F7;color:#475467;border-color:#E4E7EC}',
    S + ' .cca-rx > .cca-st{min-height:22px;font-size:13px;padding:1px 8px;max-width:100%}',
    S + '.cca-sec-on > .cca-home,' + S + '.cca-home-on > .cca-bar{display:none!important}',
    S + ' .cca-empty{color:#475467;margin:18px 4px}',
    // section view: path back, group tabs, one consistent header
    S + ' .cca-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:0 0 14px}',
    S + ' .cca-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 8px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#1D2939;font:inherit;font-size:15px;font-weight:600;cursor:pointer}',
    S + ' .cca-back .cca-ic{width:18px;height:18px}',
    S + ' .cca-crumb{display:flex;align-items:center;gap:6px;color:#475467;font-size:15px;min-width:0}' + S + ' .cca-crumb b{color:#1D2939;font-weight:600}' + S + ' .cca-sep{width:16px;height:16px;transform:rotate(-90deg);color:#98A2B3}',
    S + ' .cca-tabs{flex:1 1 100%;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}',
    S + ' .cca-tab{display:inline-flex;align-items:center;gap:8px;flex:none;min-height:44px;padding:0 14px;border:1px solid #E4E7EC;border-radius:10px;background:#fff;color:#344054;font:inherit;font-size:15px;font-weight:500;cursor:pointer;white-space:nowrap}',
    S + ' .cca-tab svg{width:18px;height:18px}',
    S + ' .cca-tab[aria-selected="true"]{background:#E8F0F8;border-color:#8FAED3;color:#1A4570;font-weight:600}',
    S + '.cca-sec-on > .ccs-set > details.is-cur > summary{display:flex!important;align-items:center!important;gap:10px!important;font-size:20px!important;font-weight:600!important;color:#1D2939!important;padding:14px 16px!important;list-style:none!important}',
    S + '.cca-sec-on > .ccs-set > details.is-cur > summary > span.cca-hst{margin-left:auto!important}',
    S + ' .cca-i{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex:none;border:1px solid #D0D5DD;border-radius:50%;background:#fff;color:#475467;cursor:pointer;padding:0}',
    S + ' .cca-i.is-on{background:#E8F0F8;border-color:#8FAED3;color:#1A4570}' + S + ' .cca-i .cca-ic{width:18px;height:18px}',
    S + ' .cca-hidetext:not(.cca-show){display:none!important}',
    S + ' .cca-hidetext.cca-show{color:#475467!important}',
    // shown on "i" even where other add-ons hide help text (they use id-weighted selectors)
    'html:not(#cca0):not(#cca1):not(#cca2):not(#cca3) body:not(#cca4) #cc-staff #ccs-main .cca-hidetext.cca-show{display:block!important;visibility:visible!important}',
    S + ' .cca-ic{fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}',
    // phones: one column, bigger rows
    '@media (max-width:759px){' + S + ' .cca-grid{grid-template-columns:1fr}' + S + ' .cca-row{min-height:56px}' + S + ' .cca-st{max-width:140px}' + S + ' .cca-crumb span{display:none}}',
    // Kazumi format: overview card header, key facts (label left, value right)
    S + ' .cca-ch{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid #EAECF0;background:none;font:inherit;text-align:left;cursor:pointer;color:#1D2939}',
    S + ' .cca-ch h2{flex:1 1 auto;font-size:18px}' + S + ' .cca-ch:hover{background:#F9FAFB}' + S + ' .cca-ch:focus-visible{outline:2px solid #245F99;outline-offset:-2px}',
    S + ' .cca-card > header{display:none}',
    S + ' .cca-facts{margin:0;padding:6px 16px;border-bottom:1px solid #EAECF0}',
    S + ' .cca-fact{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:40px;border-top:1px dashed #EAECF0}' + S + ' .cca-fact:first-child{border-top:0}',
    S + ' .cca-fact dt{color:#475467;font-size:15px}' + S + ' .cca-fact dd{margin:0;color:#1D2939;font-size:15px;font-weight:500;text-align:right;min-width:0}',
    S + ' .cca-rows{padding:4px 6px 6px}' + S + ' .cca-row{min-height:48px}',
    S + ' .cca-menu{display:none}',
    // computers: the settings menu beside the page, as in Kazumi
    '@media (min-width:1100px){' +
      S + ' > *:not(.ccs-head):not(.cca-menu){margin-left:268px!important;min-width:0}' +
      S + ' > .ccs-head{padding-bottom:12px!important;margin-bottom:18px!important;border-bottom:1px solid #E4E7EC}' +
      S + ' > .cca-menu{display:flex;flex-direction:column;gap:2px;float:left;width:240px;position:sticky;top:0}' +
      S + ' .cca-msearch{height:44px;margin:0 0 10px;max-width:none}' + S + ' .cca-msearch input{font-size:15px}' +
      S + ' .cca-mh{margin:14px 12px 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#667085}' +
      S + ' .cca-mi{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:0 12px;border:1px solid transparent;border-radius:10px;background:none;color:#1D2939;font:inherit;font-size:16px;text-align:left;cursor:pointer}' +
      S + ' .cca-mi .cca-ic,' + S + ' .cca-mi svg{width:18px;height:18px;flex:none;color:#475467}' +
      S + ' .cca-mi:hover{background:#F2F4F7}' + S + ' .cca-mi:focus-visible{outline:2px solid #245F99;outline-offset:1px}' +
      S + ' .cca-mi[aria-current="page"]{background:#E8F0F8;border-color:#8FAED3;color:#1A4570;font-weight:600}' + S + ' .cca-mi[aria-current="page"] svg{color:#1A4570}' +
      S + ' .cca-mov{margin:0 0 4px}' +
      S + ' > .cca-home > .cca-top{display:none}' +
      S + '.cca-sec-on > .cca-bar{display:none!important}' +
      S + ' .cca-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))}' +
    '}',
    '@media (prefers-reduced-motion:no-preference){' + S + ' .cca-home,' + S + ' .cca-bar{animation:cca-in .16s ease-out}}@keyframes cca-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
    ':root:not(#cct0) #cc-staff .cct12-src{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}',
    ':root:not(#cct0) #cc-staff .cct12{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    ':root:not(#cct0) #cc-staff .cct12-t{width:6.5em;min-height:48px;padding:0 12px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;font:inherit;font-size:17px;color:#1D2939}',
    ':root:not(#cct0) #cc-staff .cct12-t:focus{outline:none;border-color:#245F99;box-shadow:0 0 0 3px rgba(36,95,153,.15)}',
    ':root:not(#cct0) #cc-staff .cct12.is-bad .cct12-t{border-color:#D92D20}',
    ':root:not(#cct0) #cc-staff .cct12-ap{display:inline-flex;border:1px solid #D0D5DD;border-radius:10px;overflow:hidden}',
    ':root:not(#cct0) #cc-staff .cct12-ap button{min-width:54px;min-height:46px;border:0;background:#fff;color:#344054;font:inherit;font-size:16px;cursor:pointer}',
    ':root:not(#cct0) #cc-staff .cct12-ap button[aria-pressed=true]{background:#E8F0F8;color:#1A4570;font-weight:600;box-shadow:inset 0 0 0 1px #8FAED3}',
    ':root:not(#cct0) #cc-staff .cct12-err{flex-basis:100%;font-size:14px;font-style:italic;color:#B42318}'
  ].join('\n');
  function styles() { if (doc.getElementById('cca-style')) return; var s = doc.createElement('style'); s.id = 'cca-style'; s.textContent = css; doc.head.appendChild(s); }
  // ---------- 12-hour time fields (Settings audit, Release B, 28 Oct 2026) ----------
  // The device time box (which can show 24-hour time) in Settings > Notice and collection hours, and the long list of
  // every slot in Change order, become one field: type the time (8, 8:30 or 830), tap AM or PM. The app's own field
  // stays in the page, hidden, and is what is saved, so nothing about saving changes.
  var T12 = '#st-open, #st-close, #am-time';
  function to12(v) { var m = /^(\d{1,2}):(\d{2})/.exec(v || ''); if (!m) return { t: '', pm: false }; var h = +m[1]; return { t: ((h % 12) || 12) + ':' + m[2], pm: h >= 12 }; }
  function parse12(txt, pm) {
    var s = String(txt || '').replace(/\s+/g, '').replace(/[.]/g, ':'), m = /^(\d{1,2})(?::?(\d{2}))?$/.exec(s); if (!m) return null;
    var h = +m[1], mi = m[2] == null ? 0 : +m[2]; if (h < 1 || h > 12 || mi > 59) return null;
    h = h % 12 + (pm ? 12 : 0); return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }
  function fire(el) { ['input', 'change'].forEach(function (k) { el.dispatchEvent(new Event(k, { bubbles: true })); }); }
  function time12() {
    [].forEach.call(doc.querySelectorAll('#cc-staff ' + T12.split(', ').join(', #cc-staff ')), function (src) {
      if (src.__t12 && src.__t12.isConnected) return;
      var isSel = src.tagName === 'SELECT', cur = to12(src.value);
      var w = doc.createElement('span'); w.className = 'cct12'; w.setAttribute('role', 'group');
      var lab = src.id && doc.querySelector('label[for="' + src.id + '"]'); w.setAttribute('aria-label', lab ? txt(lab) : 'Time');
      w.innerHTML = '<input type="text" inputmode="numeric" autocomplete="off" class="cct12-t" maxlength="5" placeholder="8:00" aria-label="' + esc(lab ? txt(lab) : 'Time') + '">' +
        '<span class="cct12-ap"><button type="button" data-ap="am">AM</button><button type="button" data-ap="pm">PM</button></span>' +
        '<em class="cct12-err" hidden></em>';
      var inp = w.querySelector('.cct12-t'), pm = cur.pm; inp.value = cur.t;
      function paint() { [].forEach.call(w.querySelectorAll('[data-ap]'), function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-ap') === 'pm') === pm)); }); }
      function commit() {
        var v = parse12(inp.value, pm), err = w.querySelector('.cct12-err'), msg = '';
        if (!v) msg = inp.value.trim() ? 'Type a time like 8:30' : '';
        else if (isSel && ![].some.call(src.options, function (o) { return o.value === v; })) {
          var opts = [].map.call(src.options, function (o) { return o.value; }).filter(Boolean);
          msg = opts.length ? 'Collection times run ' + t12txt(opts[0]) + ' to ' + t12txt(opts[opts.length - 1]) + ', on the hour or slot' : 'Not a collection time';
        }
        err.textContent = msg; err.hidden = !msg; w.classList.toggle('is-bad', !!msg);
        if (v && !msg && src.value !== v) { src.value = v; fire(src); }
      }
      function t12txt(v) { var x = to12(v); return x.t + ' ' + (x.pm ? 'PM' : 'AM'); }
      paint();
      inp.addEventListener('input', commit); inp.addEventListener('blur', function () { var v = parse12(inp.value, pm); if (v) inp.value = to12(v).t; });
      w.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ap]'); if (!b) return; e.preventDefault(); pm = b.getAttribute('data-ap') === 'pm'; paint(); commit(); });
      src.classList.add('cct12-src'); src.setAttribute('tabindex', '-1'); src.setAttribute('aria-hidden', 'true');
      src.after(w); src.__t12 = w;
    });
  }
  function start() { styles(); var t12q = false, mo12 = new MutationObserver(function () { if (t12q) return; t12q = true; setTimeout(function () { t12q = false; try { time12(); } catch (e) {} }, 30); }); mo12.observe(doc.body, { childList: true, subtree: true }); var mo = new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) { var r = m[i], n = r.target; if (n && n.closest && n.closest('.cca-home, .cca-bar, .cca-i, .cca-menu')) continue; if (r.type === 'attributes' && (n.id === 'ccs-main' && r.attributeName === 'class' || n.classList && (n.classList.contains('cca-hst') || n.classList.contains('cca-hidetext')))) continue; schedule(); return; } }); mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'data-screen'] }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
