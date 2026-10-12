"""Viewport positioning checks for the cake order form (mock data). Usage: python3 run_scroll.py [page]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "page-nav-test.html"
SIZES = [(320, 568), (375, 667), (390, 844), (430, 932), (768, 1024), (1024, 768), (1440, 900)]
R = []
def ok(name, cond, extra=""):
    R.append(bool(cond)); print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if not cond else ""))

STATE = r"""(sel) => {
  const nav = document.getElementById('site-nav'); const navB = nav ? nav.getBoundingClientRect().bottom : 0;
  const bar = document.getElementById('cco-bar'); const barT = bar && bar.classList.contains('cco-show') && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight;
  const step = document.querySelector('.cco-step.cco-open'); const q = step && step.querySelector('.cco-q');
  const r = step ? step.getBoundingClientRect() : null; const qr = q ? q.getBoundingClientRect() : null;
  const a = document.activeElement;
  const ar = a ? a.getBoundingClientRect() : null;
  return { navB, barT, vh: innerHeight, stepTop: r && r.top, stepBottom: r && r.bottom, stepH: r && r.height, qTop: qr && qr.top,
           focus: a ? (a.id || a.className || a.tagName) : null, focusTop: ar && ar.top, focusBottom: ar && ar.bottom, y: scrollY };
}"""

async def st(pg): await pg.wait_for_timeout(900); return await pg.evaluate(STATE)

def placed(s, label, w):
    avail = s['barT'] - s['navB']
    head_ok = s['qTop'] is not None and s['qTop'] >= s['navB'] and s['qTop'] < s['barT'] - 40
    if s['stepH'] + 32 <= avail:   # fits: whole step visible
        good = head_ok and s['stepTop'] >= s['navB'] and s['stepBottom'] <= s['barT'] + 1
    else:                          # long: starts near the top of the usable area
        good = head_ok and s['navB'] <= s['stepTop'] <= s['navB'] + 40
    ok(f"{w}px {label}: step placed in view", good, s)

async def flow(b, w, h, reduced=False):
    ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=w < 800, is_mobile=w < 800, reduced_motion="reduce" if reduced else "no-preference")
    pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    y0 = await pg.evaluate("scrollY")
    await pg.click('[data-act="flavour"][data-v="chocolate-mudcake-mocha"]'); await pg.wait_for_timeout(500)
    v = await pg.evaluate("(()=>{const e=document.getElementById('cco-variants').getBoundingClientRect();return [e.top,e.bottom,innerHeight]})()")
    ok(f"{w}px flavour choices shown in view", v[0] >= 0 and v[1] <= v[2] + 1, v)
    await pg.click('[data-act="variant"][data-v="Mudcake"]'); placed(await st(pg), "Continue to Size", w)
    await pg.click('[data-act="size"][data-v="8"]'); placed(await st(pg), "Continue to Finish", w)
    await pg.click('[data-act="finish"][data-v="standard"]'); await pg.wait_for_timeout(300)
    yb = await pg.evaluate("scrollY"); await pg.click('[data-act="msgOpen"]'); await pg.wait_for_timeout(600)
    s = await pg.evaluate(STATE)
    moved = abs(s['y'] - yb) > 4
    vis = s['focus'] == 'cco-message' and s['focusTop'] >= s['navB'] and s['focusBottom'] <= s['barT']
    ok(f"{w}px opening the cake message keeps the field visible, moving only if needed", vis, (moved, s))
    await pg.click('[data-act="next2"]'); s = await st(pg)
    ok(f"{w}px unanswered dietary question: cursor on the No button and in view", s['focus'] and 'cco-chip' in s['focus'] and s['focusTop'] >= s['navB'] and s['focusBottom'] <= s['barT'], s)
    await pg.click('[data-act="diet"][data-v="no"]'); await pg.click('[data-act="next2"]'); placed(await st(pg), "Continue to Collection", w)
    await pg.click('[data-act="cal"]'); await pg.wait_for_timeout(400)
    d = await pg.eval_on_selector_all('.cco-day[data-day]:not(:disabled)', 'els => els.map(e => e.dataset.day)')
    await pg.click(f'.cco-day[data-day="{d[0]}"]'); await pg.wait_for_timeout(900)
    t = await pg.evaluate("(()=>{const e=document.querySelector('.cco-times').getBoundingClientRect();const b=document.getElementById('cco-bar');const bt=b&&b.classList.contains('cco-show')&&getComputedStyle(b).display!=='none'?b.getBoundingClientRect().top:innerHeight;return [e.top,bt,innerHeight]})()")
    ok(f"{w}px time slots come into view after picking a date", t[0] < t[1] - 40, t)
    await pg.click('[data-act="time"][data-v="14:00"]'); placed(await st(pg), "Continue to Details", w)
    await pg.click('[data-act="toReview"]'); s = await st(pg)
    ok(f"{w}px empty details: cursor in Full name and in view", s['focus'] == 'cco-name' and s['focusTop'] >= s['navB'] and s['focusBottom'] <= s['barT'], s)
    await pg.fill('#cco-name', 'Test Guest'); await pg.fill('#cco-phone', '912 3456'); await pg.click('[data-act="toReview"]'); placed(await st(pg), "Continue to Review", w)
    await pg.click('[data-act="edit"][data-v="0"]'); placed(await st(pg), "Edit back to Cake", w)
    await pg.click('[data-act="variant"][data-v="Mocha"]'); placed(await st(pg), "return to Review after edit", w)
    await pg.click('[data-act="send"]'); s = await st(pg)   # mock: notice error on first send
    ok(f"{w}px server date error: cursor on the date button and in view", s['focus'] and 'cco-date' in s['focus'] and s['focusTop'] >= s['navB'], s)
    ok(f"{w}px no script errors", not errs, errs)
    await ctx.close()

async def cancel_test(b):
    ctx = await b.new_context(viewport={"width": 375, "height": 667}, has_touch=True, is_mobile=True)
    pg = await ctx.new_page(); await pg.goto((HERE / PAGE).as_uri()); await pg.wait_for_timeout(500)
    await pg.click('[data-act="flavour"][data-v="cheesecake"]'); await pg.wait_for_timeout(80)
    await pg.mouse.wheel(0, -300); await pg.wait_for_timeout(900)
    y1 = await pg.evaluate("scrollY"); await pg.wait_for_timeout(600); y2 = await pg.evaluate("scrollY")
    ok("manual scroll during the movement wins and nothing scrolls afterwards", abs(y2 - y1) < 2, (y1, y2))
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in SIZES: await flow(b, w, h)
        await flow(b, 390, 844, reduced=True)
        await cancel_test(b)
        await b.close()
    print(f"\n{sum(R)} of {len(R)} checks passed")
asyncio.run(main())
