// FURSAT Rista config. Non-secret settings come from Cloudflare Pages env vars:
//   RISTA_BRANCH   branch code from /api/debug?path=/branch/list   (TODO(client))
//   RISTA_CHANNEL  exact Rista channel name, default "Website"
// Secrets (Pages > Settings > Variables > Encrypt): RISTA_KEY, RISTA_SECRET, DEBUG_TOKEN. Never in code.
export const RISTA_BASE = 'https://api.ristaapps.com/v1';
export const TTL = { status: 45, soldout: 45, menu: 180, branches: 600, photos: 1800 };
export const STALE_OK = 900;
export const STALE_PHOTOS = 21600;
export const PHOTO_RETRY = 120;
export const branchOf = (env) => String(env.RISTA_BRANCH || '').trim().toUpperCase();
export const channelOf = (env) => String(env.RISTA_CHANNEL || 'Website').trim();
