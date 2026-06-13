const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const config = require('./config');
const registry = require('./db/registry');

function tokensMatch(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isPublic(url) {
  const path = url.split('?')[0];
  return path === '/' || path === '/api/v1/health' || path.startsWith('/api/v1/health/');
}

// ─── Keycloak SSO (JWT) ───

const SSO_ISSUER = `${config.keycloak.url}/realms/${config.keycloak.ssoRealm}`;
let jwks = null;
function getJWKS() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${SSO_ISSUER}/protocol/openid-connect/certs`));
  return jwks;
}

function looksLikeJwt(token) {
  return typeof token === 'string' && token.startsWith('ey') && token.split('.').length === 3;
}

const ROLE_RANK = { viewer: 1, developer: 2, admin: 3, owner: 4 };
function highestRole(roles = []) {
  let best = null, rank = 0;
  for (const r of roles) {
    if (ROLE_RANK[r] && ROLE_RANK[r] > rank) { rank = ROLE_RANK[r]; best = r; }
  }
  return best;
}

// Verify a Keycloak access token (signature via the realm JWKS) and map the
// `tenant` claim + realm roles to our identity model. The issuer string is only
// soft-checked (it varies by the hostname Keycloak was reached on) — the realm
// signing key fetched from JWKS is the actual trust anchor.
async function resolveJwt(token) {
  const { payload } = await jwtVerify(token, getJWKS());
  if (!String(payload.iss || '').endsWith(`/realms/${config.keycloak.ssoRealm}`)) return null;

  const tenantSlug = payload.tenant;
  const role = highestRole(payload.realm_access?.roles);
  if (!tenantSlug || !role) return null;

  const tenant = await registry.getTenant(tenantSlug);
  if (!tenant || tenant.status !== 'active') return null;

  return {
    superadmin: false,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role,
    actor: `user:${payload.preferred_username || payload.email || payload.sub}`,
  };
}

// Resolve the bearer token into req.identity. Order: env superadmin token →
// Keycloak SSO JWT → tenant API token → (open dev mode when no auth configured).
async function authHook(req, reply) {
  if (req.method === 'OPTIONS') return;
  if (isPublic(req.url)) return;

  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (config.apiToken && token && tokensMatch(token, config.apiToken)) {
    req.identity = { superadmin: true, role: 'owner', actor: 'superadmin' };
    return;
  }

  if (token) {
    // Human SSO token from Keycloak.
    if (looksLikeJwt(token)) {
      try {
        const id = await resolveJwt(token);
        if (id) { req.identity = id; return; }
        return reply.code(403).send({ error: 'SSO token has no valid tenant/role mapping' });
      } catch (e) {
        req.log.warn({ err: e.message }, 'SSO token verification failed');
        return reply.code(401).send({ error: 'Invalid or expired SSO token' });
      }
    }

    // Machine API token.
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

  if (!config.apiToken) {
    req.identity = { superadmin: true, role: 'owner', actor: 'anonymous' };
    return;
  }
  return reply.code(401).send({ error: 'Unauthorized' });
}

module.exports = { authHook };
