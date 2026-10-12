import json, sys
J='/root/.claude/projects/-home-claude/cc1bfb48-b530-5a67-bb88-cfcc137ea1df.jsonl'
want = {'head': '/home/claude/cakes/dist/staff.head.html', 'footer': '/home/claude/cakes/dist/staff.footer.html', 'embed': '/home/claude/cakes/dist/staff.embed.html'}
last = {}
for line in open(J):
    try: d = json.loads(line)
    except: continue
    m = d.get('message'); c = m.get('content') if isinstance(m, dict) else None
    if not isinstance(c, list): continue
    for x in c:
        if not (isinstance(x, dict) and x.get('type') == 'tool_use'): continue
        inp = x.get('input', {})
        acts = inp.get('actions') if isinstance(inp, dict) else None
        if isinstance(acts, str):
            try: acts = json.loads(acts)
            except: acts = None
        for a in acts or []:
            f = a.get('set_page_freeform_code')
            if f and f.get('page_id') == '6aca162870735ac2247de4dd': last[f['location']] = f['content']
            s = a.get('set_settings')
            if s:
                for op in s['operations']:
                    for st in op['settings']:
                        if st.get('key') == 'code': last['embed'] = st['static_text']['value']
for k, p in want.items():
    if k not in last: print(k, 'not uploaded yet'); continue
    a = open(p).read(); b = last[k]
    if a == b: print(k, 'MATCH', len(b))
    else:
        i = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
        print(k, 'DIFF at', i, 'lens', len(a), len(b)); print(' file:', repr(a[max(0,i-60):i+60])); print(' sent:', repr(b[max(0,i-60):i+60]))
