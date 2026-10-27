/* Corner Café Service Hub: one flow on every screen and every device (27 October 2026, preview).
 * The Today flow, applied board-wide: header in one row → slim full-width alert → numbers in one slim row → content
 * that uses the full width with no empty patches. Act first, then today's work, then what is coming.
 * Computers, iPads and phones each get the version that fits them. The iPad shell and iPad Today stay in staff.ipad.js.
 * Layout only: no data, saving, permissions or workflows are touched; every control is the app's own.
 */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccFlow20261027) return;
  win.__ccFlow20261027 = true;

  // 4 ids + #cc-staff: beats the app's touch standard and polish; same weight as the iPad shell (no overlapping properties)
  var Z = ':not(#fl0):not(#fl1):not(#fl2) body:not(#fl3) #cc-staff';
  var ALL = 'html' + Z;                       // every device
  var NI = 'html:not(.cc-ipad)' + Z;          // computers and phones (iPad has its own rules)
  var IP = 'html.cc-ipad' + Z;                // any iPad
  var IPL = 'html.cc-ipad.cc-ipad-land' + Z;  // iPad landscape
  var IPP = 'html.cc-ipad.cc-ipad-port' + Z;  // iPad portrait
  var WIDE = '@media (min-width:760px)', DESK = '@media (min-width:1024px)', DESK2 = '@media (min-width:1200px)', PHONE = '@media (max-width:759px)';
  function at(mq, rules) { return mq + '{' + rules.join('') + '}'; }
  function M(scr) { return ' #ccs-main[data-screen' + (scr.slice(-1) === '*' ? '^="' + scr.slice(0, -1) : '="' + scr) + '"]'; }

  // reused blocks -------------------------------------------------------------------------------------
  // online-order banner as one slim line: title · order · Open (the explanation sentence goes)
  function slimAlert(P) {
    var B = P + M('today') + ' > .cc-st-alert';
    return [
      B + '{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 14px!important;padding:10px 14px!important;margin:0!important;min-height:0!important;border-radius:12px!important}',
      B + ' > h3{margin:0!important;font-size:17px!important;flex:0 0 auto}',
      B + ' > p:first-of-type{display:none!important}',
      B + ' > .cc-st-row{flex:1 1 260px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0!important;padding:0!important;border:0!important}',
      B + ' > .cc-st-row > span{display:flex!important;flex-wrap:wrap;align-items:baseline;gap:2px 10px;min-width:0}',
      B + ' .ccs-btn{min-height:44px!important;padding:0 18px!important;flex:none}'
    ];
  }
  // a row of count tiles, each only as tall as its content (icon beside number and words)
  function slimTiles(sel) {
    return [
      sel + '{min-height:0!important;height:auto!important;padding:10px 12px!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:10px!important;text-align:left!important}',
      sel + ' > .ap-icon{flex:none!important;width:36px!important;height:36px!important;margin:0!important}',
      sel + ' > .ap-text{display:flex!important;flex-direction:column!important;gap:0!important;min-width:0}',
      sel + ' > .ap-text > b{font-size:22px!important;line-height:1.1!important}',
      sel + ' > .ap-text > span{font-size:15px!important;line-height:1.25!important}'
    ];
  }

  var css = [];

  // ============ TODAY (computers and phones; iPad Today lives in staff.ipad.js) ============
  // computers: the banner gets its own full-width row under the header
  css.push(at(WIDE, slimAlert(NI).concat([
    NI + M('today') + ':has(> .cc-st-alert){grid-template-areas:"head head" "alert alert" "note note" "stats stats" "warn week" "main main" "fu fu"!important}',
    NI + M('today') + ' > .cc-st-alert{grid-area:alert!important;grid-column:1 / -1!important}'
  ])));
  // phones: header → banner → numbers → Needs attention → Due today → This week → Waiting on you
  css.push(at(PHONE, slimAlert(NI).concat([
    NI + M('today') + '{display:flex!important;flex-direction:column!important;gap:12px!important}',
    NI + M('today') + ' > *{order:20;margin-top:0!important;margin-bottom:0!important}',
    NI + M('today') + ' > .ccs-dash-head{order:1}',
    NI + M('today') + ' > .cc-st-alert{order:2}',
    NI + M('today') + ' > .ccs-note{order:3}',
    NI + M('today') + ' > .tq-stats{order:4}',
    NI + M('today') + ' > .tq-warn{order:5}',
    NI + M('today') + ' > .tq-main{display:contents!important}',
    NI + M('today') + ' > .tq-main > .ccs-panel-card{margin:0!important}',
    NI + M('today') + ' > .tq-main > .ccs-panel-card:not(.tp-needs){order:6}',
    NI + M('today') + ' > .tq-week{order:7}',
    NI + M('today') + ' > .tq-main > .ccs-panel-card.tp-needs{order:8}',
    // Needs attention: Urgent and To do as slim rows (icon, number, orders) — no tall boxes
    NI + M('today') + ' > .tq-warn .tx-islands{gap:8px!important}',
    NI + M('today') + ' > .tq-warn .tx-islands > .ap-island{min-height:0!important;height:auto!important;padding:10px 12px!important;margin:0!important;gap:10px!important;align-items:start!important}',
    NI + M('today') + ' > .tq-warn .tx-islands > .ap-island > .ap-icon{width:36px!important;height:36px!important}',
    // banner on a phone: the order line and Open share one row
    NI + M('today') + ' > .cc-st-alert > h3{font-size:16px!important;flex:1 1 100%}'
  ])));

  // ============ ISLANDS: one size, one alignment (every device) ============
  // number tiles and Needs attention islands share the same icon box, number size and label size
  var T = ALL + M('today');
  css.push([
    T + ' .tq-stat > .cl-tile,' + T + ' .tx-islands > .ap-island > .ap-icon{width:40px!important;height:40px!important;min-width:40px!important;border-radius:11px!important;flex:none!important}',
    T + ' .tq-stat > .cl-tile svg,' + T + ' .tx-islands > .ap-island > .ap-icon svg{width:22px!important;height:22px!important}',
    T + ' .tq-stat > b,' + T + ' .tx-islands > .ap-island > .ap-text > b{font-size:26px!important;line-height:1.1!important;font-weight:650!important}',
    T + ' .tq-stat > span:not(.cl-tile),' + T + ' .tx-islands > .ap-island > .ap-text > span:not(.wd-prev){font-size:16px!important;line-height:1.3!important}',
    T + ' .tx-islands > .ap-island{align-items:start!important;padding:14px 16px!important;gap:12px!important;min-height:0!important}',
    // the orders named inside an island stay inside it
    T + ' .tx-islands > .ap-island > .ap-text{min-width:0!important;overflow:hidden!important}',
    T + ' .tx-islands > .ap-island .wd-prev,' + T + ' .tx-islands > .ap-island .wd-p{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}'
  ].join(''));
  // computers and iPads: number tiles laid out like the islands (icon left, number over words)
  css.push(at(WIDE, [
    T + ' .tq-stat:not(.ccp-gone){padding:14px 16px!important;min-height:0!important;display:grid!important;grid-template-columns:40px minmax(0,1fr)!important;column-gap:12px!important;row-gap:2px!important;align-items:start!important;align-content:start!important;text-align:left!important}',
    T + ' .tq-stat:not(.ccp-gone) > .cl-tile{grid-column:1!important;grid-row:1 / span 3!important;margin:0!important}',
    T + ' .tq-stat:not(.ccp-gone) > :not(.cl-tile){grid-column:2!important;margin:0!important;min-width:0}'
  ]));
  // computers: cards that share a row share a height — Needs attention ↔ This week, Due today ↔ Waiting on you
  css.push(at(WIDE, [
    NI + M('today') + ' > :is(.tq-warn,.tq-week){align-self:stretch!important}',
    NI + M('today') + ' > .tq-week{display:flex!important;flex-direction:column!important}',
    NI + M('today') + ' > .tq-week > .tq-days{flex:1 1 auto!important;align-items:stretch!important}',
    NI + M('today') + ' > .tq-week > .tq-days > .ccs-daycell{height:auto!important;min-height:100px!important;justify-content:center!important}',
    NI + M('today') + ' > .tq-warn{display:flex!important;flex-direction:column!important}',
    NI + M('today') + ' > .tq-warn > .tx-wrap{flex:1 1 auto!important}',
    NI + M('today') + ' > .tq-warn .tx-islands{height:100%!important;align-items:stretch!important}',
    NI + M('today') + ' > .tq-main{align-items:stretch!important}',
    NI + M('today') + ' > .tq-main > .ccs-panel-card{display:flex!important;flex-direction:column!important;height:auto!important;align-self:stretch!important}',
    NI + M('today') + ' > .tq-main > .ccs-panel-card > .ccs-minis{flex:1 1 auto!important}'
  ]));

  // ============ ORDERS ============
  // computers and iPads: search and status tabs share one row
  var OR = [];
  [NI, IP].forEach(function (P) {
    OR.push(P + M('orders') + '{display:grid!important;grid-template-columns:minmax(220px,360px) minmax(0,1fr)!important;column-gap:12px!important;row-gap:12px!important;align-content:start!important}');
    OR.push(P + M('orders') + ' > *{grid-column:1 / -1;margin-top:0!important;margin-bottom:0!important}');
    OR.push(P + M('orders') + ' > .ccs-toolbar{grid-column:1!important;min-width:0;align-self:center!important}');
    OR.push(P + M('orders') + ' > .ccs-toolbar .ccs-search{width:100%!important;max-width:none!important}');
    OR.push(P + M('orders') + ' > .ccs-tabs{grid-column:2!important;min-width:0;max-width:100%!important;width:auto!important;justify-self:start!important;align-self:center!important;overflow-x:auto!important;scrollbar-width:none}');
  });
  css.push(at(WIDE, OR));
  // wide screens: order cards two across (no empty middle)
  function twoUp(P) { return [
    P + M('orders') + ' .ccs-list{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}',
    P + M('orders') + ' .ccs-list > :not(.ccs-card){grid-column:1 / -1!important}',
    P + M('orders') + ' .ccs-list > .ccs-card{margin:0!important}'
  ]; }
  css.push(at(DESK2, twoUp(NI)));
  css.push(twoUp(IPL).join(''));

  // ============ CUSTOMERS ============
  // every device: the reminders button is a bell with its count (words kept for screen readers)
  css.push([
    ALL + M('customers*') + ' > .ccs-toolbar > .ccp-rem.ccp-flow-rem{flex:none!important;min-height:48px!important;padding:0 12px!important;gap:6px!important}',
    ALL + M('customers*') + ' > .ccs-toolbar > .ccp-rem.ccp-flow-rem > span:not(.ccp-remn){position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}',
    ALL + M('customers*') + ' > .ccs-toolbar > .ccp-rem > .ccp-remn{display:inline-flex!important;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#FDF0D9;color:#8A4504;font-size:13px;font-weight:600;line-height:1}',
    ALL + M('customers*') + '.ccp-has-fu > .cw-summary > .cw-metric[data-ccdr*="due"]{display:none!important}',
    ALL + M('customers*') + ' > .ccs-ctool{flex-wrap:wrap!important;gap:8px 10px!important;align-items:center!important;min-height:0!important;height:auto!important}',
    ALL + M('customers*') + ' > .ccs-ctool > .ccs-ccount{flex:0 0 auto!important;width:auto!important;margin:0 4px!important}'
  ].join(''));
  // computers and iPads: one-line top bar (search grows)
  var CU = [];
  [NI, IP].forEach(function (P) {
    CU.push(P + M('customers*') + ' > .ccs-toolbar{flex-wrap:nowrap!important;gap:8px 10px!important;align-items:center!important}');
    CU.push(P + M('customers*') + ' > .ccs-toolbar > .cdir-search-field{flex:1 1 180px!important;min-width:160px!important;width:auto!important;max-width:none!important}');
    CU.push(P + M('customers*') + ' > .ccs-toolbar > .cdir-search-field input{width:100%!important}');
    CU.push(P + M('customers*') + ' > .ccs-toolbar > .crm-bar{flex:0 1 auto!important;min-width:0!important;overflow-x:auto;scrollbar-width:none}');
  });
  css.push(at(WIDE, CU));
  // wide screens: Follow-ups due beside the three numbers
  function fuSide(P) { var C = P + M('customers*') + '.ccp-has-fu'; return [
    C + '{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:12px!important;row-gap:12px!important;align-content:start!important}',
    C + ' > *{grid-column:1 / -1;margin-top:0!important;margin-bottom:0!important}',
    C + ' > .ccp-fu{grid-column:1!important;align-self:stretch!important}',
    C + ' > .cw-summary{grid-column:2!important;align-self:stretch!important;grid-template-columns:1fr!important;grid-auto-rows:1fr!important;gap:8px!important}',
    C + ' > .cw-summary > .cw-metric{padding-top:6px!important;padding-bottom:6px!important}'
  ]; }
  css.push(at(DESK, fuSide(NI)));
  css.push(fuSide(IPL).join(''));
  // iPad portrait: the table fits (tighter cells, the name column wraps its tags)
  css.push([
    IPP + M('customers*') + ' .ccs-table-wrap :is(th,td){font-size:15px!important;padding-left:8px!important;padding-right:8px!important}',
    IPP + M('customers*') + ' .ccs-table-wrap td:first-child{max-width:220px}',
    // narrower screens (iPad portrait, small windows): the table fits the space instead of running off the edge
    '@media (max-width:1100px) and (min-width:760px){' + ALL + M('customers*') + ' .ccs-table-wrap table{min-width:0!important;width:100%!important}' + ALL + M('customers*') + ' .ccs-table-wrap{height:auto!important;max-height:none!important;overflow:visible!important}}'
  ].join(''));
  // phones: search on its own line, Add customer and the bell share the next; three numbers in one slim row
  css.push(at(PHONE, [
    NI + M('customers*') + ' > .ccs-toolbar{display:flex!important;flex-wrap:wrap!important;gap:8px!important}',
    NI + M('customers*') + ' > .ccs-toolbar > .cdir-search-field{flex:1 1 100%!important}',
    NI + M('customers*') + ' > .ccs-toolbar > [data-act="cust-new"]{flex:1 1 auto!important}',
    NI + M('customers*') + ' > .ccs-toolbar > .ccp-rem{flex:0 0 auto!important}',
    NI + M('customers*') + ' > .cw-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}',
    NI + M('customers*') + ' > .cw-summary > .cw-metric{display:flex!important;flex-direction:column!important;align-items:flex-start!important;padding:8px 10px!important;min-height:0!important;gap:2px!important}',
    NI + M('customers*') + ' > .cw-summary > .cw-metric > .cw-metric-arrow{display:none!important}',
    NI + M('customers*') + ' > .cw-summary > .cw-metric > .cw-metric-value{order:-1;font-size:22px!important;line-height:1.1!important}',
    NI + M('customers*') + ' > .cw-summary > .cw-metric > .cw-metric-label{font-size:14px!important;line-height:1.25!important}'
  ]));

  // ============ HANDOVER ============
  // every device: header first, then the waiting-note line (slim); the count tiles in one slim row; the chosen panel below
  var HO = ALL + M('handover');
  css.push([
    HO + '{display:flex!important;flex-direction:column!important;gap:12px!important}',
    HO + ' > *{margin-top:0!important;margin-bottom:0!important;flex:0 0 auto!important}',
    HO + ' > .ccs-head{order:1}',
    HO + ' > .ho-banner{order:2;padding:8px 14px!important;border-radius:12px!important}',
    HO + ' > .ix-wrap{order:3}',
    HO + ' > .ix-wrap.ap-split{display:flex!important;flex-direction:column!important;gap:12px!important;height:auto!important}',
    HO + ' > .ix-wrap .ap-islands{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;width:100%!important;height:auto!important;align-self:stretch!important}',
    HO + ' > .ix-wrap .ap-pane{width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;align-self:stretch!important}',
    HO + ' > .ix-wrap .ap-pane-body{height:auto!important;max-height:none!important;overflow:visible!important}'
  ].join('') + slimTiles(HO + ' > .ix-wrap .ap-island').join(''));
  // wide screens: notes to read and the write box side by side
  function hoSide(P) { var N = P + M('handover') + ' .ho-sec.ho-notes'; return [
    N + ':has(> .ho-write){grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:16px!important;row-gap:0!important;align-items:start!important}',
    N + ':has(> .ho-write) > *{grid-column:1!important;margin-bottom:12px!important}',
    N + ':has(> .ho-write) > .ho-write{grid-column:2!important;grid-row:1 / span 40!important;margin-bottom:0!important}'
  ]; }
  css.push(at(DESK, hoSide(NI)));
  css.push(hoSide(IPL).join(''));
  css.push(at('@media (max-width:1023px)', [ALL + M('handover') + ' > .ix-wrap .ap-islands{grid-template-columns:repeat(3,minmax(0,1fr))!important}']));
  css.push(at(PHONE, [ALL + M('handover') + ' > .ix-wrap .ap-islands{grid-template-columns:repeat(2,minmax(0,1fr))!important}']));

  // ============ KITCHEN ============
  // computers and iPads: the Today/Board switch and the late-cakes line share one row
  var KI = [];
  [NI, IP].forEach(function (P) {
    var K = P + M('kitchen*');
    KI.push(K + '{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;column-gap:12px!important;row-gap:12px!important;align-content:start!important}');
    KI.push(K + ' > *{grid-column:1 / -1;margin-top:0!important;margin-bottom:0!important}');
    KI.push(K + ' > .ccs-toolbar:has(+ .tp-urgent){grid-column:1!important;align-self:center!important}');
    KI.push(K + ' > .ccs-toolbar + .tp-urgent{grid-column:2!important;align-self:center!important}');
  });
  css.push(at(WIDE, KI));

  // ============ REGISTER ============
  // computers and iPad landscape: the three numbers and the review tabs share one row
  function regRow(P) { var R = P + M('register'); return [
    R + '{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;column-gap:12px!important;row-gap:12px!important;align-content:start!important}',
    R + ' > *{grid-column:1 / -1;margin-top:0!important;margin-bottom:0!important}',
    R + ' > .ccs-kpis:has(+ .ccs-secbar){grid-column:1!important;align-self:center!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}',
    R + ' > .ccs-kpis + .ccs-secbar{grid-column:2!important;align-self:center!important}'
  ]; }
  css.push(at(DESK, regRow(NI)));
  css.push(regRow(IPL).join(''));

  // ============ PHONE "MORE" MENU: icon tiles, words underneath ============
  var MS = 'html' + Z.replace(' #cc-staff', '') + ' #ccs-sheet.ccp-mt-on';
  css.push([
    MS + ' .ccs-sheet-body > section.ccs-box:first-child{display:flex!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;margin:0 0 12px!important}',
    MS + ' .ccs-sheet-body > section.ccs-box:first-child > h3{display:none!important}',
    MS + ' .ccs-sheet-body > section.ccs-box:first-child::before{content:attr(data-ccp-initial);flex:none;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#E8F0F8;color:#1A4570;font-weight:600;font-size:17px}',
    MS + ' .ccs-sheet-body > section.ccs-box:first-child > p{margin:0!important}',
    MS + ' .ccs-sheet-body > section.ccs-box:first-child > .ccs-big{font-size:18px!important;line-height:1.25!important}',
    MS + ' .ccs-sheet-body > section.ccs-box:first-child > .ccs-hint{margin-left:auto!important;font-size:14px!important;padding:2px 10px!important;border-radius:999px;background:#F2F4F7;color:#475467!important}',
    MS + ' .ccs-more-links{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin:0 0 12px!important}',
    MS + ' .ccs-more-links > button{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;width:auto!important;min-height:88px!important;height:auto!important;margin:0!important;padding:12px 4px 10px!important;border:1px solid #E4E7EC!important;border-radius:14px!important;background:#fff!important;color:#1D2939!important;box-shadow:none!important;font-size:13px!important;font-weight:500!important;line-height:1.2!important;text-align:center!important;white-space:normal!important}',
    MS + ' .ccs-more-links > button:active{background:#F5F8FC!important;border-color:#8FAED3!important}',
    MS + ' .ccs-more-links > button > .ccp-mt-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#E8F0F8;color:#1A4570;box-shadow:inset 0 0 0 1px #B8CDE4;flex:none}',
    MS + ' .ccs-more-links > button > .ccp-mt-ic svg{width:24px!important;height:24px!important;stroke-width:1.8}',
    MS + ' .ccs-more-links > button > .ccp-mt-tx{display:block;min-width:0;overflow-wrap:anywhere}',
    MS + ' .ccs-more-links > button.ccp-mt-practice > .ccp-mt-ic{background:#F2F4F7;color:#344054;box-shadow:inset 0 0 0 1px #D0D5DD}',
    MS + ' button.ccp-more[data-ccp-go]{display:none!important}',
    MS + ' .ccs-more-links > button > .ccp-mt-ic svg,' + MS + ' .ccs-more-links > button > .ccp-mt-ic svg *{fill:none!important;stroke:currentColor!important}',
    MS + ' .ccp-mt-acct{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}',
    MS + ' .ccp-mt-acct > button{width:auto!important;min-height:48px!important;margin:0!important;font-size:15px!important}'
  ].join(''));

  function styles() { if (doc.getElementById('cc-flow-style')) return; var s = doc.createElement('style'); s.id = 'cc-flow-style'; s.textContent = css.join('\n'); doc.head.appendChild(s); }

  // Customers: the reminders button shows a bell and its count; the words stay for screen readers and as the tooltip
  function remBadge() {
    var b = doc.querySelector('#cc-staff #ccs-main[data-screen^="customers"] > .ccs-toolbar > .ccp-rem'); if (!b) return;
    var words = [].filter.call(b.childNodes, function (n) { return !(n.classList && n.classList.contains('ccp-remn')); }).map(function (n) { return n.textContent || ''; }).join(' ').replace(/\s+/g, ' ').trim();
    var n = (words.match(/\d+/) || [''])[0], badge = b.querySelector(':scope > .ccp-remn');
    if (!n) { if (badge) badge.remove(); b.classList.remove('ccp-flow-rem'); return; }
    if (!badge) { badge = doc.createElement('span'); badge.className = 'ccp-remn'; badge.setAttribute('aria-hidden', 'true'); b.appendChild(badge); }
    if (badge.textContent !== n) badge.textContent = n;
    b.classList.add('ccp-flow-rem');
    if (b.title !== words) b.title = words;
  }
  // phone More menu: each link becomes a tile (icon from the app's own menu + the words); Practice mode joins the tiles;
  // password and sign out sit side by side below. The buttons themselves (and what they do) are untouched.
  var PRACTICE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>';
  function moreTiles() {
    var sh = doc.querySelector('#ccs-sheet.ccs-open'), links = sh && sh.querySelector('.ccs-more-links');
    if (!links) return;
    if (!sh.classList.contains('ccp-mt-on')) sh.classList.add('ccp-mt-on');
    var who = sh.querySelector('.ccs-sheet-body > section.ccs-box:first-child'), big = who && who.querySelector('.ccs-big');
    if (big) { var ini = (big.textContent || '').trim().charAt(0).toUpperCase(); if (who.getAttribute('data-ccp-initial') !== ini) who.setAttribute('data-ccp-initial', ini); }
    [].forEach.call(links.querySelectorAll(':scope > button[data-tab]'), function (b) {
      if (b.querySelector(':scope > .ccp-mt-ic')) return;
      var src = doc.querySelector('#ccs-side [data-tab="' + b.getAttribute('data-tab') + '"] svg'), label = (b.textContent || '').trim();
      b.innerHTML = '<span class="ccp-mt-ic" aria-hidden="true">' + (src ? src.outerHTML : '') + '</span><span class="ccp-mt-tx">' + label.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</span>';
    });
    // Practice mode: a tile that presses the app's own Practice mode button (which stays in place, hidden)
    var pr = sh.querySelector('button.ccp-more[data-ccp-go]'), pt = links.querySelector(':scope > .ccp-mt-practice');
    if (pr && !pt) {
      pt = doc.createElement('button'); pt.type = 'button'; pt.className = 'ccs-btn ccs-ghost ccp-mt-practice';
      pt.innerHTML = '<span class="ccp-mt-ic" aria-hidden="true">' + PRACTICE_IC + '</span><span class="ccp-mt-tx"></span>';
      links.appendChild(pt);
    }
    if (pr && pt) { var tt = (pr.textContent || '').trim() || 'Practice mode'; var tx = pt.querySelector('.ccp-mt-tx'); if (tx.textContent !== tt) tx.textContent = tt; }
    if (!pr && pt) pt.remove();
    var pw = sh.querySelector('.ccs-sheet-body > [data-act="my-password"]'), so = sh.querySelector('.ccs-sheet-body > [data-act="signout"]');
    if (pw && so && !sh.querySelector('.ccp-mt-acct')) {
      var row = doc.createElement('div'); row.className = 'ccp-mt-acct';
      pw.parentNode.insertBefore(row, pw); row.appendChild(pw); row.appendChild(so);
    }
  }
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#ccs-sheet .ccp-mt-practice'); if (!t) return;
    var pr = doc.querySelector('#ccs-sheet button.ccp-more[data-ccp-go]'); if (pr) { e.preventDefault(); pr.click(); }
  });
  var q = false;
  function tick() { if (q) return; q = true; (win.requestAnimationFrame || setTimeout)(function () { q = false; try { remBadge(); moreTiles(); } catch (e) { if (win.console) console.warn('[Flow]', e); } }); }
  function start() { styles(); new MutationObserver(tick).observe(doc.body, { childList: true, subtree: true }); tick(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
