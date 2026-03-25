const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.platformDb);

const registry = {
  // ─── Apps ───

  async createApp({ name, slug, description, ownerId, teamId, appConfig }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_apps (name, slug, description, owner_id, team_id, config)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, slug, description || '', ownerId, teamId || null, appConfig || {}]
    );
    return rows[0];
  },

  async getApp(slug) {
    const { rows } = await pool.query(
      'SELECT * FROM platform_apps WHERE slug = $1',
      [slug]
    );
    return rows[0] || null;
  },

  async listApps({ teamId, status } = {}) {
    let query = 'SELECT * FROM platform_apps WHERE 1=1';
    const params = [];
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

  async updateAppStatus(slug, status) {
    const { rows } = await pool.query(
      'UPDATE platform_apps SET status = $1, updated_at = NOW() WHERE slug = $2 RETURNING *',
      [status, slug]
    );
    return rows[0];
  },

  async deleteApp(slug) {
    await pool.query('DELETE FROM platform_apps WHERE slug = $1', [slug]);
  },

  // ─── Resources ───

  async addResource({ appId, resourceType, environment, resourceConfig, credentials }) {
    const { rows } = await pool.query(
      `INSERT INTO platform_app_resources (app_id, resource_type, environment, config, credentials, status, provisioned_at)
       VALUES ($1, $2, $3, $4, $5, 'provisioned', NOW())
       ON CONFLICT (app_id, resource_type, environment)
       DO UPDATE SET config = $4, credentials = $5, status = 'provisioned', provisioned_at = NOW()
       RETURNING *`,
      [appId, resourceType, environment || 'dev', resourceConfig || {}, credentials || {}]
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

  async log({ actor, action, resourceType, resourceId, details }) {
    await pool.query(
      `INSERT INTO platform_audit_log (actor, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor, action, resourceType, resourceId || null, details || {}]
    );
  },

  async getAuditLog({ limit, offset } = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM platform_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit || 50, offset || 0]
    );
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
