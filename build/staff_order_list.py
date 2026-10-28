"""Order list (20 October 2026): no repeated date on cards under a day heading; year on headings far from today. On top of the live screen fit release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-screen-fit-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
old = '\'<p class="ccs-day"><span>\'+Tt(Lt(c))+"</span><em>"+t.n+(1===t.n?" order":" orders")+" · "+t.c+(1===t.c?" cake":" cakes")+\'</em></p><div class="ccs-list">\''
assert s.count(old) == 1, 'Day heading anchor changed'
# Year shown when the date is in another year or more than 90 days from today, so an old or far-off order is never mistaken for a recent one.
new = ('\'<p class="ccs-day"><span>\'+Tt(Lt(c))+(function(d,t){var g=(new Date(d+"T12:00:00Z")-new Date(t+"T12:00:00Z"))/864e5;'
       'return d.slice(0,4)!==t.slice(0,4)||g<-90||g>90?\' <span class="cc-yr">\'+d.slice(0,4)+"</span>":""})(c,Dt())'
       '+"</span><em>"+t.n+(1===t.n?" order":" orders")+" · "+t.c+(1===t.c?" cake":" cakes")+\'</em></p><div class="ccs-list cc-grouped">\'')
s = s.replace(old, new)
css = (ROOT / 'src/staff.order-list.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-order-list";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-order-list-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
