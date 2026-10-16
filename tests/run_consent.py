"""Walk the order form to Your details, check the consent wording and that nothing errors. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"
WANT = "You can unsubscribe at any time."

async def tap(pg, sel):
    group = sel.split('][')[0].rstrip(']') + ']' if '][' in sel else sel
    if await pg.query_selector(group + '[aria-pressed="true"]'): return False
    for el in await pg.query_selector_all(sel + ':not(:disabled)'):
        if await el.is_visible():
            await el.click(timeout=3000); await pg.wait_for_timeout(250); return True
    return False

async def walk(pg):
    used = set()
    for _ in range(40):
        if await pg.query_selector('#cco-name'): return True
        if await pg.query_selector('.cco-shade.cco-open'):
            await tap(pg, '.cco-open .cco-day[data-day]:not(.cco-blank)'); continue
        for sel in ['[data-act="flavour"]', '[data-act="variant"]', '[data-act="size"]', '[data-act="next1"]',
                    '[data-act="finish"][data-v="standard"]', '[data-act="occasion"]', '[data-act="diet"][data-v="no"]',
                    '[data-act="next2"]', '[data-act="method"]', '.cco-open .cco-day[data-day]', '[data-act="zone"]', '[data-act="cal"]',
                    '[data-act="time"]']:
            if sel in used: continue
            if await tap(pg, sel):
                if sel in ('[data-act="cal"]', '[data-act="next1"]', '[data-act="next2"]'): used.add(sel)
                break
        else:
            for b in await pg.query_selector_all('button.cco-primary:not(:disabled)'):
                if await b.is_visible(): await b.click(); await pg.wait_for_timeout(250); break
    return bool(await pg.query_selector('#cco-name'))

async def main():
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (375, 1280):
            pg = await b.new_page(viewport={"width": w, "height": 900}); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
            reached = await walk(pg)
            txt = await pg.inner_text('#cc-cake-order')
            lab = await pg.query_selector('[data-chk="updates"]')
            if lab: await lab.scroll_into_view_if_needed()
            await pg.screenshot(path=str(HERE / f"consent-{w}.png"))
            checks = [(f'{w}: reached Your details', reached), (f'{w}: consent wording shown', WANT in txt),
                      (f'{w}: checkbox starts unticked', lab is not None and not await lab.is_checked()), (f'{w}: no script errors', not errs)]
            for n, c in checks: print(("PASS " if c else "FAIL ") + n); res.append(c)
        await b.close()
    print(f"{sum(res)} of {len(res)} checks pass"); sys.exit(0 if all(res) else 1)
asyncio.run(main())
