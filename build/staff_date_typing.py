"""Order dates typed on a keyboard (20 October 2026), on top of the live order list release.
The New order "Other date" field redrew the form on every keystroke, cutting the year off after its first digit.
Past dates stay allowed; nothing about the order rules changes."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-order-list-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
old = '"date"===o&&Tr(),'
assert s.count(old) == 1, 'Date redraw anchor changed'
# A typed date redraws the form only when its year has just been completed (four digits); edits to a date that is
# already complete wait until the field is left. Dates picked from a calendar (no typing) redraw at once, as before.
new = ('"date"===o&&function(p,c){n.__ccPrev=c;var k=function(v){return/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&v>="1000-01-01"};'
       'if(!n.__ccTyped||document.activeElement!==n||k(c)&&!k(p))return Tr();'
       'n.__ccWait||(n.__ccWait=1,n.addEventListener("blur",(function(){setTimeout((function(){n.isConnected&&Tr()}),200)}),{once:!0}))'
       '}(null==n.__ccPrev?n.defaultValue:n.__ccPrev,n.value),')
s = s.replace(old, new)
js = (ROOT / 'src/staff.date-typing.js').read_text(); assert '</script' not in js.lower()
s += '\n' + js + '\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-date-typing-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
