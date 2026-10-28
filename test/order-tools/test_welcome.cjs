// Welcome screen add-on: wraps the app's sign-in; wrong password, sign-in, Practice mode. Run: node test/order-tools/test_welcome.cjs
const fs = require('fs');
const { open, chromium } = require('./harness.cjs');
const loader = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') +
  '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.welcome.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const post = "(function(){var a=window.__ccsMock.auth,g=a.getSession;window.__in=false;a.getSession=function(){return window.__in?g():Promise.resolve({data:{session:null}})};a.signInWithPassword=function(x){if(x.password!=='right-one')return Promise.resolve({error:{message:'Invalid login credentials'}});window.__in=true;return Promise.resolve({data:{session:{}}})}})();";
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1440, 900, 'desktop'], [820, 1180, 'ipad'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader, post, ipad: t === 'ipad' });
    await p.waitForTimeout(2500);
    const s0 = await p.evaluate(() => ({ on: document.getElementById('cc-staff').classList.contains('ccw-on'), inSide: !!document.querySelector('.ccw-side #ccs-login'), when: (document.querySelector('.ccw-when') || {}).textContent, greet: !!document.querySelector('.ccw-greet'), practice: !!document.querySelector('.ccw-side .ccp-go') }));
    check(t + ' welcome wraps the sign-in form (no greeting, date and time shown), Practice mode inside', s0.on && s0.inSide && !s0.greet && /\d:\d\d (AM|PM)/.test(s0.when) && s0.practice, s0);
    await p.fill('#ccs-email', 'mere@cornercafe.com.fj'); await p.fill('#ccs-pass', 'wrong'); await p.evaluate(() => document.querySelector('#ccs-login button[type=submit]').click()); await p.waitForTimeout(900);
    const s1 = await p.evaluate(() => ({ err: (document.querySelector('.ccw-side #ccs-login .ccs-err') || {}).textContent, on: document.getElementById('cc-staff').classList.contains('ccw-on'), email: (document.getElementById('ccs-email') || {}).value }));
    check(t + ' wrong password: the app\'s message shows inside the welcome screen, email kept', s1.on && /do not match/.test(s1.err || '') && s1.email === 'mere@cornercafe.com.fj', s1);
    await p.evaluate(() => document.querySelector('.ccw-eye').click());
    check(t + ' show password works', await p.evaluate(() => document.getElementById('ccs-pass').type === 'text'));
    await p.fill('#ccs-pass', 'right-one'); await p.evaluate(() => document.querySelector('#ccs-login button[type=submit]').click()); await p.waitForTimeout(3000);
    const s2 = await p.evaluate(() => ({ app: !!document.querySelector('#cc-staff .ccs-app, #cc-staff #ccs-main'), login: !!document.getElementById('ccs-login'), shell: !!document.querySelector('.ccw'), curtain: !!document.querySelector('.ccw-curtain'), on: document.getElementById('cc-staff').classList.contains('ccw-on') }));
    check(t + ' signs in: app shows, welcome screen gone', s2.app && !s2.login && !s2.shell && !s2.curtain && !s2.on, s2);
    check(t + ' no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
    if (t === 'desktop') {
      const { p: q } = await open(b, w, h, { extraFoot: loader, post: post + "try{localStorage.setItem('cc-welcome-last-email','mere@cornercafe.com.fj')}catch(e){}" });
      await q.waitForTimeout(2500);
      const s3 = await q.evaluate(() => ({ email: document.getElementById('ccs-email').value }));
      check('returning staff: the email filled in', s3.email === 'mere@cornercafe.com.fj', s3);
      await q.evaluate(() => document.querySelector('.ccw-side .ccp-go').click()); await q.waitForTimeout(2500);
      check('Practice mode opens from the welcome screen', await q.evaluate(() => !document.getElementById('ccs-login') && !document.querySelector('.ccw')), await q.evaluate(() => document.body.innerText.slice(0, 200)));
    }
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
