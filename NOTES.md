# Sanity CMS: what was left, and what is still yours

## Already in the code (checked, nothing to build)
- Studio (`studio/`): schemas, desk, preview, Fursat theme. `check-schemas.mjs`: 71 PASS, 0 FAIL.
- Site (`src/lib/cms/*`, `HomeNews.astro`): reads Sanity at build time, falls back to the built-in cards if Sanity is down, empty or the ID is missing. Never fails the build. `news.test.mjs`: ALL PASSED.
- Daily rebuild (`.github/workflows/daily-rebuild.yml`) and the Sanity webhook steps (`docs/cms/OWNER-SETUP.md`).
- GROQ field names match the Studio schemas (cross-checked).
- Project ID `l7nho91v` is the default in the Studio and the site.

## Changed (3 files)
- `src/lib/cms/news.test.mjs`: the "no project ID" test failed because the real ID is now the default. It now sets the placeholder for that one case. Now all pass.
- `docs/cms/OWNER-SETUP.md`: right env names (`PUBLIC_SANITY_PROJECT_ID`, not `SANITY_PROJECT_ID`), ID already set, repo `realitytocheck07/fursatnew`, Pages-project note, and a warning that the 06:00 rebuild only runs from the repo's default branch.
- `studio/README.md`: no more "replace TODO_PROJECT_ID".

## Only you can do these (tokens/logins; I never ask for them)
1. `cd studio && npm i && export SANITY_AUTH_TOKEN=... && npx sanity deploy` (studio name `fursat`), then `unset SANITY_AUTH_TOKEN`.
2. Sanity CORS: add the new Cloudflare domain (and `https://fursat.sanity.studio`).
3. Cloudflare Pages: add `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` for Preview and Production.
4. Cloudflare deploy hook for `design/reference-layout`; Sanity webhook `rebuild-site` (no drafts); GitHub secret `CF_DEPLOY_HOOK`.
5. Make `design/reference-layout` the default branch (or merge to `main`), or the daily 06:00 rebuild will not run.
6. Test with a "TEST - delete me" card (OWNER-SETUP step 9). Invite the client (Editor role).

## Not verified here
No network: Studio opening, the live Sanity fetch, and the webhook chain were not tested against the real project.
## Decisions made
- Did not touch code that already works; only the stale test and docs.


## v5.70 cursor (kit 20b)
(Session notes only. Do not overwrite the repo's own NOTES.md with this file; merge by hand.)

## Done
- Glass is now a real system cursor (hardware, zero lag). Same image, drawn at 39x60 css (2x = 78x120, under the 128px browser limit).
- New files in `public/assets/brand/`: `fursat-cursor.png` (39x60, 1.9 KB), `fursat-cursor@2x.png` (78x120, 3.7 KB), `fursat-cursor-tilt.png` (34x53, 1.9 KB), `fursat-cursor-tilt@2x.png` (68x106, 3.9 KB).
- **Hotspots (css px):** upright **6 16** (was 6.1/17.5 at 42x65, scaled by 39/42). Tilted (links) **7 15** (rotated -7° about the click point; the gold click ring is baked into the tilted PNG, centred on the hotspot).
- `cursor.css`: all rules under `html.fk-cur`. Order: plain `url() x y, auto`, then `-webkit-image-set`, then `image-set`, each with the `auto` fallback (a browser that ignores the image shows the normal arrow). Links/buttons (old HOVER list) use the tilted glass. Text inputs, textareas, selects, iframes, video controls, `.pv` (360 viewer) and `[data-cursor=native]` keep native cursors.
- `fk-cursor.js`: removed the DOM glass sprite, rAF loop, spring tilt, glass popover promote and page-to-page position restore. Kept: `?cursor=native` opt-out, the 3D-table `body.style.cursor` hook (now toggles `html.fk-cur-bl`), and the effects layer `.fk-cf` (popover only for this layer, so it stays above dialogs).
- Bubbles: only when pointer speed > 0.45 px/ms (from pointermove deltas), ≤1 per 70 ms, max 6 alive, spawned at the glass rim (pointer +11–20px right, 2px up). WAAPI transform + opacity, removed when done. Click: 6 gold sparks + gold ripple, same look. No rAF at all, so no idle work.
- Off: touch/coarse, forced-colors, prefers-contrast: more, hover:none. Reduced motion: glass stays, no bubbles/sparks. Hidden tab: no effects.

## Decisions made
- The old press-shrink of the glass (scale .92) can't exist on a system cursor: dropped. The gold hover ring is kept (baked into the tilted PNG).
- Popover/top layer is kept only for the effects layer.
- `fursat-cursor.webp` is no longer used by the cursor code; I could not check the whole repo for other uses. `git rm` it only if a grep finds none.

## Tested (Chromium, small harness page using the real cursor.css + fk-cursor.js)
- Computed cursor: plain = glass image-set, links/buttons/spans inside links = tilted, input/textarea = auto (I-beam), `.pv` keeps its own `grab`.
- 60 fast moves: bubbles capped at 6. Slow moves: 0 bubbles. Click: 6 sparks + 1 ripple, all removed after 1.5 s. Modal dialog open: effects layer still in the top layer. No JS errors (only 404s from the harness serving a different root).
- NOT tested: Firefox/Edge/Safari (not available offline), the real site pages (Home, Menu, Reserve; no build here), 8-width test (no layout changed), Performance panel. System cursors don't appear in screenshots, so none are included. Please check in Chrome + Firefox: glass sits on the pointer, tilted on links, I-beam in fields.

## Files
- changed: `public/js/fk-cursor.js`, `src/styles/cursor.css`
- new: the 4 PNGs above
- delete: nothing required.


## v5.72 email field (kit 23)

## Done
- Optional "Email" field right after Mobile in all 3 table-booking forms. `type=email`, `inputmode=email`, `autocomplete=email`, `autocapitalize=off`, `spellcheck=false`, `maxlength=80`, placeholder `you@example.com`, 16px input text.
- Format check (`x@y.z`) on submit and on blur, empty is fine. Error "Please check the email address." in each form's own error line, with `aria-describedby` + `aria-invalid`. On submit a bad email blocks the send and focuses the field.
- Sending: `email` is added to the `fkForm.send(...)` fields only when filled (Web3Forms reply-to). WhatsApp text gets one line "• Email: …" right after Phone, only when filled.
- **/reserve** (`BookingPanel.astro`): new `#f-email` (envelope icon, same label/box/error markup and classes). Plain `.rs-q` (full width): wraps under Name/Mobile on phone/tablet. In the desktop "hybrid" grid (`reserve.css`) it sits in a new row under Name/Mobile (`"time time email email"`, one new area line + one rule). The left photo/3D box did not move at 1366/1440/1920 (same rect before/after). The panel grows 45–83px.
- **Popup `#fxbook` + Home table request** are the same form: markup in `BookingDialog.astro`, WhatsApp step in `10.js`. Field `#bk-em` added; email is remembered in localStorage key `fz_e` (same style as `fz_n`, `fz_m`). /reserve does not remember name/phone, so it does not remember email either.

## Decisions made
- The popup's labels have no icons, so the popup email label has none either (matches its Name/Mobile).
- "(optional)" uses the same label style as Occasion's "(optional)" on /reserve; in the popup it is muted `#6a5f40`.
- /reserve: email field is full width in the non-hybrid layouts (not a half-width slot) to avoid a half-empty row.
- `reserve.css` (allowed: CSS the form already uses) got 1 area row + 1 rule only.

## Finding (not changed, outside scope)
- The popup form sends the email copy **twice**: `10.js` sends "Table request (home)" and the extra listener in `BookingDialog.astro` sends "Table booking". Both now carry `email`. Suggest keeping one.
- At 1366×634 the /reserve submit button was already below the fold before this change (page scrolls); it is now ~48px lower.

## Tested (offline render with astro-lite on a scratch copy; Chromium)
- /reserve at 390, 768, 1366 (+1024/1440/1920 layout rects): no sideways scroll, email input 45px high, 16px font. Tab order Name → Mobile → Email → Submit. Popup at 390 and 1366: no overflow, Tab Name → Mobile → Email → Date.
- Dry-run payloads (stubbed `fkForm.send`): /reserve and popup/home include `email` only when filled; invalid email sends nothing and shows the error; WhatsApp text has the Email line only when filled. No page errors from the changed code (the harness shows `fkForms is not defined`, from astro-lite not supporting `define:vars`; not related).
- `npm run build` NOT run (no npm here). Please run it. Home page itself could not be rendered offline (top-level await); the popup was tested in a small page with the real `BookingDialog.astro` + `10.js`.

## Files
- changed: `src/components/reserve/BookingPanel.astro`, `src/styles/reserve.css`, `src/components/BookingDialog.astro`, `public/js/10.js`
- screenshots: `screenshots/` (reserve 390/768/1366, popup 390/1366; empty, filled, wrong email)
- delete: nothing.

- Merge fix: removed the duplicate Web3Forms send in BookingDialog.astro; 10.js now sends once, with the honeypot.

## v5.74 Google profile match
- Address, map pin (C9WP+HF3 = 17.44639, 78.38873), phone (main only) and email matched to the Google Business Profile. Review link in site.json address.review: footer link + Home Visit button.
