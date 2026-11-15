# Studio C1 progress

## Step 1: scaffold + schemas — DONE
- `studio/` with its own `package.json`, `.env.example`, `.gitignore`, `sanity.config.js`, `sanity.cli.js`, `env.js`.
- Schemas: `announcement` (What's new card) and `homeNews` (settings) in `schemaTypes/`.
- All validation logic is in `schemaTypes/rules.js` (plain functions, so the test script runs the same code Studio runs).
- `node scripts/check-schemas.mjs` → 69 PASS, 0 FAIL.

Decisions to confirm:
- **End date:** required for Offers and Wishes only (as in the C1 prompt). News and Events may have no End and then stay until removed. The plan table says "Start / End required"; say if you want End required for every card.
- **Pinned limit** ignores a pinned card that has already ended, so an old pinned card never blocks a new one.

## Step 2: desk structure + preview + branding — DONE
- `structure/index.js`: settings singleton on top, then Active now / Scheduled / Ended, then All cards. Each list shows pinned first, then by Order.
- Card preview: a "Card preview" tab beside the form (`components/CardPreview.js`), plus "Active now / Scheduled / Ended · type · Pinned" under each card title in lists.
- Character counters on title, text, button label, terms.
- Fursat colours (`theme.js`) and logo (`static/fursat-logo.webp`, copy of `public/assets/c86f49db5a.webp`) in the top bar.
- Settings document: can only be edited and published (no create, duplicate, delete).
- Preview rendered offline and checked by eye. `check-schemas.mjs` now 71 PASS, 0 FAIL (includes desk order).
- Config and local imports bundle cleanly with esbuild (Sanity packages left out).
## Step 3: README, test log, final zip — DONE
- `README.md` with the owner steps (npm i, .env, npm run dev, npx sanity deploy, CORS).
- `test-output.log`: 71 PASS, 0 FAIL.
- `npm run build` NOT run here: no network, so `sanity` could not be installed. Owner runs it after `npm i`.
- Not verifiable offline (needs the real project): Studio opening, the Active/Scheduled/Ended GROQ lists on real data, the pinned-card lookup against the dataset, and the theme/logo look. Package versions (`sanity ^3.60`) are from memory, not checked against the registry.

