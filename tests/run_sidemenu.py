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
            # UI refinement Batch 1 (14 Oct): the menu stays visible as a slim rail on tablets and small laptops (no Menu button)
            rail = await pg.evaluate("(function(){var r=document.querySelector('.ccs-side').getBoundingClientRect();return [r.left,r.right]})()")
            check(f'{name}: menu always visible as a slim rail on the left', await pg.locator('.ccs-side').is_visible() and rail[0] <= 1 and 60 <= rail[1] <= 110, rail)
            check(f'{name}: no Menu button', await pg.locator('.ccs-menubtn').is_hidden())
            check(f'{name}: page starts right of the rail', await pg.evaluate("document.getElementById('ccs-main').getBoundingClientRect().left") >= rail[1] - 1)
            labels = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-side .ccs-nav-item')).filter(function(e){return e.offsetParent}).map(function(e){return e.innerText.trim()})")
            check(f'{name}: every section named in the rail', all(x in ' '.join(labels) for x in ['Today', 'Orders', 'Calendar', 'Kitchen', 'Settings']), labels)
            await pg.click('.ccs-side [data-tab="calendar"]'); await pg.wait_for_timeout(450)
            check(f'{name}: choosing a section opens it and marks it current', 'Calendar' in await pg.inner_text('#ccs-main h1') and await pg.locator('.ccs-side [data-tab="calendar"][aria-current="page"]').count() == 1)
            if name == 'tablet landscape': await pg.screenshot(path=str(OUT / 'menu-rail.png'))
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
        check('tablet: New order is not in the side menu', await pg.locator('.ccs-side [data-tab="new"]').is_hidden())
        await pg.click('.ccs-side [data-tab="orders"]'); await pg.wait_for_timeout(500)
        nb = await pg.locator('#ccs-main .ccs-newtop').bounding_box()
        check('tablet: New order sits top right of the page', nb and nb['x'] + nb['width'] > 900 and nb['y'] < 160, nb)
        await pg.click('#ccs-main .ccs-newtop'); await pg.wait_for_timeout(500)
        check('tablet: New order opens with the slip beside the step and Next in view', await pg.locator('.sl-live').is_visible() and await pg.evaluate("(function(){var r=document.querySelector('[data-act=sl-next]').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0})()"))
        await pg.screenshot(path=str(OUT / 'tablet-new-order.png'))
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
