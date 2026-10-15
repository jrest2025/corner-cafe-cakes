"""Access levels and removing staff (Settings, admins) on the local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsAL"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def start(b, role, extra='', vp=None):
    vp = vp or {'width': 1280, 'height': 900}
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(800)
    return ctx, pg, errs

async def open_levels(pg):
    await open_sec(pg, 'Team and access')
    await pg.evaluate("(function(){var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk==='Team and access'})[0]; if(n) n.click();})()"); await pg.wait_for_timeout(300)
    await pg.evaluate("(function(){var b=document.querySelector('[data-act=\"tm-tab\"][data-v=\"levels\"]'); if(b) b.click();})()"); await pg.wait_for_timeout(300)

async def open_sec(pg, name):
    await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop().click()"); await pg.wait_for_timeout(700)
    await pg.evaluate(f"(function(){{var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){{return x.dataset.setk==={name!r}}})[0]; if(n) n.click(); document.querySelectorAll('.ccs-set details').forEach(function(d){{ if (d.querySelector('summary').textContent.indexOf({name!r}) === 0) d.open = true; }});}})()"); await pg.wait_for_timeout(300)

async def calls(pg, fn):
    return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await start(b, 'admin')
        await open_levels(pg)
        t = await pg.inner_text('#ccs-main')
        check('access levels section lists the three built-in levels with what they can do', all(x in t for x in ['Admin', 'Counter', 'Kitchen', 'Built in', 'Everything, including the team', 'Counter work', 'Kitchen board']), t[-900:])
        check('built-in levels cannot be changed or deleted', await pg.locator('[data-act="lv-edit"], [data-act="lv-del"]').count() == 0)
        await pg.click('[data-act="lv-add"]'); await pg.wait_for_timeout(250)
        check('add form shows five abilities to tick', await pg.locator('.ccs-lvtick input').count() == 5)
        await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(250)
        check('a level needs a name', 'Give the level a name.' in await pg.inner_text('#ccs-main'))
        await pg.fill('#lv-name', 'Supervisor'); await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(250)
        check('a level needs at least one ability', 'Tick at least one thing' in await pg.inner_text('#ccs-main'))
        await pg.check('#lv-g-front_of_house'); await pg.check('#lv-g-marketing')
        await pg.screenshot(path=str(OUT / 'add-level.png'), full_page=True)
        await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'admin_level_save')
        check('level saved with name and the two abilities', c and c[-1]['p_id'] is None and c[-1]['p_name'] == 'Supervisor' and sorted(c[-1]['p_grants']) == ['front_of_house', 'marketing'], c)
        t = await pg.inner_text('#ccs-main')
        check('new level listed with its abilities and Change', 'Supervisor' in t and 'Counter work, Customers and marketing' in t and await pg.locator('[data-act="lv-edit"]').count() == 1, t[-900:])
        await pg.click('[data-act="lv-add"]'); await pg.wait_for_timeout(200)
        await pg.fill('#lv-name', 'supervisor'); await pg.check('#lv-g-kitchen'); await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(400)
        check('duplicate level name refused', 'already exists' in await pg.inner_text('#ccs-main'))
        await pg.click('[data-act="lv-cancel"]'); await pg.wait_for_timeout(200)
        # the new level is offered in Team and access; give it to the unassigned login
        await open_sec(pg, 'Team and access')
        check('team is one compact row per person, with email under the name', await pg.locator('.tm-table .tm-tr:not(.tm-th)').count() == 2 and 'fresh@example.com' in await pg.inner_text('.tm-table'))
        await pg.click('[data-act="tm-edit"][data-id="u2"]'); await pg.wait_for_timeout(400)
        opts = await pg.evaluate("[].slice.call(document.querySelector('#tmf-l').options).map(function(o){return o.text})")
        check('edit panel offers the new level', opts == ['Admin', 'Counter', 'Kitchen', 'Supervisor'], opts)
        sid = await pg.evaluate("[].slice.call(document.querySelector('#tmf-l').options).filter(function(o){return o.text==='Supervisor'})[0].value")
        await pg.fill('#tmf-n', 'Ana Supervisor'); await pg.select_option('#tmf-l', sid); await pg.wait_for_timeout(200); await pg.check('#tmf-a')
        await pg.click('#tm-form button[type=submit]'); await pg.wait_for_timeout(700)
        c = await calls(pg, 'admin_set_staff_level')
        check('person saved on the new level', c and c[-1]['p_user'] == 'u2' and c[-1]['p_level'] == sid and c[-1]['p_active'] is True, c)
        await open_levels(pg)
        t = await pg.inner_text('#ccs-main')
        check('a level in use cannot be deleted, with the reason', 'To delete it, first move the 1 person on it to another level.' in t and await pg.locator('[data-act="lv-del"]').count() == 0, t[-700:])
        # change the level
        await pg.click('[data-act="lv-edit"]'); await pg.wait_for_timeout(200)
        check('change form keeps the current ticks', await pg.is_checked('#lv-g-front_of_house') and await pg.is_checked('#lv-g-marketing') and not await pg.is_checked('#lv-g-manager'))
        await pg.fill('#lv-name', 'Senior counter'); await pg.uncheck('#lv-g-marketing'); await pg.check('#lv-g-finance'); await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(600)
        c = await calls(pg, 'admin_level_save')
        check('changed level saved against the same level', c[-1]['p_id'] == sid and c[-1]['p_name'] == 'Senior counter' and sorted(c[-1]['p_grants']) == ['finance', 'front_of_house'], c[-1])
        # an unused level can be deleted after a confirmation
        await pg.click('[data-act="lv-add"]'); await pg.wait_for_timeout(200)
        await pg.fill('#lv-name', 'Weekend helper'); await pg.check('#lv-g-kitchen'); await pg.click('[data-act="lv-save"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-act="lv-del"]'); await pg.wait_for_timeout(250)
        check('delete asks first', 'Delete the level Weekend helper?' in await pg.inner_text('#ccs-main') and len(await calls(pg, 'admin_level_delete')) == 0)
        await pg.screenshot(path=str(OUT / 'delete-level.png'), full_page=True)
        await pg.click('[data-act="lv-del-yes"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        check('unused level deleted', len(await calls(pg, 'admin_level_delete')) == 1 and 'Weekend helper' not in t, t[-500:])
        # permissions table has a column per level
        await open_sec(pg, 'Team and access')
        await pg.evaluate("(function(){var b=document.querySelector('[data-act=\"tm-tab\"][data-v=\"perms\"]'); if(b) b.click();})()"); await pg.wait_for_timeout(800)
        heads = await pg.evaluate("[].slice.call(document.querySelectorAll('.pm-mx thead th span')).map(function(x){return x.textContent.trim()})")
        check('what each level can do is in Team and access: Permissions lists every level', all(x in heads for x in ['Counter', 'Kitchen', 'Admin']) and await pg.locator('.s5-perm').count() == 0, heads)
        # remove someone from the team
        await open_sec(pg, 'Team and access')
        check('no More menu (remove) on your own login', await pg.locator('[data-act="tm-menu"][data-id="u1"]').count() == 0)
        await pg.click('[data-act="tm-menu"][data-id="u2"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="tm-rm"][data-id="u2"]'); await pg.wait_for_timeout(250)
        t = await pg.inner_text('#ccs-main')
        check('remove asks first and explains', 'Remove Ana Supervisor from the team?' in t and 'login stops working' in t and len([x for x in await calls(pg, 'staff-admin') if x and x.get('op') == 'remove']) == 0, t[-600:])
        await pg.screenshot(path=str(OUT / 'remove.png'), full_page=True)
        await pg.click('[data-act="tm-ask-no"]'); await pg.wait_for_timeout(200)
        check('Cancel closes the question', await pg.locator('[data-act="tm-ask-yes"]').count() == 0)
        await pg.click('[data-act="tm-menu"][data-id="u2"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="tm-rm"][data-id="u2"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="tm-ask-yes"]'); await pg.wait_for_timeout(700)
        fc = await pg.evaluate("window.__calls.filter(function(c){return c[0]==='fn' && c[1]==='staff-admin'}).map(function(c){return c[2]})")
        t = await pg.inner_text('#ccs-main')
        check('removed: remove sent for that person and they leave the list', fc and fc[-1] == {'op': 'remove', 'user_id': 'u2'} and 'fresh@example.com' not in t, fc)
        check('no page errors (admin)', not errs, errs); await ctx.close()

        # someone on a custom level sees exactly what was ticked
        ctx, pg, errs = await start(b, 'front_of_house', "window.__grants=['front_of_house','marketing']; window.__levelName='Supervisor';")
        tabs = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-nav [data-tab]')).map(function(x){return x.dataset.tab})")
        check('custom level: counter screens plus Dashboard and Customers, no Settings or Register', {'today', 'orders', 'calendar', 'kitchen', 'dash', 'customers'} <= set(tabs) and 'settings' not in tabs and 'register' not in tabs, tabs)
        await pg.evaluate("window.__ccsOpenMore ? window.__ccsOpenMore() : document.querySelector('.ccs-nav [data-tab=more]').click()"); await pg.wait_for_timeout(400)
        check('More shows the level name', 'Supervisor' in await pg.inner_text('body'))
        check('no page errors (custom level)', not errs, errs); await ctx.close()

        # phone: the add form fits and ticks are easy to tap
        ctx, pg, errs = await start(b, 'admin', '', {'width': 390, 'height': 844})
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300); await pg.click('#ccs-sheet [data-tab="settings"]'); await pg.wait_for_timeout(700)
        await open_levels(pg)
        await pg.click('[data-act="lv-add"]'); await pg.wait_for_timeout(250)
        hs = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-lvtick')).map(function(x){return Math.round(x.getBoundingClientRect().height)})")
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('phone: ticks at least 48 px high and no sideways scrolling', hs and min(hs) >= 48 and sw <= 390, [hs, sw])
        await pg.screenshot(path=str(OUT / 'phone-add.png'), full_page=True)
        check('no page errors (phone)', not errs, errs); await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
