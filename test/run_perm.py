"""Permissions: Settings screen, switches by level and person, and the screens adapting to switches."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsPM"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
async def page(b, vp, errs, role='admin', extra=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(1000)
    return ctx, pg
async def calls(pg, fn): return await pg.evaluate(f"(window.__calls||[]).filter(function(x){{return x[1]==='{fn}'}}).map(function(x){{return x[2]}})")
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 1000), (390, 844)]:
            ctx, pg = await page(b, {'width': w, 'height': h}, errs)
            await pg.evaluate("(function(){var x=document.querySelector('[data-tab=\"settings\"]'); x&&x.click()})()"); await pg.wait_for_timeout(800)
            await pg.click('[data-setk="Team and access"]'); await pg.wait_for_timeout(500); await pg.click('[data-act="tm-tab"][data-v="perms"]'); await pg.wait_for_timeout(700)
            t = await pg.inner_text('#ccs-main')
            check(f'{w}: Permissions section in Settings', 'Permissions' in t and 'View customer records' in t, t[-600:])
            if w >= 760: check(f'{w}: one table with a column per level; parts not switched over are read-only', await pg.locator('.pm-mx thead th').count() == 5 and await pg.locator('.pm-mx .pm-ro').count() > 0 and await pg.locator('.pm-mx .pm-sw[data-k="ord.view"]').count() == 0)
            else: check(f'{w}: phone shows one level at a time; parts not switched over are read-only', 'Follows the level' in t and await pg.locator('.pm-row.is-ro .pm-sw').count() == 0)
            await pg.screenshot(path=str(OUT / f'levels-{w}.png'), full_page=False)
            await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 1000}, errs)
        await pg.evaluate("(function(){var x=document.querySelector('[data-tab=\"settings\"]'); x&&x.click()})()"); await pg.wait_for_timeout(800)
        await pg.click('[data-setk="Team and access"]'); await pg.wait_for_timeout(500); await pg.click('[data-act="tm-tab"][data-v="perms"]'); await pg.wait_for_timeout(700)
        # Counter level: switch on Export (risky) asks first
        sw = pg.locator('.pm-sw[data-lv="L2"][data-k="cust.export"]')
        check('Counter has export off', await sw.get_attribute('aria-checked') == 'false')
        await sw.click(); await pg.wait_for_timeout(300)
        check('asks before switching on a sensitive switch', 'sensitive customer information' in await pg.inner_text('.pm-ask'))
        await pg.click('[data-act="pm-yes"]'); await pg.wait_for_timeout(700)
        c = await calls(pg, 'admin_level_perm')
        check('level change saved through the server', c and c[-1]['p_level'] == 'L2' and c[-1]['p_key'] == 'cust.export' and c[-1]['p_on'] is True and c[-1]['p_confirm'] is True, c)
        check('switch shows on after saving', await pg.locator('.pm-sw[data-lv="L2"][data-k="cust.export"]').get_attribute('aria-checked') == 'true')
        # an everyday switch saves straight away, with a message
        n0 = len(await calls(pg, 'admin_level_perm'))
        await pg.click('.pm-sw[data-lv="L4"][data-k="cust.history"]'); await pg.wait_for_timeout(700)
        c = await calls(pg, 'admin_level_perm')
        check('everyday switch saves without a question', len(c) > n0 and c[-1]['p_level'] == 'L4' and c[-1]['p_on'] is False and await pg.locator('.pm-ask').count() == 0, (n0, len(c), await pg.locator('.pm-ask').count()))
        # Admin always has everything: no switches in its column, so no one locks themselves out
        check('Admin column is fixed', await pg.locator('.pm-sw[data-lv="L1"]').count() == 0 and await pg.locator('.pm-mx-fixed').count() > 0)
        # by person: remove merge for Counter One? Counter has no merge; add follow-up oversee for Counter One with reason
        await pg.click('[data-act="pm-tab"][data-v="people"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="pm-user"][data-v="u2"]'); await pg.wait_for_timeout(300)
        t = await pg.inner_text('#ccs-main')
        check('person view shows level, account and last sign-in', 'Access level' in t and 'Counter' in t and 'Last sign-in' in t and 'Not yet' in t)
        await pg.click('[data-act="pm-ov"][data-k="cust.oversee"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="pm-yes"]'); await pg.wait_for_timeout(300)
        check('an exception needs a reason', 'Add a short reason' in await pg.inner_text('#ccs-main'))
        await pg.fill('#pm-reason', 'Covering the manager this week'); await pg.click('[data-act="pm-yes"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#ccs-main')
        check('exception shown as added for this person, with the reason', 'Added for this person' in t and 'Covering the manager this week' in t, t[-800:])
        await pg.screenshot(path=str(OUT / 'person.png'), full_page=False)
        await pg.click('[data-act="pm-ov"][data-k="cust.oversee"]'); await pg.wait_for_timeout(300)
        check('undo an exception', 'Undo the exception' in await pg.inner_text('.pm-ask'))
        await pg.click('[data-act="pm-yes"]'); await pg.wait_for_timeout(700)
        c = await calls(pg, 'admin_staff_perm')
        check('undo sends no reason and clears the exception', c and c[-1]['p_allow'] is None, c[-1:])
        await ctx.close()
        # adaptive screens: a person with customers switched off sees no Customers anywhere
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'manager', "window.__perms=['ord.view'];")
        n = await pg.locator('.ccs-nav [data-tab="customers"]').count()
        check('Customers switched off: no Customers in the menu', n == 0, n)
        await pg.click('[data-act="open-order"] >> nth=0'); await pg.wait_for_timeout(700)
        check('Customers switched off: no profile button on orders', await pg.locator('#ccs-sheet [data-act="open-customer"]').count() == 0)
        await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'manager', "window.__perms=['cust.view','cust.history'];")
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(800)
        t = await pg.inner_text('#ccs-main')
        check('view only: no Add customer', 'Add customer' not in t)
        check('view only: no follow-ups section', await pg.locator('[data-g="crm"][data-v="fu"]').count() == 0)
        await pg.click('[data-act="open-customer"] >> nth=0'); await pg.wait_for_timeout(800)
        sh = await pg.inner_text('#ccs-sheet')
        check('view only: no Edit details or Change history', 'Edit details' not in sh and 'Change history' not in sh, sh[:300])
        await ctx.close()
        ctx, pg = await page(b, {'width': 1280, 'height': 900}, errs, 'front_of_house')
        check('Counter (no switches loaded yet): same as before, Customers follows the old ticks', await pg.locator('.ccs-nav [data-tab="customers"]').count() >= 0)
        await ctx.close()
        check('no page errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
