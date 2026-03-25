#!/bin/bash
# Enable log compaction on stateful topics
# Compacted topics keep the latest value per key indefinitely

set -e
KAFKA_CONTAINER="kafka-central"
BOOTSTRAP="localhost:9092"

echo "=========================================="
echo "  Configure Topic Compaction"
echo "=========================================="

enable_compaction() {
  local topic="$1"
  echo "  Enabling compaction: $topic"
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-configs.sh \
    --bootstrap-server "$BOOTSTRAP" \
    --alter --entity-type topics --entity-name "$topic" \
    --add-config "cleanup.policy=compact,min.cleanable.dirty.ratio=0.1,delete.retention.ms=86400000" \
    2>/dev/null || echo "    (failed - topic may not exist)"
}

# Stateful topics suitable for compaction
echo ""
echo "Stateful topics (latest-value-per-key):"
enable_compaction "inventory.warehouse.stock-updated"

# Create new compacted topics
echo ""
echo "Creating new compacted topics..."

create_compacted() {
  local topic="$1"
  echo "  Creating: $topic (compacted)"
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-topics.sh \
    --create --bootstrap-server "$BOOTSTRAP" \
    --topic "$topic" --partitions 3 --replication-factor 1 \
    --config "cleanup.policy=compact" \
    --config "min.cleanable.dirty.ratio=0.1" \
    --if-not-exists 2>/dev/null || echo "    (already exists)"
}

create_compacted "users.profiles.user-state"
create_compacted "inventory.warehouse.current-stock"
create_compacted "config.application.settings"

echo ""
echo "=========================================="
echo "  Compaction configuration complete!"
echo "=========================================="
