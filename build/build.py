import subprocess, json, re, os
os.chdir('/home/claude/cakes')
def run(c): subprocess.run(c, shell=True, check=True)
run('npx -y terser@5.31.0 guest.js -c -m -o dist/guest.min.js')
run('npx -y terser@5.31.0 staff.js -c -m -o dist/staff.min.js')
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
# split staff into three parts sized to fill each block up to 49,900 characters (limit 50,000)
LIM = 49900
css = open('dist/staff.min.css').read().strip()
run('npx -y csso-cli@4.0.2 staff.cal.css -o dist/staff.cal.min.css')
calcss = open('dist/staff.cal.min.css').read().strip()
assert '</style' not in calcss.lower()
IDS = ['ccs-code-a','ccs-code-b','ccs-code-d','ccs-code-e','ccs-code-c']
head_fixed = len('<meta name="robots" content="noindex, nofollow">\n' + FONT + '<style>' + css + '</style>\n<script type="text/plain" id="ccs-code-c"></script>')
foot_fixed = len(SB + '<script type="text/plain" id="ccs-code-a"></script>\n' + loader(IDS, 999999, 4294967295, 'cc-staff', 'The staff app did not load properly. Please refresh the page.'))
emb_fixed = len('<div id="cc-staff"></div>\n<script type="text/plain" id="ccs-code-b"></script>')
emb2_fixed = len('<script type="text/plain" id="ccs-code-d"></script>')
emb3_fixed = len('<style>' + calcss + '</style>\n<script type="text/plain" id="ccs-code-e"></script>')
c1 = LIM - foot_fixed; cb = LIM - emb_fixed; c3 = LIM - head_fixed; cd = LIM - emb2_fixed
a = s[:c1]; b = s[c1:c1+cb]; rest = s[c1+cb:]
c = rest[-c3:] if len(rest) > c3 else rest
mid = rest[:len(rest)-len(c)]
d = mid[:cd]; e = mid[cd:]
assert len(e) + emb3_fixed <= LIM, ('embed 3 too big', len(e) + emb3_fixed)
assert a + b + d + e + c == s
open('dist/staff.head.html','w').write('<meta name="robots" content="noindex, nofollow">\n'+FONT+'<style>'+css+'</style>\n<script type="text/plain" id="ccs-code-c">'+c+'</script>')
open('dist/staff.footer.html','w').write(SB+'<script type="text/plain" id="ccs-code-a">'+a+'</script>\n'+loader(IDS,jslen(s),fnv(s),'cc-staff','The staff app did not load properly. Please refresh the page.'))
open('dist/staff.embed.html','w').write('<div id="cc-staff"></div>\n<script type="text/plain" id="ccs-code-b">'+b+'</script>')
open('dist/staff.embed2.html','w').write('<script type="text/plain" id="ccs-code-d">'+d+'</script>')
open('dist/staff.embed3.html','w').write('<style>'+calcss+'</style>\n<script type="text/plain" id="ccs-code-e">'+e+'</script>')
for f in ['guest.head.html','guest.footer.html','staff.head.html','staff.footer.html','staff.embed.html','staff.embed2.html','staff.embed3.html']:
    print(f, len(open('dist/'+f).read()))
