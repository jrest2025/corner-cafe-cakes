"""Calendar quiet slots + clearer delete refusal (20 October 2026), on top of the live delete-customer release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-customer-delete-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
def rep(old, new):
    global s
    assert s.count(old) == 1, (old[:60], s.count(old)); s = s.replace(old, new)
# 1. Empty day slots: a faint + (label kept for screen readers and as a tooltip).
rep("""'" data-t="'+e+'">New order at '+Ft(e)+"</button>\"""",
    """'" data-t="'+e+'" aria-label="New order at '+Ft(e)+'" title="New order at '+Ft(e)+'"><span class="ccs-dadd-plus" aria-hidden="true">+</span></button>'""")
# 2. Delete customer: replace the embedded add-on with the current source.
old_js = (ROOT / 'build/.cd_prev.js').read_text()
rep(old_js, (ROOT / 'src/staff.customer-delete.js').read_text())
css = (ROOT / 'src/staff.calendar-quiet-slots.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-calendar-quiet-slots";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-calendar-quiet-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
