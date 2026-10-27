// Corner Café Service Hub login gate (Vercel Routing Middleware, central.cornercafefiji.com).
// Every request must carry a valid "cc_gate" cookie, set after the team password is entered on the gate page.
// Without it, the branded gate page is returned instead, so the Service Hub page is never served to strangers.
// Staff then sign in to the Service Hub itself with their own email and password (Supabase), exactly as before.
// There is no two-step (second factor) sign-in yet; it is planned. Idle sessions sign out after 12 hours.
//
// Vercel environment variables (set in Vercel, never in this repository):
//   CC_GATE_PASSWORD  the team password staff type on the gate page
//   CC_GATE_SECRET    a long random value used to sign the cookie
// Changing either one signs every device out of the gate.
// If either is missing, the gate stays shut and says it is not set up (it never opens by default).

import { next } from '@vercel/functions';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { gatePage } from './central/gate-page.js';

export const config = { matcher: '/((?!cc-logo\\.png|robots\\.txt|manifest\\.json|app-install\\.js).*)' };

const COOKIE = 'cc_gate';
const DAYS = 30;
const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};

const sha = (s) => createHash('sha256').update(String(s)).digest();
function keyFor(env) { return Buffer.concat([sha(env.CC_GATE_SECRET), sha(env.CC_GATE_PASSWORD)]); }
function sign(env, body) { return createHmac('sha256', keyFor(env)).update(body).digest('base64url'); }
function same(a, b) { const x = sha(a), y = sha(b); return timingSafeEqual(x, y); }

export function makeCookie(env, now = Date.now()) {
  const body = 'v1.' + Math.floor(now / 1000 + DAYS * 86400);
  return body + '.' + sign(env, body);
}
export function cookieValid(env, value, now = Date.now()) {
  if (!value) return false;
  const m = /^(v1\.(\d{1,12}))\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!m) return false;
  if (Number(m[2]) * 1000 <= now) return false;
  return same(m[3], sign(env, m[1]));
}
function readCookie(request) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim();
  }
  return '';
}
// Only a path on this site may follow the gate (never another site).
function safeNext(v) {
  v = String(v || '/');
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.startsWith('/__gate')) return '/';
  return v.slice(0, 512);
}
const page = (opts, status) => new Response(gatePage(opts), { status, headers: HEADERS });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Vercel calls the default export with (request, context); the tests call gate() with their own values.
export default function middleware(request) { return gate(request, process.env); }

export async function gate(request, env) {
  const url = new URL(request.url);
  const ready = !!(env.CC_GATE_PASSWORD && env.CC_GATE_SECRET);

  if (url.pathname === '/__gate/logout') {
    return new Response(null, { status: 303, headers: { ...HEADERS, Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (url.pathname === '/__gate') {
    if (request.method !== 'POST') return Response.redirect(new URL('/', url), 303);
    if (!ready) return page({ notReady: true }, 503);
    let form;
    try { form = await request.formData(); } catch { form = new FormData(); }
    const nextPath = safeNext(form.get('next'));
    if (!same(form.get('password') || '', env.CC_GATE_PASSWORD)) {
      await wait(900); // slows down guessing
      return page({ error: "That password isn't right. Check it and try again.", next: nextPath }, 401);
    }
    return new Response(null, {
      status: 303,
      headers: { ...HEADERS, Location: nextPath, 'Set-Cookie': `${COOKIE}=${makeCookie(env)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` },
    });
  }

  if (ready && cookieValid(env, readCookie(request))) return next();
  if (!ready) return page({ notReady: true }, 503);
  return page({ next: safeNext(url.pathname + url.search) }, 401);
}
