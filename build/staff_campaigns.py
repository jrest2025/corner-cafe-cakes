"""Marketing campaigns plugged into Analytics (20 October 2026), on top of the live Service Hub release.

Roneel approved the plan: Add campaign, then link and QR code, then results on the Marketing tab ("Yes, build it").
Database: supabase/marketing_campaigns_20261020.sql (applied 20 October 2026; additive).

Changes to the live bundle, each asserted:
  1. The Analytics tabs code is swapped for its new version: Marketing gets a title, and add-ons can register a tab page
     with the same building blocks. The Cake Heartbeat, Overview and every other tab are untouched.
  2. Marketing becomes a tab that needs only cake orders, placed after Occasions. Campaigns now come from the app, not an
     Excel template: the dataset list, how datasets connect, the "has data" check and the Latest column follow.
  3. The app lends its database client to add-ons as window.__ccsApi (rpc, render, toast, tab).
  4. New order, Customer step: "Came from a promotion?", only while a campaign runs.
  5. After a new order is saved, the promotion is recorded with order_set_campaign (the same way as order_set_taken).
  6. The order's history names it: "Came from the promotion ...".
  7. Appends the QR code library (window.CCQRCode), src/staff.campaigns.js and src/staff.campaigns.css.
"""
import base64, hashlib, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-service-hub-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base is not the live release'


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


# 1. The Analytics tabs code, as published at fe30348, swapped for the new version
TABS_TAIL = '\n(function(){var s=document.createElement("style");s.id="ccs-analytics-tabs"'
old_tabs = subprocess.run(['git', '-C', str(ROOT), 'show', 'fe30348:src/staff.analytics-tabs.js'], check=True, capture_output=True).stdout.decode()
new_tabs = (ROOT / 'src/staff.analytics-tabs.js').read_text()
assert '</script' not in new_tabs.lower()
s = swap(s, '\n' + old_tabs + TABS_TAIL, '\n' + new_tabs + TABS_TAIL)

# 2. Marketing: needs cake orders only, sits after Occasions; campaigns come from the app
SD = '{id:"sd",name:"Occasions",need:["cake_orders","occasions"],opt:["cafe_sales"],purpose:"When each occasion\'s orders arrive and when cakes are collected."}'
OLD_MK = ('{id:"mk",name:"Marketing",need:["campaigns"],opt:["website"],purpose:"What each campaign cost and what it brought in.",'
          'shows:["Spend by campaign and platform","Cost per click, enquiry and order","Cake orders during each campaign against a normal period",'
          '"Return on spend, only where revenue can be traced to the campaign"]}')
NEW_MK = ('{id:"mk",name:"Marketing",need:["cake_orders"],opt:["campaigns"],purpose:"Which promotions bring in cake orders.",'
          'shows:["Each campaign\'s link and QR code","Orders and order value traced to each campaign",'
          '"Cost per order and what each dollar brought back","Cake orders during each campaign against the days before"]}')
s = swap(s, ',' + OLD_MK, '')
s = swap(s, SD + ',', SD + ',' + NEW_MK + ',')
a = s.index('Re=[{id:"ov"')
order = [s[i + 5:i + 7] for i in range(a, s.index('}],Be=', a)) if s.startswith('{id:"', i)]
assert order == ['ov', 'sl', 'pd', 'cu', 'sd', 'mk', 'pl', 'cs', 'wb', 'da'], order

ds_a = s.index('{id:"campaigns",name:"Marketing campaigns",src:"excel"')
ds_b = s.index(',{id:"website",name:"Website visits"', ds_a)
OLD_DS = s[ds_a:ds_b]
assert 'CC-MKT-CAMPAIGN' in OLD_DS and OLD_DS.endswith(']]]}') and len(OLD_DS) < 900, OLD_DS[-80:]
NEW_DS = ('{id:"campaigns",name:"Marketing campaigns",src:"app",owner:"Analytics, Marketing",grain:"One row per campaign",'
          'why:"What marketing cost and what it brought in.",fields:[["Campaign name",1],["Runs from",1],["Runs to",1],'
          '["Where it runs",0],["What it cost",0],["Occasion it promotes",0]]}')
s = swap(s, OLD_DS, NEW_DS)
s = swap(s, '{a:"cake_orders",b:"campaigns",key:"Date (campaign days) and promo code where used",',
         '{a:"cake_orders",b:"campaigns",key:"The campaign link or QR code, or the promotion tapped on New order, and the days it runs",')
s = swap(s, ':"cake_costs"===e?!(!t.costs||!t.costs.length):!!(t.imports&&t.imports[e]&&t.imports[e].rows)}',
         ':"cake_costs"===e?!(!t.costs||!t.costs.length):"campaigns"===e&&window.CCCampaigns?window.CCCampaigns.count()>0:!!(t.imports&&t.imports[e]&&t.imports[e].rows)}')
s = swap(s, 't.imports&&t.imports[e]&&t.imports[e].to?"Data to "+Mt(t.imports[e].to):""}(e.id)||"Nothing yet")',
         '"campaigns"===e&&window.CCCampaigns?window.CCCampaigns.latest():t.imports&&t.imports[e]&&t.imports[e].to?"Data to "+Mt(t.imports[e].to):""}(e.id)||"Nothing yet")')

# 3. The app's database client, lent to add-ons
s = swap(s, 'storageKey:"cc-cakes-staff"}}),n={awaiting_review:',
         'storageKey:"cc-cakes-staff"}}),__ccsApi=window.__ccsApi={rpc:function(e,t){return a.rpc(e,t)},render:function(){Ma()},'
         'toast:function(e,t){ma(e,t)},tab:function(){return y.tab}},n={awaiting_review:')

# 4. New order, Customer step: Came from a promotion?
s = swap(s, '+Zr(1)}else if(3===c){', '+(window.CCCampaigns?window.CCCampaigns.chips(V):"")+Zr(1)}else if(3===c){')

# 5. Record the promotion once the order is saved
TAKEN = 'ma("Order saved, but the original order date was not recorded"+(e.data&&e.data.message?": "+e.data.message:"."),!0)})),'
s = swap(s, TAKEN, TAKEN + 'V.campaign&&e.data.order_id&&a.rpc("order_set_campaign",{p_order:e.data.order_id,p_code:V.campaign}).then((function(e){'
         '(e.error||e.data&&!e.data.ok)&&ma("Order saved, but the promotion was not recorded"+(e.data&&e.data.message?": "+e.data.message:"."),!0)}),'
         '(function(){ma("Order saved, but the promotion was not recorded. Check the connection.",!0)})),')

# 6. History line
s = swap(s, 'taken_earlier:"Order taken "+(t.text||"")+", entered later",',
         'taken_earlier:"Order taken "+(t.text||"")+", entered later",campaign:"Came from the promotion "+(t.name||t.code||""),')

# 7. QR code library, the campaigns add-on and its styles
qrlib = (ROOT / 'src/vendor/qrcode-generator-1.4.4.min.js').read_text()
js = (ROOT / 'src/staff.campaigns.js').read_text()
css = (ROOT / 'src/staff.campaigns.css').read_text()
for part in (qrlib, js, css):
    assert '</script' not in part.lower()
s += ('\n(function(){' + qrlib + 'window.CCQRCode=qrcode;})();\n' + js +
      '\n(function(){var s=document.createElement("style");s.id="ccs-campaigns";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n')

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-campaigns-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
