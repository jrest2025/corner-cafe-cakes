from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'docs/history/rollback/staff-footer-before-customer-crm-2026-10-18.html').read_text().rstrip('\n')
needle='};s.onerror=go;';assert s.count(needle)==1
css=(ROOT/'src/staff.dashboard-theme.css').read_text()+'\n'+(ROOT/'src/staff.customer-crm.css').read_text();js=(ROOT/'src/staff.customer-crm.js').read_text();assert '</script' not in (css+js).lower()
new='var c=document.createElement("style");c.id="ccs-customer-crm";c.textContent='+json.dumps(css)+';document.head.appendChild(c);'+js+'};s.onerror=go;'
s=s.replace(needle,new);assert len(s)<50000
(ROOT/'dist/staff.customer-crm.footer.html').write_text(s)
print('CRM footer:',len(s),'characters')
