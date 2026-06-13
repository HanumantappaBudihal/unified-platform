const crypto = require('crypto');
const registry = require('../db/registry');
const { requireRole, hasRole } = require('../rbac');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateToken() {
  return 'plat_' + crypto.randomBytes(24).toString('hex');
}

// Load the tenant named in :slug and enforce that the caller may act on it
// (superadmin → any; tenant token → only its own). Sets req.tenant.
async function loadTenant(req, reply) {
  const slug = req.params.slug;
  if (req.identity?.superadmin) {
    const t = await registry.getTenant(slug);
    if (!t) return reply.code(404).send({ error: 'Tenant not found' });
    req.tenant = t;
    return;
  }
  if (slug !== req.identity?.tenantSlug) {
    return reply.code(403).send({ error: 'Forbidden: not your tenant' });
  }
  req.tenant = await registry.getTenantById(req.identity.tenantId);
}

async function routes(fastify) {
  // Who am I — resolves the calling token to its tenant + role.
  fastify.get('/api/v1/whoami', async (req) => {
    const id = req.identity || {};
    if (id.superadmin) return { superadmin: true, role: 'owner', tenant: req.query.tenant || null };
    const tenant = id.tenantId ? await registry.getTenantById(id.tenantId) : null;
    return {
      superadmin: false,
      role: id.role || null,
      tenant: tenant ? { slug: tenant.slug, name: tenant.name, plan: tenant.plan } : null,
    };
  });

  // Create a tenant (superadmin only) + seed an owner + an owner API token.
  fastify.post('/api/v1/tenants', async (req, reply) => {
    if (!req.identity?.superadmin) {
      return reply.code(403).send({ error: 'Forbidden: superadmin only' });
    }
    const { name, plan, ownerId } = req.body || {};
    if (!name) return reply.code(400).send({ error: 'name is required' });

    const slug = slugify(name);
    if (await registry.getTenant(slug)) {
      return reply.code(409).send({ error: `Tenant "${slug}" already exists` });
    }

    const tenant = await registry.createTenant({ name, slug, plan });
    if (ownerId) {
      await registry.addTenantMember({ tenantId: tenant.id, userId: ownerId, role: 'owner' });
    }
    // Mint a bootstrap owner token so the new tenant can start calling the API.
    const token = generateToken();
    await registry.createApiToken({
      tenantId: tenant.id, token, role: 'owner', label: 'bootstrap', createdBy: req.identity.actor,
    });

    await registry.log({
      actor: req.identity.actor, action: 'tenant.created', resourceType: 'tenant',
      resourceId: slug, details: { name, plan: tenant.plan }, tenantId: tenant.id,
    });

    return reply.code(201).send({ tenant, token });
  });

  // List tenants (superadmin → all; tenant token → just its own).
  fastify.get('/api/v1/tenants', async (req) => {
    if (req.identity?.superadmin) return { tenants: await registry.listTenants() };
    const t = await registry.getTenantById(req.identity.tenantId);
    return { tenants: t ? [t] : [] };
  });

  fastify.get('/api/v1/tenants/:slug', async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    const members = await registry.getTenantMembers(req.tenant.id);
    return { tenant: req.tenant, members };
  });

  // Members
  fastify.post('/api/v1/tenants/:slug/members', { preHandler: requireRole('admin') }, async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    const { userId, role } = req.body || {};
    if (!userId) return reply.code(400).send({ error: 'userId is required' });
    // Only an owner may grant the owner role.
    if (role === 'owner' && !hasRole(req.identity, 'owner')) {
      return reply.code(403).send({ error: 'Only an owner can grant the owner role' });
    }
    const member = await registry.addTenantMember({ tenantId: req.tenant.id, userId, role });
    await registry.log({
      actor: req.identity.actor, action: 'tenant.member_added', resourceType: 'tenant',
      resourceId: req.tenant.slug, details: { userId, role: member.role }, tenantId: req.tenant.id,
    });
    return reply.code(201).send({ member });
  });

  fastify.get('/api/v1/tenants/:slug/members', { preHandler: requireRole('admin') }, async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    return { members: await registry.getTenantMembers(req.tenant.id) };
  });

  // API tokens
  fastify.post('/api/v1/tenants/:slug/tokens', { preHandler: requireRole('admin') }, async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    const { role, label, expiresAt } = req.body || {};
    if (role && !['viewer', 'developer', 'admin', 'owner'].includes(role)) {
      return reply.code(400).send({ error: `Invalid role: ${role}` });
    }
    // Can't mint a token more privileged than yourself.
    if (role && !hasRole(req.identity, role)) {
      return reply.code(403).send({ error: `Cannot mint a '${role}' token above your own role` });
    }
    const token = generateToken();
    const meta = await registry.createApiToken({
      tenantId: req.tenant.id, token, role: role || 'developer', label,
      createdBy: req.identity.actor, expiresAt: expiresAt || null,
    });
    await registry.log({
      actor: req.identity.actor, action: 'token.created', resourceType: 'token',
      resourceId: meta.id, details: { role: meta.role, label: meta.label }, tenantId: req.tenant.id,
    });
    // Plaintext token is returned exactly once.
    return reply.code(201).send({ token, meta });
  });

  fastify.get('/api/v1/tenants/:slug/tokens', { preHandler: requireRole('admin') }, async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    return { tokens: await registry.listApiTokens(req.tenant.id) };
  });

  fastify.delete('/api/v1/tenants/:slug/tokens/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    await loadTenant(req, reply);
    if (reply.sent) return;
    const ok = await registry.revokeApiToken(req.tenant.id, req.params.id);
    if (!ok) return reply.code(404).send({ error: 'Token not found' });
    await registry.log({
      actor: req.identity.actor, action: 'token.revoked', resourceType: 'token',
      resourceId: req.params.id, details: {}, tenantId: req.tenant.id,
    });
    return { success: true };
  });
}

module.exports = routes;
