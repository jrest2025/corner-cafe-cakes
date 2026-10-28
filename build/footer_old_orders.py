"""Staff page footer for the old orders release (21 October 2026).

Changes exactly one line, the staff app loader (commit, file and SRI), from a manifest, by default
dist/app/staff-old-orders-manifest.json, and asserts that nothing else differs. The footer it starts from must be the
live footer of the Analytics look release (dist/app/staff-analytics-look-manifest.json, commit 8477990).
Usage: python3 build/footer_old_orders.py IN OUT APP_COMMIT [MANIFEST]   (a commit of 40 zeros = the local test copy)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src, out, app_commit = sys.argv[1:4]
manifest = sys.argv[4] if len(sys.argv) > 4 else 'dist/app/staff-old-orders-manifest.json'
assert re.fullmatch(r'[0-9a-f]{40}', app_commit)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-analytics-look-manifest.json').read_text())
s = Path(src).read_text()

LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@8477990309e8f001e8e5f1acc772918176e2dd65/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
for a in (LIVE_APP, LIVE_SRI):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
t = (s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"')
      .replace(LIVE_SRI, 'k="' + m['sri'] + '"'))
a, b = s.splitlines(), t.splitlines()
assert len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) == 1, 'more than the loader line changed'
Path(out).write_text(t)
print('ok', len(t), m['file'])
