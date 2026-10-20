"""Staff page footer for the New order flow release (20 October 2026).

Changes exactly two lines and asserts that nothing else differs:
  1. the staff app loader (commit, file and SRI), from a manifest, by default dist/app/staff-order-flow-manifest.json;
  2. the compact-entry add-on's list of questions to fold into "Select · Required" menus becomes empty, so marketing
     permission, how they ordered and when they ordered show as plain buttons (Roneel approved "No hidden menus").
     The add-on keeps hiding its handful of repeated hints.
Usage: python3 build/footer_order_flow.py IN OUT APP_COMMIT [MANIFEST]   (a commit of 40 zeros = the local test copy)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src, out, app_commit = sys.argv[1:4]
manifest = sys.argv[4] if len(sys.argv) > 4 else 'dist/app/staff-order-flow-manifest.json'
assert re.fullmatch(r'[0-9a-f]{40}', app_commit)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-birthday-club-manifest.json').read_text())
s = Path(src).read_text()

LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@11d3c84544583bd289fcd7e7daf93e10d61846ef/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
COMPACT = "      [['n-source', 'Order source', 'source'], ['n-taken', 'Order date', 'date'], ['sl-opt', 'Marketing permission', 'consent']].forEach(function (entry) {"
for a in (LIVE_APP, LIVE_SRI, COMPACT):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
t = (s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"')
      .replace(LIVE_SRI, 'k="' + m['sri'] + '"')
      .replace(COMPACT, '      [].forEach(function (entry) {'))
a, b = s.splitlines(), t.splitlines()
assert len(a) == len(b) and sum(1 for x, y in zip(a, b) if x != y) == 2, 'more than the two lines changed'
Path(out).write_text(t)
print('ok', len(t), m['file'])
