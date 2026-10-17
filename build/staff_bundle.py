"""Reproduce this cleanup from the exact live release, excluding unfinished features.

Requires terser@5.31.0 on PATH (or TERSER_BIN). Does not change guest assets,
Webflow code or deployed settings. Older bundles remain available for rollback.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = '60aae967852e5797ffe5a258f126157056902801'
BASE_BUNDLE = 'dist/app/staff-app.57886bb6e3.js'

def git_file(name):
    return subprocess.check_output(['git', 'show', BASE + ':' + name], cwd=ROOT, text=True)

with tempfile.TemporaryDirectory() as tmp:
    source, output = Path(tmp) / 'staff.js', Path(tmp) / 'staff.min.js'
    source.write_text(git_file('dist/staff.full.js'))
    def minify():
        subprocess.run([os.environ.get('TERSER_BIN', 'terser'), str(source), '-c', '-m', '-o', str(output)], check=True)
        return output.read_text().strip()
    wrapper, baseline_js = git_file(BASE_BUNDLE).split('\n', 1)
    assert minify() == baseline_js.strip(), 'Baseline build does not match the live release'
    subprocess.run(['patch', '--fuzz=0', '--silent', str(source), str(ROOT / 'build/staff_cleanup.patch')], check=True)
    js = minify()
    assert '</script' not in js.lower() and '<!--' not in js
    raw = (wrapper + '\n' + js + '\n').encode()

name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
folder = ROOT / 'dist/app'
folder.mkdir(exist_ok=True)
(folder / name).write_bytes(raw)
manifest = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'baseline': BASE}
(folder / 'staff-cleanup-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
