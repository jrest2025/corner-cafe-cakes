"""Staff page footer for the white logo and Service Hub release (20 October 2026).

Changes exactly two things in the footer and asserts that nothing else differs:
  - the staff app loader line: commit, file and SRI from dist/app/staff-service-hub-manifest.json;
  - the semantic colour loader: the pinned commit of src/staff.semantic-colour.css.
Usage: python3 build/footer_service_hub.py IN OUT APP_COMMIT COLOUR_COMMIT   (commits of 40 zeros = local test copies)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src, out, app_commit, colour_commit = sys.argv[1:5]
assert re.fullmatch(r'[0-9a-f]{40}', app_commit) and re.fullmatch(r'[0-9a-f]{40}', colour_commit)
m = json.loads((ROOT / 'dist/app/staff-service-hub-manifest.json').read_text())
s = Path(src).read_text()

LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@1b455260411b21920ace44af4a9c503e704071e2/dist/app/staff-app.d46554c3c8.js"'
LIVE_SRI = 'k="sha384-ujx0z+B8JpyFa1E9VHBIiTNE1KJn/8HExMHxupaoUVoKSMFu4sJ/tGnpT5laS0kU"'
LIVE_COLOUR = "var sha='4741dbb2e6806a9ff3093fd7dc06dd7e1ec7f3a4',name='staff.semantic-colour.css'"
for a in (LIVE_APP, LIVE_SRI, LIVE_COLOUR):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:60]
assert m['base'] == 'dist/app/staff-app.d46554c3c8.js'
t = (s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"')
      .replace(LIVE_SRI, 'k="' + m['sri'] + '"')
      .replace(LIVE_COLOUR, "var sha='" + colour_commit + "',name='staff.semantic-colour.css'"))
a, b = s.splitlines(), t.splitlines()
assert len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) == 2, 'more than the two loader lines changed'
Path(out).write_text(t)
print('ok', len(t))
