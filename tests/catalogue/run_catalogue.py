"""Build Your Catalogue, Stage 1. Mock database, local libraries, invented products only."""
import asyncio, base64, copy, io, json, pathlib, subprocess, sys
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).parent; ROOT = HERE.parent.parent
OUT = HERE / "out"; OUT.mkdir(exist_ok=True)
SRC = ROOT / "src/catalogue/catalogue.js"
LIBS = {"jspdf": pathlib.Path("/tmp/libs/jspdf-2.5.1/package/dist/jspdf.umd.min.js"), "qrcode": pathlib.Path("/tmp/libs/qrcode-generator-1.4.4/package/qrcode.js")}
FONTS = ROOT / "dist/catalogue/fonts"
R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:300] if not ok and d != '' else ''))

def jpeg(color, w=900, h=700):
    im = Image.new("RGB", (w, h), color); d = ImageDraw.Draw(im); d.ellipse((w*.2, h*.15, w*.8, h*.85), fill=(250, 245, 235))
    b = io.BytesIO(); im.save(b, "JPEG", quality=85); return b.getvalue()
def png_logo():
    im = Image.new("RGBA", (800, 291), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rectangle((10, 60, 790, 230), outline=(58, 39, 31, 255), width=12)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
IMGS = {str(i): jpeg(c) for i, c in enumerate([(160, 60, 40), (190, 130, 70), (230, 225, 210), (170, 110, 60), (200, 90, 90), (90, 60, 40)], 1)}
LOGO = png_logo()

def item(i, name, avail='available', opts=None, desc='A festive treat made in our kitchen.', img=True, test=True, cat='Cake'):
    return {"id": "00000000-0000-4000-8000-%012d" % i, "code": "item-%d" % i, "name": name, "category": cat, "description": desc,
            "image_url": ("https://img.test/%d.jpg" % (((i - 1) % 6) + 1)) if img else None, "image_alt": name, "dietary_info": None, "allergen_info": None,
            "availability": avail, "ordering_note": None, "lead_days": None, "is_test": test,
            "options": opts if opts is not None else [{"label": "Standard", "price": None, "price_on_request": False}]}
BASE = {"ok": True, "today": "2026-10-14",
        "contact": {"name": "Corner Café", "address": "401–403 Queens Road, Nadi", "phone": "+679 892 2760", "email": "cornercafe@jacksfiji.com"},
        "collection": {"code": "festive-2026", "title": "Festive Collection 2026", "kicker": "Corner Café", "intro": "Christmas cakes, gingerbread houses and festive treats, made by our team at Corner Café in Nadi.",
                       "ordering_info": "To order, call us or send an email with the products, quantities and the date you need them. Our team confirms availability, final price and collection time with you.",
                       "deadline_text": "Order deadline: to be confirmed", "collection_text": "Collection from Corner Café, Nadi. Dates to be confirmed.",
                       "disclaimer": "Prices and availability are correct on the date this catalogue was made and may change. Your order is confirmed only when our team confirms it with you.",
                       "page_url": "https://www.cornercafefiji.com/festive", "show_prices": True, "is_test": True, "updated_at": "2026-10-14T00:00:00Z"},
        "items": [item(1, "Christmas Fruit Cake", opts=[{"label": "8 inch round", "price": 99, "price_on_request": False}, {"label": "10 inch round", "price": None, "price_on_request": False}]),
                  item(2, "Classic Gingerbread House", opts=[{"label": "Standard house", "price": 99, "price_on_request": False}]),
                  item(3, "White Chocolate Gingerbread House"),
                  item(4, "Christmas Mince Pies", opts=[{"label": "Box of 6", "price": None, "price_on_request": False}, {"label": "Box of 12", "price": None, "price_on_request": False}]),
                  item(5, "Decorated Christmas Cookies", avail="limited"),
                  item(6, "Chocolate Gingerbread House", avail="coming_soon", opts=[{"label": "Large, for sharing", "price": None, "price_on_request": True}]),
                  item(7, "Sold Out Yule Log", avail="sold_out")]}
LONG = "Rich, slow-baked fruit cake with brandy-soaked sultanas, currants and cherries, finished with marzipan, smooth white icing, hand-piped holly and a ribbon. Made to keep well through the holidays and slice neatly for a crowd, office or family table. " * 2
def big():
    d = copy.deepcopy(BASE); d["items"] = [item(i, "Festive Product Number %d With A Longer Name To Wrap" % i, desc=LONG[:400],
        opts=[{"label": "Option %d" % k, "price": 10 * k + i, "price_on_request": False} for k in range(1, 4)]) for i in range(1, 15)]
    return d

HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Festive test</title>
<style>body{margin:0;font-family:Arial}header{height:80px;background:#fff;border-bottom:1px solid #ddd}.ccfest-order-info{padding:60px 20px;background:#faf7f0}</style></head>
<body><header></header><main><a id="herolink" href="#collection">Order festive goodies</a>
<section class="ccfest-order-info"><h2>How festive ordering works</h2></section><section id="festive-order" style="height:400px"></section></main>
<script>window.CC_CATALOGUE_CONFIG={fontBase:'https://fonts.test/',logoUrl:'https://logo.test/logo.png'};</script>
<script src="https://code.test/catalogue.js"></script></body></html>"""

class Mock:
    def __init__(self): self.data = copy.deepcopy(BASE); self.calls = []; self.fail_after = None; self.log_reply = {"ok": True}; self.next_data = None
async def setup(b, mock, vp):
    ctx = await b.new_context(viewport=vp, is_mobile=vp['width'] < 760, has_touch=vp['width'] < 760, accept_downloads=True)
    pg = await ctx.new_page(); pg.set_default_timeout(15000); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    async def rpc(route):
        name = route.request.url.rsplit('/', 1)[-1]; body = json.loads(route.request.post_data or '{}'); mock.calls.append((name, body))
        if mock.fail_after is not None and len(mock.calls) > mock.fail_after: return await route.abort()
        if name == 'get_catalogue':
            d = mock.data
            if mock.next_data is not None and sum(1 for c in mock.calls if c[0] == 'get_catalogue') > 1: d = mock.next_data
            return await route.fulfill(status=200, content_type='application/json', body=json.dumps(d))
        return await route.fulfill(status=200, content_type='application/json', body=json.dumps(mock.log_reply))
    await pg.route("https://ilbrfwxblhidtlsjgxlh.supabase.co/**", rpc)
    await pg.route("https://page.test/**", lambda r: r.fulfill(status=200, content_type='text/html', body=HTML))
    await pg.route("https://code.test/catalogue.js", lambda r: r.fulfill(status=200, content_type='application/javascript', body=SRC.read_text()))
    async def cdn(route):
        u = route.request.url
        for k, p in LIBS.items():
            if p.name in u: return await route.fulfill(status=200, content_type='application/javascript', body=p.read_bytes(), headers={'Access-Control-Allow-Origin': '*'})
        await route.abort()
    await pg.route("https://cdn.jsdelivr.net/**", cdn); await pg.route("https://fastly.jsdelivr.net/**", cdn)
    await pg.route("https://fonts.test/**", lambda r: r.fulfill(status=200, body=(FONTS / r.request.url.rsplit('/', 1)[-1]).read_bytes(), headers={'Access-Control-Allow-Origin': '*'}))
    async def img(route):
        k = route.request.url.rsplit('/', 1)[-1].split('.')[0]
        if k == '6' and getattr(mock, 'break_img', False): return await route.fulfill(status=404, body='')
        await route.fulfill(status=200, content_type='image/jpeg', body=IMGS.get(k, IMGS['1']), headers={'Access-Control-Allow-Origin': '*'})
    await pg.route("https://img.test/**", img)
    await pg.route("https://logo.test/**", lambda r: r.fulfill(status=200, content_type='image/png', body=LOGO, headers={'Access-Control-Allow-Origin': '*'}))
    await pg.goto("https://page.test/festive"); await pg.wait_for_timeout(700)
    return ctx, pg, errs

async def click(pg, sel):
    await pg.evaluate("(s)=>{var e=document.querySelector(s); e&&e.click(); return !!e}", sel); await pg.wait_for_timeout(200)
async def wait_ready(pg, ms=15000):
    for _ in range(ms // 250):
        st = await pg.evaluate("window.CCCatalogue._state.sheet && window.CCCatalogue._state.sheet.state")
        if st in ('ready', 'error'): return st
        await pg.wait_for_timeout(250)
    return None
async def save_pdf(pg, name):
    b64 = await pg.evaluate("""async()=>{var b=window.CCCatalogue._state.sheet.blob;var a=new Uint8Array(await b.arrayBuffer());var s='';for(var i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}""")
    p = OUT / name; p.write_bytes(base64.b64decode(b64))
    txt = subprocess.run(['pdftotext', '-layout', str(p), '-'], capture_output=True, text=True).stdout
    pages = int(subprocess.run(['pdfinfo', str(p)], capture_output=True, text=True).stdout.split('Pages:')[1].split()[0])
    subprocess.run(['pdftoppm', '-png', '-r', '60', str(p), str(OUT / name.replace('.pdf', ''))])
    return p, txt, pages

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. Desktop: load, choose one, preview.
        m = Mock(); ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        t = await pg.inner_text('#cc-catalogue')
        check('section sits before How festive ordering works', await pg.evaluate("document.getElementById('cc-catalogue').nextElementSibling.className") == 'ccfest-order-info')
        check('links to the hidden product grid now go to the catalogue', await pg.get_attribute('#herolink', 'href') == '#cc-catalogue')
        check('heading and lead text', 'Build Your Festive Catalogue' in t and 'Choose your favourites and create a PDF to share with your team.' in t, t[:200])
        check('seven cards with TEST tags', await pg.locator('.ccc-card').count() == 7 and await pg.locator('.ccc-tag').count() == 7)
        check('Preview PDF waits until something is chosen', await pg.locator('[data-act="custom"][disabled]').count() == 1)
        check('sold out product cannot be included', await pg.locator('.ccc-inc[disabled]').count() == 1 and 'Sold out' in await pg.inner_text('.ccc-card.off'))
        check('no price shows as Price to be confirmed, on request shows Price on request', 'Price to be confirmed' in t and 'Price on request' in t and '$99' in t)
        check('availability in words', 'Limited quantity' in t and 'Coming soon' in t)
        await click(pg, '.ccc-inc[data-id$="000000000004"]')
        check('count updates in words', '1 product selected' in await pg.inner_text('.ccc-count'))
        check('include button shows Included and is pressed', await pg.locator('.ccc-inc[aria-pressed="true"]').inner_text() == 'Included')
        await click(pg, '[data-act="custom"]'); st = await wait_ready(pg)
        check('one product: PDF ready', st == 'ready', await pg.evaluate("JSON.stringify(window.CCCatalogue._state.sheet)"))
        f, txt, pages = await save_pdf(pg, 'one.pdf')
        check('one product fits one A4 page', pages == 1, pages)
        check('PDF has product, prices, how to order, date, test band', all(x in txt for x in ['Christmas Mince Pies', 'Box of 12', 'Price to be confirmed', 'How to order', 'Made on 14 October 2026', 'TEST CATALOGUE', 'Fiji dollars', 'YOUR SELECTION']), txt[:800])
        check('PDF leaves out products not chosen', 'Fruit Cake' not in txt)
        check('desktop preview shows the PDF inline', await pg.locator('#ccc-sheet iframe').count() == 1)
        check('Download button names the file', (await pg.get_attribute('#ccc-sheet [data-act="download"]', 'download')) == 'Corner-Cafe-Festive-Collection-2026-Your-Selection.pdf')
        check('generation counted with the chosen product only', [c for c in m.calls if c[0] == 'log_catalogue_generation'][-1][1]['p_item_ids'] == [BASE['items'][3]['id']])
        check('file is light enough for WhatsApp', f.stat().st_size < 1_500_000, f.stat().st_size)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        check('Escape closes the preview', await pg.locator('#ccc-sheet').count() == 0)
        # Full catalogue
        await click(pg, '[data-act="full"]'); st = await wait_ready(pg); f, txt, pages = await save_pdf(pg, 'full.pdf')
        check('full catalogue: every product except sold out', st == 'ready' and all(i['name'] in txt.replace('\n', ' ') for i in BASE['items'][:6]) and 'Sold Out Yule Log' not in txt, txt[:400])
        lst = subprocess.run(['pdfimages', '-list', str(f)], capture_output=True, text=True).stdout.splitlines()[2:]
        dims = [(int(l.split()[3]), int(l.split()[4])) for l in lst if l.split()[2] == 'image' and l.split()[8] == 'jpeg']
        check('photos cropped to the frame shape, not stretched (83 by 46)', dims and all(abs(w / h - 83 / 46) < 0.01 for w, h in dims), dims)
        check('full catalogue: page numbers and footer', 'Page 1 of %d' % pages in txt and 'cornercafefiji.com' in txt and 'FULL CATALOGUE' in txt)
        await click(pg, '[data-act="close"]')
        # Select all and persistence
        await click(pg, '[data-act="all"]')
        check('Select all picks every available product', '6 products selected' in await pg.inner_text('.ccc-count'))
        await pg.reload(); await pg.wait_for_timeout(800)
        check('selection kept after reload', '6 products selected' in await pg.inner_text('.ccc-count'))
        await click(pg, '[data-act="all"]')
        check('Clear selection empties it', 'No products selected yet' in await pg.inner_text('.ccc-count'))
        check('no page errors (desktop)', not errs, errs)
        await ctx.close()

        # 2. Price changed and product withdrawn between viewing and making.
        m = Mock(); nd = copy.deepcopy(BASE); nd['items'][0]['options'][0]['price'] = 120; nd['items'] = [i for i in nd['items'] if i['name'] != 'Christmas Mince Pies']; m.next_data = nd
        ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        await click(pg, '.ccc-inc[data-id$="000000000001"]'); await click(pg, '.ccc-inc[data-id$="000000000004"]')
        await click(pg, '[data-act="custom"]'); st = await wait_ready(pg); f, txt, pages = await save_pdf(pg, 'changed.pdf')
        check('uses the current price, not the one shown earlier', '$120' in txt and '$99' not in txt, txt[:500])
        check('withdrawn product left out and the guest is told', 'Mince Pies' not in txt and 'no longer available' in await pg.inner_text('#ccc-sheet'))
        await ctx.close()

        # 3. Long text and many products: several pages, nothing cut.
        m = Mock(); m.data = big(); ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        await click(pg, '[data-act="full"]'); st = await wait_ready(pg, 30000); f, txt, pages = await save_pdf(pg, 'big.pdf')
        check('14 long products run onto extra pages', st == 'ready' and pages >= 4, pages)
        check('every product name appears', all(('Number %d ' % i) in txt for i in range(1, 15)))
        bad = subprocess.run(['pdftotext', '-bbox', str(f), '-'], capture_output=True, text=True).stdout
        import re
        ys = [float(m_.group(1)) for m_ in re.finditer(r'yMax="([0-9.]+)"', bad)]
        check('no text below the footer line or off the page', max(ys) < 842 - 20, max(ys))
        await ctx.close()

        # 4. Network failure, busy reply, broken photo.
        m = Mock(); ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        m.fail_after = len(m.calls)
        await click(pg, '[data-act="full"]'); st = await wait_ready(pg)
        check('lost connection: clear message and Try again', st == 'error' and 'connection' in await pg.inner_text('#ccc-sheet') and await pg.locator('#ccc-sheet [data-act="retry"]').count() == 1)
        m.fail_after = None; await click(pg, '#ccc-sheet [data-act="retry"]'); st = await wait_ready(pg)
        check('Try again works once the connection is back', st == 'ready')
        await click(pg, '[data-act="close"]')
        m.log_reply = {"ok": False, "error": "busy", "message": "Too many catalogues are being made right now. Please try again in a few minutes."}
        await click(pg, '[data-act="full"]'); st = await wait_ready(pg)
        check('busy reply shown in plain words, no PDF', st == 'error' and 'Too many catalogues' in await pg.inner_text('#ccc-sheet'))
        await click(pg, '[data-act="close"]'); m.log_reply = {"ok": True}; m.break_img = True
        await click(pg, '[data-act="full"]'); st = await wait_ready(pg); f, txt, pages = await save_pdf(pg, 'noimg.pdf')
        check('missing photo: PDF still made with a plain panel', st == 'ready' and 'Chocolate Gingerbread House' in txt)
        check('no page errors (failures)', not errs, errs)
        await ctx.close()

        # 5. Catalogue switched off, and load failure.
        m = Mock(); m.data = {"ok": False, "error": "closed", "message": "This catalogue is not available right now."}
        ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        check('switched off: plain message, no buttons', 'not available right now' in await pg.inner_text('#cc-catalogue') and await pg.locator('[data-act="full"]').count() == 0)
        await ctx.close()

        # 6. Phone.
        m = Mock(); ctx, pg, errs = await setup(b, m, {'width': 375, 'height': 740})
        w = await pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        check('phone: nothing runs off the side', w[0] <= w[1], w)
        small = await pg.evaluate("[].slice.call(document.querySelectorAll('#cc-catalogue button')).filter(function(b){var r=b.getBoundingClientRect();return r.height<44}).length")
        check('phone: every button at least 44 pixels tall', small == 0, small)
        await click(pg, '.ccc-inc[data-id$="000000000002"]'); await click(pg, '.ccc-inc[data-id$="000000000003"]')
        await pg.evaluate("document.querySelectorAll('.ccc-card')[1].scrollIntoView()"); await pg.wait_for_timeout(200)
        bar = await pg.evaluate("(function(){var r=document.querySelector('.ccc-bar').getBoundingClientRect();return [r.top,r.bottom,innerHeight]})()")
        check('phone: selected count and Preview stay at the bottom of the screen', bar[1] <= bar[2] + 1 and bar[0] > bar[2] - 120, bar)
        await pg.screenshot(path=str(OUT / 'phone-list.png'))
        await click(pg, '[data-act="custom"]'); st = await wait_ready(pg)
        check('phone: no inline PDF; Open PDF and Download offered', st == 'ready' and await pg.locator('#ccc-sheet iframe').count() == 0 and await pg.locator('#ccc-sheet a[target="_blank"]').count() == 1 and await pg.locator('#ccc-sheet [data-act="download"]').count() == 1)
        sh = await pg.evaluate("(function(){var r=document.querySelector('.ccc-panel').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()")
        check('phone: preview fills the screen and stays inside it', sh[0] >= 0 and sh[1] >= 0 and sh[2] <= sh[4] + 1 and sh[3] <= sh[5] + 1, sh)
        await pg.screenshot(path=str(OUT / 'phone-ready.png'))
        check('no page errors (phone)', not errs, errs)
        await ctx.close()
        m = Mock(); ctx, pg, errs = await setup(b, m, {'width': 1366, 'height': 900})
        await pg.screenshot(path=str(OUT / 'desktop-list.png'), full_page=True)
        await click(pg, '.ccc-inc[data-id$="000000000001"]'); await click(pg, '[data-act="custom"]'); await wait_ready(pg); await pg.wait_for_timeout(600)
        await pg.screenshot(path=str(OUT / 'desktop-ready.png'))
        await ctx.close()
        await b.close()
    print('%d of %d passed' % (sum(R), len(R)))
    sys.exit(0 if all(R) else 1)
asyncio.run(main())
