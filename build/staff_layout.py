"""Refine shared layout on the exact verified production release. No database changes."""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
m = json.loads((ROOT / 'dist/app/staff-wide-manifest.json').read_text())
s = (ROOT / m['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == m['sri']
def swap(old, new):
    global s
    assert s.count(old) == 1, (old[:70], s.count(old))
    s = s.replace(old, new)
swap('function Ed(){y.settings=null', (ROOT / 'src/staff.layout.js').read_text() + '\nfunction Ed(){y.settings=null')
swap("""return t+coStrip()+'<div class="ccs-calwrap"><div class="ccs-calbody">'""", """return t+coStrip()+'<div class="ccs-calwrap'+((e.sel||e.pre)?' ly-has-detail':'')+'"><div class="ccs-calbody">'""")
swap('''<aside class="ccs-calside" aria-label="Selected day">'+''', '''<aside class="ccs-calside" aria-label="Selected day">'+((e.sel||e.pre)?'<button type="button" class="ccs-btn ccs-ghost ccs-small ly-close" data-act="ly-cal-close">Close details</button>':'')+''')
swap('case"cal-sel":', 'case"ly-cal-close":y.cal.sel=null,y.cal.pre=null,y.cal.ask=null,Ma();requestAnimationFrame(function(){var b=document.querySelector(\'[data-act="cal-today"]\');if(b)b.focus()});break;case"cal-sel":')
# Dense days must be readable; a page scroll is preferable to hiding essential summaries.
css=(ROOT/'src/staff.layout.css').read_text()
assert '</script' not in css.lower()
s+='\n(function(){var s=document.createElement("style");s.id="ccs-layout";s.textContent='+json.dumps(css)+';document.head.appendChild(s)})();\n'
raw=s.encode();name='dist/app/staff-app.'+hashlib.sha256(raw).hexdigest()[:10]+'.js'
(ROOT/name).write_bytes(raw)
out={'file':name,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':m['file'],'base_sri':m['sri']}
(ROOT/'dist/app/staff-layout-manifest.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out))
