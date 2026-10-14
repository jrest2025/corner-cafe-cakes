"""Website form: optional candles and notes, shown on the review and sent with the order. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"
R = []
def ok(name, cond, extra=""):
    R.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (375, 1024):
            pg = await b.new_page(viewport={"width": w, "height": 800}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
            await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(200)
            if await pg.query_selector('[data-act="size"][data-v="8"]'): await pg.click('[data-act="size"][data-v="8"]')
            await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(200)
            ok(f'{w}: candles and note start as small optional links', await pg.query_selector('[data-act="candOpen"]') is not None and await pg.query_selector('[data-act="noteOpen"]') is not None and await pg.query_selector('#cco-candles') is None)
            await pg.click('[data-act="candOpen"]'); await pg.wait_for_timeout(150)
            ok(f'{w}: candles box opens with focus', await pg.evaluate("document.activeElement.id") == 'cco-candles')
            await pg.fill('#cco-candles', 'Number 3 candle')
            await pg.click('[data-act="noteOpen"]'); await pg.wait_for_timeout(150)
            await pg.fill('#cco-notes', 'It is a surprise, please do not call before 5pm')
            ok(f'{w}: limits match the staff form', await pg.get_attribute('#cco-candles', 'maxlength') == '60' and await pg.get_attribute('#cco-notes', 'maxlength') == '300')
            await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(300)
            d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
            await pg.click(f'.cco-day[data-day="{d[1]}"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(200)
            await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(350)
            rv = await pg.inner_text('.cco-review')
            ok(f'{w}: review shows candles and the note', 'Candles: Number 3 candle' in rv and 'Note: It is a surprise' in rv, rv[:300])
            n0 = await pg.evaluate("window.__sent.length")
            await pg.click('[data-act="send"]'); await pg.wait_for_timeout(600)
            if await pg.evaluate("window.__sent.length") == n0 or await pg.query_selector('.cco-err'):
                await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(300)
                d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
                if d: await pg.click(f'.cco-day[data-day="{d[2]}"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="send"]'); await pg.wait_for_timeout(600)
            sent = await pg.evaluate("window.__sent[window.__sent.length-1]")
            ok(f'{w}: candles and note are sent with the order', sent.get('candles') == 'Number 3 candle' and sent.get('notes', '').startswith('It is a surprise'), json.dumps(sent)[:300])
            ok(f'{w}: no page errors', not errs, errs)
            await pg.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
