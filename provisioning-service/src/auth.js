'use strict';

const config = require('./config');

// Bearer-token gate for the provisioning API. Seiton Platform calls this
// service machine-to-machine, so a single shared service token is sufficient;
// terminate TLS at the gateway/mesh in front of it. Health is always public.

const PUBLIC_PATHS = new Set(['/health', '/']);

async function authHook(req, reply) {
  if (PUBLIC_PATHS.has(req.url.split('?')[0])) return;

  // No token configured → open mode (dev only). server.js warns at boot.
  if (!config.apiToken) return;

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token || token !== config.apiToken) {
    reply.code(401).send({ error: 'Unauthorized: valid Bearer token required' });
  }
}

module.exports = { authHook };
