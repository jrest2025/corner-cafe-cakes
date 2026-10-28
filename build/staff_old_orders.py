"""Corner Café: old orders from paper slips, a duplicate warning, corrections after handover, a clear history
(21 October 2026).

Roneel: "the form shoud allow our staff to renter orders that were taken ealier becasue we are now doing all the cake
entries that were done previously manually" and "Yes warn for duplicates.. yes allow correctiong for old orders but all
orders showu d have a clear audit traiut showing all changes etc".
Database: supabase/sql/old_orders_20261021.sql (staff_enter_old_order, order_possible_duplicates, staff_correct_order).

Base: the live release (dist/app/staff-analytics-look-manifest.json) unless BASE names another manifest.
OUT names the manifest written (default dist/app/staff-old-orders-manifest.json).

Changes to the base bundle, each asserted to match exactly once:
  1. The app lends the add-on more of its pieces as window.__ccsOf: the price, the delivery fee, today's date, Save and
     a redraw of the whole sheet.
  2. Old order: the marketing question and the Birthday Club are not offered (nothing is recorded); the slip date
     replaces "When did they order?"; the steps check the slip date, who took it, a pickup date before today, and
     whether and when it was paid (checked in full on Save); no short notice; the pickup date field allows dates up to
     yesterday; a custom cake's price on the slip is required; the slip preview shows the date on the slip and years;
     the last step asks about payment; Save says "Save old order"; it is saved through staff_enter_old_order, without
     the separate order date, who-took-it and Birthday Club calls (the database does those); the sheet and page are
     titled "Old order from a paper slip"; saved from the calendar, it says "Saved as picked up".
  3. Before saving any order, once everything else is in order: the duplicate check (CCOldOrders.hold).
  4. Orders already handed over: "Correct this order" (with Change order rights) opens Change order as a correction (no
     "who asked", the reason is "What was wrong?", Review correction, Save correction), saved through
     staff_correct_order.
  5. Order history: every line through CCOldOrders.line (old and new values of each change, plain words), in the order
     things happened (events saved together keep their order).
  6. Appends src/staff.old-orders.js and src/staff.old-orders.css.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-analytics-look-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-old-orders-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCOldOrders' not in s, 'Base already has old orders'


def swap(old, new):
    global s
    n = s.count(old)
    assert n == 1, 'anchor found %d times: %s' % (n, old[:100])
    s = s.replace(old, new)


OO = 'window.CCOldOrders'

# 1. More of the app's pieces, lent to the add-on
swap('__ccsOf=window.__ccsOf={V:function(){return V},',
     '__ccsOf=window.__ccsOf={V:function(){return V},price:function(){return pr()},fee:function(){return ur()},today:function(){return Dt()},submit:function(){no()},sheet:function(){wr()},')
swap('<h1 class="ccs-title">New order</h1>', '<h1 class="ccs-title">\'+(V.old?"Old order from a paper slip":"New order")+\'</h1>')

# 2. Old order
# Marketing permission is not asked on a paper slip
swap('var u=function(e){return\'<div class="sl-sub"><span class="sl-k">\'+e+\' <em class="sl-req">Required</em></span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-opt"',
     'var u=function(e){if(V.old&&' + OO + ')return ' + OO + '.noConsent();return\'<div class="sl-sub"><span class="sl-k">\'+e+\' <em class="sl-req">Required</em></span><div class="ccs-chips"><button type="button" class="ccs-chip" data-act="sl-opt"')
# The date on the slip, in place of "When did they order?"
swap('function ao(){var e=V.taken||"";',
     'function ao(){if(V.old&&' + OO + ')return ' + OO + '.slipDate(V);var e=V.taken||"";')
# Step checks
swap('if(!V.taken)n.push("Choose when the customer placed the order");',
     'if(V.old&&' + OO + ')n=n.concat(' + OO + '.missing(1,V));else if(!V.taken)n.push("Choose when the customer placed the order");')
swap('n.unshift("Choose who is taking this order")',
     'n.unshift(V.old?"Choose who took this order":"Choose who is taking this order")')
swap('[/who is taking this order/i,', '[/who (is taking|took) this order/i,')
# The Birthday Club is offered to a customer who is there, not from a paper slip
swap('(window.CCBirthdayClub?window.CCBirthdayClub.join(V):"")', '(window.CCBirthdayClub&&!V.old?window.CCBirthdayClub.join(V):"")')
# A custom cake request: the price on the slip is required
swap('<label class="sl-k" for="n-reqprice">Price (FJD) <em class="sl-opt">Optional</em></label>',
     '<label class="sl-k" for="n-reqprice">\'+(V.old?\'Price on the slip (FJD) <em class="sl-req">Required</em>\':\'Price (FJD) <em class="sl-opt">Optional</em>\')+\'</label>')
swap('placeholder="Leave empty if it still needs pricing"',
     'placeholder="\'+(V.old?"For example: 85":"Leave empty if it still needs pricing")+\'"')
swap('<span class="ccs-hint">Without a price it is saved as Needs a price. With a price it waits for the customer to agree. It goes to the kitchen only when you press Confirm order.</span>',
     '<span class="ccs-hint">\'+(V.old?"The cake price written on the slip.":"Without a price it is saved as Needs a price. With a price it waits for the customer to agree. It goes to the kitchen only when you press Confirm order.")+\'</span>')
# The live slip: the date on the slip (not today), and pickup dates with their year
swap('m("Date",99,Tt(s.toLocaleDateString(',
     'm("Date",99,V.old&&' + OO + '?' + OO + '.slipLine(V):Tt(s.toLocaleDateString(')
swap('g=V.date&&V.time?Tt(Mt(V.date,!0))+", "',
     'g=V.date&&V.time?Tt(Mt(V.date,!0))+(V.old?" "+Tt(V.date.slice(0,4)):"")+", "')
# ... and a custom design's price from the slip
swap('m("Price",0,null!=pr()?At(pr()):V.req?"To be priced":"")',
     'm("Price",0,V.old&&' + OO + '&&' + OO + '.priceText(V)||(null!=pr()?At(pr()):V.req?"To be priced":""))')
swap('if(2===e){if(V.customer)return void 0===V.custConsent',
     'if(2===e){if(V.old&&' + OO + ')return V.customer||zt(V.phone).length>=7?[]:["Write the full mobile number"];if(V.customer)return void 0===V.custConsent')
swap('if(3===e){if(!V.date)return["Choose the date"];',
     'if(3===e){if(V.old&&' + OO + '){var oo=' + OO + '.missing(3,V);if(oo.length)return oo}if(!V.date)return["Choose the date"];')
swap('if(7===e){if(ee&&!V.req&&"custom"!==V.finish){if(!V.payPlan)return["Choose how the customer is paying"];',
     'if(7===e&&V.old&&' + OO + ')return ' + OO + '.missing(7,V);if(7===e){if(ee&&!V.req&&"custom"!==V.finish){if(!V.payPlan)return["Choose how the customer is paying"];')
# Never short notice
swap('function vr(){return V.date&&V.date>=Dt()&&V.date<mr()}',
     'function vr(){return!V.old&&V.date&&V.date>=Dt()&&V.date<mr()}')
# The pickup date: the date field only, up to yesterday
swap('x=V.dateOther||V.date&&f.indexOf(V.date)<0&&g.indexOf(V.date)<0',
     'x=V.old||V.dateOther||V.date&&f.indexOf(V.date)<0&&g.indexOf(V.date)<0')
swap('\'<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-date">Other date</label><input class="ccs-input" id="n-date" type="date" max="\'+jt(Dt(),s.max_days_ahead)+\'"',
     '\'<div class="ccs-row"><div class="ccs-field"><label class="ccs-label" for="n-date">\'+(V.old?"Pickup date (on the slip)":"Other date")+\'</label><input class="ccs-input" id="n-date" type="date" max="\'+(V.old?jt(Dt(),-1):jt(Dt(),s.max_days_ahead))+\'"')
# The last step: was it paid, how and when
swap('function Nr(e){var t=pr(),a="custom"===V.finish,',
     'function Nr(e){if(V.old&&' + OO + ')return ' + OO + '.pay(V,e);var t=pr(),a="custom"===V.finish,')
swap('function to(){var e=pr();if(ee&&',
     'function to(){if(V.old)return"Save old order";var e=pr();if(ee&&')
# Saving: an old order is checked in full first (the app skips its payment check for custom designs)
swap('function no(){y.setup.location;',
     'function no(){if(V.old&&' + OO + '){var oo7=' + OO + '.missing(7,V);if(oo7.length)return V.err=oo7.join(". ")+".",V.errField="stage",Tr()}y.setup.location;')
# Saving: the database records the order date and who took it for an old order
swap('var i=function(){var t=V.taken||"now";',
     'var i=V.old?null:function(){var t=V.taken||"now";')
# 3. The duplicate check, once everything else is in order and just before any order is saved
swap(':(y.busy=!0,Tr(),void a.rpc("staff_create_order",{p:c}).then(',
     ':' + OO + '&&' + OO + '.hold(c,V)?void 0:(y.busy=!0,Tr(),void(V.old&&' + OO + '?' + OO + '.rpc(c,V):a.rpc("staff_create_order",{p:c})).then(')
# Saved from the calendar: say it was saved as picked up
swap('"confirmed"===e.status?"Confirmed.":"awaiting_deposit"===e.status?"Waiting for the deposit.":"Waiting in Needs attention."',
     '"completed"===e.status?"Saved as picked up.":"confirmed"===e.status?"Confirmed.":"awaiting_deposit"===e.status?"Waiting for the deposit.":"Waiting in Needs attention."')
swap('window.CCOrderFlow&&e.data.order_id&&window.CCOrderFlow.afterOrder(V,e.data),window.CCBirthdayClub&&e.data.order_id&&window.CCBirthdayClub.afterOrder(V,e.data),',
     '!V.old&&window.CCOrderFlow&&e.data.order_id&&window.CCOrderFlow.afterOrder(V,e.data),!V.old&&window.CCBirthdayClub&&e.data.order_id&&window.CCBirthdayClub.afterOrder(V,e.data),')
swap('"new"===y.sheet.type?Cn(V.result&&V.result.of?"Order saved":"New order",y.tablet?Po():"")',
     '"new"===y.sheet.type?Cn(V.result&&V.result.of?(V.result.old?"Old order saved":"Order saved"):V.old?"Old order from a paper slip":"New order",y.tablet?Po():"")')

# 4. Correct an order that was already handed over
swap('(F+=\'<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="amend">Change order</button>\');',
     '(F+=\'<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="amend">Change order</button>\');'
     'r&&"completed"===u&&ha("ord.edit")&&(F+=\'<button type="button" class="ccs-btn ccs-ghost" data-act="panel" data-v="amend">Correct this order</button>\');')
swap('<div class="ccs-panel ccs-amend"><b>Check these changes to \'+Tt(e.reference)+\'</b>',
     '<div class="ccs-panel ccs-amend"><b>\'+("completed"===e.order_status?"Check this correction to ":"Check these changes to ")+Tt(e.reference)+\'</b>')
swap('return n+=\'<p class="ccs-hint">Requested by \'+{guest:"the guest",staff:"our team",other:"someone else"}[y.am.by]+". Reason: "+Tt(y.am.reason.trim())+"</p>",'
     'n+=\'<p class="ccs-hint">\'+(y.setup&&y.setup.guest_emails?"The customer is not emailed about changes yet.":"Guest emails are off. Tell the customer by WhatsApp or phone after saving.")+"</p>",'
     'n+a+\'<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="am-save">Save amendment</button>',
     'return"completed"===e.order_status?n+=\'<p class="ccs-hint">What was wrong: \'+Tt(y.am.reason.trim())+\'</p><p class="ccs-hint">Saved in the order history with your name and the time. The customer is not contacted.</p>\':'
     '(n+=\'<p class="ccs-hint">Requested by \'+{guest:"the guest",staff:"our team",other:"someone else"}[y.am.by]+". Reason: "+Tt(y.am.reason.trim())+"</p>",'
     'n+=\'<p class="ccs-hint">\'+(y.setup&&y.setup.guest_emails?"The customer is not emailed about changes yet.":"Guest emails are off. Tell the customer by WhatsApp or phone after saving.")+"</p>"),'
     'n+a+\'<div class="ccs-actions-row"><button type="button" class="ccs-btn ccs-good" data-act="am-save">\'+("completed"===e.order_status?"Save correction":"Save amendment")+\'</button>')
swap('data-act="am-review">Review changes</button>',
     'data-act="am-review">\'+("completed"===e.order_status?"Review correction":"Review changes")+\'</button>')
swap('g=\'<div class="ccs-panel ccs-amend"><b>Amend \'+Tt(e.reference)+\'</b><p class="ccs-hint">Open only what is changing. Nothing is saved until you review and save.</p>\'',
     'g=\'<div class="ccs-panel ccs-amend"><b>\'+("completed"===e.order_status?"Correct ":"Amend ")+Tt(e.reference)+\'</b><p class="ccs-hint">\'+("completed"===e.order_status?'
     '"This order was already handed over. Open only what was entered wrongly. Each correction is kept in the order history."'
     ':"Open only what is changing. Nothing is saved until you review and save.")+\'</p>\'')
swap('return g+=\'<div class="ccs-field"><span class="ccs-label">Who asked for the change?</span>',
     'return g+=("completed"===e.order_status?\'<div class="am-fix-by" hidden>\':"")+\'<div class="ccs-field"><span class="ccs-label">Who asked for the change?</span>')
swap('+"</div>",(g+=b("am-reason","reason","Reason",n.reason,"For example: guest wants a bigger cake for more people"))',
     '+"</div>"+("completed"===e.order_status?"</div>":""),(g+=b("am-reason","reason","completed"===e.order_status?"What was wrong? (kept in the order history)":"Reason",n.reason,'
     '"completed"===e.order_status?"For example: the slip says Thursday 15 October":"For example: guest wants a bigger cake for more people"))')
swap('if(!n.by)return y.panelErr="Choose who asked for the change.",_n();',
     'if(!n.by&&"completed"!==t.order_status)return y.panelErr="Choose who asked for the change.",_n();')
swap('if(n.reason.trim().length<3)return y.panelErr="Add a short reason for the change.",_n();',
     'if(n.reason.trim().length<3)return y.panelErr="completed"===t.order_status?"Say what was wrong.":"Add a short reason for the change.",_n();')
swap('a.rpc("staff_amend_order",{p_order:t.id,p_version:t.version,p_changes:s,p_requested_by:n.by,p_reason:n.reason.trim(),p_commit:!!e})',
     'a.rpc("completed"===t.order_status?"staff_correct_order":"staff_amend_order",{p_order:t.id,p_version:t.version,p_changes:s,p_requested_by:n.by||"other",p_reason:n.reason.trim(),p_commit:!!e})')
swap('var o="Saved as revision "+r.data.revision+".";',
     'var o="completed"===t.order_status?"Correction saved. It is in the order history.":"Saved as revision "+r.data.revision+".";')

# 5. Order history in plain words, in the order things happened (events saved together keep their order)
swap('return(n[e.kind]||e.kind)+(t.note?": "+t.note:"")+" · "+a',
     'return(' + OO + '&&' + OO + '.line(e,n[e.kind])||n[e.kind]||e.kind)+(t.note?": "+t.note:"")+" · "+a')
swap('(t.order_events||[]).slice().sort((function(e,t){return e.at<t.at?-1:1}))',
     '(t.order_events||[]).slice().sort((function(e,t){return e.at<t.at?-1:e.at>t.at?1:(Number(e.id)||0)-(Number(t.id)||0)}))')

# 6. The add-on and its styles
js = (ROOT / 'src/staff.old-orders.js').read_text()
css = (ROOT / 'src/staff.old-orders.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s += ('\n' + js + '\n(function(){var s=document.createElement("style");s.id="ccs-old-orders";s.textContent=' + json.dumps(css) +
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
