#!/bin/bash
# ============================================
# Kafka Central Server - Status Check
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=========================================="
echo "  Kafka Central Server - Status"
echo "=========================================="
echo ""

docker compose --profile connect --profile monitoring ps

echo ""
echo "=========================================="
echo "  Quick Health Checks"
echo "=========================================="

# Kafka broker
echo -n "Kafka Broker   : "
if docker exec kafka-central /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1; then
  echo "HEALTHY"
else
  echo "DOWN"
fi

# Schema Registry
echo -n "Schema Registry: "
if curl -sf http://localhost:8081/subjects > /dev/null 2>&1; then
  echo "HEALTHY"
else
  echo "DOWN"
fi

# Kafka UI
echo -n "Kafka UI       : "
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
  echo "HEALTHY"
else
  echo "DOWN"
fi

echo ""
