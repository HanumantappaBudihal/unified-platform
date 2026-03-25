# 05 - Kafka Connect Guide (Phase 2)

## Start Kafka Connect

```bash
bash scripts/start.sh --connect
```

Kafka Connect REST API: [http://localhost:8083](http://localhost:8083)

Manage connectors via the **Kafka UI** at [http://localhost:8080](http://localhost:8080) → **Kafka Connect** section.

## What is Kafka Connect?

Kafka Connect is a framework for streaming data between Kafka and external systems (databases, search indexes, file systems, etc.) without writing code. It uses pre-built **connectors**.

### Source Connectors
Pull data **into** Kafka from external systems:
- Database (JDBC, Debezium CDC)
- File systems
- REST APIs

### Sink Connectors
Push data **out of** Kafka to external systems:
- Elasticsearch
- PostgreSQL / MySQL
- S3 / Azure Blob Storage
- MongoDB

## Installing Connector Plugins

Place connector JARs in `config/connect/plugins/` and restart Kafka Connect:

```bash
# Example: Install JDBC connector
docker exec kafka-connect confluent-hub install --no-prompt confluentinc/kafka-connect-jdbc:latest

# Restart to load
docker compose restart kafka-connect
```

## Example: JDBC Source Connector

Deploy via Kafka UI or REST API:

```json
{
  "name": "jdbc-source-orders",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:postgresql://db-host:5432/orders",
    "connection.user": "kafka_user",
    "connection.password": "password",
    "table.whitelist": "orders,order_items",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "db.orders.",
    "poll.interval.ms": 5000
  }
}
```

## Example: Elasticsearch Sink Connector

```json
{
  "name": "es-sink-orders",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "topics": "orders.checkout.order-created",
    "connection.url": "http://elasticsearch:9200",
    "type.name": "_doc",
    "key.ignore": true,
    "schema.ignore": true
  }
}
```

## Managing Connectors via REST API

```bash
# List connectors
curl http://localhost:8083/connectors

# Get connector status
curl http://localhost:8083/connectors/jdbc-source-orders/status

# Pause connector
curl -X PUT http://localhost:8083/connectors/jdbc-source-orders/pause

# Resume connector
curl -X PUT http://localhost:8083/connectors/jdbc-source-orders/resume

# Delete connector
curl -X DELETE http://localhost:8083/connectors/jdbc-source-orders
```
