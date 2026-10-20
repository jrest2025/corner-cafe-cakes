"""Corner Café Service Hub (20 October 2026), on top of the live DL kitchen slip release.

Roneel: "also its called corner cafe service hub". Approved preview ("Yes, publish both"), published together with the
white logo on the charcoal side menu (src/staff.semantic-colour.css).

Changes to the live bundle, each asserted:
  1. Under the logo, the side menu (the top bar on phones and the kitchen screen) and the top bar say Service Hub
     instead of Cakes.
  2. The sign-in and Choose your password screens say Corner Café Service Hub.
  3. On narrow side menus (upright tablets, the shrunk menu), SERVICE HUB may wrap onto two lines instead of being cut.
Nothing else changes: the order website, emails, kitchen slips and downloads keep the Corner Café cake wording.
"""
import base64, hashlib, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-slip-dl-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base is not the live release'


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


# 1. Under the logo
s = swap(s, '<span class="ccs-topbrand">Corner Café <small>Cakes</small></span>', '<span class="ccs-topbrand">Corner Café <small>Service Hub</small></span>')
s = swap(s, '<div class="ccs-brand">Corner Café<small>Cakes</small></div>', '<div class="ccs-brand">Corner Café<small>Service Hub</small></div>')
# 2. Sign in and Choose your password
for title in ('Staff sign in', 'Choose your password'):
    s = swap(s, '<div class="ccs-brand" style="color:var(--ccs-esp)">Corner Café Cakes</div><h1 class="ccs-title">' + title + '</h1>',
             '<div class="ccs-brand" style="color:var(--ccs-esp)">Corner Café Service Hub</div><h1 class="ccs-title">' + title + '</h1>')
assert 'Corner Café<small>Cakes' not in s and 'Corner Café Cakes</div>' not in s
# 3. SERVICE HUB wraps on narrow side menus
css = '/* Corner Café Service Hub (20 October 2026): the name under the logo may wrap on narrow side menus. */\n#cc-staff .ccs-side .ccs-brand small{white-space:normal}'
s += '\n(function(){var s=document.createElement("style");s.id="ccs-service-hub";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-service-hub-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
