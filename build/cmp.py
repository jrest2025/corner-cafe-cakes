import json,sys
f=sys.argv[1]; names=sys.argv[2:]
srcs={n:open('/home/claude/cakes/dist/'+n).read() for n in names}
def strings(o):
    if isinstance(o,str): yield o
    elif isinstance(o,dict):
        for v in o.values(): yield from strings(v)
    elif isinstance(o,list):
        for v in o: yield from strings(v)
raw=open(f).read()
big=[]
try:
    arr=json.loads(raw)
    for a in arr:
        try: big+=[s for s in strings(json.loads(a['text'])) if len(s)>3000]
        except Exception: pass
except Exception:
    j=json.loads(raw[raw.find('{'):]); big+=[s for s in strings(j) if len(s)>3000]
for n,v in srcs.items():
    ok=any(s==v for s in big); print(n,len(v),'MATCH' if ok else 'DIFF')
    if not ok:
        for s in big:
            if abs(len(s)-len(v))<200:
                i=next((k for k,(a,b) in enumerate(zip(s,v)) if a!=b),None); print('  first diff',i,repr(s[i-30:i+30]) if i else '', repr(v[i-30:i+30]) if i else '')
