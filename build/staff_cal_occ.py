"""Calendar: bigger month view with cakes listed, occasions and Fiji public holidays, Coming up strip.

Narrow, asserted replacements on the exact live bundle (two-pane Needs attention release), keeping every prior overlay.
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = ROOT / 'dist/app/staff-app.9e3eaffd00.js'
BASE_SRI = 'sha384-mo0eb5SSTt57QMlbSZ82YemMmlfUaCNyH0AB18u9pMjNBy62EsQjR6zStLxZ3bcD'
s = base.read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == BASE_SRI, 'Base is not the live release'

def swap(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:80], s.count(old))
    s = s.replace(old, new)

needle = 'function Ed(){y.settings=null'
swap(needle, (ROOT / 'src/staff.cal-occ.js').read_text() + '\n' + needle)
# Coming up strip above every calendar view.
swap('''return t+'<div class="ccs-calwrap"><div class="ccs-calbody">''', '''return t+coStrip()+'<div class="ccs-calwrap"><div class="ccs-calbody">''')
# Month cells: lead-up line, occasion or holiday label, and the cakes due.
swap('''(c.orders?" has-orders":"")+'"><button type="button" class="ccs-mday"''', '''(c.orders?" has-orders":"")+coCls(r)+'"><button type="button" class="ccs-mday"''')
swap('''+ +r.slice(8)+"</b>"+(c.orders?'<span class="ccs-mcount">''', '''+ +r.slice(8)+"</b>"+coTag(r)+(c.orders?'<span class="ccs-mcount">''')
swap('''" need action")+"</span></span>":"")+"</button></div>"}return s+"</div></div>"}()''', '''" need action")+"</span></span>":"")+coList(o)+"</button></div>"}return s+"</div></div>"}()''')
# Week headers show the occasion or holiday too.
swap('''ie[so(t)]+" "+ +t.slice(8)+"</b><span>"''', '''ie[so(t)]+" "+ +t.slice(8)+"</b>"+coTag(t)+"<span>"''')
# Coming up cards jump to that month with the day selected.
swap('case"cal-month":', 'case"co-go":y.cal.view="month",y.cal.anchor=o.slice(0,8)+"01",y.cal.sel=o,y.cal.pre=null,Co();break;case"cal-month":')

css = (ROOT / 'src/staff.cal-occ.css').read_text()
assert '</script' not in css.lower() and '</script' not in s.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-cal-occ";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': str(base.relative_to(ROOT)), 'base_sri': BASE_SRI}
(ROOT / 'dist/app/staff-cal-occ-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
