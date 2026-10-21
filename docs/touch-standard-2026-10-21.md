# Touch-friendly standard for the Service Hub (21 October 2026)

Roneel, 3:18 PM: apply the Jack's Restaurants touch-friendly interface standard to the staff app. Visual only: no data,
business rules or steps change. Preview first; live only when he says "deploy". Plan confirmed twice (2:27 PM and
4:07 PM), going out in one release with practice mode (3 guided tasks), the colleague voice and the order labels.

## What changes

Tablets are `(hover: none) and (pointer: coarse) and (min-width: 701px)`. Phones are `(max-width: 700px)`.
Computers are not changed. This was checked element by element at 1366 × 768 and 1920 × 1080 on six screens.

**Text, from the tokens in `src/staff.touch.css`**

| | Tablets | Phones |
|---|---|---|
| Body text | 20px | 18px |
| Labels and secondary text | 18px | 17px |
| Small print | 17px | 16px |
| Section headings | 24px | 21px |
| Page titles | 32px | 26px |
| Large numbers | 34px | 30px |

- Line height is 1.4.
- Main text is #1D2939 or darker, and secondary text is #344054. No pale grey remains.
- Sizes are always `max(old size, token)`, so nothing gets smaller.

**Controls**

| | Tablets | Phones |
|---|---|---|
| Buttons | at least 56px, 18px text | at least 48px |
| Small buttons | at least 52px | at least 48px |
| Icon-only buttons | 54 × 54px | 48 × 48px |
| Filter chips | at least 52px | at least 48px |
| Text boxes and dropdowns | at least 56px, 19px text | at least 52px, 17px text |

- Buttons the app already made taller keep their height (`--cc-keep-h`).

**iPad side menu**
- Always open, with names beside the icons.
- 230px wide upright, 256px sideways.
- Rows at least 60px, with 19px names and 40px icons.
- No fold-to-icons button.

**Phones**
- New order is the big middle button of the bottom menu: Today, Orders, New order, More.
- It is the app's own New order button (`data-tab="new"`), and the top one is hidden.
- Pop-ups open as bottom sheets:
  - full width, with rounded top corners and a drag handle;
  - pulling the handle down closes the sheet, like Close, and typed details are kept as before;
  - Next, Save and the pinned main action stay at the bottom;
  - the height follows the visible screen, including when the keyboard is open (`--cc-edge-height` from the page head's screen-edges script).

**Pop-ups and step screens on tablets**
- 20px text and 24px titles.
- Close always at the top.
- New order step names sit under their numbers and wrap instead of being cut off.

**Animations**
- Windows fade in about 0.2 seconds and no longer slide.

**The website's own code** (from `src/staff.touch-host.html` in the footer, with backup rules in the bundle)
- On tablets and phones, scrolling is normal (the site sets `html { scroll-behavior: smooth }`).
- The page body is not clipped (the site sets `body { overflow-x: hidden }`).
- The site's reveal animation skips the app: `data-no-motion` is set on the app and its parents.
- The app's own `html:has(#cc-staff) { overflow-x: clip }` stays. `clip` makes no scroll box, so iPad scrolling is unaffected, and it stops sideways scrolling.

**Left exactly as it was**
- The Cake Heartbeat in Analytics, which is protected. It keeps its own text settings and colours, and no touch rule reaches inside `#cc-heartbeat`.
- The printed kitchen slip and the photo viewer.

## How it is built

**`build/touch_harvest.cjs`**
- Collects every CSS rule of the app that sets a font size, line height or text colour, from every screen, into `build/touch-harvest.json`.
- Run it again whenever the app's own styles change.

**`build/touch_text.py`** writes `src/staff.touch-text.css` (generated; do not edit by hand):
- One rule per old rule, inside the old rule's own media conditions, with `:root:not(#cc-t0)` in front.
- Each sets the size from a token by its part: small print, labels, body, headings, titles or numbers.
- Pixel line heights become 1.4 (1.2 for headings and numbers).
- Pale greys become #344054.
- It also writes `--cc-keep-h` for buttons the app made taller than the minimum.

**`src/staff.touch.css`**
- Tokens, controls, the iPad menu, pop-ups and step screens, phones, and the website-code fixes.
- Rules start with `html:not(#cc-t1) body:not(#cc-t2)`.

**`src/staff.touch.js`**
- Puts New order in the phone's bottom menu.
- Makes the drag handle close the sheet.
- Sets `data-no-motion`.
- Keeps the touch styles last on the page.

**Build chain**

| Step | Script | Output |
|---|---|---|
| Live old orders | — | `staff-app.2dfb13f213.js` |
| Colleague voice | `build/staff_voice.py` | `05913942e5` |
| Order labels | `build/staff_channel.py` | `360b108d9d` |
| Practice mode and guide | `build/staff_practice.py` | `e52ba7b3d8` |
| Touch standard | `build/staff_touch.py` | `f9f4853c95` (`dist/app/staff-touch-manifest.json`) |

- The builds are deterministic.
- The footer is made by `build/footer_practice.py`:
  - it puts the practice guard and `src/staff.touch-host.html` first;
  - it repoints the app loader;
  - it repoints the finish-step add-on (`src/staff.finish-flow.js`, colleague voice).

## Tests (on the release footer with 40-zero pins)

**Passing**

| Test | Result |
|---|---|
| `test/run_touch.cjs` (new) | 76/76 |
| Heartbeat guard | 80/80 |
| order_flow | 123/123 |
| old_orders | 144/144 |
| practice | 75/75 |
| practice guide | 100/100 |
| form_ease | 46 |
| date_typing | 26 |
| taken_date | 34 |
| connected_journey | 20 |

`test/run_touch.cjs` loads the website's own code (`test/fixtures/host-site*.{css,html}`). On every main screen at three sizes, it checks:
- no small or pale text;
- tap targets;
- text boxes;
- the iPad menu;
- the phone bottom menu and bottom sheets, including the drag handle;
- fades;
- the website-code fixes;
- the Heartbeat kept as it was;
- computers unchanged.

**Not passing (same on the live version)**
- birthday_club: 2 checks.
- flow_polish: stops in the calendar day view late in the day (time of day).

## Rollback

Put back the footer saved in `docs/rollback/` at deploy time, which is the live footer before this release. Then publish.
