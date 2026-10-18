"""Build an isolated Cake Heartbeat overlay for the *current* hosted staff release.

Does not overwrite the main CRM bundle. Deploy only after reviewed browser QA.
Run from repo root: python3 build/staff_heartbeat.py
"""
from pathlib import Path
import base64, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "app"
OUT.mkdir(parents=True, exist_ok=True)
bridge = (ROOT / "src" / "staff.heartbeat.bridge.js").read_text()
module = (ROOT / "src" / "staff.heartbeat.js").read_text()
css = (ROOT / "src" / "staff.heartbeat.css").read_text()
assert bridge.count("/*@HEARTBEAT_MODULE@*/") == 1
assert "/*@HEARTBEAT_MODULE@*/" not in module
assert all("</script" not in s.lower() for s in (bridge, module, css))
assert "service_role" not in bridge and "service_role" not in module
code = bridge.replace("/*@HEARTBEAT_MODULE@*/", module)
# Style is scoped under #cc-staff; the live bundle remains unchanged.
code += "\n(function(){var s=document.createElement('style');s.id='cc-heartbeat-style';s.textContent=" + json.dumps(css) + ";document.head.appendChild(s);})();\n"
raw = code.encode("utf-8")
name = "cake-heartbeat." + hashlib.sha256(raw).hexdigest()[:12] + ".js"
(OUT / name).write_bytes(raw)
manifest = {
  "file": "dist/app/" + name,
  "sri": "sha384-" + base64.b64encode(hashlib.sha384(raw).digest()).decode(),
  "bytes": len(raw),
  "sha256": hashlib.sha256(raw).hexdigest(),
  "deployment": "Separate optional additional Webflow staff-page footer script; do not replace existing code or publish before review"
}
(OUT / "cake-heartbeat-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
