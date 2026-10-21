"""Staff page head and footer for the 21 October 2026 release: practice mode with guided tasks, the colleague voice, the
order labels and the touch-friendly standard. Roneel chose "Deploy it now" at 6:5x PM.

Webflow keeps each custom code block under 50,000 characters, and the live footer is already 49,491, so the two new
early pieces go in the page HEAD, which runs before anything in the page body:
  HEAD   = the practice guard (src/staff.practice-guard.html: in a tab that practises, nothing on the page can reach the
           real system, from the very start), then the touch standard's page fixes (src/staff.touch-host.html: on tablets
           and phones the website's smooth scrolling, hidden page overflow and reveal animation stay off the app), then the
           live head, unchanged.
  FOOTER = the live footer with two lines changed: the staff app loader (commit, file and SRI from MANIFEST, default
           dist/app/staff-touch-manifest.json) and the finish step add-on's pinned commit (FLOW_COMMIT, the colleague
           voice). Nothing else differs; both blocks stay under 50,000 characters.
Usage: python3 build/page_release_20261021.py HEAD_IN FOOT_IN HEAD_OUT FOOT_OUT APP_COMMIT FLOW_COMMIT [MANIFEST]
(a commit of 40 zeros = the local test copy)
"""
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
head_in, foot_in, head_out, foot_out, app_commit, flow_commit = sys.argv[1:7]
manifest = sys.argv[7] if len(sys.argv) > 7 else 'dist/app/staff-touch-manifest.json'
for c in (app_commit, flow_commit):
    assert re.fullmatch(r'[0-9a-f]{40}', c)
m = json.loads((ROOT / manifest).read_text())
live = json.loads((ROOT / 'dist/app/staff-old-orders-manifest.json').read_text())
guard = (ROOT / 'src/staff.practice-guard.html').read_text().strip()
host = (ROOT / 'src/staff.touch-host.html').read_text().strip()
assert guard.startswith('<script id="ccs-practice-guard">') and guard.endswith('</script>') and '\n' not in guard
assert host.startswith('<style id="cc-touch-host">') and host.endswith('</script>') and '\n' not in host

# ---------- head: the guard and the page fixes first, the live head unchanged ----------
h = Path(head_in).read_text()
assert hashlib.md5(h.encode()).hexdigest() == '6db1175b4346df174c913075a54ed3a1', 'head is not the expected live head'
assert 'ccs-practice-guard' not in h and 'cc-touch-host' not in h
H = guard + '\n' + host + '\n' + h
assert H.splitlines()[2:] == h.splitlines() and len(H) < 50000

# ---------- footer: the app loader and the finish step loader ----------
s = Path(foot_in).read_text()
assert hashlib.md5(s.encode()).hexdigest() == '7651d0d132a67c20c1e1dd5e4750d70e', 'footer is not the expected live footer'
LIVE_APP = 'var f="gh/jrest2025/corner-cafe-cakes@605aeac4fd52c3da40d28241ba040aad400e8edb/' + live['file'] + '"'
LIVE_SRI = 'k="' + live['sri'] + '"'
FLOW_OLD = 'a4343f0fb7f9c811f50bbdaf816b0b30978d1e08'
for a in (LIVE_APP, LIVE_SRI):
    assert s.count(a) == 1, 'footer is not the expected live footer: ' + a[:70]
assert 'ccs-practice-guard' not in s
flow_lines = [l for l in s.splitlines() if 'id="cc-finish-flow-20261019"' in l]
assert len(flow_lines) == 1 and flow_lines[0].count(FLOW_OLD) == 2, 'finish step loader not as expected'
F = (s.replace(LIVE_APP, 'var f="gh/jrest2025/corner-cafe-cakes@' + app_commit + '/' + m['file'] + '"')
      .replace(LIVE_SRI, 'k="' + m['sri'] + '"')
      .replace(flow_lines[0], flow_lines[0].replace(FLOW_OLD, flow_commit)))
a, b = s.splitlines(), F.splitlines()
assert len(a) == len(b)
changed = sum(1 for x, y in zip(a, b) if x != y)
assert changed == 2, 'expected the app loader and the finish step loader to change, found %d lines' % changed
assert len(F) < 50000, 'footer over the 50,000 character limit'
Path(head_out).write_text(H)
Path(foot_out).write_text(F)
print(json.dumps({'head': len(H), 'head_md5': hashlib.md5(H.encode()).hexdigest(), 'footer': len(F), 'footer_md5': hashlib.md5(F.encode()).hexdigest(), 'app': m['file']}))
