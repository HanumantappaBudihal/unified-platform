# 06 — Alerting Setup

Prometheus alert rules and Alertmanager routing for the Redis Cache Server.

---

## Architecture

```
Redis Exporter → Prometheus (evaluates rules) → Alertmanager → Slack / Email
                                                      │
                                                      ├── #cache-critical (Slack)
                                                      ├── #cache-warnings (Slack)
                                                      └── ops-team@company.com
```

---

## Alert Rules

### Critical Alerts

| Alert | Condition | For | Description |
|-------|-----------|-----|-------------|
| `RedisClusterDown` | `redis_cluster_state != 1` | 1m | Cluster is in a failed state |
| `RedisNodeDown` | `redis_up == 0` | 30s | A Redis node is unreachable |
| `RedisMemoryCritical` | Memory > 95% of maxmemory | 2m | Node is nearly out of memory |
| `RedisReplicationBroken` | `redis_connected_slaves < 1` (on master) | 1m | A master has lost its replica |
| `RedisClusterSlotsNotOk` | `redis_cluster_slots_ok < 16384` | 1m | Some hash slots are unavailable |

### Warning Alerts

| Alert | Condition | For | Description |
|-------|-----------|-----|-------------|
| `RedisHighMemory` | Memory > 80% of maxmemory | 5m | Memory usage is getting high |
| `RedisLowHitRatio` | Hit ratio < 50% | 10m | Cache is mostly missing — check TTLs |
| `RedisHighEviction` | Eviction rate > 100 keys/min | 5m | Memory pressure causing evictions |
| `RedisTooManyConnections` | Connected clients > 200 | 5m | Possible connection leak |
| `RedisSlowQueries` | Slow log > 10 entries in 5m | 5m | Commands taking too long |
| `RedisHighLatency` | Avg latency > 10ms | 5m | Response time degradation |
| `RedisKeyspaceGrowth` | Key count growing > 1000/min | 10m | Rapid key creation — possible leak |

---

## Alertmanager Configuration

### Default Routes

```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      repeat_interval: 1h

    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 4h
```

### Receivers

Configure in `config/alertmanager/alertmanager.yml`:

**Slack:**
```yaml
receivers:
  - name: 'critical-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#cache-critical'
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'warning-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#cache-warnings'
        title: '⚠️ {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

**Email (Pre-Configured):**

Email notifications are already configured to use the local [Email Server](../../email-server/README.md) (Mailpit). Alerts from critical and warning receivers are sent to `ops-team@infrastructure.local` and can be viewed at **http://localhost:8025**.

> **Prerequisite:** Start the email server first: `cd email-server && docker compose up -d`

```yaml
# Current configuration in config/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'email-mailpit:1025'
  smtp_from: 'cache-alerts@infrastructure.local'
  smtp_require_tls: false

receivers:
  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@infrastructure.local'
        send_resolved: true

  - name: 'warning-alerts'
    email_configs:
      - to: 'ops-team@infrastructure.local'
        send_resolved: true
```

---

## Testing Alerts

### Simulate High Memory

```bash
# Fill memory with test keys
for i in $(seq 1 100000); do
  docker exec redis-node-1 redis-cli -p 6371 -a admin-secret \
    SET "test:fill:$i" "$(head -c 1024 /dev/urandom | base64)" EX 300
done
```

### Check Active Alerts

- **Prometheus**: http://localhost:9090/alerts
- **Alertmanager**: http://localhost:9094/#/alerts
- **Portal**: http://localhost:3002 (dashboard shows alert count)

### Silence an Alert

Use Alertmanager UI at http://localhost:9094 or via API:

```bash
curl -X POST http://localhost:9094/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "RedisHighMemory", "isRegex": false}],
    "startsAt": "2026-03-19T00:00:00Z",
    "endsAt": "2026-03-20T00:00:00Z",
    "createdBy": "admin",
    "comment": "Planned memory test"
  }'
```

---

## Grafana Alerts (Visual)

Grafana also supports alerting with its own notification channels. Pre-configured alerts mirror the Prometheus rules but add visual context (dashboard panel screenshots in notifications).

Configure in Grafana UI:
1. Open a dashboard panel
2. Edit → Alert tab → Create alert rule
3. Set condition and notification channel

---

## Runbooks

### RedisClusterDown

1. Check which nodes are down: `bash scripts/status.sh`
2. Check Docker logs: `docker logs redis-node-1`
3. If a single node is down, the cluster auto-recovers (replica promoted)
4. If multiple masters are down, manual intervention needed:
   ```bash
   docker compose restart redis-node-1 redis-node-2 redis-node-3
   bash scripts/init-cluster.sh --fix
   ```

### RedisHighMemory

1. Check biggest keys: `docker exec redis-node-1 redis-cli -p 6371 -a admin-secret --bigkeys`
2. Check keys without TTL: `docker exec redis-node-1 redis-cli -p 6371 -a admin-secret SCAN 0 COUNT 100` → check TTL of each
3. Review eviction policy: should be `allkeys-lru`
4. Consider increasing `maxmemory` or adding nodes

### RedisLowHitRatio

1. Review application cache logic — are TTLs too short?
2. Check if cache is warmed on startup
3. Look for key naming mismatches (typos cause misses)
4. Consider pre-fetching frequently accessed data
