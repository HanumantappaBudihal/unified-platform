# Health Aggregation Server

Unified health monitoring for all infrastructure servers using Uptime Kuma + a custom Next.js portal.

## Architecture

```
  +-------------------+     +--------------+
  |   Health Portal   |     |  Uptime Kuma |
  |      :3009        |     |    :3010     |
  +--------+----------+     +------+-------+
           |                        |
           v                        v
  +--------+------------------------+--------+
  |        Health Checks (HTTP/TCP)          |
  +--+------+------+------+------+----------+
     |      |      |      |      |
     v      v      v      v      v
  Kafka  Redis  MinIO  Gateway  Logging
  :3001  :3002  :3004   :3006   :3007
```

## Quick Start

```bash
bash scripts/start.sh         # Start services
bash scripts/setup-monitors.sh # View monitor config
bash scripts/status.sh        # Check status
bash scripts/stop.sh          # Stop services
```

## Ports

| Service        | Port | Description           |
|----------------|------|-----------------------|
| Health Portal  | 3009 | Health dashboard UI   |
| Uptime Kuma    | 3010 | Status monitoring     |

## Monitored Services (30+)

- **Event Streaming**: Kafka Broker, Schema Registry, REST Proxy, Kafka UI, Portal, Grafana, Prometheus
- **Cache**: Redis Nodes (6), Redis Insight, Portal, Grafana, Prometheus
- **Object Storage**: MinIO S3, MinIO Console, Portal, Grafana, Prometheus
- **Gateway**: Gateway Portal
- **Logging**: Loki, Logging Portal, Logging Grafana
