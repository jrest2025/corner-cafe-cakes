"""Needs attention islands with a pop-up panel, plus the three-option Order Taken Date.

Narrow, asserted replacements on the exact live bundle (Settings removal release), keeping every prior overlay.
Brings pull requests #4 and #5 (which only changed src/staff.js, not the released bundle) into the release,
with the island panel opening as a pop-up instead of expanding the page.
"""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = ROOT / 'dist/app/staff-app.95e84353c2.js'
s = base.read_text()
BASE_SHA = 'sha384-Fo6HRhF3ZFBnoStTT94v1xcckp+MIql60sMOZ2/9ujls5FNbgWJ3so+SCnrai7nX'
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == BASE_SHA, 'Base is not the live release'

def swap(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:70], s.count(old))
    s = s.replace(old, new)

# 1. Island and pop-up helpers, placed in the app's main scope (same anchor the Settings release used).
needle = 'function Ed(){y.settings=null'
swap(needle, (ROOT / 'src/staff.attn-pop.js').read_text() + '\n' + needle)

# 2. Needs attention: compact islands; only the chosen category is rendered, inside the pop-up.
swap('''(o+='<div class="at-sum" role="group" aria-label="Jump to">'+s.map((function(e){return'<button type="button" class="at-jump '+e.tone+'" data-act="at-jump" data-v="'+e.key+'"><b>'+e.rows.length+"</b><span>"+Tt(e.title)+"</span></button>"})).join("")+"</div>",o+=s.map(''',
     '''(o+=apIslands(s),o+=apPanel(s,s.filter((function(e){return e.key===apOpen(s)})).map(''')
swap('''"</div></section>"})).join("")):''', '''"</div></section>"})).join(""))):''')
swap('case"at-jump":', 'case"ap-open":apSet(y.attnIsland===o?null:o);break;case"ap-close":apSet(null);break;case"at-jump":')

# 3. Order Taken Date: Today / Yesterday / Another date. No time-of-day input.
swap('''var e=V.taken||"now";return'<p class="sl-k tk-k">When was this order taken?</p><div class="ccs-chips tk-chips" role="group" aria-label="When the order was taken">'+[["now","Just now"],["today","Earlier today"],["yesterday","Yesterday"],["other","Another day"]]''',
     '''var e=V.taken||"now";"today"===e&&(e="now");return'<p class="sl-k tk-k">When did the customer place this order?</p><p class="ccs-hint">Choose the day the customer first ordered, even if you are entering it later.</p><div class="ccs-chips tk-chips" role="group" aria-label="Date the customer placed the order">'+[["now","Today"],["yesterday","Yesterday"],["other","Another date"]]''')
swap('''+"</div>"+("now"===e?"":'<div class="sl-sub tk-sub">'+("other"===e?'<label class="sl-k" for="n-takedate">Date taken</label><input class="ccs-input" id="n-takedate" type="date" data-n="takenDate" max="'+Dt()+'" value="'+Tt(V.takenDate||"")+'">':"")+'<label class="sl-k" for="n-taketime">About what time? <em class="sl-req">Optional</em></label><input class="ccs-input" id="n-taketime" type="time" data-n="takenTime" value="'+Tt(V.takenTime||"")+'"></div>')}''',
     '''+"</div>"+("other"===e?'<div class="sl-sub tk-sub"><label class="sl-k" for="n-takedate">Date the order was taken</label><input class="ccs-input" id="n-takedate" type="date" data-n="takenDate" min="'+jt(Dt(),-30)+'" max="'+Dt()+'" value="'+Tt(V.takenDate||"")+'"></div>':"")+'<p class="ccs-hint">The time you save this entry is recorded automatically.</p>'}''')
# Date-only: a placeholder noon Fiji time stores the calendar day; no customer time is invented from the clock.
swap('''var i=function(){var t=V.taken||"now";if("now"===t)return null;var a="today"===t?Dt():"yesterday"===t?jt(Dt(),-1):V.takenDate;if(!a)return null;var n=/^\\d{2}:\\d{2}/.test(V.takenTime||"")?V.takenTime.slice(0,5):"today"===t?null:"12:00";return n||(n=new Intl.DateTimeFormat("en-GB",{timeZone:e,hour:"2-digit",minute:"2-digit",hour12:!1}).format(new Date(Date.now()-36e5))),a+"T"+n+":00+12:00"}();''',
     '''var i=function(){var t=V.taken||"now";if("now"===t||"today"===t)return null;var a="yesterday"===t?jt(Dt(),-1):V.takenDate;if(!a||!/^\\d{4}-\\d{2}-\\d{2}$/.test(a)||a===Dt())return null;return a+"T12:00:00+12:00"}();''')
swap('Choose the date the order was taken, or pick Just now.', 'Choose the date the order was taken, or pick Today.')
# Future dates are refused by calendar day (Fiji), not by clock time.
swap('''i&&Date.parse(i)>Date.now()+6e4?(V.err="The time taken is later than now. Check the time, or pick Just now.",''',
     '''i&&i.slice(0,10)>Dt()?(V.err="The order date cannot be in the future. Check the date, or pick Today.",V.errField=null,Tr()):i&&i.slice(0,10)<jt(Dt(),-30)?(V.err="The order date must be within the last 30 days.",''')
swap('Order saved, but the time taken was not recorded', 'Order saved, but the original order date was not recorded')
swap('''case"n-taken":V.taken=o,"today"!==o&&"yesterday"!==o&&"other"!==o||(V.takenTime||(V.takenTime=""),"other"!==o||V.takenDate||(V.takenDate=jt(Dt(),-2))),ee||X?Tr():Ma(),setTimeout((function(){var e=document.getElementById("other"===o?"n-takedate":"n-taketime");e&&e.focus()}),30);break;''',
     '''case"n-taken":V.taken=o,V.takenTime="","other"!==o||V.takenDate||(V.takenDate=jt(Dt(),-2)),ee||X?Tr():Ma(),"other"===o&&setTimeout((function(){var e=document.getElementById("n-takedate");e&&e.focus()}),30);break;''')

css = (ROOT / 'src/staff.attn-pop.css').read_text()
assert '</script' not in css.lower() and '</script' not in s.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-attn-pop";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'

raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': str(base.relative_to(ROOT)), 'base_sri': BASE_SHA}
(ROOT / 'dist/app/staff-attn-pop-manifest.json').write_text(json.dumps(m, indent=2) + '\n')
print(json.dumps(m))
