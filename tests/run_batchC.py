"""Batch C: guest data captured while taking an order, and reminders due. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsC"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, vp={'width': 1024, 'height': 768}, role='manager', init='', tab='new'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); pg.set_default_timeout(8000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    await pg.evaluate(f"(function(){{try{{localStorage.clear()}}catch(e){{}}; var e=[].slice.call(document.querySelectorAll('[data-tab={tab}]')).pop(); if(!e){{var m=document.querySelector('[data-tab=more]'); m&&m.click(); e=[].slice.call(document.querySelectorAll('[data-tab={tab}]')).pop();}} e&&e.click()}})()"); await pg.wait_for_timeout(500)
    return ctx, pg, errs
async def js(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(220)
async def nxt(pg): await js(pg, '[data-act="sl-next"]'); await pg.wait_for_timeout(120)
async def stage(pg): return await pg.inner_text('.sl-progress')
async def creates(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
async def finish(pg):
    await js(pg, '#sl-st-3 .ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await js(pg, '#sl-st-3 [data-act="n-time"][data-v="15:00"]'); await nxt(pg)
    await js(pg, '[data-act="sl-skip"]'); await js(pg, '[data-act="n-diet"][data-v="no"]'); await nxt(pg)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # New guest: how they heard, whose birthday and when
        ctx, pg, errs = await newpage(b)
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await nxt(pg); await pg.fill('#n-name', 'New Guest C'); await nxt(pg)
        await pg.fill('#n-phone', '912 0097'); await pg.wait_for_timeout(450)
        check('new guest is asked how they heard about us (optional)', await pg.locator('[data-act="sl-heard"]').count() == 6 and 'Optional' in await pg.inner_text('#sl-st-2'))
        await js(pg, '[data-act="sl-opt"][data-v="yes"]'); await js(pg, '[data-act="sl-heard"][data-v="instagram"]'); await nxt(pg)
        await finish(pg)
        check('reached remarks', 'Step 7' in await stage(pg), await stage(pg))
        await js(pg, '[data-act="n-occ"][data-v="Office"]')
        check('a one-off occasion does not ask whose or when', await pg.locator('#n-occfor').count() == 0)
        await js(pg, '[data-act="n-occ"][data-v="Birthday"]')
        check('a birthday asks whose and the date', await pg.locator('#n-occfor').count() == 1 and await pg.locator('#n-occdate').count() == 1)
        pick = await pg.input_value('#n-occdate')
        check('the date starts as the pickup date', len(pick) == 10, pick)
        await pg.fill('#n-occfor', 'Mia, their daughter'); await pg.fill('#n-occdate', '2026-11-02'); await nxt(pg)
        check('remarks line reads Birthday for Mia', 'Birthday for Mia, their daughter' in await pg.inner_text('#sl-st-6'))
        await pg.screenshot(path=str(OUT / 'readover.png'), full_page=True)
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(500)
        c = await creates(pg); x = c[0] if c else {}
        check('order sends how they heard, whose occasion and its date', x.get('heard_from') == 'instagram' and x.get('occasion_for') == 'Mia, their daughter' and x.get('occasion_date') == '2026-11-02' and (x.get('customer') or {}).get('opt_in') is True, x)
        check('no page errors', not errs, errs)
        await ctx.close()
        # Existing guest whose permission needs confirming is asked; answer goes with the order
        ctx, pg, errs = await newpage(b)
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await nxt(pg)
        await pg.fill('#n-name', 'Customer A'); await pg.wait_for_timeout(700); await js(pg, '#sl-st-1 [data-act="n-pick"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#sl-st-2')
        check('existing guest with permission to confirm is asked at the contact step', 'Step 3' in await stage(pg) and 'needs confirming' in t, (await stage(pg), t[:200]))
        check('existing guest is not asked how they heard', await pg.locator('[data-act="sl-heard"]').count() == 0)
        await nxt(pg)
        check('the question must be answered', 'Step 3' in await stage(pg))
        await js(pg, '[data-act="sl-opt"][data-v="no"]'); await nxt(pg)
        check('then moves on to pickup', 'Step 4' in await stage(pg) and 'No offers or reminders' in await pg.inner_text('#sl-st-2'))
        await finish(pg); await js(pg, '[data-act="sl-skip"]')
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(500)
        c = await creates(pg); x = c[0] if c else {}
        check('existing guest answer is sent with the order', x.get('customer_id') == 'c1' and x.get('consent') == 'no' and 'heard_from' not in x, x)
        await ctx.close()
        # Reminders due on Customers
        ctx, pg, errs = await newpage(b, tab='customers'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('.ccs-rem')
        check('reminders due shows the guest, occasion, date and usual cake', 'Test Customer A' in t and 'Birthday for Mia' in t and 'usually Mudcake' in t, t[:300])
        check('a guest whose permission needs confirming is left out, with a note saying why', 'Test Customer B' not in t and '1 more guest has an occasion coming but their permission needs confirming' in t, t[:400])
        href = await pg.get_attribute('.ccs-rem a[href*="wa.me"]', 'href')
        check('WhatsApp link has the number and a ready message for staff to send', href and 'wa.me/6799120001' in href and 'Corner%20Caf' in href and 'birthday%20for%20Mia' in href, href)
        check('nothing is sent automatically: it is a link the staff member opens', await pg.get_attribute('.ccs-rem a[href*="wa.me"]', 'target') == '_blank')
        await pg.screenshot(path=str(OUT / 'reminders.png'))
        await js(pg, '[data-act="rem-sent"]'); await pg.wait_for_timeout(400)
        m = await pg.evaluate("window.__remMarked")
        check('Mark as sent records it and removes the guest from the list', m and m['p_customer'] == 'c1' and 'Test Customer A' not in await pg.inner_text('.ccs-rem'), m)
        await ctx.close()
        ctx, pg, errs = await newpage(b, tab='customers', init="window.__remFail = true;"); await pg.wait_for_timeout(500)
        check('a failed load says so with Try again', 'could not load' in await pg.inner_text('.ccs-rem') and await pg.locator('[data-act="rem-reload"]').count() == 1)
        await ctx.close()
        ctx, pg, errs = await newpage(b, role='finance', tab='customers'); await pg.wait_for_timeout(500)
        check('finance does not see reminders', await pg.locator('.ccs-rem').count() == 0)
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
