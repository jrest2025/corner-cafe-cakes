"""Staff page footer for the greeting and daily briefing release (21 October 2026). Roneel said "deploy" at 7:41 PM.

From the live footer (the touch standard release, md5 fa59265319d5b7adb6894351a152f22c) it changes one line: the staff
app loader (commit, file and SRI) to MANIFEST (default dist/app/staff-brief-manifest.json). The page head is not changed.
Usage: python3 build/page_release_brief_20261021.py FOOT_IN FOOT_OUT APP_COMMIT [MANIFEST]   (40 zeros = local test copy)
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
foot_in, foot_out, app_commit = sys.argv[1:4]
manifest = sys.argv[4] if len(sys.argv) > 4 else 'dist/app/staff-brief-manifest.json'
assert re.fullmatch(r'[0-9a-f]{40}', app_commit)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-touch-manifest.json').read_text())
s = Path(foot_in).read_text()
assert hashlib.md5(s.encode()).hexdigest() == 'fa59265319d5b7adb6894351a152f22c', 'footer is not the expected live footer'
LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@7103cd832bedf3751dd0ca98be04e9116424baba/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
for a in (LIVE_APP, LIVE_SRI):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
F = s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"').replace(LIVE_SRI, 'k="' + m['sri'] + '"')
a, b = s.splitlines(), F.splitlines()
assert len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) == 1, 'expected only the app loader line to change'
assert len(F) < 50000, 'footer over the 50,000 character limit'
Path(foot_out).write_text(F)
print(json.dumps({'footer': len(F), 'footer_md5': hashlib.md5(F.encode()).hexdigest(), 'app': m['file']}))
