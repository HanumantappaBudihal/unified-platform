#!/bin/bash
# Monitor Dead Letter Queue topics for unprocessed messages

set -e
KAFKA_CONTAINER="kafka-central"
BOOTSTRAP="localhost:9092"

echo "=========================================="
echo "  Dead Letter Queue Monitor"
echo "=========================================="
echo ""

DLQ_TOPICS=$(docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server "$BOOTSTRAP" 2>/dev/null | grep '\.dlq$' | sort)

if [ -z "$DLQ_TOPICS" ]; then
  echo "  No DLQ topics found."
  exit 0
fi

TOTAL_DLQ=0
ALERT=0

while IFS= read -r topic; do
  # Get end offsets for all partitions
  OFFSETS=$(docker exec "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-run-class.sh \
    kafka.tools.GetOffsetShell \
    --broker-list "$BOOTSTRAP" \
    --topic "$topic" 2>/dev/null | awk -F: '{sum += $3} END {print sum}')

  OFFSETS=${OFFSETS:-0}
  TOTAL_DLQ=$((TOTAL_DLQ + OFFSETS))

  if [ "$OFFSETS" -gt 0 ]; then
    echo "  WARNING  $topic: $OFFSETS messages"
    ALERT=1
  else
    echo "  OK       $topic: empty"
  fi
done <<< "$DLQ_TOPICS"

echo ""
echo "  Total DLQ messages: $TOTAL_DLQ"

if [ $ALERT -eq 1 ]; then
  echo ""
  echo "  ACTION REQUIRED: DLQ topics contain unprocessed messages."
  echo "  Investigate and reprocess or purge."
fi
echo ""
