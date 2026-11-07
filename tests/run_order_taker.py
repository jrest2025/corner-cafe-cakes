"""Who is taking this order (7 Nov 2026 fix): asked on every New order, required, never picked in advance, shown on the
slip, saved on the order (order_set_taken_by) before the finish screen. Invented data only.
Run after building dist/staff.full.js: python3 tests/run_order_taker.py [folder with staff-test.html]"""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent; R = []
def ok(n, c, d=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:400]))
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(250); return r
async def open_new(b, names=None, size=(1180, 820)):
    ctx = await b.new_context(viewport={'width': size[0], 'height': size[1]}); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    init = "window.__role='manager'; window.print=function(){};"
    if names is not None: init += "localStorage.setItem('ccs-taken-names', %s);" % json.dumps(json.dumps(names))
    await pg.add_init_script(init)
    await pg.goto((HERE / 'staff-test.html').as_uri()); await pg.wait_for_timeout(800)
    await pg.evaluate("() => { const b=[...document.querySelectorAll('button,a,[data-act]')].filter(e=>/New order/.test(e.textContent)&&e.offsetParent)[0]; if(b) b.click(); }")
    await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def fill_customer(pg):
    await pg.fill('#n-phone', '912 0099'); await pg.wait_for_timeout(450); await pg.fill('#n-name', 'Taker Test Guest'); await pg.wait_for_timeout(200)
    await js(pg, '[data-act="sl-opt"][data-v="yes"]'); await js(pg, '[data-act="n-source"][data-v="walk_in"]'); await js(pg, '[data-act="n-taken"][data-v="now"]')
async def rest_and_save(pg):
    await js(pg, '[data-act="sl-next"]'); await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await js(pg, '[data-act="sl-next"]')
    await js(pg, '[data-act="n-diet"][data-v="no"]'); await js(pg, '[data-act="n-occ"][data-v="Birthday"]'); await js(pg, '[data-act="sl-next"]')
    await js(pg, '[data-act="n-date"][data-v]:not(.ccs-chip-soon)'); await js(pg, '[data-act="sl-next"]')
    acts = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-act=n-time]')).map(function(e){return e.dataset.v})")
    if acts: await js(pg, f'[data-act="n-time"][data-v="{acts[len(acts)//2]}"]')
    await js(pg, '[data-act="sl-next"]'); await js(pg, '[data-act="n-plan"][data-v="later"]')
    await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(1200)
async def calls(pg, fn): return await pg.evaluate("(f)=>window.__calls.filter(function(c){return c[1]===f}).map(function(c){return c[2]})", fn)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1243/chrome-linux64/chrome')
        # A: first time on this device: a name box, required
        ctx, pg, errs = await open_new(b)
        ok('A: the question is first on the Customer step', 'Who is taking this order?' in (await pg.inner_text('.sl-stepbody'))[:200], (await pg.inner_text('.sl-stepbody'))[:200])
        ok('A: no names yet, so a name box', await pg.query_selector('#n-takenby') is not None)
        await fill_customer(pg); await js(pg, '[data-act="sl-next"]')
        t = await pg.inner_text('.sl-stepmain')
        ok('A: Next without a name says what is missing and stays', 'Choose who is taking this order' in t and 'Step 1 of 5' in t, t[:300])
        await pg.fill('#n-takenby', 'mere'); await pg.wait_for_timeout(400)
        ok('A: the slip shows who is taking it', 'mere' in (await pg.inner_text('.sl-live')), await pg.inner_text('.sl-live'))
        await rest_and_save(pg)
        tb = await calls(pg, 'order_set_taken_by'); co = await calls(pg, 'staff_create_order')
        ok('A: order saved once, then who took it saved on it', len(co) == 1 and len(tb) == 1 and tb[0].get('p_name') == 'mere', json.dumps(tb))
        names = await pg.evaluate("localStorage.getItem('ccs-taken-names')")
        ok('A: the name is remembered on this device', names and 'mere' in names, names)
        ok('A: no page errors', not errs, errs); await ctx.close()
        # B: names used before are buttons, none picked in advance; a tap picks one
        ctx, pg, errs = await open_new(b, ['Mere', 'Sunil'])
        chips = await pg.eval_on_selector_all('[data-act="n-takenby"]', 'els => els.map(e => [e.textContent, e.getAttribute("aria-pressed")])')
        ok('B: earlier names are one-tap buttons, none picked', chips == [['Mere', 'false'], ['Sunil', 'false']], chips)
        ok('B: Someone else is offered', await pg.query_selector('[data-act="n-takenby-other"]') is not None)
        await js(pg, '[data-act="n-takenby"][data-v="Sunil"]'); await fill_customer(pg)
        await rest_and_save(pg)
        tb = await calls(pg, 'order_set_taken_by')
        ok('B: the tapped name is saved', len(tb) == 1 and tb[0].get('p_name') == 'Sunil', json.dumps(tb))
        ok('B: no page errors', not errs, errs); await ctx.close()
        # C: phone size: the question and buttons fit, nothing sideways
        ctx, pg, errs = await open_new(b, ['Mere'], (390, 844))
        m = await pg.evaluate("({sideways: document.documentElement.scrollWidth>innerWidth, h: (document.querySelector('[data-act=n-takenby]')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height})")
        ok('C: phone: no sideways scrolling, buttons at least 44px tall', not m['sideways'] and m['h'] >= 44, m)
        await ctx.close(); await b.close()
    print(sum(R), 'passed,', len(R) - sum(R), 'failed'); sys.exit(0 if all(R) else 1)
asyncio.run(main())
