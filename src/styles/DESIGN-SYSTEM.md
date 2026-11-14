# FURSAT design system (Phase 4A) — in `fk-tokens.css`, section "v5.18"
Add-only. No page uses it yet. Phase 4B swaps pages over using the map below.

## Type (min 12px, Poppins text, Playfair headings)
Tokens: `--fk-fs-1..7` = 12 / 14 / 16 / 20 / 28 / 40 / 64, `--fk-fs-hero` = clamp 40→64.
Classes: `fk-ty-hero` (40→64), `fk-ty-h2` (28 phone, 40 desktop), `fk-ty-h3` (20 / 28),
`fk-ty-h4` (20), `fk-ty-body` (16), `fk-ty-small` (14), `fk-ty-label` (12, caps).

## Buttons (always with `fk-btn`)
`fk-btn fk-btn--primary` green · `fk-btn--secondary` outline · `fk-btn--ghost` text + arrow (it adds its own arrow: no svg).
Size: default 48px, add `fk-btn--md` for 44px. Add `fk-btn--on-dark` on solid dark green or a dark scrim (primary turns gold).
Poppins 600, pill, one green `--fk-btn-green` #14301c. Focus ring, hover, press, disabled, reduced motion are built in.

## Card
`fk-card` (wave card) is the one card. Only addition: `fk-card fk-card--text` for an item with no real photo.

## 4B map: old button class -> new
| Old | New |
|---|---|
| fk-btn--solid, hb--pri, pill (Home hero), rs-btn, rs-btn-solid, rs-btn-book, rs-submit, rs-cta, bk-go, wz-go, fom-submit-btn, fom-reserve-act, rl-reserve, nf-btn, pa-wa, bq-submit, ct-submit | `fk-btn fk-btn--primary` |
| fk-btn--line, hb (outline), rs-btn-line, nf-btn--line, fom-wa-act | `fk-btn fk-btn--secondary` |
| hb--ghost, fx-ghost, md-btn--ghost, hs-all, rl-ig | `fk-btn fk-btn--ghost` |
| fk-btn--gold, pv-btn (on photo/dark) | `... fk-btn--secondary fk-btn--on-dark` (or primary) |
| rs-btn-sm, rs-sbtn | add `fk-btn--md` |
| mv-btn, md-btn, cc-btn, af-btn (10.js, 04.js) | check per page: primary or secondary |
Not buttons, keep as chips (only raise to 12px min): mv-pill, af-pill, rs-mpill.

## 4B map: old card class -> new
| Old | New |
|---|---|
| hs-card (Home), ct-card, ct-stat-card, mv-card, pk-face (Party) | `fk-card` (no photo: `fk-card--text`) |
| rs-xcard, rs-mcard, rs-card-in | already inside `fk-card`: drop the extra skin |
| bq-gal-card, hw-tile, ig-card, pb-sum-card | decide in 4B (photo tile / form widget) |

## Notes for 4B
- Home does not load `fk-tokens.css`: 4B must import it there.
- After pages move, delete old `fk-btn--solid|line|gold` and the base `.fk-btn` serif/46px rules.
- Class names above are from templates; confirm each one on its page before swapping.
