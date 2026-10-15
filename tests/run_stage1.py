"""Stage 1, Order Received: New order as one button opening a panel, save returns to Today, allergies Not sure,
counter confirm off by default, customer email status and resend, review flags. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsS1"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))
DESK = {'width': 1366, 'height': 900}; TAB = {'width': 1024, 'height': 768}; PHONE = {'width': 390, 'height': 844}
async def start(b, vp, role='front_of_house', init=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}} {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900)
    return ctx, pg, errs
async def js(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(220)
async def nxt(pg): await js(pg, '.sl-stepbar [data-act="sl-next"]')
async def stage(pg): return await pg.inner_text('.sl-stephead')
async def new_btn(pg): await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=new]')).filter(function(e){return e.offsetParent}).pop().click()"); await pg.wait_for_timeout(500)
async def creates(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
async def take(pg, name, phone, diet='no', email=None):
    await js(pg, '[data-act="n-source"][data-v="phone"]')
    await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await nxt(pg)
    await pg.fill('#n-name', name); await nxt(pg)
    await pg.fill('#n-phone', phone); await pg.wait_for_timeout(450)
    if email and await pg.locator('#n-email').count(): await pg.fill('#n-email', email)
    await js(pg, '[data-act="sl-opt"][data-v="no"]'); await nxt(pg)
    await js(pg, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await js(pg, '#sl-st-3 [data-act="n-time"][data-v="15:00"]'); await nxt(pg)
    await js(pg, f'[data-act="n-diet"][data-v="{diet}"]'); await pg.wait_for_timeout(500)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. New order is a button, not a menu tab, and opens over the dashboard
        for vp, nm in [(DESK, 'desktop'), (TAB, 'tablet'), (PHONE, 'phone')]:
            ctx, pg, errs = await start(b, vp)
            tabs = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-nav [data-tab]')).map(function(x){return x.dataset.tab})")
            vis = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=new]')).filter(function(e){return e.offsetParent}).map(function(e){var r=e.getBoundingClientRect();return [Math.round(r.right), Math.round(r.top), Math.round(r.height)]})")
            check(f'{nm}: New order is not a menu tab and one button is on screen at the top right', 'new' not in tabs and len(vis) == 1 and vis[0][0] >= vp['width'] - 120 and vis[0][1] < 80 and vis[0][2] >= 44, [tabs, vis])
            await new_btn(pg)
            check(f'{nm}: New order opens in a panel with the dashboard still behind it', await pg.locator('#ccs-sheet.ccs-open .sl-stepper').count() == 1 and await pg.locator('#ccs-main .ccs-dash-head').count() == 1)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            check(f'{nm}: no sideways scrolling', sw <= vp['width'], sw)
            await pg.screenshot(path=str(OUT / f'{nm}-panel.png'))
            check(f'{nm}: no page errors', not errs, errs); await ctx.close()

        # 2. Take an order: allergies Not sure, saved for review by default, back to Today
        ctx, pg, errs = await start(b, TAB)
        await new_btn(pg)
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|6"]')
        cc = await pg.evaluate("(function(){var c=document.querySelector('[data-act=n-cell][aria-pressed=true]');var s=getComputedStyle(c);return [s.backgroundColor,s.color,c.textContent]})()")
        check('the chosen price stays readable: white on dark', cc[0] == 'rgb(17, 17, 17)' and cc[1] == 'rgb(255, 255, 255)' and cc[2] == '$54', cc)
        await take(pg, 'Stage One Guest', '912 0555', diet='unsure')
        t = await pg.inner_text('#ccs-sheet')
        check('allergies offer No, Yes and Not sure', await pg.locator('[data-act="n-diet"][data-v="unsure"]').count() == 1)
        check('Not sure explains what happens', 'Allergies not confirmed yet. Check with the customer before baking.' in t, t[-600:])
        await nxt(pg); await js(pg, '.sl-stepbar [data-act="sl-skip"]')
        check('reaches Check and save', 'Step 7 of 7' in await stage(pg), await stage(pg))
        await js(pg, '[data-act="n-plan"][data-v="later"]')
        live = await pg.inner_text('.sl-live')
        check('slip preview shows the allergy check line', 'Allergies not confirmed yet' in live)
        cb = pg.locator('[data-nc="confirmNow"]')
        check('confirm now is off by default and explained', await cb.count() == 1 and not await cb.is_checked() and 'waits in Needs attention' in await pg.inner_text('#ccs-sheet'))
        btn = await pg.inner_text('[data-act="n-submit"]')
        check('main button says Save cake order', btn.startswith('Save cake order'), btn)
        await pg.screenshot(path=str(OUT / 'check-and-save.png'))
        await pg.evaluate("var b=document.querySelector('[data-act=\"n-submit\"]'); b.click(); b.click();"); await pg.wait_for_timeout(900)
        c = await creates(pg)
        check('saved once with the allergy answer Not sure and no counter confirm', len(c) == 1 and c[0]['has_dietary'] == 'unsure' and not c[0].get('confirm_now'), c)
        toast = await pg.inner_text('#ccs-toast')
        check('back on Today: panel closed and the message gives the order number and where it is', await pg.locator('#ccs-sheet.ccs-open').count() == 0 and await pg.locator('#ccs-main .ccs-dash-head').count() == 1 and 'CC-1009 saved' in toast and 'Needs attention' in toast, toast)
        check('no email entered: the message says no email was sent', 'No email address was given' in toast, toast)
        first = await pg.evaluate("(function(){var m=document.querySelector('.tp-needs .ccs-mini');return m?[m.className, m.textContent]:null})()")
        check('the new order is first under Needs attention and marked', first and 'is-new' in first[0] and 'CC-1009' in first[1], first)
        await pg.screenshot(path=str(OUT / 'back-on-today.png'))
        # confirm now changes the button
        await new_btn(pg)
        await take(pg, 'Counter Paying Guest', '912 0556', diet='no'); await js(pg, '.sl-stepbar [data-act="sl-skip"]')
        await js(pg, '[data-act="n-plan"][data-v="later"]'); await pg.check('[data-nc="confirmNow"]'); await pg.wait_for_timeout(250)
        btn = await pg.inner_text('[data-act="n-submit"]')
        check('ticking confirm now changes the button to Save and confirm', btn.startswith('Save and confirm'), btn)
        await js(pg, '[data-act="n-plan"][data-v="full"]')
        btn = await pg.inner_text('[data-act="n-submit"]'); txt = await pg.inner_text('.sl-stepmain')
        check('Paid in full: Paid by offers Cash, EFTPOS, M-PAiSA and Bank transfer', all(w in txt for w in ['Cash', 'EFTPOS', 'M-PAiSA', 'Bank transfer']), txt[-400:])
        check('Paid in full: the button says Save, paid and confirmed', btn.startswith('Save, paid and confirmed'), btn)
        await js(pg, '[data-act="n-paym"][data-v="mpaisa"]')
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(900)
        c = await creates(pg)
        check('Paid in full by M-PAiSA: confirmed with a full payment', c and c[-1].get('confirm_now') and c[-1].get('payment') == {'amount': 95, 'method': 'mpaisa', 'kind': 'full'}, c[-1] if c else None)
        toast = await pg.inner_text('#ccs-toast')
        check('saved message names the day and offers Open order', 'Open order' in toast and ' for ' in toast, toast)
        check('no page errors (take order)', not errs, errs); await ctx.close()

        # 3. Customer emails on an order, and review flags
        flag_init = "window.addEventListener('load',function(){var o=window.__orders.filter(function(x){return x.id==='o2'})[0]; if(o){o.has_dietary=true; o.order_items[0].dietary_note='Allergies not confirmed yet. Check with the customer before baking.';}});"
        ctx, pg, errs = await start(b, DESK, init=flag_init)
        await js(pg, '.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main')
        check('waiting orders show how long ago they came in', 'Received just now' in t, t[:500])
        check('allergy check and no email are flagged on the waiting order', 'Allergies to check' in t and 'No email' in t, t[:800])
        await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).filter(function(x){return x.textContent.indexOf('CC-1001')>-1})[0].click()"); await pg.wait_for_timeout(800)
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]'); b&&b.click()})()"); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-sheet')
        check('order shows the customer emails with their status', 'Customer emails' in t and 'Order received' in t and 'Sent ' in t, t[-700:])
        await js(pg, '#ccs-sheet [data-act="mail-resend"]'); await pg.wait_for_timeout(500)
        rs = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_resend_email'}).map(function(c){return c[2]})")
        check('Send again asks the server for this order and confirms', rs and rs[-1]['p_order'] == 'o1' and 'on its way' in await pg.inner_text('#ccs-toast'), rs)
        await pg.screenshot(path=str(OUT / 'order-emails.png'), full_page=True)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).filter(function(x){return x.textContent.indexOf('CC-1002')>-1})[0].click()"); await pg.wait_for_timeout(800)
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]'); b&&b.click()})()"); await pg.wait_for_timeout(400)
        check('an order without an email says so and offers no Send again', 'No email address on this order' in await pg.inner_text('#ccs-sheet') and await pg.locator('#ccs-sheet [data-act="mail-resend"]').count() == 0)
        check('no page errors (emails)', not errs, errs); await ctx.close()
        ctx, pg, errs = await start(b, DESK, init="window.__mailStatus='failed';")
        await js(pg, '.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(500)
        await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).filter(function(x){return x.textContent.indexOf('CC-1001')>-1})[0].click()"); await pg.wait_for_timeout(800)
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]'); b&&b.click()})()"); await pg.wait_for_timeout(400)
        check('a failed email is shown as not sent, in words', 'Not sent' in await pg.inner_text('#ccs-sheet') and await pg.locator('#ccs-sheet .ccs-maillist li.is-failed').count() == 1)
        check('no page errors (failed email)', not errs, errs); await ctx.close()

        # 4. Kitchen login has no New order button
        ctx, pg, errs = await start(b, TAB, role='kitchen')
        check('kitchen login has no New order button', await pg.locator('[data-tab="new"]').count() == 0)
        await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
