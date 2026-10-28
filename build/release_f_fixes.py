"""Release F (clean-up, 28 Oct 2026): two crash fixes on top of the live staff bundle. Nothing else changes.

Base: the Release D staff bundle (dist/app/staff-app.d1c119f6f0.js, commit bd90f95e), which is what staff use today.
Why a patch and not build/build.py: the live bundle has been built release by release on top of the previous
bundle, so src/ alone no longer rebuilds it (see "How the live staff app is put together" in README.md). The same two fixes are also made in
src/ so the readable source stays right.

  1. Order screen, Feedback section: an order whose feedback reply has no notes list no longer crashes the screen
     (Sentry CORNER-CAFE-CAKES-STAFF-G, "Cannot read properties of undefined (reading 'length')").
  2. Analytics, "All years" trend chart: a mistyped year such as 0001 no longer breaks the chart
     (Sentry CORNER-CAFE-CAKES-STAFF-H, "Invalid time value"). Dates before 2000 are ignored when finding the start.

Prints the new file name and its SRI. Does not upload or publish anything.
"""
import base64, hashlib, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_COMMIT = 'bd90f95efc328b973f8a6cd34bf944520d0b90d1'
BASE_FILE = 'dist/app/staff-app.d1c119f6f0.js'


def sri(raw):
    return 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode()


def rep(s, old, new):
    assert s.count(old) == 1, ('anchor not unique', old[:70], s.count(old))
    return s.replace(old, new)


s = subprocess.run(['git', '-C', str(ROOT), 'show', BASE_COMMIT + ':' + BASE_FILE],
                   check=True, capture_output=True).stdout.decode()
assert hashlib.sha256(s.encode()).hexdigest()[:10] == 'd1c119f6f0', 'base is not the Release D bundle'

# 1. Feedback list on the order screen
s = rep(s, 'a.notes.length?n+=\'<div class="fb-list">\'', '(a.notes||[]).length?n+=\'<div class="fb-list">\'')
# 2. All-years trend start date
s = rep(s, 'e.all&&(a=t,ve.data.orders.forEach((function(e){var t=tc(e);t&&t<a&&(a=t)})))',
        'e.all&&(a=t,ve.data.orders.forEach((function(e){var t=tc(e);t&&t>="2000-01-01"&&t<a&&(a=t)})))')

raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app').mkdir(exist_ok=True)
(ROOT / 'dist/app' / name).write_bytes(raw)
print('dist/app/' + name, sri(raw), len(raw))
