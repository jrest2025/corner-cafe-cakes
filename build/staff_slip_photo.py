"""Kitchen slip, 27 Oct 2026 (Option A): design photo on the slip, logo centred, cake details in one block.

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
assert 'photoLayout = "beside"' in lay, 'slip_pdf.js is not the photo layout'
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

# 2. Print on this device
CK = ('O=q+\'<div class="sl-ck\'+(a.length?" has-ph":"")+\'"><div class="sl-ckc">\'+x("Cake",(b||"Not given").replace(" · Custom design",""),"sl-k-cake")+x("Size",g||"Not given")'
      '+x("Finish","custom"===s.finish?"Custom design":"Standard finish")'
      '+("custom"===s.finish&&s.design?\'<div class="sl-k sl-k-txt"><span>Design</span><p>\'+Tt(s.design)+"</p></div>":"")'
      '+x("Inscription",s.message?"“"+s.message+"”":"None",s.message?"sl-k-msg":"sl-k-none")'
      '+\'<div class="sl-k sl-k-txt"><span>Candles and occasion</span><p>\'+Tt([s.candles?"Candles: "+s.candles:"No candles",s.occasion?"Occasion: "+s.occasion:""].filter(Boolean).join("   ·   "))+"</p></div></div>"'
      '+(a.length?\'<figure class="sl-ph1"><img src="\'+Tt(a[0])+\'" alt="Design photo"><figcaption>\'+(a.length>1?"Design photo 1 of "+a.length:"Design photo")+"</figcaption>"'
      '+(a.length>1?\'<div class="sl-phx">\'+a.slice(1,4).map(function(u){return\'<img src="\'+Tt(u)+\'" alt="Design photo">\'}).join("")+"</div>":"")+"</figure>":"")+"</div>"'
      '+((s.requirements||[]).length?\'<div class="sl-key sl-key1">\'+x("Must be",Kt(s).join(" · "),"sl-must")+"</div>":"")'
      '+\'<div class="sl-key sl-key1">\'+x("Allergy",s.has_dietary?h:"None given",s.has_dietary?"sl-diet":"sl-k-none")+"</div>"')
i = s.index('O=q+\'<div class="sl-key">\'')
j = s.index('"sl-k-none")+"</div>"', i) + len('"sl-k-none")+"</div>"')
s = s[:i] + CK + s[j:]
s = swap(s, 'm("Payment",_)+m("Occasion",s.occasion)+m("Candles",s.candles)+m("Inscription",s.message?"“"+s.message+"”":"","sl-big")+m("Remarks",y+(s.has_dietary?"":(y?" · ":"")+"No dietary needs or allergies given."),"sl-wrap")',
         'm("Payment",_)+(function(n){return n?m("Notes",n,"sl-wrap"):""})([s.order_notes?"Order: "+s.order_notes:"",s.kitchen_notes?"Kitchen: "+s.kitchen_notes:""].filter(Boolean).join(" · "))')
s = swap(s, '(a.length?\'<div class="sl-photos">\'+a.map((function(e){return\'<img src="\'+Tt(e)+\'" alt="Reference photo">\'})).join("")+"</div>":"")', '""')
s = swap(s, '(s.rush?"<em>Short notice</em>":"")', '(a.length?"<em>"+(1===a.length?"1 design photo":a.length+" design photos")+"</em>":"")')
CSS = ('.ccs-slip .sl-head{justify-content:center!important}'
       '.ccs-slip .sl-ck{display:grid;grid-template-columns:minmax(0,1fr);border:2pt solid #000;margin:2pt 0 0}'
       '.ccs-slip .sl-ck.has-ph{grid-template-columns:56% 44%}'
       '.ccs-slip .sl-ckc{display:flex;flex-direction:column;min-width:0}'
       '.ccs-slip .sl-ckc>.sl-k+.sl-k{border-top:.75pt solid #000}'
       '.ccs-slip .sl-k-txt p{margin:0;font-size:10.5pt;font-weight:500;line-height:1.3;overflow-wrap:anywhere}'
       '.ccs-slip .sl-k-msg b{font-size:15pt}'
       '.ccs-slip .sl-ph1{margin:0;border-left:.75pt solid #000;padding:4pt;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3pt;min-width:0}'
       '.ccs-slip .sl-ph1>img{display:block;width:100%;max-height:72mm;object-fit:contain}'
       '.ccs-slip .sl-ph1 figcaption{font-size:7pt;font-weight:700;color:#444}'
       '.ccs-slip .sl-phx{display:flex;gap:3pt;width:100%}.ccs-slip .sl-phx img{flex:1;min-width:0;height:16mm;object-fit:cover;border:.5pt solid #000}'
       '.ccs-slip .sl-key.sl-key1{grid-template-columns:minmax(0,1fr)!important;border-top:0!important;margin:0!important}'
       '.ccs-slip .sl-key1:last-of-type{margin-bottom:6pt!important}')
s = swap(s, '\'<div class="sl-foot"><b>Phone', '\'<style>' + CSS + '</style><div class="sl-foot"><b>Phone')
assert '</script' not in s.lower()

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
    tmp.write(s)
subprocess.run(['node', '--check', tmp.name], check=True)
raw = s.encode()
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode()
print(json.dumps({'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(raw), 'base': BASE.name}))
