/* Corner Café Service Hub: Seasonal items (festive treats and other limited-time items), 26 October 2026. Step 1.
 * Roneel: "special limited time items we punch in and upload in the back end and it automatically appears on the
 * website order form" ... "I want to set up everything, so give me the options that I can set manually".
 *  1. Settings > Seasonal items (managers): add, change, switch On or Off, reorder and remove items; photo, price,
 *     size or pack line, heading, where it shows (website and counter, or counter only), on-sale dates, pickup dates,
 *     days of notice, daily limit, most per order, blocked pickup days. Heading settings: name, website message,
 *     how customers pay. Copy a heading for next year. "What's booked" lists treats by pickup day for the kitchen.
 *  2. New order at the counter, Finish order: "Festive treats" row with Add treats. Treats are held on the server
 *     under the order's own save key and saved with the order, or not at all (staff_create_order checks them).
 *     "Paid in full" covers the treats too. The save button shows the total with treats.
 *  3. An open order: "Festive treats" with Add or Change treats (staff_set_order_treats); the total is updated.
 * Every price and rule is checked by the database. The kitchen slip prints the treats first in the notes.
 * If anything here fails, the app works exactly as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccSeasonal20261026) return;
  win.__ccSeasonal20261026 = true;

  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', TZ = 'Pacific/Fiji';
  var BUCKET = 'cake-menu';
  var client = null;
  function db() {
    if (client) return client;
    if (win.__ccsMock) return (client = win.__ccsMock);
    if (!win.supabase || !win.supabase.createClient) return null;
    client = win.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
  function rpc(fn, args) {
    var c = db(); if (!c) return Promise.reject(new Error('offline'));
    return c.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function warn(w, e) { try { console.warn('[Seasonal items] ' + w, e); } catch (_) {} }
  function money(n) { n = Number(n || 0); return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n))); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(iso, long) { if (!iso) return ''; var d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC' }); }
  function app() { return win.__ccsOf || null; }
  function draft() { try { var a = app(); return a && a.V ? a.V() : null; } catch (_) { return null; } }
  function root() { return doc.getElementById('cc-staff'); }
  function toast(m) { try { var a = app(); if (a && a.toast) return a.toast(m); } catch (_) {} }
  function errText(e) { var m = String((e && (e.message || e)) || ''); return /fetch|network|offline/i.test(m) ? 'No internet connection. Try again when connected.' : 'That did not work. Try again.'; }
  function openOrder(id) {
    var host = doc.getElementById('ccs-sheet') || root(); if (!host || !id) return;
    var b = doc.createElement('button'); b.type = 'button'; b.hidden = true; b.setAttribute('data-act', 'open-order'); b.setAttribute('data-id', id);
    host.appendChild(b); b.click(); b.remove();
  }

  // ---------- the menu for the counter (what is on sale now) ----------
  var menu = null, menuAt = 0, menuLoading = null;
  function loadMenu(force) {
    if (menuLoading) return menuLoading;
    if (menu && !force && Date.now() - menuAt < 60000) return Promise.resolve(menu);
    menuLoading = rpc('get_seasonal_menu', { p_channel: 'counter' }).then(function (d) {
      menuLoading = null; menu = d && d.ok ? d : { groups: [] }; menuAt = Date.now(); schedule(); return menu;
    }, function (e) { menuLoading = null; warn('menu', e); return menu || { groups: [] }; });
    return menuLoading;
  }
  function items() { var out = []; ((menu && menu.groups) || []).forEach(function (g) { (g.items || []).forEach(function (i) { out.push(Object.assign({ group: g.name }, i)); }); }); return out; }
  function itemById(id) { return items().filter(function (i) { return i.id === id; })[0] || null; }
  // Why an item cannot be added for a pickup day (null when it can), and the most that can be added
  function why(it, date, rush) {
    if (!date) return null;
    if (it.pickup_from && date < it.pickup_from) return 'Pickup from ' + nice(it.pickup_from);
    if (it.pickup_to && date > it.pickup_to) return 'Pickup until ' + nice(it.pickup_to);
    if ((it.blocked || []).indexOf(date) > -1) return 'Not available on this day';
    if ((it.sold_out || []).indexOf(date) > -1) return 'Sold out for this day';
    if (!rush && it.lead_days && date < addDays(today(), it.lead_days)) return 'Needs ' + it.lead_days + (it.lead_days === 1 ? " day's" : " days'") + ' notice';
    return null;
  }
  function most(it, date, have) {
    var m = it.max || 99;
    if (it.limit && it.left && date && it.left[date] != null) m = Math.min(m, Math.max(0, it.left[date]) + (have || 0));
    else if (it.limit && date) m = Math.min(m, it.limit);
    return m;
  }

  // ---------- styles ----------
  function ensureStyle() {
    if (doc.getElementById('cc-seasonal-style')) return;
    var s = doc.createElement('style'); s.id = 'cc-seasonal-style';
    s.textContent = [
      '#cc-staff .cc-sz-row{order:1;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid #DCE3EB;border-radius:12px;background:#fff;padding:12px 14px}',
      '#cc-staff .cc-sz-row .cc-sz-k{display:block;font-weight:700;color:#1D2939}',
      '#cc-staff .cc-sz-row .cc-sz-v{display:block;color:#344054;line-height:1.4}',
      '#cc-staff .cc-sz-row .cc-sz-tot{display:block;color:#1D2939;margin-top:4px}',
      '#cc-staff .cc-sz-row .ccs-btn{flex:none}',
      '#cc-staff .cc-sz-err{color:#B42318;font-weight:600;margin:6px 0 0;flex-basis:100%}',
      '#ccs-sheet .cc-sz-order{border:1px solid #DCE3EB;border-radius:12px;background:#fff;padding:12px 14px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '#ccs-sheet .cc-sz-order b{display:block;color:#1D2939}#ccs-sheet .cc-sz-order span{color:#344054;line-height:1.4}',
      '#ccs-sheet .cc-sz-note{flex-basis:100%;margin:6px 0 0;color:#B54708;font-weight:600}',
      '#ccs-main .cc-ss{border:1px solid #E4E7EC;border-radius:14px;background:#fff;padding:18px 20px;margin:0 0 18px}',
      '#ccs-main .cc-ss h3{margin:0;font-size:20px;color:#1D2939}#ccs-main .cc-ss-head p{margin:4px 0 14px;color:#475467;font-size:14px}',
      '#ccs-main .cc-ss h4{margin:0 0 10px;font-size:15px;color:#344054}',
      '#ccs-main .cc-ss-empty{color:#475467;margin:0}',
      '#ccs-main .cc-ss-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 16px}',
      '#ccs-main .cc-ss-kpi{border:1px solid #E4E7EC;border-radius:12px;padding:12px 14px}',
      '#ccs-main .cc-ss-kpi span{display:block;font-size:13px;color:#475467}#ccs-main .cc-ss-kpi b{display:block;font-size:26px;line-height:1.2;color:#1D2939;font-variant-numeric:tabular-nums}',
      '#ccs-main .cc-ss-kpi small{display:block;font-size:12px;color:#475467;margin-top:2px}',
      '#ccs-main .cc-ss-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px}',
      '#ccs-main .cc-ss-box{border:1px solid #E4E7EC;border-radius:12px;padding:14px 16px}',
      '#ccs-main .cc-ss-bar{display:grid;grid-template-columns:minmax(0,9em) minmax(0,1fr) auto;gap:10px;align-items:center;padding:5px 0;font-size:14px;color:#344054}',
      '#ccs-main .cc-ss-bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#ccs-main .cc-ss-bt{background:#F2F4F7;border-radius:4px;height:12px}',
      '#ccs-main .cc-ss-bt i{display:block;height:100%;border-radius:4px;background:#15803D}#ccs-main .cc-ss-bv{font-variant-numeric:tabular-nums;white-space:nowrap}#ccs-main .cc-ss-bv b{color:#1D2939}',
      '#ccs-main .cc-ss-split{display:flex;height:14px;border-radius:7px;overflow:hidden;background:#F2F4F7}',
      '#ccs-main .cc-ss i.is-web{background:#31597A}#ccs-main .cc-ss i.is-cnt{background:#C4862B}#ccs-main .cc-ss i.is-cl{background:#15803D}#ccs-main .cc-ss i.is-bk{background:#A6D9B4}',
      '#ccs-main .cc-ss-leg{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:8px;font-size:13px;color:#475467}#ccs-main .cc-ss-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}',
      '#ccs-main .cc-ss-cols{display:flex;gap:6px;align-items:flex-end;height:150px;border-bottom:1px solid #E4E7EC;padding-top:18px}',
      '#ccs-main .cc-ss-col{flex:1 1 0;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}',
      '#ccs-main .cc-ss-col i{display:block;width:100%;max-width:34px}#ccs-main .cc-ss-col i.is-bk{border-radius:5px 5px 0 0}',
      '#ccs-main .cc-ss-col em{position:absolute;bottom:-20px;font-style:normal;font-size:11px;color:#475467;white-space:nowrap}',
      '#ccs-main .cc-ss-cv{font-size:11px;color:#344054;margin-bottom:2px;white-space:nowrap}',
      '#ccs-main .cc-ss-box .cc-ss-cols{margin-bottom:24px}',
      '@media (hover:none) and (pointer:coarse){#ccs-main .cc-ss-head p,#ccs-main .cc-ss-bar,#ccs-main .cc-ss-leg,#ccs-main .cc-ss-kpi span,#ccs-main .cc-ss-kpi small{font-size:17px}#ccs-main .cc-ss h3{font-size:24px}#ccs-main .cc-ss h4{font-size:18px}}',
      '@media (max-width:1000px){#ccs-main .cc-ss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#ccs-main .cc-ss-grid{grid-template-columns:1fr}}',
      '@media (max-width:759px){#ccs-main .cc-ss{padding:14px}#ccs-main .cc-ss-kpi b{font-size:22px}#ccs-main .cc-ss-head p,#ccs-main .cc-ss-bar,#ccs-main .cc-ss-leg,#ccs-main .cc-ss-kpi span,#ccs-main .cc-ss-kpi small{font-size:16px}#ccs-main .cc-ss h3{font-size:21px}#ccs-main .cc-ss-col em{font-size:10px}#ccs-main .cc-ss-cv{display:none}}',
      /* enterprise manager (inline in Settings, or full screen on phones) */
      '#cc-staff .cc-szx{font-size:16px;color:#344054;container-type:inline-size}',
      '#cc-staff .cc-szx-lead{margin:0 0 14px;color:#475467}',
      '#cc-staff .cc-szx-top h2{margin:0;font-size:24px;color:#1D2939}#cc-staff .cc-szx-top p{margin:4px 0 16px;color:#475467}',
      '#cc-staff .cc-szx-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 12px}',
      '#cc-staff .cc-szx-kpi{border:1px solid #E4E7EC;border-radius:12px;padding:12px 14px;background:#fff}',
      '#cc-staff .cc-szx-kpi span{display:block;font-size:13px;color:#475467}#cc-staff .cc-szx-kpi b{display:block;font-size:26px;line-height:1.2;color:#1D2939;font-variant-numeric:tabular-nums}#cc-staff .cc-szx-kpi small{display:block;font-size:12px;color:#475467}',
      '#cc-staff .cc-szx-att{display:block;width:100%;text-align:left;border:1px solid #FEC84B;border-left:6px solid #F79009;background:#FFFCF5;border-radius:12px;padding:12px 14px;margin:0 0 14px;color:#344054;font:inherit;cursor:pointer;min-height:48px}',
      '#cc-staff .cc-szx-att b{color:#93370D}',
      '#cc-staff .cc-szx-tools{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}',
      '#cc-staff .cc-szx-n{display:inline-block;min-width:22px;padding:0 6px;border-radius:999px;background:#F2F4F7;color:#344054;font-size:13px;margin-left:4px}',
      '#cc-staff .cc-szx-bulk{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#1E3A5F;color:#fff;border-radius:12px;padding:10px 14px;margin:0 0 12px}',
      '#cc-staff .cc-szx-bulk b{margin-right:6px}#cc-staff .cc-szx-bulk .ccs-btn{min-height:44px}#cc-staff .cc-szx-bulk .ccs-link{color:#fff}',
      '#cc-staff .cc-szx-bulkform{border:1px solid #B2CCFF;background:#F5F8FF;border-radius:12px;padding:14px 16px;margin:0 0 14px}#cc-staff .cc-szx-bulkform h4{margin:0}',
      '#cc-staff .cc-szx-list{container-type:inline-size}',
      '#cc-staff .cc-szx-row{display:grid;grid-template-columns:28px 52px minmax(0,1.6fr) 64px minmax(0,1.6fr) 48px 92px auto;gap:12px;align-items:center;padding:12px 16px;border-top:1px solid #EAECF0}',
      '#cc-staff .cc-szx-row.is-sel{background:#F5F8FF}',
      '#cc-staff .cc-szx-hd{border-top:0;padding-top:10px;padding-bottom:6px;font-size:13px;font-weight:600;color:#475467;text-transform:uppercase;letter-spacing:.04em}',
      '#cc-staff .cc-szx-ck{width:22px;height:22px;accent-color:#1E3A5F}',
      '#cc-staff .cc-szx-row .cc-sz-ph{width:52px;height:52px}',
      '#cc-staff .cc-szx-noph{display:flex;align-items:center;justify-content:center;font-size:11px;color:#98A2B3;text-align:center;line-height:1.1}',
      '#cc-staff .cc-szx-item b{display:block;color:#1D2939}#cc-staff .cc-szx-item small{display:block;color:#475467}',
      '#cc-staff .cc-szx-pills{display:flex;flex-wrap:wrap;gap:0 4px}',
      '#cc-staff .cc-szm-pill.is-att{background:#FFFAEB;color:#B54708}',
      '#cc-staff .cc-szx-price{font-weight:700;color:#1D2939;font-variant-numeric:tabular-nums}',
      '#cc-staff .cc-szx-av span{display:block;font-size:14px;line-height:1.4;color:#475467}',
      '#cc-staff .cc-szx-sold{font-variant-numeric:tabular-nums;font-weight:600;color:#1D2939;text-align:center}',
      '#cc-staff .cc-szx-acts{display:flex;align-items:center;gap:8px}#cc-staff .cc-szx-acts .cc-szm-mv{flex-direction:column}',
      '@container (max-width:860px){#cc-staff .cc-szx-hd{display:none}#cc-staff .cc-szx-row{grid-template-columns:28px 52px minmax(0,1fr) auto;grid-template-areas:"ck ph it pr" "ck ph av av" "ck ph so so" ". . sw ac";row-gap:6px}',
      '#cc-staff .cc-szx-row>:nth-child(1){grid-area:ck}#cc-staff .cc-szx-row>:nth-child(2){grid-area:ph}#cc-staff .cc-szx-row>:nth-child(3){grid-area:it}#cc-staff .cc-szx-row>:nth-child(4){grid-area:pr}',
      '#cc-staff .cc-szx-row>:nth-child(5){grid-area:av}#cc-staff .cc-szx-row>:nth-child(6){grid-area:so;text-align:left;font-weight:400}#cc-staff .cc-szx-row>:nth-child(6)::before{content:"Sold: "}',
      '#cc-staff .cc-szx-row>:nth-child(7){grid-area:sw}#cc-staff .cc-szx-row>:nth-child(8){grid-area:ac;justify-self:end}}',
      '#cc-staff .cc-szx-day{border:1px solid #E4E7EC;border-radius:12px;padding:12px 16px;margin:0 0 12px}',
      '#cc-staff .cc-szx-day h4{display:flex;justify-content:space-between;margin:0 0 8px;font-size:18px;color:#1D2939}#cc-staff .cc-szx-day h4 span{font-weight:400;color:#475467;font-size:15px}',
      '#cc-staff .cc-szx-dr{display:grid;grid-template-columns:minmax(0,1fr) minmax(80px,1.2fr) auto;gap:12px;align-items:center;padding:6px 0;border-top:1px solid #F2F4F7}',
      '#cc-staff .cc-szx-db{height:10px;border-radius:5px;background:#F2F4F7;overflow:hidden}#cc-staff .cc-szx-db.is-none{background:none}',
      '#cc-staff .cc-szx-db i{display:block;height:100%;background:#15803D}#cc-staff .cc-szx-db i.is-near{background:#F79009}#cc-staff .cc-szx-db i.is-full{background:#D92D20}',
      '#cc-staff .cc-szx-dr b{font-variant-numeric:tabular-nums;color:#1D2939;white-space:nowrap}',
      '#cc-staff .cc-szx-edhead{margin:0 0 12px}#cc-staff .cc-szx-edhead h3{margin:6px 0 0;font-size:22px;color:#1D2939}',
      '#cc-staff .cc-szx-ed{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:start}',
      '#cc-staff .cc-szx-fs{border:1px solid #E4E7EC;border-radius:12px;padding:14px 16px;margin:0 0 12px;background:#fff}',
      '#cc-staff .cc-szx-fs h4{margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:#475467}',
      '#cc-staff .cc-szx-preview{position:sticky;top:12px;border:1px solid #E4E7EC;border-radius:12px;padding:14px;background:#F8FAFC}',
      '#cc-staff .cc-szx-pk{margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#475467}#cc-staff .cc-szx-pk:not(:first-child){margin-top:14px}',
      '#cc-staff .cc-szx-pv{display:flex;flex-direction:column;gap:4px;background:#fff;border:1px solid #e4e0da;border-radius:14px;padding:8px 8px 10px;font-family:Causten,"Figtree",Arial,sans-serif}',
      '#cc-staff .cc-szx-pvph{display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;border-radius:10px;background:#f1eee9 center/cover no-repeat;color:#98A2B3;font-size:13px}',
      '#cc-staff .cc-szx-pv b{color:#282720;font-size:15px}#cc-staff .cc-szx-pv small{color:#69635b;font-size:13px}#cc-staff .cc-szx-pvpr{font-weight:700;color:#282720}',
      '#cc-staff .cc-szx-pvadd{display:flex;align-items:center;justify-content:center;min-height:40px;border:1px solid #526f43;border-radius:12px;color:#3f5d34;font-weight:700}',
      '#cc-staff .cc-szx-pvc{display:flex;justify-content:space-between;gap:8px;background:#fff;border:1px solid #E4E7EC;border-radius:10px;padding:10px 12px}#cc-staff .cc-szx-pvc b{color:#1D2939}',
      '#cc-staff .cc-szx-pvs{background:#fff;border:1px dashed #98A2B3;border-radius:8px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#1D2939}',
      '#cc-staff .cc-szx-hist{border:1px solid #E4E7EC;border-radius:12px;padding:14px 16px;margin:0 0 12px}#cc-staff .cc-szx-hist h4{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:#475467}',
      '#cc-staff .cc-szx-hist ol{list-style:none;margin:0;padding:0}#cc-staff .cc-szx-hist li{padding:6px 0;border-top:1px solid #F2F4F7;color:#344054}#cc-staff .cc-szx-hist li:first-child{border-top:0}',
      '#cc-staff .cc-szx-hist li span{display:block;font-size:13px;color:#475467}',
      '#cc-staff .cc-szx-savebar{position:sticky;bottom:0;z-index:3;display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:#fff;border-top:1px solid #E4E7EC;padding:12px 0;margin-top:8px}',
      '@media (hover:none) and (pointer:coarse){#cc-staff .cc-szx{font-size:20px}#cc-staff .cc-szx-kpi span,#cc-staff .cc-szx-kpi small,#cc-staff .cc-szx-av span,#cc-staff .cc-szx-hist li span,#cc-staff .cc-szx-hd,#cc-staff .cc-szx-n{font-size:17px}',
      '#cc-staff .cc-szx-top h2{font-size:32px}#cc-staff .cc-szx-edhead h3{font-size:24px}#cc-staff .cc-szx .ccs-btn,#cc-staff .cc-szx-att{min-height:56px}#cc-staff .cc-szx-ck{width:28px;height:28px}#cc-staff .cc-szx .ccs-input{min-height:56px;font-size:20px}#cc-staff .cc-szx .ccs-label{font-size:18px}',
      '#cc-staff .cc-szx-row{grid-template-columns:36px 56px minmax(0,1.6fr) 70px minmax(0,1.6fr) 52px 100px auto}}',

      '@media (max-width:759px){#cc-staff .cc-szx{font-size:18px}#cc-staff .cc-szx-kpi span,#cc-staff .cc-szx-kpi small,#cc-staff .cc-szx-av span,#cc-staff .cc-szx-hist li span,#cc-staff .cc-szx-n{font-size:16px}#cc-staff .cc-szx-kpi b{font-size:22px}',
      '#cc-staff .cc-szx .ccs-btn{min-height:48px}#cc-staff .cc-szx-row{padding:12px}#cc-staff .cc-szx-savebar{padding:10px 0 calc(10px + env(safe-area-inset-bottom))}}',
      '@container (max-width:900px){#cc-staff .cc-szx-ed{grid-template-columns:1fr}#cc-staff .cc-szx-preview{position:static;display:grid;grid-template-columns:minmax(0,200px) minmax(0,1fr);gap:4px 16px}#cc-staff .cc-szx-preview .cc-szx-pk{grid-column:1/-1}}',
      '@container (max-width:640px){#cc-staff .cc-szx-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#cc-staff .cc-szx-preview{display:block}}',
      /* picker */
      '#cc-staff .cc-sz-layer{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center}',
      '#cc-staff .cc-sz-shade{position:absolute;inset:0;background:rgba(16,24,40,.45)}',
      '#cc-staff .cc-sz-box{position:relative;background:#fff;border-radius:16px;width:min(720px,calc(100vw - 32px));max-height:calc(100dvh - 48px);display:flex;flex-direction:column;box-shadow:0 24px 48px -12px rgba(16,24,40,.3)}',
      '#cc-staff .cc-sz-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 12px;border-bottom:1px solid #EAECF0}',
      '#cc-staff .cc-sz-hd h2{margin:0;font-size:24px;color:#1D2939}#cc-staff .cc-sz-hd p{margin:4px 0 0;color:#475467}',
      '#cc-staff .cc-sz-list{overflow:auto;padding:8px 20px;flex:1 1 auto}',
      '#cc-staff .cc-sz-gh{margin:12px 0 4px;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#475467}',
      '#cc-staff .cc-sz-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #F2F4F7}',
      '#cc-staff .cc-sz-item:first-of-type{border-top:0}',
      '#cc-staff .cc-sz-ph{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#F2F4F7;flex:none}',
      '#cc-staff .cc-sz-txt{flex:1 1 auto;min-width:0}#cc-staff .cc-sz-txt b{display:block;color:#1D2939}',
      '#cc-staff .cc-sz-txt small{display:block;color:#475467}#cc-staff .cc-sz-txt em{display:block;font-style:normal;color:#B54708;font-weight:600}',
      '#cc-staff .cc-sz-price{font-weight:700;color:#1D2939;flex:none;min-width:56px;text-align:right}',
      '#cc-staff .cc-sz-step{display:flex;align-items:center;gap:6px;flex:none}',
      '#cc-staff .cc-sz-step button{width:48px;height:48px;border-radius:12px;border:1px solid #98A2B3;background:#fff;color:#1D2939;font-size:24px;line-height:1;cursor:pointer}',
      '#cc-staff .cc-sz-step button:disabled{opacity:.35;cursor:not-allowed}',
      '#cc-staff .cc-sz-step output{min-width:28px;text-align:center;font-weight:700;font-size:20px;color:#1D2939}',
      '#cc-staff .cc-sz-item.is-off .cc-sz-ph,#cc-staff .cc-sz-item.is-off .cc-sz-txt b{opacity:.55}',
      '#cc-staff .cc-sz-ft{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px 16px;border-top:1px solid #EAECF0}',
      '#cc-staff .cc-sz-ft span{color:#344054}#cc-staff .cc-sz-ft b{color:#1D2939}',
      '#cc-staff .cc-sz-x{min-width:48px;min-height:48px;border-radius:12px;border:1px solid #D0D5DD;background:#fff;font-size:22px;cursor:pointer;color:#344054}',
      '#cc-staff .cc-sz-msg{color:#B42318;font-weight:600;margin:0 20px 8px}',
      /* manager screen */
      '#cc-staff .cc-szm{position:fixed;inset:0;z-index:2147482990;background:#fff;display:flex;flex-direction:column}',
      '#cc-staff .cc-szm-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:1px solid #EAECF0}',
      '#cc-staff .cc-szm-hd h2{margin:0;font-size:26px;color:#1D2939}',
      '#cc-staff .cc-szm-body{overflow:auto;flex:1 1 auto;padding:16px 24px 40px}',
      '#cc-staff .cc-szm-in{max-width:980px;margin:0 auto}',
      '#cc-staff .cc-szm-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}',
      '#cc-staff .cc-szm-g{border:1px solid #DCE3EB;border-radius:14px;margin:0 0 18px;overflow:hidden}',
      '#cc-staff .cc-szm-gh{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;background:#F8FAFC;border-bottom:1px solid #DCE3EB}',
      '#cc-staff .cc-szm-gh h3{margin:0;font-size:21px;color:#1D2939}#cc-staff .cc-szm-gh p{margin:2px 0 0;color:#475467}',
      '#cc-staff .cc-szm-gh .cc-szm-acts{display:flex;gap:8px;flex-wrap:wrap}',
      '#cc-staff .cc-szm-it{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid #EAECF0}',
      '#cc-staff .cc-szm-it:first-of-type{border-top:0}',
      '#cc-staff .cc-szm-it .cc-sz-txt small{color:#475467}',
      '#cc-staff .cc-szm-pill{display:inline-block;border-radius:999px;padding:2px 10px;font-size:15px;font-weight:600;margin:4px 6px 0 0}',
      '#cc-staff .cc-szm-pill.is-on{background:#ECFDF3;color:#067647}#cc-staff .cc-szm-pill.is-off{background:#F2F4F7;color:#475467}',
      '#cc-staff .cc-szm-pill.is-wait{background:#EFF8FF;color:#175CD3}#cc-staff .cc-szm-pill.is-counter{background:#FEF6EE;color:#B93815}',
      '#cc-staff .cc-szm-sw{min-height:48px;min-width:84px;border-radius:999px;border:1px solid #98A2B3;background:#fff;color:#344054;font-weight:700;cursor:pointer;padding:0 14px}',
      '#cc-staff .cc-szm-sw[aria-checked="true"]{background:#E8EEF7;border-color:#31597A;color:#1E3A5F}',
      '#cc-staff .cc-szm-gsw{min-width:132px}',
      '#cc-staff .cc-szm-gst{font-weight:600;margin-top:6px!important}#cc-staff .cc-szm-gst.is-on{color:#067647!important}#cc-staff .cc-szm-gst.is-off{color:#B54708!important}',
      '#cc-staff .cc-szm-g.is-goff .cc-szm-it{opacity:.6}',
      '#cc-staff .cc-szm-mv{display:flex;flex-direction:column;gap:4px}',
      '#cc-staff .cc-szm-mv button{width:44px;height:30px;border-radius:8px;border:1px solid #D0D5DD;background:#fff;cursor:pointer;color:#344054}',
      '#cc-staff .cc-szm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 20px}',
      '#cc-staff .cc-szm-form .cc-full{grid-column:1/-1}',
      '#cc-staff .cc-szm-form .ccs-hint{display:block;margin-top:4px}',
      '#cc-staff .cc-szm-photo{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
      '#cc-staff .cc-szm-photo img{width:96px;height:96px;border-radius:12px;object-fit:cover;background:#F2F4F7}',
      '#cc-staff .cc-szm-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:20px}',
      '#cc-staff .cc-szm-err{color:#B42318;font-weight:600;margin:12px 0 0}',
      '#cc-staff .cc-szm-ok{color:#067647;font-weight:600;margin:12px 0 0}',
      '#cc-staff .cc-szm-day{border:1px solid #DCE3EB;border-radius:12px;margin:0 0 12px;padding:12px 16px}',
      '#cc-staff .cc-szm-day h4{margin:0 0 6px;font-size:19px;color:#1D2939}',
      '#cc-staff .cc-szm-day div{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #F2F4F7;color:#344054}',
      '#cc-staff .cc-szm-day div:first-of-type{border-top:0}',
      '#cc-staff .cc-szm-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}',
      '#cc-staff .cc-szm-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #D0D5DD;border-radius:999px;padding:6px 6px 6px 12px;background:#fff;color:#344054}',
      '#cc-staff .cc-szm-chip button{border:0;background:#F2F4F7;border-radius:999px;width:32px;height:32px;cursor:pointer}',
      '#cc-staff .cc-szm-confirm{border:1px solid #FDA29B;background:#FEF3F2;border-radius:12px;padding:12px 14px;margin-top:12px}',
      '#cc-staff .cc-szm-confirm p{margin:0 0 8px;color:#912018}',
      '#cc-staff .cc-szm .ccs-red{color:#B42318}',
      '@media (hover:none) and (pointer:coarse){#cc-staff .cc-sz-box,#cc-staff .cc-szm,#cc-staff .cc-sz-row,#ccs-sheet .cc-sz-order{font-size:20px}',
      '#cc-staff .cc-sz-txt small,#cc-staff .cc-szm-pill,#cc-staff .cc-szm .ccs-hint{font-size:17px}',
      '#cc-staff .cc-sz-step button{width:56px;height:56px}#cc-staff .cc-szm-sw{min-height:56px}#cc-staff .cc-sz-x{min-width:54px;min-height:54px}',
      '#cc-staff .cc-szm .ccs-btn,#cc-staff .cc-sz-box .ccs-btn,#cc-staff .cc-sz-row .ccs-btn,#ccs-sheet .cc-sz-order .ccs-btn{min-height:56px}',
      '#cc-staff .cc-szm .ccs-input{min-height:56px;font-size:20px}#cc-staff .cc-szm .ccs-label{font-size:18px}#cc-staff .cc-szm-mv button{width:54px;height:40px}}',
      '@media (max-width:759px){#cc-staff .cc-sz-layer{align-items:flex-end}',
      '#cc-staff .cc-sz-box{width:100vw;max-height:92dvh;border-radius:16px 16px 0 0}',
      '#cc-staff .cc-sz-box,#cc-staff .cc-szm,#cc-staff .cc-sz-row,#ccs-sheet .cc-sz-order{font-size:18px}',
      '#cc-staff .cc-sz-txt small,#cc-staff .cc-szm-pill,#cc-staff .cc-szm .ccs-hint{font-size:16px}',
      '#cc-staff .cc-sz-hd h2{font-size:21px}#cc-staff .cc-szm-hd h2{font-size:21px}',
      '#cc-staff .cc-sz-step button{width:48px;height:48px}#cc-staff .cc-sz-ph{width:48px;height:48px}',
      '#cc-staff .cc-szm-hd,#cc-staff .cc-szm-body{padding-left:16px;padding-right:16px}',
      '#cc-staff .cc-szm-form{grid-template-columns:1fr}#cc-staff .cc-szm-it{flex-wrap:wrap}',
      '#cc-staff .cc-szm .ccs-btn,#cc-staff .cc-sz-box .ccs-btn,#cc-staff .cc-sz-row .ccs-btn{min-height:48px}#cc-staff .cc-szm .ccs-input{min-height:52px}',
      '#cc-staff .cc-sz-price{min-width:0}#cc-staff .cc-sz-item{flex-wrap:wrap}#cc-staff .cc-sz-txt{flex-basis:calc(100% - 64px)}#cc-staff .cc-sz-step{margin-left:auto}}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  // ---------- the treats picker (counter and open orders) ----------
  var pick = null;  // { title, date, rush, qty: {id: n}, onDone, msg }
  function pickerHtml() {
    var date = pick.date, total = 0, groups = (menu && menu.groups) || [];
    var h = '<div class="cc-sz-shade" data-cc-sz="close"></div><div class="cc-sz-box" role="document">' +
      '<div class="cc-sz-hd"><div><h2 id="cc-sz-title">' + esc(pick.title) + '</h2><p>' + (date ? 'For pickup ' + esc(nice(date, true)) : 'Choose the pickup day first') + '</p></div>' +
      '<button type="button" class="cc-sz-x" data-cc-sz="close" aria-label="Close">×</button></div><div class="cc-sz-list">';
    if (!groups.length) h += '<p class="ccs-hint">No seasonal items are on sale right now.</p>';
    groups.forEach(function (g) {
      h += '<h3 class="cc-sz-gh">' + esc(g.name) + '</h3>';
      (g.items || []).forEach(function (it) {
        var q = pick.qty[it.id] || 0, w = why(it, date, pick.rush), mx = most(it, date, pick.qty0 && pick.qty0[it.id]);
        if (q) total += q * Number(it.price);
        var left = it.limit && it.left && date && it.left[date] != null ? Math.max(0, it.left[date] + ((pick.qty0 && pick.qty0[it.id]) || 0)) : null;
        h += '<div class="cc-sz-item' + (w && !q ? ' is-off' : '') + '">' +
          (it.image ? '<img class="cc-sz-ph" src="' + esc(it.image) + '" alt="">' : '<span class="cc-sz-ph" aria-hidden="true"></span>') +
          '<div class="cc-sz-txt"><b>' + esc(it.name) + '</b>' + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') +
          (it.counter_only ? '<small>Counter only</small>' : '') + (w ? '<em>' + esc(w) + '</em>' : left != null ? '<small>' + left + ' left for this day</small>' : '') + '</div>' +
          '<span class="cc-sz-price">' + money(it.price) + '</span>' +
          '<div class="cc-sz-step"><button type="button" data-cc-sz-minus="' + esc(it.id) + '" aria-label="One less ' + esc(it.name) + '"' + (q ? '' : ' disabled') + '>−</button>' +
          '<output aria-live="polite" aria-label="' + esc(it.name) + ' quantity">' + q + '</output>' +
          '<button type="button" data-cc-sz-plus="' + esc(it.id) + '" aria-label="One more ' + esc(it.name) + '"' + (w || q >= mx ? ' disabled' : '') + '>+</button></div></div>';
      });
    });
    h += '</div>' + (pick.msg ? '<p class="cc-sz-msg" role="alert">' + esc(pick.msg) + '</p>' : '') +
      '<div class="cc-sz-ft"><span>Treats <b>' + money(total) + '</b></span><button type="button" class="ccs-btn" data-cc-sz="done"' + (pick.busy ? ' disabled' : '') + '>' + (pick.busy ? 'Saving…' : esc(pick.doneLabel || 'Done')) + '</button></div></div>';
    return h;
  }
  function drawPicker() {
    var r = root(); if (!r || !pick) return;
    var l = doc.getElementById('cc-sz-layer');
    if (!l) { l = doc.createElement('div'); l.id = 'cc-sz-layer'; l.className = 'cc-sz-layer'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-modal', 'true'); l.setAttribute('aria-labelledby', 'cc-sz-title'); r.appendChild(l); }
    var keep = doc.activeElement && l.contains(doc.activeElement) ? (doc.activeElement.getAttribute('data-cc-sz-plus') ? '[data-cc-sz-plus="' + doc.activeElement.getAttribute('data-cc-sz-plus') + '"]' : doc.activeElement.getAttribute('data-cc-sz-minus') ? '[data-cc-sz-minus="' + doc.activeElement.getAttribute('data-cc-sz-minus') + '"]' : null) : null;
    var sc = l.querySelector('.cc-sz-list'), top = sc ? sc.scrollTop : 0;
    l.innerHTML = pickerHtml();
    sc = l.querySelector('.cc-sz-list'); if (sc) sc.scrollTop = top;
    var f = keep && l.querySelector(keep); if (f && !f.disabled) f.focus(); else if (!keep && !l.contains(doc.activeElement)) { var x = l.querySelector('.cc-sz-x'); if (x) x.focus(); }
  }
  function openPicker(o) {
    pick = Object.assign({ qty: {}, msg: null, busy: false }, o);
    loadMenu(true).then(function () { if (pick) drawPicker(); });
    drawPicker();
  }
  function closePicker() { pick = null; var l = doc.getElementById('cc-sz-layer'); if (l) l.remove(); }
  function pickLines() { return Object.keys((pick && pick.qty) || {}).filter(function (k) { return pick.qty[k] > 0; }).map(function (k) { return { id: k, quantity: pick.qty[k] }; }); }

  // ---------- counter: Finish order ----------
  var cart = { key: null, qty: {}, staged: null, err: null };
  function cartLines() { return Object.keys(cart.qty).filter(function (k) { return cart.qty[k] > 0; }).map(function (k) { return { id: k, quantity: cart.qty[k] }; }); }
  function cartTotal() { return cartLines().reduce(function (s, l) { var it = itemById(l.id); return s + (it ? Number(it.price) * l.quantity : 0); }, 0); }
  function cartText() { return cartLines().map(function (l) { var it = itemById(l.id); return l.quantity + ' × ' + (it ? it.name : 'item'); }).join(', '); }
  function sig(D) { return JSON.stringify(cartLines()) + '|' + (D && D.payPlan === 'full'); }
  function syncKey(D) { if (!D) return; if (cart.key !== D.key) { cart = { key: D.key, qty: {}, staged: null, err: null }; } }
  function cakePrice() { try { var a = app(); var p = a && a.price ? a.price() : null; return p == null ? null : Number(p); } catch (_) { return null; } }
  function counterUi() {
    var step = doc.querySelector('#ccs-slipform #sl-st-7 .sl-stepbody');
    if (!step) return;
    var D = draft(); if (!D) return;
    syncKey(D);
    if (!menu) { loadMenu(); return; }
    var has = items().length, row = step.querySelector('.cc-sz-row');
    if (!has && !cartLines().length) { if (row) row.remove(); return; }
    var lines = cartLines(), t = cartTotal(), cake = cakePrice(), title = ((menu.groups[0] && menu.groups[0].name) || 'Seasonal treats');
    var html = '<div><span class="cc-sz-k">' + esc(title) + '</span><span class="cc-sz-v">' + (lines.length ? esc(cartText()) + ' · ' + money(t) : 'None added') + '</span>' +
      (lines.length && cake != null ? '<span class="cc-sz-tot">Cake ' + money(cake) + ' + treats ' + money(t) + ' = <b>' + money(cake + t) + ' total</b>' + (D.payPlan === 'full' ? '. Paid in full covers the treats too.' : '') + '</span>' : '') + '</div>' +
      '<button type="button" class="ccs-btn ccs-ghost" data-cc-sz="counter">' + (lines.length ? 'Change treats' : 'Add treats') + '</button>' +
      (cart.err ? '<p class="cc-sz-err" role="alert">' + esc(cart.err) + '</p>' : '');
    if (!row) {
      row = doc.createElement('section'); row.className = 'cc-sz-row'; row.setAttribute('aria-label', title);
      var tot = step.querySelector('.ccs-total');
      if (tot && tot.nextSibling) step.insertBefore(row, tot.nextSibling); else step.insertBefore(row, step.firstChild);
    }
    if (row.getAttribute('data-h') !== html) { row.innerHTML = html; row.setAttribute('data-h', html); }
    // The save button names the total including the treats
    if (lines.length && cake != null) {
      doc.querySelectorAll('#ccs-slipform [data-act="n-submit"]').forEach(function (b) {
        if (b.disabled) return;
        var txt = b.textContent, want = txt.replace(money(cake), money(cake + t));
        if (want !== txt && txt.indexOf(money(cake + t)) < 0) b.textContent = want;
      });
    }
  }
  function stageNow(D) {
    var s = sig(D);
    return rpc('staff_stage_treats', { p_key: D.key, p_lines: cartLines(), p_paid_full: D.payPlan === 'full' }).then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.message) || 'not staged');
      cart.staged = s; return true;
    });
  }
  var replaying = false;
  function onSubmitCapture(e) {
    if (replaying) return;
    var b = e.target && e.target.closest && e.target.closest('#ccs-slipform [data-act="n-submit"]'); if (!b || b.disabled) return;
    var D = draft(); if (!D) return;
    syncKey(D);
    var s = sig(D);
    if (!cartLines().length && cart.staged == null) return;       // no treats chosen, nothing held: the app saves as before
    if (cart.staged === s) return;                                  // the server already holds exactly these treats
    e.preventDefault(); e.stopImmediatePropagation();
    b.disabled = true; cart.err = null;
    stageNow(D).then(function () {
      b.disabled = false; replaying = true; try { b.click(); } finally { replaying = false; }
    }, function (er) {
      b.disabled = false; cart.err = 'The treats could not be added: ' + errText(er) + ' The order was not saved.'; schedule(); warn('stage', er);
    });
  }

  // ---------- open order: Festive treats ----------
  var sheetRef = null, sheetOrder = null, sheetBusy = false, sheetNote = null;
  function currentRef() {
    var h = doc.querySelector('#ccs-sheet .ccs-sheet-head'); if (!h) return null;
    var m = /(?:^|[^A-Z])((?:CC|H|W)-\d{3,6})(?!\d)/.exec(h.textContent || ''); return m ? m[1] : null;
  }
  function loadSheet(ref) {
    var c = db(); if (!c || sheetBusy) return;
    sheetBusy = true;
    c.from('orders').select('id,reference,order_status,required_date,final_total,estimate_total').eq('reference', ref).then(function (r) {
      var o = r && !r.error && (Array.isArray(r.data) ? r.data.filter(function (x) { return x.reference === ref; })[0] : r.data);
      if (!o) { sheetBusy = false; if (ref === sheetRef) sheetOrder = { none: true }; return; }
      return c.from('order_extras').select('item_id,name,detail,quantity,unit_price').eq('order_id', o.id).then(function (x) {
        sheetBusy = false;
        o.extras = (x && !x.error && Array.isArray(x.data)) ? x.data.filter(function (e) { return !e.order_id || e.order_id === o.id; }) : [];
        if (ref === sheetRef) { sheetOrder = o; schedule(); }
      });
    }).then(null, function (e) { sheetBusy = false; warn('order', e); });
  }
  function sheetUi() {
    var sheet = doc.getElementById('ccs-sheet'), ref = sheet && sheet.classList.contains('ccs-open') ? currentRef() : null;
    if (!ref) { sheetRef = null; sheetOrder = null; sheetNote = null; return; }
    if (ref !== sheetRef) { sheetRef = ref; sheetOrder = null; sheetNote = null; loadSheet(ref); if (!menu) loadMenu(); return; }
    if (!sheetOrder || sheetOrder.none || !menu) return;
    var o = sheetOrder, ex = o.extras || [], open = ['cancelled', 'declined', 'completed'].indexOf(o.order_status) < 0;
    var box = sheet.querySelector('.cc-sz-order');
    if (!ex.length && (!open || !items().length)) { if (box) box.remove(); return; }
    var tot = ex.reduce(function (s, e) { return s + Number(e.unit_price) * e.quantity; }, 0);
    var html = '<div><b>' + esc((menu.groups[0] && menu.groups[0].name) || 'Seasonal treats') + '</b><span>' +
      (ex.length ? esc(ex.map(function (e) { return e.quantity + ' × ' + e.name; }).join(', ')) + ' · ' + money(tot) : 'None on this order') + '</span></div>' +
      (open && canEdit() ? '<button type="button" class="ccs-btn ccs-ghost" data-cc-sz="order">' + (ex.length ? 'Change treats' : 'Add treats') + '</button>' : '') +
      (sheetNote ? '<p class="cc-sz-note" role="status">' + esc(sheetNote) + '</p>' : '');
    if (!box) {
      box = doc.createElement('section'); box.className = 'cc-sz-order'; box.setAttribute('aria-label', 'Treats on this order');
      var row = sheet.querySelector('.ccs-actions-row'), body = sheet.querySelector('.ccs-sheet-body') || sheet;
      if (row && row.parentNode) row.parentNode.insertBefore(box, row.nextSibling); else body.appendChild(box);
    }
    if (box.getAttribute('data-h') !== html) { box.innerHTML = html; box.setAttribute('data-h', html); }
  }
  function canEdit() { try { var a = app(); return !a || !a.can || a.can('ord.edit'); } catch (_) { return true; } }
  function saveOrderTreats() {
    var o = sheetOrder; if (!o || !pick) return;
    pick.busy = true; pick.msg = null; drawPicker();
    rpc('staff_set_order_treats', { p_order: o.id, p_lines: pickLines() }).then(function (d) {
      if (!d || !d.ok) { pick.busy = false; pick.msg = (d && d.message) || 'The treats were not changed.'; drawPicker(); return; }
      closePicker();
      var notes = [];
      if (Number(d.paid) > Number(d.total) + 0.005) notes.push('The customer has paid ' + money(Number(d.paid) - Number(d.total)) + ' more than the new total. A manager must decide on a refund.');
      if (d.printed) notes.push('Print the kitchen slip again so the kitchen sees the change.');
      toast('Treats updated. Order total ' + money(d.total));
      var id = o.id; sheetRef = null; sheetOrder = null;
      openOrder(id);
      setTimeout(function () { sheetNote = notes.join(' ') || null; schedule(); }, 900);
    }, function (e) { if (!pick) return; pick.busy = false; pick.msg = errText(e); drawPicker(); });
  }

  // ---------- Settings > Seasonal items (managers), enterprise layout (26 October 2026) ----------
  // Roneel: "make the seasonal items section enterprise level". Computers and tablets: it lives inside Settings like the
  // other sections. Phones: a full screen opened from Settings. Overview numbers, a filterable item table with
  // Needs attention checks, bulk On, Off and dates, an editor with a live preview and change history, and a day-by-day
  // booked view against each daily limit. Every save still goes through the same database checks.
  var M = null;  // manager state: { mode, view, filter, sel, data, edit, editGroup, bulk, msg, err, busy, hist }
  var setOn = false, summaryText = null;
  var FMT_T = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  function wide() { try { return win.matchMedia('(min-width: 760px)').matches; } catch (_) { return true; } }
  function settingsUi() {
    var main = doc.getElementById('ccs-main'), set = main && main.querySelector('.ccs-set');
    if (!set) return;
    var a = app(); if (a && a.can && !a.can('mgmt.settings')) return;
    var d = set.querySelector('details.cc-szm-entry');
    if (!d) {
      var after = [].slice.call(set.querySelectorAll(':scope > details')).filter(function (x) { var s = x.querySelector('summary'); return s && /^Cakes and prices/.test(s.textContent.trim()); })[0];
      d = doc.createElement('details'); d.className = 'cc-szm-entry';
      d.innerHTML = '<summary>Seasonal items <span class="cc-szm-sum">' + esc(summaryText || 'Festive treats and other limited-time items') + '</span></summary><div class="ccs-set-body"></div>';
      if (after && after.nextSibling) set.insertBefore(d, after.nextSibling); else set.appendChild(d);
    }
    var body = d.querySelector('.ccs-set-body'), fit = set.classList.contains('is-fit') && wide();
    if (fit) {
      if (!body.querySelector('.cc-szx')) {
        body.innerHTML = '';
        var host = doc.createElement('div'); host.className = 'cc-szx cc-szx-inline'; host.id = 'cc-szx-inline';
        guard(host); body.appendChild(host);
        if (!M || M.mode !== 'inline') M = mNew('inline');
        mLoad();
      }
    } else if (!body.querySelector('[data-cc-szm="open"]')) {
      body.innerHTML = '<p class="ccs-hint">Add items, prices and photos, set the dates, and switch them On. They appear on the website order form and at the counter by themselves, and print on the kitchen slip.</p>' +
        '<button type="button" class="ccs-btn" data-cc-szm="open">Open seasonal items</button>';
    }
    // The app builds the Settings side list before this section exists, so Seasonal items adds its own entry
    var nav = set.querySelector(':scope > .ccs-setnav');
    if (!nav) return;
    var mine = nav.querySelector('[data-setk="Seasonal items"]');
    if (!mine) {
      mine = doc.createElement('button'); mine.type = 'button'; mine.className = 'ccs-secbtn'; mine.setAttribute('role', 'tab');
      mine.setAttribute('data-setk', 'Seasonal items'); mine.setAttribute('data-cc-szm-tab', '1'); mine.textContent = 'Seasonal items';
      var prev = nav.querySelector('[data-setk="Cakes and prices"]');
      if (prev && prev.nextSibling) nav.insertBefore(mine, prev.nextSibling); else nav.appendChild(mine);
      nav.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-setk]'); if (!b) return;
        setOn = !!b.hasAttribute('data-cc-szm-tab'); showMine(set, nav);
      });
      var sm = d.querySelector('summary');
      if (sm) sm.addEventListener('click', function (e) { if (set.classList.contains('is-fit')) { e.preventDefault(); setOn = true; showMine(set, nav); } });
    }
    if (setOn) showMine(set, nav);
  }
  function showMine(set, nav) {
    var d = set.querySelector(':scope > details.cc-szm-entry'); if (!d) return;
    if (setOn) {
      [].forEach.call(set.querySelectorAll(':scope > details'), function (x) { x.classList.toggle('is-cur', x === d); });
      if (!d.open) d.open = true;
      [].forEach.call(nav.querySelectorAll('[data-setk]'), function (b) { b.setAttribute('aria-selected', String(b.hasAttribute('data-cc-szm-tab'))); });
    } else {
      d.classList.remove('is-cur');
      var me = nav.querySelector('[data-cc-szm-tab]'); if (me) me.setAttribute('aria-selected', 'false');
    }
  }
  // Typing in this section must not mark the app's own Settings as "Not saved yet", and keeps the draft safe
  function guard(host) {
    ['input', 'change'].forEach(function (ev) {
      host.addEventListener(ev, function (e) {
        e.stopPropagation();
        if (e.target && e.target.id === 'cc-szf-file' && e.target.files && e.target.files[0]) return upload(e.target.files[0]);
        if (M && M.edit) { grabItem(); if (M.edit) drawPreview(); }
        if (M && M.editGroup) grabGroup();
      });
    });
  }
  function mNew(mode) { return { mode: mode, view: 'items', filter: 'all', sel: {}, data: null, edit: null, editGroup: null, bulk: null, msg: null, err: null, busy: false }; }
  function mHost() {
    if (!M) return null;
    if (M.mode === 'inline') return doc.getElementById('cc-szx-inline');
    var l = doc.getElementById('cc-szm'); return l && l.querySelector('.cc-szx');
  }
  function mLoad() {
    if (!M) return;
    M.loading = true; mDraw();
    rpc('staff_seasonal_list').then(function (d) {
      if (!M) return;
      M.loading = false;
      if (!d || !d.ok) { M.err = (d && d.message) || 'Could not load seasonal items.'; return mDraw(); }
      M.data = d;
      Object.keys(M.sel).forEach(function (k) { if (!d.items.some(function (i) { return i.id === k; })) delete M.sel[k]; });
      mDraw();
      var on = d.items.filter(function (i) { return state(i, d)[1] === 'is-on'; }).length;
      summaryText = on + ' on sale now · ' + d.items.length + ' items';
      var s = doc.querySelector('.cc-szm-entry .cc-szm-sum'); if (s) s.textContent = summaryText;
      menu = null;
    }, function (e) { if (!M) return; M.loading = false; M.err = errText(e); mDraw(); });
  }
  function grp(d, id) { return d.groups.filter(function (g) { return g.id === id; })[0] || {}; }
  function status(i, t) {
    if (!i.active) return ['Switched off', 'is-off'];
    if (i.sale_from && i.sale_from > t) return ['Starts ' + nice(i.sale_from), 'is-wait'];
    if ((i.sale_to && i.sale_to < t) || (i.pickup_to && i.pickup_to < t)) return ['Finished', 'is-off'];
    return ['On sale now', 'is-on'];
  }
  function state(i, d) {
    if (grp(d, i.group_id).active === false) return i.active ? ['Section Off', 'is-off'] : ['Switched off', 'is-off'];
    return status(i, d.today);
  }
  // What needs a manager's attention on an item (empty when all is well)
  function issues(i, d) {
    var out = [], t = d.today, live = i.active && grp(d, i.group_id).active !== false;
    if (i.channel !== 'counter' && !i.image_url) out.push('No photo');
    if (live && !i.sale_to && !i.pickup_to) out.push('No end date');
    if (i.active && ((i.sale_to && i.sale_to < t) || (i.pickup_to && i.pickup_to < t))) out.push('On, but its dates have passed');
    if (i.active && grp(d, i.group_id).active === false) out.push('On, but the section is Off');
    if (i.daily_limit) {
      var near = d.booked.filter(function (b) { return b.item === i.id && b.quantity >= 0.8 * i.daily_limit; });
      if (near.length) out.push((near[0].quantity >= i.daily_limit ? 'Sold out ' : 'Nearly sold out ') + nice(near[0].day));
    }
    return out;
  }
  function bookedValue(d) { return d.booked.reduce(function (s, b) { var it = d.items.filter(function (i) { return i.id === b.item; })[0]; return s + (it ? Number(it.price) * b.quantity : 0); }, 0); }
  function mOpen() {
    M = mNew('overlay');
    var r = root(); if (!r) return;
    var l = doc.getElementById('cc-szm');
    if (!l) { l = doc.createElement('div'); l.id = 'cc-szm'; l.className = 'cc-szm'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-modal', 'true'); l.setAttribute('aria-labelledby', 'cc-szx-title');
      l.innerHTML = '<div class="cc-szm-hd"><h2 id="cc-szx-title">Seasonal items</h2><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="close">Close</button></div><div class="cc-szm-body"><div class="cc-szx"></div></div>';
      guard(l); r.appendChild(l); }
    mLoad();
    setTimeout(function () { var x = l.querySelector('[data-cc-szm="close"]'); if (x) x.focus(); }, 50);
  }
  function mClose() { M = null; var l = doc.getElementById('cc-szm'); if (l) l.remove(); }
  function field(id, label, val, type, extra) {
    extra = extra || {};
    return '<div class="ccs-field' + (extra.full ? ' cc-full' : '') + '"><label class="ccs-label" for="' + id + '">' + label + '</label>' +
      '<input class="ccs-input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '"' + (extra.attrs ? ' ' + extra.attrs : '') + '>' +
      (extra.hint ? '<span class="ccs-hint">' + extra.hint + '</span>' : '') + '</div>';
  }
  function range(a, b, none) { return a || b ? (a ? nice(a) : 'Now') + ' to ' + (b ? nice(b) : 'no end date') : none; }
  function pill(t, c) { return '<span class="cc-szm-pill ' + c + '">' + esc(t) + '</span>'; }
  function mOverviewHtml(d) {
    var on = d.items.filter(function (i) { return state(i, d)[1] === 'is-on'; }).length;
    var off = d.items.length - on, soldQ = d.items.reduce(function (s, i) { return s + Number(i.sold || 0); }, 0);
    var soldV = d.items.reduce(function (s, i) { return s + Number(i.sold || 0) * Number(i.price); }, 0);
    var att = d.items.filter(function (i) { return issues(i, d).length; }).length;
    return '<div class="cc-szx-kpis">' +
      '<div class="cc-szx-kpi"><span>On sale now</span><b>' + on + '</b><small>of ' + d.items.length + ' items</small></div>' +
      '<div class="cc-szx-kpi"><span>Switched off or not on sale</span><b>' + off + '</b><small>hidden from customers</small></div>' +
      '<div class="cc-szx-kpi"><span>Sold this season</span><b>' + money(soldV) + '</b><small>' + soldQ + ' items</small></div>' +
      '<div class="cc-szx-kpi"><span>Booked, still to collect</span><b>' + money(bookedValue(d)) + '</b><small>' + d.booked.reduce(function (s, b) { return s + b.quantity; }, 0) + ' items</small></div></div>' +
      (att ? '<button type="button" class="cc-szx-att" data-cc-szm="filter" data-v="attention"><b>' + att + ' item' + (att > 1 ? 's need' : ' needs') + ' attention.</b> Show them</button>' : '');
  }
  function mItemsHtml(d) {
    var can = d.can_edit, h = '', f = M.filter;
    var counts = { all: d.items.length, on: 0, off: 0, counter: 0, attention: 0 };
    d.items.forEach(function (i) { var s = state(i, d)[1]; if (s === 'is-on') counts.on++; else counts.off++; if (i.channel === 'counter') counts.counter++; if (issues(i, d).length) counts.attention++; });
    h += '<div class="cc-szx-tools"><div class="ccs-chips" role="group" aria-label="Show">' + [['all', 'All'], ['on', 'On sale'], ['off', 'Off'], ['counter', 'Counter only'], ['attention', 'Needs attention']].map(function (x) {
      return '<button type="button" class="ccs-chip" data-cc-szm="filter" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + ' <span class="cc-szx-n">' + counts[x[0]] + '</span></button>'; }).join('') + '</div>' +
      (can ? '<button type="button" class="ccs-btn ccs-ghost" data-cc-szm="add-group">Add a heading</button>' : '') + '</div>';
    var sel = Object.keys(M.sel).filter(function (k) { return M.sel[k]; });
    if (can && sel.length) h += '<div class="cc-szx-bulk" role="region" aria-label="Selected items"><b>' + sel.length + ' selected</b>' +
      '<button type="button" class="ccs-btn" data-cc-szm="bulk-on"' + (M.busy ? ' disabled' : '') + '>Switch On</button><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="bulk-off"' + (M.busy ? ' disabled' : '') + '>Switch Off</button>' +
      '<button type="button" class="ccs-btn ccs-ghost" data-cc-szm="bulk-dates">Set dates</button><button type="button" class="ccs-link" data-cc-szm="bulk-clear">Clear</button></div>';
    if (M.bulk) h += mBulkHtml(sel.length);
    if (!d.groups.length) h += '<p class="ccs-hint">No headings yet.</p>';
    d.groups.forEach(function (g) {
      var all = d.items.filter(function (i) { return i.group_id === g.id; });
      var its = all.filter(function (i) { var s = state(i, d)[1]; return f === 'all' || (f === 'on' && s === 'is-on') || (f === 'off' && s !== 'is-on') || (f === 'counter' && i.channel === 'counter') || (f === 'attention' && issues(i, d).length); });
      var pay = { pickup: 'Pay when they collect', deposit: 'Deposit to confirm', full: 'Full payment to confirm' }[g.payment] || '', gon = g.active !== false;
      h += '<section class="cc-szm-g' + (gon ? '' : ' is-goff') + '"><div class="cc-szm-gh"><div><h3>' + esc(g.name) + '</h3><p>' + esc([g.web_message, pay].filter(Boolean).join(' · ')) + '</p>' +
        '<p class="cc-szm-gst ' + (gon ? 'is-on' : 'is-off') + '">' + (gon ? 'Section On: items switched On show on the website and at the counter.' : 'Section Off: every item here is hidden on the website and at the counter. Each item keeps its own setting.') + '</p></div>' +
        (can ? '<div class="cc-szm-acts"><button type="button" class="cc-szm-sw cc-szm-gsw" role="switch" aria-checked="' + gon + '" data-cc-szm="gtoggle" data-id="' + g.id + '" aria-label="' + esc(g.name) + ' section on the website and at the counter">' + (gon ? 'Section On' : 'Section Off') + '</button>' +
          '<button type="button" class="ccs-btn ccs-ghost" data-cc-szm="edit-group" data-id="' + g.id + '">Heading settings</button>' +
          '<button type="button" class="ccs-btn ccs-ghost" data-cc-szm="copy-year" data-id="' + g.id + '">Copy for next year</button>' +
          '<button type="button" class="ccs-btn" data-cc-szm="add-item" data-id="' + g.id + '">Add item</button></div>' : '') + '</div>';
      if (M.confirmCopy === g.id) h += '<div class="cc-szm-confirm" style="margin:12px 16px"><p>Copy all ' + all.length + ' items under ' + esc(g.name) + ' for next year? The copies keep the prices and settings, move every date on one year, and start switched Off.</p><button type="button" class="ccs-btn" data-cc-szm="copy-yes" data-id="' + g.id + '">Yes, copy them</button> <button type="button" class="ccs-btn ccs-ghost" data-cc-szm="copy-no">Cancel</button></div>';
      if (!its.length) { h += '<p class="ccs-hint" style="padding:12px 16px;margin:0">' + (all.length ? 'No items match this filter.' : 'No items yet. Tap Add item.') + '</p></section>'; return; }
      var allSel = its.every(function (i) { return M.sel[i.id]; });
      h += '<div class="cc-szx-list"><div class="cc-szx-row cc-szx-hd" aria-hidden="true">' + (can ? '<span><input type="checkbox" class="cc-szx-ck" data-cc-szm="sel-all" data-id="' + g.id + '"' + (allSel ? ' checked' : '') + ' aria-label="Select all in ' + esc(g.name) + '" tabindex="-1"></span>' : '<span></span>') +
        '<span></span><span>Item</span><span>Price</span><span>Availability</span><span>Sold</span><span>On sale</span><span></span></div>';
      its.forEach(function (i, n) {
        var st = state(i, d), iss = issues(i, d), first = all.indexOf(i) === 0, last = all.indexOf(i) === all.length - 1;
        h += '<div class="cc-szx-row' + (M.sel[i.id] ? ' is-sel' : '') + '">' +
          (can ? '<span><input type="checkbox" class="cc-szx-ck" data-cc-szm="sel" data-id="' + i.id + '"' + (M.sel[i.id] ? ' checked' : '') + ' aria-label="Select ' + esc(i.name) + '"></span>' : '<span></span>') +
          (i.image_url ? '<img class="cc-sz-ph" src="' + esc(i.image_url) + '" alt="">' : '<span class="cc-sz-ph cc-szx-noph" aria-hidden="true">No photo</span>') +
          '<div class="cc-szx-item"><b>' + esc(i.name) + '</b>' + (i.detail ? '<small>' + esc(i.detail) + '</small>' : '') +
            '<span class="cc-szx-pills">' + pill(st[0], st[1]) + (i.channel === 'counter' ? pill('Counter only', 'is-counter') : '') + iss.map(function (x) { return pill(x, 'is-att'); }).join('') + '</span></div>' +
          '<span class="cc-szx-price" data-k="Price">' + money(i.price) + '</span>' +
          '<span class="cc-szx-av" data-k="Availability"><span>On sale: ' + esc(range(i.sale_from, i.sale_to, 'Any day')) + '</span><span>Pickup: ' + esc(range(i.pickup_from, i.pickup_to, 'Any day')) + '</span><span>' +
            esc((i.lead_days ? i.lead_days + (i.lead_days === 1 ? " day's" : " days'") + ' notice' : 'No notice') + (i.daily_limit ? ' · ' + i.daily_limit + ' a day' : '') + (i.max_per_order ? ' · up to ' + i.max_per_order + ' per order' : '')) + '</span></span>' +
          '<span class="cc-szx-sold" data-k="Sold">' + Number(i.sold || 0) + '</span>' +
          (can ? '<span><button type="button" class="cc-szm-sw" role="switch" aria-checked="' + !!i.active + '" data-cc-szm="toggle" data-id="' + i.id + '" aria-label="' + esc(i.name) + ' on sale">' + (i.active ? 'On' : 'Off') + '</button></span>' +
            '<span class="cc-szx-acts"><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="edit-item" data-id="' + i.id + '">Change</button>' +
            '<span class="cc-szm-mv"><button type="button" data-cc-szm="up" data-id="' + i.id + '" aria-label="Move ' + esc(i.name) + ' up"' + (first ? ' disabled' : '') + '>↑</button><button type="button" data-cc-szm="down" data-id="' + i.id + '" aria-label="Move ' + esc(i.name) + ' down"' + (last ? ' disabled' : '') + '>↓</button></span></span>'
            : '<span></span><span></span>') + '</div>';
      });
      h += '</div></section>';
    });
    return h;
  }
  function mBulkHtml(n) {
    var b = M.bulk;
    return '<div class="cc-szx-bulkform"><h4>Set dates for ' + n + ' item' + (n > 1 ? 's' : '') + '</h4><p class="ccs-hint">Leave a box empty to keep each item\'s own date.</p><div class="cc-szm-form">' +
      field('cc-szb-sale-from', 'Shows from', b.sale_from, 'date') + field('cc-szb-sale-to', 'Last day on sale', b.sale_to, 'date') +
      field('cc-szb-pick-from', 'First pickup day', b.pickup_from, 'date') + field('cc-szb-pick-to', 'Last pickup day', b.pickup_to, 'date') + '</div>' +
      '<div class="cc-szm-bar"><button type="button" class="ccs-btn" data-cc-szm="bulk-dates-save"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Apply to ' + n + ' item' + (n > 1 ? 's' : '')) + '</button><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="bulk-dates-cancel">Cancel</button></div></div>';
  }
  function mBookedHtml(d) {
    var by = {}, h = '<p class="ccs-hint">Treats on orders still to be collected, by pickup day, against each daily limit. Cancelled and declined orders are left out.</p>';
    d.booked.forEach(function (b) { (by[b.day] = by[b.day] || []).push(b); });
    var days = Object.keys(by).sort();
    if (!days.length) h += '<p>No treats booked yet.</p>';
    days.forEach(function (day) {
      var tot = by[day].reduce(function (s, b) { return s + b.quantity; }, 0);
      h += '<section class="cc-szx-day"><h4>' + esc(nice(day, true)) + ' <span>' + tot + ' item' + (tot > 1 ? 's' : '') + '</span></h4>' + by[day].map(function (b) {
        var it = d.items.filter(function (i) { return i.id === b.item; })[0], lim = it && it.daily_limit, pct = lim ? Math.min(100, Math.round(100 * b.quantity / lim)) : 0;
        return '<div class="cc-szx-dr"><span class="cc-szx-dn">' + esc(b.name) + '</span>' + (lim ? '<span class="cc-szx-db"><i class="' + (pct >= 100 ? 'is-full' : pct >= 80 ? 'is-near' : '') + '" style="width:' + pct + '%"></i></span><b>' + b.quantity + ' of ' + lim + '</b>' : '<span class="cc-szx-db is-none"></span><b>' + b.quantity + '</b>') + '</div>';
      }).join('') + '</section>';
    });
    return h;
  }
  // Live preview: how the item looks on the website and at the counter
  function previewHtml(i) {
    var nm = i.name || 'Item name', pr = Number(String(i.price || '').replace(/[^\d.]/g, '')) || 0;
    return '<p class="cc-szx-pk">On the website</p>' + (i.channel === 'counter' ? '<p class="ccs-hint">Counter only: customers do not see this item.</p>' :
      '<div class="cc-szx-pv"><span class="cc-szx-pvph"' + (i.image_url ? ' style="background-image:url(' + esc(JSON.stringify(String(i.image_url)).slice(1, -1)) + ')"' : '') + '>' + (i.image_url ? '' : 'No photo yet') + '</span>' +
      '<b>' + esc(nm) + '</b>' + (i.detail ? '<small>' + esc(i.detail) + '</small>' : '') + '<span class="cc-szx-pvpr">' + money(pr) + '</span><span class="cc-szx-pvadd">Add</span></div>') +
      '<p class="cc-szx-pk">At the counter</p><div class="cc-szx-pvc"><b>' + esc(nm) + '</b><span>' + money(pr) + '</span></div>' +
      '<p class="cc-szx-pk">On the kitchen slip</p><div class="cc-szx-pvs">' + esc('1 × ' + nm + (i.detail ? ' (' + i.detail + ')' : '')) + '</div>';
  }
  function drawPreview() { var p = doc.querySelector('.cc-szx-preview'); if (p && M && M.edit) p.innerHTML = previewHtml(M.edit.item); }
  function histHtml() {
    var h = M.hist;
    if (!M.edit.item.id) return '';
    var s = '<section class="cc-szx-hist"><h4>Change history</h4>';
    if (!h) return s + '<p class="ccs-loading">Loading…</p></section>';
    if (h.err) return s + '<p class="ccs-hint">' + esc(h.err) + '</p></section>';
    if (!h.rows.length) return s + '<p class="ccs-hint">No changes recorded yet.</p></section>';
    var L = { name: 'name', detail: 'size or pack', price: 'price', channel: 'where it shows', image_url: 'photo', sale_from: 'shows from', sale_to: 'last day on sale', pickup_from: 'first pickup day', pickup_to: 'last pickup day', lead_days: "days' notice", daily_limit: 'daily limit', max_per_order: 'most per order', blocked_days: 'days not available', group_id: 'heading', active: 'on sale' };
    var A = { added: 'Added', changed: 'Changed', switched_on: 'Switched On', switched_off: 'Switched Off', removed: 'Removed' };
    return s + '<ol>' + h.rows.map(function (r) {
      var what = '';
      if (r.action === 'changed' && r.before && r.after) {
        var ks = Object.keys(L).filter(function (k) { return JSON.stringify(r.before[k]) !== JSON.stringify(r.after[k]); });
        what = ks.map(function (k) { return k === 'price' ? 'price ' + money(r.before[k]) + ' to ' + money(r.after[k]) : L[k]; }).join(', ');
      }
      return '<li><b>' + esc(A[r.action] || r.action) + '</b>' + (what ? ': ' + esc(what) : '') + '<span>' + esc(FMT_T.format(new Date(r.at)).replace(' am', ' AM').replace(' pm', ' PM')) + (r.by_label ? ' · ' + esc(r.by_label) : '') + '</span></li>';
    }).join('') + '</ol></section>';
  }
  function loadHist(id) {
    M.hist = null;
    var c = db(); if (!c) return;
    c.from('seasonal_item_changes').select('at,by_label,action,before,after,item_id').eq('item_id', id).order('at', { ascending: false }).limit(25).then(function (r) {
      if (!M || !M.edit || M.edit.item.id !== id) return;
      M.hist = r && !r.error ? { rows: (r.data || []).filter(function (x) { return !x.item_id || x.item_id === id; }) } : { err: 'History could not be loaded.' };
      var el = doc.querySelector('.cc-szx-hist'); if (el) el.outerHTML = histHtml();
    }, function () { if (M && M.edit) { M.hist = { err: 'History could not be loaded.' }; var el = doc.querySelector('.cc-szx-hist'); if (el) el.outerHTML = histHtml(); } });
  }
  function mEditHtml(d) {
    var e = M.edit, i = e.item, gs = d.groups;
    var sec = function (t, inner) { return '<section class="cc-szx-fs"><h4>' + t + '</h4><div class="cc-szm-form">' + inner + '</div></section>'; };
    var h = '<div class="cc-szx-edhead"><button type="button" class="ccs-link" data-cc-szm="back">‹ All seasonal items</button><h3>' + (i.id ? 'Change ' + esc(i.name) : 'Add an item') + '</h3></div><div class="cc-szx-ed"><div class="cc-szx-form">' +
      sec('Details', field('cc-szf-name', 'Name', i.name, 'text', { attrs: 'maxlength="60" placeholder="For example: Gingerbread House"' }) +
        field('cc-szf-detail', 'Size or pack (optional)', i.detail, 'text', { attrs: 'maxlength="80" placeholder="For example: Pack of 6"' }) +
        field('cc-szf-price', 'Price (FJD, including VAT)', i.price, 'text', { attrs: 'inputmode="decimal" placeholder="35"' }) +
        (gs.length > 1 ? '<div class="ccs-field"><label class="ccs-label" for="cc-szf-group">Heading</label><select class="ccs-input" id="cc-szf-group">' + gs.map(function (g) { return '<option value="' + g.id + '"' + (g.id === i.group_id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></div>' : '<div></div>') +
        '<div class="ccs-field cc-full"><span class="ccs-label">Where it shows</span><div class="ccs-chips" role="group" aria-label="Where it shows">' +
          [['website', 'Website and counter'], ['counter', 'Counter only']].map(function (c) { return '<button type="button" class="ccs-chip" data-cc-szm="channel" data-v="' + c[0] + '" aria-pressed="' + (i.channel === c[0]) + '">' + c[1] + '</button>'; }).join('') +
          '</div><span class="ccs-hint">Counter only items (for example wine) never show on the website.</span></div>') +
      sec('Photo', '<div class="ccs-field cc-full"><div class="cc-szm-photo">' + (i.image_url ? '<img src="' + esc(i.image_url) + '" alt="">' : '') +
        '<label class="ccs-btn ccs-ghost" for="cc-szf-file">' + (e.uploading ? 'Uploading…' : i.image_url ? 'Change photo' : 'Upload photo') + '</label><input id="cc-szf-file" type="file" accept="image/*" hidden>' +
        (i.image_url ? '<button type="button" class="ccs-link ccs-red" data-cc-szm="photo-remove">Remove photo</button>' : '') + '</div><span class="ccs-hint">A square photo looks best. It is made smaller automatically.</span></div>') +
      sec('Availability', field('cc-szf-sale-from', 'Shows from (first day on sale)', i.sale_from, 'date', { hint: 'Leave empty to start straight away.' }) +
        field('cc-szf-sale-to', 'Last day on sale', i.sale_to, 'date', { hint: 'It disappears by itself after this day.' }) +
        field('cc-szf-pick-from', 'First pickup day', i.pickup_from, 'date') + field('cc-szf-pick-to', 'Last pickup day', i.pickup_to, 'date') +
        '<div class="ccs-field cc-full"><label class="ccs-label" for="cc-szf-block">Pickup days it is not available (optional)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="ccs-input" id="cc-szf-block" type="date" style="flex:1 1 180px"><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="block-add">Add day</button></div>' +
        '<div class="cc-szm-chips">' + (i.blocked_days || []).map(function (b) { return '<span class="cc-szm-chip">' + esc(nice(b)) + '<button type="button" data-cc-szm="block-del" data-v="' + b + '" aria-label="Remove ' + esc(nice(b, true)) + '">×</button></span>'; }).join('') + '</div></div>') +
      sec('Limits', field('cc-szf-lead', "Days' notice needed", i.lead_days == null ? 0 : i.lead_days, 'number', { attrs: 'min="0" max="60" inputmode="numeric"', hint: 'For example 2: ordered on Monday, ready from Wednesday.' }) +
        field('cc-szf-limit', 'Daily limit (optional)', i.daily_limit, 'number', { attrs: 'min="1" max="999" inputmode="numeric" placeholder="No limit"', hint: 'How many the kitchen can make for one pickup day.' }) +
        field('cc-szf-max', 'Most per order (optional)', i.max_per_order, 'number', { attrs: 'min="1" max="99" inputmode="numeric" placeholder="No limit"' })) +
      sec('On sale', '<div class="ccs-field cc-full"><div><button type="button" class="cc-szm-sw" role="switch" aria-checked="' + !!i.active + '" data-cc-szm="edit-active">' + (i.active ? 'On' : 'Off') + '</button></div><span class="ccs-hint">Off hides it everywhere straight away. Orders already taken keep it.</span></div>') +
      histHtml() + '</div><aside class="cc-szx-preview" aria-label="Preview">' + previewHtml(i) + '</aside></div>' +
      (M.err ? '<p class="cc-szm-err" role="alert">' + esc(M.err) + '</p>' : '') +
      (e.confirmRemove ? '<div class="cc-szm-confirm"><p>Remove ' + esc(i.name) + '? It disappears from the website and the counter. Orders already taken keep it.</p><button type="button" class="ccs-btn" data-cc-szm="remove-yes">Yes, remove it</button> <button type="button" class="ccs-btn ccs-ghost" data-cc-szm="remove-no">Keep it</button></div>' : '') +
      '<div class="cc-szx-savebar"><button type="button" class="ccs-btn" data-cc-szm="save-item"' + (M.busy || e.uploading ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Save item') + '</button>' +
      '<button type="button" class="ccs-btn ccs-ghost" data-cc-szm="back">Cancel</button>' + (i.id ? '<button type="button" class="ccs-link ccs-red" data-cc-szm="remove-ask">Remove item</button>' : '') + '</div>';
    return h;
  }
  function mGroupHtml() {
    var g = M.editGroup;
    return '<div class="cc-szx-edhead"><button type="button" class="ccs-link" data-cc-szm="back">‹ All seasonal items</button><h3>' + (g.id ? 'Heading settings' : 'Add a heading') + '</h3></div><section class="cc-szx-fs"><div class="cc-szm-form">' +
      field('cc-szg-name', 'Heading', g.name, 'text', { attrs: 'maxlength="40" placeholder="For example: Festive treats"' }) +
      field('cc-szg-msg', 'Short message on the website (optional)', g.web_message, 'text', { attrs: 'maxlength="160"' }) +
      '<div class="ccs-field cc-full"><span class="ccs-label">How customers pay</span><div class="ccs-chips" role="group" aria-label="How customers pay">' +
      [['pickup', 'Pay when they collect'], ['deposit', 'Deposit to confirm'], ['full', 'Full payment to confirm']].map(function (c) { return '<button type="button" class="ccs-chip" data-cc-szm="pay" data-v="' + c[0] + '" aria-pressed="' + (g.payment === c[0]) + '">' + c[1] + '</button>'; }).join('') +
      '</div><span class="ccs-hint">Shown to customers on the website. Staff still take the payment as usual.</span></div></div></section>' +
      (M.err ? '<p class="cc-szm-err" role="alert">' + esc(M.err) + '</p>' : '') +
      '<div class="cc-szx-savebar"><button type="button" class="ccs-btn" data-cc-szm="save-group"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Save heading') + '</button><button type="button" class="ccs-btn ccs-ghost" data-cc-szm="back">Cancel</button></div>';
  }
  function mDraw() {
    var host = mHost(); if (!host || !M) return;
    var d = M.data, h = M.mode === 'inline' ? '<p class="cc-szx-lead">Festive treats and other limited-time items for the website and the counter.</p>' : '';
    if (M.loading && !d) h += '<p class="ccs-loading">Loading…</p>';
    else if (!d) h += '<p class="cc-szm-err">' + esc(M.err || 'Could not load seasonal items.') + '</p><button type="button" class="ccs-btn" data-cc-szm="reload">Try again</button>';
    else if (M.edit) h += mEditHtml(d);
    else if (M.editGroup) h += mGroupHtml();
    else {
      h += mOverviewHtml(d);
      h += '<div class="cc-szm-tabs" role="tablist" aria-label="Seasonal items">' + [['items', 'Items'], ['booked', "What's booked"]].map(function (t) { return '<button type="button" class="ccs-chip" role="tab" data-cc-szm="tab" data-v="' + t[0] + '" aria-selected="' + (M.view === t[0]) + '" aria-pressed="' + (M.view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
      if (M.msg) h += '<p class="cc-szm-ok" role="status">' + esc(M.msg) + '</p>';
      if (M.err) h += '<p class="cc-szm-err" role="alert">' + esc(M.err) + '</p>';
      h += M.view === 'booked' ? mBookedHtml(d) : mItemsHtml(d);
    }
    var sc = M.mode === 'inline' ? doc.getElementById('ccs-main') : host.parentNode, top = sc ? sc.scrollTop : 0;
    var focusSel = null, a = doc.activeElement;
    if (a && host.contains(a)) focusSel = a.id ? '#' + a.id : a.getAttribute('data-cc-szm') ? '[data-cc-szm="' + a.getAttribute('data-cc-szm') + '"]' + (a.getAttribute('data-id') ? '[data-id="' + a.getAttribute('data-id') + '"]' : '') + (a.getAttribute('data-v') ? '[data-v="' + a.getAttribute('data-v') + '"]' : '') : null;
    host.innerHTML = h;
    if (M.resetScroll) { M.resetScroll = false; if (M.mode === 'inline') { var hb = host.getBoundingClientRect(); if (sc && hb.top < 0) sc.scrollTop += hb.top - 16; } else if (sc) sc.scrollTop = 0; }
    else if (sc) sc.scrollTop = top;
    if (focusSel) { try { var f = host.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); } catch (_) {} }
  }
  function val(id) { var e = doc.getElementById(id); return e ? e.value.trim() : ''; }
  function grabItem() {
    var i = M && M.edit && M.edit.item; if (!i || !doc.getElementById('cc-szf-name')) return;
    i.name = val('cc-szf-name'); i.detail = val('cc-szf-detail'); i.price = val('cc-szf-price');
    var g = doc.getElementById('cc-szf-group'); if (g) i.group_id = g.value;
    i.sale_from = val('cc-szf-sale-from') || null; i.sale_to = val('cc-szf-sale-to') || null;
    i.pickup_from = val('cc-szf-pick-from') || null; i.pickup_to = val('cc-szf-pick-to') || null;
    i.lead_days = val('cc-szf-lead'); i.daily_limit = val('cc-szf-limit'); i.max_per_order = val('cc-szf-max');
  }
  function grabGroup() { var g = M && M.editGroup; if (!g || !doc.getElementById('cc-szg-name')) return; g.name = val('cc-szg-name'); g.web_message = val('cc-szg-msg'); }
  function grabBulk() { var b = M && M.bulk; if (!b || !doc.getElementById('cc-szb-sale-from')) return; b.sale_from = val('cc-szb-sale-from'); b.sale_to = val('cc-szb-sale-to'); b.pickup_from = val('cc-szb-pick-from'); b.pickup_to = val('cc-szb-pick-to'); }
  function mDone(msg) { M.edit = null; M.editGroup = null; M.bulk = null; M.busy = false; M.err = null; M.msg = msg; M.resetScroll = true; mLoad(); }
  function payload(i) {
    return { id: i.id || null, group_id: i.group_id, name: i.name, detail: i.detail || '', price: String(i.price), channel: i.channel, image_url: i.image_url || '',
      sale_from: i.sale_from || '', sale_to: i.sale_to || '', pickup_from: i.pickup_from || '', pickup_to: i.pickup_to || '', lead_days: i.lead_days === '' || i.lead_days == null ? '0' : String(i.lead_days),
      daily_limit: i.daily_limit == null ? '' : String(i.daily_limit), max_per_order: i.max_per_order == null ? '' : String(i.max_per_order), blocked_days: i.blocked_days || [], active: !!i.active };
  }
  function mSaveItem() {
    grabItem(); var i = M.edit.item;
    M.busy = true; M.err = null; mDraw();
    rpc('staff_seasonal_save_item', { p: payload(i) }).then(function (d) {
      if (!M) return;
      if (!d || !d.ok) { M.busy = false; M.err = (d && d.message) || 'Not saved.'; return mDraw(); }
      mDone(i.name + ' saved.' + (i.active ? '' : ' It is switched Off, so customers cannot see it yet.'));
    }, function (e) { if (!M) return; M.busy = false; M.err = errText(e); mDraw(); });
  }
  // Bulk: one item at a time, so each still gets the database's own checks; stops at the first refusal
  function bulkRun(ids, make, done) {
    var n = 0, k = 0;
    M.busy = true; M.err = null; mDraw();
    (function next() {
      if (!M) return;
      if (k >= ids.length) { M.sel = {}; return mDone(done(n)); }
      var it = M.data.items.filter(function (x) { return x.id === ids[k]; })[0]; k++;
      if (!it) return next();
      rpc('staff_seasonal_save_item', { p: make(it) }).then(function (r) {
        if (!M) return;
        if (!r || !r.ok) { M.busy = false; M.err = it.name + ': ' + ((r && r.message) || 'not changed') + (n ? ' (' + n + ' changed before this)' : ''); return mLoad(); }
        n++; next();
      }, function (e) { if (!M) return; M.busy = false; M.err = errText(e); mLoad(); });
    })();
  }
  function upload(file) {
    if (!M || !M.edit || !file) return;
    if (!/^image\//.test(file.type)) { M.err = 'Choose a photo (JPEG or PNG).'; return mDraw(); }
    grabItem(); M.edit.uploading = true; M.err = null; mDraw();
    shrink(file).then(function (blob) {
      var c = db(), path = 'seasonal/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      return c.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }).then(function (r) {
        if (r && r.error) throw r.error;
        var u = c.storage.from(BUCKET).getPublicUrl(path); return u && u.data && u.data.publicUrl;
      });
    }).then(function (url) {
      if (!M || !M.edit) return;
      M.edit.uploading = false;
      if (!url) { M.err = 'The photo did not upload. Try again.'; return mDraw(); }
      M.edit.item.image_url = url; M.err = null; mDraw();
    }, function (e) { if (!M || !M.edit) return; M.edit.uploading = false; M.err = 'The photo did not upload: ' + errText(e); mDraw(); warn('upload', e); });
  }
  // Photos are made smaller (longest side 1200px) before upload, so they load fast on phones
  function shrink(file) {
    return new Promise(function (ok) {
      try {
        var img = new Image(), url = win.URL.createObjectURL(file);
        img.onload = function () {
          var s = Math.min(1, 1200 / Math.max(img.width, img.height)), cv = doc.createElement('canvas');
          cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
          win.URL.revokeObjectURL(url);
          cv.toBlob(function (b) { ok(b || file); }, 'image/jpeg', 0.85);
        };
        img.onerror = function () { win.URL.revokeObjectURL(url); ok(file); };
        img.src = url;
      } catch (_) { ok(file); }
    });
  }


  // ---------- Analytics > Cake sales: Seasonal sales (for managers and executives) ----------
  // Counted on the pickup day, like cakes. Collected = order completed; Booked = still to be collected.
  var AN = { data: null, at: 0, busy: false, denied: false };
  function anLoad() {
    if (AN.busy || AN.denied || (AN.data && Date.now() - AN.at < 120000)) return;
    AN.busy = true;
    rpc('crm_seasonal_sales').then(function (d) {
      AN.busy = false; AN.at = Date.now();
      if (!d || !d.ok) { AN.denied = true; return; }
      AN.data = d; var c = doc.querySelector('#ccs-main .cc-ss'); if (c) c.remove(); schedule();
    }, function (e) { AN.busy = false; warn('analytics', e); });
  }
  function weekLabel(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function anHtml(d) {
    var S = d.summary, h = '<div class="cc-ss-head"><div><h3>Seasonal sales</h3><p>Festive treats and other seasonal items. Counted on the pickup day; cancelled orders left out.</p></div></div>';
    if (!Number(S.items)) return h + '<p class="cc-ss-empty">No seasonal sales yet. They show here as soon as treats are ordered on the website or at the counter.</p>';
    var share = S.cake_orders ? Math.round(100 * S.orders / S.cake_orders) : 0;
    h += '<div class="cc-ss-kpis">' +
      '<div class="cc-ss-kpi"><span>Sales value</span><b>' + money(S.value) + '</b><small>' + money(S.collected_value) + ' collected · ' + money(S.booked_value) + ' booked</small></div>' +
      '<div class="cc-ss-kpi"><span>Items sold</span><b>' + Number(S.items) + '</b><small>' + S.orders + ' cake order' + (S.orders === 1 ? '' : 's') + ' · ' + Number(S.treat_orders || 0) + ' treat order' + (Number(S.treat_orders) === 1 ? '' : 's') + '</small></div>' +
      '<div class="cc-ss-kpi"><span>Cake orders with treats</span><b>' + share + '%</b><small>' + S.orders + ' of ' + S.cake_orders + ' since the first treat</small></div>' +
      '<div class="cc-ss-kpi"><span>Average per order</span><b>' + money((S.orders + Number(S.treat_orders || 0)) ? S.value / (S.orders + Number(S.treat_orders || 0)) : 0) + '</b><small>treats on each order with treats</small></div></div>';
    var top = Math.max.apply(null, d.items.map(function (i) { return Number(i.value); }).concat([1]));
    h += '<div class="cc-ss-grid"><section class="cc-ss-box"><h4>By item</h4>' + d.items.map(function (i) {
      return '<div class="cc-ss-bar"><span class="cc-ss-bn">' + esc(i.name) + '</span><span class="cc-ss-bt"><i style="width:' + Math.max(2, Math.round(100 * Number(i.value) / top)) + '%"></i></span><span class="cc-ss-bv"><b>' + money(i.value) + '</b> · ' + i.quantity + '</span></div>';
    }).join('') + '</section>';
    var src = d.sources || {}, web = Number(src.website || 0), cnt = Number(src.counter || 0), tot = web + cnt || 1;
    h += '<section class="cc-ss-box"><h4>Website or counter</h4><div class="cc-ss-split"><i class="is-web" style="width:' + Math.round(100 * web / tot) + '%"></i><i class="is-cnt" style="width:' + Math.round(100 * cnt / tot) + '%"></i></div>' +
      '<div class="cc-ss-leg"><span><i class="is-web"></i>Website ' + money(web) + ' (' + Math.round(100 * web / tot) + '%)</span><span><i class="is-cnt"></i>Counter ' + money(cnt) + ' (' + Math.round(100 * cnt / tot) + '%)</span></div>';
    var kd = d.kinds || {}, kc = Number(kd.cake || 0), kt = Number(kd.treats || 0), ktot = kc + kt || 1;
    h += '<h4 style="margin-top:18px">With a cake or treats only</h4><div class="cc-ss-split"><i class="is-web" style="width:' + Math.round(100 * kc / ktot) + '%"></i><i class="is-cnt" style="width:' + Math.round(100 * kt / ktot) + '%"></i></div>' +
      '<div class="cc-ss-leg"><span><i class="is-web"></i>With a cake ' + money(kc) + ' (' + Math.round(100 * kc / ktot) + '%)</span><span><i class="is-cnt"></i>Treats only ' + money(kt) + ' (' + Math.round(100 * kt / ktot) + '%)</span></div>';
    var wk = d.weeks.slice(-12), wtop = Math.max.apply(null, wk.map(function (w) { return Number(w.collected || 0) + Number(w.booked || 0); }).concat([1]));
    h += '<h4 style="margin-top:18px">By pickup week</h4><div class="cc-ss-cols" role="img" aria-label="Seasonal sales by pickup week">' + wk.map(function (w) {
      var c = Number(w.collected || 0), b = Number(w.booked || 0);
      return '<div class="cc-ss-col" title="Week of ' + esc(weekLabel(w.week)) + ': ' + money(c + b) + '"><span class="cc-ss-cv">' + money(c + b) + '</span><i class="is-bk" style="height:' + Math.round(100 * b / wtop) + '%"></i><i class="is-cl" style="height:' + Math.round(100 * c / wtop) + '%"></i><em>' + esc(weekLabel(w.week)) + '</em></div>';
    }).join('') + '</div><div class="cc-ss-leg"><span><i class="is-cl"></i>Collected</span><span><i class="is-bk"></i>Booked, still to collect</span></div></section></div>';
    return h;
  }
  function analyticsUi() {
    var page = doc.querySelector('#ccs-main .cat-page[data-cat="sl"]'); if (!page) return;
    anLoad();
    if (!AN.data || page.querySelector('.cc-ss')) return;
    var c = doc.createElement('section'); c.className = 'cc-ss'; c.setAttribute('aria-label', 'Seasonal sales');
    c.innerHTML = anHtml(AN.data);
    var head = page.querySelector(':scope > h2, :scope > .cat-head, :scope > header');
    if (head && head.nextSibling) page.insertBefore(c, head.nextSibling); else page.insertBefore(c, page.firstChild);
  }

  // ---------- clicks ----------
  function onClick(e) {
    var t = e.target; if (!t || !t.closest) return;
    var z = t.closest('[data-cc-sz],[data-cc-sz-plus],[data-cc-sz-minus]');
    if (z) {
      var act = z.getAttribute('data-cc-sz');
      if (z.hasAttribute('data-cc-sz-plus') || z.hasAttribute('data-cc-sz-minus')) {
        if (!pick) return;
        var id = z.getAttribute('data-cc-sz-plus') || z.getAttribute('data-cc-sz-minus'), it = itemById(id);
        var q = pick.qty[id] || 0;
        if (z.hasAttribute('data-cc-sz-plus')) { if (it && !why(it, pick.date, pick.rush) && q < most(it, pick.date, pick.qty0 && pick.qty0[id])) q++; } else q = Math.max(0, q - 1);
        pick.qty[id] = q; pick.msg = null; drawPicker(); return;
      }
      if (act === 'close') { closePicker(); return; }
      if (act === 'done') { if (pick && pick.onDone) pick.onDone(); return; }
      if (act === 'counter') {
        var D = draft(); if (!D) return; syncKey(D);
        var rush = !!(D.rush && String(D.rush).trim());
        openPicker({ title: 'Add treats', date: D.date, rush: rush, qty: Object.assign({}, cart.qty), doneLabel: 'Done',
          onDone: function () { cart.qty = Object.assign({}, pick.qty); cart.err = null; closePicker(); schedule(); } });
        return;
      }
      if (act === 'order') {
        var o = sheetOrder; if (!o) return;
        var q0 = {}; (o.extras || []).forEach(function (x) { if (x.item_id) q0[x.item_id] = (q0[x.item_id] || 0) + x.quantity; });
        openPicker({ title: (o.extras || []).length ? 'Change treats' : 'Add treats', date: o.required_date, rush: true, qty: Object.assign({}, q0), qty0: q0, doneLabel: 'Save treats', onDone: saveOrderTreats });
        return;
      }
    }
    var m = t.closest('[data-cc-szm]'); if (!m) return;
    var a = m.getAttribute('data-cc-szm'), mid = m.getAttribute('data-id'), v = m.getAttribute('data-v');
    if (a === 'open') { mOpen(); return; }
    if (!M) return;
    var d = M.data;
    if (a === 'close') return mClose();
    if (a === 'reload') return mLoad();
    if (a === 'tab') { M.view = v; M.msg = null; return mDraw(); }
    if (a === 'filter') { M.filter = v; M.view = 'items'; M.msg = null; return mDraw(); }
    if (a === 'sel') { M.sel[mid] = !M.sel[mid]; return mDraw(); }
    if (a === 'sel-all') { var gi = d.items.filter(function (x) { return x.group_id === mid; }), on2 = !gi.every(function (x) { return M.sel[x.id]; }); gi.forEach(function (x) { M.sel[x.id] = on2; }); return mDraw(); }
    if (a === 'bulk-clear') { M.sel = {}; M.bulk = null; return mDraw(); }
    if (a === 'bulk-on' || a === 'bulk-off') {
      var want2 = a === 'bulk-on', ids2 = Object.keys(M.sel).filter(function (k) { return M.sel[k]; });
      return bulkRun(ids2, function (it) { return { id: it.id, active: want2 }; }, function (n) { return n + ' item' + (n === 1 ? '' : 's') + ' switched ' + (want2 ? 'On.' : 'Off.'); });
    }
    if (a === 'bulk-dates') { M.bulk = { sale_from: '', sale_to: '', pickup_from: '', pickup_to: '' }; return mDraw(); }
    if (a === 'bulk-dates-cancel') { M.bulk = null; return mDraw(); }
    if (a === 'bulk-dates-save') {
      grabBulk(); var B = M.bulk, ids3 = Object.keys(M.sel).filter(function (k) { return M.sel[k]; });
      if (!B.sale_from && !B.sale_to && !B.pickup_from && !B.pickup_to) { M.err = 'Choose at least one date.'; return mDraw(); }
      return bulkRun(ids3, function (it) { var x = JSON.parse(JSON.stringify(it)); ['sale_from', 'sale_to', 'pickup_from', 'pickup_to'].forEach(function (k) { if (B[k]) x[k] = B[k]; }); return payload(x); },
        function (n) { return 'Dates set on ' + n + ' item' + (n === 1 ? '' : 's') + '.'; });
    }
    if (a === 'back') { M.edit = null; M.editGroup = null; M.err = null; M.resetScroll = true; return mDraw(); }
    if (a === 'add-item') { M.msg = null; M.err = null; M.resetScroll = true; M.edit = { item: { group_id: mid, channel: 'website', lead_days: 2, active: false, blocked_days: [] } }; return mDraw(); }
    if (a === 'edit-item') { var it0 = d.items.filter(function (x) { return x.id === mid; })[0]; if (!it0) return; M.msg = null; M.err = null; M.resetScroll = true; M.edit = { item: JSON.parse(JSON.stringify(it0)) }; loadHist(mid); return mDraw(); }
    if (a === 'channel') { grabItem(); M.edit.item.channel = v; return mDraw(); }
    if (a === 'edit-active') { grabItem(); M.edit.item.active = !M.edit.item.active; return mDraw(); }
    if (a === 'photo-remove') { grabItem(); M.edit.item.image_url = null; return mDraw(); }
    if (a === 'block-add') { var bd = val('cc-szf-block'); grabItem(); if (/^\d{4}-\d{2}-\d{2}$/.test(bd) && (M.edit.item.blocked_days || []).indexOf(bd) < 0) M.edit.item.blocked_days = (M.edit.item.blocked_days || []).concat([bd]).sort(); return mDraw(); }
    if (a === 'block-del') { grabItem(); M.edit.item.blocked_days = (M.edit.item.blocked_days || []).filter(function (x) { return x !== v; }); return mDraw(); }
    if (a === 'save-item') return mSaveItem();
    if (a === 'remove-ask') { grabItem(); M.edit.confirmRemove = true; return mDraw(); }
    if (a === 'remove-no') { M.edit.confirmRemove = false; return mDraw(); }
    if (a === 'remove-yes') {
      var nm = M.edit.item.name; M.busy = true; mDraw();
      return rpc('staff_seasonal_save_item', { p: { id: M.edit.item.id, archive: true } }).then(function (r) {
        if (!M) return; if (!r || !r.ok) { M.busy = false; M.err = (r && r.message) || 'Not removed.'; return mDraw(); } mDone(nm + ' removed.');
      }, function (e2) { if (!M) return; M.busy = false; M.err = errText(e2); mDraw(); });
    }
    if (a === 'toggle') {
      var ti = d.items.filter(function (x) { return x.id === mid; })[0]; if (!ti) return;
      var want = !ti.active; ti.active = want; M.msg = null; mDraw();
      return rpc('staff_seasonal_save_item', { p: { id: mid, active: want } }).then(function (r) {
        if (!M) return;
        if (!r || !r.ok) { ti.active = !want; M.err = (r && r.message) || 'Not changed.'; return mDraw(); }
        M.msg = ti.name + (want ? ' is switched On.' + (state(ti, d)[1] === 'is-on' ? ' Customers can order it now.' : '') : ' is switched Off. It is hidden everywhere.'); mLoad();
      }, function (e3) { if (!M) return; ti.active = !want; M.err = errText(e3); mDraw(); });
    }
    if (a === 'gtoggle') {
      var gg = d.groups.filter(function (x) { return x.id === mid; })[0]; if (!gg) return;
      var gw = gg.active === false; gg.active = gw; M.msg = null; mDraw();
      return rpc('staff_seasonal_save_group', { p: { id: mid, active: gw } }).then(function (r) {
        if (!M) return;
        if (!r || !r.ok) { gg.active = !gw; M.err = (r && r.message) || 'Not changed.'; return mDraw(); }
        M.msg = gg.name + (gw ? ' is switched On. Items switched On now show on the website and at the counter.' : ' is switched Off. Every item in it is hidden on the website and at the counter.'); mLoad();
      }, function (e7) { if (!M) return; gg.active = !gw; M.err = errText(e7); mDraw(); });
    }
    if (a === 'up' || a === 'down') return rpc('staff_seasonal_move', { p_id: mid, p_dir: a === 'up' ? -1 : 1 }).then(function () { mLoad(); }, function (e4) { if (M) { M.err = errText(e4); mDraw(); } });
    if (a === 'copy-year') { M.confirmCopy = mid; return mDraw(); }
    if (a === 'copy-no') { M.confirmCopy = null; return mDraw(); }
    if (a === 'copy-yes') {
      M.confirmCopy = null;
      return rpc('staff_seasonal_copy_year', { p_group: mid }).then(function (r) { if (!M) return; if (!r || !r.ok) { M.err = (r && r.message) || 'Not copied.'; return mDraw(); } M.msg = r.copied + ' items copied for next year. They are switched Off: check the dates, then switch them On.'; mLoad(); }, function (e5) { if (M) { M.err = errText(e5); mDraw(); } });
    }
    if (a === 'add-group') { M.msg = null; M.err = null; M.resetScroll = true; M.editGroup = { name: '', web_message: '', payment: 'pickup' }; return mDraw(); }
    if (a === 'edit-group') { var g0 = d.groups.filter(function (x) { return x.id === mid; })[0]; if (!g0) return; M.msg = null; M.err = null; M.resetScroll = true; M.editGroup = JSON.parse(JSON.stringify(g0)); return mDraw(); }
    if (a === 'pay') { grabGroup(); M.editGroup.payment = v; return mDraw(); }
    if (a === 'save-group') {
      grabGroup(); var g = M.editGroup; M.busy = true; M.err = null; mDraw();
      return rpc('staff_seasonal_save_group', { p: { id: g.id || null, name: g.name, message: g.web_message, payment: g.payment } }).then(function (r) {
        if (!M) return; if (!r || !r.ok) { M.busy = false; M.err = (r && r.message) || 'Not saved.'; return mDraw(); } mDone(g.name + ' saved.');
      }, function (e6) { if (!M) return; M.busy = false; M.err = errText(e6); mDraw(); });
    }
  }
  function onChange() {}
  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (pick) { closePicker(); e.stopPropagation(); return; }
    if (M && M.mode === 'overlay' && !M.edit && !M.editGroup) { mClose(); e.stopPropagation(); }
  }

  // ---------- wiring ----------
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; run(); }); }
  function run() {
    try { counterUi(); } catch (e) { warn('counter', e); }
    try { sheetUi(); } catch (e) { warn('sheet', e); }
    try { settingsUi(); } catch (e) { warn('settings', e); }
    try { analyticsUi(); } catch (e) { warn('analytics', e); }
  }
  function start() {
    var r = root(); if (!r) return setTimeout(start, 300);
    ensureStyle();
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) { var n = list[i].target; if (n && n.closest && n.closest('#cc-sz-layer,#cc-szm,.cc-szx')) continue; return schedule(); }
    }).observe(r, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
    doc.addEventListener('click', onSubmitCapture, true);
    doc.addEventListener('click', onClick);
    doc.addEventListener('change', onChange);
    doc.addEventListener('keydown', onKey, true);
    schedule();
  }
  win.__ccSeasonal = { menu: function () { return menu; }, cart: function () { return cart; }, reload: function () { return loadMenu(true); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
