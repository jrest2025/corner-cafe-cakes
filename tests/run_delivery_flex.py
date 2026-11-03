"""New order delivery: other area with its own charge, a different charge with a reason, the standard charge. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent; R = []
def ok(n, c, d=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:400]))
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(250); return r
async def to_when(b):
    ctx = await b.new_context(viewport={'width':1024,'height':768}); pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__role='manager'; window.print=function(){};")
    await pg.goto((HERE / 'staff-test.html').as_uri()); await pg.wait_for_timeout(700)
    await pg.click('text=New order'); await pg.wait_for_timeout(600)
    await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450); await pg.fill('#n-name', 'Delivery Test Guest'); await pg.wait_for_timeout(200)
    await js(pg, '[data-act="sl-opt"][data-v="yes"]'); await js(pg, '[data-act="n-source"][data-v="phone"]'); await js(pg, '[data-act="n-taken"][data-v="now"]'); await js(pg, '[data-act="sl-next"]')
    await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await js(pg, '[data-act="sl-next"]')
    await js(pg, '[data-act="n-diet"][data-v="no"]'); await js(pg, '[data-act="n-occ"][data-v="Birthday"]'); await js(pg, '[data-act="sl-next"]')
    await js(pg, '[data-act="n-method"][data-v="delivery"]')
    return ctx, pg, errs
async def when_and_save(pg):
    await pick(pg)
    await js(pg, '[data-act="sl-next"]'); await js(pg, '[data-act="n-plan"][data-v="later"]')
    await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(700)
    return await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
async def pick(pg):
    await js(pg, '[data-act="n-date"][data-v]:not(.ccs-chip-soon)'); await js(pg, '[data-act="sl-next"]')
    acts = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-act=n-time]')).map(function(e){return e.dataset.v})")
    if acts: await js(pg, f'[data-act="n-time"][data-v="{acts[len(acts)//2]}"]')
    else: print('   (no time chips)', (await pg.inner_text('.sl-stepmain'))[-300:])
async def step(pg): return await pg.inner_text('.sl-stephead')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # A: an area not on the list, with its own charge
        ctx, pg, errs = await to_when(b)
        chips = await pg.eval_on_selector_all('[data-act="n-zone"]', 'els => els.map(e => e.textContent)')
        ok('area chips: the listed areas, then Other area once', chips == ['Nadi town · $10', 'Denarau · $15', 'Other area'], chips)
        await js(pg, '[data-act="n-zone"][data-v="__other_area"]')
        ok('Other area asks for the area and the charge', await pg.query_selector('#n-other-zone') and await pg.query_selector('#n-fee'))
        await pg.fill('#n-address', 'Sabeto village, near the school')
        await pick(pg)
        t = await pg.inner_text('.sl-stepmain')
        ok('without the area name it says what is missing', 'Type the delivery area' in t, t[-300:])
        await pg.fill('#n-other-zone', 'Sabeto'); await pick(pg)
        t = await pg.inner_text('.sl-stepmain')
        ok('without the charge it asks for it', 'Enter the delivery charge' in t, t[-300:])
        await pg.fill('#n-fee', '45')
        c = await when_and_save(pg)
        d = c[-1]['delivery'] if c else {}
        ok('saved with the typed area and its charge', d.get('zone') == 'Sabeto' and d.get('fee') == 45 and d.get('waiver_reason') is None and d.get('fee_reason') is None, json.dumps(d))
        ok('A: no page errors', not errs, errs); await ctx.close()
        # B: a listed area with a different charge needs a reason
        ctx, pg, errs = await to_when(b)
        await js(pg, '[data-act="n-zone"][data-v="Denarau"]'); await pg.fill('#n-address', 'Lot 5, Denarau Island')
        await js(pg, '[data-act="n-delivery-charge"][data-v="different"]')
        ok('Different amount shows the charge and a reason box', await pg.query_selector('#n-fee') and await pg.query_selector('#n-fee-reason'))
        await pg.fill('#n-fee', '22')
        await pick(pg)
        t = await pg.inner_text('.sl-stepmain')
        ok('without a reason it asks for one', 'Add a reason for the different charge' in t, t[-300:])
        await pg.fill('#n-fee-reason', 'Far end of the island')
        c = await when_and_save(pg)
        d = c[-1]['delivery'] if c else {}
        ok('saved with the new charge and the reason', d.get('zone') == 'Denarau' and d.get('fee') == 22 and d.get('fee_reason') == 'Far end of the island', json.dumps(d))
        ok('B: no page errors', not errs, errs); await ctx.close()
        # C: the standard charge, unchanged behaviour
        ctx, pg, errs = await to_when(b)
        await js(pg, '[data-act="n-zone"][data-v="Nadi town"]'); await pg.fill('#n-address', '12 Main Street, Nadi')
        c = await when_and_save(pg)
        d = c[-1]['delivery'] if c else {}
        ok('standard charge: no fee sent (the server uses the area charge)', d.get('zone') == 'Nadi town' and d.get('fee') is None and d.get('fee_reason') is None, json.dumps(d))
        ok('C: no page errors', not errs, errs); await ctx.close()
        # D: complimentary still needs its reason (existing rule)
        ctx, pg, errs = await to_when(b)
        await js(pg, '[data-act="n-zone"][data-v="Denarau"]'); await pg.fill('#n-address', 'Lot 5, Denarau Island')
        await js(pg, '[data-act="n-delivery-charge"][data-v="complimentary"]'); await pg.fill('#n-delivery-waiver-reason', 'Customer goodwill')
        c = await when_and_save(pg)
        d = c[-1]['delivery'] if c else {}
        ok('complimentary: fee 0 with its reason', d.get('fee') == 0 and d.get('waiver_reason') == 'Customer goodwill', json.dumps(d))
        ok('D: no page errors', not errs, errs); await ctx.close()
        await b.close()
    print(f"{sum(R)} of {len(R)} passed")
asyncio.run(main())
