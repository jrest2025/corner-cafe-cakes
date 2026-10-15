"""Kitchen, Phase 2: three large cards above the unchanged board; counts match what they open."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsK2"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
async def page(b, vp, errs, role='kitchen'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(1200)
    return ctx, pg
def num(s): return int(s.split(' ')[0]) if s and s[0].isdigit() else 0
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 900), (1024, 768), (390, 844)]:
            ctx, pg = await page(b, {'width': w, 'height': h}, errs)
            t = await pg.inner_text('#ccs-main')
            check(f'{w}: kitchen asks What\'s on today?', "What's on today?" in t and 'KITCHEN' in t.upper())
            check(f'{w}: three cards', await pg.locator('.kp-act').count() == 3)
            check(f'{w}: board still there below', await pg.locator('.ccs-board').count() == 1)
            await pg.evaluate("window.scrollTo(300,0)"); check(f'{w}: no sideways scroll', await pg.evaluate("window.scrollX") == 0)
            await pg.screenshot(path=str(OUT / f'kitchen-{w}.png'))
            await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs)
        rows = await pg.evaluate("(window.__kitLast||null)")
        mk = num(await pg.locator('.kp-act[data-v="today"] em').inner_text())
        await pg.click('.kp-act[data-v="today"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main')
        check('To make today shows only cakes to make, with a way back', 'Showing cakes to make today' in t)
        n_today_open = await pg.locator('.ccs-board .ccs-kcard').count()
        check('To make today count matches the board', n_today_open == mk, (mk, n_today_open))
        await pg.click('[data-act="k-focus-off"]'); await pg.wait_for_timeout(400)
        rd = num(await pg.locator('.kp-act[data-v="ready"] em').inner_text())
        await pg.click('.kp-act[data-v="ready"]'); await pg.wait_for_timeout(500)
        n_ready = await pg.locator('.ccs-col-ready .ccs-kcard').count()
        check('Ready to hand over count matches the Ready column', n_ready == rd, (rd, n_ready))
        check('the kitchen board shows no prices or payments', '$' not in await pg.inner_text('.ccs-board'))
        await pg.click('.ccs-kcard >> nth=0'); await pg.wait_for_timeout(700)
        sh = await pg.inner_text('#ccs-sheet')
        check('kitchen card still opens the kitchen view of the order', len(sh) > 20 and 'To pay' not in sh and 'Paid' not in sh, sh[:200])
        await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'front_of_house')
        check('counter still lands on Today (not the kitchen)', await pg.locator('.tp-act').count() == 4)
        await ctx.close()
        check('no page errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
