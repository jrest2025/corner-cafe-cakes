# Staff CRM charcoal interface — 18 October 2026

Replaces brand green on the sidebar, primary controls, selected tabs, calendar selection, tablet entry and analytics emphasis with charcoal greys. Retains labelled navigation icons, dollar payment icons, cake/date/clock icons and customer hearts. Payment, warning, allergy and favourite colours retain their semantic meanings.

CSS-only append to the exact previously published staff-app.bf7ec46675.js. Its bytes remain an unchanged prefix. No application logic, API, permissions, schema, content or dimensions changed.

Validation: 132 responsive alignment checks, 47 payment/favourite checks, 40 viewport-fit checks, and 27 charcoal colour/icon checks. Local browser tests use invented records and block remote requests. Desktop Today and Analytics fit 2560×1440 through 1366×768; internal long lists remain scrollable. Signed-in production rendering is not available in this environment.

Rollback: restore docs/staff-charcoal-rollback.footer.html to the staff page footer and republish both production domains.

Published artifact commit: 82c5437e04b56a5d1dd69606c09c5354a883b65b. Footer read back exactly and immutable CDN bytes matched the tested 1,112,271-byte artifact before publication.
Both production domains confirmed published at 18 October 2026, 09:23 Fiji (2026-10-17T21:23:16.182Z). Festive page remains a draft.
