// Shared harness: live head/footer fixtures + live bundle (from git) + mock DB. Extra loaders can be appended.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const repo = '/home/claude/corner-cafe-cakes';
const head = fs.readFileSync(path.join(repo, 'test/fixtures/staff-head.html'), 'utf8');
const footBase = fs.readFileSync(path.join(repo, 'test/fixtures/staff-footer.html'), 'utf8').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^<]*<\/script>/, '');
const mock = fs.readFileSync(path.join(repo, 'test/mock.js'), 'utf8');
const LOCAL = process.env.LOCAL_DIR || require('path').join(__dirname, '../../src');
async function open(b, w, h, o) {
  o = o || {};
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + head + (o.extraHead || '') +
    '<script>window.__role=' + JSON.stringify(o.role || 'manager') + ';window.__oldOrders=true;' + (o.pre || '') + mock + (o.post || '') + 'window.supabase={createClient:function(){return window.__ccsMock}};</script></head>' +
    '<body style="margin:0"><div id="cc-staff"></div>' + footBase + (o.extraFoot || '') + '</body></html>';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1100 || !!o.ipad, isMobile: w < 760 || !!o.ipad });
  const p = await ctx.newPage(), errors = [], logs = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://www.cornercafefiji.com/')) return r.fulfill({ body: html, contentType: 'text/html' });
    let m = u.match(/^https:\/\/(?:(?:cdn|fastly)\.jsdelivr\.net\/gh\/jrest2025\/corner-cafe-cakes@|raw\.githubusercontent\.com\/jrest2025\/corner-cafe-cakes\/)([0-9a-f]{7,40})\/([^?]+)/);
    if (m) {
      const type = /\.css$/.test(m[2]) ? 'text/css' : 'application/javascript', hdr = { 'access-control-allow-origin': '*' };
      if (m[1] === '0000000') return r.fulfill({ body: fs.readFileSync(path.join(LOCAL, path.basename(m[2]))), contentType: type, headers: hdr });
      try { return r.fulfill({ body: execFileSync('git', ['-C', repo, 'show', m[1] + ':' + m[2]], { maxBuffer: 1e8 }), contentType: type, headers: hdr }); } catch (e) { return r.fulfill({ status: 404, body: '' }); }
    }
    return r.abort();
  });
  await p.goto('https://www.cornercafefiji.com/cake-orders-staff');
  try { await p.waitForSelector('#cc-semantic-colour-style', { timeout: 8000, state: 'attached' }); } catch (e) {}
  await p.waitForTimeout(1500);
  return { ctx, p, errors, logs };
}
const tap = async (p, s, wait) => { const ok = await p.evaluate(s => { const all = [...document.querySelectorAll(s)], e = all.filter(x => x.getClientRects().length).pop() || all.pop(); if (!e) return false; e.click(); return true; }, s); await p.waitForTimeout(wait || 400); return ok; };
module.exports = { open, tap, chromium, repo };
