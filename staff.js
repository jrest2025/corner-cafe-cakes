/* Kazumi staff app. Loaded from the database (kz_app_bundles, name 'staff') by a small loader in the Webflow page footer.
   Tabs: Today, Calendar, Bookings, New booking, Settings. All data goes through staff_* functions in Supabase. */
/* Crash reports to Sentry (13 Oct 2026). Only on kazumifiji.com, so tests and staging send nothing. No session recording,
   no performance tracking. Email addresses and phone numbers are removed from every report before it is sent. */
(function(){try{var h=location.hostname;if(!/(^|\.)kazumifiji\.com$/.test(h)||window.__kzSentry)return;window.__kzSentry='staff';
  var scrub=function(s){return typeof s==='string'?s.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[email]').replace(/\+?\d[\d\s-]{6,}\d/g,'[number]'):s};
  window.sentryOnLoad=function(){Sentry.init({environment:'production',release:'kazumi-staff-'+String(window.__kzStaffBundleVersion||'unknown').replace(/[^A-Za-z0-9._-]/g,'').slice(0,64),sendDefaultPii:false,tracesSampleRate:0,replaysSessionSampleRate:0,replaysOnErrorSampleRate:0,
    denyUrls:[/website-files\.com/,/googletagmanager\.com/,/google-analytics\.com/,/facebook\.net/,/extensions\//,/^chrome:\/\//],
    beforeBreadcrumb:function(b){if(b&&b.category==='ui.input')return null;if(b&&b.message)b.message=scrub(b.message);return b},
    beforeSend:function(e){try{e.user=undefined;if(e.request){delete e.request.cookies;if(e.request.url)e.request.url=e.request.url.replace(/([?&](t|token|ref)=)[^&]*/g,'$1[removed]')}
      if(e.message)e.message=scrub(e.message);(e.exception&&e.exception.values||[]).forEach(function(v){v.value=scrub(v.value)});
      (e.breadcrumbs||[]).forEach(function(b){if(b.message)b.message=scrub(b.message);if(b.data&&b.data.url)b.data.url=b.data.url.replace(/([?&](t|token|ref|apikey)=)[^&]*/g,'$1[removed]')})}catch(x){}return e}});
    Sentry.setTag('app','staff')};
  var s=document.createElement('script');s.src='https://js.sentry-cdn.com/2542347f22e124e8fb094fd46bb06c83.min.js';s.crossOrigin='anonymous';s.async=true;document.head.appendChild(s)}catch(e){}})();

(function(){
'use strict';
var SB_URL='https://facawqlrowvvkmhdpzvd.supabase.co',SB_KEY='sb_publishable_rTKH5ksJORwykpdjByVfvQ_IntoWj9T';
var ALLERGENS=['Shellfish','Fish','Peanuts','Tree nuts','Gluten','Egg','Dairy','Sesame','Soy'];
var OCCASIONS=['Birthday','Anniversary','Honeymoon','Celebration','Business dinner','Other'];
var EVENT_TYPES=['Birthday','Anniversary','Wedding or engagement','Corporate dinner','Farewell or reunion','Other'];
var PREF={yakitori_counter:'Yakitori counter',dining_room:'Dining room',no_preference:''};
var DIETS=['Vegetarian','Vegan','Pescatarian','Halal','No pork','No beef','No alcohol in cooking'];
var CELEB=['Birthday','Anniversary','Honeymoon','Celebration'];
var TABLE_NAMES={T1:'Ume',T2:'Fuji',T3:'Tsubaki',T4:'Sakura',T5:'Kiku',T6:'Yuri'};
var ERR={REASON_REQUIRED:'Choose or type a reason.',NOT_STAFF:'This account does not have staff access.',NOT_ADMIN:'Only an admin can change this.',ADMIN_MFA_REQUIRED:'Admins need two-step sign-in for this. Turn it on in Settings, under My account.',MFA_SETUP_FIRST:'Turn on two-step sign-in for your own account first, under My account.',MFA_REQUIRED:'Enter the code from your authenticator app to continue.',NOT_SELF:'You cannot do this to your own account.',BAD_STATE:'This booking has just changed, possibly on another device. Refresh to see the latest.',
  INVALID_TABLE:'Choose at least one valid table.',SESSION_FULL:'That sitting has no room for this party. Try another sitting or grill.',SLOT_FULL:'That time is full. Try another time.',DUPLICATE_BOOKING:'This guest already has a booking at that time.',
  INVALID_PARTY:'Check the number of guests (1 to 50).',MISSING_DETAILS:'Fill in the name and phone number.',INVALID_EMAIL:'That email address does not look right.',INVALID_DATE:'Choose today or a later date.',
  BEFORE_OPENING:'That date is before Kazumi opens for bookings. Choose a later date.',INVALID_SESSION:'That sitting is not open. Choose one of the sittings shown.',NOT_FOUND:'We could not find that booking. It may have been removed.',CLOSED:'That time is closed. You can reopen it in Settings, under Closures.',
  MISSING_REASON:'Add a short reason.',TOO_SOON:'That time has already passed. Choose a later time.',INVALID_TIME:'Choose a time from the list.',INVALID_SCOPE:'Choose what to close.',INVALID_SERVICE:'Choose what the booking is for.',
  WEAK_PASSWORD:'Use at least 10 characters.',RESET_EXPIRED:'This reset link has expired or was already used. Ask for a new one.',ALREADY_STAFF:'That email already has a staff account.',
  CANNOT_CHANGE_SELF:'You cannot remove your own admin access.',TOO_MANY:'That is more than 20 people. Use a group email address instead.',INVALID_KIND:'Refresh and try again.',INVALID_SEATS:'Seats must be between 1 and 20.',INVALID_VALUE:'One of the values is outside what is allowed. Check the numbers and times, then save again.',INVALID_ROLE:'Choose a role.',SPLIT_SUM:'The seats at each grill must add up to the party size.'};
var sb=null,me=null;
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
var state={view:lsGet('kz_view')||'arrivals',tests:lsGet('kz_tests')==='1',tab:'today',date:null,day:null,needs:null,timer:null,seat:null,cal:{view:'month',anchor:null},lf:null,stab:'home'};
var root=document.createElement('div');root.id='kzs';document.body.appendChild(root);
function setEve(on){root.classList.toggle('eve',!!on);document.documentElement.classList.toggle('kz-eve',!!on);lsSet('kz_eve',on?'1':'0');var b=$('ht');if(b){b.setAttribute('aria-pressed',on?'true':'false');b.title=on?'Switch to day mode':'Switch to evening mode'}}
if(lsGet('kz_eve')==='1'){root.classList.add('eve');document.documentElement.classList.add('kz-eve')}

/* ---------- helpers ---------- */
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
function $(id){return document.getElementById(id)}
function fijiToday(){var p=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};p.forEach(function(x){o[x.type]=x.value});return o.year+'-'+o.month+'-'+o.day}
function fijiNow(){return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Pacific/Fiji'})}
function addDays(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function dow(d){return new Date(d+'T12:00:00Z').getUTCDay()}
function fmt(d,o){return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',Object.assign({timeZone:'UTC'},o))}
function longDate(d){return fmt(d,{weekday:'long',day:'numeric',month:'long'})}
function shortDate(d){return fmt(d,{weekday:'short',day:'numeric',month:'short'})}
function tl(t){if(!t||!/^\d\d:\d\d$/.test(t))return t||'';var h=+t.slice(0,2);return ((h%12)||12)+':'+t.slice(3)+' '+(h<12?'AM':'PM')}
function ap(x){return x.replace(/\b(am|pm)\b/,function(m){return m.toUpperCase()})}
function clock(ts){return ts?ap(new Date(ts).toLocaleTimeString('en-GB',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Pacific/Fiji'})):''}
function stamp(ts){return ap(new Date(ts).toLocaleString('en-GB',{timeZone:'Pacific/Fiji',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}))}
function svcName(r){var s=r.service||'teppanyaki';return s==='teppanyaki'?'Teppanyaki':s==='event'?'Event':(String(r.session_time)<'16:00'?'Lunch':'Dinner')}
function tname(c){var t=state.day&&state.day.tables&&state.day.tables.find(function(x){return x.code===c});return (t&&t.name)||TABLE_NAMES[c]||c}
function tnames(a){return (a||[]).map(tname).join(' + ')}
function status(b){
  if(b.status==='pending'||b.status==='pending_large_group')return {k:'request',l:'Request'};
  if(b.status==='confirmed'&&b.arrived_at)return {k:'arrived',l:'Arrived '+clock(b.arrived_at)};
  return {k:b.status,l:{confirmed:'Confirmed',completed:'Completed',cancelled:'Cancelled',declined:'Declined',no_show:'No-show'}[b.status]||b.status};
}
var NIL=/^(none|no|nil|n\/?a|nothing|-+|\.)$/i;
function clean(v){return v&&!NIL.test(String(v).trim())?String(v).trim():''}
function isCel(p){return !!(p.celebrant||p.plate_message||p.own_cake||CELEB.indexOf(p.occasion||'')>=0)}
function celText(p){var t=(p.occasion||'Celebration')+(p.celebrant?' for '+p.celebrant:'');if(p.plate_message)t+=', plate message “'+p.plate_message+'”';if(p.own_cake)t+=', bringing own cake';return t}
function needsText(p){var o=[];if(p.high_chairs)o.push(p.high_chairs+(p.high_chairs===1?' high chair':' high chairs'));if(p.wheelchair)o.push('Wheelchair access');return o.join(', ')}
function hasDiet(p){return !!((p.allergens&&p.allergens.length)||(p.diet_prefs&&p.diet_prefs.length)||clean(p.dietary))}
function chipsHtml(id,list,sel){return '<div class="chips" id="'+id+'">'+list.map(function(a){return '<label class="chip"><input type="checkbox" value="'+esc(a)+'"'+((sel||[]).indexOf(a)>=0?' checked':'')+'>'+esc(a)+'</label>'}).join('')+'</div>'}
function checked(sel){return [].slice.call(document.querySelectorAll(sel+' input:checked')).map(function(x){return x.value})}
function pill(b){var s=status(b);return '<span class="pill st-'+s.k+'">'+esc(s.l)+'</span>'}
function errText(e){var m=(e&&(e.message||e.code))||'';var k=Object.keys(ERR).find(function(x){return m.indexOf(x)>=0});if(!k&&m&&window.console)console.warn('[kazumi] unmapped error:',m);return k?ERR[k]:'That did not go through. Check the connection and try again. If it keeps happening, tell the manager.'}
async function call(fn,args){var r=await sb.rpc(fn,args||{});if(r.error){var e=new Error(r.error.message);e.details=r.error.details;throw e}return r.data}
function main(){return $('mn')}
function toast(t,undo,act){root.querySelectorAll('.toast').forEach(function(o){o.remove()});var x=document.createElement('div');x.className='toast';x.setAttribute('role','status');x.innerHTML='<span>'+esc(t)+'</span>'+(act?'<button class="tundo tact">'+esc(act.label)+'</button>':'')+(undo?'<button class="tundo">Undo</button>':'');root.appendChild(x);
  if(act)x.querySelector('.tact').onclick=function(){x.remove();act.fn()};if(undo)x.querySelector('.tundo:not(.tact)').onclick=function(){x.remove();undo()};setTimeout(function(){x.remove()},undo||act?8000:3200)}
var UNDO={arrived:'undo_arrived',no_show:'reopen',completed:'reopen'};
async function undoAct(id,a,name){try{await call('staff_action2',{p_id:id,p_action:a,p_reason:null,p_notify:false});toast('Undone. '+name+' is back as before.');if(drawerOpen()&&state.openId===id)openBooking(id);else refreshCurrent()}catch(e){toast(errText(e))}}
function nowHM(){return window.__now||fijiNow()}
function mins(t){return (+t.slice(0,2))*60+(+t.slice(3,5))}
function dur(m){return m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+(m%60)+' min':'')}
function stopTimer(){if(state.timer){clearInterval(state.timer);state.timer=null}}
function drawerOpen(){return !!($('dr')&&$('dr').innerHTML)}
var I={
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>'
};

/* ---------- sign in, forgot password, reset ---------- */
function loginView(msg,isOk,prefill){
  stopTimer();
  root.innerHTML='<div class="login"><p class="brandline"><i class="klogo lg" role="img" aria-label="Kazumi Japanese Restaurant"></i></p><h1>Welcome back</h1>'+(msg?'<div class="msg '+(isOk?'ok':'err')+'" style="margin-top:14px">'+esc(msg)+'</div>':'')+
   '<form id="lf"><label class="f">Email<input type="email" id="le" autocomplete="username" required value="'+esc(prefill||'')+'"></label><label class="f">Password<input type="password" id="lp" autocomplete="current-password" required></label><button class="btn primary" type="submit">Sign in</button></form><p style="margin-top:16px;text-align:center"><button class="link" id="fp" type="button">Forgot password?</button></p></div>';
  $('lf').addEventListener('submit',async function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;b.textContent='Signing in…';
    var r=await sb.auth.signInWithPassword({email:$('le').value.trim(),password:$('lp').value});
    if(r.error){loginView('That email and password do not match. Check them and try again.',false,$('le')&&$('le').value);return}
    boot()});
  $('fp').onclick=function(){forgotView($('le').value.trim())};
}
function forgotView(prefill,done){
  root.innerHTML='<div class="login"><p class="brandline"><i class="klogo lg" role="img" aria-label="Kazumi Japanese Restaurant"></i></p><h1>Reset your password</h1>'+(done?'<div class="msg ok" style="margin-top:14px">If that email belongs to a staff account, a reset link is on its way. The link works for one hour.</div>':'<p class="muted" style="margin-top:8px">Enter your staff email and we will email you a link to choose a new password.</p>')+
   (done?'':'<form id="ff"><label class="f">Email<input type="email" id="fe" required value="'+esc(prefill||'')+'"></label><button class="btn primary" type="submit">Email me a reset link</button></form>')+
   '<p style="margin-top:16px;text-align:center"><button class="link" id="bk" type="button">Back to sign in</button></p></div>';
  $('bk').onclick=function(){loginView(null,false,prefill)};
  var f=$('ff');if(f)f.addEventListener('submit',async function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;b.textContent='Sending…';
    try{await call('request_staff_reset',{p_email:$('fe').value.trim()})}catch(x){}
    forgotView($('fe').value.trim(),true)});
}
function resetView(token,msg){
  root.innerHTML='<div class="login"><p class="brandline"><i class="klogo lg" role="img" aria-label="Kazumi Japanese Restaurant"></i></p><h1>Choose a new password</h1><p class="muted" style="margin-top:8px">Use at least 10 characters.</p>'+(msg?'<div class="msg err" style="margin-top:14px">'+esc(msg)+'</div>':'')+
   '<form id="rf"><label class="f">New password<input type="password" id="r1" autocomplete="new-password" minlength="10" required></label><label class="f">Repeat new password<input type="password" id="r2" autocomplete="new-password" minlength="10" required></label><button class="btn primary" type="submit">Save new password</button></form></div>';
  $('rf').addEventListener('submit',async function(e){e.preventDefault();var a=$('r1').value,b=$('r2').value;
    if(a.length<10)return resetView(token,'Use at least 10 characters.');if(a!==b)return resetView(token,'The two passwords do not match.');
    try{var r=await call('complete_staff_reset',{p_token:token,p_password:a});history.replaceState(null,'',location.pathname);loginView('Password saved. Sign in with your new password.',true,r.email)}
    catch(x){resetView(token,errText(x))}});
}
function passwordView(msg){
  root.innerHTML='<div class="login"><p class="brandline"><i class="klogo lg" role="img" aria-label="Kazumi Japanese Restaurant"></i></p><h1>Choose your password</h1><p class="muted" style="margin-top:8px">You signed in with a temporary password. Choose your own to continue. Use at least 10 characters.</p>'+(msg?'<div class="msg err" style="margin-top:14px">'+esc(msg)+'</div>':'')+
   '<form id="pf"><label class="f">New password<input type="password" id="p1" autocomplete="new-password" minlength="10" required></label><label class="f">Repeat new password<input type="password" id="p2" autocomplete="new-password" minlength="10" required></label><button class="btn primary" type="submit">Save password</button></form></div>';
  $('pf').addEventListener('submit',async function(e){e.preventDefault();var a=$('p1').value,b=$('p2').value;
    if(a.length<10)return passwordView('Use at least 10 characters.');if(a!==b)return passwordView('The two passwords do not match.');
    var r=await sb.auth.updateUser({password:a});if(r.error)return passwordView(r.error.message);
    try{await call('staff_password_changed')}catch(x){}
    me.must_change_password=false;shell()});
}
async function totpFactor(){var f=await sb.auth.mfa.listFactors();if(f.error)throw f.error;return ((f.data&&f.data.totp)||[]).filter(function(x){return x.status==='verified'})[0]}
function codeView(msg){
  stopTimer();
  root.innerHTML='<div class="login"><p class="brandline"><i class="klogo lg" role="img" aria-label="Kazumi Japanese Restaurant"></i></p><h1>One more step</h1><p class="muted" style="margin-top:6px">Open your authenticator app and enter the 6-digit code for Kazumi.</p>'+(msg?'<div class="msg err" style="margin-top:14px">'+esc(msg)+'</div>':'')+
   '<form id="cf"><label class="f">Code<input id="cc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required></label><button class="btn primary" type="submit">Continue</button></form><p style="margin-top:16px;text-align:center"><button class="link" id="cso" type="button">Sign in as someone else</button></p><p class="small muted" style="margin-top:10px;text-align:center">Lost your phone? Ask an admin to turn off two-step sign-in for your account.</p></div>';
  var i=$('cc');i.focus();
  $('cf').addEventListener('submit',async function(e){e.preventDefault();var b=this.querySelector('button');b.disabled=true;b.textContent='Checking…';
    try{var f=await totpFactor();if(!f)return boot();var r=await sb.auth.mfa.challengeAndVerify({factorId:f.id,code:i.value.replace(/\s/g,'')});if(r.error)throw r.error;boot()}
    catch(x){codeView('That code did not work. Use the newest code in the app, and check the time on your phone is set automatically.')}});
  $('cso').onclick=async function(){await sb.auth.signOut();lsSet('kz_last','');loginView()};
}
var IDLE_MS=2*3600*1000,lastTouch=0; /* v49: 2 hours idle on shared tablets (was 12) */
function touchActive(){var n=Date.now();if(n-lastTouch<60000)return;lastTouch=n;lsSet('kz_last',String(n))}
function idleExpired(){var t=+lsGet('kz_last')||0;return t>0&&Date.now()-t>IDLE_MS}
['pointerdown','keydown'].forEach(function(ev){document.addEventListener(ev,function(){if(me)touchActive()},{passive:true})});
setInterval(async function(){if(me&&idleExpired()){me=null;try{await sb.auth.signOut()}catch(e){}lsSet('kz_last','');loginView('You were signed out after 2 hours without activity. Please sign in again.',true)}},300000);
async function boot(){
  var q=new URLSearchParams(location.search);
  if(q.get('reset'))return resetView(q.get('reset'));
  var s=await sb.auth.getSession();if(!s.data.session)return loginView();
  if(idleExpired()){await sb.auth.signOut();lsSet('kz_last','');return loginView('You were signed out after 2 hours without activity. Please sign in again.',true)}
  touchActive();
  if(sb.auth.mfa){try{var al=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(al.data&&al.data.nextLevel==='aal2'&&al.data.currentLevel!=='aal2')return codeView()}catch(e){}}
  try{me=await call('staff_me')}catch(e){if(/(^|[^_])MFA_REQUIRED/.test(e.message||'')&&sb.auth.mfa)return codeView();await sb.auth.signOut();return loginView(errText(e))}
  state.date=state.date||me.today;
  if(me.must_change_password)return passwordView();
  var rs=kzRestore();
  shell();if(rs&&rs.open)setTimeout(function(){if(me&&!drawerOpen())openBooking(rs.open)},300);
}

/* ---------- shell ---------- */
var TABS=[['today','Today','today'],['calendar','Calendar','cal'],['bookings','Bookings','list'],['new','New booking','plus','New'],['settings','Settings','gear']];
function shell(){
  stopTimer();try{if(!history.state||!history.state.kz){history.replaceState(Object.assign(curSt(),{first:1}),'');history.pushState(curSt(),'')}}catch(e){}
  document.title='Kazumi Marketing & Business Intelligence Hub';root.innerHTML='<header class="top"><div class="brand"><i class="klogo" role="img" aria-label="Kazumi Japanese Restaurant"></i><b class="brand-t">Kazumi Marketing &amp; Business Intelligence Hub</b><b class="brand-p" aria-hidden="true"></b></div><nav class="tabs" aria-label="Sections">'+TABS.map(function(t){
      return '<button class="tab'+(state.tab===t[0]?' on':'')+'" data-tab="'+t[0]+'"'+(state.tab===t[0]?' aria-current="page"':'')+'>'+I[t[2]]+'<span class="lg">'+t[1]+'</span><span class="sh">'+(t[3]||t[1])+'</span>'+(t[0]==='bookings'?'<span class="count" id="reqn" hidden></span>':'')+'</button>'}).join('')+
    '</nav><div class="who"><button class="hbtn" id="hs" aria-label="Find a booking" title="Find a booking ( / )">'+I.search+'<span class="hl">Find</span></button><button class="hbtn" id="ht" aria-label="Evening mode" aria-pressed="'+(root.classList.contains('eve')?'true':'false')+'">'+I.moon+'</button><span class="nm">'+esc(me.name)+'</span><button class="hbtn" id="so" aria-label="Sign out">'+I.out+'<span class="hl">Sign out</span></button></div></header><main id="mn"></main><div id="dr"></div><div id="sr"></div>';
  root.querySelectorAll('.tab').forEach(function(t){t.addEventListener('click',function(){go(t.dataset.tab)})});
  $('so').addEventListener('click',async function(){await sb.auth.signOut();me=null;lsSet('kz_last','');loginView()});
  $('hs').onclick=openSearch;$('ht').onclick=function(){setEve(!root.classList.contains('eve'))};
  var r={today:renderToday,calendar:renderCalendar,bookings:renderBookings,'new':renderNew,settings:renderSettings,guests:renderGuests,host:renderHost,analytics:function(){renderAnalytics()}}[state.tab];(r||renderToday)();
  loadNeeds();
  window.scrollTo(0,0);
}
function go(tab,opts){var was=state.tab+'|'+state.view;state.tab=tab;if(opts)Object.assign(state,opts);if(state.tab+'|'+state.view!==was){saveY();hpush(curSt())}shell()}
var HS={ignore:0,queue:null,sr:0};
function curSt(){return {kz:1,tab:state.tab,view:state.view,kg:state.tab==='guests'?(KG.key||null):null,stab:state.tab==='settings'?(state.stab||null):null}}
function hpush(st){try{if(HS.ignore){HS.queue=st;return}history.pushState(st,'')}catch(e){}}
function hback(){HS.ignore++;history.back()}
function saveY(){try{if(history.state&&history.state.kz)history.replaceState(Object.assign({},history.state,{y:window.scrollY}),'')}catch(e){}}
function restoreY(){if(state.restoreY!=null){var y=state.restoreY;state.restoreY=null;window.scrollTo(0,y)}}
window.addEventListener('popstate',function(e){
  if(HS.ignore){HS.ignore--;if(!HS.ignore&&HS.queue){var q=HS.queue;HS.queue=null;try{history.pushState(q,'')}catch(x){}}return}
  if(!me||!$('mn'))return;var st=e.state||{};
  if(drawerOpen()){if(kzDrDirty()){try{history.pushState({kz:1,tab:state.tab,view:state.view,modal:'dr'},'')}catch(x){}kzDrAsk(closeDrawer);return}state.openId=null;$('dr').innerHTML='';refreshCurrent();kzSaveCtx();return}
  if(searchOpen()){var pushed=HS.sr;HS.sr=0;$('sr').innerHTML='';if(!pushed)hpush(curSt());return}
  if(state.seat||state.plan){state.seat=null;state.plan=null;paintDay();hpush(curSt());return}
  if(!st.kz)return;
  if(st.first){try{history.pushState(curSt(),'')}catch(x){}toast('This is the first screen. To leave the Marketing & Business Intelligence Hub, use Sign out.');return}
  if(st.tab!==state.tab){state.tab=st.tab;if(st.view)state.view=st.view;if(st.tab==='guests')KG.key=st.kg||null;if(st.tab==='settings'&&st.stab)state.stab=st.stab;state.restoreY=st.y;shell();return}
  if(st.tab==='guests'&&(st.kg||null)!==(KG.key||null)){KG.key=st.kg||null;renderGuests();window.scrollTo(0,st.y||0);return}
  if(st.tab==='settings'&&st.stab&&st.stab!==state.stab){state.stab=st.stab;renderSettings();return}
  if(st.view&&st.view!==state.view&&state.tab==='today'){setView(st.view,true);if(st.y!=null)window.scrollTo(0,st.y)}
});
async function loadNeeds(){
  try{state.needs=await call('staff_needs')}catch(e){return}
  var real=(state.needs.requests||[]).filter(function(r){return !r.is_test});
  var n=$('reqn');if(n){n.textContent=real.length;n.hidden=!real.length;n.title=real.length+' requests waiting'}
  paintNeeds();
}

/* ---------- Today ---------- */
var VHINT={arrivals:'Who is due, who is late and who is here. Tap Arrived as guests walk in.',floor:'Tables, seating and arrivals.',stations:'One brief per grill for each chef.',brief:'Read this out at the team briefing.',kitchen:'Covers, allergies, dietary needs and desserts.'};
function renderToday(){
  var t=fijiToday();
  main().innerHTML='<div class="daybar"><h1 id="dtitle">'+esc(state.date===t?'Today':longDate(state.date))+'</h1><span class="muted" id="dsub">'+esc(state.date===t?longDate(state.date):'')+'</span><p class="welcome noprint" id="welc" hidden></p><span class="sp"></span>'+
    '<div class="row noprint"><button class="icon-btn" id="dp" aria-label="Previous day">'+I.left+'</button><input type="date" id="dd" value="'+state.date+'" aria-label="Choose service date"><button class="icon-btn" id="dn" aria-label="Next day">'+I.right+'</button>'+
    (state.date!==t?'<button class="btn" id="dt">Today</button>':'')+'<button class="btn hide-m" id="dpr" aria-label="Print service day">Print</button></div></div>'+
    '<div class="viewbar noprint"><div class="seg" id="vw" role="tablist" aria-label="View">'+[['arrivals','Arrivals'],['floor','Seating plan'],['stations','Grill stations'],['brief','Service briefing'],['kitchen','Kitchen overview']].map(function(v){return '<button role="tab" data-v="'+v[0]+'" class="'+(state.view===v[0]?'on':'')+'" aria-selected="'+(state.view===v[0])+'">'+v[1]+'</button>'}).join('')+'</div></div>'+
    '<div id="needs"></div><div id="day"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div>';
  main().querySelectorAll('#vw button').forEach(function(b){b.onclick=function(){setView(b.dataset.v)}});
  $('dp').onclick=function(){state.date=addDays(state.date,-1);state.seat=null;renderToday()};
  $('dn').onclick=function(){state.date=addDays(state.date,1);state.seat=null;renderToday()};
  var dt=$('dt');if(dt)dt.onclick=function(){state.date=fijiToday();state.seat=null;renderToday()};
  $('dd').onchange=function(){if(this.value){state.date=this.value;state.seat=null;renderToday()}};
  $('dpr').onclick=function(){window.print()};
  loadDay();
  stopTimer();state.timer=setInterval(function(){if(!document.hidden&&!drawerOpen()&&!state.seat&&!state.aseat&&!state.plan&&state.tab==='today'){loadDay().then(function(){loadNeeds()})}},60000);
}
function setView(v,nopush){if(!VHINT[v])v='arrivals';if(!nopush&&v!==state.view){saveY();hpush({kz:1,tab:state.tab,view:v})}state.view=v;lsSet('kz_view',v);main().querySelectorAll('#vw button').forEach(function(x){var on=x.dataset.v===v;x.classList.toggle('on',on);x.setAttribute('aria-selected',on)});state.seat=null;state.plan=null;paintDay();paintNeeds()}
async function loadDay(){
  var el=$('day');if(!el)return;
  try{var dr=await Promise.all([call('staff_get_day',{p_date:state.date}),call('staff_get_alc',{p_date:state.date}).catch(function(){return null})]);state.day=dr[0];state.alc=dr[1]}catch(e){el.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  if(state.aseat&&!findParty(state.aseat))state.aseat=null;
  if(state.seat&&!findParty(state.seat.id))state.seat=null;
  if(state.plan&&state.plan.date!==state.date)state.plan=null;
  paintDay();
  if(state.pendingSeat){var ps=state.pendingSeat;state.pendingSeat=null;if(findParty(ps))startSeat(ps)}
}
/* change signals: a card glows once when its booking changed since the last screen update */
var SIG={date:null,map:null},NEEDP=null;
function signal(e,cls,ms){e.classList.remove(cls);void e.offsetWidth;e.classList.add(cls);setTimeout(function(){e.classList.remove(cls)},ms)}
function partySig(p){return [p.status,p.arrived_at||'',p.session_time||'',p.size,p.name,JSON.stringify(p.tables||[]),(p.allergens||[]).join(','),p.occasion||'',p.requests||'',p.staff_notes||''].join('|')}
function flashChanges(){
  if(!state.day||!$('day'))return;
  var m={};dayParties(state.day).forEach(function(p){m[p.id]=partySig(p)});
  var prev=SIG.date===state.date?SIG.map:null;SIG={date:state.date,map:m};if(!prev)return;
  var ch=Object.keys(m).filter(function(id){return prev[id]!==m[id]});if(!ch.length||ch.length>20)return;
  ch.forEach(function(id){$('day').querySelectorAll('[data-id="'+id+'"]').forEach(function(x){var c=x.closest('.arow,.tbk,.brow,.dline,.prow')||x;signal(c,'kz-flash',1800)})});
}
(function(){var o=paintDay;paintDay=function(){o.apply(this,arguments);try{flashChanges()}catch(e){}}})();
function sum(a){return a.reduce(function(n,p){return n+p.size},0)}
function paintDay(){
  var el=$('day');if(!el||!state.day)return;
  CM={};(state.day.sessions||[]).forEach(function(s){var m=colorMap(s);for(var k in m)CM[k]=m[k]});alcColors(state.day);
  var d=state.day,din=d.dining||[],lunch=din.filter(function(p){return p.session_time<'16:00'}),dinner=din.filter(function(p){return p.session_time>='16:00'});
  var tep=d.sessions.reduce(function(n,s){return n+s.seats_booked},0),ev=d.events||[];
  var h='';
  var cl=(d.closures||[]).map(function(c){return 'Teppanyaki '+(c.session_time?tl(c.session_time)+' sitting':'all night')+': '+c.reason}).concat((d.venue_closures||[]).map(function(c){return (c.scope==='all'?'Whole restaurant':'Dining room')+' '+(c.period||'all day')+': '+c.reason}));
  var clh=cl.length?'<div class="closed"><b>Closed.</b> <span class="cl-t">'+cl.map(esc).join('. ')+'.</span> <button class="link" id="goclos">Manage closures</button></div>':'';h+=clh;
  var total=sum(lunch)+sum(dinner)+tep+sum(ev);
  if(total&&state.view==='arrivals')h=clh+arrivalsHtml(d);
  else if(total&&state.view==='brief')h=clh+briefHtml(d);
  else if(total&&state.view==='kitchen')h=clh+kitchenHtml(d);
  else if(total&&state.view==='stations')h=clh+stationsHtml(d);
  else{
    /* v42: the floor (grills, floor plan, tables) always shows; an empty day gets a short note above it */
    if(!total&&!state.seat)h+='<div class="panel emptyday"><h2>Nothing booked for '+(state.date===fijiToday()?'today':'this day')+'</h2><p class="muted">Every Teppanyaki table is free at '+d.sessions.map(function(s){return esc(s.label)}).join(' and ')+', and the dining room has no bookings.</p><p id="nextday" class="small muted">Looking for the next booked day…</p></div>';
    h+=alcOn()?alcHtml('lunch',lunch):listService('Lunch',lunch,'No lunch bookings.');
    var sit=state.sit=defSit(d),today=state.date>=fijiToday();if(!state.fp)state.fp=lsGet('kz_fp')||'cards';
    if(d.sessions.length)h+='<div class="sitbar noprint"><div class="seg fpseg" role="group" aria-label="Show Teppanyaki as"><button data-fp="cards"'+(state.fp!=='plan'?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>Grills</button><button data-fp="plan"'+(state.fp==='plan'?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>Floor plan</button></div><span class="sp"></span>'+(today?'<button class="btn" id="walkin">New booking</button>':'')+'<div class="jumprow"><span class="small muted">Go to</span><div class="jump">'+d.sessions.map(function(s){return '<button class="btn sm" data-jump="'+s.session_time+'">Teppanyaki '+esc(s.label)+'</button>'}).join('')+'</div></div></div>';
    d.sessions.forEach(function(s){h+=sittingHtml(s)});
    h+=alcOn()?alcHtml('dinner',dinner):listService('Dinner in the dining room',dinner,'No dinner bookings in the dining room.');
    if(ev.length)h+=listService('Events',ev,'');
  }
  if(d.inactive&&d.inactive.length)h+='<details class="panel noprint"><summary class="small" style="cursor:pointer">'+d.inactive.length+' not coming<span class="kz110-sr"> (cancelled, declined or no-show)</span></summary><div class="stack" style="margin-top:10px">'+d.inactive.map(function(p){return '<button class="link" style="text-align:left" data-id="'+p.id+'">'+esc(svcName(p)+' '+tl(p.session_time)+', '+p.name+' ('+p.size+'), '+status(p).l)+'</button>'}).join('')+'</div></details>';
  el.innerHTML=h;paintWelcome();
  el.querySelectorAll('[data-id]').forEach(function(b){b.addEventListener('click',function(){openBooking(b.dataset.id)})});
  el.querySelectorAll('[data-qa]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();quick(b.dataset.pid,b.dataset.qa,b)})});
  el.querySelectorAll('[data-seat]').forEach(function(b){b.addEventListener('click',function(){startSeat(b.dataset.seat)})});
  el.querySelectorAll('[data-jump]').forEach(function(b){b.addEventListener('click',function(){state.sit=b.dataset.jump;var x=$('sit-'+b.dataset.jump.replace(':',''));if(x)x.scrollIntoView({behavior:'smooth',block:'start'})})});
  var wk=$('walkin');if(wk)wk.onclick=walkIn;
  el.querySelectorAll('[data-fp]').forEach(function(b){b.addEventListener('click',function(){state.fp=b.dataset.fp;lsSet('kz_fp',state.fp);paintDay()})});
  el.querySelectorAll('[data-seatv]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var id=b.dataset.seatv;if(state.view!=='floor')setView('floor');startSeat(id)})});
  el.querySelectorAll('[data-pick]').forEach(function(b){b.addEventListener('click',function(){pickTable(b.dataset.pick)})});
  el.querySelectorAll('.fp-g[data-tap]').forEach(function(g){function go(e){if(e.target.closest&&e.target.closest('.chg[data-id]'))return;var c=g.dataset.tap;if(state.seat)pickTable(c);else if(!state.plan)fpTap(c,g.dataset.sess)}g.addEventListener('click',go);g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}})});
  var sx=$('seatx');if(sx)sx.onclick=function(){state.seat=null;paintDay()};
  bindSeat(el);bindAlc(el);
  var gc=$('goclos');if(gc)gc.onclick=function(){go('settings',{stab:'closures'})};
  el.querySelectorAll('[data-stn]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();state.stnFocus=b.dataset.stn;setView('stations')})});
  if($('nextday'))loadNextDay(state.date);restoreY();
  if(state.view==='stations'&&state.stnFocus){var sf=$('stn-'+state.stnFocus);state.stnFocus=null;if(sf)sf.scrollIntoView({block:'start'})}
  paintNeeds();
}
async function loadNextDay(from){
  try{var nx=await call('staff_next_booked_day',{p_after:from,p_tests:true})}catch(e){nx=null}
  var el=$('nextday');if(!el||state.date!==from)return;
  if(!nx){el.textContent='There are no later bookings yet.';return}
  el.innerHTML='Next booking: <b>'+esc(longDate(nx))+'</b> <button class="btn sm" id="gonx">Open that day</button>';
  $('gonx').onclick=function(){state.date=nx;state.seat=null;renderToday()};
}
/* everyone booked on the day, in service order, with where they sit */
function placeTxt(p){var w=(p.when||'').replace(/ \d{1,2}:\d{2} ?[AP]M$/i,''),x=p.split&&Object.keys(p.split).length>1?splitText(p.split):(p.where==='Dining room'&&PREF[p.seating_pref])||p.where;return !x||x===w?w:w+', '+x}
function dayParties(d){
  var out=[],seen={};
  (d.dining||[]).forEach(function(p){out.push(Object.assign({},p,{when:(p.session_time<'16:00'?'Lunch ':'Dinner ')+tl(p.session_time),where:'Dining room',ord:(p.session_time<'16:00'?'1':'3')+p.session_time}))});
  (d.sessions||[]).forEach(function(s){
    s.tables.forEach(function(t){t.parties.forEach(function(p){if(seen[p.id])return;seen[p.id]=1;out.push(Object.assign({},p,{session_time:s.session_time,when:'Teppanyaki '+s.label,where:tnames(p.tables)||t.name,ord:'2'+s.session_time}))})});
    (s.unassigned||[]).forEach(function(p){if(seen[p.id])return;seen[p.id]=1;out.push(Object.assign({},p,{session_time:s.session_time,when:'Teppanyaki '+s.label,where:'Needs a grill',ord:'2'+s.session_time,unseated:true}))})});
  (d.events||[]).forEach(function(p){out.push(Object.assign({},p,{when:'Event '+tl(p.session_time),where:'Event',ord:'4'+p.session_time}))});
  return out.sort(function(a,b){return a.ord<b.ord?-1:a.ord>b.ord?1:a.name.localeCompare(b.name)});
}
function arrivalsHtml(d){
  var today=state.date===fijiToday(),now=today?nowHM():null,ps=dayParties(d).filter(function(p){return p.status==='confirmed'||p.status==='pending'||p.status==='pending_large_group'});
  var here=ps.filter(function(p){return p.arrived_at}),wait=ps.filter(function(p){return !p.arrived_at});
  wait.forEach(function(p){p.diff=now?mins(p.session_time)-mins(now):null});
  wait.sort(function(a,b){return a.session_time<b.session_time?-1:a.session_time>b.session_time?1:a.name.localeCompare(b.name)});
  here.sort(function(a,b){return (b.arrived_at||'').localeCompare(a.arrived_at||'')});
  var stale=today?wait.filter(function(p){return p.diff<=-120}):[],late=today?wait.filter(function(p){return p.diff<=-10&&p.diff>-120}):[],soon=today?wait.filter(function(p){return p.diff>-10&&p.diff<=60}):[],later=today?wait.filter(function(p){return p.diff>60}):wait;
  var nxt=wait.filter(function(p){return !today||p.diff>-10})[0];
  var h=glanceHtml([[sum(wait),today?'guests still to come':'guests expected','c'],[sum(here),'guests here',''],[late.length,late.length===1?'party late':'parties late',late.length?'a':''],[nxt?tl(nxt.session_time):'None','next arrival','']]);
  function sec(title,sub,rows,cls){return rows.length?'<section class="arr-sec"><div class="arr-h'+(cls?' '+cls:'')+'"><h2>'+esc(title)+'</h2><span class="small muted">'+esc(sub)+'</span></div>'+rows.map(arow).join('')+'</section>':''}
  function arow(p){
    var lt=today&&!p.arrived_at&&p.diff<=-10&&p.diff>-120,rel='';
    if(p.arrived_at)rel='Arrived '+clock(p.arrived_at);else if(today)rel=p.diff<0?dur(-p.diff)+' late':p.diff===0?'Due now':'In '+dur(p.diff);else if(state.date<fijiToday())rel='Arrival not recorded';
    var b='';
    if(!p.arrived_at){
      if(p.unseated)b+='<button class="btn" data-seatv="'+p.id+'">Seat</button>';
      if(today&&p.status==='confirmed'&&p.diff<-KZHOLD)b+=kzRelBtn(p.id,'btn');
      if(p.status==='confirmed')b+='<button class="btn go" data-qa="arrived" data-pid="'+p.id+'">Arrived</button>';else b+='<button class="btn primary" data-id="'+p.id+'">Reply</button>';
    }
    return '<div class="arow'+(lt?' late':'')+(p.arrived_at?' here':'')+'"><button class="amain" data-id="'+p.id+'"><span class="atime"><b>'+esc(tl(p.session_time))+'</b><small>'+esc(rel)+'</small></span><span class="awho"><span class="aname'+pTag(p)+'>'+esc(p.name)+'<span class="asize" aria-label="'+p.size+' guests">'+p.size+'</span></span><span class="awhere'+(p.unseated?' uns':'')+'">'+esc(placeTxt(p))+'</span><span class="bk-tags">'+tagsFor(Object.assign({},p,{arrived_at:null,seating_pref:p.where==='Dining room'?null:p.seating_pref}),false)+'</span></span></button>'+(b?'<div class="aacts noprint">'+b+'</div>':'')+'</div>';
  }
  if(today){
    h+=sec('Late','',late,'late');
    h+=sec('Next hour',sum(soon)+' guests due',soon,'soon');
    h+=sec('Later today',sum(later)+' guests',later,'later');
    h+=sec('Earlier, not marked',stale.length+(stale.length===1?' party':' parties'),stale,'stale');
    if(!wait.length)h+='<div class="panel emptyday"><h2>Everyone booked is here</h2><p class="muted">No more arrivals expected today. For guests without a booking, use Walk-in on the Floor view.</p></div>';
  }else h+=sec(state.date<fijiToday()?'Arrival not recorded':'Expected',sum(wait)+' guests',later,'');
  h+=sec('Here',sum(here)+' guests',here,'herelist');
  return h;
}
function glanceHtml(cells){return '<div class="glance">'+cells.map(function(c){return '<div class="gcell'+(c[2]?' '+c[2]:'')+'"><b>'+c[0]+'</b><span>'+esc(c[1])+'</span></div>'}).join('')+'</div>'}
function brow(p,detail,cls){return '<button class="brow'+(cls?' '+cls:'')+'" data-id="'+p.id+'"><span class="bwhen">'+esc(p.when)+(p.where&&p.where!=='Event'?'<small>'+esc(p.where)+'</small>':'')+'</span><span class="bwho"><b class="bn'+pTag(p)+'>'+esc(p.name)+'</b> <span class="muted">('+p.size+')</span></span><span class="bwhat">'+detail+'</span></button>'}
function bsection(title,sub,rows,cls){return '<section class="bsec'+(cls?' '+cls:'')+'"><div class="bsec-h"><h2>'+esc(title)+(rows.length?' <span class="hn">'+rows.length+'</span>':'')+'</h2>'+(sub==='Confirm at the table'?'<span class="small muted">'+esc(sub)+'</span>':'')+'</div>'+(rows.length?rows.join(''):'<p class="empty">None today.</p>')+'</section>'}
function briefHtml(d){
  var all=dayParties(d),g=sum(all),cel=all.filter(isCel),diet=all.filter(hasDiet),
    care=all.filter(function(p){return p.vip||p.visits||p.guest_note||p.high_chairs||p.wheelchair}),
    notes=all.filter(function(p){return clean(p.requests)||p.staff_notes}),
    open=all.filter(function(p){return p.unseated||p.status==='pending'||p.status==='pending_large_group'}),arr=all.filter(function(p){return p.arrived_at}).length;
  var h=glanceHtml([[g,'guests'],[all.length,'bookings'],[arr+' of '+all.length,'arrived']]);
  h+='<div class="bgrid">';
  h+=bsection('Celebrations','Who, what and when',cel.map(function(p){return brow(p,esc(celText(p)),'cel')}),'cel');
  h+=bsection('Allergies and dietary needs','Confirm at the table',diet.map(function(p){var x=[];if(p.allergens&&p.allergens.length)x.push('<b class="red">'+esc(p.allergens.join(', '))+'</b>');if(p.diet_prefs&&p.diet_prefs.length)x.push(esc(p.diet_prefs.join(', ')));if(clean(p.dietary))x.push(esc(clean(p.dietary)));return brow(p,x.join(' · '),'ralg')}),'salg');
  h+=bsection('Look after','VIPs, regulars and seating needs',care.map(function(p){var x=[];if(p.vip)x.push('<b>VIP</b>');if(p.visits)x.push('Returning, '+p.visits+(p.visits===1?' visit':' visits'));if(p.guest_note)x.push(esc(p.guest_note));if(needsText(p))x.push(esc(needsText(p)));return brow(p,x.join(' · '))}));
  h+=bsection('Requests and notes','From the guest and the team',notes.map(function(p){var x=[];if(clean(p.requests))x.push(esc(clean(p.requests)));if(p.staff_notes)x.push('<span class="muted">Team: '+esc(p.staff_notes)+'</span>');return brow(p,x.join('<br>'))}));
  h+='</div>';
  if(open.length)h+=bsection('Still to sort before service','Tables to assign and requests to answer',open.map(function(p){return brow(p,p.unseated?'Seat on the Floor view':'Reply to the request','todo')}),'todo');
  return h;
}
function kitchenHtml(d){
  var all=dayParties(d),g=sum(all),kids=all.reduce(function(n,p){return n+(p.children||0)},0);
  var groups={};all.forEach(function(p){var k=p.when.replace(/ \d.*$/,'').replace('Teppanyaki','Teppanyaki')+(p.ord.charAt(0)==='2'?' '+tl(p.session_time):'');(groups[k]=groups[k]||{ord:p.ord,ps:[]}).ps.push(p)});
  var keys=Object.keys(groups).sort(function(a,b){return groups[a].ord<groups[b].ord?-1:1});
  var cnt={},order=[];all.forEach(function(p){(p.allergens||[]).forEach(function(a){var k='A|'+a;if(!cnt[k]){cnt[k]=[];order.push(k)}cnt[k].push(p)});(p.diet_prefs||[]).forEach(function(a){var k='D|'+a;if(!cnt[k]){cnt[k]=[];order.push(k)}cnt[k].push(p)})});
  order.sort(function(a,b){return a.charAt(0)!==b.charAt(0)?(a.charAt(0)==='A'?-1:1):cnt[b].length-cnt[a].length});
  var desserts=all.filter(function(p){return p.plate_message||p.own_cake});
  var h='';
  h+='<div class="kgrid"><section class="bsec"><div class="bsec-h"><h2>Covers</h2></div><table class="t"><thead><tr><th>Service</th><th style="text-align:right">Covers</th><th style="text-align:right">Adults</th><th style="text-align:right">Children</th></tr></thead><tbody>'+keys.map(function(k){var ps=groups[k].ps;return '<tr><td>'+esc(k)+'</td><td style="text-align:right"><b>'+sum(ps)+'</b></td><td style="text-align:right">'+ps.reduce(function(n,p){return n+p.adults},0)+'</td><td style="text-align:right">'+ps.reduce(function(n,p){return n+(p.children||0)},0)+'</td></tr>'}).join('')+'<tr><td><b>Total</b></td><td style="text-align:right"><b>'+g+'</b></td><td style="text-align:right">'+all.reduce(function(n,p){return n+p.adults},0)+'</td><td style="text-align:right">'+kids+'</td></tr></tbody></table></section>';
  h+='<section class="bsec salg"><div class="bsec-h"><h2>Allergies and dietary needs</h2></div>'+(order.length?'<table class="t kmx"><tbody>'+order.map(function(k){var ps=cnt[k],a=k.charAt(0)==='A';return '<tr class="'+(a?'is-a':'')+'"><td class="kk">'+esc(k.slice(2))+'</td><td class="kn">'+ps.length+(ps.length===1?' party':' parties')+'</td><td>'+ps.map(function(p){return '<button class="link" data-id="'+p.id+'">'+esc(p.when+', '+p.where+': '+p.name+' ('+p.size+')')+'</button>'}).join('<br>')+'</td></tr>'}).join('')+'</tbody></table>':'<p class="empty">No allergies or dietary needs today.</p>')+'</section></div>';
  var det=all.filter(hasDiet);
  if(det.length)h+=bsection('By party, in service order','Full notes for each party',det.map(function(p){var x=[];if(p.allergens&&p.allergens.length)x.push('<b class="red">Allergy: '+esc(p.allergens.join(', '))+'</b>');if(p.diet_prefs&&p.diet_prefs.length)x.push('<b>'+esc(p.diet_prefs.join(', '))+'</b>');if(clean(p.dietary))x.push(esc(clean(p.dietary)));if(p.past_allergens&&p.past_allergens.length)x.push('<span class="amber">Noted on a past visit: '+esc(p.past_allergens.join(', '))+'</span>');return brow(p,x.join('<br>'),p.allergens&&p.allergens.length?'ralg':'')}),'salg');
  h+=bsection('Celebration desserts','Plates to write and cakes to store',desserts.map(function(p){return brow(p,(p.plate_message?'Plate message “'+esc(p.plate_message)+'”':'')+(p.plate_message&&p.own_cake?' · ':'')+(p.own_cake?'Own cake to store and serve':''),'cel')}),'cel');
  return h;
}
function unseatedAll(){var o=[];((state.day&&state.day.sessions)||[]).forEach(function(s){(s.unassigned||[]).forEach(function(p){o.push(p)})});return o}
function firstName(){return ((me&&me.name)||'').trim().split(' ')[0]}
/* v95: one greeting everywhere, by the time of day in Fiji, with the signed-in person's first name when there is one */
function kzGreet(){var h=+(nowHM()||'12').slice(0,2),f=firstName();if(/^(practice|walk-in)$/i.test(f))f='';return (h<12?'Good morning':h<17?'Good afternoon':'Good evening')+(f?', '+f:'')}
function paintWelcome(){var w=$('welc');if(!w||!state.day)return;if(state.date!==fijiToday()){w.hidden=true;return}
  var ps=dayParties(state.day).filter(function(p){return p.status==='confirmed'||p.status==='pending'||p.status==='pending_large_group'}),g=sum(ps),here=sum(ps.filter(function(p){return p.arrived_at})),hr=+nowHM().slice(0,2);
  var uns=unseatedAll().length,req=((state.needs&&state.needs.requests)||[]).filter(function(r){return !r.is_test}).length,todo=[];
  if(uns)todo.push(uns+(uns===1?' party needs':' parties need')+' a grill');var aun=alcUnseated().length;if(aun)todo.push(aun+(aun===1?' party due soon has':' parties due soon have')+' no table yet');if(req)todo.push(req+(req===1?' request is':' requests are')+' waiting for a reply');
  var line=g?g+' guests expected '+(hr>=16?'tonight':'today')+(here?', '+here+' here so far':'')+'. ':'A quiet day so far, with nothing booked yet. ';
  line+=todo.length?(state.view==='arrivals'?'There are a few things to review before service.':todo.join(', and ')+'.'):'You\u2019re all caught up. Nothing needs your attention right now.';
  w.innerHTML='<b>'+esc(kzGreet())+'.</b> '+esc(line);w.hidden=false}
function paintNeeds(){
  paintWelcome();var el=$('needs');if(!el)return;if(state.view!=='arrivals'){el.innerHTML='';return}
  var n=state.needs||{requests:[],unmarked:[]},req=(n.requests||[]).filter(function(r){return !r.is_test}),late=req.filter(function(r){return r.hours_waiting>=24}),un=state.day?unseatedAll():[],um=n.unmarked||[],items=[];
  if(un.length)items.push('<div class="need" data-k="grill"><span class="num">'+un.length+'</span><span>Teppanyaki '+(un.length===1?'party needs':'parties need')+' a grill</span><button class="btn primary sm" id="gotab">Seat them</button></div>');
  var au=alcUnseated();if(au.length)items.push('<div class="need" data-k="table"><span class="num">'+au.length+'</span><span>Lunch or dinner '+(au.length===1?'party is':'parties are')+' due within the hour without a table</span><button class="btn primary sm" id="gotable">Seat them</button></div>');
  if(req.length)items.push('<div class="need" data-k="req"><span class="num">'+req.length+'</span><span>'+(req.length===1?'request needs':'requests need')+' a reply'+(late.length?' <span class="tag allergy">'+late.length+' waiting over 24 hours</span>':'')+'</span><button class="btn sm" id="goreq">Open requests</button></div>');
  var sys=n.system||{};if(sys.ok===false){var bad=(sys.checks||[]).filter(function(c){return !c.ok});items.unshift('<div class="need" data-k="sys"><span class="num">'+bad.length+'</span><span>System check found a problem: '+esc(bad.map(function(c){return c.check+', '+c.detail.toLowerCase()}).join('; '))+'. Tell the system owner.</span></div>')}
  if(um.length)items.push('<div class="need" data-k="um"><span class="num">'+um.length+'</span><span>past '+(um.length===1?'booking has':'bookings have')+' no arrival recorded</span><button class="btn sm" id="goum">Review</button></div>');
  el.innerHTML=items.length?'<div class="needs"><h3>Needs action</h3>'+items.join('')+'</div>':'';
  var nowN={grill:un.length,table:au.length,req:req.length,um:um.length,sys:sys.ok===false?1:0};
  if(NEEDP&&NEEDP.date===state.date)Object.keys(nowN).forEach(function(k){if(nowN[k]>(NEEDP[k]||0)){var it=el.querySelector('.need[data-k="'+k+'"]');if(it)signal(it,'kz-pulse',1600)}});
  NEEDP=Object.assign({date:state.date},nowN);
  var a=$('gotab');if(a)a.onclick=function(){if(state.view!=='floor')setView('floor');var s=((state.day&&state.day.sessions)||[]).find(function(x){return (x.unassigned||[]).length});if(s)arrange(s.session_time,false)};
  var gt=$('gotable');if(gt)gt.onclick=function(){if(state.view!=='floor')setView('floor');startSeat(au[0].id)};
  var b=$('goreq');if(b)b.onclick=function(){state.lf=Object.assign(defaultFilter(),{mode:'requests'});go('bookings')};
  var c=$('goum');if(c)c.onclick=function(){state.lf=Object.assign(defaultFilter(),{mode:'unmarked'});go('bookings')};
}
function svcKind(t){return /^Lunch/.test(t)?'k-lunch':/^Event/.test(t)?'k-event':'k-dinner'}
function listService(title,rows,empty){
  if(!rows.length)return empty?'<section class="svc '+svcKind(title)+'"><div class="svc-head"><h2>'+esc(title)+'</h2></div><p class="empty">'+esc(empty)+'</p></section>':'';
  var arr=rows.filter(function(p){return p.arrived_at}).length,by={};rows.forEach(function(p){(by[p.session_time]=by[p.session_time]||[]).push(p)});
  var alg=rows.filter(function(p){return p.allergens&&p.allergens.length}).map(function(p){return tl(p.session_time)+' '+p.name+' ('+p.size+'): '+p.allergens.join(', ')+(clean(p.dietary)?', '+clean(p.dietary):'')});
  return '<section class="svc '+svcKind(title)+'"><div class="svc-head"><h2>'+esc(title)+'</h2><span class="stat"><b>'+sum(rows)+'</b> guests</span><span class="stat"><b>'+rows.length+'</b> '+(rows.length===1?'booking':'bookings')+'</span><span class="stat"><b>'+arr+'</b> arrived</span></div>'+
    Object.keys(by).sort().map(function(t){var g=by[t];return '<div class="slot"><div class="slot-time"><b>'+esc(tl(t))+'</b>'+(g.length>1?'<span>'+sum(g)+' guests</span>':'')+'</div><div class="cards">'+g.map(function(p){return card(p,true)}).join('')+'</div></div>'}).join('')+'</section>';
}
function tagsFor(p,inTable){
  var m=[],x=[];if(p.status==='pending'||p.status==='pending_large_group')m.push('<span class="pill st-request">Request</span>');
  if(p.arrived_at)m.push('<span class="pill st-arrived">Arrived '+esc(clock(p.arrived_at))+'</span>');
  if(inTable&&p.tables&&p.tables.length>1)m.push('<span class="tag">'+esc(p.split?splitText(p.split):'Across '+tnames(p.tables))+'</span>');
  if(p.vip)m.push('<span class="tag vip">VIP</span>');
  if(p.allergens&&p.allergens.length)m.push('<span class="tag allergy">'+esc(p.allergens.join(', '))+'</span>');
  if(p.diet_prefs&&p.diet_prefs.length)m.push('<span class="tag diet">'+esc(p.diet_prefs.join(', '))+'</span>');
  if(p.occasion)m.push('<span class="tag occ">'+esc(p.occasion+(p.celebrant?': '+p.celebrant:''))+'</span>');
  if(p.high_chairs)m.push('<span class="tag seatn">'+p.high_chairs+(p.high_chairs===1?' high chair':' high chairs')+'</span>');
  if(p.wheelchair)m.push('<span class="tag seatn">Wheelchair</span>');
  if(p.is_test)m.push('<span class="tag test">Test</span>');
  /* secondary: shown in full on a desktop, counted on a tablet or phone and shown when the booking is opened */
  if(PREF[p.seating_pref])x.push('<span class="tag">'+esc(PREF[p.seating_pref])+'</span>');
  if(p.own_cake||p.plate_message)x.push('<span class="tag occ">'+(p.own_cake&&p.plate_message?'Cake and plate':p.own_cake?'Own cake':'Plate message')+'</span>');
  if(p.visits)x.push('<span class="tag ret">Returning</span>');
  if(p.children)x.push('<span class="tag">'+p.children+(p.children===1?' child':' children')+'</span>');
  if(p.staff_notes||clean(p.requests)||p.guest_note)x.push('<span class="tag">Note</span>');
  return m.join('')+(x.length?'<span class="t2">'+x.join('')+'</span><span class="tmore" aria-hidden="true">+'+x.length+' more</span>':'');
}
function quickHtml(p,withMove){
  var q='';
  if(p.status==='confirmed'&&!p.arrived_at){q+='<button class="btn go sm" data-qa="arrived" data-pid="'+p.id+'">Arrived</button>';
    if(state.day&&state.day.date===fijiToday()&&p.session_time&&p.session_time<addMins(fijiNow(),-KZHOLD))q+=kzRelBtn(p.id,'btn sm');}
  if(withMove)q+='<button class="btn sm" data-qa="move" data-pid="'+p.id+'">Move</button>';
  return q;
}
function card(p,withActs,withMove,session){
  var alg=p.allergens&&p.allergens.length,q=withActs?quickHtml(session?Object.assign({session_time:session},p):p,withMove):'';
  return '<div class="bk'+(alg?' has-alg':'')+(p.arrived_at?' is-arr':'')+'"><button class="bk-main" data-id="'+p.id+'"><div class="bk-name">'+esc(p.name)+'<span class="size">'+p.size+'</span></div>'+
    '<div class="bk-tags">'+tagsFor(p,!!session)+'</div></button>'+(q?'<div class="bk-acts noprint">'+q+'</div>':'')+'</div>';
}
function addMins(hhmm,m){var x=(+hhmm.slice(0,2))*60+(+hhmm.slice(3))+m;x=Math.max(0,x);return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')}
/* ---------- Teppanyaki seating: seat map, suggestions and plans ---------- */
/* party colours: bright, ordered so neighbours contrast; red is kept for allergies */
var PCOL=['#1971c2','#f76707','#2f9e44','#d6336c','#f59f00','#7048e8','#15aabf','#a0522d','#74b816','#ae3ec9','#364fc7','#0b7285'];
var MINPART=2,CM={};
function pTag(p){var c=p&&CM[p.id];return c?' pname"'+chipStyle(c):'"'}
function tint(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'}
function pcMix(h,t,a){var n=parseInt(h.slice(1),16),r=n>>16&255,g=n>>8&255,b=n&255;function m(c){return Math.round(c+(t-c)*a)}return '#'+[m(r),m(g),m(b)].map(function(v){return v.toString(16).padStart(2,'0')}).join('')}
function pcLum(h){var n=parseInt(h.slice(1),16);function f(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)}
function pcBg(h){return pcMix(h,255,.8)}
function pcText(h){var bg=pcLum(pcBg(h)),a=.35,t=pcMix(h,0,a);while(a<.8&&(bg+.05)/(pcLum(t)+.05)<5.5){a+=.05;t=pcMix(h,0,a)}return t}
function chipStyle(c){return ' style="--pc:'+c+';--pt:'+pcText(c)+';--pb:'+pcBg(c)+';--pct:'+tint(c,.13)+';--pcs:'+tint(c,.45)+'"'}
var GRIP='<span class="grip" aria-hidden="true"></span>';
var PIN='<svg class="pin" viewBox="0 0 24 24" aria-label="Pinned" role="img"><path fill="currentColor" d="M15 3l6 6-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z"/></svg>';
function zoneOf(code){var t=((state.day&&state.day.tables)||[]).find(function(x){return x.code===code});return (t&&t.zone)||'main'}
function defSit(d){var ss=(d&&d.sessions)||[];if(!ss.length)return null;if(state.sit&&ss.some(function(s){return s.session_time===state.sit}))return state.sit;
  if(state.date===fijiToday()){var now=nowHM(),c=ss.filter(function(s){return addMins(s.session_time,90)>now});if(c.length)return c[0].session_time}
  var b=ss.find(function(s){return s.party_count});return (b||ss[0]).session_time}
function chipTags(p){var m=[];if(p.status==='pending'||p.status==='pending_large_group')m.push('<span class="pill st-request">Request</span>');if(p.arrived_at)m.push('<span class="pill st-arrived">Arrived '+esc(clock(p.arrived_at))+'</span>');
  if(p.vip)m.push('<span class="tag vip">VIP</span>');if(hasAlg(p))m.push('<span class="tag allergy">'+esc(p.allergens.join(', '))+'</span>');if(p.diet_prefs&&p.diet_prefs.length)m.push('<span class="tag diet">'+esc(p.diet_prefs.join(', '))+'</span>');
  if(isCel(p))m.push('<span class="tag occ">'+esc(p.occasion||'Celebration')+'</span>');if(p.high_chairs)m.push('<span class="tag seatn">'+p.high_chairs+' high chair'+(p.high_chairs>1?'s':'')+'</span>');if(p.wheelchair)m.push('<span class="tag seatn">Wheelchair</span>');return m.join('')}
function hasAlg(p){return !!(p&&p.allergens&&p.allergens.length)}
function sitParties(s){var seen={},o=[];s.tables.forEach(function(t){t.parties.forEach(function(p){if(!seen[p.id]){seen[p.id]=1;o.push(Object.assign({session_time:s.session_time},p))}})});(s.unassigned||[]).forEach(function(p){if(!seen[p.id]){seen[p.id]=1;o.push(Object.assign({session_time:s.session_time},p))}});return o}
function curSplit(p,s){var c=p.tables||[];if(!c.length)return null;var o={};if(c.length===1){o[c[0]]=p.size;return o}
  if(p.split)return Object.assign({},p.split);var left=p.size;c.forEach(function(code){var t=s.tables.find(function(x){return x.code===code});var n=Math.max(0,Math.min(t?t.seats:0,left));o[code]=n;left-=n});return o}
function splitText(sp){var k=Object.keys(sp||{});return k.length===1?tname(k[0]):k.map(function(c){return tname(c)+' '+sp[c]}).join(' + ')}
function colorMap(s){var m={},used={};sitParties(s).sort(function(a,b){return a.id<b.id?-1:1}).forEach(function(p){var h=0;for(var i=0;i<p.id.length;i++)h=(h*31+p.id.charCodeAt(i))%9973;var k=h%PCOL.length,n=0;while(used[k]&&n<PCOL.length){k=(k+1)%PCOL.length;n++}used[k]=1;m[p.id]=PCOL[k]});return m}
function layout(s,over){var by={},used={},sp={};s.tables.forEach(function(t){by[t.code]=[];used[t.code]=0});
  sitParties(s).forEach(function(p){var x=over&&Object.prototype.hasOwnProperty.call(over,p.id)?over[p.id]:curSplit(p,s);sp[p.id]=x;if(!x)return;
    Object.keys(x).forEach(function(c){if(!by[c])return;by[c].push({p:p,n:x[c]});used[c]+=x[c]})});
  return {by:by,used:used,sp:sp}}
/* v47: split rule. Same room only. Fewest guests on a grill with an allergy guest (or, for a party with an allergy, on a shared grill),
   then fewest grills, then neighbouring grills, then fewest empty seats. Clean grills are filled first. Nobody sits alone. Blocked grills are never used. */
function badGrill(t,al){return al?t.n>0:!!t.alg}
function allocClean(w,size,al){var ord=w.filter(function(t){return !badGrill(t,al)}).concat(w.filter(function(t){return badGrill(t,al)})),left=size,parts={};
  ord.forEach(function(t){var n=Math.min(t.free,left);parts[t.code]=n;left-=n});if(left>0)return null;
  ord.forEach(function(t){while(parts[t.code]<MINPART&&parts[t.code]<t.free){var d=null;ord.forEach(function(u){if(u!==t&&parts[u.code]>MINPART&&(!d||parts[u.code]>parts[d.code]))d=u});if(!d)break;parts[t.code]++;parts[d.code]--}});
  if(ord.some(function(t){return parts[t.code]<MINPART}))return null;
  var o={},bad=0;w.slice().sort(function(a,b){return a.i-b.i}).forEach(function(t){o[t.code]=parts[t.code];if(badGrill(t,al))bad+=parts[t.code]});return {o:o,bad:bad}}
function splitFor(T,size,al){var best=null,zs=[];T.forEach(function(t){if(zs.indexOf(t.zone)<0)zs.push(t.zone)});
  function less(a,b){for(var k=0;k<a.length;k++){if(a[k]!==b[k])return a[k]<b[k]}return false}
  zs.forEach(function(z){var g=T.filter(function(t){return t.zone===z&&!t.blk&&t.free>=MINPART}).sort(function(a,b){return a.i-b.i}),n=g.length;if(n<2||n>12)return;
    for(var m=1;m<(1<<n);m++){var w=[];for(var q=0;q<n;q++)if(m&(1<<q))w.push(g[q]);if(w.length<2)continue;
      var tot=w.reduce(function(x,t){return x+t.free},0);if(tot<size)continue;var a=allocClean(w,size,!!al);if(!a)continue;
      var adj=w.every(function(t,k){return !k||t.i===w[k-1].i+1}),sc=[a.bad,w.length,adj?0:1,tot-size];
      if(!best||less(sc,best.sc))best={sc:sc,a:a.o}}});
  return best?best.a:null}
function planFor(s,list){var clear={};list.forEach(function(p){clear[p.id]=null});var base=layout(s,clear);
  var T=s.tables.map(function(t,i){var bk=!!blockOf(s.session_time,t.code);return {code:t.code,zone:zoneOf(t.code),seats:t.seats,i:i,blk:bk,free:bk?0:t.seats-base.used[t.code],n:base.by[t.code].length,alg:base.by[t.code].some(function(e){return hasAlg(e.p)})}});
  var out={},miss=[];
  list.slice().sort(function(a,b){return b.size-a.size||(hasAlg(b)?1:0)-(hasAlg(a)?1:0)}).forEach(function(p){
    var al=hasAlg(p),best=null;
    function take(o){Object.keys(o).forEach(function(c){var t=T.find(function(x){return x.code===c});t.free-=o[c];t.n++;if(al)t.alg=true})}
    T.forEach(function(t){if(t.free<p.size)return;var sc=(t.free-p.size)+(((al&&t.n)||(t.alg&&!al))?6:0);if(!best||sc<best.sc)best={sc:sc,t:t}});
    if(best){var o={};o[best.t.code]=p.size;take(o);out[p.id]=o;return}
    var sp=splitFor(T,p.size,al);if(sp){take(sp);out[p.id]=sp;return}
    miss.push(p)});
  return {items:out,miss:miss}}
function sittingHtml(s){
  var cm=colorMap(s),seat=state.seat&&state.seat.session===s.session_time?state.seat:null,plan=state.plan&&state.plan.session===s.session_time&&state.plan.date===state.date?state.plan:null,over=null;
  if(plan)over=plan.over;else if(seat){over={};over[seat.id]=Object.keys(seat.sp).length?seat.sp:null}
  var L=layout(s,over),ps=sitParties(s),uns=ps.filter(function(p){return !L.sp[p.id]});
  var alg=[];s.tables.forEach(function(t){(L.by[t.code]||[]).forEach(function(e){if(hasAlg(e.p)){var l=(t.name||tname(t.code))+': '+e.p.name+' ('+e.n+') '+e.p.allergens.join(', ')+(clean(e.p.dietary)?', '+clean(e.p.dietary):'');if(alg.indexOf(l)<0)alg.push(l)}})});
  uns.forEach(function(p){if(hasAlg(p))alg.push('No grill yet: '+p.name+' ('+p.size+') '+p.allergens.join(', '))});
  var unsAll=ps.filter(function(p){return !(p.tables&&p.tables.length)}),acts='';
  if(!seat&&!plan&&ps.length){if(unsAll.length)acts+='<button class="btn primary sm" data-arr="'+s.session_time+'|0">Seat everyone</button>';if(ps.length>1)acts+='<button class="btn sm" data-arr="'+s.session_time+'|1">Tidy up grills</button>'}
  var h='<section class="svc k-tep" id="sit-'+s.session_time.replace(':','')+'"><div class="svc-head"><h2>Teppanyaki '+esc(s.label)+'</h2><span class="stat">'+esc(s.window_label)+'</span><span class="stat st-seats"><b>'+s.seats_booked+'</b> of '+s.seats_total+' seats</span><span class="stat"><b>'+s.party_count+'</b> '+(s.party_count===1?'party':'parties')+'</span><span class="stat"><b>'+s.arrived_count+'</b> arrived</span>'+(acts?'<span class="sh-acts noprint">'+acts+'</span>':'')+'</div><div class="capbar" aria-hidden="true"><i style="width:'+Math.min(100,Math.round(s.seats_booked/Math.max(1,s.seats_total)*100))+'%"></i></div>';
  if(plan){var ns=Object.keys(plan.over).length;
    h+='<div class="seatbar"><div><b>Plan for '+esc(s.label)+'</b><div class="small" style="opacity:.85">'+(ns?ns+(ns===1?' party':' parties')+' placed'+(plan.splits?', '+plan.splits+' split across neighbouring grills':'')+'. ':'')+(plan.miss.length?'Does not fit: '+esc(plan.miss.map(function(p){return p.name+' ('+p.size+')'}).join(', '))+'. ':'')+'Striped seats show the changes.'+(plan.here?' '+plan.here+(plan.here===1?' party has':' parties have')+' arrived and '+(plan.here===1?'stays':'stay')+' where '+(plan.here===1?'it is':'they are')+'.':'')+'</div></div><span class="sp"></span>'+(ns?'<button class="btn primary sm" id="planapply">Apply plan</button>':'')+'<button class="btn sm" id="plancancel">Cancel</button></div>';}
  else if(seat){var tot=Object.keys(seat.sp).reduce(function(n,c){return n+seat.sp[c]},0),ok=tot===seat.size&&tot>0;
    var line=seat.note&&seat.choose?seat.note:!seat.choose&&seat.sug?'Suggested: <b>'+esc(splitText(seat.sug))+'</b>'+(seat.warn?'<span class="seatwarn">'+esc(seat.warn)+'</span>':''):seat.sug||Object.keys(seat.sp).length?'Tap grills to choose. '+(ok?'All '+seat.size+' placed.':tot+' of '+seat.size+' placed.')+(Object.keys(seat.sp).length>1&&Object.keys(seat.sp).some(function(c){return seat.sp[c]<MINPART})?' One guest would sit alone at '+esc(tname(Object.keys(seat.sp).find(function(c){return seat.sp[c]<MINPART})))+'.':''):'No room together at this sitting. Tap grills to place them anyway.';
    var steps=seat.choose&&Object.keys(seat.sp).length>1?'<div class="stps">'+Object.keys(seat.sp).map(function(c){return '<span class="stp">'+esc(tname(c))+'<button data-step="'+c+'|-1" aria-label="One fewer at '+esc(tname(c))+'">−</button><b>'+seat.sp[c]+'</b><button data-step="'+c+'|1" aria-label="One more at '+esc(tname(c))+'">+</button></span>'}).join('')+'</div>':'';
    h+='<div class="seatbar"><div><b>Seat '+esc(seat.name)+' ('+seat.size+')</b><div class="small" style="opacity:.9">'+line+'</div>'+steps+'</div><span class="sp"></span>'+
      (ok?'<button class="btn primary sm" id="seatsave">'+(seat.choose?'Save seating':'Seat here')+'</button>':'')+(!seat.choose?'<button class="btn sm" id="seatchoose">Choose myself</button>':seat.sug?'<button class="btn sm" id="seatsug">Use suggestion</button>':'')+'<button class="btn sm" id="seatx">Cancel</button></div>';}
  else h+='<div class="unseated noprint'+(uns.length?'':' empty-drop')+'" data-drop="none" data-sess="'+s.session_time+'"><b>Needs a grill ('+uns.length+')</b> <span class="small muted">'+(uns.length?'Drag onto a grill, or tap for a suggestion.':'Drop a party here to take it off its grill.')+'</span><div class="unseated-list">'+uns.map(function(p){
    return '<button class="seatbtn chip-p" data-seat="'+p.id+'" data-drag="'+p.id+'||'+p.size+'|'+s.session_time+'"'+chipStyle(cm[p.id])+' title="Drag onto a grill, or tap for a suggestion">'+GRIP+'<b><i class="pdot" style="background:'+cm[p.id]+'"></i>'+esc(p.name)+' ('+p.size+')</b><span class="bk-tags">'+(p.status==='pending_large_group'?'<span class="pill st-request">Request</span>':'')+(hasAlg(p)?'<span class="tag allergy">'+esc(p.allergens.join(', '))+'</span>':'')+'</span></button>'}).join('')+'</div></div>';
  h+=(state.fp==='plan'&&s.tables.length)?planHtml(s,L,cm,seat,plan):'<div class="floor">'+s.tables.map(function(t){return tableHtml(t,s,L,cm,seat,plan)}).join('')+'</div>';
  return h+'</section>';
}
/* floor plan: drawn from the grill settings (room, order, seats, chef side). Tap a grill to seat a waiting party; press and hold a chair or name to drag it to another grill. */
var CHEF_DEF={T5:'bottom',T6:'right'},FS=38,FR=16,FPDIR=null;
function chefOf(t){var d=((state.day&&state.day.tables)||[]).find(function(x){return x.code===t.code})||{};return t.chef||d.chef||CHEF_DEF[t.code]||'top'}
function roomOf(t){var d=((state.day&&state.day.tables)||[]).find(function(x){return x.code===t.code})||{};return (t.zone||d.zone||'main')==='main'?'main':'priv'}
function fpRot(p,c){var x=p[0],y=p[1];return c==='right'?[-y,x]:c==='bottom'?[-x,-y]:c==='left'?[y,-x]:[x,y]}
function fpBox(pts){var xs=pts.map(function(p){return p[0]}),ys=pts.map(function(p){return p[1]}),x0=Math.min.apply(0,xs),y0=Math.min.apply(0,ys);return [x0,y0,Math.max.apply(0,xs)-x0,Math.max.apply(0,ys)-y0]}
function fpGeo(n,c){n=Math.max(1,Math.min(20,n|0));var b=Math.ceil(n/2),r=n-b,s1=Math.floor(r/2),s2=r-s1,S=FS,wb=(Math.max(b,2)-1)*S/2+22,hb=Math.max(36,(Math.max(s1,s2,2)-1)*S/2+19),ch=[],i;
  for(i=0;i<s1;i++)ch.push([-(wb+20),-hb+22+i*S]);for(i=0;i<b;i++)ch.push([-(b-1)*S/2+i*S,hb+26]);for(i=0;i<s2;i++)ch.push([wb+20,-hb+22+(s2-1-i)*S]);
  function R(p){return fpRot(p,c)}function rect(x,y,w,h){return fpBox([R([x,y]),R([x+w,y+h])])}
  var all=ch.map(R),bx=fpBox(all.concat([R([0,-hb-28]),R([-wb,-hb]),R([wb,hb])]));
  return {chairs:all,body:rect(-wb,-hb,2*wb,2*hb),top:rect(-wb+22,-hb+10,2*wb-44,22),chef:R([0,-hb-12]),lbl:R([0,14]),box:[bx[0]-FR-6,bx[1]-FR-6,bx[2]+2*FR+12,bx[3]+2*FR+12]}}
function fpPrivDir(){var w=window.innerWidth;return w>=601&&w<=900?'h':'v'}
function fpMainDir(){return window.innerWidth<=600?'v':'h'}
function fpLayout(items,room,dir){var gap=room==='main'?30:44,cur,W=0,H=0,div=[];
  if(dir==='h'){cur=16;items.forEach(function(e){H=Math.max(H,e.g.box[3])});
    items.forEach(function(e,i){var b=e.g.box;if(i)div.push(['x',Math.round(cur-gap/2)]);e.cx=cur-b[0];e.cy=(room==='main'?64:56+(H-b[3])/2)-b[1];cur+=b[2]+gap});
    W=cur-gap+16;return {vb:[0,40,Math.round(W),Math.round(H+(room==='main'?36:30))],div:room==='main'?[]:div}}
  cur=56;items.forEach(function(e){W=Math.max(W,e.g.box[2])});W+=32;
  items.forEach(function(e,i){var b=e.g.box;if(i)div.push(['y',Math.round(cur-gap/2)]);e.cx=W/2-(b[0]+b[2]/2);e.cy=cur-b[1];cur+=b[3]+gap});
  return {vb:[0,40,Math.round(W),Math.round(cur-gap+16-40)],div:room==='main'?[]:div}}
function fpRoomSvg(ts,room,dir,label,opt){opt=opt||{};var items=ts.map(function(t){return {t:t,g:fpGeo(t.seats,chefOf(t))}}),L=fpLayout(items,room,dir),vb=L.vb,s='<svg viewBox="'+vb.join(' ')+'" role="group" aria-label="'+esc(label)+'"'+(opt.minw?' style="min-width:'+Math.round(vb[2]*.72)+'px"':'')+'>';
  if(room==='main')s+='<line class="fp-wall" x1="0" y1="54" x2="'+vb[2]+'" y2="54"/>';
  L.div.forEach(function(d){s+=d[0]==='x'?'<line class="fp-wall dash" x1="'+d[1]+'" y1="'+(vb[1]+12)+'" x2="'+d[1]+'" y2="'+(vb[1]+vb[3]-12)+'"/>':'<line class="fp-wall dash" x1="12" y1="'+d[1]+'" x2="'+(vb[2]-12)+'" y2="'+d[1]+'"/>'});
  items.forEach(function(e){var g=e.g,t=e.t;function X(p){return [Math.round(p[0]+e.cx),Math.round(p[1]+e.cy)]}var b=g.body,tp=g.top,c=X(g.chef),l=X(g.lbl),pos=g.chairs.map(X);
    s+='<g class="fp-g'+(opt.cls?opt.cls(t):'')+'"'+(opt.attrs?opt.attrs(t):'')+'><rect class="fp-body" x="'+Math.round(b[0]+e.cx)+'" y="'+Math.round(b[1]+e.cy)+'" width="'+b[2]+'" height="'+b[3]+'" rx="10"/><rect class="fp-top" x="'+Math.round(tp[0]+e.cx)+'" y="'+Math.round(tp[1]+e.cy)+'" width="'+tp[2]+'" height="'+tp[3]+'" rx="4"/><text class="fp-chef" x="'+c[0]+'" y="'+(c[1]+4)+'">CHEF</text>'+
      (opt.chairs?opt.chairs(t,pos):pos.map(function(q){return '<circle class="ch" cx="'+q[0]+'" cy="'+q[1]+'" r="'+FR+'"/>'}).join(''))+
      '<text class="fp-lbl" x="'+l[0]+'" y="'+l[1]+'">'+esc(t.name||tname(t.code))+'</text><text class="fp-sub" x="'+l[0]+'" y="'+(l[1]+16)+'">'+esc(opt.sub?opt.sub(t):t.seats+' seats')+'</text></g>'});
  return s+'</svg>'}
function planHtml(s,L,cm,seat,plan){
  var leg={main:'',priv:''},ts={main:[],priv:[]},act=!seat&&!plan;FPDIR=fpPrivDir()+fpMainDir();
  s.tables.forEach(function(t){ts[roomOf(t)].push(t)});
  function fit(t){var es=L.by[t.code]||[],others=es.filter(function(e){return e.p.id!==seat.id}),fr=t.seats-others.reduce(function(n,e){return n+e.n},0),mine=seat.sp[t.code]||0;
    return {mine:mine,fr:fr,k:mine?'is-on':fr>=seat.size&&!others.length?'fits':fr>0?'part':'nofit'}}
  var opt={
    cls:function(t){return blockOf(s.session_time,t.code)?' t-blocked':seat?' t-'+fit(t).k:''},
    attrs:function(t){var used=L.used[t.code]||0,nm=t.name||tname(t.code),a=' data-tcode="'+t.code+'" data-sess="'+s.session_time+'"';
      if(plan)return a;var lab=seat?(function(f){return f.mine?nm+', '+f.mine+' placed here. Activate to remove.':f.fr>0?'Seat '+seat.name+' at '+nm+', '+f.fr+' free':nm+' is full'})(fit(t)):nm+', '+used+' of '+t.seats+' seats taken. Activate to seat a waiting party here.';
      return a+' data-tap="'+t.code+'" tabindex="0" role="button" aria-label="'+esc(lab)+'"'},
    sub:function(t){var used=L.used[t.code]||0;if(blockOf(s.session_time,t.code))return 'Blocked';if(seat){var f=fit(t);return f.mine?f.mine+' here':f.fr>=seat.size?'Seat here':f.fr>0?f.fr+' free':'Full'}
      return used>=t.seats?(used>t.seats?used+' of '+t.seats+', over':'Full'):used+' of '+t.seats},
    chairs:function(t,pos){var es=L.by[t.code]||[],g='',k=0;
      es.forEach(function(e){var p=e.p,chg=(plan&&plan.over[p.id])||(seat&&seat.id===p.id),col=cm[p.id];for(var i=0;i<e.n;i++){var q=pos[k];if(q){
        g+='<g class="chg"'+(act?' data-id="'+p.id+'" data-drag="'+p.id+'|'+t.code+'|'+e.n+'|'+s.session_time+'"':'')+' style="--pc:'+col+';--pt:'+pcText(col)+';--pb:'+pcBg(col)+'"><title>'+esc(p.name+' ('+p.size+')'+(hasAlg(p)?', allergy: '+p.allergens.join(', '):''))+(act?'. Tap for details, or press and hold to move.':'')+'</title><circle class="hit" cx="'+q[0]+'" cy="'+q[1]+'" r="'+(FR+7)+'"/><circle class="ch on'+(p.arrived_at?' here':'')+(chg?' prop':'')+'" cx="'+q[0]+'" cy="'+q[1]+'" r="'+FR+'" style="fill:'+col+';stroke:'+col+'"/>'+(hasAlg(p)?'<circle class="ch-alg" cx="'+(q[0]+11)+'" cy="'+(q[1]-11)+'" r="5"/>':'')+'</g>'}k++}});
      for(;k<pos.length;k++)g+='<circle class="ch" cx="'+pos[k][0]+'" cy="'+pos[k][1]+'" r="'+FR+'"/>';
      return g}};
  ['main','priv'].forEach(function(r){ts[r].forEach(function(t){var es=L.by[t.code]||[],used=L.used[t.code]||0;
    leg[r]+='<div class="fp-row"><b>'+esc(t.name||tname(t.code))+' <span class="muted">'+used+'/'+t.seats+'</span></b>'+(es.length?es.map(function(e){var p=e.p;return '<button class="fp-p" data-id="'+p.id+'"'+(act?' data-drag="'+p.id+'|'+t.code+'|'+e.n+'|'+s.session_time+'"':'')+chipStyle(cm[p.id])+'><i class="pdot" style="background:'+cm[p.id]+'"></i>'+esc(p.name)+' ('+e.n+(e.n!==p.size?' of '+p.size:'')+')'+(p.arrived_at?'<span class="pill st-arrived">Here</span>':'')+(hasAlg(p)?'<span class="tag allergy">'+esc(p.allergens.join(', '))+'</span>':'')+'</button>'}).join(''):blockOf(s.session_time,t.code)?'':'<span class="fp-free">Free</span>')+blockCtl(t,s,es.length,act)+'</div>'})});
  var h='<div class="fplan'+(act?'':' fp-act')+'">';
  if(ts.main.length)h+='<div class="fp-room"><div class="fp-h">Main room <span class="muted">Kitchen side at the top</span><span class="fp-swipe muted">Swipe sideways to see every grill</span></div><div class="fp-scroll" tabindex="0" role="region" aria-label="Main room drawing">'+fpRoomSvg(ts.main,'main',fpMainDir(),'Main room grills, Teppanyaki '+s.label,fpMainDir()==='h'?Object.assign({minw:1},opt):opt)+'</div><div class="fp-leg">'+leg.main+'</div></div>';
  if(ts.priv.length)h+='<div class="fp-room fp-priv fp-'+fpPrivDir()+'"><div class="fp-h">Private dining</div><div class="fp-pscroll" tabindex="0" role="region" aria-label="Private dining drawing">'+fpRoomSvg(ts.priv,'priv',fpPrivDir(),'Private dining grills, Teppanyaki '+s.label,opt)+'</div><div class="fp-leg">'+leg.priv+'</div></div>';
  return h+'</div><p class="small muted fp-note">'+(seat?'Tap a grill to place '+esc(seat.name)+'. Green: fits. Amber: part fits. ':plan?'Dashed chairs show the planned changes. ':'Tap a grill to seat a party that is waiting. Press and hold a chair or a name, then drag it to another grill to move the party. ')+'Solid chair: guest has arrived. Light chair: expected. Red dot: allergy. The system records how many guests sit at each grill, not which chair.</p>'}
function fpTap(code,sess){var s=sessionOf(sess),sr=$('sr');if(!s||!sr)return;if(blockOf(sess,code)){toast(tname(code)+' is blocked for this sitting. Unblock it first.');return}var uns=sitParties(s).filter(function(p){return !(p.tables&&p.tables.length)}),fr=freeFor(s,code,'_none'),nm=tname(code);
  if(!uns.length){toast('Every party has a grill. To move one, press and hold a chair or name and drag it to '+nm+'.');return}
  sr.innerHTML='<div class="scrim"></div><div class="dsheet" role="dialog" aria-modal="true" aria-label="Seat at '+esc(nm)+'"><div class="dsh-h"><div><h2>Seat at '+esc(nm)+'</h2><p class="small muted">'+(fr>0?fr+' of '+(s.tables.find(function(t){return t.code===code})||{}).seats+' seats free at Teppanyaki '+esc(s.label)+'. Choose who sits here.':nm+' is full at Teppanyaki '+esc(s.label)+'. Choose a party to split across grills.')+'</p></div><button class="btn sm" id="fpx">Close</button></div><div class="fpt-list">'+
    uns.map(function(p){var ok=p.size<=fr;return '<button class="fpt'+(ok?' ok':'')+'" data-fpt="'+p.id+'"><b>'+esc(p.name)+' ('+p.size+')</b><span class="bk-tags">'+(hasAlg(p)?'<span class="tag allergy">'+esc(p.allergens.join(', '))+'</span>':'')+(p.status==='pending_large_group'?'<span class="pill st-request">Request</span>':'')+'</span><span class="small">'+(ok?'Fits here':fr>0?'Only '+fr+' free here. You choose the split next.':'Choose grills next')+'</span></button>'}).join('')+'</div></div>';
  sr.querySelector('.scrim').onclick=closeSearch;$('fpx').onclick=closeSearch;
  sr.querySelectorAll('[data-fpt]').forEach(function(b){b.onclick=async function(){var p=uns.find(function(x){return x.id===b.dataset.fpt});closeSearch();if(!p)return;
    if(p.size<=fr){var sp={};sp[code]=p.size;try{await call('staff_seat',{p_id:p.id,p_split:sp});toast(p.name+' is seated at '+nm+'.',function(){undoSeat([{id:p.id,split:{}}],p.name)});await loadDay();loadNeeds()}catch(e){toast(errText(e))}return}
    startSeat(p.id);if(state.seat){state.seat.choose=true;state.seat.sp={};pickTable(code)}}})}
window.addEventListener('resize',function(){clearTimeout(window.__fpt);window.__fpt=setTimeout(function(){if(FPDIR&&(fpPrivDir()+fpMainDir())!==FPDIR&&!DR&&document.querySelector('#day .fplan'))paintDay();if(window.__gprev&&document.getElementById('gprev'))window.__gprev()},200)});
function tableHtml(t,s,L,cm,seat,plan){
  var es=L.by[t.code]||[],used=L.used[t.code]||0,alg=es.some(function(e){return hasAlg(e.p)}),cells='',k=0;
  es.forEach(function(e){var cur=curSplit(e.p,s),chg=(plan&&plan.over[e.p.id])||(seat&&seat.id===e.p.id);for(var i=0;i<e.n;i++){cells+='<i class="seat f'+(chg?' prop':'')+(k>=t.seats?' ovr':'')+'" style="background-color:'+cm[e.p.id]+'"></i>';k++}});
  var nseat=Math.max(k,t.seats);for(;k<t.seats;k++)cells+='<i class="seat"></i>';
  var fit='',pick='';
  if(seat){var others=es.filter(function(e){return e.p.id!==seat.id}),fr=t.seats-others.reduce(function(n,e){return n+e.n},0),mine=seat.sp[t.code]||0,warn=(seat.alg&&others.length)||(others.some(function(e){return hasAlg(e.p)}));
    fit=mine?'is-on':fr>=seat.size&&!others.length?'fits':fr>0?'part':'nofit';
    pick='<button class="tpick" data-pick="'+t.code+'">'+(mine?esc(mine+' here. Tap to remove'):fr>=seat.size?'Seat all '+seat.size+' here'+(others.length?', with '+esc(others.map(function(e){return e.p.name}).join(', ')):''):fr>0?fr+' free. Tap to add':'Full')+(warn&&!mine&&fr>0?'<small>Shared grill with an allergy</small>':'')+'</button>'}
  var rows=es.map(function(e){var p=e.p,sp=L.sp[p.id],multi=sp&&Object.keys(sp).length>1,others=multi?Object.keys(sp).filter(function(c){return c!==t.code}):[],chg=plan&&plan.over[p.id];
    var acts=!seat&&!plan?quickHtml(p,false):'';
    return '<div class="bk tbk'+(hasAlg(p)?' has-alg':'')+(p.arrived_at?' is-arr':'')+'" data-party="'+p.id+'"'+chipStyle(cm[p.id])+(!seat&&!plan?' data-drag="'+p.id+'|'+t.code+'|'+e.n+'|'+s.session_time+'" title="Drag to move, tap for details"':'')+'>'+(!seat&&!plan?GRIP:'')+'<button class="bk-main" data-id="'+p.id+'"><div class="bk-name"><i class="pdot" style="background:'+cm[p.id]+'"></i>'+esc(p.name)+(chg?'<span class="tag occ">'+(curSplit(p,s)?'Moved':'New')+'</span>':'')+(p.pinned&&!chg?PIN:'')+'<span class="size">'+(multi?e.n+'<small> of '+p.size+'</small>':p.size)+'</span></div>'+
      (multi?'<div class="lk">Linked: '+esc(others.map(function(c){return tname(c)+' '+sp[c]}).join(' + '))+'</div>':'')+'<div class="bk-tags">'+chipTags(p)+'</div></button>'+(acts?'<div class="bk-acts noprint">'+acts+'</div>':'')+'</div>'}).join('');
  var blk=blockOf(s.session_time,t.code);
  if(!rows&&!seat)rows=blk?'':'<div class="tempty">Free, drop a party here</div>';
  if(blk&&seat)pick='<div class="tpick tblocked">Blocked</div>';
  rows+=blockCtl(t,s,es.length,!seat&&!plan);
  var share=alg&&es.length>1;
  return '<div class="tcard'+(alg?' has-alg':'')+(blk?' t-blocked':fit?' t-'+fit:'')+(!es.length&&!seat&&!blk?' t-free':'')+'" data-tcode="'+t.code+'" data-sess="'+s.session_time+'"><div class="thead"><button class="tname" data-stn="'+t.code+'" title="Open the station brief for this grill">'+esc(t.name||tname(t.code))+'</button><span class="tcode">'+esc(t.code)+'</span><span class="tfill'+(used>t.seats?' red':'')+'">'+(blk?'Blocked':used>=t.seats?(used>t.seats?used+' of '+t.seats+', over':'Full'):used+' of '+t.seats)+'</span></div><div class="seats" aria-hidden="true" style="--n:'+nseat+'">'+cells+'</div>'+pick+(share?'<div class="tnote">Allergy on a shared grill · tell the chef</div>':'')+rows+'</div>';
}
function findParty(id){var d=state.day,f=null;if(!d)return null;(d.dining||[]).concat(d.events||[]).forEach(function(p){if(p.id===id)f=p});
  (d.sessions||[]).forEach(function(s){(s.unassigned||[]).forEach(function(p){if(p.id===id)f=Object.assign({session_time:s.session_time},p)});s.tables.forEach(function(t){t.parties.forEach(function(p){if(p.id===id&&!f)f=Object.assign({session_time:s.session_time},p)})})});return f}
async function quick(id,a,btn){
  var p=findParty(id)||{name:'This party'};
  if(a==='move')return startSeat(id);
  btn.disabled=true;
  try{await call('staff_action2',{p_id:id,p_action:a,p_reason:null,p_notify:false});toast(p.name+(a==='arrived'?' arrived.':' marked as a no-show.'),function(){undoAct(id,UNDO[a],p.name)});await loadDay();loadNeeds()}catch(e){btn.disabled=false;toast(errText(e))}
}
function startSeat(id){var p=findParty(id);if(!p)return;var s=sessionOf(p.session_time);if(!s)return;state.plan=null;state.sit=p.session_time;
  var r=planFor(s,[p]),sug=r.items[p.id]||null;
  state.seat={id:id,name:p.name,size:p.size,session:p.session_time,sug:sug,sp:sug?Object.assign({},sug):{},choose:!sug,alg:hasAlg(p),warn:sug?algWarn(s,p,sug):''};
  paintDay();var b=document.querySelector('.seatbar');if(b)b.scrollIntoView({behavior:'smooth',block:'center'})}
function sessionOf(t){return ((state.day&&state.day.sessions)||[]).find(function(s){return s.session_time===t})}
function freeFor(s,code,id){if(blockOf(s.session_time,code))return 0;var o={};o[id]=null;var L=layout(s,o),t=s.tables.find(function(x){return x.code===code});return Math.max(0,(t?t.seats:0)-L.used[code])}
function pickTable(code){var st=state.seat;if(!st)return;var s=sessionOf(st.session);if(!s)return;if(blockOf(st.session,code)){toast(tname(code)+' is blocked for this sitting. Unblock it first.');return}
  if(!st.choose){st.choose=true;st.sp={}}st.note=null;st.xok=false;
  if(st.sp[code])delete st.sp[code];else st.sp[code]=0;
  var codes=Object.keys(st.sp).sort(function(a,b){return s.tables.findIndex(function(t){return t.code===a})-s.tables.findIndex(function(t){return t.code===b})}),left=st.size,o={};
  codes.forEach(function(c,i){var n=i<codes.length-1?Math.min(freeFor(s,c,st.id),left):left;n=Math.max(1,n);o[c]=n;left-=n});
  st.sp=o;paintDay()}
function stepSeat(code,d){var st=state.seat;if(!st||!st.sp[code])return;st.note=null;st.sp[code]=Math.max(1,Math.min(20,st.sp[code]+d));paintDay()}
async function saveSeat(){var st=state.seat;if(!st||!Object.keys(st.sp).length)return;var p=findParty(st.id),s=sessionOf(st.session),prev=p&&s?curSplit(p,s):null,sp=st.sp;
  if(rooms(sp)>1&&!st.xok){st.xok=true;st.choose=true;st.note='This splits '+esc(st.name)+' across the main room and private dining. Tap Save again to confirm, or tap grills to change.';paintDay();return}
  try{await call('staff_seat',{p_id:st.id,p_split:sp});state.seat=null;toast(st.name+' is seated at '+splitText(sp)+'.',function(){undoSeat([{id:st.id,split:prev||{}}],st.name)});await loadDay();loadNeeds()}catch(e){toast(errText(e))}}
async function undoSeat(items,name){try{await call('staff_seat_plan',{p_items:items});toast('Undone. '+name+' is back where they were.');await loadDay();loadNeeds()}catch(e){toast(errText(e))}}
function arrange(st,all){var s=sessionOf(st);if(!s)return;state.seat=null;state.sit=st;
  var ps=sitParties(s).filter(function(p){return !p.arrived_at&&(all||!(p.tables&&p.tables.length))});
  if(!ps.length){toast(all?'Everyone at this sitting has arrived, so there is nobody left to move.':'Every party already has a grill.');return}
  var r=planFor(s,ps),ov={};Object.keys(r.items).forEach(function(id){var p=ps.find(function(x){return x.id===id}),cur=curSplit(p,s);if(JSON.stringify(cur)!==JSON.stringify(r.items[id]))ov[id]=r.items[id]});
  state.plan={session:st,date:state.date,over:ov,miss:r.miss,pins:0,here:all?sitParties(s).filter(function(p){return p.arrived_at}).length:0,splits:Object.keys(ov).filter(function(k){return Object.keys(ov[k]).length>1}).length};
  if(!Object.keys(ov).length&&!r.miss.length){state.plan=null;toast('The seating already works well. Nothing to change.');return}
  paintDay();var b=document.querySelector('.seatbar');if(b)b.scrollIntoView({behavior:'smooth',block:'center'})}
async function applyPlan(){var pl=state.plan;if(!pl)return;var s=sessionOf(pl.session),items=[],prev=[];
  Object.keys(pl.over).forEach(function(id){var p=findParty(id);items.push({id:id,split:pl.over[id]});prev.push({id:id,split:(p&&s&&curSplit(p,s))||{},pin:!!(p&&p.pinned)})});
  try{await call('staff_seat_plan',{p_items:items});state.plan=null;toast('Done. '+items.length+(items.length===1?' party is':' parties are')+' seated.',function(){undoSeat(prev,'Plan')});await loadDay();loadNeeds()}catch(e){toast(errText(e))}}
/* ---------- Drag and drop parties between grills ---------- */
var DR=null,DJUST=false;
function dragInfo(el){var a=(el.getAttribute('data-drag')||'').split('|');return {id:a[0],from:a[1]||'',n:+a[2]||0,sess:a[3]}}
function dropTarget(x,y){var e=document.elementFromPoint(x,y);if(!e||!DR)return null;var t=e.closest('[data-tcode]'),u=e.closest('[data-drop="none"]');
  if(t)return {code:t.getAttribute('data-tcode'),el:t,sess:t.getAttribute('data-sess')};if(u&&u.getAttribute('data-sess')===DR.sess)return {code:'',el:u,sess:DR.sess};return null}
function crossFit(code,sess){var s2=sessionOf(sess),p=findParty(DR.id);if(!s2||!p)return null;var fr=freeFor(s2,code,p.id);
  if(fr>=p.size){var o={};o[code]=p.size;return {s2:s2,p:p,sp:o,fr:fr}}
  if(fr>=MINPART){var sp={},idx=s2.tables.findIndex(function(x){return x.code===code}),over=p.size-fr;sp[code]=fr;
    for(var dist=1;dist<s2.tables.length&&over>0;dist++){[idx+dist,idx-dist].forEach(function(j){if(over<=0||j<0||j>=s2.tables.length)return;var c=s2.tables[j].code;if(zoneOf(c)!==zoneOf(code))return;var room=freeFor(s2,c,p.id);if(room>=over&&over>=MINPART){sp[c]=over;over=0}})}
    if(over<=0){var o2={};s2.tables.forEach(function(x){if(sp[x.code])o2[x.code]=sp[x.code]});return {s2:s2,p:p,sp:o2,fr:fr,split:true}}}
  var r=planFor(s2,[p]);return {s2:s2,p:p,sp:r.items[p.id]||null,fr:fr,elsewhere:true}}
function dropSplit(code){var s=sessionOf(DR.sess),p=findParty(DR.id);if(!s||!p)return null;var cur=curSplit(p,s)||{},ns=Object.assign({},cur),mv=DR.from?(cur[DR.from]||DR.n):p.size;
  if(DR.from)delete ns[DR.from];else ns={};ns[code]=(ns[code]||0)+mv;return {s:s,p:p,cur:cur,ns:ns,fr:freeFor(s,code,DR.id)}}
function rooms(sp){var z={};Object.keys(sp||{}).forEach(function(c){z[zoneOf(c)]=1});return Object.keys(z).length}
function dragStart(el,x,y){var d=dragInfo(el),p=findParty(d.id);if(!p||state.seat||state.plan)return false;
  DR={id:d.id,from:d.from,n:d.n||p.size,sess:d.sess,src:el,x:x,y:y,over:null,raf:0};
  var g=document.createElement('div');g.className='dghost';var pc=el.style.getPropertyValue('--pc')||(el.querySelector('.pdot')?el.querySelector('.pdot').style.background:'#fff');g.innerHTML='<i class="pdot" style="background:'+pc+'"></i>'+esc(p.name)+' <span>'+(DR.from&&DR.n!==p.size?DR.n+' of '+p.size:p.size)+'</span>';
  root.appendChild(g);DR.ghost=g;root.classList.add('dragging');el.classList.remove('pressing');el.classList.add('is-src');var pt=el.style.getPropertyValue('--pt'),pb=el.style.getPropertyValue('--pb');if(pt){g.style.background=pb;g.style.color=pt;g.style.boxShadow='inset 5px 0 0 '+pc+',0 16px 36px rgba(16,24,40,.32)'}else g.style.borderLeft='8px solid '+pc;if(navigator.vibrate)try{navigator.vibrate(12)}catch(e){}
  dragMove(x,y);DR.raf=requestAnimationFrame(autoScroll);return true}
function autoScroll(){if(!DR)return;var h=window.innerHeight,y=DR.y,d=y<100?-Math.min(18,Math.ceil((100-y)/5)):y>h-140?Math.min(18,Math.ceil((y-h+140)/5)):0;if(d){window.scrollBy(0,d);markTarget()}DR.raf=requestAnimationFrame(autoScroll)}
function markTarget(){var t=dropTarget(DR.x,DR.y),k=t?t.code+'|'+(t.el===DR.over?'':'n'):'';
  document.querySelectorAll('#kzs .drop-ok,#kzs .drop-part,#kzs .drop-no,#kzs .drop-un').forEach(function(z){z.classList.remove('drop-ok','drop-part','drop-no','drop-un')});
  DR.over=t?t.el:null;if(!t)return;if(!t.code){t.el.classList.add('drop-un');return}
  if(t.sess!==DR.sess){var pp=findParty(DR.id);if(!pp||pp.arrived_at){t.el.classList.add('drop-no');return}var cf=crossFit(t.code,t.sess);t.el.classList.add(!cf||!cf.sp?'drop-no':cf.split||cf.elsewhere?'drop-part':'drop-ok');return}
  if(t.code===DR.from){return}var r=dropSplit(t.code);if(!r)return;t.el.classList.add(r.ns[t.code]<=r.fr&&rooms(r.ns)<2?'drop-ok':r.fr>0?'drop-part':'drop-no')}
function dragMove(x,y){if(!DR)return;DR.x=x;DR.y=y;DR.ghost.style.transform='translate('+(x-30)+'px,'+(y-64)+'px)';markTarget()}
function dragCancel(){if(!DR)return;cancelAnimationFrame(DR.raf);DR.ghost.remove();DR.src.classList.remove('is-src');root.classList.remove('dragging');
  document.querySelectorAll('#kzs .drop-ok,#kzs .drop-part,#kzs .drop-no,#kzs .drop-un').forEach(function(z){z.classList.remove('drop-ok','drop-part','drop-no','drop-un')});DR=null}
async function dragEnd(x,y){if(!DR)return;var t=dropTarget(x,y),d=DR;DJUST=true;setTimeout(function(){DJUST=false},60);
  if(!t){dragCancel();return}
  if(!t.code){var p0=findParty(d.id),s0=sessionOf(d.sess),prev0=p0&&s0?curSplit(p0,s0):null;dragCancel();if(!prev0)return;
    try{await call('staff_seat',{p_id:d.id,p_split:null});toast(p0.name+' now needs a grill.',function(){undoSeat([{id:d.id,split:prev0}],p0.name)});await loadDay();loadNeeds()}catch(e){toast(errText(e))}return}
  if(t.sess!==d.sess){var cf=crossFit(t.code,t.sess);dragCancel();crossMove(cf,t.code);return}
  if(t.code===d.from){dragCancel();return}
  var r=dropSplit(t.code);dragCancel();if(!r)return;var p=r.p,s=r.s,ns=r.ns,code=t.code;
  if(ns[code]<=r.fr&&rooms(ns)>1){var oo={};s.tables.forEach(function(x){if(ns[x.code])oo[x.code]=ns[x.code]});ns=oo;state.seat={id:p.id,name:p.name,size:p.size,session:d.sess,sug:null,sp:ns,choose:true,alg:hasAlg(p),xok:true,note:'This puts '+esc(p.name)+' in both the main room and private dining: <b>'+esc(splitText(ns))+'</b>. Save to confirm, or tap grills to change.'};paintDay();return}
  if(ns[code]<=r.fr){try{await call('staff_seat',{p_id:p.id,p_split:ns});toast(p.name+' is seated at '+splitText(ns)+'.',function(){undoSeat([{id:p.id,split:Object.keys(r.cur).length?r.cur:{}}],p.name)});await loadDay();loadNeeds()}catch(e){toast(errText(e))}return}
  if(r.fr<=0){toast(tname(code)+' is full. Try another grill.');return}
  var over=ns[code]-r.fr,idx=s.tables.findIndex(function(x){return x.code===code}),fixed=false;ns[code]=r.fr;
  var ex={};ex[p.id]=null;var L0=layout(s,ex),pal=hasAlg(p);function algAt(j){if(j<0||j>=s.tables.length)return 0;var es=L0.by[s.tables[j].code]||[];return es.length&&(pal||es.some(function(e){return hasAlg(e.p)}))?1:0}
  for(var dist=1;dist<s.tables.length&&!fixed;dist++){[idx+dist,idx-dist].sort(function(a,b){return algAt(a)-algAt(b)}).forEach(function(j){if(fixed||j<0||j>=s.tables.length)return;var c=s.tables[j].code;if(zoneOf(c)!==zoneOf(code))return;var room=freeFor(s,c,p.id)-(ns[c]||0);
      if(room>=over&&(over>=MINPART||ns[c])){ns[c]=(ns[c]||0)+over;fixed=true}})}
  if(!fixed)ns[code]+=over;
  var o={};s.tables.forEach(function(x){if(ns[x.code])o[x.code]=ns[x.code]});
  state.seat={id:p.id,name:p.name,size:p.size,session:d.sess,sug:fixed?o:null,sp:o,choose:true,alg:hasAlg(p),note:fixed?tname(code)+' has room for '+r.fr+'. Suggested: <b>'+esc(splitText(o))+'</b>.':tname(code)+' has room for only '+r.fr+'. Adjust the numbers or tap another grill.'};
  paintDay();var b=document.querySelector('.seatbar');if(b&&window.innerWidth>900)b.scrollIntoView({behavior:'smooth',block:'center'})}
(function(){var pend=null,timer=null;
  document.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'||e.button!==0)return;var el=e.target.closest&&e.target.closest('#kzs [data-drag]');if(!el||e.target.closest('.bk-acts'))return;pend={el:el,x:e.clientX,y:e.clientY}});
  document.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;if(DR){dragMove(e.clientX,e.clientY);return}
    if(pend&&Math.abs(e.clientX-pend.x)+Math.abs(e.clientY-pend.y)>6){var el=pend.el;pend=null;dragStart(el,e.clientX,e.clientY)}});
  document.addEventListener('pointerup',function(e){if(e.pointerType!=='mouse')return;pend=null;if(DR)dragEnd(e.clientX,e.clientY)});
  document.addEventListener('touchstart',function(e){if(e.touches.length!==1)return;var el=e.target.closest&&e.target.closest('#kzs [data-drag]');if(!el||e.target.closest('.bk-acts'))return;
    var t=e.touches[0];pend={el:el,x:t.clientX,y:t.clientY};el.classList.add('pressing');clearTimeout(timer);timer=setTimeout(function(){if(pend){var p=pend;pend=null;dragStart(p.el,p.x,p.y)}},300)},{passive:true});
  document.addEventListener('touchmove',function(e){var t=e.touches[0];if(DR){e.preventDefault();dragMove(t.clientX,t.clientY);return}
    if(pend&&Math.abs(t.clientX-pend.x)+Math.abs(t.clientY-pend.y)>8){pend.el.classList.remove('pressing');pend=null;clearTimeout(timer)}},{passive:false});
  document.addEventListener('touchend',function(e){clearTimeout(timer);if(pend)pend.el.classList.remove('pressing');pend=null;if(DR){e.preventDefault();var t=e.changedTouches[0];dragEnd(t.clientX,t.clientY)}},{passive:false});
  document.addEventListener('touchcancel',function(){clearTimeout(timer);pend=null;dragCancel()});
  document.addEventListener('click',function(e){if(DJUST&&e.target.closest&&e.target.closest('#kzs')){e.stopPropagation();e.preventDefault();DJUST=false}},true);
  document.addEventListener('contextmenu',function(e){if(e.target.closest&&e.target.closest('#kzs [data-drag]'))e.preventDefault()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&DR)dragCancel()});
})();
/* ---------- Move a party to the other sitting ---------- */
function crossMove(cf,code){var sr=$('sr');if(!cf||!sr)return;var p=cf.p,s2=cf.s2;
  if(p.arrived_at){toast(p.name+' has already arrived, so they stay in this sitting.');return}
  if(!cf.sp){toast('There is no room for '+p.name+' ('+p.size+') at '+s2.label+'. Try another sitting or grill.');return}
  var where=(cf.elsewhere?'Not enough room at '+tname(code)+'. Best spot: ':'')+'<b>'+esc(splitText(cf.sp))+'</b>';
  sr.innerHTML='<div class="scrim"></div><div class="dsheet" role="dialog" aria-modal="true" aria-label="Move to another sitting"><div class="dsh-h"><div><h2>Move '+esc(p.name)+' ('+p.size+') to '+esc(s2.label)+'?</h2><p class="small muted">From the '+esc(tl(p.session_time))+' sitting. Seats at '+esc(s2.label)+': '+where+'.</p></div></div>'+
    (p.email?'<p class="small" style="margin:0 0 12px">The guest has an email address. Let them know about the new time?</p>':'<p class="small" style="margin:0 0 12px">This guest has no email address, so call them about the new time.</p>')+
    '<div class="dsh-f" style="flex-wrap:wrap">'+(p.email?'<button class="btn primary" id="xm1">Move and email guest</button><button class="btn" id="xm2">Move, no email</button>':'<button class="btn primary" id="xm2">Move</button>')+'<button class="btn" id="xm0">Cancel</button></div></div>';
  sr.querySelector('.scrim').onclick=closeSearch;$('xm0').onclick=closeSearch;
  async function go(notify){sr.querySelectorAll('button').forEach(function(b){b.disabled=true});
    try{await call('staff_change_booking',{p_id:p.id,p_date:state.date,p_time:s2.session_time,p_adults:p.adults,p_children:p.children,p_force:false,p_notify:notify});
      try{await call('staff_seat',{p_id:p.id,p_split:cf.sp})}catch(e2){}
      closeSearch();state.sit=s2.session_time;toast(p.name+' is now at '+s2.label+', '+splitText(cf.sp)+(notify?'. We have emailed them the new time.':'. Please let them know the new time.'));await loadDay();loadNeeds()}
    catch(e){closeSearch();toast(errText(e))}}
  var b1=$('xm1');if(b1)b1.onclick=function(){go(true)};$('xm2').onclick=function(){go(false)}}
/* ---------- Walk-in: size, where it fits, seat ---------- */
/* retired 28 Oct 2026 (tidy): the old walk-in sheet; every Walk-in button opens New booking (window.kzWalkIn) */
function walkIn(){}
function bindSeat(el){
  el.querySelectorAll('[data-arr]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.arr.split('|');arrange(a[0],a[1]==='1')})});
  el.querySelectorAll('[data-step]').forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.step.split('|');stepSeat(a[0],+a[1])})});
  var x;if(x=$('seatsave'))x.onclick=saveSeat;if(x=$('seatchoose'))x.onclick=function(){state.seat.choose=true;state.seat.sp={};paintDay()};
  if(x=$('seatsug'))x.onclick=function(){var st=state.seat;st.choose=false;st.sp=Object.assign({},st.sug);paintDay()};
  if(x=$('planapply'))x.onclick=applyPlan;if(x=$('plancancel'))x.onclick=function(){state.plan=null;paintDay()};
  el.querySelectorAll('.tbk[data-party]').forEach(function(r){var id=r.dataset.party;r.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')el.querySelectorAll('.tbk[data-party="'+id+'"]').forEach(function(z){z.classList.add('hl')})});
    r.addEventListener('pointerleave',function(){el.querySelectorAll('.tbk.hl').forEach(function(z){z.classList.remove('hl')})})});
}

/* ---------- Calendar ---------- */
function setTests(v){state.tests=!!v;lsSet('kz_tests',v?'1':'0')}
function monday(d){var w=dow(d);return addDays(d,w===0?-6:1-w)}
function monthStart(d){return d.slice(0,8)+'01'}
function renderCalendar(){
  var c=state.cal;c.anchor=c.anchor||fijiToday();if(!c.picked){c.picked=true;if(window.innerWidth<600)c.view='agenda'}
  var title=c.view!=='week'?fmt(monthStart(c.anchor),{month:'long',year:'numeric'}):'Week of '+fmt(monday(c.anchor),{day:'numeric',month:'long'});
  main().innerHTML='<div class="calbar"><h1>'+esc(title)+'</h1><button class="icon-btn" id="cp" aria-label="Previous">'+I.left+'</button><button class="icon-btn" id="cn" aria-label="Next">'+I.right+'</button><button class="btn" id="ct">Today</button><span class="sp"></span>'+
    '<div class="seg" role="group" aria-label="Calendar view"><button data-v="agenda" class="'+(c.view==='agenda'?'on':'')+'">List</button><button data-v="month" class="'+(c.view==='month'?'on':'')+'">Month</button><button data-v="week" class="'+(c.view==='week'?'on':'')+'">Week</button></div></div>'+
    '<div class="legend"><span class="lg-h">How busy</span><span><i class="lv1"></i>Quiet</span><span><i class="lv2"></i>Steady</span><span><i class="lv3"></i>Busy</span><span><i class="lv4"></i>Nearly full</span><span class="lg-h">Day badges</span><span><span class="flag req">#</span> requests waiting</span><span><span class="flag uns">#</span> need a grill</span><span><span class="flag cls">Closed</span></span><span class="sp"></span><label class="check"><input type="checkbox" id="cx"'+(state.tests?' checked':'')+'>Show test bookings</label></div><div id="calnote"></div><div id="calg"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div>';
  $('cp').onclick=function(){c.anchor=c.view!=='week'?addMonths(c.anchor,-1):addDays(c.anchor,-7);renderCalendar()};
  $('cn').onclick=function(){c.anchor=c.view!=='week'?addMonths(c.anchor,1):addDays(c.anchor,7);renderCalendar()};
  $('ct').onclick=function(){c.anchor=fijiToday();renderCalendar()};
  main().querySelectorAll('.seg button').forEach(function(b){b.onclick=function(){c.view=b.dataset.v;renderCalendar()}});
  $('cx').onchange=function(){setTests(this.checked);loadCalendar()};
  loadCalendar();
}
function addMonths(d,n){var y=+d.slice(0,4),m=+d.slice(5,7)-1+n;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+'-'+String(m+1).padStart(2,'0')+'-01'}
/* Phase 1 (27 Oct 2026, audit E2): Teppanyaki guests per sitting come from the database (x.teps, one entry per open sitting),
   never from fixed 6:00 PM / 8:00 PM fields. Older replies (tep18/tep20 only) are still understood. */
function tepsOf(x){if(x&&Array.isArray(x.teps))return x.teps;var o=[];if(x&&(x.tep18!=null||x.tep20!=null)){o.push({time:'18:00',label:'6:00 PM',guests:x.tep18||0});o.push({time:'20:00',label:'8:00 PM',guests:x.tep20||0})}return o}
function tepTotal(x){return tepsOf(x).reduce(function(n,s){return n+(+s.guests||0)},0)}
function level(x){
  if(!x.guests)return 0;
  var ts=tepsOf(x),tc=Math.max(1,x.tep_cap),tl2=tepTotal(x)/Math.max(1,ts.length*x.tep_cap),dn=x.dinner/Math.max(1,x.dining_cap*2),ln=x.lunch/Math.max(1,x.dining_cap*1.5),l=Math.max.apply(null,[tl2,dn,ln].concat(ts.map(function(s){return (+s.guests||0)/tc})));
  return l<.35?1:l<.65?2:l<.9?3:4;
}
async function loadCalendar(){
  var c=state.cal,from,to;
  if(c.view!=='week'){from=monday(monthStart(c.anchor));to=addDays(from,41)}else{from=monday(c.anchor);to=addDays(from,6)}
  var el=$('calg');
  try{var res=await call('staff_calendar2',{p_from:from,p_to:to,p_tests:state.tests})}catch(e){el.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  if(state.tab!=='calendar'||!$('calg'))return;
  var rows=(res&&res.days)||[];rows.forEach(function(x){x.date=String(x.date).slice(0,10)});
  var inRange=rows.filter(function(x){return c.view!=='month'||x.date.slice(0,7)===monthStart(c.anchor).slice(0,7)}),tot=inRange.reduce(function(n,x){return n+x.guests},0),note=[];
  if(!tot)note.push('<b>Nothing booked '+(c.view!=='week'?'in '+esc(fmt(monthStart(c.anchor),{month:'long'})):'this week')+'.</b>'+(res.next_after?' The next booking is on '+esc(longDate(res.next_after))+'. <button class="btn sm" id="cgo">Go to '+esc(fmt(res.next_after,{day:'numeric',month:'long'}))+'</button>':''));
  if(0)note.push('<span class="muted">'+res.hidden_tests+' test '+(res.hidden_tests===1?'booking is':'bookings are')+' hidden. Tick “Show test bookings” to include '+(res.hidden_tests===1?'it':'them')+'.</span>');
  var ne=$('calnote');if(ne){ne.innerHTML=note.length?'<div class="calnote">'+note.join(' ')+'</div>':'';var g=$('cgo');if(g)g.onclick=function(){c.anchor=res.next_after;renderCalendar()}}
  var t=fijiToday(),mon=monthStart(c.anchor).slice(0,7);
  function flags(x){var f='';if(x.requests)f+='<span class="flag req" title="Requests waiting">'+x.requests+'</span>';if(x.unseated)f+='<span class="flag uns" title="Teppanyaki parties without a grill">'+x.unseated+'</span>';if(x.closures&&x.closures.length)f+='<span class="flag cls">Closed</span>';return f}
  if(c.view==='agenda'){var ad=inRange.filter(function(x){return x.guests||x.requests||x.unseated||(x.closures&&x.closures.length)||x.date===t});
    el.innerHTML=ad.length?'<div class="agenda">'+ad.map(function(x){var sv=[];if(x.lunch)sv.push('Lunch '+x.lunch);if(tepTotal(x))sv.push('Teppanyaki '+tepTotal(x));if(x.dinner)sv.push('Dinner '+x.dinner);if(x.events)sv.push(x.events===1?'1 event':x.events+' events');
      return '<button class="aday lv'+level(x)+(x.date===t?' today':'')+(x.date<t?' past':'')+'" data-day="'+x.date+'"><span class="ad-d"><b>'+esc(fmt(x.date,{weekday:'short'}))+'</b><span>'+esc(fmt(x.date,{day:'numeric',month:'short'}))+'</span></span><span class="ad-m"><b>'+x.guests+' guests</b><span>'+esc(sv.join(' · ')||'Nothing booked')+'</span></span><span class="flags">'+flags(x)+'</span></button>'}).join('')+'</div>':'';
  }else if(c.view==='month'){
    el.innerHTML='<div class="month">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d){return '<div class="dow">'+d+'</div>'}).join('')+rows.map(function(x){var lv=level(x);
      return '<button class="cday lv'+lv+(x.date.slice(0,7)!==mon?' out':'')+(x.date===t?' today':'')+(x.date<t?' past':'')+'" data-day="'+x.date+'" aria-label="'+esc(longDate(x.date)+', '+x.guests+' guests')+'"><span class="dn">'+(+x.date.slice(8))+'</span>'+
        (x.guests?'<span class="gt">'+x.guests+'<small>guests</small></span><span class="lines">'+(x.lunch?'Lunch '+x.lunch+'<br>':'')+(tepTotal(x)?'Teppanyaki '+tepTotal(x)+'<br>':'')+(x.dinner?'Dinner '+x.dinner+'<br>':'')+(x.events?(x.events===1?'1 event':x.events+' events'):'')+'</span>':'')+
        '<span class="flags">'+flags(x)+'</span></button>'}).join('')+'</div>';
  }else{
    el.innerHTML='<div class="week">'+rows.map(function(x){
      function bar(lbl,v,cap){var p=cap?Math.min(100,Math.round(v/cap*100)):0;return '<div class="wsvc"><div class="lbl"><span>'+lbl+'</span><b>'+v+(cap?' / '+cap:'')+'</b></div>'+(cap?'<div class="bar"><i class="'+(p>=90?'full':'')+'" style="width:'+p+'%"></i></div>':'')+'</div>'}
      return '<button class="wday'+(x.date===t?' today':'')+'" data-day="'+x.date+'"><span class="dn">'+esc(fmt(x.date,{weekday:'long',day:'numeric',month:'short'}))+'</span><span class="gt" style="font-size:22px;font-weight:600">'+x.guests+' <span class="small muted" style="font-weight:500">guests</span></span>'+
        bar('Lunch',x.lunch,Math.round(x.dining_cap*1.5))+(tepsOf(x).length?'<div class="wsvc-h">Teppanyaki</div>':'')+tepsOf(x).map(function(s){return bar(String(s.label||tl(s.time)),+s.guests||0,x.tep_cap)}).join('')+bar('Dinner',x.dinner,x.dining_cap*2)+(x.events?bar('Events',x.events,0):'')+
        '<span class="flags" style="display:flex;gap:4px;flex-wrap:wrap">'+flags(x)+(x.allergies?'<span class="tag allergy">'+x.allergies+' with allergies</span>':'')+'</span>'+
        (x.closures&&x.closures.length?'<span class="small" style="color:var(--red)">'+x.closures.map(function(k){return esc((k.scope==='teppanyaki'?'Teppanyaki':k.scope==='all'?'Restaurant':'Dining room')+' '+(k.part==='all'?'':k.part)+': '+k.reason)}).join('<br>')+'</span>':'')+'</button>'}).join('')+'</div>';
  }
  var byDate={};rows.forEach(function(x){byDate[x.date]=x});
  el.querySelectorAll('[data-day]').forEach(function(b){b.onclick=function(){dayCard(byDate[b.dataset.day]||{date:b.dataset.day})}});
}
function closedFor(x,r){var cs=x.closures||[],hit=null;cs.forEach(function(c){if(hit)return;var p=c.part||'all';
  if(c.scope==='all'&&(p==='all'||p===r.period))hit=c;else if(c.scope==='teppanyaki'&&r.svc==='teppanyaki'&&(p==='all'||p===r.time))hit=c;else if(c.scope==='dining'&&r.svc==='dining'&&(p==='all'||p===r.period))hit=c});return hit}
function dayCard(x){var s=$('sr');if(!s||!x)return;var t=fijiToday(),past=x.date<t,cap=x.tep_cap||0;
  function tep(n){var f=Math.max(0,cap-n);return cap?(f?f+' seats free':'Full')+' <span class="muted">('+n+' of '+cap+' booked)</span>':n+' guests'}
  var rs=[{svc:'dining',label:'Lunch',period:'lunch',time:null,val:(x.lunch||0)+' guests booked'}].concat(tepsOf(x).map(function(s){var g=+s.guests||0;return {svc:'teppanyaki',label:'Teppanyaki '+(s.label||tl(s.time)),period:'dinner',time:s.time,val:tep(g),full:cap&&g>=cap}}),[
    {svc:'dining',label:'Dinner',period:'dinner',time:null,val:(x.dinner||0)+' guests booked'},
    {svc:'event',label:'Group or event',period:'all',time:null,val:x.events?(x.events===1?'1 event':x.events+' events'):'None booked'}]);
  var fl=[];if(x.requests)fl.push(x.requests+(x.requests===1?' request waiting':' requests waiting'));if(x.unseated)fl.push(x.unseated+' Teppanyaki '+(x.unseated===1?'party needs':'parties need')+' a grill');if(x.allergies)fl.push(x.allergies+(x.allergies===1?' booking':' bookings')+' with allergies');
  var h='<div class="scrim"></div><div class="dsheet" role="dialog" aria-modal="true" aria-label="'+esc(longDate(x.date))+'"><div class="dsh-h"><div><h2>'+esc(longDate(x.date))+'</h2><p class="small muted">'+(x.guests||0)+' guests booked'+(fl.length?'. '+esc(fl.join(', ')):'')+'</p></div><button class="btn sm" id="dcx">Close</button></div>';
  if(past)h+='<p class="msg info" style="margin:0 0 10px">This day has passed. Open the day to see who came.</p>';
  h+='<div class="drows">'+rs.map(function(r,i){var c=closedFor(x,r);return '<div class="drow'+(c?' is-closed':'')+'"><div class="dl"><b>'+esc(r.label)+'</b><span>'+(c?'Closed: '+esc(c.reason||''):r.val)+'</span></div>'+(past||c?'':'<button class="btn sm'+(r.full?'':' primary')+'" data-add="'+i+'"'+(r.full?' title="Full. You can still add a booking if you have made room."':'')+'>Add</button>')+'</div>'}).join('')+'</div>';
  h+='<div class="dsh-f"><button class="btn" id="dco">Open day</button></div></div>';
  s.innerHTML=h;s.querySelector('.scrim').onclick=closeSearch;$('dcx').onclick=closeSearch;
  $('dco').onclick=function(){closeSearch();state.date=x.date;state.seat=null;go('today')};
  s.querySelectorAll('[data-add]').forEach(function(b){b.onclick=function(){var r=rs[+b.dataset.add];closeSearch();state.newPre={date:x.date,svc:r.svc,time:r.time,period:r.period};go('new')}});
  var a=s.querySelector('[data-add].primary')||$('dco');if(a)a.focus({preventScroll:true});
}

/* ---------- Bookings ---------- */
function defaultFilter(){var t=fijiToday();return {mode:'upcoming',svc:'',q:'',from:t,to:addDays(t,60)}}
var MODES=[['upcoming','Upcoming'],['requests','Requests'],['today','Today'],['past','Past 30 days'],['cancelled','Cancelled'],['unmarked','Arrival not recorded']];
function renderBookings(){
  var f=state.lf=state.lf||defaultFilter();
  main().innerHTML='<div class="row" style="margin:0 0 14px"><h1>Bookings</h1></div><div class="row" style="margin:0 0 12px"><div class="search">'+I.search+'<input id="bq" type="search" placeholder="Search by name, phone or booking reference" value="'+esc(f.q)+'" aria-label="Search bookings"></div></div>'+
    '<div class="row" style="margin:0 0 10px"><div class="chips" id="bm" role="group" aria-label="Booking list view">'+MODES.map(function(m){return '<button class="chip'+(f.mode===m[0]?' on':'')+'" data-m="'+m[0]+'" aria-pressed="'+(f.mode===m[0])+'">'+m[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="row" style="margin:0 0 16px"><div class="seg" id="bs" role="group" aria-label="Filter by service">'+[['','All services'],['teppanyaki','Teppanyaki'],['dining','Lunch and dinner'],['event','Events']].map(function(s){return '<button data-s="'+s[0]+'" class="'+(f.svc===s[0]?'on':'')+'" aria-pressed="'+(f.svc===s[0])+'">'+s[1]+'</button>'}).join('')+'</div><span class="sp"></span><label class="check small"><input type="checkbox" id="bx"'+(state.tests?' checked':'')+'>Show test bookings</label></div><div id="bl"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div>';
  var tmr=null;$('bq').addEventListener('input',function(){clearTimeout(tmr);var v=this.value;tmr=setTimeout(function(){f.q=v.trim();loadList()},300)});
  main().querySelectorAll('#bm .chip').forEach(function(b){b.onclick=function(){f.mode=b.dataset.m;f.q='';renderBookings()}});
  main().querySelectorAll('#bs button').forEach(function(b){b.onclick=function(){f.svc=b.dataset.s;main().querySelectorAll('#bs button').forEach(function(x){x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});loadList()}});
  $('bx').onchange=function(){setTests(this.checked);loadList()};
  loadList();
}
async function loadList(){
  var f=state.lf,el=$('bl'),t=fijiToday();if(!el)return;
  var from=t,to=addDays(t,120),st='active';
  if(f.mode==='today'){from=to=t}else if(f.mode==='past'){from=addDays(t,-30);to=addDays(t,-1);st=null}else if(f.mode==='cancelled'){from=addDays(t,-30);to=addDays(t,180);st=null}
  else if(f.mode==='requests'){st=null}else if(f.mode==='unmarked'){from=addDays(t,-7);to=addDays(t,-1);st='confirmed'}
  try{var rows=await call('staff_list_bookings',{p_from:from,p_to:to,p_query:f.q||null,p_status:st})}catch(e){el.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  if(!state.tests)rows=rows.filter(function(r){return !r.is_test});
  if(f.svc)rows=rows.filter(function(r){return (r.service||'teppanyaki')===f.svc});
  if(!f.q){
    if(f.mode==='requests')rows=rows.filter(function(r){return r.status==='pending'||r.status==='pending_large_group'});
    if(f.mode==='cancelled')rows=rows.filter(function(r){return r.status==='cancelled'||r.status==='declined'});
    if(f.mode==='unmarked')rows=rows.filter(function(r){return !r.arrived_at});
    if(f.mode==='past')rows.reverse();
  }
  if(!rows.length){var empty=f.q?'No bookings match “'+esc(f.q)+'”.':{upcoming:'No upcoming bookings.',requests:'No requests waiting.',today:'No bookings today.',past:'No bookings in the past 30 days.',cancelled:'No cancelled bookings in this period.',unmarked:'No past bookings awaiting an arrival update.'}[f.mode]||'No bookings in this view.';
    if(f.svc&&!f.q)empty='No matching bookings for this service. Choose All services to see the other bookings.';
    var eb=f.q?'<button type="button" class="btn" data-kz135="clear">Clear search</button>'+(f.mode!=='past'?'<button type="button" class="btn" data-kz135="past">Look in the past 30 days</button>':''):(f.svc?'<button type="button" class="btn" data-kz135="all">All services</button>':'');
    el.innerHTML='<div class="panel kz135-empty"><span class="kz135-ei" aria-hidden="true"></span><p>'+empty+'</p>'+(f.q?'<p class="small muted">Try part of the name, or the phone number.</p>':'')+(eb?'<div class="row">'+eb+'</div>':'')+'</div>';
    el.querySelectorAll('[data-kz135]').forEach(function(b){b.onclick=function(){var k=b.dataset.kz135,q=$('bq');if(k==='clear'&&q){q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}else if(k==='past'){var m=document.querySelector('#bm [data-m="past"]');if(m)m.click()}else if(k==='all'){var a=document.querySelector('#bs [data-s=""]');if(a)a.click()}}});return}
  var guests=sum(rows),last='',h='<p class="small muted" role="status" aria-live="polite" style="margin:0 0 8px">Showing '+rows.length+' '+(rows.length===1?'booking':'bookings')+' · '+guests+' '+(guests===1?'guest':'guests')+'</p><div class="list"><div class="lrow head"><span class="c-date">Time</span><span class="c-time">Service</span><span>Guest</span><span class="c-size">Guests</span><span class="c-seat">Seating</span><span>Status</span></div>';
  rows.forEach(function(r){
    if(r.date!==last){last=r.date;h+='<div class="lgroup">'+esc(longDate(r.date))+'</div>'}
    var tags=(r.allergens&&r.allergens.length?' <span class="tag allergy">'+esc(r.allergens.join(', '))+'</span>':'')+(r.is_test?' <span class="tag test">Test</span>':'');
    var req=(r.status==='pending'||r.status==='pending_large_group')?Math.floor((Date.now()-new Date(r.created_at).getTime())/3600000):-1;
    h+='<button class="lrow" data-id="'+r.id+'"><span class="c-date">'+esc(tl(r.session_time))+'</span><span class="c-time">'+esc(svcName(r))+'</span><span><span class="nm">'+esc(r.name)+'</span>'+tags+'<div class="sub">'+esc(r.phone)+' · <span class="nw">'+esc(r.reference)+'</span>'+(req>=0?' · <span style="color:'+(req>=24?'var(--red)':'var(--amber)')+'">waiting '+(req<1?'under an hour':req+(req===1?' hour':' hours'))+'</span>':'')+'</div></span><span class="c-size"><b>'+r.size+'</b></span><span class="c-seat sub">'+esc(r.tables&&r.tables.length?tnames(r.tables):PREF[r.seating_pref]||'')+'</span><span>'+pill(r)+'</span></button>';
  });
  el.innerHTML=h+'</div>';restoreY();
  el.querySelectorAll('.lrow[data-id]').forEach(function(b){b.onclick=function(){openBooking(b.dataset.id)}});
}

/* ---------- Booking drawer ---------- */
async function openBooking(id,msg,kind){
  state.openId=id;var dr=$('dr');if(!drawerOpen())hpush({kz:1,tab:state.tab,view:state.view,modal:'dr'});if(!drawerOpen())dr.innerHTML='<div class="scrim"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="Booking"><div class="dbody"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div>';
  dr.querySelector('.scrim').onclick=closeDrawer;
  try{var res=await Promise.all([call('staff_get_booking',{p_id:id}),call('staff_booking_history',{p_id:id}).catch(function(){return []})]);drawer(res[0],res[1],msg,kind)}
  catch(e){dr.querySelector('.drawer').innerHTML='<div class="dbody"><div class="msg err">'+esc(errText(e))+'</div><button class="btn" id="dx">Close</button></div>';$('dx').onclick=closeDrawer}
}
function closeDrawer(){state.openId=null;$('dr').innerHTML='';if(history.state&&history.state.modal==='dr')hback();refreshCurrent()}
function sheetSwipe(){var d=document.querySelector('#dr .drawer'),h=d&&d.querySelector('.dhead');if(!h||window.innerWidth>900)return;var y0=null,dy=0;
  h.addEventListener('touchstart',function(e){y0=e.touches[0].clientY;dy=0;d.style.transition='none'},{passive:true});
  h.addEventListener('touchmove',function(e){if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);d.style.transform='translateY('+dy+'px)'},{passive:true});
  h.addEventListener('touchend',function(){if(y0==null)return;y0=null;d.style.transition='transform .18s ease-out';if(dy>110)closeDrawer();else d.style.transform=''})}
/* ---------- search everything ---------- */
function searchOpen(){return !!($('sr')&&$('sr').innerHTML)}
function closeSearch(){var s=$('sr');if(s)s.innerHTML='';if(HS.sr){HS.sr=0;if(history.state&&history.state.modal==='sr')hback()}}
function openSearch(){var s=$('sr');if(!s)return;if(!HS.sr){HS.sr=1;hpush({kz:1,tab:state.tab,view:state.view,modal:'sr'})}
  s.innerHTML='<div class="scrim"></div><div class="sbox" role="dialog" aria-modal="true" aria-label="Find a booking"><div class="sbar">'+I.search+'<input id="sq" type="search" placeholder="Name, phone, email or reference" autocomplete="off" aria-label="Search all bookings"><button class="btn sm" id="sx">Close</button></div><div class="sres" id="sres"><p class="shint">Finds any booking, past or upcoming.</p></div></div>';
  s.querySelector('.scrim').onclick=closeSearch;$('sx').onclick=closeSearch;var q=$('sq'),tm=null,seq=0;q.focus();
  q.addEventListener('input',function(){clearTimeout(tm);var v=q.value.trim();if(v.length<2){$('sres').innerHTML='<p class="shint">Type at least 2 letters or numbers.</p>';return}tm=setTimeout(function(){runSearch(v,++seq)},250)});
  async function runSearch(v,n){var el=$('sres');if(!el)return;el.innerHTML='<p class="shint">Searching…</p>';var t=fijiToday();
    try{var rows=await call('staff_list_bookings',{p_from:t,p_to:t,p_query:v,p_status:null})}catch(e){if(n===seq&&$('sres'))$('sres').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
    if(n!==seq||!$('sres'))return;if(!state.tests)rows=rows.filter(function(r){return !r.is_test});
    var up=rows.filter(function(r){return r.date>=t}),past=rows.filter(function(r){return r.date<t}).reverse();
    function row(r){return '<button class="srow" data-sid="'+r.id+'"><span class="sname"><b>'+esc(r.name)+'</b> <span class="muted">('+r.size+')</span></span>'+pill(r)+'<span class="ssub">'+esc(shortDate(r.date)+', '+tl(r.session_time)+', '+svcName(r)+' · '+r.reference+' · '+(r.phone||''))+'</span></button>'}
    var h=!rows.length?'<p class="shint">Nothing matches “'+esc(v)+'”. Check the spelling, or try the phone number.</p>':'';
    if(up.length)h+='<h3 class="sgrp">Upcoming</h3>'+up.slice(0,25).map(row).join('');
    if(past.length)h+='<h3 class="sgrp">Past</h3>'+past.slice(0,25).map(row).join('');
    if(up.length>25||past.length>25)h+='<p class="shint">Showing the first 25 in each group. Type more to narrow it down.</p>';
    $('sres').innerHTML=h;$('sres').querySelectorAll('[data-sid]').forEach(function(b){b.onclick=function(){closeSearch();openBooking(b.dataset.sid)}});
  }
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(searchOpen())closeSearch();else if(drawerOpen())closeDrawer();return}
  if(e.key==='/'&&me&&$('sr')&&!searchOpen()&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')){e.preventDefault();openSearch()}});
function refreshCurrent(){if(state.tab==='today')loadDay();else if(state.tab==='bookings')loadList();else if(state.tab==='calendar')loadCalendar();loadNeeds()}
function drawer(b,hist,msg,kind){
  var dr=$('dr'),tep=(b.service||'teppanyaki')==='teppanyaki',ev=b.service==='event',active=b.status==='pending'||b.status==='pending_large_group'||b.status==='confirmed';
  var acts=[];
  if(b.status==='pending'||b.status==='pending_large_group'){acts.push(['confirm','Confirm','go']);acts.push(['decline','Decline','danger'])}
  if(b.status==='confirmed'&&!b.arrived_at){acts.push(['arrived','Arrived','go']);acts.push(['no_show','No-show',''])}
  if(b.status==='confirmed'&&b.arrived_at){acts.push(['completed','Completed','primary']);acts.push(['undo_arrived','Undo arrival',''])}
  if(b.status==='no_show'||b.status==='completed')acts.push(['reopen','Reopen','']);
  var seated=(b.tables||[]).length,live=b.status!=='cancelled'&&b.status!=='declined',canChg=active&&!b.arrived_at;
  var h='<div class="dhead"><div class="row"><h2>'+esc(b.name)+' <span class="muted" style="font-weight:500">('+b.size+')</span></h2><span class="sp"></span><button class="btn sm" id="dx">Close</button></div><div class="row" style="margin-top:8px">'+pill(b)+'<span class="small muted">'+esc(svcName(b))+', '+esc(shortDate(b.date))+', '+esc(tl(b.session_time))+'</span>'+(b.is_test?'<span class="tag test">Test</span>':'')+(b.vip?'<span class="tag vip">VIP</span>':'')+(b.no_shows?'<span class="tag allergy">'+b.no_shows+' no-show'+(b.no_shows===1?'':'s')+' before</span>':'')+'</div></div><div class="dbody">';
  if(msg)h+='<div class="msg '+(kind||'ok')+'">'+esc(msg)+'</div>';
  var pastA=(b.past_allergens||[]).filter(function(a){return (b.allergens||[]).indexOf(a)<0});
  if(b.allergens&&b.allergens.length)h+='<div class="algbox"><b>Allergies</b>'+esc(b.allergens.join(', '))+(b.diet_prefs&&b.diet_prefs.length?'<div style="margin-top:4px;font-size:14px">Dietary: '+esc(b.diet_prefs.join(', '))+'</div>':'')+(clean(b.dietary)?'<div style="margin-top:4px;font-size:14px">'+esc(clean(b.dietary))+'</div>':'')+(pastA.length?'<div class="alg-past">Also noted on an earlier booking: '+esc(pastA.join(', '))+'. Check with the guest.</div>':'')+'</div>';
  else if((b.diet_prefs&&b.diet_prefs.length)||clean(b.dietary))h+='<div class="dietbox"><b>Dietary needs</b>'+esc([].concat(b.diet_prefs||[],clean(b.dietary)?[clean(b.dietary)]:[]).join(', '))+(pastA.length?'<div class="alg-past">Allergy noted on an earlier booking: '+esc(pastA.join(', '))+'. Check with the guest.</div>':'')+'</div>';
  else if(pastA.length)h+='<div class="dietbox"><b>Check allergies</b>Noted on an earlier booking: '+esc(pastA.join(', '))+'. Ask the guest if it still applies.</div>';
  if(isCel(b)||needsText(b)||b.guest_note||b.requests||b.staff_notes)h+='<div class="infobox">'+(isCel(b)?'<div><b>Celebration</b>'+esc(celText(b))+'</div>':'')+(needsText(b)?'<div><b>Seating needs</b>'+esc(needsText(b))+'</div>':'')+(b.requests?'<div><b>'+(ev?'Event details':'Guest requests')+'</b>'+esc(b.requests)+'</div>':'')+(b.guest_note?'<div><b>Guest note</b>'+esc(b.guest_note)+'</div>':'')+(b.staff_notes?'<div><b>Staff notes</b>'+esc(b.staff_notes)+'</div>':'')+'</div>';
  /* key facts: three tiles */
  var guests=b.children?b.adults+(b.adults===1?' adult, ':' adults, ')+b.children+(b.children===1?' child':' children'):'';
  var place=tep?(live?'<button class="fact fact-btn'+(seated?'':' fact-warn')+'" id="em"><span>Grill</span><b>'+esc(seated?(b.split?splitText(b.split):tnames(b.tables)):'Not seated')+'</b><small>'+(seated?'Change':'Seat')+'</small></button>':'<div class="fact"><span>Grill</span><b>None</b></div>')
    :b.service==='dining'&&alcOn()&&live?'<button class="fact fact-btn'+((b.tables||[]).length?'':' fact-warn')+'" id="eat"><span>'+((b.tables||[]).length&&alcArea(b)!=='dining_room'?'Counter':'Table')+'</span><b>'+esc((b.tables||[]).length?alcNames(b.tables):'Not seated yet')+'</b><small>'+((b.tables||[]).length?'Tap to move':'Tap to seat')+'</small></button>'
    :b.service==='dining'?'<div class="fact"><span>Seating</span><b>'+esc(PREF[b.seating_pref]||'No preference')+'</b></div>'
    :'<div class="fact"><span>'+(ev?'Type of event':'Occasion')+'</span><b>'+esc(b.occasion||'Not given')+'</b></div>';
  h+='<div class="dfacts"><div class="fact"><span>Guests</span><b>'+b.size+'</b>'+(guests?'<small>'+esc(guests)+'</small>':'')+'</div>'+place+
    '<a class="fact fact-btn fact-call" href="tel:'+esc(b.phone)+'"><span>Phone</span><b>'+esc(b.phone)+'</b><small>Call</small></a></div>';
  if(acts.length)h+='<div class="bigacts">'+acts.map(function(a){return '<button class="btn '+a[2]+'" data-act="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div>';
  h+='<div id="ask"></div>';
  if(b.decline_reason)h+='<div class="dietbox"><b>Decline reason</b>'+esc(b.decline_reason)+'</div>';
  /* everything else: folded until asked for */
  function fold(id,title,hint,body,open){return '<details class="fold" id="'+id+'"'+(open?' open':'')+'><summary><span class="fold-t">'+title+'</span><span class="fold-h">'+esc(hint)+'</span></summary><div class="fold-b">'+body+'</div></details>'}
  if(canChg||(tep&&seated&&live)){var cb='';
    if(canChg)cb+='<div class="row"><button class="btn sm" id="chg">Change date, time or guests</button></div><div id="chgbox"></div>';
    if(tep&&seated&&live)cb+='<div class="row" style="margin-top:10px"><button class="btn sm" id="ec">Clear grill</button><button class="btn sm" id="epin">'+(b.pinned?'Unpin':'Pin here')+'</button></div>'+(b.pinned?'<p class="small muted" style="margin:8px 0 0">Pinned: Tidy up grills leaves this party where it is.</p>':'');
    if(canChg)cb+='<p style="margin:14px 0 0"><button class="link danger-link" data-act="cancel" style="color:var(--red)">Cancel this booking</button></p>';
    h+=fold('fchg','Change or cancel',canChg?'Date, time, guests'+(tep&&seated?', grill':''):'Grill',cb)}
  var visits=b.visits?b.visits+(b.visits===1?' past visit':' past visits'):'First visit';
  h+=fold('fguest','Guest',visits,'<dl class="kv"><dt>Email</dt><dd>'+(b.email?'<a href="mailto:'+esc(b.email)+'">'+esc(b.email)+'</a>':'None')+'</dd>'+kzOriginRow(b)+
    '<dt>Booked</dt><dd>'+esc(stamp(b.created_at))+', '+(b.source==='website'?'online':b.source==='walk_in'?'walk-in':'by phone')+'</dd>'+
    '<dt>Reference</dt><dd>'+esc(b.reference)+'</dd>'+
    '<dt>Visits</dt><dd>'+visits+(b.last_visit?', last on '+esc(shortDate(b.last_visit)):'')+(b.no_shows?' <span class="tag allergy">'+b.no_shows+' no-show'+(b.no_shows===1?'':'s')+'</span>':'')+'</dd>'+
    (b.occasion&&!ev&&!isCel(b)?'<dt>Occasion</dt><dd>'+esc(b.occasion)+'</dd>':'')+'</dl>'+
    '<details class="past" id="gnd"><summary>Lasting guest note and VIP</summary><div class="gnote" id="gnote"><p class="small muted" style="margin:0">Shows on every future booking for this guest.</p>'+
    '<textarea id="gn" maxlength="500" placeholder="For example: prefers the corner seat at Ume, celebrates every March">'+esc(b.guest_note||'')+'</textarea><div class="row"><label class="check"><input type="checkbox" id="gv"'+(b.vip?' checked':'')+'>VIP guest</label><span class="sp"></span><button class="btn sm" id="gs">Save guest note</button></div></div></details>'+
    '<details class="past" id="past"><summary>Other bookings by this guest</summary><div id="pastl" class="small muted">Loading…</div></details>');
  h+='<details class="fold" id="fedit"><summary><span class="fold-t">Edit details</span><span class="fold-h">Allergies, celebration, notes</span></summary><div class="fold-b"><div class="grid2"><label class="f">Phone<input id="ep" value="'+esc(b.phone)+'"></label><label class="f">'+(ev?'Type of event':'Occasion')+'<select id="eo"><option value="">None</option>'+(ev?EVENT_TYPES:OCCASIONS).map(function(o){return '<option'+(b.occasion===o?' selected':'')+'>'+o+'</option>'}).join('')+(b.occasion&&(ev?EVENT_TYPES:OCCASIONS).indexOf(b.occasion)<0?'<option selected>'+esc(b.occasion)+'</option>':'')+'</select></label>'+
    '<div class="f full">Allergies<div class="chips" id="ea">'+ALLERGENS.map(function(a){return '<label class="chip"><input type="checkbox" value="'+a+'"'+((b.allergens||[]).indexOf(a)>=0?' checked':'')+'>'+a+'</label>'}).join('')+'</div></div>'+
    '<div class="f full">Dietary needs'+chipsHtml('edp',DIETS,b.diet_prefs)+'</div>'+
    '<label class="f full">Allergy or dietary details<input id="ed" value="'+esc(b.dietary||'')+'"></label>'+
    (ev?'':'<label class="f">Who is celebrating<input id="ecel" maxlength="80" value="'+esc(b.celebrant||'')+'"></label><label class="f">Dessert plate message<input id="epl" maxlength="60" value="'+esc(b.plate_message||'')+'"></label>'+
    '<label class="check full"><input type="checkbox" id="eck"'+(b.own_cake?' checked':'')+'>Guest is bringing their own cake</label>'+
    '<label class="f">High chairs<select id="ehc">'+[0,1,2,3,4,5,6].filter(function(n){return n<=Math.max(b.children||0,b.high_chairs||0)}).map(function(n){return '<option value="'+n+'"'+((b.high_chairs||0)===n?' selected':'')+'>'+(n?n:'None')+'</option>'}).join('')+'</select></label>'+
    '<label class="check" style="align-self:end;min-height:44px;align-items:center"><input type="checkbox" id="ewc"'+(b.wheelchair?' checked':'')+'>Wheelchair access</label>')+
    '<div class="f full" id="eorig"></div><label class="f full">Staff notes <small>Only the team sees these.</small><textarea id="en">'+esc(b.staff_notes||'')+'</textarea></label></div><div class="row" style="margin-top:12px"><button class="btn primary sm" id="es">Save details</button></div><div id="esmsg" role="status"></div></div></details>';
  var hl=hist&&hist.length?hist.length+(hist.length===1?' entry':' entries')+', last: '+hist[hist.length-1].action:'None yet';
  h+='<details class="fold" id="fhist"><summary><span class="fold-t">History</span><span class="fold-h">'+esc(hl)+'</span></summary><div class="fold-b">'+(hist&&hist.length?'<ul class="timeline">'+hist.map(function(x){var act=x.action;if(x.type==='email'&&x.detail){if(/^Sending/.test(x.detail))act=act.replace(/\bsent\b/,'queued');else if(/^Failed/.test(x.detail))act=act.replace(/\bsent\b/,'not delivered')}return '<li class="'+(x.type==='email'?'email':'')+(x.type==='email'&&/^Failed/.test(x.detail||'')?' failed':'')+'"><div><b>'+esc(act)+'</b>'+(x.detail?' <span class="muted">'+esc(x.detail==='Sending'?'Sending now':x.detail)+'</span>':'')+'</div><div class="when">'+esc(stamp(x.at))+(x.actor&&x.actor!=='Email'?', '+esc(x.actor):'')+'</div></li>'}).join('')+'</ul>':'<p class="muted small">No history yet.</p>')+'</div></details></div>';
  dr.innerHTML='<div class="scrim"></div><div class="drawer" role="dialog" aria-modal="true" aria-label="Booking for '+esc(b.name)+'">'+h+'</div>';
  dr.querySelector('.scrim').onclick=closeDrawer;$('dx').onclick=closeDrawer;sheetSwipe();
  dr.querySelectorAll('[data-act]').forEach(function(x){x.addEventListener('click',function(){act(b,x.dataset.act)})});
  var c=$('chg');if(c)c.onclick=function(){changeEditor(b)};
  var eo0=kzOriginOf(b),eoc=kzOriginMount($('eorig'),{value:eo0,small:true,onChange:function(){KZDS.fedit=1}});
  /* v49: a failed save keeps everything typed on screen, says what did and did not save, and offers Try again */
  $('es').onclick=async function(){var btn=this,msg=$('esmsg'),step=0;btn.disabled=true;btn.textContent='Saving…';msg.innerHTML='';var al=[].slice.call(dr.querySelectorAll('#ea input:checked')).map(function(x){return x.value});
    try{await call('staff_update_booking',{p_id:b.id,p_staff_notes:$('en').value,p_occasion:$('eo').value,p_dietary:$('ed').value,p_allergens:al,p_phone:$('ep').value});step=1;
      var x={diet_prefs:checked('#edp')};if(eoc.value&&eoc.value!==eo0)x.location=eoc.value;if($('ecel')){x.celebrant=$('ecel').value;x.plate_message=$('epl').value;x.own_cake=$('eck').checked;x.high_chairs=+$('ehc').value||0;x.wheelchair=$('ewc').checked}
      await call('staff_set_extras',{p_id:b.id,p_extras:x});openBooking(b.id,'Details saved.')}
    catch(e){btn.disabled=false;btn.textContent='Try again';
      msg.innerHTML='<div class="msg err">'+(step?'Phone, allergies, occasion and notes were saved. Dietary needs, celebration, seating needs and where the guest is from did not save. ':'Nothing was saved. ')+esc(errText(e))+' Your changes are still here.</div>'}};
  $('gs').onclick=async function(){var btn=this;btn.disabled=true;btn.textContent='Saving…';var m=$('gsmsg');if(!m){m=document.createElement('div');m.id='gsmsg';m.setAttribute('role','status');btn.closest('.row').after(m)}m.innerHTML='';
    try{await call('staff_set_guest',{p_id:b.id,p_note:$('gn').value,p_vip:$('gv').checked});openBooking(b.id,'Guest note saved. It will show on this guest’s future bookings.')}
    catch(e){btn.disabled=false;btn.textContent='Try again';m.innerHTML='<div class="msg err">Nothing was saved. '+esc(errText(e))+' Your note is still here.</div>'}};
  $('past').addEventListener('toggle',async function(){if(!this.open||this.dataset.done)return;this.dataset.done='1';var el=$('pastl');
    try{var rows=await call('staff_guest_bookings',{p_id:b.id});el.className='';el.innerHTML=rows.length?'<ul class="plist">'+rows.map(function(r){return '<li><button class="link" data-past="'+r.id+'">'+esc(shortDate(r.date)+', '+svcName(r)+' '+tl(r.session_time)+', '+r.size+' guests')+'</button> '+pill(r)+(r.occasion?' <span class="tag occ">'+esc(r.occasion)+'</span>':'')+'</li>'}).join('')+'</ul>':'<p class="small muted">No other bookings found for this phone number or email.</p>';
      el.querySelectorAll('[data-past]').forEach(function(x){x.onclick=function(){openBooking(x.dataset.past)}})}catch(e){el.textContent=errText(e)}});
  var eat=$('eat');if(eat)eat.onclick=function(){state.openId=null;$('dr').innerHTML='';if(history.state&&history.state.modal==='dr')hback();lsSet('kz_view','floor');go('today',{date:b.date,view:'floor',aseat:b.id,seat:null,plan:null});setTimeout(function(){var s=document.querySelector('.alc-seatbar');if(s)s.scrollIntoView({block:'center'})},600)};
  var em=$('em');if(em)em.onclick=function(){state.openId=null;$('dr').innerHTML='';if(history.state&&history.state.modal==='dr')hback();lsSet('kz_view','floor');go('today',{date:b.date,view:'floor',pendingSeat:b.id,seat:null,plan:null})};
  var ec=$('ec');if(ec)ec.onclick=async function(){var prev=b.split&&Object.keys(b.split).length?b.split:null;ec.disabled=true;try{await call('staff_seat',{p_id:b.id,p_split:null});openBooking(b.id,'Grill cleared. '+esc(b.name)+' now needs a grill.');if(prev)toast(b.name+' now needs a grill.',async function(){try{await call('staff_seat_plan',{p_items:[{id:b.id,split:prev,pin:!!b.pinned}]});toast('Undone. '+b.name+' is back at '+splitText(prev)+'.');if(drawerOpen()&&state.openId===b.id)openBooking(b.id);else refreshCurrent()}catch(e){toast(errText(e))}})}catch(e){openBooking(b.id,errText(e),'err')}};
  var ep=$('epin');if(ep)ep.onclick=async function(){try{await call('staff_pin',{p_id:b.id,p_pin:!b.pinned});openBooking(b.id,b.pinned?'Unpinned. Tidy up grills may move this party.':'Pinned. Tidy up grills will leave this party where it is.')}catch(e){openBooking(b.id,errText(e),'err')}};
}
/* 26 Oct 2026: cancel reasons staff can tap (same approach as the Corner Café cake app). Saved with the booking for reports.
   Worded so the guest can read them in the cancellation email. false = do not email the guest by default. */
var CANCEL_REASONS=[["Cancelled at the guest's request"],['Duplicate booking'],['Moved to a new date'],['Restaurant closed for a private event'],['Booking entered by mistake',false],['Other']];
function act(b,a){
  var ask=$('ask');
  var forms={
    confirm:['Confirm this booking?',b.email?'The guest gets a confirmation email.':'This guest has no email address, so call them to let them know.',null,'Confirm booking','go','Not now'],
    decline:['Decline this request?','The guest gets an email. Add a short message if you like.','For example: we are fully booked that evening and would love to host you on another date.','Decline and email guest','danger solid','Keep request'],
    cancel:['Cancel this booking?','The space is released straight away. Tap a reason.','Add a few words if you like. If you email the guest, they see this.','Cancel booking','danger solid','Keep booking']
  };
  if(forms[a]){var f=forms[a];
    ask.innerHTML='<div class="confirmbox"><b>'+f[0]+'</b><span class="small">'+f[1]+'</span>'+(a==='cancel'?'<div class="row kz-cr" role="group" aria-label="Why is it cancelled?">'+CANCEL_REASONS.map(function(r,i){return '<button type="button" class="chip" data-cr="'+i+'" aria-pressed="false">'+esc(r[0])+'</button>'}).join('')+'</div>':'')+(f[2]?'<textarea id="rs" placeholder="'+esc(f[2])+'"></textarea>':'')+
      (a==='cancel'&&b.email?'<label class="check"><input type="checkbox" id="rn" checked>Email the guest that we cancelled</label>':'')+
      '<div class="row"><button class="btn '+f[4]+'" id="rc">'+f[3]+'</button><button class="btn" id="rk">'+(f[5]||'Go back')+'</button></div></div>';
    ask.scrollIntoView({behavior:'smooth',block:'nearest'});
    $('rk').onclick=function(){ask.innerHTML=''};
    if(a==='cancel'){var pick=-1;ask.querySelectorAll('[data-cr]').forEach(function(c){c.onclick=function(){pick=+c.dataset.cr;
        ask.querySelectorAll('[data-cr]').forEach(function(x){var on=x===c;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false')});
        var rn=$('rn');if(rn&&CANCEL_REASONS[pick][1]===false)rn.checked=false;var rs=$('rs');if(rs&&pick===CANCEL_REASONS.length-1)rs.focus()}});
      $('rc').onclick=function(){var note=($('rs')?$('rs').value:'').trim();
        if(pick<0){toast('Tap the reason it is cancelled.');return}
        if(pick===CANCEL_REASONS.length-1&&!note){toast('Add a few words about why.');if($('rs'))$('rs').focus();return}
        var why=pick===CANCEL_REASONS.length-1?note:CANCEL_REASONS[pick][0]+(note?': '+note:'');
        run(b,a,why,$('rn')?$('rn').checked:false)};
      return}
    $('rc').onclick=function(){run(b,a,$('rs')?$('rs').value:null,$('rn')?$('rn').checked:false)};
    return;
  }
  run(b,a,null,false);
}
async function run(b,a,reason,notify){
  document.querySelectorAll('#dr button').forEach(function(x){x.disabled=true});
  var done={confirm:'Confirmed. We have emailed the guest.',decline:'Declined. We have emailed the guest.',cancel:notify?'Cancelled. We have emailed the guest.':'Cancelled. The guest was not emailed, so please let them know.',arrived:'Marked as arrived.',undo_arrived:'Arrival undone.',no_show:'Marked as no-show.',completed:'Marked as completed.',reopen:'Booking reopened.'};
  if(a==='confirm'&&!b.email)done.confirm='Confirmed. This guest has no email address, so please call them.';
  try{await call('staff_action2',{p_id:b.id,p_action:a,p_reason:reason,p_notify:!!notify});openBooking(b.id,done[a]);loadNeeds();if(UNDO[a])toast(b.name+': '+done[a].toLowerCase().replace(/\.$/,''),function(){undoAct(b.id,UNDO[a],b.name)})}catch(e){openBooking(b.id,errText(e),'err')}
}
async function timeOptions(service,date,party,current){
  service=service||'teppanyaki';
  if(service==='teppanyaki'){var r=await call('staff_sittings',{p_date:date,p_party:party});
    return r.map(function(x){return {v:x.session_time,l:tl(x.session_time)+(x.closed?', closed':x.can_fit?', '+x.seats_left+' seats left':', full for '+party),bad:x.closed||!x.can_fit}})}
  var s=await call('staff_service_times',{p_service:service,p_date:date,p_party:party});
  var o=s.map(function(x){return {v:x.slot,l:tl(x.slot)+(x.reason==='closed'?', closed':x.reason==='full'?', full':''),bad:x.reason==='closed'||x.reason==='full'}});
  if(current&&!o.some(function(x){return x.v===current}))o.unshift({v:current,l:tl(current),bad:false});
  return o;
}
function changeEditor(b){
  var box=$('chgbox');
  box.innerHTML='<div class="confirmbox" style="background:var(--paper);margin:0 0 12px"><div class="grid2"><label class="f">Date<input type="date" id="cd" value="'+b.date+'" min="'+fijiToday()+'"></label><label class="f">'+((b.service||'teppanyaki')==='teppanyaki'?'Sitting':'Time')+'<select id="ct"><option>Loading…</option></select></label>'+
    '<label class="f">Adults<input type="number" id="ca" min="0" max="50" value="'+b.adults+'"></label><label class="f">Children<input type="number" id="cc" min="0" max="50" value="'+b.children+'"></label></div>'+
    (b.email?'<label class="check"><input type="checkbox" id="cnf" checked>Email the guest the new details</label>':'<p class="small muted">No email on this booking, so tell the guest by phone.</p>')+
    '<div id="cmsg"></div><div class="row"><button class="btn primary" id="csv">Save change</button><button class="btn" id="ccx">Discard changes</button></div></div>';
  var cur=b.session_time;
  async function load(){var d=$('cd').value,p=(+$('ca').value||0)+(+$('cc').value||0),sel=$('ct');if(!d||p<1)return;
    try{var o=await timeOptions(b.service,d,p,d===b.date?cur:null);var keep=sel.value&&sel.value!=='Loading…'?sel.value:cur;
      sel.innerHTML=o.map(function(x){return '<option value="'+x.v+'"'+(x.v===keep?' selected':'')+'>'+esc(x.l)+'</option>'}).join('')||'<option value="">No times this day</option>'}catch(e){$('cmsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}
  ['cd','ca','cc'].forEach(function(id){$(id).addEventListener('change',load)});load();
  $('ccx').onclick=function(){box.innerHTML=''};
  async function save(force){var btn=$('csv');btn.disabled=true;
    try{await call('staff_change_booking',{p_id:b.id,p_date:$('cd').value,p_time:$('ct').value,p_adults:+$('ca').value||0,p_children:+$('cc').value||0,p_force:!!force,p_notify:$('cnf')?$('cnf').checked:false});
      openBooking(b.id,'Booking updated.'+($('cnf')&&$('cnf').checked?' We have emailed the guest the new details.':''));}
    catch(e){btn.disabled=false;var m=e.message||'';
      if(m.indexOf('SESSION_FULL')>=0||m.indexOf('SLOT_FULL')>=0){$('cmsg').innerHTML='<div class="msg warn">'+esc(errText(e))+' You can still save it if you have made room.<div class="row" style="margin-top:8px"><button class="btn sm" id="cfz">Save anyway</button></div></div>';$('cfz').onclick=function(){save(true)}}
      else $('cmsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}
  $('csv').onclick=function(){save(false)};
}

/* ---------- New booking ---------- */
/* ---------- Stations: one brief per grill for the whole night, like a pilot brief ---------- */
function stnLine(lab,txt,cls){return txt?'<div class="sl'+(cls?' '+cls:'')+'"><b>'+lab+'</b><span>'+txt+'</span></div>':''}
function stationsHtml(d){
  var tabs=(d.tables||[]).slice().sort(function(a,b){return (roomOf(a)==='main'?0:1)-(roomOf(b)==='main'?0:1)}),
    Ls=(d.sessions||[]).map(function(s){return {s:s,L:layout(s),cm:colorMap(s)}}),h='<div class="stns">';
  tabs.forEach(function(t){
    var tot=0,kids=0,hc=0,watch=[],cels=0,secs='';
    Ls.forEach(function(x){var s=x.s,es=x.L.by[t.code]||[],st=s.tables.find(function(z){return z.code===t.code})||t,cov=es.reduce(function(n,e){return n+e.n},0),share=es.length>1&&es.some(function(e){return hasAlg(e.p)});tot+=cov;
      var rows=es.map(function(e){var p=e.p,c=x.cm[p.id],sp=x.L.sp[p.id]||{},others=Object.keys(sp).filter(function(k){return k!==t.code}),ch=Math.min(p.children||0,e.n);
        kids+=ch;hc+=p.high_chairs||0;if(isCel(p))cels++;
        if(hasAlg(p))watch.push('<span class="sw-a">'+esc(p.allergens.join(', '))+'</span> '+esc(p.name)+' ('+e.n+'), '+esc(s.label));
        var who=(p.adults||0)+(p.adults===1?' adult':' adults')+(p.children?', '+p.children+(p.children===1?' child':' children'):'')+(needsText(p)?', '+needsText(p):''),
          diet=[(p.diet_prefs||[]).join(', '),clean(p.dietary)].filter(Boolean).join('. ');
        return '<div class="stnrow"><button class="sname pname"'+chipStyle(c)+' data-id="'+p.id+'"><span>'+esc(p.name)+'</span><span class="ssz">'+(e.n!==p.size?e.n+'<small> of '+p.size+'</small>':p.size)+'</span></button>'+
          '<div class="sstat">'+(p.arrived_at?'<span class="pill st-arrived">Since '+esc(clock(p.arrived_at))+'</span>':'<span class="pill">Due '+esc(s.label)+'</span>')+(p.vip?'<span class="tag vip">VIP</span>':'')+(p.status==='pending_large_group'||p.status==='pending'?'<span class="pill st-request">Request, not confirmed</span>':'')+'</div>'+
          stnLine('Allergy',hasAlg(p)?esc(p.allergens.join(', '))+(diet?'. '+esc(diet):''):'','al')+
          stnLine('Dietary',!hasAlg(p)&&diet?esc(diet):'')+
          stnLine('Celebrating',isCel(p)?esc(celText(p)):'','ce')+
          stnLine('Guests',esc(who))+
          stnLine('Returning',p.visits||p.guest_note?(p.visits?esc(p.visits+(p.visits===1?' visit':' visits')):'')+(p.guest_note?(p.visits?'. ':'')+esc(p.guest_note):''):'')+
          stnLine('Request',clean(p.requests)?esc(clean(p.requests)):'')+
          stnLine('Team note',p.staff_notes?esc(p.staff_notes):'')+
          stnLine('Shared',others.length?'Rest of the party at '+esc(others.map(function(k){return tname(k)+' '+sp[k]}).join(' + ')):'')+'</div>'}).join('');
      secs+='<section class="ssit"><div class="ssit-h"><h3>Teppanyaki '+esc(s.label)+'</h3><span class="ssit-n"><b>'+cov+'</b> of '+st.seats+' seats</span></div>'+(share?'<div class="snote">Shared grill with an allergy. Keep separate tools and cooking zones.</div>':'')+(rows||'<p class="sempty">No guests at this sitting.</p>')+'</section>'});
    h+='<article class="stn" id="stn-'+t.code+'"><header class="stn-h"><div><h2>'+esc(t.name||tname(t.code))+'</h2><span class="muted">'+(roomOf(t)==='main'?'':'Private dining, ')+t.seats+' seats, '+esc(longDate(state.date))+'</span></div>'+
      '<div class="stn-k"><span><b>'+tot+'</b>covers tonight</span><span class="'+(watch.length?'k-a':'')+'"><b>'+watch.length+'</b>'+(watch.length===1?'allergy':'allergies')+'</span><span><b>'+cels+'</b>'+(cels===1?'celebration':'celebrations')+'</span><span><b>'+kids+'</b>'+(kids===1?'child':'children')+'</span>'+(hc?'<span><b>'+hc+'</b>'+(hc===1?'high chair':'high chairs')+'</span>':'')+'</div></header>'+
      (watch.length?'<div class="swatch"><b>Watch for</b>'+watch.map(function(w){return '<div>'+w+'</div>'}).join('')+'</div>':'')+secs+'</article>'});
  return h+'</div>';
}
/* ---------- Quick booking: one question per screen, big buttons ---------- */
var QB=null;
/* retired 28 Oct 2026 (tidy): the old Quick booking screen (v49); New booking is the four-step flow since v64 */
function renderQuick(pre){}

function nmodeHtml(m){return '<div class="seg nmode" role="group" aria-label="Booking screen"><button data-nm="quick"'+(m==='quick'?' class="on"':'')+'>Quick booking</button><button data-nm="full"'+(m==='full'?' class="on"':'')+'>Full form</button></div>'}
function bindNmode(){main().querySelectorAll('[data-nm]').forEach(function(b){b.onclick=function(){state.newMode=b.dataset.nm;lsSet('kz_newmode',state.newMode);if(state.newMode==='quick')QB=null;renderNew()}})}
function renderNew(){var m=state.newMode||lsGet('kz_newmode')||'quick';
  if(m==='full'){renderFull();var hr=main().querySelector('.row');if(hr)hr.insertAdjacentHTML('beforeend',nmodeHtml('full'));bindNmode();return}
  var pre=state.newPre;state.newPre=null;
  main().innerHTML='<div class="row nhead"><h1>New booking</h1>'+nmodeHtml('quick')+'</div><div id="qb" class="qb"></div>';bindNmode();renderQuick(pre)}
function renderFull(){
  var t=fijiToday(),pre=state.newPre;state.newPre=null;
  main().innerHTML='<div class="row" style="margin:0 0 6px"><h1>New booking</h1></div><p class="muted" style="margin:0 0 18px">'+(pre&&pre.date?'For <b>'+esc(longDate(pre.date))+'</b>. Change the date below if needed.':'')+'</p>'+
   '<div class="stack" style="max-width:820px"><div class="panel stack"><div class="seg" id="nsv" role="group" aria-label="Booking type"><button data-v="teppanyaki" class="on">Teppanyaki</button><button data-v="dining">Lunch or dinner</button><button data-v="event">Event</button></div>'+
   '<div class="grid3"><label class="f">Date<input type="date" id="nd" value="'+(pre&&pre.date>=t?pre.date:state.date&&state.date>=t?state.date:t)+'" min="'+t+'"></label><label class="f">Adults<input type="number" id="na" min="0" max="50" value="2"></label><label class="f">Children<input type="number" id="nc" min="0" max="50" value="0"></label></div>'+
   '<div class="f">Time<div class="chips" id="ns"><span class="muted small">Loading times…</span></div></div></div>'+
   '<div class="panel"><div class="grid2"><label class="f">Guest name<input id="nn" autocomplete="off"></label><label class="f">Phone<input id="np" type="tel" value="+679 "></label><label class="f">Email <small>Optional. Adds a confirmation and reminder email.</small><input id="ne" type="email"></label><label class="f">Booked by<select id="nsrc"><option value="phone">Phone</option><option value="walk_in">Walk-in</option></select></label>'+
   '<div class="f full" id="norig"></div>'+
   '<label class="f" id="nprefw" hidden>Seating<select id="npref"><option value="no_preference">No preference</option><option value="dining_room">Dining room</option><option value="yakitori_counter">Yakitori counter</option><option value="sushi_bar">Sushi bar</option></select></label>'+
   '<div class="f full">Allergies <small>Always ask.</small><div class="chips" id="nal">'+ALLERGENS.map(function(a){return '<label class="chip"><input type="checkbox" value="'+a+'">'+a+'</label>'}).join('')+'</div></div>'+
   '<div class="f full nxrow"><span>Anything else? Add only what the guest mentions.</span><div class="nxchips" id="nxc">'+
     '<button type="button" class="addx" data-x="diet" aria-expanded="false">Dietary needs</button><button type="button" class="addx" data-x="occ" aria-expanded="false" id="nxocc">Occasion</button>'+
     '<button type="button" class="addx" data-x="needs" aria-expanded="false">Seating needs</button><button type="button" class="addx" data-x="req" aria-expanded="false" id="nxreq">Special requests</button><button type="button" class="addx" data-x="notes" aria-expanded="false">Staff notes</button></div></div>'+
   '<div class="nx full" data-nx="diet"><div class="f">Dietary needs'+chipsHtml('ndp',DIETS,[])+'</div><label class="f">Allergy or dietary details<input id="ndi"></label></div>'+
   '<div class="nx full" data-nx="occ"><label class="f"><span id="nol">Occasion</span><select id="no"></select></label>'+
   '<div class="grid2 celgrid" id="ncel" hidden><label class="f">Who is celebrating<input id="ncb" maxlength="80"></label><label class="f">Dessert plate message <small>Optional</small><input id="npm" maxlength="60"></label><label class="check full"><input type="checkbox" id="nck">Guest is bringing their own cake</label></div></div>'+
   '<div class="nx full" data-nx="needs"><div class="grid2"><label class="f" id="nhcw" hidden>High chairs<select id="nhc"><option value="0">None</option></select></label><label class="check" style="align-self:end;min-height:44px;align-items:center"><input type="checkbox" id="nwc">Wheelchair access</label></div></div>'+
   '<div class="nx full" data-nx="req"><div class="f" id="nrq"><span>Common requests</span><div class="chips nrpills"></div></div><label class="f"><span id="nrl">Anything else</span><input id="nr" placeholder="Optional"></label></div>'+
   '<div class="nx full" data-nx="notes"><label class="f">Staff notes <small>Only the team sees these.</small><textarea id="nsn"></textarea></label></div>'+optinHtml('n',false,'','')+'</div></div><div id="nmsg"></div><div class="row"><button class="btn primary" id="nb" disabled style="min-height:50px;padding:0 24px">Choose a time first</button></div></div>';
  var chosen='',svc='teppanyaki',tmr=null;
  function party(){return (parseInt($('na').value,10)||0)+(parseInt($('nc').value,10)||0)}
  function syncX(){var c=svc!=='event'&&CELEB.indexOf($('no').value)>=0;$('ncel').hidden=!c;var k=parseInt($('nc').value,10)||0,hs=$('nhc'),cur=+hs.value||0;$('nhcw').hidden=svc==='event'||k<1;
    hs.innerHTML='<option value="0">None</option>'+[1,2,3,4,5,6].filter(function(n){return n<=k}).map(function(n){return '<option value="'+n+'">'+n+'</option>'}).join('');hs.value=String(Math.min(cur,k))}
  function setBtn(){var b=$('nb');if(!b)return;b.disabled=!chosen;b.textContent=chosen?'Book '+party()+' for '+tl(chosen)+', '+shortDate($('nd').value):'Choose a time first'}
  async function times(){if(!$('ns'))return;var keep=chosen;chosen='';setBtn();var p=party(),el=$('ns');if(p<1){el.innerHTML='<span class="muted small">Add at least one guest.</span>';return}
    el.innerHTML='<span class="muted small">Checking…</span>';
    try{var o=await timeOptions(svc,$('nd').value,p);
      el.innerHTML=o.length?o.map(function(x){return '<button type="button" class="chip" data-s="'+x.v+'" data-bad="'+(x.bad?1:0)+'">'+esc(x.l)+'</button>'}).join(''):'<span class="muted small">Not open for bookings on this day.</span>';
      el.querySelectorAll('.chip').forEach(function(b){b.onclick=function(){if(b.dataset.bad==='1'){toast('That time is closed or full. Choose another time.');return}chosen=b.dataset.s;el.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x===b)});setBtn()}});
      if(keep){var kc=el.querySelector('.chip[data-s="'+keep+'"][data-bad="0"]');if(kc)kc.click()}
      if(pre&&pre.time){var pc=el.querySelector('.chip[data-s="'+pre.time+'"][data-bad="0"]');if(pc)pc.click();pre.time=null}}
    catch(e){el.innerHTML='<span class="small" style="color:var(--red)">'+esc(errText(e))+'</span>'}}
  function setSvc(v){svc=v;main().querySelectorAll('#nsv button').forEach(function(x){x.classList.toggle('on',x.dataset.v===v)});$('nprefw').hidden=v!=='dining';$('nol').textContent=v==='event'?'Type of event':'Occasion';
    $('nrl').textContent=v==='event'?'Event details (menu, budget, timing)':'Anything else';$('nrq').hidden=v==='event';var np=main().querySelector('.nrpills');np.innerHTML=reqPills(v,[],'data-nreq');np.querySelectorAll('[data-nreq]').forEach(function(b){b.onclick=function(){var on=!b.classList.contains('on');b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))}});$('nxocc').textContent=v==='event'?'Type of event':'Occasion';$('nxreq').textContent=v==='event'?'Event details':'Special requests';if(v==='event'){nx('occ',true);nx('req',true)}$('no').innerHTML='<option value="">None</option>'+(v==='event'?EVENT_TYPES:OCCASIONS).map(function(o){return '<option>'+o+'</option>'}).join('');syncX();times()}
  function nx(k,open){var b=main().querySelector('.addx[data-x="'+k+'"]'),g=main().querySelector('.nx[data-nx="'+k+'"]');if(!b||!g)return;if(open===undefined)open=b.getAttribute('aria-expanded')!=='true';
    b.setAttribute('aria-expanded',String(open));g.classList.toggle('nx-open',open);return open}
  main().querySelectorAll('.addx').forEach(function(b){b.onclick=function(){if(nx(b.dataset.x)){var f=main().querySelector('.nx[data-nx="'+b.dataset.x+'"]').querySelector('select,input:not([type=checkbox]),textarea');if(f&&window.innerWidth>900)f.focus()}}});
  $('no').addEventListener('change',syncX);$('nc').addEventListener('input',syncX);
  main().querySelectorAll('#nsv button').forEach(function(b){b.onclick=function(){setSvc(b.dataset.v)}});
  ['nd','na','nc'].forEach(function(id){$(id).addEventListener('input',function(){clearTimeout(tmr);tmr=setTimeout(times,350)})});
  var nopt={yes:false,d:'',m:''};bindOptin('n',function(v){nopt=v});
  var noc=kzOriginMount($('norig'),{value:null,small:true,onChange:function(v){var m=$('nmsg');if(v&&m&&/where the guest is from/.test(m.textContent))m.innerHTML=''}});
  setSvc(pre&&pre.svc||'teppanyaki');if(pre)setTimeout(function(){var n=$('nn');if(n&&window.innerWidth>900)n.focus({preventScroll:true})},50);
  $('nb').onclick=async function(){var btn=this,msg=$('nmsg');btn.disabled=true;msg.innerHTML='';
    var al=[].slice.call(document.querySelectorAll('#nal input:checked')).map(function(x){return x.value});
    if(!$('nn').value.trim()||$('np').value.replace(/[^0-9]/g,'').length<6){msg.innerHTML='<div class="msg err">Fill in the guest name and phone number.</div>';btn.disabled=false;return}
    if(!noc.value){noc.invalid(msg);btn.disabled=false;return}
    try{var r=await call('staff_create_any',{p_service:svc,p_date:$('nd').value,p_time:chosen,p_adults:parseInt($('na').value,10)||0,p_children:parseInt($('nc').value,10)||0,p_name:$('nn').value.trim(),p_phone:$('np').value.trim(),p_email:$('ne').value.trim()||null,
        p_occasion:$('no').value||null,p_dietary:$('ndi').value||null,p_requests:svc==='event'?($('nr').value||null):reqText([].slice.call(main().querySelectorAll('.nrpills .qp.on')).map(function(x){return x.dataset.nreq}),$('nr').value),p_allergens:al,p_seating_pref:svc==='dining'?$('npref').value:null,p_source:$('nsrc').value,p_staff_notes:$('nsn').value||null});
      var x={diet_prefs:checked('#ndp'),wheelchair:$('nwc').checked,high_chairs:+$('nhc').value||0};if(!$('ncel').hidden){x.celebrant=$('ncb').value;x.plate_message=$('npm').value;x.own_cake=$('nck').checked}
      x.location=noc.value;var xerr='';
      if(r.id){try{await call('staff_set_extras',{p_id:r.id,p_extras:x})}catch(e2){xerr=' Where the guest is from, dietary and celebration details did not save; open the booking to add them.'}}
      if(nopt.yes&&r.id){var ow=await saveOptin(r.id,true,nopt.d,nopt.m);if(ow)xerr+=' '+ow}
      msg.innerHTML='<div class="msg '+(xerr?'warn':'ok')+'">All booked. Reference <b>'+esc(r.reference)+'</b>.'+esc(xerr)+' <button class="link" id="nv">Open booking</button></div>';
      $('nv').onclick=function(){openBooking(r.id)};
      ['nn','ne','ndi','nr','nsn','ncb','npm'].forEach(function(id){$(id).value=''});$('np').value='+679 ';document.querySelectorAll('#nal input,#ndp input,#nck,#nwc').forEach(function(x){x.checked=false});resetOptin('n');nopt={yes:false,d:'',m:''};noc.reset();$('no').value='';$('nhc').value='0';syncX();times();loadNeeds();
    }catch(e){msg.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';btn.disabled=false}};
}

/* v149 (28 Oct 2026, house rule): a table is held for 15 minutes after the booking time, then staff may release it
   (one tap marks a no-show, with undo). Guests are told in their confirmation email. */
var KZHOLD=15;
function kzRelBtn(id,cls){return '<button class="'+cls+' kz149-rel" data-qa="no_show" data-pid="'+id+'" title="Held '+KZHOLD+' min. Release the table (marks a no-show; undo on the next message)" aria-label="Release the table: mark no-show"><span>Release</span></button>'}
/* ---------- Settings ---------- */
var STABS=[['home','Overview'],['operations','Operations'],['closures','Closures'],['holidays','Holidays and events'],['tables','Grills and floor plan'],['floor','Tables and counters'],['rules','Booking rules'],['emails','Emails and alerts'],['staff','Staff accounts'],['me','My account']];
async function renderSettings(){
  main().innerHTML='<div class="row" style="margin:0 0 16px"><h1>Settings</h1></div><div class="settings"><nav class="snav" aria-label="Settings sections">'+kzAdminNav()+'</nav><div id="spane"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div>';
  main().querySelectorAll('.snav button').forEach(function(b){b.onclick=function(){if(state.stab===b.dataset.s)return;kzLeaveSettings(function(){state.stab=b.dataset.s;hpush(curSt());renderSettings()})}});
  var sact=main().querySelector('.snav button.on');if(sact&&sact.scrollIntoView&&window.innerWidth<=600)try{sact.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}
  if(state.stab==='home')return paneHome();
  if(state.stab==='closures')return paneClosures();
  if(state.stab==='holidays')return paneHolidays();
  if(state.stab==='me')return paneMe();
  if(state.stab==='floor')return paneFloor();
  if(state.stab==='operations')return paneOperations();
  if(state.stab==='places')return panePlaces();
  if(state.stab==='removed')return paneRemoved();
  if(state.stab==='history')return paneHistory();
  if(state.stab==='integrations')return paneIntegrations();
  if(state.stab==='wording')return paneWording();
  if(state.stab==='profile')return paneProfile();
  try{var s=await call('staff_get_settings')}catch(e){$('spane').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  var admin=s.me&&s.me.role==='admin';
  if(state.stab==='tables')paneTables(s,admin);else if(state.stab==='rules')paneRules(s,admin);else if(state.stab==='emails')paneEmails(s,admin);else paneStaff(s,admin);
}
/* v99 (21 Oct 2026): Holidays and events (managers and admins). The list the Heartbeat shows under the dates; a change here
   shows on the Heartbeat the next time Analytics opens. Remove keeps the entry (marked inactive) and offers Undo. */
var HOLG=[['fj','Fiji public holiday'],['intl','International day'],['jp','Japan'],['au','Australia'],['nz','New Zealand']],HOLK=[['holiday','Public holiday'],['school','School holidays'],['event','Event or occasion']];
var holSt={g:'',y:'',x:false,open:null};
function holWhen(h){function f(d){return new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}return h.end&&h.end!==h.date?f(h.date)+' to '+f(h.end):f(h.date)}
async function paneHolidays(){var pane=$('spane');
  pane.innerHTML='<div class="stack"><div class="panel"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0 0 6px">Holidays and events</h2><p class="muted" style="margin:0">These show under the dates on the Heartbeat in Analytics. Change a date here and the Heartbeat shows it.</p></div><button type="button" class="btn primary" id="hadd">Add a holiday or event</button></div><div id="hform"></div></div><div class="panel"><div id="hfil" class="hol-fil"></div><div id="hlist"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div></div>';
  var r;try{r=await call('staff_holidays')}catch(e){$('hlist').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  if(!r||r.ok===false){$('hlist').innerHTML='<div class="msg info">Only managers and admins can change holidays and events.</div>';$('hadd').hidden=true;return}
  var items=r.items||[];
  function gname(g){var x=HOLG.filter(function(h){return h[0]===g})[0];return x?x[1]:g}
  function filters(){var ys={};items.forEach(function(h){ys[h.date.slice(0,4)]=1});
    $('hfil').innerHTML='<div class="seg kz-chips" role="group" aria-label="Group">'+[['','All']].concat(HOLG).map(function(g){return '<button type="button" data-hg="'+g[0]+'" class="'+(holSt.g===g[0]?'on':'')+'" aria-pressed="'+(holSt.g===g[0])+'">'+(g[0]===''?'All':g[0]==='fj'?'Fiji':g[1])+'</button>'}).join('')+'</div>'+
      '<label class="f hol-y">Year<select id="hy"><option value="">All years</option>'+Object.keys(ys).sort().map(function(y){return '<option'+(holSt.y===y?' selected':'')+'>'+y+'</option>'}).join('')+'</select></label>'+
      '<label class="hol-x"><input type="checkbox" id="hx"'+(holSt.x?' checked':'')+'> Only dates not yet confirmed</label>';
    $('hfil').querySelectorAll('[data-hg]').forEach(function(b){b.onclick=function(){holSt.g=b.dataset.hg;filters();list()}});
    $('hy').onchange=function(){holSt.y=this.value;list()};$('hx').onchange=function(){holSt.x=this.checked;list()}}
  function list(){var t=fijiToday(),rows=items.filter(function(h){return (!holSt.g||h.grp===holSt.g)&&(!holSt.y||h.date.slice(0,4)===holSt.y)&&(!holSt.x||h.expected)});
    if(!rows.length){$('hlist').innerHTML='<p class="muted">Nothing matches these filters.</p>';return}
    var mo='',h='';rows.forEach(function(x){var m=x.date.slice(0,7);if(m!==mo){if(mo)h+='</div>';mo=m;h+='<h3 class="hol-m">'+new Date(m+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'})+'</h3><div class="hol-rows">'}
      h+='<div class="hol-r'+((x.end||x.date)<t?' past':'')+'" data-hid="'+x.id+'"><span class="hol-dot hd-'+x.grp+'"></span><div class="hol-main"><b>'+esc(x.name)+'</b><span>'+esc(holWhen(x))+' · '+esc(gname(x.grp))+(x.kind==='school'?', school holidays':'')+'</span></div>'+(x.expected?'<span class="hol-tag">Date not yet confirmed</span>':'')+'<button type="button" class="btn" data-hed="'+x.id+'">Edit</button></div>'});
    $('hlist').innerHTML=h+'</div>';
    $('hlist').querySelectorAll('[data-hed]').forEach(function(b){b.onclick=function(){form(items.filter(function(x){return x.id===b.dataset.hed})[0])}})}
  function form(x){var n=!x;x=x||{date:fijiToday(),end:'',name:'',grp:'fj',kind:'event',expected:false,note:''};
    var f=$('hform');f.innerHTML='<div class="hol-form" role="group" aria-label="'+(n?'Add a holiday or event':'Change '+esc(x.name))+'"><h3 style="margin:16px 0 8px">'+(n?'Add a holiday or event':'Change: '+esc(x.name))+'</h3>'+
      '<label class="f">Name<input id="hn" maxlength="200" value="'+esc(x.name)+'"></label>'+
      '<div class="grid2"><label class="f">Group<select id="hgp">'+HOLG.map(function(g){return '<option value="'+g[0]+'"'+(x.grp===g[0]?' selected':'')+'>'+g[1]+'</option>'}).join('')+'</select></label>'+
      '<label class="f">Type<select id="hk">'+HOLK.map(function(k){return '<option value="'+k[0]+'"'+(x.kind===k[0]?' selected':'')+'>'+k[1]+'</option>'}).join('')+'</select></label></div>'+
      '<div class="grid2"><label class="f">Date (or first day)<input type="date" id="hd" value="'+esc(x.date)+'"></label><label class="f">Last day, if it runs over several days<input type="date" id="he" value="'+esc(x.end||'')+'"></label></div>'+
      '<label class="hol-c"><input type="checkbox" id="hc"'+(x.expected?'':' checked')+'> Date confirmed (untick if it is only expected; it shows hollow on the Heartbeat)</label>'+
      '<label class="f">Note (optional)<input id="hno" maxlength="300" value="'+esc(x.note||'')+'"></label>'+
      '<div id="hmsg"></div><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn primary" id="hsv">'+(n?'Add':'Save changes')+'</button><button type="button" class="btn" id="hcx">Cancel</button>'+(n?'':'<button type="button" class="btn danger" id="hrm" style="margin-left:auto">Remove</button>')+'</div></div>';
    $('hn').focus();try{f.scrollIntoView({block:'nearest'})}catch(e){}
    $('hcx').onclick=function(){f.innerHTML=''};
    $('hsv').onclick=async function(){var b=this;b.disabled=true;
      try{var q=await call('staff_holiday_save',{p:{id:n?null:x.id,name:$('hn').value,grp:$('hgp').value,kind:$('hk').value,date:$('hd').value,end:$('he').value||null,expected:!$('hc').checked,note:$('hno').value}});
        if(!q||q.ok===false){$('hmsg').innerHTML='<div class="msg err">'+esc(q&&q.error&&q.error!=='not_found'?q.error:'That did not save. Try again.')+'</div>';b.disabled=false;return}
        f.innerHTML='';toast(n?'Added. It shows on the Heartbeat.':'Saved. The Heartbeat shows the new date.');await reload()}catch(e){$('hmsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';b.disabled=false}};
    if(!n)$('hrm').onclick=async function(){var b=this;b.disabled=true;
      try{await call('staff_holiday_save',{p:{id:x.id,remove:true}});f.innerHTML='';
        toast('Removed '+x.name+'.',async function(){try{await call('staff_holiday_save',{p:{id:x.id,restore:true}});toast(x.name+' is back.');await reload()}catch(e){toast(errText(e))}});await reload()}catch(e){$('hmsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';b.disabled=false}}}
  async function reload(){try{var q=await call('staff_holidays');if(q&&q.ok){items=q.items||[];window.kz99HolStale=true;filters();list()}}catch(e){}}
  $('hadd').onclick=function(){form(null)};filters();list()}
var CLOSE_PARTS={all:[['','Whole day'],['lunch','Lunch only'],['dinner','Dinner only, including Teppanyaki']],teppanyaki:[['','Whole night, all sittings']],dining:[['','Whole day'],['lunch','Lunch only'],['dinner','Dinner only']]};
function closureText(c){if(c.scope==='teppanyaki')return 'Teppanyaki, '+(c.part==='all'?'whole night':tl(c.part)+' sitting');return (c.scope==='all'?'Whole restaurant':'Dining room')+', '+(c.part==='all'?'whole day':c.part)}
function paneClosures(){
  var t=fijiToday();
  $('spane').innerHTML='<div class="stack"><div class="panel"><h2 style="margin-bottom:10px">Upcoming closures</h2><div id="cl"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div>'+
    '<details class="fold panel" id="fclose"><summary><span class="fold-t">Close a date or service</span><span class="fold-h">Holidays, private events, training</span></summary><div class="fold-b stack"><p class="small muted" style="margin:0">Guests cannot book closed times online. Existing bookings stay as they are.</p><div class="grid2"><label class="f">Date<input type="date" id="cd" min="'+t+'" value="'+t+'"></label><label class="f">What is closed<select id="cw"><option value="all">Whole restaurant</option><option value="teppanyaki">Teppanyaki only</option><option value="dining">Dining room only</option></select></label><label class="f">When<select id="cs"></select></label><label class="f">Reason, for the team<input id="cr" maxlength="200" placeholder="For example: private event"></label></div><div id="cmsg"></div><div class="row"><button class="btn primary" id="cadd">Close it</button></div></div></details></div>';
  /* Phase 1 (audit E8): single-sitting choices come from the sittings open on the chosen date, never fixed times. */
  var sitCache={};
  function opts(list){return list.map(function(o){return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'}).join('')}
  function parts(){var w=$('cw').value,base=CLOSE_PARTS[w],cs=$('cs'),keep=cs.value;cs.innerHTML=opts(base);if(w!=='teppanyaki')return;
    var d=$('cd').value,draw=function(rows){if($('cw').value!=='teppanyaki'||$('cd').value!==d)return;cs.innerHTML=opts(base.concat((rows||[]).map(function(r){return [r.session_time,(r.label||tl(r.session_time))+' sitting only']})));if(keep&&[].some.call(cs.options,function(o){return o.value===keep}))cs.value=keep};
    if(sitCache[d])return draw(sitCache[d]);
    call('staff_sittings',{p_date:d,p_party:1}).then(function(r){sitCache[d]=r||[];draw(sitCache[d])}).catch(function(){})}
  $('cw').onchange=parts;$('cd').addEventListener('change',parts);parts();
  $('cadd').onclick=async function(){var b=this,msg=$('cmsg');b.disabled=true;
    try{var r=await call('staff_add_closure_v2',{p_date:$('cd').value,p_scope:$('cw').value,p_part:$('cs').value||null,p_reason:$('cr').value});
      msg.innerHTML=r.affected>0?'<div class="msg warn"><b>Closed.</b> '+r.affected+' active '+(r.affected===1?'booking is':'bookings are')+' already in this time. They have not been cancelled. Contact the guests and cancel them from Bookings if needed.</div>':'<div class="msg ok">Closed. Guests can no longer book it online.</div>';
      $('cr').value='';loadClosures()}catch(e){msg.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}b.disabled=false};
  loadClosures();
}
async function loadClosures(){var el=$('cl');if(!el)return;
  try{var rows=await call('staff_list_closures_v2',{p_from:fijiToday()})}catch(e){el.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  if(!rows.length){el.innerHTML='<p class="muted">Nothing is closed. Everything is open for bookings.</p>';return}
  el.innerHTML='<table class="t rt"><thead><tr><th>Date</th><th>Closed</th><th>Reason</th><th>Bookings in it</th><th></th></tr></thead><tbody>'+rows.map(function(c){
    return '<tr><td data-l="Date">'+esc(shortDate(c.date))+'</td><td data-l="Closed">'+esc(closureText(c))+'</td><td data-l="Reason">'+esc(c.reason)+'</td><td data-l="Bookings">'+(c.affected?'<span class="pill st-request">'+c.affected+' active</span>':'None')+'</td><td style="text-align:right"><button class="btn sm" data-open="'+c.id+'" data-scope="'+c.scope+'">Reopen</button></td></tr>'}).join('')+'</tbody></table>';
  el.querySelectorAll('[data-open]').forEach(function(b){b.onclick=async function(){if(!confirm('Reopen this for online bookings?'))return;b.disabled=true;try{await call('staff_remove_closure_v2',{p_id:b.dataset.open,p_scope:b.dataset.scope});toast('Reopened.');loadClosures()}catch(e){toast(errText(e));b.disabled=false}}});
}
var CHEFS=[['top','Top'],['right','Right'],['bottom','Bottom'],['left','Left']];
function missingFn(e){var m=(e&&(e.message||''))+' '+(e&&e.code||'');return /PGRST202|Could not find the function|does not exist/.test(m)}
function paneTables(s,admin){
  var T=s.tables.map(function(t){return {code:t.code,name:t.name||'',seats:t.seats,active:t.active,zone:t.zone==='private'?'private':'main',chef:t.chef||CHEF_DEF[t.code]||'top',dirty:false}}),dis=admin?'':' disabled',full=!!(s.tables[0]&&s.tables[0].chef),twoRooms=T.some(function(t){return t.zone==='private'});/* v71: Kazumi has one room (18 Oct 2026); the Room choice shows only if a grill is still marked private */
  function opts(list,v){return list.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===v?' selected':'')+'>'+o[1]+'</option>'}).join('')}
  function card(t,i){return '<div class="gcard'+(t.active?'':' off')+'" data-g="'+t.code+'"><div class="gc-h"><h3>'+esc(t.name||t.code)+'</h3><span class="tcode">'+esc(t.code)+'</span><span class="gc-st small" id="gst-'+t.code+'"></span><span class="sp"></span>'+
    (admin?'<button class="btn sm" data-mv="'+t.code+'|-1"'+(i?'':' disabled')+' aria-label="Move '+esc(t.name)+' earlier">Earlier</button><button class="btn sm" data-mv="'+t.code+'|1"'+(i<T.length-1?'':' disabled')+' aria-label="Move '+esc(t.name)+' later">Later</button>':'')+'</div>'+
    '<div class="gc-f"><label class="f">Name<input id="tn-'+t.code+'" maxlength="30" value="'+esc(t.name)+'"'+dis+'></label>'+
    '<label class="f">Seats<span class="stepper"><button type="button" class="btn" data-st="'+t.code+'|-1" aria-label="One fewer seat"'+dis+'>−</button><input type="number" inputmode="numeric" min="1" max="20" id="ts-'+t.code+'" value="'+t.seats+'"'+dis+'><button type="button" class="btn" data-st="'+t.code+'|1" aria-label="One more seat"'+dis+'>+</button></span></label>'+
    (twoRooms?'<label class="f">Room<select id="tz-'+t.code+'"'+dis+(full?'':' disabled')+'>'+opts([['main','Main room'],['private','Private dining']],t.zone)+'</select></label>':'')+
    '<label class="f">Chef stands at<select id="tc-'+t.code+'"'+dis+(full?'':' disabled')+'>'+opts(CHEFS,t.chef)+'</select></label>'+
    '<label class="check gc-on"><input type="checkbox" id="ta-'+t.code+'"'+(t.active?' checked':'')+dis+'>In use</label></div>'+
    (admin?'<div class="row"><button class="btn primary sm" data-save="'+t.code+'">Save '+esc(t.name||t.code)+'</button></div>':'')+'</div>'}
  $('spane').innerHTML='<div class="stack"><div class="panel stack"><h2>Grills and floor plan</h2><p class="small muted">Rename a grill, change its seats or change which side the chef stands on. The preview updates as you type; nothing changes for staff or guests until you press Save. Saved names show on the Today screen, floor plan, run sheets and emails. Seats in use set how many guests can book each sitting online. Existing bookings are not moved, so after reducing seats check the Today screen for grills marked over.'+(admin?'':' Only an admin can change these.')+'</p>'+(full?'':'<div class="msg warn">Room and chef position need a database update that has not been applied yet. Names, seats and In use can still be saved.</div>')+
    '<div class="gprev" id="gprev" aria-label="Preview of the floor plan"></div><p class="small muted" id="gtot"></p></div><div class="gcards">'+T.map(card).join('')+'</div></div>';
  function draw(){var h='';[['main','Main room'],['private','Private dining']].forEach(function(z){var it=T.filter(function(t){return t.active&&t.zone===z[0]});if(!it.length)return;
      var room=z[0]==='main'?'main':'priv',dir=room==='main'||$('gprev').clientWidth>560?'h':'v';h+='<div class="fp-room'+(room==='priv'?' fp-priv fp-'+dir:'')+'"><div class="fp-h">'+z[1]+'</div><div class="fp-scroll">'+fpRoomSvg(it,room,dir,z[1]+' preview',{minw:room==='main'})+'</div></div>'});
    $('gprev').innerHTML=h||'<p class="muted">No grills are in use.</p>';
    var tot=T.filter(function(t){return t.active}).reduce(function(n,t){return n+t.seats},0);$('gtot').innerHTML='Seats per sitting with these settings: <b>'+tot+'</b>'+(T.some(function(t){return t.dirty})?'. <b>Not saved yet.</b>':'')}
  window.__gprev=draw;
  function read(c){var t=T.find(function(x){return x.code===c});t.name=$('tn-'+c).value.trim();t.seats=Math.max(1,Math.min(20,parseInt($('ts-'+c).value,10)||1));t.zone=$('tz-'+c)?$('tz-'+c).value:t.zone;t.chef=$('tc-'+c).value;t.active=$('ta-'+c).checked;t.dirty=true;
    var st=$('gst-'+c);if(st)st.textContent='Not saved';var cd=document.querySelector('.gcard[data-g="'+c+'"]');if(cd){cd.classList.add('dirty');cd.classList.toggle('off',!t.active)}draw()}
  $('spane').querySelectorAll('.gcard input,.gcard select').forEach(function(x){var c=x.closest('.gcard').dataset.g;x.addEventListener('input',function(){read(c)});x.addEventListener('change',function(){read(c)})});
  $('spane').querySelectorAll('[data-st]').forEach(function(b){b.onclick=function(){var a=b.dataset.st.split('|'),i=$('ts-'+a[0]);i.value=Math.max(1,Math.min(20,(parseInt(i.value,10)||1)+(+a[1])));read(a[0])}});
  $('spane').querySelectorAll('[data-save]').forEach(function(b){b.onclick=async function(){var c=b.dataset.save,t=T.find(function(x){return x.code===c});if(!t.name){toast('Give the grill a name.');return}b.disabled=true;
    try{var r;try{r=await call('staff_update_grill',{p_code:c,p_name:t.name,p_seats:t.seats,p_active:t.active,p_zone:t.zone,p_chef:t.chef})}
      catch(e){if(!missingFn(e))throw e;r=await call('staff_update_table',{p_code:c,p_name:t.name,p_seats:t.seats,p_active:t.active})}
      toast(t.name+' saved.');paneTables(r,admin)}catch(e){toast(errText(e));b.disabled=false}}});
  $('spane').querySelectorAll('[data-mv]').forEach(function(b){b.onclick=async function(){var a=b.dataset.mv.split('|');if(T.some(function(t){return t.dirty})&&!confirm('You have changes that are not saved. Move anyway and lose them?'))return;b.disabled=true;
    try{var r=await call('staff_move_grill',{p_code:a[0],p_dir:+a[1]});toast('Order saved. Grills next to each other are used together for large parties.');paneTables(r,admin)}catch(e){toast(missingFn(e)?'Changing the order needs the database update. Ask Roneel.':errText(e));b.disabled=false}}});
  draw();
}
function paneRules(s,admin){
  var r=s.rules,sv={},dis=admin?'':' disabled';(s.services||[]).forEach(function(x){sv[x.code]=x});
  if(!r){$('spane').innerHTML='<div class="panel"><h2>Booking rules</h2><div class="msg warn">Booking rules need a database update that has not been applied yet.</div></div>';return}
  var d=sv.dining||{},e=sv.event||{};
  function num(id,lab,val,min,max,help){return '<label class="f">'+lab+'<input type="number" inputmode="numeric" id="'+id+'" min="'+min+'" max="'+max+'" value="'+(val==null?'':val)+'"'+dis+'>'+(help?'<small class="muted">'+help+'</small>':'')+'</label>'}
  var PN={lunch:'Lunch',dinner:'Dinner'},SN={dining:'Dining room',event:'Groups and events'};
  $('spane').innerHTML='<div class="stack"><p class="small muted" style="margin:0">These control what guests can book on the website. Changes apply as soon as you save. Existing bookings are not changed.'+(admin?'':' Only an admin can change these.')+'</p>'+
    '<div class="panel stack"><h2>When guests can book</h2><div class="grid2"><label class="f">First day guests can book<input type="date" id="ro" value="'+esc(String(r.opening_date||'').slice(0,10))+'"'+dis+'><small class="muted">The opening date. Earlier dates are not offered online.</small></label>'+num('ra','How far ahead, in days',r.max_advance_days,7,365,'Guests can book up to this many days from today.')+'</div></div>'+
    '<div class="panel stack"><h2>Teppanyaki</h2><div class="grid2">'+num('rt','Largest party online',r.tep_max_online,1,50,'Bigger groups send a request instead.')+'</div><p class="small muted">Seats per sitting come from the grills under Grills and floor plan.</p></div>'+
    '<div class="panel stack"><h2>Dining room</h2><div class="grid2">'+num('rdm','Largest party online',d.max_online_party,1,50,'')+num('rdc','Confirm automatically up to',d.auto_confirm_max,0,50,'Larger parties wait for staff to accept.')+num('rdk','Guests in the room at once',d.capacity,1,500,'')+num('rdp','New guests per time slot',d.pacing,1,500,'Spreads arrivals so the kitchen is not hit at once.')+num('rdn','Minimum notice, in minutes',d.min_notice_minutes,0,1440,'How soon before a time guests can still book it.')+'</div></div>'+
    /* v151 (2 Nov 2026): how long a table is held after the booking time */
    '<div class="panel stack"><h2>On the day</h2><div class="grid2">'+num('rh','Table held for, minutes',r.hold_minutes||15,5,60,'Then staff can release it. Guests are told in their confirmation email.')+'</div></div>'+
    /* v152 (3 Nov 2026): cancellation notice. Guests can still cancel online up to their booking time. */
    '<div class="panel stack"><h2>Cancellation notice</h2><div class="grid2">'+num('rct','Teppanyaki, hours',r.cancel_tep_hours==null?24:r.cancel_tep_hours,0,168,'')+num('rcd','Dining, hours',r.cancel_dining_hours==null?2:r.cancel_dining_hours,0,168,'')+num('rce','Groups and events, hours',r.cancel_event_hours==null?48:r.cancel_event_hours,0,336,'')+'</div>'+
      '<p class="shint" data-kz136keep="1">Asked for in the confirmation email. Guests can still cancel online until their booking time; later than this counts as a late cancellation.</p></div>'+
    '<div class="panel stack"><h2>Groups and events</h2><div class="grid2">'+num('rem','Smallest group',e.min_party,1,100,'')+num('rex','Largest group',e.max_online_party,1,200,'')+'</div></div>'+
    (admin?'<div class="row"><button class="btn primary" id="rsave">Save booking rules</button></div>':'')+
    /* Phase 1 (audit E15): opening hours are changed only in Operations, which checks existing bookings and records every change. */
    '<div class="panel stack"><h2>Booking times and sittings</h2><p class="small muted" style="margin:0">Lunch and dinner hours and Teppanyaki sittings are set in Operations, which checks existing bookings first and records every change.</p><div class="row"><button type="button" class="btn" data-op-go="operations">Open Operations</button></div></div></div>';
  var sb=$('rsave');if(sb)sb.onclick=async function(){sb.disabled=true;function n(id){return parseInt($(id).value,10)}
    var p={opening_date:$('ro').value,max_advance_days:n('ra'),tep_max_online:n('rt'),dining_max_online:n('rdm'),dining_auto_confirm:n('rdc'),dining_capacity:n('rdk'),dining_pacing:n('rdp'),dining_notice:n('rdn'),event_min:n('rem'),event_max:n('rex'),hold_minutes:n('rh'),cancel_tep_hours:n('rct'),cancel_dining_hours:n('rcd'),cancel_event_hours:n('rce')};
    try{var x=await call('staff_update_rules',{p:p});if(p.hold_minutes>=5)KZHOLD=p.hold_minutes;toast('Booking rules saved.');paneRules(x,admin)}catch(er){toast(errText(er));sb.disabled=false}};
  $('spane').querySelectorAll('[data-op-go]').forEach(function(b){b.onclick=function(){var k=b.dataset.opGo;kzLeaveSettings(function(){state.stab=k;hpush(curSt());renderSettings()})}});
}

/* Operations control centre. Manual AM/PM text fields; no generated sitting-time grid.
   The new writes are gated on an approved DB migration and the server rechecks admin permissions. */
async function paneOperations(){
  var pane=$('spane');if(!pane)return;
  pane.innerHTML='<div class="skel" aria-label="Loading operating schedule"><i></i><i></i><i></i></div>';
  var data,enabled=true;
  try{data=await call('staff_get_operations')}
  catch(e){
    enabled=false;
    try{
      var old=await Promise.all([call('staff_get_settings'),call('staff_get_advanced')]),settings=old[0],adv=old[1];
      data={role:settings.me&&settings.me.role,hours:settings.hours||[],sittings:adv.sittings||[],
        conditions:{tep_notice:adv.tep_notice,tep_max_party:settings.rules&&settings.rules.tep_max_online,
          auto_assign_grills:adv.auto_assign_grills,auto_confirm:adv.auto_confirm,
          opening_date:settings.rules&&settings.rules.opening_date,max_advance_days:settings.rules&&settings.rules.max_advance_days}};
    }catch(er){pane.innerHTML='<div class="msg err">Unable to load the operations schedule. '+esc(errText(er))+'</div>';return}
  }
  var DOW=[['0','Sun'],['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat']];
  function clock(v){
    if(!/^\d\d:\d\d$/.test(String(v||'')))return '';
    var h=+v.slice(0,2),m=v.slice(3);return (h%12||12)+':'+m+' '+(h<12?'AM':'PM');
  }
  function parseClock(v){
    var m=/^(1[0-2]|[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(String(v||'').trim());
    if(!m)return null;
    var h=(+m[1]%12)+(m[3].toUpperCase()==='PM'?12:0);return (h<10?'0':'')+h+':'+m[2];
  }
  function mins(v){return v?+v.slice(0,2)*60 + +v.slice(3,5):0}
  function at(v,n){var x=mins(v)+n;if(x<0||x>=1440)return '';return ('0'+Math.floor(x/60)).slice(-2)+':'+('0'+x%60).slice(-2)}
  function field(label,id,value,help){
    return '<label class="f op-time">'+label+'<input type="text" id="'+id+'" autocomplete="off" spellcheck="false" inputmode="text" placeholder="6:00 PM" value="'+esc(clock(value))+'"'+(admin&&enabled?'':' disabled')+'>'+
      (help?'<small class="muted">'+help+'</small>':'')+'</label>';
  }
  /* v148 (31 Oct 2026, Settings Phase 4): the days each sitting runs */
  function sdays(cur){cur=cur&&cur.length?cur:[0,1,2,3,4,5,6];
    return '<fieldset class="op-days kz148-days"><legend>Days</legend><div>'+DOW.map(function(a){return '<label><input type="checkbox" data-op-sday="'+a[0]+'"'+(cur.indexOf(+a[0])>=0?' checked':'')+(admin&&enabled?'':' disabled')+'><span>'+a[1]+'</span></label>'}).join('')+'</div></fieldset>'}
  function pickedDays(card){return Array.from(card.querySelectorAll('[data-op-sday]:checked')).map(function(x){return +x.dataset.opSday}).sort()}
  function notice(err){
    var msg=String(err&&err.message||err||'');
    if(/SITTING_HAS_BOOKINGS|HOURS_HAS_BOOKINGS/.test(msg))return 'Future bookings use these hours. Review those bookings before changing or closing the schedule.';
    if(/SITTING_OVERLAP|HOURS_OVERLAP/.test(msg))return 'This overlaps another open sitting on the same day. Change the times or the days.';
    if(/INVALID_DATE/.test(msg))return 'Choose today or a later date.';
    if(/SITTING_EXISTS/.test(msg))return 'A sitting with that start time is already open. Edit the existing sitting.';
    if(/INVALID_DURATION|INVALID_HOURS|INVALID_VALUE/.test(msg))return 'Check the entered start and end times and other values. Sittings must last 30 minutes to 6 hours and finish on the same day.';
    return errText(err);
  }
  var admin=data.role==='admin';
  function draw(d){
    data=d||data;admin=data.role==='admin';
    /* 27 Oct 2026 (audit): open sittings first, in time order, then switched-off sittings that still have bookings;
       the remaining switched-off records are listed (read-only) in a folded section under the cards. */
    var sitting=(data.sittings||[]).filter(function(x){return x.active||+x.future>0}).sort(function(a,b){return (b.active?1:0)-(a.active?1:0)||(a.time||'').localeCompare(b.time||'')});
    var oldSits=(data.sittings||[]).filter(function(x){return !x.active&&!(+x.future>0)}).sort(function(a,b){return (a.time||'').localeCompare(b.time||'')});
    var ORD=['First','Second','Third','Fourth','Fifth','Sixth'];
    var active=sitting.filter(function(x){return x.active}).length,cond=data.conditions||{};
    var h='<div class="op-wrap stack">'+
      /* v147: the section header already names Operations; only notices that apply are shown */
      (!enabled?'<div class="msg info" role="status">This schedule is read-only for now. Booking rules still work.</div>':'')+
      (!admin?'<p class="shint" data-kz136keep="1">Only an admin can change the schedule.</p>':'')+
      '<section class="panel stack op-section"><div><h2>Teppanyaki sittings</h2><p class="small muted">Each sitting has a manual start and end time. Its duration is calculated automatically. Turn a sitting off to reduce the number offered. Existing bookings are never moved.</p><p class="op-count"><b>'+active+'</b> open '+(active===1?'sitting':'sittings')+'</p></div>';
    if(!sitting.length)h+='<p class="muted">No active sittings are configured.</p>';
    sitting.forEach(function(x,i){var id='ops'+i,end=x.end||at(x.time,x.duration||90),n=+x.future||0;
      h+='<div class="op-card'+(x.active?'':' op-off')+'" data-op-sit="'+esc(x.time)+'" data-end="'+esc(end)+'" data-active="'+(x.active?1:0)+'" data-days="'+esc((x.days&&x.days.length?x.days:[0,1,2,3,4,5,6]).slice().sort().join(','))+'"><div class="op-card-head"><b>'+(x.active?(ORD[i]||('Sitting '+(i+1)))+' sitting':'Switched off, still has bookings')+'</b><span class="small muted">'+(n?n+(n===1?' upcoming booking':' upcoming bookings'):'No upcoming bookings')+'</span></div>'+
        '<div class="op-fields">'+field('Start time',id+'s',x.time)+field('End time',id+'e',end)+'</div>'+sdays(x.days)+
        '<div class="op-card-foot"><span class="op-duration" aria-live="polite">'+(x.duration||90)+' minutes</span><label class="check"><input type="checkbox" data-op-active'+(x.active?' checked':'')+(admin&&enabled?'':' disabled')+'>Open for bookings</label>'+
        (admin&&enabled?'<button type="button" class="btn sm" data-op-save-sit>Save sitting</button>':'')+'</div><p class="op-feedback" role="alert"></p></div>'});
    if(oldSits.length)h+='<details class="op-old"><summary>Switched-off sittings ('+oldSits.length+')</summary><p class="small muted">Not offered to guests and no upcoming bookings. To bring one back, enter its start time under Add a sitting.</p><p class="op-old-list">'+oldSits.map(function(x){return '<span>'+esc(/^\d\d:\d\d$/.test(x.time||'')?tl(x.time):(x.label||x.time))+'</span>'}).join('')+'</p></details>';
    h+=(admin&&enabled?'<div class="op-new"><h3>Add a sitting</h3><p class="small muted">Enter a new start and end time. If an inactive sitting already has the same start time, it will be reused.</p>'+
      '<div class="op-fields">'+field('Start time','opnewstart','')+field('End time','opnewend','')+'</div>'+sdays(null)+
      '<div class="op-card-foot"><span class="op-duration" aria-live="polite">Enter both times</span><button type="button" class="btn primary" id="opadd">Add sitting</button></div><p class="op-feedback" role="alert"></p></div>':'')+'</section>';
    h+='<section class="panel stack op-section"><div><h2>Dining and event booking hours</h2><p class="small muted">Set the first and last guest arrival times, operating days, length of each reservation and spacing between bookable arrival slots. These are booking windows; they are not necessarily the restaurant’s door-opening or closing times.</p></div>';
    (data.hours||[]).forEach(function(x,i){var id='oph'+i,days=x.days||[0,1,2,3,4,5,6],dur=x.duration_minutes||120,space=x.slot_minutes||15;
      h+='<div class="op-card" data-op-hour="'+esc(x.id)+'"><div class="op-card-head"><b>'+esc((x.service==='dining'?'Dining room':x.service==='event'?'Groups and events':x.service)+' · '+(x.period==='lunch'?'Lunch':'Dinner'))+'</b></div>'+
      '<div class="op-fields">'+field('First booking',id+'f',x.first)+field('Last booking',id+'l',x.last)+'</div>'+
      '<fieldset class="op-days"><legend>Days available</legend><div>'+DOW.map(function(a){return '<label><input type="checkbox" data-op-day="'+a[0]+'"'+(days.indexOf(+a[0])>=0?' checked':'')+(admin&&enabled?'':' disabled')+'><span>'+a[1]+'</span></label>'}).join('')+'</div></fieldset>'+
      '<div class="op-fields"><label class="f">Reservation length (minutes)<input class="op-duration-field" type="number" min="30" max="360" step="15" value="'+dur+'"'+(admin&&enabled?'':' disabled')+'></label>'+
      '<label class="f">Arrival spacing (minutes)<input class="op-slot-field" type="number" min="15" max="60" step="15" value="'+space+'"'+(admin&&enabled?'':' disabled')+'><small class="muted">15, 30 or 60 minutes.</small></label></div>'+
      '<div class="op-card-foot"><label class="check"><input type="checkbox" data-op-hour-active'+(x.active?' checked':'')+(admin&&enabled?'':' disabled')+'>Accept bookings</label>'+
      (admin&&enabled?'<button type="button" class="btn sm" data-op-save-hour>Save hours</button>':'')+'</div><p class="op-feedback" role="alert"></p></div>'});
    /* v150 (1 Nov 2026, Settings Phase 5): special booking hours for one date */
    var DH=data.date_hours||[],HR=(data.hours||[]).filter(function(x){return x.active});
    function hname(x){return (x.service==='dining'?'Dining':x.service==='event'?'Groups':x.service)+' · '+(x.period==='lunch'?'Lunch':'Dinner')}
    var xs='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    h+='<div class="op-new kz150"><h3>Special dates</h3>'+
      (DH.length?'<ul class="kz150-list">'+DH.map(function(o){return '<li><span class="kz150-d">'+esc(kgDate(o.date))+'</span><span class="kz150-n">'+esc(hname(o))+'</span><b>'+esc(clock(o.first)+' – '+clock(o.last))+'</b>'+
        (admin&&enabled?'<button type="button" class="kg2-ib" data-dh-rm="'+esc(o.date+'|'+o.hours_id)+'" data-first="'+esc(o.first)+'" data-last="'+esc(o.last)+'" aria-label="Back to regular hours on '+esc(kgDate(o.date))+'">'+xs+'</button>':'')+'</li>'}).join('')+'</ul>'
        :'<p class="shint" data-kz136keep="1">None set. Regular hours apply every day.</p>')+
      (admin&&enabled&&HR.length?'<div class="op-fields"><label class="f">Date<input type="date" id="dhdate" min="'+esc(fijiToday())+'"></label><label class="f">Hours<select id="dhwhich">'+HR.map(function(o){return '<option value="'+esc(o.id)+'">'+esc(hname(o))+'</option>'}).join('')+'</select></label></div>'+
        '<div class="op-fields">'+field('First booking','dhfirst',HR[0].first)+field('Last booking','dhlast',HR[0].last)+'</div>'+
        '<div class="op-card-foot"><span></span><button type="button" class="btn primary" id="dhadd">Save special hours</button></div><p class="op-feedback" role="alert"></p>':'')+'</div>';
    h+='</section><section class="panel stack op-section"><h2>Booking and seating conditions</h2>'+
      '<div class="op-summary"><div><span>Teppanyaki minimum notice</span><b>'+esc(String(cond.tep_notice==null?'Not set':cond.tep_notice+' minutes'))+'</b></div>'+
      '<div><span>Largest party bookable online</span><b>'+esc(String(cond.tep_max_party==null?'Not set':cond.tep_max_party+' guests'))+'</b></div>'+
      '<div><span>Grill assignment</span><b>'+(cond.auto_assign_grills?'Automatic suggestions':'Staff-managed')+'</b></div>'+
      '<div><span>Website booking confirmation</span><b>'+(cond.auto_confirm?'Automatic within limits':'Manager approval')+'</b></div>'+
      '<div><span>Booking horizon</span><b>'+esc(String(cond.max_advance_days==null?'Not set':cond.max_advance_days+' days'))+'</b></div></div>'+
      '<p class="small muted">Manage party-size limits, confirmations, notice periods and other conditions under Booking rules. Manage physical grill seating capacity under Grills and floor plan.</p>'+
      '<div class="row"><button type="button" class="btn" data-op-nav="rules">Open Booking rules</button><button type="button" class="btn" data-op-nav="tables">Open Grills and floor plan</button></div>'+
      '</section></div>';
    pane.innerHTML=h;kz147opTabs(pane);
    pane.querySelectorAll('[data-op-nav]').forEach(function(b){b.onclick=function(){state.stab=b.dataset.opNav;hpush(curSt());renderSettings()}});
    function validTimes(start,end,box){var a=parseClock(start),b=parseClock(end);
      if(!a||!b){box.textContent='Enter times as 6:00 PM or 7:30 PM (hour, minutes and AM/PM).';return null}
      if(mins(b)<=mins(a)){box.textContent='End time must be later than start time on the same day.';return null}
      return [a,b]}
    function setDuration(card){var inp=card.querySelectorAll('.op-time input'),a=parseClock(inp[0].value),b=parseClock(inp[1].value),o=card.querySelector('.op-duration');
      if(o)o.textContent=a&&b&&mins(b)>mins(a)?(mins(b)-mins(a))+' minutes':'Enter valid start and end times'}
    pane.querySelectorAll('.op-card[data-op-sit],.op-new').forEach(function(card){
      card.querySelectorAll('.op-time input').forEach(function(input){input.addEventListener('input',function(){setDuration(card)})});
    });
    if(!admin||!enabled)return;
    pane.querySelectorAll('[data-op-save-sit]').forEach(function(b){b.onclick=async function(){
      var card=b.closest('.op-card'),fb=card.querySelector('.op-feedback'),inp=card.querySelectorAll('.op-time input'),tt=validTimes(inp[0].value,inp[1].value,fb);if(!tt)return;
      var days=pickedDays(card),act=card.querySelector('[data-op-active]').checked;if(!days.length){fb.textContent='Choose at least one day.';return}
      var dCh=days.join(',')!==card.dataset.days,tCh=tt[0]!==card.dataset.opSit||tt[1]!==card.dataset.end||act!==(card.dataset.active==='1');
      if(!dCh&&!tCh){toast('No changes to save.');return}
      fb.textContent='';b.disabled=true;var x=null;
      try{if(dCh)x=await call('staff_save_sitting_days',{p_time:card.dataset.opSit,p_days:days});
        if(tCh)x=await call('staff_save_sitting_window',{p_original_time:card.dataset.opSit,p_start_time:tt[0],p_end_time:tt[1],p_active:act});
        toast('Sitting saved.');draw(x)}
      catch(er){if(x){toast(notice(er));draw(x)}else{fb.textContent=notice(er);b.disabled=false}}
    }});
    var add=pane.querySelector('#opadd');if(add)add.onclick=async function(){
      var card=add.closest('.op-new'),fb=card.querySelector('.op-feedback'),inputs=card.querySelectorAll('.op-time input'),tt=validTimes(inputs[0].value,inputs[1].value,fb);if(!tt)return;
      fb.textContent='';add.disabled=true;
      var days=pickedDays(card);if(!days.length){fb.textContent='Choose at least one day.';add.disabled=false;return}
      try{var x=days.length===7?await call('staff_save_sitting_window',{p_original_time:null,p_start_time:tt[0],p_end_time:tt[1],p_active:true}):await call('staff_add_sitting',{p_start_time:tt[0],p_end_time:tt[1],p_days:days});toast('New sitting added.');draw(x)}
      catch(er){fb.textContent=notice(er);add.disabled=false}
    };
    var dhw=pane.querySelector('#dhwhich');if(dhw)dhw.onchange=function(){var o=HR.filter(function(x){return x.id===dhw.value})[0];if(o){$('dhfirst').value=clock(o.first);$('dhlast').value=clock(o.last)}};
    var dha=pane.querySelector('#dhadd');if(dha)dha.onclick=async function(){var card=dha.closest('.kz150'),fb=card.querySelector('.op-feedback'),d=$('dhdate').value;
      if(!d){fb.textContent='Choose a date.';return}var tt=validTimes($('dhfirst').value,$('dhlast').value,fb);if(!tt)return;
      fb.textContent='';dha.disabled=true;
      try{var x=await call('staff_save_date_hours',{p_date:d,p_hours_id:dhw.value,p_first:tt[0],p_last:tt[1]});toast('Special hours saved for '+kgDate(d)+'.');draw(x)}
      catch(er){fb.textContent=notice(er);dha.disabled=false}};
    pane.querySelectorAll('[data-dh-rm]').forEach(function(b){b.onclick=async function(){var k=b.dataset.dhRm.split('|'),f=b.dataset.first,l=b.dataset.last;b.disabled=true;
      try{var x=await call('staff_remove_date_hours',{p_date:k[0],p_hours_id:k[1]});draw(x);
        toast('Back to regular hours on '+kgDate(k[0])+'.',async function(){try{draw(await call('staff_save_date_hours',{p_date:k[0],p_hours_id:k[1],p_first:f,p_last:l}));toast('Special hours put back.')}catch(e){toast(notice(e))}})}
      catch(er){toast(notice(er));b.disabled=false}}});
    pane.querySelectorAll('[data-op-save-hour]').forEach(function(b){b.onclick=async function(){
      var card=b.closest('.op-card'),fb=card.querySelector('.op-feedback'),inputs=card.querySelectorAll('.op-time input'),tt=validTimes(inputs[0].value,inputs[1].value,fb);if(!tt)return;
      var days=Array.from(card.querySelectorAll('[data-op-day]:checked')).map(function(x){return +x.dataset.opDay});
      var duration=+card.querySelector('.op-duration-field').value,space=+card.querySelector('.op-slot-field').value;
      if(!days.length||duration<30||duration>360||[15,30,60].indexOf(space)<0){fb.textContent='Select at least one operating day, a reservation length from 30–360 minutes, and arrival spacing of 15, 30 or 60 minutes.';return}
      fb.textContent='';b.disabled=true;
      try{var x=await call('staff_save_operating_hours',{p_id:card.dataset.opHour,p_first:tt[0],p_last:tt[1],p_days:days,p_slot_minutes:space,p_duration_minutes:duration,p_active:card.querySelector('[data-op-hour-active]').checked});toast('Booking hours saved.');draw(x)}
      catch(er){fb.textContent=notice(er);b.disabled=false}
    }});
  }
  draw(data);
}

var RKINDS=[['run_sheet','Floor sheet','Sent at 3:00 PM: table by table, celebrations, VIPs, returning guests, high chairs and requests. Late changes after 3:00 PM go here too.'],
  ['kitchen','Kitchen sheet','Sent at 3:00 PM: covers, children’s meals, every allergy and dietary need, and celebration desserts. Late changes go here too.'],
  ['alert','New bookings and morning summary','Each new booking or request as it arrives, guest cancellations, and the 9:00 AM summary.']];
function okEmail(v){return /^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(v)}
async function paneEmails(s,admin){
  var x=s.settings||{},el=$('spane');
  el.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>';
  try{var R=await call('staff_get_recipients')}catch(e){el.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  var h='<div class="stack"><p class="small muted" style="margin:0">'+(admin?'Add as many people as you like to each email. The first address is the main one; everyone else is copied in.':'Only an admin can change who gets these emails.')+'</p>';
  RKINDS.forEach(function(k){var r=R[k[0]]||{to:'',cc:[]};
    h+='<div class="panel stack rcard" data-k="'+k[0]+'"><div><h2>'+esc(k[1])+'</h2><p class="small muted" style="margin-top:4px">'+esc(k[2])+'</p></div>'+
      '<label class="f">Send to<input class="rto" type="email" value="'+esc(r.to||'')+'"'+(admin?'':' disabled')+'></label>'+
      '<div class="f">Copy to <small>'+(admin?'Type an address and press Add.':'')+'</small><div class="ccl"></div>'+(admin?'<div class="row ccadd"><input class="rnew" type="email" placeholder="name@kazumifiji.com"><button class="btn sm radd" type="button">Add</button></div>':'')+'</div>'+
      '<div class="rmsg"></div>'+(admin?'<div class="row"><button class="btn primary sm rsave" type="button">Save</button><span class="small muted rstate"></span></div>':'')+'</div>'});
  h+='<div class="panel stack"><h2>Where guest replies go</h2><p class="small muted" style="margin-top:-6px">When a guest replies to any booking email.</p><label class="f"><input id="sg" aria-label="Reply-to address for guest emails" type="email" value="'+esc(x.guest_reply_to||'')+'"'+(admin?'':' disabled')+'></label><div id="smsg"></div>'+(admin?'<div class="row"><button class="btn primary sm" id="ssv">Save</button></div>':'')+'</div>';
  h+='<div class="panel"><h2 style="margin-bottom:10px">What runs on its own</h2><dl class="kv"><dt>9:00 AM</dt><dd>Morning summary: today\u2019s guests, allergies, parties without a grill and requests waiting (overdue ones in red).</dd><dt>10:00 AM</dt><dd>Reminder email to guests booked for tomorrow.</dd><dt>3:00 PM</dt><dd>Floor sheet and kitchen sheet for today. Any change after this sends a late change alert to both lists.</dd><dt>Overnight</dt><dd>Parties marked as arrived are closed off as completed.</dd><dt>Any time</dt><dd>Guests get emails when a request is confirmed or declined, and when you change or cancel their booking with the email box ticked.</dd></dl></div></div>';
  el.innerHTML=h;
  el.querySelectorAll('.rcard').forEach(function(card){
    var kind=card.dataset.k,list=((R[kind]||{}).cc||[]).slice(),dirty=false;
    function mark(d){dirty=d;var st=card.querySelector('.rstate');if(st)st.textContent=d?'Unsaved changes':''}
    function paint(){var c=card.querySelector('.ccl');c.innerHTML=list.length?list.map(function(e,i){return '<span class="ccchip">'+esc(e)+(admin?'<button type="button" aria-label="Remove '+esc(e)+'" data-i="'+i+'">×</button>':'')+'</span>'}).join(''):'<span class="small muted">Nobody copied in yet.</span>';
      c.querySelectorAll('[data-i]').forEach(function(b){b.onclick=function(){list.splice(+b.dataset.i,1);paint();mark(true)}})}
    paint();if(!admin)return;
    var inp=card.querySelector('.rnew'),msg=card.querySelector('.rmsg');
    function add(){var v=inp.value.trim().toLowerCase();msg.innerHTML='';if(!v)return;
      var parts=v.split(/[\s,;]+/).filter(Boolean),bad=parts.filter(function(p){return !okEmail(p)});
      if(bad.length){msg.innerHTML='<div class="msg err">'+esc(bad.join(', '))+' does not look like an email address.</div>';return}
      parts.forEach(function(p){if(list.indexOf(p)<0&&p!==card.querySelector('.rto').value.trim().toLowerCase())list.push(p)});inp.value='';paint();mark(true);inp.focus()}
    card.querySelector('.radd').onclick=add;inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();add()}});
    card.querySelector('.rto').addEventListener('input',function(){mark(true)});
    card.querySelector('.rsave').onclick=async function(){var b=this,to=card.querySelector('.rto').value.trim();msg.innerHTML='';
      if(inp.value.trim())add();
      if(!okEmail(to)){msg.innerHTML='<div class="msg err">Enter one main email address in Send to.</div>';return}
      b.disabled=true;try{R=await call('staff_set_recipients',{p_kind:kind,p_to:to,p_cc:list});list=(R[kind].cc||[]).slice();paint();mark(false);msg.innerHTML='<div class="msg ok">Saved. '+(list.length?(list.length+1)+' people':'1 person')+' will get the '+esc(k_name(kind))+'.</div>'}catch(e){msg.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}b.disabled=false};
  });
  var b=$('ssv');if(b)b.onclick=async function(){b.disabled=true;try{var cur=await call('staff_get_recipients');await call('staff_update_settings',{p_alert_email:cur.alert.to,p_run_sheet_email:cur.run_sheet.to,p_guest_reply_to:$('sg').value});$('smsg').innerHTML='<div class="msg ok">Saved.</div>'}catch(e){$('smsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}b.disabled=false};
}
async function paintMfa(enrol){
  var el=$('mfa');if(!el)return;if(!sb.auth.mfa){el.hidden=true;return}
  var lock=me.role==='admin'&&me.admin_mfa_required;
  if(enrol){
    el.innerHTML='<h2>Set up two-step sign-in</h2><ol class="small steps"><li>Install an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.</li><li>In the app, add an account and scan this code.</li><li>Enter the 6-digit code the app shows.</li></ol><div class="qr"><img alt="Code to scan with your authenticator app" src="'+esc(enrol.qr)+'"></div><p class="small muted">Cannot scan it? Type this key into the app instead: <span class="secret sm">'+esc(enrol.secret)+'</span></p><label class="f">Code from the app<input id="mfc" inputmode="numeric" autocomplete="one-time-code" maxlength="7"></label><div id="mfm"></div><div class="row"><button class="btn primary" id="mfo">Turn on</button><button class="btn" id="mfx">Cancel</button></div>';
    $('mfo').onclick=async function(){var b=this;b.disabled=true;var r=await sb.auth.mfa.challengeAndVerify({factorId:enrol.id,code:$('mfc').value.replace(/\s/g,'')});
      if(r.error){$('mfm').innerHTML='<div class="msg err">That code did not work. Enter the newest code from the app.</div>';b.disabled=false;return}
      try{me=await call('staff_me')}catch(x){}toast('Two-step sign-in is on. You will enter a code each time you sign in.');paintMfa()};
    $('mfx').onclick=async function(){try{await sb.auth.mfa.unenroll({factorId:enrol.id})}catch(x){}paintMfa()};
    return}
  el.innerHTML='<h2>Two-step sign-in</h2>'+(me.mfa?'<p class="small"><b>On.</b> You enter a code from your authenticator app each time you sign in.</p>'+(lock?'<p class="small muted">Admins must keep this on.</p>':'<div class="row"><button class="btn sm" id="mfoff">Turn off</button></div>'):
    '<p class="small muted">'+(me.role==='admin'?'Recommended for admins. ':'')+'After your password, you also enter a 6-digit code from an app on your phone, so a stolen password alone is not enough.</p><div id="mfm"></div><div class="row"><button class="btn primary sm" id="mfon">Set up</button></div>');
  var on=$('mfon');if(on)on.onclick=async function(){on.disabled=true;
    try{var f=await sb.auth.mfa.listFactors();await Promise.all(((f.data&&f.data.all)||[]).filter(function(x){return x.status!=='verified'}).map(function(x){return sb.auth.mfa.unenroll({factorId:x.id})}));
      var r=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Kazumi staff '+Date.now()});if(r.error)throw r.error;var q=r.data.totp.qr_code||'',m=q.match(/^data:image\/svg\+xml;[^,]*,(<svg[\s\S]*)$/);if(m)q='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(m[1]);paintMfa({id:r.data.id,qr:q,secret:r.data.totp.secret})}
    catch(x){$('mfm').innerHTML='<div class="msg err">Could not start set-up. Refresh the page and try again.</div>';on.disabled=false}};
  var off=$('mfoff');if(off)off.onclick=async function(){if(!confirm('Turn off two-step sign-in? You will sign in with your password only.'))return;
    try{var f=await totpFactor();if(f){var r=await sb.auth.mfa.unenroll({factorId:f.id});if(r.error)throw r.error}try{await sb.auth.refreshSession()}catch(x){}me=await call('staff_me');toast('Two-step sign-in is off.');paintMfa()}catch(x){toast(errText(x))}};
}
function k_name(k){return k==='run_sheet'?'floor sheet':k==='kitchen'?'kitchen sheet':'booking alerts and morning summary'}
function paneStaff(s,admin){
  if(!admin){$('spane').innerHTML='<div class="panel"><p class="muted">Only an admin can manage staff accounts.</p></div>';return}
  $('spane').innerHTML='<div class="stack"><div class="panel"><h2 style="margin-bottom:10px">Staff accounts</h2><table class="t rt"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Last signed in</th><th>Two-step</th><th></th></tr></thead><tbody>'+s.staff.map(function(u){var self=u.email===s.me.email;
    return '<tr><td data-l="Name"><b>'+esc(u.name||'')+'</b></td><td data-l="Email">'+esc(u.email)+'</td><td data-l="Role"><select aria-label="Role for '+esc(u.email)+'" data-role="'+esc(u.email)+'"'+(self?' disabled':'')+'><option value="staff"'+(u.role==='staff'?' selected':'')+'>Staff</option><option value="admin"'+(u.role==='admin'?' selected':'')+'>Admin</option></select></td><td data-l="Access">'+(self?'You':'<label class="check"><input type="checkbox" data-active="'+esc(u.email)+'"'+(u.active?' checked':'')+'>Can sign in</label>')+'</td><td class="small muted" data-l="Last signed in">'+(u.last_sign_in?esc(stamp(u.last_sign_in)):'Never')+'</td><td class="small" data-l="Two-step">'+(u.mfa?'On':'<span class="muted">Off</span>')+'</td><td style="text-align:right">'+(self?'':'<button class="btn sm" data-reset="'+esc(u.email)+'">New password</button>'+(u.mfa?' <button class="btn sm" data-mfaoff="'+esc(u.email)+'">Turn off two-step</button>':''))+'</td></tr>'}).join('')+'</tbody></table><div id="umsg" style="margin-top:12px"></div></div>'+
    '<div class="panel stack"><h2>Two-step sign-in for admins</h2><label class="check"><input type="checkbox" id="amfa"'+((s.settings||{}).require_admin_mfa?' checked':'')+'>Admins must use two-step sign-in</label><p class="small muted">Admins without it can still run service, but cannot change settings or accounts until they turn it on. Turn on your own first, under My account.</p></div>'+
    '<div class="panel stack"><h2>Add a staff member</h2><p class="small muted">They get a temporary password to sign in with, and choose their own straight away. Staff can do everything except change settings and accounts.</p><div class="grid3"><label class="f">Name<input id="an"></label><label class="f">Email<input id="ae" type="email"></label><label class="f">Role<select id="ar"><option value="staff">Staff</option><option value="admin">Admin</option></select></label></div><div id="amsg"></div><div class="row"><button class="btn primary" id="aadd">Add staff member</button></div></div></div>';
  function showPw(el,r){el.innerHTML='<div class="msg ok">Give '+esc(r.email)+' this temporary password. It is shown only once.<div style="margin-top:8px"><span class="secret">'+esc(r.temp_password)+'</span></div><div class="small" style="margin-top:6px">Sign in at '+esc(location.origin+location.pathname)+'</div></div>'}
  $('spane').querySelectorAll('[data-role]').forEach(function(sel){sel.onchange=async function(){var e=sel.dataset.role,a=$('spane').querySelector('[data-active="'+e+'"]');try{await call('staff_set_staff',{p_email:e,p_active:a?a.checked:true,p_role:sel.value});toast('Role saved.')}catch(x){toast(errText(x))}}});
  $('spane').querySelectorAll('[data-active]').forEach(function(cb){cb.onchange=async function(){var e=cb.dataset.active,sel=$('spane').querySelector('[data-role="'+e+'"]');try{await call('staff_set_staff',{p_email:e,p_active:cb.checked,p_role:sel.value});toast(cb.checked?'Access turned on.':'Access turned off.')}catch(x){toast(errText(x));cb.checked=!cb.checked}}});
  $('spane').querySelectorAll('[data-reset]').forEach(function(b){b.onclick=async function(){if(!confirm('Give '+b.dataset.reset+' a new temporary password? Their current password stops working.'))return;try{var r=await call('staff_reset_staff_password',{p_email:b.dataset.reset});showPw($('umsg'),r)}catch(x){toast(errText(x))}}});
  $('spane').querySelectorAll('[data-mfaoff]').forEach(function(b){b.onclick=async function(){var e=b.dataset.mfaoff;if(!confirm('Turn off two-step sign-in for '+e+'? Use this if they lost their phone. They are signed out everywhere and can set it up again.'))return;try{var r=await call('staff_reset_staff_mfa',{p_email:e});toast('Two-step sign-in is off for '+e+'.');paneStaff(r,true)}catch(x){toast(errText(x))}}});
  var am=$('amfa');if(am)am.onchange=async function(){try{await call('staff_set_admin_mfa',{p_on:am.checked});me.admin_mfa_required=am.checked;toast(am.checked?'Admins now need two-step sign-in.':'Two-step sign-in is now optional for admins.')}catch(x){toast(errText(x));am.checked=!am.checked}};
  $('aadd').onclick=async function(){var b=this;b.disabled=true;try{var r=await call('staff_add_staff',{p_email:$('ae').value,p_name:$('an').value,p_role:$('ar').value});showPw($('amsg'),r);$('an').value='';$('ae').value=''}catch(x){$('amsg').innerHTML='<div class="msg err">'+esc(errText(x))+'</div>'}b.disabled=false};
}
function paneMe(){
  $('spane').innerHTML='<div class="stack" style="max-width:520px"><div class="panel stack"><h2>Change my password</h2><p class="small muted">Signed in as '+esc(me.email)+'. Use at least 10 characters.</p><label class="f">New password<input type="password" id="m1" autocomplete="new-password"></label><label class="f">Repeat new password<input type="password" id="m2" autocomplete="new-password"></label><div id="mmsg"></div><div class="row"><button class="btn primary" id="msv">Save password</button></div></div><div class="panel stack" id="mfa"></div></div>';
  paintMfa();
  $('msv').onclick=async function(){var a=$('m1').value,b=$('m2').value,m=$('mmsg');if(a.length<10){m.innerHTML='<div class="msg err">Use at least 10 characters.</div>';return}if(a!==b){m.innerHTML='<div class="msg err">The two passwords do not match.</div>';return}
    var r=await sb.auth.updateUser({password:a});m.innerHTML=r.error?'<div class="msg err">'+esc(r.error.message)+'</div>':'<div class="msg ok">Password saved.</div>';if(!r.error){$('m1').value='';$('m2').value=''}};
}

/* v139 (27 Oct 2026, cross-hub audit, shared standard): Help and My account sit in the side panel footer and the phone
   More sheet for every role. Staff could not change their own password before, because My account lived only under
   Settings, which staff cannot open. Same password rules and call as paneMe; two-step sign-in stays in Settings. */
function kzAccountSheet(){
  var sr=hdSheet('My account','Signed in as '+esc((me&&me.email)||'')+'.','<div class="stack"><label class="f">New password<input type="password" id="ka1" autocomplete="new-password"></label><label class="f">Repeat new password<input type="password" id="ka2" autocomplete="new-password"></label><p class="small muted"><i>Use at least 10 characters.</i></p><div id="kamsg" role="status"></div></div>','<button class="btn primary" id="kasv">Save password</button><button class="btn" id="kax">Close</button>');
  if(!sr)return;$('kax').onclick=closeSearch;
  $('kasv').onclick=async function(){var a=$('ka1').value,b=$('ka2').value,m=$('kamsg'),btn=$('kasv');
    if(a.length<10){m.innerHTML='<div class="msg err">Use at least 10 characters.</div>';return}
    if(a!==b){m.innerHTML='<div class="msg err">The two passwords do not match.</div>';return}
    btn.disabled=true;btn.textContent='Saving';var r;try{r=await sb.auth.updateUser({password:a})}catch(e){r={error:{message:'Could not reach the system. Check the connection and try again.'}}}
    btn.disabled=false;btn.textContent='Save password';
    if(r.error){m.innerHTML='<div class="msg err">'+esc(r.error.message)+'</div>';return}
    m.innerHTML='<div class="msg ok">Password saved.</div>';$('ka1').value='';$('ka2').value=''};
}
function kzHelpSheet(){
  var T=[['Find a booking','Tap Find a booking and type part of a name or phone number.'],
    ['When guests arrive','Find their booking, open it and tap Arrived. If they never come, tap No-show.'],
    ['New booking or walk-in','Tap New booking. Choosing today makes it a walk-in.'],
    ['Need a manager?','If something is not allowed for your role, tap Send to a manager and add a short note.'],
    ['Still stuck?','Ask your manager on shift.']];
  var sr=hdSheet('Help','Everyday tasks in the Marketing & Business Intelligence Hub.','<ol class="stack" style="margin:0;padding-left:22px">'+T.map(function(t){return '<li><b>'+t[0]+'</b><br><span class="muted">'+t[1]+'</span></li>'}).join('')+'</ol>'+(kzPracticeOn()?'':'<p class="small muted"><i>New here? Practice mode lets you try everything on pretend bookings.</i></p>'),
    (kzPracticeOn()?'':'<button class="btn" id="khp">Practice mode</button>')+'<button class="btn primary" id="khx">Close</button>');
  if(!sr)return;$('khx').onclick=closeSearch;var pb=$('khp');if(pb)pb.onclick=function(){closeSearch();kzPracticeGo(true)};
}

/* ---------- start ---------- */
function start(){
  if(!kzPracticeOn()&&(!window.supabase||!window.supabase.createClient)){root.innerHTML='<div class="login"><div class="msg err">Could not load the sign-in service. Check the connection and refresh.</div></div>';return}
  /* v85: practice mode runs on a pretend night on this device only; it never connects to the booking system */
  if(kzPracticeOn()){kzPracticeStart();return}
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'kazumi-staff'}});
  sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT'){me=null;loginView()}});
  boot();
}
/* ---------- À la carte floor: dining room tables, yakitori counter and sushi bar seats on a timeline ---------- */
var AREAS=[['dining_room','Dining room'],['yakitori_counter','Yakitori counter'],['sushi_bar','Sushi bar']];
PREF.sushi_bar='Sushi bar';
function alcOn(){return !!(state.alc&&state.alc.floor&&state.alc.floor.length)}
function hm2m(t){return (+t.slice(0,2))*60+(+t.slice(3,5))}
function m2hm(m){return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function alcStay(p){var s=state.alc&&state.alc.stay&&state.alc.stay[p.id];return s||(p.session_time<'16:00'?90:120)}
function alcHours(meal){var h=((state.alc&&state.alc.hours)||[]).filter(function(x){return x.period===meal})[0];return h||(meal==='lunch'?{first:'11:30',last:'14:00',minutes:90}:{first:'17:30',last:'21:00',minutes:120})}
function alcItem(code){return ((state.alc&&state.alc.floor)||[]).filter(function(f){return f.code===code})[0]}
function alcNames(codes){var it=(codes||[]).map(alcItem).filter(Boolean);if(!it.length)return '';var a=it[0].area;
  if(a!=='dining_room'){var n=it.map(function(f){return f.name.replace(/^\D+/,'')});return (a==='sushi_bar'?'Sushi bar ':'Yakitori ')+(n.length>1?n[0]+' to '+n[n.length-1]:n[0])}
  return it.map(function(f){return f.name}).join(' + ')}
function alcArea(p){var f=alcItem((p.tables||[])[0]);return f?f.area:(p.seating_pref==='yakitori_counter'||p.seating_pref==='sushi_bar'?p.seating_pref:'dining_room')}
function alcOverlap(p,q){var a=hm2m(p.session_time),b=a+alcStay(p),c=hm2m(q.session_time),d=c+alcStay(q);return a<d&&c<b}
function alcBusy(p,parties){var busy={};parties.forEach(function(q){if(q.id!==p.id&&(q.tables||[]).length&&alcOverlap(p,q))q.tables.forEach(function(c){busy[c]=q})});return busy}
/* best free place, same order as the database: smallest table that fits, then two joinable tables; at a counter, side-by-side seats */
function alcBest(p,area,parties){var busy=alcBusy(p,parties),fl=state.alc.floor.filter(function(f){return f.area===area}),n=p.size;
  if(area==='dining_room'){var one=fl.filter(function(f){return f.seats>=n&&!busy[f.code]}).sort(function(a,b){return a.seats-b.seats})[0];if(one)return [one.code];
    var best=null;fl.forEach(function(a,i){fl.slice(i+1).forEach(function(b){if(a.join&&a.join===b.join&&!busy[a.code]&&!busy[b.code]&&a.seats+b.seats>=n&&(!best||a.seats+b.seats<best.s))best={s:a.seats+b.seats,c:[a.code,b.code]}})});return best?best.c:null}
  for(var i=0;i+n<=fl.length;i++){var ok=true;for(var j=i;j<i+n;j++)if(busy[fl[j].code]){ok=false;break}if(ok)return fl.slice(i,i+n).map(function(f){return f.code})}return null}
function alcHtml(meal,rows){
  var title=meal==='lunch'?'Lunch':'Dinner',h=alcHours(meal),start=hm2m(h.first),end=Math.max(hm2m(h.last)+h.minutes,start+60);
  rows.forEach(function(p){end=Math.max(end,hm2m(p.session_time)+alcStay(p))});
  start=Math.floor(start/60)*60;end=Math.ceil(end/60)*60;var span=end-start;
  var waiting=rows.filter(function(p){return !(p.tables||[]).length}),arr=rows.filter(function(p){return p.arrived_at}).length;
  var seat=state.aseat&&findParty(state.aseat),seatHere=seat&&rows.some(function(p){return p.id===seat.id});
  var busy=seatHere?alcBusy(seat,rows):{},now=state.date===fijiToday()?hm2m(nowHM()):null;
  var hrs='';for(var m=start;m<end;m+=60)hrs+='<span style="left:'+((m-start)/span*100)+'%">'+esc(tl(m2hm(m)).replace(':00',''))+'</span>';
  var x='<section class="svc svc-alc" id="alc-'+meal+'"><div class="svc-head"><h2>'+title+'</h2><span class="stat"><b>'+sum(rows)+'</b> guests</span><span class="stat"><b>'+rows.length+'</b> '+(rows.length===1?'booking':'bookings')+'</span><span class="stat"><b>'+arr+'</b> arrived</span></div>';
  if(seatHere){var bp=alcBest(seat,alcArea(seat),rows);
    x+='<div class="seatbar alc-seatbar" role="status"><div><b'+pTag(seat)+'>'+esc(seat.name)+' ('+seat.size+')</b><span>'+esc(tl(seat.session_time)+' to '+tl(m2hm(hm2m(seat.session_time)+alcStay(seat))))+'. Tap a free table or seat.</span></div><div class="row">'+
      (bp?'<button class="btn go" data-abest="'+bp.join(',')+'">Suggest: '+esc(alcNames(bp))+'</button>':'<span class="small">Nothing free fits. Tap any table to seat them anyway.</span>')+'<button class="btn" id="aseatx">Cancel</button></div></div>'}
  if(waiting.length)x+='<div class="alc-wait"><span class="alc-wait-h">Not seated yet</span>'+waiting.map(function(p){return '<button class="alc-chip'+(seat&&seat.id===p.id?' on':'')+'" data-aseat="'+p.id+'"><b'+pTag(p)+'>'+esc(p.name)+'</b> '+p.size+', '+esc(tl(p.session_time))+(p.seating_pref==='yakitori_counter'||p.seating_pref==='sushi_bar'?', '+esc(PREF[p.seating_pref]):'')+'</button>'}).join('')+'</div>';
  AREAS.forEach(function(A){var fl=state.alc.floor.filter(function(f){return f.area===A[0]});if(!fl.length)return;
    var inArea=rows.filter(function(p){return (p.tables||[]).some(function(c){var f=alcItem(c);return f&&f.area===A[0]})});
    var freeNow=now!=null?fl.filter(function(f){return !inArea.some(function(p){var a=hm2m(p.session_time);return p.tables.indexOf(f.code)>=0&&a<=now&&now<a+alcStay(p)})}).length:null;
    x+='<div class="alc-area" data-area="'+A[0]+'"><div class="alc-area-h"><h3>'+A[1]+'</h3><span class="small muted">'+fl.length+(A[0]==='dining_room'?(fl.length===1?' table':' tables'):' seats')+', '+fl.reduce(function(n,f){return n+f.seats},0)+' guests'+(freeNow!=null?', '+freeNow+' free now':'')+'</span></div>'+
      '<div class="tl'+(seatHere?' tl-seating':'')+'" style="--hrs:'+(span/60)+'"><div class="tl-hrs" aria-hidden="true"><span class="tl-lab"></span><div class="tl-track">'+hrs+'</div></div>';
    fl.forEach(function(f,fi){var segs=inArea.filter(function(p){return p.tables.indexOf(f.code)>=0}),st='';
      if(seatHere){st=busy[f.code]?' tl-busy':' tl-free';if(A[0]==='dining_room'&&f.seats<seat.size&&!busy[f.code])st=' tl-small'}
      x+='<div class="tl-row'+st+'" data-acode="'+f.code+'" role="'+(seatHere?'button':'group')+'"'+(seatHere?' tabindex="0" aria-label="'+esc(f.name+', '+(busy[f.code]?'in use':'free'))+'"':'')+'><span class="tl-lab"><b>'+esc(A[0]==='dining_room'?f.name.replace(/^Table\s+/i,''):f.name.replace(/^\D+/,''))+'</b>'+(A[0]==='dining_room'?'<small>'+f.seats+'</small>':'')+'</span><div class="tl-track">'+
        segs.map(function(p){var a=hm2m(p.session_time),first=p.tables[0]===f.code||A[0]==='dining_room';
          return '<button class="tl-bar'+(p.arrived_at?' is-arr':'')+(p.status!=='confirmed'?' is-req':'')+(p.allergens&&p.allergens.length?' has-alg':'')+(first?'':' tl-cont')+'" data-id="'+p.id+'" style="left:'+((a-start)/span*100)+'%;width:'+(alcStay(p)/span*100)+'%;'+(CM[p.id]?chipStyle(CM[p.id]).replace(/^ style="|"$/g,''):'')+'" aria-label="'+esc(p.name+', '+p.size+' guests, '+tl(p.session_time))+'">'+(first?'<span class="tl-n">'+esc(p.name)+'</span><span class="tl-s">'+p.size+'</span>':'')+'</button>'}).join('')+
        (now!=null&&now>=start&&now<=end?'<i class="tl-now" style="left:'+((now-start)/span*100)+'%"></i>':'')+'</div></div>'});
    x+='</div></div>'});
  return x+'</section>';
}
async function alcSeat(id,codes,force){
  var p=findParty(id);if(!p)return;
  try{var r=await call('staff_seat_alc',{p_id:id,p_codes:codes,p_force:!!force});
    if(r&&r.ok===false){var c=(r.conflicts||[]).map(function(q){return q.name+' ('+q.size+') at '+tl(q.time)}),msg=[];
      if(c.length)msg.push('Already in use by '+c.join(', ')+'.');if(r.seats<r.size)msg.push('It seats '+r.seats+' and the party is '+r.size+'.');
      if(!confirm(msg.join(' ')+' Seat here anyway?'))return;r=await call('staff_seat_alc',{p_id:id,p_codes:codes,p_force:true})}
    state.aseat=null;toast(p.name+' seated at '+alcNames(codes)+'.');await loadDay()}
  catch(e){toast(errText(e))}
}
function alcPick(code){var p=state.aseat&&findParty(state.aseat);if(!p)return;var f=alcItem(code);if(!f)return;
  if(f.area==='dining_room')return alcSeat(p.id,[code]);
  var fl=state.alc.floor.filter(function(x){return x.area===f.area}),i=fl.indexOf(f),n=Math.min(p.size,fl.length);if(i+n>fl.length)i=fl.length-n;
  alcSeat(p.id,fl.slice(i,i+n).map(function(x){return x.code}))}
function bindAlc(el){
  el.querySelectorAll('[data-aseat]').forEach(function(b){b.addEventListener('click',function(){state.aseat=state.aseat===b.dataset.aseat?null:b.dataset.aseat;paintDay();var s=$('day').querySelector('.alc-seatbar');if(s)s.scrollIntoView({block:'nearest'})})});
  el.querySelectorAll('[data-abest]').forEach(function(b){b.addEventListener('click',function(){alcSeat(state.aseat,b.dataset.abest.split(','))})});
  var x=$('aseatx');if(x)x.onclick=function(){state.aseat=null;paintDay()};
  el.querySelectorAll('.tl-seating .tl-row').forEach(function(r){function go(e){e.preventDefault();e.stopPropagation();alcPick(r.dataset.acode)}
    r.addEventListener('click',go,true);r.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')go(e)})});
}
function alcColors(d){(d.dining||[]).forEach(function(p){if(CM[p.id])return;var h=0;for(var i=0;i<p.id.length;i++)h=(h*31+p.id.charCodeAt(i))%9973;CM[p.id]=PCOL[h%PCOL.length]})}
/* Settings: à la carte tables and counter seats */
async function paneFloor(){
  var el=$('spane');var fl;
  try{fl=await call('staff_get_floor')}catch(e){el.innerHTML='<div class="panel"><h2>Tables and counters</h2><p class="muted">This needs the à la carte database update. Once it has been run, the dining room tables, yakitori counter and sushi bar seats appear here.</p></div>';return}
  var admin=true;try{var s=await call('staff_get_settings');admin=s.me&&s.me.role==='admin'}catch(e){}
  function row(f,i,list){var dr=f.area==='dining_room';
    return '<div class="frow'+(f.active===false?' off':'')+'" data-f="'+f.code+'"><input class="fname" aria-label="Name" maxlength="30" value="'+esc(f.name)+'"'+(admin?'':' disabled')+'>'+
      (dr?'<div class="fstep" role="group" aria-label="Seats"><button class="btn sm" data-fs="-1" aria-label="One seat fewer"'+(admin?'':' disabled')+'>−</button><b class="fseats">'+f.seats+'</b><button class="btn sm" data-fs="1" aria-label="One seat more"'+(admin?'':' disabled')+'>+</button></div>'+
        '<label class="fjoin"><span>Joins with</span><select'+(admin?'':' disabled')+'><option value="">None</option>'+list.filter(function(o){return o.code!==f.code}).map(function(o){return '<option value="'+o.code+'"'+(f.join&&o.join===f.join?' selected':'')+'>'+esc(o.name)+'</option>'}).join('')+'</select></label>':'')+
      '<label class="check fact2"><input type="checkbox" class="fon"'+(f.active!==false?' checked':'')+(admin?'':' disabled')+'>In use</label>'+
      (admin?'<div class="fmv"><button class="btn sm" data-fm="-1" aria-label="Move up"'+(i?'':' disabled')+'>Up</button><button class="btn sm" data-fm="1" aria-label="Move down"'+(i<list.length-1?'':' disabled')+'>Down</button><button class="btn primary sm fsave" hidden>Save</button></div>':'')+'</div>'}
  function paint(){
    el.innerHTML='<div class="stack"><div class="panel"><h2>Tables and counters</h2><p class="muted" style="margin:6px 0 0">Guests book a time, every 15 minutes. The team seats each party at a table or counter seat on the Floor view. A seated table shows as taken for 90 minutes at lunch and 120 at dinner.</p>'+(admin?'':'<p class="small muted">Only admins can change these.</p>')+'</div>'+
      AREAS.map(function(A){var list=fl.filter(function(f){return f.area===A[0]}),on=list.filter(function(f){return f.active!==false});
        return '<details class="fold panel" data-area="'+A[0]+'"'+(state.floorOpen===A[0]?' open':'')+'><summary><span class="fold-t">'+A[1]+'</span><span class="fold-h">'+on.length+(A[0]==='dining_room'?(on.length===1?' table, ':' tables, ')+on.reduce(function(n,f){return n+f.seats},0)+' guests':' seats')+'</span></summary><div class="fold-b">'+
          '<div class="frows">'+list.map(function(f,i){return row(f,i,list)}).join('')+'</div>'+(admin?'<div class="row" style="margin-top:12px"><button class="btn" data-fadd="'+A[0]+'">'+(A[0]==='dining_room'?'Add a table':'Add a seat')+'</button></div>':'')+'</div></details>'}).join('')+'</div>';
    el.querySelectorAll('details.fold').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)state.floorOpen=d.dataset.area})});
    el.querySelectorAll('.frow').forEach(function(r){var f=fl.filter(function(x){return x.code===r.dataset.f})[0],sv=r.querySelector('.fsave');
      function dirty(){r.classList.add('dirty');if(sv)sv.hidden=false}
      r.querySelectorAll('input,select').forEach(function(x){x.addEventListener('input',dirty);x.addEventListener('change',dirty)});
      r.querySelectorAll('[data-fs]').forEach(function(b){b.onclick=function(){var n=Math.max(1,Math.min(20,(+r.querySelector('.fseats').textContent)+(+b.dataset.fs)));r.querySelector('.fseats').textContent=n;dirty()}});
      r.querySelectorAll('[data-fm]').forEach(function(b){b.onclick=async function(){try{fl=await call('staff_move_floor_item',{p_code:f.code,p_dir:+b.dataset.fm});paint()}catch(e){toast(errText(e))}}});
      if(sv)sv.onclick=async function(){var j=r.querySelector('.fjoin select'),jv=null;
        if(j&&j.value){var o=fl.filter(function(x){return x.code===j.value})[0];jv=o.join||f.join||('g'+f.code+o.code).toLowerCase();
          if(!o.join){try{await call('staff_save_floor_item',{p_code:o.code,p_name:o.name,p_area:o.area,p_seats:o.seats,p_join:jv,p_active:o.active!==false})}catch(e){toast(errText(e));return}}}
        try{fl=await call('staff_save_floor_item',{p_code:f.code,p_name:r.querySelector('.fname').value,p_area:f.area,p_seats:f.area==='dining_room'?+r.querySelector('.fseats').textContent:1,p_join:jv,p_active:r.querySelector('.fon').checked});toast('Saved. '+r.querySelector('.fname').value+' is updated.');paint()}catch(e){toast(errText(e))}}});
    el.querySelectorAll('[data-fadd]').forEach(function(b){b.onclick=async function(){var a=b.dataset.fadd,n=fl.filter(function(x){return x.area===a}).length+1;
      try{fl=await call('staff_save_floor_item',{p_code:null,p_name:(a==='dining_room'?'Table ':a==='sushi_bar'?'Sushi ':'Yakitori ')+n,p_area:a,p_seats:a==='dining_room'?4:1,p_join:null,p_active:true});state.floorOpen=a;toast('Added. Rename it if you like.');paint()}catch(e){toast(errText(e))}}});
  }
  paint();
}
/* Common special requests: one tap each, plus a free note */
function reqList(svc){var t=svc==='teppanyaki'?['Seat our group together','Front row view of the chef']:svc==='dining'?['Table near the yakitori grill']:[];
  return ['Quiet table'].concat(t,['Pram or stroller space','Arriving a little late','Need to leave by a set time','Surprise, please keep it quiet'])}
/* v50 (13 Oct 2026): walk-ins and booking from the floor plan.
   1. Walk-in is a large button under New booking on laptops and tablets; on phones the round + button offers New booking or Walk-in.
      Walk-in opens today's walk-in sheet from any screen: Teppanyaki (sitting, guests, suggested grill) or lunch and dinner
      (guests, then straight to the table plan). Seat now creates the booking and marks the guests as here.
   2. Tapping a grill on the seating plan (floor plan or grill cards) offers Walk-in here (today) and Book this grill.
      Book this grill opens the full form with the date and sitting filled in; once saved the party is placed on that grill,
      not pinned, so Rearrange all can still move it. Lunch and dinner tables are not reserved ahead (agreed rule). */
(function(){
  function fitFrom(s,code,n){if(!s||blockOf(s.session_time,code))return null;var fr=freeFor(s,code,'_x');if(fr>=n){var o={};o[code]=n;return o}
    if(fr<MINPART)return null;var sp={},idx=s.tables.findIndex(function(x){return x.code===code}),over=n-fr;sp[code]=fr;
    for(var d=1;d<s.tables.length&&over>0;d++){[idx+d,idx-d].forEach(function(j){if(over<=0||j<0||j>=s.tables.length)return;var c=s.tables[j].code;if(zoneOf(c)!==zoneOf(code)||blockOf(s.session_time,c))return;var room=freeFor(s,c,'_x');if(room>=over&&over>=MINPART){sp[c]=over;over=0}})}
    if(over>0)return null;var o2={};s.tables.forEach(function(x){if(sp[x.code])o2[x.code]=sp[x.code]});return o2}
  function whenDay(fn){var t0=Date.now();(function wait(){if(state.tab==='today'&&state.day&&state.date===fijiToday()&&document.querySelector('#day'))return fn();if(Date.now()-t0>8000)return;setTimeout(wait,150)})()}
  window.kzWalkIn=function(pre){pre=pre&&!pre.type?pre:{};
    if(state.tab!=='today'||state.date!==fijiToday()){state.date=fijiToday();state.seat=null;state.plan=null;go('today');whenDay(function(){walkSheet(pre)})}else walkSheet(pre)};
  /* retired 28 Oct 2026 (tidy): the v50 walk-in sheet, replaced by New booking */
function walkSheet(pre){}
  walkIn=function(e){window.kzWalkIn(e&&!e.type?e:{})};
  /* floor plan: grill sheet gets Walk-in here and Book this grill */
  function closedSit(sess){var d=state.day||{},c=(d.closures||[]).find(function(k){return !k.session_time||k.session_time===sess});if(c)return c.reason||'Closed';
    var v=(d.venue_closures||[]).find(function(k){return k.scope==='all'&&(!k.period||k.period==='dinner')});return v?(v.reason||'Closed'):null}
  function grillActs(code,sess){var s=sessionOf(sess);if(!s||blockOf(sess,code))return '';var t=fijiToday();if(state.date<t)return '';
    var cl=closedSit(sess);if(cl)return '<p class="msg warn fp-closed">Teppanyaki '+esc(s.label)+' is closed: '+esc(cl)+'. No walk-ins or new bookings for this sitting.</p>';
    return '<div class="fpacts"><button type="button" class="btn primary" data-fpb="'+code+'|'+sess+'">New booking at '+esc(tname(code))+'</button></div>'}
  var _fp=fpTap;fpTap=function(code,sess){var s=sessionOf(sess),sr=$('sr');
    if(s&&sr&&!blockOf(sess,code)&&!sitParties(s).some(function(p){return !(p.tables&&p.tables.length)})){var a0=grillActs(code,sess),t0=s.tables.find(function(t){return t.code===code})||{},fr0=freeFor(s,code,'_none'),nm0=tname(code);
      if(a0){sr.innerHTML='<div class="scrim"></div><div class="dsheet" role="dialog" aria-modal="true" aria-label="'+esc(nm0)+'"><div class="dsh-h"><div><h2>'+esc(nm0)+'</h2><p class="small muted">'+(fr0>0?fr0+' of '+t0.seats+' seats free':'Full')+' at Teppanyaki '+esc(s.label)+'. Everyone booked already has a grill; to move a party, press and hold it and drag.</p></div><button class="btn sm" id="fpx">Close</button></div>'+a0+'</div>';
        sr.querySelector('.scrim').onclick=closeSearch;$('fpx').onclick=closeSearch;return}}
    var r=_fp.apply(this,arguments);var sh=document.querySelector('#sr .dsheet'),hd=sh&&sh.querySelector('.dsh-h');if(hd&&!sh.querySelector('.fpacts')){var a=grillActs(code,sess);if(a)hd.insertAdjacentHTML('afterend',a)}return r};
  var _th=tableHtml;tableHtml=function(t,s,L,cm,seat,plan){var h=_th.apply(this,arguments);if(seat||plan||blockOf(s.session_time,t.code))return h;var used=(L.used&&L.used[t.code])||0;if(used>=t.seats)return h;var a=grillActs(t.code,s.session_time);if(!a||/fp-closed/.test(a))return h;
    var i=h.lastIndexOf('</div>');return h.slice(0,i)+a.replace('class="fpacts"','class="fpacts tc-acts noprint"')+h.slice(i)};
  
  document.addEventListener('click',function(e){var w=e.target.closest&&e.target.closest('#kzs [data-fpw],#kzs [data-fpb]');if(!w)return;e.preventDefault();e.stopPropagation();
    if(w.dataset.fpw){var a=w.dataset.fpw.split('|');closeSearch();window.kzWalkIn({svc:'teppanyaki',sit:a[1],grill:a[0]})}else{var b=w.dataset.fpb.split('|');closeSearch();window.kzWalkIn({svc:'teppanyaki',sit:b[1],grill:b[0]})}},true);
  /* Book this grill: full form, then place the party on that grill (not pinned) */
  var _rn=renderNew;renderNew=function(){var pre=state.newPre,prev=state.newMode;
    if(pre&&pre.grill){state.grillPre={date:pre.date,time:pre.time,grill:pre.grill};state.newMode='full'}else state.grillPre=null;
    var r=_rn.apply(this,arguments);state.newMode=prev;
    if(state.grillPre){var nb=document.querySelector('main .stack');if(nb&&!$('gpre'))nb.insertAdjacentHTML('afterbegin','<div class="msg info" id="gpre">Grill chosen on the seating plan: <b>'+esc(tname(state.grillPre.grill))+'</b>, '+esc(tl(state.grillPre.time))+'. The party is placed there when you book. Choose another sitting or date and the grill choice is dropped.</div>')}
    return r};
  var _call=call;call=async function(fn,args){var r=await _call.apply(this,arguments);var gp=state.grillPre;
    if(fn==='staff_create_any'&&gp&&r&&r.id&&args&&args.p_service==='teppanyaki'&&args.p_date===gp.date&&args.p_time===gp.time){state.grillPre=null;
      try{var d=await _call('staff_get_day',{p_date:gp.date}),ses=(d.sessions||[]).find(function(x){return x.session_time===gp.time}),keep=state.day;state.day=d;var sp=null;try{sp=fitFrom(ses,gp.grill,(args.p_adults||0)+(args.p_children||0))}finally{state.day=keep}
        if(sp){await _call('staff_seat_plan',{p_items:[{id:r.id,split:sp,pin:false}]});setTimeout(function(){toast('Placed at '+splitText(sp)+'.')},400)}else setTimeout(function(){toast('Not enough room at '+tname(gp.grill)+' any more. Choose a grill on the seating plan.')},400)}catch(e){}}
    return r};
  /* v54: one New booking button everywhere (no separate Walk-in button or + chooser) */
})();
/* v49 (13 Oct 2026): quick fixes from the usability audit. Dates show the weekday and month name beside every date box;
   party size on the full form is one row of buttons with a More option; the guest directory shows five filters first. */
(function(){
  function dlab(inp){if(!inp||inp.type!=='date')return;var s=inp.nextElementSibling;if(!s||!s.classList.contains('dlab')){s=document.createElement('span');s.className='dlab';s.setAttribute('aria-live','polite');inp.after(s)}
    var v=inp.value,t=/^\d{4}-\d{2}-\d{2}$/.test(v)?fmt(v,{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'';if(s.textContent!==t)s.textContent=t}
  function scanDates(){document.querySelectorAll('#kzs input[type=date]').forEach(function(i){if(!i.dataset.dl){i.dataset.dl='1';i.addEventListener('input',function(){dlab(i)});i.addEventListener('change',function(){dlab(i)})}dlab(i)})}
  function sizeMore(){['na','nc'].forEach(function(id){var inp=$(id);if(!inp||inp.dataset.more)return;var lb=inp.closest('label'),row=lb&&(lb.querySelector('.szchips')||lb.nextElementSibling);if(!row||!row.classList.contains('szchips'))return;inp.dataset.more='1';
      var nums=[].map.call(row.querySelectorAll('button[data-n]'),function(b){return +b.dataset.n}),b=document.createElement('button');b.type='button';b.className='szmore';b.textContent='More';row.appendChild(b);
      function show(on){inp.classList.toggle('szhide',!on);b.setAttribute('aria-expanded',String(on));b.classList.toggle('on',on)}
      show(nums.indexOf(parseInt(inp.value,10))<0);b.onclick=function(){show(true);inp.focus();inp.select&&inp.select()};
      row.querySelectorAll('button[data-n]').forEach(function(x){x.addEventListener('click',function(){show(false)})})})}
  function kgMore(){var c=$('kgc');if(!c||c.dataset.more===c.innerHTML.length+'')return;var bs=[].slice.call(c.querySelectorAll('[data-seg]'));var old=c.querySelector('.kg-more');if(old)old.remove();
    if(bs.length<=6){c.dataset.more=c.innerHTML.length+'';return}var open=c.classList.contains('kg-open');
    bs.forEach(function(b,i){b.hidden=!open&&i>=5&&!b.classList.contains('on')});
    var m=document.createElement('button');m.type='button';m.className='chip kg-more';m.textContent=open?'Fewer filters':'More filters ('+(bs.length-5)+')';m.setAttribute('aria-expanded',String(open));
    m.onclick=function(){c.classList.toggle('kg-open');c.dataset.more='';kgMore()};c.appendChild(m);c.dataset.more=c.innerHTML.length+''}
  var busy=false,qd=false;function run(){qd=false;if(busy)return;busy=true;try{scanDates();sizeMore();kgMore()}finally{busy=false}}
  new MutationObserver(function(){if(!qd){qd=true;requestAnimationFrame(run)}}).observe(root,{childList:true,subtree:true});
})();
/* v47 (13 Oct 2026): block a Teppanyaki grill for one sitting (not working, held for a guest, chef short). A blocked grill takes no
   online or staff bookings for that sitting and is never used by seating suggestions. Only an empty grill can be blocked.
   Splits now fill grills without allergy guests first (see splitFor) and warn when part of a party would share an allergy grill. */
ERR.GRILL_BLOCKED='That grill is blocked for this sitting. Unblock it first, or choose another grill.';
ERR.GRILL_HAS_PARTIES='Move the parties off this grill first, then block it.';
ERR.BLOCK_NO_ROOM='The other grills do not have room for this sitting\u2019s bookings, so this grill cannot be blocked.';
ERR.PAST_DATE='That date has passed.';
var BREASONS=['Not working','Held for a guest','Chef short','Other'];
function blockOf(sess,code){var b=(state.day&&state.day.blocks)||[];for(var i=0;i<b.length;i++)if(b[i].session_time===sess&&b[i].code===code)return b[i];return null}
function algWarn(s,p,sp){var L=layout(s,(function(){var o={};o[p.id]=null;return o})()),al=hasAlg(p),w=[];
  Object.keys(sp).forEach(function(c){var es=(L.by[c]||[]).filter(function(e){return e.p.id!==p.id}),nm=tname(c);
    if(!al){var a=[];es.forEach(function(e){if(hasAlg(e.p))e.p.allergens.forEach(function(x){if(a.indexOf(x)<0)a.push(x)})});
      if(a.length)w.push(nm+' has a guest with an allergy ('+a.join(', ')+'). '+sp[c]+' of this party would share it. Tell the chef.')}
    else if(es.length)w.push('This party has an allergy. '+sp[c]+' of them would share '+nm+' with other guests. Tell the chef.')});
  return w.join(' ')}
function blockCtl(t,s,n,act){if(!act)return '';var b=blockOf(s.session_time,t.code),key=t.code+'|'+s.session_time,nm=t.name||tname(t.code);
  if(b)return '<div class="tblk noprint"><span><b>Blocked</b>'+(b.reason?': '+esc(b.reason):'')+'</span><button type="button" class="btn sm" data-unblock="'+key+'">Unblock</button></div>';
  if(n)return '';
  if(state.blockAsk===key)return '<div class="tblk ask noprint" role="group" aria-label="Why is '+esc(nm)+' blocked?"><span>Block '+esc(nm)+' for this sitting. Why?</span><div class="tblk-r">'+BREASONS.map(function(r){return '<button type="button" class="btn sm" data-blockr="'+key+'|'+esc(r)+'">'+esc(r)+'</button>'}).join('')+'<button type="button" class="btn sm ghost" data-blockx="1">Cancel</button></div></div>';
  return '<button type="button" class="tblock-b noprint" data-block="'+key+'">Block for this sitting</button>'}
document.addEventListener('click',async function(e){var t=e.target.closest&&e.target.closest('#kzs [data-block],#kzs [data-blockr],#kzs [data-blockx],#kzs [data-unblock]');if(!t)return;e.preventDefault();e.stopPropagation();
  if(t.dataset.blockx){state.blockAsk=null;paintDay();return}
  if(t.dataset.block){state.blockAsk=t.dataset.block;paintDay();var f=document.querySelector('#kzs .tblk.ask button');if(f)f.focus();return}
  var a=(t.dataset.blockr||t.dataset.unblock).split('|'),un=!!t.dataset.unblock,nm=tname(a[0]);t.disabled=true;
  try{if(un)await call('staff_unblock_grill',{p_date:state.date,p_session:a[1],p_code:a[0]});else await call('staff_block_grill',{p_date:state.date,p_session:a[1],p_code:a[0],p_reason:a[2]==='Other'?null:a[2]});
    state.blockAsk=null;toast(un?nm+' is open again for this sitting.':nm+' is blocked for this sitting.');await loadDay()}
  catch(er){t.disabled=false;state.blockAsk=null;toast(errText(er));paintDay()}},true);
/* v46 (13 Oct 2026): phones show the first arriving guests without scrolling again. On phones the page name sits in the top bar
   (it stays in the page for screen readers), and "Needs action" folds into one line as on tablets; the arrow opens the full list. */
/* v45 (12 Oct 2026): New booking asks whether the guest wants Kazumi news and offers, with an optional birthday.
   Recorded with staff_record_booking_optin (wording staff-2026-10) after the booking is saved. Unticked by default. */
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function optinHtml(p,yes,d,m){function o(v,t,c){return '<option value="'+v+'"'+(v===c?' selected':'')+'>'+t+'</option>'}
  var days=o('','Day',d),mons=o('','Month',m),i;for(i=1;i<=31;i++)days+=o((i<10?'0':'')+i,String(i),d);for(i=1;i<=12;i++)mons+=o((i<10?'0':'')+i,MONTHS[i-1],m);
  return '<div class="f full optin"><label class="check"><input type="checkbox" id="'+p+'opt"'+(yes?' checked':'')+'>Guest is happy to receive Kazumi news and offers</label>'+
    '<small class="muted">Ask: “Would you like to hear about Kazumi news and offers?” Tick only if they say yes.</small>'+
    '<div class="optbd" id="'+p+'bdw"'+(yes?'':' hidden')+'><span>Birthday <small class="muted">Optional, for a birthday treat</small></span><div class="optbdrow">'+
    '<select id="'+p+'bd" aria-label="Birthday day">'+days+'</select><select id="'+p+'bm" aria-label="Birthday month">'+mons+'</select></div></div></div>'}
function bindOptin(p,cb){var c=$(p+'opt'),d=$(p+'bd'),m=$(p+'bm'),w=$(p+'bdw');if(!c)return;
  function up(){w.hidden=!c.checked;cb({yes:c.checked,d:d.value,m:m.value})}c.onchange=up;d.onchange=up;m.onchange=up}
function resetOptin(p){var c=$(p+'opt');if(!c)return;c.checked=false;$(p+'bd').value='';$(p+'bm').value='';$(p+'bdw').hidden=true}
async function saveOptin(id,yes,d,m){try{await call('staff_record_booking_optin',{p_id:id,p_yes:!!yes,p_birthday:d&&m?m+'-'+d:null});return ''}
  catch(e){return 'The news and offers answer did not save. Record it in Guest directory.'}}
function reqText(list,note){var a=(list||[]).join('; '),n=(note||'').trim();return a&&n?a+'. '+n:(a||n)||null}
function reqPills(svc,sel,attr){return reqList(svc).map(function(r){return '<button type="button" class="qp'+((sel||[]).indexOf(r)>=0?' on':'')+'" '+attr+'="'+esc(r)+'" aria-pressed="'+((sel||[]).indexOf(r)>=0)+'">'+esc(r)+'</button>'}).join('')}
/* À la carte in the day views: arrivals, briefing, kitchen and stations */
function alcUnseated(){if(!alcOn()||!state.day||state.date!==fijiToday())return [];var now=hm2m(nowHM());return (state.day.dining||[]).filter(function(p){return !(p.tables||[]).length&&!p.arrived_at&&p.status==='confirmed'&&hm2m(p.session_time)-now<=60})}
function alcCounts(ps){var o={dining_room:0,yakitori_counter:0,sushi_bar:0,none:0};ps.forEach(function(p){if(!(p.tables||[]).length)o.none+=p.size;else o[alcArea(p)]+=p.size});return o}
(function(){
  var _dp=dayParties;dayParties=function(d){var out=_dp(d);if(!alcOn())return out;
    out.forEach(function(p){if(p.service!=='dining')return;var t=p.tables||[];if(t.length){p.where=alcNames(t)}else{p.where='Not seated yet';p.unseated=true}});return out};
  var _ss=startSeat;startSeat=function(id){var p=findParty(id);if(p&&p.service==='dining'&&alcOn()){state.aseat=id;paintDay();setTimeout(function(){var s=document.querySelector('.alc-seatbar');if(s)s.scrollIntoView({block:'center'})},50);return}return _ss.apply(this,arguments)};
  var _bh=briefHtml;briefHtml=function(d){var h=_bh(d);if(!alcOn())return h;
    var din=(d.dining||[]),rows=[['lunch','Lunch'],['dinner','Dinner']].map(function(m){var ps=din.filter(function(p){return m[0]==='lunch'?p.session_time<'16:00':p.session_time>='16:00'});if(!ps.length)return '';var c=alcCounts(ps);
      return '<tr><td>'+m[1]+'</td><td style="text-align:right"><b>'+sum(ps)+'</b></td><td style="text-align:right">'+c.dining_room+'</td><td style="text-align:right">'+c.yakitori_counter+'</td><td style="text-align:right">'+c.sushi_bar+'</td><td style="text-align:right"'+(c.none?' class="amber"':'')+'>'+c.none+'</td></tr>'}).join('');
    if(!rows)return h;
    var sec='<section class="bsec"><div class="bsec-h"><h2>À la carte by area</h2></div><table class="t"><thead><tr><th>Meal</th><th style="text-align:right">Guests</th><th style="text-align:right">Dining room</th><th style="text-align:right">Yakitori</th><th style="text-align:right">Sushi bar</th><th style="text-align:right">No table yet</th></tr></thead><tbody>'+rows+'</tbody></table></section>';
    return h.replace('<div class="bgrid">',sec+'<div class="bgrid">')};
  var _kh=kitchenHtml;kitchenHtml=function(d){var h=_kh(d);if(!alcOn())return h;var din=d.dining||[];if(!din.length)return h;
    var meals=[['lunch','Lunch'],['dinner','Dinner']].map(function(m){var ps=din.filter(function(p){return m[0]==='lunch'?p.session_time<'16:00':p.session_time>='16:00'});if(!ps.length)return '';
      var by={};ps.forEach(function(p){var mm=hm2m(p.session_time),k=m2hm(mm-mm%30);(by[k]=by[k]||[]).push(p)});
      return '<section class="bsec"><div class="bsec-h"><h2>'+m[1]+' pace</h2><span class="small muted">Guests arriving every half hour, and who sits at the counters</span></div><table class="t"><thead><tr><th>From</th><th style="text-align:right">Guests</th><th style="text-align:right">Dining room</th><th style="text-align:right">Yakitori</th><th style="text-align:right">Sushi bar</th></tr></thead><tbody>'+
        Object.keys(by).sort().map(function(k){var c=alcCounts(by[k]);return '<tr><td>'+esc(tl(k))+'</td><td style="text-align:right"><b>'+sum(by[k])+'</b></td><td style="text-align:right">'+(c.dining_room+c.none)+'</td><td style="text-align:right">'+c.yakitori_counter+'</td><td style="text-align:right">'+c.sushi_bar+'</td></tr>'}).join('')+'</tbody></table></section>'}).join('');
    return h.replace('</section></div>','</section></div><div class="kgrid">'+meals+'</div>')};
  var _sh=stationsHtml;stationsHtml=function(d){var h=_sh(d);if(!alcOn())return h;var din=d.dining||[];if(!din.length)return h;
    var cards=AREAS.map(function(A){var ps=din.filter(function(p){return (p.tables||[]).length&&alcArea(p)===A[0]});if(!ps.length)return '';
      var watch=ps.filter(hasAlg),cels=ps.filter(isCel).length,kids=ps.reduce(function(n,p){return n+(p.children||0)},0);
      var secs=[['lunch','Lunch'],['dinner','Dinner']].map(function(m){var g=ps.filter(function(p){return m[0]==='lunch'?p.session_time<'16:00':p.session_time>='16:00'}).sort(function(a,b){return a.session_time<b.session_time?-1:1});if(!g.length)return '';
        return '<section class="ssit"><div class="ssit-h"><h3>'+m[1]+'</h3><span class="ssit-n"><b>'+sum(g)+'</b> guests</span></div>'+g.map(function(p){var diet=[(p.diet_prefs||[]).join(', '),clean(p.dietary)].filter(Boolean).join('. ');
          return '<div class="stnrow"><button class="sname pname"'+(CM[p.id]?chipStyle(CM[p.id]):'')+' data-id="'+p.id+'"><span>'+esc(p.name)+'</span><span class="ssz">'+p.size+'</span></button>'+
            '<div class="sstat">'+(p.arrived_at?'<span class="pill st-arrived">Here since '+esc(clock(p.arrived_at))+'</span>':'<span class="pill">Due '+esc(tl(p.session_time))+'</span>')+'<span class="tag">'+esc(alcNames(p.tables))+'</span>'+(p.vip?'<span class="tag vip">VIP</span>':'')+'</div>'+
            stnLine('Allergy',hasAlg(p)?esc(p.allergens.join(', '))+(diet?'. '+esc(diet):''):'','al')+stnLine('Dietary',!hasAlg(p)&&diet?esc(diet):'')+stnLine('Celebrating',isCel(p)?esc(celText(p)):'','ce')+
            stnLine('Request',clean(p.requests)?esc(clean(p.requests)):'')+stnLine('Team note',p.staff_notes?esc(p.staff_notes):'')+'</div>'}).join('')+'</section>'}).join('');
      return '<article class="stn stn-alc" id="stn-'+A[0]+'"><header class="stn-h"><div><h2>'+A[1]+'</h2><span class="muted">À la carte, '+esc(longDate(state.date))+'</span></div><div class="stn-k"><span><b>'+sum(ps)+'</b>guests</span><span class="'+(watch.length?'k-a':'')+'"><b>'+watch.length+'</b>'+(watch.length===1?'allergy':'allergies')+'</span><span><b>'+cels+'</b>'+(cels===1?'celebration':'celebrations')+'</span><span><b>'+kids+'</b>'+(kids===1?'child':'children')+'</span></div></header>'+
        (watch.length?'<div class="swatch"><b>Watch for</b>'+watch.map(function(p){return '<div><span class="sw-a">'+esc(p.allergens.join(', '))+'</span> '+esc(p.name)+' ('+p.size+'), '+esc(tl(p.session_time))+'</div>'}).join('')+'</div>':'')+secs+'</article>'}).join('');
    return h.replace(/<\/div>$/,cards+'</div>')};
})();
/* Teppanyaki and lunch and dinner kept apart: one switch above every day view */
(function(){
  var SPL=[['tep','Teppanyaki'],['alc','Lunch and dinner']];
  function isTep(p){return (p.service||'teppanyaki')==='teppanyaki'}
  function splitCounts(d){return {tep:(d.sessions||[]).reduce(function(n,s){return n+s.seats_booked},0),alc:sum(d.dining||[])+sum(d.events||[])}}
  function splitPart(d,k){if(k==='all')return d;var o={};for(var x in d)o[x]=d[x];
    if(k==='tep'){o.dining=[];o.events=[]}else{o.sessions=[];o.closures=[]}
    o.inactive=(d.inactive||[]).filter(function(p){return k==='tep'?isTep(p):!isTep(p)});return o}
  function splitNow(){if(!state.split){var s=lsGet('kz_split');state.split=s==='tep'||s==='alc'?s:(state.date===fijiToday()&&nowHM()<'16:00'?'alc':'tep')}return state.split}
  function setSplit(k){if(state.split===k)return;state.split=k;lsSet('kz_split',k);state.seat=null;state.aseat=null;state.plan=null;paintDay();window.scrollTo({top:0})}
  var _pd=paintDay;paintDay=function(){var el=$('day');if(!el||!state.day)return _pd.apply(this,arguments);
    var full=state.day,c=splitCounts(full),k=splitNow();
    state.day=splitPart(full,k);try{_pd.apply(this,arguments)}finally{state.day=full}
    var other=k==='tep'?'alc':'tep',nm={tep:'Teppanyaki',alc:'lunch or dinner'};
    var em=el.querySelector('.emptyday');
    if(em){var h2=em.querySelector('h2'),p=em.querySelector('p.muted'),nx=$('nextday');
      if(h2)h2.textContent='No '+nm[k]+' bookings for '+(state.date===fijiToday()?'today':'this day');
      if(p)p.innerHTML=c[other]?'<b>'+c[other]+'</b> '+(c[other]===1?'guest is':'guests are')+' booked for '+nm[other]+'. <button class="link" data-split="'+other+'">Show '+(other==='tep'?'Teppanyaki':'Lunch and dinner')+'</button>':(k==='tep'?'Every Teppanyaki table is free.':'The dining room, yakitori counter and sushi bar have no bookings.');
      if(nx&&c[other])nx.hidden=true}
    var bar=document.createElement('div');bar.className='splitbar noprint';bar.setAttribute('role','group');bar.setAttribute('aria-label','Show bookings for');
    bar.innerHTML=SPL.map(function(s){var on=s[0]===k;return '<button type="button" data-split="'+s[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'"><span>'+s[1]+'</span><b>'+c[s[0]]+'</b><small>'+(c[s[0]]===1?'guest':'guests')+'</small></button>'}).join('');
    el.insertBefore(bar,el.firstChild);
    el.querySelectorAll('[data-split]').forEach(function(b){b.addEventListener('click',function(){setSplit(b.dataset.split)})})};
  /* on the Teppanyaki side, no empty lunch or dinner sections */
  var _ah=alcHtml;alcHtml=function(m,rows){return state.split==='tep'&&!rows.length?'':_ah.apply(this,arguments)};
  var _ls=listService;listService=function(t,rows){return state.split==='tep'&&!rows.length?'':_ls.apply(this,arguments)};
  /* seating a party from the needs list opens its own side first */
  var _ss=startSeat;startSeat=function(id){var p=findParty(id);if(p){var k=isTep(p)?'tep':'alc';if(state.split!==k){state.split=k;lsSet('kz_split',k)}}return _ss.apply(this,arguments)};
  var _ob=openBooking;openBooking=function(id){var p=findParty(id);if(p){var k=isTep(p)?'tep':'alc';if(state.split&&state.split!==k){state.split=k;lsSet('kz_split',k);paintDay()}}return _ob.apply(this,arguments)};
})();
/* v33: calmer phone layout. One guest total, guests and grills on the first screen, three views up front on phones */
(function(){
  var PHONE=600;function isPhone(){return window.innerWidth<=PHONE}
  /* 1. one guest total: the greeting always counts the whole day, whichever side of the switch is showing */
  var _pdx=paintDay;paintDay=function(){if(state.day)state.dayFull=state.day;return _pdx.apply(this,arguments)};
  paintWelcome=function(){var w=$('welc');if(!w||!state.day)return;if(state.date!==fijiToday()){w.hidden=true;return}
    var keep=state.day;state.day=state.dayFull||state.day;
    try{var ps=dayParties(state.day).filter(function(p){return p.status==='confirmed'||p.status==='pending'||p.status==='pending_large_group'}),g=sum(ps),here=sum(ps.filter(function(p){return p.arrived_at})),hr=+nowHM().slice(0,2);
      var uns=unseatedAll().length,req=((state.needs&&state.needs.requests)||[]).filter(function(r){return !r.is_test}).length,aun=alcUnseated().length,todo=[];
      if(uns)todo.push(uns+(uns===1?' party needs':' parties need')+' a grill');if(aun)todo.push(aun+(aun===1?' party due soon has':' parties due soon have')+' no table yet');if(req)todo.push(req+(req===1?' request is':' requests are')+' waiting for a reply');
      var line=g?g+' guests today across the restaurant'+(here?', '+here+' here so far':'')+'.':'A quiet day so far, with nothing booked yet.';
      /* on Arrivals the Needs action box below says this, so it is not repeated here */
      if(state.view!=='arrivals'&&state.view!=='kitchen'&&state.view!=='stations'){var short=[];if(uns)short.push(uns+' to seat at a grill');if(aun)short.push(aun+' without a table');if(req)short.push(req+(req===1?' request':' requests')+' to answer');if(short.length)line+=' To do: '+short.join(', ')+'.'}
      w.innerHTML='<b>'+esc(kzGreet())+'.</b> '+esc(line);w.hidden=false}
    finally{state.day=keep}};
  /* 3. phones: Arrivals, Floor and Kitchen up front; Stations and Briefing under More */
  var EXTRA={stations:'Stations',brief:'Briefing'};
  function phoneViews(){var vw=$('vw');if(!vw)return;var more=$('vwmore'),menu=$('vwmenu');
    vw.querySelectorAll('button[data-v]').forEach(function(b){b.classList.toggle('vw-extra',isPhone()&&!!EXTRA[b.dataset.v])});
    if(!isPhone()){if(more)more.remove();if(menu)menu.remove();return}
    if(!more){more=document.createElement('button');more.id='vwmore';more.type='button';more.setAttribute('aria-haspopup','true');more.setAttribute('aria-expanded','false');vw.appendChild(more);
      more.onclick=function(e){e.stopPropagation();var m=$('vwmenu');if(m){m.remove();more.setAttribute('aria-expanded','false');return}
        m=document.createElement('div');m.id='vwmenu';m.className='vw-menu';m.setAttribute('role','menu');
        m.innerHTML=Object.keys(EXTRA).map(function(k){return '<button role="menuitem" data-mv="'+k+'" class="'+(state.view===k?'on':'')+'">'+EXTRA[k]+'</button>'}).join('');
        vw.parentNode.appendChild(m);more.setAttribute('aria-expanded','true');
        m.querySelectorAll('[data-mv]').forEach(function(b){b.onclick=function(){m.remove();more.setAttribute('aria-expanded','false');setView(b.dataset.mv)}})}}
    var cur=EXTRA[state.view];more.textContent=cur||'More';more.classList.toggle('on',!!cur);more.setAttribute('aria-label',cur?cur+', more views':'More views')}
  document.addEventListener('click',function(e){var m=$('vwmenu');if(m&&!e.target.closest('#vwmenu,#vwmore')){m.remove();var b=$('vwmore');if(b)b.setAttribute('aria-expanded','false')}});
  var lastPhone=isPhone();window.addEventListener('resize',function(){if(isPhone()!==lastPhone){lastPhone=isPhone();phoneViews()}});
  var _rt=renderToday;renderToday=function(){var r=_rt.apply(this,arguments);phoneViews();return r};
  var _sv=setView;setView=function(){var r=_sv.apply(this,arguments);phoneViews();return r};
  /* 3. party size by tapping, on the full form (typing still works for bigger groups) */
  function sizeChips(inputId,nums){var inp=$(inputId);if(!inp||inp.dataset.chips)return;inp.dataset.chips='1';
    var row=document.createElement('div');row.className='szchips';row.setAttribute('role','group');row.setAttribute('aria-label',inp.id==='na'||inp.id==='ca'?'Adults':'Children');
    row.innerHTML=nums.map(function(n){return '<button type="button" data-n="'+n+'">'+n+'</button>'}).join('');
    var lab=inp.closest('label');if(lab)lab.appendChild(row);else inp.parentNode.insertBefore(row,inp.nextSibling);
    function mark(){var v=parseInt(inp.value,10);row.querySelectorAll('button').forEach(function(b){var on=+b.dataset.n===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
    row.querySelectorAll('button').forEach(function(b){b.onclick=function(){inp.value=b.dataset.n;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));mark()}});
    inp.addEventListener('input',mark);mark()}
  var _rf=renderFull;renderFull=function(){var r=_rf.apply(this,arguments);sizeChips('na',[1,2,3,4,5,6,7,8]);sizeChips('nc',[0,1,2,3,4]);return r};
})();
/* v36 preview: one navigation. Side panel on laptops and landscape tablets, thumb bar at the bottom on phones */
(function(){
  var BOT=860;function narrow(){return window.innerWidth<=BOT}
  var SV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
  var IC={
    arrivals:SV+'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>',
    floor:SV+'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    kitchen:SV+'<path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V20H6z"/><path d="M6 17h12"/></svg>',
    stations:SV+'<path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    brief:SV+'<path d="M8 3h8l4 4v14H4V3h4z"/><path d="M8 11h8M8 15h5"/></svg>',
    bookings:I.list,calendar:I.cal,settings:I.gear,'new':I.plus,host:SV+'<path d="M4 20h16"/><path d="M6 20v-5a6 6 0 0 1 12 0v5"/><path d="M12 6V4"/></svg>',
    guests:SV+'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.6a3.2 3.2 0 0 1 0 6.3M18 14.5a6 6 0 0 1 3 5.5"/></svg>',
    analytics:SV+'<path d="M4 20h16"/><path d="M7 16v-4M12 16V8M17 16v-6"/></svg>',
    more:SV+'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>'};
  var VIEWS={arrivals:'Arrivals',floor:'Floor',kitchen:'Kitchen',stations:'Stations',brief:'Briefing'};
  /* v44 (12 Oct 2026): Kazumi Service Hub. Reservations first, then the service flow; clearer labels. Stations is the chef brief for each Teppanyaki grill. */
  var SIDE=[['Reservations',['bookings','calendar','guests','analytics']],['Service',['host','brief','arrivals','floor','kitchen','stations']]];
  var NAME={arrivals:'Arrivals',floor:'Seating plan',kitchen:'Kitchen',stations:'Grill stations',brief:'Service briefing',bookings:'Bookings',calendar:'Calendar',guests:'Guests',analytics:'Analytics',settings:'Settings','new':'New booking',host:'Host Desk'};
  var SHORT={floor:'Seating',kitchen:'Kitchen',bookings:'Bookings',host:'Host'};window.KZ_NAV_NAME=NAME;
  /* Keep the phone More sheet consistent with the staff-only sidebar: management tools are not staff navigation. */
  function allowed(k){if(!me)return false;if(k==='analytics'||k==='calendar'||k==='settings')return me.role==='admin'||me.role==='manager';return k!=='guests'||me.role==='admin'}
  var BOTTOM=['host','arrivals','floor','bookings'],MORE=['kitchen','brief','stations','calendar','guests','analytics','settings'];
  var MORE_GROUPS=[['service','Operations',['kitchen','brief','stations']],['planning','Planning',['calendar']],['customers','Customers',['guests']],['insights','Insights',['analytics']],['management','System',['settings']]];
  function cur(){return state.tab==='today'?(VIEWS[state.view]?state.view:'arrivals'):state.tab}
  function navTo(k){closeMore();
    if(VIEWS[k]){lsSet('kz_view',k);if(state.tab==='today'){if(state.view!==k)setView(k);else window.scrollTo({top:0,behavior:'smooth'})}else go('today',{view:k,seat:null,plan:null})}
    else if(state.tab===k){window.scrollTo({top:0,behavior:'smooth'});var f=document.querySelector('main input:not([type=hidden]),main h1');if(f&&k==='new')f.focus({preventScroll:true})}
    else go(k)}
  function item(k,cls){var on=cur()===k,lab=cls==='kbot-i'&&SHORT[k]?SHORT[k]:NAME[k];return '<button type="button" class="'+cls+(on?' on':'')+'" data-nav="'+k+'"'+(on?' aria-current="page"':'')+(lab!==NAME[k]?' aria-label="'+NAME[k]+'"':'')+'>'+IC[k]+'<span>'+lab+'</span>'+(k==='bookings'?'<span class="count kn-count" hidden></span>':'')+'</button>'}
  function mark(){var k=cur();root.querySelectorAll('[data-nav]').forEach(function(b){var on=b.dataset.nav===k||(b.dataset.nav==='more'&&MORE.indexOf(k)>=0);b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
  function syncCount(){var src=$('reqn');root.querySelectorAll('.kn-count').forEach(function(c){c.hidden=!src||src.hidden;if(src)c.textContent=src.textContent})}
  function closeMore(restore){var m=$('kmore');if(!m)return;m.remove();var b=root.querySelector('.kbot [data-nav="more"]');if(b){b.setAttribute('aria-expanded','false');b.removeAttribute('aria-controls');if(restore&&b.getClientRects().length)b.focus({preventScroll:true})}}
  function moreGroup(g){var ks=g[2].filter(allowed);return ks.length?'<div class="kmore-group" role="group" aria-label="'+g[1]+'" data-kmore-group="'+g[0]+'"><div class="kmore-group-title" aria-hidden="true">'+g[1]+'</div>'+ks.map(function(k){return item(k,'kmore-i')}).join('')+'</div>':''}
  function openMore(){if($('kmore'))return closeMore(true);var m=document.createElement('div');m.id='kmore';m.className='kmore';
    m.innerHTML='<div class="kmore-scrim"></div><div class="kmore-sheet" role="dialog" aria-modal="true" aria-labelledby="kmore-title"><div class="kmore-grip" aria-hidden="true"></div><div class="kmore-head"><h2 id="kmore-title">More</h2><button type="button" class="kmore-close" aria-label="Close menu">Close</button></div>'+MORE_GROUPS.map(moreGroup).join('')+
      '<div class="kmore-row"><button type="button" class="kmore-i" data-act="search">'+I.search+'<span>Find a booking</span></button><button type="button" class="kmore-i" data-act="eve" aria-pressed="'+root.classList.contains('eve')+'">'+I.moon+'<span>Evening mode</span></button><button type="button" class="kmore-i" data-act="help">'+kzIcon('help')+'<span>Help</span></button><button type="button" class="kmore-i" data-act="acct">'+kzIcon('user')+'<span>My account</span></button><button type="button" class="kmore-i" data-act="out">'+I.out+'<span>Sign out '+esc(firstName())+'</span></button></div></div>';
    root.appendChild(m);var toggle=root.querySelector('.kbot [data-nav="more"]');if(toggle){toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-controls','kmore')}
    m.querySelector('.kmore-scrim').onclick=function(){closeMore(true)};m.querySelector('.kmore-close').onclick=function(){closeMore(true)};
    m.querySelectorAll('[data-nav]').forEach(function(b){b.onclick=function(){navTo(b.dataset.nav)}});
    m.querySelector('[data-act="search"]').onclick=function(){closeMore();openSearch()};
    m.querySelector('[data-act="eve"]').onclick=function(){closeMore();setEve(!root.classList.contains('eve'))};
    m.querySelector('[data-act="help"]').onclick=function(){closeMore();kzHelpSheet()};m.querySelector('[data-act="acct"]').onclick=function(){closeMore();kzAccountSheet()};
    m.querySelector('[data-act="out"]').onclick=function(){closeMore();var s=$('so');if(s)s.click()};
    var first=[].slice.call(m.querySelectorAll('.kmore-i')).find(function(b){return b.getClientRects().length>0});if(first)first.focus({preventScroll:true})}
  function build(){if(!me||!$('mn'))return;root.classList.add('kz-nav2');root.setAttribute('data-kztab',state.tab);
    var side=document.createElement('aside');side.className='kside';side.setAttribute('aria-label','Sections');
    var eve=root.classList.contains('eve');
    side.innerHTML='<div class="kside-brand"><i class="klogo" role="img" aria-label="Kazumi Japanese Restaurant"></i><span class="kside-title">Marketing &amp; Business Intelligence Hub</span></div>'+
      '<button type="button" class="kside-new" data-nav="new">'+I.plus+'<span>New booking</span></button>'+
      '<button type="button" class="kside-search" data-act="search" aria-keyshortcuts="/">'+I.search+'<span>Search bookings</span><kbd title="Press / to search">/</kbd></button>'+
      '<nav class="kside-scroll" aria-label="Main">'+SIDE.map(function(g){var id='ksh-'+g[0].toLowerCase();return '<div class="kside-g" role="group" aria-labelledby="'+id+'"><div class="kside-h" id="'+id+'">'+g[0]+'</div>'+g[1].filter(allowed).map(function(k){return item(k,'kside-i')}).join('')+'</div>'}).join('')+'</nav>'+
      '<div class="kside-foot"><div class="kside-g kside-admin" role="group" aria-labelledby="ksh-admin"><div class="kside-h" id="ksh-admin">Administration</div>'+item('settings','kside-i')+'</div><div class="kside-me"><span title="'+esc(me.name||'')+'">'+esc(me.name||'')+'</span><button type="button" class="kside-icon" data-act="help" aria-label="Help" title="Help">'+kzIcon('help')+'</button><button type="button" class="kside-icon" data-act="acct" aria-label="My account" title="My account">'+kzIcon('user')+'</button><button type="button" class="kside-icon" data-act="eve" aria-label="Evening mode" aria-pressed="'+eve+'" title="Evening mode '+(eve?'on':'off')+'">'+I.moon+'</button><button type="button" class="kside-icon" data-act="out" aria-label="Sign out" title="Sign out">'+I.out+'</button></div></div>';
    root.insertBefore(side,root.firstChild);
    var bot=document.createElement('nav');bot.className='kbot';bot.setAttribute('aria-label','Sections');
    bot.innerHTML=BOTTOM.map(function(k){return item(k,'kbot-i')}).join('')+'<button type="button" class="kbot-i" data-nav="more" aria-haspopup="dialog" aria-expanded="false">'+IC.more+'<span>More</span></button>';
    root.appendChild(bot);
    var fab=document.createElement('button');fab.type='button';fab.className='kfab';fab.setAttribute('data-nav','new');fab.setAttribute('aria-label','New booking');fab.innerHTML=I.plus;root.appendChild(fab);
    root.querySelectorAll('.kside [data-nav],.kbot [data-nav],.kfab').forEach(function(b){b.addEventListener('click',function(){if(b.dataset.nav==='more')openMore();else navTo(b.dataset.nav)})});
    root.querySelectorAll('.kside [data-act]').forEach(function(b){b.onclick=function(){var a=b.dataset.act;if(a==='search')openSearch();else if(a==='eve')setEve(!root.classList.contains('eve'));else if(a==='help')kzHelpSheet();else if(a==='acct')kzAccountSheet();else if(a==='out'){var s=$('so');if(s)s.click()}}});
    mark();syncCount();var src=$('reqn');if(src&&window.MutationObserver)new MutationObserver(syncCount).observe(src,{attributes:true,childList:true,characterData:true,subtree:true})}
  var _sh=shell;shell=function(){closeMore();var r=_sh.apply(this,arguments);build();return r};
  var _sv2=setView;setView=function(){var r=_sv2.apply(this,arguments);mark();return r};
  function pageName(){var el=document.getElementById('kvname'),m=main&&main();if(!m)return;var t=state.tab==='today'?NAME[cur()]:state.tab==='calendar'?NAME.calendar:'';
    if(!t){if(el)el.remove();var bp0=document.querySelector('#kzs .top .brand-p');if(bp0)bp0.textContent='';return}if(!el){el=document.createElement('p');el.id='kvname';el.className='kview-name';m.insertBefore(el,m.firstChild)}else if(el.parentElement!==m)m.insertBefore(el,m.firstChild);el.textContent=t;var bp=document.querySelector('#kzs .top .brand-p');if(bp)bp.textContent=t}
  var _mk=mark;mark=function(){_mk();pageName();var e=root.querySelector('.kside [data-act="eve"]');if(e){var on=root.classList.contains('eve');e.setAttribute('aria-pressed',String(on));e.title='Evening mode '+(on?'on':'off')}};
  var _se=setEve;setEve=function(){var r=_se.apply(this,arguments);mark();return r};
  var _rc=renderCalendar;renderCalendar=function(){var r=_rc.apply(this,arguments);pageName();return r};var _rt=renderToday;renderToday=function(){var r=_rt.apply(this,arguments);pageName();return r};
  document.addEventListener('keydown',function(e){var m=$('kmore');if(!m)return;
    if(e.key==='Escape'){e.preventDefault();closeMore(true);return}
    if(e.key!=='Tab')return;
    var buttons=[].slice.call(m.querySelectorAll('button')).filter(function(b){return !b.disabled&&b.getClientRects().length>0});if(!buttons.length)return;
    var first=buttons[0],last=buttons[buttons.length-1];
    if(e.shiftKey&&(document.activeElement===first||!m.contains(document.activeElement))){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||!m.contains(document.activeElement))){e.preventDefault();first.focus()}
  });
})();
/* v37: speed. Same screens, less waiting.
   1. Calls that read screen data are shared while in flight, and remembered for a few seconds, so nothing is fetched twice at once.
   2. The bookings list and calendar show the last answer straight away, then refresh quietly and redraw only if something changed.
   3. A day you have already opened shows straight away from memory while the fresh copy loads.
   4. The request count loads at the same time as the day instead of after it, and the first day starts loading during sign-in checks.
   Any change (seating, arrivals, edits) clears the memory, so the next screen always shows fresh data. */
(function(){
  /* screen data that is safe to share and remember briefly; everything else goes straight through */
  var READ={staff_get_day:1,staff_get_alc:1,staff_needs:1,staff_list_bookings:1,staff_calendar2:1,staff_next_booked_day:1,staff_sittings:1,staff_service_times:1};
  var PASS={staff_get_booking:1,staff_booking_history:1,staff_guest_bookings:1,staff_list_closures_v2:1,staff_get_settings:1,staff_get_recipients:1,staff_get_floor:1,staff_me:1};
  var SWR={staff_list_bookings:function(){if(state.tab==='bookings'&&$('bl'))loadList()},staff_calendar2:function(){if(state.tab==='calendar'&&$('calg'))loadCalendar()}};
  var FRESH=2500,KEEP=300000,FLY={},MEM={};
  function forget(){FLY={};MEM={}}
  function fetchNow(fn,args,k){
    var p=_call(fn,args).then(function(v){if(FLY[k]===p)delete FLY[k];MEM[k]={v:v,t:Date.now(),s:JSON.stringify(v)};return v},function(e){if(FLY[k]===p)delete FLY[k];throw e});
    FLY[k]=p;return p}
  var _call=call;
  call=function(fn,args){
    if(PASS[fn])return _call(fn,args);
    if(!READ[fn]){forget();return _call(fn,args).then(function(v){forget();return v},function(e){forget();throw e})}
    var k=fn+'|'+JSON.stringify(args||{}),m=MEM[k],age=m?Date.now()-m.t:Infinity;
    if(age<FRESH)return Promise.resolve(m.v);
    if(FLY[k])return FLY[k];
    if(SWR[fn]&&age<KEEP){
      var old=m.s;
      fetchNow(fn,args,k).then(function(){var n=MEM[k];if(n&&n.s!==old)SWR[fn]()}).catch(function(){});
      return Promise.resolve(m.v)}
    return fetchNow(fn,args,k)};
  var DAY={};
  var _ld=loadDay;
  loadDay=function(){
    var el=$('day'),k=state.date,c=DAY[k];
    call('staff_needs').catch(function(){});
    if(el&&c&&el.querySelector('.skel')&&!state.seat&&!state.aseat&&!state.plan){state.day=c.day;state.alc=c.alc;try{paintDay();paintNeeds()}catch(e){}}
    return _ld.apply(this,arguments).then(function(r){if(state.day&&state.date===k)DAY[k]={day:state.day,alc:state.alc};return r})};
  var _boot=boot;
  var hooked=false;
  boot=function(){
    if(!hooked&&sb&&sb.auth){hooked=true;try{sb.auth.onAuthStateChange(function(){forget()})}catch(e){}}
    try{if(!new URLSearchParams(location.search).get('reset'))sb.auth.getSession().then(function(s){
      if(!s||!s.data||!s.data.session)return;var d=state.date||fijiToday();
      call('staff_get_day',{p_date:d}).catch(function(){});call('staff_get_alc',{p_date:d}).catch(function(){});call('staff_needs').catch(function(){})}).catch(function(){})}catch(e){}
    return _boot.apply(this,arguments)};
})();
/* v38: review a booking request from the manager email.
   The "Review booking" button in the new-booking email opens the staff page with ?review=<booking id>.
   1. The id is kept in this browser tab and removed from the address bar straight away.
   2. If nobody is signed in (or the 12-hour sign-out applied), the normal sign-in and two-step code come first; the id waits.
   3. Once signed in, the booking opens with a pop-up: Confirm booking, or Decline with an optional note to the guest.
      Both use the same staff action as the buttons in the booking drawer, so the right email goes to the guest.
   4. If someone has already answered it, the pop-up says so and offers no buttons.
   The link itself changes nothing. */
(function(){
  var KEY='kz_review',UUID=/^[A-Za-z0-9-]{1,64}$/;
  try{var q=new URLSearchParams(location.search),v=q.get('review');
    if(v!==null){q.delete('review');history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);
      if(UUID.test(v))sessionStorage.setItem(KEY,v.toLowerCase())}}catch(e){}
  function take(){try{var v=sessionStorage.getItem(KEY);sessionStorage.removeItem(KEY);return v}catch(e){return null}}

  var st=document.createElement('style');st.id='kz-review-style';
  st.textContent='#kzs .rvw{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(30,27,24,.55)}'+
    '#kzs .rvw-box{font-family:"Grift",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:var(--card);color:var(--ink);border-radius:14px;width:100%;max-width:420px;max-height:calc(100vh - 32px);overflow:auto;padding:22px 20px 18px;box-shadow:0 18px 48px rgba(30,27,24,.28)}'+
    '#kzs .rvw-k{font-size:13px;font-weight:600;color:var(--copper2);margin:0 0 6px}'+
    '#kzs .rvw-box h2,#kzs .rvw-box p{font-family:inherit!important}'+
    '#kzs .rvw-box h2{margin:0 0 4px;font-size:22px;line-height:1.25}'+
    '#kzs .rvw-when{margin:0 0 14px;color:var(--ink2);font-size:16px}'+
    '#kzs .rvw-alg{background:var(--redsoft);color:var(--red);border-radius:8px;padding:10px 12px;margin:0 0 12px;font-size:15px}'+
    '#kzs .rvw-req{background:var(--paper);border-radius:8px;padding:10px 12px;margin:0 0 12px;font-size:15px;color:var(--ink2);white-space:pre-wrap}'+
    '#kzs .rvw-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}'+
    '#kzs .rvw-acts .btn{min-height:52px;font-size:16px;justify-content:center}'+
    '#kzs .rvw-later{display:block;margin:14px auto 0;min-height:44px;background:none;border:0;color:var(--muted);font:inherit;font-size:15px;text-decoration:underline;cursor:pointer}'+
    '#kzs .rvw textarea{width:100%;min-height:96px;margin-top:8px;font:inherit;font-size:16px;padding:10px;border:1px solid var(--line2);border-radius:8px;box-sizing:border-box}'+
    '#kzs .rvw-done{border-radius:8px;padding:12px;margin:4px 0 0;background:var(--paper);font-size:15px}'+
    '@media (max-width:600px){#kzs .rvw{align-items:flex-end;padding:0}#kzs .rvw-box{max-width:none;border-radius:16px 16px 0 0;max-height:92vh;padding-bottom:calc(18px + env(safe-area-inset-bottom))}}';
  if(!document.getElementById(st.id))document.head.appendChild(st);

  var pendingId=null,lastFocus=null;
  function closeRv(){var el=$('rvw');if(el)el.remove();document.removeEventListener('keydown',rvKey,true);if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
  function rvKey(e){if(e.key==='Escape'&&$('rvw')){e.stopPropagation();closeRv()}}
  function whenText(b){return shortDate(b.date)+', '+tl(b.session_time)}
  function handledText(b,hist){
    var lab={confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled',completed:'Completed',no_show:'Marked as no-show'}[b.status]||'Already answered';
    var h=(hist||[]).filter(function(x){return x.type!=='email'&&/confirm|declin|cancel|arriv|no.?show|complet/i.test(x.action||'')}).pop();
    return lab+(h&&h.actor&&h.actor!=='Email'?' by '+h.actor:'')+(h&&h.at?', '+stamp(h.at):'')+'.';
  }
  function show(b,hist){
    lastFocus=document.activeElement;closeRv();
    var waiting=b.status==='pending'||b.status==='pending_large_group',ev=b.service==='event';
    var el=document.createElement('div');el.className='rvw';el.id='rvw';
    var h='<div class="rvw-box" role="alertdialog" aria-modal="true" aria-labelledby="rvw-t" aria-describedby="rvw-d">'+
      '<p class="rvw-k">'+(waiting?(ev?'Event enquiry waiting for your answer':b.status==='pending_large_group'?'Large group waiting for your answer':'Booking request waiting for your answer'):'This request has been answered')+(b.is_test?' (test)':'')+'</p>'+
      '<h2 id="rvw-t">'+esc(b.name)+', '+b.size+(b.size===1?' guest':' guests')+'</h2>'+
      '<p class="rvw-when" id="rvw-d">'+esc(svcName(b)+', '+whenText(b))+'</p>';
    if(b.allergens&&b.allergens.length)h+='<div class="rvw-alg"><b>Allergies:</b> '+esc(b.allergens.join(', '))+'</div>';
    if(b.requests)h+='<div class="rvw-req">'+esc(String(b.requests).slice(0,400))+'</div>';
    if(waiting){
      h+='<div id="rvw-step"><div class="rvw-acts"><button class="btn go" id="rvw-yes">Confirm booking</button><button class="btn danger" id="rvw-no">Decline</button></div>'+
        '<p class="small muted" style="margin:10px 0 0">'+(b.email?'The guest is emailed straight away.':'This guest has no email address, so call them after you answer.')+'</p></div>'+
        '<button class="rvw-later" id="rvw-x">Decide later</button>';
    }else{
      h+='<div class="rvw-done">'+esc(handledText(b,hist))+' Nothing else to do.</div><button class="rvw-later" id="rvw-x">View booking</button>';
    }
    el.innerHTML=h+'</div>';(document.getElementById('kzs')||document.body).appendChild(el);
    el.addEventListener('click',function(e){if(e.target===el)closeRv()});
    document.addEventListener('keydown',rvKey,true);
    $('rvw-x').onclick=closeRv;
    var yes=$('rvw-yes'),no=$('rvw-no');
    if(yes){yes.focus();
      yes.onclick=function(){yes.disabled=true;no.disabled=true;yes.textContent='Confirming…';closeRv();run(b,'confirm',null,false)};
      no.onclick=function(){var s=$('rvw-step');
        s.innerHTML='<label for="rvw-note" style="font-weight:600">Message to the guest <span class="muted" style="font-weight:400">(optional)</span></label>'+
          '<textarea id="rvw-note" maxlength="500" placeholder="For example: we are fully booked that evening, but 8:30 PM is free."></textarea>'+
          '<div class="rvw-acts"><button class="btn danger solid" id="rvw-dec">Decline and email guest</button><button class="btn" id="rvw-back">Go back</button></div>';
        $('rvw-note').focus();
        $('rvw-back').onclick=function(){show(b,hist)};
        $('rvw-dec').onclick=function(){var n=$('rvw-note').value.trim();this.disabled=true;closeRv();run(b,'decline',n||null,false)}};
    }else $('rvw-x').focus();
  }

  /* open the booking once signed in; shell() runs after sign-in, two-step code and password change */
  var _shell=shell;
  shell=function(){var r=_shell.apply(this,arguments);var id=take();if(id){pendingId=id;openBooking(id)}return r};
  var _drawer=drawer;
  drawer=function(b,hist){var r=_drawer.apply(this,arguments);if(pendingId&&b&&String(b.id).toLowerCase()===pendingId){pendingId=null;show(b,hist)}return r};
})();
/* v39: every website booking now waits for a manager to confirm (reservation_settings.auto_confirm = false since 10 Oct 2026),
   so "Confirm automatically up to" no longer does anything. Hide it and say what actually happens. The saved value is kept unchanged. */
(function(){
  var _pane=paneRules;
  paneRules=function(s,admin){var r=_pane.apply(this,arguments);try{var i=$('rdc');if(i){var f=i.closest('label');if(f)f.style.display='none';
    var grid=f&&f.parentNode;if(grid&&!document.getElementById('rdc-note')){var p=document.createElement('p');p.id='rdc-note';p.className='small muted';p.style.margin='0';
      p.textContent='Every website booking waits for a manager to confirm it. Managers get an email with a Review booking button.';grid.parentNode.insertBefore(p,grid.nextSibling)}}}catch(e){}return r};
})();
/* v40: tablet and connection refinements. Interface only: booking rules, permissions and data are unchanged.
   1. A save with no reply: a "Still saving" note after 8 seconds; after 20 seconds the button is released with a clear message.
      Creating or changing a booking is never released early, because a second tap could make a duplicate.
   2. "Updated just now" on the day screens, and an offline bar while the connection is down.
   3. Tablets (up to 1199px wide): "Needs action" folds into one line. Each item in it is still a one-tap button; the arrow opens the full list. */
(function(){
  var READ=/^(get_|staff_(get_|list_|calendar|me$|needs$|sittings|service_times|booking_history|guest_bookings|next_booked_day))/;
  var NO_RELEASE=/^staff_(create|change_booking|add_staff|update_settings|update_rules|set_recipients|seat_plan)/;
  ERR.GRILL_HAS_BOOKINGS='Future bookings already use these seats on this grill. Move them on the Seating plan first, then change the grill.';
  ERR.HOURS_HAVE_BOOKINGS='Some future bookings fall outside these hours. Move or cancel them first, then change the hours.';
  ERR.KZ_TIMEOUT='No reply after 20 seconds. Check the Wi-Fi, then open the booking to see if it saved before trying again.';
  var _call=call;
  call=function(fn,args){
    var p=_call(fn,args);if(READ.test(fn))return p;
    var t1=setTimeout(function(){toast('Still saving. Check the Wi-Fi connection.')},8000),t2,t3;
    var guard=new Promise(function(_,rej){
      if(NO_RELEASE.test(fn))t3=setTimeout(function(){toast('Still no reply. Do not enter it again. Refresh in a minute and check before trying again.')},30000);
      else t2=setTimeout(function(){rej(new Error('KZ_TIMEOUT'))},20000)});
    function done(){clearTimeout(t1);clearTimeout(t2);clearTimeout(t3)}
    return Promise.race([p,guard]).then(function(v){done();return v},function(e){done();throw e})};

  function net(){
    var b=document.getElementById('kz-offline');
    if(!navigator.onLine){if(!b){b=document.createElement('div');b.id='kz-offline';b.setAttribute('role','status');
      b.textContent='You are offline. Changes will not save until the connection is back.';root.appendChild(b)}}
    else if(b){b.remove();toast('Back online.');try{if(me)refreshCurrent()}catch(e){}}
  }
  window.addEventListener('online',net);window.addEventListener('offline',net);

  function upd(){
    var bar=document.querySelector('#kzs .daybar');if(!bar||!state.kzUpd||state.tab!=='today')return;
    var s=bar.querySelector('.kz-upd');
    if(!s){s=document.createElement('span');s.className='kz-upd';var h=bar.querySelector('h1');if(!h)return;h.insertAdjacentElement('afterend',s)}
    var m=Math.floor((Date.now()-state.kzUpd)/60000);
    var t=m<1?'Updated just now':'Updated '+m+' min ago';if(s.textContent!==t)s.textContent=t;
    s.classList.toggle('old',m>=5);
  }
  var _ld=loadDay;
  loadDay=function(){var r=_ld.apply(this,arguments);
    Promise.resolve(r).then(function(){if(document.querySelector('#kzs #day .err, #kzs #day .msg.err'))return;state.kzUpd=Date.now();upd()},function(){});return r};
  setInterval(upd,20000);

  var SHORT={grill:'to seat at a grill',table:'to seat, lunch and dinner',req:'to reply',um:'to review'};
  function fold(){
    var n=document.querySelector('#kzs #needs .needs');if(!n)return;
    var rows=[].slice.call(n.querySelectorAll('.need'));if(!rows.length)return;
    var sig=rows.map(function(r){return (r.getAttribute('data-k')||'')+':'+r.textContent}).join('|'),old=n.querySelector('.kz-nsum');
    if(old){if(old.getAttribute('data-sig')===sig)return;old.remove()}
    var bar=document.createElement('div');bar.className='kz-nsum';bar.setAttribute('data-sig',sig);
    var tog=document.createElement('button');tog.type='button';tog.className='kz-ntog';tog.innerHTML='<b>Needs action</b><i aria-hidden="true"></i>';bar.appendChild(tog);
    rows.forEach(function(r){var act=r.querySelector('button');var c=((r.querySelector('.num')||{}).textContent||'').trim();var k=r.getAttribute('data-k');
      var txt=SHORT[k]||((r.children[1]||{}).textContent||'').trim().split(' ').slice(0,3).join(' ');
      var x=document.createElement('button');x.type='button';x.className='kz-np';if(k)x.setAttribute('data-k',k);x.textContent=(c?c+' ':'')+txt;
      var tag=r.querySelector('.tag');if(tag){var t=document.createElement('span');t.className='tag allergy';t.textContent=tag.textContent;x.appendChild(document.createTextNode(' '));x.appendChild(t)}
      if(act){x.title=act.textContent.trim();x.onclick=function(){var cur=k?document.querySelector('#kzs #needs .need[data-k="'+k+'"] button'):null;(cur||act).click()}}else x.onclick=function(){set(true)};
      bar.appendChild(x)});
    var open=false;try{open=sessionStorage.getItem('kz_needs_open')==='1'}catch(e){}
    function set(o){n.classList.toggle('kz-col',!o);tog.setAttribute('aria-expanded',o?'true':'false');try{sessionStorage.setItem('kz_needs_open',o?'1':'0')}catch(e){}}
    tog.onclick=function(){set(n.classList.contains('kz-col'))};
    n.insertBefore(bar,n.firstChild);set(open);
  }
  new MutationObserver(function(){fold();upd()}).observe(root,{childList:true,subtree:true});
})();
/* v41 (12 Oct 2026): More booking rules in Settings, Booking rules. Admins can change the Teppanyaki notice period and sittings,
   automatic grill assignment, automatic confirmation, guest booking emails and the spam limits. Every change is logged with
   who, when, the old value and the new value, and the last 20 changes are shown. Staff can see the values but not change them.
   Needs database migration 20261012b_advanced_booking_settings. Without it the panel says so and nothing else changes. */
(function(){
  ERR.SITTING_HAS_BOOKINGS='This sitting has upcoming bookings. Move or cancel them first, then turn it off.';
  var _pane=paneRules;
  function when(t){try{return new Date(t).toLocaleString('en-GB',{timeZone:'Pacific/Fiji',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return t}}
  function yn(v){return v==='true'?'On':v==='false'?'Off':v==null?'':v}
  function draw(box,a,admin){
    var dis=admin?'':' disabled';
    function num(id,lab,val,min,max,help){return '<label class="f">'+lab+'<input type="number" inputmode="numeric" id="'+id+'" min="'+min+'" max="'+max+'" value="'+(val==null?'':val)+'"'+dis+'>'+(help?'<small class="muted">'+help+'</small>':'')+'</label>'}
    function chk(id,lab,on,help){return '<label class="check"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+dis+'>'+lab+'</label>'+(help?'<small class="muted" style="display:block;margin:-10px 0 4px 32px;line-height:1.45">'+help+'</small>':'')}
    var sit=(a.sittings||[]).map(function(t){return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line,#e6e0d9)"><div><b>'+esc(t.window||t.label)+'</b><div class="small muted">'+(t.future?t.future+' upcoming '+(t.future===1?'booking':'bookings'):'No upcoming bookings')+'</div></div>'+
      '<label class="check" style="margin:0"><input type="checkbox" data-sit="'+esc(t.time)+'"'+(t.active?' checked':'')+dis+'>Open</label></div>'}).join('');
    var log=(a.log||[]).map(function(l){return '<li style="padding:8px 0;border-top:1px solid var(--line,#e6e0d9)"><b>'+esc(l.setting)+'</b>: '+esc(yn(l.old)||'none')+' → '+esc(yn(l.new))+'<div class="small muted">'+esc(when(l.at))+', '+esc(String(l.actor||'').split('@')[0])+'</div></li>'}).join('');
    box.innerHTML='<h2>More booking rules</h2>'+
      '<div class="grid2">'+num('xn','Teppanyaki minimum notice, in minutes',a.tep_notice,0,1440,'How soon before a sitting guests can still book it online.')+'</div>'+
      chk('xg','Assign grills automatically',a.auto_assign_grills,'Off: staff place every Teppanyaki booking on a grill. On: the system suggests a grill, and staff can still move it.')+
      chk('xc','Confirm website bookings automatically',a.auto_confirm,'Off: every website booking is a request that a manager confirms. On: bookings within the limits above are confirmed straight away.')+
      chk('xe','Email guests when they book',a.guest_emails,'The email that tells guests their request or booking has been received.')+
      '<h3 style="margin-top:8px">Spam limits</h3><div class="grid2">'+num('xd','Bookings per device per hour',a.limit_device_hour,1,50,'')+num('xa','Upcoming bookings per email address',a.limit_active_email,1,20,'')+num('xs','Website bookings per 10 minutes, all guests',a.limit_site_10min,5,500,'')+'</div>'+
      (admin?'<div class="row"><button class="btn primary" id="xsave">Save these rules</button></div>':'')+
      /* Phase 1 (audit E5): sittings are changed only in Operations (overlap check, existing-booking check, change log). */
      '<h3 style="margin-top:8px">Recent changes</h3>'+(log?'<ul style="list-style:none;margin:0;padding:0">'+log+'</ul>':'<p class="small muted">No changes recorded yet.</p>');
    var rdc=$('rdc'),f=rdc&&rdc.closest('label'),note=document.getElementById('rdc-note');
    if(f)f.style.display=a.auto_confirm?'':'none';if(note)note.style.display=a.auto_confirm?'none':'';
    if(!admin)return;
    $('xsave').onclick=async function(){var b=this;b.disabled=true;function n(id){return parseInt($(id).value,10)}
      var p={tep_notice:n('xn'),auto_assign_grills:$('xg').checked,auto_confirm:$('xc').checked,guest_emails:$('xe').checked,limit_device_hour:n('xd'),limit_active_email:n('xa'),limit_site_10min:n('xs')};
      try{var x=await call('staff_update_advanced',{p:p});toast('Booking rules saved.');draw(box,x,admin)}catch(er){toast(errText(er));b.disabled=false}};

  }
  paneRules=function(s,admin){var r=_pane.apply(this,arguments);
    try{var st=document.querySelector('#spane > .stack');if(st&&!document.getElementById('xrules')){var box=document.createElement('div');box.id='xrules';box.className='panel stack';
      box.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i></div>';var anchor=$('rsave');anchor=anchor&&anchor.closest('.row');st.insertBefore(box,anchor?anchor.nextSibling:null);
      call('staff_get_advanced').then(function(a){draw(box,a,admin)},function(e){box.innerHTML='<h2>More booking rules</h2><p class="small muted">'+(/staff_get_advanced/.test(String(e&&e.message))?'These rules need a database update that has not been applied yet.':esc(errText(e)))+'</p>'})}}catch(e){}
    return r};
})();

/* v43 (12 Oct 2026): Guests, a guest CRM for admins. One record per guest built from their bookings, segments for
   retargeting, marketing permission per channel with the exact wording the guest agreed to, and downloads for
   WhatsApp, SMS, email and Meta ads that only include guests who said yes. Needs database migration 20261012c_guest_crm. */
var KG={seg:'',q:'',key:null,data:null,incNoShow:false,tab:'over'};
var KG_SEGS=[['','All guests'],['contact_due','Contact soon'],['opted_in','Said yes to offers'],['birthday_known','Birthday known'],['first_visit','First visit'],['returning','Returning'],['regular','Regulars, 4+ visits'],
  ['lapsed','Lapsed, 90+ days'],['celebration','Celebrations'],['upcoming','Booked again'],['teppanyaki','Teppanyaki'],['lunch_dinner','Lunch and dinner'],
  ['local','Locals'],['visitor','Visitors'],['vip','VIP'],['never_came','Never came'],['no_show_risk','No-show risk']];
var KG_CH=[['whatsapp','WhatsApp'],['sms','SMS'],['email','Email'],['ads','Meta ads']];
var KG_NAME={first_visit:'First visit',returning:'Returning',regular:'Regular',lapsed:'Lapsed',never_came:'Never came',upcoming:'Booked again',celebration:'Celebration',
  teppanyaki:'Teppanyaki',lunch_dinner:'Lunch and dinner',local:'Local',visitor:'Visitor',vip:'VIP',no_show_risk:'No-show risk',opted_in:'Said yes to offers',birthday_known:'Birthday known'};
(function(){if(document.getElementById('kg-style'))return;var s=document.createElement('style');s.id='kg-style';s.textContent=
            '.kg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.kg-grid div{padding:10px 12px;border-radius:12px;background:var(--greysoft)}.kg-grid b{display:block;font-size:20px}.kg-grid span{font-size:13px;color:var(--ink2)}'+
  '.kg-perm{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.kg-perm label{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 12px;border:1px solid var(--line2);border-radius:12px;background:#fff;font-weight:500}.kg-perm input[type=checkbox]{flex:none;width:20px!important;height:20px!important;min-height:0!important;margin:0!important;padding:0!important;accent-color:var(--ink)}'+
  '.kg-hist{list-style:none;margin:0;padding:0}.kg-hist li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line)}.kg-hist li:first-child{border-top:0}'+
  '@media(max-width:860px){.kg-grid,.kg-perm{grid-template-columns:repeat(2,minmax(0,1fr))}}';
  document.head.appendChild(s)})();
function kgDate(d){return d?fmt(d,{day:'numeric',month:'short',year:'numeric'}):''}
function kgPhone(p){var d=String(p||'').replace(/\D/g,''),plus=/^\s*(\+|00)/.test(String(p||''));if(d.indexOf('00')===0)d=d.slice(2);if(!d)return '';if(!plus&&d.length===7)d='679'+d;return '+'+d}
function kgCsv(rows,cols){function q(v){v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
  return [cols.map(function(c){return q(c[0])}).join(',')].concat(rows.map(function(r){return cols.map(function(c){return q(c[1](r))}).join(',')})).join('\n')}
function kgSave(name,text){var b=new Blob(['﻿'+text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
async function kgDownload(ch){
  var seg=KG.seg,lab=(KG_SEGS.find(function(s){return s[0]===seg})||['','All guests'])[1],rows;
  try{rows=await call('staff_crm_export',{p:{channel:ch,seg:seg||null,include_no_show:KG.incNoShow}})}catch(e){toast(errText(e));return}
  if(!rows.length){toast('Nobody in '+lab.toLowerCase()+' has said yes to '+(KG_CH.find(function(c){return c[0]===ch})[1])+' yet.');return}
  function first(r){return String(r.name||'').trim().split(/\s+/)[0]||''}function last(r){var p=String(r.name||'').trim().split(/\s+/);return p.length>1?p.slice(1).join(' '):''}
  var cols=ch==='ads'?[['email',function(r){return (r.email||'').toLowerCase()}],['phone',function(r){return kgPhone(r.phone)}],['fn',first],['ln',last],['country',function(r){return /^\+679/.test(kgPhone(r.phone))?'fj':''}]]
    :ch==='email'?[['Name',function(r){return r.name}],['Email',function(r){return r.email}],['Visits',function(r){return r.visits}],['Last visit',function(r){return r.last_visit||''}],['Why now',function(r){return r.reason||''}]]
    :[['Name',function(r){return r.name}],['Mobile',function(r){return kgPhone(r.phone)}],['Visits',function(r){return r.visits}],['Last visit',function(r){return r.last_visit||''}],['Why now',function(r){return r.reason||''}]];
  kgSave('kazumi-guests-'+ch+'-'+(seg||'all')+'-'+fijiToday()+'.csv',kgCsv(rows,cols));toast(rows.length+' '+(rows.length===1?'guest':'guests')+' downloaded.')}
/* v140 (28 Oct 2026, Roneel: "refine the CRM so that it's easy to navigate"). Guest directory: one toolbar (search, a
   Show dropdown with counts, a download button), icon-first rows, and a guest record with a fixed header (back, call,
   WhatsApp, new booking) and four tabs instead of one long page. Same data and same saves as before. */
var KG_P={visits:'<path d="M4 20c0-3.6 2.9-6 6.5-6"/><circle cx="10.5" cy="7.5" r="3.5"/><path d="M15 15.5l2 2 4-4.5"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.6H4.4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  whatsapp:'<path d="M4.5 19.5l1.2-3.7A8 8 0 1 1 8.6 18.6z"/><path d="M9.2 8.6c.2-.5.6-.6.9-.6h.4l.9 2-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 2 .9v.4c0 .4-.2.8-.6.9-.9.4-2.4.2-4-1.3-1.6-1.5-2.3-3.3-1.9-4.2z"/>',
  sms:'<path d="M4 5.5h16v10.5H9.5L5 19.5V16H4z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>',
  email:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  ads:'<path d="M4 10v4h3l6 4.5V5.5L7 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  phone:'<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',dl:'<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4.5 19.5h15"/>',
  chev:'<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',left:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',note:'<path d="M5 4h10l4 4v12H5z"/><path d="M14.5 4v4.5H19M8.5 12.5h7M8.5 16h5"/>',
  list:'<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',cross:'<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
  alert:'<path d="M12 3.5l9 16H3z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/>',check:'<path d="M5 12.5l4.5 4.5L19 7"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  wheel:'<circle cx="10" cy="15" r="5"/><circle cx="9" cy="4.5" r="1.5"/><path d="M9 7v5h5l2.5 5H19"/>',seat:'<path d="M7 4v9h10"/><path d="M7 13l-1 7M17 13l1 7M7 9h8"/>',
  cake:'<path d="M4.5 20.5h15v-7a2 2 0 0 0-2-2h-11a2 2 0 0 0-2 2z"/><path d="M4.5 15.5c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0"/><path d="M12 11.5V8M12 5.5v-.01"/>',hotel:'<path d="M4 20V4.5h10V20"/><path d="M14 9h6v11"/><path d="M7.5 8h3M7.5 11.5h3M7.5 15h3"/><path d="M2.5 20h19"/>',
  people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6.2 4.5 2 4.5 5"/>'};
function kgI(n,cls){return '<svg class="kg2-i'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(KG_P[n]||'')+'</svg>'}
function kgChIcons(c){var on=KG_CH.filter(function(x){return c&&c[x[0]]});
  return on.length?'<span class="kg2-chs" aria-label="Said yes to '+esc(on.map(function(x){return x[1]}).join(', '))+'">'+on.map(function(x){return '<span class="kg2-ch kg2-'+x[0]+'" title="'+x[1]+'">'+kgI(x[0])+'</span>'}).join('')+'</span>'
    :'<span class="kg2-none" title="No offers">'+kgI('cross')+'<span class="sr">No offers</span></span>'}
function kgWa(p){var d=kgPhone(p).replace(/\D/g,'');return d?'https://wa.me/'+d:''}
function kgPop(btn,html,bind){var old=document.querySelector('.kg2-pop');if(old){var was=old.dataset.for===btn.id;old.remove();btn.setAttribute('aria-expanded','false');if(was)return}
  var p=document.createElement('div');p.className='kg2-pop';p.dataset.for=btn.id;p.setAttribute('role','dialog');p.innerHTML=html;btn.parentElement.appendChild(p);btn.setAttribute('aria-expanded','true');
  function close(){p.remove();btn.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',out,true);document.removeEventListener('keydown',esc1,true)}
  function out(e){if(!p.contains(e.target)&&!btn.contains(e.target))close()}function esc1(e){if(e.key==='Escape'){close();btn.focus()}}
  setTimeout(function(){document.addEventListener('pointerdown',out,true);document.addEventListener('keydown',esc1,true)},0);
  bind(p,close);var f=p.querySelector('[aria-selected="true"],button');if(f)f.focus()}
function renderGuests(){
  if(!me||me.role!=='admin'){main().innerHTML='<div class="row" style="margin:0 0 14px"><h1>Guests</h1></div><div class="panel"><p class="muted">Only admins can open the guest directory.</p></div>';return}
  if(KG.key)return kgDetail(KG.key);
  main().innerHTML='<div class="kg2"><div class="kg2-head"><h1>Guests</h1><p class="shint">One record per guest. Test bookings are left out.</p></div>'+
    '<div class="kg2-bar"><div class="search">'+I.search+'<input id="kgq" type="search" placeholder="Name, mobile or email" value="'+esc(KG.q)+'" aria-label="Search guests"></div>'+
    '<div class="kg2-ddw"><button type="button" class="kg2-dd" id="kgshow" aria-haspopup="listbox" aria-expanded="false"><span class="kg2-ddl">'+esc((KG_SEGS.find(function(s){return s[0]===KG.seg})||KG_SEGS[0])[1])+'</span><b id="kgshown"></b>'+kgI('chev','kg2-chev')+'</button></div>'+
    '<div class="kg2-ddw"><button type="button" class="kg2-ib" id="kgdl" aria-haspopup="dialog" aria-expanded="false" aria-label="Download for offers" title="Download for offers">'+kgI('dl')+'</button></div></div>'+
    '<p class="kg2-n" id="kgn0" role="status" aria-live="polite"></p><div id="kgl"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div>';
  var tmr=null;$('kgq').addEventListener('input',function(){clearTimeout(tmr);var v=this.value;tmr=setTimeout(function(){KG.q=v.trim();kgLoad()},300)});
  $('kgshow').onclick=function(){var d=KG.data||{},c=d.counts||{},btn=this;
    var segs=KG_SEGS.filter(function(s){return !s[0]||s[0]===KG.seg||(s[0]==='contact_due'?d.contact_due:c[s[0]])});
    kgPop(btn,'<div role="listbox" aria-label="Show" class="kg2-opts">'+segs.map(function(s){var n=!s[0]?d.total:s[0]==='contact_due'?d.contact_due:c[s[0]];var on=KG.seg===s[0];
      return '<button type="button" role="option" aria-selected="'+on+'" data-seg="'+s[0]+'" class="'+(on?'on':'')+'"><span>'+esc(s[1])+'</span><b>'+(n||0)+'</b></button>'}).join('')+'</div>',
      function(p,close){p.querySelectorAll('[data-seg]').forEach(function(b){b.onclick=function(){KG.seg=b.dataset.seg;close();btn.querySelector('.kg2-ddl').textContent=b.querySelector('span').textContent;btn.focus();kgLoad()}})})};
  $('kgdl').onclick=function(){var lab=(KG_SEGS.find(function(s){return s[0]===KG.seg})||KG_SEGS[0])[1];
    kgPop(this,'<div class="kg2-dlh"><b>Download</b><span>'+esc(lab)+'</span></div><div class="kg2-dlb">'+KG_CH.map(function(x){return '<button type="button" class="kg2-dlc kg2-'+x[0]+'" data-dl="'+x[0]+'">'+kgI(x[0])+'<span>'+x[1]+'</span></button>'}).join('')+'</div>'+
      '<label class="check small kg2-ns"><input type="checkbox" id="kgns"'+(KG.incNoShow?' checked':'')+'>Include no-show risk</label><p class="shint">Only guests who said yes to that channel.</p>',
      function(p){p.querySelectorAll('[data-dl]').forEach(function(b){b.onclick=async function(){if(b.disabled)return;b.disabled=true;b.classList.add('busy');try{await kgDownload(b.dataset.dl)}finally{b.disabled=false;b.classList.remove('busy')}}});
        $('kgns').onchange=function(){KG.incNoShow=this.checked}})};
  kgLoad()}
async function kgLoad(){
  var el=$('kgl');if(!el)return;var d;
  try{d=await call('staff_crm_guests',{p:{q:KG.q||null,seg:KG.seg||null,limit:300}})}catch(e){el.innerHTML='<div class="panel"><p class="muted">'+(/staff_crm_guests/.test(String(e&&e.message))?'The guest list needs a database update that has not been applied yet.':esc(errText(e)))+'</p></div>';return}
  KG.data=d;var sh=$('kgshown');if(sh)sh.textContent=!KG.seg?(d.total||0):(d.matches||0);
  var g=d.guests||[],n=$('kgn0');
  if(n)n.innerHTML=g.length?kgI('people')+'<span>'+d.matches+(d.matches>g.length?' · first '+g.length:'')+'</span>'+(KG.seg||KG.q?'<button type="button" class="kg2-clr" id="kgclr">Clear</button>':''):'';
  var clr=$('kgclr');if(clr)clr.onclick=function(){KG.seg='';KG.q='';var q=$('kgq');if(q)q.value='';var l=document.querySelector('#kgshow .kg2-ddl');if(l)l.textContent=KG_SEGS[0][1];kgLoad()};
  if(!g.length){el.innerHTML='<div class="panel"><p class="muted">'+(d.total?'No guests match.':'No guests yet. Guests appear here after their first booking.')+'</p></div>';return}
  var soon=addDays(fijiToday(),14);
  el.innerHTML='<div class="list kg2-list"><div class="kg2-row kg2-th" aria-hidden="true"><span>Guest</span><span title="Visits">'+kgI('visits')+'</span><span title="Last visit">'+kgI('cal')+'</span><span title="Next contact">'+kgI('bell')+'</span><span>Offers</span></div>'+
    g.map(function(x){var due=x.contact_on&&x.contact_on<=soon;
      return '<button type="button" class="kg2-row" data-key="'+esc(x.key)+'">'+
        '<span class="kg2-who"><span class="nm">'+esc(x.name)+(x.vip?'<span class="kg2-vip" title="VIP">'+kgI('star')+'<span class="sr">VIP</span></span>':'')+'</span><span class="sub">'+esc(x.phone||'')+(x.email?' · '+esc(x.email):'')+'</span></span>'+
        '<span class="kg2-v" aria-label="'+x.visits+' visits">'+kgI('visits','kg2-m')+'<b>'+x.visits+'</b>'+(x.no_shows?'<em class="kg2-amb">'+x.no_shows+' no-show'+(x.no_shows===1?'':'s')+'</em>':'')+'</span>'+
        '<span class="kg2-last">'+kgI('cal','kg2-m')+'<span>'+(x.last_visit?esc(kgDate(x.last_visit)):x.next_booking?'Booked '+esc(kgDate(x.next_booking)):'Not yet')+'</span></span>'+
        '<span class="kg2-next">'+(x.contact_on?kgI('bell','kg2-m'+(due?' kg2-amb':''))+'<span><span class="'+(due?'kg2-amb':'')+'">'+esc(kgDate(x.contact_on))+'</span><span class="sub">'+esc(x.reason||'')+'</span></span>':x.upcoming?kgI('cal','kg2-m')+'<span class="sub">Booked again</span>':'')+'</span>'+
        '<span class="kg2-off">'+kgChIcons(x.consent)+'</span>'+kgI('chev','kg2-go')+'</button>'}).join('')+'</div>';
  el.querySelectorAll('[data-key]').forEach(function(b){b.onclick=function(){saveY();KG.key=b.dataset.key;KG.tab='over';hpush(curSt());kgDetail(KG.key);window.scrollTo(0,0)}})}
async function kgDetail(key){
  main().innerHTML='<div class="kg2"><div class="kg2-rh"><button type="button" class="kg2-ib" id="kgb" aria-label="All guests" title="All guests">'+kgI('left')+'</button><div class="kg2-rn"><h1 id="kgnm">&nbsp;</h1></div></div><div id="kgx"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div>';
  $('kgb').onclick=function(){if(history.state&&history.state.kg){history.back();return}KG.key=null;renderGuests()};
  var g;try{g=await call('staff_crm_guest',{p_key:key})}catch(e){$('kgx').innerHTML='<div class="panel"><p class="muted">'+esc(errText(e))+'</p></div>';return}
  kgPaint(g)}
function kgPaint(g){
  var x=$('kgx');if(!x)return;var tab=KG.tab||'over';
  var nm=$('kgnm');if(nm){nm.innerHTML='<span class="kg2-nmt">'+esc(g.name)+'</span>'+(g.vip?'<span class="kg2-vip" title="VIP">'+kgI('star')+'<span class="sr">VIP</span></span>':'');
    var rh=nm.closest('.kg2-rh'),acts=rh.querySelector('.kg2-acts');if(acts)acts.remove();var wa=kgWa(g.phone),tel=kgPhone(g.phone);
    rh.insertAdjacentHTML('beforeend','<div class="kg2-acts">'+(tel&&g.phone!=='Not given'?'<a class="kg2-ib" href="tel:'+esc(tel)+'" aria-label="Call" title="Call">'+kgI('phone')+'</a>':'')+
      (wa&&g.phone!=='Not given'?'<a class="kg2-ib kg2-whatsapp" href="'+esc(wa)+'" target="_blank" rel="noopener" aria-label="WhatsApp" title="WhatsApp">'+kgI('whatsapp')+'</a>':'')+
      '<button type="button" class="kg2-ib kg2-new" id="kgnew" aria-label="New booking for '+esc(g.name)+'" title="New booking">'+kgI('plus')+'</button></div>')}
  var segs=(g.segments||[]).filter(function(s){return s!=='vip'&&s!=='opted_in'}).map(function(s){return '<span class="tag">'+esc(KG_NAME[s]||s)+'</span>'}).join(' ');
  var hist=(g.history||[]).map(function(h){var st=h.arrived?'Came':h.status==='cancelled'&&h.late?'Late cancel':({cancelled:'Cancelled',no_show:'No-show',completed:'Came',confirmed:'Booked',pending:'Request',pending_large_group:'Request'}[h.status]||h.status);
    return '<li'+(h.id?' class="kg-bk"':'')+'>'+(h.id?'<button type="button" class="kg-bkopen" data-bk="'+esc(h.id)+'">':'')+'<span><b>'+esc(kgDate(h.date))+'</b> · '+esc(svcName(h))+' '+esc(tl(h.time))+' · '+kgI('people','kg2-m')+h.size+(h.occasion?' · '+esc(h.occasion):'')+'</span><span class="kg2-st'+(st==='No-show'||st==='Late cancel'?' kg2-amb':'')+'">'+esc(st)+'</span>'+(h.id?'</button>':'')+'</li>'}).join('');
  var perms=(g.consents||[]).map(function(c){return '<li><span><b>'+esc((KG_CH.find(function(z){return z[0]===c.channel})||['',c.channel])[1])+': '+(c.granted?'yes':'no')+'</b><div class="sub">'+esc(c.source==='website'?'Ticked on the booking form':'Recorded by '+c.by)+(c.evidence?', '+esc(c.evidence):'')+'</div><div class="sub">“'+esc(c.wording||'')+'”</div></span><span class="sub">'+esc(new Date(c.at).toLocaleString('en-GB',{timeZone:'Pacific/Fiji',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}))+'</span></li>'}).join('');
  var nHist=(g.history||[]).length,TABS=[['over','info','Overview'],['offers','ads','Offers'],['note','note','Note'],['bk','list','Bookings',nHist]];
  var al=g.allergy||{},alg=(al.allergens||[]),dp=(al.diet_prefs||[]),seat=al.seating&&al.seating!=='no_preference'?al.seating.replace(/_/g,' '):'';
  var algH=alg.length?'<div class="kg2-alg" role="note">'+kgI('alert')+'<span><b>'+alg.map(esc).join(' · ')+'</b>'+(al.dietary?'<span class="sub">'+esc(al.dietary)+'</span>':'')+'</span></div>'
    :al.status==='none'?'<div class="kg2-algok">'+kgI('check','kg2-m')+'<span>No allergies, last time asked'+(al.dietary?' · '+esc(al.dietary):'')+'</span></div>'
    :al.status==='not_sure'?'<div class="kg2-algask">'+kgI('alert','kg2-m')+'<span>Not sure about allergies: ask again</span></div>'
    :'<p class="shint">No allergies recorded. Ask the guest.</p>';
  var needs=(dp.length||al.wheelchair||seat)?'<div class="kg2-facts">'+dp.map(function(d){return '<span class="tag">'+esc(d)+'</span>'}).join('')+(al.wheelchair?'<span>'+kgI('wheel','kg2-m')+'Wheelchair</span>':'')+(seat?'<span>'+kgI('seat','kg2-m')+esc(seat.charAt(0).toUpperCase()+seat.slice(1))+'</span>':'')+'</div>':'';
  var c0=(g.contacts||[])[0],undo=c0&&(Date.now()-new Date(c0.at).getTime())<864e5,via={whatsapp:'WhatsApp',sms:'SMS',email:'Email',call:'Call',in_person:'In person'};
  var dueH=g.contact_on?'<div class="kg2-due">'+kgI('bell')+'<span><b>'+esc(kgDate(g.contact_on))+'</b><span class="sub">'+esc(g.reason||'')+'</span></span><span class="kg2-ddw kg2-cw"><button type="button" class="btn sm kg2-cbtn" id="kgcon" aria-haspopup="dialog" aria-expanded="false">'+kgI('check')+'<span>Contacted</span></button></span></div>'
    :g.contacted_at&&c0?'<div class="kg2-due kg2-ok">'+kgI('check')+'<span><b>Contacted '+esc(kgDate(String(g.contacted_at).slice(0,10)))+'</b><span class="sub">'+esc(via[g.contacted_via]||'')+(c0.note?' · '+esc(c0.note):'')+' · '+esc(c0.by)+'</span></span>'+(undo?'<button type="button" class="kg2-clr" id="kgundo">Undo</button>':'')+'</div>'
    :g.next_booking?'<div class="kg2-due kg2-ok">'+kgI('cal')+'<span><b>Booked again for '+esc(kgDate(g.next_booking))+'</b></span></div>':'';
  var linkH='<div class="kg2-links">'+(g.linked||[]).map(function(l){return '<div class="kg2-lk">'+kgI('link','kg2-m')+'<span>Also under '+esc(l.label||l.key)+'</span><button type="button" class="kg2-clr" data-unlink="'+esc(l.key)+'">Separate</button></div>'}).join('')+
    '<span class="kg2-ddw"><button type="button" class="kg2-lnk" id="kglnk" aria-haspopup="dialog" aria-expanded="false">'+kgI('link','kg2-m')+'Same person as another record?</button></span></div>';
  var over='<div class="panel stack">'+algH+needs+'<div class="kg2-facts">'+(g.phone?'<span>'+kgI('phone','kg2-m')+esc(g.phone)+'</span>':'')+(g.email?'<span>'+kgI('email','kg2-m')+esc(g.email)+'</span>':'')+(g.hotel?'<span>'+kgI('hotel','kg2-m')+'Stayed at '+esc(g.hotel)+'</span>':'')+(g.birth_day&&g.birth_month?'<span>'+kgI('cake','kg2-m')+g.birth_day+' '+MONTHS[g.birth_month-1]+'</span>':'')+'</div>'+
      (segs?'<div>'+segs+'</div>':'')+
      '<div class="kg-grid"><div><b>'+g.visits+'</b><span>'+(g.visits===1?'Visit':'Visits')+'</span></div><div><b>'+g.covers+'</b><span>Guests brought</span></div><div'+(g.no_shows?' class="kg2-ambbox"':'')+'><b>'+g.no_shows+'</b><span>No-shows</span></div><div'+(g.late_cancels?' class="kg2-ambbox"':'')+'><b>'+(g.cancelled||0)+'</b><span>Cancelled'+(g.late_cancels?' · '+g.late_cancels+' late':'')+'</span></div></div>'+
      dueH+'<div class="kg2-offl">'+kgChIcons(g.consent)+'</div>'+(g.note?'<p class="kg2-noteq">“'+esc(g.note)+'”</p>':'')+linkH+'</div>';
  var offers='<div class="panel stack"><p class="shint">Tick only what the guest agreed to. Every change is kept.</p><div class="kg-perm">'+KG_CH.map(function(c){return '<label class="kg2-'+c[0]+'"><input type="checkbox" data-ch="'+c[0]+'"'+(g.consent&&g.consent[c[0]]?' checked':'')+(c[0]==='email'&&!g.email?' disabled':'')+'>'+kgI(c[0])+'<span>'+c[1]+'</span></label>'}).join('')+'</div>'+
      '<label class="f">How did they agree? <input id="kgn" maxlength="300" placeholder="For example: said yes at the table, 12 Oct"></label><div class="row"><button class="btn primary" id="kgp">Save</button></div>'+
      (perms?'<details class="fold"><summary><span class="fold-t">Permission history</span></summary><ul class="kg-hist">'+perms+'</ul></details>':'')+'</div>';
  var note='<div class="panel stack"><label class="f">Note for the team<textarea id="kgt" maxlength="500" rows="4">'+esc(g.note||'')+'</textarea></label><label class="check"><input type="checkbox" id="kgv"'+(g.vip?' checked':'')+'>'+kgI('star','kg2-vipi')+'VIP</label><div class="row"><button class="btn primary" id="kgs">Save</button></div></div>';
  var bk='<div class="panel stack">'+(hist?'<ul class="kg-hist">'+hist+'</ul>':'<p class="muted">No bookings.</p>')+'</div>';
  x.innerHTML='<div class="seg kg2-tabs" role="tablist" aria-label="Guest record">'+TABS.map(function(t){var on=tab===t[0];return '<button type="button" role="tab" aria-selected="'+on+'" data-kgt="'+t[0]+'" class="'+(on?'on':'')+'">'+kgI(t[1])+'<span>'+t[2]+'</span>'+(t[3]?'<i>'+t[3]+'</i>':'')+'</button>'}).join('')+'</div>'+
    '<div class="stack">'+'<div class="kg2-pane" data-pane="over"'+(tab==='over'?'':' hidden')+'>'+over+'</div><div class="kg2-pane" data-pane="offers"'+(tab==='offers'?'':' hidden')+'>'+offers+'</div><div class="kg2-pane" data-pane="note"'+(tab==='note'?'':' hidden')+'>'+note+'</div><div class="kg2-pane" data-pane="bk"'+(tab==='bk'?'':' hidden')+'>'+bk+'</div></div>';
  x.querySelectorAll('[data-kgt]').forEach(function(b){b.onclick=function(){KG.tab=b.dataset.kgt;x.querySelectorAll('[data-kgt]').forEach(function(o){var on=o===b;o.classList.toggle('on',on);o.setAttribute('aria-selected',String(on))});x.querySelectorAll('.kg2-pane').forEach(function(p){p.hidden=p.dataset.pane!==KG.tab})}});
  var nb=$('kgnew');if(nb)nb.onclick=function(){var a=$('kgagain');if(a)a.click()};
  /* 29 Oct 2026: mark as contacted, undo, and link two records of the same person */
  var cb=$('kgcon');if(cb)cb.onclick=function(){var btn=this;kgPop(btn,'<div class="kg2-dlh"><b>How did you contact them?</b></div><input id="kgcn" class="kg2-cn" maxlength="300" placeholder="Note, optional"><div class="kg2-dlb">'+
      [['whatsapp','whatsapp','WhatsApp'],['sms','sms','SMS'],['email','email','Email'],['call','phone','Call'],['in_person','people','In person']].map(function(c){return '<button type="button" class="kg2-dlc kg2-'+c[0]+'" data-cv="'+c[0]+'">'+kgI(c[1])+'<span>'+c[2]+'</span></button>'}).join('')+'</div>',
    function(p,close){p.querySelectorAll('[data-cv]').forEach(function(b){b.onclick=async function(){if(b.disabled)return;b.disabled=true;try{var r=await call('staff_crm_mark_contacted',{p_key:g.key,p_channel:b.dataset.cv,p_note:$('kgcn').value||null});close();toast('Marked as contacted.');kgPaint(r)}catch(e){toast(errText(e));b.disabled=false}}})})};
  var ub=$('kgundo');if(ub)ub.onclick=async function(){ub.disabled=true;try{var r=await call('staff_crm_undo_contact',{p_key:g.key,p_id:c0.id});toast('Contact removed.');kgPaint(r)}catch(e){toast(errText(e));ub.disabled=false}};
  x.querySelectorAll('[data-unlink]').forEach(function(b){b.onclick=async function(){b.disabled=true;try{var r=await call('staff_crm_unlink',{p_from:b.dataset.unlink});toast('Records separated.');kgPaint(r)}catch(e){toast(errText(e));b.disabled=false}}});
  var lb=$('kglnk');if(lb)lb.onclick=function(){var btn=this;kgPop(btn,'<div class="kg2-dlh"><b>Find the other record</b></div><div class="search">'+I.search+'<input id="kglq" type="search" placeholder="Name, mobile or email" aria-label="Find the other record"></div><div id="kglr" class="kg2-opts"></div><p class="shint">Their bookings, offers and notes then show here. Nothing is deleted; you can separate them again.</p>',
    function(p,close){var t=null,q=$('kglq');q.focus();q.oninput=function(){clearTimeout(t);var v=q.value.trim();t=setTimeout(async function(){var el=$('kglr');if(!el)return;if(v.length<2){el.innerHTML='';return}
      try{var d=await call('staff_crm_guests',{p:{q:v,seg:null,limit:8}});var L=(d.guests||[]).filter(function(o){return o.key!==g.key});
        el.innerHTML=L.length?L.map(function(o){return '<button type="button" data-lk="'+esc(o.key)+'"><span>'+esc(o.name)+'<span class="sub">'+esc(o.phone||o.email||'')+'</span></span><b>'+o.visits+'</b></button>'}).join(''):'<p class="shint">No other record matches.</p>';
        el.querySelectorAll('[data-lk]').forEach(function(b){b.onclick=function(){var o=L.find(function(z){return z.key===b.dataset.lk});
          el.innerHTML='<div class="kg2-cf"><span>Show <b>'+esc(o.name)+'</b> ('+esc(o.phone||o.email||'')+') as <b>'+esc(g.name)+'</b>?</span><div class="row"><button type="button" class="btn primary sm" id="kglok">Same person</button><button type="button" class="btn sm" id="kglno">Cancel</button></div></div>';
          $('kglno').onclick=function(){q.dispatchEvent(new Event('input'))};
          $('kglok').onclick=async function(){this.disabled=true;try{var r=await call('staff_crm_link',{p_from:o.key,p_into:g.key});close();toast('Records combined.');kgPaint(r)}catch(e){toast(errText(e));this.disabled=false}}}})}catch(e){el.innerHTML='<p class="muted">'+esc(errText(e))+'</p>'}},300)}})};
  $('kgp').onclick=async function(){var b=this,on=[],off=[];x.querySelectorAll('[data-ch]').forEach(function(c){if(c.disabled)return;var was=!!(g.consent&&g.consent[c.dataset.ch]);if(c.checked&&!was)on.push(c.dataset.ch);if(!c.checked&&was)off.push(c.dataset.ch)});
    if(!on.length&&!off.length){toast('Nothing changed.');return}var note=$('kgn').value.trim();if(on.length&&!note){toast('Add how the guest agreed, so there is a record.');$('kgn').focus();return}
    b.disabled=true;try{var r=g;if(on.length)r=await call('staff_crm_set_consent',{p_key:g.key,p_channels:on,p_granted:true,p_note:note});if(off.length)r=await call('staff_crm_set_consent',{p_key:g.key,p_channels:off,p_granted:false,p_note:note||null});toast('Offers and news saved.');kgPaint(r)}catch(e){toast(errText(e));b.disabled=false}};
  $('kgs').onclick=async function(){var b=this;b.disabled=true;try{var r=await call('staff_crm_set_note',{p_key:g.key,p_note:$('kgt').value,p_vip:$('kgv').checked});toast('Note saved.');kgPaint(r)}catch(e){toast(errText(e));b.disabled=false}}}

/* v51 (13 Oct 2026): journey fixes from the navigation audit.
   Unsaved edits in a booking are never dropped without asking; printing covers Teppanyaki and lunch and dinner together;
   the guest directory and settings sections are in browser history; refresh returns to the same screen; related records link up. */
var KZDS={},KZPG={dirty:false};
function kzDrDirty(){if(!drawerOpen())return false;return Object.keys(KZDS).some(function(k){var e=$(k);return e&&e.innerHTML.trim()})}
function kzAskHtml(id){return '<div class="dask" id="'+id+'" role="alertdialog" aria-labelledby="'+id+'-t"><b id="'+id+'-t">You have changes that are not saved.</b><span class="small">Keep editing to save them, or discard them.</span><div class="row"><button type="button" class="btn primary" data-ask="keep">Keep editing</button><button type="button" class="btn danger" data-ask="drop">Discard changes</button></div></div>'}
function kzDrAsk(proceed){var d=document.querySelector('#dr .drawer');if(!d){KZDS={};return proceed()}
  d.style.transform='';var old=$('dask');if(old)old.remove();d.insertAdjacentHTML('afterbegin',kzAskHtml('dask'));var a=$('dask');d.scrollTop=0;
  a.querySelector('[data-ask="keep"]').focus();
  a.querySelector('[data-ask="keep"]').onclick=function(){a.remove();var k=Object.keys(KZDS).find(function(x){return $(x)&&$(x).innerHTML.trim()}),r=k&&$(k);if(r){if(r.tagName==='DETAILS')r.open=true;var det=r.closest('details');if(det)det.open=true;var f=r.querySelector('input,textarea,select');if(f)f.focus()}};
  a.querySelector('[data-ask="drop"]').onclick=function(){KZDS={};a.remove();proceed()}}
function kzPageDirty(){if(!KZPG.dirty)return false;var m=main();if(!m)return false;var nw=state.tab==='new';if(!(state.tab==='settings'||(nw&&$('nb'))))return false;
  /* only fields that differ from what is saved count; on New booking, only typed details (a name, phone, note) are worth asking about */
  return [].slice.call(m.querySelectorAll('input,textarea,select')).some(function(e){if(e.closest('.dask,.search')||e.type==='search'||e.type==='hidden'||e.disabled)return false;
    if(nw&&!(e.tagName==='TEXTAREA'||/^(text|tel|email)$/.test(e.type)))return false;
    if(e.type==='checkbox'||e.type==='radio')return e.checked!==e.defaultChecked;
    if(e.tagName==='SELECT')return [].slice.call(e.options).some(function(o){return o.selected!==o.defaultSelected})&&e.options.length>0&&![].slice.call(e.options).every(function(o){return !o.defaultSelected})?true:false;
    var v=e.value.trim(),d=(e.defaultValue||'').trim();return v!==d&&!(nw&&/^\+?679$/.test(v.replace(/\s/g,'')))})}
function kzPageAsk(proceed){var m=main();if(!m){KZPG.dirty=false;return proceed()}var old=$('pask');if(old)old.remove();m.insertAdjacentHTML('afterbegin',kzAskHtml('pask'));var a=$('pask');window.scrollTo(0,0);a.querySelector('[data-ask="keep"]').focus();
  a.querySelector('[data-ask="keep"]').onclick=function(){a.remove()};
  a.querySelector('[data-ask="drop"]').onclick=function(){KZPG.dirty=false;a.remove();proceed()}}
function kzLeaveSettings(proceed){if(kzPageDirty())return kzPageAsk(proceed);proceed()}
(function(){
  /* which edits count as unsaved */
  function mark(e){var t=e.target;if(!t||!t.closest)return;
    if(t.closest('#dr')){var r=t.closest('#fedit,#gnote,#chgbox');if(r)KZDS[r.id]=1;return}
    if(t.closest('main')&&(state.tab==='settings'||state.tab==='new')&&!t.closest('#kgq,.search'))KZPG.dirty=true;
    if(state.tab==='new'&&$('nv')&&t.closest('main')){var nm=$('nmsg');if(nm)nm.innerHTML=''}}
  document.addEventListener('input',mark,true);document.addEventListener('change',mark,true);
  var _dw=drawer;drawer=function(b){KZDS={};var r=_dw.apply(this,arguments);try{kzGuestLink(b)}catch(e){}return r};
  var _cd=closeDrawer;closeDrawer=function(){if(kzDrDirty())return kzDrAsk(function(){closeDrawer()});KZDS={};_cd.apply(this,arguments);kzSaveCtx()};
  var _ob=openBooking;openBooking=function(id,msg){if(!msg&&drawerOpen()&&state.openId!==id&&kzDrDirty())return kzDrAsk(function(){openBooking(id)});var r=_ob.apply(this,arguments);kzSaveCtx();return r};
  var _go=go;go=function(tab){var a=arguments,self=this;if(tab!==state.tab&&kzPageDirty())return kzPageAsk(function(){_go.apply(self,a)});KZPG.dirty=false;return _go.apply(this,arguments)};
  var _rs=renderSettings;renderSettings=function(){KZPG.dirty=false;var r=_rs.apply(this,arguments);kzSaveCtx();return r};
  /* a write that went through means the form on screen is saved */
  var _c=call;call=async function(fn){var r=await _c.apply(this,arguments);if(!/^staff_(get|list|booking_history|crm_guests|crm_guest$|me$)/.test(fn))KZPG.dirty=false;return r};
  /* New booking: a group or event, or a time chosen on the calendar, needs the full form; the remembered form stays as it was */
  var _rn=renderNew;renderNew=function(){var pre=state.newPre,prev=state.newMode;KZPG.dirty=false;
    if(pre&&(pre.svc==='event'||pre.time)&&!pre.grill)state.newMode='full';
    try{return _rn.apply(this,arguments)}finally{state.newMode=prev}};
  /* clear what the last person left behind on a shared tablet */
  var _lv=loginView;loginView=function(){QB=null;state.newPre=null;KG.key=null;KG.q='';KZDS={};KZPG.dirty=false;return _lv.apply(this,arguments)};
  /* every history step also remembers the screen for a refresh */
  var _hp=hpush;hpush=function(){var r=_hp.apply(this,arguments);setTimeout(kzSaveCtx,0);return r};
  /* print: both halves of the day, with a heading that says so */
  var printSplit=null;
  window.addEventListener('beforeprint',function(){if(!me||state.tab!=='today'||!$('day')||!state.day)return;printSplit=state.split||'';state.split='all';try{paintDay()}catch(e){}
    var d=$('day');if(d&&!$('prh'))d.insertAdjacentHTML('afterbegin','<p class="printonly" id="prh">Teppanyaki, lunch and dinner. Printed '+esc(tl(nowHM()))+'.</p>')});
  window.addEventListener('afterprint',function(){if(printSplit===null)return;state.split=printSplit||null;printSplit=null;var h=$('prh');if(h)h.remove();if(state.tab==='today'&&$('day'))try{paintDay()}catch(e){}});
  /* kitchen overview and grill stations stay signed in while they are on screen */
  setInterval(function(){if(me&&!document.hidden&&state.tab==='today'&&(state.view==='kitchen'||state.view==='stations')){lastTouch=0;touchActive()}},60000);
  /* guest record: booking history opens the booking */
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#kzs .kg-bkopen');if(!b)return;openBooking(b.dataset.bk)});
})();
/* booking to guest record (admins) */
function kzGuestLink(b){if(!me||me.role!=='admin'||!b||(!b.phone&&!b.email))return;var body=document.querySelector('#dr .dbody');if(!body||$('dgr'))return;
  body.insertAdjacentHTML('beforeend','<div class="row noprint" style="margin:14px 0 0"><button type="button" class="btn sm" id="dgr">Guest record</button></div>');
  $('dgr').onclick=async function(){var btn=this;btn.disabled=true;var q=(b.phone&&b.phone!=='Not given'?b.phone:'')||b.email,key=null;
    try{key=await call('staff_crm_key_for',{p_phone:b.phone||null,p_email:b.email||null})}catch(e){key=null}
    if(!key)try{var d=await call('staff_crm_guests',{p:{q:q,seg:null,limit:20}}),dg=String(b.phone||'').replace(/\D/g,'').slice(-7),em=String(b.email||'').toLowerCase();
      var m=(d.guests||[]).filter(function(x){return (dg.length>=6&&String(x.phone||'').replace(/\D/g,'').slice(-7)===dg)||(em&&String(x.email||'').toLowerCase()===em)});if(m.length===1)key=m[0].key}catch(e){}
    var go2=function(){KZDS={};state.openId=null;$('dr').innerHTML='';if(history.state&&history.state.modal==='dr')hback();KG.q=key?KG.q:q;KG.key=key;go('guests')};
    if(kzDrDirty()){btn.disabled=false;return kzDrAsk(go2)}go2()}}
/* refresh returns to the same screen for the same person, for up to 2 hours */
function kzSaveCtx(){if(!me)return;try{sessionStorage.setItem('kz_ctx',JSON.stringify({u:me.email||me.name,t:Date.now(),tab:state.tab,view:state.view,date:state.date,today:state.date===fijiToday(),stab:state.stab||null,kg:state.tab==='guests'?KG.key||null:null,open:drawerOpen()?state.openId:null}))}catch(e){}}
function kzRestore(){var c=null;try{c=JSON.parse(sessionStorage.getItem('kz_ctx')||'null')}catch(e){}
  if(!c||!me||c.u!==(me.email||me.name)||Date.now()-c.t>IDLE_MS)return null;
  if(c.tab&&c.tab!=='new'&&(c.tab!=='guests'||me.role==='admin'))state.tab=c.tab;if(c.view&&VHINT[c.view])state.view=c.view;
  if(c.date&&!c.today)state.date=c.date;if(c.stab)state.stab=c.stab;if(c.kg)KG.key=c.kg;return c}

/* v52 (13 Oct 2026): Host Desk, and walk-ins built into New booking.
   Host Desk: who is arriving, who is waiting, where they can sit, what needs attention. One next step per guest.
   Arrival, choosing a table, seating and leaving are separate steps, each with Undo. Uses the same bookings, seating rules and drawer as the rest of the app. */
Object.assign(ERR,{NOT_ARRIVED:'Mark the guests as arrived first.',NO_TABLE:'Choose a table for them first.',TABLE_NOT_READY:'That table still needs cleaning. Mark it ready, or choose another table.',
  CHANGED_ELSEWHERE:'Someone else just changed this booking. The latest details are now on screen. Check them and try again.',ALREADY_SEATED:'They are already seated.',NOT_TODAY:'Guests can only be seated on the day of their booking.'});
var HD={view:'upcoming',pane:'guests',period:null,x:null,at:0,err:null,sit:null,timer:null,drag:null};
function hdPeriodDefault(){return state.date===fijiToday()&&nowHM()<'15:30'?'lunch':'dinner'}
function hdMarks(){var m={};((HD.x&&HD.x.marks)||[]).forEach(function(r){m[r.id]=r});return m}
function hdCleaning(){var c={};((HD.x&&HD.x.cleaning)||[]).forEach(function(r){c[r.code]=r});return c}
async function hdFetch(){
  var r=await Promise.all([call('staff_get_day',{p_date:state.date}),call('staff_get_alc',{p_date:state.date}).catch(function(){return null}),call('staff_host_extras',{p_date:state.date})]);
  state.day=r[0];state.alc=r[1];HD.x=r[2];HD.at=Date.now();HD.err=null}
/* every party of the day once, with what the Host Desk needs */
function hdParties(){var d=state.day||{},m=hdMarks(),seen={},out=[];
  function add(p,svc,sess){if(!p||seen[p.id])return;seen[p.id]=1;var k=m[p.id]||{};
    out.push(Object.assign({},p,{svc:svc,time:sess||p.session_time,status:k.status||p.status,arrived_at:k.arrived_at!==undefined?k.arrived_at:p.arrived_at,seated_at:k.seated_at||null,departed_at:k.departed_at||null,updated_at:k.updated_at||null,is_test:k.is_test||p.is_test||/^test/i.test(p.name||'')}))}
  (d.sessions||[]).forEach(function(s){(s.tables||[]).forEach(function(t){(t.parties||[]).forEach(function(p){add(p,'teppanyaki',s.session_time)})});(s.unassigned||[]).forEach(function(p){add(p,'teppanyaki',s.session_time)})});
  (d.dining||[]).forEach(function(p){add(p,'dining',p.session_time)});(d.events||[]).forEach(function(p){add(p,'event',p.session_time)});
  (d.inactive||[]).forEach(function(p){add(p,(p.service||'teppanyaki'),p.session_time)});
  return out.sort(function(a,b){return (a.time||'').localeCompare(b.time||'')||(a.name||'').localeCompare(b.name||'')})}
function hdCodes(p){return p.split&&Object.keys(p.split).length?Object.keys(p.split):(p.tables||[])}
function hdTableText(p){var c=hdCodes(p);if(!c.length)return '';return p.svc==='teppanyaki'?(p.split&&Object.keys(p.split).length>1?splitText(p.split):tnames(c)):(alcNames(c)||c.join(' + '))}
function hdState(p){if(/^(cancelled|declined)$/.test(p.status))return 'gone';if(p.status==='no_show')return 'noshow';if(p.departed_at)return 'left';
  if(p.seated_at)return 'seated';if(p.arrived_at&&p.status!=='completed')return 'here';if(p.status==='completed')return 'left';return /^pending/.test(p.status)?'request':'upcoming'}
function hdInPeriod(t){var per=HD.period||hdPeriodDefault();return per==='lunch'?(t||'')<'16:00':(t||'')>='16:00'}
function hdLists(){var all=hdParties().filter(function(p){return hdInPeriod(p.time)}),wl=((HD.x&&HD.x.waitlist)||[]).filter(function(w){return w.service!=='teppanyaki'||(HD.period||hdPeriodDefault())==='dinner'});
  var L={upcoming:[],here:[],seated:[],all:all};all.forEach(function(p){var s=hdState(p);if(s==='upcoming'||s==='request')L.upcoming.push(p);else if(s==='here')L.here.push(p);else if(s==='seated')L.seated.push(p)});
  L.wait=wl;return L}
function hdMins(iso){return iso?Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000)):0}
function hdClock(iso){if(!iso)return '';var d=new Date(iso);return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'Pacific/Fiji'})}
function hdAlerts(p){var a=[];if(p.allergens&&p.allergens.length)a.push(['alg','Allergy: '+p.allergens.join(', ')+(p.svc==='teppanyaki'||p.seated_at?'':' — review before seating')]);
  if(p.dietary&&!/^none$/i.test(p.dietary))a.push(['diet','Dietary: '+p.dietary]);if(p.diet_prefs&&p.diet_prefs.length)a.push(['diet',p.diet_prefs.join(', ')]);
  if(p.wheelchair)a.push(['need','Wheelchair access']);if(p.high_chairs)a.push(['need',p.high_chairs+' high chair'+(p.high_chairs>1?'s':'')]);
  if(p.needs)a.push(['need',p.needs]);if(p.occasion)a.push(['cel',p.occasion]);return a}
function hdStatusLine(p){var st=hdState(p),tt=hdTableText(p),today=state.date===fijiToday();
  if(st==='upcoming'||st==='request'){var late=today&&p.time&&addMins(p.time,15)<nowHM();return (st==='request'?'Request, not confirmed yet':late?'Late, expected '+tl(p.time):'Expected')+' · '+(tt?'Table: '+tt:'No table yet')}
  if(st==='here')return 'Arrived'+(p.arrived_at?' '+hdClock(p.arrived_at):'')+' · '+(tt?'Table: '+tt:'Table not assigned');
  if(st==='seated')return 'Seated at '+(tt||'a table')+' · since '+hdClock(p.seated_at);
  if(st==='left')return p.departed_at?'Left at '+hdClock(p.departed_at):'Visit complete';
  return st==='noshow'?'No-show':p.status==='declined'?'Declined':'Cancelled'}
function hdMain(p){var st=hdState(p);if(state.date!==fijiToday()&&st!=='upcoming'&&st!=='request')return null;
  if(st==='upcoming'||st==='request')return state.date===fijiToday()?['arrive','Mark Arrived']:null;
  if(st==='here')return hdCodes(p).length?['seat','Seat Guests']:['choose','Choose Table'];
  if(st==='seated')return ['depart','Mark Departed'];return null}
function hdCard(p){var a=hdMain(p),al=hdAlerts(p),st=hdState(p);
  return '<div class="hd-card hd-'+st+(HD.drag&&HD.drag.id===p.id?' dragging':'')+'" data-hid="'+p.id+'"><button type="button" class="hd-main" data-hopen="'+p.id+'"><span class="hd-l1"><b>'+esc(tl(p.time))+'</b> · <span class="hd-nm">'+esc(p.name)+'</span> · '+p.size+(p.size===1?' guest':' guests')+(p.is_test?' <span class="tag">Test booking</span>':'')+(p.vip?' <span class="tag">VIP</span>':'')+'</span>'+
    '<span class="hd-l2">'+(p.svc==='teppanyaki'?'Teppanyaki · ':p.svc==='event'?'Group or event · ':'')+esc(hdStatusLine(p))+'</span>'+
    al.map(function(x){return '<span class="hd-al hd-al-'+x[0]+'">'+esc(x[1])+'</span>'}).join('')+'</button>'+
    '<div class="hd-acts">'+(a?'<button type="button" class="btn primary hd-go" data-hact="'+a[0]+'" data-id="'+p.id+'">'+a[1]+'</button>':'')+'<button type="button" class="btn hd-more" data-hmore="'+p.id+'">More</button></div></div>'}
function hdWaitCard(w){var m=hdMins(w.added_at),al=hdAlerts({allergens:w.allergens,wheelchair:w.wheelchair,high_chairs:w.high_chairs,needs:w.needs,svc:'wait'});
  return '<div class="hd-card hd-wait" data-wid="'+w.id+'"><div class="hd-main hd-main-s"><span class="hd-l1"><b>Waiting</b> · <span class="hd-nm">'+esc(w.name)+'</span> · '+w.size+(w.size===1?' guest':' guests')+(w.is_test?' <span class="tag">Test</span>':'')+'</span>'+
    '<span class="hd-l2">'+(w.service==='teppanyaki'?'Teppanyaki'+(w.session_time?' '+esc(tl(w.session_time)):'')+' · ':'')+'Added '+hdClock(w.added_at)+' · waiting '+m+' min'+(w.quoted_minutes?' · Staff quoted '+w.quoted_minutes+' min':'')+(w.phone?' · Has a phone number':'')+'</span>'+
    al.map(function(x){return '<span class="hd-al hd-al-'+x[0]+'">'+esc(x[1])+'</span>'}).join('')+'</div>'+
    '<div class="hd-acts">'+(state.date===fijiToday()?'<button type="button" class="btn primary hd-go" data-wchoose="'+w.id+'">Choose Table</button>':'')+'<button type="button" class="btn hd-more" data-wmore="'+w.id+'">More</button></div></div>'}
/* tables: one tile per grill (for the chosen sitting) and per dining table or counter */
function hdSit(){var ss=(state.day&&state.day.sessions)||[];if(!ss.length)return null;if(HD.sit&&ss.some(function(s){return s.session_time===HD.sit}))return HD.sit;
  var now=nowHM(),pick=ss[0].session_time;if(state.date===fijiToday())ss.forEach(function(s){if(addMins(s.session_time,-30)<=now)pick=s.session_time});return pick}
function hdTiles(){var out=[],cl=hdCleaning(),ps=hdParties(),per=HD.period||hdPeriodDefault(),today=state.date===fijiToday(),now=nowHM();
  if(per==='dinner'){var sit=hdSit(),s=sit&&sessionOf(sit);if(s)s.tables.forEach(function(t){var here=ps.filter(function(p){return p.svc==='teppanyaki'&&p.time===sit&&hdCodes(p).indexOf(t.code)>=0&&!/^(cancelled|declined|no_show)$/.test(p.status)});
      var seated=here.filter(function(p){return p.seated_at&&!p.departed_at}),b=blockOf(sit,t.code),free=freeFor(s,t.code,'_none');
      out.push({kind:'grill',code:t.code,name:tname(t.code),seats:t.seats,free:free,sit:sit,state:b?'unavailable':cl[t.code]?'cleaning':seated.length?'occupied':'ready',why:b?(b.reason||'Blocked for this sitting'):'',parties:here,seated:seated})})}
  if(alcOn()){var dps=ps.filter(function(p){return p.svc!=='teppanyaki'&&!/^(cancelled|declined|no_show)$/.test(p.status)&&hdInPeriod(p.time)});
    state.alc.floor.forEach(function(f){if(f.is_active===false)return;var on=dps.filter(function(p){return hdCodes(p).indexOf(f.code)>=0});var seated=on.filter(function(p){return p.seated_at&&!p.departed_at});
      var next=on.filter(function(p){return !p.seated_at&&!p.departed_at&&p.status!=='completed'}).sort(function(a,b){return a.time.localeCompare(b.time)})[0];
      out.push({kind:'alc',area:f.area,code:f.code,name:f.name,seats:f.seats,state:cl[f.code]?'cleaning':seated.length?'occupied':'ready',parties:on,seated:seated,next:next})})}
  return out}
var HD_ST={ready:'Ready',occupied:'Occupied',cleaning:'Needs cleaning',unavailable:'Unavailable'};
function hdTile(t,fit){var info='';
  if(t.kind==='grill'){var bk=t.parties.reduce(function(n,p){return n+((p.split&&p.split[t.code])||p.size)},0);info=t.state==='unavailable'?esc(t.why):(t.seated.length?esc(t.seated.map(function(p){return p.name}).join(', ')):'')+(bk?(t.seated.length?' · ':'')+bk+' of '+t.seats+' seats booked':'All '+t.seats+' seats free')}
  else{info=t.seated.length?esc(t.seated[0].name)+' ('+t.seated[0].size+')':t.next?'Next: '+esc(tl(t.next.time))+' '+esc(t.next.name)+' ('+t.next.size+')':'No bookings'}
  var f=fit?' fit-'+fit.k:'';
  return '<div class="hd-tile st-'+t.state+f+'" data-tcode="'+t.code+'" data-tkind="'+t.kind+'"><button type="button" class="hd-tb" data-tile="'+t.code+'"><span class="hd-tn">'+esc(t.name)+'</span><span class="hd-ts">Seats '+t.seats+'</span><span class="hd-tst">'+HD_ST[t.state]+'</span><span class="hd-ti">'+info+'</span>'+(fit?'<span class="hd-tfit">'+esc(fit.t)+'</span>':'')+'</button>'+
    (t.state==='cleaning'&&state.date===fijiToday()?'<button type="button" class="btn sm hd-ready" data-ready="'+t.code+'">Mark Ready</button>':'')+'</div>'}
function hdTablesHtml(fitFn,only){var ts=hdTiles().filter(function(t){return !only||t.kind===only}),g=ts.filter(function(t){return t.kind==='grill'}),areas=[['dining_room','Dining room'],['yakitori_counter','Yakitori counter'],['sushi_bar','Sushi bar']],h='';
  var ss=(state.day&&state.day.sessions)||[];
  if(g.length)h+='<section class="hd-tsec"><div class="hd-th"><h3>Teppanyaki grills</h3>'+(ss.length>1?'<div class="seg hd-sit" role="group" aria-label="Sitting">'+ss.map(function(s){var on=s.session_time===hdSit();return '<button type="button" data-hsit="'+s.session_time+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+esc(s.label)+'</button>'}).join('')+'</div>':'')+'</div><div class="hd-tgrid">'+g.map(function(t){return hdTile(t,fitFn&&fitFn(t))}).join('')+'</div></section>';
  areas.forEach(function(a){var at=ts.filter(function(t){return t.kind==='alc'&&t.area===a[0]});if(at.length)h+='<section class="hd-tsec"><div class="hd-th"><h3>'+a[1]+'</h3></div><div class="hd-tgrid'+(a[0]==='dining_room'?'':' hd-cgrid')+'">'+at.map(function(t){return hdTile(t,fitFn&&fitFn(t))}).join('')+'</div></section>'});
  if(!h)h='<p class="muted">No tables to show for this service.</p>';
  return h+'<p class="small muted hd-legend">Ready: free to seat. Occupied: guests seated. Needs cleaning: guests have left; tap Mark Ready once it is cleared. An empty table may still be booked later: check “Next”.</p>'}
/* main screen */
function renderHost(){stopTimer();if(!HD.period)HD.period=hdPeriodDefault();var t=fijiToday(),narrow=window.innerWidth<1100;
  main().innerHTML='<div class="hd" data-pane="'+HD.pane+'"><div class="hd-top"><div class="hd-title"><div><h1>Host Desk</h1><span class="muted" id="hdsub">Kazumi · '+esc(state.date===t?'Today, '+fmt(state.date,{day:'numeric',month:'long'}):longDate(state.date))+'</span></div><button class="btn sm hd-help" id="hdh">Help</button></div>'+
    '<div class="hd-ctl"><div class="row hd-date"><button class="icon-btn" id="hdp" aria-label="Previous day">'+I.left+'</button><input type="date" id="hdd" value="'+state.date+'" aria-label="Choose a date"><button class="icon-btn" id="hdn" aria-label="Next day">'+I.right+'</button>'+(state.date!==t?'<button class="btn" id="hdt">Today</button>':'')+'</div>'+
    '<div class="seg hd-per" role="group" aria-label="Service">'+[['lunch','Lunch'],['dinner','Dinner']].map(function(x){var on=HD.period===x[0];return '<button type="button" data-per="'+x[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+x[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="hd-btns"><button class="btn" id="hds">'+I.search+'<span>Find a guest</span></button><button class="btn primary" id="hdw">New booking</button></div></div>'+
    '<div id="hdnote"></div>'+
    (narrow?'<div class="seg hd-pane" role="group" aria-label="Show"><button type="button" data-pane="guests" class="'+(HD.pane==='guests'?'on':'')+'">Guests</button><button type="button" data-pane="tables" class="'+(HD.pane==='tables'?'on':'')+'">Tables</button></div>':'')+
    '<div class="hd-cols"><section class="hd-guests" aria-label="Guests"><div class="seg hd-views" id="hdv" role="tablist" aria-label="Guests"></div><div id="hdlist"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></section>'+
    '<section class="hd-tables" aria-label="Tables"><h2 class="hd-h2">Tables</h2><div id="hdtab"></div></section></div></div>';
  $('hdp').onclick=function(){state.date=addDays(state.date,-1);HD.sit=null;renderHost()};$('hdn').onclick=function(){state.date=addDays(state.date,1);HD.sit=null;renderHost()};
  var tt=$('hdt');if(tt)tt.onclick=function(){state.date=fijiToday();HD.period=hdPeriodDefault();renderHost()};$('hdd').onchange=function(){if(this.value){state.date=this.value;HD.sit=null;renderHost()}};
  main().querySelectorAll('[data-per]').forEach(function(b){b.onclick=function(){HD.period=b.dataset.per;HD.sit=null;renderHost()}});
  main().querySelectorAll('[data-pane]').forEach(function(b){if(b.tagName==='BUTTON')b.onclick=function(){HD.pane=b.dataset.pane;renderHost()}});
  $('hds').onclick=openSearch;$('hdw').onclick=function(){window.kzWalkIn({})};$('hdh').onclick=hdHelp;
  hdLoad();HD.timer=setInterval(function(){if(state.tab==='host'&&!document.hidden&&!drawerOpen()&&!searchOpen()&&!HD.drag)hdLoad(true)},30000);state.timer=HD.timer}
async function hdLoad(quiet){try{await hdFetch()}catch(e){HD.err=e;if(!quiet&&$('hdlist')&&!state.day)$('hdlist').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}hdPaint()}
function hdPaint(){var el=$('hdlist');if(!el||state.tab!=='host')return;var L=hdLists(),cnt={upcoming:L.upcoming.length,here:L.here.length+L.wait.length,seated:L.seated.length,all:L.all.length};
  var off=!navigator.onLine||HD.err;$('hdnote').innerHTML=off?'<div class="msg warn">'+(navigator.onLine?'The last update did not come through.':'No connection.')+' What you see may be out of date'+(HD.at?' (updated '+hdClock(new Date(HD.at).toISOString())+')':'')+'. <button class="link" id="hdre">Try again</button></div>':'';
  var re=$('hdre');if(re)re.onclick=function(){hdLoad()};
  $('hdv').innerHTML=[['upcoming','Upcoming'],['here','Arrived or waiting'],['seated','Seated'],['all','All bookings']].map(function(v){var on=HD.view===v[0];return '<button type="button" role="tab" data-hv="'+v[0]+'" class="'+(on?'on':'')+'" aria-selected="'+on+'">'+v[1]+' <b>'+cnt[v[0]]+'</b></button>'}).join('');
  $('hdv').querySelectorAll('[data-hv]').forEach(function(b){b.onclick=function(){HD.view=b.dataset.hv;hdPaint()}});
  var list=L[HD.view]||[],h='';
  if(HD.view==='here'){h+=L.here.map(hdCard).join('');if(L.wait.length)h+='<h3 class="hd-sub">Waiting list</h3>'+L.wait.map(hdWaitCard).join('')}
  else h=list.map(hdCard).join('');
  if(!h){var E={upcoming:['Nobody else is expected for '+(HD.period==='lunch'?'lunch':'dinner')+'.','<button class="btn" data-empty="walk">New booking</button>'],here:['No guests waiting.','<button class="btn" data-empty="walk">New booking</button>'],seated:['Nobody is seated yet.','<span class="small muted">Choose a guest, then Seat Guests.</span>'],all:['No bookings for '+(HD.period==='lunch'?'lunch':'dinner')+' on this day.','<button class="btn" data-empty="walk">New booking</button>']}[HD.view];
    h='<div class="hd-empty"><p>'+E[0]+'</p>'+E[1]+'</div>'}
  else if(HD.view!=='all')h='<p class="small muted hd-tip">'+({upcoming:'Tap a guest to see their details. Mark Arrived when they walk in.',here:'Choose a table that fits, then Seat Guests.',seated:'Guests have left? Mark Departed, then clean the table.'})[HD.view]+'</p>'+h;
  el.innerHTML=h;
  el.querySelectorAll('[data-empty]').forEach(function(b){b.onclick=function(){if(b.dataset.empty==='walk')window.kzWalkIn({});else{state.newPre={date:state.date};go('new')}}});
  $('hdtab').innerHTML=hdTablesHtml();bindHost()}
function hdFind(id){return hdParties().find(function(p){return p.id===id})}
function hdWait(id){return ((HD.x&&HD.x.waitlist)||[]).find(function(w){return w.id===id})}
function bindHost(){var m=main();
  m.querySelectorAll('[data-hopen]').forEach(function(b){b.onclick=function(){if(HD.dragged){HD.dragged=false;return}openBooking(b.dataset.hopen)}});
  m.querySelectorAll('[data-hact]').forEach(function(b){b.onclick=function(){hdAct(b.dataset.id,b.dataset.hact,b)}});
  m.querySelectorAll('[data-hmore]').forEach(function(b){b.onclick=function(){hdMore(b.dataset.hmore)}});
  m.querySelectorAll('[data-wchoose]').forEach(function(b){b.onclick=function(){var w=hdWait(b.dataset.wchoose);if(w)hdChoose({wait:w})}});
  m.querySelectorAll('[data-wmore]').forEach(function(b){b.onclick=function(){hdWaitMore(b.dataset.wmore)}});
  m.querySelectorAll('[data-hsit]').forEach(function(b){b.onclick=function(){HD.sit=b.dataset.hsit;hdPaint()}});
  m.querySelectorAll('[data-ready]').forEach(function(b){b.onclick=function(){hdReady(b.dataset.ready,b)}});
  m.querySelectorAll('#hdtab [data-tile]').forEach(function(b){b.onclick=function(){hdTileSheet(b.dataset.tile)}});
  hdDragBind()}
/* actions */
async function hdAct(id,a,btn){var p=hdFind(id);if(!p)return;
  if(a==='choose')return hdChoose({p:p});
  if(a==='seat'&&(p.allergens&&p.allergens.length||(p.dietary&&!/^none$/i.test(p.dietary)))&&!btn.dataset.ok)return hdAllergyCheck(p,function(){btn.dataset.ok='1';hdAct(id,a,btn)});
  if(btn){btn.disabled=true;btn.textContent=a==='arrive'?'Saving…':a==='seat'?'Seating…':'Saving…'}
  try{if(a==='arrive'){await call('staff_action2',{p_id:id,p_action:'arrived',p_reason:null,p_notify:false});await hdLoad(true);toast(p.name+' has arrived.',function(){hdUndo(id,'undo_arrived',p.name)},hdCodes(p).length?null:{label:'Choose Table',fn:function(){var q=hdFind(id);if(q)hdChoose({p:q})}})}
    else if(a==='seat'){await call('staff_host_action',{p_id:id,p_action:'seat',p_seen:p.updated_at});await hdLoad(true);toast(p.name+' seated at '+hdTableText(p)+'.',function(){hdUndo(id,'unseat',p.name)})}
    else if(a==='depart'){await call('staff_host_action',{p_id:id,p_action:'depart',p_seen:p.updated_at});await hdLoad(true);toast(p.name+' has left. '+(hdTableText(p)||'The table')+' needs cleaning.',function(){hdUndo(id,'undo_depart',p.name)})}}
  catch(e){await hdLoad(true);toast(errText(e))}}
async function hdUndo(id,a,name){try{if(a==='undo_arrived')await call('staff_action2',{p_id:id,p_action:'undo_arrived',p_reason:null,p_notify:false});else await call('staff_host_action',{p_id:id,p_action:a,p_seen:null});toast('Undone. '+name+' is back as before.')}catch(e){toast(errText(e))}hdLoad(true)}
function hdSheet(title,sub,body,foot){var sr=$('sr');if(!sr)return null;root.querySelectorAll('.toast').forEach(function(o){o.remove()});if(!HS.sr){HS.sr=1;hpush({kz:1,tab:state.tab,view:state.view,modal:'sr'})}
  sr.innerHTML='<div class="scrim"></div><div class="dsheet hd-sheet" role="dialog" aria-modal="true" aria-labelledby="hdsh-t"><div class="dsh-h"><div><h2 id="hdsh-t">'+title+'</h2>'+(sub?'<p class="small muted">'+sub+'</p>':'')+'</div><button class="btn sm" id="hdsx">Close</button></div>'+body+(foot?'<div class="dsh-f">'+foot+'</div>':'')+'</div>';
  var ret=document.activeElement;function close(){closeSearch();if(ret&&ret.focus&&document.body.contains(ret))ret.focus({preventScroll:true})}
  sr.querySelector('.scrim').onclick=close;$('hdsx').onclick=close;var f=sr.querySelector('.dsheet button:not(#hdsx),.dsheet input');if(f)f.focus({preventScroll:true});return sr}
function hdAllergyCheck(p,go2){var t=[];if(p.allergens&&p.allergens.length)t.push('<b>Allergy:</b> '+esc(p.allergens.join(', ')));if(p.dietary&&!/^none$/i.test(p.dietary))t.push('<b>Dietary:</b> '+esc(p.dietary));
  var sr=hdSheet('Before you seat '+esc(p.name),'Check the kitchen and the chef know.','<div class="hd-algbox">'+t.join('<br>')+'</div>','<button class="btn primary" id="hdaok">Yes, the team knows. Seat them</button><button class="btn" id="hdano">Not yet</button>');
  if(!sr)return;$('hdaok').onclick=function(){closeSearch();go2()};$('hdano').onclick=closeSearch}
function hdMore(id){var p=hdFind(id);if(!p)return;var st=hdState(p),today=state.date===fijiToday(),b=[];
  b.push(['open','Open details','']);if(st!=='left'&&st!=='gone'&&st!=='noshow'&&p.svc!=='event')b.push(['table',hdCodes(p).length?'Change table':'Choose table','']);
  if(st==='here')b.push(['undo_arrived','Correct: not arrived yet','']);if(st==='seated')b.push(['unseat','Correct: not seated yet','']);if(st==='left'&&p.departed_at&&today)b.push(['undo_depart','Correct: has not left','']);
  if(p.guest_key||p.phone||p.email)b.push(['guest','Guest history','']);
  if((st==='upcoming'||st==='request')&&today)b.push(['no_show','Mark no-show','danger']);
  if(st==='upcoming'||st==='request')b.push(['cancel','Cancel booking…','danger']);
  var sr=hdSheet(esc(p.name)+', '+p.size+(p.size===1?' guest':' guests'),esc(hdStatusLine(p)),'<div class="hd-mlist">'+b.map(function(x){return '<button type="button" class="btn hd-mi '+x[2]+'" data-m="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>','');
  if(!sr)return;sr.querySelectorAll('[data-m]').forEach(function(x){x.onclick=async function(){var m=x.dataset.m;closeSearch();
    if(m==='open'||m==='cancel'||m==='guest')return openBooking(id);if(m==='table')return hdChoose({p:p});
    if(m==='no_show'){var s2=hdSheet('Mark '+esc(p.name)+' as a no-show?','Use this only when they have not come and have not called.','', '<button class="btn danger solid" id="hdnsy">Mark no-show</button><button class="btn" id="hdnsn">Keep booking</button>');
      $('hdnsn').onclick=closeSearch;$('hdnsy').onclick=async function(){closeSearch();try{await call('staff_action2',{p_id:id,p_action:'no_show',p_reason:null,p_notify:false});toast(p.name+' is marked as a no-show.',function(){hdUndo(id,'reopen_ns',p.name)})}catch(e){toast(errText(e))}hdLoad(true)};return}
    hdUndo(id,m,p.name)}})}
/* choose a table: tap a table, then confirm. Same rules as the seating plan; the database checks again on save. */
function hdFitFn(p){var cl=hdCleaning();
  if(p.svc==='teppanyaki'){var s=sessionOf(p.time);return function(t){if(t.kind!=='grill')return {k:'no',t:'Teppanyaki guests sit at a grill'};if(t.sit!==p.time)return {k:'no',t:'Other sitting'};
      if(t.state==='unavailable')return {k:'no',t:'Unavailable'};var fr=s?freeFor(s,t.code,p.id):0;if(fr<p.size)return {k:'no',t:fr?'Only '+fr+' seats free':'Full'};
      return cl[t.code]?{k:'warn',t:'Fits, needs cleaning first'}:{k:'ok',t:'Fits '+p.size}}}
  var parties=hdParties().filter(function(q){return q.svc!=='teppanyaki'&&!/^(cancelled|declined|no_show)$/.test(q.status)&&!q.departed_at}),busy=alcBusy({id:p.id,session_time:p.time,size:p.size},parties);
  return function(t){if(t.kind!=='alc')return {k:'no',t:'Grills are for Teppanyaki'};var o=t.seated.filter(function(q){return q.id!==p.id})[0];if(o)return {k:'no',t:'Occupied by '+o.name};
    var b=busy[t.code];if(b)return {k:'no',t:'Booked '+tl(b.session_time)+' '+b.name};if(t.area==='dining_room'&&t.seats<p.size)return {k:'no',t:'Seats '+t.seats+' only'};
    return cl[t.code]?{k:'warn',t:'Free, needs cleaning first'}:{k:'ok',t:t.area==='dining_room'?'Fits '+p.size:'Free seat'}}}
async function hdChoose(o){
  if(state.tab!=='host'||!HD.x||state.date!==fijiToday()&&o.wait){state.date=o.wait?fijiToday():state.date;try{await hdFetch()}catch(e){return toast(errText(e))}}
  var p=o.p,w=o.wait,pseudo=null;
  if(w){var svc=w.service,tm=null;if(svc==='teppanyaki'){tm=w.session_time||hdSit()}else{try{var op=await timeOptions('dining',fijiToday(),w.size),now=nowHM(),pk=op.filter(function(x){return !x.bad&&addMins(x.v,30)>=now})[0];tm=pk?pk.v:null}catch(e){}}
    if(!tm)return toast(svc==='teppanyaki'?'No Teppanyaki sitting is open now.':'No lunch or dinner time has room right now. Keep them on the waiting list.');
    pseudo={id:'_w',name:w.name,size:w.size,svc:svc,time:tm,allergens:w.allergens,tables:[],split:null};p=pseudo}
  if(p.svc==='teppanyaki'){HD.sit=p.time;HD.period='dinner'}else HD.period=(p.time||'')<'16:00'?'lunch':'dinner';
  var fit=hdFitFn(p),only=p.svc==='teppanyaki'?'grill':'alc',sel=o.pre||null,here=!!(w||p.arrived_at),today=state.date===fijiToday();
  var best=null;if(p.svc==='teppanyaki'){var s=sessionOf(p.time);if(s){var r=planFor(s,[{id:p.id,size:p.size,allergens:p.allergens||[]}]);best=r&&r.items&&r.items[p.id]||null}}
  else if(alcOn()){var parties=hdParties().filter(function(q){return q.svc!=='teppanyaki'&&!/^(cancelled|declined|no_show)$/.test(q.status)&&!q.departed_at});
    ['dining_room','yakitori_counter','sushi_bar'].some(function(a){var c=alcBest({id:p.id,session_time:p.time,size:p.size},a,parties);if(c){best=c;return true}})}
  function draw(msg){var tiles=hdTablesHtml(fit,only);
    var sr=hdSheet('Choose a table for '+esc(p.name),p.size+(p.size===1?' guest':' guests')+', '+(p.svc==='teppanyaki'?'Teppanyaki '+esc(tl(p.time)):esc(tl(p.time)))+(p.allergens&&p.allergens.length?'. Allergy: '+esc(p.allergens.join(', ')):'')+'. Select a ready table that fits this party.',
      (best?'<button type="button" class="btn hd-best" id="hdbest">Best fit: '+esc(p.svc==='teppanyaki'?splitText(best):alcNames(best))+'</button>':'')+'<div class="hd-pick">'+tiles+'</div><div id="hdcm">'+(msg||'')+'</div>',
      sel?(here&&today?'<button class="btn primary" id="hdcs">Seat at '+esc(hdSelName(sel))+' now</button><button class="btn" id="hdca">Assign only</button>':'<button class="btn primary" id="hdca">Assign '+esc(hdSelName(sel))+'</button>'):'<span class="small muted">Tap a table above.</span>');
    if(!sr)return;sr.querySelector('.dsheet').classList.add('hd-wide');
    sr.querySelectorAll('.hd-pick [data-tile]').forEach(function(b){var c=b.dataset.tile,t=hdTiles().find(function(x){return x.code===c}),f=t&&fit(t);if(sel&&sel.codes.length===1&&sel.codes[0]===c)b.parentElement.classList.add('picked');
      b.onclick=function(){if(!f||f.k==='no'){$('hdcm').innerHTML='<div class="msg warn">'+esc(t.name)+': '+esc(f?f.t:'Not available')+'. Choose another table.</div>';return}
        if(t.kind==='alc'&&t.area!=='dining_room'){var fl=state.alc.floor.filter(function(x){return x.area===t.area}),i=fl.findIndex(function(x){return x.code===c}),n=Math.min(p.size,fl.length);if(i+n>fl.length)i=fl.length-n;sel={codes:fl.slice(i,i+n).map(function(x){return x.code})}}
        else sel={codes:[c]};draw()}});
    sr.querySelectorAll('.hd-pick [data-ready],.hd-pick [data-hsit]').forEach(function(b){b.disabled=true;b.hidden=true});
    var bb=$('hdbest');if(bb)bb.onclick=function(){sel=p.svc==='teppanyaki'?{split:best,codes:Object.keys(best)}:{codes:best};draw()};
    var cs=$('hdcs'),ca=$('hdca');if(cs)cs.onclick=function(){save(true,cs)};if(ca)ca.onclick=function(){save(false,ca)}}
  async function save(seatNow,btn){btn.disabled=true;btn.textContent='Saving…';var id=p.id;
    try{if(w){var r=await call('staff_waitlist_book',{p_id:w.id,p_time:p.time});id=r.id;w=null;p=Object.assign({},p,{id:id})}
      if(p.svc==='teppanyaki'){var sp=sel.split;if(!sp){sp={};sp[sel.codes[0]]=p.size}await call('staff_seat',{p_id:id,p_split:sp})}
      else{var r2=await call('staff_seat_alc',{p_id:id,p_codes:sel.codes,p_force:false});if(r2&&r2.ok===false){var c=(r2.conflicts||[]).map(function(q){return q.name+' ('+q.size+') at '+tl(q.time)});throw new Error('TABLE_TAKEN:'+(c.length?'Already in use by '+c.join(', ')+'.':'It is too small for this party.'))}}
      if(seatNow)await call('staff_host_action',{p_id:id,p_action:'seat',p_seen:null});
      closeSearch();await hdLoad(true);var nm=hdSelName(sel);
      toast(seatNow?p.name+' seated at '+nm+'.':p.name+': '+nm+' assigned. Seat them when they are ready.',seatNow?function(){hdUndo(id,'unseat',p.name)}:null,{label:'Open booking',fn:function(){openBooking(id)}});
      if(o.after)o.after(id,nm,seatNow)}
    catch(e){var m=String(e&&e.message||'');var t2=m.indexOf('TABLE_TAKEN:')===0?m.slice(12)+' Choose another table.':errText(e);
      try{await hdFetch()}catch(x){}if(w===null&&o.wait){o={p:hdFind(id),after:o.after};p=o.p||p;fit=hdFitFn(p)}
      draw('<div class="msg err">'+esc(t2)+(o.p&&id!=='_w'?' The guests are booked and marked arrived; their details are kept.':' Their details are still here, try again.')+'</div>')}}
  draw()}
function hdSelName(sel){if(!sel)return '';if(sel.split)return splitText(sel.split);var c=sel.codes;return alcNames(c)||tnames(c)}
async function hdReady(code,btn){if(btn){btn.disabled=true;btn.textContent='Saving…'}var nm=(alcItem(code)||{}).name||tname(code);
  try{await call('staff_table_state',{p_code:code,p_state:'ready',p_date:state.date});await hdLoad(true);toast(nm+' is ready.',async function(){try{await call('staff_table_state',{p_code:code,p_state:'cleaning',p_date:state.date})}catch(e){toast(errText(e))}hdLoad(true)})}
  catch(e){toast(errText(e));hdLoad(true)}}
function hdTileSheet(code){var t=hdTiles().find(function(x){return x.code===code});if(!t)return;var today=state.date===fijiToday();
  var rows=t.parties.filter(function(p){return !/^(cancelled|declined|no_show)$/.test(p.status)}).map(function(p){return '<button type="button" class="btn hd-mi" data-op="'+p.id+'">'+esc(tl(p.time))+' · '+esc(p.name)+' ('+p.size+') · '+esc(hdStatusLine(p).split(' · ')[0])+'</button>'}).join('');
  var sr=hdSheet(esc(t.name)+' · seats '+t.seats,HD_ST[t.state]+(t.why?': '+esc(t.why):''),'<div class="hd-mlist">'+(rows||'<p class="muted">No guests at this table.</p>')+'</div>',
    (today&&t.state==='cleaning'?'<button class="btn primary" id="hdtr">Mark Ready</button>':'')+(today&&t.state==='ready'&&t.kind==='alc'&&!t.seated.length?'<button class="btn" id="hdtc">Mark as needs cleaning</button>':'')+(today&&t.state!=='unavailable'?'<button class="btn" id="hdtw">New booking at '+esc(t.name)+'</button>':''));
  if(!sr)return;sr.querySelectorAll('[data-op]').forEach(function(b){b.onclick=function(){closeSearch();openBooking(b.dataset.op)}});
  var r=$('hdtr');if(r)r.onclick=function(){closeSearch();hdReady(code)};var c=$('hdtc');if(c)c.onclick=async function(){closeSearch();try{await call('staff_table_state',{p_code:code,p_state:'cleaning',p_date:state.date})}catch(e){toast(errText(e))}hdLoad(true)};
  var w=$('hdtw');if(w)w.onclick=function(){closeSearch();window.kzWalkIn(t.kind==='grill'?{svc:'teppanyaki',sit:t.sit,grill:code}:{svc:'dining',table:code})}}
/* waiting list: edit, remove with a reason */
function hdWaitMore(id){var w=hdWait(id);if(!w)return;
  var sr=hdSheet(esc(w.name)+', '+w.size+(w.size===1?' guest':' guests'),'On the waiting list since '+hdClock(w.added_at)+'.',
    '<div class="hd-mlist"><button type="button" class="btn hd-mi" data-wm="edit">Change guests or wait time</button><button type="button" class="btn hd-mi danger" data-wm="remove">Remove from the waiting list…</button></div>','');
  if(!sr)return;sr.querySelector('[data-wm="edit"]').onclick=function(){hdWaitEdit(w)};
  sr.querySelector('[data-wm="remove"]').onclick=function(){var why=['Left before a table was free','Seated without the list','Added by mistake'],pick=why[0];
    var s2=hdSheet('Remove '+esc(w.name)+'?','Choose why. You can undo this straight after.','<div class="qpills hd-why">'+why.map(function(x,i){return '<button type="button" class="qp'+(i===0?' on':'')+'" data-why="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>',
      '<button class="btn danger solid" id="hdwry">Remove</button><button class="btn" id="hdwrn">Keep waiting</button>');
    s2.querySelectorAll('[data-why]').forEach(function(b){b.onclick=function(){pick=b.dataset.why;s2.querySelectorAll('[data-why]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    $('hdwrn').onclick=closeSearch;$('hdwry').onclick=async function(){closeSearch();try{await call('staff_waitlist_remove',{p_id:w.id,p_reason:pick});toast(w.name+' removed from the waiting list.',async function(){try{await call('staff_waitlist_restore',{p_id:w.id})}catch(e){toast(errText(e))}hdLoad(true)})}catch(e){toast(errText(e))}hdLoad(true)}}}
function hdWaitEdit(w){var n=w.size,qm=w.quoted_minutes||0;
  function draw(){var sr=hdSheet('Change '+esc(w.name),'',
    '<p class="wk-q">How many guests?</p><div class="wkn">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(function(i){return '<button class="btn'+(i===n?' primary':'')+'" data-en="'+i+'">'+i+'</button>'}).join('')+'</div>'+
    '<p class="wk-q">Wait you told them <small class="muted">(your estimate)</small></p><div class="qpills">'+[0,10,15,20,30,45].map(function(i){return '<button type="button" class="qp'+(i===qm?' on':'')+'" data-eq="'+i+'">'+(i?i+' min':'Not quoted')+'</button>'}).join('')+'</div><div id="hdwem"></div>',
    '<button class="btn primary" id="hdwes">Save changes</button><button class="btn" id="hdwec">Discard changes</button>');
    sr.querySelectorAll('[data-en]').forEach(function(b){b.onclick=function(){n=+b.dataset.en;draw()}});sr.querySelectorAll('[data-eq]').forEach(function(b){b.onclick=function(){qm=+b.dataset.eq;draw()}});
    $('hdwec').onclick=closeSearch;$('hdwes').onclick=async function(){var b=this;b.disabled=true;b.textContent='Saving…';
      try{await call('staff_waitlist_update',{p_id:w.id,p:{adults:n-Math.min(w.children,n-1),children:Math.min(w.children,n-1),quoted_minutes:qm||''},p_seen:w.updated_at});closeSearch();toast('Saved. '+w.name+' is now '+n+(n===1?' guest':' guests')+'.');hdLoad(true)}
      catch(e){$('hdwem').innerHTML='<div class="msg err">'+esc(errText(e))+' Your changes are still here.</div>';b.disabled=false;b.textContent='Try again';if(/CHANGED/.test(String(e.message))){await hdLoad(true);w=hdWait(w.id)||w}}}}
  draw()}
/* drag a guest card onto a table: opens Choose Table with that table picked. Nothing is saved until you confirm. */
function hdDragBind(){var m=main();m.querySelectorAll('.hd-guests .hd-card[data-hid]').forEach(function(card){var p=null,timer=null,start=null;
  card.addEventListener('pointerdown',function(e){if(e.target.closest('.hd-acts'))return;var q=hdFind(card.dataset.hid);if(!q||!hdMain(q)||state.date!==fijiToday()||window.innerWidth<1100)return;start={x:e.clientX,y:e.clientY,id:e.pointerId,touch:e.pointerType!=='mouse'};p=q;
    if(start.touch)timer=setTimeout(function(){begin(e)},380)});
  card.addEventListener('pointermove',function(e){if(!start||HD.drag)return;if(!start.touch&&Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)>8)begin(e);else if(start.touch&&Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)>10){clearTimeout(timer);start=null}});
  card.addEventListener('pointerup',function(){clearTimeout(timer);start=null});card.addEventListener('pointercancel',function(){clearTimeout(timer);start=null});
  function begin(e){if(!p)return;var fit=hdFitFn(p);HD.drag={id:p.id};card.classList.add('dragging');
    var g=document.createElement('div');g.className='hd-ghost';g.textContent=p.name+' ('+p.size+')';root.appendChild(g);
    m.querySelectorAll('#hdtab .hd-tile').forEach(function(t){var tt=hdTiles().find(function(x){return x.code===t.dataset.tcode}),f=tt&&fit(tt);t.classList.add(f&&f.k!=='no'?'drop-ok':'drop-no');t.setAttribute('data-why',f?f.t:'')});
    function mv(ev){g.style.left=ev.clientX+12+'px';g.style.top=ev.clientY+12+'px';ev.preventDefault()}
    function up(ev){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);g.remove();card.classList.remove('dragging');HD.dragged=true;setTimeout(function(){HD.dragged=false},50);
      var el=document.elementFromPoint(ev.clientX,ev.clientY),tile=el&&el.closest&&el.closest('#hdtab .hd-tile');m.querySelectorAll('#hdtab .hd-tile').forEach(function(t){t.classList.remove('drop-ok','drop-no');t.removeAttribute('data-why')});HD.drag=null;start=null;
      if(!tile)return;var tt=hdTiles().find(function(x){return x.code===tile.dataset.tcode}),f=tt&&fit(tt);
      if(!f||f.k==='no'){toast((tt?tt.name:'That table')+': '+(f?f.t:'not available')+'. Nothing was changed.');return}
      var codes=[tt.code];if(tt.kind==='alc'&&tt.area!=='dining_room'){var fl=state.alc.floor.filter(function(x){return x.area===tt.area}),i=fl.findIndex(function(x){return x.code===tt.code}),n=Math.min(p.size,fl.length);if(i+n>fl.length)i=fl.length-n;codes=fl.slice(i,i+n).map(function(x){return x.code})}
      hdChoose({p:p,pre:{codes:codes}})}
    document.addEventListener('pointermove',mv,{passive:false});document.addEventListener('pointerup',up);mv(e)}})}
/* Show me how: short, optional, uses the real screen */
var HD_HELP=[['Find a booking','Tap Find a guest and type part of a name or phone number. Or look in Upcoming.','#hds'],['Mark guests arrived','In Upcoming, tap Mark Arrived on their card when they walk in.','.hd-go[data-hact="arrive"],[data-hv="upcoming"]'],
  ['Choose a table','In Arrived or waiting, tap Choose Table, then tap a ready table that fits.','[data-hv="here"]'],['Seat guests','Once a table is chosen, tap Seat Guests. If they have an allergy, check the team knows first.','[data-hv="here"]'],
  ['Add a walk-in','Tap New booking. Choose where they eat, Today, how many, then Now, seat them. A name is optional. Then Seat now or Add to waiting list.','#hdw'],['Complete a visit','In Seated, tap Mark Departed when they leave. Then clean the table and tap Mark Ready in Tables.','[data-hv="seated"]']];
function hdHelp(){var sr=hdSheet('Show me how','Six everyday tasks. Tap one to see where it is on the screen.','<ol class="hd-howl">'+HD_HELP.map(function(h,i){return '<li><button type="button" class="hd-how" data-how="'+i+'"><b>'+h[0]+'</b><span>'+h[1]+'</span></button></li>'}).join('')+'</ol>','<button class="btn" id="hdhx">Close</button>');
  if(!sr)return;$('hdhx').onclick=closeSearch;sr.querySelectorAll('[data-how]').forEach(function(b){b.onclick=function(){var h=HD_HELP[+b.dataset.how];closeSearch();
    if(state.view&&/hv="(\w+)"/.test(h[2])&&!document.querySelector(h[2].split(',')[0])){var v=h[2].match(/hv="(\w+)"/)[1];HD.view=v;hdPaint()}
    var el=document.querySelector(h[2].split(',')[0])||document.querySelector(h[2].split(',').pop());if(!el)return toast(h[1]);
    if(window.innerWidth<1100&&HD.pane!=='guests'&&!el.closest('.hd-top')){HD.pane='guests';renderHost()}
    el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('hd-spot');setTimeout(function(){el.classList.remove('hd-spot')},4000);toast(h[0]+': '+h[1])}})}
/* walk-ins live inside New booking now: every Walk-in button opens it, with today and now filled in */
window.kzWalkIn=function(pre){pre=pre&&!pre.type?pre:{};var at=!!(pre.grill||pre.table);state.newPre={walk:true,date:at?state.date:null,svc:pre.svc||null,sit:pre.sit||null,wgrill:pre.grill||null,wtable:pre.table||null};go('new')};
(function(){
  /* walk-in from any button: quick steps, even when the full form is remembered */
  var _rn=renderNew;renderNew=function(){var pre=state.newPre,prev=state.newMode;if(pre&&pre.walk)state.newMode='quick';try{return _rn.apply(this,arguments)}finally{state.newMode=prev;if(pre&&pre.wgrill)state.grillPre={date:pre.date||state.date,time:pre.sit,grill:pre.wgrill}}};
  /* undo for a no-show from the Host Desk */
  var _hu=hdUndo;hdUndo=async function(id,a,name){if(a==='reopen_ns'){try{await call('staff_action2',{p_id:id,p_action:'reopen',p_reason:null,p_notify:false});toast('Undone. '+name+' is back as expected.')}catch(e){toast(errText(e))}return hdLoad(true)}return _hu.apply(this,arguments)};
  /* the drawer: after a change there, the Host Desk shows it */
  var _cd2=closeDrawer;closeDrawer=function(){var r=_cd2.apply(this,arguments);if(state.tab==='host'&&!drawerOpen())setTimeout(function(){hdLoad(true)},50);return r};
  /* going to New booking on purpose starts an ordinary booking, even after a walk-in */
  var _go2=go;go=function(tab){if(tab==='new'&&!state.newPre&&QB&&(QB.walk||QB.fromWalk))QB=null;return _go2.apply(this,arguments)};
  /* times always in 12-hour format: native time boxes (24-hour on many tablets) become a list of 12-hour times */
  function to12(inp){var v=inp.value||'',sel=document.createElement('select');sel.id=inp.id;sel.className=inp.className;sel.disabled=inp.disabled;if(inp.getAttribute('aria-label'))sel.setAttribute('aria-label',inp.getAttribute('aria-label'));
    var h='';for(var m=6*60;m<24*60;m+=15){var t=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');h+='<option value="'+t+'"'+(v.slice(0,5)===t?' selected':'')+'>'+tl(t)+'</option>'}
    if(v&&!/:(00|15|30|45)/.test(v.slice(2,5)))h='<option value="'+esc(v.slice(0,5))+'" selected>'+tl(v.slice(0,5))+'</option>'+h;sel.innerHTML=h;inp.replaceWith(sel)}
  new MutationObserver(function(){var t=document.querySelectorAll('#kzs input[type="time"]');if(t.length)[].forEach.call(t,to12)}).observe(document.documentElement,{childList:true,subtree:true});
  /* closing any sheet on the Host Desk shows the latest list (a partly saved change is never hidden) */
  var _cs=closeSearch;closeSearch=function(){var r=_cs.apply(this,arguments);if(state.tab==='host'&&$('hdlist')&&HD.x)hdPaint();return r};
  /* New booking pressed while a walk-in is open: start an ordinary booking */
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-nav="new"]');if(!b||state.tab!=='new'||!QB||!(QB.walk||QB.fromWalk))return;e.stopPropagation();e.preventDefault();QB=null;state.newPre=null;renderNew();window.scrollTo(0,0)},true);
  window.addEventListener('online',function(){if(state.tab==='host')hdLoad(true)});window.addEventListener('offline',function(){if(state.tab==='host')hdPaint()});
  window.addEventListener('resize',function(){if(state.tab!=='host')return;var n=window.innerWidth<1100,has=!!document.querySelector('.hd-pane');if(n!==has)renderHost()});
})();

/* v55 (13 Oct 2026): one calendar for every date in the Service Hub, in the same style as the guest booking form and the
   Bonefish booking card: round days, today marked with a dot, months with round arrows, a soft fade and lift on laptops
   and tablets, a bottom sheet on phones. The original date box stays in the page (hidden) so every screen keeps working. */
(function(){
  var MON=['January','February','March','April','May','June','July','August','September','October','November','December'],DOW=['Mo','Tu','We','Th','Fr','Sa','Su'];
  var cur=null;
  function pad(n){return String(n).padStart(2,'0')}
  function iso(y,m,d){return y+'-'+pad(m+1)+'-'+pad(d)}
  function label(v){return v?fmt(v,{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'Choose a date'}
  function phone(){return window.innerWidth<600}
  function enhance(inp){if(inp.dataset.kzd)return;inp.dataset.kzd='1';inp.classList.add('kz-denh');inp.tabIndex=-1;inp.setAttribute('aria-hidden','true');
    var b=document.createElement('button');b.type='button';b.className='kz-dbtn';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');
    var al=inp.getAttribute('aria-label')||'Date';b.setAttribute('aria-label',al+': '+label(inp.value));
    b.innerHTML='<span class="kz-dtx"></span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
    if(inp.disabled)b.disabled=true;inp.after(b);inp._kzBtn=b;
    function sync(){b.querySelector('.kz-dtx').textContent=label(inp.value);b.classList.toggle('is-empty',!inp.value);b.setAttribute('aria-label',al+': '+label(inp.value));b.disabled=inp.disabled}
    sync();inp.addEventListener('input',sync);inp.addEventListener('change',sync);inp._kzSync=sync;
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(cur&&cur.inp===inp)return close();open(inp,b)})}
  function close(back){if(!cur)return;var c=cur;cur=null;c.btn.setAttribute('aria-expanded','false');c.pop.classList.remove('is-open');if(c.scrim)c.scrim.classList.remove('is-open');
    setTimeout(function(){c.pop.remove();if(c.scrim)c.scrim.remove()},320);document.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',place);window.removeEventListener('scroll',onScroll,true);if(back!==false&&document.body.contains(c.btn))c.btn.focus({preventScroll:true})}
  function onScroll(e){if(cur&&e.target&&e.target.nodeType===1&&cur.pop.contains(e.target))return;place()}
  function set(v){var inp=cur.inp;inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));if(inp._kzSync)inp._kzSync();close()}
  function draw(focusDay){var c=cur,y=c.y,m=c.m,first=new Date(Date.UTC(y,m,1)),start=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),t=fijiToday(),mn=c.inp.min||'',mx=c.inp.max||'',v=c.inp.value;
    var prevOk=!mn||mn.slice(0,7)<iso(y,m,1).slice(0,7),nextOk=!mx||mx.slice(0,7)>iso(y,m,1).slice(0,7);
    var h='<div class="kz-cal-head"><button type="button" class="kz-cal-nav" data-cm="-1" aria-label="Previous month"'+(prevOk?'':' disabled')+'>‹</button><strong aria-live="polite">'+MON[m]+' '+y+'</strong><button type="button" class="kz-cal-nav" data-cm="1" aria-label="Next month"'+(nextOk?'':' disabled')+'>›</button></div>'+
      '<div class="kz-cal-grid" role="grid">'+DOW.map(function(d){return '<span class="kz-dow" aria-hidden="true">'+d+'</span>'}).join('');
    for(var i=0;i<start;i++)h+='<span></span>';
    for(var d=1;d<=days;d++){var k=iso(y,m,d),dis=(mn&&k<mn)||(mx&&k>mx);h+='<button type="button" class="kz-day'+(k===t?' is-today':'')+'" data-d="'+k+'" aria-selected="'+(k===v)+'" aria-label="'+esc(fmt(k,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+(k===t?', today':'')+'"'+(dis?' disabled':'')+' tabindex="-1">'+d+'</button>'}
    h+='</div><div class="kz-cal-foot"><button type="button" class="kz-cal-today" data-d="'+t+'"'+((mn&&t<mn)||(mx&&t>mx)?' disabled':'')+'>Today</button>'+(c.inp.required||!v?'':'')+'</div>';
    c.body.innerHTML=h;
    c.body.querySelectorAll('[data-cm]').forEach(function(x){x.onclick=function(){var n=c.m+(+x.dataset.cm);c.y+=Math.floor(n/12);c.m=(n%12+12)%12;draw();place()}});
    c.body.querySelectorAll('[data-d]').forEach(function(x){x.onclick=function(){if(!x.disabled)set(x.dataset.d)}});
    var f=focusDay&&c.body.querySelector('[data-d="'+focusDay+'"]:not(:disabled)')||c.body.querySelector('.kz-day[aria-selected="true"]:not(:disabled)')||c.body.querySelector('.kz-day.is-today:not(:disabled)')||c.body.querySelector('.kz-day:not(:disabled)');
    if(f){f.tabIndex=0;if(focusDay!==false)f.focus({preventScroll:true})}}
  function onKey(e){if(!cur)return;if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();return}
    var a=document.activeElement;if(!a||!a.classList||!a.classList.contains('kz-day'))return;var mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
    if(e.key==='Enter'||e.key===' '){e.preventDefault();a.click();return}if(!mv)return;e.preventDefault();var d=new Date(a.dataset.d+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+mv);
    var k=d.toISOString().slice(0,10);if(+k.slice(5,7)-1!==cur.m||+k.slice(0,4)!==cur.y){cur.y=+k.slice(0,4);cur.m=+k.slice(5,7)-1;draw(k);place()}else{var n=cur.body.querySelector('[data-d="'+k+'"]');if(n&&!n.disabled){a.tabIndex=-1;n.tabIndex=0;n.focus()}}}
  function place(){if(!cur)return;var p=cur.pop,s=p.style;if(phone()){p.classList.add('is-sheet');s.left='0';s.right='0';s.top='auto';s.bottom='0';s.width='auto';return}
    p.classList.remove('is-sheet');var r=cur.btn.getBoundingClientRect(),W=Math.min(340,window.innerWidth-28),H=p.offsetHeight,vh=window.innerHeight,top=r.bottom+8;
    if(top+H>vh-14){var above=r.top-8-H;top=above>=14?above:Math.max(14,vh-14-H);p.classList.toggle('is-above',above>=14)}else p.classList.remove('is-above');
    var left=Math.min(Math.max(14,r.left),window.innerWidth-14-W);s.width=W+'px';s.left=left+'px';s.top=top+'px';s.right='auto';s.bottom='auto'}
  function open(inp,btn){close(false);var v=inp.value||fijiToday(),mn=inp.min;if(mn&&v<mn)v=mn;
    var pop=document.createElement('div');pop.className='kz-cal';pop.setAttribute('role','dialog');pop.setAttribute('aria-modal',phone()?'true':'false');pop.setAttribute('aria-label',(inp.getAttribute('aria-label')||'Choose a date'));
    pop.innerHTML=(phone()?'<div class="kz-cal-sh"><span>Choose a date</span><button type="button" class="kz-cal-x" aria-label="Close">×</button></div>':'')+'<div class="kz-cal-b"></div>';
    var scrim=null;if(phone()){scrim=document.createElement('div');scrim.className='kz-cal-scrim';root.appendChild(scrim);scrim.onclick=function(){close()}}
    root.appendChild(pop);cur={inp:inp,btn:btn,pop:pop,scrim:scrim,body:pop.querySelector('.kz-cal-b'),y:+v.slice(0,4),m:+v.slice(5,7)-1};
    var x=pop.querySelector('.kz-cal-x');if(x)x.onclick=function(){close()};
    btn.setAttribute('aria-expanded','true');draw(false);place();
    /* on a laptop or tablet the page glides so the whole calendar shows below the date, as on the guest form */
    if(!phone()){var r=btn.getBoundingClientRect(),H=pop.offsetHeight,need=r.bottom+8+H-(window.innerHeight-14),room=r.top-90,left=document.documentElement.scrollHeight-window.innerHeight-window.scrollY,inPane=btn.closest('#dr,#sr');
      if(need>0&&need<=room&&need<=left&&!inPane){var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;window.scrollBy({top:Math.ceil(need),behavior:rm?'auto':'smooth'})}}
    requestAnimationFrame(function(){pop.classList.add('is-open');if(scrim)scrim.classList.add('is-open');var f=pop.querySelector('.kz-day[tabindex="0"]');if(f)f.focus({preventScroll:true})});
    document.addEventListener('keydown',onKey,true);window.addEventListener('resize',place);window.addEventListener('scroll',onScroll,true)}
  /* a label around a date (for example the Another day tile) opens this calendar, never the browser's own */
  document.addEventListener('click',function(e){var l=e.target.closest&&e.target.closest('#kzs label');if(!l||e.target.closest('.kz-dbtn,.kz-cal'))return;var i=l.querySelector('input.kz-denh');if(!i)return;e.preventDefault();if(i._kzBtn)i._kzBtn.click()},true);
  document.addEventListener('pointerdown',function(e){if(!cur)return;if(cur.pop.contains(e.target)||cur.btn.contains(e.target))return;close(false)},true);
  function scan(){var l=document.querySelectorAll('#kzs input[type="date"]:not([data-kzd])');if(l.length)[].forEach.call(l,enhance);
    /* values set by code (date arrows, Today button) show straight away */
    [].forEach.call(document.querySelectorAll('#kzs input[data-kzd]'),function(i){var b=i._kzBtn;if(b&&i._kzSync){var t=b.querySelector('.kz-dtx').textContent;if(t!==label(i.value)||b.disabled!==i.disabled)i._kzSync()}})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;scan()})}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['value','disabled','min']});
  /* a screen that redraws while the calendar is open closes it */
  var _sh=shell;shell=function(){close(false);return _sh.apply(this,arguments)};
})();

/* v57 (13 Oct 2026): details slide open when asked for. Grill stations: each guest is one line (name, guests, arrival, and
   any allergy, which never folds away); tap the name to slide open celebration, guests, requests and notes. Service briefing
   and Kitchen overview: sections fold open and shut; allergy sections never fold. Open all and Close all at the top,
   the screen remembers what was left open, and printing always shows everything. */
(function(){
  var KEY='kz_fold',M={};try{M=JSON.parse(lsGet(KEY)||'{}')||{}}catch(e){M={}}
  function save(){try{lsSet(KEY,JSON.stringify(M))}catch(e){}}
  function isOpen(k,def){return M[k]===undefined?def:!!M[k]}
  function setOpen(k,v){M[k]=v?1:0;save()}
  function wrap(nodes,cls){var w=document.createElement('div');w.className='kz-fold '+cls;var inner=document.createElement('div');inner.className='kz-fold-in';w.appendChild(inner);
    if(nodes.length){nodes[0].parentNode.insertBefore(w,nodes[0]);nodes.forEach(function(n){inner.appendChild(n)})}return w}
  function show(w,btn,open,anim){w.classList.toggle('is-open',open);if(btn)btn.setAttribute('aria-expanded',String(open));w.inert=!open;if(!anim)w.classList.add('no-anim');else w.classList.remove('no-anim')}
  function bar(el,view){if(el.querySelector('.kz-foldbar'))return;var b=document.createElement('div');b.className='kz-foldbar noprint';
    b.innerHTML='<span class="small muted">'+(view==='stations'?'Tap a guest to see their details.':'Tap a heading to open or close it.')+'</span><span class="sp"></span><button type="button" class="btn sm" data-fall="1">Open all</button><button type="button" class="btn sm" data-fall="0">Close all</button>';
    var first=el.querySelector('.stns,.bgrid,.kgrid,.bsec');if(first)first.parentNode.insertBefore(b,first);else el.insertBefore(b,el.firstChild);
    b.querySelectorAll('[data-fall]').forEach(function(x){x.onclick=function(){var v=x.dataset.fall==='1';el.querySelectorAll('[data-fk]').forEach(function(t){setOpen(t.dataset.fk,v);var w=document.getElementById(t.getAttribute('aria-controls'));if(w)show(w,t,v,true)})}})}
  var n=0;
  function foldStations(el){el.querySelectorAll('.stnrow').forEach(function(r){if(r.dataset.kzf)return;r.dataset.kzf='1';var nm=r.querySelector('.sname');if(!nm)return;
      var lines=[].slice.call(r.querySelectorAll(':scope > .sl')).filter(function(s){var b=s.querySelector('b');return !s.classList.contains('al')&&!(b&&/^Dietary$/.test(b.textContent))});if(!lines.length)return;
      var labs=lines.map(function(s){var b=s.querySelector('b');return b?b.textContent:''}).filter(function(t){return t&&t!=='Guests'});
      var w=wrap(lines,'sfold');w.id='kzf'+(++n);var k='st:'+state.date+':'+nm.dataset.id+':'+(r.closest('.stn')||{}).id;
      var ob=document.createElement('button');ob.type='button';ob.className='link kz-openbk';ob.textContent='Open booking';ob.onclick=function(){openBooking(nm.dataset.id)};w.firstChild.appendChild(ob);
      if(labs.length){var h=document.createElement('div');h.className='shint';h.textContent='Also: '+labs.join(', ').toLowerCase();w.parentNode.insertBefore(h,w)}
      nm.setAttribute('aria-controls',w.id);nm.dataset.fk=k;nm.classList.add('kz-ftog');show(w,nm,isOpen(k,false),false)})}
  function foldSections(el,view){el.querySelectorAll('.bsec').forEach(function(s){if(s.dataset.kzf)return;s.dataset.kzf='1';var h=s.querySelector(':scope > .bsec-h'),t=h&&h.querySelector('h2');if(!h||!t)return;
      var title=(t.childNodes[0]&&t.childNodes[0].textContent||t.textContent).trim();if(/allerg/i.test(title)||s.classList.contains('salg'))return;
      var body=[].slice.call(s.children).filter(function(c){return c!==h});if(!body.length)return;
      var w=wrap(body,'bfold');w.id='kzf'+(++n);var k=view+':'+title;
      var b=document.createElement('button');b.type='button';b.className='kz-ftog bsec-tog';b.setAttribute('aria-controls',w.id);b.dataset.fk=k;
      while(h.firstChild)b.appendChild(h.firstChild);h.appendChild(b);
      var def=/still to sort|covers/i.test(title);show(w,b,isOpen(k,def),false);s.classList.add('kz-foldable')})}
  function apply(){var el=$('day');if(!el||state.tab!=='today')return;var v=state.view;
    if(v==='stations'){foldStations(el);if(el.querySelector('[data-fk]'))bar(el,v)}else if(v==='brief'||v==='kitchen'){foldSections(el,v);if(el.querySelector('[data-fk]'))bar(el,v)}}
  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{apply()}catch(e){}return r};
  /* the name or heading toggles; in Grill stations the booking opens from inside the details */
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('#day .kz-ftog');if(!t)return;e.preventDefault();e.stopPropagation();
    var w=document.getElementById(t.getAttribute('aria-controls'));if(!w)return;var v=!w.classList.contains('is-open');setOpen(t.dataset.fk,v);show(w,t,v,true)},true);
  window.addEventListener('beforeprint',function(){document.querySelectorAll('#kzs .kz-fold').forEach(function(w){w.inert=false})});
  window.addEventListener('afterprint',function(){document.querySelectorAll('#kzs .kz-fold:not(.is-open)').forEach(function(w){w.inert=true})});
})();

/* v58 (13 Oct 2026): connected flow. A returning guest can be booked again from their booking or guest record, with
   name, phone and email carried in; the booking panel says plainly when no allergies are recorded (not "no allergies");
   No-show sits apart from Arrived; party size choices sit inside their own field on the full form. */
(function(){
  function bookAgain(g){state.newPre={guest:{name:g.name||'',phone:g.phone&&g.phone!=='Not given'?g.phone:'',email:g.email||''}};go('new')}
  window.kzBookAgain=bookAgain;
  var _rn=renderNew;renderNew=function(){var pre=state.newPre,g=pre&&pre.guest;var r=_rn.apply(this,arguments);
    if(g){if($('qb')&&QB){QB.name=g.name;QB.phone=g.phone||'+679 ';QB.email=g.email;QB.fromGuest=g.name}
      var nn=$('nn'),np=$('np'),ne=$('ne');if(nn)nn.value=g.name;if(np&&g.phone)np.value=g.phone;if(ne&&g.email)ne.value=g.email;
      [nn,np,ne].forEach(function(x){if(x){x.dispatchEvent(new Event('input',{bubbles:true}))}});
      var h=main().querySelector('h1');h=h&&(h.parentElement.classList.contains('row')?h.parentElement:h);if(h&&!$('kzbg'))h.insertAdjacentHTML('afterend','<p class="msg info" id="kzbg">Booking again for <b>'+esc(g.name)+'</b>. Their name'+(g.phone?', phone':'')+(g.email?' and email':'')+' are filled in. Check they are still right.</p>');
      if(typeof KZPG!=='undefined')KZPG.dirty=false}
    return r};
  /* the quick form shows the carried-in guest at the name step */
  var _rq=renderQuick;renderQuick=function(){var r=_rq.apply(this,arguments);var q=QB;if(q&&q.fromGuest&&q.step==='who'){var n=$('qname'),p=$('qphone');if(n&&!n.value)n.value=q.name;if(p&&(!p.value||p.value==='+679 '))p.value=q.phone}return r};
  var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{
    var body=document.querySelector('#dr .dbody'),live=/^(confirmed|pending|pending_large_group)$/.test(b.status);
    if(body&&live&&!body.querySelector('.algbox,.dietbox')){var f=body.querySelector('.dfacts');if(f&&!$('kzalgnone'))f.insertAdjacentHTML('beforebegin','<div class="algnone" id="kzalgnone"><b>Allergies</b> None recorded. This does not mean the guest has none: ask them.</div>')}
    if(body&&(b.phone||b.email)&&!$('kzagain')){var x=document.createElement('div');x.className='row noprint';x.style.margin='14px 0 0';x.innerHTML='<button type="button" class="btn sm" id="kzagain">Book again</button>';
      var gr=$('dgr');if(gr&&gr.parentElement)gr.parentElement.appendChild(x.firstChild);else body.appendChild(x);
      $('kzagain').onclick=function(){var go2=function(){KZDS={};state.openId=null;$('dr').innerHTML='';if(history.state&&history.state.modal==='dr')hback();bookAgain(b)};if(kzDrDirty())return kzDrAsk(go2);go2()}}
  }catch(e){}return r};
  var _kp=kgPaint;kgPaint=function(g){var r=_kp.apply(this,arguments);try{var x=$('kgx');if(x&&g&&!$('kgagain')){var top=x.querySelector('.panel');if(top)top.insertAdjacentHTML('afterbegin','<div class="row noprint" style="justify-content:flex-end;margin:0 0 8px"><button type="button" class="btn primary sm" id="kgagain">New booking for '+esc(g.name)+'</button></div>');var b=$('kgagain');if(b)b.onclick=function(){bookAgain(g)}}}catch(e){}return r};
})();

/* v59 (13 Oct 2026): manager approvals and safety checks.
   Staff can still book, mark arrivals, seat and add details. Confirming or declining requests, cancelling, changing date,
   time or guests, closures, grill blocks and booking over capacity go to a manager, who approves or says no.
   A save is refused when someone else changed the booking after it was opened. Booking the same phone or email twice on
   one day asks first. Test bookings are a switch for managers and admins. Allergies are marked as checked with the guest.
   Guest emails that were not delivered show on the booking and under Needs action. */
(function(){
  Object.assign(ERR,{
    REQUEST_SENT:'Sent to a manager. Nothing changes until a manager approves it. The answer shows under Needs action.',
    REQUEST_NOT_SENT:'Not sent to a manager. Nothing was changed.',
    DUP_OPENED:'Not booked. The booking they already have is open.',
    DUP_STOPPED:'Not booked. Nothing was saved.',
    TEST_NOT_ALLOWED:'Only a manager or an admin can make a test booking. Remove TEST from the name.',
    NOT_MANAGER:'Only a manager or an admin can approve requests.',
    ALREADY_DECIDED:'This request has already been answered. The list is now up to date.',
    NOT_ALLOWED:'This cannot be sent to a manager.',
    CHANGED_ELSEWHERE:'Someone else changed this booking just now, so this was not saved and nothing was overwritten. Check the latest details and try again.'});
  var SEEN={},SEEN_FNS={staff_update_booking:1,staff_set_extras:1,staff_change_booking:1};
  var WHAT={confirm:'Confirming a booking request',decline:'Declining a booking request',cancel:'Cancelling a booking',change:'Changing the date, time or number of guests',
    closure:'Closing or reopening a date',grill:'Blocking or unblocking a grill',overbook:'This time is full. Booking over capacity'};
  function approver(){return !!(me&&(me.role==='admin'||me.role==='manager'))}
  window.kzApprover=approver;
  function plain(a){var o={};Object.keys(a||{}).forEach(function(k){if(k.slice(0,2)!=='__'&&k!=='p_seen')o[k]=a[k]});return o}
  /* a sheet that answers with a promise; closing it any other way counts as "not now" */
  function ask(title,sub,body,foot,bind){return new Promise(function(res){var done=false;function fin(v){if(done)return;done=true;mo.disconnect();res(v)}
    var sr=hdSheet(title,sub,body,foot);if(!sr)return res(null);var mo=new MutationObserver(function(){if(!sr.innerHTML)fin(null)});mo.observe(sr,{childList:true});
    bind(function(v){fin(v);closeSearch()})})}
  async function askApproval(fn,args,what){
    var t=WHAT[what]||'This change';
    var v=await ask(t+' needs a manager','Send it to a manager to approve. Nothing changes until they do.',
      '<label class="f full" style="margin-top:4px">Note for the manager <small>Optional. For example, what the guest asked for.</small><textarea id="kzapn" maxlength="500" rows="3"></textarea></label><div id="kzapm" role="status"></div>',
      '<button class="btn primary" id="kzaps">Send to a manager</button><button class="btn" id="kzapx">Do not send</button>',
      function(fin){$('kzapx').onclick=function(){fin(null)};
        $('kzaps').onclick=async function(){var b=this;b.disabled=true;b.textContent='Sending…';
          try{var pa=plain(args);if(args&&args.__extras&&typeof args.__extras==='object')pa.kz_extras=args.__extras;await call('staff_request_change',{p_fn:fn,p_args:pa,p_reason:$('kzapn').value.trim()||null});fin('sent')}
          catch(e){b.disabled=false;b.textContent='Try again';$('kzapm').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}});
    if(v==='sent'){toast('Sent to a manager.');loadNeeds()}
    throw new Error(v==='sent'?'REQUEST_SENT':'REQUEST_NOT_SENT')}
  function changedSheet(id,details){var p=String(details||'').split('|'),who=p[0]||'Someone',at=p[1]||'',what=(p[2]||'').toLowerCase();
    ask('This booking was changed by '+esc(who),(at?'At '+esc(at)+(what?', '+esc(what):'')+'. ':'')+'Your changes were not saved, so nothing was overwritten.',
      '<p class="small" style="margin:6px 0 0">Show the latest to see what changed, then make your change again. Or keep your changes on screen to copy them first.</p>',
      '<button class="btn primary" id="kzchl">Show the latest</button><button class="btn" id="kzchk">Keep my changes on screen</button>',
      function(fin){$('kzchl').onclick=function(){fin('load')};$('kzchk').onclick=function(){fin(null)}}).then(function(v){
        if(v==='load'){KZDS={};if(drawerOpen())openBooking(id,'These are the latest details.','info')}})}
  async function sameDay(args){
    var phone=(args.p_phone||'').trim();if(phone==='Not given'||phone==='+679')phone='';if(!phone&&!args.p_email)return;
    var rows;try{var r=await sb.rpc('staff_same_day',{p_date:args.p_date,p_phone:phone||null,p_email:args.p_email||null});if(r.error)return;rows=r.data||[]}catch(e){return}
    if(!rows.length)return;
    var list=rows.map(function(x){return '<li><b>'+esc(x.name)+'</b>, '+x.size+(x.size===1?' guest':' guests')+', '+esc(svcName(x))+' '+esc(tl(x.session_time))+'</li>'}).join('');
    var v=await ask('Already booked on '+esc(shortDate(args.p_date)),'The same phone number or email has '+(rows.length===1?'a booking':rows.length+' bookings')+' that day.',
      '<ul class="kz-dupl">'+list+'</ul><p class="small muted" style="margin:6px 0 0">Open it to change it instead, or book anyway if this is a separate table.</p>',
      '<button class="btn primary" id="kzdo">Open their booking</button><button class="btn" id="kzdb">Book anyway</button>',
      function(fin){$('kzdo').onclick=function(){fin('open')};$('kzdb').onclick=function(){fin('book')}});
    if(v==='book')return;
    if(v==='open'){openBooking(rows[0].id);throw new Error('DUP_OPENED')}
    throw new Error('DUP_STOPPED')}
  var _call59=call;call=async function(fn,args){args=args||{};
    if(SEEN_FNS[fn]&&args.p_id&&SEEN[args.p_id]&&args.p_seen===undefined){args=Object.assign({},args,{p_seen:SEEN[args.p_id]});
      if(fn==='staff_change_booking'){if(args.p_force===undefined)args.p_force=false;if(args.p_notify===undefined)args.p_notify=true}}
    if(fn==='staff_create_any'){
      if(window.KZTEST&&approver()&&!/^\s*test/i.test(args.p_name||''))args=Object.assign({},args,{p_name:'TEST '+(args.p_name||'').trim()});
      if(!args.__dupOk)await sameDay(args)}
    var d;
    try{d=await _call59.call(this,fn,plainSend(args))}
    catch(e){var m=(e&&e.message)||'';
      if(m.indexOf('NEEDS_APPROVAL')>=0)return askApproval(fn,args,e.details);
      if(m.indexOf('CHANGED_ELSEWHERE')>=0&&SEEN_FNS[fn])changedSheet(args.p_id,e.details);
      throw e}
    if(d&&typeof d==='object'&&d.id&&d.seen)SEEN[d.id]=d.seen;return d};
  function plainSend(a){var o={};Object.keys(a).forEach(function(k){if(k.slice(0,2)!=='__')o[k]=a[k]});return o}
  window.kzSeen=SEEN;
  /* messages from a request show as information, not as a failure */
  var _ob=openBooking;openBooking=function(id,msg,kind){if(msg===ERR.REQUEST_SENT)kind='ok';else if(msg===ERR.REQUEST_NOT_SENT||msg===ERR.DUP_STOPPED)kind='warn';return _ob.call(this,id,msg,kind)};
  /* booking panel: test banner, emails not delivered, allergy checked */
  function ago(ts){return ts?stamp(ts):''}
  var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{
    var body=document.querySelector('#dr .dbody');if(!body)return r;var head=body.querySelector('.dhead'),top=[];
    if(b.is_test)top.push('<div class="msg warn kz-testbn" id="kztestbn"><b>Test booking.</b> It does not count toward capacity, and the guest is not emailed.</div>');
    (b.email_problems||[]).forEach(function(p){top.push('<div class="msg err kz-mailbad" data-src="'+esc(p.src)+'" data-mid="'+esc(p.id)+'"><b>Email not delivered.</b> '+esc(p.label)+' to '+esc(p.to||'the guest')+' did not go through'+(p.error?' ('+esc(String(p.error).slice(0,120))+')':'')+'. Call the guest if it matters, then mark it as handled.<div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-mail="retry">Try again</button><button type="button" class="btn sm" data-mail="done">Mark as handled</button></div></div>')});
    if(top.length){var w=document.createElement('div');w.innerHTML=top.join('');if(head&&head.nextSibling)body.insertBefore(w,head.nextSibling);else body.insertBefore(w,body.firstChild);
      w.querySelectorAll('[data-mail]').forEach(function(x){x.onclick=async function(){var box=x.closest('.kz-mailbad');x.disabled=true;
        try{await call(x.dataset.mail==='retry'?'staff_email_retry':'staff_email_handled',{p_src:box.dataset.src,p_id:box.dataset.mid});
          openBooking(b.id,x.dataset.mail==='retry'?'Sending the email again. If it fails again it will show here.':'Marked as handled.');loadNeeds()}
        catch(e){x.disabled=false;toast(errText(e))}}})}
    var box=body.querySelector('.algbox,.dietbox');var live=/^(confirmed|pending|pending_large_group)$/.test(b.status);
    if(box&&live&&!$('kzalc')){var d=document.createElement('div');d.id='kzalc';d.className='kz-alc'+(b.allergy_checked_at?' ok':'');
      d.innerHTML=b.allergy_checked_at?'<span>Checked with the guest by '+esc(b.allergy_checked_by||'staff')+', '+esc(ago(b.allergy_checked_at))+'.</span><button type="button" class="link" id="kzalu">Undo</button>'
        :'<span><b>Not checked with the guest yet</b></span><button type="button" class="btn sm" id="kzalk">Mark as checked</button>';
      box.appendChild(d);
      var k=$('kzalk')||$('kzalu');k.onclick=async function(){k.disabled=true;try{await call('staff_allergy_check',{p_id:b.id,p_checked:!b.allergy_checked_at});openBooking(b.id,b.allergy_checked_at?'Allergy check undone.':'Allergy marked as checked with the guest.');loadNeeds()}catch(e){k.disabled=false;toast(errText(e))}}}
  }catch(e){}return r};
  /* run sheet: allergy lines say whether they were checked */
  var _br=brow;brow=function(p,detail,cls){if(cls==='ralg'&&!p.is_test)detail+=p.allergy_checked_at?' <span class="kz-ck ok">Checked</span>':' <span class="kz-ck">Not yet checked</span>';return _br.call(this,p,detail,cls)};
  /* Needs action: requests to a manager, allergies not yet checked, emails not delivered */
  var _pn=paintNeeds;paintNeeds=function(){var r=_pn.apply(this,arguments);try{
    var el=$('needs');if(!el||state.view!=='arrivals')return r;var n=state.needs||{},items=[];
    var ap=n.approvals||[],pend=ap.filter(function(x){return x.status==='pending'});
    if(n.approver&&pend.length)items.push('<div class="need" data-k="appr"><span class="num">'+pend.length+'</span><span>'+(pend.length===1?'request is':'requests are')+' waiting for a manager</span><button class="btn primary sm" data-kzn="appr">Review</button></div>');
    else if(!n.approver&&ap.length){var dn=ap.length-pend.length;items.push('<div class="need" data-k="mine"><span class="num">'+ap.length+'</span><span>Your requests to a manager: '+[pend.length?pend.length+' waiting':'',dn?dn+' answered':''].filter(Boolean).join(', ')+'</span><button class="btn sm" data-kzn="appr">View</button></div>')}
    var al=n.allergy_unchecked||[];if(al.length)items.push('<div class="need" data-k="alg"><span class="num">'+al.length+'</span><span>'+(al.length===1?'booking has':'bookings have')+' allergies or dietary needs not yet checked with the guest, today or tomorrow</span><button class="btn sm" data-kzn="alg">Review</button></div>');
    var em=n.email_failed||[];if(em.length)items.push('<div class="need" data-k="mail"><span class="num">'+em.length+'</span><span>guest '+(em.length===1?'email was':'emails were')+' not delivered</span><button class="btn sm" data-kzn="mail">Review</button></div>');
    if(!items.length)return r;
    var box=el.querySelector('.needs');if(!box){el.innerHTML='<div class="needs"><h3>Needs action</h3></div>';box=el.querySelector('.needs')}
    box.insertAdjacentHTML('beforeend',items.join(''));
    box.querySelectorAll('[data-kzn]').forEach(function(b){b.onclick=function(){var k=b.dataset.kzn;if(k==='appr')openRequests();else if(k==='alg')openList('alg');else openList('mail')}});
  }catch(e){}return r};
  function openList(k){var n=state.needs||{},rows=k==='alg'?(n.allergy_unchecked||[]):(n.email_failed||[]);
    var body='<div class="kz-nlist">'+(rows.length?rows.map(function(x){var id=k==='alg'?x.id:x.reservation_id;
      return '<button type="button" class="srow" data-nid="'+esc(id)+'"><span class="sname"><b>'+esc(x.name)+'</b>'+(x.size?' <span class="muted">('+x.size+')</span>':'')+'</span><span class="ssub">'+esc(shortDate(x.date)+', '+tl(x.session_time))+(k==='alg'?(x.allergens&&x.allergens.length?' · '+esc(x.allergens.join(', ')):' · Dietary needs'):' · '+esc(x.label))+'</span></button>'}).join(''):'<p class="muted">Nothing left here.</p>')+'</div>';
    var sr=hdSheet(k==='alg'?'Allergies not yet checked':'Guest emails not delivered',k==='alg'?'Open each booking, check with the guest, then mark it as checked.':'Open each booking to try again, or call the guest and mark it as handled.',body,'');
    if(!sr)return;sr.querySelectorAll('[data-nid]').forEach(function(b){b.onclick=function(){closeSearch();openBooking(b.dataset.nid)}})}
  var ST={pending:['Waiting','st-request'],approved:['Approved and done','st-confirmed'],declined:['Manager said no','st-cancelled'],failed:['Could not be done','st-cancelled'],withdrawn:['Withdrawn','st-completed']};
  async function openRequests(){
    var sr=hdSheet('Requests to a manager','',' <div id="kzrq"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div>','');if(!sr)return;
    var d;try{d=await call('staff_list_requests')}catch(e){$('kzrq').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
    paintRequests(d)}
  window.kzOpenRequests=openRequests;
  function paintRequests(d){var el=$('kzrq');if(!el)return;var items=d.items||[],appr=d.approver;
    var sub=el.closest('.dsheet').querySelector('.dsh-h p');var s=appr?'Approve to carry it out now, or say no. The staff member sees your answer.':'A manager approves or says no. Nothing changes until then.';
    if(sub)sub.textContent=s;else el.closest('.dsheet').querySelector('.dsh-h div').insertAdjacentHTML('beforeend','<p class="small muted">'+esc(s)+'</p>');
    if(!items.length){el.innerHTML='<p class="muted">No requests right now.</p>';return}
    el.innerHTML=items.map(function(q){var st=ST[q.status]||[q.status,''];
      return '<div class="kz-rq" data-rq="'+q.id+'"><div class="kz-rqh"><span class="pill '+st[1]+'">'+esc(st[0])+'</span><span class="small muted">'+esc((q.mine?'You':q.requested_name||'Staff')+', '+stamp(q.requested_at))+'</span></div>'+
        '<p class="kz-rqs">'+esc(q.summary)+'</p>'+(q.reason?'<p class="small" style="margin:4px 0 0"><b>Note:</b> '+esc(q.reason)+'</p>':'')+
        (q.status!=='pending'&&q.decided_name?'<p class="small muted" style="margin:4px 0 0">'+esc((q.status==='withdrawn'?'Withdrawn by ':'Answered by ')+q.decided_name+', '+stamp(q.decided_at))+(q.decision_note?'. '+esc(q.decision_note):'')+'</p>':'')+
        (q.status==='failed'&&q.result_error?'<p class="small" style="margin:4px 0 0;color:var(--red)">'+esc(errText({message:q.result_error}))+'</p>':'')+
        '<div class="row kz-rqa">'+(q.status==='pending'&&appr?'<button type="button" class="btn go sm" data-rqa="yes">Approve</button><button type="button" class="btn sm" data-rqa="no">Say no</button>':'')+
        (q.status==='pending'&&!appr&&q.mine?'<button type="button" class="btn sm" data-rqa="withdraw">Withdraw</button>':'')+
        (q.reservation_id?'<button type="button" class="link" data-rqa="open">Open booking</button>':'')+'</div><div class="kz-rqm" role="status"></div></div>'}).join('');
    el.querySelectorAll('[data-rqa]').forEach(function(b){b.onclick=function(){var card=b.closest('.kz-rq'),id=card.dataset.rq,q=items.find(function(x){return x.id===id});rqAct(card,q,b.dataset.rqa,b)}})}
  async function rqAct(card,q,a,btn){var m=card.querySelector('.kz-rqm'),acts=card.querySelector('.kz-rqa');
    if(a==='open'){closeSearch();openBooking(q.reservation_id);return}
    if(a==='no'&&!card.querySelector('.kz-rqno')){acts.insertAdjacentHTML('afterend','<div class="kz-rqno"><label class="f full">Why not <small>The staff member sees this.</small><input maxlength="300" class="kz-rqnote"></label><div class="row"><button type="button" class="btn danger sm" data-rqx="no">Say no</button><button type="button" class="btn sm" data-rqx="back">Back</button></div></div>');
      acts.hidden=true;card.querySelector('.kz-rqnote').focus();
      card.querySelector('[data-rqx="back"]').onclick=function(){card.querySelector('.kz-rqno').remove();acts.hidden=false};
      card.querySelector('[data-rqx="no"]').onclick=function(){decide(card,q,false,card.querySelector('.kz-rqnote').value,false,this)};return}
    if(a==='yes')return decide(card,q,true,null,false,btn);
    if(a==='withdraw'){btn.disabled=true;try{paintRequests(await call('staff_withdraw_request',{p_id:q.id}));toast('Withdrawn.');loadNeeds()}catch(e){btn.disabled=false;m.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}}
  async function decide(card,q,yes,note,force,btn){var m=card.querySelector('.kz-rqm');btn.disabled=true;m.innerHTML='';
    try{var r=await call('staff_decide_request',{p_id:q.id,p_approve:yes,p_note:note||null,p_force:!!force})}
    catch(e){btn.disabled=false;m.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';if(/ALREADY_DECIDED/.test(e.message))refreshReq();return}
    if(r&&r.ok){toast(yes?'Approved and done.':'Answered. The staff member will see it.');refreshReq();loadNeeds();if(drawerOpen()&&state.openId===q.reservation_id)openBooking(q.reservation_id);else refreshCurrent();return}
    if(r&&r.can_force){m.innerHTML='<div class="msg warn">That time is now full. Approve anyway and go over capacity?<div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-rqf="1">Approve and go over capacity</button><button type="button" class="btn sm" data-rqf="0">Not now</button></div></div>';
      m.querySelector('[data-rqf="1"]').onclick=function(){decide(card,q,true,note,true,this)};m.querySelector('[data-rqf="0"]').onclick=function(){m.innerHTML='';btn.disabled=false};return}
    btn.disabled=false;m.innerHTML='<div class="msg err">Could not be done: '+esc(errText({message:(r&&r.error)||''}))+' The request is marked as not done.</div>';refreshReq(true)}
  async function refreshReq(keep){try{var d=await call('staff_list_requests');if(!keep)paintRequests(d)}catch(e){}}
  /* test booking switch on both booking forms, for managers and admins */
  function testSwitch(){if(!approver())return;var n=$('qname')||$('nn');if(!n||$('kztest'))return;var lab=n.closest('label')||n;
    lab.insertAdjacentHTML('afterend','<label class="check kz-testsw"><input type="checkbox" id="kztest"'+(window.KZTEST?' checked':'')+'>Test booking <small>Does not count toward capacity and the guest is not emailed</small></label>');
    $('kztest').onchange=function(){window.KZTEST=this.checked}}
  var _rq=renderQuick;renderQuick=function(){var r=_rq.apply(this,arguments);try{testSwitch()}catch(e){}return r};
  var _rf=renderFull;renderFull=function(){var r=_rf.apply(this,arguments);try{testSwitch()}catch(e){}return r};
  var _go=go;go=function(t){if(t==='new')window.KZTEST=false;return _go.apply(this,arguments)};
  /* role choices include Manager */
  var _ps=paneStaff;paneStaff=function(s,admin){var r=_ps.apply(this,arguments);try{
    var sp=$('spane');if(!sp||!admin)return r;
    sp.querySelectorAll('select[data-role],select#ar').forEach(function(sel){if(sel.querySelector('option[value="manager"]'))return;var o=document.createElement('option');o.value='manager';o.textContent='Manager';sel.insertBefore(o,sel.querySelector('option[value="admin"]'));
      if(sel.dataset.role){var u=(s.staff||[]).find(function(x){return x.email===sel.dataset.role});if(u)sel.value=u.role}});
    var ar=$('ar');var p=ar&&ar.closest('.panel')&&ar.closest('.panel').querySelector('p.small');
    if(p)p.textContent='They get a temporary password to sign in with, and choose their own straight away. Staff run service: bookings, arrivals, seating and guest details. Managers also approve what staff send them: confirming or declining requests, cancelling, changing date, time or guests, closures, grill blocks and booking over capacity. Admins can do everything, including settings and accounts.';
  }catch(e){}return r};
})();
/* v61 (14 Oct 2026): where the guest is from. Every new booking (quick form, full form, walk-in) records where the guest
   is staying or lives, so Kazumi can tell hotel guests from locals. Three big choices: Hotel guest, Local, Did not say;
   then one tap on a common hotel or area, a search, or Type it. The booking cannot be saved until one is chosen.
   The choice is sent as "location" through staff_set_extras after the booking is made; the database works out
   hotel, local or other. Edit details can change it (with overwrite protection). The booking shows Hotel guest,
   Local or Did not say. Settings has a Guest places list; admins add places, change them or switch them off. */
var KZPL={list:null,p:null};
var KZPL_FALLBACK=[['sheraton_fiji','Sheraton Fiji Golf and Beach Resort','hotel','Denarau',['Sheraton','Sheraton Fiji','Sheraton Denarau']],
  ['hilton_fiji','Hilton Fiji Beach Resort and Spa','hotel','Denarau',['Hilton','Hilton Denarau']],['sofitel_fiji','Sofitel Fiji Resort and Spa','hotel','Denarau',['Sofitel']],
  ['radisson_blu','Radisson Blu Resort Fiji','hotel','Denarau',['Radisson Blu','Radisson']],['wyndham_denarau','Wyndham Resort Denarau Island','hotel','Denarau',['Wyndham','Club Wyndham']],
  ['local_nadi','Nadi Town','local','Nadi',[]],['local_lautoka','Lautoka','local','Western',[]],['local_suva','Suva','local','Central',[]],['local_other','Elsewhere in Fiji','local','Fiji',['Local']]]
  .map(function(x,i){return {code:x[0],name:x[1],kind:x[2],area:x[3],aliases:x[4],sort_order:i+1,is_active:true,bookings:null}});
var KZO_NONE='Did not say',KZO_ELSE='Elsewhere in Fiji',KZO_MSG='Choose where the guest is from, or Did not say.';
function kzPlaces(force){if(KZPL.list&&!force)return Promise.resolve(KZPL.list);if(KZPL.p&&!force)return KZPL.p;
  KZPL.p=call('staff_list_places').then(function(d){KZPL.list=Array.isArray(d)&&d.length?d:KZPL_FALLBACK;KZPL.failed=!(Array.isArray(d)&&d.length);KZPL.p=null;return KZPL.list},
    function(){KZPL.p=null;KZPL.failed=true;return KZPL_FALLBACK});return KZPL.p}
function kzPlaceList(){return KZPL.list||KZPL_FALLBACK}
function kzPlaceShort(p){var a=(p.aliases||[])[0];return a&&a.length<=18?a:p.name}
function kzPlaceFind(v){if(!v)return null;var t=String(v).trim().toLowerCase();var L=kzPlaceList();
  return L.find(function(p){return p.name.toLowerCase()===t})||L.find(function(p){return (p.aliases||[]).some(function(a){return a.toLowerCase()===t})})||null}
/* what the booking says about where the guest is from: the value for the control, and the words to show */
function kzOriginOf(b){if(!b)return null;if(b.location&&String(b.location).trim())return String(b.location).trim();return b.guest_origin==='not_given'?KZO_NONE:null}
function kzOriginText(v,b){if(!v)return null;if(v===KZO_NONE||/^did not say$/i.test(v))return KZO_NONE;var p=kzPlaceFind(v);
  var kind=p?p.kind:(b&&b.guest_origin)||'';
  if(kind==='hotel')return 'Hotel guest · '+(p?p.name:v);
  if(kind==='local')return 'Local · '+(p?(p.name===KZO_ELSE?'area not given':p.name):v);
  if(kind==='other')return (p?p.name:v);
  return v}
function kzOriginRow(b){var t=kzOriginText(kzOriginOf(b),b);
  return '<dt>Where from</dt><dd class="kzo-dd">'+(t?'<span class="kzo-show">'+esc(t)+'</span>':'<span class="muted">Not recorded</span>')+'</dd>'}
/* after a booking is made: send where the guest is from; a failure is said, never swallowed */
/* the Where from? control. opt: {value, small, onChange}. Returns {value, invalid(msgEl), reset()} */
var KZO_N=0;
function kzOriginMount(el,opt){opt=opt||{};var api={value:opt.value||null},mode=null,uid='kzo'+(++KZO_N),act=-1,res=[],typed=false;
  if(!el)return Object.assign(api,{invalid:function(){},reset:function(){}});
  el.classList.add('kzo');if(opt.small)el.classList.add('kzo-sm');
  function set(v){api.value=v||null;mode=null;typed=false;el.classList.remove('kzo-bad');paint();if(opt.onChange)opt.onChange(api.value)}
  function chip(attr,txt,on){return '<button type="button" class="qp kzo-c'+(on?' on':'')+'" '+attr+'>'+esc(txt)+'</button>'}
  function search(q){var k=mode==='local'?['local']:['hotel','other'],t=q.trim().toLowerCase();if(!t)return [];
    return kzPlaceList().filter(function(p){return p.is_active!==false&&k.indexOf(p.kind)>=0&&(p.name.toLowerCase().indexOf(t)>=0||(p.area||'').toLowerCase().indexOf(t)>=0||(p.aliases||[]).some(function(a){return a.toLowerCase().indexOf(t)>=0}))}).slice(0,8)}
  function paint(){var h='<span class="kzo-l" id="'+uid+'-l">Where is the guest from? <small>Hotel or where they live</small></span>';
    if(api.value&&!mode){h+='<div class="kzo-sel"><span class="kzo-pill">'+esc(kzOriginText(api.value)||api.value)+'</span><button type="button" class="btn sm kzo-chg" data-kzo="change">Change</button></div>'}
    else{h+='<div class="qpills kzo-top" role="group" aria-labelledby="'+uid+'-l">'+chip('data-kzo="hotel" aria-pressed="'+(mode==='hotel')+'"','Hotel guest',mode==='hotel')+chip('data-kzo="local" aria-pressed="'+(mode==='local')+'"','Local',mode==='local')+chip('data-kzo="none"','Did not say',false)+'</div>';
      if(mode==='hotel'||mode==='local'){var L=kzPlaceList().filter(function(p){return p.is_active!==false&&p.kind===mode}),top;
        if(mode==='hotel')top=L.slice(0,5).map(function(p){return chip('data-kzv="'+esc(p.name)+'"',kzPlaceShort(p),false)});
        else{var el2=L.find(function(p){return p.name===KZO_ELSE});top=L.filter(function(p){return p.name!==KZO_ELSE}).slice(0,4).map(function(p){return chip('data-kzv="'+esc(p.name)+'"',kzPlaceShort(p),false)});
          top.push(chip('data-kzv="'+esc(el2?el2.name:KZO_ELSE)+'"','Local, area not given',false))}
        h+='<div class="qpills kzo-quick">'+top.join('')+chip('data-kzo="type"','Type it',typed)+'</div>';
        if(typed)h+='<div class="kzo-type"><input id="'+uid+'-t" maxlength="200" aria-label="Type where the guest is from" placeholder="'+(mode==='hotel'?'Hotel or where they are staying':'Town or area')+'" autocomplete="off"><button type="button" class="btn sm" data-kzo="usetyped">Use this</button></div>';
        else h+='<div class="kzo-search"><input id="'+uid+'-q" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="'+uid+'-r" aria-label="'+(mode==='hotel'?'Search hotels':'Search local areas')+'" placeholder="'+(mode==='hotel'?'Search hotels, for example Westin or Momi':'Search towns, for example Lautoka')+'" autocomplete="off"><ul class="kzo-res" id="'+uid+'-r" role="listbox" hidden></ul></div>'}}
    el.innerHTML=h;bind()}
  function showRes(q){var ul=$(uid+'-r'),inp=$(uid+'-q');if(!ul)return;res=search(q);act=res.length?0:-1;
    if(!q.trim()){ul.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');return}
    ul.innerHTML=res.map(function(p,i){return '<li role="option" id="'+uid+'-o'+i+'" data-i="'+i+'" aria-selected="'+(i===act)+'"'+(i===act?' class="on"':'')+'><b>'+esc(p.name)+'</b><small>'+esc((p.kind==='hotel'?'Hotel':p.kind==='local'?'Local':'Other')+(p.area?', '+p.area:''))+'</small></li>'}).join('')+
      '<li role="option" id="'+uid+'-o'+res.length+'" data-i="typed" class="kzo-asis'+(res.length?'':' on')+'" aria-selected="'+(!res.length)+'">Use “'+esc(q.trim())+'” as typed</li>';
    if(!res.length)act=res.length;ul.hidden=false;inp.setAttribute('aria-expanded','true');inp.setAttribute('aria-activedescendant',uid+'-o'+act);
    ul.querySelectorAll('li').forEach(function(li){li.onmousedown=function(e){e.preventDefault()};li.onclick=function(){pick(li.dataset.i)}})}
  function pick(i){var inp=$(uid+'-q');if(i==='typed'||i==res.length){var v=(inp&&inp.value||'').trim();if(v)set(v);return}var p=res[+i];if(p)set(p.name)}
  function mark(){var ul=$(uid+'-r');if(!ul)return;ul.querySelectorAll('li').forEach(function(li,i){var on=i===act;li.classList.toggle('on',on);li.setAttribute('aria-selected',String(on));if(on&&li.scrollIntoView)li.scrollIntoView({block:'nearest'})});$(uid+'-q').setAttribute('aria-activedescendant',uid+'-o'+act)}
  function bind(){el.querySelectorAll('[data-kzo]').forEach(function(b){b.onclick=function(){var k=b.dataset.kzo;
      if(k==='none')return set(KZO_NONE);
      if(k==='change'){mode=null;typed=false;api.value=null;paint();if(opt.onChange)opt.onChange(null);var f=el.querySelector('[data-kzo="hotel"]');if(f)f.focus({preventScroll:true});return}
      if(k==='hotel'||k==='local'){mode=mode===k?null:k;typed=false;paint();kzPlaces().then(function(){var qi=$(uid+'-q');if(mode&&el.isConnected&&!(qi&&qi.value))paint()});return}
      if(k==='type'){typed=!typed;paint();var t=$(uid+'-t')||$(uid+'-q');if(t)t.focus();return}
      if(k==='usetyped'){var v=($(uid+'-t').value||'').trim();if(v)set(v);else $(uid+'-t').focus()}}});
    el.querySelectorAll('[data-kzv]').forEach(function(b){b.onclick=function(){set(b.dataset.kzv)}});
    var t=$(uid+'-t');if(t)t.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();var v=t.value.trim();if(v)set(v)}};
    var q=$(uid+'-q');if(q){q.oninput=function(){showRes(q.value)};
      q.onfocus=function(){if(window.innerWidth<=600&&q.scrollIntoView)setTimeout(function(){try{q.scrollIntoView({block:'start',behavior:'auto'})}catch(e){}},60)};
      q.onkeydown=function(e){var ul=$(uid+'-r'),n=res.length+1;if(!ul||ul.hidden){if(e.key==='ArrowDown'&&q.value.trim())showRes(q.value);return}
        if(e.key==='ArrowDown'){e.preventDefault();act=(act+1)%n;mark()}else if(e.key==='ArrowUp'){e.preventDefault();act=(act-1+n)%n;mark()}
        else if(e.key==='Enter'){e.preventDefault();if(act>=0)pick(act===res.length?'typed':act)}else if(e.key==='Escape'){e.stopPropagation();ul.hidden=true;q.setAttribute('aria-expanded','false')}}}}
  api.invalid=function(msg){el.classList.add('kzo-bad');if(msg)msg.innerHTML='<div class="msg err">'+esc(KZO_MSG)+'</div>';var f=el.querySelector('[data-kzo="hotel"],[data-kzo="change"],input');if(el.scrollIntoView)try{el.scrollIntoView({block:'center'})}catch(e){}if(f)f.focus({preventScroll:true})};
  api.reset=function(){api.value=null;mode=null;typed=false;el.classList.remove('kzo-bad');paint()};
  paint();if(!KZPL.list)kzPlaces();return api}
/* Settings: Guest places */
async function panePlaces(){var el=$('spane');if(!el)return;var admin=!!(me&&me.role==='admin'),L,flt=state.plFilter||'all',edit=null,adding=false;
  try{L=await kzPlaces(true)}catch(e){L=KZPL_FALLBACK}
  if(KZPL.failed){el.innerHTML='<div class="panel"><h2>Guest places</h2><p class="muted">The guest places list could not be loaded. It needs the guest origin database update. Bookings still save where the guest is from as typed.</p></div>';return}
  var KN={hotel:'Hotel',local:'Local',other:'Other'};
  function form(){var p=edit||{};return '<div class="panel stack" id="plform"><h2>'+(edit?'Change '+esc(edit.name):'Add a place')+'</h2>'+
    '<div class="grid2"><label class="f">Name<input id="pln" maxlength="200" value="'+esc(p.name||'')+'"></label><label class="f">Type<select id="plk">'+['hotel','local','other'].map(function(k){return '<option value="'+k+'"'+(p.kind===k?' selected':'')+'>'+KN[k]+'</option>'}).join('')+'</select></label>'+
    '<label class="f">Area <small>For example Denarau, Nadi, Coral Coast</small><input id="pla" maxlength="60" value="'+esc(p.area||'')+'"></label><label class="f">Order number <small>Lower numbers show first. The first five hotels are the quick choices.</small><input id="plo" type="number" inputmode="numeric" min="1" max="9999" value="'+(p.sort_order!=null?p.sort_order:'')+'"></label>'+
    '<label class="f full">Other names <small>Separate with commas. The first one is the short name on the quick choices.</small><input id="plal" maxlength="400" value="'+esc((p.aliases||[]).join(', '))+'"></label>'+
    (edit?'<label class="check full"><input type="checkbox" id="plon"'+(p.is_active!==false?' checked':'')+'>In use (guests and staff can choose it)</label>':'')+'</div>'+
    '<div id="plmsg" role="status"></div><div class="row"><button type="button" class="btn primary" id="pls">'+(edit?'Save changes':'Add place')+'</button>'+'<button type="button" class="btn" id="plx">Cancel</button>'+'</div></div>'}
  function paint(){var rows=L.filter(function(p){return flt==='all'||p.kind===flt});
    el.innerHTML='<div class="stack"><div class="panel"><h2>Guest places</h2><p class="muted" style="margin:6px 0 0">The hotels and areas staff and guests choose from when a booking asks where the guest is from. Places are switched off, never deleted, so older bookings keep their meaning.</p>'+(admin?'':'<p class="small muted kzo-ro">'+esc(ERR.NOT_ADMIN)+'</p>')+'</div>'+
      (admin?(edit||adding?form():'<div class="row"><button type="button" class="btn primary" id="pladd">Add a place</button></div>'):'')+
      '<div class="panel"><div class="seg" id="plf" role="group" aria-label="Show">'+[['all','All'],['hotel','Hotels'],['local','Local'],['other','Other']].map(function(f){return '<button type="button" data-plf="'+f[0]+'"'+(flt===f[0]?' class="on"':'')+'>'+f[1]+'</button>'}).join('')+'</div>'+
      '<table class="t rt kzo-t"><thead><tr><th>Name</th><th>Type</th><th>Area</th><th>Bookings</th><th>In use</th>'+(admin?'<th></th>':'')+'</tr></thead><tbody>'+
      rows.map(function(p){return '<tr data-pl="'+esc(p.code)+'"'+(p.is_active===false?' class="kzo-off"':'')+'><td data-l="Name"><b>'+esc(p.name)+'</b>'+((p.aliases||[]).length?'<small class="muted kzo-al">Also: '+esc(p.aliases.join(', '))+'</small>':'')+'</td><td data-l="Type">'+KN[p.kind]+'</td><td data-l="Area">'+esc(p.area||'')+'</td><td data-l="Bookings">'+(p.bookings==null?'':p.bookings)+'</td><td data-l="In use">'+(p.is_active===false?'Off':'On')+'</td>'+
        (admin?'<td><button type="button" class="btn sm" data-ple="'+esc(p.code)+'">Change</button><button type="button" class="btn sm" data-plt="'+esc(p.code)+'">'+(p.is_active===false?'Switch on':'Switch off')+'</button></td>':'')+'</tr>'}).join('')+'</tbody></table></div></div>';
    el.querySelectorAll('[data-plf]').forEach(function(b){b.onclick=function(){flt=state.plFilter=b.dataset.plf;paint()}});
    if(!admin)return;
    var pa=$('pladd');if(pa)pa.onclick=function(){adding=true;paint();$('pln').focus()};
    el.querySelectorAll('[data-ple]').forEach(function(b){b.onclick=function(){edit=L.find(function(p){return p.code===b.dataset.ple});paint();var f=$('plform');if(f&&f.scrollIntoView)f.scrollIntoView({block:'start'});$('pln').focus({preventScroll:true})}});
    el.querySelectorAll('[data-plt]').forEach(function(b){b.onclick=async function(){var p=L.find(function(x){return x.code===b.dataset.plt});b.disabled=true;
      try{await save(p.code,p.name,p.kind,p.area,p.aliases,p.sort_order,p.is_active===false);toast((p.is_active===false?'Switched on: ':'Switched off: ')+p.name+'.')}catch(e){b.disabled=false;toast(errText(e))}}});
    var x=$('plx');if(x)x.onclick=function(){edit=null;adding=false;KZPG.dirty=false;paint()};
    if($('pls'))$('pls').onclick=async function(){var btn=this,m=$('plmsg'),nm=$('pln').value.trim(),o=parseInt($('plo').value,10);m.innerHTML='';
      if(nm.length<2){m.innerHTML='<div class="msg err">Type the name of the place.</div>';$('pln').focus();return}
      var al=$('plal').value.split(',').map(function(s){return s.trim()}).filter(Boolean);btn.disabled=true;btn.textContent='Saving…';
      try{await save(edit?edit.code:null,nm,$('plk').value,$('pla').value.trim(),al,isNaN(o)?(edit?edit.sort_order:1000):o,edit?$('plon').checked:true);var was=!!edit;edit=null;adding=false;KZPG.dirty=false;paint();toast(was?'Saved. '+nm+' is updated.':'Added. '+nm+' can now be chosen.')}
      catch(e){btn.disabled=false;btn.textContent='Try again';m.innerHTML='<div class="msg err">Nothing was saved. '+esc(errText(e))+'</div>'}}}
  async function save(code,name,kind,area,aliases,sort,active){var d=await call('staff_save_place',{p_code:code,p_name:name,p_kind:kind,p_area:area||'',p_aliases:aliases||[],p_sort:sort,p_active:!!active});
    if(Array.isArray(d)){L=d;KZPL.list=d}else{L=await kzPlaces(true)}if(!edit)paint();return d}
  paint()}
(function(){
  Object.assign(ERR,{NEED_ORIGIN:KZO_MSG});
  /* settings navigation: Guest places sits after Booking rules */
  var i=STABS.findIndex(function(s){return s[0]==='rules'});STABS.splice(i+1,0,['places','Guest places']);
  /* cards: a quiet tag for where the guest is from */
  var _tf=tagsFor;tagsFor=function(p){var h=_tf.apply(this,arguments);try{var v=kzOriginOf(p);if(!v||v===KZO_NONE)return h;var pl=kzPlaceFind(v);
    var t=pl?(pl.kind==='hotel'?kzPlaceShort(pl):pl.kind==='local'?'Local':kzPlaceShort(pl)):v.length>18?v.slice(0,17)+'…':v;
    return h+'<span class="tag kzo-tag" title="'+esc(kzOriginText(v,p)||v)+'">'+esc(t)+'</span>'}catch(e){return h}};
  /* load the list once a staff member is signed in, so the first booking form has it */
  var _sh=shell;shell=function(){var r=_sh.apply(this,arguments);try{if(me&&!KZPL.list)kzPlaces()}catch(e){}return r};
})();
/* v62 (14 Oct 2026): pre-opening fixes, with database change 20261014c.
   Grill seats: the database refuses a seating that puts more guests at a grill than it has seats. Staff are told which
   grill is full and choose another or ask a manager. Managers and admins are asked "Ume will have 10 guests at 8 seats.
   Seat anyway?"; Seat anyway sends it again with the override, and the booking history records it. The seating bar no
   longer says everyone is placed when a grill would be over its seats.
   Seating saves (seating plan, Host Desk, booking panel) send the time the day or booking was loaded, so a change someone
   else made in the meantime is not overwritten; the screen then shows the latest. Date, time and guests changes always
   use the protected call. Arrived shows only for confirmed bookings on today's date, and No-show only for confirmed
   bookings today or earlier; requests show nothing extra (a manager confirms them first). */
(function(){
  Object.assign(ERR,{NOT_CONFIRMED:'Confirm this booking first.',ARRIVAL_DAY_ONLY:'You can only mark arrivals for today.',
    NO_SHOW_EARLY:'You can only mark a no-show on the day of the booking or later.',
    GRILL_FULL:'That grill does not have enough seats. Choose another grill or ask a manager.',GRILL_KEPT:'Not seated. Nothing was changed.'});
  function approver(){return !!(me&&(me.role==='admin'||me.role==='manager'))}
  function day10(d){return String(d||'').slice(0,10)}
  /* GRILL_FULL detail from the database: grill name | seats taken before | seats at the grill | seats taken after | grill code */
  function grillOf(det){var p=String(det||'').split('|');return {name:p[0]||'This grill',before:+p[1]||0,seats:+p[2]||0,after:+p[3]||0,code:p[4]||''}}
  function fullText(g){var n=g.after-g.before;
    return (g.before>=g.seats?g.name+' is full: '+g.before+' of '+g.seats+' seats.':g.name+' does not have room for '+n+': '+g.before+' of '+g.seats+' seats are taken.')+' Choose another grill or ask a manager.'}
  var _et=errText;errText=function(e){var m=(e&&(e.message||e.code))||'';if(m.indexOf('GRILL_FULL')>=0&&e&&e.details)return fullText(grillOf(e.details));return _et.apply(this,arguments)};
  /* the newest time this booking was seen on screen: the day (seating plan, Host Desk) or the open booking */
  function seenFor(id){var a=state.day&&state.day.seen||null,b=window.kzSeen&&window.kzSeen[id]||null;if(!a||!b)return a||b;return Date.parse(b)>Date.parse(a)?b:a}
  function confirmOver(g){return new Promise(function(res){var done=false,mo=null;function fin(v){if(done)return;done=true;if(mo)mo.disconnect();res(v)}
    var sr=hdSheet(esc(g.name)+' will have '+g.after+' guests at '+g.seats+' seats. Seat anyway?','Only a manager or an admin can seat more guests than a grill has seats. It is noted in the booking history.','',
      '<button class="btn primary" id="kz62yes">Seat anyway</button><button class="btn" id="kz62no">Cancel</button>');
    if(!sr)return res(false);mo=new MutationObserver(function(){if(!sr.innerHTML)fin(false)});mo.observe(sr,{childList:true});
    $('kz62yes').onclick=function(){fin(true);closeSearch()};$('kz62no').onclick=function(){fin(false);closeSearch()}})}
  function refreshAfterConflict(){state.seat=null;state.plan=null;if(state.tab==='host')hdLoad(true);else if(state.tab==='today')loadDay();if(drawerOpen()&&state.openId)openBooking(state.openId)}
  var _call62=call;call=async function(fn,args){args=args||{};
    if(fn==='staff_change_booking'&&args.p_seen===undefined){args=Object.assign({},args,{p_seen:(window.kzSeen&&window.kzSeen[args.p_id])||null});
      if(args.p_force===undefined)args.p_force=false;if(args.p_notify===undefined)args.p_notify=true}
    if(fn==='staff_seat'&&args.p_seen===undefined)args=Object.assign({},args,{p_seen:seenFor(args.p_id)});
    if(fn==='staff_seat_plan')args=Object.assign({},args,{p_items:(args.p_items||[]).map(function(it){return it.seen!==undefined?it:Object.assign({},it,{seen:seenFor(it.id)})})});
    try{return await _call62.call(this,fn,args)}
    catch(e){var m=(e&&e.message)||'',seat=fn==='staff_seat'||fn==='staff_seat_plan';
      if((fn==='staff_action2'||fn==='staff_action')&&(args.p_action==='arrived'||args.p_action==='no_show')&&m.indexOf('NOT_TODAY')>=0){
        var x=new Error(args.p_action==='arrived'?'ARRIVAL_DAY_ONLY':'NO_SHOW_EARLY');x.details=e.details;throw x}
      if(seat&&m.indexOf('GRILL_FULL')>=0&&approver()){var g=grillOf(e.details),a2;
        if(fn==='staff_seat'){if(args.p_force)throw e;a2=Object.assign({},args,{p_force:true})}
        else{var hit=function(it){return !g.code||(it.split&&it.split[g.code]!=null)};if(args.p_items.every(function(it){return !hit(it)||it.force}))throw e;
          a2=Object.assign({},args,{p_items:args.p_items.map(function(it){return hit(it)?Object.assign({},it,{force:true}):it})})}
        if(!await confirmOver(g))throw new Error('GRILL_KEPT');
        return call(fn,a2)}
      if(seat&&m.indexOf('CHANGED_ELSEWHERE')>=0)setTimeout(refreshAfterConflict,0);
      throw e}};
  /* Arrived and No-show only where the database allows them */
  var _ah=arrivalsHtml;arrivalsHtml=function(d){var h=_ah.apply(this,arguments);if(state.date!==fijiToday())h=h.replace(/<button class="btn go" data-qa="arrived" data-pid="[^"]*">Arrived<\/button>/g,'');return h};
  var _qh=quickHtml;quickHtml=function(p){var q=_qh.apply(this,arguments);if(!(state.day&&day10(state.day.date)===fijiToday()))q=q.replace(/<button class="btn go sm" data-qa="arrived" data-pid="[^"]*">Arrived<\/button>/g,'');return q};
  var _dw62=drawer;drawer=function(b){var r=_dw62.apply(this,arguments);try{var dr=$('dr');if(!dr||!b)return r;var dd=day10(b.date),t=fijiToday();
    if(dd!==t)dr.querySelectorAll('.bigacts [data-act="arrived"]').forEach(function(x){x.remove()});
    if(dd>t)dr.querySelectorAll('.bigacts [data-act="no_show"]').forEach(function(x){x.remove()});
    dr.querySelectorAll('.bigacts').forEach(function(x){if(!x.children.length)x.remove()})}catch(e){}return r};
  var _hm=hdMain;hdMain=function(p){var a=_hm.apply(this,arguments);return a&&a[0]==='arrive'&&hdState(p)==='request'?null:a};
  var _hmo=hdMore;hdMore=function(id){var r=_hmo.apply(this,arguments);try{var p=hdFind(id);if(p&&hdState(p)==='request'){var sr=$('sr'),b=sr&&sr.querySelector('[data-m="no_show"]');if(b)b.remove()}}catch(e){}return r};
  /* seating bar: a grill over its seats is said, never "All placed" */
  function overs(s){var seat=state.seat&&state.seat.session===s.session_time?state.seat:null,plan=state.plan&&state.plan.session===s.session_time&&state.plan.date===state.date?state.plan:null,ov,codes={};
    if(plan){ov=plan.over;Object.keys(ov).forEach(function(id){Object.keys(ov[id]||{}).forEach(function(c){codes[c]=1})})}
    else if(seat){ov={};ov[seat.id]=Object.keys(seat.sp).length?seat.sp:null;Object.keys(seat.sp).forEach(function(c){codes[c]=1})}else return [];
    var L=layout(s,ov),out=[];s.tables.forEach(function(t){var cap=blockOf(s.session_time,t.code)?0:t.seats;if(codes[t.code]&&L.used[t.code]>cap)out.push(tname(t.code)+' would have '+L.used[t.code]+' guests at '+cap+' seats.')});return out}
  var _sh62=sittingHtml;sittingHtml=function(s){var h=_sh62.apply(this,arguments);try{var o=overs(s);if(!o.length)return h;
    var w=o.join(' ')+(approver()?' You will be asked before it is saved.':' Choose another grill or ask a manager.');
    var seat=state.seat&&state.seat.session===s.session_time?state.seat:null;
    if(seat&&!state.plan)return h.replace('All '+seat.size+' placed.','<span class="seatwarn kz62-over">'+esc(w)+'</span>');
    return h.replace(/(<b>Plan for [^<]*<\/b><div class="small" style="opacity:\.85">)(\d+ part(?:y|ies)) placed/,'$1<span class="seatwarn kz62-over">'+esc(w)+'</span> $2 planned')}catch(e){return h}};
})();
/* v63 (14 Oct 2026): staff tidy, with database change 20261014d.
   One host screen: Arrivals now holds everything the Host Desk did (Find a guest, New booking, Help, Choose table, Seat,
   Left, waiting list, a Tables tab) next to what it already had (Needs action, late guests, next arrival, counts, allergy
   and VIP tags). The Host Desk menu item is gone; old links and remembered screens land on Arrivals. One set of words for
   the guest's journey: Arrived, Seated, Left ("Completed" is now "Left", the same server step as the Host Desk's).
   No-show is a small quiet button after Arrived. The number of guests can change after arrival (staff ask a manager).
   Back to booking after changing a grill from a booking. Kitchen shows allergies not yet acknowledged, with Acknowledge.
   Managers and admins can restore a cancelled booking. Touch targets of at least 44 pixels on tablets and phones.
   A Teppanyaki walk-in placed in a later sitting says so. Staff see "Ask a manager to ..." on buttons that need one, and
   error messages never end with a code. */
(function(){
  Object.assign(ERR,{MANAGER_ONLY:'Only a manager or an admin can do this.',RESTORE_PAST:'This booking was for a date that has passed, so it cannot be restored.'});
  function approver(){return !!(me&&(me.role==='admin'||me.role==='manager'))}
  function today(){return state.date===fijiToday()}
  /* 9. error messages never end with a raw code such as "(NETWORK)" */
  var _et=errText;errText=function(e){var t=_et.apply(this,arguments);return /^That did not go through\./.test(t)?t.replace(/\s*\([^()]*\)\s*$/,''):t};
  /* 1. Left, not Completed */
  var _st=status;status=function(b){var s=_st.apply(this,arguments);if(b&&b.status==='completed')s.l='Left';return s};

  /* ---------- 1. one host screen ---------- */
  function goArrivals(opts){lsSet('kz_view','arrivals');return Object.assign({},opts||{},{view:'arrivals',seat:null,plan:null})}
  var _sh=shell;shell=function(){if(state.tab==='host'){state.tab='today';state.view='arrivals';lsSet('kz_view','arrivals')}var r=_sh.apply(this,arguments);
    root.querySelectorAll('[data-nav="host"]').forEach(function(b){b.remove()});return r};
  var _go=go;go=function(tab,opts){if(tab==='host'){tab='today';opts=goArrivals(opts)}if(tab!=='today'||(opts&&opts.view&&opts.view!=='floor'))state.kzBack=null;return _go.call(this,tab,opts)};
  window.kzHostTab=function(){go('today',goArrivals())};
  /* Host Desk data (seated, left, cleaning, waiting list) for the day on Arrivals; read straight, so the screen memory is kept */
  var XF={};
  function fetchExtras(d){if(XF[d])return XF[d];var p=Promise.resolve().then(function(){return sb.rpc('staff_host_extras',{p_date:d})}).then(function(r){delete XF[d];if(r&&!r.error&&r.data){HD.x=r.data;HD.at=Date.now();HD.err=null}return HD.x},function(){delete XF[d];return null});XF[d]=p;return p}
  function onArrivals(){return state.tab==='today'&&state.view==='arrivals'&&!!$('day')}
  var _ld=loadDay;loadDay=function(){var ex=state.tab==='today'&&state.view==='arrivals'&&sb?fetchExtras(state.date):null,d0=state.date;
    return Promise.resolve(_ld.apply(this,arguments)).then(function(v){if(!ex)return v;return ex.then(function(x){if(x&&onArrivals()&&state.date===d0&&state.day&&!state.seat&&!state.aseat&&!state.plan){try{paintDay();paintNeeds()}catch(e){}}return v})})};
  var _sv=setView;setView=function(v){if(v!=='floor')state.kzBack=null;var r=_sv.apply(this,arguments);if(v==='arrivals'&&state.tab==='today'&&sb)fetchExtras(state.date).then(function(){if(onArrivals()&&state.day)try{paintDay();paintNeeds()}catch(e){}});return r};
  /* the Host Desk's own steps (seat, left, choose a table, waiting list) refresh Arrivals when they finish */
  var _hl=hdLoad;hdLoad=async function(quiet){if(state.tab==='host')return _hl.apply(this,arguments);
    try{await hdFetch()}catch(e){if(!quiet)toast(errText(e))}
    if(state.tab==='today'&&$('day')&&state.day){try{paintDay();paintNeeds()}catch(e){}}loadNeeds()};
  /* closing a sheet shows the latest (a partly saved step, such as a table assigned but not seated, is never hidden) */
  var _cs=closeSearch;closeSearch=function(){var r=_cs.apply(this,arguments);if(onArrivals()&&state.day&&!state.seat&&!state.aseat&&!state.plan){try{paintDay();paintNeeds()}catch(e){}}return r};
  function marks(){var x=HD.x;if(!x||String(x.date||'').slice(0,10)!==state.date)return {};var m={};(x.marks||[]).forEach(function(r){m[r.id]=r});return m}
  function withMarks(p,m){var k=m[p.id];if(!k)return p;var o=Object.assign({},p);if(k.status)o.status=k.status;if(k.arrived_at!==undefined)o.arrived_at=k.arrived_at;o.seated_at=k.seated_at||null;o.departed_at=k.departed_at||null;o.updated_at=k.updated_at||null;return o}
  var HPANE=lsGet('kz_hpane')==='tables'?'tables':'guests';
  function splitNow(){return state.split==='alc'?'alc':'tep'}
  function hbar(nx){return '<div class="kz63-hbar noprint"><div class="seg kz63-pane" role="group" aria-label="Show">'+[['guests','Guests'],['tables','Tables']].map(function(x){var on=HPANE===x[0];return '<button type="button" data-hpane="'+x[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+x[1]+'</button>'}).join('')+'</div><span class="sp"></span>'+(nx?'<span class="kz63-nx" aria-label="Next arrival '+esc(nx)+'">Next <b>'+esc(nx)+'</b></span>':'')+
    '<button type="button" class="btn" id="kz63find">'+I.search+'<span>Find a guest</span></button>'+(state.date>=fijiToday()?'<button type="button" class="btn primary" id="kz63new">New booking</button>':'')+'<button type="button" class="btn" id="kz63help">Help</button></div>'}
  function tablesPane(){var tep=splitNow()==='tep',h='';
    if(tep)HD.period='dinner';else{HD.period=state.kz63per||hdPeriodDefault();
      h+='<div class="seg kz63-per" role="group" aria-label="Service">'+[['lunch','Lunch'],['dinner','Dinner']].map(function(x){var on=HD.period===x[0];return '<button type="button" data-tper="'+x[0]+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+x[1]+'</button>'}).join('')+'</div>'}
    return '<div class="kz63-tables">'+h+hdTablesHtml(null,tep?'grill':'alc')+'</div>'}
  arrivalsHtml=function(d){
    var td=today(),now=td?nowHM():null,m=marks(),all=dayParties(d).map(function(p){return withMarks(p,m)});
    var ps=all.filter(function(p){return p.status==='confirmed'||p.status==='pending'||p.status==='pending_large_group'});
    var gone=all.filter(function(p){return p.status==='completed'||p.departed_at});
    var wait=ps.filter(function(p){return !p.arrived_at}),here=ps.filter(function(p){return p.arrived_at&&!p.seated_at&&!p.departed_at}),seated=ps.filter(function(p){return p.arrived_at&&p.seated_at&&!p.departed_at});
    wait.forEach(function(p){p.diff=now?mins(p.session_time)-mins(now):null});
    wait.sort(function(a,b){return a.session_time<b.session_time?-1:a.session_time>b.session_time?1:a.name.localeCompare(b.name)});
    here.sort(function(a,b){return (b.arrived_at||'').localeCompare(a.arrived_at||'')});seated.sort(function(a,b){return (b.seated_at||'').localeCompare(a.seated_at||'')});
    var stale=td?wait.filter(function(p){return p.diff<=-120}):[],late=td?wait.filter(function(p){return p.diff<=-10&&p.diff>-120}):[],soon=td?wait.filter(function(p){return p.diff>-10&&p.diff<=60}):[],later=td?wait.filter(function(p){return p.diff>60}):wait;
    var nxt=wait.filter(function(p){return !td||p.diff>-10})[0];
    var wl=td?(((HD.x&&String(HD.x.date||'').slice(0,10)===state.date&&HD.x.waitlist)||[]).filter(function(w){return splitNow()==='tep'?w.service==='teppanyaki':w.service!=='teppanyaki'})):[];
    var h=hbar(nxt?tl(nxt.session_time):'')+glanceHtml([[sum(wait),td?'guests still to come':'guests expected','c'],[sum(here)+sum(seated),'guests here',''],[late.length,late.length===1?'party late':'parties late',late.length?'a':''],[nxt?tl(nxt.session_time):'None','next arrival','']]);
    if(HPANE==='tables')return h+tablesPane();
    function sec(title,sub,rows,cls){return rows.length?'<section class="arr-sec"><div class="arr-h'+(cls?' '+cls:'')+'"><h2>'+esc(title)+'</h2><span class="small muted">'+esc(sub)+'</span></div>'+rows.map(arow).join('')+'</section>':''}
    function arow(p){
      var lt=td&&!p.arrived_at&&p.diff<=-10&&p.diff>-120,rel='',b='',has=hdCodes(Object.assign({},p)).length>0;
      if(p.departed_at)rel='Left at '+clock(p.departed_at);else if(p.status==='completed')rel='Left';
      else if(p.seated_at)rel='Seated since '+clock(p.seated_at);else if(p.arrived_at)rel='Since '+clock(p.arrived_at);
      else if(td)rel=p.diff<0?dur(-p.diff)+' late':p.diff===0?'Due now':'In '+dur(p.diff);else if(state.date<fijiToday())rel='Arrival not recorded';
      if(!p.arrived_at&&!p.departed_at&&p.status!=='completed'){
        if(p.unseated&&state.date>=fijiToday())b+='<button class="btn" data-ha="choose" data-pid="'+p.id+'">Choose table</button>';
        if(p.status==='confirmed'){if(td)b+='<button class="btn go" data-qa="arrived" data-pid="'+p.id+'">Arrived</button>';
          if(td&&p.diff<-KZHOLD)b+=kzRelBtn(p.id,'btn kz63-ns')}
        else b+='<button class="btn primary" data-id="'+p.id+'">Reply</button>'}
      else if(td&&p.status==='confirmed'&&p.arrived_at&&!p.seated_at&&!p.departed_at)b+=has?'<button class="btn go" data-ha="seat" data-pid="'+p.id+'">Seat</button>':'<button class="btn primary" data-ha="choose" data-pid="'+p.id+'">Choose table</button>';
      else if(td&&p.status==='confirmed'&&p.seated_at&&!p.departed_at)b+='<button class="btn primary" data-ha="depart" data-pid="'+p.id+'">Left</button>';
      return '<div class="arow'+(lt?' late':'')+(p.arrived_at?' here':'')+(p.seated_at?' seated':'')+'"><button class="amain" data-id="'+p.id+'"><span class="atime"><b>'+esc(tl(p.session_time))+'</b><small>'+esc(rel)+'</small></span><span class="awho"><span class="aname'+pTag(p)+'>'+esc(p.name)+'<span class="asize" aria-label="'+p.size+' guests">'+p.size+'</span></span><span class="awhere'+(p.unseated?' uns':'')+'">'+esc(placeTxt(p))+'</span><span class="bk-tags">'+tagsFor(Object.assign({},p,{arrived_at:null,seating_pref:p.where==='Dining room'?null:p.seating_pref}),false)+'</span></span></button>'+(b?'<div class="aacts noprint">'+b+'</div>':'')+'</div>'}
    function wrow(w){var al=(w.allergens||[]).length?'<span class="tag allergy">'+esc(w.allergens.join(', '))+'</span>':'';
      return '<div class="arow kz63-wait"><div class="amain"><span class="atime"><b>Waiting</b><small>'+esc('Since '+hdClock(w.added_at))+'</small></span><span class="awho"><span class="aname">'+esc(w.name)+'<span class="asize" aria-label="'+w.size+' guests">'+w.size+'</span></span><span class="awhere">'+esc((w.service==='teppanyaki'?'Teppanyaki'+(w.session_time?' '+tl(w.session_time):''):'Lunch or dinner')+' · waiting '+hdMins(w.added_at)+' min'+(w.quoted_minutes?' · told '+w.quoted_minutes+' min':''))+'</span><span class="bk-tags">'+al+(w.is_test?'<span class="tag test">Test</span>':'')+'</span></span></div>'+
        '<div class="aacts noprint"><button class="btn primary" data-wchoose="'+w.id+'">Choose table</button><button class="btn" data-wmore="'+w.id+'">More</button></div></div>'}
    if(td){
      h+=sec('Late','',late,'late');
      h+=sec('Next hour',sum(soon)+' guests due',soon,'soon');
      h+=sec('Later today',sum(later)+' guests',later,'later');
      h+=sec('Earlier, not marked',stale.length+(stale.length===1?' party':' parties'),stale,'stale');
      if(!wait.length)h+='<div class="panel emptyday"><h2>Everyone booked is here</h2><p class="muted">No more arrivals expected today. For guests without a booking, tap New booking.</p></div>';
    }else h+=sec(state.date<fijiToday()?'Arrival not recorded':'Expected',sum(wait)+' guests',later,'');
    h+=sec('Arrived',sum(here)+' guests',here,'herelist');
    h+=sec('Seated',sum(seated)+' guests',seated,'seatedlist');
    if(wl.length)h+='<section class="arr-sec"><div class="arr-h waitlist"><h2>Waiting list</h2><span class="small muted">'+wl.length+(wl.length===1?' party':' parties')+'</span></div>'+wl.map(wrow).join('')+'</section>';
    if(gone.length)h+='<details class="arr-sec kz63-left"><summary class="arr-h leftlist"><h2>Left</h2><span class="small muted">'+sum(gone)+' guests</span></summary>'+gone.map(arow).join('')+'</details>';
    return h};
  /* Show me how, for this screen */
  var HELP=[['Find a guest','Tap Find a guest and type part of a name or phone number.','#kz63find, #kz67 [data-kz67="find"]' /* v67 visual pass: the card when the bar has no Find button */],['Mark guests arrived','Tap Arrived on their row when they walk in. No-show is the small button beside it.','#day [data-qa="arrived"]'],
    ['Choose a table','For guests without a table, tap Choose table, then tap a table that fits.','#day [data-ha="choose"]'],['Seat guests','Once they have a table, tap Seat. If they have an allergy, check the team knows first.','#day [data-ha="seat"]'],
    ['Guests leaving','Tap Left when they go. Their table is marked for cleaning: tap Mark Ready on the Tables tab once it is cleared.','#day [data-ha="depart"]'],['Add a walk-in','Tap New booking. Choose where they eat, Today, how many, then Now.','#kz63new']];
  function help(){var sr=hdSheet('Show me how','Six everyday tasks. Tap one to see where it is on the screen.','<ol class="hd-howl">'+HELP.map(function(x,i){return '<li><button type="button" class="hd-how" data-how="'+i+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></button></li>'}).join('')+'</ol>','<button class="btn" id="hdhx">Close</button>');
    if(!sr)return;$('hdhx').onclick=closeSearch;sr.querySelectorAll('[data-how]').forEach(function(b){b.onclick=function(){var x=HELP[+b.dataset.how];closeSearch();
      if(HPANE!=='guests'&&/#day/.test(x[2])){HPANE='guests';lsSet('kz_hpane','guests');paintDay()}
      var el=document.querySelector(x[2]);if(!el)return toast(x[0]+': '+x[1]);el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('hd-spot');setTimeout(function(){el.classList.remove('hd-spot')},4000);toast(x[0]+': '+x[1])}})}
  function bindArrivals(el){
    el.querySelectorAll('[data-hpane]').forEach(function(b){b.onclick=function(){HPANE=b.dataset.hpane;lsSet('kz_hpane',HPANE);paintDay()}});
    var f=$('kz63find');if(f)f.onclick=openSearch;var n=$('kz63new');if(n)n.onclick=function(){window.kzWalkIn({})};var hp=$('kz63help');if(hp)hp.onclick=help;
    el.querySelectorAll('[data-ha]').forEach(function(b){b.onclick=function(e){e.stopPropagation();hdAct(b.dataset.pid,b.dataset.ha,b)}});
    el.querySelectorAll('[data-wchoose]').forEach(function(b){b.onclick=function(){var w=hdWait(b.dataset.wchoose);if(w)hdChoose({wait:w})}});
    el.querySelectorAll('[data-wmore]').forEach(function(b){b.onclick=function(){hdWaitMore(b.dataset.wmore)}});
    el.querySelectorAll('[data-tper]').forEach(function(b){b.onclick=function(){state.kz63per=b.dataset.tper;paintDay()}});
    el.querySelectorAll('.kz63-tables [data-hsit]').forEach(function(b){b.onclick=function(){HD.sit=b.dataset.hsit;paintDay()}});
    el.querySelectorAll('.kz63-tables [data-ready]').forEach(function(b){b.onclick=function(){hdReady(b.dataset.ready,b)}});
    el.querySelectorAll('.kz63-tables [data-tile]').forEach(function(b){b.onclick=function(){hdTileSheet(b.dataset.tile)}})}

  /* ---------- 4. Back to booking after changing the grill from a booking ---------- */
  function backBar(el){if(!state.kzBack||state.view!=='floor'||$('kz63back'))return;var k=state.kzBack;
    el.insertAdjacentHTML('afterbegin','<div class="kz63-back noprint"><button type="button" class="btn" id="kz63back">'+I.left+'<span>Back to booking for '+esc(k.name)+'</span></button></div>');
    $('kz63back').onclick=function(){var id=k.id;state.kzBack=null;state.seat=null;state.aseat=null;var b=$('kz63back');if(b)b.parentNode.remove();openBooking(id)}}
  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{var el=$('day');if(el&&state.tab==='today'){if(state.view==='arrivals')bindArrivals(el);if(state.view==='floor')backBar(el);if(state.view==='kitchen')bindKitchen(el)}}catch(e){}return r};

  /* ---------- 5. Kitchen: allergies not yet acknowledged ---------- */
  function ackText(p){return (p.allergens&&p.allergens.length?'New or changed allergy':'New or changed dietary need')+': not yet acknowledged'}
  var _kh=kitchenHtml;kitchenHtml=function(d){var h=_kh.apply(this,arguments);if(!today())return h;
    var un=dayParties(d).filter(function(p){return hasDiet(p)&&!p.allergy_checked_at&&!p.is_test&&/^(confirmed|pending|pending_large_group)$/.test(p.status||'confirmed')});
    if(!un.length)return h;
    var sec='<section class="bsec salg kz63-ack"><div class="bsec-h"><h2>Allergies to acknowledge <span class="hn">'+un.length+'</span></h2><span class="small muted">The chef acknowledges each one</span></div>'+un.map(function(p){var x=[];if(p.allergens&&p.allergens.length)x.push('Allergy: '+p.allergens.join(', '));if(p.diet_prefs&&p.diet_prefs.length)x.push(p.diet_prefs.join(', '));if(clean(p.dietary))x.push(clean(p.dietary));
      return '<div class="kz63-ackrow"><span class="kz63-flag">'+esc(ackText(p))+'</span><span class="kz63-ackw"><button type="button" class="link" data-id="'+p.id+'">'+esc(p.when+', '+p.where+': '+p.name+' ('+p.size+')')+'</button><b class="red">'+esc(x.join('. '))+'</b></span><button type="button" class="btn kz63-ackbtn" data-ack="'+p.id+'">Acknowledge</button></div>'}).join('')+'</section>';
    return sec+h};
  function bindKitchen(el){el.querySelectorAll('[data-ack]').forEach(function(b){b.onclick=async function(e){e.stopPropagation();var id=b.dataset.ack,p=findParty(id)||{name:'This party'};b.disabled=true;b.textContent='Saving…';
    try{await call('staff_allergy_check',{p_id:id,p_checked:true});toast(p.name+': allergy acknowledged.',async function(){try{await call('staff_allergy_check',{p_id:id,p_checked:false});toast('Undone. '+p.name+' is not acknowledged.')}catch(x){toast(errText(x))}loadDay();loadNeeds()});await loadDay();loadNeeds()}
    catch(x){b.disabled=false;b.textContent='Acknowledge';toast(errText(x))}}})}

  /* ---------- booking panel: Left, guests after arrival, restore, labels for staff, Back to booking ---------- */
  function hostMark(id){var x=HD.x;return x&&(x.marks||[]).find(function(r){return r.id===id})||null}
  function guestsEditor(b){var box=$('chgbox');if(!box)return;var staff=!approver(),tep=(b.service||'teppanyaki')==='teppanyaki';
    box.innerHTML='<div class="confirmbox kz63-gbox" style="margin:0 0 12px"><p class="small" style="margin:0">They have arrived, so only the number of guests can change. The date and time stay '+esc(shortDate(b.date)+', '+tl(b.session_time))+'.</p><div class="grid2"><label class="f">Adults<input type="number" id="ca" min="0" max="50" value="'+b.adults+'"></label><label class="f">Children<input type="number" id="cc" min="0" max="50" value="'+(b.children||0)+'"></label></div>'+
      '<div id="cmsg"></div><div class="row"><button class="btn primary" id="csv">'+(staff?'Send to a manager':'Save change')+'</button><button class="btn" id="ccx">Discard changes</button></div></div>';
    $('ccx').onclick=function(){box.innerHTML=''};
    async function save(force){var btn=$('csv'),a=+$('ca').value||0,c=+$('cc').value||0;if(a+c<1||a+c>50){$('cmsg').innerHTML='<div class="msg err">'+esc(ERR.INVALID_PARTY)+'</div>';return}btn.disabled=true;
      try{await call('staff_change_booking',{p_id:b.id,p_date:String(b.date).slice(0,10),p_time:b.session_time,p_adults:a,p_children:c,p_force:!!force,p_notify:false});
        openBooking(b.id,'Number of guests updated to '+(a+c)+'.'+(tep&&(b.tables||[]).length?' They keep their grill.':''))}
      catch(e){btn.disabled=false;var m=(e&&e.message)||'';
        if(m.indexOf('REQUEST_SENT')>=0||m.indexOf('REQUEST_NOT_SENT')>=0)return openBooking(b.id,errText(e));
        if(approver()&&(m.indexOf('SESSION_FULL')>=0||m.indexOf('SLOT_FULL')>=0)){$('cmsg').innerHTML='<div class="msg warn">'+esc(errText(e))+' You can still save it if you have made room.<div class="row" style="margin-top:8px"><button class="btn sm" id="cfz">Save anyway</button></div></div>';$('cfz').onclick=function(){save(true)};return}
        if(approver()&&m.indexOf('GRILL_FULL')>=0){var p=String(e.details||'').split('|');
          var sr=hdSheet(esc(p[0]||'The grill')+' will have '+esc(p[3]||'more')+' guests at '+esc(p[2]||'its')+' seats. Save anyway?','Only a manager or an admin can seat more guests than a grill has seats. It is noted in the booking history.','','<button class="btn primary" id="kz63gy">Save anyway</button><button class="btn" id="kz63gn">Cancel</button>');
          if(sr){$('kz63gn').onclick=function(){closeSearch();if($('cmsg'))$('cmsg').innerHTML='<div class="msg info">Not saved. Nothing was changed.</div>'};$('kz63gy').onclick=function(){closeSearch();save(true)}}return}
        $('cmsg').innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}
    $('csv').onclick=function(){save(false)}}
  function restoreSheet(b){var sr=hdSheet('Restore this booking?',esc(b.name+', '+b.size+(b.size===1?' guest':' guests')+', '+svcName(b)+', '+shortDate(String(b.date).slice(0,10))+', '+tl(b.session_time)),
      '<p class="small" style="margin:6px 0 0">It goes back to confirmed if there is still room at that time. No grill or table is kept, and the guest is not emailed.</p><div id="kz63rm" role="status"></div>',
      '<button class="btn primary" id="kz63ry">Restore booking</button><button class="btn" id="kz63rn">Keep cancelled</button>');
    if(!sr)return;$('kz63rn').onclick=closeSearch;
    $('kz63ry').onclick=async function(){var btn=this;btn.disabled=true;btn.textContent='Restoring…';
      try{await call('staff_restore_booking',{p_id:b.id,p_seen:(window.kzSeen&&window.kzSeen[b.id])||null});closeSearch();openBooking(b.id,'Restored. Let the guest know it is restored.','warn');loadNeeds()}
      catch(e){btn.disabled=false;btn.textContent='Try again';var m=$('kz63rm');if(m)m.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>'}}}
  var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{var dr=$('dr'),body=dr&&dr.querySelector('.dbody');if(!body||!b)return r;var staff=!approver(),tep=(b.service||'teppanyaki')==='teppanyaki';
    /* Left replaces Completed: the Host Desk's step, which records the time and marks the table for cleaning */
    var cp=body.querySelector('.bigacts [data-act="completed"]');if(cp){var lb=document.createElement('button');lb.className='btn primary';lb.dataset.kz63='left';lb.textContent='Left';cp.replaceWith(lb);
      lb.onclick=async function(){lb.disabled=true;var tt=(b.split&&Object.keys(b.split).length?splitText(b.split):tep?tnames(b.tables):alcNames(b.tables||[]))||'';
        try{await call('staff_host_action',{p_id:b.id,p_action:'depart',p_seen:null});
          toast(b.name+' has left.'+(tt?' '+tt+' needs cleaning.':''),async function(){try{await call('staff_host_action',{p_id:b.id,p_action:'undo_depart',p_seen:null});toast('Undone. '+b.name+' is back as before.')}catch(e){toast(errText(e))}if(drawerOpen()&&state.openId===b.id)openBooking(b.id);else refreshCurrent()});
          openBooking(b.id,'Marked as left.'+(tt?' '+tt+' needs cleaning.':''));loadNeeds()}
        catch(e){openBooking(b.id,errText(e),'err')}}}
    /* a booking that has left can be put back as here, through the same step */
    var ro=body.querySelector('.bigacts [data-act="reopen"]'),hm=hostMark(b.id);if(ro&&b.status==='completed'&&hm&&hm.departed_at){var ub=document.createElement('button');ub.className='btn';ub.textContent='Not left yet';ro.replaceWith(ub);
      ub.onclick=async function(){ub.disabled=true;try{await call('staff_host_action',{p_id:b.id,p_action:'undo_depart',p_seen:null});openBooking(b.id,'Back as here, not left.')}catch(e){openBooking(b.id,errText(e),'err')}}}
    /* seated by mistake: put back as arrived, not seated (the Host Desk's correction) */
    var ba=body.querySelector('.bigacts');if(ba&&b.status==='confirmed'&&b.arrived_at&&hm&&hm.seated_at&&!hm.departed_at&&!$('kz63unseat')){ba.insertAdjacentHTML('beforeend','<button type="button" class="btn" id="kz63unseat">Not seated yet</button>');
      $('kz63unseat').onclick=async function(){this.disabled=true;try{await call('staff_host_action',{p_id:b.id,p_action:'unseat',p_seen:null});openBooking(b.id,'Back as arrived, not seated yet.')}catch(e){openBooking(b.id,errText(e),'err')}}}
    /* 3. number of guests after arrival */
    if(b.status==='confirmed'&&b.arrived_at){var fc=$('fchg');
      if(!fc){var fg=$('fguest');if(fg){fg.insertAdjacentHTML('beforebegin','<details class="fold" id="fchg"><summary><span class="fold-t">Change</span><span class="fold-h">Number of guests</span></summary><div class="fold-b"></div></details>');fc=$('fchg')}}
      else{var fh=fc.querySelector('.fold-h');if(fh)fh.textContent='Number of guests'+(tep&&(b.tables||[]).length?', grill':'')}
      if(fc&&!$('kz63chg')){var fb=fc.querySelector('.fold-b');fb.insertAdjacentHTML('afterbegin','<div class="row"><button class="btn sm" id="kz63chg">'+(staff?'Ask a manager to change the number of guests':'Change number of guests')+'</button></div>'+($('chgbox')?'':'<div id="chgbox"></div>'));
        $('kz63chg').onclick=function(){guestsEditor(b)}}}
    /* 6. restore a cancelled booking: managers and admins */
    if(b.status==='cancelled'&&!staff&&String(b.date).slice(0,10)>=fijiToday()&&!$('kz63restore')){var ask=$('ask');if(ask)ask.insertAdjacentHTML('beforebegin','<div class="bigacts kz63-rest"><button type="button" class="btn primary" id="kz63restore">Restore booking</button></div>');var rb=$('kz63restore');if(rb)rb.onclick=function(){restoreSheet(b)}}
    /* 9. buttons that need a manager say so for staff */
    if(staff){var L={confirm:'Ask a manager to confirm',decline:'Ask a manager to decline',cancel:'Ask a manager to cancel'};
      body.querySelectorAll('[data-act="confirm"],[data-act="decline"],[data-act="cancel"]').forEach(function(x){x.textContent=L[x.dataset.act]});
      var cg=$('chg');if(cg)cg.textContent='Ask a manager to change date, time or guests'}
    /* 4. remember the booking when its grill or table is changed from here */
    ['em','eat'].forEach(function(k){var x=$(k);if(!x)return;var o=x.onclick;x.onclick=function(){state.kzBack={id:b.id,name:b.name};return o&&o.apply(this,arguments)}});
  }catch(e){}return r};
  /* staff: the change form and the confirm boxes send to a manager */
  var _ce=changeEditor;changeEditor=function(b){var r=_ce.apply(this,arguments);if(!approver()){var s=$('csv');if(s)s.textContent='Send to a manager'}return r};
  var _act=act;act=function(b,a){var r=_act.apply(this,arguments);if(!approver()&&/^(confirm|decline|cancel)$/.test(a)){var c=$('rc');if(c)c.textContent={confirm:'Ask a manager to confirm',decline:'Ask a manager to decline',cancel:'Ask a manager to cancel'}[a]}return r};
  /* manager approvals: a request whose grill is now too full can be approved over (database change 14d) */
  var _c63=call;call=async function(fn){var r=await _c63.apply(this,arguments);
    if(fn==='staff_decide_request'&&r&&r.can_force&&r.error==='GRILL_FULL')setTimeout(function(){document.querySelectorAll('#kzrq .kz-rqm .msg.warn').forEach(function(m){var t=m.firstChild;if(t&&t.nodeType===3)t.textContent='The grill no longer has enough seats for this. Approve anyway and seat more guests than it has?'})},0);
    return r};

  /* ---------- 8. a Teppanyaki walk-in put in a later sitting says so ---------- */
  function nextSit(q){return q&&q.walk&&q.svc==='teppanyaki'&&q.time&&q.date===fijiToday()&&q.time>nowHM()}
  var _rq=renderQuick;renderQuick=function(){var r=_rq.apply(this,arguments);try{var q=QB;if(nextSit(q)){var lab='Next sitting: '+tl(q.time);
      var c=document.querySelector('#qb .qsum-c[data-go="time"]');if(c)c.textContent=lab;
      if(q.step==='who'&&!$('kz63next')){var h=document.querySelector('#qb .qh');if(h)h.insertAdjacentHTML('afterend','<div class="msg info kz63-next" id="kz63next"><b>'+esc(lab)+'.</b> They are booked for the '+esc(tl(q.time))+' sitting, not one that has already started. Let them know when it starts.</div>')}
      var s=$('qseat');if(s&&!s.disabled)s.textContent='Book for the '+tl(q.time)+' sitting'}}catch(e){}return r};
  new MutationObserver(function(){var n=document.querySelector('#qtimes .qt-now:not([data-kz63])');if(!n)return;n.setAttribute('data-kz63','1');var v=n.dataset.now;
    if(QB&&QB.svc==='teppanyaki'&&v&&v>nowHM()){n.innerHTML='Next sitting: '+esc(tl(v))+'<small>Guests here now. They are booked for the '+esc(tl(v))+' sitting</small>'}}).observe(document.documentElement,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v66 (15 Oct 2026): Release 4, adaptive booking. Reusable parts (see docs/STAFF-APP-DESIGN.md, "Release 4").
   1. kzIcon(name): simple line icons, drawn inline (no library), one style everywhere: 24 by 24, 1.75 stroke, round ends.
   2. kzCards: guest preference cards driven by a small configuration object, so another venue only needs its own list.
      A card is { id, title, ask, icon, required, show(k), done(k), answer(k), tone(k), options(k), detail(k), skip, finish }.
      options(k) returns [{ v, label, icon, on, ends }]: "ends" closes the card at once; otherwise its detail opens in place.
      show(k) hides questions that do not apply (contextual rules); done(k) says whether it has an answer.
      One card is open at a time. After an answer the next unanswered card opens in the same place.
   3. KZ_BOOKING_CARDS: Kazumi's cards, in the order they are asked. Answers are written to the booking fields that already
      exist (see the v64 New booking block, "saving"), plus the allergy answer from database change 20261015a.
   ====================================================================================================================== */
var KZI={
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  alert:'<path d="M12 3.5l9 16H3z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.3-1.2.9-1.2 1.6v.4"/><path d="M12 17v.1"/>',
  pin:'<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  home:'<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  hotel:'<path d="M4 20V4.5h10V20"/><path d="M14 9h6v11"/><path d="M7.5 8h3M7.5 11.5h3M7.5 15h3"/><path d="M2.5 20h19"/>',
  dash:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  gift:'<path d="M3.5 8.5h17v4h-17z"/><path d="M5 12.5V20h14v-7.5"/><path d="M12 8.5V20"/><path d="M12 8.5C10.5 5 7 4.5 7 6.5S9.5 8.5 12 8.5c2.5 0 5 .5 5-2s-3.5-1.5-5 2"/>',
  cake:'<path d="M4 20.5h16"/><path d="M5.5 20.5V13h13v7.5"/><path d="M5.5 16c2 1.3 4.3 1.3 6.5 0s4.5-1.3 6.5 0"/><path d="M12 13V9.5"/><path d="M12 7c.9-.9.9-1.9 0-3-.9 1.1-.9 2.1 0 3z"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.2C19.5 15.4 12 20 12 20z"/>',
  star:'<path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 6L12 16.9l-5.4 2.9 1.2-6-4.4-4.1 6-.7z"/>',
  seat:'<path d="M7 4h10v8H7z"/><path d="M5 12h14v3.5H5z"/><path d="M7 15.5V20M17 15.5V20"/>',
  child:'<circle cx="9" cy="7.5" r="3"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="10.5" r="2"/><path d="M15.5 15.2c.6-.4 1.3-.6 2-.6 2 0 3.5 1.9 3.5 4.4"/>',
  access:'<circle cx="11" cy="4.5" r="1.8"/><path d="M11 7.5v5.5h5.5l2.5 6"/><path d="M11 10h4.5"/><path d="M8 11a5 5 0 1 0 6.8 6.5"/>',
  car:'<path d="M5 15l1.6-5h10.8L19 15"/><path d="M3.5 15h17v3.5h-17z"/><path d="M6.5 18.5V20M17.5 18.5V20"/><path d="M7 15.01h.01M17 15.01h.01"/>',
  note:'<path d="M5 4h14v11.5L14.5 20H5z"/><path d="M14.5 20v-4.5H19"/><path d="M8.5 9h7M8.5 12.5h4"/>',
  skip:'<path d="M5 12h13"/><path d="M13.5 7.5L18 12l-4.5 4.5"/>',
  chev:'<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  user:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>',
  users:'<circle cx="9" cy="8" r="3.3"/><path d="M2.8 20c0-3.6 2.8-6.4 6.2-6.4s6.2 2.8 6.2 6.4"/><path d="M15.5 4.9a3.3 3.3 0 0 1 0 6.3M17.5 13.9c2.2.7 3.7 3 3.7 6.1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  grill:'<path d="M3.5 9.5h17v6h-17z"/><path d="M7 15.5V20M17 15.5V20"/><path d="M8 4.5c-.8 1 .8 2-.1 3M12 4.5c-.8 1 .8 2-.1 3M16 4.5c-.8 1 .8 2-.1 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  list:'<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>'};
function kzIcon(n,cls){var p=KZI[n];if(!p)return '';return '<svg class="kzi'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+p+'</svg>'}
var kzCards=(function(){
  function vis(cfg,k){return cfg.filter(function(c){return !c.show||c.show(k)})}
  function byId(cfg,id){return cfg.filter(function(c){return c.id===id})[0]||null}
  function done(c,k){return !!(c&&c.done(k))}
  /* the next question: the first unanswered card after this one (required ones first), else any unanswered card above */
  function next(cfg,k,after){var v=vis(cfg,k),i=after?v.findIndex(function(c){return c.id===after}):-1,later=v.slice(i+1).concat(v.slice(0,Math.max(i,0)));
    var req=later.filter(function(c){return c.required&&!done(c,k)})[0];return (req||later.filter(function(c){return !done(c,k)})[0]||{}).id||null}
  function first(cfg,k){var v=vis(cfg,k);var r=v.filter(function(c){return c.required&&!done(c,k)})[0]||v.filter(function(c){return !done(c,k)})[0];return r?r.id:null}
  function missing(cfg,k){return vis(cfg,k).filter(function(c){return c.required&&!done(c,k)})}
  function optHtml(c,o){return '<button type="button" class="kzc-o'+(o.on?' on':'')+(o.tone?' kzc-'+o.tone:'')+'" data-cv="'+c.id+':'+esc(o.v)+'" data-fk="cv-'+c.id+'-'+esc(o.v)+'" aria-pressed="'+!!o.on+'">'+(o.icon?kzIcon(o.icon):'')+'<span>'+esc(o.label)+'</span></button>'}
  function cardHtml(c,k,open,bad){var d=done(c,k),ans=d||(c.partial&&c.partial(k))?c.answer(k):'',tone=c.tone?c.tone(k):'',hint=c.hint?c.hint(k):'';
    var st=d?'kzc-done':open?'':'kzc-todo';
    var h='<section class="kzc '+st+(open?' is-open':'')+(c.required?' kzc-req':'')+(tone?' kzc-t-'+tone:'')+(bad?' kzc-bad':'')+'" data-card="'+c.id+'" id="kzc-'+c.id+'">'+
      '<button type="button" class="kzc-h" data-ch="'+c.id+'" data-fk="ch-'+c.id+'" aria-expanded="'+open+'" aria-controls="kzc-b-'+c.id+'">'+
      '<span class="kzc-ic">'+kzIcon(c.icon)+'</span><span class="kzc-tx"><b>'+esc(c.title)+'</b>'+
      (ans?'<small class="kzc-a">'+esc(ans)+'</small>':hint?'<small class="kzc-hint">'+esc(hint)+'</small>':open?'':'<small class="kzc-q">'+esc(c.ask)+'</small>')+'</span>'+
      (c.required&&!d?'<span class="kzc-badge">Required</span>':d?'<span class="kzc-ok">'+kzIcon(tone==='alert'||tone==='warn'?'alert':'check')+'<span class="kz-sr">Answered</span></span>':'')+
      '<span class="kzc-chev">'+kzIcon('chev')+'</span></button>';
    if(open){h+='<div class="kzc-b" id="kzc-b-'+c.id+'" role="group" aria-label="'+esc(c.ask)+'"><p class="kzc-ask">'+esc(c.ask)+'</p>';
      var os=c.options(k);if(os.length)h+='<div class="kzc-opts kzc-n'+Math.min(os.length,4)+'">'+os.map(function(o){return optHtml(c,o)}).join('')+'</div>';
      if(c.detail)h+=c.detail(k)||'';
      var fin=c.finish&&c.finish(k),skip=!c.required&&c.skip&&!d&&!(c.partial&&c.partial(k));
      if(fin||skip)h+='<div class="kzc-foot">'+(skip?'<button type="button" class="kzc-skip" data-cskip="'+c.id+'" data-fk="cs-'+c.id+'">'+kzIcon('skip')+'<span>'+esc(c.skip)+'</span></button>':'<span></span>')+
        (fin?'<button type="button" class="btn kzc-fin" data-cfin="'+c.id+'" data-fk="cf-'+c.id+'">'+esc(fin)+'</button>':'')+'</div>';
      h+='</div>'}
    return h+'</section>'}
  function html(cfg,k,openId,badId){return '<div class="kzc-list" id="kzc-list">'+vis(cfg,k).map(function(c){return cardHtml(c,k,c.id===openId,c.id===badId)}).join('')+'</div>'}
  return {visible:vis,byId:byId,done:done,next:next,first:first,missing:missing,html:html,h:{}}
})();
/* Kazumi's cards. k is the booking being made (see fresh() in the New booking block). */
var KZ_BOOKING_CARDS=(function(){
  function plural(n,a,b){return n+' '+(n===1?a:b)}
  function opt(v,label,icon,on,ends,tone){return {v:v,label:label,icon:icon,on:!!on,ends:!!ends,tone:tone||''}}
  var SEATREQ={all:['Quiet table','Pram or stroller space'],teppanyaki:['Seat our group together','Front row view of the chef'],dining:['Table near the yakitori grill']};
  var OTHERREQ=['Arriving a little late','Need to leave by a set time','Surprise, please keep it quiet'];
  function seatReqs(k){return SEATREQ.all.concat(k.area==='dining'?SEATREQ.dining:SEATREQ.teppanyaki)}
  function inList(list,k){return k.req.filter(function(r){return list.indexOf(r)>=0})}
  function seatChosen(k){return inList(SEATREQ.all.concat(SEATREQ.teppanyaki,SEATREQ.dining),k)}
  return [
    {id:'staying',title:'Where is the guest staying?',ask:'Where is the guest staying?',icon:'pin',required:true,
      done:function(k){return !!k.loc&&!k.hotel},answer:function(k){return kzOriginText(k.loc)||k.loc},
      hint:function(k){return k.hotel?'Choose the hotel':''},
      options:function(k){var kind=kzCards.h.locKind(k.loc);return [opt('local','Local','home',kind==='local'&&!k.hotel,1),opt('hotel','Staying at a hotel','hotel',k.hotel||kind==='hotel'),opt('none','Did not say','dash',kind==='none'&&!k.hotel,1)]},
      detail:function(k){return k.hotel||kzCards.h.locKind(k.loc)==='hotel'?kzCards.h.hotelHtml(k):''}},
    {id:'allergy',title:'Food allergies',ask:'Any food allergies?',icon:'alert',skip:'Ask later',
      done:function(k){return k.alst==='none'||k.alst==='not_sure'||(k.alst==='has'&&k.alg.length>0)||k.cs.allergy==='skip'},
      partial:function(k){return k.alst==='has'||!!(k.past&&k.past.length)},
      answer:function(k){if(k.alst==='none')return 'No allergies reported';if(k.alst==='not_sure')return 'Not sure. '+'Allergies not confirmed — check with the guest';
        if(k.alst==='has')return k.alg.length?'Allergy: '+k.alg.join(', ')+(k.dnote?'. '+k.dnote:''):'Yes. Choose which allergies';
        if(k.past&&k.past.length)return 'From a past visit: '+k.past.join(', ')+'. Confirm with the guest';return k.cs.allergy==='skip'?'Not asked yet':''},
      tone:function(k){return k.alst==='has'?'alert':k.alst==='not_sure'||(k.past&&k.past.length&&!k.alst)?'warn':''},
      options:function(k){return [opt('has','Yes','alert',k.alst==='has',0,'al'),opt('none','No allergies','check',k.alst==='none',1),opt('not_sure','Not sure','help',k.alst==='not_sure',1)]},
      detail:function(k){return kzCards.h.allergyHtml(k)},finish:function(k){return k.alst==='has'?'Done':''}},
    {id:'occasion',title:'Special occasion',ask:'Is this a special occasion?',icon:'gift',
      done:function(k){return !!k.occ||k.cs.occasion==='none'},
      answer:function(k){return k.occ?(k.occ==='Celebration'?'Celebrating':k.occ)+(k.cel?', for '+k.cel:''):'No occasion'},
      options:function(k){return [opt('none','No occasion','dash',k.cs.occasion==='none'&&!k.occ,1),opt('Birthday','Birthday','cake',k.occ==='Birthday'),opt('Anniversary','Anniversary','heart',k.occ==='Anniversary'),
        opt('Honeymoon','Honeymoon','star',k.occ==='Honeymoon'),opt('Celebration','Something else','gift',k.occ==='Celebration')]},
      detail:function(k){return k.occ?'<div class="kzw-fld kzc-det"><label for="kzw-cel">Who is celebrating? <small>Optional</small></label><input id="kzw-cel" maxlength="80" autocomplete="off" autocapitalize="words" value="'+esc(k.cel||'')+'"></div>':''},
      finish:function(k){return k.occ?'Done':''}},
    {id:'kids',title:'Children and highchairs',ask:'Any children in the group?',icon:'child',
      show:function(k){return k.size>1},
      done:function(k){return k.cs.kids==='none'||(k.kids>0&&k.cs.hc!=null)},partial:function(k){return k.kids>0},
      answer:function(k){return k.kids?plural(k.kids,'child','children')+(k.cs.hc!=null?', '+(k.hc?plural(k.hc,'highchair','highchairs'):'no highchair'):''):'No children'},
      options:function(k){var o=[opt('0','No children','dash',k.cs.kids==='none',1)];for(var n=1;n<Math.min(k.size,5);n++)o.push(opt(String(n),plural(n,'child','children'),'child',k.kids===n));return o},
      detail:function(k){if(!(k.kids>0))return '';var o=['0'];for(var n=1;n<=Math.min(k.kids,3);n++)o.push(String(n));
        return '<div class="kzc-sub" role="group" aria-labelledby="kzc-hcl"><p class="kzc-ask" id="kzc-hcl">Highchairs needed?</p><div class="kzc-opts kzc-n'+Math.min(o.length,4)+'">'+o.map(function(v){var on=k.cs.hc!=null&&k.hc===+v;
          return '<button type="button" class="kzc-o'+(on?' on':'')+'" data-hc="'+v+'" data-fk="hc'+v+'" aria-pressed="'+on+'">'+kzIcon(+v?'seat':'dash')+'<span>'+(+v?plural(+v,'highchair','highchairs'):'No highchair')+'</span></button>'}).join('')+'</div></div>'}},
    {id:'seating',title:'Seating preference',ask:'Any seating preference?',icon:'seat',skip:'No preference',
      done:function(k){return k.cs.seating==='none'||k.cs.seating==='done'},partial:function(k){return seatChosen(k).length>0},
      answer:function(k){var s=seatChosen(k);return s.length?s.join(', '):'No preference'},
      options:function(k){return seatReqs(k).map(function(r){return opt(r,r,r==='Pram or stroller space'?'child':r==='Quiet table'?'seat':'grill',k.req.indexOf(r)>=0)})},
      finish:function(k){return seatChosen(k).length?'Done':''}},
    {id:'access',title:'Accessibility needs',ask:'Any accessibility needs?',icon:'access',
      done:function(k){return k.cs.access==='none'||k.cs.access==='done'},partial:function(k){return !!(k.wheel||k.acc)},
      answer:function(k){var a=[];if(k.wheel)a.push('Wheelchair access');if(k.acc)a.push(k.acc);return a.length?a.join('. '):'No needs'},
      options:function(k){return [opt('none','No needs','dash',k.cs.access==='none',1),opt('wheel','Wheelchair access','access',k.wheel),opt('other','Something else','note',k.cs.accOther||!!k.acc)]},
      detail:function(k){return k.cs.accOther||k.acc?'<div class="kzw-fld kzc-det"><label for="kzw-acc">What do they need?</label><input id="kzw-acc" maxlength="200" autocomplete="off" value="'+esc(k.acc||'')+'" placeholder="For example, a walking frame, no stairs"></div>':''},
      finish:function(k){return k.wheel||k.cs.accOther||k.acc?'Done':''}},
    {id:'transport',title:'Transport',ask:'Do they need transport?',icon:'car',
      show:function(k){return kzCards.h.locKind(k.loc)!=='local'},
      done:function(k){return k.cs.transport==='none'||(!!k.trans&&!k.cs.transOther)||k.cs.transport==='done'},partial:function(k){return !!k.trans},
      answer:function(k){return k.trans||'Not needed'},
      options:function(k){var taxi='Taxi after the meal';return [opt('none','Not needed','dash',k.cs.transport==='none'&&!k.trans,1),opt(taxi,taxi,'car',k.trans===taxi&&!k.cs.transOther,1),
        opt('other','Something else','note',!!k.cs.transOther)]},
      detail:function(k){return k.cs.transOther?'<div class="kzw-fld kzc-det"><label for="kzw-trn">What do they need?</label><input id="kzw-trn" maxlength="200" autocomplete="off" value="'+esc(k.trans||'')+'" placeholder="For example, a taxi to the airport at 9:30 PM"></div>':''},
      finish:function(k){return k.cs.transOther?'Done':''}},
    /* Phase 2 (28 Oct 2026, booking audit section 3): one typed Special requests field replaces the preset buttons
       (Quiet table, Front row view of the chef, Arriving a little late and the rest), plus a team-only note. */
    {id:'notes',title:'Special requests',ask:'Anything else the team should know?',icon:'note',skip:'Nothing to add',
      done:function(k){return k.cs.notes==='none'||k.cs.notes==='done'},partial:function(k){return !!(k.req.length||k.diet.length||k.note||k.tnote||k.optin)},
      answer:function(k){var a=k.req.concat(k.diet);if(k.note)a.push(k.note);if(k.tnote)a.push('Team note: '+k.tnote);if(k.optin)a.push('Happy to hear news and offers');return a.length?a.join('. '):'Nothing to add'},
      options:function(){return []},
      detail:function(k){return kzCards.h.notesHtml(k)},finish:function(){return 'Done'}}
  ].filter(function(c){return c.id!=='seating'&&c.id!=='transport'});
})();
/* v64 (14 Oct 2026): New booking is one guided flow in four steps, each fitting the visible screen.
   Two ways in, chosen at the top of step 1: "Seat walk-in now" (fastest; name and phone are optional, details can be
   added afterwards) and "Make a reservation" (a later time or another day). Every entry point opens it: New booking in the
   side panel, the round + button, New booking on Arrivals and in the page header, a grill or table on the seating plan, a
   day on the calendar, and Book again. The old quick form is no longer shown; the full form is kept only as the
   Group or event form.
   1 How many guests are joining us?  2 Who is joining us?  3 When are they joining us? (Dining room or Teppanyaki, then
   Seat now, In 15 minutes, In 30 minutes or Choose date and time; for Teppanyaki the quick choices are the next sittings)
   4 Check and confirm, with one primary button, Confirm reservation. Success shows only after the server has saved.
   Same server calls as the old quick form: staff_create_any (same-day duplicate check and manager approval when full,
   from v59), staff_action2 arrived, staff_set_extras (where the guest is staying, from v61; dietary and seating needs),
   staff_record_booking_optin, staff_waitlist_add, and seating through Choose table (grill seat check from 14c).
   Choices come from staff_sittings and staff_service_times, so full or closed times are never offered. Returning guests
   are found with the staff search (staff_list_bookings, open to every staff role) and only fill the form in; records are
   never merged. The draft is kept in this browser tab for 30 minutes for the same staff member (sessionStorage).
   v66 (15 Oct 2026), Release 4: adaptive rather than strictly step by step. Who is joining us now holds the guest
   preference cards (kzCards with KZ_BOOKING_CARDS, defined above): one card open at a time; an answer that ends a question
   ("No allergies", "Local", "No occasion") closes the card, shows the answer under its heading and opens the next
   unanswered card in the same place; an answer that needs detail ("Yes", "Staying at a hotel", "Birthday") opens it
   right there. Where the guest is staying stays required. Food allergies: Yes, No or Not sure, saved as the booking's
   allergy answer (database change 20261015a, through staff_set_extras); allergies from a past visit are offered to
   confirm, never copied. A live summary (a side panel on laptops, a bar that opens on tablets and phones) shows the guest,
   date and time, guests, seating, alerts and what is still needed; each line goes straight to its question. */
(function(){
  var DK='kz_wk_draft',TTL=30*60000,KW=null,AV={},LAST=null,LT=null,LSEQ=0,ASEQ=0,PSTEP=null,INFLIGHT=false,CFG=KZ_BOOKING_CARDS,SUMOPEN=false,ANN=null,PREVOC=null;
  var HEAD={1:'How many guests are joining us?',2:'Who is joining us?',3:'When are they joining us?',4:'Check and confirm'};
  var STEPS=['Guests','Guest details','Date & time','Review'];
  /* Short guidance for first-shift colleagues. These are descriptions only, never booking requirements. */
  function helpText(k){
    if(k.step===1)return k.mode==='walk'&&k.size?(k.loc&&!k.hotel?'Ask if anyone has a food allergy. ':'Choose where the guests are staying, then ask about food allergies. ')+'Name and phone can be added later.':'Choose Walk-in if guests are already here, or Reservation for a later visit. Then choose how many guests.';
    if(k.step===2)return k.mode==='walk'?'Add a name or phone number if available. Ask where the guest is staying and check allergies before you continue.':'Enter the guest’s name and phone number. Ask where they are staying and check allergies before you continue.';
    if(k.step===3)return 'Choose the dining area and an available time. For a future booking, tap Choose date and time.';
    if(k.step===4)return 'Check the guest count, date, service and allergies. Tap Change beside anything that needs correcting. Confirm only when the details are right.';
    return '';
  }
  var OCC=[['','None'],['Birthday','Birthday'],['Anniversary','Anniversary'],['Honeymoon','Honeymoon'],['Celebration','Something else']];
  var EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function today(){return fijiToday()}
  function digits(s){return String(s||'').replace(/\D/g,'')}
  function hasPhone(p){var d=digits(p);return d.length>=6&&d!=='679'}
  function gN(n){return n+(n===1?' guest':' guests')}
  function dayLong(d){var t=today();return (d===t?'Today, ':d===addDays(t,1)?'Tomorrow, ':'')+longDate(d)}
  function approver(){return !!(me&&(me.role==='admin'||me.role==='manager'))}
  function maxGrill(){var t=(state.day&&state.day.tables)||(KW&&AV[avKey()]&&AV[avKey()].day&&AV[avKey()].day.tables)||[],m=0;t.forEach(function(x){if(x.seats>m)m=x.seats});return m||11}
  function defArea(pre){if(pre&&pre.svc==='dining')return 'dining';if(pre&&(pre.svc==='teppanyaki'||pre.wgrill))return 'teppanyaki';var s=state.split||lsGet('kz_split');return s==='tep'?'teppanyaki':s==='alc'?'dining':(nowHM()<'16:00'?'dining':'teppanyaki')}
  function fresh(o){o=o||{};var t=today();
    return {v:3,mode:o.mode||'walk',step:1,size:0,big:false,name:'',phone:'+679 ',email:'',showEmail:false,loc:null,hotel:false,linked:null,kids:0,alg:[],diet:[],occ:'',cel:'',req:[],note:'',tnote:'',wheel:false,hc:0,
      alst:null,dnote:'',acc:'',trans:'',cs:{},oc:undefined,bad:null,
      optin:false,bd:'',bm:'',open:false,area:o.area||defArea(o.pre),when:o.mode==='book'?'pick':'now',date:o.date||t,period:null,choice:null,want:o.want||null,quote:0,pre:o.pre||null,saved:null,err:'',past:null}}
  /* ---------- the draft: this tab, this staff member, 30 minutes ---------- */
  function save(){if(!KW||!me)return;try{var x=Object.assign({},KW);['err','busy','sugs','resumed','opts','bad','alErr'].forEach(function(k){delete x[k]});
    sessionStorage.setItem(DK,JSON.stringify({u:me.email||me.name,t:Date.now(),k:x}))}catch(e){}}
  function load(){try{var d=JSON.parse(sessionStorage.getItem(DK)||'null');if(!d||!me||d.u!==(me.email||me.name)||Date.now()-d.t>TTL||!d.k||d.k.v!==3)return null;
    var k=d.k;if(k.date<today()){k.date=today();k.choice=null}if(k.step==='done')return null;return k}catch(e){return null}}
  function drop(){try{sessionStorage.removeItem(DK)}catch(e){}}
  function worth(k){return !!(k&&(k.size||k.saved||(k.name&&k.name.trim())||hasPhone(k.phone)))}
  /* ---------- the visible screen, including the on-screen keyboard ---------- */
  function vv(){var v=window.visualViewport,h=v?v.height:window.innerHeight,t=v?v.offsetTop:0,s=document.documentElement.style;
    s.setProperty('--kzvh',Math.round(h)+'px');s.setProperty('--kzvt',Math.round(t)+'px');var w=$('kzw');if(w)w.classList.toggle('kzw-short',h<640)}
  if(window.visualViewport){window.visualViewport.addEventListener('resize',vv);window.visualViewport.addEventListener('scroll',vv)}window.addEventListener('resize',vv);vv();
  function lock(on){document.documentElement.classList.toggle('kzw-lock',!!on);if(root&&root.classList)root.classList.toggle('kzw-on',!!on)}
  /* ---------- what is free: Teppanyaki sittings, dining room times, and today's grills ---------- */
  function avKey(){return KW.date+'|'+KW.size}
  async function loadAv(force){var k=avKey(),n=++ASEQ,size=KW.size,date=KW.date;if(AV[k]&&!force&&Date.now()-AV[k].at<60000)return AV[k];
    var r=await Promise.all([call('staff_sittings',{p_date:date,p_party:size}).catch(function(e){return {err:e}}),
      call('staff_service_times',{p_service:'dining',p_date:date,p_party:size}).catch(function(e){return {err:e}}),
      date===today()?call('staff_get_day',{p_date:date}).catch(function(){return null}):Promise.resolve(null)]);
    var a={at:Date.now(),tep:Array.isArray(r[0])?r[0]:[],din:Array.isArray(r[1])?r[1]:[],day:r[2]&&r[2].sessions?r[2]:null,err:!Array.isArray(r[0])&&!Array.isArray(r[1])?r[0].err:null};
    AV[k]=a;if(n===ASEQ&&KW&&KW.step===3&&avKey()===k)paint();return a}
  function withDay(day,fn){var keep=state.day;if(day)state.day=day;try{return fn()}catch(e){return null}finally{state.day=keep}}
  function grillFor(day,sit,n,alg,want){if(!day)return null;return withDay(day,function(){var s=sessionOf(sit);if(!s)return null;
    if(want&&!blockOf(sit,want)){var f=freeFor(s,want,'_kw');if(f>=n){var o={};o[want]=n;return o}}
    var r=planFor(s,[{id:'_kw',size:n,allergens:alg||[]}]);return r&&r.items&&r.items._kw||null})}
  function gname(sp,day){return withDay(day,function(){return splitText(sp)})||''}
  /* the quick dining choices: the first open time slot near now, in 15 or in 30 minutes */
  function nearSlot(ok,mins){var now=nowHM(),t=addMins(now,mins),lo=mins?addMins(t,-15):addMins(now,-30),hi=addMins(t,mins?20:30),best=null;
    ok.forEach(function(x){if(x.slot<lo||x.slot>hi)return;var d=Math.abs(mins_(x.slot)-mins_(t));if(!best||d<best.d)best={d:d,x:x}});return best&&best.x}
  function mins_(h){return (+h.slice(0,2))*60+(+h.slice(3,5))}
  function choices(a){var k=KW,t=today(),isT=k.date===t,now=nowHM(),pre=k.pre||{},out={tep:[],din:[],quick:[],wait:[],periods:[],period:null};
    var quick=isT&&k.when!=='pick',firstNext=true;
    a.tep.forEach(function(x){if(x.closed||x.can_fit===false)return;var v=x.session_time,started=isT&&v<=now;
      if(started&&(!quick||k.mode!=='walk'||addMins(v,90)<now))return;
      var c={k:'book|teppanyaki|'+k.date+'|'+v,kind:'book',svc:'teppanyaki',date:k.date,time:v,started:started,title:'Teppanyaki, '+tl(v)+' sitting',sub:''};
      if(started){var g=grillFor(a.day,v,k.size,k.alg,pre.wgrill&&pre.sit===v?pre.wgrill:null);if(!g)return;c.grill=g;c.title='Teppanyaki, '+tl(v)+' sitting, now';c.sub='Started at '+tl(v)+'. Room at '+gname(g,a.day)}
      else{c.sub=(isT&&firstNext?'Next sitting. ':'')+(x.seats_left!=null?x.seats_left+' seats free':'');if(isT)firstNext=false;if(pre.wgrill&&pre.sit===v)c.sub+='. '+tname(pre.wgrill)+' chosen'}
      out.tep.push(c)});
    var ok=a.din.filter(function(x){return x.available===true});
    function din(x,title,sub){return {k:'book|dining|'+k.date+'|'+x.slot,kind:'book',svc:'dining',date:k.date,time:x.slot,title:title,sub:sub}}
    if(quick){[['now','Seat now',0],['15','In 15 min',15],['30','In 30 min',30]].forEach(function(q){var s=nearSlot(ok,q[2]);if(!s)return;
        if(q[0]==='now'&&k.mode!=='walk')return;
        var c=din(s,q[1],(q[0]==='now'?'Dining room, now':'Dining room, '+tl(s.slot))+'. Booked in the '+tl(s.slot)+' time slot');c.k='q'+q[0]+'|'+c.k;c.q=q[0];out.quick.push(c)})}
    else{var per={};ok.forEach(function(x){var p=x.period||(x.slot<'16:00'?'lunch':'dinner');per[p]=1});out.periods=['lunch','dinner'].filter(function(p){return per[p]});
      var cp=k.period&&per[k.period]?k.period:(isT&&now<'15:30'&&per.lunch)||!per.dinner?'lunch':'dinner';out.period=cp;
      ok.filter(function(x){return (x.period||(x.slot<'16:00'?'lunch':'dinner'))===cp&&(!isT||x.slot>=now)}).forEach(function(x){out.din.push(din(x,tl(x.slot),''))})}
    if(k.mode==='walk'&&isT&&quick){
      if(k.area==='dining')out.wait.push({k:'wait|dining|'+t+'|',kind:'wait',svc:'dining',date:t,time:null,title:'Add to the waiting list',sub:out.quick.length?'If they would rather wait for a table':'No dining room table has room right now'});
      else{var nx=a.tep.filter(function(x){return !x.closed&&addMins(x.session_time,90)>=now})[0];if(nx)out.wait.push({k:'wait|teppanyaki|'+t+'|'+nx.session_time,kind:'wait',svc:'teppanyaki',date:t,time:nx.session_time,title:'Add to the Teppanyaki waiting list',sub:out.tep.length?'If they would rather wait for a grill':'No sitting has room right now'})}}
    return out}
  /* ---------- returning guests: the staff search, shown as suggestions that fill the form in ---------- */
  function lookupSoon(){clearTimeout(LT);LT=setTimeout(lookup,300)}
  async function lookup(){if(!KW||KW.step!==2)return;var ph=digits(KW.phone),nm=(KW.name||'').trim(),q=null;
    if(KW.linked)return sugPaint([]);
    if(ph.length>=6&&ph!=='679')q=String(KW.phone).replace(/\s/g,'');else if(nm.length>=3&&!/^walk-?in$/i.test(nm))q=nm;
    if(!q)return sugPaint([]);var n=++LSEQ,rows;
    try{rows=await call('staff_list_bookings',{p_from:today(),p_to:today(),p_query:q,p_status:null})}catch(e){return}
    if(n!==LSEQ||!KW||KW.step!==2)return;sugPaint(group(rows))}
  function group(rows){var by={},out=[];
    (rows||[]).forEach(function(r){if(r.is_test||!r.name||/^walk-?in$/i.test(r.name)||/^test\b/i.test(r.name))return;var d=digits(r.phone),hp=d.length>=6&&r.phone!=='Not given';
      var key=hp?'p'+d:r.email?'e'+String(r.email).toLowerCase():'n'+String(r.name).toLowerCase(),g=by[key];
      if(!g){g=by[key]={name:r.name,phone:hp?r.phone:'',email:r.email||'',visits:0,loc:null,alg:[],ld:''};out.push(g)}
      if(r.arrived_at||r.status==='completed')g.visits++;
      var dt=String(r.date||'').slice(0,10);if(dt>=g.ld){g.ld=dt;g.name=r.name;if(r.email)g.email=r.email;if(r.location)g.loc=r.location}
      (r.allergens||[]).forEach(function(a){if(g.alg.indexOf(a)<0)g.alg.push(a)})});
    return out.sort(function(a,b){return b.ld.localeCompare(a.ld)}).slice(0,3)}
  function sugPaint(list){if(!KW)return;KW.sugs=list;var el=$('kzw-sug');if(!el)return;
    el.innerHTML=list.length?'<p class="kzw-sugh">Returning guest? Tap to fill in their details.</p>'+list.map(function(g,i){var bits=[];if(g.phone)bits.push(g.phone);if(g.ld)bits.push('Last booking '+fmt(g.ld,{day:'numeric',month:'short'}));
        var o=kzOriginText(g.loc);if(o)bits.push(o);
        return '<button type="button" class="kzw-sug" data-sug="'+i+'" data-fk="sug'+i+'"><b>'+esc(g.name)+'</b><small>'+esc(bits.join(' · '))+'</small>'+(g.alg.length?'<span class="kzw-sugal">Allergy noted before: '+esc(g.alg.join(', '))+'</span>':'')+'</button>'}).join(''):'';
    el.querySelectorAll('[data-sug]').forEach(function(b){b.onclick=function(){pickGuest(KW.sugs[+b.dataset.sug])}})}
  /* a suggestion fills the form in; it never joins records. Past allergies are shown to ask about, not added on their own. */
  function pickGuest(g){if(!g)return;var k=KW;k.linked={name:g.name,ld:g.ld,prev:{name:k.name,phone:k.phone,email:k.email,loc:k.loc}};
    k.name=g.name;if(g.phone)k.phone=g.phone;if(g.email)k.email=g.email;if(g.loc&&!k.loc){k.loc=g.loc;k.hotel=false}
    k.past=g.alg.filter(function(a){return k.alg.indexOf(a)<0});if(k.past.length&&k.alst!=='none')k.oc='allergy';k.sugs=[];k.err='';save();paint();if(k.oc==='allergy')showCard('allergy')}
  /* ---------- where the guest is staying (a card, required): Local, Staying at a hotel (with the hotel list), Did not say ---------- */
  function locKind(v){if(!v)return null;if(v===KZO_NONE)return 'none';var p=kzPlaceFind(v);return p?(p.kind==='local'?'local':'hotel'):'hotel'}
  function hotels(){return kzPlaceList().filter(function(p){return p.is_active!==false&&p.kind==='hotel'})}
  function hotelSearch(q){var t=q.trim().toLowerCase();if(!t)return [];return kzPlaceList().filter(function(p){return p.is_active!==false&&(p.kind==='hotel'||p.kind==='other')&&(p.name.toLowerCase().indexOf(t)>=0||(p.area||'').toLowerCase().indexOf(t)>=0||(p.aliases||[]).some(function(a){return a.toLowerCase().indexOf(t)>=0}))}).slice(0,5)}
  function hotelHtml(k){var kind=locKind(k.loc);
    if(kind==='hotel'&&!k.hotel)return '<div class="kzw-orgsel"><span class="kzw-pill">'+esc(kzOriginText(k.loc)||k.loc)+'</span><button type="button" class="btn sm" data-org="rehotel" data-fk="orgre">Change hotel</button></div>';
    var hs=hotels().slice(0,5);
    return '<div class="kzw-hot"><div class="kzw-pills kzw-row1" role="group" aria-label="Common hotels">'+hs.map(function(p){return '<button type="button" class="kzw-p" data-hv="'+esc(p.name)+'" data-fk="hv'+esc(p.code)+'">'+kzIcon('hotel')+esc(kzPlaceShort(p))+'</button>'}).join('')+'</div>'+
      '<div class="kzw-hs"><input id="kzw-hq" type="search" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="kzw-hr" aria-label="Search hotels" placeholder="Search hotels, for example Westin" autocomplete="off" enterkeyhint="search"><ul id="kzw-hr" class="kzw-hr" role="listbox" hidden></ul></div></div>'}
  var HR=[],HA=-1;
  function hotelRes(q){var ul=$('kzw-hr'),inp=$('kzw-hq');if(!ul)return;HR=hotelSearch(q);HA=HR.length?0:-1;
    if(!q.trim()){ul.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');return}
    ul.innerHTML=HR.map(function(p,i){return '<li role="option" id="kzw-ho'+i+'" data-i="'+i+'" aria-selected="'+(i===HA)+'"'+(i===HA?' class="on"':'')+'><b>'+esc(p.name)+'</b><small>'+esc(p.area||'')+'</small></li>'}).join('')+
      '<li role="option" id="kzw-ho'+HR.length+'" data-i="typed" class="kzw-asis'+(HR.length?'':' on')+'" aria-selected="'+(!HR.length)+'">Use “'+esc(q.trim())+'” as typed</li>';
    if(!HR.length)HA=0;ul.hidden=false;inp.setAttribute('aria-expanded','true');inp.setAttribute('aria-activedescendant','kzw-ho'+(HR.length?HA:HR.length));
    ul.querySelectorAll('li').forEach(function(li){li.onmousedown=function(e){e.preventDefault()};li.onclick=function(){hotelPick(li.dataset.i)}});
    try{ul.scrollIntoView({block:'nearest'})}catch(e){}}
  function hotelPick(i){var inp=$('kzw-hq');if(i==='typed'||(!HR.length)||+i===HR.length){var v=(inp&&inp.value||'').trim();if(v)setLoc(v);return}var p=HR[+i];if(p)setLoc(p.name)}
  function setLoc(v){KW.loc=v;KW.hotel=false;KW.err='';if(KW.bad==='staying')KW.bad=null;save();advance('staying')}
  /* ---------- Food allergies: Yes opens the allergy list and a note; allergies from a past visit are offered, never copied ---------- */
  function allergyHtml(k){var h='';
    if(k.past&&k.past.length)h+='<div class="kzc-past" id="kzw-past"><span>'+kzIcon('alert')+'<span><b>From a past visit — confirm with the guest:</b> '+esc(k.past.join(', '))+'</span></span><button type="button" class="btn sm" id="kzw-addpast">Add to this booking</button></div>';
    if(k.alst==='has')h+='<div class="kzc-sub" role="group" aria-labelledby="kzc-all"><p class="kzc-ask" id="kzc-all">Which allergies? <small>Choose all that apply</small></p><div class="kzc-grid">'+
      ALLERGENS.map(function(a){var on=k.alg.indexOf(a)>=0;return '<button type="button" class="kzc-o kzc-al'+(on?' on':'')+'" data-alg="'+esc(a)+'" data-fk="data-alg'+esc(a)+'" aria-pressed="'+on+'">'+(on?kzIcon('check'):'')+'<span>'+esc(a)+'</span></button>'}).join('')+'</div>'+
      (k.alErr?'<p class="kzc-err" role="alert">Choose at least one allergy, or tap Not sure.</p>':'')+
      '<div class="kzw-fld kzc-det"><label for="kzw-dn">Anything the kitchen should know? <small>Optional, for example how severe</small></label><input id="kzw-dn" maxlength="300" autocomplete="off" value="'+esc(k.dnote||'')+'"></div></div>';
    if(k.alst==='not_sure')h+='<p class="kzc-warn">'+kzIcon('alert')+'<span>The booking will show “Allergies not confirmed — check with the guest” until someone records Yes or No.</span></p>';
    return h}
  /* ---------- Anything else: dietary needs, a note, news and offers ---------- */
  function notesHtml(k){
    return '<div class="kzc-sub"><p class="kzc-ask">Dietary needs</p><div class="kzw-pills">'+pills('data-diet',DIETS,function(v){return k.diet.indexOf(v)>=0})+'</div></div>'+
      '<div class="kzw-fld kzc-det"><label for="kzw-nt">Special requests <small>Optional. In the guest’s words</small></label><textarea id="kzw-nt" rows="2" maxlength="500" autocomplete="off" placeholder="Is there anything else the team should know?">'+esc(k.note)+'</textarea></div>'+
      '<div class="kzw-fld kzc-det"><label for="kzw-tn">Note for the team <small>Optional. Guests never see this</small></label><input id="kzw-tn" maxlength="300" autocomplete="off" value="'+esc(k.tnote||'')+'"></div>'+
      '<div class="kzc-sub">'+optinHtml('kzw',k.optin,k.bd,k.bm)+'</div>'+
      (approver()?'<label class="check kz-testsw"><input type="checkbox" id="kztest"'+(window.KZTEST?' checked':'')+'>Test booking <small>Does not count toward capacity and the guest is not emailed</small></label>':'')}
  kzCards.h.locKind=locKind;kzCards.h.hotelHtml=hotelHtml;kzCards.h.allergyHtml=allergyHtml;kzCards.h.notesHtml=notesHtml;
  /* ---------- alerts: allergies (and whether they were asked), dietary and seating needs ---------- */
  var UNSURE='Allergies not confirmed — check with the guest';
  function alerts(){var k=KW,a=[];if(k.alst==='has'&&k.alg.length)a.push(['alg','Allergy: '+k.alg.join(', ')]);else if(k.alst==='not_sure')a.push(['unsure',UNSURE]);
    if(k.diet.length)a.push(['diet','Dietary: '+k.diet.join(', ')]);
    if(k.wheel)a.push(['need','Wheelchair access']);if(k.hc)a.push(['need',k.hc+' highchair'+(k.hc>1?'s':'')]);return a}
  function alertsHtml(){var a=alerts();return a.length?'<div class="kzw-alerts" role="note" aria-label="Allergies and needs">'+a.map(function(x){return '<span class="kzw-al kzw-al-'+x[0]+'">'+(x[0]==='alg'||x[0]==='unsure'?kzIcon('alert'):'')+esc(x[1])+'</span>'}).join('')+'</div>':''}
  function pills(attr,list,on,cls){return list.map(function(x){var v=Array.isArray(x)?x[0]:x,t=Array.isArray(x)?x[1]:x,o=on(v);return '<button type="button" class="kzw-p'+(o?' on'+(cls?' '+cls:''):'')+'" '+attr+'="'+esc(v)+'" data-fk="'+attr+esc(v)+'" aria-pressed="'+o+'">'+esc(t)+'</button>'}).join('')}
  /* every request in one line for the booking: seating, accessibility, transport and anything else */
  function allReqs(){var k=KW,r=k.req.slice();if(k.acc&&k.acc.trim())r.push('Accessibility: '+k.acc.trim());if(k.trans&&k.trans.trim())r.push('Transport: '+k.trans.trim());return r}
  /* ---------- the steps ---------- */
  function html1(){var k=KW,big=k.big||k.size>8;
    var h='<div class="kzw-modes" role="group" aria-label="Booking type"><button type="button" class="kzw-c kzw-mode'+(k.mode==='walk'?' on':'')+'" data-mode="walk" data-fk="mwalk" aria-pressed="'+(k.mode==='walk')+'"><b>Seat walk-in now</b><small>The guests are here</small></button>'+
      '<button type="button" class="kzw-c kzw-mode'+(k.mode==='book'?' on':'')+'" data-mode="book" data-fk="mbook" aria-pressed="'+(k.mode==='book')+'"><b>Make a reservation</b><small>Later today or another day</small></button></div>';
    h+='<div class="kzw-sizes" role="group" aria-label="Number of guests">'+[1,2,3,4,5,6,7,8].map(function(n){var on=k.size===n&&!big;return '<button type="button" class="kzw-c kzw-n'+(on?' on':'')+'" data-size="'+n+'" data-fk="s'+n+'" aria-pressed="'+on+'" aria-label="'+gN(n)+'">'+n+'</button>'}).join('')+
      '<button type="button" class="kzw-c kzw-n'+(big?' on':'')+'" data-size="big" data-fk="sbig" aria-pressed="'+big+'" aria-label="9 or more guests">9+</button></div>';
    if(big){var v=k.size>8?k.size:9;
      h+='<div class="kzw-big"><span class="kzw-lab" id="kzw-bl">How many guests?</span><div class="kzw-step" role="group" aria-labelledby="kzw-bl"><button type="button" class="kzw-c kzw-pm" data-pm="-1" data-fk="pm-" aria-label="One fewer">−</button>'+
        '<input id="kzw-bn" type="number" inputmode="numeric" min="9" max="50" value="'+v+'" aria-label="Number of guests"><button type="button" class="kzw-c kzw-pm" data-pm="1" data-fk="pm+" aria-label="One more">+</button></div></div>';
      if(v>maxGrill())h+='<div class="msg info kzw-note" id="kzw-large"><b>Large group.</b> More than '+maxGrill()+' guests is more than one grill seats, so at Teppanyaki they sit across grills next to each other. For a set menu or a private event, use the <button type="button" class="link" id="kzw-ev">group or event form</button>.</div>'}
    /* v83 (21 Oct 2026): a walk-in answers "Local or hotel?" here, so the name and details step can be skipped */
    if(k.mode==='walk'&&k.size&&!big){var lk=k.hotel?'hotel':!k.loc?'':k.loc===KZO_NONE?'none':k.loc===KZO_ELSE||locKind(k.loc)==='local'?'local':'hotel';
      h+='<div class="kzw-wst" role="group" aria-labelledby="kzw-wstl"><p class="kzw-lab" id="kzw-wstl">Where are they staying?</p><div class="kzw-wsto">'+
        [['local','Local','home'],['hotel','Staying at a hotel','grill'],['none','Did not say','skip']].map(function(o){var on=lk===o[0];return '<button type="button" class="kzw-c kzw-wst-b'+(on?' on':'')+'" data-wst="'+o[0]+'" data-fk="wst'+o[0]+'" aria-pressed="'+on+'"><b>'+o[1]+'</b></button>'}).join('')+'</div></div>'+
        /* Phase 2 (booking audit E9): a walk-in is always asked about food allergies */
        '<div class="kzw-wst kzw-wal" role="group" aria-labelledby="kzw-wall"><p class="kzw-lab" id="kzw-wall">Any food allergies?</p><div class="kzw-wsto">'+
        [['none','No'],['has','Yes'],['not_sure','Not sure']].map(function(o){var on=k.alst===o[0];return '<button type="button" class="kzw-c kzw-wst-b'+(on?' on':'')+(o[0]==='has'?' kzw-wal-yes':'')+'" data-wal="'+o[0]+'" data-fk="wal'+o[0]+'" aria-pressed="'+on+'"><b>'+o[1]+'</b></button>'}).join('')+'</div></div>'}
    return h+'<p class="kzw-quiet"><button type="button" class="link" id="kzw-ev2">Group or event booking</button></p>'}
  function html2(){var k=KW,opt=k.mode==='walk';
    if(k.oc===undefined)k.oc=kzCards.first(CFG,k);
    var h='<div class="kzw-g2"><div class="kzw-fld"><label for="kzw-n">Guest name'+(opt?' <small>Optional for a walk-in</small>':'')+'</label><input id="kzw-n" autocomplete="off" autocapitalize="words" enterkeyhint="next" value="'+esc(k.name)+'"'+(opt?' placeholder="Walk-in"':'')+'></div>'+
      '<div class="kzw-fld"><label for="kzw-ph">Phone'+(opt?' <small>If they have one</small>':'')+'</label><input id="kzw-ph" type="tel" inputmode="tel" autocomplete="off" enterkeyhint="next" value="'+esc(k.phone)+'"></div></div>';
    h+=k.showEmail||k.email?'<div class="kzw-fld kzw-em"><label for="kzw-e">Email <small>Optional. Adds a confirmation and reminder email.</small></label><input id="kzw-e" type="email" inputmode="email" autocomplete="off" value="'+esc(k.email)+'"></div>'
      :'<p class="kzw-addem"><button type="button" class="link" id="kzw-addem">Add an email address</button></p>';
    if(k.linked)h+='<div class="kzw-linked" id="kzw-linked"><span><b>Returning guest.</b> Filled in from their booking'+(k.linked.ld?' on '+esc(fmt(k.linked.ld,{day:'numeric',month:'short'})):'')+'. Check it is still right.</span><button type="button" class="link" id="kzw-unlink">Not them</button></div>';
    h+='<div id="kzw-sug" class="kzw-sugs" aria-live="polite"></div>';
    h+='<p class="kzw-lab kzc-lab" id="kzc-lab">About the guest <small>Tap a question to answer or change it</small></p>'+kzCards.html(CFG,k,k.oc,k.bad);
    return h}
  function card(c,cls){var k=KW,on=k.choice&&k.choice.k===c.k;return '<button type="button" class="kzw-c kzw-opt'+(cls?' '+cls:'')+(on?' on':'')+'" data-opt="'+esc(c.k)+'" data-fk="o'+esc(c.k)+'" aria-pressed="'+!!on+'"><b>'+esc(c.title)+'</b>'+(c.sub?'<small>'+esc(c.sub)+'</small>':'')+'</button>'}
  function html3(){var k=KW,t=today(),dn=k.area==='dining';
    var h='<p class="kzw-lab" id="kzw-arl">Where</p><div class="kzw-areas" role="group" aria-labelledby="kzw-arl">'+[['dining','Dining room','Lunch, dinner, counters'],['teppanyaki','Teppanyaki','Grill sittings']].map(function(x){var on=k.area===x[0];return '<button type="button" class="kzw-c kzw-area'+(on?' on':'')+'" data-area="'+x[0]+'" data-fk="a'+x[0]+'" aria-pressed="'+on+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'}).join('')+'</div>';
    var a=AV[avKey()];
    if(!a){loadAv();return h+'<div class="kzw-load" role="status"><span class="kzw-spin" aria-hidden="true"></span>Checking what is free for '+gN(k.size)+'…</div>'}
    if(a.err)return h+'<div class="msg err">Could not check what is free. '+esc(errText(a.err))+' <button type="button" class="link" id="kzw-retryav">Try again</button></div>';
    var isT=k.date===t;if(!isT&&k.when!=='pick')k.when='pick';
    var o=choices(a),all=o.tep.concat(o.din,o.quick,o.wait);k.opts=all;
    if(k.choice&&!all.some(function(c){return c.k===k.choice.k}))k.choice=null;
    if(!k.choice&&k.want){var m=all.filter(function(c){return c.svc===k.want.svc&&c.time===k.want.time&&!c.q})[0];if(m){k.choice=m;k.want=null}}
    var pick=k.when==='pick',list=dn?o.quick:o.tep;
    h+='<p class="kzw-lab" id="kzw-whl">When</p><div class="kzw-when" role="group" aria-labelledby="kzw-whl">';
    if(!pick)h+=list.map(function(c){return card(c,'kzw-w')}).join('');
    h+='<button type="button" class="kzw-c kzw-opt kzw-w kzw-pickb'+(pick?' on':'')+'" data-when="pick" data-fk="wpick" aria-pressed="'+pick+'"><b>Choose date and time</b><small>'+(pick?esc(dayLong(k.date)):'Another time or day')+'</small></button></div>';
    if(!pick&&!list.length)h+='<p class="kzw-none">'+(dn?'No dining room table has room for '+gN(k.size)+' in the next half hour.':'No Teppanyaki sitting has room for '+gN(k.size)+' today.')+' Choose another time, or the waiting list.</p>';
    if(pick){h+='<div class="kzw-days" role="group" aria-label="Day">';for(var i=0;i<7;i++){var d=addDays(t,i),on=d===k.date;h+='<button type="button" class="kzw-p kzw-day'+(on?' on':'')+'" data-day="'+d+'" data-fk="d'+d+'" aria-pressed="'+on+'"><b>'+(i===0?'Today':i===1?'Tomorrow':esc(fmt(d,{weekday:'short'})))+'</b><small>'+esc(fmt(d,{day:'numeric',month:'short'}))+'</small></button>'}
      var far=k.date>addDays(t,6);h+='<label class="kzw-p kzw-day kzw-dayx'+(far?' on':'')+'"><b>'+(far?esc(fmt(k.date,{weekday:'short'})):'Another day')+'</b><small>'+(far?esc(fmt(k.date,{day:'numeric',month:'short'})):'Calendar')+'</small><input type="date" id="kzw-d" aria-label="Another day" min="'+t+'" value="'+(far?k.date:'')+'"></label></div>';
      if(dn){h+='<div class="kzw-sech">'+(o.periods.length>1?'<div class="kzw-seg" role="group" aria-label="Lunch or dinner">'+o.periods.map(function(p){var on=o.period===p;return '<button type="button" data-per="'+p+'" data-fk="per'+p+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'">'+(p==='lunch'?'Lunch':'Dinner')+'</button>'}).join('')+'</div>':'')+'</div>'+
        (o.din.length?'<div class="kzw-times">'+o.din.map(function(c){return card(c,'kzw-t')}).join('')+'</div>':'<p class="kzw-none">No dining room time has room for '+gN(k.size)+(isT?' later today':' on this day')+'.</p>')}
      else h+=o.tep.length?'<div class="kzw-opts kzw-opts2">'+o.tep.map(function(c){return card(c)}).join('')+'</div>':'<p class="kzw-none">No Teppanyaki sitting has room for '+gN(k.size)+' on this day.</p>'}
    if(o.wait.length&&!pick)h+='<div class="kzw-opts kzw-waits">'+o.wait.map(function(c){return card(c,'kzw-wl')}).join('')+'</div>';
    if(k.choice&&k.choice.kind==='wait')h+='<div class="kzw-grp"><p class="kzw-lab">Wait you told them <small>Your estimate</small></p><div class="kzw-pills">'+pills('data-quote',[0,10,15,20,30,45].map(function(i){return [String(i),i?i+' min':'Not told']}),function(v){return +v===(k.quote||0)})+'</div></div>';
    if(k.pre&&k.pre.wgrill&&!(k.choice&&k.choice.svc==='teppanyaki'))h+='<p class="kzw-quiet small muted">Grill chosen on the seating plan: '+esc(tname(k.pre.wgrill))+'. Choose its sitting to use it.</p>';
    return h}
  function here(){var k=KW,c=k.choice;return !!(c&&c.kind==='book'&&k.mode==='walk'&&c.date===today()&&(c.q==='now'||c.started||(c.svc==='teppanyaki'&&k.when!=='pick')))}
  function whenText(){var k=KW,c=k.choice;if(!c)return '';if(c.kind==='wait')return 'Now, on the waiting list';
    if(c.svc==='teppanyaki'&&c.started)return 'Now, today, '+tl(c.time)+' sitting';if(c.svc==='teppanyaki'&&here())return 'Here now, for the '+tl(c.time)+' sitting today';
    if(c.q==='now')return 'Now, today ('+tl(c.time)+' time slot)';
    if(c.svc==='teppanyaki')return whenDay(c.date)+', '+tl(c.time)+' sitting';
    return whenDay(c.date)+', '+tl(c.time)}
  function whenDay(d){var t=today();return d===t?'Today, '+fmt(d,{day:'numeric',month:'long'}):d===addDays(t,1)?'Tomorrow, '+fmt(d,{day:'numeric',month:'long'}):longDate(d)}
  function seatText(){var c=KW.choice;if(!c)return '';if(c.kind==='wait')return c.svc==='teppanyaki'?'Teppanyaki waiting list':'Dining room waiting list';
    return c.svc==='teppanyaki'?'Teppanyaki'+(c.grill?', '+gname(c.grill,(AV[KW.date+'|'+KW.size]||{}).day):''):'Dining room'+(KW.pre&&KW.pre.wtable?', '+(alcNames([KW.pre.wtable])||KW.pre.wtable):'')}
  function algText(){var k=KW;if(k.alst==='has')return k.alg.length?k.alg.join(', ')+(k.dnote?'. '+k.dnote:''):'Yes, but which allergies is not chosen yet';
    if(k.alst==='none')return 'No allergies reported';if(k.alst==='not_sure')return UNSURE;return 'Not asked yet'}
  function html4(){var k=KW,c=function(id){var x=kzCards.byId(CFG,id);return x&&kzCards.done(x,k)?x.answer(k):''};
    function row(l,v,st,id,card,cls){return '<div class="kzw-rv'+(cls?' '+cls:'')+'"><dt>'+l+'</dt><dd>'+v+'</dd><button type="button" class="link kzw-chg" data-goto="'+st+'"'+(card?' data-gcard="'+card+'"':'')+' data-fk="chg'+id+'" aria-label="Change '+l.toLowerCase()+'">Change</button></div>'}
    var nm=k.name.trim()||(k.mode==='walk'?'Walk-in':''),ph=hasPhone(k.phone)?k.phone.trim():'No phone number';
    var h=alertsHtml();
    if(k.alst!=='has'&&k.alst!=='not_sure'&&k.alst!=='none')h+='<p class="kzw-noalg">'+kzIcon('help')+'<span>Allergies not asked yet. This does not mean the guest has none: ask them.</span></p>';
    var nC=kzCards.byId(CFG,'notes'),aC=kzCards.byId(CFG,'access');
    h+=gpHtml();
    h+='<dl class="kzw-rev">'+row('Guest','<b>'+esc(nm||'No name yet')+'</b><small>'+esc(ph)+(k.email?' · '+esc(k.email):'')+'</small>',2,'g')+
      row('Guests','<b>'+gN(k.size)+'</b>'+(k.kids?'<small>Including '+k.kids+(k.kids===1?' child':' children')+(k.hc?', '+k.hc+(k.hc===1?' highchair':' highchairs'):'')+'</small>':''),1,'n')+
      row('When','<b>'+esc(whenText())+'</b>',3,'w')+row('Service','<b>'+esc(seatText())+'</b>',3,'s')+
      row('Staying','<b>'+esc(kzOriginText(k.loc)||'Not chosen')+'</b>',2,'o','staying')+
      row('Allergies','<b>'+esc(algText())+'</b>',2,'a','allergy',k.alst==='has'?'kzw-rv-alg':k.alst==='not_sure'?'kzw-rv-uns':'')+
      (k.occ?row('Occasion','<b>'+esc(c('occasion')||kzCards.byId(CFG,'occasion').answer(k))+'</b>',2,'oc','occasion'):'')+
      (k.wheel||k.acc?row('Needs','<b>'+esc(aC.answer(k))+'</b>',2,'ac','access'):'')+
      (nC.partial(k)||k.trans?row('Requests','<b>'+esc([k.trans?'Transport: '+k.trans:''].concat(nC.partial(k)?[nC.answer(k)]:[]).filter(Boolean).join('. '))+'</b>',2,'r','notes'):'')+'</dl>';
    if(k.saved&&!k.saved.wait)h+='<div class="msg info">Booked already, reference <b>'+esc(k.saved.ref||'')+'</b>. Confirm to finish the last steps.</div>';
    return h}
  function htmlDone(){var k=KW,s=k.saved||{},nm=k.name.trim()||'Walk-in',c=k.choice||{};
    var h='<div class="kzw-done"><div class="kzw-ok'+(s.approval?' kzw-pend':'')+'" aria-hidden="true"></div><p class="kzw-dsub"><b>'+esc(nm)+'</b>, '+gN(k.size)+(s.wait?'':', '+esc(seatText()))+'<br>'+esc(whenText())+'</p>'+
      (s.ref&&!s.wait?'<p class="kzw-ref">Booking reference <b>'+esc(s.ref)+'</b></p>':'')+
      (s.approval?'<div class="msg info">This time is full, so a manager needs to approve it. Nothing is booked until they do; the answer shows under Needs action. Where they are staying and the allergy answer are sent with it.</div>':'')+alertsHtml()+(s.warn?'<div class="msg warn">'+esc(s.warn)+'</div>':'')+'<div class="kzw-acts">';
    if(s.arrived&&!s.seatedAt&&!s.later)h+='<button type="button" class="btn go kzw-big" id="kzw-seat">'+(s.seatName?'Seat now at '+esc(s.seatName):'Seat now')+'</button>';
    if(s.later&&!s.seatedAt&&!s.grill)h+='<button type="button" class="btn kzw-big" id="kzw-assign">Choose a grill for the '+esc(tl(c.time))+' sitting</button>';
    if(s.id)h+='<button type="button" class="btn kzw-big" id="kzw-open">Add guest details</button>';
    return h+'</div></div>'}
  /* ---------- the live summary: a side panel on laptops, a bar that opens on tablets and phones ---------- */
  function needs(){var k=KW,n=[];if(!k.size)n.push([1,'Number of guests']);
    if(k.mode==='book'||k.date>today()){if(!k.name.trim())n.push([2,'Guest name']);if(!hasPhone(k.phone))n.push([2,'Phone number'])}
    if(!k.loc||k.hotel)n.push([2,'Where the guest is staying','staying']);if(k.alst==='has'&&!k.alg.length)n.push([2,'Which allergies','allergy']);
    if(!k.choice)n.push([3,'When they are joining us']);return n}
  function sumHtml(){var k=KW,nm=k.name.trim()||(k.mode==='walk'?'Walk-in':'No name yet'),c=k.choice,n=needs();
    var when=c?whenText():k.step>=3||k.mode==='book'?'Not chosen yet':'Now, '+(k.area==='dining'?'dining room':'Teppanyaki');
    var al=k.alst==='has'&&k.alg.length?['alg','Allergy: '+k.alg.join(', ')]:k.alst==='not_sure'?['unsure',UNSURE]:k.alst==='none'?['ok','No allergies reported']:['quiet','Allergies not asked yet'];
    function line(ic,l,v,st,card,cls){return '<button type="button" class="kzw-sl'+(cls?' '+cls:'')+'" data-goto="'+st+'"'+(card?' data-gcard="'+card+'"':'')+'>'+kzIcon(ic)+'<span><small>'+l+'</small><b>'+v+'</b></span></button>'}
    var bits=[esc(nm)];if(k.size)bits.push(gN(k.size));if(c)bits.push(esc(whenText()));
    var bar='<button type="button" class="kzw-sumt" id="kzw-sumt" aria-expanded="'+SUMOPEN+'" aria-controls="kzw-sumb">'+kzIcon('list')+'<span class="kzw-sumx">'+bits.join(' · ')+'</span>'+
      (al[0]==='alg'||al[0]==='unsure'?'<span class="kzw-sumf kzw-sumf-'+al[0]+'">'+kzIcon('alert')+(al[0]==='alg'?'Allergy':'Not confirmed')+'</span>':'')+
      (n.length?'<span class="kzw-sumn">'+n.length+' to do</span>':'')+'<span class="kzw-sumc">'+kzIcon('chev')+'</span></button>';
    var body='<div class="kzw-sumb" id="kzw-sumb"><p class="kzw-sumh">Booking summary <span>'+(k.mode==='walk'?'Walk-in':'Reservation')+'</span></p>'+
      line('user','Guest',esc(nm)+(hasPhone(k.phone)?'<small>'+esc(k.phone.trim())+'</small>':''),2)+
      line('users','Guests',k.size?gN(k.size)+(k.kids?'<small>Including '+k.kids+(k.kids===1?' child':' children')+(k.hc?', '+k.hc+(k.hc===1?' highchair':' highchairs'):'')+'</small>':''):'Not chosen yet',1,null,k.size?'':'kzw-sl-todo')+
      line('clock','Date and time',esc(when),3,null,c?'':'kzw-sl-todo')+
      line('grill','Seating',esc(c?seatText():k.area==='dining'?'Dining room':'Teppanyaki'),3)+
      line('pin','Staying',esc(k.loc&&!k.hotel?kzOriginText(k.loc)||k.loc:'Not chosen yet'),2,'staying',k.loc&&!k.hotel?'':'kzw-sl-todo')+
      '<div class="kzw-suma">'+'<button type="button" class="kzw-al kzw-al-'+al[0]+'" data-goto="2" data-gcard="allergy">'+(al[0]==='ok'?kzIcon('check'):al[0]==='quiet'?kzIcon('help'):kzIcon('alert'))+esc(al[1])+'</button>'+
        alerts().filter(function(x){return x[0]!=='alg'&&x[0]!=='unsure'}).map(function(x){return '<span class="kzw-al kzw-al-'+x[0]+'">'+esc(x[1])+'</span>'}).join('')+(k.occ?'<span class="kzw-al kzw-al-cel">'+esc(k.occ==='Celebration'?'Celebrating':k.occ)+'</span>':'')+'</div>'+
      (n.length?'<div class="kzw-sumq"><p>Still needed</p><ul>'+n.map(function(x){return '<li><button type="button" class="link" data-goto="'+x[0]+'"'+(x[2]?' data-gcard="'+x[2]+'"':'')+'>'+esc(x[1])+'</button></li>'}).join('')+'</ul></div>'
        :'<p class="kzw-sumr">'+kzIcon('check')+'Ready to confirm</p>')+'</div>';
    return bar+body}
  function sumPaint(){var el=$('kzw-sum');if(!el||!KW)return;el.innerHTML=sumHtml();el.classList.toggle('is-open',SUMOPEN);bindSum()}
  function bindSum(){var el=$('kzw-sum');if(!el)return;var t=$('kzw-sumt');if(t)t.onclick=function(){SUMOPEN=!SUMOPEN;sumPaint()};
    el.querySelectorAll('[data-goto]').forEach(function(b){b.onclick=function(){SUMOPEN=false;jump(+b.dataset.goto,b.dataset.gcard)}})}
  /* go to any step, and to a question in it */
  function jump(st,card){var k=KW;if(!k||k.busy||k.step==='done')return;if(card){k.oc=card}k.err='';if(k.step!==st){k.step=st;save();paint()}else{save();paint()}if(card)showCard(card,true)}
  function say(t){if(!ANN)return;ANN.textContent='';setTimeout(function(){if(ANN)ANN.textContent=t},40)}
  function reduceMotion(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
  /* the open card, placed in view inside the middle of the screen, so nobody hunts for the next question */
  function showCard(id,focus){var el=$('kzc-'+id),mid=$('kzwm');if(!el||!mid)return;var m=mid.getBoundingClientRect(),r=el.getBoundingClientRect(),pad=16,d=0;
    if(r.bottom>m.bottom-pad)d=Math.min(r.bottom-m.bottom+pad,r.top-m.top-pad);if(r.top<m.top+pad)d=r.top-m.top-pad;
    if(d){try{mid.scrollBy({top:d,behavior:reduceMotion()?'auto':'smooth'})}catch(e){mid.scrollTop+=d}}
    if(focus!==false){var h=el.querySelector('.kzc-h');if(h)h.focus({preventScroll:true})}}
  /* an answer that ends a question: close it, show the answer, open the next unanswered question in the same place */
  function advance(id){var k=KW,c=kzCards.byId(CFG,id),nx=kzCards.next(CFG,k,id);if(k.bad===id)k.bad=null;k.oc=nx;clearErr();save();paint();
    var nc=nx&&kzCards.byId(CFG,nx);say((c?c.title+': '+c.answer(k)+'. ':'')+(nc?'Next: '+nc.ask:'All questions answered.'));
    if(nx)showCard(nx);else{var g=$('kzwc');if(g)g.focus({preventScroll:true})}}
  /* ---------- drawing ---------- */
  function paint(){var m=main();if(!m||state.tab!=='new'||!KW)return;var k=KW,w=$('kzw');
    var act=document.activeElement,fid=act&&act.id,fk=act&&act.getAttribute&&act.getAttribute('data-fk'),caret=null,mid=$('kzwm'),st=mid?mid.scrollTop:0,same=!!w&&PSTEP===String(k.step);
    try{if(act&&act.tagName==='INPUT'&&/^(text|tel|search|email)$/.test(act.type))caret=act.selectionStart}catch(e){}
    var stepN=k.step==='done'?4:k.step,body=k.step===1?html1():k.step===2?html2():k.step===3?html3():k.step===4?html4():htmlDone();
    var sv=k.saved||{},head=k.step==='done'?(sv.approval?'Sent to a manager':sv.wait?'Added to the waiting list':sv.seatedAt?'Seated at '+sv.seatedAt:sv.status&&sv.status!=='confirmed'?'Request saved':'Reservation confirmed'):HEAD[k.step];
    var goLab=k.step===4?(k.choice&&k.choice.kind==='wait'?'Add to waiting list':'Confirm reservation'):k.step==='done'?'Done':k.step===2?'Choose date and time':k.step===3?'Review booking':'Continue';
    var guide=k.step==='done'?'':'<p class="kzw-guide" id="kzw-guide">'+esc(helpText(k))+'</p>';
    var html='<div class="kzw-top"><div class="kzw-row"><i class="klogo" role="img" aria-label="Kazumi Japanese Restaurant"></i><b class="kzw-brand">Kazumi</b><span class="kzw-mlab">'+(k.mode==='walk'?'Walk-in':'Reservation')+'</span>'+
      '<span class="kzw-st" id="kzw-st">'+(k.step==='done'?'Saved':'Step '+stepN+' of 4')+'</span><button type="button" class="btn sm kzw-x" id="kzwx">Close</button></div>'+
      '<div class="kzw-bar" aria-hidden="true">'+[1,2,3,4].map(function(i){return '<i class="'+(i<=stepN?'on':'')+'"></i>'}).join('')+'</div>'+
      '<div class="kzw-stages" role="group" aria-label="Booking progress">'+STEPS.map(function(t,i){var n=i+1,on=n===stepN&&k.step!=='done';return '<span class="'+(on?'current':n<stepN||k.step==='done'?'complete':'')+'"'+(on?' aria-current="step"':'')+'>'+n+'. '+t+'</span>'}).join('')+'</div>'+
      '<h2 class="kzw-h" id="kzw-h" tabindex="-1"'+(guide?' aria-describedby="kzw-guide"':'')+'>'+esc(head)+'</h2></div>'+
      (k.step==='done'?'':'<aside class="kzw-sum'+(SUMOPEN?' is-open':'')+'" id="kzw-sum" aria-label="Booking summary">'+sumHtml()+'</aside>')+'<div class="kz-sr" id="kzw-live" aria-live="polite" role="status"></div>'+
      '<div class="kzw-mid" id="kzwm"><div class="kzw-body'+(same?'':' kzw-in')+'" data-step="'+k.step+'">'+(k.resumed&&k.step!=='done'?'<div class="msg info kzw-resume" id="kzw-resume">Carrying on with the booking you started. <button type="button" class="link" id="kzw-again">Start again</button></div>':'')+guide+body+'</div></div>'+
      '<div class="kzw-foot"><div class="kzw-msg" id="kzwmsg" role="alert" aria-live="assertive">'+(k.err?'<div class="msg err">'+k.err+'</div>':'')+'</div><div class="kzw-btns">'+
      '<button type="button" class="btn kzw-back" id="kzwb">'+(k.step==='done'?'New booking':k.step===1?'Close':'Back')+'</button>'+
      '<button type="button" class="btn primary kzw-go" id="kzwc"'+(k.busy?' disabled aria-busy="true"':'')+'>'+(k.busy?'<span class="kzw-spin" aria-hidden="true"></span>'+(k.step===4?'Confirming…':'Working…'):esc(goLab))+'</button></div></div>';
    if(!w||!m.contains(w)){m.innerHTML='<div class="kzw" id="kzw" role="region" aria-label="New booking"></div>';w=$('kzw')}
    w.innerHTML=html;w.dataset.step=String(k.step);w.dataset.flow=k.mode;ANN=$('kzw-live');lock(true);vv();bind();
    var mm=$('kzwm');if(mm){var sc=function(){w.classList.toggle('kzw-sc',mm.scrollTop>2)};mm.addEventListener('scroll',sc,{passive:true});sc()}
    if(k.step===2&&k.oc&&(k.oc!==PREVOC||!same)){var oc=$('kzc-'+k.oc);if(oc)oc.classList.add('kzc-anim')}PREVOC=k.step===2?k.oc:null;
    mid=$('kzwm');
    if(same){if(mid)mid.scrollTop=st;var f=fid&&$(fid)||fk&&w.querySelector('[data-fk="'+(window.CSS&&CSS.escape?CSS.escape(fk):fk)+'"]');if(f){f.focus({preventScroll:true});if(caret!=null&&f.setSelectionRange)try{f.setSelectionRange(caret,caret)}catch(e){}}}
    else{PSTEP=String(k.step);var hh=$('kzw-h');if(hh)hh.focus({preventScroll:true});if(k.step===2)setTimeout(lookup,0)}
    if(k.step===2&&k.sugs&&k.sugs.length)sugPaint(k.sugs)}
  function setErr(t,focus){KW.err=esc(t);var m=$('kzwmsg');if(m)m.innerHTML='<div class="msg err">'+esc(t)+'</div>';if(focus){var f=$(focus)||document.querySelector(focus);if(f){f.focus({preventScroll:true});try{f.scrollIntoView({block:'nearest'})}catch(e){}}}}
  function clearErr(){if(!KW.err)return;KW.err='';var m=$('kzwmsg');if(m)m.innerHTML=''}
  function to(step){KW.step=step;KW.err='';SUMOPEN=false;save();paint()}
  function bind(){var k=KW,w=$('kzw');
    $('kzwx').onclick=leave;$('kzwb').onclick=function(){if(k.busy)return;if(k.step==='done'){KW=fresh({mode:k.mode});window.KZTEST=false;save();PSTEP=null;paint();return}if(k.step===1)return leave();to(k.step-1)};
    $('kzwc').onclick=next;
    var ag=$('kzw-again');if(ag)ag.onclick=function(){KW=fresh({mode:k.mode});drop();PSTEP=null;paint()};
    w.querySelectorAll('.kzw-mid [data-goto]').forEach(function(b){b.onclick=function(){jump(+b.dataset.goto,b.dataset.gcard)}});bindSum();
    w.querySelectorAll('.kzw-mid input:not([type=checkbox]):not([type=date])').forEach(function(i){i.addEventListener('focus',function(){setTimeout(function(){try{i.scrollIntoView({block:'nearest'})}catch(e){}},250)})});
    if(k.step===1){
      w.querySelectorAll('[data-mode]').forEach(function(b){b.onclick=function(){k.mode=b.dataset.mode;if(k.mode==='walk'){k.when='now';k.date=today()}else k.when='pick';k.choice=null;save();paint()}});
      w.querySelectorAll('[data-size]').forEach(function(b){b.onclick=function(){if(b.dataset.size==='big'){k.big=true;if(k.size<9)k.size=9;k.choice=null;save();paint();var i=$('kzw-bn');if(i)i.focus({preventScroll:true});return}
        var n=+b.dataset.size;if(n!==k.size)k.choice=null;k.size=n;k.big=false;k.kids=Math.min(k.kids,n-1);
        /* v83: a walk-in stays on this step to answer "Where are they staying?" (or moves on if it already has the answer) */
        if(k.mode==='walk'){if(walkReady())return to(3);save();paint();var f=document.querySelector(k.loc&&!k.hotel?'#kzw [data-wal]':'#kzw [data-wst]');if(f)f.focus({preventScroll:true});return}
        to(2)}});
      w.querySelectorAll('[data-wst]').forEach(function(b){b.onclick=function(){var v=b.dataset.wst;
        if(v==='hotel'){k.hotel=true;if(locKind(k.loc)!=='hotel')k.loc=null;k.oc='staying';save();to(2);showCard('staying',false);return}
        k.loc=v==='none'?KZO_NONE:KZO_ELSE;k.hotel=false;if(k.bad==='staying')k.bad=null;save();if(walkReady())return to(3);paint();var f=document.querySelector('#kzw [data-wal]');if(f)f.focus({preventScroll:true})}});
      w.querySelectorAll('[data-wal]').forEach(function(b){b.onclick=function(){var v=b.dataset.wal;k.alst=v;if(v!=='has'){k.alg=[];k.alErr=false}
        if(v==='has'){k.oc='allergy';save();to(2);showCard('allergy',false);return}
        save();if(walkReady())return to(3);paint();var f=document.querySelector('#kzw [data-wst]');if(f)f.focus({preventScroll:true})}});
      w.querySelectorAll('[data-pm]').forEach(function(b){b.onclick=function(){var n=Math.max(9,Math.min(50,(k.size||9)+(+b.dataset.pm)));if(n!==k.size)k.choice=null;k.size=n;save();paint()}});
      var bn=$('kzw-bn');if(bn){bn.oninput=function(){var n=parseInt(bn.value,10);if(n>=9&&n<=50){if(n!==k.size)k.choice=null;k.size=n;save();var l=$('kzw-large');if((n>maxGrill())!==!!l)paint()}};bn.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();next()}}}
      [$('kzw-ev'),$('kzw-ev2')].forEach(function(b){if(b)b.onclick=function(){save();lock(false);state.newPre={svc:'event',date:k.date>=today()?k.date:today()};renderNew()}})}
    if(k.step===2){var n=$('kzw-n'),p=$('kzw-ph');
      n.oninput=function(){k.name=n.value;clearErr();save();lookupSoon();sumPaint()};p.oninput=function(){k.phone=p.value;clearErr();save();lookupSoon();sumPaint()};
      [n,p].forEach(function(x){x.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();if(x===n)p.focus();else next()}}});
      var ae=$('kzw-addem');if(ae)ae.onclick=function(){k.showEmail=true;save();paint();var e=$('kzw-e');if(e)e.focus()};
      var e1=$('kzw-e');if(e1)e1.oninput=function(){k.email=e1.value.trim();save()};
      var ul=$('kzw-unlink');if(ul)ul.onclick=function(){var v=k.linked&&k.linked.prev;if(v){k.name=v.name;k.phone=v.phone;k.email=v.email;k.loc=v.loc}k.linked=null;k.past=null;save();paint()};
      bindCards(w)}
    if(k.step===3){
      w.querySelectorAll('[data-area]').forEach(function(b){b.onclick=function(){if(k.area===b.dataset.area)return;k.area=b.dataset.area;k.choice=null;clearErr();save();paint()}});
      w.querySelectorAll('[data-when]').forEach(function(b){b.onclick=function(){k.when=k.when==='pick'&&k.date===today()?'now':'pick';k.choice=null;clearErr();save();paint()}});
      w.querySelectorAll('[data-day]').forEach(function(b){b.onclick=function(){k.date=b.dataset.day;k.choice=null;if(k.date>today())k.mode='book';save();paint()}});
      var dd=$('kzw-d');if(dd)dd.onchange=function(){if(dd.value&&dd.value>=today()){k.date=dd.value;k.choice=null;if(k.date>today())k.mode='book';save();paint()}};
      w.querySelectorAll('[data-per]').forEach(function(b){b.onclick=function(){k.period=b.dataset.per;save();paint()}});
      w.querySelectorAll('[data-opt]').forEach(function(b){b.onclick=function(){var c=(k.opts||[]).filter(function(x){return x.k===b.dataset.opt})[0];if(!c)return;k.choice=c;clearErr();
        if(c.q)k.when=c.q;else if(c.kind==='book'&&k.date===today()&&!c.started&&k.when!=='pick')k.when='sit';
        if(c.q==='now'||c.started)k.mode='walk';else if(k.when==='pick'&&c.kind==='book')k.mode='book';save();if(c.kind==='wait'){paint();return}to(4)}});
      w.querySelectorAll('[data-quote]').forEach(function(b){b.onclick=function(){k.quote=+b.dataset.quote;save();paint()}});
      var ra=$('kzw-retryav');if(ra)ra.onclick=function(){delete AV[avKey()];paint()}}
    if(k.step==='done'){var s=k.saved||{};
      var se=$('kzw-seat');if(se)se.onclick=function(){seat(true,se)};var as=$('kzw-assign');if(as)as.onclick=function(){seat(false,as)};
      var op=$('kzw-open');if(op)op.onclick=function(){openBooking(s.id)}}}
  /* ---------- the guest preference cards: what each answer does (the fields are listed in the saving section) ---------- */
  function tog(list,v){var i=list.indexOf(v);if(i>=0)list.splice(i,1);else list.push(v)}
  function pick(id,v){var k=KW;clearErr();k.alErr=false;
    if(id==='staying'){if(v==='local'){k.loc=KZO_ELSE;k.hotel=false;return advance(id)}if(v==='none'){k.loc=KZO_NONE;k.hotel=false;return advance(id)}
      k.hotel=true;if(locKind(k.loc)!=='hotel')k.loc=null;kzPlaces().then(function(){if(KW&&KW.hotel&&KW.step===2&&KW.oc==='staying'&&!($('kzw-hq')&&$('kzw-hq').value))paint()});
      save();paint();var q=$('kzw-hq');if(q&&window.innerWidth>900)q.focus({preventScroll:true});showCard('staying',false);return}
    if(id==='allergy'){if(v==='has'){k.alst='has';k.cs.allergy=null;save();paint();showCard('allergy',false);var f=document.querySelector('#kzc-allergy [data-alg]');if(f)f.focus({preventScroll:true});return}
      k.alst=v;k.alg=[];k.cs.allergy=null;if(v==='none')k.past=null;return advance(id)}
    if(id==='occasion'){if(v==='none'){k.occ='';k.cel='';k.cs.occasion='none';return advance(id)}k.occ=v;k.cs.occasion=null;save();paint();showCard('occasion',false);return}
    if(id==='kids'){if(v==='0'){k.kids=0;k.hc=0;k.cs.kids='none';delete k.cs.hc;return advance(id)}k.kids=+v;k.cs.kids=v;if(k.hc>k.kids)k.hc=k.kids;delete k.cs.hc;save();paint();showCard('kids',false);return}
    if(id==='seating'){tog(k.req,v);k.cs.seating=null;save();paint();return}
    if(id==='access'){if(v==='none'){k.wheel=false;k.acc='';k.cs.accOther=false;k.cs.access='none';return advance(id)}
      if(v==='wheel')k.wheel=!k.wheel;else{k.cs.accOther=!k.cs.accOther;if(!k.cs.accOther)k.acc=''}k.cs.access=null;save();paint();if(v==='other'){var i=$('kzw-acc');if(i)i.focus({preventScroll:true})}showCard('access',false);return}
    if(id==='transport'){if(v==='none'){k.trans='';k.cs.transOther=false;k.cs.transport='none';return advance(id)}
      if(v==='other'){k.cs.transOther=true;k.cs.transport=null;if(k.trans==='Taxi after the meal')k.trans='';save();paint();var t=$('kzw-trn');if(t)t.focus({preventScroll:true});showCard('transport',false);return}
      k.trans=v;k.cs.transOther=false;k.cs.transport='done';return advance(id)}
    if(id==='notes'){tog(k.req,v);k.cs.notes=null;save();paint();return}}
  function finish1(id){var k=KW;
    if(id==='allergy'&&!k.alg.length){k.alErr=true;paint();var f=document.querySelector('#kzc-allergy [data-alg]');if(f)f.focus({preventScroll:true});return}
    if(id==='seating')k.cs.seating='done';if(id==='access')k.cs.access=k.wheel||(k.acc&&k.acc.trim())?'done':'none';
    if(id==='transport'){k.cs.transOther=false;k.cs.transport=k.trans&&k.trans.trim()?'done':'none'}if(id==='notes')k.cs.notes='done';advance(id)}
  function skip1(id){var k=KW;if(id==='allergy'){k.alst=null;k.alg=[];k.cs.allergy='skip'}
    if(id==='seating'){k.req=k.req.filter(function(r){return kzCards.byId(CFG,'seating').options(k).every(function(o){return o.v!==r})});k.cs.seating='none'}
    if(id==='notes')k.cs.notes='none';advance(id)}
  function bindCards(w){var k=KW;
    w.querySelectorAll('[data-ch]').forEach(function(b){b.onclick=function(){var id=b.dataset.ch;k.oc=k.oc===id?null:id;save();paint();if(k.oc)showCard(id)}});
    w.querySelectorAll('[data-cv]').forEach(function(b){b.onclick=function(){var x=b.dataset.cv,i=x.indexOf(':');pick(x.slice(0,i),x.slice(i+1))}});
    w.querySelectorAll('[data-cfin]').forEach(function(b){b.onclick=function(){finish1(b.dataset.cfin)}});
    w.querySelectorAll('[data-cskip]').forEach(function(b){b.onclick=function(){skip1(b.dataset.cskip)}});
    w.querySelectorAll('[data-hc]').forEach(function(b){b.onclick=function(){k.hc=+b.dataset.hc;k.cs.hc=1;advance('kids')}});
    w.querySelectorAll('[data-alg]').forEach(function(b){b.onclick=function(){tog(k.alg,b.dataset.alg);k.alErr=false;save();paint()}});
    w.querySelectorAll('[data-diet]').forEach(function(b){b.onclick=function(){tog(k.diet,b.dataset.diet);k.cs.notes=null;save();paint()}});
    var ap=$('kzw-addpast');if(ap)ap.onclick=function(){(k.past||[]).forEach(function(a){if(k.alg.indexOf(a)<0)k.alg.push(a)});k.past=null;k.alst='has';k.cs.allergy=null;k.oc='allergy';save();paint();showCard('allergy',false)};
    [['kzw-cel','cel'],['kzw-dn','dnote'],['kzw-acc','acc'],['kzw-trn','trans'],['kzw-nt','note'],['kzw-tn','tnote']].forEach(function(x){var i=$(x[0]);if(!i)return;
      i.oninput=function(){k[x[1]]=i.value;if(x[1]==='note'||x[1]==='tnote')k.cs.notes=null;save();sumPaint()};
      i.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();var id=i.closest('.kzc');if(id)finish1(id.dataset.card)}}});
    w.querySelectorAll('[data-org]').forEach(function(b){b.onclick=function(){if(b.dataset.org==='rehotel'){k.hotel=true;save();paint();var q=$('kzw-hq');if(q)q.focus({preventScroll:true})}}});
    w.querySelectorAll('[data-hv]').forEach(function(b){b.onclick=function(){setLoc(b.dataset.hv)}});
    var hq=$('kzw-hq');if(hq){hq.oninput=function(){hotelRes(hq.value)};
      hq.onkeydown=function(e){var ul2=$('kzw-hr'),cnt=HR.length+1;if(!ul2||ul2.hidden){if(e.key==='Enter')e.preventDefault();return}
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();HA=(HA+(e.key==='ArrowDown'?1:-1)+cnt)%cnt;ul2.querySelectorAll('li').forEach(function(li,i){li.classList.toggle('on',i===HA);li.setAttribute('aria-selected',String(i===HA))});hq.setAttribute('aria-activedescendant','kzw-ho'+HA)}
        else if(e.key==='Enter'){e.preventDefault();hotelPick(HA===HR.length?'typed':HA)}else if(e.key==='Escape'){e.stopPropagation();ul2.hidden=true;hq.setAttribute('aria-expanded','false')}}}
    bindOptin('kzw',function(v){k.optin=v.yes;k.bd=v.d;k.bm=v.m;k.cs.notes=null;save();sumPaint()});var ts=$('kztest');if(ts)ts.onchange=function(){window.KZTEST=ts.checked}}
  /* ---------- moving on ---------- */
  function check(st){var k=KW;
    if(st===1){if(!(k.size>=1&&k.size<=50)){setErr(k.big?'Please enter a number of guests from 9 to 50.':'Please choose how many guests are joining us.',k.big?'kzw-bn':null);return false}return true}
    if(st===2){var book=k.mode==='book';if(book&&!k.name.trim()){setErr('Please enter a guest name to continue.','kzw-n');return false}
      if(book&&!hasPhone(k.phone)){setErr('Please enter a phone number so the team can reach the guest.','kzw-ph');return false}
      if(k.email&&!EMAIL.test(k.email)){setErr('Please check the email address, or leave it empty.','kzw-e');return false}
      if(!k.loc||k.hotel){k.bad='staying';k.oc='staying';paint();showCard('staying',false);setErr(k.hotel?'Please choose the hotel, or Did not say.':'Please choose where the guest is staying, or Did not say.',k.hotel?'kzw-hq':'[data-cv="staying:local"]');return false}
      if(k.alst==='has'&&!k.alg.length){k.oc='allergy';k.alErr=true;paint();showCard('allergy',false);setErr('Please choose the guest’s allergies, or tap Not sure.','#kzc-allergy [data-alg]');return false}return true}
    if(st===3){if(!k.choice){setErr('Please choose when they are joining us.');return false}return true}
    return true}
  function next(){var k=KW;if(k.busy||INFLIGHT)return;if(k.step==='done')return finish();
    if(k.step===1&&k.big){var bn=$('kzw-bn');if(bn){var n=parseInt(bn.value,10);if(n>=9&&n<=50)k.size=n;else k.size=0}}
    if(!check(k.step))return;if(k.step<4)return to(k.step+1);confirmIt()}
  function back2(){if(LAST&&LAST.tab&&LAST.tab!=='new'){go(LAST.tab,LAST.tab==='today'?{view:LAST.view||'arrivals'}:null)}else window.kzHostTab()}
  function leave(){if(KW&&KW.busy)return;if(KW&&KW.step==='done')return finish();save();lock(false);back2()}
  function finish(){var walk=KW&&KW.mode==='walk';KW=null;drop();lock(false);if(walk||!LAST||LAST.tab==='new')window.kzHostTab();else back2()}
  /* ---------- saving: success only after the server has the booking; one booking however often the button is tapped ---------- */
  /* v86 (21 Oct 2026, approved by Roneel): the grill is chosen when the Teppanyaki booking is made, so guests walk straight to it on
     arrival. Check and confirm shows the sitting's grills (seats free, a red dot where a guest has an allergy) with the best fit
     already chosen (the same split rule as the Seating plan); staff can tap another grill that fits. After staff_create_any the
     party is placed with staff_seat_plan (not pinned, so Rearrange and the Seating plan can still move it). Same server calls
     and checks as placing a party on the Seating plan; no database change. */
  var GD={};
  function gpOn(){var k=KW,c=k&&k.choice;return !!(c&&c.svc==='teppanyaki'&&c.kind!=='wait'&&!c.started&&!k.saved)}
  async function gpLoad(date){var old=GD[date]&&GD[date].day||null;GD[date]={at:Date.now(),loading:true,day:old};var d=null;try{d=await call('staff_get_day',{p_date:date})}catch(e){}
    GD[date]={at:Date.now(),day:d&&d.sessions?d:old};if(KW&&KW.step===4)paint()}
  function gpData(){var k=KW,c=k.choice,g=GD[c.date];if(!g){gpLoad(c.date);return null}if(!g.loading&&Date.now()-g.at>60000){gpLoad(c.date);g=GD[c.date]}if(!g.day)return g.loading?null:{none:true};
    var r=withDay(g.day,function(){var s=sessionOf(c.time);if(!s)return {none:true};
      var sug=grillFor(g.day,c.time,k.size,k.alst==='has'?k.alg:[]);
      var tiles=s.tables.map(function(t){var blk=!!blockOf(c.time,t.code),free=blk?0:freeFor(s,t.code,'_kw');
        var al=(t.parties||[]).some(function(p){return p.allergens&&p.allergens.length});
        return {code:t.code,name:tname(t.code),seats:t.seats,free:free,fits:!blk&&free>=k.size,alg:al,blk:blk}});
      return {tiles:tiles,sug:sug}});
    return r||{none:true}}
  function gpChosen(d){var k=KW,key=k.choice.date+'|'+k.choice.time;
    if(k.gpick&&k.gpick.k===key){var t=d.tiles.find(function(x){return x.code===k.gpick.code});if(t&&t.fits){var o={};o[t.code]=k.size;return {split:o,mine:true}}}
    if(k.pre&&k.pre.wgrill&&k.pre.sit===k.choice.time){var w=d.tiles.find(function(x){return x.code===k.pre.wgrill});if(w&&w.fits){var o2={};o2[w.code]=k.size;return {split:o2,mine:true}}}
    return d.sug?{split:d.sug,mine:false}:null}
  function gpHtml(){if(!gpOn())return '';var d=gpData();
    if(!d)return '<section class="kz86-gp" aria-label="Grill"><p class="kz86-gph"><b>Grill</b><span>Loading the grills…</span></p></section>';
    if(d.none)return '';var ch=gpChosen(d),on=ch?Object.keys(ch.split):[],day=GD[KW.choice.date].day;
    var h='<section class="kz86-gp" aria-label="Grill"><p class="kz86-gph"><b>Grill</b><span>'+(ch?(ch.mine?'You chose ':'We suggest ')+'<b>the '+esc(gname(ch.split,day))+(Object.keys(ch.split).length>1?' grills':' grill')+'</b>. Tap another grill to change it.':'No grill has room for '+KW.size+'. Confirm, then a manager chooses grills on the Seating plan.')+'</span></p><div class="kz86-room">';
    d.tiles.forEach(function(t){var sel=on.indexOf(t.code)>=0;
      h+='<button type="button" class="kz86-gt'+(sel?' on':'')+(t.fits?' fit':' no')+'" data-kz86g="'+esc(t.code)+'"'+(t.fits?'':' disabled')+' aria-pressed="'+sel+'">'+
        '<b>'+esc(t.name)+(t.alg?'<i class="kz86-dot" title="A guest at this grill has an allergy"></i>':'')+'</b><span>'+(t.blk?'Not in use':t.free?t.free+' of '+t.seats+' free':'Full')+'</span></button>'});
    return h+'</div><p class="kz86-gpl"><i class="kz86-dot"></i>A guest at that grill has an allergy. Grills can still be changed later on the Seating plan.</p></section>'}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#kzw [data-kz86g]');if(!b||!KW||!KW.choice)return;e.preventDefault();
    KW.gpick={k:KW.choice.date+'|'+KW.choice.time,code:b.dataset.kz86g};save();paint()});
  async function confirmIt(){var k=KW;if(k.busy||INFLIGHT)return;
    if(k.mode==='book'||k.date>today()){if(!k.name.trim())return goFix(2,'Please enter a guest name to continue.','kzw-n');if(!hasPhone(k.phone))return goFix(2,'Please enter a phone number so the team can reach the guest.','kzw-ph')}
    if(!k.loc||k.hotel){k.bad='staying';k.oc='staying';return goFix(2,'Please choose where the guest is staying, or Did not say.')}
    if(k.alst==='has'&&!k.alg.length){k.oc='allergy';k.alErr=true;return goFix(2,'Please choose the guest’s allergies, or tap Not sure.')}if(!k.choice)return goFix(3,'Please choose when they are joining us.');
    INFLIGHT=true;k.busy=true;k.err='';paint();var c=k.choice,t=today(),nm=k.name.trim()||'Walk-in',ph=hasPhone(k.phone)?k.phone.trim():'',warn=[];
    try{
      var algs=k.alst==='has'?k.alg.slice():[],dn=k.alst==='has'&&k.dnote&&k.dnote.trim()?k.dnote.trim():null;
      if(c.kind==='wait'){if(!k.saved){var w=await call('staff_waitlist_add',{p:{date:t,service:c.svc,session_time:c.svc==='teppanyaki'?c.time:null,adults:k.size-k.kids,children:k.kids,name:nm,phone:ph,allergens:algs,
          needs:reqText(allReqs().concat(k.diet,k.alst==='not_sure'?[UNSURE]:[],dn?[dn]:[]),k.note)||'',wheelchair:!!k.wheel,high_chairs:k.hc||0,location:k.loc&&!k.hotel?k.loc:'',quoted_minutes:k.quote||''}});k.saved={wait:true,id:w&&w.id}}}
      else{
        var gsel=null;if(!k.saved&&gpOn()){var gd=gpData(),gc=gd&&!gd.none?gpChosen(gd):null;if(gc)gsel=gc.split}
        if(!k.saved){if(!gsel&&k.pre&&k.pre.wgrill&&c.svc==='teppanyaki'&&c.time===k.pre.sit&&!c.started)state.grillPre={date:c.date,time:c.time,grill:k.pre.wgrill};else state.grillPre=null;
          /* Phase 3 (audit E12): the guest's details travel with a request to a manager and are applied when approved */
          var xr={location:k.loc};if(k.diet.length)xr.diet_prefs=k.diet;if(k.wheel)xr.wheelchair=true;if(k.hc)xr.high_chairs=k.hc;if(k.occ&&k.cel&&k.cel.trim())xr.celebrant=k.cel.trim();if(k.alst==='none'||k.alst==='not_sure')xr.allergy_status=k.alst;
          var r=await call('staff_create_any',{__extras:xr,p_service:c.svc,p_date:c.date,p_time:c.time,p_adults:k.size-k.kids,p_children:k.kids,p_name:nm,p_phone:ph||'Not given',p_email:k.email||null,p_occasion:k.occ||null,p_dietary:dn,
            p_requests:reqText(allReqs(),k.note),p_allergens:algs,p_seating_pref:c.svc==='dining'?'no_preference':null,p_source:k.mode==='walk'?'walk_in':'phone',p_staff_notes:(k.tnote||'').trim()||null});
          if(!r||!r.id)throw new Error('NO_ID');k.saved={id:r.id,ref:r.reference,status:r.status};save()
          if(gsel){try{await call('staff_seat_plan',{p_items:[{id:r.id,split:gsel,pin:false}]});k.saved.grill=gsel;c.grill=gsel;save()}catch(eg){warn.push('Booked, but the grill did not save. Choose it on the Seating plan.')}}}
        var s=k.saved,hr=here();
        if(hr&&!s.arrived){try{await call('staff_action2',{p_id:s.id,p_action:'arrived',p_reason:null,p_notify:false});s.arrived=true}catch(e2){warn.push('Booked, but not yet marked as arrived. Tap Arrived on Arrivals.')}}
        if(!s.extras){var x={location:k.loc};if(k.diet.length)x.diet_prefs=k.diet;if(k.wheel)x.wheelchair=true;if(k.hc)x.high_chairs=k.hc;if(k.occ&&k.cel&&k.cel.trim())x.celebrant=k.cel.trim();
          if(k.alst==='none'||k.alst==='not_sure')x.allergy_status=k.alst;
          try{await call('staff_set_extras',{p_id:s.id,p_extras:x});s.extras=true}catch(e3){warn.push('Where the guest is staying'+(x.allergy_status?', the allergy answer':'')+(k.diet.length||k.wheel||k.hc?', dietary and seating needs':'')+' did not save. Open the booking to add it.')}}
        if(k.optin&&!s.optin){var ow=await saveOptin(s.id,true,k.bd,k.bm);if(ow)warn.push(ow);s.optin=true}
        s.later=hr&&c.svc==='teppanyaki'&&!c.started;
        if(s.arrived){try{state.date=t;await hdFetch()}catch(e4){}var p=hdFind(s.id);if(p&&!s.later){var sel=bestSeat(p,c);if(sel){s.sel=sel;s.seatName=hdSelName(sel)}}}}
      k.saved.warn=warn.join(' ');k.busy=false;INFLIGHT=false;k.step='done';drop();try{loadNeeds()}catch(e5){}paint()}
    catch(e){k.busy=false;INFLIGHT=false;var m=String(e&&e.message||''),txt=errText(e);
      /* Phase 2 (booking audit E12, E13): a request sent to a manager is an outcome, not an error; when the reply is lost the
         booking may have saved, so staff check before trying again instead of being told it did not save. */
      if(/REQUEST_SENT/.test(m)&&!k.saved){k.saved={approval:true};k.step='done';drop();try{loadNeeds()}catch(e6){}paint();return}
      if(/DUP_OPENED|DUP_STOPPED|REQUEST_NOT_SENT/.test(m)){k.err=esc(txt);paint();return}
      if(!k.saved&&/KZ_TIMEOUT|Failed to fetch|NetworkError|Load failed|network/i.test(m)){k.unsure=true;k.err=esc('Not sure it saved. The connection dropped before the reply came back. Check Bookings for '+(k.name.trim()||'this guest')+' first; if it is not there, tap Confirm again. Your details are kept.');save();paint();return}
      k.err=esc((k.saved?'':'Not booked yet. ')+txt.replace(/\s*If it keeps happening, tell the manager\.?/,'')+' Your details are kept. Tap '+(c.kind==='wait'?'Add to waiting list':'Confirm reservation')+' to try again.');save();paint()}}
  function goFix(st,t,f){KW.step=st;save();paint();setErr(t,f)}
  function walkReady(){var k=KW;return !!(k.size&&k.loc&&!k.hotel&&(k.alst==='none'||k.alst==='not_sure'||(k.alst==='has'&&k.alg.length)))}
  function bestSeat(p,c){try{if(c.svc==='teppanyaki'){var s=sessionOf(p.time);if(!s)return null;
        if(c.grill&&Object.keys(c.grill).every(function(code){return freeFor(s,code,p.id)>=c.grill[code]}))return {split:c.grill,codes:Object.keys(c.grill)};
        var r=planFor(s,[{id:p.id,size:p.size,allergens:p.allergens||[]}]),b=r&&r.items&&r.items[p.id];return b?{split:b,codes:Object.keys(b)}:null}
      if(KW.pre&&KW.pre.wtable)return {codes:[KW.pre.wtable]};if(!alcOn())return null;
      var ps=hdParties().filter(function(q){return q.svc!=='teppanyaki'&&!/^(cancelled|declined|no_show)$/.test(q.status)&&!q.departed_at}),best=null;
      ['dining_room','yakitori_counter','sushi_bar'].some(function(a){var x=alcBest({id:p.id,session_time:p.time,size:p.size},a,ps);if(x){best=x;return true}});return best?{codes:best}:null}catch(e){return null}}
  /* seating after saving: the same Choose table sheet, rules and server checks as Arrivals, with the best fit chosen */
  async function seat(auto,btn){var k=KW,s=k.saved;if(!s||!s.id)return;btn.disabled=true;
    try{state.date=today();await hdFetch()}catch(e){}var p=hdFind(s.id);btn.disabled=false;
    if(!p){toast('Open Arrivals to seat them.');return}
    hdChoose({p:p,pre:auto&&s.sel?s.sel:null,after:function(id,nm,seated){if(KW&&KW.saved&&KW.saved.id===id&&seated){KW.saved.seatedAt=nm;paint()}}})}
  /* ---------- opening the flow ---------- */
  function fromPre(pre){var t=today(),walk=!!pre.walk&&!pre.guest,future=pre.date&&pre.date>t;
    var mode=pre.guest||pre.time||future?'book':walk||!pre.date||pre.date===t?'walk':'book';
    var p2=(pre.wgrill||pre.wtable||pre.sit)?{wgrill:pre.wgrill||null,wtable:pre.wtable||null,sit:pre.sit||null,svc:pre.svc||null}:null;
    var k=fresh({mode:mode,date:pre.date&&pre.date>=t?pre.date:t,area:pre.svc==='dining'||pre.wtable?'dining':pre.svc==='teppanyaki'||pre.wgrill?'teppanyaki':null,want:pre.time&&pre.svc?{svc:pre.svc,time:pre.time}:null,pre:p2});
    if(mode==='book')k.when='pick';if(pre.wgrill&&pre.sit&&k.date===t&&pre.sit>nowHM())k.want={svc:'teppanyaki',time:pre.sit};
    if(pre.guest){k.name=pre.guest.name||'';if(pre.guest.phone)k.phone=pre.guest.phone;k.email=pre.guest.email||'';k.linked={name:k.name,ld:'',prev:{name:'',phone:'+679 ',email:'',loc:null}}}
    return k}
  function openFlow(pre){var real=pre&&(pre.guest||pre.date||pre.svc||pre.sit||pre.wgrill||pre.wtable||pre.time);
    if(real)KW=fromPre(pre);
    else{var d=KW&&KW.step!=='done'?KW:load();if(worth(d)){KW=d;KW.resumed=true}else KW=fresh({mode:pre&&pre.mode||'walk'})}
    KW.busy=false;INFLIGHT=false;PSTEP=null;window.KZTEST=false;save();paint()}
  var _rnOld=renderNew;
  renderNew=function(){var pre=state.newPre;
    if(pre&&pre.svc==='event'){var prev=state.newMode;state.newMode='full';lock(false);
      try{_rnOld.apply(this,arguments)}finally{state.newMode=prev}
      var nm=main().querySelector('.nmode');if(nm)nm.remove();var h=main().querySelector('h1');
      /* Phase 3 (audit E7): the group or event form is for events only */
      var evb=main().querySelector('#nsv [data-v="event"]');if(evb&&!evb.classList.contains('on'))evb.click();var sg=$('nsv');if(sg)sg.hidden=true;
      /* Phase 4: the Book button stays in view at the foot of the screen while the form scrolls */
      var st=main().querySelector('.stack');if(st)st.classList.add('kz-evform');
      if(h){h.textContent='Group or event booking';var r=h.parentElement;if(r&&!$('kzwfb'))r.insertAdjacentHTML('beforeend','<button type="button" class="btn sm" id="kzwfb">Back to New booking</button>');var fb=$('kzwfb');if(fb)fb.onclick=function(){state.newPre=null;renderNew()}}
      return}
    state.newPre=null;openFlow(pre)};
  window.kzWalkIn=function(pre){pre=pre&&!pre.type?pre:{};var at=!!(pre.grill||pre.table);state.newPre={walk:true,date:at?state.date:null,svc:pre.svc||null,sit:pre.sit||null,wgrill:pre.grill||null,wtable:pre.table||null};
    if(!at&&!pre.svc&&!pre.sit)state.newPre=null;go('new')};
  /* the screen before New booking, for Close and Done */
  var _go=go;go=function(tab,opts){if(tab==='new'&&state.tab!=='new')LAST={tab:state.tab,view:state.view};if(tab!=='new')lock(false);return _go.apply(this,arguments)};
  var _sh=shell;shell=function(){if(state.tab!=='new')lock(false);return _sh.apply(this,arguments)};
  /* a refresh brings back the booking being made */
  var _kr=kzRestore;kzRestore=function(){var c=_kr.apply(this,arguments);try{var raw=JSON.parse(sessionStorage.getItem('kz_ctx')||'null');if(raw&&raw.tab==='new'&&me&&raw.u===(me.email||me.name)&&worth(load()))state.tab='new'}catch(e){}return c};
  /* a shared tablet: signing out forgets the draft */
  var SIGNED=false,_sh2=shell;shell=function(){SIGNED=true;return _sh2.apply(this,arguments)};
  var _lv=loginView;loginView=function(){KW=null;if(SIGNED)drop();SIGNED=false;lock(false);return _lv.apply(this,arguments)};
  /* Escape closes the flow (the draft is kept), unless a sheet or panel is open over it */
  document.addEventListener('keydown',function(e){if(e.key!=='Escape'||!KW||state.tab!=='new'||!$('kzw'))return;if(searchOpen()||drawerOpen()||document.querySelector('.kz-cal.is-open'))return;leave()});
  /* Show me how on Arrivals describes the new steps */
  new MutationObserver(function(){var l=document.querySelectorAll('#sr .hd-how span');[].forEach.call(l,function(s){if(/^Tap New booking\. Choose where they eat/.test(s.textContent))s.textContent='Tap New booking, then Seat walk-in now: how many, who, when, then Confirm reservation.'})}).observe(document.documentElement,{childList:true,subtree:true});
  window.kzFlow=function(){return KW};
})();
/* v64 (14 Oct 2026): cockpit refinement, structure (see docs/STAFF-APP-DESIGN.md). Interface only: no server call,
   rule, permission, print layout or email changes.
   1. New booking sits in the operational header of the day screens and of All bookings (tablets, laptops), as the one
      primary button there. It replaces the second New booking buttons in the Arrivals bar and above the grills, so each
      screen has one. On phones it is the round button, now docked in the middle of the bottom bar so it never covers a guest.
   2. Each day screen reads top to bottom in the same zones: header (page, date, New booking), overview (greeting, needs
      action, Teppanyaki or lunch and dinner, counts), the work itself, then details. The zones are marked with classes so
      the stylesheet can give them the same spacing everywhere. */
(function(){
  function canBook(){return !state.date||state.date>=fijiToday()}
  function newBtn(id){return '<button type="button" class="btn primary kz64-new" id="'+id+'">'+I.plus+'<span>New booking</span></button>'}
  function headerNew(){var bar=document.querySelector('#kzs main .daybar');if(!bar)return;var row=bar.querySelector(':scope > .row');var b=$('kz63new');
    if(b&&!b.classList.contains('kz64-new'))b.remove();b=$('kz63new');
    if(!canBook()){if(b)b.remove();return}
    if(!b&&row){row.insertAdjacentHTML('beforeend',newBtn('kz63new'));b=$('kz63new')}
    if(b)b.onclick=function(){window.kzWalkIn({})}}
  var _rt=renderToday;renderToday=function(){var r=_rt.apply(this,arguments);try{var m=main();if(m){var d=m.querySelector('.daybar');if(d)d.classList.add('kz64-head')}headerNew()}catch(e){}return r};
  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{var el=$('day');if(!el)return r;
      /* one New booking per screen: the header's */
      el.querySelectorAll('.kz63-hbar #kz63new, .kz63-hbar .btn.primary').forEach(function(x){if(!x.classList.contains('kz64-new'))x.remove()});
      var wk=el.querySelector('#walkin');if(wk)wk.remove();
      headerNew();
      /* zones */
      var ov=[el.querySelector('.splitbar'),el.querySelector('.closed')].filter(Boolean);ov.forEach(function(x){x.classList.add('kz64-ov')});
      var hb=el.querySelector('.kz63-hbar');if(hb)hb.classList.add('kz64-work-h')}catch(e){}return r};
  var _rc=renderCalendar;renderCalendar=function(){var r=_rc.apply(this,arguments);try{var bar=main().querySelector('.calbar');if(bar&&!$('kz64newc')){bar.classList.add('kz64-head');bar.insertAdjacentHTML('beforeend',newBtn('kz64newc'));$('kz64newc').onclick=function(){state.newPre={mode:'book'};go('new')}}}catch(e){}return r};
  var _rb=renderBookings;renderBookings=function(){var r=_rb.apply(this,arguments);try{var h=main().querySelector('h1'),row=h&&h.parentElement;
      if(row&&row.classList.contains('row')&&!$('kz64newb')){row.classList.add('kz64-head');row.insertAdjacentHTML('beforeend','<span class="sp"></span>'+newBtn('kz64newb'));$('kz64newb').onclick=function(){state.newPre={mode:'book'};go('new')}}}catch(e){}return r};
})();
/* ======================================================================================================================
   v65 (14 Oct 2026): Release 3, the seating plan first (see docs/STAFF-APP-DESIGN.md, "Release 3").
   Interface only: no server call, seating rule, capacity rule, permission, print layout or email changes. Every action
   below calls the functions that already existed (fpTap, quickHtml, openBooking, blockCtl, setView, the drag code).
   1. One compact page header on every day screen: page name, the day, previous and next, Today, Print, New booking.
   2. On the Seating plan, one control row: service (Teppanyaki or lunch and dinner), Grills or Floor plan, the sitting
      (6:00 PM or 8:00 PM, one shown at a time) and seats booked and free. It replaces the stacked bars and the Go to
      shortcuts. Switching keeps your place (scroll position and the selected grill). Printing still prints every sitting.
   3. Grill and guest connected: tap a grill (drawing or list) and it is highlighted with its guests' details and the
      grill actions that were already there (seat a waiting party, New booking at this grill, block, grill station);
      tap a guest in the list and their grill lights up in the drawing. Both directions work with the keyboard.
   4. Floor plan: each room is drawn next to its own guest list; private dining is drawn sideways under the main room,
      so it only takes the room its grills need. On phones each room is a list per grill, with the drawing on request.
   5. Side panel: collapses to an icon rail and expands again (remembered on this device); consistent states. */
(function(){
  var K={code:null,pid:null},LIVE=null,DRAWK='kz65_draw',SIDEK='kz65_side',SITK='kz65_sit';
  function reduce(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
  function onFloor(){return state.tab==='today'&&state.view==='floor'}
  function tepSide(){return (state.split||lsGet('kz_split'))!=='alc'}
  function say(t){if(!LIVE){LIVE=document.createElement('div');LIVE.className='kz65-live';LIVE.setAttribute('aria-live','polite');LIVE.setAttribute('role','status');root.appendChild(LIVE)}LIVE.textContent='';setTimeout(function(){if(LIVE)LIVE.textContent=t},30)}
  function closedSit(sess){var d=state.day||{},c=(d.closures||[]).find(function(k){return !k.session_time||k.session_time===sess});if(c)return c.reason||'Closed';
    var v=(d.venue_closures||[]).find(function(k){return k.scope==='all'&&(!k.period||k.period==='dinner')});return v?(v.reason||'Closed'):null}
  function plural(n,a,b){return n+' '+(n===1?a:b)}

  /* ---------- 1. the page header ---------- */
  function headPost(){var m=main();if(!m||state.tab!=='today')return;var bar=m.querySelector('.daybar');if(!bar)return;bar.classList.add('kz65-head');
    var nm=((window.KZ_NAV_NAME||{})[state.view])||'',pn=bar.querySelector('.kz65-pn');
    if(!pn){pn=document.createElement('span');pn.className='kz65-pn';pn.setAttribute('aria-hidden','true');bar.insertBefore(pn,bar.firstChild)}
    pn.textContent=nm;root.setAttribute('data-kz65v',state.view)}

  /* ---------- 2. the control row ---------- */
  function sitLabel(s){return s.label||tl(s.session_time)}
  function ctlPost(){var el=$('day');if(!el)return;var ctl=el.querySelector('.kz65-ctl');if(ctl&&ctl.dataset.done)return;
    var sb=el.querySelector(':scope > .sitbar'),split=el.querySelector(':scope > .splitbar'),d=state.day||{},ss=(tepSide()&&d.sessions)||[];
    if(!sb){sb=document.createElement('div');sb.className='noprint'}el.insertBefore(sb,el.firstChild);
    sb.classList.add('kz65-ctl');sb.dataset.done='1';sb.setAttribute('role','group');sb.setAttribute('aria-label','Seating plan controls');
    var jr=sb.querySelector('.jumprow');if(jr)jr.remove();var sp=sb.querySelector(':scope > .sp');if(sp)sp.remove();
    if(split){split.classList.add('kz65-seg');sb.insertBefore(split,sb.firstChild)}
    var fp=sb.querySelector('.fpseg');if(fp)fp.classList.add('kz65-seg');
    if(ss.length&&el.querySelector('section.svc.k-tep')){
      var sit=activeSit();
      var g=document.createElement('div');g.className='seg kz65-seg kz65-sits';g.setAttribute('role','group');g.setAttribute('aria-label','Sitting');
      g.innerHTML=ss.map(function(s){var on=s.session_time===sit,cl=closedSit(s.session_time);return '<button type="button" data-kz65sit="'+s.session_time+'" class="'+(on?'on':'')+'" aria-pressed="'+on+'"><span>'+esc(sitLabel(s))+'</span>'+(cl?'<small>Closed</small>':'')+'</button>'}).join('');
      sb.appendChild(g);
      var sum=document.createElement('p');sum.className='kz65-sum';sb.appendChild(sum);
      g.querySelectorAll('[data-kz65sit]').forEach(function(b){b.addEventListener('click',function(){setSit(b.dataset.kz65sit,true)})})}
    showSit()}
  function activeSit(){var d=state.day||{},ss=d.sessions||[];if(!ss.length)return null;
    var forced=state.seat&&state.seat.session||state.plan&&state.plan.session;if(forced&&ss.some(function(s){return s.session_time===forced}))return forced;
    /* the sitting chosen by hand is kept for that day on this device (one key: day and sitting) */
    var kp=(lsGet(SITK)||'').split('|'),keep=kp[0]===state.date?kp[1]:null;if(keep&&ss.some(function(s){return s.session_time===keep}))return keep;
    return state.sit&&ss.some(function(s){return s.session_time===state.sit})?state.sit:ss[0].session_time}
  function showSit(){var el=$('day');if(!el)return;var secs=el.querySelectorAll('section.svc.k-tep');if(!secs.length)return;var sit=activeSit();state.sit=sit;
    secs.forEach(function(x){x.classList.toggle('kz65-sit-off',x.id!=='sit-'+String(sit).replace(':',''))});
    el.querySelectorAll('[data-kz65sit]').forEach(function(b){var on=b.dataset.kz65sit===sit;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
    var s=sessionOf(sit),sum=el.querySelector('.kz65-sum');
    if(s&&sum){var free=Math.max(0,s.seats_total-s.seats_booked);sum.innerHTML='<b>'+s.seats_booked+'</b> of '+s.seats_total+' seats booked<span class="kz65-dot" aria-hidden="true"></span><b>'+free+'</b> free';
      sum.setAttribute('aria-label','Teppanyaki '+sitLabel(s)+': '+s.seats_booked+' of '+s.seats_total+' seats booked, '+free+' free')}
    applySel()}
  function setSit(v,user){if(state.seat||state.plan){if(user)toast('Finish or cancel the seating first, then choose another sitting.');return}
    var y=window.scrollY;state.sit=v;if(user)lsSet(SITK,state.date+'|'+v);showSit();keepY(y);
    var s=sessionOf(v);if(user&&s)say('Teppanyaki '+sitLabel(s)+' shown. '+s.seats_booked+' of '+s.seats_total+' seats booked.')}
  /* keep the user's place: the same scroll position, unless the page got shorter */
  function keepY(y){var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);window.scrollTo({top:Math.min(y,max),behavior:'instant'})}

  /* ---------- 3. grill and guest, connected ---------- */
  function secOf(sess){return document.getElementById('sit-'+String(sess).replace(':',''))}
  function partyIn(s,id){var f=null;s.tables.forEach(function(t){t.parties.forEach(function(p){if(p.id===id&&!f)f=Object.assign({session_time:s.session_time},p)})});return f}
  function statusLine(p){if(p.status==='pending'||p.status==='pending_large_group')return '<span class="pill st-request">Request, not confirmed yet</span>';
    if(p.arrived_at)return '<span class="pill st-arrived">Arrived '+esc(clock(p.arrived_at))+'</span>';return '<span class="pill kz65-due">Not arrived yet</span>'}
  function extraTags(p){var m=[];if(p.vip)m.push('<span class="tag vip">VIP</span>');if(p.diet_prefs&&p.diet_prefs.length)m.push('<span class="tag diet">'+esc(p.diet_prefs.join(', '))+'</span>');
    if(isCel(p))m.push('<span class="tag occ">'+esc(p.occasion||'Celebration')+'</span>');if(p.high_chairs)m.push('<span class="tag seatn">'+p.high_chairs+' high chair'+(p.high_chairs>1?'s':'')+'</span>');if(p.wheelchair)m.push('<span class="tag seatn">Wheelchair</span>');return m.join('')}
  function algTag(p){return hasAlg(p)?'<span class="tag allergy"><span class="kz65-al">Allergy:</span> '+esc(p.allergens.join(', '))+'</span>':''}
  function line(k,v,cls){return v?'<div class="kz65-ln'+(cls?' '+cls:'')+'"><span class="kz65-lk">'+k+'</span><span>'+v+'</span></div>':''}
  function detailHtml(s,code){var t=s.tables.find(function(x){return x.code===code});if(!t)return '';var L=layout(s,null),es=L.by[code]||[],used=L.used[code]||0,nm=t.name||tname(code),blk=blockOf(s.session_time,code);
    var uns=sitParties(s).filter(function(p){return !(p.tables&&p.tables.length)}),free=Math.max(0,t.seats-used),past=state.date<fijiToday(),cl=closedSit(s.session_time);
    var h='<div class="kz65-detail noprint" id="kz65d-'+s.session_time.replace(':','')+'-'+code+'" role="region" aria-label="'+esc(nm)+', guests and actions">';
    if(es.length)h+=es.map(function(e){var p=partyIn(s,e.p.id)||e.p,sp=L.sp[p.id],multi=sp&&Object.keys(sp).length>1,others=multi?Object.keys(sp).filter(function(c){return c!==code}):[],diet=clean(p.dietary);
      var q=quickHtml(p,false);
      return '<div class="kz65-dp'+(hasAlg(p)?' has-alg':'')+(K.pid===p.id?' kz65-pon':'')+'" data-kz65dp="'+p.id+'" data-drag="'+p.id+'|'+code+'|'+e.n+'|'+s.session_time+'"'+chipStyle(CM[p.id]||'#888')+'>'+
        '<div class="kz65-dp1"><i class="pdot" style="background:'+(CM[p.id]||'#888')+'"></i><b class="kz65-dn">'+esc(p.name)+'</b><span class="kz65-dz">'+(multi?e.n+' of '+p.size+' guests here':plural(p.size,'guest','guests'))+'</span></div>'+
        '<div class="kz65-dp2">'+statusLine(p)+algTag(p)+extraTags(p)+'</div>'+
        line('Linked',multi?esc(others.map(function(c){return tname(c)+' '+sp[c]}).join(' + ')):'')+line('Dietary',diet?esc(diet):'',hasAlg(p)?'kz65-alg':'')+line('Celebrating',isCel(p)?esc(celText(p)):'')+line('Requests',clean(p.requests)?esc(clean(p.requests)):'')+line('Team note',p.staff_notes?esc(p.staff_notes):'')+
        '<div class="bk-acts kz65-acts">'+q+'<button type="button" class="btn sm" data-kz65open="'+p.id+'">Open booking</button></div></div>'}).join('');
    else if(!blk)h+='<p class="kz65-none">No guests at '+esc(nm)+' yet. '+(free?plural(free,'seat','seats')+' free.':'')+'</p>';
    var acts='';
    if(!past&&!blk&&uns.length)acts+='<button type="button" class="btn" data-kz65act="seat">Seat a waiting party here <span class="kz65-cnt">'+uns.length+' waiting</span></button>';
    if(!past&&!blk){if(cl)h+='<p class="msg warn fp-closed">Teppanyaki '+esc(sitLabel(s))+' is closed: '+esc(cl)+'. No walk-ins or new bookings for this sitting.</p>';else if(free>0)acts+='<button type="button" class="btn" data-fpb="'+code+'|'+s.session_time+'">New booking at '+esc(nm)+'</button>'}
    acts+=blockCtl(t,s,es.length,!state.seat&&!state.plan&&!past);
    acts+='<button type="button" class="btn" data-kz65stn="'+code+'">Grill station brief</button>';
    return h+'<div class="kz65-gacts">'+acts+'</div></div>'}
  function selOn(code,pid,how){K.code=code;K.pid=pid||null;applySel(how)}
  function selOff(){K.code=null;K.pid=null;applySel()}
  function applySel(how){var el=$('day');if(!el)return;var sess=state.sit,sec=secOf(sess);
    el.querySelectorAll('.kz65-on,.kz65-pon').forEach(function(x){x.classList.remove('kz65-on','kz65-pon')});
    el.querySelectorAll('.kz65-detail').forEach(function(x){x.remove()});
    el.querySelectorAll('.kz65-gh[aria-expanded="true"]').forEach(function(x){x.setAttribute('aria-expanded','false')});
    el.querySelectorAll('g.fp-g[aria-pressed="true"]').forEach(function(x){x.setAttribute('aria-pressed','false')});
    if(!K.code||!sec||state.seat||state.plan)return;var s=sessionOf(sess);if(!s||!s.tables.some(function(t){return t.code===K.code})){K.code=null;K.pid=null;return}
    if(K.pid&&!partyIn(s,K.pid))K.pid=null;
    var g=sec.querySelector('g.fp-g[data-tcode="'+K.code+'"]'),row=sec.querySelector('.kz65-grill[data-kz65g="'+K.code+'"]'),card=sec.querySelector('.tcard[data-tcode="'+K.code+'"]');
    if(g){g.classList.add('kz65-on');g.setAttribute('aria-pressed','true');if(K.pid)g.querySelectorAll('.chg[data-id="'+K.pid+'"]').forEach(function(c){c.classList.add('kz65-pon')})}
    if(card){card.classList.add('kz65-on');if(K.pid)card.querySelectorAll('.tbk[data-party="'+K.pid+'"]').forEach(function(c){c.classList.add('kz65-pon')})}
    if(row){row.classList.add('kz65-on');var gh=row.querySelector('.kz65-gh');if(gh)gh.setAttribute('aria-expanded','true');row.insertAdjacentHTML('beforeend',detailHtml(s,K.code));bindDetail(row.querySelector('.kz65-detail'),s)}
    if(how){var t=s.tables.find(function(x){return x.code===K.code})||{},L=layout(s,null),n=(L.by[K.code]||[]).length,p=K.pid&&partyIn(s,K.pid);
      say((p?p.name+' is at ':'')+(t.name||tname(K.code))+' selected. '+(L.used[K.code]||0)+' of '+t.seats+' seats, '+plural(n,'party','parties')+'.');
      reveal(how==='guest'?g:row)}}
  function reveal(x){if(!x||!x.getBoundingClientRect)return;var r=x.getBoundingClientRect(),bar=document.querySelector('#kzs .kbot'),bot=bar&&bar.offsetHeight?bar.getBoundingClientRect().top:window.innerHeight;
    if(r.width===0)return;var sc=x.closest('.fp-scroll,.fp-pscroll');if(sc&&sc.scrollWidth>sc.clientWidth+1){var sr=sc.getBoundingClientRect();if(r.left<sr.left||r.right>sr.right)sc.scrollBy({left:(r.left+r.width/2)-(sr.left+sr.width/2),behavior:reduce()?'auto':'smooth'})}
    if(r.top<70||r.bottom>bot)x.scrollIntoView({block:'nearest',behavior:reduce()?'auto':'smooth'})}
  function bindDetail(d,s){if(!d)return;
    d.querySelectorAll('[data-qa]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();quick(b.dataset.pid,b.dataset.qa,b)})});
    d.querySelectorAll('[data-kz65open]').forEach(function(b){b.addEventListener('click',function(){openBooking(b.dataset.kz65open)})});
    d.querySelectorAll('[data-kz65stn]').forEach(function(b){b.addEventListener('click',function(){state.stnFocus=b.dataset.kz65stn;setView('stations')})});
    var st=d.querySelector('[data-kz65act="seat"]');if(st)st.addEventListener('click',function(){fpTap(K.code,s.session_time)})}

  /* the floor plan: rows of the guest list become one block per grill, matched to the drawing */
  function planPost(){var el=$('day');if(!el)return;
    el.querySelectorAll('section.svc.k-tep .fplan').forEach(function(fp){if(fp.dataset.kz65)return;fp.dataset.kz65='1';fp.classList.add('kz65-plan');var act=!fp.classList.contains('fp-act');
      fp.querySelectorAll('.fp-room').forEach(function(room){var gs=[].slice.call(room.querySelectorAll('g.fp-g')),rows=[].slice.call(room.querySelectorAll('.fp-leg > .fp-row'));
        var sc=room.querySelector('.fp-scroll,.fp-pscroll');if(sc)sc.classList.add('kz65-draw');
        var hd=room.querySelector('.fp-h');if(hd&&!hd.querySelector('.kz65-dtog')){var priv=room.classList.contains('fp-priv');hd.insertAdjacentHTML('beforeend','<button type="button" class="btn sm kz65-dtog" aria-expanded="false">Show drawing</button>');hd.querySelector('.kz65-dtog').dataset.room=priv?'priv':'main'}
        var leg=room.querySelector('.fp-leg');if(leg){leg.setAttribute('role','list');leg.setAttribute('aria-label',(room.classList.contains('fp-priv')?'Private dining':'Main room')+', guests by grill')}
        rows.forEach(function(row,i){var g=gs[i];if(!g)return;var code=g.dataset.tcode,sess=g.dataset.sess,s=sessionOf(sess);if(!s)return;var t=s.tables.find(function(x){return x.code===code})||{},nm=t.name||tname(code);
          var L=layout(s,null),used=L.used[code]||0,blk=blockOf(sess,code),stat=blk?'Blocked':used>t.seats?'Over by '+(used-t.seats):used>=t.seats?'Full':used?plural(t.seats-used,'seat','seats')+' free':'Free';
          row.classList.add('kz65-grill');row.setAttribute('role','listitem');row.dataset.kz65g=code;if(act){row.setAttribute('data-tcode',code);row.setAttribute('data-sess',sess)}
          var b=row.querySelector(':scope > b'),gh=document.createElement('button');gh.type='button';gh.className='kz65-gh';gh.setAttribute('aria-expanded','false');gh.setAttribute('aria-controls','kz65d-'+sess.replace(':','')+'-'+code);
          gh.setAttribute('aria-label',nm+', '+used+' of '+t.seats+' seats, '+stat+'. Show guests and actions.');
          if(b)gh.appendChild(b);gh.insertAdjacentHTML('beforeend','<span class="kz65-gst'+(blk?' is-blk':used>=t.seats?' is-full':'')+'">'+esc(stat)+'</span>');
          var box=document.createElement('div');box.className='kz65-guests';while(row.firstChild)box.appendChild(row.firstChild);row.appendChild(gh);row.appendChild(box);
          box.querySelectorAll('.fp-p[data-id]').forEach(function(pb){var id=pb.getAttribute('data-id'),p=partyIn(s,id);pb.setAttribute('data-kz65p',id);if(!p)return;
            var e=(L.by[code]||[]).find(function(x){return x.p.id===id})||{n:p.size};
            pb.innerHTML='<span class="kz65-pr1"><i class="pdot" style="background:'+(CM[id]||'#888')+'"></i><b>'+esc(p.name)+'</b><span class="kz65-n">'+(e.n!==p.size?e.n+' of '+p.size:p.size)+'</span></span><span class="kz65-pr2">'+statusLine(p)+algTag(p)+extraTags(p)+'</span>';
            pb.setAttribute('aria-label',p.name+', '+(e.n!==p.size?e.n+' of '+p.size:p.size)+' guests at '+nm+(hasAlg(p)?', allergy: '+p.allergens.join(', '):'')+(p.arrived_at?', arrived':', not arrived yet')+'. Show details.')});
          if(act){g.setAttribute('aria-label',nm+', '+used+' of '+t.seats+' seats taken, '+stat+'. Select to see guests and actions.');g.setAttribute('aria-pressed','false')}
          else{var fit=(g.getAttribute('class')||'').match(/\bt-(fits|part|nofit|is-on|blocked)\b/),sub=g.querySelector('.fp-sub');if(fit)row.classList.add('t-'+fit[1]);if(sub&&state.seat){var gs2=gh.querySelector('.kz65-gst');if(gs2)gs2.textContent=sub.textContent}}})})});
    drawState()}
  function drawState(){var on=lsGet(DRAWK)==='1';root.classList.toggle('kz65-draw-on',on);document.querySelectorAll('#day .kz65-dtog').forEach(function(b){b.setAttribute('aria-expanded',String(on));b.textContent=on?'Hide drawing':'Show drawing'})}
  /* bigger names in the drawing when it is drawn smaller than life size, so they stay readable */
  function svgScale(){document.querySelectorAll('#day .kz65-plan svg').forEach(function(s){var vb=s.viewBox&&s.viewBox.baseVal,w=s.getBoundingClientRect().width;if(!vb||!vb.width||!w)return;var k=Math.max(1,Math.min(2.2,vb.width/w));s.style.setProperty('--kz65-k',k.toFixed(3))})}

  /* one listener for selection, in the capture phase so it runs before the older tap handlers (which still run while
     seating a party or reviewing a plan: then a tap places the party, exactly as before) */
  function busy(){return state.seat||state.plan||(typeof DR!=='undefined'&&DR)}
  document.addEventListener('click',function(e){if(e.defaultPrevented||!onFloor())return;var t=e.target;if(!t||!t.closest)return;
    var tog=t.closest('#day .kz65-dtog');if(tog){lsSet(DRAWK,lsGet(DRAWK)==='1'?'0':'1');drawState();svgScale();return}
    var gh=t.closest('#day .kz65-gh');if(gh&&state.seat&&!state.plan){e.stopPropagation();pickTable(gh.closest('.kz65-grill').dataset.kz65g);return}
    if(busy())return;
    if(gh){e.stopPropagation();var c=gh.closest('.kz65-grill').dataset.kz65g;if(K.code===c&&!K.pid)selOff();else selOn(c,null,'grill');return}
    var pb=t.closest('#day .kz65-grill .fp-p[data-kz65p]');if(pb){e.stopPropagation();e.preventDefault();var c2=pb.closest('.kz65-grill').dataset.kz65g;selOn(c2,pb.dataset.kz65p,'guest');var dp=document.querySelector('#day .kz65-dp[data-kz65dp="'+pb.dataset.kz65p+'"] [data-kz65open]');if(dp&&e.detail===0)dp.focus({preventScroll:true});return}
    var g=t.closest('#day g.fp-g[data-tap]');if(g&&!t.closest('.chg[data-id]')){e.stopPropagation();var sess=g.dataset.sess,moved=sess!==state.sit;if(moved)setSit(sess,false);
      if(!moved&&K.code===g.dataset.tap&&!K.pid)selOff();else selOn(g.dataset.tap,null,'grill');return}
    var ch=t.closest('#day g.chg[data-id]');if(ch){var g2=ch.closest('g.fp-g');if(g2){K.code=g2.dataset.tcode;K.pid=ch.dataset.id;applySel()}return}
    var card=t.closest('#day .tcard[data-tcode]');if(card&&!t.closest('button,a,input,select,.tbk,[data-drag]')){var c3=card.dataset.tcode;if(K.code===c3)selOff();else selOn(c3,null)}},true);
  document.addEventListener('keydown',function(e){if(!onFloor())return;var t=e.target;
    if((e.key==='Enter'||e.key===' ')&&t&&t.matches&&t.matches('#day g.fp-g[data-tap]')&&!busy()){e.preventDefault();e.stopPropagation();var sess=t.dataset.sess,moved=sess!==state.sit;if(moved)setSit(sess,false);if(!moved&&K.code===t.dataset.tap&&!K.pid)selOff();else selOn(t.dataset.tap,null,'key');return}
    if(e.key==='Escape'&&K.code&&!busy()&&!document.querySelector('#dr .drawer,#sr .dsheet,#kmore,#kzw')){selOff();say('Selection cleared.')}},true);
  /* a mouse over a guest shows their grill, and the other way round */
  document.addEventListener('mouseover',function(e){if(!onFloor())return;var t=e.target;if(!t||!t.closest)return;var a=t.closest('#day .kz65-grill,#day g.fp-g');var cur=document.querySelectorAll('#day .kz65-hov');
    var code=a?(a.dataset.kz65g||a.dataset.tcode):null;cur.forEach(function(x){if(!code||(x.dataset.kz65g||x.dataset.tcode)!==code)x.classList.remove('kz65-hov')});if(!code)return;var sec=a.closest('section');if(!sec)return;
    sec.querySelectorAll('.kz65-grill[data-kz65g="'+code+'"],g.fp-g[data-tcode="'+code+'"]').forEach(function(x){x.classList.add('kz65-hov')})});
  /* dragging a party: hold it over the other sitting's button for a moment and that sitting opens, so a party can still be
     moved from 6:00 PM to 8:00 PM by dragging (the drop itself uses the existing checks) */
  var hoverT=null,hoverOn=null;
  function dragHover(x,y){if(typeof DR==='undefined'||!DR)return;var e=document.elementFromPoint(x,y),b=e&&e.closest&&e.closest('#day [data-kz65sit]');
    if(!b||b.classList.contains('on')){clearTimeout(hoverT);hoverOn=null;return}if(hoverOn===b)return;hoverOn=b;clearTimeout(hoverT);hoverT=setTimeout(function(){if(DR&&hoverOn===b){var y0=window.scrollY;state.sit=b.dataset.kz65sit;showSit();keepY(y0)}},450)}
  document.addEventListener('pointermove',function(e){dragHover(e.clientX,e.clientY)},{passive:true});
  document.addEventListener('touchmove',function(e){var t=e.touches&&e.touches[0];if(t)dragHover(t.clientX,t.clientY)},{passive:true});

  /* switching view or service keeps the user's place */
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#day [data-fp],#day .splitbar [data-split]');if(!b||b.classList.contains('on'))return;var y=window.scrollY;
    setTimeout(function(){keepY(y);svgScale()},0)},true);

  /* private dining is drawn sideways under the main room from tablets up, so it takes only the width its grills need */
  fpPrivDir=function(){return window.innerWidth>=601?'h':'v'};

  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{headPost();var dy=$('day');if(dy)dy.querySelectorAll('.splitbar,.seg.kz63-pane').forEach(function(x){x.classList.add('kz65-seg')});var on=onFloor();root.classList.toggle('kz65-floor',on);
      if(on){ctlPost();planPost();applySel();svgScale()}else{root.classList.remove('kz65-draw-on');/* v92: a room drawing shown anywhere else gets the same one-column, fit-to-width layout */if(dy&&dy.querySelector('section.svc.k-tep .fplan')){planPost();svgScale()}}}catch(e){if(window.console)console.error(e)}return r};
  var _rt=renderToday;renderToday=function(){if(state.kz65date!==state.date){K.code=null;K.pid=null;state.kz65date=state.date}var r=_rt.apply(this,arguments);try{headPost()}catch(e){}return r};
  var _sv=setView;setView=function(){var r=_sv.apply(this,arguments);try{headPost()}catch(e){}return r};
  window.addEventListener('resize',function(){clearTimeout(window.__kz65r);window.__kz65r=setTimeout(svgScale,120)});

  /* ---------- 5. the side panel: collapse to an icon rail, expand again; the choice is remembered on this device ---------- */
  var CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 7l-5 5 5 5M18 7l-5 5 5 5"/></svg>';
  var PANEL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    PANEL_CLOSE=PANEL_SVG+'<path d="M16 15l-3-3 3-3"/></svg>',PANEL_OPEN=PANEL_SVG+'<path d="M13 9l3 3-3 3"/></svg>';
  function railWanted(){if(window.matchMedia&&matchMedia('(hover:none) and (pointer:coarse) and (min-width:701px)').matches)return false;/* v91: tablets keep the menu open */var v=lsGet(SIDEK);if(v==='collapsed')return true;if(v==='expanded')return false;return window.innerWidth<1200}
  function sideState(){var side=root.querySelector('.kside');if(!side)return;var rail=railWanted();root.classList.add('kz65-side');root.classList.toggle('kz65-rail',rail);
    /* v100 (shared sidebar contract): panel icon that shows what the button will do, and "sidebar" in its name */
    var tg=side.querySelector('.kz65-stog');if(tg){tg.setAttribute('aria-expanded',String(!rail));tg.setAttribute('aria-label',rail?'Expand sidebar':'Collapse sidebar');tg.title=rail?'Expand sidebar':'Collapse sidebar';var ic=rail?PANEL_OPEN:PANEL_CLOSE;if(tg.dataset.kz100!==(rail?'o':'c')){tg.innerHTML=ic;tg.dataset.kz100=rail?'o':'c'}}
    side.querySelectorAll('.kside-i,.kside-new,.kside-search').forEach(function(b){var sp=b.querySelector('span:not(.count)'),lab=sp?sp.textContent.trim():'';if(!lab)return;if(rail){b.title=lab;b.setAttribute('aria-label',lab)}else{b.removeAttribute('title');b.removeAttribute('aria-label')}})}
  function sideBuild(){var side=root.querySelector('.kside');if(!side||side.querySelector('.kz65-stog'))return sideState();var br=side.querySelector('.kside-brand');
    if(br)br.insertAdjacentHTML('beforeend','<button type="button" class="kz65-stog" aria-controls="kz65-nav">'+CHEV+'</button>');var nv=side.querySelector('.kside-scroll');if(nv)nv.id='kz65-nav';
    var tg=side.querySelector('.kz65-stog');if(tg)tg.addEventListener('click',function(){lsSet(SIDEK,railWanted()?'expanded':'collapsed');sideState();setTimeout(svgScale,200);say(railWanted()?'Navigation collapsed.':'Navigation expanded.')});
    sideState()}
  var _sh=shell;shell=function(){var r=_sh.apply(this,arguments);try{sideBuild()}catch(e){}return r};
  window.addEventListener('resize',function(){if(lsGet(SIDEK)===null)sideState()});
})();
/* ======================================================================================================================
   v66 (15 Oct 2026): Release 4, part 3: the allergy answer everywhere a booking is shown (database change 20261015a).
   A booking whose guest was not sure ("not_sure", no allergies recorded) shows "Allergies not confirmed — check with the
   guest", in amber, until someone records Yes or No: on Arrivals, the Seating plan (list, drawing list, grill cards and
   the selected grill), Service briefing (Allergies and dietary needs), Kitchen overview (at a glance, by party, and the
   chef's list to acknowledge) and the booking panel, where it can be resolved with one tap (No allergies, or Has
   allergies, which opens the allergy list in Edit details). The booking panel also shows "No allergies reported" or
   "No allergy answer recorded" so nobody reads a blank as allergy-free. Allergies themselves are shown exactly as before.
   ====================================================================================================================== */
(function(){
  var TXT='Allergies not confirmed — check with the guest',SHORT='Allergies not confirmed';
  function st(p){if(!p)return 'not_asked';if(p.allergens&&p.allergens.length)return 'has';return p.allergy_status||'not_asked'}
  function unsure(p){return st(p)==='not_sure'}
  window.kzAlgState=st;
  var CHIP='<span class="tag unsure">'+kzIcon('alert')+SHORT+'</span>';
  /* a chip next to the other tags: after the status pills, before the first tag */
  function withChip(h){var i=h.indexOf('<span class="tag');if(i<0)i=h.indexOf('<span class="t2">');return i<0?h+CHIP:h.slice(0,i)+CHIP+h.slice(i)}
  var _tf=tagsFor;tagsFor=function(p){var h=_tf.apply(this,arguments);return unsure(p)?withChip(h):h};
  var _ct=chipTags;chipTags=function(p){var h=_ct.apply(this,arguments);return unsure(p)?withChip(h):h};
  /* Arrivals */
  var _ha=hdAlerts;hdAlerts=function(p){var a=_ha.apply(this,arguments);if(unsure(p))a.unshift(['unsure',TXT]);return a};
  /* Service briefing and Kitchen overview: the warning is listed with allergies and dietary needs (as on the run sheet email) */
  function each(d,fn){(d.sessions||[]).forEach(function(s){(s.unassigned||[]).forEach(fn);(s.tables||[]).forEach(function(t){(t.parties||[]).forEach(fn)})});(d.dining||[]).forEach(fn);(d.events||[]).forEach(fn)}
  function marked(d){if(!d)return d;var any=false;each(d,function(p){if(unsure(p))any=true});if(!any)return d;var c=JSON.parse(JSON.stringify(d)),seen={};
    each(c,function(p){if(!unsure(p))return;if(seen[p.id]===undefined)seen[p.id]=clean(p.dietary);var x=seen[p.id];p.dietary=TXT+(x?'. '+x:'')});return c}
  function strong(h){return h.split(esc(TXT)).join('<b class="kz66-uns">'+esc(TXT)+'</b>')}
  var _bh=briefHtml;briefHtml=function(d){return strong(_bh.call(this,marked(d)))};
  var _kh=kitchenHtml;kitchenHtml=function(d){var h=_kh.call(this,marked(d));if(!d)return h;
    var un=dayParties(d).filter(unsure);if(!un.length)return strong(h);
    un.forEach(function(p){h=h.split('<span class="kz63-flag">New or changed dietary need: not yet acknowledged</span><span class="kz63-ackw"><button type="button" class="link" data-id="'+p.id+'"')
      .join('<span class="kz63-flag">Allergies not confirmed: not yet acknowledged</span><span class="kz63-ackw"><button type="button" class="link" data-id="'+p.id+'"')});
    var row='<tr class="is-u"><td class="kk">'+SHORT+'</td><td class="kn">'+un.length+(un.length===1?' party':' parties')+'</td><td>'+un.map(function(p){return '<button class="link" data-id="'+p.id+'">'+esc(p.when+', '+p.where+': '+p.name+' ('+p.size+')')+'</button>'}).join('<br>')+'</td></tr>';
    if(h.indexOf('<table class="t kmx"><tbody>')>=0)h=h.replace('<table class="t kmx"><tbody>','<table class="t kmx"><tbody>'+row);
    else h=h.replace('<p class="empty">No allergies or dietary needs today.</p>','<table class="t kmx"><tbody>'+row+'</tbody></table>');
    return strong(h)};
  /* Seating plan rows built inside other blocks (the drawing list, the selected grill, Needs a grill): add the chip in place */
  function mark(root){if(!root||!root.querySelectorAll)return;
    root.querySelectorAll('.fp-p[data-id],.kz65-dp[data-kz65dp],.fpt[data-fpt],.seatbtn[data-seat]').forEach(function(el){if(el.querySelector('.tag.unsure'))return;
      var p=findParty(el.dataset.id||el.dataset.kz65dp||el.dataset.fpt||el.dataset.seat);if(!unsure(p))return;
      var at=el.querySelector('.kz65-dp2>.pill');
      if(el.classList.contains('kz65-dp')&&at)at.insertAdjacentHTML('afterend',CHIP);else{var t=el.querySelector('.bk-tags');(t||el).insertAdjacentHTML('beforeend',CHIP)}})}
  new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)mark(n.matches&&n.matches('.fp-p,.kz65-dp,.fpt,.seatbtn')?n.parentNode:n)})})}).observe(document.documentElement,{childList:true,subtree:true});
  /* the booking panel: the answer, and one tap to resolve "not sure" */
  var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{
    var body=document.querySelector('#dr .dbody'),s=st(b),live=/^(confirmed|pending|pending_large_group)$/.test(b.status);if(!body||s==='has'||$('kz66alg'))return r;
    var btn=function(v,t){return '<button type="button" class="btn sm" data-alg66="'+v+'">'+t+'</button>'};
    var h=s==='not_sure'?'<div class="kz66-algq is-warn" id="kz66alg" role="note">'+kzIcon('alert')+'<div><b>'+TXT+'</b><span>Ask the guest, then record the answer.</span>'+(live?'<div class="row">'+btn('none','No allergies')+btn('has','Has allergies')+'</div>':'')+'</div></div>'
      :s==='none'?'<div class="kz66-algq is-ok" id="kz66alg">'+kzIcon('check')+'<div><b>No allergies reported</b>'+(live?'<div class="row" hidden id="kz66algr">'+btn('not_sure','Not sure')+btn('has','Has allergies')+'</div>':'')+'</div>'+(live?'<button type="button" class="link" id="kz66algc">Change</button>':'')+'</div>'
      :'<div class="kz66-algq is-quiet" id="kz66alg">'+kzIcon('help')+'<div><b>No allergy answer recorded</b><span>Ask the guest about food allergies.</span>'+(live?'<div class="row">'+btn('none','No allergies')+btn('not_sure','Not sure')+btn('has','Has allergies')+'</div>':'')+'</div></div>';
    var old=$('kzalgnone');if(old)old.remove(); /* the v57 "None recorded" line: this box says the same, with the answer */
    var w=document.createElement('div');w.innerHTML=h;var box=w.firstChild,first=body.querySelector('.algbox,.dietbox,.infobox,.dfacts');body.insertBefore(box,first||body.firstChild);
    var c=$('kz66algc');if(c)c.onclick=function(){var rr=$('kz66algr');if(rr){rr.hidden=false;c.remove()}};
    box.querySelectorAll('[data-alg66]').forEach(function(x){x.onclick=async function(){var v=x.dataset.alg66;
      if(v==='has'){var ea=$('ea'),f=ea&&ea.closest('details');if(f)f.open=true;if(ea){try{ea.scrollIntoView({block:'center'})}catch(e){}var i=ea.querySelector('input');if(i)i.focus({preventScroll:true})}
        var m=$('esmsg');if(m)m.innerHTML='<div class="msg info">Tick the guest’s allergies, then Save details.</div>';return}
      box.querySelectorAll('button').forEach(function(y){y.disabled=true});x.textContent='Saving…';
      try{await call('staff_set_extras',{p_id:b.id,p_extras:{allergy_status:v}});openBooking(b.id,v==='none'?'Saved: no allergies reported.':'Saved: allergies not confirmed. It shows on every list until someone records the answer.');try{loadDay()}catch(e){}}
      catch(e){box.querySelectorAll('button').forEach(function(y){y.disabled=false});x.textContent=v==='none'?'No allergies':'Not sure';toast('Not saved. '+errText(e))}}})
  }catch(e){if(window.console)console.error(e)}return r};
})();
/* ======================================================================================================================
   v66 (15 Oct 2026): Release 4, part 1: the seating plan, roomier (see docs/STAFF-APP-DESIGN.md, "Release 4"). Interface
   only: no server call, seating rule, permission, print layout or email changes. The styles are the v66 block in app.css.
   1. Rooms at least 840 pixels wide: each drawing is shown centred, at one scale for both rooms (as wide as the main room
      allows, at most 1.2 times life size and about a quarter of the screen height; private dining at most 300 pixels
      high), so it is no longer a small drawing beside an empty area. Names in the drawing are at least 16 pixels and seat
      counts at least 13, whatever the scale.
   2. The grill list says "5 of 8", not "5/8". */
(function(){
  var RO=null,CAP=1.2,HMAX=300,VARS=['--kz66-w','--kz66-kn','--kz66-ks','--kz66-kc'];
  function vbw(s){var v=s.viewBox&&s.viewBox.baseVal;return v&&v.width||0}
  function inner(e){var c=getComputedStyle(e);return e.clientWidth-parseFloat(c.paddingLeft||0)-parseFloat(c.paddingRight||0)}
  function k(v){return Math.max(1,Math.min(2.4,v)).toFixed(3)}/* v92: up to 2.4 so names stay readable when the drawing sits beside the list */
  function size(){document.querySelectorAll('#day .kz65-plan').forEach(function(pl){
    var svgs=[].slice.call(pl.querySelectorAll('.kz65-draw svg')),main=pl.querySelector('.fp-room:not(.fp-priv) .kz65-draw svg')||svgs[0],room=main&&main.closest('.fp-room');
    if(pl.clientWidth<840||!main||!vbw(main)||!room||!inner(main.closest('.kz65-draw')||room)){svgs.forEach(function(s){VARS.forEach(function(v){s.style.removeProperty(v)})});return}
    /* as wide as the room allows, at most 1.2 times life size, and never more than about a quarter of the screen height,
       so on a 768-pixel-high laptop the first guests still show under the drawing on the first screen */
    /* v70 (17 Oct 2026): the guests' names now sit under the grills, so on screens up to 820 pixels high their row (about 36 pixels,
       52 on touch) comes out of the same height budget, and the first guest still shows on a 1024x768 or 1366x768 screen */
    var lbl=window.innerHeight<=820?(document.getElementById('kzs')&&document.getElementById('kzs').classList.contains('kz69-touch')?52:30):0;
    var vbh=main.viewBox.baseVal.height||0,sc0=Math.min(CAP,inner(main.closest('.kz65-draw')||room)/vbw(main),vbh?Math.max(window.innerHeight*(window.innerHeight<=820?0.22:0.26)-lbl,lbl?vbh*0.68:160)/vbh:CAP);
    /* v72 (19 Oct 2026): the L-shaped room (a single row is about a fifth as tall as it is wide; the L is over 0.3) is the main thing on this screen: it may use about
       60 per cent of the screen height and up to 1.8 times life size; the guest list follows under it */
    if(vbh&&vbh>vbw(main)*0.3)sc0=Math.min(1.8,inner(main.closest('.kz65-draw')||room)/vbw(main),Math.max(window.innerHeight*(pl.clientWidth>=1400?0.84:0.62),360)/vbh);/* v97: beside the list on wide rooms, the drawing may use most of the screen height */
    /* (never below 0.68 times life size, so seat counts stay at least 13 pixels and grill names at least 16) */
    svgs.forEach(function(s){var vw=vbw(s),vh=s.viewBox&&s.viewBox.baseVal&&s.viewBox.baseVal.height||0,r=s.closest('.fp-room');if(!vw||!r)return;var w=Math.min(inner(s.closest('.kz65-draw')||r),vw*sc0);
      /* private dining is drawn taller than it is wide: never more than 300 pixels high, so it does not outweigh the main room */
      if(s!==main&&vh&&w/vw*vh>HMAX)w=vw*HMAX/vh;var sc=w/vw;
      s.style.setProperty('--kz66-w',Math.floor(w)+'px');s.style.setProperty('--kz66-kn',k(16/(15*sc)));s.style.setProperty('--kz66-ks',k(13.25/(12*sc)));s.style.setProperty('--kz66-kc',k(10/(9*sc)))})})}
  function post(){var el=$('day');if(!el)return;
    el.querySelectorAll('.kz65-gh>b>.muted').forEach(function(m){var x=/^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(m.textContent);if(x)m.textContent=x[1]+' of '+x[2]});
    if(typeof ResizeObserver!=='undefined'){if(RO)RO.disconnect();else RO=new ResizeObserver(function(){size()});el.querySelectorAll('.kz65-plan').forEach(function(pl){RO.observe(pl)})}
    size()}
  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{post()}catch(e){if(window.console)console.error(e)}return r};
  window.kz66Size=size;
})();
/* ======================================================================================================================
   v67 (16 Oct 2026): Release 5, front of house (see docs/STAFF-APP-DESIGN.md, "Release 5"). For hosts and the floor team:
   a new host on a busy first service should know at a glance what to do next. Interface only: the same server calls,
   statuses, permissions, seating rules, allergy checks, print layout and emails. Every action below calls a function that
   already existed (window.kzWalkIn, openSearch, hdAct, hdChoose, hdAllergyCheck, the booking panel's own buttons).
   1. Arrivals is action first: four cards under the greeting. New booking (the same flow as the header button), Find a
      booking (the same search, cursor in the field), Arriving next (a live count from the Arrivals list; tap to go to it)
      and Needs your attention (a live count of the Needs your attention list; tap to open it). Loading, empty and error states; a
      count is never shown as 0 when the data did not load.
   2. Needs action is "Needs your attention": what is outstanding and one verb button per row, the same items and rules. Items a
      user cannot act on are a status ("Waiting for a manager"), not a button. Folded to one line on laptops with 3 or
      more items, as on tablets; the chips name what each item is.
   3. One navy primary button per context: on Arrivals and the Seating plan only the header's New booking is navy. Green
      stays for Arrived and Seat, red only for allergies, failures and lateness.
   4. The booking panel says the next step in one sentence, with exactly one primary button for it. Arrived but not
      seated: Seat (or Choose table when there is no grill or table yet), the same seat step and allergy check as the
      Arrivals row; Left only once seated. Order: allergy box first, then the next step and its buttons, then the rest.
   5. Guest rows: name, time and party size strongest; times in full words ("1 hour 5 minutes late"); "Over 2 hours
      late" (was "Earlier, not marked"); no grill codes on screen; "Needs a grill" in the Bookings list; Cancel (was
      Close) on step 1 of New booking.
   6. Phones and upright tablets: the Needs your attention chips wrap; Choose table is never clipped.
   7. One name for search everywhere: "Find a booking".
   ====================================================================================================================== */
(function(){
  var K={arr:null,needsAt:0,needsErr:false,dayErr:false,hx:{}};
  function plural(n,a,b){return n+' '+(n===1?a:b)}
  function reduce(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
  function onArr(){return state.tab==='today'&&state.view==='arrivals'}
  function words(m){m=Math.max(0,Math.round(m));var h=Math.floor(m/60),r=m%60,o=[];if(h)o.push(h+' hr');if(r||!h)o.push(r+' min');return o.join(' ')}
  /* on the guest rows the number stays with its word, so a narrow column breaks as "1 hour" then "5 minutes late" */
  function nb(t){return t.replace(/(\d+) (hours?|minutes?)/g,'$1\u00a0$2').replace(/^In /,'In\u00a0')}
  /* "1 h 5 min late", "In 55 min" become full words */
  function fullWords(t){return String(t||'').replace(/(\d+) h(?: (\d+) min)?/g,function(_,h,m){return words(+h*60+(+m||0))}).replace(/(\d+) min\b/g,function(_,m){return words(+m)})}
  var LIVE=null;function say(t){if(!LIVE){LIVE=document.createElement('div');LIVE.className='kz65-live';LIVE.setAttribute('aria-live','polite');LIVE.setAttribute('role','status');root.appendChild(LIVE)}LIVE.textContent='';setTimeout(function(){if(LIVE)LIVE.textContent=t},30)}

  /* ---------- data state for the cards: loaded, loading or failed (never a misleading 0) ---------- */
  var _call=call;call=function(fn){var p=_call.apply(this,arguments);
    if(fn==='staff_needs')Promise.resolve(p).then(function(){K.needsAt=Date.now();K.needsErr=false},function(){K.needsErr=true;setTimeout(paintCards,0)});
    if(fn==='staff_get_day')Promise.resolve(p).then(function(){K.dayErr=false},function(){K.dayErr=true;setTimeout(paintCards,0)});
    if(fn==='staff_list_bookings')Promise.resolve(p).then(function(r){if(Array.isArray(r))r.forEach(function(x){K.rows=K.rows||{};K.rows[x.id]=x})},function(){});
    return p};

  /* ---------- 1. the Arrivals list counts, from the same parties and the same rules as the list itself ---------- */
  function marksFor(d){var x=HD.x;if(!x||String(x.date||'').slice(0,10)!==d)return {};var m={};(x.marks||[]).forEach(function(r){m[r.id]=r});return m}
  function withM(p,m){var k=m[p.id];if(!k)return p;var o=Object.assign({},p);if(k.status)o.status=k.status;if(k.arrived_at!==undefined)o.arrived_at=k.arrived_at;o.seated_at=k.seated_at||null;o.departed_at=k.departed_at||null;return o}
  function arrCount(d){if(state.date!==fijiToday()||!d)return null;var now=nowHM(),m=marksFor(state.date);
    var ps=dayParties(d).map(function(p){return withM(p,m)}).filter(function(p){return /^(confirmed|pending|pending_large_group)$/.test(p.status)});
    var soon=ps.filter(function(p){if(p.arrived_at)return false;var df=mins(p.session_time)-mins(now);return df>-10&&df<=60});
    var here=ps.filter(function(p){return p.arrived_at&&!p.seated_at&&!p.departed_at});
    return {parties:soon.length,guests:sum(soon),here:here.length,hereG:sum(here)}}
  var _ah=arrivalsHtml;arrivalsHtml=function(d){try{K.arr=arrCount(d)}catch(e){K.arr=null}return _ah.apply(this,arguments)};

  /* ---------- 1. the four cards ---------- */
  var IC={next:kzIcon('clock'),wait:kzIcon('list'),plus:kzIcon('plus')};
  function card(k,title,sub,live,cls){return '<button type="button" class="kz67-card'+(cls?' '+cls:'')+'" data-kz67="'+k+'"><span class="kz67-ic" aria-hidden="true">'+(k==='find'?I.search:IC[k==='new'?'plus':k])+'</span>'+
    '<span class="kz67-tx"><b class="kz67-t">'+title+'</b><span class="kz67-sub">'+sub+'</span></span>'+(live?'<span class="kz67-live">'+live+'</span>':'')+'</button>'}
  function needCount(){var box=document.querySelector('#needs .needs');if(!box)return {n:0,status:0,items:0};var n=0,s=0,i=0;
    box.querySelectorAll('.need').forEach(function(r){var v=+((r.querySelector('.num')||{}).textContent||0)||0;if(r.dataset.kz67s){s+=v}else{n+=v;i++}});return {n:n,status:s,items:i}}
  window.kzNeedCount=needCount; /* v154: the Service home reads the same To do and late counts as Arrivals */
  window.kzArrLate=function(){return K.arr&&typeof K.arr.late==='number'?K.arr.late:null};
  function paintCards(){var host=$('kz67');if(!host){root.classList.remove('kz67-on');return}
    if(!onArr()||state.date!==fijiToday()){host.hidden=true;host.innerHTML='';host.dataset.sig='';root.classList.remove('kz67-on');return}
    host.hidden=false;root.classList.add('kz67-on');
    var dayBad=K.dayErr||!!document.querySelector('#kzs #day > .msg.err'),dayLoading=!state.day||!!document.querySelector('#kzs #day > .skel');
    var a=K.arr,live3,cls3='';
    if(dayBad){live3='<span class="kz67-err">We couldn’t refresh. Try again.</span>';cls3='is-err'}
    else if(dayLoading||!a){live3='<span class="kz67-wait">Loading…</span>';cls3='is-load'}
    else live3=(a.parties?'<b class="kz67-n">'+plural(a.parties,'party','parties')+'</b>, '+plural(a.guests,'guest','guests'):'<b class="kz67-n">Nobody due</b>')+(a.here?' · <b>'+a.here+' here</b>':'');
    var nc=needCount(),live4,cls4='';
    if(K.needsErr){live4='<span class="kz67-err">We couldn’t refresh. Try again.</span>';cls4='is-err'}
    else if(!K.needsAt&&state.needs==null){live4='<span class="kz67-wait">Loading…</span>';cls4='is-load'}
    else if(!nc.n){live4='<span class="kz67-ok">'+kzIcon('check')+'You’re all caught up.</span>'+(nc.status?' <span class="kz67-st">'+plural(nc.status,'change','changes')+' waiting for a manager</span>':'');cls4='is-done'}
    else live4='<b class="kz67-n">'+plural(nc.n,'thing needs you','things need you')+'</b>'+(nc.status?' · '+nc.status+' waiting for a manager':'');
    var h=card('new','New booking','A guest wants a table.','')+card('find','Find a booking','Check or change a booking.','')+
      card('next','Next hour','Who is due in the next hour.',live3,cls3)+card('wait','To do','Things to deal with today.',live4,cls4);
    var sig=h;if(host.dataset.sig===sig)return;host.dataset.sig=sig;
    /* keep keyboard focus on the same card when the counts refresh */
    var f=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#kz67 [data-kz67]'),fk=f&&f.dataset.kz67;
    host.innerHTML=h;
    host.querySelectorAll('[data-kz67]').forEach(function(b){b.addEventListener('click',function(){cardTap(b.dataset.kz67,b)})});
    if(fk){var g=host.querySelector('[data-kz67="'+fk+'"]');if(g)g.focus({preventScroll:true})}}
  function goTo(el){if(!el)return;var top=el.getBoundingClientRect().top+window.scrollY,bar=document.querySelector('#kzs .top'),off=(bar&&bar.offsetHeight&&getComputedStyle(bar).position!=='static'?bar.offsetHeight:0)+8;
    window.scrollTo({top:Math.max(0,top-off),behavior:reduce()?'auto':'smooth'});el.classList.remove('kz67-spot');void el.offsetWidth;el.classList.add('kz67-spot');setTimeout(function(){el.classList.remove('kz67-spot')},1800)}
  function cardTap(k,b){
    if(k==='new')return window.kzWalkIn({});
    if(k==='find')return openSearch();
    if(b.classList.contains('is-err')){refreshCurrent();return}
    if(k==='next'){var tp=document.querySelector('#day [data-hpane="guests"]');if(tp&&!tp.classList.contains('on'))tp.click();
      var h=document.querySelector('#day .arr-h.soon')||document.querySelector('#day .arr-h.herelist')||document.querySelector('#day .arr-h.late')||document.querySelector('#day .arr-h');
      var sec=h?h.closest('.arr-sec'):$('day');goTo(sec);if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
      say(K.arr&&K.arr.parties?plural(K.arr.parties,'party','parties')+' due in the next hour.':'Nobody is due in the next hour.');return}
    if(k==='wait'){var box=document.querySelector('#needs .needs');if(!box){say('You’re all caught up. Nothing needs you right now.');return}
      if(box.classList.contains('kz-col')){var t=box.querySelector('.kz-ntog');if(t)t.click()}
      goTo(box);var first=box.querySelector('.need .btn');if(first)first.focus({preventScroll:true});say('Needs your attention, '+plural(needCount().items,'item','items')+'.')}}
  var _rt=renderToday;renderToday=function(){var r=_rt.apply(this,arguments);try{var n=$('needs');if(n&&!$('kz67')){n.insertAdjacentHTML('beforebegin','<section id="kz67" class="kz67-cards noprint" aria-label="What would you like to do?" hidden></section>')}K.arr=null;paintCards()}catch(e){if(window.console)console.error(e)}return r};

  /* ---------- 2. Needs action becomes Needs your attention (presentation only: same items, same buttons underneath) ---------- */
  function setBtn(row,label){var b=row.querySelector('.btn');if(!b)return null;b.textContent=label;b.classList.remove('primary');return b}
  function setTxt(row,html){var s=row.children[1];if(!s)return;var tag=s.querySelector('.tag');s.innerHTML=html;if(tag){s.appendChild(document.createTextNode(' '));s.appendChild(tag)}}
  function waitingOnYou(){var el=$('needs');if(!el)return;var box=el.querySelector('.needs');if(!box)return;
    var h3=box.querySelector('h3');if(h3)h3.textContent='Needs your attention';box.setAttribute('aria-label','Needs your attention');
    box.querySelectorAll('.need').forEach(function(r){if(r.dataset.kz67)return;r.dataset.kz67='1';var k=r.dataset.k,n=+((r.querySelector('.num')||{}).textContent||0)||0;
      if(k==='grill'){setTxt(r,(n===1?'Teppanyaki party needs':'Teppanyaki parties need')+' a grill');setBtn(r,'Choose grills')}
      else if(k==='table'){setBtn(r,'Choose tables')}
      else if(k==='req'){setTxt(r,n===1?'booking request to answer':'booking requests to answer');setBtn(r,'Answer requests');if(r.querySelector('.tag'))r.classList.add('kz67-urgent')}
      else if(k==='um'){setTxt(r,n===1?'earlier booking still needs Arrived or No-show':'earlier bookings still need Arrived or No-show');setBtn(r,'Mark them')}
      else if(k==='appr'){setTxt(r,n===1?'change waiting for your approval':'changes waiting for your approval');setBtn(r,'Approve or decline')}
      else if(k==='alg'){setTxt(r,n===1?'allergy to check with the guest, today or tomorrow':'allergies to check with the guests, today or tomorrow');setBtn(r,'Check allergies')}
      else if(k==='mail'){setBtn(r,'Check emails')}
      else if(k==='sys')r.classList.add('kz67-urgent');
      else if(k==='mine'){var ap=((state.needs||{}).approvals||[]),pend=ap.filter(function(x){return x.status==='pending'}).length,dn=ap.length-pend;
        /* staff cannot approve: what is waiting is a status, not a button; answers to read keep their button */
        if(pend){var s=document.createElement('div');s.className='need kz67-status';s.dataset.k='wait';s.dataset.kz67='1';s.dataset.kz67s='1';
          /* a quiet link (not a button) still opens the request, so it can be withdrawn */
          s.innerHTML='<span class="num">'+pend+'</span><span>'+(pend===1?'change you asked for':'changes you asked for')+' <button type="button" class="link kz67-see" data-kzn="appr">See request</button></span><span class="kz67-stat">Waiting for a manager</span>';
          s.querySelector('.kz67-see').onclick=function(){window.kzOpenRequests()};r.parentNode.insertBefore(s,r)}
        if(dn){r.querySelector('.num').textContent=dn;setTxt(r,dn===1?'answer from a manager to read':'answers from a manager to read');setBtn(r,'Read answers')}else r.remove()}});
    var rows=box.querySelectorAll('.need').length;box.classList.toggle('kz67-fold',rows>=3);box.classList.add('kz67-wait')}
  /* the one-line chips (tablets, phones, and laptops with 3 or more items) say what each item is */
  var CHIP={grill:function(n){return n===1?'needs a grill':'need a grill'},table:function(n){return n===1?'needs a table':'need a table'},req:function(n){return n===1?'request':'requests'},
    um:function(n){return n===1?'earlier booking to mark':'earlier bookings to mark'},appr:function(){return 'to approve'},wait:function(){return 'waiting for a manager'},mine:function(n){return n===1?'answer to read':'answers to read'},
    alg:function(n){return n===1?'allergy to check':'allergies to check'},mail:function(n){return n===1?'email failed':'emails failed'},sys:function(){return 'system problem'}};
  function chips(){var bar=document.querySelector('#kzs #needs .kz-nsum');if(!bar)return;
    var tog=bar.querySelector('.kz-ntog b');if(tog&&tog.textContent!=='To do')tog.textContent='To do';
    bar.querySelectorAll('.kz-np[data-k]').forEach(function(x){var k=x.dataset.k,f=CHIP[k];if(!f)return;var t=x.firstChild;if(!t||t.nodeType!==3)return;var n=parseInt(t.textContent,10)||0,want=n+' '+f(n);
      if(t.textContent.trim()!==want){t.textContent=want}if(k==='wait')x.classList.add('kz67-chip-st');
      var tg=x.querySelector('.tag');if(tg&&/waiting over 24 hours/.test(tg.textContent))tg.textContent=tg.textContent.replace('waiting over 24 hours','over 24 hr')})}
  var _pn=paintNeeds;paintNeeds=function(){var r=_pn.apply(this,arguments);try{if(state.view==='arrivals')waitingOnYou();demote(document.getElementById('needs'));paintCards()}catch(e){if(window.console)console.error(e)}return r};

  /* ---------- 3. one navy primary per context on Arrivals and the Seating plan (the header's New booking) ---------- */
  function demote(el){if(!el||state.tab!=='today'||(state.view!=='arrivals'&&state.view!=='floor'))return;
    el.querySelectorAll('.btn.primary').forEach(function(b){if(b.closest('.seatbar,.alc-seatbar,.kz64-head'))return;b.classList.remove('primary');b.classList.add('kz67-was')})}

  /* ---------- 5. guest rows ---------- */
  function rows(){var el=$('day');if(!el||state.tab!=='today')return;
    if(state.view==='arrivals'){
      el.querySelectorAll('.arow .atime small').forEach(function(s){var t=nb(fullWords(s.textContent));if(t!==s.textContent)s.textContent=t});
      el.querySelectorAll('.arr-h.stale h2').forEach(function(h){h.textContent='Over 2 hr late'});
      el.querySelectorAll('.arr-h.soon .small').forEach(function(s){s.textContent=s.textContent.replace(/^(\d+) guests due$/,function(_,n){return plural(+n,'guest','guests')+' due'})})}
    demote(el)}
  var _pd=paintDay;paintDay=function(){K.arr=state.day&&state.date===fijiToday()?{parties:0,guests:0,here:0}:null;var r=_pd.apply(this,arguments);try{rows();paintCards()}catch(e){if(window.console)console.error(e)}return r};
  /* Bookings list: a Teppanyaki booking with no grill says so, instead of a blank seating cell */
  var _ll=loadList;loadList=function(){var r=_ll.apply(this,arguments);Promise.resolve(r).then(function(){try{
    document.querySelectorAll('#bl .lrow[data-id] .c-seat').forEach(function(c){if(c.textContent.trim())return;var x=(K.rows||{})[c.closest('.lrow').dataset.id];
      if(x&&(x.service||'teppanyaki')==='teppanyaki'&&!(x.tables||[]).length&&/^(confirmed|pending|pending_large_group)$/.test(x.status)){c.textContent='Needs a grill';c.classList.add('kz67-ng')}})}catch(e){}});return r};

  /* ---------- 4. the booking panel: the next step, in one sentence, with one primary button ---------- */
  function d10(d){return String(d||'').slice(0,10)}
  function markOf(b){var x=HD.x;if(x&&d10(x.date)===d10(b.date)){return (x.marks||[]).find(function(r){return r.id===b.id})||{}}return K.hx[b.id]||null}
  function codesOf(b){return b.split&&Object.keys(b.split).length?Object.keys(b.split):(b.tables||[])}
  function placeOf(b){var c=codesOf(b);if(!c.length)return '';var tep=(b.service||'teppanyaki')==='teppanyaki';return tep?(b.split&&Object.keys(b.split).length>1?splitText(b.split):tnames(c)):(alcNames(c)||'')}
  /* the latest day and host marks first (as the choose step does), so the seat step never works from an older copy */
  async function todayParty(id,date){state.date=date;await hdFetch();return hdFind(id)}
  function mkBtn(id,label){var b=document.createElement('button');b.type='button';b.className='btn';b.id=id;b.textContent=label;return b}
  function nextStep(b){var st=b.status,dd=d10(b.date),t=fijiToday(),tep=(b.service||'teppanyaki')==='teppanyaki',ev=b.service==='event',has=codesOf(b).length>0,mk=markOf(b);
    if(st==='pending'||st==='pending_large_group')return {line:'The guest is waiting for our answer.',act:'confirm'};
    if(st==='completed'||(mk&&mk.departed_at))return {line:'They have left. This visit is finished.'};
    if(st==='no_show')return {line:'Marked as a no-show. They did not come.'};
    if(st==='cancelled')return {line:'This booking was cancelled.'};
    if(st==='declined')return {line:'This request was declined.'};
    if(st!=='confirmed')return null;
    if(b.arrived_at){
      if(dd!==t)return {line:'They arrived. When they leave, tap Left.',act:'left'};
      if(!mk)return {line:'',wait:true};
      if(mk.seated_at)return {line:'When they leave, tap Left.',act:'left'};
      if(!has&&!ev)return {line:tep?'No grill yet. Choose one.':'No table yet. Choose one.',act:'choose'};
      return {line:'Take them to '+(placeOf(b)||'their table')+', then tap Seat.',act:'seat'}}
    if(dd===t){var df=mins(b.session_time)-mins(nowHM());
      if(df<=-120)return {line:'Did they come? If not, mark no-show.',act:'no_show'};
      if(df<-KZHOLD)return {line:'Over '+KZHOLD+' min late. Release the table?',act:'no_show'}; /* v149: house rule */
      if(df<=-10)return {line:'Running '+words(-df)+' late. Here now?',act:'arrived'};
      if(tep&&!has&&!ev)return {line:'No grill yet. Choose one.',act:'grill'};
      return {line:'Guest is here? Mark arrived.',act:'arrived'}}
    if(dd<t)return {line:'Did they come? If not, mark no-show.',act:'no_show'};
    if(tep&&!has&&!ev)return {line:'No grill yet. Choose one.',act:'grill'};
    return {line:'Confirmed. Mark them arrived when they come in on the day.'}}
  function panel(b){var body=document.querySelector('#dr .dbody');if(!body||!b||$('kz67next'))return;
    var ns=nextStep(b);if(!ns)return;
    if(ns.wait){/* not yet known whether they are seated: ask the server once (a read), then show the step */
      if(K.hx[b.id]===undefined){K.hx[b.id]=false;Promise.resolve().then(function(){return sb.rpc('staff_host_extras',{p_date:d10(b.date)})}).then(function(rr){if(!rr||rr.error)throw new Error('x');var x=rr.data;var m=((x&&x.marks)||[]).find(function(r){return r.id===b.id})||{};K.hx[b.id]=m;if(!HD.x)HD.x=x;
        if(state.openId===b.id&&drawerOpen())openBooking(b.id)},function(){K.hx[b.id]={}})}
      return}
    var acts=body.querySelector('.bigacts:not(.kz63-rest)'),rest=body.querySelector('.kz63-rest');
    if(!acts&&ns.act){acts=document.createElement('div');acts.className='bigacts'}
    var prim=null;
    if(ns.act==='seat'||ns.act==='choose'){
      var lf=acts.querySelector('[data-kz63="left"]');if(lf)lf.remove(); /* Left only once seated */
      prim=mkBtn(ns.act==='seat'?'kz67seat':'kz67choose',ns.act==='seat'?'Seat':'Choose table');acts.insertBefore(prim,acts.firstChild);
      prim.onclick=function(){panelSeat(b,prim,ns.act)}}
    else if(ns.act==='grill'){var em=$('em');if(em){prim=mkBtn('kz67grill','Choose table');acts.insertBefore(prim,acts.firstChild);prim.onclick=function(){em.click()}}}
    else if(ns.act==='left')prim=acts&&acts.querySelector('[data-kz63="left"]');
    else if(ns.act)prim=acts&&acts.querySelector('[data-act="'+ns.act+'"]');
    /* exactly one primary: the next step's button. Arrived and Seat stay green, the rest navy; everything else plain
       (a destructive button keeps its red outline) */
    [acts,rest].forEach(function(a){if(a)a.querySelectorAll('.btn').forEach(function(x){if(x!==prim)x.classList.remove('primary','go')})});
    if(prim){prim.classList.remove('primary','go');prim.classList.add(/^(arrived|seat)$/.test(ns.act)?'go':'primary');prim.dataset.kz67p='1';if(prim.parentNode&&prim.parentNode.firstChild!==prim)prim.parentNode.insertBefore(prim,prim.parentNode.firstChild)}
    var nx=document.createElement('div');nx.className='kz67-next';nx.id='kz67next';nx.innerHTML='<p class="kz67-line" role="status">'+esc(ns.line)+'</p>';
    /* order: the allergy answer first, then the next step and its buttons, then celebration and the key facts */
    var algs=[].slice.call(body.children).filter(function(c){return c.matches('#kz66alg,.algbox,.dietbox')}),after=algs[algs.length-1],ask=$('ask');
    var first=body.querySelector(':scope > .infobox, :scope > .dfacts');
    /* v83 (21 Oct 2026, Roneel): the next step and its buttons come first, the allergy answer straight under them
       (Seat still runs the allergy check first, as before) */
    if(algs.length)body.insertBefore(nx,algs[0]);else if(first)body.insertBefore(nx,first);else body.insertBefore(nx,body.firstChild);
    var at=nx;if(acts){at.insertAdjacentElement('afterend',acts);at=acts}
    algs.forEach(function(x){at.insertAdjacentElement('afterend',x);at=x});
    if(rest){at.insertAdjacentElement('afterend',rest);at=rest}if(ask)at.insertAdjacentElement('afterend',ask)}
  async function panelSeat(b,btn,a){var id=b.id,dd=d10(b.date);btn.disabled=true;var p=null;try{p=await todayParty(id,dd)}catch(e){toast(errText(e))}btn.disabled=false;if(!p){openBooking(id);return}
    if(a==='choose')return hdChoose({p:p,after:function(){openBooking(id)}});
    /* the same allergy check as the Arrivals row, before anyone is seated */
    var al=(p.allergens&&p.allergens.length)||(p.dietary&&!/^none$/i.test(p.dietary));
    if(al&&!btn.dataset.ok)return hdAllergyCheck(p,function(){btn.dataset.ok='1';panelSeat(b,btn,a)});
    await hdAct(id,'seat',btn);var m=(HD.x&&(HD.x.marks||[]).find(function(r){return r.id===id}))||{};
    openBooking(id,m.seated_at?'Seated at '+(placeOf(b)||'their table')+'.':undefined)}
  var _cd=closeDrawer;closeDrawer=function(){K.hx={};return _cd.apply(this,arguments)};
  var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{panel(b)}catch(e){if(window.console)console.error(e)}return r};

  /* ---------- 7. one name for search, and the other small words, wherever they are drawn ---------- */
  var FIND='Find a booking';
  function relabel(){
    var s=document.querySelector('#kzs .kside-search span');if(s&&s.textContent!==FIND){s.textContent=FIND;var p=s.parentNode;if(p&&p.hasAttribute('aria-label'))p.setAttribute('aria-label',FIND);if(p&&p.title)p.title=FIND}
    var hs=$('hs');if(hs&&hs.getAttribute('aria-label')!==FIND){hs.setAttribute('aria-label',FIND);hs.title=FIND+' ( / )';var hl=hs.querySelector('.hl');if(hl)hl.textContent='Find'}
    document.querySelectorAll('#kzs .kmore-i[data-act="search"] span').forEach(function(x){if(x.textContent!==FIND)x.textContent=FIND});
    var f=document.querySelector('#kz63find span');if(f&&f.textContent!==FIND)f.textContent=FIND;
    var sb=document.querySelector('#sr .sbox');if(sb&&sb.getAttribute('aria-label')!==FIND){sb.setAttribute('aria-label',FIND);var q=$('sq');if(q)q.setAttribute('aria-label',FIND)}
    document.querySelectorAll('#sr .hd-howl b, #sr .hd-howl span').forEach(function(x){if(/Find a guest/.test(x.textContent))x.textContent=x.textContent.replace(/Find a guest/g,FIND)});
    var tst=document.querySelector('#kzs .toast span');if(tst&&/Find a guest/.test(tst.textContent))tst.textContent=tst.textContent.replace(/Find a guest/g,FIND);
    var kb=$('kzwb');if(kb&&kb.textContent==='Close'){kb.textContent='Cancel'}
    chips()}
  new MutationObserver(function(){try{relabel()}catch(e){}}).observe(document.documentElement,{childList:true,subtree:true,characterData:false});

  /* ====================================================================================================================
     v67 (16 Oct 2026): Release 5, front of house visual pass (see docs/STAFF-APP-DESIGN.md, "Front of house visual
     pass"). Visual and layout only: the same statuses, server calls, permissions, flows, print layout and emails.
     1. Guests first. Phones and upright tablets (up to 860 pixels, where the bottom bar shows): the four cards are one
        row of four tap tiles with a live count badge; the folded Needs your attention box is not repeated under them (the
        tile opens it). The closure notice on Arrivals is one line that opens to the details and Manage closures. On
        laptops and tablets held sideways the counts strip (still to come, here, late, next arrival) is part of the
        Arriving next card; phones and upright tablets keep the compact "Next 8:00 PM" line.
     2. No duplicates. While the cards are shown, the Guests and Tables bar has no Find a booking button (the card, the
        side panel, the top bar and the "/" key remain).
     3. Glanceable cards: the live count is the largest text, on the right; Needs your attention is neutral at 0 and amber
        only when something is waiting.
     4. Guest rows: time and name first, then one status line (the status pill, with lateness in full words, and where
        they sit), then the tags. The Late heading is a red left edge and the word Late in red, not a pink band.
     5. Equal row buttons (styles only).
     6. One status pill (stOf, pillHtml) on Arrivals rows, the Seating plan and the booking panel header: Request,
        Due, Late, Here, Seated, Left, No-show, Cancelled, Declined; the word is always shown.
     ==================================================================================================================== */
  var VP={cl:{}};
  /* ---------- 6. one status, one pill (presentation only: mapped from the statuses and host marks that exist) ---------- */
  function stOf(p,date){var d=d10(date||p.date||state.date),t=fijiToday(),st=p.status;
    function S(k,w,x){return {k:k,w:w,t:x||w}}
    if(st==='pending'||st==='pending_large_group')return S('request','Request');
    if(st==='cancelled')return S('cancelled','Cancelled');
    if(st==='declined')return S('declined','Declined');
    if(st==='no_show')return S('noshow','No-show');
    if(st==='completed'||p.departed_at)return S('left','Left',p.departed_at?'Left at '+clock(p.departed_at):'Left');
    if(p.seated_at)return S('seated','Seated','Seated since '+clock(p.seated_at));
    if(p.arrived_at)return S('here','Here','Arrived '+clock(p.arrived_at));
    if(d<t)return S('check','Arrival not recorded');
    if(d>t||!p.session_time)return S('due','Due',p.session_time?'Due '+tl(p.session_time):'Due');
    var df=mins(p.session_time)-mins(nowHM());
    if(df<=-120)return S('late','Late','Over 2 hr late');
    if(df<=-10)return S('late','Late',words(-df)+' late');
    return S('due','Due',df>0?'In '+words(df):'Due now')}
  function pillHtml(s){return '<span class="pill kz67-pill kz67-ps-'+s.k+'" data-st="'+s.k+'">'+esc(s.t)+'</span>'}
  function live(id){var p=findParty(id);return p?withM(p,marksFor(state.date)):null}
  window.kz67Status=function(p,d){return stOf(p,d)};

  /* ---------- 1 and 3. the cards: counts strip merged into Arriving next; tiles on phones and upright tablets ---------- */
  var _ac=arrCount;arrCount=function(d){var r=_ac.apply(this,arguments);if(!r)return r;
    var m=marksFor(state.date),now=nowHM(),ps=dayParties(d).map(function(p){return withM(p,m)}).filter(function(p){return /^(confirmed|pending|pending_large_group)$/.test(p.status)});
    var wait=ps.filter(function(p){return !p.arrived_at}).sort(function(a,b){return a.session_time<b.session_time?-1:a.session_time>b.session_time?1:0});
    var late=wait.filter(function(p){var df=mins(p.session_time)-mins(now);return df<=-10&&df>-120}),nx=wait.filter(function(p){return mins(p.session_time)-mins(now)>-10})[0];
    r.toCome=sum(wait);r.hereAll=sum(ps.filter(function(p){return p.arrived_at&&!p.departed_at}));r.late=late.length;r.next=nx?tl(nx.session_time):'';return r};
  var CI={new:kzIcon('plus'),find:I.search,next:kzIcon('clock'),wait:kzIcon('list')};
  function cnt(n,unit){return '<span class="kz67-cnt"><b class="kz67-num">'+n+'</b> <span class="kz67-unit">'+unit+'</span></span>'}
  function card2(k,title,sub,o){o=o||{};
    return '<button type="button" class="kz67-card'+(o.cls?' '+o.cls:'')+'" data-kz67="'+k+'" aria-label="'+esc(o.aria||title)+'"><span class="kz67-ic" aria-hidden="true">'+CI[k]+
      (o.badge?'<span class="kz67-badge'+(o.bcls?' '+o.bcls:'')+'">'+o.badge+'</span>':'')+'</span><span class="kz67-tx"><b class="kz67-t">'+title+'</b><span class="kz67-sub">'+sub+'</span></span>'+
      (o.live?'<span class="kz67-live">'+o.live+'</span>':'')+(o.stats?'<span class="kz67-stats">'+o.stats+'</span>':'')+'</button>'}
  paintCards=function(){var host=$('kz67');if(!host){root.classList.remove('kz67-on');return}
    if(!onArr()||state.date!==fijiToday()){host.hidden=true;host.innerHTML='';host.dataset.sig='';root.classList.remove('kz67-on');return}
    host.hidden=false;root.classList.add('kz67-on');
    var dayBad=K.dayErr||!!document.querySelector('#kzs #day > .msg.err'),dayLoading=!state.day||!!document.querySelector('#kzs #day > .skel'),ERR='We couldn’t refresh. Try again.';
    var a=K.arr,o3={sub:'Who is due in the next hour.'};
    if(dayBad){o3.live='<span class="kz67-err">'+ERR+'</span>';o3.cls='is-err';o3.badge='!';o3.bcls='is-err';o3.aria='Arriving next. '+ERR}
    else if(dayLoading||!a){o3.live='<span class="kz67-wait">Loading…</span>';o3.cls='is-load';o3.aria='Arriving next. Loading.'}
    else{var gs=plural(a.guests,'guest','guests');
      o3.live=a.parties?cnt(a.parties,(a.parties===1?'party, ':'parties, ')+gs):'<span class="kz67-none">Nobody due</span>';
      if(a.parties){o3.badge=a.parties;o3.bcls='is-n'}
      var st=[plural(a.toCome||0,'guest','guests')+' to come',(a.hereAll||0)+' here',a.late?'<b class="kz67-late">'+plural(a.late,'party','parties')+' late</b>':'Nobody late'];if(a.next)st.push('Next '+a.next);
      o3.stats=st.map(function(x){return '<span class="kz67-si">'+x+'</span>'}).join('<span class="kz67-dot" aria-hidden="true"> · </span>');
      o3.aria='Arriving next. '+(a.parties?plural(a.parties,'party','parties')+', '+gs+' in the next hour.':'Nobody due in the next hour.')+' '+st.join(', ').replace(/<[^>]+>/g,'')+'.'}
    var nc=needCount(),o4={sub:'Things to deal with today.'},mgr=nc.status?nc.status+' waiting for a manager':'';
    if(K.needsErr){o4.live='<span class="kz67-err">'+ERR+'</span>';o4.cls='is-err';o4.badge='!';o4.bcls='is-err';o4.aria='Needs your attention. '+ERR}
    else if(!K.needsAt&&state.needs==null){o4.live='<span class="kz67-wait">Loading…</span>';o4.cls='is-load';o4.aria='Needs your attention. Loading.'}
    else if(!nc.n){o4.sub='Nothing waiting.'+(mgr?' <span class="kz67-st">'+mgr+'</span>':'');o4.live='<span class="kz67-ok">'+kzIcon('check')+'You’re all caught up.</span>';o4.cls='is-done';o4.aria='Needs your attention. You’re all caught up.'+(mgr?' '+mgr+'.':'')}
    else{o4.live=cnt(nc.n,nc.n===1?'thing needs you':'things need you');o4.cls='is-wait';o4.badge=nc.n;o4.bcls='is-amber';if(mgr)o4.sub+=' <span class="kz67-st">'+mgr+'</span>';
      o4.aria='Needs your attention. '+plural(nc.n,'thing needs you','things need you')+'.'+(mgr?' '+mgr+'.':'')}
    var h=card2('new','New booking','A guest wants a table.')+card2('find','Find a booking','Check or change a booking.')+card2('next','Next hour',o3.sub,o3)+card2('wait','To do',o4.sub,o4);
    var sig=h;if(host.dataset.sig===sig)return;host.dataset.sig=sig;
    var f=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#kz67 [data-kz67]'),fk=f&&f.dataset.kz67;
    host.innerHTML=h;
    host.querySelectorAll('[data-kz67]').forEach(function(b){b.addEventListener('click',function(){cardTap(b.dataset.kz67,b)})});
    if(fk){var g=host.querySelector('[data-kz67="'+fk+'"]');if(g)g.focus({preventScroll:true})}};

  /* ---------- 1. the closure notice on Arrivals: one line that opens ---------- */
  function closuresLine(){var el=$('day'),c=el&&el.querySelector(':scope > .closed');if(!c||state.view!=='arrivals'||c.dataset.kz67)return;
    var d=state.day||{},n=(d.closures||[]).length+(d.venue_closures||[]).length;if(!n)return;c.dataset.kz67='1';
    var key=state.date,open=!!VP.cl[key];
    var det=document.createElement('div');det.className='kz67-cld';det.id='kz67-cld';det.hidden=!open;
    while(c.firstChild)det.appendChild(c.firstChild);var b0=det.firstChild;if(b0&&b0.nodeName==='B'&&/^Closed\.?$/.test(b0.textContent.trim())){b0.remove();if(det.firstChild&&det.firstChild.nodeType===3)det.firstChild.textContent=det.firstChild.textContent.replace(/^\s+/,'')}
    var b=document.createElement('button');b.type='button';b.className='kz67-clt';b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-controls','kz67-cld');
    b.innerHTML='<b>Closed</b> <span>'+n+(state.date===fijiToday()?' today':' this day')+'</span><i aria-hidden="true"></i>';b.title=plural(n,'closure','closures')+(state.date===fijiToday()?' today':' on this day');
    b.addEventListener('click',function(){var o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(o));det.hidden=!o;VP.cl[key]=o});
    c.classList.add('kz67-clf');c.appendChild(b);c.appendChild(det);
    /* it sits in the Guests and Tables bar: on its own line on phones and upright tablets, beside Guests and Tables on
       wider screens; the details open on a line of their own under the bar */
    var bar=el.querySelector('.kz63-hbar'),seg=bar&&bar.querySelector('.kz63-pane');if(seg)seg.insertAdjacentElement('afterend',c)}

  /* ---------- 4 and 6. guest rows: one status line under the time and name ---------- */
  function rowsVP(){var el=$('day');if(!el||state.tab!=='today'||state.view!=='arrivals')return;
    el.querySelectorAll('.arow').forEach(function(r){var m=r.querySelector('.amain'),tm=m&&m.querySelector('.atime');if(!tm||m.querySelector('.kz67-stl'))return;
      var id=m.dataset.id,p=id&&live(id),sm=tm.querySelector('small'),line=document.createElement('span');line.className='kz67-stl';
      if(p){line.innerHTML=pillHtml(stOf(p,state.date));if(sm)sm.remove();var rq=m.querySelector('.bk-tags .pill.st-request');if(rq)rq.remove()}
      else if(sm){var s=document.createElement('span');s.className='kz67-stx';s.textContent=sm.textContent;line.appendChild(s);sm.remove()}
      var wh=m.querySelector('.awhere');if(wh)line.appendChild(wh);
      tm.insertAdjacentElement('afterend',line);r.classList.add('kz67-row')})}
  /* ---------- 6. the Seating plan: the same pill wherever an arrival status is shown ---------- */
  function floorPills(){if(state.tab!=='today'||state.view!=='floor')return;var el=$('day');if(!el)return;
    el.querySelectorAll('.pill.st-arrived:not(.kz67-pill),.pill.st-request:not(.kz67-pill),.pill.kz65-due:not(.kz67-pill)').forEach(function(x){
      var h=x.closest('[data-id],[data-seat],[data-kz65dp],[data-fpt]'),id=h&&(h.dataset.id||h.dataset.seat||h.dataset.kz65dp||h.dataset.fpt),p=id&&live(id);if(!p)return;
      x.insertAdjacentHTML('afterend',pillHtml(stOf(p,state.date)));x.remove()})}
  var vpQ=false;new MutationObserver(function(){if(vpQ)return;vpQ=true;Promise.resolve().then(function(){vpQ=false;try{floorPills()}catch(e){}})}).observe(document.documentElement,{childList:true,subtree:true});
  /* ---------- 6. the booking panel header: the same pill, with the host marks (here, seated, left) ---------- */
  function panelPill(b){var pl=document.querySelector('#dr .dhead .pill');if(!pl||!b||pl.classList.contains('kz67-pill'))return;
    var mk=b.status==='confirmed'&&markOf(b),p=Object.assign({},b);if(mk){ /* the booking's own final status (left, cancelled) always wins over an older host mark */if(mk.status)p.status=mk.status;if(mk.arrived_at!==undefined)p.arrived_at=mk.arrived_at;p.seated_at=mk.seated_at||null;p.departed_at=mk.departed_at||null}
    pl.insertAdjacentHTML('afterend',pillHtml(stOf(p,b.date)));pl.remove()}
  var _dwV=drawer;drawer=function(b){var r=_dwV.apply(this,arguments);try{panelPill(b)}catch(e){if(window.console)console.error(e)}return r};

  /* ---------- 2. no duplicate Find a booking in the Guests and Tables bar while the cards are shown ---------- */
  function noDup(){if(!onArr()||state.date!==fijiToday())return;var f=document.querySelector('#day .kz63-hbar #kz63find');if(f)f.remove()}
  var _pdV=paintDay;paintDay=function(){var r=_pdV.apply(this,arguments);try{noDup();closuresLine();rowsVP();floorPills()}catch(e){if(window.console)console.error(e)}return r};
})();
/* ====================================================================================================================
   v68 (16 Oct 2026): three service safety fixes (see docs/STAFF-APP-DESIGN.md, "v68: three service safety fixes").
   Interface only: the same server calls, statuses, permissions, emails, print layout, backup and guest form.
   1. No-show asks first. Every No-show (Arrivals row, booking panel, Seating plan) opens the same confirmation sheet
      as the More sheet (hdSheet): "Mark Gupta (4) as a no-show?" with "Yes, mark no-show" (red) and "Cancel" (focused).
      Nothing is saved until Yes. The Undo toast afterwards is unchanged. Arrived stays one tap.
   2. No double tap onto the next guest. While a row save is in flight, taps on rows and row buttons are ignored, and
      for 600 milliseconds after the save and its redraw. For 1.8 seconds after that, a tap on the spot that was tapped
      (the row button, or the sheet's Yes button) is ignored, so it cannot act on, or open, the row that slid there. A
      refused save moved nothing, so it starts neither window. One save per booking at a time; the button reads
      "Saving…" until the server answers; success only after it.
   3. Screens open at the top. Switching screen (setView) scrolls to the top, instantly, before the new screen is
      drawn. Back, a refresh of the same screen, closing a panel and the Seating plan's kept scroll are unchanged.
   ==================================================================================================================== */
(function(){
  /* a monotonic clock (Date can be set back or frozen) */
  function tnow(){try{return performance.now()}catch(e){return Date.now()}}
  var G={busy:{},n:0,until:0,spots:[],top:0},ROW='#day [data-qa],#day [data-ha],#day .arow .amain,[data-hact]';
  function rectOf(e){if(!e||!e.getBoundingClientRect||!e.isConnected)return null;var r=e.getBoundingClientRect();return r.width?{l:r.left,t:r.top,r:r.right,b:r.bottom,until:Infinity}:null}
  /* the spot guard is for the other guests' rows: the guest just acted on may still take their own next step there */
  function inSpot(x,y,id){var now=tnow(),pad=12;return G.spots.some(function(s){return now<s.until&&s.id!==id&&x>=s.l-pad&&x<=s.r+pad&&y>=s.t-pad&&y<=s.b+pad})}
  function begin(id,a,rects){G.busy[id]=a;G.n++;(rects||[]).forEach(function(r){if(r){r.id=id;G.spots.push(r)}})}
  /* after a save the list has moved: start the windows. After a refused save nothing moved, so the next tap is not held. */
  function settle(id,ok){delete G.busy[id];G.n=Math.max(0,G.n-1);var now=tnow();unbusy(id);
    if(ok)G.until=Math.max(G.until,now+600);
    G.spots.forEach(function(s){if(s.until===Infinity)s.until=ok?now+1800:0});G.spots=G.spots.filter(function(s){return s.until>now})}
  /* ---------- 2. the guard: runs before every row button's own handler ---------- */
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest(ROW);if(!b)return;var id=b.dataset.pid||b.dataset.id||'';
    if(G.busy[id]||G.n>0||tnow()<G.until||(e.detail>0&&inSpot(e.clientX,e.clientY,id))){e.preventDefault();e.stopImmediatePropagation()}},true);
  function busyBtn(b){if(!b)return;if(b.dataset.kz68lab==null)b.dataset.kz68lab=b.textContent;b.disabled=true;b.textContent='Saving…';b.setAttribute('aria-busy','true')}
  function unbusy(id){document.querySelectorAll('[data-kz68lab][data-pid="'+id+'"]').forEach(function(b){b.textContent=b.dataset.kz68lab;b.disabled=false;b.removeAttribute('aria-busy');delete b.dataset.kz68lab})}
  /* a redraw while a save is in flight keeps that booking's button busy (the save's own redraws finish before settle()) */
  var _pd8=paintDay;paintDay=function(){if(G.top){G.top=0;toTop()}var r=_pd8.apply(this,arguments);
    try{Object.keys(G.busy).forEach(function(id){document.querySelectorAll('#day [data-pid="'+id+'"][data-qa],#day [data-pid="'+id+'"][data-ha]').forEach(function(b){
        if(b.dataset.qa===G.busy[id]||b.dataset.ha===G.busy[id])busyBtn(b)})})}catch(e){if(window.console)console.error(e)}return r};
  /* ---------- 1. the confirmation (the More sheet's component and words) ---------- */
  function nsAsk(p,go){var nm=(p&&p.name)||'This guest',sz=p&&p.size?' ('+p.size+')':'';
    var sr=hdSheet('Mark '+esc(nm)+esc(sz)+' as a no-show?','Only when they have not come and have not called. You can undo it straight after.','','<button class="btn solid kz135-ink" id="kz68nsy">Yes, mark no-show</button><button class="btn" id="kz68nsn">Cancel</button>');
    if(!sr)return;var sh=sr.querySelector('.dsheet'),sc=sr.querySelector('.scrim');if(sh)sh.classList.add('kz68-ns');if(sc)sc.classList.add('kz68-scrim');
    var y=$('kz68nsy'),n=$('kz68nsn');n.focus({preventScroll:true});
    n.onclick=function(){var x=$('hdsx');if(x)x.click();else closeSearch()};
    y.onclick=function(){if(y.disabled)return;y.disabled=true;var ry=rectOf(y);closeSearch();go(ry)}}
  async function save(id,a,btn,p,rects){if(G.busy[id])return;begin(id,a,rects);busyBtn(btn);var ok=false;
    try{await call('staff_action2',{p_id:id,p_action:a,p_reason:null,p_notify:false});ok=true;
      toast(p.name+(a==='arrived'?' arrived.':' marked as a no-show. Table released.'),function(){undoAct(id,UNDO[a],p.name)});await loadDay();loadNeeds()}
    catch(e){if(!ok)toast(errText(e))}
    finally{settle(id,ok)}}
  /* rows on Arrivals and the Seating plan (the same quick() as before, with the guard, the busy label and the question) */
  quick=async function(id,a,btn){var p=findParty(id)||{name:'This party'};
    if(a==='move')return startSeat(id);
    if(G.busy[id])return;
    if(a==='no_show'&&btn&&btn.classList&&btn.classList.contains('kz149-rel'))return save(id,a,btn,p,[rectOf(btn)]); /* v149: one tap, undo on the toast */
    if(a==='no_show'){var r0=rectOf(btn);return nsAsk(p,function(ry){var b2=btn&&btn.isConnected?btn:document.querySelector('#day [data-qa="no_show"][data-pid="'+id+'"]');return save(id,a,b2,p,[r0,ry])})}
    return save(id,a,btn,p,[rectOf(btn)])};
  /* Seat and Left on Arrivals rows (and the Host Desk's own buttons): one save per booking, the same guard */
  var _ha8=hdAct;hdAct=async function(id,a,btn){var p=hdFind(id);
    var saves=!!(p&&btn&&/^(arrive|seat|depart)$/.test(a))&&!(a==='seat'&&((p.allergens&&p.allergens.length)||(p.dietary&&!/^none$/i.test(p.dietary)))&&!btn.dataset.ok);
    if(!saves)return _ha8.apply(this,arguments);
    if(G.busy[id])return;begin(id,a,[rectOf(btn)]);try{return await _ha8.apply(this,arguments)}finally{settle(id,true)}}; /* it redraws the list either way */
  /* the booking panel's No-show (also when it is the panel's next step) */
  var _act8=act;act=function(b,a){if(a==='no_show'){var self=this;return nsAsk(b,function(){_act8.call(self,b,a)})}return _act8.apply(this,arguments)};
  /* ---------- 3. a new screen opens at the top ---------- */
  function toTop(){try{window.scrollTo({top:0,left:0,behavior:'instant'})}catch(e){window.scrollTo(0,0)}var m=main();if(m&&m.scrollTop)m.scrollTop=0}
  var _sv8=setView;setView=function(v,nopush){G.top=!nopush&&state.tab==='today'&&v!==state.view?1:0;try{return _sv8.apply(this,arguments)}finally{if(G.top){G.top=0;toTop()}}};
})();
/* ======================================================================================================================
   v69 (16 Oct 2026): iPad touch pass (see docs/STAFF-APP-DESIGN.md, "v69: iPad touch pass"). Interface only: no server
   call, status, permission, seating rule, print layout, email or backup changes. 1. Touch density by input type: #kzs
   gets the class kz69-touch when the main pointer is a finger (an iPad), or on a touchscreen laptop once it is touched;
   a mouse click takes it back to the laptop look. The switch happens after the tap or click has finished, so nothing
   moves under the finger. 2. The date picker is widened on touch so its days can be 44 pixels. 3. The Seating plan
   drawing's chairs get an invisible tap circle of at least 44 pixels at the scale the drawing is shown at.
   ====================================================================================================================== */
(function(){
  var MQ=window.matchMedia?window.matchMedia('(pointer:coarse)'):null,ANY=window.matchMedia?window.matchMedia('(any-pointer:coarse)'):null,hyb=false;
  function on(){return root.classList.contains('kz69-touch')}
  function apply(){var t=!!((MQ&&MQ.matches)||hyb);if(t!==on()){root.classList.toggle('kz69-touch',t);setTimeout(chairs,0)}}
  apply();try{if(MQ&&MQ.addEventListener)MQ.addEventListener('change',apply);else if(MQ&&MQ.addListener)MQ.addListener(apply)}catch(e){}
  /* touchscreen laptops: the main pointer is the trackpad, so follow what was used last */
  document.addEventListener('pointerup',function(e){if(MQ&&MQ.matches)return;var t=e.pointerType==='touch';if(t===hyb||(t&&!(ANY&&ANY.matches)))return;setTimeout(function(){hyb=t;apply()},0)},true);
  /* 2. the date picker: seven days of 44 pixels plus the gaps need 372 pixels; the script that places it uses 340 */
  var CALW=372;
  function widen(p){if(!on()||p.classList.contains('is-sheet'))return;var W=Math.min(CALW,window.innerWidth-28),s=p.style,w=parseFloat(s.width)||0;if(!w||w>=W)return;
    var l=parseFloat(s.left)||0;s.width=W+'px';s.left=Math.max(14,Math.min(l,window.innerWidth-14-W))+'px'}
  if(window.MutationObserver){var calMo=new MutationObserver(function(ms){ms.forEach(function(m){var t=m.target;if(m.type==='attributes'&&t.classList&&t.classList.contains('kz-cal'))widen(t);
      if(m.type==='childList')m.addedNodes.forEach(function(n){if(n.nodeType===1&&n.classList.contains('kz-cal'))widen(n)})})});
    calMo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']})}
  /* 3. chairs: the tap circle is r user units; add an invisible stroke so it is at least 44 pixels across on screen */
  var CH=22.5,RO=null;
  function chairs(){document.querySelectorAll('#day .fplan svg').forEach(function(s){var h=s.querySelector('g.chg .hit');if(!h){s.style.removeProperty('--kz69-hw');return}
    if(!on()){s.style.removeProperty('--kz69-hw');return}var m=s.getScreenCTM&&s.getScreenCTM(),r=parseFloat(h.getAttribute('r'))||0;if(!m||!m.a)return;
    var need=Math.max(0,2*(CH-r*Math.abs(m.a)));s.style.setProperty('--kz69-hw',need.toFixed(1)+'px')})}
  function watch(){chairs();if(typeof ResizeObserver==='undefined')return;if(RO)RO.disconnect();else RO=new ResizeObserver(function(){chairs()});document.querySelectorAll('#day .fplan svg').forEach(function(s){RO.observe(s)})}
  var _pd9=paintDay;paintDay=function(){var r=_pd9.apply(this,arguments);try{watch()}catch(e){if(window.console)console.error(e)}return r};
  window.addEventListener('resize',chairs);
})();
/* ======================================================================================================================
   v70 (16 Oct 2026): calmer colours and names on the grills (see docs/STAFF-APP-DESIGN.md, "v70"). Visual only: no
   server call, status, permission, seating rule, print layout, email or backup changes. 1. The booking panel hides an
   information line that only says "None" (or nothing), and the whole box when nothing is left in it (the colours are in
   app.css). 2. The Seating plan drawing shows the parties of the sitting shown beside each grill (name and party size,
   with the party's colour dot); tapping a name opens that booking through its chair, as tapping the chair does. While a
   party is being seated or a plan is shown the names are labels only. Screen only: hidden in print.
   ====================================================================================================================== */
(function(){
  /* ---------- 1. the booking panel: no "Guest requests: None" ---------- */
  function emptyInfo(){var dr=$('dr');if(!dr)return;dr.querySelectorAll('.dbody .infobox').forEach(function(box){var shown=0;
    [].slice.call(box.children).forEach(function(r){var h=r.querySelector(':scope > b'),t=r.textContent.slice(h?h.textContent.length:0).replace(/\s+/g,' ').trim();
      var none=!t||/^(none|n\/?a|no|nil|-+|\.)$/i.test(t);r.classList.toggle('kz70-none',none);if(!none)shown++});
    box.classList.toggle('kz70-none',!shown)})}
  var _dw70=drawer;drawer=function(b){var r=_dw70.apply(this,arguments);try{emptyInfo()}catch(e){if(window.console)console.error(e)}return r};
  /* ---------- 2. names on the grills ---------- */
  var DATA={},MAXN=2,RO=null;
  var _ph70=planHtml;planHtml=function(s,L,cm,seat,plan){DATA[s.session_time]={L:L,cm:cm,act:!seat&&!plan};return _ph70.apply(this,arguments)};
  function touch(){return root.classList.contains('kz69-touch')}
  function plural(n,a,b){return n+' '+(n===1?a:b)}
  function party(e,cm,act){var p=e.p,n=e.n!==p.size?e.n+' of '+p.size:String(p.size),lab=p.name+', '+(e.n!==p.size?e.n+' of '+p.size+' guests':plural(p.size,'guest','guests'))+(hasAlg(p)?', allergy':'');
    var inner='<span class="kz70-who"><i class="kz70-dot" style="background:'+(cm[p.id]||'#888')+'"></i><b>'+esc(p.name)+'</b></span><span class="kz70-n">'+esc(n)+'</span>';
    return act?'<button type="button" class="kz70-gn" data-kz70open="'+p.id+'" aria-label="'+esc(lab+'. Open booking.')+'">'+inner+'</button>':'<span class="kz70-gn">'+inner+'</span>'}
  /* the drawn part of a grill: body, chairs (with their tap circle on touch), chef mark, name and seat count */
  function box(g){var r=null;function add(a){if(!a||!a.width&&!a.height)return;r=r?{l:Math.min(r.l,a.left),t:Math.min(r.t,a.top),r:Math.max(r.r,a.right),b:Math.max(r.b,a.bottom)}:{l:a.left,t:a.top,r:a.right,b:a.bottom}}
    g.querySelectorAll('.fp-body,.fp-top,circle.ch,.ch-alg,.fp-chef,.fp-lbl,.fp-sub').forEach(function(x){add(x.getBoundingClientRect())});
    if(touch())g.querySelectorAll('circle.hit').forEach(function(c){var q=c.getBoundingClientRect(),cx=q.left+q.width/2,cy=q.top+q.height/2,h=Math.max(q.width/2,22.5);add({left:cx-h,top:cy-h,right:cx+h,bottom:cy+h,width:2*h,height:2*h})});
    return r}
  function hit(a,b){return a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t}
  function place(svg){var host=svg.parentElement;if(!host)return;var old=host.querySelectorAll(':scope > .kz70-gl');
    var sr=svg.getBoundingClientRect();if(!sr.width||!sr.height){return}
    host.classList.add('kz70-host');if(getComputedStyle(host).position==='static')host.classList.add('kz70-rel');var hr=host.getBoundingClientRect(),cs=getComputedStyle(host),bl=parseFloat(cs.borderLeftWidth)||0,bt=parseFloat(cs.borderTopWidth)||0;
    var ox=-hr.left-bl+host.scrollLeft,oy=-hr.top-bt+host.scrollTop,vb=svg.viewBox&&svg.viewBox.baseVal,vert=!!vb&&vb.height>vb.width*1.15;
    var gs=[].slice.call(svg.querySelectorAll('g.fp-g[data-tcode]')),boxes=gs.map(box),made=[],keep={};
    gs.forEach(function(g,i){var d=DATA[g.getAttribute('data-sess')],code=g.getAttribute('data-tcode'),es=d&&d.L.by[code]||[],b=boxes[i];if(!es.length||!b)return;
      var id=g.getAttribute('data-sess')+'|'+code,el=host.querySelector(':scope > .kz70-gl[data-kz70k="'+id+'"]');
      var sig=(d.act?'a':'s')+es.map(function(e){return e.p.id+':'+e.n}).join(',');
      if(!el){el=document.createElement('div');el.className='kz70-gl';el.setAttribute('data-kz70k',id);host.appendChild(el)}
      if(el.getAttribute('data-sig')!==sig){var nm=g.querySelector('.fp-lbl'),more=es.length>MAXN?es.length-MAXN:0;
        el.setAttribute('data-sig',sig);el.setAttribute('role','group');el.setAttribute('aria-label','Guests at '+(nm?nm.textContent:code));el.setAttribute('data-kz70g',code);el.setAttribute('data-sess',g.getAttribute('data-sess'));
        el.innerHTML=es.slice(0,more?MAXN:es.length).map(function(e){return party(e,d.cm,d.act)}).join('')+(more?(d.act?'<button type="button" class="kz70-gn kz70-more" data-kz70more="'+code+'" aria-label="'+esc(more+' more at '+(nm?nm.textContent:code)+'. Show the grill.')+'">+'+more+' more</button>':'<span class="kz70-gn kz70-more">+'+more+' more</span>'):'')}
      keep[id]=1;made.push({el:el,b:b})});
    old.forEach(function(x){if(!keep[x.getAttribute('data-kz70k')])x.remove()});
    /* under the grill, or beside it when the drawing is a column; never over another grill or another grill's names */
    var lim={l:hr.left+bl+4,r:hr.right-4},placed=[];
    function put(m,mode){var el=m.el,b=m.b,s=el.style;el.classList.toggle('kz70-side',mode!=='b');el.classList.toggle('kz70-left',mode==='l');s.width='';
      if(mode==='b'){s.maxWidth=Math.floor(Math.min(Math.max(b.r-b.l+16,140),lim.r-lim.l))+'px';var ew=el.offsetWidth,cx=(b.l+b.r)/2,l=Math.max(lim.l,Math.min(cx-ew/2,lim.r-ew));
        s.left=Math.round(l+ox)+'px';s.top=Math.round(b.b+8+oy)+'px'}
      else{var w=mode==='r'?lim.r-b.r-8:b.l-lim.l-8;if(w<72)return false;s.maxWidth=Math.floor(Math.min(w,220))+'px';var eh=el.offsetHeight;
        s.left=Math.round((mode==='r'?b.r+8:b.l-8-el.offsetWidth)+ox)+'px';s.top=Math.round((b.t+b.b)/2-eh/2+oy)+'px'}
      var q=el.getBoundingClientRect(),r={l:q.left,t:q.top,r:q.right,b:q.bottom};
      return !boxes.some(function(o){return o&&o!==b&&hit(r,o)})&&!placed.some(function(o){return hit(r,o)})&&r}
    made.forEach(function(m){var order=vert?['r','l','b']:(window.KZ_FP&&KZ_FP.side&&KZ_FP.dir==='h'?['r','b','l']:['b','r','l']),ok=false;for(var k=0;k<order.length&&!ok;k++)ok=put(m,order[k]);if(!ok)ok=put(m,'b');if(ok)placed.push(ok)});
    /* room for the names under the drawing (screen only: the space is a custom property used in @media screen) */
    var need=0;made.forEach(function(m){var q=m.el.getBoundingClientRect();need=Math.max(need,q.bottom-sr.bottom+2)});
    host.style.setProperty('--kz70-pb',Math.max(0,Math.ceil(need))+'px')}
  function paint(){document.querySelectorAll('#day .fplan svg').forEach(function(s){try{place(s)}catch(e){if(window.console)console.error(e)}})}
  function watch(){paint();if(typeof ResizeObserver==='undefined')return;if(RO)RO.disconnect();else RO=new ResizeObserver(function(){paint()});document.querySelectorAll('#day .fplan svg').forEach(function(s){RO.observe(s)})}
  var _pd70=paintDay;paintDay=function(){var r=_pd70.apply(this,arguments);try{watch()}catch(e){if(window.console)console.error(e)}return r};
  window.addEventListener('resize',paint);
  /* tapping a name: the same as tapping that party's chair (marks the grill and opens the booking); "+1 more" shows the grill */
  document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;var b=t.closest('#day .kz70-gl button');if(!b)return;var gl=b.closest('.kz70-gl'),sess=gl.getAttribute('data-sess'),code=gl.getAttribute('data-kz70g');
    var g=document.querySelector('#day g.fp-g[data-tcode="'+code+'"][data-sess="'+sess+'"]');if(!g)return;e.preventDefault();e.stopPropagation();
    var tgt=b.hasAttribute('data-kz70open')?g.querySelector('g.chg[data-id="'+b.getAttribute('data-kz70open')+'"]'):g;if(!tgt)return;
    tgt.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))},true);
  window.kz70Names=paint;
})();
/* ======================================================================================================================
   v71 (17 Oct 2026): walk-in card, bigger main buttons, Save in view (see docs/STAFF-APP-DESIGN.md, "v71"). Approved by
   Roneel as the only changes in this release. Interface only: no server call, status, permission, email, print, backup or
   guest form change. 1. Arrivals (today) gets a fifth action card, "Add walk-in", next to New booking: it opens the same
   New booking flow (window.kzWalkIn, as the New booking card) on step 1 with "Seat walk-in now" chosen (the step's own
   choice button), at the party size question. A booking already in progress is carried on, as from New booking. Not navy.
   2. Bigger main buttons on touch: app.css only. 3. Save always in view: the change form and Edit details keep Save and
   Discard changes in a bar at the bottom of the booking panel (app.css); the panel is sized to the visible screen while a
   form is open, so the on-screen keyboard never covers the bar. Here: Edit details gets the same Discard changes as the
   change form (it shows the booking as saved again; the unsaved-changes question still covers an open change form), and
   a form that opens low in the panel is scrolled up so its top and the bar are both on screen.
   ====================================================================================================================== */
(function(){
  /* ---------- 1. the Add walk-in card (added beside New booking whenever the cards are drawn) ---------- */
  var FOC=false;
  function walkCard(){return '<button type="button" class="kz67-card kz71-walk" data-kz71="walk" aria-label="Add walk-in. A guest is here now."><span class="kz67-ic" aria-hidden="true">'+kzIcon('user')+
    '</span><span class="kz67-tx"><b class="kz67-t">Walk-in</b><span class="kz67-sub">A guest is here now.</span></span></button>'}
  function addWalk(){var host=$('kz67');if(!host||host.hidden)return;var nb=host.querySelector('[data-kz67="new"]');if(!nb||host.querySelector('[data-kz71]'))return;
    nb.insertAdjacentHTML('afterend',walkCard());var c=host.querySelector('[data-kz71]');host.classList.add('kz71-five');
    c.addEventListener('click',walkIn);c.addEventListener('focus',function(){FOC=true});c.addEventListener('blur',function(){FOC=false});
    if(FOC)c.focus({preventScroll:true})}
  function walkIn(){window.kzWalkIn({});
    /* a new walk-in already starts on "Seat walk-in now"; if not, choose it with the step's own button */
    var w=$('kzw');if(w&&w.dataset.step==='1'&&w.dataset.flow!=='walk'&&!$('kzw-resume')){var m=w.querySelector('[data-mode="walk"]');if(m)m.click()}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;try{addWalk()}catch(e){if(window.console)console.error(e)}})}).observe(document.documentElement,{childList:true,subtree:true});
  window.kz71WalkIn=walkIn;

  /* ---------- 3. Save in view ---------- */
  var LAST=null;
  /* a form that opened low in the panel: bring its top up so the form and its bar are both on screen */
  function reveal(box){var d=document.querySelector('#dr .drawer');if(!box||!d||!box.getBoundingClientRect().height)return;
    var v=window.visualViewport,vb=v?v.offsetTop+v.height:window.innerHeight,dr=d.getBoundingClientRect(),bottom=Math.min(dr.bottom,vb),r=box.getBoundingClientRect();
    var hd=d.querySelector('.dhead'),top=dr.top+(hd&&getComputedStyle(hd).position==='sticky'?hd.offsetHeight:0)+8;
    if(r.top>bottom-160||r.top<top)d.scrollTop+=r.top-top}
  document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest&&t.closest('#dr #chg,#dr #kz63chg'))setTimeout(function(){reveal($('chgbox'))},0)});
  document.addEventListener('toggle',function(e){var t=e.target;if(t&&t.id==='fedit'&&t.open)setTimeout(function(){reveal(t.querySelector('.fold-b'))},0)},true);
  /* Edit details: Discard changes draws the booking as saved again (no server call), where it was in the panel */
  function discard(){if(!LAST)return;var cb=$('chgbox');
    function go(){var d=document.querySelector('#dr .drawer'),top=d?d.scrollTop:0;delete KZDS.fedit;drawer(LAST[0],LAST[1]);var d2=document.querySelector('#dr .drawer');
      if(d2){d2.classList.add('kz71-still');d2.scrollTop=top;var s=d2.querySelector('#fedit summary');if(s)s.focus({preventScroll:true})}}
    if(KZDS.chgbox&&cb&&cb.innerHTML.trim())return kzDrAsk(go);go()}
  var _dw71=drawer;drawer=function(b,hist){LAST=[b,hist];var r=_dw71.apply(this,arguments);
    try{var es=$('es');if(es&&!$('kz71ex')){es.insertAdjacentHTML('afterend','<button type="button" class="btn sm" id="kz71ex">Discard changes</button>');$('kz71ex').onclick=discard}}catch(e){if(window.console)console.error(e)}return r};
})();
/* ======================================================================================================================
   v71 Service View (18 Oct 2026, approved by Roneel: open to everyone who can take bookings). A full-screen host stand
   screen for tablets, modelled on the Corner Café Counter Tablet: no side menu, the Kazumi mark and the time at the top,
   and seven large cards. Each card opens the flow that already exists (no new server call, rule, status or permission):
   Today's bookings and Guest arrived (Arrivals, today), Add walk-in and New booking (the New booking flow), Find a booking
   (search), Teppanyaki seating (the Seating plan) and Needs attention (Needs your attention). A finished or cancelled New booking
   comes back to the Service View home; "Service home" is always one tap away. Switched on with "Service view" in the
   menu and off with "Exit service view"; remembered on this device only, never forced by the type of device.
   ====================================================================================================================== */
(function(){
  var KEY='kz_sv',ON=false,HOME=false,FROM=null,tick=null;
  function today(){return fijiToday()}
  
  function fijiDate(){var f=new Intl.DateTimeFormat('en-GB',{timeZone:'Pacific/Fiji',weekday:'long',day:'numeric',month:'long'});return f.format(new Date())}
  function fijiTime(){var p=new Intl.DateTimeFormat('en-US',{timeZone:'Pacific/Fiji',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());return p}
  function plural(n,a,b){return n+' '+(n===1?a:b)}
  function live(msg){var l=$('kz72say');if(l){l.textContent='';setTimeout(function(){l.textContent=msg},30)}}
  /* the three things the host stand does most come first, larger; then the four for looking things up */
  var CARDS=[
    ['new',kzIcon('plus'),'New booking','By phone, email or in person.'],
    ['walk',kzIcon('user'),'Walk-in','A guest is here now.'],
    ['arrived',kzIcon('check'),'Guest arrived','Mark a party as here, then seat them.'],
    ['today',kzIcon('list'),'Arrivals','Everyone due today, in time order.'], /* v83: the same names as the side panel */
    ['seat',kzIcon('grill'),'Seating plan','Who is at each grill tonight.'],
    ['find',I.search,'Find a booking','Search by name or phone number.'],
    ['need',kzIcon('alert'),'Needs your attention','Things to deal with today.']];
  function card(c){return '<button type="button" class="kz72-c" data-sv="'+c[0]+'"><span class="kz72-ic" aria-hidden="true">'+c[1]+'</span>'+
    '<span class="kz72-t">'+c[2]+'</span><span class="kz72-sub">'+c[3]+'</span><span class="kz72-live" data-live="'+c[0]+'"></span></button>'}
  /* ---------- the bar and the home screen ---------- */
  function paintBar(){var b=$('kz72bar');if(!b){b=document.createElement('div');b.id='kz72bar';b.className='kz72-bar noprint';
      b.innerHTML='<div class="kz72-brand"><i class="klogo" role="img" aria-label="Kazumi Japanese Restaurant"></i><span class="kz72-name">Service view</span></div>'+
        '<div class="kz72-when"><b id="kz72time"></b><span id="kz72date"></span></div>'+
        '<div class="kz72-acts"><button type="button" class="btn kz72-home-b" id="kz72home">'+kzIcon('home')+'<span>Service home</span></button>'+
        '<button type="button" class="btn kz72-exit" id="kz72exit">Exit service view</button></div><span class="kz72-sr" aria-live="polite" id="kz72say"></span>';
      root.insertBefore(b,root.firstChild);$('kz72home').onclick=function(){showHome(true)};$('kz72exit').onclick=exit}
    $('kz72time').textContent=fijiTime();$('kz72date').textContent=fijiDate();$('kz72home').hidden=HOME}
  function paintHome(){var h=$('kz72');if(!h){h=document.createElement('section');h.id='kz72';h.className='kz72-home noprint';h.setAttribute('aria-label','Service home');
      h.innerHTML='<h1 class="kz72-h">What would you like to do?</h1><div class="kz72-grid">'+CARDS.map(card).join('')+'</div>';
      var bar=$('kz72bar');bar.insertAdjacentElement('afterend',h);
      h.querySelectorAll('[data-sv]').forEach(function(b){b.addEventListener('click',function(){act(b.dataset.sv)})})}
    h.hidden=!HOME;paintLive()}
  /* live lines: the same counts the Arrivals cards show, from the same day data */
  function paintLive(){var h=$('kz72');if(!h||h.hidden)return;
    function set(k,html){var e=h.querySelector('[data-live="'+k+'"]');if(e&&e.innerHTML!==html)e.innerHTML=html}
    var d=state.day,t='';
    if(state.tab==='today'&&(state.date||today())===today()&&d){try{var ps=dayParties(d).filter(function(p){return /^(confirmed|pending|pending_large_group)$/.test(p.status)&&!p.departed_at});
      t=ps.length?'<b>'+plural(ps.length,'party','parties')+'</b>, '+plural(sum(ps),'guest','guests'):'<b>No bookings today</b>'}catch(e){t=''}}
    set('today',t);
    var nx=document.querySelector('#kz67 [data-kz67="next"] .kz67-live'),wt=document.querySelector('#kz67 [data-kz67="wait"] .kz67-live');
    function txt(e){if(!e)return '';var x=e.textContent.replace(/\s+/g,' ').trim();return x?esc(x):''}
    set('arrived',txt(nx));set('need',txt(wt))}
  /* ---------- moving between the home screen and the flows ---------- */
  function toToday(view){lsSet('kz_view',view||'arrivals');var o={view:view||'arrivals',seat:null,plan:null};if(state.date&&state.date!==today())o.date=today();
    if(state.tab==='today'&&state.view===o.view&&!o.date)return;_go('today',o)}
  function showHome(user){if(!ON)return;if(state.tab==='new'&&user){var lv=document.querySelector('#kzw [data-act="leave"],#kzw .kzw-x,#kzwx');if(lv){lv.click();if(state.tab==='new')return}}
    HOME=true;FROM=null;closeLayers();toToday('arrivals');root.classList.add('kz72-home-on');paintBar();paintHome();window.scrollTo(0,0);
    if(user){var f=document.querySelector('#kz72 [data-sv]');if(f)f.focus({preventScroll:true})}}
  function hideHome(){HOME=false;root.classList.remove('kz72-home-on');var h=$('kz72');if(h)h.hidden=true;paintBar()}
  function closeLayers(){var m=$('kmore');if(m)m.remove()}
  function after(fn){setTimeout(function(){try{fn()}catch(e){if(window.console)console.error(e)}},60)}
  function act(k){hideHome();
    if(k==='today'){toToday('arrivals');window.scrollTo(0,0);live('Arrivals.');return}
    if(k==='arrived'||k==='need'){toToday('arrivals');after(function(){var c=document.querySelector('#kz67 [data-kz67="'+(k==='arrived'?'next':'wait')+'"]');if(c)c.click()});return}
    if(k==='seat'){toToday('floor');window.scrollTo(0,0);live('Seating plan.');return}
    if(k==='find'){openSearch();return}
    FROM='flow';if(k==='walk'){if(window.kz71WalkIn)window.kz71WalkIn();else window.kzWalkIn({})}else window.kzWalkIn({})}
  /* a New booking or walk-in that is finished, or left, comes back to the home screen */
  var _go=go;go=function(tab){var was=state.tab,r=_go.apply(this,arguments);
    try{if(ON&&FROM==='flow'&&was==='new'&&tab!=='new')showHome(false)}catch(e){if(window.console)console.error(e)}return r};
  /* ---------- switching on and off ---------- */
  function enter(){if(ON)return;ON=true;lsSet(KEY,'1');root.classList.add('kz72-on');paintBar();showHome(false);
    clearInterval(tick);tick=setInterval(function(){if(ON)paintBar()},20000);var first=$('kz72')&&$('kz72').querySelector('[data-sv]');if(first)first.focus({preventScroll:true});live('Service view on.')}
  /* Shared desktop shell: choosing a normal sidebar module leaves Service View before existing navigation runs. */
  root.addEventListener('click',function(e){
    if(!ON||!e.target.closest)return;
    var link=e.target.closest('.kside [data-nav]');
    if(link){leaveMode();}
  },true);
  function leaveMode(){if(!ON)return;ON=false;HOME=false;FROM=null;lsSet(KEY,'0');clearInterval(tick);
    root.classList.remove('kz72-on','kz72-home-on');['kz72bar','kz72'].forEach(function(i){var e=$(i);if(e)e.remove()})}
  function exit(){if(!ON)return;leaveMode();
    if(state.tab!=='new')toToday('arrivals');window.scrollTo(0,0);setTimeout(function(){var g=document.querySelector('.kside .kz81-sv');if(!g||!g.getClientRects().length)g=document.querySelector('.kbot [data-nav="more"]')||document.querySelector('.kz72-go');if(g)g.focus({preventScroll:true})},120);toast('Service view off.')}
  window.kz72Enter=enter;window.kz72Exit=exit;
  /* the "Service view" button: on Arrivals beside Help, and in the More sheet on phones and upright tablets */
  function addEntry(){var side=document.querySelector('#kzs .kside');
    /* The shared sidebar already opens Service View on desktop and landscape tablets. Do not also show the older
       Arrivals entry beside Help; phones and upright tablets continue to use the More sheet. */
    var hp=$('kz63help'),hasSidebarEntry=!!(side&&side.querySelector('.kz81-sv'));
    if(hp&&hasSidebarEntry){var duplicate=hp.parentNode.querySelector('.kz72-go');if(duplicate)duplicate.remove()}
    if(hp&&!ON&&!hasSidebarEntry&&!hp.parentNode.querySelector('.kz72-go')){hp.insertAdjacentHTML('beforebegin','<button type="button" class="btn kz72-go">'+kzIcon('home')+'<span>Service view</span></button>');hp.parentNode.querySelector('.kz72-go').onclick=enter}
    var mo=document.querySelector('#kmore [data-kmore-group="service"]')||document.querySelector('#kmore .kmore-row');if(mo&&!mo.querySelector('.kz72-go')){var heading=mo.querySelector('.kmore-group-title'),html='<button type="button" class="kmore-i kz72-go">'+kzIcon('home')+'<span>Service view</span></button>';if(heading)heading.insertAdjacentHTML('afterend',html);else mo.insertAdjacentHTML('afterbegin',html);mo.querySelector('.kz72-go').onclick=function(){closeLayers();enter()}}
    /* signed in: the device remembers Service view; signed out: nothing of it is left on screen */
    if(side&&!ON&&lsGet(KEY)==='1')enter();
    if(!side&&ON){ON=false;HOME=false;FROM=null;clearInterval(tick);root.classList.remove('kz72-on','kz72-home-on');['kz72bar','kz72'].forEach(function(i){var e=$(i);if(e)e.remove()})}
    /* the screen is redrawn on every change of section: put the bar (and the home screen, when open) back */
    if(ON&&!$('kz72bar'))paintBar();if(ON&&HOME&&!$('kz72'))paintHome();
    if(ON&&HOME)paintLive()}
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;try{addEntry()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true,characterData:true});
})();
/* ======================================================================================================================
   v72 (19 Oct 2026): the seating plan drawn as the room is, larger (approved by Roneel; see docs/STAFF-APP-DESIGN.md,
   "v72"). Visual only: no server call, seating rule, permission, print, email or backup change.
   1. The main room is L-shaped: the first four grills in their saved order (Ume, Fuji, Tsubaki, Sakura) run along the
      kitchen side, and the rest (Kiku, Yuri) go down from the fourth, under it. The guest names of the grills going down sit to their right; the top row's
      names go under them, into the open corner of the L. Used by the Seating plan and the Settings preview; phones keep their
      column. KZ_L_ARM is how many grills are on the long arm.
   2. Larger: see the v66 sizing (an L-shaped drawing may use about 60 per cent of the screen height, up to 1.8 times
      life size) and app.css (upright tablets show the drawing first).
   ====================================================================================================================== */
var KZ_L_ARM=4;
(function(){
  var _fl=fpLayout;fpLayout=function(items,room,dir){
    if(room!=='main'||dir!=='h'||items.length<=KZ_L_ARM)return _fl.apply(this,arguments);
    var gap=30,vgap=40,cur=16,H=0,top=items.slice(0,KZ_L_ARM),rest=items.slice(KZ_L_ARM),W=0;
    top.forEach(function(e){H=Math.max(H,e.g.box[3])});
    top.forEach(function(e){var b=e.g.box;e.cx=cur-b[0];e.cy=64-b[1];cur+=b[2]+gap});
    W=cur-gap+16;
    var lb=top[top.length-1],axis=lb.cx+lb.g.box[0]+lb.g.box[2]/2,y=64+H+vgap;
    rest.forEach(function(e){var b=e.g.box;e.cx=axis-(b[0]+b[2]/2);e.cy=y-b[1];y+=b[3]+vgap;W=Math.max(W,e.cx+b[0]+b[2]+16)});
    /* the guest names of the grills going down sit to their right, in this margin; the top row's names go under them,
       into the open corner of the L */
    W+=170;var bottom=y-vgap+16;
    return {vb:[0,40,Math.round(W),Math.round(bottom-40)],div:[],l:true}};
})();
/* ======================================================================================================================
   v75 (20 Oct 2026): phones and upright tablets, easier to use (see docs/STAFF-APP-DESIGN.md, "v75"). Visual only.
   1. Phones: the top bar names every page (All bookings, Guest directory, Settings, New booking), not only the service views.
   2. Phones: the calendar's colour key folds behind a "Colour key" button; tap it to show or hide.
   3. Phones: the closures notice is one line; tap it to read it in full.
   ====================================================================================================================== */
(function(){
  function topName(){var bp=document.querySelector('#kzs .top .brand-p'),N=window.KZ_NAV_NAME||{};if(!bp)return;
    var t=N[state.tab];if(t&&state.tab!=='today'&&state.tab!=='calendar')bp.textContent=t}
  var _sh=shell;shell=function(){var r=_sh.apply(this,arguments);topName();return r};
  var _rc=renderCalendar;renderCalendar=function(){var r=_rc.apply(this,arguments);try{var lg=document.querySelector('#kzs .legend');
    if(lg&&!lg.querySelector('.lg-key')){var b=document.createElement('button');b.type='button';b.className='lg-key';b.setAttribute('aria-expanded','false');b.textContent='Colour key';
      b.onclick=function(){var o=lg.classList.toggle('open');b.setAttribute('aria-expanded',String(o))};lg.insertBefore(b,lg.firstChild)}}catch(e){}return r};
  document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('#kzs .closed:not(.kz67-clf)');if(!c||e.target.closest('button,a'))return;c.classList.toggle('open')});
})();
/* ======================================================================================================================
   v76 (20 Oct 2026): the dashboard as a helpful assistant, quick to the touch (asked for by Roneel; see
   docs/STAFF-APP-DESIGN.md, "v76"). Presentation only: no server call, status, permission, seating rule, print, email or
   backup change. Every button opens a screen or list that already exists.
   1. Next up: on Arrivals (today) and on the Service View home, one card says the one thing to do now, read from the
      guest list already on screen, in this order: guests here waiting for a table, guests running late, things waiting
      on you, the next arrival, the next booking later, and "everyone is here". One button takes you there. A ring shows
      how many of today's guests are here (the same numbers as the greeting, which it replaces on screen; the greeting
      stays in the page, unchanged, for the other screens).
   2. Touch: a quick press-in on every button and card, a soft ripple where the finger landed, and a short buzz on
      phones that support it (Android) for the main actions. Nothing waits for the tap to finish.
   ====================================================================================================================== */
(function(){
  KZI.alarm='<circle cx="12" cy="13" r="7.5"/><path d="M12 9.3V13l2.6 1.7"/><path d="M3.8 6L7 3.5M20.2 6L17 3.5"/>';
  KZI.bell='<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.6H4.4z"/><path d="M10 21a2 2 0 0 0 4 0"/>';
  KZI.spark='<path d="M12 3.5l1.9 5.2 5.1 1.9-5.1 1.9L12 17.7l-1.9-5.2L5 10.6l5.1-1.9z"/>';
  KZI.arrowr='<path d="M5 12h13"/><path d="M13 6.5l5.5 5.5-5.5 5.5"/>';
  function rd(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
  function pl(n,a,b){return n+' '+(n===1?a:b)}
  /* ---------- 1. Next up ---------- */
  function rowsIn(cls){var h=document.querySelector('#day .arr-sec>.arr-h.'+cls);if(!h)return [];var s=h.closest('.arr-sec');return s?[].slice.call(s.querySelectorAll('.arow')):[]}
  function who(r){var n=r.querySelector('.aname'),s=n&&n.querySelector('.asize'),name='';
    if(n)[].forEach.call(n.childNodes,function(c){if(c.nodeType===3)name+=c.textContent});
    return {name:name.trim()||'A guest',size:s?s.textContent.trim():'',time:((r.querySelector('.atime b')||{}).textContent||'').trim()}}
  function party(a){return a.name+(a.size?' ('+a.size+')':'')}
  function many(list,one,more){var a=who(list[0]);return list.length===1?party(a)+' '+one:a.name+' + '+(list.length-1)+' more '+more}
  function tip(){
    if(!document.querySelector('#day .arr-sec')&&document.querySelector('#day [data-hpane="tables"].on'))
      return {k:'tables',ic:'list',t:'Showing tables',b:'Guests',go:'guests'};
    var here=rowsIn('herelist'),late=rowsIn('late'),soon=rowsIn('soon'),later=rowsIn('later');
    var wb=document.querySelector('#kz67 [data-kz67="wait"] .kz67-badge'),wn=wb?parseInt(wb.textContent,10)||0:0;
    if(here.length)return {k:'here',ic:'seat',t:many(here,'waiting','waiting'),b:'Show',go:'herelist'};
    if(late.length)return {k:'late',ic:'alarm',t:many(late,'running late','running late'),b:'Show',go:'late'};
    if(wn)return {k:'need',ic:'alert',t:pl(wn,'thing to do','things to do'),b:'Show',go:'wait'};
    if(soon.length){var a=who(soon[0]);return {k:'next',ic:'bell',t:'Next: '+party(a)+(a.time?' · '+a.time:''),b:'Show',go:'soon'}}
    if(later.length){var c=who(later[0]);return {k:'calm',ic:'spark',t:'All set · next '+c.name+(c.time?' · '+c.time:''),b:'',go:''}}
    return {k:'done',ic:'check',t:'Everyone is here',b:'',go:''}}
  function counts(){var w=$('welc'),t=w?w.textContent:'',g=t.match(/(\d+) guests? today/),h=t.match(/(\d+) here/);return g?{g:+g[1],h:h?+h[1]:0}:null}
  function ring(c){if(!c||!c.g)return '';var r=24,C=2*Math.PI*r,f=Math.min(1,c.h/c.g),off=(C*(1-f)).toFixed(1);
    return '<span class="kz76-ring" role="img" aria-label="'+c.h+' of '+c.g+' guests arrived"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="bg" cx="28" cy="28" r="'+r+'"/><circle class="fg" cx="28" cy="28" r="'+r+'" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off+'"/></svg><b aria-hidden="true">'+c.h+'<small>of '+c.g+'</small></b></span>'}
  function hello(){var w=$('welc'),f=(typeof firstName==='function'&&firstName())||'',c=counts();
    return '<b>'+esc(kzGreet())+'.</b> '+(c?esc(pl(c.g,'guest','guests')+' expected today, '+c.h+' here so far.'):'')}
  function html(where){var t=tip(),c=counts();
    return '<div class="kz76" data-k="'+t.k+'" data-where="'+where+'" role="status" aria-live="polite">'+(where==='arr'?ring(c):'')+
      '<span class="kz76-ic" aria-hidden="true">'+kzIcon(t.ic)+'</span><span class="kz76-tx"><span class="kz76-hi">'+hello()+'</span><span class="kz76-say">'+esc(t.t)+'</span></span>'+
      (t.b?'<button type="button" class="kz76-go" data-go="'+t.go+'" aria-label="'+esc(t.b)+'">'+esc(t.b)+kzIcon('arrowr')+'</button>':'')+'</div>'}
  function spot(cls){var h=document.querySelector('#day .arr-sec>.arr-h.'+cls),s=h&&h.closest('.arr-sec');if(!s)return;
    var bar=document.querySelector('#kzs .top'),off=(bar&&bar.offsetHeight&&getComputedStyle(bar).position!=='static'?bar.offsetHeight:0)+8;
    window.scrollTo({top:Math.max(0,s.getBoundingClientRect().top+window.scrollY-off),behavior:rd()?'auto':'smooth'});
    s.classList.remove('kz67-spot');void s.offsetWidth;s.classList.add('kz67-spot');setTimeout(function(){s.classList.remove('kz67-spot')},1800);
    var b=s.querySelector('.aacts .btn');if(b)b.focus({preventScroll:true})}
  function goArr(g){if(g==='wait'){var c=document.querySelector('#kz67 [data-kz67="wait"]');if(c)c.click();return}
    if(g==='guests'){var p=document.querySelector('#day [data-hpane="guests"]');if(p)p.click();return}
    if(g)spot(g)}
  function goHome(g){var k=g==='wait'?'need':'arrived',c=document.querySelector('#kz72 [data-sv="'+k+'"]');
    if(g!=='wait'&&g!=='guests'){c=document.querySelector('#kz72 [data-sv="today"]');if(c){c.click();setTimeout(function(){spot(g)},120);return}}
    if(c)c.click()}
  function paint(){
    var onA=state.tab==='today'&&state.view==='arrivals'&&state.date===fijiToday()&&!!$('kz67')&&!$('kz67').hidden;
    var a=$('kz76');
    if(onA&&state.day){var h=html('arr');if(!a||a.dataset.sig!==h){var tmp=document.createElement('div');tmp.innerHTML=h;var n=tmp.firstChild;n.id='kz76';n.dataset.sig=h;
        if(a)a.replaceWith(n);else $('kz67').insertAdjacentElement('beforebegin',n);
        var bt=n.querySelector('.kz76-go');if(bt)bt.onclick=function(){goArr(bt.dataset.go)}}
      root.classList.add('kz76-on')}
    else{if(a)a.remove();root.classList.remove('kz76-on')}
    var wl=$('welc');if(wl)wl.classList.toggle('kz76-hide',!!$('kz76'));
    var home=$('kz72'),hs=home&&!home.hidden&&home.querySelector('.kz72-h');
    if(hs&&state.day&&state.date===fijiToday()){var hh=html('home'),o=home.querySelector('.kz76');
      if(!o||o.dataset.sig!==hh){var t2=document.createElement('div');t2.innerHTML=hh;var m=t2.firstChild;m.dataset.sig=hh;if(o)o.replaceWith(m);else hs.insertAdjacentElement('afterend',m);
        var b2=m.querySelector('.kz76-go');if(b2)b2.onclick=function(){goHome(b2.dataset.go)}}}
    else if(home){var o2=home.querySelector('.kz76');if(o2)o2.remove()}}
  /* drawn in the same step as the screen, so the page never changes height after it is shown (Back keeps its place) */
  function safe(){try{paint()}catch(e){if(window.console)console.error(e)}}
  var _rt76=renderToday;renderToday=function(){var r=_rt76.apply(this,arguments);safe();return r};
  var _pd76=paintDay;paintDay=function(){var r=_pd76.apply(this,arguments);safe();return r};
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;safe()})}).observe(root,{childList:true,subtree:true});
  setInterval(function(){try{paint()}catch(e){}},30000);

  /* ---------- 2. touch: press-in, ripple and a short buzz ---------- */
  var PRESS='.btn,.kz67-card,.kz72-c,.kz76-go,.kbot-i,.kz-np,.seg>button';
  var RIP='.kz67-card,.kz72-c,.kz76-go,.aacts .btn,.kz-np';
  var BUZZ='.aacts .btn.go,.aacts .btn.primary,.kz67-card,.kz72-c,.kz76-go,#kzw .btn.primary';
  var down=null,at=0;
  function up(){var b=down;down=null;if(!b)return;var w=Math.max(0,90-(Date.now()-at));setTimeout(function(){b.classList.remove('kz76-down')},w)}
  root.addEventListener('pointerdown',function(e){if(e.button>0)return;var b=e.target.closest&&e.target.closest(PRESS);if(!b||b.disabled||b.getAttribute('aria-disabled')==='true')return;
    down=b;at=Date.now();b.classList.add('kz76-down');
    if(rd()||!b.matches(RIP))return;
    try{if(getComputedStyle(b).position==='static')b.classList.add('kz76-rel');
      var r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,w=document.createElement('span'),s=document.createElement('span');
      w.className='kz76-rw';w.setAttribute('aria-hidden','true');s.className='kz76-rip';
      s.style.width=s.style.height=d+'px';s.style.left=(e.clientX-r.left-d/2)+'px';s.style.top=(e.clientY-r.top-d/2)+'px';
      w.appendChild(s);b.appendChild(w);setTimeout(function(){w.remove()},600)}catch(x){}},{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){root.addEventListener(ev,up,{passive:true})});
  root.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest(BUZZ);if(!b)return;try{if(navigator.vibrate&&window.matchMedia('(pointer: coarse)').matches)navigator.vibrate(8)}catch(x){}});
})();
/* ======================================================================================================================
   v77 (20 Oct 2026): Analytics, modelled on the Jack's Restaurants Service Hub Owner view (asked for by Roneel; see
   docs/STAFF-APP-DESIGN.md, "v77"). Read-only: one new server call, staff_analytics (database change 20261020a), for
   managers and admins. Teppanyaki and lunch and dinner are shown side by side, never added together. Charts first, few
   words; the same counting rules as the group hub (booked, seated, not marked, walk-ins on their own, tests left out).
   ====================================================================================================================== */
var renderAnalytics;
(function(){
  KZI.chart='<path d="M4 20h16"/><path d="M7 16v-4M12 16V8M17 16v-6"/>';
  KZI.cal='<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>';
  var A={range:'month',tests:false,seq:0,data:null};
  try{A.range=lsGet('kz_an_range')||'month'}catch(e){}
  var COL={tep:'#D9906C',alc:'#6EB2BE'},NAMES={tep:'Teppanyaki',alc:'Lunch and dinner'};
  var DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var RANGES=[['month','This month'],['prevmonth','Last month'],['30','Last 30 days'],['90','Last 90 days'],['year','This year'],['next30','Next 30 days']];
  function N(v){return +v||0}
  function add(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
  function nice(d){var x=new Date(d+'T12:00:00Z');return x.getUTCDate()+' '+MN[x.getUTCMonth()]}
  function wday(d){var x=new Date(d+'T12:00:00Z');return DN[(x.getUTCDay()+6)%7]}
  function range(){var t=fijiToday(),k=A.range,f,e;
    if(k==='prevmonth'){e=add(t.slice(0,8)+'01',-1);f=e.slice(0,8)+'01'}
    else if(k==='30'){f=add(t,-30);e=add(t,-1)}else if(k==='90'){f=add(t,-90);e=add(t,-1)}
    else if(k==='year'){f=t.slice(0,4)+'-01-01';e=add(t,-1);if(e<f)e=f}
    else if(k==='next30'){f=t;e=add(t,29)}
    else{f=t.slice(0,8)+'01';var nx=new Date(f+'T12:00:00Z');nx.setUTCMonth(nx.getUTCMonth()+1);e=add(nx.toISOString().slice(0,10),-1)}
    return {k:k,from:f,to:e,days:Math.round((new Date(e)-new Date(f))/864e5)+1}}
  function pct(a,b){if(!b||b<20)return null;return Math.round((a-b)/b*100)}
  function chg(p){return p==null?'<span class="an-chg m" title="Fewer than 20 guests to compare against">—</span>':'<span class="an-chg '+(p>0?'up':p<0?'down':'')+'">'+(p>0?'+':'')+p+'%</span>'}
  function card(title,body,cls,ic){return '<section class="an-card'+(cls?' '+cls:'')+'"><h2 class="an-h">'+(ic?kzIcon(ic):'')+'<span>'+title+'</span></h2>'+body+'</section>'}
  function empty(t){return '<div class="an-empty">'+t+'</div>'}
  function key(segs){return '<div class="an-key">'+segs.map(function(s){return '<span><i style="background:'+s[1]+'"></i>'+s[0]+'</span>'}).join('')+'</div>'}
  function swatch(code){return '<i class="an-sw" style="background:'+COL[code]+'"></i>'}
  /* one stacked bar per side, segments with their share */
  function stacks(S,segs,vals,opt){opt=opt||{};var any=S.some(function(x){return vals(x).some(function(v){return v>0})});if(!any)return empty(opt.none||'Nothing recorded yet.');
    return key(segs)+'<div class="an-stacks">'+S.map(function(x){var v=vals(x),t=v.reduce(function(a,b){return a+b},0);
      return '<div class="an-srow"><span class="n">'+swatch(x.code)+esc(NAMES[x.code])+'</span><span class="an-stack" role="img" aria-label="'+esc(NAMES[x.code]+': '+segs.map(function(s,i){return s[0]+' '+v[i]}).join(', '))+'">'+
        v.map(function(n,i){return t&&n?'<i style="width:'+(n/t*100).toFixed(1)+'%;background:'+segs[i][1]+(segs[i][2]?';color:#1d2a31':'')+'" title="'+esc(segs[i][0]+': '+n)+'">'+(n/t>=.2?Math.round(n/t*100)+'%':'')+'</i>':''}).join('')+'</span><b>'+(opt.tot?opt.tot(x,t):t)+'</b>'+(opt.note?'<span class="x">'+opt.note(x)+'</span>':'')+'</div>'}).join('')+'</div>'}
  /* line chart: series [[name, colour, values, dashed]], labels */
  function lines(ser,labels,o){o=o||{};var W=o.W||640,H=o.H||200,L=40,R=12,T=12,B=26,w=W-L-R,h=H-T-B,n=labels.length,max=1;ser.forEach(function(s){s[2].forEach(function(v){max=Math.max(max,v)})});
    var step=max<=10?2:max<=50?10:max<=100?20:max<=250?50:max<=500?100:200,top=Math.ceil(max/step)*step,X=function(i){return L+(n>1?i*w/(n-1):w/2)},Y=function(v){return T+h-h*v/top};
    var g='<svg class="an-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Guests booked each week">';
    for(var y=0;y<=top;y+=step)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(y).toFixed(1)+'" y2="'+Y(y).toFixed(1)+'" class="gl"/><text x="'+(L-8)+'" y="'+(Y(y)+4).toFixed(1)+'" text-anchor="end" class="tx">'+y+'</text>';
    labels.forEach(function(l,i){if(n<=8||i%Math.ceil(n/8)===0||i===n-1)g+='<text x="'+X(i).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+(i===0?'start':i===n-1?'end':'middle')+'" class="tx">'+esc(l)+'</text>'});
    ser.forEach(function(s){g+='<polyline points="'+s[2].map(function(v,i){return X(i).toFixed(1)+','+Y(v).toFixed(1)}).join(' ')+'" style="fill:none;stroke:'+s[1]+';stroke-width:'+(s[3]?1.75:2.25)+(s[3]?';stroke-dasharray:6 5':'')+';stroke-linejoin:round;stroke-linecap:round"/>';
      if(!s[3])g+=s[2].map(function(v,i){return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3" style="fill:var(--card);stroke:'+s[1]+';stroke-width:1.75"><title>'+esc(s[0]+', '+labels[i]+': '+v+' guests')+'</title></circle>'}).join('')});
    return g+'</svg>'}
  /* vertical bars, stacked by side: rows [[label, {tep, alc}, sub]] */
  function vbars(rows,codes){var max=1;rows.forEach(function(r){var t=0;codes.forEach(function(c){t+=N(r[1][c])});max=Math.max(max,t)});
    return '<div class="an-vbars">'+rows.map(function(r){var t=0;codes.forEach(function(c){t+=N(r[1][c])});
      return '<div class="an-vb" title="'+esc(r[0]+': '+t+' guests')+'"><b>'+(t||'')+'</b><span class="bar">'+codes.map(function(c){return N(r[1][c])?'<i style="height:'+(N(r[1][c])/max*100).toFixed(1)+'%;background:'+COL[c]+'"></i>':''}).join('')+'</span><em>'+esc(r[0])+'</em>'+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</div>'}).join('')+'</div>'}

  /* ---------- the cards ---------- */
  function table(S,rg){var row=function(x){var gp=pct(N(x.guests),N(x.guests_prev));
      return '<tr><th>'+swatch(x.code)+esc(NAMES[x.code])+'</th><td><b>'+N(x.guests)+'</b>'+chg(gp)+'</td><td><b>'+N(x.bookings)+'</b></td><td><b>'+N(x.seated)+'</b></td><td><b>'+N(x.walkin_guests)+'</b></td><td><b>'+(N(x.bookings)?(N(x.guests)/N(x.bookings)).toFixed(1):'0')+'</b></td><td><b>'+(N(x.guest_keys)?Math.round(N(x.returning)/N(x.guest_keys)*100):0)+'%</b></td><td><b>'+N(x.next7)+'</b></td></tr>'};
    return '<div class="an-tblw"><table class="an-tbl"><thead><tr><th></th><th>Guests booked <small>vs the '+rg.days+' days before</small></th><th>Bookings</th><th>Guests seated</th><th>Walk-in guests</th><th>Average group</th><th>Returning guests</th><th>Booked, next 7 days</th></tr></thead><tbody>'+S.map(row).join('')+'</tbody></table></div>'+
      /* phones: one tile per side */
      '<div class="an-tiles">'+S.map(function(x){var gp=pct(N(x.guests),N(x.guests_prev));return '<div class="an-tile" style="--c:'+COL[x.code]+'"><h3>'+esc(NAMES[x.code])+'</h3><div class="an-kpis">'+
        '<div><b>'+N(x.guests)+'</b><span>guests booked '+chg(gp)+'</span></div><div><b>'+N(x.seated)+'</b><span>guests seated</span></div><div><b>'+N(x.walkin_guests)+'</b><span>walk-in guests</span></div><div><b>'+N(x.next7)+'</b><span>booked, next 7 days</span></div></div></div>'}).join('')+'</div>'}
  function paceCard(S,rg){var ks=[30,21,14,10,7,5,3,2,1,0];
    if(!S.some(function(x){var P=x.pace||{};return N(P.now_cur)||N(P.now_prev)}))return card('Are bookings building normally?',empty('No bookings in this period yet.'),'span2','clock');
    var body=S.map(function(x){var P=x.pace||{},cur=P.cur||{},prev=P.prev||{},known=P.known||{},kn=ks.filter(function(k){return known[k]});
      var vals=ks.map(function(k){return N(cur[k])}),pv=ks.map(function(k){return N(prev[k])});
      var head=kn.length?'<b>'+N(cur[kn[kn.length-1]])+'</b> guests booked '+(kn[kn.length-1]===0?'by the day':kn[kn.length-1]+' days before')+chg(pct(N(cur[kn[kn.length-1]]),N(prev[kn[kn.length-1]]))):'On the books now: <b>'+N(P.now_cur)+'</b> guests'+chg(pct(N(P.now_cur),N(P.now_prev)));
      var ser=[[NAMES[x.code]+', before',  'var(--muted)',pv,1],[NAMES[x.code],COL[x.code],vals.map(function(v,i){return known[ks[i]]||!kn.length?v:null}).filter(function(v){return v!=null})]];
      if(ser[1][2].length<2)ser[1][2]=vals;
      return '<div class="an-pace"><div class="an-ph">'+swatch(x.code)+'<span>'+esc(NAMES[x.code])+'</span><span class="an-pr">'+head+'</span></div>'+lines(ser,ks.map(function(k){return k===0?'Day':String(k)}),window.innerWidth<=760?{W:380,H:230}:null)+'</div>'}).join('');
    return card('Are bookings building normally?',body+'<div class="an-key"><span><i class="an-ln"></i>This period</span><span><i class="an-ln dash"></i>The '+rg.days+' days before</span></div>'+'<p class="an-note">Guests booked by the number of days before the visit. Cancellations and walk-ins left out.</p>','span2 an-tall','clock')}
  function growCard(S,rg){var wk={};S.forEach(function(x){(x.weekly||[]).forEach(function(w){wk[w.w]=1})});var keys=Object.keys(wk).sort();
    if(!keys.length)return card('Are we growing?',empty('No guests booked in this period yet.'),'','chart');
    var bym=keys.length>10,lab=[],ks=[];keys.forEach(function(w){var k=bym?w.slice(0,7):w;if(ks.indexOf(k)<0){ks.push(k);lab.push(bym?MN[+k.slice(5,7)-1]:nice(k))}});
    var ser=S.map(function(x){var m={};(x.weekly||[]).forEach(function(w){var k=bym?w.w.slice(0,7):w.w;m[k]=(m[k]||0)+N(w.g)});return [NAMES[x.code],COL[x.code],ks.map(function(k){return m[k]||0})]});
    return card('Are we growing?',key(S.map(function(x){return [NAMES[x.code],COL[x.code]]}))+(ks.length>1?lines(ser,lab,window.innerWidth<=760?{W:380,H:240}:{W:420,H:260}):vbars([[lab[0],{tep:ser[0][2][0],alc:ser[1][2][0]}]],['tep','alc']))+'<p class="an-note">Guests booked each '+(bym?'month':'week')+' in this period.</p>','','chart')}
  function cameCard(S){var segs=[['Seated','var(--an-c-done)',1],['Not marked','var(--an-c-none)',1],['Still to come','var(--an-c-info)',1],['Cancelled','var(--an-c-warn)',1],['No-show','var(--an-c-bad)',1]];
    return card('Did booked guests come?',stacks(S,segs,function(x){return [N(x.seated),N(x.not_marked),N(x.to_come),N(x.cancelled),N(x.no_show)]},{none:'No bookings in this period yet.'})+'<p class="an-note">Guests booked in this period. Not marked: nobody tapped Arrived or No-show for them.</p>','','check')}
  /* v86: did the front desk capture it? How often staff answered the questions that feed these reports, from the same data. */
  function capCard(S){var rows=[];S.forEach(function(x){var o=x.origin||{},tot=0;Object.keys(o).forEach(function(k){tot+=N(o[k])});var w=x.walkin_origin||{},wt=N(w.local)+N(w.visitor)+N(w.not_asked),m=N(x.seated)+N(x.not_marked);
      rows.push([NAMES[x.code]+': where the guest is staying',tot-N(o.unknown),tot]);if(wt)rows.push([NAMES[x.code]+': walk-ins, where they are staying',wt-N(w.not_asked),wt]);if(m)rows.push([NAMES[x.code]+': arrivals marked',N(x.seated),m])});
    rows=rows.filter(function(r){return r[2]>0});if(!rows.length)return card('Did we capture it?',empty('Nothing to check yet. This fills in once service starts.'),'','check');
    var body='<div class="an-grills">'+rows.map(function(r){var p=Math.round(r[1]/r[2]*100),c=p>=80?'var(--an-c-done)':p>=60?'var(--an-c-warn)':'var(--an-c-bad)';
      return '<div class="an-g"><div class="an-gh"><b>'+esc(r[0])+'</b><span><b>'+p+'%</b></span></div><span class="an-meter" role="img" aria-label="'+p+' per cent"><i style="width:'+p+'%;background:'+c+'"></i></span><small>'+r[1]+' of '+r[2]+' guests</small></div>'}).join('')+'</div>';
    return card('Did we capture it?',body+'<p class="an-note">Green is 80% or more. Below that, remind the team at the pre-shift briefing to ask, and to tap Arrived.</p>','span2 an-cap2','check')}
  function grillCard(S){var t=S.filter(function(x){return x.code==='tep'})[0],st=(t&&t.sittings)||[];if(!st.length)return '';
    var body='<div class="an-grills">'+st.map(function(s){var p=N(s.seats)?Math.round(N(s.guests)/N(s.seats)*100):0;
      return '<div class="an-g"><div class="an-gh"><b>'+esc(tl(s.time))+' sitting</b><span><b>'+p+'%</b> of grill seats</span></div><span class="an-meter" role="img" aria-label="'+p+' per cent of grill seats booked"><i style="width:'+Math.min(100,p)+'%"></i></span><small>'+N(s.guests)+' guests booked, '+N(s.seats)+' seats offered</small></div>'}).join('')+'</div>';
    return card('How full are the grills?',body+'<p class="an-note">Guests booked as a share of all grill seats offered, each open evening in this period.</p>','','grill')}
  function busyCard(S){var rows=[];S.forEach(function(x){var H=x.heat||{};var pers=x.code==='tep'?((x.sittings||[]).map(function(s){return s.time}).concat(Object.keys(H).map(function(k){return k.split('_')[1]})).filter(function(v,i,a){return v&&a.indexOf(v)===i}).sort()):['lunch','dinner'];
      pers.forEach(function(p){rows.push([x.code,(x.code==='tep'?'Teppanyaki '+tl(p):p==='lunch'?'Lunch':'Dinner'),[1,2,3,4,5,6,7].map(function(d){return N(H[d+'_'+p])})])})});
    var mx=1;rows.forEach(function(r){r[2].forEach(function(v){mx=Math.max(mx,v)})});
    var any=rows.some(function(r){return r[2].some(function(v){return v})});
    var g='<div class="an-scroll"><div class="an-heat"><span></span>'+DN.map(function(d){return '<em>'+d+'</em>'}).join('')+rows.map(function(r){return '<div class="r">'+swatch(r[0])+esc(r[1])+'</div>'+r[2].map(function(n){var a=n/mx;return '<span style="background:'+(n?'color-mix(in srgb,'+COL[r[0]]+' '+Math.round(12+a*78)+'%,var(--card))':'var(--an-zero)')+';color:'+(a>.5?'#1d2a31':'var(--ink2)')+'" title="'+esc(r[1]+': '+n+' guests')+'">'+(n||'')+'</span>'}).join('')}).join('')+'</div></div>';
    return card('When are we busy?',(any?g+'<p class="an-note">Guests booked in this period, by day of the week. The darker the square, the busier.</p>':empty('No bookings in this period yet.')),'an-full','cal')}
  function leadCard(S){var b=['same','d1_3','d4_7','d8_14','d15'],segs=[['Same day','var(--an-c-l1)',1],['1 to 3 days','var(--an-c-l2)',1],['4 to 7 days','var(--an-c-l3)',1],['8 to 14 days','var(--an-c-l4)',1],['15 days or more','var(--an-c-l5)',1]];
    return card('How far ahead do guests book?',stacks(S,segs,function(x){var L=x.lead||{};return b.map(function(k){return N(L[k])})},{tot:function(){return ''}})+'<p class="an-note">Share of bookings in this period by how far ahead they were made. Walk-ins are not included.</p>','','clock')}
  function originCard(S){var segs=[['Hotel guests','var(--an-c-hotel)',1],['Locals','var(--an-c-local)',1],['Other visitors','var(--an-c-visit)',1],['Not recorded','var(--an-c-none)',1]];
    var hot={};S.forEach(function(x){(x.hotels||[]).forEach(function(h){hot[h.name]=(hot[h.name]||0)+N(h.guests)})});var top=Object.keys(hot).sort(function(a,b){return hot[b]-hot[a]}).slice(0,5),mx=top.length?hot[top[0]]:1;
    var list=top.length?'<h3 class="an-sub">Top hotels</h3><div class="an-hbars">'+top.map(function(n){return '<div class="an-hb"><span>'+esc(n)+'</span><i style="width:'+(hot[n]/mx*100).toFixed(1)+'%"></i><b>'+hot[n]+'</b></div>'}).join('')+'</div>':'';
    return card('Where do guests come from?',stacks(S,segs,function(x){var o=x.origin||{};return [N(o.hotel),N(o.local),N(o.visitor),N(o.unknown)]})+list+'<p class="an-note">Guests in this period, from the "Where are you staying?" answer on each booking.</p>','','users')}
  function mixCard(S){var occ={};S.forEach(function(x){(x.occasion_list||[]).forEach(function(o){occ[o.name]=(occ[o.name]||0)+N(o.n)})});var on=Object.keys(occ).sort(function(a,b){return occ[b]-occ[a]}).slice(0,5),mx=on.length?occ[on[0]]:1;
    var t='<table class="an-tbl sm"><thead><tr><th></th><th>Celebrations</th><th>Large groups</th><th>Children</th></tr></thead><tbody>'+S.map(function(x){return '<tr><th>'+swatch(x.code)+esc(NAMES[x.code])+'</th><td><b>'+N(x.occasions)+'</b></td><td><b>'+N(x.groups8)+'</b></td><td><b>'+N(x.children)+'</b></td></tr>'}).join('')+'</tbody></table>';
    var l=on.length?'<h3 class="an-sub">What they celebrate</h3><div class="an-hbars">'+on.map(function(n){return '<div class="an-hb occ"><span>'+esc(n)+'</span><i style="width:'+(occ[n]/mx*100).toFixed(1)+'%"></i><b>'+occ[n]+'</b></div>'}).join('')+'</div>':'';
    return card('Celebrations and groups',t+'<p class="an-note">Large groups: 8 or more guests. Counted for bookings in this period.</p>'+l,'','star')}
  function aheadCard(S){var rows=[],big=[];var a0=(S[0]&&S[0].ahead)||[];a0.forEach(function(d,i){var o={};S.forEach(function(x){o[x.code]=N(((x.ahead||[])[i]||{}).g)});rows.push([wday(d.d),o,nice(d.d)])});
    S.forEach(function(x){(x.big_upcoming||[]).forEach(function(b){big.push([b.date,b.time,b.guests,x.code])})});big.sort(function(a,b){return (a[0]+a[1])<(b[0]+b[1])?-1:1});
    var any=rows.some(function(r){return N(r[1].tep)+N(r[1].alc)>0});
    return card('Coming up: the next 14 days',key(S.map(function(x){return [NAMES[x.code],COL[x.code]]}))+(any?'<div class="an-scroll">'+vbars(rows,['tep','alc'])+'</div>':empty('Nothing booked for the next 14 days yet.'))+
      (big.length?'<h3 class="an-sub">Groups of 8 or more</h3><ul class="an-list">'+big.slice(0,4).map(function(b){return '<li>'+swatch(b[3])+esc(wday(b[0])+' '+nice(b[0])+', '+tl(b[1]))+'<b>'+b[2]+' guests</b></li>'}).join('')+'</ul>':''),'span2','bell')}
  function walkCard(S,rg){var segs=[['Locals','var(--an-c-local)',1],['Visitors','var(--an-c-hotel)',1],['Did not ask','var(--an-c-none)',1]],g=0,gp=0;S.forEach(function(x){g+=N(x.walkin_guests);gp+=N(x.walkin_guests_prev)});
    return card('Walk-ins: who came without a booking?','<div class="an-big"><b>'+g+'</b><span>walk-in guests '+chg(pct(g,gp))+'</span></div>'+(g?stacks(S,segs,function(x){var o=x.walkin_origin||{};return [N(o.local),N(o.visitor),N(o.not_asked)]}):empty('No walk-ins recorded in this period. Staff add them with Add walk-in.'))+'<p class="an-note">Walk-in guests in this period, counted separately from bookings. The change compares with the '+rg.days+' days before.</p>','','user')}

  /* v93: chart text keeps its real size whatever the chart's width (at least the small-print size of the screen) */
  function svgText(){document.querySelectorAll('#kzs .an-svg').forEach(function(sv){var vb=sv.viewBox&&sv.viewBox.baseVal,w=sv.getBoundingClientRect().width;if(!vb||!vb.width||!w)return;
    var base=parseFloat(getComputedStyle(sv).getPropertyValue('--kz-fs-sup'))||14;base=Math.max(13,base-1);var k=vb.width/w;
    sv.querySelectorAll('text').forEach(function(t){t.style.fontSize=(base*k).toFixed(1)+'px';t.style.display=''});
    /* labels on the same line that would touch: keep the first and last, drop the ones in between that collide */
    var rows={};sv.querySelectorAll('text').forEach(function(t){var y=t.getAttribute('y');(rows[y]=rows[y]||[]).push(t)});
    Object.keys(rows).forEach(function(y){var ts=rows[y];if(ts.length<3)return;var bx=ts.map(function(t){try{return t.getBBox()}catch(e){return null}});
      var last=ts.length-1,prev=bx[0];for(var i=1;i<ts.length;i++){var b=bx[i];if(!b||!prev)continue;var gap=6*k;
        var hitNext=i<last&&bx[last]&&b.x+b.width+gap>bx[last].x;if(b.x<prev.x+prev.width+gap||hitNext){if(i<last){ts[i].style.display='none';continue}}prev=b}})})}
  window.addEventListener('resize',function(){clearTimeout(svgText.t);svgText.t=setTimeout(svgText,150)});
  function paint(d){var el=$('anb');if(!el)return;var rg=range(),S=(d.sides||[]).slice();
    var pre=!d.first_booking?'<div class="an-banner">'+kzIcon('spark')+'<div><b>No real bookings yet.</b> Kazumi opens on 14 November 2026. The figures start with the first real booking'+(me&&me.role==='admin'?'; tick "Include test bookings" to preview the screen.':'.')+'</div></div>':'';
    el.innerHTML=pre+(d.tests?'<div class="an-banner warn">'+kzIcon('alert')+'<div><b>Test bookings included.</b> These figures are a preview, not real business.</div></div>':'')+table(S,rg)+
      '<div class="an-grid">'+aheadCard(S)+growCard(S,rg)+paceCard(S,rg)+grillCard(S)+leadCard(S)+busyCard(S)+originCard(S)+mixCard(S)+walkCard(S,rg)+cameCard(S)+capCard(S)+'</div>';try{svgText()}catch(e){}}
  async function load(){var el=$('anb');if(!el)return;var rg=range(),n=++A.seq;
    $('anr').textContent=nice(rg.from)+' to '+nice(rg.to)+' '+rg.to.slice(0,4)+', compared with the '+rg.days+' days before';
    if(!A.data)el.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>';else el.classList.add('an-busy');
    var d;try{d=await call('staff_analytics',{p_from:rg.from,p_to:rg.to,p_tests:!!A.tests})}catch(e){if(n!==A.seq)return;el.classList.remove('an-busy');
      el.innerHTML='<div class="panel"><p class="muted">'+(/staff_analytics/.test(String(e&&e.message))?'Analytics needs a database update that has not been applied yet.':esc(errText(e)))+'</p></div>';return}
    if(n!==A.seq||!$('anb'))return;el.classList.remove('an-busy');
    if(!d||d.ok===false){el.innerHTML='<div class="panel"><p class="muted">'+(d&&d.error==='not_allowed'?'Only managers and admins can open Analytics.':'Analytics could not be loaded. Try again.')+'</p></div>';return}
    A.data=d;paint(d)}
  renderAnalytics=function(){var m=main();if(!m)return;
    if(!me||(me.role!=='admin'&&me.role!=='manager')){m.innerHTML='<div class="row" style="margin:0 0 14px"><h1>Analytics</h1></div><div class="panel"><p class="muted">Only managers and admins can open Analytics.</p></div>';return}
    A.data=null;
    /* v78: two views, as in the group Service Hub: Heartbeat (first, the default) and Owner view; remembered on this device */
    var view='hb';try{view=lsGet('kz_an_view')==='owner'?'owner':'hb'}catch(e){}
    var tabs='<div class="an-tabs" role="tablist" aria-label="Analytics views">'+[['hb','Daily demand','pulse'],['owner','Owner view','chart']].map(function(t){return '<button type="button" role="tab" data-anv="'+t[0]+'" aria-selected="'+(view===t[0])+'">'+kzIcon(t[2])+'<span>'+t[1]+'</span></button>'}).join('')+'</div>';
    var tests=me.role==='admin'?'<label class="check small an-t"><input type="checkbox" id="ant"'+(A.tests?' checked':'')+'>Include test bookings</label>':'';
    if(view==='hb'){m.innerHTML='<div class="an-head"><div><h1>Analytics</h1></div><div class="an-ctl">'+tests+'</div></div>'+tabs+'<div id="anb" aria-live="polite"></div>'}
    else m.innerHTML='<div class="an-head"><div><h1>Analytics</h1><p class="small muted" id="anr"></p></div>'+
      '<div class="an-ctl"><label class="an-period-field"><span>Period</span><select id="an-period" aria-label="Analytics period">'+RANGES.map(function(r){return '<option value="'+r[0]+'"'+(A.range===r[0]?' selected':'')+'>'+r[1]+'</option>'}).join('')+'</select></label>'+tests+'</div></div>'+tabs+'<div id="anb" aria-live="polite"></div>';
    m.querySelectorAll('[data-anv]').forEach(function(b){b.onclick=function(){try{lsSet('kz_an_view',b.dataset.anv)}catch(e){}renderAnalytics()}});
    var periodSelect=$('an-period');if(periodSelect)periodSelect.onchange=function(){A.range=periodSelect.value;try{lsSet('kz_an_range',A.range)}catch(e){}load()};
    var t=$('ant');if(t)t.onchange=function(){A.tests=t.checked;if(view==='hb')window.kz78HB(A.tests);else load()};
    if(view==='hb')return window.kz78HB(A.tests);
    load()};
})();
/* ======================================================================================================================
   v78 (21 Oct 2026): the Kazumi Heartbeat (asked for by Roneel; see docs/STAFF-APP-DESIGN.md, "v78"). Modelled on the
   Jack's Restaurants Service Hub "Reservations Heartbeat": the first tab of Analytics. Read-only: one new server call,
   staff_heartbeat (database change 20261021a), for managers and admins.
   1. Side: Both, Teppanyaki, Lunch and dinner. Period: the last 7, 30 or 90 days.
   2. Six tiles: guests due, guests booked, next 7 days, busiest day ahead, walk-ins, fullest Teppanyaki sitting ahead.
   3. Daily guests: a timeline to scroll day by day. Solid green: guests due to dine. Dashed purple: guests booked that
      day. Teal dots: walk-ins. Today, the opening day and closures are marked. Tap a day to read it.
   ====================================================================================================================== */
(function(){
  KZI.pulse='<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>';
  var H={side:'both',per:30,data:null,seq:0,tests:false},OPEN='2026-11-14',STEP=46;
  try{var sv=lsGet('kz_hb_side');if(sv==='tep'||sv==='alc'||sv==='both')H.side=sv;var pv=+lsGet('kz_hb_per');if(pv===7||pv===30||pv===90)H.per=pv}catch(e){}
  var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function add(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
  function gap(a,b){return Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/864e5)}
  function dt(d){return new Date(d+'T12:00:00Z')}
  function pretty(d){var x=dt(d);return DN[x.getUTCDay()]+' '+x.getUTCDate()+' '+MN[x.getUTCMonth()]}
  function N(v){return +v||0}
  /* a day's numbers for the chosen side: [due guests, due bookings, booked guests, bookings made, walk-in guests] */
  function day(P,d){var r=(P.days||{})[d];if(!r)return [0,0,0,0,0];
    if(H.side==='tep')return r.slice(0,5);if(H.side==='alc')return r.slice(5,10);return [0,1,2,3,4].map(function(i){return N(r[i])+N(r[i+5])})}
  function sum(P,from,to,k){var t=0,a=from;while(a<=to){t+=N(day(P,a)[k]);a=add(a,1)}return t}
  function pct(a,b){if(!b||b<20)return null;return Math.round((a-b)/b*100)}

  /* v104 (22 Oct 2026, unified analytics, approved direction from Roneel): Daily Walk-in Demand above the Daily Reservations
     Demand chart, and a Show switch on that chart (Reservations, Walk-ins, Both, Total guests), the same as the Jack's
     Restaurants Reservations Hub 2.72.0. Walk-ins are guests seated without a booking, counted in guests. Before the opening
     day nothing real is recorded, so those days show "Before opening", never 0 (unless test bookings are included).
     Colours by meaning: green due to dine, dashed purple booked that day, teal walk-ins, amber busiest day, slate total.
     Teppanyaki and Lunch and dinner stay side by side; no database change (staff_heartbeat already returns walk-ins). */
  var WKC='#1F7A8C',TOTC='#3d4b5c',MODE='res';try{var mv0=lsGet('kz_hb_mode');if(['res','walk','both','total'].indexOf(mv0)>-1)MODE=mv0}catch(e){}
  function wkCss(){if(document.getElementById('kz104-css'))return;var st=document.createElement('style');st.id='kz104-css';st.textContent=
    'body #kzs#kzs .hbw{background:var(--card);border:1px solid var(--line);border-radius:var(--kz-r2,14px);padding:20px;margin:16px 0}'+
    'body #kzs#kzs .hbw h3{margin:0 0 4px;font-size:20px;display:flex;align-items:center;gap:8px}body #kzs#kzs .hbw>p{margin:0 0 14px;color:var(--muted);line-height:1.45}'+
    'body #kzs#kzs .hbw .hb-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}'+
    'body #kzs#kzs .hbw-chart{margin:16px 0 4px;min-height:200px}body #kzs#kzs .hbw-chart svg{display:block;width:100%;height:auto;overflow:visible}'+
    'body #kzs#kzs .hbw-chart .t{fill:var(--muted);font-size:12.5px;font-weight:600}body #kzs#kzs .hbw-chart .v{fill:var(--ink,#1D2939);font-size:12.5px;font-weight:600}body #kzs#kzs .hbw-chart .gl{stroke:var(--line);stroke-width:1}'+
    'body #kzs#kzs .hbw-chart .nr{fill:var(--an-zero,#f2f4f3)}body #kzs#kzs .hbw-chart .nrt{fill:var(--muted);font-size:13px;font-weight:600}'+
    'body #kzs#kzs .hbw-note{margin:12px 0 0;padding:12px 16px;border-radius:10px;background:#f4f8f8;border:1px solid #d6e6e8;line-height:1.45;color:#2b4a4e}body #kzs#kzs.eve .hbw-note{background:#17303a;color:#d6e6e8;border-color:#24495a}'+
    'body #kzs#kzs .hbw-ins{margin:12px 0 0;line-height:1.45}body #kzs#kzs .hbw-ins:empty{display:none}'+
    'body #kzs#kzs .hbw-vt{width:100%;border-collapse:collapse;margin:16px 0 0}body #kzs#kzs .hbw-vt th{text-align:left;font-size:13px;font-weight:600;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line)}'+
    'body #kzs#kzs .hbw-vt td{padding:10px;border-bottom:1px solid var(--line)}body #kzs#kzs .hbw-vt .n{text-align:right;font-variant-numeric:tabular-nums}body #kzs#kzs .hbw-vt tr.tot td{font-weight:600;border-bottom:0}'+
    'body #kzs#kzs .hbr-mode{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:4px 0 10px}body #kzs#kzs .hbr-mode>span{font-weight:600}'+
    'body #kzs#kzs .hbr-svg .ln-wk{fill:none;stroke:'+WKC+';stroke-width:2.75;stroke-linejoin:round;stroke-linecap:round}body #kzs#kzs .hbr-svg .ln-tot{fill:none;stroke:'+TOTC+';stroke-width:2.75;stroke-linejoin:round;stroke-linecap:round}'+
    'body #kzs#kzs .hbr-svg .pt-tot{fill:var(--card);stroke:'+TOTC+';stroke-width:2}body #kzs#kzs .k-wkl i{background:'+WKC+'}body #kzs#kzs .k-tot i{background:'+TOTC+'}'+
    '@media (max-width:1199px){body #kzs#kzs .hbw .hb-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
    '@media (max-width:600px){body #kzs#kzs .hbw{padding:14px}body #kzs#kzs .hbw-vt .hs{display:none}body #kzs#kzs .hbr-mode .an-seg{width:100%}body #kzs#kzs .hbr-mode .an-seg button{flex:1 1 0;padding:0 6px}}';document.head.appendChild(st)}
  function modeBar(){return '<div class="hbr-mode"><span>Show</span><div class="an-seg" role="group" aria-label="What the chart shows">'+[['res','Reservations'],['walk','Walk-ins'],['both','Both'],['total','Total guests']].map(function(x){return '<button type="button" data-hbm="'+x[0]+'" aria-pressed="'+(MODE===x[0])+'">'+x[1]+'</button>'}).join('')+'</div></div>'}
  function lineKey(){var g='<span class="k-due"><i></i>Guests due to dine</span>',b='<span class="k-bk"><i></i>Guests booked that day</span>',w='<span class="k-wkl"><i></i>Walk-in guests</span>',t='<span class="k-tot"><i></i>Total guests, due plus walk-ins</span>',c='<span class="k-cl"><i></i>Closed</span>';
    return '<div class="hbr-key">'+(MODE==='res'?g+b+'<span class="k-wk"><i></i>Walk-ins</span>':MODE==='walk'?w:MODE==='both'?g+b+w:t+g+w)+c+'</div>'}
  /* the first day walk-ins can be real: the opening day (any day when test bookings are included) */
  function wkFrom(P){return P.tests?'2000-01-01':OPEN}
  function wkWin(P){var T=P.today,from=add(T,-(H.per-1)),f=wkFrom(P),a=from<f?f:from;return {T:T,from:from,a:a,f:f,rec:a>T?0:gap(a,T)+1}}
  function f1(n){return n<10&&n%1?n.toFixed(1):Math.round(n).toLocaleString()}
  function sideDay(P,d,k){var r=(P.days||{})[d];if(!r)return 0;return k==='tep'?N(r[4]):N(r[9])}
  function wkSec(P){wkCss();var W=wkWin(P),Nn=H.per,wk=0,due=0,best=null;
    if(W.rec)for(var x=W.a;x<=W.T;x=add(x,1)){var r=day(P,x);wk+=N(r[4]);due+=N(r[0]);if(N(r[4])&&(!best||N(r[4])>best[1]))best=[x,N(r[4])]}
    var pa=add(W.from,-Nn),cmp=null;if(pa>=W.f){var pw=sum(P,pa,add(W.from,-1),4);if(pw>=10)cmp=Math.round((wk-pw)/pw*100)}
    var head='<h3>'+kzIcon('user')+'Daily Walk-in Demand</h3><p>Guests seated without a booking.</p>';
    if(!W.rec)return '<section class="hbw" id="kz-wk">'+head+'<p class="hbw-note">Walk-ins show here from opening night, '+esc(pretty(OPEN))+' 2026.</p></section>';
    var part=W.rec<Nn?' (recorded '+W.rec+(W.rec===1?' day':' days')+' of '+Nn+')':'';
    var L=0,D=0;if(H.side==='both'&&W.rec)for(var y=W.a;y<=W.T;y=add(y,1)){L+=sideDay(P,y,'tep');D+=sideDay(P,y,'alc')}
    var split=H.side!=='both'?tile('blue','grill','Side shown',H.side==='tep'?'Teppanyaki':'Lunch and dinner','Switch to Both to compare the two'):
      L+D?tile('blue','grill','Where walk-ins sit',(L>=D?'Teppanyaki ':'Lunch and dinner ')+Math.round(Math.max(L,D)/(L+D)*100)+'%',(L>=D?'Lunch and dinner ':'Teppanyaki ')+Math.round(Math.min(L,D)/(L+D)*100)+'% of walk-in guests'):tile('blue','grill','Where walk-ins sit','—','Nothing recorded yet');
    var tiles='<div class="hb-tiles">'+
      tile('teal','user','Walk-in guests',wk.toLocaleString(),cmp==null?'In the last '+Nn+' days'+part:(cmp>0?'Up ':cmp<0?'Down ':'Same as ')+(cmp?Math.abs(cmp)+'% on ':'')+'the '+Nn+' days before')+
      tile('teal','cal','Average a day',wk?f1(wk/W.rec):'—',wk?'Walk-in guests a day, over '+W.rec+(W.rec===1?' recorded day':' recorded days'):'Nothing recorded yet')+
      tile('amber','bell','Busiest walk-in day',best?esc(pretty(best[0])):'—',best?best[1]+(best[1]===1?' walk-in guest':' walk-in guests'):'Nothing recorded yet')+split+'</div>';
    var share=wk+due>0?Math.round(wk/(wk+due)*100):null;
    var note=wk?'':'<p class="hbw-note">No walk-ins recorded in these days.</p>';
    var ins=wk&&share!=null?'Walk-ins were '+share+'% of all guests over the recorded days'+(cmp!=null?', '+(cmp>=0?'up':'down')+' on the '+Nn+' days before':'')+'.':'';
    var tbl='';if(H.side==='both'&&wk){var sd=function(k){var g=0,b=0,bb=null;for(var z=W.a;z<=W.T;z=add(z,1)){var r=(P.days||{})[z]||[],o=k==='tep'?0:5,v=N(r[o+4]);g+=v;b+=N(r[o]);if(v&&(!bb||v>bb[1]))bb=[z,v]}return {g:g,b:b,best:bb}};
      var row=function(nm,x,c){var sh=x.g+x.b>0?Math.round(x.g/(x.g+x.b)*100):null;return '<tr'+(c?' class="tot"':'')+'><td>'+nm+'</td><td class="n">'+x.g.toLocaleString()+'</td><td class="n hs">'+(x.g?f1(x.g/W.rec):'—')+'</td><td class="hs">'+(x.best?esc(pretty(x.best[0]))+' ('+x.best[1]+')':'—')+'</td><td class="n">'+(sh==null?'—':sh+'%')+'</td></tr>'};
      var A1=sd('tep'),B1=sd('alc');
      tbl='<table class="hbw-vt"><thead><tr><th>Side</th><th class="n">Walk-in guests</th><th class="n hs">A day</th><th class="hs">Busiest day</th><th class="n">Share of its guests</th></tr></thead><tbody>'+row('Teppanyaki',A1)+row('Lunch and dinner',B1)+row('Kazumi total',{g:A1.g+B1.g,b:A1.b+B1.b,best:null},1)+'</tbody></table>'}
    return '<section class="hbw" id="kz-wk">'+head+tiles+'<div class="hbw-chart" data-wkc role="img" aria-label="Walk-in guests each day"></div>'+note+'<p class="hbw-ins">'+ins+'</p>'+tbl+'</section>'}
  function wkChart(box,P){var el=box.querySelector('[data-wkc]');if(!el)return;var W=wkWin(P),days=[];for(var x=W.from;x<=W.T;x=add(x,1))days.push(x);
    var Wd=Math.max(300,el.clientWidth||800),Hh=210,L=34,R=8,top=26,bot=170,n=days.length,cw=(Wd-L-R)/n,bw=Math.max(2,Math.min(38,cw*.62));
    var vals=days.map(function(d){return d<W.f?null:N(day(P,d)[4])}),hi=Math.max(4,Math.max.apply(null,vals.map(function(v){return v||0})));
    var tick=Math.ceil(hi/4),mx=tick*4,yy=function(v){return bot-v/mx*(bot-top)},bi=-1,bv=0;vals.forEach(function(v,i){if(v>bv){bv=v;bi=i}});
    var o='<svg viewBox="0 0 '+Wd+' '+Hh+'" width="'+Wd+'" height="'+Hh+'">';
    for(var t=0;t<=4;t++){var y=yy(t*tick);o+='<line x1="'+L+'" x2="'+(Wd-R)+'" y1="'+y+'" y2="'+y+'" class="gl"/><text x="'+(L-6)+'" y="'+(y+4)+'" class="t" text-anchor="end">'+t*tick+'</text>'}
    var nr=vals.filter(function(v){return v===null}).length;if(nr){var w0=nr*cw;o+='<rect x="'+L+'" y="'+top+'" width="'+w0+'" height="'+(bot-top)+'" class="nr"/>'+(w0>110?'<text x="'+(L+w0/2)+'" y="'+((top+bot)/2+5)+'" class="nrt" text-anchor="middle">Before opening</text>':'')}
    var step=n<=7?1:Math.max(n<=31?5:14,Math.ceil((n<=7?90:60)/cw)),showV=cw>=24;
    days.forEach(function(d,i){var cx=L+cw*i+cw/2,v=vals[i],tt=esc(pretty(d))+': '+(v===null?'before opening':v+(v===1?' walk-in guest':' walk-in guests'));
      if(d===W.T)o+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(top-6)+'" y2="'+bot+'" stroke="#9ab5c7" stroke-width="1.5" stroke-dasharray="3 5"/><text x="'+cx+'" y="'+(top-10)+'" class="t" text-anchor="middle">Today</text>';
      if(v)o+='<rect x="'+(cx-bw/2)+'" y="'+yy(v)+'" width="'+bw+'" height="'+(bot-yy(v))+'" rx="'+Math.min(4,bw/3)+'" fill="'+(i===bi?'#cd9c33':WKC)+'"><title>'+tt+'</title></rect>'+(showV?'<text x="'+cx+'" y="'+(yy(v)-6)+'" class="v" text-anchor="middle">'+v+'</text>':'');
      else o+='<rect x="'+(cx-cw/2)+'" y="'+top+'" width="'+cw+'" height="'+(bot-top)+'" fill="transparent"><title>'+tt+'</title></rect>';
      if((n-1-i)%step===0)o+='<text x="'+cx+'" y="'+(bot+30)+'" class="t" text-anchor="middle">'+(n<=7?DN[dt(d).getUTCDay()]+' ':'')+dt(d).getUTCDate()+' '+MN[dt(d).getUTCMonth()]+'</text>'});
    el.innerHTML=o+'</svg>'}
  function tile(c,ic,label,val,cap){return '<article class="hb-tile hb-'+c+'"><div class="hb-tt">'+kzIcon(ic)+'<span>'+label+'</span></div><strong>'+val+'</strong><small>'+cap+'</small></article>'}
  function now12(){var p=new Intl.DateTimeFormat('en-US',{timeZone:'Pacific/Fiji',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());return p}

  function render(P){var box=$('anb');if(!box)return;var T=P.today,N0=H.per,from=add(T,-(N0-1)),pfrom=add(from,-N0),pto=add(from,-1);
    var due=sum(P,from,T,0),dueP=sum(P,pfrom,pto,0),bk=sum(P,from,T,2),bkB=sum(P,from,T,3),wk=sum(P,from,T,4),n7=sum(P,T,add(T,6),0),n7b=sum(P,T,add(T,6),1),best=null;
    for(var i=0;i<14;i++){var x=add(T,i),g=day(P,x)[0];if(!best||g>best[1])best=[x,g]}
    /* fullest Teppanyaki sitting in the next 14 days, as a share of the grill seats */
    var fs=null;if(H.side!=='alc')(P.sittings||[]).forEach(function(s){if(!fs||N(s.g)>N(fs.g))fs=s});
    var fp=fs&&N(P.seats)?Math.round(N(fs.g)/N(P.seats)*100):0,pc=pct(due,dueP);
    var pre=!P.first_booking?'<div class="an-banner">'+kzIcon('spark')+'<div><b>No real bookings yet.</b> Kazumi opens on 14 November 2026. The Heartbeat starts with the first real booking'+(me&&me.role==='admin'?'; tick "Include test bookings" to preview it.':'.')+'</div></div>':'';
    var tst=P.tests?'<div class="an-banner warn">'+kzIcon('alert')+'<div><b>Test bookings included.</b> A preview, not real business.</div></div>':'';
    var sides='<div class="an-seg hb-sides" role="group" aria-label="Show">'+[['both','Both'],['tep','Teppanyaki'],['alc','Lunch and dinner']].map(function(s){return '<button type="button" data-hbs="'+s[0]+'" aria-pressed="'+(H.side===s[0])+'">'+s[1]+'</button>'}).join('')+'</div>';
    var pers='<div class="an-seg hb-pers" role="group" aria-label="Period">'+[7,30,90].map(function(p){return '<button type="button" data-hbp="'+p+'" aria-pressed="'+(H.per===p)+'">'+p+' days</button>'}).join('')+'</div>';
    box.innerHTML=pre+tst+'<section class="hb">'+
      '<div class="hb-head"><div><h2>The last '+N0+' days <span class="hb-live"><i></i>Live · updated '+now12()+'</span></h2></div><div class="hb-ctl">'+sides+pers+'</div></div>'+
      '<div class="hb-tiles">'+
        tile('green','users','Guests due',due.toLocaleString(),pc==null?'Not enough to compare yet':(pc>0?'Up ':pc<0?'Down ':'Same as ')+(pc?Math.abs(pc)+'% on ':'')+'the '+N0+' days before')+
        tile('purple','edit','Guests booked',bk.toLocaleString(),bkB+(bkB===1?' booking':' bookings'))+
        tile('blue','cal','Next 7 days',n7.toLocaleString(),n7b+(n7b===1?' booking':' bookings')+' on the books')+
        tile('amber','bell','Busiest day ahead',best&&best[1]?esc(pretty(best[0])):'—',best&&best[1]?best[1]+' guests due':'Nothing booked in the next 14 days')+
        tile('teal','user','Walk-ins',wk.toLocaleString(),'Without a booking')+
        (H.side!=='alc'?tile('copper','grill','Fullest sitting ahead',fs&&N(fs.g)?fp+'%':'—',fs&&N(fs.g)?esc(pretty(fs.d)+', '+tl(fs.t))+' · '+N(fs.g)+' of '+N(P.seats)+' grill seats':'No Teppanyaki booked in the next 14 days'):
          tile('copper','alert','Closures ahead',String((P.closures||[]).filter(function(c){return String(c.d).slice(0,10)>=T}).length),'Days or services closed in the next year'))+
      '</div>'+wkSec(P)+rail(P)+'</section>';
    box.querySelectorAll('[data-hbs]').forEach(function(b){b.onclick=function(){H.side=b.dataset.hbs;try{lsSet('kz_hb_side',H.side)}catch(e){}render(P)}});
    box.querySelectorAll('[data-hbp]').forEach(function(b){b.onclick=function(){H.per=+b.dataset.hbp;try{lsSet('kz_hb_per',String(H.per))}catch(e){}render(P)}});
    railWire(box,P);wkChart(box,P)}

  /* ---------- daily guests: one wide drawing, scrolled sideways ---------- */
  function span(P){var T=P.today,a=add(T,-30),b=add(T,180);var ks=Object.keys(P.days||{}).sort();
    if(ks.length){if(ks[0]<a)a=ks[0];if(ks[ks.length-1]>b)b=ks[ks.length-1]}if(P.first_made&&P.first_made<a)a=P.first_made;if(b<add(OPEN,60))b=add(OPEN,60);if(b<'2028-12-31')b='2028-12-31';/* v98: the timeline always runs to the end of December 2028 */return [a,b]}
  /* v98 (21 Oct 2026): holidays and events on the timeline, from shared/holidays-2026-2028.json (date, end, group, kind, expected, name).
     Rows: Fiji, Japan, international, Australia, New Zealand. A hollow mark means the date is expected, not yet announced. */
  var KZHOL=[["2026-08-11",0,"jp","h",0,"Mountain Day (Yama no Hi)"],["2026-08-13","2026-08-16","jp","e",0,"Festival of the Dead (Obon)"],["2026-08-24",0,"fj","h",0,"Prophet Mohammed's Birthday"],["2026-09-06",0,"intl","e",0,"Father's Day (Fiji)"],["2026-09-19","2026-10-04","au","s",0,"School holidays: Victoria"],["2026-09-19","2026-10-05","au","s",0,"School holidays: Queensland"],["2026-09-19","2026-09-23","jp","e",0,"Silver Week (Shirubā Uīku)"],["2026-09-21",0,"jp","h",0,"Respect for the Aged Day (Keirō no Hi)"],["2026-09-22",0,"jp","h",0,"Citizens' Holiday (Kokumin no Kyūjitsu)"],["2026-09-23",0,"jp","h",0,"Autumnal Equinox Day (Shūbun no Hi)"],["2026-09-26","2026-10-11","nz","s",0,"School holidays: New Zealand"],["2026-09-28","2026-10-09","au","s",0,"School holidays: New South Wales"],["2026-10-05",0,"au","h",0,"King's Birthday (Queensland only)"],["2026-10-10",0,"fj","h",0,"Fiji Day"],["2026-10-12",0,"jp","h",0,"Sports Day (Supōtsu no Hi)"],["2026-10-26",0,"nz","h",0,"Labour Day"],["2026-10-31",0,"intl","e",0,"Halloween"],["2026-11-01",0,"jp","e",0,"Sushi Day (Sushi no Hi)"],["2026-11-03",0,"jp","h",0,"Culture Day (Bunka no Hi)"],["2026-11-09",0,"fj","h",0,"Diwali"],["2026-11-15",0,"jp","e",0,"Seven-Five-Three Festival (Shichi-Go-San)"],["2026-11-23",0,"jp","h",0,"Labour Thanksgiving Day (Kinrō Kansha no Hi)"],["2026-11-24",0,"jp","e",0,"Washoku Day (Washoku no Hi)"],["2026-12-09",0,"fj","e",1,"National Referendum (public holiday expected)"],["2026-12-12","2027-01-26","au","s",0,"School holidays: Queensland"],["2026-12-18","2027-01-27","au","s",0,"School holidays: New South Wales"],["2026-12-19","2027-01-26","au","s",0,"School holidays: Victoria"],["2026-12-19","2027-01-27","nz","s",0,"School holidays: New Zealand"],["2026-12-24",0,"intl","e",0,"Christmas Eve"],["2026-12-25",0,"au","h",0,"Christmas Day"],["2026-12-25",0,"fj","h",0,"Christmas Day"],["2026-12-25",0,"nz","h",0,"Christmas Day"],["2026-12-28",0,"au","h",0,"Boxing Day"],["2026-12-28",0,"fj","h",0,"Boxing Day"],["2026-12-28",0,"nz","h",0,"Boxing Day (observed)"],["2026-12-31",0,"intl","e",0,"New Year's Eve"],["2026-12-31",0,"jp","e",0,"New Year's Eve (Ōmisoka)"],["2027-01-01",0,"au","h",0,"New Year's Day"],["2027-01-01",0,"fj","h",1,"New Year's Day"],["2027-01-01",0,"jp","h",0,"New Year's Day (Ganjitsu)"],["2027-01-01","2027-01-03","jp","e",0,"New Year (Shōgatsu)"],["2027-01-01",0,"nz","h",0,"New Year's Day"],["2027-01-04",0,"nz","h",0,"Day after New Year's Day (observed)"],["2027-01-11",0,"jp","h",0,"Coming of Age Day (Seijin no Hi)"],["2027-01-26",0,"au","h",0,"Australia Day"],["2027-02-03",0,"jp","e",0,"Bean-Throwing Festival (Setsubun)"],["2027-02-06",0,"intl","e",0,"Chinese New Year (Lunar New Year)"],["2027-02-08",0,"intl","e",1,"Ramadan begins"],["2027-02-08",0,"nz","h",0,"Waitangi Day (observed)"],["2027-02-11",0,"jp","h",0,"National Foundation Day (Kenkoku Kinen no Hi)"],["2027-02-14",0,"intl","e",0,"Valentine's Day"],["2027-02-23",0,"jp","h",0,"Emperor's Birthday (Tennō Tanjōbi)"],["2027-03-03",0,"jp","e",0,"Girls' Day / Doll Festival (Hinamatsuri)"],["2027-03-08",0,"intl","e",0,"International Women's Day"],["2027-03-10",0,"intl","e",1,"Eid al-Fitr"],["2027-03-14",0,"jp","e",0,"White Day (Howaito Dē)"],["2027-03-20","2027-04-10","jp","e",1,"Cherry Blossom Season (Hanami)"],["2027-03-21",0,"jp","h",0,"Vernal Equinox Day (Shunbun no Hi)"],["2027-03-22",0,"intl","e",1,"Holi"],["2027-03-22",0,"jp","h",0,"Substitute Holiday (Furikae Kyūjitsu)"],["2027-03-26",0,"au","h",0,"Good Friday"],["2027-03-26","2027-04-11","au","s",0,"School holidays: Victoria"],["2027-03-26","2027-04-11","au","s",0,"School holidays: Queensland"],["2027-03-26",0,"fj","h",1,"Good Friday"],["2027-03-26",0,"nz","h",0,"Good Friday"],["2027-03-27","2027-03-29","au","h",0,"Easter Saturday to Easter Monday"],["2027-03-27",0,"fj","h",1,"Easter Saturday"],["2027-03-28",0,"intl","e",0,"Easter Sunday"],["2027-03-29",0,"fj","h",1,"Easter Monday"],["2027-03-29",0,"nz","h",0,"Easter Monday"],["2027-04-10","2027-04-26","nz","s",0,"School holidays: New Zealand"],["2027-04-12","2027-04-23","au","s",0,"School holidays: New South Wales"],["2027-04-25","2027-04-26","au","h",0,"Anzac Day"],["2027-04-26",0,"nz","h",0,"Anzac Day (observed)"],["2027-04-29",0,"jp","h",0,"Showa Day (Shōwa no Hi)"],["2027-04-29","2027-05-05","jp","e",0,"Golden Week (Gōruden Uīku)"],["2027-05-03",0,"jp","h",0,"Constitution Memorial Day (Kenpō Kinenbi)"],["2027-05-04",0,"jp","h",0,"Greenery Day (Midori no Hi)"],["2027-05-05",0,"jp","h",0,"Children's Day (Kodomo no Hi)"],["2027-05-09",0,"intl","e",0,"Mother's Day (Fiji)"],["2027-05-14",0,"fj","h",1,"Girmit Day"],["2027-05-28",0,"fj","h",1,"Ratu Sir Lala Sukuna Day"],["2027-06-07",0,"nz","h",0,"King's Birthday"],["2027-06-14",0,"au","h",0,"King's Birthday"],["2027-06-25",0,"nz","h",0,"Matariki"],["2027-06-26","2027-07-11","au","s",0,"School holidays: Victoria"],["2027-06-26","2027-07-11","au","s",0,"School holidays: Queensland"],["2027-07-03","2027-07-18","nz","s",0,"School holidays: New Zealand"],["2027-07-05","2027-07-16","au","s",0,"School holidays: New South Wales"],["2027-07-07",0,"jp","e",0,"Star Festival (Tanabata)"],["2027-07-19",0,"jp","h",0,"Marine Day (Umi no Hi)"],["2027-07-21",0,"jp","e",0,"Eel Day (Doyō no Ushi no Hi)"],["2027-08-02",0,"jp","e",0,"Eel Day, second ox day (Doyō no Ushi no Hi, Ni no Ushi)"],["2027-08-11",0,"jp","h",0,"Mountain Day (Yama no Hi)"],["2027-08-13","2027-08-16","jp","e",0,"Festival of the Dead (Obon)"],["2027-08-16",0,"fj","h",1,"Prophet Mohammed's Birthday"],["2027-09-05",0,"intl","e",0,"Father's Day (Fiji)"],["2027-09-18","2027-10-03","au","s",0,"School holidays: Victoria"],["2027-09-18","2027-10-04","au","s",0,"School holidays: Queensland"],["2027-09-20",0,"jp","h",0,"Respect for the Aged Day (Keirō no Hi)"],["2027-09-23",0,"jp","h",0,"Autumnal Equinox Day (Shūbun no Hi)"],["2027-09-25","2027-10-10","nz","s",0,"School holidays: New Zealand"],["2027-09-27","2027-10-08","au","s",0,"School holidays: New South Wales"],["2027-10-04",0,"au","h",0,"King's Birthday (Queensland only)"],["2027-10-10",0,"fj","h",1,"Fiji Day"],["2027-10-11",0,"jp","h",0,"Sports Day (Supōtsu no Hi)"],["2027-10-25",0,"nz","h",0,"Labour Day"],["2027-10-29",0,"fj","h",1,"Diwali"],["2027-10-31",0,"intl","e",0,"Halloween"],["2027-11-01",0,"jp","e",0,"Sushi Day (Sushi no Hi)"],["2027-11-03",0,"jp","h",0,"Culture Day (Bunka no Hi)"],["2027-11-15",0,"jp","e",0,"Seven-Five-Three Festival (Shichi-Go-San)"],["2027-11-23",0,"jp","h",0,"Labour Thanksgiving Day (Kinrō Kansha no Hi)"],["2027-11-24",0,"jp","e",0,"Washoku Day (Washoku no Hi)"],["2027-12-11","2028-01-23","au","s",0,"School holidays: Queensland"],["2027-12-18","2028-01-26","au","s",0,"School holidays: Victoria"],["2027-12-18","2028-01-30","nz","s",0,"School holidays: New Zealand"],["2027-12-21","2028-01-28","au","s",0,"School holidays: New South Wales"],["2027-12-24",0,"intl","e",0,"Christmas Eve"],["2027-12-27",0,"au","h",0,"Christmas Day"],["2027-12-27",0,"fj","h",1,"Christmas Day (observed)"],["2027-12-27",0,"nz","h",0,"Christmas Day (observed)"],["2027-12-28",0,"au","h",0,"Boxing Day"],["2027-12-28",0,"fj","h",1,"Boxing Day (observed)"],["2027-12-28",0,"nz","h",0,"Boxing Day (observed)"],["2027-12-31",0,"intl","e",0,"New Year's Eve"],["2027-12-31",0,"jp","e",0,"New Year's Eve (Ōmisoka)"],["2028-01-01",0,"fj","h",1,"New Year's Day"],["2028-01-01",0,"jp","h",0,"New Year's Day (Ganjitsu)"],["2028-01-01","2028-01-03","jp","e",0,"New Year (Shōgatsu)"],["2028-01-03",0,"au","h",0,"New Year's Day"],["2028-01-03",0,"nz","h",0,"New Year's Day (observed)"],["2028-01-04",0,"nz","h",0,"Day after New Year's Day (observed)"],["2028-01-10",0,"jp","h",0,"Coming of Age Day (Seijin no Hi)"],["2028-01-26",0,"au","h",0,"Australia Day"],["2028-01-26",0,"intl","e",0,"Chinese New Year (Lunar New Year)"],["2028-01-28",0,"intl","e",1,"Ramadan begins"],["2028-02-03",0,"jp","e",1,"Bean-Throwing Festival (Setsubun)"],["2028-02-07",0,"nz","h",0,"Waitangi Day (observed)"],["2028-02-11",0,"jp","h",0,"National Foundation Day (Kenkoku Kinen no Hi)"],["2028-02-14",0,"intl","e",0,"Valentine's Day"],["2028-02-23",0,"jp","h",0,"Emperor's Birthday (Tennō Tanjōbi)"],["2028-02-26",0,"intl","e",1,"Eid al-Fitr"],["2028-03-03",0,"jp","e",0,"Girls' Day / Doll Festival (Hinamatsuri)"],["2028-03-08",0,"intl","e",0,"International Women's Day"],["2028-03-11",0,"intl","e",1,"Holi"],["2028-03-14",0,"jp","e",0,"White Day (Howaito Dē)"],["2028-03-20",0,"jp","h",1,"Vernal Equinox Day (Shunbun no Hi)"],["2028-03-20","2028-04-10","jp","e",1,"Cherry Blossom Season (Hanami)"],["2028-04-01","2028-04-17","au","s",0,"School holidays: Victoria"],["2028-04-01","2028-04-17","au","s",0,"School holidays: Queensland"],["2028-04-10","2028-04-21","au","s",0,"School holidays: New South Wales"],["2028-04-14",0,"au","h",0,"Good Friday"],["2028-04-14",0,"fj","h",1,"Good Friday"],["2028-04-14",0,"nz","h",0,"Good Friday"],["2028-04-14","2028-04-30","nz","s",0,"School holidays: New Zealand"],["2028-04-15","2028-04-17","au","h",0,"Easter Saturday to Easter Monday"],["2028-04-15",0,"fj","h",1,"Easter Saturday"],["2028-04-16",0,"intl","e",0,"Easter Sunday"],["2028-04-17",0,"fj","h",1,"Easter Monday"],["2028-04-17",0,"nz","h",0,"Easter Monday"],["2028-04-25",0,"au","h",0,"Anzac Day"],["2028-04-25",0,"nz","h",0,"Anzac Day"],["2028-04-29",0,"jp","h",0,"Showa Day (Shōwa no Hi)"],["2028-04-29","2028-05-05","jp","e",0,"Golden Week (Gōruden Uīku)"],["2028-05-03",0,"jp","h",0,"Constitution Memorial Day (Kenpō Kinenbi)"],["2028-05-04",0,"jp","h",0,"Greenery Day (Midori no Hi)"],["2028-05-05",0,"jp","h",0,"Children's Day (Kodomo no Hi)"],["2028-05-14",0,"intl","e",0,"Mother's Day (Fiji)"],["2028-05-15",0,"fj","h",1,"Girmit Day"],["2028-05-29",0,"fj","h",1,"Ratu Sir Lala Sukuna Day"],["2028-06-05",0,"nz","h",0,"King's Birthday"],["2028-06-12",0,"au","h",1,"King's Birthday"],["2028-06-24","2028-07-09","au","s",0,"School holidays: Queensland"],["2028-07-01","2028-07-16","au","s",0,"School holidays: Victoria"],["2028-07-07",0,"jp","e",0,"Star Festival (Tanabata)"],["2028-07-08","2028-07-23","nz","s",0,"School holidays: New Zealand"],["2028-07-10","2028-07-21","au","s",0,"School holidays: New South Wales"],["2028-07-14",0,"nz","h",0,"Matariki"],["2028-07-17",0,"jp","h",0,"Marine Day (Umi no Hi)"],["2028-07-27",0,"jp","e",1,"Eel Day (Doyō no Ushi no Hi)"],["2028-08-07",0,"fj","h",1,"Prophet Mohammed's Birthday"],["2028-08-11",0,"jp","h",0,"Mountain Day (Yama no Hi)"],["2028-08-13","2028-08-16","jp","e",0,"Festival of the Dead (Obon)"],["2028-09-03",0,"intl","e",0,"Father's Day (Fiji)"],["2028-09-16","2028-10-02","au","s",0,"School holidays: Queensland"],["2028-09-18",0,"jp","h",0,"Respect for the Aged Day (Keirō no Hi)"],["2028-09-22",0,"jp","h",1,"Autumnal Equinox Day (Shūbun no Hi)"],["2028-09-23","2028-10-08","au","s",0,"School holidays: Victoria"],["2028-09-30","2028-10-15","nz","s",0,"School holidays: New Zealand"],["2028-10-02",0,"au","h",0,"King's Birthday (Queensland only)"],["2028-10-03","2028-10-13","au","s",0,"School holidays: New South Wales"],["2028-10-09",0,"jp","h",0,"Sports Day (Supōtsu no Hi)"],["2028-10-10",0,"fj","h",1,"Fiji Day"],["2028-10-17",0,"fj","h",1,"Diwali"],["2028-10-23",0,"nz","h",0,"Labour Day"],["2028-10-31",0,"intl","e",0,"Halloween"],["2028-11-01",0,"jp","e",0,"Sushi Day (Sushi no Hi)"],["2028-11-03",0,"jp","h",0,"Culture Day (Bunka no Hi)"],["2028-11-15",0,"jp","e",0,"Seven-Five-Three Festival (Shichi-Go-San)"],["2028-11-23",0,"jp","h",0,"Labour Thanksgiving Day (Kinrō Kansha no Hi)"],["2028-11-24",0,"jp","e",0,"Washoku Day (Washoku no Hi)"],["2028-12-09","2029-01-21","au","s",0,"School holidays: Queensland"],["2028-12-16","2029-01-28","nz","s",1,"School holidays: New Zealand"],["2028-12-22","2029-01-25","au","s",0,"School holidays: New South Wales"],["2028-12-22","2029-01-28","au","s",0,"School holidays: Victoria"],["2028-12-24",0,"intl","e",0,"Christmas Eve"],["2028-12-25",0,"au","h",0,"Christmas Day"],["2028-12-25",0,"fj","h",1,"Christmas Day"],["2028-12-25",0,"nz","h",0,"Christmas Day"],["2028-12-26",0,"au","h",0,"Boxing Day"],["2028-12-26",0,"fj","h",1,"Boxing Day"],["2028-12-26",0,"nz","h",0,"Boxing Day"],["2028-12-31",0,"intl","e",0,"New Year's Eve"],["2028-12-31",0,"jp","e",0,"New Year's Eve (Ōmisoka)"]];
  /* v98b: three rows (Fiji with international days, Japan, tourist markets), names written on the marks, Fiji public holidays
     shaded across the chart, and buttons in the key to hide a row (remembered on this device). */
  window.kz98Hol=KZHOL;/* built-in copy: used when the list cannot load, and by the test mock */
  var HG=[['fj','Fiji'],['jp','Japan'],['intl','International'],['au','Australia'],['nz','New Zealand']],HB=230;
  var ROWS=[['fj','Fiji',['fj','intl']],['jp','Japan',['jp']],['tour','Tourist markets',['au','nz']]],HIDEK='kz98_hide';
  function touch(){var k=document.getElementById('kzs');return !!(k&&k.classList.contains('kz69-touch'))||(window.matchMedia&&matchMedia('(pointer:coarse)').matches)}
  function lnH(){return touch()?30:24}function fsz(){return touch()?16:13}
  function hidden(){try{return JSON.parse(localStorage.getItem(HIDEK)||'[]')}catch(e){return []}}
  function rowsOn(){var h=hidden();return ROWS.filter(function(R){return h.indexOf(R[0])<0})}
  function gname(c){var G=HG.filter(function(g){return g[0]===c})[0];return G?G[1]:''}
  function full(e){return e[5]+(e[2]==='intl'||e[2]==='fj'?'':', '+gname(e[2]))+(e[4]?' (date expected)':'')}
  function holOn(d){return KZHOL.filter(function(e){return d>=e[0]&&d<=(e[1]||e[0])})}
  function shortName(e){var t=e[2]==='jp'?e[5].replace(/\s*\([^)]*\)/g,''):e[5].replace(/\s*\(([^)]*)\)/g,function(m,x){return x.length>20?'':m});return t.trim()}
  /* marks for one row: Australian school holidays (three states) are joined into one bar per break; Australia and New Zealand
     holidays on the same day with the same name become one mark */
  function rowItems(R){var it=[],sch=[];
    KZHOL.forEach(function(e){if(R[2].indexOf(e[2])<0)return;
      if(e[2]==='au'&&e[3]==='s'){sch.push(e);return}
      var lab=e[3]==='s'?'New Zealand school holidays':shortName(e);if(R[0]==='tour'&&e[3]!=='s')lab+=', '+gname(e[2]);
      var same=it.filter(function(x){return x.a===e[0]&&x.b===(e[1]||e[0])&&x.base===shortName(e)&&R[0]==='tour'&&e[3]!=='s'})[0];
      if(same){same.lab=shortName(e)+', Australia and New Zealand';same.tt.push(full(e));return}
      it.push({a:e[0],b:e[1]||e[0],lab:lab,base:shortName(e),c:e[2],s:e[3]==='s',x:!!e[4],tt:[full(e)],span:!!e[1]})});
    sch.sort(function(p,q){return p[0]<q[0]?-1:1});var cur=null;
    sch.forEach(function(e){var b=e[1]||e[0];if(cur&&e[0]<=add(cur.b,1)){if(b>cur.b)cur.b=b;cur.tt.push(full(e));cur.x=cur.x&&!!e[4]}else{cur={a:e[0],b:b,lab:'Australian school holidays',c:'au',s:true,x:!!e[4],tt:[full(e)],span:true};it.push(cur)}});
    /* Easter: Good Friday to Easter Monday becomes one "Easter holidays" bar per country group */
    var eg={};it=it.filter(function(m){if(m.s||!/Easter|Good Friday/.test(m.base))return true;var k=m.a.slice(0,4);
      var e=eg[k];if(!e){e=eg[k]={a:m.a,b:m.b,base:'Easter',c:R[0]==='fj'?'fj':m.c,s:false,x:m.x,tt:[],span:true,both:false,cs:{}}}if(m.a<e.a)e.a=m.a;if(m.b>e.b)e.b=m.b;e.x=e.x&&m.x;e.tt=e.tt.concat(m.tt);e.cs[m.c]=1;if(/Australia and New Zealand/.test(m.lab)){e.cs.au=1;e.cs.nz=1}return false});
    Object.keys(eg).forEach(function(k){var e=eg[k];if(e.a===e.b){e.span=false}var who=R[0]==='tour'?(e.cs.au&&e.cs.nz?', Australia and New Zealand':e.cs.au?', Australia':', New Zealand'):'';e.lab='Easter holidays'+who;it.push(e)});
    /* single days inside a confirmed span of the same row (Golden Week, Japanese New Year) are listed with the span, not drawn twice */
    var sp=it.filter(function(m){return m.span&&!m.x&&!m.s&&R[0]==='jp'});
    it=it.filter(function(m){if(m.span||R[0]!=='jp')return true;var host=sp.filter(function(x){return m.a>=x.a&&m.a<=x.b})[0];if(host){host.tt=host.tt.concat(m.tt);return false}return true});
    return it}
  function holLanes(a,n){var g='',LN=lnH(),FS=fsz(),y0=HB+8,out={g:'',h:0,rows:[]};
    rowsOn().forEach(function(R){var it=rowItems(R).map(function(m){var i0=gap(a,m.a),i1=gap(a,m.b);if(i1<0||i0>=n)return null;i0=Math.max(0,i0);i1=Math.min(n-1,i1);
        var x0=i0*STEP+3,x1=(i1+1)*STEP-3,tw=m.lab.length*FS*0.56+(m.span?14:20);return Object.assign({},m,{i0:i0,i1:i1,x0:x0,x1:x1,end:Math.max(x1,x0+tw)+8})}).filter(Boolean);
      it.sort(function(p,q){return p.x0-q.x0||(q.x1-q.x0)-(p.x1-p.x0)});var tr=[];
      /* at most two lines per row; a mark that does not fit keeps its colour but shows its name only when tapped */
      it.forEach(function(m){for(var k=0;k<tr.length;k++){if(tr[k]<=m.x0){m.t=k;tr[k]=m.end;return}}if(tr.length<2){m.t=tr.length;tr.push(m.end);return}
        var lo=tr[0]<=tr[1]?0:1;m.t=lo;m.nolab=true;tr[lo]=Math.max(tr[lo],m.x1+4)});
      var nt=Math.max(1,tr.length),top=y0;out.rows.push([R,top,nt*LN]);
      g+='<rect x="0" y="'+top+'" width="'+(n*STEP)+'" height="'+(nt*LN)+'" class="hr-bg hr-'+R[0]+'"/>';
      it.forEach(function(m){var y=top+m.t*LN,cy=y+LN/2,t='<title>'+esc(m.tt.join('; '))+'</title>',cls='hl hl-'+m.c+(m.s?' hl-sch':'')+(m.x?' hl-x':'');
        if(m.span){g+='<g class="'+cls+'">'+t+'<rect x="'+m.x0+'" y="'+(y+3)+'" width="'+(m.x1-m.x0)+'" height="'+(LN-6)+'" rx="'+((LN-6)/2)+'"/>';
          if(!m.nolab)for(var p=m.x0;p<m.x1-40;p+=STEP*28)g+='<text x="'+(p+10)+'" y="'+(cy+FS*0.35)+'" class="hl-t">'+esc(m.lab)+'</text>';g+='</g>'}
        else g+='<g class="'+cls+'">'+t+'<circle cx="'+(m.i0*STEP+STEP/2)+'" cy="'+cy+'" r="'+(LN/2-5)+'"/>'+(m.nolab?'':'<text x="'+(m.i0*STEP+STEP/2+LN/2-1)+'" y="'+(cy+FS*0.35)+'" class="hl-t hl-o">'+esc(m.lab)+'</text>')+'</g>'});
      y0+=nt*LN+4});
    out.g=g;out.h=y0-HB;return out}
  function fjTint(a,n,top,h){var g='';KZHOL.forEach(function(e){if(e[2]!=='fj'||e[3]!=='h')return;var i=gap(a,e[0]);if(i<0||i>=n)return;g+='<rect x="'+(i*STEP)+'" y="'+top+'" width="'+STEP+'" height="'+h+'" class="fjt'+(e[4]?' fjt-x':'')+'"><title>'+esc(full(e))+'</title></rect>'});return g}
  function rail(P){var s=span(P),a=s[0],b=s[1],n=gap(a,b)+1,HL=holLanes(a,n),W=n*STEP,Hh=HB+HL.h+6,top=20,bot=48+(Hh-HB),h=Hh-top-bot,mx=10,cl={},T=P.today;
    (P.closures||[]).forEach(function(c){cl[String(c.d).slice(0,10)]=(cl[String(c.d).slice(0,10)]||[]).concat(c)});
    for(var i=0;i<n;i++){var r=day(P,add(a,i));mx=Math.max(mx,MODE==='walk'?0:r[0],MODE==='res'||MODE==='both'?r[2]:0,r[4],MODE==='total'?N(r[0])+N(r[4]):0)}
    var stp=mx<=20?5:mx<=60?10:mx<=150?25:mx<=300?50:100;mx=Math.ceil(mx/stp)*stp;
    var X=function(i){return i*STEP+STEP/2},Y=function(v){return top+h-h*v/mx};
    var g='<svg class="hbr-svg" width="'+W+'" height="'+Hh+'" viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Guests each day from '+esc(pretty(a))+' to '+esc(pretty(b))+'">';
    for(var y=stp;y<=mx;y+=stp)g+='<line x1="0" x2="'+W+'" y1="'+Y(y).toFixed(1)+'" y2="'+Y(y).toFixed(1)+'" class="gl"/>';
    var due=[],bk=[],wkl=[],tot=[],wf=wkFrom(P);if(rowsOn().some(function(R){return R[0]==='fj'}))g+=fjTint(a,n,top,h);
    for(i=0;i<n;i++){var d=add(a,i),x=dt(d),r=day(P,d),wkd=x.getUTCDay();
      if(wkd===5||wkd===6)g+='<rect x="'+(i*STEP)+'" y="'+top+'" width="'+STEP+'" height="'+h+'" class="we"/>';
      if(cl[d])g+='<rect x="'+(i*STEP+4)+'" y="'+top+'" width="'+(STEP-8)+'" height="'+h+'" class="cl"><title>'+esc(cl[d].map(function(c){return 'Closed: '+c.what+(c.reason?' ('+c.reason+')':'')}).join('; '))+'</title></rect>';
      if(d===OPEN)g+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="'+(top-14)+'" y2="'+(top+h)+'" class="op"/><text x="'+(X(i)+6)+'" y="'+(top-4)+'" class="opt">Opening day</text>';
      if(d===T)g+='<rect x="'+(i*STEP+1)+'" y="'+(top-2)+'" width="'+(STEP-2)+'" height="'+(h+4)+'" rx="6" class="td"/>';
      due.push(X(i).toFixed(1)+','+Y(r[0]).toFixed(1));if(d<=T)bk.push(X(i).toFixed(1)+','+Y(r[2]).toFixed(1));
      if(d<=T&&d>=wf){wkl.push(X(i).toFixed(1)+','+Y(r[4]).toFixed(1));tot.push(X(i).toFixed(1)+','+Y(N(r[0])+N(r[4])).toFixed(1))}
      if(r[4]&&MODE==='res')g+='<circle cx="'+X(i)+'" cy="'+Y(r[4]).toFixed(1)+'" r="4" class="wk"/>';
      g+='<text x="'+X(i)+'" y="'+(HB-28)+'" class="dn'+(d===T?' on':'')+'">'+DN[wkd].slice(0,2)+'</text><text x="'+X(i)+'" y="'+(HB-12)+'" class="dd'+(d===T?' on':'')+'">'+x.getUTCDate()+'</text>';
      if(x.getUTCDate()===1||i===0)g+='<text x="'+(i*STEP+4)+'" y="12" class="mo">'+MN[x.getUTCMonth()]+' '+x.getUTCFullYear()+'</text><line x1="'+(i*STEP)+'" x2="'+(i*STEP)+'" y1="16" y2="'+(top+h)+'" class="ml"/>';
      g+='<rect data-hbd="'+d+'" x="'+(i*STEP)+'" y="0" width="'+STEP+'" height="'+Hh+'" class="hit"/>'}
    g+=HL.g;
    if(MODE==='total'&&tot.length)g+='<polyline points="'+tot.join(' ')+'" class="ln-tot"/>';if(MODE!=='walk')g+='<polyline points="'+due.join(' ')+'" class="ln-due"/>';if(bk.length&&(MODE==='res'||MODE==='both'))g+='<polyline points="'+bk.join(' ')+'" class="ln-bk"/>';if(MODE!=='res'&&wkl.length)g+='<polyline points="'+wkl.join(' ')+'" class="ln-wk"/>';
    for(i=0;i<n;i++){var d2=add(a,i),r2=day(P,d2);if(r2[0]&&MODE!=='walk')g+='<circle cx="'+X(i)+'" cy="'+Y(r2[0]).toFixed(1)+'" r="3.5" class="pt-due"/>';if(MODE!=='res'&&d2<=T&&d2>=wf)g+='<circle cx="'+X(i)+'" cy="'+Y(r2[4]).toFixed(1)+'" r="3.5" class="wk"/>'+(MODE==='total'?'<circle cx="'+X(i)+'" cy="'+Y(N(r2[0])+N(r2[4])).toFixed(1)+'" r="3.5" class="pt-tot"/>':'')}
    g+='</svg>';
    var months='';var m0=a.slice(0,7),m1=b.slice(0,7),m=m0;while(m<=m1){months+='<option value="'+m+'"'+(m===T.slice(0,7)?' selected':'')+'>'+MN[+m.slice(5,7)-1]+' '+m.slice(0,4)+'</option>';var yy=+m.slice(0,4),mm=+m.slice(5,7)+1;if(mm>12){mm=1;yy++}m=yy+'-'+String(mm).padStart(2,'0')}
    return '<section class="hbr" data-a="'+a+'"><div class="hbr-head"><div><h3>'+kzIcon('pulse')+'Daily Reservations Demand</h3></div>'+
      '<div class="hbr-act"><button type="button" class="btn hbr-b" data-hbn="-1" aria-label="Earlier days">'+kzIcon('chev','hbr-l')+'</button><button type="button" class="btn hbr-b" data-hbn="today">Today</button><button type="button" class="btn hbr-b" data-hbn="1" aria-label="Later days">'+kzIcon('chev','hbr-r')+'</button>'+
      '<label class="hbr-jump"><select aria-label="Jump to a month">'+months+'</select></label></div></div>'+
      modeBar()+lineKey()+'<div class="hbr-key hbr-hkey"><span class="hk-lbl">Holidays:</span>'+ROWS.map(function(R){var on=hidden().indexOf(R[0])<0;return '<button type="button" class="hk-t hk-'+R[0]+'" data-hrow="'+R[0]+'" aria-pressed="'+on+'"><i></i>'+R[1]+'</button>'}).join('')+'<span class="hk hk-x"><i></i>Hollow: expected</span></div>'+
      '<div class="hbr-wrap"><div class="hbr-scroll" tabindex="0" aria-label="Daily guests. Scroll sideways to move through the dates.">'+g+'</div><div class="hbr-ll" aria-hidden="true">'+HL.rows.map(function(r){return '<span class="ll-'+r[0][0]+'" style="top:'+r[1]+'px;height:'+r[2]+'px">'+r[0][1]+'</span>'}).join('')+'</div></div><p class="hbr-det" aria-live="polite">Tap a day for details.</p></section>'}
  function railWire(box,P){var sc=box.querySelector('.hbr-scroll');if(!sc)return;var a=box.querySelector('.hbr').dataset.a,T=P.today;
    function to(d,smooth){var i=gap(a,d);sc.scrollTo({left:Math.max(0,i*STEP-sc.clientWidth*0.35),behavior:smooth&&!rdm()?'smooth':'auto'})}
    function rdm(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
    function show(d){var r=day(P,d),cl=(P.closures||[]).filter(function(c){return String(c.d).slice(0,10)===d});
      box.querySelector('.hbr-det').innerHTML='<b>'+esc(pretty(d))+(d===T?' (today)':'')+'</b>'+'<span>'+r[0]+' guests due ('+r[1]+(r[1]===1?' booking':' bookings')+')</span>'+(d<=T?'<span>'+r[2]+' guests booked that day ('+r[3]+(r[3]===1?' booking':' bookings')+')</span>':'')+(r[4]?'<span>'+r[4]+' walk-in guests</span>':'')+(MODE==='total'&&d<=T&&d>=wkFrom(P)?'<span>'+(N(r[0])+N(r[4]))+' guests in total</span>':'')+(cl.length?'<span class="c">Closed: '+esc(cl.map(function(c){return c.what}).join(', '))+'</span>':'')+holOn(d).map(function(e){return '<span class="hd hd-'+e[2]+'"><i></i>'+esc(full(e))+'</span>'}).join('');
      box.querySelectorAll('.hbr-svg .hit.sel').forEach(function(e){e.classList.remove('sel')});var h=box.querySelector('.hbr-svg [data-hbd="'+d+'"]');if(h)h.classList.add('sel')}
    to(T,false);
    box.querySelectorAll('.hbr-svg [data-hbd]').forEach(function(r){r.addEventListener('click',function(){show(r.dataset.hbd)})});
    box.querySelectorAll('[data-hbn]').forEach(function(b){b.onclick=function(){var k=b.dataset.hbn;if(k==='today'){to(T,true);show(T);return}sc.scrollBy({left:(+k)*Math.max(STEP*7,sc.clientWidth*0.8),behavior:rdm()?'auto':'smooth'})}});
    var sel=box.querySelector('.hbr-jump select');if(sel)sel.onchange=function(){to(sel.value+'-01',true)}
    box.querySelectorAll('[data-hbm]').forEach(function(b){b.onclick=function(){var x=sc.scrollLeft,k=b.dataset.hbm,mv=(box.querySelector('.hbr-jump select')||{}).value;MODE=k;try{lsSet('kz_hb_mode',k)}catch(e){}
      var sec=box.querySelector('.hbr');sec.outerHTML=rail(P);railWire(box,P);var s2=box.querySelector('.hbr-scroll');if(s2)s2.scrollLeft=x;var js=box.querySelector('.hbr-jump select');if(js&&mv)js.value=mv;var nb=box.querySelector('[data-hbm="'+k+'"]');if(nb)nb.focus()}});
    box.querySelectorAll('[data-hrow]').forEach(function(b){b.onclick=function(){var h=hidden(),k=b.dataset.hrow,x=sc.scrollLeft,i=h.indexOf(k),mv=(box.querySelector('.hbr-jump select')||{}).value;if(i<0)h.push(k);else h.splice(i,1);try{localStorage.setItem(HIDEK,JSON.stringify(h))}catch(e){}
      var sec=box.querySelector('.hbr');sec.outerHTML=rail(P);railWire(box,P);var s2=box.querySelector('.hbr-scroll');if(s2)s2.scrollLeft=x;var js=box.querySelector('.hbr-jump select');if(js&&mv)js.value=mv;var nb=box.querySelector('[data-hrow="'+k+'"]');if(nb)nb.focus()}})}

  window.kz78HB=async function(tests){H.tests=!!tests;var box=$('anb');if(!box)return;var n=++H.seq;
    if(!H.data)box.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>';else box.classList.add('an-busy');
    var HP=call('staff_holidays').catch(function(){return null});
    var P;try{P=await call('staff_heartbeat',{p_tests:H.tests})}catch(e){if(n!==H.seq)return;box.classList.remove('an-busy');
      box.innerHTML='<div class="panel"><p class="muted">'+(/staff_heartbeat/.test(String(e&&e.message))?'Daily demand needs a database update that has not been applied yet.':esc(errText(e)))+'</p></div>';return}
    if(n!==H.seq||!$('anb'))return;box.classList.remove('an-busy');
    if(!P||P.ok===false){box.innerHTML='<div class="panel"><p class="muted">'+(P&&P.error==='not_allowed'?'Only managers and admins can open Analytics.':'Daily demand could not load. Try again.')+'</p></div>';return}
    try{var hr=await HP;if(hr&&hr.ok&&hr.items)KZHOL=hr.items.map(function(h){return [String(h.date).slice(0,10),h.end?String(h.end).slice(0,10):0,h.grp,String(h.kind||'h')[0],h.expected?1:0,h.name]})}catch(e){}
    H.data=P;render(P)};
})();
/* v79: shared application shell. Reuse live control nodes so their listeners,
   focus, permissions and server calls remain owned by the original screen. */
(function(){
  var names={arrivals:'Arrivals',floor:'Seating plan',stations:'Grill stations',brief:'Service briefing',kitchen:'Kitchen',calendar:'Calendar',bookings:'Bookings',guests:'Guests',analytics:'Analytics',settings:'Settings'};
  function compose(){
    var m=main();if(!m||!me||state.tab==='new'||(state.tab==='guests'&&KG.key))return;
    var key=state.tab==='today'?state.view:state.tab,title=names[key];if(!title)return;
    var head=m.querySelector(':scope > .kz79-header');
    if(!head){
      var bar=m.querySelector(':scope > .daybar,:scope > .calbar,:scope > .an-head');
      if(!bar){var h=m.querySelector(':scope > .row > h1');bar=h&&h.parentElement}
      if(!bar)return;
      head=document.createElement('header');head.className='kz79-header';
      head.innerHTML='<div class="kz79-heading noprint"><div class="kz79-identity"><span class="kz79-section"></span><h1 class="kz79-title"></h1></div><button type="button" class="btn kz79-search" aria-label="Search all bookings">'+I.search+'<span>Search bookings</span></button></div>';
      m.insertBefore(head,m.firstChild);head.appendChild(bar);bar.classList.add('kz79-toolbar');
      head.querySelector('.kz79-search').onclick=openSearch;
      if(state.tab!=='today'&&state.tab!=='calendar')bar.classList.add('kz79-title-only');
      // The guest-directory explanation belongs with its heading, ahead of the summary islands.
      if(state.tab==='guests'){var note=head.nextElementSibling;if(note&&note.matches('p.small')){head.appendChild(note);note.classList.add('kz79-note')}}
    }
    head.querySelector('.kz79-title').textContent=title;
    head.querySelector('.kz79-section').textContent=state.tab==='today'?'Service today':state.tab==='settings'?'Administration':state.tab==='guests'?'Customers':'Reservations';
    head.dataset.screen=key;
    root.classList.add('kz79-shell');
    var filters=m.querySelector('.kz79-filters');
    if(state.tab==='bookings'&&!filters){
      filters=document.createElement('section');filters.className='kz79-filters';filters.setAttribute('aria-label','Filter bookings');
      var list=$('bl'),rows=[];for(var el=head.nextElementSibling;el&&el!==list;el=el.nextElementSibling)if(el.matches('.row'))rows.push(el);
      if(rows.length){m.insertBefore(filters,rows[0]);rows.forEach(function(row){filters.appendChild(row)})}
    }
  }
  function after(fn){return function(){var result=fn.apply(this,arguments);compose();return result}}
  renderToday=after(renderToday);renderCalendar=after(renderCalendar);renderBookings=after(renderBookings);
  renderGuests=after(renderGuests);renderSettings=after(renderSettings);renderAnalytics=after(renderAnalytics);
  setView=after(setView);paintDay=after(paintDay);shell=after(shell);
})();

/* ======================================================================================================================
   v81 (21 Oct 2026): one side panel layout for every Jack's Restaurants dashboard (asked for by Roneel, modelled on the
   Corner Café cake app and the Jack's Restaurants Service Hub; see docs/STAFF-APP-DESIGN.md, "v81"). Dark, like the cake
   app. Presentation only: the same sections, order, permissions and buttons; the existing buttons are moved, not copied.
   1. Brand block: the Kazumi logo large and centred, "SERVICE HUB" under it, the collapse arrow beside it.
   2. Each section has its own icon colour. "Administration" is called "Set-up", as in the cake app.
   3. Service view at the top of the Service section. The person at the bottom: initial, name and role, then Evening mode
      and Sign out in words.
   ====================================================================================================================== */
(function(){
  var ROLE={admin:'Admin',manager:'Manager',staff:'Staff'};
  function tweak(){var s=document.querySelector('#kzs .kside');if(!s||s.dataset.kz81)return;s.dataset.kz81='1';
    var h=s.querySelector('#ksh-admin');if(h)h.textContent='Set-up';
    var m=s.querySelector('.kside-me');if(!m||!me)return;
    var nm=(me.name||'').trim(),ini=(nm.charAt(0)||'?').toUpperCase();
    var who=document.createElement('div');who.className='kz81-me';
    who.innerHTML='<span class="kz81-av" aria-hidden="true">'+esc(ini)+'</span><span class="kz81-who"><b>'+esc(nm)+'</b><small>'+esc(ROLE[me.role]||'')+'</small></span>';
    var acts=document.createElement('div');acts.className='kz81-acts';
    /* Service view sits at the top of the Service section, as in the cake app's Quick service */
    var g=s.querySelector('#ksh-service');if(g&&!s.querySelector('.kz81-sv')){var sv=document.createElement('button');sv.type='button';sv.className='kside-i kz81-sv';sv.setAttribute('aria-label','Service view');
      sv.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M10.5 17.5h3"/></svg><span>Service view</span>';
      sv.onclick=function(){if(window.kz72Enter)window.kz72Enter()};g.insertAdjacentElement('afterend',sv)}
    m.querySelectorAll('.kside-icon').forEach(function(b){b.classList.add('kz81-a');var lab=b.dataset.act==='eve'?'Evening':b.dataset.act==='out'?'Sign out':b.dataset.act==='help'?'Help':b.dataset.act==='acct'?'Account':'';if(lab&&!b.querySelector('span'))b.insertAdjacentHTML('beforeend','<span>'+lab+'</span>');if(lab){if(!b.title)b.title=lab;if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',lab)}acts.appendChild(b)});
    var old=m.querySelector(':scope > span');if(old)old.remove();
    m.classList.add('kz81-foot');m.appendChild(who);m.appendChild(acts)}
  var _sh81=shell;shell=function(){var r=_sh81.apply(this,arguments);try{tweak()}catch(e){if(window.console)console.error(e)}return r};
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;try{tweak()}catch(e){}})}).observe(root,{childList:true});
})();
/* ======================================================================================================================
   v83 (21 Oct 2026): flow refinements (Roneel; see docs/STAFF-APP-DESIGN.md, "v83"). Here: number 5, one home per
   device. A touch tablet (an iPad at the host stand) opens on the Service View the first time; laptops and phones open
   on Arrivals. Exit service view is remembered on the device as before, so a tablet can still be set to Arrivals.
   ====================================================================================================================== */
(function(){
  function tablet(){try{return matchMedia('(pointer: coarse)').matches&&Math.min(innerWidth,innerHeight)>=700}catch(e){return false}}
  function check(){var side=document.querySelector('#kzs .kside');if(!side||!me)return;var v=null;try{v=localStorage.getItem('kz_sv')}catch(e){}
    if(v===null&&tablet()&&window.kz72Enter&&!document.getElementById('kz72bar')){try{localStorage.setItem('kz_sv','1')}catch(e){}window.kz72Enter()}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;setTimeout(function(){q=false;try{check()}catch(e){}},0)}).observe(root,{childList:true});
})();
/* ======================================================================================================================
   v84 (21 Oct 2026): a shorter learning curve (asked for by Roneel; see docs/STAFF-APP-DESIGN.md, "v84"). Presentation
   only: the same screens, buttons and permissions (the server still decides what each person may do).
   1. The side panel is grouped by job: Front desk, Kitchen, Bookings, Manager. Staff see their daily jobs only: no
      Booking calendar, Analytics or Settings in the menus (closures are still reached from Arrivals). Managers and
      admins see everything.
   2. For a person's first 14 days on a device, each screen opens with one line saying what it is for, with Got it.
   ====================================================================================================================== */
(function(){
  var GROUPS=[['front','Front desk',['sv','arrivals','floor']],['kitchen','Kitchen',['kitchen','stations','brief']],['book','Bookings',['bookings','calendar','guests']],['mgr','Manager',['analytics','settings']]];
  var STAFF_HIDE={calendar:1,settings:1,analytics:1};
  function staff(){return !!me&&me.role!=='admin'&&me.role!=='manager'}
  function regroup(){var s=document.querySelector('#kzs .kside');if(!s||!s.dataset.kz81||s.dataset.kz84)return;var nav=s.querySelector('.kside-scroll');if(!nav)return;s.dataset.kz84='1';
    var btn={};s.querySelectorAll('.kside-i').forEach(function(b){var k=b.classList.contains('kz81-sv')?'sv':b.dataset.nav;if(k)btn[k]=b});
    var frag=document.createDocumentFragment();
    GROUPS.forEach(function(g){var items=g[2].filter(function(k){return btn[k]&&!(staff()&&STAFF_HIDE[k])});if(!items.length)return;
      var d=document.createElement('div');d.className='kside-g kz84-g';d.setAttribute('role','group');d.setAttribute('aria-labelledby','ksh84-'+g[0]);
      d.innerHTML='<div class="kside-h" id="ksh84-'+g[0]+'">'+g[1]+'</div>';items.forEach(function(k){d.appendChild(btn[k])});frag.appendChild(d)});
    /* anything not placed above stays, at the end */
    var left=[].slice.call(nav.querySelectorAll('.kside-i'));
    nav.innerHTML='';nav.appendChild(frag);
    left.forEach(function(b){if(!b.isConnected||!nav.contains(b)){var k=b.classList.contains('kz81-sv')?'sv':b.dataset.nav;if(GROUPS.every(function(g){return g[2].indexOf(k)<0}))nav.appendChild(b)}});
    Object.keys(STAFF_HIDE).forEach(function(k){if(staff()&&btn[k]&&btn[k].isConnected&&!nav.contains(btn[k]))btn[k].remove()});
    var adm=s.querySelector('.kside-admin');if(adm&&!adm.querySelector('.kside-i'))adm.remove();
    root.classList.toggle('kz84-staff',staff())}

  /* ---------- 2. what each screen is for, for a person's first 14 days on this device ---------- */
  var WHAT={arrivals:'Who is coming today. Tap Arrived when guests walk in, then Seat them.',floor:'Who sits at each grill and table. Tap a grill to seat or move a party.',
    kitchen:'Allergies, dietary needs and celebrations today, for the kitchen team.',stations:'Each grill’s guests and allergies, for the chefs.',
    brief:'Today at a glance, for the team talk before service.',bookings:'Every booking. Answer requests and find past or future bookings.',
    calendar:'How busy each day is. Tap a day to see its bookings.',guests:'Every guest who has booked, with their visits and preferences.',
    analytics:'How the restaurant is doing. The charts update as bookings come in.',settings:'Opening hours, closures, grills and staff accounts.'};
  function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function fresh(){if(lsg('kz84_off')==='1')return false;var since=lsg('kz84_since');if(!since){since=String(Date.now());lss('kz84_since',since)}return Date.now()-(+since)<14*864e5}
  function what(){var m=main&&main();if(!m||!me)return;var key=state.tab==='today'?state.view:state.tab,t=WHAT[key],cur=m.querySelector(':scope > .kz84-what');
    if(!t||!fresh()||root.classList.contains('kz72-home-on')||state.tab==='new'){if(cur)cur.remove();return}
    if(cur&&cur.dataset.k===key)return;if(cur)cur.remove();
    var p=document.createElement('p');p.className='kz84-what noprint';p.dataset.k=key;p.setAttribute('role','note');
    p.innerHTML=kzIcon('help')+'<span>'+esc(t)+'</span><button type="button" class="link kz84-ok">Got it</button>';
    m.insertBefore(p,m.firstChild);p.querySelector('.kz84-ok').onclick=function(){lss('kz84_off','1');p.remove()}}
  function run(){try{regroup()}catch(e){if(window.console)console.error(e)}try{what()}catch(e){}}
  var _sh84=shell;shell=function(){var r=_sh84.apply(this,arguments);run();return r};
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;run()})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v101 (21 Oct 2026, approved by Roneel): shared navigation taxonomy (Jack's Restaurants shared sidebar contract,
   section 7). Six sections in every Service Hub: Overview, Operations, Planning, Customers, Insights, System. Runs after
   the v84 regroup and moves the same buttons (never recreated), so keys, handlers, the request count, allowed() and the
   v84 staff hiding are unchanged; an empty section is not drawn. Visible renames only: All bookings to Bookings, Booking
   calendar to Calendar, Guest directory to Guests, Kitchen overview to Kitchen (side panel, rail tooltips, More sheet,
   bottom bar). Page titles are not changed.
   ====================================================================================================================== */
(function(){
  var SECTIONS=[['overview','Overview',['arrivals']],['operations','Operations',['bookings','sv','floor','kitchen','stations','brief']],
    ['planning','Planning',['calendar']],['customers','Customers',['guests']],['insights','Insights',['analytics']],['system','System',['settings']]];
  var LABEL={bookings:'Bookings',calendar:'Calendar',guests:'Guests',kitchen:'Kitchen'};
  function key(b){return b.classList.contains('kz81-sv')?'sv':b.dataset.nav}
  function relabel(scope){scope.querySelectorAll('.kside-i[data-nav],.kmore-i[data-nav],.kbot-i[data-nav]').forEach(function(b){var t=LABEL[b.dataset.nav];if(!t)return;
    var sp=b.querySelector('span:not(.count)');if(sp&&sp.textContent!==t&&!(b.classList.contains('kbot-i')&&sp.textContent===t))sp.textContent=t;
    if(b.hasAttribute('aria-label')&&b.getAttribute('aria-label')!==t)b.setAttribute('aria-label',t);if(b.title&&b.title!==t)b.title=t})}
  function regroup(){var s=document.querySelector('#kzs .kside');if(!s||!s.dataset.kz84)return;var nav=s.querySelector('.kside-scroll');if(!nav)return;
    if(!s.dataset.kz101){var btn={};s.querySelectorAll('.kside-i').forEach(function(b){var k=key(b);if(k)btn[k]=b});
      var frag=document.createDocumentFragment(),placed={};
      SECTIONS.forEach(function(g){var items=g[2].filter(function(k){return btn[k]&&btn[k].isConnected});if(!items.length)return;
        var d=document.createElement('div');d.className='kside-g kz84-g kz101-g';d.setAttribute('role','group');d.setAttribute('aria-label',g[1]);d.dataset.kz101=g[0];
        d.innerHTML='<div class="kside-h" aria-hidden="true">'+g[1]+'</div>';items.forEach(function(k){d.appendChild(btn[k]);placed[k]=1});frag.appendChild(d)});
      /* anything not named above stays, in its own place at the end */
      var rest=[].slice.call(nav.querySelectorAll('.kside-i')).filter(function(b){return !placed[key(b)]});
      nav.innerHTML='';nav.appendChild(frag);rest.forEach(function(b){nav.appendChild(b)});s.dataset.kz101='1'}
    relabel(root)}
  function run(){try{regroup()}catch(e){if(window.console)console.error(e)}}
  var _sh101=shell;shell=function(){var r=_sh101.apply(this,arguments);run();return r};
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;run()})}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['title','aria-label']});
})();
/* ======================================================================================================================
   v85 (21 Oct 2026): practice mode (asked for by Roneel; see docs/STAFF-APP-DESIGN.md, "v85"). New staff practise the
   daily host jobs on a pretend night. Safety: in practice mode the app never creates a connection to the booking system;
   every server call is answered on this device from the pretend night below, so no booking, email, backup sheet or
   analytics figure can change. Practice lives in this browser tab only (sessionStorage); Exit practice, closing the tab
   or Start over ends or resets it. A gold frame and a "Practice mode" card stay on screen the whole time.
   The pretend night is the staff app's test data (tests/staff/mock.js, 21 Oct 2026) without its test-only parts.
   ====================================================================================================================== */
function kzPracticeOn(){try{return sessionStorage.getItem('kz_practice')==='1'}catch(e){return false}}
function kzPracticeGo(on){try{if(on){sessionStorage.clear();sessionStorage.setItem('kz_practice','1')}else{sessionStorage.clear()}}catch(e){}location.reload()}
function kzPracticeStart(){
  var t=fijiToday();window.__today=t;window.__now='19:05';window.__name='Practice host';window.__role='staff';window.__hxAdd=true;window.__rowsAdd=true;window.__originStrict=true;
  try{kzPracticeInstall()}catch(e){root.innerHTML='<div class="login"><div class="msg err">Practice mode could not start. Close this tab and open the staff app again.</div></div>';return}
  sb=window.__kzPracticeSupabase.createClient();
  sb.auth.signOut=async function(){kzPracticeGo(false);return {}};
  root.classList.add('kz85-on');kzPracticeBar();boot()}
function kzPracticeBar(){if(document.getElementById('kz85'))return;var d=document.createElement('div');d.id='kz85';d.className='kz85 noprint';d.setAttribute('role','status');
  d.innerHTML='<b>Practice mode</b><span>Pretend bookings. Nothing here is real.</span><button type="button" class="kz85-b" id="kz85r">Start over</button><button type="button" class="kz85-b kz85-x" id="kz85x">Exit practice</button>';
  var f=document.createElement('div');f.className='kz85-frame noprint';f.setAttribute('aria-hidden','true');document.body.appendChild(f);
  d.querySelector('#kz85r').onclick=function(){kzPracticeGo(true)};d.querySelector('#kz85x').onclick=function(){kzPracticeGo(false)};
  /* the card sits at the top of each page (it never covers a button); the frame is always on screen */
  function place(){var m=document.getElementById('mn');if(m&&m.firstChild!==d)m.insertBefore(d,m.firstChild)}
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;place()})}).observe(root,{childList:true,subtree:true});place()}
/* the ways in: the sign-in screen, the More sheet, the Service View home and the first-days hint line */
(function(){
  function link(cls){var b=document.createElement('button');b.type='button';b.className=cls;b.innerHTML=kzIcon('user')+'<span>Practice mode</span>';b.onclick=function(){kzPracticeGo(true)};return b}
  function add(){if(kzPracticeOn())return;
    var lg=document.querySelector('#kzs .login');if(lg&&!lg.querySelector('.kz85-in')){var w=document.createElement('div');w.className='kz85-in';w.innerHTML='<p>New here? Practise on pretend bookings first. Nothing you do there is real.</p>';w.appendChild(link('btn kz85-go'));lg.appendChild(w)}
    var mo=document.querySelector('#kmore .kmore-row');if(mo&&!mo.querySelector('.kz85-go'))mo.appendChild(link('kmore-i kz85-go'));
    var hm=document.querySelector('#kz72:not([hidden]) .kz72-grid');if(hm&&!document.querySelector('#kz72 .kz85-home')){var x=document.createElement('p');x.className='kz85-home';x.innerHTML='New here? ';var l=link('link kz85-go');x.appendChild(l);x.insertAdjacentHTML('beforeend',' lets you try everything on pretend bookings.');hm.insertAdjacentElement('afterend',x)}
    var wh=document.querySelector('#kzs .kz84-what');if(wh&&!wh.querySelector('.kz85-go')){var ok=wh.querySelector('.kz84-ok');var l2=link('link kz85-go');l2.querySelector('span').textContent='Try practice mode';if(ok)wh.insertBefore(l2,ok);else wh.appendChild(l2)}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;setTimeout(function(){q=false;try{add()}catch(e){}},0)}).observe(document.documentElement,{childList:true,subtree:true});
})();
function kzPracticeInstall(){
// Local test double for the Supabase client: same calls, canned data.
// v65: the Seating plan shows one sitting at a time, chosen by the time of day. Tests that use the real clock get a fixed
// time of day (5:00 PM, before the first sitting) unless they set their own, so the same sitting shows whenever they run.

// v61: older tests submit booking forms without choosing where the guest is from (now required). Unless a test sets
// window.__originStrict, submitting with no choice first taps "Did not say", so those tests keep checking what they did before.
(function(){
  function P(id,name,size,o){return Object.assign({id:id,reference:'KZM-RS-'+id,name:name,size:size,adults:size,children:0,status:'confirmed',occasion:null,allergens:[],dietary:null,requests:null,phone:'+679 111 00'+id,email:'g'+id+'@example.com',source:'website',staff_notes:null,arrived_at:null,location:null,tables:[]},o||{})}
  var lee=P('04','Lee',8,{occasion:'Anniversary',arrived_at:new Date().toISOString(),tables:['T1']});
  var chand=P('03','Chand',6,{allergens:['Gluten'],requests:'Window side',tables:['T2']});
  var wilson=P('02','Wilson',2,{arrived_at:new Date().toISOString(),tables:['T2']});
  var kumar=P('07','Kumar',5,{adults:4,children:1,allergens:['Peanuts','Tree nuts'],tables:['T3']});
  var brown=P('06','Brown',9,{adults:7,children:2,tables:['T4']});
  var tanaka=P('01','Tanaka',4,{adults:3,children:1,occasion:'Birthday',allergens:['Shellfish'],dietary:'One guest severe',tables:['T5']});
  var prasad=P('05','Prasad',3,{dietary:'Vegetarian x1',tables:['T6']});
  var smith=P('08','Smith Group',14,{status:'pending_large_group',occasion:'Celebration',requests:'Company dinner',tables:['T6','T5']});
  var nair=P('10','Nair',4,{allergens:['Dairy'],tables:['T1']});
  var ali=P('09','Ali',2,{occasion:'Honeymoon',tables:['T2']});var gupta=P('12','Gupta',4,{allergens:['Fish']});var rao=P('13','Rao',6,{});
  var d1=P('21','Singh',4,{service:'dining',session_time:'12:30',time_label:'12:30 PM',seating_pref:'yakitori_counter',allergens:['Egg']});
  var d2=P('22','Ali Family',6,{service:'dining',session_time:'19:00',time_label:'7:00 PM',adults:4,children:2,occasion:'Birthday'});
  var d3=P('23','Reddy',10,{service:'dining',session_time:'19:30',time_label:'7:30 PM',status:'pending',seating_pref:'dining_room'});
  var ev=P('24','Fiji Airways team',30,{service:'event',session_time:'18:30',time_label:'6:30 PM',status:'pending',occasion:'Corporate dinner',requests:'Set menu, budget 150pp'});
  var all=[gupta,rao,lee,chand,wilson,kumar,brown,tanaka,prasad,smith,nair,ali,d1,d2,d3,ev];
  Object.assign(tanaka,{celebrant:'Mia',plate_message:'Happy 7th Mia',high_chairs:1,visits:2,last_visit:'2026-11-20',guest_note:'Likes the onion volcano',past_allergens:['Sesame']});
  Object.assign(ali,{diet_prefs:['Halal','No alcohol in cooking'],own_cake:true});Object.assign(brown,{vip:true,wheelchair:true});Object.assign(smith,{split:{T5:3,T6:11},pinned:true});
  Object.assign(d1,{diet_prefs:['Vegan']});Object.assign(d2,{celebrant:'Grandma Ali',own_cake:true,high_chairs:2});Object.assign(kumar,{dietary:'none',requests:'None'});
  function T(c,s,b,ps){return {code:c,seats:s,booked:b,parties:ps}}
  var day={date:window.__today||(window.__today),locked:true,dining:[d1,d2,d3],events:[ev],venue_closures:[{id:'v1',scope:'dining',period:'lunch',reason:'Staff training'}],closures:[{id:'c9',session_time:'19:00',reason:'Private event'}],inactive:[{id:'11',reference:'KZM-X',name:'Jones',size:2,session_time:'18:00',status:'cancelled'}],
    tables:[{code:'T1',name:'Ume',seats:8,zone:'main'},{code:'T2',name:'Fuji',seats:8,zone:'main'},{code:'T3',name:'Tsubaki',seats:8,zone:'main'},{code:'T4',name:'Sakura',seats:9,zone:'main'},{code:'T5',name:'Kiku',seats:10,zone:'main',chef:'bottom'},{code:'T6',name:'Yuri',seats:11,zone:'main',chef:'right'}],
    sessions:[{session_time:'17:30',label:'5:30 PM',window_label:'5:30–7:00 PM',seats_total:55,seats_booked:47,party_count:9,arrived_count:2,unassigned:[gupta,rao],
      tables:[T('T1',8,8,[lee]),T('T2',8,8,[chand,wilson]),T('T3',8,5,[kumar]),T('T4',9,9,[brown]),T('T5',10,4,[tanaka]),T('T6',11,3,[prasad])]},
     {session_time:'19:00',label:'7:00 PM',window_label:'7:00–8:30 PM',seats_total:55,seats_booked:20,party_count:3,arrived_count:0,unassigned:[],
      tables:[T('T1',8,4,[nair]),T('T2',8,2,[ali]),T('T3',8,0,[]),T('T4',9,0,[]),T('T5',10,3,[smith]),T('T6',11,11,[smith])]}]};
  function listRow(p,sess){return Object.assign({},p,{date:(window.__today),session_time:sess,is_test:false,created_at:new Date().toISOString(),decline_reason:null})}
  var rows=all.map(function(p,i){return listRow(p,p.session_time||(i<7?'17:30':'19:00'))});
  var signed=true; /* practice: always signed in as the practice host */
  window.__calls=[];
  var api={
    staff_me:function(){var M=window.__mfa;var v=M.factors.some(function(f){return f.status==='verified'});if(v&&M.aal!=='aal2')throw new Error('MFA_REQUIRED');return {email:'roneel@jacksfiji.com',name:(window.__name||'Roneel'),role:(window.__role||'admin'),must_change_password:false,today:window.__today||(window.__today),mfa:v,admin_mfa_required:!!window.__reqmfa}},
    staff_get_day:function(){return day},
    /* v64: a search (p_query) returns only matching bookings, as the database does: name, email, phone without spaces, reference, any date */
    staff_list_bookings:function(a){var q=a&&a.p_query?String(a.p_query).trim().toLowerCase():'';if(!q)return rows;var qs=q.replace(/ /g,'');
      return rows.filter(function(r){return String(r.name||'').toLowerCase().indexOf(q)>=0||String(r.email||'').toLowerCase().indexOf(q)>=0||String(r.phone||'').replace(/ /g,'').indexOf(qs)>=0||String(r.reference||'').toLowerCase().indexOf(q)>=0})},
    staff_get_booking:function(a){var r=rows.find(function(x){return x.id===a.p_id})||rows[0];return Object.assign({},r,{locked:true,updated_by:null})},
    staff_action:function(a){var r=rows.find(function(x){return x.id===a.p_id});if(a.p_action==='confirm')r.status='confirmed';if(a.p_action==='arrived')r.arrived_at=new Date().toISOString();return Object.assign({},r,{locked:true})},
    staff_update_booking:function(a){var r=rows.find(function(x){return x.id===a.p_id});r.staff_notes=a.p_staff_notes;r.allergens=a.p_allergens;return Object.assign({},r,{locked:true})},
    staff_move_table:function(a){window.__moved=a;var r=rows.find(function(x){return x.id===a.p_id});r.tables=a.p_codes;var s0=day.sessions[0];var i=s0.unassigned.findIndex(function(x){return x.id===a.p_id});if(i>=0){var pp=s0.unassigned.splice(i,1)[0];a.p_codes.forEach(function(c){var t=s0.tables.find(function(x){return x.code===c});t.parties.push(pp);t.booked+=pp.size})}return Object.assign({},r,{locked:true})},
    staff_sittings:function(){return [{session_time:'17:30',label:'5:30 PM',seats_left:17,can_fit:false,max_party:0,closed:true,closure_reason:'Private event'},{session_time:'19:00',label:'7:00 PM',seats_left:34,can_fit:true,max_party:11}]},
    staff_create_booking:function(){return {reference:'KZM-1205-1234',status:'confirmed',id:'02'}},
    staff_password_changed:function(){return null},
    staff_service_times:function(a){if(window.__times)return window.__times(a);return ['17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'].map(function(s,i){return {slot:s,label:s,period:'dinner',available:i!==3,reason:i===3?'full':null,booked:i*2}})},
    staff_create_any:function(a){window.__created=a;return {reference:'KZM-1205-9999',status:'confirmed',id:'02'}},
    staff_list_closures_v2:function(){return window.__c2||(window.__c2=[{id:'k1',scope:'all',date:'2026-12-25',part:'all',reason:'Christmas Day',affected:0},{id:'c1',scope:'teppanyaki',date:'2026-12-08',part:'19:00',reason:'Private event',affected:3}])},
    staff_add_closure_v2:function(a){window.__c2.push({id:'n'+window.__c2.length,scope:a.p_scope,date:a.p_date,part:a.p_part||'all',reason:a.p_reason,affected:1});return {affected:1}},
    staff_remove_closure_v2:function(a){window.__c2=window.__c2.filter(function(c){return c.id!==a.p_id});return null},
    staff_list_closures:function(){return window.__clos||(window.__clos=[{id:'c1',date:'2026-12-08',session_time:null,reason:'Staff training',created_by:'roneel@jacksfiji.com',affected:0}])},
    staff_add_closure:function(a){window.__clos.push({id:'c'+(window.__clos.length+1),date:a.p_date,session_time:a.p_session,reason:a.p_reason,created_by:'roneel@jacksfiji.com',affected:2});return {affected:2}},
    staff_remove_closure:function(a){window.__clos=window.__clos.filter(function(c){return c.id!==a.p_id});return null}
  };

  function addD(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
  api.staff_needs=function(){return {requests:rows.filter(function(r){return r.status==='pending'||r.status==='pending_large_group'}).map(function(r,i){return {id:r.id,name:r.name,size:r.size,service:r.service||'teppanyaki',date:r.date,session_time:r.session_time,created_at:r.created_at,hours_waiting:i===0?30:3,is_test:false}}),unmarked:[{id:'02',name:'Wilson',size:2,date:'2026-12-04',session_time:'17:30',service:'teppanyaki'}]}};
  api.staff_calendar=function(a){var out=[],d=a.p_from;while(d<=a.p_to){var k=parseInt(d.slice(8),10),wd=new Date(d+'T12:00:00Z').getUTCDay();var f=(wd===5||wd===6)?1:(wd===0?0.6:0.3);var t18=Math.round(54*f*(k%3?0.9:0.6)),t20=Math.round(54*f*0.7),din=Math.round(80*f*0.8),lun=Math.round(60*f*0.5);
    if(d<'2026-11-12'){t18=t20=din=lun=0;k=1}
    out.push({date:d,lunch:lun,dinner:din,tep18:t18,tep20:t20,events:k%9===0?1:0,event_guests:k%9===0?24:0,bookings:Math.round((lun+din+t18+t20)/3),guests:lun+din+t18+t20+(k%9===0?24:0),requests:k%7===0?2:0,unseated:k%5===0?3:0,allergies:k%4===0?2:0,tep_cap:55,dining_cap:40,closures:d==='2026-12-25'?[{scope:'all',part:'all',reason:'Christmas Day'}]:[]});d=addD(d,1)}return out};
  api.staff_booking_history=function(){return [{at:'2026-12-01T03:10:00Z',actor:'Guest online',action:'Booked online',detail:'Confirmed',type:'event'},{at:'2026-12-01T03:10:05Z',actor:'Email',action:'Booking email sent to guest',detail:'g@example.com',type:'email'},{at:'2026-12-04T22:00:00Z',actor:'Email',action:'Reminder email sent to guest',detail:'g@example.com',type:'email'},{at:'2026-12-05T02:15:00Z',actor:'Roneel',action:'Table set',detail:'Kiku',type:'event'}]};
  /* Host Desk (v52) */
  window.__hx=window.__hx||{m:{},cleaning:{},wait:[],n:0,log:[]};
  function hxm(id){var H=window.__hx;if(!H.m[id]){var p=all.find(function(x){return x.id===id})||{};H.m[id]={id:id,arrived_at:p.arrived_at||null,seated_at:null,departed_at:null,status:p.status||'confirmed',updated_at:'2026-12-05T06:00:00.000Z',is_test:false}}return H.m[id]}
  function hxTouch(m){m.updated_at=new Date(Date.now()+(++window.__hx.n)).toISOString()}
  api.staff_action2=function(a){window.__act=a;var m=hxm(a.p_id);
    if(a.p_action==='arrived'){m.arrived_at=new Date().toISOString();m.status='confirmed'}if(a.p_action==='undo_arrived'){m.arrived_at=null;m.seated_at=null}
    if(a.p_action==='no_show'){m.status='no_show';m.arrived_at=null}if(a.p_action==='reopen')m.status='confirmed';hxTouch(m);window.__hx.log.push(a.p_action+':'+a.p_id);
    try{return api.staff_action(a)}catch(e){return {}}};
  api.staff_host_extras=function(a){var H=window.__hx;all.forEach(function(p){hxm(p.id)});Object.keys(H.m).forEach(function(k){var p=all.find(function(x){return x.id===k});if(p)H.m[k].is_test=/^test/i.test(p.name)});
    return {date:a.p_date,marks:Object.keys(H.m).map(function(k){return H.m[k]}),cleaning:Object.keys(H.cleaning).map(function(k){return {code:k,since:H.cleaning[k],by:'roneel@jacksfiji.com'}}),waitlist:H.wait.filter(function(w){return w.status==='waiting'})}};
  api.staff_host_action=function(a){if(window.__hxConflict===a.p_id){window.__hxConflict=null;hxTouch(hxm(a.p_id));throw new Error('CHANGED_ELSEWHERE')}
    var m=hxm(a.p_id),p=all.find(function(x){return x.id===a.p_id})||{},codes=p.split?Object.keys(p.split):(p.tables||[]);
    if(a.p_seen&&a.p_seen!==m.updated_at)throw new Error('CHANGED_ELSEWHERE');
    if(a.p_action==='seat'){if(!m.arrived_at)throw new Error('NOT_ARRIVED');if(!codes.length)throw new Error('NO_TABLE');if(codes.some(function(c){return window.__hx.cleaning[c]}))throw new Error('TABLE_NOT_READY');m.seated_at=new Date().toISOString()}
    else if(a.p_action==='unseat')m.seated_at=null;
    else if(a.p_action==='depart'){m.departed_at=new Date().toISOString();m.status='completed';codes.forEach(function(c){window.__hx.cleaning[c]=new Date().toISOString()})}
    else if(a.p_action==='undo_depart'){m.departed_at=null;m.status='confirmed';codes.forEach(function(c){delete window.__hx.cleaning[c]})}
    hxTouch(m);window.__hx.log.push(a.p_action+':'+a.p_id);return m};
  api.staff_table_state=function(a){if(a.p_state==='ready')delete window.__hx.cleaning[a.p_code];else window.__hx.cleaning[a.p_code]=new Date().toISOString();window.__hx.log.push('table_'+a.p_state+':'+a.p_code);return {code:a.p_code}};
  api.staff_waitlist_add=function(a){var p=a.p,w={id:'w'+(++window.__hx.n),service:p.service,session_time:p.session_time||null,adults:p.adults,children:p.children||0,size:p.adults+(p.children||0),name:p.name||'Walk-in',phone:p.phone||null,allergens:p.allergens||[],needs:p.needs||null,wheelchair:!!p.wheelchair,high_chairs:0,quoted_minutes:p.quoted_minutes?+p.quoted_minutes:null,added_at:new Date().toISOString(),updated_at:new Date().toISOString(),status:'waiting',is_test:/^test/i.test(p.name||'')};window.__hx.wait.push(w);window.__hx.lastWait=a;return {id:w.id}};
  api.staff_waitlist_update=function(a){var w=window.__hx.wait.find(function(x){return x.id===a.p_id});if(a.p_seen&&a.p_seen!==w.updated_at)throw new Error('CHANGED_ELSEWHERE');Object.assign(w,a.p);if(a.p.adults!=null)w.size=w.adults+(w.children||0);w.quoted_minutes=a.p.quoted_minutes?+a.p.quoted_minutes:null;w.updated_at=new Date(Date.now()+(++window.__hx.n)).toISOString();return {id:w.id}};
  api.staff_waitlist_remove=function(a){var w=window.__hx.wait.find(function(x){return x.id===a.p_id});w.status='removed';w.reason=a.p_reason;return {id:w.id}};
  api.staff_waitlist_restore=function(a){var w=window.__hx.wait.find(function(x){return x.id===a.p_id});w.status='waiting';return {id:w.id}};
  api.staff_waitlist_book=function(a){var w=window.__hx.wait.find(function(x){return x.id===a.p_id});var r=api.staff_create_any({p_service:w.service,p_date:day.date,p_time:a.p_time,p_adults:w.adults,p_children:w.children,p_name:w.name,p_phone:w.phone||'Not given',p_allergens:w.allergens,p_source:'walk_in'});w.status='booked';hxm(r.id).arrived_at=new Date().toISOString();return r};
  api.staff_seat=function(a){window.__seat=a;return {}};api.staff_pin=function(a){window.__pin=a;return {}};api.staff_change_booking=function(a){window.__xchg=a;window.__chg=a;return {}};api.staff_create_any=api.staff_create_any||function(a){window.__created=a;return {id:'99',reference:'KZM-W'}};api.staff_seat_plan=function(a){window.__plan=a;return a.p_items.length};
  /* Host Desk tests: new walk-ins appear in the day, and seating updates the party */
  var _ca=api.staff_create_any;api.staff_create_any=function(a){if(!window.__hxAdd)return _ca(a);window.__created=a;var id='n'+(++window.__hx.n),n=(a.p_adults||0)+(a.p_children||0);
    var p=P(id,a.p_name,n,{adults:a.p_adults,children:a.p_children||0,service:a.p_service,session_time:a.p_time,time_label:a.p_time,allergens:a.p_allergens||[],source:'walk_in',tables:[]});
    if(a.p_service==='teppanyaki'){var s=day.sessions.find(function(x){return x.session_time===a.p_time});if(s){s.unassigned.push(p);s.seats_booked+=n}}else day.dining.push(p);all.push(p);return {id:id,reference:'KZM-W'+id,status:'confirmed'}};
  var _st=api.staff_seat;api.staff_seat=function(a){var r=_st(a);if(!window.__hxAdd)return r;var p=all.find(function(x){return x.id===a.p_id});if(!p)return r;
    day.sessions.forEach(function(s){var inS=s.unassigned.indexOf(p)>=0||s.tables.some(function(t){return t.parties.indexOf(p)>=0});if(!inS)return;s.unassigned=s.unassigned.filter(function(x){return x!==p});s.tables.forEach(function(t){t.parties=t.parties.filter(function(x){return x!==p})});
      Object.keys(a.p_split||{}).forEach(function(c){var t=s.tables.find(function(x){return x.code===c});if(t){t.parties.push(p);t.booked+=a.p_split[c]}})});p.tables=Object.keys(a.p_split||{});p.split=Object.keys(a.p_split||{}).length>1?a.p_split:null;return r};
  api.staff_change_booking=function(a){window.__chg=a;if(a.p_adults+a.p_children>11&&!a.p_force)throw 'SESSION_FULL';var r=rows.find(function(x){return x.id===a.p_id});r.adults=a.p_adults;r.children=a.p_children;r.size=a.p_adults+a.p_children;r.session_time=a.p_time;return r};
  api.staff_get_settings=function(){return {me:{email:'roneel@jacksfiji.com',name:'Roneel',role:(window.__role||'admin')},settings:{alert_email:'roneel@jacksfiji.com',run_sheet_email:'kitchen@kazumifiji.com',guest_reply_to:'info@kazumifiji.com',send_guest_confirmation:true,require_admin_mfa:!!window.__reqmfa},tables:day.tables.map(function(t,i){return {code:t.code,name:t.name,seats:t.seats,active:true,zone:t.zone,chef:t.chef||'top',sort:i+1}}),services:[{code:'teppanyaki',name:'Teppanyaki',max_online_party:20,auto_confirm_max:11,min_party:1,capacity:54,pacing:0,min_notice_minutes:0},{code:'dining',name:'Lunch and dinner',max_online_party:12,auto_confirm_max:8,min_party:1,capacity:40,pacing:16,min_notice_minutes:60},{code:'event',name:'Group or event',max_online_party:50,auto_confirm_max:0,min_party:8,capacity:0,pacing:0,min_notice_minutes:0}],rules:{opening_date:'2026-11-12',max_advance_days:120,tep_max_online:20},hours:[{id:'h1',service:'dining',period:'lunch',first:'11:30',last:'14:00',active:true},{id:'h2',service:'dining',period:'dinner',first:'17:30',last:'21:00',active:true},{id:'h3',service:'event',period:'lunch',first:'11:30',last:'13:30',active:true},{id:'h4',service:'event',period:'dinner',first:'17:30',last:'20:00',active:true}],staff:[{email:'roneel@jacksfiji.com',name:'Roneel',role:'admin',active:true,last_sign_in:'2026-12-05T01:00:00Z'},{email:'pawan@kazumifiji.com',name:'Pawan',role:'staff',active:true,last_sign_in:null,mfa:!window.__pawanoff}]}};
  api.staff_update_settings=function(){return api.staff_get_settings()};
  api.staff_update_table=function(){return api.staff_get_settings()};
  api.staff_update_grill=function(a){window.__lastGrill=a;var t=day.tables.find(function(x){return x.code===a.p_code});if(t){t.name=a.p_name;t.seats=a.p_seats;t.zone=a.p_zone;t.chef=a.p_chef}return api.staff_get_settings()};
  api.staff_move_grill=function(a){var i=day.tables.findIndex(function(x){return x.code===a.p_code}),j=i+(a.p_dir<0?-1:1);if(j>=0&&j<day.tables.length){var x=day.tables[i];day.tables[i]=day.tables[j];day.tables[j]=x}return api.staff_get_settings()};
  api.staff_update_rules=function(a){window.__lastRules=a.p;if(a.p.dining_auto_confirm>a.p.dining_max_online)throw new Error('INVALID_VALUE');return api.staff_get_settings()};
  api.staff_update_hours=function(a){window.__lastHours=a;return api.staff_get_settings()};
  window.__adv=window.__adv||{tep_notice:60,auto_assign_grills:false,auto_confirm:false,guest_emails:true,limit_device_hour:5,limit_active_email:3,limit_site_10min:40,
    sittings:[{time:'17:30',label:'5:30 PM',window:'5:30–7:00 PM',active:true,future:2},{time:'19:00',label:'7:00 PM',window:'7:00–8:30 PM',active:true,future:0}],log:[]};
  api.staff_get_advanced=function(){if(window.__noadv)throw new Error('Could not find the function public.staff_get_advanced');return JSON.parse(JSON.stringify(window.__adv))};
  api.staff_update_advanced=function(a){var A=window.__adv,p=a.p;if(p.tep_notice<0||p.tep_notice>1440)throw new Error('INVALID_VALUE');
    Object.keys(p).forEach(function(k){if(A[k]!==p[k])A.log.unshift({at:'2026-10-09T06:40:00Z',actor:'roneel@jacksfiji.com',setting:k,old:String(A[k]),new:String(p[k])});A[k]=p[k]});return api.staff_get_advanced()};
  api.staff_save_sitting=function(a){var A=window.__adv,t=A.sittings.find(function(x){return x.time===a.p_time});
    if(t){if(!a.p_active&&t.future)throw new Error('SITTING_HAS_BOOKINGS');t.active=a.p_active}else A.sittings.push({time:a.p_time,label:a.p_time,window:a.p_time,active:true,future:0});
    A.log.unshift({at:'2026-10-09T06:40:00Z',actor:'roneel@jacksfiji.com',setting:'Teppanyaki sitting '+a.p_time,old:null,new:a.p_active?'on':'off'});return api.staff_get_advanced()};
  /* v43 guest CRM mock */
  window.__crm=window.__crm||[
    {key:'p9912345',name:'Ana Local',phone:'+679 991 2345',email:'ana@x.fj',visits:4,bookings:4,covers:9,no_shows:0,cancelled:0,upcoming:0,first_visit:'2025-09-07',last_visit:'2026-09-22',next_booking:null,visitor:false,hotel:null,occasions:['Birthday','Anniversary'],vip:true,note:'Window table',consent:{email:true,whatsapp:true,sms:true,ads:true},segments:['returning','regular','celebration','teppanyaki','local','vip','opted_in'],contact_on:'2026-10-20',reason:'Birthday on 10 Nov last time'},
    {key:'p2345678',name:'Ben Visitor',phone:'+61 412 345 678',email:'ben@au.com',visits:1,bookings:1,covers:4,no_shows:0,cancelled:0,upcoming:0,first_visit:'2026-09-12',last_visit:'2026-09-12',next_booking:null,visitor:true,hotel:'Sheraton Fiji',occasions:[],vip:false,note:null,consent:{email:false,whatsapp:false,sms:false,ads:false},segments:['first_visit','teppanyaki','visitor'],contact_on:'2026-10-09',reason:'First visit on 12 Sep: invite them back'},
    {key:'p7002222',name:'Dee Lapsed',phone:'7002222',email:'dee@x.fj',visits:1,bookings:1,covers:2,no_shows:0,cancelled:0,upcoming:0,first_visit:'2026-03-26',last_visit:'2026-03-26',next_booking:null,visitor:false,hotel:null,occasions:[],vip:false,note:null,consent:{email:true,whatsapp:true,sms:false,ads:false},segments:['first_visit','lapsed','lunch_dinner','local','opted_in'],contact_on:'2026-10-09',reason:'No visit since 26 Mar 2026'},
    {key:'p7001111',name:'Cal Noshow',phone:'7001111',email:null,visits:0,bookings:2,covers:0,no_shows:2,cancelled:0,upcoming:0,first_visit:null,last_visit:null,next_booking:null,visitor:false,hotel:null,occasions:[],vip:false,note:null,consent:{email:false,whatsapp:true,sms:true,ads:true},segments:['never_came','teppanyaki','local','no_show_risk','opted_in'],contact_on:null,reason:null}];
  window.__crmLog=window.__crmLog||[];
  function crmCounts(){var c={};window.__crm.forEach(function(g){g.segments.forEach(function(s){c[s]=(c[s]||0)+1})});return c}
  api.staff_crm_guests=function(a){if(window.__role==='staff')throw new Error('ADMIN_ONLY');var p=a.p||{},q=(p.q||'').toLowerCase(),L=window.__crm.filter(function(g){
      return (!q||g.name.toLowerCase().indexOf(q)>=0||(g.email||'').indexOf(q)>=0||g.phone.replace(/\D/g,'').indexOf(q.replace(/\D/g,'')||'#')>=0)&&(!p.seg||(p.seg==='contact_due'?g.contact_on&&g.contact_on<='2026-10-23':g.segments.indexOf(p.seg)>=0))});
    return JSON.parse(JSON.stringify({total:window.__crm.length,counts:crmCounts(),contact_due:window.__crm.filter(function(g){return g.contact_on&&g.contact_on<='2026-10-23'}).length,matches:L.length,guests:L}))};
  api.staff_crm_guest=function(a){var g=window.__crm.find(function(x){return x.key===a.p_key});if(!g)throw new Error('NOT_FOUND');
    return JSON.parse(JSON.stringify(Object.assign({},g,{history:[{id:'h1',reference:'KZM-1',date:'2026-09-22',time:'17:30',service:'teppanyaki',size:2,status:'completed',arrived:true,occasion:'Anniversary',source:'website'}],
      consents:window.__crmLog.filter(function(l){return l.key===g.key})})))};
  api.staff_crm_set_consent=function(a){var g=window.__crm.find(function(x){return x.key===a.p_key});a.p_channels.forEach(function(c){g.consent[c]=a.p_granted;window.__crmLog.unshift({key:g.key,channel:c,granted:a.p_granted,source:'staff',wording:'Guest agreed in person or by phone to receive Kazumi news and offers on the channels recorded.',evidence:a.p_note,by:'roneel',at:'2026-10-09T06:40:00Z'})});
    var any=Object.keys(g.consent).some(function(k){return g.consent[k]});g.segments=g.segments.filter(function(s){return s!=='opted_in'});if(any)g.segments.push('opted_in');return api.staff_crm_guest(a)};
  api.staff_crm_set_note=function(a){var g=window.__crm.find(function(x){return x.key===a.p_key});g.note=a.p_note;g.vip=a.p_vip;return api.staff_crm_guest(a)};
  api.staff_record_booking_optin=function(a){(window.__optins=window.__optins||[]).push(a);if(window.__optinFail)throw new Error('boom');return {recorded:true}};
  api.staff_crm_export=function(a){var p=a.p;window.__lastExport=p;return window.__crm.filter(function(g){return g.consent[p.channel]&&(p.channel!=='email'||g.email)&&(!p.seg||(p.seg==='contact_due'?g.contact_on&&g.contact_on<='2026-10-23':g.segments.indexOf(p.seg)>=0))&&(p.include_no_show||g.segments.indexOf('no_show_risk')<0)})
    .map(function(g){return {name:g.name,phone:g.phone,email:g.email,visits:g.visits,last_visit:g.last_visit,segments:g.segments,contact_on:g.contact_on,reason:g.reason}})};
  api.staff_add_staff=function(a){return {email:a.p_email,temp_password:'Kz-AbCdEfGhJk23'}};
  api.staff_reset_staff_password=function(a){return {email:a.p_email,temp_password:'Kz-ZxYwVuTs98Qp'}};
  api.staff_set_staff=function(){return api.staff_get_settings()};
  api.request_staff_reset=function(){return {ok:true}};
  api.complete_staff_reset=function(){return {ok:true,email:'roneel@jacksfiji.com'}};
  api.staff_calendar2=function(a){var d=api.staff_calendar(a);d.forEach(function(x){x.date=x.date+'T00:00:00+00:00';x.tests=0;x.tep_cap=55;x.teps=[{time:'17:30',label:'5:30 PM',guests:x.tep18},{time:'19:00',label:'7:00 PM',guests:x.tep20}]});var last=a.p_to;return {days:d,next_after:last<'2026-11-12'?'2026-11-13':null,hidden_tests:a.p_tests?0:2}};
  api.staff_next_booked_day=function(a){return a.p_after<'2026-11-13'?'2026-11-13':null};
  var _gd=api.staff_get_day;api.staff_get_day=function(a){if(window.__alc&&api.__alcDay)api.__alcDay();if(window.__emptyDay)return {date:a.p_date,dining:[],events:[],locked:false,tables:day.tables,closures:[],venue_closures:[],inactive:[],sessions:day.sessions.map(function(s){return Object.assign({},s,{tables:s.tables.map(function(t){return Object.assign({},t,{booked:0,parties:[]})}),unassigned:[],seats_booked:0,party_count:0})})};var r=_gd(a);if(window.__allPinned)r.sessions.forEach(function(x){x.tables.forEach(function(t){t.parties.forEach(function(q){q.pinned=true})})});return r};
  var _gd2=api.staff_get_day;api.staff_get_day=function(a){var d=_gd2(a);if(window.__dayPatch&&!d.__patched){window.__dayPatch(d);d.__patched=true}d.blocks=window.__blocks||[];return d};
  api.staff_block_grill=function(a){(window.__blockCalls=window.__blockCalls||[]).push(a);window.__blocks=(window.__blocks||[]).filter(function(b){return !(b.session_time===a.p_session&&b.code===a.p_code)});window.__blocks.push({session_time:a.p_session,code:a.p_code,reason:a.p_reason,by:"roneel"});return window.__blocks};
  api.staff_unblock_grill=function(a){window.__blocks=(window.__blocks||[]).filter(function(b){return !(b.session_time===a.p_session&&b.code===a.p_code)});return window.__blocks};
  window.__rec={run_sheet:{to:'roneel@jacksfiji.com',cc:['manager@kazumifiji.com']},kitchen:{to:'roneel@jacksfiji.com',cc:[]},alert:{to:'roneel@jacksfiji.com',cc:[]}};
  api.staff_get_recipients=function(){return window.__rec};
  api.staff_set_recipients=function(a){if(a.p_cc.length>20)throw 'TOO_MANY';window.__rec[a.p_kind]={to:a.p_to,cc:a.p_cc};window.__setrec=a;return window.__rec};
  api.staff_set_extras=function(a){window.__extras=a;var r=rows.find(function(x){return x.id===a.p_id})||rows[0];Object.assign(r,a.p_extras);return r};
  api.staff_set_guest=function(a){window.__guest=a;var r=rows.find(function(x){return x.id===a.p_id})||rows[0];r.guest_note=a.p_note;r.vip=a.p_vip;return r};
  api.staff_guest_bookings=function(){return [{id:'03',date:'2026-11-20',session_time:'17:30',service:'teppanyaki',size:4,status:'completed',occasion:'Birthday',reference:'KZM-1120-1111'},{id:'05',date:'2026-10-02',session_time:'19:00',service:'dining',size:2,status:'no_show',reference:'KZM-1002-2222'}]};
  api.staff_set_admin_mfa=function(a){if(a.p_on&&window.__mfa.aal!=='aal2')throw new Error('MFA_SETUP_FIRST');window.__reqmfa=!!a.p_on;return api.staff_get_settings()};
  api.staff_reset_staff_mfa=function(a){window.__resetmfa=a.p_email;window.__pawanoff=true;return api.staff_get_settings()};
  window.__mfa=window.__mfa||{factors:[],aal:'aal1'};
  /* v59: manager approvals and safety checks */
  window.__reqs=window.__reqs||[];
  function kzErr(m,d){var e=new Error(m);e.details=d;return e}
  function kzGate(w){if(window.__role==='staff')throw kzErr('NEEDS_APPROVAL',w)}
  function kzSeen(a){if(window.__conflict&&a.p_seen)throw kzErr('CHANGED_ELSEWHERE','Jone Waqa|7:42 PM|Details updated')}
  var _a2=api.staff_action2;api.staff_action2=function(a){if(['confirm','decline','cancel'].indexOf(a.p_action)>=0)kzGate(a.p_action);return _a2(a)};
  var _cb=api.staff_change_booking;api.staff_change_booking=function(a){window.__chgArgs=a;kzSeen(a);kzGate('change');return _cb(a)};
  var _ub=api.staff_update_booking;api.staff_update_booking=function(a){window.__updArgs=a;kzSeen(a);var r=_ub(a);return Object.assign({},r,{seen:'2026-12-05T07:10:00Z'})};
  var _se=api.staff_set_extras;if(_se)api.staff_set_extras=function(a){window.__extArgs=a;kzSeen(a);return _se(a)};
  ['staff_add_closure_v2','staff_remove_closure_v2'].forEach(function(k){var f=api[k];if(f)api[k]=function(a){kzGate('closure');return f(a)}});
  ['staff_block_grill','staff_unblock_grill'].forEach(function(k){var f=api[k];if(f)api[k]=function(a){kzGate('grill');return f(a)}});
  var _cr=api.staff_create_any;api.staff_create_any=function(a){if(window.__full&&!/^TEST/.test(a.p_name||''))kzGate('overbook');return _cr(a)};
  var _gb=api.staff_get_booking;api.staff_get_booking=function(a){var r=_gb(a);var x=Object.assign({},r,{seen:'2026-12-05T07:00:00Z',email_problems:window.__mailBad&&r.id===window.__mailBad?[{src:'email',id:'e1',label:'Booking email',to:r.email||'guest@x.fj',error:'Mailbox full'}]:[]});
    if(window.__algChecked&&window.__algChecked[r.id])x.allergy_checked_at='2026-12-05T06:30:00Z',x.allergy_checked_by='Sam';return x};
  api.staff_request_change=function(a){window.__reqArgs=a;var q={id:'q'+(window.__reqs.length+1),kind:'x',summary:'Summary of '+a.p_fn+' '+(a.p_args.p_action||''),reason:a.p_reason,status:'pending',mine:true,requested_name:'Sam',requested_at:'2026-12-05T07:00:00Z',reservation_id:a.p_args.p_id||null,fn:a.p_fn};window.__reqs.push(q);return {id:q.id,summary:q.summary}};
  api.staff_list_requests=function(){return {approver:window.__role!=='staff',items:window.__reqs}};
  api.staff_withdraw_request=function(a){var q=window.__reqs.find(function(x){return x.id===a.p_id});q.status='withdrawn';q.decided_name='Sam';q.decided_at='2026-12-05T07:05:00Z';return api.staff_list_requests()};
  api.staff_decide_request=function(a){window.__decided=a;var q=window.__reqs.find(function(x){return x.id===a.p_id});if(!q)throw kzErr('NOT_FOUND');if(q.status!=='pending')throw kzErr('ALREADY_DECIDED');
    if(window.__needForce&&a.p_approve&&!a.p_force)return {ok:false,error:'SESSION_FULL',can_force:true};
    q.status=a.p_approve?'approved':'declined';q.decided_name='Roneel';q.decided_at='2026-12-05T07:06:00Z';q.decision_note=a.p_note;return {ok:true,status:q.status}};
  api.staff_same_day=function(a){window.__sameArgs=a;return window.__same||[]};
  api.staff_allergy_check=function(a){window.__algCheck=a;window.__algChecked=window.__algChecked||{};window.__algChecked[a.p_id]=a.p_checked;return api.staff_get_booking({p_id:a.p_id})};
  api.staff_email_retry=function(a){window.__mailRetry=a;window.__mailBad=null;return {}};
  api.staff_email_handled=function(a){window.__mailDone=a;window.__mailBad=null;return {}};
  var _nd=api.staff_needs;api.staff_needs=function(){var r=_nd();return Object.assign({},r,{approver:window.__role!=='staff',
    approvals:window.__reqs.filter(function(q){return window.__role==='staff'?q.mine:q.status==='pending'}),allergy_unchecked:window.__algUn||[],email_failed:window.__mailFailed||[]})};
  var mfa={getAuthenticatorAssuranceLevel:async function(){var M=window.__mfa;return {data:{currentLevel:M.aal,nextLevel:M.factors.some(function(f){return f.status==='verified'})?'aal2':'aal1'},error:null}},
    listFactors:async function(){var M=window.__mfa;return {data:{all:M.factors.slice(),totp:M.factors.slice()},error:null}},
    enroll:async function(){var M=window.__mfa,f={id:'f'+(M.factors.length+1),status:'unverified'};M.factors.push(f);return {data:{id:f.id,totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#000"/></svg>',secret:'JBSWY3DPEHPK3PXP'}},error:null}},
    challengeAndVerify:async function(a){var M=window.__mfa;if(a.code!=='123456')return {error:{message:'Invalid TOTP code entered'}};M.factors.forEach(function(f){if(f.id===a.factorId)f.status='verified'});M.aal='aal2';return {data:{},error:null}},
    unenroll:async function(a){var M=window.__mfa;M.factors=M.factors.filter(function(f){return f.id!==a.factorId});return {data:{},error:null}}};
  // À la carte floor (only when a test sets window.__alc, so older tests see the day as before)
  var FLOOR=[];[2,2,2,2,2,2,4,4,4,4,6].forEach(function(n,i){FLOOR.push({code:'D'+(i+1),name:'Table '+(i+1),area:'dining_room',seats:n,join:i<10?'abcde'[Math.floor(i/2)]:null})});
  for(var yi=1;yi<=8;yi++)FLOOR.push({code:'Y'+yi,name:'Yakitori '+yi,area:'yakitori_counter',seats:1,join:null});for(var si=1;si<=6;si++)FLOOR.push({code:'S'+si,name:'Sushi '+si,area:'sushi_bar',seats:1,join:null});
  window.__floor=FLOOR;api.__alcDay=function(){alcDay()};
  function alcDay(){if(day.__alcDone)return;day.__alcDone=true;
    day.dining.forEach(function(p){if(p.name==='Singh')p.tables=['Y1','Y2','Y3','Y4'];if(p.name==='Ali Family')p.tables=['D11']});
    [['31','Morris',2,'12:00',['D1']],['32','Fong',4,'12:15',['D7']],['33','Patel',3,'12:45',null,'sushi_bar'],['34','Kaur',2,'18:00',['D1']],['35','Young',2,'18:15',['D2']],['36','Lal',4,'18:30',['D7']],['37','Bose',2,'19:15',['S1','S2']],['38','Dutt',5,'19:45',null],['39','Ito',2,'20:00',['D1']]].forEach(function(x){
      var p=P(x[0],x[1],x[2],{service:'dining',session_time:x[3],time_label:tl0(x[3]),tables:x[4]||[],seating_pref:x[5]||'dining_room',allergens:x[1]==='Fong'?['Sesame']:[]});day.dining.push(p);rows.push(listRow(p,x[3]))});
    day.dining.sort(function(a,b){return a.session_time<b.session_time?-1:1})}
  function tl0(t){var h=+t.slice(0,2);return ((h%12)||12)+':'+t.slice(3)+' '+(h<12?'AM':'PM')}
  api.staff_get_alc=function(a){if(!window.__alc)throw new Error('missing');alcDay();var st={};day.dining.forEach(function(p){st[p.id]=window.__stay&&window.__stay[p.id]||(p.session_time<'16:00'?90:120)});
    return {floor:FLOOR,hours:[{period:'lunch',first:'11:30',last:'14:00',slot:15,minutes:90},{period:'dinner',first:'17:30',last:'21:00',slot:15,minutes:120}],stay:st}};
  api.staff_seat_alc=function(a){window.__aseat=a;var p=day.dining.find(function(x){return x.id===a.p_id});
    var clash=day.dining.filter(function(q){if(q.id===p.id||!(q.tables||[]).some(function(c){return a.p_codes.indexOf(c)>=0}))return false;var s1=+p.session_time.slice(0,2)*60+ +p.session_time.slice(3),s2=+q.session_time.slice(0,2)*60+ +q.session_time.slice(3),d1=s1<960?90:120,d2=s2<960?90:120;return s1<s2+d2&&s2<s1+d1});
    var seats=FLOOR.filter(function(f){return a.p_codes.indexOf(f.code)>=0}).reduce(function(n,f){return n+f.seats},0);
    if(!a.p_force&&(clash.length||seats<p.size))return {ok:false,conflicts:clash.map(function(q){return {id:q.id,name:q.name,size:q.size,time:q.session_time,codes:q.tables}}),seats:seats,size:p.size};
    p.tables=a.p_codes.slice();return {ok:true}};
  api.staff_get_floor=function(){return FLOOR.map(function(f){return Object.assign({active:true},f)})};
  api.staff_save_floor_item=function(a){window.__floorSave=a;if(a.p_code){var f=FLOOR.find(function(x){return x.code===a.p_code});Object.assign(f,{name:a.p_name,seats:a.p_seats,join:a.p_join||null})}else{var pre=a.p_area==='dining_room'?'D':a.p_area==='yakitori_counter'?'Y':'S',n=FLOOR.filter(function(x){return x.code[0]===pre}).length+1;FLOOR.push({code:pre+n,name:a.p_name,area:a.p_area,seats:a.p_seats,join:a.p_join||null})}return api.staff_get_floor()};
  api.staff_move_floor_item=function(a){var i=FLOOR.findIndex(function(x){return x.code===a.p_code}),j=i+(a.p_dir<0?-1:1);if(j>=0&&j<FLOOR.length&&FLOOR[j].area===FLOOR[i].area){var x=FLOOR[i];FLOOR[i]=FLOOR[j];FLOOR[j]=x}return api.staff_get_floor()};
  /* v61: guest places (seed rows from db/migrations/20261014b_guest_origin.sql, with booking counts) */
  window.__places=window.__places||[['sheraton_fiji','Sheraton Fiji Golf and Beach Resort','hotel','Denarau',['Sheraton','Sheraton Fiji','Sheraton Denarau','Sheraton Golf'],1,412],
    ['hilton_fiji','Hilton Fiji Beach Resort and Spa','hotel','Denarau',['Hilton','Hilton Denarau','Hilton Fiji'],2,365],['sofitel_fiji','Sofitel Fiji Resort and Spa','hotel','Denarau',['Sofitel','Sofitel Denarau'],3,298],
    ['radisson_blu','Radisson Blu Resort Fiji','hotel','Denarau',['Radisson Blu','Radisson','Radisson Denarau'],4,240],['wyndham_denarau','Wyndham Resort Denarau Island','hotel','Denarau',['Wyndham','Club Wyndham'],5,210],
    ['sheraton_villas','Sheraton Denarau Villas','hotel','Denarau',['Sheraton Villas','Denarau Villas'],6,150],['local_nadi','Nadi Town','local','Nadi',[],7,140],['crowne_plaza','Crowne Plaza Fiji Nadi Bay','hotel','Nadi',['Crowne Plaza','Crown Plaza'],8,120],
    ['the_palms','The Palms Denarau','hotel','Denarau',['The Palms','Palms'],9,96],['local_denarau','Denarau resident','local','Denarau',['Island resident'],11,80],['marina_boat','On a boat at Port Denarau Marina','other','Denarau',['Boat','Yacht','Marina','Port Denarau Marina'],12,40],
    ['marriott_momi','Fiji Marriott Resort Momi Bay','hotel','Momi Bay',['Marriott','Momi Bay'],13,38],['local_lautoka','Lautoka','local','Western',[],19,66],['westin_denarau','The Westin Denarau Island Resort and Spa','hotel','Denarau',['Westin'],25,30],
    ['local_suva','Suva','local','Central',[],29,22],['local_martintar','Martintar, Nadi','local','Nadi',['Martintar'],50,18],['local_sigatoka','Sigatoka','local','Western',[],56,9],['local_other','Elsewhere in Fiji','local','Fiji',['Local'],70,12],
    ['cruise_ship','Cruise ship','other','Other',['Cruise'],80,4]].map(function(x){return {code:x[0],name:x[1],kind:x[2],area:x[3],aliases:x[4],sort_order:x[5],is_active:true,bookings:x[6]}});
  function plSorted(){return window.__places.slice().sort(function(a,b){return a.sort_order-b.sort_order||(a.name<b.name?-1:1)})}
  api.staff_list_places=function(){window.__plLoads=(window.__plLoads||0)+1;if(window.__plFail)throw new Error('NETWORK');return plSorted()};
  api.staff_save_place=function(a){window.__plSave=a;if(window.__role&&window.__role!=='admin')throw new Error('NOT_ADMIN');
    if(!a.p_name||!String(a.p_name).trim()||['hotel','local','other'].indexOf(a.p_kind)<0)throw new Error('INVALID_VALUE');
    var code=a.p_code||String(a.p_name).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''),p=window.__places.find(function(x){return x.code===code});
    var v={code:code,name:String(a.p_name).trim(),kind:a.p_kind,area:a.p_area||'',aliases:a.p_aliases||[],sort_order:a.p_sort==null?1000:a.p_sort,is_active:a.p_active!==false,bookings:p?p.bookings:0};
    if(p)Object.assign(p,v);else window.__places.push(v);return plSorted()};
  /* staff_set_extras records every location sent, and stores it the way the database does */
  var _se61=api.staff_set_extras;api.staff_set_extras=function(a){var x=a.p_extras||{};if('location' in x)(window.__locs=window.__locs||[]).push({id:a.p_id,location:x.location,seen:a.p_seen||null});
    var r=_se61(a);var dp=all.find(function(q){return q.id===a.p_id});if('location' in x){var t=String(x.location||'').trim(),pl=window.__places.find(function(p){return p.is_active&&(p.name.toLowerCase()===t.toLowerCase()||p.aliases.some(function(al){return al.toLowerCase()===t.toLowerCase()}))});
      if(!t||/^did not say$/i.test(t)){r.location=null;r.guest_origin='not_given';r.place_code=null}else if(pl){r.location=pl.name;r.guest_origin=pl.kind;r.place_code=pl.code}else{r.location=t;r.guest_origin='other';r.place_code=null}if(dp)['location','guest_origin','place_code'].forEach(function(k){dp[k]=r[k]})}return r};
  /* v62: the rules of migration 20261014c. window.__seat and window.__plan keep recording the seating itself; the full
     arguments, with the seen time and the override, are in window.__seatArgs and window.__planArgs. Grill seats (GRILL_FULL, manager override with "force"), seating saves refused
     when someone else changed the booking (window.__seatConflict), Arrived only for confirmed bookings today and No-show
     only today or earlier (window.__pdate[id] sets a booking's date; otherwise it is the day shown). */
  function fijiDay(){var p=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};p.forEach(function(x){o[x.type]=x.value});return o.year+'-'+o.month+'-'+o.day}
  window.__serverToday=window.__serverToday||null;
  function sessOf(id){var hit=null;day.sessions.forEach(function(s){if(hit)return;if((s.unassigned||[]).some(function(p){return p.id===id})||s.tables.some(function(t){return t.parties.some(function(p){return p.id===id})}))hit=s});return hit}
  function shareAt(p,code){var c=p.split&&Object.keys(p.split).length?Object.keys(p.split):(p.tables||[]);if(c.indexOf(code)<0)return 0;if(p.split&&p.split[code]!=null)return p.split[code];return p.size}
  function seatCheck(id,split,force){var mv=window.__chgArgs&&window.__chgArgs.p_id===id&&window.__chgArgs.p_time,s=(mv&&day.sessions.find(function(x){return x.session_time===mv}))||sessOf(id);if(!s||!split||!Object.keys(split).length)return;var me=all.find(function(x){return x.id===id})||{},n=Object.keys(split).length,logs=[];
    Object.keys(split).forEach(function(code){var t=s.tables.find(function(x){return x.code===code}),tab=day.tables.find(function(x){return x.code===code})||{};if(!t)return;
      var seen={},others=0;t.parties.forEach(function(p){if(p.id===id||seen[p.id])return;seen[p.id]=1;others+=shareAt(p,code)});
      var cap=(window.__blocks||[]).some(function(b){return b.session_time===s.session_time&&b.code===code})?0:(tab.seats||t.seats),share=n>1?split[code]:(me.size||split[code]);
      if(others+share>cap){if(!force||window.__role==='staff')throw kzErr('GRILL_FULL',(tab.name||code)+'|'+others+'|'+cap+'|'+(others+share)+'|'+code);
        logs.push('Grill '+(tab.name||code)+' over-seated: '+(others+share)+' of '+cap+' seats, by roneel@jacksfiji.com')}});
    window.__overLog=(window.__overLog||[]).concat(logs)}
  function seatSeen(seen){if(window.__seatConflict&&seen)throw kzErr('CHANGED_ELSEWHERE','Jone Waqa|7:42 PM|Table set')}
  var _seat62=api.staff_seat;api.staff_seat=function(a){(window.__seatArgs=window.__seatArgs||[]).push(a);seatSeen(a.p_seen);seatCheck(a.p_id,a.p_split,a.p_force);return _seat62({p_id:a.p_id,p_split:a.p_split})};
  var _plan62=api.staff_seat_plan;api.staff_seat_plan=function(a){(window.__planArgs=window.__planArgs||[]).push(a);a.p_items.forEach(function(it){seatSeen(it.seen);seatCheck(it.id,it.split,it.force)});
    return _plan62({p_items:a.p_items.map(function(it){var o={};Object.keys(it).forEach(function(k){if(k!=='seen'&&k!=='force')o[k]=it[k]});return o})})};
  var _a62=api.staff_action2;api.staff_action2=function(a){if(a.p_action==='arrived'||a.p_action==='no_show'){var p=all.find(function(x){return x.id===a.p_id})||rows.find(function(x){return x.id===a.p_id})||{},m=window.__hx.m[a.p_id];
      var st=(m&&m.status)||p.status,dd=(window.__pdate&&window.__pdate[a.p_id])||day.date,t=window.__serverToday||fijiDay();
      if(/^pending/.test(st||''))throw kzErr('NOT_CONFIRMED');if(a.p_action==='arrived'?dd!==t:dd>t)throw kzErr('NOT_TODAY')}
    return _a62(a)};
  /* a booking shown on the day carries that day's date in its panel, as it does from the database */
  var _gb62=api.staff_get_booking;api.staff_get_booking=function(a){var r=_gb62(a);if(r&&(sessOf(r.id)||day.dining.concat(day.events).some(function(x){return x.id===r.id})))r.date=(window.__pdate&&window.__pdate[r.id])||day.date;return r};
  var _gd62=api.staff_get_day;api.staff_get_day=function(a){var d=_gd62(a);d.seen=window.__daySeen||'2026-12-05T07:00:00.000Z';return d};
  /* v63: the rules of migration 20261014d. The number of guests can change after arrival (date and time cannot), with the
     grill seat check for a party on one grill (GRILL_FULL, override "p_force" for managers); Left updates the booking
     (status completed); restore of a cancelled booking for managers (window.__cx holds cancelled bookings by id when a
     test sets window.__restoreMock; window.__restoreFull makes the sitting full); acknowledged allergies show on the day. */
  var _cb63=api.staff_change_booking;api.staff_change_booking=function(a){if(window.__role==='staff')return _cb63(a);
    var r=rows.find(function(x){return x.id===a.p_id})||{},m=window.__hx.m[a.p_id],arr=(m&&m.arrived_at)||r.arrived_at,dd=(window.__pdate&&window.__pdate[a.p_id])||day.date;
    if(arr&&((a.p_date&&a.p_date!==dd)||(a.p_time&&a.p_time!==(r.session_time||a.p_time))))throw kzErr('BAD_STATE');
    var n=(a.p_adults||0)+(a.p_children||0),s=sessOf(a.p_id),me=all.find(function(x){return x.id===a.p_id})||{};
    if(s&&(me.tables||[]).length===1&&n!==me.size){var code=me.tables[0],t=s.tables.find(function(x){return x.code===code}),tab=day.tables.find(function(x){return x.code===code})||{},seen={},others=0;
      if(t)t.parties.forEach(function(q){if(q.id===a.p_id||seen[q.id])return;seen[q.id]=1;others+=shareAt(q,code)});
      if(t&&others+n>tab.seats){if(!a.p_force)throw kzErr('GRILL_FULL',tab.name+'|'+others+'|'+tab.seats+'|'+(others+n)+'|'+code);window.__overLog=(window.__overLog||[]).concat(['Grill '+tab.name+' over-seated: '+(others+n)+' of '+tab.seats+' seats, by roneel@jacksfiji.com'])}}
    (window.__chg63=window.__chg63||[]).push(a);return _cb63(a)};
  var _ha63=api.staff_host_action;api.staff_host_action=function(a){var m=_ha63(a),r=rows.find(function(x){return x.id===a.p_id});if(r){if(a.p_action==='depart')r.status='completed';if(a.p_action==='undo_depart')r.status='confirmed'}return m};
  var _gb63=api.staff_get_booking;api.staff_get_booking=function(a){if(window.__restoreMock){window.__cx=window.__cx||{'11':{id:'11',reference:'KZM-X',name:'Jones',size:2,adults:2,children:0,status:'cancelled',date:day.date,session_time:'17:30',service:'teppanyaki',phone:'+679 111 0011',email:'jones@example.com',tables:[],allergens:[],source:'phone',created_at:'2026-12-01T03:10:00Z'}};
      var c=window.__cx[a.p_id];if(c)return Object.assign({},c,{seen:'2026-12-05T07:00:00Z',email_problems:[]})}return _gb63(a)};
  api.staff_restore_booking=function(a){window.__restoreArgs=a;if(window.__role==='staff')throw kzErr('MANAGER_ONLY');var c=window.__cx&&window.__cx[a.p_id];if(!c||c.status!=='cancelled')throw kzErr('BAD_STATE');
    if(window.__restoreFull)throw kzErr('SESSION_FULL');c.status='confirmed';window.__restored=a.p_id;return Object.assign({},c)};
  var _gd63=api.staff_get_day;api.staff_get_day=function(a){var d=_gd63(a);if(window.__algChecked){var k=window.__algChecked;
      d.sessions.forEach(function(s){(s.unassigned||[]).concat.apply(s.unassigned||[],s.tables.map(function(t){return t.parties})).forEach(function(p){if(p.id in k)p.allergy_checked_at=k[p.id]?'2026-12-05T06:30:00Z':null})});
      (d.dining||[]).forEach(function(p){if(p.id in k)p.allergy_checked_at=k[p.id]?'2026-12-05T06:30:00Z':null})}return d};
  /* v66: the allergy answer (database change 20261015a). As in the database: allergens recorded always means has, and a
     has booking with every allergen removed goes back to not_asked; staff_set_extras accepts allergy_status (any other
     value is INVALID_VALUE). window.__algSt = {id: answer} sets answers for a test. */
  function algSync(r){if(!r)return;if(r.allergens&&r.allergens.length)r.allergy_status='has';else if(!r.allergy_status||r.allergy_status==='has')r.allergy_status='not_asked'}
  function dayParty(id){var f=[];day.sessions.forEach(function(s){(s.unassigned||[]).forEach(function(p){if(p.id===id)f.push(p)});s.tables.forEach(function(t){t.parties.forEach(function(p){if(p.id===id&&f.indexOf(p)<0)f.push(p)})})});
    (day.dining||[]).concat(day.events||[]).forEach(function(p){if(p.id===id)f.push(p)});return f}
  function algApply(){var k=window.__algSt||{};Object.keys(k).forEach(function(id){rows.concat(dayParty(id)).forEach(function(r){if(r.id===id&&!(r.allergens&&r.allergens.length))r.allergy_status=k[id]})})}
  all.forEach(algSync);rows.forEach(algSync);
  var _se66=api.staff_set_extras;api.staff_set_extras=function(a){var x=a.p_extras||{};
    if('allergy_status' in x&&['not_asked','none','has','not_sure'].indexOf(x.allergy_status)<0)throw kzErr('INVALID_VALUE');
    if('allergy_status' in x)(window.__algSets=window.__algSets||[]).push({id:a.p_id,v:x.allergy_status});
    var r=_se66(a);rows.filter(function(q){return q.id===a.p_id}).concat(dayParty(a.p_id)).forEach(function(q){if('allergy_status' in x)q.allergy_status=x.allergy_status;algSync(q)});
    var row=rows.find(function(q){return q.id===a.p_id});return row?Object.assign({},r,{allergy_status:row.allergy_status}):r};
  var _ub66=api.staff_update_booking;api.staff_update_booking=function(a){var r=_ub66(a);rows.filter(function(q){return q.id===a.p_id}).concat(dayParty(a.p_id)).forEach(function(q){q.allergens=a.p_allergens||[];algSync(q)});
    var row=rows.find(function(q){return q.id===a.p_id});return Object.assign({},r,{allergy_status:row&&row.allergy_status})};
  /* window.__rowsAdd: a booking made in a test can also be opened in the booking panel (v66adaptive) */
  var _ca66=api.staff_create_any;api.staff_create_any=function(a){var r=_ca66(a);if(window.__rowsAdd&&r&&r.id&&!rows.some(function(x){return x.id===r.id})){var p=all.find(function(x){return x.id===r.id});if(p)rows.push(Object.assign(listRow(p,p.session_time),{date:day.date}))}return r};
  var _gd66=api.staff_get_day;api.staff_get_day=function(a){algApply();return _gd66(a)};
  var _gb66=api.staff_get_booking;api.staff_get_booking=function(a){algApply();var r=_gb66(a),row=rows.find(function(q){return q.id===a.p_id});if(row)r.allergy_status=row.allergy_status;return r};
  /* v77: Analytics (staff_analytics). A realistic month after opening; window.__anEmpty gives the pre-opening answer */
  api.staff_analytics=function(a){if(window.__role==='staff')return {ok:false,error:'not_allowed'};
    var empty=!!window.__anEmpty&&!a.p_tests;
    function side(code,k){var z=empty?0:1,g=Math.round(k*z);var cks=[30,21,14,10,7,5,3,2,1,0],cur={},prev={},known={};cks.forEach(function(c,i){cur[c]=Math.round(g*(0.25+0.075*i));prev[c]=Math.round(g*0.8*(0.22+0.078*i));known[c]=true});
      var wk=[0,1,2,3,4].map(function(i){var d=new Date(Date.UTC(2026,9,1+7*i));return {w:d.toISOString().slice(0,10),g:Math.round(g/5*(0.8+i*0.1))}}).filter(function(){return z});
      var heat={};if(z){[1,2,3,4,5,6,7].forEach(function(d){if(code==='tep'){heat[d+'_17:30']=Math.round(g/14*(d>4?1.6:0.7));heat[d+'_19:00']=Math.round(g/14*(d>4?1.2:0.5))}else{heat[d+'_lunch']=Math.round(g/14*(d>5?1.3:0.6));heat[d+'_dinner']=Math.round(g/14*(d>4?1.4:0.8))}})}
      var ahead=[];for(var i=0;i<14;i++){var d=new Date(Date.UTC(2026,9,9+i));ahead.push({d:d.toISOString().slice(0,10),g:z?Math.round((code==='tep'?30:14)*(0.4+((i*7)%5)/5)):0})}
      return {code:code,name:code==='tep'?'Teppanyaki':'Lunch and dinner',bookings:Math.round(g/3.4),bookings_prev:Math.round(g/3.6),guests:g,guests_prev:Math.round(g*0.82),seated:Math.round(g*0.78),requests:z*4,
        cancelled:Math.round(g*0.06),no_show:Math.round(g*0.03),to_come:Math.round(g*0.1),not_marked:Math.round(g*0.03),walkins:z*(code==='tep'?9:22),walkin_guests:z*(code==='tep'?24:51),walkin_guests_prev:z*(code==='tep'?18:40),
        walkin_origin:{local:z*(code==='tep'?8:30),visitor:z*(code==='tep'?14:17),not_asked:z*(code==='tep'?2:4)},origin:z?{hotel:Math.round(g*0.52),local:Math.round(g*0.18),visitor:Math.round(g*0.2),unknown:Math.round(g*0.1)}:{},
        lead:z?{same:Math.round(g/40),d1_3:Math.round(g/18),d4_7:Math.round(g/14),d8_14:Math.round(g/20),d15:Math.round(g/30)}:{},heat:heat,weekly:wk,
        hotels:z?[{name:'Sheraton Fiji Golf and Beach Resort',guests:Math.round(g*0.18)},{name:'Hilton Fiji Beach Resort',guests:Math.round(g*0.12)},{name:'Sofitel Fiji Resort and Spa',guests:Math.round(g*0.1)},{name:'Crowne Plaza Fiji Nadi Bay',guests:Math.round(g*0.07)},{name:'Radisson Blu Resort Fiji',guests:Math.round(g*0.05)}]:[],
        occasion_list:z?[{name:'Birthday',n:code==='tep'?21:9},{name:'Anniversary',n:code==='tep'?14:6},{name:'Honeymoon',n:code==='tep'?9:2},{name:'Business Dinner',n:3}]:[],occasions:z*(code==='tep'?47:20),
        guest_keys:Math.round(g/3.4),returning:Math.round(g/3.4*0.12),groups8:z*(code==='tep'?11:4),groups8_guests:z*(code==='tep'?104:38),children:z*(code==='tep'?36:12),next7:z*(code==='tep'?182:76),next7_bookings:z*(code==='tep'?54:24),
        ahead:ahead,big_upcoming:z&&code==='tep'?[{date:'2026-10-10',time:'17:30',guests:10},{date:'2026-10-12',time:'19:00',guests:9}]:[],
        sittings:code==='tep'?[{time:'17:30',guests:Math.round(g*0.58),seats:1674},{time:'19:00',guests:Math.round(g*0.42),seats:1674}]:null,
        pace:{cur:cur,prev:prev,known:known,now_cur:g,now_prev:Math.round(g*0.82)}}}
    return {ok:true,from:a.p_from,to:a.p_to,today:'2026-10-09',tests:!!a.p_tests,first_booking:empty?null:'2026-10-01',sides:[side('tep',1240),side('alc',530)]}};
  /* v78: the Heartbeat (staff_heartbeat). Bookings due and made around 9 Oct 2026, a closure, two walk-in days; window.__anEmpty gives the pre-opening answer */
  api.staff_heartbeat=function(a){if(window.__role==='staff')return {ok:false,error:'not_allowed'};var empty=!!window.__anEmpty&&!a.p_tests,days={},today='2026-10-09';
    function add(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
    if(!empty)for(var i=-40;i<=60;i++){var d=add(today,i),w=new Date(d+'T12:00:00Z').getUTCDay(),k=(w===5||w===6)?1.6:1;
      var tg=Math.round((38+((i*13)%17))*k*(i>30?0.5:1)),ag=Math.round((16+((i*7)%11))*k*(i>30?0.4:1)),tm=i<=0?Math.round(22+((i*5)%9)):0,am=i<=0?Math.round(9+((i*3)%7)):0;
      days[d]=[tg,Math.round(tg/3.4),tm,Math.round(tm/3.2),i<=0&&i%3===0?4:0,ag,Math.round(ag/3.1),am,Math.round(am/3),i<=0&&i%2===0?6:0]}
    var sit=[];if(!empty)for(var j=0;j<14;j++){sit.push({d:add(today,j),t:'17:30',g:20+((j*11)%30)},{d:add(today,j),t:'19:00',g:14+((j*7)%25)})}
    return {ok:true,today:today,tests:!!a.p_tests,seats:55,first_booking:empty?null:add(today,-40),first_made:empty?null:add(today,-55),days:days,sittings:sit,times:['18:00','20:00'],
      closures:empty?[]:[{d:'2026-10-20',what:'Teppanyaki',reason:'Kitchen maintenance'}]}};
  window.__api=api;
  window.__kzPracticeSupabase={createClient:function(){return {
    auth:{getSession:async function(){return {data:{session:signed?{}:null}}},signInWithPassword:async function(){signed=true;window.__mfa.aal='aal1';return {error:null}},refreshSession:async function(){var M=window.__mfa;if(!M.factors.some(function(f){return f.status==='verified'}))M.aal='aal1';return {}},mfa:mfa,signOut:async function(){signed=false;return {}},updateUser:async function(){return {error:null}},onAuthStateChange:function(){}},
    rpc:async function(fn,args){window.__calls.push(fn);if(!api[fn])return {error:{message:'missing '+fn}};var dl=window.__mockDelay&&window.__mockDelay[fn];if(dl)await new Promise(function(r){setTimeout(r,dl)});if(window.__mockFail===fn){if(window.__mockFailOnce)window.__mockFail=null;return {error:{message:'NETWORK'}}}try{var d=api[fn](args||{});return {data:JSON.parse(JSON.stringify(d)),error:null}}catch(e){return {error:{message:(e&&e.message)?e.message:String(e),details:e&&e.details}}}}
  }}};
})();

}
/* ======================================================================================================================
   v86 (21 Oct 2026, approved by Roneel from the Front desk mockups): the Service View home becomes the Front desk, built for
   untrained host staff at the iPad. Interface only: the same bookings, server calls, seating rules and permissions.
   1. Home: how full each Teppanyaki sitting is (booked of seats, seats free) and the dining room; one "next up" line with
      the one thing to do now; four big buttons (New booking, Walk-in, Tonight's guests, Find a guest); Seating plan and
      Needs your attention underneath. The sitting cards open the Seating plan.
   2. Tonight's guests: everyone today grouped by sitting, then the dining room, with one button per guest. Arrived marks
      them arrived and, when their grill (or table) was chosen at booking, seats them there in the same tap (staff_action2
      arrived, then staff_host_action seat), with Undo. No grill yet: Choose a grill opens the same Choose table sheet as
      Arrivals. Seated guests get Done (departed). Allergy guests get the same "Before you seat" check as Arrivals.
   3. The grill is chosen at booking (see v86 in the New booking flow), so arrivals go straight to it.
   ====================================================================================================================== */
(function(){
  var FD={screen:'home',at:0,loading:false,timer:null,html:''};
  function today(){return fijiToday()}
  function homeEl(){return document.getElementById('kz72')}
  function shown(){var h=homeEl();return !!(h&&!h.hidden&&root.classList.contains('kz72-home-on'))}
  function live(p){return !/^(cancelled|declined)$/.test(p.status)}
  function mins(t){return (+t.slice(0,2))*60+(+t.slice(3,5))}
  function gN(n){return n+(n===1?' guest':' guests')}
  function ready(){return state.day&&state.date===today()&&HD.x}
  async function refresh(){if(FD.loading)return;FD.loading=true;FD.err=false;try{if(state.date!==today())state.date=today();await hdFetch()}catch(e){FD.err=true}FD.loading=false;FD.at=Date.now();paint(true)}
  function failHtml(){return FD.err?'<div class="kz86-fail"><p>We could not load today’s bookings. Check the internet connection, then try again.</p><button type="button" class="btn primary" data-fd="retry">Try again</button></div>':'<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>'}
  function stale(){return Date.now()-FD.at>30000}
  /* ---------- home ---------- */
  function sits(){var d=state.day,ps=hdParties().filter(function(p){return live(p)&&p.status!=='no_show'&&!/^pending/.test(p.status)}),out=[];
    (d.sessions||[]).forEach(function(s){var seats=0;s.tables.forEach(function(t){if(!blockOf(s.session_time,t.code))seats+=t.seats});
      var bk=sum(ps.filter(function(p){return p.svc==='teppanyaki'&&p.time===s.session_time}));
      out.push({tep:true,label:'Teppanyaki '+tl(s.session_time),booked:bk,seats:seats,free:Math.max(0,seats-bk),pct:seats?Math.min(100,Math.round(bk*100/seats)):0})});
    var dn=ps.filter(function(p){return p.svc!=='teppanyaki'});out.push({tep:false,label:'Dining room',guests:sum(dn),parties:dn.length});return out}
  /* v87: speak plainly. A grill is always "the Kiku grill", so nobody mistakes a grill for a guest. */
  function where(p){var c=hdCodes(p);if(!c.length)return '';if(p.svc!=='teppanyaki')return hdTableText(p);
    var n=c.map(function(x){return tname(x)});return 'the '+(n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]+' grills':n[0]+' grill')}
  function Where(p){var w=where(p);return w?w.charAt(0).toUpperCase()+w.slice(1):''}
  function busyAt(p){if(p.svc!=='teppanyaki')return null;var c=hdCodes(p),o=hdParties().filter(function(q){return q.id!==p.id&&q.svc==='teppanyaki'&&q.time!==p.time&&q.seated_at&&!q.departed_at&&live(q)&&hdCodes(q).some(function(x){return c.indexOf(x)>=0})});
    return o.length?o[0]:null}
  function nextUp(){var ps=hdParties().filter(live),now=nowHM();
    var here=ps.filter(function(p){return hdState(p)==='here'})[0];
    if(here){var has=hdCodes(here).length,g=here.svc==='teppanyaki'?'grill':'table',nm='<b>'+esc(here.name)+' ('+here.size+')</b>';
      if(!has)return {p:here,tone:'go',txt:nm+' is here and needs a '+g+'.',btn:'Choose a '+g,act:'choose'};
      var b=busyAt(here);
      if(b)return {p:here,tone:'late',txt:nm+' is here. '+esc(Where(here))+' still has '+esc(tl(b.time))+' guests. Seat them when those guests leave, or choose another grill.',btn:'Choose another grill',act:'choose'};
      return {p:here,tone:'go',txt:nm+' is here. They are booked at '+esc(where(here))+'.',btn:'Seat them at '+where(here),act:'seat'}}
    var up=ps.filter(function(p){return hdState(p)==='upcoming'&&p.time});
    var late=up.filter(function(p){var d=mins(now)-mins(p.time);return d>15&&d<=45})[0];
    if(late)return {p:late,tone:'late',txt:'<b>'+esc(late.name)+' ('+late.size+')</b> '+'is '+(mins(now)-mins(late.time))+' min late'+'. Give them a call?',btn:'They’re here',act:'arrive'};
    var nx=up.filter(function(p){return mins(p.time)>=mins(now)-15})[0]||up.filter(function(p){return mins(now)-mins(p.time)<=45})[0];
    if(nx)return {p:nx,tone:'next',txt:'All calm. Next up: <b>'+esc(nx.name)+' ('+nx.size+')</b> at '+esc(tl(nx.time))+(where(nx)?', '+esc(where(nx)):'')+'.',btn:'They’re here',act:'arrive'};
    return {tone:'calm',txt:'All calm. Nobody is waiting for you. Nice work.'}}
  function hello(){return kzGreet()}
  function mood(S){var now=mins(nowHM()),ps=hdParties().filter(live),out=[];
    var ss=(state.day.sessions||[]);ss.forEach(function(s,i){var mine=ps.filter(function(p){return p.svc==='teppanyaki'&&p.time===s.session_time});
      var open=mine.some(function(p){return /^(upcoming|here|seated|request)$/.test(hdState(p))});
      if(mine.length&&!open&&now>mins(s.session_time)){var g=sum(mine.filter(function(p){return hdState(p)==='left'})),ns=mine.filter(function(p){return p.status==='no_show'}).length;
        out=['The '+tl(s.session_time)+' sitting is done: '+g+' guests seated, '+(ns?ns+(ns===1?' no-show':' no-shows'):'no no-shows')+'.'];return}});
    var nx=S.filter(function(x){return x.tep})[out.length?1:0];if(!nx)nx=S.filter(function(x){return x.tep})[0];
    var later=ss.filter(function(s){return now<=mins(s.session_time)+30});
    if(later.length){var s0=S.filter(function(x){return x.tep&&x.label==='Teppanyaki '+tl(later[0].session_time)})[0];
      if(s0){var t='the '+tl(later[0].session_time)+' sitting';
        out.push(s0.pct>=90?(out.length?'':(now<15*60?'Busy day. ':'Busy night. '))+cap(t)+' is almost full.':s0.pct>=60?cap(t)+' is filling up nicely: '+s0.free+' seats free.':s0.booked?cap(t)+' has plenty of room: '+s0.free+' seats free.':cap(t)+' has no bookings yet.')}}
    return out.join(' ')}
  function cap(t){return t.charAt(0).toUpperCase()+t.slice(1)}
  function homeHtml(){
    if(!ready())return '<div class="kz86">'+failHtml()+'</div>';
    var S=sits(),n=nextUp(),ps=hdParties().filter(live),now=nowHM();
    var late=ps.filter(function(p){return hdState(p)==='upcoming'&&p.time&&mins(p.time)+15<mins(now)}).length,todo=ps.filter(function(p){return /^(upcoming|here|request)$/.test(hdState(p))}).length;
    var capacity='<section class="kz86-capacity" aria-label="Bookings at a glance"><div class="kz86-sits">'+S.map(function(s){
      if(s.tep)return '<button type="button" class="kz86-sit tep" data-fd="seat"><span class="kz86-sl"><b>'+esc(s.label)+'</b><span>'+(s.free?s.free+(s.free===1?' seat':' seats')+' free':'Full')+'</span></span>'+
        '<span class="kz86-sn">'+s.booked+' <small>of '+s.seats+' booked</small></span><span class="kz86-bar"><i style="width:'+s.pct+'%"></i></span></button>';
      return '<button type="button" class="kz86-sit din" data-fd="tonight"><span class="kz86-sl"><b>'+esc(s.label)+'</b><span>'+s.parties+(s.parties===1?' party':' parties')+'</span></span>'+
        '<span class="kz86-sn">'+s.guests+' <small>guests booked</small></span><span class="kz86-bar"><i style="width:'+(s.guests?100:0)+'%"></i></span></button>'}).join('')+'</div></section>';
    /* v154 (28 Oct 2026, Service View cockpit; builds on PR #136): one action row, what needs doing now, capacity at a glance,
       then the three service screens. Counts come from the same places as Arrivals; data-fd actions are unchanged. */
    var nc=(window.kzNeedCount&&window.kzNeedCount())||{n:0},needs=nc.n||0,al=window.kzArrLate&&window.kzArrLate();if(al!=null)late=al;
    var h='<div class="kz86 kz154-cockpit">';
    h+='<div class="kz154-actions" role="group" aria-label="Front desk actions">'+
      '<button type="button" class="kz154-task kz154-primary" data-fd="new">'+kzIcon('plus')+'<span>New booking</span></button>'+
      '<button type="button" class="kz154-task" data-fd="walk">'+kzIcon('user')+'<span>Walk-in</span></button>'+
      '<button type="button" class="kz154-task" data-fd="find">'+I.search+'<span>Find a guest</span></button></div>';
    if(n.p)h+='<div class="kz86-next t-'+n.tone+'" role="status">'+kzIcon(n.tone==='late'?'alert':'grill')+'<p>'+n.txt+'</p>'+
      (n.btn?'<button type="button" class="btn kz86-nb" data-fd="next">'+esc(n.btn)+'</button>':'')+'</div>';
    h+=capacity;
    h+='<nav class="kz154-links" aria-label="Service screens">'+
      '<button type="button" data-fd="tonight" aria-label="Today’s guests, '+todo+(todo===1?' active party':' active parties')+(late?', '+late+' running late':'')+'">'+kzIcon('list')+'<span>Today’s guests</span>'+
        (late?'<em class="kz154-late" title="Running late">'+kzIcon('clock')+late+'</em>':'')+'<strong class="kz154-n">'+todo+'</strong></button>'+
      '<button type="button" data-fd="seat">'+kzIcon('grill')+'<span>Seating plan</span></button>'+
      '<button type="button" class="'+(needs?'kz154-urgent':'')+'" data-fd="need" aria-label="Needs attention, '+(needs?needs+(needs===1?' thing':' things'):'nothing waiting')+'">'+kzIcon(needs?'alert':'check')+'<span>Needs attention</span>'+
        (needs?'<strong class="kz154-n is-amber">'+needs+'</strong>':'')+'</button>'+
      '</nav>';
    h+='<details class="kz86-guide"><summary>New here? Quick front desk guide</summary><ol>'+
      '<li><b>New booking:</b> reserve a table for today or a later date. Choose Walk-in for guests without a booking.</li>'+
      '<li><b>Find a guest:</b> look up their booking before changing details.</li>'+
      '<li><b>Today’s guests:</b> tap They’re here when guests arrive. Check allergy warnings before seating.</li>'+
      '</ol></details>';
    return h+'</div>'}
  /* ---------- Tonight's guests ---------- */
  function rowBtn(p){var st=hdState(p),g=p.svc==='teppanyaki'?'grill':'table';
    if(st==='request')return ['open','Open','plain'];if(st==='upcoming')return ['arrive','They’re here','go'];
    if(st==='here')return !hdCodes(p).length?['choose','Choose a '+g,'go']:busyAt(p)?['choose','Choose another grill','go']:['seat','Seat them','go'];
    if(st==='seated')return ['depart','They’ve left','plain'];return null}
  function saying(p){var st=hdState(p),now=mins(nowHM());
    if(st==='request')return ['Waiting for a manager to say yes',''];
    if(st==='upcoming'){var d=mins(p.time)-now;if(d< -15)return [(-d>=60?'Over 1 hr late':(-d)+' min late'),'late'];if(d<=0)return ['Due now',''];if(d<=60)return ['Due in '+d+' min',''];return ['Due at '+tl(p.time),'']}
    if(st==='here'){var b=busyAt(p);return b?['Here. '+Where(p)+' still has '+tl(b.time)+' guests','late']:['Here since '+hdClock(p.arrived_at),'ok']}
    if(st==='seated')return ['Seated since '+hdClock(p.seated_at),'ok'];
    if(st==='noshow')return ['Did not come',''];return [p.departed_at?'Left at '+hdClock(p.departed_at):'Visit complete','']}
  function rowHtml(p){var st=hdState(p),b=rowBtn(p),al=p.allergens&&p.allergens.length?p.allergens.join(', '):'',place=hdTableText(p);
    var sy=saying(p),line=sy[0],late=sy[1]==='late';
    return '<div class="kz86-r s-'+st+'"><span class="kz86-rt">'+esc(tl(p.time))+'</span><button type="button" class="kz86-rn" data-fdo="'+p.id+'"><span class="kz86-r1"><b>'+esc(p.name)+'</b><span class="kz86-chip">'+gN(p.size)+'</span>'+
      (al?'<span class="kz86-chip alg">'+kzIcon('alert')+esc(al)+' allergy</span>':'')+(p.occasion?'<span class="kz86-chip cel">'+kzIcon(/birthday/i.test(p.occasion)?'cake':/anniversary|honeymoon|engage|wedding/i.test(p.occasion)?'heart':'star')+esc(/birthday/i.test(p.occasion)?'Birthday tonight':p.occasion)+'</span>':'')+(p.is_test?'<span class="kz86-chip">Test</span>':'')+'</span>'+
      '<span class="kz86-r2'+(late?' late':'')+'">'+esc(line)+'</span></button><span class="kz86-rp'+(place?'':' none')+'">'+esc(place?(p.svc==='teppanyaki'?Where(p).replace(/^The /,''):place):(p.svc==='teppanyaki'?'No grill yet':'No table yet'))+'</span>'+
      (b?'<button type="button" class="btn kz86-rb '+b[2]+'" data-fda="'+b[0]+'" data-id="'+p.id+'">'+esc(b[1])+'</button>':'<span class="kz86-rb none"></span>')+'</div>'}
  function tonightHtml(){var h='<div class="kz86 kz86-t"><div class="kz86-th"><button type="button" class="btn" data-fd="home">'+I.left+'<span>Front desk</span></button><h1>Today’s guests</h1>'+
      '<span class="kz86-thb"><button type="button" class="btn" data-fd="seat">'+kzIcon('grill')+'<span>Seating plan</span></button><button type="button" class="btn" data-fd="find">'+I.search+'<span>Find</span></button></span></div>';
    if(!ready())return h+failHtml()+'</div>';
    h+='<div class="kz86-journey" role="group" aria-label="Guest visit stages"><span>Due</span><i aria-hidden="true">→</i><span>Here</span><i aria-hidden="true">→</i><span>Seated</span><i aria-hidden="true">→</i><span>Left</span></div>'+
      '<p class="kz86-tip">When guests arrive, tap <b>They’re here</b>. If their assigned seating is ready, the system may seat them automatically. Check any allergy warning before proceeding.</p>';
    var ps=hdParties().filter(function(p){return live(p)}),d=state.day,groups=[];
    (d.sessions||[]).forEach(function(s){var g=ps.filter(function(p){return p.svc==='teppanyaki'&&p.time===s.session_time});if(g.length)groups.push(['tep','Teppanyaki · '+tl(s.session_time)+' sitting',g])});
    var dn=ps.filter(function(p){return p.svc==='dining'});if(dn.length)groups.push(['din','Dining room',dn]);
    var ev=ps.filter(function(p){return p.svc==='event'});if(ev.length)groups.push(['ev','Groups and events',ev]);
    if(!groups.length)return h+'<div class="kz86-empty"><p>No bookings yet today. A quiet start.</p><button type="button" class="btn primary" data-fd="new">New booking</button></div></div>';
    var order={here:0,upcoming:1,request:1,seated:2,left:3,noshow:3};
    groups.forEach(function(g){var list=g[2].slice().sort(function(a,b){return (order[hdState(a)]-order[hdState(b)])||(a.time||'').localeCompare(b.time||'')});
      var here=g[2].filter(function(p){return /^(here|seated)$/.test(hdState(p))}).length;
      h+='<section class="kz86-g '+g[0]+'"><div class="kz86-gh"><h2>'+esc(g[1])+'</h2><span>'+gN(sum(g[2].filter(function(p){return p.status!=='no_show'})))+' · '+here+' here</span></div>'+list.map(rowHtml).join('')+'</section>'});
    return h+'</div>'}
  /* ---------- actions ---------- */
  function orig(k){var c=document.querySelector('#kz72 .kz72-grid [data-sv="'+k+'"]');if(c){c.click();return true}return false}
  async function arrive(p,btn){
    if(((p.allergens&&p.allergens.length)||(p.dietary&&!/^none$/i.test(p.dietary)))&&!(btn&&btn.dataset.ok))return hdAllergyCheck(p,function(){if(btn)btn.dataset.ok='1';arrive(p,btn)});
    if(btn){btn.disabled=true;btn.textContent='Saving…'}var busy=busyAt(p),seat=hdCodes(p).length>0&&!busy,place=hdTableText(p);
    try{await call('staff_action2',{p_id:p.id,p_action:'arrived',p_reason:null,p_notify:false});
      if(seat){try{await call('staff_host_action',{p_id:p.id,p_action:'seat',p_seen:null})}catch(e2){seat=false}}
      await refresh();
      if(seat)toast('Welcome in, '+p.name+'. Seated at '+where(p)+'.',function(){undo(p,true)});
      else if(busy)toast(p.name+' is here. '+Where(p)+' still has '+tl(busy.time)+' guests. Seat them when those guests leave.',function(){undo(p,false)});
      else{toast(p.name+' is here. Now choose a '+(p.svc==='teppanyaki'?'grill':'table')+'.',function(){undo(p,false)});var q=hdFind(p.id);if(q)hdChoose({p:q,after:function(){refresh()}})}}
    catch(e){toast(errText(e));refresh()}}
  async function undo(p,seated){try{if(seated)await call('staff_host_action',{p_id:p.id,p_action:'unseat',p_seen:null});
      await call('staff_action2',{p_id:p.id,p_action:'undo_arrived',p_reason:null,p_notify:false});toast('Undone. '+p.name+' is back to expected.')}catch(e){toast(errText(e))}refresh()}
  async function doAct(a,id,btn){var p=hdFind(id);if(!p)return;
    if(a==='open')return openBooking(id);if(a==='arrive')return arrive(p,btn);
    if(a==='choose')return hdChoose({p:p,after:function(){refresh()}});
    await hdAct(id,a,btn);refresh()}
  root.addEventListener('click',function(e){var t=e.target;if(!t.closest||!t.closest('#kz86w'))return;
    var f=t.closest('[data-fd]'),a=t.closest('[data-fda]'),o=t.closest('[data-fdo]');
    if(a){e.preventDefault();doAct(a.dataset.fda,a.dataset.id,a);return}
    if(o){e.preventDefault();openBooking(o.dataset.fdo);return}
    if(!f)return;e.preventDefault();var k=f.dataset.fd;
    if(k==='home'||k==='tonight'){FD.screen=k==='home'?'home':'tonight';paint(true);window.scrollTo(0,0);if(stale())refresh();return}
    if(k==='retry'){FD.at=0;refresh();return}
    if(k==='next'){var n=nextUp();if(n.p)doAct(n.act,n.p.id,f);return}
    FD.screen='home';orig(k==='find'?'find':k)});
  /* ---------- drawing ---------- */
  function paint(force){var h=homeEl();if(!h||!shown()){FD.screen=h?FD.screen:'home';return}
    if(!h.classList.contains('kz86-on'))h.classList.add('kz86-on');var w=document.getElementById('kz86w');if(!w){w=document.createElement('div');w.id='kz86w';h.insertBefore(w,h.firstChild)}
    var html=FD.screen==='tonight'?tonightHtml():homeHtml();if(force||html!==FD.html||!w.innerHTML){var guide=w.querySelector('.kz86-guide'),wasOpen=!!(guide&&guide.open);FD.html=html;w.innerHTML=html;if(wasOpen){var restored=w.querySelector('.kz86-guide');if(restored)restored.open=true}}
    if(stale()&&!FD.loading)refresh()}
  var q=false;new MutationObserver(function(m){if(q)return;if(m.every(function(r){return r.target.closest&&r.target.closest('#kz86w')}))return;q=true;
    Promise.resolve().then(function(){q=false;try{paint()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  clearInterval(FD.timer);FD.timer=setInterval(function(){if(shown()&&!document.hidden&&!drawerOpen()&&!searchOpen())refresh()},30000);
  window.kz86=FD;
})();
/* v90 (21 Oct 2026): a calmer sign-in. The sign-in form is never redrawn while it is on screen: a late "signed out" message
   from the server (an old session ending) used to redraw it while staff were typing, wiping what they typed, and Chrome read
   the vanished form as a sign-in and offered to update the saved password. A wrong password now shows its message above the
   same form, which stays where it is, so Chrome does not offer to save the wrong password either. */
(function(){var _lv=loginView;
  loginView=function(msg,isOk){var f=document.getElementById('lf');
    if(f&&document.body.contains(f)){
      if(!msg)return;
      if(!isOk){var box=f.parentNode.querySelector('.msg.err');if(!box){box=document.createElement('div');box.className='msg err';box.style.marginTop='14px';f.parentNode.insertBefore(box,f)}
        box.textContent=msg;box.setAttribute('role','alert');var b=f.querySelector('button[type=submit]');if(b){b.disabled=false;b.textContent='Sign in'}
        var pw=document.getElementById('lp');if(pw){pw.focus();pw.select()}return}}
    return _lv.apply(this,arguments)};
  window.kz90Login=function(){return loginView.apply(this,arguments)}})();
/* v91 (21 Oct 2026): Jack's Restaurants touch-friendly interface standard (see docs/STAFF-APP-DESIGN.md, "v91"). Interface only.
   1. Pop-ups fit the visible screen, also with the on-screen keyboard open: the visible height is kept in --kz91-vh.
   2. The host website page: the app's area is marked (data-kz-app) and the site's reveal animation is undone on it and the
      elements around it (opacity 1, no transform), so it can never hide or shift the app on iPads. */
(function(){
  function vh(){var v=window.visualViewport,h=v?v.height:window.innerHeight,r=document.getElementById('kzs');if(r)r.style.setProperty('--kz91-vh',Math.round(h)+'px')}
  if(window.visualViewport){visualViewport.addEventListener('resize',vh);visualViewport.addEventListener('scroll',vh)}window.addEventListener('resize',vh);
  function host(){var r=document.getElementById('kzs');if(!r)return;vh();if(r.dataset.kzApp)return;r.dataset.kzApp='1';
    for(var e=r;e&&e!==document.body&&e!==document.documentElement;e=e.parentElement){
      if(e.hasAttribute('data-w-id')||/opacity|transform/.test(e.getAttribute('style')||'')){e.style.setProperty('opacity','1','important');e.style.setProperty('transform','none','important')}
      e.setAttribute('data-kz-app','')}}
  host();setTimeout(host,0);setTimeout(host,600);document.addEventListener('DOMContentLoaded',host);
})();
/* v95 (21 Oct 2026): a short note when a new reservation for today comes in while the app is open ("A new reservation has
   come in: Lee (8), 6:00 PM."), with Open. Only bookings that appear on a later refresh of the same day; never the ones
   this device has just made itself; nothing on the first load or after changing the date. Interface only. */
(function(){
  var seen=null,day=null,mine={};
  var _c=call;call=async function(fn,args){var r=await _c.apply(this,arguments);try{if((fn==='staff_create_any'||fn==='staff_waitlist_book')&&r&&r.id)mine[r.id]=1}catch(e){}return r};
  function note(){var d=state.day;if(!d||!state.date||state.date!==fijiToday()){seen=null;day=null;return}
    var ps=[];try{ps=dayParties(d)}catch(e){return}
    var ids={};ps.forEach(function(p){ids[p.id]=p});
    if(seen===null||day!==state.date){seen=ids;day=state.date;return}
    var fresh=ps.filter(function(p){return !seen[p.id]&&!mine[p.id]&&!/^(cancelled|declined)$/.test(p.status)&&!p.is_test});seen=ids;
    if(!fresh.length)return;var p=fresh[0],t=p.session_time||p.time||'';
    var msg=fresh.length>1?fresh.length+' new reservations have come in for today.':'A new reservation has come in: '+p.name+' ('+p.size+')'+(t?', '+tl(t):'')+'.';
    /* never replace a note that is on screen (it may hold an Undo): wait until it has gone */
    (function show(n){if(root.querySelector('.toast')&&n<10)return setTimeout(function(){show(n+1)},3000);try{toast(msg,null,fresh.length===1?{label:'Open',fn:function(){openBooking(p.id)}}:null)}catch(e){}})(0)}
  var _pd=paintDay;paintDay=function(){var r=_pd.apply(this,arguments);try{note()}catch(e){}return r};
})();
  /* Signed-out guard (26 Oct 2026, Sentry JAVASCRIPT-3): a tap on an old screen after the 2-hour sign-out, or after the
     session ended in another tab, used to rebuild the hub with nobody signed in and crash. Now it shows the sign-in screen. */
  (function(){function back(){try{loginView('You were signed out. Please sign in again.',true)}catch(e){}}
    var _shg=shell;shell=function(){if(!me){back();return}return _shg.apply(this,arguments)};
    document.addEventListener('click',function(e){if(me||!e.target||!e.target.closest)return;var t=e.target.closest('button,a,[role=button],[data-sv],[data-kz67]');
      if(!t||t.closest('.login,#lf,form')||document.querySelector('.login')&&document.querySelector('.login').contains(t))return;
      if(document.querySelector('.login')){e.preventDefault();e.stopImmediatePropagation();return}e.preventDefault();e.stopImmediatePropagation();back()},true)})();
/* ======================================================================================================================
   v110 (26 Oct 2026, Roneel: "easy to use and navigate; reduce text and highlights; icons instead of wording, like
   allergies with their own icons"). Interface only: no booking rule, database call, permission or workflow changes.
   1. Allergies: each allergen gets its own icon next to its name (the word stays: an icon alone is too easy to misread
      for a food safety warning). Calmer soft red instead of a solid red block. Red is kept for allergies only: late
      requests and no-shows that borrowed the allergy style become a quiet amber note.
   2. Icons replace words where the icon is unmistakable: VIP star, birthday cake, anniversary heart, wheelchair, high
      chair, diet leaf, Print and Help buttons. The words stay for screen readers, and text content is unchanged.
   3. Side panel fits a landscape iPad: Kitchen, Grill stations and Service briefing are one Kitchen entry with three
      icon tabs on the page; single-item section headings become thin dividers on short screens; the current screen is
      always scrolled into view.
   4. Arrivals: the second date line and the second Find button are hidden (the date picker and the side panel or top bar
      search already do the job).
   ====================================================================================================================== */
(function(){
  var SV='<svg class="kzi kz110-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var P={
    shellfish:'<path d="M5 13a7 7 0 0 1 7-7h4a3 3 0 0 1 0 6h-3"/><path d="M5 13c0 3 2.2 5 5 5h2"/><path d="M8.5 18l-2 3M12 18v3"/><path d="M13 12c-2 0-3 1.2-3 3"/>',
    fish:'<path d="M3 12c3-4 7-6 11-6 3 0 5.2 2.2 7 6-1.8 3.8-4 6-7 6-4 0-8-2-11-6z"/><path d="M3 12L1.5 8.5M3 12l-1.5 3.5"/><circle cx="16.5" cy="11" r=".9"/>',
    peanuts:'<path d="M9.5 3.5a4.5 4.5 0 0 1 4.3 5.8c-.3 1 .2 1.8 1.1 2.3a4.5 4.5 0 1 1-6.1 6.1c-.5-.9-1.3-1.4-2.3-1.1a4.5 4.5 0 0 1-2.6-8.6c1-.3 1.6-1 1.7-2A4.5 4.5 0 0 1 9.5 3.5z"/>',
    treenuts:'<path d="M5.5 10.5h13"/><path d="M7 10.5c0 5 2.2 9 5 10 2.8-1 5-5 5-10"/><path d="M12 3.5v3"/><path d="M6.5 10.5C6.5 8 9 6.5 12 6.5s5.5 1.5 5.5 4"/>',
    gluten:'<path d="M12 21V7"/><path d="M12 7c-2-1-3-2.8-3-4.5 2 .8 3 2.6 3 4.5zM12 7c2-1 3-2.8 3-4.5-2 .8-3 2.6-3 4.5z"/><path d="M12 12.5c-2.2-.6-4-2.2-4-4.5 2.2.3 4 2 4 4.5zM12 12.5c2.2-.6 4-2.2 4-4.5-2.2.3-4 2-4 4.5z"/><path d="M12 18c-2.2-.6-4-2.2-4-4.5 2.2.3 4 2 4 4.5zM12 18c2.2-.6 4-2.2 4-4.5-2.2.3-4 2-4 4.5z"/>',
    egg:'<path d="M12 3c-3.6 0-6.5 6-6.5 10.5a6.5 6.5 0 0 0 13 0C18.5 9 15.6 3 12 3z"/>',
    dairy:'<path d="M8 7.5L9.5 3.5h5L16 7.5V20.5H8z"/><path d="M8 7.5h8M8 12.5h8"/>',
    sesame:'<ellipse cx="8" cy="8.5" rx="2.3" ry="3.3" transform="rotate(-25 8 8.5)"/><ellipse cx="16" cy="8.5" rx="2.3" ry="3.3" transform="rotate(25 16 8.5)"/><ellipse cx="12" cy="16" rx="2.3" ry="3.3"/>',
    soy:'<path d="M5 18.5C5 12 10.5 5 19 5c0 8.5-6.5 14-13 14-.6 0-1-.4-1-.5z"/><circle cx="9" cy="14.5" r="1.4"/><circle cx="12.3" cy="11.2" r="1.4"/><circle cx="15.5" cy="8" r="1.2"/>',
    alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    leaf:'<path d="M5 19C5 11 10 5 19 5c0 9-6 14-14 14z"/><path d="M5 19l7.5-7.5"/>',
    wheelchair:'<circle cx="11" cy="4.5" r="1.6"/><path d="M11 7.5v5.5h5l2.2 5"/><path d="M11 10h4.5"/><path d="M8.2 11.2a5 5 0 1 0 6.6 6.6"/>',
    highchair:'<path d="M7 3.5l2 8M17 3.5l-2 8"/><path d="M6 11.5h12"/><path d="M8.5 11.5L7 20.5M15.5 11.5l1.5 9M8 16h8"/>',
    star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    cake:'<path d="M4 20.5h16"/><path d="M5 20.5v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M5 16c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"/><path d="M12 12.5V9M12 6.5c-.8-.9-.8-1.9 0-3 .8 1.1.8 2.1 0 3z"/>',
    heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    gift:'<path d="M4 10.5h16v3H4zM5.5 13.5v7h13v-7"/><path d="M12 10.5v10"/><path d="M12 10.5c-1.5 0-4.5-.5-4.5-2.5S10.5 7 12 10.5zM12 10.5c1.5 0 4.5-.5 4.5-2.5S13.5 7 12 10.5z"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',
    print:'<path d="M7 9V3.5h10V9"/><path d="M6.5 17.5H4V10.5h16v7h-2.5"/><path d="M7 14h10v6.5H7z"/>',
    help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6"/><path d="M12 16.8h.01"/>',
    kitchen:'<path d="M6 13.5a4 4 0 0 1 1.2-7.8 5 5 0 0 1 9.6 0A4 4 0 0 1 18 13.5"/><path d="M6.5 13.5h11v6.5h-11z"/><path d="M6.5 17h11"/>',
    grill:'<path d="M3.5 9.5h17v6h-17z"/><path d="M7 15.5V20M17 15.5V20"/><path d="M8 4.5c-.8 1 .8 2-.1 3M12 4.5c-.8 1 .8 2-.1 3M16 4.5c-.8 1 .8 2-.1 3"/>',
    brief:'<path d="M7 3.5h7.5L18 7v13.5H7z"/><path d="M14.5 3.5V7H18M9.5 11h6M9.5 14.5h6M9.5 18h4"/>'
  };
  function ic(n){return P[n]?SV+P[n]+'</svg>':''}
  function sr(t){return '<span class="kz110-sr">'+esc(t)+'</span>'}
  var ALG={shellfish:'shellfish',crustaceans:'shellfish',crustacean:'shellfish',prawns:'shellfish',fish:'fish',peanuts:'peanuts',peanut:'peanuts',
    'tree nuts':'treenuts','tree nut':'treenuts',nuts:'treenuts',gluten:'gluten',wheat:'gluten',egg:'egg',eggs:'egg',dairy:'dairy',milk:'dairy',
    lactose:'dairy',sesame:'sesame',soy:'soy',soya:'soy'};
  function done(t){t.dataset.kz110='1'}
  function allergy(t){var text=t.textContent.trim();if(!text)return done(t);
    if(/waiting|over 24|no-show|late/i.test(text)){t.classList.remove('allergy');t.classList.add('kz110-note');
      if(/waiting|over 24|late/i.test(text))t.insertAdjacentHTML('afterbegin',ic('clock'));return done(t)}
    if(/with allerg/i.test(text)){t.classList.add('kz110-al');t.insertAdjacentHTML('afterbegin',ic('alert'));return done(t)}
    var parts=text.split(/\s*,\s*/);
    t.classList.add('kz110-al');t.title=text;
    t.innerHTML=parts.map(function(x,i){var k=ALG[x.toLowerCase()];return '<span class="kz110-a">'+ic(k||'alert')+'<span>'+esc(x)+'</span></span>'+(i<parts.length-1?sr(', '):'')}).join('');
    done(t)}
  function iconOnly(t,name,label){t.title=label;t.classList.add('kz110-ico');t.innerHTML=ic(name)+sr(t.textContent);done(t)}
  function occ(t){var text=t.textContent.trim(),m=/^(birthday|anniversary)\s*:?\s*(.*)$/i.exec(text);
    if(m){var n=m[1].toLowerCase()==='birthday'?'cake':'heart';t.title=text;t.classList.add('kz110-occ');
      t.innerHTML=ic(n)+(m[2]?sr(m[1]+': ')+'<span>'+esc(m[2])+'</span>':sr(m[1]));return done(t)}
    if(/^(new|moved)$/i.test(text))return done(t);
    t.insertAdjacentHTML('afterbegin',ic(/cake|plate/i.test(text)?'cake':'gift'));t.classList.add('kz110-occ');done(t)}
  function seat(t){var text=t.textContent.trim();
    if(/wheelchair/i.test(text))return iconOnly(t,'wheelchair','Wheelchair access');
    var m=/^(\d+)\s*high chairs?/i.exec(text);if(m){t.title=text;t.classList.add('kz110-occ');t.innerHTML=ic('highchair')+'<span>'+m[1]+'</span>'+sr(text.slice(m[1].length));return done(t)}
    done(t)}
  /* Inside a booking's pop-up (full details) words stay visible next to the icon; icon-only is for lists and grills. */
  function inDetail(t){return !!t.closest('#dr,#sr,.dsheet,.drawer,[role="dialog"]')}
  function withWords(t,name){t.insertAdjacentHTML('afterbegin',ic(name));t.classList.add('kz110-occ');done(t)}
  function tags(scope){scope.querySelectorAll('.tag:not([data-kz110])').forEach(function(t){if(t.querySelector('svg'))return done(t);
    if(inDetail(t)&&!t.classList.contains('allergy')){var x=t.textContent;
      if(t.classList.contains('vip'))return withWords(t,'star');
      if(t.classList.contains('seatn'))return withWords(t,/wheelchair/i.test(x)?'wheelchair':'highchair');
      if(t.classList.contains('occ')&&!/^(new|moved)$/i.test(x.trim()))return withWords(t,/^birthday/i.test(x)?'cake':/^anniversary/i.test(x)?'heart':/cake|plate/i.test(x)?'cake':'gift')}
    if(t.classList.contains('allergy'))return allergy(t);
    if(t.classList.contains('vip'))return iconOnly(t,'star','VIP');
    if(t.classList.contains('occ'))return occ(t);
    if(t.classList.contains('seatn'))return seat(t);
    if(t.classList.contains('diet')){t.insertAdjacentHTML('afterbegin',ic('leaf'));t.classList.add('kz110-diet');return done(t)}
    done(t)})}
  /* Print and Help: icon buttons with the word kept for screen readers and as a tooltip */
  function buttons(scope){scope.querySelectorAll('main button:not([data-kz110])').forEach(function(b){var t=b.textContent.trim();
    if(!/^(Print|Print service day|Help)$/.test(t)||b.querySelector('svg')){b.dataset.kz110='1';return}
    var lab=b.getAttribute('aria-label')||t;b.setAttribute('aria-label',lab);b.title=lab;b.classList.add('kz110-ib');b.innerHTML=ic(/^Help/.test(t)?'help':'print')+sr(t);b.dataset.kz110='1'})}
  /* Kitchen, Grill stations and Service briefing: one side panel entry, three tabs on the page */
  var KT=[['kitchen','Kitchen','kitchen'],['stations','Grill stations','grill'],['brief','Briefing','brief']];
  function kitchenTabs(){var day=document.getElementById('day');var v=state.tab==='today'?state.view:'';var on=KT.some(function(k){return k[0]===v});
    var cur=document.querySelector('#kzs .kz110-kt');
    if(!on||!day){if(cur)cur.remove();return}
    if(cur&&cur.dataset.v===v&&cur.nextElementSibling===day)return;if(cur)cur.remove();
    var d=document.createElement('div');d.className='kz110-kt noprint';d.setAttribute('role','tablist');d.setAttribute('aria-label','Kitchen screens');d.dataset.v=v;
    d.innerHTML=KT.map(function(k){var s=k[0]===v;return '<button type="button" role="tab" aria-selected="'+s+'" class="'+(s?'on':'')+'" data-kt="'+k[0]+'">'+ic(k[2])+'<span>'+k[1]+'</span></button>'}).join('');
    day.parentNode.insertBefore(d,day);
    d.querySelectorAll('[data-kt]').forEach(function(b){b.onclick=function(){var k=b.dataset.kt;if(k===state.view)return;
      var nav=document.querySelector('#kzs .kside [data-nav="'+k+'"],#kzs [data-nav="'+k+'"]');if(nav)nav.click();else setView(k)}})}
  function side(){var s=document.querySelector('#kzs .kside');if(!s)return;
    s.querySelectorAll('.kside-i[data-nav="stations"],.kside-i[data-nav="brief"]').forEach(function(b){b.classList.add('kz110-folded')});
    var k=s.querySelector('.kside-i[data-nav="kitchen"]');var v=state.tab==='today'?state.view:'';
    if(k&&(v==='stations'||v==='brief')){k.classList.add('on');k.setAttribute('aria-current','page')}
    var act=s.querySelector('.kside-i.on,.kside-i[aria-current="page"]');var sc=s.querySelector('.kside-scroll');
    if(act&&sc&&act.dataset.kz110top!==String(state.tab+state.view)){act.dataset.kz110top=state.tab+state.view;
      var r=act.getBoundingClientRect(),q=sc.getBoundingClientRect();if(r.bottom>q.bottom||r.top<q.top)act.scrollIntoView({block:'nearest'})}}
  /* Arrivals: one date and one Find */
  function dupes(){var t=document.getElementById('dtitle');if(t){var bar=t.closest('.daybar');t.classList.toggle('kz110-sr',!!(bar&&bar.querySelector('input[type="date"]')))}}
  function run(){if(!me)return;var m=document.querySelector('#kzs');if(!m)return;
    try{tags(m)}catch(e){}try{buttons(m)}catch(e){}try{kitchenTabs()}catch(e){}try{side()}catch(e){}try{dupes()}catch(e){}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;Promise.resolve().then(function(){q=false;run()})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v111 (26 Oct 2026, Roneel: "place the teppanyaki grills neatly, two rows of three, not L-shaped"). Visual only: the
   drawing of the main room in the Seating plan and the Settings preview. Grills keep their saved order: the first three
   (Ume, Fuji, Tsubaki) on the top row along the kitchen wall, the next three (Sakura, Kiku, Yuri) on the row below.
   Rows are lined up in columns; the gap between rows leaves room for the guest names under the top row.
   No grill, seat, seating rule or server change. Phones keep their single column.
   ====================================================================================================================== */
var KZ_GRID_COLS=3;
/* v112 (26 Oct 2026, Roneel: "responsive, fit the screen, no spillover"): tablets and computers keep two rows of three;
   phones (the column drawing) get three rows of two so grill names stay readable. The drawing scales to the screen
   (app.css); guest names are re-placed by v70 whenever the drawing resizes, and the drawing is redrawn when its direction changes. */
(function(){
  var _fl=fpLayout;fpLayout=function(items,room,dir){
    var cols=dir==='v'?2:KZ_GRID_COLS;
    if(room!=='main'||items.length<=cols)return _fl.apply(this,arguments);
    var T=window.KZ_FP&&KZ_FP.dir===dir?KZ_FP:null,gap=T&&T.gap?T.gap:(dir==='v'?110:30),vgap=T&&T.vgap?T.vgap:(dir==='v'?250:190),rows=[],colW=[],y=64,W=0;
    for(var i=0;i<items.length;i+=cols)rows.push(items.slice(i,i+cols));
    rows.forEach(function(r){r.forEach(function(e,c){colW[c]=Math.max(colW[c]||0,e.g.box[2])})});
    rows.forEach(function(r){var H=0,x=16;r.forEach(function(e){H=Math.max(H,e.g.box[3])});
      r.forEach(function(e,c){var b=e.g.box;e.cx=x+(colW[c]-b[2])/2-b[0];e.cy=y-b[1];x+=colW[c]+gap});
      W=Math.max(W,x-gap+16+(T&&T.side?gap:0));y+=H+vgap});
    var bottom=y-vgap+36,rh=0,cs=0;rows.forEach(function(r){var H=0;r.forEach(function(e){H=Math.max(H,e.g.box[3])});rh+=H});colW.forEach(function(w){cs+=w});
    window.__kzGrid={rows:rows.length,cols:colW.length,vgap:vgap,gap:gap,W:Math.round(W),H:Math.round(bottom-40),rowsH:rh,colsW:cs,dir:dir,side:!!(T&&T.side)};
    return {vb:[0,40,Math.round(W),Math.round(bottom-40)],div:[]}};
})();
/* ======================================================================================================================
   v113 (26 Oct 2026, Roneel: "texts need breathing space, not cramped"). Visual only. After each drawing is laid out,
   the grill name and its status ("Full", "4 of 10") are spaced from their real on-screen size: centred in the grill
   with a margin and a clear gap between the two lines. If they do not fit with the grey hotplate bar, the bar is hidden;
   if the status still does not fit (small phones), only the name shows and the status stays in the grill list below.
   A name too wide for its grill is made smaller, never below 12px on screen.
   ====================================================================================================================== */
(function(){
  function num(e,a){return parseFloat(e.getAttribute(a))||0}
  /* one rule for the whole drawing, so every grill looks the same: the tightest grill decides */
  function fit(svg){var vb=svg.viewBox&&svg.viewBox.baseVal,r=svg.getBoundingClientRect();if(!vb||!vb.width||!r.width)return;var k=r.width/vb.width,pad=7/k,gap=5/k,rank={bar:0,nobar:1,name:2},worst=0,gs=[];
    svg.querySelectorAll('g.fp-g').forEach(function(g){var bd=g.querySelector('.fp-body'),tp=g.querySelector('.fp-top'),l=g.querySelector('.fp-lbl'),sb=g.querySelector('.fp-sub');if(!bd||!l)return;
      var bx=num(bd,'x'),by=num(bd,'y'),bw=num(bd,'width'),bh=num(bd,'height');
      l.style.fontSize='';if(sb){sb.style.display='';sb.style.fontSize=''}if(tp)tp.style.display='';
      var f1=parseFloat(getComputedStyle(l).fontSize)||15,f2=sb?parseFloat(getComputedStyle(sb).fontSize)||12:0;
      try{var maxW=bw-2*pad,w=l.getComputedTextLength();if(w>maxW&&w>0){var nf=Math.max(12/k,f1*maxW/w);l.style.fontSize=nf+'px';f1=nf}}catch(e){}
      var h1=f1*.74,h2=f2*.74,need2=h1+gap*1.6+h2,barTop=tp?num(tp,'y')+num(tp,'height')+pad:by+pad,bot=by+bh-pad;
      var m=bot-barTop>=need2?0:bot-(by+pad)>=need2?1:2;if(root.classList.contains('kz115-floor'))m=sb&&sb.classList.contains('kz118-off')?1:Math.max(m,1);worst=Math.max(worst,m);
      gs.push({l:l,sb:sb,tp:tp,by:by,bot:bot,barTop:barTop,cx:bx+bw/2,h1:h1,h2:h2,need2:need2})});
    gs.forEach(function(o){var top=worst===0?o.barTop:o.by+pad;if(o.tp)o.tp.style.display=worst===0?'':'none';if(o.sb)o.sb.style.display=worst===2||o.sb.classList.contains('kz118-off')?'none':'';
      var solo=worst===2||(o.sb&&o.sb.classList.contains('kz118-off')),blk=solo?o.h1:o.need2,y0=top+Math.max(0,(o.bot-top-blk)/2);
      o.l.setAttribute('x',o.cx);o.l.setAttribute('y',y0+o.h1);
      if(o.sb&&worst<2){o.sb.setAttribute('x',o.cx);o.sb.setAttribute('y',y0+o.h1+gap*1.6+o.h2)}})}
  function all(){document.querySelectorAll('#day .fplan svg, #kzs .fp-preview svg, #kzs .fplan svg').forEach(function(s){try{fit(s)}catch(e){}})}
  var RO=typeof ResizeObserver!=='undefined'?new ResizeObserver(function(){all()}):null,seen=new WeakSet();
  function watch(){all();if(!RO)return;document.querySelectorAll('#kzs .fplan svg').forEach(function(s){if(!seen.has(s)){seen.add(s);RO.observe(s)}})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{watch()}catch(e){}})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v115 (26 Oct 2026, Roneel: "the screen should keep all the relevant details within the viewport"). Seating plan,
   Floor plan view only. Visual only.
   1. The controls above the room take less height: service, view and sitting choices share one row; the closures notice
      is one line (tap to read it in full); the sitting header is one slim line; the drag hint is left to the help text.
   2. The room drawing is sized to the space left on screen: after it is drawn, the space below its top edge (minus the
      bottom bar) is measured, the drawing is scaled to fit, and the gap between the rows is set so two guest name tags
      always fit on screen (about 104px), never smaller than a readable size. Redrawn once when the screen size changes.
   ====================================================================================================================== */
window.KZ_FP=window.KZ_FP||{vgap:null,dir:null,key:'',tries:0};
(function(){
  /* Two ways to fit: names under each grill (rows far apart) or, on wide short screens such as a landscape iPad,
     names beside each grill (rows close together). The one that keeps the grills larger is used. */
  var NAME_ROWS=104,BELOW=60,SIDE=150,ROWGAP=26,EDGE=36,MINK=.42;
  function tune(){root.classList.toggle('kz115-floor',state.tab==='today'&&state.view==='floor');
    /* v153: the visible room drawing (a hidden copy can come first) */
    var g=window.__kzGrid,svg=[].filter.call(document.querySelectorAll('#day .fplan .fp-room svg[viewBox]'),function(x){return x.getBoundingClientRect().width>0&&!x.closest('.fp-leg')})[0];if(!g||!svg||state.view!=='floor')return;
    var host=svg.parentElement,cw=host.clientWidth;if(!cw)return;
    var bar=document.querySelector('#kzs .kbot'),bh=bar&&bar.getClientRects().length?bar.getBoundingClientRect().height:0;
    var top=svg.getBoundingClientRect().top+scrollY;
    /* everything inside the room card below the drawing (tags under the last row, the footer) is measured, so the whole
       card ends a comfortable 24px above the bottom edge (or the phone's bottom bar) */
    var room=svg.closest('.fp-room'),card=svg.closest('section')||room,sbot=svg.getBoundingClientRect().bottom,below=card?Math.max(0,card.getBoundingClientRect().bottom-sbot):60;
    /* v127: a phone held sideways (short screen) is sized by its width and scrolls, so name tags never pile up */
    var short=innerHeight<=500&&innerWidth<=1024,phone=innerWidth<=600,avail=short?1e5:phone?innerHeight-bh-((window.kz127Pinned&&kz127Pinned())||56)-24-below:innerHeight-top-bh-24-below;
    /* the room the name tags really need on this device: the tallest stack of tags, plus a margin */
    var tagH=0;host.querySelectorAll('.kz70-gl').forEach(function(t){tagH=Math.max(tagH,t.getBoundingClientRect().height)});
    if(tagH){NAME_ROWS=Math.round(tagH+20);BELOW=Math.round(Math.min(tagH,60)+12)}else{NAME_ROWS=44;BELOW=16} /* v153: no names, no name space */
    /* v129: names beside the grills only when the widest name really fits beside them */
    var tagW=0;host.querySelectorAll('.kz70-gn').forEach(function(t){tagW=Math.max(tagW,t.getBoundingClientRect().width)});if(tagW)SIDE=Math.max(150,Math.round(tagW+28));
    var r=g.rows,c=g.cols,fixedH=g.H-g.rowsH-g.vgap*(r-1);
    var kb=Math.min((cw-EDGE)/(g.colsW+(g.dir==='v'?110:30)*(c-1)),(avail-NAME_ROWS*(r-1))/(g.rowsH+fixedH));
    var ks=g.dir==='h'?Math.min((cw-EDGE-SIDE*c)/g.colsW,(avail-ROWGAP*(r-1))/(g.rowsH+fixedH)):0;
    /* v129: names always sit under their grill; the beside-the-grill layout could not fit two parties on one grill */
    /* v153 (28 Oct 2026, Roneel: "the seating plan on screen looks tiny"): on computers and landscape iPads the grills
       stay readable (at least 95% of full size); on shorter screens the page scrolls a little instead of shrinking them */
    var FLOOR=innerWidth>=1024&&!phone&&!short?.95:MINK;
    var side=false,k=Math.max(FLOOR,kb);
    /* v129: grills are spaced by their widest group of name tags, so neighbouring names never touch. When the drawing is
       small (short screens, busy nights) the grills shrink but the tags keep their readable size, so the gap grows. */
    var gw=0;host.querySelectorAll('.kz70-gl').forEach(function(t){gw=Math.max(gw,t.getBoundingClientRect().width)});
    var gpx=g.dir==='v'?110*k:30*k;
    if(!phone&&gw&&c>1){var colPx=g.colsW/c;gpx=Math.max(30*k,gw-colPx*k+20);
      if(k*g.colsW+(c-1)*gpx>cw-EDGE){var kw=(cw-EDGE-(c-1)*(gw+20))/(g.colsW-(c-1)*colPx);if(kw>0)k=Math.max(MINK*.8,Math.min(k,kw));gpx=Math.max(30*k,gw-colPx*k+20)}}
    var want={side:side,gap:gpx/k,vgap:side?ROWGAP/k:NAME_ROWS/k};
    var key=innerWidth+'x'+innerHeight+'|'+g.dir+'|'+Math.round(top/24);if(KZ_FP.key!==key){KZ_FP.key=key;KZ_FP.tries=0}
    var off=want.side!==g.side||Math.abs(want.vgap-g.vgap)/g.vgap>.08||Math.abs(want.gap-g.gap)/g.gap>.08;
    if(off&&KZ_FP.tries<5){KZ_FP.tries++;KZ_FP.dir=g.dir;KZ_FP.side=want.side;KZ_FP.gap=want.gap;KZ_FP.vgap=want.vgap;try{paintDay()}catch(e){}return}
    var mh=Math.floor(Math.min(g.H*k,g.H*cw/g.W));svg.style.maxHeight=mh+'px';
    /* final check: if the card still runs past the bottom edge, trim the drawing by exactly that much */
    if(card&&!phone&&!short){var over=card.getBoundingClientRect().bottom+scrollY-(innerHeight-bh-24);if(over>1)svg.style.maxHeight=Math.max(Math.floor(g.H*FLOOR),mh-Math.ceil(over))+'px'}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{tune()}catch(e){}})}).observe(root,{childList:true,subtree:true});
  var t=null;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){try{tune()}catch(e){}},150)});
})();
/* ======================================================================================================================
   v116 (26 Oct 2026, Roneel: "humanise it: sleek yet informative; don't overload the team, but never miss important
   details"). Seating plan, Floor plan view. Calm by default, loud only when it matters. Interface only.
   1. One plain line above the room says what needs someone now (allergies not yet checked with the guest, late
      parties), each part tappable; when nothing does, it says so. Parties waiting for a grill keep their own bar.
   2. Guest tags show name and party size, plus a small icon only when something is different: allergy, late,
      celebration, VIP, wheelchair. A tag with no icon is an ordinary booking. Full details stay one tap away.
   3. Grills show their name only; how full they are shows in the seat circles.
   4. The grill-by-grill list under the room (the same information again) starts folded behind "Show grill details".
   Never hidden: allergies and the shared-grill allergy warning, late guests, parties waiting for a grill, closed sittings.
   ====================================================================================================================== */
(function(){
  var SV='<svg class="kzi kz116-i" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var P={alg:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',late:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',
    cake:'<path d="M4 20.5h16"/><path d="M5 20.5v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M12 12.5V9M12 6.5c-.8-.9-.8-1.9 0-3 .8 1.1.8 2.1 0 3z"/>',
    heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    gift:'<path d="M4 10.5h16v3H4zM5.5 13.5v7h13v-7"/><path d="M12 10.5v10"/>',
    star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    wheel:'<circle cx="11" cy="4.5" r="1.6"/><path d="M11 7.5v5.5h5l2.2 5"/><path d="M8.2 11.2a5 5 0 1 0 6.6 6.6"/>',
    ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'};
  function ic(n,cls){return '<span class="kz116-x '+(cls||'')+'">'+SV+P[n]+'</svg></span>'}
  function parties(){var d=state.day,o={};if(!d)return o;(d.sessions||[]).forEach(function(s){(s.tables||[]).forEach(function(t){(t.parties||[]).forEach(function(p){o[p.id]=Object.assign({session_time:s.session_time},p)})});(s.unassigned||[]).forEach(function(p){o[p.id]=Object.assign({session_time:s.session_time,unseated:true},p)})});return o}
  function live(p){return /^(confirmed|pending|pending_large_group)$/.test(p.status||'confirmed')&&!p.is_test}
  function late(p){if(state.date!==fijiToday()||p.arrived_at||!p.session_time)return false;try{return mins(p.session_time)-mins(nowHM())<=-10}catch(e){return false}}
  function algOpen(p){return hasAlg(p)&&!p.allergy_checked_at}
  /* 2. tags */
  function tags(P){document.querySelectorAll('#day .kz70-gn[data-kz70open]').forEach(function(b){var p=P[b.getAttribute('data-kz70open')];if(!p)return;
    var sig=[hasAlg(p),late(p),p.occasion||'',!!p.vip,!!p.wheelchair].join('|');if(b.dataset.kz116===sig)return;b.dataset.kz116=sig;
    b.querySelectorAll('.kz116-x').forEach(function(x){x.remove()});var h='',say=[];
    if(hasAlg(p)){h+=ic('alg','al');say.push('allergy')}
    if(late(p)){h+=ic('late','late');say.push('late')}
    if(p.occasion){var o=String(p.occasion).toLowerCase();h+=ic(/birth/.test(o)?'cake':/anniv/.test(o)?'heart':'gift','occ');say.push(p.occasion)}
    if(p.vip){h+=ic('star','vip');say.push('VIP')}
    if(p.wheelchair){h+=ic('wheel','acc');say.push('wheelchair')}
    if(h){var n=b.querySelector('.kz70-n');(n||b).insertAdjacentHTML(n?'afterend':'beforeend','<span class="kz116-icons">'+h+'</span>');
      var al=(b.getAttribute('aria-label')||'').replace(/\. Open booking\.$/,'');b.setAttribute('aria-label',al+', '+say.join(', ')+'. Open booking.')}})}
  /* 1. what needs someone now, for the sitting on screen */
  function summary(P){var sec=document.querySelector('#day section.svc.k-tep');var cur=document.querySelector('#kzs .kz116-sum');
    if(!sec){if(cur)cur.remove();return}
    var st=(sec.id||'').replace('sit-',''),t=st.slice(0,2)+':'+st.slice(2);
    var ps=Object.keys(P).map(function(k){return P[k]}).filter(function(p){return p.session_time===t&&live(p)});
    var al=ps.filter(algOpen),lt=ps.filter(late),uns=ps.filter(function(p){return p.unseated});
    var parts=[];
    if(al.length)parts.push('<button type="button" class="kz116-p al" data-list="al" data-open="'+esc(al[0].id)+'" title="Allergies not yet checked with the guest" aria-label="'+al.length+' allergies not yet checked with the guest">'+ic('alg')+'<span>'+al.length+' '+(al.length===1?'allergy':'allergies')+'</span></button>');
    if(lt.length)parts.push('<button type="button" class="kz116-p late" data-list="late" data-open="'+esc(lt[0].id)+'">'+ic('late')+'<span>'+lt.length+' late</span></button>');
    var html=parts.length?parts.join(''):(uns.length?'':'<span class="kz116-p ok">'+ic('ok')+'<span>All good</span></span>');
    if(!html){if(cur)cur.remove();return}
    if(!cur){cur=document.createElement('div');cur.className='kz116-sum noprint';cur.setAttribute('role','status')}
    if(cur.dataset.h!==html){cur.dataset.h=html;cur.innerHTML=html}if(true){cur.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){var L=b.getAttribute('data-list')==='al'?al:lt;if(L.length>1&&window.kz118List){window.kz118List(b.getAttribute('data-list'),L);return}try{openBooking(b.getAttribute('data-open'))}catch(e){}}})}
    var bar=sec.querySelector('.unseated:not(.empty-drop)'),plan=sec.querySelector('.fplan');
    if(bar){cur.classList.add('in-bar');if(cur.parentElement!==bar)bar.appendChild(cur)}
    else if(plan){cur.classList.remove('in-bar');if(cur.nextElementSibling!==plan)plan.parentElement.insertBefore(cur,plan)}}
  /* 4. grill list folded */
  var KEY='kz116_leg';function lsg(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}function lss(v){try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}}
  function legend(){document.querySelectorAll('#day .fplan .fp-room').forEach(function(room){var leg=room.querySelector(':scope > .fp-leg');if(!leg)return;
    var b=room.querySelector('.kz116-leg');if(!b){b=document.createElement('button');b.type='button';b.className='btn kz116-leg noprint';room.insertBefore(b,leg);
      b.onclick=function(){lss(!lsg());paint()}}
    var sec=room.closest('section'),cx=sec&&sec.parentElement?[].slice.call(sec.parentElement.querySelectorAll(':scope > details.panel')).concat([].slice.call(sec.querySelectorAll(':scope > details.panel'))):[];
    var foot=room.querySelector(':scope > .kz124-foot');if(!foot){foot=document.createElement('div');foot.className='kz124-foot noprint';room.insertBefore(foot,leg)}
    if(b.parentElement!==foot)foot.appendChild(b);cx.forEach(function(d){if(d.parentElement!==foot){d.classList.add('kz124-cx');foot.appendChild(d)}});
    var on=lsg();b.textContent=on?'Hide grill details':'Show grill details';b.setAttribute('aria-expanded',String(on));room.classList.toggle('kz116-leg-on',on)})}
  function paint(){if(!root.classList.contains('kz115-floor')){var c=document.querySelector('#kzs .kz116-sum');if(c)c.remove();return}
    var P=parties();try{summary(P)}catch(e){}try{tags(P)}catch(e){}try{legend()}catch(e){}try{room()}catch(e){}}
  /* the space under the drawing follows the tags as they now are (icons can add a line on phones) */
  function room(){document.querySelectorAll('#day .fplan svg').forEach(function(svg){var host=svg.parentElement,sb=svg.getBoundingClientRect().bottom,need=0;
    host.querySelectorAll(':scope > .kz70-gl').forEach(function(t){need=Math.max(need,t.getBoundingClientRect().bottom-sb+10)});
    var cur=parseFloat(host.style.getPropertyValue('--kz70-pb'))||0;if(need>cur+1)host.style.setProperty('--kz70-pb',Math.ceil(need)+'px')})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;paint()})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v118 (26 Oct 2026, Roneel: "proceed" on making the Floor plan easy for untrained staff). Interface only.
   1. A "?" key beside the pills explains every icon and seat circle in one small card (a sheet from the bottom on phones).
   2. Pills read without explaining ("4 allergies to check"); a pill with more than one guest lists them all, each one
      opening that booking.
   3. A grill that is not full shows "5 free" under its name; a full grill shows its name only. While choosing a grill
      for a party, "Seat here", "Blocked" and the like still show.
   4. When parties are waiting for a grill, the bar says how: "Tap a name, then a grill".
   ====================================================================================================================== */
(function(){
  var SV='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  function x(cls,p){return '<span class="kz116-x '+cls+'">'+SV+p+'</svg></span>'}
  var I={alg:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',late:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',
    cake:'<path d="M4 20.5h16"/><path d="M5 20.5v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M12 12.5V9M12 6.5c-.8-.9-.8-1.9 0-3 .8 1.1.8 2.1 0 3z"/>',
    heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    wheel:'<circle cx="11" cy="4.5" r="1.6"/><path d="M11 7.5v5.5h5l2.2 5"/><path d="M8.2 11.2a5 5 0 1 0 6.6 6.6"/>'};
  function sheet(title,body){close();var w=document.createElement('div');w.className='kz118-wrap';w.id='kz118';
    w.innerHTML='<div class="kz118-scrim"></div><div class="kz118-card" role="dialog" aria-modal="true" aria-labelledby="kz118t"><div class="kz118-head"><h2 id="kz118t">'+esc(title)+'</h2><button type="button" class="btn kz118-x">Close</button></div><div class="kz118-body">'+body+'</div></div>';
    root.appendChild(w);w.querySelector('.kz118-scrim').onclick=close;w.querySelector('.kz118-x').onclick=close;
    document.addEventListener('keydown',esc1);setTimeout(function(){var b=w.querySelector('.kz118-x');b&&b.focus()},30);return w}
  function esc1(e){if(e.key==='Escape')close()}
  function close(){var w=document.getElementById('kz118');if(w)w.remove();document.removeEventListener('keydown',esc1)}
  function key(){sheet('What the signs mean',
    '<p class="kz118-h">On a guest’s name</p><ul class="kz118-l">'+
    '<li>'+x('al',I.alg)+'<span><b>Allergy.</b> Tap the name to see it and tell the chef.</span></li>'+
    '<li>'+x('late',I.late)+'<span><b>Late.</b> Due over 10 min ago, not here yet.</span></li>'+
    '<li>'+x('occ',I.cake)+x('occ',I.heart)+'<span><b>Celebrating.</b> Birthday or anniversary.</span></li>'+
    '<li>'+x('vip',I.star)+'<span><b>VIP.</b></span></li>'+
    '<li>'+x('acc',I.wheel)+'<span><b>Wheelchair.</b> Needs easy access.</span></li>'+
    '<li><span class="kz118-plain">No sign</span><span>An ordinary booking.</span></li></ul>'+
    '<p class="kz118-h">Seats around a grill</p><ul class="kz118-l">'+
    '<li><i class="kz118-c solid"></i><span><b>Filled seat:</b> guest is here.</span></li>'+
    '<li><i class="kz118-c light"></i><span><b>Light seat:</b> booked, not here yet.</span></li>'+
    '<li><i class="kz118-c light dot"></i><span><b>Red dot:</b> this guest has an allergy.</span></li>'+
    '<li><i class="kz118-c"></i><span><b>Empty seat:</b> free.</span></li></ul>'+
    '<p class="kz118-tip">Tap any name to see the full booking.</p>')}
  window.kz118List=function(kind,L){var t=kind==='al'?L.length+' allergies to check with the guest':L.length+' late';
    var w=sheet(t,'<ul class="kz118-g">'+L.map(function(p){return '<li><button type="button" class="kz118-gb" data-id="'+esc(p.id)+'"><b>'+esc(p.name)+'</b><span>'+p.size+(p.size===1?' guest':' guests')+'</span>'+(kind==='al'&&p.allergens?'<em>'+esc(p.allergens.join(', '))+'</em>':'')+'</button></li>'}).join('')+'</ul>');
    w.querySelectorAll('[data-id]').forEach(function(b){b.onclick=function(){close();try{openBooking(b.getAttribute('data-id'))}catch(e){}}})};
  function qmark(){var sum=document.querySelector('#kzs .kz116-sum');if(!sum||sum.querySelector('.kz118-q'))return;
    var b=document.createElement('button');b.type='button';b.className='kz118-q';b.setAttribute('aria-label','What the signs mean');b.title='What the signs mean';
    b.innerHTML=SV+'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6"/><path d="M12 16.8h.01"/></svg>';b.onclick=key;sum.appendChild(b)}
  /* free seats: "5 of 8" becomes "3 free"; full grills show no status line */
  function free(){document.querySelectorAll('#day .fplan text.fp-sub').forEach(function(t){var cur=t.textContent,m=/^(\d+) of (\d+)$/.exec(cur);
    if(m){var f=+m[2]-+m[1];t.dataset.kz118=cur;t.textContent=f>0?f+' free':'';t.classList.toggle('kz118-off',f<=0)}
    else if(cur==='Full'){t.classList.add('kz118-off')}
    else if(t.classList.contains('kz118-off')&&cur!=='')t.classList.remove('kz118-off')})}
  /* the Grills view says the same: "3 free" instead of "5 of 8"; full grills keep "Full" */
  function freeCards(){document.querySelectorAll('#day .tcard .tfill').forEach(function(t){var m=/^(\d+) of (\d+)$/.exec(t.textContent.trim());if(m){var f=+m[2]-+m[1];t.textContent=f>0?f+' free':'Full';t.classList.toggle('kz118-free',f>0)}})}
  function hint(){var bar=document.querySelector('#day .unseated:not(.empty-drop)');if(!bar)return;var lab=bar.querySelector(':scope > b');if(!lab||lab.querySelector('.kz118-hint'))return;
    var h=document.createElement('span');h.className='kz118-hint';h.textContent='Tap name, then grill';lab.appendChild(h)}
  function run(){if(!root.classList.contains('kz115-floor'))return;try{free()}catch(e){}try{freeCards()}catch(e){}try{qmark()}catch(e){}try{hint()}catch(e){}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;run()})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v119 (26 Oct 2026, Roneel: "proceed" with the same calm approach on Arrivals and Bookings). Interface only.
   Marks the screen so its styles apply only there (app.css v119): one-row headers, amber for lateness (red is kept
   for allergies), slim attention pills and tags, a quiet "Confirmed" (requests and cancellations still stand out).
   ====================================================================================================================== */
(function(){
  function mark(){var a=state.tab==='today'&&(state.view||'arrivals')==='arrivals',b=state.tab==='bookings';
    root.classList.toggle('kz119-arr',a);root.classList.toggle('kz119-book',b)}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{mark()}catch(e){}})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v126 (27 Oct 2026, Roneel: "keep refining... how intuitive can the interface be"). Arrivals, interface only.
   The list follows what the host should do first: guests already standing at the door ("Arrived, not seated yet"),
   then late, then the next hour, then later, with seated and left at the end. The Late heading gets a guest count
   like the other headings.
   ====================================================================================================================== */
(function(){
  var RANK={late:1,soon:2,later:3,stale:4,waitlist:5,herelist:6,seatedlist:7,leftlist:8};
  function run(){if(!root.classList.contains('kz119-arr'))return;
    document.querySelectorAll('#day>section.arr-sec').forEach(function(sec){var h=sec.querySelector('.arr-h');if(!h)return;
      var r=0;for(var k in RANK){if(h.classList.contains(k)){r=RANK[k];break}}var want=String(r?10+r:19);if(sec.dataset.kz126!==want)sec.dataset.kz126=want;
      if(h.classList.contains('late')){var sp=h.querySelector('span.small');if(sp&&!sp.textContent.trim()){var n=0;
        sec.querySelectorAll('.arow .asize').forEach(function(a){n+=parseInt(a.textContent,10)||0});
        if(n)sp.textContent=n+(n===1?' guest':' guests')}}})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){}})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v127 (27 Oct 2026, Roneel: "on mobile I am unable to see the floor plan"). Phones only, interface only.
   Tapping "Floor plan" brings the room up to the top of the screen, so the plan is what you see.
   ====================================================================================================================== */
(function(){
  /* what stays pinned at the top while scrolling (the app bar, and the sitting switches on phones) */
  function pinned(){var h=0;document.querySelectorAll('#kzs .kz-mtop, #kzs header.top, #day>.sitbar').forEach(function(e){var c=getComputedStyle(e);if(c.position==='sticky'||c.position==='fixed'){var r=e.getBoundingClientRect();if(r.height)h=Math.max(h,(parseFloat(c.top)||0)+r.height)}});return h||56}
  window.kz127Pinned=pinned;
  function small(){return innerWidth<=600||(innerHeight<=500&&innerWidth<=1024)}
  function show(){var r=document.querySelector('#day .fp-room');if(!r)return;
    var y=r.getBoundingClientRect().top+scrollY-pinned()-8;try{window.scrollTo({top:Math.max(0,y),behavior:'smooth'})}catch(e){window.scrollTo(0,Math.max(0,y))}}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#kzs [data-fp="plan"]');if(!b||!small())return;setTimeout(show,450)},true);
})();
/* ======================================================================================================================
   v128 (27 Oct 2026, Roneel: "enterprise level, use icons wherever possible"). Interface only, Arrivals and Seating plan.
   Thin-line icons carry the meaning so rows read at a glance: party size (people), status (clock, bell, door, message),
   where they sit (grill, bowl, star), children, notes, returning guests, Reply, Seat everyone and Tidy up.
   Words stay where a wrong guess is costly: allergies, the main buttons, and anything without an obvious icon.
   Every icon keeps the full wording as a tooltip and for screen readers.
   ====================================================================================================================== */
(function(){
  var P={people:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3 4.7"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',
    bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    msg:'<path d="M4.5 5.5h15v10h-9l-6 4.5z"/>',
    door:'<path d="M6 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M3.5 20.5h17"/><path d="M12.5 12.5h.01"/>',
    bowl:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8.5 7.5c0-1.6 1-1.6 1-3.2M12 7.5c0-1.6 1-1.6 1-3.2M15.5 7.5c0-1.6 1-1.6 1-3.2"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    child:'<circle cx="12" cy="5.8" r="2.6"/><path d="M7.5 11.2l4.5-1.7 4.5 1.7M12 9.5v5.2M9.3 20.5l2.7-5.8 2.7 5.8"/>',
    note:'<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h7M9 16h5"/>',
    repeat:'<path d="M4.5 11.5a7.5 7.5 0 0 1 13.3-4.7L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12.5a7.5 7.5 0 0 1-13.3 4.7L4.5 15"/><path d="M4.5 19.5V15H9"/>',
    reply:'<path d="M9.5 7L4.5 12l5 5"/><path d="M4.5 12h9.5a6 6 0 0 1 6 6v1"/>',
    wand:'<path d="M4.5 19.5L15 9"/><path d="M15 4v2.2M15 11.8V14M19.8 9h-2.2M12.2 9H10M18.4 5.6l-1.5 1.5M18.4 12.4l-1.5-1.5"/>',
    ban:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    check:'<path d="M5 12.5l4.2 4.2L19 7"/>',
    noshow:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.8 6.5-5.8 1.2 0 2.3.3 3.2.8"/><path d="M16 15l4.5 4.5M20.5 15L16 19.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    map:'<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    tidy:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'};
  function ic(n){if(n==='grill'&&typeof KZI!=='undefined'&&KZI.grill)return kzIcon('grill','kz128-i');var p=P[n];if(!p)return '';
    return '<svg class="kzi kz128-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+p+'</svg>'}
  function has(e){return !!(e.firstElementChild&&e.firstElementChild.classList&&e.firstElementChild.classList.contains('kz128-i'))}
  function lead(e,n){if(has(e))return;e.insertAdjacentHTML('afterbegin',ic(n))}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function rows(){
    document.querySelectorAll('#day .arow .asize').forEach(function(e){if(!has(e)){var n=e.textContent.trim();e.innerHTML=ic('people')+'<span>'+esc(n)+'</span>';e.classList.add('kz128-sz')}});
    document.querySelectorAll('#day .arow .kz67-pill[data-st]').forEach(function(e){var st=e.dataset.st;lead(e,st==='late'?'clock':st==='due'?'bell':st==='request'?'msg':st==='here'?'door':'clock');e.classList.add('kz128-pl')});
    document.querySelectorAll('#day .arow .awhere').forEach(function(e){if(has(e))return;var t=e.textContent.trim();if(!t)return;var i=t.indexOf(', '),svc=i>0?t.slice(0,i):t,place=i>0?t.slice(i+2):'';
      var k=/teppanyaki/i.test(svc)?'grill':/lunch|dinner|breakfast/i.test(svc)?'bowl':'star';
      var need=/needs a (grill|table)/i.test(place);e.title=t;e.classList.toggle('kz128-need',need);e.classList.add('kz128-wh');
      e.innerHTML=ic(k)+'<span>'+esc(place||svc)+'</span>'+(place&&k!=='grill'?'<span class="kz110-sr">, '+esc(svc)+'</span>':'')});
    document.querySelectorAll('#day .arow .bk-tags .tag:not(.allergy):not(.kz110-ico):not(.kz110-occ):not(.kz110-diet):not(.kz110-al)').forEach(function(e){if(has(e))return;var t=e.textContent.trim(),m=t.match(/^(\d+)\s+child(ren)?$/i);
      if(m){e.innerHTML=ic('child')+'<span>'+m[1]+'</span><span class="kz110-sr"> '+(m[1]==='1'?'child':'children')+'</span>';e.title=t;e.classList.add('kz128-tg')}
      else if(/^note$/i.test(t)){e.innerHTML=ic('note')+'<span class="kz110-sr">Note</span>';e.title='Note from the booking';e.classList.add('kz128-tg','kz128-only')}
      else if(/^returning$/i.test(t)){e.innerHTML=ic('repeat')+'<span class="kz110-sr">Returning guest</span>';e.title='Returning guest';e.classList.add('kz128-tg','kz128-only')}});
    document.querySelectorAll('#day .arow .aacts .btn').forEach(function(e){if(/^reply$/i.test(e.textContent.trim()))lead(e,'reply')});
    /* v131: wayfinding style. Section counts read as a people sign and a number; closures and "not coming" get a no-entry sign */
    document.querySelectorAll('#day .arr-sec>.arr-h>.small').forEach(function(e){if(has(e))return;var t=e.textContent.trim(),m=t.match(/^(\d+)/);if(!m)return;e.title=t;
      e.innerHTML=ic('people')+'<span>'+m[1]+'</span><span class="kz110-sr"> '+(m[1]==='1'?'guest':'guests')+'</span>';e.classList.add('kz131-n')});
    document.querySelectorAll('#day .kz67-clt').forEach(function(e){lead(e,'ban')});
    document.querySelectorAll('#day>details.panel>summary').forEach(function(e){lead(e,'ban')});
    document.querySelectorAll('#day .tcard .bk-name .size').forEach(function(e){if(!has(e)){var n=e.textContent.trim();e.innerHTML=ic('people')+'<span>'+esc(n)+'</span>';e.classList.add('kz130-sz');e.setAttribute('aria-label',n+' guests')}});
    document.querySelectorAll('#day .tcard .bk-acts .btn').forEach(function(e){var t=e.textContent.trim();if(/^arrived$/i.test(t))lead(e,'check');else if(/^no-show$/i.test(t))lead(e,'noshow')});
    document.querySelectorAll('#day .tcard .fpacts .kz67-was').forEach(function(e){if(/^new booking/i.test(e.textContent.trim()))lead(e,'plus')});
    document.querySelectorAll('#day .fpseg [data-fp]').forEach(function(e){lead(e,e.dataset.fp==='plan'?'map':'tidy')});
    document.querySelectorAll('#day .unseated .seatbtn>b').forEach(function(b){if(b.querySelector('.kz128-n'))return;var t=b.lastChild;if(!t||t.nodeType!==3)return;var m=t.textContent.match(/^(.*?)\s*\((\d+)\)\s*$/);if(!m)return;
      t.textContent=m[1];b.insertAdjacentHTML('beforeend','<span class="kz128-n" aria-label="'+m[2]+' guests">'+ic('people')+'<span>'+m[2]+'</span></span>')});
    document.querySelectorAll('#day .svc-head .sh-acts .btn').forEach(function(e){var t=e.textContent.trim();if(/^seat everyone/i.test(t))lead(e,'wand');else if(/^tidy up/i.test(t))lead(e,'tidy')})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{rows()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true,characterData:true});
})();
/* v129 (27 Oct 2026): the "Needs a grill" bar takes a second row only when the waiting names would not all fit on one
   line beside the title and counts, so a quiet night keeps the room as large as possible. */
(function(){
  function fit(){if(innerWidth<=600)return;document.querySelectorAll('#kzs.kz115-floor .unseated').forEach(function(u){var l=u.querySelector('.unseated-list'),b=u.querySelector(':scope>b'),m=u.querySelector('.kz116-sum');if(!l)return;
    var need=0,n=0;Array.prototype.forEach.call(l.children,function(c){need+=c.getBoundingClientRect().width;n++});need+=Math.max(0,n-1)*8+26;
    var room=u.clientWidth-(b?b.getBoundingClientRect().width:0)-(m?m.getBoundingClientRect().width:0)-28-(parseFloat(getComputedStyle(u).paddingLeft)||0)-(parseFloat(getComputedStyle(u).paddingRight)||0);
    var two=need>room;if(u.classList.contains('kz129-two')!==two)u.classList.toggle('kz129-two',two)})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{fit()}catch(e){}})}).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',function(){try{fit()}catch(e){}});
})();
/* ======================================================================================================================
   v133 (27 Oct 2026, Roneel: "keep refining in phases"). Phase 1: the booking pop-up, signage style. Interface only.
   The party size reads as a people sign; Close is an X; Arrived and No-show carry their icons; the "Guest is here?"
   prompt is dropped (the Arrived button says it); celebration, seating needs and notes are an icon and the text;
   the facts (guests, grill, phone) and the folded sections each carry an icon; the full wording stays for screen
   readers and as tooltips. Allergies keep their words.
   ====================================================================================================================== */
(function(){
  var P={people:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3 4.7"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>',undo:'<path d="M9 14L4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',exit:'<path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14"/><path d="M10 16l4-4-4-4M14 12H4.5"/>',check:'<path d="M5 12.5l4.2 4.2L19 7"/>',
    noshow:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.8 6.5-5.8 1.2 0 2.3.3 3.2.8"/><path d="M16 15l4.5 4.5M20.5 15L16 19.5"/>',
    cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    gift:'<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18v3H3zM12 9v11"/><path d="M12 9c-1.5-3.5-5-4-5-1.5S10 9 12 9zM12 9c1.5-3.5 5-4 5-1.5S14 9 12 9z"/>',
    seat:'<path d="M7 4h10v8H7z"/><path d="M5 12h14v3.5H5z"/><path d="M7 15.5V20M17 15.5V20"/>',
    note:'<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h7M9 16h5"/>',
    msg:'<path d="M4.5 5.5h15v10h-9l-6 4.5z"/>',
    lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    phone:'<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    pencil:'<path d="M4 20l4.2-1 10.3-10.3a2.1 2.1 0 0 0-3-3L5.2 16 4 20z"/><path d="M14 7l3 3"/>',
    person:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.8 3.6-6 7-6s6.3 2.2 7 6"/>',
    history:'<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4.5l3 1.8"/>',
    repeat:'<path d="M4.5 11.5a7.5 7.5 0 0 1 13.3-4.7L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12.5a7.5 7.5 0 0 1-13.3 4.7L4.5 15"/><path d="M4.5 19.5V15H9"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'};
  function ic(n){if(n==='grill'&&typeof KZI!=='undefined'&&KZI.grill)return kzIcon('grill','kz128-i');var p=P[n];return p?'<svg class="kzi kz128-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+p+'</svg>':''}
  function has(e){return !!(e.firstElementChild&&e.firstElementChild.classList&&e.firstElementChild.classList.contains('kz128-i'))}
  function lead(e,n){if(e&&!has(e))e.insertAdjacentHTML('afterbegin',ic(n))}
  var LAB={'Celebration':'gift','Seating needs':'seat','Guest note':'note','Staff notes':'lock','Guest requests':'msg','Event details':'star'};
  var FACT={'Guests':'people','Grill':'grill','Phone':'phone','Seating':'seat','Occasion':'gift','Type of event':'star'};
  var FOLD={fchg:'cal',fguest:'person',fedit:'pencil',fhist:'history'};
  function run(){var d=document.querySelector('#dr .drawer');if(!d)return;
    var sz=d.querySelector('.dhead h2>.muted');if(sz&&!has(sz)){var m=sz.textContent.match(/\((\d+)\)/);if(m){sz.innerHTML=ic('people')+'<span>'+m[1]+'</span><span class="kz110-sr"> guests</span>';sz.classList.add('kz133-sz')}}
    var x=d.querySelector('#dx');if(x&&!has(x)&&/^close$/i.test(x.textContent.trim())){x.innerHTML=ic('x')+'<span class="kz110-sr">Close</span>';x.setAttribute('aria-label','Close');x.title='Close';x.classList.add('kz133-x')}
    var sub=d.querySelector('.dhead .row .small.muted');lead(sub,'cal');
    d.querySelectorAll('.bigacts .btn').forEach(function(b){var t=b.textContent.trim();if(/^arrived$/i.test(t))lead(b,'check');else if(/^no-show$/i.test(t))lead(b,'noshow');else if(/^seat/i.test(t))lead(b,'seat');else if(/^undo/i.test(t))lead(b,'undo');else if(/^(left|departed|finished)/i.test(t))lead(b,'exit')});
    d.querySelectorAll('.infobox>div>b').forEach(function(b){var k=LAB[b.textContent.trim()];if(!k||b.dataset.kz133)return;b.dataset.kz133='1';b.title=b.textContent.trim();b.innerHTML=ic(k)+'<span class="kz110-sr">'+b.textContent+'</span>';b.parentNode.classList.add('kz133-row')});
    d.querySelectorAll('.dfacts .fact>span:first-child').forEach(function(s){var k=FACT[s.textContent.trim()];if(k)lead(s,k)});
    Object.keys(FOLD).forEach(function(id){var su=d.querySelector('#'+id+'>summary');if(su)lead(su,FOLD[id])});
    lead(d.querySelector('#dgr'),'person');lead(d.querySelector('#kzagain'),'repeat');lead(d.querySelector('#kzalk'),'check')}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v134 (27 Oct 2026, Roneel: phase 2, the Bookings list). Interface only; every choice still goes through the
   original buttons, so filtering works exactly as before.
   1. The view pills (Upcoming, Requests, Today ...) and the service switch become two neat dropdowns beside the search:
      an icon, the current choice and a chevron; the menu lists each choice with its icon and a tick on the current one.
   2. Rows read like signs: the service is an icon (grill, bowl, star) with the word on wider screens, the party size is
      a people sign and a number, "Needs a grill" carries the grill icon, the booking reference is quieter.
   ====================================================================================================================== */
(function(){
  var P={cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    msg:'<path d="M4.5 5.5h15v10h-9l-6 4.5z"/>',clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',
    history:'<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4.5l3 1.8"/>',
    ban:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    all:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    bowl:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8.5 7.5c0-1.6 1-1.6 1-3.2M12 7.5c0-1.6 1-1.6 1-3.2M15.5 7.5c0-1.6 1-1.6 1-3.2"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    people:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3 4.7"/>',
    chev:'<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',tick:'<path d="M5 12.5l4.2 4.2L19 7"/>'};
  function ic(n,c){if(n==='grill'&&typeof KZI!=='undefined'&&KZI.grill)return kzIcon('grill','kz128-i'+(c?' '+c:''));var p=P[n];return p?'<svg class="kzi kz128-i'+(c?' '+c:'')+'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+p+'</svg>':''}
  function has(e){return !!(e&&e.firstElementChild&&e.firstElementChild.classList&&e.firstElementChild.classList.contains('kz128-i'))}
  function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var MI={upcoming:'cal',requests:'msg',today:'clock',past:'history',cancelled:'ban',unmarked:'alert'};
  var SI={'':'all',teppanyaki:'grill',dining:'bowl',event:'star'};
  function opts(group,attr,map){return [].map.call(group.querySelectorAll('button['+attr+']'),function(b){return {b:b,v:b.getAttribute(attr),t:b.textContent.trim(),on:b.classList.contains('on')||b.getAttribute('aria-pressed')==='true',i:map[b.getAttribute(attr)]||'all'}})}
  var open=null;
  function close(){if(!open)return;open.menu.remove();open.btn.setAttribute('aria-expanded','false');open=null}
  document.addEventListener('click',function(e){if(open&&!open.wrap.contains(e.target))close()},true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  function dd(wrap,label,group,attr,map){var o=opts(group,attr,map),cur=o.filter(function(x){return x.on})[0]||o[0];if(!cur)return;
    var key=label+'|'+cur.v,btn=wrap.querySelector('.kz134-dd[data-k="'+label+'"]');
    if(btn&&btn.dataset.cur===key)return;
    var html=ic(cur.i)+'<span class="kz134-t">'+esc(cur.t)+'</span>'+ic('chev','kz134-cv');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='kz134-dd';btn.dataset.k=label;btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');wrap.appendChild(btn);
      btn.addEventListener('click',function(){if(open&&open.btn===btn){close();return}close();var oo=opts(group,attr,map);
        var m=document.createElement('div');m.className='kz134-menu';m.setAttribute('role','listbox');m.setAttribute('aria-label',label);
        m.innerHTML=oo.map(function(x,i){return '<button type="button" role="option" aria-selected="'+x.on+'" data-i="'+i+'">'+ic(x.i)+'<span>'+esc(x.t)+'</span>'+(x.on?ic('tick','kz134-ok'):'')+'</button>'}).join('');
        m.addEventListener('click',function(ev){var it=ev.target.closest('[data-i]');if(!it)return;var x=oo[+it.dataset.i];close();if(x&&!x.on)x.b.click()});
        btn.parentNode.appendChild(m);btn.setAttribute('aria-expanded','true');open={btn:btn,menu:m,wrap:btn.parentNode};var f=m.querySelector('[aria-selected="true"]')||m.firstChild;if(f)f.focus()})}
    btn.dataset.cur=key;btn.innerHTML=html;btn.setAttribute('aria-label',label+': '+cur.t)}
  function run(){if(!root.classList.contains('kz119-book'))return;var f=document.querySelector('#kzs .kz79-filters');if(!f)return;
    var bm=f.querySelector('#bm'),bs=f.querySelector('#bs'),row=f.querySelector('.search');if(!row)return;row=row.parentNode;
    var wrap=row.querySelector('.kz134-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='kz134-wrap';row.appendChild(wrap);f.classList.add('kz134-on')}
    if(bm)dd(wrap,'Show',bm,'data-m',MI);if(bs)dd(wrap,'Service',bs,'data-s',SI);
    var tb=f.querySelector('label.check');if(tb&&tb.parentNode!==wrap){tb.title='Show test bookings';wrap.appendChild(tb)}
    document.querySelectorAll('#bl .lrow:not(.head)').forEach(function(r){
      var sv=r.querySelector('.c-time');if(sv&&!has(sv)){var t=sv.textContent.trim(),k=/tepp/i.test(t)?'grill':/event/i.test(t)?'star':'bowl';sv.title=t;sv.innerHTML=ic(k)+'<span class="kz134-sw">'+esc(t)+'</span>';sv.classList.add('kz134-sv')}
      var sz=r.querySelector('.c-size');if(sz&&!has(sz)){var n=sz.textContent.trim();sz.innerHTML=ic('people')+'<b>'+esc(n)+'</b><span class="kz110-sr"> guests</span>';sz.classList.add('kz134-sz')}
      var nw=r.querySelector('.sub .nw');if(nw&&!nw.classList.contains('kz134-ref')){var pv=nw.previousSibling;if(pv&&pv.nodeType===3)pv.textContent=pv.textContent.replace(/\s*·\s*$/,'');nw.classList.add('kz134-ref')}
      var ng=r.querySelector('.c-seat.kz67-ng');if(ng&&!has(ng))ng.insertAdjacentHTML('afterbegin',ic('grill'))})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-pressed']});
})();
/* ======================================================================================================================
   v135 (27 Oct 2026, Roneel: "easy to use, powerful enough for complex matters, guide the user like a friendly, patient
   mentor"). Phase 3. Interface only.
   1. A one-time tip on Arrivals, the Seating plan and Bookings: one or two plain sentences on the main task, a light
      bulb, and "Got it". Once dismissed it stays away on that device.
   2. Confirmations say what happened in the same words as the buttons ("Brown arrived."), carry a tick, and show a thin
      bar running down for the time left to undo.
   3. The no-show question says it can be undone and uses a calm dark button (red stays for allergies).
   4. An empty search offers the next step: clear it, or look in the past 30 days.
   ====================================================================================================================== */
(function(){
  var TIPS={arr:['kz135-arr','When guests walk in, find their booking and tap Arrived. Late guests are listed first.'],
    floor:['kz135-floor','To seat a party, tap their name, then tap a grill. Press and hold a name to move a party to another grill.'],
    book:['kz135-book','Search by name, phone or booking reference. Use the two menus to choose which bookings you see.']};
  function seen(k){try{return localStorage.getItem(k)==='1'}catch(e){return false}}
  function mark(k){try{localStorage.setItem(k,'1')}catch(e){}}
  var bulb='<svg class="kzi kz128-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 17.5h6M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3.5z"/></svg>';
  function which(){if(root.classList.contains('kz119-arr'))return 'arr';if(root.classList.contains('kz115-floor'))return 'floor';if(root.classList.contains('kz119-book'))return 'book';return ''}
  function run(){var w=which(),m=document.querySelector('#kzs main');if(!m)return;
    m.querySelectorAll(':scope>.kz135-tip').forEach(function(t){if(t.dataset.w!==w)t.remove()});
    if(!w)return;var T=TIPS[w];if(seen(T[0])||m.querySelector(':scope>.kz135-tip'))return;
    var h=m.querySelector(':scope>header');if(!h)return;
    var d=document.createElement('div');d.className='kz135-tip noprint';d.dataset.w=w;d.setAttribute('role','note');
    d.innerHTML=bulb+'<p>'+T[1]+'</p><button type="button" class="btn sm">Got it</button>';
    d.querySelector('button').onclick=function(){mark(T[0]);d.remove()};h.insertAdjacentElement('afterend',d)}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){}})}).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
/* ======================================================================================================================
   v136 (27 Oct 2026, Roneel: enterprise admin console). Settings becomes an admin console. Interface only: every section
   keeps its own screen, server calls and permissions.
   1. Overview (new first section): one card per area with the current values at a glance and a button to each section.
   2. Grouped navigation with icons: Service and availability, Floor and seating, Booking rules, Communications,
      People and access. Same buttons underneath (data-s), so every existing handler and saved position still works.
   3. App shell on computers and landscape iPads: the page no longer scrolls; the navigation stays put and only the
      section on the right scrolls, with its own scroll position.
   ====================================================================================================================== */
var KZ136={
  P:{home:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',ban:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    table:'<rect x="3.5" y="8" width="17" height="6" rx="1.5"/><path d="M6.5 14v5M17.5 14v5"/>',
    sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    pin:'<path d="M12 20.5s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0c0 4.9-6.5 10.5-6.5 10.5z"/><circle cx="12" cy="10" r="2.4"/>',
    mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    people:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3 4.7"/>',
    person:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.8 3.6-6 7-6s6.3 2.2 7 6"/>',
    shield:'<path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6.3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    chev:'<path d="M9.5 6.5l5.5 5.5-5.5 5.5"/>',
    grill:null},
  G:[{k:'svc',t:'Service and availability',ic:'clock',items:['operations','closures','holidays']},
     {k:'floor',t:'Floor and seating',ic:'grill',items:['tables','floor']},
     {k:'rules',t:'Booking rules',ic:'sliders',items:['rules','places']},
     {k:'comms',t:'Communications',ic:'mail',items:['emails']},
     {k:'people',t:'People and access',ic:'people',items:['staff','me']}],
  I:{home:'home',operations:'clock',closures:'ban',holidays:'cal',tables:'grill',floor:'table',rules:'sliders',places:'pin',emails:'mail',staff:'people',me:'person'}
};
function kz136ic(n,c){if(n==='grill'&&typeof KZI!=='undefined'&&KZI.grill)return kzIcon('grill','kz136-i'+(c?' '+c:''));var p=KZ136.P[n]||KZ136.P.home;
  return '<svg class="kzi kz136-i'+(c?' '+c:'')+'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+p+'</svg>'}
function kz136name(k){var x=STABS.filter(function(s){return s[0]===k})[0];return x?x[1]:k}
function kzAdminNav(){var has={};STABS.forEach(function(s){has[s[0]]=1});
  function btn(k){return has[k]?'<button data-s="'+k+'" class="'+(state.stab===k?'on':'')+'"'+(state.stab===k?' aria-current="page"':'')+'>'+kz136ic(KZ136.I[k]||'home')+'<span>'+esc(kz136name(k))+'</span></button>':''}
  var used={home:1},h=btn('home');
  KZ136.G.forEach(function(g){var b=g.items.map(function(k){used[k]=1;return btn(k)}).join('');if(b)h+='<div class="kz136-gl" aria-hidden="true">'+esc(g.t)+'</div>'+b});
  STABS.forEach(function(s){if(!used[s[0]])h+=btn(s[0])});return h}
/* v144 (29 Oct 2026, Roneel: "I should be able to delete guest booking entries as an administrator"). Admins can remove a
   booking from its drawer (a reason is required; Undo on the toast) and see, restore or clear test bookings in
   Settings > Removed bookings. Removed bookings are erased for good after 30 days. */
(function(){var i=STABS.findIndex(function(s){return s[0]==='places'});STABS.splice(i<0?STABS.length:i+1,0,['removed','Removed bookings']);
  KZ136.G.forEach(function(g){if(g.k==='rules'&&g.items.indexOf('removed')<0)g.items.push('removed')});KZ136.I.removed='trash';
  KZ136.P.trash='<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 12.5h9l1-12.5"/><path d="M10.5 11v5.5M13.5 11v5.5"/>';})();
var KZRM_WHY=['Duplicate','Entered by mistake','Test booking'];
function kzRemoveBox(b,host){
  var box=document.createElement('div');box.className='kzrm-box';box.setAttribute('role','group');box.setAttribute('aria-label','Remove this booking');
  box.innerHTML='<b class="kzrm-t">Remove this booking?</b><p class="shint">It leaves every list and count. You can put it back from Settings for 30 days.</p>'+
    '<div class="kzrm-why">'+KZRM_WHY.map(function(w){return '<button type="button" class="chip" data-why="'+esc(w)+'">'+esc(w)+'</button>'}).join('')+'</div>'+
    '<input class="kzrm-in" maxlength="300" placeholder="Reason" aria-label="Reason for removing"><div class="row"><button type="button" class="btn danger" data-rm="go">Remove</button><button type="button" class="btn" data-rm="no">Keep</button></div>';
  host.appendChild(box);var inp=box.querySelector('.kzrm-in');
  box.querySelectorAll('[data-why]').forEach(function(c){c.onclick=function(){box.querySelectorAll('[data-why]').forEach(function(o){o.classList.toggle('on',o===c)});inp.value=c.dataset.why}});
  box.querySelector('[data-rm="no"]').onclick=function(){box.remove()};
  box.querySelector('[data-rm="go"]').onclick=async function(){var btn=this,why=inp.value.trim();if(why.length<3){toast('Choose or type a reason.');inp.focus();return}
    btn.disabled=true;try{await call('staff_remove_booking',{p_id:b.id,p_reason:why});KZDS={};closeDrawer();
      toast((b.name||'Booking')+' removed.',async function(){try{await call('staff_restore_removed',{p_id:b.id,p_batch:null});toast('Booking put back.');refreshCurrent()}catch(e){toast(errText(e))}})}
    catch(e){toast(errText(e));btn.disabled=false}};
  inp.focus()}
(function(){var _dw=drawer;drawer=function(b){var r=_dw.apply(this,arguments);try{
    if(me&&me.role==='admin'&&b&&b.id){var body=document.querySelector('#dr .dbody');if(body&&!$('kzrm')){var w=document.createElement('div');w.className='kzrm noprint';w.id='kzrm';
      w.innerHTML='<button type="button" class="kzrm-go">'+kz136ic('trash')+'<span>Remove booking</span></button>';body.appendChild(w);
      w.querySelector('.kzrm-go').onclick=function(){if(w.querySelector('.kzrm-box'))return;kzRemoveBox(b,w)}}}
  }catch(e){}return r}})();
async function paneRemoved(){var pane=$('spane');if(!pane)return;
  if(!me||me.role!=='admin'){pane.innerHTML='<div class="panel"><p class="muted">Only admins can see removed bookings.</p></div>';return}
  var L;try{L=await call('staff_removed_bookings')}catch(e){pane.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  pane.innerHTML='<div class="stack"><div class="panel stack"><div class="row"><h2 style="margin:0">Removed bookings</h2><span class="sp"></span><button type="button" class="btn" id="kzrmt">'+kz136ic('trash')+' Remove all test bookings</button></div>'+
    '<p class="shint">Kept for 30 days, then erased for good. Restore puts a booking back exactly as it was.</p>'+
    (L.length?'<div class="list kzrm-list">'+L.map(function(x){return '<div class="kzrm-row"><span class="kzrm-who"><b>'+esc(x.name||'')+'</b>'+(x.is_test?' <span class="tag">Test</span>':'')+'<span class="sub">'+esc(kgDate(x.date))+' · '+esc(tl(String(x.time||'')))+' · '+x.size+' · '+esc(x.reference||'')+'</span></span>'+
      '<span class="kzrm-why2"><span>'+esc(x.reason)+'</span><span class="sub">'+esc(x.by)+' · erased '+esc(kgDate(x.erase_on))+'</span></span><button type="button" class="btn sm" data-rs="'+esc(x.id)+'">Restore</button></div>'}).join('')+'</div>'
      :'<p class="muted" style="margin:0">Nothing removed.</p>')+'</div></div>';
  pane.querySelectorAll('[data-rs]').forEach(function(b){b.onclick=async function(){b.disabled=true;try{await call('staff_restore_removed',{p_id:b.dataset.rs,p_batch:null});toast('Booking put back.');paneRemoved()}catch(e){toast(errText(e));b.disabled=false}}});
  $('kzrmt').onclick=function(){var btn=this,row=btn.parentNode;if(pane.querySelector('.kzrm-cf'))return;var c=document.createElement('div');c.className='kzrm-cf';
    c.innerHTML='<span>Remove every booking marked as a test?</span><div class="row"><button type="button" class="btn danger" id="kzrmok">Remove test bookings</button><button type="button" class="btn" id="kzrmno">Keep</button></div>';row.insertAdjacentElement('afterend',c);
    $('kzrmno').onclick=function(){c.remove()};
    $('kzrmok').onclick=async function(){this.disabled=true;try{var r=await call('staff_remove_test_bookings');paneRemoved();
      toast(r.removed+' test '+(r.removed===1?'booking':'bookings')+' removed.',r.removed?async function(){try{await call('staff_restore_removed',{p_id:null,p_batch:r.batch});toast('Test bookings put back.');paneRemoved()}catch(e){toast(errText(e))}}:null)}catch(e){toast(errText(e));this.disabled=false}}}}
/* v145 (30 Oct 2026, Settings console Phase 1). Settings > Records holds Removed bookings and a Change history (who
   changed which setting, when, from what to what). When a change to opening hours, a sitting or a grill is refused
   because of bookings, a panel lists exactly which bookings, each one tap from opening. */
(function(){KZ136.G.forEach(function(g){var i=g.items.indexOf('removed');if(i>=0&&g.k!=='records')g.items.splice(i,1)});
  if(!KZ136.G.some(function(g){return g.k==='records'}))KZ136.G.push({k:'records',t:'Records',ic:'clock',items:['removed','history']});
  if(!STABS.some(function(s){return s[0]==='history'}))STABS.push(['history','Change history']);KZ136.I.history='clock';})();
function kzT12(s){return String(s==null?'':s).replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g,function(m,h,mi){h=+h;return (h%12||12)+':'+mi+' '+(h<12?'AM':'PM')})}
async function paneHistory(){var pane=$('spane');if(!pane)return;
  if(!me||me.role!=='admin'){pane.innerHTML='<div class="panel"><p class="muted">Only admins can see the change history.</p></div>';return}
  pane.innerHTML='<div class="stack"><div class="panel stack"><h2 style="margin:0">Change history</h2><div class="search">'+I.search+'<input id="kzhq" type="search" placeholder="Setting, value or person" aria-label="Search the change history"></div><div id="kzhl"><div class="skel" aria-label="Loading"><i></i><i></i><i></i></div></div></div></div>';
  var t=null;$('kzhq').oninput=function(){clearTimeout(t);var v=this.value.trim();t=setTimeout(function(){load(v)},300)};
  async function load(q){var el=$('kzhl');if(!el)return;var L;try{L=await call('staff_settings_history',{p_q:q||null,p_limit:300})}catch(e){el.innerHTML='<p class="muted">'+esc(errText(e))+'</p>';return}
    if(!L.length){el.innerHTML='<p class="muted" style="margin:0">'+(q?'Nothing matches.':'No changes recorded yet.')+'</p>';return}
    var last='',h='<div class="list kzh-list">';
    L.forEach(function(x){var d=new Date(x.at),day=d.toLocaleDateString('en-GB',{timeZone:'Pacific/Fiji',weekday:'short',day:'numeric',month:'short',year:'numeric'}),tm=d.toLocaleTimeString('en-US',{timeZone:'Pacific/Fiji',hour:'numeric',minute:'2-digit'});
      if(day!==last){h+='<div class="kzh-day">'+esc(day)+'</div>';last=day}
      h+='<div class="kzh-row"><span class="kzh-when">'+esc(tm)+'</span><span class="kzh-what"><b>'+esc(kzT12(x.setting))+'</b><span class="kzh-ch">'+(x.old!=null&&x.old!==''?'<s>'+esc(kzT12(x.old))+'</s> → ':'')+esc(kzT12(x.new==null?'':x.new))+'</span></span><span class="kzh-who">'+esc(x.by||'')+'</span></div>'});
    el.innerHTML=h+'</div>'}
  load('')}
/* impact panel: which bookings stop a change */
function kzImpactSheet(title,L){var o=$('kzimp');if(o)o.remove();var d=document.createElement('div');d.id='kzimp';d.className='kzimp';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','kzimp-t');
  d.innerHTML='<div class="kzimp-scrim"></div><div class="kzimp-card"><div class="kzimp-h"><b id="kzimp-t">'+esc(title)+'</b><button type="button" class="kg2-ib" data-x aria-label="Close">'+(KZ136.P?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>':'×')+'</button></div>'+
    '<p class="shint">Move or cancel these first, then make the change.</p><div class="list kzimp-list">'+L.map(function(b){return '<button type="button" class="kzimp-row" data-id="'+esc(b.id)+'"><span><b>'+esc(b.name||'')+'</b><span class="sub">'+esc(kgDate(b.date))+' · '+esc(tl(String(b.time||'')))+' · '+esc(b.reference||'')+'</span></span><span class="kzimp-sz" aria-label="'+b.size+' guests"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6.2 4.5 2 4.5 5"/></svg>'+b.size+'</span></button>'}).join('')+'</div></div>';
  root.appendChild(d);function close(){d.remove()}
  d.querySelector('.kzimp-scrim').onclick=close;d.querySelector('[data-x]').onclick=close;
  d.querySelectorAll('[data-id]').forEach(function(b){b.onclick=function(){close();openBooking(b.dataset.id)}});
  var f=d.querySelector('[data-x]');if(f)f.focus()}
(function(){var _c=call;call=async function(fn,args){try{return await _c.apply(this,arguments)}catch(e){var m=String(e&&e.message||''),q=null,title='';
    if(fn==='staff_save_operating_hours'&&/HOURS_HAS_BOOKINGS/.test(m)){q={kind:'hours',id:args.p_id,first:args.p_first,last:args.p_last,days:args.p_days,slot:args.p_slot_minutes,active:args.p_active};title='Bookings outside the new hours'}
    else if(fn==='staff_save_sitting_window'&&/SITTING_HAS_BOOKINGS/.test(m)){q={kind:'sitting',time:args.p_original_time&&args.p_original_time!==args.p_start_time&&!/SITTING_EXISTS/.test(m)?args.p_original_time:(args.p_original_time||args.p_start_time)};title='Bookings in this sitting'}
    else if((fn==='staff_save_date_hours'||fn==='staff_remove_date_hours')&&/HOURS_HAS_BOOKINGS/.test(m)){q={kind:'date_hours',date:args.p_date,hours_id:args.p_hours_id,first:args.p_first||null,last:args.p_last||null};title='Bookings outside those hours'}
    else if(fn==='staff_save_sitting_days'&&/SITTING_HAS_BOOKINGS/.test(m)){q={kind:'sitting_days',time:args.p_time,days:args.p_days};title='Bookings on the days you took away'}
    else if(fn==='staff_update_grill'&&/GRILL_HAS_BOOKINGS/.test(m)){q={kind:'grill',code:args.p_code};title='Bookings on this grill'}
    if(q){try{var L=await _c('staff_change_impact',{p:q});if(L&&L.length)setTimeout(function(){kzImpactSheet(title+' ('+L.length+')',L)},50)}catch(x){}}
    throw e}}})();
/* v146 (30 Oct 2026, Settings console Phase 2). Settings > Restaurant > Restaurant profile: name, address, phone, website
   and social links (used in guest emails), and the two occasion lists used by the booking form and the Service Hub. */
(function(){if(!STABS.some(function(s){return s[0]==='profile'}))STABS.splice(1,0,['profile','Restaurant profile']);
  if(!KZ136.G.some(function(g){return g.k==='restaurant'}))KZ136.G.unshift({k:'restaurant',t:'Restaurant',ic:'home',items:['profile']});KZ136.I.profile='home';
  ERR.INVALID_PHONE='Check the phone number: digits, spaces and + only.';ERR.INVALID_URL='Links must start with https:// and be a full web address.';})();
function kzSetOccasions(L){if(Array.isArray(L)&&L.length)OCCASIONS.splice.apply(OCCASIONS,[0,OCCASIONS.length].concat(L.slice(0,20)))}
(function(){var done=false,_sh=shell;shell=function(){var r=_sh.apply(this,arguments);if(!done&&me){done=true;call('get_booking_options').then(function(o){if(o){kzSetOccasions(o.occasions);if(+o.hold_minutes>=5)KZHOLD=+o.hold_minutes}}).catch(function(){})}return r}})();
async function paneProfile(){var pane=$('spane');if(!pane)return;
  if(!me||me.role!=='admin'){pane.innerHTML='<div class="panel"><p class="muted">Only admins can change the restaurant profile.</p></div>';return}
  var P;try{P=await call('staff_get_profile')}catch(e){pane.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  var S=P.socials||{},L={occ:(P.occasions||[]).slice(),evt:(P.event_occasions||[]).slice()};
  function fld(id,label,val,ph,type){return '<label class="f">'+label+'<input id="'+id+'" type="'+(type||'text')+'" maxlength="200" value="'+esc(val||'')+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></label>'}
  pane.innerHTML='<div class="stack kzp">'+
    '<div class="panel stack"><h2 style="margin:0">Restaurant</h2><div class="kzp-grid">'+fld('kzp-name','Name',P.name)+fld('kzp-phone','Phone',P.phone,'+679 …','tel')+fld('kzp-addr','Address',P.address)+fld('kzp-web','Website',P.website,'https://','url')+'</div>'+
      '<details class="fold"><summary><span class="fold-t">Social links</span></summary><div class="kzp-grid" style="margin-top:10px">'+fld('kzp-ig','Instagram',S.instagram,'https://','url')+fld('kzp-fb','Facebook',S.facebook,'https://','url')+fld('kzp-ta','TripAdvisor',S.tripadvisor,'https://','url')+fld('kzp-gg','Google',S.google,'https://','url')+'</div></details>'+
      '<p class="shint">Guest emails sign off with the name and show the address, phone and website.</p></div>'+
    '<div class="panel stack"><h2 style="margin:0">Occasions</h2><div class="kzp-occs"><div><b class="kzp-lt">Lunch, dinner and Teppanyaki</b><div id="kzp-occ"></div></div><div><b class="kzp-lt">Groups and events</b><div id="kzp-evt"></div></div></div>'+
      '<p class="shint">Shown on the booking form and in the hub, in this order. Bookings keep the occasion they were made with.</p></div>'+
    '<div class="kzp-bar"><button type="button" class="btn primary" id="kzp-save">Save</button></div></div>';
  function list(k){var el=$('kzp-'+k);if(!el)return;
    el.innerHTML='<ul class="kzp-list">'+L[k].map(function(x,i){return '<li><span>'+esc(x)+'</span><span class="kzp-acts"><button type="button" class="kg2-ib kzp-ib" data-up="'+i+'" aria-label="Move '+esc(x)+' up"'+(i?'':' disabled')+'><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 14l5-5 5 5"/></svg></button><button type="button" class="kg2-ib kzp-ib" data-rm="'+i+'" aria-label="Remove '+esc(x)+'"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span></li>'}).join('')+'</ul>'+
      '<div class="kzp-add"><input maxlength="40" placeholder="Add an occasion" aria-label="Add an occasion"><button type="button" class="btn">Add</button></div>';
    el.querySelectorAll('[data-up]').forEach(function(b){b.onclick=function(){var i=+b.dataset.up;if(i>0){var t=L[k][i];L[k][i]=L[k][i-1];L[k][i-1]=t;list(k)}}});
    el.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){if(L[k].length<=1){toast('Keep at least one occasion.');return}L[k].splice(+b.dataset.rm,1);list(k)}});
    var inp=el.querySelector('.kzp-add input'),add=function(){var v=inp.value.trim();if(!v)return;if(L[k].some(function(x){return x.toLowerCase()===v.toLowerCase()})){toast(v+' is already on the list.');return}if(L[k].length>=20){toast('Up to 20 occasions.');return}
      var o=L[k].findIndex(function(x){return x.toLowerCase()==='other'});if(o>=0)L[k].splice(o,0,v);else L[k].push(v);list(k);var n=$('kzp-'+k).querySelector('.kzp-add input');if(n)n.focus()};
    el.querySelector('.kzp-add button').onclick=add;inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();add()}}}
  list('occ');list('evt');
  $('kzp-save').onclick=async function(){var b=this;b.disabled=true;
    try{var r=await call('staff_update_profile',{p:{name:$('kzp-name').value,address:$('kzp-addr').value,phone:$('kzp-phone').value,website:$('kzp-web').value,
      socials:{instagram:$('kzp-ig').value,facebook:$('kzp-fb').value,tripadvisor:$('kzp-ta').value,google:$('kzp-gg').value},occasions:L.occ,event_occasions:L.evt}});
      kzSetOccasions(r.occasions);KZPG.dirty=false;toast('Restaurant profile saved.');paneProfile()}catch(e){toast(errText(e));b.disabled=false}}}
/* v147 (30 Oct 2026, Settings console Phase 3). Cleaner Settings. A search box finds a section by its name or by what it
   controls ("phone", "sitting", "password"). On phones the long strip of section buttons becomes one button that opens the
   list as a sheet. The Overview shows each group once and every row opens the section that changes it. Operations is
   split into tabs: Sittings, Booking hours and Conditions. */
var KZ147K={profile:'name address phone website instagram facebook tripadvisor google social links occasions birthday anniversary wedding email signature',
  operations:'sittings teppanyaki hours lunch dinner times opening hours arrival spacing reservation length schedule',
  closures:'closed closure day off private hire shut',holidays:'holiday public holidays events heartbeat diwali christmas',
  tables:'grills seats capacity floor plan teppanyaki',floor:'tables counters bar seating dining room',
  rules:'opening date book ahead advance largest party size notice confirm automatically pacing capacity groups events minimum hold held late release no-show cancel cancellation notice',
  places:'places countries hotels where guests are from location',emails:'emails alerts kitchen sheet floor sheet run sheet reminder reply morning summary copy',
  staff:'staff accounts users roles admin manager invite access two-step',me:'my account password two-step sign-in authenticator',
  removed:'removed bookings delete restore test bookings',history:'change history log audit who changed'};
function kz147match(k,q){if(!q)return true;var hay=(kz136name(k)+' '+(KZ147K[k]||'')).toLowerCase();return q.toLowerCase().split(/\s+/).filter(Boolean).every(function(w){return hay.indexOf(w)>=0})}
var KZ147DN='<svg class="kzi kz147-dn" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5l5.5 5.5 5.5-5.5"/></svg>';
function kz147nav(){var w=document.querySelector('#kzs main .settings'),nav=w&&w.querySelector('.snav');if(!nav||nav.querySelector('.kz147-q'))return;
  /* search */
  var q=document.createElement('div');q.className='kz147-q';q.setAttribute('role','search');
  q.innerHTML='<div class="kz147-sh"><b>Settings</b><button type="button" class="kg2-ib kz147-x" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="search kz147-in">'+I.search+'<input type="search" placeholder="Search settings" aria-label="Search settings" autocomplete="off" enterkeyhint="go"></div>';
  nav.insertBefore(q,nav.firstChild);
  var none=document.createElement('p');none.className='kz147-none';none.hidden=true;none.textContent='No match';nav.appendChild(none);
  var inp=q.querySelector('input');
  function filt(){var v=inp.value.trim(),first=null;
    nav.querySelectorAll('[data-s]').forEach(function(b){var ok=kz147match(b.dataset.s,v);b.classList.toggle('kz147-hide',!ok);if(ok&&!first)first=b});
    nav.querySelectorAll('.kz136-gl').forEach(function(g){var n=g.nextElementSibling,vis=false;while(n&&!n.classList.contains('kz136-gl')){if(n.dataset&&n.dataset.s&&!n.classList.contains('kz147-hide'))vis=true;n=n.nextElementSibling}g.classList.toggle('kz147-hide',!vis)});
    none.hidden=!!first;return first}
  inp.addEventListener('input',filt);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var f=filt();if(f)f.click()}else if(e.key==='Escape'){if(inp.value){e.stopPropagation();inp.value='';filt()}else open(false)}});
  /* phones: one section button; the list opens as a sheet */
  var pk=document.createElement('button');pk.type='button';pk.className='kz147-pick';pk.setAttribute('aria-haspopup','dialog');pk.setAttribute('aria-expanded','false');
  pk.innerHTML='<span class="kz136-ci">'+kz136ic(KZ136.I[state.stab]||'home')+'</span><span class="kz147-pt">'+esc(kz136name(state.stab))+'</span>'+KZ147DN;
  w.insertBefore(pk,nav);
  var scrim=document.createElement('div');scrim.className='kz147-scrim';w.appendChild(scrim);
  function open(o){w.classList.toggle('kz147-open',o);pk.setAttribute('aria-expanded',String(o));if(o){nav.setAttribute('role','dialog');nav.setAttribute('aria-label','Settings sections');var a=nav.querySelector('[data-s].on');if(a&&a.scrollIntoView)try{a.scrollIntoView({block:'center'})}catch(e){}}
    else{nav.removeAttribute('role');if(inp.value){inp.value='';filt()}}}
  pk.onclick=function(){open(true)};scrim.onclick=function(){open(false)};q.querySelector('.kz147-x').onclick=function(){open(false);pk.focus()};
  nav.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-s]'))open(false)},true)}
(function(){var _rs=renderSettings;renderSettings=function(){var r=_rs.apply(this,arguments);try{kz147nav()}catch(e){if(window.console)console.error(e)}return r}})();
/* Operations tabs; the open tab is kept while you stay in Settings */
var KZ147OP=0;
function kz148days(d){var N=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];d=(d||[]).slice().sort();if(d.length===7)return 'Every day';if(d.join()==='1,2,3,4,5')return 'Mon–Fri';if(d.join()==='0,6')return 'Sat, Sun';return d.map(function(i){return N[i]}).join(', ')}
function kz147opTabs(pane){var S=pane.querySelectorAll('.op-section');if(S.length<2)return;
  var T=[['grill','Sittings'],['clock','Booking hours'],['sliders','Conditions']],wrap=pane.querySelector('.op-wrap')||pane;
  if(KZ147OP>=S.length)KZ147OP=0;
  var bar=document.createElement('div');bar.className='kz147-tabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Operations');
  bar.innerHTML=[].map.call(S,function(sec,i){sec.id=sec.id||'kz147op'+i;sec.setAttribute('role','tabpanel');sec.setAttribute('aria-labelledby','kz147t'+i);var t=T[i]||['home','Part '+(i+1)];
    return '<button type="button" role="tab" id="kz147t'+i+'" aria-controls="'+sec.id+'" data-t="'+i+'">'+kz136ic(t[0])+'<span>'+esc(t[1])+'</span></button>'}).join('');
  wrap.insertBefore(bar,S[0]);
  function sel(i,focus){KZ147OP=i;[].forEach.call(S,function(sec,j){sec.classList.toggle('kz147-off',j!==i)});
    bar.querySelectorAll('[role=tab]').forEach(function(b,j){b.setAttribute('aria-selected',String(j===i));b.tabIndex=j===i?0:-1;b.classList.toggle('on',j===i);if(j===i&&focus)b.focus()})}
  bar.querySelectorAll('[role=tab]').forEach(function(b){b.onclick=function(){sel(+b.dataset.t)};
    b.onkeydown=function(e){var n=S.length,i=+b.dataset.t;if(e.key==='ArrowRight'){e.preventDefault();sel((i+1)%n,true)}else if(e.key==='ArrowLeft'){e.preventDefault();sel((i+n-1)%n,true)}}});
  sel(KZ147OP)}
async function paneHome(){var pane=$('spane');if(!pane)return;
  var r=await Promise.all([call('staff_get_settings').catch(function(e){return {err:e}}),call('staff_get_operations').catch(function(){return null}),me&&me.role==='admin'?call('staff_get_profile').catch(function(){return null}):null]);
  if(state.stab!=='home'||!$('spane'))return;
  var S=r[0]||{},O=r[1]||null;if(S.err){pane.innerHTML='<div class="msg err">'+esc(errText(S.err))+'</div>';return}
  var st=S.settings||{},rules=S.rules||{},tables=(S.tables||[]).filter(function(t){return t.active!==false}),staff=(S.staff||[]).filter(function(u){return u.active!==false});
  var svc={};(S.services||[]).forEach(function(x){svc[x.code]=x});
  /* v147: every row opens the section that changes it */
  function row(l,v,tone,go){return '<button type="button" class="kz147-row" data-go="'+go+'"><span class="kz147-l">'+esc(l)+'</span><span class="kz147-v'+(tone?' kz136-'+tone:'')+'">'+v+'</span>'+kz136ic('chev','kz136-cv')+'</button>'}
  function chip(t,tone){return '<span class="kz136-chip'+(tone?' kz136-'+tone:'')+'">'+esc(t)+'</span>'}
  var sits=O&&O.sittings?O.sittings.filter(function(x){return x.active}).sort(function(a,b){return (a.time||'').localeCompare(b.time||'')}):null;
  var hours=(O&&O.hours)||S.hours||[];function hrs(per){var h=hours.filter(function(x){return x.service==='dining'&&x.period===per})[0];return h?(h.active===false?chip('Closed','warn'):esc(tl(h.first)+' to '+tl(h.last))):'<span class="muted">Not set</span>'}
  var seats=tables.reduce(function(a,t){return a+(+t.seats||0)},0),admins=staff.filter(function(u){return u.role==='admin'}).length;
  var od=rules.opening_date?new Date(rules.opening_date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not set';
  var mfa=!!st.require_admin_mfa;
  var P=r[2]||null;
  var V={profile:P?row('Name',esc(P.name||''),'','profile')+row('Phone',P.phone?esc(P.phone):chip('Not set','warn'),'','profile'):'',
    operations:row('Teppanyaki sittings',!sits?'<span class="muted">See Operations</span>':sits.length?sits.map(function(x){return chip(tl(x.time)+(x.days&&x.days.length&&x.days.length<7?' · '+kz148days(x.days):''))}).join(''):chip('None open','warn'),'','operations')+row('Lunch',hrs('lunch'),'','operations')+row('Dinner',hrs('dinner'),'','operations'),
    tables:row('Grills',tables.length+' grills · '+seats+' seats','','tables'),
    rules:row('Opening date',esc(od),'','rules')+row('Book ahead',(rules.max_advance_days||'—')+' days','','rules')+row('Largest party online','Teppanyaki '+esc(String(rules.tep_max_online||(svc.teppanyaki||{}).max_online_party||'—'))+' · Dining '+esc(String((svc.dining||{}).max_online_party||'—')),'','rules'),
    emails:row('Guest confirmation emails',st.send_guest_confirmation===false?chip('Off','warn'):chip('On','ok'),'','emails')+row('Alerts go to',esc(st.alert_email||'Not set'),'','emails'),
    staff:row('Staff accounts',staff.length+' active · '+admins+(admins===1?' admin':' admins'),'','staff')+row('Two-step sign-in for admins',mfa?chip('Required','ok'):chip('Not required','warn'),'','staff')};
  var h='<div class="kz136-home"><div class="kz136-grid">';
  KZ136.G.forEach(function(g){var items=g.items.filter(function(k){return STABS.some(function(s){return s[0]===k})});if(!items.length)return;
    h+='<section class="kz136-card" data-g="'+g.k+'"><button type="button" class="kz136-ch" data-go="'+items[0]+'"><span class="kz136-ci">'+kz136ic(g.ic)+'</span><span class="kz136-ct">'+esc(g.t)+'</span>'+kz136ic('chev','kz136-cv')+'</button>'+
      '<div class="kz147-rows">'+items.map(function(k){return V[k]||row(kz136name(k),'','',k)}).join('')+'</div></section>'});
  h+='</div></div>';pane.innerHTML=h;
  pane.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){var k=b.dataset.go;kzLeaveSettings(function(){state.stab=k;hpush(curSt());renderSettings()})}})}
(function(){
  /* app shell: the section scrolls inside its own area; the page and the navigation stay still */
  function fit(){var w=document.querySelector('#kzs main .settings');if(!w)return;var wide=innerWidth>=768;w.classList.add('kz136');w.classList.toggle('kz136-shell',wide);
    if(!wide){w.style.removeProperty('--kz136-h');return}
    var top=w.getBoundingClientRect().top+scrollY,bar=document.querySelector('#kzs .kbot'),bh=bar&&bar.getClientRects().length?bar.getBoundingClientRect().height:0;
    var h=Math.max(360,Math.floor(innerHeight-top-bh-20));if(w.style.getPropertyValue('--kz136-h')!==h+'px')w.style.setProperty('--kz136-h',h+'px')}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{fit()}catch(e){}})}).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',function(){try{fit()}catch(e){}});
  /* a new section opens at its top */
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#kzs .snav [data-s], #kzs [data-go]');if(!b)return;setTimeout(function(){var p=$('spane');if(p)p.scrollTop=0},0)},true);
})();
/* v136 (continued). Every section gets the same header (icon and name) and its long explanations fold behind an
   information button beside the heading they belong to: tap to read, tap again to hide. Warnings, errors, field
   validation and confirmations are not touched. */
(function(){
  var info='<svg class="kzi kz136-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg>',n=0;
  function isHelp(e){return e&&e.tagName==='P'&&(e.classList.contains('muted')||e.classList.contains('small'))&&!e.classList.contains('op-count')&&!e.closest('.msg')&&!e.classList.contains('kz136-help')&&!e.dataset.kz136keep&&e.textContent.trim().length>48&&!e.querySelector('input,select,button,a')}
  function fold(head,p){if(!head||!p||head.querySelector('.kz136-info'))return;var id='kz136h'+(++n);p.id=p.id||id;p.classList.add('kz136-help');p.hidden=true;
    var b=document.createElement('button');b.type='button';b.className='kz136-info';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',p.id);b.setAttribute('aria-label','About '+head.textContent.trim());b.title='About this';b.innerHTML=info;
    b.onclick=function(e){e.preventDefault();e.stopPropagation();var o=p.hidden;p.hidden=!o;b.setAttribute('aria-expanded',String(o))};head.appendChild(b);head.classList.add('kz136-hh')}
  function run(){var pane=$('spane');if(!pane||state.tab!=='settings'||state.stab==='home')return;if(pane.querySelector('.skel'))return;
    var name=kz136name(state.stab),ph=pane.querySelector(':scope>.kz136-ph');
    if(!ph||ph.dataset.s!==state.stab){if(ph)ph.remove();ph=document.createElement('div');ph.className='kz136-ph';ph.dataset.s=state.stab;
      ph.innerHTML='<span class="kz136-ci">'+kz136ic(KZ136.I[state.stab]||'home')+'</span><h2>'+esc(name)+'</h2>';pane.insertBefore(ph,pane.firstChild)}
    var firstH=pane.querySelector('h2:not(.kz136-ph h2)');if(firstH&&firstH.textContent.trim().toLowerCase()===name.toLowerCase()&&!firstH.classList.contains('kz136-dup')){firstH.classList.add('kz136-dup');var nx=firstH.nextElementSibling;if(isHelp(nx))fold(ph.querySelector('h2'),nx)}
    /* a lead paragraph before the first heading belongs to the section header */
    var all=pane.querySelectorAll('p.muted,p.small');for(var i=0;i<all.length;i++){var pp=all[i];if(!isHelp(pp))continue;var hs=pane.querySelectorAll('h2:not(.kz136-ph h2):not(.kz136-dup),h3');var before=true;for(var j=0;j<hs.length;j++){if(hs[j].compareDocumentPosition(pp)&Node.DOCUMENT_POSITION_FOLLOWING){before=false;break}}
      if(before){fold(ph.querySelector('h2'),pp)}break}
    pane.querySelectorAll('h2:not(.kz136-dup),h3').forEach(function(h){if(h.closest('.kz136-ph')||h.querySelector('.kz136-info'))return;var nx=h.nextElementSibling;if(isHelp(nx))fold(h,nx)})}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true});
})();
/* v136 (continued). Staff accounts as a directory: one row per person (name and email together, role, access and
   two-step as clear states, actions at the end), with a search box. The same controls as before. */
(function(){
  function run(){if(state.tab!=='settings'||state.stab!=='staff')return;var pane=$('spane');if(!pane)return;var t=pane.querySelector('table.t');if(!t||t.classList.contains('kz136-dir'))return;
    t.classList.add('kz136-dir');var rows=t.querySelectorAll('tbody tr');
    rows.forEach(function(tr){var tw=tr.querySelector('[data-l="Two-step"]');if(tw){var on=/^on$/i.test(tw.textContent.trim());tw.innerHTML='<span class="kz136-chip '+(on?'kz136-ok':'kz136-warn')+'">Two-step '+(on?'on':'off')+'</span>'}
      var ls=tr.querySelector('[data-l="Last signed in"]');if(ls)ls.textContent='Last signed in: '+ls.textContent.trim()});
    var f=document.createElement('label');f.className='kz136-find';f.innerHTML='<svg class="kzi kz136-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="Search staff by name or email" aria-label="Search staff">';
    t.parentNode.insertBefore(f,t);var inp=f.querySelector('input');
    inp.oninput=function(){var q=inp.value.trim().toLowerCase();rows.forEach(function(tr){tr.hidden=!!q&&tr.textContent.toLowerCase().indexOf(q)<0})}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){if(window.console)console.error(e)}})}).observe(root,{childList:true,subtree:true});
})();
/* ======================================================================================================================
   v137 (27 Oct 2026, Roneel: "a Kazumi welcome splash screen with login, animated"). Interface only.
   The sign-in screen becomes a welcome splash: a warm charcoal room lit from below like a teppan grill, copper embers
   drifting up, the Kazumi ensō drawn as one brush stroke, then the name, then the sign-in card rising into place.
   The form is the same form (same fields, ids, password manager hints, errors, Forgot password and Practice mode).
   The full animation plays once per page load; a wrong password or a return to this screen shows it already in place.
   Reduced motion: everything appears at once, no movement.
   ====================================================================================================================== */
(function(){
  var played=false;
  function decorate(){var L=root.querySelector(':scope>.login');if(!L||L.dataset.kz137)return;L.dataset.kz137='1';
    root.classList.add('kz137');if(played)root.classList.add('kz137-done');played=true;
    var bg=document.createElement('div');bg.className='kz137-bg';bg.setAttribute('aria-hidden','true');
    var e='';for(var i=0;i<16;i++){e+='<i style="--x:'+(4+Math.round(Math.random()*92))+'%;--d:'+(14+Math.random()*10).toFixed(1)+'s;--w:'+(-Math.random()*24).toFixed(1)+'s;--s:'+(2+Math.round(Math.random()*3))+'px;--o:'+(0.25+Math.random()*0.35).toFixed(2)+'"></i>'}
    bg.innerHTML='<div class="kz137-glow"></div><div class="kz137-wave"><span></span></div><div class="kz137-kanji" role="img" aria-label="和海 Kazumi"></div><div class="kz137-embers">'+e+'</div>';root.insertBefore(bg,root.firstChild);
    var hero=document.createElement('div');hero.className='kz137-hero';
    hero.innerHTML='<span class="kz137-enso" role="img" aria-label="Kazumi Japanese Restaurant"><i class="klogo"></i></span><span class="kz137-tag">Marketing &amp; Business Intelligence Hub</span>';
    root.insertBefore(hero,L);
    var bl=L.querySelector('.brandline');if(bl)bl.classList.add('kz137-hide');
    var f=L.querySelector('#lf');if(f)f.addEventListener('submit',function(){L.classList.add('kz137-busy')});
    var le=L.querySelector('#le');if(le&&!le.value&&innerWidth>860)setTimeout(function(){try{if(document.activeElement===document.body)le.focus({preventScroll:true})}catch(x){}},root.classList.contains('kz137-done')?0:1300)}
  function off(){if(!root.querySelector(':scope>.login')){root.classList.remove('kz137','kz137-done');var b=root.querySelector(':scope>.kz137-bg');if(b)b.remove();var h=root.querySelector(':scope>.kz137-hero');if(h)h.remove()}}
  var q=false;new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{decorate();off()}catch(x){if(window.console)console.error(x)}})}).observe(root,{childList:true});
})();
/* v138 (27 Oct 2026, Roneel: Kazumi charcoal frame). Changing section fades the new screen in gently (opacity only, so
   nothing inside moves or loses its place). Interface only. */
(function(){var t;document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#kzs .kside [data-nav],#kzs .kbot [data-nav]');
  if(!b||b.dataset.nav==='more'||b.dataset.nav==='new'||b.classList.contains('on'))return;
  requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove('kz138-in');void root.offsetWidth;root.classList.add('kz138-in');clearTimeout(t);t=setTimeout(function(){root.classList.remove('kz138-in')},420)})})},true)})();
/* v146 (28 Oct 2026, Priority 1 in the Settings audit): Settings > Communications > Integrations. Read only (admins):
   guest emails, staff alerts, floor and kitchen sheets, the Google Sheet backup, the scheduled jobs and the twice-daily
   self-check, each with its last success, last problem and anything waiting. One server call, staff_integrations_status. */
(function(){if(!STABS.some(function(s){return s[0]==='integrations'}))STABS.push(['integrations','Integrations']);
  KZ136.G.forEach(function(g){if(g.k==='comms'&&g.items.indexOf('integrations')<0)g.items.push('integrations')});KZ136.I.integrations='pulse';
  KZ136.P.pulse='<path d="M3.5 12h4l2.5-6 4 12 2.5-6h4"/>';})();
var KZINT_JOBS={'kazumi-daily-reminders':['Guest reminder emails','Daily, 10:00 AM'],'kazumi-morning-summary':['Morning summary email','Daily, 9:00 AM'],
  'kazumi-daily-run-sheet':['Floor and kitchen sheets','Daily, 3:00 PM'],'kazumi-auto-complete':['Mark past bookings completed','Nightly, 3:00 AM'],
  'kazumi-self-check':['Self-check','8:45 AM and 4:45 PM'],'kazumi-retention':['Clear old guest details','Monthly'],
  'kazumi-email-retry':['Resend guest emails','Every 5 min'],'kazumi-notify-retry':['Resend staff alerts','Every 5 min'],
  'kazumi-run-sheet-retry':['Resend floor and kitchen sheets','Every 5 min'],'kazumi-sheet-retry':['Resend to backup sheet','Every 5 min']};
function kzAgo(t){if(!t)return '';var s=(Date.now()-new Date(t).getTime())/1000;if(s<90)return 'just now';var m=Math.round(s/60);if(m<60)return m+' min ago';var h=Math.round(m/60);if(h<36)return h+' hr ago';return Math.round(h/24)+' days ago'}
function kzWhen(t){if(!t)return '';var d=new Date(t);return d.toLocaleDateString('en-GB',{timeZone:'Pacific/Fiji',weekday:'short',day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-US',{timeZone:'Pacific/Fiji',hour:'numeric',minute:'2-digit'})}
function kzIntState(x){if(!x)return 'off';if(x.failed>0||(x.bad_at&&(!x.ok_at||new Date(x.bad_at)>new Date(x.ok_at))))return 'bad';if(x.waiting>0)return 'wait';return x.ok_at?'ok':'off'}
var KZINT_IC={ok:'<path d="M5 12.5l4.2 4.2L19 7"/>',wait:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3.2 2"/>',bad:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>',off:'<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>'};
function kzIntIc(st){return '<span class="kzint-st kzint-'+st+'" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+KZINT_IC[st]+'</svg></span>'}
var KZINT_SAY={ok:'Working',wait:'Waiting',bad:'Problem',off:'Not run yet'};
async function paneIntegrations(){var pane=$('spane');if(!pane)return;
  if(!me||me.role!=='admin'){pane.innerHTML='<div class="panel"><p class="muted">Only admins can see integrations.</p></div>';return}
  pane.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>';
  var s;try{s=await call('staff_integrations_status')}catch(e){pane.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  var C=[['email','Guest emails','mail','Confirmations, changes and reminders'],['notify','Staff alerts and summaries','people','New bookings, requests and the morning summary'],
    ['run_sheet','Floor and kitchen sheets','table','Emailed every afternoon'],['sheet','Google Sheet backup','cal','A copy of every booking change']];
  var bad=0,wait=0;
  var rows=C.map(function(c){var x=s[c[0]]||{},st=kzIntState(x);if(st==='bad')bad++;if(st==='wait')wait++;
    var sub=x.ok_at?(c[0]==='sheet'?'Last copied ':'Last sent ')+kzAgo(x.ok_at):'Nothing sent yet';
    if(x.waiting>0)sub+=' · '+x.waiting+' waiting';if(x.failed>0)sub+=' · '+x.failed+' failed';
    var prob=x.bad_at&&st==='bad'?'<span class="kzint-err">'+esc(kzWhen(x.bad_at))+(x.error?': '+esc(x.error):'')+'</span>':'';
    return '<div class="kzint-row" title="'+esc(c[3])+'">'+kzIntIc(st)+'<span class="kzint-tx"><b>'+esc(c[1])+'</b><span class="sub">'+esc(sub)+'</span>'+prob+'</span>'+
      '<span class="kzint-n" aria-label="'+(x.sent_14d||0)+' sent in the last 14 days"><b>'+(x.sent_14d||0)+'</b><span class="sub">14 days</span></span><span class="kz110-sr">'+KZINT_SAY[st]+'</span></div>'}).join('');
  var J=(s.jobs||[]).map(function(j){var n=KZINT_JOBS[j.name]||[j.name,j.schedule],st=!j.active?'off':(j.bad_at&&(!j.ok_at||new Date(j.bad_at)>new Date(j.ok_at)))?'bad':j.ok_at?'ok':'off';if(st==='bad')bad++;return {n:n,j:j,st:st}});
  var jb=J.filter(function(x){return x.st==='bad'}).length;
  var jobs=J.map(function(x){return '<div class="kzint-row kzint-job">'+kzIntIc(x.st)+'<span class="kzint-tx"><b>'+esc(x.n[0])+'</b><span class="sub">'+esc(x.n[1])+(x.j.ok_at?' · last ran '+esc(kzAgo(x.j.ok_at)):(x.j.active?' · not run yet':' · switched off'))+'</span>'+
      (x.st==='bad'?'<span class="kzint-err">'+esc(kzWhen(x.j.bad_at))+(x.j.error?': '+esc(x.j.error):'')+'</span>':'')+'</span><span class="kz110-sr">'+KZINT_SAY[x.st]+'</span></div>'}).join('');
  var h=s.health||{},hst=h.at?(h.ok?'ok':'bad'):'off';if(hst==='bad')bad++;
  var hchk=(h.checks||[]).filter(function(c){return !c.ok}).map(function(c){return esc(c.check)+(c.detail?': '+esc(c.detail):'')}).join(' · ');
  var top=bad?'bad':wait?'wait':'ok',head=bad?(bad===1?'1 problem':bad+' problems'):wait?'Working, items waiting to send':'Everything is working';
  pane.innerHTML='<div class="stack"><div class="panel stack kzint">'+
    '<div class="kzint-head">'+kzIntIc(top)+'<span class="kzint-tx"><h2 style="margin:0">'+esc(head)+'</h2><span class="sub">Checked '+esc(new Date(s.checked_at).toLocaleTimeString('en-US',{timeZone:'Pacific/Fiji',hour:'numeric',minute:'2-digit'}))+'</span></span><span class="sp"></span><button type="button" class="btn kzint-rf" id="kzintr" aria-label="Refresh" title="Refresh"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg><span>Refresh</span></button></div>'+
    '<div class="kzint-row kzint-self">'+kzIntIc(hst)+'<span class="kzint-tx"><b>Self-check</b><span class="sub">'+(h.at?'Test booking, emails, sheets and jobs · '+esc(kzAgo(h.at)):'Not run yet')+'</span>'+(hst==='bad'&&hchk?'<span class="kzint-err">'+hchk+'</span>':'')+'</span></div>'+
    '<div class="list kzint-list">'+rows+'</div>'+
    '<details class="kzint-jobs"'+(jb?' open':'')+'><summary><span>Scheduled jobs</span><span class="sp"></span><span class="sub">'+(jb?jb+' with a problem':J.length+' running')+'</span><svg class="kzint-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 9.5l5.5 5.5 5.5-5.5"/></svg></summary><div class="list kzint-list">'+jobs+'</div></details>'+
    '<p class="shint">Email is sent through Resend. SMS, WhatsApp and payments are not connected.</p></div></div>';
  $('kzintr').onclick=function(){paneIntegrations()}}
/* v147 (28 Oct 2026, Priority 1 in the Settings audit): Settings > Communications > Guest emails. Admins change the subject
   and the opening message of each guest email; booking details, the cancel button and the sign-off stay automatic.
   Only edits are stored (kz_email_wording); "Use the original wording" removes the edit. Saved changes show in the
   change history. The send-booking-emails function fills the {tokens} for each booking. */
(function(){if(!STABS.some(function(s){return s[0]==='wording'}))STABS.push(['wording','Guest emails']);
  KZ136.G.forEach(function(g){if(g.k==='comms'&&g.items.indexOf('wording')<0){var i=g.items.indexOf('emails');g.items.splice(i<0?g.items.length:i+1,0,'wording')}});KZ136.I.wording='edit';
  KZ136.P.edit='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
  ERR.INVALID_SUBJECT='Keep the subject to one line, up to 200 characters.';ERR.MESSAGE_TOO_LONG='Keep the message under 1,500 characters.';})();
var KZEW=[
  ['Booking received',[
    ['confirm_tep_ok','Teppanyaki, booked',"You're booked for Teppanyaki at Kazumi – {reference}","Your seats at the Teppanyaki grill are booked. Our chef will cook right in front of you, so come hungry. We can't wait to welcome you."],
    ['confirm_tep_req','Teppanyaki, request',"We have your Teppanyaki request – {reference}","Thank you for your Teppanyaki request for {guests}. We're holding your seats at the grill, and we'll confirm by {reply_by}. Nothing is final until you hear from us."],
    ['confirm_tep_group','Teppanyaki, large group',"We have your Teppanyaki group request – {reference}","Thank you for your Teppanyaki request for {guests}. We're holding seats for your group while we work out the best way to seat you together, and we'll be in touch by {reply_by}."],
    ['confirm_din_ok','Lunch or dinner, booked',"You're booked for {meal} at Kazumi – {reference}","Your table for {meal} is booked. We look forward to welcoming you to Kazumi."],
    ['confirm_din_req','Lunch or dinner, request',"We have your table request – {reference}","Thank you for your table request for {guests}. We're holding the space for you, and we'll confirm by {reply_by}. Nothing is final until you hear from us."],
    ['confirm_event','Event enquiry',"Thank you for your event enquiry – {reference}","Thank you for thinking of Kazumi for your event. We have your enquiry for {guests} guests, and our team will be in touch by {reply_by} to talk through the menu, timing and anything else you need. Nothing is final until we confirm it with you."]]],
  ['Request confirmed',[
    ['confirmed_tep','Teppanyaki',"Your Teppanyaki booking is confirmed – {reference}","Good news: your Teppanyaki booking for {guests} is confirmed. Our chef will cook right in front of you, so come hungry."],
    ['confirmed_din','Lunch or dinner',"Your table at Kazumi is confirmed – {reference}","Good news: your table for {guests} is confirmed. We look forward to welcoming you."],
    ['confirmed_event','Event',"Your event at Kazumi is confirmed – {reference}","Good news: your event at Kazumi is confirmed. We'll stay in touch about the final details."]]],
  ['Request declined',[
    ['declined_tep','Teppanyaki',"About your Teppanyaki request – {reference}","Thank you for your Teppanyaki request. We're sorry, but we can't seat your group at this sitting."],
    ['declined_din','Lunch or dinner',"About your table request – {reference}","Thank you for your table request. We're sorry, but we can't seat your party at this time."],
    ['declined_event','Event',"About your event enquiry – {reference}","Thank you for thinking of us for your event. We're sorry, but we can't host it on this date."]]],
  ['Day before',[
    ['reminder','Reminder',"See you tomorrow at Kazumi – {service}, {time}","We're looking forward to seeing you tomorrow. Here are your booking details."],
    ['reminder_event','Event reminder',"See you tomorrow at Kazumi – {service}, {time}","Your event at Kazumi is tomorrow, and we're looking forward to hosting you."]]],
  ['Changes and cancellations',[
    ['updated','Booking changed',"Your Kazumi booking is updated – {reference}","We've updated your booking{changes}. Here are your new details."],
    ['cancelled','Guest cancelled',"Your {service} booking is cancelled – {reference}","Your booking is cancelled. Thank you for letting us know, and we hope to welcome you another time."],
    ['cancelled_event','Guest withdrew an event enquiry',"Your event enquiry is withdrawn – {reference}","Your event enquiry is withdrawn. Thank you for letting us know, and we hope to welcome you another time."],
    ['cancelled_by_us','We cancelled',"We're sorry: your Kazumi booking is cancelled – {reference}","We're very sorry, but we've had to cancel your booking."]]]];
var KZEW_TOK=[['name','First name','Mere'],['guests','Guests','4'],['date','Date','Friday, 20 November 2026'],['time','Time','5:30 PM'],['reference','Reference','KZ-4F7Q2'],
  ['meal','Lunch or dinner','dinner'],['service','Booking type','Teppanyaki'],['reply_by','Reply by','Thursday, 4:00 PM'],['changes','What changed',' (time 5:30 PM to 7:00 PM)']];
function kzEwFill(t){var v={};KZEW_TOK.forEach(function(k){v[k[0]]=k[2]});return String(t||'').replace(/\{([a-z_]+)\}/g,function(m,k){return k in v?v[k]:m})}
async function paneWording(){var pane=$('spane');if(!pane)return;
  if(!me||me.role!=='admin'){pane.innerHTML='<div class="panel"><p class="muted">Only admins can change guest email wording.</p></div>';return}
  pane.innerHTML='<div class="skel" aria-label="Loading"><i></i><i></i><i></i></div>';
  var W;try{W=await call('staff_email_wording')}catch(e){pane.innerHTML='<div class="msg err">'+esc(errText(e))+'</div>';return}
  var n=Object.keys(W||{}).length;
  pane.innerHTML='<div class="stack"><div class="panel stack kzew"><div class="row"><h2 style="margin:0">Guest emails</h2><span class="sp"></span><span class="sub kzew-count">'+(n?n+' edited':'All original')+'</span></div>'+
    '<p class="shint">Change the subject and opening message. Booking details, the cancel button and the sign-off are added for you.</p>'+
    KZEW.map(function(g){return '<div class="kzew-g"><div class="kzh-day">'+esc(g[0])+'</div><div class="list kzew-list">'+g[1].map(function(e){var w=W[e[0]],sub=w&&w.subject?w.subject:e[2];
      return '<button type="button" class="kzew-row" data-k="'+e[0]+'"><span class="kzew-tx"><b>'+esc(e[1])+'</b><span class="sub">'+esc(kzEwFill(sub))+'</span></span>'+(w?'<span class="tag kzew-ed">Edited</span>':'')+kz136ic('chev','kzew-chev')+'</button>'}).join('')+'</div></div>'}).join('')+
    '</div></div>';
  pane.querySelectorAll('[data-k]').forEach(function(b){b.onclick=function(){var k=b.dataset.k,e=null;KZEW.forEach(function(g){g[1].forEach(function(x){if(x[0]===k)e=x})});if(e)kzEwEdit(e,W[k]||null)}})}
function kzEwEdit(e,w){var o=$('kzew-s');if(o)o.remove();
  var subj=w&&w.subject?w.subject:e[2],msgt=w&&w.message?w.message:e[3];
  var d=document.createElement('div');d.id='kzew-s';d.className='kzimp kzew-sheet';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','kzew-t');
  d.innerHTML='<div class="kzimp-scrim"></div><div class="kzimp-card kzew-card"><div class="kzimp-h"><b id="kzew-t">'+esc(e[1])+'</b><button type="button" class="kg2-ib" data-x aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="kzew-body"><label class="kzew-l" for="kzew-su">Subject</label><input id="kzew-su" maxlength="200" value="'+esc(subj)+'">'+
    '<label class="kzew-l" for="kzew-me">Opening message</label><textarea id="kzew-me" rows="5" maxlength="1500">'+esc(msgt)+'</textarea>'+
    '<div class="kzew-tok" aria-label="Add a detail">'+KZEW_TOK.filter(function(t){return t[0]!=='changes'||e[0]==='updated'}).map(function(t){return '<button type="button" class="chip" data-t="'+t[0]+'">'+esc(t[1])+'</button>'}).join('')+'</div>'+
    '<p class="shint">Tap a detail to add it where the cursor is. It is filled in for each guest.</p>'+
    '<div class="kzew-prev" aria-live="polite"><div class="kzew-pl">Preview</div><div class="kzew-ps"></div><div class="kzew-pb"><p>Bula Mere,</p><p class="kzew-pm"></p><p class="kzew-auto">Booking details, the cancel button and the sign-off follow.</p></div></div></div>'+
    '<div class="kzew-foot"><button type="button" class="link kzew-orig"'+(w?'':' hidden')+'>Use the original wording</button><span class="sp"></span><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn primary" id="kzew-ok">Save</button></div></div>';
  root.appendChild(d);var su=$('kzew-su'),ms=$('kzew-me'),last=ms;
  function prev(){d.querySelector('.kzew-ps').textContent=kzEwFill(su.value);d.querySelector('.kzew-pm').textContent=kzEwFill(ms.value)}
  su.oninput=ms.oninput=prev;su.onfocus=function(){last=su};ms.onfocus=function(){last=ms};prev();
  d.querySelectorAll('[data-t]').forEach(function(c){c.onmousedown=function(ev){ev.preventDefault()};c.onclick=function(){var f=last,t='{'+c.dataset.t+'}',a=f.selectionStart==null?f.value.length:f.selectionStart,b=f.selectionEnd==null?a:f.selectionEnd;
    f.value=f.value.slice(0,a)+t+f.value.slice(b);f.focus();try{f.setSelectionRange(a+t.length,a+t.length)}catch(x){}prev()}});
  function close(){d.remove()}
  d.querySelector('.kzimp-scrim').onclick=close;d.querySelectorAll('[data-x]').forEach(function(x){x.onclick=close});
  async function save(s,m,msg){try{await call('staff_save_email_wording',{p_key:e[0],p_subject:s,p_message:m});close();toast(msg);paneWording()}catch(x){toast(errText(x))}}
  $('kzew-ok').onclick=function(){var s=su.value.trim(),m=ms.value.trim();if(!s||!m){toast('Fill in the subject and the message.');return}
    if(s===e[2]&&m===e[3])return save('','','Original wording kept.');save(s===e[2]?'':s,m===e[3]?'':m,'Saved. New emails use this wording.')};
  d.querySelector('.kzew-orig').onclick=function(){save('','','Original wording back.')};
  setTimeout(function(){try{su.focus({preventScroll:true})}catch(x){}},50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

/* v106 (22 Oct 2026, Roneel: "reduce the text so the dashboards feel more clean"). Analytics shows the numbers and charts;
   the explanation under each Owner view card (.an-note) folds into "About this chart", one tap away. Text only: no figure,
   chart, workflow or data change. */
(function(){if(window.__kz106)return;window.__kz106=1;
  function css(){if(document.getElementById('kz106-css'))return;var st=document.createElement('style');st.id='kz106-css';st.textContent=
    'body #kzs#kzs details.an-why{margin:10px 0 0}body #kzs#kzs details.an-why>summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--muted);font-size:var(--kz-fs-sup,14px);font-weight:600;list-style:none}'+
    'body #kzs#kzs details.an-why>summary::-webkit-details-marker{display:none}body #kzs#kzs details.an-why>summary:before{content:"i";display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;border:1.5px solid currentColor;font:600 11px/1 Georgia,serif;font-style:italic}'+
    'body #kzs#kzs details.an-why[open]>summary{color:var(--ink,#1D2939)}body #kzs#kzs details.an-why>.an-note{margin:8px 0 0}'+
    '@media (hover:none) and (pointer:coarse) and (min-width:701px){body #kzs#kzs details.an-why>summary{min-height:var(--kz-touch,56px)}}@media (max-width:700px){body #kzs#kzs details.an-why>summary{min-height:var(--kz-touch,48px)}}';
    document.head.appendChild(st)}
  function fold(root){root.querySelectorAll('.an-card .an-note,.an-card+.an-note').forEach(function(n){if(n.closest('details.an-why'))return;
    var d=document.createElement('details');d.className='an-why';d.innerHTML='<summary>About this chart</summary>';n.parentNode.insertBefore(d,n);d.appendChild(n)})}
  var q=false;function run(){q=false;var b=document.getElementById('anb');if(b){css();fold(b)}}
  new MutationObserver(function(){if(!q){q=true;requestAnimationFrame(run)}}).observe(document.documentElement,{childList:true,subtree:true});
})();

/* v142 (28 Oct 2026, Roneel: "reduce text usage, use icons and colours to indicate warnings, like a red clock beside a
   late booking; the same design philosophy throughout"). One rule for every screen: a status is an icon in its colour,
   with the words kept for hover and screen readers. Late: amber clock up to 15 min, red clock after (allergies keep the
   red triangle, so the shape tells them apart). Needs a grill: amber grill. Request: amber bell. Arrived: green tick with
   the time. Confirmed: quiet tick. Cancelled and no-show: grey. One-time tips, the repeated greeting and "Tap a heading"
   lines are gone; Open all and Close all are icons; the phone More menu lists Kitchen once. */
(function(){
  var SV='<svg class="kz142-i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var P={clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',tick:'<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 4.9-5.1"/>',
    here:'<circle cx="9.5" cy="7.5" r="3.2"/><path d="M3.5 19.5c0-3.3 2.7-5.5 6-5.5 1.2 0 2.3.3 3.2.8"/><path d="M14.5 17l2.2 2.2 4.3-4.6"/>',
    bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.6H4.4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',x:'<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
    noshow:'<circle cx="9.5" cy="7.5" r="3.2"/><path d="M3.5 19.5c0-3.3 2.7-5.5 6-5.5 1.2 0 2.3.3 3.2.8"/><path d="M15.5 15l4.5 4.5M20 15l-4.5 4.5"/>',
    grill:'<path d="M3.5 9.5h17v6h-17z"/><path d="M7 15.5V20M17 15.5V20"/><path d="M8 4.5c-.8 1 .8 2-.1 3M12 4.5c-.8 1 .8 2-.1 3M16 4.5c-.8 1 .8 2-.1 3"/>',
    open:'<path d="M7 9.5l5 5 5-5"/><path d="M7 4.5l5 5 5-5" opacity=".45"/>',shut:'<path d="M7 14.5l5-5 5 5"/><path d="M7 19.5l5-5 5 5" opacity=".45"/>',
    list:'<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6.2 4.5 2 4.5 5"/>'};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function ic(n){return SV+P[n]+'</svg>'}
  function sr(t){return '<span class="kz110-sr">'+esc(t)+'</span>'}
  var LATE=/^(?:over\s+)?(?:(\d+)\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?\s*late\.?$/i;
  function lateMins(t){var m=LATE.exec(t);if(!m||(!m[1]&&!m[2]))return -1;return (+m[1]||0)*60+(+m[2]||0)}
  function short(n){var h=Math.floor(n/60),m=n%60;return h?h+'h'+(m?' '+m+'m':''):m+'m'}
  /* other layers add their own icon to some chips; keep one icon: theirs when present, ours otherwise */
  function mark(el,html,label,cls){var own=el.querySelector('svg:not(.kz142-i)');el.dataset.kz142=label;el.title=label;el.setAttribute('aria-label',label);
    var w=document.createElement('span');w.innerHTML=html;if(own){var mine=w.querySelector('.kz142-i');if(mine)mine.remove()}
    [].slice.call(el.childNodes).forEach(function(n){if(n!==own)el.removeChild(n)});while(w.firstChild)el.appendChild(w.firstChild);
    if(cls)cls.split(' ').forEach(function(c){c&&el.classList.add(c)})}
  function done(el){return el.dataset.kz142&&el.dataset.kz142===el.title&&el.querySelector('svg')&&!/[a-z]{4}/i.test([].slice.call(el.childNodes).filter(function(n){return n.nodeType===3}).map(function(n){return n.textContent}).join(''))}
  function run(){var m=document.getElementById('kzs');if(!m)return;
    /* late */
    m.querySelectorAll('.pill,.tag,small,.kz86-r2,.kz67-late,.rel,span').forEach(function(el){if(done(el)||el.childElementCount>1||el.closest('.kz142-late'))return;
      var t=(el.textContent||'').trim();if(t.length>24||!/late\.?$/i.test(t))return;var n=lateMins(t);if(n<0)return;
      el.classList.remove('kz142-amb','kz142-red');mark(el,ic('clock')+'<span class="kz142-t">'+short(n)+'</span>'+sr(t),t,'kz142-st kz142-late '+(n>15?'kz142-red':'kz142-amb'))});
    /* counts of late parties ("8 running late", "7 parties late") */
    m.querySelectorAll('em,b,.kz67-late').forEach(function(el){if(done(el)||el.childElementCount)return;var x=/^(\d+) (?:parties |party )?(?:running )?late$/i.exec((el.textContent||'').trim());if(!x)return;
      mark(el,ic('clock')+'<span class="kz142-t">'+x[1]+'</span>'+sr(el.textContent.trim()),el.textContent.trim(),'kz142-st kz142-red')});
    /* one icon per chip: if another layer added its own icon after ours, ours goes */
    m.querySelectorAll('.kz142-st').forEach(function(el){if(el.querySelectorAll('svg').length>1){var mine=el.querySelector('.kz142-i');if(mine)mine.remove()}});
    /* booking status pills */
    m.querySelectorAll('.pill[class*="st-"]').forEach(function(el){if(done(el))return;var t=(el.textContent||'').trim(),k=(/st-([a-z_]+)/.exec(el.className)||[])[1],tm=(/(\d{1,2}:\d{2}\s*[AP]M)/i.exec(t)||[])[1];
      var map={confirmed:['tick','kz142-ok'],arrived:['here','kz142-here'],request:['bell','kz142-amb'],cancelled:['x','kz142-mute'],declined:['x','kz142-mute'],completed:['tick','kz142-mute'],no_show:['noshow','kz142-amb']}[k];
      if(!map||(k==='request'&&t!=='Request'))return;mark(el,ic(map[0])+(tm?'<span class="kz142-t">'+esc(tm)+'</span>':'')+sr(t),t,'kz142-st '+map[1])});
    /* needs a grill */
    m.querySelectorAll('.kz67-ng').forEach(function(el){if(done(el)||(el.textContent||'').trim()!=='Needs a grill')return;mark(el,ic('grill')+sr('Needs a grill'),'Needs a grill','kz142-st kz142-amb')});
    m.querySelectorAll('.kz128-need').forEach(function(el){if(!el.title)el.title='Needs a grill';el.classList.add('kz142-need')});
    /* counts line in Bookings */
    m.querySelectorAll('p.small.muted').forEach(function(el){if(done(el))return;var x=/^Showing (\d+) bookings? · (\d+) guests?$/.exec((el.textContent||'').trim());if(!x)return;
      mark(el,ic('list')+'<b>'+x[1]+'</b>'+ic('people')+'<b>'+x[2]+'</b>'+sr(el.textContent),el.textContent.trim(),'kz142-cnt')});
    /* Open all / Close all as icons */
    m.querySelectorAll('[data-fall]').forEach(function(b){if(b.dataset.kz142)return;var o=b.dataset.fall==='1',l=o?'Open all':'Close all';b.dataset.kz142=l;b.title=l;b.setAttribute('aria-label',l);b.innerHTML=ic(o?'open':'shut');b.classList.add('kz142-ib')})}
  var q=false,root=document.getElementById('kzs')||document.body;
  new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){}})}).observe(root,{childList:true,subtree:true,characterData:true});
})();

/* v143 (28 Oct 2026, Roneel: "enterprise level; think like the person using it"). Every screen has the same header
   (title left, date and actions right) that stays in view when scrolling, under the phone and iPad top bar. Arrivals
   answers the host first: one status strip (arrived, late, next hour, to do, walk-in) and one row of icon filters, so
   the guest list starts near the top. */
(function(){
  var NS='http://www.w3.org/2000/svg';
  function svg(d){return '<svg class="kz143-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>'}
  var P={clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',flame:'<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3 2.2-4.6 3.4-7.4.5 1.5 1.3 2.4 2.2 2.9C12 7.7 13 5 15.2 3c-.3 3 1 4.6 2 6.3.8 1.4 1 2.6 1 3.9C18.2 18.3 15.6 21 12 21z"/>',
    bowl:'<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 19.5h6"/><path d="M14 4l-2 7M18 5l-3.5 6.5"/>',people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6.2 4.5 2 4.5 5"/>',
    grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'};
  function topbar(){var t=document.querySelector('#kzs header.top');var h=0;if(t){var r=t.getBoundingClientRect(),cs=getComputedStyle(t);if(r.height&&cs.display!=='none'&&(cs.position==='sticky'||cs.position==='fixed'))h=Math.round(r.bottom)}
    document.documentElement.style.setProperty('--kz143-top',h+'px')}
  function icons(m){if(!document.querySelector('#kzs.kz119-arr'))return;
    m.querySelectorAll('.splitbar [data-split]>span:first-child').forEach(function(sp){if(sp.parentNode.querySelector('svg'))return;var t=sp.textContent.trim();sp.innerHTML=svg(sp.parentNode.dataset.split==='tep'?P.flame:P.bowl)+'<span class="kz143-l">'+t+'</span>';sp.parentNode.title=t});
    m.querySelectorAll('[data-hpane]').forEach(function(b){if(b.querySelector('svg'))return;var t=b.textContent.trim();b.innerHTML=svg(b.dataset.hpane==='tables'?P.grid:P.people)+'<span class="kz143-l">'+t+'</span>';b.title=t;b.setAttribute('aria-label',t)})}
  function late(m){var cards=m.querySelector('#kz67');if(!cards)return;var rows=m.querySelectorAll('.arr-sec .arow.late'),n=rows.length,b=cards.querySelector('.kz143-late');
    if(!n){if(b)b.remove();return}
    var lbl=n+(n===1?' party late':' parties late');
    if(!b){b=document.createElement('button');b.type='button';b.className='kz67-card kz143-late';b.onclick=function(){var h=document.querySelector('#kzs .arr-h.late');if(h)h.scrollIntoView({behavior:'smooth',block:'start'})};
      var ring=cards.querySelector('.kz71-walk')||cards.firstChild;cards.insertBefore(b,ring)}
    if(b.dataset.n!==String(n)){b.dataset.n=n;b.setAttribute('aria-label',lbl);b.title=lbl;b.innerHTML='<span class="kz67-ic" aria-hidden="true">'+svg(P.clock)+'</span><span class="kz67-tx"><b class="kz67-t">'+n+'</b><span class="kz143-u">late</span></span>'}}
  function run(){topbar();var m=document.querySelector('#kzs main');if(!m)return;icons(m);late(m)}
  var q=false,root=document.getElementById('kzs')||document.body;
  new MutationObserver(function(){if(q)return;q=true;requestAnimationFrame(function(){q=false;try{run()}catch(e){}})}).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',function(){try{topbar()}catch(e){}});
})();
