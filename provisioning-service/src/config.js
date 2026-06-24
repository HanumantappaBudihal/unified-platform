'use strict';

// Central configuration for the provisioning service. Every backing-service
// connection is read from the environment so the service stays stateless and
// environment-agnostic. See .env.example for the full list.

function csv(value, fallback) {
  if (!value) return fallback;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

const config = {
  port: parseInt(process.env.PORT || '3030', 10),

  // Bearer token that callers (Seiton Platform) must present. When unset the
  // service logs a loud warning and runs open — intended for local dev only.
  apiToken: process.env.PROVISIONING_API_TOKEN || '',

  // Which resource types this deployment is allowed to provision. Lets an
  // environment disable a backing service it does not run.
  enabledResources: csv(
    process.env.ENABLED_RESOURCES,
    ['kafka', 'redis', 'minio', 'postgres', 'gateway']
  ),

  kafka: {
    brokers: csv(process.env.KAFKA_BROKERS, ['localhost:9092']),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },

  postgres: {
    host: process.env.PGADMIN_HOST || 'localhost',
    port: parseInt(process.env.PGADMIN_PORT || '5432', 10),
    user: process.env.PGADMIN_USER || 'postgres',
    password: process.env.PGADMIN_PASSWORD || 'postgres',
  },

  gateway: {
    // Kong admin API
    adminUrl: process.env.KONG_ADMIN_URL || 'http://localhost:8001',
  },
};

module.exports = config;
