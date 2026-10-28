"""Delete customer (20 October 2026), on top of the live release."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
# Base: the live release (linear order steps, commit 3985975), checked by hash.
bm = {'file': 'dist/app/staff-app.flow-clean-20261019.js', 'sri': 'sha384-2zZuYggcGzET1xLJkJmfXO3nLRrC6S1tSYbdLDzSvkSo8CWsoBLXjAuUVWbDvY0b'}
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
needle = 'function Ed(){y.settings=null'; assert s.count(needle) == 1
s = s.replace(needle, (ROOT / 'src/staff.customer-delete.js').read_text() + '\n' + needle)
css = (ROOT / 'src/staff.customer-delete.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-customer-delete";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-customer-delete-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
