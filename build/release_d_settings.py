"""Release D (Settings audit, 28 Oct 2026): payment methods and lead-time groups come from Settings.

Base: the Release B staff bundle (dist/app/staff-app.5d6e1635b4.js, commit 947432f3). Patches, each asserted:
  1. The payment buttons' list is replaced in place by the Settings list (methods switched on, in order).
  2. Labels of past payments use the full Settings list, so a method switched off still shows its name.
  3. Both "how far ahead" charts in Analytics use the Settings groups (0-3, 4-7, 8-14, 15-30, 31+ days by default).
If the server sends nothing, the built-in lists stay. Prints the new file name and its SRI.
"""
import base64, hashlib, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


def rep(s, old, new):
    assert s.count(old) == 1, ('anchor not unique', old[:70], s.count(old))
    return s.replace(old, new)


s = subprocess.run(['git', '-C', str(ROOT), 'show', '947432f33366819a4012d809fface3ca691e6fdb:dist/app/staff-app.5d6e1635b4.js'],
                   check=True, capture_output=True).stdout.decode()
assert sri(s) == 'sha384-ULdXgIBQDYNxK5d6UdShm0OYiZac0H/2dLORq3Ah+KzzC53/Y2jbViJTwqULnbL+', 'base is not the Release B bundle'
s = rep(s, 's=[["cash","Cash"],["eftpos","EFTPOS"],["mpaisa","M-PAiSA"],["bank_transfer","Bank transfer"]]',
        's=window.__ccsPay=[["cash","Cash"],["eftpos","EFTPOS"],["mpaisa","M-PAiSA"],["bank_transfer","Bank transfer"]]')
s = rep(s, 'function Gt(e){var t=s.filter(', 'function Gt(e){var t=(window.__ccsPayAll||s).filter(')
s = rep(s, 'Se=[["Same day",0,0],["1–2 days",1,2],["3–6 days",3,6],["1–2 weeks",7,13],["2+ weeks",14,9999]]',
        'Se=window.__ccsBands=[["Same day",0,0],["1–2 days",1,2],["3–6 days",3,6],["1–2 weeks",7,13],["2+ weeks",14,9999]]')
s = rep(s, 'l=[["Same day",0,0],["1 to 2 days",1,2],["3 to 6 days",3,6],["1 to 2 weeks",7,13],["2 weeks or more",14,1e6]]', 'l=Se')
apply = ('function(d){try{var p=(d&&d.payment_methods||[]).filter(function(m){return m&&m.code&&m.label});'
         'if(p.length){window.__ccsPayAll=p.map(function(m){return[m.code,m.label]});var on=p.filter(function(m){return m.active});'
         'if(on.length&&window.__ccsPay){window.__ccsPay.length=0;on.forEach(function(m){window.__ccsPay.push([m.code,m.label])})}}'
         'var b=(d&&d.lead_bands||[]).filter(function(x){return x&&x.min!=null});'
         'if(b.length&&window.__ccsBands){window.__ccsBands.length=0;b.forEach(function(x){var lo=+x.min,hi=x.max==null?9999:+x.max;'
         'window.__ccsBands.push([hi===9999?lo+"+ days":lo===hi?(lo?lo+(lo===1?" day":" days"):"Same day"):lo+"–"+hi+" days",lo,hi])})}}catch(e){}}(t.data),')
s = rep(s, '(t.data&&t.data.occasions),uu()', '(t.data&&t.data.occasions),' + apply + 'uu()')
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
name = 'staff-app.' + hashlib.sha256(s.encode()).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_text(s)
print(name, sri(s), len(s.encode()))
