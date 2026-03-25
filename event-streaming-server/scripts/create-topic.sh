#!/bin/bash
# ============================================
# Create a Kafka Topic
# Usage: ./create-topic.sh <topic-name> [partitions] [replication-factor]
# ============================================

TOPIC_NAME="${1:?Usage: ./create-topic.sh <topic-name> [partitions] [replication-factor]}"
PARTITIONS="${2:-3}"
REPLICATION="${3:-1}"

echo "Creating topic: $TOPIC_NAME (partitions=$PARTITIONS, replication=$REPLICATION)"

docker exec kafka-central /opt/kafka/bin/kafka-topics.sh \
  --create \
  --bootstrap-server localhost:9092 \
  --topic "$TOPIC_NAME" \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION"

echo "Topic '$TOPIC_NAME' created successfully."
echo ""
echo "List all topics:"
docker exec kafka-central /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092
