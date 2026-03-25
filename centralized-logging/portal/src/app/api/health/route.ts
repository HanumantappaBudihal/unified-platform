import { NextResponse } from 'next/server';

async function checkService(name: string, url: string) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return { name, status: res.ok ? 'healthy' as const : 'unhealthy' as const, responseTime: Date.now() - start };
  } catch (error) {
    return { name, status: 'unhealthy' as const, responseTime: Date.now() - start, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

export async function GET() {
  const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
  const grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3008';

  const services = await Promise.all([
    checkService('loki', `${lokiUrl}/ready`),
    checkService('grafana', `${grafanaUrl}/api/health`),
  ]);

  const allHealthy = services.every(s => s.status === 'healthy');
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services,
  });
}
