'use strict';

const config = require('./config');
const platformAuth = require('./platformAuth');

// Auth gate for the provisioning API. Three modes, in priority order:
//   1. Platform introspection (preferred) — validates a Seiton Platform-issued JWT
//      via RFC 7662 introspection and enforces the infra.provision scope. The
//      validated identity (incl. tenant claim) is stashed on req.platformIdentity
//      for tenant binding in the route layer.
//   2. Legacy static token — a single shared PROVISIONING_API_TOKEN.
//   3. Open mode (dev only) — no auth; server.js warns loudly at boot.
// Health is always public.

const PUBLIC_PATHS = new Set(['/health', '/']);

async function authHook(req, reply) {
  if (PUBLIC_PATHS.has(req.url.split('?')[0])) return;

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  // ── 1. Platform introspection ──────────────────────────────────────────────
  if (platformAuth.enabled()) {
    const result = await platformAuth.validate(token);
    if (!result.ok) {
      reply.code(result.status || 401).send({ error: `Unauthorized: ${result.error}` });
      return;
    }
    req.platformIdentity = { sub: result.sub, tenant: result.tenant, scopes: result.scopes };
    return;
  }

  // ── 2. Legacy static token ──────────────────────────────────────────────────
  if (config.apiToken) {
    if (!token || token !== config.apiToken) {
      reply.code(401).send({ error: 'Unauthorized: valid Bearer token required' });
    }
    return;
  }

  // ── 3. Open mode (dev only) ─────────────────────────────────────────────────
}

module.exports = { authHook };
