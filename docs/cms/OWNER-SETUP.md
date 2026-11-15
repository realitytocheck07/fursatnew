# FURSAT CMS: owner setup (Sanity + Cloudflare + GitHub)

For: the owner (BJNEXUS AI). Time: about 45 minutes the first time.
Date written: 14 Nov 2026. Dashboards change their labels often.

**`CHECK:` means "I am not sure of this label or name. Look at the screen and use what you see."** Nothing marked `CHECK:` was guessed. Where you see it, trust your screen over this page.

## How the pieces fit

```
Client presses Publish in Sanity Studio
  -> Sanity webhook (only for "announcement" and "homeNews")
  -> Cloudflare Pages deploy hook
  -> the site rebuilds (about 1-3 minutes)
  -> Home shows the new card

Every day 06:00 IST: GitHub Action -> same deploy hook -> rebuild
(this brings in cards whose Start date has arrived)
```

**Decision D2 (already in the plan):** a Publish now redeploys the site without a git push. Code still changes only when you push. Content goes live on Publish.

**Two secrets rules:**
- The **deploy hook URL is a password.** It lives in only two places: the Sanity webhook and the GitHub secret. Never put it in the repo, in chat, in email or in a screenshot.
- The Sanity **project ID** and dataset name are public. They are safe to put in `.env` and to share.

---

## 1. Create the Sanity project

1. Go to <https://www.sanity.io> and log in with the BJNexus email (create the account first if you have none).
2. Open <https://www.sanity.io/manage>. Click **Create new project**. `CHECK:` button name.
3. Project name: **Fursat**.
4. Dataset name: **production**. Dataset visibility: **Public**.
   - On the Free plan only public datasets exist. Public means anyone can read *published* cards through the API. That is fine, because they are public on the site anyway. Drafts stay private.
5. Plan: **Free**. `CHECK:` you may be asked to pick a plan; if there is no choice, the project starts on Free.
6. Copy the **Project ID** (a short code of letters and numbers). You find it on the project page, under the project name. `CHECK:` exact place.

Plan limits to remember (Free, checked on sanity.io/pricing on 14 Nov 2026): 2 webhooks, 2 datasets, only 2 roles (Administrator, Viewer), no scheduled publishing. We use **1 webhook**.

## 2. Put the project ID in `studio/.env` and `.env`

Open the Codespace at `/workspaces/fursat-astro`.

1. Studio file: copy `studio/.env.example` to `studio/.env`. Fill in the project ID and the dataset `production`.
2. Site file: copy `.env.example` (repo root) to `.env`. Fill in the same project ID and dataset.
3. The names inside are, for example, `SANITY_STUDIO_PROJECT_ID` (studio) and `SANITY_PROJECT_ID` (site).
   `CHECK:` use the exact names written in `studio/.env.example`, `.env.example` and `studio/README.md`. Those files come from phases C1 and C2.
4. `CHECK:` run `git status`. `.env` and `studio/.env` must **not** appear as new files. If they do, stop and tell me; do not commit them.
5. **Cloudflare must know the project ID too**, because Cloudflare builds the site, not your Codespace.
   - Click path: Cloudflare dashboard -> **Workers & Pages** -> your Pages project -> **Settings** -> **Variables and secrets** (or **Environment variables**). `CHECK:` label.
   - Add the same site variables (same names as the site `.env`).
   - Add them for **Preview** as well as **Production**. Right now the site builds from `design/reference-layout`, which Cloudflare treats as a Preview branch. If you only fill Production, the build falls back to `news.json` and the client's cards will not show.

## 3. Deploy the Studio

Do this on your own machine or in the Codespace, once.

```
cd studio
npm install
npx sanity login
npx sanity deploy
```

1. `npx sanity login`: choose how you log in (Google, GitHub or email). `CHECK:` in a Codespace the browser step may show a link you must open by hand.
2. `npx sanity deploy` asks for a **studio hostname**. Type **fursat**.
3. Result: the Studio is live at **<https://fursat.sanity.studio>**.
   `CHECK:` if "fursat" is already taken, pick another name and write the real URL in `docs/cms/CLIENT-GUIDE.md` (the owner can edit it later).
4. Open the URL, log in, and check that "What's new" is on the left.

## 4. Add CORS origins

CORS tells Sanity which web addresses may talk to the project.

Click path: <https://www.sanity.io/manage> -> project **Fursat** -> **API** -> **CORS origins** -> **Add CORS origin**. `CHECK:` labels.

Add these one by one:

| Origin | Allow credentials? |
|---|---|
| `http://localhost:3333` (Studio on your computer) | **Yes** |
| `https://fursat.sanity.studio` (the live Studio) | **Yes** `CHECK:` Sanity may add this one by itself |
| `http://localhost:4321` (the site on your computer) | No |
| `https://fursatind.in` (live site) | No |
| `https://www.fursatind.in` `CHECK:` only if this address is used | No |
| `https://<your-pages-project>.pages.dev` (preview site) `CHECK:` copy the real address from Cloudflare | No |

Working in the Codespace? The addresses look like `https://<codespace-name>-3333.app.github.dev` (Studio, **credentials Yes**) and `https://<codespace-name>-4321.app.github.dev` (site, credentials No). `CHECK:` copy them from the **Ports** tab in the Codespace.

Note: the site reads Sanity during the build, on Cloudflare's server, so the build itself does not need CORS. The origins above are for Studio and for the site in a browser.

## 5. Invite the client (decision D1)

**Do this after step 9 passes.** Do not invite the client before the Studio is deployed (step 3).

Click path: <https://www.sanity.io/manage> -> project **Fursat** -> **Members** -> **Invite members**. `CHECK:` labels. Type the client's email, pick the role, send.

Pick one option:

**Option A: Free plan, client is an Administrator.**
- Cost: 0.
- On the Free plan the client *must* be Administrator to edit at all (the only other role, Viewer, cannot edit).
- Risk: an Administrator can also change webhooks, CORS and members. One wrong click can stop the live updates or lock you out.
- Fix: tell the client the rule in words: *"Only use Studio. Never open the Manage / API pages."* The guide says this too. Keep your own Administrator seat so you can always repair it.

**Option B: Growth plan, client is an Editor.**
- Cost: about **$15 a month for 1 seat** (checked 14 Nov 2026). `CHECK:` pricing page, and whether your own seat is also charged.
- Editor can write and publish cards, but cannot touch API settings, webhooks or members. This is the safe option.
- Upgrade: manage -> project -> **Billing** (or **Plan**) -> choose Growth. `CHECK:` label.

**Middle path (the plan's suggestion):** start on Option A, add the written rule, and move to Option B **before go-live**. After the upgrade, change the client's role from Administrator to Editor (manage -> **Members** -> click the client -> change role. `CHECK:` where).

Write your choice here so it is not forgotten: **D1 = ________**

## 6. Create the Cloudflare Pages deploy hook

A deploy hook is a private web address. When something sends a POST to it, Cloudflare rebuilds the site.

Click path: Cloudflare dashboard -> **Workers & Pages** -> your Pages project -> **Settings** -> **Builds** -> **Deploy hooks** -> **Add deploy hook**. `CHECK:` labels.

1. Hook name: **sanity-news**.
2. Branch: **`design/reference-layout`** (right now). After go-live use **`main`** (see "After go-live" at the end).
3. Save. Copy the URL **once**. Treat it as a password.
4. Keep it open, or in a password manager, until steps 7 and 8 are done. Then close it.

Two things to `CHECK:`
- **Which project?** The plan calls the project `fursat-preview`. The `deploy` script in `package.json` uses the name `fursat-kitchen-bar`. Use the project that serves the site people see. The one you pick is the one whose hook you create.
- **Git connected?** Deploy hooks only exist on Pages projects that are connected to the GitHub repo. A project made by "direct upload" (wrangler) has no deploy hook option. If you do not see **Deploy hooks**, the project is not Git-connected: stop and ask me.

## 7. Create the Sanity webhook

Click path: <https://www.sanity.io/manage> -> project **Fursat** -> **API** -> **Webhooks** -> **Create webhook**. `CHECK:` labels.

Fill in:

| Field | Value |
|---|---|
| Name | `rebuild-site` |
| URL | the deploy hook URL from step 6 |
| Dataset | `production` |
| Trigger on | **Create**, **Update**, **Delete** (all three) |
| Filter | `_type in ["announcement","homeNews"]` |
| Projection | leave empty `CHECK:` |
| HTTP method | **POST** |
| Drafts | **off**. `CHECK:` in Advanced settings there is a switch for drafts. Leave it off. Then only a real Publish, an edit of a published card, or an Unpublish/Delete fires the hook. |
| Status | Enabled |

Save.

Notes:
- Only these two document types fire it. Other content (the Studio's own documents) never rebuilds the site.
- Many quick edits: Cloudflare queues the builds, so this is safe.
- Where to see if it fired: open the webhook -> **Attempts** (or **Logs**). `CHECK:` name. A good attempt shows status 200.
- `CHECK:` Delete events and the filter. Step 9 tests that unpublishing really removes a card. If it does not, tell me.

## 8. Add the GitHub secret `CF_DEPLOY_HOOK`

Click path: GitHub -> repo `alekyareality/fursat-astro` -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.

1. Name: **`CF_DEPLOY_HOOK`** (exactly this).
2. Secret: paste the same deploy hook URL as in step 7.
3. **Add secret**.

The file `.github/workflows/daily-rebuild.yml` uses it. It runs every day at 00:30 UTC (06:00 IST) and has a **Run workflow** button.

**Important, `CHECK:`** GitHub only runs timed workflows, and only shows the **Run workflow** button, for the file on the repo's **default branch** (probably `main`; see repo Settings -> General -> Default branch). Your work is on `design/reference-layout`, so:
- Until `.github/workflows/daily-rebuild.yml` is on `main`, the daily rebuild will **not** run and the button will **not** appear.
- That is fine for now. Publish-triggered rebuilds (step 7) do not need GitHub at all.
- At go-live this file reaches `main` with the rest. If you want the daily rebuild earlier, put only this file on `main`.
- Also `CHECK:` GitHub pauses timed workflows when a repo has no activity for 60 days. If the daily rebuild stops, open **Actions** and enable it again.

When it is on `main`, test it: **Actions** tab -> **Daily rebuild** -> **Run workflow**. A green tick means Cloudflare accepted it. A red cross with "Secret CF_DEPLOY_HOOK is missing" means step 8 was not done. A red cross with "refused" means the hook was deleted or changed (see step 10).

## 9. Test the whole chain with a "TEST – delete me" card

1. Open <https://fursat.sanity.studio> -> **What's new** -> new card.
2. Type: **News**. Title: **TEST – delete me**. Short text: **Test card, please ignore.** No photo (so no real-photo tick is needed).
3. Start date: today. End date: tomorrow. **Publish.**
4. Open Cloudflare -> your Pages project -> **Deployments**. Within a few seconds a new deployment should start. `CHECK:` it shows as triggered by a deploy hook.
5. Wait about 1-3 minutes. Open the Home page and check the "What's new" section shows **TEST – delete me**.
6. Now remove it: in Studio click the card -> **Unpublish** (or **Delete**). `CHECK:` button names.
7. Wait 1-3 minutes again. The card must be gone from Home.
8. Delete the test card for good.

If it does not work, check in this order:
1. Sanity -> API -> Webhooks -> **Attempts**: did it fire? Status 200?
2. Cloudflare -> **Deployments**: did a build start? Did it pass?
3. Cloudflare build log: look for `[cms] news: N cards from Sanity` (N is the number of cards). If it says `[cms] news: fallback`, the project ID variable is missing for the right environment (see step 2.5).
4. Is the End date in the past, or the Start date in the future? The site hides those cards.

Also test the card with a photo once, to see the real-photo tick and the alt text rule.

## 10. If the hook URL leaks, rotate it

Leaked means: pasted in chat or email, shown in a screenshot, committed to the repo, or someone who should not have it has it. With the URL, anyone can start a rebuild. They cannot read or change your content, but they can waste your build minutes.

Do the steps in this order, so the site never goes without a working hook:
1. Cloudflare -> Pages project -> **Settings** -> **Builds** -> **Deploy hooks**: create a **new** hook (name `sanity-news-2`, same branch).
2. Sanity -> API -> **Webhooks** -> `rebuild-site` -> replace the URL with the new one -> save.
3. GitHub -> repo -> **Settings** -> **Secrets and variables** -> **Actions** -> `CF_DEPLOY_HOOK` -> **Update** -> paste the new URL.
4. Cloudflare: **delete the old hook.** This is what makes the leaked URL useless.
5. Repeat step 9 (the test card) to prove the chain works.
6. If the URL was in the git history: it is already dead after step 4, so you do not need to rewrite history.

## 11. Monthly backup

Once a month (set a repeating reminder: **first Monday**):

```
cd studio
npx sanity dataset export production fursat-backup-2026-12.tar.gz
```

1. Change the date in the file name each month.
2. `CHECK:` if it asks you to log in again, run `npx sanity login`.
3. The file holds all cards and photos. Download it from the Codespace (right-click the file -> **Download**) and save it in your own cloud folder. Then delete it from the Codespace.
4. **Do not commit the backup file to git.**
5. To restore (only if something is lost): `npx sanity dataset import fursat-backup-2026-12.tar.gz production`. `CHECK:` add `--replace` only if you really want to overwrite. Ask me first.

---

## After go-live (when the live branch changes to `main`)

A deploy hook belongs to one branch. So when go-live happens:
1. Create a new hook in Cloudflare for **`main`** (same click path as step 6).
2. Put the new URL in the Sanity webhook (step 7) and in the GitHub secret (step 8).
3. Delete the old `design/reference-layout` hook.
4. Check the Cloudflare **Production** variables are filled (step 2.5).
5. Run the test card again (step 9).
6. Move the client from Administrator to Editor if D1 was the middle path (step 5).

## Quick checklist

- [ ] Sanity project **Fursat**, dataset `production` (public), project ID copied
- [ ] `studio/.env` and `.env` filled; not in git
- [ ] Project ID variables set in Cloudflare (**Preview** and **Production**)
- [ ] Studio deployed at `fursat.sanity.studio`
- [ ] CORS origins added
- [ ] Cloudflare deploy hook `sanity-news` (right branch)
- [ ] Sanity webhook `rebuild-site` (filter, no drafts, POST)
- [ ] GitHub secret `CF_DEPLOY_HOOK`
- [ ] Test card: shows on Home, then removed
- [ ] D1 decided and the client invited
- [ ] Monthly backup reminder set
