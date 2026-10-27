"""Pickup date guard on New order (22 October 2026, approved by Roneel), on top of the live sidebar contract release
(staff-app.efbea59dfe.js, live 21 Oct 11:37 PM). Daily Cake Demand found 16 orders typed in after their pickup day with
"Today" as the order day, and 4 with the year saved as 1 or 2. Old order (paper slips) already checks both. This adds the
same two checks to the pickup-date step of a New order, so a past pickup can only be saved with an order day on or before
it, and a pickup year must be sensible. No data, database, calculation or other step changes."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
base = 'dist/app/staff-app.efbea59dfe.js'
LIVE_SRI = 'sha384-y4Tpu58/46mvOlv2T/VfHRSf3oIahcHYva0VV/G5vpmEzYN/ZRhi+5l/aO+l6YS/'
s = (ROOT / base).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == LIVE_SRI, 'Base is not the live release'
old = 'if(3===e){if(V.old&&window.CCOldOrders){var oo=window.CCOldOrders.missing(3,V);if(oo.length)return oo}'
assert s.count(old) == 1, 'Pickup step anchor changed'
new = old + ('if(!V.old&&V.date){if(V.date<"2015-01-01"||V.date>jt(Dt(),730))return["Check the year of the pickup date"];'
             'if(V.date<Dt()&&("yesterday"===V.taken?jt(Dt(),-1):"other"===V.taken?V.takenDate:Dt())>V.date)'
             'return["This pickup day is before the day they ordered. For a cake already picked up (a paper slip), tap Old order at the top"]}')
s = s.replace(old, new)
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': base, 'base_sri': LIVE_SRI}
(ROOT / 'dist/app/staff-pickup-guard-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
