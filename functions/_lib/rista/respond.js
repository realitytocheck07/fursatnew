import { RistaError } from './rista.js';
import { branchOf } from './config.js';

export const json = (data, status = 200, cacheSecs = 0) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200 && cacheSecs > 0 ? `public, max-age=${cacheSecs}` : 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

export const configured = (env) => Boolean(env.RISTA_KEY && env.RISTA_SECRET && branchOf(env));

// Run a Rista-backed handler. Messages never contain the key or secret.
export async function guard(env, fn, cacheSecs) {
  if (!configured(env)) return json({ error: 'not_configured' }, 503);
  try { return json(await fn(), 200, cacheSecs); }
  catch (e) {
    console.error('rista request failed:', e.message);
    if (e instanceof RistaError && e.status === 0) return json({ error: 'not_configured' }, 503);
    return json({ error: 'rista_unavailable' }, 502);
  }
}

export const sameText = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
