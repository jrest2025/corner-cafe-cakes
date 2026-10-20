"""Kitchen slip on DL paper, 110 x 220 mm (20 October 2026), on top of the live staff app.

Roneel: "the slip has to dl because we will use Dl sized paper for print". DL was set up as 99 x 210 mm; the café's DL
paper is 110 x 220 mm. Every way the slip comes out follows:
  1. Download (PDF), from the staff app: the slip layout copy (same as supabase/functions/send-emails/slip_pdf.js) uses
     110 x 220 mm and starts at a larger type size, stepping down only when an order has a lot of text.
  2. Print on this device: the page is 110 x 220 mm with 6 mm margins, and the slip is fitted to 98 x 206 mm.
  3. Settings, Kitchen printing: the paper choice reads "DL (110 x 220 mm)".
The emailed slip is made by the send-emails function (slip_pdf.js, deployed separately). The A5 choice is unchanged.
"""
import base64, hashlib, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-analytics-tabs-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base is not the live release'


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


s = swap(s, 'const r={A5:[148,210],DL:[99,210]};', 'const r={A5:[148,210],DL:[110,220]};')
s = swap(s, 'c="DL"===s?[.86,.78,.7,.62]:[1,.9,.8,.7]', 'c="DL"===s?[.96,.87,.78,.69,.62]:[1,.9,.8,.7]')
s = swap(s, '"@page{size:"+("DL"===n?"99mm 210mm":n+" portrait")', '"@page{size:"+("DL"===n?"110mm 220mm":n+" portrait")')
s = swap(s, 'n=("A5"===t?132:"DL"===t?87:186)*a,s=("A5"===t?191:"DL"===t?196:270)*a', 'n=("A5"===t?132:"DL"===t?98:186)*a,s=("A5"===t?191:"DL"===t?206:270)*a')
s = swap(s, '["DL","DL (99 x 210 mm)"]', '["DL","DL (110 x 220 mm)"]')
# The slip layout copy must match the email function's file
src = (ROOT / 'supabase/functions/send-emails/slip_pdf.js').read_text()
assert 'DL: [110, 220]' in src and '[0.96, 0.87, 0.78, 0.69, 0.62]' in src, 'slip_pdf.js not updated'

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-slip-dl-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
