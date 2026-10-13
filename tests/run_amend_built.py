"""Amend order checks on the local copy with invented data."""
import asyncio, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsA"; OUT.mkdir(exist_ok=True)
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d) if not ok and d != '' else ''))
async def page(b, role, vp, errs):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'")
    await pg.goto((HERE / "built-staff5.html").as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg
async def open_o1(pg, phone):
    if phone: await pg.click('.ccs-nav [data-tab="orders"]')
    else: await pg.click('.ccs-nav [data-tab="orders"]')
    await pg.wait_for_timeout(200)
    await pg.click('[data-act="open-order"][data-id="o1"]'); await pg.wait_for_timeout(400)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for name, vp in [('desk', {"width": 1280, "height": 860}), ('phone', {"width": 390, "height": 844})]:
            ctx, pg = await page(b, 'manager', vp, errs)
            await open_o1(pg, name == 'phone')
            check(f'{name} Amend order button shown', await pg.locator('[data-act="panel"][data-v="amend"]').count() == 1)
            await pg.click('[data-act="panel"][data-v="amend"]'); await pg.wait_for_timeout(250)
            await pg.screenshot(path=str(OUT / f'{name}-1-form.png'))
            # nothing changed yet
            await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(200)
            check(f'{name} review with no change is refused', 'Nothing has changed' in await pg.inner_text('#ccs-sheet'))
            await pg.select_option('#am-time', '16:00')
            await pg.click('[data-act="am-open"][data-v="cake"]'); await pg.wait_for_timeout(150)
            await pg.click('[data-act="am-set"][data-f="size"][data-v="10"]'); await pg.wait_for_timeout(150)
            await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(200)
            check(f'{name} asks who requested the change', 'Choose who asked' in await pg.inner_text('#ccs-sheet'))
            await pg.click('[data-act="am-set"][data-f="by"][data-v="guest"]'); await pg.wait_for_timeout(120)
            await pg.fill('#am-reason', 'Guest increased the number of servings')
            await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#ccs-sheet')
            check(f'{name} review shows before and after', 'collection time' in t.lower() and '4:00pm' in t and '10-inch' in t and 'new total' in t.lower(), t[:300])
            calls = await pg.evaluate("window.__calls.filter(c=>c[1]==='staff_amend_order').map(c=>c[2])")
            check(f'{name} preview sends only changed fields, not saved', calls[-1]['p_commit'] is False and set(calls[-1]['p_changes'].keys()) == {'time', 'size_inch'}, calls[-1])
            await pg.screenshot(path=str(OUT / f'{name}-2-review.png'), full_page=False)
            await pg.click('[data-act="am-edit"]'); await pg.wait_for_timeout(150)
            check(f'{name} back to edit keeps the entries', await pg.eval_on_selector('#am-reason', 'e=>e.value') == 'Guest increased the number of servings' and await pg.eval_on_selector('#am-time', 'e=>e.value') == '16:00')
            await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act="am-save"]'); await pg.wait_for_timeout(500)
            calls = await pg.evaluate("window.__calls.filter(c=>c[1]==='staff_amend_order').map(c=>c[2])")
            check(f'{name} save sends commit with version', calls[-1]['p_commit'] is True and calls[-1]['p_version'] == 1 and calls[-1]['p_requested_by'] == 'guest')
            t = await pg.inner_text('#ccs-sheet')
            check(f'{name} change history shows the amendment', 'change history' in t.lower() and 'Revision 1' in t and 'Guest increased' in t and 'Amended' in t, t[:400])
            await pg.screenshot(path=str(OUT / f'{name}-3-history.png'), full_page=False)
            await ctx.close()
        # stale version
        ctx, pg = await page(b, 'manager', {"width": 1280, "height": 860}, errs)
        await pg.evaluate("window.__amendStale = true"); await open_o1(pg, False)
        await pg.click('[data-act="panel"][data-v="amend"]'); await pg.select_option('#am-time', '16:00')
        await pg.click('[data-act="am-set"][data-f="by"][data-v="staff"]'); await pg.fill('#am-reason', 'Kitchen running late')
        await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('body')
        check('two people editing: second is told to review the latest, typing kept', 'Someone else updated this order' in t and 'Your typing is kept' in t)
        await ctx.close()
        # front of house cannot change price; kitchen cannot amend
        ctx, pg = await page(b, 'front_of_house', {"width": 1280, "height": 860}, errs); await open_o1(pg, False)
        await pg.click('[data-act="panel"][data-v="amend"]')
        check('front of house has no price field', await pg.locator('[data-v="price"]').count() == 0)
        await ctx.close()
        # kitchen acknowledgement
        ctx, pg = await page(b, 'kitchen', {"width": 1180, "height": 820}, errs); await pg.wait_for_timeout(300)
        check('kitchen card flags the change', 'Changed: kitchen to confirm' in await pg.inner_text('#ccs-main'))
        await pg.click('[data-act="open-kitchen"][data-id="o1"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-sheet')
        check('kitchen sees exactly what changed', 'changed after you started' in t and 'Happy 40th Sam' in t and '10-inch' in t, t[:300])
        await pg.screenshot(path=str(OUT / 'kitchen-ack.png'))
        await pg.click('[data-act="k-ack"]'); await pg.wait_for_timeout(200)
        check('kitchen must give a name', 'Enter your name' in await pg.inner_text('#ccs-sheet'))
        await pg.fill('#k-ack', 'Baker One'); await pg.click('[data-act="k-ack"]'); await pg.wait_for_timeout(400)
        calls = await pg.evaluate("window.__calls.filter(c=>c[1]==='kitchen_ack_amendment').map(c=>c[2])")
        check('kitchen acknowledgement sent', calls and calls[-1]['p_name'] == 'Baker One')
        await ctx.close()
        check('no script errors', not errs, errs)
        await b.close()
    print(f"\n{sum(R)} of {len(R)} checks passed")
asyncio.run(main())
