"""Cake menu editor in Settings. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsMenu"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
async def newpage(b, vp={'width': 1024, 'height': 768}, role='manager', init=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    await pg.evaluate("(function(){var e=[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop(); if(!e){var m=document.querySelector('[data-tab=more]'); m&&m.click(); e=[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop();} e&&e.click()})()"); await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelectorAll('.ccs-set details').forEach(function(d){ if (d.textContent.indexOf('Cakes and prices') > -1) d.open = true; })")
    return ctx, pg, errs
async def js(pg, sel):
    await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(220)
async def saved(pg): return await pg.evaluate("window.__menuSaved || null")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await newpage(b)
        t = await pg.inner_text('.ccs-menu-list')
        check('menu lists each cake with sizes, prices and flavours', 'Cheesecake' in t and '6, 8, 10, 12 inch' in t and '$54 to $155' in t and '2 flavours' in t, t)
        check('there is an Add a cake button', await pg.locator('[data-act="mf-open"][data-id=""]').count() == 1)
        # Add a new cake with flavours and sizes
        await js(pg, '[data-act="mf-open"][data-id=""]')
        await pg.fill('#mf-name', 'Tiramisu'); await pg.fill('#mf-sp-0', '45'); await pg.fill('#mf-sv-0', 'About 8 slices'); await pg.fill('#mf-sp-1', '70')
        await js(pg, '[data-act="mf-add-size"]'); await pg.fill('#mf-sp-2', '95')
        await js(pg, '[data-act="mf-add-flavour"]'); await pg.fill('#mf-fl-0', 'Classic')
        await js(pg, '[data-act="mf-add-flavour"]'); await pg.fill('#mf-fl-1', 'Mocha')
        await pg.screenshot(path=str(OUT / 'add.png'), full_page=True)
        await js(pg, '[data-act="mf-review"]')
        r = await pg.inner_text('#ccs-sheet')
        check('review lists the new cake, sizes and flavours in words', 'New cake: Tiramisu' in r and 'Size added: 10 inch at $95' in r and 'Flavour added: Mocha' in r, r[:500])
        check('nothing saved before Save changes', await saved(pg) is None)
        await js(pg, '[data-act="mf-save"]'); await pg.wait_for_timeout(400)
        s = await saved(pg)
        check('save sends name, three sizes and two flavours', s and s['name'] == 'Tiramisu' and [x['inch'] for x in s['sizes']] == [6, 8, 10] and [x['name'] for x in s['flavours']] == ['Classic', 'Mocha'] and s['id'] is None, s)
        check('serves note is sent', s and s['sizes'][0]['serves'] == 'About 8 slices')
        check('confirmation says new orders use it straight away', 'added to the menu' in await pg.inner_text('#ccs-toast'))
        await ctx.close()
        # Edit: rename a flavour, stop a size, change price
        ctx, pg, errs = await newpage(b)
        await js(pg, '[data-act="mf-open"][data-id="p2"]'); await pg.wait_for_timeout(600)
        check('editing shows recent changes with who made them', 'recent changes' in (await pg.inner_text('#ccs-sheet')).lower() and 'Test Manager' in await pg.inner_text('#ccs-sheet'))
        check('existing sizes cannot be renamed, only priced or stopped', await pg.get_attribute('#mf-si-0', 'readonly') is not None)
        await pg.fill('#mf-fl-1', 'White Forest Deluxe'); await pg.click('[data-mfsa="1"]'); await pg.fill('#mf-sp-0', '44')
        await js(pg, '[data-act="mf-review"]')
        r = await pg.inner_text('#ccs-sheet')
        check('review: rename, size stopped and small price change', 'Flavour renamed: White Forest to White Forest Deluxe' in r and '8 inch: no longer offered' in r and '6 inch price: $42 to $44 (5% higher)' in r and 'big price change' not in r, r[:600])
        await js(pg, '[data-act="mf-edit"]')
        check('Back to editing keeps what was typed', await pg.input_value('#mf-fl-1') == 'White Forest Deluxe')
        await js(pg, '[data-act="mf-review"]'); await js(pg, '[data-act="mf-save"]'); await pg.wait_for_timeout(400)
        s = await saved(pg)
        check('edit keeps ids so past orders stay linked', s and s['id'] == 'p2' and s['flavours'][1]['id'] == 'v2' and s['sizes'][1]['id'] == 's22' and s['sizes'][1]['active'] is False, s)
        await ctx.close()
        # Checks before saving
        ctx, pg, errs = await newpage(b)
        await js(pg, '[data-act="mf-open"][data-id=""]')
        await js(pg, '[data-act="mf-review"]')
        check('a cake needs a name', 'Give the cake a name' in await pg.inner_text('#ccs-sheet'))
        await pg.fill('#mf-name', 'Test Cake'); await pg.fill('#mf-sp-0', '40'); await pg.fill('#mf-sp-1', '60'); await pg.fill('#mf-si-1', '6')
        await js(pg, '[data-act="mf-review"]')
        check('the same size twice is refused', 'listed twice' in await pg.inner_text('#ccs-sheet'))
        await pg.fill('#mf-si-1', '8'); await js(pg, '[data-act="mf-add-flavour"]'); await pg.fill('#mf-fl-0', 'Vanilla'); await js(pg, '[data-act="mf-add-flavour"]'); await pg.fill('#mf-fl-1', 'vanilla')
        await js(pg, '[data-act="mf-review"]')
        check('the same flavour twice is refused', 'listed twice' in await pg.inner_text('#ccs-sheet'))
        await ctx.close()
        # Failed save keeps the changes
        ctx, pg, errs = await newpage(b, init="window.__menuFail = true;")
        await js(pg, '[data-act="mf-open"][data-id="p1"]'); await pg.fill('#mf-sp-1', '99'); await js(pg, '[data-act="mf-review"]'); await js(pg, '[data-act="mf-save"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-sheet')
        check('failed save says so and keeps the changes', 'Not saved' in t and 'still here' in t and await pg.locator('#ccs-sheet [data-act="mf-save"]').count() == 1, t[:300])
        check('no page errors', not errs, errs)
        await ctx.close()
        # Phone layout
        ctx, pg, errs = await newpage(b, {'width': 390, 'height': 844})
        await js(pg, '[data-act="mf-open"][data-id="p2"]')
        check('phone: editor fits without sideways scroll', await pg.evaluate("document.querySelector('#ccs-sheet').scrollWidth <= document.querySelector('#ccs-sheet').clientWidth + 1"))
        await pg.screenshot(path=str(OUT / 'phone-edit.png'), full_page=True)
        await ctx.close()
        # Front of house cannot see Settings
        ctx, pg, errs = await newpage(b, role='front_of_house')
        check('front of house has no cake menu editor', await pg.locator('[data-act="mf-open"]').count() == 0)
        await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
