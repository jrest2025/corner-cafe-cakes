# Fit the screen and wider gutters — 18 October 2026

Approved by Roneel 13:36 Fiji. No small boxes scrolling on their own; side menu fits laptops and iPad landscape; calendar month fills the window (each day shows the cakes that fit plus "+N more"); compact Customers islands; Today and Analytics keep the fitted one-window layout above 1060px tall and scroll the working area once below that; long record lists still scroll inside. Content gutters: 20px phone, 32px tablet, 44px desktop, 64px large monitors.

Release commit 46055353aa012bb37421d3532adf3fe0ed8dbcf5, artifact dist/app/staff-app.5c567cdea4.js, SRI sha384-XLwArW+HVQya6vn9EB2ZecKETyg9gXWn6jqnCQzQJyJXgp6Ws1nRAaVPaouqIUN0. Tests: fit 220 (new, permanent), viewport 40 (rule updated for screens up to 1060px tall), calendar 70, islands 78, Needs attention 171, alignment 132, spacing 115, cleanup 59. Footer read-back matched. Published to both production domains.

Live check on Roneel's 1512x862 window, signed in: no inner scroll boxes on Today, Needs attention, Calendar, Handover, Customers or Analytics; side menu fits; gutters 44px; calendar month fits (90px rows, grid ends at 838 of 862).

Rollback: docs/rollback/staff-footer-before-fit-2026-10-18.html (returns to the calendar and islands release).
