// Corner Café Service Hub login gate page (central.cornercafefiji.com). Same page as the Kazumi gate, in Corner Café's colours.
// Shown by middleware.js to anyone who has not entered the team password on this device in the last 30 days.
// Plain HTML and CSS, no scripts from other sites. Sizes follow the Jack's Restaurants touch-friendly standard
// (phones 18/17/16 px text, 52 px inputs and buttons; tablets 20/18/17 px text, 56 px inputs and buttons).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function gatePage({ error = '', next = '/', notReady = false } = {}) {
  const message = notReady
    ? '<p class="msg" role="alert">This page is not set up yet. Ask Roneel to add the team password in Vercel.</p>'
    : error
      ? `<p class="msg" role="alert">${esc(error)}</p>`
      : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light">
<title>Corner Café Service Hub</title>
<link rel="icon" href="/cc-logo.png" type="image/png">
<style>
@font-face{font-family:"Grift";src:url("https://cdn.prod.website-files.com/6a0e37a6c7018b2c8724e236/6a4c7a93a693407b27c24668_Grift-Regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Grift";src:url("https://cdn.prod.website-files.com/6a0e37a6c7018b2c8724e236/6a4c7a93f1f8acb16703ed98_Grift-Medium.woff2") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Grift";src:url("https://cdn.prod.website-files.com/6a0e37a6c7018b2c8724e236/6a4c7a93a693407b27c24675_Grift-SemiBold.woff2") format("woff2");font-weight:600;font-display:swap}
:root{--ink:#1e1b18;--ink2:#4a443e;--line:#e3dfd9;--line2:#d2ccc4;--acc:#292d33;--acc2:#1d2939;--red:#b23a31;--redsoft:#fbeceb;
  --fs-title:26px;--fs-body:18px;--fs-label:17px;--fs-small:16px;--h-input:52px;--h-btn:52px}
@media (min-width:768px){:root{--fs-title:32px;--fs-body:20px;--fs-label:18px;--fs-small:17px;--h-input:56px;--h-btn:56px}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom));
  background:#fff;color:var(--ink);font:400 var(--fs-body)/1.4 "Grift",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{width:100%;max-width:440px;border:1px solid var(--line);border-radius:18px;padding:32px 24px;box-shadow:0 20px 50px rgba(16,24,40,.08);
  animation:rise .45s cubic-bezier(.2,.7,.2,1) both}
@media (min-width:768px){main{padding:40px 36px}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){main{animation:none}}
.logo{display:block;width:180px;height:auto;margin:0 0 24px}
h1{margin:0;font-size:var(--fs-title);font-weight:500;line-height:1.2;letter-spacing:-.01em}
.lead{margin:8px 0 0;color:var(--ink2)}
form{display:flex;flex-direction:column;gap:16px;margin-top:24px}
label{display:block;font-size:var(--fs-label);font-weight:500}
.field{position:relative;margin-top:8px}
input[type=password],input[type=text]{width:100%;height:var(--h-input);padding:0 96px 0 16px;border:1px solid var(--line2);border-radius:12px;background:#fff;color:var(--ink);
  font:inherit;font-size:var(--fs-body);outline:none;transition:border-color .15s,box-shadow .15s}
input:focus{border-color:var(--acc);box-shadow:0 0 0 4px rgba(41,45,51,.18)}
.show{position:absolute;top:50%;right:6px;transform:translateY(-50%);min-width:80px;height:calc(var(--h-input) - 12px);padding:0 12px;border:0;border-radius:9px;
  background:transparent;color:var(--acc);font:inherit;font-size:var(--fs-label);font-weight:500;cursor:pointer}
.show:focus-visible{outline:3px solid rgba(41,45,51,.35)}
.go{height:var(--h-btn);border:0;border-radius:12px;background:var(--acc);color:#fff;font:inherit;font-size:var(--fs-body);font-weight:500;cursor:pointer;transition:background .15s}
.go:hover{background:var(--acc2)}
.go:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(41,45,51,.3)}
.go[disabled]{opacity:.7;cursor:default}
.msg{margin:16px 0 0;padding:12px 14px;border-radius:12px;background:var(--redsoft);color:var(--red);font-size:var(--fs-label)}
.foot{margin:20px 0 0;color:var(--ink2);font-size:var(--fs-small)}
.hide{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
</style>
</head>
<body>
<main>
  <img class="logo" src="/cc-logo.png" width="180" height="66" alt="Corner Café">
  <h1>Corner Café Service Hub</h1>
  <p class="lead">Enter the team password to continue.</p>
  ${message}
  <form method="post" action="/__gate" id="gf">
    <input class="hide" type="text" name="username" value="Corner Café team" autocomplete="username" tabindex="-1" aria-hidden="true">
    <input type="hidden" name="next" value="${esc(next)}">
    <label for="pw">Team password
      <span class="field">
        <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus${notReady ? ' disabled' : ''}>
        <button class="show" type="button" id="sh" aria-controls="pw">Show</button>
      </span>
    </label>
    <button class="go" type="submit" id="go"${notReady ? ' disabled' : ''}>Continue</button>
  </form>
  <p class="foot">This device stays unlocked for 30 days. Next, you sign in with your own staff account.</p>
</main>
<script>
(function(){var p=document.getElementById('pw'),s=document.getElementById('sh'),f=document.getElementById('gf'),g=document.getElementById('go');
s.onclick=function(){var v=p.type==='password';p.type=v?'text':'password';s.textContent=v?'Hide':'Show';p.focus()};
f.onsubmit=function(){g.disabled=true;g.textContent='Checking…'};})();
</script>
</body>
</html>`;
}
