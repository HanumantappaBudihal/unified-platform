import { NextResponse } from 'next/server';

interface ServiceDef {
  name: string;
  group: string;
  type: 'http' | 'tcp';
  url?: string;
}

const SERVICE_DEFS: ServiceDef[] = [
  { name: 'Kafka Portal', group: 'Event Streaming', type: 'http', url: (process.env.KAFKA_PORTAL_URL || 'http://localhost:3001') + '/api/health' },
  { name: 'Schema Registry', group: 'Event Streaming', type: 'http', url: 'http://localhost:8081/subjects' },
  { name: 'REST Proxy', group: 'Event Streaming', type: 'http', url: 'http://localhost:8082/topics' },
  { name: 'Kafka UI', group: 'Event Streaming', type: 'http', url: 'http://localhost:8080' },
  { name: 'Kafka Grafana', group: 'Event Streaming', type: 'http', url: 'http://localhost:3000/api/health' },
  { name: 'Kafka Prometheus', group: 'Event Streaming', type: 'http', url: 'http://localhost:9090/-/healthy' },
  { name: 'Cache Portal', group: 'Cache', type: 'http', url: (process.env.REDIS_PORTAL_URL || 'http://localhost:3002') + '/api/health' },
  { name: 'Redis Insight', group: 'Cache', type: 'http', url: 'http://localhost:5540' },
  { name: 'Redis Grafana', group: 'Cache', type: 'http', url: 'http://localhost:3003/api/health' },
  { name: 'Redis Prometheus', group: 'Cache', type: 'http', url: 'http://localhost:9091/-/healthy' },
  { name: 'Storage Portal', group: 'Object Storage', type: 'http', url: (process.env.MINIO_PORTAL_URL || 'http://localhost:3004') + '/api/health' },
  { name: 'MinIO S3 API', group: 'Object Storage', type: 'http', url: 'http://localhost:9000/minio/health/live' },
  { name: 'MinIO Console', group: 'Object Storage', type: 'http', url: 'http://localhost:9001' },
  { name: 'MinIO Grafana', group: 'Object Storage', type: 'http', url: 'http://localhost:3005/api/health' },
  { name: 'MinIO Prometheus', group: 'Object Storage', type: 'http', url: 'http://localhost:9097/-/healthy' },
  { name: 'Gateway Portal', group: 'Gateway', type: 'http', url: (process.env.GATEWAY_PORTAL_URL || 'http://localhost:3006') + '/api/health' },
  { name: 'Loki', group: 'Logging', type: 'http', url: 'http://localhost:3100/ready' },
  { name: 'Logging Portal', group: 'Logging', type: 'http', url: (process.env.LOGGING_PORTAL_URL || 'http://localhost:3007') + '/api/health' },
  { name: 'Logging Grafana', group: 'Logging', type: 'http', url: 'http://localhost:3008/api/health' },
];

async function checkService(svc: ServiceDef) {
  const start = Date.now();
  if (svc.type === 'http' && svc.url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(svc.url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      return { ...svc, status: res.ok ? 'healthy' as const : 'unhealthy' as const, responseTime: Date.now() - start };
    } catch (error) {
      return { ...svc, status: 'unhealthy' as const, responseTime: Date.now() - start, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }
  return { ...svc, status: 'unhealthy' as const, responseTime: Date.now() - start };
}

export async function GET() {
  const results = await Promise.all(SERVICE_DEFS.map(checkService));
  return NextResponse.json(results);
}
