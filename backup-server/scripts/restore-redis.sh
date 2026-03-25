#!/usr/bin/env bash
set -e

# ============================================================
# restore-redis.sh — Restore Redis RDB files from backup
#
# Usage: ./restore-redis.sh <backup_timestamp>
#   e.g. ./restore-redis.sh 20260319_060000
# ============================================================

BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
REDIS_PASSWORD="${REDIS_ADMIN_PASSWORD:?REDIS_ADMIN_PASSWORD is required}"
SNAPSHOT="${1:?Usage: restore-redis.sh <backup_timestamp>}"
SRC="${BACKUP_DIR}/redis/${SNAPSHOT}"

NODES=("redis-node-1:6371" "redis-node-2:6372" "redis-node-3:6373"
       "redis-node-4:6374" "redis-node-5:6375" "redis-node-6:6376")

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ ! -d "${SRC}" ]; then
  log "ERROR: Backup directory not found: ${SRC}"
  log "Available backups:"
  ls "${BACKUP_DIR}/redis/" 2>/dev/null || echo "  (none)"
  exit 1
fi

log "Starting Redis restore from ${SRC}"
log "WARNING: This will stop Redis nodes, replace their data, and restart them."
read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
  log "Restore cancelled."
  exit 0
fi

for entry in "${NODES[@]}"; do
  HOST="${entry%%:*}"
  PORT="${entry##*:}"
  RDB_FILE="${SRC}/${HOST}.rdb"

  if [ ! -f "${RDB_FILE}" ]; then
    log "WARNING: No RDB file for ${HOST}, skipping."
    continue
  fi

  log "Restoring ${HOST}:${PORT}..."

  # Shutdown the node gracefully (saves current state, then stops)
  redis-cli -h "${HOST}" -p "${PORT}" --user admin -a "${REDIS_PASSWORD}" --no-auth-warning SHUTDOWN NOSAVE 2>/dev/null || true

  # Wait for the node to stop
  sleep 2

  # Copy RDB file to the node's data directory
  # Note: This requires the backup-runner to have volume access to Redis data dirs,
  # or you must manually copy the file. In a Docker setup, use:
  #   docker cp <rdb_file> <container>:/data/dump.rdb
  log "  Copy ${RDB_FILE} to ${HOST}:/data/dump.rdb using:"
  log "    docker cp ${RDB_FILE} ${HOST}:/data/dump.rdb"

  log "  Then restart the container:"
  log "    docker start ${HOST}"
  log "  ---"
done

log "Redis restore instructions complete."
log "After copying RDB files and restarting containers, verify with:"
log "  redis-cli -h <host> -p <port> --user admin -a <password> INFO keyspace"
