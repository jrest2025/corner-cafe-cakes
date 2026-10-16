"""Touch screens (iPad and phones): tap sizes, pinned main button, no sideways scrolling. Mock data, the built form file."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from run_consent import walk  # same walk to Your details
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"
SIZES = [(1024, 768), (820, 1180), (390, 844), (360, 640)]
JS = """() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const t = [...document.querySelectorAll('#cc-cake-order button, #cc-cake-order input:not([type=checkbox]):not([type=file]), #cc-cake-order a')].filter(vis);
  const small = [...new Set(t.filter(e => e.getBoundingClientRect().height < 43.5).map(e => (e.dataset.act || e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)))];
  const p = [...document.querySelectorAll('#cc-cake-order button.cco-primary')].filter(vis)[0]; const r = p && p.getBoundingClientRect();
  return { small, btnOn: r ? r.top >= 0 && r.bottom <= innerHeight : null, hx: document.scrollingElement.scrollWidth > innerWidth + 1 }; }"""
async def main():
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in SIZES:
            ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=True, is_mobile=w < 760)
            pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
            coarse = await pg.evaluate("matchMedia('(pointer: coarse)').matches")
            await pg.click('[data-act="flavour"]'); await pg.wait_for_timeout(300)
            if await pg.query_selector('[data-act="variant"]'): await pg.click('[data-act="variant"]')
            await pg.wait_for_timeout(300); await pg.click('[data-act="size"]'); await pg.wait_for_timeout(500)
            await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act="diet"][data-v="no"]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act="occasion"]'); await pg.wait_for_timeout(600)
            fin = await pg.evaluate(JS)
            await pg.screenshot(path=str(HERE / f"touch-{w}-finish.png"))
            reached = await walk(pg); det = await pg.evaluate(JS)
            checks = [(f"{w}x{h}: touch screen detected", coarse), (f"{w}x{h}: Finish step Continue on screen", fin["btnOn"]),
                      (f"{w}x{h}: every control 44 pixels or more", not fin["small"] and not det["small"]),
                      (f"{w}x{h}: reached Your details", reached), (f"{w}x{h}: no sideways scrolling", not fin["hx"] and not det["hx"]),
                      (f"{w}x{h}: no script errors", not errs)]
            for n, c in checks:
                print(("PASS " if c else "FAIL ") + n + ("" if c or "44" not in n else "  " + str(fin["small"] + det["small"]))); res.append(bool(c))
            await ctx.close()
        await b.close()
    print(f"{sum(res)} of {len(res)} checks pass"); sys.exit(0 if all(res) else 1)
asyncio.run(main())
