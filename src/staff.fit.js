// Fit the screen (18 October 2026). Runs after each render and on resize; changes layout only.
// Calendar: the month's weeks share the window height exactly, and each day shows as many cakes as fit, then "+N more".
function fitCalendar() {
  var g = document.querySelector('#cc-staff .ccs-mgrid'); if (!g) return;
  if (innerWidth <= 640) { g.classList.remove('fit-rows'); return; }
  var main = document.getElementById('ccs-main'), weeks = Math.ceil(g.querySelectorAll('.ccs-mcell').length / 7) || 5;
  var top = g.getBoundingClientRect().top + (main ? main.scrollTop : 0) - (main ? main.getBoundingClientRect().top : 0);
  var avail = (main ? main.clientHeight : innerHeight) - top - 20;
  var row = Math.floor(avail / weeks);
  // Too little room for readable days (short laptop windows): keep the normal height and let the page scroll once.
  if (row < 72) { g.classList.remove('fit-rows'); g.style.removeProperty('--fit-row'); return; }
  g.classList.add('fit-rows'); g.style.setProperty('--fit-row', Math.min(row, 220) + 'px');
  [].forEach.call(g.querySelectorAll('.ccs-mday'), function (d) {
    var cakes = [].slice.call(d.querySelectorAll('.co-cake')); if (!cakes.length) return;
    var more = d.querySelector('.co-more'), total = cakes.length + (more ? +(more.getAttribute('data-n') || (more.textContent.match(/\d+/) || [0])[0]) : 0);
    if (more && !more.hasAttribute('data-n')) more.setAttribute('data-n', total - cakes.length);
    cakes.forEach(function (c) { c.classList.remove('fit-hide'); }); cakes[0].parentNode.classList.remove('fit-none');
    var shown = cakes.length, box = d.getBoundingClientRect();
    var fits = function () { var last = shown ? cakes[shown - 1].getBoundingClientRect().bottom : 0; var m = more && !more.hidden ? more.getBoundingClientRect().bottom : last; return Math.max(last, m) <= box.bottom - 4; };
    var label = function () {
      var rest = total - shown;
      if (!more && rest > 0) { more = document.createElement('span'); more.className = 'co-more'; more.setAttribute('data-n', 0); cakes[0].parentNode.appendChild(more); }
      if (more) { more.hidden = rest <= 0; more.textContent = '+' + rest + ' more'; }
    };
    label();
    while (shown > 0 && !fits()) { shown--; cakes[shown].classList.add('fit-hide'); label(); }
    // No room even for "+N more": the order count above already says how many there are.
    cakes[0].parentNode.classList.toggle('fit-none', shown === 0 && !fits());
  });
}
// Lists that really are long (more than about eight rows) scroll inside themselves; everything else grows.
function fitLongLists() {
  [].forEach.call(document.querySelectorAll('#cc-staff #ccs-main .ccs-minis, #cc-staff #ccs-main .kw-lines'), function (l) {
    l.classList.toggle('fit-long', l.children.length > 8 && innerWidth > 640);
  });
}
(function () {
  var t = null;
  function run() { t = null; fitCalendar(); fitLongLists(); }
  function soon() { if (t) return; t = requestAnimationFrame(run); }
  function watch() {
    var root = document.getElementById('cc-staff'); if (!root) return setTimeout(watch, 200);
    new MutationObserver(function (m) { if (m.some(function (x) { return x.target.closest && !x.target.closest('.ccs-mday'); })) soon(); }).observe(root, { childList: true, subtree: true });
    addEventListener('resize', soon, { passive: true });
    soon();
  }
  watch();
})();
