from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/rollback/staff-footer-before-executive-2026-10-18.html').read_text().rstrip('\n')
needle='};s.onerror=go;';assert s.count(needle)==1
css=(ROOT/'src/staff.executive.css').read_text();assert '</script' not in css.lower()
s=s.replace(needle,'var e=document.createElement("style");e.id="ccs-executive";e.textContent='+json.dumps(css)+';document.head.appendChild(e)};s.onerror=go;')
assert len(s)<50000
(ROOT/'dist/staff.executive.footer.html').write_text(s)
print('Executive footer:',len(s),'characters')
