"""Team and password checks on the local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsT"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "staff-test.html"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='admin', must=False, same=False):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; window.__mustChange={'true' if must else 'false'}; window.__pwSame={'true' if same else 'false'}; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(450)
    return ctx, pg

async def calls(pg, kind):
    return await pg.evaluate(f"window.__calls.filter(function(c){{return c[0]==='{kind}' && (c[0]!=='fn' || c[1]==='staff-admin')}}).map(function(c){{return c[2]}})")

async def open_team(pg, phone=False):
    if phone:
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="settings"]')
    else:
        await pg.click('.ccs-nav [data-tab="settings"]')
    await pg.wait_for_timeout(400)
    await pg.evaluate("(function(){var n=[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk==='Team and access'})[0]; if(n) n.click(); document.querySelectorAll('.ccs-set details').forEach(function(d){ if (d.querySelector('summary').textContent.indexOf('Team and access') === 0) d.open = true; });})()"); await pg.wait_for_timeout(300)

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. first sign-in asks for own password
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='front_of_house', must=True)
        check('first sign-in shows choose-password screen', await pg.locator('#ccs-pw').count() == 1 and await pg.locator('.ccs-nav').count() == 0)
        await pg.screenshot(path=str(OUT / 'pw-first.png'))
        await pg.fill('#ccs-pw1', 'short'); await pg.fill('#ccs-pw2', 'short'); await pg.click('#ccs-pw button[type=submit]'); await pg.wait_for_timeout(200)
        check('short password refused', 'at least 10' in (await pg.inner_text('#ccs-pw')))
        await pg.fill('#ccs-pw1', 'cake-counter-2026'); await pg.fill('#ccs-pw2', 'cake-counter-2027'); await pg.click('#ccs-pw button[type=submit]'); await pg.wait_for_timeout(200)
        check('mismatch refused', 'do not match' in (await pg.inner_text('#ccs-pw')))
        await pg.fill('#ccs-pw1', 'cake-counter-2026'); await pg.fill('#ccs-pw2', 'cake-counter-2026'); await pg.click('#ccs-pw button[type=submit]'); await pg.wait_for_timeout(600)
        up = await calls(pg, 'auth')
        check('password saved with flag cleared', len(up) == 1 and up[0]['password'] == 'cake-counter-2026' and up[0]['data']['must_change_password'] is False, up)
        check('app opens after saving', await pg.locator('.ccs-nav').count() == 1)
        await ctx.close()

        # 2. same password as temporary one: friendly message
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, must=True, same=True)
        await pg.fill('#ccs-pw1', 'temp-pass-123'); await pg.fill('#ccs-pw2', 'temp-pass-123'); await pg.click('#ccs-pw button[type=submit]'); await pg.wait_for_timeout(300)
        check('same-as-temporary message', 'different from the temporary' in (await pg.inner_text('#ccs-pw')))
        await ctx.close()

        # 3. no flag: straight into the app
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='manager')
        check('normal sign-in skips password screen', await pg.locator('#ccs-pw').count() == 0 and await pg.locator('.ccs-nav').count() == 1)
        # manager sees settings but no team section
        await pg.click('.ccs-nav [data-tab="settings"]'); await pg.wait_for_timeout(400)
        check('manager has no team section', 'Team and access' not in (await pg.inner_text('#ccs-main')))
        # change my password from More
        await pg.evaluate("document.querySelector('.ccs-nav [data-tab=\"more\"]') && document.querySelector('.ccs-nav [data-tab=\"more\"]').click()"); await pg.wait_for_timeout(300)
        if not await pg.locator('#ccs-sheet [data-act="my-password"]').count():
            await pg.evaluate("window.__ccsOpenMore && window.__ccsOpenMore()")
        await ctx.close()

        # 4. admin: add a staff member
        ctx, pg = await newpage(b, {'width': 1280, 'height': 900}, errs, role='admin')
        await open_team(pg)
        main = await pg.inner_text('#ccs-main')
        check('team section has add form', 'Add a staff member' in main and await pg.locator('#tm-new-n').count() == 1)
        check('login without role is flagged', 'No role yet' in main)
        check('unassigned login defaults to front of house, not admin', await pg.input_value('#tm-r-u2') == 'lv-counter')
        await pg.click('[data-act="tm-add"]'); await pg.wait_for_timeout(250)
        check('empty add refused with name message', "Enter the staff member's name." in (await pg.inner_text('#ccs-main')))
        await pg.fill('#tm-new-n', 'Mere Tuilagi'); await pg.fill('#tm-new-e', 'not-an-email'); await pg.click('[data-act="tm-add"]'); await pg.wait_for_timeout(250)
        check('bad email refused, name kept', 'Check the email address.' in (await pg.inner_text('#ccs-main')) and await pg.input_value('#tm-new-n') == 'Mere Tuilagi')
        await pg.fill('#tm-new-e', 'mere@example.com'); await pg.click('[data-act="tm-gen"]'); await pg.wait_for_timeout(100)
        gen = await pg.input_value('#tm-new-p')
        check('make-one gives a 14-character password', len(gen) == 14 and gen.count('-') == 2, gen)
        await pg.select_option('#tm-new-r', 'lv-counter')
        await pg.screenshot(path=str(OUT / 'team-form.png'), full_page=True)
        await pg.click('[data-act="tm-add"]'); await pg.wait_for_timeout(500)
        fc = await calls(pg, 'fn')
        check('create sent once with the right fields', len(fc) == 1 and fc[0]['op'] == 'create' and fc[0]['email'] == 'mere@example.com' and fc[0].get('level_id') == 'lv-counter' and fc[0]['password'] == gen, fc)
        main = await pg.inner_text('#ccs-main')
        check('success note and new member listed', 'Mere Tuilagi can now sign in' in main and 'mere@example.com' in main, main[-600:])
        check('form cleared after success', await pg.input_value('#tm-new-n') == '')
        await pg.screenshot(path=str(OUT / 'team-added.png'), full_page=True)
        # duplicate email
        await pg.fill('#tm-new-n', 'Someone'); await pg.fill('#tm-new-e', 'taken@example.com'); await pg.fill('#tm-new-p', 'abcd-efgh-jkmn'); await pg.click('[data-act="tm-add"]'); await pg.wait_for_timeout(400)
        check('duplicate email message shown', 'already exists' in (await pg.inner_text('#ccs-main')))
        # reset someone else's password; not offered on own row
        own = await pg.locator('[data-act="tm-reset"][data-id="u1"]').count()
        check('no reset link on own login', own == 0)
        await pg.click('[data-act="tm-reset"][data-id="u2"]'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="tm-reset-save"][data-id="u2"]'); await pg.wait_for_timeout(250)
        check('reset needs 10 characters', 'at least 10' in (await pg.inner_text('#ccs-main')))
        await pg.click('[data-act="tm-gen"][data-for="tm-rp-u2"]'); await pg.click('[data-act="tm-reset-save"][data-id="u2"]'); await pg.wait_for_timeout(400)
        fc = await calls(pg, 'fn')
        check('reset sent for the right login', fc[-1]['op'] == 'reset' and fc[-1]['user_id'] == 'u2' and len(fc[-1]['password']) == 14, fc[-1])
        check('reset panel closes', await pg.locator('#tm-rp-u2').count() == 0)
        await ctx.close()

        # 5. phone: change my password from More
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs, role='front_of_house')
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(350)
        check('More has Change my password', await pg.locator('#ccs-sheet [data-act="my-password"]').count() == 1)
        await pg.click('#ccs-sheet [data-act="my-password"]'); await pg.wait_for_timeout(300)
        check('password form opens in the sheet', await pg.locator('#ccs-sheet #ccs-pw1').count() == 1)
        await pg.fill('#ccs-pw1', 'abc'); await pg.fill('#ccs-pw2', 'abc'); await pg.click('#ccs-sheet button[type=submit]'); await pg.wait_for_timeout(250)
        check('sheet shows the length message', 'at least 10' in (await pg.inner_text('#ccs-sheet')))
        await pg.screenshot(path=str(OUT / 'pw-sheet-phone.png'))
        await pg.fill('#ccs-pw1', 'my-own-pass-99'); await pg.fill('#ccs-pw2', 'my-own-pass-99'); await pg.click('#ccs-sheet button[type=submit]'); await pg.wait_for_timeout(500)
        cls = await pg.evaluate("document.getElementById('ccs-sheet').className")
        check('sheet closes after saving', 'ccs-open' not in cls, cls)
        await ctx.close()

        # 6. phone: admin team form fits
        ctx, pg = await newpage(b, {'width': 360, 'height': 780}, errs, role='admin')
        await open_team(pg, phone=True)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('no sideways scroll on a small phone', sw <= 360, sw)
        await pg.locator('.ccs-tmadd').screenshot(path=str(OUT / 'team-phone.png'))
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
