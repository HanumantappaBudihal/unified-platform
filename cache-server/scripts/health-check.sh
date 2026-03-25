#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

check_service() {
  local name="$1"
  local url="$2"
  local start=$(date +%s%N)

  if curl -sf --max-time 3 "$url" > /dev/null 2>&1; then
    local end=$(date +%s%N)
    local latency=$(( (end - start) / 1000000 ))
    echo "  \"$name\": { \"status\": \"up\", \"latency\": ${latency} },"
  else
    echo "  \"$name\": { \"status\": \"down\" },"
  fi
}

check_redis() {
  local port="$1"
  local name="redis-node-${port}"

  if docker exec redis-node-1 redis-cli -p "$port" -a admin-secret --no-auth-warning PING 2>/dev/null | grep -q "PONG"; then
    echo "  \"$name\": { \"status\": \"up\" },"
  else
    echo "  \"$name\": { \"status\": \"down\" },"
  fi
}

CLUSTER_STATE=$(docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER INFO 2>/dev/null | grep cluster_state | tr -d '\r' | cut -d: -f2 || echo "unknown")

echo "{"
echo "  \"cluster_state\": \"$CLUSTER_STATE\","
echo "  \"services\": {"

for port in 6371 6372 6373 6374 6375 6376; do
  check_redis "$port"
done

check_service "redis-insight" "http://localhost:5540"
check_service "prometheus" "http://localhost:9090/-/ready"
check_service "grafana" "http://localhost:3000/api/health"
check_service "alertmanager" "http://localhost:9094/-/ready"
check_service "cache-portal" "http://localhost:3002"

echo "  \"_end\": true"
echo "  }"
echo "}"
