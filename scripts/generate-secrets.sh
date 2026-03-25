#!/bin/bash
set -e

# ─── Platform Secrets Generator ───
# Generates strong random passwords for all infrastructure services.
# Run once on first setup. Secrets are stored in ../secrets/ (gitignored).
#
# Usage: bash scripts/generate-secrets.sh

SECRETS_DIR="$(cd "$(dirname "$0")/../secrets" && pwd)"

echo "╔══════════════════════════════════════════════╗"
echo "║  Platform Secrets Generator                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check if secrets already exist
if [ -f "$SECRETS_DIR/.generated" ]; then
  echo "Secrets already generated at $(cat "$SECRETS_DIR/.generated")"
  read -p "Regenerate? This will overwrite existing secrets. [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

gen() {
  # Generate a 32-char base64url password
  openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

echo "Generating secrets..."

mkdir -p "$SECRETS_DIR"

# ─── PostgreSQL ───
echo "$(gen)" > "$SECRETS_DIR/pg-admin-password"
echo "$(gen)" > "$SECRETS_DIR/pg-app-password"
echo "$(gen)" > "$SECRETS_DIR/pg-platform-password"

# ─── Keycloak ───
echo "$(gen)" > "$SECRETS_DIR/keycloak-admin-password"
echo "$(gen)" > "$SECRETS_DIR/keycloak-db-password"

# ─── Redis ───
echo "$(gen)" > "$SECRETS_DIR/redis-admin-password"
echo "$(gen)" > "$SECRETS_DIR/redis-session-password"
echo "$(gen)" > "$SECRETS_DIR/redis-catalog-password"

# ─── MinIO ───
echo "$(gen)" > "$SECRETS_DIR/minio-root-password"
echo "$(gen)" > "$SECRETS_DIR/minio-document-svc-secret"
echo "$(gen)" > "$SECRETS_DIR/minio-media-svc-secret"
echo "$(gen)" > "$SECRETS_DIR/minio-hr-portal-secret"
echo "$(gen)" > "$SECRETS_DIR/minio-analytics-svc-secret"

# ─── Kafka ───
echo "$(gen)" > "$SECRETS_DIR/kafka-admin-password"

# ─── Kong ───
echo "$(gen)" > "$SECRETS_DIR/kong-db-password"

# ─── Grafana ───
echo "$(gen)" > "$SECRETS_DIR/grafana-admin-password"

# ─── pgAdmin ───
echo "$(gen)" > "$SECRETS_DIR/pgadmin-password"

# ─── Platform API ───
echo "$(gen)" > "$SECRETS_DIR/platform-api-encryption-key"

# ─── Timestamp ───
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$SECRETS_DIR/.generated"

# Set permissions (read-only by owner)
chmod 600 "$SECRETS_DIR"/*

echo ""
echo "Secrets generated in: $SECRETS_DIR"
echo ""
echo "Files created:"
ls -1 "$SECRETS_DIR" | grep -v '.gitignore' | grep -v '.generated' | while read f; do
  echo "  $f"
done
echo ""
echo "To use these secrets, update each service's .env file or"
echo "reference them via Docker Compose secrets: directive."
echo ""

# ─── Generate .env files for each service ───
echo "Generating .env overrides..."

# Database server
cat > "$SECRETS_DIR/database-server.env" <<EOF
PG_ADMIN_USER=postgres
PG_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/pg-admin-password")
APP_DB_PASSWORD=$(cat "$SECRETS_DIR/pg-app-password")
PLATFORM_DB_PASSWORD=$(cat "$SECRETS_DIR/pg-platform-password")
PGADMIN_EMAIL=admin@local.dev
PGADMIN_PASSWORD=$(cat "$SECRETS_DIR/pgadmin-password")
EOF

# Auth server
cat > "$SECRETS_DIR/auth-server.env" <<EOF
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/keycloak-admin-password")
KC_DB_PASSWORD=$(cat "$SECRETS_DIR/keycloak-db-password")
EOF

# Cache server
cat > "$SECRETS_DIR/cache-server.env" <<EOF
REDIS_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/redis-admin-password")
REDIS_SESSION_SVC_PASSWORD=$(cat "$SECRETS_DIR/redis-session-password")
REDIS_CATALOG_SVC_PASSWORD=$(cat "$SECRETS_DIR/redis-catalog-password")
EOF

# MinIO
cat > "$SECRETS_DIR/object-storage-server.env" <<EOF
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(cat "$SECRETS_DIR/minio-root-password")
EOF

# Platform API
cat > "$SECRETS_DIR/platform-api.env" <<EOF
PLATFORM_DB_PASSWORD=$(cat "$SECRETS_DIR/pg-platform-password")
PG_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/pg-admin-password")
REDIS_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/redis-admin-password")
MINIO_SECRET_KEY=$(cat "$SECRETS_DIR/minio-root-password")
KEYCLOAK_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/keycloak-admin-password")
EOF

echo ""
echo "Per-service .env files created in: $SECRETS_DIR/"
echo "Copy them to each service directory or symlink:"
echo "  cp $SECRETS_DIR/database-server.env ../database-server/.env"
echo ""
echo "Done!"
