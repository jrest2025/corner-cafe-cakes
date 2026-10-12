"""Phase B checks: each finding from the usability audit, tested on the local copy with invented data."""
import asyncio, pathlib, datetime
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
OUT = HERE / "shotsB"; OUT.mkdir(exist_ok=True)
TAB = dict(viewport={"width": 1180, "height": 820}, has_touch=True, is_mobile=True)
PHONE = dict(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
R = {}
def check(name, ok, detail=''):
    R[name] = bool(ok); print(('PASS ' if ok else 'FAIL ') + name + (' -> ' + str(detail) if detail != '' else ''))
SMALL = r"""(sel) => { const sc = document.querySelector(sel) || document; const out = [];
  for (const e of sc.querySelectorAll('button, a[href], input:not([type=checkbox]), select, textarea, label.ccs-check')) {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    if (!r.width || !r.height || s.display === 'none' || s.visibility === 'hidden') continue;
    if (r.height < 44) out.push((e.className || e.tagName) + ':' + (e.innerText || '').trim().slice(0, 25) + ':' + Math.round(r.height)); }
  return out; }"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        async def page(role='manager', dev=TAB):
            ctx = await b.new_context(**dev); pg = await ctx.new_page()
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.add_init_script(f"window.__role='{role}'")
            await pg.goto((HERE / "staff-test.html").as_uri()); await pg.wait_for_timeout(450)
            return ctx, pg
        is_open = "document.getElementById('ccs-sheet').classList.contains('ccs-open')"

        # ---------- U4 back gesture ----------
        ctx, pg = await page()
        await pg.click('[data-tab="orders"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="filter"][data-v="upcoming"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="open-order"][data-id="o4"]'); await pg.wait_for_timeout(400)
        await pg.go_back(); await pg.wait_for_timeout(300)
        check('U4 back closes the open order and stays in the app', not await pg.evaluate(is_open) and 'staff-test.html' in pg.url and await pg.evaluate("!!document.querySelector('.ccs-app')"))
        await pg.click('[data-act="open-order"][data-id="o4"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act="panel"][data-v="brief"]'); await pg.wait_for_timeout(150)
        await pg.go_back(); await pg.wait_for_timeout(300)
        check('U4 first back closes the panel only', await pg.evaluate(is_open) and not await pg.evaluate("!!document.querySelector('[data-act=do-brief]')"))
        await pg.go_back(); await pg.wait_for_timeout(300)
        check('U4 second back closes the order', not await pg.evaluate(is_open))
        await pg.click('[data-act="open-order"][data-id="o4"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act="panel"][data-v="note"]'); await pg.fill('#ccs-note', 'Keep me')
        await pg.go_back(); await pg.wait_for_timeout(300)
        check('U4 back keeps typed work', await pg.evaluate(is_open) and await pg.eval_on_selector('#ccs-note', 'e=>e.value') == 'Keep me')
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(300)
        check('U4 cross with typing warns first', await pg.evaluate(is_open))
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(300)
        check('U4 second tap on the cross discards and closes', not await pg.evaluate(is_open))
        await pg.go_back(); await pg.wait_for_timeout(400)
        check('U4 back from Orders returns to Today', await pg.evaluate("document.querySelector('.ccs-nav-item[aria-current]').dataset.tab") == 'today')
        # U14 label
        check('U14 tab reads New order', 'New order' in await pg.inner_text('.ccs-nav'))
        await ctx.close()

        # ---------- U7, U8 kitchen ----------
        ctx, pg = await page('kitchen')
        btn = await pg.evaluate("(()=>{const b=document.querySelector('[data-act=k-next][data-id=o1]');return b?b.textContent:null})()")
        check('U7 card shows its next step', btn == 'Move to Cooling and assembly', btn)
        check('U7 quality-check card opens the check', await pg.evaluate("!!document.querySelector('.ccs-knext[data-act=open-kitchen][data-id=o3]')"))
        check('U7 ready card has no stage button', not await pg.evaluate("!!document.querySelector('.ccs-knext[data-id=o4]')"))
        await pg.screenshot(path=str(OUT / 'u7-board.png'))
        await pg.click('[data-act="k-next"][data-id="o1"]'); await pg.wait_for_timeout(300)
        call = await pg.evaluate("window.__calls.filter(c=>c[1]==='kitchen_set_stage').pop()")
        check('U7 one tap moves the stage', call and call[2]['p_order'] == 'o1' and call[2]['p_stage'] == 'assembling' and not await pg.evaluate(is_open), call and call[2])
        await pg.click('[data-act="open-kitchen"][data-id="o3"]'); await pg.wait_for_timeout(300)
        chips = await pg.eval_on_selector_all('.ccs-namechips [data-f="k-qc"]', 'els=>els.map(e=>e.textContent)')
        check('U8 recent names offered for the check', 'Baker One' in chips and 'Baker Two' in chips, chips)
        await pg.click('[data-f="k-qc"][data-v="Baker Two"]'); await pg.wait_for_timeout(100)
        check('U8 tap fills the name', await pg.eval_on_selector('#k-qc', 'e=>e.value') == 'Baker Two')
        await pg.screenshot(path=str(OUT / 'u8-names.png'))
        await pg.click('[data-act="k-ready"]'); await pg.wait_for_timeout(300)
        call = await pg.evaluate("window.__calls.filter(c=>c[1]==='kitchen_set_stage').pop()")
        check('U8 chosen name is sent', call[2]['p_name'] == 'Baker Two')
        check('U8 name remembered on this device', 'Baker Two' in (await pg.evaluate("localStorage.getItem('ccs-names')") or ''))
        # U16 slim header
        nav = await pg.evaluate("getComputedStyle(document.querySelector('.ccs-nav')).display")
        so = await pg.evaluate("(()=>{const r=document.querySelector('.ccs-signout').getBoundingClientRect();return [Math.round(r.height), Math.round(r.top)]})()")
        mw = await pg.evaluate("document.getElementById('ccs-main').getBoundingClientRect().width")
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(OUT / 'u16-kitchen-tablet.png'))
        check('U16 kitchen has no side menu and a full-width board', nav == 'none' and mw > 1100, (nav, mw))
        check('U16 sign out reachable in the header', so[0] >= 44 and so[1] < 80, so)
        await ctx.close()

        # ---------- U17, U19, U23 order screen ----------
        ctx, pg = await page()
        await pg.click('[data-tab="orders"]'); await pg.click('[data-act="filter"][data-v="upcoming"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="open-order"][data-id="o3"]'); await pg.wait_for_timeout(400)
        lab = await pg.evaluate("(()=>{const b=document.querySelector('[data-act=panel][data-v=collected]');return [b.textContent,b.disabled,getComputedStyle(b).backgroundColor]})()")
        check('U19 locked button says why and looks locked', lab[0] == 'Mark delivered after payment' and lab[1] and lab[2] == 'rgb(238, 242, 246)', lab)
        small = await pg.evaluate(SMALL, '#ccs-sheet')
        check('U17 no control under 44 pixels on the order screen', not small, small)
        gap = await pg.evaluate("(()=>{const a=document.querySelector('[data-v=note]').getBoundingClientRect(),c=document.querySelector('[data-v=cancel]').getBoundingClientRect();return Math.round(c.left-a.right)})()")
        check('U17 Cancel order is well apart from Add note', gap > 60, gap)
        await pg.screenshot(path=str(OUT / 'u19-locked.png'))
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="open-order"][data-id="o4"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act="panel"][data-v="collected"]'); await pg.wait_for_timeout(150)
        chip = await pg.evaluate("(()=>{const c=document.querySelector('[data-act=fill][data-f=ccs-note]');return c?c.textContent:null})()")
        check('U23 customer name offered at handover', chip == 'Test Customer B (the customer)', chip)
        await pg.click('[data-act="fill"][data-f="ccs-note"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(OUT / 'u23-handover.png'))
        await pg.click('[data-act="do-collected"]'); await pg.wait_for_timeout(300)
        c = await pg.evaluate("window.__calls.filter(c=>c[1]==='staff_order_action').pop()")
        check('U23 one tap records the receiver', c[2]['p_note'] == 'Test Customer B', c[2]['p_note'])
        h3 = await pg.evaluate("getComputedStyle(document.querySelector('#ccs-sheet .ccs-box h3')).fontSize")
        check('U25 section headings are 13 pixels', h3 == '13px', h3)
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(250)
        # U21 date chips and U17 walk-in
        await pg.click('[data-tab="new"]'); await pg.fill('#n-phone', '912 0001'); await pg.wait_for_timeout(500); await pg.click('[data-act="n-pick"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="n-prod"][data-v="cheesecake"]'); await pg.click('[data-act="n-size"] >> nth=0'); await pg.click('[data-act="n-next"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="n-finish"][data-v="standard"]'); await pg.click('[data-act="n-diet"][data-v="no"]'); await pg.click('[data-act="n-finish-next"]'); await pg.wait_for_timeout(250)
        n = await pg.eval_on_selector_all('[data-act="n-date"]', 'els=>els.map(e=>e.dataset.v)')
        earliest = (datetime.datetime.utcnow() + datetime.timedelta(hours=12, days=2)).strftime('%Y-%m-%d')
        check('U21 ten date chips from the earliest allowed day', len(n) == 10 and n[0] == earliest, (len(n), n[:2], earliest))
        check('U21 calendar hidden until Other date', not await pg.evaluate("!!document.getElementById('n-date')"))
        await pg.screenshot(path=str(OUT / 'u21-dates.png'))
        await pg.click('[data-act="n-date"] >> nth=0'); await pg.wait_for_timeout(200)
        check('U21 one tap picks the date and shows times', await pg.evaluate("document.querySelectorAll('[data-act=n-time]').length") > 5)
        await pg.click('[data-act="n-time"] >> nth=3'); await pg.wait_for_timeout(250)
        small = await pg.evaluate(SMALL, '#ccs-main')
        check('U17 no control under 44 pixels on the payment step', not small, small)
        await pg.click('[data-act="n-submit"]'); await pg.wait_for_timeout(400)
        cp = await pg.evaluate("window.__calls.filter(c=>c[1]==='staff_create_order').pop()")
        check('U21 order saved with the chosen date', cp and cp[2]['p']['date'] == earliest, cp and cp[2]['p']['date'])
        # settings tick boxes
        await pg.click('[data-tab="settings"]'); await pg.wait_for_timeout(400)
        small = [x for x in await pg.evaluate(SMALL, '#ccs-main')]
        check('U17 Settings tick boxes are at least 44 pixels', not [x for x in small if 'ccs-check' in x], small)
        await ctx.close()

        # ---------- U15, U20 phone ----------
        ctx, pg = await page(dev=PHONE)
        vis = await pg.evaluate("[...document.querySelectorAll('.ccs-nav-item')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.querySelector('span').innerText.trim())")
        check('U15 five tabs on a phone', vis == ['Today', 'Orders', 'Calendar', 'New order', 'More'], vis)
        check('U15 sign out not beside the content', await pg.evaluate("getComputedStyle(document.querySelector('.ccs-signout')).display") == 'none')
        await pg.screenshot(path=str(OUT / 'u15-phone-today.png'))
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        t = await pg.inner_text('#ccs-sheet')
        check('U15 More holds Customers, Settings and Sign out', 'Customers' in t and 'Settings' in t and 'Sign out' in t)
        await pg.screenshot(path=str(OUT / 'u15-more.png'))
        await pg.click('#ccs-sheet [data-tab="customers"]'); await pg.wait_for_timeout(450)
        seg = await pg.evaluate("[getComputedStyle(document.getElementById('ccs-seg')).display, document.querySelectorAll('[data-act=seg]').length ? 'chips' : 'none']")
        top = await pg.evaluate("document.querySelector('.ccs-table tr.ccs-click').getBoundingClientRect().top + scrollY")
        sw = await pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        check('U20 one Show selector instead of 10 chips', seg[0] != 'none' and seg[1] == 'none', seg)
        check('U20 first customer much higher and no sideways scroll', top < 700 and sw, (round(top), sw))
        await pg.screenshot(path=str(OUT / 'u20-customers-phone.png'), full_page=True)
        await pg.select_option('#ccs-seg', 'seg_repeat'); await pg.wait_for_timeout(300)
        check('U20 selector filters', await pg.evaluate("document.getElementById('ccs-seg').value") == 'seg_repeat')
        # sign out with an unfinished order asks first
        await pg.click('.ccs-nav [data-tab="new"]'); await pg.fill('#n-phone', '912 0001'); await pg.wait_for_timeout(500); await pg.click('[data-act="n-pick"]'); await pg.wait_for_timeout(200)
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(250)
        await pg.click('#ccs-sheet [data-act="signout"]'); await pg.wait_for_timeout(250)
        t = await pg.inner_text('#ccs-sheet')
        check('U15 sign out warns about the unfinished order', 'unfinished order for Test Customer A' in t and 'Sign out anyway' in t)
        await pg.screenshot(path=str(OUT / 'u15-signout-check.png'))
        await pg.click('#ccs-sheet [data-tab="new"]'); await pg.wait_for_timeout(300)
        check('U15 Finish the order keeps it', 'Test Customer A' in await pg.inner_text('#ccs-main') and await pg.evaluate("!!localStorage.getItem('ccs-draft-u1')"))
        await ctx.close()
        # small phone sideways scroll on all main screens
        ctx, pg = await page(dev=dict(viewport={"width": 360, "height": 740}, has_touch=True, is_mobile=True))
        ok = True
        for t in ['today', 'orders', 'calendar', 'new']:
            await pg.click(f'.ccs-nav [data-tab="{t}"]'); await pg.wait_for_timeout(300)
            ok = ok and await pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        check('Small phone: no sideways scroll on any tab', ok)
        await ctx.close()
        await b.close()
        check('No script errors', not errs, errs)
    print('FAILED:', [k for k, v in R.items() if not v])
asyncio.run(main())
