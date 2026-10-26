# Viber option for Corner Cafe Cake CRM (research and implementation gate)

Date: 26 October 2026

## Verified provider options
Rakuten Viber Business Messages supports one-to-one business messaging, including business-initiated communication with an existing customer database. Viber's developer documentation says businesses wanting to contact users by phone number must use Business Messages through an official partner. New chatbot accounts are commercial-only (since 5 February 2024).

Sources:
- https://www.forbusiness.viber.com/en/business-messages/
- https://www.forbusiness.viber.com/en/messaging-partners/
- https://developers.viber.com/docs/all/

## Planned CRM design
- One **Customer messages** entry inside each cake order and one central inbox.
- Separate labeled WhatsApp and Viber channels with independent account identifiers and provider-specific delivery states.
- Messages must be explicitly linked to the cake order by authorized staff, never inferred from a shared phone number.
- Message content is displayed in the order conversation only after verification of the linkage.
- Viber should have its own manager-only connection settings, enable/disable switch, provider token storage, webhook validation, consent tracking and audit trails.
- **Do not reuse the WhatsApp 24-hour business reply rule for Viber**: apply Viber's actual contractual/provider messaging rules.
- Keep a single active WhatsApp business number globally as already agreed. Viber is an optional *separate* channel, not a second WhatsApp number.

## Current implementation state
- The draft Customer messages interface now labels WhatsApp and explicitly displays Viber as **not connected**. The existing WhatsApp endpoints remain the only messaging backend in the draft.
- Viber is not connected and its API is **not** implemented. Never advertise the Viber tab as functional or attempt sending via an unverified unofficial API.
- No live customer messages have been sent and no production schema changes were made.

## Go-live prerequisites
1. Confirm that Viber Business Messages can be provisioned for Fiji customers through an official partner, including receiving customer replies, pricing, and service-level terms.
2. Obtain approved business account credentials and API/webhook documentation from that provider.
3. Decide retention, consent, message templates, and the appropriate channel when a customer has supplied more than one contact method.
4. Implement a dedicated adapter, independent inbound and outbound logs, order association and permission checks; run provider sandbox tests.
5. Activate only after explicit approval.

Recommendation: finish and validate WhatsApp first while keeping the UI channel-ready; add Viber when a supporting Fiji provider is confirmed.
