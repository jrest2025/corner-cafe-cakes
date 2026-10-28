"""Corner Café: a New order that leads the way (20 October 2026).

Roneel: "refine refine refine.. the order form ... should feel fun and easy to fill .. and very very intuitive .. if they
are taking the order with a customer they should not be looking for buttons and what to press .. the flow has to be
there". And: "the person filling the cake order form must enter their name. its a requirement. because the counter
tablet has no specific login." Approved: who is taking the order on every New order and every device (names used before
on the device are one-tap buttons, none picked in advance); no hidden menus; the screen leads the way; date and time
together; a clear finish screen; the order date starts on Today.
Database: supabase/sql/taken_by_20261020.sql (applied; nothing changes until the app sends a name).

Base: the live release (dist/app/staff-birthday-club-manifest.json) unless BASE names another manifest.
OUT names the manifest written (default staff-order-flow-manifest.json). The footer's compact-entry list goes empty in
the same release (build/footer_order_flow.py), so the three "Select · Required" menus show as plain buttons.

Changes to the base bundle, each asserted:
  1. The app lends the add-on a few of its own pieces as window.__ccsOf: the New order draft, its step, what is still
     missing, Next, redraw, the login, the database client, messages, and the finish screen.
  2. New orders start with the order date on Today, and nobody picked as taking the order.
  3. Customer step: "Who is taking this order?" first, and it is required before Next.
  4. The slip preview's "Order Taken by" line shows that name, and belongs to the Customer step.
  5. Once the order is saved, who took it is saved on it (order_set_taken_by), and the kitchen slip waits for that.
  6. The order's history says "Order taken by Mere"; the order's Customer box says "Taken by Mere".
  7. When is it needed: the times sit under the dates on phones too (no separate Pickup time page).
  8. After saving: the finish screen, on tablets and everywhere else (orders started from the calendar still go back to
     the calendar). New order while the finish screen is open starts the next order. Start over no longer turns an
     order into a calendar order.
  9. "When did they order?" replaces the longer question and its extra line.
 10. Appends src/staff.order-flow.js and src/staff.order-flow.css.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-birthday-club-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-order-flow-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCOrderFlow' not in s, 'Base already has the order flow'


def swap(text, old, new):
    assert text.count(old) == 1, 'anchor not unique: ' + old[:90]
    return text.replace(old, new)


# 1. The app's pieces, lent to the add-on
KEY = 'storageKey:"cc-cakes-staff"}}),'
s = swap(s, KEY, KEY + '__ccsOf=window.__ccsOf={V:function(){return V},me:function(){return y.me||{}},step:function(){return Lr()},'
         'missing:function(e){return Br(e)},all:function(){return zr()},next:function(){Yr(!1)},redraw:function(){Tr()},'
         'busy:function(){return!!y.busy},rpc:function(e,t){return a.rpc(e,t)},toast:function(e,t,n){ma(e,t,n)},'
         'done:function(e){Hs(),V.result=e,y.justAdded=e.order_id,clearTimeout(Bo.t),Bo.t=setTimeout((function(){y.justAdded=null,'
         '"today"!==y.tab&&"orders"!==y.tab||Ma()}),12e3),_n();var t=document.querySelector("#ccs-sheet .ccs-sheet-body");t&&(t.scrollTop=0)}},')

# 2. New drafts: the order date on Today, nobody picked as taking the order
s = swap(s, 'function Bs(){return{key:Bt(),source:null,taken:null,takenDate:"",',
         'function Bs(){return{key:Bt(),source:null,taken:"now",takenDate:"",takenBy:null,')

# 3. Customer step: who is taking this order, first and required
s = swap(s, 'p="Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?";l=V.customer?',
         'p="Can we send them cake offers and reminders, and offers from Jack&#39;s Restaurants?";l=(window.CCOrderFlow?window.CCOrderFlow.who(V):"")+(V.customer?')
s = swap(s, '+u(p),l+=\'<p class="sl-k" style="margin:14px 0 8px">How did they order?',
         '+u(p)),l+=\'<p class="sl-k" style="margin:14px 0 8px">How did they order?')
s = swap(s, 'n.push("The date the customer placed the order must not be after the collection date");return n}if(2===e)',
         'n.push("The date the customer placed the order must not be after the collection date");'
         'window.CCOrderFlow&&!window.CCOrderFlow.okName(V.takenBy)&&n.unshift("Choose who is taking this order");return n}if(2===e)')

# 4. The slip preview
s = swap(s, 'm("Order Taken by",99,Tt(n.full_name||"You"))',
         'm("Order Taken by",window.CCOrderFlow?1:99,Tt(window.CCOrderFlow?window.CCOrderFlow.label(V):n.full_name||"You"))')

# 5. Once the order is saved; the kitchen slip waits for the name
BC = 'window.CCBirthdayClub&&e.data.order_id&&window.CCBirthdayClub.afterOrder(V,e.data),'
s = swap(s, BC, 'window.CCOrderFlow&&e.data.order_id&&window.CCOrderFlow.afterOrder(V,e.data),' + BC)
s = swap(s, 'a.rpc("staff_print_brief",{p_order:n.id,p_email:!1!==t.email})',
         '(window.CCOrderFlow?window.CCOrderFlow.wait(n.id):Promise.resolve()).then((function(){return a.rpc("staff_print_brief",{p_order:n.id,p_email:!1!==t.email})}))')

# 6. History and the order's Customer box
HIST = 'birthday_offer:"Birthday Club: free cupcake added",'
s = swap(s, HIST, HIST + 'taken_by:"Order taken by "+(t.name||""),')
s = swap(s, 'Tn("Ordered via",c[t.source])', 'Tn("Ordered via",c[t.source])+Tn("Taken by",t.taken_by_name)')

# 7. Date and time together on every screen
s = swap(s, 'function Ur(){return!(!window.matchMedia||!window.matchMedia("(max-width: 759px)").matches)||!(!V||!V.date||!vr()&&"delivery"!==V.method)}',
         'function Ur(){return!window.CCOrderFlow&&(!(!window.matchMedia||!window.matchMedia("(max-width: 759px)").matches)||!(!V||!V.date||!vr()&&"delivery"!==V.method))}')

# 8. The finish screen
s = swap(s, 'function Bo(e,t){var a=V.date&&V.time?Mt(V.date)+", "+Ft(V.time):"";',
         'function Bo(e,t){var a=V.date&&V.time?Mt(V.date)+", "+Ft(V.time):"";if(window.CCOrderFlow&&window.CCOrderFlow.finish(e,t,a))return;')
s = swap(s, 'function Cr(){if(V.result){var e=V.result;',
         'function Cr(){if(V.result){if(V.result.of&&window.CCOrderFlow)return window.CCOrderFlow.done(V.result);var e=V.result;')
s = swap(s, '"new"===y.sheet.type?Cn("New order",y.tablet?Po():"")',
         '"new"===y.sheet.type?Cn(V.result&&V.result.of?"Order saved":"New order",y.tablet?Po():"")')
# New order (menu or button) while the finish screen is open starts the next order there
s = swap(s, 'function Ro(){if(ha("ord.create")&&!yr())',
         'function Ro(){if(yr()&&V.result&&V.result.of){V=Bs(),_n();var r=document.querySelector("#ccs-sheet .ccs-sheet-body");return void(r&&(r.scrollTop=0))}'
         'if(ha("ord.create")&&!yr())')
# Start over kept the date and time as if the order came from the calendar even when it did not, so the saved order went
# back to the calendar instead of the finish screen. It now does that only for orders started from the calendar.
s = swap(s, 'case"new-clear":var F=yr()?[V.date,V.time]:null;', 'case"new-clear":var F=yr()&&V.fromCal?[V.date,V.time]:null;')

# 9. When did they order
s = swap(s, '\'<p class="sl-k tk-k">When did the customer place this order? <em class="sl-req">Required</em></p>'
            '<p class="ccs-hint">Choose the day the customer first ordered, even if you are entering it later.</p>',
         '\'<p class="sl-k tk-k">When did they order?</p>')

# 10. The add-on and its styles
js = (ROOT / 'src/staff.order-flow.js').read_text()
css = (ROOT / 'src/staff.order-flow.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s += ('\n' + js + '\n(function(){var s=document.createElement("style");s.id="ccs-order-flow";s.textContent=' + json.dumps(css) +
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
