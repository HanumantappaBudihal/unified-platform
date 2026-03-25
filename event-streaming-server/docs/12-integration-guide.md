# Integration Guide — Using Kafka Central from Your Application

This guide explains how any application can connect to the centralized Kafka server for event-driven messaging.

---

## Connection Details

| Method | URL | Use Case |
|--------|-----|----------|
| **Kafka Protocol** (same machine) | `localhost:9092` | Applications on the same host |
| **Kafka Protocol** (network) | `192.168.11.96:19092` | Applications on other devices (use `HOST_IP` from `.env`) |
| **REST Proxy** (HTTP) | `http://localhost:8082` | Any language — produce/consume via HTTP |
| **Schema Registry** | `http://localhost:8081` | Register and retrieve Avro/Protobuf/JSON schemas |

---

## Step 1: Request a Topic

Topics follow the naming convention: `<domain>.<application>.<event-type>`

Examples:
```
payments.stripe.payment-completed
users.auth.user-registered
notifications.email.send-request
```

Each topic gets a corresponding DLQ: `<topic-name>.dlq`

> Auto-creation is **disabled**. Topics must be created before use — via Kafka UI (http://localhost:8080), the Portal (http://localhost:3001/topics), or CLI.

---

## Step 2: Connect Your Application

### Node.js (KafkaJS)

```bash
npm install kafkajs
```

**Producer:**
```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-service',
  brokers: ['localhost:9092'],       // same machine
  // brokers: ['192.168.11.96:19092'], // from another device
});

const producer = kafka.producer();

async function sendEvent(topic, key, data) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{
      key,
      value: JSON.stringify(data),
      headers: {
        'event-type': 'order-created',
        'source': 'my-service',
        'correlation-id': `corr-${Date.now()}`,
      },
    }],
  });
}

// Usage
sendEvent('orders.checkout.order-created', 'ORD-001', {
  orderId: 'ORD-001',
  total: 99.99,
  createdAt: new Date().toISOString(),
});
```

**Consumer:**
```javascript
const consumer = kafka.consumer({ groupId: 'my-service-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['orders.checkout.order-created'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`Received: ${event.orderId} from partition ${partition}`);

      // Process the event...
      // If processing fails, send to DLQ:
      // await sendToDLQ(topic, message);
    },
  });
}
```

**Dead Letter Queue handler:**
```javascript
async function sendToDLQ(originalTopic, message) {
  await producer.send({
    topic: `${originalTopic}.dlq`,
    messages: [{
      key: message.key,
      value: message.value,
      headers: {
        ...message.headers,
        'dlq-reason': 'processing-failed',
        'dlq-original-topic': originalTopic,
        'dlq-timestamp': new Date().toISOString(),
      },
    }],
  });
}
```

---

### Java / Spring Boot

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.kafka</groupId>
  <artifactId>spring-kafka</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  kafka:
    bootstrap-servers: localhost:9092        # same machine
    # bootstrap-servers: 192.168.11.96:19092  # from another device
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
    consumer:
      group-id: my-service-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
```

```java
// Producer
@Service
public class OrderEventProducer {
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    public void sendOrderCreated(Order order) {
        String payload = objectMapper.writeValueAsString(order);
        kafkaTemplate.send("orders.checkout.order-created", order.getId(), payload);
    }
}

// Consumer
@Service
public class OrderEventConsumer {
    @KafkaListener(topics = "orders.checkout.order-created", groupId = "my-service-group")
    public void handleOrderCreated(String message) {
        Order order = objectMapper.readValue(message, Order.class);
        // Process the event...
    }
}
```

---

### Python

```bash
pip install confluent-kafka
```

```python
from confluent_kafka import Producer, Consumer
import json

# --- Producer ---
producer = Producer({
    'bootstrap.servers': 'localhost:9092',       # same machine
    # 'bootstrap.servers': '192.168.11.96:19092', # from another device
    'client.id': 'my-service',
})

def send_event(topic, key, data):
    producer.produce(
        topic,
        key=key,
        value=json.dumps(data),
        headers={'event-type': 'order-created', 'source': 'my-service'},
    )
    producer.flush()

send_event('orders.checkout.order-created', 'ORD-001', {
    'orderId': 'ORD-001',
    'total': 99.99,
})

# --- Consumer ---
consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'my-service-group',
    'auto.offset.reset': 'earliest',
})

consumer.subscribe(['orders.checkout.order-created'])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    if msg.error():
        print(f"Error: {msg.error()}")
        continue

    event = json.loads(msg.value())
    print(f"Received: {event['orderId']}")
```

---

### .NET / C#

```bash
dotnet add package Confluent.Kafka
```

```csharp
// Producer
using Confluent.Kafka;

var config = new ProducerConfig {
    BootstrapServers = "localhost:9092",       // same machine
    // BootstrapServers = "192.168.11.96:19092", // from another device
    ClientId = "my-service"
};

using var producer = new ProducerBuilder<string, string>(config).Build();

var result = await producer.ProduceAsync("orders.checkout.order-created",
    new Message<string, string> {
        Key = "ORD-001",
        Value = JsonSerializer.Serialize(new { OrderId = "ORD-001", Total = 99.99 })
    });

// Consumer
var consumerConfig = new ConsumerConfig {
    BootstrapServers = "localhost:9092",
    GroupId = "my-service-group",
    AutoOffsetReset = AutoOffsetReset.Earliest
};

using var consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
consumer.Subscribe("orders.checkout.order-created");

while (true) {
    var result = consumer.Consume();
    var order = JsonSerializer.Deserialize<Order>(result.Message.Value);
    Console.WriteLine($"Received: {order.OrderId}");
}
```

---

### HTTP (REST Proxy) — Any Language

No Kafka client needed. Use standard HTTP from any language, tool, or platform.

**Produce a message:**
```bash
curl -X POST http://localhost:8082/topics/orders.checkout.order-created \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{
    "records": [{
      "key": "ORD-001",
      "value": {"orderId": "ORD-001", "total": 99.99, "status": "created"}
    }]
  }'
```

**Consume messages (stateless — 3-step flow):**
```bash
# 1. Create a consumer instance
curl -X POST http://localhost:8082/consumers/my-group \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{"name": "my-consumer", "format": "json", "auto.offset.reset": "earliest"}'

# 2. Subscribe to topics
curl -X POST http://localhost:8082/consumers/my-group/instances/my-consumer/subscription \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{"topics": ["orders.checkout.order-created"]}'

# 3. Poll for messages
curl http://localhost:8082/consumers/my-group/instances/my-consumer/records \
  -H "Accept: application/vnd.kafka.json.v2+json"

# 4. Cleanup when done
curl -X DELETE http://localhost:8082/consumers/my-group/instances/my-consumer
```

---

## Step 3: Best Practices

### Message Format
Always include metadata in your events:
```json
{
  "eventId": "evt-uuid-here",
  "eventType": "order-created",
  "source": "orders-service",
  "timestamp": "2026-03-19T10:00:00Z",
  "correlationId": "corr-abc123",
  "data": {
    "orderId": "ORD-001",
    "total": 99.99
  }
}
```

### Consumer Group Naming
Use a consistent pattern: `<service-name>-group`
```
orders-service-group
inventory-service-group
notifications-worker-group
```

### Error Handling & DLQ
1. Wrap message processing in try/catch
2. On failure, forward the original message to `<topic>.dlq` with error headers
3. Monitor DLQ topic message count in Grafana or the Portal

### Idempotency
- Use `eventId` or `orderId` as the message key for ordering
- Track processed event IDs to avoid re-processing duplicates
- Enable `enable.idempotence=true` on producers for exactly-once semantics

### Headers
Use Kafka headers for metadata that doesn't belong in the payload:
| Header | Purpose |
|--------|---------|
| `event-type` | Event name (e.g., `order-created`) |
| `source` | Producing service name |
| `correlation-id` | Trace ID for distributed tracing |
| `content-type` | `application/json`, `application/avro`, etc. |

---

## Step 4: Monitor Your Application

Once connected, you can monitor your application's Kafka usage:

| What | Where |
|------|-------|
| Topics & messages | http://localhost:3001/topics (Portal) |
| Consumer group lag | http://localhost:8080 → Consumer Groups (Kafka UI) |
| Produce/consume test messages | http://localhost:3001/messages (Portal) |
| Dashboards & metrics | http://localhost:3000 (Grafana) |
| Alerts (high lag, DLQ growth) | http://localhost:9094 (Alertmanager) |

---

## Mock Applications — Reference Implementations

Two mock applications in `mock-apps/` demonstrate the full integration pattern:

### Orders Service (`mock-apps/orders-service/`)
- **Produces**: `orders.checkout.order-created`, `order-completed`, `order-cancelled`
- **Consumes**: `inventory.warehouse.stock-reserved`, `low-stock-alert`
- Generates realistic orders every 2-6 seconds (products, customers, addresses, payments)

### Inventory Service (`mock-apps/inventory-service/`)
- **Consumes**: `orders.checkout.order-created`, `order-completed`, `order-cancelled`
- **Produces**: `inventory.warehouse.stock-reserved`, `stock-updated`, `low-stock-alert`
- Maintains in-memory stock for 8 products, sends low-stock alerts when below threshold
- Publishes stock snapshot every 30 seconds

**Start mock apps:**
```bash
cd mock-apps && docker compose up -d
```

**Event flow:**
```
Orders Service                        Inventory Service
    |                                       |
    |-- order-created --------------------->|
    |                                       |-- stock-reserved
    |<-- stock-reserved --------------------|
    |                                       |-- low-stock-alert (if stock < 20)
    |<-- low-stock-alert -------------------|
    |                                       |
    |-- order-cancelled ------------------->|
    |                                       |-- stock-updated (restore stock)
```

Use these as a starting point — copy, modify, and adapt to your service.
