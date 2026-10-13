/* Corner Café: Build Your Catalogue (Stage 1).
   Reads products from the cake system database (get_catalogue), lets a guest choose products,
   and makes a branded A4 PDF in the browser. Prices always come from the database at the moment
   the PDF is made. Nothing personal is collected. */
(function () {
  'use strict';
  var SCRIPT = document.currentScript;
  var BASE = (SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^\/]*$/, '') : '');
  var CFG = window.CC_CATALOGUE_CONFIG || {};
  var SB_URL = CFG.supabaseUrl || 'https://ilbrfwxblhidtlsjgxlh.supabase.co';
  var SB_KEY = CFG.supabaseKey || 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var FONT_BASE = CFG.fontBase || (BASE + 'fonts/');
  var LIBS = CFG.libs || [
    { name: 'jspdf', test: function () { return window.jspdf && window.jspdf.jsPDF; },
      path: 'npm/jspdf@2.5.1/dist/jspdf.umd.min.js', sri: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk' },
    { name: 'qrcode', test: function () { return window.qrcode; },
      path: 'npm/qrcode-generator@1.4.4/qrcode.js', sri: 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k' }
  ];
  var HOSTS = CFG.libHosts || ['https://cdn.jsdelivr.net/', 'https://fastly.jsdelivr.net/'];
  var BRAND = { ink: [32, 35, 31], brown: [58, 39, 31], cream: [232, 215, 174], line: [226, 218, 204], soft: [110, 104, 96], test: [150, 40, 30] };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var AVAIL = { available: '', limited: 'Limited quantity', coming_soon: 'Coming soon', sold_out: 'Sold out' };

  var S = { data: null, items: [], sel: {}, busy: false, error: '', sheet: null, pdf: null, root: null, collection: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { var v = Number(n); return '$' + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)); }
  function priceText(o, showPrices) {
    if (o.price_on_request) return 'Price on request';
    if (!showPrices || o.price == null) return 'Price to be confirmed';
    return money(o.price);
  }
  function dateWords(iso) { var p = String(iso).split('-'); return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0]; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function selectable(it) { return it.availability !== 'sold_out'; }
  function selectedItems() { return S.items.filter(function (it) { return S.sel[it.id] && selectable(it); }); }

  function rpc(name, body) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(SB_URL + '/rest/v1/rpc/' + name, {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('server ' + r.status);
      return r.json();
    }, function (e) { clearTimeout(t); throw e; });
  }

  /* ---------- styles ---------- */
  var CSS = [
    '.ccc,.ccc-sheet{--ccc-ink:#20231F;--ccc-brown:#3A271F;--ccc-line:#E2DACC;--ccc-soft:#6E6860;--ccc-focus:#8A5A2B}',
    '.ccc{background:#fff;color:var(--ccc-ink);font-family:Causten,Arial,sans-serif;padding:72px 20px;scroll-margin-top:90px}',
    '.ccc *,.ccc-sheet *{box-sizing:border-box}',
    '.ccc-shell{max-width:1240px;margin:0 auto}',
    '.ccc-head{display:flex;flex-wrap:wrap;gap:20px 40px;align-items:flex-end;justify-content:space-between;margin-bottom:28px}',
    '.ccc-kicker{margin:0 0 10px;font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ccc-soft)}',
    '.ccc h2{margin:0 0 12px;font-family:Georgia,serif;font-weight:400;font-size:clamp(30px,4vw,40px);line-height:1.15;color:var(--ccc-brown)}',
    '.ccc-lead{margin:0;font-size:18px;line-height:1.55;max-width:560px}',
    '.ccc-btn{appearance:none;border:2px solid var(--ccc-brown);background:var(--ccc-brown);color:#fff;font:600 16px/1.2 Causten,Arial,sans-serif;padding:14px 22px;border-radius:999px;cursor:pointer;min-height:48px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;text-align:center}',
    '.ccc-btn:hover{background:#2A1C16;border-color:#2A1C16}',
    '.ccc-btn.ccc-sec{background:#fff;color:var(--ccc-brown)}',
    '.ccc-btn.ccc-sec:hover{background:#F6F1E8}',
    '.ccc-btn[disabled]{opacity:.45;cursor:not-allowed}',
    '.ccc-btn:focus-visible,.ccc-inc:focus-visible,.ccc-link:focus-visible{outline:3px solid var(--ccc-focus);outline-offset:3px}',
    '.ccc-tools{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin:0 0 18px;font-size:16px;color:var(--ccc-soft)}',
    '.ccc-link{appearance:none;background:none;border:0;padding:10px 4px;min-height:44px;font:600 16px Causten,Arial,sans-serif;color:var(--ccc-brown);text-decoration:underline;text-underline-offset:4px;cursor:pointer}',
    '.ccc-search{flex:1 1 220px;max-width:320px;min-height:48px;border:1px solid var(--ccc-line);border-radius:12px;padding:0 14px;font:16px Causten,Arial,sans-serif}',
    '.ccc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}',
    '@media (max-width:1000px){.ccc-grid{grid-template-columns:repeat(2,1fr)}}',
    '.ccc-card{border:1px solid var(--ccc-line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;background:#fff;transition:border-color .2s,box-shadow .2s}',
    '.ccc-card.on{border-color:var(--ccc-brown);box-shadow:0 0 0 1px var(--ccc-brown)}',
    '.ccc-card.off{opacity:.6}',
    '.ccc-img{aspect-ratio:4/3;background:#F4EFE6;position:relative}',
    '.ccc-img img{width:100%;height:100%;object-fit:cover;display:block}',
    '.ccc-tag{position:absolute;left:12px;top:12px;background:#fff;color:#96281E;border:1px solid #96281E;font:700 12px Causten,Arial,sans-serif;letter-spacing:.06em;padding:4px 8px;border-radius:6px}',
    '.ccc-body{padding:22px 22px 24px;display:flex;flex-direction:column;gap:8px;flex:1}',
    '.ccc-body h3{margin:0;font-family:Georgia,serif;font-weight:400;font-size:clamp(24px,2.2vw,28px);line-height:1.25;color:var(--ccc-brown)}',
    '.ccc-desc{margin:0;font-size:17px;line-height:1.55}',
    '.ccc-opts{list-style:none;margin:6px 0 0;padding:0;font-size:16px}',
    '.ccc-opts li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid var(--ccc-line)}',
    '.ccc-opts b{font-weight:600;white-space:nowrap}',
    '.ccc-avail{font-size:14px;font-weight:600;color:#7A4B12}',
    '.ccc-diet{font-size:14px;color:var(--ccc-soft)}',
    '.ccc-inc{margin-top:auto;appearance:none;width:100%;min-height:48px;border:2px solid var(--ccc-brown);border-radius:999px;background:#fff;color:var(--ccc-brown);font:600 16px Causten,Arial,sans-serif;cursor:pointer}',
    '.ccc-inc[aria-pressed="true"]{background:var(--ccc-brown);color:#fff}',
    '.ccc-inc[disabled]{border-color:var(--ccc-line);color:var(--ccc-soft);cursor:not-allowed}',
    '.ccc-bar{position:sticky;bottom:0;z-index:20;margin-top:24px;background:#fff;border-top:1px solid var(--ccc-line);padding:14px 0 calc(14px + env(safe-area-inset-bottom));display:flex;gap:14px;align-items:center;justify-content:space-between}',
    '.ccc-count{font-size:17px;font-weight:600}',
    '.ccc-msg{border:1px solid var(--ccc-line);border-radius:12px;padding:18px;font-size:16px;line-height:1.5}',
    '.ccc-msg.err{border-color:#96281E}',
    '.ccc-note{font-size:14px;color:var(--ccc-soft);margin:14px 0 0}',
    '.ccc-sheet{position:fixed;inset:0;z-index:10000;background:rgba(20,16,12,.55);display:flex;align-items:center;justify-content:center;padding:20px}',
    '.ccc-panel{background:#fff;color:var(--ccc-ink);border-radius:18px;width:min(980px,100%);max-height:calc(100dvh - 40px);display:flex;flex-direction:column;overflow:hidden;font-family:Causten,Arial,sans-serif}',
    '.ccc-panel-head{padding:20px 22px;border-bottom:1px solid var(--ccc-line);display:flex;justify-content:space-between;align-items:center;gap:12px}',
    '.ccc-panel-head h3{margin:0;font-family:Georgia,serif;font-weight:400;font-size:24px;color:var(--ccc-brown)}',
    '.ccc-panel-body{padding:20px 22px;overflow:auto;flex:1;min-height:0}',
    '.ccc-panel-body iframe{width:100%;height:62vh;border:1px solid var(--ccc-line);border-radius:10px;display:block}',
    '.ccc-panel-foot{padding:16px 22px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--ccc-line);display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end}',
    '.ccc-summary{margin:0;padding:0;list-style:none}',
    '.ccc-summary li{padding:10px 0;border-bottom:1px solid var(--ccc-line);font-size:16px}',
    '.ccc-spin{font-size:17px;padding:30px 0;text-align:center}',
    '@media (max-width:640px){.ccc{padding:48px 16px}.ccc-head .ccc-btn{width:100%}.ccc-grid{grid-template-columns:1fr;gap:14px}.ccc-card{flex-direction:row;align-items:stretch}.ccc-img{flex:0 0 112px;width:112px;height:112px;aspect-ratio:1/1;align-self:flex-start;margin:12px 0 12px 12px;border-radius:10px;overflow:hidden}.ccc-img img{position:absolute;inset:0}.ccc-tag{left:6px;top:6px;font-size:11px;padding:2px 5px}.ccc-body{padding:12px 14px 14px;gap:6px;min-width:0}.ccc-body h3{font-size:20px}.ccc-desc{font-size:15px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.ccc-opts{font-size:15px}.ccc-opts li{padding:5px 0;flex-direction:column;gap:1px}.ccc-opts b{white-space:normal}.ccc-inc{min-height:44px;margin-top:6px}.ccc-bar{padding-left:16px;padding-right:16px;margin-left:-16px;margin-right:-16px;box-shadow:0 -6px 16px rgba(0,0,0,.06)}',
    '.ccc-sheet{padding:0;align-items:stretch}.ccc-panel{border-radius:0;max-height:100dvh;height:100dvh}.ccc-panel-foot .ccc-btn{flex:1 1 100%}}',
    '@media (prefers-reduced-motion:reduce){.ccc-card{transition:none}}'
  ].join('\n');

  /* ---------- rendering ---------- */
  function render() {
    var r = S.root; if (!r) return;
    var d = S.data, c = d && d.collection;
    var h = '<div class="ccc-shell">';
    h += '<div class="ccc-head"><div><p class="ccc-kicker">Corner Café</p><h2 id="ccc-title">Build Your Festive Catalogue</h2>' +
      '<p class="ccc-lead">Choose your favourites and create a PDF to share with your team.</p></div>';
    if (c && S.items.length) h += '<button type="button" class="ccc-btn ccc-sec" data-act="full">Download Full Festive Catalogue</button>';
    h += '</div>';
    if (!d && !S.error) h += '<p class="ccc-msg" role="status">Loading the festive range…</p>';
    else if (S.error && !d) h += '<div class="ccc-msg err" role="alert">' + esc(S.error) + ' <button type="button" class="ccc-link" data-act="reload">Try again</button></div>';
    else if (!S.items.length) h += '<p class="ccc-msg">The festive range will appear here soon.</p>';
    else {
      var n = selectedItems().length, avail = S.items.filter(selectable).length;
      var q = (S.q || '').toLowerCase().trim();
      h += '<div class="ccc-tools">';
      if (S.items.length > 12) h += '<input class="ccc-search" type="search" placeholder="Search products" aria-label="Search products" value="' + esc(S.q || '') + '" data-act="search">';
      h += '<button type="button" class="ccc-link" data-act="all">' + (n === avail ? 'Clear selection' : 'Select all') + '</button></div>';
      h += '<div class="ccc-grid">';
      S.items.forEach(function (it) {
        if (q && (it.name + ' ' + (it.category || '')).toLowerCase().indexOf(q) < 0) return;
        var on = !!S.sel[it.id] && selectable(it), can = selectable(it);
        h += '<article class="ccc-card' + (on ? ' on' : '') + (can ? '' : ' off') + '">';
        h += '<div class="ccc-img">' + (it.image_url ? '<img src="' + esc(it.image_url) + '" alt="' + esc(it.image_alt || it.name) + '" loading="lazy">' : '') +
          (it.is_test ? '<span class="ccc-tag">TEST</span>' : '') + '</div>';
        h += '<div class="ccc-body"><h3>' + esc(it.name) + '</h3>';
        if (it.description) h += '<p class="ccc-desc">' + esc(it.description) + '</p>';
        if (it.options && it.options.length) {
          h += '<ul class="ccc-opts">';
          it.options.forEach(function (o) { h += '<li><span>' + esc(o.label) + '</span><b>' + esc(priceText(o, c.show_prices)) + '</b></li>'; });
          h += '</ul>';
        }
        if (AVAIL[it.availability]) h += '<span class="ccc-avail">' + AVAIL[it.availability] + '</span>';
        if (it.dietary_info) h += '<span class="ccc-diet">' + esc(it.dietary_info) + '</span>';
        h += '<button type="button" class="ccc-inc" data-act="toggle" data-id="' + esc(it.id) + '" aria-pressed="' + on + '"' + (can ? '' : ' disabled') +
          ' aria-label="' + (on ? 'Remove ' : 'Include ') + esc(it.name) + (on ? ' from' : ' in') + ' your catalogue">' + (can ? (on ? 'Included' : 'Include') : 'Sold out') + '</button>';
        h += '</div></article>';
      });
      h += '</div>';
      h += '<div class="ccc-bar"><span class="ccc-count" aria-live="polite">' + (n ? n + (n === 1 ? ' product' : ' products') + ' selected' : 'No products selected yet') + '</span>' +
        '<button type="button" class="ccc-btn" data-act="custom"' + (n ? '' : ' disabled') + '>Preview PDF</button></div>';
      h += '<p class="ccc-note">The PDF shows prices and availability on the day you make it. It is not an order; our team confirms every order with you.</p>';
    }
    h += '</div>';
    var y = window.scrollY, focusAct = document.activeElement && document.activeElement.getAttribute && r.contains(document.activeElement) ? [document.activeElement.getAttribute('data-act'), document.activeElement.getAttribute('data-id')] : null;
    r.innerHTML = h;
    if (focusAct) {
      var el = r.querySelector('[data-act="' + focusAct[0] + '"]' + (focusAct[1] ? '[data-id="' + focusAct[1] + '"]' : ''));
      if (el) el.focus({ preventScroll: true });
    }
    if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    renderSheet();
  }

  function renderSheet() {
    var old = document.getElementById('ccc-sheet');
    if (!S.sheet) { if (old) { old.remove(); document.documentElement.style.overflow = ''; } return; }
    var sh = old || document.createElement('div');
    if (!old) { sh.id = 'ccc-sheet'; sh.className = 'ccc-sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'ccc-sheet-title'); document.body.appendChild(sh); document.documentElement.style.overflow = 'hidden'; }
    var s = S.sheet, h = '<div class="ccc-panel"><div class="ccc-panel-head"><h3 id="ccc-sheet-title">' + (s.kind === 'full' ? 'Full festive catalogue' : 'Your festive catalogue') + '</h3>' +
      '<button type="button" class="ccc-link" data-act="close">Back to products</button></div><div class="ccc-panel-body">';
    if (s.state === 'making') h += '<p class="ccc-spin" role="status">Making your catalogue. This takes a few seconds…</p>';
    else if (s.state === 'error') h += '<div class="ccc-msg err" role="alert">' + esc(s.message) + '</div>';
    else {
      if (s.notice) h += '<div class="ccc-msg" role="status" style="margin-bottom:14px">' + esc(s.notice) + '</div>';
      h += '<p style="margin:0 0 14px;font-size:16px">Ready: ' + s.count + (s.count === 1 ? ' product' : ' products') + ' on ' + s.pages + (s.pages === 1 ? ' page' : ' pages') + ', ' + Math.max(1, Math.round(s.size / 1024)) + ' KB.</p>';
      if (s.inline) h += '<iframe title="Catalogue preview" src="' + s.url + '#view=FitH"></iframe>';
      else h += '<ul class="ccc-summary">' + s.names.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    }
    h += '</div><div class="ccc-panel-foot">';
    if (s.state === 'error') h += '<button type="button" class="ccc-btn" data-act="retry">Try again</button>';
    if (s.state === 'ready') {
      if (!s.inline) h += '<a class="ccc-btn ccc-sec" href="' + s.url + '" target="_blank" rel="noopener">Open PDF</a>';
      if (s.canShare) h += '<button type="button" class="ccc-btn ccc-sec" data-act="share">Share</button>';
      h += '<a class="ccc-btn" href="' + s.url + '" download="' + esc(s.filename) + '" data-act="download">Download PDF</a>';
    }
    h += '</div></div>';
    sh.innerHTML = h;
    var first = sh.querySelector('[data-act="download"]') || sh.querySelector('[data-act="retry"]') || sh.querySelector('[data-act="close"]');
    if (first && !sh.contains(document.activeElement)) first.focus();
  }

  /* ---------- actions ---------- */
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'toggle') { var id = b.getAttribute('data-id'); if (S.sel[id]) delete S.sel[id]; else S.sel[id] = true; store('ccc-sel-' + S.collection, S.sel); render(); }
    else if (a === 'all') { var avail = S.items.filter(selectable); if (selectedItems().length === avail.length) S.sel = {}; else avail.forEach(function (it) { S.sel[it.id] = true; }); store('ccc-sel-' + S.collection, S.sel); render(); }
    else if (a === 'full') make('full');
    else if (a === 'custom') make('custom');
    else if (a === 'retry') make(S.sheet ? S.sheet.kind : 'custom');
    else if (a === 'close') closeSheet();
    else if (a === 'reload') load();
    else if (a === 'share') share();
  }
  function closeSheet() {
    if (S.sheet && S.sheet.url) setTimeout(function (u) { return function () { URL.revokeObjectURL(u); }; }(S.sheet.url), 60000);
    S.sheet = null; renderSheet();
    var btn = S.root && S.root.querySelector('[data-act="custom"]'); if (btn) btn.focus();
  }
  function share() {
    var s = S.sheet; if (!s || !s.file) return;
    navigator.share({ files: [s.file], title: s.title, text: 'Corner Café ' + s.title }).catch(function () {});
  }

  function load() {
    S.error = ''; S.data = null; render();
    return rpc('get_catalogue', { p_code: S.collection }).then(function (d) {
      if (!d || !d.ok) { S.error = (d && d.message) || 'The catalogue is not available right now.'; S.data = null; render(); return; }
      S.data = d; S.items = d.items || [];
      var keep = {}; S.items.forEach(function (it) { if (S.sel[it.id] && selectable(it)) keep[it.id] = true; }); S.sel = keep;
      render();
    }, function () { S.error = 'We could not load the festive range. Check your connection and try again.'; render(); });
  }

  function make(kind) {
    if (S.busy) return;
    var wanted = kind === 'full' ? null : Object.keys(S.sel);
    if (kind === 'custom' && !wanted.length) return;
    S.busy = true;
    S.sheet = { kind: kind, state: 'making' }; renderSheet();
    // Always use fresh data, so prices and availability are current.
    Promise.all([rpc('get_catalogue', { p_code: S.collection }), loadLibs()]).then(function (res) {
      var d = res[0];
      if (!d || !d.ok) throw { user: (d && d.message) || 'The catalogue is not available right now.' };
      S.data = d; S.items = d.items || [];
      var items = S.items.filter(selectable), notice = '';
      if (kind === 'custom') {
        var before = wanted.length;
        items = items.filter(function (it) { return wanted.indexOf(it.id) >= 0; });
        if (!items.length) throw { user: 'The products you chose are no longer available. Go back and choose again.' };
        if (items.length < before) notice = (before - items.length) + (before - items.length === 1 ? ' product you chose is' : ' products you chose are') + ' no longer available, so ' + (before - items.length === 1 ? 'it was' : 'they were') + ' left out.';
        var keep = {}; items.forEach(function (it) { keep[it.id] = true; }); S.sel = keep; store('ccc-sel-' + S.collection, S.sel);
      }
      if (!items.length) throw { user: 'There are no products to put in the catalogue yet.' };
      return rpc('log_catalogue_generation', { p_code: S.collection, p_kind: kind, p_item_ids: items.map(function (i) { return i.id; }) }).then(function (lg) {
        if (lg && lg.ok === false) throw { user: lg.message || 'Please try again in a few minutes.' };
        return buildPdf(d, items, kind).then(function (out) { out.notice = notice; return out; });
      });
    }).then(function (out) {
      var title = out.title, filename = out.filename;
      var file = null; try { file = new File([out.blob], filename, { type: 'application/pdf' }); } catch (e) {}
      var canShare = !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
      var inline = window.matchMedia && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
      S.sheet = { kind: kind, state: 'ready', url: URL.createObjectURL(out.blob), blob: out.blob, file: file, filename: filename, title: title, pages: out.pages, count: out.count,
        names: out.names, size: out.blob.size, canShare: canShare, inline: inline, notice: out.notice };
      S.busy = false; render();
    }).catch(function (e) {
      if (window.console) console.error('catalogue', e);
      S.busy = false;
      S.sheet = { kind: kind, state: 'error', message: (e && e.user) || 'We could not make your catalogue. Check your connection and try again.' };
      render();
    });
  }

  /* ---------- libraries and assets ---------- */
  var libPromise = null;
  function loadScript(lib) {
    return new Promise(function (ok, fail) {
      if (lib.test()) return ok();
      var i = 0;
      (function next() {
        if (i >= HOSTS.length) return fail(new Error('library ' + lib.name));
        var s = document.createElement('script'); s.src = HOSTS[i++] + lib.path; s.crossOrigin = 'anonymous';
        if (lib.sri) s.integrity = lib.sri;
        s.onload = function () { lib.test() ? ok() : next(); }; s.onerror = next; document.head.appendChild(s);
      })();
    });
  }
  function loadLibs() {
    if (!libPromise) libPromise = Promise.all(LIBS.map(loadScript)).then(loadFonts).catch(function (e) { libPromise = null; throw e; });
    return libPromise;
  }
  var FONTS = { 'Gelasio-Regular.ttf': ['Gelasio', 'normal'], 'Gelasio-SemiBold.ttf': ['Gelasio', 'bold'], 'Outfit-Regular.ttf': ['Outfit', 'normal'], 'Outfit-SemiBold.ttf': ['Outfit', 'bold'] };
  var fontData = null;
  function b64(buf) { var s = '', a = new Uint8Array(buf), step = 0x8000; for (var i = 0; i < a.length; i += step) s += String.fromCharCode.apply(null, a.subarray(i, i + step)); return btoa(s); }
  function loadFonts() {
    if (fontData) return fontData;
    return Promise.all(Object.keys(FONTS).map(function (f) {
      return fetch(FONT_BASE + f).then(function (r) { if (!r.ok) throw new Error('font ' + f); return r.arrayBuffer(); }).then(function (b) { return [f, b64(b)]; });
    })).then(function (list) { fontData = list; return list; });
  }
  // Fetch a photo, crop it to the frame (cover) and return a JPEG for the PDF.
  function photo(url, wpx, hpx) {
    if (!url) return Promise.resolve(null);
    return fetch(url, { mode: 'cors' }).then(function (r) { if (!r.ok) throw new Error('image'); return r.blob(); }).then(function (blob) {
      return (window.createImageBitmap ? createImageBitmap(blob) : new Promise(function (ok, fail) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = fail; im.src = URL.createObjectURL(blob); }));
    }).then(function (bm) {
      var c = document.createElement('canvas'); c.width = wpx; c.height = hpx;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, wpx, hpx);
      var s = Math.max(wpx / bm.width, hpx / bm.height), w = bm.width * s, h = bm.height * s;
      g.drawImage(bm, (wpx - w) / 2, (hpx - h) / 2, w, h);
      return c.toDataURL('image/jpeg', 0.82);
    }).catch(function () { return null; });
  }
  function logo(url) {
    return fetch(url, { mode: 'cors' }).then(function (r) { return r.blob(); }).then(function (b) { return createImageBitmap(b); }).then(function (bm) {
      var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0);
      return { data: c.toDataURL('image/png'), w: bm.width, h: bm.height };
    }).catch(function () { return null; });
  }

  /* ---------- PDF ---------- */
  var LOGO_URL = CFG.logoUrl || 'https://cdn.prod.website-files.com/6a0afe25d2f1212db6f93a0e/6a2973404d4e9162e671b50f_Corner%20Cafe%20(2)-p-800.png';
  function buildPdf(d, items, kind) {
    var c = d.collection, ct = d.contact || {};
    // Square photos, three across. Cropped to the exact square frame, so nothing is stretched.
    var COLS = 3, GAPW = 7, FRAME_W = (174 - GAPW * (COLS - 1)) / COLS, FRAME_H = FRAME_W, PX = 12;
    return Promise.all([Promise.all(items.map(function (it) { return photo(it.image_url, Math.round(FRAME_W * PX), Math.round(FRAME_H * PX)); })), logo(LOGO_URL), fontData]).then(function (res) {
      var imgs = res[0], lg = res[1];
      var J = window.jspdf.jsPDF, doc = new J({ unit: 'mm', format: 'a4', compress: true });
      res[2].forEach(function (f) { doc.addFileToVFS(f[0], f[1]); doc.addFont(f[0], FONTS[f[0]][0], FONTS[f[0]][1]); });
      var W = 210, H = 297, M = 18, CW = W - 2 * M, y = 0, page = 1;
      var title = c.title + (kind === 'custom' ? ': Your Selection' : '');
      doc.setProperties({ title: 'Corner Café ' + title, subject: c.title, author: 'Corner Café', keywords: 'Corner Café, ' + c.title, creator: 'Corner Café website' });
      doc.setLanguage && doc.setLanguage('en-GB');
      function col(a) { doc.setTextColor(a[0], a[1], a[2]); }
      function font(f, st, size) { doc.setFont(f, st); doc.setFontSize(size); }
      function testBand() {
        if (!c.is_test) return;
        doc.setFillColor(BRAND.test[0], BRAND.test[1], BRAND.test[2]); doc.rect(0, 0, W, 8, 'F');
        font('Outfit', 'bold', 8.5); doc.setTextColor(255, 255, 255);
        doc.text('TEST CATALOGUE WITH SAMPLE PRODUCTS AND PRICES. NOT FOR CUSTOMERS.', W / 2, 5.3, { align: 'center' });
      }
      function pageHead() {
        testBand();
        if (page === 1) return;
        font('Outfit', 'bold', 8.5); col(BRAND.soft);
        doc.text('CORNER CAFÉ', M, 18); doc.text(c.title.toUpperCase(), W - M, 18, { align: 'right' });
        doc.setDrawColor(BRAND.line[0], BRAND.line[1], BRAND.line[2]); doc.setLineWidth(0.3); doc.line(M, 21, W - M, 21);
        y = 30;
      }
      function newPage() { doc.addPage(); page++; pageHead(); }

      // Cover header (page 1)
      testBand();
      y = c.is_test ? 16 : 13;
      if (lg) { var lh = 12, lw = lh * lg.w / lg.h; doc.addImage(lg.data, 'PNG', M, y, lw, lh); }
      font('Outfit', 'bold', 8.5); col(BRAND.soft);
      doc.text(kind === 'custom' ? 'YOUR SELECTION' : 'FULL CATALOGUE', W - M, y + 5, { align: 'right' });
      font('Outfit', 'normal', 8.5); doc.text('Made on ' + dateWords(d.today), W - M, y + 9.5, { align: 'right' });
      y += 27;
      font('Gelasio', 'normal', 26); col(BRAND.brown);
      doc.splitTextToSize(c.title, CW).forEach(function (l) { doc.text(l, M, y); y += 10; });
      if (c.intro) { font('Outfit', 'normal', 10.5); col(BRAND.ink); doc.splitTextToSize(c.intro, CW * 0.82).forEach(function (l) { doc.text(l, M, y - 2); y += 5; }); }
      y += 1; doc.setDrawColor(BRAND.cream[0], BRAND.cream[1], BRAND.cream[2]); doc.setLineWidth(1.2); doc.line(M, y, M + 30, y); y += 8;

      // Products: two-column cards, photo on top. A row of cards never splits across pages.
      var GAP = GAPW, CWD = FRAME_W, IH = FRAME_H, FOOT = H - 19;
      // Each option is one line when label and price fit side by side, otherwise the price goes on its own line.
      function optLines(o) {
        var pt = priceText(o, c.show_prices);
        font('Outfit', 'bold', 8.5); var pw = doc.getTextWidth(pt);
        font('Outfit', 'normal', 8.5); var lw = doc.getTextWidth(o.label);
        return { pt: pt, split: lw + pw + 3 > CWD };
      }
      function measure(it) {
        font('Gelasio', 'normal', 12.5); var nameL = doc.splitTextToSize(it.name, CWD).slice(0, 3);
        font('Outfit', 'normal', 8.8); var desc = it.description ? doc.splitTextToSize(it.description, CWD) : [];
        if (desc.length > 7) { desc = desc.slice(0, 7); desc[6] = desc[6].replace(/\s+\S*$/, '') + '…'; }
        font('Outfit', 'normal', 8.5);
        var extra = [AVAIL[it.availability], it.dietary_info, it.ordering_note].filter(Boolean).map(function (x) { return doc.splitTextToSize(x, CWD)[0]; });
        var opts = (it.options || []).map(function (o) { var l = optLines(o); return { o: o, pt: l.pt, split: l.split }; });
        var oh = opts.reduce(function (a, q) { return a + (q.split ? 9.4 : 5.3); }, 0);
        var h = IH + 5.5 + 4.5 + nameL.length * 5.3 + 1 + desc.length * 3.9 + (opts.length ? 3.6 : 0) + oh + extra.length * 4.4;
        return { nameL: nameL, desc: desc, extra: extra, opts: opts, h: h };
      }
      function card(it, img, m, x, top) {
        if (img) doc.addImage(img, 'JPEG', x, top, CWD, IH, undefined, 'FAST');
        else { doc.setFillColor(244, 239, 230); doc.rect(x, top, CWD, IH, 'F'); font('Gelasio', 'normal', 11); col(BRAND.soft); doc.text(doc.splitTextToSize(it.name, CWD - 12), x + CWD / 2, top + IH / 2, { align: 'center' }); }
        var ty = top + IH + 5.5;
        font('Outfit', 'bold', 7); col(BRAND.soft);
        doc.text(((it.category || '') + (it.is_test ? '   TEST' : '')).toUpperCase(), x, ty); ty += 5.3;
        font('Gelasio', 'normal', 12.5); col(BRAND.brown); m.nameL.forEach(function (l) { doc.text(l, x, ty); ty += 5.3; });
        ty += 0.3; font('Outfit', 'normal', 8.8); col(BRAND.ink); m.desc.forEach(function (l) { doc.text(l, x, ty); ty += 3.9; });
        if (m.opts.length) ty += 3.6;
        m.opts.forEach(function (q) {
          doc.setDrawColor(BRAND.line[0], BRAND.line[1], BRAND.line[2]); doc.setLineWidth(0.25); doc.line(x, ty - 3.6, x + CWD, ty - 3.6);
          font('Outfit', 'normal', 8.5); col(BRAND.ink);
          if (q.split) {
            doc.text(doc.splitTextToSize(q.o.label, CWD)[0], x, ty); ty += 4.1;
            font('Outfit', 'bold', 8.5); doc.text(q.pt, x + CWD, ty, { align: 'right' }); ty += 5.3;
          } else {
            doc.text(q.o.label, x, ty); font('Outfit', 'bold', 8.5); doc.text(q.pt, x + CWD, ty, { align: 'right' }); ty += 5.3;
          }
        });
        m.extra.forEach(function (e, i) {
          if (i === 0 && AVAIL[it.availability]) { font('Outfit', 'bold', 8.5); doc.setTextColor(122, 75, 18); } else { font('Outfit', 'normal', 8.5); col(BRAND.soft); }
          doc.text(e, x, ty); ty += 4.4;
        });
      }
      for (var k = 0; k < items.length; k += COLS) {
        var pair = items.slice(k, k + COLS), ms = pair.map(measure);
        var rowH = Math.max.apply(null, ms.map(function (m) { return m.h; }));
        if (y + rowH > FOOT) newPage();
        pair.forEach(function (it, j) { card(it, imgs[k + j], ms[j], M + j * (CWD + GAP), y); });
        y += rowH + 8;
      }

      // How to order block, kept together, with QR code.
      var link = (c.page_url || 'https://www.cornercafefiji.com') + (String(c.page_url || '').indexOf('?') >= 0 ? '&' : '?') + 'utm_source=catalogue&utm_medium=pdf&utm_campaign=' + encodeURIComponent(c.code);
      font('Outfit', 'normal', 10);
      var QR = 30, BW = CW - QR - 10;
      var lines = [];
      if (c.ordering_info) lines = lines.concat(doc.splitTextToSize(c.ordering_info, BW - 12));
      var facts = [c.deadline_text, c.collection_text].filter(Boolean);
      var contact = ['Phone ' + (ct.phone || '+679 892 2760'), ct.email, ct.address].filter(Boolean).join('   ');
      font('Outfit', 'normal', 8.5);
      var disc = c.disclaimer ? doc.splitTextToSize(c.disclaimer + ' Prices are in Fiji dollars.', CW - 16) : [];
      var boxH = 16 + lines.length * 4.8 + facts.length * 5.4 + 14 + 6;
      boxH = Math.max(boxH, QR + 20) + (disc.length ? disc.length * 3.9 + 6 : 0);
      if (y + boxH > FOOT) newPage();
      doc.setFillColor(248, 244, 236); doc.roundedRect(M, y, CW, boxH, 3, 3, 'F');
      var by = y + 11;
      font('Gelasio', 'normal', 15); col(BRAND.brown); doc.text('How to order', M + 8, by); by += 7;
      font('Outfit', 'normal', 10); col(BRAND.ink); lines.forEach(function (l) { doc.text(l, M + 8, by); by += 4.8; });
      by += 1.5; font('Outfit', 'bold', 10); facts.forEach(function (f) { doc.text(doc.splitTextToSize(f, BW - 12)[0], M + 8, by); by += 5.4; });
      by += 2; font('Outfit', 'normal', 9.5); doc.text(doc.splitTextToSize(contact, BW - 12), M + 8, by);
      // QR code drawn as vector squares, so it stays sharp when printed.
      try {
        var qr = window.qrcode(0, 'M'); qr.addData(link); qr.make();
        var n = qr.getModuleCount(), cell = QR / n, qx = W - M - 8 - QR, qy = y + 8;
        doc.setFillColor(255, 255, 255); doc.rect(qx - 2, qy - 2, QR + 4, QR + 4, 'F');
        doc.setFillColor(BRAND.ink[0], BRAND.ink[1], BRAND.ink[2]);
        for (var r2 = 0; r2 < n; r2++) for (var c2 = 0; c2 < n; c2++) if (qr.isDark(r2, c2)) doc.rect(qx + c2 * cell, qy + r2 * cell, cell + 0.02, cell + 0.02, 'F');
        font('Outfit', 'normal', 8); col(BRAND.soft); doc.text('Scan for the latest range', qx + QR / 2, qy + QR + 6, { align: 'center' });
        doc.link(qx, qy, QR, QR, { url: link });
      } catch (e) {}
      if (disc.length) {
        var dy = y + boxH - 6 - disc.length * 3.9 + 3;
        doc.setDrawColor(BRAND.line[0], BRAND.line[1], BRAND.line[2]); doc.setLineWidth(0.25); doc.line(M + 8, dy - 5, W - M - 8, dy - 5);
        font('Outfit', 'normal', 8.5); col(BRAND.soft); disc.forEach(function (l) { doc.text(l, M + 8, dy); dy += 3.9; });
      }

      // Footer on every page.
      var total = doc.getNumberOfPages();
      for (var p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setDrawColor(BRAND.line[0], BRAND.line[1], BRAND.line[2]); doc.setLineWidth(0.3); doc.line(M, H - 15, W - M, H - 15);
        font('Outfit', 'normal', 8.5); col(BRAND.soft);
        doc.text('Corner Café   cornercafefiji.com   ' + (ct.phone || '+679 892 2760'), M, H - 10);
        doc.text('Made on ' + dateWords(d.today) + '   Page ' + p + ' of ' + total, W - M, H - 10, { align: 'right' });
        doc.link(M + 22, H - 13.5, 30, 5, { url: link });
      }
      var blob = doc.output('blob');
      var slug = c.title.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { blob: blob, pages: total, count: items.length, names: items.map(function (i) { return i.name; }),
        title: title, filename: 'Corner-Cafe-' + slug + (kind === 'custom' ? '-Your-Selection' : '') + '.pdf' };
    });
  }

  /* ---------- start ---------- */
  function mount() {
    if (document.getElementById('ccc-style')) return;
    var st = document.createElement('style'); st.id = 'ccc-style'; st.textContent = CSS; document.head.appendChild(st);
    var root = document.getElementById('cc-catalogue');
    if (!root) {
      root = document.createElement('section'); root.id = 'cc-catalogue';
      var anchor = document.querySelector(CFG.insertBefore || '.ccfest-order-info') || document.getElementById('festive-order');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor); else (document.querySelector('main') || document.body).appendChild(root);
    }
    root.className = 'ccc'; root.setAttribute('aria-labelledby', 'ccc-title');
    // The old product grid (#collection) is hidden on the festive page; send its links here instead.
    if (!document.getElementById('collection')) [].forEach.call(document.querySelectorAll('a[href="#collection"]'), function (a) { a.setAttribute('href', '#cc-catalogue'); });
    S.root = root; S.collection = root.getAttribute('data-collection') || CFG.collection || 'festive-2026';
    S.sel = store('ccc-sel-' + S.collection) || {};
    root.addEventListener('click', onClick);
    root.addEventListener('input', function (e) { if (e.target.getAttribute('data-act') === 'search') { S.q = e.target.value; render(); var i = root.querySelector('.ccc-search'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } });
    document.addEventListener('click', function (e) { var sh = document.getElementById('ccc-sheet'); if (sh && sh.contains(e.target)) { if (e.target === sh) closeSheet(); else onClick(e); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.sheet && S.sheet.state !== 'making') closeSheet(); });
    load();
  }
  window.CCCatalogue = { _state: S, make: make, reload: load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
