"""Analytics stage 2b (27 Oct 2026 audit): anchored fixes on the live staff app.

Starts from the live build (dist/app/staff-app.61d3858119.js, checked against its SRI first), applies only the
changes below (each anchor must match exactly once), and writes a new fingerprinted build plus its manifest.
No database, guest asset or Webflow change. The older build stays in dist/app for rollback.

Fixes (audit numbers):
  D8  With a cake filter on, and in "Cakes ranked", a single-cake order's value is its value after refunds
      (previously list price x quantity, refunds ignored).
  D8b "Average order" divides by priced orders only; unpriced orders no longer pull it down as $0.
  D9  "To collect before pickup" counts confirmed orders, the same rule as "Still owed".
  D5  The Occasions caption says what it counts: since the launch, or all history when older orders are shown.
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'dist/app/staff-app.61d3858119.js'
BASE_SRI = 'sha384-heG0BJKRxx0VZEXg5u0XpSFS2jPA9jFoB04oiYU33l7mmFg0XgUHtqYKveIG9P0U'

raw = BASE.read_bytes()
assert 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode() == BASE_SRI, 'Base is not the live build'
s = raw.decode('utf-8')

FIXES = [
    # D8: a cake filter keeps refunds for single-cake orders
    ('function pc(e){return"all"===ve.f.prod?e.net:dc(e).reduce((function(e,t){return e+Xo(t[4])*(Xo(t[3])||1)}),0)}',
     'function pc(e){if("all"===ve.f.prod)return e.net;var t=dc(e);if(1===(e.it||[]).length)return t.length?e.net:0;return t.reduce((function(e,t){return e+Xo(t[4])*(Xo(t[3])||1)}),0)}'),
    # D8b: average over priced orders
    ('function mc(e){var t=e.length,a=0,n=0;return e.forEach((function(e){a+=uc(e),n+=pc(e)})),{n:t,c:a,v:n,aov:t?n/t:0}}',
     'function mc(e){var t=e.length,a=0,n=0,r=0;return e.forEach((function(e){var s=pc(e);a+=uc(e),n+=s,s>0&&r++})),{n:t,c:a,v:n,aov:r?n/r:0,priced:r}}'),
    # D8: Cakes ranked uses the order's value after refunds when the order is one cake
    ("return x.items(o).map(function (i) { var q = num(i[3]) || 1; return [fn(i), q, num(i[4]) * q]; });",
     "var its = x.items(o), one = (o.it || []).length === 1; return its.map(function (i) { var q = num(i[3]) || 1; return [fn(i), q, one ? x.value(o) : num(i[4]) * q]; });"),
    # D8b: say when some completed orders have no price
    ("'Per completed order'",
     "(cs.n > (cs.priced || cs.n) ? 'Per priced order · ' + x.num(cs.n - cs.priced) + ' not priced' : 'Per completed order')"),
    # D9: same status rule as Still owed
    ("var owe = in30.filter(function (o) { return o.live && num(o.bal) > 0.005; });",
     "var owe = in30.filter(function (o) { return o.live && o.st === 'confirmed' && num(o.bal) > 0.005; });"),
    # D5: honest Occasions caption
    ("var note = '<p class=\"cat-cap\">Every year on record, including sheet orders. Use the choices below to narrow it down.</p>';",
     "var note = '<p class=\"cat-cap\">' + (x.st && x.st.showOld ? 'All recorded history, including sheet orders.' : 'Since the launch.') + ' Use the choices below to narrow it down.</p>';"),
]
for old, new in FIXES:
    n = s.count(old)
    assert n == 1, ('anchor must match once', n, old[:80])
    s = s.replace(old, new)
assert '</script' not in s.lower()

out = s.encode('utf-8')
name = 'staff-app.' + hashlib.sha256(out).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(out)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(out).digest()).decode()
manifest = {'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(out), 'base': BASE.name, 'base_sri': BASE_SRI, 'fixes': len(FIXES)}
(ROOT / 'dist/app/staff-analytics-fix-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
