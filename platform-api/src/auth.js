const crypto = require('crypto');
const config = require('./config');
const registry = require('./db/registry');

function tokensMatch(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so guard first.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Public paths that never require auth (health checks, root banner).
function isPublic(url) {
  const path = url.split('?')[0];
  return path === '/' || path === '/api/v1/health' || path.startsWith('/api/v1/health/');
}

// Resolve the bearer token into an identity:
//   - the env superadmin token  -> { superadmin: true } (can act across tenants)
//   - a tenant API token (DB)   -> { tenantId, tenantSlug, role }
// Attaches req.identity. Auth is enforced whenever PLATFORM_API_TOKEN is set OR
// any tenant API tokens exist; when neither is true (fresh local dev) it is open
// and requests run as the implicit superadmin so nothing breaks.
async function authHook(req, reply) {
  if (req.method === 'OPTIONS') return;
  if (isPublic(req.url)) return;

  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Env superadmin token.
  if (config.apiToken && token && tokensMatch(token, config.apiToken)) {
    req.identity = { superadmin: true, role: 'owner', actor: 'superadmin' };
    return;
  }

  // Tenant-scoped API token.
  if (token) {
    let resolved = null;
    try {
      resolved = await registry.resolveToken(token);
    } catch (e) {
      req.log.error({ err: e }, 'token resolution failed');
      return reply.code(500).send({ error: 'Auth backend error' });
    }
    if (resolved && resolved.tenant_status === 'active') {
      req.identity = {
        superadmin: false,
        tenantId: resolved.tenant_id,
        tenantSlug: resolved.tenant_slug,
        role: resolved.role,
        actor: `token:${resolved.tenant_slug}`,
      };
      return;
    }
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }

  // No token. Allowed only when auth is fully disabled (no env token configured).
  if (!config.apiToken) {
    req.identity = { superadmin: true, role: 'owner', actor: 'anonymous' };
    return;
  }
  return reply.code(401).send({ error: 'Unauthorized' });
}

module.exports = { authHook };
