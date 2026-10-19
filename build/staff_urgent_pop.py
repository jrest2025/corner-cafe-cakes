"""Urgent pop-up fix (19 October 2026), on top of the live Cake for release.
- Today lists every attention order (not the first 3), so the pop-up shows them all and no "See all" link is needed.
- The pop-up's "Open Needs attention for everything" link is removed.
- Each row in the pop-up is a two-line block: when, then what to do, with "Collect balance first" as a tag.
"""
import base64, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bm = json.loads((ROOT / 'dist/app/staff-cakefor-manifest.json').read_text())
s = (ROOT / bm['file']).read_text()
assert 'sha384-' + base64.b64encode(hashlib.sha384(s.encode()).digest()).decode() == bm['sri'], 'Base is not the live release'
def rep(old, new):
    global s
    assert s.count(old) == 1, ('marker count', old[:60], s.count(old)); s = s.replace(old, new)
# 1. Today: all attention rows, so no "See all" link.
rep('var d=3,u=c.filter', 'var d=c.length,u=c.filter')
# 2. Pop-up: no link to the Needs attention screen.
rep("  if (more) { var all = document.createElement('button'); all.type = 'button'; all.className = 'ccs-link tx-all'; all.setAttribute('data-tab', 'attn'); all.textContent = 'Open Needs attention for everything →'; body.appendChild(all); }\n", '')
# 3. Pop-up rows: when / what to do / tags.
rep("cur.rows.forEach(function (r) { r.classList.remove('tx-hide'); body.appendChild(r); });",
    "cur.rows.forEach(function (r) { r.classList.remove('tx-hide'); upRow(r); body.appendChild(r); });")
helper = r'''
// Urgent pop-up rows (19 October 2026): split the reason into when and what to do; payment becomes a tag.
function upRow(r) {
  var sp = r.querySelector(':scope > span'); if (!sp || r.querySelector('.up-when')) return;
  var t = sp.textContent.trim(), tags = [];
  var pay = /\s*(Take the balance first\.|Cake is ready\. Take the balance before handing over\.|Take the balance before handing over\.)\s*/;
  if (pay.test(t)) { t = t.replace(pay, ' ').trim(); tags.push('Collect balance first'); }
  var m = t.match(/^(.*?(?:AM|PM|\d)\.)\s+(.+)$/), when = m ? m[1] : t, todo = m ? m[2] : '';
  var html = (when ? '<span class="up-when">' + Tt(when.replace(/\.$/, '')) + '</span>' : '') + (todo ? '<span class="up-do">' + Tt(todo) + '</span>' : '');
  if (tags.length) html += '<span class="up-tags">' + tags.map(function (x) { return '<em class="up-tag">' + Tt(x) + '</em>'; }).join('') + '</span>';
  sp.insertAdjacentHTML('afterend', html); sp.remove();
}
'''
rep('// ---- Kitchen > Handover: same islands as the Handover screen ----', helper + '// ---- Kitchen > Handover: same islands as the Handover screen ----')
css = (ROOT / 'src/staff.urgent-pop.css').read_text(); assert '</script' not in css.lower()
s += '\n(function(){var s=document.createElement("style");s.id="ccs-urgent-pop";s.textContent=' + json.dumps(css) + ';document.head.appendChild(s)})();\n'
raw = s.encode(); name = 'staff-app.' + hashlib.sha256(raw).hexdigest()[:10] + '.js'
(ROOT / 'dist/app' / name).write_bytes(raw)
m = {'file': 'dist/app/' + name, 'sri': 'sha384-' + base64.b64encode(hashlib.sha384(raw).digest()).decode(), 'bytes': len(raw), 'base': bm['file'], 'base_sri': bm['sri']}
(ROOT / 'dist/app/staff-urgent-pop-manifest.json').write_text(json.dumps(m, indent=2) + '\n'); print(json.dumps(m))
