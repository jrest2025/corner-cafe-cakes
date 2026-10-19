"""Build the independent Analytics workspace enhancement. Does not rebuild or replace the CRM engine."""
from pathlib import Path
import hashlib,base64,json
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'src/staff.analytics-workspace.css').read_text()
js=(ROOT/'src/staff.analytics-workspace.js').read_text()
assert '</script' not in (css+js).lower()
code='(function(){var s=document.getElementById("ccs-analytics-workspace-style");if(!s){s=document.createElement("style");s.id="ccs-analytics-workspace-style";document.head.appendChild(s)}s.textContent='+json.dumps(css)+';})();\n'+js
raw=code.encode();digest=hashlib.sha256(raw).hexdigest()[:10]
name='analytics-workspace.'+digest+'.js';path='dist/app/'+name
(ROOT/path).write_bytes(raw)
manifest={'file':path,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw)}
(ROOT/'dist/app/analytics-workspace-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
