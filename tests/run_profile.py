"""Customer profile: one page of plain tables. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsP"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, vp={'width': 1024, 'height': 768}, role='manager', init='', tab='new'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); pg.set_default_timeout(8000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    await pg.evaluate(f"(function(){{try{{localStorage.clear()}}catch(e){{}}; var e=[].slice.call(document.querySelectorAll('[data-tab={tab}]')).pop(); if(!e){{var m=document.querySelector('[data-tab=more]'); m&&m.click(); e=[].slice.call(document.querySelectorAll('[data-tab={tab}]')).pop();}} e&&e.click()}})()"); await pg.wait_for_timeout(500)
    return ctx, pg, errs
async def js(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(220)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp, name in [({'width': 1024, 'height': 768}, 'tablet'), ({'width': 390, 'height': 844}, 'phone'), ({'width': 1440, 'height': 900}, 'desk')]:
            ctx, pg, errs = await newpage(b, vp=vp, tab='customers'); await pg.wait_for_timeout(500)
            await js(pg, '[data-act="open-customer"]'); await pg.wait_for_timeout(900)
            t = await pg.inner_text('#ccs-sheet')
            check(name + ': no tabs; details, orders, notes and permission on one page', await pg.locator('#ccs-sheet .ws-tabs').count() == 0 and all(x in t.lower() for x in ['guest details', 'mobile', 'orders (', 'follow-ups', 'marketing permission']), t[:300])
            check(name + ': details are a label and value table', await pg.locator('#cp-overview table.cp-table th[scope="row"]').count() >= 8)
            check(name + ': orders are a table, newest first', await pg.evaluate("(function(){var d=[].slice.call(document.querySelectorAll('#cp-orders tbody tr.ccs-click td:first-child')).map(function(e){return e.textContent});return d.length>=2})()"))
            check(name + ': New order, WhatsApp and Call at the top', await pg.locator('.ccs-cust-acts [data-act="cust-neworder"]').count() == 1 and await pg.locator('.ccs-cust-acts a[href^="tel:"]').count() == 1)
            w = await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet .ccs-sheet-body');return [b.scrollWidth,b.clientWidth]})()")
            check(name + ': nothing runs off the side', w[0] <= w[1] + 1, w)
            await js(pg, '#cp-orders tbody tr.ccs-click'); await pg.wait_for_timeout(800)
            check(name + ': tapping an order row opens the order', 'CC-' in await pg.inner_text('#ccs-sheet .ccs-sheet-head, #ccs-sheet') )
            check(name + ': no page errors', not errs, errs)
            await ctx.close()
            ctx, pg, errs = await newpage(b, vp=vp, tab='customers'); await pg.wait_for_timeout(500)
            await js(pg, '[data-act="open-customer"]'); await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelector('#ccs-sheet .ccs-sheet-body').scrollTop=0")
            await pg.screenshot(path=str(OUT / (name + '-top.png')))
            await pg.evaluate("document.getElementById('cp-orders').scrollIntoView()"); await pg.wait_for_timeout(200)
            await pg.screenshot(path=str(OUT / (name + '-orders.png')))
            await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
