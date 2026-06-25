'use strict';

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const config = require('./config');
const { authHook } = require('./auth');
const platformAuth = require('./platformAuth');

async function start() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });

  if (platformAuth.enabled()) {
    fastify.log.info(
      `Provisioning API auth ENABLED (Seiton Platform introspection; required scope '${config.platform.requiredScope}')`
    );
  } else if (config.apiToken) {
    fastify.log.info('Provisioning API auth ENABLED (legacy static bearer token)');
  } else {
    fastify.log.warn(
      'Provisioning API auth DISABLED — configure PLATFORM_INTROSPECT_URL/CLIENT_ID/CLIENT_SECRET ' +
      '(or PROVISIONING_API_TOKEN) to require authentication'
    );
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
