#!/bin/bash
# ============================================
# Kafka Central Server - Health Check Endpoint
# Returns JSON health status of all services
# Can be used by external monitoring or load balancers
# ============================================

OVERALL="healthy"
SERVICES=()

check_service() {
  local name="$1"
  local url="$2"
  local status="healthy"

  if ! curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
    status="unhealthy"
    OVERALL="unhealthy"
  fi

  SERVICES+=("\"$name\":\"$status\"")
}

check_container() {
  local name="$1"
  local container="$2"
  local status="healthy"

  if ! docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null | grep -q "healthy"; then
    status="unhealthy"
    OVERALL="unhealthy"
  fi

  SERVICES+=("\"$name\":\"$status\"")
}

# Check all services
check_container "kafka" "kafka-central"
check_service "schema-registry" "http://localhost:8081/subjects"
check_service "kafka-ui" "http://localhost:8080"
check_service "rest-proxy" "http://localhost:8082/topics"

# Optional services
if docker ps --format '{{.Names}}' | grep -q "kafka-connect"; then
  check_service "kafka-connect" "http://localhost:8083/connectors"
fi

if docker ps --format '{{.Names}}' | grep -q "kafka-prometheus"; then
  check_service "prometheus" "http://localhost:9090/-/healthy"
fi

if docker ps --format '{{.Names}}' | grep -q "kafka-grafana"; then
  check_service "grafana" "http://localhost:3000/api/health"
fi

if docker ps --format '{{.Names}}' | grep -q "kafka-exporter"; then
  check_service "kafka-exporter" "http://localhost:9308/metrics"
fi

# Build JSON
SERVICES_JSON=$(IFS=,; echo "${SERVICES[*]}")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "{\"status\":\"$OVERALL\",\"timestamp\":\"$TIMESTAMP\",\"services\":{$SERVICES_JSON}}"
