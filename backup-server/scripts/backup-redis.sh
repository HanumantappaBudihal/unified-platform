#!/usr/bin/env bash
set -e

# ============================================================
# backup-redis.sh — Snapshot Redis cluster RDB files
# ============================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
DEST="${BACKUP_DIR}/redis/${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS_REDIS:-7}"
REDIS_PASSWORD="${REDIS_ADMIN_PASSWORD:?REDIS_ADMIN_PASSWORD is required}"

NODES=("redis-node-1:6371" "redis-node-2:6372" "redis-node-3:6373"
       "redis-node-4:6374" "redis-node-5:6375" "redis-node-6:6376")

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

mkdir -p "${DEST}"

log "Starting Redis cluster backup → ${DEST}"

for entry in "${NODES[@]}"; do
  HOST="${entry%%:*}"
  PORT="${entry##*:}"
  log "Triggering BGSAVE on ${HOST}:${PORT}..."
  redis-cli -h "${HOST}" -p "${PORT}" --user admin -a "${REDIS_PASSWORD}" --no-auth-warning BGSAVE || {
    log "WARNING: BGSAVE failed on ${HOST}:${PORT}, skipping"
    continue
  }
done

# Wait for BGSAVE to finish on all nodes
log "Waiting 10s for BGSAVE to complete..."
sleep 10

for entry in "${NODES[@]}"; do
  HOST="${entry%%:*}"
  PORT="${entry##*:}"
  log "Copying RDB from ${HOST}:${PORT}..."
  # Use redis-cli to get last save time as verification
  LAST_SAVE=$(redis-cli -h "${HOST}" -p "${PORT}" --user admin -a "${REDIS_PASSWORD}" --no-auth-warning LASTSAVE 2>/dev/null || echo "unknown")
  log "  Last save timestamp: ${LAST_SAVE}"
  # Copy the dump.rdb via redis-cli --rdb
  redis-cli -h "${HOST}" -p "${PORT}" --user admin -a "${REDIS_PASSWORD}" --no-auth-warning --rdb "${DEST}/${HOST}.rdb" || {
    log "WARNING: RDB copy failed for ${HOST}:${PORT}"
    continue
  }
  log "  Saved → ${DEST}/${HOST}.rdb"
done

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/redis" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true

log "Redis backup complete."
