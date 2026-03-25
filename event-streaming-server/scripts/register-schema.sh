#!/bin/bash
# Register Avro schemas for key topics in Schema Registry

set -e
SR_URL="${SCHEMA_REGISTRY_URL:-http://localhost:8081}"

echo "=========================================="
echo "  Schema Registry - Register Schemas"
echo "=========================================="

register_schema() {
  local subject="$1"
  local schema="$2"
  echo "  Registering: $subject"
  curl -sf -X POST "$SR_URL/subjects/$subject/versions" \
    -H "Content-Type: application/vnd.schemaregistry.v1+json" \
    -d "$schema" | jq -r '"    -> version " + (.id | tostring)' 2>/dev/null || echo "    (registered or exists)"
}

# Order Created
register_schema "orders.checkout.order-created-value" '{
  "schema": "{\"type\":\"record\",\"name\":\"OrderCreated\",\"namespace\":\"com.company.orders\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"customerId\",\"type\":\"string\"},{\"name\":\"items\",\"type\":{\"type\":\"array\",\"items\":{\"type\":\"record\",\"name\":\"OrderItem\",\"fields\":[{\"name\":\"productId\",\"type\":\"string\"},{\"name\":\"quantity\",\"type\":\"int\"},{\"name\":\"price\",\"type\":\"double\"}]}}},{\"name\":\"totalAmount\",\"type\":\"double\"},{\"name\":\"currency\",\"type\":{\"type\":\"string\",\"default\":\"USD\"}},{\"name\":\"createdAt\",\"type\":{\"type\":\"long\",\"logicalType\":\"timestamp-millis\"}}]}"
}'

# Order Updated
register_schema "orders.checkout.order-updated-value" '{
  "schema": "{\"type\":\"record\",\"name\":\"OrderUpdated\",\"namespace\":\"com.company.orders\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"status\",\"type\":{\"type\":\"enum\",\"name\":\"OrderStatus\",\"symbols\":[\"PENDING\",\"CONFIRMED\",\"SHIPPED\",\"DELIVERED\",\"CANCELLED\"]}},{\"name\":\"updatedAt\",\"type\":{\"type\":\"long\",\"logicalType\":\"timestamp-millis\"}}]}"
}'

# Stock Updated
register_schema "inventory.warehouse.stock-updated-value" '{
  "schema": "{\"type\":\"record\",\"name\":\"StockUpdated\",\"namespace\":\"com.company.inventory\",\"fields\":[{\"name\":\"productId\",\"type\":\"string\"},{\"name\":\"warehouseId\",\"type\":\"string\"},{\"name\":\"quantity\",\"type\":\"int\"},{\"name\":\"operation\",\"type\":{\"type\":\"enum\",\"name\":\"StockOp\",\"symbols\":[\"ADD\",\"REMOVE\",\"SET\"]}},{\"name\":\"timestamp\",\"type\":{\"type\":\"long\",\"logicalType\":\"timestamp-millis\"}}]}"
}'

# Login Event
register_schema "users.auth.login-event-value" '{
  "schema": "{\"type\":\"record\",\"name\":\"LoginEvent\",\"namespace\":\"com.company.auth\",\"fields\":[{\"name\":\"userId\",\"type\":\"string\"},{\"name\":\"email\",\"type\":\"string\"},{\"name\":\"ipAddress\",\"type\":\"string\"},{\"name\":\"userAgent\",\"type\":\"string\"},{\"name\":\"success\",\"type\":\"boolean\"},{\"name\":\"timestamp\",\"type\":{\"type\":\"long\",\"logicalType\":\"timestamp-millis\"}}]}"
}'

echo ""
echo "All schemas:"
curl -sf "$SR_URL/subjects" | jq -r '.[]' 2>/dev/null | sort | sed 's/^/  /'
echo ""
echo "=========================================="
echo "  Schema registration complete!"
echo "=========================================="
