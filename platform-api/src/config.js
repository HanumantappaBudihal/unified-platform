const config = {
  port: parseInt(process.env.PLATFORM_API_PORT || '3020'),

  platformDb: {
    host: process.env.PLATFORM_DB_HOST || 'shared-postgres',
    port: parseInt(process.env.PLATFORM_DB_PORT || '5432'),
    database: process.env.PLATFORM_DB_NAME || 'platform_db',
    user: process.env.PLATFORM_DB_USER || 'platform_user',
    password: process.env.PLATFORM_DB_PASSWORD || 'platform-db-secret',
  },

  pgAdmin: {
    host: process.env.PG_ADMIN_HOST || 'shared-postgres',
    port: parseInt(process.env.PG_ADMIN_PORT || '5432'),
    user: process.env.PG_ADMIN_USER || 'postgres',
    password: process.env.PG_ADMIN_PASSWORD || 'postgres-admin-secret',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis-node-1',
    port: parseInt(process.env.REDIS_PORT || '6371'),
    password: process.env.REDIS_ADMIN_PASSWORD || 'admin-secret',
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
  },

  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'storage-nginx',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin-secret',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://auth-keycloak:8080',
    adminUser: process.env.KEYCLOAK_ADMIN_USER || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
    realm: process.env.KEYCLOAK_APP_REALM || 'applications',
  },

  opa: {
    url: process.env.OPA_URL || 'http://authz-opa:8181',
  },

  kong: {
    adminUrl: process.env.KONG_ADMIN_URL || 'http://kong:8001',
  },
};

module.exports = config;
