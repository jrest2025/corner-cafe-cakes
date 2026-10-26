# Corner Café Cake CRM — WhatsApp Business Cloud API

**Status:** staged source code only. NOT deployed, NOT activated, NO live customer messages sent.

## Scope
- Exactly **one** active WhatsApp Business number for all Corner Café cake communications.
- Editable by admin/manager, subject to verification with Meta.
- Existing CRM customers, order data, and consent history remain untouched.
- Meta tokens and webhook secrets stored as Supabase **Edge Function secrets**, never browser JavaScript, SQL, or GitHub.
- Incoming messages are recorded by phone number only. Do NOT automatically attach a conversation to a customer, since family and office numbers may be shared.
- First release supports authenticated replies to recent incoming messages (within 24 hours). **No bulk marketing, birthday messaging, pickup automation, or template sending is enabled.**

## Staged changes
- `supabase/sql/whatsapp_single_number.sql`: one connection row (id=1), private communication log, RLS and restricted table access.
- `supabase/functions/whatsapp-admin/index.ts`: staff token authentication, manager-only number configuration, Meta display-number check, enable/disable, 24-hour replies with request deduplication.
- `supabase/functions/whatsapp-webhook/index.ts`: Meta GET challenge verification, HMAC-SHA256 verification on POST, inbound message storage, delivery status updates.

## Required operator setup (not completed)
1. In Meta Business Manager, set up WhatsApp Business Platform / Cloud API and review whether your company number is eligible for coexistence with the WhatsApp Business app. **Do not disconnect, migrate, or deregister the current number until approved.**
2. Obtain the WhatsApp Business Account ID (WABA ID), Phone Number ID, and the verified E.164 phone number. Do not place these values in public code.
3. Configure secrets in Supabase for the Corner Café Cakes project:
   - `WA_ACCESS_TOKEN` — long-lived, suitably scoped Meta system-user token.
   - `WA_APP_SECRET` — Meta app secret used for webhook signature validation.
   - `WA_VERIFY_TOKEN` — unique random string used in the webhook verification challenge.
4. Review schema and function security. Apply `whatsapp_single_number.sql` under change control. Deploy both Edge Functions; the webhook function requires `verify_jwt=false` because Meta signs requests, not Supabase JWTs. The admin function should keep Supabase JWT verification on.
5. Register the public `whatsapp-webhook` function URL in the Meta app webhook configuration; subscribe to WhatsApp messages. Complete GET challenge verification.
6. Using an authenticated manager session, call `whatsapp-admin` with `{ "op":"configure", "display_number":"+679...", "phone_number_id":"...", "waba_id":"..." }`. It checks the number against Meta and always leaves messages **disabled**.
7. Only after test validation and explicit release approval, call `{ "op":"enable" }`. Disable anytime through `{ "op":"disable" }`.
8. Integrate a dedicated Settings → Integrations → WhatsApp Business UI, an Inbox, customer conversation matching and manual assignment. These user interface components are **not yet implemented**.
9. Conduct non-production tests: verified webhook; invalid signature rejection; non-manager forbidden; shared-number ambiguity; multiple event retries; inbound messages; outbound reply in 24-hour window; failure, duplicate and delivery status behavior; disabling blocks sends; no preexisting customer data changed.
10. Review Fiji data protection, retention, permission, and Meta template / opt-in rules before introducing reminders or promotions.

## Security and operations
- Only manager/admin can change the number; only one configured phone ID is accepted by the webhook.
- Number changes should occur only after verification. Existing CRM orders and historical messages must never be overwritten.
- Current adapter permits staff (other than Kitchen/Finance) to reply to recent incoming WhatsApp messages; revisit finer permissions before production release.
- `wa_messages` currently records inbound body and delivery status, with private DB access. Introduce retention and deletion rules before production.
- An outbound message timeout can leave an uncertain Meta delivery state; do not blindly resend after a network error. Review the Meta API logs and message ID.
- Version of Meta Graph API is currently pinned to `v23.0`; check for API deprecation before rollout.
- No production schema changes, edge function deployments, Webflow publishes, or Meta account operations have been executed by this branch.

## What remains
Create staff UI, implement Meta template approval and outbound queue for order confirmations / ready-to-collect / pickup reminders, determine correct order lifecycle events, and add observability/alerting and human inbox assignment before switching on automated customer messages.

## Order-level messaging (approved design clarification)
- The order page should contain a **Messages** tab with a chat transcript and reply composer. Staff must not need to leave the CRM.
- The customer's phone number is the WhatsApp identity; an order is a separate business record. Show the same conversation with explicit order links, not duplicated chats.
- Support an optional `wa_messages.order_id` for messages that are confidently linked to the relevant cake order. Never automatically assign based solely on a mobile number; a customer may have multiple open orders and families/offices share numbers.
- Outbound replies launched from an order must be linked to that order **after** validating the order and recipient contact; adding `order_id` to the admin API is still pending.
- For inbound messages with no reliable order reference, show **Needs linking** in a shared inbox; staff can pick the order after reviewing the reference and content. The order assignment UI and authenticated assignment endpoint are still pending.
- An order page should show only explicitly linked messages, plus a clear link to the broader phone-number conversation; do not misrepresent an unlinked conversation as belonging to the order.
- Stage order association separately from production. No messages have been sent.

## 26 October follow-on: inbox and order messaging preview
- Added `src/staff.whatsapp-workspace.js` and `src/staff.whatsapp-workspace.css`, with a central WhatsApp inbox, phone-number thread view, and per-order message panel where the current order ID can be resolved unambiguously from the existing order list.
- Expanded `whatsapp-admin` to support `inbox`, `thread`, `order`, `link` and order-specific `reply`, all authenticated and restricted to counter/manager/admin roles. The API validates that the order's saved contact phone matches the WhatsApp recipient before linking or sending.
- `scripts/build-central.mjs` injects the preview assets **only after** verifying the pristine live-page checksum. No production page file has been changed.
- This is an **early integration preview**, not a complete end-to-end release. The order action is not shown when the UI cannot confidently resolve the order ID; this requires a first-party order-detail integration before production. Staff permissions in custom access levels still need final verification.
- The UI does not support setting the business number yet; manager configuration is available only through the protected API. A proper Settings section is still required.
- No customer notifications, templates, automated sending, or image handling have been implemented.
- Not deployed and not runtime-tested. Schema remains unapplied and connection disabled pending Meta verification. Do not merge this PR until browser, backend, data protection and role tests pass.

## Follow-on preview refinement (26 October)
- Single-business-number **Settings → WhatsApp Business** preview now shows connection state, manager-only E.164 number and Meta IDs, and a manual **Disable sending** control. The number is verified server-side against Meta; the UI never asks for or stores an access token.
- In-order WhatsApp button uses the CRM's exact sheet ID via the existing optional Birthday Club bridge when available. Where that bridge is unavailable, it uses the most recently clicked order's explicit UUID; when no reliable ID can be found, the button is intentionally omitted rather than risking a wrong customer/order. **A first-party order-sheet integration is still required before release to guarantee access from calendar, search, and other entry points.**
- The UI remains an **early preview**, not published or end-to-end verified. This branch does not include the Meta credentials, a verified phone number, or production Edge Function deployment.
- Before rollout, add a role/permission-aware first-party integration with full order navigation, complete connection testing, consent checks, templates and approved customer messaging policies.
