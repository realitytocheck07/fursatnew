# Performance + SEO hardening (phases 1-7)

Nothing here changes how the site looks. Every phase is its own commit.

1. **SEO / indexation**: shorter, consistent page titles ("Fursat Kitchen & Bar", one separator, 65 chars max); BreadcrumbList JSON-LD on inner pages; `robots.txt` disallows `/api/`; `/parties` and `/events` redirect in one hop to `/party/`; every API reply carries `X-Robots-Tag: noindex`; `/api/debug` and `/api/health` accept the owner token as the `X-Debug-Token` header (the `?token=` form keeps working until `DEBUG_ALLOW_QUERY=0` is set in Cloudflare).
2. **Headers**: HSTS, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` (microphone and geolocation stay allowed for Ask Fursat); `/data/*` cached 1 h. No CSP yet: the site uses many inline scripts, so a CSP needs its own pass.
3. **Fonts**: the five self-hosted `.woff` files converted to `.woff2` (lossless, about 18% smaller); CSS and preloads updated. Google Fonts stays: it still serves Cormorant Garamond and the rupee glyph that the self-hosted Poppins files do not contain.
4. **JS pipeline**: `npm run build` now also runs `scripts/optimize-public-js.mjs`: minifies each script in `dist/js`, writes it to `dist/js/h/<name>.<hash>.js`, rewrites every reference, fails the build if one is missed. `/js/h/*` is cached for a year. `public/js` stays readable. `FK_SKIP_JS_OPT=1 npm run build` skips it. `npm run build:raw` is the plain Astro build.
5. **/reserve**: the 3D room starts 3 s after the page loads and only while the tab is visible (a background tab waits until shown). Other pages never load it.
6. **Video**: `<LazyVideo>` + `public/js/lazy-video.js` + `scripts/encode-video.mjs` for the planned per-page clips (poster first, loads near the viewport, poster-only on Save-Data / 2g-3g / reduced motion, one clip plays at a time). Not used by any page yet. The existing hero videos were not touched.
7. **Guards**: `npm run check:seo` (indexation checks on `dist/`) and a GitHub Action that runs build + check on every push.

Not done on purpose (would change the look or needs client data): hero video swap, CSS split, Ask carousel pause button, contrast tweaks, `geo`/`priceRange` in JSON-LD (need real values), removing `originals/` from git.
