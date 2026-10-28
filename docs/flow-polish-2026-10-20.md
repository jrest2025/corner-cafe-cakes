# Flow polish (20 October 2026)

Published to cornercafefiji.com and www.cornercafefiji.com on 20 October 2026.

- Calendar day view: two or more empty hours in a row fold into one line ("2:00 PM – 5:00 PM · No orders · Show"). Tap to show them.
- Times stay on one line.
- Phones: the top bar shrinks once the page is scrolled and returns at the top.
- Small phones (360px): header and calendar title stay inside the screen.

Presentation only; no data, rules or actions change.

## Release

- Bundle: `dist/app/staff-app.8d34463493.js` at commit `003f92a473eedd55dd31c4a4adb1ce155c17fa3a`
- SRI: `sha384-D6L/sUYXTgE60eePgYd3irUkfbhqDX/VlJDQBFrU040gpCKsWyvXMfuwgClewjOg`
- Built by `build/staff_flow_polish.py`; tests `test/run_flow_polish.cjs` (46 checks), plus 22, 34 and 85 regression checks.

## Rollback

In the staff page footer loader, set
`f="gh/jrest2025/corner-cafe-cakes@564041730cc716ea8ed5810382361c50a76504c4/dist/app/staff-app.e1af4eff0a.js"` and
`k="sha384-kqM+timcL7VoPp3Kq6/9RNItdWoEaOOxJw2ej/ozs/0ezTl2JWz00VC1PfBacCsw"`, then publish.
