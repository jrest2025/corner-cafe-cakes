"""Website form: delivery to set-fee areas, fee added to the price, address required, sent with the order. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"; R = []
def ok(name, cond, extra=""): R.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))
async def to_step3(pg):
    await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(200)
    if await pg.query_selector('[data-act="size"][data-v="8"]'): await pg.click('[data-act="size"][data-v="8"]')
    await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(150)
    await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(300)
async def pick_date(pg, k=1):
    await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(300)
    d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
    await pg.click(f'.cco-day[data-day="{d[k]}"]'); await pg.wait_for_timeout(250)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in (375, 1024):
            pg = await b.new_page(viewport={"width": w, "height": 800}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
            await to_step3(pg)
            t = await pg.inner_text('#cc-cake-order')
            ok(f'{w}: collection or delivery offered, collection chosen by default', 'Collect from the café' in t and 'Delivery' in t and await pg.get_attribute('[data-act="method"][data-v="collection"]', 'aria-pressed') == 'true', t[-400:])
            await pg.click('[data-act="method"][data-v="delivery"]'); await pg.wait_for_timeout(200)
            t = await pg.inner_text('#cc-cake-order')
            zs = await pg.eval_on_selector_all('[data-act="zone"]', 'els => els.map(e => e.textContent)')
            ok(f'{w}: only areas with a set fee, each with its fee', zs == ['Nadi town · $10', 'Denarau · $15'] and 'Other area' not in t and 'Another area? Call us' in t, zs)
            await pick_date(pg); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(300)
            t = await pg.inner_text('#cc-cake-order')
            ok(f'{w}: picking a time without area and address explains what is missing', 'Choose your delivery area.' in t and 'Enter the delivery address.' in t, t[-300:])
            await pg.click('[data-act="zone"][data-v="Denarau"]'); await pg.wait_for_timeout(150)
            await pg.fill('#cco-address', 'Room 214, Test Resort, Denarau'); await pg.fill('#cco-receiver', 'Front desk')
            await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(350)
            ok(f'{w}: with area and address the form moves on', await pg.query_selector('#cco-name') is not None)
            await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(350)
            rv = await pg.inner_text('#cc-cake-order')
            ok(f'{w}: review shows delivery, address and price with the fee', 'delivery' in rv.lower() and 'Room 214, Test Resort, Denarau' in rv and 'For Front desk' in rv and '$110' in rv and 'plus delivery to Denarau $15' in rv, rv[-500:])
            n0 = await pg.evaluate("window.__sent.length")
            await pg.click('[data-act="send"]'); await pg.wait_for_timeout(600)
            if await pg.evaluate("window.__sent.length") == n0 or await pg.query_selector('.cco-err'):
                await pick_date(pg, 2)
                if not await pg.get_attribute('[data-act="method"][data-v="delivery"]', 'aria-pressed') == 'true': pass
                await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="send"]'); await pg.wait_for_timeout(600)
            sent = await pg.evaluate("window.__sent[window.__sent.length-1]")
            ok(f'{w}: delivery sent with area, address and receiver, never a fee', sent.get('delivery') == {'method': 'delivery', 'zone': 'Denarau', 'address': 'Room 214, Test Resort, Denarau', 'contact': 'Front desk'}, json.dumps(sent.get('delivery')))
            t = await pg.inner_text('#cc-cake-order')
            ok(f'{w}: confirmation says we deliver to the address', 'We deliver your cake' in t and 'Room 214' in t, t[:500])
            ok(f'{w}: no page errors', not errs, errs)
            await pg.close()
        # collection still sends collection
        pg = await b.new_page(viewport={"width": 1024, "height": 800}); await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
        await to_step3(pg); await pick_date(pg); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(300)
        await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(350)
        await pg.click('[data-act="send"]'); await pg.wait_for_timeout(600)
        sent = await pg.evaluate("window.__sent[window.__sent.length-1]")
        ok('collection orders send collection', sent.get('delivery') == {'method': 'collection'}, json.dumps(sent.get('delivery')))
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
