"""More islands: Today, Kitchen Handover, Customers follow-ups pop-up, on top of the live Settings events release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-events-manifest.json').read_text())
base = ROOT / bm['file']; s = base.read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
needle = 'function Ed(){y.settings=null'; assert s.count(needle) == 1
s = s.replace(needle, (ROOT / 'src/staff.more-islands.js').read_text() + '\n' + needle)
css = (ROOT / 'src/staff.more-islands.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-more-islands";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-more-islands-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
