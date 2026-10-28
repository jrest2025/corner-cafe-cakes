const fs = require('fs'); const { open, tap, chromium } = require('./harness.cjs');
const loader = fs.readFileSync('loader.html', 'utf8').replace('SHA_OT', '0000000');
(async () => {
  const b = await chromium.launch();
  for (const [w, h, t] of [[1366, 900, 'desktop'], [1180, 820, 'tablet'], [390, 844, 'phone']]) {
    const { p, ctx } = await open(b, w, h, { extraFoot: loader, ipad: t === 'tablet' });
    await p.waitForTimeout(800);
    await tap(p, '#cc-staff [data-tab="new"]', 1200); await p.waitForSelector('#ccs-slipform', { timeout: 5000 }).catch(() => {});
    const r = await p.evaluate(() => {
      const f = s => { const e = [...document.querySelectorAll(s)].filter(x => x.closest('#ccs-slipform')).find(x => x.getClientRects().length); if (!e) return '-'; const c = getComputedStyle(e); return c.fontSize + ' ' + c.color; };
      return { coarse: matchMedia('(hover:none) and (pointer:coarse)').matches, tabletMode: document.documentElement.classList.contains('ccs-tablet-mode'), form: !!document.querySelector('#ccs-slipform'), hint: f('#ccs-slipform .ccs-hint'), modeSmall: f('#ccs-slipform .oo-mode-b small'), whoSmall: f('#ccs-slipform .of-who-t small') };
    });
    await tap(p, '[data-oo-mode="new"]', 300);
    await p.screenshot({ path: 'shots/' + t + '-5-customer.png' });
    console.log(t, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
