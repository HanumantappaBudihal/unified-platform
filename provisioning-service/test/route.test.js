'use strict';

// Route-level tests for tenant binding + request validation. These paths short-circuit
// before any orchestrator runs, so they need no backing services. Run: npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const Fastify = require('fastify');

const provisionRoutes = require('../src/routes/provision');

// Build an app with a pre-set platform identity (as the auth hook would do).
async function appWithIdentity(identity) {
  const app = Fastify();
  if (identity) app.addHook('onRequest', async (req) => { req.platformIdentity = identity; });
  await app.register(provisionRoutes);
  return app;
}

test('provision rejects a tenant that does not match the token tenant (403)', async () => {
  const app = await appWithIdentity({ tenant: 'acme' });
  const res = await app.inject({
    method: 'POST', url: '/v1/provision',
    payload: { app: 'orders-api', tenant: 'globex', resources: ['postgres'] },
  });
  assert.equal(res.statusCode, 403);
  await app.close();
});

test('provision allows a tenant that matches the token tenant (case/format-insensitive)', async () => {
  // No identity hook here would skip binding; instead set a matching tenant and use an
  // empty resource set is not possible (defaults to all). Use a mismatch-proof match:
  const app = await appWithIdentity({ tenant: 'ACME' });
  // tenant 'acme' slug-matches token 'ACME' → binding passes; with an unknown resource
  // the orchestrator layer reports a per-resource error (no network), still HTTP 502.
  const res = await app.inject({
    method: 'POST', url: '/v1/provision',
    payload: { app: 'orders-api', tenant: 'acme', resources: ['does-not-exist'] },
  });
  assert.notEqual(res.statusCode, 403); // binding passed (not forbidden)
  await app.close();
});

test('provision requires an app name (400)', async () => {
  const app = await appWithIdentity(null);
  const res = await app.inject({ method: 'POST', url: '/v1/provision', payload: { tenant: 'acme' } });
  assert.equal(res.statusCode, 400);
  await app.close();
});
