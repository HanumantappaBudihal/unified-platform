const registry = require('../db/registry');
const config = require('../config');

async function checkService(name, url, timeout = 3000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return { name, status: res.ok ? 'healthy' : 'unhealthy', statusCode: res.status };
  } catch {
    return { name, status: 'offline' };
  }
}

async function routes(fastify) {
  // Liveness: the process is up. Must be cheap (no external calls) so a slow
  // dependency never triggers a restart loop.
  fastify.get('/api/v1/health/live', async () => ({ status: 'ok' }));

  // Readiness: can we serve? Gate only on the critical dependency (the registry
  // DB) — NOT the aggregate dashboard below, which probes many optional services.
  fastify.get('/api/v1/health/ready', async (req, reply) => {
    try {
      await registry.ping();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'not-ready', reason: 'registry database unavailable' });
    }
  });

  // Aggregate dashboard view (used by the portal, not by k8s probes).
  fastify.get('/api/v1/health', async () => {
    const checks = await Promise.all([
      registry.ping().then(() => ({ name: 'platform-db', status: 'healthy' })).catch(() => ({ name: 'platform-db', status: 'offline' })),
      checkService('kafka-portal', 'http://kafka-portal:3001/api/health'),
      checkService('cache-portal', 'http://cache-portal:3002/api/health'),
      checkService('storage-portal', 'http://storage-portal:3004/api/health'),
      checkService('keycloak', `${config.keycloak.url}/health/ready`),
      checkService('opa', `${config.opa.url}/health`),
      checkService('kong', `${config.kong.adminUrl}/status`),
    ]);

    const healthy = checks.filter(c => c.status === 'healthy').length;
    const total = checks.length;

    return {
      status: healthy === total ? 'healthy' : healthy > 0 ? 'degraded' : 'unhealthy',
      score: Math.round((healthy / total) * 100),
      services: checks,
    };
  });
}

module.exports = routes;
