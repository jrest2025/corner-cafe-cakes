# Service Hub as an app on phones, tablets and Macs (21 October 2026)

Roneel: "open as an app on phone and tablet and also have like a desktop app for my mac", then "lets start with the cake hub".

Status: candidate, not live. Goes live only when Roneel says "deploy".

## What it adds
- Name: Corner Café Service Hub. Under the icon: Corner Café.
- Icon: white Corner Café logo on the charcoal of the side menu (#292d33). Files in `dist/pwa/` (commit 4767235).
- Opens full screen, without browser bars, at /cake-orders-staff.
- Two manifests (commit 7c4d89f): `manifest.json` for cornercafefiji.com and `manifest-www.json` for www.cornercafefiji.com. A one-line script in the head picks the right one.

## Where the change lives
- Staff page head custom code only: `src/staff.app-install.head.html` is added at the end of the head.
- No change to the app code, the footer, the database, the Cake Heartbeat or any workflow.

## Not included
- No offline screen. That needs a service worker served from cornercafefiji.com itself, which Webflow cannot host. Without internet the device shows its own "no connection" message.

## Checked
- Headless Chromium: manifest parses with no errors, no installability errors, live head code runs with no errors.

## Rollback
Paste `docs/rollback/staff-head-before-app-install-2026-10-21.html` into the staff page head and publish, or delete the block between the `cc-app-install-20261021` comments.
