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
        for role, shown in [('front_of_house', False), ('manager', True), ('finance', False), ('marketing', True), ('admin', True)]:
            ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role)
            n = await pg.locator('.ccs-nav [data-tab="dash"]').count()
            check(f'{role}: dashboard tab {"shown" if shown else "hidden"}', (n > 0) == shown, n)
            await ctx.close()
        ctx, pg = await newpage(b, {'width': 1366, 'height': 1000}, errs)
        await pg.click('.ccs-nav [data-tab="dash"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#ccs-main')
        check('summary figures visible', all(x in t for x in ['Orders received', 'completed sales', 'Sales value', 'Cakes sold', 'Average order', 'Payments collected', 'Outstanding', 'Cancellations', 'Refunds', 'Booked ahead']), t[:600])
        check('sheet read times shown', 'Last read: Online sheet' in t and 'Walk-in sheet' in t and 'Not up to date' not in t, t[:400])
        check('completed sales split recorded and assumed', 'recorded in the app' in t and 'assumed from the sheets' in t)
        check('freshness shown', 'Figures as of' in t)
        check('main chart, channels and top cakes on the first view', 'Sales by month' in t and 'By channel' in t and 'Top cakes' in t)
        check('headline changes say up or down in words', any(x in t for x in ['Up ', 'Down ', 'No change']))
        nb = await pg.locator('.dx-secs [data-act="secgo"]').count()
        check('sections: Overview first, then 9 more, one shown at a time', nb == 10 and await pg.locator('.dx-secs [data-v="ov"][aria-selected="true"]').count() == 1 and await pg.locator('.dx-secbody').count() == 0, nb)
        await pg.screenshot(path=str(OUT / 'desk-top.png'))
        async def sec(k):
            await pg.click(f'.dx-secs [data-act="secgo"][data-v="{k}"]'); await pg.wait_for_timeout(250)
            return '' if k == 'ov' else await pg.inner_text('.dx-secbody')
        found = {}
        for k in ['up', 'pr', 'cu', 'pa', 'op', 'de', 'ol', 'df']: found[k] = await sec(k)
        allt = ' '.join(found.values())
        for s in ['Products', 'Customers', 'Payments and pricing', 'Discounts and profit', 'Upcoming business', 'Operations', 'Patterns', 'Cakes by pickup day', 'Year overview', 'Order list', 'How the figures are worked out', 'things to know about this data']:
            check('section: ' + s, s.lower() in allt.lower())
        check('slow sellers flags unsold cake', 'Vanilla or Piña Colada' in found['pr'] and 'No sales in this period' in found['pr'])
        check('profit not invented', 'cake costs are not recorded' in found['pa'])
        await sec('ov')
        await pg.screenshot(path=str(OUT / 'desk-full.png'), full_page=True)
        # tap the cakes sold figure -> drill list
        await pg.click('.dx-minis .dx-mini >> nth=0'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('tapping a figure lists the orders', 'Orders received' in sh and 'orders' in sh and await pg.locator('#ccs-sheet tbody tr').count() > 0, sh[:300])
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        # filter: last 12 months + product + channel; numbers should drop
        def kpi(i): return pg.locator('.dx-top .dx-hv').nth(i).inner_text()
        await pg.select_option('#dx-p', '12'); await pg.wait_for_timeout(300)
        a = await kpi(1)
        await pg.select_option('#dx-prod', 'Cheesecake'); await pg.wait_for_timeout(300)
        bq = await kpi(1)
        check('product filter narrows cakes sold', int(bq.replace(',', '')) < int(a.replace(',', '')), (a, bq))
        await pg.select_option('#dx-ch', 'Online'); await pg.wait_for_timeout(300)
        cq = await kpi(1)
        check('channel filter narrows further', int(cq.replace(',', '')) <= int(bq.replace(',', '')), (bq, cq))
        check('filter label shown', 'Showing Cheesecake only' in await pg.inner_text('#ccs-main'))
        # sections stay open after filtering
        await sec('cu')
        await pg.select_option('#dx-ch', 'all'); await pg.wait_for_timeout(300)
        check('the chosen section stays after a filter change', await pg.locator('.dx-secs [data-v="cu"][aria-selected="true"]').count() == 1)
        await sec('ov')
        await pg.select_option('#dx-prod', 'all'); await pg.select_option('#dx-p', 'c'); await pg.wait_for_timeout(300)
        check('custom dates offer from and to', await pg.locator('#dx-from').count() == 1 and await pg.locator('#dx-to').count() == 1)
        await pg.select_option('#dx-p', 'all'); await pg.wait_for_timeout(300)
        ind = await pg.evaluate("(function(){var a=0,v=0,n=0;window.__regLast.forEach(function(o){a++;if(o.cp!=='recorded'&&o.cp!=='assumed')return;n++;v+=(o.cv!=null?o.cv:o.lv)-(o.ref||0)});return [a,n,Math.round(v)]})()")
        recv = int((await pg.locator('.dx-minis .dx-mini >> nth=0').locator('b').inner_text()).split()[0].replace(',', ''))
        import re as _re
        nsale = int(_re.search(r'([\d,]+) completed sales', await pg.locator('.dx-top .dx-head >> nth=0').inner_text()).group(1).replace(',', ''))
        shown = [recv, nsale, int((await kpi(0)).replace(',', '').replace('$', ''))]
        check('all-time totals match an independent count', shown == ind, (shown, ind))
        # year overview switching
        await sec('de')
        yrs = await pg.locator('[data-act="dx-year"]').count()
        check('year overview offers several years', yrs >= 3, yrs)
        await pg.click('[data-act="dx-year"] >> nth=0'); await pg.wait_for_timeout(300)
        check('year overview switches year', await pg.locator('[data-act="dx-year"][aria-pressed="true"]').first.inner_text() == await pg.locator('[data-act="dx-year"]').first.inner_text())
        # status filter on order list
        await sec('ol')
        await pg.select_option('#dx-st', 'off'); await pg.wait_for_timeout(300)
        rows = await pg.evaluate("Array.from(document.querySelectorAll('.dx-secbody tbody tr')).map(function(r){return r.innerText})")
        check('status filter shows only cancelled', rows and all('Cancelled' in r for r in rows), rows[:3])
        await sec('ov')
        # export
        async with pg.expect_download() as dl:
            await pg.click('[data-act="dx-export"]')
        f = await (await dl.value).path(); csv = open(f).read()
        check('export has summary and order rows', 'Completed sales' in csv and 'Counted by' in csv and 'Order,Order date,Pickup date' in csv and csv.count('\n') > 20, csv[:200])
        # sales exclude cancelled: drill on cakes sold has no cancelled
        await sec('ol'); await pg.select_option('#dx-st', 'all')
        await sec('ov')
        await pg.click('.dx-top .dx-head >> nth=0'); await pg.wait_for_timeout(400)
        st = await pg.evaluate("Array.from(document.querySelectorAll('#ccs-sheet tbody tr')).map(function(r){return r.innerText})")
        check('sales never include cancelled orders', st and not any('Cancelled' in r for r in st))
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        # count by order date
        await pg.select_option('#dx-b', 'o'); await pg.wait_for_timeout(300)
        t = await pg.inner_text('#ccs-main')
        check('count by order date relabels the period', 'by order date' in t, t[:300])
        await sec('df')
        check('order date note explains records left out', 'no reliable order date' in await pg.inner_text('#ccs-main'))
        check('review records explained', 'waiting for a manager to review' in await pg.inner_text('#ccs-main'))
        # a sheet order without an app order opens its register record
        import datetime
        await sec('ol')
        await pg.select_option('#dx-b', 'p'); await pg.select_option('#dx-st', 'completed'); await pg.select_option('#dx-p', 'c'); await pg.wait_for_timeout(300)
        await pg.fill('#dx-from', (datetime.date.today() - datetime.timedelta(days=600)).isoformat()); await pg.wait_for_timeout(200)
        await pg.fill('#dx-to', (datetime.date.today() - datetime.timedelta(days=300)).isoformat()); await pg.wait_for_timeout(300)
        await sec('ol')
        rg = pg.locator('.dx-secbody tr[data-act="rg-open"]')
        check('sheet-only orders link to the register record', await rg.count() > 0)
        await rg.first.click(); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('register record shows the sheet row and history', 'the sheet row as typed' in sh.lower() and 'history' in sh.lower() and 'Column A' in sh, sh[:400])
        await ctx.close()
        # stale and failed sheet reads are shown
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, 'marketing', 'window.__syncStale=true; window.__syncFail=true;')
        await pg.click('.ccs-nav [data-tab="dash"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        check('stale and failed sheet reads warned', 'Not up to date' in t and 'could not be read' in t and 'has not been read since' in t, t[:500])
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
                await pg.evaluate("document.querySelector('.ccs-nav [data-tab=dash]').click()")
            await pg.wait_for_timeout(700)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            check(f'{name}: no sideways scroll', sw <= w, sw)
            await pg.screenshot(path=str(OUT / f'{name}.png'), full_page=False)
            await pg.screenshot(path=str(OUT / f'{name}-full.png'), full_page=True)
            await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
