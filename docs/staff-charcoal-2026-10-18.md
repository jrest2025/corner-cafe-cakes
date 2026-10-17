# Staff CRM charcoal interface — 18 October 2026

Replaces brand green on the sidebar, primary controls, selected tabs, calendar selection, tablet entry and analytics emphasis with charcoal greys. Retains labelled navigation icons, dollar payment icons, cake/date/clock icons and customer hearts. Payment, warning, allergy and favourite colours retain their semantic meanings.

CSS-only append to the exact previously published staff-app.bf7ec46675.js. Its bytes remain an unchanged prefix. No application logic, API, permissions, schema, content or dimensions changed.

Validation: 132 responsive alignment checks, 47 payment/favourite checks, 40 viewport-fit checks, and dedicated charcoal colour/icon checks. Local browser tests use invented records and block remote requests. Desktop Today and Analytics fit 2560×1440 through 1366×768; internal long lists remain scrollable. Signed-in production rendering is not available in this environment.

Rollback: restore docs/staff-charcoal-rollback.footer.html to the staff page footer and republish both production domains.
