"""Hosted cake order form loader: integrity check, backup address, error message, and that the form works. Network simulated; invented data only."""
import asyncio, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; REPO = pathlib.Path('/home/claude/corner-cafe-cakes')
name = open(REPO / 'build/guest_app.txt').read().split()[0]; APP = open(REPO / name, 'rb').read()
base = open(HERE / 'page-built-test.html').read(); cut = base.find('<script type="text/plain" id="cco-code">')
open(HERE / 'guest-loader-test.html', 'w').write(base[:cut] + open(REPO / 'dist/guest.footer.hosted.html').read() + '\n</body></html>')
R = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else ' -> ' + str(d)[:200]))
async def run(b, cdn, fastly):
    ctx = await b.new_context(); pg = await ctx.new_page(); hits = []
    async def handler(route):
        u = route.request.url; hits.append(u)
        if 'supabase-js' in u: return await route.fulfill(status=200, body='', content_type='application/javascript')
        mode = cdn if u.startswith('https://cdn.jsdelivr.net/gh/') else fastly
        if mode == 'down': return await route.abort()
        body = APP if mode == 'ok' else APP + b'\n//changed'
        await route.fulfill(status=200, body=body, content_type='application/javascript', headers={'Access-Control-Allow-Origin': '*'})
    await pg.route('https://**/*', handler)
    await pg.goto((HERE / 'guest-loader-test.html').as_uri()); await pg.wait_for_timeout(1500)
    t = await pg.inner_text('#cc-cake-order'); n = await pg.locator('#cc-cake-order button').count()
    await ctx.close(); return t, n, [h for h in hits if '/gh/' in h]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        t, n, h = await run(b, 'ok', 'ok'); check('form loads from the pinned address and shows the cakes', 'Which cake' in t and n > 3 and len(h) == 1, (t[:120], h))
        t, n, h = await run(b, 'down', 'ok'); check('first address down: loads from the backup address', 'Which cake' in t and len(h) == 2, h)
        t, n, h = await run(b, 'bad', 'bad'); check('changed file is refused and the plain message shown', 'did not load' in t and '892 2760' in t, t[:120])
        t, n, h = await run(b, 'down', 'down'); check('both addresses down: plain message shown', 'did not load' in t, t[:120])
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
