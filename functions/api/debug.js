// GET /api/debug?path=/branch/list with header X-Debug-Token: <DEBUG_TOKEN> : raw Rista reply, owner only. May contain prices.
// (?token= still works until DEBUG_ALLOW_QUERY=0 is set.)
import { ristaGet } from '../_lib/rista/rista.js';
import { json, sameText, ownerToken } from '../_lib/rista/respond.js';
import { branchOf, channelOf } from '../_lib/rista/config.js';

const PATHS = ['/branch/list', '/branch', '/items/soldout', '/stockStatus', '/catalog', '/catalog/enterprise', '/catalog/item/list'];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.DEBUG_TOKEN || !sameText(ownerToken(request, env), env.DEBUG_TOKEN)) return json({ error: 'not_found' }, 404);
  const path = url.searchParams.get('path');
  if (!PATHS.includes(path)) return json({ error: 'bad_path', allowed: PATHS }, 400);
  const params = {};
  if (path === '/branch') params.branchCode = branchOf(env);
  if (['/catalog', '/stockStatus'].includes(path)) { params.branch = branchOf(env); params.channel = channelOf(env); }
  if (path === '/items/soldout') params.branch = branchOf(env);
  for (const [k, v] of url.searchParams) if (k !== 'token' && k !== 'path') params[k] = v;
  try {
    const raw = await ristaGet(env, path, params, { timeoutMs: 15000 });
    return new Response(JSON.stringify(raw, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  } catch (e) { return json({ error: 'rista_error', status: e.status ?? null }, 502); }
}
