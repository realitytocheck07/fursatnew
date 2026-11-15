// Sanity read access for build time. Plain fetch, no library.
// Never throws: any problem returns { data: null, reason } so the build cannot fail.

export const SANITY_API_VERSION = 'v2025-02-19';
export const SANITY_TIMEOUT_MS = 5000;

export type SanityConfig = { projectId: string; dataset: string };
export type SanityResult<T> = { data: T | null; reason?: string };
export type SanityOptions = {
  params?: Record<string, unknown>;
  projectId?: string;
  dataset?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function env(name: string): string {
  const meta = (import.meta as any).env;
  const proc = typeof process !== 'undefined' ? process.env : undefined;
  return String((meta && meta[name]) ?? (proc && proc[name]) ?? '').trim();
}

// Public Sanity project ID (not a secret). An env value overrides it.
const DEFAULT_PROJECT_ID = 'l7nho91v';

/** Project ID and dataset from env, else the default. Returns null only if the ID is a placeholder. */
export function getSanityConfig(): SanityConfig | null {
  const projectId = env('PUBLIC_SANITY_PROJECT_ID') || DEFAULT_PROJECT_ID;
  if (!projectId || projectId === 'TODO_PROJECT_ID') return null;
  return { projectId, dataset: env('PUBLIC_SANITY_DATASET') || 'production' };
}

const SAFE = /^[a-z0-9_-]+$/i;

/** Runs a GROQ query on the CDN. Always resolves; data is null on any error. */
export async function sanityQuery<T = unknown>(query: string, opts: SanityOptions = {}): Promise<SanityResult<T>> {
  const cfg = opts.projectId ? { projectId: opts.projectId, dataset: opts.dataset || 'production' } : getSanityConfig();
  if (!cfg) return { data: null, reason: 'no project ID set' };
  if (!SAFE.test(cfg.projectId) || !SAFE.test(cfg.dataset)) return { data: null, reason: 'invalid project ID or dataset' };

  const doFetch = opts.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return { data: null, reason: 'fetch not available' };

  let url = `https://${cfg.projectId}.apicdn.sanity.io/${SANITY_API_VERSION}/data/query/${cfg.dataset}?query=${encodeURIComponent(query)}`;
  for (const [k, v] of Object.entries(opts.params || {})) url += `&${encodeURIComponent('$' + k)}=${encodeURIComponent(JSON.stringify(v))}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? SANITY_TIMEOUT_MS);
  try {
    const res = await doFetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { data: null, reason: `Sanity answered HTTP ${res.status}` };
    const body: any = await res.json();
    if (!body || typeof body !== 'object' || !('result' in body)) return { data: null, reason: 'unexpected Sanity response' };
    return { data: body.result as T };
  } catch (e: any) {
    return { data: null, reason: e && e.name === 'AbortError' ? 'Sanity timed out' : 'Sanity unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Same as sanityQuery, data only. Null on any error. */
export async function sanityFetch<T = unknown>(query: string, opts: SanityOptions = {}): Promise<T | null> {
  return (await sanityQuery<T>(query, opts)).data;
}
