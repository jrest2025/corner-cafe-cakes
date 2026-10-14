"""Sign-out after 12 hours without use. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def page(b, ago_hours):
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    seed = '' if ago_hours is None else f"localStorage.setItem('ccs-active', String(Date.now() - {ago_hours} * 3600e3));"
    await pg.add_init_script(f"window.__role='front_of_house'; try{{localStorage.clear(); {seed}}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await page(b, 13)
        t = await pg.inner_text('#cc-staff')
        check('13 hours idle: signed out with a plain reason', 'signed out after 12 hours without use' in t and await pg.locator('#ccs-login').count() == 1, t[:200])
        await ctx.close()
        ctx, pg, errs2 = await page(b, 2)
        check('2 hours idle: still signed in', await pg.locator('#ccs-login').count() == 0 and await pg.locator('.ccs-nav').count() > 0)
        await ctx.close()
        ctx, pg, errs3 = await page(b, None)
        check('first visit with no record: still signed in', await pg.locator('#ccs-login').count() == 0)
        stamp = await pg.evaluate("localStorage.getItem('ccs-active')")
        check('use is recorded', stamp is not None)
        await ctx.close(); await b.close()
        check('no page errors', not (errs + errs2 + errs3), errs + errs2 + errs3)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
