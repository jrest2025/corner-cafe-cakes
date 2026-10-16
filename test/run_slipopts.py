"""Kitchen slip choices: email, download, print, alone or together. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else 'hosted-staff.html'
R = []
def check(n, ok, d=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + ('' if ok or d == '' else ' -> ' + str(d)[:200]))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, h, touch in [('ipad', 820, 1180, True), ('laptop', 1366, 768, False), ('phone', 390, 844, True)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=w < 760, has_touch=touch, accept_downloads=True); pg = await ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            cors = {'Access-Control-Allow-Origin': '*'}
            PDFLIB = pathlib.Path('/tmp/claude-0/-home-claude-corner-cafe-cakes/cc1bfb48-b530-5a67-bb88-cfcc137ea1df/scratchpad/pdflib/package/dist/pdf-lib.min.js'); LOGO = pathlib.Path('/home/claude/corner-cafe-cakes/dist/brand/slip-logo-white.png')
            await pg.route('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', lambda r: r.fulfill(body=PDFLIB.read_bytes(), headers={**cors, 'Content-Type': 'application/javascript'}))
            await pg.route('https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@*/dist/brand/slip-logo-white.png', lambda r: r.fulfill(body=LOGO.read_bytes(), headers={**cors, 'Content-Type': 'image/png'}))
            await pg.add_init_script("window.__role='manager'; window.__prints=0; window.print=function(){window.__prints++};")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900); await pg.evaluate("try{localStorage.removeItem('ccs-slip-pick')}catch(e){}")
            async def hit(sel, wait=500):
                loc = pg.locator(sel).locator('visible=true').first
                if not await loc.count(): return False
                await loc.scroll_into_view_if_needed()
                if touch: await loc.tap()
                else: await loc.click()
                await pg.wait_for_timeout(wait); return True
            async def open_slip():
                await pg.evaluate("document.activeElement&&document.activeElement.blur()")
                await hit('[data-tab=orders]', 700)
                await pg.locator('#ccs-q').locator('visible=true').first.fill('CC-1007'); await pg.wait_for_timeout(600)
                await pg.evaluate("document.activeElement&&document.activeElement.blur()"); await pg.wait_for_timeout(300)
                if not await hit('#ccs-main [data-act=open-order]:has-text("CC-1007")', 800): return False
                return await hit('#ccs-sheet [data-act=panel][data-v=brief]:not([disabled])', 500)
            ok = await open_slip()
            check(f'{name}: slip screen opens', ok)
            txt = await pg.inner_text('#ccs-sheet')
            check(f'{name}: three choices shown', all(k in txt for k in ('Email to the kitchen printer', 'Download PDF', 'Print on this device')))
            check(f'{name}: email ticked by default, others not', await pg.evaluate("[].map.call(document.querySelectorAll('#ccs-sheet [data-slipopt]'),function(x){return x.dataset.slipopt+':'+x.checked}).join(',')") == 'email:true,dl:false,print:false')
            hb = await pg.evaluate("Math.min.apply(null,[].map.call(document.querySelectorAll('#ccs-sheet .ccs-slipopt'),function(x){return x.getBoundingClientRect().height}))")
            check(f'{name}: choice rows are finger sized', hb >= (56 if touch else 44), hb)
            # untick email -> button disabled
            await hit('#ccs-sheet .ccs-slipopt:has([data-slipopt=email])', 300)
            dis = await pg.locator('#ccs-sheet [data-act=do-brief]').get_attribute('disabled')
            check(f'{name}: nothing ticked disables Make slip', dis is not None and 'Tick at least one' in await pg.inner_text('#ccs-sheet'))
            # download + print without email
            await hit('#ccs-sheet .ccs-slipopt:has([data-slipopt=dl])', 300); await hit('#ccs-sheet .ccs-slipopt:has([data-slipopt=print])', 300)
            try:
                async with pg.expect_download(timeout=15000) as dl:
                    await hit('#ccs-sheet [data-act=do-brief]', 300)
                d = await dl.value; fn = d.suggested_filename
            except Exception as e: fn = 'none: ' + str(e)[:80]
            await pg.wait_for_timeout(1500)
            args = await pg.evaluate("window.__briefArgs")
            check(f'{name}: server told not to email', args and args.get('p_email') is False, args)
            check(f'{name}: PDF downloaded', fn.endswith('.pdf'), fn)
            check(f'{name}: print window opened', await pg.evaluate("window.__prints") >= 1)
            st = await pg.inner_text('#ccs-sheet')
            check(f'{name}: result says not emailed and offers Email slip to print', 'Not emailed' in st and await pg.locator('#ccs-sheet [data-act=brief-email]').count() == 1)
            await hit('#ccs-sheet [data-act=brief-email]', 900)
            args2 = await pg.evaluate("window.__briefArgs")
            check(f'{name}: Email slip to print sends it afterwards', args2.get('p_email') is True and 'Emailed to' in await pg.inner_text('#ccs-sheet'), args2)
            # choice is remembered
            await hit('#ccs-sheet [data-act=panel][data-v=""]', 400)
            await hit('#ccs-sheet [data-act=panel][data-v=brief]', 500)
            check(f'{name}: last choice remembered on this device', await pg.evaluate("[].map.call(document.querySelectorAll('#ccs-sheet [data-slipopt]'),function(x){return x.dataset.slipopt+':'+x.checked}).join(',')") == 'email:false,dl:true,print:true')
            check(f'{name}: no script errors', not errs, errs[:2])
            await ctx.close()
        await b.close()
    print(f'\n{sum(R)}/{len(R)} passed')
asyncio.run(main())
