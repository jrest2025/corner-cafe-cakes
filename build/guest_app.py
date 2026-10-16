"""Write the hosted order form file (styles plus code) and its fingerprint. Run after build.py. Usage: python3 build/guest_app.py"""
import hashlib, base64, json, os
C = '/home/claude/cakes/dist/'; R = '/home/claude/corner-cafe-cakes/'
css = open(C + 'guest.min.css').read().strip(); js = open(C + 'guest.min.js').read().strip()
app = ("(function(){if(document.getElementById('cco-style'))return;var s=document.createElement('style');s.id='cco-style';s.textContent=" + json.dumps(css) + ";document.head.appendChild(s)})();\n" + js + "\n").encode()
old = open(R + 'build/guest_app.txt').read().split()[0]
name = 'dist/app/guest-app.' + hashlib.sha256(app).hexdigest()[:10] + '.js'
if old != name and os.path.exists(R + old) and 'f424ce194a' not in old and '989f1c16e4' not in old: pass
open(R + name, 'wb').write(app)
sri = 'sha384-' + base64.b64encode(hashlib.sha384(app).digest()).decode()
open(R + 'build/guest_app.txt', 'w').write(name + ' ' + sri + '\n'); print(name, sri)
