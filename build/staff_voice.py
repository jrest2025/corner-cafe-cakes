"""Corner Café Service Hub: the colleague voice (21 October 2026). Words only; see docs/staff-voice.md.

Roneel, 12:08 PM: "now humanise it .. the language. liek agentle collgue guiding you along so that you dont miss
anythign or helps you get the information you need". He chose the whole app (practice mode too).

Base: the live release (dist/app/staff-old-orders-manifest.json) unless BASE names another manifest.
OUT names the manifest written (default dist/app/staff-voice-manifest.json).

Every swap below is asserted to match the expected number of times. Only words change: the same fields, rules,
checks, buttons and saving. Also:
  - the order flow's "show me what is missing" outlines follow the new wording (its message patterns);
  - the old orders add-on's slip-date message pattern follows its new wording;
  - messages the database sends back when a New order is not saved are reworded by src/staff.voice.js;
  - the line under each step title comes from src/staff.voice.css.
The finish step's own words (src/staff.finish-flow.js) are loaded separately by the page footer.
"""
import base64, hashlib, json, os, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE', 'dist/app/staff-old-orders-manifest.json')
OUT = os.environ.get('OUT', 'dist/app/staff-voice-manifest.json')
bm = json.loads((ROOT / BASE).read_text())
s = (ROOT / bm['file']).read_text()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


assert sri(s) == bm['sri'], 'Base does not match its manifest'
assert 'CCVoice' not in s, 'Base already has the voice'

# (what the app says now, what it says instead, how many times it appears)
# Inside quotes the quote marks are part of the anchor. Plain-text anchors sit inside single-quoted strings in some
# places, so their new words have no apostrophes.
SAY = [
    # ---- New order, Customer step: what is still to do ----
    ('"Choose who is taking this order"', '"Tap your name first, so the kitchen knows who took the order"', 1),
    ('"Choose who took this order"', '"Tap the name of whoever took the order. It is usually on the slip"', 1),
    ('"Write the full mobile number"', '"We still need their mobile number. It\'s how we reach them about the cake"', 2),
    ('"Write the guest name"', '"Add the customer\'s name, so we know whose cake it is"', 1),
    ('"Ask if they want cake offers and reminders"', '"Ask if they\'d like cake offers and reminders, then tap Yes or No"', 2),
    ('"Choose how the customer placed the order"', '"Tap how they ordered: walk-in, phone, WhatsApp and so on"', 1),
    ('"Choose when the customer placed the order"', '"Tap when they ordered"', 1),
    ('"Choose a valid earlier date the customer placed the order"', '"Pick the day they ordered. It must be before today"', 1),
    ('"The date the customer placed the order must not be after the collection date"', '"The day they ordered can\'t be after the pickup day. Check both dates"', 1),
    # ---- Cake step ----
    ('"Tap a price to choose the cake and size"', '"Tap a price in the table to choose their cake and size"', 1),
    ('"Choose the flavour"', '"Ask which flavour they\'d like, then tap it"', 1),
    ('"Describe the custom design"', '"Write down the design they want, so the kitchen gets it right"', 1),
    ('"Describe how the cake should look"', '"Write how the cake should look, so the kitchen can price it"', 1),
    ('"Write the size or how many people it serves"', '"Add the size, or how many people it should feed"', 1),
    ('"Check the price, or leave it empty"', '"Check the price, or leave it empty for now"', 1),
    # ---- Make it yours ----
    ('"Choose the occasion, or Customer didn\'t say"', '"Ask what they\'re celebrating, or tap Customer didn\'t say. It helps us remind them next year"', 2),
    ('"Ask about dietary needs and allergies"', '"Before you move on, ask if anyone eating the cake has an allergy"', 1),
    ('"Choose the dietary need or allergy, or write the details for the kitchen."', '"Tap the allergy, or write the details for the kitchen."', 1),
    ('"You chose Other: write the dietary details for the kitchen."', '"You picked Other: write the details for the kitchen."', 1),
    # ---- When ----
    ('"Choose the date"', '"Ask which day they need it, then tap the date"', 2),
    ('"Choose a day the café is open"', '"We\'re closed for cakes that day. Choose another day with them"', 2),
    ('"Choose the time"', '"Ask what time they\'ll come, then tap it"', 1),
    ('"Give the short-notice reason and who approved it"', '"This is short notice. Write why, and who in the kitchen said yes"', 2),
    ('"Finish the delivery details"', '"Add the delivery area and address, so the driver can find them"', 2),
    # ---- Payment ----
    ('"Choose how the customer is paying"', '"Tap what they paid today: in full, a deposit, or nothing yet"', 1),
    ('"Enter the deposit paid"', '"Type how much deposit they gave you"', 1),
    ('"The deposit is the full price: choose Paid in full"', '"That\'s the full price, so tap Paid in full instead"', 1),
    ('"Enter the amount paid"', '"Type the amount they paid"', 1),
    ('"Enter the amount the customer is paying."', '"Type the amount they\'re paying."', 1),
    ('"Say what the other cake requirement is."', '"You picked Other: say what the cake requirement is, so the kitchen knows."', 2),
    # ---- Old order from a paper slip ----
    ("'Choose the day the customer placed the order (the date on the slip)'", "'Add the date written on the slip (the day they ordered)'", 1),
    ("'The day the customer placed the order must be before today'", "'The slip date should be before today. Check the slip again'", 1),
    ("'Choose the pickup date from the slip'", "'Add the pickup date written on the slip'", 1),
    ("'Check the year of the pickup date'", "'Check the year on the pickup date'", 1),
    ("'An old order was picked up before today. For today or a later date, choose New order at the top'",
     "'An old order was already picked up, so its date is before today. For today or later, choose New order at the top'", 1),
    ("'Enter the cake price from the slip'", "'Type the cake price from the slip'", 1),
    ("'Enter the price from the slip on the Cake step'", "'Go back to the Cake step and type the price from the slip'", 1),
    ("'Choose whether it was paid'", "'Check the slip, then tap whether it was paid'", 1),
    ("'Enter the amount they paid (less than the price)'", "'Type the amount they paid (less than the price)'", 1),
    ("'Choose how they paid'", "'Tap how they paid'", 1),
    ("'Check the day they paid'", "'Check the day they paid. It is usually the pickup day'", 1),
    ('Type it in exactly as the slip says. It is saved as already picked up, with the payment on the day it was paid. No kitchen slip and no messages to the customer.',
     'Copy the slip exactly as it is written. We save it as already picked up, with the payment on the day it was paid. No kitchen slip, and nothing is sent to the customer.', 1),
    ('Choose Change only if something is different from the slip.', 'Go through it with the slip. Tap Change only if something is different.', 2),
    ("'<p>This customer already has '", "'<p>Quick check first. This customer already has '", 1),
    ('<b>Complete these details before saving:</b>', '<b>Almost there. Before you save, please finish these:</b>', 1),
    # ---- Tips under the questions ----
    ('Goes on the kitchen slip, so the team knows who took the order.', 'It goes on the kitchen slip, so the team knows who to ask.', 2),
    ('Only a clear yes is recorded as permission. It is saved with the order.', 'Ask them just like this. Only a clear yes counts, and it is saved with the order.', 2),
    ('Type the number first: a returning customer comes up with their details.', 'Type the number first. If they have ordered before, their details come up.', 1),
    ('The time you save this entry is recorded automatically.', 'If they are ordering right now, leave it on Today.', 1),
    ('A custom cake is priced by the team after the order is placed.', 'The kitchen prices a custom design after you save. You will add the price on the order.', 1),
    ('Up to 40 characters, copied exactly by the kitchen.', 'Up to 40 letters. The kitchen copies it exactly, so check the spelling with them.', 2),
    ('The order is saved as an allergy order and flagged. The kitchen slip says: Allergies not confirmed yet. Check with the customer before baking.',
     'That is fine. We flag it as an allergy order, and the kitchen slip says: Allergies not confirmed yet. Please check with the customer before baking.', 2),
    ('Used to remind them next year, if they agreed to messages.', 'We use this to remind them next year, if they said yes to messages.', 2),
    ('Normal notice: \'+fr()+" days (earliest "', 'The kitchen needs \'+fr()+" days\' notice (earliest "', 1),
    ('Only take it if the kitchen has agreed. Both are saved with the order.', 'Check with the kitchen first. Then write the reason and who said yes. Both are saved with the order.', 1),
    # ---- After saving ----
    ("'Give the customer their order number, then make the kitchen slip.'", "'Tell the customer their order number. Then make the kitchen slip, so baking can start.'", 1),
    ("'It is confirmed as soon as the deposit is recorded.'", "'It is confirmed as soon as you record their deposit.'", 1),
    ("'Add the price on the order when it is ready. The kitchen gets it once it is confirmed.'", "'When the kitchen has priced it, add the price on the order. The kitchen gets it once it is confirmed.'", 1),
    ("'Press Confirm order on the order once the customer agrees the price.'", "'Once the customer agrees the price, open the order and press Confirm order.'", 1),
    ('No email address was given, so no email was sent.', 'No email address was given, so no email went out. Make sure they have their order number.', 3),
    # ---- On an order ----
    ('Record the balance before handing over.', 'They still owe money. Take the balance before you hand it over.', 2),
    # ---- Messages from the database (src/staff.voice.js) ----
    ('V.err=e.data.message', 'V.err=window.CCVoice?window.CCVoice.say(e.data.message):e.data.message', 1),
    # ---- The order flow outlines what a message asks for: its patterns follow the new words ----
    ('[/who (is taking|took) this order/i,', '[/took the order|tap your name|who (is taking|took) this order/i,', 1),
    ('[/full mobile number/i,', '[/mobile number/i,', 1),
    ('[/guest name/i,', "[/customer's name|guest name/i,", 1),
    ('[/how the customer placed/i,', '[/how they ordered|how the customer placed/i,', 1),
    ('[/customer placed the order/i,', '[/day they ordered|slip date|customer placed the order/i,', 1),
    ('[/describe (the custom design|how the cake should look)/i,', '[/design they want|how the cake should look|describe (the custom design|how the cake should look)/i,', 1),
    ('[/size or how many people/i,', '[/how many people/i,', 1),
    ('[/dietary needs and allergies/i,', '[/has an allergy|dietary needs and allergies/i,', 1),
    ('[/dietary need or allergy|dietary details/i,', '[/tap the allergy|details for the kitchen|dietary need or allergy|dietary details/i,', 1),
    ('[/occasion/i,', '[/celebrating|occasion/i,', 1),
    ('[/choose the date|day the café is open/i,', '[/tap the date|closed for cakes|choose the date|day the café is open/i,', 1),
    ('[/choose the time/i,', '[/what time|choose the time/i,', 1),
    ('[/short-notice reason/i,', '[/short notice|short-notice reason/i,', 1),
    ('[/delivery details/i,', '[/delivery area and address|delivery details/i,', 1),
    ('[/how the customer is paying/i,', '[/what they paid today|how the customer is paying/i,', 1),
    ('[/deposit paid|deposit is the full price|amount paid/i,', '[/deposit they gave|full price|amount they paid|deposit paid|amount paid/i,', 1),
    ("'n-takedate': /date on the slip|day the customer placed the order/i", "'n-takedate': /written on the slip|slip date|day they ordered|day the customer placed the order/i", 1),
    # ... and the finish step's status line (src/staff.finish-flow.js, new words and old)
    ('/payment method/i.test(st)', '/how did they pay|payment method/i.test(st)', 1),
    ('/agreement/i.test(st)', '/did they agree|agreement/i.test(st)', 1),
]
for old, new, n in SAY:
    got = s.count(old)
    assert got == n, 'expected %d, found %d: %s' % (n, got, old[:90])
    s = s.replace(old, new)

# The voice add-on (messages from the database) first, so the app finds it; the step lines last
js = (ROOT / 'src/staff.voice.js').read_text()
css = (ROOT / 'src/staff.voice.css').read_text()
for part in (js, css):
    assert '</script' not in part.lower()
s = (js + '\n' + s + '\n(function(){var s=document.createElement("style");s.id="ccs-voice";s.textContent=' + json.dumps(css) +
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
