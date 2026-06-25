'use strict';

// Seam tests for the Platform-introspection auth path. Run: npm test
// Uses node:test (built-in) and a stubbed global.fetch — no network, no backing services.

// Configure introspection BEFORE requiring config (it reads env at load time).
process.env.PLATFORM_INTROSPECT_URL = 'http://platform/connect/introspect';
process.env.PLATFORM_CLIENT_ID = 'infra-provisioning';
process.env.PLATFORM_CLIENT_SECRET = 'secret';
process.env.PLATFORM_REQUIRED_SCOPE = 'infra.provision';

const test = require('node:test');
const assert = require('node:assert/strict');

const platformAuth = require('../src/platformAuth');
const { authHook } = require('../src/auth');

// Build a fake JWT (header.payload.signature) carrying the given payload object.
function jwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

// Stub global.fetch to return a fixed introspection response.
function stubIntrospection(response, { ok = true, status = 200 } = {}) {
  global.fetch = async () => ({ ok, status, json: async () => response });
}

function fakeReplyReq(token) {
  const reply = {
    statusCode: null, body: null,
    code(c) { this.statusCode = c; return this; },
    send(b) { this.body = b; return this; },
  };
  const req = { url: '/v1/provision', headers: token ? { authorization: `Bearer ${token}` } : {} };
  return { req, reply };
}

test('enabled() true when introspection env is set', () => {
  assert.equal(platformAuth.enabled(), true);
});

test('valid active token with required scope + tenant → ok', async () => {
  const token = jwt({ sub: 'svc', scope: 'infra.provision', tenant: 'acme' });
  stubIntrospection({ active: true });
  const result = await platformAuth.validate(token);
  assert.equal(result.ok, true);
  assert.equal(result.tenant, 'acme');
  assert.deepEqual(result.scopes, ['infra.provision']);
});

test('inactive token → 401', async () => {
  stubIntrospection({ active: false });
  const result = await platformAuth.validate(jwt({ scope: 'infra.provision' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('active token missing required scope → 403', async () => {
  stubIntrospection({ active: true });
  const result = await platformAuth.validate(jwt({ scope: 'audit:api' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('tenant read from introspection response when token is opaque (prod/encrypted)', async () => {
  // Opaque token (not a 3-part JWT) → falls back to introspection response claims.
  stubIntrospection({ active: true, scope: 'infra.provision', tenant: 'globex' });
  const result = await platformAuth.validate('opaque-encrypted-token');
  assert.equal(result.ok, true);
  assert.equal(result.tenant, 'globex');
});

test('authHook attaches platformIdentity on success', async () => {
  const token = jwt({ sub: 'svc', scope: 'infra.provision', tenant: 'acme' });
  stubIntrospection({ active: true });
  const { req, reply } = fakeReplyReq(token);
  await authHook(req, reply);
  assert.equal(reply.statusCode, null); // not rejected
  assert.equal(req.platformIdentity.tenant, 'acme');
});

test('authHook rejects when scope missing', async () => {
  stubIntrospection({ active: true });
  const { req, reply } = fakeReplyReq(jwt({ scope: 'audit:api' }));
  await authHook(req, reply);
  assert.equal(reply.statusCode, 403);
});

test('authHook leaves /health public', async () => {
  const reply = { statusCode: null, code(c) { this.statusCode = c; return this; }, send() { return this; } };
  await authHook({ url: '/health', headers: {} }, reply);
  assert.equal(reply.statusCode, null);
});
