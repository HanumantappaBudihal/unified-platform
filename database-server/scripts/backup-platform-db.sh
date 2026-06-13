#!/bin/sh
# Backup the platform registry database — the source of truth for tenants, apps,
# resources, and the tamper-evident audit log. (Closes the "no PostgreSQL backup"
# gap in infra/docs/production-readiness-gaps.md.)
#
# Restore drill (run periodically — RTO/RPO evidence for SOC2):
#   createdb platform_db_restore
#   gunzip -c platform_db_YYYYMMDD_HHMMSS.sql.gz | psql -d platform_db_restore
#   # then compare row counts + audit head hash against the live DB.
set -e

BACKUP_DIR="${BACKUP_DIR:-/backup}"
PG_HOST="${PG_HOST:-shared-postgres}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-platform_db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/${PG_DB}_${TS}.sql.gz"

pg_dump -h "$PG_HOST" -U "$PG_USER" "$PG_DB" | gzip > "$OUT"
echo "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Retention
find "$BACKUP_DIR" -name "${PG_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
