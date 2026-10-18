"""Fit the screen: no small inner scroll boxes, side menu fits, calendar fills the window. On top of the live islands release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-islands-manifest.json').read_text())
base = ROOT / bm['file']; s = base.read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
needle = 'function Ed(){y.settings=null'; assert s.count(needle) == 1
s = s.replace(needle, (ROOT / 'src/staff.fit.js').read_text() + '\n' + needle)
css = (ROOT / 'src/staff.fit.css').read_text(); assert '</script' not in css.lower()
# Appended after every earlier style layer, so these rules come last.
s += '\n(function(){function add(){var s=document.getElementById("ccs-fit")||document.createElement("style");s.id="ccs-fit";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)}add();setTimeout(add,0)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-fit-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
