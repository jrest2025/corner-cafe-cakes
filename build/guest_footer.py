"""Write the cake order page footer pinned to a commit (same hosting as the staff app). Usage: python3 build/guest_footer.py <commit>"""
import json, sys, re
commit = sys.argv[1]; assert re.fullmatch(r'[0-9a-f]{40}', commit), 'give the full 40-character commit'
name, sri = open('/home/claude/corner-cafe-cakes/build/guest_app.txt').read().split()
SB = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n'
path = 'gh/jrest2025/corner-cafe-cakes@' + commit + '/' + name
loader = ("<script>(function(){var f=" + json.dumps(path) + ",h=['https://cdn.jsdelivr.net/','https://fastly.jsdelivr.net/'],k=" + json.dumps(sri) +
  ",i=0;function go(){if(i>=h.length){var m=document.getElementById('cc-cake-order');if(m)m.innerHTML='<p style=\"padding:30px;font-family:Arial,sans-serif\">The cake order form did not load. Please refresh the page or call us on +679 892 2760.</p>';console.error('cake order form did not load');return}"
  "var s=document.createElement('script');s.src=h[i++]+f;s.integrity=k;s.crossOrigin='anonymous';s.onerror=go;document.body.appendChild(s)}go()})();</script>")
open('/home/claude/corner-cafe-cakes/dist/guest.footer.hosted.html', 'w').write(SB + loader)
print(SB + loader)
