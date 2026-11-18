# FURSAT x Rista POS integration: full plan (A to Z)
_Written 18 Nov 2026 · site `v5.43b` (`ed6a7c8`) + this change (`v5.44`) · source of the code: RR Durbar (`bjnexusai-ai/rr-durabr-api` @ `4a7e0e1`)_
Status words: **DONE** (in the zip, tested with fake Rista data) · **UNVERIFIED** (needs the real Fursat Rista account) · **PENDING**.
**Nothing has run against Fursat's real Rista account yet.** Every Rista reply shape below comes from Rista's official docs and from RR Durbar's account.

---
## 1. Goal
1. Menu on the website matches the POS: **sold-out marks**, then **prices**, then item data.
2. Later: **pickup order + online payment** on `/order` that lands in the Rista POS.
Today `/order` only links to Swiggy and Zomato (`site.json -> order`, `pickup:false`). Menu data is hand-edited (`food.json`, `drinks.json`).

## 2. Where the code lives (decision)
| Phase | Where | Why |
|---|---|---|
| **Phase 1** menu, sold-out, prices (read-only) | **This repo** (`fursatnew`), Cloudflare Pages Functions in `functions/` | One repo, one deploy, no cron or database needed |
| **Phase 2** orders, payment, retries | **New repo `fursat-api`** (a Cloudflare Worker), seeded from `rista-phase2/` | Needs **cron triggers** (retries, unpaid-order expiry, daily payment check) and a **D1 database**. Pages Functions cannot run cron |
**Why phase 2 is not built yet:** a pickup order prints on the kitchen POS. Without phone OTP (or similar) anyone could spam fake orders, and OTP needs an SMS provider; the payment provider is also undecided. Pay-at-pickup-only without OTP is possible but unsafe, so it is deliberately not built until Q1/Q2 are answered.
Create `fursat-api` only when the payment provider is chosen and Rista pickup is switched on.

```
Browser (fursatind.in)
  |  /menu   -> public/js/rista-live.js  --GET-->  /api/menu     (Pages Function, cached 20 s)
  |                                                     |
  |                                                     v   JWT per call, 45 s / 3 min cache, last-good copy 15 min
  |                                              Rista API  https://api.ristaapps.com/v1
  |  (phase 2) /order -> checkout --> fursat-api Worker --> payment provider (webhook)
  |                                        |  D1 (orders, payments, rista_pushes, events) + cron
  |                                        '--> Rista  POST /sale  (+ /sale/payments/offline)
```

## 3. Rista API facts (used by the code)
- Base `https://api.ristaapps.com/v1`. Every call sends `x-api-key: <RISTA_KEY>` and `x-api-token: <fresh HS256 JWT>` (payload `iss`=key, `iat`, `jti`; signed with `RISTA_SECRET`).
- Phase 1 calls (GET only): `/branch/list`, `/branch?branchCode=`, `/catalog?branch=&channel=`, `/stockStatus?branch=&channel=` (backup `/items/soldout?branch=`), `/catalog/enterprise` (dish photos).
- Phase 2 calls (POST): `/sale` (Save sale), `/sale/payments/offline {invoiceNumber}` (tells the cashier to collect at the counter).
- Catalog shape: flat `items[]` + `categories[]`, `itemTags[]` (veg/non-veg comes from tags, Rista has no veg field), `taxTypes[]`. Half/Full = separate items sharing a `groupItemId`, shown as one dish. Rows with type Group/Option/Add-on, or inactive, are skipped.
- Item id used everywhere = `skuCode` (falls back to `itemId`). The menu reply and `/api/prices` use the same ids.
- A dish with no Website price in Rista shows `orderable:false` (visible, cannot be ordered).
- Rista does not push changes, so we ask and cache: sold-out 45 s, menu 3 min, photos 30 min. If Rista is down the last good answer is served for 15 min (photos 6 h).
- Rista's swagger says `POST /sale` needs a unique `sourceInfo.invoiceNumber` and answers **409 on a repeat**; `GET /sale/online/recent` finds missed online orders (phase 2 missed-order check). RR read both in the docs, never verified them on a live account.
- **Unconfirmed even in RR:** Rista rate limits; Rista's online-payment call (paid sales are only tagged `PAID-ONLINE` + "DO NOT COLLECT"); the real shape of `/catalog/enterprise` dish photos.

## 4. What is DONE (in `fursat-v5.44-rista.zip`)
| # | Item | Files | Tests |
|---|---|---|---|
| D1 | JWT signing, Rista GET client, cache with stale fallback | `functions/_lib/rista/{jwt,rista,cache}.js` | JWT signature checked in test |
| D2 | Catalog to menu (variants, veg, sold-out, photos), price index | `functions/_lib/rista/{transform,menu}.js` | menu + sold-out + fallback tests |
| D3 | Routes `GET /api/health`, `/api/menu`, `/api/prices`, `/api/outlet` (open/closed, hours, website channel), `/api/debug` (owner token) | `functions/api/*.js`, `respond.js` | 11 tests incl. outlet + compare: 503 when not configured, no secrets in errors, debug locked, 502 when Rista down |
| D4 | Sold-out overlay on `/menu`, **off** by default | `public/js/rista-live.js`, `menu.astro`, `menu-v2.css`, `site.json -> rista.live:false` | overlay test (marks sold-out rows, survives failed call) |
| D5 | Phase 2 starter code (not wired): exact-paise quote, GST, sale builder + push, retry 1/2/5/10 min, order state machine, D1 migrations | `rista-phase2/` | 51 tests (real migrations) |
| D7 | **Price/name checker** `node scripts/rista-compare.mjs <site-url> [--apply]`: lists price differences, names missing either side, Half/Full items, sold-out; `--apply` writes Rista prices into `food.json`/`drinks.json` (single-price items; review with `git diff`) | `scripts/rista-compare.mjs`, `scripts/lib/` | in the 11 |
| D8 | **Smoke check** `npm run rista:smoke -- <site-url> [DEBUG_TOKEN]` (adapted from RR `tools/verify/smoke.mjs`; GET only): health, debug locked, no secrets in replies, menu/prices/outlet shape, channel found. Run after every deploy | `scripts/rista-smoke.mjs` | run against a local mock: pass |
| D9 | **Owner health** `/api/health?token=<DEBUG_TOKEN>` lists the NAMES of missing settings (never values) | `functions/api/health.js` | in the 11 |
| D10 | Price checker also lists dishes where **Rista has a photo and the site has none** (site shows an "F" tile). Real photos only: look at each by eye, download, never hotlink | `scripts/lib/rista-compare.mjs` | in the 11 |
| D6 | Verified: `astro build` 13 pages; `wrangler pages functions build` compiles 4 routes | | |
Run: `npm run test:rista` and `npm run test:rista:phase2`.
Safe to push: every route returns 503 `not_configured` until the settings in section 7 exist; the overlay is off.

## 5. What is PENDING
### Phase 1 (this repo)
| # | Task | Owner | Blocked by |
|---|---|---|---|
| P1 | Rista: website channel exists (RR used "Website"), items have Website price + tax, stock tracking on | client | Rista access |
| P2 | Set the 5 settings. Easiest: Cloudflare dashboard > project > Settings > Variables and Secrets (Production; encrypt `RISTA_KEY`, `RISTA_SECRET`, `DEBUG_TOKEN`). Or `bash scripts/rista-setup.sh <project>` with `CLOUDFLARE_API_TOKEN` exported (Codespaces cannot complete `wrangler login`). Deploys need no wrangler: Cloudflare builds from GitHub on every push | owner | P1 |
| P3 | `/api/debug?path=/branch/list`: confirm branch code + exact channel name | owner/Claude | P2 |
| P4 | Compare `/api/menu` with the Rista screen; mark a dish sold out, see it within ~1 min | owner | P3 |
| P5 | Align dish names between Rista and `food.json`/`drinks.json` (overlay matches by name slug) | owner/client | P4 |
| P6 | Flip `site.json -> rista.live` to `true`, push | owner | P5 |
| P7 | **Price sync**: run `node scripts/rista-compare.mjs <site-url>`, review, then `--apply` + commit. (Live runtime prices NOT built: the cards feed the "Your Picks" cart, so a static sync is safer) | owner runs, Claude reviews output | P4 |
| P8 | ~~Outlet route~~ DONE (`/api/outlet`). Still to do: show open/closed on the site (Home visit block / `/order`) once the data is verified | Claude | P3 |
| P9 | Real-phone check (iPhone + Android): menu loads, sold-out chip readable (contrast >= 4.5:1), + Add disabled | owner | P6 |
### Phase 2 (new `fursat-api` repo)
| # | Task | Blocked by |
|---|---|---|
| Q1 | **Decide payment**: Pine Labs Online, Rista-linked gateway, or UPI with alert verification (RR used PayU, not reusable as is) | client |
| Q2 | **Safety blocker.** Decide: OTP login (RR used MSG91 + Turnstile) or guest order with phone only; loyalty (RR used Reelo) yes/no | client |
| Q3 | Create repo `fursat-api`, Worker, D1 database, KV; port `rista-phase2/`; write the payment adapter (replaces `payu*.js`) | Q1 |
| Q4 | Routes: `/api/quote`, `/api/slots`, `/api/checkout/start`, `/api/order/status`, payment callback + webhook, admin self-check | Q3 |
| Q5 | Rista online-payment call (record the payment on the sale). Today only the `PAID-ONLINE` tag + note exist | Rista docs / support |
| Q6 | Cron: retries, expire unpaid, daily payment reconcile | Q3 |
| Q7 | Frontend: build the `order.pickup` block on `/order` (TODO is already marked in `order.astro`), use `.fk-*` UI kit, then set `site.json -> order.pickup:true` | Q4 |
| Q8 | Owner alert channel (RR only logs `OWNER ALERT`): WhatsApp/email | Q3 |
| Q9 | Staffed test at the outlet with `RISTA_PUSH_LIVE=true`, `RISTA_PUSH_TEST=true` (orders say TEST ORDER - DO NOT PREPARE); check POS screen + KOT print; then real orders | Q4-Q8 |
| Q10 | Terms/privacy page update: name the payment provider, SMS provider, Rista as processors; refund/cancel policy | client |

## 6. Phase 2 design (from RR Durbar)
**Money rules:** the server prices every cart from Rista (browser never sends a price). Amounts are exact paise; if lines + tax + charges != total, the order is refused. An online order reaches Rista only after the payment provider confirms server-to-server. Pay-at-pickup (limit RR used: Rs 1000) goes to Rista as unpaid.
**Order states:** `CREATED / PAYMENT_PENDING -> PAID -> PUSHED_TO_RISTA -> CONFIRMED`; failures: `PAYMENT_FAILED`, `EXPIRED`, `PUSH_FAILED -> REFUND_NEEDED -> REFUNDED`, `CANCELLED`. Every change is a compare-and-set in D1 (`UPDATE ... WHERE state=?`), so a duplicate callback cannot push twice. The customer sees CONFIRMED only after Rista accepted the sale.
**Retries:** 5 tries at 1, 2, 5, 10 min. Paid order still failing -> `REFUND_NEEDED` + owner alert. Pay-at-pickup -> stays `PUSH_FAILED` + alert (call the customer).
**Safe defaults:** everything ships closed (`ONLINE_ORDER_LIVE=false`, `RISTA_PUSH_LIVE=false`, `RISTA_PUSH_TEST=true`). Emergency stop = set `ONLINE_ORDER_LIVE=false` and deploy.
**Switch-on order:** see `rista-phase2/docs/GO_LIVE_SWITCHES.md`.

## 7. Settings (names only; values are never written in code, chat or GitHub)
**How to set them:** dashboard (simplest) or `scripts/rista-setup.sh` (`wrangler pages secret put`, needs `CLOUDFLARE_API_TOKEN`; `wrangler login` fails in Codespaces). Do NOT add a `wrangler.toml` to this repo: for a Pages project it switches the project to config-as-code and the dashboard settings (e.g. `NODE_VERSION=22`) stop applying. Secrets can never be committed in a config file anyway. Claude cannot run it (no Cloudflare access, and tokens are never shared).

| Name | Kind | Where | Phase |
|---|---|---|---|
| `RISTA_BRANCH` | plain | Pages env | 1 |
| `RISTA_CHANNEL` (default `Website`) | plain | Pages env | 1 |
| `RISTA_KEY`, `RISTA_SECRET` | secret | Pages env (encrypted) | 1 |
| `DEBUG_TOKEN` | secret | Pages env (encrypted) | 1 |
| `ONLINE_ORDER_LIVE`, `RISTA_PUSH_LIVE`, `RISTA_PUSH_TEST`, `COD_LIVE`, `UNPAID_TIMEOUT_MIN` | plain | `fursat-api` wrangler vars | 2 |
| payment keys, `TOKEN_SIGNING_KEY`, `ADMIN_KEY`, SMS keys | secret | `fursat-api` secrets | 2 |

## 8. Security (never break)
- Rista key/secret, debug token, payment keys: only as encrypted Cloudflare secrets, set by the owner. Never sent to Claude, never in code or GitHub.
- `/api/debug` returns raw Rista data (may include prices): locked by `DEBUG_TOKEN`, answers 404 otherwise, `noindex`.
- Error replies never contain keys; phone/email masked in logs (phase 2).
- Phase 1 never writes to Rista.
- **The repo `realitytocheck07/fursatnew` is publicly readable right now. Set it to Private** (handoff section 2 says so).

## 9. Go-live checklist, phase 1
1. Push zip. 2. Cloudflare redeploys; `/api/health` -> `configured:false` is fine. 3. Set the 5 settings, redeploy, `configured:true`. 4. `/api/debug` confirms branch + channel. 5. `/api/menu` matches Rista; sold-out change shows in ~1 min. 6. Names aligned (P5). 7. `rista.live:true`, push. 8. Real phone check. **Rollback:** `rista.live:false` and push (menu returns to the static data).

## 10. Client answers needed (TODO(client))
Rista branch code and channel name · Website prices + tax on every item · stock tracking on · item names to match the website · payment method · pickup rules (slots, minimum prep time, limit for pay-at-pickup) · OTP/loyalty yes or no · who receives owner alerts · cancel/refund policy.

## 10b. What RR Durbar had that was used, adapted, or left (checked 18 Nov)
| RR piece | Fursat |
|---|---|
| Rista client, JWT, cache, transform, quote, sale push, retries, state machine, migrations | used (sections 4 and 11) |
| `tools/verify/smoke.mjs` | adapted -> `scripts/rista-smoke.mjs` |
| `tools/sitegate/menu-snapshot.mjs` (live menu -> static snapshot for regression checks) | replaced by `scripts/rista-compare.mjs` |
| `tools/reports/dish_photo_table.py` (reads RR's `site.html`) | not reusable (RR-specific HTML); idea kept in D10 |
| `SETUP.md` debug links (`/branch/list`, `/branch`, `/catalog`, `/stockStatus`, `/catalog/enterprise`, `/catalog/item/list`) | all six paths are in `/api/debug` |
| `src/health.js` selfcheck, `housekeeping.js`, `expiry.js`, `reconcile.js`, `slots.js`, `ordering.js`, `otp.js` | phase 2 (needs payment + OTP decisions); the originals stay in the RR repo |
| RR frontend (`rr-*.js` minified, pickup-menu, checkout, track-order) | not reused: Fursat builds its own with the `.fk-*` UI kit |
| PayU, MSG91, Reelo, Instagram `whatsnew.js`, CMS tools | not Rista; not needed |

## 11. Source map (RR Durbar -> Fursat)
| RR file | Fursat | Note |
|---|---|---|
| `src/jwt.js`, `rista.js`, `cache.js`, `transform.js` | `functions/_lib/rista/` | `config.js` rewritten: one outlet, env-driven |
| `src/index.js` (`menuData`, `loadCatalog`, `loadSold`, `debug`) | `functions/_lib/rista/menu.js`, `functions/api/*` | 6-outlet loop dropped; CORS dropped (same origin) |
| `quote.js`, `quotemoney.js`, `order.js`, `ristasale.js`, `ristapush.js`, `orderstate.js`, `orderstore.js`, `pay.js`, migrations | `rista-phase2/` | "RR Durbar Website" -> "Fursat Website"; branch map has a `fursat` entry (TODO branch code) |
| `payu*.js`, `msg91.js`, `reelo.js`, `loyalty.js`, `whatsnew.js`, 6-outlet `config.js` | not copied | RR-specific |
| RR `ordering.js`, `slots.js`, `health.js`, `reconcile.js`, `expiry.js` | not copied yet | port in Q3-Q6 when payment is chosen |
