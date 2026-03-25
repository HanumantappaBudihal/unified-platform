# 02 — Integration Guide

How to connect any application to the centralized Redis Cache Server.

---

## Connection Details

| Method | URL | Use Case |
|--------|-----|----------|
| **Redis Protocol** (same machine) | `localhost:6371,6372,6373` | Apps on the same host |
| **Redis Protocol** (network) | `192.168.11.96:6371,6372,6373` | Apps on other devices (use `HOST_IP` from `.env`) |
| **Redis Insight** (GUI) | http://localhost:5540 | Manual key management |

> **Cluster mode**: Always provide all 3 master node addresses. The client auto-discovers replicas and handles failover.

---

## Step 1: Request an Application Account

Each application gets:
- A **username** and **password** (ACL user)
- A **key prefix** (e.g., `myapp:*`) — your app can only access keys under this prefix
- A **pub/sub channel prefix** (e.g., `myapp:*`)

To register, add your app in `config/redis/users.acl` or request via the Portal at http://localhost:3002/apps.

---

## Step 2: Connect Your Application

### Node.js (ioredis)

```bash
npm install ioredis
```

**Cluster connection:**
```javascript
const Redis = require('ioredis');

const redis = new Redis.Cluster([
  { host: 'localhost', port: 6371 },
  { host: 'localhost', port: 6372 },
  { host: 'localhost', port: 6373 },
], {
  redisOptions: {
    username: 'session-svc',        // your ACL username
    password: 'session-secret',     // your ACL password
  },
  // Retry strategy
  clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => console.log('Connected to Redis Cluster'));
redis.on('error', (err) => console.error('Redis error:', err));
```

**Basic operations:**
```javascript
// SET with TTL (seconds)
await redis.set('sessions:user:abc123', JSON.stringify({
  userId: 'abc123',
  role: 'admin',
  loginAt: new Date().toISOString(),
}), 'EX', 1800); // 30 minutes

// GET
const session = JSON.parse(await redis.get('sessions:user:abc123'));

// DELETE
await redis.del('sessions:user:abc123');

// SET if not exists (NX) with TTL
await redis.set('sessions:lock:order-123', '1', 'EX', 30, 'NX');

// INCREMENT (atomic counter)
await redis.incr('sessions:rate:user:abc123');
await redis.expire('sessions:rate:user:abc123', 60); // reset every 60s

// HASH operations
await redis.hset('sessions:profile:abc123', { name: 'Alice', email: 'alice@example.com' });
const profile = await redis.hgetall('sessions:profile:abc123');

// Pub/Sub
const sub = redis.duplicate();
await sub.subscribe('sessions:events');
sub.on('message', (channel, message) => {
  console.log(`Received on ${channel}:`, message);
});
await redis.publish('sessions:events', JSON.stringify({ type: 'logout', userId: 'abc123' }));
```

---

### Java (Jedis)

```xml
<!-- pom.xml -->
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>5.1.0</version>
</dependency>
```

```java
import redis.clients.jedis.*;

// Cluster connection
Set<HostAndPort> nodes = new HashSet<>();
nodes.add(new HostAndPort("localhost", 6371));
nodes.add(new HostAndPort("localhost", 6372));
nodes.add(new HostAndPort("localhost", 6373));

JedisClientConfig config = DefaultJedisClientConfig.builder()
    .user("catalog-svc")
    .password("catalog-secret")
    .build();

JedisCluster jedis = new JedisCluster(nodes, config);

// SET with TTL
jedis.setex("catalog:product:42", 300, "{\"name\":\"Widget\",\"price\":9.99}");

// GET
String product = jedis.get("catalog:product:42");

// DELETE
jedis.del("catalog:product:42");

// INCREMENT
jedis.incr("catalog:stats:requests");

// HASH
Map<String, String> productMap = new HashMap<>();
productMap.put("name", "Widget");
productMap.put("price", "9.99");
jedis.hset("catalog:product:42:details", productMap);
```

### Spring Boot (Spring Data Redis)

```yaml
# application.yml
spring:
  data:
    redis:
      cluster:
        nodes: localhost:6371,localhost:6372,localhost:6373
      username: catalog-svc
      password: catalog-secret
```

```java
@Service
public class ProductCacheService {
    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    public void cacheProduct(String id, Product product) {
        String key = "catalog:product:" + id;
        redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(product),
            Duration.ofMinutes(5));
    }

    public Product getProduct(String id) {
        String key = "catalog:product:" + id;
        String json = redisTemplate.opsForValue().get(key);
        return json != null ? objectMapper.readValue(json, Product.class) : null;
    }

    public void invalidate(String id) {
        redisTemplate.delete("catalog:product:" + id);
    }
}
```

---

### Python (redis-py)

```bash
pip install redis
```

```python
from redis.cluster import RedisCluster

# Cluster connection
redis = RedisCluster(
    startup_nodes=[
        {"host": "localhost", "port": 6371},
        {"host": "localhost", "port": 6372},
        {"host": "localhost", "port": 6373},
    ],
    username="session-svc",
    password="session-secret",
    decode_responses=True,
)

# SET with TTL
import json

redis.setex("sessions:user:abc123", 1800, json.dumps({
    "userId": "abc123",
    "role": "admin",
}))

# GET
session = json.loads(redis.get("sessions:user:abc123"))

# DELETE
redis.delete("sessions:user:abc123")

# INCREMENT (rate limiting)
key = "sessions:rate:user:abc123"
count = redis.incr(key)
if count == 1:
    redis.expire(key, 60)  # Set TTL on first increment

if count > 100:
    print("Rate limit exceeded!")

# HASH
redis.hset("sessions:profile:abc123", mapping={"name": "Alice", "email": "alice@example.com"})
profile = redis.hgetall("sessions:profile:abc123")

# Pub/Sub
pubsub = redis.pubsub()
pubsub.subscribe("sessions:events")

for message in pubsub.listen():
    if message["type"] == "message":
        print(f"Received: {message['data']}")
```

---

### .NET / C# (StackExchange.Redis)

```bash
dotnet add package StackExchange.Redis
```

```csharp
using StackExchange.Redis;
using System.Text.Json;

// Cluster connection
var config = new ConfigurationOptions
{
    EndPoints = {
        { "localhost", 6371 },
        { "localhost", 6372 },
        { "localhost", 6373 },
    },
    User = "catalog-svc",
    Password = "catalog-secret",
};

var connection = ConnectionMultiplexer.Connect(config);
var db = connection.GetDatabase();

// SET with TTL
await db.StringSetAsync("catalog:product:42",
    JsonSerializer.Serialize(new { Name = "Widget", Price = 9.99 }),
    TimeSpan.FromMinutes(5));

// GET
var json = await db.StringGetAsync("catalog:product:42");
var product = JsonSerializer.Deserialize<Product>(json!);

// DELETE
await db.KeyDeleteAsync("catalog:product:42");

// INCREMENT
await db.StringIncrementAsync("catalog:stats:requests");

// HASH
await db.HashSetAsync("catalog:product:42:details", new HashEntry[] {
    new("name", "Widget"),
    new("price", "9.99"),
});

var details = await db.HashGetAllAsync("catalog:product:42:details");

// Pub/Sub
var subscriber = connection.GetSubscriber();
await subscriber.SubscribeAsync(RedisChannel.Literal("catalog:invalidate"), (channel, message) => {
    Console.WriteLine($"Invalidation: {message}");
});

await subscriber.PublishAsync(RedisChannel.Literal("catalog:invalidate"),
    JsonSerializer.Serialize(new { ProductId = 42 }));
```

---

## Step 3: Best Practices

### Key Naming Convention

```
<app-prefix>:<resource-type>:<identifier>
```

| Example | Purpose |
|---------|---------|
| `sessions:user:abc123` | User session data |
| `sessions:rate:user:abc123` | Rate limit counter |
| `catalog:product:42` | Cached product |
| `catalog:category:electronics` | Cached category |
| `myapp:lock:order-123` | Distributed lock |
| `myapp:queue:emails` | Job queue (List) |

### TTL Strategy

| Data Type | Recommended TTL | Reason |
|-----------|----------------|--------|
| User sessions | 30 minutes | Security — expire inactive sessions |
| API response cache | 5 minutes | Freshness — balance speed vs. staleness |
| Rate limit counters | 60 seconds | Reset window |
| Distributed locks | 30 seconds | Prevent deadlocks |
| Static reference data | 1 hour | Rarely changes |

### Error Handling

```javascript
// Always handle connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Fall back to direct DB query / return stale data / fail gracefully
});

// Always handle cache misses
const cached = await redis.get('catalog:product:42');
if (!cached) {
  // Cache miss — fetch from source, then cache
  const product = await db.getProduct(42);
  await redis.set('catalog:product:42', JSON.stringify(product), 'EX', 300);
  return product;
}
return JSON.parse(cached);
```

### Connection Pooling

Most Redis clients handle pooling internally. Key settings:

| Setting | Recommended | Purpose |
|---------|-------------|---------|
| Max connections | 50 per app | Prevent overwhelming the cluster |
| Min idle | 5 | Keep warm connections ready |
| Connect timeout | 5 seconds | Fail fast on network issues |
| Command timeout | 2 seconds | Don't hang on slow commands |

---

## Step 4: Monitor Your Application

| What | Where |
|------|-------|
| Key browser | http://localhost:3002/keys (Portal) |
| App stats | http://localhost:3002/apps (Portal) |
| Memory & ops/sec | http://localhost:3000 (Grafana) |
| Cluster health | http://localhost:3002 (Portal Dashboard) |
| Slow queries | http://localhost:5540 (Redis Insight) |
| Alerts | http://localhost:9094 (Alertmanager) |
