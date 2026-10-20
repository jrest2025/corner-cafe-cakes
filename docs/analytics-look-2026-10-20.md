# Analytics Overview, one look with the other tabs: published 20 October 2026, 10:58 PM Fiji

Roneel, 10:24 PM: "I THINK CORNER CAFE IS DONE .. THE ONLY THING TO DO IS REFINE THE ANALYTICS SECTION=S .. ITS LOOKS LIKE
LOOSE ENDS.." Of the four fixes offered he chose only **"One look everywhere"**: Overview gets the same white boxes and
cards as the other tabs, with one period choice per tab. He then approved the before/after pictures: "Yes, publish it".
Not chosen, so not done: one period per page, no empty boxes or repeats, plain words and phone fit.

## What staff see on Analytics > Overview

- **No big outer box.** The sections sit on the page, as on Cake sales, Cakes, Customers and the other tabs.
- **Title** "Cake Heartbeat" in the tab-title style. "Live · updated 10:58 PM" is the line under it.
- **7 / 30 / 90 days** look and work like the other tabs' period buttons. On touch screens they keep their larger
  44px height.
- **The six headline tiles** have no tinted fill. They have the same coloured edge and sizes as the tabs' tiles.
- **White boxes** (Popular cake types, Booking channels, Customer mix, Seasonal booking buildup) use the tabs' card
  edges, corners and spacing.
- **"Performance snapshot"** is a section title like the tabs' "What to do", with no dividing line.
- **The daily breakdown** is a closed box with an arrow, like the tabs' "Details" box. Tap it to open.

**Unchanged:**
- The Cake Heartbeat's code, figures, order and content. The Daily cake demand rail (booking curve) is not touched
  at all. The Seasonal booking buildup, the daily breakdown and the Occasions booking curve are all kept.
- The other tabs.
- The staff app's own code: this release only adds styles.

## What changed

| Where | Before | After |
|---|---|---|
| Staff page footer, app loader (one line) | `@c9d45cfdccf02045808e04a68044b2e73083ec9d/dist/app/staff-app.d5068266f8.js` | `@8477990309e8f001e8e5f1acc772918176e2dd65/dist/app/staff-app.6501cdd65b.js` (sha384-h5GVB/DCV1f6mGm7fgKegP2E5NTC68V9El7hD0ouYRNXymZREAt8Ez5iGWGaQ8BJ) |

Build: `build/staff_analytics_look.py` appends `src/staff.analytics-look.css` to the previous live release
(staff-app.d5068266f8.js). The new file is the old one plus that style block (6,593 characters), byte for byte.
The styles are scoped to `#cc-staff #ccs-main #cc-heartbeat`. Footer: `build/footer_analytics_look.py` (exactly the
loader line changes).

## Verified at release

- **Before writing:** the live footer was still the one recorded at the New order release (md5
  53750c6aa88aa94038db86334ad8f8e8, 49,491 characters).
- **Footer read back after saving:** identical to the prepared file (md5 c1dc568b7b3556296fcf16dea2e3db5c, 49,491
  characters).
- **Release file:** identical on cdn.jsdelivr.net, fastly.jsdelivr.net and raw.githubusercontent.com (md5
  711fc4a6526a112334ddabff48edce69).
- **Published:** to cornercafefiji.com and www.cornercafefiji.com at 10:58 PM (not to the Webflow subdomain).
  - The public order page (/order-cake) still loads its own app on both addresses.
  - The staff page is password protected, so it was checked through the saved footer.

## Checks

- **Heartbeat guard:** 80/80, both on the candidate and on the exact footer that was published.
- **Analytics tabs:** 42/42.
- **Side-by-side style check** (tablet landscape, tablet upright, phone): every Overview piece now matches its tab
  counterpart. The title, line under it, period buttons, tiles, cards, section titles and Details box all match, and
  the left and right edges line up with the tab pages.
- **Remaining differences, on purpose:**
  - The daily breakdown's label is one line (bold), where the tabs' Details label has a grey second part.
  - On touch screens the period buttons stay 44px tall (an earlier touch-size rule).

## Rollback

Staff page footer: put back `docs/rollback/staff-footer-before-analytics-look-2026-10-20.html`. That is the live footer
before this release (md5 53750c6aa88aa94038db86334ad8f8e8). Read it back, then publish to both custom domains. Nothing
else needs undoing.

## Note: another Analytics candidate exists, unpublished

Branch `refine/analytics-purpose-20261020` (commit dfaff08, 8:10 PM) holds a separate, unpublished Analytics tabs
candidate. It was built on an older app (staff-app.6699cb84d9.js, the Service Hub release).

If it is ever published as it is, it would undo:
- the Birthday Club (staff side);
- the New order flow;
- this release.

It must be rebuilt on the live release first, and pass the Heartbeat guard, before publishing.
