"""Batch B: the interactive Order Slip. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsB"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
TAB = {'width': 1024, 'height': 768}; PHONE = {'width': 390, 'height': 844}
async def newpage(b, vp=TAB, role='manager', init=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    await pg.evaluate("(function(){try{localStorage.clear()}catch(e){}; var e=[].slice.call(document.querySelectorAll('[data-tab=new]')).pop(); e&&e.click()})()"); await pg.wait_for_timeout(400)
    return ctx, pg, errs
async def js(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(220)
async def bar(pg): return await pg.evaluate("(document.getElementById('sl-bar')||{}).innerText||''")
async def creates(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
async def fill_basic(pg, date_idx=0):
    await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]')
    await pg.fill('#n-name', 'Slip Test Guest'); await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450)
    await js(pg, '[data-act="sl-when-open"]')
    await js(pg, f'#sl-when .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon):nth-of-type({date_idx + 1})')
    await js(pg, '#sl-when [data-act="n-time"][data-v="15:00"]')
    await js(pg, '[data-act="n-diet"][data-v="no"]')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # One screen, in slip order
        ctx, pg, errs = await newpage(b)
        check('no step wizard: the whole slip is one screen', await pg.locator('.ccs-nprog').count() == 0 and await pg.locator('#ccs-slipform .sl-card').count() == 1)
        labels = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-slipform .sl-lab')).map(function(e){return e.childNodes[0].textContent.trim()})")
        want = ['Guest Name', 'Contact', 'Pickup Date and Time', 'Type of cake', 'Size', 'Price', 'Candles', 'Inscription', 'Dietary or allergy', 'Remarks', 'Order Taken by', 'Date']
        check('lines follow the paper slip order', labels == want, labels)
        req = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-slipform .sl-lab')).filter(function(e){return /Required/.test(e.textContent)}).map(function(e){return e.childNodes[0].textContent.trim()})")
        check('required lines say Required in words', req == ['Guest Name', 'Contact', 'Pickup Date and Time', 'Type of cake', 'Size', 'Dietary or allergy'], req)
        check('order taken by shows the signed-in staff member', 'Test Manager' in await pg.inner_text('#ccs-slipform'))
        t = await bar(pg)
        check('bar lists everything still missing', all(x in t for x in ['Guest name', 'Contact', 'Cake and size', 'Pickup date', 'Dietary answer']), t)
        await pg.screenshot(path=str(OUT / 'tablet-empty.png'))
        # Missing items block saving and jump to the first
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(500)
        check('Create order with missing items saves nothing', len(await creates(pg)) == 0)
        check('it moves to the first missing line', await pg.evaluate("document.activeElement && document.activeElement.id") == 'n-name')
        # Price table fills cake, size and price
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]')
        s = await pg.inner_text('#ccs-slipform')
        check('tapping a price picks the cake and size', 'Cheesecake' in s and '8 inch' in s and await pg.locator('[data-act="n-cell"][aria-pressed="true"]').count() == 1)
        check('price line and button show the price', '$95' in s and '$95' in await bar(pg))
        await js(pg, '[data-act="n-cell"][data-v="chocolate-mudcake-mocha|6"]')
        check('a cake with flavours asks for the flavour', 'Flavour' in await bar(pg) and await pg.locator('#sl-cake [data-act="n-var"]').count() == 3)
        await js(pg, '#sl-cake [data-act="n-var"][data-v="Mocha"]')
        check('flavour picked fills Type of cake', 'Mocha' in await pg.inner_text('#ccs-slipform') and 'Flavour' not in await bar(pg))
        # Bar updates while typing
        await pg.fill('#n-name', 'Slip Test Guest'); await pg.wait_for_timeout(150)
        check('typing the name clears it from the bar', 'Guest name' not in await bar(pg))
        await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(500)
        check('new-customer extras wait behind a link', await pg.locator('#n-email').count() == 0 and await pg.locator('[data-act="sl-more-contact"]').count() == 1 and 'Contact' not in await bar(pg))
        await js(pg, '[data-act="sl-more-contact"]')
        check('tapping it opens email, WhatsApp and specials', await pg.locator('#n-email').count() == 1 and await pg.locator('[data-nc="optIn"]').count() == 1)
        check('date and time wait behind Choose date and time', await pg.locator('#sl-when [data-act="n-date"]').count() == 0 and await pg.locator('[data-act="sl-when-open"]').count() == 1)
        check('occasion waits behind Add occasion', await pg.locator('[data-act="n-occ"]').count() == 0)
        await js(pg, '[data-act="sl-occ-open"]'); await js(pg, '[data-act="n-occ"][data-v="Birthday"]')
        check('picking an occasion closes it to one line', await pg.locator('[data-act="n-occ"]').count() == 0 and 'Occasion: Birthday' in await pg.inner_text('#ccs-slipform'))
        # Custom design needs design details
        await js(pg, '[data-act="n-finish"][data-v="custom"]')
        check('custom design asks for design details', 'Design details' in await bar(pg) and await pg.locator('#n-design').count() == 1)
        await pg.fill('#n-design', 'Gold drip and flowers'); await pg.wait_for_timeout(150)
        check('design details clear the bar item', 'Design details' not in await bar(pg))
        await js(pg, '[data-act="n-finish"][data-v="standard"]')
        # Dietary yes without detail
        await js(pg, '[data-act="n-diet"][data-v="yes"]')
        check('dietary yes without detail stays missing', 'Dietary details' in await bar(pg))
        await js(pg, '[data-act="n-diets"][data-v="Nut allergy"]')
        check('choosing the allergy clears it', 'Dietary' not in await bar(pg))
        # Short notice
        await js(pg, '[data-act="sl-when-open"]')
        await js(pg, '#sl-when .ccs-chip-soon')
        check('short notice asks for a reason and approver', 'Short-notice reason' in await bar(pg) and await pg.locator('#n-rush').count() == 1)
        await pg.fill('#n-rush', 'Spare base in the kitchen'); await pg.fill('#n-rushby', 'Test Manager'); await pg.wait_for_timeout(150)
        await js(pg, '#sl-when [data-act="n-time"]:not([disabled])')
        check('reason and approver clear it', 'Short-notice' not in await bar(pg), await bar(pg))
        s = await pg.inner_text('#sl-when')
        check('after the time is chosen the line closes to a summary', 'Short notice, approved by Test Manager' in s and await pg.locator('#sl-when [data-act="n-time"]').count() == 0, s)
        await js(pg, '#sl-when [data-act="sl-when-open"]')
        check('Change opens it again', await pg.locator('#sl-when [data-act="n-time"]').count() > 0)
        check('no page errors so far', not errs, errs)
        await ctx.close()

        # Straightforward order saves once with the right details
        ctx, pg, errs = await newpage(b)
        await fill_basic(pg)
        await pg.fill('#n-candles', 'Number 30 candle'); await pg.fill('#n-msg', 'Happy 30th Mere'); await pg.wait_for_timeout(100)
        t = await bar(pg)
        check('complete slip says everything needed is filled in', 'Everything needed is filled in' in t, t)
        await pg.screenshot(path=str(OUT / 'tablet-complete.png'), full_page=True)
        await pg.evaluate("var b=document.querySelector('[data-act=\"n-submit\"]'); b.click(); b.click();"); await pg.wait_for_timeout(600)
        c = await creates(pg)
        check('Create order sends one order even when tapped twice', len(c) >= 1 and len(set(x['idempotency_key'] for x in c)) == 1, len(c))
        x = c[0] if c else {}
        check('order carries cake, size, candles, inscription and dietary', x.get('product_code') == 'cheesecake' and x.get('size_inch') == 8 and x.get('candles') == 'Number 30 candle' and x.get('message') == 'Happy 30th Mere' and x.get('has_dietary') == 'no', x)
        check('new guest name and mobile are sent', (x.get('customer') or {}).get('name') == 'Slip Test Guest' and '0099' in (x.get('customer') or {}).get('phone', ''), x.get('customer'))
        check('saved screen shows the order number', 'CC-1009' in await pg.inner_text('#ccs-main'))
        check('no page errors', not errs, errs)
        await ctx.close()

        # Existing customer from the mobile number
        ctx, pg, errs = await newpage(b)
        await pg.fill('#n-phone', '912 0001'); await pg.wait_for_timeout(500)
        check('a known number offers the existing customer', await pg.locator('[data-act="n-pick"]').count() >= 1)
        await js(pg, '[data-act="n-pick"]')
        s = await pg.inner_text('#ccs-slipform')
        check('picking fills guest name and contact', 'Test Customer A' in s and 'Change guest' in s and 'Guest name' not in await bar(pg) and 'Contact' not in await bar(pg))
        await js(pg, '[data-act="n-unpick"]')
        check('Change guest clears them again', await pg.locator('#n-name').count() == 1)
        await ctx.close()

        # Unsuccessful save keeps everything
        ctx, pg, errs = await newpage(b, init="window.__createFail = true;")
        await fill_basic(pg)
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(600)
        t = await bar(pg)
        check('failed save says nothing was saved and all is kept', 'Not saved' in t and 'kept' in t, t)
        check('typed details are still there', await pg.input_value('#n-name') == 'Slip Test Guest' and await pg.locator('[data-act="n-cell"][aria-pressed="true"]').count() == 1)
        check('Create order can be pressed again', await pg.locator('[data-act="n-submit"]:not([disabled])').count() == 1)
        await ctx.close()

        # Delivery needs area and address
        ctx, pg, errs = await newpage(b)
        await fill_basic(pg)
        await js(pg, '[data-act="sl-when-open"]')
        await js(pg, '[data-act="n-method"][data-v="delivery"]')
        check('delivery asks for its details', 'Delivery details' in await bar(pg) and 'Delivery Date and Time' in await pg.inner_text('#ccs-slipform'))
        await js(pg, '[data-act="n-zone"][data-v="Denarau"]'); await pg.fill('#n-address', 'Room 214, Sheraton Denarau'); await pg.wait_for_timeout(200)
        await pg.evaluate("document.activeElement && document.activeElement.blur()")
        await js(pg, '#sl-when [data-act="n-time"][data-v="15:00"]')
        check('delivery fee added to the price', '$110' in await bar(pg) and 'Delivery details' not in await bar(pg), await bar(pg))
        await ctx.close()

        # Unfinished slip is kept on this device
        ctx, pg, errs = await newpage(b)
        await js(pg, '[data-act="n-cell"][data-v="red-velvet|6"]'); await pg.fill('#n-name', 'Kept Guest'); await pg.wait_for_timeout(200)
        await pg.reload(); await pg.wait_for_timeout(700)
        await pg.evaluate("(function(){var e=[].slice.call(document.querySelectorAll('[data-tab=new]')).pop(); e&&e.click()})()"); await pg.wait_for_timeout(400)
        check('unfinished slip comes back after a reload', await pg.locator('#n-name').count() == 1 and await pg.input_value('#n-name') == 'Kept Guest' and await pg.locator('[data-act="n-cell"][data-v="red-velvet|6"][aria-pressed="true"]').count() == 1)
        await ctx.close()

        # Phone: bar stays on screen, compact, above the menu
        ctx, pg, errs = await newpage(b, PHONE)
        await pg.screenshot(path=str(OUT / 'phone-empty.png'))
        bb = await pg.evaluate("(function(){var b=document.getElementById('sl-bar').getBoundingClientRect(), n=document.querySelector('.ccs-nav').getBoundingClientRect(); return {bt:b.top, bb:b.bottom, h:b.height, nt:n.top, ih:innerHeight}})()")
        check('phone: bar visible above the bottom menu', bb['bb'] <= bb['nt'] + 1 and bb['bt'] > 0, bb)
        check('phone: bar is compact (under 90 px)', bb['h'] < 90, bb)
        await pg.focus('#n-name'); await pg.wait_for_timeout(200)
        fb = await pg.evaluate("(function(){var f=document.getElementById('n-name').getBoundingClientRect(), b=document.getElementById('sl-bar').getBoundingClientRect(); return f.bottom <= b.top || f.top >= b.bottom})()")
        check('phone: the bar does not cover the field being typed in', fb)
        wide = await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        check('phone: no sideways page scroll (table scrolls on its own)', wide)
        await ctx.close()

        # Kitchen login never sees New order
        ctx, pg, errs = await newpage(b, role='kitchen')
        check('kitchen login has no New order', await pg.locator('[data-tab="new"]').count() == 0)
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
