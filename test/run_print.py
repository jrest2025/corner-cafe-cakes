"""Kitchen printing: settings (administrator), test slip and printer check, delivery log and Send again (managers),
slip status on orders and the kitchen board, the kitchen's Printed tap, and DL paper in the app. Invented data only."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsPrint"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
SEED = """
window.__slipRows = { o4: { version: 2, email: 'sent', confirmed_at: null, confirmed_by: null }, o3: { version: 1, email: 'sent', confirmed_at: null, confirmed_by: null }, o1: { version: 1, email: 'failed', confirmed_at: null } };
window.__slipLog = [
  { id: 'e2', kind: 'kitchen_slip', status: 'failed', attempts: 5, created_at: new Date().toISOString(), order_id: 'o1', reference: 'CC-1010', version: 1, latest_version: 1, printed_confirmed_at: null },
  { id: 'e1', kind: 'kitchen_slip', status: 'sent', attempts: 1, created_at: new Date(Date.now() - 36e5).toISOString(), order_id: 'o4', reference: 'CC-1004', version: 2, latest_version: 2, printed_confirmed_at: null },
  { id: 'e0', kind: 'kitchen_slip', status: 'sent', attempts: 1, created_at: new Date(Date.now() - 72e5).toISOString(), order_id: 'o4', reference: 'CC-1004', version: 1, latest_version: 2, printed_confirmed_at: new Date().toISOString(), printed_confirmed_label: 'Baker Two' }
];
"""
async def newpage(b, role='manager', init='', vp={'width': 1280, 'height': 900}):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.print=function(){{}}; try{{localStorage.clear()}}catch(e){{}} {SEED} {init}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(600)
    return ctx, pg, errs
async def js(pg, code, wait=300):
    r = await pg.evaluate(code); await pg.wait_for_timeout(wait); return r
async def click(pg, sel, wait=350):
    return await js(pg, f"(function(){{var e=document.querySelector({sel!r}); if(e) e.click(); return !!e}})()", wait)
async def to_printing(pg):
    await js(pg, "(function(){var b=document.querySelector('.ccs-nav [data-tab=settings]')||document.querySelector('[data-tab=settings]'); if(b) b.click()})()", 900)
    await js(pg, "(function(){var b=[].slice.call(document.querySelectorAll('.ccs-setnav [data-setk]')).filter(function(x){return x.dataset.setk==='Kitchen printing'})[0]; if(b) b.click(); return !!b})()", 400)
async def sec(pg):
    return await pg.evaluate("(function(){var d=[].slice.call(document.querySelectorAll('.ccs-set details')).filter(function(x){return /Kitchen printing/.test(x.querySelector('summary').textContent)})[0]; return d? d.innerText : ''})()")
calls = "window.__calls.filter(function(c){return c[1]===%r}).length"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. Administrator: settings, validation, paper change needs a printer check
        ctx, pg, errs = await newpage(b, 'admin')
        await to_printing(pg)
        t = await sec(pg)
        check('admin sees Kitchen printing in Settings', 'Kitchen printing' in t and await pg.locator('#pr-pri').count() == 1, t[:200])
        check('the printer email comes from settings, not the code', await pg.input_value('#pr-pri') == 'kitchen@example.com')
        check('test mode is stated plainly', 'Test mode is on. Every slip goes only to test@example.com' in t, t[:300])
        check('a slip that could not be delivered is shown as an alert with what to do', '1 kitchen slip could not be delivered: CC-1010 v1' in t and 'Send again' in t, t[:400])
        check('section label says how many were not delivered', '1 not delivered' in t)
        await pg.screenshot(path=str(OUT / 'admin-printing.png'))
        await pg.fill('#pr-pri', 'not-an-email'); await click(pg, '[data-act="pr-save"]', 500)
        t = await sec(pg)
        check('a wrong printer email is refused with a plain message', 'does not look right' in t, t[:300])
        await pg.fill('#pr-pri', 'kitchen@example.com'); await pg.fill('#pr-bak', 'kitchen@example.com'); await click(pg, '[data-act="pr-save"]', 500)
        t = await sec(pg)
        check('a backup the same as the main address is refused', 'same as the main one' in t, t[:300])
        await pg.fill('#pr-bak', 'manager@example.com'); await pg.select_option('#pr-paper', 'DL'); await click(pg, '[data-act="pr-save"]', 600)
        t = await sec(pg)
        check('after changing the printer, staff are told to send a test slip', 'Send a test slip, check it printed correctly' in t, t[:300])
        check('the label asks for a printer check', 'Check the printer' in await pg.inner_text('.ccs-setnav') or 'Check the printer' in t)
        check('no confirm button before a test slip is sent', await pg.locator('[data-act="pr-ok"]').count() == 0)
        await click(pg, '[data-act="pr-test"]', 700)
        t = await sec(pg)
        check('test slip sent and logged', 'Test slip' in t and await pg.evaluate(calls % 'admin_print_test') == 1, t[:400])
        check('It printed correctly appears once the test slip is sent', await pg.locator('[data-act="pr-ok"]').count() == 1)
        await click(pg, '[data-act="pr-ok"]', 700)
        t = await sec(pg)
        check('after confirming, the printer shows as checked', 'Printer last checked' in t and 'Send a test slip, check it' not in t, t[:300])
        # Send again needs a second tap
        await js(pg, "(function(){var b=[].slice.call(document.querySelectorAll('[data-act=pr-resend]')).filter(function(x){return x.dataset.id==='o1'})[0]; b.click()})()", 300)
        check('Send again asks for a second tap first', await pg.evaluate(calls % 'admin_slip_resend') == 0 and 'Tap again to send v1 again' in await sec(pg))
        await js(pg, "(function(){var b=[].slice.call(document.querySelectorAll('[data-act=pr-resend]')).filter(function(x){return x.dataset.id==='o1'})[0]; b.click()})()", 900)
        t = await sec(pg)
        check('second tap sends it once, and the log shows it waiting', await pg.evaluate(calls % 'admin_slip_resend') == 1 and 'Waiting to send' in t, t[:500])
        check('an old version cannot be sent again, it is marked as replaced', 'replaced by v2' in t, t[:600])
        n_again = await pg.evaluate("[].slice.call(document.querySelectorAll('[data-act=pr-resend]')).map(function(b){return b.dataset.id}).join(',')")
        check('Send again shows only on the newest slip of each order', n_again == 'o4', n_again)
        check('once sent again, the old failure stops showing as an alert', 'could not be delivered: CC-1010' not in t, t[:300])
        check('emailed and printed are shown separately in the log', 'not yet confirmed as printed' in t and 'printed, confirmed by Baker Two' in t, t[:600])
        await pg.screenshot(path=str(OUT / 'admin-after.png'))
        check('no script errors (admin)', not errs, errs)
        await ctx.close()

        # 2. Manager: sees the log, cannot change the printer
        ctx, pg, errs = await newpage(b, 'manager')
        await to_printing(pg)
        t = await sec(pg)
        check('manager sees the delivery log', 'Delivery log' in t and 'CC-1010 v1' in t, t[:300])
        check('manager cannot change the printer email', await pg.locator('#pr-pri').count() == 0 and 'Only an administrator can change' in t)
        check('no script errors (manager)', not errs, errs)
        await ctx.close()

        # 3. Front of house: no settings at all
        ctx, pg, errs = await newpage(b, 'front_of_house')
        check('front of house has no Settings', await pg.locator('[data-tab="settings"]').count() == 0)
        await ctx.close()

        # 4. Kitchen: emailed is not printed; the kitchen taps Printed
        ctx, pg, errs = await newpage(b, 'kitchen', vp={'width': 1024, 'height': 768})
        await pg.wait_for_timeout(600)
        await pg.evaluate("document.querySelector('[data-act=\"k-mode\"][data-v=\"board\"]').click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-act=\"k-range\"][data-v=\"7\"]').click()"); await pg.wait_for_timeout(300)
        card4 = "(function(){var k=[].slice.call(document.querySelectorAll('.ccs-kitem')).filter(function(x){return x.innerText.indexOf('CC-1003')>-1})[0]; return k? k.innerText : ''})()"
        cardR = "(function(){var k=[].slice.call(document.querySelectorAll('.ccs-kitem')).filter(function(x){return x.innerText.indexOf('CC-1004')>-1})[0]; return k? k.innerText : ''})()"
        t4 = await pg.evaluate(card4)
        check('kitchen card shows the slip was emailed but not yet confirmed as printed', 'Slip v1 · Emailed to the kitchen · Not yet confirmed as printed' in t4, t4)
        check('kitchen card has a Slip v1 printed button', 'Slip v1 printed' in t4)
        tr = await pg.evaluate(cardR)
        check('a cake already ready does not ask for print confirmation', 'Slip v2' not in tr and 'printed' not in tr, tr)
        t1 = await pg.evaluate("(function(){var k=[].slice.call(document.querySelectorAll('.ccs-kitem')).filter(function(x){return x.innerText.indexOf('CC-1010')>-1})[0]; return k? k.innerText : ''})()")
        check('a failed slip email shows on the kitchen card with what to do', 'Slip v1 email failed. Ask the counter to print it for you.' in t1 and 'Slip v1 printed' not in t1 and t1.count('failed') == 1, t1)
        await pg.screenshot(path=str(OUT / 'kitchen.png'))
        await js(pg, "(function(){var b=document.querySelector('[data-act=k-printed][data-id=o3]'); b.click()})()", 800)
        t4 = await pg.evaluate(card4)
        check('after tapping, it shows who confirmed and the button goes', 'Printed, confirmed by Test Kitchen' in t4 and 'Slip v1 printed' not in t4, t4)
        await js(pg, "(function(){var b=document.querySelector('[data-act=k-printed]'); if(b) b.click()})()", 400)
        check('tapping Printed calls the server once per tap', await pg.evaluate(calls % 'kitchen_confirm_printed') == 1)
        check('no script errors (kitchen)', not errs, errs)
        await ctx.close()

        # 5. Order screen: failed slip shown at the top; print uses the paper setting (DL)
        ctx, pg, errs = await newpage(b, 'manager', init="window.__pr={primary:'kitchen@example.com',backup:'',paper:'DL',on_new:true,verified:true,verified_note:'',last_test:null,test_mode:true,test_email:'test@example.com'};")
        oid = await pg.evaluate("(function(){var o=(window.__orders||[]).filter(function(x){return x.brief_version>0 && x.order_status==='confirmed'})[0]; return o? o.id+'|'+o.reference : ''})()")
        if oid:
            iid, ref = oid.split('|')
            await pg.evaluate(f"window.__slipRows[{iid!r}]={{version:1,email:'failed',confirmed_at:null}}")
            await js(pg, "(function(){document.querySelector('.ccs-nav [data-tab=orders]').click()})()", 300)
            await pg.fill('#ccs-q', ref); await pg.wait_for_timeout(300)
            await js(pg, f"(function(){{var b=[].slice.call(document.querySelectorAll('[data-act=open-order]')).filter(function(x){{return x.textContent.indexOf({ref!r})>-1}})[0]; if(b) b.click()}})()", 900)
            sh = await pg.inner_text('#ccs-sheet')
            check('order screen shows the failed kitchen email at the top', 'The kitchen email could not be delivered. The order is safely saved. Press Print kitchen slip' in sh, sh[:400])
            await click(pg, '#ccs-sheet [data-act="panel"][data-v="brief"]', 400)
            btn = await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=do-brief]'); return b? b.dataset.v+':'+b.textContent : ''})()")
            check('print button follows the paper setting (DL)', btn == 'DL:Make slip', btn)
            await click(pg, '#ccs-sheet [data-act="do-brief"]', 900)
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-sheet [data-act=brief-print]'); if(e) e.click()})()"); await pg.wait_for_timeout(700)
            pg_css = await pg.evaluate("(document.getElementById('ccs-page')||{}).textContent||''")
            check('DL prints on a 99 x 210 mm page', '99mm 210mm' in pg_css, pg_css)
            fit = await pg.evaluate("(function(){var e=document.getElementById('ccs-print'); return e? [e.style.width, e.dataset.scale] : null})()")
            check('the DL slip is fitted to one page', fit and fit[0].startswith('328') and float(fit[1]) <= 1, fit)
        else:
            check('test data has a confirmed order with a slip', False, 'none found')
        check('no script errors (order)', not errs, errs)
        await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
