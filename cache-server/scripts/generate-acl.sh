#!/bin/sh
# Generate Redis ACL file from template using environment variables.
# Usage: ./scripts/generate-acl.sh
# Reads from .env and writes config/redis/users.acl

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  . "$ROOT_DIR/.env"
  set +a
fi

# Defaults
REDIS_ADMIN_PASSWORD="${REDIS_ADMIN_PASSWORD:-admin-secret}"
REDIS_SESSION_SVC_PASSWORD="${REDIS_SESSION_SVC_PASSWORD:-session-secret}"
REDIS_CATALOG_SVC_PASSWORD="${REDIS_CATALOG_SVC_PASSWORD:-catalog-secret}"

cat > "$ROOT_DIR/config/redis/users.acl" <<EOF
user admin on >${REDIS_ADMIN_PASSWORD} ~* &* +@all
user session-svc on >${REDIS_SESSION_SVC_PASSWORD} ~sessions:* &sessions:* +@all -@admin -@dangerous
user catalog-svc on >${REDIS_CATALOG_SVC_PASSWORD} ~catalog:* &catalog:* +@all -@admin -@dangerous
user default off
EOF

echo "Generated config/redis/users.acl from .env"
