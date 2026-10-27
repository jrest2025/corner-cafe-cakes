"""Kitchen slip, 27 Oct 2026: orders with an inspiration photo get the photo slip (logo top left with the order number,
larger type, photo beside Cake and Size); orders without a photo keep the slip as it was. No Short notice tag anywhere.
(Earlier draft text below.)

Usage: python3 build/staff_slip_photo.py dist/app/staff-app.<base>.js
Builds on the given staff build (the open-calendar release). Anchored edits only.
  1. Download (PDF): the embedded slip layout is replaced with supabase/functions/send-emails/slip_pdf.js (the same
     file the kitchen email uses). The order's photos are fetched, turned into JPG (max 1600 px) and passed in.
  2. Print on this device: same grouping. Cake block (cake, size, finish, design, inscription, candles and occasion)
     with the first photo beside it and up to 3 more as small pictures under it; then Must be, Allergy; then guest,
     contact, payment, notes, taken by. Logo centred. No "Short notice" tag.
"""
import base64, hashlib, json, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / sys.argv[1]
s = BASE.read_text()


def swap(text, old, new, n=1):
    assert text.count(old) == n, ('anchor', text.count(old), old[:90])
    return text.replace(old, new)


# 1a. Slip layout: the shared file, exports removed, inside the same module slot
lay = (ROOT / 'supabase/functions/send-emails/slip_pdf.js').read_text()
assert 'renderSlipPhoto' in lay and 'SHORT NOTICE' not in lay, 'slip_pdf.js is not the photo layout'
lay = lay.replace('export const ', 'const ').replace('export async function ', 'async function ').replace('export function ', 'function ')
a = s.index('me=function(){const e=72/25.4;')
b = s.index('},slipFileName:s}}()', a) + len('},slipFileName:s}}()')
s = s[:a] + 'me=function(){' + lay + '\nreturn{buildSlipPdf:buildSlipPdf,slipFileName:slipFileName}}()' + s[b:]

# 1b. Download: fetch the photos and pass them in
PHOTOS = ('function ccsSlipJpeg(b){if(!b||!window.createImageBitmap)return null;return createImageBitmap(b).then(function(im){var k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement("canvas");'
          'c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);'
          'return new Promise(function(ok){c.toBlob(function(j){ok(j)},"image/jpeg",.85)})}).then(function(j){return j?j.arrayBuffer():null}).then(function(x){return x?{bytes:new Uint8Array(x)}:null},function(){return null})}'
          'function ccsSlipPhotos(p){p=(p||[]).slice(0,6);if(!p.length)return Promise.resolve([]);return a.storage.from("cake-references").createSignedUrls(p,900).then(function(u){'
          'return Promise.all(((u&&u.data)||[]).map(function(x){return x&&x.signedUrl?fetch(x.signedUrl).then(function(r){return r.ok?r.blob():null}).then(ccsSlipJpeg).catch(function(){return null}):null}))'
          '}).then(function(l){return l.filter(Boolean)},function(){return[]})}')
s = swap(s, 'function Wn(){var e=y.briefDone;', PHOTOS + 'function Wn(){var e=y.briefDone;')
s = swap(s, 'document.head.appendChild(a)}))),a]).then((function(a){return me.buildSlipPdf(a[0],{',
         'document.head.appendChild(a)}))),a,ccsSlipPhotos(t.snapshot&&t.snapshot.photos)]).then((function(a){return me.buildSlipPdf(a[0],{photos:a[2],')

# 2. Print on this device: slips without a photo stay as they were (no Short notice tag); with a photo, the new layout
HTML = ('function ccsSlipPhotoHtml(t,a,n,v){var s=v.s,r=v.r,dl=v.o,T=v.at,'
  'cake=(s.variant||s.cake||"")+(s.variant&&s.cake&&s.variant!==s.cake&&s.cake.indexOf(s.variant)<0?" ("+s.cake+")":"");if(!s.size&&"Custom cake"===s.cake)cake=s.variant?s.variant+" (custom)":"Custom cake";'
  'var size=s.size?s.size+" inch"+(s.quantity>1?" × "+s.quantity+" cakes":""):(s.serves||"")+(s.quantity>1?" × "+s.quantity+" cakes":""),serves=s.size&&s.serves?s.serves:"",'
  'reqs=(s.requirements||[]).length?Kt(s).join(" · "):"",diet=s.has_dietary?v.h:"None given",'
  'notes=[s.order_notes?"Order: "+s.order_notes:"",s.kitchen_notes?"Kitchen: "+s.kitchen_notes:""].filter(Boolean).join(" · "),'
  'when=T?T.toLocaleDateString("en-GB",{timeZone:"Pacific/Fiji",day:"numeric",month:"short"})+", "+Pt(T.toLocaleTimeString("en-GB",{timeZone:"Pacific/Fiji",hour:"numeric",minute:"2-digit",hour12:!0})):"",'
  'taken=("online"===r.source&&!r.taken_by?"Website order":"")+(r.taken_by||"")+(r.source&&("online"!==r.source||r.taken_by)?" ("+(v.N[r.source]||r.source)+")":"")+(when?" · "+when:""),'
  'row=function(k,x){return x?\'<div class="slp-l"><span>\'+k+"</span><b>"+Tt(x)+"</b></div>":""},'
  'cell=function(k,x,cls,sub,big){return\'<div class="slp-c\'+(cls?" "+cls:"")+\'"><span>\'+k+"</span>"+(big?"<b>"+Tt(x)+"</b>":"<p>"+Tt(x)+"</p>")+(sub?"<small>"+Tt(sub)+"</small>":"")+"</div>"};'
  'return\'<div class="ccs-slip ccs-slip-\'+n+\' slp"><div class="slp-top"><div class="slp-logo">\'+P+\'</div><div class="slp-no"><span>Order</span><b>\'+Tt(s.reference)+"</b><i>v"+t.version+"</i></div></div>"'
  '+\'<div class="slp-meta"><span>Kitchen slip v\'+t.version+" · Printed "+Tt(Rt((new Date).toISOString()))+"</span><b>"+(1===a.length?"1 design photo":a.length+" design photos")+"</b></div>"'
  '+(t.version>1&&v.p.length?\'<div class="sl-changed">Changed since v\'+(t.version-1)+": "+Tt(v.p.join(", "))+". Throw away the old slip.</div>":"")+v.q'
  '+\'<div class="slp-grid">\'+cell("Cake",cake||"Not given","slp-cake","custom"===s.finish?"Custom design":"Standard finish",1)'
  '+\'<figure class="slp-ph"><img src="\'+Tt(a[0])+\'" alt="Design photo"><figcaption>\'+(a.length>1?"Photo 1 of "+a.length:"Design photo")+"</figcaption></figure>"'
  '+cell("Size",size||"Not given","slp-size",serves,1)+"</div>"'
  '+("custom"===s.finish&&s.design?cell("Design",s.design):"")+cell("Inscription",s.message?"“"+s.message+"”":"None","slp-msg","",1)'
  '+\'<div class="slp-two">\'+cell("Candles",s.candles||"None")+cell("Occasion",s.occasion||"Not given")+"</div>"'
  '+(reqs?cell("Must be",reqs,"slp-must","",1):"")+cell("Allergy",diet,s.has_dietary?"slp-diet":"","",1)'
  '+\'<div class="slp-lines">\'+row("Guest",[r.name||s.customer,r.phone].filter(Boolean).join(" · "))'
  '+(dl?row("Deliver to",[s.area,r.address].filter(Boolean).join(", ")+(r.receiver?" (for "+r.receiver+")":"")):"")+row("Payment",v.pay)+row("Notes",notes)+row("Taken by",taken)+"</div>"'
  '+(a.length>1?\'<div class="slp-more">\'+a.slice(1,4).map(function(u){return\'<img src="\'+Tt(u)+\'" alt="Design photo">\'}).join("")+"</div>":"")'
  '+\'<div class="sl-foot"><b>Phone: + 679 8922760 | Email: cornercafe@jacksfiji.com</b><small>All prices include 12.5% VAT. 2% surcharge applies to all credit card payments.</small></div><style>\'+CCS_SLP+"</style></div>"}')
CSS = ('.slp .slp-top{display:flex;align-items:center;justify-content:space-between;gap:8pt;background:#000;color:#fff;padding:3mm 4mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  '.slp .slp-logo svg{display:block;width:30mm;height:auto;color:#fff}'
  '.slp .slp-no{display:flex;align-items:center;gap:5pt;white-space:nowrap}.slp .slp-no span{font-size:7pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase}'
  '.slp .slp-no b{font-size:21pt;font-weight:800;line-height:1}.slp .slp-no i{font-style:normal;font-size:12pt;font-weight:700;border:1.5pt solid #fff;padding:0 3pt}'
  '.slp .slp-meta{display:flex;justify-content:space-between;gap:6pt;font-size:8pt;margin:3pt 0 4pt}'
  '.slp .slp-c{border:1pt solid #000;padding:4pt 6pt 5pt;min-width:0;margin-top:-1pt}.slp .slp-c>span{display:block;font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#333}'
  '.slp .slp-c>b{display:block;font-size:15pt;font-weight:700;line-height:1.2;overflow-wrap:anywhere}.slp .slp-c>p{margin:1pt 0 0;font-size:12pt;line-height:1.3;overflow-wrap:anywhere}'
  '.slp .slp-c>small{display:block;font-size:11.5pt;margin-top:1pt}.slp .slp-cake>b{font-size:17pt}.slp .slp-msg>b{font-size:16pt}'
  '.slp .slp-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"c p" "s p";margin-top:4pt}.slp .slp-cake{grid-area:c}.slp .slp-size{grid-area:s}'
  '.slp .slp-ph{grid-area:p;margin:0 0 0 -1pt;border:1pt solid #000;margin-top:-1pt;padding:3pt;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2pt;min-height:52mm}'
  '.slp .slp-ph img{display:block;width:100%;max-height:70mm;object-fit:contain}.slp .slp-ph figcaption{font-size:7.5pt;font-weight:700;color:#333}'
  '.slp .slp-two{display:grid;grid-template-columns:1fr 1fr}.slp .slp-two>.slp-c+.slp-c{margin-left:-1pt}'
  '.slp .slp-must{background:#000;color:#fff}.slp .slp-must>span{color:#fff}.slp .slp-diet{border-width:2.5pt}'
  '.slp .slp-lines{display:grid;gap:4pt;margin-top:7pt}.slp .slp-l{display:flex;gap:6pt;align-items:baseline}.slp .slp-l span{flex:0 0 17mm;font-size:10pt;font-weight:700}'
  '.slp .slp-l b{flex:1;font-size:11.5pt;font-weight:500;border-bottom:.75pt solid #999;padding-bottom:1pt;overflow-wrap:anywhere}'
  '.slp .slp-more{display:flex;gap:3pt;margin-top:5pt}.slp .slp-more img{flex:1;min-width:0;height:22mm;object-fit:cover;border:.75pt solid #000}')
HTML = HTML.replace('CCS_SLP', json.dumps(CSS))
s = swap(s, 'function Wn(){var e=y.briefDone;', HTML + 'function Wn(){var e=y.briefDone;')
s = swap(s, "return'<div class=\"ccs-slip ccs-slip-'+n+'\"><div class=\"sl-ordno\">",
         "if(a.length)return ccsSlipPhotoHtml(t,a,n,{s:s,r:r,o:o,p:p,h:h,pay:_,q:q,at:T,N:N});return'<div class=\"ccs-slip ccs-slip-'+n+'\"><div class=\"sl-ordno\">")
s = swap(s, '(s.rush?"<em>Short notice</em>":"")', '""')
assert '</script' not in s.lower()

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode()
print(json.dumps({'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(raw), 'base': BASE.name}))
