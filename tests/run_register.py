"""Cake register and order delete checks on the local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsR"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager', extra=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"window.__calls ? window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}}) : null")

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for role, shown in [('front_of_house', False), ('finance', False), ('marketing', False), ('manager', True), ('admin', True)]:
            ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role)
            n = await pg.locator('.ccs-nav [data-tab="register"]').count()
            check(f'{role}: register tab {"shown" if shown else "hidden"}', (n > 0) == shown, n)
            await ctx.close()
        ctx, pg = await newpage(b, {'width': 1366, 'height': 1000}, errs)
        await pg.click('.ccs-nav [data-tab="register"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        check('register heading and sync line', 'Cake register' in t and 'Last read: Online sheet' in t, t[:300])
        check('three records waiting', await pg.locator('.rg-card').count() == 3)
        check('flags in plain words', 'Same phone, pickup date, cake and size as another order' in t and 'No pickup date in the sheet' in t and 'Looks like a test entry' in t)
        check('possible match shown beside the record', 'Possible match' in t and 'H-0301' in t)
        await pg.screenshot(path=str(OUT / 'desk.png'), full_page=True)
        # sheet row toggle
        await pg.click('.rg-card >> nth=0 >> [data-act="rg-raw"]'); await pg.wait_for_timeout(200)
        check('sheet row shown with column letters', 'Column A' in await pg.inner_text('.rg-card >> nth=0'))
        # leave out needs a reason
        await pg.click('.rg-card >> nth=0 >> [data-act="rg-ask"][data-v="duplicate"]'); await pg.wait_for_timeout(200)
        await pg.click('.rg-card >> nth=0 >> [data-act="rg-do"]'); await pg.wait_for_timeout(300)
        check('merge refused without a reason', 'Add a short reason' in await pg.inner_text('.rg-card >> nth=0') and not await calls(pg, 'register_decide'))
        await pg.fill('#rg-note', 'Same customer and cake, typed in both sheets'); await pg.click('.rg-card >> nth=0 >> [data-act="rg-do"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'register_decide')
        check('merge sent with the reason', c and c[-1]['p_decision'] == 'duplicate' and 'both sheets' in c[-1]['p_note'], c)
        check('card removed and decision listed', await pg.locator('.rg-card').count() == 2 and 'Same order, left out' in await pg.inner_text('#ccs-main'))
        # accept without a reason
        await pg.click('.rg-card >> nth=0 >> [data-act="rg-do"][data-v="accept"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'register_decide')
        check('details accepted in one tap', c[-1]['p_decision'] == 'accept' and await pg.locator('.rg-card').count() == 1, c[-1])
        # undo needs a second tap
        u = pg.locator('[data-act="rg-undo"]').first
        await u.click(); await pg.wait_for_timeout(150)
        check('undo asks for a second tap', 'Tap again' in await u.inner_text() and len(await calls(pg, 'register_decide')) == 2)
        await u.click(); await pg.wait_for_timeout(600)
        check('undo sent', (await calls(pg, 'register_decide'))[-1]['p_decision'] == 'undo')
        # full record
        await pg.click('.rg-card >> nth=0 >> text=Full record'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('full record shows history and edits', 'Added to the register' in sh and 'size inch: 6 to 8' in sh, sh[-400:])
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(200)
        await ctx.close()
        # stale warning in the register
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, 'manager', 'window.__syncStale=true;')
        await pg.click('.ccs-nav [data-tab="register"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        check('register warns when a sheet is not being read', 'Not up to date' in t and 'Google script' in t, t[:400])
        await ctx.close()
        # phone
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs)
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="register"]'); await pg.wait_for_timeout(600)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('phone: register reachable from More, no sideways scroll', await pg.locator('.rg-card').count() > 0 and sw <= 390, sw)
        await pg.screenshot(path=str(OUT / 'phone.png'), full_page=True)
        await ctx.close()

        # ----- delete -----
        for role in ['manager', 'front_of_house']:
            ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role)
            await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(400)
            await pg.evaluate("window.__orders && null"); await pg.locator('[data-act="open-order"][data-id="o1"]').first.click(); await pg.wait_for_timeout(500)
            check(f'{role}: no delete option', await pg.locator('#ccs-sheet [data-v="delete"]').count() == 0)
            await ctx.close()
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, 'admin')
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(400)
        await pg.locator('[data-act="open-order"][data-id="o3"]').first.click(); await pg.wait_for_timeout(500)
        check('admin: no delete on an order with a payment', await pg.locator('#ccs-sheet [data-v="delete"]').count() == 0)
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(200)
        await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(400)
        await pg.locator('[data-act="open-order"][data-id="o1"]').first.click(); await pg.wait_for_timeout(500)
        d = pg.locator('#ccs-sheet [data-v="delete"]')
        check('admin: delete offered on an unpaid order', await d.count() == 1)
        await d.click(); await pg.wait_for_timeout(300)
        sh = await pg.inner_text('#ccs-sheet')
        check('delete explains hide, keep and restore', 'kept with your name and reason' in sh and 'restore it from Settings' in sh)
        await pg.fill('#ccs-note', 'Test order'); await pg.fill('#ccs-delref', 'CC-9999'); await pg.click('[data-act="do-delete"]'); await pg.wait_for_timeout(300)
        check('wrong order number refused, typing kept', 'exactly as shown: CC-1001' in await pg.inner_text('#ccs-sheet') and await pg.input_value('#ccs-note') == 'Test order' and not await calls(pg, 'admin_delete_order'))
        await pg.fill('#ccs-note', ''); await pg.fill('#ccs-delref', 'cc-1001'); await pg.click('[data-act="do-delete"]'); await pg.wait_for_timeout(300)
        check('reason required', 'Say why' in await pg.inner_text('#ccs-sheet') and not await calls(pg, 'admin_delete_order'))
        await pg.fill('#ccs-note', 'Test order entered while training'); await pg.click('[data-act="do-delete"]'); await pg.wait_for_timeout(700)
        c = await calls(pg, 'admin_delete_order')
        check('delete sent with order, number and reason', c and c[-1]['p_order'] == 'o1' and c[-1]['p_reference'] == 'cc-1001' and 'training' in c[-1]['p_reason'], c)
        check('sheet closed and toast names the order', not await pg.locator('#ccs-sheet.ccs-open').count() and 'CC-1001 deleted' in await pg.inner_text('#ccs-toast'))
        await pg.click('.ccs-nav [data-tab="settings"]'); await pg.wait_for_timeout(600)
        await pg.click('summary:has-text("Deleted orders")'); await pg.wait_for_timeout(200)
        t = await pg.inner_text('#ccs-main')
        check('deleted orders list shows who and why', 'CC-1001' in t and 'Test Admin' in t and 'training' in t, t[-500:])
        r = pg.locator('[data-act="del-restore"]').first
        await r.click(); await pg.wait_for_timeout(150)
        check('restore asks for a second tap', 'Tap again' in await r.inner_text() and not await calls(pg, 'admin_restore_order'))
        await r.click(); await pg.wait_for_timeout(700)
        check('restore sent', (await calls(pg, 'admin_restore_order'))[-1]['p_order'] == 'o1')
        await pg.screenshot(path=str(OUT / 'settings-deleted.png'), full_page=True)
        await ctx.close()
        # blank quote price must be refused (the app's number reader must not be replaced by the dashboard's)
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, 'manager')
        await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(400)
        await pg.locator('[data-act="open-order"][data-id="o2"]').first.click(); await pg.wait_for_timeout(500)
        await pg.click('#ccs-sheet [data-act="panel"][data-v="confirm"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ccs-price', ''); await pg.click('[data-act="do-confirm"]'); await pg.wait_for_timeout(300)
        check('blank quote price refused', 'Enter the price' in await pg.inner_text('#ccs-sheet'))
        await pg.fill('#ccs-price', '$1,250'); await pg.click('[data-act="do-confirm"]'); await pg.wait_for_timeout(300)
        c = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_order_action'}).map(function(c){return c[2].p_final_total})")
        check('price with $ and comma read correctly', c and c[-1] == 1250, c)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
