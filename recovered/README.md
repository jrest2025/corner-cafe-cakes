# Recovered pinned files (reference only)

Recovered 28 October 2026. **Nothing here is used by any build or by the live page.** The live page (and the
`central/page/` snapshot) still loads these files from their own pinned commits on jsDelivr or GitHub. This folder only
keeps a local copy, because the files are missing from the current tree and the git history in this checkout is
squashed. Do not move them into `dist/` or `src/` without a separate, approved change.

Each file sits at `recovered/<original path>`.

## Source

All six files were fetched read-only on 28 October 2026 from `raw.githubusercontent.com` (the fallback source the
loaders use). jsDelivr was refused by this environment's network proxy (HTTP 403).

| File | Pinned commit | Source URL | Referenced by |
|---|---|---|---|
| `dist/analytics/approved-dashboard-stable.js` | `3fb6a2e1f548bbf0de6b5796eb76aa432931111e` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/3fb6a2e1f548bbf0de6b5796eb76aa432931111e/dist/analytics/approved-dashboard-stable.js | `central/page/page-footer.html` (`cc-heartbeat-loader`), `docs/history/rollback/*` |
| `dist/analytics/approved-dashboard-stable.css` | `3fb6a2e1…` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/3fb6a2e1f548bbf0de6b5796eb76aa432931111e/dist/analytics/approved-dashboard-stable.css | same |
| `src/staff.customer-directory-v3.js` | `17e9a1396eb653f157d3ea51491bf1793ae7e7da` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/17e9a1396eb653f157d3ea51491bf1793ae7e7da/src/staff.customer-directory-v3.js | `central/page/page-footer.html` (`cc-customer-directory-loader`, release `20261019-r2`) |
| `src/staff.customer-directory-v3.css` | `17e9a139…` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/17e9a1396eb653f157d3ea51491bf1793ae7e7da/src/staff.customer-directory-v3.css | same |
| `src/staff.calendar-dashboard.js` | `fe3704f76a03a2391819630318230dca0f7541a5` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/fe3704f76a03a2391819630318230dca0f7541a5/src/staff.calendar-dashboard.js | `central/page/page-footer.html` (`calendar-dashboard-loader`) |
| `src/staff.calendar-dashboard.css` | `fe3704f7…` | https://raw.githubusercontent.com/jrest2025/corner-cafe-cakes/fe3704f76a03a2391819630318230dca0f7541a5/src/staff.calendar-dashboard.css | same |

Primary (jsDelivr) URLs used by the page: `https://fastly.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@3fb6a2e1…/dist/analytics/approved-dashboard-stable.{js,css}`,
`https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@17e9a139…/src/staff.customer-directory-v3.{js,css}`,
`https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@fe3704f7…/src/staff.calendar-dashboard.{js,css}`.

## Hash check

- **SRI:** the page loads these six files with `fetch()` and no SRI or checksum, so there was no published hash to
  check against. (The only SRI in that footer, `sha384-heG0…`, belongs to the main bundle `staff-app.61d3858119.js`.)
- **Git blob check: all six PASS.** Each file's `git hash-object` equals the blob SHA that the GitHub API reports for
  that path at the pinned commit, so these are byte-for-byte the pinned versions.

| File | Bytes | Git blob (matches GitHub) | SHA-256 | SRI sha384 (for future pinning) |
|---|---|---|---|---|
| `dist/analytics/approved-dashboard-stable.js` | 49,376 | `64d61e66e965e2a4cf5a1c48dde6e419386cad05` | `d6a1a9cb49dcbe580f111d02b3fed846712829029dc2317b52a0e0c6e940fc1f` | `sha384-6l2rcXRnRxP3kyr+we2pTsyWbWv1CTdATFdlh5g16S1w+wKs9/V/eJwjNyAVVztu` |
| `dist/analytics/approved-dashboard-stable.css` | 19,337 | `6cbcc8326dfa2d7484cfe2c09f49dd7b669d8083` | `4caf399356af4d5aa8902de6f4e1787049af841fbf126e4532bdf596b9668e29` | `sha384-JMqinOaTdGNhWIb33vDdDiEg/zhjrBkWCe30eUIQbxuC/T4Omab1YlvKh5ALIhbL` |
| `src/staff.customer-directory-v3.js` | 16,142 | `b08f4728db5d58f40ae725a120f0d41bd6e7fe22` | `865c8a1838e2da961f50f3a8304ff1906193345c4811d6c9a6950d52570a82da` | `sha384-U9vj3w/yycgWOZlul6Ob6H4HlN5PmB8lMz+YZ2KNX21hCK5eBNh/67RFQ8MXlgCz` |
| `src/staff.customer-directory-v3.css` | 9,241 | `5b9b9b2241c3d5c3df2617f7afef220a13caa49e` | `b29376c9f0110cce6d75f59634ee3b662d727d68f32e758564e0837195b51639` | `sha384-14zC7cBLar18AjxEyulQZC0FOVVLOQFJyFruMRVM3g3n0cF7Xl4x3/aoLHwaSYDJ` |
| `src/staff.calendar-dashboard.js` | 3,954 | `3150caab7d8ad247bb488c06af8333ee5856064a` | `97945acf7ed80f6f7ab40a3e5d4258a8021b70fd1faeb7a636d7eb69b9cc2dfe` | `sha384-O0/wHBjLjGnWgKDSzcHRydgMIomKqZSt+9KnUb6Rwl1F5oKWJgDaifoK11RzSwOm` |
| `src/staff.calendar-dashboard.css` | 24,172 | `c30fec9b4b3dcc489cf6ad85550741efbea3812d` | `99f86dc6d3ff0bd0429b08541c007880f9ad8d6a059799c963bda86d6e18d89f` | `sha384-XNDBshDXALlZuWWPXMKYhn3kTHXoAsXRcmWJyJTIxvRCdWUbqUgppD61wDXTtl17` |
