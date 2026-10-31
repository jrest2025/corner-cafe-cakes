# Cake CRM add-on audit, 31 Oct 2026 (look only)

Measured live in Roneel's Chrome (desktop), two passes per screen, Long Animation Frame attribution.

## What is on the page
- About 91 scripts load on the staff page; about 50 page watchers (MutationObservers): main app bundle 23, polish 10, the rest spread over add-ons.
- Sources: page head (24 blocks), page footer (25 blocks), site head/footer, 15 registered page scripts, loader 79 (16 files), Vercel main bundle (2.1 MB).

## Where the time goes (busy time per screen change)
- Customers: about 0.55 to 0.65 s; mostly the app redrawing the table plus polish rearranging it; 60 to 70% is forced layout (scripts reading the page while others are still changing it).
- Analytics: about 0.75 to 1.3 s; the analytics stable bundle (138 KB) leads, then analytics-focus, polish, customer workspace.
- Handover right after Analytics: 1.25 s, of which 0.9 s is the analytics bundle still working after leaving Analytics.
- Order popup: about 0.26 s; app plus polish.
- Kitchen, Orders: near zero on a second visit.

## Found
1. Loaded twice: staff.seasonal-heartbeat.js (commits e04dc4fc and 70e87f0e); cake lead-time chart (old copy via head cc-lead-view-loader at 595c7f9 and new copy via loader).
2. Replaced but still running: site footer cc-today-ops-v4-runtime (replaced by __ccSteady20261031); settle code in polish (now unreachable).
3. Analytics add-ons keep working after leaving Analytics.
4. Many add-ons each watch the whole page and react to every change; reads and writes interleave (forced layout).
5. 19 Oct customer layers (empty-reminder-collapse, header-consolidated, drilldown v2, overview live fix, table hero, cockpit unified) overlap with customer directory v3, customer workspace and polish customers().
6. 28 Oct ChatGPT layers (cake_today_card_breathing_room, structural_redesign, content_layout, overview_focus_refinement, business_intelligence_addon, analytics_cockpit_navigation) overlap with site footer Today v3/v4 CSS and polish.
