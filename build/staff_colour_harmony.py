"""Jack's Restaurants universal colour and chart-weight tokens, phase 1: Corner Café Cake CRM Analytics (21 October 2026).

Styles only. Appends src/staff.colour-harmony.css to the live release (greeting and briefing, staff-brief-manifest.json).
No data, calculation, chart type, axis or behaviour changes. The Cake Heartbeat, Daily cake demand rail, Seasonal booking
buildup and the Occasions Booking curve are not targeted by any rule.
BASE names another base manifest; OUT names the manifest written.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-brief-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-colour-harmony-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'ccs-colour-harmony' not in s, 'Base already has the colour harmony layer'

css = (ROOT / 'src/staff.colour-harmony.css').read_text()
assert '</script' not in css.lower() and '</style' not in css.lower()
s += ('\n(function(){var s=document.createElement("style");s.id="ccs-colour-harmony";s.textContent=' + json.dumps(css) +
      ';document.head.appendChild(s)})();\n')

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
