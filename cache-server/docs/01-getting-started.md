# 01 — Getting Started

## Prerequisites

- **Docker** & **Docker Compose** (v2.x+)
- **Bash** shell (Git Bash on Windows)
- Ports `6371-6376`, `5540`, `9090`, `9094`, `9121`, `3000`, `3002` available

---

## Quick Start

```bash
# 1. Start core services (Redis Cluster + Redis Insight)
bash scripts/start.sh

# 2. Initialize the cluster (run once after first start)
bash scripts/init-cluster.sh

# 3. Start everything (+ Monitoring + Portal)
bash scripts/start.sh --full
```

Open the **Cache Portal** at **http://localhost:3002** to manage everything from one place.

---

## Start Options

```bash
bash scripts/start.sh                  # Core: Redis Cluster + Redis Insight
bash scripts/start.sh --full           # All services
bash scripts/start.sh --monitoring     # Core + Prometheus + Grafana + Alertmanager
bash scripts/start.sh --portal         # Core + Cache Portal
bash scripts/stop.sh                   # Stop all services
bash scripts/status.sh                 # Show service status
bash scripts/health-check.sh           # JSON health check
```

---

## Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Cache Portal | http://localhost:3002 | — |
| Redis Insight | http://localhost:5540 | — |
| Redis Cluster | `localhost:6371-6376` | `admin` / `admin-secret` |
| Grafana | http://localhost:3003 | `admin` / `admin` |
| Prometheus | http://localhost:9091 | — |
| Alertmanager | http://localhost:9095 | — |

---

## Verify the Cluster

```bash
# Check cluster status
docker exec redis-node-1 redis-cli -p 6371 --user admin -a admin-secret --no-auth-warning CLUSTER INFO

# Check cluster nodes
docker exec redis-node-1 redis-cli -p 6371 --user admin -a admin-secret --no-auth-warning CLUSTER NODES

# Test a SET/GET (use -c for cluster mode to follow redirects)
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning SET test:hello "world"
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning GET test:hello
```

---

## Connect Your Application

Any application can connect to this centralized cache server. See the full [Integration Guide](02-integration-guide.md).

### Quick Connection Reference

| From | Connection | Notes |
|------|-----------|-------|
| Same machine | `localhost:6371,localhost:6372,localhost:6373` | Cluster mode — provide all master nodes |
| Other devices (LAN) | `192.168.11.96:6371,...` | Set `HOST_IP` in `.env` |
| Single-node mode | `localhost:6371` | For simple use cases (not recommended) |

### Node.js Quick Start

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');

const redis = new Redis.Cluster([
  { host: 'localhost', port: 6371 },
  { host: 'localhost', port: 6372 },
  { host: 'localhost', port: 6373 },
], {
  redisOptions: { password: 'admin-secret' }
});

// SET with TTL
await redis.set('myapp:user:123', JSON.stringify({ name: 'Alice' }), 'EX', 3600);

// GET
const user = JSON.parse(await redis.get('myapp:user:123'));
```

---

## Environment Configuration

Edit `.env` to customize:

```bash
# Your machine's LAN IP (for access from other devices)
HOST_IP=192.168.11.96

# Redis admin password
REDIS_ADMIN_PASSWORD=admin-secret

# Memory per Redis node
REDIS_MAXMEMORY=256mb

# Portal port
PORTAL_PORT=3002
```

---

## What's Next?

| Guide | Topic |
|-------|-------|
| [02 - Integration Guide](02-integration-guide.md) | Connect your apps (Node.js, Java, Python, .NET) |
| [03 - Cache Patterns](03-cache-patterns.md) | Session store, cache-aside, rate limiting, pub/sub |
| [04 - Monitoring Setup](04-monitoring-setup.md) | Prometheus + Grafana dashboards |
| [05 - Security Configuration](05-security-configuration.md) | ACLs, per-app users, TLS |
| [06 - Alerting Setup](06-alerting-setup.md) | Alert rules + Slack/Email routing |
