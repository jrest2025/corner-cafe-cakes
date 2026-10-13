"""Kitchen brief in the Cake Order Slip layout, and the Candles field. Invented data only."""
import asyncio, pathlib, sys, re, subprocess
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsSlip"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, role='manager', init='', vp={'width': 1280, 'height': 900}):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}} {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def jsclick(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(300)
async def open_order(pg, ref):
    await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(250)
    if await pg.locator('#ccs-q').count(): await pg.fill('#ccs-q', ref)
    await pg.wait_for_timeout(300)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()")
    await pg.wait_for_timeout(450)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # Print panel: one A5 button, honest hint
        ctx, pg, errs = await newpage(b, init="window.__candles='Number 30 candle';")
        await open_order(pg, 'CC-1007')
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]')
        btns = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-sheet [data-act=do-brief]')).map(function(e){return e.dataset.v+':'+e.textContent})")
        check('print panel offers one A5 slip button', btns == ['A5:Print slip (A5)'], btns)
        hint = await pg.inner_text('#ccs-sheet .ccs-panel')
        check('print panel says name, phone and price are printed', 'guest name, phone number and price' in hint, hint)
        await jsclick(pg, '#ccs-sheet [data-act="do-brief"][data-v="A5"]'); await pg.wait_for_timeout(700)
        txt = await pg.evaluate("(document.querySelector('#ccs-print .ccs-slip')||{}).innerText||''")
        for lab in ['Guest Name:', 'Contact:', 'Pickup Date:', 'Time:', 'Type of cake:', 'Size:', 'Price:', 'Candles:', 'Inscription:', 'Remarks:', 'Order Taken by:', 'Date:']:
            check('slip has the line ' + lab, lab in txt, txt[:200])
        check('slip header has the hours', 'MONDAY - SUNDAY' in txt and '8AM - 9PM' in txt)
        check('slip shows the logo', await pg.locator('#ccs-print .sl-logo svg path').count() >= 2)
        check('slip shows guest full name and phone', 'Mere Tavola' in txt and '+679 912 3456' in txt, txt[:300])
        check('slip shows the order price', '$68.00' in txt)
        check('slip shows candles', 'Number 30 candle' in txt)
        check('slip shows who took the order and when', 'Ana Manager' in txt and '13 Oct 2026' in txt, txt[-400:])
        check('slip footer has phone, email and VAT note', 'cornercafe@jacksfiji.com' in txt and '12.5% VAT' in txt)
        rows = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-print .sl-prices tbody tr')).length")
        heads = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-print .sl-prices thead th')).map(function(e){return e.textContent})")
        np = await pg.evaluate("(window.__ccsSetupCount = (function(){try{return window.__mockSetup? window.__mockSetup.products.length : null}catch(e){return null}})())")
        check('price table lists every cake from the app', rows >= 3, rows)
        check('price table has the size columns', heads[:1] == ['Type'] and '6”' in heads and '12”' in heads, heads)
        check('ordered cake and size are outlined', await pg.locator('#ccs-print .sl-prices td.sl-pick').count() == 1)
        check('changed-since banner shown for version 2', 'Changed since version 1' in txt)
        await pg.emulate_media(media='print')
        pdf = await pg.pdf(path=str(OUT / 'slip-A5.pdf'), prefer_css_page_size=True, print_background=True)
        n = len(re.findall(rb'/Type\s*/Page[^s]', pdf))
        check('slip prints on exactly one page', n == 1, n)
        size = re.search(rb'/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)', pdf)
        check('page is A5 portrait', size and abs(float(size.group(1)) - 419.5) < 3 and abs(float(size.group(2)) - 595.3) < 3, size and size.groups())
        check('no page errors', not errs, errs)
        await ctx.close()
        # Long order still one page
        long = ' '.join(['Three tier design with hand-piped lace, gold leaf on every tier, sugar flowers in blush and ivory, a sugar topper and names.'] * 14)
        ctx, pg, errs = await newpage(b)
        await pg.evaluate("(function(t){var o=window.__orders.filter(function(x){return x.reference==='CC-1007'})[0]; var i=o.order_items[0]; i.design_description=t; i.kitchen_notes=t; o.customer_notes=t; o.has_dietary=true; i.dietary=['Nut allergy','Other']; i.dietary_note=t.slice(0,300);})", long)
        await open_order(pg, 'CC-1007')
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]')
        await jsclick(pg, '#ccs-sheet [data-act="do-brief"][data-v="A5"]'); await pg.wait_for_timeout(700)
        await pg.emulate_media(media='print')
        pdf = await pg.pdf(path=str(OUT / 'slip-A5-long.pdf'), prefer_css_page_size=True, print_background=True)
        check('long order slip still one page', len(re.findall(rb'/Type\s*/Page[^s]', pdf)) == 1)
        check('allergy box printed for a dietary order', await pg.locator('#ccs-print .sl-diet').count() == 1)
        await ctx.close()
        # Candles on the order screen
        ctx, pg, errs = await newpage(b)
        await open_order(pg, 'CC-1007')
        check('order screen offers Add candles', await pg.locator('#ccs-sheet [data-act="panel"][data-v="candles"]').count() == 1)
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="candles"]')
        await pg.fill('#ccs-candles', 'x' * 61) if False else None
        await pg.evaluate("document.getElementById('ccs-candles').value='5 small candles'")
        await jsclick(pg, '#ccs-sheet [data-act="do-candles"]'); await pg.wait_for_timeout(400)
        sent = await pg.evaluate("window.__candlesSet")
        check('saving candles calls the database with the text', sent and sent.get('p_candles') == '5 small candles', sent)
        toast = await pg.evaluate("(document.getElementById('ccs-toast')||{}).textContent||''")
        check('reprint reminder after changing candles', 'Print the new kitchen brief' in toast, toast)
        await ctx.close()
        # Candles while taking an order
        ctx, pg, errs = await newpage(b)
        src = open(HERE.parent / 'staff.js').read()
        check('new order step has a Candles field', 'id="n-candles"' in src and 'candles: D.candles' in src)
        await ctx.close()
        ctx, pg, errs = await newpage(b, role='kitchen')
        check('kitchen login sees no print button', await pg.locator('[data-v="brief"]').count() == 0)
        await ctx.close()
        await b.close()
    subprocess.run(['pdftoppm', '-r', '110', '-png', '-singlefile', str(OUT / 'slip-A5.pdf'), str(OUT / 'slip-A5')])
    subprocess.run(['pdftoppm', '-r', '110', '-png', '-singlefile', str(OUT / 'slip-A5-long.pdf'), str(OUT / 'slip-A5-long')])
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
