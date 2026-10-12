"""CRM step 2 checks on the built staff app with invented data: matching old sheet orders to customers
(link, new profile with a corrected number, duplicate number refused, leave without a profile, undo),
sheet orders on the profile, who sees what, and phone layout."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsStep2"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
DESK = {'width': 1280, 'height': 900}
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")
async def main_text(pg): return await pg.inner_text('#ccs-main') if await pg.locator('#ccs-main').count() else await pg.inner_text('body')

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg = await newpage(b, DESK, errs)
        await pg.evaluate("window.__calls = window.__calls || []")
        await pg.click('.ccs-nav [data-tab="register"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('body')
        check('register shows Customers to match', 'Customers to match' in t, t[:300])
        check('incomplete number is called out', 'not a full mobile number' in t)
        check('staff email is called out and not copied', 'staff email' in t and 'will not be copied' in t)
        check('no-phone count explained', '53 sheet orders have no mobile number' in t)
        check('candidate offered with reason', 'C-101 Test Customer A' in t and 'same mobile number' in t)
        await pg.screenshot(path=str(OUT / 'desk-register.png'), full_page=True)

        # Link to the candidate
        await pg.click('[data-act="rg-cm-link"][data-k="sheet:walkin|2026-06-18T08:19:37Z"]'); await pg.wait_for_timeout(500)
        c = await calls(pg, 'register_customer_decide')
        check('link sends the chosen profile', len(c) == 1 and c[0]['p_action'] == 'link' and c[0]['p_customer'] == 'c1', c)
        t = await pg.inner_text('body')
        check('linked record leaves the list', 'TEST CUSTMER A ·' not in t and 'Linked to the profile' in await pg.inner_text('#ccs-toast'))
        check('match is listed with name and who did it', 'Customer matches made (1)' in t)

        # New profile: incomplete number is not prefilled; a number already on a profile is refused with a link option
        await pg.click('[data-act="rg-cm-open"][data-k="sheet:walkin|2026-08-01T22:08:20Z"]'); await pg.wait_for_timeout(250)
        check('incomplete sheet number not prefilled', await pg.input_value('#cm-phone') == '')
        await pg.click('[data-act="rg-cm-new"]'); await pg.wait_for_timeout(400)
        check('no number and no email: clear message', 'not a full mobile number' in await pg.inner_text('.ccs-panel'))
        await pg.fill('#cm-phone', '912 0001'); await pg.click('[data-act="rg-cm-new"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('.ccs-panel')
        check('number already on a profile: refused, link offered', 'already on a profile' in t and 'Link to this profile' in t, t)
        check('typed number kept after the refusal', await pg.input_value('#cm-phone') == '912 0001')
        await pg.fill('#cm-phone', '999 0007'); await pg.click('[data-act="rg-cm-new"]'); await pg.wait_for_timeout(500)
        c = await calls(pg, 'register_customer_decide')
        check('new profile sends the corrected number', c[-1]['p_action'] == 'new' and c[-1]['p_phone'] == '999 0007', c[-1])
        t = await pg.inner_text('body')
        check('list now empty', 'Every sheet order with a mobile number is on a customer profile' in t)

        # Undo needs two taps
        u = pg.locator('[data-act="rg-cm-undo"]').first
        await pg.click('.ccs-more summary'); await pg.wait_for_timeout(150)
        await u.click(); await pg.wait_for_timeout(150)
        check('undo asks for a second tap', 'Tap again to undo' in await u.inner_text())
        await u.click(); await pg.wait_for_timeout(500)
        c = await calls(pg, 'register_customer_decide')
        check('undo sent', c[-1]['p_action'] == 'undo', c[-1])
        check('undo toast warns a made profile stays', 'Any profile made for it stays' in await pg.inner_text('#ccs-toast'))
        t = await pg.inner_text('body')
        check('undone record back in the list', 'Customers to match' in t and ('Test Short Number' in t or 'TEST CUSTMER A' in t))

        # Leave without a profile needs two taps
        n = pg.locator('[data-act="rg-cm-none"]').first
        await n.click(); await pg.wait_for_timeout(150)
        check('leave-without asks for a second tap', 'Tap again to confirm' in await n.inner_text())
        await n.click(); await pg.wait_for_timeout(500)
        c = await calls(pg, 'register_customer_decide')
        check('leave-without sent', c[-1]['p_action'] == 'none', c[-1])

        # Profile shows sheet orders
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(450)
        await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(500)
        sh = await pg.inner_text('#ccs-sheet')
        check('profile shows Orders from the old sheets', 'orders from the old sheets' in sh.lower() and 'Black Forest' in sh and 'W-0412' in sh, sh[-500:])
        check('name as typed on the sheet shown', 'as TEST CUST A' in sh)
        check('says not yet in the totals', 'not yet in the totals' in sh)
        await ctx.close()

        # Finance: no matching section, but profile still shows sheet orders
        ctx, pg = await newpage(b, DESK, errs, 'finance')
        check('finance: no Register tab', await pg.locator('.ccs-nav [data-tab="register"]').count() == 0)
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(450)
        await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(500)
        sh = await pg.inner_text('#ccs-sheet')
        check('finance: sheet orders visible, no Full record button', 'orders from the old sheets' in sh.lower() and await pg.locator('#ccs-sheet [data-act="rg-open"]').count() == 0)
        await ctx.close()

        # Phone layout
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs)
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(250)
        await pg.click('#ccs-sheet [data-tab="register"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-act="rg-cm-open"]'); await pg.wait_for_timeout(250)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('phone: matching cards fit without sideways scroll', sw <= 390, sw)
        await pg.screenshot(path=str(OUT / 'phone-register.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
