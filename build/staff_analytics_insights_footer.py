#!/usr/bin/env python3
"""Rewrite the staff page footer's Analytics loader for the insight engine release (20 October 2026).

Usage: staff_analytics_insights_footer.py CURRENT_FOOTER NEW_FOOTER COMMIT_SHA [--rail]

Only the cc-heartbeat-loader block changes:
  - the seasonal module (management cards, seasonal buildup) is pinned to COMMIT_SHA instead of 74e18a7;
  - the insight engine (src/staff.analytics-insights.js/.css at COMMIT_SHA) is loaded beside it, and mounted after
    the seasonal module and the protected Daily cake demand rail, in its own try/catch.
The approved core (3fb6a2e) pin is left exactly as it is. The protected Daily cake demand rail (1acf060) is left as it is
unless --rail is given (owner-approved fix only): then it is pinned to COMMIT_SHA too. Every edit is asserted.
"""
import re
import sys

OLD_SEASONAL = '74e18a793ea158d98860c1f5e66b510e24e2159e'
CORE = '3fb6a2e1f548bbf0de6b5796eb76aa432931111e'
RAIL = '1acf060a9e22beea028d04820c1d51c101c5599c'
RAW = 'https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/'


def rewrite(footer, sha, rail=False):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise SystemExit('commit sha must be 40 hex characters')
    start = footer.index('<script id="cc-heartbeat-loader">')
    end = footer.index('</script>', start) + len('</script>')
    block = footer[start:end]
    assert block.count(CORE) == 2 and block.count(RAIL) == 2, 'core or rail pin changed unexpectedly'
    assert block.count(OLD_SEASONAL) == 2, 'seasonal pin is not the expected 74e18a7'
    new = block.replace(OLD_SEASONAL, sha)
    rail_pin = RAIL
    if rail:
        new = new.replace(RAIL, sha)
        rail_pin = sha

    rail_css = ("read('" + RAW + rail_pin + "/src/staff.demand-rail.locked.css').catch(function(e){console.warn('[Daily Demand] "
                "Using previous chart: rail CSS unavailable',e);return ''})")
    assert new.count(rail_css) == 1
    insights = ("read('" + RAW + sha + "/src/staff.analytics-insights.js').catch(function(e){console.warn('[Cake insights] Not loaded; "
                "Heartbeat unchanged',e);return ''}),read('" + RAW + sha + "/src/staff.analytics-insights.css').catch(function(e)"
                "{console.warn('[Cake insights] Not loaded; Heartbeat unchanged',e);return ''})")
    new = new.replace(rail_css, rail_css + ',' + insights)

    seasonal_tail = "catch(seasonErr){console.warn('[Cake seasonal analysis] Supplemental panel unavailable',seasonErr);}}\"});"
    assert new.count(seasonal_tail) == 1
    mount = ("catch(seasonErr){console.warn('[Cake seasonal analysis] Supplemental panel unavailable',seasonErr);}}"
             "\\n      if(DX.data&&!DX.error&&window.CCCakeInsights){try{window.CCCakeInsights.mount(mount,DX.data,{today:today()});}"
             "catch(insightErr){console.warn('[Cake insights] Not available; Heartbeat unchanged',insightErr);}}\"});")
    new = new.replace(seasonal_tail, mount)

    combined = 'var railReady=!!(extra[2]&&extra[3]);var combined=extra[0]+"\\n"+(railReady?extra[2]:"")+"\\n"+injected;'
    assert new.count(combined) == 1
    new = new.replace(combined, 'var railReady=!!(extra[2]&&extra[3]);var insReady=!!(extra[4]&&extra[5]);'
                      'var combined=extra[0]+"\\n"+(railReady?extra[2]:"")+"\\n"+(insReady?extra[4]:"")+"\\n"+injected;')
    css = 'return {js:combined,css:core[1]+"\\n"+extra[1]+(railReady?"\\n"+extra[3]:"")}'
    assert new.count(css) == 1
    new = new.replace(css, 'return {js:combined,css:core[1]+"\\n"+extra[1]+(railReady?"\\n"+extra[3]:"")+(insReady?"\\n"+extra[5]:"")}')
    return footer[:start] + new + footer[end:]


if __name__ == '__main__':
    cur, out, sha = sys.argv[1:4]
    text = open(cur, encoding='utf-8').read()
    result = rewrite(text, sha, rail='--rail' in sys.argv[4:])
    open(out, 'w', encoding='utf-8').write(result)
    print('footer', len(text), '->', len(result), 'characters; only cc-heartbeat-loader changed')
