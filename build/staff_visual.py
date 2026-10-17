"""Build visual refinements from the verified live journey release, excluding unfinished templates."""
import base64,hashlib,json,os,subprocess,tempfile,difflib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as td:
 source=Path(td)/'staff.js';out=Path(td)/'staff.min.js'
 source.write_bytes(subprocess.check_output(['git','show','60aae967852e5797ffe5a258f126157056902801:dist/staff.full.js'],cwd=root))
 for name in ['staff_cleanup.patch','staff_journey.patch']:subprocess.run(['patch','--fuzz=0','--silent',str(source),str(root/'build'/name)],check=True)
 def minify():
  subprocess.run([os.environ.get('TERSER_BIN','terser'),str(source),'-c','-m','-o',str(out)],check=True)
  return out.read_bytes().strip()
 live=(root/'dist/app/staff-app.58869aff6c.js').read_bytes();wrapper,rest=live.split(b'\n',1);basejs=rest.split(b'\n',1)[0]
 assert minify()==basejs,'Journey baseline mismatch'
 tail=rest[len(basejs)+1:];s=source.read_text();old=s
 def change(a,b,count=1):
  global s
  assert s.count(a)==count,(a,s.count(a));s=s.replace(a,b)
 change("return c ? '<span class=\"ccs-pay ' + c + '\">' + esc(PAY[ps]) + '</span>' : '';", "return c ? '<span class=\"ccs-pay ' + c + '\"><span class=\"vr-pay-icon\">' + visualIcon('money') + (ps === 'paid' ? '<span class=\"vr-paid-tick\">' + visualIcon('check') + '</span>' : '') + '</span><span>' + esc(PAY[ps]) + '</span></span>' : '';")
 change("var ORDER_LIST = 'id,reference,", "var ORDER_LIST = 'id,customer_id,reference,")
 change("loadDraft(); var back = scrLoad();", "favouriteLoad(); loadDraft(); var back = scrLoad();")
 change("function loadCustomers() {", "function loadCustomers() {\n    favouriteLoad(true);")
 change("function openCustomer(id, keepEdit) {", "function openCustomer(id, keepEdit) {\n    favouriteLoad();")
 change("h += '<p class=\"ccs-hint\">Customer ' + esc(custNo(c.customer_no))", "h += favouriteControl(c);\n    h += '<p class=\"ccs-hint\">Customer ' + esc(custNo(c.customer_no))")
 change("esc(r.full_name) + '</b>' + (r.seg_upcoming_occasion", "esc(r.full_name) + '</b>' + favouriteBadge(r.id) + (r.seg_upcoming_occasion")
 change("esc(c ? c.full_name : 'Customer details hidden') + ' · ' + esc(o.reference)", "'<span class=\"vr-customer\">' + esc(c ? c.full_name : 'Customer details hidden') + favouriteBadge(o.customer_id) + '</span><span class=\"vr-order-meta\">' + esc(o.reference)")
 change("esc(SOURCE_LABEL[o.source]) + (receivedAgo(o) ? ' · ' + esc(receivedAgo(o)) : '') + '</span><span class=\"ccs-tags\">'", "esc(SOURCE_LABEL[o.source]) + (receivedAgo(o) ? ' · ' + esc(receivedAgo(o)) : '') + '</span></span><span class=\"ccs-tags\">'")
 change("esc(c ? c.full_name : '') + ' · ' + esc(o.reference)", "esc(c ? c.full_name : '') + favouriteBadge(o.customer_id) + ' · ' + esc(o.reference)")
 change("'<b>' + esc(cakeLine(i)) + '</b><span>'", "'<b class=\"vr-cake-title\">' + visualIcon('cake') + esc(cakeLine(i)) + '</b><span>'")
 change("' + attrs + '><b>' + num", "' + attrs + '><span class=\"vr-stat-icon\">' + visualIcon(label === 'Payments to collect' ? 'money' : label === 'Due today' ? 'clock' : 'calendar') + '</span><b>' + num")
 change("esc(x.name || 'Customer') + '</button>'", "esc(x.name || 'Customer') + favouriteBadge(x.id) + '</button>'")
 change("esc(e.name || 'Customer') + '</b><span>'", "esc(e.name || 'Customer') + favouriteBadge(e.customer_id) + '</b><span>'")
 change("if (st === 'confirmed' && o.payment_status !== 'paid' && canP('ord.payments')) return ['Unpaid', 'is-amber'];\n    return null;", "if (st === 'confirmed' && o.payment_status !== 'paid' && canP('ord.payments')) return ['Unpaid', 'is-amber'];\n    if ((st === 'confirmed' || st === 'completed') && o.payment_status === 'paid' && canP('ord.payments')) return ['Paid', 'is-paid'];\n    return null;")
 change("f[1] === 'is-red' ? ' pf-red' : ' pf-amber'", "f[1] === 'is-red' ? ' pf-red' : f[1] === 'is-paid' ? ' pf-paid' : ' pf-amber'")
 change("esc(c && c.full_name ? c.full_name : 'Customer') + '</b><span>'", "esc(c && c.full_name ? c.full_name : 'Customer') + favouriteBadge(o.customer_id) + '</b><span>'")
 change("var a = b.dataset.act, v = b.dataset.v;", "var a = b.dataset.act, v = b.dataset.v;\n    if (a === 'vf-toggle') { favouriteToggle(b.dataset.id); return; }\n    if (a === 'vf-retry') { favouriteLoad(true); return; }")
 s=s.replace('class="ccs-pill s-alert">Allerg', 'class="ccs-pill s-alert vr-allergy">Allerg').replace('class="ccs-pill s-alert">Dietary or allergy', 'class="ccs-pill s-alert vr-allergy">Dietary or allergy')
 change("  // ---------- events ----------",(root/'src/staff.visual.js').read_text()+"\n  // ---------- events ----------")
 source.write_text(s)
 raw=wrapper+b'\n'+minify()+b'\n'+tail
 css=(root/'src/staff.visual.css').read_text();assert '</script' not in css.lower()
 raw+=("\n(function(){var s=document.createElement('style');s.id='ccs-visual';s.textContent="+json.dumps(css)+";document.head.appendChild(s)})();\n").encode()
name='staff-app.'+hashlib.sha256(raw).hexdigest()[:10]+'.js';(root/'dist/app'/name).write_bytes(raw)
m={'file':'dist/app/'+name,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':'dist/app/staff-app.58869aff6c.js'}
(root/'dist/app/staff-visual-manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(json.dumps(m))
