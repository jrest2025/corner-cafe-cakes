"""Touch audit: tap target sizes, horizontal scroll, overlays fitting the screen, calendar day size, dropdowns used for frequent actions. Invented data only."""
import asyncio, pathlib, sys, json, collections
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent; OUT = HERE / "shotsTouch"; OUT.mkdir(exist_ok=True)
PAGE = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else "hosted-staff.html"
VPS = [('ipad-portrait', 820, 1180, True), ('ipad-landscape', 1180, 820, True), ('laptop', 1366, 768, False), ('desktop', 1920, 1080, False), ('phone', 390, 844, True)]
if '--only' in sys.argv: VPS = [v for v in VPS if v[0] in sys.argv[sys.argv.index('--only') + 1].split(',')]
SHOTS = '--shots' in sys.argv
TABS = ['today', 'orders', 'calendar', 'kitchen', 'new', 'register', 'customers', 'settings', 'dash']
MEASURE = r"""(function(min){
  function vis(e){var r=e.getBoundingClientRect();if(r.width<1||r.height<1)return null;var s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return null;return r;}
  function sig(e){var t=(e.getAttribute('aria-label')||e.innerText||e.value||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,28);var c=(e.className&&e.className.baseVal===undefined?String(e.className):'').split(' ').filter(function(x){return x.indexOf('ccs')===0||x.indexOf('dx')===0||x.indexOf('cr')===0||x.indexOf('sl')===0||x.indexOf('kw')===0}).slice(0,2).join('.');return e.tagName.toLowerCase()+(c?'.'+c:'')+(e.dataset.act?'['+e.dataset.act+']':'')+' "'+t+'"';}
  var els=[].slice.call(document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[data-act],label.ccs-check'));
  var small=[],seen=new Set();
  els.forEach(function(e){if(seen.has(e))return;seen.add(e);if(e.closest('[aria-hidden=true]'))return;var r=vis(e);if(!r)return;
    if(e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio')){var l=e.closest('label');if(l){var lr=l.getBoundingClientRect();if(lr.height>=min)return;r=lr;}}
    if(e.matches('input.ccs-sr, .ccs-sr'))return;
    if(r.height<min-0.5||r.width<min-0.5) small.push(sig(e)+' '+Math.round(r.width)+'x'+Math.round(r.height));});
  var d=document.documentElement, sheet=document.querySelector('#ccs-sheet.is-open .ccs-sheet-panel, #ccs-sheet .ccs-sheet-panel, .ccs-modal.is-open, [role=dialog]:not([aria-hidden=true])');
  var o={small:small, hscroll:Math.max(0,d.scrollWidth-innerWidth), selects:[].slice.call(document.querySelectorAll('#ccs-main select')).filter(function(e){return vis(e)}).map(sig),
    coarse:matchMedia('(pointer:coarse)').matches};
  if(sheet&&vis(sheet)){var r=sheet.getBoundingClientRect();o.sheet={top:Math.round(r.top),bottom:Math.round(r.bottom),vh:innerHeight,right:Math.round(r.right),vw:innerWidth};}
  return o;})(%d)"""
async def go(pg, tab):
    ok = await pg.evaluate("(function(t){var e=[].slice.call(document.querySelectorAll('[data-tab='+t+']')).pop();if(e){e.click();return true}return false})('%s')" % tab)
    await pg.wait_for_timeout(700); return ok
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, w, h, touch in VPS:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=(w < 760), has_touch=touch); pg = await ctx.new_page()
            await pg.add_init_script("window.__role='%s'; window.print=function(){};" % (sys.argv[sys.argv.index('--role') + 1] if '--role' in sys.argv else 'manager'))
            await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(900); await pg.evaluate("try{localStorage.clear()}catch(e){}")
            minpx = 44 if touch else 32
            async def m(key):
                r = await pg.evaluate(MEASURE % minpx); res[f'{name} | {key}'] = r
                if SHOTS: await pg.screenshot(path=str(OUT / f'{name}-{key.replace(" ","_")}.png'))
            for t in TABS:
                if await go(pg, t): await m(t)
            await go(pg, 'orders')
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-main [data-act=open], #ccs-main .ccs-card, #ccs-main tr.ccs-click');e&&e.click()})()"); await pg.wait_for_timeout(800)
            await m('order panel')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            await go(pg, 'calendar')
            res[f'{name} | calendar day size'] = await pg.evaluate("(function(){var d=[].slice.call(document.querySelectorAll('#ccs-main [data-act^=cal-day], #ccs-main .ccs-cal-day, #ccs-main .cal-day')).map(function(e){var r=e.getBoundingClientRect();return Math.round(Math.min(r.width,r.height))}).filter(Boolean);return d.length?{min:Math.min.apply(null,d),n:d.length}:null})()")
            await go(pg, 'customers')
            await pg.evaluate("(function(){var e=document.querySelector('#ccs-main tr.ccs-click, #ccs-main [data-act^=cl-open], #ccs-main .ccs-click');e&&e.click()})()"); await pg.wait_for_timeout(900)
            await m('customer profile')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await ctx.close()
        await b.close()
    json.dump(res, open(HERE / 'audit_touch.json', 'w'), indent=1)
    # summary: unique small-target signatures per screen
    agg = collections.defaultdict(set)
    for k, v in res.items():
        if not v or 'small' not in v: continue
        dev, scr = k.split(' | ')
        for s in v['small']: agg[(dev, scr)].add(s.rsplit(' ', 1)[0])
    for k, v in res.items():
        if v and isinstance(v, dict) and 'small' in v:
            extra = []
            if v['hscroll']: extra.append('HSCROLL %d' % v['hscroll'])
            if v.get('sheet') and (v['sheet']['bottom'] > v['sheet']['vh'] + 1 or v['sheet']['top'] < 0): extra.append('SHEET OFF SCREEN %s' % v['sheet'])
            if v['selects']: extra.append('selects %d' % len(v['selects']))
            print(f"{k:45s} small:{len(v['small']):3d} coarse:{v['coarse']} {' '.join(extra)}")
        else: print(k, v)
asyncio.run(main())
