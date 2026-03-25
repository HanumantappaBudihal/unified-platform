const config = require('../config');

async function kongFetch(path, options = {}) {
  const res = await fetch(`${config.kong.adminUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res;
}

async function provision(appSlug, environment = 'dev', appPort) {
  const serviceName = `${appSlug}-${environment}`;
  const routePath = `/api/${environment}/${appSlug}`;
  // Default upstream — apps are expected to register on this hostname
  const upstreamUrl = `http://${appSlug}-${environment}:${appPort || 3000}`;

  // Create or update service
  const svcRes = await kongFetch(`/services/${serviceName}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: serviceName,
      url: upstreamUrl,
      connect_timeout: 5000,
      read_timeout: 30000,
      write_timeout: 30000,
    }),
  });

  if (!svcRes.ok) {
    throw new Error(`Kong service creation failed: ${svcRes.status} ${await svcRes.text()}`);
  }

  // Create route
  const routeName = `${serviceName}-route`;
  const routeRes = await kongFetch(`/services/${serviceName}/routes/${routeName}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: routeName,
      paths: [routePath],
      strip_path: true,
      preserve_host: false,
    }),
  });

  if (!routeRes.ok) {
    throw new Error(`Kong route creation failed: ${routeRes.status} ${await routeRes.text()}`);
  }

  // Add rate limiting plugin
  await kongFetch(`/services/${serviceName}/plugins`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'rate-limiting',
      config: {
        minute: 300,
        hour: 10000,
        policy: 'local',
        fault_tolerant: true,
      },
    }),
  });

  return {
    config: {
      service: serviceName,
      route: routePath,
      upstream: upstreamUrl,
    },
    credentials: {
      gatewayUrl: `http://localhost:8000${routePath}`,
      routePath,
    },
  };
}

async function deprovision(appSlug, environment = 'dev') {
  const serviceName = `${appSlug}-${environment}`;
  const routeName = `${serviceName}-route`;

  // Delete route first
  await kongFetch(`/routes/${routeName}`, { method: 'DELETE' });
  // Then delete service
  await kongFetch(`/services/${serviceName}`, { method: 'DELETE' });
}

module.exports = { provision, deprovision };
