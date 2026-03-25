#!/usr/bin/env bash
set -e

# ============================================================
# backup-all.sh — Run all backup scripts with logging
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
LOG_DIR="${BACKUP_DIR}/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "${LOG_DIR}"

LOG_FILE="${LOG_DIR}/backup-all_${TIMESTAMP}.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }

log "=========================================="
log "Starting full backup run"
log "=========================================="

FAILED=0

log "--- Redis backup ---"
if bash "${SCRIPT_DIR}/backup-redis.sh" >> "${LOG_FILE}" 2>&1; then
  log "Redis backup: SUCCESS"
else
  log "Redis backup: FAILED (exit code $?)"
  FAILED=$((FAILED + 1))
fi

log "--- MinIO backup ---"
if bash "${SCRIPT_DIR}/backup-minio.sh" >> "${LOG_FILE}" 2>&1; then
  log "MinIO backup: SUCCESS"
else
  log "MinIO backup: FAILED (exit code $?)"
  FAILED=$((FAILED + 1))
fi

log "--- Kafka backup ---"
if bash "${SCRIPT_DIR}/backup-kafka.sh" >> "${LOG_FILE}" 2>&1; then
  log "Kafka backup: SUCCESS"
else
  log "Kafka backup: FAILED (exit code $?)"
  FAILED=$((FAILED + 1))
fi

# Cleanup old logs (keep 30 days)
find "${LOG_DIR}" -name "*.log" -mtime +30 -delete 2>/dev/null || true

log "=========================================="
if [ "${FAILED}" -gt 0 ]; then
  log "Full backup complete with ${FAILED} failure(s)."
  exit 1
else
  log "Full backup complete — all successful."
fi
