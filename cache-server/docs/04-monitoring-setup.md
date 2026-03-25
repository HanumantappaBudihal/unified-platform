# 04 — Monitoring Setup

Redis Exporter + Prometheus + Grafana for comprehensive cache server monitoring.

---

## Architecture

```
Redis Nodes (6371-6376)
       │
       ▼
Redis Exporter (:9121)  ──►  Prometheus (:9090)  ──►  Grafana (:3000)
                                    │
                                    ▼
                              Alertmanager (:9094)  ──►  Slack / Email
```

---

## Start Monitoring

```bash
# Start core + monitoring
bash scripts/start.sh --monitoring

# Or start everything
bash scripts/start.sh --full
```

---

## Redis Exporter

The Redis Exporter scrapes all 6 cluster nodes and exposes metrics at `http://localhost:9121/metrics`.

### Key Metrics

| Metric | Description |
|--------|-------------|
| `redis_up` | Whether the node is reachable (1 = up, 0 = down) |
| `redis_memory_used_bytes` | Current memory usage |
| `redis_memory_max_bytes` | Configured maxmemory |
| `redis_commands_processed_total` | Total commands processed |
| `redis_keyspace_hits_total` | Successful key lookups |
| `redis_keyspace_misses_total` | Failed key lookups |
| `redis_connected_clients` | Number of connected clients |
| `redis_evicted_keys_total` | Keys evicted due to memory pressure |
| `redis_expired_keys_total` | Keys expired by TTL |
| `redis_cluster_state` | Cluster health (1 = ok) |
| `redis_cluster_slots_ok` | Healthy hash slots (should be 16384) |
| `redis_cluster_known_nodes` | Total known cluster nodes |
| `redis_blocked_clients` | Clients blocked on BLPOP/BRPOP |
| `redis_slowlog_length` | Number of slow log entries |
| `redis_instantaneous_ops_per_sec` | Current operations per second |
| `redis_net_input_bytes_total` | Network bytes received |
| `redis_net_output_bytes_total` | Network bytes sent |

---

## Prometheus

### Scrape Configuration

Prometheus scrapes Redis Exporter every 15 seconds:

```yaml
scrape_configs:
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Useful PromQL Queries

**Cache hit ratio:**
```promql
rate(redis_keyspace_hits_total[5m]) /
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

**Operations per second:**
```promql
rate(redis_commands_processed_total[1m])
```

**Memory usage percentage:**
```promql
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

**Eviction rate:**
```promql
rate(redis_evicted_keys_total[5m])
```

**Connected clients:**
```promql
redis_connected_clients
```

---

## Grafana Dashboard

Pre-configured dashboard at **http://localhost:3000** (or embedded in Portal at http://localhost:3002/tools/grafana).

### Dashboard Panels

| Panel | Visualization | Description |
|-------|--------------|-------------|
| Cluster Status | Stat | Overall cluster health (OK/FAIL) |
| Nodes Up | Stat | Count of reachable nodes (target: 6) |
| Total Memory | Gauge | Used vs. available memory |
| Operations/sec | Time series | Commands processed per second |
| Hit Ratio | Gauge + Time series | Cache hit percentage over time |
| Connected Clients | Time series | Per-node client connections |
| Memory per Node | Bar chart | Memory usage breakdown by node |
| Evicted Keys | Time series | Keys evicted due to memory pressure |
| Expired Keys | Time series | Keys expired by TTL |
| Network I/O | Time series | Bytes in/out per node |
| Slow Log | Stat | Number of slow queries |
| Key Count | Stat | Total keys across cluster |

### Access Grafana

- **Direct**: http://localhost:3000 (login: `admin` / `admin`)
- **Via Portal**: http://localhost:3002/tools/grafana (embedded, no login needed)

---

## Alert Rules

See [06 - Alerting Setup](06-alerting-setup.md) for full alert configuration.

### Quick Summary

| Alert | Fires When | Severity |
|-------|-----------|----------|
| RedisClusterDown | Cluster state not OK for 1m | critical |
| RedisNodeDown | Any node unreachable for 30s | critical |
| RedisHighMemory | Memory > 80% for 5m | warning |
| RedisMemoryCritical | Memory > 95% for 2m | critical |
| RedisLowHitRatio | Hit ratio < 50% for 10m | warning |
| RedisHighEviction | Eviction rate > 100/min for 5m | warning |

---

## Troubleshooting

### No metrics in Grafana?

1. Check Redis Exporter: `curl http://localhost:9121/metrics`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify network: `docker exec prometheus wget -qO- http://redis-exporter:9121/metrics | head`

### High memory usage?

1. Check eviction policy: `redis-cli CONFIG GET maxmemory-policy`
2. Check big keys: `redis-cli --bigkeys`
3. Review TTL coverage: keys without TTL accumulate forever

### Low hit ratio?

1. Review TTL values — too short means more misses
2. Check if cache is being warmed on startup
3. Verify key naming — typos cause misses
