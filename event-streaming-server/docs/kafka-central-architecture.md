# Centralized Kafka Server - Architecture & Planning

## Overview

A centralized Apache Kafka server that acts as the message backbone for the entire application infrastructure, enabling communication between multiple applications through a unified messaging platform with UI-based management.

## Tech Stack

| Component            | Technology                  | Port  | Purpose                                  |
| -------------------- | --------------------------- | ----- | ---------------------------------------- |
| Kafka Broker         | Apache Kafka (KRaft mode)   | 9092  | Message broker (no ZooKeeper dependency) |
| Kafka UI             | Kafbat/kafka-ui             | 8080  | Web-based management with RBAC           |
| Schema Registry      | Confluent Schema Registry   | 8081  | Data contract enforcement (BACKWARD)     |
| REST Proxy           | Confluent REST Proxy        | 8082  | HTTP API for Kafka (produce/consume)     |
| Kafka Connect        | Confluent Kafka Connect     | 8083  | Centralized connector hub                |
| Kafka Exporter       | danielqsj/kafka-exporter    | 9308  | Consumer group lag metrics               |
| Prometheus           | Prometheus                  | 9090  | Metrics collection + alert rules         |
| Alertmanager         | Prometheus Alertmanager     | 9094  | Alert routing (Slack/Email/Webhook)      |
| Grafana              | Grafana                     | 3000  | Visual dashboards & alerting             |
| Secure Broker        | Apache Kafka (SASL/SCRAM)   | 9095  | Authenticated broker with ACLs           |

## Architecture Diagram

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   App A     │  │   App B     │  │   App C     │  │   App N     │
│ (Producer/  │  │ (Producer/  │  │ (Producer/  │  │ (Producer/  │
│  Consumer)  │  │  Consumer)  │  │  Consumer)  │  │  Consumer)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────┬───────┴────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Kafka Broker        │
                    │     (KRaft Mode)        │
                    │     Port: 9092          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
   ┌──────────▼──────┐  ┌───────▼────────┐  ┌─────▼──────────┐
   │ Schema Registry │  │ Kafka Connect  │  │  JMX Exporter  │
   │   Port: 8081    │  │   Port: 8083   │  │  Port: 7071    │
   └─────────────────┘  └────────────────┘  └───────┬────────┘
                                                     │
                                            ┌────────▼────────┐
                                            │   Prometheus    │
                                            │   Port: 9090    │
                                            └────────┬────────┘
                                                     │
                                            ┌────────▼────────┐
                                            │    Grafana      │
                                            │   Port: 3000    │
                                            └─────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │                    Kafka UI (Kafbat)                     │
   │                      Port: 8080                          │
   │  Manages: Topics, Consumer Groups, Connectors, Schemas  │
   └──────────────────────────────────────────────────────────┘
```

## Capacity Planning

### Target Load: 20,000 requests/minute (~333 req/sec)

This is a **small workload** for Kafka (it can handle millions/sec). Minimal infrastructure is sufficient.

| Parameter              | Dev/Staging    | Production       |
| ---------------------- | -------------- | ---------------- |
| Brokers                | 1              | 3                |
| Partitions per topic   | 3              | 6                |
| Replication factor     | 1              | 3                |
| Retention period       | 3 days         | 7 days           |
| Log segment size       | 1 GB (default) | 1 GB (default)   |
| Min in-sync replicas   | 1              | 2                |
| Memory (per broker)    | 2 GB           | 4-8 GB           |
| Disk                   | 20 GB          | 100 GB           |

### Scaling Notes

- At 20K msg/min with avg 1 KB message size = ~20 MB/min = ~28 GB/day (with replication factor 3)
- Single broker can handle this easily; 3 brokers recommended for high availability only
- Partition count should match or exceed the number of consumers in the largest consumer group

## Kafka UI (Kafbat) - Management Capabilities

The UI at port 8080 provides:

- **Topic Management** — Create, delete, configure topics; browse messages in real-time
- **Consumer Group Monitoring** — View lag, reset offsets, track consumption progress
- **Kafka Connect Management** — Deploy, pause, restart connectors from the UI
- **Schema Registry Browser** — View and manage Avro/Protobuf/JSON schemas
- **ACL Management** — Control per-application access to topics
- **Multi-Cluster Support** — Manage multiple Kafka clusters from one UI
- **Authentication** — OAuth 2.0 and LDAP support

## Technology Choices & Rationale

### Why KRaft over ZooKeeper?
- ZooKeeper is deprecated in Kafka 3.5+
- KRaft simplifies architecture (one less service to manage)
- Faster broker startup and leader election
- Better scalability for metadata operations

### Why Kafbat/kafka-ui over alternatives?

| Tool             | Verdict                                               |
| ---------------- | ----------------------------------------------------- |
| **Kafbat UI**    | Best all-in-one: topics, consumers, connectors, ACLs  |
| AKHQ             | Good but UI sluggish under load, no data masking      |
| Kafdrop          | Too lightweight, limited features                     |
| Redpanda Console | Great but more tied to Redpanda ecosystem             |

### Why Confluent Schema Registry?
- Enforces data contracts between producer and consumer apps
- Supports Avro, Protobuf, and JSON Schema
- Prevents breaking changes from propagating across applications

## Implementation Phases

### Phase 1 — Core Infrastructure
- Docker Compose with Kafka (KRaft mode)
- Kafbat UI for management
- Schema Registry for data contracts
- **Outcome:** Apps can produce/consume messages, managed via UI

### Phase 2 — Connectors
- Kafka Connect cluster
- Pre-built connectors (JDBC, Elasticsearch, S3, etc.)
- Manage connectors through Kafka UI
- **Outcome:** Automated data pipelines between systems

### Phase 3 — Monitoring & Alerting
- Prometheus with Kafka JMX Exporter
- Grafana dashboards (broker health, topic throughput, consumer lag)
- Alert rules for consumer lag, broker down, disk usage
- **Outcome:** Full observability into Kafka health

### Phase 4 — Security & Multi-Tenancy
- SASL/SCRAM authentication per application
- ACLs to restrict topic access per app
- TLS encryption for data in transit
- Quotas to prevent any single app from overloading the cluster
- **Outcome:** Production-grade security and isolation

## Application Integration Guide

Each application connects to the central Kafka using:

```properties
# Kafka connection
bootstrap.servers=kafka-server:9092

# Producer config
key.serializer=org.apache.kafka.common.serialization.StringSerializer
value.serializer=io.confluent.kafka.serializers.KafkaAvroSerializer
schema.registry.url=http://kafka-server:8081

# Consumer config
group.id=<application-name>
auto.offset.reset=earliest
```

### Topic Naming Convention

```
<domain>.<application>.<event-type>

Examples:
  orders.checkout.order-created
  users.auth.login-event
  inventory.warehouse.stock-updated
  notifications.email.send-request
```

## Directory Structure

```
kafka-central/
├── docker-compose.yml          # All services
├── config/
│   ├── kafka/                  # Kafka broker config overrides
│   ├── kafka-ui/               # Kafbat UI configuration
│   ├── prometheus/             # Prometheus config & rules
│   ├── grafana/                # Grafana dashboards & datasources
│   └── connect/                # Kafka Connect plugins & config
├── data/                       # Persistent volumes (gitignored)
│   ├── kafka/
│   ├── prometheus/
│   └── grafana/
└── docs/                       # This documentation
```

## References

- [Kafbat/kafka-ui (GitHub)](https://github.com/kafbat/kafka-ui)
- [Apache Kafka KRaft Documentation](https://kafka.apache.org/documentation/#kraft)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/)
- [Kafka Docker Images](https://hub.docker.com/r/apache/kafka)
