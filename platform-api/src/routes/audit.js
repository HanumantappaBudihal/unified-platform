const registry = require('../db/registry');
const { requireRole } = require('../rbac');

function tenantFilter(req) {
  if (req.identity && !req.identity.superadmin) return req.identity.tenantId;
  if (req.query.tenant) return undefined; // resolved below for superadmin
  return undefined;
}

async function routes(fastify) {
  fastify.get('/api/v1/audit', { preHandler: requireRole('viewer') }, async (req) => {
    let tenantId = tenantFilter(req);
    if (req.identity?.superadmin && req.query.tenant) {
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

  // Tamper-evidence: recompute the whole hash chain and report integrity.
  fastify.get('/api/v1/audit/verify', { preHandler: requireRole('admin') }, async () => {
    return registry.verifyAuditChain();
  });

  // Export the audit trail (JSON or CSV) for compliance review.
  fastify.get('/api/v1/audit/export', { preHandler: requireRole('admin') }, async (req, reply) => {
    let tenantId;
    if (req.identity && !req.identity.superadmin) tenantId = req.identity.tenantId;
    else if (req.query.tenant) tenantId = (await registry.getTenant(req.query.tenant))?.id;

    const rows = await registry.getAuditLog({ tenantId, limit: parseInt(req.query.limit) || 10000, offset: 0 });

    if ((req.query.format || 'json') === 'csv') {
      const cols = ['seq', 'created_at', 'actor', 'action', 'resource_type', 'resource_id', 'tenant_id', 'hash'];
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [cols.join(',')]
        .concat(rows.map(r => cols.map(c => esc(r[c])).join(',')))
        .join('\n');
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="audit-export.csv"');
      return csv;
    }
    return { exportedAt: new Date().toISOString(), count: rows.length, entries: rows };
  });
}

module.exports = routes;
