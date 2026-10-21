# Service Hub as an app on phones, tablets and Macs (21 October 2026)

Roneel: "open as an app on phone and tablet and also have like a desktop app for my mac", then "lets start with the cake hub".

Status: live. Roneel said "deploy" at 7:06 PM; published 21 October 2026 about 7:12 PM Fiji to cornercafefiji.com and www.cornercafefiji.com.

## What it adds
- Name: Corner Café Service Hub. Under the icon: Corner Café.
- Icon: white Corner Café logo on the charcoal of the side menu (#292d33). Files in `dist/pwa/` (commit 4767235).
- Opens full screen, without browser bars, at /cake-orders-staff.
- Two manifests (commit 7c4d89f): `manifest.json` for cornercafefiji.com and `manifest-www.json` for www.cornercafefiji.com. The script picks the right one.

## Where the change lives
- A registered page script, not the head custom code: `CCServiceHubAppInstall` 1.0.0 (id `ccservicehubappinstall`), applied to the staff page header. Source: `src/staff.app-install.js`. It adds the manifest link, Apple icon and app meta tags to the page head.
- The head and footer custom code were not touched, and the four existing page scripts stay as they were.
- No change to the app code, the footer, the database, the Cake Heartbeat or any workflow.

## Not included
- No offline screen. That needs a service worker served from cornercafefiji.com itself, which Webflow cannot host. Without internet the device shows its own "no connection" message.

## Checked
- Headless Chromium: manifest parses with no errors, no installability errors, live head code runs with no errors.

## Rollback
Remove the page script `ccservicehubappinstall` from the staff page (Webflow scripts, remove_page_script) and publish. Nothing else needs changing.
