/* Corner Cafe Service Hub: Cake Enquiries, phase 1 (28 Oct 2026). Marker __ccEnquiries20261028.
 * Orders gets an Enquiries tab and a New enquiry button. An enquiry is interest before an order: name or phone is
 * enough, everything else can be added later. Statuses: New, In discussion, Quoted, Follow up, Ordered, Not ordered.
 * Convert to order opens the normal New order screen with the customer, how they asked, occasion and date filled in;
 * when that order is saved it is linked to the enquiry (database: enquiry_* functions, release_f1_enquiries_20261028.sql).
 * Orders, payments and the order screens themselves are not changed. Hidden in Practice mode. */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccEnquiries20261028) return;
  win.__ccEnquiries20261028 = true;

  var P = 'html:not(#cce0):not(#cce1) body:not(#cce2) ';
  var NAVY = '#1E3A5F';
  var CSS = [
    // tab, header button
    P + '#cc-staff .ccs-tab.cce-tab{display:inline-flex;align-items:center;gap:6px}',
    P + '#cc-staff .cce-newbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 16px;border-radius:12px;border:1.5px solid #C9D5E4;background:#fff;color:' + NAVY + ';font:inherit;font-size:16px;font-weight:600;white-space:nowrap;cursor:pointer}',
    P + '#cc-staff .cce-newbtn svg{width:20px;height:20px}',
    P + '#cc-staff .cce-newbtn:hover{background:#F5F8FC}',
    // enquiry mode: hide the order list and order search, keep the heading and the tabs
    P + '#cc-staff #ccs-main.cce-on > :not(.ccs-head):not(.ccs-tabs):not(.cce-panel){display:none!important}',
    P + '#cc-staff #ccs-main.cce-on > .ccs-tabs{grid-column:1 / -1!important}',
    P + '#cc-staff #ccs-main.cce-on > .ccs-tabs > .ccs-tab:not(.cce-tab){background:transparent!important;color:#344054!important;border-color:transparent!important;box-shadow:none!important}',
    P + '#cc-staff #ccs-main > .cce-panel{grid-column:1 / -1;min-width:0}',
    P + '#cc-staff .cce-bar{display:flex;align-items:center;gap:10px;margin:0 0 12px;flex-wrap:wrap}',
    P + '#cc-staff .cce-search{flex:1 1 220px;min-width:0;max-width:420px;position:relative}',
    P + '#cc-staff .cce-search svg{position:absolute;left:14px;top:50%;width:20px;height:20px;transform:translateY(-50%);color:#667085;pointer-events:none}',
    P + '#cc-staff .cce-search input{width:100%;height:48px;padding:0 14px 0 44px;border:1.5px solid #D0D5DD;border-radius:12px;font:inherit;font-size:16px;color:#101828;background:#fff;outline:none}',
    P + '#cc-staff .cce-search input:focus{border-color:' + NAVY + ';box-shadow:0 0 0 4px rgba(30,58,95,.12)}',
    P + '#cc-staff .cce-view{position:relative}',
    P + '#cc-staff .cce-view select{appearance:none;-webkit-appearance:none;height:48px;padding:0 42px 0 16px;border:1.5px solid #C9D5E4;border-radius:12px;background:#F5F8FC;color:' + NAVY + ';font:inherit;font-size:16px;font-weight:600;cursor:pointer}',
    P + '#cc-staff .cce-view svg{position:absolute;right:14px;top:50%;width:16px;height:16px;transform:translateY(-50%);color:' + NAVY + ';pointer-events:none}',
    P + '#cc-staff .cce-bar .cce-newbtn{margin-left:auto}',
    '@media (min-width:760px){' + P + '#cc-staff .cce-bar .cce-barbtn{display:none}}',
    '@media (max-width:759px){' + P + '#cc-staff .cce-headbtn{display:none}}',
    P + '#cc-staff .cce-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:stretch}',
    '@media (max-width:1199px){' + P + '#cc-staff .cce-list{grid-template-columns:1fr}}',
    P + '#cc-staff .cce-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:start;width:100%;text-align:left;padding:14px 16px;border:1px solid #E4E7EC;border-radius:16px;background:#fff;color:#1D2939;font:inherit;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.04)}',
    P + '#cc-staff .cce-row:hover{border-color:#C9D5E4}',
    P + '#cc-staff .cce-when{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:84px;padding:10px 12px;border-radius:12px;background:#EEF3F9;color:#1D2939}',
    P + '#cc-staff .cce-when small{font-size:13px;color:#475467}',
    P + '#cc-staff .cce-when b{font-size:17px;font-weight:600;line-height:1.2}',
    P + '#cc-staff .cce-when.cce-nodate{background:#F9FAFB;border:1px dashed #D0D5DD}',
    P + '#cc-staff .cce-when.cce-nodate b{font-size:15px;font-weight:500;color:#667085}',
    P + '#cc-staff .cce-main{display:flex;flex-direction:column;gap:3px;min-width:0}',
    P + '#cc-staff .cce-cake{font-size:17px;font-weight:600;color:#101828;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    P + '#cc-staff .cce-cake.cce-tbd{font-weight:500;font-style:italic;color:#667085}',
    P + '#cc-staff .cce-who{font-size:16px;color:#1D2939}',
    P + '#cc-staff .cce-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;color:#667085}',
    P + '#cc-staff .cce-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}',
    P + '#cc-staff .cce-side b{font-size:18px;font-weight:600;color:#101828}',
    P + '#cc-staff .cce-empty{padding:40px 16px;text-align:center;color:#667085;font-size:16px;border:1px dashed #D0D5DD;border-radius:16px;background:#fff}',
    P + '#cc-staff .cce-empty b{display:block;margin:0 0 6px;color:#344054;font-size:18px;font-weight:600}',
    // shared: chips, source icons
    P + '.cce-st{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 10px;border-radius:999px;font-size:14px;font-weight:600;white-space:nowrap}',
    P + '.cce-st i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.8}',
    P + '.st-new{background:#EEF4FF;color:#1E40AF}' + P + '.st-discussion{background:#F4F3FF;color:#4A3AA8}' + P + '.st-quoted{background:#FEF6E7;color:#93520B}',
    P + '.st-follow_up{background:#FFF1E6;color:#B54708}' + P + '.st-converted{background:#ECFDF3;color:#067647}' + P + '.st-closed{background:#F2F4F7;color:#475467}',
    P + '.cce-src{display:inline-flex;align-items:center;gap:5px;color:#475467}',
    P + '.cce-src svg{width:18px;height:18px}',
    P + '.cce-ic{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    P + '.cce-urgent{color:#B54708}' + P + '.cce-late{color:#B42318}',
    // modal (bottom sheet on phones)
    P + '.cce-m{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,24,40,.45);font-family:inherit;-webkit-font-smoothing:antialiased}',
    P + '.cce-m *{box-sizing:border-box}',
    P + '.cce-card{display:flex;flex-direction:column;width:100%;max-width:600px;max-height:calc(100vh - 32px);background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(16,24,40,.25);color:#1D2939;line-height:1.4;overflow:hidden}',
    P + '.cce-hd{display:flex;align-items:flex-start;gap:12px;padding:20px 22px 12px;border-bottom:1px solid #F2F4F7}',
    P + '.cce-hd h2{flex:1;margin:0;font-size:22px;font-weight:600;color:#101828;letter-spacing:-.01em}',
    P + '.cce-hd small{display:block;margin:4px 0 0;font-size:14px;font-weight:400;color:#667085}',
    P + '.cce-x{flex:none;width:44px;height:44px;margin:-6px -8px 0 0;border:0;border-radius:12px;background:transparent;color:#475467;cursor:pointer;display:flex;align-items:center;justify-content:center}',
    P + '.cce-x svg{width:22px;height:22px}' + P + '.cce-x:hover{background:#F2F4F7}',
    P + '.cce-bd{flex:1;min-height:0;overflow:auto;padding:16px 22px 18px;overscroll-behavior:contain}',
    P + '.cce-ft{display:flex;gap:10px;flex-wrap:wrap;padding:14px 22px 18px;border-top:1px solid #F2F4F7;background:#fff}',
    P + '.cce-b{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 18px;border-radius:12px;border:1.5px solid #C9D5E4;background:#fff;color:' + NAVY + ';font:inherit;font-size:17px;font-weight:600;cursor:pointer;flex:1 1 auto}',
    P + '.cce-b svg{width:20px;height:20px}',
    P + '.cce-b.cce-pri{background:' + NAVY + ';border-color:' + NAVY + ';color:#fff;flex:2 1 auto}',
    P + '.cce-b.cce-pri.cce-go{background:#067647;border-color:#067647}',
    P + '.cce-b.cce-warn{color:#B42318;border-color:#F1C8C3}',
    P + '.cce-b[disabled]{opacity:.55;cursor:default}',
    P + '.cce-fld{display:block;margin:0 0 14px}',
    P + '.cce-fld > span{display:block;margin:0 0 6px;font-size:15px;font-weight:600;color:#344054}',
    P + '.cce-fld > span em{font-weight:400;font-style:italic;color:#667085}',
    P + '.cce-in{display:block;width:100%;min-height:52px;padding:0 14px;border:1.5px solid #D0D5DD;border-radius:12px;font:inherit;font-size:17px;color:#101828;background:#fff;outline:none}',
    P + 'textarea.cce-in{min-height:84px;padding:12px 14px;resize:vertical}',
    P + 'select.cce-in{appearance:none;-webkit-appearance:none;padding-right:40px;background:#fff url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231E3A5F\' stroke-width=\'2\'><path d=\'m6 9 6 6 6-6\'/></svg>") no-repeat right 14px center/16px}',
    P + '.cce-in:focus{border-color:' + NAVY + ';box-shadow:0 0 0 4px rgba(30,58,95,.12)}',
    P + '.cce-in.cce-bad{border-color:#D92D20}',
    P + '.cce-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    P + '.cce-chips{display:flex;flex-wrap:wrap;gap:8px}',
    P + '.cce-chip{display:inline-flex;align-items:center;gap:7px;min-height:48px;padding:0 14px;border:1.5px solid #D0D5DD;border-radius:12px;background:#fff;color:#344054;font:inherit;font-size:16px;cursor:pointer}',
    P + '.cce-chip svg{width:20px;height:20px}',
    P + '.cce-chip[aria-pressed="true"]{background:#EEF3F9;border-color:' + NAVY + ';color:' + NAVY + ';font-weight:600}',
    P + '.cce-more{margin:4px 0 14px;border:0}',
    P + '.cce-more > summary{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:' + NAVY + ';font-size:16px;font-weight:600;cursor:pointer;list-style:none}',
    P + '.cce-more > summary::-webkit-details-marker{display:none}',
    P + '.cce-err{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#FEF3F2;color:#B42318;font-size:15px}',
    P + '.cce-hint{margin:6px 0 0;font-size:14px;font-style:italic;color:#667085}',
    P + '.cce-dup{margin:0 0 14px;padding:12px 14px;border:1px solid #F5D9A8;border-radius:12px;background:#FFFAEB}',
    P + '.cce-dup b{display:block;margin:0 0 8px;font-size:16px;color:#93520B}',
    P + '.cce-dup button.cce-link{margin:0 14px 0 0}',
    P + '.cce-link{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 2px;border:0;background:none;color:' + NAVY + ';font:inherit;font-size:16px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    P + '.cce-facts{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:0 0 14px}',
    P + '.cce-fact{display:flex;align-items:flex-start;gap:10px;min-height:44px;padding:8px 0}',
    P + '.cce-fact > svg{flex:none;width:20px;height:20px;margin-top:2px;color:#667085}',
    P + '.cce-fact span{display:flex;flex-direction:column;font-size:16px;color:#101828;min-width:0;overflow-wrap:anywhere}',
    P + '.cce-fact span small{font-size:13px;color:#667085}',
    P + '.cce-fact .cce-tbd{font-style:italic;color:#667085}',
    P + '.cce-contact{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}',
    P + '.cce-contact a{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1.5px solid #D0D5DD;border-radius:12px;color:#1D2939;font-size:16px;text-decoration:none}',
    P + '.cce-contact a svg{width:20px;height:20px}' + P + '.cce-contact a.cce-wa{color:#128C4B;border-color:#A6E3C0}',
    P + '.cce-box{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#F9FAFB;font-size:16px;color:#344054;white-space:pre-wrap}',
    P + '.cce-box b{display:block;margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#667085;text-transform:uppercase}',
    P + '.cce-ok{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#ECFDF3;color:#067647;font-size:16px}',
    P + '.cce-cand{margin:0 0 14px;padding:12px 14px;border:1px solid #C9D5E4;border-radius:12px;background:#F5F8FC}',
    P + '.cce-cand b{display:block;margin:0 0 6px;font-size:15px;color:#344054}',
    P + '.cce-hist{margin:4px 0 0;border:0}',
    P + '.cce-hist > summary{min-height:44px;display:flex;align-items:center;color:#475467;font-size:15px;font-weight:600;cursor:pointer}',
    P + '.cce-hist ol{list-style:none;margin:0;padding:0 0 0 14px;border-left:2px solid #EAECF0}',
    P + '.cce-hist li{position:relative;padding:6px 0 10px 4px;font-size:15px;color:#344054}',
    P + '.cce-hist li:before{content:"";position:absolute;left:-20px;top:12px;width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #98A2B3}',
    P + '.cce-hist li small{display:block;font-size:13px;color:#667085}',
    P + '.cce-hist li em{display:block;font-size:14px;color:#475467}',
    P + '.cce-stage{display:flex;align-items:center;gap:10px;margin:0 0 14px;flex-wrap:wrap}',
    P + '.cce-stage > span{font-size:15px;color:#475467}',
    P + '.cce-stage select{min-height:44px;width:auto;flex:0 1 220px}',
    P + '.cce-reasons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}',
    P + '.cce-reasons .cce-chip{justify-content:flex-start;width:100%}',
    // banner on the New order screen while converting
    P + '#cc-staff .cce-conv{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:12px 16px;border:1px solid #A6E3C0;border-radius:14px;background:#ECFDF3;color:#05603A;font-size:16px;grid-column:1 / -1}',
    P + '#cc-staff .cce-conv svg{width:22px;height:22px;flex:none}',
    P + '#cc-staff .cce-conv > span{flex:1 1 260px;min-width:0}',
    P + '#cc-staff .cce-conv small{display:block;font-size:14px;font-style:italic;color:#067647;white-space:pre-wrap}',
    P + '#cc-staff .cce-conv button{min-height:44px;padding:0 14px;border:1.5px solid #A6E3C0;border-radius:10px;background:#fff;color:#05603A;font:inherit;font-size:15px;font-weight:600;cursor:pointer}',
    '@media (max-width:759px){',
    P + '.cce-m{align-items:flex-end;padding:0}',
    P + '.cce-card{max-width:none;max-height:92vh;border-radius:20px 20px 0 0}',
    P + '.cce-ft{padding-bottom:calc(16px + env(safe-area-inset-bottom))}',
    P + '.cce-hd h2{font-size:20px}',
    P + '.cce-two,' + P + '.cce-facts,' + P + '.cce-reasons{grid-template-columns:1fr}',
    P + '#cc-staff .cce-row{grid-template-columns:auto minmax(0,1fr);}',
    P + '#cc-staff .cce-side{grid-column:1 / -1;flex-direction:row;justify-content:space-between;align-items:center}',
    P + '#cc-staff .cce-search{flex-basis:100%;max-width:none}',
    '}'
  ].join('\n');

  // ---------- icons (thin lines) ----------
  var I = {
    walk: '<circle cx="13" cy="4.5" r="1.6"/><path d="M10.5 21l2-6-2.5-2.5 1-4.5 3 2.5 3 1"/><path d="M11 8.5L8 10l-1.5 3.5M12.5 15l2.5 6"/>',
    phone: '<path d="M5 4h3.5l1.5 4-2.2 1.4a11 11 0 0 0 6.8 6.8L16 14l4 1.5V19a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z"/><path d="M9 9.2c.2 2.6 2.6 5 5.2 5.4l1.2-1.3-1.8-1-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-1-1.8z"/>',
    messenger: '<path d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.8 0 2.4 1.2 4.6 3 6V21l3.3-1.8c.7.2 1.4.3 2.2.3 4.7 0 8.5-3.4 8.5-7.8S16.7 3.5 12 3.5z"/><path d="M7.5 13.5l3-3.2 2.2 2 3.8-2.8-3 3.3-2.3-2z"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.5 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.5-3.5-8.5s1.1-5.9 3.5-8.5z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    dots: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.6" r=".5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chat: '<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/><path d="M8 9.5h8M8 12.5h5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    cake: '<path d="M4 20.5h16M5 20.5V13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7.5"/><path d="M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0M12 11V8"/><path d="M12 4.5c.8.8.8 1.7 0 2.5-.8-.8-.8-1.7 0-2.5z"/>',
    star: '<path d="m12 3.8 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    note: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7.5H18.5M9 12h6M9 15.5h6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    undo: '<path d="M9 14 4.5 9.5 9 5"/><path d="M5 9.5h9a5.5 5.5 0 0 1 0 11h-3"/>',
    money: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>'
  };
  function ic(n, extra) { return '<svg class="cce-ic" viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + (I[n] || '') + '</svg>'; }

  var SOURCES = [['walk_in', 'Walk-in', 'walk', ''], ['phone', 'Phone', 'phone', ''], ['whatsapp', 'WhatsApp', 'whatsapp', '#128C4B'], ['messenger', 'Messenger', 'messenger', '#0866FF'],
    ['instagram', 'Instagram', 'instagram', '#C13584'], ['website', 'Website', 'globe', ''], ['email', 'Email', 'mail', ''], ['other', 'Other', 'dots', '']];
  var SRC = {}; SOURCES.forEach(function (s) { SRC[s[0]] = s; }); SRC.unknown = ['unknown', 'Not recorded', 'help', ''];
  var STATUS = { 'new': 'New', discussion: 'In discussion', quoted: 'Quoted', follow_up: 'Follow up', converted: 'Ordered', closed: 'Not ordered' };
  var OPEN = ['new', 'discussion', 'quoted', 'follow_up'];
  var REASONS = [['price', 'Price too high'], ['cake_unavailable', 'Cake not available'], ['design_unavailable', 'Design not possible'], ['date_unavailable', 'Date not available'],
    ['other_supplier', 'Went elsewhere'], ['changed_plans', 'Changed plans'], ['no_response', 'No reply'], ['comparing', 'Just comparing'], ['cannot_meet', 'Couldn’t meet needs'],
    ['other', 'Other'], ['unknown', 'Don’t know']];
  var REASON = {}; REASONS.forEach(function (r) { REASON[r[0]] = r[1]; });
  var OCC = [['birthday', 'Birthday'], ['anniversary', 'Anniversary'], ['wedding', 'Wedding'], ['baby_shower', 'Baby shower'], ['graduation', 'Graduation'], ['mothers_day', 'Mother’s Day'],
    ['fathers_day', 'Father’s Day'], ['christmas', 'Christmas'], ['valentines_day', 'Valentine’s Day'], ['corporate_event', 'Corporate event'], ['just_because', 'Just because'], ['other', 'Other']];
  var TO_ORDER_SOURCE = { walk_in: 'walk_in', phone: 'phone', whatsapp: 'whatsapp', messenger: 'social', instagram: 'social' };

  // ---------- small helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bc() { return win.__ccsBc && typeof win.__ccsBc.rpc === 'function' ? win.__ccsBc : null; }
  function rpc(fn, args) { var b = bc(); if (!b) return Promise.reject(new Error('not ready')); return Promise.resolve(b.rpc(fn, args)).then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; }); }
  function toast(t, bad) { var b = bc(); if (b && typeof b.toast === 'function') { try { b.toast(t, bad); return; } catch (e) {} } }
  function practice() { return doc.documentElement.classList.contains('ccp-on'); }
  var FJ = 'Pacific/Fiji';
  function fmt(d, o) { try { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: FJ }, o)).format(d); } catch (e) { return ''; } }
  function today() { return fmt(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-'); }
  function dayDiff(iso) { if (!iso) return null; var a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)), t = today(), b = Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)); return Math.round((a - b) / 864e5); }
  function dDate(iso) { var d = new Date(iso + 'T12:00:00+12:00'); return { wd: fmt(d, { weekday: 'short' }), dm: fmt(d, { day: 'numeric', month: 'short' }), long: fmt(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }; }
  function time12(ts) { var s = fmt(new Date(ts), { hour: 'numeric', minute: '2-digit', hour12: true }); return s.replace(/\s?(am|pm)$/i, function (x) { return ' ' + x.trim().toUpperCase(); }); }
  function stamp(ts) { if (!ts) return ''; return fmt(new Date(ts), { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + time12(ts); }
  function ago(ts) {
    if (!ts) return ''; var m = Math.round((Date.now() - new Date(ts).getTime()) / 6e4);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' hr ago';
    var d = Math.round(h / 24); if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago'); return fmt(new Date(ts), { day: 'numeric', month: 'short' });
  }
  function money(v) { if (v == null || v === '') return ''; var n = Number(v); return isFinite(n) ? '$' + (n % 1 ? n.toFixed(2) : String(n)) : ''; }
  function chip(st) { return '<span class="cce-st st-' + esc(st) + '"><i></i>' + esc(STATUS[st] || st) + '</span>'; }
  function srcTag(s, withLabel) { var x = SRC[s] || SRC.unknown; return '<span class="cce-src" title="' + esc(x[1]) + '"' + (x[3] ? ' style="color:' + x[3] + '"' : '') + '>' + ic(x[2]) + (withLabel ? '<span' + (s === 'unknown' ? ' class="cce-tbd"' : '') + '>' + esc(x[1]) + '</span>' : '') + '</span>'; }
  function uuid() { try { return win.crypto.randomUUID(); } catch (e) { return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); } }
  function occList() {
    var labels = Array.isArray(win.__ccsOcc) ? win.__ccsOcc : null;
    if (!labels) return OCC;
    var byLabel = {}; OCC.forEach(function (o) { byLabel[o[1].replace('’', "'")] = o[0]; });
    var out = labels.map(function (l) { var k = byLabel[String(l).replace('’', "'")]; return k ? [k, l] : null; }).filter(Boolean);
    return out.length ? out : OCC;
  }
  function waLink(key) { return key ? 'https://wa.me/' + String(key).replace(/\D/g, '') : ''; }

  // ---------- state ----------
  var S = { on: false, view: 'open', q: '', rows: null, counts: null, loading: false, err: null, last: 0, seq: 0 };
  try { S.on = sessionStorage.getItem('cce-on') === '1'; } catch (e) {}
  var M = null;   // modal: { kind:'new'|'view'|'edit'|'quote'|'note'|'close', id, data, form, err, busy, dup }

  function setOn(v) { S.on = !!v; try { sessionStorage.setItem('cce-on', S.on ? '1' : '0'); } catch (e) {} if (S.on) load(); schedule(); }
  function load(quiet) {
    if (!bc() || practice()) return;
    var my = ++S.seq; if (!quiet) S.loading = true; schedule();
    rpc('enquiry_list', { p_view: S.view, p_q: S.q || null }).then(function (d) {
      if (my !== S.seq) return; S.loading = false; S.last = Date.now();
      if (!d || !d.ok) { S.err = (d && d.message) || 'Could not load enquiries.'; } else { S.err = null; S.rows = d.rows || []; S.counts = d.counts || {}; }
      schedule();
    }, function () { if (my !== S.seq) return; S.loading = false; S.err = 'Could not load enquiries. Check the internet connection.'; schedule(); });
  }

  // ---------- Orders screen: tab, header button, list ----------
  function ordersScreen() { var m = doc.querySelector('#cc-staff #ccs-main'); return m && m.getAttribute('data-screen') === 'orders' ? m : null; }
  function newBtn(cls) { return '<button type="button" class="cce-newbtn' + (cls ? ' ' + cls : '') + '" data-cce="new">' + ic('chat') + '<span>New enquiry</span></button>'; }
  function decorate() {
    var main = doc.querySelector('#cc-staff #ccs-main');
    if (!main) return;
    var scr = main.getAttribute('data-screen');
    // New enquiry beside New order (Orders and Today)
    if (!practice() && (scr === 'orders' || scr === 'today')) {
      var acts = main.querySelector(':scope > .ccs-head .ccs-head-acts, :scope > .ccs-dash-head .ccs-head-acts');
      if (acts && !acts.querySelector('.cce-newbtn')) { var nb = acts.querySelector('.ccs-newtop'); var w = doc.createElement('div'); w.innerHTML = newBtn('cce-headbtn'); var b = w.firstChild; if (nb) acts.insertBefore(b, nb); else acts.appendChild(b); }
    }
    var om = ordersScreen();
    if (!om || practice()) { if (main.classList.contains('cce-on')) main.classList.remove('cce-on'); var old = main.querySelector(':scope > .cce-panel'); if (old) old.remove(); return; }
    var tabs = om.querySelector(':scope > .ccs-tabs');
    if (tabs) {
      var t = tabs.querySelector('.cce-tab');
      var n = S.counts ? S.counts.open : null;
      var label = 'Enquiries' + (n ? '<span class="ccs-n">' + n + '</span>' : '');
      if (!t) { t = doc.createElement('button'); t.type = 'button'; t.className = 'ccs-tab cce-tab'; t.setAttribute('data-cce', 'tab'); tabs.appendChild(t); }
      if (t.innerHTML !== label) t.innerHTML = label;
      if (t.getAttribute('aria-pressed') !== String(S.on)) t.setAttribute('aria-pressed', String(S.on));
      if (S.on) [].forEach.call(tabs.querySelectorAll('.ccs-tab:not(.cce-tab)[aria-pressed="true"]'), function (x) { x.setAttribute('aria-pressed', 'false'); x.setAttribute('data-cce-was', '1'); });
    }
    om.classList.toggle('cce-on', S.on);
    var panel = om.querySelector(':scope > .cce-panel');
    if (!S.on) { if (panel) panel.remove(); return; }
    if (!panel) { panel = doc.createElement('div'); panel.className = 'cce-panel'; om.appendChild(panel); if (!S.rows && !S.loading) load(); }
    var html = panelHtml();
    if (panel.__h !== html) {
      var focus = doc.activeElement && doc.activeElement.id === 'cce-q', pos = focus ? doc.activeElement.selectionStart : 0;
      panel.innerHTML = html; panel.__h = html;
      if (focus) { var q = doc.getElementById('cce-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) {} } }
    }
    if (S.on && Date.now() - S.last > 60000 && !S.loading) load(true);
  }
  function panelHtml() {
    var c = S.counts || {};
    var opts = [['open', 'Open'], ['converted', 'Ordered'], ['closed', 'Not ordered'], ['all', 'All']].map(function (o) {
      var n = c[o[0]]; return '<option value="' + o[0] + '"' + (S.view === o[0] ? ' selected' : '') + '>' + o[1] + (n != null ? ' (' + n + ')' : '') + '</option>'; }).join('');
    var h = '<div class="cce-bar"><label class="cce-search">' + ic('search') + '<input id="cce-q" type="search" placeholder="Name, mobile or EQ number" value="' + esc(S.q) + '" autocomplete="off" aria-label="Search enquiries"></label>' +
      '<label class="cce-view"><select data-cce="view" aria-label="Show">' + opts + '</select>' + ic('down') + '</label>' + newBtn('cce-barbtn') + '</div>';
    if (S.err) return h + '<div class="cce-empty"><b>Could not load</b>' + esc(S.err) + '<br><button type="button" class="cce-link" data-cce="reload">Try again</button></div>';
    if (!S.rows) return h + '<div class="cce-empty">Loading enquiries…</div>';
    if (!S.rows.length) return h + '<div class="cce-empty"><b>' + (S.q ? 'No enquiries match' : S.view === 'open' ? 'No open enquiries' : 'Nothing here yet') + '</b>' +
      (S.view === 'open' && !S.q ? 'When someone asks about a cake but does not order yet, tap New enquiry.' : '') + '</div>';
    return h + '<div class="cce-list">' + S.rows.map(rowHtml).join('') + '</div>';
  }
  function rowHtml(e) {
    var dd = e.required_date ? dDate(e.required_date) : null, gap = e.required_date ? dayDiff(e.required_date) : null, open = OPEN.indexOf(e.status) > -1;
    var warn = open && gap != null ? (gap < 0 ? ' cce-late' : gap <= 3 ? ' cce-urgent' : '') : '';
    var when = dd ? '<span class="cce-when">' + (warn ? '<small class="' + warn.trim() + '">' + ic('clock', ' style="width:14px;height:14px;vertical-align:-2px"') + ' ' + (gap < 0 ? 'Passed' : gap === 0 ? 'Today' : gap === 1 ? 'Tomorrow' : 'In ' + gap + ' days') + '</small>' : '<small>' + esc(dd.wd) + '</small>') + '<b>' + esc(dd.dm) + '</b></span>'
      : '<span class="cce-when cce-nodate"><small>Pickup</small><b>No date</b></span>';
    var cake = e.cake_note ? '<span class="cce-cake">' + esc(e.cake_note) + '</span>' : '<span class="cce-cake cce-tbd">Cake not decided</span>';
    var occ = e.occasion_label ? ' · ' + esc(e.occasion_label) : '';
    var right = '<span class="cce-side">' + chip(e.status) + (e.quoted_value != null && e.status !== 'converted' ? '<b>' + esc(money(e.quoted_value)) + '</b>' : e.order_reference ? '<span class="cce-meta">' + esc(e.order_reference) + '</span>' : '') + '</span>';
    return '<button type="button" class="cce-row" data-cce-open="' + esc(e.id) + '">' + when + '<span class="cce-main">' + cake + '<span class="cce-who">' + esc(e.display_name) + occ + '</span>' +
      '<span class="cce-meta">' + srcTag(e.source) + '<span>' + esc(e.reference) + '</span><span>·</span><span>' + esc(ago(e.created_at)) + '</span></span></span>' + right + '</button>';
  }

  // ---------- modal ----------
  // inside the app's root, so it gets the app's font and its date picker
  function mroot() { var r = doc.getElementById('cce-m'), host = doc.getElementById('cc-staff') || doc.body; if (!r || r.parentNode !== host) { if (r) r.remove(); r = doc.createElement('div'); r.id = 'cce-m'; r.className = 'cce-m'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); host.appendChild(r); } return r; }
  function closeModal() { M = null; var r = doc.getElementById('cce-m'); if (r) r.remove(); }
  function shell(title, sub, body, foot) {
    return '<div class="cce-card"><div class="cce-hd"><h2>' + title + (sub ? '<small>' + sub + '</small>' : '') + '</h2><button type="button" class="cce-x" data-cce="x" aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="cce-bd">' + body + '</div>' + (foot ? '<div class="cce-ft">' + foot + '</div>' : '') + '</div>';
  }
  function fval(id) { var el = doc.getElementById(id); return el ? el.value : ''; }
  function keepForm() {   // read the form into state before re-rendering
    if (!M || !M.form) return;
    ['name', 'phone', 'date', 'cake', 'occ', 'notes', 'quote', 'campaign', 'other'].forEach(function (k) { var el = doc.getElementById('cce-f-' + k); if (el) M.form[k] = el.value; });
    var more = doc.querySelector('#cce-m .cce-more'); if (more) M.form.more = more.open;
  }
  function render() {
    if (!M) return closeModal();
    var r = mroot(), h = '';
    var focusId = doc.activeElement && doc.activeElement.id && r.contains(doc.activeElement) ? doc.activeElement.id : null;
    var scroll = r.querySelector('.cce-bd') ? r.querySelector('.cce-bd').scrollTop : 0;
    if (M.kind === 'new' || M.kind === 'edit') h = formHtml();
    else if (M.kind === 'view') h = viewHtml();
    else if (M.kind === 'quote') h = quoteHtml();
    else if (M.kind === 'note') h = noteHtml();
    else if (M.kind === 'close') h = closeHtml();
    r.innerHTML = h;
    var bd = r.querySelector('.cce-bd'); if (bd && M.keepScroll) bd.scrollTop = scroll; M.keepScroll = false;
    var f = focusId && doc.getElementById(focusId) || (M.autofocus && doc.getElementById(M.autofocus));
    M.autofocus = null;
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  function errHtml() { return M.err ? '<p class="cce-err" role="alert">' + esc(M.err) + '</p>' : ''; }

  function formHtml() {
    var f = M.form, isNew = M.kind === 'new';
    var src = '<div class="cce-chips" role="group" aria-label="How they asked">' + SOURCES.map(function (s) {
      return '<button type="button" class="cce-chip" data-cce-src="' + s[0] + '" aria-pressed="' + (f.source === s[0]) + '"' + (s[3] ? ' style="--c:' + s[3] + '"' : '') + '><span style="display:inline-flex' + (s[3] ? ';color:' + s[3] : '') + '">' + ic(s[2]) + '</span>' + esc(s[1]) + '</button>'; }).join('') + '</div>';
    var occ = '<select class="cce-in" id="cce-f-occ"><option value="">Not known</option>' + occList().map(function (o) { return '<option value="' + o[0] + '"' + (f.occ === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    var dup = M.dup ? '<div class="cce-dup"><b>' + esc(M.dup.length > 1 ? 'They already have open enquiries' : 'They already have an open enquiry') + '</b>' + M.dup.map(function (d) {
      return '<div style="margin:0 0 8px">' + chip(d.status) + ' <b style="display:inline;color:#344054">' + esc(d.reference) + '</b> · ' + esc(d.cake_note || 'Cake not decided') + ' · ' + esc(ago(d.created_at)) + '<br><button type="button" class="cce-link" data-cce-open="' + esc(d.id) + '">Open it</button></div>'; }).join('') +
      '<button type="button" class="cce-link" data-cce="force">Save as a new enquiry</button><p class="cce-hint">Only if this is a different cake or occasion.</p></div>' : '';
    var body = errHtml() + dup +
      '<div class="cce-two"><label class="cce-fld"><span>Name</span><input class="cce-in" id="cce-f-name" autocomplete="off" value="' + esc(f.name) + '"></label>' +
      '<label class="cce-fld"><span>Mobile</span><input class="cce-in' + (M.errField === 'contact_phone' ? ' cce-bad' : '') + '" id="cce-f-phone" type="tel" inputmode="tel" autocomplete="off" value="' + esc(f.phone) + '"></label></div>' +
      '<div class="cce-fld"><span>How did they ask?</span>' + src + '</div>' +
      '<div class="cce-two"><label class="cce-fld"><span>Pickup date <em>if known</em></span><input class="cce-in' + (M.errField === 'required_date' ? ' cce-bad' : '') + '" id="cce-f-date" type="date" min="' + today() + '" value="' + esc(f.date) + '"></label>' +
      '<label class="cce-fld"><span>Occasion</span>' + occ + '</label></div>' +
      '<label class="cce-fld"><span>Cake <em>if known</em></span><input class="cce-in" id="cce-f-cake" autocomplete="off" placeholder="e.g. chocolate, 8 inch" value="' + esc(f.cake) + '"></label>' +
      '<details class="cce-more"' + (f.more ? ' open' : '') + '><summary>' + ic('plus', ' style="width:18px;height:18px"') + 'More</summary>' +
      '<label class="cce-fld"><span>Notes</span><textarea class="cce-in" id="cce-f-notes">' + esc(f.notes) + '</textarea></label>' +
      '<div class="cce-two">' + (isNew ? '<label class="cce-fld"><span>Price quoted <em>$</em></span><input class="cce-in" id="cce-f-quote" inputmode="decimal" value="' + esc(f.quote) + '"></label>' : '') +
      '<label class="cce-fld"><span>Ad or campaign <em>if they said</em></span><input class="cce-in" id="cce-f-campaign" autocomplete="off" value="' + esc(f.campaign) + '"></label></div>' +
      '<label class="cce-fld"><span>Other contact <em>email, Facebook name</em></span><input class="cce-in" id="cce-f-other" autocomplete="off" value="' + esc(f.other) + '"></label></details>' +
      '<p class="cce-hint">Only a name or a mobile is needed. Add the rest when you know it.</p>';
    var foot = '<button type="button" class="cce-b" data-cce="' + (isNew ? 'x' : 'back') + '">' + (isNew ? 'Cancel' : 'Back') + '</button><button type="button" class="cce-b cce-pri" data-cce="save"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : isNew ? 'Save enquiry' : 'Save changes') + '</button>';
    return shell(isNew ? 'New enquiry' : 'Change details', isNew ? '' : esc(M.data.enquiry.reference), body, foot);
  }
  function fact(icn, label, val, tbd) { return '<div class="cce-fact">' + ic(icn) + '<span><small>' + esc(label) + '</small>' + (tbd ? '<span class="cce-tbd">' + esc(tbd) + '</span>' : val) + '</span></div>'; }
  function viewHtml() {
    if (!M.data) return shell('Enquiry', '', M.err ? errHtml() : '<p>Loading…</p>', '');
    var d = M.data, e = d.enquiry, open = OPEN.indexOf(e.status) > -1;
    var gap = e.required_date ? dayDiff(e.required_date) : null;
    var body = errHtml() + (M.ok ? '<p class="cce-ok">' + esc(M.ok) + '</p>' : '');
    var key = e.contact_phone_key || (d.customer && d.customer.phone ? String(d.customer.phone).replace(/\D/g, '') : '');
    if (key || e.contact_other) body += '<div class="cce-contact">' + (key ? '<a href="tel:+' + esc(key.length === 7 ? '679' + key : key) + '">' + ic('phone') + esc(e.contact_phone || (d.customer && d.customer.phone) || '') + '</a><a class="cce-wa" href="' + esc(waLink(key.length === 7 ? '679' + key : key)) + '" target="_blank" rel="noopener">' + ic('whatsapp') + 'WhatsApp</a>' : '') + (e.contact_other ? '<span class="cce-fact" style="min-height:44px;padding:0 6px">' + ic('note') + '<span>' + esc(e.contact_other) + '</span></span>' : '') + '</div>';
    body += '<div class="cce-facts">' +
      fact('cal', 'Pickup', e.required_date ? esc(dDate(e.required_date).long) + (open && gap != null && gap <= 3 ? ' <span class="' + (gap < 0 ? 'cce-late' : 'cce-urgent') + '">' + ic('clock', ' style="width:16px;height:16px;vertical-align:-3px"') + '</span>' : '') : '', e.required_date ? '' : 'Not decided') +
      fact('star', 'Occasion', esc(e.occasion_label || ''), e.occasion_label ? '' : 'Not known') +
      fact('cake', 'Cake', esc(e.cake_note || ''), e.cake_note ? '' : 'Not decided') +
      fact('money', 'Price quoted', esc(money(e.quoted_value)), e.quoted_value != null ? '' : 'No quote yet') +
      '<div class="cce-fact">' + srcTag(e.source) + '<span><small>How they asked</small>' + (e.source === 'unknown' ? '<span class="cce-tbd">Not recorded</span>' : esc(SRC[e.source] ? SRC[e.source][1] : e.source)) + (e.campaign ? '<small>Ad: ' + esc(e.campaign) + '</small>' : '') + '</span></div>' +
      fact('user', 'Taken by', esc(e.created_by_name || 'Staff') + '<small>' + esc(stamp(e.created_at)) + '</small>') +
      (e.last_contact_at ? fact('phone', 'Last contact', esc(stamp(e.last_contact_at))) : '') +
      (d.customer ? fact('user', 'Customer', esc(d.customer.name) + '<small>' + esc(d.customer.orders ? d.customer.orders + (d.customer.orders === 1 ? ' order before' : ' orders before') : 'No orders yet') + '</small>') : '') +
      '</div>';
    if (e.notes) body += '<div class="cce-box"><b>Notes</b>' + esc(e.notes) + '</div>';
    if (e.status === 'closed') body += '<div class="cce-box"><b>Not ordered</b>' + esc(e.close_reason ? REASON[e.close_reason] || e.close_reason : 'Reason not recorded') + (e.close_reason_by ? ' · ' + (e.close_reason_by === 'customer' ? 'customer said' : 'our guess') : '') + (e.close_note ? '\n' + esc(e.close_note) : '') + '</div>';
    if (e.status === 'converted' && d.order) body += '<div class="cce-ok">' + ic('check', ' style="width:18px;height:18px;vertical-align:-4px"') + ' Ordered: <b>' + esc(d.order.reference) + '</b>' + (d.order.required_date ? ' · pickup ' + esc(dDate(d.order.required_date).long) : '') + '</div>';
    if (open) body += '<div class="cce-stage"><span>Stage</span><select class="cce-in" data-cce="stage" aria-label="Stage">' + OPEN.map(function (s) { return '<option value="' + s + '"' + (e.status === s ? ' selected' : '') + '>' + esc(STATUS[s]) + '</option>'; }).join('') + '</select></div>';
    if ((open || e.status === 'closed') && d.candidates && d.candidates.length) body += '<div class="cce-cand"><b>Already ordered?</b>' + d.candidates.map(function (c) {
      return '<button type="button" class="cce-link" data-cce-linkorder="' + esc(c.id) + '">' + ic('link', ' style="width:18px;height:18px"') + 'Link ' + esc(c.reference) + (c.required_date ? ' · ' + esc(dDate(c.required_date).long) : '') + '</button>'; }).join('<br>') + '</div>';
    if (d.others && d.others.length) body += '<div class="cce-box"><b>Other enquiries</b>' + d.others.slice(0, 4).map(function (o) { return esc(o.reference) + ' · ' + esc(STATUS[o.status] || o.status) + ' · ' + esc(o.cake_note || 'Cake not decided') + ' · ' + esc(ago(o.created_at)); }).join('\n') + '</div>';
    if (d.events && d.events.length) body += '<details class="cce-hist"' + (M.histOpen ? ' open' : '') + '><summary>History (' + d.events.length + ')</summary><ol>' + d.events.map(evHtml).join('') + '</ol></details>';
    var foot = '';
    if (open) foot = '<button type="button" class="cce-b cce-pri cce-go" data-cce="convert"' + (M.busy ? ' disabled' : '') + '>' + ic('arrow') + 'Convert to order</button>' +
      '<button type="button" class="cce-b" data-cce="quote">' + ic('money') + 'Quote</button><button type="button" class="cce-b" data-cce="note">' + ic('phone') + 'Log contact</button>' +
      '<button type="button" class="cce-b" data-cce="edit">' + ic('edit') + 'Change</button><button type="button" class="cce-b cce-warn" data-cce="close">' + ic('ban') + 'Not ordered</button>';
    else if (e.status === 'closed') foot = '<button type="button" class="cce-b cce-pri" data-cce="reopen"' + (M.busy ? ' disabled' : '') + '>' + ic('undo') + 'Reopen</button><button type="button" class="cce-b" data-cce="note">' + ic('note') + 'Add note</button>';
    else foot = (d.order ? '<button type="button" class="cce-b cce-pri" data-cce="findorder">' + ic('search') + 'Find ' + esc(d.order.reference) + '</button>' : '') + '<button type="button" class="cce-b" data-cce="note">' + ic('note') + 'Add note</button>';
    return shell(esc(e.display_name), chip(e.status) + ' &nbsp;' + esc(e.reference), body, foot);
  }
  function evHtml(v) {
    var t = { created: 'Enquiry taken', edit: 'Details changed', status: 'Stage: ' + (STATUS[v.to] || v.to), quote: 'Quoted ' + money(v.data && v.data.value), note: 'Note', contact: 'Contacted the customer',
      close: 'Not ordered' + (v.data && v.data.reason ? ': ' + (REASON[v.data.reason] || v.data.reason) : ''), reopen: 'Reopened', convert: 'Ordered' + (v.data && v.data.order ? ': ' + v.data.order : '') }[v.kind] || v.kind;
    return '<li>' + esc(t) + (v.note ? '<em>' + esc(v.note) + '</em>' : '') + '<small>' + esc(stamp(v.at)) + ' · ' + esc(v.by || 'Staff') + '</small></li>';
  }
  function quoteHtml() {
    var e = M.data.enquiry;
    return shell('Price quoted', esc(e.reference), errHtml() + '<label class="cce-fld"><span>Price told to the customer <em>$</em></span><input class="cce-in" id="cce-f-qv" inputmode="decimal" value="' + esc(M.form.qv) + '"></label><p class="cce-hint">Not a sale until it becomes an order.</p>',
      '<button type="button" class="cce-b" data-cce="back">Back</button><button type="button" class="cce-b cce-pri" data-cce="savequote"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Save price') + '</button>');
  }
  function noteHtml() {
    var e = M.data.enquiry, open = OPEN.indexOf(e.status) > -1;
    return shell(open ? 'Log contact' : 'Add note', esc(e.reference), errHtml() +
      (open ? '<div class="cce-chips" style="margin:0 0 12px"><button type="button" class="cce-chip" data-cce-contact="1" aria-pressed="' + (M.form.contact !== false) + '">' + ic('phone') + 'We spoke or messaged</button><button type="button" class="cce-chip" data-cce-contact="0" aria-pressed="' + (M.form.contact === false) + '">' + ic('note') + 'Just a note</button></div>' : '') +
      '<label class="cce-fld"><span>What was said <em>optional</em></span><textarea class="cce-in" id="cce-f-nt" placeholder="e.g. Will decide on Friday">' + esc(M.form.nt) + '</textarea></label>',
      '<button type="button" class="cce-b" data-cce="back">Back</button><button type="button" class="cce-b cce-pri" data-cce="savenote"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Save') + '</button>');
  }
  function closeHtml() {
    var e = M.data.enquiry, f = M.form;
    var body = errHtml() + '<p style="margin:0 0 10px;font-size:16px;color:#344054">Why didn’t they order? <em style="color:#667085">Skip if you don’t know.</em></p><div class="cce-reasons">' + REASONS.map(function (r) {
      return '<button type="button" class="cce-chip" data-cce-reason="' + r[0] + '" aria-pressed="' + (f.reason === r[0]) + '">' + esc(r[1]) + '</button>'; }).join('') + '</div>' +
      (f.reason && f.reason !== 'unknown' ? '<div class="cce-chips" style="margin:0 0 14px"><button type="button" class="cce-chip" data-cce-by="customer" aria-pressed="' + (f.by === 'customer') + '">' + ic('chat') + 'Customer said so</button><button type="button" class="cce-chip" data-cce-by="staff" aria-pressed="' + (f.by === 'staff') + '">' + ic('help') + 'Our guess</button></div>' : '') +
      '<label class="cce-fld"><span>Note <em>optional</em></span><textarea class="cce-in" id="cce-f-cn">' + esc(f.cn) + '</textarea></label>';
    return shell('Not ordered', esc(e.reference), body, '<button type="button" class="cce-b" data-cce="back">Back</button><button type="button" class="cce-b cce-pri" data-cce="saveclose"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving…' : 'Close enquiry') + '</button>');
  }

  // ---------- actions ----------
  function openNew() { M = { kind: 'new', form: { name: '', phone: '', source: null, date: '', cake: '', occ: '', notes: '', quote: '', campaign: '', other: '', more: false, idem: uuid() }, autofocus: 'cce-f-name' }; render(); }
  function openView(id, ok) {
    M = { kind: 'view', id: id, data: null, ok: ok || null }; render();
    rpc('enquiry_get', { p_id: id }).then(function (d) { if (!M || M.id !== id) return; if (!d || !d.ok) { M.err = (d && d.message) || 'Could not open this enquiry.'; } else M.data = d; render(); },
      function () { if (!M || M.id !== id) return; M.err = 'Could not open this enquiry. Check the internet connection.'; render(); });
  }
  function done(d, msg) { if (!d || !d.ok) { M.busy = false; M.err = (d && d.message) || 'Could not save.'; render(); return false; } load(true); openView(d.enquiry.id, msg); return true; }
  function fail() { if (!M) return; M.busy = false; M.err = 'Could not save. Check the internet connection and try again.'; render(); }
  function save(force) {
    keepForm(); var f = M.form, isNew = M.kind === 'new';
    if (!f.name.trim() && f.phone.replace(/\D/g, '').length < 7 && !(f.other || '').trim() && isNew) { M.err = 'Add a name or a mobile number.'; M.autofocus = 'cce-f-name'; return render(); }
    var p = { contact_name: f.name, contact_phone: f.phone, contact_other: f.other, source: f.source || 'unknown', required_date: f.date || null, cake_note: f.cake, occasion_code: f.occ || null, notes: f.notes, campaign: f.campaign };
    if (isNew) { p.idem = f.idem; if (f.quote) p.quoted_value = f.quote; if (force) p.force = true; }
    else { p.id = M.data.enquiry.id; p.version = M.data.enquiry.version; }
    M.busy = true; M.err = null; M.errField = null; render();
    rpc('enquiry_save', { p: p }).then(function (d) {
      if (!M) return;
      if (d && !d.ok && d.error === 'duplicate') { M.busy = false; M.dup = d.matches || []; render(); var bd = doc.querySelector('#cce-m .cce-bd'); if (bd) bd.scrollTop = 0; return; }
      if (d && !d.ok && d.field) M.errField = d.field;
      if (d && !d.ok && d.error === 'conflict' && d.enquiry) { M.data.enquiry = d.enquiry; }
      if (done(d, isNew ? 'Enquiry ' + (d.enquiry && d.enquiry.reference) + ' saved.' : 'Saved.') && isNew) toast('Enquiry ' + d.enquiry.reference + ' saved');
    }, fail);
  }
  function act(fn, args, msg) { M.busy = true; M.err = null; render(); rpc(fn, args).then(function (d) { if (M) done(d, msg); }, fail); }

  // ---------- convert: fill the New order screen ----------
  var PEND = 'cce-convert';
  function pending() { try { var p = JSON.parse(sessionStorage.getItem(PEND) || 'null'); return p && Date.now() - p.at < 4 * 3600e3 ? p : null; } catch (e) { return null; } }
  function setPending(p) { try { if (p) sessionStorage.setItem(PEND, JSON.stringify(p)); else sessionStorage.removeItem(PEND); } catch (e) {} }
  var lastV = null;
  function convert() {
    var d = M.data, e = d.enquiry;
    setPending({ id: e.id, ref: e.reference, name: e.contact_name || (d.customer && d.customer.name) || '', phone: e.contact_phone || (d.customer && d.customer.phone) || '',
      customer: d.customer ? { id: d.customer.id, full_name: d.customer.name, phone: d.customer.phone || '', orders_count: d.customer.orders || 0, favourite_cake: null } : null,
      source: TO_ORDER_SOURCE[e.source] || null, occ: e.occasion_label || null, date: e.required_date && dayDiff(e.required_date) >= 0 ? e.required_date : '',
      cake: e.cake_note || '', notes: e.notes || '', quote: e.quoted_value, at: Date.now(), filled: false });
    closeModal(); S.on = false; try { sessionStorage.setItem('cce-on', '0'); } catch (er) {}
    var b = bc(); if (b && typeof b.go === 'function') b.go('new'); else { var n = doc.querySelector('#cc-staff [data-tab="new"]'); if (n) n.click(); }
    setTimeout(schedule, 120);
  }
  function fill(V) {
    lastV = V; var p = pending(); if (!p || !V || V.result) return;
    if (V.__cce) return;
    if (p.filled) return;
    if (V.customer || (V.phone && V.phone.replace(/\D/g, '').length) || (V.name && V.name.trim())) {   // an order is already being typed: leave it alone
      p.blocked = true; setPending(p); return;
    }
    V.__cce = p.id; V.__cceRef = p.ref;
    if (p.customer) { V.customer = p.customer; V.phone = p.customer.phone || p.phone || ''; V.step = Math.max(V.step || 0, 1); V.reached = Math.max(V.reached || 0, 1); }
    else { V.phone = p.phone || ''; V.name = p.name || ''; }
    if (p.source) V.source = p.source;
    var occ = Array.isArray(win.__ccsOcc) ? win.__ccsOcc : [];
    if (p.occ) { var hit = occ.filter(function (l) { return String(l).replace('’', "'") === String(p.occ).replace('’', "'"); })[0]; if (hit) V.occasion = hit; }
    if (p.date) V.date = p.date;
    p.filled = true; setPending(p);
    setTimeout(function () { var b = bc(); if (b && typeof b.render === 'function') b.render(); }, 0);
  }
  function hook() {
    var F = win.CCOrderFlow; if (!F || F.__cce) return;
    var who0 = F.who, after0 = F.afterOrder;
    F.who = function (V) { try { fill(V); } catch (e) {} return typeof who0 === 'function' ? who0.apply(this, arguments) : ''; };
    F.afterOrder = function (V, res) {
      var r; try { r = typeof after0 === 'function' ? after0.apply(this, arguments) : undefined; } catch (e) { if (win.console) console.warn(e); }
      var id = V && V.__cce, oid = res && res.order_id;
      if (id && oid) {
        rpc('enquiry_link_order', { p_id: id, p_order: oid }).then(function (d) {
          if (d && d.ok) { toast('Enquiry ' + (d.enquiry && d.enquiry.reference) + ' is now an order'); setPending(null); load(true); }
          else toast('Order saved. Link it from the enquiry: ' + ((d && d.message) || ''), true);
        }, function () { toast('Order saved. Link it from the enquiry (Already ordered?).', true); });
      }
      return r;
    };
    F.__cce = true;
  }
  function convBanner() {
    var form = doc.querySelector('#cc-staff #ccs-slipform'), p = pending();
    var old = doc.querySelector('#cc-staff .cce-conv');
    var show = form && p && (p.filled || p.blocked) && !(lastV && lastV.result);
    if (!show) { if (old) old.remove(); if (p && lastV && lastV.result && lastV.__cce === p.id) setPending(null); return; }
    var html = p.blocked ? ic('help') + '<span><b>Finish or clear the order already started, then tap Convert to order again.</b></span><button type="button" data-cce="convcancel">OK</button>'
      : ic('link') + '<span><b>Converting ' + esc(p.ref) + '.</b> Customer, how they asked, occasion and date are filled in.' +
        ((p.cake || p.notes || p.quote != null) ? '<small>' + esc([p.cake && 'Cake: ' + p.cake, p.quote != null && p.quote !== '' && 'Quoted: ' + money(p.quote), p.notes && 'Notes: ' + p.notes].filter(Boolean).join('\n')) + '</small>' : '') +
        '</span><button type="button" data-cce="convcancel">Not now</button>';
    if (old && old.__h === html) return;
    if (!old || old.nextElementSibling !== form) { if (old) old.remove(); old = doc.createElement('div'); old.className = 'cce-conv'; old.setAttribute('role', 'status'); form.parentNode.insertBefore(old, form); }
    old.innerHTML = html; old.__h = html;
  }

  // ---------- events ----------
  doc.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null; if (!t) return;
    var o = t.closest('[data-cce-open]'); if (o) { ev.preventDefault(); openView(o.getAttribute('data-cce-open')); return; }
    var lo = t.closest('[data-cce-linkorder]'); if (lo && M && M.data) { ev.preventDefault(); act('enquiry_link_order', { p_id: M.data.enquiry.id, p_order: lo.getAttribute('data-cce-linkorder') }, 'Linked. This enquiry is now an order.'); return; }
    var sr = t.closest('[data-cce-src]'); if (sr && M) { ev.preventDefault(); keepForm(); var v = sr.getAttribute('data-cce-src'); M.form.source = M.form.source === v ? null : v; M.keepScroll = true; render(); return; }
    var rs = t.closest('[data-cce-reason]'); if (rs && M) { ev.preventDefault(); M.form.cn = fval('cce-f-cn'); var r = rs.getAttribute('data-cce-reason'); M.form.reason = M.form.reason === r ? null : r; M.keepScroll = true; render(); return; }
    var by = t.closest('[data-cce-by]'); if (by && M) { ev.preventDefault(); M.form.cn = fval('cce-f-cn'); var b = by.getAttribute('data-cce-by'); M.form.by = M.form.by === b ? null : b; M.keepScroll = true; render(); return; }
    var ct = t.closest('[data-cce-contact]'); if (ct && M) { ev.preventDefault(); M.form.nt = fval('cce-f-nt'); M.form.contact = ct.getAttribute('data-cce-contact') === '1'; render(); return; }
    var a = t.closest('[data-cce]'); if (!a) { if (M && t.id === 'cce-m') closeModal(); return; }
    var k = a.getAttribute('data-cce');
    if (k === 'stage' || k === 'view') return;
    ev.preventDefault();
    if (k === 'tab') { setOn(true); var m2 = ordersScreen(); if (m2) m2.scrollTop = 0; return; }
    if (k === 'new') return openNew();
    if (k === 'reload') return load();
    if (k === 'x') return closeModal();
    if (k === 'save') return save(false);
    if (k === 'force') return save(true);
    if (k === 'convcancel') { setPending(null); if (lastV && lastV.__cce) { delete lastV.__cce; } var cb = doc.querySelector('#cc-staff .cce-conv'); if (cb) cb.remove(); return; }
    if (!M || !M.data) return;
    var e = M.data.enquiry;
    if (k === 'back') { M.kind = 'view'; M.err = null; M.dup = null; return render(); }
    if (k === 'edit') { M.kind = 'edit'; M.err = null; M.form = { name: e.contact_name || '', phone: e.contact_phone || '', source: e.source === 'unknown' ? null : e.source, date: e.required_date || '', cake: e.cake_note || '', occ: e.occasion_code || '', notes: e.notes || '', campaign: e.campaign || '', other: e.contact_other || '', more: !!(e.notes || e.campaign || e.contact_other) }; return render(); }
    if (k === 'quote') { M.kind = 'quote'; M.err = null; M.form = { qv: e.quoted_value != null ? String(e.quoted_value) : '' }; M.autofocus = 'cce-f-qv'; return render(); }
    if (k === 'note') { M.kind = 'note'; M.err = null; M.form = { nt: '', contact: OPEN.indexOf(e.status) > -1 }; M.autofocus = 'cce-f-nt'; return render(); }
    if (k === 'close') { M.kind = 'close'; M.err = null; M.form = { reason: null, by: null, cn: '' }; return render(); }
    if (k === 'savequote') { var qv = fval('cce-f-qv').replace(/[$,\s]/g, ''); if (qv && !isFinite(Number(qv))) { M.err = 'Type the price as a number.'; return render(); } return act('enquiry_save', { p: { id: e.id, version: e.version, quoted_value: qv || null } }, qv ? 'Price saved.' : 'Price removed.'); }
    if (k === 'savenote') { var nt = fval('cce-f-nt'); if (!nt.trim() && M.form.contact === false) { M.err = 'Type a note first.'; return render(); } return act('enquiry_note', { p_id: e.id, p_note: nt, p_contact: OPEN.indexOf(e.status) > -1 && M.form.contact !== false }, 'Saved.'); }
    if (k === 'saveclose') { var f = M.form; f.cn = fval('cce-f-cn'); return act('enquiry_close', { p_id: e.id, p_reason: f.reason, p_reason_by: f.reason && f.reason !== 'unknown' ? f.by : null, p_note: f.cn }, 'Closed as not ordered.'); }
    if (k === 'reopen') return act('enquiry_reopen', { p_id: e.id }, 'Reopened.' + (e.required_date && dayDiff(e.required_date) < 0 ? ' The old pickup date had passed, so it was cleared.' : ''));
    if (k === 'convert') return convert();
    if (k === 'findorder' && M.data.order) {
      var ref = M.data.order.reference; closeModal(); S.on = false; try { sessionStorage.setItem('cce-on', '0'); } catch (er) {}
      var om = ordersScreen(); if (om) om.classList.remove('cce-on');
      setTimeout(function () { var s = doc.querySelector('#cc-staff #ccs-main .ccs-search'); if (s) { s.value = ref; s.dispatchEvent(new Event('input', { bubbles: true })); } schedule(); }, 60);
    }
  });
  // leaving enquiry mode when an order tab is tapped (capture: the app re-renders the tabs on the same click)
  doc.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null; if (!t || !S.on) return;
    var ft = t.closest('#cc-staff #ccs-main .ccs-tabs .ccs-tab:not(.cce-tab)'); if (!ft) return;
    S.on = false; try { sessionStorage.setItem('cce-on', '0'); } catch (e) {}
    var m = ordersScreen(); if (m) { m.classList.remove('cce-on'); var pn = m.querySelector(':scope > .cce-panel'); if (pn) pn.remove(); }
    if (ft.hasAttribute('data-cce-was')) { ft.removeAttribute('data-cce-was'); if (ft.getAttribute('data-act') === 'filter') ft.setAttribute('aria-pressed', 'true'); }
    schedule();
  }, true);
  doc.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.getAttribute) return;
    var k = t.getAttribute('data-cce');
    if (k === 'view') { S.view = t.value; S.rows = null; load(); return; }
    if (k === 'stage' && M && M.data) { act('enquiry_set_status', { p_id: M.data.enquiry.id, p_status: t.value }, 'Stage changed.'); }
  });
  var qT = null;
  doc.addEventListener('input', function (ev) {
    if (!ev.target || ev.target.id !== 'cce-q') return;
    S.q = ev.target.value; clearTimeout(qT); qT = setTimeout(function () { load(true); }, 300);
  });
  doc.addEventListener('keydown', function (ev) {
    if (!M) return;
    if (ev.key === 'Escape') { ev.preventDefault(); if (M.kind === 'view' || M.kind === 'new') closeModal(); else { M.kind = 'view'; M.err = null; render(); } }
    if (ev.key === 'Enter' && ev.target && ev.target.tagName === 'INPUT' && /^cce-f-/.test(ev.target.id)) { ev.preventDefault(); if (M.kind === 'new' || M.kind === 'edit') save(false); else if (M.kind === 'quote') { var b = doc.querySelector('[data-cce="savequote"]'); if (b) b.click(); } }
  });
  doc.addEventListener('toggle', function (ev) { if (M && ev.target && ev.target.classList && ev.target.classList.contains('cce-hist')) M.histOpen = ev.target.open; }, true);

  // ---------- start ----------
  function styles() { if (doc.getElementById('cce-style')) return; var s = doc.createElement('style'); s.id = 'cce-style'; s.textContent = CSS; doc.head.appendChild(s); }
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { styles(); hook(); decorate(); convBanner(); } catch (e) { if (win.console) console.warn('[Enquiries]', e); } }); }
  function start() {
    new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true });
    schedule();
    var first = setInterval(function () { if (bc() && !S.counts && !practice()) { clearInterval(first); load(true); } }, 800);
    setTimeout(function () { clearInterval(first); }, 30000);
    setInterval(function () { if (!doc.hidden && bc() && !practice() && ordersScreen()) load(true); }, 120000);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  win.CCEnquiries = { open: openNew, view: openView, reload: load };
})();
