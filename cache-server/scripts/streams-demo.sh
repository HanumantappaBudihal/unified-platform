#!/bin/bash
# Redis Streams demo — event sourcing / lightweight message queue
# Shows XADD, XREAD, consumer groups, and XACK

set -e
NODE="redis-node-1"
PORT=6371
AUTH="--user admin -a ${REDIS_ADMIN_PASSWORD:-admin-secret} --no-auth-warning"
CMD="docker exec $NODE redis-cli -p $PORT $AUTH -c"

echo "=========================================="
echo "  Redis Streams Demo"
echo "=========================================="

# Create a stream with events
echo ""
echo "1. Adding events to stream 'events:orders'..."
$CMD XADD events:orders '*' action created orderId ORD-001 amount 99.99
$CMD XADD events:orders '*' action updated orderId ORD-001 status confirmed
$CMD XADD events:orders '*' action created orderId ORD-002 amount 149.50
$CMD XADD events:orders '*' action shipped orderId ORD-001 tracking TRK-123

# Read all entries
echo ""
echo "2. Reading all entries (XRANGE)..."
$CMD XRANGE events:orders - +

# Stream info
echo ""
echo "3. Stream info (XINFO STREAM)..."
$CMD XINFO STREAM events:orders

# Create consumer group
echo ""
echo "4. Creating consumer group 'order-processors'..."
$CMD XGROUP CREATE events:orders order-processors 0 MKSTREAM 2>/dev/null || echo "   (group already exists)"

# Read as consumer
echo ""
echo "5. Reading as consumer 'worker-1' (XREADGROUP)..."
$CMD XREADGROUP GROUP order-processors worker-1 COUNT 2 STREAMS events:orders '>'

# Acknowledge
echo ""
echo "6. Acknowledging processed messages (XACK)..."
PENDING=$($CMD XPENDING events:orders order-processors - + 10 | head -1 | awk '{print $1}')
if [ -n "$PENDING" ]; then
  $CMD XACK events:orders order-processors "$PENDING"
  echo "   Acknowledged: $PENDING"
fi

# Pending info
echo ""
echo "7. Pending entries check..."
$CMD XPENDING events:orders order-processors

echo ""
echo "=========================================="
echo "  Streams demo complete!"
echo "  Use Redis Insight (http://localhost:5540) to explore."
echo "=========================================="
