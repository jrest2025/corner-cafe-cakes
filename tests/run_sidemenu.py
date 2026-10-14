"""Sliding menu on tablets and laptops (760 to 1279 pixels). Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsStepper"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, vp, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}};")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def side_x(pg): return await pg.evaluate("document.querySelector('.ccs-side').getBoundingClientRect().right")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, vp in [('tablet landscape', {'width': 1024, 'height': 768}), ('tablet portrait', {'width': 820, 'height': 1180}), ('laptop', {'width': 1180, 'height': 800})]:
            ctx, pg, errs = await newpage(b, vp)
            check(f'{name}: menu hidden, page uses the full width', await side_x(pg) <= 1 and await pg.locator('.ccs-side').is_hidden() and await pg.evaluate("document.getElementById('ccs-main').getBoundingClientRect().left") < 5)
            check(f'{name}: Menu button shown top left', await pg.locator('.ccs-menubtn').is_visible() and (await pg.locator('.ccs-menubtn').bounding_box())['x'] < 40)
            await pg.click('.ccs-menubtn'); await pg.wait_for_timeout(400)
            check(f'{name}: Menu slides the menu in over the page', await pg.locator('.ccs-side').is_visible() and await side_x(pg) >= 270 and await pg.get_attribute('.ccs-menubtn', 'aria-expanded') == 'true')
            check(f'{name}: focus moves into the menu', await pg.evaluate("!!document.activeElement.closest('.ccs-side')"))
            if name == 'tablet landscape': await pg.screenshot(path=str(OUT / 'menu-open.png'))
            await pg.click('.ccs-side [data-tab="calendar"]'); await pg.wait_for_timeout(450)
            check(f'{name}: choosing a section opens it and closes the menu', 'Calendar' in await pg.inner_text('#ccs-main h1') and await pg.locator('.ccs-side').is_hidden())
            await pg.click('.ccs-menubtn'); await pg.wait_for_timeout(400)
            await pg.mouse.click(vp['width'] - 40, vp['height'] // 2); await pg.wait_for_timeout(400)
            check(f'{name}: tapping the page beside the menu closes it', await pg.locator('.ccs-side').is_hidden() and 'Calendar' in await pg.inner_text('#ccs-main h1'))
            await pg.click('.ccs-menubtn'); await pg.wait_for_timeout(400); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            check(f'{name}: Escape closes it and returns to the Menu button', await pg.locator('.ccs-side').is_hidden() and await pg.evaluate("document.activeElement.classList.contains('ccs-menubtn')"))
            check(f'{name}: no sideways scroll', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
            check(f'{name}: no page errors', not errs, errs)
            await ctx.close()
        ctx, pg, errs = await newpage(b, {'width': 1366, 'height': 900})
        check('large monitor: menu always shown, no Menu button', await pg.locator('.ccs-side').is_visible() and await pg.locator('.ccs-menubtn').is_hidden())
        await ctx.close()
        ctx, pg, errs = await newpage(b, {'width': 390, 'height': 844})
        check('phone: bottom menu bar unchanged, no Menu button', await pg.locator('.ccs-nav').is_visible() and await pg.locator('.ccs-menubtn').is_hidden())
        await ctx.close()
        ctx, pg, errs = await newpage(b, {'width': 1024, 'height': 768}, role='kitchen')
        check('kitchen login: no Menu button (it has no menu)', await pg.locator('.ccs-menubtn').count() == 0)
        await ctx.close()
        ctx, pg, errs = await newpage(b, {'width': 1024, 'height': 768})
        check('tablet: New order is not in the slide-in menu', await pg.locator('.ccs-side [data-tab="new"]').is_hidden())
        await pg.click('.ccs-menubtn'); await pg.wait_for_timeout(350); await pg.click('.ccs-side [data-tab="orders"]'); await pg.wait_for_timeout(500)
        nb = await pg.locator('#ccs-main .ccs-newtop').bounding_box()
        check('tablet: New order sits top right of the page', nb and nb['x'] + nb['width'] > 900 and nb['y'] < 160, nb)
        await pg.click('#ccs-main .ccs-newtop'); await pg.wait_for_timeout(500)
        check('tablet: New order opens with the slip beside the step and Next in view', await pg.locator('.sl-live').is_visible() and await pg.evaluate("(function(){var r=document.querySelector('[data-act=sl-next]').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()"))
        await pg.screenshot(path=str(OUT / 'tablet-new-order.png'))
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
