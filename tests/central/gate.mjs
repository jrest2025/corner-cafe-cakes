// Login gate for central.cornercafefiji.com (middleware.js). Runs in plain Node; no live data or Vercel needed.
import assert from 'node:assert/strict';
import { gate, makeCookie, cookieValid } from '../../middleware.js';

const env = { CC_GATE_PASSWORD: 'test-team-password-123', CC_GATE_SECRET: 'test-secret-value-not-real-0123456789abcdef' };
const R = (path, init = {}) => new Request('https://central.cornercafefiji.com' + path, init);
const post = (fields) => R('/__gate', { method: 'POST', body: new URLSearchParams(fields) });
const isGate = async (res) => (await res.text()).includes('Enter the team password');
const passes = (res) => res.headers.get('x-middleware-next') === '1';

// 1. No cookie: the gate page, not the Service Hub, with noindex
let r = await gate(R('/'), env);
assert.equal(r.status, 401); assert.ok(await isGate(r)); assert.match(r.headers.get('x-robots-tag'), /noindex/);
assert.equal(r.headers.get('cache-control'), 'no-store');

// 2. Wrong password: gate again with a message, no cookie
r = await gate(post({ password: 'wrong', next: '/' }), env);
assert.equal(r.status, 401); assert.equal(r.headers.get('set-cookie'), null);
assert.match(await r.text(), /isn&#39;t right/);

// 3. Right password: cookie set (HttpOnly, Secure, 30 days) and back to the page asked for, order link kept
r = await gate(post({ password: env.CC_GATE_PASSWORD, next: '/?order=abc-123' }), env);
assert.equal(r.status, 303); assert.equal(r.headers.get('location'), '/?order=abc-123');
const sc = r.headers.get('set-cookie');
assert.match(sc, /^cc_gate=v1\.\d+\.[A-Za-z0-9_-]{43}; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);
const cookie = sc.split(';')[0];

// 4. With the cookie: request goes through to the Service Hub page
r = await gate(R('/', { headers: { cookie: 'other=1; ' + cookie } }), env);
assert.ok(passes(r), 'valid cookie should continue');

// 5. The gate never sends people to another site
for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/__gate']) {
  r = await gate(post({ password: env.CC_GATE_PASSWORD, next: bad }), env);
  assert.equal(r.headers.get('location'), '/', bad);
}
// The page asked for is carried into the gate form
r = await gate(R('/?order=x1'), env);
assert.match(await r.text(), /name="next" value="\/\?order=x1"/);

// 6. Tampered, expired, or old-password cookies are refused
const v = cookie.slice('cc_gate='.length);
assert.ok(cookieValid(env, v));
assert.ok(!cookieValid(env, v.replace(/\.(\d+)\./, '.9999999999.')));
assert.ok(!cookieValid(env, makeCookie(env, Date.now() - 31 * 86400e3)));
assert.ok(!cookieValid({ ...env, CC_GATE_PASSWORD: 'changed-password' }, v), 'changing the password signs devices out');
assert.ok(!cookieValid(env, 'garbage'));

// 7. Not set up in Vercel: stays shut
r = await gate(R('/', { headers: { cookie } }), {});
assert.equal(r.status, 503); assert.match(await r.text(), /not set up yet/);
r = await gate(post({ password: '' }), {});
assert.equal(r.status, 503);

// 8. Sign out of the gate
r = await gate(R('/__gate/logout'), env);
assert.equal(r.status, 303); assert.match(r.headers.get('set-cookie'), /Max-Age=0/);

console.log('PASS');
