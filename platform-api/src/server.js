const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const config = require('./config');

async function start() {
  // CORS for portal access
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register routes
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
