# Run from the audit replica (harness.py, util.py, verify_step1.py in /home/claude/audit): AUD_BUNDLE=<app build> python3 build/laptop_harvest.py build/laptop-harvest.json
"""Laptop sizing harvest: for every visible text element (15px and up) and every control (40px and taller) on every screen
at 1512x860 (mouse), find the CSS rule that sets its font size / height. Output lap/found2.json."""
import asyncio, sys, json
sys.path.insert(0, '/home/claude/audit')
from harness import open_page
from playwright.async_api import async_playwright
import verify_step1 as v
W, H = 1512, 860
FOUND = {}
MARK = r"""()=>{let i=0;document.querySelectorAll('[data-lp],[data-lc]').forEach(e=>{e.removeAttribute('data-lp');e.removeAttribute('data-lc')});
 const roots=[document.getElementById('cc-staff'),document.getElementById('ccs-sheet'),...document.querySelectorAll('body > dialog, body > [role=dialog], .cc-dp-layer, #cc-date-picker-layer')].filter(Boolean);
 roots.forEach(root=>root.querySelectorAll('*').forEach(e=>{if(e.closest('svg'))return;const r=e.getBoundingClientRect();if(!r.height||!r.width)return;const cs=getComputedStyle(e);if(cs.visibility=='hidden')return;
   if(r.bottom<-50||r.top>innerHeight*3)return;
   const txt=[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim());
   if(txt&&parseFloat(cs.fontSize)>=15)e.setAttribute('data-lp','1');
   if(/^(BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.tagName)||e.matches('.ccs-chip,.ccs-btn,[role=button],[role=tab],.ccs-nav-item,.ccs-input')){if(r.height>=40)e.setAttribute('data-lc','1')}}));
 return [document.querySelectorAll('[data-lp]').length,document.querySelectorAll('[data-lc]').length]}"""

def winner(m, prop):
    win = None
    inl = m.get('inlineStyle') or {}
    for r in m['matchedCSSRules']:
        for pp in r['rule']['style']['cssProperties']:
            if pp['name'] == prop and pp.get('value') and 'range' in pp:
                imp = bool(pp.get('important')) or '!important' in pp['value']
                cand = (r['rule']['selectorList']['text'], pp['value'], tuple(mm['text'] for mm in r['rule'].get('media', [])), imp)
                if win is None or imp or not win[3]:
                    win = cand
    for pp in inl.get('cssProperties', []):
        if pp['name'] == prop and pp.get('value'):
            imp = bool(pp.get('important'))
            if not win or imp or not win[3]:
                win = ('INLINE', pp['value'], (), imp)
    return win

async def harvest(p, cdp, label):
    cnt = await p.evaluate(MARK)
    doc = await cdp.send('DOM.getDocument', {'depth': 0})
    for attr, props in (('data-lp', ['font-size']), ('data-lc', ['height', 'min-height'])):
        ids = (await cdp.send('DOM.querySelectorAll', {'nodeId': doc['root']['nodeId'], 'selector': '[%s]' % attr}))['nodeIds']
        for nid in ids:
          for prop in props:
           try:
                 cur = nid; win = None; depth = 0
                 while cur and depth < (8 if prop == 'font-size' else 1):
                     try: m = await cdp.send('CSS.getMatchedStylesForNode', {'nodeId': cur})
                     except Exception: break
                     win = winner(m, prop)
                     if win: break
                     d = await cdp.send('DOM.describeNode', {'nodeId': cur})
                     o = await cdp.send('DOM.resolveNode', {'nodeId': cur})
                     par = await cdp.send('Runtime.callFunctionOn', {'objectId': o['object']['objectId'], 'functionDeclaration': 'function(){return this.parentElement}'})
                     if not par['result'].get('objectId'): break
                     cur = (await cdp.send('DOM.requestNode', {'objectId': par['result']['objectId']}))['nodeId']; depth += 1
                 if not win: continue
                 if win[0] == 'INLINE': continue
                 o = await cdp.send('DOM.resolveNode', {'nodeId': cur})
                 val = (await cdp.send('Runtime.callFunctionOn', {'objectId': o['object']['objectId'], 'functionDeclaration': 'function(p){const cs=getComputedStyle(this);return cs.getPropertyValue(p)+"|"+this.tagName+"."+String(this.className).slice(0,40)+"|"+(this.textContent||"").trim().slice(0,30)}', 'arguments': [{'value': prop}], 'returnByValue': True}))['result']['value']
                 key = (prop, win[0], win[1], win[2])
                 FOUND.setdefault(key, {'computed': val.split('|')[0], 'eg': val, 'where': set()})['where'].add(label)
           except Exception as e: pass
    print(label, cnt, len(FOUND), flush=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, p, cdp, served, errors = await open_page(b, W, H, touch=False)
        await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); await cdp.send('Runtime.enable')
        await p.wait_for_timeout(9000)
        go = lambda t: p.evaluate("(t)=>{const e=document.querySelector('#ccs-side [data-tab=\"'+t+'\"]');e&&e.click()}", t)
        click = lambda js: p.evaluate("()=>{const e=(%s);e&&e.click();return !!e}" % js)
        for t in ['today', 'orders', 'kitchen', 'calendar', 'customers', 'handover', 'register', 'settings', 'marketing', 'service']:
            await go(t); await p.wait_for_timeout(3000); await harvest(p, cdp, t)
        await go('orders'); await p.wait_for_timeout(1500)
        await click("[...document.querySelectorAll('#ccs-main button')].find(x=>/Upcoming/.test(x.textContent))"); await p.wait_for_timeout(1500)
        await harvest(p, cdp, 'orders-upcoming')
        await click("document.querySelector('#ccs-main [data-act=\"open-order\"], #ccs-main [data-act=\"open\"]')"); await p.wait_for_timeout(3000)
        await harvest(p, cdp, 'detail')
        for tab in ['Payment', 'More']:
            await click("[...document.querySelectorAll('#ccs-sheet button')].find(x=>x.textContent.trim().startsWith('%s'))" % tab); await p.wait_for_timeout(1200)
            await harvest(p, cdp, 'detail-' + tab)
        await p.keyboard.press('Escape'); await p.wait_for_timeout(800)
        await go('customers'); await p.wait_for_timeout(2500)
        await click("document.querySelector('#ccs-main tbody tr, #ccs-main [data-act=\"cust-open\"], #ccs-main [data-act=\"open-cust\"]')"); await p.wait_for_timeout(2500)
        await harvest(p, cdp, 'customer'); await p.keyboard.press('Escape'); await p.wait_for_timeout(800)
        await go('calendar'); await p.wait_for_timeout(2500)
        for vw in ['Week', 'Day', 'Year']:
            await click("[...document.querySelectorAll('#ccs-main button')].find(x=>x.textContent.trim()=='%s')" % vw); await p.wait_for_timeout(1500); await harvest(p, cdp, 'cal-' + vw)
        await go('dash'); await p.wait_for_timeout(6000); await harvest(p, cdp, 'dash')
        for i in range(1, 5):
            await p.evaluate("(i)=>{const b=[...document.querySelectorAll('#ccs-main .cc-nav5 button')][i];b&&b.click()}", i); await p.wait_for_timeout(3500)
            await harvest(p, cdp, 'dash%d' % i)
        await go('today'); await p.wait_for_timeout(1500)
        await p.evaluate("()=>{const b=document.querySelector('.ccs-newtop, .ccs-new');b&&b.click()}"); await p.wait_for_timeout(2000)
        await harvest(p, cdp, 'new1')
        n = [1]; orig = v.tapx
        async def tapx(pp, sel, wait=700):
            r = await orig(pp, sel, wait)
            if sel == '[data-act="sl-next"]':
                n[0] += 1; await pp.wait_for_timeout(600); await harvest(pp, cdp, 'new%d' % n[0])
            return r
        v.tapx = tapx
        await v.fill_order(p)
        await harvest(p, cdp, 'newEnd')
        await b.close()
    out = [{'prop': k[0], 'sel': k[1], 'val': k[2], 'media': list(k[3]), 'computed': d['computed'], 'eg': d['eg'], 'where': sorted(d['where'])} for k, d in FOUND.items()]
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
    print('rules', len(out))
asyncio.run(main())
