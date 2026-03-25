import 'dotenv/config';
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

// ─── PostgreSQL ───
const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ─── Redis ───
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
});

const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || '';

// ─── Health Check ───
app.get('/health', async (req, res) => {
  const checks = {};

  try { await pg.query('SELECT 1'); checks.postgres = 'ok'; }
  catch { checks.postgres = 'error'; }

  try { await redis.ping(); checks.redis = 'ok'; }
  catch { checks.redis = 'error'; }

  const healthy = Object.values(checks).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'healthy' : 'degraded', checks });
});

// ─── Example Routes ───
app.get('/', (req, res) => {
  res.json({ service: process.env.APP_NAME || '{{APP_NAME}}', version: '1.0.0' });
});

app.get('/cache/:key', async (req, res) => {
  const val = await redis.get(`${KEY_PREFIX}${req.params.key}`);
  res.json({ key: req.params.key, value: val });
});

app.put('/cache/:key', async (req, res) => {
  await redis.set(`${KEY_PREFIX}${req.params.key}`, JSON.stringify(req.body), 'EX', 3600);
  res.json({ key: req.params.key, stored: true });
});

// ─── Start ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${process.env.APP_NAME || '{{APP_NAME}}'} listening on :${PORT}`);
});
