# Cache Server Architecture & Planning

Centralized Redis Cache Server infrastructure for cross-application caching, session management, rate limiting, and pub/sub messaging.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Network: cache-network                │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Redis Cluster (6 nodes)                    │  │
│  │                                                               │  │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐                     │  │
│  │   │Master 1 │  │Master 2 │  │Master 3 │   Ports: 6371-6373  │  │
│  │   │ :6371   │  │ :6372   │  │ :6373   │                     │  │
│  │   └────┬────┘  └────┬────┘  └────┬────┘                     │  │
│  │        │             │             │                           │  │
│  │   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐                     │  │
│  │   │Replica 1│  │Replica 2│  │Replica 3│   Ports: 6374-6376  │  │
│  │   │ :6374   │  │ :6375   │  │ :6376   │                     │  │
│  │   └─────────┘  └─────────┘  └─────────┘                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Redis Insight │  │Redis Exporter│  │     Cache Portal         │  │
│  │   :5540       │  │   :9121      │  │   :3002 (Next.js)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Prometheus   │  │   Grafana    │  │     Alertmanager         │  │
│  │   :9090       │  │   :3000      │  │       :9094              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴─────┐      ┌──────┴──────┐     ┌──────┴──────┐
    │ Session  │      │  Catalog    │     │  Your App   │
    │ Service  │      │  Service    │     │  (any lang) │
    └──────────┘      └─────────────┘     └─────────────┘
```

---

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Redis Node 1 (Master) | 6371 | Redis Cluster master — hash slots 0-5460 |
| Redis Node 2 (Master) | 6372 | Redis Cluster master — hash slots 5461-10922 |
| Redis Node 3 (Master) | 6373 | Redis Cluster master — hash slots 10923-16383 |
| Redis Node 4 (Replica) | 6374 | Replica of Node 1 |
| Redis Node 5 (Replica) | 6375 | Replica of Node 2 |
| Redis Node 6 (Replica) | 6376 | Replica of Node 3 |
| Redis Insight | 5540 | Official Redis GUI — key browser, CLI, slow log |
| Redis Exporter | 9121 | Prometheus metrics for all nodes |
| Prometheus | 9090 | Metrics collection + alert rules |
| Grafana | 3000 | Dashboards — memory, throughput, latency, hit ratio |
| Alertmanager | 9094 | Alert routing (Slack/Email) |
| **Cache Portal** | **3002** | **Next.js management portal** |

---

## Redis Cluster Design

### Why Cluster Mode?

- **Horizontal scaling** — data sharded across 3 masters (16384 hash slots)
- **Automatic failover** — if a master goes down, its replica is promoted
- **20,000+ req/min** capacity — each master handles ~7,000 req/min independently
- **No single point of failure** — cluster continues with 2/3 masters alive

### Hash Slot Distribution

```
Master 1 (6371): slots 0-5460      ← Replica 4 (6374)
Master 2 (6372): slots 5461-10922  ← Replica 5 (6375)
Master 3 (6373): slots 10923-16383 ← Replica 6 (6376)
```

### Persistence Strategy

| Method | Config | Purpose |
|--------|--------|---------|
| RDB Snapshots | `save 60 1000` | Point-in-time backup every 60s if 1000+ keys changed |
| AOF (Append Only File) | `appendfsync everysec` | Durability — max 1 second of data loss |
| AOF Rewrite | `auto-aof-rewrite-percentage 100` | Compact AOF when it doubles in size |

### Memory Management

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxmemory` | 256mb per node (768mb total usable) | Prevent OOM |
| `maxmemory-policy` | `allkeys-lru` | Evict least recently used keys when full |
| `maxmemory-samples` | 10 | LRU accuracy (higher = more accurate) |

---

## Multi-Application Isolation

### ACL Users (per application)

Each application gets a dedicated Redis user with permissions scoped to its key prefix:

| User | Password | Allowed Keys | Channels | Purpose |
|------|----------|-------------|----------|---------|
| `admin` | `admin-secret` | `~*` (all) | `&*` (all) | Portal, management |
| `session-svc` | `session-secret` | `~sessions:*` | `&sessions:*` | Session Service |
| `catalog-svc` | `catalog-secret` | `~catalog:*` | `&catalog:*` | Catalog Service |

### Key Naming Convention

```
<app-prefix>:<resource>:<identifier>
```

Examples:
```
sessions:user:abc123          → user session data
sessions:rate:user:abc123     → rate limit counter
catalog:product:42            → cached product
catalog:category:electronics  → cached category listing
catalog:stats:hits            → cache hit counter
```

### Onboarding a New Application

1. Add ACL user in `config/redis/users.acl`
2. Register app in portal config (`portal/src/lib/config.ts`)
3. Restart cluster to apply ACL changes
4. Use assigned credentials + key prefix

---

## Monitoring & Alerting

### Metrics Collected (via Redis Exporter)

| Metric | Description |
|--------|-------------|
| `redis_memory_used_bytes` | Memory consumption per node |
| `redis_commands_processed_total` | Total operations processed |
| `redis_keyspace_hits_total` | Cache hits |
| `redis_keyspace_misses_total` | Cache misses |
| `redis_connected_clients` | Active client connections |
| `redis_cluster_state` | Cluster health (ok/fail) |
| `redis_cluster_slots_ok` | Number of healthy hash slots |
| `redis_evicted_keys_total` | Keys evicted due to memory pressure |
| `redis_blocked_clients` | Clients blocked on BLPOP etc. |
| `redis_slowlog_length` | Slow query count |

### Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| RedisClusterDown | `redis_cluster_state != 1` for 1m | critical |
| RedisNodeDown | Node unreachable for 30s | critical |
| RedisHighMemory | Memory > 80% of maxmemory for 5m | warning |
| RedisMemoryCritical | Memory > 95% of maxmemory for 2m | critical |
| RedisLowHitRatio | Hit ratio < 50% for 10m | warning |
| RedisHighEviction | Eviction rate > 100/min for 5m | warning |
| RedisTooManyConnections | Connected clients > 200 for 5m | warning |
| RedisSlowQueries | Slow log entries > 10 in 5m | warning |
| RedisReplicationBroken | Replica disconnected for 1m | critical |
| RedisHighLatency | Avg command latency > 10ms for 5m | warning |

### Grafana Dashboard Panels

- Cluster status overview (all 6 nodes)
- Memory usage per node (gauge + time series)
- Operations/sec (GET, SET, DEL breakdown)
- Cache hit/miss ratio (pie chart + time series)
- Connected clients per node
- Network I/O (bytes in/out)
- Evicted keys rate
- Slow log entries
- Key count per database/prefix
- Latency percentiles (p50, p95, p99)

---

## Cache Portal (Next.js)

### Pages

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | Cluster health, total memory, ops/sec, hit ratio, connected clients, node status cards with auto-refresh |
| Keys | `/keys` | Browse/search keys by prefix, view value + TTL + type, delete keys, set new keys |
| Applications | `/apps` | Registered apps with prefix, key count, memory estimate, connection info, usage stats |
| Pub/Sub | `/pubsub` | Publish messages to channels, subscribe and view live messages |
| Tools > Redis Insight | `/tools/redis-insight` | Embedded Redis Insight via reverse proxy |
| Tools > Grafana | `/tools/grafana` | Embedded Grafana dashboards |
| Tools > Prometheus | `/tools/prometheus` | Embedded Prometheus |
| Tools > Alertmanager | `/tools/alertmanager` | Embedded Alertmanager |

### Portal API Routes

```
Browser → Next.js Cache Portal (:3002)
               │
               ├── /api/health      → checks all services + cluster state
               ├── /api/cluster     → Redis CLUSTER INFO + CLUSTER NODES
               ├── /api/keys        → SCAN + GET/SET/DEL operations
               ├── /api/stats       → INFO command (memory, stats, clients)
               ├── /api/apps        → app registry + per-prefix key counts
               ├── /api/pubsub      → PUBLISH + SUBSCRIBE via SSE
               └── /api/proxy       → reverse proxy for embedded tools
```

### Tech Stack

- **Next.js 14** — App Router with TypeScript
- **Tailwind CSS** — Light theme (matching Kafka portal design)
- **ioredis** — Redis Cluster client for Node.js
- **Docker** — Standalone output for minimal container image

---

## Mock Applications

### Session Service

Demonstrates session caching and rate limiting patterns.

**Patterns used:**
- `SET` with `EX` (TTL) for session storage
- `INCR` + `EXPIRE` for rate limiting (sliding window)
- `DEL` for session invalidation
- Key prefix: `sessions:*`

**Behavior:**
- Simulates user logins every 3-5 seconds
- Creates sessions with 30-minute TTL
- Validates sessions on simulated requests
- Enforces rate limit: 100 requests/minute per user
- Periodically logs out users (deletes session)
- Logs all operations with timing

### Catalog Service

Demonstrates cache-aside pattern with pub/sub invalidation.

**Patterns used:**
- Cache-aside: check cache → miss → fetch from source → cache with TTL
- `PUBLISH`/`SUBSCRIBE` for cross-instance cache invalidation
- `MGET`/`MSET` for bulk operations
- Key prefix: `catalog:*`

**Behavior:**
- Maintains in-memory "database" of 20 products
- Serves product lookups (cache-aside with 5-minute TTL)
- Periodically updates products → publishes invalidation event
- Other instances receive invalidation → clear stale cache
- Logs hit/miss ratio every 30 seconds
- Bulk warms cache on startup

### Event Flow

```
Session Service                      Catalog Service
    │                                      │
    │── SET sessions:user:abc ────────►    │
    │   (TTL 1800s)                        │
    │                                      │── GET catalog:product:42
    │── INCR sessions:rate:abc ──────►     │   (cache miss)
    │   (rate limit check)                 │── SET catalog:product:42
    │                                      │   (TTL 300s, from "DB")
    │── GET sessions:user:abc ────────►    │
    │   (session validation)               │── PUBLISH catalog:invalidate
    │                                      │   {"productId": 42}
    │── DEL sessions:user:abc ────────►    │
    │   (logout)                           │── DEL catalog:product:42
    │                                      │   (received invalidation)
```

---

## Folder Structure

```
cache-server/
├── docker-compose.yml              # All services
├── .env                            # HOST_IP, passwords, ports
├── .gitignore
├── README.md
│
├── config/
│   ├── redis/
│   │   ├── redis-common.conf       # Shared Redis config
│   │   ├── redis-node-1.conf       # Per-node overrides (port, cluster-announce)
│   │   ├── redis-node-2.conf
│   │   ├── redis-node-3.conf
│   │   ├── redis-node-4.conf
│   │   ├── redis-node-5.conf
│   │   ├── redis-node-6.conf
│   │   └── users.acl               # ACL user definitions
│   ├── prometheus/
│   │   ├── prometheus.yml          # Scrape config
│   │   └── alert-rules.yml         # Alert rules
│   ├── grafana/
│   │   ├── dashboards/
│   │   │   └── redis-overview.json # Pre-built dashboard
│   │   └── provisioning/
│   │       ├── dashboards/dashboards.yml
│   │       └── datasources/prometheus.yml
│   └── alertmanager/
│       └── alertmanager.yml        # Alert routing
│
├── portal/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── .dockerignore
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── page.tsx            # Dashboard
│       │   ├── keys/page.tsx       # Key browser
│       │   ├── apps/page.tsx       # Applications
│       │   ├── pubsub/page.tsx     # Pub/Sub test panel
│       │   ├── tools/
│       │   │   ├── redis-insight/page.tsx
│       │   │   ├── grafana/page.tsx
│       │   │   ├── prometheus/page.tsx
│       │   │   └── alertmanager/page.tsx
│       │   └── api/
│       │       ├── health/route.ts
│       │       ├── cluster/route.ts
│       │       ├── keys/route.ts
│       │       ├── stats/route.ts
│       │       ├── apps/route.ts
│       │       ├── pubsub/route.ts
│       │       └── proxy/route.ts
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── StatusBadge.tsx
│       │   └── EmbedPage.tsx
│       └── lib/
│           ├── config.ts
│           └── redis.ts            # ioredis cluster client
│
├── mock-apps/
│   ├── docker-compose.yml
│   ├── session-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── index.js
│   └── catalog-service/
│       ├── Dockerfile
│       ├── package.json
│       └── index.js
│
├── scripts/
│   ├── start.sh
│   ├── stop.sh
│   ├── status.sh
│   ├── health-check.sh
│   └── init-cluster.sh
│
└── docs/
    ├── cache-server-architecture.md    # This document
    ├── 01-getting-started.md
    ├── 02-integration-guide.md
    ├── 03-cache-patterns.md
    ├── 04-monitoring-setup.md
    ├── 05-security-configuration.md
    └── 06-alerting-setup.md
```

---

## Capacity Planning

### For 20,000+ requests/minute

| Resource | Value | Notes |
|----------|-------|-------|
| Cluster nodes | 6 (3M + 3R) | ~7,000 req/min per master |
| Memory per node | 256 MB | 768 MB total usable |
| Max connections | 10,000 (default) | Per node |
| Persistence overhead | ~10% CPU | RDB + AOF |
| Network | < 100 Mbps | For typical key sizes < 1KB |

### Scaling Options

- **Vertical**: Increase `maxmemory` per node
- **Horizontal**: Add more master-replica pairs (reshard slots)
- **Read scaling**: Direct read-only queries to replicas (`READONLY` mode)
