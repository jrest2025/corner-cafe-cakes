import asyncio, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        for role in ['manager','kitchen']:
            pg = await b.new_page(viewport={"width": 1180, "height": 820})
            pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
            await pg.add_init_script(f"window.__role='{role}'")
            await pg.goto((HERE / "built-staff3.html").as_uri()); await pg.wait_for_timeout(600)
            txt = await pg.inner_text('#cc-staff')
            print(role, 'loaded:', 'did not load' not in txt, '| nav:', await pg.eval_on_selector_all('.ccs-nav-item','e=>e.map(x=>x.dataset.tab).join(",")'))
            await pg.screenshot(path=str(HERE/f"shots2/built-{role}.png"))
        print('ERRORS', errs); await b.close()
asyncio.run(main())
