"""Team and access, step 2: compact team table, add and edit in a panel, set-up links by email, the permissions table,
levels once every switch is live, and the kitchen-only workspace decided by switches. Local copy with invented data."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
OUT = HERE / "shotsTeam2"; OUT.mkdir(exist_ok=True)
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))
V2_ADMIN = "window.__permv=2;"
async def start(b, role, extra='', vp=None, query=''):
    vp = vp or {'width': 1280, 'height': 900}
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; {extra} try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri() + query); await pg.wait_for_timeout(900)
    return ctx, pg, errs
async def team(pg):
    await pg.evaluate("[].slice.call(document.querySelectorAll('[data-tab=settings]')).pop().click()"); await pg.wait_for_timeout(700)
    await pg.evaluate("[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk]'),function(x){return x.dataset.setk==='Team and access'})[0].click()"); await pg.wait_for_timeout(400)
async def fncalls(pg): return await pg.evaluate("window.__calls.filter(function(c){return c[0]==='fn' && c[1]==='staff-admin'}).map(function(c){return c[2]})")
async def rpc(pg, fn): return await pg.evaluate(f"window.__calls.filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg, errs = await start(b, 'admin', "window.__teamRows=[{user_id:'u1',email:'admin@example.com',full_name:'Test Manager',role:'admin',active:true,level_id:'lv-admin',last_sign_in_at:new Date().toISOString()},{user_id:'u2',email:'chef@example.com',full_name:'Chef Ana',role:'kitchen',active:true,level_id:'lv-kitchen',last_sign_in_at:new Date(Date.now()-3*864e5).toISOString()},{user_id:'u3',email:'old@example.com',full_name:'Old Counter',role:'front_of_house',active:false,level_id:'lv-counter',last_sign_in_at:null}];")
        await team(pg)
        t = await pg.inner_text('#ccs-main')
        check('team table: one row per person, headings, Add staff button', await pg.locator('.tm-tr:not(.tm-th)').count() == 3 and all(x in t for x in ['Staff member', 'Level', 'Access', 'Last active', 'Add staff']), t[-500:])
        check('no add form open until asked', await pg.locator('#tmf-n').count() == 0 and await pg.locator('#tm-new-n').count() == 0)
        check('last active in plain words', 'Today, ' in t and '3 days ago' in t and 'Not signed in yet' in t, t[-500:])
        await pg.screenshot(path=str(OUT / 'team-desk.png'), full_page=True)
        # search, filter, sort
        await pg.fill('#tm-q', 'chef'); await pg.wait_for_timeout(300)
        check('search by name or email', await pg.locator('.tm-tr:not(.tm-th)').count() == 1 and await pg.evaluate("document.activeElement.id") == 'tm-q')
        await pg.fill('#tm-q', ''); await pg.select_option('#tm-fst', 'off'); await pg.wait_for_timeout(300)
        check('filter by access off', await pg.locator('.tm-tr:not(.tm-th)').count() == 1 and 'Old Counter' in await pg.inner_text('.tm-table'))
        await pg.select_option('#tm-fst', 'all'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="tm-sort"][data-v="seen"]'); await pg.wait_for_timeout(200)
        names = await pg.evaluate("[].slice.call(document.querySelectorAll('.tm-tr:not(.tm-th) .tm-who b')).map(function(x){return x.firstChild.textContent.trim()})")
        check('sort by last active, newest first', names[0] == 'Test Manager' and names[-1] == 'Old Counter', names)
        # access switch: off asks, on is immediate; never your own
        check('cannot switch off your own access', await pg.locator('[data-act="tm-acc"][data-id="u1"][disabled]').count() == 1)
        await pg.click('[data-act="tm-acc"][data-id="u2"]'); await pg.wait_for_timeout(250)
        check('switching off asks first', 'Switch off access for Chef Ana?' in await pg.inner_text('#ccs-main') and len(await rpc(pg, 'admin_set_staff_level')) == 0)
        await pg.click('[data-act="tm-ask-yes"]'); await pg.wait_for_timeout(700)
        c = await rpc(pg, 'admin_set_staff_level')
        check('switched off through the server', c and c[-1]['p_user'] == 'u2' and c[-1]['p_active'] is False, c[-1:])
        await pg.click('[data-act="tm-acc"][data-id="u3"]'); await pg.wait_for_timeout(700)
        c = await rpc(pg, 'admin_set_staff_level')
        check('switching on saves straight away', c and c[-1]['p_user'] == 'u3' and c[-1]['p_active'] is True, c[-1:])
        # send a link from More
        await pg.click('[data-act="tm-menu"][data-id="u3"]'); await pg.wait_for_timeout(200)
        mi = await pg.inner_text('.tm-menu')
        check('More menu: link and remove', 'Email the set-up link again' in mi and 'Remove from team' in mi, mi)
        await pg.click('[data-act="tm-link"][data-id="u3"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="tm-ask-yes"]'); await pg.wait_for_timeout(600)
        fc = await fncalls(pg)
        check('link sent through staff-admin, no password typed', fc and fc[-1] == {'op': 'send_link', 'user_id': 'u3'}, fc[-1:])
        # add staff in a panel, with an invite
        await pg.click('[data-act="tm-new"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('Add staff opens a side panel, no temporary password', 'Add staff' in sh and 'link to choose their own password' in sh and await pg.locator('#ccs-sheet input[id*="p"]:not(#tmf-n)').count() <= 1 and 'Temporary password' not in sh, sh[:300])
        await pg.click('#tm-form button[type=submit]'); await pg.wait_for_timeout(300)
        check('panel checks the name first', 'Enter their name.' in await pg.inner_text('#ccs-sheet'))
        await pg.fill('#tmf-n', 'Mere Tavola'); await pg.fill('#tmf-e', 'mere@example.com'); await pg.click('#tm-form button[type=submit]'); await pg.wait_for_timeout(800)
        fc = await fncalls(pg)
        check('invite sent with name, email and level', fc and fc[-1]['op'] == 'invite' and fc[-1]['email'] == 'mere@example.com' and fc[-1]['level_id'], fc[-1:])
        t = await pg.inner_text('#ccs-main')
        check('panel closes and the team says the link went', await pg.locator('#ccs-sheet.ccs-open').count() == 0 and 'We emailed mere@example.com a link' in t and 'Mere Tavola' in t, t[-600:])
        await pg.click('[data-act="tm-new"]'); await pg.wait_for_timeout(300)
        await pg.fill('#tmf-n', 'No Mail'); await pg.fill('#tmf-e', 'nomail@example.com'); await pg.click('#tm-form button[type=submit]'); await pg.wait_for_timeout(800)
        check('if the email fails, it says so and how to resend', 'the email did not go' in await pg.inner_text('#ccs-main'))
        # edit panel
        await pg.click('[data-act="tm-edit"][data-id="u2"]'); await pg.wait_for_timeout(400)
        sh = await pg.inner_text('#ccs-sheet')
        check('edit panel: name, level, access, password link, remove', all(x in sh for x in ['Name', 'Access level', 'Can sign in', 'Email a new password link', 'Remove from team']), sh)
        await pg.screenshot(path=str(OUT / 'edit-panel.png'))
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(300)
        check('no page errors (team)', not errs, errs); await ctx.close()

        # Permissions once every switch is live: a table, and levels are renamed only
        ctx, pg, errs = await start(b, 'admin', V2_ADMIN)
        await team(pg)
        await pg.click('[data-act="tm-tab"][data-v="levels"]'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('#ccs-main')
        check('levels: set with the switches, no ticks on existing levels', 'set with the switches under Permissions' in t and await pg.locator('.ccs-lvtick').count() == 0, t[-400:])
        await pg.click('[data-act="lv-add"]'); await pg.wait_for_timeout(250)
        check('a new level starts from ticks as a starting point', 'Starting point' in await pg.inner_text('#ccs-main') and await pg.locator('.ccs-lvtick').count() == 5)
        check('no page errors (levels)', not errs, errs); await ctx.close()

        # The kitchen-only workspace follows the switches, not the level name
        ctx, pg, errs = await start(b, 'front_of_house', "window.__permv=2; window.__perms=['kit.view','kit.status','kit.print'];")
        tabs = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-nav [data-tab]')).map(function(x){return x.dataset.tab})")
        check('kitchen switches only: kitchen workspace, no orders', await pg.locator('.ccs-app.is-single').count() == 1 and 'orders' not in tabs, tabs)
        check('no page errors (kitchen)', not errs, errs); await ctx.close()
        ctx, pg, errs = await start(b, 'kitchen', "window.__permv=2; window.__perms=['kit.view','kit.status','kit.print','ord.view','ord.create'];")
        tabs = await pg.evaluate("[].slice.call(document.querySelectorAll('.ccs-nav [data-tab]')).map(function(x){return x.dataset.tab})")
        check('a kitchen level given orders gets the full menu', await pg.locator('.ccs-app.is-single').count() == 0 and 'orders' in tabs and 'kitchen' in tabs, tabs)
        check('no page errors (kitchen plus)', not errs, errs); await ctx.close()

        # Set-up link from the email
        ctx, pg, errs = await start(b, 'kitchen', '', None, '?setup=abc123')
        t = await pg.inner_text('body')
        v = await pg.evaluate("window.__calls.filter(function(c){return c[1]==='verifyOtp'}).map(function(c){return c[2]})")
        check('set-up link signs in with the one-time code and asks for a password', v and v[0] == {'token_hash': 'abc123', 'type': 'recovery'} and 'Choose a password to finish setting up' in t and 'setup=' not in pg.url, (v, t[:200], pg.url))
        await ctx.close()
        ctx, pg, errs = await start(b, 'kitchen', '', None, '?setup=expired')
        check('an expired link says what to do', 'Ask your manager to send a new one' in await pg.inner_text('body'))
        await ctx.close()

        # Phone: compact summaries, no sideways scrolling
        ctx, pg, errs = await start(b, 'admin', '', {'width': 390, 'height': 844})
        await pg.click('.ccs-nav [data-tab="more"]'); await pg.wait_for_timeout(300); await pg.click('#ccs-sheet [data-tab="settings"]'); await pg.wait_for_timeout(700)
        await pg.evaluate("[].filter.call(document.querySelectorAll('.ccs-setnav [data-setk], .ccs-set summary'),function(x){return (x.dataset && x.dataset.setk==='Team and access') || x.textContent.indexOf('Team and access')===0})[0].click()"); await pg.wait_for_timeout(500)
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        check('phone: team fits with no sideways scrolling', sw <= 390 and await pg.locator('.tm-tr:not(.tm-th)').count() >= 1, sw)
        await pg.screenshot(path=str(OUT / 'team-phone.png'), full_page=True)
        check('no page errors (phone)', not errs, errs); await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
