"""Dashboard Overview: layout at three widths, figures against an independent count, toggles, drills, no errors."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsOV"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
async def open_dash(b, vp, errs):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__role='admin'; try{localStorage.clear()}catch(e){}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900)
    await pg.evaluate("(function(){var b=document.querySelector('.ccs-nav [data-tab=\"dash\"]')||document.querySelector('[data-tab=\"dash\"]'); b&&b.click()})()")
    await pg.wait_for_timeout(900)
    return ctx, pg
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 1000), (1024, 900), (390, 844)]:
            ctx, pg = await open_dash(b, {'width': w, 'height': h}, errs)
            t = await pg.inner_text('#ccs-main')
            for s in ['Total orders', 'Revenue', 'Average order value', 'Completion rate', 'Orders and revenue over time', 'Order status', 'Top selling cakes', 'Customer insights', 'Peak pickup times', 'Needs attention', 'Recent activity', 'Insights']:
                check(f'{w}: {s} shown', s in t)
            ow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(f'{w}: no sideways scroll', ow <= 0, ow)
            await pg.screenshot(path=str(OUT / f'ov-{w}-top.png'))
            await pg.set_viewport_size({'width': w, 'height': 3400 if w < 760 else 2000}); await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(OUT / f'ov-{w}.png'))
            await ctx.close()
        ctx, pg = await open_dash(b, {'width': 1280, 'height': 1000}, errs)
        check('Last 30 days is the default', await pg.eval_on_selector('#dx-p', 'e=>e.value') == 'd30')
        t = await pg.inner_text('#ccs-main')
        check('missing sheet orders: note shown, figures marked incomplete', 'are incomplete' in t and 'Incomplete' in t, t[:600])
        kd = ' '.join(await pg.locator('.ov-kd').all_inner_texts())
        check('no up or down changes shown when orders are missing', 'Up ' not in kd and 'Down ' not in kd, kd)
        check('top cakes show no change when orders are missing', 'Up ' not in await pg.inner_text('.ov-top') and 'Down ' not in await pg.inner_text('.ov-top'))
        check('no previous-period line on the chart when orders are missing', await pg.locator('.ov-prev').count() == 0)
        check('few orders: chart starts weekly', await pg.locator('[data-act="dx-unit"][data-v="w"][aria-pressed="true"]').count() == 1)
        check('order status hides empty rows', '0' not in [x.strip() for x in await pg.locator('.ov-srow b').all_inner_texts()])
        await pg.click('[data-act="dx-gapmore"]'); await pg.wait_for_timeout(300)
        check('details show when each sheet was last read', 'Last read' in await pg.inner_text('.dx-gap'))
        # independent count of total orders and revenue for the last 30 days by pickup date
        ind = await pg.evaluate("""(function(){var T=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji'}).format(new Date());var d=new Date(T+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-29);var F=d.toISOString().slice(0,10);
          var n=0,v=0;window.__regLast.forEach(function(o){if(o.pd<F||o.pd>T)return;n++;if(o.cp==='recorded'||o.cp==='assumed'){var tot=o.cv!=null?o.cv:(o.lv||0);v+=tot-(o.ref||0)}});return [n,Math.round(v)]})()""")
        kv = await pg.locator('.ov-kv').all_inner_texts()
        shown = [int(kv[0].replace(',', '')), int(kv[1].replace(',', '').replace('$', ''))]
        check('total orders and revenue match an independent count', shown == ind, (shown, ind))
        # status ring adds up to total orders
        st = await pg.evaluate("Array.from(document.querySelectorAll('.ov-srow b')).reduce(function(s,b){return s+ +b.textContent.replace(/,/g,'')},0)")
        check('status counts add up to total orders', st == shown[0], (st, shown[0]))
        # toggles
        await pg.click('[data-act="dx-tm"][data-v="v"]'); await pg.wait_for_timeout(300)
        check('revenue toggle', 'Revenue, this period' in await pg.inner_text('.ov-trend'))
        await pg.click('[data-act="dx-unit"][data-v="w"]'); await pg.wait_for_timeout(300)
        check('weekly grouping', await pg.locator('[data-act="dx-unit"][data-v="w"][aria-pressed="true"]').count() == 1)
        await pg.click('.ov-trend [data-act="dx-table"]'); await pg.wait_for_timeout(300)
        check('table view of the trend', await pg.locator('.ov-trend table tbody tr').count() >= 4)
        await pg.click('.ov-trend [data-act="dx-table"]'); await pg.wait_for_timeout(300)
        # drill from a status row and from needs attention
        await pg.click('button.ov-srow >> nth=0'); await pg.wait_for_timeout(400)
        check('status row opens the order list', await pg.locator('#ccs-sheet tbody tr').count() > 0)
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        n = await pg.locator('button.ov-arow').count()
        check('needs attention has tappable rows', n >= 1, n)
        # periods
        await pg.select_option('#dx-p', 'all'); await pg.wait_for_timeout(500)
        check('all time groups by month', await pg.locator('[data-act="dx-unit"][data-v="m"][aria-pressed="true"]').count() == 1 and await pg.locator('[data-act="dx-unit"][data-v="d"][disabled]').count() == 1)
        await pg.screenshot(path=str(OUT / 'ov-1280-all.png'), full_page=True)
        await pg.select_option('#dx-p', '12'); await pg.wait_for_timeout(400)
        await pg.select_option('#dx-prod', 'Cheesecake'); await pg.wait_for_timeout(400)
        check('cake filter keeps the page working', 'Top selling cakes' in await pg.inner_text('#ccs-main'))
        # tabs: no duplicate channels tab
        tabs = await pg.locator('.dx-secs [data-act="secgo"]').all_inner_texts()
        check('duplicate Channels and cakes tab removed', not any('Channels and cakes' in x for x in tabs), tabs)
        print('tabs:', tabs)
        await ctx.close()
        check('no page errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
