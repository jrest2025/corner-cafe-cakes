"""Cake for: the order's Cake section shows who a Birthday, Anniversary or Wedding cake is for, with a one-step change.
Built on the live colour release (staff-app.adbfa51232.js)."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
base = ROOT / 'dist/app/staff-app.adbfa51232.js'; s = base.read_text()
BASE_SRI = 'sha384-C6D9CzuOeQS/DyP6eX3VMF89h/M8MOzRvVaw2uB9PWt/5ZtB8MgdxWTB0y4ZzbMT'
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == BASE_SRI, 'Base is not the live release'
needle = 'function Ed(){y.settings=null'; assert s.count(needle) == 1
s = s.replace(needle, (ROOT / 'src/staff.cakefor.js').read_text() + '\n' + needle)
row = 'Tn("Occasion",a.occasion)+'; assert s.count(row) == 1
s = s.replace(row, row + 'cfRow(t,a)+')
css = (ROOT / 'src/staff.cakefor.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-cakefor";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': 'dist/app/staff-app.adbfa51232.js', 'base_sri': BASE_SRI}
(ROOT / 'dist/app/staff-cakefor-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
