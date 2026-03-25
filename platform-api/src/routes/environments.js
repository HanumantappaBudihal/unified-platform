const registry = require('../db/registry');

async function routes(fastify) {
  fastify.get('/api/v1/environments', async () => {
    const environments = await registry.listEnvironments();
    return { environments };
  });
}

module.exports = routes;
