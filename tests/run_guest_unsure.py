"""Website form: allergies offer No, Yes or Not sure; Not sure is sent as unsure and shown on the review. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"; R = []
def ok(n, c, x=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + (f'  [{x}]' if x and not c else ''))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (375, 1024):
            pg = await b.new_page(viewport={'width': w, 'height': 800}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
            await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(200)
            if await pg.query_selector('[data-act="size"][data-v="8"]'): await pg.click('[data-act="size"][data-v="8"]')
            await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(150)
            n = await pg.locator('[data-act="diet"]').count()
            ok(f'{w}: three answers: No, Yes, Not sure', n == 3 and await pg.locator('[data-act="diet"][data-v="unsure"]').count() == 1, n)
            await pg.click('[data-act="diet"][data-v="unsure"]'); await pg.wait_for_timeout(150)
            ok(f'{w}: Not sure tells the guest we will check', 'We will check with you about allergies before we bake' in await pg.inner_text('#cc-cake-order'))
            hs = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-act=diet]')).map(function(e){var r=e.getBoundingClientRect();return [Math.round(r.height), Math.round(r.right)]})")
            ok(f'{w}: answers are at least 48 px and on screen', all(h >= 48 and r <= w for h, r in hs), hs)
            await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(300)
            await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(300)
            d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
            await pg.click(f'.cco-day[data-day="{d[1]}"]'); await pg.wait_for_timeout(250)
            await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(350)
            await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(350)
            rv = await pg.inner_text('#cc-cake-order')
            ok(f'{w}: review shows allergies not sure yet', 'Allergies: not sure yet. We will check with you before we bake.' in rv, rv[-500:])
            btn = pg.locator('[data-act="send"], [data-act="submit"]').first
            await btn.click(); await pg.wait_for_timeout(700)
            sent = await pg.evaluate("window.__sent || []")
            ok(f'{w}: sent with the answer Not sure', sent and sent[-1]['has_dietary'] == 'unsure' and sent[-1]['dietary'] == [], sent[-1] if sent else None)
            ok(f'{w}: no page errors', not errs, errs)
            await pg.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
