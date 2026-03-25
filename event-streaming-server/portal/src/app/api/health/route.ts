import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
}

async function checkService(name: string, internalUrl: string, displayUrl: string): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(internalUrl, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return { name, url: displayUrl, status: res.ok ? 'healthy' : 'unhealthy', latencyMs: Date.now() - start };
  } catch {
    return { name, url: displayUrl, status: 'unhealthy', latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkService('Kafka REST Proxy', `${config.internal.restProxy}/brokers`, `${config.services.restProxy}/brokers`),
    checkService('Schema Registry', `${config.internal.schemaRegistry}/subjects`, `${config.services.schemaRegistry}/subjects`),
    checkService('Kafka UI', config.internal.kafkaUi, config.services.kafkaUi),
    checkService('Prometheus', `${config.internal.prometheus}/-/healthy`, `${config.services.prometheus}/-/healthy`),
    checkService('Grafana', `${config.internal.grafana}/api/health`, `${config.services.grafana}/api/health`),
    checkService('Alertmanager', `${config.internal.alertmanager}/-/healthy`, `${config.services.alertmanager}/-/healthy`),
  ]);

  const overall = checks.every((c) => c.status === 'healthy') ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overall,
    timestamp: new Date().toISOString(),
    services: checks,
  });
}
