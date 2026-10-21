"""Corner Café staff app: Settings, Communications, Email templates (22 October 2026). PREVIEW until Roneel says "deploy".

Base: the live release (dist/app/staff-sidebar-contract-manifest.json, staff-app.efbea59dfe.js) unless BASE names another
manifest; OUT names the manifest written (default dist/app/staff-email-templates-manifest.json).
Changes to the base bundle, each asserted:
  1. window.__ccsBc (the client the app lends add-ons) also gets invoke(name, body), the app's own signed-in Edge Function call.
  2. Appends src/staff.email-templates.js and the style element ccs-email-templates (src/staff.email-templates.css).
Nothing else in the bundle changes: no screen, permission, order, payment, Heartbeat or Daily Cake Demand change.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-sidebar-contract-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-email-templates-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCEmailTemplates' not in s, 'Base already has Email templates'
old = '__ccsBc=window.__ccsBc={rpc:function(e,t){return a.rpc(e,t)},'
assert s.count(old) == 1, 'client anchor not unique'
s = s.replace(old, old + 'invoke:function(e,t){return a.functions.invoke(e,{body:t})},')
js = (ROOT / 'src/staff.email-templates.js').read_text()
css = (ROOT / 'src/staff.email-templates.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower() and '</style' not in part.lower()
style = ('(function(){var h=document.head||document.documentElement,s=document.getElementById("ccs-email-templates");'
         'if(!s){s=document.createElement("style");s.id="ccs-email-templates";h.appendChild(s)}s.textContent=%s})();\n' % json.dumps(css))
s = s + '\n' + js + '\n' + style
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
