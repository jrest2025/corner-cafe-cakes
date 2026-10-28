/* Corner Café Service Hub: guided practice (21 October 2026). Roneel: practice mode "like a gentle colleague guiding you
 * along so that you dont miss anything"; he chose 3 guided tasks, then free practice.
 *
 * While practising, a guide walks new staff through three jobs on the pretend day, one small step at a time:
 *   1. a new cake order (a customer at the counter),
 *   2. an old order from a paper slip,
 *   3. handing over a cake and taking the balance (order CC-1044 in the pretend day, src/staff.practice.js).
 * The guide sits in the practice card at the top of the page and in a strip at the top of each window. It shows what
 * the customer wants (or the slip), the next thing to do in plain words, and "Show me", which outlines where to tap.
 * Steps tick off by themselves as the form fills in; nothing is checked strictly and nothing is ever blocked.
 * Progress lives with practice in this tab (sessionStorage): Start over begins the day and the guide again.
 * Only in practice mode; it reads the form and the pretend day's calls, and never sends anything anywhere.
 */
(function (global) {
  'use strict';
  var P = global.CCPractice, doc = global.document;
  if (!P || !P.on || !doc || global.CCPracticeGuide) return;
  var KEY = 'ccs_guide';
  function load() { try { return JSON.parse(global.sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var G = load();
  if (typeof G.t !== 'number' || G.t < 0 || G.t > 3) G.t = 0;          // 0, 1, 2: the guided tasks; 3: free practice
  if (typeof G.more !== 'boolean') G.more = false;                    // the story or slip opened in the window strip (closed: more room)
  function save() { try { global.sessionStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
  var since = 0;                                                      // the pretend day's calls before this task began

  // ---------- small helpers ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, '').length; }
  function okName(n) { return clean(n).replace(/[^A-Za-z]/g, '').length >= 2; }
  function app() { return global.__ccsOf || null; }
  function today() {
    var a = app(), t = null; try { t = a && a.today && a.today(); } catch (e) {}
    return /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? t : new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(new Date());
  }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function longDay(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(/,/g, ''); }
  function slipDay(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/,/g, ''); }
  function toast(msg) { var a = app(); try { if (a && a.toast) a.toast(msg); } catch (e) {} }

  // ---------- the three jobs ----------
  var T0 = today(), DAY1 = addDays(T0, 3), SLIP = addDays(T0, -10), PICK = addDays(T0, -6);
  var TASKS = [
    {
      title: 'Take a new cake order', form: true,
      story: 'Mele Vunisa is at the counter. She would like a chocolate cake for her son Josh’s 7th birthday.',
      facts: [['Mobile', '912 7001'], ['Name', 'Mele Vunisa'], ['Cake offers', 'Yes, please'], ['Cake', 'Chocolate, 8 inch'],
        ['Words on the cake', 'Happy 7th Birthday Josh'], ['Allergies', 'None'], ['Occasion', 'Birthday'], ['Collecting', longDay(DAY1) + ', 3:00 PM'],
        ['Paying', 'The full price now, by card']],
      steps: [
        { say: 'Tap New order to start.', show: '[data-tab="new"]', done: function (c) { return c.form && !c.V.old; } },
        { say: 'Tap your name, so the kitchen knows who took the order.', show: '[data-of-who]', done: function (c) { return okName(c.V.takenBy); } },
        { say: 'Ask for her mobile number and type it first: 912 7001. If she had ordered before, her details would come up.', show: '#n-phone',
          done: function (c) { return !!c.V.customer || digits(c.V.phone) >= 7; } },
        { say: 'Now her name: Mele Vunisa.', show: '#n-name', done: function (c) { return !!c.V.customer || clean(c.V.name).length >= 2; } },
        { say: 'Ask if she would like cake offers and reminders. She says yes, so tap Yes.', show: '[data-act="sl-opt"]',
          done: function (c) { return !!c.V.customer || c.V.optIn === true || c.V.optIn === false; } },
        { say: 'She is here at the counter, so tap Walk-in. Then tap Next.', show: '[data-act="n-source"]', done: function (c) { return !!c.V.source && c.step !== 1; } },
        { say: 'Tap the 8-inch price for Chocolate, Mudcake or Mocha, then tap Chocolate. Then tap Next.', show: '.sl-tablewrap, .sl-ptable',
          done: function (c) { return !!c.V.product && !!c.V.size && c.step !== 0; } },
        { say: 'Ask what to write on the cake, and type it: Happy 7th Birthday Josh.', show: '#n-msg',
          done: function (c) { return clean(c.V.message).length > 0 || (c.step !== 4 && c.step !== 1 && c.step !== 0); } },
        { say: 'Ask about allergies. She says none, so tap No allergies.', show: '[data-act="n-diet"]', done: function (c) { return !!c.V.diet; } },
        { say: 'Tap Birthday. Then tap Next.', show: '[data-act="n-occ"]', done: function (c) { return !!c.V.occasion && c.step !== 4; } },
        { say: 'Tap ' + longDay(DAY1) + ', then 3:00 PM.', show: '#sl-st-3 .ccs-datechips, #sl-st-3 .ccs-timegrid', done: function (c) { return !!c.V.date && !!c.V.time; } },
        { say: 'She is paying the full price now, by card. Tap Paid in full, then EFTPOS.', show: '[data-act="n-plan"]',
          done: function (c) { return !!c.V.payPlan && (c.V.payPlan === 'later' || c.V.payMethod === 'eftpos'); } },
        { say: 'Read the order back to her, to be sure. Then tap Save.', show: '#ccs-slipform [data-act="n-submit"]', done: function (c) { return c.has('staff_create_order'); } }
      ],
      well: 'Well done. That is a whole cake order, start to finish. Next: an old order from a paper slip.'
    },
    {
      title: 'Enter an old order from a paper slip', form: true,
      story: 'Here is a paper slip from last week. The cake was picked up and paid for. Let’s put it in the system, just as the slip says.',
      slip: true,
      facts: [['Taken by', 'Mere'], ['Ordered', slipDay(SLIP) + ', by phone'], ['Customer', 'Asha Kumar'], ['Mobile', '912 7002'], ['Cake', 'Red Velvet, 8 inch'],
        ['Words on the cake', 'Happy Anniversary'], ['Occasion', 'Anniversary'], ['Allergies', 'None written'], ['Pickup', slipDay(PICK) + ', 2:00 PM'],
        ['Paid', 'In full, cash, on the pickup day']],
      steps: [
        { say: 'Start a new order (New order, or Take another order), then tap Old order at the top.',
          show: function (c) { return c.form ? '[data-oo-mode="old"]' : visible('#ccs-sheet [data-act="new-again"]') ? '#ccs-sheet [data-act="new-again"]' : '[data-tab="new"]'; },
          done: function (c) { return c.form && !!c.V.old; } },
        { say: 'The slip says Mere took it. Tap + Add a name, type Mere, then tap OK.', show: '[data-of-who]', done: function (c) { return okName(c.V.takenBy); } },
        { say: 'Copy the mobile number and the name from the slip: 912 7002, Asha Kumar.', show: '#n-phone',
          done: function (c) { return !!c.V.customer || (digits(c.V.phone) >= 7 && clean(c.V.name).length >= 2); } },
        { say: 'She ordered by phone, so tap Phone.', show: '[data-act="n-source"]', done: function (c) { return !!c.V.source; } },
        { say: 'Add the date written on the slip: ' + slipDay(SLIP) + '. Then tap Next.', show: '#n-takedate + .cc-dp-trigger, #n-takedate',
          done: function (c) { return !!c.V.takenDate && c.step !== 1; } },
        { say: 'Tap the 8-inch price for Red Velvet. Then tap Next.', show: '.sl-tablewrap, .sl-ptable', done: function (c) { return !!c.V.product && !!c.V.size && c.step !== 0; } },
        { say: 'Copy the words (Happy Anniversary) and the occasion (Anniversary) from the slip. No allergies are written, so tap No allergies. Then tap Next.', show: '#n-msg',
          done: function (c) { return !!c.V.diet && !!c.V.occasion && c.step !== 4; } },
        { say: 'Add the pickup date from the slip, ' + slipDay(PICK) + ', then tap 2:00 PM.', show: '#n-date + .cc-dp-trigger, #n-date',
          done: function (c) { return !!c.V.date && !!c.V.time; } },
        { say: 'The slip says paid in full, in cash. Tap Paid in full, then Cash.', show: '[data-oo-paid]',
          done: function (c) { return !!c.V.oldPaid && (c.V.oldPaid === 'none' || !!c.V.oldMeth); } },
        { say: 'Check it against the slip once more. Then tap Save old order.', show: '#ccs-slipform [data-act="n-submit"]', done: function (c) { return c.has('staff_enter_old_order'); } }
      ],
      well: 'Nicely done. Old slips go in just like that. Last one: handing over a cake.'
    },
    {
      title: 'Hand over a cake and take the balance',
      story: 'Jone Rokotui has come to pick up his cake, order CC-1044. He paid a $30 deposit, so he still owes $38.',
      facts: [['Order', 'CC-1044'], ['Cake', 'Chocolate, 8 inch'], ['Still to pay', '$38'], ['Paying by', 'Card (EFTPOS)']],
      steps: [
        { say: 'Find his order: tap CC-1044 under Due today. (You can also search for 1044.)', show: function () { return visible('[data-id="p5"]') ? '[data-id="p5"]' : visible('.tp-card [data-act="goto"][data-v="today"]') ? '.tp-card [data-act="goto"][data-v="today"]' : '[data-tab="today"]'; }, done: function (c) { return /CC-1044/.test(c.head); } },
        { say: 'He still owes $38. Tap Take $38.', show: '#ccs-sheet [data-act="panel"][data-v="pay"]',
          done: function (c) { return !!doc.getElementById('ccs-amt') || c.has('staff_record_payment', function (a) { return a.p_order === 'p5'; }); } },
        { say: 'He is paying by card: tap EFTPOS, then Record payment.', show: '#ccs-sheet [data-act="method"][data-v="eftpos"], #ccs-sheet [data-act="do-pay"]',
          done: function (c) { return c.has('staff_record_payment', function (a) { return a.p_order === 'p5'; }); } },
        { say: 'All paid. Now tap Order completed.', show: '#ccs-sheet [data-act="panel"][data-v="collected"]',
          done: function (c) { return !!doc.querySelector('#ccs-sheet [data-act="do-collected"]') || c.has('staff_order_action', function (a) { return a.p_order === 'p5' && a.p_action === 'collected'; }); } },
        { say: 'Check the order number and his name with him. Tap his name, then Order completed.', show: '#ccs-sheet [data-act="do-collected"]',
          done: function (c) { return c.has('staff_order_action', function (a) { return a.p_order === 'p5' && a.p_action === 'collected'; }); } }
      ],
      well: 'All three done. Well done. Now try anything you like on this pretend day. Start over gives you a fresh day.'
    }
  ];

  // ---------- where things are ----------
  function ctx() {
    var a = app(), V = {}, step = null;
    try { V = (a && a.V && a.V()) || {}; } catch (e) {}
    var form = !!doc.getElementById('ccs-slipform');
    try { step = form && a && a.step ? a.step() : null; } catch (e) {}
    var head = doc.querySelector('#ccs-sheet .ccs-sheet-head'), calls = (global.__calls || []).slice(since);
    return {
      V: V, form: form, step: step, head: head ? head.textContent : '',
      has: function (fn, test) { return calls.some(function (x) { return x && x[1] === fn && (!test || test(x[2] || {})); }); }
    };
  }
  // The next thing to do: done when its last step is done (saving clears the form, so earlier steps cannot be read back
  // afterwards); otherwise the first step not done yet
  function nextStep(task, c) {
    var last = task.steps.length - 1, ok = false;
    try { ok = !!task.steps[last].done(c); } catch (e) {}
    if (ok) return -1;
    for (var i = 0; i < last; i++) { ok = false; try { ok = !!task.steps[i].done(c); } catch (e) {} if (!ok) return i; }
    return last;
  }
  function current(task, c) {
    var at = nextStep(task, c);
    if (at < 0) return { at: -1, say: 'All done.', show: null };
    var st = task.steps[at], say = st.say, show = st.show;
    if (task.form && at > 0 && !c.form) { say = 'Tap New order to carry on where you left off.'; show = '[data-tab="new"]'; }
    if (typeof show === 'function') show = show(c);
    return { at: at, say: say, show: show };
  }
  function visible(sel) {
    var all = []; try { all = [].slice.call(doc.querySelectorAll(sel)); } catch (e) {}
    return all.filter(function (e) { return e.getClientRects().length; })[0] || null;
  }
  // Show me: bring the place into view and outline it for a moment
  var hereT = 0, hereEl = null;
  function showMe() {
    var task = TASKS[G.t]; if (!task) return;
    var cur = current(task, ctx()); if (cur.at < 0 || !cur.show) return;
    var el = visible(cur.show);
    if (!el) { toast('It is not on this screen yet. Follow the step above first.'); return; }
    if (hereEl) hereEl.classList.remove('ccg-here');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { try { el.scrollIntoView(); } catch (x) {} }
    void el.offsetWidth; el.classList.add('ccg-here'); hereEl = el;
    clearTimeout(hereT); hereT = setTimeout(function () { if (hereEl) hereEl.classList.remove('ccg-here'); hereEl = null; }, 3200);
  }

  // ---------- what the guide says ----------
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>';
  function facts(task) {
    return '<dl class="ccg-facts' + (task.slip ? ' is-slip' : '') + '">' + (task.slip ? '<p class="ccg-sliphead">Cake order slip</p>' : '') +
      task.facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function ticks(task, at) {
    return '<ol class="ccg-ticks" aria-label="Steps">' + task.steps.map(function (s, i) {
      return '<li class="' + (at < 0 || i < at ? 'is-done' : i === at ? 'is-now' : '') + '" aria-label="Step ' + (i + 1) + (at < 0 || i < at ? ', done' : i === at ? ', now' : '') + '"></li>';
    }).join('') + '</ol>';
  }
  function cardHtml(c) {
    if (G.t >= TASKS.length) {
      return '<div class="ccg-row"><p class="ccg-k">Guided practice done</p><p class="ccg-say">You have practised a new order, an old order and a handover. Try anything you like now.</p></div>' +
        '<div class="ccg-acts"><button type="button" class="ccp-b" data-ccg-again>Do the guided practice again</button></div>';
    }
    var task = TASKS[G.t], cur = current(task, c);
    return '<div class="ccg-row"><p class="ccg-k">Guided practice ' + (G.t + 1) + ' of ' + TASKS.length + ': ' + esc(task.title) + '</p>' + ticks(task, cur.at) + '</div>' +
      '<p class="ccg-story">' + esc(task.story) + '</p>' + facts(task) +
      '<p class="ccg-say" aria-live="polite"><b>Next:</b> ' + esc(cur.say) + '</p>' +
      '<div class="ccg-acts"><button type="button" class="ccp-b ccg-show" data-ccg-show>Show me</button><button type="button" class="ccp-b ccg-skip" data-ccg-skip>Skip this one</button></div>';
  }
  function stripHtml(c) {
    var task = TASKS[G.t]; if (!task) return '';
    var cur = current(task, c);
    return '<div class="ccg-line"><span class="ccg-ic">' + ICON + '</span><p class="ccg-say" aria-live="polite"><b>Practice ' + (G.t + 1) + ' of ' + TASKS.length + '.</b> ' +
      esc(cur.say) + '</p><button type="button" class="ccg-b ccg-show" data-ccg-show>Show me</button>' +
      '<button type="button" class="ccg-b ccg-more" data-ccg-more aria-expanded="' + G.more + '">' + (task.slip ? 'The slip' : 'What they want') + '</button></div>' +
      (G.more ? facts(task) : '');
  }

  // ---------- on screen ----------
  var lastCard = '', lastStrip = '';
  function paint() {
    var c = ctx();
    // a job finished: say well done, then the next one
    if (G.t < TASKS.length && nextStep(TASKS[G.t], c) < 0) {
      toast(TASKS[G.t].well);
      G.t++; since = (global.__calls || []).length; save(); c = ctx();
    }
    var card = doc.querySelector('#cc-staff .ccp-card');
    if (card) {
      var box = card.querySelector('.ccg-card');
      if (!box) { box = doc.createElement('div'); box.className = 'ccg-card'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Practice guide'); card.appendChild(box); lastCard = ''; }
      var h = cardHtml(c); if (h !== lastCard || box.innerHTML === '') { box.innerHTML = h; lastCard = h; }
    }
    var sheet = doc.getElementById('ccs-sheet'), head = sheet && sheet.querySelector('.ccs-sheet-head');
    var strip = sheet && sheet.querySelector('.ccg-strip');
    if (head && G.t < TASKS.length) {
      if (!strip || strip.previousElementSibling !== head) {
        if (strip) strip.remove();
        strip = doc.createElement('div'); strip.className = 'ccg-strip'; strip.setAttribute('role', 'region'); strip.setAttribute('aria-label', 'Practice guide');
        head.parentNode.insertBefore(strip, head.nextSibling); lastStrip = '';
      }
      var s = stripHtml(c); if (s !== lastStrip || strip.innerHTML === '') { strip.innerHTML = s; lastStrip = s; }
    } else if (strip) strip.remove();
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { paint(); } catch (e) { console.warn('[Practice guide] paint', e); } }, 60); }

  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-ccg-show]')) { e.preventDefault(); e.stopPropagation(); showMe(); return; }
    if (t.closest('[data-ccg-more]')) { e.preventDefault(); e.stopPropagation(); G.more = !G.more; save(); lastStrip = ''; soon(); return; }
    if (t.closest('[data-ccg-skip]')) { e.preventDefault(); e.stopPropagation(); G.t = Math.min(G.t + 1, TASKS.length); since = (global.__calls || []).length; save(); lastCard = ''; lastStrip = ''; soon(); return; }
    if (t.closest('[data-ccg-again]')) { e.preventDefault(); e.stopPropagation(); P.go(true); return; }      // a fresh day, and the guide from the start
    soon();
  }, true);
  doc.addEventListener('input', soon, true);
  doc.addEventListener('change', soon, true);
  function boot() {
    if (!doc.body) return setTimeout(boot, 50);
    new MutationObserver(function (r) {
      // only what the app changes (the guide's own boxes do not wake it up)
      for (var i = 0; i < r.length; i++) { var n = r[i].target; if (!(n.closest && n.closest('.ccg-card, .ccg-strip'))) { soon(); return; } }
    }).observe(doc.body, { childList: true, subtree: true });
    setInterval(soon, 1200);                                         // typing that does not redraw the screen
    soon();
  }
  boot();
  global.CCPracticeGuide = { version: '2026-10-21-guide-v1', tasks: TASKS, state: function () { return { t: G.t, more: G.more, since: since }; }, showMe: showMe };
})(window);
