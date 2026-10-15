"""Action-first Today: four actions, live counts that match their lists, urgent line, overview, roles, phone."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsT2"; OUT.mkdir(exist_ok=True)
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
async def listcount(pg):
    return await pg.locator('#ccs-main [data-act="open-order"]').count()
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 900), (820, 1180), (390, 844), (320, 640)]:
            ctx, pg = await page(b, {'width': w, 'height': h}, errs)
            t = await pg.inner_text('#ccs-main')
            check(f'{w}: counter lands on Today with the question', 'What would you like to do?' in t and 'COUNTER' in t.upper())
            check(f'{w}: four action cards', await pg.locator('.tp-act').count() == 4)
            box = await pg.locator('.tp-act').first.bounding_box()
            check(f'{w}: cards are large touch targets', box and box['height'] >= 100 and box['width'] >= 130, box)
            await pg.evaluate("window.scrollTo(300,0)"); ow = await pg.evaluate("window.scrollX"); await pg.evaluate("window.scrollTo(0,0)")
            check(f'{w}: no sideways scroll', ow <= 0, ow)
            await pg.screenshot(path=str(OUT / f'today-{w}.png'))
            await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs)
        t = await pg.inner_text('#ccs-main')
        check('order: question, actions, overview, then lists', t.index('What would you like') < t.index('New cake order') < t.index("Today's overview") < t.index('Waiting on you ('))
        check('kitchen-style management tiles hidden for counter', 'Booked this week' not in t)
        pick = await pg.locator('.tp-act[data-v="today"] em').inner_text()
        due_n = int(pick.split(' ')[0]) if pick[0].isdigit() else 0
        wait = await pg.locator('.tp-act[data-v="action"] em').inner_text()
        wait_n = int(wait.split(' ')[0]) if wait[0].isdigit() else 0
        await pg.click('.tp-act[data-v="today"]'); await pg.wait_for_timeout(500)
        n1 = await listcount(pg)
        check("Today's pickups count matches the list it opens", n1 == due_n, (due_n, n1))
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(400)
        await pg.click('.tp-act[data-v="action"]'); await pg.wait_for_timeout(500)
        n2 = await listcount(pg)
        check('Waiting on you count matches the list it opens', n2 == wait_n, (wait_n, n2))
        check('Orders list says Waiting on you', 'Waiting on you' in await pg.inner_text('#ccs-main'))
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(400)
        await pg.click('.tp-act[data-act="tp-find"]'); await pg.wait_for_timeout(400)
        check('Find an order opens search with the cursor in it', await pg.evaluate("document.activeElement && document.activeElement.id") == 'ccs-q')
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(400)
        await pg.click('.tp-act[data-tab="new"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main') + await pg.evaluate("document.body.innerText")
        check('New cake order opens the existing order steps', 'Standard' in t or 'Custom' in t or 'What cake' in t, t[:300])
        await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900)
        t = await pg.inner_text('#ccs-main')
        check('Waiting on you rows show the action to take', await pg.locator('.tp-nb').count() >= 1)
        check('urgent line only when something is genuinely urgent', await pg.locator('.tp-urg').count() <= 2)
        if await pg.locator('.tp-urg').count():
            await pg.click('.tp-urg >> nth=0'); await pg.wait_for_timeout(400)
            check('urgent line opens the matching orders', await listcount(pg) >= 1)
        await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'manager')
        t = await pg.inner_text('#ccs-main')
        check('manager: same actions on top, management figures kept below', await pg.locator('.tp-act').count() == 4 and 'Booked this week' in t)
        await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'kitchen')
        t = await pg.inner_text('#ccs-main')
        check('kitchen: lands on the kitchen board with its own cards', await pg.locator('.kp-act').count() == 3 and 'What would you like to do' not in t)
        await ctx.close()
        check('no page errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
