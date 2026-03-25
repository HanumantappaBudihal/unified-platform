#!/bin/bash
# ============================================
# Initialize Standard Topics + Dead Letter Queues
# Run after the Kafka broker is healthy
# ============================================

set -e

KAFKA_CONTAINER="kafka-central"
BOOTSTRAP="localhost:9092"
PARTITIONS=3
REPLICATION=1

echo "=========================================="
echo "  Kafka Topic Initialization"
echo "=========================================="

create_topic() {
  local topic="$1"
  local partitions="${2:-$PARTITIONS}"
  local replication="${3:-$REPLICATION}"
  local retention="${4:-}"
  local config_flag=""

  if [ -n "$retention" ]; then
    config_flag="--config retention.ms=$retention"
  fi

  echo "  Creating: $topic (partitions=$partitions, replication=$replication)"
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-topics.sh \
    --create \
    --bootstrap-server "$BOOTSTRAP" \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor "$replication" \
    $config_flag \
    --if-not-exists 2>/dev/null || echo "    (already exists)"
}

# ---- Standard Application Topics ----
echo ""
echo "Creating application topics..."

create_topic "orders.checkout.order-created"
create_topic "orders.checkout.order-updated"
create_topic "orders.checkout.order-cancelled"
create_topic "users.auth.login-event"
create_topic "users.auth.signup-event"
create_topic "inventory.warehouse.stock-updated"
create_topic "notifications.email.send-request"
create_topic "notifications.sms.send-request"
create_topic "notifications.push.send-request"

# ---- Dead Letter Queue Topics ----
# Retention: 30 days (2592000000 ms) — longer than normal topics
# so failed messages can be investigated
echo ""
echo "Creating Dead Letter Queue (DLQ) topics..."

DLQ_RETENTION=2592000000  # 30 days

create_topic "orders.checkout.order-created.dlq"       3 1 "$DLQ_RETENTION"
create_topic "orders.checkout.order-updated.dlq"       3 1 "$DLQ_RETENTION"
create_topic "orders.checkout.order-cancelled.dlq"     3 1 "$DLQ_RETENTION"
create_topic "users.auth.login-event.dlq"              3 1 "$DLQ_RETENTION"
create_topic "inventory.warehouse.stock-updated.dlq"   3 1 "$DLQ_RETENTION"
create_topic "notifications.email.send-request.dlq"    3 1 "$DLQ_RETENTION"
create_topic "notifications.sms.send-request.dlq"      3 1 "$DLQ_RETENTION"
create_topic "notifications.push.send-request.dlq"     3 1 "$DLQ_RETENTION"

# Kafka Connect DLQ
create_topic "_connect-dlq"                            3 1 "$DLQ_RETENTION"

# ---- Internal / System Topics ----
echo ""
echo "Creating system topics..."

create_topic "_audit-log"       3 1 "$DLQ_RETENTION"
create_topic "_health-checks"   1 1

# ---- Set Schema Compatibility ----
echo ""
echo "Setting Schema Registry compatibility to BACKWARD..."
curl -s -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility":"BACKWARD"}' \
  http://localhost:8081/config | echo "  Schema compatibility: BACKWARD (default)"

echo ""
echo "=========================================="
echo "  Topic initialization complete!"
echo "=========================================="
echo ""
echo "  All topics:"
docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server "$BOOTSTRAP" | sort
echo ""
