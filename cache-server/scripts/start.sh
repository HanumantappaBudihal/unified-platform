#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PROFILES=""

case "${1:-}" in
  --full)
    PROFILES="--profile monitoring --profile portal"
    echo "Starting all services (Redis Cluster + Monitoring + Portal)..."
    ;;
  --monitoring)
    PROFILES="--profile monitoring"
    echo "Starting Redis Cluster + Monitoring..."
    ;;
  --portal)
    PROFILES="--profile portal"
    echo "Starting Redis Cluster + Portal..."
    ;;
  *)
    echo "Starting core services (Redis Cluster + Redis Insight)..."
    ;;
esac

docker compose $PROFILES up -d

echo ""
echo "Services started. Waiting for Redis nodes to be healthy..."
sleep 5

# Check if cluster needs initialization
CLUSTER_INFO=$(docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER INFO 2>/dev/null || echo "")

if echo "$CLUSTER_INFO" | grep -q "cluster_state:ok"; then
  echo "Redis cluster is already initialized and healthy."
else
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  Redis cluster needs initialization. Run:                   ║"
  echo "║  bash scripts/init-cluster.sh                               ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
fi

echo ""
echo "Service URLs:"
echo "  Redis Nodes:     localhost:6371-6376"
echo "  Redis Insight:   http://localhost:5540"

if echo "$PROFILES" | grep -q "monitoring"; then
  echo "  Prometheus:      http://localhost:9090"
  echo "  Grafana:         http://localhost:3000"
  echo "  Alertmanager:    http://localhost:9094"
fi

if echo "$PROFILES" | grep -q "portal"; then
  echo "  Cache Portal:    http://localhost:3002"
fi

echo ""
