# 07 - REST Proxy Guide

## Overview

The Confluent REST Proxy provides an HTTP API for Kafka, enabling applications that cannot use native Kafka clients to produce and consume messages via standard HTTP requests.

**URL:** [http://localhost:8082](http://localhost:8082)

Use cases:
- Frontend/browser applications sending events
- Legacy systems without Kafka client libraries
- Quick testing via curl or Postman
- Cross-language integration without native libraries
- Serverless functions / Lambda producing events

## API Reference

### List Topics

```bash
curl -s http://localhost:8082/topics | jq .
```

### Get Topic Details

```bash
curl -s http://localhost:8082/topics/orders.checkout.order-created | jq .
```

### Produce Messages (JSON)

```bash
# Produce a single message
curl -X POST http://localhost:8082/topics/orders.checkout.order-created \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{
    "records": [
      {
        "key": "order-001",
        "value": {"id": "order-001", "total": 99.99, "status": "created"}
      }
    ]
  }'

# Produce multiple messages
curl -X POST http://localhost:8082/topics/orders.checkout.order-created \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{
    "records": [
      {"key": "order-002", "value": {"id": "order-002", "total": 149.99}},
      {"key": "order-003", "value": {"id": "order-003", "total": 29.99}},
      {"key": "order-004", "value": {"id": "order-004", "total": 299.99}}
    ]
  }'
```

### Produce Messages (Avro with Schema Registry)

```bash
curl -X POST http://localhost:8082/topics/orders.checkout.order-created \
  -H "Content-Type: application/vnd.kafka.avro.v2+json" \
  -d '{
    "value_schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"total\",\"type\":\"double\"}]}",
    "records": [
      {"value": {"id": "order-005", "total": 59.99}}
    ]
  }'
```

### Consume Messages

Consuming via REST Proxy is a multi-step process:

```bash
# Step 1: Create a consumer instance
curl -X POST http://localhost:8082/consumers/my-rest-consumer \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{
    "name": "rest-consumer-1",
    "format": "json",
    "auto.offset.reset": "earliest"
  }'

# Step 2: Subscribe to a topic
curl -X POST http://localhost:8082/consumers/my-rest-consumer/instances/rest-consumer-1/subscription \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{"topics": ["orders.checkout.order-created"]}'

# Step 3: Read messages (poll)
curl -s http://localhost:8082/consumers/my-rest-consumer/instances/rest-consumer-1/records \
  -H "Accept: application/vnd.kafka.json.v2+json" | jq .

# Step 4: Delete consumer when done
curl -X DELETE http://localhost:8082/consumers/my-rest-consumer/instances/rest-consumer-1
```

### Get Partitions

```bash
curl -s http://localhost:8082/topics/orders.checkout.order-created/partitions | jq .
```

### Get Partition Offsets

```bash
curl -s http://localhost:8082/topics/orders.checkout.order-created/partitions/0/offsets | jq .
```

### Get Broker Info

```bash
curl -s http://localhost:8082/brokers | jq .
```

## CORS Configuration

The REST Proxy is configured with CORS headers enabled for all origins:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

For production, restrict this to your specific frontend domains in `docker-compose.yml`:

```yaml
KAFKA_REST_ACCESS_CONTROL_ALLOW_ORIGIN: "https://your-frontend.com"
```

## Integration Examples

### JavaScript (Fetch API)

```javascript
// Produce from browser / Node.js
async function produceToKafka(topic, key, value) {
  const response = await fetch(`http://localhost:8082/topics/${topic}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.kafka.json.v2+json' },
    body: JSON.stringify({
      records: [{ key, value }]
    })
  });
  return response.json();
}

await produceToKafka('notifications.push.send-request', 'user-123', {
  userId: 'user-123',
  title: 'Order shipped',
  body: 'Your order #456 has been shipped'
});
```

### Python (requests)

```python
import requests

def produce(topic, key, value):
    resp = requests.post(
        f"http://localhost:8082/topics/{topic}",
        headers={"Content-Type": "application/vnd.kafka.json.v2+json"},
        json={"records": [{"key": key, "value": value}]}
    )
    return resp.json()

produce("orders.checkout.order-created", "order-100", {"id": 100, "total": 42.00})
```

### curl (Quick Testing)

```bash
# One-liner to produce a test message
curl -sX POST http://localhost:8082/topics/test \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{"records":[{"value":{"msg":"hello from REST"}}]}' | jq .
```
