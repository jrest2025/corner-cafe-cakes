"""Cake design references and the photo viewer: on the order, the kitchen board and the new order form.
Zoom, pan, fit, previous and next, thumbnails, keys, swipe, pinch, remove an out-of-date photo. Invented images only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsGallery"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
URLS = "{'incoming/a/1.png':'photo1.png','incoming/a/2.png':'photo2.png','incoming/a/3.png':'photo3.png',0:'photo1.png',1:'photo2.png',2:'photo3.png'}"
async def start(b, vp, role='front_of_house', touch=False):
    ctx = await b.new_context(viewport=vp, is_mobile=touch, has_touch=touch); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__reqOrders=true; window.__setupGuest=true; window.__photoUrls={URLS}; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900)
    return ctx, pg, errs
async def js(pg, code, wait=250):
    r = await pg.evaluate(code); await pg.wait_for_timeout(wait); return r
async def click(pg, sel, wait=250):
    return await js(pg, f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()", wait)
async def open_order(pg, ref):
    await pg.click('.ccs-nav [data-tab="orders"]'); await pg.wait_for_timeout(250)
    if await pg.locator('#ccs-q').count(): await pg.fill('#ccs-q', ref)
    await pg.wait_for_timeout(300)
    await js(pg, f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click();}})()", 800)
LBS = "(function(){var l=document.getElementById('ccs-lb'); if(!l||!l.classList.contains('is-open')) return null; var i=l.querySelector('.lb-img'), s=l.querySelector('.lb-stage').getBoundingClientRect(), r=i.getBoundingClientRect(); return {count:l.querySelector('.lb-count').textContent, src:i.getAttribute('src'), tf:i.style.transform, zoomed:l.classList.contains('is-zoomed'), nw:i.naturalWidth, nh:i.naturalHeight, w:r.width, h:r.height, sw:s.width, sh:s.height, sl:s.left, st:s.top, cur:(l.querySelector('.lb-thumb[aria-current=true]')||{}).dataset, loading:l.classList.contains('is-loading')}})()"
async def lb(pg): return await pg.evaluate(LBS)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # Desktop: the order
        ctx, pg, errs = await start(b, {'width': 1280, 'height': 900})
        await open_order(pg, 'CC-1020')
        t = await pg.inner_text('#ccs-sheet')
        check('order: Cake design references section with 3 current photos', 'Cake design references' in t and '3 photos' in t, t[:800])
        n = await pg.evaluate("document.querySelectorAll('#ccs-sheet .ccs-refbtn').length")
        check('order: removed photo is not shown', n == 3, n)
        sizes = await pg.evaluate("[].slice.call(document.querySelectorAll('#ccs-sheet .ccs-refbtn')).map(function(e){var r=e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]})")
        check('order: thumbnails are small and tidy, not full size', all(80 <= w <= 200 and abs(w - h) <= 2 for w, h in sizes), sizes)
        await pg.screenshot(path=str(OUT / 'order.png'))
        await pg.fill('#ccs-q', 'CC-1020')
        await click(pg, '#ccs-sheet .ccs-refbtn[data-v="1"]', 700)
        s = await lb(pg)
        check('viewer: opens on the photo tapped', s and s['count'] == '2 of 3' and 'photo2' in s['src'], s)
        check('viewer: photo keeps its proportions', s and abs(s['w'] / s['h'] - s['nw'] / s['nh']) < 0.02, s)
        check('viewer: photo fits within the screen', s and s['w'] <= s['sw'] + 1 and s['h'] <= s['sh'] + 1, s)
        check('viewer: thumbnail strip marks the current photo', s and s['cur'] and s['cur'].get('i') == '1', s and s['cur'])
        foc = await pg.evaluate("document.activeElement && document.activeElement.textContent")
        check('viewer: focus goes to Close', foc == 'Close', foc)
        await pg.screenshot(path=str(OUT / 'viewer.png'))
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(400)
        s = await lb(pg); check('keys: right arrow goes to the next photo', s['count'] == '3 of 3', s['count'])
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(400)
        s = await lb(pg); check('keys: next after the last goes back to the first', s['count'] == '1 of 3', s['count'])
        await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(400)
        s = await lb(pg); check('keys: left arrow goes back', s['count'] == '3 of 3', s['count'])
        await click(pg, '#ccs-lb [data-lb="thumb"][data-i="0"]', 400)
        s = await lb(pg); check('thumbnail tap goes to that photo', s['count'] == '1 of 3' and 'photo1' in s['src'], s)
        await click(pg, '#ccs-lb [data-lb="in"]', 300)
        s = await lb(pg); check('Zoom in enlarges the photo', s['zoomed'] and 'scale(1.5)' in s['tf'], s['tf'])
        fit_on = await pg.evaluate("!document.querySelector('#ccs-lb [data-lb=fit]').disabled")
        check('Fit to screen is available when zoomed', fit_on)
        # drag to pan
        cx, cy = s['sl'] + s['sw'] / 2, s['st'] + s['sh'] / 2
        await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx - 150, cy - 60, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(200)
        s2 = await lb(pg); check('drag pans the zoomed photo', s2['tf'] != s['tf'] and 'translate(0px, 0px)' not in s2['tf'].replace(',', ', '), s2['tf'])
        check('panning does not change photo', s2['count'] == '1 of 3', s2['count'])
        # wheel zoom
        await pg.mouse.move(cx, cy); await pg.mouse.wheel(0, -300); await pg.wait_for_timeout(200)
        s3 = await lb(pg); check('mouse wheel zooms in', 'scale(1.8)' in s3['tf'], s3['tf'])
        await click(pg, '#ccs-lb [data-lb="out"]', 300)
        await click(pg, '#ccs-lb [data-lb="fit"]', 400)
        s = await lb(pg); check('Fit to screen resets the zoom', not s['zoomed'] and 'scale(1)' in s['tf'], s['tf'])
        await pg.keyboard.press('+'); await pg.wait_for_timeout(200); await pg.keyboard.press('0'); await pg.wait_for_timeout(300)
        s = await lb(pg); check('keys: + zooms and 0 resets', not s['zoomed'], s['tf'])
        # swipe with the mouse when not zoomed
        await pg.mouse.move(cx + 120, cy); await pg.mouse.down(); await pg.mouse.move(cx - 120, cy, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(400)
        s = await lb(pg); check('swipe goes to the next photo when not zoomed', s['count'] == '2 of 3', s['count'])
        # Escape closes the viewer only; the order stays open with what was typed
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        s = await lb(pg); still = await pg.evaluate("!!document.querySelector('#ccs-sheet .ccs-refs')")
        check('Escape closes the viewer and keeps the order open', s is None and still, (s, still))
        foc = await pg.evaluate("document.activeElement && document.activeElement.className")
        check('focus returns to the photo that was opened', 'ccs-refbtn' in (foc or ''), foc)
        # remove an out-of-date photo: two taps
        await click(pg, '#ccs-sheet [data-act="ph-rm"][data-v="2"]', 200)
        lab = await pg.evaluate("document.querySelector('#ccs-sheet [data-act=ph-rm][data-v=\"2\"]').textContent")
        check('remove asks for a second tap', lab == 'Tap again to remove', lab)
        await click(pg, '#ccs-sheet [data-act="ph-rm"][data-v="2"]', 800)
        rm = await pg.evaluate("window.__photoRemoved")
        check('remove sends the right photo', rm and rm.get('p_attachment') == 'a3', rm)
        check('desktop: no page errors', not errs, errs)
        await ctx.close()

        # Broken image
        ctx, pg, errs = await start(b, {'width': 1280, 'height': 900})
        await pg.evaluate("window.__photoUrls={0:'missing.png',1:'photo2.png',2:'photo3.png','incoming/a/1.png':'missing.png','incoming/a/2.png':'photo2.png','incoming/a/3.png':'photo3.png'}")
        await open_order(pg, 'CC-1020')
        bad = await pg.evaluate("document.querySelectorAll('#ccs-sheet .ccs-refbtn.is-broken').length")
        check('broken photo shows Photo not available', bad == 1, bad)
        await click(pg, '#ccs-sheet .ccs-refbtn[data-v="0"]', 800)
        err = await pg.evaluate("!document.querySelector('#ccs-lb .lb-err').hidden")
        check('viewer: a photo that cannot load says so, with Try again', err)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await ctx.close()

        # Kitchen board
        ctx, pg, errs = await start(b, {'width': 1280, 'height': 900}, role='kitchen')
        await js(pg, "(function(){var b=document.querySelector('[data-act=open-kitchen][data-id=o3]'); if(b) b.click()})()", 900)
        t = await pg.inner_text('#ccs-sheet')
        check('kitchen: Cake design references on the production order', 'Cake design references' in t and '2 photos' in t, t[:600])
        check('kitchen: cannot remove photos', not await pg.evaluate("!!document.querySelector('#ccs-sheet [data-act=ph-rm]')"))
        await click(pg, '#ccs-sheet .ccs-refbtn[data-v="0"]', 700)
        s = await lb(pg); check('kitchen: opens the same viewer', s and s['count'] == '1 of 2', s)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        check('kitchen: no page errors', not errs, errs)
        await ctx.close()

        # Phone: touch, pinch, swipe, large close
        ctx, pg, errs = await start(b, {'width': 390, 'height': 844}, touch=True)
        await open_order(pg, 'CC-1020')
        await click(pg, '#ccs-sheet .ccs-refbtn[data-v="0"]', 800)
        s = await lb(pg)
        check('phone: viewer fills the screen and the photo fits', s and s['w'] <= s['sw'] + 1 and s['h'] <= s['sh'] + 1 and s['sw'] <= 390, s)
        close = await pg.evaluate("(function(){var r=document.querySelector('#ccs-lb .lb-close').getBoundingClientRect(); return [r.width, r.height, r.right]})()")
        check('phone: Close is large and on screen', close[0] >= 80 and close[1] >= 44 and close[2] <= 390, close)
        await pg.screenshot(path=str(OUT / 'viewer-phone.png'))
        # pinch with two touch pointers
        await pg.evaluate("""(function(){var st=document.querySelector('#ccs-lb .lb-stage'), r=st.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
          function ev(t,id,x,y){st.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:id===1}))}
          ev('pointerdown',1,cx-40,cy); ev('pointerdown',2,cx+40,cy);
          for(var k=1;k<=10;k++){ev('pointermove',1,cx-40-k*8,cy); ev('pointermove',2,cx+40+k*8,cy);}
          ev('pointerup',1,cx-120,cy); ev('pointerup',2,cx+120,cy);})()""")
        await pg.wait_for_timeout(200)
        s = await lb(pg); check('phone: pinch zooms in', s['zoomed'], s['tf'])
        await click(pg, '#ccs-lb [data-lb="fit"]', 300)
        await pg.evaluate("""(function(){var st=document.querySelector('#ccs-lb .lb-stage'), r=st.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
          function ev(t,x){st.dispatchEvent(new PointerEvent(t,{pointerId:5,pointerType:'touch',clientX:x,clientY:cy,bubbles:true,isPrimary:true}))}
          ev('pointerdown',cx+100); for(var k=1;k<=8;k++) ev('pointermove',cx+100-k*25); ev('pointerup',cx-100);})()""")
        await pg.wait_for_timeout(400)
        s = await lb(pg); check('phone: swipe left goes to the next photo', s['count'] == '2 of 3', s['count'])
        sw = await pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
        check('phone: nothing goes off screen', sw)
        await click(pg, '#ccs-lb .lb-close', 300)
        check('phone: Close closes', (await lb(pg)) is None)
        check('phone: no page errors', not errs, errs)
        await ctx.close()

        # New order form: tap a photo you just added to see it full size
        ctx, pg, errs = await start(b, {'width': 1280, 'height': 900})
        await js(pg, "[].slice.call(document.querySelectorAll('[data-tab=new]')).filter(function(e){return e.offsetParent}).pop().click()", 500)
        await click(pg, '[data-act="n-req"]', 300)
        await pg.set_input_files('#n-photos', [str(HERE / 'photo1.png'), str(HERE / 'photo2.png')]); await pg.wait_for_timeout(800)
        n = await pg.evaluate("document.querySelectorAll('[data-act=lb-open][data-src=draft]').length")
        check('new order: added photos can be opened', n == 2, n)
        await click(pg, '[data-act="lb-open"][data-src="draft"][data-v="1"]', 700)
        s = await lb(pg); check('new order: viewer opens on that photo', s and s['count'] == '2 of 2', s)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        still = await pg.evaluate("!!document.getElementById('n-design')")
        check('new order: closing the viewer keeps the form as it was', still)
        check('new order: no page errors', not errs, errs)
        await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
