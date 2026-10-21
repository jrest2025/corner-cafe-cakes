/* Phase 1b (21 October 2026): one fixed colour per channel and per occasion on the Analytics donuts.
   Display only. It reads each donut's own legend names after the chart is drawn and recolours that donut's slices and
   legend swatches; no data, figures, order or chart code changes. A donut is recoloured only when every name in it is
   a known channel or a known occasion, so cake and size charts keep the ranked palette. Never touches the Heartbeat
   (#cc-heartbeat) or the Occasions Booking curve (svg.oi-curve), which are not donuts. */
(function () {
  'use strict';
  if (window.__jrCategoryColours20261021) return;
  window.__jrCategoryColours20261021 = true;
  var GREY = '#C3CCD6';
  var CHANNEL = {
    'online': '#2878B5', 'walk-in': '#168F91', 'phone': '#E9A23B', 'whatsapp': '#74A58B',
    'social media': '#8567B6', 'corporate': '#183153', 'not recorded': GREY, 'other': GREY
  };
  var OCCASION = {
    'birthday': '#168F91', 'anniversary': '#E17A65', "mother's day": '#8567B6', "father's day": '#2878B5',
    'christmas': '#4E8A6A', "valentine's day": '#C25E49', 'wedding': '#E9A23B', 'corporate event': '#183153',
    'baby shower': '#49B8CF', 'graduation': '#4A6A93', 'just because': '#A38BCB',
    'other': GREY, 'not specified': GREY
  };
  function norm(t) { return String(t || '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase(); }
  function pick(names) {
    var maps = [CHANNEL, OCCASION];
    for (var m = 0; m < maps.length; m++) {
      var map = maps[m], named = 0, ok = names.every(function (n) { if (map[n] === undefined) return false; if (map[n] !== GREY) named++; return true; });
      if (ok && named) return map;
    }
    return null;
  }
  function set(el, prop, c) { if (el && el.style.getPropertyValue(prop) !== c) el.style.setProperty(prop, c, 'important'); }
  function paint(box, circles, swatches, labels) {
    if (!circles.length || circles.length !== swatches.length || circles.length !== labels.length) return;
    var names = labels.map(function (l) { return norm(l.textContent); }), map = pick(names);
    if (!map) return;
    names.forEach(function (n, i) { set(circles[i], 'stroke', map[n]); set(swatches[i], 'background', map[n]); });
    box.setAttribute('data-jr-fixed', map === CHANNEL ? 'channel' : 'occasion');
  }
  function run() {
    var main = document.getElementById('ccs-main');
    if (!main) return;
    main.querySelectorAll('.cat-donut').forEach(function (d) {
      if (d.closest('#cc-heartbeat')) return;
      var rows = [].slice.call(d.querySelectorAll('.cat-leg > .cat-lr'));
      paint(d, [].slice.call(d.querySelectorAll('svg g > circle')), rows.map(function (r) { return r.querySelector('i'); }), rows.map(function (r) { return r.querySelector('span'); }));
    });
    main.querySelectorAll('.an-pie').forEach(function (d) {
      if (d.closest('#cc-heartbeat')) return;
      var rows = [].slice.call(d.querySelectorAll('.an-leg > li'));
      paint(d, [].slice.call(d.querySelectorAll('svg.an-donut g > circle')), rows.map(function (r) { return r.querySelector('i'); }), rows.map(function (r) { return r.querySelector('span'); }));
    });
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; try { run(); } catch (e) { console.warn('[Category colours] skipped', e); } }); }
  function start() {
    var root = document.getElementById('cc-staff');
    if (!root) return;
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
