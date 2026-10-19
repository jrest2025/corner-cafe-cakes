"""Screen fit for phones and tablets (20 October 2026), on top of the live flow polish release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-flow-polish-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
js = (ROOT / 'src/staff.screen-fit.js').read_text(); assert '</script' not in js.lower()
css = (ROOT / 'src/staff.screen-fit.css').read_text(); assert '</script' not in css.lower()
s += '\n' + js + '\n(function(){var s=document.createElement("style");s.id="ccs-screen-fit";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-screen-fit-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
