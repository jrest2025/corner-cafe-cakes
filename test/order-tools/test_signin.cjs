// Sign-in splash add-on (Marketing Central format): wraps the app's sign-in; wrong password, show password, sign-in, Practice mode.
// Run: node test/order-tools/test_signin.cjs
const fs = require('fs');
const { open, chromium } = require('./harness.cjs');
const SHOT = process.env.SHOT || '';
const loader = fs.readFileSync(__dirname + '/loader.html', 'utf8').replace('SHA_OT', '0000000') +
  '<script>fetch("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@0000000/src/staff.signin.js").then(function(r){return r.text()}).then(function(t){var s=document.createElement("script");s.text=t;document.body.appendChild(s)})</script>';
const post = "(function(){var a=window.__ccsMock.auth,g=a.getSession;window.__in=false;a.getSession=function(){return window.__in?g():Promise.resolve({data:{session:null}})};a.signInWithPassword=function(x){if(x.password!=='right-one')return Promise.resolve({error:{message:'Invalid login credentials'}});window.__in=true;return Promise.resolve({data:{session:{}}})}})();";
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d).slice(0, 400) : '')); } };
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1440, 900, 'desktop'], [820, 1180, 'ipad'], [390, 844, 'phone']]) {
    const { p, errors } = await open(b, w, h, { extraFoot: loader, post, ipad: t === 'ipad' });
    await p.waitForTimeout(3500);
    if (SHOT) await p.screenshot({ path: SHOT + '-' + t + '.png' });
    const s0 = await p.evaluate(() => ({ on: document.getElementById('cc-staff').classList.contains('ccsg-on'), inCard: !!document.querySelector('.ccsg-card #ccs-login'), title: (document.querySelector('#ccs-login .ccs-title') || {}).textContent, tag: (document.querySelector('.ccsg-tag') || {}).textContent, meal: document.querySelector('.ccsg').getAttribute('data-meal'), practice: !!document.querySelector('.ccsg-card .ccp-go .ccsg-pt'), side: document.documentElement.scrollWidth - innerWidth, cardBg: getComputedStyle(document.querySelector('.ccsg-card')).backgroundColor }));
    check(t + ' splash wraps the sign-in form: Sign in, Service Hub, Practice row, white card, no sideways scroll', s0.on && s0.inCard && s0.title === 'Sign in' && s0.tag === 'Service Hub' && /breakfast|lunch|dinner/.test(s0.meal) && s0.practice && s0.side <= 0 && s0.cardBg === 'rgb(255, 255, 255)', s0);
    await p.fill('#ccs-email', 'mere@cornercafe.com.fj'); await p.fill('#ccs-pass', 'wrong'); await p.evaluate(() => document.querySelector('#ccs-login button[type=submit]').click()); await p.waitForTimeout(900);
    const s1 = await p.evaluate(() => ({ err: (document.querySelector('.ccsg-card #ccs-login .ccs-err') || {}).textContent, on: document.getElementById('cc-staff').classList.contains('ccsg-on'), email: (document.getElementById('ccs-email') || {}).value, eye: !!document.querySelector('.ccsg-eye') }));
    check(t + ' wrong password: the app\'s message shows inside the card, email kept, eye still there', s1.on && /do not match/.test(s1.err || '') && s1.email === 'mere@cornercafe.com.fj' && s1.eye, s1);
    await p.evaluate(() => document.querySelector('.ccsg-eye').click());
    check(t + ' show password works', await p.evaluate(() => document.getElementById('ccs-pass').type === 'text'));
    await p.fill('#ccs-pass', 'right-one'); await p.evaluate(() => document.querySelector('#ccs-login button[type=submit]').click()); await p.waitForTimeout(3000);
    const s2 = await p.evaluate(() => ({ app: !!document.querySelector('#cc-staff .ccs-app, #cc-staff #ccs-main'), login: !!document.getElementById('ccs-login'), shell: !!document.querySelector('.ccsg'), on: document.getElementById('cc-staff').classList.contains('ccsg-on') }));
    check(t + ' signs in: app shows, splash gone', s2.app && !s2.login && !s2.shell && !s2.on, s2);
    check(t + ' no page errors', !errors.filter(e => !/length|filter|Unlisted/.test(e)).length, errors);
    if (t === 'desktop') {
      const { p: q } = await open(b, w, h, { extraFoot: loader, post });
      await q.waitForTimeout(2500);
      await q.evaluate(() => document.querySelector('.ccsg-card .ccp-go').click()); await q.waitForTimeout(2500);
      check('Practice mode opens from the splash', await q.evaluate(() => !document.getElementById('ccs-login') && !document.querySelector('.ccsg')), await q.evaluate(() => document.body.innerText.slice(0, 200)));
    }
  }
  await b.close(); console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})();
