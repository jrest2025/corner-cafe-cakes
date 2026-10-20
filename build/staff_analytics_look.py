"""Corner Café Analytics: one look everywhere (20 October 2026).

Roneel: "I THINK CORNER CAFE IS DONE .. THE ONLY THING TO DO IS REFINE THE ANALYTICS SECTION=S .. ITS LOOKS LIKE LOOSE
ENDS.." Of the four fixes offered he chose only "One look everywhere": Overview gets the same white boxes and cards as the
other tabs, with one period choice per tab. (Not chosen, so not done: one period per page, no empty boxes or repeats,
plain words and phone fit.)

Styles only. The Cake Heartbeat's code, content, order and figures are unchanged, and the Daily cake demand rail is not
touched at all; the staff app's code is unchanged too. This appends src/staff.analytics-look.css to the live release.

Base: the live release (dist/app/staff-order-flow-manifest.json) unless BASE names another manifest.
OUT names the manifest written (default dist/app/staff-analytics-look-manifest.json).
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-order-flow-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-analytics-look-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'ccs-analytics-look' not in s, 'Base already has the Analytics look'

css = (ROOT / 'src/staff.analytics-look.css').read_text()
assert '</script' not in css.lower() and '</style' not in css.lower()
s += ('\n(function(){var s=document.createElement("style");s.id="ccs-analytics-look";s.textContent=' + json.dumps(css) +
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
