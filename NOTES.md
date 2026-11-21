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


## v5.75 vlog videos (kit 21)
# NOTES v3 — full-frame shots (no black bands)
Change vs v2 (everything else kept: 1.6 s grid, 20.8 s, push-in 3–5 %, grade values, plain slow-mo, shimmer, sizes, Story code, credit, no audio):
- **Every shot now fills the whole 720×1280 frame.** Each shot takes a 9:16 window of the clean crop at full clean height (a: 551×980 inside y≥300; b: 377×670 inside y≥370) and scales it up (1.31× for a, 1.91× for b), so nothing from an overlay area can enter and no band or backdrop is needed. The old blurred/dark backdrop is removed from the vertical video. Push-in works inside that window.
- Window position (sideways, inside the clean crop): logo wall 60 % (keeps the round logo), café 50 %, pour 50 %, booths 55 %, bartender 50 %, plates 50 %, sofa 15 % (keeps the statue), elephant art 50 % (trunk + glass both in). No shot lost anything important, so no brighter blurred copy was used.
- Trade-off: the sides are cropped (a-shots lose ~23 % of the width, the elephant shot ~35 %) and the upscale is a bit softer, most on the elephant shot (the only clean vlog-b footage is small).
- **16:9:** the vertical video in the centre now fills 720 px height with no bands; the blurred, darkened sides (unchanged encode.sh) are brighter than in v2 because they are made from the filled frames.
- Sizes: 720.mp4 2.28 MB, 720.webm 1.91 MB, 16x9.mp4 1.99 MB, 16x9.webm 1.36 MB, posters 26 KB / ~18 KB; no audio stream; 20.8 s.
- Checks: 2 fps contact sheets of both mp4s (`docs-vlog/`), every cell looked at: no bands, no @handle/MINI VLOG/sticker/icon. Story section code is unchanged (same file names and sizes class), so the v2 Story check at 390/1366 still applies.
- Files changed vs v2: public/assets/video/inside-fursat-{720.mp4,720.webm,16x9.mp4,16x9.webm,poster.webp,poster-16x9.webp} · video-src/inside-fursat/build.py · docs-vlog contact sheets.
- git: `git add -f public/assets/video/inside-fursat-720.mp4 public/assets/video/inside-fursat-16x9.mp4`

---
# NOTES v2 — Inside Fursat video (vertical + 16:9), 4 improvements (v5.71)

Scope: only the Inside Fursat video was changed. Story section code, the 5 tour clips (names + files), the credit line, no audio, no overlay text/handles are untouched. Skipped on request: grain, light leak, title tweaks, backdrop changes.

## Decisions made
- **Tooling:** HyperFrames CLI starts here but cannot render (no Chrome headless shell, no network to download it). Same pipeline as v1: `index.html` (HyperFrames-style scenes: title + end card, `seek()` deterministic) → Playwright frames (`render_cards.py`) → ffmpeg (`build.py`, `encode.sh`). Re-render: `python3 -I render_cards.py <cards>` → `RAW=<raws> python3 -I build.py <cards> master.mp4` → `./encode.sh master.mp4 <out>`.
- **1. Push-in (Ken Burns):** every footage shot zooms 3–5 % over its own length (3.0 / 3.5 / 4.0 / 4.5 %), centred, inside the clean crop (so it never reveals an overlay area). `zoompan` on a 2× upscale = no pixel jitter. The title plaque and the end card do not zoom.
- **2. Beat grid:** cuts at 3.2, 6.4, 8.0, 11.2, 14.4, 16.0, 17.6, 19.2 s (all multiples of 1.6 s); end card 19.2–20.8 s. Total **20.8 s** (was 21.0). Shots (cut to cut): logo wall 3.2 · café counter 3.2 · dessert pour 1.6 · red mural booths 3.2 · bartender 3.2 · food plates 1.6 · sofa + statue 1.6 · elephant art 1.6 · end card 1.6. Dissolve 0.32 s (8 frames, was 0.3 s) centred on each cut so the cut frame is the beat. v1 had a hidden jump cut inside the "dessert" shot (source cut at 27.1 s); v2 stays inside one source shot everywhere (checked with scene detection).
- **3. Colour match:** per-shot curves (gamma on RGB + light black lift, values tuned by measuring Y/U/V) on the two dark shots: bartender gamma 1.5 (Y 70.6 → 91.5 before vignette) and dessert pour gamma 1.6 (Y 66.8 → 92.8), saturation +8–10 %. vlog-b elephant shot: stronger warm balance (V 128.5 was cooler than the a-shots at 134–139; now 134.8) + gamma 0.72 (it was far brighter, Y 121 → 95.5). All other shots keep the v1 light warm grade only. Measured on the final mp4 (fg area, after vignette): logo 94 · café 78 · pour 83 · booths 74 · bartender 76 · plates 80 · sofa 102 · elephant 78 (V 131–139 everywhere except the logo-wall shot 128).
- **4. End logo shimmer:** one gold sweep (`#E0A63C` → `#F6E0A0`, 105° band) across the elephant + wordmark only (CSS mask of the two logo images), ease-in-out, 0.56–1.44 s into the end card, no scale, no bounce, then the logo holds still. Rest of the card unchanged.
- **Slow-mo:** v1 used motion interpolation (`minterpolate`, 2× on the elephant shot). v2 uses **plain slow-mo** only (setpts + fps, no interpolation): logo wall 1.10×, elephant art 1.71×. Frame-by-frame check: see Checks.
- Elephant art: the clean close-up in vlog-b is only b 18.17–19.29 s (1.1 s); at 1.6 s it needs 1.71× plain slow-mo, which is why it is a 1.6 s shot, not 3.2 s.
- 16:9 poster re-made from the new first frame.

## Files changed (repo paths)
public/assets/video/inside-fursat-{720.mp4,720.webm,16x9.mp4,16x9.webm,poster.webp,poster-16x9.webp} · video-src/inside-fursat/{index.html,render_cards.py,build.py,encode.sh} · docs-vlog/{montage-contact-sheet-2fps,16x9-contact-sheet-2fps,slowmo-frames}.png · screenshots/story-iv-{390,1366}.png
Nothing to `git rm`.

### git add -f (mp4 is gitignored)
git add -f public/assets/video/inside-fursat-720.mp4 public/assets/video/inside-fursat-16x9.mp4
git add public/assets/video video-src

## Checks
- **Sizes (final):** inside-fursat-720.mp4 **2.26 MB** (≤2.5), 720.webm 1.93 MB, 16x9.mp4 1.85 MB, 16x9.webm 1.36 MB, poster.webp 27 KB (≤80), poster-16x9.webp 18 KB. All 20.8 s, 25 fps, **no audio stream** (ffprobe: video only).
- **Overlay check:** 2 fps contact sheets of both final mp4s, every cell looked at: no @handle, MINI VLOG, sticker or icon (only our title plaque and the Fursat logo). Sheets: `docs-vlog/montage-contact-sheet-2fps.png`, `docs-vlog/16x9-contact-sheet-2fps.png`. Push-in zooms inward inside the clean crop, so it cannot bring an overlay area in.
- **Slow-mo, frame by frame (final encode):** two slow shots, both plain slow-mo now: logo wall 1.10× and elephant art 1.71×. Consecutive frames of both (`docs-vlog/slowmo-frames.png`) show no warping and no ghosting; frame-to-frame differences are a steady duplicate-frame pattern (no blended frames, which is what interpolation would give). v1's `minterpolate` slow-mo was removed. Kept both shots.
- **Beat grid:** by construction (build.py asserts every cut is a multiple of 1.6 s): 3.2, 6.4, 8.0, 11.2, 14.4, 16.0, 17.6, 19.2 s; end card 19.2–20.8 s.
- **Shimmer:** checked frame by frame in the end-card sequence: the gold band passes over the elephant and wordmark only (mask), one pass, logo stays still, no bounce.
- **Story section (isolated page: the section's own markup + CSS + `lazy-video.js`, headless Chromium) at 390 and 1366:** phone loads only the vertical webm, desktop only the 16:9 webm, both play muted + loop; layout shift (CLS) 0; video box 343×610 (390) and 980×551 (1366); no sideways scroll at 320, 375, 390, 768, 1024, 1366, 1440, 1920; credit link 44 px tall, 13 px text. The hidden variant's small poster (17–27 KB) is still fetched by the browser (as in v1). Screenshots: `screenshots/story-iv-390.png`, `screenshots/story-iv-1366.png`.
- `src/pages/story.astro`, `spaces.js` and the 5 tour clips are unchanged, so the 360 view was not re-tested. Not tested offline: the full Story page and web fonts (as in v1); please look at Story once on the real build.

---
# Earlier notes (v1, still valid for everything not listed above)
## v1: TASK VLOG-CLIPS

## Decisions made
- Overlays found by OCR at 2 fps over both reels (all positions are in source pixels).
  - **vlog-a (720×1280):** the "📍Fursat, Hyd" sticker is fixed at x≈225–520, y≈205–280 for the whole reel. Global crop: **y ≥ 300** (keep y 300–1280, full width). A 3:4 window = 720×960 at y 300–1260.
  - **vlog-b (576×1040):** "MINI VLOG" at x 245–330, y 94–125 → crop **y ≥ 135**. The "@FRAMESOFHYD" handle + Instagram icon moves per shot: right side (x 378–545, y 250–330) in 2.5–4.5s and 17.5–23.5s; bottom-left (x 60–205, y 695–770) in 10–15s and 25–28.5s; big centred end card 29–33s.
- Logos of the Fursat brand and the shop signs are not overlays, kept.
- Dropped for prices: b 21–23s (buffet banner shows prices that are not in `food.json`/`party.json`).
- Mirrored text (b 27–29s), end card (b 29–33s), "CAPTURE MOMENT" overlay on the sign (b ≥1.0s), letterboxed dessert (a 22–24.5s) are dropped.
- Audio stripped in every output. Credit line "Video: @framesofhyd" under the Story video.

## Shot log (step 1)
| id | file | in–out (s) | crop box (x,y,w,h) | use | notes |
|---|---|---|---|---|---|
| A1 | a | 0.0–3.5 | 0,300,720,960 | B (café) | counter + ceiling lights, clean |
| A2 | a | 4.0–5.9 | 0,300,720,960 | **cafe.mp4**, B | cake/dessert display, clean |
| A3 | a | 6.0–9.5 | 0,300,720,960 | **table-for-two.mp4**, B | food plates, hands visible (ok) |
| A4 | a | 10.0–13.5 | 0,300,720,960 | **high-tables.mp4**, B | red mural wall + booths |
| A5 | a | 14.0–16.5 | 0,300,720,960 | **bar.mp4** | bar counter, logo wall |
| A6 | a | 17.0–21.5 | 0,300,720,960 | B | bartender silhouette, moon light |
| A8 | a | 25.0–26.9 | 0,300,720,960 | B (cocktail) | dessert sauce pour |
| A9 | a | 27.0–30.5 | 0,300,720,960 | B | hands + dessert |
| A11 | a | 32.0–34.3 | 0,300,720,960 | B | sofa + statue |
| B1 | b | 0.0–0.9 | 0,135,480,640 | entrance candidate (short) | Fursat Café sign; only the IG icon at x>490 → cropped; text from 1.0s |
| B3 | b | 5.0–6.9 | 0,135,576,768 | B (guest) | guest at table, faces ok |
| B5 | b | 8.0–9.95 | 0,135,576,768 | **entrance.mp4**, B | hall → logo arch (red wall); handle starts at 10.0 |
| B8 | b | 16.0–17.4 | 0,135,576,768 | B | two dessert glasses |
| B9 | b | 17.5–20.0 | 0,340,576,700 | B (ending) | elephant-with-cocktail art; handle sits above y 330 |
| B12 | b | 23.0–24.4 | 0,340,576,700 | B | hall wide |

Dropped: b 2.5–4.5 (arch, handle on right, can't crop cleanly), b 10–15.5 cocktail (handle at bottom-left next to the glass), b 21–23 (prices), b 27–33, a 22–24.5.

Contact sheets (1 fps): `docs-vlog/contact-sheet-vlog-a.png`, `docs-vlog/contact-sheet-vlog-b.png`.

## Next
Step 2 (5 tour loops), step 3 (montage + Story), step 4 (checks).

## Part A done (step 2)
- 5 clips 540×720, 25 fps, H.264 main +faststart, no audio, light warm grade (`colorbalance rm+.03 bm-.03, contrast 1.02, sat 1.04`). Loops: xfade 0.4s of the end into the start. Slowed 1.3–1.8× (motion-interpolated) where the clean shot was short.
- entrance: b 7.2–9.2 s, crop 506×675 @ (35,365) → hall pan from the ceiling lights. The Café-sign shot is clean for only 0.9s (then "CAPTURE MOMENT" overlay), and the arch shots carry the handle, so they were dropped. Decision: use the hall pan (kept the old tag idea short and true).
- bar: a 14.0–16.95; high-tables: a 10.0–13.8; cafe: a 4.0–5.95 (slow 1.8×); table-for-two: a 6.0–9.9.
- Tags changed in `spaces.js` CLIPS: entrance "The hall, from the entrance", bar "The bar counter, on video", high-tables "The red mural wall and booths", cafe "Cakes at the café counter" (table-for-two unchanged).
- Correction to step-1 log: b handle also shows at top-right (y≈250–350, incl. a small credit line under it) in 7–9s. So b crops use **y ≥ 365** (B5, B9, B12), not 135/340.
- OCR on every output frame (4 fps): no handle/MINI VLOG/sticker text found.
- Sizes: entrance 184 KB, bar 255 KB, high-tables 234 KB, cafe 221 KB, table-for-two 260 KB.

### git add -f (mp4 is gitignored)
git add -f public/assets/tour/clips/entrance.mp4 public/assets/tour/clips/bar.mp4 public/assets/tour/clips/high-tables.mp4 public/assets/tour/clips/cafe.mp4 public/assets/tour/clips/table-for-two.mp4

## Part B (step 3)
- **Tooling:** the HyperFrames CLI could not run (`npx` needs the npm registry; network is off here) and Remotion needs it too. Decision: `video-src/inside-fursat/` is a HyperFrames-style HTML composition (`index.html`: `class="clip" data-start data-duration`, deterministic `seek()`), rendered frame by frame with Playwright (`render_cards.py`), then cut and encoded with ffmpeg (`build.py`, `encode.sh`). To re-render: `python3 -I render_cards.py <cards>` → `RAW=<raws> python3 -I build.py <cards> master.mp4` → `./encode.sh master.mp4 <out>`.
- **Edit (21.0 s, 75 bpm grid, 0.3 s dissolves, one effect: soft vignette; light warm grade as Part A):** logo wall (title card "Inside **Fursat**" over it, cream plaque, Playfair, Fursat in #2a5019) → café counter → dessert pour → red mural booths → bartender → food plates → sofa + statue → elephant-with-cocktail art → 1.5 s end card (cream, Fursat elephant + wordmark from `public/assets/brand`).
- Layout: each clean crop sits at full width over a blurred, darkened copy of itself (the clean areas are not 9:16, so no upscale-crop of soft pixels).
- Dropped from the montage: both vlog-b guest/dessert-glasses shots (the @handle shows in frame), everything in vlog-b except the elephant art. Some a-shots overlap the 360 clips in time (booths, bar logo wall, plates): the only clean footage of those places.
- Files: `inside-fursat-720.mp4` 2.47 MB, `-720.webm` 1.9 MB, `-16x9.mp4` 1.83 MB, `-16x9.webm` 1.30 MB (16:9 = vertical video centred over a blurred darkened copy), `inside-fursat-poster.webp` 27 KB (first frame), plus an extra `inside-fursat-poster-16x9.webp` 16 KB for the desktop video.
- `story.astro`: new `.iv` section right after "A look around": `<LazyVideo>` ×2 (phone vertical `.iv-v`, desktop 16:9 `.iv-d`, CSS switch at 768px, hidden one never loads), cream bg, max 980px, credit "Video: @framesofhyd" → https://instagram.com/framesofhyd. Added one import (`LazyVideo`). No other change.

### git add -f
git add -f public/assets/video/inside-fursat-720.mp4 public/assets/video/inside-fursat-16x9.mp4
(webm/webp are not ignored but add them too: `git add public/assets/video video-src`)

## Checks (step 4)
- Sizes: tour clips 184–260 KB (≤300). `inside-fursat-720.mp4` 2.47 MB (≤2.5), webm 1.9 MB, 16x9 mp4 1.83 MB / webm 1.30 MB, poster 27 KB (≤80), 16:9 poster 16 KB. All outputs have **no audio stream** (ffprobe).
- Overlay check: OCR at 4 fps on all 5 clips + both montage mp4s: no @handle, MINI VLOG, sticker or "Hyd" text (only noise glyphs; the title "Inside Fursat" is ours). 2 fps contact sheets: `docs-vlog/montage-contact-sheet-2fps.png`, `docs-vlog/16x9-contact-sheet-2fps.png`, `docs-vlog/loops-sheet.png`.
- Story section tested in isolation (headless Chromium, site tokens + the section's CSS + `lazy-video.js`) at 390 and 1366: phone loads only the vertical file, desktop only the 16:9 file, poster-first, muted loop plays. 8 widths (320, 375, 390, 768, 1024, 1366, 1440, 1920): no sideways scroll, credit link 44 px tall, 13 px text, section 980 px max. Screenshots: `screenshots/story-iv-390.png`, `screenshots/story-iv-1366.png`. Video box has fixed aspect-ratio, so no layout shift from the video.
- **Not fully tested offline:** the whole Story page (the offline Astro renderer cannot draw the page's own pinned desktop layout; AskFab fails to build in it), web fonts (heading showed a fallback font), and the 360 viewer in a browser (WebGL). For 360: all 5 clip files decode (H.264 540×720) and `CLIPS` still parses with all paths present. Please look at Story + Tour once on the real build.
- `fkForms is not defined` in the offline render is from the site's own script, not this task.

## Files (repo paths)
public/assets/tour/clips/{entrance,bar,high-tables,cafe,table-for-two}.mp4 · src/components/tour/spaces.js (tags) · public/assets/video/inside-fursat-{720.mp4,720.webm,16x9.mp4,16x9.webm,poster.webp,poster-16x9.webp} · src/pages/story.astro · video-src/inside-fursat/ (index.html, render_cards.py, build.py, encode.sh, assets/ fonts + logo; raws are not included, 5 MB rule).
Nothing to `git rm`.

### Final git add -f lines
git add -f public/assets/tour/clips/entrance.mp4 public/assets/tour/clips/bar.mp4 public/assets/tour/clips/high-tables.mp4 public/assets/tour/clips/cafe.mp4 public/assets/tour/clips/table-for-two.mp4 public/assets/video/inside-fursat-720.mp4 public/assets/video/inside-fursat-16x9.mp4

- Cache fix: tour clips renamed to *-v2.mp4 (assets are cached 1 year as immutable, so same names would keep the old clips for returning visitors). Old clip files removed with git rm.
