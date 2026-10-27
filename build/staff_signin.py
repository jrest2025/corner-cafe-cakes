#!/usr/bin/env python3
"""Builds src/staff.signin.js: the Corner Cafe Service Hub sign-in in the same format as the live Marketing Central
sign-in (Hub 2.128.0). Approved by Roneel ("deploy", 27 Oct 2026 9:20 PM).

Espresso room lit from below, warm motes and steam rising, the Corner Cafe logo brushed in, SERVICE HUB, the white
card rising. The light follows the service by Fiji time (morning sunbeams, softer midday light, pendant lamps in the
evening) without naming it. Plays once per page load. The form, sign-in and Practice mode stay the app's own: this
add-on only moves the app's #ccs-login into the splash and dresses it. Marker __ccSignin20261027."""
import base64, json, pathlib, random
ROOT = pathlib.Path(__file__).resolve().parent.parent
LOGO = 'data:image/png;base64,' + base64.b64encode(pathlib.Path(
    '/tmp/claude-0/-home-claude/675d39a6-4b8c-526d-9651-43fc4f673f72/scratchpad/splash/logo-brown.png').read_bytes()).decode()
random.seed(7)
MOTES = ''.join('<i style="--x:%d%%;--d:%.1fs;--w:-%.1fs;--s:%dpx;--o:%.2f"></i>' % (
    random.randint(3, 97), random.uniform(9, 16), random.uniform(0, 14), random.choice([2, 3, 3, 4, 5]), random.uniform(.35, .8)) for _ in range(16))
STEAM = ('<svg class="ccsg-steam" viewBox="0 0 560 460" preserveAspectRatio="none" aria-hidden="true">'
         '<path d="M220 460c-32-64 42-96 10-160s32-108 0-180"/><path d="M280 460c-32-74 48-106 13-170s37-100 3-170"/>'
         '<path d="M340 460c-30-64 40-100 8-160s30-112-4-180"/></svg>')
CAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>'
EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'

P = 'html:not(#ccg0):not(#ccg1) body:not(#ccg2) #cc-staff.ccsg-on'
F = P + ' .ccsg-card #ccs-login'
css = f"""
@property --ccsgr{{syntax:'<percentage>';inherits:false;initial-value:130%}}
{P} .ccsg{{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px 48px;overflow:auto;isolation:isolate;background:#0E0907;color:#1D1712;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif}}
{P} .ccsg-bg{{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:radial-gradient(120% 70% at 50% 0%,#3B2A20 0%,#24180F 50%,#0E0907 100%);animation:ccsg-fade .7s ease-out both}}
{P} .ccsg[data-meal=dinner] .ccsg-bg{{background:radial-gradient(120% 70% at 50% 0%,#2E1F17 0%,#1A110C 50%,#0A0605 100%)}}
{P} .ccsg-glow{{position:absolute;left:50%;bottom:-38vh;width:150vmax;height:70vh;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(232,184,120,.24),rgba(190,130,70,.08) 55%,transparent 75%);filter:blur(8px);animation:ccsg-breathe 9s ease-in-out infinite alternate}}
{P} .ccsg[data-meal=breakfast] .ccsg-glow{{background:radial-gradient(closest-side,rgba(255,196,140,.26),rgba(230,150,90,.08) 55%,transparent 75%)}}
{P} .ccsg-motes{{position:absolute;inset:0}}
{P} .ccsg-motes>i{{position:absolute;left:var(--x);bottom:-12px;width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,#FFF1D6 0%,#D9B38C 60%,transparent 72%);box-shadow:0 0 4px rgba(232,190,130,.4);opacity:0;animation:ccsg-rise var(--d) linear var(--w) infinite}}
{P} .ccsg-rays{{position:absolute;left:-12vmax;top:-12vmax;width:120vmax;height:120vmax;opacity:0;background:repeating-conic-gradient(from 200deg at 0 0,rgba(255,224,176,.16) 0 2.5deg,transparent 2.5deg 8deg);-webkit-mask:radial-gradient(circle at 0 0,#000 0,rgba(0,0,0,.5) 35%,transparent 70%);mask:radial-gradient(circle at 0 0,#000 0,rgba(0,0,0,.5) 35%,transparent 70%);filter:blur(5px);animation:ccsg-raysin 2.4s ease-out .4s forwards,ccsg-sway 18s ease-in-out 2.8s infinite alternate}}
{P} .ccsg[data-meal=breakfast] .ccsg-rays{{--ro:.5}}
{P} .ccsg[data-meal=lunch] .ccsg-rays{{--ro:.35;left:auto;right:-12vmax;transform:scaleX(-1)}}
{P} .ccsg[data-meal=dinner] .ccsg-rays{{display:none}}
{P} .ccsg-lamps{{position:absolute;inset:0;opacity:0}}
{P} .ccsg[data-meal=dinner] .ccsg-lamps{{animation:ccsg-fade 2s ease-out .4s forwards}}
{P} .ccsg-lamps i{{position:absolute;top:-6vh;width:34vmax;height:34vmax;border-radius:50%;background:radial-gradient(closest-side,rgba(255,196,120,.16),rgba(255,170,90,.05) 55%,transparent 72%);animation:ccsg-lamp 6s ease-in-out infinite alternate}}
{P} .ccsg-lamps i:nth-child(1){{left:-6vmax}}{P} .ccsg-lamps i:nth-child(2){{right:-6vmax;animation-delay:-3s}}{P} .ccsg-lamps i:nth-child(3){{left:50%;top:-14vh;transform:translateX(-50%);width:26vmax;height:26vmax;animation-delay:-1.5s}}
{P} .ccsg-steam{{position:absolute;left:50%;bottom:40px;width:min(560px,92vw);height:52vh;transform:translateX(-50%)}}
{P} .ccsg-steam path{{fill:none;stroke:rgba(246,235,221,.13);stroke-width:2.4;stroke-linecap:round;filter:blur(1.4px);stroke-dasharray:70 360;animation:ccsg-steam 7.5s ease-in-out infinite}}
{P} .ccsg-steam path:nth-child(2){{animation-delay:-2.5s;stroke:rgba(246,235,221,.09)}}{P} .ccsg-steam path:nth-child(3){{animation-delay:-5s}}
{P} .ccsg-hero{{display:flex;flex-direction:column;align-items:center;gap:12px;margin:0 0 24px}}
{P} .ccsg-mark{{display:block;width:200px;aspect-ratio:300/109;background:#F6EBDD;-webkit-mask:url({LOGO}) center/contain no-repeat,linear-gradient(100deg,#000 calc(var(--ccsgr) - 30%),transparent var(--ccsgr));-webkit-mask-composite:source-in;mask:url({LOGO}) center/contain no-repeat,linear-gradient(100deg,#000 calc(var(--ccsgr) - 30%),transparent var(--ccsgr));mask-composite:intersect;animation:ccsg-brush 1.3s cubic-bezier(.55,.1,.25,1) .25s both}}
{P} .ccsg-tag{{font-size:15px;letter-spacing:.42em;text-transform:uppercase;font-weight:500;color:#D9B38C;padding-left:.42em;animation:ccsg-up .6s ease-out 1.15s both}}
{P} .ccsg-card{{position:relative;z-index:2;width:100%;max-width:400px;border-radius:20px;padding:28px 28px 22px;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06);animation:ccsg-card .7s cubic-bezier(.2,.8,.2,1) 1.2s both}}
{P} .ccsg.ccsg-done :is(.ccsg-bg,.ccsg-tag,.ccsg-card,.ccsg-mark){{animation:none!important}}{P} .ccsg.ccsg-done .ccsg-mark{{--ccsgr:130%}}
{F}{{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;gap:0!important;color:#1D1712!important}}
{F} .ccs-brand{{display:none!important}}
{F} .ccs-title{{font-size:26px!important;font-weight:600!important;line-height:1.2!important;color:#1D1712!important;margin:0 0 18px!important;text-align:left!important;font-family:inherit!important;letter-spacing:0!important}}
{F} .ccs-field{{position:relative!important;margin:0 0 14px!important}}
{F} .ccs-label{{display:block!important;font-size:14px!important;font-weight:600!important;color:#1D1712!important;margin:0 0 6px!important}}
{F} .ccs-input{{width:100%!important;height:52px!important;border:1px solid #E3D8CB!important;border-radius:12px!important;background:#fff!important;color:#1D1712!important;font-size:16px!important;padding:0 14px!important;box-shadow:none!important}}
{F} #ccs-pass{{padding-right:52px!important}}
{F} .ccs-input:focus{{border-color:#3B2A20!important;box-shadow:0 0 0 3px rgba(59,42,32,.16)!important;outline:0!important}}
{F} .ccsg-eye{{position:absolute;right:6px;bottom:6px;width:40px;height:40px;border:0;background:none;border-radius:8px;color:#6B5D50;cursor:pointer;display:grid;place-items:center;padding:0}}
{F} .ccsg-eye svg{{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}}
{F} .ccsg-caps{{margin:-8px 0 12px;font-size:13px;font-style:italic;color:#B54708}}
{F} .ccs-btn{{position:relative!important;overflow:hidden!important;width:100%!important;height:50px!important;min-height:50px!important;border-radius:12px!important;border:0!important;background:#3B2A20!important;color:#FFF7EC!important;font-size:16px!important;font-weight:600!important;margin:4px 0 0!important;transition:transform .15s ease,background-color .2s ease}}
{F} .ccs-btn:hover{{background:#4A3629!important}}{F} .ccs-btn:active{{transform:scale(.98)}}
{F}.ccsg-busy .ccs-btn::after{{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(217,179,140,.45) 50%,transparent 70%);animation:ccsg-shine 1.1s linear infinite}}
{F} > .ccs-hint{{margin:14px 0 0!important;text-align:center!important;font-size:13px!important;font-style:italic!important;color:#6B5D50!important}}
{F} .ccs-err{{margin:0 0 12px!important}}
{F} .ccp-in{{margin:16px 0 0!important;padding:14px 0 0!important;border-top:1px solid #E3D8CB!important;text-align:left!important}}
{F} .ccp-in > p{{display:none!important}}
{F} .ccp-in .ccp-go{{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;min-height:48px!important;height:auto!important;padding:4px 0!important;border:0!important;background:none!important;color:#1D1712!important;text-align:left!important;box-shadow:none!important;cursor:pointer}}
{F} .ccsg-pi{{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#F4ECE3;color:#3B2A20}}
{F} .ccsg-pi svg{{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}}
{F} .ccsg-pt b{{display:block;font-size:15px;font-weight:600;color:#1D1712}}{F} .ccsg-pt small{{display:block;font-size:13px;font-style:italic;font-weight:400;color:#6B5D50}}
@keyframes ccsg-brush{{from{{--ccsgr:0%;opacity:.3}}12%{{opacity:1}}to{{--ccsgr:130%;opacity:1}}}}
@keyframes ccsg-fade{{from{{opacity:0}}to{{opacity:1}}}}
@keyframes ccsg-up{{from{{opacity:0;transform:translateY(8px)}}to{{opacity:1;transform:none}}}}
@keyframes ccsg-card{{from{{opacity:0;transform:translateY(26px) scale(.985)}}to{{opacity:1;transform:none}}}}
@keyframes ccsg-rise{{0%{{transform:translate(0,0);opacity:0}}10%{{opacity:var(--o)}}70%{{opacity:calc(var(--o)*.6)}}100%{{transform:translate(18px,-82vh);opacity:0}}}}
@keyframes ccsg-breathe{{from{{opacity:.75;transform:translateX(-50%) scale(1)}}to{{opacity:1;transform:translateX(-50%) scale(1.06)}}}}
@keyframes ccsg-shine{{from{{transform:translateX(-100%)}}to{{transform:translateX(100%)}}}}
@keyframes ccsg-raysin{{to{{opacity:var(--ro,1)}}}}
@keyframes ccsg-sway{{from{{rotate:0deg}}to{{rotate:4deg}}}}
@keyframes ccsg-lamp{{from{{opacity:.75}}to{{opacity:1}}}}
@keyframes ccsg-steam{{0%{{stroke-dashoffset:430;opacity:0}}20%{{opacity:1}}100%{{stroke-dashoffset:0;opacity:0}}}}
@media (max-width:600px){{{P} .ccsg{{justify-content:flex-start;padding-top:max(48px,8vh)}}{P} .ccsg-mark{{width:160px}}{P} .ccsg-card{{padding:22px 20px 18px}}{P} .ccsg-steam{{height:40vh}}}}
@media (min-width:1024px) and (min-height:700px){{{P} .ccsg-mark{{width:224px}}}}
@media (prefers-reduced-motion:reduce){{{P} .ccsg *,{P} .ccsg-bg{{animation:none!important}}{P} .ccsg-motes,{P} .ccsg-steam{{display:none}}{P} .ccsg-mark{{--ccsgr:130%}}{P} .ccsg[data-meal=breakfast] .ccsg-rays{{opacity:.5}}{P} .ccsg[data-meal=lunch] .ccsg-rays{{opacity:.35}}{P} .ccsg[data-meal=dinner] .ccsg-lamps{{opacity:1}}}}
"""

js = """/* Corner Cafe Service Hub: sign-in splash in the Marketing Central format (27 Oct 2026). Marker __ccSignin20261027.
 * Built by build/staff_signin.py. Moves the app's own #ccs-login into the splash and dresses it; the form, sign-in
 * and Practice mode keep working exactly as before. When the app replaces the form (signed in), the splash goes. */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccSignin20261027) return;
  win.__ccSignin20261027 = true;
  var CSS = %s, BG = %s, EYE = %s, EYE_OFF = %s, CAP = %s;
  var played = false, shell = null, lastEmail = '';
  function meal() {
    var h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Fiji', hour: 'numeric', hour12: false }).format(new Date()));
    return h < 11 ? 'breakfast' : h < 17 ? 'lunch' : 'dinner';
  }
  function styles() { if (doc.getElementById('ccsg-style')) return; var s = doc.createElement('style'); s.id = 'ccsg-style'; s.textContent = CSS; doc.head.appendChild(s); }
  function wrap() {
    var root = doc.getElementById('cc-staff'), form = doc.getElementById('ccs-login');
    if (!root) return;
    if (!form) { if (shell) { shell.remove(); shell = null; } root.classList.remove('ccsg-on'); return; }
    styles();
    if (!shell || !shell.isConnected) {
      shell = doc.createElement('div');
      shell.className = 'ccsg' + (played ? ' ccsg-done' : '');
      shell.setAttribute('data-meal', meal());
      shell.innerHTML = BG + '<div class="ccsg-hero"><span class="ccsg-mark" role="img" aria-label="Corner Café"></span><span class="ccsg-tag">Service Hub</span></div><div class="ccsg-card"></div>';
      root.appendChild(shell); root.classList.add('ccsg-on'); played = true;
      [0, 120, 400].forEach(function (ms) { setTimeout(function () { if (shell) shell.scrollTop = 0; }, ms); });
    }
    var card = shell.querySelector('.ccsg-card');
    if (form.parentNode !== card) card.appendChild(form);
    dress(form);
  }
  function dress(form) {
    var t = form.querySelector('.ccs-title'); if (t && t.textContent !== 'Sign in') t.textContent = 'Sign in';
    var em = form.querySelector('#ccs-email'); if (em && !em.value && lastEmail && !em.dataset.ccsg) { em.dataset.ccsg = '1'; em.value = lastEmail; }
    var pw = form.querySelector('#ccs-pass');
    if (pw && !form.querySelector('.ccsg-eye')) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccsg-eye'; b.setAttribute('aria-label', 'Show password'); b.innerHTML = EYE;
      b.addEventListener('click', function () { var show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.innerHTML = show ? EYE_OFF : EYE; pw.focus(); });
      pw.parentNode.appendChild(b);
      var c = doc.createElement('p'); c.className = 'ccsg-caps'; c.hidden = true; c.textContent = 'Caps Lock is on.'; pw.parentNode.insertAdjacentElement('afterend', c);
      pw.addEventListener('keyup', function (e) { if (e.getModifierState) c.hidden = !e.getModifierState('CapsLock'); });
    }
    var hint = form.querySelector(':scope > .ccs-hint'); if (hint && /Ask your manager to reset it/.test(hint.textContent)) hint.textContent = 'Forgotten your password? Ask your manager.';
    var go = form.querySelector('.ccp-go');
    if (go && !go.querySelector('.ccsg-pi')) go.innerHTML = '<span class="ccsg-pi">' + CAP + '</span><span class="ccsg-pt"><b>Practice mode</b><small>Pretend orders. Nothing is real.</small></span>';
  }
  doc.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'ccs-login') return;
    var em = doc.getElementById('ccs-email'); if (em && em.value.trim()) lastEmail = em.value.trim();
    e.target.classList.add('ccsg-busy'); setTimeout(function () { if (e.target) e.target.classList.remove('ccsg-busy'); }, 4000);
  }, true);
  var queued = false;
  function schedule() { if (queued) return; queued = true; setTimeout(function () { queued = false; try { wrap(); } catch (e) { if (win.console) console.warn('[Sign-in]', e); } }, 0); }
  function start() { new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
""" % (json.dumps(css.strip(), ensure_ascii=False), json.dumps('<div class="ccsg-bg" aria-hidden="true"><div class="ccsg-rays"></div><div class="ccsg-lamps"><i></i><i></i><i></i></div><div class="ccsg-glow"></div><div class="ccsg-motes">' + MOTES + '</div>' + STEAM + '</div>'),
       json.dumps(EYE), json.dumps(EYE_OFF), json.dumps(CAP))
import os
if os.environ.get('TWOSTEP') == '1':   # Release E (parked 28 Oct 2026): build with TWOSTEP=1 to include two-step sign-in
    js += '\n' + (ROOT / 'build/twostep.js').read_text()
(ROOT / 'src/staff.signin.js').write_text(js)
print(len(js))
