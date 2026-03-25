#!/usr/bin/env bash
set -e

# ============================================================
# restore-minio.sh — Restore MinIO buckets from backup
#
# Usage: ./restore-minio.sh <backup_timestamp>
#   e.g. ./restore-minio.sh 20260319_020000
# ============================================================

BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
MINIO_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
MINIO_HOST="${MINIO_HOST:-minio-node-1:9000}"
SNAPSHOT="${1:?Usage: restore-minio.sh <backup_timestamp>}"
SRC="${BACKUP_DIR}/minio/${SNAPSHOT}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ ! -d "${SRC}" ]; then
  log "ERROR: Backup directory not found: ${SRC}"
  log "Available backups:"
  ls "${BACKUP_DIR}/minio/" 2>/dev/null || echo "  (none)"
  exit 1
fi

log "Starting MinIO restore from ${SRC}"
log "WARNING: This will overwrite existing objects in matching buckets."
read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
  log "Restore cancelled."
  exit 0
fi

# Configure mc alias
mc alias set restore-dst "http://${MINIO_HOST}" "${MINIO_USER}" "${MINIO_PASS}" --api S3v4 2>/dev/null

# Restore each bucket
for BUCKET_DIR in "${SRC}"/*/; do
  [ ! -d "${BUCKET_DIR}" ] && continue
  BUCKET=$(basename "${BUCKET_DIR}")
  log "Restoring bucket: ${BUCKET}..."

  # Create bucket if it doesn't exist
  mc mb --ignore-existing "restore-dst/${BUCKET}" 2>/dev/null || true

  # Mirror backup to MinIO
  mc mirror --overwrite "${BUCKET_DIR}" "restore-dst/${BUCKET}" 2>&1 | while read -r line; do
    log "  ${line}"
  done
  log "  Bucket ${BUCKET} restored."
done

log "MinIO restore complete."
