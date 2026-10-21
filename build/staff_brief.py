"""Corner Café Service Hub: a personal greeting and a short daily briefing on Today (21 October 2026).

Roneel, 6:44 PM: his brief "Personalised conversational UX and context-aware dashboard intelligence" (greeting by local
time with the first name, a short summary from real data, a compact daily briefing, most important first, role-aware,
natural wording, nothing invented, additive only, Daily Cake Demand untouched). He chose "Deploy it now, greeting next"
and "No name on the counter login".

Base: dist/app/staff-touch-fix-manifest.json (the live touch release with one fix: order names in Needs attention back on one
line, as before) unless BASE names another manifest; OUT names the manifest
written (default dist/app/staff-brief-manifest.json). Two asserted changes to the app, both read-only:
  1. The Today screen keeps the lists it has just worked out (Needs attention, Due today, Waiting on you, the next 7
     days, payments when the login may see them) in y.__brief, so the briefing says exactly what the screen shows.
  2. window.__ccsOf gains read-only helpers: brief(), state(), can(permission), t12(time), nice(date, long),
     addDays(date, n).
Then src/staff.brief.js and the style element ccs-brief (src/staff.brief.css) are added at the end.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-touch-fix-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-brief-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCBrief' not in s and 'y.__brief' not in s, 'Base already has the briefing'
SWAPS = [
    ('}()?12:2;g=["needs","Waiting on you"',
     '}()?12:2;y.__brief={day:e,att:c,urgent:u,todo:p,due:_,done:C,wait:w,week:S,pay:a?m:null};g=["needs","Waiting on you"', 1),
    ('__ccsOf=window.__ccsOf={V:function(){return V},',
     '__ccsOf=window.__ccsOf={V:function(){return V},brief:function(){return y.__brief||null},state:function(){return y},'
     'can:function(e){return ha(e)},t12:function(e){return Ft(e)},nice:function(e,t){return Mt(e,t)},addDays:function(e,t){return jt(e,t)},', 1),
]
for old, new, n in SWAPS:
    got = s.count(old)
    assert got == n, 'expected %d, found %d: %s' % (n, got, old[:80])
    s = s.replace(old, new)

js = (ROOT / 'src/staff.brief.js').read_text()
css = (ROOT / 'src/staff.brief.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower() and '</style' not in part.lower()
s = (s + '\n' + js + '\n(function(){var s=document.getElementById("ccs-brief");if(!s){s=document.createElement("style");s.id="ccs-brief";'
     '(document.head||document.documentElement).appendChild(s)}s.textContent=' + json.dumps(css) + '})();\n')

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': sri(s), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / OUT).write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
