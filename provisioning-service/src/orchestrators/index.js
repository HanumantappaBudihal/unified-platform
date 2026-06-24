'use strict';

const kafka = require('./kafka');
const redis = require('./redis');
const minio = require('./minio');
const postgres = require('./postgres');
const gateway = require('./gateway');
const config = require('../config');

const ORCHESTRATORS = { kafka, redis, minio, postgres, gateway };

const ALL_TYPES = Object.keys(ORCHESTRATORS);

function normalizeRequest(resources) {
  // Accept either ["kafka","redis"] or [{type:"gateway",opts:{...}}].
  return (resources || []).map((r) => (typeof r === 'string' ? { type: r, opts: {} } : { type: r.type, opts: r.opts || {} }));
}

function validate(type) {
  if (!ORCHESTRATORS[type]) return `Unknown resource type: ${type}`;
  if (!config.enabledResources.includes(type)) return `Resource type not enabled in this environment: ${type}`;
  return null;
}

// Run `verb` ("provision" | "decommission") for each requested resource. One
// resource failing never aborts the others — every outcome is reported so the
// caller (Seiton Platform) can persist successes and retry failures.
async function run(verb, slug, environment, requested) {
  const results = {};
  const errors = [];

  for (const { type, opts } of normalizeRequest(requested)) {
    const invalid = validate(type);
    if (invalid) {
      errors.push({ resource: type, error: invalid });
      continue;
    }
    try {
      results[type] = await ORCHESTRATORS[type][verb](slug, environment, opts);
    } catch (e) {
      errors.push({ resource: type, error: e.message });
    }
  }

  return { results, errors };
}

const provisionApp = (slug, { environment = 'dev', resources = [] } = {}) =>
  run('provision', slug, environment, resources);

const decommissionApp = (slug, { environment = 'dev', resources = [] } = {}) =>
  run('decommission', slug, environment, resources);

module.exports = { provisionApp, decommissionApp, ALL_TYPES, ORCHESTRATORS };
