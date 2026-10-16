"""Touch audit, second pass: the states behind the first screen (sheets, kitchen controls, calendar views, settings sections, new order steps). Invented data only."""
import asyncio, pathlib, sys, json, collections
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = "hosted-staff.html"
VPS = [('ipad-portrait', 820, 1180, True), ('ipad-landscape', 1180, 820, True), ('phone', 390, 844, True), ('laptop', 1366, 768, False)]
if '--only' in sys.argv: VPS = [v for v in VPS if v[0] in sys.argv[sys.argv.index('--only') + 1].split(',')]
MEASURE = open(HERE / 'audit_touch.py').read().split('MEASURE = r"""')[1].split('"""')[0]
PRIMARY = r"""(function(){var out=[];[].slice.call(document.querySelectorAll('.ccs-btn:not(.ccs-ghost):not(.ccs-small), .ccs-good, [data-act=n-submit], [data-act=sl-next], [data-act=k-next], [data-act=k-ready], [data-act=k-done], [data-act=am-save], [data-act=pay-save], [data-act=do-collected]')).forEach(function(e){var r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;if(r.height<47.5)out.push((e.dataset.act||e.className.split(' ').slice(0,2).join('.'))+' "'+e.innerText.trim().slice(0,24)+'" '+Math.round(r.height));});return out;})()"""
async def click(pg, sel, wait=500):
    ok = await pg.evaluate("(function(s){var e=[].slice.call(document.querySelectorAll(s)).filter(function(x){var r=x.getBoundingClientRect();return r.width>0&&r.height>0})[0];if(e){e.click();return true}return false})(%s)" % json.dumps(sel))
    await pg.wait_for_timeout(wait); return ok
async def tab(pg, t): return await click(pg, '[data-tab=%s]' % t, 700)
STATES = [
  ('order panel', [('tab', 'orders'), ('c', '#ccs-main [data-act=open], #ccs-main .ccs-card, #ccs-main tr.ccs-click')]),
  ('record payment', [('c', '[data-act=do-pay]')]),
  ('change order', [('esc',), ('tab', 'orders'), ('c', '#ccs-main [data-act=open], #ccs-main .ccs-card, #ccs-main tr.ccs-click'), ('c', '[data-act=am-open], [data-act=am-go]')]),
  ('kitchen card', [('esc',), ('tab', 'kitchen'), ('c', '#ccs-main [data-act=k-card], #ccs-main [data-act=open-kitchen]')]),
  ('kitchen calendar week', [('esc',), ('tab', 'kitchen'), ('c', '[data-act=k-mode][data-v=cal], [data-act=k-cal-view][data-v=week]')]),
  ('kitchen calendar month', [('c', '[data-act=k-cal-view][data-v=month]')]),
  ('calendar month', [('tab', 'calendar'), ('c', '[data-act=cal-view][data-v=month]')]),
  ('calendar day open', [('c', '[data-act=cal-openday], [data-act=day]')]),
  ('customer workspace', [('esc',), ('tab', 'customers'), ('c', '#ccs-main tr.ccs-click, #ccs-main [data-act^=cl-open], #ccs-main .ccs-click, #ccs-main [data-act=open-customer]', 900)]),
  ('settings all open', [('esc',), ('tab', 'settings'), ('js', "document.querySelectorAll('#ccs-main details').forEach(function(d){d.open=true})")]),
  ('handover', [('tab', 'today'), ('c', '[data-act=ho-more], [data-act=ho-shift]')]),
  ('new 1 cake', [('tab', 'new')]),
  ('new 2 customer', [('c', '[data-act="n-cell"][data-v="cheesecake|8"]'), ('c', '[data-act=sl-next]')]),
  ('new 3 details', [('fill', '#n-name', 'Touch Guest'), ('c', '[data-act=sl-next]')]),
  ('new 4 when', [('fill', '#n-phone', '912 0077'), ('c', '[data-act="sl-opt"][data-v="yes"]'), ('c', '[data-act=sl-next]')]),
  ('new date picker', [('c', '[data-act=n-date-other], [data-act=sl-whenpart]')]),
]
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, h, touch in VPS:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=(w < 760), has_touch=touch); pg = await ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("window.__role='manager'; window.print=function(){};")
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900); await pg.evaluate("try{localStorage.clear()}catch(e){}")
            minpx = 44 if touch else 32
            for st, steps in STATES:
                ran = True
                for s in steps:
                    if s[0] == 'tab': ran = await tab(pg, s[1]) and ran
                    elif s[0] == 'c': ran = await click(pg, s[1], s[2] if len(s) > 2 else 500) and ran
                    elif s[0] == 'esc': await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); await click(pg, '[data-act=close]', 300)
                    elif s[0] == 'js': await pg.evaluate(s[1]); await pg.wait_for_timeout(300)
                    elif s[0] == 'fill':
                        try: await pg.fill(s[1], s[2], timeout=2000)
                        except Exception: ran = False
                r = await pg.evaluate(MEASURE % minpx); r['ran'] = ran
                if touch: r['primary_small'] = await pg.evaluate(PRIMARY)
                res[f'{name} | {st}'] = r
                await pg.screenshot(path=str(HERE / 'shotsTouch' / f'deep-{name}-{st.replace(" ","_")}.png'))
            res[f'{name} | errors'] = errs
            await ctx.close()
        await b.close()
    json.dump(res, open(HERE / 'audit_touch_deep.json', 'w'), indent=1)
    agg = collections.defaultdict(set)
    for k, v in res.items():
        if isinstance(v, dict):
            print(f"{k:42s} ran:{v['ran']!s:5s} small:{len(v['small']):3d} primary<48:{len(v.get('primary_small',[]))} hscroll:{v['hscroll']} sheet:{v.get('sheet')}")
            dev = k.split(' | ')[0]
            for s in v['small'] + ['PRIMARY ' + x for x in v.get('primary_small', [])]: agg[s.rsplit(' ', 1)[0]].add(dev[:6] + ':' + k.split(' | ')[1])
        else: print(k, v[:3])
    print('\n--- unique small targets ---')
    for s, wh in sorted(agg.items()): print(s[:100], '<-', ', '.join(sorted(wh))[:150])
asyncio.run(main())
