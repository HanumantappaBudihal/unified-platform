# 08 - Dead Letter Queue (DLQ) Guide

## What is a Dead Letter Queue?

A Dead Letter Queue (DLQ) is a dedicated Kafka topic where messages that cannot be processed by consumers are redirected. This prevents failed messages from blocking the main pipeline and provides a space for investigation and recovery.

## DLQ Naming Convention

Every application topic has a corresponding DLQ topic:

```
<original-topic>.dlq

Example:
  orders.checkout.order-created      → orders.checkout.order-created.dlq
  notifications.email.send-request   → notifications.email.send-request.dlq
```

Kafka Connect uses: `_connect-dlq`

## Pre-Created DLQ Topics

Run the init script to create all standard topics and their DLQs:

```bash
bash scripts/init-topics.sh
```

DLQ topics are created with **30-day retention** (vs 7 days for normal topics), giving more time to investigate failed messages.

## DLQ Configuration

| Property | Normal Topic | DLQ Topic |
| -------- | ------------ | --------- |
| Retention | 7 days | 30 days |
| Partitions | 3 | 3 |
| Replication | 1 | 1 |

## Implementing DLQ in Your Application

### Spring Boot (Java)

```java
@Configuration
public class KafkaConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            KafkaTemplate<String, String> kafkaTemplate) {

        // Dead Letter Topic publisher
        DeadLetterPublishingRecoverer recoverer =
            new DeadLetterPublishingRecoverer(kafkaTemplate,
                (record, ex) -> new TopicPartition(record.topic() + ".dlq", record.partition()));

        // Retry 3 times, then send to DLQ
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3));

        ConcurrentKafkaListenerContainerFactory<String, String> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }
}
```

### Node.js (kafkajs)

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'my-app', brokers: ['localhost:9092'] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'my-group' });

async function processWithDLQ(topic) {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // Process message
        const value = JSON.parse(message.value.toString());
        await handleMessage(value);
      } catch (error) {
        // Send to DLQ on failure
        console.error(`Failed to process message, sending to DLQ: ${error.message}`);
        await producer.send({
          topic: `${topic}.dlq`,
          messages: [{
            key: message.key,
            value: message.value,
            headers: {
              'dlq.original.topic': topic,
              'dlq.original.partition': String(partition),
              'dlq.original.offset': message.offset,
              'dlq.error.message': error.message,
              'dlq.timestamp': new Date().toISOString(),
            }
          }]
        });
      }
    }
  });
}
```

### Python (confluent-kafka)

```python
from confluent_kafka import Consumer, Producer
import json, traceback

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def send_to_dlq(original_topic, message, error):
    headers = [
        ('dlq.original.topic', original_topic.encode()),
        ('dlq.error.message', str(error).encode()),
    ]
    producer.produce(
        topic=f"{original_topic}.dlq",
        key=message.key(),
        value=message.value(),
        headers=headers,
    )
    producer.flush()

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'my-group',
    'auto.offset.reset': 'earliest',
})
consumer.subscribe(['orders.checkout.order-created'])

while True:
    msg = consumer.poll(1.0)
    if msg is None:
        continue
    try:
        process_message(msg)
    except Exception as e:
        send_to_dlq(msg.topic(), msg, e)
```

## DLQ Headers (Best Practice)

Always include context headers when sending to DLQ:

| Header | Value |
| ------ | ----- |
| `dlq.original.topic` | Source topic name |
| `dlq.original.partition` | Source partition |
| `dlq.original.offset` | Source offset |
| `dlq.error.message` | Error description |
| `dlq.error.class` | Exception class name |
| `dlq.timestamp` | When the failure occurred |
| `dlq.retry.count` | Number of retries attempted |

## Monitoring DLQs

### Via Kafka UI
1. Go to [http://localhost:8080](http://localhost:8080)
2. Filter topics by `.dlq` suffix
3. Browse messages to see failed events and error headers

### Via Grafana
The pre-built dashboard includes a **Dead Letter Queues** section showing:
- Total DLQ message count (should be 0 in healthy state)
- DLQ messages per topic over time

### Via Prometheus Alerts
Configured alerts:
- `KafkaDLQMessagesDetected` — warning when any DLQ has messages
- `KafkaDLQGrowing` — critical when DLQ is actively receiving new messages

## Reprocessing DLQ Messages

To replay failed messages back to the original topic:

```bash
# Read from DLQ and produce back to original topic
docker exec -it kafka-central /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders.checkout.order-created.dlq \
  --from-beginning \
  --max-messages 10 | \
docker exec -i kafka-central /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders.checkout.order-created
```

Or use the Kafka UI to browse individual messages and selectively produce them back.
