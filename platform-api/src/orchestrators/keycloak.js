const config = require('../config');

let accessToken = null;
let tokenExpiry = 0;

async function getAdminToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const res = await fetch(
    `${config.keycloak.url}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'admin-cli',
        username: config.keycloak.adminUser,
        password: config.keycloak.adminPassword,
        grant_type: 'password',
      }),
    }
  );

  if (!res.ok) throw new Error(`Keycloak auth failed: ${res.status}`);
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 30) * 1000;
  return accessToken;
}

async function kcFetch(path, options = {}) {
  const token = await getAdminToken();
  const res = await fetch(`${config.keycloak.url}/admin/realms/${config.keycloak.realm}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function provision(appSlug, environment = 'dev') {
  const clientId = `${appSlug}-${environment}`;

  // Check if client already exists
  const existing = await kcFetch(`/clients?clientId=${clientId}`);
  const existingClients = await existing.json();

  if (existingClients.length > 0) {
    return {
      config: { clientId, realm: config.keycloak.realm },
      credentials: { clientId, realm: config.keycloak.realm },
    };
  }

  // Create OIDC client
  const clientDef = {
    clientId,
    name: `${appSlug} (${environment})`,
    enabled: true,
    protocol: 'openid-connect',
    publicClient: false,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    redirectUris: ['*'],
    webOrigins: ['*'],
    defaultClientScopes: ['openid', 'profile', 'email', 'roles'],
  };

  const res = await kcFetch('/clients', {
    method: 'POST',
    body: JSON.stringify(clientDef),
  });

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to create Keycloak client: ${res.status} ${await res.text()}`);
  }

  // Get client secret
  const clients = await kcFetch(`/clients?clientId=${clientId}`);
  const [client] = await clients.json();

  let clientSecret = null;
  if (client) {
    const secretRes = await kcFetch(`/clients/${client.id}/client-secret`);
    if (secretRes.ok) {
      const secretData = await secretRes.json();
      clientSecret = secretData.value;
    }
  }

  return {
    config: { clientId, realm: config.keycloak.realm },
    credentials: {
      clientId,
      clientSecret,
      realm: config.keycloak.realm,
      issuerUrl: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
    },
  };
}

async function deprovision(appSlug, environment = 'dev') {
  const clientId = `${appSlug}-${environment}`;

  const existing = await kcFetch(`/clients?clientId=${clientId}`);
  const clients = await existing.json();

  if (clients.length > 0) {
    await kcFetch(`/clients/${clients[0].id}`, { method: 'DELETE' });
  }
}

module.exports = { provision, deprovision };
