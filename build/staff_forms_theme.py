from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/rollback/staff-footer-before-forms-theme-2026-10-18.html').read_text().rstrip('\n')
needle='};s.onerror=go;';assert s.count(needle)==1
css=(ROOT/'src/staff.forms-theme.css').read_text();assert '</script' not in css.lower()
s=s.replace(needle,';var f=document.createElement("style");f.id="ccs-forms-theme";f.textContent='+json.dumps(css)+';document.head.appendChild(f)};s.onerror=go;')
assert len(s)<50000
(ROOT/'dist/staff.forms-theme.footer.html').write_text(s)
print('Forms theme footer:',len(s),'characters')
