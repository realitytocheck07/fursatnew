// Instagram feed: the ONE place that knows the Worker address and the account list.
// The Worker (fursat-feed) returns { updated, stale, posts[] } per account. Image URLs are signed and expire in days,
// so nothing here (or anywhere in the site) may store a post or an image URL: the browser asks the Worker at view time.
export const IG_WORKER_BASE = 'https://fursat-feed.fursathyd.workers.dev/feed';

export const IG_ACCOUNTS = {
  main: { label: 'Fursat', handle: 'fursatind.in', url: 'https://www.instagram.com/fursatind.in' },
  bites: { label: 'Bites & Buffet', handle: 'fursat_bitesandbuffet', url: 'https://www.instagram.com/fursat_bitesandbuffet' },
  banquets: { label: 'Banquets', handle: 'fursatbanquets', url: 'https://www.instagram.com/fursatbanquets' },
} as const;

export type IgAcct = keyof typeof IG_ACCOUNTS;
export const IG_ACCT_KEYS = Object.keys(IG_ACCOUNTS) as IgAcct[];

export const IG_TIMEOUT_MS = 6000; // per request; past this the fallback button shows
export const IG_CACHE_MS = 5 * 60 * 1000; // sessionStorage, per account
export const IG_MAX_TILES = 12;

export type IgPost = {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption?: string;
  image: string;
  video?: string | null; // playable file URL from the Worker (signed, expires); null/absent for photos and some reels
  permalink: string;
  timestamp: string;
};
