// Builds the Corner Café Service Hub page for Vercel (central.cornercafefiji.com) into central/dist/.
//
// The page is an exact copy of the published Webflow page www.cornercafefiji.com/cake-orders-staff
// (published 22 October 2026, 14:57 UTC), kept in central/page/:
//   skeleton.html     the page Webflow publishes, with the four custom code blocks replaced by {{markers}}
//   site-head.html    the site's head custom code          (Webflow: Site settings, Custom code, Head)
//   page-head.html    the staff page's head custom code    (Webflow: Page settings, Custom code, Head)
//   site-footer.html  the site's footer custom code
//   page-footer.html  the staff page's footer custom code (the Supabase library, the app loaders and add-ons)
// Put back together they give the live page character for character (SHA-256 checked below), so the
// Cake CRM behaves exactly as it does on Webflow: same code, same database, same staff sign-in.
//
// Only one change is made on purpose: the app-install script points to this site's own manifest
// (central/app/manifest.json), so "Add to Home Screen" installs the app for this address.
//
// From the switch-over this repository is the master copy of the page; the Webflow page is then retired.
// Change a central/page/ file only on purpose, and update its checksum below in the same commit.
//
// Run: node scripts/build-central.mjs          (Vercel runs this as the build command; no packages needed)
//      node scripts/build-central.mjs --check  (only checks the copied page)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const fail = (m) => { console.error(m); process.exit(1); };

const PARTS = {
  skeleton: '8434bc8ec3d98f497fed14f3f4e7e1df61bdd55fd35187189d718d646c0f9114',
  'site-head': '63b968d6ab610ff64d127b89d0fc6da298ea2d42c8ed799a95f15652a895b9b8',
  'page-head': '313b60f83af98de669f269769df7f15f46f982c410e60f4d94fc83799ea0ea8a',
  'site-footer': 'e77c9f45bf199763a7c7bbaf6500e02e9c84eccf4f2832fa35d1212bab3cba02',
  'page-footer': 'da2116649ee04e3efe627c6f4f98c46047f3a96bc6fa9c9a40b1c4c5e04ea2ba',
};
// The whole live page, as published by Webflow on 22 October 2026 (137,574 characters).
const LIVE_PAGE = '6d8d874985efd6c4d795b668232450a8df339737415866ba31edb27178d62c10';

const part = {};
for (const [name, want] of Object.entries(PARTS)) {
  part[name] = read(`central/page/${name}.html`);
  if (sha(part[name]) !== want) fail(`central/page/${name}.html changed (sha256 ${sha(part[name])}, expected ${want})`);
}
let page = part.skeleton;
for (const name of ['site-head', 'page-head', 'site-footer', 'page-footer']) {
  const marker = `{{${name}}}`;
  if (page.split(marker).length !== 2) fail(`skeleton.html must contain ${marker} exactly once`);
  page = page.replace(marker, () => part[name]);
}
if (sha(page) !== LIVE_PAGE) fail(`the rebuilt page is not the live Webflow page (sha256 ${sha(page)})`);
if (!page.includes('<div id="cc-staff">')) fail('the Cake CRM container <div id="cc-staff"> is missing');
if (!/name="robots"/.test(page)) fail('the page lost its noindex tag');
if (process.argv.includes('--check')) { console.log('central/page matches the live Webflow page'); process.exit(0); }

// The one deliberate change: the app-install script, for this address's own manifest.
const installTag = '<script src="https://cdn.prod.website-files.com/6a0afe25d2f1212db6f93a0e%2F689e5ba67671442434f3ca35%2F6ad864aa96cc148f21d1020f%2Fccservicehubappinstall-1.0.0.js" type="text/javascript"></script>';
if (page.split(installTag).length !== 2) fail('the app-install script tag was not found exactly once');
page = page.replace(installTag, '<script src="/app-install.js" type="text/javascript"></script>');

// WhatsApp preview is composed only after the pristine live-page checksum passes.
const whatsappJs = read('src/staff.whatsapp-workspace.js');
const whatsappCss = read('src/staff.whatsapp-workspace.css');
if (!whatsappJs.includes('CornerWhatsappWorkspace') || !whatsappCss.includes('.ccwa-panel'))
  fail('WhatsApp preview assets are missing or incomplete');
page = page.replace('</body>', '<link rel="stylesheet" href="/whatsapp-workspace.css"><script src="/whatsapp-workspace.js" defer></script></body>');
if (!page.includes('src="/whatsapp-workspace.js"')) fail('WhatsApp preview script injection failed');

const out = join(root, 'central', 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), page);
writeFileSync(join(out, 'whatsapp-workspace.js'), whatsappJs);
writeFileSync(join(out, 'whatsapp-workspace.css'), whatsappCss);
for (const f of ['app/app-install.js', 'app/manifest.json', 'cc-logo.png']) copyFileSync(join(root, 'central', f), join(out, f.split('/').pop()));
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
console.log(`Built central/dist: index.html (live page, ${page.length} characters), app-install.js, manifest.json, cc-logo.png, robots.txt, WhatsApp preview assets`);
