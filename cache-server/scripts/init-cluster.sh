#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Redis Cluster Initialization ==="
echo ""

# Wait for all nodes to be ready
echo "Waiting for all Redis nodes to be ready..."
for i in 1 2 3 4 5 6; do
  port=$((6370 + i))
  echo -n "  redis-node-$i (:$port) ... "
  for attempt in $(seq 1 30); do
    if docker exec redis-node-$i redis-cli -p $port -a admin-secret --no-auth-warning PING 2>/dev/null | grep -q "PONG"; then
      echo "ready"
      break
    fi
    if [ "$attempt" -eq 30 ]; then
      echo "FAILED (not responding after 30 attempts)"
      exit 1
    fi
    sleep 1
  done
done

echo ""

# Check if cluster is already formed
CLUSTER_INFO=$(docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER INFO 2>/dev/null)
if echo "$CLUSTER_INFO" | grep -q "cluster_state:ok"; then
  echo "Cluster is already initialized and healthy!"
  echo ""
  docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER NODES 2>/dev/null
  exit 0
fi

echo "Creating Redis Cluster (3 masters + 3 replicas)..."
echo ""

# Create the cluster
docker exec redis-node-1 redis-cli -a admin-secret --no-auth-warning --cluster create \
  redis-node-1:6371 \
  redis-node-2:6372 \
  redis-node-3:6373 \
  redis-node-4:6374 \
  redis-node-5:6375 \
  redis-node-6:6376 \
  --cluster-replicas 1 \
  --cluster-yes

echo ""
echo "Cluster created! Verifying..."
sleep 2

# Verify
echo ""
echo "=== Cluster State ==="
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER INFO 2>/dev/null | head -5

echo ""
echo "=== Cluster Nodes ==="
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning CLUSTER NODES 2>/dev/null

echo ""
echo "=== ACL Users ==="
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning ACL LIST 2>/dev/null

echo ""
echo "Redis Cluster initialized successfully!"
echo ""
echo "Test with:"
echo "  docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning SET test:hello world"
echo "  docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --no-auth-warning GET test:hello"
echo ""
