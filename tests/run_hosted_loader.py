"""Hosted app loader: fingerprint check, backup address, and the error message. Network is simulated; invented data only."""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; R = HERE.parent
m = json.load(open(R / 'dist/app/manifest.json')); APP = open(R / m['file'], 'rb').read()
page = ('<!doctype html><html><head><meta charset="utf-8">' + open(R / 'dist/staff.head.html').read() + '</head><body style="margin:0">' +
        open(R / 'dist/staff.embed.html').read() + '\n<script src="mock.js"></script>\n' + open(R / 'dist/staff.footer.html').read() + '</body></html>')
open(HERE / 'hosted-loader-test.html', 'w').write(page)
res = []
def check(n, ok, d=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else ' -> ' + str(d)[:200]))
async def run(b, cdn, fastly):
    ctx = await b.new_context(); pg = await ctx.new_page(); hits = []
    await pg.add_init_script("window.__role='manager'")
    async def handler(route):
        u = route.request.url; hits.append(u)
        if 'supabase-js' in u: return await route.fulfill(status=200, body='', content_type='application/javascript')
        if 'fonts.' in u: return await route.fulfill(status=200, body='', content_type='text/css')
        mode = cdn if u.startswith('https://cdn.jsdelivr.net/gh/') else fastly
        if mode == 'down': return await route.abort()
        body = APP if mode == 'ok' else APP.replace(b'Loading', b'Loadinx', 1) + b'\n//changed'
        await route.fulfill(status=200, body=body, content_type='application/javascript', headers={'Access-Control-Allow-Origin': '*'})
    await pg.route('https://**/*', handler)
    await pg.goto((HERE / 'hosted-loader-test.html').as_uri()); await pg.wait_for_timeout(1200)
    st = await pg.evaluate("({style:!!document.getElementById('ccs-style'), text:document.getElementById('cc-staff').innerText})")
    await ctx.close(); return st, [h for h in hits if '/gh/' in h]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        st, h = await run(b, 'ok', 'ok')
        check('normal: app starts from the main address', st['style'] and 'did not load' not in st['text'] and 'Loading the staff app' not in st['text'], st)
        check('normal: backup address not used', len(h) == 1 and h[0].startswith('https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@'), h)
        st, h = await run(b, 'down', 'ok')
        check('main address down: backup address used and app starts', st['style'] and len(h) == 2 and h[1].startswith('https://fastly.jsdelivr.net/'), (st, h))
        st, h = await run(b, 'bad', 'ok')
        check('changed file at main address is refused, backup used', st['style'] and len(h) == 2, (st, h))
        st, h = await run(b, 'bad', 'bad')
        check('changed file everywhere: app does not run, clear message shown', not st['style'] and 'did not load' in st['text'], st)
        st, h = await run(b, 'down', 'down')
        check('both addresses down: clear message shown', not st['style'] and 'Check the internet connection' in st['text'], st)
        await b.close()
    print(f'{sum(res)}/{len(res)} passed')
asyncio.run(main())
