'use strict';

// Resource naming. Resources are namespaced per tenant so two tenants can both
// run an app called "orders-api" without colliding on the shared backing
// services. The slug is the single identity that every orchestrator derives its
// concrete resource names from (topic prefix, bucket, db name, acl user, route).

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Combine tenant + app into one stable, DNS/identifier-safe slug.
function qualifiedSlug(tenant, app) {
  const a = slugify(app);
  if (!a) throw new Error('app is required');
  const t = slugify(tenant);
  return t ? `${t}-${a}` : a;
}

module.exports = { slugify, qualifiedSlug };
