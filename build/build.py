import subprocess, json, re, os
os.chdir('/home/claude/cakes')
def run(c): subprocess.run(c, shell=True, check=True)
run('npx -y terser@5.31.0 guest.js -c -m -o dist/guest.min.js')
# The kitchen slip PDF layout is shared with the email sender: one source file, so a downloaded slip matches the emailed one
slip = open('/home/claude/corner-cafe-cakes/supabase/functions/send-emails/slip_pdf.js').read().replace('export const ', 'const ').replace('export async function ', 'async function ').replace('export function ', 'function ')
assert 'export ' not in slip and 'import ' not in slip
slipjs = 'var SlipPdf = (function () {\n' + slip + '\nreturn { buildSlipPdf: buildSlipPdf, slipFileName: slipFileName };\n})();\n'
open('dist/staff.full.js','w').write(open('staff.js').read().replace('/*@DASH@*/', slipjs + open('staff.dash.js').read() + open('staff.reg.js').read() + open('staff.crm.js').read()))
run('npx -y terser@5.31.0 dist/staff.full.js -c -m -o dist/staff.min.js')
run('npx -y csso-cli@4.0.2 guest.css -o dist/guest.min.css')
run('npx -y csso-cli@4.0.2 staff.css -o dist/staff.min.css')
def fnv(t):
    h=0x811c9dc5
    for ch in t.encode('utf-16-le').decode('utf-16-le'):
        # JS charCodeAt is UTF-16 code units
        pass
    h=0x811c9dc5
    b=t.encode('utf-16-le')
    for i in range(0,len(b),2):
        h^= b[i] | (b[i+1]<<8); h=(h*0x01000193) & 0xffffffff
    return h
def jslen(t): return len(t.encode('utf-16-le'))//2
def loader(ids, total, h, mount, msg):
    return ('<script>(function(){var ids='+json.dumps(ids)+",t='',i,e;for(i=0;i<ids.length;i++){e=document.getElementById(ids[i]);if(!e)break;t+=e.textContent;}var h=0x811c9dc5;for(i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}if(t.length!=="+str(total)+"||h!=="+str(h)+"){var m=document.getElementById('"+mount+"');if(m)m.innerHTML='<p style=\"padding:30px;font-family:Arial,sans-serif\">"+msg+"</p>';console.error('code check failed',t.length,h);return;}var s=document.createElement('script');s.text=t;document.body.appendChild(s);})();</script>")
SB='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n'
FONT='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap">\n'
g=open('dist/guest.min.js').read().strip(); s=open('dist/staff.min.js').read().strip()
for code in (g,s): assert '</script' not in code.lower() and '<!--' not in code
open('dist/guest.head.html','w').write(FONT+'<style>'+open('dist/guest.min.css').read().strip()+'</style>')
open('dist/guest.footer.html','w').write(SB+'<script type="text/plain" id="cco-code">'+g+'</script>\n'+loader(['cco-code'],jslen(g),fnv(g),'cc-cake-order','The cake order form did not load. Please refresh the page or call us on +679 892 2760.'))
# Staff app: one hosted file (CSS plus code), loaded from GitHub through jsDelivr, pinned to a commit and checked by fingerprint (SRI).
import hashlib, base64, glob
css = open('dist/staff.min.css').read().strip()
run('npx -y csso-cli@4.0.2 staff.cal.css -o dist/staff.cal.min.css')
calcss = open('dist/staff.cal.min.css').read().strip()
# Jack's Restaurants Hospitality UI (17 Oct 2026): loaded last, over every earlier rule
run('npx -y csso-cli@4.0.2 staff.hospitality.css -o dist/staff.hospitality.min.css')
calcss += open('dist/staff.hospitality.min.css').read().strip()
app = "(function(){var s=document.createElement('style');s.id='ccs-style';s.textContent=" + json.dumps(re.sub(r'font-size:(\d+(?:\.\d+)?)px', r'font-size:calc(\1*var(--u,1px))', css + calcss)) + ";document.head.appendChild(s)})();\n" + s + "\n"
raw = app.encode('utf-8')
name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
os.makedirs('dist/app', exist_ok=True)
for old in glob.glob('dist/app/staff-app.*.js'):
    if not old.endswith(name): os.remove(old)
open('dist/app/' + name, 'wb').write(raw)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode()
json.dump({'file': 'dist/app/' + name, 'sri': sri, 'bytes': len(raw)}, open('dist/app/manifest.json', 'w'), indent=1)
open('dist/staff.head.html', 'w').write('<meta name="robots" content="noindex, nofollow">\n' + FONT.strip())
open('dist/staff.embed.html', 'w').write('<div id="cc-staff"><p style="padding:30px;font-family:Arial,sans-serif;color:#526176">Loading the staff app…</p></div>')
for f in glob.glob('dist/staff.embed[2-9].html'): os.remove(f)
for f in ['guest.head.html','guest.footer.html','staff.head.html','staff.embed.html']:
    print(f, len(open('dist/'+f).read()))
print('app', name, len(raw), sri)
print('Next: commit and push, then run build/footer.py to write dist/staff.footer.html pinned to that commit.')
