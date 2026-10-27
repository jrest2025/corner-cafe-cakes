"""Service Hub welcome screen (27 Oct 2026, espresso look, approved with "deploy"). Writes src/staff.welcome.js.

An add-on, loaded with the other order tools. It wraps the app's own sign-in form (#ccs-login) in the welcome layout:
a counter scene that draws itself, light that follows the time of day in Fiji, a greeting, and the form on the right
(a sheet on phones). The form, its ids, the sign-in call, error messages and Practice mode stay the app's own.
Extras: show password, Caps Lock note, the last email used on this device filled in ("Welcome back."), and a short
warm fade into the app after signing in. Nothing else in the app changes.
Usage: python3 build/staff_welcome.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SP = Path('/tmp/claude-0/-home-claude/675d39a6-4b8c-526d-9651-43fc4f673f72/scratchpad/splash')
LOGO = (SP / 'logo-brown.b64').read_text().strip()
SCENE = (SP / 'scene.svg').read_text().strip().replace('class="scene"', 'class="ccw-scene"')
for a, b in [('class="ln ', 'class="ccw-ln '), ('class="glint"', 'class="ccw-glint"'), ('class="fill"', 'class="ccw-fill"'), ('class="steam"', 'class="ccw-steam"'), ('id="cupIn"', 'id="ccwCup"'), ('url(#cupIn)', 'url(#ccwCup)'), (' acc ', ' ccw-acc '), (' olive ', ' ccw-olive '), (' glass ', ' ccw-glass '), (' draw"', ' ccw-draw"')]:
    SCENE = SCENE.replace(a, b)

P = 'html:not(#ccw0):not(#ccw1) body:not(#ccw2) #cc-staff.ccw-on'
CSS = '''
@import url("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap");
P{--w-bg:#2A1F19;--w-panel:#231A15;--w-field:#2E231D;--w-ink:#F4EBDF;--w-esp:#F1E4D2;--w-muted:#C2B2A2;--w-faint:#A39383;--w-olive:#7E9E69;--w-olive-d:#93B37D;--w-sage:#2F3A28;--w-sage-line:#4A5E3E;--w-line:#3E3029;--w-line-2:#4C3B31;--w-caramel:#E0AE72;--w-glass:#8F7C69;--w-coffee:#C79A72;--w-warn-bg:#3A221B;--w-warn:#F3B39A;--w-light:rgba(232,165,96,.28)}
P .ccw{position:fixed;inset:0;z-index:40;display:grid;grid-template-columns:minmax(380px,52%) 1fr;background:var(--w-bg);color:var(--w-ink);overflow:auto;-webkit-font-smoothing:antialiased}
P .ccw-stage{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:72px 24px 48px;min-height:100%}
P .ccw-light{position:absolute;inset:-10%;z-index:-2;pointer-events:none;background:radial-gradient(55% 45% at var(--lx,30%) 22%,var(--w-light),transparent 70%)}
P .ccw-shaft{position:absolute;z-index:-1;top:-20%;left:var(--sx,12%);width:42%;height:140%;pointer-events:none;transform:rotate(var(--sr,18deg));background:linear-gradient(90deg,transparent,rgba(232,165,96,.16) 45%,transparent);filter:blur(18px);animation:ccw-drift 14s ease-in-out infinite alternate}
P .ccw-logo{width:184px;max-width:60vw;height:auto;display:block;filter:brightness(0) invert(.93) sepia(.25)}
P .ccw-hub{margin-top:8px;font-size:11px;letter-spacing:.42em;padding-left:.42em;color:var(--w-muted);font-weight:500}
P .ccw-scene{width:min(420px,88%);height:auto;margin:26px auto 14px;overflow:visible}
P .ccw-ln{fill:none;stroke:var(--w-esp);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
P .ccw-acc{stroke:var(--w-caramel)} P .ccw-olive{stroke:var(--w-olive)} P .ccw-glass{stroke:var(--w-glass);stroke-width:1.6}
P .ccw-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:ccw-draw 1.5s cubic-bezier(.22,.8,.24,1) forwards;animation-delay:var(--d,0s)}
P .ccw-steam path{fill:none;stroke:var(--w-caramel);stroke-width:1.8;stroke-linecap:round;opacity:0;animation:ccw-steam 3.8s ease-in-out infinite;animation-delay:var(--d)}
P .ccw-glint{fill:none;stroke:var(--w-esp);stroke-width:3;stroke-linecap:round;opacity:0;animation:ccw-glint 7s ease-in-out 2.6s infinite}
P .ccw-fill{fill:var(--w-coffee);transform:translateY(32px);transition:transform 1.1s cubic-bezier(.22,.8,.24,1)}
P .ccw.ccw-done .ccw-fill{transform:none}
P .ccw-greet{font-family:"Fraunces",Georgia,"Times New Roman",serif!important;font-weight:400!important;font-size:clamp(30px,3.1vw,44px)!important;line-height:1.12!important;letter-spacing:-.01em;color:var(--w-esp)!important;margin:0!important;text-wrap:balance}
P .ccw-greet em{font-style:italic;color:var(--w-olive)}
P .ccw-when{margin-top:12px;font-size:15px;color:var(--w-muted);font-variant-numeric:tabular-nums}
P .ccw-foot{position:absolute;left:0;right:0;bottom:18px;font-size:12.5px;color:var(--w-faint)}
P .ccw-side{display:grid;place-items:center;background:var(--w-panel);border-left:1px solid var(--w-line);padding:72px 32px 48px}
P .ccw-side #ccs-login{max-width:400px!important;width:100%!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;color:var(--w-ink)!important;display:flex!important;flex-direction:column}
P #ccs-login .ccs-brand{display:none!important}
P #ccs-login .ccs-title{font-family:"Fraunces",Georgia,serif!important;font-weight:500!important;font-size:30px!important;color:var(--w-esp)!important;margin:0!important}
P #ccs-login .ccw-lead{margin:6px 0 24px;color:var(--w-muted);font-size:16px}
P #ccs-login .ccs-field{position:relative;margin:0 0 14px!important}
P #ccs-login .ccs-label{color:var(--w-muted)!important;font-weight:500!important;font-size:14px!important;margin:0 0 6px!important}
P #ccs-login .ccs-input{height:56px!important;border:1px solid var(--w-line-2)!important;border-radius:14px!important;background:var(--w-field)!important;color:var(--w-ink)!important;font-size:16px!important;padding:0 52px 0 16px!important;box-shadow:none!important}
P #ccs-login .ccs-input:focus{border-color:var(--w-olive)!important;box-shadow:0 0 0 4px rgba(126,158,105,.22)!important;outline:none!important}
P #ccs-login .ccw-eye{position:absolute;right:6px;bottom:6px;width:44px;height:44px;border:0;border-radius:10px;background:none;color:var(--w-faint);cursor:pointer;display:grid;place-items:center}
P #ccs-login .ccw-eye svg,P #ccs-login .ccp-go svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
P #ccs-login .ccw-caps{margin:-6px 0 12px;font-size:13.5px;font-style:italic;color:var(--w-warn)}
P #ccs-login button[type="submit"]{height:56px!important;border:0!important;border-radius:14px!important;background:var(--w-olive)!important;color:#17200F!important;font-size:17px!important;font-weight:600!important;box-shadow:0 6px 16px rgba(126,158,105,.25)!important;margin-top:4px!important}
P #ccs-login button[type="submit"]:hover{background:var(--w-olive-d)!important}
P #ccs-login .ccs-err{margin:0 0 14px!important;padding:10px 12px!important;border-radius:12px!important;background:var(--w-warn-bg)!important;color:var(--w-warn)!important;border:1px solid #6A3A2B!important;font-size:14px!important}
P #ccs-login > .ccs-hint{margin:14px 0 0!important;font-size:14px!important;font-style:italic;color:var(--w-muted)!important}
P #ccs-login .ccp-in{margin-top:26px!important;padding:0!important;border:0!important;background:none!important;text-align:left!important}
P #ccs-login .ccp-in p{display:flex;align-items:center;gap:12px;margin:0 0 14px!important;color:var(--w-faint)!important;font-size:13px!important}
P #ccs-login .ccp-in p::before,P #ccs-login .ccp-in p::after{content:"";flex:1;height:1px;background:var(--w-line)}
P #ccs-login .ccp-in p span{display:none}
P #ccs-login .ccp-go{height:auto!important;min-height:64px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;padding:12px 14px!important;border:1px solid var(--w-sage-line)!important;border-radius:14px!important;background:var(--w-sage)!important;color:var(--w-olive-d)!important;text-align:left!important}
P #ccs-login .ccp-go span{font-weight:600;font-size:16px}
P #ccs-login .ccp-go small{display:block;font-weight:400;font-size:13.5px;color:var(--w-muted)}
P .ccw-curtain{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:var(--w-bg);opacity:0;pointer-events:none;transition:opacity .5s ease}
P .ccw-curtain.on{opacity:1}
P .ccw-curtain p{font-family:"Fraunces",Georgia,serif;font-size:26px;color:var(--w-esp);margin:0;text-align:center}
P .ccw-curtain small{display:block;margin-top:8px;font-size:14px;color:var(--w-muted);font-family:inherit}
@media (max-width:759px){
P .ccw{grid-template-columns:1fr;grid-template-rows:max-content 1fr}
P .ccw-stage{padding:calc(env(safe-area-inset-top,0px) + 56px) 16px 56px;min-height:0}
P .ccw-logo{width:148px} P .ccw-scene{width:min(320px,92%);margin:18px auto 8px} P .ccw-greet{font-size:28px!important} P .ccw-foot{display:none}
P .ccw-side{place-items:start center;margin-top:-28px;border-radius:24px 24px 0 0;border-left:0;position:relative;z-index:2;box-shadow:0 -8px 28px rgba(0,0,0,.3);padding:28px 16px calc(env(safe-area-inset-bottom,0px) + 24px)}
P #ccs-login .ccs-title{font-size:26px!important}
}
@media (min-width:760px) and (max-width:1023px) and (orientation:portrait){
P .ccw{grid-template-columns:1fr;grid-template-rows:max-content 1fr} P .ccw-stage{padding:80px 48px 48px;min-height:0} P .ccw-scene{width:min(400px,70%)}
P .ccw-side{border-left:0;border-top:1px solid var(--w-line);padding:48px;place-items:start center} P .ccw-side #ccs-login{max-width:460px!important} P .ccw-foot{position:static;margin-top:20px}
}
@keyframes ccw-draw{to{stroke-dashoffset:0}}
@keyframes ccw-steam{0%{opacity:0;transform:translateY(8px)}25%{opacity:.85}70%{opacity:.35}100%{opacity:0;transform:translateY(-16px)}}
@keyframes ccw-glint{0%,82%,100%{opacity:0}88%{opacity:.6}94%{opacity:0}}
@keyframes ccw-drift{from{transform:translateX(-4%) rotate(var(--sr,18deg))}to{transform:translateX(6%) rotate(var(--sr,18deg))}}
@media (prefers-reduced-motion:reduce){P *{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important} P .ccw-draw{stroke-dashoffset:0}}
'''.replace('P ', P + ' ').replace('P{', P + '{').strip()

JS = r'''/* Corner Café Service Hub: welcome screen (27 Oct 2026). Marker __ccWelcome20261027.
 * Wraps the app's own sign-in form in the espresso welcome layout; the form, sign-in and Practice mode stay the app's own. */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccWelcome20261027) return;
  win.__ccWelcome20261027 = true;
  var TZ = 'Pacific/Fiji', KEY = 'cc-welcome-last-email';
  var LOGO = 'data:image/png;base64,__LOGO__';
  var SCENE = __SCENE__;
  var CSS = __CSS__;
  var LINES = { morning: ['Good morning', 'Ovens on. Coffee’s on.'], afternoon: ['Good afternoon', 'Let’s make it sweet.'], evening: ['Good evening', 'Last pickups, then home.'] };
  var LIGHT = { morning: ['22%', '8%', '14deg'], afternoon: ['62%', '34%', '22deg'], evening: ['80%', '52%', '30deg'] };
  var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function part() { var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date())); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
  function stamp() { var d = new Date(); return d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }); }
  function styles() { if (doc.getElementById('ccw-style')) return; var s = doc.createElement('style'); s.id = 'ccw-style'; s.textContent = CSS; doc.head.appendChild(s); }
  var submitted = false, shell = null, timer = null;
  function wrap() {
    var root = doc.getElementById('cc-staff'), form = doc.getElementById('ccs-login');
    if (!root) return;
    if (!form) { if (root.classList.contains('ccw-on')) leave(root); return; }
    styles();
    if (!shell || !shell.isConnected) {
      var p = part(), L = LIGHT[p], back = !!get(KEY);
      shell = doc.createElement('div'); shell.className = 'ccw';
      shell.innerHTML = '<section class="ccw-stage" style="--lx:' + L[0] + ';--sx:' + L[1] + ';--sr:' + L[2] + '" aria-label="Corner Café Service Hub"><div class="ccw-light" aria-hidden="true"></div><div class="ccw-shaft" aria-hidden="true"></div>' +
        '<img class="ccw-logo" src="' + LOGO + '" alt="Corner Café"><div class="ccw-hub">SERVICE HUB</div>' + SCENE +
        '<h2 class="ccw-greet">' + (back ? 'Welcome back.' : LINES[p][0] + '.') + '<br><em>' + LINES[p][1] + '</em></h2><div class="ccw-when">' + stamp() + '</div>' +
        '<div class="ccw-foot">Corner Café · Nadi · A Jack’s Restaurants café</div></section><section class="ccw-side"></section>';
      root.appendChild(shell); root.classList.add('ccw-on');
      // open at the top (the app focuses the email field, which would scroll the phone past the greeting)
      [0, 120, 400].forEach(function (ms) { setTimeout(function () { if (shell) shell.scrollTop = 0; }, ms); });
      clearInterval(timer); timer = setInterval(function () { var w = shell && shell.querySelector('.ccw-when'); if (w) w.textContent = stamp(); }, 30000);
    }
    var side = shell.querySelector('.ccw-side');
    if (form.parentNode !== side) side.appendChild(form);
    dress(form);
  }
  function dress(form) {
    var t = form.querySelector('.ccs-title'); if (t && t.textContent !== 'Sign in') t.textContent = 'Sign in';
    if (t && !form.querySelector('.ccw-lead')) { var l = doc.createElement('p'); l.className = 'ccw-lead'; l.textContent = 'Use your staff email and password.'; t.insertAdjacentElement('afterend', l); }
    var em = form.querySelector('#ccs-email'); if (em && !em.value && !em.dataset.ccw) { em.dataset.ccw = '1'; var last = get(KEY); if (last) em.value = last; }
    var pw = form.querySelector('#ccs-pass');
    if (pw && !form.querySelector('.ccw-eye')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccw-eye'; b.setAttribute('aria-label', 'Show password'); b.innerHTML = EYE;
      b.addEventListener('click', function () { pw.type = pw.type === 'password' ? 'text' : 'password'; b.setAttribute('aria-label', pw.type === 'password' ? 'Show password' : 'Hide password'); pw.focus(); });
      pw.parentNode.appendChild(b);
      var c = doc.createElement('p'); c.className = 'ccw-caps'; c.hidden = true; c.textContent = 'Caps Lock is on.'; pw.parentNode.insertAdjacentElement('afterend', c);
      pw.addEventListener('keyup', function (e) { if (e.getModifierState) c.hidden = !e.getModifierState('CapsLock'); });
      if (em && em.value) setTimeout(function () { try { pw.focus({ preventScroll: true }); } catch (e) {} }, 60);
    }
    var hint = form.querySelector(':scope > .ccs-hint'); if (hint && /Ask your manager to reset it/.test(hint.textContent)) hint.textContent = 'Forgotten your password? Ask your manager.';
    var go = form.querySelector('.ccp-go'); if (go && !go.querySelector('small')) { var sp = go.querySelector('span'); if (sp) sp.innerHTML = 'Practice mode<small>Try it on pretend orders. Nothing is real.</small>'; }
    var pin = form.querySelector('.ccp-in > p'); if (pin && pin.textContent !== 'New here?') pin.textContent = 'New here?';
  }
  function leave(root) {
    root.classList.remove('ccw-on'); clearInterval(timer);
    var s = shell; shell = null;
    if (!s) return;
    if (submitted) {
      // signed in: the cup fills, then a short warm fade into the app
      submitted = false; s.classList.add('ccw-done');
      var c = doc.createElement('div'); c.className = 'ccw-curtain on'; c.innerHTML = '<p>Opening Today…<small>Coffee’s poured.</small></p>';
      root.classList.add('ccw-on'); root.appendChild(c);
      setTimeout(function () { s.remove(); c.classList.remove('on'); }, 700);
      setTimeout(function () { c.remove(); if (!doc.getElementById('ccs-login')) root.classList.remove('ccw-on'); }, 1300);
    } else s.remove();
  }
  doc.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'ccs-login') return;
    submitted = true; var em = doc.getElementById('ccs-email'); if (em && em.value.trim()) put(KEY, em.value.trim());
  }, true);
  var queued = false;
  function schedule() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { wrap(); } catch (e) { if (win.console) console.warn('[Welcome screen]', e); } }, 0); }
  function start() { var mo = new MutationObserver(schedule); mo.observe(doc.body, { childList: true, subtree: true }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
'''
out = JS.replace('__LOGO__', LOGO).replace('__SCENE__', json.dumps(SCENE)).replace('__CSS__', json.dumps(CSS))
assert '</script' not in out.lower()
(ROOT / 'src/staff.welcome.js').write_text(out)
print(len(out))
