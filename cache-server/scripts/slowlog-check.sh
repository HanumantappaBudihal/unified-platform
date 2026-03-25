#!/bin/bash
# Check Redis slow query log across all cluster nodes

set -e
AUTH="--user admin -a ${REDIS_ADMIN_PASSWORD:-admin-secret} --no-auth-warning"

echo "=========================================="
echo "  Redis Slow Query Report"
echo "=========================================="
echo ""

TOTAL_SLOW=0

for port in 6371 6372 6373 6374 6375 6376; do
  NODE="redis-node-$((port - 6370))"
  COUNT=$(docker exec "$NODE" redis-cli -p "$port" $AUTH SLOWLOG LEN 2>/dev/null || echo "0")
  COUNT=${COUNT:-0}
  TOTAL_SLOW=$((TOTAL_SLOW + COUNT))

  if [ "$COUNT" -gt 0 ]; then
    echo "Node $NODE (port $port): $COUNT slow queries"
    echo "  Latest 5:"
    docker exec "$NODE" redis-cli -p "$port" $AUTH SLOWLOG GET 5 2>/dev/null | head -30 | sed 's/^/    /'
    echo ""
  else
    echo "Node $NODE (port $port): No slow queries"
  fi
done

echo ""
echo "Total slow queries across cluster: $TOTAL_SLOW"

# Show current threshold
THRESHOLD=$(docker exec redis-node-1 redis-cli -p 6371 $AUTH CONFIG GET slowlog-log-slower-than 2>/dev/null | tail -1)
echo "Current threshold: ${THRESHOLD:-10000} microseconds"
echo ""

if [ "$TOTAL_SLOW" -gt 10 ]; then
  echo "WARNING: High number of slow queries detected."
  echo "Consider:"
  echo "  - Reviewing query patterns"
  echo "  - Adding indexes (RedisSearch)"
  echo "  - Optimizing data structures"
fi
echo ""
