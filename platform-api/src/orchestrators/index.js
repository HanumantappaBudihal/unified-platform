const postgres = require('./postgres');
const redis = require('./redis');
const kafka = require('./kafka');
const minio = require('./minio');
const keycloak = require('./keycloak');
const opa = require('./opa');
const kong = require('./kong');
const registry = require('../db/registry');

const orchestrators = { postgres, redis, kafka, minio, keycloak, opa, kong };

// Resources are namespaced per tenant so two tenants can both have an app called
// "orders-api" without colliding on the shared backing services.
function qualifiedSlug(app, tenantSlug) {
  return tenantSlug ? `${tenantSlug}-${app.slug}` : app.slug;
}

async function onboardApp(app, { resources = ['postgres', 'redis', 'kafka', 'minio'], environment = 'dev', tenantSlug, actor } = {}) {
  const results = {};
  const errors = [];
  const slug = qualifiedSlug(app, tenantSlug);

  const record = async (type, res) => {
    await registry.addResource({
      appId: app.id, tenantId: app.tenant_id, resourceType: type, environment,
      resourceConfig: res.config, credentials: res.credentials,
    });
  };

  // Always provision auth (Keycloak + OPA)
  try {
    results.keycloak = await keycloak.provision(slug, environment);
    await record('keycloak', results.keycloak);
  } catch (e) { errors.push({ service: 'keycloak', error: e.message }); }

  try {
    results.opa = await opa.provision(slug, environment, app.owner_id);
    await record('opa', results.opa);
  } catch (e) { errors.push({ service: 'opa', error: e.message }); }

  // Provision requested data resources
  for (const resource of resources) {
    const orchestrator = orchestrators[resource];
    if (!orchestrator) {
      errors.push({ service: resource, error: `Unknown resource type: ${resource}` });
      continue;
    }
    try {
      results[resource] = await orchestrator.provision(slug, environment);
      await record(resource, results[resource]);
    } catch (e) { errors.push({ service: resource, error: e.message }); }
  }

  // Always provision Kong route
  try {
    results.kong = await kong.provision(slug, environment);
    await record('kong', results.kong);
  } catch (e) { errors.push({ service: 'kong', error: e.message }); }

  await registry.updateAppStatus(app.id, errors.length === 0 ? 'active' : 'partial');

  await registry.log({
    actor: actor || app.owner_id, action: 'app.onboarded', resourceType: 'app',
    resourceId: app.slug, tenantId: app.tenant_id,
    details: { environment, resources, provisionedCount: Object.keys(results).length, errorCount: errors.length },
  });

  return { results, errors };
}

async function decommissionApp(app, { environment = 'dev', tenantSlug, actor } = {}) {
  if (!app) throw new Error('App is required');
  const slug = qualifiedSlug(app, tenantSlug);

  const appResources = await registry.getAppResources(app.id, environment);
  const errors = [];

  for (const resource of appResources) {
    const orchestrator = orchestrators[resource.resource_type];
    if (!orchestrator?.deprovision) continue;
    try {
      await orchestrator.deprovision(slug, environment);
      await registry.removeResource(app.id, resource.resource_type, environment, app.tenant_id);
    } catch (e) { errors.push({ service: resource.resource_type, error: e.message }); }
  }

  // If no resources remain in any environment, mark the app decommissioned.
  const remaining = await registry.getAppResources(app.id);
  if (remaining.length === 0) {
    await registry.updateAppStatus(app.id, 'decommissioned');
  }

  await registry.log({
    actor: actor || app.owner_id, action: 'app.decommissioned', resourceType: 'app',
    resourceId: app.slug, tenantId: app.tenant_id, details: { environment, errorCount: errors.length },
  });

  return { errors };
}

module.exports = { onboardApp, decommissionApp, orchestrators };
