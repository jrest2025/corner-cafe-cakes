"""Three access levels: each login sees only its own screens. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"; R = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else ' -> ' + str(d)[:300]))
async def start(b, role, vp={'width': 1280, 'height': 800}):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700); return ctx, pg, errs
async def tabs(pg): return await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-nav [data-tab]')).map(function(b){return b.dataset.tab})")
async def open_order(pg, ref):
    await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=orders]')).pop().click()"); await pg.wait_for_timeout(400)
    await pg.fill('#ccs-q', ref); await pg.wait_for_timeout(300)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()"); await pg.wait_for_timeout(700)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await start(b, 'admin'); t = await tabs(pg)
        check('admin sees every screen', all(x in t for x in ['today', 'orders', 'calendar', 'kitchen', 'dash', 'register', 'customers', 'settings']), t)
        await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop().click()"); await pg.wait_for_timeout(700)
        opts = await pg.evaluate("(function(){var s=document.querySelector('#tm-new-r'); return s? [].slice.call(s.options).map(function(o){return o.text}) : null})()")
        check('new staff login offers exactly Admin, Counter, Kitchen', opts == ['Admin', 'Counter', 'Kitchen'], opts)
        check('no page errors (admin)', not errs, errs); await ctx.close()
        ctx, pg, errs = await start(b, 'front_of_house'); t = await tabs(pg)
        check('counter sees Today, Orders, Calendar, Kitchen only, with New order as a button, not a menu tab', set(t) - {'more'} == {'today', 'orders', 'calendar', 'kitchen'} and await pg.locator('[data-tab="new"].ccs-new').count() >= 1, t)
        check('counter role named Counter', 'Counter' in await pg.inner_text('body'))
        await open_order(pg, 'CC-1001')
        check('counter: order shows no customer profile button', await pg.locator('#ccs-sheet [data-act="open-customer"]').count() == 0)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await open_order(pg, 'CC-1003')
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet .ccs-secbar [data-v=history], #ccs-sheet [data-act=secgo][data-v=history]'); b&&b.click()})()"); await pg.wait_for_timeout(400)
        lk = pg.locator('#ccs-sheet .ccs-other [data-v="cancel-locked"]')
        check('counter: paid order cancel is locked', await lk.count() == 1 and await pg.locator('#ccs-sheet .ccs-other [data-v="cancel"]').count() == 0)
        await lk.click(); await pg.wait_for_timeout(300)
        check('counter: locked cancel explains an Admin must cancel', 'only an Admin can cancel it' in await pg.inner_text('#ccs-sheet'))
        check('counter: no delete', await pg.locator('#ccs-sheet [data-v="delete"], #ccs-sheet [data-act="go-other"]').count() == 0)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await open_order(pg, 'CC-1001')
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]'); b&&b.click()})()"); await pg.wait_for_timeout(400)
        check('counter: unpaid order can be cancelled', await pg.locator('#ccs-sheet .ccs-other [data-v="cancel"]').count() == 1)
        check('no page errors (counter)', not errs, errs); await ctx.close()
        ctx, pg, errs = await start(b, 'front_of_house', {'width': 390, 'height': 844})
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(400)
        m = await pg.inner_text('#ccs-sheet')
        check('counter phone More: Kitchen only, no Customers, Dashboard, Register or Settings', 'Kitchen' in m and not any(x in m for x in ['Customers', 'Dashboard', 'Cake register', 'Settings']), m[:300])
        await ctx.close()
        ctx, pg, errs = await start(b, 'kitchen'); t = await tabs(pg)
        check('kitchen sees the kitchen board only', t == ['kitchen'], t)
        check('kitchen sees no prices', '$' not in await pg.inner_text('#ccs-main'))
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
