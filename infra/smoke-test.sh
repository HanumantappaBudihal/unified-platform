#!/bin/bash
# =============================================================
# Infrastructure Smoke Test
# Starts each server, validates health, runs basic operations
# =============================================================

set -e
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
ERRORS=""

green()  { echo -e "\033[32m$1\033[0m"; }
red()    { echo -e "\033[31m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

check_url() {
  local name="$1" url="$2" max_wait="${3:-60}"
  for i in $(seq 1 $((max_wait / 3))); do
    if curl -sfk --max-time 5 "$url" > /dev/null 2>&1; then
      green "  OK  $name"
      PASS=$((PASS + 1))
      return 0
    fi
    sleep 3
  done
  red "  FAIL  $name ($url)"
  FAIL=$((FAIL + 1))
  ERRORS="$ERRORS\n  - $name: $url"
  return 1
}

echo "============================================"
echo "  Infrastructure Smoke Test"
echo "============================================"
echo ""

# --- Event Streaming Server ---
yellow "Starting Event Streaming Server..."
cd "$BASE_DIR/event-streaming-server" && docker compose up -d 2>/dev/null
check_url "Kafka Broker" "http://localhost:9092" 90 || true
check_url "Schema Registry" "http://localhost:8081/subjects" 60
check_url "REST Proxy" "http://localhost:8082/topics" 60

# --- Cache Server ---
yellow "Starting Cache Server..."
cd "$BASE_DIR/cache-server" && docker compose up -d 2>/dev/null
sleep 10
check_url "Redis (via health-check)" "http://localhost:6371" 30 || {
  # Redis doesn't serve HTTP, check via docker
  if docker exec redis-node-1 redis-cli -p 6371 --user admin -a admin-secret --no-auth-warning ping 2>/dev/null | grep -q PONG; then
    green "  OK  Redis Node 1 (PONG)"
    PASS=$((PASS + 1))
    FAIL=$((FAIL - 1))
  fi
}

# --- Object Storage Server ---
yellow "Starting Object Storage Server..."
cd "$BASE_DIR/object-storage-server" && docker compose up -d 2>/dev/null
check_url "MinIO S3 API" "http://localhost:9000/minio/health/live" 90

# --- Centralized Logging ---
yellow "Starting Centralized Logging..."
cd "$BASE_DIR/centralized-logging" && docker compose up -d 2>/dev/null
check_url "Loki" "http://localhost:3100/ready" 60
check_url "Grafana (Logging)" "http://localhost:3008/api/health" 60

# --- Health Aggregation ---
yellow "Starting Health Aggregation..."
cd "$BASE_DIR/health-aggregation" && docker compose up -d 2>/dev/null
check_url "Uptime Kuma" "http://localhost:3010" 60

echo ""
echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"

if [ $FAIL -gt 0 ]; then
  echo -e "\nFailed checks:$ERRORS"
fi

# Cleanup
echo ""
read -p "Tear down all services? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  yellow "Tearing down..."
  cd "$BASE_DIR/event-streaming-server" && docker compose down -v 2>/dev/null
  cd "$BASE_DIR/cache-server" && docker compose down -v 2>/dev/null
  cd "$BASE_DIR/object-storage-server" && docker compose down -v 2>/dev/null
  cd "$BASE_DIR/centralized-logging" && docker compose down -v 2>/dev/null
  cd "$BASE_DIR/health-aggregation" && docker compose down -v 2>/dev/null
  green "All services stopped."
fi

exit $FAIL
