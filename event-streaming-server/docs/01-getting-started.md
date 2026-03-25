# 01 - Getting Started

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Minimum 4 GB RAM available for Docker
- Ports available: 9092, 8080, 8081

## Quick Start

### 1. Start Core Services (Phase 1)

```bash
cd kafka-server
bash scripts/start.sh
```

This starts:
- **Kafka Broker** (KRaft mode) on port `9092`
- **Schema Registry** on port `8081`
- **Kafka UI** on port `8080`

### 2. Access Kafka UI

Open [http://localhost:8080](http://localhost:8080) in your browser.

From the UI you can:
- View broker health and configuration
- Create, delete, and configure topics
- Browse messages in any topic
- Monitor consumer groups and lag
- Manage schemas in Schema Registry

### 3. Start with Additional Services

```bash
# Core + Kafka Connect
bash scripts/start.sh --connect

# Core + Monitoring (Prometheus + Grafana)
bash scripts/start.sh --monitoring

# Everything
bash scripts/start.sh --full
```

### 4. Stop All Services

```bash
bash scripts/stop.sh
```

### 5. Check Status

```bash
bash scripts/status.sh
```

## Create a Topic

### Via CLI

```bash
bash scripts/create-topic.sh orders.checkout.order-created 3 1
```

### Via Kafka UI

1. Go to [http://localhost:8080](http://localhost:8080)
2. Click on your cluster → **Topics** → **Add a Topic**
3. Fill in name, partitions, replication factor
4. Click **Create**

## Verify Everything Works

```bash
# List topics
docker exec kafka-central /opt/kafka/bin/kafka-topics.sh \
  --list --bootstrap-server localhost:9092

# Produce a test message
echo "hello kafka" | docker exec -i kafka-central /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic test

# Consume the message
docker exec kafka-central /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic test --from-beginning --max-messages 1
```
