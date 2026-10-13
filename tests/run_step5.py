"""CRM step 5 checks on the built staff app with invented data: customer report (choose parts, recorded before printing,
printed content), export log (exports and reports, own versus everyone), role permissions table, backup check, roles, phone layout."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsStep5"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
DESK = {'width': 1280, 'height': 900}; PHONE = {'width': 390, 'height': 844}
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager', extra=''):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__printed=0; window.print=function(){{window.__printed++}}; try{{localStorage.clear()}}catch(e){{}} {extra}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"(window.__calls||[]).filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")
async def main_text(pg): return await pg.inner_text('#ccs-main')
async def customers(pg):
    await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(500)
async def open_c1(pg):
    await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(800)

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg = await newpage(b, DESK, errs)
        await customers(pg)
        await pg.click('[data-act="ws-cm-tools"]'); await pg.wait_for_timeout(150); 
        check('Export log button in the customers toolbar', await pg.locator('[data-act="ws-cm-s5-log"]').count() == 1)
        await open_c1(pg)
        sh = await pg.inner_text('#ccs-sheet')
        check('Customer report button on the profile', 'Customer report' in sh)
        await pg.click('#ccs-sheet [data-act="ws-cm-s5-rep"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('report panel lists the parts and the privacy line', all(x in sh for x in ['Contact details and summary', 'Orders', 'Notes and follow-ups', 'Marketing permission', 'shred it', 'recorded with your name']), sh[:900])
        # none ticked is refused
        for cb in await pg.locator('[data-s5sec]').all(): await cb.uncheck()
        await pg.click('[data-act="ws-cm-s5-print"]'); await pg.wait_for_timeout(300)
        check('nothing ticked is refused', 'Tick at least one part' in await pg.inner_text('#ccs-sheet') and not await calls(pg, 'customer_report_logged'))
        await pg.check('[data-s5sec="contact"]'); await pg.check('[data-s5sec="orders"]'); await pg.check('[data-s5sec="consent"]')
        await pg.click('[data-act="ws-cm-s5-print"]'); await pg.wait_for_timeout(500)
        lg = await calls(pg, 'customer_report_logged')
        check('report recorded before printing, with the chosen parts', lg and lg[-1]['p_customer'] == 'c1' and lg[-1]['p_sections'] == ['contact', 'orders', 'consent'], lg)
        check('print fired once', await pg.evaluate('window.__printed') == 1)
        rep = await pg.inner_text('#ccs-print')
        check('printed report has name, number, who printed and the warning', all(x in rep for x in ['Corner Café customer report', 'Test Customer A', 'C-101', 'by Test Manager', 'Shred when finished']), rep[:600])
        check('printed report has contact, orders and permission parts only', 'Contact details' in rep and 'Orders (' in rep and 'Marketing permission' in rep and 'Notes, enquiries' not in rep, rep[:1500])
        check('sheet-order limitation stated on the report', 'do not include orders from the old Google Sheets' in rep)
        await pg.screenshot(path=str(OUT / 'desk-report-print.png'), full_page=True)
        await pg.evaluate("document.body.classList.remove('ccs-printing')")
        check('panel closes after printing', await pg.locator('.s5-rep').count() == 0)
        # failure path: refused by the database, nothing printed
        await pg.evaluate('window.__reportFail = true')
        await pg.click('#ccs-sheet [data-act="ws-cm-s5-rep"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="ws-cm-s5-print"]'); await pg.wait_for_timeout(400)
        check('refused report shows the reason and does not print', 'merged into another' in await pg.inner_text('#ccs-sheet') and await pg.evaluate('window.__printed') == 1)
        await pg.evaluate('window.__reportFail = false')
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)

        # export log
        await pg.click('[data-act="ws-cm-tools"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="ws-cm-s5-log"]'); await pg.wait_for_timeout(500)
        t = await main_text(pg)
        check('export log lists the printed report with who and parts', 'Export log' in t and 'Customer report: C-101 Test Customer A' in t and 'By Test Manager' in t and 'contact details and summary' in t, t[:900])
        check('manager sees everyone', 'by everyone' in t)
        check('records cannot be changed line', 'cannot be changed or removed' in t)
        await pg.screenshot(path=str(OUT / 'desk-log.png'), full_page=True)
        await pg.click('[data-act="ws-cm-list"]'); await pg.wait_for_timeout(500)
        check('back to customers', 'Tools' in await main_text(pg) and 'Filters' in await main_text(pg))

        # settings: role table and backup check
        await pg.click('.ccs-nav [data-tab="settings"]'); await pg.wait_for_timeout(800)
        t = await main_text(pg)
        check('settings shows role table and backup check', 'What each role can do' in t and 'Backup check' in t, t[-800:])
        check('backup check flags the unlinked sheet', 'Needs attention' in t)
        await pg.click('summary:has-text("What each role can do")'); await pg.wait_for_timeout(300)
        t = await main_text(pg)
        check('role table shows roles and Yes, Partly, No', all(x in t for x in ['Front of house', 'Kitchen', 'Finance', 'Marketing', 'Partly', 'Yes', 'No', 'Read from the database rules']), t[-1500:])
        await pg.click('summary:has-text("Backup check")'); await pg.wait_for_timeout(300)
        t = await main_text(pg)
        check('backup check explains each layer', all(x in t for x in ['Google Sheet copy of orders', 'Not linked', 'Full copies inside the database', 'backup_20261013', 'Host backups', 'Restore tests', 'passed']), t[-2000:])
        await pg.click('[data-act="ws-cm-s5-settings"][data-v="bc"]'); await pg.wait_for_timeout(500)
        check('check again reloads and keeps the section open', len(await calls(pg, 'backup_check')) >= 2 and await pg.locator('details[data-s5open="bc"][open]').count() == 1)
        await pg.screenshot(path=str(OUT / 'desk-settings.png'), full_page=True)
        await ctx.close()

        # marketing: own log only, no settings role table
        ctx, pg = await newpage(b, DESK, errs, 'marketing')
        await customers(pg)
        await pg.click('[data-act="ws-cm-tools"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="ws-cm-s5-log"]'); await pg.wait_for_timeout(500)
        t = await main_text(pg)
        check('marketing sees only their own log', 'Your own exports and printed reports' in t, t[:400])
        await ctx.close()
        # finance: report allowed without notes or permission parts
        ctx, pg = await newpage(b, DESK, errs, 'finance')
        await customers(pg); await open_c1(pg)
        await pg.click('#ccs-sheet [data-act="ws-cm-s5-rep"]'); await pg.wait_for_timeout(500)
        sh = await pg.inner_text('#ccs-sheet')
        check('finance report offers no marketing permission part', 'Marketing permission' not in sh.split('Print a customer report')[-1] and 'Orders' in sh, sh[-600:])
        await ctx.close()
        # kitchen: no customers at all (unchanged)
        ctx, pg = await newpage(b, DESK, errs, 'kitchen')
        check('kitchen has no customers or export log', await pg.locator('[data-act="ws-cm-s5-log"]').count() == 0 and await pg.locator('.ccs-nav [data-tab="customers"]').count() == 0)
        await ctx.close()

        # phone
        ctx, pg = await newpage(b, PHONE, errs)
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="customers"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-act="ws-cm-tools"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="ws-cm-s5-log"]'); await pg.wait_for_timeout(400)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check('phone export log fits the width', sw <= 392, sw)
        await pg.screenshot(path=str(OUT / 'phone-log.png'), full_page=True)
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="settings"]'); await pg.wait_for_timeout(700)
        await pg.click('summary:has-text("What each role can do")'); await pg.wait_for_timeout(300)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        check('phone role table scrolls inside its box, page does not widen', sw <= 392, sw)
        await pg.screenshot(path=str(OUT / 'phone-settings.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no script errors', not errs, errs[:3])
    print(f'{sum(R)}/{len(R)} passed')

asyncio.run(main())
