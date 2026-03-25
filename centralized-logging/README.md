# Centralized Logging Server

Infrastructure log aggregation using Grafana Loki + Promtail for all centralized servers.

## Architecture

```
Docker Containers (all servers)
        |
        v
  +-----------+     +--------+     +---------+
  | Promtail  | --> |  Loki  | <-- | Grafana |
  |   :9080   |     | :3100  |     |  :3008  |
  +-----------+     +--------+     +---------+
                         ^
                         |
                  +-------------+
                  |   Portal    |
                  |   :3007     |
                  +-------------+
```

## Quick Start

```bash
bash scripts/start.sh    # Start all services
bash scripts/status.sh   # Check status
bash scripts/stop.sh     # Stop all services
```

## Ports

| Service         | Port | Description              |
|-----------------|------|--------------------------|
| Logging Portal  | 3007 | Management UI            |
| Grafana         | 3008 | Log visualization        |
| Loki            | 3100 | Log storage & query API  |
| Promtail        | 9080 | Log collector metrics    |

## Features

- Automatic Docker container log collection via Promtail
- LogQL query interface for searching logs
- Pre-built Grafana dashboards for log visualization
- Error rate monitoring and alerting
- 30-day log retention with automatic compaction
