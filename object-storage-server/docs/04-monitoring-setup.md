# Monitoring Setup

## Overview

The storage server includes a full monitoring stack:
- **Prometheus** (http://localhost:9097) — metrics collection
- **Grafana** (http://localhost:3005) — dashboards and visualization
- **Alertmanager** (http://localhost:9098) — alert routing

## Starting Monitoring

```bash
# Start with monitoring profile
docker compose --profile monitoring up -d

# Or start everything
docker compose --profile full up -d
```

## Grafana

### Access
- URL: http://localhost:3005
- Username: `admin`
- Password: `admin`

### Pre-configured Dashboard
A "MinIO Storage Overview" dashboard is auto-provisioned with:
- Total storage used/available
- S3 request rate by API
- Storage usage over time
- Request latency (p50/p95/p99)
- S3 errors by API
- Network throughput

### Custom Queries
Useful PromQL queries for custom dashboards:

```promql
# Total storage used
minio_cluster_capacity_usable_total_bytes - minio_cluster_capacity_usable_free_bytes

# Storage usage percentage
(minio_cluster_capacity_usable_total_bytes - minio_cluster_capacity_usable_free_bytes) / minio_cluster_capacity_usable_total_bytes * 100

# S3 request rate
sum(rate(minio_s3_requests_total[5m]))

# Request rate by API type (GET, PUT, DELETE, etc.)
sum by (api)(rate(minio_s3_requests_total[5m]))

# Error rate
sum(rate(minio_s3_requests_errors_total[5m]))

# p99 latency
histogram_quantile(0.99, rate(minio_s3_requests_ttfb_seconds_distribution_bucket[5m]))

# Network throughput
sum(rate(minio_s3_traffic_sent_bytes[5m]))      # Upload
sum(rate(minio_s3_traffic_received_bytes[5m]))   # Download

# Per-bucket object count
minio_bucket_objects_count

# Per-bucket storage size
minio_bucket_usage_total_bytes
```

## Prometheus

### Access
- URL: http://localhost:9097

### Scrape Targets
| Job | Target | Metrics Path |
|---|---|---|
| minio-cluster | storage-nginx:9000 | /minio/v2/metrics/cluster |
| minio-node | minio-1..4:9000 | /minio/v2/metrics/node |
| minio-bucket | storage-nginx:9000 | /minio/v2/metrics/bucket |

### Retention
- Default: 15 days
- Configurable via `--storage.tsdb.retention.time` in docker-compose.yml

## Alert Rules

### Pre-configured Alerts

| Alert | Condition | Severity |
|---|---|---|
| MinIONodeDown | Node unreachable > 1 min | Critical |
| MinIODiskUsageHigh | Cluster disk > 85% | Warning |
| MinIODiskUsageCritical | Cluster disk > 95% | Critical |
| MinIOHighErrorRate | S3 errors > 10/sec for 5 min | Warning |
| MinIOSlowRequests | p99 TTFB > 5 seconds | Warning |

### Adding Custom Alerts

Edit `config/prometheus/alert-rules.yml`:

```yaml
- alert: BucketQuotaNearLimit
  expr: minio_bucket_usage_total_bytes / minio_bucket_quota_total_bytes > 0.9
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Bucket {{ $labels.bucket }} near quota limit ({{ $value | humanizePercentage }})"
```

### Alert Notification (Pre-Configured)

Email notifications are already configured to use the local [Email Server](../../email-server/README.md) (Mailpit). Alerts are sent to `ops-team@infrastructure.local` and can be viewed at **http://localhost:8025**.

> **Prerequisite:** Start the email server first: `cd email-server && docker compose up -d`

```yaml
# Current configuration in config/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'email-mailpit:1025'
  smtp_from: 'minio-alerts@infrastructure.local'
  smtp_require_tls: false

receivers:
  - name: default
    email_configs:
      - to: 'ops-team@infrastructure.local'
        send_resolved: true
```

To add Slack as an additional channel:

```yaml
receivers:
  - name: default
    email_configs:
      - to: 'ops-team@infrastructure.local'
        send_resolved: true
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#storage-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
```
