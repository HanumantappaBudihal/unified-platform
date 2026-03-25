import { NextResponse } from 'next/server';

async function checkHttp(name: string, url: string, timeoutMs = 5000) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return { name, status: res.ok ? 'healthy' as const : 'unhealthy' as const, responseTime: Date.now() - start };
  } catch (error) {
    return { name, status: 'unhealthy' as const, responseTime: Date.now() - start, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function checkServer(name: string, checks: ReturnType<typeof checkHttp>[]) {
  const start = Date.now();
  const services = await Promise.all(checks);
  const healthy = services.filter(s => s.status === 'healthy').length;
  const status = healthy === services.length ? 'healthy' as const : healthy > 0 ? 'degraded' as const : 'unhealthy' as const;
  return { name, status, responseTime: Date.now() - start, services };
}

export async function GET() {
  const kafkaUrl = process.env.KAFKA_PORTAL_URL || 'http://localhost:3001';
  const redisUrl = process.env.REDIS_PORTAL_URL || 'http://localhost:3002';
  const minioUrl = process.env.MINIO_PORTAL_URL || 'http://localhost:3004';
  const gatewayUrl = process.env.GATEWAY_PORTAL_URL || 'http://localhost:3006';
  const loggingUrl = process.env.LOGGING_PORTAL_URL || 'http://localhost:3007';

  const servers = await Promise.all([
    checkServer('Event Streaming', [checkHttp('Kafka Portal', kafkaUrl + '/api/health')]),
    checkServer('Cache', [checkHttp('Cache Portal', redisUrl + '/api/health')]),
    checkServer('Object Storage', [checkHttp('Storage Portal', minioUrl + '/api/health')]),
    checkServer('Gateway', [checkHttp('Gateway Portal', gatewayUrl + '/api/health')]),
    checkServer('Logging', [checkHttp('Logging Portal', loggingUrl + '/api/health')]),
  ]);

  const totalServices = servers.reduce((a, s) => a + s.services.length, 0);
  const healthyServices = servers.reduce((a, s) => a + s.services.filter(svc => svc.status === 'healthy').length, 0);

  return NextResponse.json({
    status: healthyServices === totalServices ? 'healthy' : healthyServices > 0 ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    score: totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 0,
    servers,
    summary: { total: totalServices, healthy: healthyServices, unhealthy: totalServices - healthyServices },
  });
}
