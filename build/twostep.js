/* Two-step sign-in for Admin logins (Release E, 28 Oct 2026). Marker __ccTwoStep20261028. Appended to staff.signin.js
 * by build/staff_signin.py. After sign-in, an Admin is asked for the 6-digit code from an authenticator app (or sets one
 * up the first time). The server holds back every permission until the code is entered (supabase/sql/release_e_*).
 * Settings, People and access, Two-step sign-in: see phones, add a second phone, remove one (never the last). */
(function () {
  'use strict';
  var win = window, doc = document;
  if (win.__ccTwoStep20261028) return;
  win.__ccTwoStep20261028 = true;
  var CSS = [
    '.cc2s{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,24,40,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}',
    '.cc2s *{box-sizing:border-box}',
    '.cc2s-card{width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:18px;padding:28px 26px 24px;box-shadow:0 24px 60px rgba(16,24,40,.28);color:#1D2939;line-height:1.4}',
    '.cc2s-ic{width:52px;height:52px;border-radius:14px;background:#EEF3F9;color:#1E3A5F;display:flex;align-items:center;justify-content:center;margin:0 0 14px}',
    '.cc2s-ic svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '.cc2s h2{margin:0 0 6px;font-size:24px;font-weight:600;letter-spacing:-.01em;color:#101828}',
    '.cc2s p{margin:0 0 12px;font-size:17px;color:#344054}',
    '.cc2s ol{margin:6px 0 4px;padding:0 0 0 22px;font-size:17px;color:#344054}.cc2s ol li{margin:0 0 10px}',
    '.cc2s-qr{display:block;width:184px;height:184px;margin:6px auto 6px;border:1px solid #E4E7EC;border-radius:12px;padding:8px;background:#fff}',
    '.cc2s-key{font-size:15px;font-style:italic;color:#667085;text-align:center;margin:0 0 12px;word-break:break-all}.cc2s-key b{font-style:normal;font-weight:600;letter-spacing:.06em;color:#344054}',
    '.cc2s-code{display:block;width:100%;height:60px;border:1.5px solid #D0D5DD;border-radius:12px;font-size:28px;letter-spacing:.4em;text-align:center;font-variant-numeric:tabular-nums;color:#101828;padding:0 0 0 .4em;outline:none;background:#fff}',
    '.cc2s-code:focus{border-color:#1E3A5F;box-shadow:0 0 0 4px rgba(30,58,95,.14)}',
    '.cc2s-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:54px;margin:14px 0 0;border:0;border-radius:12px;background:#1E3A5F;color:#fff;font-size:18px;font-weight:600;cursor:pointer}',
    '.cc2s-btn[disabled]{opacity:.55;cursor:default}',
    '.cc2s-btn.cc2s-sec{background:#fff;color:#1E3A5F;border:1.5px solid #C9D5E4}',
    '.cc2s-link{display:inline-block;margin:14px 0 0;padding:6px 2px;border:0;background:none;color:#1E3A5F;font-size:16px;font-weight:500;text-decoration:underline;text-underline-offset:3px;cursor:pointer}',
    '.cc2s-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}',
    '.cc2s-err{margin:10px 0 0;font-size:16px;color:#B42318}',
    '.cc2s-ok{margin:10px 0 0;font-size:16px;color:#067647}',
    '.cc2s-hint{margin:14px 0 0;font-size:15px;font-style:italic;color:#667085}',
    '.cc2s-list{list-style:none;margin:6px 0 4px;padding:0;border:1px solid #E4E7EC;border-radius:12px}',
    '.cc2s-list li{display:flex;align-items:center;gap:12px;min-height:58px;padding:8px 14px;border-top:1px solid #F2F4F7;font-size:17px}.cc2s-list li:first-child{border-top:0}',
    '.cc2s-list li span{flex:1;min-width:0}.cc2s-list li small{display:block;font-size:14px;font-style:italic;color:#667085}',
    '.cc2s-rm{min-height:44px;padding:0 14px;border:1.5px solid #F1C8C3;border-radius:10px;background:#fff;color:#B42318;font-size:15px;font-weight:500;cursor:pointer}.cc2s-rm.cc2s-arm{background:#B42318;border-color:#B42318;color:#fff}',
    '.cc2s-on{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#ECFDF3;color:#067647;font-size:14px;font-weight:600}',
    '@media (max-width:600px){.cc2s{align-items:flex-end;padding:0}.cc2s-card{max-width:none;border-radius:20px 20px 0 0;padding:24px 18px calc(18px + env(safe-area-inset-bottom))}.cc2s h2{font-size:21px}.cc2s p,.cc2s ol{font-size:16px}}'
  ].join('');
  var IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10.2 10.5V9a1.8 1.8 0 0 1 3.6 0v1.5"/></svg>';
  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E';
  var cli = null;
  function sb() { if (!cli && win.supabase && win.supabase.createClient) cli = win.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff' } }); return cli; }
  function mfa() { var c = sb(); return c && c.auth && c.auth.mfa ? c.auth.mfa : null; }
  var S = { checked: false, status: null, view: null, busy: false, err: null, ok: null, qr: null, secret: null, fid: null, factors: [], arm: null, back: null };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function when(iso) {
    try { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Fiji', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/\b(am|pm)\b/, function (x) { return x.toUpperCase(); }); } catch (e) { return ''; }
  }
  function styles() { if (doc.getElementById('cc2s-style')) return; var s = doc.createElement('style'); s.id = 'cc2s-style'; s.textContent = CSS; doc.head.appendChild(s); }
  function box() { var b = doc.getElementById('cc2s'); if (!b) { styles(); b = doc.createElement('div'); b.id = 'cc2s'; b.className = 'cc2s'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); doc.body.appendChild(b); } return b; }
  function close() { var b = doc.getElementById('cc2s'); if (b) b.remove(); S.view = null; S.err = S.ok = null; }
  function msg() { return (S.err ? '<p class="cc2s-err" role="alert">' + esc(S.err) + '</p>' : '') + (S.ok ? '<p class="cc2s-ok" role="status">' + esc(S.ok) + '</p>' : ''); }
  function codeBox(label) { return '<input class="cc2s-code" id="cc2s-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" aria-label="' + label + '" placeholder="······">'; }
  function render() {
    if (!S.view) return close();
    var b = box(), h = '<div class="cc2s-card"><div class="cc2s-ic">' + IC + '</div>';
    if (S.view === 'code') {
      h += '<h2>Enter your code</h2><p>Open your authenticator app and type the 6-digit code for Corner Café.</p>' + codeBox('6-digit code') +
        '<button type="button" class="cc2s-btn" data-2s="verify"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Checking…' : 'Continue') + '</button>' + msg() +
        '<div class="cc2s-row"><button type="button" class="cc2s-link" data-2s="signout">Sign out</button></div>' +
        '<p class="cc2s-hint">Lost your phone? Ask the system owner to reset two-step sign-in.</p>';
    } else if (S.view === 'setup') {
      var adding = S.back === 'manage';
      h += '<h2>' + (adding ? 'Add another phone' : 'Turn on two-step sign-in') + '</h2>' + (adding ? '' : '<p>Admins need a code from their phone as well as the password.</p>') +
        '<ol><li>Open an authenticator app (Google or Microsoft Authenticator).</li><li>Scan this code.</li></ol>' +
        (S.qr ? '<img class="cc2s-qr" alt="Set-up code to scan" src="' + esc(S.qr) + '">' + (S.secret ? '<p class="cc2s-key">Can’t scan? Enter this key: <b>' + esc(S.secret.replace(/(.{4})/g, '$1 ').trim()) + '</b></p>' : '') : '<p class="cc2s-hint">' + (S.err ? '' : 'Getting your code…') + '</p>') +
        '<ol start="3"><li>Type the 6-digit code it shows.</li></ol>' + codeBox('6-digit code from the app') +
        '<button type="button" class="cc2s-btn" data-2s="enrol"' + (S.busy || !S.fid ? ' disabled' : '') + '>' + (S.busy ? 'Checking…' : adding ? 'Add phone' : 'Turn on') + '</button>' + msg() +
        '<div class="cc2s-row">' + (adding ? '<button type="button" class="cc2s-link" data-2s="manage">Back</button>' : '<button type="button" class="cc2s-link" data-2s="signout">Sign out</button>') +
        (!adding && S.err && !S.fid ? '<button type="button" class="cc2s-link" data-2s="later">Skip for now</button>' : '') + '</div>';
    } else if (S.view === 'manage') {
      h += '<div class="cc2s-row"><h2>Two-step sign-in</h2>' + (S.factors.length ? '<span class="cc2s-on">On</span>' : '') + '</div><p>' + (S.factors.length ? 'Phones that can give your code:' : 'Not turned on yet.') + '</p><ul class="cc2s-list">' +
        S.factors.map(function (f, i) { return '<li><span>' + esc(f.friendly_name || ('Phone ' + (i + 1))) + '<small>Added ' + esc(when(f.created_at)) + '</small></span>' + (S.factors.length > 1 ? '<button type="button" class="cc2s-rm' + (S.arm === f.id ? ' cc2s-arm' : '') + '" data-2s-rm="' + esc(f.id) + '">' + (S.arm === f.id ? 'Tap again to remove' : 'Remove') + '</button>' : '') + '</li>'; }).join('') +
        '</ul><button type="button" class="cc2s-btn cc2s-sec" data-2s="add"' + (S.busy ? ' disabled' : '') + '>' + (S.factors.length ? 'Add another phone' : 'Turn on') + '</button>' + msg() +
        '<p class="cc2s-hint">Keep a second phone added so you can still sign in if one is lost.</p>' +
        '<button type="button" class="cc2s-btn" data-2s="close">Done</button>';
    }
    h += '</div>';
    var had = doc.activeElement && doc.activeElement.id === 'cc2s-code', val = (doc.getElementById('cc2s-code') || {}).value || '';
    b.innerHTML = h;
    var ci = doc.getElementById('cc2s-code'); if (ci) { ci.value = S.err ? '' : val; if (had || !S.busy) setTimeout(function () { try { ci.focus({ preventScroll: true }); } catch (e) {} }, 30); }
  }
  function fail(text) { S.busy = false; S.err = text; render(); }
  function done() { S.view = null; close(); try { win.location.reload(); } catch (e) {} }
  // ---------- flows ----------
  function startCode() {
    var m = mfa(); if (!m) return;
    S.view = 'code'; S.err = S.ok = null; render();
    m.listFactors().then(function (r) { var v = (r && r.data && r.data.totp || []).filter(function (f) { return f.status === 'verified'; }); S.fid = v.length ? v[0].id : null; if (!S.fid) fail('No phone found. Ask the system owner to reset two-step sign-in.'); }, function () { fail('Could not connect. Check the internet connection.'); });
  }
  function startSetup(back) {
    var m = mfa(); if (!m) return;
    S.view = 'setup'; S.back = back || null; S.qr = S.secret = S.fid = null; S.err = S.ok = null; S.busy = false; render();
    m.listFactors().then(function (r) {
      var all = (r && r.data && r.data.all) || [], stale = all.filter(function (f) { return f.status !== 'verified'; });
      var used = all.filter(function (f) { return f.status === 'verified'; }).map(function (f) { return f.friendly_name; });
      return Promise.all(stale.map(function (f) { return m.unenroll({ factorId: f.id }).catch(function () {}); })).then(function () { return used; });
    }).then(function (used) {
      var i = 1; while (used.indexOf('Phone ' + i) >= 0) i++;
      var name = 'Phone ' + i;
      return m.enroll({ factorType: 'totp', friendlyName: name, issuer: 'Corner Café Service Hub' });
    }).then(function (r) {
      if (!r || r.error || !r.data) return fail('Could not start set-up. ' + ((r && r.error && r.error.message) || ''));
      S.fid = r.data.id; S.qr = r.data.totp && r.data.totp.qr_code; S.secret = r.data.totp && r.data.totp.secret; render();
    }, function () { fail('Could not connect. Check the internet connection.'); });
  }
  function startManage() {
    var m = mfa(); if (!m) return;
    S.view = 'manage'; S.arm = null; S.err = S.ok = null; S.busy = true; render();
    m.listFactors().then(function (r) { S.busy = false; S.factors = (r && r.data && r.data.totp || []).filter(function (f) { return f.status === 'verified'; }); render(); }, function () { fail('Could not load. Check the internet connection.'); });
  }
  function submit(kind) {
    var m = mfa(), ci = doc.getElementById('cc2s-code'), code = ci ? ci.value.replace(/\D/g, '') : '';
    if (!m || S.busy) return;
    if (code.length !== 6) { S.err = 'Type all 6 numbers.'; return render(); }
    if (!S.fid) return;
    S.busy = true; S.err = null; render();
    m.challengeAndVerify({ factorId: S.fid, code: code }).then(function (r) {
      if (r && r.error) return fail(/invalid|expired|incorrect/i.test(r.error.message || '') ? 'That code didn’t work. Use the newest code in the app.' : (r.error.message || 'That code didn’t work.'));
      S.busy = false;
      if (kind === 'enrol' && S.back === 'manage') { S.ok = 'Phone added.'; startManage(); S.ok = 'Phone added.'; return; }
      done();
    }, function () { fail('Could not connect. Check the internet connection.'); });
  }
  function remove(id) {
    var m = mfa(); if (!m || S.busy) return;
    if (S.arm !== id) { S.arm = id; S.err = S.ok = null; return render(); }
    if (S.factors.length < 2) return;
    S.busy = true; render();
    m.unenroll({ factorId: id }).then(function (r) { S.busy = false; S.arm = null; if (r && r.error) return fail(r.error.message || 'Could not remove.'); startManage(); }, function () { fail('Could not connect. Check the internet connection.'); });
  }
  // ---------- after sign-in ----------
  function signedIn() { return !!doc.querySelector('#cc-staff #ccs-main') && !doc.getElementById('ccs-login') && !doc.documentElement.classList.contains('ccp-on'); }
  function check() {
    if (!signedIn()) { if (S.checked && !doc.querySelector('#cc-staff #ccs-main')) { S.checked = false; S.status = null; } return; }
    if (S.checked || !sb() || !mfa()) return;
    S.checked = true;
    sb().rpc('two_step_status').then(function (r) {
      var d = r && r.data; if (!d || !d.ok) return;
      S.status = d;
      if (!d.required || d.aal === 'aal2') return;
      if (d.enrolled) startCode(); else startSetup(null);
    }, function () {});
  }
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var a = t.closest('[data-2s]'), rm = t.closest('[data-2s-rm]');
    if (rm) { e.preventDefault(); return remove(rm.getAttribute('data-2s-rm')); }
    if (!a) return; e.preventDefault();
    var k = a.getAttribute('data-2s');
    if (k === 'verify') submit('code');
    else if (k === 'enrol') submit('enrol');
    else if (k === 'add') startSetup('manage');
    else if (k === 'manage') startManage();
    else if (k === 'close' || k === 'later') close();
    else if (k === 'signout') { var c = sb(); S.busy = true; (c ? c.auth.signOut() : Promise.resolve()).then(null, function () {}).then(function () { try { win.location.reload(); } catch (er) {} }); }
  });
  doc.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'cc2s-code') return;
    var v = e.target.value.replace(/\D/g, '').slice(0, 6); if (v !== e.target.value) e.target.value = v;
    if (v.length === 6 && !S.busy && S.fid) submit(S.view === 'setup' ? 'enrol' : 'code');
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'cc2s-code') { e.preventDefault(); submit(S.view === 'setup' ? 'enrol' : 'code'); } });
  // Settings (People and access) opens the phone list; only Admins see the row
  win.CCTwoStep = { open: function () { if (S.status && S.status.required) startManage(); }, state: function () { return S.status; } };
  var q = false;
  function schedule() { if (q) return; q = true; setTimeout(function () { q = false; try { check(); } catch (e) { if (win.console) console.warn('[Two-step]', e); } }, 60); }
  function start() { new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true }); schedule(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
