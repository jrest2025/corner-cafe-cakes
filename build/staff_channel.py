"""Corner Café Service Hub: a clear label for how each order came in (21 October 2026).

Roneel, 1:06 PM: "all online orders through webiste should come on the dashboard clearly labelled website online
ordered yes?" and 2:00 PM: "walkin ordered wehou also be differentiated". He chose a label on every order (Website
order, Walk-in, Phone, WhatsApp, Social media, Corporate), going out with practice mode and the colleague voice.

Base: dist/app/staff-voice-manifest.json unless BASE names another manifest; OUT names the manifest written
(default dist/app/staff-channel-manifest.json). Every swap is asserted. Display only: the order's source is read, never
changed; nothing about saving, rules or steps changes.
  - order cards (Orders, Calendar and others): the label leads the row of tags; the source leaves the grey line;
  - short order rows (Today's lists, Waiting on you, Still to finish): the label leads the status tags;
  - Needs attention: the label sits under the order number and name;
  - order details: the label sits with the status at the top; "Ordered via" says Website, not Online;
  - kitchen slip and order history: website orders say so ("Website order" where nobody took it by hand).
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-voice-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-channel-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCChannel' not in s, 'Base already has the order labels'
TAG = '(window.CCChannel?window.CCChannel.tag(%s):"")'
SWAPS = [
    # One word for website orders everywhere: Website (the order details, the history, search lists)
    ('c={online:"Online",walk_in', 'c={online:"Website",walk_in', 1),
    # Order cards: the label first among the tags, and no longer in the grey line under the name
    ('\'</span></span><span class="ccs-tags">\'+o+"</span>"', '\'</span></span><span class="ccs-tags">\'+' + TAG % 'e.source' + '+o+"</span>"', 1),
    ('Tt(e.reference)+" · "+Tt(c[e.source])+', 'Tt(e.reference)+', 1),
    # Short rows (Today, Waiting on you, Still to finish, the calendar day list)
    ('\'</span><span class="ccs-mini-r">\'+("confirmed"===e.order_status?', '\'</span><span class="ccs-mini-r">\'+' + TAG % 'e.source' + '+("confirmed"===e.order_status?', 1),
    # Needs attention: under the order number and name
    ('<b>\'+Tt(e.o.reference)+" "+Tt(l(e.o))+"</b><span>"+Tt(e.txt)+"</span></button>"',
     '<b>\'+Tt(e.o.reference)+" "+Tt(l(e.o))+"</b><span>"+Tt(e.txt)+"</span>"+' + TAG % 'e.o.source' + '+"</button>"', 1),
    # Order details: with the status at the top
    ('(t.revision?\'<span class="ccs-tag t-warn">Amended</span>\':""))+\'<div class="ccs-sheet-body">\'',
     '(t.revision?\'<span class="ccs-tag t-warn">Amended</span>\':"")+' + TAG % 't.source' + ')+\'<div class="ccs-sheet-body">\'', 1),
    # Kitchen slip (both versions): a website order nobody took by hand says "Website order"; with a name, "Mere (Website)"
    ('["Order Taken by",(de.taken_by||"")+(de.source&&"online"!==de.source?',
     '["Order Taken by",("online"===de.source&&!de.taken_by?"Website order":"")+(de.taken_by||"")+(de.source&&("online"!==de.source||de.taken_by)?', 1),
    ('m("Order Taken by",(r.taken_by||"")+(r.source&&"online"!==r.source?" ("+(N[r.source]||r.source)+")":""))',
     'm("Order Taken by",("online"===r.source&&!r.taken_by?"Website order":"")+(r.taken_by||"")+(r.source&&("online"!==r.source||r.taken_by)?" ("+(N[r.source]||r.source)+")":""))', 1),
]
for old, new, n in SWAPS:
    got = s.count(old)
    assert got == n, 'expected %d, found %d: %s' % (n, got, old[:90])
    s = s.replace(old, new)

js = (ROOT / 'src/staff.channel.js').read_text()
css = (ROOT / 'src/staff.channel.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s = (js + '\n' + s + '\n(function(){var s=document.createElement("style");s.id="ccs-channel";s.textContent=' + json.dumps(css) +
     ';document.head.appendChild(s)})();\n')

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
