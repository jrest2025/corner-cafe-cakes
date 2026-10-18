/* Corner Cafe Cake Heartbeat: isolated bridge for the CURRENT hosted staff bundle.
 * It reads staff-authorized dashboard_register data and mounts only when the
 * existing Analytics Overview is visible. The older native-source integration
 * can be used when a full source rebuild becomes the release path again.
 */
(function () {
  'use strict';
  if (window.__ccCakeHeartbeatBridge) return;
  window.__ccCakeHeartbeatBridge = true;

  var root = document.getElementById('cc-staff');
  if (!root || !window.supabase || !window.supabase.createClient) return;
  var sb = window.supabase.createClient(
    'https://ilbrfwxblhidtlsjgxlh.supabase.co',
    'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E',
    { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } }
  );
  var TZ = 'Pacific/Fiji', WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var DX = { data: null, loading: false, error: '', drills: {} };
  var S = { tab: 'other' };
  var mounting = false, scheduled = false, tick = 0;
  function hbScrollToDay(day, instant) {
    var pane=root.querySelector('[data-hb-scroll]'); if(!pane)return;
    var base=addDays(today(),-HB.daysBehind),delta=daysBetween(base,day);
    pane.scrollTo({left:Math.max(0,delta*98-pane.clientWidth/2+49),behavior:instant?'instant':'smooth'});
  }
  function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function addDays(iso, n) {
    var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10);
  }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  }
  function nice(d, long) {
    if (!d) return '';
    return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB',
      long ? {weekday:'long',day:'numeric',month:'long',timeZone:'UTC'} :
             {day:'numeric',month:'short',timeZone:'UTC'});
  }
  function stamp(d) { try {return new Date(d).toLocaleString('en-GB',{timeZone:TZ,day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});}catch(e){return '';} }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function dxKey(payload) {
    var k = 'hb' + Object.keys(DX.drills).length;
    DX.drills[k] = payload;
    return k;
  }
  function isOverview() {
    // Avoid any injection in orders, customer CRM, calendar or other Analytics modules.
    var card = root.querySelector('.dx-ov');
    if (!card || !root.contains(card)) return false;
    var heading = root.querySelector('.ccs-main .ccs-title');
    return !!(heading && heading.textContent.trim() === 'Analytics');
  }
  function message(txt) {
    return '<div class="hb-error" role="status">' + esc(txt) +
      '<button type="button" data-act="dx-hb-retry">Retry</button></div>';
  }
  function view() {
    if (mounting || !isOverview()) return;
    var target = root.querySelector('.dx-ov');
    if (!target || !target.parentNode) return;
    mounting = true;
    try {
      var mount = root.querySelector('#cc-heartbeat');
      if (!mount) {
        mount = document.createElement('div');
        mount.id = 'cc-heartbeat';
        target.parentNode.insertBefore(mount, target);
      }
      DX.drills = {};
      var existingScroll=root.querySelector('[data-hb-scroll]');
      if(existingScroll)HB.railScroll=existingScroll.scrollLeft;
      mount.innerHTML = DX.error ? message(DX.error) : DX.data ? hbView() :
        '<div class="hb-loading" role="status">Loading Cake Heartbeat…</div>';
      mount.classList.toggle('hb-m-ready',!!DX.data&&!DX.error);
      var pane=root.querySelector('[data-hb-scroll]');
      if(pane){if(HB.railScroll!=null)pane.scrollLeft=HB.railScroll;else hbScrollToDay(HB.selected||today(),true);}
    } finally { mounting = false; }
  }
  function dashLoad(force) {
    if (DX.loading || (!force && DX.data)) return;
    DX.loading = true; DX.error = '';
    sb.rpc('dashboard_register').then(function (r) {
      if (r.error || !r.data || !r.data.ok || !Array.isArray(r.data.orders)) {
        throw new Error('Could not load the cake register.');
      }
      DX.data = r.data; DX.error = '';
    }).catch(function () {
      DX.error = 'Cake Heartbeat is temporarily unavailable. The rest of the CRM is unaffected.';
    }).then(function () {
      DX.loading = false; if (isOverview()) view();
    });
  }

  // Inserted at build time: the shared heartbeat module functions use the
  // bridge variables and the existing Supabase register format.
  /*@HEARTBEAT_MODULE@*/

  function tickObserver() {
    if (scheduled || mounting) return;
    scheduled = true;
    Promise.resolve().then(function () {
      scheduled = false;
      var visible = isOverview();
      S.tab = visible ? 'dash' : 'other';
      if (!visible) return;
      if (!DX.data && !DX.loading && !DX.error) dashLoad(false);
      if (!root.querySelector('#cc-heartbeat')) view();
      if (!tick) { tick = 1; hbStart(); }
    });
  }
  var observer = new MutationObserver(tickObserver);
  observer.observe(root,{childList:true,subtree:true});
  root.addEventListener('click',function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#cc-heartbeat [data-act]') : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var a = b.getAttribute('data-act'), v = b.getAttribute('data-v');
    if (a === 'dx-hb-prev' || a === 'dx-hb-next') {
      var p=root.querySelector('[data-hb-scroll]');
      if(p)p.scrollBy({left:a === 'dx-hb-prev'?-686:686,behavior:'smooth'});
    }
    else if (a === 'dx-hb-today') { HB.selected=today(); HB.railScroll=null; view(); hbScrollToDay(today(),false); }
    else if (a === 'dx-hb-day') { HB.selected=v; view(); }
    else if (a === 'dx-hb-metric' && ['pickup_cakes','orders','cakes','value','sales'].indexOf(v)>-1) { HB.metric=v; view(); }
    else if (a === 'dx-hb-period' && ['7','30','90'].indexOf(v)>-1) { HB.period=Number(v); view(); }
    else if (a === 'dx-hb-mode' && ['daily','cumulative'].indexOf(v)>-1) { HB.mode=v; view(); }
    else if (a === 'dx-hb-retry') dashLoad(true);
    else if (a === 'dx-drill') {
      var d = DX.drills[v];
      if (!d || !Array.isArray(d.l)) return;
      var host = root.querySelector('#cc-heartbeat'), old = host && host.querySelector('.hb-detail');
      if (old) old.remove();
      if (!host) return;
      var panel = document.createElement('section'); panel.className = 'hb-detail';
      panel.setAttribute('aria-label','Pickup orders');
      panel.innerHTML = '<div class="hb-detail-head"><h3>' + esc(d.t) + '</h3><button type="button" data-act="dx-hb-close" aria-label="Close pickup details">×</button></div>' +
        '<ul>' + d.l.slice(0,80).map(function (o) {
          return '<li><b>' + esc(o.r || 'Cake order') + '</b><span>' +
            esc(o.pt ? String(o.pt).slice(0,5) : 'Time not recorded') + '</span></li>';
        }).join('') + '</ul>';
      host.appendChild(panel);
    } else if (a === 'dx-hb-close') {
      var panel = root.querySelector('#cc-heartbeat .hb-detail');
      if (panel) panel.remove();
    }
  }, true);
  tickObserver();
})();
