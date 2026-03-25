#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Cache Server Status ==="
echo ""
docker compose --profile monitoring --profile portal ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Redis Cluster Info ==="
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER INFO 2>/dev/null | head -5 || echo "Cluster not reachable"

echo ""
echo "=== Redis Nodes ==="
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER NODES 2>/dev/null | awk '{print $1, $2, $3, $8}' || echo "Cluster not reachable"
echo ""
