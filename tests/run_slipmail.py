"""Print kitchen slip: emails the slip to the admin and counter inboxes, then offers Download (PDF) and Print on this device.
Invented data only. pdf-lib and the logo are served from local copies of the exact pinned files."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsSlipMail"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
PDFLIB = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/claude-0/-home-claude-corner-cafe-cakes/cc1bfb48-b530-5a67-bb88-cfcc137ea1df/scratchpad/pdflib/package/dist/pdf-lib.min.js")
LOGO = pathlib.Path("/home/claude/corner-cafe-cakes/dist/brand/slip-logo-white.png")
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, init='', vp={'width': 1280, 'height': 900}, block_pdf=False):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760, accept_downloads=True); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    cors = {'Access-Control-Allow-Origin': '*'}
    async def pdf(route):
        if block_pdf: return await route.abort()
        await route.fulfill(body=PDFLIB.read_bytes(), headers={**cors, 'Content-Type': 'application/javascript'})
    await pg.route("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js", pdf)
    await pg.route("https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@*/dist/brand/slip-logo-white.png", lambda r: r.fulfill(body=LOGO.read_bytes(), headers={**cors, 'Content-Type': 'image/png'}))
    await pg.add_init_script("window.__role='manager'; window.__printed=0; window.print=function(){window.__printed++}; try{localStorage.clear()}catch(e){} " + init)
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def jsclick(pg, sel, wait=300):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(wait); return r
async def open_order(pg, ref):
    await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(250)
    if await pg.locator('#ccs-q').count(): await pg.fill('#ccs-q', ref)
    await pg.wait_for_timeout(300)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()")
    await pg.wait_for_timeout(450)
async def send(pg):
    await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]')
    await jsclick(pg, '#ccs-sheet [data-act="do-brief"]', 900)
async def panel(pg):
    return await pg.evaluate("(document.querySelector('#ccs-sheet .ccs-briefdone')||{}).innerText||''")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await newpage(b)
        await open_order(pg, 'CC-1007')
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]')
        hint = await pg.inner_text('#ccs-sheet .ccs-panel')
        check('before sending, the panel says it emails the admin and counter inboxes', 'emailed as a PDF to the admin and counter inboxes' in hint, hint)
        await jsclick(pg, '#ccs-sheet [data-act="do-brief"]', 900)
        t = await panel(pg)
        check('one press sends once', await pg.evaluate("window.__briefCalls") == 1, await pg.evaluate("window.__briefCalls"))
        check('after sending, the panel names both inboxes', 'Emailed to roneel@jacksfiji.com and cornercafe@jacksfiji.com for printing.' in t, t)
        check('the panel names the order and version', 'Kitchen slip CC-1007 v2' in t, t)
        btns = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-briefdone button')).map(function(e){return e.textContent})")
        check('Download, Print on this device and Done are offered', btns == ['Download slip (PDF)', 'Print on this device', 'Done'], btns)
        check('no print window opens on its own', await pg.evaluate("window.__printed") == 0)
        await pg.screenshot(path=str(OUT / 'desktop-sent.png'))
        async with pg.expect_download(timeout=15000) as dl:
            await jsclick(pg, '#ccs-sheet [data-act="brief-pdf"]', 200)
        d = await dl.value; path = await d.path(); data = pathlib.Path(path).read_bytes()
        check('the download is a PDF', data[:5] == b'%PDF-', data[:8])
        check('the file is named for the order, like the emailed one', d.suggested_filename.startswith('CC-1007 ') and d.suggested_filename.endswith(' v2.pdf'), d.suggested_filename)
        check('the PDF is one page', data.count(b'/Type /Page\n') + data.count(b'/Type /Page/') + data.count(b'/Type /Page ') <= 2 and len(data) > 3000, len(data))
        (OUT / 'slip.pdf').write_bytes(data)
        await pg.wait_for_timeout(300)
        check('the panel stays open after downloading', bool(await panel(pg)))
        await jsclick(pg, '#ccs-sheet [data-act="brief-print"]', 900)
        check('Print on this device opens the print window', await pg.evaluate("window.__printed") == 1)
        slip = await pg.evaluate("(document.querySelector('#ccs-print .ccs-slip')||{}).innerText||''")
        check('the printed slip is the same order', 'CC-1007' in slip, slip[:80])
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v=""]')
        check('Done closes the panel', not await panel(pg))
        check('no page errors', not errs, errs)
        await ctx.close()

        # Pressed twice within a minute: says so, no duplicate
        ctx, pg, errs = await newpage(b, "window.__briefEmail={state:'recent', to:'roneel@jacksfiji.com', cc:'cornercafe@jacksfiji.com'};")
        await open_order(pg, 'CC-1007'); await send(pg)
        t = await panel(pg)
        check('a repeat press within a minute says it was not sent again', 'less than a minute ago, so it was not sent again' in t, t)
        await ctx.close()
        # Emailing switched off
        ctx, pg, errs = await newpage(b, "window.__briefEmail={state:'off', to:'roneel@jacksfiji.com', cc:null};")
        await open_order(pg, 'CC-1007'); await send(pg)
        t = await panel(pg)
        check('switched off: says so and points to download or print', 'switched off' in t and 'Download it or print it here' in t, t)
        await ctx.close()
        # No address set
        ctx, pg, errs = await newpage(b, "window.__briefEmail={state:'no_address', to:null, cc:null};")
        await open_order(pg, 'CC-1007'); await send(pg)
        t = await panel(pg)
        check('no address: says it was not emailed', 'so it was not emailed' in t, t)
        await ctx.close()
        # Download cannot load: clear fallback
        ctx, pg, errs = await newpage(b, block_pdf=True)
        await open_order(pg, 'CC-1007'); await send(pg)
        await jsclick(pg, '#ccs-sheet [data-act="brief-pdf"]', 1500)
        t = await panel(pg)
        check('download failure gives a way out', 'choose Save as PDF instead' in t, t)
        check('the Download button is usable again', await pg.evaluate("!document.querySelector('#ccs-sheet [data-act=brief-pdf]').disabled"))
        await ctx.close()
        # Phone: everything visible, nothing sideways
        ctx, pg, errs = await newpage(b, vp={'width': 375, 'height': 740})
        await open_order(pg, 'CC-1007'); await send(pg)
        fit = await pg.evaluate("""(function(){var p=document.querySelector('#ccs-sheet .ccs-briefdone'); if(!p) return 'none'; var r=p.getBoundingClientRect(), bad=[];
          [].slice.call(p.querySelectorAll('button')).forEach(function(x){var q=x.getBoundingClientRect(); if(q.right>window.innerWidth+1||q.left<-1||x.scrollWidth>x.clientWidth+2) bad.push(x.textContent)});
          return bad.length? bad.join(',') : (document.documentElement.scrollWidth<=window.innerWidth+1 ? 'ok' : 'page scrolls sideways')})()""")
        check('phone: the buttons fit', fit == 'ok', fit)
        await pg.evaluate("(function(){var p=document.querySelector('#ccs-sheet .ccs-briefdone'); if(p) p.scrollIntoView()})()"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(OUT / 'phone-sent.png'))
        check('phone: no page errors', not errs, errs)
        await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
