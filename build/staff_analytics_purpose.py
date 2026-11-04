"""Purpose-led analytics presentation on the published Service Hub bundle.
Does not include the separate unpublished Marketing campaign candidate.
"""
import base64, hashlib, json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = 'e7a032ecd58c6ebe50148d008a418acfe78ec5fd'
bm = json.loads((ROOT/'dist/app/staff-service-hub-manifest.json').read_text())
s = (ROOT/bm['file']).read_text()
def sri(s): return 'sha384-'+base64.b64encode(hashlib.sha384(s.encode()).digest()).decode()
assert sri(s) == bm['sri']
# Only replace the tab presentation and its styles. Core logic and all add-ons remain byte-identical.
old = subprocess.check_output(['git','show',BASE+':src/staff.analytics-tabs.js'],cwd=ROOT).decode()
new = (ROOT/'src/staff.analytics-tabs.js').read_text()
assert s.count(old) == 1
s = s.replace(old,new)
old_css = subprocess.check_output(['git','show',BASE+':src/staff.analytics-tabs.css'],cwd=ROOT).decode()
new_css = (ROOT/'src/staff.analytics-tabs.css').read_text()
assert s.count(json.dumps(old_css)) == 1
s = s.replace(json.dumps(old_css),json.dumps(new_css))
f = 'dist/app/staff-app.'+hashlib.sha256(s.encode()).hexdigest()[:10]+'.js'
(ROOT/f).write_text(s)
subprocess.run(['node','--check',str(ROOT/f)],check=True)
m={'file':f,'sri':sri(s),'bytes':len(s.encode()),'base':bm['file'],'base_sri':bm['sri']}
(ROOT/'dist/app/staff-analytics-purpose-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps(m))
