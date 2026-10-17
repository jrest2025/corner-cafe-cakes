"""Add Settings removal to the exact released icon bundle; retain all prior overlays."""
import base64,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];base=ROOT/'dist/app/staff-app.f47fa74ec9.js';s=base.read_text()
needle='function Ed(){y.settings=null'
assert s.count(needle)==1
s=s.replace(needle,(ROOT/'src/staff.settings-remove.js').read_text()+'\n'+needle)
needle='No orders have been deleted. Admins can delete any order from the order itself.</p>\')+"</div></details>":""}(t)}return e+"</div>"'
assert s.count(needle)==1
s=s.replace(needle,needle.replace('return e+"</div>"','return e+srSettingsView(t)+"</div>"'))
needle='case"del-closed":'
assert s.count(needle)==1
s=s.replace(needle,'case"sr-remove":srSettingsRemove(s);break;'+needle)
old='Nothing is deleted: take a cake, flavour or size off sale instead.'
assert s.count(old)==1
s=s.replace(old,'Take a cake, flavour or size off sale to keep its history. Administrators can remove unused entries below.')
css=(ROOT/'src/staff.settings-remove.css').read_text();s+='\n(function(){var s=document.createElement("style");s.id="ccs-settings-remove";s.textContent='+json.dumps(css)+';document.head.appendChild(s)})();\n'
raw=s.encode();name='staff-app.'+hashlib.sha256(raw).hexdigest()[:10]+'.js';(ROOT/'dist/app'/name).write_bytes(raw)
m={'file':'dist/app/'+name,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':str(base.relative_to(ROOT))};(ROOT/'dist/app/staff-settings-remove-manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m))
