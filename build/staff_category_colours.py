"""Phase 1b (21 October 2026): donut legends keep their names, and one fixed colour per channel and occasion.

Appends src/staff.category-colours.css (styles) and src/staff.category-colours.js (display-only recolour of donuts whose
names are all known channels or occasions) to the live colour harmony release (staff-colour-harmony-manifest.json).
No data, calculation, chart type or chart code changes. Heartbeat, Daily cake demand and the Booking curve not targeted.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-colour-harmony-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-category-colours-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'ccs-category-colours' not in s, 'Base already has the category colours'
css = (ROOT / 'src/staff.category-colours.css').read_text()
js = (ROOT / 'src/staff.category-colours.js').read_text()
assert '</script' not in (css + js).lower() and '</style' not in css.lower()
s += ('\n(function(){var s=document.createElement("style");s.id="ccs-category-colours";s.textContent=' + json.dumps(css) +
      ';document.head.appendChild(s)})();\n' + js + '\n')
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
