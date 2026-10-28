/* Corner Café Service Hub: how each order came in (21 October 2026).
   A clear label on every order: Website order, Walk-in, Phone, WhatsApp, Social media or Corporate.
   Only the website order form sets "online", so staff cannot label an order "Website order" by mistake.
   Plain outlined label with a small icon: it is not something to tap, so it stays plain (colour is for things you tap).
   Used by the order cards, the short order rows, Needs attention and the order details (build/staff_channel.py). */
(function (global) {
  'use strict';
  var I = {
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9M12 3C9.4 5.8 8.1 8.8 8.1 12s1.3 6.2 3.9 9"/>',
    shop: '<path d="M4 10v10h16V10"/><path d="M3 10l1.6-5h14.8L21 10z"/><path d="M10 20v-5h4v5"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2 4.5 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
    chat: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.4a8.4 8.4 0 1 1 15.5-4.5z"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.7l6.6-3.9M8.7 13.3l6.6 3.9"/>',
    office: '<path d="M4 21V4.5L13 3v18M13 8.5h7V21M2.5 21h19M7.5 8h2M7.5 12h2M7.5 16h2M16 12h1.5M16 16h1.5"/>'
  };
  var L = {
    online: ['Website order', 'web'],
    walk_in: ['Walk-in', 'shop'],
    phone: ['Phone', 'phone'],
    whatsapp: ['WhatsApp', 'chat'],
    social: ['Social media', 'share'],
    corporate: ['Corporate', 'office']
  };
  function tag(source) {
    var x = L[source];
    if (!x) return '';
    return '<span class="cc-ch cc-ch-' + source + '" title="How the order came in: ' + x[0] + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + I[x[1]] + '</svg><span>' + x[0] + '</span></span>';
  }
  global.CCChannel = { version: '2026-10-21-channel-v1', tag: tag, label: function (s) { return L[s] ? L[s][0] : (s || ''); } };
})(window);
