"""CRM phase 1 checks on the built staff app with invented data: order contact snapshot, safe profile editing,
change history, per-channel marketing permission, search wording and phone layout."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsCRM"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager', extra=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")

async def open_customer(pg, phone=False):
    if phone:
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(250)
        await pg.click('#ccs-sheet [data-tab="customers"]')
    else:
        await pg.click('.ccs-nav [data-tab="customers"]')
    await pg.wait_for_timeout(450)
    await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(450)

async def main():
    errs = []
    DESK = {'width': 1280, 'height': 900}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- order keeps its own contact ----
        ctx, pg = await newpage(b, DESK, errs, 'manager', 'window.__contactDiff=true;')
        await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-main')
        check('order list shows the name the order was placed with', 'Sam Collecting' in t, t[:300])
        await pg.locator('[data-act="open-order"][data-id="o1"]').first.click(); await pg.wait_for_timeout(450)
        sh = await pg.inner_text('#ccs-sheet')
        check('order shows its contact and the profile name beside it', 'Sam Collecting' in sh and 'Profile name' in sh and 'Test Customer A' in sh, sh[:600])
        await pg.click('[data-act="panel"][data-v="amend"]'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="am-open"][data-v="cust"]'); await pg.wait_for_timeout(150)
        sh = await pg.inner_text('#ccs-sheet')
        check('amend says contact changes are for this order only', 'Contact on this order' in sh and 'Changes this order only' in sh, sh[-500:])
        await pg.fill('#am-cphone', '912 0888'); await pg.click('[data-act="am-set"][data-f="by"][data-v="guest"]'); await pg.fill('#am-reason', 'Sister is collecting')
        await pg.click('[data-act="am-review"]'); await pg.wait_for_timeout(300)
        c = await calls(pg, 'staff_amend_order')
        check('amend sends the new mobile for this order', c and c[-1]['p_changes'].get('customer_phone') == '912 0888', c[-1] if c else c)
        await ctx.close()

        # ---- profile view ----
        ctx, pg = await newpage(b, DESK, errs)
        await open_customer(pg)
        sh = await pg.inner_text('#ccs-sheet')
        check('profile shows the customer number', 'C-101' in sh, sh[:200])
        check('profile opens on Overview with four sections', await pg.locator('#ccs-sheet .ws-tabs [data-act="ws-tab"]').count() == 4 and await pg.locator('#ccs-sheet [data-act="ws-tab"][data-v="overview"][aria-pressed="true"]').count() == 1)
        check('marketing is not mixed into the overview', 'Marketing permission' not in sh)
        await pg.click('#ccs-sheet [data-act="ws-tab"][data-v="comms"]'); await pg.wait_for_timeout(150)
        sh = await pg.inner_text('#ccs-sheet')
        check('marketing shown per channel with reconfirm flag', 'WhatsApp' in sh and 'Yes, needs reconfirming' in sh and 'SMS' in sh and 'Phone call' in sh, sh)
        check('email channel not asked yet', 'Not asked' in sh)
        await pg.screenshot(path=str(OUT / 'profile.png'), full_page=True)
        # per-channel consent
        await pg.click('#ccs-sheet [data-act="consent-ch"][data-ch="whatsapp"][data-v="true"]'); await pg.wait_for_timeout(500)
        c = await calls(pg, 'staff_set_channel_consent')
        check('reconfirm sends WhatsApp only', c and c[-1]['p_channels'] == ['whatsapp'] and c[-1]['p_granted'] is True, c)
        sh = await pg.inner_text('#ccs-sheet')
        check('WhatsApp now plain Yes, SMS still needs reconfirming', sh.count('Yes, needs reconfirming') == 1, sh)
        check('service messages explained as separate from marketing', 'service messages' in sh)
        # history
        await pg.click('#ccs-sheet [data-act="ws-tab"][data-v="overview"]'); await pg.wait_for_timeout(150)
        await pg.click('#ccs-sheet [data-act="cust-history"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('manager sees field history in plain words', 'Service notes from blank to Prefers less sweet icing' in sh, sh[-400:])
        # edit: open orders need a choice
        await pg.click('#ccs-sheet [data-act="cust-edit"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ce-phone', '912 0555'); await pg.click('[data-act="cust-save"]'); await pg.wait_for_timeout(300)
        sh = await pg.inner_text('#ccs-sheet')
        check('saving a contact change asks about open orders first', 'Choose whether the open orders should change too' in sh and not await calls(pg, 'staff_update_customer'), sh[-300:])
        check('typed number kept after the warning', await pg.input_value('#ce-phone') == '912 0555')
        await pg.click('[data-act="ce-orders"][data-v="orders"]'); await pg.wait_for_timeout(150)
        check('typed number kept after choosing', await pg.input_value('#ce-phone') == '912 0555')
        # impossible birthday is refused, typing kept
        await pg.select_option('#ce-bday', '30'); await pg.select_option('#ce-bmonth', '2')
        await pg.click('[data-act="cust-save"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('30 February refused', 'does not exist in that month' in sh, sh[-300:])
        await pg.select_option('#ce-bday', '29'); await pg.wait_for_timeout(100)
        await pg.click('[data-act="cust-save"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'staff_update_customer')
        check('save sends version, changes and the open-orders choice', c and c[-1]['p_version'] == 3 and c[-1]['p_changes'].get('phone') == '912 0555' and c[-1]['p_changes'].get('birth_month') == 2 and c[-1]['p_active_orders'] is True, c[-1] if c else c)
        toast = await pg.inner_text('#ccs-toast')
        check('result explains orders updated and permission not moved', '2 open orders updated' in toast and 'Marketing permission stays' in toast, toast)
        sh = await pg.inner_text('#ccs-sheet')
        check('profile shows the new birthday without a year', '29 February' in sh, sh[:600])
        await pg.click('#ccs-sheet [data-act="ws-tab"][data-v="comms"]'); await pg.wait_for_timeout(150)
        sh = await pg.inner_text('#ccs-sheet')
        check('old WhatsApp yes no longer applies to the new number', 'An earlier yes was for a different one' in sh, sh)
        await pg.click('#ccs-sheet [data-act="ws-tab"][data-v="overview"]'); await pg.wait_for_timeout(150)
        await ctx.close()

        # ---- someone else saved first ----
        ctx, pg = await newpage(b, DESK, errs, 'manager', 'window.__custStale=true;')
        await open_customer(pg)
        await pg.click('#ccs-sheet [data-act="cust-edit"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ce-prefs', 'Less sweet, collects after 5pm'); await pg.click('[data-act="cust-save"]'); await pg.wait_for_timeout(700)
        sh = await pg.inner_text('#ccs-sheet')
        check('conflict explained, edit stays open', 'Someone else changed this customer' in sh and await pg.locator('#ce-prefs').count() == 1, sh[-400:])
        check('typing kept after a conflict', await pg.input_value('#ce-prefs') == 'Less sweet, collects after 5pm')
        await pg.click('.ccs-sheet-shade, #ccs-shade', force=True) if await pg.locator('#ccs-shade').count() else None
        await pg.wait_for_timeout(200)
        check('closing with unsaved typing is held back', await pg.locator('#ccs-sheet.ccs-open').count() == 1)
        await pg.click('[data-act="cust-save"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'staff_update_customer')
        check('second save uses the newer version', len(c) == 2 and c[-1]['p_version'] == 4 and 'preferences' in c[-1]['p_changes'], c)
        await ctx.close()

        # ---- roles ----
        for role, edit, hist, mkt in [('front_of_house', True, False, True), ('finance', False, False, False), ('marketing', False, False, True)]:
            ctx, pg = await newpage(b, DESK, errs, role)
            await open_customer(pg)
            check(f'{role}: edit {"shown" if edit else "hidden"}', (await pg.locator('#ccs-sheet [data-act="cust-edit"]').count() > 0) == edit)
            check(f'{role}: history {"shown" if hist else "hidden"}', (await pg.locator('#ccs-sheet [data-act="cust-history"]').count() > 0) == hist)
            check(f'{role}: marketing {"shown" if mkt else "hidden"}', (await pg.locator('#ccs-sheet [data-act="ws-tab"][data-v="comms"]').count() > 0) == mkt)
            await ctx.close()

        # ---- duplicate flag and search wording ----
        ctx, pg = await newpage(b, DESK, errs)
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(400)
        ph = await pg.get_attribute('#ccs-cq', 'placeholder')
        check('search says what it finds', 'email' in ph and 'order number' in ph and 'C-number' in ph, ph)
        t = await pg.inner_text('#ccs-main')
        check('list marks yes answers that need reconfirming', 'To confirm' in t, t[:400])
        await pg.locator('[data-act="open-customer"][data-id="c2"]').first.click(); await pg.wait_for_timeout(450)
        sh = await pg.inner_text('#ccs-sheet')
        check('possible duplicate is flagged on the profile', 'Check for a duplicate' in sh and 'Same mobile number' in sh, sh[:400])
        await ctx.close()

        # ---- add customer, cancel and unsaved typing ----
        ctx, pg = await newpage(b, DESK, errs)
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(400)
        check('Add customer button on the list', await pg.locator('[data-act="cust-new"]').count() == 1)
        await pg.click('[data-act="cust-new"]'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="cn-cancel"]'); await pg.wait_for_timeout(250)
        check('Cancel with nothing typed closes straight away', await pg.locator('#ccs-sheet.ccs-open').count() == 0)
        await pg.click('[data-act="cust-new"]'); await pg.wait_for_timeout(250)
        await pg.fill('#ce-name', 'New Walk In'); await pg.click('[data-act="cn-save"]'); await pg.wait_for_timeout(300)
        check('a mobile or email is required', 'Enter a mobile number or an email' in await pg.inner_text('#ccs-sheet'))
        check('typed name kept after the error', await pg.input_value('#ce-name') == 'New Walk In')
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(250)
        check('cross with typing asks first', await pg.locator('#ccs-sheet.ccs-open').count() == 1 and 'Tap again' in await pg.inner_text('#ccs-toast'))
        await pg.click('#ccs-shade', position={'x': 20, 'y': 400}); await pg.wait_for_timeout(250)
        check('tapping outside with typing keeps the form open', await pg.locator('#ccs-sheet.ccs-open').count() == 1)
        await pg.fill('#ce-phone', '912 0001'); await pg.click('[data-act="cn-consent"][data-v="whatsapp"]'); await pg.wait_for_timeout(150)
        check('typing kept after tapping a consent channel', await pg.input_value('#ce-phone') == '912 0001' and await pg.input_value('#ce-name') == 'New Walk In')
        await pg.click('[data-act="cn-save"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('existing number shows the matching profile first', 'Already on a profile' in sh and 'C-101' in sh and 'Not the same person, add customer' in sh, sh[-500:])
        await pg.click('[data-act="cn-save"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'staff_create_customer')
        check('second save confirms a new person, with WhatsApp yes', len(c) == 2 and c[-1]['p_confirm_new'] is True and c[-1]['p']['consent_channels'] == ['whatsapp'] and c[0]['p_confirm_new'] is False, c)
        sh = await pg.inner_text('#ccs-sheet')
        check('new profile opens with its number and source', 'C-389' in sh and 'Added by staff' in sh and 'C-389 added' in await pg.inner_text('#ccs-toast'), sh[:400])
        check('button reads Edit Customer', 'Edit Customer' in sh)
        await pg.click('#ccs-sheet [data-act="cust-edit"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ce-prefs', 'Likes chocolate'); await pg.click('[data-act="cust-cancel"]'); await pg.wait_for_timeout(200)
        check('Cancel with typing asks first', await pg.locator('#ce-prefs').count() == 1 and 'Tap again to discard' in await pg.inner_text('#ccs-sheet'))
        await pg.click('[data-act="cust-cancel"]'); await pg.wait_for_timeout(200)
        check('second tap discards and leaves edit', await pg.locator('#ce-prefs').count() == 0)
        await ctx.close()
        ctx, pg = await newpage(b, DESK, errs, 'finance')
        await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(400)
        check('finance: no Add customer button', await pg.locator('[data-act="cust-new"]').count() == 0)
        await ctx.close()

        # ---- phone ----
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs)
        await open_customer(pg, phone=True)
        await pg.click('#ccs-sheet [data-act="cust-edit"]'); await pg.wait_for_timeout(250)
        sw = await pg.evaluate("Math.max(document.documentElement.scrollWidth, document.getElementById('ccs-sheet').scrollWidth)")
        check('phone: profile editor fits without sideways scroll', sw <= 390, sw)
        await pg.screenshot(path=str(OUT / 'phone-edit.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
