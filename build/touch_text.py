"""Touch standard, text (21 October 2026): writes src/staff.touch-text.css from build/touch-harvest.json.

Roneel, 3:18 PM: "Apply the Jack's Restaurants touch-friendly interface standard to this app" (text sizes: tablets body
20, labels 18, small print 17 minimum, section headings 24, page titles 32, large numbers 32-38; phones 18 / 17 / 16 / 21 /
26 / 28-32; dark grey #1D2939 or darker, no pale grey; line height about 1.4; tokens and component rules only; never
shrink text to make things fit; computers stay exactly as they are).

Every rule of the app that sets a font size (build/touch_harvest.cjs collects them) gets a matching rule for tablets
((hover: none) and (pointer: coarse) and (min-width: 701px)) and for phones (max-width: 700px) that sets the size from a
token by the part it plays:
  small print (was under 14px) -> --cc-fs-small    labels and secondary text (14-15px) -> --cc-fs-label
  body text (16-19px)          -> --cc-fs-body     section headings and anything larger -> --cc-fs-h
  page titles (.ccs-title on a screen) -> --cc-fs-title     large numbers (totals, counts, prices) -> --cc-fs-num
always as max(the old size, the token), so nothing gets smaller. Line heights set in pixels become 1.4 (1.2 for headings
and numbers), so bigger text never overlaps. Pale grey text colours (written into a rule, not a colour setting) become
--cc-ink-2 (#344054); greys set through colour settings are changed in src/staff.touch.css.
Left alone: the Cake Heartbeat in Analytics (protected: it stays exactly as it is), print, the printed kitchen slip and
report, the photo viewer, chart lettering inside SVG, and the controls that src/staff.touch.css sizes by hand (buttons,
chips, text boxes, the side menu).
Each new rule repeats the old selector with :root:not(#cc-t0) in front, inside the old rule's own media conditions, so it
applies exactly where the old one did, and wins over it.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
H = json.loads((ROOT / 'build/touch-harvest.json').read_text())
TABLET = '(hover: none) and (pointer: coarse) and (min-width: 701px)'
PHONE = '(max-width: 700px)'

SKIP_SEL = re.compile(r'\.ccs-slip\b|\.s5-|\.ccs-brief|\.ccs-b-|\.ccs-lb\b|\.lb-|\.ccs-print|#ccs-print|\.cc-ch\b|\.ccg-|\.ccs-touch|'
                      r'hb-|#cc-heartbeat|ccdr|ccsd|cci-|\.cci\b|#cc-insights|#cc-demand|#cc-seasonal|'
                      r'(?:^|[\s>+~(])(?:svg|text|tspan|path|rect|circle|line|g)(?=$|[\s.#:\[>+~,)])')
# Controls sized by hand in src/staff.touch.css (font size, height): the generated rules leave their font size alone
HAND = re.compile(r'(\.ccs-btn|\.ccs-chip|\.ccs-tab|\.ccs-secbtn|\.ccs-nav-item|\.ccs-navh|\.ccs-brand|\.ccs-input|\.ccs-select|'
                  r'\.ccs-x|\.ccs-count|\binput|\bselect|\btextarea|::placeholder)[^\s>+~]*$')
# Buttons and chips the app already makes taller than the standard's minimum keep their height (src/staff.touch.css uses
# max(the standard's height, --cc-keep-h))
KEEP = re.compile(r'(\.ccs-btn|\.ccs-chip|\bbutton|\.ccs-tab|\.ccs-secbtn|\.ccs-link|\.of-big|-btn\b|\.tq-new|\.tq-find|\.ccs-datecell)[^\s>+~]*$')
NUM = re.compile(r'kpi|\.ov-kv|stat\b|stats\b|stat-num|metric-value|cci-big|crm-big|\.ccs-total\b|\.ccs-price\b|daytot|\.tp-ovn|'
                 r'ringc|kw-ncake|\.ov-cn|\.bc-k\b|\.ap-text|\.at-jump|\.oi-gap|\.of-ref|\.dx-hv|\.up-stats|\.cat-k\b|'
                 r'\.tq-stat|\.or-stat|\.hb-m-kpi|\.hb-v2-kpis')
TITLE = re.compile(r'(\.ccs-head|\.ccs-dash-head|\.tq-head|\.tp-head|\.kw-head|cdir-v3-ready \.ccs-head)\s.*(\.ccs-title|h1)\b|'
                   r'^#cc-staff \.ccs-title$|^\.ccs-title$|cdir-heading-title')
IN_SHEET = re.compile(r'#ccs-sheet|\.ccs-sheet|\.rm-profile|\.cc-dp-|\.ccdr-|dialog|\.ccs-modal|\.ap-pop|\.bcm-')
DARK = re.compile(r'\.ccs-side|\.ccs-brand|\.ccs-navh|\.ccs-who|\.ccs-topbrand|\.ccs-topbar|\.ccs-top\b|ccp-|toast|dark|:hover|:disabled|\[disabled|aria-disabled|is-disabled|'
                  r'\.ccs-btn|\.ccs-pill|\.ccs-tag|\.ccs-count|\.ccs-shade|\.tb-|ov-heat|\.hb-|is-on\b|aria-pressed="true"|'
                  r'aria-current|\.is-now|\.s-|\.t-|tooltip|\.ccs-new|ccs-good|ccs-red|ccs-danger')


def parts(sel):
    """Split a selector list at top-level commas."""
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def boost(p):
    # the Heartbeat (Analytics) stays exactly as it is: no generated rule reaches inside it
    pe = re.search(r'(::?(?:before|after|placeholder|first-line|first-letter|marker|selection|backdrop|-webkit-[a-z-]+)(?:\([^)]*\))?)$', p)
    p = (p[:pe.start()] + ':not(#cc-heartbeat *)' + pe.group(1)) if pe else p + ':not(#cc-heartbeat *)'
    m = re.match(r'^(html|body|:root)((?:[.:#\[][^\s>+~]*)?)(.*)$', p, re.S)
    if m:
        return m.group(1) + m.group(2) + ':not(#cc-t0)' + m.group(3)
    return ':root:not(#cc-t0) ' + p


def role(sel, px):
    if px >= 20 and NUM.search(sel):
        return 'num'
    if px >= 20 and TITLE.search(sel) and not IN_SHEET.search(sel):
        return 'title'
    if px >= 20:
        return 'h'
    if px >= 16:
        return 'body'
    if px >= 14:
        return 'label'
    return 'small'


def rgb(c):
    c = c.strip().lower()
    m = re.match(r'^#([0-9a-f]{3}|[0-9a-f]{6})$', c)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = ''.join(x * 2 for x in h)
        return [int(h[i:i + 2], 16) for i in (0, 2, 4)] + [1.0]
    m = re.match(r'^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$', c)
    if m:
        a = m.group(4)
        a = 1.0 if a is None else (float(a[:-1]) / 100 if a.endswith('%') else float(a))
        return [int(m.group(i)) for i in (1, 2, 3)] + [a]
    return None


def pale_grey(c):
    v = rgb(c)
    if not v:
        return False
    r, g, b, a = v
    r, g, b = [x * a + 255 * (1 - a) for x in (r, g, b)]          # on white
    f = lambda x: (x / 255) / 12.92 if x / 255 <= .03928 else (((x / 255) + .055) / 1.055) ** 2.4
    L = .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
    return max(r, g, b) - min(r, g, b) < 48 and .09 < L < .6


def lh_px(v):
    return bool(v) and bool(re.match(r'^[\d.]+px$', v.strip()))


blocks = {TABLET: [], PHONE: []}
counts = {'size': 0, 'lh': 0, 'colour': 0, 'keep': 0, 'skipped': 0}
seen = set()


def applies(media, dev):
    """False when the old rule's own media conditions can never match on this kind of device."""
    for m in media:
        if ',' in m:
            continue
        lo = [float(x) for x in re.findall(r'min-width:\s*([\d.]+)px', m)]
        hi = [float(x) for x in re.findall(r'max-width:\s*([\d.]+)px', m)]
        if dev == PHONE and any(x > 700 for x in lo):
            return False
        if dev == TABLET and any(x < 701 for x in hi):
            return False
        if dev == TABLET and re.search(r'\(hover:\s*hover\)|\(pointer:\s*fine\)', m):
            return False
    return True


for r in H['rules']:
    media = [m for m in r['media'] if m]
    if r['sheet'] == 'cc-heartbeat-style' or any('print' in m for m in media):
        counts['skipped'] += 1
        continue
    sels = [p for p in parts(r['sel']) if not SKIP_SEL.search(p)]
    if not sels:
        counts['skipped'] += 1
        continue
    fs, px = r.get('fs'), r.get('fsPx')
    sizes = {}                     # selector part -> (font-size declaration, role)
    if fs and not re.search(r'inherit|initial|unset|revert|pt\b|var\(--cc-fs', fs):
        f = fs.strip()
        for p in sels:
            if HAND.search(p):
                continue
            if re.search(r'^[\d.]+(em|%)$', f):
                if (float(f[:-2]) if f.endswith('em') else float(f[:-1]) / 100) < 1:
                    sizes[p] = ('font-size:max(%s,var(--cc-fs-small))!important' % f, None)
            elif px:
                rl = role(p, px)
                sizes[p] = ('font-size:max(%gpx,var(--cc-fs-%s))!important' % (round(px, 2), rl), rl)
    lh = r.get('lh')
    col = r.get('color')
    colour = col and not any(DARK.search(p) for p in sels) and pale_grey(col)
    mh = re.match(r'^([\d.]+)px$', (r.get('minh') or '').strip())
    keep = float(mh.group(1)) if mh and float(mh.group(1)) >= 49 else None
    by = {}
    for p in sels:
        size, rl = sizes.get(p, (None, None))
        decl = [size] if size else []
        if keep and KEEP.search(p):
            decl.append('--cc-keep-h:%gpx' % keep)
        if lh_px(lh):
            decl.append('line-height:%s!important' % ('1.2' if rl in ('h', 'title', 'num') else 'var(--cc-lh)' if rl else '1.35'))
        if colour:
            decl.append('color:var(--cc-ink-2)!important')
        if decl:
            by.setdefault(tuple(decl), []).append(p)
    groups = [(ps, list(d)) for d, ps in by.items()]
    for sel_group, decl in groups:
        key = (tuple(media), tuple(sel_group), tuple(decl))
        if key in seen:
            continue
        seen.add(key)
        for d in decl:
            counts['size' if d.startswith('font') else 'lh' if d.startswith('line') else 'keep' if d.startswith('--') else 'colour'] += 1
        rule = ', '.join(boost(p) for p in sel_group) + '{' + ';'.join(decl) + '}'
        for m in reversed(media):
            rule = '@media %s{%s}' % (m, rule)
        for dev in blocks:
            if applies(media, dev):
                blocks[dev].append(rule)

head = ('/* Corner Café Service Hub: touch standard, text sizes (21 October 2026). GENERATED by build/touch_text.py from\n'
        '   build/touch-harvest.json: do not edit by hand. Tokens are set in src/staff.touch.css. %d sizes, %d line heights,\n'
        '   %d pale greys, for each of tablets and phones. Computers: no change. */\n') % (counts['size'], counts['lh'], counts['colour'])
out = head + ''.join('@media %s{\n%s\n}\n' % (dev, '\n'.join(rules)) for dev, rules in blocks.items())
(ROOT / 'src/staff.touch-text.css').write_text(out)
print(json.dumps(counts), len(out))
