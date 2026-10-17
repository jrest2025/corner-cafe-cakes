"""Narrow, asserted presentation-only replacements on the exact live bundle."""
import base64,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'dist/app/staff-app.9b965ca010.js'
s=base.read_text()
paths={
'refresh':'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/>',
'print':'<path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7z"/><path d="M16 11h1"/>',
'edit':'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
}
for kind,label,count in [('refresh','Refresh',4),('print','Print on this device',1),('edit','Edit',2)]:
 old='>'+label+'</button>'
 assert s.count(old)==count,(label,s.count(old))
 svg='<svg class="ui-icon ui-'+kind+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths[kind]+'</svg>'
 new=' title="'+label+'">'+svg+'<span class="ui-name">'+label+'</span><span class="ui-tooltip" aria-hidden="true">'+label+'</span></button>'
 s=s.replace(old,new)
css=(ROOT/'src/staff.icons.css').read_text()
assert '</script' not in css.lower()
s+='\n(function(){var s=document.createElement("style");s.id="ccs-icons";s.textContent='+json.dumps(css)+';document.head.appendChild(s)})();\n'
raw=s.encode();name='staff-app.'+hashlib.sha256(raw).hexdigest()[:10]+'.js'
(ROOT/'dist/app'/name).write_bytes(raw)
m={'file':'dist/app/'+name,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':str(base.relative_to(ROOT)),'icon_controls':7}
(ROOT/'dist/app/staff-icons-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps(m))
