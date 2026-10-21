"""Staff page footer for the practice mode and colleague voice release (21 October 2026).

From the live footer of the old orders release, it:
  1. puts the practice guard first (src/staff.practice-guard.html): in a tab that practises, nothing on the page can
     reach the real system, from the very start; then the touch standard's page fixes (src/staff.touch-host.html: on
     tablets and phones the website's smooth scrolling, hidden page overflow and reveal animation stay off the app);
  2. changes the staff app loader (commit, file and SRI) to MANIFEST (default dist/app/staff-touch-manifest.json);
  3. changes the finish step add-on's pinned commit (staff.finish-flow.js and .css, the colleague voice) to FLOW_COMMIT.
It asserts that nothing else differs.
Usage: python3 build/footer_practice.py IN OUT APP_COMMIT FLOW_COMMIT [MANIFEST]
(a commit of 40 zeros = the local test copy)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src, out, app_commit, flow_commit = sys.argv[1:5]
manifest = sys.argv[5] if len(sys.argv) > 5 else 'dist/app/staff-touch-manifest.json'
for c in (app_commit, flow_commit):
    assert re.fullmatch(r'[0-9a-f]{40}', c)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-old-orders-manifest.json').read_text())
guard = (ROOT / 'src/staff.practice-guard.html').read_text().strip()
host = (ROOT / 'src/staff.touch-host.html').read_text().strip()
assert host.startswith('<style id="cc-touch-host">') and host.endswith('</script>') and '\n' not in host
assert guard.startswith('<script id="ccs-practice-guard">') and guard.endswith('</script>') and '\n' not in guard
s = Path(src).read_text()

LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@605aeac4fd52c3da40d28241ba040aad400e8edb/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
FLOW_OLD = 'a4343f0fb7f9c811f50bbdaf816b0b30978d1e08'
for a in (LIVE_APP, LIVE_SRI):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
assert 'ccs-practice-guard' not in s
flow_lines = [l for l in s.splitlines() if 'id="cc-finish-flow-20261019"' in l]
assert len(flow_lines) == 1 and flow_lines[0].count(FLOW_OLD) == 2, 'finish step loader not as expected'
t = (s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"')
      .replace(LIVE_SRI, 'k="' + m['sri'] + '"')
      .replace(flow_lines[0], flow_lines[0].replace(FLOW_OLD, flow_commit)))
t = guard + '\n' + host + '\n' + t
a, b = s.splitlines(), t.splitlines()
assert len(b) == len(a) + 2 and b[0] == guard and b[1] == host
changed = sum(1 for x, y in zip(a, b[2:]) if x != y)
assert changed == 2, 'expected the app loader and the finish step loader to change, found %d lines' % changed
Path(out).write_text(t)
print('ok', len(t), m['file'])
