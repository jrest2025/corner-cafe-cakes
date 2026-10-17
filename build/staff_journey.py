"""Apply reviewed journey fixes to the exact released code, preserving all released CSS."""
import base64,hashlib,json,os,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as td:
    source=Path(td)/'staff.js'; out=Path(td)/'staff.min.js'
    source.write_bytes(subprocess.check_output(['git','show','60aae967852e5797ffe5a258f126157056902801:dist/staff.full.js'],cwd=root))
    subprocess.run(['patch','--fuzz=0','--silent',str(source),str(root/'build/staff_cleanup.patch')],check=True)
    def minify():
        subprocess.run([os.environ.get('TERSER_BIN','terser'),str(source),'-c','-m','-o',str(out)],check=True)
        return out.read_bytes().strip()
    cleanup=(root/'dist/app/staff-app.36b7d764f4.js').read_bytes()
    wrapper,js=cleanup.split(b'\n',1)
    assert minify()==js.strip(),'Released cleanup code does not match'
    live=(root/'dist/app/staff-app.ccb1f88c64.js').read_bytes()
    assert live.startswith(cleanup),'Released CSS chain changed'
    tail=live[len(cleanup):]
    subprocess.run(['patch','--fuzz=0','--silent',str(source),str(root/'build/staff_journey.patch')],check=True)
    raw=wrapper+b'\n'+minify()+b'\n'+tail
name='staff-app.'+hashlib.sha256(raw).hexdigest()[:10]+'.js'
(root/'dist/app'/name).write_bytes(raw)
m={'file':'dist/app/'+name,'sri':'sha384-'+base64.b64encode(hashlib.sha384(raw).digest()).decode(),'bytes':len(raw),'base':'dist/app/staff-app.ccb1f88c64.js'}
(root/'dist/app/staff-journey-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print(json.dumps(m))
