#!/bin/bash
# ============================================
# Initialize Kafka Security (Phase 4)
# Creates SCRAM users and sets up ACLs
# Run after starting with --secure profile
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

KAFKA_CONTAINER="kafka-central"
BOOTSTRAP="localhost:9092"

echo "=========================================="
echo "  Kafka Security Initialization"
echo "=========================================="

# ---- Create SCRAM Users ----
echo ""
echo "Creating SCRAM users..."

create_user() {
  local username="$1"
  local password="$2"
  echo "  Creating user: $username"
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-configs.sh \
    --bootstrap-server "$BOOTSTRAP" \
    --alter \
    --add-config "SCRAM-SHA-256=[password=$password]" \
    --entity-type users \
    --entity-name "$username"
}

# Admin user (for Kafka UI and internal tools)
create_user "admin" "admin-secret"

# Application users - add your apps here
create_user "checkout-service" "checkout-secret-123"
create_user "inventory-service" "inventory-secret-456"
create_user "notification-service" "notification-secret-789"
create_user "analytics-service" "analytics-secret-012"

# ---- Set up ACLs ----
echo ""
echo "Setting up ACLs..."

set_acl() {
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-acls.sh \
    --bootstrap-server "$BOOTSTRAP" \
    --add "$@"
}

# Admin - full access
set_acl --allow-principal User:admin --operation All --topic "*" --group "*"

# checkout-service: produce to orders.*, consume from notifications.*
set_acl --allow-principal User:checkout-service --operation Write --topic "orders." --resource-pattern-type prefixed
set_acl --allow-principal User:checkout-service --operation Read --topic "notifications." --resource-pattern-type prefixed
set_acl --allow-principal User:checkout-service --operation Read --group "checkout-service"

# inventory-service: consume from orders.*, produce to inventory.*
set_acl --allow-principal User:inventory-service --operation Read --topic "orders." --resource-pattern-type prefixed
set_acl --allow-principal User:inventory-service --operation Read --group "inventory-service"
set_acl --allow-principal User:inventory-service --operation Write --topic "inventory." --resource-pattern-type prefixed

# notification-service: consume from notifications.*, produce to notifications.*
set_acl --allow-principal User:notification-service --operation Read --topic "notifications." --resource-pattern-type prefixed
set_acl --allow-principal User:notification-service --operation Write --topic "notifications." --resource-pattern-type prefixed
set_acl --allow-principal User:notification-service --operation Read --group "notification-service"

# analytics-service: read-only access to all topics
set_acl --allow-principal User:analytics-service --operation Read --topic "*"
set_acl --allow-principal User:analytics-service --operation Read --group "analytics-service"

# ---- Set Quotas ----
echo ""
echo "Setting quotas..."

set_quota() {
  local username="$1"
  local producer_rate="$2"
  local consumer_rate="$3"
  echo "  Quota for $username: produce=${producer_rate}B/s, consume=${consumer_rate}B/s"
  docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-configs.sh \
    --bootstrap-server "$BOOTSTRAP" \
    --alter \
    --add-config "producer_byte_rate=$producer_rate,consumer_byte_rate=$consumer_rate" \
    --entity-type users \
    --entity-name "$username"
}

# 10 MB/s produce, 20 MB/s consume per app
set_quota "checkout-service"      10485760 20971520
set_quota "inventory-service"     10485760 20971520
set_quota "notification-service"  10485760 20971520
set_quota "analytics-service"     5242880  41943040  # lower produce, higher consume (read-heavy)

echo ""
echo "=========================================="
echo "  Security initialization complete!"
echo "=========================================="
echo ""
echo "  Users created: admin, checkout-service, inventory-service,"
echo "                 notification-service, analytics-service"
echo "  ACLs: configured per-app topic access"
echo "  Quotas: rate limits applied"
echo ""
echo "  List all ACLs:"
echo "    docker exec $KAFKA_CONTAINER /opt/kafka/bin/kafka-acls.sh --bootstrap-server $BOOTSTRAP --list"
echo ""
