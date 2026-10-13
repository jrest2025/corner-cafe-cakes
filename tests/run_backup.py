"""Google Sheet backup section checks on the local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsB"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='admin', bk='{robot:true,linked:false,err:null}'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__bk={bk}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def open_backup(pg, phone=False):
    if phone:
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="settings"]')
    else:
        await pg.click('.ccs-nav [data-tab="settings"]')
    await pg.wait_for_timeout(500)
    await pg.evaluate("(function(){var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk.indexOf('Backup to Google Sheet')===0})[0]; if(n) n.click(); else document.querySelectorAll('.ccs-set details').forEach(function(d){ if (d.textContent.indexOf('Backup to Google Sheet') > -1) d.open = true; })})()"); await pg.wait_for_timeout(200)

async def text(pg): return await pg.inner_text('#ccs-main')
async def fn_calls(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[0]==='fn' && c[1]==='sheet-backup'}).map(function(c){return c[2]})")

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. robot not set up
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, bk='{robot:false,linked:false,err:null}')
        await open_backup(pg)
        t = await text(pg)
        check('not set up: says so plainly', 'Not set up' in t and 'GOOGLE_SERVICE_ACCOUNT_JSON' in t and await pg.locator('#bk-url').count() == 0)
        await ctx.close()

        # 2. manager does not see it
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='manager')
        await pg.click('.ccs-nav [data-tab="settings"]'); await pg.wait_for_timeout(400)
        check('manager has no backup section', 'Backup to Google Sheet' not in await text(pg))
        check('manager never asks for backup status', len(await fn_calls(pg)) == 0)
        await ctx.close()

        # 3. admin links a sheet
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs)
        await open_backup(pg)
        t = await text(pg)
        check('not linked: steps and robot address shown', 'Not linked' in t and 'cakes-robot@test.iam.gserviceaccount.com' in t and 'Make a new Google Sheet' in t)
        await pg.screenshot(path=str(OUT / 'not-linked.png'), full_page=True)
        await pg.fill('#bk-url', 'my sheet'); await pg.click('[data-act="bk-link"]'); await pg.wait_for_timeout(250)
        check('bad link refused before sending', 'Paste the full Google Sheet link' in await text(pg) and not [c for c in await fn_calls(pg) if c['op'] == 'link'])
        await pg.fill('#bk-url', 'https://docs.google.com/spreadsheets/d/NOSHARE1234567890abcdefgh/edit'); await pg.click('[data-act="bk-link"]'); await pg.wait_for_timeout(400)
        t = await text(pg)
        check('unshared sheet: share message, link kept in box', 'press Share and add' in t and 'NOSHARE' in await pg.input_value('#bk-url'), t[-400:])
        await pg.fill('#bk-url', 'https://docs.google.com/spreadsheets/d/ABCDEFGHIJKLMNOPQRSTUVWXYZ12/edit#gid=0'); await pg.click('[data-act="bk-link"]'); await pg.wait_for_timeout(500)
        lc = [c for c in await fn_calls(pg) if c['op'] == 'link']
        check('link sent with the pasted address', lc and lc[-1]['url'].endswith('#gid=0'), lc)
        t = await text(pg)
        check('linked: sheet name, last copied and count shown', 'Cake backup' in t and 'Orders copied' in t and '9' in t and 'Last copied' in t, t[-500:])
        check('linked: summary says On', 'Backup to Google Sheet\tOn' in t or 'Backup to Google Sheet On' in t or 'On' in await pg.inner_text('.ccs-set summary:has-text("Backup to Google Sheet")'))
        href = await pg.get_attribute('.ccs-history a.ccs-link', 'href'); tgt = await pg.get_attribute('.ccs-history a.ccs-link', 'target')
        check('open sheet link opens Google in a new tab', href.startswith('https://docs.google.com/') and tgt == '_blank', href)
        await pg.screenshot(path=str(OUT / 'linked.png'), full_page=True)
        # copy now
        await pg.click('[data-act="bk-copy"]'); await pg.wait_for_timeout(400)
        check('copy now sent', [c for c in await fn_calls(pg) if c['op'] == 'copy'])
        # change sheet then cancel
        await pg.click('[data-act="bk-change"][data-v="1"]'); await pg.wait_for_timeout(250)
        check('link a different sheet shows the form', await pg.locator('#bk-url').count() == 1)
        await pg.click('[data-act="bk-change"][data-v="0"]'); await pg.wait_for_timeout(250)
        check('cancel returns to linked view', await pg.locator('#bk-url').count() == 0 and 'Orders copied' in await text(pg))
        # stop backup needs two taps
        await pg.click('[data-act="bk-unlink"]'); await pg.wait_for_timeout(200)
        check('stop needs a second tap', not [c for c in await fn_calls(pg) if c['op'] == 'unlink'] and 'Tap again' in await text(pg))
        await pg.click('[data-act="bk-unlink"]'); await pg.wait_for_timeout(400)
        check('stopped: back to not linked', [c for c in await fn_calls(pg) if c['op'] == 'unlink'] and 'Not linked' in await text(pg))
        await ctx.close()

        # 4. error shown when the last copy failed
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, bk="{robot:true,linked:true,err:'Google was busy. It will try again in 5 minutes.'}")
        await open_backup(pg)
        t = await text(pg)
        check('last error shown and summary flags it', 'Google was busy' in t and 'Needs attention' in t)
        await ctx.close()

        # 5. small phone fits
        ctx, pg = await newpage(b, {'width': 360, 'height': 780}, errs, bk='{robot:true,linked:false,err:null}')
        await open_backup(pg, phone=True)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('no sideways scroll on a small phone', sw <= 360, sw)
        await pg.screenshot(path=str(OUT / 'phone.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
