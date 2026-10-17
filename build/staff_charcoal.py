"""Append charcoal CSS to the released visual bundle, without changing its code."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
base = ROOT / 'dist/app/staff-app.bf7ec46675.js'
css = (ROOT / 'src/staff.charcoal.css').read_text()
assert '</script' not in css.lower()
extra = "\n(function(){var s=document.createElement('style');s.id='ccs-charcoal';s.textContent=" + json.dumps(css) + ";document.head.appendChild(s)})();\n"
raw = base.read_bytes() + extra.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
manifest = {'file':'dist/app/' + name,'sri':'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':str(base.relative_to(ROOT))}
(ROOT / 'dist/app/staff-charcoal-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
assert raw[:base.stat().st_size] == base.read_bytes()
print(json.dumps(manifest))
