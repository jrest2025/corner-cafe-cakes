"""Corner Café Birthday Club in the staff app (20 October 2026).

Roneel: "can we build a birthday club into the dashboard for the customers.. we can always call them up and wish them
and offer something". Approved choices: join at the counter and on the website; a free cupcake with a cake ordered
within 2 weeks of the birthday, once a year; the call list shows birthdays in the next 7 days, today's first.
Database: supabase/sql/birthday_club_20261020.sql (applied; every function checks the master switch, which stays off until
the release is approved).

Base: the live release (dist/app/staff-service-hub-manifest.json) unless BASE names another manifest. The marketing
campaigns candidate is parked (Roneel, 20 October 7:47 PM: "forget the marketing for now"), so this goes out on its own.
OUT names the manifest written (default staff-birthday-club-manifest.json).

Changes to the base bundle, each asserted:
  1. The app lends add-ons its database client and a few of its own actions as window.__ccsBc: draw the screen, show a
     message, which tab is open, open a tab and section, what sheet is open, reload an open order or profile.
  2. Customers: a Birthday Club section after the others, offered only while the club is on and the login can see it.
  3. Today: the This week box ends with how many birthdays there are to call (only when there are some).
  4. New order, Customer step: Join the Birthday Club, or the free cupcake for a member near their birthday.
  5. After a new order is saved: join, then the free cupcake (the same way as the original order date is recorded).
  6. The order's history names it: "Birthday Club: free cupcake added".
  7. Appends src/staff.birthday-club.js and src/staff.birthday-club.css.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-service-hub-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-birthday-club-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCBirthdayClub' not in s, 'Base already has the Birthday Club'


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


# 1. The app's client and actions, lent to the add-on
KEY = 'storageKey:"cc-cakes-staff"}}),'
s = swap(s, KEY, KEY + '__ccsBc=window.__ccsBc={rpc:function(e,t){return a.rpc(e,t)},render:function(){Ma()},toast:function(e,t){ma(e,t)},'
         'tab:function(){return y.tab},'
         'go:function(e,t,n){t&&(En(t)[t]=n),"customers"===e&&(Ol().q=""),kn(e),window.scrollTo(0,0)},'
         'sheet:function(){var e=y.sheet,t=e&&e.data,n="customer"===(e&&e.type)&&t&&t.c;return e?{type:e.type,id:e.id,ready:!!t,edit:!!e.edit,'
         'name:n?n.full_name:null,phone:n?n.phone:null,day:n?n.birth_day:null,month:n?n.birth_month:null}:null},'
         'reloadOrder:function(e){if(y.sheet&&"order"===y.sheet.type&&y.sheet.id===e&&!Da()){var t=y.sheet.sec;mn(e),t&&y.sheet&&(y.sheet.sec=t)}},'
         'reloadCustomer:function(e){y.sheet&&"customer"===y.sheet.type&&y.sheet.id===e&&!y.sheet.edit&&!Da()&&Uo(e,!0)}},')

# 2. Customers: the Birthday Club section
s = swap(s, 'return["ov","fu","all"].indexOf(e)>-1?e:',
         'return["ov","fu","all"].indexOf(e)>-1||"bc"===e&&window.CCBirthdayClub&&window.CCBirthdayClub.allowed()?e:')
s = swap(s, '["all","All customers"]],e,"Customer sections")',
         '["all","All customers"]].concat(window.CCBirthdayClub&&window.CCBirthdayClub.allowed()?[["bc","Birthday Club",window.CCBirthdayClub.badge()]]:[]),e,"Customer sections")')
s = swap(s, '}(n),"all"!==n)return t+function(e){var t=y.crm;',
         '}(n),"bc"===n&&window.CCBirthdayClub)return t+window.CCBirthdayClub.page();if("all"!==n)return t+function(e){var t=y.crm;')

# 3. Today: the This week box
s = swap(s, '<div class="tq-days">\'+O+"</div></section>"',
         '<div class="tq-days">\'+O+"</div>"+(window.CCBirthdayClub?window.CCBirthdayClub.weekLine():"")+"</section>"')

# 4. New order, Customer step
s = swap(s, '+Zr(1)}else if(3===c){', '+(window.CCBirthdayClub?window.CCBirthdayClub.join(V):"")+Zr(1)}else if(3===c){')

# 5. Once the order is saved
TAKEN = 'ma("Order saved, but the original order date was not recorded"+(e.data&&e.data.message?": "+e.data.message:"."),!0)})),'
s = swap(s, TAKEN, TAKEN + 'window.CCBirthdayClub&&e.data.order_id&&window.CCBirthdayClub.afterOrder(V,e.data),')

# 6. History line
HIST = 'taken_earlier:"Order taken "+(t.text||"")+", entered later",'
s = swap(s, HIST, HIST + 'birthday_offer:"Birthday Club: free cupcake added",')

# 7. The add-on and its styles
js = (ROOT / 'src/staff.birthday-club.js').read_text()
css = (ROOT / 'src/staff.birthday-club.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s += ('\n' + js + '\n(function(){var s=document.createElement("style");s.id="ccs-birthday-club";s.textContent=' + json.dumps(css) +
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
