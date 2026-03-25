const config = require('../config');

async function opaFetch(path, options = {}) {
  const res = await fetch(`${config.opa.url}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res;
}

async function provision(appSlug, environment = 'dev', ownerId) {
  // Get current roles data from OPA
  const res = await opaFetch('/v1/data/roles');
  let rolesData = {};

  if (res.ok) {
    const data = await res.json();
    rolesData = data.result || {};
  }

  // Ensure users structure exists
  if (!rolesData.users) rolesData.users = {};

  // Add owner with app-owner role for this app
  if (!rolesData.users[ownerId]) {
    rolesData.users[ownerId] = { global_roles: [], apps: {} };
  }

  const appKey = `${appSlug}-${environment}`;
  rolesData.users[ownerId].apps[appKey] = {
    role: 'app-owner',
    projects: {},
  };

  // Push updated data back to OPA
  const updateRes = await opaFetch('/v1/data/roles', {
    method: 'PUT',
    body: JSON.stringify(rolesData),
  });

  if (!updateRes.ok) {
    throw new Error(`Failed to update OPA roles: ${updateRes.status}`);
  }

  return {
    config: { appKey, opaEndpoint: config.opa.url },
    credentials: {
      opaEndpoint: `${config.opa.url}/v1/data/authz/allow`,
      appKey,
    },
  };
}

async function deprovision(appSlug, environment = 'dev') {
  const appKey = `${appSlug}-${environment}`;

  const res = await opaFetch('/v1/data/roles');
  if (!res.ok) return;

  const data = await res.json();
  const rolesData = data.result || {};

  if (rolesData.users) {
    for (const userId of Object.keys(rolesData.users)) {
      if (rolesData.users[userId].apps?.[appKey]) {
        delete rolesData.users[userId].apps[appKey];
      }
    }
  }

  await opaFetch('/v1/data/roles', {
    method: 'PUT',
    body: JSON.stringify(rolesData),
  });
}

module.exports = { provision, deprovision };
