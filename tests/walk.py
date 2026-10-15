"""Staff walkthrough of normal cake shop days on the live build with invented data. Counts taps and typing per task."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsWalk"
for f in OUT.glob('*.png'): f.unlink()
PAGE = "hosted-walk.html"
(HERE / PAGE).write_text((HERE / "hosted-staff.html").read_text().replace('<script src="mock.js"></script>', '<script src="mock.js"></script>\n<script src="journey_overlay.js"></script>'))
LOG = []; T = {'taps': 0, 'types': 0}; N = [0]
def note(s): LOG.append(s); print(s)
async def shot(pg, name, full=False):
    N[0] += 1; await pg.wait_for_timeout(300); await pg.screenshot(path=str(OUT / f'{N[0]:02d}-{name}.png'), full_page=full)
async def tap(pg, sel, wait=350):
    ok = await pg.evaluate("(function(s){var e=[].slice.call(document.querySelectorAll(s)).filter(function(x){return x.offsetParent})[0]||document.querySelector(s); if(e){e.scrollIntoView({block:'center'}); e.click();} return !!e})(%r)" % sel)
    await pg.wait_for_timeout(wait); T['taps'] += 1
    if not ok: note('   MISSING: ' + sel)
    return ok
async def typ(pg, sel, v):
    await pg.fill(sel, v); T['types'] += 1; await pg.wait_for_timeout(250)
def reset(): T['taps'] = 0; T['types'] = 0
def done(name): note(f'== {name}: {T["taps"]} taps, {T["types"]} things typed')
async def nxt(pg): await tap(pg, '.sl-stepbar [data-act="sl-next"]')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1024, 'height': 768}, has_touch=True); pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.add_init_script("window.__role='front_of_house'; window.__setupGuest=true; window.print=function(){}; try{localStorage.clear()}catch(e){}")
        await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(1000)
        await shot(pg, 'A-today-tablet')
        note('Today text: ' + (await pg.inner_text('#ccs-main'))[:900].replace('\n', ' | '))
        # B. Walk-in: standard cheesecake, paid in full, confirmed now
        reset()
        await tap(pg, '[data-tab="new"]', 600)
        await tap(pg, '[data-act="n-cell"][data-v="cheesecake|8"]'); await shot(pg, 'B1-cake-picked')
        await nxt(pg); await typ(pg, '#n-name', 'Ana Walkin'); await nxt(pg)
        await typ(pg, '#n-phone', '921 7788'); await tap(pg, '[data-act="sl-opt"][data-v="no"]'); await nxt(pg)
        await tap(pg, '.ccs-datechips [data-act="n-date"]:not(.ccs-chip-soon)'); await tap(pg, '[data-act="n-time"][data-v="15:00"]'); await shot(pg, 'B2-pickup'); await nxt(pg)
        await shot(pg, 'B3-allergy-step'); await tap(pg, '[data-act="n-diet"][data-v="no"]', 900)
        await shot(pg, 'B4-extras-step'); await tap(pg, '.sl-stepbar [data-act="sl-skip"]')
        await shot(pg, 'B5-readover')
        await tap(pg, '[data-act="n-plan"][data-v="full"]'); await shot(pg, 'B6-paid-full')
        note('Save button: ' + await pg.evaluate("(document.querySelector('.sl-stepbar [data-act=n-submit]')||{}).textContent"))
        await tap(pg, '.sl-stepbar [data-act="n-submit"]', 900); await shot(pg, 'B7-after-save')
        sent = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
        note('Sent: confirm_now=%s payment=%s' % (sent[-1].get('confirm_now'), sent[-1].get('payment')))
        await tap(pg, '#ccs-toast .ccs-toast-act', 800); await shot(pg, 'B8-open-from-toast')
        note('Opened: ' + (await pg.inner_text('#ccs-sheet'))[:200].replace('\n', ' | '))
        done('B walk-in standard cake')
        await ctx.close()
        await b.close()
    print(json.dumps({'errors': errs}))
asyncio.run(main())
