"""Batch A: safer order screen. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsA"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, vp, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def open_order(pg, ref):
    await pg.evaluate("(function(){var e=document.querySelector('[data-tab=orders]'); e&&e.click()})()"); await pg.wait_for_timeout(250)
    await pg.evaluate("(function(){var e=document.querySelector('[data-act=filter][data-v=all]')||[].slice.call(document.querySelectorAll('[data-act=filter]')).pop(); e&&e.click()})()"); await pg.wait_for_timeout(250)
    if await pg.locator('#ccs-q').count(): await pg.fill('#ccs-q', ref); await pg.wait_for_timeout(350)
    await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()")
    await pg.wait_for_timeout(500)
async def inview(pg, sel):
    return await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(!e) return false; var r=e.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight && r.height>0}})()")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, vp in [('tablet', {'width': 1024, 'height': 768}), ('phone', {'width': 390, 'height': 844})]:
            ctx, pg, errs = await newpage(b, vp)
            await open_order(pg, 'CC-1001')
            acts = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-actions button')).map(function(e){return e.textContent.trim()})")
            check(f'{name}: Confirm is the main action', 'Confirm order' in acts, acts)
            check(f'{name}: Decline and Cancel are not beside Confirm', not any(a.startswith('Decline') or a.startswith('Cancel order') for a in acts), acts)
            await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]');b&&b.click()})()"); await pg.wait_for_timeout(300)
            other = await pg.evaluate("(function(){var s=document.querySelector('#ccs-sheet .ccs-other'); if(!s) return null; var all=[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-sheet-body > *')); return {txt:s.innerText, last: s===s.parentElement.lastElementChild || all.indexOf(s)===all.length-1}})()")
            check(f'{name}: Other actions box at the end holds Decline and Cancel', other and other['last'] and 'Decline order' in other['txt'] and 'Cancel order' in other['txt'], other)
            check(f'{name}: summary shows when, guest, mobile, price, paid, to pay', await pg.evaluate("(function(){var t=(document.querySelector('#ccs-sheet .ccs-ostrip')||{}).innerText||''; return /COLLECTION|DELIVERY/i.test(t) && /Guest/i.test(t) && /\\$68/.test(t) && /Paid/i.test(t) && /To pay/i.test(t) && /912/.test(t)})()"))
            check(f'{name}: summary and Confirm visible without scrolling', await inview(pg, '#ccs-sheet .ccs-ostrip') and await inview(pg, '#ccs-sheet [data-v=confirm]'))
            dis = await pg.evaluate("(function(){var b=[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-actions button')).filter(function(e){return /Print kitchen brief/.test(e.textContent)})[0]; return b ? {d:b.disabled, why:(document.getElementById('ccs-brief-why')||{}).textContent} : null})()")
            check(f'{name}: print brief shown greyed with the reason', dis and dis['d'] and 'once the order is confirmed' in (dis['why'] or ''), dis)
            await pg.screenshot(path=str(OUT / f'{name}-review.png'))
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-sheet .ccs-other [data-v=decline]'); e&&e.click()})()"); await pg.wait_for_timeout(400)
            check(f'{name}: Decline opens its confirmation panel at the top', await pg.locator('#ccs-sheet .ccs-panel [data-act=do-decline]').count() == 1 and await pg.evaluate("document.querySelector('#ccs-sheet .ccs-sheet-body').scrollTop") < 50)
            check(f'{name}: Other actions hidden while a panel is open', await pg.locator('#ccs-sheet .ccs-other').count() == 0)
            check(f'{name}: no page errors', not errs, errs)
            await ctx.close()
        # confirmed order keeps a working print button and no Decline
        ctx, pg, errs = await newpage(b, {'width': 1024, 'height': 768})
        await open_order(pg, 'CC-1007')
        b1 = await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=panel][data-v=brief]'); return b ? !b.disabled : null})()")
        check('confirmed order: print brief enabled', b1 is True, b1)
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-v=history]');b&&b.click()})()"); await pg.wait_for_timeout(300)
        check('confirmed order: Cancel only under Other actions', await pg.locator('#ccs-sheet .ccs-actions [data-v=cancel]').count() == 0 and await pg.locator('#ccs-sheet .ccs-other [data-v=cancel]').count() == 1)
        await ctx.close()
        # finance sees money but no order actions box beyond payment
        ctx, pg, errs = await newpage(b, {'width': 1024, 'height': 768}, role='finance')
        await open_order(pg, 'CC-1001')
        check('finance: no Other actions box', await pg.locator('#ccs-sheet .ccs-other').count() == 0)
        check('finance: summary shows price', await pg.locator('#ccs-sheet .ccs-ostrip').count() == 1)
        await ctx.close()
        # kitchen wording
        src = open(HERE.parent / 'staff.js').read()
        check('one wording for a change after printing', 'Changed after printing: print new slip' in src and 'Changed since brief' not in src and 'Changed, check now' not in src)
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
