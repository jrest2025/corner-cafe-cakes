"""Corner Café Service Hub: practice mode (21 October 2026).

Roneel, 11:05 AM: "build a pracitcie mode like you did for kaxumi". Approved plan: practice on the device, as a Counter
login, on a pretend café day; a gold frame and a practice card; Start over and Exit practice; never connects to the real
system.

Base: the live release (dist/app/staff-old-orders-manifest.json) unless BASE names another manifest.
OUT names the manifest written (default dist/app/staff-practice-manifest.json).

The bundle becomes:
  1. First (before the app starts): src/staff.practice.js inside one function, with
     - ccPracticeData(): the staff app's test data (test/mock.js) with invented names in place of the test names, the
       real-looking addresses and emails replaced, and its internals handed to the practice server (window.__ccsPx);
     - PRACTICE_SETUP: the real menu, prices and delivery areas (src/practice/setup-20261021.json).
     Outside practice mode this part only defines CCPractice and returns.
  2. The live release, unchanged.
  3. Last: src/staff.practice-ui.js and src/staff.practice.css (the ways in, the frame and card, Start over, Exit).
"""
import base64, hashlib, json, os, re, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-old-orders-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-practice-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
app = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(app) == bm['sri'], 'Base does not match its manifest'
assert 'CCPractice' not in app, 'Base already has practice mode'

# ---------- the pretend day from the test data ----------
mock = (ROOT / 'test/mock.js').read_text()


def swap(s, old, new, at_least=1):
    n = s.count(old)
    assert n >= at_least, 'not found (%d): %s' % (n, old[:80])
    return s.replace(old, new)


# o10 belongs to its own customer (Mere Waqa, 912 0003), not to Ana's profile
mock = swap(mock, "customer_id: 'c1', customers: { full_name: 'Test Customer C', phone: '912 0003' }",
            "customer_id: 'c3', customers: { full_name: 'Mere Waqa', phone: '912 0003' }")
NAMES = [
    ("'Test Customer A'", "'Ana Tuilagi'"), ("'Test Customer B'", "'Ravi Prasad'"),
    ("'Test Manager'", "'Practice staff'"), ("'Test Staff'", "'Kalesi'"), ("'Counter One'", "'Mere'"),
    ("'Baker One'", "'Josefa'"), ("'Baker Two'", "'Tomasi'"),
    ("'Mere Test'", "'Mere Waqa'"), ("'Ana Test'", "'Ana Sharma'"), ("'Ravi Test'", "'Ravi Chand'"), ("'Sera Test'", "'Seini Tora'"),
    ("'Litia Test'", "'Losana Bola'"), ("'Josh Test'", "'Josh Fong'"), ("'Priya Test'", "'Priya Devi'"),
    ("'Test Regular Guest'", "'Priya Devi'"), ("'Test Occasion Guest'", "'Adi Tamani'"),
    ("'Happy Birthday Test'", "'Happy Birthday Ana'"), ('Test Resort, Denarau', 'Room 214, Denarau resort'),
    ('Sheraton Denarau', 'Denarau resort'), ('roneel@jacksfiji.com', 'kitchen-printer@example.com'), ('cornercafe@jacksfiji.com', 'cafe@example.com'),
    ("address: 'Test Street, Suva'", "address: '401–403 Queens Road, Nadi Town'"),
]
for a, b in NAMES:
    mock = swap(mock, a, b)
assert 'jacksfiji' not in mock.lower()
# hand the pretend day's pieces to the practice server
EXPOSE = '  window.__ccsMock = {'
assert mock.count(EXPOSE) == 1
mock = mock.replace(EXPOSE, '  window.__ccsPx = { T: T, add: add, setup: setup, orders: orders, older: older, summary: summary, prof: prof, cust: cust, snap: snap, BC: BC };\n' + EXPOSE)
assert mock.rstrip().endswith('})();')
data = 'function ccPracticeData() {\n' + mock + '\n}\n'

setup = json.loads((ROOT / 'src/practice/setup-20261021.json').read_text())
prelude_src = (ROOT / 'src/staff.practice.js').read_text()
for part in (prelude_src, data):
    assert '</script' not in part.lower()
prelude = ('/* Corner Café practice mode: the pretend day (outside practice mode nothing below runs but the CCPractice switch). */\n'
           '(function () {\nvar PRACTICE_SETUP = ' + json.dumps(setup, ensure_ascii=False) + ';\n' + data + prelude_src + '\n})();\n')

# ---------- the ways in, the frame and the card ----------
ui = (ROOT / 'src/staff.practice-ui.js').read_text()
css = (ROOT / 'src/staff.practice.css').read_text()
for part in (ui, css):
    assert '</script' not in part.lower()
s = prelude + app + '\n' + ui + '\n(function(){var s=document.createElement("style");s.id="ccs-practice";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
