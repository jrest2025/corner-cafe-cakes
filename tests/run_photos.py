"""Inspiration photos: on the staff order form (custom cakes) and added to an existing order. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsPhotos"; OUT.mkdir(exist_ok=True); FX = HERE / "fixtures"
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
TAB = {'width': 1024, 'height': 768}
async def newpage(b, vp=TAB, role='front_of_house'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=True); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(280); return r
async def stage(pg): return await pg.inner_text('.sl-progress')
async def nxt(pg): await js(pg, '.sl-stepbar [data-act="sl-next"]')
async def thumbs(pg, scope): return await pg.evaluate(f"[].slice.call(document.querySelectorAll('{scope} .ccs-ph')).map(function(e){{return e.querySelector('.ccs-ph-st').textContent}})")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await newpage(b)
        await js(pg, '.ccs-nav [data-tab="new"]'); await pg.wait_for_timeout(400)
        await js(pg, '[data-act="n-cell"][data-v="cheesecake|8"]')
        check('standard cake: no photo button', await pg.locator('#n-photos').count() == 0)
        await js(pg, '[data-act="n-finish"][data-v="custom"]')
        check('custom cake: Add photos appears under the design box', await pg.locator('#sl-st-0 #n-photos').count() == 1 and 'Inspiration photos' in await pg.inner_text('#sl-st-0'))
        await pg.fill('#n-design', 'Blue ombre with gold leaf')
        await pg.set_input_files('#n-photos', [str(FX / 'cake1.png'), str(FX / 'cake2.png')]); await pg.wait_for_timeout(600)
        t = await thumbs(pg, '#sl-st-0')
        check('two photos upload and show as Added', t == ['Added', 'Added'], t)
        await pg.set_input_files('#n-photos', [str(FX / 'notes.txt')]); await pg.wait_for_timeout(400)
        check('a file that is not a photo is refused with a plain reason', 'notes.txt is not a photo' in await pg.inner_text('#sl-st-0'))
        await pg.set_input_files('#n-photos', [str(FX / 'fail-cake.png')]); await pg.wait_for_timeout(600)
        check('a failed upload says so on the photo', 'Upload failed' in await thumbs(pg, '#sl-st-0'))
        await js(pg, '#sl-st-0 .ccs-ph.is-failed [data-act="sl-phx"]')
        check('the failed photo can be removed', await thumbs(pg, '#sl-st-0') == ['Added', 'Added'])
        await pg.set_input_files('#n-photos', [str(FX / f'cake{i}.png') for i in (3, 4, 5, 6)]); await pg.wait_for_timeout(700)
        t = await thumbs(pg, '#sl-st-0')
        check('no more than 5 photos', len(t) == 5 and 'up to 5 photos' in await pg.inner_text('#sl-st-0') and await pg.locator('#n-photos').count() == 0, t)
        await pg.screenshot(path=str(OUT / 'step1-photos.png'))
        await js(pg, '#sl-st-0 [data-act="sl-phx"][data-v="4"]')
        # finish the order
        await nxt(pg)
        await pg.fill('#n-name', 'Photo Test Guest'); await nxt(pg)
        await pg.fill('#n-phone', '912 0077'); await pg.wait_for_timeout(450); await nxt(pg)
        await js(pg, '[data-act="sl-opt"][data-v="no"]'); await nxt(pg)
        await js(pg, '#sl-st-3 .ccs-chip-soon ~ .ccs-chip-soon'); await nxt(pg)
        if 'short-notice' in (await pg.inner_text('#sl-st-3')).lower() or await pg.locator('#n-rush').count():
            await pg.fill('#n-rush', 'Spare base'); await pg.fill('#n-rushby', 'Test Manager'); await nxt(pg)
        await js(pg, '#sl-st-3 [data-act="n-time"]:not([disabled])'); await nxt(pg)
        await js(pg, '[data-act="sl-skip"]')
        await js(pg, '[data-act="n-diet"][data-v="no"]'); await nxt(pg)
        await nxt(pg)
        check('reached the read over', 'Step 8 of 8' in await stage(pg), await stage(pg))
        await js(pg, '[data-act="n-submit"]'); await pg.wait_for_timeout(700)
        c = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_create_order'}).map(function(c){return c[2].p})")
        att = c[0].get('attachments') if c else None
        check('the order carries the 4 uploaded photos', att is not None and len(att) == 4 and all(a.startswith('incoming/') for a in att), att)
        check('no page errors (form)', not errs, errs)
        await ctx.close()

        # Add photos to an existing order
        ctx, pg, errs = await newpage(b)
        oid = await pg.evaluate("(function(){var o=(window.__orders||[]).filter(function(x){return ['awaiting_review','awaiting_quote','awaiting_deposit','confirmed'].indexOf(x.order_status)>-1 && (x.order_items||[])[0] && x.order_items[0].finish==='custom'})[0]; return o? o.id+'|'+o.reference : ''})()")
        iid, ref = oid.split('|')
        await js(pg, '.ccs-nav [data-tab="orders"]'); await pg.fill('#ccs-q', ref); await pg.wait_for_timeout(300)
        await pg.evaluate(f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()"); await pg.wait_for_timeout(800)
        check('open order offers Add inspiration photos', await pg.locator('#ccs-sheet #o-photos').count() == 1)
        check('it is a small link, not a big button', await pg.locator('#ccs-sheet .ccs-phlink #o-photos').count() == 1)
        await pg.set_input_files('#o-photos', [str(FX / 'cake1.png'), str(FX / 'cake2.png')]); await pg.wait_for_timeout(1200)
        n = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='staff_add_photos'}).map(function(c){return c[2].p_paths.length})")
        check('both photos saved to the order in one step, after they finished uploading', n == [2], n)
        check('the order shows its photos after saving', await pg.locator('#ccs-sheet .ccs-photos img').count() >= 2)
        await pg.screenshot(path=str(OUT / 'order-photos.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.fill('#ccs-q', 'CC-1001'); await pg.wait_for_timeout(300)
        await pg.evaluate("(function(){var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){return x.textContent.indexOf('CC-1001')>-1})[0]; if(b) b.click();})()"); await pg.wait_for_timeout(800)
        check('a standard-finish order with no photos does not offer photos', await pg.locator('#ccs-sheet .ccs-big').count() == 1 and await pg.locator('#ccs-sheet #o-photos').count() == 0)
        check('no page errors (order)', not errs, errs)
        await ctx.close()

        # Kitchen cannot add photos
        ctx, pg, errs = await newpage(b, role='kitchen')
        check('kitchen login has no photo button anywhere on its board', await pg.locator('#o-photos, #n-photos').count() == 0)
        await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
