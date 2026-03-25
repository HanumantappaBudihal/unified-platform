# 03 — Cache Patterns

Common caching patterns implemented with the centralized Redis Cache Server.

---

## 1. Cache-Aside (Lazy Loading)

The most common pattern. Application checks cache first; on miss, fetches from source and caches the result.

```
Client → App → Redis (HIT?) → Return cached data
                  │ (MISS)
                  └→ Database → Cache result → Return data
```

```javascript
async function getProduct(id) {
  const cacheKey = `catalog:product:${id}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // Cache HIT
  }

  // 2. Cache MISS — fetch from source
  const product = await db.query('SELECT * FROM products WHERE id = ?', [id]);

  // 3. Cache the result with TTL
  await redis.set(cacheKey, JSON.stringify(product), 'EX', 300); // 5 min

  return product;
}
```

**When to use**: Read-heavy workloads, data that tolerates slight staleness.

**Pros**: Only caches data that's actually requested. Simple to implement.

**Cons**: Cache miss penalty (slower first request). Data can be stale until TTL expires.

---

## 2. Write-Through

Application writes to cache and database simultaneously. Cache is always up-to-date.

```
Client → App → Write to Redis + Write to Database
```

```javascript
async function updateProduct(id, data) {
  const cacheKey = `catalog:product:${id}`;

  // 1. Update database
  await db.query('UPDATE products SET ? WHERE id = ?', [data, id]);

  // 2. Update cache (always fresh)
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);

  return data;
}
```

**When to use**: Data that must always be fresh in cache. Write frequency is moderate.

**Pros**: Cache is never stale. No cache miss on reads.

**Cons**: Write latency increases (two writes). Unused data may be cached.

---

## 3. Write-Behind (Write-Back)

Application writes to cache immediately, then asynchronously writes to database.

```
Client → App → Write to Redis → Return immediately
                     │
                     └→ (async) Write to Database
```

```javascript
async function updateProduct(id, data) {
  const cacheKey = `catalog:product:${id}`;
  const queueKey = `catalog:write-queue`;

  // 1. Update cache immediately
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 300);

  // 2. Queue the write for async processing
  await redis.lpush(queueKey, JSON.stringify({ id, data, timestamp: Date.now() }));
}

// Background worker processes the queue
async function processWriteQueue() {
  while (true) {
    const item = await redis.brpop('catalog:write-queue', 5); // Block for 5s
    if (item) {
      const { id, data } = JSON.parse(item[1]);
      await db.query('UPDATE products SET ? WHERE id = ?', [data, id]);
    }
  }
}
```

**When to use**: Write-heavy workloads where write latency matters more than consistency.

**Pros**: Very fast writes. Batching possible.

**Cons**: Risk of data loss if Redis crashes before DB write. Complex error handling.

---

## 4. Session Store

Store user sessions in Redis with automatic expiration.

```javascript
const SESSION_TTL = 1800; // 30 minutes

// Create session on login
async function createSession(userId, sessionData) {
  const sessionId = crypto.randomUUID();
  const key = `sessions:user:${sessionId}`;

  await redis.set(key, JSON.stringify({
    userId,
    ...sessionData,
    createdAt: new Date().toISOString(),
  }), 'EX', SESSION_TTL);

  return sessionId;
}

// Validate session (extends TTL on each access)
async function validateSession(sessionId) {
  const key = `sessions:user:${sessionId}`;
  const session = await redis.get(key);

  if (!session) return null; // Expired or invalid

  // Extend TTL (sliding expiration)
  await redis.expire(key, SESSION_TTL);

  return JSON.parse(session);
}

// Destroy session on logout
async function destroySession(sessionId) {
  await redis.del(`sessions:user:${sessionId}`);
}
```

---

## 5. Rate Limiting

### Fixed Window

```javascript
async function checkRateLimit(userId, limit = 100, windowSeconds = 60) {
  const key = `sessions:rate:${userId}`;

  const count = await redis.incr(key);

  // Set TTL on first request in window
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: await redis.ttl(key),
  };
}
```

### Sliding Window (more accurate)

```javascript
async function checkRateLimitSliding(userId, limit = 100, windowMs = 60000) {
  const key = `sessions:rate-sliding:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Use sorted set with timestamp as score
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);  // Remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`);  // Add current request
  pipeline.zcard(key);  // Count requests in window
  pipeline.expire(key, Math.ceil(windowMs / 1000));  // Auto-cleanup

  const results = await pipeline.exec();
  const count = results[2][1];

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

---

## 6. Distributed Lock

Prevent concurrent access to a shared resource.

```javascript
async function acquireLock(resource, ttlSeconds = 30) {
  const lockKey = `myapp:lock:${resource}`;
  const lockValue = crypto.randomUUID(); // Unique to this holder

  // SET NX = only set if not exists
  const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');

  if (result === 'OK') {
    return lockValue; // Lock acquired
  }
  return null; // Lock held by someone else
}

async function releaseLock(resource, lockValue) {
  const lockKey = `myapp:lock:${resource}`;

  // Lua script: only delete if we hold the lock (atomic operation)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  return await redis.eval(script, 1, lockKey, lockValue);
}

// Usage
const lock = await acquireLock('order-123');
if (lock) {
  try {
    await processOrder('order-123');
  } finally {
    await releaseLock('order-123', lock);
  }
} else {
  console.log('Order already being processed');
}
```

---

## 7. Pub/Sub (Cache Invalidation)

Use pub/sub to notify all application instances when cached data changes.

```javascript
// Publisher (on data update)
async function updateProductAndNotify(id, data) {
  await db.query('UPDATE products SET ? WHERE id = ?', [data, id]);
  await redis.del(`catalog:product:${id}`);

  // Notify all instances
  await redis.publish('catalog:invalidate', JSON.stringify({
    type: 'product-updated',
    productId: id,
    timestamp: Date.now(),
  }));
}

// Subscriber (all app instances)
const sub = redis.duplicate();
await sub.subscribe('catalog:invalidate');

sub.on('message', (channel, message) => {
  const event = JSON.parse(message);

  if (event.type === 'product-updated') {
    // Clear local in-memory cache if you have one
    localCache.delete(`product:${event.productId}`);
    console.log(`Cache invalidated for product ${event.productId}`);
  }
});
```

---

## 8. Leaderboard / Sorted Sets

```javascript
// Add/update scores
await redis.zadd('myapp:leaderboard:daily', 1500, 'player:alice');
await redis.zadd('myapp:leaderboard:daily', 2300, 'player:bob');
await redis.zincrby('myapp:leaderboard:daily', 100, 'player:alice'); // +100

// Get top 10
const top10 = await redis.zrevrange('myapp:leaderboard:daily', 0, 9, 'WITHSCORES');
// ['player:bob', '2300', 'player:alice', '1600']

// Get player rank (0-based, descending)
const rank = await redis.zrevrank('myapp:leaderboard:daily', 'player:alice');
```

---

## 9. Job Queue (List-based)

```javascript
// Producer: add jobs to queue
async function enqueueJob(job) {
  await redis.lpush('myapp:queue:emails', JSON.stringify({
    id: crypto.randomUUID(),
    ...job,
    enqueuedAt: Date.now(),
  }));
}

// Consumer: process jobs (blocking pop)
async function processJobs() {
  while (true) {
    // BRPOP blocks until a job is available (5s timeout)
    const result = await redis.brpop('myapp:queue:emails', 5);
    if (result) {
      const job = JSON.parse(result[1]);
      try {
        await sendEmail(job);
        console.log(`Processed job ${job.id}`);
      } catch (err) {
        // Move to dead letter queue
        await redis.lpush('myapp:queue:emails:dlq', JSON.stringify({
          ...job,
          error: err.message,
          failedAt: Date.now(),
        }));
      }
    }
  }
}
```

---

## Pattern Selection Guide

| Use Case | Pattern | Redis Data Type |
|----------|---------|----------------|
| Read-heavy data (products, config) | Cache-Aside | String |
| User sessions | Session Store | String (with TTL) |
| API rate limiting | Rate Limiting | String (INCR) or Sorted Set |
| Prevent concurrent processing | Distributed Lock | String (SET NX) |
| Multi-instance cache sync | Pub/Sub Invalidation | Pub/Sub |
| Real-time rankings | Leaderboard | Sorted Set |
| Background job processing | Job Queue | List (LPUSH/BRPOP) |
| Always-fresh cache | Write-Through | String |
| Fast writes, async persistence | Write-Behind | String + List |
