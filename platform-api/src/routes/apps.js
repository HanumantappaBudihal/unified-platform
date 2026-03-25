const registry = require('../db/registry');
const { onboardApp, decommissionApp } = require('../orchestrators');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function routes(fastify) {
  // List all apps
  fastify.get('/api/v1/apps', async (req) => {
    const { team, status } = req.query;
    const apps = await registry.listApps({ teamId: team, status });

    // Attach resource summary to each app
    const enriched = await Promise.all(
      apps.map(async (app) => {
        const resources = await registry.getAppResources(app.id);
        return {
          ...app,
          resources: resources.map(r => ({
            type: r.resource_type,
            environment: r.environment,
            status: r.status,
          })),
        };
      })
    );

    return { apps: enriched };
  });

  // Get single app
  fastify.get('/api/v1/apps/:slug', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const resources = await registry.getAppResources(app.id);
    return { app, resources };
  });

  // Register new app
  fastify.post('/api/v1/apps', async (req, reply) => {
    const { name, description, ownerId, teamId } = req.body;
    if (!name || !ownerId) {
      return reply.code(400).send({ error: 'name and ownerId are required' });
    }

    const slug = slugify(name);
    const existing = await registry.getApp(slug);
    if (existing) {
      return reply.code(409).send({ error: `App "${slug}" already exists` });
    }

    const app = await registry.createApp({ name, slug, description, ownerId, teamId });

    await registry.log({
      actor: ownerId,
      action: 'app.registered',
      resourceType: 'app',
      resourceId: slug,
      details: { name, teamId },
    });

    return reply.code(201).send({ app });
  });

  // Onboard app (provision all resources)
  fastify.post('/api/v1/apps/:slug/onboard', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { resources, environment } = req.body || {};

    const result = await onboardApp(app, {
      resources: resources || ['postgres', 'redis', 'kafka', 'minio'],
      environment: environment || 'dev',
    });

    const status = result.errors.length === 0 ? 200 : 207;
    return reply.code(status).send(result);
  });

  // Add specific resource to app
  fastify.post('/api/v1/apps/:slug/resources', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { resourceType, environment } = req.body;
    if (!resourceType) {
      return reply.code(400).send({ error: 'resourceType is required' });
    }

    const { orchestrators } = require('../orchestrators');
    const orchestrator = orchestrators[resourceType];
    if (!orchestrator) {
      return reply.code(400).send({ error: `Unknown resource type: ${resourceType}` });
    }

    const env = environment || 'dev';
    const result = await orchestrator.provision(app.slug, env);

    await registry.addResource({
      appId: app.id,
      resourceType,
      environment: env,
      resourceConfig: result.config,
      credentials: result.credentials,
    });

    await registry.log({
      actor: app.owner_id,
      action: 'resource.added',
      resourceType,
      resourceId: app.slug,
      details: { environment: env },
    });

    return reply.code(201).send({ resource: result });
  });

  // Remove specific resource
  fastify.delete('/api/v1/apps/:slug/resources/:type', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const { type } = req.params;
    const environment = req.query.environment || 'dev';

    const { orchestrators } = require('../orchestrators');
    const orchestrator = orchestrators[type];
    if (orchestrator?.deprovision) {
      await orchestrator.deprovision(app.slug, environment);
    }

    await registry.removeResource(app.id, type, environment);

    await registry.log({
      actor: app.owner_id,
      action: 'resource.removed',
      resourceType: type,
      resourceId: app.slug,
      details: { environment },
    });

    return { success: true };
  });

  // Decommission app
  fastify.delete('/api/v1/apps/:slug', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const environment = req.query.environment || 'dev';
    const result = await decommissionApp(req.params.slug, environment);

    return result;
  });

  // Get environment summary for an app
  fastify.get('/api/v1/apps/:slug/environments', async (req, reply) => {
    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const allResources = await registry.getAppResources(app.id);
    const environments = await registry.listEnvironments();

    // Group resources by environment
    const envMap = {};
    for (const env of environments) {
      envMap[env.slug] = {
        ...env,
        resources: [],
        provisioned: false,
        resourceCount: 0,
      };
    }

    for (const r of allResources) {
      if (envMap[r.environment]) {
        envMap[r.environment].resources.push({
          type: r.resource_type,
          status: r.status,
          provisioned_at: r.provisioned_at,
        });
        envMap[r.environment].provisioned = true;
        envMap[r.environment].resourceCount++;
      }
    }

    return { app: { slug: app.slug, name: app.name }, environments: Object.values(envMap) };
  });

  // Promote app to another environment
  fastify.post('/api/v1/apps/:slug/promote/:env', async (req, reply) => {
    const ENV_ORDER = ['dev', 'staging', 'prod'];

    const app = await registry.getApp(req.params.slug);
    if (!app) return reply.code(404).send({ error: 'App not found' });

    const targetEnv = req.params.env;
    const sourceEnv = req.body?.sourceEnvironment || 'dev';

    // Validate environment names
    if (!ENV_ORDER.includes(targetEnv)) {
      return reply.code(400).send({ error: `Invalid target environment: ${targetEnv}. Must be one of: ${ENV_ORDER.join(', ')}` });
    }
    if (!ENV_ORDER.includes(sourceEnv)) {
      return reply.code(400).send({ error: `Invalid source environment: ${sourceEnv}` });
    }

    // Enforce promotion order: can only promote forward
    const sourceIdx = ENV_ORDER.indexOf(sourceEnv);
    const targetIdx = ENV_ORDER.indexOf(targetEnv);
    if (targetIdx <= sourceIdx) {
      return reply.code(400).send({ error: `Cannot promote from ${sourceEnv} to ${targetEnv}. Promotion must go forward: dev → staging → prod` });
    }

    // Check source has resources
    const sourceResources = await registry.getAppResources(app.id, sourceEnv);
    const dataResources = sourceResources
      .filter(r => ['postgres', 'redis', 'kafka', 'minio'].includes(r.resource_type))
      .map(r => r.resource_type);

    if (dataResources.length === 0) {
      return reply.code(400).send({ error: `No resources found in ${sourceEnv} environment` });
    }

    // Check if target already has resources (warn, allow with force flag)
    const targetResources = await registry.getAppResources(app.id, targetEnv);
    if (targetResources.length > 0 && !req.body?.force) {
      return reply.code(409).send({
        error: `App already has resources in ${targetEnv}. Send { "force": true } to re-provision.`,
        existingResources: targetResources.map(r => r.resource_type),
      });
    }

    const result = await onboardApp(app, {
      resources: dataResources,
      environment: targetEnv,
    });

    await registry.log({
      actor: app.owner_id,
      action: 'app.promoted',
      resourceType: 'app',
      resourceId: app.slug,
      details: { from: sourceEnv, to: targetEnv, resources: dataResources },
    });

    return result;
  });
}

module.exports = routes;
