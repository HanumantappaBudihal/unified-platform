'use strict';

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const config = require('./config');
const { authHook } = require('./auth');

async function start() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });

  if (config.apiToken) {
    fastify.log.info('Provisioning API auth ENABLED (bearer token required)');
  } else {
    fastify.log.warn('Provisioning API auth DISABLED — set PROVISIONING_API_TOKEN to require a bearer token');
  }
  fastify.addHook('onRequest', authHook);

  await fastify.register(require('./routes/health'));
  await fastify.register(require('./routes/provision'));

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start provisioning-service:', err);
  process.exit(1);
});
