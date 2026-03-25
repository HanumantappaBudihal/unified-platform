const { Client } = require('pg');
const config = require('../config');
const crypto = require('crypto');

function generatePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

async function provision(appSlug, environment = 'dev') {
  const dbUser = `${appSlug.replace(/-/g, '_')}_${environment}_user`;
  const dbName = `${appSlug.replace(/-/g, '_')}_${environment}_db`;
  const dbPassword = generatePassword();

  const client = new Client({
    host: config.pgAdmin.host,
    port: config.pgAdmin.port,
    user: config.pgAdmin.user,
    password: config.pgAdmin.password,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Create user (ignore if exists)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${dbUser}') THEN
          CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}';
        ELSE
          ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword}';
        END IF;
      END
      $$;
    `);

    // Create database (ignore if exists)
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (dbCheck.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`);
    }

    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);

    return {
      config: { database: dbName, user: dbUser, host: config.pgAdmin.host, port: config.pgAdmin.port },
      credentials: { user: dbUser, password: dbPassword, database: dbName },
      connectionString: `postgresql://${dbUser}:${dbPassword}@${config.pgAdmin.host}:${config.pgAdmin.port}/${dbName}`,
    };
  } finally {
    await client.end();
  }
}

async function deprovision(appSlug, environment = 'dev') {
  const dbUser = `${appSlug.replace(/-/g, '_')}_${environment}_user`;
  const dbName = `${appSlug.replace(/-/g, '_')}_${environment}_db`;

  const client = new Client({
    host: config.pgAdmin.host,
    port: config.pgAdmin.port,
    user: config.pgAdmin.user,
    password: config.pgAdmin.password,
    database: 'postgres',
  });

  try {
    await client.connect();

    // Terminate connections
    await client.query(`
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (dbCheck.rows.length > 0) {
      await client.query(`DROP DATABASE "${dbName}"`);
    }

    const userCheck = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [dbUser]);
    if (userCheck.rows.length > 0) {
      await client.query(`DROP USER "${dbUser}"`);
    }
  } finally {
    await client.end();
  }
}

module.exports = { provision, deprovision };
