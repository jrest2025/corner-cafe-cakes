"""Larger text, white page, status in words, Today, kitchen and calendar. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsE"; OUT.mkdir(exist_ok=True)
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
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp, name in [({'width': 1024, 'height': 768}, 'tablet'), ({'width': 390, 'height': 844}, 'phone')]:
            for tab in ['today', 'orders', 'calendar', 'kitchen', 'customers', 'settings', 'dash', 'register', 'new']:
                ctx, pg, errs = await newpage(b, vp=vp, tab=tab); await pg.wait_for_timeout(500)
                w = await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
                check(name + ' ' + tab + ': no sideways scrolling', w[0] <= w[1], w)
                if tab in ('today', 'orders', 'calendar', 'kitchen', 'new', 'customers'): await pg.screenshot(path=str(OUT / (name + '-' + tab + '.png')))
                check(name + ' ' + tab + ': no page errors', not errs, errs)
                await ctx.close()
        ctx, pg, errs = await newpage(b, tab='today'); await pg.wait_for_timeout(500)
        fs = await pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.ccs-app')).fontSize)")
        check('body text is at least 17 px', fs >= 17, fs)
        bg = await pg.evaluate("[getComputedStyle(document.querySelector('#cc-staff')).backgroundColor, getComputedStyle(document.querySelector('.ccs-app')).backgroundColor]")
        check('page background is white', all(x == 'rgb(255, 255, 255)' for x in bg), bg)
        t = await pg.inner_text('#ccs-main')
        check('Where orders came from is back, at the bottom of Today', 'Where orders came from' in t and t.index('Where orders came from') > t.index('Due today'))
        top = await pg.evaluate("(function(){var h=[].slice.call(document.querySelectorAll('.ccs-card-head h2')).filter(function(x){return x.textContent==='Needs action'})[0];return h?h.getBoundingClientRect().top:9999})()")
        check('Needs action list starts on the first screen at 1024 px', top < 768, top)
        check('counts sit in one compact row', await pg.evaluate("(function(){var k=[].slice.call(document.querySelectorAll('.ccs-kpis-row .ccs-kpi')).map(function(e){return Math.round(e.getBoundingClientRect().top)});return k.length>1&&k.every(function(v){return v===k[0]})})()"))
        cols = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-pill.st')).map(function(e){return getComputedStyle(e).backgroundColor})")
        check('status badges are grey, not coloured', cols and all(c == 'rgb(241, 244, 247)' for c in cols), cols)
        await ctx.close()
        ctx, pg, errs = await newpage(b, tab='orders'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main')
        check('All recent is renamed to say what it covers', 'All recent' not in t and 'All, 45 days back and ahead' in t)
        await pg.evaluate("(function(){var o=window.__orders.filter(function(x){return x.reference==='CC-1013'})[0]; var d=new Date(); d.setUTCDate(d.getUTCDate()-3); o.required_date=d.toISOString().slice(0,10);})()")
        await js(pg, '.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(300); await js(pg, '.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(500)
        await js(pg, '[data-act="filter"][data-v="overdue"]'); await pg.wait_for_timeout(300)
        t = await pg.inner_text('#ccs-main')
        red = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).map(function(e){return [e.classList.contains('is-red'), getComputedStyle(e,'::before').backgroundColor]})")
        check('overdue orders say Overdue in words', 'Overdue' in t)
        await js(pg, '[data-act="filter"][data-v="recent"]'); await pg.wait_for_timeout(300)
        red = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-card')).map(function(e){return [e.classList.contains('is-red'), getComputedStyle(e,'::before').backgroundColor]})")
        await pg.screenshot(path=str(OUT / 'tablet-orders-all.png'))
        check('late or dietary cards carry the red bar; all others grey', any(r[0] and r[1] == 'rgb(180, 35, 24)' for r in red) and all((r[1] == 'rgb(180, 35, 24)') == r[0] for r in red), red)
        await ctx.close()
        ctx, pg, errs = await newpage(b, role='kitchen', tab='kitchen'); await pg.wait_for_timeout(500)
        t = await pg.inner_text('#ccs-main')
        check('kitchen buttons name the job, not the stage', 'Move to' not in t and any(x in t for x in ['Start preparing', 'Start baking', 'Baked, now cooling', 'Start decorating', 'Ready for check', 'Schedule it']), t[:600])
        await ctx.close()
        ctx, pg, errs = await newpage(b, tab='calendar'); await pg.wait_for_timeout(400)
        await js(pg, '[data-act="cal-view"][data-v="month"]'); await pg.wait_for_timeout(300)
        check('month cells show counts only, no cut-off names', await pg.locator('.ccs-mcell .ccs-cev').count() == 0 and await pg.locator('.ccs-mcount').count() >= 1)
        await pg.screenshot(path=str(OUT / 'tablet-month.png'))
        await js(pg, '.ccs-mcell.has-orders .ccs-mday'); await pg.wait_for_timeout(300)
        check('picking a day lists its orders in full', await pg.locator('.ccs-cev').count() >= 1)
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
