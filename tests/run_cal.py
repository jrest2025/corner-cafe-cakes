"""Pickup calendar checks on the local copy with invented data."""
import asyncio, pathlib, sys, datetime, zoneinfo
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsC"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "staff-test.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
T = datetime.datetime.now(zoneinfo.ZoneInfo('Pacific/Fiji')).date()
def iso(n): return (T + datetime.timedelta(days=n)).isoformat()
D1, D2 = iso(1), iso(2)

async def newpage(b, vp, errs, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def go_cal(pg):
    await pg.click('.ccs-nav [data-tab="calendar"]'); await pg.wait_for_timeout(300)

async def show_month_of(pg, d):
    # move forward until the month grid contains d
    for _ in range(3):
        if await pg.locator(f'.ccs-mday[data-v="{d}"]').count(): return True
        await pg.click('[data-act="cal-move"][data-v="1"]'); await pg.wait_for_timeout(250)
    return False

async def calls(pg, fn):
    return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")

async def fill_new_customer_and_cake(pg, qty='2'):
    await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450)
    await pg.fill('#n-name', 'New Calendar Guest'); await pg.click('[data-act="n-cust-next"]'); await pg.wait_for_timeout(200)
    await pg.click('[data-act="n-prod"][data-v="cheesecake"]'); await pg.wait_for_timeout(120)
    await pg.click('[data-act="n-size"][data-v="6"]'); await pg.wait_for_timeout(120)
    await pg.fill('#n-qty', qty)
    await pg.click('[data-act="n-next"][data-v="2"]'); await pg.wait_for_timeout(200)
    await pg.click('[data-act="n-finish"][data-v="standard"]'); await pg.wait_for_timeout(120)
    await pg.click('[data-act="n-diet"][data-v="no"]'); await pg.wait_for_timeout(120)
    await pg.click('[data-act="n-finish-next"]'); await pg.wait_for_timeout(300)

async def desktop(b, errs):
    ctx, pg = await newpage(b, {"width": 1280, "height": 900}, errs)
    check('desk Calendar in the side menu', await pg.locator('.ccs-nav [data-tab="calendar"]').count() == 1)
    await go_cal(pg)
    check('desk month view by default with date basis label', 'collection or delivery date' in (await pg.inner_text('#ccs-main')).lower())
    check('desk month grid shows the target date', await show_month_of(pg, D2))
    lab = await pg.get_attribute(f'.ccs-mday[data-v="{D2}"]', 'aria-label')
    check('desk month cell counts orders and cakes separately, cancelled left out', '3 orders · 5 cakes' in (lab or ''), lab)
    await pg.screenshot(path=str(OUT / 'desk-1-month.png'), full_page=True)
    await pg.click(f'.ccs-mday[data-v="{D2}"]'); await pg.wait_for_timeout(250)
    side = await pg.inner_text('.ccs-calside')
    check('desk side panel opens without a sheet', await pg.locator('#ccs-sheet.ccs-open').count() == 0)
    check('desk day panel shows full date, 3 orders and 5 cakes', ('3\norders' in side and '5\ncakes' in side), side[:300])
    check('desk day panel has New order for this date', await pg.locator('.ccs-calside [data-act="cal-add"]').count() == 1)
    times = await pg.locator('.ccs-calside .ccs-cev-t').all_inner_texts()
    check('desk pickups listed in time order', times == ['2:00pm', '2:00pm', '2:15pm'], times)
    await pg.select_option('#cal-status', 'off'); await pg.wait_for_timeout(200)
    check('desk filter shows cancelled orders only', 'CC-1008' not in side and (await pg.locator('.ccs-calside .ccs-cev').count()) == 1)
    await pg.select_option('#cal-status', 'active'); await pg.wait_for_timeout(200)
    await pg.click('.ccs-calside [data-act="cal-pre"][data-id="o7"]'); await pg.wait_for_timeout(250)
    pre = await pg.inner_text('.ccs-calside')
    check('desk preview shows reference, customer, cakes and pending change', all(x in pre for x in ['CC-1007', 'Test Customer B', '6 inch × 3', 'kitchen has not confirmed']), pre[:400])
    check('desk preview has Open, Amend and Print kitchen brief', all([await pg.locator('.ccs-calside [data-act="open-order"]').count() == 1, await pg.locator('.ccs-calside [data-act="cal-amend"]').count() == 1, await pg.locator('.ccs-calside [data-act="cal-brief"]').count() == 1]))
    await pg.screenshot(path=str(OUT / 'desk-2-preview.png'), full_page=True)
    await pg.click('.ccs-calside [data-act="cal-amend"]'); await pg.wait_for_timeout(450)
    check('desk Amend order opens the existing amendment form', await pg.locator('#ccs-sheet #am-time').count() == 1)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    check('desk first Escape closes only the amend panel', await pg.locator('#ccs-sheet.ccs-open').count() == 1 and await pg.locator('#ccs-sheet #am-time').count() == 0)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    check('desk closing the order keeps the selected date', await pg.locator(f'.ccs-mcell.is-sel .ccs-mday[data-v="{D2}"]').count() == 1)
    # week view and time slot prefill
    await pg.click('[data-act="cal-view"][data-v="week"]'); await pg.wait_for_timeout(300)
    check('desk week view shows a time grid', await pg.locator('.ccs-wgrid').is_visible())
    await pg.screenshot(path=str(OUT / 'desk-3-week.png'), full_page=True)
    await pg.click(f'.ccs-wadd[data-v="{D2}"][data-t="15:00"]', force=True); await pg.wait_for_timeout(350)
    note = await pg.inner_text('#ccs-sheet')
    check('desk time slot opens New order as a panel with date and time', await pg.locator('#ccs-sheet.ccs-open .ccs-newsheet').count() == 1 and 'Pickup date from the calendar' in note and '3:00pm' in note, note[:300])
    check('desk calendar stays on screen behind the panel', await pg.locator('#ccs-main .ccs-wgrid').count() == 1)
    await fill_new_customer_and_cake(pg)
    main = await pg.inner_text('#ccs-sheet')
    check('desk When step already filled from the slot', '3:00pm' in main and 'Price and payment' in main, main[:600])
    await pg.screenshot(path=str(OUT / 'desk-4-new.png'), full_page=True)
    # double tap guard
    await pg.evaluate("var b=document.querySelector('[data-act=\"n-submit\"]'); b.click(); b.click();"); await pg.wait_for_timeout(400)
    cs = await calls(pg, 'staff_create_order')
    check('desk repeated taps send one save', len(cs) == 1, len(cs))
    check('desk saved with calendar date, time, quantity and source', cs and cs[0]['p']['date'] == D2 and cs[0]['p']['time'] == '15:00' and cs[0]['p']['quantity'] == 2, cs and cs[0]['p'])
    await pg.wait_for_timeout(300)
    toast = await pg.inner_text('#ccs-toast')
    check('desk confirmation shows the reference and date', 'CC-1009 saved for' in toast, toast)
    check('desk panel closes after saving', await pg.locator('#ccs-sheet.ccs-open').count() == 0)
    check('desk stays on the same view (week) and date', await pg.locator('.ccs-wgrid').is_visible() and await pg.locator(f'.ccs-whead.is-sel[data-v="{D2}"]').count() == 1)
    check('desk new order is marked on the calendar', await pg.locator('.ccs-cev.is-new[data-id="o9"]').count() >= 1)
    side = await pg.inner_text('.ccs-calside')
    check('desk new order appears with updated counts (4 orders, 7 cakes)', '4\norders' in side and '7\ncakes' in side, side[:200])
    # day view
    await pg.click('[data-act="cal-view"][data-v="day"]'); await pg.wait_for_timeout(300)
    dv = await pg.inner_text('#ccs-main')
    check('desk day view shows slots and busy marker', 'New order at' in dv and '3 pickups' in dv, dv[:500])
    await pg.screenshot(path=str(OUT / 'desk-5-day.png'), full_page=True)
    # year view
    await pg.click('[data-act="cal-view"][data-v="year"]'); await pg.wait_for_timeout(400)
    yl = await pg.get_attribute(f'.ccs-yday[data-v="{D2}"]', 'aria-label')
    check('desk year view shows day volume', yl and '4 orders, 7 cakes' in yl, yl)
    check('desk year view has a legend', 'Fewer' in await pg.inner_text('.ccs-ylegend'))
    await pg.click('[data-act="cal-basis"][data-v="cakes"]'); await pg.wait_for_timeout(200)
    check('desk year view switches to cakes', 'cakes per day' in await pg.inner_text('.ccs-ylegend'))
    await pg.screenshot(path=str(OUT / 'desk-6-year.png'), full_page=True)
    await pg.click(f'.ccs-yday[data-v="{D2}"]'); await pg.wait_for_timeout(400)
    check('desk selecting a year date opens its schedule', 'New order for this date' in await pg.inner_text('.ccs-calside'))
    # load failure is not shown as an empty day
    await pg.click('[data-act="cal-view"][data-v="month"]'); await pg.wait_for_timeout(300)
    await pg.evaluate("window.__calFail=true"); await pg.click('[data-act="cal-move"][data-v="1"]'); await pg.wait_for_timeout(350)
    t = await pg.inner_text('#ccs-main')
    check('desk load failure says so, not "no pickups"', 'could not load' in t and 'No pickups' not in t, t[:300])
    await pg.evaluate("window.__calFail=false"); await pg.click('[data-act="cal-retry"]'); await pg.wait_for_timeout(350)
    check('desk retry loads the month', await pg.locator('.ccs-mgrid').count() == 1)
    await ctx.close()

async def short_notice_and_failure(b, errs):
    ctx, pg = await newpage(b, {"width": 1280, "height": 900}, errs)
    await go_cal(pg); await show_month_of(pg, D1)
    await pg.click(f'.ccs-mday[data-v="{D1}"]'); await pg.wait_for_timeout(250)
    await pg.click('.ccs-calside [data-act="cal-add"]'); await pg.wait_for_timeout(300)
    await fill_new_customer_and_cake(pg, '1')
    main = await pg.inner_text('#ccs-sheet')
    check('short notice: When step stays open with date set', 'This is short notice' in main, main[:500])
    check('short notice: workload box shows hours', 'Collection hours' in main)
    await pg.fill('#n-rush', 'Cake from today batch')
    await pg.click('[data-act="n-time"][data-v="12:00"]'); await pg.wait_for_timeout(200)
    check('short notice needs who approved it', 'Enter who approved' in await pg.inner_text('#ccs-sheet'))
    await pg.fill('#n-rushby', 'Chef Test')
    await pg.click('[data-act="n-time"][data-v="12:00"]'); await pg.wait_for_timeout(250)
    # failed save keeps everything
    await pg.evaluate("window.__createFail=true")
    await pg.click('[data-act="n-submit"]'); await pg.wait_for_timeout(400)
    inl = await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=n-submit]'),p=b&&b.previousElementSibling;return p&&p.classList.contains('ccs-err')?p.textContent:''})()")
    check('B8 failed save says Not saved right above the Save button', inl.startswith('Not saved') and 'kept' in inl, inl)
    check('failed save keeps the panel, the form and the Save button', await pg.locator('#ccs-sheet.ccs-open [data-act="n-submit"]:not([disabled])').count() == 1 and 'New Calendar Guest' in await pg.inner_text('#ccs-sheet'))
    await pg.evaluate("window.__createFail=false")
    await pg.click('[data-act="n-submit"]'); await pg.wait_for_timeout(400)
    cs = await calls(pg, 'staff_create_order')
    check('retry uses the same order key (no duplicate)', len(cs) == 2 and cs[0]['p']['idempotency_key'] == cs[1]['p']['idempotency_key'])
    check('short notice saved with reason and approver', cs[-1]['p']['rush'] == {'reason': 'Cake from today batch', 'approved_by': 'Chef Test'}, cs[-1]['p'].get('rush'))
    await pg.wait_for_timeout(200)
    check('saved after retry', 'saved for' in await pg.inner_text('#ccs-toast'))
    # closing half way keeps the draft
    await pg.click(f'.ccs-mday[data-v="{D2}"]'); await pg.wait_for_timeout(250)
    await pg.click('.ccs-calside [data-act="cal-add"]'); await pg.wait_for_timeout(300)
    await pg.fill('#n-phone', '912 0001'); await pg.wait_for_timeout(450)
    await pg.click('[data-act="n-pick"][data-v="0"]'); await pg.wait_for_timeout(200)
    await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
    check('closing the panel half way keeps the order', 'Unfinished order kept' in await pg.inner_text('#ccs-toast') and await pg.locator('#ccs-sheet.ccs-open').count() == 0)
    # unfinished order prompt
    await pg.click('.ccs-calside [data-act="cal-add"]'); await pg.wait_for_timeout(250)
    check('unfinished order: asks before replacing it', 'You have an unfinished order for Test Customer A' in await pg.inner_text('.ccs-calside'))
    await pg.click('[data-act="cal-add-keep"]'); await pg.wait_for_timeout(300)
    m = await pg.inner_text('#ccs-sheet')
    check('unfinished order carried on in the panel', 'Test Customer A' in m and 'Pickup date from the calendar' in m, m[:300])
    await ctx.close()

async def small(b, errs, name, vp):
    ctx, pg = await newpage(b, vp, errs)
    if vp['width'] < 760:
        bar = await pg.locator('.ccs-nav .ccs-nav-item:visible').all_inner_texts()
        check(f'{name} bottom bar has Calendar, Kitchen moves to More', any('Calendar' in x for x in bar) and not any('Kitchen' in x for x in bar), bar)
    await go_cal(pg); await show_month_of(pg, D2)
    await pg.screenshot(path=str(OUT / f'{name}-1-month.png'), full_page=True)
    await pg.click(f'.ccs-mday[data-v="{D2}"]'); await pg.wait_for_timeout(400)
    check(f'{name} date opens a day sheet', await pg.locator('#ccs-sheet.ccs-open').count() == 1 and 'New order for this date' in await pg.inner_text('#ccs-sheet'))
    await pg.screenshot(path=str(OUT / f'{name}-2-daysheet.png'))
    await pg.click('#ccs-sheet [data-act="cal-pre"][data-id="o1"]'); await pg.wait_for_timeout(300)
    check(f'{name} order preview in the sheet', 'CC-1001' in await pg.inner_text('#ccs-sheet') and 'Dietary or allergy' in await pg.inner_text('#ccs-sheet'))
    await pg.screenshot(path=str(OUT / f'{name}-3-preview.png'))
    await pg.click('#ccs-sheet [data-act="cal-pre"][data-id=""]'); await pg.wait_for_timeout(250)
    await pg.click('#ccs-sheet [data-act="cal-add"]'); await pg.wait_for_timeout(400)
    check(f'{name} New order opens the order form in place of the day sheet', 'Pickup date from the calendar' in await pg.inner_text('#ccs-sheet') and await pg.locator('#ccs-sheet .ccs-newsheet').count() == 1)
    await pg.screenshot(path=str(OUT / f'{name}-3b-newpanel.png'))
    await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(350)
    check(f'{name} closing returns to the calendar', await pg.locator('#ccs-sheet.ccs-open').count() == 0 and await pg.locator('.ccs-calbar').count() == 1)
    await pg.click('[data-act="cal-view"][data-v="week"]'); await pg.wait_for_timeout(300)
    check(f'{name} week view is a readable list', await pg.locator('.ccs-wlist').is_visible() and not await pg.locator('.ccs-wgrid').is_visible())
    await pg.screenshot(path=str(OUT / f'{name}-4-week.png'), full_page=True)
    await pg.click('[data-act="cal-view"][data-v="year"]'); await pg.wait_for_timeout(350)
    await pg.screenshot(path=str(OUT / f'{name}-5-year.png'))
    over = await pg.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    check(f'{name} no sideways scrolling', not over)
    await ctx.close()

async def roles(b, errs):
    ctx, pg = await newpage(b, {"width": 1280, "height": 900}, errs, role='finance')
    await go_cal(pg); await show_month_of(pg, D2)
    await pg.click(f'.ccs-mday[data-v="{D2}"]'); await pg.wait_for_timeout(250)
    check('finance can view but not add or amend', await pg.locator('[data-act="cal-add"]').count() == 0 and await pg.locator('.ccs-wadd').count() == 0)
    await ctx.close()
    ctx, pg = await newpage(b, {"width": 1280, "height": 900}, errs, role='kitchen')
    check('kitchen login does not get the calendar', await pg.locator('[data-tab="calendar"]').count() == 0)
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        await desktop(b, errs)
        await short_notice_and_failure(b, errs)
        await small(b, errs, 'phone', {"width": 390, "height": 844})
        await small(b, errs, 'tablet', {"width": 820, "height": 1180})
        await roles(b, errs)
        check('no script errors', not errs, errs)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
