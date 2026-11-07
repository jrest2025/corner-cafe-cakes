"""Order capture Phase 2 (7 Nov 2026): photo cake cards (most ordered first, fixed during an order), size buttons,
quantity stepper, candle buttons, money on the live slip, and the one-go save (staff_create_order_all) with a fall back
to the earlier save. Invented data only. Run after building dist/staff.full.js:
  python3 tests/run_order_capture.py [folder with staff-test.html]"""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent; R = []
EXE = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'
def ok(n, c, d=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:400]))
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(250); return r
async def open_new(b, size=(1180, 820), init=''):
    ctx = await b.new_context(viewport={'width': size[0], 'height': size[1]}, has_touch=size[0] < 1100); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script("window.__role='manager'; window.print=function(){}; window.__pop={ok:true,days:180,cakes:{'chocolate-mudcake-mocha':167,'red-velvet':62,'cheesecake':25}};" + init)
    await pg.goto((HERE / 'staff-test.html').as_uri()); await pg.wait_for_timeout(800)
    await pg.evaluate("() => { const b=[...document.querySelectorAll('button,a,[data-act]')].filter(e=>/New order/.test(e.textContent)&&e.offsetParent)[0]; if(b) b.click(); }")
    await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def customer(pg, taker='Mere'):
    t = await pg.query_selector('#n-takenby')
    if t: await pg.fill('#n-takenby', taker)
    await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450); await pg.fill('#n-name', 'Capture Test Guest'); await pg.wait_for_timeout(200)
    await js(pg, '[data-act="sl-opt"][data-v="yes"]'); await js(pg, '[data-act="n-source"][data-v="walk_in"]'); await js(pg, '[data-act="n-taken"][data-v="now"]')
    await js(pg, '[data-act="sl-next"]')
async def to_finish_and_save(pg):
    await js(pg, '[data-act="n-date"][data-v]:not(.ccs-chip-soon)'); await js(pg, '[data-act="sl-next"]')
    acts = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-act=n-time]')).map(function(e){return e.dataset.v})")
    if acts: await js(pg, f'[data-act="n-time"][data-v="{acts[len(acts)//2]}"]')
    await js(pg, '[data-act="sl-next"]')
async def calls(pg, fn): return await pg.evaluate("(f)=>window.__calls.filter(function(c){return c[1]===f}).map(function(c){return c[2]})", fn)
async def overflow(pg):
    return await pg.evaluate("""() => { const vw=document.documentElement.clientWidth; const s=document.querySelector('#ccs-slipform')||document.body;
      const over=[...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>vw+1||r.left<-1)}).map(e=>e.className).slice(0,4);
      const small=[...s.querySelectorAll('.sl-cake,.sl-size,.sl-qbtn,.sl-tiles .ccs-chip,.sl-candles .ccs-chip')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height<44}).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().height)).slice(0,4);
      return {sideways: document.documentElement.scrollWidth>vw, over, small}; }""")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        ctx, pg, errs = await open_new(b)
        await customer(pg)
        names = await pg.eval_on_selector_all('.sl-cake[data-act="n-cake"] .sl-cake-name', 'els => els.map(e => e.textContent)')
        ok('cards: most ordered first', names[:3] == ['Chocolate, Mudcake or Mocha', 'Red Velvet', 'Cheesecake'], names)
        badges = await pg.eval_on_selector_all('.sl-cake-pop', 'els => els.length')
        ok('cards: the two most ordered are marked', badges == 2, badges)
        ok('cards: Custom cake is a card too', await pg.query_selector('.sl-cake-custom[data-act="n-req"]') is not None)
        ok('cards: no sizes until a cake is chosen', await pg.query_selector('.sl-sizes') is None)
        await js(pg, '[data-act="n-cake"][data-v="chocolate-mudcake-mocha"]')
        sizes = await pg.eval_on_selector_all('.sl-size', 'els => els.map(e => e.innerText.replace(/\\s+/g, " "))')
        ok('sizes: the four menu sizes with servings and price', len(sizes) == 4 and '6 inch' in sizes[0] and '$42' in sizes[0] and 'About 8–10 slices' in sizes[0], sizes)
        await js(pg, '[data-act="n-cell"][data-v="chocolate-mudcake-mocha|8"]'); await js(pg, '[data-act="sl-next"]')
        t = await pg.inner_text('.sl-stepmain')
        ok('flavour is required before moving on', 'Choose the flavour' in t and 'Step 2 of 5' in t, t[:300])
        await js(pg, '[data-act="n-var"][data-v="Mudcake"]')
        await js(pg, '[data-act="n-qty"][data-v="1"]'); await js(pg, '[data-act="n-qty"][data-v="1"]'); await js(pg, '[data-act="n-qty"][data-v="-1"]')
        live = await pg.inner_text('.sl-live')
        ok('quantity stepper: 2 cakes, price doubles on the slip', '$136' in live and '2 × $68' in live, live[-400:])
        order_before = names
        await js(pg, '[data-act="sl-next"]')
        # Make it yours: candles
        await js(pg, '[data-act="n-candle"][data-v="plain"]'); await js(pg, '[data-act="n-candle-n"][data-v="1"]'); await js(pg, '[data-act="n-candle-n"][data-v="1"]')
        live = await pg.inner_text('.sl-live')
        ok('candles: 3 plain candles on the slip', '3 plain candles' in live, live)
        await js(pg, '[data-act="n-candle"][data-v="number"]'); await pg.fill('#n-candlenum', '30'); await pg.wait_for_timeout(400)
        ok('candles: number candle on the slip', 'Number candle: 30' in (await pg.inner_text('.sl-live')))
        await js(pg, '[data-act="n-rq"][data-v="eggless"]'); await js(pg, '[data-act="n-rqallergy"][data-v="no"]')
        await js(pg, '[data-act="n-diet"][data-v="no"]'); await js(pg, '[data-act="n-occ"][data-v="Birthday"]'); await js(pg, '[data-act="sl-next"]')
        # When: delivery to Denarau ($15)
        await js(pg, '[data-act="n-method"][data-v="delivery"]'); await js(pg, '[data-act="n-zone"][data-v="Denarau"]'); await pg.fill('#n-address', 'Lot 5, Denarau Island')
        await to_finish_and_save(pg)
        await js(pg, '[data-act="n-plan"][data-v="deposit"]')
        await pg.fill('#n-pay', '50'); await js(pg, '[data-act="n-paym"][data-v="cash"]')
        await pg.wait_for_timeout(400)
        money = await pg.inner_text('.sl-money')
        ok('money: cake, delivery, total, paid and balance', all(x in money for x in ['$136', '$15', '$151', '$50', '$101']) and 'Not saved yet' in money, money)
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(1500)
        allc = await calls(pg, 'staff_create_order_all'); old = await calls(pg, 'order_set_taken_by') + await calls(pg, 'order_set_requirements')
        pl = allc[0]['p'] if allc else {}
        ok('one save: sent once with taker, candles and quantity', len(allc) == 1 and pl.get('taken_by_name') == 'Mere' and pl.get('candles') == 'Number candle: 30' and pl.get('quantity') == 2 and pl.get('variant') == 'Mudcake' and pl.get('requirements') == ['eggless'], json.dumps(pl)[:400])
        ok('one save: no separate follow-up calls', old == [], old)
        ok('no page errors', not errs, errs); await ctx.close()
        # The card order stays fixed during an order even if the numbers change
        ctx, pg, errs = await open_new(b)
        await customer(pg)
        await pg.evaluate("window.__pop={ok:true,days:180,cakes:{'cheesecake':999}}")
        await js(pg, '[data-act="n-cake"][data-v="red-velvet"]')
        names2 = await pg.eval_on_selector_all('.sl-cake[data-act="n-cake"] .sl-cake-name', 'els => els.map(e => e.textContent)')
        ok('cards never move during an order', names2[:3] == ['Chocolate, Mudcake or Mocha', 'Red Velvet', 'Cheesecake'], names2)
        await ctx.close()
        # Fall back: database without the new function
        ctx, pg, errs = await open_new(b, init="window.__noAll=true;")
        await customer(pg)
        await js(pg, '[data-act="n-cake"][data-v="cheesecake"]'); await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await js(pg, '[data-act="sl-next"]')
        await js(pg, '[data-act="n-diet"][data-v="no"]'); await js(pg, '[data-act="n-occ"][data-v="Birthday"]'); await js(pg, '[data-act="sl-next"]')
        await to_finish_and_save(pg); await js(pg, '[data-act="n-plan"][data-v="later"]'); await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(1500)
        co = await calls(pg, 'staff_create_order'); tb = await calls(pg, 'order_set_taken_by')
        ok('fall back: earlier save, then who took it', len([c for c in co if c['p'].get('product_code') == 'cheesecake']) >= 1 and len(tb) == 1, json.dumps([co[-1:], tb])[:300])
        ok('fall back: no page errors', not errs, errs); await ctx.close()
        # Sizes: iPad landscape and portrait, phone
        for (w, h) in [(1180, 820), (820, 1180), (390, 844), (1920, 1080)]:
            ctx, pg, errs = await open_new(b, (w, h))
            await customer(pg); await js(pg, '[data-act="n-cake"][data-v="chocolate-mudcake-mocha"]'); await js(pg, '[data-act="n-cell"][data-v="chocolate-mudcake-mocha|8"]')
            m = await overflow(pg)
            ok(f'{w}px cake step: nothing sideways, tap targets at least 44px', not m['sideways'] and not m['over'] and not m['small'], m)
            await js(pg, '[data-act="n-var"][data-v="Mocha"]'); await js(pg, '[data-act="sl-next"]'); await js(pg, '[data-act="n-candle"][data-v="plain"]')
            m = await overflow(pg)
            ok(f'{w}px make it yours: nothing sideways, tap targets at least 44px', not m['sideways'] and not m['over'] and not m['small'], m)
            ok(f'{w}px: no page errors', not errs, errs); await ctx.close()
        await b.close()
    print(sum(R), 'passed,', len(R) - sum(R), 'failed'); sys.exit(0 if all(R) else 1)
asyncio.run(main())
