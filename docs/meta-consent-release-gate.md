# Corner Café: marketing consent and Meta Pixel release gate

Status: proposed / NOT deployed. Confirmed by site owner 17 October 2026: no cookie banner shown to visitors in a clean private browser window. Global Webflow header currently loads the Meta Pixel and sends PageView without checking an opt-in choice.

## Desired behaviour
- No Meta Pixel script loaded, and no Meta marketing events sent, until a visitor explicitly accepts optional marketing cookies (subject to local legal review).
- Clear, equal-prominence **Accept marketing** and **Reject optional** actions plus a persistent **Cookie settings** link. The site and cake-order form must work when rejected.
- Record consent status locally with version and date; revisit policy updates and allow withdrawal. Store no visitor personal data in marketing consent record.
- On acceptance, initialize existing single Pixel ID 2200870637494171 once; send PageView; allow guest-app ViewContent / InitiateCheckout / Lead events only thereafter.
- On rejection, block initialization; if marketing consent is withdrawn mid-session, block future events and appropriately delete first-party tracking cookies or use provider-recommended revoke process. Ensure no second Pixel or third-party analytics bypass the same choice.
- Do not tag customers by allergy, religious diet, personal cake message, phone, email, names, etc. Confirm event parameters do not contain sensitive fields.
- Distinguish quote request (Lead only) from paid Purchase, which must be based on verified backend financial status and user consent.
- Existing guest-app PR changes must be reconciled with consent gating before release.

## Deployment stages
1. Approve privacy/cookie text and company contact details; legal/privacy review for Fiji and marketing audiences.
2. Inventory external website trackers and Webflow scripts, embedded applications, and any consent manager before replacing global code.
3. Build consent UI and gated Pixel in staging; keyboard and mobile accessible, reject works, stored choice works, withdrawal works.
4. Run browser network tests: clean visit before choice => zero fbevents.js requests / Meta marketing cookies; reject => none; accept => exactly one Pixel initialization and PageView; cake selection/checkout/submission => expected events and correct order IDs; duplicate reload => none repeated incorrectly.
5. Verify application still works under reject, blocked network, ad blockers, browsers, mobile, and without javascript.
6. Confirm test Meta Events Manager receipt and CRM reconciliation. Capture dated evidence.
7. Backup existing scripts; approve publish; publish once; re-test production and log rollback instructions.

## Current architecture
Webflow site 6a0afe25d2f1212db6f93a0e. Registered site script 'MetaPixel' in header currently initializes fbq('init','2200870637494171') and fbq('track','PageView'). Webflow customer cake page /order-cake loads pinned guest-app bundle from GitHub. Draft PR #2 updates event stage timing only, not production.

## QA and signoff
Marketing owner: tracking definitions, copy and resulting business KPIs.
Site/technical owner: code, staging, networking, consent and rollback checks.
Legal/privacy owner: privacy notice and consent legal sufficiency.
Finance/operations: lead-to-confirmed-sale validation.

No privacy compliance claim is made until all checks are recorded.
