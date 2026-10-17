/* Corner Café consent-first Meta Pixel proposal.
 * DRAFT ONLY. Replace existing Webflow site-wide MetaPixel (do not run both).
 * Staging-test privacy language, all third-party trackers, and browser network calls.
 */
(function () {
  'use strict';
  var path = location.pathname || '/';
  if (/^\/(cake-orders-staff|staff-cake-orders|reservations-hub|401)(\/|$)/.test(path)) return;
  var KEY = 'cc_marketing_consent_v1', PIXEL = '2200870637494171';
  var choice = null, loaded = false;
  try { choice = localStorage.getItem(KEY); } catch (_) {}
  if (choice !== 'accepted' && choice !== 'rejected') choice = null;

  function clearMetaCookies() {
    ['_fbp', '_fbc'].forEach(function (name) {
      var domains = [location.hostname, '.' + location.hostname, '.cornercafefiji.com', 'cornercafefiji.com'];
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/; domain=' + domain + '; SameSite=Lax';
      });
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
    });
  }
  function startPixel() {
    if (loaded || choice !== 'accepted') return;
    loaded = true;
    !function(f,b,e,v,n,t,s) {
      if (f.fbq) return;
      n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq=n; n.push=n; n.loaded=true; n.version='2.0'; n.queue=[];
      t=b.createElement(e); t.async=true; t.src=v;
      s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    if (typeof window.fbq === 'function') {
      window.fbq('init', PIXEL);
      window.fbq('track', 'PageView');
    }
  }
  function setChoice(v) {
    choice = v;
    try { localStorage.setItem(KEY, v); } catch (_) {}
    if (v === 'rejected') {
      clearMetaCookies();
      /* Scripts already loaded cannot be safely unloaded: reload to guarantee
         the opt-out state. This prevents further guest app fbq calls. */
      location.reload();
      return;
    }
    closePanel(); startPixel();
  }

  var panel, openButton;
  function closePanel() { if (panel) {panel.remove(); panel=null;} }
  function buildButton(label, action) {
    var btn=document.createElement('button');
    btn.type='button';btn.textContent=label;
    btn.style.cssText='padding:12px 16px;min-height:44px;border-radius:8px;border:1px solid #46603a;font:600 15px system-ui;cursor:pointer;';
    btn.style.background=action==='accepted'?'#46603a':'#fff';
    btn.style.color=action==='accepted'?'#fff':'#253124';
    btn.addEventListener('click',function(){setChoice(action);});
    return btn;
  }
  function showPanel() {
    if (panel) return;
    panel=document.createElement('section');
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Cookie preferences');
    panel.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;z-index:2147483647;max-width:720px;margin:auto;padding:20px;background:white;border:1px solid #d7d4ce;border-radius:12px;box-shadow:0 12px 45px #0003;color:#253124;font:15px/1.5 system-ui;';
    var title=document.createElement('h2');
    title.textContent='Your privacy choices';title.style.cssText='font:700 19px system-ui;margin:0 0 8px;';
    var p=document.createElement('p');
    p.textContent='We use essential features to run this website. With your permission, Meta marketing cookies help us understand how our promotions perform. You can decline optional tracking and still order cakes.';
    p.style.margin='0 0 12px';
    var policy=document.createElement('a');
    policy.href='/privacy-policy';policy.textContent='Read our privacy policy';
    var controls=document.createElement('div');
    controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;';
    controls.appendChild(buildButton('Reject optional','rejected'));
    controls.appendChild(buildButton('Accept marketing','accepted'));
    panel.append(title,p,policy,controls);
    document.body.appendChild(panel);
    controls.querySelector('button').focus();
  }
  function showSettingsLink() {
    if (document.getElementById('cc-cookie-settings')) return;
    openButton=document.createElement('button');
    openButton.id='cc-cookie-settings';openButton.type='button';
    openButton.textContent='Cookie settings';
    openButton.style.cssText='position:fixed;bottom:8px;right:8px;z-index:2147483646;font:12px system-ui;background:#fff;color:#253124;padding:6px 10px;border:1px solid #ccc;border-radius:6px;cursor:pointer;';
    openButton.addEventListener('click',showPanel);
    document.body.appendChild(openButton);
  }
  function initUI() {
    showSettingsLink();
    if (choice === 'accepted') startPixel();
    else if (choice === null) showPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initUI);
  else initUI();
})();
