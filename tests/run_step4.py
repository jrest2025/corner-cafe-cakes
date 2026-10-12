"""CRM step 4 checks on the built staff app with invented data: filters, filter chips, saved groups,
export with permission rules, duplicate review with merge, undo and not-the-same-person, roles, phone layout."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsStep4"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
DESK = {'width': 1280, 'height': 900}; PHONE = {'width': 390, 'height': 844}
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760, accept_downloads=True); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"(window.__calls||[]).filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")
async def main_text(pg): return await pg.inner_text('#ccs-main')
async def customers(pg):
    await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(500)

async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg = await newpage(b, DESK, errs)
        await customers(pg)
        t = await main_text(pg)
        f = await calls(pg, 'customer_filter')
        check('list loads through the checked filter', len(f) >= 1 and f[-1]['p_filter'] == {}, f)
        check('count shown', '2 customers' in t, t[:400])
        check('toolbar has Filters, Export and Possible duplicates for a manager', all(x in t for x in ['Filters', 'Export', 'Possible duplicates']), t[:500])
        check('old unrecorded copy and export buttons are gone', 'Copy WhatsApp numbers' not in t)

        # filters
        await pg.click('[data-act="ws-cm-panel"][data-v="filter"]'); await pg.wait_for_timeout(300)
        mt = await main_text(pg); check('filter panel opens with the fields', all(x in mt for x in ['Spend from (FJD)', 'Has ordered this cake', 'Marketing permission', 'Birthday month', 'No order in the last (days)']))
        await pg.fill('#cm-spend-min', 'lots'); await pg.click('[data-act="ws-cm-apply"]'); await pg.wait_for_timeout(250)
        check('bad number refused on screen', 'Use a plain number for spend from' in await main_text(pg))
        await pg.fill('#cm-spend-min', '$100'); await pg.click('[data-act="ws-cm-apply"]'); await pg.wait_for_timeout(400)
        f = await calls(pg, 'customer_filter'); t = await main_text(pg)
        check('spend filter sent clean', f[-1]['p_filter'] == {'spend_min': '100'}, f[-1])
        check('chip shows the filter and list narrows', 'Spend from $100' in t and '1 customer' in t and 'Test Customer B' not in t, t[:600])
        check('Filters button shows how many are in use', 'Filters (1)' in t)
        await pg.screenshot(path=str(OUT / 'desk-filtered.png'), full_page=True)

        # save as a group
        await pg.click('[data-act="ws-cm-panel"][data-v="save"]'); await pg.wait_for_timeout(250)
        await pg.click('[data-act="ws-cm-gsave"][data-v="new"]'); await pg.wait_for_timeout(250)
        check('group needs a name', 'Give the group a name' in await main_text(pg))
        await pg.fill('#cm-gname', 'Big spenders'); await pg.click('[data-act="ws-cm-gsave"][data-v="new"]'); await pg.wait_for_timeout(500)
        g = await calls(pg, 'customer_group_save')
        check('group saved with the filter', g and g[-1]['p_filter'] == {'spend_min': '100'} and g[-1]['p_name'] == 'Big spenders', g)
        t = await main_text(pg)
        check('Show list offers the saved group with its count', await pg.locator('#ccs-seg option', has_text='Big spenders (1)').count() == 1)
        check('saved group line explains it is worked out fresh', 'Saved group Big spenders' in t and 'worked out fresh' in t, t[:700])
        # clear and pick the group again
        await pg.click('[data-act="ws-cm-clear"]'); await pg.wait_for_timeout(400)
        check('clearing shows everyone again', '2 customers' in await main_text(pg))
        gid = (await pg.evaluate("window.__cm.groups[0].id"))
        await pg.select_option('#ccs-seg', 'g:' + gid); await pg.wait_for_timeout(450)
        f = await calls(pg, 'customer_filter')
        check('choosing the group applies its filter', f[-1]['p_filter'] == {'spend_min': '100'} and '1 customer' in await main_text(pg), f[-1])
        # segment choice still works
        await pg.select_option('#ccs-seg', 'seg_repeat'); await pg.wait_for_timeout(400)
        f = await calls(pg, 'customer_filter')
        check('Show choice becomes a checked filter', f[-1]['p_filter'] == {'segment': 'seg_repeat'}, f[-1])
        await pg.select_option('#ccs-seg', 'all'); await pg.wait_for_timeout(400)

        # export
        await pg.click('[data-act="ws-cm-panel"][data-v="export"]'); await pg.wait_for_timeout(250)
        t = await main_text(pg)
        check('export explains the permission rule and that nothing is sent', 'Only people who said yes to that channel' in t and 'Nothing is sent from here' in t and 'recorded with your name' in t)
        await pg.click('[data-act="ws-cm-ech"][data-v="whatsapp"]'); await pg.wait_for_timeout(400)
        t = await main_text(pg)
        check('preview counts who is in and left out', '1 left out: no permission for WhatsApp' in t and 'need reconfirming' in t and 'Left out unless you tick below' in t, t[t.find('Export a contact'):][:700])
        check('nobody contactable without the tick', 'Nobody in this list can be contacted by WhatsApp' in t)
        await pg.check('[data-wsc="cm-inc"]'); await pg.wait_for_timeout(250)
        t = await main_text(pg)
        check('ticking includes them with a warning', 'Download file (1)' in t and 'not for an offer' in t)
        async with pg.expect_download() as dl:
            await pg.click('[data-act="ws-cm-export"][data-v="file"]')
        d = await dl.value; path = await d.path(); csv = open(path).read()
        e = await calls(pg, 'customer_export')
        check('export goes through the recorded function', e and e[-1]['p_channel'] == 'whatsapp' and e[-1]['p_include_reconfirm'] is True, e)
        check('file has the number and the reconfirm flag only', 'Customer,Name,WhatsApp,Needs reconfirming' in csv and '912 0001' in csv and 'Test Customer B' not in csv and ',Yes,' in csv, csv)
        check('file name says the channel', 'whatsapp' in d.suggested_filename, d.suggested_filename)
        await pg.screenshot(path=str(OUT / 'desk-export.png'), full_page=True)

        # duplicates
        await pg.click('[data-act="ws-cm-dups"]'); await pg.wait_for_timeout(500)
        t = await main_text(pg)
        check('duplicate review shows the pair side by side with reasons', 'Possible duplicate customers' in t and 'Same mobile number' in t and 'C-101' in t and 'C-102' in t and 'families and offices often share a number' in t, t[:800])
        await pg.click('[data-act="ws-cm-merge"]'); await pg.wait_for_timeout(450)
        t = await main_text(pg); pv = await calls(pg, 'customer_merge_preview')
        check('default keeps the profile with more orders', pv and pv[-1]['p_keep'] == 'c1', pv)
        check('merge panel says what moves, that nothing is erased and permission stays', 'kept, not erased' in t and 'Moves across: 1 order' in t and 'Marketing permission stays with the number or email' in t, t[t.find('Merge into one'):][:900])
        await pg.click('[data-act="ws-cm-keep"][data-v="b"]'); await pg.wait_for_timeout(400)
        pv = await calls(pg, 'customer_merge_preview'); t = await main_text(pg)
        check('switching which to keep re-checks', pv[-1]['p_keep'] == 'c2' and 'Fills in on C-102: Email, Birthday' in t, t[t.find('Merge into one'):][:700])
        await pg.click('[data-act="ws-cm-keep"][data-v="a"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=str(OUT / 'desk-merge.png'), full_page=True)
        await pg.evaluate("window.__mergeStale = true")
        await pg.click('[data-act="ws-cm-merge-go"]'); await pg.wait_for_timeout(400)
        check('a stale merge is refused and explained', 'changed while you were looking' in await main_text(pg))
        await pg.evaluate("window.__mergeStale = false")
        await pg.fill('#cm-mreason', 'Same number, customer confirmed')
        await pg.click('[data-act="ws-cm-merge-go"]'); await pg.wait_for_timeout(600)
        m = await calls(pg, 'customer_merge'); t = await main_text(pg)
        check('merge sends both versions and the reason', m[-1]['p_keep'] == 'c1' and m[-1]['p_merge'] == 'c2' and isinstance(m[-1]['p_keep_version'], int) and isinstance(m[-1]['p_merge_version'], int) and m[-1]['p_reason'] == 'Same number, customer confirmed', m[-1])
        check('merge listed with Undo, pair gone', 'merged into C-101' in t and 'Undo' in t and 'Same person, merge' not in t, t[:900])
        # merged profile opens the main profile
        await pg.click('[data-act="ws-cm-list"]'); await pg.wait_for_timeout(500)
        t = await main_text(pg)
        check('merged profile no longer listed', '1 customer' in t and 'Test Customer A' in t and 'Test Customer B' not in t, t[:500])
        await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(700)
        sh = await pg.inner_text('#ccs-sheet')
        check('kept profile says what was merged into it', 'Merged into this profile: C-102 Test Customer B' in sh, sh[:600])
        await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(300)
        # undo needs a second tap
        await pg.click('[data-act="ws-cm-dups"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-act="ws-cm-undo"]'); await pg.wait_for_timeout(200)
        check('undo asks for a second tap', 'Tap again to undo the merge' in await main_text(pg) and not await calls(pg, 'customer_merge_undo'))
        await pg.click('[data-act="ws-cm-undo"]'); await pg.wait_for_timeout(600)
        t = await main_text(pg)
        check('undone merge says which details were kept', 'Undone by Test Manager' in t and 'Kept because they were changed since: email' in t and 'Same person, merge' in t, t[:1200])
        # not the same person
        await pg.click('[data-act="ws-cm-notsame"]'); await pg.wait_for_timeout(250)
        await pg.fill('#cm-ns-note', 'Mother and daughter'); await pg.click('[data-act="ws-cm-notsame-go"]'); await pg.wait_for_timeout(500)
        t = await main_text(pg); dd = await calls(pg, 'customer_pair_dismiss')
        check('not the same person recorded with the note and leaves the list', dd and dd[-1]['p_note'] == 'Mother and daughter' and 'Marked as different people' in t and 'Same person, merge' not in t, t[:900])
        await pg.click('[data-act="ws-cm-unnotsame"]'); await pg.wait_for_timeout(500)
        check('and can be undone', 'Same person, merge' in await main_text(pg))
        # profile warning links to review
        await pg.click('[data-act="ws-cm-list"]'); await pg.wait_for_timeout(500)
        await pg.locator('[data-act="open-customer"][data-id="c2"]').first.click(); await pg.wait_for_timeout(700)
        await pg.click('#ccs-sheet [data-act="ws-cm-dups-open"]'); await pg.wait_for_timeout(700)
        check('profile duplicate warning opens the review', 'Possible duplicate customers' in await main_text(pg) and not await pg.locator('#ccs-sheet.ccs-open').count())
        await ctx.close()

        # roles
        ctx, pg = await newpage(b, DESK, errs, 'marketing'); await customers(pg); t = await main_text(pg)
        check('marketing can export and save groups but not review duplicates', 'Export' in t and 'Possible duplicates' not in t, t[:400])
        await ctx.close()
        ctx, pg = await newpage(b, DESK, errs, 'front_of_house'); await customers(pg); t = await main_text(pg)
        check('front of house can filter but not export or save groups', 'Filters' in t and await pg.locator('[data-act="ws-cm-panel"][data-v="export"]').count() == 0 and 'Save as group' not in t and 'Possible duplicates' not in t, t[:400])
        await pg.click('[data-act="ws-cm-panel"][data-v="filter"]'); await pg.wait_for_timeout(250)
        await pg.fill('#cm-spend-min', '100'); await pg.click('[data-act="ws-cm-apply"]'); await pg.wait_for_timeout(400)
        check('front of house sees no Save as group even with a filter', 'Save as group' not in await main_text(pg))
        await ctx.close()

        # phone
        ctx, pg = await newpage(b, PHONE, errs)
        await pg.evaluate("document.querySelector('[data-tab=\"more\"]') && document.querySelector('[data-tab=\"more\"]').click()"); await pg.wait_for_timeout(300)
        await pg.click('#ccs-sheet [data-tab="customers"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-act="ws-cm-panel"][data-v="filter"]'); await pg.wait_for_timeout(300)
        ow = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check('phone: filter panel fits the screen', ow <= 1, ow)
        await pg.screenshot(path=str(OUT / 'phone-filter.png'), full_page=True)
        await pg.click('[data-act="ws-cm-dups"]'); await pg.wait_for_timeout(500)
        ow = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check('phone: duplicate review fits the screen', ow <= 1, ow)
        await pg.screenshot(path=str(OUT / 'phone-dups.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no script errors', not errs, errs)
    print(f'{sum(R)}/{len(R)} passed')
asyncio.run(main())
