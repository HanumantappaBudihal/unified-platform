'use strict';

const config = require('./config');

// Validates Seiton Platform-issued Bearer tokens via RFC 7662 introspection, then
// reads the scope (+ optional tenant) needed to authorize the provisioning call.
//
// Why introspection (not local JWKS verify): the Platform runs ephemeral signing
// keys in dev that rotate on every restart, so a cached JWKS would silently break.
// Introspection is rotation-proof and also catches revocation. We still parse the
// JWT payload afterwards for custom claims (scope/tenant) the Platform does not
// return in the introspection response by default — mirroring the Platform's own
// PlatformTokenValidationMiddleware. Fail-closed everywhere.

const enabled = () =>
  Boolean(config.platform.introspectUrl && config.platform.clientId && config.platform.clientSecret);

// base64url JWT payload → object, or null for encrypted/opaque tokens.
function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function scopesOf(source) {
  const raw = source && typeof source.scope === 'string' ? source.scope : '';
  return raw.split(' ').filter(Boolean);
}

// Returns { ok: true, sub, tenant, scopes } or { ok: false, status, error }.
async function validate(token) {
  if (!token) return { ok: false, status: 401, error: 'Bearer token required' };

  let introspection;
  try {
    const creds = Buffer.from(`${config.platform.clientId}:${config.platform.clientSecret}`).toString('base64');
    const res = await fetch(config.platform.introspectUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ token, token_type_hint: 'access_token' }).toString(),
    });
    if (!res.ok) return { ok: false, status: 401, error: `introspection failed (${res.status})` };
    introspection = await res.json();
  } catch (e) {
    // Fail closed: if we cannot reach the IdP we cannot trust the token.
    return { ok: false, status: 401, error: `introspection error: ${e.message}` };
  }

  if (introspection.active !== true) return { ok: false, status: 401, error: 'token inactive or revoked' };

  // Prefer JWT payload (carries custom claims in dev/unencrypted); fall back to the
  // introspection response (scope is a standard RFC 7662 field).
  const payload = parseJwtPayload(token) || introspection;
  const scopes = scopesOf(payload);

  if (!scopes.includes(config.platform.requiredScope)) {
    return { ok: false, status: 403, error: `token missing required scope '${config.platform.requiredScope}'` };
  }

  return {
    ok: true,
    sub: payload.sub || introspection.sub || null,
    // tenant claim only present on Platform-minted, JWT-readable tokens.
    tenant: payload.tenant || null,
    scopes,
  };
}

module.exports = { enabled, validate };
