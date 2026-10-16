"""The twelve tasks from the touch brief, done by tapping (iPad, phone) or clicking (laptop, desktop). Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / 'shotsTwelve'; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else 'hosted-staff.html'
VPS0 = [('ipad-portrait', 820, 1180, True), ('ipad-landscape', 1180, 820, True), ('laptop', 1366, 768, False), ('desktop', 1920, 1080, False), ('phone', 390, 844, True)]
VPS = [v for v in VPS0 if len(sys.argv) < 3 or v[0] == sys.argv[2]]
R = []
DBG = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else ' -> ' + str(d)[:200]))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, h, touch in VPS:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 760, has_touch=touch); pg = await ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("window.__role='manager'; window.print=function(){};")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900); await pg.evaluate("try{localStorage.clear()}catch(e){}")
            async def hit(sel, wait=450):
                loc = pg.locator(sel).locator('visible=true').first
                if not await loc.count(): return False
                try:
                    await loc.scroll_into_view_if_needed(timeout=2000)
                    if touch: await loc.tap(timeout=3000)
                    else: await loc.click(timeout=3000)
                except Exception as e: print('   [tap failed]', sel, str(e).split('\n')[-2][:160]); return False
                await pg.wait_for_timeout(wait); return True
            async def tab(t):
                await pg.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()"); await pg.wait_for_timeout(300)
                if await hit('[data-tab=%s]' % t, 700): return True
                if await hit('[data-menu=open]', 500): return await hit('#ccs-side [data-tab=%s], [data-tab=%s]' % (t, t), 700)
                if await hit('[data-tab=more]', 500): return await hit('[data-tab=%s]' % t, 700)
                return False
            async def txt(): return await pg.inner_text('body')
            async def close():
                await hit('#ccs-sheet.ccs-open [data-act=close]', 400)
                if await pg.locator('#ccs-sheet.ccs-open').count(): print('   [sheet still open]', (await pg.inner_text('#ccs-sheet'))[:160].replace('\n', ' | '))
            # 1 walk-in order
            ok = await tab('new') and await hit('[data-act="n-cell"][data-v="cheesecake|8"]') and await hit('[data-act=sl-next]')
            if ok: await pg.fill('#n-name', 'Touch Guest'); ok = await hit('[data-act=sl-next]')
            if ok: await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450); await hit('[data-act="sl-opt"][data-v="yes"]'); ok = await hit('[data-act=sl-next]')
            t4 = await txt() if ok else ''
            day = await hit('[data-act=n-date]:not([disabled])') if ok else False
            check(f'{name}: 1 new walk-in order reaches the date step and a day can be tapped', ok and ('When is it needed' in t4 or 'Pickup date' in t4 or 'Step 4' in t4) and day)
            await close(); await pg.keyboard.press('Escape')
            # 2 review an online order, 5 payment status
            ok = await tab('orders') and await hit('#ccs-main [data-act=open], #ccs-main .ccs-card, #ccs-main tr.ccs-click', 700)
            check(f'{name}: 2 an order opens for review', ok and await pg.locator('#ccs-sheet.ccs-open').count() > 0)
            pay = await hit('#ccs-sheet [data-act=at-jump][data-v=payment], #ccs-sheet button:has-text("Payment")')
            check(f'{name}: 5 payment status is one tap away', pay and 'To pay' in await pg.inner_text('#ccs-sheet'))
            # 4 amend cake details
            am = await hit('#ccs-sheet [data-act=panel][data-v=amend]', 600)
            sheet = await pg.inner_text('#ccs-sheet') if am else ''
            savebox = await pg.evaluate("(function(){var b=[].slice.call(document.querySelectorAll('#ccs-sheet [data-act=am-review], #ccs-sheet [data-act=am-save]')).filter(function(x){return x.offsetParent})[0];if(!b)return null;b.scrollIntoView({block:'nearest'});var r=b.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.height>=(%s?47:30)})()" % ('true' if touch else 'false'))
            check(f'{name}: 4 Change order opens with a reachable, finger-sized Review button', am and savebox, savebox)
            await close(); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            # 3 find an order
            await tab('orders')
            q = pg.locator('#ccs-q').locator('visible=true').first
            if await q.count():
                await q.fill('CC-10'); await pg.wait_for_timeout(600)
                check(f'{name}: 3 finding an order by number lists it', 'CC-10' in await pg.inner_text('#ccs-main'))
            else: check(f'{name}: 3 search box on Orders', False)
            # 6 kitchen production, 7 update progress
            ok = await tab('kitchen') and await hit('[data-act=k-mode][data-v=board]', 500)
            check(f'{name}: 6 kitchen board shows the cakes', ok and await pg.locator('#ccs-main [data-act=k-next], #ccs-main [data-act=open-kitchen]').count() > 0)
            if not await pg.locator('#ccs-main [data-act=k-next]').locator('visible=true').count(): await hit('[data-act=secgo][data-g=kitP][data-v=start]', 500)
            nb = pg.locator('#ccs-main [data-act=k-next]').locator('visible=true').first
            hgt = (await nb.bounding_box())['height'] if await nb.count() else 0
            moved = await hit('#ccs-main [data-act=k-next]', 700)
            body = await txt()
            check(f'{name}: 7 a finger-sized stage button moves the cake on, with Undo offered', moved and hgt >= (47 if touch else 32) and 'Undo' in body, hgt)
            # 8 find a returning customer, 9 history
            await tab('customers')
            cq = pg.locator('#ccs-cq').locator('visible=true').first
            if await cq.count(): await cq.fill('Customer A'); await pg.wait_for_timeout(900)
            op = await hit('#ccs-main tr.ccs-click, #ccs-main [data-act=open-customer], #ccs-main .ccs-click', 900)
            check(f'{name}: 8 a customer is found and opens', op and await pg.locator('#ccs-sheet.ccs-open').count() > 0)
            st = await pg.inner_text('#ccs-sheet') if op else ''
            check(f'{name}: 9 their order history shows', any(k in st for k in ('Orders', 'order history', 'History', 'CC-')))
            await close(); await pg.keyboard.press('Escape')
            # 10 occasions, 11 finance
            ok = await tab('dash')
            occ = await hit('[data-act=secgo][data-g=dash][data-v=oc]', 700)
            check(f'{name}: 10 orders by occasion are one tap away', ok and occ and 'Birthday' in await pg.inner_text('#ccs-main'))
            fin = await hit('[data-act=secgo][data-g=dash][data-v=pa]', 700)
            if not fin or 'collected' not in await pg.inner_text('#ccs-main'): print('   [pay]', fin, (await pg.inner_text('#ccs-main'))[:600].replace('\n', ' | '))
            check(f'{name}: 11 payments and revenue open', fin and await pg.locator('[data-act=secgo][data-v=pa][aria-selected=true]').count() > 0 and 'collected' in await pg.inner_text('#ccs-main'))
            # 12 settings
            ok = await tab('settings')
            det = await hit('#ccs-main details > summary', 500)
            check(f'{name}: 12 a settings section opens by tapping its heading', ok and det)
            await pg.screenshot(path=str(OUT / f'{name}-end.png'))
            check(f'{name}: no script errors', not errs, errs[:2])
            await ctx.close()
        await b.close()
    print(f'\n{sum(R)}/{len(R)} passed')
asyncio.run(main())
