"""Staff app small refinements: find an order on Today, plain next step, ready message, friendlier labels."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsUX"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
async def page(b, vp, errs, role='front_of_house'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(1000)
    return ctx, pg
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 900), (390, 844)]:
            ctx, pg = await page(b, {'width': w, 'height': h}, errs)
            check(f'{w}: Today has Find an order', await pg.locator('[data-act="tp-find"]').count() == 1)
            await pg.screenshot(path=str(OUT / f'today-{w}.png'))
            await pg.click('[data-act="tp-find"]'); await pg.wait_for_timeout(400)
            await pg.keyboard.type('CC-1002'); await pg.wait_for_timeout(600)
            t = await pg.inner_text('#ccs-main')
            check(f'{w}: typing opens Orders with the match', await pg.eval_on_selector('#ccs-q', 'e=>e.value') == 'CC-1002' and 'CC-1002' in t and 'CC-1001' not in t, t[:300])
            check(f'{w}: search box keeps focus', await pg.evaluate("document.activeElement && document.activeElement.id") == 'ccs-q')
            await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs)
        await pg.click('[data-act="goto"][data-v="action"] >> nth=0'); await pg.wait_for_timeout(500)
        await pg.click('[data-act="secgo"][data-v="all"], [data-act="goto"]', timeout=2000) if False else None
        t = await pg.inner_text('#ccs-main')
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main')
        check('kitchen step reads naturally', 'With the kitchen:' in t and 'Kitchen: ' not in t, t[:800])
        await pg.click('[data-act="open-order"]:has-text("CC-1001")'); await pg.wait_for_timeout(800)
        sh = await pg.inner_text('#ccs-sheet')
        check('order panel says what to do next', 'Next: Check it, then confirm' in sh.replace('\n', ' '), sh[:500])
        check('customer label, not guest', 'Customer' in sh and 'Guest\n' not in sh)
        check('Change order instead of Amend order', 'Change order' in sh and 'Amend order' not in sh)
        await pg.screenshot(path=str(OUT / 'order-next.png'))
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="open-order"]:has-text("CC-1004")'); await pg.wait_for_timeout(800)
        sh = await pg.inner_text('#ccs-sheet')
        check('ready cake: next step says hand it over', 'Cake is ready' in sh, sh[:500])
        a = pg.locator('#ccs-sheet a[data-act="ready-wa"]')
        check('ready cake: Let the customer know button', await a.count() == 1)
        href = await a.get_attribute('href') if await a.count() else ''
        check('WhatsApp message is typed, nothing sent by the system', href.startswith('https://wa.me/') and 'is%20ready' in href and 'CC-1004' in href, href)
        await pg.evaluate("document.querySelector('#ccs-sheet a[data-act=\"ready-wa\"]').removeAttribute('href')")
        await pg.click('#ccs-sheet [data-act="ready-wa"]'); await pg.wait_for_timeout(600)
        check('asks whether the WhatsApp was sent', 'Sent the WhatsApp?' in await pg.inner_text('#ccs-sheet'))
        await pg.screenshot(path=str(OUT / 'order-ready.png'))
        await pg.click('#ccs-sheet [data-act="ready-told"]'); await pg.wait_for_timeout(700)
        c = await pg.evaluate("(window.__calls||[]).filter(function(x){return x[1]==='staff_order_action'}).map(function(x){return x[2]})")
        check('noted in the order history only after staff say it was sent', c and c[-1].get('p_action') == 'note' and 'ready' in (c[-1].get('p_note') or ''), c[-1:] if c else c)
        await ctx.close()
        check('no page errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
