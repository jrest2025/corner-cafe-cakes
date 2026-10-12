"""Screenshots of every staff view with invented data, for the visual audit. Read-only: no saves."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / (sys.argv[1] if len(sys.argv) > 1 else "shotsAudit"); OUT.mkdir(exist_ok=True)
PAGE = "built-staff5.html"
async def shot(pg, name): await pg.wait_for_timeout(500); await pg.screenshot(path=str(OUT / f"{name}.png"), full_page=False)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vp, tag in [({'width': 1366, 'height': 768}, 'laptop'), ({'width': 820, 'height': 1180}, 'tablet'), ({'width': 390, 'height': 844}, 'phone'), ({'width': 1280, 'height': 600}, 'short'), ({'width': 640, 'height': 400}, 'zoom200')]:
            ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 900); pg = await ctx.new_page()
            await pg.add_init_script("window.__role='admin'; try{localStorage.clear()}catch(e){}")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
            await shot(pg, f'{tag}-today')
            async def tab(t):
                if await pg.locator(f'.ccs-nav [data-tab="{t}"]').is_visible(): await pg.click(f'.ccs-nav [data-tab="{t}"]')
                else:
                    await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300); await pg.click(f'#ccs-sheet [data-tab="{t}"]')
                await pg.wait_for_timeout(500)
            await tab('orders'); await pg.click('[data-act="filter"][data-v="recent"]'); await shot(pg, f'{tag}-orders')
            await pg.locator('[data-act="open-order"]').first.click(); await pg.wait_for_timeout(500); await shot(pg, f'{tag}-order-detail')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await tab('calendar'); await shot(pg, f'{tag}-calendar')
            await tab('new'); await shot(pg, f'{tag}-new')
            await tab('customers'); await shot(pg, f'{tag}-customers')
            await pg.locator('[data-act="open-customer"]').first.click(); await pg.wait_for_timeout(600); await shot(pg, f'{tag}-customer')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await tab('kitchen'); await shot(pg, f'{tag}-kitchen')
            await tab('register'); await shot(pg, f'{tag}-register')
            await tab('dash'); await shot(pg, f'{tag}-dash')
            await tab('settings'); await shot(pg, f'{tag}-settings')
            await ctx.close()
        await b.close()
asyncio.run(main())
