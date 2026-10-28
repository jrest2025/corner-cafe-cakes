// The Vercel page (central.cornercafefiji.com) is the live Webflow staff page with one intended change.
// Runs in plain Node; no live data or Vercel needed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { config } from '../../middleware.js';

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
execFileSync(process.execPath, ['scripts/build-central.mjs'], { stdio: 'inherit' });
const built = readFileSync('central/dist/index.html', 'utf8');

// 1. Exactly the live page, apart from the app-install script
const webflowInstall = 'https://cdn.prod.website-files.com/6a0afe25d2f1212db6f93a0e%2F689e5ba67671442434f3ca35%2F6ad864aa96cc148f21d1020f%2Fccservicehubappinstall-1.0.0.js';
const live = built.replace('/app-install.js', webflowInstall);
assert.equal(sha(live), '6d8d874985efd6c4d795b668232450a8df339737415866ba31edb27178d62c10', 'only the app-install script may differ from the live page');
assert.equal(built.split('/app-install.js').length, 2);

// 2. The Cake CRM container, the Supabase library and the noindex tag are there
assert.ok(built.includes('<div id="cc-staff">'));
assert.ok(built.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'));
assert.match(built, /<meta content="noindex" name="robots"\/>/);

// 3. App install opens this address, not the Webflow page
const manifest = JSON.parse(readFileSync('central/dist/manifest.json', 'utf8'));
assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.name, 'Corner Café Service Hub');
const install = readFileSync('central/dist/app-install.js', 'utf8');
assert.ok(install.includes("href:'/manifest.json'") && !install.includes('manifest-www'));

// 4. Google is kept out, and only the logo, robots.txt and app-install files skip the gate
assert.equal(readFileSync('central/dist/robots.txt', 'utf8'), 'User-agent: *\nDisallow: /\n');
const gated = (p) => new RegExp('^' + config.matcher + '$').test(p);
for (const p of ['/', '/index.html', '/cake-orders-staff', '/?order=1', '/__gate']) assert.ok(gated(p), p + ' must be behind the gate');
for (const p of ['/cc-logo.png', '/robots.txt', '/manifest.json', '/app-install.js']) assert.ok(!gated(p), p + ' must load without the gate');
assert.ok(existsSync('central/dist/cc-logo.png'));

console.log('PASS');
