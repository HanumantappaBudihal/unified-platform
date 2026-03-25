#!/bin/bash
# ─── PostgreSQL Backup ───
# Backs up all PostgreSQL databases (Keycloak auth, platform registry, app databases)
# Retention: 30 days

set -e

BACKUP_BASE="/backup/data/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$TIMESTAMP"
RETENTION_DAYS=30

# PostgreSQL connection settings
PG_HOST="${PG_HOST:-shared-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-postgres-admin-secret}"

export PGPASSWORD="$PG_PASSWORD"

echo "═══════════════════════════════════════"
echo "PostgreSQL Backup — $TIMESTAMP"
echo "═══════════════════════════════════════"

mkdir -p "$BACKUP_DIR"
mkdir -p "/backup/data/logs"

# Get list of databases (exclude templates and postgres itself)
DATABASES=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
  -t -A -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres'")

if [ -z "$DATABASES" ]; then
  echo "Warning: No databases found to backup"
  exit 0
fi

TOTAL=0
FAILED=0

for DB in $DATABASES; do
  echo "Backing up database: $DB"
  DUMP_FILE="$BACKUP_DIR/${DB}.sql.gz"

  if pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB" \
    --no-owner --no-privileges --clean --if-exists | gzip > "$DUMP_FILE"; then
    SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
    echo "  OK — $DB ($SIZE)"
    TOTAL=$((TOTAL + 1))
  else
    echo "  FAILED — $DB"
    FAILED=$((FAILED + 1))
    rm -f "$DUMP_FILE"
  fi
done

# Also backup global objects (roles, tablespaces)
echo "Backing up global objects (roles)..."
pg_dumpall -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" --globals-only | gzip > "$BACKUP_DIR/_globals.sql.gz"

echo ""
echo "Backup complete: $TOTAL databases backed up, $FAILED failed"
echo "Location: $BACKUP_DIR"

# ─── Cleanup old backups ───
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
CLEANED=0
if [ -d "$BACKUP_BASE" ]; then
  for OLD_DIR in $(find "$BACKUP_BASE" -maxdepth 1 -mindepth 1 -type d -mtime +$RETENTION_DAYS); do
    echo "  Removing: $(basename $OLD_DIR)"
    rm -rf "$OLD_DIR"
    CLEANED=$((CLEANED + 1))
  done
fi
echo "Cleaned up $CLEANED old backups"

# Clean old logs
find /backup/data/logs -name "cron-postgres*.log" -mtime +30 -delete 2>/dev/null || true

echo ""
echo "PostgreSQL backup finished at $(date)"
echo "═══════════════════════════════════════"
