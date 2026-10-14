"""Order alerts in Settings: administrators choose who is emailed about new website orders. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"; R = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else ' -> ' + str(d)[:300]))
async def start(b, role, vp={'width': 1024, 'height': 768}):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    await pg.evaluate("(function(){var e=[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop(); e&&e.click()})()"); await pg.wait_for_timeout(700)
    await pg.evaluate("(function(){var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk==='Order alerts'})[0]; if(n) n.click()})()"); await pg.wait_for_timeout(300)
    return ctx, pg, errs
async def calls(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[1]==='admin_alert_settings_save'}).map(function(c){return c[2].p_emails})")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await start(b, 'admin'); t = await pg.inner_text('#ccs-main')
        check('admin: Order alerts section with the current address', 'Order alerts' in t and await pg.input_value('#al-e0') == 'cafe@example.com', t[-400:])
        check('test mode explained', 'Test mode is on' in t and 'owner@example.com' in t)
        check('kitchen slip address shown alongside', 'kitchen@example.com' in t and 'Kitchen printing' in t)
        await pg.click('[data-act="al-add"]'); await pg.wait_for_timeout(200)
        await pg.fill('#al-e1', 'not-an-email'); await pg.click('[data-act="al-save"]'); await pg.wait_for_timeout(300)
        check('a wrong address is refused in plain words, typing kept', 'not-an-email is not an email address' in await pg.inner_text('#ccs-main') and await pg.input_value('#al-e1') == 'not-an-email')
        await pg.fill('#al-e1', 'Manager@Example.com'); await pg.click('[data-act="al-save"]'); await pg.wait_for_timeout(400)
        c = await calls(pg)
        check('two addresses saved', c and c[-1] == ['cafe@example.com', 'Manager@Example.com'] and (await pg.evaluate('window.__al.new_order')) == ['cafe@example.com', 'manager@example.com'], c)
        await pg.click('[data-act="al-del"][data-v="0"]'); await pg.wait_for_timeout(200)
        check('remove takes the row away', (await pg.input_value('#al-e0')).lower() == 'manager@example.com' and await pg.locator('#al-e1').count() == 0)
        await pg.fill('#al-e0', ''); await pg.click('[data-act="al-save"]'); await pg.wait_for_timeout(300)
        check('cannot leave nobody', 'Add at least one email address' in await pg.inner_text('#ccs-main'))
        for _ in range(6): await pg.evaluate("(function(){var e=document.querySelector('[data-act=al-add]'); e&&e.click()})()"); await pg.wait_for_timeout(120)
        check('no more than 5 addresses', await pg.locator('[id^="al-e"]').count() == 5 and await pg.locator('[data-act="al-add"]').count() == 0)
        check('no page errors', not errs, errs); await ctx.close()
        for role in ['front_of_house', 'kitchen']:
            ctx, pg, errs = await start(b, role)
            check(f'{role}: no Order alerts', await pg.locator('[data-act="al-save"]').count() == 0 and 'Order alerts' not in await pg.inner_text('body'))
            await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
