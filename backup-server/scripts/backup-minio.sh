#!/usr/bin/env bash
set -e

# ============================================================
# backup-minio.sh — Mirror all MinIO buckets to local backup
# ============================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
DEST="${BACKUP_DIR}/minio/${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS_MINIO:-30}"
MINIO_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
MINIO_HOST="${MINIO_HOST:-minio-node-1:9000}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

mkdir -p "${DEST}"

log "Starting MinIO backup → ${DEST}"

# Configure mc alias
mc alias set backup-src "http://${MINIO_HOST}" "${MINIO_USER}" "${MINIO_PASS}" --api S3v4 2>/dev/null

# List and mirror each bucket
BUCKETS=$(mc ls backup-src/ --json 2>/dev/null | jq -r '.key' | sed 's:/$::')

if [ -z "${BUCKETS}" ]; then
  log "WARNING: No buckets found on MinIO."
  exit 0
fi

for BUCKET in ${BUCKETS}; do
  log "Mirroring bucket: ${BUCKET}..."
  mkdir -p "${DEST}/${BUCKET}"
  mc mirror --overwrite "backup-src/${BUCKET}" "${DEST}/${BUCKET}" 2>&1 | while read -r line; do
    log "  ${line}"
  done
  log "  Bucket ${BUCKET} complete."
done

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/minio" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true

log "MinIO backup complete."
