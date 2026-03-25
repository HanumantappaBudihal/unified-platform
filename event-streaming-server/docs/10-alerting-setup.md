# 10 - Alerting Setup

## Overview

The alerting stack consists of:

1. **Prometheus** — evaluates alert rules every 15 seconds
2. **Alertmanager** — routes and deduplicates alerts to notification channels
3. **Grafana** — visual alert indicators on dashboards

```
Kafka → JMX Exporter → Prometheus → Alert Rules → Alertmanager → Slack/Email/Webhook
                                                                → Grafana Dashboard
```

## Start with Alerting

```bash
bash scripts/start.sh --monitoring
```

## Pre-Configured Alert Rules

### Broker Health Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaBrokerDown` | Critical | JMX exporter unreachable | 1 min |
| `KafkaActiveControllerMissing` | Critical | No active controller | 1 min |
| `KafkaUnderReplicatedPartitions` | Warning | Any partition under-replicated | 5 min |
| `KafkaRequestHandlerSaturated` | Warning | Handler idle < 25% | 5 min |

### Consumer Lag Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaConsumerGroupLagHigh` | Warning | Lag > 1,000 messages | 5 min |
| `KafkaConsumerGroupLagCritical` | Critical | Lag > 10,000 messages | 5 min |
| `KafkaConsumerGroupInactive` | Warning | 0 active members | 10 min |

### Throughput Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaNoMessagesIn` | Warning | Zero messages produced | 15 min |
| `KafkaHighThroughput` | Warning | > 50 MB/s incoming | 5 min |

### Resource Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaHighHeapUsage` | Warning | Heap > 90% | 5 min |
| `KafkaHighGCTime` | Warning | GC > 500ms/s | 10 min |

### Dead Letter Queue Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaDLQMessagesDetected` | Warning | Any DLQ has messages | 1 min |
| `KafkaDLQGrowing` | Critical | DLQ actively receiving messages | 10 min |

### Exporter Alerts

| Alert | Severity | Fires When | For |
| ----- | -------- | ---------- | --- |
| `KafkaExporterDown` | Warning | Kafka Exporter unreachable | 2 min |

## Configuring Notification Channels

Edit `config/alertmanager/alertmanager.yml`:

### Slack

```yaml
receivers:
  - name: "default"
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#kafka-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

### Email (Pre-Configured)

Email notifications are already configured to use the local [Email Server](../../email-server/README.md) (Mailpit). All alerts are sent to `ops-team@infrastructure.local` and can be viewed at **http://localhost:8025**.

> **Prerequisite:** Start the email server first: `cd email-server && docker compose up -d`

```yaml
# Current configuration in config/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'email-mailpit:1025'
  smtp_from: 'kafka-alerts@infrastructure.local'
  smtp_require_tls: false

receivers:
  - name: "default"
    email_configs:
      - to: 'ops-team@infrastructure.local'
        send_resolved: true
```

For production, replace with a real SMTP provider:

```yaml
global:
  smtp_smarthost: 'smtp.sendgrid.net:587'
  smtp_from: 'kafka-alerts@yourdomain.com'
  smtp_auth_username: 'apikey'
  smtp_auth_password: 'your-sendgrid-api-key'
  smtp_require_tls: true

receivers:
  - name: "default"
    email_configs:
      - to: 'ops-team@yourdomain.com'
        send_resolved: true
```

### Webhook (Teams, Discord, PagerDuty, etc.)

```yaml
receivers:
  - name: "default"
    webhook_configs:
      - url: 'http://your-webhook-endpoint:5000/alerts'
        send_resolved: true
```

### Multiple Channels

```yaml
receivers:
  - name: "critical"
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#kafka-critical'
    email_configs:
      - to: 'oncall@company.com'
```

## Viewing Alerts

### Prometheus UI
Open [http://localhost:9090/alerts](http://localhost:9090/alerts) to see all alert rules and their current state.

### Alertmanager UI
Open [http://localhost:9094](http://localhost:9094) to see active alerts, silences, and routing.

### Grafana Dashboard
The **Active Prometheus Alerts** table at the bottom of the Kafka Overview dashboard shows currently firing alerts.

## Customizing Alert Thresholds

Edit `config/prometheus/alert-rules.yml`:

```yaml
# Example: Change consumer lag threshold
- alert: KafkaConsumerGroupLagHigh
  expr: sum by (consumergroup, topic) (kafka_consumergroup_lag) > 5000  # was 1000
  for: 10m  # was 5m
```

After editing, reload Prometheus:
```bash
curl -X POST http://localhost:9090/-/reload
```

## Silencing Alerts

Use the Alertmanager UI at [http://localhost:9094](http://localhost:9094) to create silences for maintenance windows.
