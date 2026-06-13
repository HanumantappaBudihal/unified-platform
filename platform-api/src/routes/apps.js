const registry = require('../db/registry');
const { onboardApp, decommissionApp } = require('../orchestrators');
const { requireRole, resolveTenant } = require('../rbac');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Resolve the acting tenant for the request, or send 400 and return null.
async function tenantOr400(req, reply) {
  const t = await resolveTenant(req);
  if (!t) {
    reply.code(400).send({ error: 'Unknown tenant. Superadmin must pass ?tenant=<slug>.' });
    return null;
  }
  return t;
}

async function routes(fastify) {
  // List all apps (tenant-scoped)
  fastify.get('/api/v1/apps', { preHandler: requireRole('viewer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const apps = await registry.listApps({ tenantId: t.tenantId, status: req.query.status });

    const enriched = await Promise.all(
      apps.map(async (app) => {
        const resources = await registry.getAppResources(app.id);
        return {
          ...app,
          resources: resources.map(r => ({ type: r.resource_type, environment: r.environment, status: r.status })),
        };
      })
    );
    return { apps: enriched };
  });

  // Get single app (tenant-scoped)
  fastify.get('/api/v1/apps/:slug', { preHandler: requireRole('viewer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const resources = await registry.getAppResources(app.id);
    return { app, resources };
  });

  // Register new app (within the caller's tenant)
  fastify.post('/api/v1/apps', { preHandler: requireRole('developer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const { name, description, ownerId, teamId } = req.body || {};
    if (!name || !ownerId) {
      return reply.code(400).send({ error: 'name and ownerId are required' });
    }

    const slug = slugify(name);
    if (await registry.getApp(slug, t.tenantId)) {
      return reply.code(409).send({ error: `App "${slug}" already exists in this tenant` });
    }

    const app = await registry.createApp({ name, slug, description, ownerId, teamId, tenantId: t.tenantId });

    await registry.log({
      actor: req.identity.actor, action: 'app.registered', resourceType: 'app',
      resourceId: slug, details: { name, teamId }, tenantId: t.tenantId,
    });

    return reply.code(201).send({ app });
  });

  // Onboard app (provision all resources)
  fastify.post('/api/v1/apps/:slug/onboard', { preHandler: requireRole('developer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { resources, environment } = req.body || {};
    const result = await onboardApp(app, {
      resources: resources || ['postgres', 'redis', 'kafka', 'minio'],
      environment: environment || 'dev',
      tenantSlug: t.tenantSlug,
      actor: req.identity.actor,
    });

    return reply.code(result.errors.length === 0 ? 200 : 207).send(result);
  });

  // Add specific resource to app
  fastify.post('/api/v1/apps/:slug/resources', { preHandler: requireRole('developer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { resourceType, environment } = req.body || {};
    if (!resourceType) return reply.code(400).send({ error: 'resourceType is required' });

    const { orchestrators } = require('../orchestrators');
    const orchestrator = orchestrators[resourceType];
    if (!orchestrator) return reply.code(400).send({ error: `Unknown resource type: ${resourceType}` });

    const env = environment || 'dev';
    const qualified = `${t.tenantSlug}-${app.slug}`;
    const result = await orchestrator.provision(qualified, env);

    await registry.addResource({
      appId: app.id, tenantId: t.tenantId, resourceType, environment: env,
      resourceConfig: result.config, credentials: result.credentials,
    });
    await registry.log({
      actor: req.identity.actor, action: 'resource.added', resourceType,
      resourceId: app.slug, details: { environment: env }, tenantId: t.tenantId,
    });

    return reply.code(201).send({ resource: result });
  });

  // Remove specific resource
  fastify.delete('/api/v1/apps/:slug/resources/:type', { preHandler: requireRole('admin') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { type } = req.params;
    const environment = req.query.environment || 'dev';

    const { orchestrators } = require('../orchestrators');
    const orchestrator = orchestrators[type];
    if (orchestrator?.deprovision) {
      await orchestrator.deprovision(`${t.tenantSlug}-${app.slug}`, environment);
    }
    await registry.removeResource(app.id, type, environment);
    await registry.log({
      actor: req.identity.actor, action: 'resource.removed', resourceType: type,
      resourceId: app.slug, details: { environment }, tenantId: t.tenantId,
    });

    return { success: true };
  });

  // Decommission app
  fastify.delete('/api/v1/apps/:slug', { preHandler: requireRole('admin') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const environment = req.query.environment || 'dev';
    const result = await decommissionApp(app, { environment, tenantSlug: t.tenantSlug, actor: req.identity.actor });
    return result;
  });

  // Get environment summary for an app
  fastify.get('/api/v1/apps/:slug/environments', { preHandler: requireRole('viewer') }, async (req, reply) => {
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const allResources = await registry.getAppResources(app.id);
    const environments = await registry.listEnvironments();

    const envMap = {};
    for (const env of environments) {
      envMap[env.slug] = { ...env, resources: [], provisioned: false, resourceCount: 0 };
    }
    for (const r of allResources) {
      if (envMap[r.environment]) {
        envMap[r.environment].resources.push({ type: r.resource_type, status: r.status, provisioned_at: r.provisioned_at });
        envMap[r.environment].provisioned = true;
        envMap[r.environment].resourceCount++;
      }
    }
    return { app: { slug: app.slug, name: app.name }, environments: Object.values(envMap) };
  });

  // Promote app to another environment
  fastify.post('/api/v1/apps/:slug/promote/:env', { preHandler: requireRole('developer') }, async (req, reply) => {
    const ENV_ORDER = ['dev', 'staging', 'prod'];
    const t = await tenantOr400(req, reply);
    if (!t) return;
    const app = await registry.getApp(req.params.slug, t.tenantId);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const targetEnv = req.params.env;
    const sourceEnv = req.body?.sourceEnvironment || 'dev';

    if (!ENV_ORDER.includes(targetEnv)) {
      return reply.code(400).send({ error: `Invalid target environment: ${targetEnv}. Must be one of: ${ENV_ORDER.join(', ')}` });
    }
    if (!ENV_ORDER.includes(sourceEnv)) {
      return reply.code(400).send({ error: `Invalid source environment: ${sourceEnv}` });
    }
    if (ENV_ORDER.indexOf(targetEnv) <= ENV_ORDER.indexOf(sourceEnv)) {
      return reply.code(400).send({ error: `Cannot promote from ${sourceEnv} to ${targetEnv}. Promotion must go forward: dev → staging → prod` });
    }

    const sourceResources = await registry.getAppResources(app.id, sourceEnv);
    const dataResources = sourceResources
      .filter(r => ['postgres', 'redis', 'kafka', 'minio'].includes(r.resource_type))
      .map(r => r.resource_type);
    if (dataResources.length === 0) {
      return reply.code(400).send({ error: `No resources found in ${sourceEnv} environment` });
    }

    const targetResources = await registry.getAppResources(app.id, targetEnv);
    if (targetResources.length > 0 && !req.body?.force) {
      return reply.code(409).send({
        error: `App already has resources in ${targetEnv}. Send { "force": true } to re-provision.`,
        existingResources: targetResources.map(r => r.resource_type),
      });
    }

    const result = await onboardApp(app, {
      resources: dataResources, environment: targetEnv, tenantSlug: t.tenantSlug, actor: req.identity.actor,
    });
    await registry.log({
      actor: req.identity.actor, action: 'app.promoted', resourceType: 'app',
      resourceId: app.slug, details: { from: sourceEnv, to: targetEnv, resources: dataResources }, tenantId: t.tenantId,
    });
    return result;
  });
}

module.exports = routes;
