# Release: touch standard, practice mode, colleague voice and order labels (21 October 2026)

Live at **7:14 PM Fiji time, 21 October 2026**. Roneel chose "Deploy it now" after seeing the preview, and it was published to cornercafefiji.com and www.cornercafefiji.com.

## What went live
- **Touch-friendly standard on tablets and phones.** See docs/history/touch-standard-2026-10-21.md. Computers are unchanged and the Heartbeat is untouched.
- **Practice mode with 3 guided tasks:** a new order, an old order from a paper slip, and handing over a cake with the balance.
- **The colleague voice across the app.** See docs/staff-voice.md.
- **A clear label on every order for how it came in:** Website order, Walk-in, Phone, WhatsApp, Social media or Corporate.

## Code
- Commit `7103cd832bedf3751dd0ca98be04e9116424baba` (approved, publishing). The candidate was 2986f27.
- **Staff app:** `dist/app/staff-app.f9f4853c95.js`
  - md5 `e2f696b07a90e949f75e1cd21f14066a`
  - sri `sha384-S8xmIAgSh2Yp+9dZwdnPDg08jZtnbt1A5rCfRMZkcHreDGfivF0nugNqO4D0c7J5` (`dist/app/staff-touch-manifest.json`)
  - cdn.jsdelivr.net and fastly.jsdelivr.net checked by md5 before publishing.
- **Finish step add-on:** `src/staff.finish-flow.js` and `.css` at the same commit.
  - js md5 `55cfa3d916bdff632b89d30f88bf2eff`, css md5 `6a75f4bf5b355af55e95a27be80efce9`
  - jsDelivr and raw.githubusercontent.com both checked.
- **Page code**, built by build/page_release_20261021.py. Webflow keeps each block under 50,000 characters.
  - **Head:** 28,355 characters, md5 `a71efd33f02f89f634877f15db9b4dfd`. The practice guard and the touch page fixes come first, then the old head unchanged.
  - **Footer:** 49,491 characters, md5 `fa59265319d5b7adb6894351a152f22c`. Only the app loader and the finish step pin changed.
  - Both were read back from Webflow after writing and are identical to the built files. They are now test/fixtures/staff-head.html and staff-footer.html.

## Checks before publishing
These ran on the real page code at this commit:

| Check | Result |
|---|---|
| Heartbeat guard | 80/80 |
| Touch standard (test/run_touch.cjs) | 76/76 |
| Practice | 75/75 |

These ran on the same bundle:

| Check | Result |
|---|---|
| Practice guide | 100/100 |
| Order flow | 123/123 |
| Old orders | 144/144 |
| Form ease | 46 |
| Date typing | 26 |
| Taken date | 34 |
| Connected journey | 20 |

Not counted: birthday_club (2 checks) and flow_polish (time of day) fail on the old live version as well.

## Timeline
- **7:08 PM:** the new head was saved in Webflow.
- **7:12:18 PM:** someone else published the site. This put the new head live while the footer was still the old one, which is harmless: the guard does nothing outside practice mode, and the page fixes only affect touch screens.
- **7:12:49 PM:** the new footer was saved.
- **7:14:29 PM:** this release was published, with the head and footer together.
- Before publishing, no other page had changes waiting to go out.

## Rollback
Put back docs/rollback/staff-head-before-touch-2026-10-21.html and docs/rollback/staff-footer-before-touch-2026-10-21.html as the page's head and footer, then publish.
- Head md5 `6db1175b4346df174c913075a54ed3a1`
- Footer md5 `7651d0d132a67c20c1e1dd5e4750d70e`

Staff need to refresh the counter tablet once to get the new version.
