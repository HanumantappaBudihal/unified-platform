#!/usr/bin/env bash
set -e

# ============================================================
# backup-kafka.sh — Export Kafka topic metadata & consumer offsets
# ============================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backup/data}"
DEST="${BACKUP_DIR}/kafka/${TIMESTAMP}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS_KAFKA:-30}"
KAFKA_BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka-central:9092}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

mkdir -p "${DEST}"

log "Starting Kafka metadata backup → ${DEST}"

# Export topic list
log "Exporting topic list..."
kafka-topics.sh --bootstrap-server "${KAFKA_BOOTSTRAP}" --list > "${DEST}/topics.txt" 2>/dev/null
TOPIC_COUNT=$(wc -l < "${DEST}/topics.txt")
log "  Found ${TOPIC_COUNT} topics."

# Export topic configurations (describe each topic)
log "Exporting topic configurations..."
while IFS= read -r TOPIC; do
  [ -z "${TOPIC}" ] && continue
  kafka-topics.sh --bootstrap-server "${KAFKA_BOOTSTRAP}" \
    --describe --topic "${TOPIC}" >> "${DEST}/topic-configs.txt" 2>/dev/null
done < "${DEST}/topics.txt"
log "  Topic configs saved."

# Export consumer group list
log "Exporting consumer groups..."
kafka-consumer-groups.sh --bootstrap-server "${KAFKA_BOOTSTRAP}" --list \
  > "${DEST}/consumer-groups.txt" 2>/dev/null
GROUP_COUNT=$(wc -l < "${DEST}/consumer-groups.txt")
log "  Found ${GROUP_COUNT} consumer groups."

# Export consumer group offsets
log "Exporting consumer group offsets..."
mkdir -p "${DEST}/offsets"
while IFS= read -r GROUP; do
  [ -z "${GROUP}" ] && continue
  kafka-consumer-groups.sh --bootstrap-server "${KAFKA_BOOTSTRAP}" \
    --describe --group "${GROUP}" > "${DEST}/offsets/${GROUP}.txt" 2>/dev/null || {
    log "  WARNING: Could not export offsets for group ${GROUP}"
    continue
  }
done < "${DEST}/consumer-groups.txt"
log "  Consumer group offsets saved."

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/kafka" -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null || true

log "Kafka metadata backup complete."
