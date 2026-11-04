"""Analytics, one page per tab (20 October 2026), on top of the live easier-forms release.

Tabs: Overview (Cake Heartbeat, untouched) · Cake sales · Cakes · Customers · Occasions · Planning · Data.
The staff app keeps working out every figure with its own rules; src/staff.analytics-tabs.js lays the pages out.

Changes to the live bundle, each asserted:
  1. The module list (AN_MODS) and their sections (AN_SUB) become the new tabs. AN_SUB also maps every old section to a
     new tab, so if the new pages ever fail, the app shows that tab's old sections as before.
  2. The raw sections are kept before they are merged (t.__raw), for the Details areas.
  3. The three built-in views (occasion intelligence, uploads, occasion report) are lifted out of the module routing into
     functions (t.__oiF, t.__upF, t.__orF), unchanged, so the new pages can place them. The Booking curve is inside the
     occasion intelligence view and is not touched.
  4. A hook hands every tab except Overview to window.CCAnalyticsTabs.page(); on any error the old routing runs.
  5. src/staff.analytics-tabs.js and .css are appended.
"""
import base64, hashlib, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-form-ease-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'


def once(text, old):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:80]
    return text.index(old)


# 1. Module list and sections
a = once(s, 'Re=[{id:"ov",') + 3
b = once(s, '}],Be={ck:["sa","pf","pr","cu","cv","fi","op","fc"],sd:["oi","oc","or"],da:["up","dm","dr"]}') + 2
mods = {}
for part in s[a + 1:b - 1].split('},{id:"'):
    body = part if part.startswith('{id:"') else '{id:"' + part
    body = body if body.endswith('}') else body + '}'
    mods[body[5:7]] = body
assert sorted(mods) == sorted(['ov', 'ck', 'cs', 'mk', 'wb', 'sd', 'ci', 'da']), sorted(mods)
new_mods = [
    mods['ov'],
    '{id:"sl",name:"Cake sales",need:["cake_orders"],opt:["cake_costs"],purpose:"What was sold, and what it is worth."}',
    '{id:"pd",name:"Cakes",need:["cake_orders"],opt:["cake_costs"],purpose:"What people buy: cakes, sizes and flavours."}',
    '{id:"cu",name:"Customers",need:["cake_orders"],opt:[],purpose:"Who orders, and who comes back."}',
    mods['sd'],
    '{id:"pl",name:"Planning",need:["cake_orders"],opt:[],purpose:"What is booked ahead, and whether the kitchen is ready."}',
    mods['cs'], mods['mk'], mods['wb'], mods['da'],
]
s = s[:a] + '[' + ','.join(new_mods) + ']' + s[b:]
old_sub = 'Be={ck:["sa","pf","pr","cu","cv","fi","op","fc"],sd:["oi","oc","or"],da:["up","dm","dr"]}'
once(s, old_sub)
s = s.replace(old_sub, 'Be={sl:["sa","pf","fi"],pd:["pr"],cu:["cu"],sd:["oi","oc","or"],pl:["fc","op","cv"],da:["dr","up","dm"]}')

# 2. Keep the raw sections for the Details areas
raw = ',t.secs=function(e,t){var a={};e.forEach((function(e){a[e[0]]=e}));'
once(s, raw)
s = s.replace(raw, ',t.__raw=t.secs.slice()' + raw)

# 3. Lift the three built-in views out of the routing, unchanged
oi_a = once(s, 'if(a+=\'<div class="dx-secs">\'+On("dash",')
oi_head = '"oi"===Y)return a+'
oi_s = s.index(oi_head, oi_a) + len(oi_head)
up_head = ';if("up"===Y)return a+'
oi_e = once(s, up_head)
OI = s[oi_s:oi_e]
or_head = ';if("or"===Y)return a+\'<section class="dx-card dx-secbody or-wrap" aria-label="Occasion report"><div class="dx-card-h"><h2>Occasion report</h2><span>One occasion, the full story</span></div><div class="or-body">\'+'
up_s = oi_e + len(up_head)
up_e = once(s, or_head)
UP = s[up_s:up_e]
or_s = up_e + len(or_head)
or_tail = '+"</div></section>";"da"!==z&&(a+=T);'
or_e = once(s, or_tail)
OR = s[or_s:or_e]
for name, fn, start in (('occasion view', OI, 'function(){var e=function(){var e=Li(),'), ('uploads', UP, 'function(){var e=Gi();'), ('occasion report', OR, 'function(){if(Kc(),!ve.odates)')):
    assert fn.startswith(start) and fn.endswith('}()'), name + ' boundaries changed'
s = s[:oi_s] + 't.__oiF()' + s[oi_e:up_s] + 't.__upF()' + s[up_e:or_s] + 't.__orF()' + s[or_e:]

# 4. Hook: every tab except Overview goes to the new pages; the old routing stays as the fallback
anchor = 'I=Re.filter((function(e){return e.id===z}))[0];'
once(s, anchor)
ctx = ('{st:t,f:n,data:r,head:p,filt:h,period:T,gap:N,r:s,cur:g,cs:y,ps:k,got:w,pgot:_,owing:q,up:C,secs:t.secs,raw:t.__raw||[],'
       'mods:Re,subs:Be,state:Ni,sub:function(e,a){return qn("dash",e,a)},key:yc,money:vc,num:bc,today:Dt,addDays:jt,days:oc,'
       'occName:Wc,src:c,launch:Fe,value:pc,cakes:uc,items:dc,match:lc,dateOf:tc,owed:mi,exVat:fi,confirmed:vi,'
       'oi:t.__oiF,uploads:t.__upF,report:t.__orF}')
hook = ('t.__oiF=' + OI[:-2] + ';t.__upF=' + UP[:-2] + ';t.__orF=' + OR[:-2] + ';'
        'if(window.CCAnalyticsTabs&&"ov"!==z)try{var __cat=window.CCAnalyticsTabs.page(z,' + ctx + ');if(null!=__cat)return __cat}'
        'catch(__e){console.warn("[Analytics tabs] Previous layout used",__e)}')
s = s.replace(anchor, anchor + hook)

# 5. The pages themselves
expansion = (ROOT / 'src/staff.analytics-expansion.js').read_text(); assert '</script' not in expansion.lower()
js = (ROOT / 'src/staff.analytics-tabs.js').read_text(); assert '</script' not in js.lower()
css = (ROOT / 'src/staff.analytics-tabs.css').read_text(); assert '</script' not in css.lower()
s += '\n' + expansion + '\n' + js + '\n(function(){var s=document.createElement("style");s.id="ccs-analytics-tabs";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw_bytes = s.encode()
name = 'staff-app.' + hashlib.sha256(raw_bytes).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw_bytes)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw_bytes).digest()).decode(), 'bytes': len(raw_bytes), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-analytics-tabs-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
