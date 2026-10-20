"""Staff page footer for the Birthday Club release (20 October 2026).

Changes exactly one thing and asserts that nothing else differs: the staff app loader line (commit, file and SRI) from a
manifest, by default dist/app/staff-birthday-club-manifest.json (the Birthday Club on the live release).
Usage: python3 build/footer_birthday_club.py IN OUT APP_COMMIT [MANIFEST]   (a commit of 40 zeros = the local test copy)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src, out, app_commit = sys.argv[1:4]
manifest = sys.argv[4] if len(sys.argv) > 4 else 'dist/app/staff-birthday-club-manifest.json'
assert re.fullmatch(r'[0-9a-f]{40}', app_commit)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-service-hub-manifest.json').read_text())
s = Path(src).read_text()

LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@e7a032ecd58c6ebe50148d008a418acfe78ec5fd/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
for a in (LIVE_APP, LIVE_SRI):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
t = s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"').replace(LIVE_SRI, 'k="' + m['sri'] + '"')
a, b = s.splitlines(), t.splitlines()
assert len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) == 1, 'more than the app loader line changed'
Path(out).write_text(t)
print('ok', len(t), m['file'])
