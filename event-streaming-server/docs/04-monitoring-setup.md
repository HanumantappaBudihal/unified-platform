# 04 - Monitoring Setup (Phase 3)

## How It Works

The monitoring stack has three components:

1. **JMX Exporter** — Java agent running inside the Kafka broker, converts JMX metrics to Prometheus format on port `7071`
2. **Prometheus** — Scrapes metrics from the JMX exporter every 15 seconds
3. **Grafana** — Visualizes Prometheus metrics with a pre-built Kafka dashboard

```
Kafka Broker (JMX Exporter :7071) → Prometheus (:9090) → Grafana (:3000)
```

## Start Monitoring Stack

```bash
bash scripts/start.sh --monitoring
```

This adds:
- **Prometheus** at [http://localhost:9090](http://localhost:9090) — metrics collection
- **Grafana** at [http://localhost:3000](http://localhost:3000) — dashboards and alerting

> The JMX Exporter agent is always loaded in the Kafka broker (even without `--monitoring`), so metrics are available at `http://localhost:7071/metrics` regardless.

## Grafana Access

- URL: [http://localhost:3000](http://localhost:3000)
- Default login: `admin` / `admin123` (configurable in `.env`)
- Prometheus datasource is **auto-provisioned** — no manual setup needed
- A **Kafka Central - Overview** dashboard is pre-loaded

## Pre-Built Dashboard Panels

The auto-provisioned dashboard (`config/grafana/dashboards/kafka-overview.json`) includes:

| Panel | Type | What It Shows |
| ----- | ---- | ------------- |
| Broker Status | Stat | Active controller count (HEALTHY/DOWN) |
| Under-Replicated Partitions | Stat | Partitions that need attention (green=0) |
| JVM Heap Memory | Gauge | Broker memory usage % |
| JVM Threads | Stat | Active thread count |
| Messages In/s | Time series | Throughput — messages per second |
| Bytes In/Out/s | Time series | Network throughput |
| Messages Per Topic | Time series | Per-topic breakdown |
| Request Rate by Type | Time series | Produce, Fetch, Metadata requests/s |
| Log Size Per Topic | Time series | Disk usage per topic |
| GC Collection Time | Time series | Garbage collection overhead |
| Request Handler Idle % | Gauge | Broker capacity (green > 60%) |
| Partition / Leader Count | Stat | Cluster topology |

## Configuration Files

| File | Purpose |
| ---- | ------- |
| `config/kafka/jmx-exporter-config.yml` | JMX → Prometheus metric mapping rules |
| `config/prometheus/prometheus.yml` | Scrape targets and intervals |
| `config/grafana/provisioning/datasources/prometheus.yml` | Auto-provision Prometheus datasource |
| `config/grafana/provisioning/dashboards/dashboards.yml` | Auto-provision dashboard directory |
| `config/grafana/dashboards/kafka-overview.json` | Pre-built Kafka dashboard |

## Key Metrics to Monitor

### Broker Health
| Metric | Description | Alert Threshold |
| ------ | ----------- | --------------- |
| `kafka_controller_active_controller_count` | Active controllers | != 1 |
| `kafka_server_underreplicated_partitions` | Under-replicated partitions | > 0 |
| `kafka_server_requesthandlerpool_avg_idle_percent` | Request handler capacity | < 0.3 (30%) |

### Throughput
| Metric | Description |
| ------ | ----------- |
| `kafka_server_brokertopicmetrics_bytesinpersec_rate` | Bytes received per second |
| `kafka_server_brokertopicmetrics_bytesoutpersec_rate` | Bytes sent per second |
| `kafka_server_brokertopicmetrics_messagesinpersec_rate` | Messages received per second |

### Disk
| Metric | Description | Alert Threshold |
| ------ | ----------- | --------------- |
| `kafka_log_log_size_bytes` | Log size per topic/partition | > 80% disk |

### JVM
| Metric | Description | Alert Threshold |
| ------ | ----------- | --------------- |
| `jvm_heap_memory_used_bytes / jvm_heap_memory_max_bytes` | Heap usage | > 90% |
| `jvm_gc_collection_time_ms_total` | GC time | Sustained > 500ms |

## Adding Custom Dashboards

1. Export or create a dashboard JSON file
2. Place it in `config/grafana/dashboards/`
3. Restart Grafana: `docker compose restart grafana`

Community dashboards for Kafka on [Grafana.com](https://grafana.com/grafana/dashboards/):
- **18276** — Kafka Dashboard
- **7727** — JVM Overview
- **18941** — Kafka Exporter Overview

## Verify Metrics Are Working

```bash
# Check raw Prometheus metrics from Kafka
curl -s http://localhost:7071/metrics | grep kafka_server

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'
```
