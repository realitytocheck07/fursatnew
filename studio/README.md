# Fursat Studio

Where the client edits the Home "What's new" section. Own folder, own `package.json`: it never touches the website build.

## Owner steps

1. **Install**
   ```
   cd studio
   npm i
   ```
2. **Add the project ID.** Copy `.env.example` to `.env`, then replace `TODO_PROJECT_ID` with the real ID from sanity.io/manage (the ID is public, not a secret). Keep `SANITY_STUDIO_DATASET=production`.
   ```
   cp .env.example .env
   ```
3. **Try it on your computer**
   ```
   npm run dev
   ```
   Open http://localhost:3333. Add a draft card named "TEST – delete me" and try the rules (End before Start, a second Pin, a photo with no alt text, an offer with no terms).
4. **Put it online**
   ```
   npx sanity deploy
   ```
   Choose the studio name `fursat`, so it lives at fursat.sanity.studio.
5. **Add CORS origins.** sanity.io/manage → the Fursat project → API → CORS origins → Add. Add each of these, with "Allow credentials" off:
   - `https://fursat.sanity.studio`
   - the Cloudflare Pages preview address (`fursat-preview`)
   - the live domain once it exists
   - `http://localhost:3333` (only for `npm run dev`)

## Other commands

- `npm run check` tests every rule against sample good and bad cards. Needs no project and no internet.
- `npm run build` builds the Studio into `dist/`.

## What the client sees

- **What's new settings** (top of the list): switch the section on or off, change the two headings, set the most cards (1 to 6), keep the built-in cards as a fallback.
- **Active now / Scheduled / Ended**: the cards, sorted by date. **All cards** shows everything, including drafts with no dates yet.
- Each card has a **Card preview** tab.

## Rules the Studio enforces

| Rule | Where |
|---|---|
| End must be after Start | Show until |
| Offers and Wishes must have an End | Show until |
| Offers must have terms | Offer terms |
| At most 1 pinned card (a pinned card that has ended does not count) | Pin to the top |
| Alt text required with any photo | Describe the photo |
| "Real photo" tick required with any photo | Photo tick |
| Photo at least 1200px wide | Photo |
| Title 60, short text 160, button label 24 characters | Counters under each field |
| Button needs a label and a destination (https link only) | Button |

News and Event cards may have no End date; they stay until someone removes them.

## Files

- `schemaTypes/` the two document types (`announcement`, `homeNews`); `rules.js` holds all validation logic.
- `structure/` the left-hand lists. `components/` card preview, counters, logo. `theme.js` Fursat colours.
- `static/fursat-logo.webp` is a copy of `public/assets/c86f49db5a.webp`.
- No tokens or secrets live here.
