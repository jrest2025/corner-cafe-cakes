"""Build a padding-only footer from the exact published layout loader."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'docs/rollback/staff-footer-before-padding-2026-10-18.html'
s=source.read_text().rstrip('\n')
assert 'staff-app.2e90891108.js' in s
css=(ROOT/'src/staff.padding.css').read_text()
assert '</script' not in css.lower()
needle='s.onerror=go;document.body.appendChild(s)'
assert s.count(needle)==1
onload='s.onload=function(){var p=document.createElement("style");p.id="ccs-padding";p.textContent='+json.dumps(css)+';document.head.appendChild(p)};'
s=s.replace(needle,onload+needle)
assert len(s)<50000
(ROOT/'dist/staff.padding.footer.html').write_text(s)
print('Built padding footer: '+str(len(s))+' characters')
