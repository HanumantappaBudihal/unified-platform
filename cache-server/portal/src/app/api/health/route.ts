export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import Redis from 'ioredis';

interface ServiceHealth {
  name: string;
  status: 'up' | 'down';
  url: string;
  latency: number;
}

async function checkService(name: string, url: string): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return { name, status: 'up', url, latency: Date.now() - start };
  } catch {
    return { name, status: 'down', url, latency: Date.now() - start };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  const node = config.redis.nodes[0];
  const url = `${node.host}:${node.port}`;
  try {
    const redis = new Redis({
      host: node.host,
      port: node.port,
      username: config.redis.username,
      password: config.redis.password,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return { name: 'Redis Cluster', status: 'up', url, latency: Date.now() - start };
  } catch {
    return { name: 'Redis Cluster', status: 'down', url, latency: Date.now() - start };
  }
}

export async function GET() {
  try {
    const services: ServiceHealth[] = await Promise.all([
      checkRedis(),
      checkService('Redis Insight', config.internal.redisInsight),
      checkService('Grafana', config.internal.grafana),
      checkService('Prometheus', config.internal.prometheus),
      checkService('Alertmanager', config.internal.alertmanager),
    ]);

    const upCount = services.filter(s => s.status === 'up').length;
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (upCount === services.length) {
      status = 'healthy';
    } else if (upCount === 0) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return NextResponse.json({ status, services });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', services: [], error: String(error) },
      { status: 500 }
    );
  }
}
