#!/bin/bash
set -e

# ─── Create application databases and users ───
# This script runs once on first container start (via /docker-entrypoint-initdb.d/).
# Add new blocks below for each app that needs a database.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- ─── App Database Template ───
    -- Copy this block for each new application:
    --
    -- CREATE USER <app>_user WITH PASSWORD '<app>-db-secret';
    -- CREATE DATABASE <app>_db OWNER <app>_user;
    -- GRANT ALL PRIVILEGES ON DATABASE <app>_db TO <app>_user;

    -- Example: a generic "app" database for quick testing
    CREATE USER app_user WITH PASSWORD '${APP_DB_PASSWORD:-app-db-secret}';
    CREATE DATABASE app_db OWNER app_user;
    GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;

    -- ─── Platform Registry Database ───
    CREATE USER platform_user WITH PASSWORD '${PLATFORM_DB_PASSWORD:-platform-db-secret}';
    CREATE DATABASE platform_db OWNER platform_user;
    GRANT ALL PRIVILEGES ON DATABASE platform_db TO platform_user;

EOSQL

# ─── Initialize Platform Schema ───
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "platform_db" <<-'EOSQL'

    -- Teams
    CREATE TABLE platform_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Environments
    CREATE TABLE platform_environments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Applications
    CREATE TABLE platform_apps (
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

    CREATE INDEX idx_apps_slug ON platform_apps(slug);
    CREATE INDEX idx_apps_team ON platform_apps(team_id);
    CREATE INDEX idx_apps_owner ON platform_apps(owner_id);

    -- App Resources (what infra each app uses)
    CREATE TABLE platform_app_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID NOT NULL REFERENCES platform_apps(id) ON DELETE CASCADE,
        resource_type VARCHAR(20) NOT NULL,  -- postgres, redis, kafka, minio
        environment VARCHAR(50) NOT NULL DEFAULT 'dev',
        config JSONB NOT NULL DEFAULT '{}',
        credentials JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        provisioned_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(app_id, resource_type, environment)
    );

    CREATE INDEX idx_resources_app ON platform_app_resources(app_id);
    CREATE INDEX idx_resources_type ON platform_app_resources(resource_type);

    -- Team Members
    CREATE TABLE platform_team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES platform_teams(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'developer',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_id, user_id)
    );

    -- Audit Log
    CREATE TABLE platform_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_audit_actor ON platform_audit_log(actor);
    CREATE INDEX idx_audit_action ON platform_audit_log(action);
    CREATE INDEX idx_audit_created ON platform_audit_log(created_at DESC);

    -- Seed default environment
    INSERT INTO platform_environments (name, slug, status, config) VALUES
        ('Development', 'dev', 'active', '{"description": "Local development environment"}'),
        ('Staging', 'staging', 'active', '{"description": "Pre-production testing environment"}'),
        ('Production', 'prod', 'active', '{"description": "Production environment"}');

    -- Grant permissions to platform_user
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO platform_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO platform_user;

EOSQL

echo "✓ Application databases initialized"
echo "✓ Platform registry schema created"
