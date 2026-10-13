"""Measure how far each screen runs past the screen height. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsFit"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
SHOTS = '--shots' in sys.argv
VPS = [('tablet', 1024, 768), ('portrait', 820, 1180), ('laptop', 1280, 800), ('phone', 390, 844)]
TABS = ['today', 'orders', 'calendar', 'kitchen', 'new', 'register', 'customers', 'settings', 'dash']
M = """(function(){var d=document.documentElement;var o={page:d.scrollHeight-innerHeight};var mm=document.getElementById('ccs-main');if(mm&&getComputedStyle(mm).overflowY!=='visible')o.main=mm.scrollHeight-mm.clientHeight;var b=document.querySelector('#ccs-sheet.ccs-open .ccs-sheet-body');if(b)o.panel=b.scrollHeight-b.clientHeight;return o})()"""
async def go(pg, tab):
    ok = await pg.evaluate("(function(t){var e=[].slice.call(document.querySelectorAll('[data-tab='+t+']')).pop();if(e){e.click();return true}return false})('%s')" % tab)
    await pg.wait_for_timeout(700); return ok
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, h in VPS:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 760, has_touch=w < 760); pg = await ctx.new_page()
            await pg.add_init_script("window.__role='manager'; window.print=function(){};")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(800)
            await pg.evaluate("try{localStorage.clear()}catch(e){}")
            for t in TABS:
                if not await go(pg, t): continue
                r = await pg.evaluate(M); res[f'{name} {t}'] = r
                if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-{t}.png'))
            # order detail panel
            await go(pg, 'orders')
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-main [data-act=open], #ccs-main .ccs-card, #ccs-main tr.ccs-click');e&&e.click()})()"); await pg.wait_for_timeout(700)
            res[f'{name} order panel'] = await pg.evaluate(M)
            if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-orderpanel.png'))
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            # customer profile
            await go(pg, 'customers')
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-main tr.ccs-click, #ccs-main [data-act^=cl-open], #ccs-main .ccs-click');e&&e.click()})()"); await pg.wait_for_timeout(800)
            res[f'{name} customer'] = await pg.evaluate(M)
            if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-customer.png'))
            # new order steps
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700); await pg.evaluate("try{localStorage.clear()}catch(e){}"); await go(pg, 'new')
            async def js(s): await pg.evaluate("(function(){var e=document.querySelector(%r);e&&e.click()})()" % s); await pg.wait_for_timeout(250)
            steps = [None, ('cell', '[data-act="n-cell"][data-v="cheesecake|8"]'), ('name', '#n-name'), ('phone', '#n-phone')]
            res[f'{name} new step1'] = await pg.evaluate(M)
            await js('[data-act="n-cell"][data-v="cheesecake|8"]'); await js('[data-act="sl-next"]')
            res[f'{name} new step2'] = await pg.evaluate(M)
            await pg.fill('#n-name', 'Fit Guest'); await js('[data-act="sl-next"]')
            res[f'{name} new step3'] = await pg.evaluate(M)
            if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-new3.png'))
            await pg.fill('#n-phone', '912 0055'); await pg.wait_for_timeout(450); await js('[data-act="sl-opt"][data-v="yes"]'); await js('[data-act="sl-next"]')
            res[f'{name} new step4'] = await pg.evaluate(M)
            if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-new4.png'))
            await js('.ccs-chip-soon'); res[f'{name} new step4 short notice'] = await pg.evaluate(M)
            await ctx.close()
        await b.close()
    if '--json' in sys.argv: print(json.dumps(res)); return
    for k, v in res.items():
        bad = {a: n for a, n in v.items() if n > 2}
        print(('OVER ' if bad else 'fits ') + k + ('  ' + json.dumps(bad) if bad else ''))
asyncio.run(main())
