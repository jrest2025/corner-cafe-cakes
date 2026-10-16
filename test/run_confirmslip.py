"""Confirming any order opens the kitchen slip choice, so no confirmed order is left without a slip; nothing is emailed until staff choose. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else ' -> ' + str(d)[:300]))
async def js(pg, sel, wait=300):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(wait)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp in [{'width': 1280, 'height': 900}, {'width': 390, 'height': 844}]:
            nm = 'desk' if vp['width'] > 800 else 'phone'
            ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("window.__role='manager'; window.print=function(){}; try{localStorage.clear()}catch(e){}")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
            await pg.evaluate("(function(){var e=[].slice.call(document.querySelectorAll('[data-tab=orders]')).pop(); e&&e.click()})()"); await pg.wait_for_timeout(400)
            await pg.evaluate("(function(){var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){return x.textContent.indexOf('CC-1001')>-1})[0]; if(b) b.click();})()"); await pg.wait_for_timeout(600)
            await js(pg, '#ccs-sheet [data-act="panel"][data-v="confirm"]')
            if await pg.locator('#ccs-sheet [data-act="cfm-how"]').count(): await js(pg, '#ccs-sheet [data-act="cfm-how"][data-v="verbal"]')
            await js(pg, '#ccs-sheet [data-act="do-confirm"]', 1500)
            toast = await pg.evaluate("(document.getElementById('ccs-toast')||{}).textContent||''")
            check(f'{nm}: a standard order confirmed says to make the kitchen slip', 'Order confirmed' in toast and 'make the kitchen slip' in toast and '..' not in toast, toast)
            check(f'{nm}: the kitchen slip choice opens on the order', await pg.locator('#ccs-sheet [data-act="do-brief"]').count() >= 1, (await pg.inner_text('#ccs-sheet'))[:300])
            check(f'{nm}: nothing is emailed until staff choose', (await pg.evaluate("window.__briefCalls || 0")) == 0)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            check(f'{nm}: no sideways scroll', sw <= vp['width'], sw)
            check(f'{nm}: no page errors', not errs, errs)
            await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
