"""CRM step 3 checks on the built staff app with invented data: profile tabs, notes, enquiries, feedback,
follow-ups, Today's follow-ups, order links, Repeat order, roles, unsaved typing and phone layout."""
import asyncio, pathlib, sys, datetime
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsStep3"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 else "built-staff5.html"
DESK = {'width': 1280, 'height': 900}
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:400] if not ok and d != '' else ''))

async def newpage(b, vp, errs, role='manager'):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760); pg = await ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.add_init_script(f"window.__role='{role}'; try{{localStorage.clear()}}catch(e){{}}")
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    await pg.evaluate("window.__calls = window.__calls || []")
    return ctx, pg

async def calls(pg, fn): return await pg.evaluate(f"(window.__calls||[]).filter(function(c){{return c[1]==='{fn}'}}).map(function(c){{return c[2]}})")
async def sheet(pg): return await pg.inner_text('#ccs-sheet')
async def tab(pg, v):
    await pg.evaluate("(function(v){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-g=cust][data-v='+v+']');b&&b.click()})('%s')" % v); await pg.wait_for_timeout(300)
async def today_fu(pg): await pg.evaluate("(function(){[].forEach.call(document.querySelectorAll('[data-act=secgo][data-v=fu]'),function(b){if(b.offsetParent)b.click()})})()"); await pg.wait_for_timeout(300)
async def open_c1(pg):
    await pg.click('.ccs-nav [data-tab="customers"]'); await pg.wait_for_timeout(450)
    await pg.locator('[data-act="open-customer"][data-id="c1"]').first.click(); await pg.wait_for_timeout(600)

async def main():
    errs = []
    fiji = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    tomorrow = (fiji + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg = await newpage(b, DESK, errs)
        # Today: follow-ups card
        await pg.wait_for_timeout(400); await today_fu(pg)
        t = await pg.inner_text('#ccs-main')
        check('Today shows a Follow-ups card with the overdue one', 'Follow-ups' in t and 'Send the two-tier quote' in t and 'Overdue' in t, t[-600:])
        await pg.screenshot(path=str(OUT / 'desk-today.png'), full_page=True)
        await pg.click('.ws-furow'); await pg.wait_for_timeout(700)
        sh = await sheet(pg)
        check('tapping it opens the customer on Notes and follow-ups', await pg.evaluate("(function(){var r=document.getElementById('cp-notes').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()") and 'Send the two-tier quote' in sh, sh[:400])
        check('the overdue follow-up is marked overdue', 'Overdue, was due' in sh)
        check('the earlier enquiry is listed with who and how', 'Asked about a two-tier cake' in sh and 'Test Staff' in sh and 'WhatsApp' in sh)
        check('internal-only reminder is shown', 'Internal only' in sh and 'Never shown to the customer' in sh)

        # Add a note: empty, then a card number, then a good one
        await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(200)
        check('empty note is refused with a clear message', 'Write the note first' in await sheet(pg))
        await pg.fill('#ws-body', 'Paid with card 4111 1111 1111 1111 last time'); await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(400)
        check('card number refused by the server, typing kept', 'Do not record card' in await sheet(pg) and 'Paid with card' in await pg.input_value('#ws-body'))
        await pg.fill('#ws-body', 'Prefers collecting after 5pm on weekdays.'); await pg.select_option('#ws-channel', 'phone')
        await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(500)
        c = await calls(pg, 'customer_note_add')
        check('note saved with kind, channel and a repeat-safe key', c and c[-1]['p_kind'] == 'note' and c[-1]['p_channel'] == 'phone' and c[-1]['p_idem'], c[-1] if c else c)
        sh = await sheet(pg)
        check('new note listed and form cleared', 'Prefers collecting after 5pm' in sh and await pg.input_value('#ws-body') == '', sh[:500])

        # Feedback with a follow-up for someone else, linked to an order
        await pg.click('[data-act="ws-kind"][data-v="feedback"]'); await pg.wait_for_timeout(150)
        await pg.fill('#ws-body', 'Said the icing was too sweet on the red velvet.'); await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(200)
        check('feedback needs Happy, Mixed or Complaint', 'Choose Happy, Mixed or Complaint' in await sheet(pg))
        check('typing kept after that message', 'too sweet' in await pg.input_value('#ws-body'))
        await pg.click('[data-act="ws-tone"][data-v="negative"]'); await pg.wait_for_timeout(150)
        await pg.select_option('#ws-order', 'o3')
        await pg.check('#ws-follow'); await pg.wait_for_timeout(200)
        check('ticking follow-up shows what, when and who', await pg.locator('#ws-title').count() == 1 and await pg.locator('#ws-assignee').count() == 1)
        await pg.fill('#ws-title', 'Call to apologise and offer less sweet icing next time')
        await pg.click('[data-act="ws-due"][data-v="tomorrow"]'); await pg.wait_for_timeout(100)
        await pg.select_option('#ws-assignee', 'u7')
        check('body text survives the re-draws', 'too sweet' in await pg.input_value('#ws-body'))
        await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(600)
        n = (await calls(pg, 'customer_note_add'))[-1]; tk = await calls(pg, 'customer_task_add')
        check('feedback saved as a complaint about CC-1003', n['p_kind'] == 'feedback' and n['p_tone'] == 'negative' and n['p_order'] == 'o3', n)
        check('follow-up saved for Test Staff, tomorrow, linked to the note and order', tk and tk[-1]['p_assignee'] == 'u7' and tk[-1]['p_due'] == tomorrow and tk[-1]['p_note'] and tk[-1]['p_order'] == 'o3', tk[-1] if tk else tk)
        sh = await sheet(pg)
        check('toast confirms both', 'with a follow-up' in await pg.inner_text('#ccs-toast'))
        check('new follow-up listed for Test Staff, due tomorrow', 'Call to apologise' in sh and 'For Test Staff' in sh and 'Due tomorrow' in sh, sh[:700])
        check('feedback shows as Complaint with the order', 'Complaint' in sh and 'CC-1003' in sh)
        await pg.screenshot(path=str(OUT / 'desk-notes.png'), full_page=True)

        # Close a follow-up: needs an outcome
        await pg.click('[data-act="ws-task-mode"][data-id="t1"][data-v="done"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="ws-task-go"][data-id="t1"][data-v="done"]'); await pg.wait_for_timeout(150)
        check('Done needs what happened', 'Say what happened' in await sheet(pg))
        await pg.fill('#ws-out', 'Sent the quote by WhatsApp, customer will confirm Friday'); await pg.click('[data-act="ws-task-go"][data-id="t1"][data-v="done"]'); await pg.wait_for_timeout(500)
        u = await calls(pg, 'customer_task_update')
        check('done sent with the outcome and version', u and u[-1]['p_action'] == 'done' and u[-1]['p_version'] == 1 and 'Friday' in u[-1]['p_outcome'], u[-1] if u else u)
        sh = await sheet(pg)
        check('done follow-up moves to Done and closed', 'Done and closed (1)' in sh)
        await pg.click('[data-wsdone] summary'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="ws-task-go"][data-id="t1"][data-v="reopen"]'); await pg.wait_for_timeout(500)
        check('reopen brings it back', (await calls(pg, 'customer_task_update'))[-1]['p_action'] == 'reopen' and 'Done and closed' not in await sheet(pg))

        # Change date or person
        await pg.click('[data-act="ws-task-mode"][data-id="t1"][data-v="edit"]'); await pg.wait_for_timeout(150)
        await pg.fill('#ws-tdue', tomorrow); await pg.select_option('#ws-tass', ''); await pg.click('[data-act="ws-task-go"][data-id="t1"][data-v="edit"]'); await pg.wait_for_timeout(500)
        u = (await calls(pg, 'customer_task_update'))[-1]
        check('date and person changed (to anyone on the team)', u['p_action'] == 'edit' and u['p_due'] == tomorrow and u['p_assignee'] is None, u)

        # Edit a note keeps the old wording
        nid = await pg.evaluate("(window.__ws.notes.filter(function(n){return n.body.indexOf('after 5pm')>-1})[0]||{}).id")
        await pg.click(f'[data-act="ws-edit"][data-id="{nid}"]'); await pg.wait_for_timeout(150)
        await pg.fill('#ws-ebody', 'Prefers collecting after 5.30pm on weekdays.'); await pg.click(f'[data-act="ws-edit-save"][data-id="{nid}"]'); await pg.wait_for_timeout(400)
        check('a change needs a reason', 'Say briefly why' in await sheet(pg) and '5.30pm' in await pg.input_value('#ws-ebody'))
        await pg.fill('#ws-ereason', 'Customer corrected the time'); await pg.click(f'[data-act="ws-edit-save"][data-id="{nid}"]'); await pg.wait_for_timeout(500)
        sh = await sheet(pg)
        check('changed note shows who changed it', '5.30pm' in sh and 'Changed by Test Manager' in sh)
        await pg.click(f'[data-act="ws-hist"][data-id="{nid}"]'); await pg.wait_for_timeout(400)
        check('earlier wording kept and shown', 'after 5pm on weekdays' in await sheet(pg) and 'Customer corrected the time' in await sheet(pg))

        # Follow-up from an existing note
        await pg.click(f'[data-act="ws-follow-from"][data-id="{nid}"]'); await pg.wait_for_timeout(200)
        sh = await sheet(pg)
        check('Add follow-up on a note shows only the follow-up fields', 'Add a follow-up' in sh and 'already saved' in sh and await pg.locator('#ws-body').count() == 0 and await pg.locator('#ws-title').count() == 1)
        await pg.fill('#ws-title', 'Remind about collection time'); await pg.click('[data-act="ws-due"][data-v="3"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-act="ws-save"]'); await pg.wait_for_timeout(500)
        tk = (await calls(pg, 'customer_task_add'))[-1]
        check('follow-up linked to that note, no second note saved', tk['p_note'] == nid and tk['p_title'] == 'Remind about collection time' and len(await calls(pg, 'customer_note_add')) == 3, tk)
        check('form back to normal after saving', 'Add to this customer' in await sheet(pg))
        # Manager removes a note from view
        await pg.click('[data-act="ws-hide"][data-id="n1"]'); await pg.wait_for_timeout(150)
        await pg.fill('#ws-hreason', 'Written on the wrong customer'); await pg.click('[data-act="ws-hide-save"][data-id="n1"]'); await pg.wait_for_timeout(500)
        check('removed note becomes a manager-only line', 'Removed from view by Test Manager' in await sheet(pg))

        # Overview summary
        await tab(pg, 'overview')
        sh = await sheet(pg)
        secs = await pg.evaluate("[].map.call(document.querySelectorAll('#ccs-sheet [data-act=secgo][data-g=cust]'),function(b){return b.textContent})")
        await tab(pg, 'notes'); shn = (await sheet(pg)).lower()
        check('orders, follow-ups and notes each have a section button; notes open on one tap', any(x.startswith('Orders (') for x in secs) and 'Notes and follow-ups' in secs and 'notes, enquiries and feedback' in shn, (secs, shn[:300]))

        # Order screen shows linked follow-up; kitchen brief never shows notes
        await tab(pg, 'orders')
        await pg.locator('#ccs-sheet [data-act="open-order"][data-id="o3"]').first.click(); await pg.wait_for_timeout(700)
        await pg.evaluate("(function(){var b=document.querySelector('#ccs-sheet [data-act=secgo][data-g=order][data-v=customer]');b&&b.click()})()"); await pg.wait_for_timeout(300)
        sh = await sheet(pg)
        check('order screen shows its open follow-up and note count', 'Open follow-ups for this order' in sh and 'Call to apologise' in sh and '1 about this order' in sh, sh[-600:])
        await pg.evaluate('window.print = function(){ window.__printed = 1; }')
        await pg.click('[data-act="panel"][data-v="brief"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="do-brief"][data-v="A5"]'); await pg.wait_for_timeout(700)
        brief = await pg.evaluate("(document.getElementById('ccs-print')||{}).innerText||''")
        check('kitchen brief printed without any note or feedback text', 'CC-1003' in brief and 'too sweet' not in brief and 'apologise' not in brief, brief[:300])
        await ctx.close()

        # Repeat order
        ctx, pg = await newpage(b, DESK, errs)
        await open_c1(pg); await tab(pg, 'orders')
        check('each order has Repeat this order', await pg.locator('[data-act="ws-repeat"]').count() == await pg.locator('#cp-orders tbody tr.ccs-click').count() >= 3)
        await pg.click('[data-act="ws-repeat"][data-id="o1"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        d = await pg.evaluate("(function(){try{return JSON.parse(localStorage.getItem('ccs-draft-u1'))}catch(e){return null}})()")
        check('repeat opens New order with a clear note', 'Repeating CC-1001' in t and "Prices are today's" in t, t[:600])
        check('last message, occasion and dietary shown, not copied', 'Happy 30th' in t and 'Birthday' in t and 'Nut allergy' in t and d and d['message'] == '' and d['diet'] is None and d['occasion'] is None, d)
        check('customer, cake, flavour, size and quantity carried over; no date', d and d['customer']['id'] == 'c1' and d['product'] == 'chocolate-mudcake-mocha' and d['variant'] == 'Mudcake' and d['size'] == 8 and d['qty'] == 1 and d['date'] == '', d)
        check('dietary needs are asked again on the slip', await pg.evaluate("(function(){try{return JSON.parse(localStorage.getItem('ccs-draft-u1')).diet}catch(e){return 'x'}})()") is None and await pg.locator('.sl-live [data-st="5"].is-blank').count() == 1)
        t = await pg.inner_text('#ccs-main')
        check('price comes from today\'s price list', '$' in t)
        await pg.click('[data-act="new-again"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="new-clear"]'); await pg.wait_for_timeout(200)
        # A cake that is no longer sold
        await pg.evaluate("window.__orders.filter(function(o){return o.id==='o8'})[0].order_items[0].product_name='Lemon Drizzle'")
        await open_c1(pg); await tab(pg, 'orders')
        await pg.click('[data-act="ws-repeat"][data-id="o8"]'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('#ccs-main')
        d = await pg.evaluate("JSON.parse(localStorage.getItem('ccs-draft-u1'))")
        check('a cake no longer sold is flagged and the cake step opens', 'Lemon Drizzle is no longer on sale' in t and d['step'] == 1 and d['product'] is None, t[:500])
        # Delivery repeat keeps the area
        await pg.click('[data-act="new-again"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="new-clear"]'); await pg.wait_for_timeout(200)
        await open_c1(pg); await tab(pg, 'orders')
        await pg.click('[data-act="ws-repeat"][data-id="o3"]'); await pg.wait_for_timeout(600)
        d = await pg.evaluate("JSON.parse(localStorage.getItem('ccs-draft-u1'))")
        check('delivery repeat keeps the area and address, not the date', d['method'] == 'delivery' and d['zone'] == 'Denarau' and d['address'] and d['date'] == '', d)
        # Unfinished order protects against a second repeat
        await open_c1(pg); await tab(pg, 'orders')
        await pg.click('[data-act="ws-repeat"][data-id="o1"]'); await pg.wait_for_timeout(500)
        check('repeat with an unfinished order asks to finish it first', 'unfinished order' in (await pg.inner_text('#ccs-toast')).lower())
        await ctx.close()

        # Unsaved typing protection
        ctx, pg = await newpage(b, DESK, errs)
        await open_c1(pg); await tab(pg, 'notes')
        await pg.fill('#ws-body', 'Half-written note'); await pg.click('#ccs-sheet [data-act="close"]'); await pg.wait_for_timeout(200)
        check('closing with a half-written note asks first', await pg.locator('#ccs-sheet.ccs-open').count() == 1 and 'Tap again' in await pg.inner_text('#ccs-toast'))
        await ctx.close()

        # Roles
        ctx, pg = await newpage(b, DESK, errs, 'front_of_house')
        check('counter (three levels, 14 Oct): no Customers screen', await pg.locator('.ccs-nav [data-tab="customers"]').count() == 0)
        await pg.click('.ccs-nav [data-tab="today"]'); await pg.wait_for_timeout(500)
        tt = await pg.inner_text('#ccs-main')
        check('front of house: Today has Follow-ups, without the everyone switch', 'Follow-ups' in tt and await pg.locator('[data-act="ws-fu-all"]').count() == 0, tt[-300:])
        await ctx.close()
        ctx, pg = await newpage(b, DESK, errs, 'finance')
        await open_c1(pg)
        check('finance: no marketing permission section', await pg.locator('#cp-comms').count() == 0)
        await tab(pg, 'notes')
        check('finance: reads notes, cannot add or change', 'Asked about a two-tier cake' in await sheet(pg) and await pg.locator('[data-act="ws-save"]').count() == 0 and await pg.locator('[data-act="ws-edit"]').count() == 0 and await pg.locator('[data-act="ws-task-mode"]').count() == 0)
        await pg.click("#ccs-sheet [data-act=\"close\"]"); await pg.wait_for_timeout(200); await pg.click(".ccs-nav [data-tab=\"today\"]"); await pg.wait_for_timeout(500)
        await today_fu(pg)
        check('finance: no Follow-ups card on Today', 'Send the two-tier quote' not in await pg.inner_text('#ccs-main'))
        await ctx.close()
        ctx, pg = await newpage(b, DESK, errs, 'kitchen')
        check('kitchen: no customers or follow-ups at all', await pg.locator('.ccs-nav [data-tab="customers"]').count() == 0 and 'Follow-ups' not in await pg.inner_text('body'))
        await ctx.close()

        # Phone
        ctx, pg = await newpage(b, {'width': 390, 'height': 844}, errs)
        await today_fu(pg); t = await pg.inner_text('#ccs-main')
        check('phone: Follow-ups card on Today', 'Send the two-tier quote' in t)
        await pg.screenshot(path=str(OUT / 'phone-today.png'), full_page=True)
        await pg.click('.ws-furow'); await pg.wait_for_timeout(700)
        await pg.check('#ws-follow'); await pg.wait_for_timeout(200)
        sw = await pg.evaluate("Math.max(document.documentElement.scrollWidth, document.getElementById('ccs-sheet').scrollWidth)")
        check('phone: notes tab with follow-up form fits without sideways scroll', sw <= 390, sw)
        small = await pg.evaluate("""[...document.querySelectorAll('#ccs-sheet .ws-add button, #ccs-sheet .ws-add select, #ccs-sheet .ws-add input:not([type=checkbox]), #ccs-sheet .ws-tabs button')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<44).map(e=>e.textContent||e.id)""")
        check('phone: form controls at least 44 pixels tall', not small, small)
        await pg.screenshot(path=str(OUT / 'phone-notes.png'), full_page=True)
        await ctx.close()
        await b.close()
    check('no page errors', not errs, errs)
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
