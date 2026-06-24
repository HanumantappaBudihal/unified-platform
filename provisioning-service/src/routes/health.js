'use strict';

const config = require('../config');
const { ALL_TYPES } = require('../orchestrators');

async function routes(fastify) {
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'provisioning-service',
    enabledResources: config.enabledResources.filter((r) => ALL_TYPES.includes(r)),
  }));

  fastify.get('/', async () => ({
    service: 'InfraMatrix Provisioning Service',
    version: '1.0.0',
    endpoints: ['POST /v1/provision', 'POST /v1/decommission', 'GET /health'],
  }));
}

module.exports = routes;
