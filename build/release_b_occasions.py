"""Release B (Settings audit, 28 Oct 2026): both order forms take their occasion choices from Settings.

The server's get_order_setup now also returns `occasions` (Settings > Occasions with "Show in the occasion list on
the order forms" ticked, not archived or merged, in their Settings order, without "Not specified").
Patches, each asserted, on the live bundles:
  staff  dist/app/staff-app.e0a7470c8a.js (commit d2052bd8): the New order occasion list is replaced in place by the
         Settings list when the setup arrives. If the server sends none, the built-in list stays.
  guest  dist/app/guest-app.cae549ce29.js (commit 72fcd30e): the website form's list likewise, keeping
         "Prefer not to say" last.
Nothing else in either bundle changes. Prints each new file name and its SRI.
"""
import base64, hashlib, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git_show(commit, path):
    return subprocess.run(['git', '-C', str(ROOT), 'show', f'{commit}:{path}'], check=True, capture_output=True).stdout.decode()


def sri(text):
    return 'sha384-' + base64.b64encode(hashlib.sha384(text.encode()).digest()).decode()


def rep(s, old, new):
    assert s.count(old) == 1, ('anchor not unique', old[:70], s.count(old))
    return s.replace(old, new)


def write(prefix, s):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as tmp:
        tmp.write(s)
    subprocess.run(['node', '--check', tmp.name], check=True)
    name = prefix + '.' + hashlib.sha256(s.encode()).hexdigest()[:10] + '.js'
    (ROOT / 'dist/app' / name).write_text(s)
    print(name, sri(s), len(s.encode()))


# ---------- staff ----------
s = git_show('d2052bd860201d2e4d780fa03b3d1c153d00293e', 'dist/app/staff-app.e0a7470c8a.js')
assert sri(s) == 'sha384-wjagVo4uuw+jRbsTRHxshj/BHhCq2cL/dLhiiwyneBLp+SuE4nYDVZ+rBTrFlY+g', 'staff base is not the live file'
s = rep(s, 'l=(i.slice(0,3),["Birthday",', 'l=(i.slice(0,3),window.__ccsOcc=["Birthday",')
s = rep(s, 'y.setup=t.data,uu()',
        'y.setup=t.data,function(o){try{var x=(o||[]).map(function(r){return r&&r.label}).filter(Boolean);'
        'if(x.length&&window.__ccsOcc){window.__ccsOcc.length=0;Array.prototype.push.apply(window.__ccsOcc,x)}}catch(e){}}'
        '(t.data&&t.data.occasions),uu()')
write('staff-app', s)

# ---------- guest ----------
g = git_show('72fcd30e8cab5297f6ba29c0258301fadf9d6d1a', 'dist/app/guest-app.cae549ce29.js')
assert sri(g) == 'sha384-vB0ZTqQ73+t4bvmncQkYXNZsYJuiL2uJvycd5/lcuVsJIKcjLaWrygO9WVJ5rFyW', 'guest base is not the live file'
g = rep(g, 'n=[["birthday","Birthday"],', 'n=window.__ccoOcc=[["birthday","Birthday"],')
g = rep(g, 'if((d=e.data).location.accepts_online&&',
        'if(function(o){try{var x=(o||[]).filter(function(r){return r&&r.code&&r.label&&r.code!=="not_specified"})'
        '.map(function(r){return[r.code,r.label]});if(x.length&&window.__ccoOcc){window.__ccoOcc.length=0;'
        'Array.prototype.push.apply(window.__ccoOcc,x.concat([["not_specified","Prefer not to say"]]))}}catch(e){}}'
        '(e.data.occasions),(d=e.data).location.accepts_online&&')
write('guest-app', g)
