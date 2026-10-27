"""Staff New Order, 27 Oct 2026: the date step shows an open month calendar, and short notice is no longer asked.

Builds on the staged analytics build (dist/app/staff-app.380fcb6d4c.js, checked against its SRI first) so both ship
together. Anchored edits only (each must match exactly once). The website order form is not touched.

- Date step (new cakes): an always-open month calendar from today up to the furthest booking day. Closed days stay
  greyed out. Paper-slip (old order) entry keeps its own date field.
- Short notice: no chips, no "This is short notice" box, no reason or approver to fill in, no "(short notice)" in
  summaries. The database still requires a reason and approver for dates inside the normal notice, so the form sends
  "Booked by staff" and the signed-in staff member's name. Orders keep the database's short-notice flag.
- Unchanged: closed days, the furthest booking day, the daily limit message, the time slots.
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'dist/app/staff-app.380fcb6d4c.js'
BASE_SRI = 'sha384-nvd3O710eeHHWXnFRFJ1XZRW9nGnsB2hsg+GZRpPG9nonSQtO5inWtgNKqGcTJk2'
raw = BASE.read_bytes()
assert 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode() == BASE_SRI, 'Base is not the staged build'
s = raw.decode('utf-8')

CSS = ('#cc-staff .ccs-cal{max-width:440px;border:1px solid #D0D5DD;border-radius:14px;padding:12px;background:#fff}'
       '#cc-staff .ccs-cal-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}'
       '#cc-staff .ccs-cal-h b{font-weight:600;font-size:17px;color:#1D2939}'
       '#cc-staff .ccs-cal-nav{width:44px;height:44px;border:1px solid #D0D5DD;border-radius:10px;background:#fff;color:#1D2939;font-size:22px;line-height:1;cursor:pointer}'
       '#cc-staff .ccs-cal-nav:disabled{opacity:.35;cursor:default}'
       '#cc-staff .ccs-cal-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}'
       '#cc-staff .ccs-cal-dow{text-align:center;font-size:13px;color:#667085;padding:2px 0}'
       '#cc-staff .ccs-cal-d{min-height:46px;border:1px solid transparent;border-radius:10px;background:#F2F4F7;color:#1D2939;font:inherit;font-size:16px;font-variant-numeric:tabular-nums;cursor:pointer;padding:0}'
       '#cc-staff .ccs-cal-d:hover:not(:disabled){border-color:#98A2B3}'
       '#cc-staff .ccs-cal-d.is-today{border-color:#98A2B3}'
       '#cc-staff .ccs-cal-d:disabled{background:none;color:#B0B7C3;cursor:default;text-decoration:line-through}'
       '#cc-staff .ccs-cal-d[aria-pressed=true]{background:var(--ds-select-bg,#EAF0FB);color:var(--ds-select-text,#1E3A6E);border-color:var(--ds-primary,#2F4F86);box-shadow:inset 0 0 0 1px var(--ds-primary,#2F4F86);font-weight:600}'
       '#cc-staff .ccs-cal-d:focus-visible,#cc-staff .ccs-cal-nav:focus-visible{outline:3px solid #537b9d;outline-offset:2px}'
       'html.ccs-tablet-mode #cc-staff .ccs-cal{max-width:520px}html.ccs-tablet-mode #cc-staff .ccs-cal-d{min-height:52px;font-size:18px}'
       '@media(max-width:759px){#cc-staff .ccs-cal{max-width:none;padding:10px}#cc-staff .ccs-cal-d{min-height:44px}}')

CAL = ('function ccsMonth(d){if(!document.getElementById("ccs-cal-style")){var st=document.createElement("style");st.id="ccs-cal-style";st.textContent=' + json.dumps(CSS) + ';document.head.appendChild(st)}'
       'var L=y.setup.location,td=Dt(),mx=jt(td,L.max_days_ahead),cl=y.setup.closed_dates||[],m=V.calM||(V.date&&V.date>=td?V.date:td).slice(0,7),'
       'y0=+m.slice(0,4),m0=+m.slice(5,7)-1,f=m+"-01",dim=new Date(Date.UTC(y0,m0+1,0)).getUTCDate(),ld=(new Date(f+"T12:00:00Z").getUTCDay()+6)%7,'
       'pm=new Date(Date.UTC(y0,m0-1,1)).toISOString().slice(0,7),nm=new Date(Date.UTC(y0,m0+1,1)).toISOString().slice(0,7),'
       'h=\'<div class="ccs-field ccs-calf"><span class="ccs-label">\'+(d?"Delivery date":"Collection date")+\'</span><div class="ccs-cal"><div class="ccs-cal-h">'
       '<button type="button" class="ccs-cal-nav" data-act="n-calm" data-v="\'+pm+\'" aria-label="Previous month"\'+(pm<td.slice(0,7)?" disabled":"")+\'>‹</button>'
       '<b aria-live="polite">\'+new Date(f+"T12:00:00Z").toLocaleDateString("en-GB",{month:"long",year:"numeric",timeZone:"UTC"})+\'</b>'
       '<button type="button" class="ccs-cal-nav" data-act="n-calm" data-v="\'+nm+\'" aria-label="Next month"\'+(nm>mx.slice(0,7)?" disabled":"")+\'>›</button></div><div class="ccs-cal-g">\''
       '+["M","T","W","T","F","S","S"].map(function(e){return\'<span class="ccs-cal-dow" aria-hidden="true">\'+e+"</span>"}).join("");'
       'for(var i=0;i<ld;i++)h+=\'<span aria-hidden="true"></span>\';'
       'for(var k=1;k<=dim;k++){var v=m+"-"+String(k).padStart(2,"0"),off=v<td||v>mx||cl.indexOf(v)>-1;'
       'h+=\'<button type="button" class="ccs-cal-d\'+(v===td?" is-today":"")+\'" data-act="n-date" data-v="\'+v+\'" aria-pressed="\'+(V.date===v)+\'" aria-label="\'+Tt(Mt(v,!0))+(v===td?", today":"")+(off?", closed":"")+\'"\'+(off?" disabled":"")+">"+k+"</button>"}'
       'return h+"</div></div></div>"}')

FIXES = [
    # The calendar helper sits next to the date step
    ('function Or(t,n){', CAL + 'function Or(t,n){'),
    # Date step: paper slips keep the chips and date field; new cakes get the open calendar
    ('h+=\'<div class="ccs-field"><span class="ccs-label">\'+(d?"Delivery date":"Collection date")+\'</span><div class="ccs-chips ccs-datechips\'',
     'V.old?h+=\'<div class="ccs-field"><span class="ccs-label">\'+(d?"Delivery date":"Collection date")+\'</span><div class="ccs-chips ccs-datechips\''),
    ('+")</span></div>",x&&(h+=\'<div class="ccs-row">', '+")</span></div>":h+=ccsMonth(d),V.old&&x&&(h+=\'<div class="ccs-row">'),
    # No short-notice box
    ('vr()&&!l&&(h+=\'<div class="ccs-panel"><b>This is short notice.</b>', '!1&&vr()&&!l&&(h+=\'<div class="ccs-panel"><b>This is short notice.</b>'),
    # Nothing to fill in for short notice
    ('function br(){return!vr()||V.rush.trim().length>=3&&V.rushBy.trim().length>=2}', 'function br(){return!0}'),
    ('if(vr()&&V.rush.trim().length<3){', 'if(!1){'),
    ('if(vr()&&V.rushBy.trim().length<2){', 'if(!1){'),
    # No "short notice" in the summaries
    ('(vr()?" (short notice)":"")', '""'),
    # Month arrows
    ('case"n-date":V.date=o,', 'case"n-calm":V.calM=o,Tr();break;case"n-date":V.date=o,'),
    # What the database needs for a date inside the normal notice
    ('rush:vr()?{reason:V.rush,approved_by:V.rushBy}:null',
     'rush:vr()?{reason:"Booked by staff",approved_by:(y.me&&y.me.full_name||"").trim().length>=2?y.me.full_name.trim():"Staff"}:null'),
]
for old, new in FIXES:
    n = s.count(old)
    assert n == 1, ('anchor must match once', n, old[:90])
    s = s.replace(old, new)
old = '(vr()?" · Short notice, approved by "+Tt(V.rushBy):"")'
assert s.count(old) == 2, s.count(old)
s = s.replace(old, '""')
assert '</script' not in s.lower()

out = s.encode('utf-8')
name = 'staff-app.' + hashlib.sha256(out).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(out)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(out).digest()).decode()
print(json.dumps({'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(out), 'base': BASE.name}))
