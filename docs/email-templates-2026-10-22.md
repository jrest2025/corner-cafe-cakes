# Email templates and no cake photos in customer emails (22 October 2026)

Roneel's brief: remove generic cake photos from customer emails, and add Settings, Communications, Email templates.
Branch `feature/email-templates-20261022`. Live only when Roneel says "deploy".

## What changes

**Customer emails (`supabase/functions/send-emails/guest_emails.ts`)**
- The stock cake photo is gone from Order received, Price, Order confirmed, Order updated and Thank you.
  The cream banner stays with the status, heading and banner line. The logo is the only image.
- The Jack's Restaurants cross-sell cards keep their venue photos (restaurants, private dining, catering). None shows a cake.
- With nothing published, every email's wording is byte for byte as before (checked on all 8 customer emails).
- A published template replaces only the boxes staff changed. Unchanged boxes keep the standard wording, which still
  adjusts itself for deliveries, custom cakes, WhatsApp customers and payments. The order card, prices, buttons,
  cross-sell, footer and unsubscribe are always built from the order.
- The staff's reason for declining an order is always added to the declined email.

**Email sender (`send-emails/index.ts`)**
- Reads the published wording for each customer email; if that read fails the email goes with the standard wording.
- The thank-you email can be switched off. A switched-off email is logged in `email_outbox` as not sent
  ("switched off in Settings, Email templates") and not retried.
- Records `template_version_id` on the outbox row after sending, only when a template was used.
- No change to Resend, the sending domain, keys, sender, triggers, the queue, retries, staff or kitchen emails.

**Preview and test function (`supabase/functions/email-templates`)**, deployed 22 Oct (version 2, pinned to 7e1aa73)
- Signed-in staff with the Settings switch only. Made-up order details only. Tests go to the signed-in person's own
  login email with [TEST] in the subject. It never sends to customers.

**Staff app (`src/staff.email-templates.js`, `.css`, build `build/staff_email_templates.py`)**
- Settings, Communications (before Team and access), Email templates: the 8 customer emails, their status,
  how many went out in the last 30 days.
- Editor: subject, inbox preview line, status label, heading, banner line, main and closing message
  (bold, bullets, links). Insert field shows plain names as chips, never codes. Computer and phone previews.
  Save draft, Send me a test, Publish, version history with "Use this wording", Go back to the standard wording,
  Discard the draft. Who and when on every version, 12-hour times.
- Unknown fields block publishing. Unsaved edits are kept on the device and picked up again.
- Touch standard sizes on tablets and phones; on phones Insert field is a bottom sheet and the actions are fixed.
- Order emails cannot be switched off; only Thank you has a switch.

Not built, on purpose: collection reminders, ready-for-collection, birthday and Birthday Club emails (not sent today;
the Birthday Club is phone-only by design), and duplicating a template into another email (each email belongs to one event).

## Database (`supabase/sql/email_templates_20261022.sql`), additive only
- Tables `email_template_versions` (draft, published, archived; who and when) and `email_template_switches`.
- Column `email_outbox.template_version_id` (nullable).
- Functions `email_tpl_home`, `_save`, `_publish`, `_discard`, `_copy`, `_standard`, `_switch`; each checks `mgmt.settings`.
- STATUS: NOT APPLIED. Two attempts were stopped at the approval prompt on 22 Oct.

## Checks
- `test/run_email_templates.cjs`: 66/66 (emails, the full editor journey, counter login, iPad landscape and portrait, phone).
- Heartbeat guard 80/80, Daily Cake Demand contract PASS, touch 76/76 on the candidate bundle.

## Release, when Roneel says "deploy"
1. Apply the database file (if not yet applied).
2. `send-emails`: change the one import line to commit `7e1aa73b2cd7aa3e894a019d5f38dfc11eccf5b5`. Rollback: point it back at
   `72fcd30e8cab5297f6ba29c0258301fadf9d6d1a` (version 26).
3. Staff page footer: change only the app loader line to the file and SRI in `dist/app/staff-email-templates-manifest.json`,
   pinned at the release commit. Save the current footer to `docs/rollback/` first, read back, then publish.

## Released live, 22 October 2026, about 12:05 PM Fiji (Roneel: "deploy")
- `send-emails` version 27: the one import line now pins commit `7e1aa73b2cd7aa3e894a019d5f38dfc11eccf5b5`.
  Customer emails have no cake photo from now on. Wording unchanged (no template can be published yet).
- Checked: an empty run (the same call the 5-minute job makes) answered 200 `{"ok":true,"claimed":0,...}` on the new version.
- Rollback: redeploy `send-emails` with the import pinned at `72fcd30e8cab5297f6ba29c0258301fadf9d6d1a` (version 26).
- NOT released: the database file (stopped at the approval prompt three times, 22 Oct) and the staff page footer.
  The Email templates screen needs the database first; without it the screen hides itself, so the footer was left unchanged.
