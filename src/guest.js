/* Corner Café cake order form (guest). Needs supabase-js v2. Mounts into <div id="cc-cake-order">. Prices and rules come from the database. */
(function () {
  'use strict';
  var SB_URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', SB_KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', TZ = 'Pacific/Fiji';
  var root = document.getElementById('cc-cake-order'); if (!root) return;
  // Three allergy answers (No, Yes, Not sure) sit side by side; this rule is also in guest.css for the next page-head update
  if (!document.getElementById('cco-x1')) { var x1 = document.createElement('style'); x1.id = 'cco-x1'; x1.textContent = '.cco-yesno{grid-template-columns:repeat(3,1fr)}'; document.head.appendChild(x1); }
  if (!document.getElementById('cco-x2')) { var x2 = document.createElement('style'); x2.id = 'cco-x2'; x2.textContent = '.cco-disc-req{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;border:2px dashed #C9A97A;color:#8C5A22;font-weight:700;font-size:13px;line-height:1.1;text-align:center;background:#FFFDF9}.cco-ask{margin:0 0 10px;padding:10px 12px;border-left:3px solid #C9A97A;background:#FBF6EE;border-radius:6px;font-size:14px;line-height:1.45;color:#3A3F36}'; document.head.appendChild(x2); }
  var sb = window.__ccoMock || window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  var OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Baby shower', 'Graduation', 'Office', 'Other'];
  var DIETS = ['Vegetarian (eggless)', 'Gluten-free', 'Nut allergy', 'Other'];
  var MAX_PHOTOS = 5;
  var SETUP = null, KEY = uid();
  var S = { req: false, size_note: '', reqFlav: '', flavour: null, variant: null, size: null, showServes: false, finish: null, design: '', photos: [], msgOpen: false, message: '', occOpen: false, occasion: null, method: 'collection', zone: null, address: '', receiver: '', candOpen: false, candles: '', noteOpen: false, notes: '',
    diet: null, diets: [], dietNote: '', date: null, time: null, name: '', phone: '', whatsapp: true, emailOpen: false, email: '', updates: false, detailsOk: false, know: true, sending: false, howOpen: false, dateNote: '' };
  var open = 0, reached = 0, errors = {}, formError = null, fresh = {}, animStep = -1;

  var ICON = {
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  };

  function uid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function money(n) { n = Number(n); return '$' + (n % 1 ? n.toFixed(2) : n); }
  function today() { return SETUP ? SETUP.location.today : new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(v) { return new Date(v + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function longDate(v) { return new Date(v + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function t12(t) { var p = t.split(':').map(Number); return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2, '0') + (p[0] >= 12 ? ' PM' : ' AM'); }
  function fl() { return !S.req && SETUP && SETUP.products.filter(function (f) { return f.code === S.flavour; })[0]; }
  function sz() { var f = fl(); return f && S.size != null ? f.sizes.filter(function (s) { return s.inch === S.size; })[0] : null; }
  function cakeName() { if (S.req) return 'Custom cake'; var f = fl(); if (!f) return ''; return f.variants.length ? (S.variant || f.name) : f.name; }
  function price() { var s = sz(); return s ? Number(s.price) : null; }
  // Delivery: only areas with a set fee are offered on the website; other areas call the cafe
  function zones() { return ((SETUP && SETUP.delivery_zones) || []).filter(function (z) { return z.fee != null; }); }
  function zoneFee() { var z = zones().filter(function (x) { return x.name === S.zone; })[0]; return z ? Number(z.fee) : null; }
  function isDel() { return S.method === 'delivery'; }
  function delOk() { return !isDel() || (S.zone && zoneFee() != null && S.address.trim().length >= 5); }
  function total() { var p = price(); return p == null ? null : p + (isDel() && zoneFee() != null ? zoneFee() : 0); }
  function leadDays() { var L = SETUP.location, f = fl(); return S.req || S.finish === 'custom' ? L.lead_days_custom : (f ? f.lead_days : L.lead_days_standard); }
  function minDate() { return addDays(today(), leadDays()); }
  function maxDate() { return addDays(today(), SETUP.location.max_days_ahead); }
  function dayOff(v) { return v < minDate() || v > maxDate() || SETUP.closed_dates.indexOf(v) > -1 || SETUP.full_dates.indexOf(v) > -1; }
  function busyPhotos() { return S.photos.filter(function (p) { return p.status === 'busy'; }).length; }
  function donePhotos() { return S.photos.filter(function (p) { return p.status === 'done'; }); }
  function enter(k) { return fresh[k] ? ' cco-enter' : ''; }
  // Cake photos come from Image elements on the Webflow page (data-cake-photo="<cake code>"), so they can be swapped in the Designer.
  // An image left as Webflow's placeholder is ignored and the drawn cake is shown instead.
  var PHOTOS = null;
  function photoOf(f) {
    if (!PHOTOS) {
      PHOTOS = {};
      [].forEach.call(document.querySelectorAll('[data-cake-photos] img[data-cake-photo]'), function (im) {
        var src = im.getAttribute('src') || '';
        if (src && !/placeholder/i.test(src)) PHOTOS[im.getAttribute('data-cake-photo')] = { src: src, srcset: im.getAttribute('srcset') || '' };
      });
    }
    return PHOTOS[f.code] || (f.image_url ? { src: f.image_url, srcset: '' } : null);
  }
  function vis(f) {
    if (!f) return '<span class="cco-disc-req" aria-hidden="true">Your<br>idea</span>';
    var p = photoOf(f);
    return p ? '<img src="' + esc(p.src) + '"' + (p.srcset ? ' srcset="' + esc(p.srcset) + '" sizes="(min-width: 760px) 240px, 50vw"' : '') + ' alt="" loading="lazy">' : '<span class="cco-disc" style="background:' + esc(f.swatch || '#E6DCCF') + '"></span>';
  }
  function opt() { return ' <span class="cco-optional">Optional</span>'; }
  function checkDate(why) { if (S.date && dayOff(S.date)) { S.date = null; S.time = null; S.dateNote = why + ' needs ' + leadDays() + ' days’ notice, so your earlier date is no longer available. Please choose a new date.'; } }
  function lbl(forId, text, optional) { return '<label class="cco-lbl" for="' + forId + '"><span>' + text + '</span>' + (optional ? opt() : '') + '</label>'; }
  function err(k) { return errors[k] ? '<span class="cco-err" id="cco-err-' + k + '" role="alert">' + esc(errors[k]) + '</span>' : ''; }
  function described(k) { return errors[k] ? ' aria-invalid="true" aria-describedby="cco-err-' + k + '"' : ''; }
  function reqLine() { return [S.reqFlav.trim(), S.size_note.trim()].filter(Boolean).join(', '); }
  // Same prompt the counter staff see, so a website order carries the same details
  var ASK = 'Tell us who the cake is for, any colours or theme, and add a photo if you have one.';
  function fromPrice(f) { return Math.min.apply(null, f.sizes.map(function (s) { return Number(s.price); })); }
  function finishSummary() { return [S.req ? 'Your design' : S.finish === 'custom' ? 'Custom design' : 'Standard finish', S.message.trim() ? '“' + S.message.trim() + '”' : '', S.occasion, S.diet === 'yes' ? (S.diets.join(', ') || 'Dietary needs noted') : S.diet === 'unsure' ? 'Allergies to check' : 'No dietary needs'].filter(Boolean).join(' · '); }

  var STEPS = [
    { key: 'Cake', q: 'Which cake would you like?', sub: 'Choose a flavour. You pick the size next.',
      summary: function () { if (S.req) return 'Custom cake, not on our menu'; return S.flavour && (!fl().variants.length || S.variant) ? cakeName() : ''; },
      body: function () {
        var h = '<div class="cco-cakes" role="group" aria-label="Cake flavour">', sub = '';
        SETUP.products.forEach(function (f) {
          var on = S.flavour === f.code;
          h += '<button type="button" class="cco-cake' + (photoOf(f) ? ' cco-has-photo' : '') + '" data-act="flavour" data-v="' + esc(f.code) + '" aria-pressed="' + on + '"><span class="cco-cake-vis">' + vis(f) + '</span><span class="cco-cake-txt"><span class="cco-cake-name">' + esc(f.name) + '</span><span class="cco-cake-from">From <b>' + money(fromPrice(f)) + '</b></span></span><span class="cco-check-badge">' + ICON.tick + '</span></button>';
          if (on && f.variants.length) {
            sub = '<div class="cco-sub' + enter('variants') + '" id="cco-variants"><span class="cco-sub-q">' + esc(f.choice_label || 'Which one?') + '</span><div class="cco-chips">' +
              f.variants.map(function (v) { return '<button type="button" class="cco-chip" data-act="variant" data-v="' + esc(v) + '" aria-pressed="' + (S.variant === v) + '">' + esc(v) + '</button>'; }).join('') + '</div></div>';
          }
        });
        h += '<button type="button" class="cco-cake" data-act="req" aria-pressed="' + S.req + '"><span class="cco-cake-vis">' + vis(null) + '</span><span class="cco-cake-txt"><span class="cco-cake-name">Something not on our menu</span><span class="cco-cake-from">Your idea. We send the price.</span></span><span class="cco-check-badge">' + ICON.tick + '</span></button>';
        return h + '</div>' + sub + err('product') + err('variant');
      } },
    { key: 'Size', q: function () { return S.req ? 'How big, and which flavour?' : 'What size?'; }, sub: null,
      summary: function () { if (S.req) return S.reqOk ? reqLine() : ''; return S.size == null ? '' : S.size + ' inch · ' + money(price()); },
      body: function () {
        if (S.req) {
          return '<div class="cco-field">' + lbl('cco-sizenote', 'Size or servings') + '<input type="text" class="cco-input' + (errors.size_note ? ' cco-bad' : '') + '" id="cco-sizenote" data-in="size_note" maxlength="80" value="' + esc(S.size_note) + '" placeholder="For example, two tiers, or about 30 people"' + described('size_note') + '>' + err('size_note') + '</div>' +
            '<div class="cco-field">' + lbl('cco-reqflav', 'Flavour', true) + '<input type="text" class="cco-input' + (errors.variant ? ' cco-bad' : '') + '" id="cco-reqflav" data-in="reqFlav" maxlength="80" value="' + esc(S.reqFlav) + '" placeholder="For example, chocolate"' + described('variant') + '><span class="cco-hint">Not sure? Leave it empty and we will suggest one.</span>' + err('variant') + '</div>' +
            '<button type="button" class="cco-primary" data-act="next1">Continue</button>';
        }
        var f = fl(), anyServes = f.sizes.some(function (s) { return s.serves; });
        var max = Math.max.apply(null, f.sizes.map(function (s) { return s.inch; }));
        var h = '<div class="cco-sizes" role="group" aria-label="Cake size">' + f.sizes.map(function (s) {
          var d = Math.round(24 + 30 * (s.inch / max));
          return '<button type="button" class="cco-size" data-act="size" data-v="' + s.inch + '" aria-pressed="' + (S.size === s.inch) + '"><span class="cco-ring" aria-hidden="true"><i style="width:' + d + 'px;height:' + d + 'px"></i></span><span><span class="cco-size-in">' + s.inch + '<em>inch</em></span><span class="cco-size-price">' + money(s.price) + '</span>' + (S.showServes && s.serves ? '<small>' + esc(s.serves) + '</small>' : '') + '</span></button>';
        }).join('') + '</div>';
        if (!S.showServes && anyServes) h += '<button type="button" class="cco-link" data-act="serves">How many does each size serve?</button>';
        return h + err('size');
      } },
    { key: 'Finish', q: 'How should it look?', sub: null,
      summary: function () { if (!S.finish || !S.diet || (S.finish === 'custom' && !S.design.trim())) return ''; return finishSummary(); },
      body: function () {
        var f = fl() || { supports_custom: true, supports_message: true };
        var h = S.req ? '' : '<div class="cco-opts" role="group" aria-label="Finish"><button type="button" class="cco-opt" data-act="finish" data-v="standard" aria-pressed="' + (S.finish === 'standard') + '">Standard finish<small>Our house decoration</small></button>' +
          (f.supports_custom ? '<button type="button" class="cco-opt" data-act="finish" data-v="custom" aria-pressed="' + (S.finish === 'custom') + '">Custom design<small>Your theme, colours or a photo. We confirm the price.</small></button>' : '') + '</div>' + err('finish');
        if (S.req) h += err('finish');
        if (!S.finish) return h;
        if (S.finish === 'custom') {
          h += '<div class="cco-field' + enter('custom') + '">' + lbl('cco-design', S.req ? 'What should it look like?' : 'Tell us about your design') + '<p class="cco-ask">' + ASK + '</p><textarea class="cco-input' + (errors.design ? ' cco-bad' : '') + '" id="cco-design" data-in="design" placeholder="For example, for my daughter turning 6, pink and gold, unicorn theme"' + described('design') + '>' + esc(S.design) + '</textarea>' + err('design') + '</div>';
          h += '<div class="cco-field' + enter('custom') + '"><span class="cco-lbl"><span>Inspiration photos</span>' + opt() + '</span>';
          if (S.photos.length) {
            h += '<div class="cco-thumbs">' + S.photos.map(function (p, i) {
              return '<div class="cco-thumb' + (p.status === 'busy' ? ' cco-busy' : p.status === 'failed' ? ' cco-failed' : '') + (p.isNew ? ' cco-enter' : '') + '">' + (p.url ? '<img src="' + p.url + '" alt="' + esc(p.name) + '">' : '') +
                '<button type="button" class="cco-thumb-x" data-act="photoX" data-v="' + i + '" aria-label="Remove ' + esc(p.name) + '">×</button></div>';
            }).join('') + '</div>';
          }
          if (S.photos.filter(function (p) { return p.status !== 'failed'; }).length < MAX_PHOTOS) {
            h += '<label class="cco-drop" id="cco-drop"><input type="file" id="cco-photos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple><span class="cco-drop-ico">' + ICON.upload + '</span><b>' + (S.photos.length ? 'Add another photo' : 'Tap to add a photo') + '</b><span>Or drag it here. JPG, PNG or HEIC, up to 5 MB, ' + MAX_PHOTOS + ' photos.</span></label>';
          }
          h += (busyPhotos() ? '<span class="cco-hint" aria-live="polite">Uploading ' + busyPhotos() + ' photo' + (busyPhotos() > 1 ? 's' : '') + '…</span>' : '') + err('photos') + '</div>';
        }
        var a0 = h.length;
        h += '<div class="cco-adds"><span class="cco-period">Anything to add?</span>';
        if (f.supports_message) {
          if (S.msgOpen) h += '<div class="cco-field' + enter('msg') + '"><div class="cco-lbl"><label for="cco-message">Message on the cake</label><span class="cco-lbl-r">' + opt() + '<button type="button" class="cco-hide" data-act="msgClose">Hide</button></span></div>' + '<input type="text" class="cco-input" id="cco-message" data-in="message" maxlength="40" value="' + esc(S.message) + '" placeholder="Happy 30th Priya"' + described('message') + '><span class="cco-counter" id="cco-count">' + S.message.length + ' / 40</span>' + err('message') + '</div>';
          else h += '<button type="button" class="cco-link" data-act="msgOpen"><span class="cco-plus" aria-hidden="true">' + (S.message.trim() ? '✓' : '+') + '</span>' + (S.message.trim() ? 'Message on the cake: “' + esc(S.message.trim()) + '”' : 'Add a message on the cake') + '</button>';
        }
        if (S.occOpen) h += '<div class="cco-field' + enter('occ') + '"><span class="cco-lbl"><span>Occasion</span><span class="cco-lbl-r">' + opt() + '<button type="button" class="cco-hide" data-act="occClose">Hide</button></span></span><div class="cco-chips" role="group" aria-label="Occasion">' + OCCASIONS.map(function (o) { return '<button type="button" class="cco-chip" data-act="occasion" data-v="' + o + '" aria-pressed="' + (S.occasion === o) + '">' + o + '</button>'; }).join('') + '</div></div>';
        else h += '<button type="button" class="cco-link" data-act="occOpen"><span class="cco-plus" aria-hidden="true">' + (S.occasion ? '✓' : '+') + '</span>' + (S.occasion ? 'Occasion: ' + esc(S.occasion) : 'Tell us the occasion') + '</button>';
        if (S.candOpen) h += '<div class="cco-field' + enter('cand') + '"><div class="cco-lbl"><label for="cco-candles">Candles</label><span class="cco-lbl-r">' + opt() + '<button type="button" class="cco-hide" data-act="candClose">Hide</button></span></div><input type="text" class="cco-input" id="cco-candles" data-in="candles" maxlength="60" value="' + esc(S.candles) + '" placeholder="For example, number 3 candle"' + described('candles') + '>' + err('candles') + '</div>';
        else h += '<button type="button" class="cco-link" data-act="candOpen"><span class="cco-plus" aria-hidden="true">' + (S.candles.trim() ? '✓' : '+') + '</span>' + (S.candles.trim() ? 'Candles: ' + esc(S.candles.trim()) : 'Add candles') + '</button>';
        if (S.noteOpen) h += '<div class="cco-field' + enter('note') + '"><div class="cco-lbl"><label for="cco-notes">Anything else we should know</label><span class="cco-lbl-r">' + opt() + '<button type="button" class="cco-hide" data-act="noteClose">Hide</button></span></div><textarea class="cco-input" id="cco-notes" data-in="notes" maxlength="300" rows="3" placeholder="For example, it is a surprise, please do not call before 5 PM"' + described('notes') + '>' + esc(S.notes) + '</textarea>' + err('notes') + '</div>';
        else h += '<button type="button" class="cco-link" data-act="noteOpen"><span class="cco-plus" aria-hidden="true">' + (S.notes.trim() ? '✓' : '+') + '</span>' + (S.notes.trim() ? 'Note added' : 'Add a note for our team') + '</button>';
        h += '</div>'; var a1 = h.length;
        h += '<div class="cco-field"><span class="cco-lbl" id="cco-diet-l"><span>Any dietary needs or allergies?</span></span><div class="cco-yesno" role="group" aria-labelledby="cco-diet-l"><button type="button" class="cco-chip" data-act="diet" data-v="no" aria-pressed="' + (S.diet === 'no') + '">No</button><button type="button" class="cco-chip" data-act="diet" data-v="yes" aria-pressed="' + (S.diet === 'yes') + '">Yes</button><button type="button" class="cco-chip" data-act="diet" data-v="unsure" aria-pressed="' + (S.diet === 'unsure') + '">Not sure</button></div>' + (S.diet === 'unsure' ? '<p class="cco-hint">No problem. We will check with you about allergies before we bake.</p>' : '') + err('diet') + '</div>';
        if (S.diet === 'yes') h += '<div class="cco-sub' + enter('diet') + '"><span class="cco-sub-q">Which apply?</span><div class="cco-chips">' + DIETS.map(function (d) { return '<button type="button" class="cco-chip" data-act="diets" data-v="' + esc(d) + '" aria-pressed="' + (S.diets.indexOf(d) > -1) + '">' + esc(d) + '</button>'; }).join('') + '</div><div class="cco-field">' + lbl('cco-dnote', 'Anything our team should know', true) + '<input type="text" class="cco-input" data-in="dietNote" id="cco-dnote" value="' + esc(S.dietNote) + '" placeholder="For example, severe peanut allergy"></div><span class="cco-hint">Our team confirms what can be prepared before your order is confirmed.</span></div>';
        h = h.slice(0, a0) + h.slice(a1) + h.slice(a0, a1);  // allergies first, then the optional extras, as at the counter
        return h + '<button type="button" class="cco-primary" data-act="next2">Continue</button>';
      } },
    { key: 'Collection', q: 'When do you need it?', sub: function () { return isDel() ? 'Choose your area. The delivery fee is added to the price.' : 'Collect from our counter' + (SETUP.location.address ? ' at ' + SETUP.location.address : '') + ', or choose delivery.'; },
      summary: function () { return S.date && S.time && delOk() ? (isDel() ? 'Delivery, ' + S.zone + ' · ' : '') + nice(S.date) + ' at ' + t12(S.time) : ''; },
      body: function () {
        var zs = zones(), h = '';
        if (zs.length) {
          h += '<div class="cco-field"><div class="cco-opts cco-opts-2" role="group" aria-label="Collection or delivery">' +
            [['collection', 'Collect from the café', 'No extra charge'], ['delivery', 'Delivery', 'From ' + money(Math.min.apply(null, zs.map(function (z) { return Number(z.fee); })))]].map(function (o) {
              return '<button type="button" class="cco-opt" data-act="method" data-v="' + o[0] + '" aria-pressed="' + (S.method === o[0]) + '"><b>' + o[1] + '</b><span>' + o[2] + '</span></button>'; }).join('') + '</div></div>';
          if (isDel()) {
            h += '<div class="cco-field"><span class="cco-period">Delivery area</span><div class="cco-times" role="group" aria-label="Delivery area">' + zs.map(function (z) {
              return '<button type="button" class="cco-chip" data-act="zone" data-v="' + esc(z.name) + '" aria-pressed="' + (S.zone === z.name) + '">' + esc(z.name) + ' · ' + money(z.fee) + '</button>'; }).join('') + '</div>' +
              '<p class="cco-hint">Another area? Call us on ' + esc(SETUP.location.phone) + '.</p>' + err('zone') + '</div>' +
              '<div class="cco-field"><div class="cco-lbl"><label for="cco-address">Delivery address</label></div><textarea id="cco-address" class="cco-in' + (errors.address ? ' cco-bad' : '') + '" data-in="address" rows="2" maxlength="200" placeholder="For example: Room 214, Sofitel, Denarau"' + described('address') + '>' + esc(S.address) + '</textarea>' + err('address') + '</div>' +
              '<div class="cco-field"><div class="cco-lbl"><label for="cco-receiver">Who will receive it?</label><span class="cco-lbl-r">' + opt() + '</span></div><input id="cco-receiver" class="cco-in" data-in="receiver" maxlength="80" value="' + esc(S.receiver) + '" placeholder="For example: front desk"></div>';
          }
        }
        h += (S.dateNote ? '<p class="cco-notice" role="status">' + esc(S.dateNote) + '</p>' : '') + '<button type="button" class="cco-date' + (errors.date ? ' cco-bad' : '') + '" data-act="cal"' + described('date') + '><span class="cco-date-l"><span class="cco-date-ico">' + ICON.cal + '</span><span>' + (S.date ? esc(longDate(S.date)) : 'Choose a date') + '</span></span><span class="cco-date-r">' + (S.date ? 'Change' : 'Open calendar') + '</span></button>' + err('date');
        if (S.date) {
          var L = SETUP.location, o = L.collection_open.split(':').map(Number), c = L.collection_close.split(':').map(Number), groups = [['Morning', []], ['Afternoon', []], ['Evening', []]];
          for (var m = o[0] * 60 + o[1]; m <= c[0] * 60 + c[1]; m += L.slot_minutes) { var hh = Math.floor(m / 60), t = String(hh).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); groups[hh < 12 ? 0 : hh < 17 ? 1 : 2][1].push(t); }
          h += '<div class="cco-field' + enter('times') + '">';
          groups.forEach(function (g) { if (!g[1].length) return; h += '<span class="cco-period">' + g[0] + '</span><div class="cco-times" role="group" aria-label="' + g[0] + ' times">' + g[1].map(function (t) { return '<button type="button" class="cco-chip" data-act="time" data-v="' + t + '" aria-pressed="' + (S.time === t) + '">' + t12(t) + '</button>'; }).join('') + '</div>'; });
          h += err('time') + '</div>';
        }
        return h;
      } },
    { key: 'Your details', q: 'Where can we reach you?', sub: 'We only use these to confirm your order.',
      summary: function () { return S.detailsOk ? S.name.trim() + ' · ' + S.phone.trim() : ''; },
      body: function () {
        var h = '<div class="cco-field">' + lbl('cco-name', 'Full name') + '<input type="text" class="cco-input' + (errors.name ? ' cco-bad' : '') + '" id="cco-name" data-in="name" autocomplete="name" value="' + esc(S.name) + '"' + described('name') + '>' + err('name') + '</div>' +
          '<div class="cco-field">' + lbl('cco-phone', 'Mobile number') + '<input type="tel" class="cco-input' + (errors.phone ? ' cco-bad' : '') + '" id="cco-phone" data-in="phone" autocomplete="tel" inputmode="tel" placeholder="912 3456" value="' + esc(S.phone) + '"' + described('phone') + '>' + err('phone') + '</div>' +
          '<label class="cco-check"><input type="checkbox" data-chk="whatsapp"' + (S.whatsapp ? ' checked' : '') + '> <span>Message me on WhatsApp to confirm</span></label>';
        h += S.emailOpen ? '<div class="cco-field' + enter('email') + '">' + lbl('cco-email', 'Email', true) + '<input type="email" class="cco-input' + (errors.email ? ' cco-bad' : '') + '" id="cco-email" data-in="email" autocomplete="email" inputmode="email" value="' + esc(S.email) + '"' + described('email') + '><span class="cco-hint">' + (SETUP.guest_emails ? 'We email your order details here.' : 'Only used if we can\'t reach you by phone.') + '</span>' + err('email') + '</div>' : '<button type="button" class="cco-link" data-act="emailOpen"><span class="cco-plus" aria-hidden="true">+</span>' + (SETUP.guest_emails ? 'Add an email for your confirmation' : 'Add an email') + '</button>';
        h += '<label class="cco-check"><input type="checkbox" data-chk="updates"' + (S.updates ? ' checked' : '') + '> <span>Send me Corner Café cake specials and reminders, and offers from Jack&#39;s Restaurants</span></label>';
        return h + '<button type="button" class="cco-primary" data-act="toReview">Continue to review</button>';
      } },
    { key: 'Review', q: 'Check your order', sub: 'Make sure everything is right.',
      summary: function () { return ''; },
      body: function () {
        var f = fl(), photos = donePhotos(), h = '<div class="cco-review">';
        h += S.req ? row('', 'Your cake', 'Custom cake', esc(reqLine()), 1) : row('', 'Your cake', esc(cakeName()), esc(S.size + ' inch' + (sz() && sz().serves ? ' · ' + sz().serves : '')), 0);
        var d = [];
        if (S.finish === 'custom') d.push('<span class="cco-rv-d">' + esc(S.design.trim()) + '</span>');
        if (S.message.trim()) d.push('<span class="cco-rv-d">Message: “' + esc(S.message.trim()) + '”</span>');
        if (S.occasion) d.push('<span class="cco-rv-d">Occasion: ' + esc(S.occasion) + '</span>');
        if (S.candles.trim()) d.push('<span class="cco-rv-d">Candles: ' + esc(S.candles.trim()) + '</span>');
        if (S.notes.trim()) d.push('<span class="cco-rv-d">Note: ' + esc(S.notes.trim()) + '</span>');
        d.push(S.diet === 'yes' ? '<span class="cco-rv-d cco-alert">Dietary: ' + esc([S.diets.join(', '), S.dietNote.trim()].filter(Boolean).join('. ')) + '</span>' : S.diet === 'unsure' ? '<span class="cco-rv-d cco-alert">Allergies: not sure yet. We will check with you before we bake.</span>' : '<span class="cco-rv-d">No dietary needs</span>');
        if (photos.length) d.push('<span class="cco-rv-thumbs">' + photos.map(function (p) { return p.url ? '<img src="' + p.url + '" alt="' + esc(p.name) + '">' : ''; }).join('') + '</span><span class="cco-rv-d">' + photos.length + ' photo' + (photos.length > 1 ? 's' : '') + ' attached</span>');
        h += row('', 'Design and dietary', S.req ? 'Your design' : S.finish === 'custom' ? 'Custom design' : 'Standard finish', d.join(''), 2, true);
        h += isDel() ? row('', 'Delivery', esc(longDate(S.date)) + ' at ' + t12(S.time), esc(S.zone + ' · ' + S.address.trim() + (S.receiver.trim() ? ' · For ' + S.receiver.trim() : '')), 3)
          : row('', 'Collection', esc(longDate(S.date)) + ' at ' + t12(S.time), SETUP.location.address ? esc('Corner Café, ' + SETUP.location.address) : 'Corner Café counter', 3);
        h += row('', 'Contact details', esc(S.name.trim()), esc([S.phone.trim() + (S.whatsapp ? ' (WhatsApp)' : ''), S.email.trim()].filter(Boolean).join(' · ')), 4);
        h += '</div>';
        h += S.req
          ? '<div class="cco-total cco-total-q">' + (isDel() ? '<div class="cco-price"><span>Delivery<small>' + esc(S.zone) + '</small></span><strong>' + money(zoneFee()) + '</strong></div>' : '') + '<div class="cco-price cco-pending"' + (isDel() ? '' : ' style="padding-top:0;border-top:0"') + '><span>Cake price<small>We send it to you after we look at your design</small></span><em>To be confirmed</em></div></div>'
          : S.finish === 'custom'
          ? '<div class="cco-total cco-total-q"><div class="cco-price"><span>Cake price<small>' + esc(S.size + ' inch ' + cakeName()) + '</small></span><strong>' + money(price()) + '</strong></div><div class="cco-price cco-pending"><span>Custom design</span><em>To be confirmed</em></div></div>'
          : '<div class="cco-total"><span>Price<small>' + esc(S.size + ' inch ' + cakeName()) + ', standard finish' + (isDel() ? ', plus delivery to ' + S.zone + ' ' + money(zoneFee()) : '') + '</small></span><strong>' + money(total()) + '</strong></div>';
        if (!S.req && S.finish === 'custom' && isDel()) h = h.replace('<div class="cco-price cco-pending">', '<div class="cco-price"><span>Delivery<small>' + esc(S.zone) + '</small></span><strong>' + money(zoneFee()) + '</strong></div><div class="cco-price cco-pending">');
        h += S.know ? '<div class="cco-know"><p><b>No payment now.</b></p><p>We confirm availability, the ' + (S.req || S.finish === 'custom' ? 'final price' : 'price') + ' and any deposit with you.</p><p>Your cake is booked once we confirm it.</p></div>' : '<button type="button" class="cco-link" data-act="know"><span class="cco-plus" aria-hidden="true">i</span>Good to know before you send</button>';
        if (formError) h += '<p class="cco-err cco-formerr" role="alert">' + esc(formError) + '</p>';
        var busy = busyPhotos();
        return h + '<button type="button" class="cco-primary" data-act="send"' + (S.sending || busy ? ' disabled' : '') + '>' + (S.sending ? '<span class="cco-spin" aria-hidden="true"></span>Sending your request…' : busy ? '<span class="cco-spin" aria-hidden="true"></span>Waiting for photos…' : 'Send cake request') + '</button>';
      } }
  ];
  function row(icon, k, v, d, step, raw) {
    return '<div class="cco-rv"><span><span class="cco-rv-k">' + k + '</span><span class="cco-rv-v">' + v + '</span>' + (raw ? d : '<span class="cco-rv-d">' + d + '</span>') + '</span><button type="button" class="cco-rv-edit" data-act="edit" data-v="' + step + '" aria-label="Edit ' + k.toLowerCase().replace(/^your /, '') + '">Edit</button></div>';
  }
  function stateOf(i) { return i === open ? 'open' : (i <= reached && STEPS[i].summary() ? 'done' : 'locked'); }

  function render(focusSel) {
    var n = STEPS.length, L0 = SETUP.location, h = (reached === 0 ? '<div class="cco-strip"><p><b>No payment now.</b> Order at least ' + L0.lead_days_standard + (L0.lead_days_standard == 1 ? ' day' : ' days') + ' ahead' + (L0.lead_days_custom > L0.lead_days_standard ? ', or ' + L0.lead_days_custom + ' days for a custom design' : '') + '.</p><button type="button" class="cco-strip-btn" data-act="how" aria-expanded="' + S.howOpen + '">How it works</button>' + (S.howOpen ? '<ol class="cco-strip-steps"><li><b>Choose your cake</b><span>Flavour, size and finish</span></li><li><b>Pick a day</b><span>Collect from our counter</span></li><li><b>We confirm</b><span>By WhatsApp or a call, before anything is booked</span></li></ol>' : '') + '</div>' : '') + '<div class="cco-progress" aria-hidden="true"><div class="cco-progress-track"><i style="width:' + Math.round((open + 1) / n * 100) + '%"></i></div><span>Step ' + (open + 1) + ' of ' + n + ' <b>' + STEPS[open].key + '</b></span></div><div class="cco-steps">';
    STEPS.forEach(function (s, i) {
      var st = stateOf(i); if (st === 'locked' || (open === STEPS.length - 1 && st === 'done')) return;
      var sub = typeof s.sub === 'function' ? s.sub() : s.sub;
      h += '<section class="cco-step' + (st === 'open' ? ' cco-open' : '') + '" id="cco-step-' + i + '" aria-label="' + s.key + '">' + (st === 'done'
        ? '<button type="button" class="cco-sum" data-act="edit" data-v="' + i + '"><span class="cco-tickdot" aria-hidden="true">' + ICON.tick + '</span><span><span class="cco-sum-k">' + s.key + '</span><span class="cco-sum-v">' + esc(s.summary()) + '</span></span><span class="cco-sum-e">Change</span></button>'
        : '<div class="cco-body' + (i === animStep ? ' cco-enter' : '') + '"><div class="cco-head"><h2 class="cco-q" tabindex="-1">' + (typeof s.q === 'function' ? s.q() : s.q) + '</h2>' + (i > 0 ? '<button type="button" class="cco-back" data-act="edit" data-v="' + (i - 1) + '">Back<span class="cco-sr"> to ' + esc(STEPS[i - 1].key.toLowerCase()) + '</span></button>' : '') + '</div>' + (sub ? '<p class="cco-qsub">' + esc(sub) + '</p>' : '') + s.body() + '</div>') + '</section>';
    });
    root.innerHTML = h + '</div>';
    fresh = {}; animStep = -1; S.photos.forEach(function (p) { p.isNew = false; });
    var p = price(), bar = document.getElementById('cco-bar'), showBar = !!p && open < 5;
    root.classList.toggle('cco-has-bar', showBar);
    if (bar) { bar.classList.toggle('cco-show', showBar); bar.querySelector('span').textContent = [cakeName(), S.size != null ? S.size + ' inch' : ''].filter(Boolean).join(' · '); bar.querySelector('strong').textContent = p ? money(p) : ''; }
    if (focusSel) { var el = root.querySelector(focusSel); if (el) { el.focus({ preventScroll: true }); reveal(el.closest('.cco-field') || el); } }
  }
  function go(i, errs, forceScroll) {
    var from = open, changed = i !== open, aOld = document.getElementById('cco-step-' + from), aNew = document.getElementById('cco-step-' + i);
    var oldTop = aOld ? aOld.getBoundingClientRect().top : null, newTop = aNew ? aNew.getBoundingClientRect().top : null;
    lockHeight(); open = i; reached = Math.max(reached, i); errors = errs || {}; formError = null; if (changed) animStep = i; render();
    var el = document.getElementById('cco-step-' + i); if (!el) return;
    if (changed) keepAnchor(from, oldTop, i, newTop);
    if (errs && Object.keys(errs).length) return toFirstError();
    if (changed || forceScroll) { var q = el.querySelector('.cco-q'); if (q) q.focus({ preventScroll: true }); place(el); }
  }
  // ---------- viewport positioning ----------
  var scrollJob = 0, scrolling = 0;
  function settle(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function viewH() { return window.visualViewport ? window.visualViewport.height : window.innerHeight; }
  function topCover() {
    var off = 0, xs = [8, window.innerWidth / 2, window.innerWidth - 8];
    if (!document.elementsFromPoint) return 0;
    xs.forEach(function (x) {
      document.elementsFromPoint(x, 2).forEach(function (e) {
        for (var n = e; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
          if (root.contains(n)) break;
          var pos = getComputedStyle(n).position;
          if (pos === 'fixed' || pos === 'sticky') { var r = n.getBoundingClientRect(); if (r.top <= 2 && r.bottom > off && r.bottom < viewH() * 0.4) off = r.bottom; break; }
        }
      });
    });
    // A site header that hides while scrolling down and slides back on the way up must still be allowed for,
    // otherwise the step heading ends up under it. Count any sticky or fixed header at its full height.
    [].forEach.call(document.querySelectorAll('header, [class*="header"]'), function (n) {
      if (root.contains(n) || n.contains(root)) return;
      var cs = getComputedStyle(n); if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      var h = n.offsetHeight + Math.max(0, parseFloat(cs.top) || 0);
      if (h > off && h < viewH() * 0.4) off = h;
    });
    return off;
  }
  function bottomCover() { var b = document.getElementById('cco-bar'); if (!b || !b.classList.contains('cco-show')) return 0; var r = b.getBoundingClientRect(); return r.top < viewH() ? viewH() - r.top : 0; }
  // Keep the page still while the form redraws: hold its height (no clamping when a step closes)
  // and keep the step the guest was looking at in the same place on screen.
  var releaseTimer = 0;
  function jumpTo(y) { var st = document.documentElement.style, prev = st.scrollBehavior; st.scrollBehavior = 'auto'; window.scrollTo(0, Math.max(0, Math.round(y))); st.scrollBehavior = prev; }
  function lockHeight() { clearTimeout(releaseTimer); root.style.minHeight = root.offsetHeight + 'px'; }
  function releaseHeight() {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(function () {
      if (scrolling && Date.now() - scrolling < 1200) return releaseHeight();
      var y = window.pageYOffset, h = root.offsetHeight; root.style.minHeight = '';
      if (window.pageYOffset < y - 1) { root.style.minHeight = (h - (y - window.pageYOffset)) + 'px'; jumpTo(y); }
    }, 900);
  }
  function keepAnchor(from, oldTop, to, newTop) {
    var a = document.getElementById('cco-step-' + from), t = oldTop;
    if (!a || t == null) { a = document.getElementById('cco-step-' + to); t = newTop; }
    if (!a || t == null) return;
    var d = a.getBoundingClientRect().top - t;
    if (Math.abs(d) > 1) jumpTo(window.pageYOffset + d);
  }
  function scrollToY(y) {
    y = Math.max(0, Math.round(y));
    if (Math.abs(y - window.pageYOffset) >= 4) {
      var smooth = !reduced() && 'scrollBehavior' in document.documentElement.style;
      scrolling = smooth ? Date.now() : 0;
      if (smooth) window.scrollTo({ top: y, behavior: 'smooth' }); else jumpTo(y);
    }
    releaseHeight();
  }
  // a new step: centre it when it fits, otherwise start it near the top
  function place(el) {
    var job = ++scrollJob;
    settle(function () {
      if (job !== scrollJob || !document.contains(el)) return;
      var top = topCover() + 16, avail = viewH() - top - bottomCover() - 16, r = el.getBoundingClientRect();
      scrollToY(window.pageYOffset + r.top - top - (r.height < avail ? (avail - r.height) / 2 : 0));
    });
  }
  // keep something visible, moving only when it is not
  function reveal(el, then) {
    if (!el) return;
    var job = ++scrollJob;
    settle(function () {
      if (job !== scrollJob || !document.contains(el)) return;
      var top = topCover() + 16, bottom = viewH() - bottomCover() - 16, r = el.getBoundingClientRect();
      if (r.top >= top && r.bottom <= bottom) releaseHeight(); else scrollToY(window.pageYOffset + r.top - top - (r.height < bottom - top ? Math.min(40, (bottom - top - r.height) / 2) : 0));
      if (then) then();
    });
  }
  function toFirstError() {
    var er = root.querySelector('.cco-err:not(.cco-formerr)') || root.querySelector('.cco-formerr'); if (!er) return;
    var box = er.closest('.cco-field') || er.previousElementSibling || er;
    var target = box.querySelector ? (box.querySelector('[aria-invalid="true"]') || box.querySelector('input:not([type=file]), textarea, button')) : null;
    if (!target && box.matches && box.matches('button, input, textarea')) target = box;
    reveal(box, function () { if (target) target.focus({ preventScroll: true }); });
  }
  ['wheel', 'touchstart', 'pointerdown'].forEach(function (t) { window.addEventListener(t, function () { if (scrolling && Date.now() - scrolling < 1200) { scrollJob++; scrolling = 0; jumpTo(window.pageYOffset); } }, { passive: true }); });
  window.addEventListener('keydown', function (e) { if (scrolling && /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) { scrollJob++; scrolling = 0; } });
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function nextIncomplete(from) { for (var i = from; i < STEPS.length; i++) if (!STEPS[i].summary() || i === STEPS.length - 1) return i; return STEPS.length - 1; }

  // ---------- photos ----------
  function upload(files) {
    delete errors.photos;
    var room = MAX_PHOTOS - S.photos.filter(function (p) { return p.status !== 'failed'; }).length;
    var list = Array.prototype.slice.call(files, 0, Math.max(0, room));
    if (files.length > list.length) errors.photos = 'You can add up to ' + MAX_PHOTOS + ' photos.';
    list.forEach(function (file) {
      if (file.type && !/^image\//.test(file.type)) { errors.photos = file.name + ' is not a photo. Please choose an image file.'; return; }
      if (file.size > 5 * 1024 * 1024) { errors.photos = file.name + ' is over 5 MB. Please choose a smaller photo.'; return; }
      var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60) || 'photo.jpg', path = 'incoming/' + uid() + '/' + safe;
      var ph = { name: file.name, path: path, url: null, status: 'busy', isNew: true };
      try { ph.url = URL.createObjectURL(file); } catch (e) { ph.url = null; }
      S.photos.push(ph);
      sb.storage.from('cake-references').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false }).then(function (r) {
        if (S.photos.indexOf(ph) < 0) return;
        if (r.error) { ph.status = 'failed'; errors.photos = 'We could not upload ' + file.name + '. Remove it and try again, or share it with us on WhatsApp.'; }
        else ph.status = 'done';
        render();
      }, function () { if (S.photos.indexOf(ph) < 0) return; ph.status = 'failed'; errors.photos = 'Photo upload failed. Check your connection and try again.'; render(); });
    });
    render();
  }
  function removePhoto(i) {
    var ph = S.photos[i]; if (!ph) return;
    if (ph.url) { try { URL.revokeObjectURL(ph.url); } catch (e) {} }
    S.photos.splice(i, 1);
    if (!S.photos.some(function (p) { return p.status === 'failed'; })) delete errors.photos;
    render('#cco-drop');
  }

  // ---------- send ----------
  var FIELD_STEP = { product: 0, variant: 0, size: 1, size_note: 1, finish: 2, design: 2, message: 2, candles: 2, notes: 2, diet: 2, date: 3, time: 3, zone: 3, address: 3, fee: 3, method: 3, name: 4, phone: 4, email: 4 };
  function checkDetails() {
    errors = {}; formError = null;
    if (S.name.trim().length < 2) errors.name = 'Enter your name.';
    if (S.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a mobile number, for example 912 3456.';
    if (S.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.email.trim())) errors.email = 'Check the email address, for example name@example.com.';
    return !Object.keys(errors).length;
  }
  function send() {
    errors = {}; formError = null;
    S.sending = true; render();
    var p = { idempotency_key: KEY, location: 'corner-cafe', product_code: S.req ? 'custom-cake' : S.flavour, variant: S.req ? S.reqFlav.trim() : S.variant, size_inch: S.req ? null : S.size, size_note: S.req ? S.size_note.trim() : null, finish: S.req ? 'custom' : S.finish, design: S.design, message: S.message, occasion: S.occasion, candles: S.candles.trim(), notes: S.notes.trim(),
      has_dietary: S.diet, dietary: S.diet === 'yes' ? S.diets : [], dietary_note: S.dietNote, date: S.date, time: S.time, attachments: donePhotos().map(function (x) { return x.path; }),
      customer: { name: S.name.trim(), phone: S.phone.trim(), email: S.email.trim(), whatsapp: S.whatsapp, opt_in: S.updates },
      delivery: isDel() ? { method: 'delivery', zone: S.zone, address: S.address.trim(), contact: S.receiver.trim() } : { method: 'collection' } };
    sb.rpc('submit_online_order', { p: p }).then(function (r) {
      S.sending = false;
      if (r.error) { formError = 'We could not send your request. Check your connection and try again, or call us on ' + SETUP.location.phone + '.'; return render(); }
      var d = r.data;
      if (!d.ok) {
        var st = S.req && d.field === 'variant' ? 1 : FIELD_STEP[d.field];
        if (st != null) {
          if (st === 4) S.detailsOk = false;
          var fe = {}; fe[d.field] = d.message; go(st, fe, true);
          return;
        }
        formError = d.message || 'We could not send your request. Please try again.';
        return render();
      }
      done(d);
    }, function () { S.sending = false; formError = 'We could not send your request. Check your connection and try again.'; render(); });
  }
  function copyRef(b) {
    var v = b.dataset.v, ok = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 2000); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(ok, function () { if (fallbackCopy(v)) ok(); });
    else if (fallbackCopy(v)) ok();
  }
  function fallbackCopy(v) { var t = document.createElement('textarea'); t.value = v; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var r = false; try { r = document.execCommand('copy'); } catch (e) {} t.remove(); return r; }
  function done(d) {
    var bar = document.getElementById('cco-bar'); if (bar) bar.classList.remove('cco-show');
    root.classList.remove('cco-has-bar');
    lockHeight();
    var quote = d.status === 'awaiting_quote', how = S.whatsapp ? 'message you on WhatsApp' : 'call you', L = SETUP.location;
    var f = fl();
    root.innerHTML = '<div class="cco-done" role="status" tabindex="-1"><div class="cco-done-head"><div class="cco-tick" aria-hidden="true">' + ICON.tick + '</div>' +
      '<h2>Thanks ' + esc(S.name.trim().split(' ')[0]) + ', we’ve received your cake request.</h2>' +
      '<div class="cco-refbox"><span class="cco-refbox-k">Your reference</span><b class="cco-refbox-v">' + esc(d.reference) + '</b><button type="button" class="cco-copy" data-act="copyRef" data-v="' + esc(d.reference) + '">Copy</button></div></div>' +
      '<div class="cco-done-cake"><span class="cco-rv-vis">' + vis(f) + '</span><span><b>' + esc(S.req ? 'Custom cake' + (reqLine() ? ', ' + reqLine() : '') : cakeName() + ', ' + S.size + ' inch') + '</b><span>' + (S.req ? 'Your design' : S.finish === 'custom' ? 'Custom design' : 'Standard finish') + ' · Requested for ' + esc(longDate(S.date)) + ' at ' + esc(t12(S.time)) + '</span></span></div>' +
      '<p class="cco-status"><strong>Request received, not yet confirmed.</strong> ' + (quote ? 'Our cake team will send you a price for your design first.' : 'Our cake team reviews every request before it is booked.') + '</p>' +
      '<ol class="cco-next">' +
        '<li data-n="1" class="cco-now"><span><b>Request received</b><span>' + (SETUP.guest_emails && S.email.trim() ? 'We have emailed the details to ' + esc(S.email.trim()) + '.' : 'Keep your reference handy.') + '</span></span></li>' +
        '<li data-n="2"><span><b>' + (quote ? 'Our team sends your price' : 'Our team reviews and confirms your cake') + '</b><span>We ' + how + ' on ' + esc(S.phone.trim()) + (quote ? ' with the final price and any deposit.' : ' to confirm availability and any deposit.') + '</span></span></li>' +
        (isDel() ? '<li data-n="3"><span><b>We deliver your cake</b><span>At the agreed time, once confirmed, to ' + esc(S.address.trim()) + ', ' + esc(S.zone) + '.</span></span></li>'
          : '<li data-n="3"><span><b>Collect your cake</b><span>At the agreed time, once confirmed, from our counter' + (L.address ? ' at ' + esc(L.address) : '') + '.</span></span></li>') +
      '</ol>' +
      '<div class="cco-help-line"><p>Need to change something? Call us and quote your reference.</p><div class="cco-done-actions"><a class="cco-act" href="tel:' + esc(String(L.phone).replace(/[^\d+]/g, '')) + '">Call ' + esc(L.phone) + '</a><a class="cco-act cco-act-ghost" href="/">Back to Corner Café</a></div></div></div>';
    var box = root.querySelector('.cco-done'); box.focus({ preventScroll: true }); place(box);
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act, v = b.dataset.v;
    if (a === 'edit') return go(Number(v));
    if (a === 'req') {
      if (!S.req) { S.req = true; S.flavour = null; S.variant = null; S.size = null; S.finish = 'custom'; delete errors.product; }
      checkDate('A custom cake'); return go(nextIncomplete(1));
    }
    if (a === 'next1') {
      errors = {};
      if (S.size_note.trim().length < 2) errors.size_note = 'Tell us the size, or how many people it should serve.';
      if (Object.keys(errors).length) { render(); return toFirstError(); }
      S.reqOk = true; return go(nextIncomplete(2));
    }
    if (a === 'flavour') {
      if (S.req) { S.req = false; S.reqOk = false; S.finish = null; }
      if (S.flavour !== v) { S.flavour = v; S.variant = null; fresh.variants = true; var f = fl(); if (S.size != null && !f.sizes.some(function (s) { return s.inch === S.size; })) S.size = null; if (!f.supports_custom && S.finish === 'custom') S.finish = null; }
      checkDate('This cake'); if (!fl().variants.length) return go(nextIncomplete(1));
      render(); reveal(document.getElementById('cco-variants')); return;
    }
    if (a === 'variant') { S.variant = v; checkDate('This cake'); return go(nextIncomplete(1)); }
    if (a === 'serves') { S.showServes = true; return render(); }
    if (a === 'size') { S.size = Number(v); return go(nextIncomplete(2)); }
    if (a === 'finish') { if (S.finish !== v && v === 'custom') fresh.custom = true; S.finish = v; delete errors.finish; checkDate(v === 'custom' ? 'A custom design' : 'This cake'); return render(v === 'custom' ? '#cco-design' : null); }
    if (a === 'photoX') return removePhoto(Number(v));
    if (a === 'how') { S.howOpen = !S.howOpen; return render(); }
    if (a === 'msgClose') { S.msgOpen = false; return render(); }
    if (a === 'occClose') { S.occOpen = false; return render(); }
    if (a === 'candClose') { S.candOpen = false; return render(); }
    if (a === 'noteClose') { S.noteOpen = false; return render(); }
    if (a === 'candOpen') { S.candOpen = true; fresh.cand = true; return render('#cco-candles'); }
    if (a === 'noteOpen') { S.noteOpen = true; fresh.note = true; return render('#cco-notes'); }
    if (a === 'copyRef') { copyRef(b); return; }
    if (a === 'msgOpen') { S.msgOpen = true; fresh.msg = true; return render('#cco-message'); }
    if (a === 'occOpen') { S.occOpen = true; fresh.occ = true; return render(); }
    if (a === 'occasion') { S.occasion = S.occasion === v ? null : v; return render(); }
    if (a === 'diet') { if (v === 'yes' && S.diet !== 'yes') fresh.diet = true; S.diet = v; if (v !== 'yes') { S.diets = []; S.dietNote = ''; } delete errors.diet; return render(); }
    if (a === 'diets') { var k = S.diets.indexOf(v); if (k > -1) S.diets.splice(k, 1); else S.diets.push(v); delete errors.diet; return render(); }
    if (a === 'next2') {
      errors = {};
      if (S.finish === 'custom' && !S.design.trim()) errors.design = 'Describe your design so our team can price it.';
      if (!S.finish) errors.finish = 'Choose a finish.';
      if (!S.diet) errors.diet = 'Please answer No, Yes or Not sure.';
      if (S.diet === 'yes' && !S.diets.length && !S.dietNote.trim()) errors.diet = 'Tell us which dietary need or allergy applies.';
      if (Object.keys(errors).length) { render(); return toFirstError(); }
      return go(nextIncomplete(3));
    }
    if (a === 'cal') return openCal();
    if (a === 'time') { S.time = v; if (!delOk()) { errors = {}; if (!S.zone) errors.zone = 'Choose your delivery area.'; if (S.address.trim().length < 5) errors.address = 'Enter the delivery address.'; render(); return toFirstError(); } return go(nextIncomplete(4)); }
    if (a === 'method') { S.method = v; if (v !== 'delivery') { delete errors.zone; delete errors.address; } return render(); }
    if (a === 'zone') { S.zone = v; delete errors.zone; return render(); }
    if (a === 'emailOpen') { S.emailOpen = true; fresh.email = true; return render('#cco-email'); }
    if (a === 'toReview') {
      if (!checkDetails()) { render(); return toFirstError(); }
      S.detailsOk = true; return go(nextIncomplete(5));
    }
    if (a === 'know') { S.know = true; return render(); }
    if (a === 'send') return send();
  });
  root.addEventListener('input', function (e) {
    var k = e.target.dataset.in; if (!k) return; S[k] = e.target.value;
    if (k === 'name' || k === 'phone' || k === 'email') S.detailsOk = false;
    if (k === 'size_note' || k === 'reqFlav') S.reqOk = false;
    if (k === 'message') { var c = document.getElementById('cco-count'); if (c) c.textContent = S.message.length + ' / 40'; }
    if (errors[k]) { delete errors[k]; e.target.classList.remove('cco-bad'); e.target.removeAttribute('aria-invalid'); var n = document.getElementById('cco-err-' + k); if (n) n.remove(); }
  });
  root.addEventListener('change', function (e) {
    var k = e.target.dataset.chk; if (k) S[k] = e.target.checked;
    if (e.target.id === 'cco-photos' && e.target.files.length) upload(e.target.files);
  });
  ['dragenter', 'dragover'].forEach(function (t) { root.addEventListener(t, function (e) { var z = e.target.closest && e.target.closest('.cco-drop'); if (!z) return; e.preventDefault(); z.classList.add('cco-over'); }); });
  root.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('.cco-drop'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('cco-over'); });
  root.addEventListener('drop', function (e) { var z = e.target.closest && e.target.closest('.cco-drop'); if (!z) return; e.preventDefault(); z.classList.remove('cco-over'); if (e.dataTransfer && e.dataTransfer.files.length) upload(e.dataTransfer.files); });

  // ---------- calendar ----------
  var view = null, lastFocus = null, shade;
  function buildCal() {
    shade = document.createElement('div'); shade.className = 'cco-shade'; shade.setAttribute('aria-hidden', 'true');
    shade.innerHTML = '<div class="cco-sheet" role="dialog" aria-modal="true" aria-label="Choose a collection date"><div class="cco-cal-head"><button type="button" class="cco-nav" data-nav="-1" aria-label="Previous month">‹</button><b aria-live="polite"></b><button type="button" class="cco-nav" data-nav="1" aria-label="Next month">›</button></div><div class="cco-grid"></div><p class="cco-cal-note"></p><button type="button" class="cco-close">Close</button></div>';
    document.body.appendChild(shade);
    shade.addEventListener('click', function (e) {
      if (e.target === shade || e.target.classList.contains('cco-close')) return closeCal();
      var n = e.target.closest('[data-nav]'); if (n && !n.disabled) { view.setUTCMonth(view.getUTCMonth() + Number(n.dataset.nav)); return drawCal(); }
      var d = e.target.closest('[data-day]'); if (d && !d.disabled) { if (S.date !== d.dataset.day) { S.time = null; fresh.times = true; } S.date = d.dataset.day; S.dateNote = ''; delete errors.date; closeCal(); render(); reveal(root.querySelector('.cco-times') && root.querySelector('.cco-times').parentElement); }
    });
    var bar = document.createElement('div'); bar.className = 'cco-bar'; bar.id = 'cco-bar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<span></span><strong></strong>'; document.body.appendChild(bar);
    document.addEventListener('keydown', function (e) {
      if (!shade.classList.contains('cco-open')) return;
      if (e.key === 'Escape') return closeCal();
      if (e.key === 'Tab') { var f = Array.prototype.filter.call(shade.querySelectorAll('button'), function (x) { return !x.disabled && !x.classList.contains('cco-blank'); }); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
  }
  function openCal() {
    lastFocus = document.activeElement;
    var base = S.date || minDate(); view = new Date(base.slice(0, 8) + '01T12:00:00Z'); drawCal();
    shade.classList.add('cco-open'); shade.setAttribute('aria-hidden', 'false');
    setTimeout(function () { var d = shade.querySelector('.cco-day[aria-pressed="true"]') || shade.querySelector('.cco-day:not(:disabled):not(.cco-blank)'); if (d) d.focus(); }, 60);
  }
  function closeCal() { shade.classList.remove('cco-open'); shade.setAttribute('aria-hidden', 'true'); var t = root.querySelector('[data-act="cal"]') || lastFocus; if (t && document.contains(t)) t.focus({ preventScroll: true }); }
  function drawCal() {
    var y = view.getUTCFullYear(), m = view.getUTCMonth(), first = y + '-' + String(m + 1).padStart(2, '0') + '-01', td = today();
    shade.querySelector('.cco-cal-head b').textContent = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    shade.querySelector('[data-nav="-1"]').disabled = first <= minDate().slice(0, 8) + '01';
    shade.querySelector('[data-nav="1"]').disabled = addDays(first, 32).slice(0, 8) + '01' > maxDate();
    var h = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span class="cco-dow" aria-hidden="true">' + d + '</span>'; }).join('');
    var lead = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    for (var i = 0; i < lead; i++) h += '<button type="button" class="cco-day cco-blank" tabindex="-1" aria-hidden="true"></button>';
    for (var d = 1; d <= days; d++) {
      var v = first.slice(0, 8) + String(d).padStart(2, '0'), off = dayOff(v);
      h += '<button type="button" class="cco-day' + (v === td ? ' cco-today' : '') + '" data-day="' + v + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (S.date === v) + '" aria-label="' + longDate(v) + (v === td ? ', today' : '') + (off ? ', not available' : '') + '">' + d + '</button>';
    }
    shade.querySelector('.cco-grid').innerHTML = h;
    shade.querySelector('.cco-cal-note').textContent = (S.finish === 'custom' ? 'Custom designs need ' + SETUP.location.lead_days_custom : 'Cakes need ' + leadDays()) + ' days’ notice. Greyed-out days are not available.';
  }

  // ---------- start ----------
  root.innerHTML = '<p class="cco-loading" role="status">Loading cakes…</p>';
  sb.rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (r) {
    if (r.error || !r.data || !r.data.ok) throw new Error('setup');
    SETUP = r.data;
    if (!SETUP.location.accepts_online || !SETUP.products.length) { root.innerHTML = '<div class="cco-done"><h2>Online cake orders are paused</h2><p>Please call us on ' + esc(SETUP.location.phone) + ' and our team will help you order.</p></div>'; return; }
    buildCal(); animStep = 0; render();
  }).catch(function () { root.innerHTML = '<div class="cco-done"><h2>We couldn\'t load the cake menu</h2><p>Please refresh the page, or call us on +679 892 2760 to order.</p></div>'; });
})();
