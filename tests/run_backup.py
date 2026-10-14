"""Backup and business continuity section: backup Sheet health, access code for administrators, outage steps, Today warning. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsB"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
CURRENT = "{state:'current',minutes:1,last_ack_at:new Date(Date.now()-60000).toISOString(),rows:{'Today':2,'All orders':9},sheet_url:'https://docs.google.com/spreadsheets/d/x/edit',sheet_title:'Corner Café Cake Orders Backup',last_error:null,emails_failed:0,emails_waiting:0}"
STALE = "{state:'attention',minutes:95,last_ack_at:new Date(Date.now()-95*60000).toISOString(),last_error_at:new Date().toISOString(),rows:{'Today':2},sheet_url:'https://docs.google.com/spreadsheets/d/x/edit',sheet_title:'Corner Café Cake Orders Backup',last_error:'Could not reach the order system. The tabs keep the last copy.',emails_failed:1,emails_waiting:0}"
async def newpage(b, vp, errs, role='admin', mir='null'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__mir={mir}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(700)
    return ctx, pg
async def open_backup(pg, phone=False):
    if phone:
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="settings"]')
    else:
        await pg.click('.ccs-nav [data-tab="settings"]')
    await pg.wait_for_timeout(700)
    await pg.evaluate("(function(){var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk.indexOf('Backup and business continuity')===0})[0]; if(n) n.click(); else document.querySelectorAll('.ccs-set details').forEach(function(d){ if (d.textContent.indexOf('Backup and business continuity') > -1) d.open = true; })})()"); await pg.wait_for_timeout(250)
async def sec(pg): return await pg.evaluate("(function(){var d=document.querySelector('details[data-s5open=bc]'); return d? d.innerText : ''})()")
async def calls(pg, fn): return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==={fn!r}}}).length")

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. Not set up, administrator
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs)
        await open_backup(pg); t = await sec(pg)
        check('one section: Backup and business continuity', 'Backup and business continuity' in await pg.inner_text('.ccs-setnav') and 'Backup to Google Sheet' not in await pg.inner_text('#ccs-main') and 'Backup check' not in await pg.inner_text('.ccs-setnav'))
        check('not set up: says so plainly and flags it', 'Not set up' in t and 'not set up yet' in t, t[:400])
        check('one plain line on what to do if the app is down', 'If the staff app is down, open the backup Sheet' in t and 'M-001' not in t)
        check('database copies and restore tests still shown', 'Full copies inside the database' in t and 'Restore tests' in t)
        check('access code hidden until asked', 'Show access code' in t and 'ab12ab12' not in t)
        await pg.click('[data-act="mir-show"]'); await pg.wait_for_timeout(400); t = await sec(pg)
        check('administrator can show the access code', 'ab12ab12' in t and await calls(pg, 'mirror_setup_code') == 1)
        await pg.click('[data-act="mir-hide"]'); await pg.wait_for_timeout(300)
        check('code can be hidden again', 'ab12ab12' not in await sec(pg))
        await pg.click('[data-act="mir-new"]'); await pg.wait_for_timeout(300)
        check('new code needs a second tap', await calls(pg, 'mirror_new_code') == 0 and 'tap again to make a new code' in await sec(pg))
        await pg.click('[data-act="mir-new"]'); await pg.wait_for_timeout(500)
        check('second tap makes a new code and shows it', await calls(pg, 'mirror_new_code') == 1 and 'cd34cd34' in await sec(pg))
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(600)
        check('Today warns managers the backup is not set up', 'The backup Google Sheet is not set up yet.' in await pg.inner_text('#ccs-main'))
        await pg.screenshot(path=str(OUT / 'not-set-up.png'))
        await ctx.close()

        # 2. Working
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, mir=CURRENT)
        check('Today has no backup warning when it is current', 'backup Google Sheet' not in await pg.inner_text('#ccs-main'))
        await open_backup(pg); t = await sec(pg)
        check('current: Connected and current, last copy and link', 'Connected and current' in t and 'last copy' in t and 'Corner Café Cake Orders Backup' in t, t[:400])
        href = await pg.evaluate("(function(){var a=document.querySelector('details[data-s5open=bc] a[href*=\"docs.google.com\"]'); return a? a.target : ''})()")
        check('Sheet link opens in a new tab', href == '_blank')
        check('rows copied shown', 'All orders 9' in t)
        await pg.screenshot(path=str(OUT / 'current.png'))
        await ctx.close()

        # 3. Stale with an error, manager (no code)
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='manager', mir=STALE)
        check('Today warns managers when the backup stopped', 'The backup Google Sheet has not updated since' in await pg.inner_text('#ccs-main'))
        await open_backup(pg); t = await sec(pg)
        check('attention: plain problem text, no technical codes', 'Attention' in t and 'Could not reach the order system' in t and '1 could not be sent' in t, t[:500])
        check('manager cannot see the access code', 'Show access code' not in t and await calls(pg, 'mirror_setup_code') == 0)
        await ctx.close()

        # 4. Front of house never asks for backup status
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='front_of_house', mir=STALE)
        check('front of house: no backup warning and no backup call', 'backup Google Sheet' not in await pg.inner_text('#ccs-main') and await calls(pg, 'mirror_health') == 0)
        await ctx.close()

        # 5. Phone
        ctx, pg = await newpage(b, {'width': 360, 'height': 740}, errs, mir=CURRENT)
        await open_backup(pg, phone=True)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('no sideways scroll on a small phone', sw <= 360, sw)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
