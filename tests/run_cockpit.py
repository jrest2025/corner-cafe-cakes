"""End-to-end checks for the simple-cockpit refinements (mock data, labelled test guest). Usage: python3 run_cockpit.py [page]"""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-test.html"
R = []
def ok(name, cond, extra=""):
    R.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))

async def fresh(b, w=375):
    pg = await b.new_page(viewport={"width": w, "height": 800})
    pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return pg
async def txt(pg, sel): return (await pg.eval_on_selector(sel, "e => e.innerText")).strip()
async def has(pg, sel): return await pg.query_selector(sel) is not None
async def days(pg):
    await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(350)
    d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
    return d
async def pick_day(pg, d): await pg.click(f'.cco-day[data-day="{d}"]'); await pg.wait_for_timeout(250)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---- Screen 1
        pg = await fresh(b)
        strip = await txt(pg, '.cco-strip p')
        ok("strip shows no payment and both notice periods", "No payment now" in strip and "2 days" in strip and "5 days for a custom design" in strip, strip)
        ok("no unverified time claim", "minute" not in (await txt(pg, '#cc-cake-order')).lower())
        ok("how it works collapsed by default", not await has(pg, '.cco-strip-steps'))
        await pg.click('[data-act="how"]'); await pg.wait_for_timeout(150)
        ok("how it works opens", await has(pg, '.cco-strip-steps') and await pg.get_attribute('[data-act="how"]', 'aria-expanded') == 'true')
        await pg.click('[data-act="how"]'); await pg.wait_for_timeout(150)
        ok("how it works closes", not await has(pg, '.cco-strip-steps'))
        top = await pg.eval_on_selector('.cco-cake', 'e => Math.round(e.getBoundingClientRect().top)')
        ok("first cake card visible on first phone screen", top < 800, top)
        # every cake and size reaches the finish step with the right price
        cakes = await pg.eval_on_selector_all('[data-act="flavour"]', 'els => els.map(e => e.dataset.v)')
        prices_ok = True; seen = []
        for c in cakes:
            if await has(pg, '.cco-sum[data-v="0"]'): await pg.click('.cco-sum[data-v="0"]'); await pg.wait_for_timeout(200)
            await pg.click(f'[data-act="flavour"][data-v="{c}"]'); await pg.wait_for_timeout(200)
            if await has(pg, '[data-act="variant"]'):
                await pg.click('[data-act="variant"] >> nth=0'); await pg.wait_for_timeout(200)
            sizes = await pg.eval_on_selector_all('[data-act="size"]', 'els => els.map(e => [e.dataset.v, e.querySelector(".cco-size-price").innerText])')
            for v, pr in sizes:
                if await has(pg, '.cco-sum[data-v="1"]'): await pg.click('.cco-sum[data-v="1"]'); await pg.wait_for_timeout(150)
                await pg.click(f'[data-act="size"][data-v="{v}"]'); await pg.wait_for_timeout(150)
                bar = await txt(pg, '#cco-bar strong') if await has(pg, '#cco-bar strong') else ''
                seen.append((c, v, pr, bar)); prices_ok &= (bar == pr)
        ok("every cake and size shows its own price in the price bar", prices_ok, seen)
        await pg.close()

        # ---- Screen 2
        pg = await fresh(b)
        await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="size"][data-v="8"]'); await pg.wait_for_timeout(200)
        ok("no errors before continue", not await has(pg, '.cco-err'))
        await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(150)
        ok("standard finish hides design fields", not await has(pg, '#cco-design') and not await has(pg, '#cco-photos'))
        await pg.click('[data-act="finish"][data-v="custom"]'); await pg.wait_for_timeout(150)
        ok("custom design reveals design and photos", await has(pg, '#cco-design') and await has(pg, '#cco-photos'))
        await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(150)
        errs = await pg.eval_on_selector_all('.cco-err', 'els => els.map(e => e.textContent)')
        ok("dietary unanswered is asked, not assumed No", any("No or Yes" in e for e in errs), errs)
        ok("errors linked to their field", await pg.get_attribute('#cco-design', 'aria-describedby') == 'cco-err-design')
        ok("errors show a non-colour indicator", (await pg.eval_on_selector('.cco-err', "e => getComputedStyle(e, '::before').content")) == '"!"')
        await pg.fill('#cco-design', 'Test design, gold drip')
        ok("design error clears while typing", not await has(pg, '#cco-err-design'))
        await pg.click('[data-act="msgOpen"]'); await pg.fill('#cco-message', 'Happy 30th Test'); await pg.click('[data-act="msgClose"]'); await pg.wait_for_timeout(150)
        link = await txt(pg, '[data-act="msgOpen"]')
        ok("message hides and keeps its text", not await has(pg, '#cco-message') and 'Happy 30th Test' in link, link)
        await pg.click('[data-act="msgOpen"]'); await pg.wait_for_timeout(100)
        ok("message reopens with the text", await pg.input_value('#cco-message') == 'Happy 30th Test')
        await pg.click('[data-act="occOpen"]'); await pg.click('[data-act="occasion"][data-v="Birthday"]'); await pg.click('[data-act="occClose"]'); await pg.wait_for_timeout(150)
        ok("occasion hides and keeps the choice", 'Birthday' in await txt(pg, '[data-act="occOpen"]'))
        await pg.click('[data-act="diet"][data-v="yes"]'); await pg.wait_for_timeout(150)
        ok("dietary Yes reveals choices and notes", await has(pg, '[data-act="diets"]') and await has(pg, '#cco-dnote'))
        await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(150)
        ok("dietary Yes needs a detail", any('dietary' in e.lower() for e in await pg.eval_on_selector_all('.cco-err', 'els => els.map(e => e.textContent)')))
        await pg.click('[data-act="diets"][data-v="Nut allergy"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
        ok("continue reaches collection", await pg.eval_on_selector('.cco-step.cco-open', 'e => e.id') == 'cco-step-3')
        await pg.close()

        # ---- Date invalidation is announced, not silent
        pg = await fresh(b)
        await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="size"][data-v="6"]'); await pg.click('[data-act="finish"][data-v="standard"]'); await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
        d = await days(pg); await pick_day(pg, d[0]); await pg.click('[data-act="time"][data-v="10:00"]'); await pg.wait_for_timeout(200)
        await pg.click('.cco-sum[data-v="2"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="finish"][data-v="custom"]'); await pg.fill('#cco-design', 'Test'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
        note = await txt(pg, '.cco-notice') if await has(pg, '.cco-notice') else ''
        ok("switching to custom clears an early date and says why", '5 days' in note and 'new date' in note, note)
        d2 = await days(pg); await pick_day(pg, d2[0])
        ok("notice goes once a new date is picked", not await has(pg, '.cco-notice'))
        await pg.close()

        # ---- Screen 3, submission, Screen 4
        pg = await fresh(b, 320)
        await pg.click('[data-act="flavour"][data-v="chocolate-mudcake-mocha"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="variant"][data-v="Mudcake"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="size"][data-v="8"]'); await pg.click('[data-act="finish"][data-v="custom"]'); await pg.fill('#cco-design', 'Test design')
        await pg.set_input_files('#cco-photos', [str(HERE / "ref.jpg")]); await pg.wait_for_timeout(300)
        await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
        d = await days(pg); await pick_day(pg, d[0]); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(200)
        await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(350)
        labels = await pg.eval_on_selector_all('.cco-rv-k', 'els => els.map(e => e.textContent)')
        ok("review has the four sections", labels == ['Your cake', 'Design and dietary', 'Collection', 'Contact details'], labels)
        ok("review has no decorative icons", not await has(pg, '.cco-review svg, .cco-review .cco-rv-vis'))
        tot = await txt(pg, '.cco-total')
        ok("custom pricing splits known and pending", 'Cake price' in tot and '$68' in tot and 'To be confirmed' in tot and 'Starting price' not in tot, tot)
        know = await txt(pg, '.cco-know')
        ok("conditions shown before submit", 'No payment now' in know and 'booked once we confirm' in know and 'deposit' in know, know)
        ok("button says Send cake request", await txt(pg, '[data-act="send"]') == 'Send cake request')
        await pg.click('[data-act="edit"][data-v="4"]'); await pg.wait_for_timeout(200); await pg.fill('#cco-name', 'Test Guest Two'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(300)
        ok("edit returns to review with the change", 'Test Guest Two' in await txt(pg, '.cco-review'))
        # first send fails (mock: notice error) -> back to date with message
        await pg.click('[data-act="send"]'); await pg.wait_for_timeout(450)
        ok("failed request returns to the date with a clear message", await pg.eval_on_selector('.cco-step.cco-open', 'e => e.id') == 'cco-step-3' and await has(pg, '.cco-err'))
        d = await days(pg); await pick_day(pg, d[1]); await pg.click('[data-act="time"][data-v="14:00"]'); await pg.wait_for_timeout(300)
        # double tap send -> one request
        n0 = await pg.evaluate("window.__sent.length")
        await pg.evaluate("() => { const b = document.querySelector('[data-act=send]'); b.click(); b.click(); }"); await pg.wait_for_timeout(600)
        n1 = await pg.evaluate("window.__sent.length")
        ok("double tap sends one request", n1 - n0 == 1, (n0, n1))
        sent = await pg.evaluate("window.__sent[window.__sent.length-1]")
        ok("payload carries the selections", sent['variant'] == 'Mudcake' and len(sent['attachments']) == 1 and sent['customer']['name'] == 'Test Guest Two', json.dumps(sent)[:300])
        h2 = await txt(pg, '.cco-done h2')
        ok("heading says request received", "received your cake request" in h2 and "confirmed" not in h2.lower(), h2)
        ok("reference prominent", await txt(pg, '.cco-refbox-v') == 'CC-1010')
        st = await txt(pg, '.cco-status')
        ok("status says not yet confirmed", 'not yet confirmed' in st, st)
        step3 = await txt(pg, '.cco-next li:nth-child(3)')
        ok("collection step not presented as guaranteed", 'once confirmed' in step3, step3)
        ok("call link works", (await pg.get_attribute('.cco-act', 'href')) == 'tel:+6798922760')
        await pg.click('[data-act="copyRef"]'); await pg.wait_for_timeout(150)
        ok("copy reference gives feedback", await txt(pg, '[data-act="copyRef"]') == 'Copied')
        ok("price bar hidden after sending", await pg.eval_on_selector('#cco-bar', "e => getComputedStyle(e).display === 'none' || !e.classList.contains('cco-show')"))
        ok("no script errors", not pg.errs, pg.errs)
        await pg.close()

        # ---- network failure keeps everything
        pg = await fresh(b)
        await pg.evaluate("() => { window.__ccoMock.rpc = (fn, a) => fn === 'get_order_setup' ? window.__ccsMock.rpc(fn, a) : Promise.reject(new TypeError('Failed to fetch')); }")
        await pg.click('[data-act="flavour"][data-v="red-velvet"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="size"][data-v="6"]')
        await pg.click('[data-act="finish"][data-v="standard"]'); await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); await pg.wait_for_timeout(250)
        d = await days(pg); await pick_day(pg, d[0]); await pg.click('[data-act="time"][data-v="11:00"]'); await pg.wait_for_timeout(200)
        await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); await pg.wait_for_timeout(300)
        tot = await txt(pg, '.cco-total')
        ok("standard pricing shows one clear price", tot.startswith('Price') and 'confirmed' not in tot, tot)
        await pg.click('[data-act="send"]'); await pg.wait_for_timeout(400)
        fe = await txt(pg, '.cco-formerr') if await has(pg, '.cco-formerr') else ''
        ok("network failure gives an actionable message and keeps the review", 'connection' in fe and await has(pg, '.cco-review') and await pg.is_enabled('[data-act="send"]'), fe)
        await pg.close()
        await b.close()
    print(f"\n{sum(r[1] for r in R)} of {len(R)} checks passed")
asyncio.run(main())
