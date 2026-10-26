/* Corner Café website cake order form: seasonal treats (festive treats and other limited-time items), 26 October 2026.
 * Loads before the order form. On the last step ("check and send") it shows the treats on sale for the customer's
 * pickup day, from the Service Hub (Settings > Seasonal items), with photo, size or pack, price and plus or minus.
 * The chosen treats are sent with the cake request; the database checks every price and rule and saves the cake and
 * treats together, or not at all. Counter only items never come to the website. Nothing shows when nothing is on sale.
 * If this file fails to load or errors, the order form works exactly as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccoSeasonal20261026) return;
  win.__ccoSeasonal20261026 = true;
  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', TZ = 'Pacific/Fiji';
  var DRAFT = 'cco-draft-v2', CART = 'cco-treats-v1';
  var menu = null, cart = {}, lastSent = null, removedNote = null, own = null, rootEl = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n || 0); return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n))); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function warn(w, e) { try { console.warn('[Seasonal treats] ' + w, e); } catch (_) {} }
  function draft() { try { var d = JSON.parse(win.localStorage.getItem(DRAFT) || 'null'); return d && d.s ? d : null; } catch (_) { return null; } }
  function pickDate() { var d = draft(); return d && /^\d{4}-\d{2}-\d{2}$/.test(d.s.date || '') ? d.s.date : null; }
  function draftKey() { var d = draft(); return d ? d.key : null; }
  function saveCart() { try { win.localStorage.setItem(CART, JSON.stringify({ key: draftKey(), at: Date.now(), qty: cart })); } catch (_) {} }
  function loadCart() { try { var c = JSON.parse(win.localStorage.getItem(CART) || 'null'); if (c && c.qty && Date.now() - c.at < 864e5 && c.key && c.key === draftKey()) cart = c.qty; } catch (_) {} }
  function clearCart() { cart = {}; try { win.localStorage.removeItem(CART); } catch (_) {} }
  function items() { var out = []; ((menu && menu.groups) || []).forEach(function (g) { (g.items || []).forEach(function (i) { out.push(i); }); }); return out; }
  function byId(id) { return items().filter(function (i) { return i.id === id; })[0] || null; }
  function lines() { return Object.keys(cart).filter(function (k) { return cart[k] > 0 && byId(k); }).map(function (k) { return { id: k, quantity: cart[k] }; }); }
  function total() { return lines().reduce(function (s, l) { return s + Number(byId(l.id).price) * l.quantity; }, 0); }
  function why(it, date) {
    if (!date) return null;
    if (it.pickup_from && date < it.pickup_from) return 'Available for pickup from ' + nice(it.pickup_from);
    if (it.pickup_to && date > it.pickup_to) return 'Last pickup ' + nice(it.pickup_to);
    if ((it.blocked || []).indexOf(date) > -1 || (it.sold_out || []).indexOf(date) > -1) return 'Sold out for your pickup day';
    if (it.lead_days && date < addDays(today(), it.lead_days)) return 'Needs ' + it.lead_days + (it.lead_days === 1 ? " day's" : " days'") + ' notice';
    return null;
  }

  // ---------- send the treats with the cake request ----------
  function wrap(client) {
    if (!client || client.__ccoTreats || typeof client.rpc !== 'function') return client;
    var rpc = client.rpc;
    client.rpc = function (fn, args) {
      if (fn === 'submit_online_order' && args && args.p) {
        var l = lines(); lastSent = l.length ? l.map(function (x) { var it = byId(x.id); return { name: it.name, detail: it.detail, quantity: x.quantity, price: it.price }; }) : null;
        if (l.length) args = Object.assign({}, args, { p: Object.assign({}, args.p, { treats: l }) });
      }
      return rpc.call(this, fn, args);
    };
    client.__ccoTreats = true;
    return client;
  }
  function hook() {
    var sb = win.supabase; if (!sb || !sb.createClient || sb.createClient.__ccoTreats) return !!(sb && sb.createClient && sb.createClient.__ccoTreats);
    var orig = sb.createClient;
    var made = function () { return wrap(orig.apply(this, arguments)); };
    made.__ccoTreats = true; made.__orig = orig;
    sb.createClient = made;
    own = orig(URL, KEY, { auth: { persistSession: false } });
    return true;
  }
  if (win.__ccoMock) wrap(win.__ccoMock); else if (!hook()) warn('supabase-js was not ready, so treats are off', null);
  function db() { return win.__ccoMock || own; }

  // ---------- the treats on the last step ----------
  function load() {
    var c = db(); if (!c) return;
    c.rpc('get_seasonal_menu', { p_channel: 'website' }).then(function (r) {
      if (r && !r.error && r.data && r.data.ok) { menu = r.data; loadCart(); schedule(); }
    }, function (e) { warn('menu', e); });
  }
  function style() {
    if (doc.getElementById('cco-treats-style')) return;
    var s = doc.createElement('style'); s.id = 'cco-treats-style';
    s.textContent = [
      '#cc-cake-order .cco-tr{border:1px solid #e4e0da;border-radius:16px;background:#fff;padding:18px 18px 8px;margin:0 0 16px}',
      '#cc-cake-order .cco-tr h3{margin:0;font:700 20px/1.25 Causten,"Figtree",Arial,sans-serif;color:#282720;letter-spacing:-.01em}',
      '#cc-cake-order .cco-tr-sub{margin:4px 0 6px;color:#5a554d;font-size:15px;line-height:1.5}',
      '#cc-cake-order .cco-tr-it{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid #efece7}',
      '#cc-cake-order .cco-tr-it:first-of-type{border-top:0}',
      '#cc-cake-order .cco-tr-ph{width:72px;height:72px;border-radius:12px;object-fit:cover;background:#f7f5f1;flex:none}',
      '#cc-cake-order .cco-tr-tx{flex:1 1 auto;min-width:0}',
      '#cc-cake-order .cco-tr-tx b{display:block;color:#282720;font-size:16px}',
      '#cc-cake-order .cco-tr-tx small{display:block;color:#69635b;font-size:14px;line-height:1.4}',
      '#cc-cake-order .cco-tr-tx em{display:block;font-style:normal;color:#9a4b12;font-size:14px;font-weight:600}',
      '#cc-cake-order .cco-tr-pr{font-weight:700;color:#282720;flex:none}',
      '#cc-cake-order .cco-tr-st{display:flex;align-items:center;gap:6px;flex:none}',
      '#cc-cake-order .cco-tr-st button{width:48px;height:48px;border-radius:12px;border:1px solid #cfc9bf;background:#fff;color:#282720;font-size:22px;line-height:1;cursor:pointer}',
      '#cc-cake-order .cco-tr-st button:hover:not(:disabled){border-color:#526f43;background:#f4f7f1}',
      '#cc-cake-order .cco-tr-st button:focus-visible{outline:3px solid #526f43;outline-offset:2px}',
      '#cc-cake-order .cco-tr-st button:disabled{opacity:.35;cursor:not-allowed}',
      '#cc-cake-order .cco-tr-st output{min-width:24px;text-align:center;font-weight:700;color:#282720}',
      '#cc-cake-order .cco-tr-it.is-off .cco-tr-ph,#cc-cake-order .cco-tr-it.is-off .cco-tr-tx b{opacity:.55}',
      '#cc-cake-order .cco-tr-sum{display:flex;justify-content:space-between;gap:12px;padding:12px 0 10px;border-top:1px solid #e4e0da;color:#46403a}',
      '#cc-cake-order .cco-tr-sum b{color:#282720}',
      '#cc-cake-order .cco-tr-note{color:#9a4b12;font-weight:600;font-size:14px;margin:6px 0}',
      '#cc-cake-order .cco-tr-done{border:1px solid #cad7c1;background:#f4f7f1;border-radius:14px;padding:14px 16px;margin:14px 0;color:#3f5d34}',
      '@media(max-width:520px){#cc-cake-order .cco-tr{padding:14px 14px 6px}#cc-cake-order .cco-tr-it{flex-wrap:wrap}#cc-cake-order .cco-tr-ph{width:56px;height:56px}#cc-cake-order .cco-tr-tx{flex-basis:calc(100% - 70px)}#cc-cake-order .cco-tr-st{margin-left:auto}}',
      '@media(prefers-reduced-motion:reduce){#cc-cake-order .cco-tr *{transition:none!important}}'
    ].join('\n');
    doc.head.appendChild(s);
  }
  var PAY = { pickup: 'Pay for them when you collect your cake.', deposit: 'We confirm them with your cake. A deposit secures your order.', full: 'We confirm them with your cake. Full payment secures your order.' };
  function html() {
    var date = pickDate(), groups = (menu && menu.groups) || [], h = '';
    groups.forEach(function (g) {
      h += '<h3>' + esc('Add ' + g.name.toLowerCase().replace(/^./, function (c) { return c; })) + '</h3>' +
        '<p class="cco-tr-sub">' + esc([g.message, PAY[g.payment]].filter(Boolean).join(' ')) + '</p>';
      (g.items || []).forEach(function (it) {
        var q = cart[it.id] || 0, w = why(it, date), mx = it.max || 20;
        h += '<div class="cco-tr-it' + (w && !q ? ' is-off' : '') + '">' + (it.image ? '<img class="cco-tr-ph" src="' + esc(it.image) + '" alt="' + esc(it.name) + '" loading="lazy">' : '<span class="cco-tr-ph" aria-hidden="true"></span>') +
          '<div class="cco-tr-tx"><b>' + esc(it.name) + '</b>' + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + (w ? '<em>' + esc(w) + '</em>' : '') + '</div>' +
          '<span class="cco-tr-pr">' + money(it.price) + '</span>' +
          '<div class="cco-tr-st"><button type="button" data-cco-tr-minus="' + esc(it.id) + '" aria-label="Remove one ' + esc(it.name) + '"' + (q ? '' : ' disabled') + '>−</button>' +
          '<output aria-live="polite" aria-label="' + esc(it.name) + ' quantity">' + q + '</output>' +
          '<button type="button" data-cco-tr-plus="' + esc(it.id) + '" aria-label="Add one ' + esc(it.name) + '"' + (w || q >= mx ? ' disabled' : '') + '>+</button></div></div>';
      });
    });
    if (removedNote) h += '<p class="cco-tr-note" role="status">' + esc(removedNote) + '</p>';
    var t = total();
    h += '<div class="cco-tr-sum"><span>' + (t ? 'Treats added' : 'No treats added') + '</span><b>' + money(t) + '</b></div>';
    return h;
  }
  // Keep only treats that can still be collected on the chosen day
  function tidy() {
    var date = pickDate(), gone = [];
    Object.keys(cart).forEach(function (k) { var it = byId(k); if (cart[k] > 0 && (!it || why(it, date))) { gone.push(it ? it.name : 'An item'); delete cart[k]; } });
    if (gone.length) { removedNote = gone.join(', ') + (gone.length > 1 ? ' are' : ' is') + ' not available for your pickup day, so we took ' + (gone.length > 1 ? 'them' : 'it') + ' off.'; saveCart(); }
  }
  function totalLine(root) {
    var tot = root.querySelector('.cco-total'), t = total(), line = root.querySelector('.cco-tr-total');
    if (!t) { if (line) line.remove(); return; }
    if (!tot) return;
    var cake = null, s = tot.querySelector(':scope > strong') || tot.querySelector('.cco-price strong');
    if (s) cake = Number(String(s.textContent).replace(/[^\d.]/g, ''));
    var txt = cake ? '<span>Total with treats</span><b>' + money(cake + t) + '</b>' : '<span>Treats</span><b>' + money(t) + '</b>';
    if (!line) { line = doc.createElement('div'); line.className = 'cco-tr-sum cco-tr-total'; tot.parentNode.insertBefore(line, tot.nextSibling); }
    if (line.innerHTML !== txt) line.innerHTML = txt;
  }
  function run() {
    var root = rootEl || (rootEl = doc.getElementById('cc-cake-order')); if (!root) return;
    var done = root.querySelector('.cco-done');
    if (done) {
      if (lastSent && !done.querySelector('.cco-tr-done')) {
        var box = doc.createElement('div'); box.className = 'cco-tr-done';
        box.textContent = 'Also on your request: ' + lastSent.map(function (l) { return l.quantity + ' × ' + l.name; }).join(', ') + ' (' + money(lastSent.reduce(function (s, l) { return s + l.price * l.quantity; }, 0)) + ').';
        var after = done.querySelector('.cco-done-cake'); if (after) after.parentNode.insertBefore(box, after.nextSibling);
        clearCart();
      }
      return;
    }
    if (!menu || !items().length || !root.classList.contains('cco-at-review')) return;
    var send = root.querySelector('[data-act="send"]'); if (!send) return;
    var sec = root.querySelector('.cco-tr');
    tidy();
    var h = html();
    if (!sec) {
      sec = doc.createElement('section'); sec.className = 'cco-tr'; sec.setAttribute('aria-label', 'Add treats');
      var at = root.querySelector('.cco-total'); at = at ? at.parentNode === send.parentNode ? at : null : null;
      send.parentNode.insertBefore(sec, at || send);
    }
    if (sec.getAttribute('data-h') !== h) {
      var keep = doc.activeElement && sec.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-cco-tr-plus') ? '[data-cco-tr-plus="' + doc.activeElement.getAttribute('data-cco-tr-plus') + '"]' : '[data-cco-tr-minus="' + doc.activeElement.getAttribute('data-cco-tr-minus') + '"]' : null;
      sec.innerHTML = h; sec.setAttribute('data-h', h);
      var f = keep && sec.querySelector(keep); if (f) { if (f.disabled) { var o = f.parentNode.querySelector('button:not(:disabled)'); if (o) o.focus({ preventScroll: true }); } else f.focus({ preventScroll: true }); }
    }
    totalLine(root);
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { run(); } catch (e) { warn('show', e); } }); }
  function onClick(e) {
    var b = e.target && e.target.closest && e.target.closest('[data-cco-tr-plus],[data-cco-tr-minus]'); if (!b) return;
    var id = b.getAttribute('data-cco-tr-plus') || b.getAttribute('data-cco-tr-minus'), it = byId(id); if (!it) return;
    var q = cart[id] || 0;
    if (b.hasAttribute('data-cco-tr-plus')) { if (!why(it, pickDate()) && q < (it.max || 20)) q++; } else q = Math.max(0, q - 1);
    if (q) cart[id] = q; else delete cart[id];
    removedNote = null; saveCart(); schedule();
  }
  function start() {
    var root = doc.getElementById('cc-cake-order'); if (!root) return;
    rootEl = root; style(); load();
    new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) { var t = list[i].target; if (t.closest && t.closest('.cco-tr')) continue; return schedule(); } }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    root.addEventListener('click', onClick);
  }
  win.__ccoSeasonal = { cart: function () { return cart; }, menu: function () { return menu; } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
