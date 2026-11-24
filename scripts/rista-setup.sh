#!/usr/bin/env bash
# Sets the 5 Rista settings on the Cloudflare Pages project (Production) with wrangler.
# Run it yourself in the Codespace. Values are typed at hidden prompts: they never go in code, git or chat.
# Usage:  bash scripts/rista-setup.sh <pages-project-name>
# Needs a Cloudflare login: either `npx wrangler login`, or `export CLOUDFLARE_API_TOKEN=...` (Pages edit permission; then `unset` it).
set -euo pipefail
# Codespaces cannot finish `wrangler login` (the OAuth link redirects to localhost). Use an API token instead:
#   Cloudflare > My Profile > API Tokens > Create > "Edit Cloudflare Workers" template or custom: Account > Cloudflare Pages > Edit.
#   Then in the terminal:  export CLOUDFLARE_API_TOKEN=...   (and after the script:  unset CLOUDFLARE_API_TOKEN)
# Deploys need NO wrangler: Cloudflare builds from GitHub on every push. This script is only for the secrets.
# Easier alternative with no token: Cloudflare > Workers & Pages > project > Settings > Variables and Secrets > add the 5 names below (Production, "Encrypt" the secrets).
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || { echo "CLOUDFLARE_API_TOKEN is not set. Export it first (see the comments at the top of this script), or add the 5 values in the Cloudflare dashboard."; exit 1; }
P="${1:-}"; [ -n "$P" ] || { echo "Usage: bash scripts/rista-setup.sh <pages-project-name>   (Cloudflare > Workers & Pages > the project name)"; exit 1; }
put() { printf %s "$2" | npx wrangler pages secret put "$1" --project-name "$P" >/dev/null && echo "  set $1"; }

read -r -p "RISTA_BRANCH  (branch code; ask me or leave empty to set later): " B
read -r -p "RISTA_CHANNEL (exact Rista channel name) [Website]: " C; C="${C:-Website}"
read -r -s -p "RISTA_KEY    (hidden): " K; echo
read -r -s -p "RISTA_SECRET (hidden): " S; echo
[ -n "$K" ] && [ -n "$S" ] || { echo "RISTA_KEY and RISTA_SECRET are required"; exit 1; }
D="$(openssl rand -hex 24)"

echo "Setting on project '$P' (Production)..."
[ -n "$B" ] && put RISTA_BRANCH "$B"
put RISTA_CHANNEL "$C"
put RISTA_KEY "$K"
put RISTA_SECRET "$S"
put DEBUG_TOKEN "$D"
echo
echo "DEBUG_TOKEN (save it in your password manager, shown once): $D"
echo "Secrets apply on the NEXT deployment: push any commit, or Cloudflare > Deployments > Retry deployment."
echo "Then open /api/health -> configured:true, and GET /api/debug?path=/branch/list with the header \"x-debug-token: <DEBUG_TOKEN>\" for the branch code."
