"""Write the staff page footer pinned to a commit. Usage: python3 build/footer.py <commit>"""
import json, sys, re
commit = sys.argv[1]; assert re.fullmatch(r'[0-9a-f]{40}', commit), 'give the full 40-character commit'
os = __import__('os'); os.chdir('/home/claude/cakes')
m = json.load(open('dist/app/manifest.json'))
SB = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n'
path = 'gh/jrest2025/corner-cafe-cakes@' + commit + '/' + m['file']
loader = ("<script>(function(){var f=" + json.dumps(path) + ",h=['https://cdn.jsdelivr.net/','https://fastly.jsdelivr.net/'],k=" + json.dumps(m['sri']) +
  ",i=0;function go(){if(i>=h.length){var m=document.getElementById('cc-staff');if(m)m.innerHTML='<p style=\"padding:30px;font-family:Arial,sans-serif\">The staff app did not load. Check the internet connection, then refresh the page.</p>';console.error('staff app did not load');return}"
  "var s=document.createElement('script');s.src=h[i++]+f;s.integrity=k;s.crossOrigin='anonymous';s.onerror=go;document.body.appendChild(s)}go()})();</script>")
open('dist/staff.footer.html', 'w').write(SB + loader)
print(open('dist/staff.footer.html').read())
