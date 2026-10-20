"""Corner Café Birthday Club on the website cake order form (20 October 2026), on top of the live form.

Base: dist/app/guest-app.51ed2b5408.js (build/guest_app.txt; live on /order-cake, pinned at 78db316). Changes, each asserted:
  1. The form lends the add-on its database client as window.__ccgBc (rpc only).
  2. "Your details" ends with one optional tick box, "Join our Birthday Club...", after the specials tick box.
  3. Once the order is sent, the add-on joins them (birthday_club_join_online), and the thank-you page says so.
  4. Appends src/guest.birthday-club.js and src/guest.birthday-club.css.
Writes dist/app/guest-app.<hash>.js and dist/app/guest-birthday-club-manifest.json.
"""
import base64, hashlib, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_FILE, BASE_SRI = (ROOT / 'build/guest_app.txt').read_text().split()
s = (ROOT / BASE_FILE).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == BASE_SRI, 'Base is not the live order form'
assert 'CCGuestBirthday' not in s


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


# 1. The form's database client, lent to the add-on
s = swap(s, '{auth:{persistSession:!1}}),n=[["birthday","Birthday"]',
         '{auth:{persistSession:!1}}),__ccgBc=window.__ccgBc={rpc:function(e,t){return a.rpc(e,t)}},n=[["birthday","Birthday"]')
# 2. The tick box at the end of Your details
UPD = 'You can unsubscribe at any time.</span></label>")+\'<button type="button" class="cco-primary" data-act="toReview">Continue to review</button>\''
s = swap(s, UPD, UPD.replace('</label>")+', '</label>")+(window.CCGuestBirthday?window.CCGuestBirthday.box():"")+', 1))
# 3. Once the order is sent
SENT = 'return v=a.message||"We could not send your request. Please try again.",Oe()}!function(e){Ie("Lead"'
s = swap(s, SENT, SENT.replace('Oe()}!function', 'Oe()}window.CCGuestBirthday&&window.CCGuestBirthday.after(a);!function', 1))
# 4. The add-on and its styles
js = (ROOT / 'src/guest.birthday-club.js').read_text()
css = (ROOT / 'src/guest.birthday-club.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s += ('\n' + js + '\n(function(){if(document.getElementById("cco-bc-style"))return;var s=document.createElement("style");s.id="cco-bc-style";s.textContent=' +
      json.dumps(css) + ';document.head.appendChild(s)})();\n')

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'guest-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': BASE_FILE, 'base_sri': BASE_SRI}
(ROOT / 'dist/app/guest-birthday-club-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
