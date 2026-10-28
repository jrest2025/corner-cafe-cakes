from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/history/rollback/staff-footer-before-readability-2026-10-18.html').read_text().rstrip('\n')
needle='};s.onerror=go;';assert s.count(needle)==1
css=(ROOT/'src/staff.readability.css').read_text();assert '</script' not in css.lower()
s=s.replace(needle,';var r=document.createElement("style");r.id="ccs-readability";r.textContent='+json.dumps(css)+';document.head.appendChild(r)};s.onerror=go;')
assert len(s)<50000
(ROOT/'dist/staff.readability.footer.html').write_text(s)
print('Readability footer:',len(s),'characters')
