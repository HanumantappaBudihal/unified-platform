const registry = require('../db/registry');

async function routes(fastify) {
  fastify.get('/api/v1/audit', async (req) => {
    const { limit, offset } = req.query;
    const logs = await registry.getAuditLog({
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    return { logs };
  });
}

module.exports = routes;
