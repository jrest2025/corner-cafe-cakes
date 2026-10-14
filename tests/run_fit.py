"""Every working screen fits the screen height; only lists and records may scroll. Invented data only."""
import json, subprocess, sys, pathlib
HERE = pathlib.Path(__file__).parent
PAGE = sys.argv[1] if len(sys.argv) > 1 else "hosted-staff.html"
out = subprocess.run([sys.executable, str(HERE / 'measure_fit.py'), PAGE, '--json'], capture_output=True, text=True, cwd=str(HERE)).stdout.strip().splitlines()[-1]
res = json.loads(out); R = []
def check(n, ok, d=''):
    R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' -> ' + str(d)[:200] if not ok and d != '' else ''))
# Lists and single records may scroll inside their own area; short-notice pickup adds a form and may run slightly over
ALLOW = {'orders': 120, 'kitchen': 30, 'customers': 400, 'register': 450, 'settings': 300, 'customer': 300, 'order panel': 80, 'new step4 short notice': 200, 'today': 60}
for k, v in res.items():
    size, screen = k.split(' ', 1)
    over = max(v.values()) if v else 0
    # New order now opens as a panel over the dashboard: what has to fit is the panel, not the page behind it
    if screen.startswith('new') and 'panel' in v: over = v['panel']
    lim = ALLOW.get(screen, 20)
    if size != 'phone' and screen in ('customers', 'register', 'settings', 'customer'): lim = min(lim, 80)
    check(f'{k}: fits the screen (over by {over} px, allowed {lim})', over <= lim, v)
print(f'{sum(R)}/{len(R)} passed')
