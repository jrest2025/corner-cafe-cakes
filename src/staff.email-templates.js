/* Corner Café Email templates (22 October 2026). Settings, Communications, Email templates.
 * Roneel's brief: staff with the Settings switch change the wording of customer emails without code; preview on desktop
 * and phone; save drafts, send themselves a test, publish; version history and standard wording; who changed what, when.
 * The order summary, prices, buttons, Jack's Restaurants offers and footer stay built by the email code, so a customer
 * always sees their own order. With nothing published an email is exactly as before.
 *
 * Database: supabase/sql/email_templates_20261022.sql (email_tpl_* functions, each checks mgmt.settings).
 * Preview and test: Edge Function email-templates (the same code that builds the real emails, with made-up order details).
 * The app lends its client as window.__ccsBc (rpc, invoke). If anything here fails, the rest of the app carries on.
 * Unsaved edits are kept on this device per email, so staff can leave and come back where they stopped.
 */
(function (global) {
  'use strict';
  if (global.CCEmailTemplates) return;
  var VERSION = '2026-10-22-email-templates-v1';
  var doc = global.document;
  var KEEP = 'cc-et-unsaved-';
  var TEXT = ['subject', 'preheader', 'label', 'heading', 'tagline'];
  var RICH = ['intro', 'closing'];
  var BOXES = [
    ['subject', 'Subject line', 'What customers see in their inbox.', false],
    ['preheader', 'Inbox preview line', 'The grey line after the subject in most inboxes.', false],
    ['label', 'Status label', 'The small label above the heading.', false],
    ['heading', 'Heading', '', false],
    ['tagline', 'Banner line', 'The short line under the heading in the cream banner.', false],
    ['intro', 'Main message', 'Comes before the order details.', true],
    ['closing', 'Closing message', 'Comes after the order details and buttons.', true]
  ];
  var S = { meta: null, home: null, err: null, kind: null, view: 'list', pane: 'edit', device: 'desktop', prev: null, prevKey: '',
    prevBusy: false, busy: '', note: null, histOpen: false, allowed: null, openSet: false, timer: 0, dirty: false };
  var ov = null;

  // ---------- helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bc() { return global.__ccsBc || null; }
  function rpc(fn, args) { var b = bc(); if (!b || !b.rpc) return Promise.reject(new Error('no client')); return b.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  // The app's own signed-in call when it lends one; otherwise the same call with the app's saved sign-in
  var FN = 'https://ilbrfwxblhidtlsjgxlh.supabase.co/functions/v1/email-templates', PUB = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  function callFn(body) {
    var b = bc(); if (b && b.invoke) return b.invoke('email-templates', body);
    var tok = null; try { var ss = JSON.parse(global.localStorage.getItem('cc-cakes-staff') || 'null'); tok = ss && (ss.access_token || (ss.currentSession && ss.currentSession.access_token)); } catch (e) { tok = null; }
    if (!tok) return Promise.resolve({ error: { message: 'signed out', context: { status: 401 } } });
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUB, Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return r.ok ? { data: d } : (r.status === 401 || r.status === 403 ? { error: { message: String(r.status), context: { status: r.status } } } : { data: d }); }); });
  }
  function invoke(body) {
    return callFn(body).then(function (r) {
      if (r.error) { var st = r.error.context && r.error.context.status; if (st === 401) throw new Error('Sign in again, then try once more.'); if (st === 403) throw new Error('Only someone with the Settings switch can do this.'); throw r.error; }
      return r.data || {};
    });
  }
  function toast(t, bad) { var b = bc(); if (b && b.toast) try { b.toast(t, bad); } catch (e) { /* the message also shows in the screen */ } }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Fiji', day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
    var p = {}; f.forEach(function (x) { p[x.type] = x.value; });
    return p.day + ' ' + MON[Number(p.month) - 1] + ' ' + p.year + ', ' + p.hour + ':' + p.minute + ' ' + String(p.dayPeriod || '').toUpperCase();
  }
  function kindInfo(k) { return (S.meta && S.meta.kinds || []).filter(function (x) { return x.kind === k; })[0] || null; }
  function fieldLabel(k) { var f = (S.meta && S.meta.fields || []).filter(function (x) { return x.key === k; })[0]; return f ? f.label : null; }
  function state(k) { return S.home && S.home.kinds && S.home.kinds[k] || {}; }

  // ---------- boxes: what staff type, with fields shown as chips (never {{codes}}) ----------
  function chip(key) { var l = fieldLabel(key); return '<span class="et-f' + (l ? '' : ' et-f-bad') + '" contenteditable="false" data-f="' + esc(key) + '">' + esc(l || ('Unknown field: ' + key)) + '</span>'; }
  function toBox(stored, rich) {
    var s = String(stored || '');
    if (!rich) s = esc(s);
    return s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, function (_m, k) { return chip(k); });
  }
  function fromBox(el, rich) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.et-f'), function (f) { f.parentNode.replaceChild(doc.createTextNode('{{' + f.getAttribute('data-f') + '}}'), f); });
    if (!rich) return (c.textContent || '').replace(/\u200B/g, '').replace(/\s+/g, ' ').trim();
    var h = c.innerHTML.replace(/\u200B/g, '').replace(/&nbsp;/g, ' ').trim();
    return /^(\s|<br\s*\/?>|<p>(\s|<br\s*\/?>)*<\/p>|<div>(\s|<br\s*\/?>)*<\/div>)*$/i.test(h) ? '' : h;
  }
  function boxEl(k) { return ov && ov.querySelector('[data-box="' + k + '"]'); }
  function current() {
    var f = {};
    BOXES.forEach(function (b) { var el = boxEl(b[0]); if (el) f[b[0]] = fromBox(el, b[3]); });
    return f;
  }
  // A box left as the standard wording is stored empty, so the standard wording keeps adjusting itself
  // (deliveries, custom cakes, WhatsApp customers, payments). Only changed boxes replace it.
  function squash(t) { return String(t || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&#39;|’/g, ' ').replace(/[\s']+/g, ' ').trim(); }
  function changes(f) {
    var d = (S.meta && S.meta.defaults && S.meta.defaults[S.kind]) || {}, out = {};
    BOXES.forEach(function (b) { var v = f[b[0]] || ''; out[b[0]] = squash(v) === squash(d[b[0]] || '') ? '' : v; });
    return out;
  }
  function stored(k) {
    try { var raw = global.localStorage.getItem(KEEP + k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function keep(k, f) { try { if (f) global.localStorage.setItem(KEEP + k, JSON.stringify({ f: f, at: Date.now() })); else global.localStorage.removeItem(KEEP + k); } catch (e) { /* this device does not keep it */ } }
  // What the editor starts from: unsaved edits on this device, else the draft, else the published wording, else the standard wording
  function startFields(k) {
    var st = state(k), u = stored(k);
    if (u && u.f) return { f: u.f, from: 'unsaved' };
    var v = st.draft || st.published;
    var d = (S.meta && S.meta.defaults && S.meta.defaults[k]) || {};
    var f = {};
    BOXES.forEach(function (b) { f[b[0]] = (v && v[b[0]]) || d[b[0]] || ''; });
    return { f: f, from: st.draft ? 'draft' : st.published ? 'published' : 'standard' };
  }
  function same(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
  function savedFields(k) {
    var st = state(k), v = st.draft || st.published, d = (S.meta && S.meta.defaults && S.meta.defaults[k]) || {}, f = {};
    BOXES.forEach(function (b) { f[b[0]] = (v && v[b[0]]) || d[b[0]] || ''; });
    return f;
  }

  // ---------- loading ----------
  function load(force) {
    if (S.home && !force) return Promise.resolve();
    var a = S.meta ? Promise.resolve(S.meta) : invoke({ op: 'meta' }).then(function (m) { if (!m.ok) throw new Error(m.message || 'Could not load.'); S.meta = m; return m; });
    return Promise.all([a, rpc('email_tpl_home')]).then(function (r) {
      if (!r[1] || !r[1].ok) throw new Error(r[1] && r[1].message || 'Could not load the email templates.');
      S.home = r[1]; S.err = null;
    }).catch(function (e) { S.err = (e && e.message) || 'Could not load the email templates. Check the internet connection.'; });
  }

  // ---------- the Settings entry ----------
  function settingsEntry() {
    return '<details id="et-comm" class="et-comm"' + (S.openSet ? ' open' : '') + '><summary>Communications <span>Customer emails</span></summary><div class="ccs-set-body">' +
      '<div class="et-entry"><div><div class="et-entry-t">Email templates</div><p class="ccs-hint">Change the wording of the emails customers get about their cake orders. Preview, send yourself a test, then publish.</p></div>' +
      '<button type="button" class="ccs-btn" data-et="open">Open email templates</button></div></div></details>';
  }
  function placeEntry() {
    var b = bc(); if (!b || !b.tab || b.tab() !== 'settings') return;
    var set = doc.querySelector('#cc-staff .ccs-set');
    if (!set || set.querySelector('#et-comm')) return;
    if (S.allowed === false) return;
    if (S.allowed === null) {
      S.allowed = 'checking';
      rpc('email_tpl_home').then(function (r) { S.allowed = !!(r && r.ok); if (r && r.ok) S.home = r; placeEntry(); }).catch(function () { S.allowed = false; });
      return;
    }
    if (S.allowed !== true) return;
    var wrap = doc.createElement('div'); wrap.innerHTML = settingsEntry();
    var node = wrap.firstChild;
    var team = Array.prototype.filter.call(set.children, function (c) { var s = c.querySelector && c.querySelector(':scope > summary'); return s && /^Team and access/.test(s.textContent || ''); })[0];
    if (team) set.insertBefore(node, team); else set.appendChild(node);
    node.addEventListener('toggle', function () { S.openSet = node.open; });
  }

  // ---------- the window ----------
  function open(k) {
    if (!ov) {
      ov = doc.createElement('div'); ov.id = 'et-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Email templates');
      var app = doc.getElementById('cc-staff'); if (app) try { ov.style.fontFamily = global.getComputedStyle(app).fontFamily; } catch (e) { /* default font */ }
      doc.body.appendChild(ov);
      ov.addEventListener('click', onClick);
      ov.addEventListener('input', onInput);
      ov.addEventListener('keydown', onKey);
      ov.addEventListener('paste', onPaste);
    }
    ov.hidden = false; doc.documentElement.classList.add('et-lock');
    S.view = k ? 'edit' : 'list'; S.kind = k || null; S.note = null; S.histOpen = false;
    draw();
    load(true).then(function () { if (k) startEdit(k); else draw(); });
  }
  function close() {
    if (S.view === 'edit' && unsaved() && !global.confirm('Close Email templates?\n\nYour changes stay on this device, so you can carry on later. They are not saved for others until you press Save draft.')) return;
    if (ov) ov.hidden = true;
    doc.documentElement.classList.remove('et-lock');
  }
  function unsaved() { return S.view === 'edit' && S.kind && !same(current(), savedFields(S.kind)); }

  function statusPill(k) {
    var st = state(k), info = kindInfo(k);
    var p = [];
    if (st.published) p.push('<span class="et-pill et-on">Custom wording, version ' + st.published.version + '</span>');
    else p.push('<span class="et-pill">Standard wording</span>');
    if (st.draft) p.push('<span class="et-pill et-wait">Draft waiting</span>');
    if (stored(k)) p.push('<span class="et-pill et-wait">Unsaved changes on this device</span>');
    if (info && !info.required) p.push(st.enabled === false ? '<span class="et-pill et-off">Switched off</span>' : '<span class="et-pill">On</span>');
    return p.join('');
  }

  function drawList() {
    var h = '<div class="et-top"><div><h2 class="et-title">Email templates</h2><p class="et-sub">Emails customers get about their cake orders.</p></div><button type="button" class="et-x" data-et="close" aria-label="Close Email templates">' + X + '</button></div>';
    if (S.err) return h + '<div class="et-body"><p class="et-err">' + esc(S.err) + '</p><button type="button" class="et-btn" data-et="reload">Try again</button></div>';
    if (!S.meta || !S.home) return h + '<div class="et-body"><p class="et-quiet">Loading…</p></div>';
    h += '<div class="et-body"><div class="et-list">';
    S.meta.kinds.forEach(function (k) {
      var st = state(k.kind);
      h += '<button type="button" class="et-row" data-et="edit" data-k="' + k.kind + '"><span class="et-row-main"><span class="et-row-t">' + esc(k.name) + '</span>' +
        '<span class="et-row-w">' + esc(k.when) + (st.sent_30d ? ' · ' + st.sent_30d + ' sent in the last 30 days' : '') + '</span>' +
        '<span class="et-pills">' + statusPill(k.kind) + (k.required ? '<span class="et-pill et-quietpill">Always sent</span>' : '') + '</span></span><span class="et-chev" aria-hidden="true">' + CHEV + '</span></button>';
    });
    h += '</div><p class="et-hint">Order details, prices, buttons, the Jack\'s Restaurants offers and the unsubscribe link are added to every email automatically. Emails have no cake photos, so nothing can be mistaken for the customer\'s own cake.</p></div>';
    return h;
  }

  function drawEdit() {
    var k = S.kind, info = kindInfo(k), st = state(k);
    if (!info) return drawList();
    var h = '<div class="et-top"><button type="button" class="et-back" data-et="list">' + BACK + '<span>All emails</span></button>' +
      '<div class="et-top-mid"><h2 class="et-title">' + esc(info.name) + '</h2><p class="et-sub">' + esc(info.when) + '</p></div>' +
      '<button type="button" class="et-x" data-et="close" aria-label="Close Email templates">' + X + '</button></div>';
    h += '<div class="et-tabs" role="tablist"><button type="button" role="tab" class="et-tab" data-et="pane" data-v="edit" aria-selected="' + (S.pane === 'edit') + '">Edit</button>' +
      '<button type="button" role="tab" class="et-tab" data-et="pane" data-v="preview" aria-selected="' + (S.pane === 'preview') + '">Preview</button></div>';
    h += '<div class="et-split et-show-' + S.pane + '"><div class="et-form">';
    h += '<div class="et-state">' + statusPill(k) + '</div>';
    if (st.published) h += '<p class="et-meta">Published ' + esc(when(st.published.published_at)) + ' by ' + esc(st.published.published_by_name || 'Staff') + '.</p>';
    if (st.draft) h += '<p class="et-meta">Draft saved ' + esc(when(st.draft.updated_at)) + ' by ' + esc(st.draft.updated_by_name || 'Staff') + '.</p>';
    if (!info.required) h += '<div class="et-switch"><div><div class="et-lab">Send this email</div><p class="et-help">' + (st.enabled === false ? 'Off: customers do not get this email.' : 'On: customers get this email.') + '</p></div>' +
      '<button type="button" class="et-tog" role="switch" aria-checked="' + (st.enabled !== false) + '" data-et="switch"><span></span><b>' + (st.enabled === false ? 'Off' : 'On') + '</b></button></div>';
    h += '<p class="et-hint">Change only what you need. Boxes you leave as they are keep the standard wording, which adjusts itself for deliveries, custom cakes and payments. Use Insert field to add the customer\'s name, the order number, the date and more.</p>';
    BOXES.forEach(function (b) {
      if (b[0] === 'tagline' && !info.banner) return;
      h += '<div class="et-fieldset"><div class="et-lab-row"><label class="et-lab" id="et-l-' + b[0] + '">' + b[1] + '</label>' +
        (b[3] ? '<span class="et-tools" role="toolbar" aria-label="' + b[1] + ' formatting"><button type="button" class="et-tool" data-et="bold" data-b="' + b[0] + '" aria-label="Bold"><b>B</b></button>' +
          '<button type="button" class="et-tool" data-et="list-b" data-b="' + b[0] + '" aria-label="Bullet list">' + LIST + '</button>' +
          '<button type="button" class="et-tool" data-et="link" data-b="' + b[0] + '" aria-label="Link">' + LINK + '</button></span>' : '') +
        '<button type="button" class="et-ins" data-et="ins" data-b="' + b[0] + '">+ Insert field</button></div>' +
        (b[2] ? '<p class="et-help">' + b[2] + '</p>' : '') +
        '<div class="et-box' + (b[3] ? ' et-rich' : '') + '" contenteditable="true" role="textbox"' + (b[3] ? ' aria-multiline="true"' : '') + ' aria-labelledby="et-l-' + b[0] + '" data-box="' + b[0] + '" spellcheck="true"></div></div>';
    });
    h += '<div class="et-auto"><div class="et-lab">Added automatically</div><p class="et-help">The order details, price and payments, Add to calendar and directions buttons, the Jack\'s Restaurants offers (only for customers who agreed), the café\'s contact details and the unsubscribe link.</p></div>';
    h += '<div class="et-more"><button type="button" class="et-link" data-et="hist" aria-expanded="' + S.histOpen + '">Version history (' + ((st.history || []).length) + ')</button>' +
      (st.published ? '<button type="button" class="et-link" data-et="standard">Go back to the standard wording</button>' : '') +
      (st.draft ? '<button type="button" class="et-link et-red" data-et="discard">Discard the draft</button>' : '') +
      '<button type="button" class="et-link" data-et="fill-standard">Start again from the standard wording</button></div>';
    if (S.histOpen) h += histView(st);
    h += '</div><div class="et-preview">' + previewView() + '</div></div>';
    h += '<div class="et-bar"><div class="et-note" role="status" aria-live="polite">' + (S.note ? '<span class="' + (S.note.bad ? 'et-err' : 'et-ok') + '">' + esc(S.note.t) + '</span>' : '') + '</div>' +
      '<div class="et-actions"><button type="button" class="et-btn et-ghost" data-et="test"' + (S.busy ? ' disabled' : '') + '>' + (S.busy === 'test' ? 'Sending…' : 'Send me a test') + '</button>' +
      '<button type="button" class="et-btn et-ghost" data-et="save"' + (S.busy ? ' disabled' : '') + '>' + (S.busy === 'save' ? 'Saving…' : 'Save draft') + '</button>' +
      '<button type="button" class="et-btn" data-et="publish"' + (S.busy ? ' disabled' : '') + '>' + (S.busy === 'publish' ? 'Publishing…' : 'Publish') + '</button></div></div>';
    return h;
  }
  function histView(st) {
    var rows = st.history || [];
    if (!rows.length) return '<div class="et-hist"><p class="et-quiet">No versions yet. The standard wording is in use.</p></div>';
    return '<div class="et-hist">' + rows.map(function (v) {
      var who = v.status === 'published' ? 'In use since ' + when(v.published_at) + ', published by ' + (v.published_by_name || 'Staff')
        : 'Used ' + when(v.published_at) + ' to ' + when(v.archived_at) + (v.published_by_name ? ', published by ' + v.published_by_name : '');
      return '<div class="et-hrow"><div><div class="et-hrow-t">Version ' + v.version + (v.status === 'published' ? ' <span class="et-pill et-on">In use</span>' : ' <span class="et-pill">Archived</span>') + '</div>' +
        '<div class="et-help">' + esc(who) + (v.note ? ' · ' + esc(v.note) : '') + '</div></div>' +
        '<button type="button" class="et-btn et-ghost et-small" data-et="copy" data-v="' + v.id + '">Use this wording</button></div>';
    }).join('') + '</div>';
  }
  function previewView() {
    var p = S.prev;
    var h = '<div class="et-prev-head"><div class="et-seg" role="group" aria-label="Preview size"><button type="button" class="et-segb" data-et="device" data-v="desktop" aria-pressed="' + (S.device === 'desktop') + '">Computer</button>' +
      '<button type="button" class="et-segb" data-et="device" data-v="mobile" aria-pressed="' + (S.device === 'mobile') + '">Phone</button></div>' +
      '<span class="et-quiet">' + (S.prevBusy ? 'Updating…' : 'Made-up order details') + '</span></div>';
    if (p && p.err) return h + '<p class="et-err">' + esc(p.err) + '</p>';
    if (!p) return h + '<p class="et-quiet">Loading the preview…</p>';
    if ((p.unknown || []).length) h += '<p class="et-err">These fields are not known and will be left out: ' + esc(p.unknown.join(', ')) + '. Remove them before publishing.</p>';
    if ((p.problems || []).length) h += '<p class="et-err">Some boxes are too long. Shorten them before publishing.</p>';
    h += '<div class="et-inbox"><div class="et-inbox-s">' + esc(p.subject) + '</div><div class="et-inbox-p">' + esc(previewLine(p)) + '</div></div>';
    h += '<div class="et-frame-wrap et-' + S.device + '"><iframe class="et-frame" title="Email preview" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe></div>';
    return h;
  }
  function previewLine(p) { var m = String(p.html || '').match(/<div style="display:none;max-height:0;overflow:hidden;opacity:0">([\s\S]*?)<\/div>/); var t = doc.createElement('textarea'); t.innerHTML = m ? m[1] : ''; return t.value; }

  function draw() {
    if (!ov) return;
    var keepScroll = ov.querySelector('.et-form') ? ov.querySelector('.et-form').scrollTop : 0;
    var vals = S.view === 'edit' && ov.querySelector('[data-box]') && !S.fresh ? current() : null; S.fresh = false;
    ov.innerHTML = '<div class="et-win">' + (S.view === 'edit' ? drawEdit() : drawList()) + '</div>';
    if (S.view === 'edit') {
      var start = vals || startFields(S.kind).f;
      BOXES.forEach(function (b) { var el = boxEl(b[0]); if (el) el.innerHTML = toBox(start[b[0]], b[3]); });
      var f = ov.querySelector('.et-form'); if (f) f.scrollTop = keepScroll;
      paintFrame();
    }
  }
  function paintFrame() {
    var fr = ov && ov.querySelector('.et-frame');
    if (fr && S.prev && S.prev.html) {
      fr.onload = function () { try { var dd = fr.contentDocument; if (dd && dd.body) fr.style.height = Math.max(400, dd.documentElement.scrollHeight + 4) + 'px'; } catch (e) { /* keeps its default height */ } };
      fr.srcdoc = S.prev.html;
    }
  }
  function drawNote(t, bad) { S.note = t ? { t: t, bad: !!bad } : null; var n = ov && ov.querySelector('.et-note'); if (n) n.innerHTML = t ? '<span class="' + (bad ? 'et-err' : 'et-ok') + '">' + esc(t) + '</span>' : ''; }
  function drawPreview() { var p = ov && ov.querySelector('.et-preview'); if (p) { p.innerHTML = previewView(); paintFrame(); } }

  // ---------- editing ----------
  function startEdit(k) {
    S.kind = k; S.view = 'edit'; S.prev = null; S.prevKey = ''; S.note = null; S.histOpen = false;
    var s = startFields(k);
    draw();
    if (s.from === 'unsaved') drawNote('Carrying on with your unsaved changes from this device.');
    refreshPreview();
  }
  function refreshPreview() {
    if (S.view !== 'edit' || !S.kind) return;
    var f = current(), key = S.kind + JSON.stringify(f);
    if (key === S.prevKey) return;
    S.prevKey = key; S.prevBusy = true;
    var mine = key;
    var hp = ov.querySelector('.et-prev-head .et-quiet'); if (hp) hp.textContent = 'Updating…';
    invoke({ op: 'preview', kind: S.kind, fields: changes(f) }).then(function (r) {
      if (S.prevKey !== mine) return;
      S.prevBusy = false;
      S.prev = r.ok ? r : { err: r.message || 'The preview could not be made.' };
      drawPreview();
    }).catch(function (e) { if (S.prevKey !== mine) return; S.prevBusy = false; S.prev = { err: (e && e.message) || 'The preview could not be made. Check the internet connection.' }; drawPreview(); });
  }
  function onInput(e) {
    if (!e.target.closest || !e.target.closest('[data-box]')) return;
    var f = current();
    keep(S.kind, same(f, savedFields(S.kind)) ? null : f);
    var st = ov.querySelector('.et-state'); if (st) st.innerHTML = statusPill(S.kind);
    clearTimeout(S.timer); S.timer = setTimeout(refreshPreview, 700);
  }
  function onKey(e) {
    var box = e.target.closest && e.target.closest('[data-box]');
    if (e.key === 'Escape') { if (doc.querySelector('.et-pop')) { closePop(); return; } close(); return; }
    if (box && e.key === 'Enter' && !box.classList.contains('et-rich')) e.preventDefault();
  }
  function onPaste(e) {
    var box = e.target.closest && e.target.closest('[data-box]'); if (!box) return;
    e.preventDefault();
    var t = (e.clipboardData || global.clipboardData).getData('text/plain') || '';
    if (!box.classList.contains('et-rich')) t = t.replace(/\s+/g, ' ');
    doc.execCommand('insertText', false, t);
  }
  var lastRange = null, lastBox = null;
  doc.addEventListener('selectionchange', function () {
    var s = doc.getSelection && doc.getSelection(); if (!s || !s.rangeCount || !ov || ov.hidden) return;
    var n = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode);
    var box = n && n.closest && n.closest('#et-ov [data-box]');
    if (box) { lastRange = s.getRangeAt(0).cloneRange(); lastBox = box; }
  });
  function focusBox(k) {
    var el = boxEl(k); if (!el) return null;
    el.focus();
    var s = doc.getSelection();
    if (lastBox === el && lastRange) { s.removeAllRanges(); s.addRange(lastRange); }
    else { var r = doc.createRange(); r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
    return el;
  }
  function insertField(k, key) {
    var el = focusBox(k); if (!el) return;
    doc.execCommand('insertHTML', false, chip(key) + '\u200B');
    onInput({ target: el });
  }
  function closePop() { var p = doc.querySelector('.et-pop'); if (p) p.parentNode.removeChild(p); }
  function fieldPicker(k, btn) {
    closePop();
    var p = doc.createElement('div'); p.className = 'et-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Insert field');
    p.innerHTML = '<div class="et-pop-head"><b>Insert field</b><button type="button" class="et-x et-x-s" data-et="pop-close" aria-label="Close">' + X + '</button></div>' +
      '<div class="et-pop-list">' + S.meta.fields.map(function (f) { return '<button type="button" class="et-pop-row" data-et="pick" data-b="' + k + '" data-f="' + f.key + '"><span>' + esc(f.label) + '</span><small>for example ' + esc(f.example) + '</small></button>'; }).join('') + '</div>';
    ov.appendChild(p);
    if (global.innerWidth >= 760 && btn) { var r = btn.getBoundingClientRect(); p.style.top = Math.min(r.bottom + 6, global.innerHeight - 420) + 'px'; p.style.left = Math.max(12, Math.min(r.right - 360, global.innerWidth - 372)) + 'px'; }
  }
  function linkPrompt(k) {
    var el = focusBox(k); if (!el) return;
    var u = global.prompt('Link address (starting with https://)', 'https://');
    if (!u) return;
    u = u.trim();
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(u)) { drawNote('Links must start with https://, mailto: or tel:', true); return; }
    var s = doc.getSelection();
    if (s && !s.isCollapsed) doc.execCommand('createLink', false, u);
    else doc.execCommand('insertHTML', false, '<a href="' + esc(u) + '">' + esc(u.replace(/^https?:\/\//, '')) + '</a>&nbsp;');
    onInput({ target: el });
  }

  // ---------- actions ----------
  function check(f) {
    var p = S.prev;
    if (p && p.unknown && p.unknown.length) return 'Remove the unknown fields first: ' + p.unknown.join(', ') + '.';
    if (p && p.problems && p.problems.length) return 'Some boxes are too long. Shorten them first.';
    var c = changes(f), any = BOXES.some(function (b) { return c[b[0]]; });
    if (!any) return state(S.kind).published ? 'Nothing differs from the standard wording. To use it, choose Go back to the standard wording.' : 'Nothing has changed from the standard wording yet.';
    return null;
  }
  function save() {
    var f = current(), k = S.kind;
    S.busy = 'save'; drawBar();
    return rpc('email_tpl_save', { p_kind: k, p_fields: changes(f) }).then(function (r) {
      S.busy = ''; if (!r || !r.ok) throw new Error(r && r.message || 'The draft was not saved.');
      keep(k, null); return load(true).then(function () { S.fresh = true; draw(); drawNote('Draft saved. Customers still get the published wording until you publish.'); refreshPreview(); return r.draft; });
    }).catch(function (e) { S.busy = ''; drawBar(); drawNote((e && e.message) || 'The draft was not saved. Check the internet connection.', true); throw e; });
  }
  function publish() {
    var f = current(), bad = check(f), info = kindInfo(S.kind);
    if (bad) { drawNote(bad, true); return; }
    if (!global.confirm('Publish the new wording for "' + info.name + '"?\n\nCustomers get it from the next ' + info.name.toLowerCase() + ' email. The current wording stays in the version history.')) return;
    var k = S.kind;
    save().then(function (draft) {
      S.busy = 'publish'; drawBar();
      return rpc('email_tpl_publish', { p_kind: k, p_draft: draft.id });
    }).then(function (r) {
      S.busy = ''; if (!r || !r.ok) throw new Error(r && r.message || 'It was not published.');
      return load(true).then(function () { draw(); drawNote('Published. Version ' + r.published.version + ' goes to customers from the next email.'); toast('Email wording published'); });
    }).catch(function (e) { S.busy = ''; drawBar(); if (e && e.message) drawNote(e.message, true); });
  }
  function test() {
    var f = current(), p = S.prev;
    if (p && ((p.unknown || []).length || (p.problems || []).length)) { drawNote('Fix the highlighted problems before sending a test.', true); return; }
    S.busy = 'test'; drawBar();
    invoke({ op: 'test', kind: S.kind, fields: changes(f) }).then(function (r) {
      S.busy = ''; drawBar();
      if (!r.ok) throw new Error(r.message || 'The test was not sent.');
      drawNote('Test sent to ' + r.to + '. It uses made-up order details.');
    }).catch(function (e) { S.busy = ''; drawBar(); drawNote((e && e.message) || 'The test was not sent. Check the internet connection.', true); });
  }
  function simple(fn, args, msg, ask, after) {
    if (ask && !global.confirm(ask)) return;
    S.busy = 'x'; drawBar();
    rpc(fn, args).then(function (r) {
      S.busy = ''; if (!r || !r.ok) throw new Error(r && r.message || 'That did not work.');
      if (after) after();
      S.fresh = true;
      return load(true).then(function () { draw(); drawNote(msg); S.prevKey = ''; refreshPreview(); });
    }).catch(function (e) { S.busy = ''; drawBar(); drawNote((e && e.message) || 'That did not work. Check the internet connection.', true); });
  }
  function drawBar() {
    if (!ov) return;
    var acts = ov.querySelectorAll('.et-actions .et-btn');
    Array.prototype.forEach.call(acts, function (b) { b.disabled = !!S.busy; });
    var t = ov.querySelector('[data-et="test"]'), s = ov.querySelector('[data-et="save"]'), p = ov.querySelector('[data-et="publish"]');
    if (t) t.textContent = S.busy === 'test' ? 'Sending…' : 'Send me a test';
    if (s) s.textContent = S.busy === 'save' ? 'Saving…' : 'Save draft';
    if (p) p.textContent = S.busy === 'publish' ? 'Publishing…' : 'Publish';
  }

  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-et]');
    if (!b) { if (!e.target.closest('.et-pop') && !e.target.closest('[data-et="ins"]')) closePop(); return; }
    var a = b.getAttribute('data-et'), k = S.kind;
    if (a !== 'pick' && a !== 'ins') closePop();
    if (a === 'close') return close();
    if (a === 'reload') { S.err = null; draw(); return load(true).then(draw); }
    if (a === 'edit') return startEdit(b.getAttribute('data-k'));
    if (a === 'list') { if (unsaved()) drawNote(''); S.view = 'list'; S.kind = null; return draw(); }
    if (a === 'pane') { S.pane = b.getAttribute('data-v'); var sp = ov.querySelector('.et-split'); if (sp) sp.className = 'et-split et-show-' + S.pane; Array.prototype.forEach.call(ov.querySelectorAll('.et-tab'), function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-v') === S.pane)); }); if (S.pane === 'preview') refreshPreview(); return; }
    if (a === 'device') { S.device = b.getAttribute('data-v'); var w = ov.querySelector('.et-frame-wrap'); if (w) w.className = 'et-frame-wrap et-' + S.device; Array.prototype.forEach.call(ov.querySelectorAll('.et-segb'), function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-v') === S.device)); }); return; }
    if (a === 'ins') return fieldPicker(b.getAttribute('data-b'), b);
    if (a === 'pop-close') return closePop();
    if (a === 'pick') { var bx = b.getAttribute('data-b'), fk = b.getAttribute('data-f'); closePop(); return insertField(bx, fk); }
    if (a === 'bold') { if (focusBox(b.getAttribute('data-b'))) { doc.execCommand('bold'); onInput({ target: boxEl(b.getAttribute('data-b')) }); } return; }
    if (a === 'list-b') { if (focusBox(b.getAttribute('data-b'))) { doc.execCommand('insertUnorderedList'); onInput({ target: boxEl(b.getAttribute('data-b')) }); } return; }
    if (a === 'link') return linkPrompt(b.getAttribute('data-b'));
    if (a === 'hist') { S.histOpen = !S.histOpen; return draw(); }
    if (a === 'save') return save().catch(function () {});
    if (a === 'publish') return publish();
    if (a === 'test') return test();
    if (a === 'copy') return simple('email_tpl_copy', { p_version: b.getAttribute('data-v') }, 'That wording is now your draft. Check it, then publish to use it again.', unsaved() ? 'Replace your unsaved changes with this version?' : null, function () { keep(k, null); });
    if (a === 'discard') return simple('email_tpl_discard', { p_kind: k }, 'Draft discarded.', 'Discard the draft? Customers keep getting the published wording.', function () { keep(k, null); });
    if (a === 'standard') return simple('email_tpl_standard', { p_kind: k }, 'The standard wording is in use again. Your earlier wording stays in the version history.', 'Go back to the standard wording?\n\nCustomers get the standard wording from the next email. You can bring yours back from the version history.');
    if (a === 'fill-standard') {
      if (!global.confirm('Fill every box with the standard wording? Nothing is saved until you press Save draft.')) return;
      var d = S.meta.defaults[k] || {};
      BOXES.forEach(function (x) { var el = boxEl(x[0]); if (el) el.innerHTML = toBox(d[x[0]] || '', x[3]); });
      onInput({ target: boxEl('subject') }); return;
    }
    if (a === 'switch') {
      var on = state(k).enabled === false;
      return simple('email_tpl_switch', { p_kind: k, p_on: on }, on ? 'Switched on. Customers get this email again.' : 'Switched off. Customers will not get this email.',
        on ? null : 'Switch off the thank-you email?\n\nCustomers will not get it until you switch it on again. Order emails are not affected.');
    }
  }

  // The Settings entry opens the window
  doc.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#cc-staff [data-et="open"]'); if (b) { e.preventDefault(); e.stopPropagation(); open(); } }, true);
  var mo = new MutationObserver(function () { placeEntry(); });
  function start() { var app = doc.getElementById('cc-staff'); if (!app) return setTimeout(start, 500); mo.observe(app, { childList: true, subtree: true }); placeEntry(); }
  start();
  global.addEventListener('beforeunload', function () { if (ov && !ov.hidden && S.view === 'edit' && S.kind) { var f = current(); keep(S.kind, same(f, savedFields(S.kind)) ? null : f); } });

  var X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var LIST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>';
  var LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';

  global.CCEmailTemplates = { version: VERSION, open: open, close: close };
})(window);
