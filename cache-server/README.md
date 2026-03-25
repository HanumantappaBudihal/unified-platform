# Cache Server — Centralized Redis Cluster

Centralized Redis Cluster infrastructure for cross-application caching, with management portal, monitoring, alerting, and per-app security.

## Quick Start

```bash
# Start core services (Redis Cluster + Redis Insight)
bash scripts/start.sh

# Initialize the cluster (run once after first start)
bash scripts/init-cluster.sh

# Start everything (+ Monitoring + Portal)
bash scripts/start.sh --full
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Redis Cluster | `localhost:6371-6376` | 3 masters + 3 replicas |
| Redis Insight | http://localhost:5540 | Official Redis GUI |
| **Cache Portal** | **http://localhost:3002** | **Management dashboard** |
| Prometheus | http://localhost:9091 | Metrics + alert rules |
| Grafana | http://localhost:3003 | Dashboards |
| Alertmanager | http://localhost:9095 | Alert routing (Slack/Email) |
| Redis Exporter | http://localhost:9121 | Prometheus metrics |

## Documentation

| Doc | Topic |
|-----|-------|
| [Architecture](docs/cache-server-architecture.md) | Full architecture and planning |
| [01 - Getting Started](docs/01-getting-started.md) | Setup and first steps |
| [02 - Integration Guide](docs/02-integration-guide.md) | Connect your apps (Node.js, Java, Python, .NET) |
| [03 - Cache Patterns](docs/03-cache-patterns.md) | Session store, cache-aside, rate limiting, pub/sub |
| [04 - Monitoring Setup](docs/04-monitoring-setup.md) | Redis Exporter + Prometheus + Grafana |
| [05 - Security Configuration](docs/05-security-configuration.md) | ACLs, per-app users, TLS |
| [06 - Alerting Setup](docs/06-alerting-setup.md) | Alert rules + Slack/Email routing |

---

## How to Use This Central Cache Server

This cache server is shared infrastructure. Any application (in any language) can connect and use it for caching, session management, rate limiting, pub/sub messaging, and more.

### Step 1: Request an Application Account

Each application gets its own **ACL user** with a dedicated **key prefix**. This ensures isolation — your app can only access its own keys.

**To add a new application**, edit `config/redis/users.acl`:

```
user myapp-svc on >myapp-secret ~myapp:* &myapp:* +@all -@admin -@dangerous
```

Then reload ACLs (no restart needed):
```bash
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning ACL LOAD
```

**Existing accounts:**

| Username | Password | Key Prefix | Purpose |
|----------|----------|-----------|---------|
| `admin` | `admin-secret` | `*` (all) | Portal, management |
| `session-svc` | `session-secret` | `sessions:*` | Session Service |
| `catalog-svc` | `catalog-secret` | `catalog:*` | Catalog Service |

### Step 2: Choose Your Connection Method

| From | Bootstrap Nodes | Notes |
|------|----------------|-------|
| Same machine | `localhost:6371,localhost:6372,localhost:6373` | All 3 master nodes |
| Other devices (LAN) | `192.168.11.96:6371,...` | Set `HOST_IP` in `.env` |
| Docker container (same network) | `redis-node-1:6371,redis-node-2:6372,redis-node-3:6373` | Use Docker hostnames |

> **Important**: Always connect in **cluster mode** and provide all 3 master nodes. The client auto-discovers replicas and handles failover.

### Step 3: Connect Your Application

#### Node.js (ioredis)

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
  redisOptions: {
    username: 'myapp-svc',       // your ACL username
    password: 'myapp-secret',    // your ACL password
  },
  // Required when connecting from outside Docker
  natMap: {
    'redis-node-1:6371': { host: '127.0.0.1', port: 6371 },
    'redis-node-2:6372': { host: '127.0.0.1', port: 6372 },
    'redis-node-3:6373': { host: '127.0.0.1', port: 6373 },
    'redis-node-4:6374': { host: '127.0.0.1', port: 6374 },
    'redis-node-5:6375': { host: '127.0.0.1', port: 6375 },
    'redis-node-6:6376': { host: '127.0.0.1', port: 6376 },
  },
});

redis.on('connect', () => console.log('Connected to Redis Cluster'));
redis.on('error', (err) => console.error('Redis error:', err));

// SET with TTL (5 minutes)
await redis.set('myapp:user:123', JSON.stringify({ name: 'Alice' }), 'EX', 300);

// GET
const user = JSON.parse(await redis.get('myapp:user:123'));

// DELETE
await redis.del('myapp:user:123');

// INCREMENT (atomic counter for rate limiting)
const count = await redis.incr('myapp:rate:user:123');
await redis.expire('myapp:rate:user:123', 60); // reset every 60s

// HASH (store structured data)
await redis.hset('myapp:profile:123', { name: 'Alice', email: 'alice@example.com' });
const profile = await redis.hgetall('myapp:profile:123');

// Pub/Sub
await redis.publish('myapp:events', JSON.stringify({ type: 'user-updated', userId: '123' }));
```

> **Note on `natMap`**: The Redis cluster nodes advertise themselves using Docker hostnames (`redis-node-1:6371`). When connecting from outside Docker (e.g., local development), `natMap` translates these to `localhost` addresses. When connecting from within Docker (same network), you don't need `natMap`.

#### Java (Jedis)

```xml
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>5.1.0</version>
</dependency>
```

```java
import redis.clients.jedis.*;

Set<HostAndPort> nodes = new HashSet<>();
nodes.add(new HostAndPort("localhost", 6371));
nodes.add(new HostAndPort("localhost", 6372));
nodes.add(new HostAndPort("localhost", 6373));

JedisClientConfig config = DefaultJedisClientConfig.builder()
    .user("myapp-svc")
    .password("myapp-secret")
    .build();

JedisCluster jedis = new JedisCluster(nodes, config);

// SET with TTL
jedis.setex("myapp:product:42", 300, "{\"name\":\"Widget\",\"price\":9.99}");

// GET
String product = jedis.get("myapp:product:42");

// DELETE
jedis.del("myapp:product:42");
```

#### Spring Boot (Spring Data Redis)

```yaml
# application.yml
spring:
  data:
    redis:
      cluster:
        nodes: localhost:6371,localhost:6372,localhost:6373
      username: myapp-svc
      password: myapp-secret
```

```java
@Service
public class CacheService {
    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    public void cache(String key, Object data, long ttlMinutes) {
        redisTemplate.opsForValue().set("myapp:" + key,
            objectMapper.writeValueAsString(data), Duration.ofMinutes(ttlMinutes));
    }

    public <T> T get(String key, Class<T> type) {
        String json = redisTemplate.opsForValue().get("myapp:" + key);
        return json != null ? objectMapper.readValue(json, type) : null;
    }
}
```

#### Python (redis-py)

```bash
pip install redis
```

```python
from redis.cluster import RedisCluster
import json

redis = RedisCluster(
    startup_nodes=[
        {"host": "localhost", "port": 6371},
        {"host": "localhost", "port": 6372},
        {"host": "localhost", "port": 6373},
    ],
    username="myapp-svc",
    password="myapp-secret",
    decode_responses=True,
)

# SET with TTL
redis.setex("myapp:user:123", 300, json.dumps({"name": "Alice"}))

# GET
user = json.loads(redis.get("myapp:user:123"))

# DELETE
redis.delete("myapp:user:123")

# Rate limiting
count = redis.incr("myapp:rate:user:123")
if count == 1:
    redis.expire("myapp:rate:user:123", 60)
```

#### .NET / C# (StackExchange.Redis)

```bash
dotnet add package StackExchange.Redis
```

```csharp
using StackExchange.Redis;
using System.Text.Json;

var config = new ConfigurationOptions {
    EndPoints = { { "localhost", 6371 }, { "localhost", 6372 }, { "localhost", 6373 } },
    User = "myapp-svc",
    Password = "myapp-secret",
};

var connection = ConnectionMultiplexer.Connect(config);
var db = connection.GetDatabase();

// SET with TTL
await db.StringSetAsync("myapp:user:123",
    JsonSerializer.Serialize(new { Name = "Alice" }), TimeSpan.FromMinutes(5));

// GET
var json = await db.StringGetAsync("myapp:user:123");
var user = JsonSerializer.Deserialize<User>(json!);

// DELETE
await db.KeyDeleteAsync("myapp:user:123");
```

#### Docker Container (Same Network)

If your app runs in Docker on the `cache-network`:

```yaml
# your-app/docker-compose.yml
services:
  your-app:
    build: .
    environment:
      - REDIS_NODES=redis-node-1:6371,redis-node-2:6372,redis-node-3:6373
      - REDIS_USERNAME=myapp-svc
      - REDIS_PASSWORD=myapp-secret
    networks:
      - cache-network

networks:
  cache-network:
    external: true
```

> No `natMap` needed when connecting from within the Docker network.

#### CLI (Quick Test)

```bash
# Test connectivity
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning PING

# Set a key
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning SET test:hello "world" EX 300

# Get a key
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning GET test:hello

# Scan keys by pattern
docker exec redis-node-1 redis-cli -c -p 6371 --user admin -a admin-secret --no-auth-warning SCAN 0 MATCH "sessions:*" COUNT 100
```

### Step 4: Follow Key Naming Convention

```
<app-prefix>:<resource-type>:<identifier>
```

| Example | Purpose |
|---------|---------|
| `sessions:user:abc123` | User session data |
| `sessions:rate:user:abc123` | Rate limit counter |
| `catalog:product:42` | Cached product |
| `catalog:category:electronics` | Cached category listing |
| `myapp:lock:order-123` | Distributed lock |
| `myapp:queue:emails` | Job queue |

### Step 5: Set Appropriate TTLs

| Data Type | Recommended TTL | Why |
|-----------|----------------|-----|
| User sessions | 30 minutes | Security — expire inactive sessions |
| API response cache | 5 minutes | Balance speed vs. freshness |
| Rate limit counters | 60 seconds | Reset window |
| Distributed locks | 30 seconds | Prevent deadlocks |
| Static reference data | 1 hour | Rarely changes |
| Never-expire | Avoid! | Keys without TTL accumulate forever |

### Step 6: Handle Errors Gracefully

```javascript
// Always handle cache misses
async function getProduct(id) {
  const cached = await redis.get(`myapp:product:${id}`);
  if (cached) return JSON.parse(cached); // Cache HIT

  // Cache MISS — fetch from database
  const product = await db.getProduct(id);
  await redis.set(`myapp:product:${id}`, JSON.stringify(product), 'EX', 300);
  return product;
}

// Always handle connection errors
redis.on('error', (err) => {
  console.error('Redis error:', err);
  // Fall back to database / return stale data / fail gracefully
});
```

### Step 7: Monitor Your Application

| What | Where |
|------|-------|
| Browse your keys | http://localhost:3002/keys (Portal) |
| App key counts | http://localhost:3002/apps (Portal) |
| Memory & ops/sec | http://localhost:3003 (Grafana) |
| Cluster health | http://localhost:3002 (Portal Dashboard) |
| Slow queries | http://localhost:5540 (Redis Insight) |
| Alerts | http://localhost:9095 (Alertmanager) |

---

## Common Cache Patterns

### Cache-Aside (Most Common)

```
App → Redis (HIT?) → return cached
         ↓ (MISS)
      Database → cache result → return
```

### Session Store

```javascript
// Login: create session with TTL
await redis.set(`sessions:user:${sessionId}`, JSON.stringify(data), 'EX', 1800);

// Validate: check + extend TTL
const session = await redis.get(`sessions:user:${sessionId}`);
if (session) await redis.expire(`sessions:user:${sessionId}`, 1800);

// Logout: delete
await redis.del(`sessions:user:${sessionId}`);
```

### Rate Limiting

```javascript
const count = await redis.incr(`myapp:rate:${userId}`);
if (count === 1) await redis.expire(`myapp:rate:${userId}`, 60);
if (count > 100) throw new Error('Rate limit exceeded');
```

### Distributed Lock

```javascript
// Acquire (SET NX = only if not exists)
const locked = await redis.set(`myapp:lock:${resource}`, lockId, 'EX', 30, 'NX');

// Release (only if we hold it — use Lua script for atomicity)
await redis.eval(
  `if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`,
  1, `myapp:lock:${resource}`, lockId
);
```

### Pub/Sub (Cache Invalidation)

```javascript
// Publisher: notify when data changes
await redis.publish('myapp:invalidate', JSON.stringify({ productId: 42 }));

// Subscriber: listen for invalidation events
const sub = redis.duplicate();
sub.subscribe('myapp:invalidate');
sub.on('message', (channel, msg) => {
  const { productId } = JSON.parse(msg);
  redis.del(`myapp:product:${productId}`);
});
```

> Full pattern guide with more examples: [03 - Cache Patterns](docs/03-cache-patterns.md)

---

## Mock Applications

Two reference apps in `mock-apps/` demonstrate real-world cache patterns:

| Service | Key Prefix | Patterns |
|---------|-----------|----------|
| **Session Service** | `sessions:*` | Session store, rate limiting, sliding TTL |
| **Catalog Service** | `catalog:*` | Cache-aside, pub/sub invalidation, bulk warming |

```bash
# Start mock apps (after cluster is initialized)
cd mock-apps && docker compose up -d

# View logs
docker logs -f mock-session-service
docker logs -f mock-catalog-service
```

### Event Flow

```
Session Service                      Catalog Service
    │                                      │
    ├── SET sessions:user:abc              ├── GET catalog:product:42 (miss)
    │   (TTL 1800s)                        ├── SET catalog:product:42 (TTL 300s)
    ├── INCR sessions:rate:abc             │
    │   (rate limit check)                 ├── PUBLISH catalog:invalidate
    ├── GET sessions:user:abc              │   {"productId": 42}
    │   (session validation)               │
    └── DEL sessions:user:abc              └── DEL catalog:product:42
        (logout)                               (received invalidation)
```

---

## Onboarding Checklist for New Applications

1. **Choose a key prefix** — e.g., `payments:`, `notifications:`, `auth:`
2. **Add ACL user** — edit `config/redis/users.acl`, reload with `ACL LOAD`
3. **Install Redis client** — ioredis (Node.js), Jedis (Java), redis-py (Python), StackExchange.Redis (.NET)
4. **Connect in cluster mode** — provide all 3 master nodes, use `natMap` if outside Docker
5. **Follow naming convention** — `<prefix>:<resource>:<id>`
6. **Set TTLs on all keys** — never cache without expiration
7. **Handle cache misses** — fall back to source data
8. **Handle errors** — Redis down should not crash your app
9. **Monitor** — check your keys in the Portal, watch Grafana dashboards
10. **Register in Portal** — add your app to `portal/src/lib/config.ts` for dashboard visibility

---

## Scripts

```bash
bash scripts/start.sh                  # Start core (Redis Cluster + Insight)
bash scripts/start.sh --full           # Start all services
bash scripts/start.sh --monitoring     # Core + monitoring stack
bash scripts/start.sh --portal         # Core + management portal
bash scripts/stop.sh                   # Stop all services
bash scripts/status.sh                 # Service status + cluster info
bash scripts/health-check.sh           # JSON health endpoint
bash scripts/init-cluster.sh           # Initialize cluster (run once)
```

## Key Features

- **Redis Cluster** — 3 masters + 3 replicas with auto-failover
- **Per-App Security** — ACL users with key prefix isolation
- **Management Portal** — Next.js dashboard: health, keys, apps, pub/sub
- **Embedded Tools** — Redis Insight, Grafana, Prometheus inside the portal
- **10+ Alert Rules** — Node down, high memory, low hit ratio, eviction
- **Persistence** — RDB snapshots + AOF for durability
- **Mock Applications** — Session store + catalog cache with real patterns
- **20,000+ req/min** — Each master handles ~7,000 req/min independently

## Cache Portal

Custom Next.js web application at **http://localhost:3002**.

### Pages

| Page | Features |
|------|----------|
| **Dashboard** | Cluster health, memory, ops/sec, hit ratio, node status |
| **Keys** | Browse/search/create/delete keys, view values + TTL |
| **Applications** | Registered apps, key counts, connection info |
| **Pub/Sub** | Publish and subscribe to channels (live) |
| **Tools** | Embedded Redis Insight, Grafana, Prometheus, Alertmanager |

### Portal Architecture

```
Browser → Next.js Cache Portal (:3002)
               │
               ├── /api/health      → checks Redis + all services
               ├── /api/cluster     → CLUSTER INFO + node details
               ├── /api/keys        → SCAN / GET / SET / DEL
               ├── /api/stats       → aggregated memory, ops, hit ratio
               ├── /api/apps        → per-app key counts
               ├── /api/pubsub      → PUBLISH messages
               └── /api/proxy       → reverse proxy for embedded tools
```
