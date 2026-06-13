const { Pool, Client } = require('pg');
const crypto = require('crypto');
const config = require('../config');

const pool = new Pool(config.platformDb);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const registry = {
  // ─── Schema bootstrap ───

  // Idempotent schema creation. Mirrors database-server/scripts/init-databases.sh
  // but uses IF NOT EXISTS / ON CONFLICT so it is safe to run on every startup —
  // this is what makes the API self-healing when the DB volume predates a schema
  // change or the init script never ran.
  async ensureSchema() {
    // If the schema is already present (e.g. created by the database-server init
    // script, which owns the tables as the postgres superuser), do nothing — the
    // app user has DML grants but not ownership, so re-running DDL would fail.
    const { rows } = await pool.query("SELECT to_regclass('public.platform_apps') AS t");
    if (rows[0].t) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_environments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_apps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        owner_id VARCHAR(255) NOT NULL,
        team_id UUID REFERENCES platform_teams(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_apps_slug ON platform_apps(slug);
      CREATE INDEX IF NOT EXISTS idx_apps_team ON platform_apps(team_id);
      CREATE INDEX IF NOT EXISTS idx_apps_owner ON platform_apps(owner_id);

      CREATE TABLE IF NOT EXISTS platform_app_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
        resource_type VARCHAR(20) NOT NULL,
        environment VARCHAR(50) NOT NULL DEFAULT 'dev',
        config JSONB NOT NULL DEFAULT '{}',
        credentials JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        provisioned_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(app_id, resource_type, environment)
      );

      CREATE INDEX IF NOT EXISTS idx_resources_app ON platform_app_resources(app_id);
      CREATE INDEX IF NOT EXISTS idx_resources_type ON platform_app_resources(resource_type);

      CREATE TABLE IF NOT EXISTS platform_team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES platform_teams(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'developer',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS platform_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_actor ON platform_audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON platform_audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON platform_audit_log(created_at DESC);
    `);

    // Seed the default environments (no-op if they already exist).
    await pool.query(`
      INSERT INTO platform_environments (name, slug, status, config) VALUES
        ('Development', 'dev', 'active', '{"description": "Local development environment"}'),
        ('Staging', 'staging', 'active', '{"description": "Pre-production testing environment"}'),
        ('Production', 'prod', 'active', '{"description": "Production environment"}')
      ON CONFLICT (slug) DO NOTHING;
    `);
  },

  // ─── Migrations (run as DB admin) ───

  // Multi-tenancy migration. Must run as the PG admin/superuser because the base
  // tables are owned by `postgres` (created by the init script), and the app's
  // runtime user (platform_user) lacks ownership to ALTER them. Idempotent.
  async runMigrations() {
    const admin = new Client({
      host: config.pgAdmin.host,
      port: config.pgAdmin.port,
      user: config.pgAdmin.user,
      password: config.pgAdmin.password,
      database: config.platformDb.database,
    });
    const appUser = config.platformDb.user;

    await admin.connect();
    try {
      await admin.query(`
        CREATE TABLE IF NOT EXISTS platform_tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(150) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          plan VARCHAR(50) NOT NULL DEFAULT 'free',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          config JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS platform_tenant_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'developer',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(tenant_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS platform_api_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE CASCADE,
          token_hash CHAR(64) NOT NULL UNIQUE,
          prefix VARCHAR(20) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'developer',
          label VARCHAR(150),
          created_by VARCHAR(255),
          last_used_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          revoked BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_tokens_tenant ON platform_api_tokens(tenant_id);

        ALTER TABLE platform_apps           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES platform_tenants(id) ON DELETE CASCADE;
        ALTER TABLE platform_app_resources  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES platform_tenants(id) ON DELETE CASCADE;
        ALTER TABLE platform_audit_log      ADD COLUMN IF NOT EXISTS tenant_id UUID;
        CREATE INDEX IF NOT EXISTS idx_apps_tenant ON platform_apps(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_audit_tenant ON platform_audit_log(tenant_id);
      `);

      // Backfill a default tenant and attach any pre-tenant rows to it.
      await admin.query(`
        INSERT INTO platform_tenants (name, slug, plan) VALUES ('Default', 'default', 'enterprise')
        ON CONFLICT (slug) DO NOTHING;
        UPDATE platform_apps SET tenant_id = (SELECT id FROM platform_tenants WHERE slug='default') WHERE tenant_id IS NULL;
        UPDATE platform_app_resources r SET tenant_id = a.tenant_id FROM platform_apps a WHERE r.app_id = a.id AND r.tenant_id IS NULL;
        UPDATE platform_audit_log SET tenant_id = (SELECT id FROM platform_tenants WHERE slug='default') WHERE tenant_id IS NULL;
      `);

      // App slug is unique PER TENANT, not globally.
      await admin.query(`
        ALTER TABLE platform_apps DROP CONSTRAINT IF EXISTS platform_apps_slug_key;
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_apps_tenant_slug_key') THEN
            ALTER TABLE platform_apps ADD CONSTRAINT platform_apps_tenant_slug_key UNIQUE (tenant_id, slug);
          END IF;
        END $$;
      `);

      // Re-grant DML on the (admin-owned) tables to the runtime user.
      await admin.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appUser}') THEN
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${appUser}";
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${appUser}";
          END IF;
        END $$;
      `);
    } finally {
      await admin.end();
    }
  },

  // ─── Tenants ───

  async createTenant({ name, slug, plan }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_tenants (name, slug, plan) VALUES ($1, $2, $3) RETURNING *`,
      [name, slug, plan || 'free']
    );
    return rows[0];
  },

  async getTenant(slug) {
    const { rows } = await pool.query('SELECT * FROM platform_tenants WHERE slug = $1', [slug]);
    return rows[0] || null;
  },

  async getTenantById(id) {
    const { rows } = await pool.query('SELECT * FROM platform_tenants WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async listTenants() {
    const { rows } = await pool.query('SELECT * FROM platform_tenants ORDER BY created_at DESC');
    return rows;
  },

  async addTenantMember({ tenantId, userId, role }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_tenant_members (tenant_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [tenantId, userId, role || 'developer']
    );
    return rows[0];
  },

  async getTenantMembers(tenantId) {
    const { rows } = await pool.query(
      'SELECT * FROM platform_tenant_members WHERE tenant_id = $1 ORDER BY created_at',
      [tenantId]
    );
    return rows;
  },

  // ─── API tokens ───

  // Stores only the SHA-256 hash; the plaintext token is shown to the caller once.
  async createApiToken({ tenantId, token, role, label, createdBy, expiresAt }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_api_tokens (tenant_id, token_hash, prefix, role, label, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, prefix, role, label, created_by, expires_at, created_at`,
      [tenantId, hashToken(token), token.slice(0, 16), role || 'developer', label || null, createdBy || null, expiresAt || null]
    );
    return rows[0];
  },

  async resolveToken(token) {
    const { rows } = await pool.query(
      `SELECT t.id, t.tenant_id, t.role, te.slug AS tenant_slug, te.status AS tenant_status
       FROM platform_api_tokens t
       JOIN platform_tenants te ON te.id = t.tenant_id
       WHERE t.token_hash = $1 AND t.revoked = FALSE
         AND (t.expires_at IS NULL OR t.expires_at > NOW())`,
      [hashToken(token)]
    );
    if (!rows[0]) return null;
    // best-effort last-used stamp; don't block the request on it
    pool.query('UPDATE platform_api_tokens SET last_used_at = NOW() WHERE id = $1', [rows[0].id]).catch(() => {});
    return rows[0];
  },

  async listApiTokens(tenantId) {
    const { rows } = await pool.query(
      `SELECT id, prefix, role, label, created_by, last_used_at, expires_at, revoked, created_at
       FROM platform_api_tokens WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows;
  },

  async revokeApiToken(tenantId, id) {
    const { rowCount } = await pool.query(
      'UPDATE platform_api_tokens SET revoked = TRUE WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
    return rowCount > 0;
  },

  // ─── Apps ───

  async createApp({ name, slug, description, ownerId, teamId, tenantId, appConfig }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_apps (name, slug, description, owner_id, team_id, tenant_id, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, description || '', ownerId, teamId || null, tenantId, appConfig || {}]
    );
    return rows[0];
  },

  // Tenant-scoped lookup. Pass tenantId to enforce isolation; omit only for
  // trusted superadmin/internal callers (slug is unique only within a tenant).
  async getApp(slug, tenantId) {
    const params = [slug];
    let query = 'SELECT * FROM platform_apps WHERE slug = $1';
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    const { rows } = await pool.query(query, params);
    return rows[0] || null;
  },

  async getAppById(id) {
    const { rows } = await pool.query('SELECT * FROM platform_apps WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async listApps({ tenantId, teamId, status } = {}) {
    let query = 'SELECT * FROM platform_apps WHERE 1=1';
    const params = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (teamId) {
      params.push(teamId);
      query += ` AND team_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async updateAppStatus(appId, status) {
    const { rows } = await pool.query(
      'UPDATE platform_apps SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, appId]
    );
    return rows[0];
  },

  async deleteApp(appId) {
    await pool.query('DELETE FROM platform_apps WHERE id = $1', [appId]);
  },

  // ─── Resources ───

  async addResource({ appId, tenantId, resourceType, environment, resourceConfig, credentials }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_app_resources (app_id, tenant_id, resource_type, environment, config, credentials, status, provisioned_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'provisioned', NOW())
       ON CONFLICT (app_id, resource_type, environment)
       DO UPDATE SET config = $5, credentials = $6, status = 'provisioned', provisioned_at = NOW()
       RETURNING *`,
      [appId, tenantId || null, resourceType, environment || 'dev', resourceConfig || {}, credentials || {}]
    );
    return rows[0];
  },

  async getAppResources(appId, environment) {
    let query = 'SELECT * FROM platform_app_resources WHERE app_id = $1';
    const params = [appId];
    if (environment) {
      params.push(environment);
      query += ` AND environment = $${params.length}`;
    }
    const { rows } = await pool.query(query, params);
    return rows;
  },

  async removeResource(appId, resourceType, environment) {
    await pool.query(
      'DELETE FROM platform_app_resources WHERE app_id = $1 AND resource_type = $2 AND environment = $3',
      [appId, resourceType, environment || 'dev']
    );
  },

  // ─── Teams ───

  async createTeam({ name, slug, description }) {
    const { rows } = await pool.query(
      'INSERT INTO platform_teams (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description || '']
    );
    return rows[0];
  },

  async listTeams() {
    const { rows } = await pool.query('SELECT * FROM platform_teams ORDER BY name');
    return rows;
  },

  async getTeam(slug) {
    const { rows } = await pool.query('SELECT * FROM platform_teams WHERE slug = $1', [slug]);
    return rows[0] || null;
  },

  async addTeamMember({ teamId, userId, role }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [teamId, userId, role || 'developer']
    );
    return rows[0];
  },

  async getTeamMembers(teamId) {
    const { rows } = await pool.query(
      'SELECT * FROM platform_team_members WHERE team_id = $1',
      [teamId]
    );
    return rows;
  },

  // ─── Environments ───

  async listEnvironments() {
    const { rows } = await pool.query('SELECT * FROM platform_environments ORDER BY created_at');
    return rows;
  },

  // ─── Audit ───

  async log({ actor, action, resourceType, resourceId, details, tenantId }) {
    await pool.query(
      `INSERT INTO platform_audit_log (actor, action, resource_type, resource_id, details, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actor, action, resourceType, resourceId || null, details || {}, tenantId || null]
    );
  },

  async getAuditLog({ tenantId, limit, offset } = {}) {
    const params = [];
    let query = 'SELECT * FROM platform_audit_log';
    if (tenantId) {
      params.push(tenantId);
      query += ` WHERE tenant_id = $${params.length}`;
    }
    params.push(limit || 50);
    params.push(offset || 0);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await pool.query(query, params);
    return rows;
  },

  // ─── Health ───

  async ping() {
    await pool.query('SELECT 1');
    return true;
  },

  pool,
};

module.exports = registry;
