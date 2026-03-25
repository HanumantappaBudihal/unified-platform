const postgres = require('./postgres');
const redis = require('./redis');
const kafka = require('./kafka');
const minio = require('./minio');
const keycloak = require('./keycloak');
const opa = require('./opa');
const kong = require('./kong');
const registry = require('../db/registry');

const orchestrators = { postgres, redis, kafka, minio, keycloak, opa, kong };

async function onboardApp(app, { resources = ['postgres', 'redis', 'kafka', 'minio'], environment = 'dev' } = {}) {
  const results = {};
  const errors = [];

  // Always provision auth (Keycloak + OPA)
  try {
    results.keycloak = await keycloak.provision(app.slug, environment);
    await registry.addResource({
      appId: app.id,
      resourceType: 'keycloak',
      environment,
      resourceConfig: results.keycloak.config,
      credentials: results.keycloak.credentials,
    });
  } catch (e) {
    errors.push({ service: 'keycloak', error: e.message });
  }

  try {
    results.opa = await opa.provision(app.slug, environment, app.owner_id);
    await registry.addResource({
      appId: app.id,
      resourceType: 'opa',
      environment,
      resourceConfig: results.opa.config,
      credentials: results.opa.credentials,
    });
  } catch (e) {
    errors.push({ service: 'opa', error: e.message });
  }

  // Provision requested data resources
  for (const resource of resources) {
    const orchestrator = orchestrators[resource];
    if (!orchestrator) {
      errors.push({ service: resource, error: `Unknown resource type: ${resource}` });
      continue;
    }

    try {
      results[resource] = await orchestrator.provision(app.slug, environment);
      await registry.addResource({
        appId: app.id,
        resourceType: resource,
        environment,
        resourceConfig: results[resource].config,
        credentials: results[resource].credentials,
      });
    } catch (e) {
      errors.push({ service: resource, error: e.message });
    }
  }

  // Always provision Kong route
  try {
    results.kong = await kong.provision(app.slug, environment);
    await registry.addResource({
      appId: app.id,
      resourceType: 'kong',
      environment,
      resourceConfig: results.kong.config,
      credentials: results.kong.credentials,
    });
  } catch (e) {
    errors.push({ service: 'kong', error: e.message });
  }

  // Update app status
  await registry.updateAppStatus(app.slug, errors.length === 0 ? 'active' : 'partial');

  // Audit
  await registry.log({
    actor: app.owner_id,
    action: 'app.onboarded',
    resourceType: 'app',
    resourceId: app.slug,
    details: {
      environment,
      resources,
      provisionedCount: Object.keys(results).length,
      errorCount: errors.length,
    },
  });

  return { results, errors };
}

async function decommissionApp(appSlug, environment = 'dev') {
  const app = await registry.getApp(appSlug);
  if (!app) throw new Error(`App not found: ${appSlug}`);

  const appResources = await registry.getAppResources(app.id, environment);
  const errors = [];

  for (const resource of appResources) {
    const orchestrator = orchestrators[resource.resource_type];
    if (!orchestrator?.deprovision) continue;

    try {
      await orchestrator.deprovision(appSlug, environment);
      await registry.removeResource(app.id, resource.resource_type, environment);
    } catch (e) {
      errors.push({ service: resource.resource_type, error: e.message });
    }
  }

  // If no resources left in any environment, mark app as decommissioned
  const remaining = await registry.getAppResources(app.id);
  if (remaining.length === 0) {
    await registry.updateAppStatus(appSlug, 'decommissioned');
  }

  await registry.log({
    actor: app.owner_id,
    action: 'app.decommissioned',
    resourceType: 'app',
    resourceId: appSlug,
    details: { environment, errorCount: errors.length },
  });

  return { errors };
}

module.exports = { onboardApp, decommissionApp, orchestrators };
