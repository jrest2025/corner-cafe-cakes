import json, subprocess, os, glob
os.chdir('/home/claude/cakes')
subprocess.run('npx -y csso-cli@4.0.2 staff.clarity.css -o dist/staff.clarity.min.css', shell=True, check=True)
css=open('dist/staff.clarity.min.css').read().strip()
parts=[];cur='';depth=0;buf=''
for ch in css:
    buf+=ch
    if ch=='{': depth+=1
    elif ch=='}':
        depth-=1
        if depth==0:
            if len(cur)+len(buf)>1650: parts.append(cur); cur=''
            cur+=buf; buf=''
if cur or buf: parts.append(cur+buf)
for f in glob.glob('dist/staff.clarity.[0-9].js'): os.remove(f)
for n,p in enumerate(parts,1):
    js="(function(){if(document.getElementById('ccs-clarity-%d'))return;var s=document.createElement('style');s.id='ccs-clarity-%d';s.textContent=%s;document.head.appendChild(s);})();"%(n,n,json.dumps(p))
    assert len(js)<2000 and '</script' not in js.lower()
    open('dist/staff.clarity.%d.js'%n,'w').write(js)
print(len(parts),'parts', [len(p) for p in parts])
