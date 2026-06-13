const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const config = require('./config');
const registry = require('./db/registry');
const { authHook } = require('./auth');

async function start() {
  // Ensure the registry schema exists before serving traffic. Idempotent, so
  // it is safe whether or not the database-server init script already ran.
  await registry.ensureSchema();
  // Apply the multi-tenancy migration (tenants / members / api tokens / tenant_id).
  await registry.runMigrations();
  // Hash-chain any pre-existing audit rows so the tamper-evident chain is complete.
  const backfilled = await registry.backfillAuditChain();
  if (backfilled) fastify.log.info(`Backfilled ${backfilled} audit entries into the hash chain`);
  if (config.apiToken) {
    fastify.log.info('Control-plane auth ENABLED (bearer token required)');
  } else {
    fastify.log.warn('Control-plane auth DISABLED — set PLATFORM_API_TOKEN to require a bearer token');
  }

  // CORS for portal access
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Require a bearer token on all routes when PLATFORM_API_TOKEN is set.
  fastify.addHook('onRequest', authHook);

  // Register routes
  await fastify.register(require('./routes/tenants'));
  await fastify.register(require('./routes/apps'));
  await fastify.register(require('./routes/teams'));
  await fastify.register(require('./routes/environments'));
  await fastify.register(require('./routes/audit'));
  await fastify.register(require('./routes/health'));

  // Root endpoint
  fastify.get('/', async () => ({
    service: 'Platform API',
    version: '1.0.0',
    docs: '/api/v1/health',
  }));

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Platform API running on port ${config.port}`);
}

start().catch((err) => {
  console.error('Failed to start Platform API:', err);
  process.exit(1);
});
