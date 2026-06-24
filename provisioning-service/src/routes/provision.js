'use strict';

const { qualifiedSlug } = require('../naming');
const { provisionApp, decommissionApp, ALL_TYPES } = require('../orchestrators');

// Validates the shared request body for provision/decommission. Returns a slug
// or sends a 400 and returns null.
function resolve(req, reply) {
  const { tenant, app, environment } = req.body || {};
  if (!app) {
    reply.code(400).send({ error: '`app` is required' });
    return null;
  }
  try {
    return { slug: qualifiedSlug(tenant, app), environment: environment || 'dev' };
  } catch (e) {
    reply.code(400).send({ error: e.message });
    return null;
  }
}

async function routes(fastify) {
  // POST /v1/provision
  // Body: { tenant, app, environment, resources: ["kafka", { type:"gateway", opts:{ upstreamPort } }] }
  fastify.post('/v1/provision', async (req, reply) => {
    const ctx = resolve(req, reply);
    if (!ctx) return;

    const resources = req.body.resources?.length ? req.body.resources : ALL_TYPES;
    const { results, errors } = await provisionApp(ctx.slug, { environment: ctx.environment, resources });

    // 207-style semantics: 200 when fully clean, 502 when anything failed, so
    // the caller can branch without parsing the body.
    reply.code(errors.length ? 502 : 200);
    return { slug: ctx.slug, environment: ctx.environment, provisioned: results, errors };
  });

  // POST /v1/decommission
  fastify.post('/v1/decommission', async (req, reply) => {
    const ctx = resolve(req, reply);
    if (!ctx) return;

    const resources = req.body.resources?.length ? req.body.resources : ALL_TYPES;
    const { results, errors } = await decommissionApp(ctx.slug, { environment: ctx.environment, resources });

    reply.code(errors.length ? 502 : 200);
    return { slug: ctx.slug, environment: ctx.environment, decommissioned: results, errors };
  });
}

module.exports = routes;
