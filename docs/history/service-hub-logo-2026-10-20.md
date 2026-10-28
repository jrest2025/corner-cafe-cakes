# White logo on the charcoal bar, and Corner Café Service Hub (20 October 2026)

Roneel: "the logo is dark on daek" (a phone screenshot), then "also its called corner cafe service hub".

Since the semantic colour layer (19 October, `src/staff.semantic-colour.css`) the side menu is charcoal at every
width. On tablets it already had the white logo, but on phones (where the side menu is the top bar) and on the kitchen
screen it kept the black logo, so "corner cafe" and the word under it could not be seen.

Roneel chose "A: white logo" from a preview of both options (white logo on the dark bar, or a white bar), then approved
the Service Hub preview: "Yes, publish both".

Published 20 October 2026, 5:15 PM Fiji (cornercafefiji.com and www.cornercafefiji.com).

## What changed

| Where | Before | After |
| --- | --- | --- |
| Phone top bar, tablet side menu, kitchen screen | Black logo on charcoal (phones, kitchen); CAKES under it | White logo everywhere the bar is charcoal; SERVICE HUB under it in light grey |
| Upright tablets (narrow side menu) | CAKES | SERVICE HUB on two lines, never cut off |
| Sign in, Choose your password | Corner Café Cakes | Corner Café Service Hub |
| Browser tab (staff page SEO title) | Corner Café Cakes – Staff | Corner Café Service Hub |

Not changed, because they are about cakes: the order website, emails, kitchen slips and downloads.

## Release

- `src/staff.semantic-colour.css` (commit `e7a032e`): the charcoal side gets the white logo (the same image tablets use)
  and the name under it in light grey, `rgba(255,255,255,.72)`.
- `build/staff_service_hub.py`: on top of the live DL slip bundle (`staff-app.d46554c3c8.js`), SERVICE HUB under the
  logo, Corner Café Service Hub on sign in, and the name may wrap on narrow side menus. Output
  `dist/app/staff-app.6699cb84d9.js`, SRI `sha384-Tb8Mby11Gqx5IbwHten+zKvtDbtheyoH1sUJJSQ2NHrkrzHL+K9WITAtIPOhRUEh`.
- Staff page footer (`build/footer_service_hub.py`): only the staff app loader line and the colour layer's pinned commit
  changed; read back byte for byte equal; saved as `test/fixtures/staff-footer.html`. jsDelivr served both files
  identical to the repository before publishing.
- Staff page SEO title: Corner Café Service Hub (description unchanged).

## Tests

- `test/run_side_logo.cjs`: phone, tablet, upright tablet, kitchen phone and kitchen tablet: charcoal bar, white logo
  that stands out, SERVICE HUB light grey and not cut off; sign in on phone and tablet: 39 of 39.
- `test/run_semantic_colour.cjs`: 18 of 18. `test/run_heartbeat_guard.cjs` on the candidate: 80 of 80.

## Rollback

- Staff page footer: loader back to `@1b455260411b21920ace44af4a9c503e704071e2/dist/app/staff-app.d46554c3c8.js`,
  SRI `sha384-ujx0z+B8JpyFa1E9VHBIiTNE1KJn/8HExMHxupaoUVoKSMFu4sJ/tGnpT5laS0kU`; colour layer `var sha` back to
  `4741dbb2e6806a9ff3093fd7dc06dd7e1ec7f3a4`; then publish.
- Staff page SEO title back to "Corner Café Cakes – Staff".
