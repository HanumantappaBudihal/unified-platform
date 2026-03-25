#!/bin/bash
# Configure MinIO bucket event notifications
# Sends events to Kafka topics on object upload/delete

set -e
MINIO_ALIAS="storage"
MC="docker exec minio-init mc"

echo "=========================================="
echo "  MinIO Event Notifications Setup"
echo "=========================================="

# Set alias (using nginx LB)
$MC alias set $MINIO_ALIAS http://storage-nginx:9000 \
  ${MINIO_ROOT_USER:-admin} ${MINIO_ROOT_PASSWORD:-admin-secret-key} 2>/dev/null

# Configure Kafka notification target
echo ""
echo "To enable Kafka notifications, set these MinIO environment variables:"
echo ""
echo "  MINIO_NOTIFY_KAFKA_ENABLE_PRIMARY: 'on'"
echo "  MINIO_NOTIFY_KAFKA_BROKERS_PRIMARY: 'kafka:9092'"
echo "  MINIO_NOTIFY_KAFKA_TOPIC_PRIMARY: 'storage.events.object-changes'"
echo ""

# Configure webhook notification (works without Kafka)
echo "Setting up webhook notifications..."
echo ""

# Enable bucket notifications for each app bucket
for bucket in document-svc media-svc hr-portal analytics-svc; do
  echo "  Configuring events for: $bucket"

  # List current events
  $MC event list "$MINIO_ALIAS/$bucket" 2>/dev/null || echo "    (no events configured)"

  # Example: Add webhook event (uncomment when webhook endpoint is available)
  # $MC event add "$MINIO_ALIAS/$bucket" arn:minio:sqs::PRIMARY:webhook \
  #   --event put,delete --suffix .pdf,.docx,.xlsx 2>/dev/null
done

echo ""
echo "=========================================="
echo "  Notification Types Available"
echo "=========================================="
echo ""
echo "  Kafka:    MINIO_NOTIFY_KAFKA_*     (recommended for event streaming)"
echo "  Webhook:  MINIO_NOTIFY_WEBHOOK_*   (HTTP POST to any endpoint)"
echo "  Redis:    MINIO_NOTIFY_REDIS_*     (pub/sub to Redis)"
echo "  AMQP:     MINIO_NOTIFY_AMQP_*     (RabbitMQ)"
echo ""
echo "  See: https://min.io/docs/minio/linux/administration/monitoring/bucket-notifications.html"
echo ""
