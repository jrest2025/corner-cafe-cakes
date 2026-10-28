/* Corner Café Service Hub: iPad shell (27 October 2026) — preview branch, not live.
 * Roneel: "the tablet interface feels unstable, oversized and glitchy; the shell moves when you scroll".
 *
 * Root causes this fixes (touch tablets only, staff page only):
 *  1. #cc-staff has min-height:100vh while the app inside is 100dvh. On iPad Safari 100vh is the height with the
 *     toolbar hidden, so the page is taller than the screen and the whole document scrolls. The page host code
 *     (cc-touch-host) also turns page scrolling back on for touch devices. Result: the sidebar and header slide
 *     and rubber-band with the work area.
 *  2. The work area has no scroll containment, so a fling at the top or bottom chains into the page and bounces
 *     the shell; Safari's toolbar then collapses/expands, 100dvh changes, and the whole app resizes mid-scroll.
 *  3. Fit-to-screen panels on Today (and overview cards) are small boxes that scroll on their own inside the work
 *     area, so a finger on a card scrolls the card, not the page.
 *  4. The full 230-256px menu on a portrait iPad leaves ~540px for work; text and controls follow the phone-style
 *     touch tokens (20px body, 56px buttons), which wastes space on a tablet.
 *
 * What it does: pins the app to the window (position:fixed, inset 0, sized by the layout viewport, not vh/dvh),
 * stops page scrolling and bounce on this page only, makes the work area the one scroll region (with containment),
 * flattens the nested scroll boxes, adds a compact rail menu in portrait (tap Menu to open the full menu over the
 * page) and a proportionate menu in landscape, tightens the tablet tokens, keeps pop-ups and order details
 * scrolling on their own, and follows the software keyboard, safe areas and rotation without jumps.
 * No data, rules, permissions or steps change. Computers and phones are not affected.
 */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccIpad20261027) return;
  win.__ccIpad20261027 = true;

  var TABLET = '(hover: none) and (pointer: coarse) and (min-width: 744px) and (max-width: 1400px)';
  var mqT = win.matchMedia ? win.matchMedia(TABLET) : null;
  var mqP = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;
  var root = doc.documentElement;

  // Five ids beat the touch standard's four (html:not(#cc-t1):not(#csc-a) body:not(#cc-t2) #cc-staff ...)
  var H = 'html.cc-ipad:not(#ip0):not(#ip1):not(#ip2) body:not(#ip3)';
  function Hx(cls) { return 'html.cc-ipad' + cls + ':not(#ip0):not(#ip1):not(#ip2) body:not(#ip3)'; }
  var S = H + ' #cc-staff';
  var css = [
    // ---------- 1. Tokens: denser but readable (Apple's minimum touch size is 44pt; main controls stay 48) ----------
    'html.cc-ipad{--cc-fs-small:15px;--cc-fs-label:16px;--cc-fs-body:17px;--cc-fs-h:21px;--cc-fs-title:27px;--cc-fs-num:28px;--cc-lh:1.4;' +
      '--cc-btn-h:48px;--cc-btn-sm-h:44px;--cc-icon:44px;--cc-chip-h:44px;--cc-in-h:48px;--cc-in-fs:17px;--cc-btn-fs:16px;--cc-gap:8px;--cc-menu-fs:16px;' +
      '--cc-menu-w:216px;--ipad-rail:84px;--ipad-pad:20px;--ipad-kb:0px}',
    'html.cc-ipad.cc-ipad-port{--cc-menu-w:var(--ipad-rail);--ipad-pad:16px}',
    // ---------- 2. Stable shell: the page never scrolls; the app is pinned to the window ----------
    H + ',' + H.replace(' body:not(#ip3)', '') + '{overflow:hidden!important;overscroll-behavior:none!important;height:100%!important}',
    'html.cc-ipad:not(#ip0):not(#ip1):not(#ip2){overflow:hidden!important;overscroll-behavior:none!important;height:100%!important;scroll-behavior:auto!important}',
    S + '{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;min-height:0!important;height:auto!important;overflow:hidden!important;overscroll-behavior:none!important;' +
      'padding-left:env(safe-area-inset-left,0px)!important;padding-right:env(safe-area-inset-right,0px)!important;-webkit-tap-highlight-color:transparent}',
    S + ' .ccs-app{height:100%!important;min-height:0!important;max-height:none!important;overflow:hidden!important;grid-template-rows:100%!important;grid-template-columns:var(--cc-menu-w) minmax(0,1fr)!important}',
    // side menu: full height of the shell, never moves; its own list scrolls only if it must
    S + ' .ccs-app:not(.is-single) .ccs-side{position:relative!important;top:auto!important;height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important;width:auto!important;' +
      'padding-top:max(14px,env(safe-area-inset-top,0px))!important;padding-bottom:max(12px,env(safe-area-inset-bottom,0px))!important}',
    S + ' .ccs-app:not(.is-single) .ccs-side > .ccs-nav{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch}',
    // the work area is the one scroll region
    S + ' .ccs-app:not(.is-single) > #ccs-main{grid-column:2!important;grid-row:1!important}',
    S + ' .ccs-app:not(.is-single) > .ccs-side{grid-column:1!important;grid-row:1!important}',
    S + ' .ccs-app #ccs-main{height:100%!important;min-height:0!important;max-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:contain!important;overscroll-behavior-x:none!important;' +
      '-webkit-overflow-scrolling:touch;padding:14px var(--ipad-pad) calc(24px + env(safe-area-inset-bottom,0px) + var(--ipad-kb))!important;scroll-padding-bottom:calc(24px + var(--ipad-kb))}',
    // nothing wider than the work area
    S + ' #ccs-main > *{max-width:100%;min-width:0}',
    // ---------- 3. No small boxes that scroll inside the work area (Today, overview cards) ----------
    S + ' #ccs-main[data-screen="today"]{grid-template-rows:none!important;grid-auto-rows:auto!important;align-content:start!important;height:100%!important}',
    S + ' #ccs-main[data-screen="today"] > :is(.tq-warn,.tq-stats,.tq-main,.tq-week){min-height:0!important;max-height:none!important;height:auto!important;overflow:visible!important}',
    S + ' #ccs-main :is(.tq-main .ccs-minis,.ccs-today .ccs-minis,.tq-main > .ccs-panel-card){max-height:none!important;height:auto!important;overflow:visible!important;flex:0 0 auto!important}',
    S + ' #ccs-main .dx-ov :is(.dx-card,.ov-kpi){overflow:visible!important;max-height:none!important}',
    S + ' #ccs-main .fit-long{max-height:none!important;overflow:visible!important}',
    // ---------- 4. Menu: compact rail in portrait (tap Menu to open the full list over the page), proportionate in landscape ----------
    S + ' .ccs-side .ccp-ipad-menu{display:none}',
    Hx('.cc-ipad-port') + ' #cc-staff .ccs-side .ccp-ipad-menu{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;min-height:56px;margin:0 0 6px;border:0;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer}',
    Hx('.cc-ipad-port') + ' #cc-staff .ccs-side .ccp-ipad-menu svg{width:22px;height:22px}',
    // rail: icons with a short label under, no group headings, compact brand, people/sign-out live in the open menu
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-app:not(.is-single) .ccs-side{padding-left:8px!important;padding-right:8px!important;gap:6px!important;align-items:stretch!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side :is(.ccs-brandrow,.csc-h,.ccs-navh,.ccs-who,.ccs-collapse){display:none!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side .ccs-nav{gap:4px!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side .csc-group{gap:4px!important;margin:0!important;padding:0!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav){flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:3px!important;min-height:58px!important;padding:6px 2px!important;' +
      'font-size:11.5px!important;line-height:1.15!important;text-align:center!important;position:relative!important;width:100%!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav) > span:not(.ccs-count){white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav) svg{width:22px!important;height:22px!important;margin:0!important}',
    Hx('.cc-ipad-port:not(.cc-ipad-navopen)') + ' #cc-staff .ccs-side .ccs-count{position:absolute!important;top:3px!important;right:6px!important;min-width:20px!important;height:20px!important;font-size:12px!important;padding:0 5px!important}',
    // open menu in portrait: full menu slides over the page (the page underneath does not move or resize)
    Hx('.cc-ipad-port.cc-ipad-navopen') + ' #cc-staff .ccs-app:not(.is-single) .ccs-side{position:absolute!important;top:0!important;left:0!important;bottom:0!important;width:280px!important;z-index:45!important;box-shadow:12px 0 32px rgba(16,24,40,.28)!important}',
    Hx('.cc-ipad-port.cc-ipad-navopen') + ' #cc-staff .ccs-app{grid-template-columns:var(--ipad-rail) minmax(0,1fr)!important}',
    Hx('.cc-ipad-port') + ' #cc-staff .ccp-ipad-shade{display:none}',
    Hx('.cc-ipad-port.cc-ipad-navopen') + ' #cc-staff .ccp-ipad-shade{display:block;position:absolute;inset:0;z-index:44;background:rgba(16,24,40,.32)}',
    // landscape: a proportionate menu, sections pinned and tighter
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav){min-height:44px!important;padding-top:6px!important;padding-bottom:6px!important;font-size:var(--cc-menu-fs)!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .csc-h{margin-top:8px!important;margin-bottom:2px!important;font-size:12px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-brandrow{padding-bottom:4px!important}',
    S + ' .ccs-side .ccs-nav-phone{display:none!important}',
    S + ' #ccs-main[data-screen="today"] .tp-card .ccs-panel-h, ' + S + ' #ccs-main[data-screen="today"] .tp-card > h2{flex-wrap:wrap!important;row-gap:2px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-app:not(.is-single) .ccs-side{gap:6px!important;padding-left:10px!important;padding-right:10px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-brandrow{padding:0 0 2px!important;margin:0!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-brand{transform:scale(.82);transform-origin:center top;margin-bottom:-14px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-nav{gap:0!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .csc-group{gap:0!important;margin:0!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .csc-h{margin:6px 0 0!important;padding:0 10px!important;line-height:20px!important;min-height:0!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav){min-height:42px!important;padding-top:4px!important;padding-bottom:4px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-who{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:center!important;gap:4px 8px!important;padding-top:8px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-who .ccs-avatar{width:32px!important;height:32px!important;min-width:32px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-who .ccs-who-name{font-size:14px!important;line-height:1.25!important;min-width:0}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-who .ccs-signout{grid-column:1 / -1!important;min-height:44px!important;margin:4px 0 0!important}',
    // short landscape screens: section names give way to thin dividers so the whole menu fits without scrolling
    Hx('.cc-ipad-land.cc-ipad-short') + ' #cc-staff .ccs-side .csc-h{display:none!important}',
    Hx('.cc-ipad-land.cc-ipad-short') + ' #cc-staff .ccs-side .csc-group + .csc-group{border-top:1px solid rgba(255,255,255,.12)!important;margin-top:3px!important;padding-top:3px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff .ccs-side :is(.ccs-nav-item,.ccp-nav){height:44px!important;min-height:44px!important;line-height:1.2!important}',
    '@media (max-height:800px){' + Hx('.cc-ipad-land') + ' #cc-staff .ccs-side .ccs-brand{transform:scale(.7)!important;margin-bottom:-26px!important}}',
    // ---------- Today: one logical flow, no gaps (act first, then today's work, then what is coming) ----------
    // header: greeting left, New order / Find an order right, one row
    S + ' #ccs-main[data-screen="today"] > .ccs-dash-head{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:space-between!important;gap:8px 16px!important;margin:0!important;min-height:0!important;height:auto!important}',
    S + ' #ccs-main[data-screen="today"] > .ccs-dash-head > div:first-child{flex:1 1 280px;min-width:0}',
    S + ' #ccs-main[data-screen="today"] > .ccs-dash-head .tq-tools{flex:0 0 auto;margin:0!important;display:flex!important;gap:10px!important;align-items:center}',
    S + ' #ccs-main[data-screen="today"] > .ccs-dash-head h1,' + S + ' #ccs-main[data-screen="today"] > .ccs-dash-head h2{margin:0!important}',
    // online-order banner: full width, one slim line (title · order · Open); the long sentence goes
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 14px!important;padding:10px 14px!important;margin:0!important;min-height:0!important;border-radius:12px!important}',
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert > h3{margin:0!important;font-size:17px!important;flex:0 0 auto}',
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert > p:not(:last-child),' + S + ' #ccs-main[data-screen="today"] > .cc-st-alert > p:first-of-type{display:none!important}',
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert > .cc-st-row{flex:1 1 320px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin:0!important;padding:0!important;border:0!important}',
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert > .cc-st-row > span{display:flex!important;flex-wrap:wrap;align-items:baseline;gap:2px 10px;min-width:0}',
    S + ' #ccs-main[data-screen="today"] > .cc-st-alert .ccs-btn{min-height:44px!important;padding:0 18px!important;flex:none}',
    // numbers: one slim row, each tile only as tall as its number
    S + ' #ccs-main[data-screen="today"] > .tq-stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:0!important;height:auto!important;align-items:stretch!important}',
    S + ' #ccs-main[data-screen="today"] > .tq-stats > .tq-stat{min-height:0!important;height:auto!important;padding:10px 14px!important}',
    // the two Today lists become their own blocks so they can sit in the columns
    S + ' #ccs-main[data-screen="today"] > .tq-main{display:contents!important}',
    S + ' #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card{margin:0!important;min-height:0!important;height:auto!important;align-self:start!important}',
    S + ' #ccs-main[data-screen="today"] > :is(.tq-warn,.tq-week){margin:0!important;align-self:start!important}',
    // landscape: two columns — left now (Needs attention, Due today), right coming (This week, Waiting on you)
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"]{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-areas:"head head" "alert alert" "stats stats" "warn week" "due wait"!important;grid-template-rows:repeat(5,max-content)!important;grid-auto-rows:max-content!important;gap:12px!important;align-content:start!important;align-items:start!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .ccs-dash-head{grid-area:head!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .cc-st-alert{grid-area:alert!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-stats{grid-area:stats!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-warn{grid-area:warn!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-week{grid-area:week!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card:not(.tp-needs){grid-area:due!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card.tp-needs{grid-area:wait!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"] > :not(.ccs-dash-head):not(.cc-st-alert):not(.tq-stats):not(.tq-warn):not(.tq-week):not(.tq-main){grid-column:1 / -1!important}',
    S + ' #ccs-main[data-screen="today"] > :is(.ccs-dash-head,.cc-st-alert,.tq-stats,.tq-warn,.tq-week),' + S + ' #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card{min-height:max-content!important;flex-shrink:0!important}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > :is(.tq-warn,.tq-week),' + Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card{align-self:stretch!important;width:auto!important}',
    // landscape masonry (set once the heights are measured): each column stacks with no gaps
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas{grid-template-areas:none!important;grid-template-rows:none!important;grid-auto-rows:4px!important;row-gap:0!important;column-gap:12px!important;grid-auto-flow:row dense!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > :is(.ccs-dash-head,.cc-st-alert,.tq-stats,.tq-warn,.tq-week),' + Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-main > .ccs-panel-card{grid-area:auto!important;margin:0 0 12px!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > :is(.ccs-dash-head,.cc-st-alert,.tq-stats){grid-column:1 / -1!important}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > *{order:8;grid-column:1 / -1}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .ccs-dash-head{order:1}' + Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .cc-st-alert{order:2}' + Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-stats{order:3}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-warn{grid-column:1!important;order:4}' + Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-week{grid-column:2!important;order:5}',
    Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-main > .ccs-panel-card:not(.tp-needs){grid-column:1!important;order:6}' + Hx('.cc-ipad-land') + ' #cc-staff #ccs-main[data-screen="today"].cc-ipad-mas > .tq-main > .ccs-panel-card.tp-needs{grid-column:2!important;order:7}',
    // portrait: one column in the same order (left column first)
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"]{display:flex!important;flex-direction:column!important;gap:12px!important}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > *{order:9}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .ccs-dash-head{order:1}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .cc-st-alert{order:2}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-stats{order:3}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-warn{order:4}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card:not(.tp-needs){order:5}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-week{order:6}',
    Hx('.cc-ipad-port') + ' #cc-staff #ccs-main[data-screen="today"] > .tq-main > .ccs-panel-card.tp-needs{order:7}',
    // ---------- 5. Density: cards, headings, filters and toolbars a step tighter ----------
    S + ' #ccs-main :is(.ccs-head,.cdir-heading){margin-bottom:10px!important}',
    S + ' #ccs-main :is(.ccs-card,.cat-card,.dx-card,.ccs-panel-card,.kw-sec,.cw-metric,.tq-stat,.cat-k){padding:12px 14px!important}',
    S + ' #ccs-main :is(.tq-stats,.cat-kpis,.cw-summary,.an-grid){gap:10px!important}',
    S + ' #ccs-main .ccs-list{gap:8px!important}',
    S + ' #ccs-main :is(.ccdd-btn,.ccs-search,.ccs-search input,.cdir-search input){min-height:48px!important}',
    // ---------- 6. Pop-ups, order details, customer profile: scroll on their own; opening them never moves the app ----------
    H + ' #ccs-sheet{top:0!important;bottom:0!important;height:auto!important;max-height:none!important;padding-top:env(safe-area-inset-top,0px)!important}',
    H + ' #ccs-sheet .ccs-sheet-body{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px) + var(--ipad-kb))!important}',
    H + ' :is(.ccs-shade,.ccs-menushade){overscroll-behavior:none!important;touch-action:none}',
    H + ' :is(.ccdd-pop,.tx-pop,.cc-pop,.ccs-modal,#cc-date-picker-layer > *){overscroll-behavior:contain!important;max-height:calc(100% - 32px - var(--ipad-kb))}',
    // ---------- 7. Keyboard open: the focused field stays visible, nothing else jumps ----------
    'html.cc-ipad.cc-ipad-kb #cc-staff .ccs-nav-phone{display:none!important}'
  ].join('\n');

  var styleEl = null, on = false;
  function mount() {
    if (!doc.getElementById('cc-staff')) return false;
    if (!styleEl) { styleEl = doc.createElement('style'); styleEl.id = 'cc-ipad-shell'; styleEl.textContent = css; }
    if (!styleEl.parentNode) doc.head.appendChild(styleEl);
    return true;
  }
  function orient() {
    var port = mqP ? mqP.matches : win.innerHeight > win.innerWidth;
    root.classList.toggle('cc-ipad-port', port); root.classList.toggle('cc-ipad-land', !port); root.classList.toggle('cc-ipad-short', win.innerHeight < 900);
    if (!port) closeNav();
  }
  function apply() {
    var want = !!(mqT && mqT.matches) && !!doc.getElementById('cc-staff');
    if (want && !on) { on = true; mount(); root.classList.add('cc-ipad'); orient(); resetScroll(); }
    else if (!want && on) { on = false; root.classList.remove('cc-ipad', 'cc-ipad-port', 'cc-ipad-land', 'cc-ipad-short', 'cc-ipad-navopen', 'cc-ipad-kb'); root.style.removeProperty('--ipad-kb'); }
    if (on) { orient(); railButton(); }
  }
  // Safari may have scrolled the page before the shell was pinned (or when the keyboard opened): put it back.
  function resetScroll() { if (win.scrollY || win.pageYOffset) win.scrollTo(0, 0); var se = doc.scrollingElement; if (se && se.scrollTop) se.scrollTop = 0; }

  // ---------- Portrait menu button and shade ----------
  var MENU_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  function railButton() {
    var side = doc.querySelector('#cc-staff .ccs-side'); if (!side) return;
    if (!side.querySelector(':scope > .ccp-ipad-menu')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccp-ipad-menu'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Open menu');
      b.innerHTML = MENU_SVG + '<span>Menu</span>'; side.insertBefore(b, side.firstChild);
    }
    var app = doc.querySelector('#cc-staff .ccs-app');
    if (app && !app.querySelector(':scope > .ccp-ipad-shade')) { var sh = doc.createElement('div'); sh.className = 'ccp-ipad-shade'; sh.setAttribute('aria-hidden', 'true'); app.appendChild(sh); }
  }
  function setNav(open) {
    root.classList.toggle('cc-ipad-navopen', !!open);
    var b = doc.querySelector('#cc-staff .ccp-ipad-menu'); if (b) { b.setAttribute('aria-expanded', String(!!open)); b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
  }
  function closeNav() { if (root.classList.contains('cc-ipad-navopen')) setNav(false); }
  doc.addEventListener('click', function (e) {
    if (!on) return;
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('.ccp-ipad-menu')) { e.preventDefault(); setNav(!root.classList.contains('cc-ipad-navopen')); return; }
    if (t.closest('.ccp-ipad-shade')) { e.preventDefault(); closeNav(); return; }
    if (root.classList.contains('cc-ipad-navopen') && t.closest('#cc-staff .ccs-side .ccs-nav-item, #cc-staff .ccs-side .ccp-nav')) setTimeout(closeNav, 0);
  }, true);
  doc.addEventListener('keydown', function (e) { if (on && e.key === 'Escape') closeNav(); });

  // ---------- Software keyboard (visualViewport): pad the scroll areas, keep the field in view, no page jump ----------
  var vv = win.visualViewport, kbT = 0;
  function kb() {
    if (!on || !vv) return;
    var h = Math.max(0, Math.round(win.innerHeight - vv.height - vv.offsetTop));
    var open = h > 120;
    root.classList.toggle('cc-ipad-kb', open);
    root.style.setProperty('--ipad-kb', (open ? h : 0) + 'px');
    if (!open) resetScroll();
  }
  if (vv) { vv.addEventListener('resize', function () { clearTimeout(kbT); kbT = setTimeout(kb, 60); }, { passive: true }); }
  doc.addEventListener('focusin', function (e) {
    if (!on) return;
    var t = e.target; if (!t || !t.matches || !t.matches('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]')) return;
    setTimeout(function () {
      var box = t.closest('#ccs-main, #ccs-sheet .ccs-sheet-body, .ccdd-pop, .tx-pop, .ccs-modal'); if (!box) return;
      var r = t.getBoundingClientRect(), vb = vv ? vv.height + vv.offsetTop : win.innerHeight;
      if (r.bottom > vb - 16 || r.top < 0) t.scrollIntoView({ block: 'center', inline: 'nearest' });
      resetScroll();
    }, 320);
  });
  doc.addEventListener('focusout', function () { if (on) setTimeout(function () { if (!doc.activeElement || !doc.activeElement.matches || !doc.activeElement.matches('input, textarea, select')) { kb(); resetScroll(); } }, 120); });

  // ---------- Rotation and Safari toolbar changes: re-read once things settle; no animation of the shell ----------
  var rT = 0;
  function settle() { clearTimeout(rT); rT = setTimeout(function () { apply(); resetScroll(); schedMas(); }, 120); }
  if (mqT && mqT.addEventListener) mqT.addEventListener('change', settle);
  if (mqP && mqP.addEventListener) mqP.addEventListener('change', settle);
  win.addEventListener('orientationchange', settle, { passive: true });
  win.addEventListener('resize', settle, { passive: true });
  win.addEventListener('scroll', function () { if (on && !root.classList.contains('cc-ipad-kb')) resetScroll(); }, { passive: true });

  // ---------- Today on a landscape iPad: masonry spans from each block's natural height ----------
  var masRO = win.ResizeObserver ? new ResizeObserver(function () { schedMas(); }) : null, masWatched = [], masT = 0;
  function schedMas() { clearTimeout(masT); masT = setTimeout(mas, 30); }
  function mas() {
    var main = doc.querySelector('#cc-staff #ccs-main');
    if (!main) return;
    var land = on && root.classList.contains('cc-ipad-land') && main.getAttribute('data-screen') === 'today';
    var blocks = land ? [].slice.call(main.querySelectorAll(':scope > .ccs-dash-head, :scope > .cc-st-alert, :scope > .tq-stats, :scope > .tq-warn, :scope > .tq-week, :scope > .tq-main > .ccs-panel-card')).filter(function (b) { return b.getClientRects().length; }) : [];
    if (!land || blocks.length < 3) {
      if (main.classList.contains('cc-ipad-mas')) { main.classList.remove('cc-ipad-mas'); [].forEach.call(main.querySelectorAll('[data-ipad-span]'), function (b) { b.style.removeProperty('grid-row-end'); b.removeAttribute('data-ipad-span'); }); }
      return;
    }
    blocks.forEach(function (b) {
      var h = b.getBoundingClientRect().height, n = Math.max(1, Math.ceil((h + 12) / 4));
      if (b.getAttribute('data-ipad-span') !== String(n)) { b.setAttribute('data-ipad-span', n); b.style.setProperty('grid-row-end', 'span ' + n, 'important'); }
      if (masRO && masWatched.indexOf(b) < 0) { masRO.observe(b); masWatched.push(b); }
    });
    masWatched = masWatched.filter(function (b) { if (doc.contains(b)) return true; if (masRO) masRO.unobserve(b); return false; });
    main.classList.add('cc-ipad-mas');
  }

  // The app renders later (and re-renders): keep the menu button and shade in place.
  var mo = new MutationObserver(function () { if (on) { railButton(); schedMas(); } else if (doc.getElementById('cc-staff')) apply(); });
  function start() { apply(); mo.observe(doc.body, { childList: true, subtree: true }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
