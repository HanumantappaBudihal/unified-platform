# 02 - Application Integration Guide

## Connecting Your Application to the Central Kafka

### Connection Details

| Property             | Value                          |
| -------------------- | ------------------------------ |
| Bootstrap Servers    | `kafka-central:9092` (Docker)  |
|                      | `localhost:9092` (host machine)|
| Schema Registry URL  | `http://localhost:8081`        |
| Kafka Connect REST   | `http://localhost:8083`        |

> **Note:** If your application runs inside Docker on the same `kafka-network`, use `kafka:9092`. If it runs on the host machine, use `localhost:9092`.

---

## Topic Naming Convention

```
<domain>.<application>.<event-type>
```

**Examples:**
| Topic Name                           | Producer App | Purpose                    |
| ------------------------------------ | ------------ | -------------------------- |
| `orders.checkout.order-created`      | Checkout     | New order placed           |
| `orders.checkout.order-cancelled`    | Checkout     | Order cancellation         |
| `users.auth.login-event`            | Auth Service | User login tracking        |
| `inventory.warehouse.stock-updated`  | Warehouse    | Stock level changes        |
| `notifications.email.send-request`   | Any          | Email dispatch requests    |

---

## Integration Examples

### Java / Spring Boot

**pom.xml dependencies:**
```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

**application.yml:**
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: ${spring.application.name}
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer
```

**Producer:**
```java
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, String> kafkaTemplate;

    public OrderEventProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendOrderCreated(String orderId, String payload) {
        kafkaTemplate.send("orders.checkout.order-created", orderId, payload);
    }
}
```

**Consumer:**
```java
@Service
public class OrderEventConsumer {

    @KafkaListener(topics = "orders.checkout.order-created", groupId = "inventory-service")
    public void handleOrderCreated(String message) {
        // Process the order event
        System.out.println("Received order: " + message);
    }
}
```

---

### Node.js (kafkajs)

**Install:**
```bash
npm install kafkajs
```

**Producer:**
```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function sendEvent() {
  await producer.connect();
  await producer.send({
    topic: 'orders.checkout.order-created',
    messages: [
      { key: 'order-123', value: JSON.stringify({ id: 123, total: 99.99 }) },
    ],
  });
  await producer.disconnect();
}
```

**Consumer:**
```javascript
const consumer = kafka.consumer({ groupId: 'notification-service' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders.checkout.order-created', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        key: message.key.toString(),
        value: message.value.toString(),
      });
    },
  });
}
```

---

### Python (confluent-kafka)

**Install:**
```bash
pip install confluent-kafka
```

**Producer:**
```python
from confluent_kafka import Producer

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def send_event(topic, key, value):
    producer.produce(topic, key=key, value=value)
    producer.flush()

send_event('orders.checkout.order-created', 'order-123', '{"id": 123}')
```

**Consumer:**
```python
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'analytics-service',
    'auto.offset.reset': 'earliest',
})

consumer.subscribe(['orders.checkout.order-created'])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    print(f"Received: {msg.value().decode('utf-8')}")
```

---

## Docker Network Integration

If your application also runs via Docker Compose, add it to the `kafka-network`:

```yaml
# In your application's docker-compose.yml
services:
  my-app:
    image: my-app:latest
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      SCHEMA_REGISTRY_URL: http://schema-registry:8081
    networks:
      - kafka-network

networks:
  kafka-network:
    external: true
    name: kafka-network
```

> The `kafka-network` is created by the central Kafka server. Your app joins it as an external network.
