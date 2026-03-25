const Redis = require('ioredis');

const REDIS_NODES = (process.env.REDIS_NODES || 'redis-node-1:6371,redis-node-2:6372,redis-node-3:6373')
  .split(',')
  .map((n) => { const [host, port] = n.trim().split(':'); return { host, port: parseInt(port) }; });

const redis = new Redis.Cluster(REDIS_NODES, {
  redisOptions: {
    username: process.env.REDIS_USERNAME || 'session-svc',
    password: process.env.REDIS_PASSWORD || 'session-secret',
  },
  clusterRetryStrategy: (times) => Math.min(times * 200, 5000),
});

const SESSION_TTL = 1800; // 30 minutes
const RATE_LIMIT = 100;
const RATE_WINDOW = 60; // seconds

const USERS = [
  { id: 'user-001', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
  { id: 'user-002', name: 'Bob Smith', email: 'bob@example.com', role: 'editor' },
  { id: 'user-003', name: 'Carol Davis', email: 'carol@example.com', role: 'viewer' },
  { id: 'user-004', name: 'Dave Wilson', email: 'dave@example.com', role: 'editor' },
  { id: 'user-005', name: 'Eve Martinez', email: 'eve@example.com', role: 'admin' },
  { id: 'user-006', name: 'Frank Lee', email: 'frank@example.com', role: 'viewer' },
];

const DEVICES = ['Chrome/Windows', 'Safari/macOS', 'Firefox/Linux', 'Mobile/iOS', 'Mobile/Android'];
const IPS = ['192.168.1.10', '10.0.0.55', '172.16.0.22', '192.168.1.101', '10.0.0.80'];

const activeSessions = new Map();
let totalLogins = 0;
let totalLogouts = 0;
let totalRequests = 0;
let rateLimitHits = 0;

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSessionId() {
  return 'sess-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Login — create a session
async function login(user) {
  const sessionId = generateSessionId();
  const sessionData = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    device: randomItem(DEVICES),
    ip: randomItem(IPS),
    loginAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  await redis.set(
    `sessions:user:${sessionId}`,
    JSON.stringify(sessionData),
    'EX', SESSION_TTL
  );

  // Track active session per user
  await redis.set(`sessions:active:${user.id}`, sessionId, 'EX', SESSION_TTL);

  activeSessions.set(sessionId, { userId: user.id, loginAt: Date.now() });
  totalLogins++;

  console.log(`[LOGIN]  ${user.name} (${user.role}) from ${sessionData.device} — session: ${sessionId.slice(0, 12)}...`);
  return sessionId;
}

// Validate session — check if active and extend TTL
async function validateSession(sessionId) {
  const key = `sessions:user:${sessionId}`;
  const data = await redis.get(key);

  if (!data) {
    console.log(`[VALIDATE] Session ${sessionId.slice(0, 12)}... — EXPIRED/INVALID`);
    activeSessions.delete(sessionId);
    return null;
  }

  // Extend TTL (sliding expiration)
  await redis.expire(key, SESSION_TTL);

  const session = JSON.parse(data);
  session.lastActivity = new Date().toISOString();
  await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL);

  totalRequests++;
  return session;
}

// Rate limiting — check if user exceeded limit
async function checkRateLimit(userId) {
  const key = `sessions:rate:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, RATE_WINDOW);
  }

  const ttl = await redis.ttl(key);
  const remaining = Math.max(0, RATE_LIMIT - count);

  if (count > RATE_LIMIT) {
    rateLimitHits++;
    console.log(`[RATE LIMIT] User ${userId} — BLOCKED (${count}/${RATE_LIMIT}, resets in ${ttl}s)`);
    return { allowed: false, remaining: 0, resetIn: ttl };
  }

  return { allowed: true, remaining, resetIn: ttl };
}

// Logout — destroy session
async function logout(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  await redis.del(`sessions:user:${sessionId}`);
  await redis.del(`sessions:active:${session.userId}`);
  activeSessions.delete(sessionId);
  totalLogouts++;

  const duration = Math.round((Date.now() - session.loginAt) / 1000);
  console.log(`[LOGOUT] User ${session.userId} — session lasted ${duration}s`);
}

// Simulate user activity
async function simulateActivity() {
  const action = Math.random();

  if (action < 0.3 && activeSessions.size < 10) {
    // Login a random user
    const user = randomItem(USERS);
    await login(user);

  } else if (action < 0.7 && activeSessions.size > 0) {
    // Validate a random session + rate limit check
    const sessions = Array.from(activeSessions.keys());
    const sessionId = randomItem(sessions);
    const session = await validateSession(sessionId);

    if (session) {
      const rateResult = await checkRateLimit(session.userId);
      if (rateResult.allowed) {
        console.log(`[REQUEST] ${session.name} — OK (${rateResult.remaining} remaining)`);
      }
    }

  } else if (action < 0.85 && activeSessions.size > 2) {
    // Logout a random session
    const sessions = Array.from(activeSessions.keys());
    const sessionId = randomItem(sessions);
    await logout(sessionId);

  } else if (activeSessions.size > 0) {
    // Rapid-fire requests to test rate limiting
    const sessions = Array.from(activeSessions.entries());
    const [sessionId, sessionMeta] = randomItem(sessions);
    const burstSize = randomInt(5, 15);
    console.log(`[BURST] Simulating ${burstSize} rapid requests for user ${sessionMeta.userId}`);

    for (let i = 0; i < burstSize; i++) {
      await checkRateLimit(sessionMeta.userId);
    }
  }
}

// Stats logging
function logStats() {
  console.log('\n--- Session Service Stats ---');
  console.log(`Active Sessions: ${activeSessions.size}`);
  console.log(`Total Logins: ${totalLogins} | Logouts: ${totalLogouts}`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Rate Limit Hits: ${rateLimitHits}`);
  console.log('-----------------------------\n');
}

// Main loop
async function main() {
  console.log('=== Session Service Starting ===');
  console.log(`Redis Cluster: ${REDIS_NODES.map(n => `${n.host}:${n.port}`).join(', ')}`);
  console.log(`Session TTL: ${SESSION_TTL}s | Rate Limit: ${RATE_LIMIT}/${RATE_WINDOW}s`);
  console.log('');

  // Wait for Redis to be ready
  await new Promise((resolve) => {
    redis.once('ready', resolve);
    redis.once('error', () => {
      console.log('Waiting for Redis cluster...');
      setTimeout(resolve, 5000);
    });
  });

  console.log('Connected to Redis cluster!\n');

  // Run activity every 2-5 seconds
  setInterval(async () => {
    try {
      await simulateActivity();
    } catch (err) {
      console.error('[ERROR]', err.message);
    }
  }, randomInt(2000, 5000));

  // Log stats every 30 seconds
  setInterval(logStats, 30000);

  // Initial logins
  for (let i = 0; i < 3; i++) {
    await login(USERS[i]);
    await new Promise(r => setTimeout(r, 1000));
  }
}

redis.on('error', (err) => console.error('[REDIS ERROR]', err.message));
redis.on('ready', () => console.log('[REDIS] Cluster connection ready'));

main().catch(console.error);
