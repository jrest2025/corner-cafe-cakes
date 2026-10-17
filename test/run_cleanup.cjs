// Staff cleanup regression: real built bundles, invented data, no live API requests.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, process.env.STAFF_MANIFEST || 'dist/app/staff-cleanup-manifest.json')));
const baseline = 'dist/app/staff-app.57886bb6e3.js';
let checks = 0;
function check(name, condition) { assert.ok(condition, name); checks++; console.log('PASS ' + name); }
async function tab(page, name) {
  await page.locator('[data-tab="' + name + '"]').first().evaluate(e => e.click());
  await page.waitForTimeout(120);
}
async function section(page, name) {
  await page.locator('[data-setk="' + name + '"]').evaluate(e => e.click());
  await page.waitForTimeout(50);
}
async function fixture(browser, bundle, width = 1180, height = 820) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1280 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://**', route => route.abort());
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="cc-staff"></div></body></html>');
  await page.evaluate(() => { window.__role = 'admin'; window.print = () => {}; });
  await page.addScriptTag({ path: path.join(root, 'test/mock.js') });
  // Existing generic fixtures predate occasions. Supply its actual response shape.
  await page.evaluate(() => {
    const original = window.__ccsMock.rpc;
    window.__ccsMock.rpc = function (name, args) {
      if (name === 'occasion_admin') return Promise.resolve({ data: { ok: true, occasions: [], dates: [] } });
      return original.call(this, name, args);
    };
  });
  await page.addScriptTag({ path: path.join(root, bundle) });
  await page.waitForTimeout(180);
  return { page, context, errors };
}
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const [w, h] of [[1366, 768], [1180, 820], [820, 1180], [390, 844]]) {
      for (const bundle of [baseline, manifest.file]) {
        const { page, context, errors } = await fixture(browser, bundle, w, h);
        for (const name of ['today', 'orders', 'calendar', 'customers', 'settings']) {
          await tab(page, name);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          check((bundle === baseline ? 'baseline' : 'cleanup') + ' ' + w + ' ' + name + ' fits width', overflow <= 1);
        }
        check((bundle === baseline ? 'baseline' : 'cleanup') + ' ' + w + ' has no script errors', errors.length === 0);
        await context.close();
      }
    }
    const { page, context, errors } = await fixture(browser, manifest.file);
    await tab(page, 'settings');
    await section(page, 'Kitchen printing');
    check('editable destination has a clear label', await page.getByLabel('Send kitchen slips to (email)', { exact: true }).count() === 1);
    check('test mode is visible rather than Working', (await page.locator('.ccs-set details.is-cur').innerText()).includes('Test mode'));
    const count = name => page.evaluate(n => window.__calls.filter(c => c[1] === n).length, name);
    await page.fill('#pr-pri', 'changed@example.com');
    const testsBefore = await count('admin_print_test');
    await page.locator('[data-act="pr-test"]').click();
    check('unsaved printer change cannot run a test against the old address', await count('admin_print_test') === testsBefore);
    check('unsaved printer change explains what to do', (await page.locator('.ccs-set details.is-cur').innerText()).includes('Save printing settings first'));
    await page.fill('#pr-pri', 'kitchen@example.com');
    await page.locator('[data-act="pr-test"]').click();
    check('saved printer settings can still send a test', await count('admin_print_test') === testsBefore + 1);
    check('queued test is not described as already sent', (await page.locator('#ccs-toast').innerText()).startsWith('Test slip queued'));
    await section(page, 'Notice and collection hours');
    await page.fill('#st-ahead', '0');
    const updatesBefore = await page.evaluate(() => window.__calls.filter(c => c[0] === 'update').length);
    await page.locator('[data-act="save-loc"], [data-act="confirm-loc"]').click();
    check('zero booking window is refused without writing', await page.evaluate(() => window.__calls.filter(c => c[0] === 'update').length) === updatesBefore);
    check('validation releases the Save button', !await page.locator('[data-act="save-loc"], [data-act="confirm-loc"]').isDisabled());
    await page.fill('#st-ahead', '3');
    await page.locator('[data-act="save-loc"], [data-act="confirm-loc"]').click();
    check('booking window shorter than custom notice is refused', (await page.locator('#ccs-toast').innerText()).includes('must cover the notice'));
    await page.fill('#st-ahead', '90');
    await page.locator('[data-act="save-loc"], [data-act="confirm-loc"]').click();
    await page.waitForTimeout(100);
    check('valid collection settings still save', (await page.locator('#ccs-toast').innerText()).includes('saved'));
    check('cleanup interactions have no script errors', errors.length === 0);
    await section(page, 'Kitchen printing');
    await page.screenshot({ path: '/tmp/cc-crm-cleanup-tablet.png' });
    await context.close();
    console.log(checks + ' checks passed. No live orders, emails or settings were touched.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
