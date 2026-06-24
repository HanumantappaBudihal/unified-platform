'use strict';

const { Client } = require('pg');
const crypto = require('crypto');
const config = require('../config');

// Provisions a dedicated Postgres role + database per app, named
// `<slug>_<env>_user` / `<slug>_<env>_db`. The admin connection only touches
// the `postgres` maintenance DB; the new role owns its own database.

function generatePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

// Postgres identifiers must be [a-z0-9_]; the slug uses hyphens.
function ident(slug, environment, suffix) {
  return `${slug.replace(/-/g, '_')}_${environment}_${suffix}`;
}

function adminClient() {
  return new Client({
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: 'postgres',
  });
}

async function provision(slug, environment) {
  const dbUser = ident(slug, environment, 'user');
  const dbName = ident(slug, environment, 'db');
  const password = generatePassword();

  const client = adminClient();
  try {
    await client.connect();

    // CREATE ROLE/DATABASE do not accept bind params, so the role name is built
    // from a slug already constrained to [a-z0-9_]; the password is bound safely
    // via format() with %L to avoid injection through the generated secret.
    await client.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${dbUser}') THEN
           EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${dbUser}', $1);
         ELSE
           EXECUTE format('ALTER ROLE %I LOGIN PASSWORD %L', '${dbUser}', $1);
         END IF;
       END $$;`,
      [password]
    );

    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`);
    }
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);

    return {
      config: { database: dbName, user: dbUser, host: config.postgres.host, port: config.postgres.port },
      credentials: {
        username: dbUser,
        password,
        database: dbName,
        connectionString: `postgresql://${dbUser}:${password}@${config.postgres.host}:${config.postgres.port}/${dbName}`,
      },
    };
  } finally {
    await client.end();
  }
}

async function decommission(slug, environment) {
  const dbUser = ident(slug, environment, 'user');
  const dbName = ident(slug, environment, 'db');
  const client = adminClient();
  try {
    await client.connect();
    // Terminate live connections so DROP DATABASE can proceed.
    await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [dbName]);
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`DROP ROLE IF EXISTS "${dbUser}"`);
    return { removed: { database: dbName, user: dbUser } };
  } finally {
    await client.end();
  }
}

module.exports = { provision, decommission };
