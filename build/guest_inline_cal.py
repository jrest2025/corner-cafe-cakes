"""Order form, 27 Oct 2026: the calendar sits open on the date step (no pop-up), and the "Need it sooner?" boxes go.

Starts from the live order form (dist/app/guest-app.cae549ce29.js, checked against its SRI first) and applies only
anchored edits (each must match exactly once). The same calendar element, day rules and click handling are reused:
it is simply placed inside the date step after every render instead of opening as a sheet.
Usage: python3 build/guest_inline_cal.py
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'dist/app/guest-app.cae549ce29.js'
BASE_SRI = 'sha384-vB0ZTqQ73+t4bvmncQkYXNZsYJuiL2uJvycd5/lcuVsJIKcjLaWrygO9WVJ5rFyW'
raw = BASE.read_bytes()
assert 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode() == BASE_SRI, 'Base is not the live build'
s = raw.decode('utf-8')

CSS = ('#cc-cake-order .cco-calhost{margin:4px 0 0;max-width:420px}'
       '#cc-cake-order .cco-calhost .cco-shade{position:static!important;inset:auto!important;z-index:auto!important;display:block!important;'
       'background:none!important;padding:0!important;opacity:1!important;pointer-events:auto!important}'
       '#cc-cake-order .cco-calhost .cco-sheet{transform:none!important;max-width:none!important;width:100%;border:1px solid var(--o-line);'
       'border-radius:16px!important;box-shadow:none!important;padding:14px 12px 12px!important}'
       '#cc-cake-order .cco-calhost .cco-sheet::before,#cc-cake-order .cco-calhost .cco-close,#cc-cake-order .cco-calhost .cco-cal-sooner{display:none!important}'
       '#cc-cake-order .cco-calhost.cco-bad .cco-sheet{border-color:var(--o-alert)}'
       '#cc-cake-order .cco-calhost .cco-cal-note{font-size:14px;margin:10px 2px 0}')

INLINE = ('var Cw=0;function Ci(){var h=t.querySelector(".cco-calhost");if(!h||!B){Cw=0;return}'
          'if(!document.getElementById("cco-inline-cal")){var st=document.createElement("style");st.id="cco-inline-cal";st.textContent=' + json.dumps(CSS) + ';document.head.appendChild(st)}'
          'if(!j||!Cw)j=new Date((p.date||re()).slice(0,8)+"01T12:00:00Z");Cw=1;'
          'var sh=B.querySelector(".cco-sheet");sh.setAttribute("role","group");sh.removeAttribute("aria-modal");'
          'B.classList.remove("cco-open");B.setAttribute("aria-hidden","false");Ge();if(B.parentNode!==h)h.appendChild(B)}')

FIXES = [
    # Date step: the calendar itself instead of the "Open calendar" button and the "Need it sooner?" box
    ('\'<button type="button" class="cco-date\'+(f.date?" cco-bad":"")+\'" data-act="cal"\'+be("date")+\'><span class="cco-date-l"><span class="cco-date-ico">\'+C.cal+"</span><span>"+(p.date?G(V(p.date)):"Choose a date")+\'</span></span><span class="cco-date-r">\'+(p.date?"Change":"Open calendar")+"</span></button>"+ye("date")+(p.date?"":\'<div class="cco-sooner"><p><b>Need it sooner?</b> Call or WhatsApp us and we’ll see what we can do.</p><div class="cco-sooner-acts">\'+we()+"</div></div>")',
     '\'<div class="cco-calhost\'+(f.date?" cco-bad":"")+\'" id="cco-calhost"></div>\'+ye("date")'),
    # Calendar note: no notice rule, no "Need it sooner?"
    ('B.querySelector(".cco-cal-note").textContent=("custom"===p.finish?"Custom designs need "+d.location.lead_days_custom:"Cakes need "+ie())+" days’ notice. Greyed-out days are not available.",B.querySelector(".cco-cal-sooner").innerHTML=\'<p><b>Need it sooner?</b> Call or WhatsApp us.</p><div class="cco-sooner-acts">\'+we()+"</div>"',
     'B.querySelector(".cco-cal-note").textContent="Grey days are not available.",B.querySelector(".cco-cal-sooner").innerHTML=""'),
    # After every render, place the calendar inside the date step
    ('function Oe(a){', 'function Oe(a){var r=Oe0(a);Ci();return r}' + INLINE + 'function Oe0(a){'),
]
for old, new in FIXES:
    n = s.count(old)
    assert n == 1, ('anchor must match once', n, old[:80])
    s = s.replace(old, new)
assert '</script' not in s.lower()

out = s.encode('utf-8')
name = 'guest-app.' + hashlib.sha256(out).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(out)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(out).digest()).decode()
print(json.dumps({'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(out), 'base': BASE.name}))
