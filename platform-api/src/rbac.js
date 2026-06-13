const registry = require('./db/registry');

// Role hierarchy (higher number = more privilege).
const ROLE_RANK = { viewer: 1, developer: 2, admin: 3, owner: 4 };

function rank(role) {
  return ROLE_RANK[role] || 0;
}

// True if the identity meets the minimum role. Superadmin satisfies everything.
function hasRole(identity, minRole) {
  if (identity?.superadmin) return true;
  return rank(identity?.role) >= rank(minRole);
}

// Fastify preHandler factory: 403 unless the caller has at least `minRole`.
function requireRole(minRole) {
  return async function (req, reply) {
    if (!hasRole(req.identity, minRole)) {
      return reply.code(403).send({
        error: `Forbidden: requires '${minRole}' role (you have '${req.identity?.role || 'none'}')`,
      });
    }
  };
}

// Resolve which tenant this request acts on.
//   - tenant-scoped token  -> its own tenant (any ?tenant override is ignored)
//   - superadmin           -> ?tenant=<slug> or X-Tenant header (defaults to 'default')
// Returns { tenantId, tenantSlug } or null (caller should 400) when unresolved.
async function resolveTenant(req) {
  if (req.identity && !req.identity.superadmin) {
    return { tenantId: req.identity.tenantId, tenantSlug: req.identity.tenantSlug };
  }
  const slug = req.query?.tenant || req.headers['x-tenant'] || 'default';
  const tenant = await registry.getTenant(slug);
  if (!tenant) return null;
  return { tenantId: tenant.id, tenantSlug: tenant.slug };
}

module.exports = { ROLE_RANK, hasRole, requireRole, resolveTenant };
