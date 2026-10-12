"""Dashboard checks on the local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsD"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='marketing', extra=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760, accept_downloads=True); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for role, shown in [('front_of_house', False), ('manager', False), ('finance', False), ('marketing', True), ('admin', True)]:
            ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role)
            n = await pg.locator('.ccs-nav [data-tab="dash"]').count()
            check(f'{role}: dashboard tab {"shown" if shown else "hidden"}', (n > 0) == shown, n)
            await ctx.close()
        ctx, pg = await newpage(b, {'width': 1366, 'height': 1000}, errs)
        await pg.click('.ccs-nav [data-tab="dash"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#ccs-main')
        check('summary figures visible', all(x in t for x in ['Cakes sold', 'Collected orders', 'Net sales', 'Average order', 'Booked ahead', 'Cash collected']), t[:600])
        check('freshness shown', 'Figures as of' in t)
        check('data notes shown', 'things to know about this data' in t)
        await pg.screenshot(path=str(OUT / 'desk-top.png'))
        # open all sections
        await pg.evaluate("document.querySelectorAll('.dx-sec').forEach(function(d){d.open=true})")
        t = await pg.inner_text('#ccs-main')
        for s in ['Month by month', 'Products', 'Order channels', 'Customers', 'Payments', 'Upcoming business', 'Operations', 'Discounts and profit', 'Demand patterns', 'Year overview', 'Order list', 'How the figures are worked out']:
            check('section: ' + s, s in t)
        check('slow sellers flags unsold cake', 'Vanilla or Piña Colada' in t and 'No sales in this period' in t)
        check('profit not invented', 'cake costs are not recorded' in t)
        await pg.screenshot(path=str(OUT / 'desk-full.png'), full_page=True)
        # tap the cakes sold figure -> drill list
        await pg.click('.dx-kpis .dx-kpi >> nth=0'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('tapping a figure lists the orders', 'Cakes sold' in sh and 'orders' in sh and await pg.locator('#ccs-sheet tbody tr').count() > 0, sh[:300])
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        # filter: last 12 months + product + channel; numbers should drop
        def kpi(i): return pg.locator('.dx-kpis').first.locator('.ccs-kpi-n').nth(i).inner_text()
        await pg.select_option('#dx-p', '12'); await pg.wait_for_timeout(300)
        a = await kpi(0)
        await pg.select_option('#dx-prod', 'Cheesecake'); await pg.wait_for_timeout(300)
        bq = await kpi(0)
        check('product filter narrows cakes sold', int(bq.replace(',', '')) < int(a.replace(',', '')), (a, bq))
        await pg.select_option('#dx-ch', 'online'); await pg.wait_for_timeout(300)
        cq = await kpi(0)
        check('channel filter narrows further', int(cq.replace(',', '')) <= int(bq.replace(',', '')), (bq, cq))
        check('filter label shown', 'Showing Cheesecake only' in await pg.inner_text('#ccs-main'))
        # sections stay open after filtering
        await pg.evaluate("document.querySelectorAll('.dx-sec').forEach(function(d){d.open=true})")
        await pg.select_option('#dx-ch', 'all'); await pg.wait_for_timeout(300)
        check('sections stay open after a filter change', await pg.locator('.dx-sec[open]').count() >= 10)
        await pg.select_option('#dx-prod', 'all'); await pg.select_option('#dx-p', 'c'); await pg.wait_for_timeout(300)
        check('custom dates offer from and to', await pg.locator('#dx-from').count() == 1 and await pg.locator('#dx-to').count() == 1)
        await pg.select_option('#dx-p', 'all'); await pg.wait_for_timeout(300)
        ind = await pg.evaluate("(function(){var c=0,v=0,n=0;window.__dashLast.forEach(function(o){if(o.st!=='completed')return;n++;o.it.forEach(function(i){c+=i[3]});var r=0;(o.pay||[]).forEach(function(p){if(p[0]==='refund')r+=p[1]});v+=(o.fin!=null?o.fin:o.est)-r});return [c,n,Math.round(v)]})()")
        shown = [int((await kpi(i)).replace(',', '').replace('$', '')) for i in range(3)]
        check('all-time totals match an independent count', shown == ind, (shown, ind))
        # year overview switching
        yrs = await pg.locator('[data-act="dx-year"]').count()
        check('year overview offers several years', yrs >= 3, yrs)
        await pg.click('[data-act="dx-year"] >> nth=0'); await pg.wait_for_timeout(300)
        check('year overview switches year', await pg.locator('[data-act="dx-year"][aria-pressed="true"]').first.inner_text() == await pg.locator('[data-act="dx-year"]').first.inner_text())
        # status filter on order list
        await pg.select_option('#dx-st', 'off'); await pg.wait_for_timeout(300)
        rows = await pg.evaluate("Array.from(document.querySelectorAll('[data-dxsec=\"ol\"] tbody tr')).map(function(r){return r.innerText})")
        check('status filter shows only cancelled or declined', rows and all('Cancelled' in r or 'Declined' in r for r in rows), rows[:3])
        # export
        async with pg.expect_download() as dl:
            await pg.click('[data-act="dx-export"]')
        f = await (await dl.value).path(); csv = open(f).read()
        check('export has summary and order rows', 'Cakes sold' in csv and 'Order,Order date,Pickup date' in csv and csv.count('\n') > 20, csv[:200])
        # sales exclude cancelled: drill on cakes sold has no cancelled
        await pg.select_option('#dx-st', 'all')
        await pg.click('.dx-kpis .dx-kpi >> nth=0'); await pg.wait_for_timeout(400)
        st = await pg.evaluate("Array.from(document.querySelectorAll('#ccs-sheet tbody tr')).map(function(r){return r.innerText})")
        check('sales never include cancelled orders', st and not any('Cancelled' in r for r in st))
        await ctx.close()
        # access refused message
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, 'marketing', 'window.__dashFail=true;')
        await pg.click('.ccs-nav [data-tab="dash"]'); await pg.wait_for_timeout(500)
        check('server refusal shown plainly', 'does not have access' in await pg.inner_text('#ccs-main'))
        await ctx.close()
        # tablet and phone
        for w, h, name in [(1024, 768, 'tablet'), (390, 844, 'phone')]:
            ctx, pg = await newpage(b, {'width': w, 'height': h}, errs)
            if w < 760:
                await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
                await pg.click('#ccs-sheet [data-tab="dash"]')
            else:
                await pg.click('.ccs-nav [data-tab="dash"]')
            await pg.wait_for_timeout(700)
            await pg.evaluate("document.querySelectorAll('.dx-sec').forEach(function(d){d.open=true})")
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            check(f'{name}: no sideways scroll', sw <= w, sw)
            await pg.screenshot(path=str(OUT / f'{name}.png'), full_page=False)
            await pg.screenshot(path=str(OUT / f'{name}-full.png'), full_page=True)
            await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
