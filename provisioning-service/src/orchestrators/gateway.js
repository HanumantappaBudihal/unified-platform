'use strict';

const config = require('../config');

// Provisions a Kong gateway service + route for an app, exposing it at
// `/api/<env>/<slug>` and pointing upstream at the app's in-cluster hostname.
// A rate-limiting plugin is attached as a sane default.

async function kong(path, options = {}) {
  const res = await fetch(`${config.gateway.adminUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res;
}

async function kongOrThrow(path, options, what) {
  const res = await kong(path, options);
  if (!res.ok) throw new Error(`Kong ${what} failed: ${res.status} ${await res.text()}`);
  return res;
}

async function provision(slug, environment, opts = {}) {
  const serviceName = `${slug}-${environment}`;
  const routeName = `${serviceName}-route`;
  const routePath = `/api/${environment}/${slug}`;
  const upstreamPort = opts.upstreamPort || 3000;
  const upstreamUrl = opts.upstreamUrl || `http://${serviceName}:${upstreamPort}`;

  // Service (PUT = create-or-update / idempotent).
  await kongOrThrow(`/services/${serviceName}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: serviceName,
      url: upstreamUrl,
      connect_timeout: 5000,
      read_timeout: 30000,
      write_timeout: 30000,
    }),
  }, 'service');

  // Route.
  await kongOrThrow(`/services/${serviceName}/routes/${routeName}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: routeName,
      paths: [routePath],
      strip_path: true,
      preserve_host: false,
    }),
  }, 'route');

  // Rate-limiting plugin (best-effort; ignore "already exists" conflicts).
  await kong(`/services/${serviceName}/plugins`, {
    method: 'POST',
    body: JSON.stringify({ name: 'rate-limiting', config: { minute: 300, policy: 'local' } }),
  }).catch(() => {});

  return {
    config: { service: serviceName, route: routeName, path: routePath, upstream: upstreamUrl },
    credentials: { path: routePath },
  };
}

async function decommission(slug, environment) {
  const serviceName = `${slug}-${environment}`;
  const routeName = `${serviceName}-route`;
  // Routes must be removed before their service.
  await kong(`/services/${serviceName}/routes/${routeName}`, { method: 'DELETE' }).catch(() => {});
  await kong(`/services/${serviceName}`, { method: 'DELETE' }).catch(() => {});
  return { removed: { service: serviceName, route: routeName } };
}

module.exports = { provision, decommission };
