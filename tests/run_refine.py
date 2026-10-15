"""Refinement 14 Oct 2026: large touch targets for order taking; next action on every order. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsRefine"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
TAB = {'width': 1024, 'height': 768}; PORT = {'width': 820, 'height': 1180}; PHONE = {'width': 390, 'height': 844}
async def newpage(b, vp=TAB, role='front_of_house'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=True); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(280); return r
async def tab(pg, t):
    if t == 'new': await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=new]')).filter(function(e){return e.offsetParent}).pop().click()"); await pg.wait_for_timeout(450); return
    await js(pg, f'.ccs-nav [data-tab="{t}"]'); await pg.wait_for_timeout(250)
async def stage(pg): return await pg.inner_text('.sl-progress')
async def nxt(pg): await js(pg, '.sl-stepbar [data-act="sl-next"]')
async def heights(pg, sel): return await pg.evaluate(f"[].slice.call(document.querySelectorAll({sel!r})).filter(function(e){{return e.getBoundingClientRect().height>0}}).map(function(e){{return Math.round(e.getBoundingClientRect().height)}})")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await newpage(b)
        # ---- Order Management: the next action on every open order ----
        await tab(pg, 'orders')
        cards = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).map(function(c){var n=c.querySelector('.ccs-next');return n?n.textContent:''})")
        check('every order needing action shows a Next line', cards and all(c.startswith('Next:') for c in cards), cards)
        check('review order: check it, then confirm', any('Check it, then confirm' in c for c in cards), cards)
        check('quote order: add the price', any('Add the price' in c for c in cards), cards)
        nx = await pg.evaluate("(function(){var n=document.querySelector('.ccs-card .ccs-next');return n?[n.tagName, n.className]:null})()")
        check('Next line is text, separate from the status pills', nx and nx[0] == 'SPAN' and 'ccs-pill' not in nx[1], nx)
        await js(pg, '[data-act="filter"][data-v="upcoming"]')
        ups = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card .ccs-next')).map(function(n){return n.textContent})")
        check('confirmed orders still in the kitchen name the kitchen stage', any(u.startswith('Next: Kitchen:') for u in ups), ups)
        check('waiting orders are shown as waiting, in quieter text', await pg.locator('.ccs-card .ccs-next.is-wait').count() > 0)
        closed = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card.k-done, .ccs-card.k-off')).filter(function(c){return c.querySelector('.ccs-next')}).length")
        check('collected and cancelled orders have no Next line', closed == 0, closed)
        await tab(pg, 'today')
        check('Today rows show the next action too', await pg.locator('.ccs-mini .ccs-next').count() > 0)
        await pg.screenshot(path=str(OUT / 'orders-next.png'))
        # ---- Order Creation: large touch targets ----
        await tab(pg, 'new')
        h = await heights(pg, '.sl-stepper .ccs-chip'); check('source chips are at least 56 px', h and min(h) >= 56, h)
        h = await heights(pg, '.sl-stepper .sl-cell'); check('price cells are at least 64 px', h and min(h) >= 64, h)
        h = await heights(pg, '.sl-stepbar .ccs-btn'); check('Next is 64 px', h and min(h) >= 64, h)
        h = await heights(pg, '.ccs-menubtn'); check('Menu button is at least 48 px', not h or min(h) >= 48, h)
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await nxt(pg)
        check('Next moves to step 2', 'Step 2 of 7' in await stage(pg), await stage(pg))
        h = await heights(pg, '#n-name'); check('text fields are at least 60 px', h and min(h) >= 60, h)
        h = await heights(pg, '.sl-stepbar .ccs-btn'); check('Back and Next are 64 px', len(h) == 2 and min(h) >= 64, h)
        h = await heights(pg, '.sl-live .sl-chg'); check('Change links on the slip are at least 48 px', h and min(h) >= 48, h)
        small = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-sheet-body button, #ccs-sheet .ccs-sheet-body input')).filter(function(e){var r=e.getBoundingClientRect();return r.height>0&&r.height<48}).map(function(e){return (e.textContent||e.id).trim().slice(0,20)+':'+Math.round(e.getBoundingClientRect().height)})")
        check('nothing on the order screen is under 48 px', not small, small)
        await pg.fill('#n-name', 'Refine Test Guest'); await nxt(pg)
        await pg.fill('#n-phone', '912 0777'); await pg.wait_for_timeout(450); await js(pg, '[data-act="sl-opt"][data-v="no"]'); await nxt(pg)
        await js(pg, '.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await js(pg, '[data-act="n-time"][data-v="15:00"]'); await nxt(pg)
        for _ in range(6):
            st = await stage(pg)
            if 'Step 7 of 7' in st: break
            if 'Step 5' in st: await js(pg, '[data-act="n-diet"][data-v="no"]'); await pg.wait_for_timeout(500)
            elif await pg.locator('.sl-stepbar [data-act="sl-skip"]').count(): await js(pg, '.sl-stepbar [data-act="sl-skip"]')
            else: await nxt(pg)
        check('reaches the last step', 'Step 7 of 7' in await stage(pg), await stage(pg))
        await js(pg, '[data-act="n-plan"][data-v="later"]'); await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(800)
        check('order saved once', await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).length") == 1)
        check('after saving, back on Today with the new order marked at the top of Needs attention', await pg.locator('#ccs-sheet.ccs-open').count() == 0 and await pg.locator('.ccs-dash-head').count() == 1 and await pg.locator('.ccs-mini.is-new').count() == 1)
        await js(pg, '.ccs-nav [data-tab="orders"]')
        check('Orders opens the order list', await pg.locator('.ccs-head .ccs-title').inner_text() == 'Cake orders')
        check('no page errors (tablet)', not errs, errs)
        await ctx.close()
        # ---- other screens ----
        for vp, nm in [(PORT, 'portrait'), (PHONE, 'phone')]:
            ctx, pg, errs = await newpage(b, vp)
            await js(pg, '[data-tab="new"]'); await pg.wait_for_timeout(400)
            await js(pg, '[data-act="n-cell"][data-v="cheesecake|6"]'); await nxt(pg)
            check(nm + ': no sideways scroll', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
            ov = await pg.evaluate("(function(){var r=[];[].slice.call(document.querySelectorAll('.sl-stepbar .ccs-btn')).forEach(function(e){var b=e.getBoundingClientRect();if(b.right>innerWidth+1||b.left<-1||b.bottom>innerHeight+1)r.push(e.textContent)});return r})()")
            check(nm + ': Back and Next are fully on screen', not ov, ov)
            await pg.screenshot(path=str(OUT / (nm + '-step2.png')))
            check(nm + ': no page errors', not errs, errs)
            await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
