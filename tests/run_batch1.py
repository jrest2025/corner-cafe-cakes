"""Batch 1 audit fixes, checked on the built test page with invented data only."""
import asyncio, pathlib, sys, re
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsB1"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager', init=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}} {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    return ctx, pg

async def calls(pg, kind, name=None):
    return await pg.evaluate("(a)=>window.__calls.filter(c=>c[0]===a[0] && (!a[1] || c[1]===a[1])).map(c=>c[2])", [kind, name])

async def tick(pg):
    await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await pg.wait_for_timeout(250)

async def jsclick(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(250)

async def open_order(pg, ref):
    await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(250)
    await pg.fill('#ccs-q', ref) if await pg.locator('#ccs-q').count() else None
    await pg.wait_for_timeout(300)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()")
    await pg.wait_for_timeout(450)

async def pdf_pages(pg, name):
    await pg.emulate_media(media='print')
    data = await pg.pdf(path=str(OUT / name), prefer_css_page_size=True, print_background=True)
    await pg.emulate_media(media='screen')
    return len(re.findall(rb'/Type\s*/Page[^s]', data))

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---------- desktop, manager ----------
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs)
        # A2 overdue on Today and in Orders
        await pg.evaluate("(function(){var o=window.__orders.filter(function(x){return x.reference==='CC-1013'})[0]; var d=new Date(); d.setUTCDate(d.getUTCDate()-3); o.required_date=d.toISOString().slice(0,10);})()")
        await tick(pg); await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(300)
        ov = await pg.locator('.ccs-overdue').inner_text() if await pg.locator('.ccs-overdue').count() else ''
        check('A2 overdue order shows on Today', 'Overdue' in ov and 'CC-1013' in ov, ov[:200])
        check('A7 Today shows when it was last updated', await pg.locator('.ccs-fresh').count() == 1)
        await pg.screenshot(path=str(OUT / 'desk-today-overdue.png'), full_page=True)
        await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(250)
        check('A2 Orders has an Overdue filter', await pg.locator('[data-act="filter"][data-v="overdue"]').count() == 1)
        await pg.click('[data-act="filter"][data-v="overdue"]'); await pg.wait_for_timeout(250)
        check('A2 Overdue filter lists the late order', 'CC-1013' in await pg.inner_text('#ccs-main'))
        # A7 refresh failures become visible
        await pg.evaluate("window.__failT={orders:'offline'}"); await tick(pg); await tick(pg)
        st = await pg.locator('.ccs-stale').inner_text() if await pg.locator('.ccs-stale').count() else ''
        check('A7 two failed refreshes show Not up to date with Try now', 'Not up to date' in st and 'Try now' in st, st)
        await pg.evaluate("window.__failT=null"); await jsclick(pg, '.ccs-stale [data-act]'); await pg.wait_for_timeout(250)
        check('A7 warning clears once a refresh works', await pg.locator('.ccs-stale').count() == 0)

        # A1 dietary detail compulsory (new order)
        await pg.click('.ccs-nav [data-tab="new"]'); await pg.wait_for_timeout(250)
        await pg.fill('#n-phone', '912 0001'); await pg.wait_for_timeout(500); await pg.click('[data-act="n-pick"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="n-prod"][data-v="cheesecake"]'); await pg.click('[data-act="n-size"] >> nth=0'); await pg.click('[data-act="n-next"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="n-finish"][data-v="standard"]'); await pg.click('[data-act="n-diet"][data-v="yes"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="n-finish-next"]'); await pg.wait_for_timeout(200)
        t = await pg.inner_text('#ccs-main')
        check('A1 dietary Yes with nothing chosen cannot continue', 'Choose the dietary need or allergy' in t and await pg.locator('[data-act="n-date"]').count() == 0)
        await pg.click('[data-act="n-diets"][data-v="Other"]'); await pg.click('[data-act="n-finish-next"]'); await pg.wait_for_timeout(200)
        check('A1 Other needs written details', 'You chose Other' in await pg.inner_text('#ccs-main'))
        await pg.fill('#n-dnote', 'No sesame seeds'); await pg.click('[data-act="n-finish-next"]'); await pg.wait_for_timeout(250)
        check('A1 continues once details are written', await pg.locator('[data-act="n-date"]').count() > 0)
        soon = await pg.eval_on_selector_all('.ccs-chip-soon', 'els=>els.map(e=>e.textContent)')
        check('A16 Today and Tomorrow chips marked short notice', len(soon) >= 2 and 'Today' in soon[0], soon)
        await pg.click('.ccs-chip-soon >> nth=1'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="n-time"][data-v="15:00"]'); await pg.wait_for_timeout(200)
        check('A16 missing reason shown under the Reason field', await pg.locator('#n-rush + .ccs-err').count() == 1)
        await pg.fill('#n-rush', 'Kitchen has a spare base'); await pg.click('[data-act="n-time"][data-v="15:00"]'); await pg.wait_for_timeout(200)
        check('A16 missing approver shown under Who approved it', 'Enter who approved' in await pg.inner_text('#ccs-main'))
        check('A16 manager gets a one-tap Me chip for the approver', await pg.locator('[data-act="n-rushby"]').count() >= 1)
        await pg.click('[data-act="n-rushby"] >> nth=0'); await pg.wait_for_timeout(150)
        check('A16 approver filled from the chip', (await pg.input_value('#n-rushby')) == 'Test Manager')
        await pg.screenshot(path=str(OUT / 'desk-new-shortnotice.png'), full_page=True)
        await ctx.close()

        # A6 Kitchen board load failure and retry
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, init="window.__failR={kitchen_board:1};")
        await pg.click('.ccs-nav [data-tab="kitchen"]'); await pg.wait_for_timeout(400)
        check('A6 kitchen board failure shows a message, not Loading forever', await pg.locator('.ccs-loaderr').count() == 1 and 'could not load' in await pg.inner_text('#ccs-main'))
        await pg.evaluate("window.__failR=null"); await pg.click('.ccs-loaderr [data-act="k-reload"]'); await pg.wait_for_timeout(400)
        check('A6 Try again loads the kitchen board', await pg.locator('.ccs-kcard').count() > 0)
        check('A7 kitchen board shows when it was last updated', await pg.locator('.ccs-fresh').count() == 1)
        # A6 Customers failure and retry
        await pg.evaluate("window.__failR={customer_filter:1}")
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(400)
        check('A6 customers failure shows Try again', await pg.locator('.ccs-loaderr [data-act="cust-reload"]').count() == 1)
        await pg.evaluate("window.__failR=null"); await pg.click('[data-act="cust-reload"]'); await pg.wait_for_timeout(400)
        check('A6 Try again loads customers', await pg.locator('.ccs-loaderr').count() == 0 and 'Test Customer A' in await pg.inner_text('#ccs-main'))
        await pg.screenshot(path=str(OUT / 'desk-customers-retry.png'), full_page=True)
        # A10 website ordering switch asks first
        await pg.click('.ccs-nav [data-tab="settings"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act="online-ask"]'); await pg.wait_for_timeout(200)
        t = await pg.inner_text('#ccs-main')
        check('A10 pausing website orders asks first and states the effect', 'Pause website cake orders?' in t and 'call the café' in t)
        check('A10 nothing changed before confirming', len(await calls(pg, 'update', 'locations')) == 0)
        await pg.click('[data-act="online-yes"]'); await pg.wait_for_timeout(400)
        up = await calls(pg, 'update', 'locations')
        check('A10 confirming pauses website orders', up == [{'accepts_online': False}], up)
        await pg.evaluate("window.__failT={locations:'offline'}")
        await pg.click('[data-act="online-ask"]'); await pg.click('[data-act="online-yes"]'); await pg.wait_for_timeout(400)
        check('A10 a failed change says so and keeps the panel', 'No internet connection. Nothing was changed.' in await pg.inner_text('#ccs-main'))
        await pg.evaluate("window.__failT=null"); await pg.click('[data-act="online-no"]'); await pg.wait_for_timeout(200)
        # A11 price change shows old and new, warns on big change
        await pg.evaluate("document.querySelectorAll('.ccs-set details').forEach(function(d){ if (d.textContent.indexOf('Cakes and prices') > -1) d.open = true; })")
        await pg.fill('#pz-s1', '80'); await pg.click('[data-act="save-prod"][data-id="p1"]'); await pg.wait_for_timeout(200)
        chk = await pg.locator('.ccs-pricechk').inner_text() if await pg.locator('.ccs-pricechk').count() else ''
        check('A11 price save shows old and new price', 'FJD 54.00 to FJD 80.00' in chk and '48% higher' in chk, chk)
        check('A11 change over 30 percent is flagged', 'big change' in chk)
        check('A11 nothing saved before confirming', len(await calls(pg, 'update', 'product_sizes')) == 0)
        await pg.screenshot(path=str(OUT / 'desk-price-check.png'), full_page=True)
        await pg.click('[data-act="save-prod"][data-id="p1"]'); await pg.wait_for_timeout(400)
        ps = await calls(pg, 'update', 'product_sizes')
        check('A11 second tap saves the new price', ps and ps[0]['price'] == 80, ps)
        await ctx.close()

        # Order sheet checks
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs)
        await open_order(pg, 'CC-1007')
        check('order CC-1007 opened', await pg.locator('#ccs-sheet.ccs-open').count() == 1)
        # B3 cancel needs a reason
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="cancel"]')
        await pg.click('[data-act="do-cancel"]'); await pg.wait_for_timeout(250)
        check('B3 cancel without a reason is refused in place', 'Add the reason for cancelling' in await pg.inner_text('#ccs-sheet') and len(await calls(pg, 'rpc', 'staff_order_action')) == 0)
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v=""]')
        # A1 amend: Other needs details
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="amend"]')
        await jsclick(pg, '#ccs-sheet [data-act="am-open"][data-v="diet"]')
        await jsclick(pg, '#ccs-sheet [data-act="am-set"][data-f="diet"][data-v="yes"]')
        await pg.wait_for_timeout(150)
        await jsclick(pg, '#ccs-sheet [data-act="am-diet"][data-v="Other"]')
        await pg.fill('#ccs-sheet #am-reason', 'Customer called') if await pg.locator('#ccs-sheet #am-reason').count() else None
        await jsclick(pg, '#ccs-sheet [data-act="am-set"][data-f="by"][data-v="guest"]')
        await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(250)
        st = await pg.inner_text('#ccs-sheet')
        check('A1 amend with Other and no details is refused', 'You chose Other' in st, st[-400:])
        # A4 switching panel with unsaved amend asks first
        await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="note"]')
        check('A4 switching away from an unsaved amendment does not discard it', await pg.locator('#ccs-sheet [data-act="am-review"]').count() == 1)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        check('A4 Escape keeps unsaved amendment open', await pg.locator('#ccs-sheet [data-act="am-review"]').count() == 1)
        await ctx.close()

        # Kitchen brief always one page
        long = ' '.join(['Three tier design with hand-piped lace, gold leaf on every tier, sugar flowers in blush and ivory, a sugar topper and names.'] * 14)
        for size, items in [('A5', long), ('A5', None)]:
            ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, init="window.print=function(){};")
            if items:
                await pg.evaluate("(function(t){var o=window.__orders.filter(function(x){return x.reference==='CC-1007'})[0]; var i=o.order_items[0]; i.design_description=t; i.kitchen_notes=t; o.customer_notes=t; o.has_dietary=true; i.dietary=['Nut allergy','Other']; i.dietary_note=t.slice(0,300);})", items)
            await open_order(pg, 'CC-1007')
            await jsclick(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]')
            await jsclick(pg, f'#ccs-sheet [data-act="do-brief"][data-v="{size}"]'); await pg.wait_for_timeout(700)
            sc = await pg.evaluate("(document.getElementById('ccs-print')||{dataset:{}}).dataset.scale")
            n = await pdf_pages(pg, f'brief-{size}-{"long" if items else "short"}.pdf')
            label = f'{size} {"long order" if items else "normal order"}'
            check(f'brief {label} prints on exactly one page', n == 1, (n, sc))
            if items: check(f'brief {label} is scaled to fit, not cut', sc and float(sc) < 1, sc)
            else: check(f'brief {label} prints at full size', sc and float(sc) == 1, sc)
            await ctx.close()

        # ---------- phone 390 ----------
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs)
        await pg.click('.ccs-nav [data-tab="new"]'); await pg.wait_for_timeout(250)
        await pg.focus('#n-phone'); await pg.wait_for_timeout(150)
        check('A14 phone bottom bar hides while typing', not await pg.locator('.ccs-nav').is_visible())
        await pg.evaluate("document.activeElement.blur()"); await pg.wait_for_timeout(200)
        check('A14 bottom bar returns after typing', await pg.locator('.ccs-nav').is_visible())
        await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(300)
        off = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-head .ccs-tab')).filter(function(t){var r=t.getBoundingClientRect();return r.right>innerWidth+1||r.left<0}).length")
        check('A14 every Orders filter tab is on screen', off == 0, off)
        check('A14 no sideways scroll', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(300)
        ws = await pg.evaluate("(function(){var b=document.querySelector('.ccs-mini-m b');return b?getComputedStyle(b).whiteSpace:''})()")
        check('A17 Today rows do not cut the cake name on phone', ws == 'normal', ws)
        await pg.screenshot(path=str(OUT / 'phone-today.png'), full_page=True)
        await ctx.set_offline(True); await pg.wait_for_timeout(300)
        await open_order(pg, 'CC-1007')
        geo = await pg.evaluate("(function(){var n=document.getElementById('ccs-offline'),h=document.querySelector('#ccs-sheet .ccs-sheet-head');if(!n||!h)return null;return [n.getBoundingClientRect().bottom,h.getBoundingClientRect().top]})()")
        check('A14 offline banner does not cover the order panel head', geo and geo[1] >= geo[0] - 1, geo)
        await pg.screenshot(path=str(OUT / 'phone-offline-sheet.png'))
        await ctx.set_offline(False); await ctx.close()

        # landscape: side menu reaches Sign out
        ctx, pg = await newpage(b, {'width': 900, 'height': 400}, errs)
        so = await pg.evaluate("(function(){var s=document.querySelector('.ccs-side');return s?getComputedStyle(s).overflowY:''})()")
        check('A14 side menu scrolls on short screens', so == 'auto', so)
        await ctx.close()

        check('no page errors', not errs, errs[:3])
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")

asyncio.run(main())
