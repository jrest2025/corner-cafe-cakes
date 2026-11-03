"""Change order: Other area typed in; Settings: bank details for admins only. Invented data only."""
import asyncio, pathlib, sys, json
from playwright.async_api import async_playwright
HERE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent; R = []
def ok(n, c, d=''): R.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:400]))
async def js(pg, sel):
    r = await pg.evaluate(f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()"); await pg.wait_for_timeout(300); return r
async def page(b, role):
    ctx = await b.new_context(viewport={'width':1024,'height':768}); pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__mockOcc=true; window.print=function(){{}};")
    await pg.goto((HERE / 'staff-test.html').as_uri()); await pg.wait_for_timeout(700)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await page(b, 'manager')
        await js(pg, '[data-act="open-order"][data-id="o1"]'); await pg.wait_for_timeout(300)
        await js(pg, '[data-act="panel"][data-v="amend"]')
        await js(pg, '[data-act="am-open"][data-v="deliv"]')
        if not await pg.query_selector('#am-zone'):
            await js(pg, '[data-act="am-set"][data-f="method"][data-v="delivery"]')
        opts = await pg.eval_on_selector_all('#am-zone option', 'els => els.map(e => e.textContent)')
        ok('Change order: area list ends with Other area (type it)', bool(opts) and opts[-1] == 'Other area (type it)', opts)
        if opts:
            await pg.select_option('#am-zone', '__other_area'); await pg.wait_for_timeout(300)
            ok('choosing it shows a box to type the area', await pg.query_selector('#am-zone-other') is not None)
            await pg.fill('#am-zone-other', 'Sabeto'); await pg.fill('#am-fee', '45')
            z = await pg.evaluate("document.getElementById('am-zone').value")
            ok('the list keeps showing Other area while typing', z == '__other_area', z)
        ok('Change order: no page errors', not errs, errs); await ctx.close()
        # Settings as admin
        ctx, pg, errs = await page(b, 'admin')
        await js(pg, '[data-tab="settings"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#ccs-main')
        ok('admin sees Bank details for customer emails', 'Bank details for customer emails' in t and 'ending 4567' in t, t[:400])
        await pg.evaluate("[].forEach.call(document.querySelectorAll('details'),function(d){d.open=true})")
        await pg.fill('#pay-acct', '7654321'); await js(pg, '[data-act="pay-save"]'); await pg.wait_for_timeout(400)
        sv = await pg.evaluate("window.__bankSaved")
        ok('saving sends all the details', sv and sv.get('account_number') == '7654321' and sv.get('bank_name') == 'Test Bank' and sv.get('show_in_emails') is True, sv)
        ok('Settings admin: no page errors', not errs, errs); await ctx.close()
        ctx, pg, errs = await page(b, 'front_of_house')
        await js(pg, '[data-tab="settings"]'); await pg.wait_for_timeout(700)
        t = await pg.inner_text('#ccs-main')
        ok('counter staff do not see the bank details section', 'Bank details for customer emails' not in t, t[:300])
        await ctx.close(); await b.close()
    print(f"{sum(R)} of {len(R)} passed")
asyncio.run(main())
