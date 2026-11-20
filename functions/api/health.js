// GET /api/health                 public: { ok, configured }
// GET /api/health?token=DEBUG_TOKEN  owner: also lists the NAMES of settings that are missing (never values).
import { json, configured, sameText } from '../_lib/rista/respond.js';

export const REQUIRED = ['RISTA_BRANCH', 'RISTA_KEY', 'RISTA_SECRET', 'DEBUG_TOKEN'];

export function onRequestGet({ request, env }) {
  const out = { ok: true, configured: configured(env) };
  const t = new URL(request.url).searchParams.get('token');
  if (t && env.DEBUG_TOKEN && sameText(t, env.DEBUG_TOKEN)) {
    out.missing = REQUIRED.filter((k) => !String(env[k] || '').trim());
    out.channel = String(env.RISTA_CHANNEL || 'Website');
  }
  return json(out, 200, t ? 0 : 5);
}
