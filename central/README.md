# Corner Café Service Hub on Vercel (central.cornercafefiji.com)

> **WARNING: STALE SNAPSHOT. DO NOT SWITCH STAFF OVER.** `central/page/` is a copy of the Webflow staff page from
> 22 October 2026, 14:57 UTC. It predates order tools loaders 2 to 34 (live: `ccOrderToolsLoader34`), the iPad shell,
> flow, polish, admin console, analytics metrics, seasonal, treat orders and the Cake Pulse rename. Deploying
> `central/dist` and switching staff over would roll them back to the 22 October app. It must be rebuilt from the
> current live Webflow page first. Full list of what is missing: [`docs/CENTRAL-STALE.md`](../docs/CENTRAL-STALE.md).

Started 23 October 2026, the same way as the Kazumi Service Hub (central.kazumifiji.com) and Marketing Central
(central.jacksrestaurantsfiji.com). Only the staff page moves: the Cake CRM at
www.cornercafefiji.com/cake-orders-staff. The Corner Café website, the guest cake order page and the festive page
stay on Webflow.

## How it works

- **The page.** `node scripts/build-central.mjs` builds `central/dist/` from `central/page/`, an exact copy of the
  published Webflow staff page (22 October 2026, 14:57 UTC). The build stops unless the copy rebuilds the live page
  character for character (SHA-256), so it cannot change by accident.
- **Same app, same data.** The page loads the Cake CRM exactly as the Webflow page does and uses the same Supabase
  database ("Corner Cafe Cakes"). Orders, customers, emails, the Google Sheet sync, the Heartbeat and Daily Cake
  Demand are unchanged.
- **One deliberate change.** The app-install script (`central/app/app-install.js`) points to this site's own
  `manifest.json`, so "Add to Home Screen" installs the Service Hub for this address.
- **Login gate.** `middleware.js` is the Kazumi gate with Corner Café names: anyone without a valid gate cookie sees
  the Corner Café gate page (`central/gate-page.js`) and must enter the team password. The device then stays unlocked
  for 30 days. This replaces the Webflow page password. Staff then sign in with their own account, as before.
- **Sign-in, as it actually is.** Three layers: the team password gate above, then each staff member's own email and
  password (Supabase), then a sign-out after 12 hours without activity. There is no two-step (second factor) code;
  two-step sign-in is planned but not built. Earlier wording that mentioned a "two-step code" was wrong.
- **Hidden from Google.** Every response says noindex and `robots.txt` disallows everything.
- **Builds.** Vercel builds only when the files listed in `vercel.json` (`ignoreCommand`) change.

## Why the page is a copy (unlike Kazumi and Marketing Central)

Kazumi's and Marketing Central's Webflow pages were small loaders; the apps themselves are stored in Supabase. The
Corner Café staff page keeps much of its code in the Webflow page itself (head and footer custom code, add-on
scripts), so that code was copied here. Chosen on 23 October 2026: after the switch-over this repository is the
master copy of the page and the Webflow staff page is retired. Until then, do not change the Webflow staff page's
code; if it must change, copy the change into `central/page/` and update the checksums in the same commit.

## Vercel environment variables (Production and Preview)

| Name | What it is |
|---|---|
| `CC_GATE_PASSWORD` | The team password staff type on the gate page. Roneel sets it. |
| `CC_GATE_SECRET` | A long random value that signs the gate cookie. Roneel sets it. |

Neither is ever stored in this repository. Changing either one signs every device out of the gate (use this when a
staff member leaves). If either is missing, the gate stays shut and says it is not set up.

## Setup (Roneel)

1. Vercel: Add New, Project, import `jrest2025/corner-cafe-cakes`. Leave Root Directory as the repository root;
   `vercel.json` sets the build. Name the project `corner-cafe-service-hub`.
2. Vercel, Settings, Environment Variables: add `CC_GATE_PASSWORD` and `CC_GATE_SECRET` (Production and Preview).
3. Vercel, Domains: add `central.cornercafefiji.com`, then add the DNS record Vercel shows (a CNAME for `central`)
   wherever `cornercafefiji.com` is managed.
4. Check the preview: gate, sign in, Today, a new order, Calendar, Customers, Analytics (Heartbeat), on a tablet and
   a phone.

## Switch-over (only on "deploy")

1. Database: `app_config.staff_app_url` from `https://www.cornercafefiji.com/cake-orders-staff` to
   `https://central.cornercafefiji.com`, so emails that open the staff app point to the new address.
2. Staff open the new address and add it to their home screen (the old home-screen icon opens the Webflow page).
3. Keep the Webflow page running alongside for a few days, then retire it (redirect it to the new address).
4. Later, separately: moving the app's own files off the public GitHub repository so it can go private.

## Tests

`npm run test:central`: the build equals the live page apart from the app-install script; the gate page, wrong and
right password, cookie checks, safe redirects, not-set-up state and sign-out (`tests/central/`).
