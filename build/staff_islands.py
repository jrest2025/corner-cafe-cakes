"""Islands for Handover and Customers, on top of the calendar release candidate. Asserted, narrow insertion."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
cm = json.loads((ROOT / 'dist/app/staff-cal-occ-manifest.json').read_text())
base = ROOT / cm['file']; s = base.read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == cm['sri'], 'Base is not the calendar build'
needle = 'function Ed(){y.settings=null'
assert s.count(needle) == 1
s = s.replace(needle, (ROOT / 'src/staff.islands.js').read_text() + '\n' + needle)
css = (ROOT / 'src/staff.islands.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-islands";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': cm['file'], 'base_sri': cm['sri']}
(ROOT / 'dist/app/staff-islands-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
