"""Corner Café Service Hub: Jack's Restaurants shared sidebar contract, version 1 (21 October 2026). PREVIEW ONLY.

Visual only: no route, tab key, permission, sign-out, Practice mode, Heartbeat, phone bar or data change.
Live only when Roneel says "deploy" (see docs/sidebar-contract-2026-10-21.md).

Base: dist/app/staff-touch-manifest.json (the live bundle, 21 October 2026) unless BASE names another manifest; OUT names
the manifest written (default dist/app/staff-sidebar-contract-manifest.json).
The bundle becomes: the base, unchanged, then
  - src/staff.sidebar-contract.js (outline icons on each side menu item, the fold control's icon and tooltip);
  - the style element ccs-sidebar-contract (src/staff.sidebar-contract.css). Its rules carry one id more than the touch
    standard's prefix, so they win although staff.touch.js keeps the touch styles last on the page.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-touch-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-sidebar-contract-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCTouch' in s, 'Base has no touch standard'
assert 'CCSidebarContract' not in s and 'ccs-sidebar-contract' not in s, 'Base already has the sidebar contract'
js = (ROOT / 'src/staff.sidebar-contract.js').read_text()
css = (ROOT / 'src/staff.sidebar-contract.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower() and '</style' not in part.lower()
style = ('(function(){var h=document.head||document.documentElement,s=document.getElementById("ccs-sidebar-contract");'
         'if(!s){s=document.createElement("style");s.id="ccs-sidebar-contract";h.appendChild(s)}s.textContent=%s})();\n' % json.dumps(css))
s = s + '\n' + js + '\n' + style

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
