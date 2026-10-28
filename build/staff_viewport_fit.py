"""Build the viewport correction on the published padding footer."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/history/rollback/staff-footer-before-viewport-fit-2026-10-18.html').read_text().rstrip('\n')
needle='document.head.appendChild(p)};s.onerror=go;'
assert s.count(needle)==1
css=(ROOT/'src/staff.viewport-fit.css').read_text();js=(ROOT/'src/staff.viewport-fit.js').read_text()
assert '</script' not in (css+js).lower()
new='document.head.appendChild(p);var v=document.createElement("style");v.id="ccs-viewport-fit";v.textContent='+json.dumps(css)+';document.head.appendChild(v);'+js+'};s.onerror=go;'
s=s.replace(needle,new);assert len(s)<50000
(ROOT/'dist/staff.viewport-fit.footer.html').write_text(s)
print('Footer characters:',len(s))
