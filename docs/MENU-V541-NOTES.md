# Menu v5.41: handoff notes

## Files in this zip (copy over the project, same paths)
- `src/pages/menu.astro`: edited. Added: imports, shared SVG clip paths (`#fk-wave-*`), photo data for the new components, `data-food-theme`.
- NEW `src/components/menu/DrinksShowcase.astro`: Drinks header (elephant mark, bar photo), photo rail, category pills.
- NEW `src/components/menu/FoodGroupHead.astro`: opens each Food group with a photo strip, or a green banner when the group has no photos.
- NEW `src/components/menu/photoFit.ts` and `src/data/photo-focus.json`: place each portrait photo so the dish is visible.
- `src/components/menu/DishRow.astro`: thumbnail now uses the same fit and wavy cut.
- NEW `src/components/menu/menu-wow.ts`: Motion-library animation (parallax, reveals, count-up, 3D tilt, pill highlight, heading rules). Off with Reduce Motion.
- NEW `src/styles/menu-drinks.css`, `menu-food.css`, `menu-wow.css`: styles. `menu-wow.css` ends with a FINAL block that is authoritative for Drinks colours and the "+" buttons.

NOT changed: doors screen, food-on-table scroll, drinks video intro, search, cart, WhatsApp, menu data files.

## Things you can tune
- Food colours: `<main class="mv" data-food-theme="forest">` in menu.astro. Values: `forest`, `saffron`, `burgundy`.
- Drinks colours / button gold: the variables at the top of the FINAL block in menu-wow.css (`--dk-hdr`, `--dk-char`, `--btn-gold-1/2`).
- Photo framing: edit the dish's entry in `photo-focus.json` (cx, cy = where the dish is in the photo, 0-1; z = zoom, 1 = none). Photos without an entry use a safe default.
- Photo shape: the `#fk-wave-*` paths in menu.astro (measured from the reference).

## Known items
- `dish-photos.json`: "Chicken Fry Piece Pulao" maps to a chef portrait and "Ustad Special Nalli Gosht Biryani" to a standee shot. Replace with real dish photos.
- Some CSS rules from earlier iterations remain below the FINAL block in menu-wow.css; the FINAL block overrides them. They can be pruned later.
- The elephant mark in the Drinks header is a drawn placeholder: swap in the real logo SVG.

## QA run (real photos, Chromium)
No sideways scroll at 320/375/768/1024/1440; hero text >= 4.5:1; tap targets >= 44px; no broken images; Reduce Motion shows everything static; no script errors.
