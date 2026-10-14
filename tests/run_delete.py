"""Delete order: easy to find for an administrator, any order including paid ones (with a warning), never offered to other roles. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"; R = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else ' -> ' + str(d)[:300]))
async def opn(b, role, ref, vp={'width': 1024, 'height': 768}):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=True); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=orders]')).pop().click()"); await pg.wait_for_timeout(400)
    await pg.fill('#ccs-q', ref); await pg.wait_for_timeout(300)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()"); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await opn(b, 'admin', 'CC-1001')
        lk = pg.locator('#ccs-sheet .ccs-actions [data-act="go-other"]')
        check('admin: a red Delete order link near the top', await lk.count() == 1 and 'delete' in (await lk.inner_text()).lower(), await pg.inner_text('#ccs-sheet .ccs-actions'))
        await lk.click(); await pg.wait_for_timeout(500)
        check('the link opens Other actions with Delete order', await pg.locator('#ccs-sheet .ccs-other [data-v="delete"]').is_visible())
        await pg.click('#ccs-sheet .ccs-other [data-v="delete"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-sheet')
        check('delete asks for the order number and a reason first', await pg.locator('#ccs-sheet [data-act="do-delete"]').count() == 1, t[:300])
        check('no page errors', not errs, errs); await ctx.close()
        ctx, pg, errs = await opn(b, 'admin', 'CC-1004')
        await pg.click('#ccs-sheet .ccs-actions [data-act="go-other"]'); await pg.wait_for_timeout(400); await pg.click('#ccs-sheet .ccs-other [data-v="delete"]'); await pg.wait_for_timeout(400)
        check('admin: paid order can be deleted, with a plain warning about the payment', 'has been paid on this order' in await pg.inner_text('#ccs-sheet') and await pg.locator('#ccs-sheet [data-act="do-delete"]').count() == 1, await pg.inner_text('#ccs-sheet'))
        await ctx.close()
        for role in ['manager', 'front_of_house']:
            ctx, pg, errs = await opn(b, role, 'CC-1001')
            check(f'{role}: no delete anywhere', await pg.locator('#ccs-sheet [data-v="delete"]').count() == 0 and 'delete' not in (await pg.inner_text('#ccs-sheet')).lower())
            await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
