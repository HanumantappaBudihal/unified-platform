const registry = require('../db/registry');
const { requireRole } = require('../rbac');

async function routes(fastify) {
  fastify.get('/api/v1/audit', { preHandler: requireRole('viewer') }, async (req) => {
    // Tenant tokens see only their own audit trail; superadmin sees all (or a
    // specific tenant via ?tenant=<slug>).
    let tenantId;
    if (req.identity && !req.identity.superadmin) {
      tenantId = req.identity.tenantId;
    } else if (req.query.tenant) {
      const tenant = await registry.getTenant(req.query.tenant);
      tenantId = tenant?.id;
    }

    const logs = await registry.getAuditLog({
      tenantId,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    });
    return { logs };
  });
}

module.exports = routes;
