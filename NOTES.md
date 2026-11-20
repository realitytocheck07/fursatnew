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
